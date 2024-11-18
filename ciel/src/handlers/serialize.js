const {
    jidNormalizedUser,
    jidDecode,
    proto,
    getContentType,
    downloadContentFromMessage,
    generateWAMessageFromContent,
    getBinaryNodeChild,
    getBinaryNodeChildren,
    generateWAMessageContent,
    prepareWAMessageMedia
} = require('@whiskeysockets/baileys');
const FileType = require('file-type');
const { getGroupAdmins } = require('../utils/functions');

const downloadMedia = async (message) => {
    const mtype = Object.keys(message.message || {})[0];
    const msg = message.message[mtype];
    
    if (!msg) return null;
    
    const stream = await downloadContentFromMessage(msg, mtype.replace('Message', ''));
    const chunks = [];
    
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
};

const Serialize = async (conn, msg, store) => {
    if (!msg.message) return msg;
    
    const m = {};
    
    m.message = msg.message;
    m.key = msg.key;
    m.id = msg.key.id;
    m.chat = msg.key.remoteJid;
    m.sender = msg.key.fromMe 
        ? jidNormalizedUser(conn.user.id) 
        : (msg.key.participant || msg.key.remoteJid);
    m.sender = jidNormalizedUser(m.sender);
    m.fromMe = msg.key.fromMe;
    m.pushName = msg.pushName || 'Unknown';
    m.isGroup = m.chat.endsWith('@g.us');
    m.isBot = msg.key.id.startsWith('BAE5') || msg.key.id.startsWith('3EB0');
    
    const type = getContentType(msg.message);
    m.type = type;
    
    if (type === 'ephemeralMessage') {
        m.message = msg.message.ephemeralMessage.message;
        m.type = getContentType(m.message);
    }
    
    if (type === 'viewOnceMessageV2') {
        m.message = msg.message.viewOnceMessageV2.message;
        m.type = getContentType(m.message);
    }
    
    m.msg = m.message[m.type];
    
    if (m.type === 'conversation') {
        m.text = m.message.conversation;
    } else if (m.type === 'extendedTextMessage') {
        m.text = m.message.extendedTextMessage.text;
    } else if (m.type === 'imageMessage') {
        m.text = m.message.imageMessage.caption || '';
    } else if (m.type === 'videoMessage') {
        m.text = m.message.videoMessage.caption || '';
    } else if (m.type === 'documentMessage') {
        m.text = m.message.documentMessage.caption || '';
    } else {
        m.text = '';
    }
    
    m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];
    m.expiration = m.msg?.contextInfo?.expiration || 0;
    
    const mimetype = m.msg?.mimetype || '';
    m.isMedia = /image|video|audio|sticker|document/.test(m.type);
    m.mime = mimetype;
    
    if (m.isGroup) {
        m.metadata = store.groupMetadata[m.chat] || await conn.groupMetadata(m.chat).catch(() => ({}));
        m.participants = m.metadata.participants || [];
        m.admins = getGroupAdmins(m.participants);
        m.isAdmin = m.admins.includes(m.sender);
        m.isBotAdmin = m.admins.includes(jidNormalizedUser(conn.user.id));
    }
    
    m.download = async () => {
        return await downloadMedia(msg);
    };
    
    const quotedInfo = m.msg?.contextInfo;
    if (quotedInfo?.quotedMessage) {
        const quotedType = getContentType(quotedInfo.quotedMessage);
        const quotedMsg = quotedInfo.quotedMessage[quotedType];
        
        m.quoted = {
            message: quotedInfo.quotedMessage,
            key: {
                remoteJid: m.chat,
                fromMe: quotedInfo.participant === jidNormalizedUser(conn.user.id),
                id: quotedInfo.stanzaId,
                participant: quotedInfo.participant
            },
            sender: jidNormalizedUser(quotedInfo.participant),
            type: quotedType,
            text: quotedMsg?.text || quotedMsg?.caption || quotedMsg?.conversation || '',
            isMedia: /image|video|audio|sticker|document/.test(quotedType),
            mime: quotedMsg?.mimetype || '',
            msg: quotedMsg
        };
        
        m.quoted.download = async () => {
            const stream = await downloadContentFromMessage(quotedMsg, quotedType.replace('Message', ''));
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        };
    } else {
        m.quoted = null;
    }
    
    m.reply = async (text, options = {}) => {
        if (typeof text === 'string') {
            return conn.sendMessage(m.chat, { text, ...options }, { quoted: msg });
        }
        return conn.sendMessage(m.chat, text, { quoted: msg, ...options });
    };
    
    m.react = async (emoji) => {
        return conn.sendMessage(m.chat, {
            react: { text: emoji, key: m.key }
        });
    };
    
    return m;
};

const setupExtensions = (conn, store) => {
    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server ? decode.user + '@' + decode.server : jid;
        }
        return jid;
    };
    
    conn.getName = async (jid) => {
        const id = conn.decodeJid(jid);
        if (id.endsWith('@g.us')) {
            const group = store.groupMetadata[id] || await conn.groupMetadata(id).catch(() => ({}));
            return group.subject || id;
        }
        const contact = store.contacts[id];
        return contact?.name || contact?.notify || id.split('@')[0];
    };
    
    conn.sendContact = async (jid, numbers, quoted = null) => {
        const contacts = [];
        for (const num of numbers) {
            const cleanNum = num.replace(/[^0-9]/g, '');
            const name = await conn.getName(cleanNum + '@s.whatsapp.net');
            contacts.push({
                displayName: name,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${cleanNum}:+${cleanNum}\nEND:VCARD`
            });
        }
        
        return conn.sendMessage(jid, {
            contacts: {
                displayName: contacts.length === 1 ? contacts[0].displayName : `${contacts.length} Contacts`,
                contacts
            }
        }, { quoted });
    };
    
    conn.sendImage = async (jid, image, caption = '', quoted = null) => {
        let buffer;
        if (typeof image === 'string') {
            if (image.startsWith('http')) {
                const axios = require('axios');
                const { data } = await axios.get(image, { responseType: 'arraybuffer' });
                buffer = Buffer.from(data);
            } else {
                buffer = require('fs').readFileSync(image);
            }
        } else {
            buffer = image;
        }
        
        return conn.sendMessage(jid, {
            image: buffer,
            caption
        }, { quoted });
    };
    
    conn.sendVideo = async (jid, video, caption = '', quoted = null) => {
        let buffer;
        if (typeof video === 'string') {
            if (video.startsWith('http')) {
                const axios = require('axios');
                const { data } = await axios.get(video, { responseType: 'arraybuffer' });
                buffer = Buffer.from(data);
            } else {
                buffer = require('fs').readFileSync(video);
            }
        } else {
            buffer = video;
        }
        
        return conn.sendMessage(jid, {
            video: buffer,
            caption
        }, { quoted });
    };
    
    conn.sendAudio = async (jid, audio, ptt = false, quoted = null) => {
        let buffer;
        if (typeof audio === 'string') {
            if (audio.startsWith('http')) {
                const axios = require('axios');
                const { data } = await axios.get(audio, { responseType: 'arraybuffer' });
                buffer = Buffer.from(data);
            } else {
                buffer = require('fs').readFileSync(audio);
            }
        } else {
            buffer = audio;
        }
        
        return conn.sendMessage(jid, {
            audio: buffer,
            ptt,
            mimetype: 'audio/mp4'
        }, { quoted });
    };
    
    conn.sendSticker = async (jid, sticker, quoted = null) => {
        let buffer;
        if (typeof sticker === 'string') {
            if (sticker.startsWith('http')) {
                const axios = require('axios');
                const { data } = await axios.get(sticker, { responseType: 'arraybuffer' });
                buffer = Buffer.from(data);
            } else {
                buffer = require('fs').readFileSync(sticker);
            }
        } else {
            buffer = sticker;
        }
        
        return conn.sendMessage(jid, {
            sticker: buffer
        }, { quoted });
    };
    
    conn.sendDocument = async (jid, doc, filename, mimetype, quoted = null) => {
        let buffer;
        if (typeof doc === 'string') {
            if (doc.startsWith('http')) {
                const axios = require('axios');
                const { data } = await axios.get(doc, { responseType: 'arraybuffer' });
                buffer = Buffer.from(data);
            } else {
                buffer = require('fs').readFileSync(doc);
            }
        } else {
            buffer = doc;
        }
        
        return conn.sendMessage(jid, {
            document: buffer,
            fileName: filename,
            mimetype
        }, { quoted });
    };
    
    conn.downloadMediaMessage = async (msg) => {
        const mtype = Object.keys(msg.message || {})[0];
        const media = msg.message[mtype];
        
        if (!media) return null;
        
        const stream = await downloadContentFromMessage(media, mtype.replace('Message', ''));
        const chunks = [];
        
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    };
    
    store.loadMessage = (remoteJid, id) => {
        const messages = store.messages?.[remoteJid]?.array;
        if (!messages) return null;
        return messages.find(msg => msg?.key?.id === id) || null;
    };
};

module.exports = { Serialize, setupExtensions, downloadMedia };

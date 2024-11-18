const { jidNormalizedUser, getContentType } = require('@whiskeysockets/baileys');
const settings = require('../../config/settings');
const { logger } = require('../utils/logger');
const { antiSpam } = require('../utils/antiSpam');
const { Serialize } = require('./serialize');
const { 
    getOrCreateUser, 
    getOrCreateGroup, 
    getOrCreateBotSettings,
    addHit,
    isPremium
} = require('../services/database');

const handleMessage = async (conn, message, store) => {
    try {
        const msg = message.messages[0];
        if (!msg?.message) return;
        
        const remoteJid = msg.key.remoteJid;
        
        store.messages[remoteJid] = store.messages[remoteJid] || { array: [], keyId: new Set() };
        if (!store.messages[remoteJid].keyId.has(msg.key.id)) {
            store.messages[remoteJid].array.push(msg);
            store.messages[remoteJid].keyId.add(msg.key.id);
            
            if (store.messages[remoteJid].array.length > 100) {
                const removed = store.messages[remoteJid].array.shift();
                store.messages[remoteJid].keyId.delete(removed.key.id);
            }
        }
        
        const m = await Serialize(conn, msg, store);
        if (!m || m.isBot) return;
        
        const botJid = jidNormalizedUser(conn.user.id);
        const botSettings = await getOrCreateBotSettings(botJid);
        
        const ownerNumbers = botSettings.owner || settings.owner;
        const isOwner = ownerNumbers.map(n => n.replace(/[^0-9]/g, '')).includes(m.sender.split('@')[0]);
        
        const user = await getOrCreateUser(m.sender, m.pushName);
        if (user?.banned && !isOwner) return;
        
        if (m.isGroup) {
            const group = await getOrCreateGroup(m.chat, m.metadata?.subject);
            if (group?.mute && !isOwner) return;
            
            await handleGroupFeatures(conn, m, group, isOwner, botSettings);
        }
        
        if (botSettings.autoRead && (botSettings.public || isOwner)) {
            await conn.readMessages([m.key]).catch(() => {});
        }
        
        const prefix = getPrefix(m.text, isOwner, botSettings);
        const isCmd = m.text.startsWith(prefix) && prefix !== '';
        const command = isCmd ? m.text.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase() : '';
        const args = m.text.trim().split(/\s+/).slice(1);
        const text = args.join(' ');
        
        if (isCmd && command) {
            if (!isOwner && botSettings.antiSpam && antiSpam.isFiltered(m.sender)) {
                return m.reply('Tunggu 5 detik sebelum menggunakan command lagi!');
            }
            
            if (!isOwner) antiSpam.addFilter(m.sender);
            
            logger.command(prefix + command, m.pushName, m.isGroup);
            
            await processCommand(conn, m, {
                prefix,
                command,
                args,
                text,
                isOwner,
                user,
                botSettings,
                store
            });
            
            await addHit(command);
        } else if (botSettings.autoTyping && botSettings.public) {
            await handleAutoFeatures(conn, m, text, botSettings);
        }
        
        if (!isCmd && m.text) {
            await handleGameAnswers(conn, m, { user, botSettings, store });
        }
        
    } catch (e) {
        logger.error(`handleMessage error: ${e.message}`);
    }
};

const getPrefix = (text, isOwner, botSettings) => {
    if (!text) return '';
    
    const prefixes = settings.prefixes;
    
    if (isOwner) {
        const symbolMatch = text.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/);
        if (symbolMatch) return symbolMatch[0];
        
        const emojiMatch = text.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/);
        if (emojiMatch) return emojiMatch[0];
    }
    
    if (botSettings.multiPrefix) {
        const symbolMatch = text.match(/^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@()#,'"*+÷/\%^&.©^]/);
        if (symbolMatch) return symbolMatch[0];
    }
    
    for (const p of prefixes) {
        if (text.startsWith(p)) return p;
    }
    
    return '';
};

const handleGroupFeatures = async (conn, m, group, isOwner, botSettings) => {
    if (!group || isOwner || !m.isBotAdmin) return;
    
    const text = m.text.toLowerCase();
    
    if (group.antilink && text.includes('chat.whatsapp.com/')) {
        await conn.sendMessage(m.chat, { delete: m.key });
        await m.reply(`@${m.sender.split('@')[0]} mengirim link grup!\nLink telah dihapus.`, { mentions: [m.sender] });
        return true;
    }
    
    if (group.antitoxic && settings.badWords.some(word => text.includes(word))) {
        await conn.sendMessage(m.chat, { delete: m.key });
        await m.reply(`@${m.sender.split('@')[0]} menggunakan kata kasar!\nPesan telah dihapus.`, { mentions: [m.sender] });
        return true;
    }
    
    if (group.antivirtex && (m.text.length > 5000 || m.msg?.nativeFlowMessage?.messageParamsJson?.length > 3500)) {
        await conn.sendMessage(m.chat, { delete: m.key });
        await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
        await m.reply(`@${m.sender.split('@')[0]} mengirim virtex!\nTelah dikick dari grup.`, { mentions: [m.sender] });
        return true;
    }
    
    return false;
};

const handleGameAnswers = async (conn, m, ctx) => {
    try {
        const text = m.text?.trim();
        if (!text) return;
        
        const isNumeric = /^-?\d+$/.test(text);
        const isSingleDigit = /^[1-9]$/.test(text);
        
        const gameCommands = require('./commands/game');
        
        if (isSingleDigit && gameCommands.tttmove) {
            await gameCommands.tttmove(conn, m, { ...ctx, args: [text] });
        }
        
        if (isNumeric && gameCommands.mathanswer) {
            await gameCommands.mathanswer(conn, m, ctx);
        }
    } catch (e) {
    }
};

const handleAutoFeatures = async (conn, m, text, botSettings) => {
    const lowerText = text.toLowerCase();
    
    if (/^a(s|ss)alamu('|)alaikum(| )(wr|)( |)(wb|)$/i.test(lowerText)) {
        const responses = ["Wa'alaikumsalam", "Wa'alaikumsalam wr wb", "Wa'alaikumsalam Warohmatullahi Wabarokatuh"];
        await m.reply(responses[Math.floor(Math.random() * responses.length)]);
    }
};

const processCommand = async (conn, m, ctx) => {
    const { prefix, command, args, text, isOwner, user, botSettings, store } = ctx;
    
    try {
        const ownerCommands = require('./commands/owner');
        const groupCommands = require('./commands/group');
        const toolCommands = require('./commands/tools');
        const downloadCommands = require('./commands/download');
        const infoCommands = require('./commands/info');
        const gameCommands = require('./commands/game');
        const funCommands = require('./commands/fun');
        
        const allCommands = {
            ...ownerCommands,
            ...groupCommands,
            ...toolCommands,
            ...downloadCommands,
            ...infoCommands,
            ...gameCommands,
            ...funCommands
        };
        
        if (allCommands[command]) {
            await allCommands[command](conn, m, { prefix, args, text, isOwner, user, botSettings, store });
        }
        
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            logger.error(`Command error (${command}): ${e.message}`);
        }
    }
};

module.exports = { handleMessage };

const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { logger } = require('../utils/logger');
const { getOrCreateGroup, getOrCreateBotSettings } = require('../services/database');

const handleGroupParticipantsUpdate = async (conn, update, store) => {
    try {
        const { id, participants, author, action } = update;
        
        const group = await getOrCreateGroup(id);
        if (!group) return;
        
        const metadata = store.groupMetadata[id] || await conn.groupMetadata(id).catch(() => ({}));
        store.groupMetadata[id] = metadata;
        
        for (const participant of participants) {
            const jid = jidNormalizedUser(participant);
            let profile;
            
            try {
                profile = await conn.profilePictureUrl(jid, 'image');
            } catch {
                profile = 'https://i.ibb.co/Tq7d7TZ/avatar-contact.png';
            }
            
            let messageText = '';
            
            switch (action) {
                case 'add':
                    if (group.welcome) {
                        messageText = group.welcomeText || 
                            `Selamat datang di *${metadata.subject}*!\n\n` +
                            `Halo @${jid.split('@')[0]}, semoga betah di grup ini.`;
                    }
                    
                    if (metadata.participants) {
                        const exists = metadata.participants.find(p => 
                            jidNormalizedUser(p.id) === jid || jidNormalizedUser(p.lid) === jid
                        );
                        if (!exists) {
                            metadata.participants.push({
                                id: jid,
                                admin: null
                            });
                        }
                    }
                    break;
                    
                case 'remove':
                    if (group.leave) {
                        messageText = group.leaveText || 
                            `@${jid.split('@')[0]} telah keluar dari *${metadata.subject}*.\n\nSampai jumpa!`;
                    }
                    
                    const botJid = jidNormalizedUser(conn.user.id);
                    if (jid === botJid) {
                        delete store.messages[id];
                        delete store.presences[id];
                        delete store.groupMetadata[id];
                    }
                    
                    if (metadata.participants) {
                        metadata.participants = metadata.participants.filter(p => 
                            jidNormalizedUser(p.id) !== jid && jidNormalizedUser(p.lid) !== jid
                        );
                    }
                    break;
                    
                case 'promote':
                    if (group.promote) {
                        const authorName = author ? `@${author.split('@')[0]}` : 'Admin';
                        messageText = group.promoteText || 
                            `@${jid.split('@')[0]} telah diangkat menjadi Admin oleh ${authorName}`;
                    }
                    
                    if (metadata.participants) {
                        const p = metadata.participants.find(p => 
                            jidNormalizedUser(p.id) === jid || jidNormalizedUser(p.lid) === jid
                        );
                        if (p) p.admin = 'admin';
                    }
                    break;
                    
                case 'demote':
                    if (group.demote) {
                        const authorName = author ? `@${author.split('@')[0]}` : 'Admin';
                        messageText = group.demoteText || 
                            `@${jid.split('@')[0]} telah diturunkan dari Admin oleh ${authorName}`;
                    }
                    
                    if (metadata.participants) {
                        const p = metadata.participants.find(p => 
                            jidNormalizedUser(p.id) === jid || jidNormalizedUser(p.lid) === jid
                        );
                        if (p) p.admin = null;
                    }
                    break;
            }
            
            if (messageText && conn.public) {
                const mentions = [jid];
                if (author) mentions.push(author);
                
                await conn.sendMessage(id, {
                    text: messageText.replace(/@/g, `@${jid.split('@')[0]}`),
                    contextInfo: {
                        mentionedJid: mentions,
                        externalAdReply: {
                            title: action === 'add' ? 'Welcome' : 
                                   action === 'remove' ? 'Goodbye' : 
                                   action.charAt(0).toUpperCase() + action.slice(1),
                            body: metadata.subject,
                            mediaType: 1,
                            thumbnailUrl: profile,
                            renderLargerThumbnail: true
                        }
                    }
                });
                
                logger.info(`Group ${action}: ${jid} in ${id}`);
            }
        }
        
    } catch (e) {
        logger.error(`handleGroupParticipantsUpdate error: ${e.message}`);
    }
};

const handleGroupUpdate = (updates, store) => {
    for (const update of updates) {
        if (store.groupMetadata[update.id]) {
            Object.assign(store.groupMetadata[update.id], update);
        } else {
            store.groupMetadata[update.id] = update;
        }
    }
};

module.exports = { handleGroupParticipantsUpdate, handleGroupUpdate };

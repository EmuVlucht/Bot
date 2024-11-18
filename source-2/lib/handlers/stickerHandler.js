const { downloadContentFromMessage } = require('@naruyaizumi/baileys');
const { writeExif } = require('../utils/mediaConverter.js');
const { globalPackname, globalAuthor } = require('../../config.js');
const { logger } = require('../utils/logger.js');

async function handleStickerCommand(conn, m, args = '') {
    await conn.readMessages([m.key]);
    try {
        if (!m.message.extendedTextMessage?.contextInfo?.quotedMessage) {
            await conn.sendMessage(m.key.remoteJid, { 
                text: 'Reply to an image/video with [prefix]sticker [pack|author]'
            });
            return;
        }

        const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
        const quotedType = Object.keys(quotedMsg)[0];
        
        if (!['imageMessage', 'videoMessage'].includes(quotedType)) {
            await conn.sendMessage(m.key.remoteJid, { 
                text: 'Only images/videos (max 5s) can be stickers'
            });
            return;
        }

        const stream = await downloadContentFromMessage(quotedMsg[quotedType], quotedType.replace('Message', ''));
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const parts = args.split('|').map(s => s.trim());
        const packName = parts[0] || globalPackname;
        const authorName = parts[1] || globalAuthor;

        await conn.sendAsSticker(
            m.key.remoteJid, 
            buffer, 
            m, 
            {
                packname: packName,
                author: authorName,
                categories: ['🤩', '🎉']
            }
        );

        logger.success(`✅ Sticker created`);
        
    } catch (err) {
        logger.error(`❌ Sticker failed: ${err.message}`);
        await conn.sendMessage(m.key.remoteJid, { 
            text: 'Failed to create sticker. Try again with a different media.'
        });
    }
}

module.exports = {
    handleStickerCommand
};

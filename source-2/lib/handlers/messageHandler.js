const { tiktokRegex, douyinRegex, prefixes, commands } = require('../../config.js');
const { logger } = require('../utils/logger.js');
const { handleStickerCommand } = require('./stickerHandler.js');
const { handleTiktokUrl } = require('./tiktokHandler.js');
const { handleDouyinUrl } = require('./douyinHandler.js');
const { handleBotInfo, handlePing } = require('./infoHandler');

function extractCommand(text) {
    if (!text) return null;
    
    for (const prefix of prefixes) {
        if (text.startsWith(prefix)) {
            const cmd = text.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
            
            // Check command aliases
            for (const [mainCmd, aliases] of Object.entries(commands)) {
                if (aliases.includes(cmd)) {
                    return {
                        prefix,
                        command: mainCmd,
                        args: text.slice(prefix.length + cmd.length).trim()
                    };
                }
            }
            
            // Check if it's a direct command
            if (commands[cmd]) {
                return {
                    prefix,
                    command: cmd,
                    args: text.slice(prefix.length + cmd.length).trim()
                };
            }
        }
    }
    
    return null;
}

async function handleMessages(conn, messages) {
    const m = messages[0];
    if (!m?.message) return;

    // Auto-read message immediately
    try {
        await conn.readMessages([m.key]);
        logger.outgoing(`✓ Marked message as read from ${m.pushName || 'Unknown'}`);
    } catch (err) {
        logger.error(`Failed to mark as read: ${err.message}`);
    }

    const messageType = Object.keys(m.message)[0];
    const sender = m.pushName || 'Unknown';
    const chatType = m.key.remoteJid.endsWith('@g.us') ? 'Group' : 'Private';
    const text = m.message.conversation || m.message.extendedTextMessage?.text || '';

    logger.incoming(`\n📥 ${chatType} Message from ${sender}`);
    logger.incoming(`├─ Type: ${messageType}`);
    if (text) logger.incoming(`└─ Content: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

    // Check for commands
    const cmdData = extractCommand(text);
    if (cmdData) {
        switch (cmdData.command) {
            case 'sticker':
                await handleStickerCommand(conn, m, cmdData.args);
                return;
            case 'ping':
                await handlePing(conn, m);
                return;
            case 'info':
                await handleBotInfo(conn, m);
                return;
        }
    }

    // Handle TikTok/Douyin URLs (with or without command)
    const tiktokUrls = text.match(tiktokRegex) || [];
    const douyinUrls = text.match(douyinRegex) || [];
    const allUrls = [...tiktokUrls, ...douyinUrls];

    if (allUrls.length === 0) return;

    logger.info(`🔍 Found ${allUrls.length} TikTok/Douyin URL(s)`);
    await conn.sendMessage(m.key.remoteJid, { text: '⏳ Processing video links...' });

    for (const url of allUrls) {
        try {
            const isDouyin = douyinRegex.test(url);
            if (isDouyin) {
                logger.info(`🎥 Processing Douyin URL: ${url.substring(0, 30)}...`);
                await handleDouyinUrl(conn, m, url);
            } else {
                logger.info(`🎬 Processing TikTok URL: ${url.substring(0, 30)}...`);
                await handleTiktokUrl(conn, m, url);
            }
            
            // Mark as read again after processing
            await conn.readMessages([m.key]);
        } catch (err) {
            logger.error(`❌ Download error: ${err.message}`);
            await conn.sendMessage(m.key.remoteJid, { 
                text: '❌ Failed to process this link. Please try another one.'
            });
        }
    }
}

module.exports = {
    handleMessages,
    extractCommand
};
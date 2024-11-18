const { makeWASocket, useMultiFileAuthState } = require('@naruyaizumi/baileys');
const P = require('pino');
const { authFolder, browser } = require('./config.js');
const { logger } = require('./lib/utils/logger.js');
const { handleConnectionUpdate } = require('./lib/handlers/connectionHandler.js');
const { handleMessages } = require('./lib/handlers/messageHandler.js');
const performanceMonitor = require('./lib/utils/performanceMonitor');

async function startBot() {
    logger.info(`╔══════════════════════════════════╗`);
    logger.info(`║   TIKTOK/DOUYIN DOWNLOADER BOT   ║`);
    logger.info(`╚══════════════════════════════════╝`);
    
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    const conn = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: P({ level: 'silent' }),
        browser,
        markOnlineOnConnect: true,
        syncFullHistory: false
    });

    require('./lib/utils/stickerSender')(conn);

    // Event handlers
    conn.ev.on('creds.update', saveCreds);
    conn.ev.on('connection.update', (update) => handleConnectionUpdate(conn, update));
    conn.ev.on('messages.upsert', async ({ messages }) => handleMessages(conn, messages));

    process.on('SIGINT', () => {
        logger.info(`🛑 Shutting down...`);
        conn.end();
        process.exit(0);
    });

    return conn;
}

startBot().catch(err => {
    logger.error(`🚨 Startup error: ${err.message}`);
    process.exit(1);
});
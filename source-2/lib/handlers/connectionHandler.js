const { DisconnectReason } = require('@naruyaizumi/baileys');
const { logger } = require('../utils/logger');

function handleConnectionUpdate(conn, update) {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'open') {
        logger.success(`✅ Bot connected successfully!`);
        logger.info(`👂 Listening for messages...\n`);
    }
    
    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode || 
                          lastDisconnect?.error?.output?.payload?.statusCode;
        
        logger.error(`Connection closed: ${DisconnectReason[statusCode] || statusCode || 'unknown'}`);
        
        if (statusCode === DisconnectReason.badSession) {
            logger.error('[!] Invalid session - please delete auth folder and restart');
        } else {
            logger.info('[!] Attempting to reconnect...');
            setTimeout(() => {
                require('../../index').startBot();
            }, 5000);
        }
    }
}

module.exports = {
    handleConnectionUpdate
};
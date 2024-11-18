const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeExif } = require('./mediaConverter');
const { logger } = require('./logger');

module.exports = (conn) => {
    conn.sendAsSticker = async (jid, media, quoted, options = {}) => {
        let buffer;
        try {
            if (Buffer.isBuffer(media)) {
                buffer = media;
            } else if (typeof media === 'string') {
                if (/^data:/.test(media)) {
                    buffer = Buffer.from(media.split`,`[1], 'base64');
                } else if (/^https?:\/\//.test(media)) {
                    const res = await axios.get(media, { responseType: 'arraybuffer' });
                    buffer = res.data;
                } else if (fs.existsSync(media)) {
                    buffer = fs.readFileSync(media);
                } else {
                    throw new Error('Invalid media path or URL');
                }
            } else {
                throw new Error('Invalid media type');
            }

            const result = await writeExif(buffer, options);
            await conn.sendMessage(jid, { 
                sticker: { url: result }, 
                ...options 
            }, { 
                quoted,
                ephemeralExpiration: quoted?.expiration || 0 
            });
        } catch (error) {
            logger.error('Error creating sticker:', error);
            throw error;
        }
    };
};
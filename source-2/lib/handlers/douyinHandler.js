const SavetikAPI = require('../tikSnap.js');
const axios = require('axios');
const { logger } = require('../utils/logger.js');

const douyinApi = new SavetikAPI();

async function handleDouyinUrl(conn, m, url) {
    try {
        const result = await douyinApi.download({ url });
        
        if (result.downloadLinks?.length > 0) {
            const videoUrl = result.downloadLinks[0].link;
            const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
            
            await conn.sendMessage(m.key.remoteJid, {
                video: response.data,
                caption: `Douyin Video: ${result.videoTitle || 'No title'}`
            });

            logger.success(`✅ Sent Douyin video: ${result.videoTitle || 'No title'}`);
        }
    } catch (e) {
        logger.error(`Douyin API failed: ${e.message}`);
        throw e;
    }
}

module.exports = {
    handleDouyinUrl
};

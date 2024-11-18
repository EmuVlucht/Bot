const { tmate } = require('../tmate.js');
const axios = require('axios');
const { logger } = require('../utils/logger.js');

async function handleTiktokUrl(conn, m, url) {
    try {
        const res = await tmate.download(url);
        
        if (res.isSlide) {
            const totalPhotos = res.mediaUrls.length;
            logger.info(`📸 Processing slideshow (${totalPhotos} images)`);

            for (let i = 0; i < totalPhotos; i++) {
                const photo = res.mediaUrls[i];
                
                if (i === 0) {
                    await conn.sendMessage(m.key.remoteJid, {
                        image: { url: photo },
                        caption: `Mengirim 1 dari ${totalPhotos} slide gambar.\n_(Sisanya akan dikirim via chat pribadi.)_`
                    });
                } else {
                    await conn.sendMessage(m.key.remoteJid, { 
                        image: { url: photo },
                        caption: `Slide ${i+1} dari ${totalPhotos}`
                    });
                }
                
                logger.success(`✅ Sent slide ${i+1}/${totalPhotos}`);
                await conn.readMessages([m.key]);
            }
        } else {
            const video = res.downloadLinks.find(l => l.linkText.includes('without Watermark'));
            if (!video) throw new Error('No video found');
            
            await conn.sendMessage(m.key.remoteJid, {
                video: { url: video.link },
                caption: `🎬 ${res.title || 'No title'}\n👤 @${res.username || 'unknown'}`
            });

            logger.success(`✅ Sent TikTok video: ${res.title || 'No title'}`);

            const audio = res.downloadLinks.find(l => l.linkText.includes('MP3'));
            if (audio) {
                await conn.sendMessage(m.key.remoteJid, {
                    audio: { url: audio.link },
                    mimetype: 'audio/mpeg'
                });
                logger.success(`🔊 Sent audio track`);
            }
            
            await conn.readMessages([m.key]);
        }
    } catch (e) {
        logger.error(`TikTok download failed: ${e.message}`);
        throw e;
    }
}

module.exports = {
    handleTiktokUrl
};
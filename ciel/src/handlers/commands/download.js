const axios = require('axios');
const settings = require('../../../config/settings');

const tiktok = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link TikTok!\nContoh: .tiktok https://vt.tiktok.com/xxx');
    
    if (!text.includes('tiktok.com')) {
        return m.reply('Link tidak valid! Harus link TikTok.');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.post('https://www.tikwm.com/api/', {
            url: text,
            hd: 1
        });
        
        if (!response.data.data) {
            return m.reply('Video tidak ditemukan!');
        }
        
        const data = response.data.data;
        const videoUrl = data.hdplay || data.play;
        
        const videoBuffer = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, {
            video: Buffer.from(videoBuffer.data),
            caption: `*📱 TikTok Download*\n\n*Author:* ${data.author?.nickname || 'Unknown'}\n*Likes:* ${data.digg_count || 0}\n*Views:* ${data.play_count || 0}`
        }, { quoted: m });
        
    } catch (e) {
        console.error('TikTok error:', e);
        m.reply('Gagal download video TikTok! Coba lagi nanti.');
    }
};

const tt = tiktok;
const tiktokdl = tiktok;

const tiktokaudio = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link TikTok!\nContoh: .tiktokaudio https://vt.tiktok.com/xxx');
    
    if (!text.includes('tiktok.com')) {
        return m.reply('Link tidak valid! Harus link TikTok.');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.post('https://www.tikwm.com/api/', {
            url: text
        });
        
        if (!response.data.data) {
            return m.reply('Audio tidak ditemukan!');
        }
        
        const data = response.data.data;
        const audioUrl = data.music;
        
        const audioBuffer = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, {
            audio: Buffer.from(audioBuffer.data),
            mimetype: 'audio/mpeg'
        }, { quoted: m });
        
    } catch (e) {
        console.error('TikTok audio error:', e);
        m.reply('Gagal download audio TikTok! Coba lagi nanti.');
    }
};

const ttmp3 = tiktokaudio;
const ttaudio = tiktokaudio;

const instagram = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link Instagram!\nContoh: .instagram https://www.instagram.com/reel/xxx');
    
    if (!text.includes('instagram.com')) {
        return m.reply('Link tidak valid! Harus link Instagram.');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(text)}`);
        
        if (!response.data.data || !response.data.data.length) {
            return m.reply('Media tidak ditemukan! Pastikan akun tidak private.');
        }
        
        const media = response.data.data[0];
        
        if (media.type === 'video') {
            const videoBuffer = await axios.get(media.url, { responseType: 'arraybuffer' });
            await conn.sendMessage(m.chat, {
                video: Buffer.from(videoBuffer.data),
                caption: '*📸 Instagram Download*'
            }, { quoted: m });
        } else {
            const imageBuffer = await axios.get(media.url, { responseType: 'arraybuffer' });
            await conn.sendMessage(m.chat, {
                image: Buffer.from(imageBuffer.data),
                caption: '*📸 Instagram Download*'
            }, { quoted: m });
        }
        
    } catch (e) {
        console.error('Instagram error:', e);
        m.reply('Gagal download media Instagram! Pastikan link valid dan akun tidak private.');
    }
};

const ig = instagram;
const igdl = instagram;

const facebook = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link Facebook!\nContoh: .facebook https://www.facebook.com/watch?v=xxx');
    
    if (!text.includes('facebook.com') && !text.includes('fb.watch')) {
        return m.reply('Link tidak valid! Harus link Facebook.');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(text)}`);
        
        if (!response.data.data) {
            return m.reply('Video tidak ditemukan!');
        }
        
        const videoUrl = response.data.data.hd || response.data.data.sd;
        const videoBuffer = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, {
            video: Buffer.from(videoBuffer.data),
            caption: '*📘 Facebook Download*'
        }, { quoted: m });
        
    } catch (e) {
        console.error('Facebook error:', e);
        m.reply('Gagal download video Facebook! Coba lagi nanti.');
    }
};

const fb = facebook;
const fbdl = facebook;

const twitter = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link Twitter/X!\nContoh: .twitter https://twitter.com/xxx/status/xxx');
    
    if (!text.includes('twitter.com') && !text.includes('x.com')) {
        return m.reply('Link tidak valid! Harus link Twitter/X.');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://api.agatz.xyz/api/twitter?url=${encodeURIComponent(text)}`);
        
        if (!response.data.data) {
            return m.reply('Media tidak ditemukan!');
        }
        
        const media = response.data.data[0];
        
        if (media.type === 'video') {
            const videoBuffer = await axios.get(media.url, { responseType: 'arraybuffer' });
            await conn.sendMessage(m.chat, {
                video: Buffer.from(videoBuffer.data),
                caption: '*🐦 Twitter Download*'
            }, { quoted: m });
        } else {
            const imageBuffer = await axios.get(media.url, { responseType: 'arraybuffer' });
            await conn.sendMessage(m.chat, {
                image: Buffer.from(imageBuffer.data),
                caption: '*🐦 Twitter Download*'
            }, { quoted: m });
        }
        
    } catch (e) {
        console.error('Twitter error:', e);
        m.reply('Gagal download media Twitter! Coba lagi nanti.');
    }
};

const tw = twitter;
const x = twitter;

const youtube = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link atau judul YouTube!\nContoh: .youtube https://youtu.be/xxx');
    
    await m.reply(settings.messages.wait);
    
    try {
        let videoId = null;
        
        if (text.includes('youtube.com') || text.includes('youtu.be')) {
            const match = text.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (match) videoId = match[1];
        }
        
        if (!videoId) {
            const searchResponse = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                    part: 'snippet',
                    q: text,
                    type: 'video',
                    maxResults: 1,
                    key: settings.apis.youtube || process.env.YOUTUBE_API_KEY
                }
            });
            
            if (searchResponse.data.items && searchResponse.data.items.length > 0) {
                videoId = searchResponse.data.items[0].id.videoId;
            }
        }
        
        if (!videoId) {
            return m.reply('Video tidak ditemukan!');
        }
        
        m.reply(`*🎬 YouTube*\n\nVideo ID: ${videoId}\n\nFitur YouTube membutuhkan API tambahan. Silakan hubungi owner untuk mengaktifkan downloader YouTube.`);
        
    } catch (e) {
        console.error('YouTube error:', e);
        m.reply('Gagal memproses video YouTube! Coba lagi nanti.');
    }
};

const yt = youtube;
const ytdl = youtube;

const play = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan judul lagu!\nContoh: .play dewa 19 kangen');
    
    await m.reply(settings.messages.wait);
    
    try {
        m.reply(`*🎵 Play*\n\nMencari: ${text}\n\nFitur play music membutuhkan API tambahan. Silakan hubungi owner untuk mengaktifkan fitur ini.`);
        
    } catch (e) {
        console.error('Play error:', e);
        m.reply('Gagal menemukan lagu! Coba lagi nanti.');
    }
};

const spotify = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link Spotify atau judul lagu!\nContoh: .spotify lagu favorit');
    
    await m.reply(settings.messages.wait);
    
    try {
        m.reply(`*🎧 Spotify*\n\nMencari: ${text}\n\nFitur Spotify membutuhkan API tambahan. Silakan hubungi owner untuk mengaktifkan fitur ini.`);
        
    } catch (e) {
        console.error('Spotify error:', e);
        m.reply('Gagal memproses lagu! Coba lagi nanti.');
    }
};

const pinterest = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan keyword pencarian!\nContoh: .pinterest anime wallpaper');
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://api.agatz.xyz/api/pinterest?q=${encodeURIComponent(text)}`);
        
        if (!response.data.data || !response.data.data.length) {
            return m.reply('Gambar tidak ditemukan!');
        }
        
        const images = response.data.data.slice(0, 5);
        
        for (const img of images) {
            const imageBuffer = await axios.get(img, { responseType: 'arraybuffer' });
            await conn.sendMessage(m.chat, {
                image: Buffer.from(imageBuffer.data)
            }, { quoted: m });
        }
        
    } catch (e) {
        console.error('Pinterest error:', e);
        m.reply('Gagal mencari gambar! Coba lagi nanti.');
    }
};

const pin = pinterest;

const mediafire = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan link MediaFire!\nContoh: .mediafire https://www.mediafire.com/file/xxx');
    
    if (!text.includes('mediafire.com')) {
        return m.reply('Link tidak valid! Harus link MediaFire.');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://api.agatz.xyz/api/mediafire?url=${encodeURIComponent(text)}`);
        
        if (!response.data.data) {
            return m.reply('File tidak ditemukan!');
        }
        
        const data = response.data.data;
        
        const fileInfo = `*📁 MediaFire*

*Nama:* ${data.filename || 'Unknown'}
*Size:* ${data.size || 'Unknown'}
*Tipe:* ${data.mimetype || 'Unknown'}

*Link Download:* ${data.link}`;
        
        m.reply(fileInfo);
        
    } catch (e) {
        console.error('MediaFire error:', e);
        m.reply('Gagal mendapatkan link download! Coba lagi nanti.');
    }
};

const mf = mediafire;

module.exports = {
    tiktok,
    tt,
    tiktokdl,
    tiktokaudio,
    ttmp3,
    ttaudio,
    instagram,
    ig,
    igdl,
    facebook,
    fb,
    fbdl,
    twitter,
    tw,
    x,
    youtube,
    yt,
    ytdl,
    play,
    spotify,
    pinterest,
    pin,
    mediafire,
    mf
};

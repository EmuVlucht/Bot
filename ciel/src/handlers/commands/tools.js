const axios = require('axios');
const settings = require('../../../config/settings');
const { createSticker, webpToImage } = require('../../../lib/exif');
const { toAudio, toPTT, resizeImage, compressImage } = require('../../../lib/converter');

const sticker = async (conn, m, { args, text, isOwner, botSettings }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isMedia) {
        return m.reply('Kirim/reply gambar atau video dengan caption .sticker');
    }
    
    if (!quoted.isImage && !quoted.isVideo && !quoted.isSticker) {
        return m.reply('Hanya gambar/video/gif yang bisa dijadikan sticker!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const buffer = await quoted.download();
        
        const packname = args[0] || botSettings.packname || settings.botInfo.packname;
        const author = args[1] || botSettings.author || settings.botInfo.author;
        
        const stickerBuffer = await createSticker(buffer, { packname, author });
        
        await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
    } catch (e) {
        console.error('Sticker error:', e);
        m.reply('Gagal membuat sticker!');
    }
};

const s = sticker;
const stiker = sticker;

const toimg = async (conn, m, { isOwner }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isSticker) {
        return m.reply('Reply sticker untuk dijadikan gambar!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const buffer = await quoted.download();
        const imageBuffer = await webpToImage(buffer, 'png');
        
        await conn.sendMessage(m.chat, { 
            image: imageBuffer, 
            caption: 'Berhasil convert sticker ke gambar!' 
        }, { quoted: m });
    } catch (e) {
        console.error('Toimg error:', e);
        m.reply('Gagal convert sticker!');
    }
};

const toimage = toimg;

const tomp3 = async (conn, m, { isOwner }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isMedia || (!quoted.isVideo && !quoted.isAudio)) {
        return m.reply('Reply video/audio untuk dijadikan MP3!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const buffer = await quoted.download();
        const mp3Buffer = await toAudio(buffer, 'mp3');
        
        await conn.sendMessage(m.chat, { 
            audio: mp3Buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: m });
    } catch (e) {
        console.error('Tomp3 error:', e);
        m.reply('Gagal convert ke MP3!');
    }
};

const toaudio = tomp3;

const tovn = async (conn, m, { isOwner }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isMedia || (!quoted.isVideo && !quoted.isAudio)) {
        return m.reply('Reply video/audio untuk dijadikan voice note!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const buffer = await quoted.download();
        const pttBuffer = await toPTT(buffer);
        
        await conn.sendMessage(m.chat, { 
            audio: pttBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
        }, { quoted: m });
    } catch (e) {
        console.error('Tovn error:', e);
        m.reply('Gagal convert ke voice note!');
    }
};

const toptt = tovn;

const translate = async (conn, m, { args, text }) => {
    if (!text) return m.reply('Masukkan teks yang akan diterjemahkan!\nContoh: .translate en Halo apa kabar');
    
    const lang = args[0]?.length === 2 ? args[0] : 'id';
    const textToTranslate = lang === args[0] ? args.slice(1).join(' ') : text;
    
    if (!textToTranslate) return m.reply('Masukkan teks yang akan diterjemahkan!');
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://api.mymemory.translated.net/get`, {
            params: {
                q: textToTranslate,
                langpair: `auto|${lang}`
            }
        });
        
        const translated = response.data.responseData.translatedText;
        m.reply(`*🌐 Translate*\n\n*Teks:* ${textToTranslate}\n*Bahasa:* ${lang}\n*Hasil:* ${translated}`);
    } catch (e) {
        console.error('Translate error:', e);
        m.reply('Gagal menerjemahkan!');
    }
};

const tr = translate;

const resize = async (conn, m, { args }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isImage) {
        return m.reply('Reply gambar untuk diresize!');
    }
    
    const width = parseInt(args[0]) || 512;
    const height = parseInt(args[1]) || 512;
    
    if (width > 2048 || height > 2048) {
        return m.reply('Ukuran maksimal 2048x2048!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const buffer = await quoted.download();
        const resizedBuffer = await resizeImage(buffer, width, height, 'fill');
        
        await conn.sendMessage(m.chat, { 
            image: resizedBuffer, 
            caption: `Berhasil resize ke ${width}x${height}!` 
        }, { quoted: m });
    } catch (e) {
        console.error('Resize error:', e);
        m.reply('Gagal resize gambar!');
    }
};

const compress = async (conn, m, { args }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isImage) {
        return m.reply('Reply gambar untuk dicompress!');
    }
    
    const quality = parseInt(args[0]) || 50;
    
    if (quality < 1 || quality > 100) {
        return m.reply('Quality harus antara 1-100!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        const buffer = await quoted.download();
        const compressedBuffer = await compressImage(buffer, quality);
        
        const originalSize = (buffer.length / 1024).toFixed(2);
        const newSize = (compressedBuffer.length / 1024).toFixed(2);
        
        await conn.sendMessage(m.chat, { 
            image: compressedBuffer, 
            caption: `✅ Berhasil compress!\nUkuran: ${originalSize}KB → ${newSize}KB\nQuality: ${quality}%` 
        }, { quoted: m });
    } catch (e) {
        console.error('Compress error:', e);
        m.reply('Gagal compress gambar!');
    }
};

const qr = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan teks untuk dijadikan QR Code!');
    
    await m.reply(settings.messages.wait);
    
    try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, { 
            image: Buffer.from(response.data), 
            caption: `*QR Code*\n\nData: ${text}` 
        }, { quoted: m });
    } catch (e) {
        console.error('QR error:', e);
        m.reply('Gagal membuat QR Code!');
    }
};

const qrcode = qr;

const ocr = async (conn, m, { text }) => {
    const quoted = m.quoted || m;
    
    if (!quoted.isImage) {
        return m.reply('Reply gambar untuk membaca teks!');
    }
    
    await m.reply(settings.messages.wait);
    
    try {
        m.reply('Fitur OCR membutuhkan API. Silakan hubungi owner untuk mengaktifkan fitur ini.');
    } catch (e) {
        console.error('OCR error:', e);
        m.reply('Gagal membaca teks dari gambar!');
    }
};

const ssweb = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan URL website!\nContoh: .ssweb google.com');
    
    let url = text.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    
    await m.reply(settings.messages.wait);
    
    try {
        const apiUrl = `https://image.thum.io/get/width/1280/crop/720/fullpage/${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, { 
            image: Buffer.from(response.data), 
            caption: `*📸 Screenshot*\n\nURL: ${url}` 
        }, { quoted: m });
    } catch (e) {
        console.error('Ssweb error:', e);
        m.reply('Gagal screenshot website!');
    }
};

const ss = ssweb;

const get = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan URL!\nContoh: .get https://api.example.com/data');
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(text);
        let result = typeof response.data === 'object' ? 
            JSON.stringify(response.data, null, 2) : 
            response.data;
        
        if (result.length > 4000) {
            result = result.substring(0, 4000) + '\n\n... (terpotong)';
        }
        
        m.reply(`*📥 GET Response*\n\n${result}`);
    } catch (e) {
        console.error('Get error:', e);
        m.reply(`Error: ${e.message}`);
    }
};

const fetch = get;

const shorturl = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan URL yang akan dipendekkan!');
    
    let url = text.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        m.reply(`*🔗 URL Shortener*\n\nOriginal: ${url}\nShort: ${response.data}`);
    } catch (e) {
        console.error('Shorturl error:', e);
        m.reply('Gagal mempendekkan URL!');
    }
};

const tinyurl = shorturl;

const calc = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan rumus matematika!\nContoh: .calc 2+2*3');
    
    try {
        const sanitized = text.replace(/[^0-9+\-*/().%\s]/g, '');
        const result = eval(sanitized);
        m.reply(`*🔢 Kalkulator*\n\n${text} = ${result}`);
    } catch (e) {
        m.reply('Rumus tidak valid!');
    }
};

const kalkulator = calc;
const hitung = calc;

const runtime = async (conn, m, {}) => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    m.reply(`*⏱️ Runtime*\n\n${days}d ${hours}h ${minutes}m ${seconds}s`);
};

const uptime = runtime;

const weather = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan nama kota!\nContoh: .weather Jakarta');
    
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`);
        const data = response.data;
        const current = data.current_condition[0];
        const location = data.nearest_area[0];
        
        const info = `*🌤️ Weather*

*Lokasi:* ${location.areaName[0].value}, ${location.country[0].value}
*Cuaca:* ${current.weatherDesc[0].value}
*Suhu:* ${current.temp_C}°C / ${current.temp_F}°F
*Kelembaban:* ${current.humidity}%
*Angin:* ${current.windspeedKmph} km/h ${current.winddir16Point}
*Visibilitas:* ${current.visibility} km
*UV Index:* ${current.uvIndex}`;
        
        m.reply(info);
    } catch (e) {
        console.error('Weather error:', e);
        m.reply('Gagal mendapatkan info cuaca!');
    }
};

const cuaca = weather;

module.exports = {
    sticker,
    s,
    stiker,
    toimg,
    toimage,
    tomp3,
    toaudio,
    tovn,
    toptt,
    translate,
    tr,
    resize,
    compress,
    qr,
    qrcode,
    ocr,
    ssweb,
    ss,
    get,
    fetch,
    shorturl,
    tinyurl,
    calc,
    kalkulator,
    hitung,
    runtime,
    uptime,
    weather,
    cuaca
};

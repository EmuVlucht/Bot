const { join } = require('path');
const fs = require('fs-extra');
const axios = require('axios');

async function tts(text, lang = 'id') {
    return new Promise(async (resolve, reject) => {
        try {
            const tempDir = join(process.cwd(), 'temp');
            await fs.ensureDir(tempDir);
            
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
            
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            resolve(Buffer.from(response.data));
        } catch (e) {
            try {
                const altUrl = `https://api.voicerss.org/?key=free&hl=${lang}&src=${encodeURIComponent(text)}`;
                const response = await axios.get(altUrl, { responseType: 'arraybuffer' });
                resolve(Buffer.from(response.data));
            } catch (e2) {
                reject(e2);
            }
        }
    });
}

async function ttsGoogle(text, lang = 'id') {
    const maxLength = 200;
    const chunks = [];
    
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
    }
    
    const audioBuffers = [];
    
    for (const chunk of chunks) {
        try {
            const buffer = await tts(chunk, lang);
            audioBuffers.push(buffer);
        } catch (e) {
            console.error('TTS chunk error:', e.message);
        }
    }
    
    return Buffer.concat(audioBuffers);
}

module.exports = { tts, ttsGoogle };

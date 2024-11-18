const Jimp = require('jimp');
const fs = require('fs-extra');
const path = require('path');

const fontPath = path.join(__dirname, '../src/media/nulis/font');
const imagesPath = path.join(__dirname, '../src/media/nulis/images');

async function nulisBuku(text, halaman = 'kiri') {
    return new Promise(async (resolve, reject) => {
        try {
            const sebelum = halaman === 'kiri' ? 'sebelumkiri.jpg' : 'sebelumkanan.jpg';
            const setelah = halaman === 'kiri' ? 'setelahkiri.jpg' : 'setelahkanan.jpg';
            
            const image = await Jimp.read(path.join(imagesPath, 'buku', sebelum));
            const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
            
            const lines = text.match(/.{1,30}/g) || [text];
            let y = 50;
            
            for (const line of lines.slice(0, 15)) {
                image.print(font, 30, y, line);
                y += 25;
            }
            
            const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
            resolve(buffer);
        } catch (e) {
            reject(e);
        }
    });
}

async function nulisFolio(text, halaman = 'kiri') {
    return new Promise(async (resolve, reject) => {
        try {
            const sebelum = halaman === 'kiri' ? 'sebelumkiri.jpg' : 'sebelumkanan.jpg';
            
            const image = await Jimp.read(path.join(imagesPath, 'folio', sebelum));
            const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
            
            const lines = text.match(/.{1,40}/g) || [text];
            let y = 80;
            
            for (const line of lines.slice(0, 20)) {
                image.print(font, 50, y, line);
                y += 28;
            }
            
            const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
            resolve(buffer);
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { nulisBuku, nulisFolio };

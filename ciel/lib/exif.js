const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

class Exif {
    constructor(options = {}) {
        this.packname = options.packname || 'Ciel';
        this.author = options.author || 'Bot';
    }

    createExifBuffer() {
        const json = {
            'sticker-pack-id': 'ciel-bot-sticker',
            'sticker-pack-name': this.packname,
            'sticker-pack-publisher': this.author,
            'emojis': ['🤖'],
            'is-avatar-sticker': 0,
            'android-app-store-link': '',
            'ios-app-store-link': ''
        };

        let jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
        let exif = Buffer.alloc(19 + jsonBuffer.length);

        exif.writeUInt32LE(0x49492A00, 0);
        exif.writeUInt32LE(8, 4);
        exif.writeUInt16LE(1, 8);
        exif.writeUInt16LE(0x0112, 10);
        exif.writeUInt16LE(7, 12);
        exif.writeUInt32LE(jsonBuffer.length, 14);
        exif.writeUInt32LE(19, 18);

        return Buffer.concat([exif, jsonBuffer]);
    }

    async addExifToWebp(webpBuffer) {
        try {
            const exifBuffer = this.createExifBuffer();
            
            const bufferView = Buffer.from(webpBuffer);
            
            if (bufferView.toString('utf8', 0, 4) !== 'RIFF') {
                throw new Error('Invalid WebP file');
            }
            
            const chunk1 = bufferView.slice(0, 12);
            const chunk2 = bufferView.slice(12);
            
            const exifChunk = Buffer.alloc(8 + exifBuffer.length);
            exifChunk.write('EXIF', 0);
            exifChunk.writeUInt32LE(exifBuffer.length, 4);
            exifBuffer.copy(exifChunk, 8);
            
            const newBuffer = Buffer.concat([chunk1, exifChunk, chunk2]);
            
            const newSize = newBuffer.length - 8;
            newBuffer.writeUInt32LE(newSize, 4);
            
            return newBuffer;
        } catch (error) {
            console.error('Error adding exif to webp:', error);
            return webpBuffer;
        }
    }

    setPackname(packname) {
        this.packname = packname;
    }

    setAuthor(author) {
        this.author = author;
    }
}

const createSticker = async (mediaBuffer, options = {}) => {
    const sharp = require('sharp');
    const ffmpeg = require('fluent-ffmpeg');
    
    const { packname = 'Ciel', author = 'Bot', type = 'default' } = options;
    
    try {
        const isVideo = mediaBuffer.slice(0, 4).toString('hex') === '00000018' ||
                       mediaBuffer.slice(4, 8).toString('ascii') === 'ftyp' ||
                       mediaBuffer.slice(0, 3).toString('hex') === '000000';
        
        const isGif = mediaBuffer.slice(0, 6).toString('ascii').includes('GIF');
        
        let webpBuffer;
        
        if (isVideo || isGif) {
            webpBuffer = await convertVideoToWebp(mediaBuffer, type);
        } else {
            webpBuffer = await convertImageToWebp(mediaBuffer, type);
        }
        
        const exif = new Exif({ packname, author });
        return await exif.addExifToWebp(webpBuffer);
        
    } catch (error) {
        console.error('Error creating sticker:', error);
        throw error;
    }
};

const convertImageToWebp = async (imageBuffer, type = 'default') => {
    const sharp = require('sharp');
    
    let resizeOptions = { width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } };
    
    if (type === 'circle') {
        resizeOptions.fit = 'cover';
    } else if (type === 'rounded') {
        resizeOptions.fit = 'cover';
    }
    
    let image = sharp(imageBuffer)
        .resize(resizeOptions.width, resizeOptions.height, {
            fit: resizeOptions.fit,
            background: resizeOptions.background
        });
    
    if (type === 'circle') {
        const circleShape = Buffer.from(`
            <svg width="512" height="512">
                <circle cx="256" cy="256" r="256" fill="white"/>
            </svg>
        `);
        image = image.composite([{ input: circleShape, blend: 'dest-in' }]);
    } else if (type === 'rounded') {
        const roundedShape = Buffer.from(`
            <svg width="512" height="512">
                <rect x="0" y="0" width="512" height="512" rx="60" ry="60" fill="white"/>
            </svg>
        `);
        image = image.composite([{ input: roundedShape, blend: 'dest-in' }]);
    }
    
    return await image.webp({ quality: 80 }).toBuffer();
};

const convertVideoToWebp = async (videoBuffer, type = 'default') => {
    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.webp`);
    
    fs.writeFileSync(inputPath, videoBuffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-vcodec', 'libwebp',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse',
                '-loop', '0',
                '-ss', '0',
                '-t', '8',
                '-preset', 'default',
                '-an',
                '-vsync', '0'
            ])
            .toFormat('webp')
            .on('end', () => {
                const webpBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(webpBuffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(inputPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

const webpToImage = async (webpBuffer, format = 'png') => {
    const sharp = require('sharp');
    
    return await sharp(webpBuffer)
        .toFormat(format, { quality: 90 })
        .toBuffer();
};

const webpToVideo = async (webpBuffer) => {
    const sharp = require('sharp');
    const ffmpeg = require('fluent-ffmpeg');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.webp`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);
    
    fs.writeFileSync(inputPath, webpBuffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p',
                '-vf', 'scale=512:512'
            ])
            .toFormat('mp4')
            .on('end', () => {
                const mp4Buffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(mp4Buffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(inputPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

module.exports = {
    Exif,
    createSticker,
    convertImageToWebp,
    convertVideoToWebp,
    webpToImage,
    webpToVideo
};

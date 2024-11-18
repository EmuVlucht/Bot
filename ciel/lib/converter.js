const fs = require('fs');
const path = require('path');
const os = require('os');

const toAudio = async (buffer, ext = 'mp3') => {
    const ffmpeg = require('fluent-ffmpeg');
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.tmp`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.${ext}`);
    
    fs.writeFileSync(inputPath, buffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec(ext === 'mp3' ? 'libmp3lame' : 'aac')
            .audioBitrate('128k')
            .audioChannels(2)
            .audioFrequency(44100)
            .toFormat(ext)
            .on('end', () => {
                const audioBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(audioBuffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(inputPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

const toPTT = async (buffer) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.tmp`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.opus`);
    
    fs.writeFileSync(inputPath, buffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('libopus')
            .audioBitrate('128k')
            .audioChannels(1)
            .audioFrequency(48000)
            .outputOptions(['-avoid_negative_ts', 'make_zero'])
            .toFormat('opus')
            .on('end', () => {
                const opusBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(opusBuffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(inputPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

const toVideo = async (buffer, options = {}) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    const { 
        format = 'mp4',
        width = null,
        height = null,
        videoBitrate = '1000k',
        audioBitrate = '128k'
    } = options;
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.tmp`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.${format}`);
    
    fs.writeFileSync(inputPath, buffer);
    
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .videoBitrate(videoBitrate)
            .audioBitrate(audioBitrate)
            .outputOptions([
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p'
            ])
            .toFormat(format);
        
        if (width && height) {
            command = command.size(`${width}x${height}`);
        }
        
        command
            .on('end', () => {
                const videoBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(videoBuffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(inputPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

const toGif = async (buffer) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.tmp`);
    const palettePath = path.join(tempDir, `palette_${Date.now()}.png`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.gif`);
    
    fs.writeFileSync(inputPath, buffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-vf', 'fps=10,scale=320:-1:flags=lanczos,palettegen=stats_mode=diff'
            ])
            .on('end', () => {
                ffmpeg(inputPath)
                    .input(palettePath)
                    .outputOptions([
                        '-lavfi', 'fps=10,scale=320:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle'
                    ])
                    .toFormat('gif')
                    .on('end', () => {
                        const gifBuffer = fs.readFileSync(outputPath);
                        fs.unlinkSync(inputPath);
                        fs.unlinkSync(palettePath);
                        fs.unlinkSync(outputPath);
                        resolve(gifBuffer);
                    })
                    .on('error', (err) => {
                        cleanup();
                        reject(err);
                    })
                    .save(outputPath);
            })
            .on('error', (err) => {
                cleanup();
                reject(err);
            })
            .save(palettePath);
        
        function cleanup() {
            try { fs.unlinkSync(inputPath); } catch (e) {}
            try { fs.unlinkSync(palettePath); } catch (e) {}
            try { fs.unlinkSync(outputPath); } catch (e) {}
        }
    });
};

const resizeImage = async (buffer, width, height, fit = 'contain') => {
    const sharp = require('sharp');
    
    return await sharp(buffer)
        .resize(width, height, { fit, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();
};

const compressImage = async (buffer, quality = 80) => {
    const sharp = require('sharp');
    
    const metadata = await sharp(buffer).metadata();
    
    if (metadata.format === 'png') {
        return await sharp(buffer)
            .png({ quality, compressionLevel: 9 })
            .toBuffer();
    } else {
        return await sharp(buffer)
            .jpeg({ quality })
            .toBuffer();
    }
};

const convertImageFormat = async (buffer, format = 'png') => {
    const sharp = require('sharp');
    
    return await sharp(buffer)
        .toFormat(format, { quality: 90 })
        .toBuffer();
};

const getMediaInfo = async (buffer) => {
    const sharp = require('sharp');
    
    try {
        const metadata = await sharp(buffer).metadata();
        return {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            size: buffer.length,
            hasAlpha: metadata.hasAlpha || false
        };
    } catch (error) {
        return null;
    }
};

const base64ToBuffer = (base64) => {
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        return Buffer.from(matches[2], 'base64');
    }
    return Buffer.from(base64, 'base64');
};

const bufferToBase64 = (buffer, mimeType = 'image/png') => {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
};

const extractAudio = async (videoBuffer) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp3`);
    
    fs.writeFileSync(inputPath, videoBuffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate('192k')
            .toFormat('mp3')
            .on('end', () => {
                const audioBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
                resolve(audioBuffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(inputPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

const addAudioToVideo = async (videoBuffer, audioBuffer) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    const tempDir = os.tmpdir();
    const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
    const audioPath = path.join(tempDir, `audio_${Date.now()}.mp3`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);
    
    fs.writeFileSync(videoPath, videoBuffer);
    fs.writeFileSync(audioPath, audioBuffer);
    
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest'
            ])
            .toFormat('mp4')
            .on('end', () => {
                const resultBuffer = fs.readFileSync(outputPath);
                fs.unlinkSync(videoPath);
                fs.unlinkSync(audioPath);
                fs.unlinkSync(outputPath);
                resolve(resultBuffer);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(videoPath); } catch (e) {}
                try { fs.unlinkSync(audioPath); } catch (e) {}
                try { fs.unlinkSync(outputPath); } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
};

module.exports = {
    toAudio,
    toPTT,
    toVideo,
    toGif,
    resizeImage,
    compressImage,
    convertImageFormat,
    getMediaInfo,
    base64ToBuffer,
    bufferToBase64,
    extractAudio,
    addAudioToVideo
};

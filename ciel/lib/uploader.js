const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

async function getFileType(buffer) {
    const { fileTypeFromBuffer } = await import('file-type');
    return await fileTypeFromBuffer(buffer);
}

async function TelegraPh(buffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const form = new FormData();
            const input = Buffer.from(buffer);
            const fileType = await getFileType(buffer);
            const ext = fileType?.ext || 'bin';
            form.append('file', input, { filename: 'data.' + ext });
            const { data } = await axios.post('https://telegra.ph/upload', form, {
                headers: {
                    ...form.getHeaders()
                }
            });
            resolve('https://telegra.ph' + data[0].src);
        } catch (e) {
            reject(e);
        }
    });
}

async function UguuSe(buffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const form = new FormData();
            const input = Buffer.from(buffer);
            const fileType = await getFileType(buffer);
            const ext = fileType?.ext || 'bin';
            form.append('files[]', input, { filename: 'data.' + ext });
            const { data } = await axios.post('https://uguu.se/upload.php', form, {
                headers: {
                    ...form.getHeaders()
                }
            });
            resolve(data.files[0]);
        } catch (e) {
            reject(e);
        }
    });
}

async function Catbox(buffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const form = new FormData();
            const input = Buffer.from(buffer);
            const fileType = await getFileType(buffer);
            const ext = fileType?.ext || 'bin';
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', input, { filename: 'data.' + ext });
            const { data } = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders()
                }
            });
            resolve(data);
        } catch (e) {
            reject(e);
        }
    });
}

async function webp2mp4(buffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const form = new FormData();
            form.append('new-image-url', '');
            form.append('new-image', buffer, { filename: 'image.webp' });
            
            const { data } = await axios.post('https://s6.ezgif.com/webp-to-mp4', form, {
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`
                }
            });
            
            const $ = cheerio.load(data);
            const file = $('input[name="file"]').attr('value');
            
            const formConvert = new FormData();
            formConvert.append('file', file);
            formConvert.append('convert', 'Convert WebP to MP4!');
            
            const { data: convertData } = await axios.post('https://ezgif.com/webp-to-mp4/' + file, formConvert, {
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formConvert.getBoundary()}`
                }
            });
            
            const $2 = cheerio.load(convertData);
            const result = 'https:' + $2('div#output > p.outfile > video > source').attr('src');
            
            resolve({
                status: true,
                result: result
            });
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { TelegraPh, UguuSe, Catbox, webp2mp4, getFileType };

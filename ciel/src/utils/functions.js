const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
const FileType = require('file-type');
const moment = require('moment-timezone');

const sizeFormatter = (options = {}) => {
    const units = options.std === 'IEC' ? ['B', 'KiB', 'MiB', 'GiB', 'TiB'] : ['B', 'KB', 'MB', 'GB', 'TB'];
    return (bytes) => {
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
    };
};

const unsafeAgent = new https.Agent({ rejectUnauthorized: false });

const runtime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d == 1 ? " hari, " : " hari, ") : "";
    const hDisplay = h > 0 ? h + (h == 1 ? " jam, " : " jam, ") : "";
    const mDisplay = m > 0 ? m + (m == 1 ? " menit, " : " menit, ") : "";
    const sDisplay = s > 0 ? s + (s == 1 ? " detik" : " detik") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isUrl = (text) => {
    return text?.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi);
};

const getBuffer = async (url, options = {}) => {
    try {
        const { data } = await axios.get(url, {
            responseType: 'arraybuffer',
            httpsAgent: unsafeAgent,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            ...options
        });
        return data;
    } catch (e) {
        console.error('getBuffer error:', e.message);
        return null;
    }
};

const fetchJson = async (url, options = {}) => {
    try {
        const { data } = await axios.get(url, {
            httpsAgent: unsafeAgent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            ...options
        });
        return data;
    } catch (e) {
        console.error('fetchJson error:', e.message);
        return null;
    }
};

const postJson = async (url, body = {}, options = {}) => {
    try {
        const { data } = await axios.post(url, body, {
            httpsAgent: unsafeAgent,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            ...options
        });
        return data;
    } catch (e) {
        console.error('postJson error:', e.message);
        return null;
    }
};

const clockString = (ms) => {
    const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
    const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
    const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

const formatDate = (n, locale = 'id') => {
    const d = new Date(n);
    return d.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    });
};

const getTime = (format, date) => {
    if (date) {
        return moment(date).locale('id').format(format);
    }
    return moment.tz('Asia/Jakarta').locale('id').format(format);
};

const getGreeting = () => {
    const hour = moment.tz('Asia/Jakarta').format('HH');
    if (hour < 5) return 'Selamat Malam 🌃';
    if (hour < 11) return 'Selamat Pagi 🌅';
    if (hour < 15) return 'Selamat Siang ☀️';
    if (hour < 18) return 'Selamat Sore 🌇';
    return 'Selamat Malam 🌙';
};

const bytesToSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getSizeMedia = async (path) => {
    if (typeof path === 'string' && /^https?:\/\//.test(path)) {
        try {
            const res = await axios.head(path, { httpsAgent: unsafeAgent });
            const length = parseInt(res.headers['content-length']);
            return !isNaN(length) ? bytesToSize(length) : '0 Bytes';
        } catch (e) {
            return '0 Bytes';
        }
    } else if (Buffer.isBuffer(path)) {
        return bytesToSize(Buffer.byteLength(path));
    }
    return '0 Bytes';
};

const parseMention = (text = '') => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
};

const getGroupAdmins = (participants) => {
    const admins = [];
    for (const p of participants) {
        if (p.admin === 'superadmin' || p.admin === 'admin') {
            admins.push(p.id);
        }
    }
    return admins;
};

const pickRandom = (list) => list[Math.floor(list.length * Math.random())];

const generateToken = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

const getRandom = (ext = '') => {
    return `${Math.floor(Math.random() * 100000)}${ext}`;
};

const limitText = (text, limit) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
};

const isEmoji = (str) => {
    try {
        const emojiRegex = /[\p{Emoji}]/u;
        return emojiRegex.test(str);
    } catch {
        return false;
    }
};

const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getFileType = async (buffer) => {
    try {
        const type = await FileType.fromBuffer(buffer);
        return type ? type.mime : 'application/octet-stream';
    } catch (e) {
        return 'application/octet-stream';
    }
};

const writeFile = async (filePath, data) => {
    try {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, data);
        return true;
    } catch (e) {
        console.error('writeFile error:', e.message);
        return false;
    }
};

const readFile = async (filePath) => {
    try {
        return await fs.readFile(filePath);
    } catch (e) {
        console.error('readFile error:', e.message);
        return null;
    }
};

const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (e) {
        return false;
    }
};

const hashString = (str) => {
    return crypto.createHash('sha256').update(str).digest('hex');
};

const cleanTemp = async () => {
    const tempDir = path.join(process.cwd(), 'src', 'temp');
    try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
            if (file !== '.gitkeep') {
                await fs.unlink(path.join(tempDir, file));
            }
        }
        console.log('✅ Temp folder cleaned');
    } catch (e) {
        console.error('cleanTemp error:', e.message);
    }
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const formatMoney = (money) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(money);
};

module.exports = {
    runtime,
    sleep,
    delay,
    isUrl,
    getBuffer,
    fetchJson,
    postJson,
    clockString,
    formatDate,
    getTime,
    getGreeting,
    bytesToSize,
    getSizeMedia,
    parseMention,
    getGroupAdmins,
    pickRandom,
    generateToken,
    getRandom,
    limitText,
    isEmoji,
    formatNumber,
    formatMoney,
    getFileType,
    writeFile,
    readFile,
    deleteFile,
    hashString,
    cleanTemp
};
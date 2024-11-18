require('dotenv').config();
const fs = require('fs');
const path = require('path');

const detectPlatform = () => {
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) return 'railway';
    if (process.env.REPL_ID || process.env.REPLIT_DB_URL) return 'replit';
    if (process.env.P_SERVER_UUID || process.env.PTERODACTYL) return 'pterodactyl';
    if (process.env.CODESPACE_NAME || process.env.CODESPACES) return 'codespace';
    if (process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux')) return 'termux';
    return 'vps';
};

global.platform = detectPlatform();
console.log(`[Platform] Running on: ${global.platform}`);

global.owner = (process.env.OWNER_NUMBER || '6282113821188').split(',').map(n => n.trim());
global.author = process.env.AUTHOR_NAME || 'Nazedev';
global.botname = process.env.BOT_NAME || 'Naze Bot';
global.packname = process.env.PACK_NAME || 'Bot WhatsApp';
global.listprefix = ['+', '!', '.', '#', '/'];

global.listv = ['•', '●', '■', '✿', '▲', '➩', '➢', '➣', '➤', '✦', '✧', '△', '❀', '○', '□', '♤', '♡', '◇', '♧', '々', '〆'];
global.pairing_code = process.env.PAIRING_CODE === 'true' || true;
global.number_bot = process.env.BOT_NUMBER || '';

const mediaPath = path.join(__dirname, 'src', 'media');
global.fake = {
    anonim: 'https://telegra.ph/file/95670d63378f7f4210f03.png',
    thumbnailUrl: 'https://telegra.ph/file/fe4843a1261fc414542c4.jpg',
    thumbnail: fs.existsSync(path.join(mediaPath, 'naze.png')) 
        ? fs.readFileSync(path.join(mediaPath, 'naze.png')) 
        : Buffer.alloc(0),
    docs: fs.existsSync(path.join(mediaPath, 'fake.pdf')) 
        ? fs.readFileSync(path.join(mediaPath, 'fake.pdf')) 
        : Buffer.alloc(0),
    listfakedocs: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
    ],
};

global.my = {
    yt: process.env.YOUTUBE_CHANNEL || 'https://youtube.com/c/Nazedev',
    gh: process.env.GITHUB_PROFILE || 'https://github.com/nazedev',
    gc: process.env.WHATSAPP_GROUP || 'https://chat.whatsapp.com/B5qJIwZHm4VEYZJQE6iMwy',
    ch: process.env.WHATSAPP_CHANNEL || '120363250409960161@newsletter',
};

global.limit = {
    free: parseInt(process.env.LIMIT_FREE) || 20,
    premium: parseInt(process.env.LIMIT_PREMIUM) || 999,
    vip: parseInt(process.env.LIMIT_VIP) || 9999
};

global.money = {
    free: parseInt(process.env.MONEY_FREE) || 10000,
    premium: parseInt(process.env.MONEY_PREMIUM) || 1000000,
    vip: parseInt(process.env.MONEY_VIP) || 10000000
};

global.mess = {
    key: 'Apikey mu telah habis silahkan kunjungi\nhttps://my.hitori.pw',
    owner: 'Fitur Khusus Owner!',
    admin: 'Fitur Khusus Admin!',
    botAdmin: 'Bot Bukan Admin!',
    group: 'Gunakan Di Group!',
    private: 'Gunakan Di Privat Chat!',
    limit: 'Limit Anda Telah Habis!',
    prem: 'Khusus User Premium!',
    wait: 'Loading...',
    error: 'Error!',
    done: 'Done'
};

global.APIs = {
    hitori: process.env.HITORI_API_URL || 'https://api.hitori.pw',
};

global.APIKeys = {
    'https://api.hitori.pw': process.env.HITORI_API_KEY || 'htrkey-77eb83c0eeb39d40',
    geminiApikey: (process.env.GEMINI_API_KEY || 'AIzaSyD0lkGz6ZhKi_MHSSmJcCX3wXoDZhELPaQ').split(',')
};

global.badWords = ['tolol', 'goblok', 'asu', 'pantek', 'kampret', 'ngentot', 'jancok', 'kontol', 'memek', 'lonte'];
global.chatLength = parseInt(process.env.CHAT_LENGTH) || 1000;

module.exports = {
    platform: global.platform,
    owner: global.owner,
    author: global.author,
    botname: global.botname,
    packname: global.packname,
    listprefix: global.listprefix,
    pairing_code: global.pairing_code,
    number_bot: global.number_bot,
    limit: global.limit,
    money: global.money,
    mess: global.mess,
    APIs: global.APIs,
    APIKeys: global.APIKeys,
    badWords: global.badWords,
    chatLength: global.chatLength
};

require('dotenv').config();

module.exports = {
    owner: process.env.OWNER_NUMBER ? process.env.OWNER_NUMBER.split(',') : ['6285924800010'],
    
    botInfo: {
        name: process.env.BOT_NAME || 'Ciel Bot',
        author: process.env.BOT_AUTHOR || 'Ciel',
        packname: process.env.STICKER_PACKNAME || 'Ciel Stickers',
        version: '1.0.0'
    },
    
    prefixes: ['+', '!', '.', '#', '/'],
    
    limits: {
        free: 20,
        premium: 999,
        vip: 9999
    },
    
    money: {
        free: 10000,
        premium: 1000000,
        vip: 10000000
    },
    
    messages: {
        owner: 'Fitur khusus Owner!',
        admin: 'Fitur khusus Admin!',
        botAdmin: 'Bot bukan Admin!',
        group: 'Gunakan di Group!',
        private: 'Gunakan di Private Chat!',
        limit: 'Limit anda telah habis!',
        premium: 'Khusus User Premium!',
        wait: 'Sedang memproses...',
        error: 'Terjadi kesalahan!',
        done: 'Selesai!'
    },
    
    apis: {
        gemini: process.env.GEMINI_API_KEY || ''
    },
    
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:VSktFuvpEIgHCnIDpNnXXnCSZlotLNUI@shinkansen.proxy.rlwy.net:22870/railway'
    },
    
    server: {
        port: process.env.PORT || 5000
    },
    
    session: {
        folderName: process.env.SESSION_FOLDER || 'ciel_session'
    },
    
    pairing: {
        enabled: process.env.PAIRING_CODE === 'true' || true,
        phoneNumber: process.env.BOT_NUMBER || '6282184389697'
    },
    
    features: {
        autoRead: true,
        autoTyping: true,
        antiSpam: true,
        multiPrefix: true,
        public: true
    },
    
    badWords: ['tolol', 'goblok', 'asu', 'pantek', 'kampret', 'ngentot', 'jancok', 'kontol', 'memek', 'lonte'],
    
    timezone: 'Asia/Jakarta',
    
    social: {
        youtube: 'https://youtube.com',
        github: 'https://github.com',
        whatsappChannel: ''
    }
};

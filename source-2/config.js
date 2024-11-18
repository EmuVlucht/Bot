module.exports = {
    authFolder: './auth',
    timezone: 'Asia/Jakarta',
    globalPackname: 'MyBot Stickers',
    globalAuthor: 'MyBot',
    tiktokRegex: /(?<!\S)https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/gi,
    douyinRegex: /(?<!\S)https?:\/\/(?:www\.)?douyin\.com\/[^\s]+|https?:\/\/v\.douyin\.com\/[^\s]+/gi,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    prefixes: ['!', '.', '/', ''], 
     botInfo: {
        name: "Kirara",
        owner: ["628xxxxx@s.whatsapp.net"],
        public: true,
        version: "1.0.0"
    },
    monitorInterval: 60000,
    commands: {
        sticker: ['sticker', 's', 'stiker', 'stik'],
        tiktok: ['tiktok', 'tt', 'tik'],
        douyin: ['douyin', 'dy'],
        ping: ['ping', 'speed'],
        info: ['info', 'botinfo', 'status']
    }
};

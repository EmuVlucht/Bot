# WhatsApp TikTok/Douyin Downloader Bot

![Bot Logo](https://files.catbox.moe/nlxg1u.jpg)

A feature-rich WhatsApp bot that allows users to download TikTok and Douyin videos directly through WhatsApp, with additional utilities like sticker creation and performance monitoring.

## 🌟 Features

- **TikTok/Douyin Downloader**
  - Download videos without watermark
  - Support for slideshow posts
  - Audio extraction option
  - Automatic detection of TikTok/Douyin links

- **Sticker Creator**
  - Convert images/videos to stickers
  - Custom pack name and author
  - Supports GIF, image, and video formats

- **Bot Utilities**
  - Multi-prefix support (`!`, `.`, `/`, or no prefix)
  - Performance monitoring (RAM, uptime, speed)
  - Auto-read messages
  - Ping command to check latency

- **User Friendly**
  - Detailed error messages
  - Progress updates
  - Clean response formatting

## 🚀 Installation

### Prerequisites
- Node.js v20 or higher
- WhatsApp account
- FFmpeg installed

### Setup
1. Clone the repository:
```bash
git clone https://github.com/Yuri-Neko/Simple-Bot.git
cd Simple-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure the bot:
```bash
nano config.js
```
Edit `config.js` with your preferences

4. Start the bot:
```bash
npm start
```

## 📋 Usage

### Basic Commands
| Command | Description | Example |
|---------|-------------|---------|
| `!sticker` | Create sticker from media | `!sticker` |
| `!ping` | Check bot response time | `!ping` |
| `!info` | Show bot information | `!info` |

### TikTok/Douyin Download
Simply send any TikTok/Douyin link in chat:
```
https://vt.tiktok.com/xyz123
https://www.douyin.com/abc456
```

## 🛠️ Configuration
Edit `config.js` to customize:
```javascript
module.exports = {
    // Bot settings
    botInfo: {
        name: "MyBot",
        owner: ["6281234567890@s.whatsapp.net"],
        public: true,
        version: "1.0.0"
    },
    
    // Command prefixes
    prefixes: ['!', '.', '/', ''], // Empty string for no prefix
    
    // Sticker defaults
    globalPackname: 'MyBot Stickers',
    globalAuthor: 'MyBot',
    
    // Performance monitoring
    monitorInterval: 60000 // 1 minute
};
```

## 📊 Bot Information Display
```
╭─┴─❍「 BOT INFO 」❍
├ Name : MyBot v1.0.0
├ Owner : @username
├ Mode : Public
├ Prefix : Multi-Prefix
╰─┬────❍
╭─┴─❍「 PERFORMANCE 」❍
├ Uptime : 2d 5h 30m
├ RAM Usage : 156.42 MB
├ Speed : 24.56 ms
╰──────❍
```

## 💖 Special Thanks
- **[Baileys Library](https://github.com/naruyaizumi/baileys)** by [@naruyaizumi](https://github.com/naruyaizumi) - The WhatsApp Web library that makes this bot possible
- All contributors and users who helped test and improve this bot

## 🤝 Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## ✉️ Contact
Author: Ren Takamori  
Project Link: [https://github.com/Yuri-Neko/Simple-Bot/](https://github.com/Yuri-Neko/Simple-Bot/)  
Email: admin@takamori.xyz

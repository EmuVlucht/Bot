# Naze Bot - WhatsApp Bot

WhatsApp Bot dengan @whiskeysockets/baileys dan PostgreSQL (Prisma ORM).

## Features

| Menu | Bot | Group | Search | Download | Tools | AI | Game | Fun | Owner |
|------|-----|-------|--------|----------|-------|----|----- |-----|-------|
| Work | ✅  | ✅     | ✅      | ✅        | ✅     | ✅  | ✅    | ✅   | ✅     |

- Multi-platform deployment (Railway, Replit, Pterodactyl, VPS/Termux)
- PostgreSQL database dengan Prisma ORM
- Support QR Code & Pairing Code
- Multi-session (JadiBot)
- Game, AI, Download, dan banyak lagi

---

## Requirements

- Node.js v18+
- PostgreSQL Database
- FFmpeg
- ImageMagick
- LibWebP

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/nazedev/naze-bot
cd naze-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi kamu:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
BOT_NUMBER=62xxxxxxxxxx
OWNER_NUMBER=62xxxxxxxxxx
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Bot

```bash
npm start
```

---

## Deployment Guides

### Railway

1. Fork repository ini
2. Buat project baru di Railway
3. Connect dengan GitHub repo
4. Tambahkan PostgreSQL addon
5. Set environment variables:
   - `DATABASE_URL` (otomatis dari PostgreSQL addon)
   - `BOT_NUMBER`
   - `OWNER_NUMBER`
6. Deploy!

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/nazebot)

### Replit

1. Fork repository ke Replit
2. Buat PostgreSQL database (atau gunakan external)
3. Set Secrets:
   - `DATABASE_URL`
   - `BOT_NUMBER`
   - `OWNER_NUMBER`
4. Run!

### Pterodactyl

1. Import egg dari `egg-naze-bot.json`
2. Buat server baru dengan egg tersebut
3. Set environment variables
4. Start server

### VPS / Ubuntu / Debian

```bash
# Install dependencies
sudo apt update && sudo apt install -y nodejs npm ffmpeg imagemagick webp

# Clone dan install
git clone https://github.com/nazedev/naze-bot
cd naze-bot
npm install

# Setup
cp .env.example .env
nano .env  # Edit konfigurasi

# Database
npx prisma generate
npx prisma db push

# Run dengan PM2
npm install -g pm2
pm2 start npm --name "naze-bot" -- start
pm2 save
pm2 startup
```

### Termux

```bash
# Install packages
pkg update && pkg upgrade -y
pkg install -y git nodejs ffmpeg imagemagick

# Clone dan install
git clone https://github.com/nazedev/naze-bot
cd naze-bot
npm install

# Setup
cp .env.example .env
nano .env  # Edit konfigurasi

# Database
npx prisma generate
npx prisma db push

# Run
npm start
```

### Docker

```bash
# Build dan run
docker-compose up -d

# Lihat logs
docker-compose logs -f bot
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `BOT_NUMBER` | Nomor WhatsApp bot (tanpa +) | ❌ |
| `OWNER_NUMBER` | Nomor owner (pisahkan dengan koma) | ❌ |
| `AUTHOR_NAME` | Nama author untuk stiker | ❌ |
| `BOT_NAME` | Nama bot | ❌ |
| `PACK_NAME` | Pack name untuk stiker | ❌ |
| `PAIRING_CODE` | Gunakan pairing code (true/false) | ❌ |

---

## Connection Options

Bot mendukung 2 cara koneksi:

### 1. QR Code (Default)
```bash
npm start
```
Scan QR Code yang muncul di terminal.

### 2. Pairing Code
```bash
npm start --pairing-code
```
Masukkan nomor WhatsApp, lalu input pairing code yang muncul.

---

## Project Structure

```
naze-bot/
├── src/
│   ├── database.js    # Database module (Prisma)
│   ├── message.js     # Message handler
│   ├── server.js      # Express server
│   ├── antispam.js    # Anti-spam module
│   └── jadibot.js     # Multi-session module
├── lib/
│   ├── function.js    # Utility functions
│   ├── converter.js   # Audio/video converter
│   ├── exif.js        # Stiker exif handler
│   ├── game.js        # Game functions
│   ├── screaper.js    # Scrapers
│   └── uploader.js    # File uploaders
├── prisma/
│   └── schema.prisma  # Prisma schema
├── index.js           # Main entry point
├── naze.js            # Command handler
├── settings.js        # Global settings
└── package.json
```

---

## Contributing

1. Fork repository
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## Credits

- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Prisma](https://www.prisma.io/) - Database ORM
- [Nazedev](https://github.com/nazedev) - Original creator

---

## License

[MIT License](LICENSE)

---

## Support

- WhatsApp Group: [Join](https://chat.whatsapp.com/B5qJIwZHm4VEYZJQE6iMwy)
- GitHub Issues: [Report Bug](https://github.com/nazedev/naze-bot/issues)
- Saweria: [Donate](https://saweria.co/naze)

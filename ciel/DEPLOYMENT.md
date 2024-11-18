# Panduan Deployment Ciel Bot

## Persyaratan Sistem
- Node.js v18 atau lebih tinggi
- NPM atau Yarn
- PostgreSQL (bisa menggunakan Railway, Supabase, Neon, dll)

## Environment Variables
Buat file `.env` atau set environment variables berikut:

```env
DATABASE_URL=postgresql://user:password@host:port/database
BOT_NUMBER=628xxxxxxxxxx
OWNER_NUMBER=628xxxxxxxxxx
BOT_NAME=Ciel Bot
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

---

## 1. Railway Deployment

### Langkah-langkah:
1. Fork/Clone repository ini
2. Buat project baru di [Railway](https://railway.app)
3. Connect dengan GitHub repository
4. Tambahkan environment variables di Railway Dashboard
5. Deploy otomatis akan berjalan

### File Konfigurasi:
- `railway.json` - Konfigurasi build dan deploy
- `railway.toml` - Konfigurasi alternatif

---

## 2. Replit Deployment

### Langkah-langkah:
1. Import repository ke Replit
2. Tambahkan Secrets di panel Secrets:
   - `DATABASE_URL`
   - `BOT_NUMBER`
   - `OWNER_NUMBER`
3. Klik Run untuk menjalankan bot

### Catatan:
- Gunakan Replit Database atau koneksikan ke PostgreSQL eksternal
- Bot akan menampilkan QR code di console

---

## 3. VPS/Termux Deployment

### Menggunakan Script Start:
```bash
# Clone repository
git clone <repository-url>
cd ciel

# Jalankan dengan script
chmod +x start.sh
./start.sh
```

### Menggunakan PM2:
```bash
# Install PM2 secara global
npm install -g pm2

# Install dependencies
npm install

# Generate Prisma
npx prisma generate

# Jalankan dengan PM2
pm2 start ecosystem.config.js

# Lihat logs
pm2 logs ciel-bot

# Restart bot
pm2 restart ciel-bot

# Stop bot
pm2 stop ciel-bot
```

### Tanpa PM2:
```bash
# Install dependencies
npm install

# Generate Prisma
npx prisma generate

# Jalankan
npm start
```

---

## 4. Pterodactyl Panel

### Persyaratan:
- Pterodactyl Panel dengan Node.js Egg
- Minimal 1GB RAM

### Langkah-langkah:
1. Upload semua file ke server
2. Set startup command: `npm start`
3. Set environment variables di panel
4. Mulai server

### Startup Variables:
| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `BOT_NUMBER` | Nomor WhatsApp bot | - |
| `OWNER_NUMBER` | Nomor owner | - |
| `PORT` | Port server | 5000 |

---

## Troubleshooting

### Bot tidak connect ke WhatsApp
1. Hapus folder `ciel_session`
2. Restart bot
3. Scan QR code baru

### Database Error
1. Pastikan `DATABASE_URL` benar
2. Jalankan `npx prisma generate`
3. Jalankan `npx prisma db push`

### Memory Error
1. Tingkatkan RAM (minimal 1GB)
2. Restart bot secara berkala

---

## Support
- Buat issue di repository untuk bantuan

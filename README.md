# WhatsApp Checkpoint Bot

Bot WhatsApp untuk menghitung dan melacak berbagai jenis pesan di grup WhatsApp.

## Fitur

- **Checkpoint Init**: Memulai perhitungan dari nol atau dengan data awal
- **Checkpoint**: Menampilkan data perhitungan saat ini
- **Checkpoint Reset**: Menghapus semua data dan memulai ulang
- **Checkpoint Live**: Menampilkan data dengan update otomatis setiap 2 menit selama 15 menit
- **Checkpoint Unlive**: Menghentikan mode live
- **Checkpoint Rebase**: Menambahkan data ke perhitungan yang ada

## Jenis Pesan yang Dihitung

| Tipe | Keterangan |
|------|------------|
| Sw | Story WhatsApp (foto/video) |
| Doc | Dokumen (selain mp4, mp3, jpg, png) |
| Text | Pesan teks biasa |
| Audio | Pesan suara |
| Sticker | Stiker dan GIF |
| 1× | Pesan sekali lihat (view once) |
| Link | Pesan yang mengandung URL |
| Null | Pesan yang dihapus |

## Environment Variables

| Variable | Keterangan |
|----------|------------|
| `OWNER_NUMBER` | Nomor WA kamu yang bisa mengontrol bot (format: 628xxx) |
| `TARGET_NUMBER` | Nomor WA tujuan laporan harian (format: 628xxx) |
| `DATABASE_URL` | URL PostgreSQL (otomatis di Replit/Railway) |
| `USE_DB_SESSION` | Set `true` untuk menyimpan session di database (opsional) |

---

## Deploy ke Railway

### Langkah 1: Persiapan Repository

1. **Fork/Clone repository ini ke GitHub kamu**
2. **Pastikan semua file sudah ada**:
   - `Dockerfile`
   - `railway.json`
   - `package.json`
   - `src/` folder dengan semua file

### Langkah 2: Buat Project di Railway

1. Buka [railway.app](https://railway.app) dan login dengan GitHub
2. Klik **"New Project"** → **"Deploy from GitHub repo"**
3. Pilih repository yang berisi bot ini
4. Railway akan otomatis mendeteksi Dockerfile

### Langkah 3: Tambah PostgreSQL Database

1. Di project Railway, klik **"Create"** → **"Database"** → **"Add PostgreSQL"**
2. Tunggu database selesai dibuat (30-60 detik)
3. Railway otomatis menyediakan `DATABASE_URL`

### Langkah 4: Hubungkan Database ke Bot

1. Klik service bot kamu → tab **"Variables"**
2. Klik **"New Variable"** → ketik `DATABASE_URL`
3. Pilih dari dropdown: `${{Postgres.DATABASE_URL}}`
4. Klik **"Add"**

### Langkah 5: Tambah Environment Variables

Di tab **"Variables"**, tambahkan:

```
OWNER_NUMBER=628xxxxxxxxxx
TARGET_NUMBER=628xxxxxxxxxx
NODE_ENV=production
```

### Langkah 6: Deploy dan Scan QR

1. Railway akan otomatis build dan deploy
2. Buka tab **"Deployments"** → klik deployment terbaru
3. Lihat **Logs** untuk menemukan QR Code
4. Scan QR Code dengan WhatsApp kamu
5. Bot akan terhubung dan siap digunakan!

### Catatan Railway

- Session WhatsApp disimpan di database (persistent)
- Bot akan tetap jalan meskipun restart/redeploy
- Setelah scan QR sekali, tidak perlu scan lagi
- Jika logout, data session di database akan di-reset otomatis

---

## Deploy ke Replit

### Langkah 1: Set Environment Variables

1. Buka tab **"Secrets"** di Replit
2. Tambahkan:
   - `OWNER_NUMBER`: Nomor WhatsApp kamu (format: 628xxx)
   - `TARGET_NUMBER`: Nomor tujuan laporan

### Langkah 2: Jalankan Bot

1. Klik tombol **"Run"**
2. Scan QR code yang muncul dengan WhatsApp kamu
3. Bot siap digunakan!

### Catatan Replit

- Session disimpan di folder `auth_info/`
- Jangan hapus folder tersebut
- Jika logout, hapus folder `auth_info` dan scan ulang

---

## Perintah Bot

| Perintah | Keterangan |
|----------|------------|
| `.checkpoint init` | Mulai perhitungan dari nol |
| `.checkpoint init` + data | Mulai dengan data awal |
| `.checkpoint` | Lihat data saat ini |
| `.checkpoint reset` | Hapus semua data grup |
| `.checkpoint live` | Mode live (update tiap 2 menit) |
| `.checkpoint unlive` | Hentikan mode live |
| `.checkpoint rebase` + data | Tambah data ke perhitungan |

### Contoh Init dengan Data

```
.checkpoint init
100 Sw
50 Doc
200 Text
10 Audio
30 Sticker
5 1×
20 Link
0 Null
```

### Contoh Rebase

```
.checkpoint rebase
50 Sw
25 Doc
```

---

## Laporan Harian

Bot akan mengirim laporan otomatis setiap jam **00:00 WIT (Asia/Jayapura)** ke nomor yang sudah diatur (`TARGET_NUMBER`).

Format laporan:

```
HH:MM:SS DD-MM-YYYY (UTC)

Grup nama grup
xxx Sw
xxx Doc
xxx Text
xxx Audio
xxx Sticker
xxx 1×
xxx Link
xxx Null
```

---

## Troubleshooting

### QR Code tidak muncul
- Periksa logs untuk error
- Pastikan `DATABASE_URL` sudah di-set

### Bot tidak merespon perintah
- Pastikan kamu menggunakan nomor yang sama dengan `OWNER_NUMBER`
- Pastikan grup sudah di-init dengan `.checkpoint init`

### Database connection error
- Periksa `DATABASE_URL` sudah benar
- Di Railway: pastikan PostgreSQL sudah terhubung

### Session hilang setelah restart (Railway)
- Ini normal untuk pertama kali
- Setelah scan QR, session akan disimpan di database
- Restart berikutnya tidak perlu scan lagi

---

## Tech Stack

- Node.js 20
- @whiskeysockets/baileys (WhatsApp Web API)
- PostgreSQL + Drizzle ORM
- node-cron (scheduled tasks)
- Docker (untuk Railway)

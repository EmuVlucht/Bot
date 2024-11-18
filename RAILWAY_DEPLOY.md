# Deploy ke Railway

Panduan lengkap untuk deploy WhatsApp Checkpoint Bot ke Railway.

## Langkah 1: Persiapan Repository

1. Push kode ke GitHub repository
2. Pastikan semua file berikut ada:
   - `src/index.js` - Main entry point
   - `src/web.js` - Web server dengan WebSocket
   - `src/migrate.js` - Database migration script
   - `railway.toml` - Railway configuration
   - `package.json` - Dependencies

## Langkah 2: Buat Project di Railway

1. Buka [Railway.app](https://railway.app)
2. Login dengan GitHub
3. Klik "New Project"
4. Pilih "Deploy from GitHub repo"
5. Pilih repository yang berisi bot ini

## Langkah 3: Tambah PostgreSQL Database

1. Di dashboard project Railway, klik "+ New"
2. Pilih "Database" → "Add PostgreSQL"
3. Tunggu database selesai provisioning
4. Railway akan otomatis menambahkan `DATABASE_URL` ke environment

## Langkah 4: Konfigurasi Environment Variables

Di Railway project settings, tambahkan variables berikut:

| Variable | Nilai | Keterangan |
|----------|-------|------------|
| `OWNER_NUMBER` | `628xxxxxxxxxx` | Nomor WhatsApp pemilik bot |
| `TARGET_NUMBER` | `628xxxxxxxxxx` | Nomor target untuk laporan |
| `NODE_ENV` | `production` | Environment mode |

**Note:** Variable berikut otomatis diset oleh Railway:
- `DATABASE_URL` - Connection string PostgreSQL
- `RAILWAY_ENVIRONMENT` - Menandakan environment Railway
- `PORT` - Port untuk web server

## Langkah 5: Deploy

1. Railway akan otomatis build dan deploy setelah push ke GitHub
2. Atau klik "Deploy" manual di dashboard
3. Tunggu build selesai (biasanya 2-5 menit)

## Langkah 6: Login WhatsApp

1. Buka logs di Railway dashboard
2. Cari QR Code yang ditampilkan di logs
3. Scan dengan WhatsApp:
   - Buka WhatsApp di HP
   - Menu ⋮ → Perangkat Tertaut
   - Tautkan Perangkat
   - Scan QR Code

**Alternatif: Gunakan Pairing Code**
1. Buka URL dari Railway (klik domain yang digenerate)
2. Pilih tab "Kode Pairing"
3. Masukkan nomor WhatsApp
4. Masukkan kode 8 digit di WhatsApp

## Struktur Database

Bot akan otomatis membuat tabel-tabel berikut:
- `auth_sessions` - Session WhatsApp
- `groups` - Data grup
- `checkpoint_data` - Data checkpoint
- `live_messages` - Pesan live
- `loop_messages` - Pesan loop
- `message_tracking` - Tracking pesan

## Troubleshooting

### Bot tidak bisa connect ke database
- Pastikan PostgreSQL sudah di-provision
- Cek `DATABASE_URL` sudah tersedia di environment
- Restart deployment

### QR Code tidak muncul
- Cek logs untuk error
- Pastikan tidak ada session lama yang konflik
- Coba restart deployment

### Bot sering disconnect
- Railway free tier memiliki batasan
- Upgrade ke paid plan untuk uptime yang lebih baik
- Bot akan auto-reconnect jika terputus

### Session hilang setelah restart
- Session disimpan di database (bukan file)
- Selama database tidak dihapus, session akan persist
- Jika logout, harus scan QR lagi

## Maintenance

### Melihat Logs
```bash
railway logs
```

### Restart Deployment
- Klik "Restart" di Railway dashboard
- Atau push commit baru ke GitHub

### Clear Session (Reset Login)
Untuk logout dan reset session, kirim perintah logout melalui web interface atau hapus data di tabel `auth_sessions`.

## Biaya

Railway menawarkan:
- **Free Tier**: $5 credit/bulan
- **Hobby**: $5/bulan (unlimited hours)
- **Pro**: Custom pricing

Untuk bot yang selalu online 24/7, disarankan minimal plan Hobby.

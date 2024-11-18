# Ciel Bot - WhatsApp Bot dengan PostgreSQL

## Overview

Ciel Bot adalah WhatsApp bot canggih yang dibangun menggunakan Node.js dan Baileys library. Bot ini menggunakan PostgreSQL sebagai database utama melalui Prisma ORM untuk manajemen data pengguna, grup, dan fitur-fitur bot. Bot mendukung berbagai fitur seperti download media, game, AI chat, sticker creation, dan sistem premium/limit.

Proyek ini merupakan evolusi dari berbagai WhatsApp bot sebelumnya (Hitori Bot, TikTok Downloader Bot) yang digabungkan menjadi satu sistem yang lebih terstruktur dengan database PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

Bahasa komunikasi: **Bahasa Indonesia** (sesuai file.txt dan dokumentasi deployment). Selalu gunakan Bahasa Indonesia dalam interaksi dengan user.

## System Architecture

### Core Technology Stack

- **Runtime**: Node.js v18+ (CommonJS modules)
- **WhatsApp Library**: @whiskeysockets/baileys v6.7.9 untuk multi-device WhatsApp connection
- **Database ORM**: Prisma v5.22.0 dengan PostgreSQL
- **Web Framework**: Express.js untuk health check dan monitoring endpoints
- **AI Integration**: Google Generative AI (Gemini) untuk fitur AI chat
- **Process Manager**: PM2 ecosystem (production) dan Nodemon (development)

### Authentication & Connection

Bot menggunakan Baileys multi-file auth state yang disimpan di folder `sessions/ciel_session/`. Mendukung dua mode koneksi:
- QR Code scanning (default)
- Pairing code untuk deployment tanpa akses visual ke terminal

Connection handler mengelola reconnection otomatis dengan retry policy saat terjadi disconnect.

### Database Architecture

**Database**: PostgreSQL (via Prisma ORM)

Schema utama mencakup:
- **Users**: Menyimpan data pengguna (jid, name, limit, money, premium status, banned status)
- **Groups**: Data grup WhatsApp (jid, name, welcome/leave messages, settings seperti antilink, mute)
- **BotSettings**: Konfigurasi global bot (owner numbers, bot name, packname, author)
- **ActiveGames**: Tracking game yang sedang berlangsung (TicTacToe, dll)
- **Hits**: Statistik penggunaan command
- **Premium**: Tracking user premium dengan expired date
- **Sewa**: Tracking grup sewa dengan expired date

Database management functions di `src/services/database.js` menggunakan pattern `getOrCreate` untuk lazy initialization dan automatic cleanup untuk data expired.

### Message Processing Flow

1. **Connection Layer** (`src/index.js`): Inisialisasi Baileys socket, auth state, event handlers
2. **Serialization** (`src/handlers/serialize.js`): Normalisasi pesan WhatsApp menjadi objek yang mudah digunakan dengan properties seperti `m.sender`, `m.isGroup`, `m.quoted`, dll
3. **Message Handler** (`src/handlers/messageHandler.js`): 
   - Anti-spam checking
   - User/Group creation di database
   - Permission checking (owner, admin, premium)
   - Command parsing dengan multi-prefix support
   - Command routing ke handler yang sesuai
4. **Command Handlers** (`src/handlers/commands/*.js`): Modular command implementation (download, game, group, info, owner, tools, fun)

### Media Processing

Converter utilities (`lib/converter.js`) menggunakan FFmpeg untuk:
- Audio conversion (toAudio, toPTT)
- Video processing
- Image manipulation dengan Sharp library

Sticker creation (`lib/exif.js`) menggunakan node-webpmux untuk menambahkan EXIF metadata (packname, author).

### Group Management

Group handler (`src/handlers/groupHandler.js`) menangani:
- Participant add/remove events
- Welcome/leave messages dengan customizable text
- Auto-kick untuk link detector (antilink)
- Metadata synchronization dengan database

### External Service Integration

- **TikTok Downloader**: Multiple API implementations (tmate.js, tikSnap.js) dengan fallback mechanism
- **Gemini AI**: Google Generative AI untuk conversational features
- **Media Upload**: Telegraph dan Uguu.se untuk temporary file hosting

### Server & Monitoring

Express server (`src/server.js`) menyediakan:
- `/` - Bot info dan statistics
- `/health` - Health check endpoint untuk Railway/deployment platforms
- `/stats` - Performance metrics (uptime, memory, database stats)

Server berjalan di port yang dikonfigurasi (default: 5000) untuk monitoring oleh Railway atau platform deployment lainnya.

### Anti-Spam System

Simple rate-limiting menggunakan Map-based cooldown (`src/utils/antiSpam.js`) dengan auto-cleanup untuk mencegah command flooding.

### Logging & Debugging

Custom logger (`src/utils/logger.js`) menggunakan Chalk untuk colored console output dengan timestamps. Categories: info, success, warn, error, incoming, outgoing, command.

Pino logger digunakan untuk Baileys internal logging (set to silent di production).

### Deployment Support

Mendukung multiple deployment platforms:
- **Railway**: railway.json dengan Nixpacks builder, health check, auto-restart policy
- **Replit**: Standard Node.js deployment dengan Secrets management
- **VPS/Local**: PM2 ecosystem config untuk production management

Database URL dan environment variables dikonfigurasi via `.env` file atau platform environment variables.

## External Dependencies

### Primary Services

- **PostgreSQL Database**: Hosted service (Railway, Supabase, Neon) untuk persistent storage
  - Connection URL via `DATABASE_URL` environment variable
  - Prisma manages migrations dan schema

### Third-Party APIs

- **Google Gemini API**: AI conversation features
  - API key via `GEMINI_API_KEY` environment variable
- **TikTok/Douyin Downloaders**: Multiple scraper implementations tanpa official API
  - Tmate (tmate.cc)
  - SavetikAPI (savetik.co)
- **Telegraph**: Media hosting untuk temporary images
- **Uguu.se**: Alternative file hosting

### System Dependencies

- **FFmpeg**: Required untuk audio/video conversion
- **ImageMagick**: Optional untuk advanced image processing (commented out di source-1)
- **Node-webpmux**: WebP manipulation untuk stickers

### NPM Packages (Key Dependencies)

- `@whiskeysockets/baileys`: WhatsApp Web API
- `@prisma/client`: Database ORM client
- `@google/generative-ai`: Gemini AI integration
- `express`: Web server
- `axios`: HTTP client
- `cheerio`: HTML parsing untuk scrapers
- `sharp`: Image processing
- `fluent-ffmpeg`: FFmpeg wrapper
- `moment-timezone`: Timezone handling (Asia/Jakarta)
- `qrcode-terminal`: QR code display
- `node-cache`: In-memory caching
- `node-cron`: Scheduled tasks
- `pino` & `pino-pretty`: Structured logging
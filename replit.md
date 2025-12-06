# Naze Bot - WhatsApp Bot

## Overview

Naze Bot is a full-featured WhatsApp bot built with Node.js using the Baileys library (@whiskeysockets/baileys) for WhatsApp Web API integration. The bot provides extensive functionality including AI interactions, games, media downloads, group management, and administrative tools. It's designed for multi-platform deployment with support for Railway, Replit, Pterodactyl, VPS, and Termux environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture

**Multi-Platform Bot Framework**
- Built on Node.js (v18+) using CommonJS module system
- Uses @whiskeysockets/baileys v6.7+ for WhatsApp Multi-Device API
- Implements dual connection modes: QR Code scanning and Pairing Code authentication
- Multi-session support (JadiBot) allowing users to run their own bot instances
- Event-driven message handling with support for text, media, stickers, and interactive messages

**Database Layer**
- PostgreSQL as the primary database
- Prisma ORM (v5.22+) for type-safe database operations
- Database models include: Users, Groups, BotSettings, Contacts, GroupMetadata, Hits, Premium, and Sewa (rental)
- File-based authentication state storage via useMultiFileAuthState
- In-memory caching with NodeCache for performance optimization

**Process Management**
- Start script (start.js) with auto-restart on failure
- Process monitoring with IPC communication for uptime tracking
- Nodemon for development with auto-reload
- Graceful error handling with uncaughtException and unhandledRejection listeners

**Message Processing Pipeline**
1. Connection layer (index.js) receives WhatsApp events
2. Message handler (naze.js) processes commands and features
3. Database layer persists user data, group settings, and analytics
4. Response generation with support for buttons, lists, and media
5. Anti-spam protection with 5-second cooldown per user

### Feature Modules

**Command System**
- Dynamic command loading from feature directories
- Support for multiple prefixes (+, !, ., #, /)
- Did-you-mean suggestions for typos using didyoumean library
- Hit counter tracking for command analytics
- Premium/VIP user tier system with enhanced limits

**Media Processing**
- FFmpeg integration for audio/video conversion
- WebP sticker creation from images, videos, and GIFs
- Image manipulation with Jimp
- File uploads via TelegraPh and Uguu.se
- YouTube video/audio downloads via ytdl-core
- TikTok, Instagram, and other social media downloaders

**Gaming Features**
- Tic-tac-toe implementation
- Math quiz with difficulty levels (noob to impossible2)
- Virtual slot machine with economy integration
- Chess.js integration for chess games
- Akinator API integration
- Word puzzle games (susunkata)

**AI Integration**
- Google Generative AI (Gemini) via @google/generative-ai
- Google Translate API integration
- YouSearch AI for web searches
- Text-to-speech using node-gtts
- Image generation and analysis capabilities

**Group Management**
- Admin-only command restrictions
- Welcome/leave message automation
- Group settings (antilink, antispam, setinfo)
- Participant event tracking (add, remove, promote, demote)
- Group metadata caching for performance

### Web Server

**Express.js HTTP Server**
- Health check endpoint at /health
- Status endpoint at / returning bot info and uptime
- Process control endpoint at /process for IPC commands
- Runs on configurable PORT (default: 5000)
- Used for deployment platform health checks (Railway, Replit)

### External Dependencies

**WhatsApp Integration**
- @whiskeysockets/baileys v6.7.16 - WhatsApp Web API client
- @hapi/boom - HTTP error handling for Baileys
- qrcode-terminal - QR code display for authentication
- awesome-phonenumber - Phone number parsing and validation

**Database & ORM**
- @prisma/client v5.22.0 - Database client
- prisma v5.22.0 - Database toolkit and migration system
- PostgreSQL - Primary database (configured via DATABASE_URL environment variable)

**Media Processing**
- fluent-ffmpeg - Audio/video manipulation
- jimp - Image processing
- node-webpmux - WebP sticker metadata
- file-type v16.5.4 - File type detection
- pdfkit - PDF generation

**AI & External APIs**
- @google/generative-ai v0.24.0 - Google Gemini AI
- @vitalets/google-translate-api v9.2.0 - Translation
- @aqul/akinator-api (as aki-api) - Akinator game
- @ibaraki-douji/pixivts - Pixiv artwork downloads
- ytdl-core - YouTube downloads
- yt-search - YouTube search
- cheerio - Web scraping
- googlethis - Google search

**Utilities**
- axios v1.7.7 - HTTP client
- moment-timezone - Date/time handling with timezone support
- chalk v4.1.2 - Terminal styling
- node-cron - Task scheduling
- dotenv v16.4.5 - Environment configuration
- ms - Time string parsing
- crypto-js - Encryption utilities

**Development Tools**
- nodemon v3.1.7 - Auto-reload during development
- pino v9.4.0 - Logging

**Platform Detection**
- Automatic platform detection (Railway, Replit, Pterodactyl, Codespace, Termux, VPS)
- Platform-specific configuration and optimizations
- Railway/Replit configuration files for seamless deployment
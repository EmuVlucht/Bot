require('dotenv').config();

const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const readline = require('readline');
const NodeCache = require('node-cache');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const { parsePhoneNumber } = require('awesome-phonenumber');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');

const settings = require('../config/settings');
const { logger } = require('./utils/logger');
const { runtime, getGreeting, getTime } = require('./utils/functions');
const { connectDatabase, getOrCreateBotSettings, checkExpiredSewa, cleanupExpiredData, resetDailyLimits } = require('./services/database');
const { Serialize, setupExtensions } = require('./handlers/serialize');
const { handleMessage } = require('./handlers/messageHandler');
const { handleGroupParticipantsUpdate, handleGroupUpdate } = require('./handlers/groupHandler');
const { startServer } = require('./server');

const msgRetryCounterCache = new NodeCache();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let pairingStarted = false;

const printSystemInfo = () => {
    logger.banner();
    logger.systemInfo({
        os: `${os.platform()} ${os.release()} ${os.arch()}`,
        platform: os.type(),
        nodeVersion: process.version,
        memory: `${(os.freemem() / 1024 / 1024).toFixed(0)} MB / ${(os.totalmem() / 1024 / 1024).toFixed(0)} MB`,
        cpu: os.cpus()[0]?.model?.trim() || 'Unknown',
        date: getTime('dddd, DD MMMM YYYY HH:mm:ss')
    });
};

async function startCielBot() {
    printSystemInfo();
    
    const dbConnected = await connectDatabase();
    if (!dbConnected) {
        logger.error('Gagal terhubung ke database. Bot tidak dapat dijalankan.');
        process.exit(1);
    }
    
    startServer(null);
    
    const sessionFolder = path.join(process.cwd(), 'sessions', settings.session.folderName);
    await fs.ensureDir(sessionFolder);
    
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    logger.info(`Menggunakan Baileys versi ${version.join('.')} (Latest: ${isLatest})`);
    
    const pinoLogger = pino({ level: 'silent' });
    
    const getMessage = async (key) => {
        return { conversation: 'Halo, saya Ciel Bot!' };
    };
    
    const conn = makeWASocket({
        version,
        logger: pinoLogger,
        getMessage,
        syncFullHistory: true,
        maxMsgRetryCount: 15,
        msgRetryCounterCache,
        retryRequestDelayMs: 10,
        defaultQueryTimeoutMs: 0,
        connectTimeoutMs: 60000,
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        shouldSyncHistoryMessage: (msg) => {
            logger.info(`Memuat Chat [${msg.progress || 0}%]`);
            return !!msg.syncType;
        },
        transactionOpts: {
            maxCommitRetries: 10,
            delayBetweenTriesMs: 10
        },
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pinoLogger)
        }
    });
    
    global.store = {
        contacts: {},
        presences: {},
        messages: {},
        groupMetadata: {}
    };
    
    if (settings.pairing.enabled && !conn.authState.creds.registered) {
        let phoneNumber = settings.pairing.phoneNumber || process.env.BOT_NUMBER;
        
        if (!phoneNumber) {
            phoneNumber = await question('Masukkan nomor WhatsApp Bot (contoh: 62812xxx): ');
        }
        
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        const parsedNumber = parsePhoneNumber('+' + phoneNumber);
        if (!parsedNumber.valid || phoneNumber.length < 10) {
            logger.error('Nomor tidak valid! Mulai dengan kode negara (contoh: 62xxx)');
            process.exit(1);
        }
        
        logger.info('Nomor berhasil diverifikasi. Menunggu koneksi...');
        
        setTimeout(async () => {
            if (!pairingStarted && !conn.authState.creds.registered) {
                pairingStarted = true;
                logger.info('Meminta Pairing Code...');
                try {
                    const code = await conn.requestPairingCode(phoneNumber);
                    logger.success(`Pairing Code: ${code}`);
                    logger.info('Masukkan kode ini di WhatsApp > Linked Devices > Link with phone number');
                } catch (e) {
                    logger.error(`Gagal mendapatkan Pairing Code: ${e.message}`);
                }
            }
        }, 3000);
    }
    
    setupExtensions(conn, global.store);
    
    startServer(conn);
    
    conn.ev.on('creds.update', saveCreds);
    
    conn.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
        
        if (!conn.authState.creds.registered) {
            logger.info(`Connection: ${connection || 'waiting'}`);
        }
        
        if (qr && !settings.pairing.enabled) {
            qrcode.generate(qr, { small: true });
            logger.info('Scan QR Code diatas dengan WhatsApp');
        }
        
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            
            const reconnectReasons = [
                DisconnectReason.connectionLost,
                DisconnectReason.connectionClosed,
                DisconnectReason.restartRequired,
                DisconnectReason.timedOut,
                DisconnectReason.badSession
            ];
            
            if (reconnectReasons.includes(reason)) {
                logger.warn(`Koneksi terputus (${DisconnectReason[reason] || reason}). Menghubungkan ulang...`);
                startCielBot();
            } else if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.forbidden) {
                if (!conn.authState.creds.registered && pairingStarted) {
                    logger.warn('Menunggu pairing code dimasukkan. Menghubungkan ulang dalam 5 detik...');
                    setTimeout(() => startCielBot(), 5000);
                } else {
                    logger.error('Session tidak valid. Hapus folder session dan scan ulang.');
                    await fs.remove(sessionFolder);
                    process.exit(1);
                }
            } else if (reason === DisconnectReason.connectionReplaced) {
                logger.error('Koneksi digantikan oleh session lain.');
                process.exit(0);
            } else {
                logger.warn(`Disconnect (${reason}). Menghubungkan ulang...`);
                startCielBot();
            }
        }
        
        if (connection === 'open') {
            const botJid = jidNormalizedUser(conn.user.id);
            logger.success(`Terhubung sebagai: ${conn.user.name || botJid}`);
            
            await getOrCreateBotSettings(botJid);
            
            conn.public = settings.features.public;
            
            if (!global.store.groupMetadata || Object.keys(global.store.groupMetadata).length === 0) {
                try {
                    global.store.groupMetadata = await conn.groupFetchAllParticipating();
                    logger.info(`Loaded ${Object.keys(global.store.groupMetadata).length} groups`);
                } catch (e) {
                    logger.warn('Gagal memuat group metadata');
                }
            }
        }
        
        if (isNewLogin) {
            logger.success('Login baru terdeteksi!');
        }
        
        if (receivedPendingNotifications === 'true') {
            logger.info('Memproses notifikasi pending...');
        }
    });
    
    conn.ev.on('messages.upsert', async (message) => {
        try {
            await handleMessage(conn, message, global.store);
        } catch (e) {
            logger.error(`Error handling message: ${e.message}`);
        }
    });
    
    conn.ev.on('group-participants.update', async (update) => {
        try {
            await handleGroupParticipantsUpdate(conn, update, global.store);
        } catch (e) {
            logger.error(`Error handling group update: ${e.message}`);
        }
    });
    
    conn.ev.on('groups.update', (updates) => {
        try {
            handleGroupUpdate(updates, global.store);
        } catch (e) {
            logger.error(`Error handling group metadata update: ${e.message}`);
        }
    });
    
    conn.ev.on('contacts.update', (updates) => {
        for (const contact of updates) {
            if (!contact.id) continue;
            const jid = jidNormalizedUser(contact.id);
            global.store.contacts[jid] = {
                ...global.store.contacts[jid],
                id: jid,
                name: contact.notify
            };
        }
    });
    
    conn.ev.on('presence.update', ({ id, presences }) => {
        global.store.presences[id] = global.store.presences[id] || {};
        Object.assign(global.store.presences[id], presences);
    });
    
    conn.ev.on('call', async (calls) => {
        const botSettings = await getOrCreateBotSettings(jidNormalizedUser(conn.user.id));
        if (botSettings?.antiCall) {
            for (const call of calls) {
                if (call.status === 'offer') {
                    const callType = call.isVideo ? 'Video' : 'Voice';
                    await conn.rejectCall(call.id, call.from);
                    await conn.sendMessage(call.from, {
                        text: `*Anti-Call Aktif*\n\nMaaf, bot tidak dapat menerima panggilan ${callType}.`
                    });
                    logger.info(`Rejected ${callType} call from ${call.from}`);
                }
            }
        }
    });
    
    const cron = require('node-cron');
    
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running daily reset...');
        await resetDailyLimits();
    }, { timezone: settings.timezone });
    
    cron.schedule('*/5 * * * *', async () => {
        await checkExpiredSewa(conn);
    });
    
    cron.schedule('0 * * * *', async () => {
        await cleanupExpiredData();
    });
    
    setInterval(async () => {
        if (conn?.user?.id) {
            await conn.sendPresenceUpdate('available', jidNormalizedUser(conn.user.id)).catch(() => {});
        }
    }, 10 * 60 * 1000);
    
    return conn;
}

startCielBot().catch((err) => {
    logger.error(`Startup error: ${err.message}`);
    process.exit(1);
});

const cleanup = async (signal) => {
    logger.info(`Received ${signal}. Menyimpan data...`);
    const { disconnectDatabase } = require('./services/database');
    await disconnectDatabase();
    process.exit(0);
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    console.error(err);
});
process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    console.error(err);
});

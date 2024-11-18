require('./settings');
const fs = require('fs');
const os = require('os');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const NodeCache = require('node-cache');
const { toBuffer, toDataURL } = require('qrcode');
const { exec, spawn, execSync } = require('child_process');
const { parsePhoneNumber } = require('awesome-phonenumber');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    Browsers, 
    DisconnectReason, 
    makeCacheableSignalKeyStore, 
    fetchLatestBaileysVersion, 
    proto, 
    jidNormalizedUser, 
    getAggregateVotesInPollMessage 
} = require('@whiskeysockets/baileys');

const { 
    prisma, 
    loadDatabase, 
    loadStore, 
    UserDB, 
    GroupDB, 
    BotSettingsDB, 
    ContactDB, 
    GroupMetadataDB,
    HitDB,
    PremiumDB,
    SewaDB
} = require('./src/database');
const { app, server, PORT } = require('./src/server');
const { GroupParticipantsUpdate, MessagesUpsert, Solving } = require('./src/message');
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, assertInstalled, sleep } = require('./lib/function');

const print = (label, value) => console.log(`${chalk.green.bold('║')} ${chalk.cyan.bold(label.padEnd(16))}${chalk.yellow.bold(':')} ${value}`);
const pairingCode = process.argv.includes('--qr') ? false : process.argv.includes('--pairing-code') || global.pairing_code;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
let pairingStarted = false;
let phoneNumber;

const userInfoSyt = () => {
    try {
        return os.userInfo().username;
    } catch (e) {
        return process.env.USER || process.env.USERNAME || 'unknown';
    }
};

global.fetchApi = async (path = '/', query = {}, options) => {
    const urlnya = (options?.name || options ? ((options?.name || options) in global.APIs ? global.APIs[(options?.name || options)] : (options?.name || options)) : global.APIs['hitori'] ? global.APIs['hitori'] : (options?.name || options)) + path + (query ? '?' + decodeURIComponent(new URLSearchParams(Object.entries({ ...query }))) : '');
    const { data } = await axios.get(urlnya, { ...((options?.name || options) ? {} : { headers: { 'accept': 'application/json', 'x-api-key': global.APIKeys[global.APIs['hitori']] } }) });
    return data;
};

const msgRetryCounterCache = new NodeCache();

const checkDependencies = () => {
    try {
        if (process.platform !== 'win32') {
            execSync('command -v ffmpeg', { stdio: 'ignore' });
        } else {
            execSync('where ffmpeg', { stdio: 'ignore' });
        }
        console.log(chalk.greenBright('✅  FFmpeg is installed'));
    } catch (e) {
        console.log(chalk.yellowBright('⚠️  FFmpeg not found. Some features may not work.'));
    }
};

checkDependencies();

console.log(chalk.green.bold(`╔═════[${`${chalk.cyan(userInfoSyt())}@${chalk.cyan(os.hostname())}`}]═════`));
print('Platform', global.platform);
print('OS', `${os.platform()} ${os.release()} ${os.arch()}`);
print('Uptime', `${Math.floor(os.uptime() / 3600)} h ${Math.floor((os.uptime() % 3600) / 60)} m`);
print('Shell', process.env.SHELL || process.env.COMSPEC || 'unknown');
print('CPU', os.cpus()[0]?.model.trim() || 'unknown');
print('Memory', `${(os.freemem() / 1024 / 1024).toFixed(0)} MiB / ${(os.totalmem() / 1024 / 1024).toFixed(0)} MiB`);
print('Script version', `v${require('./package.json').version}`);
print('Node.js', process.version);
print('Baileys', `v${require('./package.json').dependencies['@whiskeysockets/baileys']}`);
print('Database', 'PostgreSQL (Prisma)');
print('Date & Time', new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false }));
console.log(chalk.green.bold('╚' + ('═'.repeat(30))));

server.listen(PORT, () => {
    console.log('App listened on port', PORT);
});

async function startNazeBot() {
    const { state, saveCreds } = await useMultiFileAuthState('nazedev');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const level = pino({ level: 'silent' });

    let botNumber;
    
    try {
        const storeLoadData = await loadStore();
        global.store = storeLoadData;
        
        console.log('✅ Store loaded from PostgreSQL');
    } catch (e) {
        console.error('❌ Failed to load store:', e.message);
        global.store = {
            contacts: {},
            presences: {},
            messages: {},
            groupMetadata: {},
        };
    }

    const store = global.store;

    store.loadMessage = function (remoteJid, id) {
        const messages = store.messages?.[remoteJid]?.array;
        if (!messages) return null;
        return messages.find(msg => msg?.key?.id === id) || null;
    };

    const getMessage = async (key) => {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id);
            return msg?.message || '';
        }
        return {
            conversation: 'Halo Saya Naze Bot'
        };
    };

    const naze = makeWASocket({
        logger: level,
        getMessage,
        syncFullHistory: true,
        maxMsgRetryCount: 15,
        msgRetryCounterCache,
        retryRequestDelayMs: 10,
        defaultQueryTimeoutMs: 0,
        connectTimeoutMs: 60000,
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        shouldSyncHistoryMessage: msg => {
            console.log(`\x1b[32mMemuat Chat [${msg.progress || 0}%]\x1b[39m`);
            return !!msg.syncType;
        },
        transactionOpts: {
            maxCommitRetries: 10,
            delayBetweenTriesMs: 10,
        },
        appStateMacVerification: {
            patch: true,
            snapshot: true,
        },
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, level),
        },
    });

    if (pairingCode && !phoneNumber && !naze.authState.creds.registered) {
        async function getPhoneNumber() {
            phoneNumber = global.number_bot ? global.number_bot : process.env.BOT_NUMBER || await question('Please type your WhatsApp number : ');
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

            if (!parsePhoneNumber('+' + phoneNumber).valid && phoneNumber.length < 6) {
                console.log(chalk.bgBlack(chalk.redBright('Start with your Country WhatsApp code') + chalk.whiteBright(',') + chalk.greenBright(' Example : 62xxx')));
                await getPhoneNumber();
            }
        }
        (async () => {
            await getPhoneNumber();
            await exec('rm -rf ./nazedev/*');
            console.log('Phone number captured. Waiting for Connection...\n' + chalk.blueBright('Estimated time: around 2 ~ 5 minutes'));
        })();
    }

    await Solving(naze, store);

    naze.ev.on('creds.update', saveCreds);

    naze.ev.on('connection.update', async (update) => {
        const { qr, connection, lastDisconnect, isNewLogin, receivedPendingNotifications } = update;
        if (!naze.authState.creds.registered) console.log('Connection: ', connection || false);
        
        if ((connection === 'connecting' || !!qr) && pairingCode && phoneNumber && !naze.authState.creds.registered && !pairingStarted) {
            setTimeout(async () => {
                pairingStarted = true;
                console.log('Requesting Pairing Code...');
                let code = await naze.requestPairingCode(phoneNumber);
                console.log(chalk.blue('Your Pairing Code :'), chalk.green(code), '\n', chalk.yellow('Expires in 15 second'));
            }, 3000);
        }
        
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.connectionLost) {
                console.log('Connection to Server Lost, Attempting to Reconnect...');
                startNazeBot();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log('Connection closed, Attempting to Reconnect...');
                startNazeBot();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log('Restart Required...');
                startNazeBot();
            } else if (reason === DisconnectReason.timedOut) {
                console.log('Connection Timed Out, Attempting to Reconnect...');
                startNazeBot();
            } else if (reason === DisconnectReason.badSession) {
                console.log('Delete Session and Scan again...');
                startNazeBot();
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log('Close current Session first...');
            } else if (reason === DisconnectReason.loggedOut) {
                console.log('Scan again and Run...');
                exec('rm -rf ./nazedev/*');
                process.exit(1);
            } else if (reason === DisconnectReason.forbidden) {
                console.log('Connection Failure, Scan again and Run...');
                exec('rm -rf ./nazedev/*');
                process.exit(1);
            } else if (reason === DisconnectReason.multideviceMismatch) {
                console.log('Scan again...');
                exec('rm -rf ./nazedev/*');
                process.exit(0);
            } else {
                naze.end(`Unknown DisconnectReason : ${reason}|${connection}`);
            }
        }
        
        if (connection == 'open') {
            botNumber = await naze.decodeJid(naze.user.id);
            console.log('Connected to : ' + JSON.stringify(naze.user, null, 2));
            
            try {
                const loadData = await loadDatabase(botNumber);
                global.db = loadData;
                console.log('✅ Database loaded from PostgreSQL');
                
                const settings = global.db?.set?.[botNumber];
                if (settings && !settings.join) {
                    if (global.my.ch && global.my.ch.includes('@newsletter')) {
                        try {
                            await naze.newsletterMsg(global.my.ch, { type: 'follow' });
                            await BotSettingsDB.update(botNumber, { join: true });
                        } catch (e) {}
                    }
                }

                setInterval(async () => {
                    try {
                        for (const [jid, contact] of Object.entries(store.contacts)) {
                            await ContactDB.set(jid, contact.name, contact.lid);
                        }
                        for (const [jid, metadata] of Object.entries(store.groupMetadata)) {
                            await GroupMetadataDB.set(jid, metadata);
                        }
                    } catch (e) {
                        console.error('Error saving store:', e.message);
                    }
                }, 60 * 1000);

            } catch (e) {
                console.error('❌ Failed to load database:', e.message);
                global.db = {
                    hit: {},
                    set: {},
                    cmd: {},
                    store: {},
                    users: {},
                    game: {},
                    groups: {},
                    database: {},
                    premium: [],
                    sewa: [],
                };
            }
        }
        
        if (qr) {
            if (!pairingCode) qrcode.generate(qr, { small: true });
            app.use('/qr', async (req, res) => {
                res.setHeader('content-type', 'image/png');
                res.end(await toBuffer(qr));
            });
        }
        
        if (isNewLogin) console.log(chalk.green('New device login detected...'));
        if (receivedPendingNotifications == 'true') {
            console.log('Please wait About 1 Minute...');
            naze.ev.flush();
        }
    });

    naze.ev.on('contacts.update', (update) => {
        for (let contact of update) {
            let trueJid;
            if (!trueJid) continue;
            if (contact.id.endsWith('@lid')) {
                trueJid = naze.findJidByLid(contact.id, store);
            } else {
                trueJid = jidNormalizedUser(contact.id);
            }
            store.contacts[trueJid] = {
                ...store.contacts[trueJid],
                id: trueJid,
                name: contact.notify
            };
            if (contact.id.endsWith('@lid')) {
                store.contacts[trueJid].lid = jidNormalizedUser(contact.id);
            }
        }
    });

    naze.ev.on('call', async (call) => {
        let botNum = await naze.decodeJid(naze.user.id);
        if (global.db?.set?.[botNum]?.anticall) {
            for (let id of call) {
                if (id.status === 'offer') {
                    let msg = await naze.sendMessage(id.from, { 
                        text: `Saat Ini, Kami Tidak Dapat Menerima Panggilan ${id.isVideo ? 'Video' : 'Suara'}.\nJika @${id.from.split('@')[0]} Memerlukan Bantuan, Silakan Hubungi Owner :)`, 
                        mentions: [id.from] 
                    });
                    await naze.sendContact(id.from, global.owner, msg);
                    await naze.rejectCall(id.id, id.from);
                }
            }
        }
    });

    naze.ev.on('messages.upsert', async (message) => {
        await MessagesUpsert(naze, message, store);
    });

    naze.ev.on('group-participants.update', async (update) => {
        await GroupParticipantsUpdate(naze, update, store);
    });

    naze.ev.on('groups.update', (update) => {
        for (const n of update) {
            if (store.groupMetadata[n.id]) {
                Object.assign(store.groupMetadata[n.id], n);
            } else store.groupMetadata[n.id] = n;
        }
    });

    naze.ev.on('presence.update', ({ id, presences: update }) => {
        store.presences[id] = store.presences?.[id] || {};
        Object.assign(store.presences[id], update);
    });

    setInterval(async () => {
        if (naze?.user?.id) {
            await naze.sendPresenceUpdate('available', naze.decodeJid(naze.user.id)).catch(e => {});
        }
    }, 10 * 60 * 1000);

    return naze;
}

startNazeBot();

const cleanup = async (signal) => {
    console.log(`Received ${signal}. Menyimpan database...`);
    try {
        for (const [jid, contact] of Object.entries(global.store?.contacts || {})) {
            await ContactDB.set(jid, contact.name, contact.lid).catch(() => {});
        }
        for (const [jid, metadata] of Object.entries(global.store?.groupMetadata || {})) {
            await GroupMetadataDB.set(jid, metadata).catch(() => {});
        }
        await prisma.$disconnect();
    } catch (e) {
        console.error('Error during cleanup:', e.message);
    }
    server.close(() => {
        console.log('Server closed. Exiting...');
        process.exit(0);
    });
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('exit', () => cleanup('exit'));

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`Address localhost:${PORT} in use. Please retry when the port is available!`);
        server.close();
    } else console.error('Server error:', error);
});

setInterval(() => {}, 1000 * 60 * 10);

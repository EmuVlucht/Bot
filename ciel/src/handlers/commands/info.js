const os = require('os');
const settings = require('../../../config/settings');
const { runtime, getGreeting, getTime, formatMoney } = require('../../utils/functions');
const { getHitStats, isPremium, listPremium, listSewa } = require('../../services/database');
const pkg = require('../../../package.json');

const menu = async (conn, m, ctx) => {
    const { prefix, user, isOwner } = ctx;
    const greeting = getGreeting();
    const userType = isOwner ? 'Owner' : user.vip ? 'VIP' : await isPremium(m.sender) ? 'Premium' : 'Free';
    
    const menuText = `
${greeting}, ${m.pushName}!

╭━━━━━[ *CIEL BOT* ]━━━━━
│ 👤 User: ${m.pushName}
│ 🏷️ Status: ${userType}
│ 💰 Money: ${formatMoney(user.money)}
│ 📊 Limit: ${user.limit}
│ ⏰ Waktu: ${getTime('HH:mm:ss')}
╰━━━━━━━━━━━━━━━━━━

╭━━━[ *INFO* ]━━━
│ .ping - Cek bot
│ .speed - Tes kecepatan
│ .runtime - Waktu aktif
│ .owner - Info owner
│ .info - Info bot
╰━━━━━━━━━━━━━━━

╭━━━[ *TOOLS* ]━━━
│ .sticker - Buat sticker
│ .toimg - Sticker ke gambar
│ .tomp3 - Video ke audio
│ .translate - Terjemahkan
╰━━━━━━━━━━━━━━━

╭━━━[ *DOWNLOAD* ]━━━
│ .tiktok - Download TikTok
│ .instagram - Download IG
│ .youtube - Download YT
│ .spotify - Download Spotify
│ .pinterest - Cari gambar
│ .douyin - Download Douyin
│ .pixiv - Download Pixiv
╰━━━━━━━━━━━━━━━

╭━━━[ *GAME* ]━━━
│ .tictactoe - Main TTT
│ .slot - Mesin slot
│ .casino - Casino solo
│ .samgong - Kartu samgong
│ .begal - Game begal
│ .merampok - Rampok user
│ .daily - Claim harian
│ .weekly - Claim mingguan
│ .transfer - Kirim uang
│ .buylimit - Beli limit
│ .leaderboard - Top player
╰━━━━━━━━━━━━━━━

╭━━━[ *GROUP* ]━━━
│ .kick - Kick member
│ .add - Tambah member
│ .promote - Jadikan admin
│ .demote - Hapus admin
│ .welcome - Toggle welcome
│ .antilink - Toggle antilink
╰━━━━━━━━━━━━━━━

╭━━━[ *OWNER* ]━━━
│ .addprem - Tambah premium
│ .delprem - Hapus premium
│ .addsewa - Tambah sewa
│ .ban - Ban user
│ .broadcast - Broadcast
╰━━━━━━━━━━━━━━━

> *${settings.botInfo.name} v${pkg.version}*
    `.trim();
    
    await m.reply(menuText);
};

const ping = async (conn, m) => {
    const start = Date.now();
    await m.reply('Pinging...');
    const end = Date.now();
    await m.reply(`🏓 *Pong!*\n⏱️ Response: ${end - start}ms`);
};

const speed = async (conn, m) => {
    const start = Date.now();
    await m.reply('Testing speed...');
    const end = Date.now();
    
    const usedMem = process.memoryUsage();
    const speedText = `
*⚡ Speed Test*

📶 Response: ${end - start}ms
💾 RAM Usage: ${(usedMem.heapUsed / 1024 / 1024).toFixed(2)} MB
📦 Total RAM: ${(usedMem.heapTotal / 1024 / 1024).toFixed(2)} MB
⏰ Uptime: ${runtime(process.uptime())}
    `.trim();
    
    await m.reply(speedText);
};

const runtimeCmd = async (conn, m) => {
    await m.reply(`⏰ *Runtime*: ${runtime(process.uptime())}`);
};

const owner = async (conn, m) => {
    const ownerNumbers = settings.owner;
    await conn.sendContact(m.chat, ownerNumbers, m.key);
    await m.reply('Diatas adalah kontak owner bot.');
};

const info = async (conn, m) => {
    const stats = await getHitStats();
    
    const infoText = `
*📊 Bot Information*

🤖 Nama: ${settings.botInfo.name}
📌 Versi: ${pkg.version}
👨‍💻 Author: ${settings.botInfo.author}

💻 *System*
├ Platform: ${os.platform()}
├ Arch: ${os.arch()}
├ Node: ${process.version}
├ Memory: ${(os.freemem() / 1024 / 1024).toFixed(0)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(0)}MB
└ Uptime: ${runtime(process.uptime())}

📈 *Stats*
├ Total CMD: ${stats.total?.totalCmd || 0}
└ Today CMD: ${stats.total?.todayCmd || 0}
    `.trim();
    
    await m.reply(infoText);
};

const profile = async (conn, m, ctx) => {
    const { user, isOwner } = ctx;
    const userType = isOwner ? 'Owner' : user.vip ? 'VIP' : await isPremium(m.sender) ? 'Premium' : 'Free';
    
    const profileText = `
*👤 Profile*

📛 Nama: ${m.pushName}
🔢 Nomor: ${m.sender.split('@')[0]}
🏷️ Status: ${userType}
💰 Money: ${formatMoney(user.money)}
📊 Limit: ${user.limit}
📅 Terdaftar: ${user.createdAt ? getTime('DD/MM/YYYY', user.createdAt) : '-'}
    `.trim();
    
    await m.reply(profileText);
};

const listpremium = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const premiums = await listPremium();
    
    if (premiums.length === 0) {
        return m.reply('Tidak ada user premium.');
    }
    
    let text = '*📋 Daftar Premium*\n\n';
    for (const prem of premiums) {
        text += `• ${prem.userJid.split('@')[0]}\n`;
        text += `  Expired: ${getTime('DD/MM/YYYY HH:mm', prem.expiredAt)}\n\n`;
    }
    
    await m.reply(text.trim());
};

const listsewa = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const sewas = await listSewa();
    
    if (sewas.length === 0) {
        return m.reply('Tidak ada grup sewa.');
    }
    
    let text = '*📋 Daftar Sewa*\n\n';
    for (const sewa of sewas) {
        text += `• ${sewa.groupJid}\n`;
        text += `  Expired: ${getTime('DD/MM/YYYY HH:mm', sewa.expiredAt)}\n\n`;
    }
    
    await m.reply(text.trim());
};

module.exports = {
    menu,
    help: menu,
    ping,
    speed,
    runtime: runtimeCmd,
    owner,
    info,
    botinfo: info,
    profile,
    me: profile,
    listpremium,
    listprem: listpremium,
    listsewa
};

const { botInfo } = require('../../config');
const performanceMonitor = require('../utils/performanceMonitor');
const { logger } = require('../utils/logger');
const moment = require('moment-timezone');

function getCurrentTime() {
    moment.locale('id');
    return {
        tanggal: moment().tz('Asia/Jakarta').format('DD MMMM YYYY'),
        hari: moment().tz('Asia/Jakarta').format('dddd'),
        jam: moment().tz('Asia/Jakarta').format('HH:mm:ss')
    };
}

async function handleBotInfo(conn, m) {
    try {
        const { tanggal, hari, jam } = getCurrentTime();
        const perf = performanceMonitor.getPerformanceData();
        const { name: botname, owner, public: isPublic, version } = botInfo;
        
        const infoMessage = `
╭─┴─❍「 *BOT INFO* 」❍
├ *Nama Bot* : ${botname}
├ *Version* : ${version}
├ *Powered* : @${'0@s.whatsapp.net'.split('@')[0]}
├ *Owner* : @${owner[0].split('@')[0]}
├ *Mode* : ${isPublic ? 'Public' : 'Self'}
├ *Prefix* : Multi-Prefix
╰─┬────❍
╭─┴─❍「 *ABOUT* 」❍
├ *Tanggal* : ${tanggal}
├ *Hari* : ${hari}
├ *Jam* : ${jam} WIB
╰─┬────❍
╭─┴─❍「 *PERFORMANCE* 」❍
├ *Uptime* : ${perf.uptime}
├ *RAM Usage* : ${perf.ram} MB
├ *Node.js* : ${perf.nodeVersion}
├ *Speed* : ${perf.speedTest.toFixed(2)} ms
╰──────❍
        `.trim();

        await conn.sendMessage(m.key.remoteJid, {
            text: infoMessage,
            mentions: [owner[0], '0@s.whatsapp.net']
        }, { quoted: m });

        logger.success(`✅ Sent bot info`);
    } catch (err) {
        logger.error(`❌ Failed to send bot info: ${err.message}`);
    }
}

async function handlePing(conn, m) {
    try {
        const start = Date.now();
        const pingMessage = await conn.sendMessage(m.key.remoteJid, { text: 'Testing ping...' }, { quoted: m });
        const latency = Date.now() - start;
        
        await conn.sendMessage(m.key.remoteJid, {
            text: `🏓 Pong!\n⚡ Latency: ${latency}ms`
        }, { quoted: m });
        
        await conn.deleteMessage(m.key.remoteJid, pingMessage.key);
        logger.success(`✅ Ping response: ${latency}ms`);
    } catch (err) {
        logger.error(`❌ Ping failed: ${err.message}`);
    }
}

module.exports = {
    handleBotInfo,
    handlePing
};
const settings = require('../../../config/settings');
const { 
    addPremium, 
    removePremium, 
    updateUser, 
    updateBotSettings,
    addSewa,
    removeSewa,
    getUser
} = require('../../services/database');
const { isUrl } = require('../../utils/functions');

const addprem = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) {
        return m.reply(`Penggunaan: ${ctx.prefix}addprem @user|hari\nContoh: ${ctx.prefix}addprem @628xxx|30`);
    }
    
    const [target, days] = text.split('|').map(x => x.trim());
    if (!target || !days) {
        return m.reply('Format: @user|hari');
    }
    
    const userJid = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const daysNum = parseInt(days.replace(/[^0-9]/g, ''));
    
    if (isNaN(daysNum) || daysNum <= 0) {
        return m.reply('Jumlah hari tidak valid!');
    }
    
    const [onWa] = await conn.onWhatsApp(userJid);
    if (!onWa?.exists) {
        return m.reply('Nomor tidak terdaftar di WhatsApp!');
    }
    
    const success = await addPremium(userJid, daysNum);
    if (success) {
        await m.reply(`Berhasil menambahkan premium untuk @${userJid.split('@')[0]} selama ${daysNum} hari!`, { mentions: [userJid] });
    } else {
        await m.reply('Gagal menambahkan premium!');
    }
};

const delprem = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) {
        return m.reply(`Penggunaan: ${ctx.prefix}delprem @user`);
    }
    
    const userJid = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    const success = await removePremium(userJid);
    if (success) {
        await m.reply(`Berhasil menghapus premium @${userJid.split('@')[0]}!`, { mentions: [userJid] });
    } else {
        await m.reply('User tidak memiliki premium atau gagal menghapus!');
    }
};

const ban = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    let userJid;
    
    if (m.quoted) {
        userJid = m.quoted.sender;
    } else if (text) {
        userJid = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
        return m.reply(`Penggunaan: ${ctx.prefix}ban @user atau reply pesan`);
    }
    
    await updateUser(userJid, { banned: true });
    await m.reply(`@${userJid.split('@')[0]} telah di-ban!`, { mentions: [userJid] });
};

const unban = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    let userJid;
    
    if (m.quoted) {
        userJid = m.quoted.sender;
    } else if (text) {
        userJid = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
        return m.reply(`Penggunaan: ${ctx.prefix}unban @user atau reply pesan`);
    }
    
    await updateUser(userJid, { banned: false });
    await m.reply(`@${userJid.split('@')[0]} telah di-unban!`, { mentions: [userJid] });
};

const addsewa = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) {
        return m.reply(`Penggunaan: ${ctx.prefix}addsewa link|hari\nContoh: ${ctx.prefix}addsewa https://chat.whatsapp.com/xxx|30`);
    }
    
    const [link, days] = text.split('|').map(x => x.trim());
    if (!link || !days) {
        return m.reply('Format: link|hari');
    }
    
    if (!isUrl(link) || !link.includes('chat.whatsapp.com/')) {
        return m.reply('Link grup tidak valid!');
    }
    
    const daysNum = parseInt(days.replace(/[^0-9]/g, '')) || 30;
    const inviteCode = link.split('chat.whatsapp.com/')[1];
    
    try {
        const groupInfo = await conn.groupGetInviteInfo(inviteCode);
        await conn.groupAcceptInvite(inviteCode);
        
        await addSewa(groupInfo.id, inviteCode, daysNum);
        await m.reply(`Berhasil menambahkan sewa grup *${groupInfo.subject}* selama ${daysNum} hari!`);
    } catch (e) {
        if (e.data === 400) return m.reply('Grup tidak ditemukan!');
        if (e.data === 401) return m.reply('Bot diblokir dari grup!');
        if (e.data === 410) return m.reply('Link grup telah diubah!');
        if (e.data === 500) return m.reply('Grup penuh!');
        return m.reply(`Gagal: ${e.message}`);
    }
};

const delsewa = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) {
        return m.reply(`Penggunaan: ${ctx.prefix}delsewa groupJid`);
    }
    
    const groupJid = text.includes('@g.us') ? text : text.split('chat.whatsapp.com/')[1];
    
    const success = await removeSewa(groupJid);
    if (success) {
        try {
            await conn.groupLeave(groupJid);
        } catch (e) {}
        await m.reply('Berhasil menghapus sewa grup!');
    } else {
        await m.reply('Grup tidak ditemukan di database sewa!');
    }
};

const setname = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text, botSettings } = ctx;
    if (!text) return m.reply('Masukkan nama bot baru!');
    
    const { jidNormalizedUser } = require('@whiskeysockets/baileys');
    await updateBotSettings(jidNormalizedUser(conn.user.id), { botName: text });
    await m.reply(`Nama bot diubah menjadi: ${text}`);
};

const setauthor = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) return m.reply('Masukkan nama author baru!');
    
    const { jidNormalizedUser } = require('@whiskeysockets/baileys');
    await updateBotSettings(jidNormalizedUser(conn.user.id), { author: text });
    await m.reply(`Author diubah menjadi: ${text}`);
};

const setpackname = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) return m.reply('Masukkan packname sticker baru!');
    
    const { jidNormalizedUser } = require('@whiskeysockets/baileys');
    await updateBotSettings(jidNormalizedUser(conn.user.id), { packname: text });
    await m.reply(`Packname diubah menjadi: ${text}`);
};

const setpublic = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { jidNormalizedUser } = require('@whiskeysockets/baileys');
    await updateBotSettings(jidNormalizedUser(conn.user.id), { public: true });
    conn.public = true;
    await m.reply('Bot sekarang dalam mode Public!');
};

const setself = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { jidNormalizedUser } = require('@whiskeysockets/baileys');
    await updateBotSettings(jidNormalizedUser(conn.user.id), { public: false });
    conn.public = false;
    await m.reply('Bot sekarang dalam mode Self!');
};

const broadcast = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { text } = ctx;
    if (!text) return m.reply('Masukkan pesan broadcast!');
    
    const groups = Object.keys(ctx.store.groupMetadata || {});
    let success = 0;
    let failed = 0;
    
    for (const jid of groups) {
        try {
            await conn.sendMessage(jid, { text: `*[ BROADCAST ]*\n\n${text}` });
            success++;
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            failed++;
        }
    }
    
    await m.reply(`Broadcast selesai!\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`);
};

const addmoney = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { args } = ctx;
    if (args.length < 2) {
        return m.reply(`Penggunaan: ${ctx.prefix}addmoney @user jumlah`);
    }
    
    const userJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const amount = parseInt(args[1]);
    
    if (isNaN(amount)) {
        return m.reply('Jumlah tidak valid!');
    }
    
    const user = await getUser(userJid);
    if (!user) {
        return m.reply('User tidak ditemukan!');
    }
    
    await updateUser(userJid, { money: user.money + amount });
    await m.reply(`Berhasil menambahkan ${amount} money ke @${userJid.split('@')[0]}!`, { mentions: [userJid] });
};

const addlimit = async (conn, m, ctx) => {
    if (!ctx.isOwner) return m.reply(settings.messages.owner);
    
    const { args } = ctx;
    if (args.length < 2) {
        return m.reply(`Penggunaan: ${ctx.prefix}addlimit @user jumlah`);
    }
    
    const userJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    const amount = parseInt(args[1]);
    
    if (isNaN(amount)) {
        return m.reply('Jumlah tidak valid!');
    }
    
    const user = await getUser(userJid);
    if (!user) {
        return m.reply('User tidak ditemukan!');
    }
    
    await updateUser(userJid, { limit: user.limit + amount });
    await m.reply(`Berhasil menambahkan ${amount} limit ke @${userJid.split('@')[0]}!`, { mentions: [userJid] });
};

module.exports = {
    addprem,
    addpremium: addprem,
    delprem,
    delpremium: delprem,
    ban,
    unban,
    addsewa,
    sewa: addsewa,
    delsewa,
    setname,
    setbotname: setname,
    setauthor,
    setbotauthor: setauthor,
    setpackname,
    setbotpackname: setpackname,
    'public': setpublic,
    setpublic,
    self: setself,
    setself,
    broadcast,
    bc: broadcast,
    addmoney,
    addlimit
};

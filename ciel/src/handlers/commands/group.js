const settings = require('../../../config/settings');
const { updateGroup, getOrCreateGroup, addWarn, getWarn, removeWarn } = require('../../services/database');

const kick = async (conn, m, { args, isOwner, botSettings }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid[0] || null);
    if (!target && args[0]) {
        target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }
    if (!target) return m.reply('Tag atau balas pesan member yang akan di kick!');
    
    const participants = m.metadata.participants.map(p => p.id);
    if (!participants.includes(target)) return m.reply('Member tidak ditemukan di grup!');
    
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
    m.reply(`✅ Berhasil mengeluarkan @${target.split('@')[0]}!`, { mentions: [target] });
};

const add = async (conn, m, { args, isOwner, botSettings }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    if (!args[0]) return m.reply('Masukkan nomor yang akan ditambahkan!\nContoh: .add 628xxx');
    
    const target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    
    try {
        await conn.groupParticipantsUpdate(m.chat, [target], 'add');
        m.reply(`✅ Berhasil menambahkan @${target.split('@')[0]}!`, { mentions: [target] });
    } catch (e) {
        if (e.message.includes('not-authorized')) {
            m.reply('Tidak dapat menambahkan member karena pengaturan privasi!');
        } else {
            m.reply('Gagal menambahkan member!');
        }
    }
};

const promote = async (conn, m, { args, isOwner, botSettings }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid[0] || null);
    if (!target && args[0]) {
        target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }
    if (!target) return m.reply('Tag atau balas pesan member yang akan di promote!');
    
    await conn.groupParticipantsUpdate(m.chat, [target], 'promote');
    m.reply(`✅ @${target.split('@')[0]} sekarang menjadi Admin!`, { mentions: [target] });
};

const demote = async (conn, m, { args, isOwner, botSettings }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid[0] || null);
    if (!target && args[0]) {
        target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }
    if (!target) return m.reply('Tag atau balas pesan admin yang akan di demote!');
    
    await conn.groupParticipantsUpdate(m.chat, [target], 'demote');
    m.reply(`✅ @${target.split('@')[0]} bukan Admin lagi!`, { mentions: [target] });
};

const setwelcome = async (conn, m, { text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    if (!text) return m.reply('Masukkan pesan welcome!\nGunakan variabel:\n@user - mention member\n@group - nama grup\n@desc - deskripsi grup');
    
    await updateGroup(m.chat, { welcomeMessage: text });
    m.reply(`✅ Pesan Welcome berhasil diset!\n\n${text}`);
};

const setleave = async (conn, m, { text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    if (!text) return m.reply('Masukkan pesan leave!\nGunakan variabel:\n@user - mention member\n@group - nama grup');
    
    await updateGroup(m.chat, { leaveMessage: text });
    m.reply(`✅ Pesan Leave berhasil diset!\n\n${text}`);
};

const welcome = async (conn, m, { args, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    const status = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(status)) return m.reply('Gunakan: .welcome on/off');
    
    await updateGroup(m.chat, { welcome: status === 'on' });
    m.reply(`✅ Welcome ${status === 'on' ? 'diaktifkan' : 'dinonaktifkan'}!`);
};

const leave = async (conn, m, { args, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    const status = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(status)) return m.reply('Gunakan: .leave on/off');
    
    await updateGroup(m.chat, { leave: status === 'on' });
    m.reply(`✅ Leave message ${status === 'on' ? 'diaktifkan' : 'dinonaktifkan'}!`);
};

const antilink = async (conn, m, { args, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    const status = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(status)) return m.reply('Gunakan: .antilink on/off');
    
    await updateGroup(m.chat, { antilink: status === 'on' });
    m.reply(`✅ Anti-link ${status === 'on' ? 'diaktifkan' : 'dinonaktifkan'}!`);
};

const antitoxic = async (conn, m, { args, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    const status = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(status)) return m.reply('Gunakan: .antitoxic on/off');
    
    await updateGroup(m.chat, { antitoxic: status === 'on' });
    m.reply(`✅ Anti-toxic ${status === 'on' ? 'diaktifkan' : 'dinonaktifkan'}!`);
};

const antivirtex = async (conn, m, { args, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    const status = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(status)) return m.reply('Gunakan: .antivirtex on/off');
    
    await updateGroup(m.chat, { antivirtex: status === 'on' });
    m.reply(`✅ Anti-virtex ${status === 'on' ? 'diaktifkan' : 'dinonaktifkan'}!`);
};

const mute = async (conn, m, { args, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    const status = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(status)) return m.reply('Gunakan: .mute on/off');
    
    await updateGroup(m.chat, { mute: status === 'on' });
    m.reply(`✅ Mute grup ${status === 'on' ? 'diaktifkan (bot tidak merespon)' : 'dinonaktifkan'}!`);
};

const groupinfo = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    
    const group = await getOrCreateGroup(m.chat, m.metadata?.subject);
    
    const info = `*📋 Info Grup*
    
*Nama:* ${m.metadata?.subject || 'Unknown'}
*ID:* ${m.chat}
*Members:* ${m.metadata?.participants?.length || 0}
*Admins:* ${m.metadata?.participants?.filter(p => p.admin)?.length || 0}

*⚙️ Pengaturan:*
• Welcome: ${group?.welcome ? '✅' : '❌'}
• Leave: ${group?.leave ? '✅' : '❌'}
• Anti-link: ${group?.antilink ? '✅' : '❌'}
• Anti-toxic: ${group?.antitoxic ? '✅' : '❌'}
• Anti-virtex: ${group?.antivirtex ? '✅' : '❌'}
• Mute: ${group?.mute ? '✅' : '❌'}`;
    
    m.reply(info);
};

const linkgroup = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    const code = await conn.groupInviteCode(m.chat);
    m.reply(`*🔗 Link Grup*\n\nhttps://chat.whatsapp.com/${code}`);
};

const revoke = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    await conn.groupRevokeInvite(m.chat);
    m.reply('✅ Link grup berhasil di reset!');
};

const tagall = async (conn, m, { text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    const participants = m.metadata.participants.map(p => p.id);
    
    let message = text || 'Tag All';
    message += '\n\n';
    
    for (const jid of participants) {
        message += `@${jid.split('@')[0]}\n`;
    }
    
    await conn.sendMessage(m.chat, { text: message, mentions: participants });
};

const hidetag = async (conn, m, { text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    if (!text) return m.reply('Masukkan pesan untuk hidetag!');
    
    const participants = m.metadata.participants.map(p => p.id);
    await conn.sendMessage(m.chat, { text, mentions: participants });
};

const warn = async (conn, m, { args, text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid[0] || null);
    if (!target) return m.reply('Tag atau balas pesan member yang akan diberi warning!');
    
    const reason = text.replace(/@\d+/g, '').trim() || 'Tidak ada alasan';
    
    const warnData = await addWarn(m.chat, target, reason);
    
    if (warnData.count >= 3) {
        await conn.groupParticipantsUpdate(m.chat, [target], 'remove');
        await removeWarn(m.chat, target);
        return m.reply(`⚠️ @${target.split('@')[0]} telah mencapai 3 warning dan dikeluarkan dari grup!`, { mentions: [target] });
    }
    
    m.reply(`⚠️ Warning ${warnData.count}/3 untuk @${target.split('@')[0]}\nAlasan: ${reason}`, { mentions: [target] });
};

const unwarn = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid[0] || null);
    if (!target) return m.reply('Tag atau balas pesan member yang akan dihapus warningnya!');
    
    await removeWarn(m.chat, target);
    m.reply(`✅ Warning @${target.split('@')[0]} telah direset!`, { mentions: [target] });
};

const cekwarn = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    
    let target = m.quoted ? m.quoted.sender : (m.mentionedJid[0] || m.sender);
    
    const warnData = await getWarn(m.chat, target);
    
    if (!warnData || warnData.count === 0) {
        return m.reply(`✅ @${target.split('@')[0]} tidak memiliki warning!`, { mentions: [target] });
    }
    
    m.reply(`⚠️ @${target.split('@')[0]} memiliki ${warnData.count}/3 warning\nAlasan terakhir: ${warnData.reason || '-'}`, { mentions: [target] });
};

const open = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    await conn.groupSettingUpdate(m.chat, 'not_announcement');
    m.reply('✅ Grup telah dibuka! Semua member dapat mengirim pesan.');
};

const close = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    await conn.groupSettingUpdate(m.chat, 'announcement');
    m.reply('✅ Grup telah ditutup! Hanya admin yang dapat mengirim pesan.');
};

const setname = async (conn, m, { text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    if (!text) return m.reply('Masukkan nama grup baru!');
    
    await conn.groupUpdateSubject(m.chat, text);
    m.reply(`✅ Nama grup berhasil diubah menjadi: ${text}`);
};

const setdesc = async (conn, m, { text, isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    if (!text) return m.reply('Masukkan deskripsi grup baru!');
    
    await conn.groupUpdateDescription(m.chat, text);
    m.reply(`✅ Deskripsi grup berhasil diubah!`);
};

const setppgroup = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    if (!m.isBotAdmin) return m.reply(settings.messages.botAdmin);
    
    const quoted = m.quoted || m;
    if (!quoted.isMedia || !quoted.isImage) return m.reply('Reply foto untuk dijadikan foto profil grup!');
    
    try {
        const buffer = await quoted.download();
        await conn.updateProfilePicture(m.chat, buffer);
        m.reply('✅ Foto profil grup berhasil diubah!');
    } catch (e) {
        m.reply('Gagal mengubah foto profil grup!');
    }
};

module.exports = {
    kick,
    add,
    promote,
    demote,
    setwelcome,
    setleave,
    welcome,
    leave,
    antilink,
    antitoxic,
    antivirtex,
    mute,
    groupinfo,
    linkgroup,
    linkgrup: linkgroup,
    revoke,
    tagall,
    hidetag,
    warn,
    unwarn,
    cekwarn,
    open,
    close,
    setname,
    setdesc,
    setppgroup,
    setppgrup: setppgroup
};

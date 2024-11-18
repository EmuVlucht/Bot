const axios = require('axios');
const settings = require('../../../config/settings');
const { wallpaper, quotesAnime, tiktokStalk, instaStalk, ringtone } = require('../../../lib/scraper');

const say = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan teks!');
    m.reply(text);
};

const simisimi = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan pesan untuk ngobrol!');
    
    await m.reply(settings.messages.wait);
    
    try {
        const responses = [
            'Halo! Apa kabar?',
            'Hmm, menarik sekali!',
            'Oh begitu ya...',
            'Wah, kamu lucu sekali!',
            'Aku tidak mengerti maksudmu.',
            'Ceritakan lebih lanjut!',
            'Hahaha, bisa saja kamu!',
            'Aku setuju denganmu!',
            'Wah, serius?',
            'Keren banget!',
            'Aku suka caramu berpikir!',
            'Hmm, aku perlu waktu untuk memikirkannya.',
            'Kamu membuatku bingung!',
            'Oke, aku paham sekarang.',
            'Bagaimana perasaanmu hari ini?'
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        m.reply(response);
    } catch (e) {
        console.error('Simisimi error:', e);
        m.reply('Gagal mendapatkan respons!');
    }
};

const simi = simisimi;

const truth = async (conn, m, {}) => {
    const truths = [
        'Apa hal paling memalukan yang pernah kamu lakukan?',
        'Siapa crush kamu sekarang?',
        'Apa rahasia terbesar yang kamu simpan?',
        'Pernahkah kamu berbohong pada orang yang kamu sayang?',
        'Apa ketakutan terbesarmu?',
        'Apa mimpi terburukmu?',
        'Siapa mantan yang paling sulit kamu lupakan?',
        'Pernah stalking sosmed siapa?',
        'Apa kebiasaan aneh yang kamu punya?',
        'Pernah naksir teman sendiri?',
        'Kapan terakhir kali kamu menangis?',
        'Apa hal yang membuatmu insecure?',
        'Pernah cemburu sama siapa?',
        'Apa yang paling kamu sesali?',
        'Siapa orang yang paling kamu benci?'
    ];
    
    const random = truths[Math.floor(Math.random() * truths.length)];
    m.reply(`*🎯 Truth*\n\n${random}`);
};

const dare = async (conn, m, {}) => {
    const dares = [
        'Kirim chat "Aku kangen" ke mantan!',
        'Voice note nyanyikan lagu favorit!',
        'Kirim selfie tanpa filter!',
        'Ceritakan hal memalukan di grup!',
        'Ubah nama WA jadi "Aku Ganteng/Cantik" selama 1 jam!',
        'Kirim pesan "Aku suka kamu" ke crush!',
        'Voice note tertawa selama 30 detik!',
        'Jadi budak orang yang nge-dare selama 5 menit!',
        'Kirim foto gallery ke-13!',
        'Roasting admin grup!',
        'Kirim stiker terakhir yang kamu simpan!',
        'Panggil semua member grup "kakak"!',
        'Buat status tentang dirimu!',
        'Kirim voice note nyanyi lagu anak-anak!',
        'Ganti foto profil jadi foto absurd selama 1 jam!'
    ];
    
    const random = dares[Math.floor(Math.random() * dares.length)];
    m.reply(`*🔥 Dare*\n\n${random}`);
};

const tod = async (conn, m, {}) => {
    const type = Math.random() < 0.5 ? 'truth' : 'dare';
    if (type === 'truth') {
        await truth(conn, m, {});
    } else {
        await dare(conn, m, {});
    }
};

const truthordare = tod;

const joke = async (conn, m, {}) => {
    const jokes = [
        'Kenapa kucing bisa menang lomba lari? Karena dia punya 4 kaki!',
        'Apa bedanya maling sama programmer? Maling ngambil duit, programmer ngambil kopi!',
        'Kenapa matematika sedih? Karena punya banyak masalah!',
        'Hewan apa yang paling pintar? Owl! Karena dia professor!',
        'Apa makanan favorit hantu? Spookghetti!',
        'Kenapa komputer tidak pernah marah? Karena sudah di-install kesabaran!',
        'Sayur apa yang paling keren? Terong! Karena ada "e-rong" nya!',
        'Kenapa bulan tidak bisa makan? Karena sudah kenyang dengan bintang!',
        'Apa bedanya kamu sama kalender? Kalender punya tanggal, kamu nggak!',
        'Kenapa hujan turun? Karena kalau naik, namanya gerimis!',
        'Hewan apa yang paling jago matematika? Kelinci! Karena bisa berkali-kali!',
        'Kenapa semut baris rapi? Karena takut keinjak!',
        'Apa bahasa Jepangnya nenek jatuh? Obaa-san tsunamida!',
        'Kenapa meja bisa lari? Karena punya 4 kaki!',
        'Sayur apa yang dingin? Brrrokoli!'
    ];
    
    const random = jokes[Math.floor(Math.random() * jokes.length)];
    m.reply(`*😂 Joke*\n\n${random}`);
};

const meme = async (conn, m, {}) => {
    await m.reply(settings.messages.wait);
    
    try {
        const response = await axios.get('https://meme-api.com/gimme');
        const memeUrl = response.data.url;
        
        const imageBuffer = await axios.get(memeUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, {
            image: Buffer.from(imageBuffer.data),
            caption: `*😂 Meme*\n\n${response.data.title}`
        }, { quoted: m });
    } catch (e) {
        console.error('Meme error:', e);
        m.reply('Gagal mendapatkan meme!');
    }
};

const quote = async (conn, m, {}) => {
    const quotes = [
        { text: 'Hidup itu seperti bersepeda. Untuk menjaga keseimbangan, kamu harus terus bergerak.', author: 'Albert Einstein' },
        { text: 'Satu-satunya cara untuk melakukan pekerjaan hebat adalah dengan mencintai apa yang kamu lakukan.', author: 'Steve Jobs' },
        { text: 'Jangan menunggu. Waktu tidak akan pernah tepat.', author: 'Napoleon Hill' },
        { text: 'Kesuksesan bukanlah kunci kebahagiaan. Kebahagiaan adalah kunci kesuksesan.', author: 'Albert Schweitzer' },
        { text: 'Masa depan milik mereka yang percaya pada keindahan mimpi-mimpi mereka.', author: 'Eleanor Roosevelt' },
        { text: 'Semakin keras kamu bekerja, semakin beruntung kamu.', author: 'Gary Player' },
        { text: 'Jangan biarkan kemarin mengambil terlalu banyak hari ini.', author: 'Will Rogers' },
        { text: 'Hiduplah seolah-olah kamu akan mati besok. Belajarlah seolah-olah kamu akan hidup selamanya.', author: 'Mahatma Gandhi' },
        { text: 'Kegagalan adalah kesempatan untuk memulai lagi dengan lebih cerdas.', author: 'Henry Ford' },
        { text: 'Jadilah perubahan yang ingin kamu lihat di dunia.', author: 'Mahatma Gandhi' }
    ];
    
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    m.reply(`*💬 Quote*\n\n"${random.text}"\n\n— ${random.author}`);
};

const motivasi = quote;

const fakta = async (conn, m, {}) => {
    const facts = [
        'Sidik jari koala 95% mirip dengan manusia!',
        'Madu tidak akan pernah basi!',
        'Jantung manusia berdetak lebih dari 100.000 kali sehari!',
        'Lumba-lumba tidur dengan satu mata terbuka!',
        'Lebah bisa terbang lebih tinggi dari Gunung Everest!',
        'Octopus memiliki 3 jantung!',
        'Kuda nil mengeluarkan keringat berwarna merah!',
        'Lidah manusia adalah otot terkuat di tubuh!',
        'Gajah adalah satu-satunya hewan yang tidak bisa melompat!',
        'Wortel awalnya berwarna ungu, bukan oranye!',
        'Laba-laba tidak bisa terbang tapi bisa menggunakan jaring untuk melayang!',
        'Kucing menghabiskan 70% hidupnya untuk tidur!',
        'Mata burung unta lebih besar dari otaknya!',
        'Pisang termasuk buah berry, tapi strawberry bukan!',
        'Air laut mengandung emas sekitar 20 juta ton!'
    ];
    
    const random = facts[Math.floor(Math.random() * facts.length)];
    m.reply(`*🧠 Fakta Unik*\n\n${random}`);
};

const fact = fakta;

const ship = async (conn, m, {}) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    
    const participants = m.metadata.participants;
    if (participants.length < 2) return m.reply('Minimal 2 member di grup!');
    
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const person1 = shuffled[0].id;
    const person2 = shuffled[1].id;
    
    const percentage = Math.floor(Math.random() * 101);
    
    let status;
    if (percentage >= 80) status = '❤️ Perfect Match!';
    else if (percentage >= 60) status = '💕 Great Match!';
    else if (percentage >= 40) status = '💓 Good Match!';
    else if (percentage >= 20) status = '💔 Not Bad!';
    else status = '💔 Better as Friends!';
    
    m.reply(`*💘 Love Ship*

@${person1.split('@')[0]} ❤️ @${person2.split('@')[0]}

Compatibility: ${percentage}%
${status}

${'█'.repeat(Math.floor(percentage / 10))}${'░'.repeat(10 - Math.floor(percentage / 10))}`, { mentions: [person1, person2] });
};

const couple = ship;

const gay = async (conn, m, {}) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender;
    const percentage = Math.floor(Math.random() * 101);
    
    let emoji;
    if (percentage >= 80) emoji = '🏳️‍🌈';
    else if (percentage >= 50) emoji = '😳';
    else emoji = '😎';
    
    m.reply(`*${emoji} Gay Meter*

@${target.split('@')[0]}: ${percentage}% Gay

${'█'.repeat(Math.floor(percentage / 10))}${'░'.repeat(10 - Math.floor(percentage / 10))}`, { mentions: [target] });
};

const lesbi = async (conn, m, {}) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender;
    const percentage = Math.floor(Math.random() * 101);
    
    let emoji;
    if (percentage >= 80) emoji = '🏳️‍🌈';
    else if (percentage >= 50) emoji = '😳';
    else emoji = '😎';
    
    m.reply(`*${emoji} Lesbi Meter*

@${target.split('@')[0]}: ${percentage}% Lesbi

${'█'.repeat(Math.floor(percentage / 10))}${'░'.repeat(10 - Math.floor(percentage / 10))}`, { mentions: [target] });
};

const ganteng = async (conn, m, {}) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender;
    const percentage = Math.floor(Math.random() * 101);
    
    let emoji;
    if (percentage >= 80) emoji = '😍';
    else if (percentage >= 50) emoji = '😊';
    else emoji = '😅';
    
    m.reply(`*${emoji} Ganteng Meter*

@${target.split('@')[0]}: ${percentage}% Ganteng

${'█'.repeat(Math.floor(percentage / 10))}${'░'.repeat(10 - Math.floor(percentage / 10))}`, { mentions: [target] });
};

const cantik = async (conn, m, {}) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender;
    const percentage = Math.floor(Math.random() * 101);
    
    let emoji;
    if (percentage >= 80) emoji = '😍';
    else if (percentage >= 50) emoji = '😊';
    else emoji = '😅';
    
    m.reply(`*${emoji} Cantik Meter*

@${target.split('@')[0]}: ${percentage}% Cantik

${'█'.repeat(Math.floor(percentage / 10))}${'░'.repeat(10 - Math.floor(percentage / 10))}`, { mentions: [target] });
};

const iq = async (conn, m, {}) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender;
    const iqScore = Math.floor(Math.random() * 150) + 50;
    
    let status;
    if (iqScore >= 180) status = '🧠 Genius!';
    else if (iqScore >= 140) status = '🎓 Very Superior';
    else if (iqScore >= 120) status = '📚 Superior';
    else if (iqScore >= 110) status = '📖 High Average';
    else if (iqScore >= 90) status = '📗 Average';
    else if (iqScore >= 80) status = '📕 Low Average';
    else status = '😅 Below Average';
    
    m.reply(`*🧠 IQ Test*

@${target.split('@')[0]}: ${iqScore} IQ
${status}`, { mentions: [target] });
};

const cekmati = async (conn, m, {}) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || m.sender;
    
    const causes = [
        'keselek biji durian',
        'jatuh dari kasur',
        'kena serangan jomblo akut',
        'overdosis micin',
        'ditinggal pacar',
        'kehabisan kuota internet',
        'baper berkepanjangan',
        'tertimpa gedung',
        'kesambet wifi lemot',
        'dipatuk bebek',
        'tersedak es batu',
        'kena serangan mager',
        'karena terlalu ganteng/cantik',
        'kebanyakan stalking mantan',
        'kena karma'
    ];
    
    const years = Math.floor(Math.random() * 80) + 20;
    const cause = causes[Math.floor(Math.random() * causes.length)];
    
    m.reply(`*💀 Ramalan Kematian*

@${target.split('@')[0]}

Umur: ${years} tahun
Penyebab: ${cause}

⚠️ Ini hanya hiburan, jangan ditanggapi serius!`, { mentions: [target] });
};

const randomnumber = async (conn, m, { args }) => {
    const min = parseInt(args[0]) || 1;
    const max = parseInt(args[1]) || 100;
    
    if (min >= max) return m.reply('Angka pertama harus lebih kecil dari angka kedua!');
    
    const random = Math.floor(Math.random() * (max - min + 1)) + min;
    m.reply(`*🎲 Random Number*\n\nRange: ${min} - ${max}\nHasil: ${random}`);
};

const random = randomnumber;

const choose = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan pilihan dipisah dengan " atau " atau ","!\nContoh: .choose makan atau tidur');
    
    const choices = text.split(/ atau |,/).map(c => c.trim()).filter(c => c);
    if (choices.length < 2) return m.reply('Minimal 2 pilihan!');
    
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    m.reply(`*🤔 Choose*\n\nPilihan: ${choices.join(', ')}\n\nJawaban: ${chosen}`);
};

const pilih = choose;

const eightball = async (conn, m, { text }) => {
    if (!text) return m.reply('Ajukan pertanyaan!\nContoh: .8ball apakah aku ganteng?');
    
    const answers = [
        'Ya, pasti!',
        'Tentu saja!',
        'Tanpa keraguan!',
        'Kemungkinan besar iya.',
        'Sepertinya iya.',
        'Mungkin.',
        'Tidak yakin, coba lagi.',
        'Lebih baik tidak memberitahu sekarang.',
        'Tidak bisa diprediksi.',
        'Fokus dan tanya lagi.',
        'Jangan andalkan itu.',
        'Jawabanku adalah tidak.',
        'Sumber saya mengatakan tidak.',
        'Prospeknya tidak bagus.',
        'Sangat meragukan.'
    ];
    
    const answer = answers[Math.floor(Math.random() * answers.length)];
    m.reply(`*🎱 8Ball*\n\nPertanyaan: ${text}\nJawaban: ${answer}`);
};

const ball = eightball;

const rate = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan sesuatu untuk di-rate!');
    
    const rating = Math.floor(Math.random() * 11);
    const stars = '⭐'.repeat(rating) + '☆'.repeat(10 - rating);
    
    m.reply(`*📊 Rate*\n\n${text}\n\n${stars}\n${rating}/10`);
};

const wp = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan keyword pencarian!\nContoh: .wallpaper anime');
    
    await m.reply(settings.messages.wait);
    
    try {
        const result = await wallpaper(text);
        
        if (!result || !result.length) {
            return m.reply('Wallpaper tidak ditemukan!');
        }
        
        const randomWp = result[Math.floor(Math.random() * Math.min(result.length, 5))];
        const imageUrl = randomWp.image?.[0] || randomWp.image;
        
        if (!imageUrl) {
            return m.reply('Wallpaper tidak ditemukan!');
        }
        
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
        await conn.sendMessage(m.chat, {
            image: Buffer.from(imageBuffer.data),
            caption: `*🖼️ Wallpaper*\n\n*Title:* ${randomWp.title || 'Unknown'}`
        }, { quoted: m });
    } catch (e) {
        console.error('Wallpaper error:', e);
        m.reply('Gagal mencari wallpaper!');
    }
};

const animequote = async (conn, m, {}) => {
    await m.reply(settings.messages.wait);
    
    try {
        const result = await quotesAnime();
        
        if (!result) {
            return m.reply('Gagal mendapatkan quote anime!');
        }
        
        m.reply(`*🎌 Anime Quote*\n\n"${result.content}"\n\n— ${result.character?.name || 'Unknown'}\n*Anime:* ${result.anime?.name || 'Unknown'}`);
    } catch (e) {
        console.error('Anime quote error:', e);
        m.reply('Gagal mendapatkan quote anime!');
    }
};

const quoteanime = animequote;

const ttstalk = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan username TikTok!\nContoh: .ttstalk username');
    
    await m.reply(settings.messages.wait);
    
    try {
        const result = await tiktokStalk(text.replace('@', ''));
        
        if (!result) {
            return m.reply('User tidak ditemukan!');
        }
        
        m.reply(`*📊 TikTok Stalk*

*Username:* ${result.author_name || result.username || 'Unknown'}
*Nickname:* ${result.nickname || '-'}
*Followers:* ${result.followerCount || 0}
*Following:* ${result.followingCount || 0}
*Likes:* ${result.heartCount || 0}
*Videos:* ${result.videoCount || 0}

*Bio:* ${result.signature || '-'}`);
    } catch (e) {
        console.error('TikTok stalk error:', e);
        m.reply('Gagal stalking user TikTok!');
    }
};

const tikstalk = ttstalk;

const igstalk = async (conn, m, { text }) => {
    if (!text) return m.reply('Masukkan username Instagram!\nContoh: .igstalk username');
    
    await m.reply(settings.messages.wait);
    
    try {
        const result = await instaStalk(text.replace('@', ''));
        
        if (!result) {
            return m.reply('User tidak ditemukan!');
        }
        
        m.reply(`*📊 Instagram Stalk*

*Username:* ${result.username || 'Unknown'}
*Nickname:* ${result.nickname || '-'}
*Followers:* ${result.followers || 0}
*Following:* ${result.following || 0}
*Posts:* ${result.posts || 0}

*Bio:* ${result.description || '-'}`);
    } catch (e) {
        console.error('Instagram stalk error:', e);
        m.reply('Gagal stalking user Instagram!');
    }
};

const instastalk = igstalk;

module.exports = {
    say,
    simisimi,
    simi,
    truth,
    dare,
    tod,
    truthordare,
    joke,
    meme,
    quote,
    motivasi,
    fakta,
    fact,
    ship,
    couple,
    gay,
    lesbi,
    ganteng,
    cantik,
    iq,
    cekmati,
    randomnumber,
    random,
    choose,
    pilih,
    eightball,
    '8ball': eightball,
    ball,
    rate,
    wallpaper: wp,
    wp,
    animequote,
    quoteanime,
    ttstalk,
    tikstalk,
    igstalk,
    instastalk
};

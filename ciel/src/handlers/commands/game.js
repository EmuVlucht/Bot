const settings = require('../../../config/settings');
const { 
    getOrCreateUser, 
    updateUser, 
    createActiveGame, 
    getActiveGame, 
    updateActiveGame, 
    deleteActiveGame 
} = require('../../services/database');
const { genMath, modes } = require('../../../lib/math');

const tictactoe = async (conn, m, { args, text, user }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    
    const target = m.mentionedJid[0];
    if (!target) return m.reply('Tag lawan untuk bermain TicTacToe!\nContoh: .tictactoe @user');
    
    if (target === m.sender) return m.reply('Tidak bisa bermain dengan diri sendiri!');
    
    const existingGame = await getActiveGame(m.chat, 'tictactoe');
    if (existingGame) return m.reply('Masih ada game TicTacToe yang berjalan! Selesaikan dulu atau tunggu timeout.');
    
    const board = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const gameData = {
        board,
        playerX: m.sender,
        playerO: target,
        currentTurn: m.sender,
        moves: 0
    };
    
    await createActiveGame(m.chat, 'tictactoe', gameData, [m.sender, target], 10);
    
    const boardDisplay = renderTicTacToeBoard(board);
    
    m.reply(`*🎮 TicTacToe*

@${m.sender.split('@')[0]} (X) vs @${target.split('@')[0]} (O)

${boardDisplay}

Giliran: @${m.sender.split('@')[0]}
Ketik nomor 1-9 untuk bermain!`, { mentions: [m.sender, target] });
};

const ttt = tictactoe;

const tttmove = async (conn, m, { args }) => {
    if (!m.isGroup) return;
    
    const move = parseInt(m.text);
    if (isNaN(move) || move < 1 || move > 9) return;
    
    const game = await getActiveGame(m.chat, 'tictactoe');
    if (!game) return;
    
    const gameData = game.gameData;
    
    if (m.sender !== gameData.currentTurn) return;
    
    if (gameData.board[move - 1] === 'X' || gameData.board[move - 1] === 'O') {
        return m.reply('Kotak sudah terisi!');
    }
    
    const symbol = m.sender === gameData.playerX ? 'X' : 'O';
    gameData.board[move - 1] = symbol;
    gameData.moves++;
    
    const winner = checkTicTacToeWinner(gameData.board);
    
    if (winner) {
        await deleteActiveGame(m.chat, 'tictactoe');
        const winnerId = winner === 'X' ? gameData.playerX : gameData.playerO;
        const loserId = winner === 'X' ? gameData.playerO : gameData.playerX;
        
        await updateUser(winnerId, { money: { increment: 500 } });
        
        const boardDisplay = renderTicTacToeBoard(gameData.board);
        return m.reply(`*🎮 TicTacToe - Selesai!*

${boardDisplay}

🏆 Pemenang: @${winnerId.split('@')[0]}
💰 +500 uang!`, { mentions: [winnerId, loserId] });
    }
    
    if (gameData.moves >= 9) {
        await deleteActiveGame(m.chat, 'tictactoe');
        const boardDisplay = renderTicTacToeBoard(gameData.board);
        return m.reply(`*🎮 TicTacToe - Seri!*

${boardDisplay}

Permainan berakhir seri!`, { mentions: [gameData.playerX, gameData.playerO] });
    }
    
    gameData.currentTurn = m.sender === gameData.playerX ? gameData.playerO : gameData.playerX;
    await updateActiveGame(m.chat, 'tictactoe', gameData);
    
    const boardDisplay = renderTicTacToeBoard(gameData.board);
    m.reply(`*🎮 TicTacToe*

${boardDisplay}

Giliran: @${gameData.currentTurn.split('@')[0]}`, { mentions: [gameData.currentTurn] });
};

const deletettt = async (conn, m, { isOwner }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (!m.isAdmin && !isOwner) return m.reply(settings.messages.admin);
    
    const game = await getActiveGame(m.chat, 'tictactoe');
    if (!game) return m.reply('Tidak ada game TicTacToe yang berjalan!');
    
    await deleteActiveGame(m.chat, 'tictactoe');
    m.reply('Game TicTacToe telah dihapus!');
};

function renderTicTacToeBoard(board) {
    return `
 ${board[0]} │ ${board[1]} │ ${board[2]}
───┼───┼───
 ${board[3]} │ ${board[4]} │ ${board[5]}
───┼───┼───
 ${board[6]} │ ${board[7]} │ ${board[8]}
    `.trim();
}

function checkTicTacToeWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }
    return null;
}

const slot = async (conn, m, { args, user }) => {
    const bet = parseInt(args[0]) || 100;
    
    if (bet < 100) return m.reply('Minimal taruhan 100!');
    if (bet > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    
    const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
    const getRandomSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
    
    const row1 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const row2 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    const row3 = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    
    const slotDisplay = `
╔═══════════╗
║ ${row1[0]} │ ${row1[1]} │ ${row1[2]} ║
╠═══════════╣
║ ${row2[0]} │ ${row2[1]} │ ${row2[2]} ║ ⬅️
╠═══════════╣
║ ${row3[0]} │ ${row3[1]} │ ${row3[2]} ║
╚═══════════╝
    `.trim();
    
    let winAmount = 0;
    let winMessage = '';
    
    if (row2[0] === row2[1] && row2[1] === row2[2]) {
        if (row2[0] === '7️⃣') {
            winAmount = bet * 10;
            winMessage = '🎉 JACKPOT 777! x10';
        } else if (row2[0] === '💎') {
            winAmount = bet * 5;
            winMessage = '💎 DIAMOND! x5';
        } else if (row2[0] === '⭐') {
            winAmount = bet * 3;
            winMessage = '⭐ STAR! x3';
        } else {
            winAmount = bet * 2;
            winMessage = '🎰 Triple Match! x2';
        }
    } else if (row2[0] === row2[1] || row2[1] === row2[2]) {
        winAmount = Math.floor(bet * 1.5);
        winMessage = '✨ Double Match! x1.5';
    }
    
    const profit = winAmount - bet;
    await updateUser(m.sender, { money: { increment: profit } });
    
    const newBalance = user.money + profit;
    
    let resultText = `*🎰 SLOT MACHINE*

${slotDisplay}

Taruhan: ${bet}
`;
    
    if (winAmount > 0) {
        resultText += `
${winMessage}
Menang: +${winAmount}
Saldo: ${newBalance}`;
    } else {
        resultText += `
❌ Tidak beruntung!
Kalah: -${bet}
Saldo: ${newBalance}`;
    }
    
    m.reply(resultText);
};

const daily = async (conn, m, { user }) => {
    const now = new Date();
    const lastDaily = user.lastDaily ? new Date(user.lastDaily) : null;
    
    if (lastDaily) {
        const diff = now - lastDaily;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (hours < 24) {
            const remaining = 24 - hours;
            return m.reply(`⏰ Daily reward sudah diklaim!\nTunggu ${remaining} jam lagi.`);
        }
    }
    
    const reward = Math.floor(Math.random() * 5000) + 1000;
    const limitReward = Math.floor(Math.random() * 5) + 1;
    
    await updateUser(m.sender, { 
        money: { increment: reward },
        limit: { increment: limitReward },
        lastDaily: now
    });
    
    m.reply(`*🎁 Daily Reward*

💰 Uang: +${reward}
📊 Limit: +${limitReward}

Klaim lagi besok!`);
};

const weekly = async (conn, m, { user }) => {
    const now = new Date();
    const lastWeekly = user.lastWeekly ? new Date(user.lastWeekly) : null;
    
    if (lastWeekly) {
        const diff = now - lastWeekly;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days < 7) {
            const remaining = 7 - days;
            return m.reply(`⏰ Weekly reward sudah diklaim!\nTunggu ${remaining} hari lagi.`);
        }
    }
    
    const reward = Math.floor(Math.random() * 25000) + 10000;
    const limitReward = Math.floor(Math.random() * 15) + 5;
    
    await updateUser(m.sender, { 
        money: { increment: reward },
        limit: { increment: limitReward },
        lastWeekly: now
    });
    
    m.reply(`*🎁 Weekly Reward*

💰 Uang: +${reward}
📊 Limit: +${limitReward}

Klaim lagi minggu depan!`);
};

const transfer = async (conn, m, { args, user }) => {
    const target = m.mentionedJid[0];
    if (!target) return m.reply('Tag user yang akan ditransfer!\nContoh: .transfer @user 1000');
    
    if (target === m.sender) return m.reply('Tidak bisa transfer ke diri sendiri!');
    
    const amount = parseInt(args[1]) || parseInt(args[0]?.replace(/[^0-9]/g, ''));
    if (!amount || amount < 100) return m.reply('Minimal transfer 100!');
    if (amount > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    
    const targetUser = await getOrCreateUser(target, null);
    
    await updateUser(m.sender, { money: { decrement: amount } });
    await updateUser(target, { money: { increment: amount } });
    
    m.reply(`*💸 Transfer Berhasil*

Dari: @${m.sender.split('@')[0]}
Ke: @${target.split('@')[0]}
Jumlah: ${amount}

Saldo kamu: ${user.money - amount}`, { mentions: [m.sender, target] });
};

const tf = transfer;

const leaderboard = async (conn, m, {}) => {
    const { prisma } = require('../../services/database');
    
    try {
        const topMoney = await prisma.user.findMany({
            orderBy: { money: 'desc' },
            take: 10
        });
        
        let text = '*🏆 Leaderboard Uang*\n\n';
        
        topMoney.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            text += `${medal} ${u.name || u.jid.split('@')[0]}: ${u.money}\n`;
        });
        
        m.reply(text);
    } catch (e) {
        console.error('Leaderboard error:', e);
        m.reply('Gagal mendapatkan leaderboard!');
    }
};

const lb = leaderboard;
const top = leaderboard;

const profile = async (conn, m, { user }) => {
    const target = m.mentionedJid[0] || m.sender;
    const targetUser = target === m.sender ? user : await getOrCreateUser(target, null);
    
    if (!targetUser) return m.reply('User tidak ditemukan!');
    
    const premiumStatus = targetUser.premium ? '✅ Premium' : '❌ Free';
    const vipStatus = targetUser.vip ? '✅ VIP' : '❌';
    
    const text = `*👤 Profile*

*Nama:* ${targetUser.name || 'Unknown'}
*JID:* ${target}

*💰 Uang:* ${targetUser.money}
*📊 Limit:* ${targetUser.limit}
*⭐ Premium:* ${premiumStatus}
*👑 VIP:* ${vipStatus}
*🚫 Banned:* ${targetUser.banned ? '✅' : '❌'}

*📅 Bergabung:* ${new Date(targetUser.createdAt).toLocaleDateString('id-ID')}`;
    
    m.reply(text, { mentions: [target] });
};

const cekmoney = async (conn, m, { user }) => {
    m.reply(`💰 Uang kamu: ${user.money}`);
};

const cekuang = cekmoney;
const money = cekmoney;

const ceklimit = async (conn, m, { user }) => {
    m.reply(`📊 Limit kamu: ${user.limit}`);
};

const limit = ceklimit;

const coinflip = async (conn, m, { args, user }) => {
    const choice = args[0]?.toLowerCase();
    if (!['heads', 'tails', 'h', 't'].includes(choice)) {
        return m.reply('Pilih heads (h) atau tails (t)!\nContoh: .coinflip h 100');
    }
    
    const bet = parseInt(args[1]) || 100;
    
    if (bet < 100) return m.reply('Minimal taruhan 100!');
    if (bet > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const userChoice = choice === 'h' ? 'heads' : choice === 't' ? 'tails' : choice;
    const win = result === userChoice;
    
    const emoji = result === 'heads' ? '👑' : '🦅';
    const profit = win ? bet : -bet;
    
    await updateUser(m.sender, { money: { increment: profit } });
    
    m.reply(`*🪙 Coin Flip*

${emoji} Hasil: ${result.toUpperCase()}
Pilihan: ${userChoice.toUpperCase()}

${win ? `🎉 Menang! +${bet}` : `😔 Kalah! -${bet}`}
Saldo: ${user.money + profit}`);
};

const cf = coinflip;

const dice = async (conn, m, { args, user }) => {
    const guess = parseInt(args[0]);
    if (!guess || guess < 1 || guess > 6) {
        return m.reply('Tebak angka 1-6!\nContoh: .dice 4 100');
    }
    
    const bet = parseInt(args[1]) || 100;
    
    if (bet < 100) return m.reply('Minimal taruhan 100!');
    if (bet > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    
    const result = Math.floor(Math.random() * 6) + 1;
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const win = result === guess;
    
    const profit = win ? bet * 5 : -bet;
    
    await updateUser(m.sender, { money: { increment: profit } });
    
    m.reply(`*🎲 Dice Game*

${diceEmojis[result - 1]} Hasil: ${result}
Tebakan: ${guess}

${win ? `🎉 Menang! +${bet * 5}` : `😔 Kalah! -${bet}`}
Saldo: ${user.money + profit}`);
};

const rps = async (conn, m, { args, user }) => {
    const choices = ['rock', 'paper', 'scissors', 'r', 'p', 's', 'batu', 'kertas', 'gunting'];
    const choice = args[0]?.toLowerCase();
    
    if (!choices.includes(choice)) {
        return m.reply('Pilih rock/paper/scissors!\nContoh: .rps rock 100');
    }
    
    const bet = parseInt(args[1]) || 100;
    
    if (bet < 100) return m.reply('Minimal taruhan 100!');
    if (bet > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    
    const normalize = (c) => {
        if (['r', 'rock', 'batu'].includes(c)) return 'rock';
        if (['p', 'paper', 'kertas'].includes(c)) return 'paper';
        return 'scissors';
    };
    
    const userChoice = normalize(choice);
    const botChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
    
    let result, profit;
    if (userChoice === botChoice) {
        result = 'Seri!';
        profit = 0;
    } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
    ) {
        result = '🎉 Menang!';
        profit = bet;
    } else {
        result = '😔 Kalah!';
        profit = -bet;
    }
    
    await updateUser(m.sender, { money: { increment: profit } });
    
    m.reply(`*✊✋✌️ Rock Paper Scissors*

Kamu: ${emojis[userChoice]} ${userChoice}
Bot: ${emojis[botChoice]} ${botChoice}

${result}
${profit !== 0 ? (profit > 0 ? `+${profit}` : profit) : ''}
Saldo: ${user.money + profit}`);
};

const suit = rps;

const math = async (conn, m, { args, user }) => {
    const mode = args[0]?.toLowerCase() || 'easy';
    const validModes = Object.keys(modes);
    
    if (!validModes.includes(mode)) {
        return m.reply(`*🧮 Mode tidak valid!*\n\nMode tersedia:\n${validModes.join(', ')}\n\nContoh: .math easy`);
    }
    
    const existingGame = await getActiveGame(m.chat || m.sender, 'math');
    if (existingGame) {
        return m.reply('Masih ada soal matematika yang belum dijawab!\nJawab dulu atau tunggu timeout.');
    }
    
    try {
        const question = await genMath(mode);
        
        const gameData = {
            soal: question.soal,
            jawaban: question.jawaban,
            mode: question.mode,
            hadiah: question.hadiah,
            timestamp: Date.now()
        };
        
        const timeoutMinutes = Math.ceil(question.waktu / 60000);
        await createActiveGame(m.chat || m.sender, 'math', gameData, [m.sender], timeoutMinutes);
        
        m.reply(`*🧮 Math Game*

*Mode:* ${mode}
*Soal:* ${question.soal} = ?
*Hadiah:* ${question.hadiah} uang
*Waktu:* ${question.waktu / 1000} detik

Ketik jawaban angka untuk menjawab!`);
    } catch (e) {
        console.error('Math game error:', e);
        m.reply('Gagal membuat soal matematika!');
    }
};

const matematik = math;
const matematika = math;

const mathanswer = async (conn, m, { user }) => {
    const answer = parseInt(m.text);
    if (isNaN(answer)) return;
    
    const game = await getActiveGame(m.chat || m.sender, 'math');
    if (!game) return;
    
    const gameData = game.gameData;
    
    if (answer === gameData.jawaban) {
        await deleteActiveGame(m.chat || m.sender, 'math');
        await updateUser(m.sender, { money: { increment: gameData.hadiah } });
        
        m.reply(`*🎉 Benar!*

*Jawaban:* ${gameData.jawaban}
*Hadiah:* +${gameData.hadiah} uang

Selamat @${m.sender.split('@')[0]}!`, { mentions: [m.sender] });
    }
};

module.exports = {
    tictactoe,
    ttt,
    tttmove,
    deletettt,
    slot,
    daily,
    weekly,
    transfer,
    tf,
    leaderboard,
    lb,
    top,
    profile,
    cekmoney,
    cekuang,
    money,
    ceklimit,
    limit,
    coinflip,
    cf,
    dice,
    rps,
    suit,
    math,
    matematik,
    matematika,
    mathanswer
};

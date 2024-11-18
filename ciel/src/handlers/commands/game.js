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

const casino = async (conn, m, { args, user }) => {
    const bet = parseInt(args[0]);
    
    if (!bet || isNaN(bet)) {
        return m.reply('Masukkan jumlah taruhan!\nContoh: .casino 1000');
    }
    
    if (bet < 100) return m.reply('Minimal taruhan 100!');
    if (bet > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    if (user.limit < 1) return m.reply('Limit kamu habis! Klaim daily atau beli limit.');
    
    await updateUser(m.sender, { 
        limit: { decrement: 1 },
        money: { decrement: bet }
    });
    
    const botPoint = Math.floor(Math.random() * 101);
    const playerPoint = Math.floor(Math.random() * 81);
    
    let result, winnings = 0;
    
    if (botPoint > playerPoint) {
        result = '😔 *You LOSE*';
        winnings = 0;
    } else if (botPoint < playerPoint) {
        result = '🎉 *You WIN*';
        winnings = bet * 2;
        await updateUser(m.sender, { money: { increment: winnings } });
    } else {
        result = '🤝 *SERI*';
        winnings = bet;
        await updateUser(m.sender, { money: { increment: winnings } });
    }
    
    const newBalance = user.money - bet + winnings;
    
    m.reply(`*💰 Casino 💰*

*Kamu:* ${playerPoint} Point
*Computer:* ${botPoint} Point

${result}
${winnings > bet ? `Menang: +${winnings - bet}` : winnings === 0 ? `Kalah: -${bet}` : 'Taruhan dikembalikan'}
Saldo: ${newBalance}`);
};

const samgong = async (conn, m, { args, user }) => {
    const bet = parseInt(args[0]);
    
    if (!bet || isNaN(bet)) {
        return m.reply('Masukkan jumlah taruhan!\nContoh: .samgong 5000');
    }
    
    if (bet < 5000) return m.reply('Minimal taruhan 5000!');
    if (bet > user.money) return m.reply(`Uang kamu tidak cukup!\nUang: ${user.money}`);
    if (user.limit < 1) return m.reply('Limit kamu habis! Klaim daily atau beli limit.');
    
    await updateUser(m.sender, { 
        limit: { decrement: 1 },
        money: { decrement: bet }
    });
    
    const suits = ['♥️', '♦️', '♣️', '♠️'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    const getCard = () => {
        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        const suit = suits[Math.floor(Math.random() * suits.length)];
        return { rank, suit, display: `${rank}${suit}` };
    };
    
    const calcScore = (cards) => {
        return cards.reduce((sum, card) => {
            if (['J', 'Q', 'K'].includes(card.rank)) return sum + 10;
            if (card.rank === 'A') return sum + 1;
            return sum + parseInt(card.rank);
        }, 0) % 10;
    };
    
    const playerCards = [getCard(), getCard(), getCard()];
    const botCards = [getCard(), getCard(), getCard()];
    
    const playerScore = calcScore(playerCards);
    const botScore = calcScore(botCards);
    
    let result, winnings = 0;
    
    if (playerScore > botScore) {
        winnings = Math.floor(bet * 2.5);
        result = `🎉 *Kamu menang!* +${winnings - bet}`;
        await updateUser(m.sender, { money: { increment: winnings } });
    } else if (playerScore < botScore) {
        winnings = 0;
        result = `😔 *Bot menang!* -${bet}`;
    } else {
        winnings = bet;
        result = '🤝 *Seri!* Taruhan dikembalikan';
        await updateUser(m.sender, { money: { increment: bet } });
    }
    
    const newBalance = user.money - bet + winnings;
    
    m.reply(`*🃏 Samgong 🃏*

*Kartu Kamu:* ${playerCards.map(c => c.display).join(' ')}
*Score:* ${playerScore}

*Kartu Bot:* ${botCards.map(c => c.display).join(' ')}
*Score:* ${botScore}

${result}
Saldo: ${newBalance}`);
};

const merampok = async (conn, m, { args, user }) => {
    if (!m.isGroup) return m.reply(settings.messages.group);
    if (user.limit < 1) return m.reply('Limit kamu habis! Klaim daily atau beli limit.');
    
    const target = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
    if (!target) return m.reply('Tag target yang ingin dirampok!\nContoh: .merampok @user');
    if (target === m.sender) return m.reply('Tidak bisa merampok diri sendiri!');
    
    const now = new Date();
    const lastRampok = user.lastRampok ? new Date(user.lastRampok) : null;
    
    if (lastRampok) {
        const diff = now - lastRampok;
        const hoursPassed = diff / (1000 * 60 * 60);
        
        if (hoursPassed < 1) {
            const minutesLeft = Math.ceil(60 - (diff / (1000 * 60)));
            return m.reply(`⏰ Kamu sudah merampok dan sedang bersembunyi!\nTunggu ${minutesLeft} menit lagi.`);
        }
    }
    
    const targetUser = await getOrCreateUser(target, null);
    if (!targetUser) return m.reply('Target tidak terdaftar di database!');
    if (targetUser.money < 10000) return m.reply('Target terlalu miskin untuk dirampok! 💀');
    
    await updateUser(m.sender, { limit: { decrement: 1 } });
    
    const dapat = Math.floor(Math.random() * 10000) + 1000;
    const actualDapat = Math.min(dapat, targetUser.money);
    
    await updateUser(target, { money: { decrement: actualDapat } });
    await updateUser(m.sender, { 
        money: { increment: actualDapat },
        lastRampok: now
    });
    
    m.reply(`*🔫 Merampok*

Berhasil merampok @${target.split('@')[0]}!
💰 Dapat: +${actualDapat} uang

Saldo: ${user.money + actualDapat}`, { mentions: [target] });
};

const rampok = merampok;

const begal = async (conn, m, { user }) => {
    if (user.limit < 1) return m.reply('Limit kamu habis! Klaim daily atau beli limit.');
    
    const now = new Date();
    const lastBegal = user.lastBegal ? new Date(user.lastBegal) : null;
    
    if (lastBegal) {
        const diff = now - lastBegal;
        const hoursPassed = diff / (1000 * 60 * 60);
        
        if (hoursPassed < 1) {
            const minutesLeft = Math.ceil(60 - (diff / (1000 * 60)));
            return m.reply(`⏰ Kamu sedang bersembunyi dari polisi!\nTunggu ${minutesLeft} menit lagi.`);
        }
    }
    
    await updateUser(m.sender, { limit: { decrement: 1 } });
    
    const randomUang = Math.floor(Math.random() * 10001);
    const outcomes = [
        { text: 'Pemain Berhasil Kabur!', type: 'fail' },
        { text: 'Pemain Melarikan Diri!', type: 'fail' },
        { text: 'Pemain Bersembunyi!', type: 'fail' },
        { text: 'Pemain Bunuh Diri!', type: 'lose' },
        { text: 'Pemain Berhasil Tertangkap!', type: 'win' },
        { text: 'Pemain Tidak Ditemukan!', type: 'fail' },
        { text: 'Pemain Lebih Kuat Dari Kamu!', type: 'lose' },
        { text: 'Pemain Menggunakan Cheat!', type: 'lose' },
        { text: 'Pemain Lapor Polisi!', type: 'fail' },
        { text: 'Pemain Tertangkap!', type: 'win' },
        { text: 'Pemain Menyerahkan Diri!', type: 'win' }
    ];
    
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    let result, profit = 0;
    
    if (outcome.type === 'win') {
        profit = randomUang;
        result = `🎉 ${outcome.text}\n\nBerhasil mendapatkan: +${randomUang} uang`;
        await updateUser(m.sender, { 
            money: { increment: randomUang },
            lastBegal: now
        });
    } else if (outcome.type === 'lose') {
        profit = -randomUang;
        result = `💀 ${outcome.text}\n\nKamu kehilangan: -${randomUang} uang`;
        await updateUser(m.sender, { money: { decrement: randomUang } });
    } else {
        result = `😅 ${outcome.text}\n\nGagal membegal, coba lagi!`;
    }
    
    m.reply(`*🔪 Begal*

${result}
Saldo: ${user.money + profit}`);
};

const buylimit = async (conn, m, { args, user }) => {
    const amount = parseInt(args[0]);
    
    if (!amount || isNaN(amount)) {
        return m.reply(`*💳 Buy Limit*

Harga: 1 limit = 500 uang

Contoh: .buylimit 10
(Beli 10 limit = 5000 uang)

Uang kamu: ${user.money}`);
    }
    
    if (amount < 1) return m.reply('Minimal beli 1 limit!');
    
    const price = amount * 500;
    
    if (price > user.money) {
        return m.reply(`Uang kamu tidak cukup!
Harga ${amount} limit: ${price}
Uang kamu: ${user.money}`);
    }
    
    await updateUser(m.sender, { 
        money: { decrement: price },
        limit: { increment: amount }
    });
    
    m.reply(`*💳 Buy Limit Berhasil!*

Beli: ${amount} limit
Harga: -${price} uang

Limit sekarang: ${user.limit + amount}
Saldo: ${user.money - price}`);
};

const beli = buylimit;
const buy = buylimit;

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
    mathanswer,
    casino,
    samgong,
    merampok,
    rampok,
    begal,
    buylimit,
    beli,
    buy
};

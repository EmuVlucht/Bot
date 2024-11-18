const { PrismaClient } = require('@prisma/client');
const settings = require('../../config/settings');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

async function connectDatabase() {
    try {
        await prisma.$connect();
        console.log('✅ Database PostgreSQL terhubung!');
        return true;
    } catch (error) {
        console.error('❌ Gagal menghubungkan database:', error.message);
        return false;
    }
}

async function disconnectDatabase() {
    await prisma.$disconnect();
    console.log('Database terputus');
}

async function getOrCreateUser(jid, name = null) {
    try {
        let user = await prisma.user.findUnique({ where: { jid } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    jid,
                    name,
                    limit: settings.limits.free,
                    money: settings.money.free
                }
            });
        } else if (name && user.name !== name) {
            user = await prisma.user.update({
                where: { jid },
                data: { name }
            });
        }
        return user;
    } catch (error) {
        console.error('Error getOrCreateUser:', error);
        return null;
    }
}

async function getUser(jid) {
    try {
        return await prisma.user.findUnique({ where: { jid } });
    } catch (error) {
        console.error('Error getUser:', error);
        return null;
    }
}

async function updateUser(jid, data) {
    try {
        return await prisma.user.update({
            where: { jid },
            data
        });
    } catch (error) {
        console.error('Error updateUser:', error);
        return null;
    }
}

async function getOrCreateGroup(jid, name = null) {
    try {
        let group = await prisma.group.findUnique({ where: { jid } });
        if (!group) {
            group = await prisma.group.create({
                data: { jid, name }
            });
        } else if (name && group.name !== name) {
            group = await prisma.group.update({
                where: { jid },
                data: { name }
            });
        }
        return group;
    } catch (error) {
        console.error('Error getOrCreateGroup:', error);
        return null;
    }
}

async function getGroup(jid) {
    try {
        return await prisma.group.findUnique({ where: { jid } });
    } catch (error) {
        console.error('Error getGroup:', error);
        return null;
    }
}

async function updateGroup(jid, data) {
    try {
        return await prisma.group.update({
            where: { jid },
            data
        });
    } catch (error) {
        console.error('Error updateGroup:', error);
        return null;
    }
}

async function getOrCreateBotSettings(botJid) {
    try {
        let botSettings = await prisma.botSettings.findUnique({ where: { botJid } });
        if (!botSettings) {
            botSettings = await prisma.botSettings.create({
                data: {
                    botJid,
                    owner: settings.owner,
                    botName: settings.botInfo.name,
                    author: settings.botInfo.author,
                    packname: settings.botInfo.packname
                }
            });
        }
        return botSettings;
    } catch (error) {
        console.error('Error getOrCreateBotSettings:', error);
        return null;
    }
}

async function updateBotSettings(botJid, data) {
    try {
        return await prisma.botSettings.update({
            where: { botJid },
            data
        });
    } catch (error) {
        console.error('Error updateBotSettings:', error);
        return null;
    }
}

async function addPremium(userJid, days) {
    try {
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + days);
        
        const existing = await prisma.premium.findUnique({ where: { userJid } });
        if (existing) {
            const newExpiry = new Date(existing.expiredAt);
            newExpiry.setDate(newExpiry.getDate() + days);
            await prisma.premium.update({
                where: { userJid },
                data: { expiredAt: newExpiry }
            });
        } else {
            await prisma.premium.create({
                data: { userJid, expiredAt }
            });
        }
        
        await prisma.user.update({
            where: { jid: userJid },
            data: {
                premium: true,
                premiumExpiry: expiredAt,
                limit: settings.limits.premium,
                money: { increment: settings.money.premium - settings.money.free }
            }
        });
        
        return true;
    } catch (error) {
        console.error('Error addPremium:', error);
        return false;
    }
}

async function removePremium(userJid) {
    try {
        await prisma.premium.delete({ where: { userJid } });
        await prisma.user.update({
            where: { jid: userJid },
            data: {
                premium: false,
                premiumExpiry: null,
                limit: settings.limits.free
            }
        });
        return true;
    } catch (error) {
        console.error('Error removePremium:', error);
        return false;
    }
}

async function isPremium(userJid) {
    try {
        const premium = await prisma.premium.findUnique({ where: { userJid } });
        if (!premium) return false;
        if (new Date() > premium.expiredAt) {
            await removePremium(userJid);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error isPremium:', error);
        return false;
    }
}

async function listPremium() {
    try {
        return await prisma.premium.findMany({
            include: { }
        });
    } catch (error) {
        console.error('Error listPremium:', error);
        return [];
    }
}

async function addSewa(groupJid, groupUrl, days) {
    try {
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + days);
        
        const existing = await prisma.sewa.findUnique({ where: { groupJid } });
        if (existing) {
            const newExpiry = new Date(existing.expiredAt);
            newExpiry.setDate(newExpiry.getDate() + days);
            return await prisma.sewa.update({
                where: { groupJid },
                data: { expiredAt: newExpiry, groupUrl }
            });
        }
        
        return await prisma.sewa.create({
            data: { groupJid, groupUrl, expiredAt }
        });
    } catch (error) {
        console.error('Error addSewa:', error);
        return null;
    }
}

async function removeSewa(groupJid) {
    try {
        await prisma.sewa.delete({ where: { groupJid } });
        return true;
    } catch (error) {
        console.error('Error removeSewa:', error);
        return false;
    }
}

async function getSewa(groupJid) {
    try {
        return await prisma.sewa.findUnique({ where: { groupJid } });
    } catch (error) {
        console.error('Error getSewa:', error);
        return null;
    }
}

async function listSewa() {
    try {
        return await prisma.sewa.findMany();
    } catch (error) {
        console.error('Error listSewa:', error);
        return [];
    }
}

async function addHit(command) {
    try {
        await prisma.hit.upsert({
            where: { command },
            create: { command, count: 1 },
            update: { count: { increment: 1 } }
        });
        
        await prisma.totalHit.upsert({
            where: { id: 'total' },
            create: { totalCmd: 1, todayCmd: 1 },
            update: {
                totalCmd: { increment: 1 },
                todayCmd: { increment: 1 }
            }
        });
        
        return true;
    } catch (error) {
        console.error('Error addHit:', error);
        return false;
    }
}

async function resetDailyHit() {
    try {
        await prisma.totalHit.update({
            where: { id: 'total' },
            data: { todayCmd: 0, lastReset: new Date() }
        });
        return true;
    } catch (error) {
        console.error('Error resetDailyHit:', error);
        return false;
    }
}

async function getHitStats() {
    try {
        const total = await prisma.totalHit.findUnique({ where: { id: 'total' } });
        const topCommands = await prisma.hit.findMany({
            orderBy: { count: 'desc' },
            take: 10
        });
        return { total, topCommands };
    } catch (error) {
        console.error('Error getHitStats:', error);
        return { total: null, topCommands: [] };
    }
}

async function addWarn(groupJid, userJid, reason = null) {
    try {
        const group = await getOrCreateGroup(groupJid);
        const warn = await prisma.groupWarn.upsert({
            where: {
                groupId_userJid: {
                    groupId: group.id,
                    userJid
                }
            },
            create: {
                groupId: group.id,
                userJid,
                reason,
                count: 1
            },
            update: {
                count: { increment: 1 },
                reason
            }
        });
        return warn;
    } catch (error) {
        console.error('Error addWarn:', error);
        return null;
    }
}

async function removeWarn(groupJid, userJid) {
    try {
        const group = await getGroup(groupJid);
        if (!group) return false;
        
        await prisma.groupWarn.delete({
            where: {
                groupId_userJid: {
                    groupId: group.id,
                    userJid
                }
            }
        });
        return true;
    } catch (error) {
        console.error('Error removeWarn:', error);
        return false;
    }
}

async function getWarn(groupJid, userJid) {
    try {
        const group = await getGroup(groupJid);
        if (!group) return null;
        
        return await prisma.groupWarn.findUnique({
            where: {
                groupId_userJid: {
                    groupId: group.id,
                    userJid
                }
            }
        });
    } catch (error) {
        console.error('Error getWarn:', error);
        return null;
    }
}

async function createActiveGame(chatJid, gameType, gameData, players, expiresInMinutes = 30) {
    try {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);
        
        return await prisma.activeGame.upsert({
            where: {
                chatJid_gameType: { chatJid, gameType }
            },
            create: {
                chatJid,
                gameType,
                gameData,
                players,
                expiresAt
            },
            update: {
                gameData,
                players,
                expiresAt
            }
        });
    } catch (error) {
        console.error('Error createActiveGame:', error);
        return null;
    }
}

async function getActiveGame(chatJid, gameType) {
    try {
        const game = await prisma.activeGame.findUnique({
            where: {
                chatJid_gameType: { chatJid, gameType }
            }
        });
        
        if (game && new Date() > game.expiresAt) {
            await deleteActiveGame(chatJid, gameType);
            return null;
        }
        
        return game;
    } catch (error) {
        console.error('Error getActiveGame:', error);
        return null;
    }
}

async function updateActiveGame(chatJid, gameType, gameData) {
    try {
        return await prisma.activeGame.update({
            where: {
                chatJid_gameType: { chatJid, gameType }
            },
            data: { gameData }
        });
    } catch (error) {
        console.error('Error updateActiveGame:', error);
        return null;
    }
}

async function deleteActiveGame(chatJid, gameType) {
    try {
        await prisma.activeGame.delete({
            where: {
                chatJid_gameType: { chatJid, gameType }
            }
        });
        return true;
    } catch (error) {
        console.error('Error deleteActiveGame:', error);
        return false;
    }
}

async function cleanupExpiredData() {
    try {
        const now = new Date();
        
        const expiredPremiums = await prisma.premium.findMany({
            where: { expiredAt: { lt: now } }
        });
        for (const prem of expiredPremiums) {
            await removePremium(prem.userJid);
        }
        
        await prisma.activeGame.deleteMany({
            where: { expiresAt: { lt: now } }
        });
        
        await prisma.mediaCache.deleteMany({
            where: { expiresAt: { lt: now } }
        });
        
        console.log('✅ Cleanup expired data selesai');
        return true;
    } catch (error) {
        console.error('Error cleanupExpiredData:', error);
        return false;
    }
}

async function resetDailyLimits() {
    try {
        const users = await prisma.user.findMany();
        
        for (const user of users) {
            let newLimit = settings.limits.free;
            if (user.vip) {
                newLimit = settings.limits.vip;
            } else if (await isPremium(user.jid)) {
                newLimit = settings.limits.premium;
            }
            
            if (user.limit < newLimit) {
                await prisma.user.update({
                    where: { jid: user.jid },
                    data: { limit: newLimit }
                });
            }
        }
        
        await resetDailyHit();
        console.log('✅ Reset daily limits selesai');
        return true;
    } catch (error) {
        console.error('Error resetDailyLimits:', error);
        return false;
    }
}

async function checkExpiredSewa(conn) {
    try {
        const now = new Date();
        const expiredSewas = await prisma.sewa.findMany({
            where: { expiredAt: { lt: now } }
        });
        
        for (const sewa of expiredSewas) {
            if (conn) {
                try {
                    await conn.groupLeave(sewa.groupJid);
                    console.log(`Left group ${sewa.groupJid} (sewa expired)`);
                } catch (e) {
                    console.error(`Error leaving group ${sewa.groupJid}:`, e.message);
                }
            }
            await removeSewa(sewa.groupJid);
        }
        
        return expiredSewas.length;
    } catch (error) {
        console.error('Error checkExpiredSewa:', error);
        return 0;
    }
}

module.exports = {
    prisma,
    connectDatabase,
    disconnectDatabase,
    getOrCreateUser,
    getUser,
    updateUser,
    getOrCreateGroup,
    getGroup,
    updateGroup,
    getOrCreateBotSettings,
    updateBotSettings,
    addPremium,
    removePremium,
    isPremium,
    listPremium,
    addSewa,
    removeSewa,
    getSewa,
    listSewa,
    addHit,
    resetDailyHit,
    getHitStats,
    addWarn,
    removeWarn,
    getWarn,
    createActiveGame,
    getActiveGame,
    updateActiveGame,
    deleteActiveGame,
    cleanupExpiredData,
    resetDailyLimits,
    checkExpiredSewa
};

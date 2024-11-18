const { PrismaClient } = require('@prisma/client');
const toMs = require('ms');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

prisma.$connect()
    .then(() => console.log('✅ Connected to PostgreSQL via Prisma'))
    .catch((e) => {
        console.error('❌ Failed to connect to PostgreSQL:', e.message);
        process.exit(1);
    });

const UserDB = {
    async get(jid) {
        let user = await prisma.user.findUnique({ where: { jid } });
        if (!user) {
            user = await prisma.user.create({
                data: {
                    jid,
                    limit: global.limit?.free || 20,
                    money: global.money?.free || 10000,
                    lastclaim: Date.now(),
                    lastbegal: Date.now(),
                    lastrampok: Date.now(),
                }
            });
        }
        return user;
    },

    async update(jid, data) {
        return prisma.user.upsert({
            where: { jid },
            update: data,
            create: { jid, ...data }
        });
    },

    async getAll() {
        return prisma.user.findMany();
    },

    async resetLimits(limitFree, limitPremium, limitVip) {
        const users = await prisma.user.findMany();
        const premiums = await PremiumDB.getAll();
        const premiumJids = premiums.map(p => p.jid);

        for (const user of users) {
            let newLimit = limitFree;
            if (user.vip) newLimit = limitVip;
            else if (premiumJids.includes(user.jid)) newLimit = limitPremium;

            if (user.limit < newLimit) {
                await prisma.user.update({
                    where: { jid: user.jid },
                    data: { limit: newLimit }
                });
            }
        }
    }
};

const GroupDB = {
    async get(jid) {
        let group = await prisma.group.findUnique({ where: { jid } });
        if (!group) {
            group = await prisma.group.create({
                data: { jid }
            });
        }
        return group;
    },

    async update(jid, data) {
        return prisma.group.upsert({
            where: { jid },
            update: data,
            create: { jid, ...data }
        });
    },

    async getAll() {
        return prisma.group.findMany();
    }
};

const BotSettingsDB = {
    async get(botJid) {
        let settings = await prisma.botSettings.findUnique({ where: { botJid } });
        if (!settings) {
            settings = await prisma.botSettings.create({
                data: {
                    botJid,
                    author: global.author || 'Nazedev',
                    botname: global.botname || 'Naze Bot',
                    packname: global.packname || 'Bot WhatsApp',
                    owners: JSON.stringify(global.owner?.map(id => ({ id, lock: true })) || [])
                }
            });
        }
        return {
            ...settings,
            owners: typeof settings.owners === 'string' ? JSON.parse(settings.owners) : settings.owners
        };
    },

    async update(botJid, data) {
        if (data.owners && typeof data.owners !== 'string') {
            data.owners = JSON.stringify(data.owners);
        }
        return prisma.botSettings.upsert({
            where: { botJid },
            update: data,
            create: { botJid, ...data }
        });
    }
};

const PremiumDB = {
    async add(jid, duration) {
        const expired = Date.now() + toMs(duration);
        const existing = await prisma.premium.findUnique({ where: { jid } });
        
        if (existing) {
            return prisma.premium.update({
                where: { jid },
                data: { expired: existing.expired + toMs(duration) }
            });
        }
        
        return prisma.premium.create({
            data: { jid, expired }
        });
    },

    async check(jid) {
        const premium = await prisma.premium.findUnique({ where: { jid } });
        return premium && premium.expired > Date.now();
    },

    async get(jid) {
        return prisma.premium.findUnique({ where: { jid } });
    },

    async getAll() {
        return prisma.premium.findMany();
    },

    async remove(jid) {
        return prisma.premium.delete({ where: { jid } }).catch(() => null);
    },

    async cleanExpired() {
        return prisma.premium.deleteMany({
            where: { expired: { lt: Date.now() } }
        });
    }
};

const SewaDB = {
    async add(jid, duration) {
        const expired = Date.now() + toMs(duration);
        const existing = await prisma.sewa.findUnique({ where: { jid } });
        
        if (existing) {
            return prisma.sewa.update({
                where: { jid },
                data: { expired: existing.expired + toMs(duration) }
            });
        }
        
        return prisma.sewa.create({
            data: { jid, expired }
        });
    },

    async check(jid) {
        const sewa = await prisma.sewa.findUnique({ where: { jid } });
        return sewa && sewa.expired > Date.now();
    },

    async get(jid) {
        return prisma.sewa.findUnique({ where: { jid } });
    },

    async getAll() {
        return prisma.sewa.findMany();
    },

    async remove(jid) {
        return prisma.sewa.delete({ where: { jid } }).catch(() => null);
    },

    async cleanExpired(conn) {
        const expiredSewas = await prisma.sewa.findMany({
            where: { expired: { lt: Date.now() } }
        });
        
        for (const sewa of expiredSewas) {
            if (conn) {
                try {
                    await conn.groupLeave(sewa.jid);
                } catch (e) {}
            }
            await prisma.sewa.delete({ where: { jid: sewa.jid } });
        }
        
        return expiredSewas.length;
    }
};

const HitDB = {
    async addCommand(command) {
        await prisma.commandHit.upsert({
            where: { command },
            update: { count: { increment: 1 } },
            create: { command, count: 1 }
        });
    },

    async addTotal(botJid) {
        await prisma.totalHit.upsert({
            where: { botJid },
            update: { 
                totalcmd: { increment: 1 },
                todaycmd: { increment: 1 }
            },
            create: { botJid, totalcmd: 1, todaycmd: 1 }
        });
    },

    async resetToday(botJid) {
        await prisma.totalHit.update({
            where: { botJid },
            data: { todaycmd: 0 }
        });
    },

    async getStats(botJid) {
        const total = await prisma.totalHit.findUnique({ where: { botJid } });
        const commands = await prisma.commandHit.findMany({
            orderBy: { count: 'desc' },
            take: 10
        });
        return { total, topCommands: commands };
    }
};

const GameDB = {
    async get(chatJid, gameType) {
        const game = await prisma.gameSession.findUnique({
            where: { chatJid_gameType: { chatJid, gameType } }
        });
        return game?.data || null;
    },

    async set(chatJid, gameType, data) {
        return prisma.gameSession.upsert({
            where: { chatJid_gameType: { chatJid, gameType } },
            update: { data },
            create: { chatJid, gameType, data }
        });
    },

    async delete(chatJid, gameType) {
        return prisma.gameSession.delete({
            where: { chatJid_gameType: { chatJid, gameType } }
        }).catch(() => null);
    },

    async getByType(gameType) {
        return prisma.gameSession.findMany({
            where: { gameType }
        });
    }
};

const StoreDB = {
    async get(key) {
        const store = await prisma.store.findUnique({ where: { key } });
        return store?.data || null;
    },

    async set(key, data) {
        return prisma.store.upsert({
            where: { key },
            update: { data },
            create: { key, data }
        });
    },

    async delete(key) {
        return prisma.store.delete({ where: { key } }).catch(() => null);
    }
};

const ContactDB = {
    async get(jid) {
        return prisma.contact.findUnique({ where: { jid } });
    },

    async set(jid, name, lid = null) {
        return prisma.contact.upsert({
            where: { jid },
            update: { name, lid },
            create: { jid, name, lid }
        });
    },

    async getAll() {
        return prisma.contact.findMany();
    }
};

const GroupMetadataDB = {
    async get(jid) {
        const metadata = await prisma.groupMetadata.findUnique({ where: { jid } });
        return metadata?.data || null;
    },

    async set(jid, data) {
        return prisma.groupMetadata.upsert({
            where: { jid },
            update: { data },
            create: { jid, data }
        });
    },

    async delete(jid) {
        return prisma.groupMetadata.delete({ where: { jid } }).catch(() => null);
    },

    async getAll() {
        const all = await prisma.groupMetadata.findMany();
        const result = {};
        for (const item of all) {
            result[item.jid] = item.data;
        }
        return result;
    }
};

const MessageDB = {
    async save(messageId, chatJid, senderJid, content, timestamp) {
        return prisma.message.upsert({
            where: { messageId_chatJid: { messageId, chatJid } },
            update: { content, timestamp },
            create: { messageId, chatJid, senderJid, content, timestamp }
        });
    },

    async get(chatJid, messageId) {
        return prisma.message.findUnique({
            where: { messageId_chatJid: { messageId, chatJid } }
        });
    },

    async getByChat(chatJid, limit = 100) {
        return prisma.message.findMany({
            where: { chatJid },
            orderBy: { timestamp: 'desc' },
            take: limit
        });
    },

    async cleanup(olderThanDays = 7) {
        const threshold = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        return prisma.message.deleteMany({
            where: { timestamp: { lt: threshold } }
        });
    }
};

const AuthSessionDB = {
    async get(sessionId) {
        const session = await prisma.authSession.findUnique({ where: { sessionId } });
        return session?.data || null;
    },

    async set(sessionId, data) {
        return prisma.authSession.upsert({
            where: { sessionId },
            update: { data },
            create: { sessionId, data }
        });
    },

    async delete(sessionId) {
        return prisma.authSession.delete({ where: { sessionId } }).catch(() => null);
    }
};

async function loadDatabase(botJid) {
    const [settings, users, groups, premiums, sewas, hits] = await Promise.all([
        BotSettingsDB.get(botJid),
        UserDB.getAll(),
        GroupDB.getAll(),
        PremiumDB.getAll(),
        SewaDB.getAll(),
        HitDB.getStats(botJid)
    ]);

    const usersMap = {};
    for (const user of users) {
        usersMap[user.jid] = user;
    }

    const groupsMap = {};
    for (const group of groups) {
        groupsMap[group.jid] = {
            ...group,
            warns: typeof group.warns === 'string' ? JSON.parse(group.warns) : group.warns,
            tagsw: typeof group.tagsw === 'string' ? JSON.parse(group.tagsw) : group.tagsw,
            text: {
                setwelcome: group.textWelcome,
                setleave: group.textLeave,
                setpromote: group.textPromote,
                setdemote: group.textDemote
            }
        };
    }

    const settingsMap = {};
    settingsMap[botJid] = settings;

    return {
        set: settingsMap,
        users: usersMap,
        groups: groupsMap,
        premium: premiums,
        sewa: sewas,
        hit: hits.total || { totalcmd: 0, todaycmd: 0 },
        game: {},
        cmd: {},
        store: {},
        database: {}
    };
}

async function loadStore() {
    const [contacts, groupMetadata] = await Promise.all([
        ContactDB.getAll(),
        GroupMetadataDB.getAll()
    ]);

    const contactsMap = {};
    for (const contact of contacts) {
        contactsMap[contact.jid] = contact;
    }

    return {
        contacts: contactsMap,
        presences: {},
        messages: {},
        groupMetadata
    };
}

module.exports = {
    prisma,
    UserDB,
    GroupDB,
    BotSettingsDB,
    PremiumDB,
    SewaDB,
    HitDB,
    GameDB,
    StoreDB,
    ContactDB,
    GroupMetadataDB,
    MessageDB,
    AuthSessionDB,
    loadDatabase,
    loadStore
};

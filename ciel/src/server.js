const express = require('express');
const { createServer } = require('http');
const settings = require('../config/settings');
const { runtime } = require('./utils/functions');
const pkg = require('../package.json');

const app = express();
const server = createServer(app);

app.use(express.json());

let botInstance = null;
const startTime = Date.now();

const startServer = (conn) => {
    botInstance = conn;
    
    const PORT = settings.server.port;
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Server berjalan di port ${PORT}`);
    });
};

app.get('/', (req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.json({
        status: 'online',
        bot_name: pkg.name,
        version: pkg.version,
        author: pkg.author,
        uptime: runtime(uptime),
        uptime_seconds: uptime,
        connected: !!botInstance?.user,
        user: botInstance?.user?.name || null
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: botInstance?.user ? 'healthy' : 'starting',
        timestamp: new Date().toISOString()
    });
});

app.get('/stats', async (req, res) => {
    try {
        const { getHitStats } = require('./services/database');
        const stats = await getHitStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

app.post('/send', async (req, res) => {
    if (!botInstance) {
        return res.status(503).json({
            success: false,
            error: 'Bot tidak terhubung'
        });
    }
    
    const { to, message } = req.body;
    
    if (!to || !message) {
        return res.status(400).json({
            success: false,
            error: 'Parameter "to" dan "message" diperlukan'
        });
    }
    
    try {
        const jid = to.includes('@') ? to : `${to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
        await botInstance.sendMessage(jid, { text: message });
        res.json({
            success: true,
            message: 'Pesan terkirim'
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

app.get('/groups', async (req, res) => {
    if (!botInstance) {
        return res.status(503).json({
            success: false,
            error: 'Bot tidak terhubung'
        });
    }
    
    try {
        const groups = await botInstance.groupFetchAllParticipating();
        const groupList = Object.values(groups).map(g => ({
            id: g.id,
            subject: g.subject,
            participants: g.participants?.length || 0
        }));
        
        res.json({
            success: true,
            count: groupList.length,
            groups: groupList
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            error: e.message
        });
    }
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${settings.server.port} sudah digunakan!`);
    } else {
        console.error('Server error:', error);
    }
});

module.exports = { app, server, startServer };

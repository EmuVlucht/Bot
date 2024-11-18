const express = require('express');
const { createServer } = require('http');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const packageInfo = require('../package.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all('/', (req, res) => {
    if (process.send) {
        process.send('uptime');
        process.once('message', (uptime) => {
            res.json({
                status: 'online',
                bot_name: packageInfo.name,
                version: packageInfo.version,
                author: packageInfo.author,
                description: packageInfo.description,
                uptime: `${Math.floor(uptime)} seconds`,
                platform: global.platform || 'unknown',
                database: 'PostgreSQL (Prisma)',
                timestamp: new Date().toISOString()
            });
        });
    } else {
        res.json({ 
            status: 'online',
            bot_name: packageInfo.name,
            version: packageInfo.version,
            message: 'Process not running with IPC',
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

app.all('/process', (req, res) => {
    const { send } = req.query;
    if (!send) return res.status(400).json({ error: 'Missing send query' });
    if (process.send) {
        process.send(send);
        res.json({ status: 'Send', data: send });
    } else res.json({ error: 'Process not running with IPC' });
});

app.all('/chat', (req, res) => {
    const { message, to } = req.query;
    if (!message || !to) return res.status(400).json({ error: 'Missing message or to query' });
    res.json({ status: 200, mess: 'does not start' });
});

app.get('/stats', async (req, res) => {
    try {
        const { HitDB } = require('./database');
        const botJid = global.db?.set ? Object.keys(global.db.set)[0] : null;
        if (!botJid) {
            return res.json({ error: 'Bot not initialized' });
        }
        const stats = await HitDB.getStats(botJid);
        res.json({
            status: 'success',
            data: stats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.path
    });
});

module.exports = { app, server, PORT };

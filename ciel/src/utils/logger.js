const chalk = require('chalk');
const moment = require('moment-timezone');

const getTimestamp = () => {
    return moment.tz('Asia/Jakarta').format('HH:mm:ss');
};

const logger = {
    info: (message) => {
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.blue('[INFO]')} ${message}`);
    },
    
    success: (message) => {
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.green('[SUCCESS]')} ${message}`);
    },
    
    warn: (message) => {
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.yellow('[WARN]')} ${message}`);
    },
    
    error: (message) => {
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.red('[ERROR]')} ${message}`);
    },
    
    incoming: (message) => {
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.cyan('[INCOMING]')} ${message}`);
    },
    
    outgoing: (message) => {
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.magenta('[OUTGOING]')} ${message}`);
    },
    
    command: (cmd, user, isGroup) => {
        const type = isGroup ? 'Group' : 'Private';
        console.log(`${chalk.gray(`[${getTimestamp()}]`)} ${chalk.green('[CMD]')} ${chalk.yellow(cmd)} from ${chalk.cyan(user)} (${type})`);
    },
    
    banner: () => {
        console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║                                       ║
║     ██████╗██╗███████╗██╗             ║
║    ██╔════╝██║██╔════╝██║             ║
║    ██║     ██║█████╗  ██║             ║
║    ██║     ██║██╔══╝  ██║             ║
║    ╚██████╗██║███████╗███████╗        ║
║     ╚═════╝╚═╝╚══════╝╚══════╝        ║
║                                       ║
║    WhatsApp Bot with PostgreSQL       ║
║         Powered by Baileys            ║
╚═══════════════════════════════════════╝
        `));
    },
    
    systemInfo: (info) => {
        console.log(chalk.green('╔════════════════════════════════════'));
        console.log(chalk.green('║') + chalk.cyan(' System Information'));
        console.log(chalk.green('╠════════════════════════════════════'));
        console.log(chalk.green('║') + ` OS: ${chalk.yellow(info.os)}`);
        console.log(chalk.green('║') + ` Platform: ${chalk.yellow(info.platform)}`);
        console.log(chalk.green('║') + ` Node.js: ${chalk.yellow(info.nodeVersion)}`);
        console.log(chalk.green('║') + ` Memory: ${chalk.yellow(info.memory)}`);
        console.log(chalk.green('║') + ` CPU: ${chalk.yellow(info.cpu)}`);
        console.log(chalk.green('║') + ` Date: ${chalk.yellow(info.date)}`);
        console.log(chalk.green('╚════════════════════════════════════'));
    }
};

module.exports = { logger };

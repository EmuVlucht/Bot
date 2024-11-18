const chalk = require('chalk');
const moment = require('moment-timezone');
const { timezone } = require('../../config');

const time = () => moment.tz(timezone).format('HH:mm:ss');

const styles = {
    incoming: chalk.hex('#FFA500').bold,
    outgoing: chalk.hex('#00FF00').bold,
    error: chalk.hex('#FF0000').bold,
    info: chalk.hex('#ADD8E6').bold,
    success: chalk.hex('#32CD32').bold,
    time: chalk.hex('#FFFFFF').dim
};

const logger = {
    info: (message) => console.log(styles.info(`[${time()}] ${message}`)),
    error: (message) => console.error(styles.error(`[${time()}] ${message}`)),
    success: (message) => console.log(styles.success(`[${time()}] ${message}`)),
    incoming: (message) => console.log(styles.incoming(`[${time()}] ${message}`)),
    outgoing: (message) => console.log(styles.outgoing(`[${time()}] ${message}`))
};

module.exports = {
    logger,
    time,
    styles
};
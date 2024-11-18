const os = require('os');
const { logger } = require('./logger');
const { time } = require('./logger');
const { monitorInterval } = require('../../config');

class PerformanceMonitor {
    constructor() {
        this.startTime = Date.now();
        this.ramUsage = 0;
        this.uptime = 0;
        this.nodeVersion = process.version;
        this.startMonitoring();
    }

    startMonitoring() {
        setInterval(() => {
            this.ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            this.uptime = this.formatUptime(process.uptime());
        }, monitorInterval);
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        seconds %= 3600 * 24;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
        return `${days}d ${hours}h ${minutes}m ${Math.floor(seconds)}s`;
    }

    getPerformanceData() {
        return {
            ram: this.ramUsage,
            uptime: this.uptime,
            nodeVersion: this.nodeVersion,
            os: os.platform(),
            cpu: os.cpus()[0].model,
            speedTest: this.speedTest()
        };
    }

    speedTest() {
        const start = process.hrtime();
        // Simple calculation for speed test
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.random();
        }
        const diff = process.hrtime(start);
        return (diff[0] * 1e9 + diff[1]) / 1e6; // in milliseconds
    }
}

module.exports = new PerformanceMonitor();
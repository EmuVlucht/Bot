class AntiSpam {
    constructor(cooldownMs = 5000) {
        this.users = new Map();
        this.cooldown = cooldownMs;
    }
    
    isFiltered(userId) {
        const now = Date.now();
        const lastTime = this.users.get(userId);
        
        if (lastTime && now - lastTime < this.cooldown) {
            return true;
        }
        return false;
    }
    
    addFilter(userId) {
        this.users.set(userId, Date.now());
    }
    
    removeFilter(userId) {
        this.users.delete(userId);
    }
    
    clear() {
        this.users.clear();
    }
    
    cleanup() {
        const now = Date.now();
        for (const [userId, lastTime] of this.users.entries()) {
            if (now - lastTime > this.cooldown * 2) {
                this.users.delete(userId);
            }
        }
    }
}

const antiSpam = new AntiSpam(5000);

setInterval(() => {
    antiSpam.cleanup();
}, 60000);

module.exports = { antiSpam, AntiSpam };

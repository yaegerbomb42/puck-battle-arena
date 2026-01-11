/**
 * puckOFF Analytics System
 * Tracks performance metrics, player behavior, and game analytics.
 */

class AnalyticsManager {
    constructor() {
        this.fps = 0;
        this.fpsHistory = [];
        this.latency = 0;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.sessionData = {
            startTime: Date.now(),
            gamesPlayed: 0,
            totalKnockouts: 0,
            totalDeaths: 0,
            powerupsUsed: {},
            damageDealt: 0,
            damageReceived: 0,
            mapStats: {},
            peakFps: 0,
            avgFps: 0
        };
        this.listeners = [];
    }

    // --- FPS TRACKING ---

    tick() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        if (delta > 0) {
            const currentFps = 1000 / delta;
            this.fpsHistory.push(currentFps);

            // Keep only last 60 frames for rolling average
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
            }

            this.fps = Math.round(
                this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
            );

            if (this.fps > this.sessionData.peakFps) {
                this.sessionData.peakFps = this.fps;
            }
        }

        this.frameCount++;
        return this.fps;
    }

    getFps() {
        return this.fps;
    }

    getPerformanceLevel() {
        if (this.fps >= 55) return 'excellent';
        if (this.fps >= 45) return 'good';
        if (this.fps >= 30) return 'fair';
        return 'poor';
    }

    // --- LATENCY TRACKING ---

    updateLatency(latency) {
        this.latency = latency;
    }

    getLatency() {
        return this.latency;
    }

    getLatencyLevel() {
        if (this.latency < 50) return 'excellent';
        if (this.latency < 100) return 'good';
        if (this.latency < 200) return 'fair';
        return 'poor';
    }

    // --- GAME EVENT TRACKING ---

    trackKnockout(victimId, attackerId, method) {
        this.sessionData.totalKnockouts++;
        this.notifyListeners('knockout', { victimId, attackerId, method });
    }

    trackDeath() {
        this.sessionData.totalDeaths++;
    }

    trackPowerupUsed(powerupId) {
        if (!this.sessionData.powerupsUsed[powerupId]) {
            this.sessionData.powerupsUsed[powerupId] = 0;
        }
        this.sessionData.powerupsUsed[powerupId]++;
        this.notifyListeners('powerup', { powerupId });
    }

    trackDamage(amount, isDealt = true) {
        if (isDealt) {
            this.sessionData.damageDealt += amount;
        } else {
            this.sessionData.damageReceived += amount;
        }
    }

    trackGameStart(mapName) {
        this.sessionData.gamesPlayed++;
        if (!this.sessionData.mapStats[mapName]) {
            this.sessionData.mapStats[mapName] = { played: 0, wins: 0 };
        }
        this.sessionData.mapStats[mapName].played++;
    }

    trackGameEnd(mapName, won) {
        if (won && this.sessionData.mapStats[mapName]) {
            this.sessionData.mapStats[mapName].wins++;
        }
    }

    // --- POWERUP ANALYTICS ---

    getMostUsedPowerups() {
        const sorted = Object.entries(this.sessionData.powerupsUsed)
            .sort(([, a], [, b]) => b - a);
        return sorted.slice(0, 5);
    }

    // --- SESSION STATS ---

    getSessionStats() {
        const duration = (Date.now() - this.sessionData.startTime) / 1000;
        const avgFps = this.frameCount > 0
            ? Math.round(this.frameCount / (duration || 1))
            : 0;

        return {
            ...this.sessionData,
            avgFps,
            sessionDuration: duration,
            kdr: this.sessionData.totalDeaths > 0
                ? (this.sessionData.totalKnockouts / this.sessionData.totalDeaths).toFixed(2)
                : this.sessionData.totalKnockouts
        };
    }

    // --- EVENT LISTENERS ---

    addListener(callback) {
        this.listeners.push(callback);
    }

    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(l => l(event, data));
    }

    // --- RESET ---

    resetSession() {
        this.sessionData = {
            startTime: Date.now(),
            gamesPlayed: 0,
            totalKnockouts: 0,
            totalDeaths: 0,
            powerupsUsed: {},
            damageDealt: 0,
            damageReceived: 0,
            mapStats: {},
            peakFps: 0,
            avgFps: 0
        };
        this.frameCount = 0;
        this.fpsHistory = [];
    }
}

export const analytics = new AnalyticsManager();

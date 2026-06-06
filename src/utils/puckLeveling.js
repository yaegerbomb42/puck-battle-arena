/**
 * Puck Leveling Utility
 * Logic for individual Puck Evolution
 */

// Exponential-ish XP curve for Pucks
// Formula: Base * (Level^Multiplier)
const BASE_XP = 100;
const XP_MULTIPLIER = 1.8;

/**
 * Get Level from XP
 * @param {number} xp 
 * @returns {number}
 */
export const getPuckLevelFromXp = (xp = 0) => {
    if (xp < BASE_XP) return 1;
    // Simple iterative check for clarity (Level cap 20 for now)
    for (let i = 1; i <= 20; i++) {
        if (xp < getXpForPuckLevel(i + 1)) return i;
    }
    return 20;
};

/**
 * Get Total XP required for a specific level
 * @param {number} level 
 * @returns {number}
 */
export const getXpForPuckLevel = (level) => {
    if (level <= 1) return 0;
    if (level === 2) return BASE_XP;
    return Math.floor(BASE_XP * Math.pow(level - 1, XP_MULTIPLIER));
};

/**
 * Get Level Progress (0 to 1)
 * @param {number} xp 
 * @returns {number}
 */
export const getPuckLevelProgress = (xp = 0) => {
    const level = getPuckLevelFromXp(xp);
    const currentLevelXp = getXpForPuckLevel(level);
    const nextLevelXp = getXpForPuckLevel(level + 1);
    
    if (level >= 20) return 1.0;
    
    return (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
};

/**
 * Calculate Evolution Points (EP)
 * Pucks earn 1 EP every 5 levels
 */
export const getPuckEvolutionPoints = (level) => {
    return Math.floor(level / 5);
};

/**
 * Get Rank Title for a Puck
 */
export const getPuckRankTitle = (level) => {
    if (level >= 20) return 'OMEGA PUCK';
    if (level >= 15) return 'SYMBIOTE';
    if (level >= 10) return 'MORPHED';
    if (level >= 5) return 'EVOLVING';
    return 'PRIME';
};

/**
 * Default Puck Instance Template
 */
export const createPuckInstance = (iconId, tier = 0, nickname = null) => {
    const iconNames = ['Stinger', 'Void', 'Glider', 'Crusher', 'Spark', 'Wraith', 'Titan', 'Ghost'];
    const randomName = iconNames[Math.floor(Math.random() * iconNames.length)] + " " + Math.floor(Math.random() * 99);
    
    return {
        id: `${iconId}_${tier}_${Date.now()}`, // Unique ID
        iconId,
        tier,
        nickname: nickname || randomName,
        xp: 0,
        level: 1,
        wins: 0,
        losses: 0,
        kills: 0,
        damageDealt: 0,
        traits: [],
        status: 'active',
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString()
    };
};

/**
 * Compatibility helpers for frontend PuckCard component
 */
export const getLevel = (xp) => getPuckLevelFromXp(xp);

export const getXPProgress = (xp = 0) => {
    const level = getPuckLevelFromXp(xp);
    const currentLevelXp = getXpForPuckLevel(level);
    const nextLevelXp = getXpForPuckLevel(level + 1);
    const nextLevelNeeded = nextLevelXp - currentLevelXp;
    
    if (level >= 20) return { progress: 100, nextLevelXP: 0 };
    
    const earnedInLevel = xp - currentLevelXp;
    const progress = (earnedInLevel / nextLevelNeeded) * 100;
    
    return { 
        progress: Math.min(100, Math.max(0, progress)), 
        nextLevelXP: nextLevelNeeded 
    };
};

export const getStatsAtLevel = (tier = 0, level = 1) => {
    // Base stats by tier (Common, Uncommon, Rare, Epic, Legendary)
    const baseStats = [
        { power: 10, speed: 12, defense: 8 },
        { power: 15, speed: 15, defense: 12 },
        { power: 22, speed: 20, defense: 18 },
        { power: 30, speed: 25, defense: 25 },
        { power: 45, speed: 35, defense: 35 }
    ];
    
    const base = baseStats[tier] || baseStats[0];
    
    // Scale stats slightly by +5% per level
    const scale = 1 + (level - 1) * 0.05;
    
    return {
        power: Math.floor(base.power * scale),
        speed: Math.floor(base.speed * scale),
        defense: Math.floor(base.defense * scale)
    };
};


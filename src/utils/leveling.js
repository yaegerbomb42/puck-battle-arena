// Leveling Constants
export const LEVEL_CAP = 55; // Reaching level 55 = Prestige mode?
export const XP_PER_MINUTE = 100; // Base XP for playtime
export const XP_WIN_BONUS = 500;
export const XP_KNOCKOUT = 100;
export const XP_STOMP = 150;

// Calculate total XP needed for a specific level
// Curve: Increasing difficulty
// Level 1-10: Fast
// Level 11-30: Medium
// Level 31-55: Grindy
export function getXpForLevel(level) {
    if (level <= 1) return 0;

    // Formula: Base * (level^exponent)
    // Roughly matches CoD style progression
    const exponent = 2.1;
    const base = 800;

    return Math.floor(base * Math.pow(level - 1, exponent));
}

// Calculate current level from total XP
export function getLevelFromXp(totalXp) {
    let level = 1;
    while (level < LEVEL_CAP && totalXp >= getXpForLevel(level + 1)) {
        level++;
    }
    return level;
}

// Get progress to next level (0.0 to 1.0)
export function getLevelProgress(totalXp) {
    const currentLevel = getLevelFromXp(totalXp);
    if (currentLevel >= LEVEL_CAP) return 1.0;

    const currentLevelXp = getXpForLevel(currentLevel);
    const nextLevelXp = getXpForLevel(currentLevel + 1);

    const xpInLevel = totalXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;

    return Math.min(1.0, Math.max(0.0, xpInLevel / xpNeeded));
}

// Prestige icons or rank names could go here
export const RANK_NAMES = {
    1: "Private",
    5: "Corporal",
    10: "Sergeant",
    20: "Lieutenant",
    30: "Captain",
    40: "Major",
    50: "Colonel",
    55: "Commander"
};

export function getRankName(level) {
    // Find highest rank for current level
    const ranks = Object.keys(RANK_NAMES).map(Number).sort((a, b) => b - a);
    const rankLevel = ranks.find(r => level >= r);
    return RANK_NAMES[rankLevel] || "Recruit";
}

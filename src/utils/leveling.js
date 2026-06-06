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

// Rank Tiers (Competitive)
export const RANK_TIERS = [
    { id: 'bronze', name: 'Bronze', minRP: 0, color: '#cd7f32' },
    { id: 'silver', name: 'Silver', minRP: 1000, color: '#c0c0c0' },
    { id: 'gold', name: 'Gold', minRP: 2500, color: '#ffd700' },
    { id: 'platinum', name: 'Platinum', minRP: 5000, color: '#e5e4e2' },
    { id: 'diamond', name: 'Diamond', minRP: 10000, color: '#b9f2ff' },
    { id: 'divine', name: 'Divine', minRP: 25000, color: '#ff006e' },
];

export function getRankFromRP(rp) {
    const totalRP = Math.max(0, rp || 0);
    // Find highest tier where minRP is met
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        if (totalRP >= RANK_TIERS[i].minRP) {
            return RANK_TIERS[i];
        }
    }
    return RANK_TIERS[0];
}

export function getRankProgress(rp) {
    const currentRank = getRankFromRP(rp);
    const currentIndex = RANK_TIERS.indexOf(currentRank);
    
    if (currentIndex === RANK_TIERS.length - 1) return 1.0; // Divine is max

    const nextRank = RANK_TIERS[currentIndex + 1];
    const rpInTier = (rp || 0) - currentRank.minRP;
    const rpNeeded = nextRank.minRP - currentRank.minRP;

    return Math.min(1.0, Math.max(0.0, rpInTier / rpNeeded));
}

export function getRankName(level) {
    // Find highest rank for current level
    const ranks = Object.keys(RANK_NAMES).map(Number).sort((a, b) => b - a);
    const rankLevel = ranks.find(r => level >= r);
    return RANK_NAMES[rankLevel] || "Recruit";
}

// Season Pass Rewards (XP Thresholds)
export const SEASON_PASS_REWARDS = [
    { level: 1, requiredXp: 1000, rewardType: 'zoin', amount: 100, label: '100 Zoins' },
    { level: 2, requiredXp: 2500, rewardType: 'zoin', amount: 250, label: '250 Zoins' },
    { level: 3, requiredXp: 5000, rewardType: 'skin', amount: 1011, label: 'Exclusive Skin' }, // Assuming 1011 is a new skin
    { level: 4, requiredXp: 8000, rewardType: 'zoin', amount: 500, label: '500 Zoins' },
    { level: 5, requiredXp: 12000, rewardType: 'zoin', amount: 1000, label: '1000 Zoins' },
    { level: 6, requiredXp: 18000, rewardType: 'skin', amount: 1012, label: 'Epic Skin' },
    { level: 7, requiredXp: 25000, rewardType: 'zoin', amount: 2000, label: '2000 Zoins' },
    { level: 8, requiredXp: 35000, rewardType: 'skin', amount: 1013, label: 'Legendary Skin' },
    { level: 9, requiredXp: 50000, rewardType: 'zoin', amount: 5000, label: '5000 Zoins' },
    { level: 10, requiredXp: 75000, rewardType: 'skin', amount: 1014, label: 'Divine Skin' },
];

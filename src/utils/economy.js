// Economy System - 10 Tier Rarity with Burn/Forge Mechanics

// ============ TIER DEFINITIONS ============
import rawIconData from './icons.json';

export const TIERS = {
    0: { id: 0, name: 'Standard', color: '#6b7280', dropRate: 0, theme: 'Basic Colors', isMystery: false },
    1: { id: 1, name: 'Common', color: '#9ca3af', dropRate: 0.40, theme: 'Textured Materials', isMystery: false },
    2: { id: 2, name: 'Uncommon', color: '#22c55e', dropRate: 0.20, theme: 'Clean Objects', isMystery: false },
    3: { id: 3, name: 'Rare', color: '#3b82f6', dropRate: 0.12, theme: 'VFX & Energy', isMystery: false },
    4: { id: 4, name: 'Epic', color: '#a855f7', dropRate: 0.08, theme: 'Aesthetic Gear', isMystery: false },
    5: { id: 5, name: 'Ultra Epic', color: '#f97316', dropRate: 0.06, theme: 'Power Fantasy', isMystery: false },
    6: { id: 6, name: 'Legendary', color: '#fbbf24', dropRate: 0.04, theme: 'Luxury Materials', isMystery: false },
    7: { id: 7, name: 'Mythic', color: '#ec4899', dropRate: 0.03, theme: 'Abstract Concepts', isMystery: false },
    8: { id: 8, name: 'Celestial', color: '#06b6d4', dropRate: 0.02, theme: 'Cosmic Horror', isMystery: true },
    9: { id: 9, name: 'Cosmic', color: '#8b5cf6', dropRate: 0.015, theme: 'Meta/Fourth Wall', isMystery: true },
    10: { id: 10, name: 'Divine', color: '#ffffff', dropRate: 0.005, theme: 'Utility Grails', isMystery: true, hasBonus: true }
};

// ============ STANDARD COLORS (Free for all) ============
export const STANDARD_COLORS = [
    { id: 1001, name: 'Classic Red', color: '#ff0000', tier: 0, imageUrl: '/images/pucks/standard_red.png' },
    { id: 1002, name: 'Classic Blue', color: '#0000ff', tier: 0, imageUrl: '/images/pucks/standard_blue.png' },
    { id: 1003, name: 'Classic Green', color: '#00ff00', tier: 0, imageUrl: '/images/pucks/standard_green.png' },
    { id: 1004, name: 'Classic Yellow', color: '#ffff00', tier: 0, imageUrl: '/images/pucks/standard_yellow.png' },
    { id: 1005, name: 'Classic Orange', color: '#ffa500', tier: 0, imageUrl: '/images/pucks/standard_orange.png' },
    { id: 1006, name: 'Classic Purple', color: '#800080', tier: 0, imageUrl: '/images/pucks/standard_purple.png' },
    { id: 1007, name: 'Classic Pink', color: '#ffc0cb', tier: 0, imageUrl: '/images/pucks/standard_pink.png' },
    { id: 1008, name: 'Classic Cyan', color: '#00ffff', tier: 0, imageUrl: '/images/pucks/standard_cyan.png' },
    { id: 1009, name: 'Classic White', color: '#ffffff', tier: 0, imageUrl: '/images/pucks/standard_white.png' },
    { id: 1010, name: 'Classic Black', color: '#111111', tier: 0, imageUrl: '/images/pucks/standard_black.png' }
];

// ============ ZOINS ECONOMY ============
export const ZOIN_BUNDLES = { // Micro-Transactions "Fuel"
    pouch: {
        id: 'pouch',
        zoins: 1000,
        price: 0.99,
        stripeLink: 'https://buy.stripe.com/00w6oz1NbaVIfEV3ydaIM09', // Real Link
        name: 'Starter Fuel',
        desc: 'Enough for a quick boost.'
    },
    cache: {
        id: 'cache',
        zoins: 4000,
        price: 2.99,
        stripeLink: 'https://buy.stripe.com/3cI9AL2RfaVIeAR3ydaIM0c', // Real Link
        name: 'Pro Stash',
        desc: 'Best value for active players.'
    },
    vault: {
        id: 'vault',
        zoins: 17000,
        price: 4.99,
        stripeLink: 'https://buy.stripe.com/dRmbITbnLe7U50h0m1aIM0b', // Real Link
        name: 'Whale Vault',
        desc: 'Stockpile for the long haul.'
    }
};

// USER REQUEST OVERRIDE:
// Starter Fuel: $4.99 -> 900 Zoins
// Pro Stash: $19.99 -> 3800 Zoins
// Whale Vault: $49.99 -> 16000 Zoins
// WAIT. User said: "change the cost structure to be very cheap, $1 -$3 $5... update the game numbers... 900/3800/16000"
// So:
// $0.99 -> 900 Zoins
// $2.99 -> 3,800 Zoins
// $4.99 -> 16,000 Zoins
export const MICRO_BUNDLES = {
    pouch: { id: 'pouch', zoins: 900, price: 0.99, stripeLink: 'https://buy.stripe.com/00w6oz1NbaVIfEV3ydaIM09', name: 'Starter Fuel' },
    cache: { id: 'cache', zoins: 3800, price: 2.99, stripeLink: 'https://buy.stripe.com/3cI9AL2RfaVIeAR3ydaIM0c', name: 'Pro Stash' },
    vault: { id: 'vault', zoins: 16000, price: 4.99, stripeLink: 'https://buy.stripe.com/dRmbITbnLe7U50h0m1aIM0b', name: 'Whale Vault' }
};

// Override the export
Object.assign(ZOIN_BUNDLES, MICRO_BUNDLES);


export const BETTING_OPTS = {
    // "Almost There" Trap: 
    standard: { cost: 100, multiplier: 1.0, name: 'Standard Bet' },
    high_roller: { cost: 500, multiplier: 1.5, name: 'High Roller' },
    whale: { cost: 2500, multiplier: 3.0, name: 'Whale Bet' }
};

// ============ REWARDS ============
// "Golden Friction": Generous but calculated to keep you playing
export const GAME_REWARDS = {
    WIN: 48, // Win 2 games (96) -> ALMOST enough for Standard (100) -> PAIN
    LOSS: 12, // Loss 9 games (108) -> Pity grind
    KILL: 10, // Round number
    MATCH_COMPLETE: 10,
    DAILY_LOGIN: 25 // Quarter of a pack
};

export const PENALTIES = {
    RAGE_QUIT: -10, // Slap needed
    BAN_PROGRESSION: [1, 5, 30, 60, 1440],
    BAN_REMOVE_COST: 100 // Almost a full pack
};

// ============ CONSTANTS ============
export const FREE_PACK_REROLL_CHANCE = 0.025; // 2.5%
export const BURN_FREE_PACK_CHANCE = 0.50; // 50% chance when burning 2 identical
export const TOTAL_ICONS = 150;

// ============ PACK OPENING ============
export function rollTier(luckMultiplier = 1.0) {
    const rand = Math.random();
    let cumulative = 0;

    for (const [tierId, tier] of Object.entries(TIERS)) {
        // Apply luck multiplier to drop rates of Uncommon+
        let adjustedRate = tier.dropRate;
        if (parseInt(tierId) > 1) {
            adjustedRate *= luckMultiplier;
        }

        cumulative += adjustedRate;
        if (rand < cumulative) {
            return parseInt(tierId);
        }
    }
    return 1; // Fallback to Common
}

export function openPack(betAmount = 100) {
    // Find multiplier based on bet amount
    const betTier = Object.values(BETTING_OPTS).find(b => b.cost === betAmount) || BETTING_OPTS.standard;
    const luckMultiplier = betTier.multiplier;

    const slots = [];
    // Standard pack is always 3 items
    const slotsToOpen = 3;

    for (let i = 0; i < slotsToOpen; i++) {
        // Check for free pack reroll (Luck applies slightly here too?)
        if (Math.random() < (FREE_PACK_REROLL_CHANCE * luckMultiplier)) {
            slots.push({
                type: 'free_pack_token', // Converts to 100 Zoins maybe? Or just a free Standard Bet
                tier: null,
                iconId: null,
                isReroll: true
            });
        } else {
            const tier = rollTier(luckMultiplier);
            slots.push({
                type: 'icon',
                tier: tier,
                iconId: getRandomIconFromTier(tier),
                isReroll: false
            });
        }
    }

    return slots;
}

// ============ ICON DATABASE ============
// Use the imported JSON data directly
const ICON_DATABASE = rawIconData;

export function getRandomIconFromTier(tier) {
    if (tier === 0) return STANDARD_COLORS[Math.floor(Math.random() * STANDARD_COLORS.length)];
    const iconsInTier = Object.values(ICON_DATABASE).filter(icon => icon.tier === tier);
    if (iconsInTier.length === 0) return null;
    return iconsInTier[Math.floor(Math.random() * iconsInTier.length)];
}

export function getIconById(id) {
    if (id > 1000) return STANDARD_COLORS.find(c => c.id === id) || null;
    if (UNIQUE_SKINS[id]) return UNIQUE_SKINS[id];
    return ICON_DATABASE[id] || null;
}

export function getAllIcons() {
    return [...Object.values(ICON_DATABASE), ...STANDARD_COLORS];
}

export function getIconsByTier(tier) {
    return Object.values(ICON_DATABASE).filter(icon => icon.tier === tier);
}

// ============ BURN MECHANIC ============
export function burnIcons(icon1, icon2) {
    // Must be identical icons
    if (icon1.id !== icon2.id) {
        return { success: false, error: 'Icons must be identical' };
    }

    // Roll for free pack
    const wonFreePack = Math.random() < BURN_FREE_PACK_CHANCE;

    return {
        success: true,
        iconsConsumed: [icon1.id, icon2.id],
        rewardType: wonFreePack ? 'free_pack' : 'nothing',
        reward: wonFreePack ? { type: 'free_pack_token', count: 1 } : null
    };
}

// ============ FORGE MECHANIC ============
export function forgeIcons(icon1, icon2) {
    // Must be identical icons
    if (icon1.id !== icon2.id) {
        return { success: false, error: 'Icons must be identical' };
    }

    // Must be same tier
    if (icon1.tier !== icon2.tier) {
        return { success: false, error: 'Icons must be same tier' };
    }

    // Cannot forge Divine (max tier)
    if (icon1.tier >= 10) {
        return { success: false, error: 'Cannot forge Divine tier icons' };
    }

    const nextTier = icon1.tier + 1;
    const newIcon = getRandomIconFromTier(nextTier);

    return {
        success: true,
        iconsConsumed: [icon1.id, icon2.id],
        rewardType: 'upgraded_icon',
        reward: newIcon
    };
}

// ============ MYSTERY MASKING ============
export function getMaskedIcon(icon, playerInventory) {
    // If tier 8-10 and player doesn't own it, mask it
    if (TIERS[icon.tier].isMystery && !playerInventory.includes(icon.id)) {
        return {
            ...icon,
            isMasked: true,
            name: '???',
            description: 'Mystery item. Pull from a pack to reveal!',
            imageUrl: '/images/mystery_icon.png'
        };
    }
    return { ...icon, isMasked: false };
}

// ============ TIER 10 DIVINE BONUSES ============
export const DIVINE_BONUSES = {
    147: { type: 'free_10_pack', description: 'Grants a free 10-pack upon unlock' },
    148: { type: 'double_forge_chance', description: 'Doubles forge success for 24 hours' },
    149: { type: 'vip_border', description: 'Exclusive profile border' },
    150: { type: 'dev_grail', description: 'The legendary Dev Grail - grants a free 10-pack' },
    999: { type: 'evolving_symbiote', description: 'Evolving Symbiote — Living procedural armor that reacts to your performance' }
};

// ============ UNIQUE SKINS (Special shader-backed skins) ============
export const UNIQUE_SKINS = {
    999: {
        id: 999,
        name: 'Evolving Symbiote',
        tier: 999,
        description: 'Living cyber-organic armor. Veins glow with kill streaks, spikes grow with aggression, rusts when idle, flows like mercury at speed.',
        imageUrl: '/images/pucks/symbiote_preview.png',
        isShader: true, // signals Puck.jsx to use SymbioteMaterial
        shaderKey: 'symbiote'
    }
};

export function claimDivineBonus(iconId) {
    const bonus = DIVINE_BONUSES[iconId];
    if (!bonus) return null;
    return bonus;
}

// ============ COLLECTION STATS ============
export function getCollectionStats(playerInventory) {
    const owned = new Set(playerInventory);
    const stats = {
        total: TOTAL_ICONS,
        owned: owned.size,
        percentage: Math.round((owned.size / TOTAL_ICONS) * 100),
        byTier: {}
    };

    for (const [tierId, tier] of Object.entries(TIERS)) {
        const tierIcons = getIconsByTier(parseInt(tierId));
        const ownedInTier = tierIcons.filter(icon => owned.has(icon.id)).length;
        stats.byTier[tierId] = {
            name: tier.name,
            total: tierIcons.length,
            owned: ownedInTier,
            isMystery: tier.isMystery
        };
    }

    return stats;
}

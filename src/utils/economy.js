// Economy System - 10 Tier Rarity with Burn/Forge Mechanics

// ============ TIER DEFINITIONS ============
export const TIERS = {
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

// ============ PRICING ============
export const PACK_PRICES = {
    single: { price: 0.50, slots: 3, stripeLink: 'https://buy.stripe.com/YOUR_SINGLE_PACK' },
    bundle10: { price: 3.00, slots: 30, stripeLink: 'https://buy.stripe.com/YOUR_10_PACK' },
    unlockAll: { price: 99.99, slots: 150, stripeLink: 'https://buy.stripe.com/YOUR_UNLOCK_ALL' }
};

// ============ CONSTANTS ============
export const FREE_PACK_REROLL_CHANCE = 0.025; // 2.5%
export const BURN_FREE_PACK_CHANCE = 0.50; // 50% chance when burning 2 identical
export const TOTAL_ICONS = 150;

// ============ PACK OPENING ============
export function rollTier() {
    const rand = Math.random();
    let cumulative = 0;

    for (const [tierId, tier] of Object.entries(TIERS)) {
        cumulative += tier.dropRate;
        if (rand < cumulative) {
            return parseInt(tierId);
        }
    }
    return 1; // Fallback to Common
}

export function openPack(packType = 'single') {
    const pack = PACK_PRICES[packType];
    if (!pack) return null;

    const slots = [];
    const slotsToOpen = packType === 'single' ? 3 : pack.slots;

    for (let i = 0; i < slotsToOpen; i++) {
        // Check for free pack reroll
        if (Math.random() < FREE_PACK_REROLL_CHANCE) {
            slots.push({
                type: 'free_pack_token',
                tier: null,
                iconId: null,
                isReroll: true
            });
        } else {
            const tier = rollTier();
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

// ============ PLACEHOLDER ICON DATABASE ============
// This will be replaced with actual icon data when assets are uploaded
const ICON_DATABASE = {};

// Generate placeholder entries for 150 icons
for (let i = 1; i <= 150; i++) {
    // Distribute icons across tiers based on drop rates
    let tier;
    if (i <= 60) tier = 1;       // 60 Common
    else if (i <= 90) tier = 2;  // 30 Uncommon
    else if (i <= 108) tier = 3; // 18 Rare
    else if (i <= 120) tier = 4; // 12 Epic
    else if (i <= 129) tier = 5; // 9 Ultra Epic
    else if (i <= 135) tier = 6; // 6 Legendary
    else if (i <= 140) tier = 7; // 5 Mythic
    else if (i <= 143) tier = 8; // 3 Celestial
    else if (i <= 146) tier = 9; // 3 Cosmic
    else tier = 10;              // 4 Divine

    ICON_DATABASE[i] = {
        id: i,
        tier: tier,
        name: `Icon #${i}`,
        description: `A ${TIERS[tier].name} tier collectible.`,
        imageUrl: `/icons/Tier_${tier}_${TIERS[tier].name}/icon_${String(i).padStart(3, '0')}.png`
    };
}

export function getRandomIconFromTier(tier) {
    const iconsInTier = Object.values(ICON_DATABASE).filter(icon => icon.tier === tier);
    if (iconsInTier.length === 0) return null;
    return iconsInTier[Math.floor(Math.random() * iconsInTier.length)];
}

export function getIconById(id) {
    return ICON_DATABASE[id] || null;
}

export function getAllIcons() {
    return Object.values(ICON_DATABASE);
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
            imageUrl: '/icons/mystery_placeholder.png'
        };
    }
    return { ...icon, isMasked: false };
}

// ============ TIER 10 DIVINE BONUSES ============
export const DIVINE_BONUSES = {
    147: { type: 'free_10_pack', description: 'Grants a free 10-pack upon unlock' },
    148: { type: 'double_forge_chance', description: 'Doubles forge success for 24 hours' },
    149: { type: 'vip_border', description: 'Exclusive profile border' },
    150: { type: 'dev_grail', description: 'The legendary Dev Grail - grants a free 10-pack' }
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

/**
 * Enhanced Powerup System
 * Complete registry with all powerup types
 */

// Complete Powerup Registry
export const POWERUP_REGISTRY = {
    // ========== OFFENSIVE ==========
    ROCKET: {
        id: 'rocket',
        name: 'Homing Rocket',
        type: 'projectile',
        category: 'offensive',
        icon: '🚀',
        imagePath: '/images/powerups/rocket.png',
        color: '#ff4500',
        description: 'Fires a homing missile at nearest enemy',
        damage: 25,
        knockback: 15,
        cooldown: 5000,
        rarity: 'common'
    },
    
    GLUE_GUN: {
        id: 'glue_gun',
        name: 'Glue Shot',
        type: 'projectile',
        category: 'offensive',
        icon: '🧴',
        imagePath: '/images/powerups/glue_gun.png',
        color: '#ffff00',
        description: 'Shoots a blob that slows enemy',
        damage: 5,
        slowAmount: 0.8,
        slowDuration: 3000,
        cooldown: 4000,
        rarity: 'common'
    },
    
    SAW_BLADE: {
        id: 'saw_blade',
        name: 'Rolling Saw',
        type: 'projectile',
        category: 'offensive',
        icon: '⚙️',
        imagePath: '/images/powerups/saw_blade.png',
        color: '#808080',
        description: 'Physics-based bouncing blade',
        damage: 20,
        knockback: 10,
        bounces: 3,
        cooldown: 4000,
        rarity: 'uncommon'
    },
    
    BOMB_THROW: {
        id: 'bomb_throw',
        name: 'Cherry Bomb',
        type: 'projectile',
        category: 'offensive',
        icon: '💣',
        imagePath: '/images/powerups/bomb_throw.png',
        color: '#000000',
        description: 'Explodes after 2s, big knockback',
        damage: 35,
        knockback: 25,
        fuseTime: 2000,
        blastRadius: 4,
        cooldown: 6000,
        rarity: 'uncommon'
    },
    
    FREEZE_RAY: {
        id: 'freeze_ray',
        name: 'Freeze Ray',
        type: 'beam',
        category: 'offensive',
        icon: '❄️',
        imagePath: '/images/powerups/freeze_ray.png',
        color: '#00ffff',
        description: 'Freezes enemy in place for 2s',
        damage: 10,
        freezeDuration: 2000,
        range: 12,
        cooldown: 10000,
        rarity: 'rare'
    },
    
    BLACK_HOLE: {
        id: 'black_hole',
        name: 'Singularity',
        type: 'projectile',
        category: 'offensive',
        icon: '⚫',
        imagePath: '/images/powerups/black_hole.png',
        color: '#1a0033',
        description: 'Gravity well that sucks in players',
        damage: 5,
        pullStrength: 15,
        duration: 4000,
        radius: 8,
        cooldown: 20000,
        rarity: 'legendary'
    },

    // ========== DEFENSIVE ==========
    SHIELD: {
        id: 'shield',
        name: 'Bubble Shield',
        type: 'buff',
        category: 'defensive',
        icon: '🛡️',
        imagePath: '/images/powerups/shield.png',
        color: '#00d4ff',
        description: 'Blocks next hit, immune to traps',
        duration: 8000,
        hitsBlocked: 1,
        knockbackReduction: 0.5,
        rarity: 'common'
    },
    
    SPIKE_ARMOR: {
        id: 'spike_armor',
        name: 'Spike Vest',
        type: 'buff',
        category: 'defensive',
        icon: '🐡',
        imagePath: '/images/powerups/spike_armor.png',
        color: '#555555',
        description: 'Reflect 50% damage to attackers',
        duration: 10000,
        reflectPercent: 0.5,
        rarity: 'uncommon'
    },
    
    GHOST: {
        id: 'ghost',
        name: 'Phase Shift',
        type: 'buff',
        category: 'defensive',
        icon: '👻',
        imagePath: '/images/powerups/ghost.png',
        color: '#ffffff',
        description: 'Pass through players and attacks',
        duration: 5000,
        rarity: 'rare'
    },

    // ========== MOBILITY ==========
    SPEED_BOOST: {
        id: 'speed_boost',
        name: 'Nitro Boost',
        type: 'buff',
        category: 'mobility',
        icon: '⚡',
        imagePath: '/images/powerups/speed_boost.png',
        color: '#00ff87',
        description: '80% speed boost for 6 seconds',
        duration: 6000,
        speedMultiplier: 1.8,
        rarity: 'common'
    },
    
    JUMP_JET: {
        id: 'jump_jet',
        name: 'Jump Jets',
        type: 'buff',
        category: 'mobility',
        icon: '⏫',
        imagePath: '/images/powerups/jump_jet.png',
        color: '#ff9900',
        description: 'Triple jump ability',
        duration: 8000,
        extraJumps: 2,
        jumpBoost: 1.5,
        rarity: 'uncommon'
    },
    
    TELEPORT: {
        id: 'teleport',
        name: 'Blink',
        type: 'action',
        category: 'mobility',
        icon: '🌌',
        imagePath: '/images/powerups/teleport.png',
        color: '#9d4edd',
        description: 'Teleport 8m forward instantly',
        distance: 8,
        cooldown: 5000,
        invincibilityFrames: 200,
        rarity: 'uncommon'
    },
    
    GRAPPLE: {
        id: 'grapple',
        name: 'Grapple Hook',
        type: 'action',
        category: 'mobility',
        icon: '🪝',
        imagePath: '/images/powerups/grapple.png',
        color: '#8b4513',
        description: 'Pull yourself to surfaces',
        range: 15,
        pullSpeed: 25,
        cooldown: 4000,
        rarity: 'uncommon'
    },

    // ========== CHAOS ==========
    GIANT: {
        id: 'giant',
        name: 'Kaiju Mode',
        type: 'buff',
        category: 'chaos',
        icon: '🦖',
        imagePath: '/images/powerups/giant.png',
        color: '#ff0000',
        description: 'Grow huge, immune to knockback',
        duration: 10000,
        sizeMultiplier: 1.8,
        massMultiplier: 2.5,
        knockbackResistance: 0.8,
        speedPenalty: 0.7,
        rarity: 'rare'
    },
    
    SHRINK: {
        id: 'shrink',
        name: 'Mini Me',
        type: 'buff',
        category: 'chaos',
        icon: '🐜',
        imagePath: '/images/powerups/shrink.png',
        color: '#ffcc00',
        description: 'Tiny and fast, harder to hit',
        duration: 12000,
        sizeMultiplier: 0.5,
        speedBonus: 1.4,
        knockbackIncrease: 1.3,
        rarity: 'uncommon'
    },
    
    INVISIBLE: {
        id: 'invisible',
        name: 'Cloak',
        type: 'buff',
        category: 'chaos',
        icon: '🕵️',
        imagePath: '/images/powerups/invisible.png',
        color: '#111111',
        description: 'Completely invisible to enemies',
        duration: 8000,
        revealOnAttack: true,
        rarity: 'rare'
    },
    
    MAGNET: {
        id: 'magnet',
        name: 'Attractor',
        type: 'buff',
        category: 'chaos',
        icon: '🧲',
        imagePath: '/images/powerups/magnet.png',
        color: '#cc0000',
        description: 'Pull nearby powerups and enemies',
        duration: 10000,
        pullRadius: 10,
        pullForce: 8,
        rarity: 'uncommon'
    },
    
    CURSE: {
        id: 'curse',
        name: 'Hex Hex',
        type: 'debuff',
        category: 'chaos',
        icon: '😵',
        imagePath: '/images/powerups/curse.png',
        color: '#8800ff',
        description: 'Reverse enemy controls for 4s',
        targetDuration: 4000,
        range: 12,
        cooldown: 15000,
        rarity: 'rare'
    },

    // ========== TRAPS ==========
    WEB_DROP: {
        id: 'web_drop',
        name: 'Spider Web',
        type: 'trap',
        category: 'trap',
        icon: '🕸️',
        imagePath: '/images/powerups/web_drop.png',
        color: '#ffffff',
        description: 'Drop a sticky web behind you',
        slowAmount: 0.9,
        slowDuration: 2500,
        trapDuration: 15000,
        cooldown: 8000,
        rarity: 'common'
    },
    
    FART: {
        id: 'fart',
        name: 'Toxic Cloud',
        type: 'trap',
        category: 'trap',
        icon: '💨',
        imagePath: '/images/powerups/fart.png',
        color: '#7cfc00',
        description: 'Cloud that damages and obscures',
        damagePerSecond: 5,
        duration: 6000,
        radius: 5,
        cooldown: 10000,
        rarity: 'uncommon'
    }
};

// Default loadout
export const DEFAULT_LOADOUT = ['speed_boost', 'rocket', 'shield'];

// Rarity weights
const RARITY_WEIGHTS = {
    common: 40,
    uncommon: 30,
    rare: 20,
    legendary: 10
};

/**
 * Get powerup info by ID
 * Handles both uppercase registry keys and lowercase IDs
 */
export function getPowerupInfo(id) {
    if (!id) return null;
    
    // Handle if already a powerup object
    if (typeof id === 'object' && id.id) {
        return id;
    }
    
    // Try uppercase key first
    const upperKey = String(id).toUpperCase();
    if (POWERUP_REGISTRY[upperKey]) {
        return POWERUP_REGISTRY[upperKey];
    }
    
    // Search by id field
    const found = Object.values(POWERUP_REGISTRY).find(p => p.id === id);
    if (found) return found;
    
    // Default fallback
    return POWERUP_REGISTRY.SPEED_BOOST;
}

/**
 * Get all powerups in a category
 */
export function getPowerupsByCategory(category) {
    return Object.values(POWERUP_REGISTRY).filter(p => p.category === category);
}

/**
 * Get random powerup weighted by rarity
 */
export function getRandomPowerup(excludeIds = []) {
    const available = Object.values(POWERUP_REGISTRY).filter(p => !excludeIds.includes(p.id));
    
    let totalWeight = 0;
    available.forEach(p => {
        totalWeight += RARITY_WEIGHTS[p.rarity] || RARITY_WEIGHTS.common;
    });
    
    let random = Math.random() * totalWeight;
    for (const powerup of available) {
        const weight = RARITY_WEIGHTS[powerup.rarity] || RARITY_WEIGHTS.common;
        random -= weight;
        if (random <= 0) {
            return powerup;
        }
    }
    
    return available[0];
}

/**
 * Validate a loadout
 */
export function validateLoadout(loadout) {
    if (!Array.isArray(loadout)) return { valid: false, reason: 'Invalid loadout' };
    if (loadout.length > 3) return { valid: false, reason: 'Too many items' };
    
    for (const id of loadout) {
        const powerup = getPowerupInfo(id);
        if (!powerup) {
            return { valid: false, reason: `Invalid powerup: ${id}` };
        }
    }
    
    return { valid: true };
}

/**
 * Get cooldown remaining for a powerup
 */
export function getCooldownRemaining(powerupId, lastUsedTime) {
    const powerup = getPowerupInfo(powerupId);
    if (!powerup?.cooldown) return 0;
    
    const elapsed = Date.now() - lastUsedTime;
    return Math.max(0, powerup.cooldown - elapsed);
}

/**
 * Check if powerup can be used
 */
export function canUsePowerup(powerupId, lastUsedTime, userState) {
    const powerup = getPowerupInfo(powerupId);
    if (!powerup) return { canUse: false, reason: 'Invalid powerup' };
    
    if (lastUsedTime && getCooldownRemaining(powerupId, lastUsedTime) > 0) {
        return { canUse: false, reason: 'On cooldown' };
    }
    
    if (userState?.stunned || userState?.frozen) {
        return { canUse: false, reason: 'Cannot act' };
    }
    
    return { canUse: true };
}

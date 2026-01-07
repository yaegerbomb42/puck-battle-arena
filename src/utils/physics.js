/**
 * Enhanced Physics Configuration
 * Smash Bros-style damage/knockback system with funny physics moments
 */

export const PHYSICS_CONFIG = {
    // Gravity - Slightly floaty for fun air control
    gravity: [0, -28, 0],

    // Puck properties
    puck: {
        mass: 1,
        radius: 0.5,
        maxVelocity: 25,
        acceleration: 26,
        linearDamping: 0.25,
        angularDamping: 0.4,
        restitution: 0.65,
        friction: 0.12,
        airControl: 0.7, // Multiplier for air movement
        jumpForce: 14
    },

    // Arena properties - FIX: Added proper blast zones
    arena: {
        fallThreshold: -8,
        blastZones: {
            top: 30,      // Above this Y = KO
            side: 40,     // Beyond this X or Z = KO
            bottom: -10   // Below this Y = KO
        }
    },

    // Power-up spawn settings
    powerups: {
        minSpawnInterval: 4000,
        maxSpawnInterval: 8000,
        maxOnField: 5,
        pickupRadius: 1.5,
        respawnDelay: 3000
    },

    // Collision and knockback (Smash Bros style)
    collision: {
        baseForce: 12,
        damageMultiplier: 1.0, // Force scales: Force = Base * (1 + damage/100 * multiplier)
        minKnockbackVelocity: 3,
        maxKnockback: 50,
        hitstunBase: 8,
        hitstunScaling: 0.25,
        
        // DI (Directional Influence) settings
        diStrength: 0.12,
        
        // Funny physics settings
        tumbleThreshold: 18,
        bounceAmplification: 1.4,
        spinFactor: 2.0
    },

    // Stomp mechanics (Mario style)
    stomp: {
        minFallSpeed: 4,
        damageBase: 25,
        damagePerVelocity: 3,
        bounceForce: 12,
        victimKnockdown: 500,
        horizontalRange: 1.2,
        verticalRange: 1.8
    },

    // Surface materials
    materials: {
        normal: { friction: 0.4, restitution: 0.3 },
        ice: { friction: 0.02, restitution: 0.5 },
        bumper: { friction: 0.1, restitution: 2.5 },
        wall: { friction: 0.4, restitution: 0.5 },
        ramp: { friction: 0.3, restitution: 0.2 },
        spring: { friction: 0.3, restitution: 3.5 },
        sticky: { friction: 0.9, restitution: 0.1 }
    },

    // Special tile effects
    tiles: {
        boostPad: { force: 25, upward: 5 },
        spring: { force: 40 },
        conveyor: { speed: 8 },
        teleporter: { cooldown: 1000 }
    }
};

/**
 * Calculate knockback based on damage (Smash Bros formula)
 * Higher damage = more knockback
 */
export function calculateKnockback(baseDamage, targetDamage, weight = 1) {
    const { baseForce, damageMultiplier, maxKnockback } = PHYSICS_CONFIG.collision;
    
    // Knockback scaling formula
    const damageScaling = 1 + (targetDamage / 100) * damageMultiplier;
    const weightFactor = 1 / weight;
    
    const knockback = baseForce * damageScaling * weightFactor;
    return Math.min(knockback, maxKnockback);
}

/**
 * Calculate hitstun duration based on knockback
 */
export function calculateHitstun(knockback) {
    const { hitstunBase, hitstunScaling } = PHYSICS_CONFIG.collision;
    return Math.floor(hitstunBase + knockback * hitstunScaling);
}

/**
 * Check if position is in knockout zone (blast zone) - FIXED: checks all directions
 */
export function isInKnockoutZone(position) {
    if (!position || position.length < 3) return false;
    
    const { blastZones } = PHYSICS_CONFIG.arena;
    
    // Check bottom
    if (position[1] < blastZones.bottom) return true;
    
    // Check top
    if (position[1] > blastZones.top) return true;
    
    // Check sides (X and Z)
    if (Math.abs(position[0]) > blastZones.side) return true;
    if (Math.abs(position[2]) > blastZones.side) return true;
    
    return false;
}

/**
 * Check if a stomp is valid
 */
export function canStomp(attackerPos, attackerVel, targetPos) {
    if (!attackerPos || !targetPos || !attackerVel) return false;
    
    const { stomp } = PHYSICS_CONFIG;
    
    // Must be falling fast enough
    if (attackerVel[1] > -stomp.minFallSpeed) return false;
    
    // Must be above target
    const dy = attackerPos[1] - targetPos[1];
    if (dy < 0.3 || dy > stomp.verticalRange) return false;
    
    // Must be horizontally close
    const dx = attackerPos[0] - targetPos[0];
    const dz = attackerPos[2] - targetPos[2];
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    if (horizontalDist > stomp.horizontalRange) return false;
    
    return true;
}

/**
 * Calculate stomp damage
 */
export function calculateStompDamage(fallSpeed) {
    const { stomp } = PHYSICS_CONFIG;
    return stomp.damageBase + Math.abs(fallSpeed) * stomp.damagePerVelocity;
}

/**
 * Calculate distance between two 3D points
 */
export function distance3D(pos1, pos2) {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(
        (pos1[0] - pos2[0]) ** 2 +
        (pos1[1] - pos2[1]) ** 2 +
        (pos1[2] - pos2[2]) ** 2
    );
}

/**
 * Get spawn positions for multiplayer
 */
export function getSpawnPosition(playerIndex, mapData = null) {
    // Use map-defined spawns if available
    if (mapData?.spawns?.[playerIndex]) {
        const spawn = mapData.spawns[playerIndex];
        return [spawn.x || spawn[0], 2, spawn.z || spawn[2]];
    }
    
    // Default positions
    const defaultPositions = [
        [-10, 2, -8],
        [10, 2, 8],
        [-10, 2, 8],
        [10, 2, -8],
        [0, 2, -10],
        [0, 2, 10],
        [-10, 2, 0],
        [10, 2, 0]
    ];
    
    return defaultPositions[playerIndex % defaultPositions.length];
}

/**
 * Get random power-up spawn position
 */
export function getRandomPowerupPosition(mapData = null) {
    if (mapData?.powerupZones?.length > 0) {
        const zone = mapData.powerupZones[Math.floor(Math.random() * mapData.powerupZones.length)];
        return [zone.x, 1.5, zone.z];
    }
    
    return [
        (Math.random() - 0.5) * 20,
        1.5,
        (Math.random() - 0.5) * 15
    ];
}

/**
 * Get random power-up type
 */
export function getRandomPowerupType() {
    const types = [
        'speed_boost', 'shield', 'rocket', 'bomb_throw',
        'giant', 'shrink', 'teleport', 'jump_jet'
    ];
    return types[Math.floor(Math.random() * types.length)];
}

/**
 * Apply directional influence (DI)
 * Allows player to slightly alter knockback direction
 */
export function applyDI(knockbackVector, inputVector) {
    if (!knockbackVector || !inputVector) return knockbackVector;
    
    const { diStrength } = PHYSICS_CONFIG.collision;
    
    return [
        knockbackVector[0] + inputVector[0] * diStrength * Math.abs(knockbackVector[0]),
        knockbackVector[1], // No vertical DI
        knockbackVector[2] + inputVector[2] * diStrength * Math.abs(knockbackVector[2])
    ];
}

/**
 * Check for funny physics moments
 * Returns special effect type if conditions met
 */
export function checkFunnyPhysics(velocity, angularVelocity, damage) {
    if (!velocity) return null;
    
    const speed = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2);
    const spin = angularVelocity ? 
        Math.sqrt(angularVelocity[0]**2 + angularVelocity[1]**2 + angularVelocity[2]**2) : 0;
    
    // High speed tumble (PUBG car flip moment)
    if (speed > PHYSICS_CONFIG.collision.tumbleThreshold) {
        return 'tumble';
    }
    
    // Extreme spin
    if (spin > 12) {
        return 'spinout';
    }
    
    // Pinball mode at high damage
    if (damage > 150 && speed > 12) {
        return 'pinball';
    }
    
    return null;
}

/**
 * Calculate survival probability
 * Used for comeback mechanics / rage mode
 */
export function calculateSurvivalChance(damage, knockback, position) {
    if (!position) return 0;
    
    const { blastZones } = PHYSICS_CONFIG.arena;
    
    const distanceToBlast = Math.min(
        blastZones.side - Math.abs(position[0]),
        blastZones.side - Math.abs(position[2]),
        blastZones.top - position[1],
        position[1] - blastZones.bottom
    );
    
    if (distanceToBlast <= 0) return 0;
    
    const survivalScore = distanceToBlast / (knockback + 1);
    return Math.max(0, Math.min(1, survivalScore));
}

/**
 * Legacy exports for backwards compatibility
 */
export const POWERUP_TYPES = {
    SPEED: {
        id: 'speed',
        name: 'Speed Boost',
        color: '#00ff87',
        icon: '⚡',
        effect: { velocityMultiplier: 1.8 },
        duration: 5000,
    },
    DAMAGE: {
        id: 'damage',
        name: 'Heavy Hitter',
        color: '#ff006e',
        icon: '🥊',
        effect: { damageMultiplier: 2.0 },
        duration: 6000,
    },
    SHIELD: {
        id: 'shield',
        name: 'Juggernaut',
        color: '#00d4ff',
        icon: '🛡️',
        effect: { knockbackResistance: 0.8 },
        duration: 8000,
    },
    SUPER_BOOST: {
        id: 'superboost',
        name: 'Launch',
        color: '#9d4edd',
        icon: '🚀',
        effect: { instantBoost: 35 },
        duration: 0,
    },
};

export const SURFACE_TYPES = {
    ICE: 'ice',
    BUMPER: 'bumper',
    NORMAL: 'normal',
};

// Alias for backwards compatibility
export const MATERIALS = PHYSICS_CONFIG.materials;

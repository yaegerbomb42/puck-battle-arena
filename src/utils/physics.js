// Physics configuration for chaos arena
export const PHYSICS_CONFIG = {
  // Gravity - Standard-ish gravity
  gravity: [0, -30, 0],

  // Puck properties
  puck: {
    mass: 1,
    radius: 0.5,
    maxVelocity: 18, // Increased for chaos
    acceleration: 22,
    linearDamping: 0.3,
    angularDamping: 0.5,
    restitution: 0.7,
    friction: 0.1, // Slipperier default
  },

  // Arena properties
  arena: {
    fallThreshold: -5,
  },

  // Power-up spawn settings
  powerups: {
    minSpawnInterval: 6000,
    maxSpawnInterval: 10000,
    maxOnField: 4,
    effectDuration: 6000,
    pickupRadius: 1.2, // Generous pickup radius
  },

  // Collision force settings
  collision: {
    baseForce: 15, // Higher base impact
    damageMultiplier: 0.8, // Force = Base + (Damage * Multiplier)
    minKnockbackVelocity: 5,
    collisionImpulse: 10,
  },

  // Special materials
  materials: {
    ice: { friction: 0.01, restitution: 0.5 },
    bumper: { friction: 0.1, restitution: 1.5 }, // Super bouncy
    wall: { friction: 0.3, restitution: 0.2 },
    ramp: { friction: 0.1, restitution: 0.1 },
  }
};

// Power-up types
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

// Check if position is knockout
export function isInKnockoutZone(position) {
  return position[1] < PHYSICS_CONFIG.arena.fallThreshold;
}

// Calculate distance between two 3D points
export function distance3D(pos1, pos2) {
  return Math.sqrt(
    (pos1[0] - pos2[0]) ** 2 +
    (pos1[1] - pos2[1]) ** 2 +
    (pos1[2] - pos2[2]) ** 2
  );
}

// Get spawn positions for multiplayer
export function getSpawnPosition(playerIndex) {
  const positions = [
    [-8, 2, -6],
    [8, 2, 6],
    [-8, 2, 6],
    [8, 2, -6],
  ];
  return positions[playerIndex % 4];
}

// Get random power-up spawn position (away from edges)
export function getRandomPowerupPosition() {
  return [
    (Math.random() - 0.5) * 16,
    1.5,
    (Math.random() - 0.5) * 10
  ];
}

// Get random power-up type
export function getRandomPowerupType() {
  const types = Object.values(POWERUP_TYPES);
  return types[Math.floor(Math.random() * types.length)];
}

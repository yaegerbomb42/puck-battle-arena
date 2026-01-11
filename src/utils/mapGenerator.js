/**
 * Enhanced Procedural Map Generator
 * Generates rich, strategic, visually interesting arenas
 */

// Tile types
export const TILE_TYPES = {
    FLOOR: 'floor',
    ICE: 'ice',
    LAVA: 'lava',
    RAMP: 'ramp',
    BUMPER: 'bumper',
    WALL: 'wall',
    SPAWN: 'spawn',
    POWERUP_ZONE: 'powerup',
    BOOST_PAD: 'boost_pad',
    SPRING: 'spring',
    PIT: 'pit'
};

// Biome definitions with fog settings
export const BIOMES = {
    NEON_CITY: {
        id: 'neon_city',
        name: 'Neon Metropolis',
        description: 'Cyberpunk cityscape with boost pads',
        colors: {
            floor: '#1a1a2e',
            accent: '#00d4ff',
            hazard: '#ff006e',
            secondary: '#9d4edd',
            glow: '#00ff87'
        },
        skybox: 'night',
        fog: { color: '#0a0a1a', near: 30, far: 80 },
        weights: { floor: 0.4, ice: 0.05, lava: 0.08, ramp: 0.15, bumper: 0.15, boost_pad: 0.12, spring: 0.05 }
    },
    VOLCANIC_FORGE: {
        id: 'volcanic_forge',
        name: 'Volcanic Forge',
        description: 'Deadly lava arena',
        colors: {
            floor: '#2d1810',
            accent: '#ff4500',
            hazard: '#ff2200',
            secondary: '#ff8c00',
            glow: '#ffcc00'
        },
        skybox: 'sunset',
        fog: { color: '#1a0a05', near: 20, far: 60 },
        weights: { floor: 0.35, ice: 0, lava: 0.25, ramp: 0.12, bumper: 0.13, spring: 0.1, pit: 0.05 }
    },
    FROZEN_SUMMIT: {
        id: 'frozen_summit',
        name: 'Frozen Summit',
        description: 'Slippery ice arena',
        colors: {
            floor: '#e8f4f8',
            accent: '#88ccff',
            hazard: '#00ffff',
            secondary: '#b8e4ff',
            glow: '#ffffff'
        },
        skybox: 'dawn',
        fog: { color: '#d6e4ff', near: 25, far: 70 },
        weights: { floor: 0.25, ice: 0.45, lava: 0, ramp: 0.1, bumper: 0.1, spring: 0.05, pit: 0.05 }
    },
    JUNGLE_RUINS: {
        id: 'jungle_ruins',
        name: 'Jungle Ruins',
        description: 'Ancient temple with traps',
        colors: {
            floor: '#2d4a3e',
            accent: '#4ade80',
            hazard: '#84cc16',
            secondary: '#a3e635',
            glow: '#22c55e'
        },
        skybox: 'forest',
        fog: { color: '#1a2f23', near: 20, far: 65 },
        weights: { floor: 0.35, ice: 0.05, lava: 0.1, ramp: 0.2, bumper: 0.15, spring: 0.1, boost_pad: 0.05 }
    },
    CANDY_CHAOS: {
        id: 'candy_chaos',
        name: 'Sugar Rush Arena',
        description: 'Colorful bouncy chaos',
        colors: {
            floor: '#fef3c7',
            accent: '#f472b6',
            hazard: '#38bdf8',
            secondary: '#a3e635',
            glow: '#fbbf24'
        },
        skybox: 'sunset',
        fog: { color: '#fef9c3', near: 30, far: 90 },
        weights: { floor: 0.2, ice: 0.1, lava: 0, ramp: 0.15, bumper: 0.3, spring: 0.2, boost_pad: 0.05 }
    },
    SPACE_STATION: {
        id: 'space_station',
        name: 'Zero-G Station',
        description: 'Orbital platform',
        colors: {
            floor: '#1e1e2e',
            accent: '#7c3aed',
            hazard: '#ec4899',
            secondary: '#6366f1',
            glow: '#a78bfa'
        },
        skybox: 'night',
        fog: { color: '#0a0a15', near: 35, far: 100 },
        weights: { floor: 0.3, ice: 0.1, lava: 0.05, ramp: 0.1, bumper: 0.2, boost_pad: 0.15, pit: 0.1 }
    },
    SOLAR_PARK: {
        id: 'solar_park',
        name: 'Solar Park',
        description: 'Bright sunny outdoor arena',
        colors: {
            floor: '#f5f5dc',
            accent: '#32cd32',
            hazard: '#ffa500',
            secondary: '#87ceeb',
            glow: '#ffd700'
        },
        skybox: 'sunset',
        fog: { color: '#e6f3ff', near: 40, far: 120 },
        weights: { floor: 0.5, ice: 0, lava: 0.05, ramp: 0.15, bumper: 0.15, boost_pad: 0.1, spring: 0.05 }
    },
    OCEAN_DEPTHS: {
        id: 'ocean_depths',
        name: 'Ocean Depths',
        description: 'Underwater ruins',
        colors: {
            floor: '#1a3a4a',
            accent: '#00ced1',
            hazard: '#ff6347',
            secondary: '#48d1cc',
            glow: '#40e0d0'
        },
        skybox: 'night',
        fog: { color: '#0a2a3a', near: 15, far: 55 },
        weights: { floor: 0.35, ice: 0.2, lava: 0.1, ramp: 0.1, bumper: 0.1, spring: 0.1, pit: 0.05 }
    },
    CRYSTAL_CAVERN: {
        id: 'crystal_cavern',
        name: 'Crystal Cavern',
        description: 'Glowing crystal caves',
        colors: {
            floor: '#2a1a3a',
            accent: '#da70d6',
            hazard: '#ff1493',
            secondary: '#9370db',
            glow: '#ee82ee'
        },
        skybox: 'night',
        fog: { color: '#1a0a2a', near: 18, far: 60 },
        weights: { floor: 0.3, ice: 0.15, lava: 0.1, ramp: 0.15, bumper: 0.15, spring: 0.1, boost_pad: 0.05 }
    },
    SAKURA_GARDEN: {
        id: 'sakura_garden',
        name: 'Sakura Garden',
        description: 'Peaceful Japanese garden',
        colors: {
            floor: '#f5e6d3',
            accent: '#ffb7c5',
            hazard: '#c0392b',
            secondary: '#d4a5a5',
            glow: '#ff69b4'
        },
        skybox: 'dawn',
        fog: { color: '#fff5f5', near: 35, far: 100 },
        weights: { floor: 0.5, ice: 0.05, lava: 0.03, ramp: 0.12, bumper: 0.12, spring: 0.1, boost_pad: 0.08 }
    }
};

// ============================================
// BIOME UTILITY FUNCTIONS
// ============================================

/**
 * Get list of all biomes for UI display
 */
export function getBiomeList() {
    return Object.entries(BIOMES).map(([key, biome]) => ({
        key,
        id: biome.id,
        name: biome.name,
        description: biome.description,
        colors: biome.colors
    }));
}

/**
 * Get a specific biome by ID
 */
export function getBiomeById(biomeId) {
    return Object.values(BIOMES).find(b => b.id === biomeId) || BIOMES.NEON_CITY;
}

/**
 * Get random biome using seed
 */
export function getRandomBiome(seed) {
    const rng = createRNG(seed);
    const biomeKeys = Object.keys(BIOMES);
    return BIOMES[biomeKeys[Math.floor(rng() * biomeKeys.length)]];
}

// Seeded RNG (Mulberry32)
function createRNG(seed) {
    let state = seed;
    return function () {
        state |= 0;
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Generate elevation map
function generateElevationMap(rng, gridSize) {
    const elevation = [];
    for (let z = 0; z < gridSize; z++) {
        const row = [];
        for (let x = 0; x < gridSize; x++) {
            const distFromCenter = Math.sqrt(
                Math.pow(x - gridSize / 2, 2) + Math.pow(z - gridSize / 2, 2)
            );
            const centerBias = 1 - (distFromCenter / (gridSize / 2)) * 0.3;
            const noiseVal = (Math.sin(x * 0.5) * Math.cos(z * 0.5) * 0.5 + 0.5) * rng();
            row.push(Math.floor(noiseVal * centerBias * 2));
        }
        elevation.push(row);
    }
    return elevation;
}

// Main generation function
export function generateMap(seed, gridSize = 12, chaosLevel = 0.5) {
    const rng = createRNG(seed);

    // Select biome
    const biomeKeys = Object.keys(BIOMES);
    const biome = BIOMES[biomeKeys[Math.floor(rng() * biomeKeys.length)]];

    // Initialize grid
    const elevationMap = generateElevationMap(rng, gridSize);
    const grid = [];

    for (let z = 0; z < gridSize; z++) {
        const row = [];
        for (let x = 0; x < gridSize; x++) {
            row.push({
                type: TILE_TYPES.FLOOR,
                x, z,
                elevation: elevationMap[z][x],
                rotation: 0
            });
        }
        grid.push(row);
    }

    // Spawn points
    const spawns = [
        { x: 2, z: 2 },
        { x: gridSize - 3, z: gridSize - 3 },
        { x: 2, z: gridSize - 3 },
        { x: gridSize - 3, z: 2 }
    ];

    spawns.forEach(s => {
        if (grid[s.z]?.[s.x]) {
            grid[s.z][s.x].type = TILE_TYPES.SPAWN;
            grid[s.z][s.x].elevation = 0;
        }
    });

    // Powerup zones
    const powerupZones = [
        { x: Math.floor(gridSize / 2), z: Math.floor(gridSize / 2) },
        { x: Math.floor(gridSize / 4), z: Math.floor(gridSize / 2) },
        { x: Math.floor(3 * gridSize / 4), z: Math.floor(gridSize / 2) }
    ];

    powerupZones.forEach(p => {
        if (grid[p.z]?.[p.x]) {
            grid[p.z][p.x].type = TILE_TYPES.POWERUP_ZONE;
        }
    });

    // Fill tiles
    for (let z = 0; z < gridSize; z++) {
        for (let x = 0; x < gridSize; x++) {
            const tile = grid[z][x];
            if (tile.type !== TILE_TYPES.FLOOR) continue;

            // Edge walls
            if (x === 0 || x === gridSize - 1 || z === 0 || z === gridSize - 1) {
                tile.type = TILE_TYPES.WALL;
                continue;
            }

            // Random tile based on weights
            const roll = rng();
            const adjustedWeights = { ...biome.weights };

            // Chaos increases hazards
            if (adjustedWeights.lava) adjustedWeights.lava *= (1 + chaosLevel);
            if (adjustedWeights.pit) adjustedWeights.pit *= (1 + chaosLevel * 0.5);

            const total = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
            let cumulative = 0;

            for (const [tileType, weight] of Object.entries(adjustedWeights)) {
                cumulative += weight / total;
                if (roll < cumulative) {
                    tile.type = mapWeightToTile(tileType);
                    if (tileType === 'ramp') {
                        tile.rotation = Math.floor(rng() * 4) * (Math.PI / 2);
                    }
                    break;
                }
            }
        }
    }

    // Apply symmetry
    for (let z = 0; z < Math.floor(gridSize / 2); z++) {
        for (let x = 0; x < gridSize; x++) {
            const mirrorZ = gridSize - 1 - z;
            const mirrorX = gridSize - 1 - x;

            const original = grid[z][x];
            const mirror = grid[mirrorZ]?.[mirrorX];

            if (!mirror) continue;
            if (original.type === TILE_TYPES.SPAWN || original.type === TILE_TYPES.POWERUP_ZONE) continue;
            if (mirror.type === TILE_TYPES.SPAWN || mirror.type === TILE_TYPES.POWERUP_ZONE) continue;

            mirror.type = original.type;
            mirror.elevation = original.elevation;
        }
    }

    return {
        seed,
        gridSize,
        biome,
        grid,
        spawns,
        powerupZones,
        elevationMap,
        chaosLevel
    };
}

function mapWeightToTile(key) {
    const mapping = {
        'floor': TILE_TYPES.FLOOR,
        'ice': TILE_TYPES.ICE,
        'lava': TILE_TYPES.LAVA,
        'ramp': TILE_TYPES.RAMP,
        'bumper': TILE_TYPES.BUMPER,
        'boost_pad': TILE_TYPES.BOOST_PAD,
        'spring': TILE_TYPES.SPRING,
        'pit': TILE_TYPES.PIT
    };
    return mapping[key] || TILE_TYPES.FLOOR;
}

// Convert grid to world position
export function gridToWorld(gridX, gridZ, gridSize, tileSize = 3) {
    const offset = (gridSize * tileSize) / 2;
    return {
        x: gridX * tileSize - offset + tileSize / 2,
        z: gridZ * tileSize - offset + tileSize / 2
    };
}

// Get spawn positions in world coordinates
export function getSpawnPositions(mapData, tileSize = 3) {
    return mapData.spawns.map(s => {
        const { x, z } = gridToWorld(s.x, s.z, mapData.gridSize, tileSize);
        return [x, 1, z];
    });
}

// Validate map connectivity
export function validateMap(mapData) {
    const { grid, gridSize, spawns } = mapData;
    const visited = new Set();
    const queue = [spawns[0]];

    while (queue.length > 0) {
        const { x, z } = queue.shift();
        const key = `${x},${z}`;

        if (visited.has(key)) continue;
        if (x < 0 || x >= gridSize || z < 0 || z >= gridSize) continue;

        const tile = grid[z]?.[x];
        if (!tile) continue;
        if (tile.type === TILE_TYPES.WALL || tile.type === TILE_TYPES.LAVA || tile.type === TILE_TYPES.PIT) continue;

        visited.add(key);
        queue.push({ x: x + 1, z }, { x: x - 1, z }, { x, z: z + 1 }, { x, z: z - 1 });
    }

    return spawns.every(s => visited.has(`${s.x},${s.z}`));
}

// Generate valid map with retries
export function generateValidMap(baseSeed, gridSize = 12, chaosLevel = 0.5, maxAttempts = 10) {
    let seed = baseSeed;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const map = generateMap(seed, gridSize, chaosLevel);
        if (validateMap(map)) {
            return map;
        }
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    }

    return generateMap(baseSeed, gridSize, 0);
}

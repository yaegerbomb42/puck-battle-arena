// Enhanced Skin System with 5 Rarity Tiers
// Categories: Common, Rare, Epic, Legendary, Mythic

// ============ RARITY DEFINITIONS ============
export const RARITY = {
    COMMON: { id: 'common', name: 'Common', color: '#b0b0b0', dropRate: 0.50 },
    RARE: { id: 'rare', name: 'Rare', color: '#00d4ff', dropRate: 0.30 },
    EPIC: { id: 'epic', name: 'Epic', color: '#a855f7', dropRate: 0.15 },
    LEGENDARY: { id: 'legendary', name: 'Legendary', color: '#ffd700', dropRate: 0.04 },
    MYTHIC: { id: 'mythic', name: 'Mythic', color: '#ff006e', dropRate: 0.01 },
};

// ============ CURATED LEGENDARY & MYTHIC SKINS ============
const CURATED_SKINS = [
    // === LEGENDARY (4% drop) ===
    {
        id: 'dark_matter',
        name: 'Dark Matter',
        description: 'Forged in the heart of a dying star. Consumes all light.',
        rarity: 'legendary',
        baseColor: '#0a0a0a',
        emissive: '#6b21a8',
        secondaryColor: '#1e1b4b',
        glow: 3.5,
        pattern: 'void',
        metallic: 0.9,
        roughness: 0.1
    },
    {
        id: 'mamba_gold',
        name: 'Mamba Gold',
        description: 'Dedication. Obsession. Victory. The 8/24 legacy.',
        rarity: 'legendary',
        baseColor: '#1a1a2e',
        emissive: '#fbbf24',
        secondaryColor: '#7c3aed',
        glow: 2.5,
        pattern: 'jersey',
        metallic: 0.8,
        roughness: 0.2
    },
    {
        id: 'supernova',
        name: 'Supernova Burst',
        description: 'The final explosion of a massive star. Blinding brilliance.',
        rarity: 'legendary',
        baseColor: '#ff4500',
        emissive: '#ffff00',
        secondaryColor: '#ff6b6b',
        glow: 4.0,
        pattern: 'explosion',
        metallic: 0.7,
        roughness: 0.0
    },
    {
        id: 'frozen_throne',
        name: 'Frozen Throne',
        description: 'Carved from eternal ice. Colder than absolute zero.',
        rarity: 'legendary',
        baseColor: '#e0f7fa',
        emissive: '#00bcd4',
        secondaryColor: '#b3e5fc',
        glow: 2.0,
        pattern: 'crystal',
        metallic: 1.0,
        roughness: 0.05
    },
    {
        id: 'inferno_core',
        name: 'Inferno Core',
        description: 'Molten fury from the planet\'s core. Burns eternally.',
        rarity: 'legendary',
        baseColor: '#b71c1c',
        emissive: '#ff5722',
        secondaryColor: '#ffab00',
        glow: 3.0,
        pattern: 'lava',
        metallic: 0.6,
        roughness: 0.3
    },
    {
        id: 'neon_tokyo',
        name: 'Neon Tokyo',
        description: 'Cyberpunk streets at midnight. The city never sleeps.',
        rarity: 'legendary',
        baseColor: '#1a1a2e',
        emissive: '#ff00ff',
        secondaryColor: '#00ffff',
        glow: 3.5,
        pattern: 'cyber',
        metallic: 0.5,
        roughness: 0.2
    },
    {
        id: 'dragon_scale',
        name: 'Dragon Scale',
        description: 'Harvested from an ancient wyrm. Impenetrable.',
        rarity: 'legendary',
        baseColor: '#2e7d32',
        emissive: '#76ff03',
        secondaryColor: '#004d40',
        glow: 2.0,
        pattern: 'scale',
        metallic: 0.9,
        roughness: 0.15
    },
    {
        id: 'electric_storm',
        name: 'Electric Storm',
        description: 'Captured lightning in physical form. 1.21 gigawatts.',
        rarity: 'legendary',
        baseColor: '#1a237e',
        emissive: '#00e5ff',
        secondaryColor: '#ffffff',
        glow: 4.0,
        pattern: 'lightning',
        metallic: 0.8,
        roughness: 0.0
    },

    // === MYTHIC (1% drop) ===
    {
        id: 'holographic_prism',
        name: 'Holographic Prism',
        description: 'Bends light itself. Each angle reveals new colors.',
        rarity: 'mythic',
        baseColor: '#ffffff',
        emissive: '#ff00ff',
        secondaryColor: '#00ffff',
        glow: 5.0,
        pattern: 'holographic',
        metallic: 1.0,
        roughness: 0.0,
        animated: true
    },
    {
        id: 'void_walker',
        name: 'Void Walker',
        description: 'From the space between spaces. Reality bends around it.',
        rarity: 'mythic',
        baseColor: '#000000',
        emissive: '#9d4edd',
        secondaryColor: '#240046',
        glow: 4.5,
        pattern: 'void',
        metallic: 0.95,
        roughness: 0.0,
        animated: true
    },
    {
        id: 'golden_god',
        name: 'Golden God',
        description: 'Touched by divinity. Radiates pure perfection.',
        rarity: 'mythic',
        baseColor: '#ffd700',
        emissive: '#fff8e1',
        secondaryColor: '#ff8f00',
        glow: 5.0,
        pattern: 'divine',
        metallic: 1.0,
        roughness: 0.0,
        animated: true
    },
    {
        id: 'cosmic_entity',
        name: 'Cosmic Entity',
        description: 'Born from the Big Bang itself. Contains universes.',
        rarity: 'mythic',
        baseColor: '#0d0221',
        emissive: '#ff006e',
        secondaryColor: '#00ff87',
        glow: 5.0,
        pattern: 'galaxy',
        metallic: 0.9,
        roughness: 0.0,
        animated: true
    },
    {
        id: 'diamond_soul',
        name: 'Diamond Soul',
        description: 'Hardest substance in existence. Unbreakable spirit.',
        rarity: 'mythic',
        baseColor: '#e0f7fa',
        emissive: '#ffffff',
        secondaryColor: '#b2ebf2',
        glow: 4.0,
        pattern: 'diamond',
        metallic: 1.0,
        roughness: 0.0,
        animated: true
    },
    {
        id: 'shadow_demon',
        name: 'Shadow Demon',
        description: 'Nightmare made manifest. Fear given form.',
        rarity: 'mythic',
        baseColor: '#0a0a0a',
        emissive: '#dc2626',
        secondaryColor: '#450a0a',
        glow: 3.5,
        pattern: 'demonic',
        metallic: 0.8,
        roughness: 0.1,
        animated: true
    },
];

// ============ EPIC SKINS (Sports/Pop Culture) ============
const EPIC_SKINS = [
    { id: 'bulls_23', name: 'Chicago Legend', description: 'His Airness. The GOAT.', rarity: 'epic', baseColor: '#c62828', emissive: '#ffffff', secondaryColor: '#000000', glow: 1.5, pattern: 'jersey' },
    { id: 'lakers_8', name: 'Purple & Gold', description: 'LA legacy. Showtime forever.', rarity: 'epic', baseColor: '#552583', emissive: '#fdb927', secondaryColor: '#000000', glow: 1.5, pattern: 'jersey' },
    { id: 'warriors_30', name: 'Splash Zone', description: 'Bang! Bang! From downtown.', rarity: 'epic', baseColor: '#1d428a', emissive: '#ffc72c', secondaryColor: '#ffffff', glow: 1.5, pattern: 'jersey' },
    { id: 'retro_wave', name: 'Retro Wave', description: '80s sunset vibes. Synthwave dreams.', rarity: 'epic', baseColor: '#1a1a2e', emissive: '#ff6b9d', secondaryColor: '#c471ed', glow: 2.0, pattern: 'gradient' },
    { id: 'pixel_art', name: 'Pixel Perfect', description: '8-bit nostalgia. Press start.', rarity: 'epic', baseColor: '#2d3436', emissive: '#00ff00', secondaryColor: '#ff00ff', glow: 1.0, pattern: 'pixel' },
    { id: 'vapor_wave', name: 'Vapor Wave', description: 'A E S T H E T I C. Roman busts optional.', rarity: 'epic', baseColor: '#ff71ce', emissive: '#01cdfe', secondaryColor: '#05ffa1', glow: 2.0, pattern: 'gradient' },
    { id: 'samurai_steel', name: 'Samurai Steel', description: 'Folded 1000 times. Bushido code.', rarity: 'epic', baseColor: '#37474f', emissive: '#b71c1c', secondaryColor: '#ffd700', glow: 1.5, pattern: 'stripe' },
    { id: 'arctic_camo', name: 'Arctic Ops', description: 'Winter warfare specialist. Silent and cold.', rarity: 'epic', baseColor: '#eceff1', emissive: '#90a4ae', secondaryColor: '#455a64', glow: 1.0, pattern: 'camo' },
    { id: 'jungle_camo', name: 'Jungle Ghost', description: 'Predator protocol. They\'ll never see you.', rarity: 'epic', baseColor: '#1b5e20', emissive: '#4caf50', secondaryColor: '#3e2723', glow: 1.0, pattern: 'camo' },
    { id: 'galaxy_swirl', name: 'Galaxy Swirl', description: 'Spiral arms of distant galaxies.', rarity: 'epic', baseColor: '#1a1a2e', emissive: '#7c3aed', secondaryColor: '#06b6d4', glow: 2.5, pattern: 'galaxy' },
];

// ============ COLOR PALETTES ============
const COLORS = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF',
    '#FFA500', '#800080', '#008080', '#FFC0CB', '#FFD700', '#C0C0C0',
    '#FF4500', '#32CD32', '#1E90FF', '#FF1493', '#00FA9A', '#9400D3'
];

const PATTERNS = ['solid', 'stripe', 'dot', 'gradient', 'checker', 'ring'];

// ============ PROCEDURAL GENERATION ============
export const SKIN_DEFINITIONS = [];

let idCounter = 1;

// 1. Common Skins (50 skins)
COLORS.forEach((color, i) => {
    SKIN_DEFINITIONS.push({
        id: `common_${idCounter++}`,
        name: `Basic ${['Red', 'Green', 'Blue', 'Yellow', 'Cyan', 'Magenta', 'Orange', 'Purple', 'Teal', 'Pink', 'Gold', 'Silver', 'Ember', 'Lime', 'Azure', 'Rose', 'Mint', 'Violet'][i] || i}`,
        description: 'A simple but reliable color.',
        rarity: 'common',
        baseColor: color,
        glow: 0.1,
        pattern: 'solid'
    });
});

// Add pattern variations for common
PATTERNS.slice(1).forEach((pat) => {
    COLORS.slice(0, 6).forEach((col, cIdx) => {
        SKIN_DEFINITIONS.push({
            id: `common_${idCounter++}`,
            name: `${pat.charAt(0).toUpperCase() + pat.slice(1)} ${['Crimson', 'Emerald', 'Sapphire', 'Amber', 'Aqua', 'Fuchsia'][cIdx]}`,
            description: `Classic ${pat} pattern.`,
            rarity: 'common',
            baseColor: col,
            secondaryColor: COLORS[(cIdx + 3) % COLORS.length],
            pattern: pat,
            glow: 0.2
        });
    });
});

// 2. Rare Skins - Neon/Glow (40 skins)
COLORS.forEach((color, i) => {
    SKIN_DEFINITIONS.push({
        id: `rare_neon_${idCounter++}`,
        name: `Neon ${['Flame', 'Forest', 'Ocean', 'Sun', 'Ice', 'Berry', 'Sunset', 'Grape', 'Lagoon', 'Cotton', 'Treasure', 'Chrome', 'Blaze', 'Clover', 'Sky', 'Heart', 'Spring', 'Dusk'][i] || i}`,
        description: 'Glows in the dark. Visible from space.',
        rarity: 'rare',
        baseColor: '#1a1a1a',
        emissive: color,
        glow: 2.0,
        pattern: 'ring'
    });

    SKIN_DEFINITIONS.push({
        id: `rare_cyber_${idCounter++}`,
        name: `Cyber ${['Core', 'Pulse', 'Wave', 'Surge', 'Flux', 'Grid', 'Node', 'Link', 'Sync', 'Data', 'Cache', 'Stack', 'Loop', 'Hash', 'Port', 'Byte', 'Ping', 'Root'][i] || i}`,
        description: 'Digital aesthetic. Upload complete.',
        rarity: 'rare',
        baseColor: color,
        emissive: COLORS[(i + 3) % COLORS.length],
        glow: 1.5,
        pattern: 'stripe'
    });
});

// 3. Add Epic Skins
EPIC_SKINS.forEach(skin => SKIN_DEFINITIONS.push(skin));

// 4. Add Curated Legendary & Mythic
CURATED_SKINS.forEach(skin => SKIN_DEFINITIONS.push(skin));

// ============ UTILITY FUNCTIONS ============
export function getRandomSkin(rarityOverride) {
    const rand = Math.random();
    let targetRarity = 'common';

    if (rarityOverride) {
        targetRarity = rarityOverride;
    } else if (rand > 0.99) {
        targetRarity = 'mythic';
    } else if (rand > 0.95) {
        targetRarity = 'legendary';
    } else if (rand > 0.80) {
        targetRarity = 'epic';
    } else if (rand > 0.50) {
        targetRarity = 'rare';
    }

    const pool = SKIN_DEFINITIONS.filter(s => s.rarity === targetRarity);
    if (pool.length === 0) {
        return SKIN_DEFINITIONS[0]; // Fallback
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

export function getSkinById(id) {
    return SKIN_DEFINITIONS.find(s => s.id === id);
}

export function getSkinsByRarity(rarity) {
    return SKIN_DEFINITIONS.filter(s => s.rarity === rarity);
}

export function drawSkinTexture(ctx, skin, width = 256, height = 256) {
    // Background
    ctx.fillStyle = skin.baseColor;
    ctx.fillRect(0, 0, width, height);

    // Pattern
    if (skin.secondaryColor) {
        ctx.fillStyle = skin.secondaryColor;
        if (skin.pattern === 'stripe') {
            ctx.fillRect(width / 4, 0, width / 2, height);
        } else if (skin.pattern === 'dot') {
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, width / 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (skin.pattern === 'checker') {
            ctx.fillRect(0, 0, width / 2, height / 2);
            ctx.fillRect(width / 2, height / 2, width / 2, height / 2);
        } else if (skin.pattern === 'ring') {
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, width / 3, 0, Math.PI * 2);
            ctx.strokeStyle = skin.secondaryColor;
            ctx.lineWidth = 20;
            ctx.stroke();
        } else if (skin.pattern === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, skin.baseColor);
            gradient.addColorStop(1, skin.secondaryColor);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        } else if (skin.pattern === 'jersey') {
            // Jersey stripes
            ctx.fillRect(width * 0.1, 0, width * 0.1, height);
            ctx.fillRect(width * 0.8, 0, width * 0.1, height);
        }
    }

    // Emissive/Glow hints
    if (skin.emissive) {
        ctx.shadowBlur = skin.glow * 10 || 20;
        ctx.shadowColor = skin.emissive;
        ctx.strokeStyle = skin.emissive;
        ctx.lineWidth = 10;
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.shadowBlur = 0;
    }

    // Rarity border
    const rarityColors = {
        common: '#b0b0b0',
        rare: '#00d4ff',
        epic: '#a855f7',
        legendary: '#ffd700',
        mythic: '#ff006e'
    };
    ctx.strokeStyle = rarityColors[skin.rarity] || '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);
}

// Export skin count for UI
export const SKIN_COUNT = {
    common: SKIN_DEFINITIONS.filter(s => s.rarity === 'common').length,
    rare: SKIN_DEFINITIONS.filter(s => s.rarity === 'rare').length,
    epic: SKIN_DEFINITIONS.filter(s => s.rarity === 'epic').length,
    legendary: SKIN_DEFINITIONS.filter(s => s.rarity === 'legendary').length,
    mythic: SKIN_DEFINITIONS.filter(s => s.rarity === 'mythic').length,
    total: SKIN_DEFINITIONS.length
};

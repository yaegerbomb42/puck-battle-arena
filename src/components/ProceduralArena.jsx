import React, { useMemo, useRef } from 'react';
import { useBox, useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { TILE_TYPES, gridToWorld } from '../utils/mapGenerator';
import StadiumCrowd from './StadiumCrowd';

const TILE_SIZE = 3;
const TILE_HEIGHT = 0.5;

// ============================================
// FLOOR TILE
// ============================================
function FloorTile({ position, color, elevation = 0 }) {
    const y = elevation * TILE_HEIGHT - TILE_HEIGHT / 2;

    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, y - 2, position.z], // Shifted down
        args: [TILE_SIZE, 5, TILE_SIZE], // Thickened to 5 units
        material: { friction: 0.4, restitution: 0.3 }
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
            <meshStandardMaterial
                color={color}
                metalness={0.4}
                roughness={0.6}
                dithering
            />
            {/* Edge highlight */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE)]} />
                <lineBasicMaterial color="#333" linewidth={2} transparent opacity={0.2} />
            </lineSegments>
        </mesh>
    );
}

// ============================================
// ICE TILE
// ============================================
function IceTile({ position, color, elevation = 0 }) {
    const y = elevation * TILE_HEIGHT - TILE_HEIGHT / 2;

    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, y - 2, position.z],
        args: [TILE_SIZE, 5, TILE_SIZE],
        material: { friction: 0.05, restitution: 0.5 }
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
            <meshPhysicalMaterial
                color={color || '#88ccff'}
                metalness={0.1}
                roughness={0.05}
                transmission={0.6} // Glass-like transmission
                thickness={1.5}    // Refraction depth
                clearcoat={1}
                clearcoatRoughness={0.1}
                transparent
                opacity={0.9}
            />
        </mesh>
    );
}

// ============================================
// LAVA TILE (Hazard)
// ============================================
function LavaTile({ position, color }) {
    const meshRef = useRef();

    useFrame((state) => {
        if (meshRef.current?.material) {
            meshRef.current.material.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
        }
    });

    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, -2.5, position.z], // Deep buffer
        args: [TILE_SIZE, 5, TILE_SIZE],
        material: { friction: 0.5, restitution: 0.1 },
        userData: { type: 'lava' }
    }));

    return (
        <group>
            <mesh ref={ref} receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT * 0.3, TILE_SIZE]} />
                <meshStandardMaterial
                    color={color || '#ff4500'}
                    emissive="#ff2200"
                    emissiveIntensity={1.5}
                    metalness={0.5}
                    roughness={0.3}
                />
            </mesh>
            <pointLight
                color="#ff4500"
                intensity={0.8}
                distance={6}
                position={[position.x, 1.5, position.z]}
            />
        </group>
    );
}

// ============================================
// RAMP TILE
// ============================================
function RampTile({ position, rotation = 0, color, elevation = 0 }) {
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, elevation * TILE_HEIGHT, position.z],
        rotation: [Math.PI / 8, rotation, 0],
        args: [TILE_SIZE, TILE_HEIGHT * 0.5, TILE_SIZE * 1.1],
        material: { friction: 0.3, restitution: 0.2 }
    }));

    return (
        <mesh ref={ref} receiveShadow castShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT * 0.5, TILE_SIZE * 1.1]} />
            <meshStandardMaterial color={color || '#ffaa00'} metalness={0.4} roughness={0.5} />
        </mesh>
    );
}

// ============================================
// BUMPER TILE
// ============================================
function BumperTile({ position, color }) {
    const meshRef = useRef();

    const [ref] = useSphere(() => ({
        type: 'Static',
        position: [position.x, TILE_HEIGHT, position.z],
        args: [TILE_SIZE * 0.35],
        material: { friction: 0.1, restitution: 2.5 }
    }));

    useFrame((state) => {
        if (meshRef.current?.material) {
            meshRef.current.material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
        }
    });

    return (
        <group>
            <mesh position={[position.x, -TILE_HEIGHT / 2, position.z]} receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
                <meshStandardMaterial color="#2a2a3a" />
            </mesh>
            <mesh ref={ref} castShadow>
                <sphereGeometry args={[TILE_SIZE * 0.35, 16, 16]} />
                <meshStandardMaterial
                    ref={meshRef}
                    color={color || '#ff00ff'}
                    emissive={color || '#ff00ff'}
                    emissiveIntensity={0.5}
                    metalness={0.9}
                    roughness={0.1}
                />
            </mesh>
            {/* Glow ring */}
            <mesh position={[position.x, 0.1, position.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[TILE_SIZE * 0.4, TILE_SIZE * 0.5, 32]} />
                <meshBasicMaterial color={color || '#ff00ff'} transparent opacity={0.6} />
            </mesh>
        </group>
    );
}

// ============================================
// WALL TILE
// ============================================
function WallTile({ position, color }) {
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, TILE_HEIGHT * 2, position.z],
        args: [TILE_SIZE, TILE_HEIGHT * 5, TILE_SIZE],
        material: { friction: 0.5, restitution: 0.4 }
    }));

    return (
        <mesh ref={ref} castShadow receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT * 5, TILE_SIZE]} />
            <meshStandardMaterial color={color || '#aaaaaa'} metalness={0.2} roughness={0.8} />
        </mesh>
    );
}

// ============================================
// SPAWN TILE
// ============================================
function SpawnTile({ position, color }) {
    const ringRef = useRef();

    useFrame((state) => {
        if (ringRef.current) {
            ringRef.current.rotation.z = state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <group position={[position.x, 0.01, position.z]}>
            <mesh receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.2} roughness={0.7} />
            </mesh>
            <mesh ref={ringRef} position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.7, 1.0, 6]} />
                <meshStandardMaterial
                    color={color || '#00ff87'}
                    emissive={color || '#00ff87'}
                    emissiveIntensity={1}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}

// ============================================
// POWERUP ZONE TILE
// ============================================
function PowerupZoneTile({ position }) {
    const glowRef = useRef();

    useFrame((state) => {
        if (glowRef.current) {
            glowRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
            glowRef.current.material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        }
    });

    return (
        <group position={[position.x, 0.01, position.z]}>
            <mesh receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
                <meshStandardMaterial color="#222233" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh ref={glowRef} position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
                <meshStandardMaterial
                    color="#ffd700"
                    emissive="#ffd700"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        </group>
    );
}

// ============================================
// BOOST PAD TILE
// ============================================
function BoostPadTile({ position, color, rotation = 0 }) {
    const arrowRef = useRef();

    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, -TILE_HEIGHT / 2, position.z],
        args: [TILE_SIZE, TILE_HEIGHT, TILE_SIZE],
        material: { friction: 0.2, restitution: 0.3 },
        userData: { type: 'boost_pad', direction: rotation }
    }));

    useFrame((state) => {
        if (arrowRef.current) {
            arrowRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 6) * 0.15;
        }
    });

    return (
        <group>
            <mesh ref={ref} receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.6} />
            </mesh>
            <group ref={arrowRef} position={[position.x, 0.3, position.z]} rotation={[0, rotation, 0]}>
                <mesh>
                    <coneGeometry args={[0.5, 1, 3]} />
                    <meshStandardMaterial
                        color={color || '#00ff87'}
                        emissive={color || '#00ff87'}
                        emissiveIntensity={1}
                    />
                </mesh>
            </group>
        </group>
    );
}

// ============================================
// CONVEYOR TILE (NEW)
// ============================================
function ConveyorTile({ position, color, rotation = 0 }) {
    const textureRef = useRef();
    
    useFrame((state) => {
        if (textureRef.current) {
            textureRef.current.offset.x -= 0.02; // Scrolling effect
        }
    });

    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, -2.25, position.z],
        args: [TILE_SIZE, 5, TILE_SIZE],
        material: { friction: 0.1, restitution: 0.2 },
        userData: { type: 'conveyor', direction: rotation, speed: 12 }
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
            <meshStandardMaterial color={color || '#555'} metalness={0.6} roughness={0.4}>
                {/* Scrolling arrows or lines would go here with a texture */}
            </meshStandardMaterial>
            <mesh position={[0, TILE_HEIGHT/2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, rotation]}>
                <planeGeometry args={[TILE_SIZE * 0.8, TILE_SIZE * 0.8]} />
                <meshBasicMaterial color={color || '#00ff87'} transparent opacity={0.4} wireframe />
            </mesh>
        </mesh>
    );
}

// ============================================
// JUMP PAD TILE (NEW - Enhanced Spring)
// ============================================
function JumpPadTile({ position, color }) {
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, -2.25, position.z],
        args: [TILE_SIZE, 5, TILE_SIZE],
        material: { friction: 0.3, restitution: 4.5 }, // Extra bouncy
        userData: { type: 'jump_pad' }
    }));

    return (
        <group>
            <mesh ref={ref} receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <Float speed={10} rotationIntensity={0} floatIntensity={0.5}>
                <mesh position={[position.x, 0.5, position.z]}>
                    <cylinderGeometry args={[0.8, 1, 0.3, 32]} />
                    <meshStandardMaterial color={color || '#9d4edd'} emissive={color || '#9d4edd'} emissiveIntensity={2} />
                </mesh>
            </Float>
            <pointLight position={[position.x, 1, position.z]} color={color || '#9d4edd'} intensity={1} distance={5} />
        </group>
    );
}

// ============================================
// MOVING WALL TILE (NEW)
// ============================================
function MovingWallTile({ position, color }) {
    const wallRef = useRef();
    const [ref, api] = useBox(() => ({
        type: 'Kinematic', // Moves but isn't pushed
        position: [position.x, TILE_HEIGHT * 2, position.z],
        args: [TILE_SIZE, TILE_HEIGHT * 5, TILE_SIZE],
        material: { friction: 0.5, restitution: 0.6 }
    }));

    useFrame((state) => {
        // Oscillate up and down
        const y = TILE_HEIGHT * 2 + Math.sin(state.clock.elapsedTime * 1.5) * 3;
        api.position.set(position.x, y, position.z);
    });

    return (
        <mesh ref={ref} castShadow receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT * 5, TILE_SIZE]} />
            <meshStandardMaterial color={color || '#888'} metalness={0.5} roughness={0.2} />
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT * 5, TILE_SIZE)]} />
                <lineBasicMaterial color="#ff006e" linewidth={2} />
            </lineSegments>
        </mesh>
    );
}

// ============================================
// PIT TILE
// ============================================
function PitTile({ position }) {
    return (
        <group position={[position.x, -TILE_HEIGHT * 2, position.z]}>
            <mesh receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT * 0.1, TILE_SIZE]} />
                <meshStandardMaterial color="#000000" metalness={0} roughness={1} />
            </mesh>
            {/* Warning stripes */}
            <mesh position={[0, TILE_HEIGHT + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[TILE_SIZE * 0.3, TILE_SIZE * 0.45, 32]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

// ============================================
// MAIN PROCEDURAL ARENA
// ============================================
// ============================================
// OUTER DECORATIONS (Step 26)
// ============================================
function ArenaDecorations() {
    const pillars = useMemo(() => {
        return new Array(20).fill(0).map((_, i) => ({
            position: [
                (Math.random() - 0.5) * 80,
                (Math.random() * 10) - 10,
                (Math.random() - 0.5) * 80
            ],
            scale: [1 + Math.random() * 2, 10 + Math.random() * 20, 1 + Math.random() * 2],
            rotation: [0, Math.random() * Math.PI, 0]
        })).filter(p => Math.abs(p.position[0]) > 25 || Math.abs(p.position[2]) > 25);
    }, []);

    return (
        <group>
            {pillars.map((p, i) => (
                <mesh key={i} position={p.position} scale={p.scale} rotation={p.rotation} receiveShadow>
                    <boxGeometry />
                    <meshStandardMaterial color="#111" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

// ============================================
// STADIUM DOME (Rocket League Style)
// ============================================
function StadiumDome({ biome }) {
    return (
        <group>
            {/* Hexagon Cage Structure */}
            <mesh scale={[120, 80, 120]} position={[0, 20, 0]}>
                <sphereGeometry args={[1, 32, 16]} />
                <meshBasicMaterial
                    color={biome?.colors?.accent || '#00d4ff'}
                    wireframe
                    transparent
                    opacity={0.15}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Giant Glowing Rings */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
                <ringGeometry args={[118, 120, 64]} />
                <meshStandardMaterial
                    color={biome?.colors?.hazard || '#ff006e'}
                    emissive={biome?.colors?.hazard || '#ff006e'}
                    emissiveIntensity={4}
                    toneMapped={false}
                />
            </mesh>

            {/* LED Ribbon Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 25, 0]}>
                <torusGeometry args={[80, 0.5, 8, 64]} />
                <meshStandardMaterial
                    color={biome?.colors?.accent || '#00d4ff'}
                    emissive={biome?.colors?.accent || '#00d4ff'}
                    emissiveIntensity={3}
                    toneMapped={false}
                />
            </mesh>

            {/* Spotlights pointing down at arena */}
            {[...Array(4)].map((_, i) => {
                const angle = (i / 4) * Math.PI * 2;
                return (
                    <group key={`spotlight-${i}`} position={[Math.sin(angle) * 50, 50, Math.cos(angle) * 50]}>
                        <spotLight
                            color={biome?.colors?.glow || '#ffffff'}
                            intensity={10}
                            angle={Math.PI / 6}
                            penumbra={0.5}
                            distance={100}
                            target-position={[0, 0, 0]}
                            castShadow
                        />
                        {/* Light housing */}
                        <mesh>
                            <boxGeometry args={[2, 1, 2]} />
                            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
                        </mesh>
                    </group>
                );
            })}

            {/* Floating Crowd / Lights placeholder */}
            <Float speed={5} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[20, 30]}>
                <group position={[0, 0, 0]}>
                    <pointLight position={[0, 50, 0]} intensity={1.5} color={biome?.colors?.accent} distance={200} />
                    {[...Array(12)].map((_, i) => (
                        <mesh key={i} position={[
                            Math.sin(i / 12 * Math.PI * 2) * 70,
                            35 + Math.sin(i) * 5,
                            Math.cos(i / 12 * Math.PI * 2) * 70
                        ]}>
                            <sphereGeometry args={[1, 8, 8]} />
                            <meshBasicMaterial color={biome?.colors?.glow || '#fff'} />
                        </mesh>
                    ))}
                </group>
            </Float>
        </group>
    );
}

// ============================================
// REFLECTIVE ARENA BASE (Rocket League Floor)
// ============================================
function ReflectiveBase({ color }) {
    // A single giant reflective plane beneath the tiles to unify the scene
    return (
        <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[300, 300]} />
            <MeshReflectorMaterial
                blur={[400, 100]}
                resolution={256}  // Ultra-low res for safety regarding freeze
                mixBlur={1.0}     // High mix blur hides low res
                mixStrength={5}   // Subtle reflection
                roughness={0.6}   // Rougher floor
                depthScale={1}
                minDepthThreshold={0.5}
                maxDepthThreshold={1.4}
                color={color || "#151515"}
                metalness={0.5}
                mirror={0.25}
            />
        </mesh>
    );
}

// ============================================
// CENTER COURT DECAL
// ============================================
function CenterCourtDecal({ color }) {
    return (
        <group position={[0, 0.01, 0]}>
            {/* Center Circle */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[8, 10, 64]} />
                <meshStandardMaterial
                    color={color || '#00d4ff'}
                    emissive={color || '#00d4ff'}
                    emissiveIntensity={1}
                    transparent
                    opacity={0.6}
                    toneMapped={false}
                />
            </mesh>

            {/* Center Dot */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[2, 32]} />
                <meshStandardMaterial
                    color={color || '#00d4ff'}
                    emissive={color || '#00d4ff'}
                    emissiveIntensity={2}
                    toneMapped={false}
                />
            </mesh>

            {/* Goal Lines (X-axis markers) */}
            <mesh position={[-30, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2, 25]} />
                <meshStandardMaterial
                    color="#ff006e"
                    emissive="#ff006e"
                    emissiveIntensity={1}
                    transparent
                    opacity={0.5}
                />
            </mesh>
            <mesh position={[30, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2, 25]} />
                <meshStandardMaterial
                    color="#ff006e"
                    emissive="#ff006e"
                    emissiveIntensity={1}
                    transparent
                    opacity={0.5}
                />
            </mesh>
        </group>
    );
}

// ============================================
// STADIUM COLLIDER (Invisible Walls)
// ============================================
function StadiumCollider() {
    // Octagonal wall layout approx radius 65
    // 8 walls, rotated 45 degrees each
    const WALL_DIST = 65;
    const WALL_HEIGHT = 40;

    // Ceiling
    useBox(() => ({
        type: 'Static',
        position: [0, 50, 0],
        args: [140, 2, 140],
        material: { friction: 0, restitution: 0.5 }
    }));

    // Side Walls (Invisible)
    const walls = [];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        walls.push(
            <StadiumWall
                key={i}
                position={[Math.sin(angle) * WALL_DIST, WALL_HEIGHT / 2, Math.cos(angle) * WALL_DIST]}
                rotation={[0, angle, 0]}
            />
        );
    }
    return <group>{walls}</group>;
}

function StadiumWall({ position, rotation }) {
    useBox(() => ({
        type: 'Static',
        position,
        rotation,
        args: [55, 40, 2], // Width connects the octagon
        material: { friction: 0, restitution: 0.8 } // Bouncy walls
    }));
    return null; // Invisible
}

export default function ProceduralArena({ mapData }) {
    const tiles = useMemo(() => {
        if (!mapData?.grid) return [];
        // ... (rest of tiles logic)

        // Inside return of ProceduralArena:




        const result = [];
        const { grid, gridSize, biome } = mapData;
        const colors = biome?.colors || { floor: '#666666', accent: '#00d4ff', hazard: '#ff0000' };

        for (let z = 0; z < gridSize; z++) {
            for (let x = 0; x < gridSize; x++) {
                const tile = grid[z]?.[x];
                if (!tile) continue;

                const worldPos = gridToWorld(x, z, gridSize, TILE_SIZE);
                const key = `tile-${x}-${z}`;
                const elevation = tile.elevation || 0;

                switch (tile.type) {
                    case TILE_TYPES.FLOOR:
                        result.push(<FloorTile key={key} position={worldPos} color={colors.floor} elevation={elevation} />);
                        break;
                    case TILE_TYPES.ICE:
                        result.push(<IceTile key={key} position={worldPos} color={colors.accent} elevation={elevation} />);
                        break;
                    case TILE_TYPES.LAVA:
                        result.push(<LavaTile key={key} position={worldPos} color={colors.hazard} />);
                        break;
                    case TILE_TYPES.RAMP:
                        result.push(<RampTile key={key} position={worldPos} rotation={tile.rotation || 0} color={colors.accent} elevation={elevation} />);
                        break;
                    case TILE_TYPES.BUMPER:
                        result.push(<BumperTile key={key} position={worldPos} color={colors.accent} />);
                        break;
                    case TILE_TYPES.WALL:
                        result.push(<WallTile key={key} position={worldPos} color={colors.floor} />);
                        break;
                    case TILE_TYPES.SPAWN:
                        result.push(<SpawnTile key={key} position={worldPos} color={colors.glow || colors.accent} />);
                        break;
                    case TILE_TYPES.POWERUP_ZONE:
                        result.push(<PowerupZoneTile key={key} position={worldPos} />);
                        break;
                    case TILE_TYPES.BOOST_PAD:
                        result.push(<BoostPadTile key={key} position={worldPos} color={colors.glow} rotation={tile.rotation || 0} />);
                        break;
                    case TILE_TYPES.SPRING:
                        result.push(<JumpPadTile key={key} position={worldPos} color={colors.secondary || colors.accent} />);
                        break;
                    case TILE_TYPES.CONVEYOR:
                        result.push(<ConveyorTile key={key} position={worldPos} color={colors.floor} rotation={tile.rotation || 0} />);
                        break;
                    case TILE_TYPES.MOVING_WALL:
                        result.push(<MovingWallTile key={key} position={worldPos} color={colors.floor} />);
                        break;
                    case TILE_TYPES.PIT:
                        result.push(<PitTile key={key} position={worldPos} />);
                        break;
                    default:
                        result.push(<FloorTile key={key} position={worldPos} color={colors.floor} elevation={elevation} />);
                }
            }
        }

        return result;
    }, [mapData]);

    // Generate decorative elements based on biome (Legacy, can be reduced/removed if StadiumDome is enough)
    const decorations = useMemo(() => {
        if (!mapData?.biome) return null;

        const { gridSize, biome } = mapData;
        const arenaSize = gridSize * TILE_SIZE;
        const halfSize = arenaSize / 2;
        const colors = biome.colors;

        const decorItems = [];

        // Corner pillars
        const corners = [
            [-halfSize + 1.5, halfSize - 1.5],
            [halfSize - 1.5, halfSize - 1.5],
            [-halfSize + 1.5, -halfSize + 1.5],
            [halfSize - 1.5, -halfSize + 1.5]
        ];

        corners.forEach(([x, z], i) => {
            decorItems.push(
                <group key={`pillar-${i}`} position={[x, 0, z]}>
                    <mesh castShadow>
                        <cylinderGeometry args={[0.4, 0.5, 4, 8]} />
                        <meshStandardMaterial
                            color={colors.secondary || colors.accent}
                            metalness={0.7}
                            roughness={0.3}
                        />
                    </mesh>
                    {/* Pillar glow top */}
                    <pointLight
                        position={[0, 2.5, 0]}
                        color={colors.glow || colors.accent}
                        intensity={0.5}
                        distance={8}
                    />
                </group>
            );
        });

        // Edge glow strips
        const edges = [
            { pos: [0, -0.2, halfSize - 0.5], rot: [0, 0, 0], scale: [arenaSize - 3, 0.1, 0.3] },
            { pos: [0, -0.2, -halfSize + 0.5], rot: [0, 0, 0], scale: [arenaSize - 3, 0.1, 0.3] },
            { pos: [halfSize - 0.5, -0.2, 0], rot: [0, Math.PI / 2, 0], scale: [arenaSize - 3, 0.1, 0.3] },
            { pos: [-halfSize + 0.5, -0.2, 0], rot: [0, Math.PI / 2, 0], scale: [arenaSize - 3, 0.1, 0.3] }
        ];

        edges.forEach((edge, i) => {
            decorItems.push(
                <mesh key={`edge-${i}`} position={edge.pos} rotation={edge.rot}>
                    <boxGeometry args={edge.scale} />
                    <meshStandardMaterial
                        color={colors.accent}
                        emissive={colors.accent}
                        emissiveIntensity={0.4}
                        transparent
                        opacity={0.6}
                    />
                </mesh>
            );
        });

        return decorItems;
    }, [mapData]);

    if (!mapData) return null;

    const biome = mapData.biome;

    return (
        <group>
            {tiles}
            {decorations}

            <ArenaDecorations />
            <StadiumCollider />
            <StadiumCrowd biome={biome} count={2000} />
            <StadiumDome biome={biome} />
            <ReflectiveBase color={biome?.colors?.floor} />
            <CenterCourtDecal color={biome?.colors?.accent} />

            {/* Note: Main lighting is now handled by GameScene for better global control.
                Only simple biome accent light remains here. */}
            <pointLight
                position={[0, 10, 0]}
                color={biome?.colors?.glow || '#ffffff'}
                intensity={0.3}
                distance={50}
            />
        </group>
    );
}

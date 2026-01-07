import React, { useMemo, useRef } from 'react';
import { useBox, useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TILE_TYPES, gridToWorld } from '../utils/mapGenerator';

const TILE_SIZE = 3;
const TILE_HEIGHT = 0.5;

// ============================================
// FLOOR TILE
// ============================================
function FloorTile({ position, color, elevation = 0 }) {
    const y = elevation * TILE_HEIGHT - TILE_HEIGHT / 2;
    
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, y, position.z],
        args: [TILE_SIZE, TILE_HEIGHT, TILE_SIZE],
        material: { friction: 0.4, restitution: 0.3 }
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
            <meshStandardMaterial color={color} metalness={0.1} roughness={0.8} />
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
        position: [position.x, y, position.z],
        args: [TILE_SIZE, TILE_HEIGHT, TILE_SIZE],
        material: { friction: 0.02, restitution: 0.6 }
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
            <meshStandardMaterial
                color={color || '#88ccff'}
                metalness={0.95}
                roughness={0.05}
                transparent
                opacity={0.85}
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
        if (meshRef.current) {
            meshRef.current.material.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
        }
    });

    return (
        <group position={[position.x, -TILE_HEIGHT, position.z]}>
            <mesh ref={meshRef} receiveShadow>
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
                position={[0, 1.5, 0]}
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
        if (meshRef.current) {
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
// SPRING TILE
// ============================================
function SpringTile({ position, color }) {
    const springRef = useRef();
    
    const [ref] = useBox(() => ({
        type: 'Static',
        position: [position.x, -TILE_HEIGHT / 2, position.z],
        args: [TILE_SIZE, TILE_HEIGHT, TILE_SIZE],
        material: { friction: 0.3, restitution: 3.5 },
        userData: { type: 'spring' }
    }));

    useFrame((state) => {
        if (springRef.current) {
            const scale = 1 + Math.abs(Math.sin(state.clock.elapsedTime * 5)) * 0.2;
            springRef.current.scale.y = scale;
        }
    });

    return (
        <group>
            <mesh ref={ref} receiveShadow>
                <boxGeometry args={[TILE_SIZE, TILE_HEIGHT, TILE_SIZE]} />
                <meshStandardMaterial color="#2a2a3a" />
            </mesh>
            <mesh ref={springRef} position={[position.x, 0.2, position.z]}>
                <cylinderGeometry args={[0.4, 0.6, 0.5, 8]} />
                <meshStandardMaterial
                    color={color || '#ff9900'}
                    emissive="#ffcc00"
                    emissiveIntensity={0.5}
                    metalness={0.9}
                    roughness={0.2}
                />
            </mesh>
        </group>
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
export default function ProceduralArena({ mapData }) {
    const tiles = useMemo(() => {
        if (!mapData?.grid) return [];

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
                        result.push(<SpringTile key={key} position={worldPos} color={colors.secondary || colors.accent} />);
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

    if (!mapData) return null;

    const fog = mapData.biome?.fog;

    return (
        <group>
            {tiles}
            
            {/* Biome-specific lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[15, 25, 15]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={100}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
            />
            
            {/* Fog from biome */}
            {fog && <fog attach="fog" args={[fog.color, fog.near, fog.far]} />}
        </group>
    );
}

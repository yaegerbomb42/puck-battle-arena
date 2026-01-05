import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { PHYSICS_CONFIG, POWERUP_TYPES, distance3D } from '../utils/physics';

// Individual power-up component with distance-based pickup
export function PowerUp({ powerup, playerPositions, onCollect }) {
    const { type, position } = powerup;
    const meshRef = useRef();
    const glowRef = useRef();
    const collected = useRef(false);

    // Check distance to players every frame
    useFrame((state) => {
        const time = state.clock.elapsedTime;

        // Animate
        if (meshRef.current) {
            meshRef.current.rotation.y = time * 2;
            meshRef.current.position.y = position[1] + Math.sin(time * 3) * 0.2;
        }

        if (glowRef.current) {
            glowRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.15);
            glowRef.current.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
        }

        // Distance-based pickup check
        if (!collected.current && playerPositions) {
            for (const [playerId, playerPos] of Object.entries(playerPositions)) {
                const dist = distance3D(position, playerPos);
                if (dist < PHYSICS_CONFIG.powerups.pickupRadius) {
                    collected.current = true;
                    onCollect(powerup.id, playerId);
                    break;
                }
            }
        }
    });

    if (collected.current) return null;

    // Get type data
    const typeData = POWERUP_TYPES[type.toUpperCase?.()] || type;
    const color = typeData.color || '#ffffff';
    const typeId = typeData.id || type;

    return (
        <group position={position}>
            {/* Visual power-up */}
            <group ref={meshRef}>
                {typeId === 'speed' && <SpeedPowerupMesh color={color} />}
                {typeId === 'damage' && <DamagePowerupMesh color={color} />}
                {typeId === 'shield' && <ShieldPowerupMesh color={color} />}
                {typeId === 'superboost' && <SuperBoostPowerupMesh color={color} />}
            </group>

            {/* Glow sphere */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[0.7, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>

            {/* Ground indicator */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -position[1] + 0.05, 0]}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} />
            </mesh>

            {/* Pickup radius indicator */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -position[1] + 0.02, 0]}>
                <ringGeometry args={[PHYSICS_CONFIG.powerups.pickupRadius - 0.1, PHYSICS_CONFIG.powerups.pickupRadius, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.15} />
            </mesh>
        </group>
    );
}

// Speed power-up: Octahedron
function SpeedPowerupMesh({ color }) {
    return (
        <mesh>
            <octahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.8}
                metalness={0.5}
                roughness={0.2}
            />
        </mesh>
    );
}

// Damage power-up: Dodecahedron
function DamagePowerupMesh({ color }) {
    return (
        <mesh>
            <dodecahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.8}
                metalness={0.5}
                roughness={0.2}
            />
        </mesh>
    );
}

// Shield power-up: Icosahedron
function ShieldPowerupMesh({ color }) {
    return (
        <mesh>
            <icosahedronGeometry args={[0.3, 1]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                metalness={0.8}
                roughness={0.1}
            />
        </mesh>
    );
}

// Super boost power-up: Torus + octahedron
function SuperBoostPowerupMesh({ color }) {
    return (
        <group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.25, 0.1, 8, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1}
                    metalness={0.5}
                    roughness={0.2}
                />
            </mesh>
            <mesh scale={[0.5, 0.5, 0.5]}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.8}
                />
            </mesh>
        </group>
    );
}

// Container for all power-ups
export default function PowerUps({ powerups, playerPositions, onCollect }) {
    return (
        <group>
            {powerups.map((powerup) => (
                <PowerUp
                    key={powerup.id}
                    powerup={powerup}
                    playerPositions={playerPositions}
                    onCollect={onCollect}
                />
            ))}
        </group>
    );
}

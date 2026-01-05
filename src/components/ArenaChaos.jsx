import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useCylinder } from '@react-three/cannon';
import { PHYSICS_CONFIG } from '../utils/physics';

// Floor Material (Normal friction)
function Floor() {
    const [ref] = useBox(() => ({
        position: [0, -0.5, 0],
        args: [24, 1, 16], // Rectangular arena
        type: 'Static',
        material: { friction: 0.3, restitution: 0.5 },
    }));

    return (
        <group>
            {/* Main Floor */}
            <mesh ref={ref} receiveShadow>
                <boxGeometry args={[24, 1, 16]} />
                <meshStandardMaterial color="#0a0a1a" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Grid Pattern */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[24, 16]} />
                <meshBasicMaterial color="#333" wireframe transparent opacity={0.3} />
            </mesh>

            {/* Edge Glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <planeGeometry args={[23.5, 15.5]} />
                <meshBasicMaterial color="#ff006e" wireframe transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

// Ice Patch (Low friction)
function IcePatch({ position, size }) {
    const [ref] = useBox(() => ({
        position: [position[0], -0.4, position[2]],
        args: [size[0], 0.2, size[1]],
        type: 'Static',
        material: PHYSICS_CONFIG.materials.ice,
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[size[0], 0.2, size[1]]} />
            <meshStandardMaterial color="#00d4ff" metalness={0.9} roughness={0.05} opacity={0.8} transparent />
        </mesh>
    );
}

// Jump Ramp
function JumpRamp({ position, rotation }) {
    // Use a rotated box as a ramp for physics (simple approximation)
    const [ref] = useBox(() => ({
        position,
        rotation: [rotation[0] || -0.2, rotation[1] || 0, rotation[2] || 0],
        args: [3, 0.2, 3],
        type: 'Static',
        material: PHYSICS_CONFIG.materials.ramp,
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={[3, 0.2, 3]} />
            <meshStandardMaterial color="#ffff00" metalness={0.6} roughness={0.4} emissive="#aaed00" emissiveIntensity={0.2} />

            {/* Arrows */}
            <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial color="#000" wireframe />
            </mesh>
        </mesh>
    );
}

// Pinball Bumper
function Bumper({ position }) {
    const [ref] = useCylinder(() => ({
        position: [position[0], 0.75, position[2]],
        args: [0.7, 0.7, 1.5, 16],
        type: 'Static',
        material: PHYSICS_CONFIG.materials.bumper,
    }));

    const materialRef = useRef();

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
        }
    });

    return (
        <mesh ref={ref} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 1.5, 16]} />
            <meshStandardMaterial
                ref={materialRef}
                color="#ff006e"
                emissive="#ff006e"
                emissiveIntensity={0.8}
                metalness={0.5}
                roughness={0.2}
            />
        </mesh>
    );
}

// Static Wall (Cover)
function SafetyWall({ position, size, rotation }) {
    const [ref] = useBox(() => ({
        position: [position[0], 1, position[2]],
        args: [size[0], 2, size[1]],
        rotation: [0, rotation || 0, 0],
        type: 'Static',
        material: PHYSICS_CONFIG.materials.wall,
    }));

    return (
        <mesh ref={ref} castShadow receiveShadow>
            <boxGeometry args={[size[0], 2, size[1]]} />
            <meshStandardMaterial color="#444" metalness={0.6} roughness={0.8} />
            {/* Neon Trim */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(size[0], 2, size[1])]} />
                <lineBasicMaterial color="#00ff87" />
            </lineSegments>
        </mesh>
    );
}

import * as THREE from 'three';

// Main Arena Component
export default function ArenaChaos({ mapType = 'SAWBLADE CITY' }) {
    // Procedural Config based on Map Vote
    const config = React.useMemo(() => {
        switch (mapType) {
            case 'RAMP HEAVEN':
                return { rampCount: 6, bumperCount: 2, wallCount: 0, ice: false };
            case 'BOX FORT':
                return { rampCount: 0, bumperCount: 0, wallCount: 8, ice: false };
            case 'SAWBLADE CITY':
            default:
                return { rampCount: 2, bumperCount: 4, wallCount: 2, ice: true };
        }
    }, [mapType]);

    return (
        <group>
            <Floor />

            {/* Dynamic Elements based on Config */}
            {config.ice && <IcePatch position={[0, 0, 0]} size={[8, 8]} />}

            {config.rampCount > 0 && (
                <>
                    <JumpRamp position={[-8, 0.1, 0]} rotation={[0, 0, -0.2]} />
                    <JumpRamp position={[8, 0.1, 0]} rotation={[0, 0, 0.2]} />
                    {config.rampCount > 2 && (
                        <>
                            <JumpRamp position={[0, 0.1, -8]} rotation={[0.2, 0, 0]} />
                            <JumpRamp position={[0, 0.1, 8]} rotation={[-0.2, 0, 0]} />
                        </>
                    )}
                </>
            )}

            {config.bumperCount > 0 && (
                <>
                    <Bumper position={[-4, 0, -4]} />
                    <Bumper position={[4, 0, 4]} />
                    {config.bumperCount > 2 && (
                        <>
                            <Bumper position={[-4, 0, 4]} />
                            <Bumper position={[4, 0, -4]} />
                        </>
                    )}
                </>
            )}

            {config.wallCount > 0 && (
                <>
                    {config.wallCount > 4 ? (
                        // Box Fort Layout
                        <>
                            <SafetyWall position={[-5, 0, -5]} size={[3, 3]} />
                            <SafetyWall position={[5, 0, -5]} size={[3, 3]} />
                            <SafetyWall position={[-5, 0, 5]} size={[3, 3]} />
                            <SafetyWall position={[5, 0, 5]} size={[3, 3]} />
                            <SafetyWall position={[0, 0, 0]} size={[2, 2]} />
                        </>
                    ) : (
                        // Standard Walls
                        <>
                            <SafetyWall position={[0, 0, -6]} size={[4, 0.5]} />
                            <SafetyWall position={[0, 0, 6]} size={[4, 0.5]} />
                        </>
                    )}
                </>
            )}

            {/* Deep Space Light - Optimized */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={0.8}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
        </group>
    );
}

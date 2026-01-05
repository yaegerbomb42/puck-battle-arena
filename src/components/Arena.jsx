import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCylinder, useBox } from '@react-three/cannon';
import * as THREE from 'three';
import { PHYSICS_CONFIG } from '../utils/physics';

// Main circular platform
function ArenaPlatform() {
    const [ref] = useCylinder(() => ({
        position: [0, -0.5, 0],
        args: [12, 12, 1, 32],
        type: 'Static',
        material: { friction: 0.4, restitution: 0.3 },
    }));

    return (
        <group>
            {/* Main platform */}
            <mesh ref={ref} receiveShadow>
                <cylinderGeometry args={[12, 12, 1, 64]} />
                <meshStandardMaterial
                    color="#0a0a1a"
                    metalness={0.9}
                    roughness={0.1}
                />
            </mesh>

            {/* Glowing edge ring */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[11, 12, 64]} />
                <meshBasicMaterial color="#ff006e" transparent opacity={0.5} />
            </mesh>

            {/* Inner glow ring */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[10.5, 11, 64]} />
                <meshBasicMaterial color="#ff006e" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}

// Animated grid pattern on platform
function ArenaGrid() {
    const gridRef = useRef();

    useFrame((state) => {
        if (gridRef.current) {
            gridRef.current.rotation.z = state.clock.elapsedTime * 0.1;
            gridRef.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <circleGeometry args={[10, 64]} />
            <meshBasicMaterial
                color="#00d4ff"
                transparent
                opacity={0.15}
                wireframe
            />
        </mesh>
    );
}

// Center objective marker
function CenterObjective() {
    const ringRef = useRef();
    const pulseRef = useRef();

    useFrame((state) => {
        const time = state.clock.elapsedTime;
        if (ringRef.current) {
            ringRef.current.rotation.z = time * 0.5;
        }
        if (pulseRef.current) {
            const scale = 1 + Math.sin(time * 3) * 0.2;
            pulseRef.current.scale.set(scale, scale, 1);
            pulseRef.current.material.opacity = 0.3 - Math.sin(time * 3) * 0.15;
        }
    });

    return (
        <group position={[0, 0.05, 0]}>
            {/* Rotating hex marker */}
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.5, 2, 6]} />
                <meshBasicMaterial color="#9d4edd" transparent opacity={0.5} />
            </mesh>

            {/* Pulsing center */}
            <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.5, 6]} />
                <meshBasicMaterial color="#9d4edd" transparent opacity={0.3} />
            </mesh>

            {/* Center point */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.3, 32]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
        </group>
    );
}

// Rotating outer bumper ring
function RotatingBumperRing() {
    const groupRef = useRef();

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
        }
    });

    const bumperPositions = useMemo(() => {
        const positions = [];
        const count = 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push({
                x: Math.cos(angle) * 9,
                z: Math.sin(angle) * 9,
                angle,
            });
        }
        return positions;
    }, []);

    return (
        <group ref={groupRef}>
            {bumperPositions.map((pos, i) => (
                <BumperPillar key={i} position={[pos.x, 0, pos.z]} />
            ))}
        </group>
    );
}

// Individual bumper pillar
function BumperPillar({ position }) {
    const [ref] = useCylinder(() => ({
        position: [position[0], 0.75, position[2]],
        args: [0.5, 0.5, 1.5, 16],
        type: 'Static',
        material: { friction: 0.1, restitution: 1.2 }, // Extra bouncy!
    }));

    const materialRef = useRef();

    useFrame((state) => {
        if (materialRef.current) {
            // materialRef IS the material, so access emissiveIntensity directly
            materialRef.current.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 4 + position[0]) * 0.3;
        }
    });

    return (
        <mesh ref={ref} castShadow>
            <cylinderGeometry args={[0.5, 0.5, 1.5, 16]} />
            <meshStandardMaterial
                ref={materialRef}
                color="#00ff87"
                emissive="#00ff87"
                emissiveIntensity={0.5}
                metalness={0.7}
                roughness={0.2}
            />
        </mesh>
    );
}

// Sweeping energy beam hazard
function EnergyBeamSweeper() {
    const beamRef = useRef();

    useFrame((state) => {
        if (beamRef.current) {
            beamRef.current.rotation.y = -state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <group ref={beamRef} position={[0, 0.5, 0]}>
            {/* Beam visual */}
            <mesh>
                <boxGeometry args={[20, 0.1, 0.3]} />
                <meshBasicMaterial color="#ff006e" transparent opacity={0.6} />
            </mesh>

            {/* Glow effect */}
            <mesh>
                <boxGeometry args={[20, 0.3, 0.6]} />
                <meshBasicMaterial color="#ff006e" transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

// Floating danger indicators at edges
function EdgeWarnings() {
    const warningsRef = useRef();

    useFrame((state) => {
        if (warningsRef.current) {
            warningsRef.current.children.forEach((child, i) => {
                child.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 3 + i) * 0.2;
            });
        }
    });

    const positions = useMemo(() => {
        const pos = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            pos.push([Math.cos(angle) * 11.5, 0.5, Math.sin(angle) * 11.5]);
        }
        return pos;
    }, []);

    return (
        <group ref={warningsRef}>
            {positions.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <octahedronGeometry args={[0.2, 0]} />
                    <meshBasicMaterial color="#ff006e" transparent opacity={0.7} />
                </mesh>
            ))}
        </group>
    );
}

// Boost launchers at cardinal directions
function BoostLaunchers() {
    const launcherPositions = [
        { pos: [0, 0.1, 7], rot: 0 },
        { pos: [0, 0.1, -7], rot: Math.PI },
        { pos: [7, 0.1, 0], rot: -Math.PI / 2 },
        { pos: [-7, 0.1, 0], rot: Math.PI / 2 },
    ];

    return (
        <group>
            {launcherPositions.map((item, i) => (
                <BoostPad key={i} position={item.pos} rotation={item.rot} />
            ))}
        </group>
    );
}

function BoostPad({ position, rotation }) {
    const arrowRef = useRef();

    useFrame((state) => {
        if (arrowRef.current) {
            arrowRef.current.material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
        }
    });

    return (
        <group position={position} rotation={[0, rotation, 0]}>
            {/* Base glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.8, 32]} />
                <meshBasicMaterial color="#00ff87" transparent opacity={0.3} />
            </mesh>

            {/* Arrow indicator */}
            <mesh ref={arrowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <coneGeometry args={[0.4, 0.8, 3]} />
                <meshBasicMaterial color="#00ff87" transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

// Particle atmosphere
function AtmosphereParticles() {
    const count = 200;
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 40;
            pos[i * 3 + 1] = Math.random() * 15 - 5;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        return pos;
    }, []);

    const ref = useRef();

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.02;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.08} color="#00d4ff" transparent opacity={0.4} />
        </points>
    );
}

// Underlight effect
function Underlight() {
    const lightRef = useRef();

    useFrame((state) => {
        if (lightRef.current) {
            lightRef.current.intensity = 2 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
        }
    });

    return (
        <pointLight
            ref={lightRef}
            position={[0, -3, 0]}
            color="#9d4edd"
            intensity={2}
            distance={20}
        />
    );
}

// Main Arena component
export default function Arena() {
    return (
        <group>
            {/* Main platform */}
            <ArenaPlatform />
            <ArenaGrid />
            <CenterObjective />

            {/* Hazards & interactables */}
            <RotatingBumperRing />
            <EnergyBeamSweeper />
            <EdgeWarnings />
            <BoostLaunchers />

            {/* Atmosphere */}
            <AtmosphereParticles />
            <Underlight />

            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={50}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
            <pointLight position={[0, 10, 0]} intensity={1} color="#ffffff" />
        </group>
    );
}

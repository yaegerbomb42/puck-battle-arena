import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Explosion particles for knockout
export function KnockoutExplosion({ position, color, onComplete }) {
    const particlesRef = useRef();
    const startTime = useRef(Date.now());
    const duration = 1500;

    const { positions, velocities, colors } = useMemo(() => {
        const count = 50;
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const colors = new Float32Array(count * 3);
        const colorObj = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position[0];
            positions[i * 3 + 1] = position[1];
            positions[i * 3 + 2] = position[2];

            // Random velocity in all directions
            velocities.push([
                (Math.random() - 0.5) * 10,
                Math.random() * 8,
                (Math.random() - 0.5) * 10,
            ]);

            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;
        }

        return { positions, velocities, colors };
    }, [position, color]);

    useFrame((state, delta) => {
        if (!particlesRef.current) return;

        const elapsed = Date.now() - startTime.current;
        const progress = elapsed / duration;

        if (progress >= 1) {
            onComplete?.();
            return;
        }

        const posArray = particlesRef.current.geometry.attributes.position.array;

        for (let i = 0; i < velocities.length; i++) {
            // Update positions based on velocity
            posArray[i * 3] += velocities[i][0] * delta;
            posArray[i * 3 + 1] += velocities[i][1] * delta - 9.8 * delta * delta; // Gravity
            posArray[i * 3 + 2] += velocities[i][2] * delta;

            // Apply drag
            velocities[i][0] *= 0.98;
            velocities[i][1] *= 0.98;
            velocities[i][2] *= 0.98;
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        particlesRef.current.material.opacity = 1 - progress;
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={colors.length / 3}
                    array={colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.2}
                vertexColors
                transparent
                opacity={1}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Shockwave ring effect
export function ShockwaveRing({ position, color, onComplete }) {
    const ringRef = useRef();
    const startTime = useRef(Date.now());
    const duration = 800;

    useFrame(() => {
        if (!ringRef.current) return;

        const elapsed = Date.now() - startTime.current;
        const progress = elapsed / duration;

        if (progress >= 1) {
            onComplete?.();
            return;
        }

        // Expand ring
        const scale = 1 + progress * 5;
        ringRef.current.scale.set(scale, scale, 1);
        ringRef.current.material.opacity = 1 - progress;
    });

    return (
        <mesh ref={ringRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.8, 32]} />
            <meshBasicMaterial
                color={color}
                transparent
                opacity={1}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}

// Collision spark effect
export function CollisionSparks({ position, color }) {
    const sparksRef = useRef();
    const startTime = useRef(Date.now());
    const duration = 300;

    const sparkPositions = useMemo(() => {
        const count = 20;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position[0] + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = position[1] + Math.random() * 0.5;
            positions[i * 3 + 2] = position[2] + (Math.random() - 0.5) * 0.5;
        }

        return positions;
    }, [position]);

    useFrame(() => {
        if (!sparksRef.current) return;

        const elapsed = Date.now() - startTime.current;
        const progress = elapsed / duration;

        if (progress >= 1) {
            if (sparksRef.current.parent) {
                sparksRef.current.parent.remove(sparksRef.current);
            }
            return;
        }

        sparksRef.current.material.opacity = 1 - progress;
    });

    return (
        <points ref={sparksRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={sparkPositions.length / 3}
                    array={sparkPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.1}
                color={color}
                transparent
                opacity={1}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

// Manager component for all active effects
export default function KnockoutEffects({ effects, onEffectComplete }) {
    return (
        <group>
            {effects.map((effect) => {
                switch (effect.type) {
                    case 'explosion':
                        return (
                            <KnockoutExplosion
                                key={effect.id}
                                position={effect.position}
                                color={effect.color}
                                onComplete={() => onEffectComplete(effect.id)}
                            />
                        );
                    case 'shockwave':
                        return (
                            <ShockwaveRing
                                key={effect.id}
                                position={effect.position}
                                color={effect.color}
                                onComplete={() => onEffectComplete(effect.id)}
                            />
                        );
                    case 'sparks':
                        return (
                            <CollisionSparks
                                key={effect.id}
                                position={effect.position}
                                color={effect.color}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </group>
    );
}

import React, { useRef, useEffect } from 'react';
import { useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { ROCKET_PHYSICS } from '../utils/rocketPhysics';
import * as THREE from 'three';

export default function RocketBall({
    position: initialPos = [0, 2, 0],
    onPositionUpdate,
    onGoalScored,
    reset = false
}) {
    const config = ROCKET_PHYSICS.ball;
    const glowRef = useRef();
    const ballRef = useRef();

    // Physics body
    const [ref, api] = useSphere(() => ({
        mass: config.mass,
        position: initialPos,
        args: [config.radius],
        linearDamping: config.linearDamping,
        angularDamping: config.angularDamping,
        material: {
            friction: config.friction,
            restitution: config.bounciness,
        },
        userData: { type: 'ball' },
    }));

    const velocity = useRef([0, 0, 0]);
    const position = useRef(initialPos);

    useEffect(() => {
        const unsubVel = api.velocity.subscribe((v) => { velocity.current = v; });
        const unsubPos = api.position.subscribe((p) => { position.current = p; });
        return () => { unsubVel(); unsubPos(); };
    }, [api]);

    // Reset ball on goal or respawn
    useEffect(() => {
        if (reset) {
            api.position.set(initialPos[0], initialPos[1], initialPos[2]);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);
        }
    }, [reset, api, initialPos]);

    // Check for goals
    useFrame(() => {
        onPositionUpdate?.(position.current, velocity.current);

        // Goal detection
        const field = ROCKET_PHYSICS.field;
        const halfLen = field.length / 2;
        const goalHalf = field.goalWidth / 2;
        const pos = position.current;

        if (pos[1] < field.goalHeight && Math.abs(pos[0]) < goalHalf) {
            if (pos[2] > halfLen + 0.5) {
                onGoalScored?.('orange'); // Ball entered orange goal = blue scores
                api.position.set(0, 2, 0);
                api.velocity.set(0, 0, 0);
            } else if (pos[2] < -halfLen - 0.5) {
                onGoalScored?.('blue'); // Ball entered blue goal = orange scores
                api.position.set(0, 2, 0);
                api.velocity.set(0, 0, 0);
            }
        }
    });

    // Speed limit
    useEffect(() => {
        const interval = setInterval(() => {
            const speed = Math.sqrt(
                velocity.current[0] ** 2 +
                velocity.current[1] ** 2 +
                velocity.current[2] ** 2
            );
            if (speed > config.maxSpeed) {
                const factor = config.maxSpeed / speed;
                api.velocity.set(
                    velocity.current[0] * factor,
                    velocity.current[1] * factor,
                    velocity.current[2] * factor
                );
            }
        }, 100);
        return () => clearInterval(interval);
    }, [api, config.maxSpeed]);

    return (
        <group ref={ref}>
            {/* Main ball mesh */}
            <mesh ref={ballRef} castShadow>
                <sphereGeometry args={[config.radius * 0.95, 32, 32]} />
                <meshPhysicalMaterial
                    color="#ffffff"
                    metalness={0.6}
                    roughness={0.15}
                    emissive="#4488ff"
                    emissiveIntensity={0.15}
                    envMapIntensity={3}
                    clearcoat={0.5}
                />
            </mesh>
            {/* Outer glow ring */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[config.radius * 1.05, 16, 16]} />
                <meshBasicMaterial
                    color="#4488ff"
                    transparent
                    opacity={0.08}
                    wireframe
                />
            </mesh>
            {/* Inner glow */}
            <mesh>
                <sphereGeometry args={[config.radius * 0.3, 16, 16]} />
                <meshBasicMaterial color="#88ccff" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}
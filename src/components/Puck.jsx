import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { PHYSICS_CONFIG, isInKnockoutZone } from '../utils/physics';

// Trail effect
function PuckTrail({ position, color }) {
    const trailRef = useRef();
    const points = useRef([]);
    const maxPoints = 20;

    useFrame(() => {
        if (trailRef.current && position) {
            points.current.push(new THREE.Vector3(...position));
            if (points.current.length > maxPoints) {
                points.current.shift();
            }

            if (points.current.length > 1) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points.current);
                trailRef.current.geometry.dispose();
                trailRef.current.geometry = geometry;
            }
        }
    });

    return (
        <line ref={trailRef}>
            <bufferGeometry />
            <lineBasicMaterial color={color} transparent opacity={0.5} linewidth={3} />
        </line>
    );
}

// Damage Indicator
function DamageDisplay({ damage, position }) {
    const color = damage < 50 ? '#ffffff' : damage < 100 ? '#ffff00' : '#ff0000';
    const scale = 1 + (damage / 200);

    return (
        <Billboard position={[position[0], position[1] + 1.2, position[2]]}>
            <Text
                fontSize={0.5 * scale}
                color={color}
                outlineWidth={0.05}
                outlineColor="#000000"
            >
                {Math.floor(damage)}%
            </Text>
        </Billboard>
    );
}

export default function Puck({
    playerId,
    color,
    startPosition,
    isLocalPlayer = false,
    powerup,
    damage = 0,
    onKnockout,
    onPositionUpdate,
    onCollision,
    onUseItem, // New prop
    remotePosition,
    remoteVelocity,
}) {
    const { radius, mass, linearDamping, angularDamping, restitution, friction, maxVelocity, acceleration } = PHYSICS_CONFIG.puck;

    const effectiveMaxVelocity = powerup?.effect?.velocityMultiplier
        ? maxVelocity * powerup.effect.velocityMultiplier
        : maxVelocity;

    const effectiveMass = powerup?.id === 'shield' ? mass * 2 : mass;

    const [ref, api] = useSphere(() => ({
        mass: isLocalPlayer ? effectiveMass : 0,
        position: startPosition,
        args: [radius],
        linearDamping,
        angularDamping,
        material: { restitution, friction },
        userData: { playerId, damage },
        onCollide: (e) => {
            if (!isLocalPlayer) return;

            if (e.body?.userData?.playerId) {
                const impactVelocity = e.contact.impactVelocity;

                if (impactVelocity > 2) {
                    const impulseMag = PHYSICS_CONFIG.collision.baseForce + (damage * PHYSICS_CONFIG.collision.damageMultiplier);

                    const normal = new THREE.Vector3(e.contact.contactNormal[0], e.contact.contactNormal[1], e.contact.contactNormal[2]);
                    normal.normalize();

                    api.applyImpulse(
                        [normal.x * impulseMag, normal.y * impulseMag + (damage / 20), normal.z * impulseMag],
                        [0, 0, 0]
                    );

                    onCollision?.(impactVelocity);
                }
            }
        },
    }));

    const velocity = useRef([0, 0, 0]);
    const position = useRef([...startPosition]);
    const [isRespawning, setIsRespawning] = useState(false);

    useEffect(() => {
        const unsubVel = api.velocity.subscribe((v) => velocity.current = v);
        const unsubPos = api.position.subscribe((p) => position.current = p);
        return () => { unsubVel(); unsubPos(); };
    }, [api]);

    useEffect(() => {
        if (!isLocalPlayer) return;

        const keys = {};
        const handleKeyDown = (e) => keys[e.code] = true;
        const handleKeyUp = (e) => keys[e.code] = false;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const updateMovement = () => {
            if (isRespawning) return;

            let forceX = 0;
            let forceZ = 0;

            if (keys['KeyW'] || keys['ArrowUp']) forceZ -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) forceZ += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) forceX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) forceX += 1;

            if (forceX !== 0 && forceZ !== 0) {
                const mag = Math.sqrt(forceX * forceX + forceZ * forceZ);
                forceX /= mag;
                forceZ /= mag;
            }

            const effectiveAccel = powerup?.id === 'speed' ? acceleration * 1.5 : acceleration;

            if (forceX !== 0 || forceZ !== 0) {
                api.applyForce([forceX * effectiveAccel, 0, forceZ * effectiveAccel], [0, 0, 0]);
            }

            if (powerup?.id === 'superboost' && powerup.effect.instantBoost) {
                api.applyImpulse([0, 10, 0], [0, 0, 0]);
            }

            // Use Item (Spacebar) - Logic managed by BattleArena/GameState but input triggered here
            if (keys['Space']) {
                onUseItem?.(); // Callback to trigger active powerup
            }
        };

        const interval = setInterval(updateMovement, 16);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(interval);
        };
    }, [api, isLocalPlayer, isRespawning, powerup, acceleration, onUseItem]);

    useEffect(() => {
        if (!isLocalPlayer && remotePosition) {
            api.position.set(...remotePosition);
        }
        if (!isLocalPlayer && remoteVelocity) {
            api.velocity.set(...remoteVelocity);
        }
    }, [api, isLocalPlayer, remotePosition, remoteVelocity]);

    useFrame(() => {
        if (!isLocalPlayer) return;
        onPositionUpdate?.(position.current, velocity.current);

        if (!isRespawning && isInKnockoutZone(position.current)) {
            handleKnockout();
        }
    });

    const handleKnockout = () => {
        setIsRespawning(true);
        onKnockout?.(playerId);
        setTimeout(() => {
            api.position.set(...startPosition);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);
            setIsRespawning(false);
        }, 1500);
    };

    return (
        <group>
            <group position={position.current}>
                <DamageDisplay damage={damage} position={[0, 0, 0]} />
            </group>

            <mesh ref={ref} castShadow visible={!isRespawning}>
                <sphereGeometry args={[radius, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.6}
                    roughness={0.2}
                    emissive={color}
                    emissiveIntensity={0.2}
                />
            </mesh>

            {!isRespawning && <PuckTrail position={position.current} color={color} />}

            <mesh position={[position.current[0], 0.05, position.current[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[radius + 0.1, radius + 0.15, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>
        </group>
    );
}

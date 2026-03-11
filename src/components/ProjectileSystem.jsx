import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getPowerupInfo } from '../utils/powerups';

// Projectile Component
function Projectile({ id, type, position, velocity, ownerId, onHit, playerPositions }) {
    const velocityRef = useRef([0, 0, 0]);
    const [ref, api] = useSphere(() => ({
        mass: 1,
        position,
        velocity,
        args: [0.3],
        userData: { id, type: 'projectile', ownerId },
        onCollide: (e) => {
            if (e.body.userData.playerId && e.body.userData.playerId !== ownerId) {
                // Calculate impact speed
                const speed = Math.sqrt(
                    velocityRef.current[0] ** 2 +
                    velocityRef.current[1] ** 2 +
                    velocityRef.current[2] ** 2
                );
                onHit(id, e.body.userData.playerId, type, speed, ownerId);
            }
        }
    }));

    useEffect(() => {
        const unsubscribe = api.velocity.subscribe((v) => (velocityRef.current = v));
        return unsubscribe;
    }, [api.velocity]);

    const targetVec = useMemo(() => new THREE.Vector3(), []);
    const currentVelVec = useMemo(() => new THREE.Vector3(), []);
    const desiredDirVec = useMemo(() => new THREE.Vector3(), []);
    const steeringVec = useMemo(() => new THREE.Vector3(), []);

    // Physics Logic
    useFrame(() => {
        if (!ref.current) return;

        // ROCKET: Homing
        if (type === 'rocket' && playerPositions) {
            // Find nearest enemy
            let nearestId = null;
            let minDst = Infinity;
            const myPos = ref.current.position;

            Object.entries(playerPositions).forEach(([pid, pos]) => {
                if (pid === ownerId) return;
                targetVec.set(pos[0], pos[1], pos[2]);
                const dst = myPos.distanceTo(targetVec);
                if (dst < minDst) {
                    minDst = dst;
                    nearestId = pid;
                }
            });

            if (nearestId && minDst < 50) {
                const pos = playerPositions[nearestId];
                targetVec.set(pos[0], pos[1], pos[2]);
                desiredDirVec.subVectors(targetVec, myPos).normalize();

                currentVelVec.set(...velocityRef.current);

                const maxSpeed = 15;
                steeringVec.copy(desiredDirVec).multiplyScalar(maxSpeed).sub(currentVelVec);
                steeringVec.clampLength(0, 0.5);

                api.applyForce([steeringVec.x * 20, steeringVec.y * 20, steeringVec.z * 20], [0, 0, 0]);

                // Look at target
                ref.current.lookAt(targetVec);
            }
        }

        // SAW BLADE: Ground hugger + spin
        if (type === 'saw_blade') {
            api.applyForce([0, -10, 0], [0, 0, 0]); // Downforce
            ref.current.rotation.x += 0.2; // Visual spin
        }
    });

    const info = getPowerupInfo(type);
    const imagePath = info?.imagePath || '/images/powerups/rocket.png';
    const color = info?.color || 'white';

    return (
        <group ref={ref}>
            <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                <ProjectileIcon texturePath={imagePath} color={color} />
            </Billboard>
        </group>
    );
}

function ProjectileIcon({ texturePath, color }) {
    const texture = useTexture(texturePath);
    return (
        <mesh>
            <planeGeometry args={[0.8, 0.8]} />
            <meshStandardMaterial map={texture} transparent alphaTest={0.5} emissive={color} emissiveIntensity={0.8} />
        </mesh>
    );
}

export default function ProjectileSystem({ projectiles, onProjectileHit, playerPositions }) {
    return (
        <group>
            {projectiles.map(p => (
                <Projectile
                    key={p.id}
                    {...p}
                    onHit={onProjectileHit}
                    playerPositions={playerPositions}
                />
            ))}
        </group>
    );
}

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere, useBox } from '@react-three/cannon';
import * as THREE from 'three';

// Projectile Component
function Projectile({ id, type, position, velocity, ownerId, onHit }) {
    const [ref, api] = useSphere(() => ({
        mass: 1,
        position,
        velocity,
        args: [0.3],
        userData: { id, type: 'projectile', ownerId },
        onCollide: (e) => {
            if (e.body.userData.playerId && e.body.userData.playerId !== ownerId) {
                onHit(id, e.body.userData.playerId);
            }
        }
    }));

    // Homing Logic (for Rockets)
    useFrame(() => {
        if (type === 'rocket') {
            // diverse homing logic can go here
        }
    });

    return (
        <mesh ref={ref}>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial color={type === 'rocket' ? 'orange' : 'gray'} emissive="red" emissiveIntensity={1} />
        </mesh>
    );
}

export default function ProjectileSystem({ projectiles, onProjectileHit }) {
    return (
        <group>
            {projectiles.map(p => (
                <Projectile
                    key={p.id}
                    {...p}
                    onHit={onProjectileHit}
                />
            ))}
        </group>
    );
}

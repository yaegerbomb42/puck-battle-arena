import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Smoother camera following logic
function DynamicCamera({ playerPositions, targetId }) {
    const { camera } = useThree();

    // Camera target state
    const targetPos = useRef(new THREE.Vector3(0, 18, 15));
    const lookAtPos = useRef(new THREE.Vector3(0, 0, 0));

    useFrame((state, delta) => {
        const positions = Object.values(playerPositions);

        if (positions.length > 0) {
            // Calculate center of action
            let centerX = 0, centerZ = 0;
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

            positions.forEach(pos => {
                centerX += pos[0];
                centerZ += pos[2];
                minX = Math.min(minX, pos[0]);
                maxX = Math.max(maxX, pos[0]);
                minZ = Math.min(minZ, pos[2]);
                maxZ = Math.max(maxZ, pos[2]);
            });

            centerX /= positions.length;
            centerZ /= positions.length;

            // Calculate spread to adjust zoom
            const spreadX = maxX - minX;
            const spreadZ = maxZ - minZ;
            const maxSpread = Math.max(spreadX, spreadZ, 10); // Minimum spread of 10

            // Target camera position (High angle TV Broadcast style)
            // Less jarring: Fix the angle, only move X/Z and Zoom Y
            targetPos.current.set(
                centerX * 0.5, // Dampen lateral movement (don't follow 1:1)
                12 + maxSpread * 0.6, // Zoom out based on spread
                12 + centerZ * 0.4 + (maxSpread * 0.2) // Tilt back slightly
            );

            lookAtPos.current.set(centerX * 0.8, 0, centerZ * 0.8);
        }

        // Smooth Lerp (Dampened)
        // Lower factor = smoother but lazier
        const smoothFactor = 2.0 * delta;

        camera.position.lerp(targetPos.current, smoothFactor);

        // Smooth lookAt requires a dummy vector or manual quaternion slerp
        // For simplicity with OrbitControls-like behavior:
        const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
        currentLook.lerp(lookAtPos.current, smoothFactor);
        camera.lookAt(currentLook);
    });

    return null;
}

export default DynamicCamera;

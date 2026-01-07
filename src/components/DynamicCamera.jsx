import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Optimized Dynamic Camera System
 * - Reuses vectors (no GC pressure)
 * - Multiple camera modes
 * - Knockout focus zoom
 * - Slowmo support
 * - Screen shake with intensity scaling
 */

// Camera mode configurations
const CAMERA_MODES = {
    DEFAULT: {
        height: 18,
        distance: 15,
        fov: 50,
        followSpeed: 2.0,
        lookAheadFactor: 0.3
    },
    COMBAT: {
        height: 14,
        distance: 12,
        fov: 55,
        followSpeed: 3.0,
        lookAheadFactor: 0.5
    },
    KNOCKOUT: {
        height: 10,
        distance: 8,
        fov: 42,
        followSpeed: 5.0,
        lookAheadFactor: 0
    },
    WIDE: {
        height: 25,
        distance: 22,
        fov: 60,
        followSpeed: 1.5,
        lookAheadFactor: 0.2
    }
};

function DynamicCamera({ 
    playerPositions, 
    localPlayerId,
    shake = 0, 
    knockoutTarget = null,
    slowmo = false
}) {
    const { camera } = useThree();
    
    // OPTIMIZATION: Reuse vectors instead of creating new ones each frame
    const vectors = useMemo(() => ({
        targetPos: new THREE.Vector3(0, 18, 15),
        lookAtPos: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(),
        lastCenter: new THREE.Vector3(),
        tempLookAt: new THREE.Vector3()
    }), []);
    
    // State refs
    const currentMode = useRef('DEFAULT');
    const shakeIntensity = useRef(0);
    const dramaticZoom = useRef(0);

    useFrame((state, delta) => {
        const positions = Object.values(playerPositions);
        const timeScale = slowmo ? 0.3 : 1;
        const adjustedDelta = Math.min(delta * timeScale, 0.1); // Clamp for stability
        
        // Update shake
        if (shake > shakeIntensity.current) {
            shakeIntensity.current = shake;
        }
        
        // Handle knockout focus
        if (knockoutTarget) {
            currentMode.current = 'KNOCKOUT';
            dramaticZoom.current = Math.min(dramaticZoom.current + adjustedDelta * 3, 1);
        } else {
            dramaticZoom.current = Math.max(dramaticZoom.current - adjustedDelta * 2, 0);
        }

        if (positions.length === 0) {
            vectors.targetPos.set(0, 18, 15);
            vectors.lookAtPos.set(0, 0, 0);
        } else {
            // Calculate center and spread
            let centerX = 0, centerY = 0, centerZ = 0;
            let minX = Infinity, maxX = -Infinity;
            let minZ = Infinity, maxZ = -Infinity;
            let maxY = 0;

            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                if (!pos) continue;
                
                centerX += pos[0];
                centerY += pos[1];
                centerZ += pos[2];
                minX = Math.min(minX, pos[0]);
                maxX = Math.max(maxX, pos[0]);
                minZ = Math.min(minZ, pos[2]);
                maxZ = Math.max(maxZ, pos[2]);
                maxY = Math.max(maxY, pos[1]);
            }

            centerX /= positions.length;
            centerY /= positions.length;
            centerZ /= positions.length;

            // Calculate spread for dynamic zoom
            const spreadX = maxX - minX;
            const spreadZ = maxZ - minZ;
            const maxSpread = Math.max(spreadX, spreadZ, 8);
            
            // Calculate velocity for look-ahead
            vectors.velocity.set(
                centerX - vectors.lastCenter.x,
                centerY - vectors.lastCenter.y,
                centerZ - vectors.lastCenter.z
            );
            vectors.lastCenter.set(centerX, centerY, centerZ);

            // Select camera mode
            const isIntense = maxSpread < 10 && positions.length > 1;
            const isWide = maxSpread > 20;
            
            if (knockoutTarget && playerPositions[knockoutTarget]) {
                currentMode.current = 'KNOCKOUT';
            } else if (isWide) {
                currentMode.current = 'WIDE';
            } else if (isIntense) {
                currentMode.current = 'COMBAT';
            } else {
                currentMode.current = 'DEFAULT';
            }

            const mode = CAMERA_MODES[currentMode.current];
            
            // Calculate look-ahead offset
            const lookAheadX = vectors.velocity.x * mode.lookAheadFactor * 8;
            const lookAheadZ = vectors.velocity.z * mode.lookAheadFactor * 8;
            
            // Dynamic height and distance
            const spreadFactor = Math.min(maxSpread / 15, 2);
            const dynamicHeight = mode.height + spreadFactor * 4;
            const dynamicDistance = mode.distance + spreadFactor * 3;
            
            // Special knockout focus
            if (knockoutTarget && playerPositions[knockoutTarget]) {
                const targetPosition = playerPositions[knockoutTarget];
                vectors.targetPos.set(
                    targetPosition[0] * 0.8,
                    8 + dramaticZoom.current * 3,
                    targetPosition[2] + 6 + dramaticZoom.current * 3
                );
                vectors.lookAtPos.set(
                    targetPosition[0],
                    targetPosition[1],
                    targetPosition[2]
                );
            } else {
                // Standard tracking
                vectors.targetPos.set(
                    centerX * 0.5 + lookAheadX,
                    dynamicHeight,
                    centerZ * 0.4 + dynamicDistance + lookAheadZ
                );
                vectors.lookAtPos.set(
                    centerX * 0.8 + lookAheadX * 0.5,
                    Math.max(centerY * 0.3, 0),
                    centerZ * 0.8 + lookAheadZ * 0.5
                );
            }
        }

        // Smooth camera movement
        const smoothFactor = CAMERA_MODES[currentMode.current].followSpeed * adjustedDelta;
        camera.position.lerp(vectors.targetPos, smoothFactor);

        // Apply screen shake
        if (shakeIntensity.current > 0.005) {
            const shakeAmount = shakeIntensity.current;
            camera.position.x += (Math.random() - 0.5) * shakeAmount;
            camera.position.y += (Math.random() - 0.5) * shakeAmount * 0.5;
            camera.position.z += (Math.random() - 0.5) * shakeAmount * 0.3;
            
            // Decay shake
            shakeIntensity.current *= 0.92;
        }

        // Smooth look-at using temp vector
        camera.getWorldDirection(vectors.tempLookAt);
        vectors.tempLookAt.multiplyScalar(10).add(camera.position);
        vectors.tempLookAt.lerp(vectors.lookAtPos, smoothFactor * 1.5);
        camera.lookAt(vectors.tempLookAt);

        // Subtle camera roll during intense moments
        const rollAmount = Math.sin(state.clock.elapsedTime * 0.5) * 0.008 * (shakeIntensity.current + 0.1);
        camera.rotation.z = rollAmount;
    });

    return null;
}

export default DynamicCamera;

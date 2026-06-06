import React, { useMemo, useRef, useEffect } from 'react';
import { useBox, useSphere, usePlane } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { ROCKET_PHYSICS } from '../utils/rocketPhysics';
import * as THREE from 'three';

// ============================================
// FIELD FLOOR - Reflective surface
// ============================================
function FieldFloor({ fieldLength, fieldWidth }) {
    const [ref] = usePlane(() => ({
        type: 'Static',
        position: [0, -0.1, 0],
        rotation: [-Math.PI / 2, 0, 0],
        material: { friction: 0.4, restitution: 0.3 }
    }));

    return (
        <group>
            <mesh ref={ref} receiveShadow visible={false} />
            {/* Visual Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[fieldWidth - 1, fieldLength - 1]} />
                <meshStandardMaterial
                    color="#1a1a2e"
                    metalness={0.7}
                    roughness={0.3}
                    envMapIntensity={1.5}
                />
            </mesh>
            {/* Field markings */}
            <CenterCircle />
            <FieldLines fieldLength={fieldLength} fieldWidth={fieldWidth} />
            <GoalArea fieldLength={fieldLength} fieldWidth={fieldWidth} />
        </group>
    );
}

function CenterCircle() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[2, 2.5, 64]} />
            <meshBasicMaterial color="#333" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
    );
}

function FieldLines({ fieldLength, fieldWidth }) {
    const halfLen = fieldLength / 2;
    const halfWid = fieldWidth / 2;

    return (
        <group>
            {/* Center line */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <planeGeometry args={[0.1, fieldLength]} />
                <meshBasicMaterial color="#444" transparent opacity={0.3} />
            </mesh>
            {/* Side walls indicators */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -halfLen + 0.5]}>
                <planeGeometry args={[fieldWidth - 2, 0.1]} />
                <meshBasicMaterial color="#444" transparent opacity={0.2} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, halfLen - 0.5]}>
                <planeGeometry args={[fieldWidth - 2, 0.1]} />
                <meshBasicMaterial color="#444" transparent opacity={0.2} />
            </mesh>
        </group>
    );
}

function GoalArea({ fieldLength, fieldWidth }) {
    const halfLen = fieldLength / 2;
    const goalWidth = ROCKET_PHYSICS.field.goalWidth;
    const goalBoxSize = 3;

    return (
        <group>
            {/* Blue goal area */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -halfLen + 0.5]}>
                <planeGeometry args={[goalWidth + 2, goalBoxSize]} />
                <meshBasicMaterial color="#0044ff" transparent opacity={0.08} side={THREE.DoubleSide} />
            </mesh>
            {/* Orange goal area */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, halfLen - 0.5]}>
                <planeGeometry args={[goalWidth + 2, goalBoxSize]} />
                <meshBasicMaterial color="#ff8800" transparent opacity={0.08} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ============================================
// WALLS - Glass-like with glow
// ============================================
function FieldWalls({ fieldLength, fieldWidth, wallHeight }) {
    const halfLen = fieldLength / 2;
    const halfWid = fieldWidth / 2;

    // Wall segments: 4 sides
    const wallSegments = [
        { pos: [0, wallHeight / 2, -halfLen], size: [fieldWidth, wallHeight, 0.5] }, // Back
        { pos: [0, wallHeight / 2, halfLen], size: [fieldWidth, wallHeight, 0.5] },  // Front
        { pos: [-halfWid, wallHeight / 2, 0], size: [0.5, wallHeight, fieldLength] }, // Left
        { pos: [halfWid, wallHeight / 2, 0], size: [0.5, wallHeight, fieldLength] },  // Right
    ];

    return (
        <group>
            {wallSegments.map((wall, i) => (
                <WallSegment key={i} position={wall.pos} size={wall.size} />
            ))}
            {/* Goal openings - back wall */}
            <GoalWalls side="blue" fieldLength={fieldLength} fieldWidth={fieldWidth} wallHeight={wallHeight} />
            <GoalWalls side="orange" fieldLength={fieldLength} fieldWidth={fieldWidth} wallHeight={wallHeight} />
        </group>
    );
}

function WallSegment({ position, size }) {
    const [ref] = useBox(() => ({
        type: 'Static',
        position,
        args: size,
        material: { friction: 0.3, restitution: 0.7 }
    }));

    return (
        <mesh ref={ref} receiveShadow>
            <boxGeometry args={size} />
            <meshPhysicalMaterial
                color="#0d0d1a"
                metalness={0.9}
                roughness={0.1}
                transparent
                opacity={0.85}
                envMapIntensity={2}
            />
            {/* Glow outline */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
                <lineBasicMaterial color="#00d4ff" transparent opacity={0.15} />
            </lineSegments>
        </mesh>
    );
}

function GoalWallPiece({ position, size, color }) {
    const [physRef] = useBox(() => ({
        type: 'Static',
        position,
        args: size,
        material: { friction: 0.3, restitution: 0.6 }
    }));
    return (
        <mesh ref={physRef} receiveShadow>
            <boxGeometry args={size} />
            <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
        </mesh>
    );
}

function GoalWalls({ side, fieldLength, fieldWidth, wallHeight }) {
    const halfLen = fieldLength / 2;
    const goalWidth = ROCKET_PHYSICS.field.goalWidth;
    const goalHeight = ROCKET_PHYSICS.field.goalHeight;
    const goalDepth = ROCKET_PHYSICS.field.goalDepth;
    const zPos = side === 'blue' ? -halfLen : halfLen;
    const goalColor = side === 'blue' ? '#0044ff' : '#ff8800';

    // Walls surrounding the goal opening (above and sides)
    const sideWallOffset = goalWidth / 2 + 0.25;

    const wallPieces = [
        // Wall above goal
        { pos: [0, wallHeight - (wallHeight - goalHeight) / 2, zPos], size: [goalWidth + 0.5, wallHeight - goalHeight, 0.5] },
        // Left side of goal
        { pos: [-sideWallOffset, goalHeight / 2, zPos], size: [0.25, goalHeight, 0.5] },
        // Right side of goal
        { pos: [sideWallOffset, goalHeight / 2, zPos], size: [0.25, goalHeight, 0.5] },
    ];

    return (
        <group>
            {wallPieces.map((wall, i) => (
                <GoalWallPiece key={i} position={wall.pos} size={wall.size} color={goalColor} />
            ))}
            {/* Goal net (visual only) */}
            <GoalNet side={side} zPos={zPos} goalWidth={goalWidth} goalHeight={goalHeight} goalDepth={goalDepth} />
        </group>
    );
}

function GoalNet({ side, zPos, goalWidth, goalHeight, goalDepth }) {
    const netColor = side === 'blue' ? '#0066ff' : '#ff9900';
    const netZ = zPos + (side === 'blue' ? -goalDepth / 2 : goalDepth / 2);

    return (
        <mesh position={[0, goalHeight / 2, netZ]}>
            <boxGeometry args={[goalWidth, goalHeight, goalDepth]} />
            <meshBasicMaterial color={netColor} transparent opacity={0.15} wireframe side={THREE.DoubleSide} />
        </mesh>
    );
}

// ============================================
// BOOST PADS
// ============================================
function BoostPad({ position, isLarge, onCollect }) {
    const [ref, api] = useSphere(() => ({
        type: 'Static',
        position,
        args: [isLarge ? 0.6 : 0.3],
        sensor: true,
        onCollide: (e) => {
            if (e.body?.userData?.type === 'car') {
                onCollect?.(isLarge ? 'large' : 'small');
            }
        }
    }));

    const lightRef = useRef();
    const glowRef = useRef();

    useFrame((state) => {
        if (lightRef.current) {
            const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
            lightRef.current.intensity = isLarge ? pulse * 2 : pulse;
        }
        if (glowRef.current) {
            glowRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
        }
    });

    const color = isLarge ? '#ff8800' : '#00d4ff';
    const size = isLarge ? 0.8 : 0.4;

    return (
        <group ref={glowRef}>
            {/* Base glow disc */}
            <mesh position={[position[0], 0.05, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[size * 1.5, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>
            {/* Central sphere */}
            <mesh position={position}>
                <sphereGeometry args={[size * 0.4, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
            </mesh>
            {/* Point light */}
            <pointLight ref={lightRef} position={position} color={color} distance={3} intensity={0.5} />
        </group>
    );
}

// ============================================
// CEILING LIGHTS - Stadium lighting
// ============================================
function StadiumLights({ fieldLength, fieldWidth, ceilingHeight }) {
    const lights = useMemo(() => {
        const positions = [];
        for (let z = -fieldLength / 4; z <= fieldLength / 4; z += fieldLength / 4) {
            for (let x = -fieldWidth / 4; x <= fieldWidth / 4; x += fieldWidth / 4) {
                positions.push([x, ceilingHeight - 0.5, z]);
            }
        }
        return positions;
    }, [fieldLength, fieldWidth, ceilingHeight]);

    return (
        <group>
            {lights.map((pos, i) => (
                <group key={i}>
                    <pointLight position={pos} color="#ffffff" distance={30} intensity={0.3} />
                    <mesh position={pos}>
                        <sphereGeometry args={[0.15, 8, 8]} />
                        <meshBasicMaterial color="#ffffff" />
                    </mesh>
                </group>
            ))}
            {/* Main directional light */}
            <directionalLight position={[0, ceilingHeight + 5, 0]} intensity={0.4} color="#ffffff" castShadow />
        </group>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function RocketStadium({ onBoostCollect }) {
    const field = ROCKET_PHYSICS.field;

    // Generate boost pad positions
    const boostPads = useMemo(() => {
        const pads = [];
        const halfLen = field.length / 2 - 2;
        const halfWid = field.width / 2 - 2;

        // Large boost pads (6)
        const largePositions = [
            [0, 0.3, -halfLen * 0.6],
            [0, 0.3, halfLen * 0.6],
            [-halfWid * 0.5, 0.3, -halfLen * 0.3],
            [halfWid * 0.5, 0.3, -halfLen * 0.3],
            [-halfWid * 0.5, 0.3, halfLen * 0.3],
            [halfWid * 0.5, 0.3, halfLen * 0.3],
        ];
        largePositions.forEach((p, i) => pads.push({ position: p, isLarge: true, id: `large_${i}` }));

        // Small boost pads (18)
        const smallPositions = [];
        for (let z = -halfLen + 1; z <= halfLen - 1; z += field.length / 5) {
            for (let x = -halfWid + 1.5; x <= halfWid - 1.5; x += field.width / 3) {
                if (Math.random() > 0.3) {
                    smallPositions.push([x, 0.3, z]);
                }
            }
        }
        smallPositions.forEach((p, i) => pads.push({ position: p, isLarge: false, id: `small_${i}` }));

        return pads;
    }, []);

    return (
        <group>
            {/* Field floor */}
            <FieldFloor fieldLength={field.length} fieldWidth={field.width} />

            {/* Walls */}
            <FieldWalls
                fieldLength={field.length}
                fieldWidth={field.width}
                wallHeight={field.wallHeight}
            />

            {/* Ceiling */}
            <mesh position={[0, field.ceilingHeight, 0]} receiveShadow>
                <boxGeometry args={[field.width + 2, 0.3, field.length + 2]} />
                <meshPhysicalMaterial color="#0a0a15" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
            </mesh>

            {/* Boost pads */}
            {boostPads.map((pad) => (
                <BoostPad
                    key={pad.id}
                    position={pad.position}
                    isLarge={pad.isLarge}
                    onCollect={onBoostCollect}
                />
            ))}

            {/* Lights */}
            <StadiumLights
                fieldLength={field.length}
                fieldWidth={field.width}
                ceilingHeight={field.ceilingHeight}
            />

            {/* Ambient glow */}
            <ambientLight intensity={0.15} color="#4040ff" />
            <hemisphereLight args={['#0000ff', '#ff6600', 0.1]} />
        </group>
    );
}
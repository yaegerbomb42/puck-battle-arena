import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { PHYSICS_CONFIG, isInKnockoutZone, canStomp, calculateStompDamage } from '../utils/physics';

// ============================================
// OPTIMIZED TRAIL - Reuses geometry, no memory leak
// ============================================
function PuckTrail({ positionsRef, color, active }) {
    const lineRef = useRef();
    const geometryRef = useRef(new THREE.BufferGeometry());
    const positionsArray = useRef(new Float32Array(60)); // 20 points * 3 coords
    
    useFrame(() => {
        if (!lineRef.current || !active) return;
        
        const positions = positionsRef.current;
        if (positions.length < 2) return;
        
        // Update buffer in place instead of creating new geometry
        for (let i = 0; i < Math.min(positions.length, 20); i++) {
            const pos = positions[positions.length - 1 - i] || [0, 0, 0];
            positionsArray.current[i * 3] = pos[0];
            positionsArray.current[i * 3 + 1] = pos[1];
            positionsArray.current[i * 3 + 2] = pos[2];
        }
        
        geometryRef.current.setAttribute(
            'position',
            new THREE.BufferAttribute(positionsArray.current.slice(0, positions.length * 3), 3)
        );
        geometryRef.current.setDrawRange(0, positions.length);
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            geometryRef.current.dispose();
        };
    }, []);

    return (
        <line ref={lineRef}>
            <primitive object={geometryRef.current} attach="geometry" />
            <lineBasicMaterial color={color} transparent opacity={0.5} linewidth={2} />
        </line>
    );
}

// ============================================
// DAMAGE DISPLAY - Fixed positioning
// ============================================
function DamageDisplay({ damage, position, playerName, color }) {
    const displayColor = useMemo(() => {
        if (damage < 50) return '#ffffff';
        if (damage < 100) return '#ffff00';
        if (damage < 150) return '#ff8800';
        return '#ff0000';
    }, [damage]);
    
    const scale = 1 + Math.min(damage / 200, 0.5);
    const shakeOffset = damage > 100 ? (Math.random() - 0.5) * 0.05 * (damage / 100) : 0;

    return (
        <Billboard position={[position[0] + shakeOffset, position[1] + 1.5, position[2]]}>
            {playerName && (
                <Text
                    fontSize={0.3}
                    color={color}
                    anchorY="bottom"
                    position={[0, 0.4, 0]}
                    outlineWidth={0.02}
                    outlineColor="#000000"
                >
                    {playerName}
                </Text>
            )}
            <Text
                fontSize={0.5 * scale}
                color={displayColor}
                outlineWidth={0.04}
                outlineColor="#000000"
            >
                {Math.floor(damage)}%
            </Text>
        </Billboard>
    );
}

// ============================================
// GROUND SHADOW INDICATOR
// ============================================
function GroundIndicator({ position, color, radius, isAirborne }) {
    const opacity = isAirborne ? 0.15 : 0.35;
    const scale = isAirborne ? 0.6 : 1;
    
    return (
        <mesh 
            position={[position[0], 0.02, position[2]]} 
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[scale, scale, 1]}
        >
            <ringGeometry args={[radius * 0.9, radius * 1.1, 32]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
        </mesh>
    );
}

// ============================================
// STOMP TARGET INDICATOR
// ============================================
function StompIndicator({ active, position }) {
    if (!active) return null;
    
    return (
        <mesh position={[position[0], 0.1, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.6, 4]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
    );
}

// ============================================
// SHIELD VISUAL EFFECT
// ============================================
function ShieldEffect({ position, radius }) {
    const meshRef = useRef();
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime;
            meshRef.current.material.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
        }
    });
    
    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[radius * 1.6, 32, 32]} />
            <meshBasicMaterial
                color="#00d4ff"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                wireframe
            />
        </mesh>
    );
}

// ============================================
// MAIN PUCK COMPONENT
// ============================================
export default function Puck({
    playerId,
    playerName,
    color,
    startPosition,
    isLocalPlayer = false,
    iconPath,
    powerup,
    damage = 0,
    onKnockout,
    onStomp,
    onPositionUpdate,
    onCollision,
    onUseItem,
    onImpact,
    isPaused,
    remotePosition,
    remoteVelocity,
    allPlayerPositions = {},
    gameMode = 'knockout'
}) {
    const config = PHYSICS_CONFIG.puck;
    
    // ========== COMPUTED PHYSICS VALUES ==========
    const effectiveRadius = useMemo(() => {
        if (powerup?.id === 'giant') return config.radius * 1.8;
        if (powerup?.id === 'shrink') return config.radius * 0.6;
        return config.radius;
    }, [powerup?.id, config.radius]);
    
    const effectiveMass = useMemo(() => {
        let mass = config.mass;
        if (powerup?.id === 'giant') mass *= 2.5;
        if (powerup?.id === 'shrink') mass *= 0.5;
        if (powerup?.id === 'shield') mass *= 1.5;
        return mass;
    }, [powerup?.id, config.mass]);

    // Smash Bros knockback scaling
    const knockbackMultiplier = useMemo(() => {
        return 1 + (damage / 100) * PHYSICS_CONFIG.collision.damageMultiplier;
    }, [damage]);

    // ========== PHYSICS BODY ==========
    const [ref, api] = useSphere(() => ({
        mass: isLocalPlayer ? effectiveMass : 0,
        position: startPosition,
        args: [effectiveRadius],
        linearDamping: config.linearDamping,
        angularDamping: config.angularDamping,
        material: { 
            restitution: config.restitution + (damage / 400), // More bouncy when damaged
            friction: powerup?.id === 'ghost' ? 0 : config.friction 
        },
        userData: { playerId, type: 'puck' },
        onCollide: handlePhysicsCollision
    }));

    // ========== STATE ==========
    const velocity = useRef([0, 0, 0]);
    const position = useRef([...startPosition]);
    const trailPositions = useRef([]);
    const [isRespawning, setIsRespawning] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const [isAirborne, setIsAirborne] = useState(false);
    const [stompTarget, setStompTarget] = useState(null);
    
    // Input state with debouncing - FIX for spacebar spam
    const inputState = useRef({
        keys: {},
        spacePressed: false, // Tracks if space was just pressed (for single-fire)
        spaceHeld: false,    // Tracks if space is being held
        jumpCooldown: 0,
        lastJumpTime: 0
    });

    // ========== COLLISION HANDLER ==========
    const handlePhysicsCollision = useCallback((e) => {
        if (!isLocalPlayer || isPaused) return;
        
        const otherBody = e.body;
        const impactVelocity = e.contact?.impactVelocity || 0;
        
        // Player-to-player collision
        if (otherBody?.userData?.type === 'puck' && impactVelocity > 2) {
            const knockbackForce = PHYSICS_CONFIG.collision.baseForce * knockbackMultiplier;
            const normal = new THREE.Vector3(
                e.contact.contactNormal[0],
                e.contact.contactNormal[1],
                e.contact.contactNormal[2]
            ).normalize();
            
            // Upward bias increases with damage (Smash Bros style)
            const upwardBias = Math.min(damage / 150, 0.6);
            
            api.applyImpulse([
                normal.x * knockbackForce,
                (Math.abs(normal.y) + upwardBias) * knockbackForce * 0.5,
                normal.z * knockbackForce
            ], [0, 0, 0]);
            
            onCollision?.(impactVelocity * knockbackMultiplier);
            
            // Heavy hit effects
            if (impactVelocity > 5) {
                onImpact?.(impactVelocity);
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 80);
                
                // Funny physics - random spin on big hits
                if (impactVelocity > 8 && Math.random() > 0.6) {
                    api.applyTorque([
                        (Math.random() - 0.5) * impactVelocity * 3,
                        (Math.random() - 0.5) * impactVelocity * 3,
                        (Math.random() - 0.5) * impactVelocity * 3
                    ]);
                }
            }
        }
        
        // Special tile interactions
        const tileType = otherBody?.userData?.type;
        if (tileType === 'boost_pad') {
            const dir = otherBody.userData.direction || 0;
            api.applyImpulse([Math.sin(dir) * 20, 5, Math.cos(dir) * 20], [0, 0, 0]);
        } else if (tileType === 'spring') {
            api.applyImpulse([0, 35, 0], [0, 0, 0]);
            onImpact?.(5);
        }
    }, [isLocalPlayer, isPaused, knockbackMultiplier, damage, api, onCollision, onImpact]);

    // ========== SUBSCRIBE TO PHYSICS ==========
    useEffect(() => {
        const unsubVel = api.velocity.subscribe((v) => { velocity.current = v; });
        const unsubPos = api.position.subscribe((p) => {
            position.current = p;
            // Trail tracking
            trailPositions.current.push([...p]);
            if (trailPositions.current.length > 20) {
                trailPositions.current.shift();
            }
        });
        return () => { unsubVel(); unsubPos(); };
    }, [api]);

    // ========== INPUT HANDLING - Fixed debounce ==========
    useEffect(() => {
        if (!isLocalPlayer) return;

        const handleKeyDown = (e) => {
            inputState.current.keys[e.code] = true;
            
            // Space key - single press detection (FIX: no more spam)
            if (e.code === 'Space' && !inputState.current.spaceHeld) {
                inputState.current.spacePressed = true;
                inputState.current.spaceHeld = true;
            }
        };
        
        const handleKeyUp = (e) => {
            inputState.current.keys[e.code] = false;
            
            if (e.code === 'Space') {
                inputState.current.spaceHeld = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isLocalPlayer]);

    // ========== MOVEMENT UPDATE LOOP ==========
    useEffect(() => {
        if (!isLocalPlayer) return;

        const updateMovement = () => {
            if (isRespawning || isPaused) return;

            const { keys, spacePressed } = inputState.current;
            let forceX = 0;
            let forceZ = 0;

            // WASD / Arrow movement
            if (keys['KeyW'] || keys['ArrowUp']) forceZ -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) forceZ += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) forceX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) forceX += 1;

            // Normalize diagonal
            if (forceX !== 0 && forceZ !== 0) {
                const mag = Math.sqrt(forceX * forceX + forceZ * forceZ);
                forceX /= mag;
                forceZ /= mag;
            }

            // Apply powerup modifiers
            let accel = config.acceleration;
            if (powerup?.id === 'speed_boost') accel *= 1.8;
            if (powerup?.id === 'shrink') accel *= 1.3;
            if (powerup?.id === 'giant') accel *= 0.7;
            
            // Reverse controls if cursed
            if (powerup?.id === 'cursed') {
                forceX *= -1;
                forceZ *= -1;
            }
            
            // Air control reduction
            const isInAir = position.current[1] > 1;
            if (isInAir) {
                accel *= PHYSICS_CONFIG.puck.airControl || 0.7;
            }

            // Apply movement force
            if (forceX !== 0 || forceZ !== 0) {
                api.applyForce([forceX * accel, 0, forceZ * accel], [0, 0, 0]);
            }

            // SPACE KEY - Use item OR jump (single press only)
            if (spacePressed) {
                inputState.current.spacePressed = false; // Consume the press
                
                if (powerup && powerup.type !== 'buff') {
                    // Use active powerup
                    onUseItem?.();
                } else {
                    // Jump (with cooldown)
                    const now = Date.now();
                    if (now - inputState.current.lastJumpTime > 500) {
                        api.applyImpulse([0, 12, 0], [0, 0, 0]);
                        inputState.current.lastJumpTime = now;
                    }
                }
            }
        };

        const interval = setInterval(updateMovement, 16);
        return () => clearInterval(interval);
    }, [api, isLocalPlayer, isRespawning, isPaused, powerup, config.acceleration, onUseItem]);

    // ========== REMOTE PLAYER SYNC ==========
    useEffect(() => {
        if (!isLocalPlayer && remotePosition) {
            api.position.set(...remotePosition);
        }
        if (!isLocalPlayer && remoteVelocity) {
            api.velocity.set(...remoteVelocity);
        }
    }, [api, isLocalPlayer, remotePosition, remoteVelocity]);

    // ========== GAME LOGIC FRAME UPDATE ==========
    useFrame(() => {
        if (isPaused) return;
        
        // Track airborne state
        const currentlyAirborne = position.current[1] > 1;
        setIsAirborne(currentlyAirborne);
        
        // AIR STOMP DETECTION
        if (isLocalPlayer && currentlyAirborne && velocity.current[1] < -4) {
            // Check for players below
            Object.entries(allPlayerPositions).forEach(([id, pos]) => {
                if (id === playerId || !pos) return;
                
                if (canStomp(position.current, velocity.current, pos)) {
                    setStompTarget(id);
                    
                    const stompDamage = calculateStompDamage(Math.abs(velocity.current[1]));
                    onStomp?.(id, { damage: stompDamage, knockback: Math.abs(velocity.current[1]) * 2 });
                    
                    // Bounce up after stomp
                    api.velocity.set(
                        velocity.current[0] * 0.3,
                        Math.abs(velocity.current[1]) * 0.7,
                        velocity.current[2] * 0.3
                    );
                    
                    setTimeout(() => setStompTarget(null), 200);
                }
            });
        }
        
        // Position update for local player
        if (isLocalPlayer) {
            onPositionUpdate?.(position.current, velocity.current);
            
            // Knockout check
            if (!isRespawning && isInKnockoutZone(position.current)) {
                handleKnockout();
            }
        }
    });

    // ========== KNOCKOUT HANDLER ==========
    const handleKnockout = useCallback(() => {
        setIsRespawning(true);
        onKnockout?.(playerId);
        
        setTimeout(() => {
            api.position.set(...startPosition);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);
            trailPositions.current = [];
            setIsRespawning(false);
        }, 1500);
    }, [api, onKnockout, playerId, startPosition]);

    // ========== VISUAL STATE ==========
    const glowIntensity = damage > 100 ? 0.5 + Math.sin(Date.now() * 0.01) * 0.3 : 0.2;
    const puckScale = powerup?.id === 'giant' ? 1.8 : powerup?.id === 'shrink' ? 0.6 : 1;
    const isInvisible = powerup?.id === 'invisible' && !isLocalPlayer;
    const isGhost = powerup?.id === 'ghost';
    const hasShield = powerup?.id === 'shield';
    
    // Speed check for trail
    const speed = Math.sqrt(
        velocity.current[0] ** 2 + 
        velocity.current[1] ** 2 + 
        velocity.current[2] ** 2
    );

    if (isInvisible) return null;

    return (
        <group>
            {/* Damage display */}
            {!isRespawning && (
                <DamageDisplay 
                    damage={damage} 
                    position={position.current} 
                    playerName={playerName}
                    color={color}
                />
            )}

            {/* Ground indicator */}
            <GroundIndicator 
                position={position.current}
                color={color}
                radius={effectiveRadius}
                isAirborne={isAirborne}
            />

            {/* Stomp target indicator */}
            <StompIndicator 
                active={!!stompTarget}
                position={position.current}
            />

            {/* Motion trail */}
            {!isRespawning && speed > 5 && (
                <PuckTrail 
                    positionsRef={trailPositions}
                    color={color}
                    active={true}
                />
            )}

            {/* Shield effect */}
            {hasShield && !isRespawning && (
                <ShieldEffect 
                    position={position.current}
                    radius={effectiveRadius}
                />
            )}

            {/* Main puck */}
            <mesh 
                ref={ref} 
                castShadow 
                visible={!isRespawning}
                scale={[puckScale, puckScale, puckScale]}
            >
                <sphereGeometry args={[config.radius, 32, 32]} />
                <meshStandardMaterial
                    color={isFlashing ? '#ffffff' : color}
                    metalness={0.7}
                    roughness={0.2}
                    emissive={isFlashing ? '#ffffff' : color}
                    emissiveIntensity={isFlashing ? 2 : glowIntensity}
                    transparent={isGhost}
                    opacity={isGhost ? 0.4 : 1}
                />
            </mesh>
        </group>
    );
}

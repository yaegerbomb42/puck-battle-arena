import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Text, Billboard, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PHYSICS_CONFIG, isInKnockoutZone, canStomp, calculateStompDamage } from '../utils/physics';
import { audio } from '../utils/audio';
import useGamepad from '../hooks/useGamepad';

import { LegendaryMaterial, CosmicMaterial, DivineMaterial, MysteryMaterial, SymbioteMaterial } from '../utils/PuckMaterials';

// =======================================


extend({ LegendaryMaterial, CosmicMaterial, DivineMaterial, MysteryMaterial, SymbioteMaterial });



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
        const geo = geometryRef.current;
        return () => {
            geo.dispose();
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
// PARRY VISUAL EFFECT (Shockwave)
// ============================================
function ParryEffect({ position, active }) {
    const meshRef = useRef();
    const [opacity, setOpacity] = useState(0.8);

    useFrame((state) => {
        if (meshRef.current && active) {
            meshRef.current.scale.addScalar(0.15);
            setOpacity(prev => Math.max(0, prev - 0.05));
        }
    });

    if (!active) return null;

    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={opacity} wireframe />
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
// STUN VISUAL EFFECT (Stars)
// ============================================
function StunEffect({ position, active }) {
    const groupRef = useRef();

    useFrame((state) => {
        if (groupRef.current && active) {
            groupRef.current.rotation.y = state.clock.elapsedTime * 4;
            groupRef.current.position.y = 1.6 + Math.sin(state.clock.elapsedTime * 6) * 0.1;
        }
    });

    if (!active) return null;

    return (
        <group ref={groupRef} position={[position[0], position[1], position[2]]}>
            {[0, 1, 2].map((i) => (
                <mesh key={i} position={[Math.cos((i / 3) * Math.PI * 2) * 0.6, 0, Math.sin((i / 3) * Math.PI * 2) * 0.6]}>
                    <octahedronGeometry args={[0.08, 0]} />
                    <meshBasicMaterial color="#ffff00" />
                </mesh>
            ))}
        </group>
    );
}

// ============================================
// COLLISION SPARK BURST - Short-lived particle effect
// ============================================
function CollisionSparks({ sparks }) {
    return sparks.map(spark => (
        <SparkBurst key={spark.id} position={spark.position} color={spark.color} intensity={spark.intensity} />
    ));
}

function SparkBurst({ position, color = '#ffcc00', intensity = 1 }) {
    const meshRef = useRef();
    const startTime = useRef(0);
    const count = Math.min(Math.floor(8 + intensity * 6), 30);
    const duration = 0.4 + intensity * 0.1;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 12 * intensity,
                Math.random() * 8 * intensity + 2,
                (Math.random() - 0.5) * 12 * intensity
            ),
            scale: 0.02 + Math.random() * 0.04
        }));
    }, [count, intensity]);

    useEffect(() => {
        startTime.current = performance.now() / 1000;
    }, []);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const elapsed = clock.elapsedTime - startTime.current;
        if (elapsed < 0) return;
        const progress = Math.min(elapsed / duration, 1);

        particles.forEach((p, i) => {
            if (progress >= 1) {
                dummy.scale.set(0, 0, 0);
            } else {
                const t = elapsed;
                dummy.position.set(
                    position[0] + p.velocity.x * t,
                    position[1] + p.velocity.y * t - 4.9 * t * t,
                    position[2] + p.velocity.z * t
                );
                const fadeScale = p.scale * (1 - progress);
                dummy.scale.set(fadeScale, fadeScale, fadeScale);
            }
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={color} toneMapped={false} />
        </instancedMesh>
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
    isBot = false,
    iconPath,
    tier = 1, // Add tier prop to determine shader
    powerup,
    damage = 0,
    onKnockout,
    onStomp,
    onPositionUpdate,
    onCollision,
    onUseItem,
    onUseLoadoutItem,
    onImpact,
    onInvincibleChange,
    onInput,
    isPaused,
    remotePosition,
    remoteVelocity,
    allPlayerPositions = {},
    gameMode = 'knockout',
    skinTier = 0, // NEW PROP
    explosionEvent,
    projectileImpactEvent // NEW PROP
}) {
    const config = PHYSICS_CONFIG.puck;

    // ========== COMPUTED PHYSICS VALUES ==========
    const effectiveRadius = useMemo(() => {
        if (powerup?.id === 'giant') return config.radius * 1.8;
        if (powerup?.id === 'shrink') return config.radius * 0.6;
        return config.radius;
    }, [powerup?.id, config.radius]);

    const skinMassModifier = 1 + (skinTier * 0.025); // +2.5% per tier (Epic Tier 4 = +10%)
    const skinAccelModifier = 1 + (skinTier * 0.02); // +2.0% per tier (Legendary Tier 6 = +12%)

    const effectiveMass = useMemo(() => {
        let mass = config.mass * skinMassModifier;
        if (powerup?.id === 'giant') mass *= 2.5;
        if (powerup?.id === 'shrink') mass *= 0.5;
        if (powerup?.id === 'shield') mass *= 1.5;
        return mass;
    }, [powerup?.id, config.mass, skinMassModifier]);

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
    const [isStunned, setIsStunned] = useState(false);
    const [parryEvent, setParryEvent] = useState(null);
    const [stompTarget, setStompTarget] = useState(null);
    const [sparkEvents, setSparkEvents] = useState([]);
    const lastHitBy = useRef(null); // Track who last hit us for kill attribution
    const sparkIdCounter = useRef(0);

    const inputState = useRef({
        keys: {},
        spacePressed: false, // Tracks if space was just pressed (for single-fire)
        spaceHeld: false,    // Tracks if space is being held
        loadout1Pressed: false,
        loadout1Held: false,
        loadout2Pressed: false,
        loadout2Held: false,
        loadout3Pressed: false,
        loadout3Held: false,
        jumpCooldown: 0,
        lastJumpTime: 0
    });

    // GAMEPAD SUPPORT
    const gamepad = useGamepad();
    const gamepadButtonState = useRef({
        jumpHeld: false,
        dashHeld: false,
        itemHeld: false
    });

    const [invincible, setInvincible] = useState(false);

    // Notify parent of invincibility state changes
    useEffect(() => {
        if (isLocalPlayer) {
            onInvincibleChange?.(invincible);
        }
    }, [invincible, isLocalPlayer, onInvincibleChange]);

    // Visual pulsing while invincible
    useEffect(() => {
        if (!invincible) return;
        const interval = setInterval(() => {
            setIsFlashing(prev => !prev);
        }, 150);
        return () => {
            clearInterval(interval);
            setIsFlashing(false);
        };
    }, [invincible]);

    // [NEW] Handle Projectile Impact Attribution
    useEffect(() => {
        if (projectileImpactEvent && projectileImpactEvent.targetId === playerId) {
            lastHitBy.current = projectileImpactEvent.ownerId;
            // Optionally add feedback for being hit by projectile
        }
    }, [projectileImpactEvent, playerId]);

    // ========== COLLISION HANDLER ==========
    const handlePhysicsCollision = useCallback((e) => {
        if (!isLocalPlayer || isPaused || invincible) return;

        const otherBody = e.body;
        const impactVelocity = e.contact?.impactVelocity || 0;
        const tileType = otherBody?.userData?.type;

        // Lava Hazard
        if (tileType === 'lava') {
            api.applyImpulse([0, 25, 0], [0, 0, 0]); // Big bounce out
            onCollision?.(30); // Heavy damage
            audio.playKnockout(); // Burn sound
            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 200);
            return;
        }

        // Player-to-player collision
        if (otherBody?.userData?.type === 'puck' && impactVelocity > 2) {
            // [NEW] PERFECT SHIELD (PARRY) LOGIC
            const now = Date.now();
            const parryWindow = PHYSICS_CONFIG.parry?.window || 250;
            const isParrying = now - lastDashTime.current < parryWindow;

            if (isParrying) {
                // Successful Parry!
                audio.playImpact(2.0); // Heavy sound
                setIsFlashing(true);
                setParryEvent({ timestamp: Date.now(), position: [...position.current] });
                setTimeout(() => setParryEvent(null), 400);
                setTimeout(() => setIsFlashing(false), 200);
                return; 
            }

            // Track last hitter for kill attribution
            if (otherBody.userData.playerId) {
                lastHitBy.current = otherBody.userData.playerId;
            }
            const knockbackForce = PHYSICS_CONFIG.collision.baseForce * knockbackMultiplier;
            const normal = new THREE.Vector3(
                e.contact.contactNormal[0],
                e.contact.contactNormal[1],
                e.contact.contactNormal[2]
            ).normalize();

            // Upward bias increases with damage (Smash Bros style)
            const upwardBias = Math.min(damage / 150, 0.6);

            // NEW: Active Bounce Amplification (makes it feel "Elastic")
            const activeBounceForce = impactVelocity * PHYSICS_CONFIG.collision.bounceAmplification;
            const finalKnockback = (knockbackForce + activeBounceForce) * knockbackMultiplier;

            api.applyImpulse([
                normal.x * finalKnockback,
                (Math.abs(normal.y) + upwardBias) * finalKnockback * 0.4,
                normal.z * finalKnockback
            ], [0, 0, 0]);

            onCollision?.(impactVelocity * knockbackMultiplier);

            // Dynamic sounds based on power
            if (impactVelocity > 15) {
                audio.playExplosion?.(); // Super-heavy hit
            } else {
                audio.playImpact(impactVelocity / 8);
            }

            // Emit spark particles at contact midpoint
            const contactPos = [
                position.current[0] + normal.x * effectiveRadius * 0.9,
                position.current[1] + 0.2,
                position.current[2] + normal.z * effectiveRadius * 0.9
            ];
            const sparkId = sparkIdCounter.current++;
            setSparkEvents(prev => [...prev, {
                id: sparkId,
                position: contactPos,
                color: impactVelocity > 8 ? '#ff6600' : '#ffcc00',
                intensity: Math.min(impactVelocity / 5, 3)
            }]);
            // Auto-remove after particle lifetime
            setTimeout(() => {
                setSparkEvents(prev => prev.filter(s => s.id !== sparkId));
            }, 800);

            // Heavy hit effects
            if (impactVelocity > 5) {
                onImpact?.(impactVelocity);
                
                // STUN LOGIC - Stun on heavy impact (impact > 18)
                if (impactVelocity > 18 && !invincible) {
                    setIsStunned(true);
                    setTimeout(() => setIsStunned(false), 800 + (damage * 5)); // Stun duration scales with damage
                }

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
        if (tileType === 'boost_pad') {
            const dir = otherBody.userData.direction || 0;
            api.applyImpulse([Math.sin(dir) * 20, 5, Math.cos(dir) * 20], [0, 0, 0]);
        } else if (tileType === 'spring' || tileType === 'jump_pad') {
            const boost = tileType === 'jump_pad' ? 45 : 35;
            api.applyImpulse([0, boost, 0], [0, 0, 0]);
            onImpact?.(8);
            audio.playJump();
        } else if (tileType === 'conveyor') {
            const dir = otherBody.userData.direction || 0;
            const speed = otherBody.userData.speed || 10;
            api.applyImpulse([Math.sin(dir) * speed, 2, Math.cos(dir) * speed], [0, 0, 0]);
        }
    }, [isLocalPlayer, isPaused, invincible, knockbackMultiplier, damage, api, onCollision, onImpact, effectiveRadius]);

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
    const lastDashTime = useRef(0);

    // Dash Configuration
    const DASH_FORCE = 65;
    const DASH_COOLDOWN_MS = 2500;

    useEffect(() => {
        if (!isLocalPlayer) return;

        const handleKeyDown = (e) => {
            inputState.current.keys[e.code] = true;

            // Space key - single press detection (FIX: no more spam)
            if (e.code === 'Space' && !inputState.current.spaceHeld) {
                inputState.current.spacePressed = true;
                inputState.current.spaceHeld = true;
            }

            // Loadout 1/2/3 single press detection
            if (e.code === 'Digit1' && !inputState.current.loadout1Held) {
                inputState.current.loadout1Pressed = true;
                inputState.current.loadout1Held = true;
            }
            if (e.code === 'Digit2' && !inputState.current.loadout2Held) {
                inputState.current.loadout2Pressed = true;
                inputState.current.loadout2Held = true;
            }
            if (e.code === 'Digit3' && !inputState.current.loadout3Held) {
                inputState.current.loadout3Pressed = true;
                inputState.current.loadout3Held = true;
            }

            // Dash Input (Shift)
            if (e.shiftKey) {
                inputState.current.dashPressed = true;
            }
        };

        const handleKeyUp = (e) => {
            inputState.current.keys[e.code] = false;

            if (e.code === 'Space') {
                inputState.current.spaceHeld = false;
            }
            if (e.code === 'Digit1') inputState.current.loadout1Held = false;
            if (e.code === 'Digit2') inputState.current.loadout2Held = false;
            if (e.code === 'Digit3') inputState.current.loadout3Held = false;
            if (!e.shiftKey) {
                inputState.current.dashPressed = false;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isLocalPlayer]);

    // ========== MOVEMENT & AI LOOP (PHYSICS STEP) ==========
    useFrame(() => {
        if (isPaused || isRespawning || isStunned) return;

        // --- LOCAL PLAYER INPUT ---
        if (isLocalPlayer) {
            const { keys, spacePressed, dashPressed } = inputState.current;
            let forceX = 0;
            let forceZ = 0;

            // GAMEPAD INPUT (via useGamepad hook)
            const gamepadInput = gamepad.poll();
            if (gamepad.connected) {
                forceX = gamepadInput.moveX;
                forceZ = gamepadInput.moveY; // Note: Y axis is inverted for "forward"

                // Gamepad buttons
                if (gamepadInput.jump && !gamepadButtonState.current.jumpHeld) {
                    inputState.current.spacePressed = true;
                    gamepadButtonState.current.jumpHeld = true;
                }
                if (!gamepadInput.jump) gamepadButtonState.current.jumpHeld = false;

                if (gamepadInput.dash && !gamepadButtonState.current.dashHeld) {
                    inputState.current.dashPressed = true;
                    gamepadButtonState.current.dashHeld = true;
                }
                if (!gamepadInput.dash) gamepadButtonState.current.dashHeld = false;

                if (gamepadInput.useItem && !gamepadButtonState.current.itemHeld) {
                    onUseItem?.();
                    gamepadButtonState.current.itemHeld = true;
                }
                if (!gamepadInput.useItem) gamepadButtonState.current.itemHeld = false;
            }

            // KEYBOARD: WASD / Arrow movement (merged with gamepad)
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

            // Apply powerup & skin modifiers
            let accel = config.acceleration * skinAccelModifier;
            if (powerup?.id === 'speed_boost') accel *= 1.8;
            if (powerup?.id === 'shrink') accel *= 1.3;
            if (powerup?.id === 'giant') accel *= 0.7;
            if (powerup?.id === 'cursed') { forceX *= -1; forceZ *= -1; }

            // Air control
            const isInAir = position.current[1] > 1;
            if (isInAir) accel *= (PHYSICS_CONFIG.puck.airControl || 0.7);

            if (forceX !== 0 || forceZ !== 0) {
                api.applyForce([forceX * accel, 0, forceZ * accel], [0, 0, 0]);
            }

            // DASH / AIR DODGE
            const now = Date.now();
            if (dashPressed && (now - lastDashTime.current > DASH_COOLDOWN_MS)) {
                const isInAir = position.current[1] > 1.2;
                let dashX = forceX;
                let dashZ = forceZ;
                
                if (dashX === 0 && dashZ === 0) dashZ = -1; // Default fwd

                // Air Dodge specific adjustments
                const force = isInAir ? DASH_FORCE * 0.85 : DASH_FORCE;
                const verticalBoost = isInAir ? 5 : 0; // Slight lift in air

                api.applyImpulse([dashX * force, verticalBoost, dashZ * force], [0, 0, 0]);
                
                // Invincibility during dodge (Skill Ceiling)
                setInvincible(true);
                setTimeout(() => setInvincible(false), isInAir ? 400 : 200);

                audio.playJump();
                if (!isInAir) onImpact?.(5); // Ground dash impact
                
                lastDashTime.current = now;
                inputState.current.dashPressed = false;

                // Visual "Whoosh" effect could go here
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 100);
            }
            // LOADOUT USAGE (1, 2, 3)
            if (inputState.current.loadout1Pressed) {
                inputState.current.loadout1Pressed = false;
                onUseLoadoutItem?.(0);
            }
            if (inputState.current.loadout2Pressed) {
                inputState.current.loadout2Pressed = false;
                onUseLoadoutItem?.(1);
            }
            if (inputState.current.loadout3Pressed) {
                inputState.current.loadout3Pressed = false;
                onUseLoadoutItem?.(2);
            }

            // JUMP / MAP ITEM (Space)
            if (spacePressed) {
                inputState.current.spacePressed = false;
                if (powerup && powerup.type !== 'buff') {
                    onUseItem?.();
                } else if (now - inputState.current.lastJumpTime > 600) {
                    api.applyImpulse([0, 14, 0], [0, 0, 0]);
                    inputState.current.lastJumpTime = now;
                    audio.playJump();
                }
            }

            // REPORT INPUT TO SERVER (Every frame, simple throttled intent)
            if (onInput) {
                onInput({
                    moveX: forceX,
                    moveZ: forceZ,
                    jump: spacePressed,
                    dash: dashPressed,
                    timestamp: Date.now()
                });
            }

            // RECONCILIATION: Check if local prediction differs from server authority
            if (remotePosition) {
                const dist = new THREE.Vector3(...position.current).distanceTo(new THREE.Vector3(...remotePosition));
                if (dist > 1.5) {
                    // Critical de-sync: snap
                    api.position.set(...remotePosition);
                } else if (dist > 0.1) {
                    // Minor drift: nudge physics body toward server reality
                    const error = [
                        (remotePosition[0] - position.current[0]) * 5,
                        (remotePosition[1] - position.current[1]) * 5,
                        (remotePosition[2] - position.current[2]) * 5
                    ];
                    api.applyForce(error, [0, 0, 0]);
                }
            }
        }

        // --- BOT AI LOGIC ---
        else if (isBot) {
            // Find target (closest player)
            let closestDist = Infinity;
            let targetPos = null;

            Object.entries(allPlayerPositions).forEach(([pid, pos]) => {
                if (pid === playerId) return; // Self
                const dist = new THREE.Vector3(...pos).distanceTo(new THREE.Vector3(...position.current));
                if (dist < closestDist) {
                    closestDist = dist;
                    targetPos = pos;
                }
            });

            if (targetPos) {
                const dir = new THREE.Vector3(targetPos[0] - position.current[0], 0, targetPos[2] - position.current[2]).normalize();
                const aiForce = config.acceleration * 0.8; // Bots are slightly slower
                api.applyForce([dir.x * aiForce, 0, dir.z * aiForce], [0, 0, 0]);

                // Bot Jump randomly if stuck or near edge?
                if (Math.random() < 0.005) {
                    api.applyImpulse([0, 12, 0], [0, 0, 0]);
                }
            }
        }


    });

    // ========== EXPLOSION HANDLING ==========
    const lastExplosionTime = useRef(0);
    useEffect(() => {
        if (!explosionEvent || !isLocalPlayer || explosionEvent.timestamp <= lastExplosionTime.current) return;

        const { position: expPos, force } = explosionEvent;
        const myPos = position.current;
        const dist = new THREE.Vector3(myPos[0] - expPos[0], myPos[1] - expPos[1], myPos[2] - expPos[2]).length();

        if (dist < 30) { // Blast radius
            const dir = new THREE.Vector3(myPos[0] - expPos[0], myPos[1] - expPos[1] + 5, myPos[2] - expPos[2]).normalize();
            const power = force * (1 - dist / 30);
            api.applyImpulse([dir.x * power, dir.y * power, dir.z * power], [0, 0, 0]);
            audio.playImpact(10); // Reuse impact sound
            onImpact?.(20); // Massive shake
        }

        lastExplosionTime.current = explosionEvent.timestamp;
    }, [explosionEvent, isLocalPlayer, api, onImpact]);

    // ========== REMOTE PLAYER SYNC (SMOOTH INTERPOLATION) ==========
    useEffect(() => {
        // Skip sync for bots so they can use full physics
        if (!isLocalPlayer && !isBot && remotePosition) {
            // Check distance to see if we should snap or slide
            const dist = new THREE.Vector3(...position.current).distanceTo(new THREE.Vector3(...remotePosition));
            if (dist > 3) {
                api.position.set(...remotePosition);
            } else {
                // Apply a correcting impulse instead of a hard set for smooth movement
                const nudge = [
                    (remotePosition[0] - position.current[0]) * 10,
                    (remotePosition[1] - position.current[1]) * 10,
                    (remotePosition[2] - position.current[2]) * 10
                ];
                api.applyForce(nudge, [0, 0, 0]);
            }
        }
        if (!isLocalPlayer && !isBot && remoteVelocity) {
            // Lerp velocity for smoother transitions
            api.velocity.set(
                remoteVelocity[0] * 0.8 + velocity.current[0] * 0.2,
                remoteVelocity[1] * 0.8 + velocity.current[1] * 0.2,
                remoteVelocity[2] * 0.8 + velocity.current[2] * 0.2
            );
        }
    }, [api, isLocalPlayer, isBot, remotePosition, remoteVelocity]);

    // ========== GAME LOGIC FRAME UPDATE ==========
    useFrame((state) => {
        if (isPaused) return;

        // Flash when invincible
        if (invincible && ref.current) {
            ref.current.visible = Math.floor(state.clock.elapsedTime * 10) % 2 === 0;
        } else if (ref.current && !isRespawning) {
            ref.current.visible = true; // Ensure visibility resets
        }

        // Track airborne state
        const currentlyAirborne = position.current[1] > 1;
        setIsAirborne(currentlyAirborne);

        // AIR STOMP DETECTION
        if (isLocalPlayer && currentlyAirborne && velocity.current[1] < -4 && !invincible) {
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

        // Position update for local player AND offline bots
        if (isLocalPlayer || isBot) {
            onPositionUpdate?.(playerId, position.current, velocity.current);

            // Knockout check
            if (!isRespawning) {
                if (isInKnockoutZone(position.current)) {
                    handleKnockout();
                } else if (position.current[1] < -4) {
                    // Quick death for pits (Y < -4)
                    handleKnockout();
                }
            }
        }
    });

    // ========== KNOCKOUT HANDLER ==========
    const handleKnockout = useCallback(() => {
        setIsRespawning(true);
        onKnockout?.(playerId, lastHitBy.current);
        audio.playKnockout();

        setTimeout(() => {
            api.position.set(...startPosition);
            api.velocity.set(0, 0, 0);
            api.angularVelocity.set(0, 0, 0);
            trailPositions.current = [];
            setIsRespawning(false);

            // Invincibility phase
            setInvincible(true);
            setTimeout(() => setInvincible(false), 3000);
        }, 1500);
    }, [api, onKnockout, playerId, startPosition]);

    // ========== VISUAL STATE ==========
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

    // Initialize shader ref
    const shaderRef = useRef();

    // Symbiote Shader uniforms tracking
    const symbioteRefMain = useRef();
    const symbioteRefPlates = useRef();
    const symbioteRefTop = useRef();

    // Symbiote Telemetry state
    const idleTimer = useRef(0);

    const isEvolvingSymbiote = tier === 999 || (iconPath && iconPath.includes('symbiote'));

    useFrame((state, delta) => {
        if (shaderRef.current) {
            shaderRef.current.time = state.clock.elapsedTime;
        }

        // Update Symbiote Telemetry
        if (isEvolvingSymbiote) {
            // Speed telemetry
            const currentSpeed = Math.min(speed / 15.0, 1.0); // Normalize speed 0-1

            // Idle telemetry
            if (currentSpeed < 0.1) {
                idleTimer.current += delta;
            } else {
                idleTimer.current = Math.max(0, idleTimer.current - delta * 5.0); // Recover fast
            }
            const currentIdleFactor = Math.min(idleTimer.current / 5.0, 1.0); // 5 seconds to full rust

            // Mock KPM growth - use damage as a proxy for aggressiveness
            const currentKpm = Math.min(damage / 100.0 * 3.0, 3.0);

            // Apply to all symbiote materials
            const updateSymbiote = (ref) => {
                if (ref.current) {
                    ref.current.time = state.clock.elapsedTime;
                    ref.current.speed = currentSpeed;
                    ref.current.idleFactor = currentIdleFactor;
                    ref.current.kpm = currentKpm;

                    // Map player's damage to their active "streak" heat
                    ref.current.winStreak = Math.min(damage / 50.0, 3.0);
                }
            };

            updateSymbiote(symbioteRefMain);
            updateSymbiote(symbioteRefPlates);
            updateSymbiote(symbioteRefTop);
        }
    });

    // Load Texture safely
    const iconTexture = useTexture(iconPath || '/images/logo.png');

    if (isInvisible) return null;

    // Determine Material Type
    const isDivine = tier === 10;
    const isCosmic = tier === 9;
    const isLegendary = tier >= 6 && tier < 9;
    const isMystery = iconPath && iconPath.includes('icon_150');

    // Accent colors — Dual neon grooves (Cyan + Magenta)
    const accentCyan = '#00d4ff';
    const accentMagenta = '#c840ff';
    
    // [NEW] Dynamic Chassis Logic
    const skinColor = new THREE.Color(color);
    const goldColor = '#c9952b';
    const goldDark = '#8b6914';
    
    // Choose base material color based on tier
    // Standard/Common (0-1) use skin color
    // Uncommon/Rare (2-3) use skin color with metallic sheen
    // Epic+ (4+) blend with gold/premium materials
    const chassisColor = tier >= 4 ? goldColor : color;
    const dome = 0.12;

    // Final Puck Mesh Parts
    const bodyRadius = config.radius;
    const bodyHeight = 0.32;

    // Channel groove angles — 5-fold symmetry like the reference sculpture
    const channelAngles = [0, 72, 144, 216, 288];
    const plateArcSpan = (2 * Math.PI / 5) - 0.12;

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

            {/* ========== SCULPTURAL PUCK MODEL ========== */}
            <group ref={ref} visible={!isRespawning} scale={[puckScale, puckScale, puckScale]}>

                {/* 0. Inner Core — emissive bleed through channel gaps */}
                <mesh>
                    <cylinderGeometry args={[bodyRadius * 0.9, bodyRadius * 0.9, bodyHeight * 0.8, 32]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={2.5}
                        toneMapped={false}
                    />
                </mesh>

                {/* 1. Main Chassis Body — Domed gold disc */}
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[bodyRadius, bodyRadius * 0.95, bodyHeight, 32]} />
                    {isEvolvingSymbiote ? (
                        <symbioteMaterial ref={symbioteRefMain} />
                    ) : (
                        <meshPhysicalMaterial
                            color={isFlashing ? '#ffffff' : chassisColor}
                            metalness={tier >= 2 ? 0.9 : 0.6}
                            roughness={tier >= 4 ? 0.1 : 0.4}
                            clearcoat={tier >= 3 ? 1 : 0}
                            clearcoatRoughness={0.1}
                            emissive={isFlashing ? '#ffffff' : skinColor}
                            emissiveIntensity={isFlashing ? 1 : (tier >= 4 ? 0.2 : 0.05)}
                        />
                    )}
                </mesh>

                {/* 2. Deep recessed channel grooves — dark with neon glow inside */}
                {channelAngles.map((deg, idx) => {
                    const rad = deg * Math.PI / 180;
                    const len = bodyRadius * 1.15;
                    return (
                        <group key={`ch-${idx}`}>
                            {/* Dark channel body */}
                            <mesh
                                position={[Math.sin(rad) * len / 2, dome * 0.15, Math.cos(rad) * len / 2]}
                                rotation={[0, -rad, 0]}
                                castShadow
                            >
                                <boxGeometry args={[0.035, bodyHeight * 1.1 + dome * 0.5, len]} />
                                <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.3} />
                            </mesh>
                            {/* Neon glow strip inside channel — alternating cyan/magenta */}
                            <mesh
                                position={[Math.sin(rad) * len / 2, dome * 0.05, Math.cos(rad) * len / 2]}
                                rotation={[0, -rad, 0]}
                            >
                                <boxGeometry args={[0.018, bodyHeight * 0.5, len * 0.92]} />
                                <meshStandardMaterial
                                    color={idx % 2 === 0 ? color : (isDivine ? '#fff' : accentMagenta)}
                                    emissive={idx % 2 === 0 ? color : (isDivine ? '#fff' : accentMagenta)}
                                    emissiveIntensity={tier >= 3 ? 3 : 1.5}
                                    toneMapped={false}
                                />
                            </mesh>
                        </group>
                    );
                })}

                {/* 3. Tiered Armor Plates (5-fold) — 3 layers of relief */}
                {channelAngles.map((deg, i) => {
                    const startAngle = (i * 2 * Math.PI / 5) + 0.06;
                    return (
                        <group key={`plate-${i}`}>
                            {/* Outer raised plate — sits on the chassis */}
                            <mesh position={[0, bodyHeight / 2 - 0.03 + dome * 0.3, 0]} castShadow>
                                <cylinderGeometry
                                    args={[bodyRadius * 1.04, bodyRadius * 1.04, 0.06, 24, 1, false, startAngle, plateArcSpan]}
                                />
                                {isEvolvingSymbiote ? (
                                    <symbioteMaterial ref={symbioteRefPlates} />
                                ) : (
                                    <meshStandardMaterial
                                        color={isFlashing ? '#fff' : goldDark}
                                        metalness={0.92}
                                        roughness={0.25}
                                        emissive={color}
                                        emissiveIntensity={isFlashing ? 1 : 0.02}
                                    />
                                )}
                            </mesh>
                            {/* Inner tiered ring — creates the stepped bevel */}
                            <mesh position={[0, bodyHeight / 2 + dome * 0.35, 0]} castShadow>
                                <cylinderGeometry
                                    args={[bodyRadius * 0.72, bodyRadius * 0.72, 0.078, 20, 1, false, startAngle + 0.05, plateArcSpan - 0.1]}
                                />
                                <meshStandardMaterial
                                    color={isFlashing ? '#fff' : (tier >= 4 ? goldColor : color)}
                                    metalness={tier >= 2 ? 0.95 : 0.5}
                                    roughness={tier >= 6 ? 0.1 : 0.4}
                                />
                            </mesh>
                            {/* Top surface plateau — highest tier */}
                            <mesh position={[0, bodyHeight / 2 + dome * 0.55, 0]} castShadow>
                                <cylinderGeometry
                                    args={[bodyRadius * 0.88, bodyRadius * 0.72, 0.03, 20, 1, false, startAngle + 0.03, plateArcSpan - 0.06]}
                                />
                                <meshStandardMaterial
                                    color={isFlashing ? '#fff' : (tier >= 6 ? goldColor : color)}
                                    metalness={tier >= 2 ? 0.95 : 0.5}
                                    roughness={tier >= 6 ? 0.1 : 0.4}
                                />
                            </mesh>
                            {/* Side armor skirt — thick barrel wall plates */}
                            <mesh castShadow>
                                <cylinderGeometry
                                    args={[bodyRadius * 1.07, bodyRadius * 1.07, bodyHeight * 0.65, 20, 1, false, startAngle + 0.02, plateArcSpan - 0.04]}
                                />
                                <meshStandardMaterial
                                    color={isFlashing ? '#fff' : goldDark}
                                    metalness={0.92}
                                    roughness={0.2}
                                />
                            </mesh>
                        </group>
                    );
                })}

                {/* 4. Equator neon rings */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 1.08, 0.012, 8, 64]} />
                    <meshBasicMaterial color={accentCyan} toneMapped={false} />
                </mesh>
                <mesh position={[0, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 1.075, 0.008, 8, 64]} />
                    <meshBasicMaterial color={accentMagenta} toneMapped={false} />
                </mesh>

                {/* 5. Top & Bottom rim bands */}
                <mesh position={[0, bodyHeight / 2 - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 1.01, 0.025, 12, 64]} />
                    <meshStandardMaterial color={goldDark} metalness={0.92} roughness={0.15} />
                </mesh>
                <mesh position={[0, -bodyHeight / 2 + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 1.01, 0.025, 12, 64]} />
                    <meshStandardMaterial color={goldDark} metalness={0.92} roughness={0.15} />
                </mesh>

                {/* 6. Central Emblem Socket — recessed disc with glow border */}
                <mesh position={[0, bodyHeight / 2 + dome * 0.92, 0]} castShadow>
                    <cylinderGeometry args={[bodyRadius * 0.28, bodyRadius * 0.28, 0.02, 32]} />
                    <meshStandardMaterial color={goldColor} metalness={0.98} roughness={0.08} />
                </mesh>
                <mesh position={[0, bodyHeight / 2 + dome * 0.88, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 0.3, 0.018, 8, 32]} />
                    <meshStandardMaterial color={goldDark} metalness={0.92} roughness={0.15} />
                </mesh>
                <mesh position={[0, bodyHeight / 2 + dome * 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 0.32, 0.008, 8, 32]} />
                    <meshStandardMaterial color={accentCyan} emissive={accentCyan} emissiveIntensity={2} toneMapped={false} />
                </mesh>
                {/* Outer octagonal frame */}
                <mesh position={[0, bodyHeight / 2 + dome * 0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[bodyRadius * 0.42, 0.015, 8, 8]} />
                    <meshStandardMaterial color={goldColor} metalness={0.95} roughness={0.1} />
                </mesh>

                {/* 7. Top Face — Icon Surface */}
                <group position={[0, bodyHeight / 2 + dome * 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    {/* The Icon Surface */}
                    <mesh position={[0, 0, 0.01]}>
                        <circleGeometry args={[bodyRadius * 0.55, 32]} />
                        {isMystery ? (
                            <mysteryMaterial ref={shaderRef} map={iconTexture} transparent />
                        ) : isEvolvingSymbiote ? (
                            <symbioteMaterial ref={symbioteRefTop} map={iconTexture} transparent />
                        ) : isDivine ? (
                            <divineMaterial ref={shaderRef} map={iconTexture} transparent />
                        ) : isCosmic ? (
                            <cosmicMaterial ref={shaderRef} map={iconTexture} transparent />
                        ) : isLegendary ? (
                            <legendaryMaterial
                                ref={shaderRef}
                                map={iconTexture}
                                color={new THREE.Color(color)}
                                transparent
                            />
                        ) : (
                            <meshStandardMaterial
                                map={iconTexture}
                                transparent={isGhost}
                                opacity={isGhost ? 0.4 : 1}
                                metalness={0.5}
                                roughness={0.3}
                            />
                        )}
                    </mesh>
                </group>

                {/* 8. Bolt heads on plates */}
                {channelAngles.map((deg, i) => {
                    const midAngle = (i * 2 * Math.PI / 5) + Math.PI / 5;
                    return (
                        <group key={`bolt-${i}`}>
                            <mesh
                                position={[Math.sin(midAngle) * bodyRadius * 0.85, bodyHeight / 2 + dome * 0.55, Math.cos(midAngle) * bodyRadius * 0.85]}
                                castShadow
                            >
                                <cylinderGeometry args={[0.02, 0.02, 0.025, 6]} />
                                <meshStandardMaterial color="#444" metalness={0.95} roughness={0.05} />
                            </mesh>
                            {/* Vent slits on barrel */}
                            <mesh
                                position={[Math.sin(midAngle) * bodyRadius * 1.06, bodyHeight * 0.1, Math.cos(midAngle) * bodyRadius * 1.06]}
                                rotation={[0, -midAngle, 0]}
                            >
                                <boxGeometry args={[0.08, 0.015, 0.008]} />
                                <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.3} />
                            </mesh>
                            <mesh
                                position={[Math.sin(midAngle) * bodyRadius * 1.06, -bodyHeight * 0.08, Math.cos(midAngle) * bodyRadius * 1.06]}
                                rotation={[0, -midAngle, 0]}
                            >
                                <boxGeometry args={[0.08, 0.015, 0.008]} />
                                <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.3} />
                            </mesh>
                        </group>
                    );
                })}

                {/* 9. Bottom Face — Dark mirror with color glow */}
                <mesh position={[0, -bodyHeight / 2 - 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[bodyRadius * 0.9, 32]} />
                    <meshStandardMaterial
                        color="#111111"
                        metalness={0.9}
                        roughness={0.1}
                        emissive={color}
                        emissiveIntensity={0.15}
                    />
                </mesh>
            </group>

            {/* Player Name / Damage Tag */}
            {!isGhost && (
                <Html position={[0, 1.2 * puckScale, 0]} center style={{ pointerEvents: 'none', transition: 'all 0.1s' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(0,0,0,0.6)', padding: '4px 10px',
                        borderRadius: '20px', border: `1px solid ${color}`,
                        backdropFilter: 'blur(4px)', fontFamily: '"Orbitron", sans-serif',
                        whiteSpace: 'nowrap', transform: 'scale(0.8)'
                    }}>
                        {iconPath && (
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '50%',
                                backgroundImage: `url(${iconPath})`, backgroundSize: 'cover',
                                border: `2px solid ${color}`
                            }} />
                        )}
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textShadow: `0 0 5px ${color}` }}>
                            {playerName}
                        </span>
                        <span style={{
                            color: damage >= 100 ? '#ff3333' : '#fff',
                            fontWeight: 900, fontSize: '14px', marginLeft: '4px'
                        }}>
                            {damage}%
                        </span>
                    </div>
                </Html>
            )}

            {isStunned && <StunEffect position={[0, 1.2, 0]} active={isStunned} />}
            {parryEvent && <ParryEffect position={[0, 0, 0]} active={true} />}
            {/* Hit Feedback Sparks */}
            <CollisionSparks sparks={sparkEvents} />
        </group>
    );
}

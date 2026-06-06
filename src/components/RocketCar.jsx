import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { ROCKET_PHYSICS } from '../utils/rocketPhysics';
import * as THREE from 'three';

// ============================================
// CAR CHASSIS - Visual body
// ============================================
function CarChassis({ color, boostActive, isJumping }) {
    const bodyRef = useRef();
    const glowColor = color;
    const halfLen = ROCKET_PHYSICS.car.hitbox[2] / 2;
    const halfWid = ROCKET_PHYSICS.car.hitbox[0] / 2;

    useFrame((state) => {
        if (bodyRef.current && boostActive) {
            // Boost flame glow pulse
            const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 20) * 0.2;
            bodyRef.current.material.emissiveIntensity = pulse * 0.5;
        } else if (bodyRef.current) {
            bodyRef.current.material.emissiveIntensity = 0.05;
        }
    });

    return (
        <group>
            {/* Main body */}
            <mesh ref={bodyRef} castShadow>
                <boxGeometry args={ROCKET_PHYSICS.car.hitbox} />
                <meshPhysicalMaterial
                    color={color}
                    metalness={0.8}
                    roughness={0.15}
                    emissive={color}
                    emissiveIntensity={0.05}
                    envMapIntensity={2.5}
                    clearcoat={0.3}
                />
            </mesh>
            {/* Cabin/windscreen */}
            <mesh position={[0, 0.15, -halfLen * 0.3]}>
                <boxGeometry args={[halfWid * 0.8, 0.15, halfLen * 0.4]} />
                <meshPhysicalMaterial
                    color="#1a1a2e"
                    metalness={0.9}
                    roughness={0.05}
                    transparent
                    opacity={0.7}
                    envMapIntensity={3}
                />
            </mesh>
            {/* Boost exhaust */}
            {boostActive && <BoostFlame position={[0, -0.05, -halfLen]} />}
        </group>
    );
}

function BoostFlame({ position }) {
    const flameRef = useRef();
    useFrame((state) => {
        if (flameRef.current) {
            const scaleZ = 0.5 + Math.sin(state.clock.elapsedTime * 30) * 0.3;
            flameRef.current.scale.z = scaleZ;
            flameRef.current.material.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 25) * 0.2;
        }
    });

    return (
        <group ref={flameRef} position={position}>
            {/* Outer flame */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.15, 0.6, 8]} />
                <meshBasicMaterial color="#ff6600" transparent opacity={0.6} />
            </mesh>
            {/* Inner flame */}
            <mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.08, 0.4, 8]} />
                <meshBasicMaterial color="#ffff00" transparent opacity={0.8} />
            </mesh>
        </group>
    );
}

// ============================================
// WHEELS
// ============================================
function Wheels({ position, grounded }) {
    const wheelRadius = ROCKET_PHYSICS.car.wheelRadius;
    const halfLen = ROCKET_PHYSICS.car.hitbox[2] / 2;
    const halfWid = ROCKET_PHYSICS.car.hitbox[0] / 2;

    const wheelPositions = [
        [halfWid + 0.1, -0.2, halfLen * 0.8],     // Front Right
        [-halfWid - 0.1, -0.2, halfLen * 0.8],     // Front Left
        [halfWid + 0.1, -0.2, -halfLen * 0.8],     // Rear Right
        [-halfWid - 0.1, -0.2, -halfLen * 0.8],    // Rear Left
    ];

    return wheelPositions.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius, wheelRadius, 0.08, 12]} />
            <meshPhysicalMaterial
                color="#1a1a1a"
                metalness={0.3}
                roughness={0.8}
            />
            {/* Rim */}
            <mesh position={[0, 0, 0.05]}>
                <cylinderGeometry args={[wheelRadius * 0.5, wheelRadius * 0.5, 0.09, 8]} />
                <meshPhysicalMaterial color="#333" metalness={0.9} roughness={0.1} />
            </mesh>
        </mesh>
    ));
}

// ============================================
// MAIN CAR COMPONENT
// ============================================
export default function RocketCar({
    playerId,
    color = '#00d4ff',
    startPosition = [0, 1, 0],
    isLocalPlayer = false,
    isBot = false,
    onPositionUpdate,
    onBoostCollect,
    onGoalScored,
}) {
    const config = ROCKET_PHYSICS.car;
    const [boost, setBoost] = useState(config.boostCapacity);
    const [boostActive, setBoostActive] = useState(false);
    const [isJumping, setIsJumping] = useState(false);
    const [grounded, setGrounded] = useState(true);
    const [jumpCount, setJumpCount] = useState(0);
    const lastJumpTime = useRef(0);
    const velocity = useRef([0, 0, 0]);
    const position = useRef(startPosition);
    const carRotation = useRef(0);

    // Physics body
    const [ref, api] = useBox(() => ({
        mass: config.mass,
        position: startPosition,
        args: config.hitbox,
        linearDamping: config.groundFriction,
        angularDamping: 0.4,
        material: {
            friction: 0.4,
            restitution: config.bounciness,
        },
        userData: { playerId, type: 'car' },
        onCollide: (e) => {
            if (e.body?.userData?.type === 'ball') {
                // Ball hit - amplify impulse for satisfying hits
                const hitForce = Math.max(
                    Math.abs(velocity.current[0]),
                    Math.abs(velocity.current[2])
                );
                if (hitForce > 5) {
                    onGoalScored?.(hitForce);
                }
            }
        },
    }));

    // Subscribe to physics
    useEffect(() => {
        const unsubVel = api.velocity.subscribe((v) => { velocity.current = v; });
        const unsubPos = api.position.subscribe((p) => { position.current = p; });
        return () => { unsubVel(); unsubPos(); };
    }, [api]);

    // Input state
    const inputRef = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        boost: false,
        jumpPressed: false,
        jumpHeld: false,
    });

    // Keyboard input
    useEffect(() => {
        if (!isLocalPlayer) return;

        const handleKeyDown = (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': inputRef.current.forward = true; break;
                case 'KeyS': case 'ArrowDown': inputRef.current.backward = true; break;
                case 'KeyA': case 'ArrowLeft': inputRef.current.left = true; break;
                case 'KeyD': case 'ArrowRight': inputRef.current.right = true; break;
                case 'ShiftLeft': case 'ShiftRight': inputRef.current.boost = true; break;
                case 'Space':
                    if (!inputRef.current.jumpHeld) {
                        inputRef.current.jumpPressed = true;
                        inputRef.current.jumpHeld = true;
                    }
                    break;
            }
        };

        const handleKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': inputRef.current.forward = false; break;
                case 'KeyS': case 'ArrowDown': inputRef.current.backward = false; break;
                case 'KeyA': case 'ArrowLeft': inputRef.current.left = false; break;
                case 'KeyD': case 'ArrowRight': inputRef.current.right = false; break;
                case 'ShiftLeft': case 'ShiftRight': inputRef.current.boost = false; break;
                case 'Space': inputRef.current.jumpHeld = false; break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isLocalPlayer]);

    // Boost management
    useEffect(() => {
        if (!isLocalPlayer) return;
        const interval = setInterval(() => {
            if (boostActive && boost > 0) {
                setBoost(prev => Math.max(0, prev - config.boostConsumption / 60));
            } else if (grounded && boost < config.boostCapacity) {
                setBoost(prev => Math.min(config.boostCapacity, prev + config.boostRecharge / 60));
            }
        }, 1000 / 60);
        return () => clearInterval(interval);
    }, [isLocalPlayer, boostActive, boost, grounded, config]);

    // Grounded detection
    useFrame(() => {
        const onGround = position.current[1] < 0.5;
        setGrounded(onGround);
        if (onGround) {
            setJumpCount(0);
            setIsJumping(false);
        } else {
            setIsJumping(true);
        }
    });

    // Physics update loop
    useFrame((_, delta) => {
        if (!isLocalPlayer) return;

        const input = inputRef.current;
        const dt = Math.min(delta, 0.05);
        const forward = input.forward ? 1 : input.backward ? -1 : 0;
        const turn = input.left ? 1 : input.right ? -1 : 0;
        const hasBoost = boost > 0 && input.boost;

        // Boost
        setBoostActive(hasBoost && forward > 0);
        const accel = hasBoost ? config.boostAcceleration : config.acceleration;
        const maxSpeed = hasBoost ? config.boostMaxSpeed : config.maxSpeed;

        if (grounded) {
            // Ground movement
            if (forward !== 0) {
                const currentSpeed = Math.sqrt(
                    velocity.current[0] ** 2 + velocity.current[2] ** 2
                );
                if (currentSpeed < maxSpeed) {
                    const rot = carRotation.current;
                    const fwdX = Math.sin(rot) * forward * accel * dt;
                    const fwdZ = Math.cos(rot) * forward * accel * dt;
                    api.applyForce([fwdX * config.mass, 0, fwdZ * config.mass], [0, 0, 0]);
                }
            }

            // Turning
            if (turn !== 0) {
                const turnSpeed = config.turnSpeed * (1 - Math.abs(forward) * 0.5);
                carRotation.current += turn * turnSpeed * dt;
                api.angularVelocity.set(0, turn * turnSpeed, 0);
            }

            // Jump
            if (input.jumpPressed) {
                input.jumpPressed = false;
                if (jumpCount === 0) {
                    api.applyImpulse([0, config.jumpForce * config.mass, 0], [0, 0, 0]);
                    setJumpCount(1);
                    lastJumpTime.current = Date.now();
                }
            }
        } else {
            // Aerial controls
            if (hasBoost && forward > 0) {
                const rot = carRotation.current;
                const boostX = Math.sin(rot) * config.aerialAcceleration * dt;
                const boostZ = Math.cos(rot) * config.aerialAcceleration * dt;
                api.applyForce([boostX * config.mass, config.aerialAcceleration * dt * 0.5, boostZ * config.mass], [0, 0, 0]);
            }

            // Air roll
            if (turn !== 0) {
                api.angularVelocity.set(0, turn * config.airRollSpeed, 0);
            }

            // Double jump / flip
            if (input.jumpPressed && jumpCount === 1) {
                input.jumpPressed = false;
                if (Date.now() - lastJumpTime.current < 1500) {
                    const rot = carRotation.current;
                    api.applyImpulse([
                        Math.sin(rot) * config.flipForce * config.mass,
                        config.doubleJumpForce * config.mass * 0.3,
                        Math.cos(rot) * config.flipForce * config.mass,
                    ], [0, 0, 0]);
                    setJumpCount(2);
                }
            }
        }

        // Position update
        onPositionUpdate?.(playerId, position.current, velocity.current);
    });

    return (
        <group ref={ref}>
            {/* Visual group with rotation */}
            <group rotation={[0, carRotation.current, 0]}>
                <CarChassis color={color} boostActive={boostActive} isJumping={isJumping} />
                <Wheels grounded={grounded} />
            </group>
        </group>
    );
}
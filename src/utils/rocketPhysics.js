/**
 * Rocket League Physics Configuration
 * Car soccer physics tuned for AAA feel
 */

export const ROCKET_PHYSICS = {
    // ============ CAR PHYSICS ============
    car: {
        mass: 1.8,
        acceleration: 55,         // Ground acceleration
        maxSpeed: 42,             // Max forward speed
        maxReverseSpeed: 20,      // Max reverse speed
        boostAcceleration: 85,    // Acceleration with boost
        boostMaxSpeed: 62,        // Max boost speed
        boostCapacity: 100,       // Max boost units
        boostConsumption: 12,     // Per second while boosting
        boostRecharge: 20,        // Per second while on ground
        boostRechargeDelay: 0.5,  // Seconds before recharge starts

        // Aerial controls
        aerialAcceleration: 35,
        aerialMaxSpeed: 40,
        aerialBoostConsumption: 25, // Faster boost drain in air

        // Jump
        jumpForce: 14,
        doubleJumpForce: 11,
        jumpTimeout: 1.5,         // Seconds before double jump window closes
        flipForce: 18,            // Dodge/flip impulse
        flipTimeout: 0.3,         // Time window for flip after dodge

        // Turning
        turnSpeed: 4.5,           // Ground turn rate
        aerialTurnSpeed: 3.0,     // Aerial turn rate
        airRollSpeed: 3.5,        // Air roll rotation speed

        // Friction
        groundFriction: 0.08,
        aerialFriction: 0.02,

        // Suspension
        suspensionStiffness: 0.6,
        suspensionDamping: 0.3,
        suspensionRestLength: 0.3,
        wheelRadius: 0.15,

        // Collision
        bounciness: 0.5,
        hitbox: [0.8, 0.4, 1.0],  // Width, Height, Length
    },

    // ============ BALL PHYSICS ============
    ball: {
        mass: 1.0,
        radius: 0.8,
        bounciness: 0.75,
        friction: 0.015,
        linearDamping: 0.01,
        angularDamping: 0.3,
        maxSpeed: 80,
        gravity: [0, -40, 0],
    },

    // ============ FIELD ============
    field: {
        length: 60,               // Total field length (Z axis)
        width: 40,                // Total field width (X axis)
        wallHeight: 8,            // Height of walls
        ceilingHeight: 12,        // Height above which is "out of play"
        goalWidth: 4,            // Width of goal opening
        goalHeight: 3,           // Height of goal opening
        goalDepth: 2,            // Depth of goal net
        wallThickness: 0.5,

        // Lines
        centerLine: true,
        goalBoxSize: [4, 1, 3],   // X, Y, Z dimensions of goal box marker

        // Boost pads
        boostPads: {
            smallCount: 18,        // Number of small boost pads
            smallBoost: 12,        // Boost units from small pad
            largeCount: 6,         // Number of large boost pads
            largeBoost: 100,       // Full boost from large pad
            respawnTime: 10,       // Seconds for small pad respawn
            largeRespawnTime: 30,  // Seconds for large pad respawn
        }
    },

    // ============ GOAL DETECTION ============
    goal: {
        // The goal zones are at z = ±field.length/2
        // Detection box offset from center
        detectionMargin: 0.5,
    },

    // ============ CAMERA ============
    camera: {
        distance: 8,
        height: 3.5,
        angle: -12,               // Degrees below horizontal
        stiffness: 0.6,           // Camera follow stiffness
        swivelSpeed: 3.5,
        fov: 80,
        ballOffset: 0.3,          // How much the camera looks toward ball
    }
};

/**
 * Calculate ball trajectory prediction line
 */
export function predictBallTrajectory(ballPos, ballVel, maxBounces = 2) {
    const positions = [ballPos];
    let pos = [...ballPos];
    let vel = [...ballVel];
    const dt = 0.1;
    const gravity = ROCKET_PHYSICS.ball.gravity[1];
    const field = ROCKET_PHYSICS.field;
    const halfLength = field.length / 2;
    const halfWidth = field.width / 2;
    const wallHeight = field.wallHeight;

    for (let i = 0; i < 50 && maxBounces >= 0; i++) {
        vel[1] += gravity * dt;
        pos[0] += vel[0] * dt;
        pos[1] += vel[1] * dt;
        pos[2] += vel[2] * dt;

        // Wall bounces
        if (Math.abs(pos[0]) > halfWidth) {
            pos[0] = Math.sign(pos[0]) * halfWidth;
            vel[0] *= -0.75;
            maxBounces--;
        }
        if (Math.abs(pos[2]) > halfLength) {
            pos[2] = Math.sign(pos[2]) * halfLength;
            vel[2] *= -0.75;
            maxBounces--;
        }
        // Floor/ceiling bounce
        if (pos[1] < 0) {
            pos[1] = 0;
            vel[1] *= -0.7;
            maxBounces--;
        }
        if (pos[1] > wallHeight) {
            pos[1] = wallHeight;
            vel[1] *= -0.7;
            maxBounces--;
        }

        positions.push([...pos]);
        if (positions.length > 60) break;
    }

    return positions;
}

/**
 * Detect if ball is in a goal zone
 * Returns 'blue' | 'orange' | null
 */
export function checkGoal(ballPos, fieldLength) {
    if (!ballPos) return null;
    const halfLength = fieldLength / 2;
    const goal = ROCKET_PHYSICS.field.goalWidth / 2;
    const goalHeight = ROCKET_PHYSICS.field.goalHeight;

    // Check if ball passed through goal plane
    if (ballPos[1] > goalHeight) return null;
    if (Math.abs(ballPos[0]) > goal) return null;

    // Ball crossed the goal line
    if (ballPos[2] > halfLength + 0.5) return 'blue';  // Scored on blue side (orange scores)
    if (ballPos[2] < -halfLength - 0.5) return 'orange'; // Scored on orange side (blue scores)

    return null;
}
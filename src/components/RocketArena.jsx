import React, { useState, useCallback, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Stars, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, ToneMapping } from '@react-three/postprocessing';
import RocketStadium from './RocketStadium';
import RocketCar from './RocketCar';
import RocketBall from './RocketBall';
import { ROCKET_PHYSICS } from '../utils/rocketPhysics';

// ============================================
// SCOREBOARD HUD
// ============================================
function Scoreboard({ blueScore, orangeScore, timer, boost, speed }) {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 100,
            fontFamily: "'Orbitron', sans-serif",
        }}>
            {/* Score bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2rem',
                background: 'rgba(0,0,0,0.6)',
                padding: '0.5rem 2rem',
                borderRadius: '0 0 12px 12px',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                marginTop: '0',
            }}>
                {/* Blue score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#0044ff', boxShadow: '0 0 10px #0044ff' }} />
                    <span style={{ color: '#4488ff', fontSize: '2rem', fontWeight: 'bold' }}>{blueScore}</span>
                </div>

                {/* Timer */}
                <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.3rem 1rem',
                    borderRadius: 8,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                }}>
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>

                {/* Orange score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#ff8800', fontSize: '2rem', fontWeight: 'bold' }}>{orangeScore}</span>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff8800', boxShadow: '0 0 10px #ff8800' }} />
                </div>
            </div>

            {/* Boost bar */}
            <div style={{
                position: 'absolute',
                bottom: -60,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}>
                <span style={{ color: '#00d4ff', fontSize: '0.8rem' }}>BOOST</span>
                <div style={{
                    width: 200,
                    height: 8,
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <div style={{
                        width: `${boost}%`,
                        height: '100%',
                        background: boost > 50 ? '#00d4ff' : boost > 20 ? '#ff8800' : '#ff0000',
                        transition: 'width 0.1s',
                        borderRadius: 4,
                    }} />
                </div>
            </div>
        </div>
    );
}

// ============================================
// GOAL CELEBRATION
// ============================================
function GoalNotification({ scorer }) {
    if (!scorer) return null;
    return (
        <div style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '4rem',
            fontWeight: 'bold',
            color: scorer === 'blue' ? '#4488ff' : '#ff8800',
            textShadow: '0 0 30px rgba(0,0,0,0.8), 0 0 60px currentColor',
            zIndex: 200,
            fontFamily: "'Orbitron', sans-serif",
            animation: 'fadeIn 0.3s ease-out',
            pointerEvents: 'none',
        }}>
            {scorer === 'blue' ? 'BLUE SCORES!' : 'ORANGE SCORES!'}
            <div style={{ fontSize: '1.5rem', color: '#fff', textAlign: 'center', marginTop: '0.5rem' }}>
                🔥 GOAL! 🔥
            </div>
        </div>
    );
}

// ============================================
// SPEEDOMETER
// ============================================
function Speedometer({ speed, boost }) {
    const kmh = Math.round(speed * 2.5);
    return (
        <div style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            color: '#fff',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '1.2rem',
            textAlign: 'right',
            pointerEvents: 'none',
            zIndex: 100,
        }}>
            <div style={{ color: kmh > 80 ? '#00ff87' : kmh > 40 ? '#ffdd00' : '#aaa', fontSize: '2rem', fontWeight: 'bold' }}>
                {kmh}
                <span style={{ fontSize: '0.8rem', marginLeft: 2 }}>km/h</span>
            </div>
        </div>
    );
}

// ============================================
// GAME LOOP
// ============================================
export default function RocketArena({ forceOffline }) {
    const [blueScore, setBlueScore] = useState(0);
    const [orangeScore, setOrangeScore] = useState(0);
    const [timer, setTimer] = useState(300); // 5 minutes
    const [gameActive, setGameActive] = useState(false);
    const [lastScorer, setLastScorer] = useState(null);
    const [ballReset, setBallReset] = useState(0);
    const [boost, setBoost] = useState(100);
    const [speed, setSpeed] = useState(0);

    const field = ROCKET_PHYSICS.field;
    const halfLen = field.length / 2;

    // Timer
    React.useEffect(() => {
        if (!gameActive) return;
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    setGameActive(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [gameActive]);

    const startGame = useCallback(() => {
        setGameActive(true);
        setBlueScore(0);
        setOrangeScore(0);
        setTimer(300);
        setLastScorer(null);
    }, []);

    const handleGoal = useCallback((scoredSide) => {
        // scoredSide is the side that was scored ON
        if (scoredSide === 'orange') {
            setBlueScore(prev => prev + 1);
            setLastScorer('blue');
        } else {
            setOrangeScore(prev => prev + 1);
            setLastScorer('orange');
        }
        setBallReset(prev => prev + 1);

        // Clear notification after 3s
        setTimeout(() => setLastScorer(null), 3000);
    }, []);

    // Car positions
    const carPositions = [
        [0, 1, -halfLen * 0.5],    // Blue car
        [0, 1, halfLen * 0.5],      // Orange car
    ];

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0a15' }}>
            {/* HUD */}
            <Scoreboard blueScore={blueScore} orangeScore={orangeScore} timer={timer} boost={boost} speed={speed} />
            <Speedometer speed={speed} boost={boost} />
            <GoalNotification scorer={lastScorer} />

            {/* Controls hint */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: 20,
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                pointerEvents: 'none',
                zIndex: 100,
            }}>
                WASD/Arrows - Move | Shift - Boost | Space - Jump/Aerial
            </div>

            {/* Start button */}
            {!gameActive && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 300,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                }}>
                    <button
                        onClick={startGame}
                        style={{
                            padding: '1rem 3rem',
                            fontSize: '1.5rem',
                            fontFamily: "'Orbitron', sans-serif",
                            fontWeight: 'bold',
                            background: 'linear-gradient(45deg, #00d4ff, #ff006e)',
                            border: 'none',
                            borderRadius: 12,
                            color: '#fff',
                            cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(0,212,255,0.3)',
                        }}
                    >
                        🏀 KICK OFF
                    </button>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>
                        {timer}s match - First to score wins!
                    </div>
                </div>
            )}

            {/* 3D Scene */}
            <Canvas
                style={{ width: '100%', height: '100%' }}
                shadows
                camera={{ position: [0, ROCKET_PHYSICS.camera.height + 5, ROCKET_PHYSICS.camera.distance * 1.5], fov: ROCKET_PHYSICS.camera.fov }}
                gl={{ antialias: true, alpha: false, toneMapping: 3 }}
            >
                <Suspense fallback={null}>
                    <Environment preset="night" />
                    <Stars count={2000} depth={100} factor={2} saturation={0.5} fade />

                    <Physics
                        gravity={ROCKET_PHYSICS.ball.gravity}
                        step={1 / 120}
                        substeps={4}
                        broadphase="SAP"
                    >
                        {/* Stadium */}
                        <RocketStadium />

                        {/* Ball */}
                        <RocketBall
                            key={`ball_${ballReset}`}
                            position={[0, 2, 0]}
                            reset={ballReset > 0}
                            onGoalScored={handleGoal}
                            onPositionUpdate={(pos, vel) => {
                                if (vel) setSpeed(Math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2));
                            }}
                        />

                        {/* Cars */}
                        {carPositions.map((pos, i) => (
                            <RocketCar
                                key={`car_${i}`}
                                playerId={`car_${i}`}
                                color={i === 0 ? '#0044ff' : '#ff8800'}
                                startPosition={pos}
                                isLocalPlayer={i === 0}
                                onPositionUpdate={() => { }}
                                onGoalScored={(force) => { }}
                            />
                        ))}
                    </Physics>

                    {/* Post-processing */}
                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.3} radius={0.4} />
                        <ChromaticAberration offset={[0.001, 0.001]} />
                        <ToneMapping />
                    </EffectComposer>
                </Suspense>
            </Canvas>
        </div>
    );
}
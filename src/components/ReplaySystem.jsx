import React, { useRef, useCallback, useState, useEffect } from 'react';

/**
 * ReplaySystem - Records and plays back knockout moments
 * Uses a circular buffer to store the last N seconds of gameplay
 */

const BUFFER_DURATION = 10; // seconds
const SAMPLE_RATE = 60; // samples per second
const MAX_SAMPLES = BUFFER_DURATION * SAMPLE_RATE;

export function useReplayRecorder() {
    const buffer = useRef([]);
    const recording = useRef(true);

    const recordFrame = useCallback((frameData) => {
        if (!recording.current) return;

        buffer.current.push({
            timestamp: Date.now(),
            players: { ...frameData.players },
            powerups: [...(frameData.powerups || [])],
            projectiles: [...(frameData.projectiles || [])]
        });

        // Circular buffer - remove oldest if over limit
        if (buffer.current.length > MAX_SAMPLES) {
            buffer.current.shift();
        }
    }, []);

    const captureReplay = useCallback((knockoutTime, leadTime = 5000, trailTime = 2000) => {
        const startTime = knockoutTime - leadTime;
        const endTime = knockoutTime + trailTime;

        const replayFrames = buffer.current.filter(
            frame => frame.timestamp >= startTime && frame.timestamp <= endTime
        );

        return {
            frames: replayFrames,
            knockoutTime,
            duration: (endTime - startTime) / 1000
        };
    }, []);

    const pauseRecording = useCallback(() => {
        recording.current = false;
    }, []);

    const resumeRecording = useCallback(() => {
        recording.current = true;
    }, []);

    const clearBuffer = useCallback(() => {
        buffer.current = [];
    }, []);

    return {
        recordFrame,
        captureReplay,
        pauseRecording,
        resumeRecording,
        clearBuffer,
        getBufferLength: () => buffer.current.length
    };
}

// Replay Player Component
export default function ReplayPlayer({
    replay,
    onClose,
    victimName = "Player",
    attackerName = "Player"
}) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(0.5); // Slow-mo default
    const animationRef = useRef(null);
    const lastTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!replay?.frames?.length) return;

        const animate = () => {
            if (!isPlaying) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }

            const now = Date.now();
            const delta = now - lastTimeRef.current;

            // Advance frames based on playback speed
            const framesToAdvance = Math.floor((delta / 1000) * SAMPLE_RATE * playbackSpeed);

            if (framesToAdvance > 0) {
                lastTimeRef.current = now;
                setCurrentFrame(prev => {
                    const next = prev + framesToAdvance;
                    if (next >= replay.frames.length) {
                        setIsPlaying(false);
                        return replay.frames.length - 1;
                    }
                    return next;
                });
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [replay, isPlaying, playbackSpeed]);

    if (!replay?.frames?.length) {
        return null;
    }

    const frame = replay.frames[currentFrame] || replay.frames[0];
    const progress = (currentFrame / replay.frames.length) * 100;

    return (
        <div className="replay-overlay">
            <div className="replay-header">
                <div className="replay-title">
                    <span className="replay-icon">🎬</span>
                    KILLCAM
                </div>
                <div className="replay-info">
                    <span className="attacker">{attackerName}</span>
                    <span className="vs">knocked out</span>
                    <span className="victim">{victimName}</span>
                </div>
            </div>

            <div className="replay-viewport">
                {/* This would render a mini-game view with the replay data */}
                <div className="replay-players">
                    {Object.entries(frame.players || {}).map(([id, player]) => (
                        <div
                            key={id}
                            className="replay-puck"
                            style={{
                                left: `${50 + (player.position?.[0] || 0) * 2}%`,
                                top: `${50 - (player.position?.[2] || 0) * 2}%`,
                                backgroundColor: player.color || '#00d4ff'
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="replay-controls">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="control-buttons">
                    <button
                        className="btn-replay"
                        onClick={() => {
                            setCurrentFrame(0);
                            setIsPlaying(true);
                            lastTimeRef.current = Date.now();
                        }}
                    >
                        ⏮ Restart
                    </button>

                    <button
                        className="btn-replay"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>

                    <select
                        className="speed-select"
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    >
                        <option value={0.25}>0.25x</option>
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                    </select>

                    <button className="btn-close" onClick={onClose}>
                        ✕ Close
                    </button>
                </div>
            </div>

            <style jsx>{`
                .replay-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 2000;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Orbitron', sans-serif;
                }

                .replay-header {
                    padding: 1.5rem;
                    text-align: center;
                    background: linear-gradient(to bottom, rgba(255,0,110,0.3), transparent);
                }

                .replay-title {
                    font-size: 2rem;
                    font-weight: bold;
                    color: #ff006e;
                    text-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
                    margin-bottom: 0.5rem;
                }

                .replay-icon {
                    margin-right: 0.5rem;
                }

                .replay-info {
                    font-size: 1.2rem;
                    color: #fff;
                }

                .attacker {
                    color: #00d4ff;
                    font-weight: bold;
                }

                .vs {
                    margin: 0 0.5rem;
                    color: #888;
                }

                .victim {
                    color: #ff006e;
                    font-weight: bold;
                }

                .replay-viewport {
                    flex: 1;
                    position: relative;
                    background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%);
                    border: 2px solid #333;
                    margin: 1rem;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .replay-players {
                    position: absolute;
                    inset: 0;
                }

                .replay-puck {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 15px currentColor;
                    transition: left 0.05s, top 0.05s;
                }

                .replay-controls {
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.5);
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #333;
                    border-radius: 4px;
                    margin-bottom: 1rem;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #00d4ff, #ff006e);
                    transition: width 0.1s;
                }

                .control-buttons {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    align-items: center;
                }

                .btn-replay {
                    padding: 0.5rem 1rem;
                    background: rgba(0, 212, 255, 0.2);
                    border: 1px solid #00d4ff;
                    color: #00d4ff;
                    border-radius: 20px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s;
                }

                .btn-replay:hover {
                    background: rgba(0, 212, 255, 0.4);
                }

                .speed-select {
                    padding: 0.5rem;
                    background: #222;
                    border: 1px solid #444;
                    color: #fff;
                    border-radius: 8px;
                    cursor: pointer;
                }

                .btn-close {
                    padding: 0.5rem 1rem;
                    background: rgba(255, 0, 110, 0.2);
                    border: 1px solid #ff006e;
                    color: #ff006e;
                    border-radius: 20px;
                    cursor: pointer;
                    font-family: inherit;
                }

                .btn-close:hover {
                    background: rgba(255, 0, 110, 0.4);
                }
            `}</style>
        </div>
    );
}

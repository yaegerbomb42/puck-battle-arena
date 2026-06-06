import React, { useEffect, useState, useCallback, useRef } from 'react';
import { audio } from '../../utils/audio';

// ============================================
// PARTICLE SYSTEM - Gold dust raining down
// ============================================
function useParticles(active, count = 30) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        if (!active) { setParticles([]); return; }

        const newParticles = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,         // % across
            delay: Math.random() * 2,        // stagger
            duration: 1.5 + Math.random() * 2,
            size: 4 + Math.random() * 8,
            drift: (Math.random() - 0.5) * 40, // horizontal sway
            type: Math.random() > 0.7 ? 'spark' : 'coin' // mix of coin and spark
        }));
        setParticles(newParticles);
    }, [active, count]);

    return particles;
}

// ============================================
// MAIN REWARD POPUP
// ============================================
export default function RewardPopup({ reward, onClose }) {
    const [phase, setPhase] = useState('idle'); // idle -> entering -> counting -> holding -> exiting
    const [displayAmount, setDisplayAmount] = useState(0);
    const [displayXP, setDisplayXP] = useState(0); // [PHASE 3]
    const countRef = useRef(null);
    const xpCountRef = useRef(null); // [PHASE 3]
    const particles = useParticles(phase === 'counting' || phase === 'holding', 40);

    const startExit = useCallback(() => {
        setPhase('exiting');
        setTimeout(() => {
            setPhase('idle');
            setDisplayAmount(0);
            if (onClose) onClose();
        }, 600);
    }, [onClose]);

    useEffect(() => {
        if (!reward) return;

        // PHASE 1: Enter
        setPhase('entering');
        audio.playClick();

        const enterTimer = setTimeout(() => {
            // PHASE 2: Count up
            setPhase('counting');
            const target = reward.amount || 0;
            const steps = 30;
            const stepValue = target / steps;
            let current = 0;

            countRef.current = setInterval(() => {
                current += stepValue;
                if (current >= target) {
                    setDisplayAmount(target);
                    clearInterval(countRef.current);
                    // PHASE 3: Hold
                    setPhase('holding');
                    // Auto-dismiss after 3s
                    setTimeout(startExit, 4000);
                } else {
                    setDisplayAmount(Math.floor(current));
                }
            }, 40);

            // [PHASE 3] Count up XP
            if (reward.xpGain) {
                const xpTarget = reward.xpGain;
                const xpStep = xpTarget / steps;
                let xpCurrent = 0;
                xpCountRef.current = setInterval(() => {
                    xpCurrent += xpStep;
                    if (xpCurrent >= xpTarget) {
                        setDisplayXP(xpTarget);
                        clearInterval(xpCountRef.current);
                    } else {
                        setDisplayXP(Math.floor(xpCurrent));
                    }
                }, 40);
            }
        }, 400);

        return () => {
            clearTimeout(enterTimer);
            if (countRef.current) clearInterval(countRef.current);
            if (xpCountRef.current) clearInterval(xpCountRef.current);
        };
    }, [reward, startExit]);

    if (phase === 'idle' && !reward) return null;

    // Determine reward tier for visuals
    const amount = reward?.amount || 0;
    const tier = amount >= 500 ? 'legendary' : amount >= 100 ? 'epic' : amount >= 50 ? 'rare' : 'common';
    const tierColors = {
        common: { primary: '#ffd700', secondary: '#ff8c00', glow: 'rgba(255,215,0,0.3)' },
        rare: { primary: '#00d4ff', secondary: '#0099ff', glow: 'rgba(0,212,255,0.3)' },
        epic: { primary: '#8b5cf6', secondary: '#6d28d9', glow: 'rgba(139,92,246,0.3)' },
        legendary: { primary: '#ff006e', secondary: '#ff0000', glow: 'rgba(255,0,110,0.4)' }
    };
    const colors = tierColors[tier];

    return (
        <div className={`reward-popup-overlay ${phase}`} onClick={phase === 'holding' ? startExit : undefined}>
            {/* Particles */}
            <div className="particle-field">
                {particles.map(p => (
                    <div
                        key={p.id}
                        className={`particle particle-${p.type}`}
                        style={{
                            left: `${p.x}%`,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duration}s`,
                            width: p.size, height: p.size,
                            '--drift': `${p.drift}px`,
                            background: p.type === 'spark'
                                ? colors.primary
                                : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                        }}
                    />
                ))}
            </div>

            {/* Content Card */}
            <div className="reward-card" style={{ '--glow-color': colors.glow, '--primary': colors.primary }}>
                {/* Shine sweep */}
                <div className="shine-sweep" />

                {/* Header */}
                <div className="reward-header">
                    <span className="reward-label">{reward?.reason || 'MATCH BONUS'}</span>
                </div>

                {/* Amount */}
                <div className="reward-amount-row">
                    <div className="coin-icon" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Z</div>
                    <span className="reward-value" style={{ color: colors.primary }}>+{displayAmount.toLocaleString()}</span>
                </div>

                {/* [PHASE 3] XP Gain */}
                {reward?.xpGain > 0 && (
                    <div className="xp-gain-row">
                        <span className="xp-label">XP</span>
                        <span className="xp-value">+{displayXP.toLocaleString()}</span>
                    </div>
                )}

                {/* Tier badge */}
                <div className="tier-badge" style={{ color: colors.primary, borderColor: colors.primary }}>
                    {tier.toUpperCase()} REWARD
                </div>

                {/* Tap hint */}
                {phase === 'holding' && (
                    <div className="tap-hint">tap to dismiss</div>
                )}
            </div>

            <style jsx>{`
                .reward-popup-overlay {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3000;
                    background: rgba(0,0,0,0);
                    transition: background 0.4s;
                    pointer-events: none;
                    font-family: 'Orbitron', sans-serif;
                }
                .reward-popup-overlay.entering,
                .reward-popup-overlay.counting,
                .reward-popup-overlay.holding {
                    background: rgba(0,0,0,0.7);
                    pointer-events: auto;
                }
                .reward-popup-overlay.exiting {
                    background: rgba(0,0,0,0);
                    pointer-events: none;
                }

                /* CARD */
                .reward-card {
                    position: relative;
                    background: linear-gradient(135deg, rgba(15,15,30,0.95), rgba(5,5,15,0.98));
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 24px;
                    padding: 40px 60px;
                    text-align: center;
                    overflow: hidden;
                    box-shadow: 0 0 60px var(--glow-color), inset 0 1px 0 rgba(255,255,255,0.1);
                    transform: scale(0.5) translateY(40px);
                    opacity: 0;
                    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .entering .reward-card,
                .counting .reward-card,
                .holding .reward-card {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
                .exiting .reward-card {
                    transform: scale(0.8) translateY(-30px);
                    opacity: 0;
                    transition: all 0.4s ease-in;
                }

                /* SHINE SWEEP */
                .shine-sweep {
                    position: absolute;
                    top: 0; left: -100%;
                    width: 60%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                    transform: skewX(-20deg);
                }
                .counting .shine-sweep,
                .holding .shine-sweep {
                    animation: sweep 2s ease-in-out infinite;
                }
                @keyframes sweep {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }

                /* HEADER */
                .reward-header {
                    margin-bottom: 20px;
                }
                .reward-label {
                    font-size: 0.75rem;
                    color: #666;
                    letter-spacing: 4px;
                    text-transform: uppercase;
                }

                /* AMOUNT */
                .reward-amount-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .coin-icon {
                    width: 48px; height: 48px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 1.5rem; font-weight: 900; color: #000;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .reward-value {
                    font-size: 3.5rem;
                    font-weight: 900;
                    text-shadow: 0 0 30px var(--glow-color);
                    letter-spacing: -2px;
                }

                /* [PHASE 3] XP GAIN */
                .xp-gain-row {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 24px;
                    background: rgba(0, 212, 255, 0.1);
                    padding: 8px 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(0, 212, 255, 0.2);
                    width: fit-content;
                    margin-inline: auto;
                }
                .xp-label {
                    font-size: 0.8rem;
                    font-weight: 900;
                    color: #00d4ff;
                    letter-spacing: 2px;
                }
                .xp-value {
                    font-size: 1.2rem;
                    font-weight: 800;
                    color: #fff;
                }

                /* TIER BADGE */
                .tier-badge {
                    display: inline-block;
                    padding: 4px 16px;
                    border: 1px solid;
                    border-radius: 20px;
                    font-size: 0.6rem;
                    letter-spacing: 3px;
                    margin-bottom: 12px;
                }

                /* TAP HINT */
                .tap-hint {
                    color: #444;
                    font-size: 0.65rem;
                    margin-top: 16px;
                    animation: pulse-hint 2s infinite;
                }
                @keyframes pulse-hint {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.7; }
                }

                /* PARTICLES */
                .particle-field {
                    position: absolute; inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }
                .particle {
                    position: absolute;
                    top: -10px;
                    border-radius: 50%;
                    opacity: 0;
                }
                .counting .particle,
                .holding .particle {
                    animation: fall var(--fall-duration, 2s) ease-in var(--fall-delay, 0s) infinite;
                }
                .particle-coin {
                    border-radius: 2px;
                    box-shadow: 0 0 6px rgba(255,215,0,0.5);
                }
                .particle-spark {
                    box-shadow: 0 0 8px currentColor;
                }

                @keyframes fall {
                    0% { 
                        transform: translateY(0) translateX(0) rotate(0deg); 
                        opacity: 1; 
                    }
                    100% { 
                        transform: translateY(100vh) translateX(var(--drift, 0px)) rotate(720deg); 
                        opacity: 0; 
                    }
                }
            `}</style>
        </div>
    );
}

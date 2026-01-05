import React, { useState, useEffect, useCallback } from 'react';
import { openPack, TIERS, getIconById } from '../../utils/economy';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, Sparkles } from '@react-three/drei';

const REVEAL_DELAY = 800; // ms between each slot reveal

export default function PackOpener({ packType = 'single', onClose, onClaimRewards }) {
    const [step, setStep] = useState('sealed'); // sealed, opening, revealing, complete
    const [slots, setSlots] = useState([]);
    const [revealedCount, setRevealedCount] = useState(0);

    // Generate pack contents on mount
    useEffect(() => {
        const packContents = openPack(packType);
        setSlots(packContents.map(slot => ({ ...slot, revealed: false })));
    }, [packType]);

    const handleOpen = () => {
        setStep('opening');
        setTimeout(() => {
            setStep('revealing');
            revealNextSlot();
        }, 1500);
    };

    const revealNextSlot = useCallback(() => {
        setSlots(prev => {
            const next = [...prev];
            const unrevealed = next.findIndex(s => !s.revealed);
            if (unrevealed !== -1) {
                next[unrevealed].revealed = true;
            }
            return next;
        });
        setRevealedCount(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (step === 'revealing' && revealedCount < slots.length && revealedCount > 0) {
            const timer = setTimeout(revealNextSlot, REVEAL_DELAY);
            return () => clearTimeout(timer);
        } else if (step === 'revealing' && revealedCount >= slots.length) {
            setTimeout(() => setStep('complete'), 500);
        }
    }, [revealedCount, slots.length, step, revealNextSlot]);

    const handleClaim = () => {
        const rewards = slots.filter(s => s.type === 'icon').map(s => s.iconId);
        const freePackCount = slots.filter(s => s.type === 'free_pack_token').length;
        if (onClaimRewards) {
            onClaimRewards({ icons: rewards, freePacks: freePackCount });
        }
        onClose();
    };

    return (
        <div className="opener-overlay">
            {step === 'sealed' && (
                <div className="pack-container" onClick={handleOpen}>
                    <div className="pack-glow"></div>
                    <div className="pack-visual shake-hover">📦</div>
                    <h2>TAP TO OPEN</h2>
                    <p className="pack-type">{packType.toUpperCase()} PACK</p>
                </div>
            )}

            {step === 'opening' && (
                <div className="opening-sequence">
                    <div className="burst-lines"></div>
                    <div className="pack-visual shaking-hard">📦</div>
                </div>
            )}

            {(step === 'revealing' || step === 'complete') && (
                <div className="reveal-container">
                    <h2>{step === 'complete' ? '🎉 YOUR REWARDS' : 'REVEALING...'}</h2>

                    <div className="slots-grid">
                        {slots.map((slot, idx) => (
                            <SlotCard
                                key={idx}
                                slot={slot}
                                index={idx}
                                revealed={slot.revealed}
                            />
                        ))}
                    </div>

                    {step === 'complete' && (
                        <button className="claim-btn" onClick={handleClaim}>
                            CLAIM ALL
                        </button>
                    )}
                </div>
            )}

            <style jsx>{`
                .opener-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, rgba(0,0,0,0.98), rgba(20,0,40,0.98));
                    z-index: 2000;
                    display: flex; justify-content: center; align-items: center;
                    flex-direction: column;
                    color: white; overflow: hidden;
                    font-family: 'Inter', 'Orbitron', sans-serif;
                }
                
                .pack-container { text-align: center; cursor: pointer; }
                .pack-glow {
                    position: absolute; width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(0,212,255,0.3), transparent 70%);
                    animation: pulse 2s infinite;
                }
                .pack-visual { 
                    font-size: 12rem; cursor: pointer; 
                    transition: 0.3s; position: relative; z-index: 2;
                    filter: drop-shadow(0 0 30px rgba(0,212,255,0.5));
                }
                .pack-type { color: #888; font-size: 1rem; margin-top: 0.5rem; }
                .shake-hover:hover { animation: shake 0.5s infinite; }
                .shaking-hard { animation: shake 0.1s infinite; }

                .opening-sequence { position: relative; }
                .burst-lines {
                    position: absolute; width: 400px; height: 400px;
                    background: conic-gradient(from 0deg, transparent, rgba(255,255,255,0.2), transparent);
                    animation: spinBurst 0.5s linear infinite;
                }

                .reveal-container { 
                    text-align: center; 
                    width: 100%; 
                    padding: 2rem;
                }
                .reveal-container h2 { margin-bottom: 2rem; font-size: 1.8rem; }
                
                .slots-grid {
                    display: flex; flex-wrap: wrap; gap: 1.5rem; 
                    justify-content: center; max-width: 800px; margin: 0 auto;
                }

                .claim-btn {
                    background: linear-gradient(45deg, #00ff87, #00d4ff);
                    border: none; padding: 1rem 4rem; 
                    font-size: 1.5rem; border-radius: 30px; 
                    margin-top: 2rem; cursor: pointer;
                    font-family: 'Orbitron', sans-serif; 
                    font-weight: bold; color: #000;
                    transition: 0.2s;
                }
                .claim-btn:hover { 
                    transform: scale(1.1); 
                    box-shadow: 0 0 40px rgba(0,255,135,0.5); 
                }

                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                @keyframes spinBurst {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function SlotCard({ slot, index, revealed }) {
    const tier = slot.tier ? TIERS[slot.tier] : null;
    const icon = slot.iconId;
    const isFreePackToken = slot.type === 'free_pack_token';
    const isMystery = tier?.isMystery;

    if (!revealed) {
        return (
            <div className="slot-card unrevealed">
                <div className="slot-icon">❓</div>
                <style jsx>{`
                    .slot-card {
                        width: 150px; height: 180px;
                        background: rgba(255,255,255,0.05);
                        border: 2px solid #333; border-radius: 16px;
                        display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                        transition: all 0.3s;
                    }
                    .unrevealed { 
                        animation: cardPulse 1s infinite; 
                    }
                    .slot-icon { font-size: 3rem; }
                    @keyframes cardPulse {
                        0%, 100% { border-color: #333; }
                        50% { border-color: #666; }
                    }
                `}</style>
            </div>
        );
    }

    if (isFreePackToken) {
        return (
            <div className="slot-card free-pack animate-pop">
                <div className="slot-icon">🎟️</div>
                <div className="slot-label">FREE PACK!</div>
                <style jsx>{`
                    .slot-card {
                        width: 150px; height: 180px;
                        background: linear-gradient(135deg, rgba(0,255,135,0.2), rgba(0,212,255,0.2));
                        border: 2px solid #00ff87; border-radius: 16px;
                        display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                    }
                    .free-pack { box-shadow: 0 0 30px rgba(0,255,135,0.5); }
                    .slot-icon { font-size: 3rem; }
                    .slot-label { 
                        font-size: 0.9rem; font-weight: bold; 
                        color: #00ff87; margin-top: 0.5rem;
                    }
                    .animate-pop { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                    @keyframes popIn { 
                        from { transform: scale(0); opacity: 0; } 
                        to { transform: scale(1); opacity: 1; } 
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className="slot-card animate-pop"
            style={{
                borderColor: tier?.color || '#666',
                boxShadow: `0 0 20px ${tier?.color}40`
            }}
        >
            <div className="rarity-badge" style={{ background: tier?.color }}>
                {isMystery ? '???' : tier?.name}
            </div>
            <div className="slot-icon">
                {isMystery ? '🔮' : '⭐'}
            </div>
            <div className="slot-name">
                {icon?.name || `Icon #${index + 1}`}
            </div>
            {tier?.id >= 8 && (
                <div className="mystery-reveal">MYSTERY UNLOCKED!</div>
            )}
            <style jsx>{`
                .slot-card {
                    width: 150px; height: 180px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.3));
                    border: 2px solid; border-radius: 16px;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    position: relative; overflow: hidden;
                }
                .rarity-badge {
                    position: absolute; top: 8px;
                    font-size: 0.65rem; padding: 2px 10px;
                    border-radius: 10px; font-weight: bold;
                    color: #000;
                }
                .slot-icon { font-size: 3rem; margin: 0.5rem 0; }
                .slot-name { 
                    font-size: 0.8rem; color: #ccc; 
                    text-align: center; padding: 0 0.5rem;
                }
                .mystery-reveal {
                    position: absolute; bottom: 8px;
                    font-size: 0.6rem; color: #ff006e;
                    animation: blink 0.5s infinite;
                }
                .animate-pop { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes popIn { 
                    from { transform: scale(0); opacity: 0; } 
                    to { transform: scale(1); opacity: 1; } 
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

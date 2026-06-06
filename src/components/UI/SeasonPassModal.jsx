import React, { useState, useEffect } from 'react';
import { SEASON_PASS_REWARDS } from '../../utils/leveling';
import { useAuth } from '../../contexts/AuthContext';
import { audio } from '../../utils/audio';

export default function SeasonPassModal({ onClose }) {
    const { inventory, claimSeasonReward } = useAuth();
    const [claiming, setClaiming] = useState(null);

    // Calculate progress
    const xp = inventory?.xp || 0;
    const claimedLevels = inventory?.claimedSeasonRewards || [];

    const currentLevel = SEASON_PASS_REWARDS.filter(r => xp >= r.requiredXp).length;

    const handleClaim = async (reward) => {
        if (claiming === reward.level || claimedLevels.includes(reward.level)) return;
        audio.playClick();
        setClaiming(reward.level);
        await claimSeasonReward(reward.level, reward.rewardType, reward.amount);
        setClaiming(null);
    };

    return (
        <div className="sp-modal-overlay" onClick={onClose}>
            <div className="sp-modal glass-dark" onClick={e => e.stopPropagation()}>
                <div className="sp-header">
                    <div className="sp-title">
                        <h2>🎖️ Season Pass</h2>
                        <p className="sp-subtitle">Level {currentLevel} • {xp.toLocaleString()} XP</p>
                    </div>
                    <button className="sp-close" onClick={onClose}>✕</button>
                </div>

                <div className="sp-track-container">
                    <div className="sp-track">
                        {SEASON_PASS_REWARDS.map((reward, i) => {
                            const isUnlocked = xp >= reward.requiredXp;
                            const isClaimed = claimedLevels.includes(reward.level);
                            const prevRequiredXp = i === 0 ? 0 : SEASON_PASS_REWARDS[i - 1].requiredXp;
                            
                            // Calculate local progress for this segment
                            let segmentProgress = 0;
                            if (xp >= reward.requiredXp) {
                                segmentProgress = 100;
                            } else if (xp > prevRequiredXp) {
                                segmentProgress = ((xp - prevRequiredXp) / (reward.requiredXp - prevRequiredXp)) * 100;
                            }

                            return (
                                <div key={reward.level} className={`sp-node ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}`}>
                                    <div className="sp-connector">
                                        <div className="sp-connector-fill" style={{ height: `${segmentProgress}%` }} />
                                    </div>
                                    <div className="sp-node-content">
                                        <div className="sp-level-badge">LV {reward.level}</div>
                                        <div className="sp-reward-info">
                                            <span className="sp-reward-label">{reward.label}</span>
                                            <span className="sp-xp-req">{reward.requiredXp.toLocaleString()} XP</span>
                                        </div>
                                        <button 
                                            className={`sp-btn-claim ${isClaimed ? 'claimed' : isUnlocked ? 'unlocked' : 'locked'}`}
                                            onClick={() => isUnlocked ? handleClaim(reward) : audio.playError()}
                                            disabled={!isUnlocked || isClaimed || claiming === reward.level}
                                        >
                                            {claiming === reward.level ? '...' : isClaimed ? '✓ CLAIMED' : isUnlocked ? 'CLAIM' : 'LOCKED'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                .sp-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    animation: fadeIn 0.3s ease;
                }
                .sp-modal {
                    width: 500px;
                    max-width: 90%;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    padding: 2.5rem;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                }
                .sp-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .sp-title h2 {
                    font-family: 'Orbitron', sans-serif;
                    margin: 0 0 0.5rem 0;
                    font-size: 1.8rem;
                    color: #ffd700;
                    text-shadow: 0 0 15px rgba(255,215,0,0.5);
                    letter-spacing: 2px;
                }
                .sp-subtitle {
                    margin: 0;
                    color: #00d4ff;
                    font-weight: 700;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .sp-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: 0.2s;
                    align-self: flex-start;
                }
                .sp-close:hover { opacity: 1; transform: rotate(90deg); }
                
                .sp-track-container {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 1rem;
                    /* Custom Scrollbar */
                }
                .sp-track-container::-webkit-scrollbar { width: 6px; }
                .sp-track-container::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
                .sp-track-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }

                .sp-track {
                    display: flex;
                    flex-direction: column;
                }
                .sp-node {
                    display: flex;
                    align-items: stretch;
                    position: relative;
                    min-height: 100px;
                    opacity: 0.5;
                    transition: 0.3s;
                }
                .sp-node.unlocked { opacity: 1; }
                .sp-node.claimed { opacity: 0.8; }

                .sp-connector {
                    width: 4px;
                    background: rgba(255,255,255,0.1);
                    margin: 0 1.5rem;
                    position: relative;
                    border-radius: 2px;
                }
                .sp-connector-fill {
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    background: #ffd700;
                    box-shadow: 0 0 10px rgba(255,215,0,0.8);
                    border-radius: 2px;
                    transition: height 1s ease-out;
                }
                /* Diamond node marker */
                .sp-connector::before {
                    content: '';
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%) rotate(45deg);
                    width: 14px; height: 14px;
                    background: #222;
                    border: 2px solid rgba(255,255,255,0.2);
                    z-index: 2;
                    transition: 0.3s;
                }
                .sp-node.unlocked .sp-connector::before {
                    background: #ffd700;
                    border-color: #fff;
                    box-shadow: 0 0 10px #ffd700;
                }
                .sp-node.claimed .sp-connector::before {
                    background: #00ff87;
                    border-color: #fff;
                    box-shadow: 0 0 10px #00ff87;
                }

                .sp-node-content {
                    flex: 1;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px;
                    padding: 1.25rem;
                    margin: 1rem 0;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    transition: 0.3s;
                }
                .sp-node.unlocked .sp-node-content {
                    background: rgba(255,215,0,0.05);
                    border-color: rgba(255,215,0,0.3);
                }
                .sp-node.claimed .sp-node-content {
                    background: rgba(0,255,135,0.05);
                    border-color: rgba(0,255,135,0.3);
                }

                .sp-level-badge {
                    font-family: 'Orbitron', sans-serif;
                    font-weight: 900;
                    font-size: 1.2rem;
                    color: #fff;
                    width: 50px;
                    text-align: center;
                }
                .sp-reward-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }
                .sp-reward-label {
                    font-weight: 700;
                    font-size: 1.1rem;
                    color: #fff;
                }
                .sp-node.unlocked .sp-reward-label { color: #ffd700; }
                .sp-node.claimed .sp-reward-label { color: #00ff87; }
                
                .sp-xp-req {
                    font-size: 0.8rem;
                    opacity: 0.6;
                    font-family: 'Orbitron', sans-serif;
                }

                .sp-btn-claim {
                    padding: 0.8rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    cursor: pointer;
                    transition: 0.2s;
                    min-width: 120px;
                }
                .sp-btn-claim.locked {
                    background: rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.3);
                    cursor: not-allowed;
                }
                .sp-btn-claim.unlocked {
                    background: #ffd700;
                    color: #000;
                    box-shadow: 0 0 15px rgba(255,215,0,0.4);
                }
                .sp-btn-claim.unlocked:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 25px rgba(255,215,0,0.6);
                }
                .sp-btn-claim.claimed {
                    background: rgba(0,255,135,0.1);
                    color: #00ff87;
                    border: 1px solid #00ff87;
                    cursor: default;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

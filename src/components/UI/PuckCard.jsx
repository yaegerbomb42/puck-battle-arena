import React from 'react';
import { getLevel, getXPProgress, getStatsAtLevel } from '../../utils/puckLeveling';
import { TIERS, getAllIcons } from '../../utils/economy';
import PuckPreview from './PuckPreview';

export default function PuckCard({ puck, isEquipped, onSelect, onEvolve }) {
    if (!puck) return null;

    const icon = getAllIcons().find(i => i.id === puck.iconId);
    const level = getLevel(puck.xp);
    const { progress, nextLevelXP } = getXPProgress(puck.xp);
    const stats = getStatsAtLevel(puck.tier, level);
    const tierData = TIERS[puck.tier] || { color: '#888', name: 'Unknown' };

    return (
        <div 
            className={`puck-card ${isEquipped ? 'equipped' : ''}`}
            onClick={() => onSelect && onSelect(puck)}
        >
            <div className="card-header">
                <div className="puck-level">LVL {level}</div>
                <div className="puck-tier" style={{ background: tierData.color }}>
                    {tierData.name}
                </div>
            </div>

            <div className="puck-visual">
                <div className="preview-wrap">
                    <PuckPreview icon={icon} size={100} />
                </div>
                {isEquipped && <div className="equipped-glow" style={{ boxShadow: `0 0 30px ${tierData.color}44` }} />}
            </div>

            <div className="puck-info">
                <h3 className="puck-name">{puck.nickname || icon?.name || 'Unnamed Puck'}</h3>
                
                <div className="xp-bar-container">
                    <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
                    <div className="xp-text">{Math.floor(puck.xp % nextLevelXP)} / {nextLevelXP} XP</div>
                </div>

                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">PWR</span>
                        <span className="stat-value">{stats.power}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">SPD</span>
                        <span className="stat-value">{stats.speed}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">DEF</span>
                        <span className="stat-value">{stats.defense}</span>
                    </div>
                </div>

                <div className="puck-history">
                    <span>🏆 {puck.wins || 0}</span>
                    <span>⚔️ {puck.kills || 0}</span>
                </div>
            </div>

            {isEquipped && (
                <div className="equipped-overlay">
                    <div className="active-tag">ACTIVE</div>
                </div>
            )}

            <style jsx>{`
                .puck-card {
                    background: rgba(20, 20, 35, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 1rem;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    backdrop-filter: blur(10px);
                }

                .puck-card:hover {
                    transform: translateY(-8px) scale(1.02);
                    border-color: rgba(255, 255, 255, 0.3);
                    background: rgba(30, 30, 50, 0.8);
                    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
                }

                .puck-card.equipped {
                    border-color: #00ff87;
                    background: rgba(0, 255, 135, 0.05);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 2;
                }

                .puck-level {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 900;
                    color: #fff;
                    background: #111;
                    padding: 2px 8px;
                    border-radius: 4px;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .puck-tier {
                    font-size: 0.65rem;
                    font-weight: 800;
                    color: #000;
                    padding: 2px 10px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .puck-visual {
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .preview-wrap {
                    z-index: 2;
                    transition: transform 0.3s ease;
                }

                .puck-card:hover .preview-wrap {
                    transform: rotate(15deg) scale(1.1);
                }

                .equipped-glow {
                    position: absolute;
                    inset: 20px;
                    border-radius: 50%;
                    z-index: 1;
                    filter: blur(20px);
                    opacity: 0.5;
                }

                .puck-info {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    z-index: 2;
                }

                .puck-name {
                    margin: 0;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 1.1rem;
                    color: #fff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .xp-bar-container {
                    height: 14px;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 10px;
                    overflow: hidden;
                    position: relative;
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .xp-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #00d4ff, #00ff87);
                    transition: width 1s ease-out;
                    box-shadow: 0 0 10px rgba(0, 255, 135, 0.5);
                }

                .xp-text {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.6rem;
                    font-weight: 800;
                    color: #fff;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                    letter-spacing: 0.5px;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 4px;
                    background: rgba(0,0,0,0.3);
                    padding: 8px;
                    border-radius: 8px;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .stat-label {
                    font-size: 0.55rem;
                    color: #666;
                    font-weight: 800;
                }

                .stat-value {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.8rem;
                    color: #fff;
                    font-weight: 700;
                }

                .puck-history {
                    display: flex;
                    justify-content: space-around;
                    font-size: 0.75rem;
                    color: #aaa;
                    font-weight: 600;
                    padding-top: 4px;
                }

                .active-tag {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-15deg);
                    background: #00ff87;
                    color: #000;
                    font-weight: 900;
                    font-size: 1.5rem;
                    padding: 4px 20px;
                    opacity: 0.15;
                    pointer-events: none;
                    letter-spacing: 4px;
                    z-index: 1;
                }
            `}</style>
        </div>
    );
}

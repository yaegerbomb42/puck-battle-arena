import React from 'react';
import { getPowerupInfo } from '../../utils/powerups';

export default function GameHUD({ scores, timer, activePowerup, loadout, damageStats, knockoutMessage, gameStatus }) {

    const getScoreClass = (score) => {
        if (score >= 4) return 'score-critical';
        if (score > 0) return 'score-active';
        return '';
    };

    return (
        <div className="game-hud">
            {/* Top Bar: Scores & Timer */}
            <div className="hud-top-bar">
                <div className={`player-score p1 ${getScoreClass(scores.player1)}`}>
                    <div className="player-label p1-label">PLAYER 1</div>
                    <div className="score-value">{scores.player1}</div>
                    {damageStats?.player1 !== undefined && (
                        <div className="damage-value" style={{ color: damageStats.player1 > 100 ? '#ff0000' : '#fff' }}>
                            {Math.floor(damageStats.player1)}%
                        </div>
                    )}
                </div>

                <div className="game-timer">
                    <div className="timer-value">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</div>
                </div>

                <div className={`player-score p2 ${getScoreClass(scores.player2)}`}>
                    <div className="score-value">{scores.player2}</div>
                    <div className="player-label p2-label">PLAYER 2</div>
                    {damageStats?.player2 !== undefined && (
                        <div className="damage-value" style={{ color: damageStats.player2 > 100 ? '#ff0000' : '#fff' }}>
                            {Math.floor(damageStats.player2)}%
                        </div>
                    )}
                </div>
            </div>

            {/* Loadout / Powerup Display */}
            <div className="loadout-hud">
                {loadout && loadout.map((id, index) => {
                    const info = getPowerupInfo(id);
                    const isActive = activePowerup?.id === id;
                    const hasStock = isActive; // Simplified: Highlight if ready to use

                    return (
                        <div key={index} className={`hud-slot ${hasStock ? 'ready' : ''}`}>
                            <div className="hud-icon" style={{ background: hasStock ? info.color : '#333' }}>
                                {info.icon}
                            </div>
                            <div className="key-hint">{index + 1}</div> {/* Hint for loadout slot */}
                        </div>
                    );
                })}
            </div>

            {/* Active Item Warning */}
            {activePowerup && (
                <div className="active-powerup-alert">
                    PRESS SPACE TO USE: {activePowerup.name.toUpperCase()}
                </div>
            )}

            {/* Knockout Message Overlay */}
            {knockoutMessage && (
                <div className="knockout-overlay">
                    <h1 className="knockout-text">{knockoutMessage}</h1>
                </div>
            )}

            <style jsx>{`
                .loadout-hud {
                    position: absolute; bottom: 20px; left: 20px;
                    display: flex; gap: 10px;
                }
                .hud-slot {
                    width: 60px; height: 60px; border: 2px solid #555;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.5); border-radius: 8px; position: relative;
                }
                .hud-slot.ready { border-color: #00ff87; box-shadow: 0 0 15px rgba(0,255,135,0.5); }
                .hud-icon { font-size: 2rem; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 6px; opacity: 0.5; }
                .hud-slot.ready .hud-icon { opacity: 1; }
                .key-hint { position: absolute; bottom: 0; right: 5px; font-size: 10px; color: #aaa; }
                
                .active-powerup-alert {
                    position: absolute; bottom: 100px; width: 100%; text-align: center;
                    color: #fff; font-family: 'Orbitron'; font-weight: bold; text-shadow: 0 0 10px black;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.8; } }
            `}</style>
        </div>
    );
}

// Victory Screen Overlay
export function VictoryScreen({ winner, scores, onRestart, onMenu }) {
    return (
        <div className="menu-screen victory-screen">
            <h1 className="game-title">GAME OVER</h1>
            <h2 className="victory-text">{winner} WINS!</h2>

            <div className="final-score">
                <span style={{ color: '#00d4ff' }}>{scores.player1}</span>
                <span className="divider">-</span>
                <span style={{ color: '#ff006e' }}>{scores.player2}</span>
            </div>

            <div className="menu-buttons">
                <button className="btn btn-primary" onClick={onMenu}>BACK TO MENU</button>
            </div>
        </div>
    );
}

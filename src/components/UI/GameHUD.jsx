import React, { useEffect, useState, useRef } from 'react';
import { getPowerupInfo } from '../../utils/powerups';

// ============================================
// ANIMATED DAMAGE COUNTER
// ============================================
function DamageCounter({ value, position = 'left' }) {
    const [displayValue, setDisplayValue] = useState(value);
    const [flash, setFlash] = useState(false);
    const prevValue = useRef(value);
    
    useEffect(() => {
        if (value !== prevValue.current) {
            setFlash(true);
            const timer = setTimeout(() => setFlash(false), 200);
            
            // Animate number counting
            const diff = value - prevValue.current;
            const steps = Math.min(Math.abs(diff), 20);
            const stepValue = diff / steps;
            let current = prevValue.current;
            
            const interval = setInterval(() => {
                current += stepValue;
                setDisplayValue(Math.floor(current));
                if ((diff > 0 && current >= value) || (diff < 0 && current <= value)) {
                    clearInterval(interval);
                    setDisplayValue(value);
                }
            }, 20);
            
            prevValue.current = value;
            return () => { clearInterval(interval); clearTimeout(timer); };
        }
    }, [value]);
    
    const color = value < 50 ? '#ffffff' : value < 100 ? '#ffff00' : value < 150 ? '#ff8800' : '#ff0000';
    const scale = 1 + Math.min(value / 300, 0.4);
    
    return (
        <div 
            className={`damage-counter ${flash ? 'flash' : ''} ${value > 100 ? 'critical' : ''}`}
            style={{ 
                color,
                transform: `scale(${scale})`,
                textAlign: position === 'left' ? 'left' : 'right'
            }}
        >
            {Math.floor(displayValue)}%
        </div>
    );
}

// ============================================
// STOCK DISPLAY
// ============================================
function StockDisplay({ stocks, maxStocks = 3, color }) {
    if (stocks === undefined || stocks === Infinity) return null;
    
    return (
        <div className="stock-display">
            {Array.from({ length: maxStocks }).map((_, i) => (
                <div 
                    key={i}
                    className={`stock-icon ${i < stocks ? 'active' : 'empty'}`}
                    style={{ backgroundColor: i < stocks ? color : 'transparent' }}
                />
            ))}
        </div>
    );
}

// ============================================
// LOADOUT SLOT
// ============================================
function LoadoutSlot({ powerupId, isActive, keyHint, cooldownPercent = 0 }) {
    const info = getPowerupInfo(powerupId);
    if (!info) return null;
    
    return (
        <div className={`loadout-slot ${isActive ? 'active' : ''}`}>
            <div 
                className="slot-icon" 
                style={{ backgroundColor: isActive ? info.color : '#333' }}
            >
                {info.imagePath ? (
                    <img src={info.imagePath} alt={info.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <span className="icon-fallback" style={{ display: info.imagePath ? 'none' : 'flex' }}>{info.icon}</span>
            </div>
            {cooldownPercent > 0 && (
                <div className="cooldown-overlay" style={{ height: `${cooldownPercent}%` }} />
            )}
            <div className="key-hint">{keyHint}</div>
        </div>
    );
}

// ============================================
// GAME TIMER
// ============================================
function GameTimer({ seconds }) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const isLowTime = seconds <= 30;
    
    return (
        <div className={`game-timer ${isLowTime ? 'low-time' : ''}`}>
            <span className="timer-value">
                {minutes}:{secs.toString().padStart(2, '0')}
            </span>
            {seconds === 0 && <span className="overtime">OVERTIME</span>}
        </div>
    );
}

// ============================================
// GAME MODE INDICATOR
// ============================================
function GameModeIndicator({ mode }) {
    const modeLabels = {
        knockout: 'KNOCKOUT',
        survival: 'SURVIVAL',
        timed: 'TIMED MATCH',
        chaos: 'CHAOS MODE'
    };
    
    return (
        <div className="game-mode-indicator">
            {modeLabels[mode] || mode?.toUpperCase()}
        </div>
    );
}

// ============================================
// COMBO COUNTER
// ============================================
function ComboCounter({ combo, lastHitTime }) {
    const [visible, setVisible] = useState(false);
    
    useEffect(() => {
        if (combo > 1) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [combo, lastHitTime]);
    
    if (!visible || combo <= 1) return null;
    
    return (
        <div className="combo-counter">
            <span className="combo-value">{combo}x</span>
            <span className="combo-label">COMBO</span>
        </div>
    );
}

// ============================================
// KNOCKOUT ANNOUNCEMENT
// ============================================
function KnockoutAnnouncement({ message }) {
    if (!message) return null;
    
    return (
        <div className="knockout-announcement">
            <h1>{message}</h1>
        </div>
    );
}

// ============================================
// POWERUP NOTIFICATION
// ============================================
function PowerupNotification({ powerup }) {
    if (!powerup) return null;
    
    const info = typeof powerup === 'string' ? getPowerupInfo(powerup) : powerup;
    if (!info) return null;
    
    return (
        <div className="powerup-notification" style={{ borderColor: info.color }}>
            <span className="powerup-icon">{info.icon}</span>
            <span className="powerup-name">{info.name}</span>
            <span className="powerup-hint">SPACE to use</span>
        </div>
    );
}

// ============================================
// MAIN HUD COMPONENT
// ============================================
export default function GameHUD({ 
    scores, 
    timer, 
    activePowerup, 
    loadout = [],
    damageStats,
    stocks,
    knockoutMessage, 
    gameStatus,
    gameMode = 'knockout',
    combo = 0,
    lastHitTime = 0,
    players = [],
    localPlayerId
}) {
    return (
        <div className="game-hud">
            {/* Top Bar */}
            <div className="hud-top">
                {/* Player 1 (Local) */}
                <div className="player-panel left">
                    <div className="player-info">
                        <span className="player-name" style={{ color: '#00d4ff' }}>YOU</span>
                        <span className="player-score">{scores?.player1 || 0}</span>
                    </div>
                    <DamageCounter value={damageStats?.player1 || 0} position="left" />
                    <StockDisplay stocks={stocks?.player1} color="#00d4ff" />
                </div>
                
                {/* Center: Timer & Mode */}
                <div className="center-panel">
                    <GameModeIndicator mode={gameMode} />
                    <GameTimer seconds={timer || 0} />
                </div>
                
                {/* Player 2 (Opponent) */}
                <div className="player-panel right">
                    <div className="player-info">
                        <span className="player-score">{scores?.player2 || 0}</span>
                        <span className="player-name" style={{ color: '#ff006e' }}>RIVAL</span>
                    </div>
                    <DamageCounter value={damageStats?.player2 || 0} position="right" />
                    <StockDisplay stocks={stocks?.player2} color="#ff006e" />
                </div>
            </div>
            
            {/* Bottom: Loadout */}
            <div className="hud-bottom">
                <div className="loadout-container">
                    {loadout.map((id, index) => (
                        <LoadoutSlot
                            key={id}
                            powerupId={id}
                            isActive={activePowerup?.id === id}
                            keyHint={index + 1}
                        />
                    ))}
                </div>
                
                <PowerupNotification powerup={activePowerup} />
            </div>
            
            {/* Combo */}
            <ComboCounter combo={combo} lastHitTime={lastHitTime} />
            
            {/* Knockout overlay */}
            <KnockoutAnnouncement message={knockoutMessage} />

            <style jsx>{`
                .game-hud {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    font-family: 'Orbitron', 'Segoe UI', sans-serif;
                    z-index: 100;
                }
                
                .hud-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 15px 20px;
                }
                
                .player-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-width: 180px;
                }
                .player-panel.right { align-items: flex-end; }
                
                .player-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .player-name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                .player-score {
                    font-size: 2rem;
                    font-weight: 900;
                    color: #fff;
                    text-shadow: 0 0 20px rgba(255,255,255,0.5);
                }
                
                .damage-counter {
                    font-size: 2.5rem;
                    font-weight: 900;
                    transition: all 0.15s ease-out;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                .damage-counter.flash {
                    transform: scale(1.3) !important;
                }
                .damage-counter.critical {
                    animation: shake 0.1s infinite;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-2px); }
                    75% { transform: translateX(2px); }
                }
                
                .stock-display {
                    display: flex;
                    gap: 6px;
                }
                .stock-icon {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid currentColor;
                    transition: all 0.3s;
                }
                .stock-icon.empty {
                    opacity: 0.3;
                }
                
                .center-panel {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                }
                
                .game-mode-indicator {
                    font-size: 0.7rem;
                    color: #888;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                }
                
                .game-timer {
                    background: rgba(0,0,0,0.6);
                    padding: 8px 25px;
                    border-radius: 25px;
                    border: 2px solid #333;
                }
                .game-timer.low-time {
                    border-color: #ff0000;
                    animation: pulse-red 0.5s infinite;
                }
                .timer-value {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #fff;
                }
                .overtime {
                    display: block;
                    font-size: 0.6rem;
                    color: #ff0000;
                    text-align: center;
                }
                
                @keyframes pulse-red {
                    0%, 100% { box-shadow: 0 0 0 rgba(255,0,0,0); }
                    50% { box-shadow: 0 0 20px rgba(255,0,0,0.5); }
                }
                
                .hud-bottom {
                    position: absolute;
                    bottom: 20px;
                    left: 0;
                    right: 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    padding: 0 20px;
                }
                
                .loadout-container {
                    display: flex;
                    gap: 10px;
                }
                
                .loadout-slot {
                    width: 60px;
                    height: 60px;
                    background: rgba(0,0,0,0.7);
                    border: 2px solid #444;
                    border-radius: 10px;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.2s;
                }
                .loadout-slot.active {
                    border-color: #00ff87;
                    box-shadow: 0 0 15px rgba(0,255,135,0.5);
                }
                
                .slot-icon {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.8rem;
                    border-radius: 8px;
                }
                .slot-icon img {
                    width: 70%;
                    height: 70%;
                    object-fit: contain;
                }
                .icon-fallback {
                    align-items: center;
                    justify-content: center;
                }
                
                .cooldown-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(0,0,0,0.7);
                    transition: height 0.1s linear;
                }
                
                .key-hint {
                    position: absolute;
                    bottom: 2px;
                    right: 5px;
                    font-size: 0.65rem;
                    color: #666;
                }
                
                .powerup-notification {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(0,0,0,0.8);
                    padding: 10px 20px;
                    border-radius: 8px;
                    border-left: 4px solid;
                    animation: slide-in 0.3s ease-out;
                }
                .powerup-icon { font-size: 1.5rem; }
                .powerup-name { 
                    font-weight: 700; 
                    color: #fff;
                    font-size: 1rem;
                }
                .powerup-hint {
                    font-size: 0.7rem;
                    color: #888;
                    padding: 3px 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                }
                
                @keyframes slide-in {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .combo-counter {
                    position: absolute;
                    right: 30px;
                    top: 50%;
                    transform: translateY(-50%);
                    text-align: center;
                    animation: combo-pop 0.3s ease-out;
                }
                .combo-value {
                    display: block;
                    font-size: 3rem;
                    font-weight: 900;
                    color: #ffd700;
                    text-shadow: 0 0 30px rgba(255,215,0,0.7);
                }
                .combo-label {
                    font-size: 0.8rem;
                    color: #888;
                    letter-spacing: 3px;
                }
                
                @keyframes combo-pop {
                    0% { transform: translateY(-50%) scale(0.5); opacity: 0; }
                    50% { transform: translateY(-50%) scale(1.2); }
                    100% { transform: translateY(-50%) scale(1); opacity: 1; }
                }
                
                .knockout-announcement {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.3);
                    animation: ko-flash 0.1s ease-out;
                }
                .knockout-announcement h1 {
                    font-size: 5rem;
                    font-weight: 900;
                    color: #fff;
                    text-shadow: 
                        0 0 20px rgba(255,0,0,0.8),
                        0 0 60px rgba(255,0,0,0.5);
                    animation: ko-shake 0.5s ease-out;
                }
                
                @keyframes ko-flash {
                    0% { background: rgba(255,255,255,0.8); }
                    100% { background: rgba(0,0,0,0.3); }
                }
                @keyframes ko-shake {
                    0%, 100% { transform: scale(1) rotate(0); }
                    10% { transform: scale(1.1) rotate(-2deg); }
                    20% { transform: scale(1.15) rotate(2deg); }
                    30% { transform: scale(1.1) rotate(-1deg); }
                    40% { transform: scale(1.05) rotate(1deg); }
                }
            `}</style>
        </div>
    );
}

// ============================================
// VICTORY SCREEN
// ============================================
export function VictoryScreen({ winner, scores, stats, onRestart, onMenu }) {
    return (
        <div className="victory-screen">
            <div className="victory-content">
                <h1 className="game-over-text">GAME OVER</h1>
                <h2 className="winner-text">{winner} WINS!</h2>
                
                <div className="final-scores">
                    <div className="score-box p1">
                        <span className="score">{scores?.player1 || 0}</span>
                        <span className="label">YOU</span>
                    </div>
                    <span className="vs">VS</span>
                    <div className="score-box p2">
                        <span className="score">{scores?.player2 || 0}</span>
                        <span className="label">RIVAL</span>
                    </div>
                </div>
                
                {stats && (
                    <div className="match-stats">
                        <div className="stat">
                            <span className="stat-value">{Math.floor(stats.totalDamage || 0)}</span>
                            <span className="stat-label">Total Damage</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{stats.maxCombo || 0}x</span>
                            <span className="stat-label">Max Combo</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{stats.stomps || 0}</span>
                            <span className="stat-label">Stomps</span>
                        </div>
                    </div>
                )}
                
                <div className="victory-buttons">
                    <button className="btn-primary" onClick={onRestart}>REMATCH</button>
                    <button className="btn-secondary" onClick={onMenu}>MENU</button>
                </div>
            </div>

            <style jsx>{`
                .victory-screen {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 200;
                    animation: fade-in 0.5s;
                }
                
                .victory-content {
                    text-align: center;
                    animation: scale-in 0.5s ease-out;
                }
                
                .game-over-text {
                    font-size: 1.5rem;
                    color: #666;
                    letter-spacing: 10px;
                    margin-bottom: 10px;
                }
                
                .winner-text {
                    font-size: 4rem;
                    font-weight: 900;
                    background: linear-gradient(135deg, #ffd700, #ff8c00);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 40px;
                }
                
                .final-scores {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 40px;
                    margin-bottom: 30px;
                }
                
                .score-box {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .score-box .score {
                    font-size: 4rem;
                    font-weight: 900;
                }
                .score-box.p1 .score { color: #00d4ff; }
                .score-box.p2 .score { color: #ff006e; }
                .score-box .label {
                    font-size: 0.9rem;
                    color: #888;
                    letter-spacing: 2px;
                }
                
                .vs {
                    font-size: 1.5rem;
                    color: #444;
                }
                
                .match-stats {
                    display: flex;
                    gap: 40px;
                    justify-content: center;
                    margin-bottom: 40px;
                    padding: 20px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                }
                
                .stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #fff;
                }
                .stat-label {
                    font-size: 0.7rem;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .victory-buttons {
                    display: flex;
                    gap: 20px;
                    justify-content: center;
                }
                
                .btn-primary, .btn-secondary {
                    padding: 15px 40px;
                    font-size: 1rem;
                    font-weight: 700;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    pointer-events: auto;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #00d4ff, #0099ff);
                    color: #fff;
                }
                .btn-primary:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 30px rgba(0,212,255,0.5);
                }
                
                .btn-secondary {
                    background: transparent;
                    border: 2px solid #444;
                    color: #888;
                }
                .btn-secondary:hover {
                    border-color: #666;
                    color: #fff;
                }
                
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes scale-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

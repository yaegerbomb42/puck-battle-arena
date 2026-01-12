import React, { useState, useCallback, useEffect } from 'react';
import './SpectatorMode.css';

/**
 * Spectator Mode Component
 * Allows users to watch live matches without participating
 */
export default function SpectatorMode({
    isSpectating,
    onExitSpectator,
    players,
    gameTimer,
    playerScores,
    playerStocks
}) {
    const [focusedPlayer, setFocusedPlayer] = useState(null);
    const [showPlayerList, setShowPlayerList] = useState(true);
    const [autoFollow, setAutoFollow] = useState(true);

    // Auto-follow the player with highest score/most action
    useEffect(() => {
        if (!autoFollow || !players || players.length === 0) return;

        // Find player with highest score
        let topPlayer = players[0]?.id;
        let topScore = 0;

        Object.entries(playerScores || {}).forEach(([id, score]) => {
            if (score > topScore) {
                topScore = score;
                topPlayer = id;
            }
        });

        setFocusedPlayer(topPlayer);
    }, [autoFollow, players, playerScores]);

    if (!isSpectating) return null;

    return (
        <div className="spectator-overlay">
            {/* Top bar */}
            <div className="spectator-top-bar">
                <div className="spectator-badge">
                    <span className="live-dot" />
                    SPECTATING
                </div>
                <div className="spectator-timer">
                    {Math.floor(gameTimer / 60)}:{String(gameTimer % 60).padStart(2, '0')}
                </div>
                <button className="exit-spectator-btn" onClick={onExitSpectator}>
                    ✕ Exit
                </button>
            </div>

            {/* Player list sidebar */}
            <div className={`spectator-sidebar ${showPlayerList ? 'open' : ''}`}>
                <button
                    className="toggle-sidebar-btn"
                    onClick={() => setShowPlayerList(!showPlayerList)}
                >
                    {showPlayerList ? '◀' : '▶'}
                </button>

                {showPlayerList && (
                    <div className="player-list">
                        <h3>Players</h3>
                        {players?.map(player => (
                            <div
                                key={player.id}
                                className={`spectator-player-item ${focusedPlayer === player.id ? 'focused' : ''}`}
                                onClick={() => {
                                    setFocusedPlayer(player.id);
                                    setAutoFollow(false);
                                }}
                            >
                                <div
                                    className="player-color-dot"
                                    style={{ backgroundColor: player.color }}
                                />
                                <span className="player-name">{player.name}</span>
                                <span className="player-stats">
                                    {playerScores?.[player.id] || 0} pts
                                    {playerStocks?.[player.id] !== undefined && (
                                        <span className="stocks">
                                            {'❤️'.repeat(Math.max(0, playerStocks[player.id]))}
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}

                        <label className="auto-follow-toggle">
                            <input
                                type="checkbox"
                                checked={autoFollow}
                                onChange={e => setAutoFollow(e.target.checked)}
                            />
                            Auto-follow leader
                        </label>
                    </div>
                )}
            </div>

            {/* Controls hint */}
            <div className="spectator-controls-hint">
                <span>Click player to focus</span>
                <span>•</span>
                <span>Scroll to zoom</span>
            </div>
        </div>
    );
}

// Hook to manage spectator state
export function useSpectator() {
    const [isSpectating, setIsSpectating] = useState(false);
    const [spectatorRoomId, setSpectatorRoomId] = useState(null);

    const joinAsSpectator = useCallback((roomId) => {
        setSpectatorRoomId(roomId);
        setIsSpectating(true);
    }, []);

    const exitSpectator = useCallback(() => {
        setIsSpectating(false);
        setSpectatorRoomId(null);
    }, []);

    return {
        isSpectating,
        spectatorRoomId,
        joinAsSpectator,
        exitSpectator
    };
}

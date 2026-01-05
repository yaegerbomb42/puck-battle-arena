import { useState, useCallback, useRef, useEffect } from 'react';
import { PHYSICS_CONFIG, POWERUP_TYPES, getRandomPowerupType, getRandomPowerupPosition } from '../utils/physics';

// Initial game state
const initialState = {
    gameStatus: 'menu', // 'menu', 'playing', 'paused', 'gameover'
    scores: { player1: 0, player2: 0 },
    timer: 120, // 2 minute matches
    winner: null,
    knockoutMessage: null,
    powerups: [],
    playerPowerups: { player1: null, player2: null },
};

export function useGameState() {
    const [state, setState] = useState(initialState);
    const timerRef = useRef(null);
    const powerupSpawnRef = useRef(null);
    const nextPowerupId = useRef(0);

    // Start game
    const startGame = useCallback(() => {
        setState({
            ...initialState,
            gameStatus: 'playing',
            timer: 120,
        });
    }, []);

    // Pause/Resume
    const togglePause = useCallback(() => {
        setState(prev => ({
            ...prev,
            gameStatus: prev.gameStatus === 'playing' ? 'paused' : 'playing',
        }));
    }, []);

    // Return to menu
    const returnToMenu = useCallback(() => {
        setState(initialState);
    }, []);

    // Record knockout
    const recordKnockout = useCallback((scoringPlayer) => {
        setState(prev => {
            const newScores = { ...prev.scores };
            newScores[scoringPlayer]++;

            // Check for win condition (first to 5)
            const winner = newScores.player1 >= 5 ? 'player1' :
                newScores.player2 >= 5 ? 'player2' : null;

            return {
                ...prev,
                scores: newScores,
                knockoutMessage: scoringPlayer === 'player1' ? 'KNOCKOUT!' : 'KNOCKOUT!',
                gameStatus: winner ? 'gameover' : prev.gameStatus,
                winner,
            };
        });

        // Clear knockout message after delay
        setTimeout(() => {
            setState(prev => ({ ...prev, knockoutMessage: null }));
        }, 1500);
    }, []);

    // Spawn power-up
    const spawnPowerup = useCallback(() => {
        setState(prev => {
            if (prev.powerups.length >= PHYSICS_CONFIG.powerups.maxOnField) {
                return prev;
            }

            const type = getRandomPowerupType();
            const position = getRandomPowerupPosition();

            return {
                ...prev,
                powerups: [
                    ...prev.powerups,
                    {
                        id: nextPowerupId.current++,
                        type,
                        position,
                    },
                ],
            };
        });
    }, []);

    // Collect power-up
    const collectPowerup = useCallback((powerupId, player) => {
        setState(prev => {
            const powerup = prev.powerups.find(p => p.id === powerupId);
            if (!powerup) return prev;

            const newPowerups = prev.powerups.filter(p => p.id !== powerupId);
            const newPlayerPowerups = { ...prev.playerPowerups };
            newPlayerPowerups[player] = powerup.type;

            // Auto-clear power-up after duration
            if (powerup.type.duration > 0) {
                setTimeout(() => {
                    setState(p => ({
                        ...p,
                        playerPowerups: { ...p.playerPowerups, [player]: null },
                    }));
                }, powerup.type.duration);
            }

            return {
                ...prev,
                powerups: newPowerups,
                playerPowerups: newPlayerPowerups,
            };
        });
    }, []);

    // Timer effect
    useEffect(() => {
        if (state.gameStatus === 'playing') {
            timerRef.current = setInterval(() => {
                setState(prev => {
                    if (prev.timer <= 0) {
                        // Time's up - determine winner
                        const winner = prev.scores.player1 > prev.scores.player2 ? 'player1' :
                            prev.scores.player2 > prev.scores.player1 ? 'player2' : null;
                        return {
                            ...prev,
                            gameStatus: 'gameover',
                            winner,
                        };
                    }
                    return { ...prev, timer: prev.timer - 1 };
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [state.gameStatus]);

    // Power-up spawn effect
    useEffect(() => {
        if (state.gameStatus === 'playing') {
            const scheduleNextSpawn = () => {
                const { minSpawnInterval, maxSpawnInterval } = PHYSICS_CONFIG.powerups;
                const delay = minSpawnInterval + Math.random() * (maxSpawnInterval - minSpawnInterval);

                powerupSpawnRef.current = setTimeout(() => {
                    spawnPowerup();
                    scheduleNextSpawn();
                }, delay);
            };

            scheduleNextSpawn();
        }

        return () => {
            if (powerupSpawnRef.current) clearTimeout(powerupSpawnRef.current);
        };
    }, [state.gameStatus, spawnPowerup]);

    return {
        ...state,
        startGame,
        togglePause,
        returnToMenu,
        recordKnockout,
        collectPowerup,
    };
}

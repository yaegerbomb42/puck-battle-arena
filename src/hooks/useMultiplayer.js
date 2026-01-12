import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import CONFIG from '../utils/config';

export function useMultiplayer() {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [roomCode, setRoomCode] = useState(localStorage.getItem(CONFIG.STORAGE_KEYS.ROOM_CODE) || null);
    const [playerId, setPlayerId] = useState(localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYER_ID) || null);
    const [players, setPlayers] = useState([]);
    const [gameState, setGameState] = useState('disconnected'); // disconnected, lobby, playing, ended

    // ... rest of state ...
    const [playerColor, setPlayerColor] = useState('#00d4ff');
    const [playerIndex, setPlayerIndex] = useState(0);
    const [scores, setScores] = useState({});
    const [serverPowerups, setServerPowerups] = useState([]);
    const [winner, setWinner] = useState(null);
    const [selectedMap, setSelectedMap] = useState('PROCEDURAL');
    const [selectedMode, setSelectedMode] = useState('knockout');
    const [seed, setSeed] = useState(null);
    const [mapVotes, setMapVotes] = useState({});
    const [timer, setTimer] = useState(null); // Server authoritative timer

    // Offline / Error State (Missing in previous version)
    const [isOffline, setIsOffline] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    // Spectator Mode
    const [isSpectating, setIsSpectating] = useState(false);
    const [spectatorRoomId, setSpectatorRoomId] = useState(null);

    // Event handlers ref
    const handlersRef = useRef({});

    const enableOfflineMode = useCallback(() => {
        setIsOffline(true);
        setConnected(true); // Fake connection
        setGameState('lobby');
        setPlayers([
            { id: 'offline_p1', name: 'Player 1', color: '#00d4ff', ready: false, isLocal: true },
            { id: 'offline_bot', name: 'Bot', color: '#ff0000', ready: true, isBot: true }
        ]);
        setRoomCode('OFFLINE');
    }, []);

    const leaveRoom = useCallback(() => {
        if (socket) {
            socket.emit('leaveRoom');
        }
        setRoomCode(null);
        setPlayers([]);
        setGameState('disconnected');
        setScores({});
        setWinner(null);
        setServerPowerups([]);
        setSeed(null);
        setIsOffline(false); // Reset offline mode
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ROOM_CODE);
    }, [socket]);

    // Connect to server
    useEffect(() => {
        const newSocket = io(CONFIG.SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: CONFIG.CONNECTION.RECONNECTION_ATTEMPTS,
            reconnectionDelay: CONFIG.CONNECTION.RECONNECTION_DELAY
        });

        newSocket.on('connect', () => {
            console.log('✅ Connected to server:', CONFIG.SERVER_URL);
            setConnected(true);
            setSocket(newSocket);
            setConnectionError(null);

            // Attempt session recovery if we have data
            const savedRoom = localStorage.getItem(CONFIG.STORAGE_KEYS.ROOM_CODE);
            const savedId = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYER_ID);
            const savedName = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYER_NAME);

            if (savedRoom && savedId && savedName) {
                console.log('🔄 Attempting session recovery for room:', savedRoom);
                newSocket.emit('joinRoom', {
                    roomCode: savedRoom,
                    playerName: savedName,
                    playerId: savedId // Sending ID hints to server this is a rejoin
                }, (response) => {
                    if (response.success) {
                        console.log('✅ Session recovered!');
                        setRoomCode(response.roomCode);
                        setPlayerId(response.playerId);
                        setPlayerColor(response.color);
                        setPlayerIndex(response.playerIndex);
                        setPlayers(response.players);
                        setGameState('lobby');
                    } else {
                        // Invalid session, clear storage
                        localStorage.removeItem(CONFIG.STORAGE_KEYS.ROOM_CODE);
                        localStorage.removeItem(CONFIG.STORAGE_KEYS.PLAYER_ID);
                    }
                });
            }
        });

        newSocket.on('connect_error', (err) => {
            console.warn('⚠️ Connection error:', err.message);
            setConnectionError(err.message);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            setConnected(false);
            setGameState('disconnected');
        });

        // ... (rest of listeners omitted for brevity, keeping existing) ...

        newSocket.on('playerUpdate', (playerList) => {
            setPlayers(playerList);
        });

        newSocket.on('playerJoined', (player) => {
            console.log('👤 Player joined:', player.name || player.id);
        });

        newSocket.on('playerLeft', ({ playerId }) => {
            console.log('👤 Player left:', playerId);
        });

        newSocket.on('gameStart', ({ players, selectedMap, seed, mode }) => {
            setGameState('playing');
            if (players) setPlayers(players);
            if (selectedMap) setSelectedMap(selectedMap);
            if (seed) setSeed(seed);
            if (mode) setSelectedMode(mode);
            setScores({});
        });

        newSocket.on('mapVoted', ({ mapName, votes }) => {
            setSelectedMap(mapName);
            if (votes) setMapVotes(votes);
        });

        newSocket.on('modeSelected', ({ mode }) => {
            setSelectedMode(mode);
        });

        newSocket.on('playerMoved', (data) => {
            handlersRef.current.onPlayerMoved?.(data);
        });

        newSocket.on('knockout', ({ scorerId, knockedOutId, scores: newScores }) => {
            setScores(newScores);
            handlersRef.current.onKnockout?.(scorerId, knockedOutId);
        });

        newSocket.on('stomp', ({ attackerId, targetId, damage }) => {
            handlersRef.current.onStomp?.(attackerId, targetId, damage);
        });

        newSocket.on('damageUpdate', ({ playerId, damage }) => {
            handlersRef.current.onDamageUpdate?.(playerId, damage);
        });

        newSocket.on('powerupSpawned', (powerup) => {
            setServerPowerups(prev => [...prev, powerup]);
        });

        newSocket.on('powerupRemoved', ({ powerupId }) => {
            setServerPowerups(prev => prev.filter(p => p.id !== powerupId));
        });

        newSocket.on('powerupCollected', ({ powerupId, playerId }) => {
            setServerPowerups(prev => prev.filter(p => p.id !== powerupId));
            handlersRef.current.onPowerupCollected?.(powerupId, playerId);
        });

        newSocket.on('powerupUsed', ({ playerId, powerupId, position }) => {
            handlersRef.current.onPowerupUsed?.(playerId, powerupId, position);
        });

        newSocket.on('powerupRejected', ({ powerupId }) => {
            handlersRef.current.onPowerupRejected?.(powerupId);
        });

        newSocket.on('gameOver', ({ winnerId, scores: finalScores, stats }) => {
            setScores(finalScores);
            setWinner(winnerId);
            setGameState('ended');
            handlersRef.current.onGameOver?.(winnerId, finalScores, stats);
        });

        newSocket.on('rewardEarned', ({ packs, credits, isWinner }) => {
            console.log(`🎉 Reward: ${packs} packs, ${credits} credits`);
            handlersRef.current.onRewardEarned?.({ packs, credits, isWinner });
        });

        newSocket.on('timerUpdate', (timeRemaining) => {
            setTimer(timeRemaining);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // ========== ROOM ACTIONS ==========

    const createRoom = useCallback((playerName, userEmail) => {
        if (!socket) return;
        socket.emit('createRoom', { playerName, userEmail }, (response) => {
            if (response.success) {
                setRoomCode(response.roomCode);
                setPlayerId(response.playerId);
                setPlayerColor(response.color);
                setPlayerIndex(response.playerIndex);
                setPlayers(response.players);
                setGameState('lobby');

                // Persist session
                localStorage.setItem(CONFIG.STORAGE_KEYS.ROOM_CODE, response.roomCode);
                localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYER_ID, response.playerId);
                localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYER_NAME, playerName);
            }
        });
    }, [socket]);

    const joinRoom = useCallback((code, playerName, userEmail) => {
        if (!socket) return Promise.reject('Not connected');
        return new Promise((resolve, reject) => {
            socket.emit('joinRoom', { roomCode: code, playerName, userEmail }, (response) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setPlayerId(response.playerId);
                    setPlayerColor(response.color);
                    setPlayerIndex(response.playerIndex);
                    setPlayers(response.players);
                    setGameState('lobby');

                    // Persist session
                    localStorage.setItem(CONFIG.STORAGE_KEYS.ROOM_CODE, response.roomCode);
                    localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYER_ID, response.playerId);
                    localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYER_NAME, playerName);

                    resolve(response);
                } else {
                    reject(response.error);
                }
            });
        });
    }, [socket]);

    const quickJoin = useCallback((playerName, userEmail) => {
        if (!socket) return;
        socket.emit('quickJoin', { playerName, userEmail }, (response) => {
            if (response.success) {
                setRoomCode(response.roomCode);
                setPlayerId(response.playerId);
                setPlayerColor(response.color);
                setPlayerIndex(response.playerIndex);
                setPlayers(response.players);
                setGameState('lobby');
            }
        });
    }, [socket]);

    const setReady = useCallback((ready) => {
        if (isOffline) {
            setGameState('playing');
            setPlayers(prev => prev.map(p => ({ ...p, ready: true })));
            if (!seed) setSeed(Math.floor(Math.random() * 1000000));
            return;
        }
        if (!socket) return;

        // Optimistic update
        setPlayers(prev => prev.map(p =>
            p.id === playerId ? { ...p, ready } : p
        ));

        socket.emit('playerReady', { ready });
    }, [socket, isOffline, seed, playerId]);

    const voteMap = useCallback((mapName) => {
        if (isOffline) {
            setSelectedMap(mapName);
            return;
        }
        if (!socket) return;

        // Update vote tracking: { mapName: [voterId1, voterId2, ...] }
        setMapVotes(prev => {
            const newVotes = { ...prev };
            // Remove previous vote from this player
            Object.keys(newVotes).forEach(map => {
                newVotes[map] = (newVotes[map] || []).filter(id => id !== playerId);
            });
            // Add new vote
            if (!newVotes[mapName]) newVotes[mapName] = [];
            newVotes[mapName].push(playerId);
            return newVotes;
        });

        socket.emit('voteMap', { mapName });
    }, [socket, isOffline, playerId]);

    const selectMode = useCallback((mode) => {
        if (!socket) return;

        // Optimistic update
        setSelectedMode(mode);

        socket.emit('selectMode', { mode });
    }, [socket]);

    // ========== SPECTATOR MODE ==========
    const joinAsSpectator = useCallback((roomId) => {
        if (!socket) return;
        setSpectatorRoomId(roomId);
        setIsSpectating(true);
        socket.emit('joinSpectator', { roomId });
    }, [socket]);

    const exitSpectator = useCallback(() => {
        if (socket) {
            socket.emit('leaveSpectator');
        }
        setIsSpectating(false);
        setSpectatorRoomId(null);
    }, [socket]);

    // ========== GAME SETUP ACTIONS ==========

    // Duplicates removed - using unified definitions above

    // ========== GAMEPLAY ACTIONS ==========

    const sendPosition = useCallback((position, velocity, rotation) => {
        if (!socket || gameState !== 'playing') return;
        socket.emit('playerPosition', { position, velocity, rotation });
    }, [socket, gameState]);

    const reportKnockout = useCallback((knockedOutId) => {
        if (!socket) return;
        socket.emit('playerKnockout', { knockedOutId });
    }, [socket]);

    const reportStomp = useCallback((targetId, damage) => {
        if (!socket) return;
        socket.emit('reportStomp', { targetId, damage });
    }, [socket]);

    const reportDamage = useCallback((damage) => {
        if (!socket) return;
        socket.emit('playerDamage', { damage });
    }, [socket]);

    const collectPowerup = useCallback((powerupId) => {
        if (!socket) return;
        socket.emit('powerupCollected', { powerupId });
    }, [socket]);

    const usePowerup = useCallback((powerupId, targetPosition) => {
        if (!socket) return;
        socket.emit('usePowerup', { powerupId, targetPosition });
    }, [socket]);

    const reportGameEnd = useCallback((winnerId, finalScores, stats) => {
        if (!socket) return;
        socket.emit('reportGameEnd', { winnerId, scores: finalScores, stats });
    }, [socket]);

    const requestRematch = useCallback(() => {
        if (!socket) return;
        socket.emit('requestRematch');
        // Reset local state for new game
        setScores({});
        setWinner(null);
        setGameState('lobby');
    }, [socket]);

    // ========== HANDLER REGISTRATION ==========

    const registerHandlers = useCallback((handlers) => {
        handlersRef.current = handlers;
    }, []);

    return {
        // Connection state
        connected,
        socket,

        // Room state
        roomCode,
        playerId,
        playerColor,
        playerIndex,
        players,
        gameState,
        scores,
        serverPowerups,
        winner,
        selectedMap,
        selectedMode,
        seed,
        mapVotes,
        timer, // <--- Exposed to component

        // Offline / Error status
        connectionError,
        isOffline,
        enableOfflineMode,

        // Spectator Mode
        isSpectating,
        spectatorRoomId,
        joinAsSpectator,
        exitSpectator,

        // Room actions
        createRoom,
        joinRoom,
        quickJoin,
        setReady,
        leaveRoom,

        // Setup actions
        voteMap,
        selectMode,

        // Gameplay actions
        sendPosition,
        reportKnockout,
        reportStomp,
        reportDamage,
        collectPowerup,
        usePowerup,
        reportGameEnd,
        requestRematch,

        // Handlers
        registerHandlers
    };
}

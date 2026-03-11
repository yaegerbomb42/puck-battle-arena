import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    const [serverMessage, setServerMessage] = useState(() => {
        // [NEW] Load persistent message
        try {
            const saved = localStorage.getItem('server_message');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return null;
    }); // { type, message, duration }

    // Spectator Mode
    const [isSpectating, setIsSpectating] = useState(false);
    const [spectatorRoomId, setSpectatorRoomId] = useState(null);

    // Event handlers ref
    const handlersRef = useRef({});

    const enableOfflineMode = useCallback(() => {
        setIsOffline(true);
        setConnected(true); // Fake connection
        setGameState('lobby');
        setPlayerId('offline_p1');
        setPlayerColor('#00d4ff');
        setPlayerIndex(0);
        const localSkin = {
            skinId: parseInt(localStorage.getItem('equipped_skin') || '1001'),
            skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
            color: localStorage.getItem('player_color') || '#00d4ff'
        };

        // Random bot skin (High Tier Rare/Epic/Legendary)
        const botTier = Math.floor(Math.random() * 5) + 3; // Tier 3-7
        const botSkinId = 1 + Math.floor(Math.random() * 150);

        setPlayers([
            { 
                id: 'offline_p1', 
                name: 'Player 1', 
                color: localSkin.color, 
                ready: false, 
                isLocal: true,
                skinId: localSkin.skinId,
                skinTier: localSkin.skinTier,
                tier: localSkin.skinTier
            },
            { 
                id: 'offline_bot', 
                name: 'BOT', 
                color: '#ff006e', 
                ready: true, 
                isBot: true,
                skinId: botSkinId,
                skinTier: botTier,
                tier: botTier
            }
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
                    playerId: savedId, // Sending ID hints to server this is a rejoin
                    skinData: {
                        skinId: localStorage.getItem('equipped_skin'),
                        skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
                        color: localStorage.getItem('player_color') || '#00d4ff'
                    }
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

        // Maintenance / Server Messages
        newSocket.on('server_message', (msg) => {
            console.log('📢 Server Message:', msg);
            setServerMessage(msg);
            localStorage.setItem('server_message', JSON.stringify(msg));

            // Auto-clear notification after some time if it's not permanent
            if (msg.duration && msg.type !== 'maintenance') {
                setTimeout(() => {
                    setServerMessage(null);
                    localStorage.removeItem('server_message');
                }, msg.duration * 1000);
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // ========== ROOM ACTIONS ==========

    const createRoom = useCallback((playerName, userEmail) => {
        if (isOffline) {
            enableOfflineMode();
            return Promise.resolve({ success: true, roomCode: 'OFFLINE' });
        }
        if (!socket) return Promise.reject('Not connected to server.');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Server Timeout: Failed to create room'), 5000);

            const skinData = {
                skinId: localStorage.getItem('equipped_skin'),
                skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
                color: playerColor
            };

            socket.emit('createRoom', { playerName, userEmail, skinData }, (response) => {
                clearTimeout(timeout);
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
                    reject(response.error || 'Failed to create room');
                }
            });
        });
    }, [socket, isOffline, enableOfflineMode, playerColor]);

    const joinRoom = useCallback((code, playerName, userEmail) => {
        if (code === 'sandbox' || code === 'OFFLINE') {
            enableOfflineMode();
            return Promise.resolve({ success: true, roomCode: 'OFFLINE' });
        }
        if (!socket) return Promise.reject('Not connected to server. Play offline or try again.');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Server Timeout: Room not found or server unresponsive'), 5000);

            const skinData = {
                skinId: localStorage.getItem('equipped_skin'),
                skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
                color: playerColor
            };

            socket.emit('joinRoom', { roomCode: code, playerName, userEmail, skinData }, (response) => {
                clearTimeout(timeout);
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
                    reject(response.error || 'Room not found');
                }
            });
        });
    }, [socket, enableOfflineMode, playerColor]);

    const quickJoin = useCallback((playerName, userEmail) => {
        if (isOffline) {
            enableOfflineMode();
            return Promise.resolve({ success: true, roomCode: 'OFFLINE' });
        }
        if (!socket) return Promise.reject('Not connected to server.');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Server Timeout: Matchmaking unavailable'), 5000);

            const skinData = {
                skinId: localStorage.getItem('equipped_skin'),
                skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
                color: playerColor
            };

            socket.emit('quickJoin', { playerName, userEmail, skinData }, (response) => {
                clearTimeout(timeout);
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setPlayerId(response.playerId);
                    setPlayerColor(response.color);
                    setPlayerIndex(response.playerIndex);
                    setPlayers(response.players);
                    setGameState('lobby');
                    resolve(response);
                } else {
                    reject(response.error || 'Matchmaking failed');
                }
            });
        });
    }, [socket, isOffline, enableOfflineMode, playerColor]);

    const setReady = useCallback((ready) => {
        if (isOffline) {
            setGameState('playing');
            setPlayers(prev => prev.map(p => ({ ...p, ready: true })));

            // [IMPROVED] High-entropy seed for unique ID every time
            // Date.now() guarantees time difference, random adds noise
            const uniqueSeed = Date.now() + Math.floor(Math.random() * 100000);
            if (!seed) setSeed(uniqueSeed);
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
        // Optimistic update always
        setSelectedMode(mode);
        if (isOffline || !socket) return;
        socket.emit('selectMode', { mode });
    }, [socket, isOffline]);

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
        if (isOffline) {
            setGameState('finished');
            setWinner(winnerId);
            setScores(finalScores || {});
            return;
        }
        if (!socket) return;
        socket.emit('reportGameEnd', { winnerId, scores: finalScores, stats });
    }, [socket, isOffline]);

    const requestRematch = useCallback(() => {
        // Reset local state for new game
        setScores({});
        setWinner(null);
        if (isOffline) {
            // Offline: go back to lobby, player can ready up again
            setGameState('lobby');
            setPlayers([
                { 
                    id: 'offline_p1', 
                    name: 'Player 1', 
                    color: localStorage.getItem('player_color') || '#00d4ff', 
                    ready: false, 
                    isLocal: true,
                    skinId: parseInt(localStorage.getItem('equipped_skin') || '1001'),
                    skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
                    tier: parseInt(localStorage.getItem('equipped_skin_tier') || '0')
                },
                { 
                    id: 'offline_bot', 
                    name: 'BOT', 
                    color: '#ff006e', 
                    ready: true, 
                    isBot: true,
                    skinId: 1 + Math.floor(Math.random() * 150),
                    skinTier: Math.floor(Math.random() * 4) + 3, // Tier 3-6
                    tier: Math.floor(Math.random() * 4) + 3
                }
            ]);
            setSeed(null);
            return;
        }
        if (!socket) return;
        socket.emit('requestRematch');
        setGameState('lobby');
    }, [socket, isOffline]);

    const triggerTestMaintenance = useCallback(() => {
        const msg = {
            message: '⚠️ [TEST] Server Restarting in 2 minutes!',
            duration: 120,
            startTime: Date.now(),
            type: 'maintenance'
        };
        setServerMessage(msg);
        localStorage.setItem('server_message', JSON.stringify(msg));
        console.log('Test Maintenance Triggered');
    }, []);

    // ========== HANDLER REGISTRATION ==========

    const registerHandlers = useCallback((handlers) => {
        handlersRef.current = handlers;
    }, []);

    return useMemo(() => ({
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
        timer,

        // Offline / Error status
        connectionError,
        isOffline,
        enableOfflineMode,
        serverMessage,
        triggerTestMaintenance,

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
    }), [
        connected, socket, roomCode, playerId, playerColor, playerIndex, players,
        gameState, scores, serverPowerups, winner, selectedMap, selectedMode,
        seed, mapVotes, timer, connectionError, isOffline, enableOfflineMode,
        serverMessage, triggerTestMaintenance, isSpectating, spectatorRoomId,
        joinAsSpectator, exitSpectator, createRoom, joinRoom, quickJoin,
        setReady, leaveRoom, voteMap, selectMode, sendPosition,
        reportKnockout, reportStomp, reportDamage, collectPowerup,
        usePowerup, reportGameEnd, requestRematch, registerHandlers
    ]);
}

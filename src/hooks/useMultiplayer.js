import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Server URL - will use Render when deployed
let SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
if (SERVER_URL && !SERVER_URL.startsWith('http')) {
    SERVER_URL = `https://${SERVER_URL}`;
}

export function useMultiplayer() {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [roomCode, setRoomCode] = useState(null);
    const [playerId, setPlayerId] = useState(null);
    const [playerColor, setPlayerColor] = useState('#00d4ff');
    const [playerIndex, setPlayerIndex] = useState(0);
    const [players, setPlayers] = useState([]);
    const [gameState, setGameState] = useState('disconnected'); // disconnected, lobby, playing, ended
    const [scores, setScores] = useState({});
    const [serverPowerups, setServerPowerups] = useState([]);
    const [winner, setWinner] = useState(null);
    const [selectedMap, setSelectedMap] = useState('PROCEDURAL');
    const [selectedMode, setSelectedMode] = useState('knockout');
    const [seed, setSeed] = useState(null);
    const [mapVotes, setMapVotes] = useState({});

    // Event handlers ref
    const handlersRef = useRef({});

    // Connect to server
    useEffect(() => {
        const newSocket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => {
            console.log('✅ Connected to server');
            setConnected(true);
            setSocket(newSocket);
        });

        newSocket.on('connect_error', (err) => {
            console.warn('⚠️ Connection error:', err.message);
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
            setConnected(false);
            setGameState('disconnected');
        });

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
        if (!socket) return;
        socket.emit('playerReady', { ready });
    }, [socket]);

    const leaveRoom = useCallback(() => {
        if (socket) {
            socket.disconnect();
            socket.connect();
        }
        setRoomCode(null);
        setPlayers([]);
        setGameState('disconnected');
        setScores({});
        setWinner(null);
        setServerPowerups([]);
        setSeed(null);
    }, [socket]);

    // ========== GAME SETUP ACTIONS ==========

    const voteMap = useCallback((mapId) => {
        if (!socket) return;
        socket.emit('voteMap', { mapId });
    }, [socket]);

    const selectMode = useCallback((mode) => {
        if (!socket) return;
        setSelectedMode(mode);
        socket.emit('selectMode', { mode });
    }, [socket]);

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

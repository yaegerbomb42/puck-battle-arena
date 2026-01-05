import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// Server URL - will use Glitch when deployed
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';

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
    const [selectedMap, setSelectedMap] = useState('SAWBLADE CITY'); // NEW state

    // Event handlers ref to avoid stale closures
    const handlersRef = useRef({});

    // Connect to server
    useEffect(() => {
        const newSocket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('Connected to server');
            setConnected(true);
            setSocket(newSocket);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setConnected(false);
            setGameState('disconnected');
        });

        newSocket.on('playerUpdate', (playerList) => {
            setPlayers(playerList);
        });

        newSocket.on('playerJoined', (player) => {
            console.log('Player joined:', player.id);
        });

        newSocket.on('playerLeft', ({ playerId }) => {
            console.log('Player left:', playerId);
        });

        newSocket.on('gameStart', ({ players, selectedMap }) => {
            setGameState('playing');
            if (players) setPlayers(players);
            if (selectedMap) setSelectedMap(selectedMap); // Set map
            setScores({});
        });

        newSocket.on('mapVoted', ({ mapName }) => {
            setSelectedMap(mapName);
        });

        newSocket.on('playerMoved', (data) => {
            handlersRef.current.onPlayerMoved?.(data);
        });

        newSocket.on('knockout', ({ scorerId, knockedOutId, scores: newScores }) => {
            setScores(newScores);
            handlersRef.current.onKnockout?.(scorerId, knockedOutId);
        });

        newSocket.on('gameOver', ({ winnerId, scores: finalScores }) => {
            setScores(finalScores);
            setWinner(winnerId);
            setGameState('ended');
        });

        newSocket.on('powerupSpawned', (powerup) => {
            setServerPowerups(prev => [...prev, powerup]);
        });

        newSocket.on('powerupRemoved', ({ powerupId }) => {
            setServerPowerups(prev => prev.filter(p => p.id !== powerupId));
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Create room
    const createRoom = useCallback(() => {
        if (!socket) return;

        socket.emit('createRoom', (response) => {
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

    // Join room
    const joinRoom = useCallback((code) => {
        if (!socket) return Promise.reject('Not connected');

        return new Promise((resolve, reject) => {
            socket.emit('joinRoom', { roomCode: code }, (response) => {
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

    // Quick join
    const quickJoin = useCallback(() => {
        if (!socket) return;

        socket.emit('quickJoin', (response) => {
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

    // Set ready state
    const setReady = useCallback((ready) => {
        if (!socket) return;
        socket.emit('playerReady', { ready });
    }, [socket]);

    // Send position update
    const sendPosition = useCallback((position, velocity, rotation) => {
        if (!socket || gameState !== 'playing') return;
        socket.emit('playerPosition', { position, velocity, rotation });
    }, [socket, gameState]);

    // Report knockout
    const reportKnockout = useCallback((knockedOutId) => {
        if (!socket) return;
        socket.emit('playerKnockout', { knockedOutId });
    }, [socket]);

    // Report damage
    const reportDamage = useCallback((damage) => {
        if (!socket) return;
        socket.emit('playerDamage', { damage });
    }, [socket]);

    // Collect powerup
    const collectPowerup = useCallback((powerupId) => {
        if (!socket) return;
        socket.emit('powerupCollected', { powerupId });
    }, [socket]);

    // Register event handlers
    const registerHandlers = useCallback((handlers) => {
        handlersRef.current = handlers;
    }, []);

    // Leave and reset
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
    }, [socket]);

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
        selectedMap, // Return map

        // Actions
        createRoom,
        joinRoom,
        quickJoin,
        setReady,
        sendPosition,
        reportKnockout,
        collectPowerup,
        registerHandlers,
        leaveRoom,
    };
}

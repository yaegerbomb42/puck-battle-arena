import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import CONFIG from '../utils/config';

export function useMultiplayer(user) {
    const userEmail = user?.email;
    const uid = user?.uid;
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
    const [honors, setHonors] = useState(null); // [NEW] Track match honors
    const [selectedMap, setSelectedMap] = useState('PROCEDURAL');
    const [selectedMode, setSelectedMode] = useState('knockout');
    const [currentRegion, setCurrentRegion] = useState(CONFIG.REGIONS[0]);
    const [seed, setSeed] = useState(null);
    const [mapVotes, setMapVotes] = useState({});
    const [timer, setTimer] = useState(null); // Server authoritative timer
    const [lastServerTick, setLastServerTick] = useState(0);

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
    const [spectatorCount, setSpectatorCount] = useState(0);
    const [quests, setQuests] = useState([]);
    const [wagerAmount, setWagerAmount] = useState(0); // [NEW] Track active match wager

    // Matchmaking State
    const [matchmakingStatus, setMatchmakingStatus] = useState('idle'); // idle, searching
    const [dailyShop, setDailyShop] = useState({ items: [], lastRotation: 0 }); // [SHOP] Daily featured items
    
    // [NEW] Social State
    const [lastInvite, setLastInvite] = useState(null); // { inviterName, roomCode }
    const [chatMessages, setChatMessages] = useState([]); // [NEW] Global chat
    const [tradeInvite, setTradeInvite] = useState(null); // [TRADE] Incoming invite: { inviteId, fromUid, fromUsername }
    const [tradeSession, setTradeSession] = useState(null); // [TRADE] Active session data
    
    // Event handlers ref
    const handlersRef = useRef({});

    const enableOfflineMode = useCallback(() => {
        setIsOffline(true);
        setConnected(true);
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
        localStorage.removeItem(CONFIG.STORAGE_KEYS.PLAYER_ID);
    }, [socket]);

    // Connect to server
    useEffect(() => {
        console.log(`🌐 Connecting to ${currentRegion.name} at ${currentRegion.url}...`);
        const newSocket = io(currentRegion.url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: CONFIG.CONNECTION.RECONNECTION_ATTEMPTS,
            reconnectionDelay: CONFIG.CONNECTION.RECONNECTION_DELAY
        });

        // [NEW] Presence Registration
        if (uid && userEmail) {
            newSocket.emit('registerPresence', { uid, email: userEmail });
        }

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

        newSocket.on('reconnectSuccess', ({ gameState, players, roomCode, playerId }) => {
            console.log('🔄 Reconnected successfully to', roomCode);
            setRoomCode(roomCode);
            setPlayerId(playerId);
            setGameState(gameState);
            setPlayers(players);
            localStorage.setItem(CONFIG.STORAGE_KEYS.ROOM_CODE, roomCode);
            localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYER_ID, playerId);
        });

        // [NEW] Fetch Chat History on connect
        newSocket.emit('getChatHistory', (response) => {
            if (response && response.history) {
                setChatMessages(response.history);
            }
        });

        newSocket.on('chatMessage', (msg) => {
            setChatMessages(prev => {
                const next = [...prev, msg];
                if (next.length > 50) next.shift();
                return next;
            });
        });

        newSocket.on('afkWarning', (data) => {
            console.warn(`⚠️ AFK Warning: You will be kicked in ${data.timeLeft} seconds if you don't move!`);
            setServerMessage(`⚠️ AFK Warning: Move to stay in game! (${data.timeLeft}s)`);
            setTimeout(() => setServerMessage(null), 5000);
        });

        newSocket.on('afkKick', (data) => {
            console.error('👢 Kicked for inactivity');
            alert('You have been kicked for inactivity.');
            leaveRoom();
        });

        newSocket.on('playerDisconnected', ({ playerId }) => {
            console.log(`⚠️ Player ${playerId} disconnected (waiting for recovery...)`);
            // Visually mark player as disconnected if needed
        });

        newSocket.on('connect_error', (err) => {
            console.warn('⚠️ Connection error:', err.message);
            setConnectionError(err.message);
        });

        newSocket.on('shop_update', (data) => {
            setDailyShop(data);
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

        newSocket.on('gameStart', ({ players, selectedMap, seed, mode, wagerAmount }) => {
            setGameState('playing');
            if (players) setPlayers(players);
            if (selectedMap) setSelectedMap(selectedMap);
            if (seed) setSeed(seed);
            if (mode) setSelectedMode(mode);
            if (wagerAmount) setWagerAmount(wagerAmount); // [NEW] Capture wager
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

        newSocket.on('gameOver', ({ winnerId, scores: finalScores, honors }) => {
            setScores(finalScores);
            setWinner(winnerId);
            setGameState('ended');
            setHonors(honors); // [NEW] Store match honors
            handlersRef.current.onGameOver?.(winnerId, finalScores, honors);
        });

        newSocket.on('rewardEarned', ({ packs, credits, isWinner }) => {
            console.log(`🎉 Reward: ${packs} packs, ${credits} credits`);
            handlersRef.current.onRewardEarned?.({ packs, credits, isWinner });
        });

        newSocket.on('timerUpdate', (timeRemaining) => {
            setTimer(timeRemaining);
        });

        newSocket.on('spectatorUpdate', ({ count }) => {
            setSpectatorCount(count);
        });

        newSocket.on('matchmakingUpdate', ({ status }) => {
            setMatchmakingStatus(status);
        });

        newSocket.on('matchInvite', (invite) => {
            console.log('📧 Received match invite:', invite);
            setLastInvite(invite);
            // Auto-clear invite after 15 seconds
            setTimeout(() => setLastInvite(prev => prev === invite ? null : prev), 15000);
        });

        newSocket.on('matchFound', ({ roomCode }) => {
            console.log('⚡ Match found! Joining room:', roomCode);
            setMatchmakingStatus('idle');
            // We use the roomCode to join manually via the existing joinRoom logic
            // but we need a way to pass the name/email correctly.
            // Since joinRoom is a callback, we'll store name/email in a ref or just use storage.
            const savedName = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYER_NAME);
            localStorage.getItem('user_email'); // ensure it's accessed if needed or just remove
            
            // Trigger the join
            newSocket.emit('joinRoom', {
                roomCode,
                playerName: savedName || 'Player',
                skinData: {
                    skinId: localStorage.getItem('equipped_skin'),
                    skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
                    color: localStorage.getItem('player_color') || '#00d4ff'
                }
            }, (response) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setPlayerId(response.playerId);
                    setGameState('lobby');
                    setPlayers(response.players);
                    localStorage.setItem('puck_room_code', response.roomCode);
                    localStorage.setItem('puck_player_id', response.playerId);
                }
            });
        });

        // AUTO-RECONNECT LOGIC
        const lastRoom = localStorage.getItem(CONFIG.STORAGE_KEYS.ROOM_CODE);
        const lastPlayer = localStorage.getItem(CONFIG.STORAGE_KEYS.PLAYER_ID);
        if (lastRoom && lastPlayer) {
            console.log('🔄 Attempting auto-reconnect...');
            newSocket.emit('reconnectPlayer', { playerId: lastPlayer, roomCode: lastRoom }, (response) => {
                if (!response.success) {
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.ROOM_CODE);
                    localStorage.removeItem(CONFIG.STORAGE_KEYS.PLAYER_ID);
                }
            });
        }

        newSocket.on('roomState', (data) => {
            const { s: playersData, t: serverTick } = data;
            setLastServerTick(serverTick);
            
            setPlayers(prev => prev.map(p => {
                if (playersData[p.id]) {
                    return {
                        ...p,
                        position: playersData[p.id].p,
                        velocity: playersData[p.id].v,
                        // Update in-place for fast access by components
                        lastServerUpdate: Date.now()
                    };
                }
                return p;
            }));
        });

        newSocket.on('questsUpdated', ({ quests: newQuests, zoinsGained }) => {
            console.log(`🎯 Quests Updated! Gained ${zoinsGained} Zoins`);
            setQuests(newQuests);
        });

        // Maintenance / Server Messages
        newSocket.on('server_message', (msg) => {
            console.log('📢 Server Message:', msg);
            setServerMessage(msg);
            if (msg.message) {
                localStorage.setItem('server_message', JSON.stringify(msg));
            }

            // Auto-clear notification after some time if it's not permanent
            if (msg.duration && msg.type !== 'maintenance') {
                setTimeout(() => {
                    setServerMessage(null);
                    localStorage.removeItem('server_message');
                }, msg.duration * 1000);
            }
        });

        // --- [TRADE] LISTENERS ---
        newSocket.on('trade_invitation', (data) => {
            setTradeInvite(data);
        });

        newSocket.on('trade_started', ({ tradeId, session }) => {
            setTradeInvite(null);
            setTradeSession(session);
        });

        newSocket.on('trade_sync', (session) => {
            setTradeSession(session);
        });

        newSocket.on('trade_completed', () => {
            setTradeSession(null);
        });

        newSocket.on('trade_cancelled', () => {
            setTradeSession(null);
        });

        newSocket.on('trade_declined', ({ by }) => {
            setTradeInvite(null);
        });

        return () => {
            console.log(`🔌 Disconnecting from ${currentRegion.name}...`);
            newSocket.disconnect();
        };
    }, [currentRegion.url, currentRegion.name, lastServerTick, leaveRoom, uid, userEmail]);

    // ========== ROOM ACTIONS ==========

    const fetchLeaderboard = useCallback((category = 'rankPoints') => {
        if (!socket) return Promise.reject('Not connected to server.');

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject('Server Timeout: Failed to fetch leaderboard'), 5000);

            socket.emit('getLeaderboard', { category }, (response) => {
                clearTimeout(timeout);
                if (response.success) {
                    resolve(response.leaderboard);
                } else {
                    reject(response.error || 'Failed to fetch leaderboard');
                }
            });
        });
    }, [socket]);

    const fetchQuests = useCallback((email) => {
        if (!socket || !email) return Promise.reject('Missing socket or email');
        return new Promise((resolve, reject) => {
            socket.emit('getQuests', { email }, (res) => {
                if (res.success) {
                    setQuests(res.quests);
                    resolve(res.quests);
                } else reject(res.error);
            });
        });
    }, [socket]);

    const trackGameplayStat = useCallback((email, statType) => {
        if (!socket || !email) return;
        socket.emit('trackGameplayStat', { email, statType });
    }, [socket]);

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
                puckId: localStorage.getItem('equipped_puck_id'), // [PHASE 3]
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

                    if (response.isSpectator) {
                        setIsSpectating(true);
                        setGameState(response.gameState || 'playing');
                    } else {
                        setIsSpectating(false);
                        setGameState('lobby');
                    }
                    setPlayers(response.players);
                    resolve(response);
                } else {
                    reject({ 
                        message: response.error || 'Room not found',
                        canSpectate: response.canSpectate 
                    });
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
                puckId: localStorage.getItem('equipped_puck_id'), // [PHASE 3]
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
                    
                    if (response.isSpectator) {
                        setIsSpectating(true);
                        setGameState(response.gameState || 'playing');
                    } else {
                        setIsSpectating(false);
                        setGameState('lobby');
                    }
                    
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

    // ========== MATCHMAKING ACTIONS ==========
    const startMatchmaking = useCallback((playerName, userEmail) => {
        if (!socket) return;
        
        const skinData = {
            skinId: localStorage.getItem('equipped_skin'),
            skinTier: parseInt(localStorage.getItem('equipped_skin_tier') || '0'),
            color: playerColor
        };

        // Store email temporarily for matchFound recovery if needed
        if (userEmail) localStorage.setItem('user_email', userEmail);
        localStorage.setItem(CONFIG.STORAGE_KEYS.PLAYER_NAME, playerName);

        socket.emit('startMatchmaking', { playerName, userEmail, skinData });
        setMatchmakingStatus('searching');
    }, [socket, playerColor]);

    const cancelMatchmaking = useCallback(() => {
        if (!socket) return;
        socket.emit('cancelMatchmaking');
        setMatchmakingStatus('idle');
    }, [socket]);

    const selectMode = useCallback((mode) => {
        // Optimistic update always
        setSelectedMode(mode);
        if (isOffline || !socket) return;
        socket.emit('selectMode', { mode });
    }, [socket, isOffline]);

    // ========== SPECTATOR MODE ==========
    const joinAsSpectator = useCallback((roomCode, playerName, userEmail) => {
        if (!socket) return Promise.reject('Not connected');
        
        return new Promise((resolve, reject) => {
            socket.emit('joinAsSpectator', { roomCode, playerName, userEmail }, (response) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setPlayerId(response.playerId);
                    setIsSpectating(true);
                    setPlayers(response.players);
                    setGameState(response.gameState || 'playing');
                    resolve(response);
                } else {
                    reject(response.error || 'Failed to join as spectator');
                }
            });
        });
    }, [socket]);

    const exitSpectator = useCallback(() => {
        setIsSpectating(false);
        leaveRoom();
    }, [leaveRoom]);

    // ========== GAME SETUP ACTIONS ==========

    // Duplicates removed - using unified definitions above

    // ========== GAMEPLAY ACTIONS ==========

    const sendPosition = useCallback((position, velocity, rotation) => {
        if (!socket || gameState !== 'playing' || isOffline) return;
        socket.emit('playerPosition', { position, velocity, rotation });
    }, [socket, gameState, isOffline]);

    const sendInput = useCallback((input) => {
        if (!socket || gameState !== 'playing' || isOffline) return;
        socket.emit('playerInput', input);

        // Track dash for quests
        if (input.dash && userEmail) {
            trackGameplayStat(userEmail, 'dash');
        }
    }, [socket, gameState, isOffline, userEmail, trackGameplayStat]);

    const reportKnockout = useCallback((knockedOutId) => {
        if (!socket) return;
        socket.emit('playerKnockout', { knockedOutId, tick: lastServerTick });
    }, [socket, lastServerTick]);

    const reportStomp = useCallback((targetId, damage) => {
        if (!socket) return;
        socket.emit('reportStomp', { targetId, damage, tick: lastServerTick });
    }, [socket, lastServerTick]);

    const reportDamage = useCallback((damage) => {
        if (!socket) return;
        socket.emit('playerDamage', { damage });
    }, [socket]);

    const collectPowerup = useCallback((powerupId) => {
        if (!socket) return;
        socket.emit('powerupCollected', { powerupId });

        // Track powerup collection for quests
        if (userEmail) {
            trackGameplayStat(userEmail, 'powerup');
        }
    }, [socket, userEmail, trackGameplayStat]);

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

    // --- [TRADE] METHODS ---
    const sendTradeInvite = useCallback((targetUid) => {
        if (!socket) return Promise.reject('Not connected');
        return new Promise((resolve) => {
            socket.emit('trade_invite', { targetUid }, resolve);
        });
    }, [socket]);

    const respondToTrade = useCallback((inviteId, accept) => {
        if (!socket) return;
        socket.emit('trade_respond', { inviteId, accept }, (res) => {
            if (!accept) setTradeInvite(null);
        });
    }, [socket]);

    const updateTradeOffer = useCallback((tradeId, items, zoins) => {
        if (!socket) return;
        socket.emit('trade_update_offer', { tradeId, items, zoins });
    }, [socket]);

    const setTradeReady = useCallback((tradeId, ready) => {
        if (!socket) return;
        socket.emit('trade_ready', { tradeId, ready });
    }, [socket]);

    const executeTrade = useCallback((tradeId) => {
        if (!socket) return Promise.reject('Not connected');
        return new Promise((resolve) => {
            socket.emit('trade_execute', { tradeId }, resolve);
        });
    }, [socket]);

    const cancelTrade = useCallback((tradeId) => {
        if (!socket) return;
        socket.emit('trade_cancel', { tradeId });
        setTradeSession(null);
    }, [socket]);

    // --- [PRO] ---
    const claimProReward = useCallback(() => {
        if (!socket) return Promise.reject('Not connected');
        return new Promise((resolve) => {
            socket.emit('claim_pro_reward', resolve);
        });
    }, [socket]);

    // --- [CRAFTING] METHODS ---
    const craftItem = useCallback((recipeId, itemIds) => {
        if (!socket) return Promise.reject('Not connected');
        return new Promise((resolve) => {
            socket.emit('craft_item', { recipeId, itemIds }, resolve);
        });
    }, [socket]);

    const purchaseShopItem = useCallback((itemId) => {
        if (!socket) return;
        return new Promise((resolve) => {
            socket.emit('purchaseShopItem', { itemId }, (res) => {
                resolve(res);
            });
        });
    }, [socket]);

    // ========== HANDLER REGISTRATION ==========

    const switchRegion = useCallback((regionId) => {
        const region = CONFIG.REGIONS.find(r => r.id === regionId);
        if (region && region.id !== currentRegion.id) {
            setCurrentRegion(region);
        }
    }, [currentRegion.id]);

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
        honors,
        setHonors,
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

        // Matchmaking
        matchmakingStatus,
        startMatchmaking,
        cancelMatchmaking,

        // Social
        lastInvite,
        setLastInvite,
        invitePlayer: (targetUid, roomCode, inviterName) => {
            if (socket) socket.emit('invitePlayer', { targetUid, roomCode, inviterName });
        },

        // Spectator Mode
        isSpectating,
        spectatorCount,
        joinAsSpectator,
        exitSpectator,
        wagerAmount, // [NEW] Expose wager

        // Room actions
        currentRegion,
        switchRegion,
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
        sendInput,
        reportKnockout,
        reportStomp,
        reportDamage,
        collectPowerup,
        usePowerup,
        reportGameEnd,
        requestRematch,

        // Leaderboard
        fetchLeaderboard,

        // Quests
        quests,
        fetchQuests,
        trackGameplayStat,

        // Handlers
        registerHandlers,

        // Chat
        chatMessages,
        sendChatMessage: (username, message, skinTier, uid) => {
            if (socket && message) {
                socket.emit('sendChatMessage', { username, message, skinTier, uid });
            }
        },

        // Shop
        dailyShop,
        purchaseShopItem,
        tradeInvite, setTradeInvite, tradeSession,
        sendTradeInvite, respondToTrade, updateTradeOffer, setTradeReady, executeTrade, cancelTrade,
        
        // Crafting
        craftItem,
        
        // [PRO]
        claimProReward
    }), [
        connected, socket, roomCode, playerId, playerColor, playerIndex, players,
        gameState, scores, serverPowerups, winner, honors, selectedMap, selectedMode,
        seed, mapVotes, timer, connectionError, isOffline, enableOfflineMode,
        serverMessage, triggerTestMaintenance, isSpectating, spectatorCount,
        matchmakingStatus, startMatchmaking, cancelMatchmaking, wagerAmount,
        currentRegion, switchRegion,
        joinAsSpectator, exitSpectator, createRoom, joinRoom, quickJoin,
        setReady, leaveRoom, voteMap, selectMode, sendPosition, sendInput,
        reportKnockout, reportStomp, reportDamage, collectPowerup,
        usePowerup, reportGameEnd, requestRematch, fetchLeaderboard,
        quests, fetchQuests, trackGameplayStat, registerHandlers,
        lastInvite, setLastInvite, chatMessages, dailyShop, purchaseShopItem,
        tradeInvite, tradeSession, sendTradeInvite, respondToTrade,
        updateTradeOffer, setTradeReady, executeTrade, cancelTrade, craftItem,
        claimProReward
    ]);
}

import React, { useState, useCallback, Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Stars, Environment } from '@react-three/drei';

import ArenaChaos from './ArenaChaos';
import Puck from './Puck';
import PowerUps from './PowerUps';
import KnockoutEffects from './KnockoutEffects';
import PostProcessing from './effects/PostProcessing';
import GameHUD, { VictoryScreen } from './UI/GameHUD';
import Lobby from './UI/Lobby';
import DynamicCamera from './DynamicCamera';
import LoadingScreen from './UI/LoadingScreen';
import ProjectileSystem from './ProjectileSystem';
import ProceduralArena from './ProceduralArena';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useAuth } from '../contexts/AuthContext';
import { 
    PHYSICS_CONFIG, 
    getRandomPowerupPosition, 
    getRandomPowerupType, 
    getSpawnPosition,
    calculateStompDamage
} from '../utils/physics';
import { getPowerupInfo, DEFAULT_LOADOUT } from '../utils/powerups';
import { generateMap } from '../utils/mapGenerator';

// ============================================
// GAME MODE CONFIGURATIONS
// ============================================
const GAME_MODES = {
    knockout: {
        name: 'Knockout',
        description: 'Knock enemies off to score. First to 3 KOs wins.',
        stocksPerPlayer: 3,
        timeLimit: 180,
        winCondition: 'stocks',
        damageDecay: false,
        scoreToWin: 3
    },
    survival: {
        name: 'Survival',
        description: 'Last puck standing wins!',
        stocksPerPlayer: 1,
        timeLimit: 0,
        winCondition: 'lastStanding',
        damageDecay: false
    },
    timed: {
        name: 'Timed Match',
        description: 'Most KOs when time runs out wins.',
        stocksPerPlayer: Infinity,
        timeLimit: 120,
        winCondition: 'score',
        damageDecay: true
    },
    chaos: {
        name: 'Chaos Mode',
        description: 'Maximum powerups, maximum mayhem!',
        stocksPerPlayer: 5,
        timeLimit: 180,
        winCondition: 'stocks',
        damageDecay: false,
        powerupSpawnRate: 0.5
    }
};

// ============================================
// GAME SCENE COMPONENT
// ============================================
function GameScene({
    players,
    localPlayerId,
    powerups,
    playerPositions,
    playerPowerups,
    playerDamage,
    onKnockout,
    onStomp,
    onCollectPowerup,
    onPositionUpdate,
    onUseItem,
    effects,
    onEffectComplete,
    mapData,
    mapType,
    onCollision,
    onImpact,
    isPaused,
    screenShake,
    knockoutTarget,
    slowmo,
    gameMode
}) {
    return (
        <>
            {/* Environment */}
            <Environment preset={mapData?.biome?.skybox || 'sunset'} />
            <ambientLight intensity={0.6} />
            <directionalLight 
                position={[10, 20, 10]} 
                intensity={1.3} 
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <fog attach="fog" args={[mapData?.biome?.fog?.color || '#d6e4ff', 20, 80]} />

            {/* Dynamic Camera */}
            <DynamicCamera 
                playerPositions={playerPositions} 
                localPlayerId={localPlayerId}
                shake={screenShake}
                knockoutTarget={knockoutTarget}
                slowmo={slowmo}
            />

            {/* Arena */}
            {mapData ? (
                <ProceduralArena mapData={mapData} />
            ) : (
                <ArenaChaos mapType={mapType} />
            )}

            {/* Players */}
            {players.map((player, index) => (
                <Puck
                    key={player.id}
                    playerId={player.id}
                    playerName={player.name}
                    color={player.color}
                    startPosition={getSpawnPosition(index, mapData)}
                    isLocalPlayer={player.id === localPlayerId}
                    powerup={playerPowerups[player.id]}
                    damage={playerDamage[player.id] || 0}
                    onKnockout={onKnockout}
                    onStomp={onStomp}
                    onPositionUpdate={player.id === localPlayerId ? onPositionUpdate : undefined}
                    onCollision={player.id === localPlayerId ? onCollision : undefined}
                    onUseItem={player.id === localPlayerId ? onUseItem : undefined}
                    onImpact={player.id === localPlayerId ? onImpact : undefined}
                    isPaused={isPaused}
                    remotePosition={player.id !== localPlayerId ? player.position : undefined}
                    remoteVelocity={player.id !== localPlayerId ? player.velocity : undefined}
                    allPlayerPositions={playerPositions}
                    gameMode={gameMode}
                />
            ))}

            {/* Power-ups */}
            <PowerUps
                powerups={powerups}
                playerPositions={playerPositions}
                onCollect={onCollectPowerup}
            />

            {/* Effects */}
            <KnockoutEffects effects={effects} onEffectComplete={onEffectComplete} />

            {/* Post-processing */}
            <PostProcessing />
        </>
    );
}

// ============================================
// MAIN BATTLE ARENA COMPONENT
// ============================================
export default function BattleArena() {
    const multiplayer = useMultiplayer();
    const { user, inventory, updateMatchStats } = useAuth() || {};

    // ========== GAME STATE ==========
    const [gameMode, setGameMode] = useState('knockout');
    const [mapSeed, setMapSeed] = useState(null);
    const [localPowerups, setLocalPowerups] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({});
    const [playerPowerups, setPlayerPowerups] = useState({});
    const [playerDamage, setPlayerDamage] = useState({});
    const [playerStocks, setPlayerStocks] = useState({});
    const [playerScores, setPlayerScores] = useState({});
    const [projectiles, setProjectiles] = useState([]);
    const [playerLoadouts, setPlayerLoadouts] = useState({});
    const [effects, setEffects] = useState([]);
    const [knockoutMessage, setKnockoutMessage] = useState(null);
    const [knockoutTarget, setKnockoutTarget] = useState(null);
    
    // Visual effects
    const [isPaused, setIsPaused] = useState(false);
    const [screenShake, setScreenShake] = useState(0);
    const [slowmo, setSlowmo] = useState(false);
    
    // Timer - FIX: Actually counts down now
    const [gameTimer, setGameTimer] = useState(180);
    const timerRef = useRef(null);
    
    // Stats tracking
    const [matchStats, setMatchStats] = useState({
        totalDamage: 0,
        maxCombo: 0,
        stomps: 0,
        knockouts: 0
    });
    const [combo, setCombo] = useState(0);
    const lastHitTime = useRef(0);
    
    // Effect ID counter - FIX: Single atomic counter
    const nextIdRef = useRef(0);
    const getNextId = useCallback(() => nextIdRef.current++, []);

    // ========== GENERATE MAP ==========
    const mapData = useMemo(() => {
        if (mapSeed) {
            const chaosLevel = gameMode === 'chaos' ? 0.8 : 0.5;
            return generateMap(mapSeed, 14, chaosLevel);
        }
        return null;
    }, [mapSeed, gameMode]);

    const modeConfig = GAME_MODES[gameMode] || GAME_MODES.knockout;

    // ========== GAME INITIALIZATION ==========
    useEffect(() => {
        if (multiplayer.gameState === 'playing') {
            // Initialize player states
            const initialStocks = {};
            const initialScores = {};
            multiplayer.players.forEach(p => {
                initialStocks[p.id] = modeConfig.stocksPerPlayer;
                initialScores[p.id] = 0;
            });
            setPlayerStocks(initialStocks);
            setPlayerScores(initialScores);
            setPlayerDamage({});
            setGameTimer(modeConfig.timeLimit || 180);
            setMatchStats({ totalDamage: 0, maxCombo: 0, stomps: 0, knockouts: 0 });
            setCombo(0);
            
            // Set map seed
            setMapSeed(multiplayer.seed || Math.floor(Math.random() * 1000000));
            
            // Start timer - FIX: Actually decrements
            if (modeConfig.timeLimit > 0) {
                timerRef.current = setInterval(() => {
                    setGameTimer(prev => {
                        if (prev <= 1) {
                            clearInterval(timerRef.current);
                            // Time's up - trigger game end
                            checkWinCondition(true);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }
        
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [multiplayer.gameState, multiplayer.players, multiplayer.seed, modeConfig]);

    // ========== WIN CONDITION CHECK ==========
    const checkWinCondition = useCallback((timeUp = false) => {
        const mode = modeConfig;
        let winnerId = null;
        
        if (mode.winCondition === 'stocks') {
            // Check if only one player has stocks
            const playersWithStocks = Object.entries(playerStocks)
                .filter(([_, stocks]) => stocks > 0);
            
            if (playersWithStocks.length === 1) {
                winnerId = playersWithStocks[0][0];
            }
        } else if (mode.winCondition === 'score' && timeUp) {
            // Highest score when time runs out
            const sortedScores = Object.entries(playerScores)
                .sort(([, a], [, b]) => b - a);
            
            if (sortedScores.length > 0) {
                winnerId = sortedScores[0][0];
            }
        } else if (mode.winCondition === 'lastStanding') {
            const playersWithStocks = Object.entries(playerStocks)
                .filter(([_, stocks]) => stocks > 0);
            
            if (playersWithStocks.length === 1) {
                winnerId = playersWithStocks[0][0];
            }
        }
        
        if (winnerId) {
            // Report game end
            if (multiplayer.connected) {
                multiplayer.reportGameEnd?.(winnerId, playerScores, matchStats);
            }
            
            // Update local stats
            if (updateMatchStats && user) {
                updateMatchStats({
                    won: winnerId === multiplayer.playerId,
                    knockouts: matchStats.knockouts,
                    damageDealt: matchStats.totalDamage,
                    stomps: matchStats.stomps,
                    maxCombo: matchStats.maxCombo
                });
            }
        }
    }, [modeConfig, playerStocks, playerScores, multiplayer, matchStats, updateMatchStats, user]);

    // ========== USE ITEM HANDLER ==========
    const handleUseItem = useCallback(() => {
        const activePowerup = playerPowerups[multiplayer.playerId];
        if (!activePowerup) return;

        const playerPos = playerPositions[multiplayer.playerId];
        if (!playerPos) return;

        const powerupInfo = typeof activePowerup === 'string' 
            ? getPowerupInfo(activePowerup)
            : activePowerup;

        if (!powerupInfo) return;

        // Handle projectile powerups
        if (powerupInfo.type === 'projectile') {
            setProjectiles(prev => [...prev, {
                id: getNextId(),
                type: powerupInfo.id,
                position: [playerPos[0], playerPos[1] + 0.5, playerPos[2]],
                velocity: [0, 0, 8], // Forward
                damage: powerupInfo.damage || 20,
                ownerId: multiplayer.playerId
            }]);
        }

        // Consume non-buff powerups
        if (powerupInfo.type !== 'buff') {
            setPlayerPowerups(prev => ({ ...prev, [multiplayer.playerId]: null }));
        }

        if (multiplayer.connected) {
            multiplayer.usePowerup?.(powerupInfo.id);
        }
    }, [playerPowerups, playerPositions, multiplayer, getNextId]);

    // ========== IMPACT HANDLER ==========
    const handleImpact = useCallback((intensity) => {
        const scaledIntensity = Math.min(intensity, 20);
        
        setIsPaused(true);
        setScreenShake(scaledIntensity * 0.015);
        
        // Combo tracking
        const now = Date.now();
        if (now - lastHitTime.current < 2000) {
            setCombo(prev => {
                const newCombo = prev + 1;
                setMatchStats(s => ({ ...s, maxCombo: Math.max(s.maxCombo, newCombo) }));
                return newCombo;
            });
        } else {
            setCombo(1);
        }
        lastHitTime.current = now;

        // Hitstop
        setTimeout(() => setIsPaused(false), 30 + Math.min(scaledIntensity * 3, 80));

        // Shake decay
        const decay = setInterval(() => {
            setScreenShake(prev => {
                if (prev <= 0.005) {
                    clearInterval(decay);
                    return 0;
                }
                return prev * 0.85;
            });
        }, 16);
    }, []);

    // ========== COLLISION HANDLER - FIX: Uses ref to avoid stale closure ==========
    const playerDamageRef = useRef(playerDamage);
    useEffect(() => {
        playerDamageRef.current = playerDamage;
    }, [playerDamage]);

    const handleCollision = useCallback((impactForce) => {
        const damage = Math.floor(impactForce * 2);
        
        setPlayerDamage(prev => {
            const current = prev[multiplayer.playerId] || 0;
            const newDamage = current + damage;
            return { ...prev, [multiplayer.playerId]: newDamage };
        });
        
        setMatchStats(s => ({ ...s, totalDamage: s.totalDamage + damage }));

        if (multiplayer.connected) {
            // Use ref to get latest value
            const currentDamage = playerDamageRef.current[multiplayer.playerId] || 0;
            multiplayer.reportDamage?.(currentDamage + damage);
        }
    }, [multiplayer]);

    // ========== STOMP HANDLER ==========
    const handleStomp = useCallback((targetId, stompData) => {
        const damage = calculateStompDamage(stompData.velocity || 10);
        
        setPlayerDamage(prev => ({
            ...prev,
            [targetId]: (prev[targetId] || 0) + damage
        }));
        
        setMatchStats(s => ({ ...s, stomps: s.stomps + 1 }));
        handleImpact(15);
        
        // Stomp effect
        const targetPos = playerPositions[targetId];
        if (targetPos) {
            setEffects(prev => [...prev, {
                id: getNextId(),
                type: 'stomp',
                position: targetPos
            }]);
        }

        if (multiplayer.connected) {
            multiplayer.reportStomp?.(targetId, damage);
        }
    }, [playerPositions, multiplayer, handleImpact, getNextId]);

    // ========== KNOCKOUT HANDLER ==========
    const handleKnockout = useCallback((knockedOutPlayerId) => {
        const pos = playerPositions[knockedOutPlayerId] || [0, 0, 0];
        const player = multiplayer.players.find(p => p.id === knockedOutPlayerId);
        const color = player?.color || '#ffffff';

        // Dramatic effects
        setSlowmo(true);
        setKnockoutTarget(knockedOutPlayerId);
        
        setTimeout(() => {
            setSlowmo(false);
            setKnockoutTarget(null);
        }, 1000);

        // Visual effects - FIX: Using single ID counter
        const effectId = getNextId();
        setEffects(prev => [
            ...prev,
            { id: effectId, type: 'explosion', position: [...pos], color },
            { id: getNextId(), type: 'shockwave', position: [pos[0], 0.1, pos[2]], color }
        ]);

        // Update stocks
        setPlayerStocks(prev => {
            const newStocks = { ...prev };
            newStocks[knockedOutPlayerId] = Math.max(0, (prev[knockedOutPlayerId] || modeConfig.stocksPerPlayer) - 1);
            return newStocks;
        });

        // Score for killer
        multiplayer.players.forEach(p => {
            if (p.id !== knockedOutPlayerId) {
                setPlayerScores(prev => ({
                    ...prev,
                    [p.id]: (prev[p.id] || 0) + 1
                }));
            }
        });

        // Reset damage
        setPlayerDamage(prev => ({ ...prev, [knockedOutPlayerId]: 0 }));
        setMatchStats(s => ({ ...s, knockouts: s.knockouts + 1 }));

        setKnockoutMessage('KNOCKOUT!');
        setTimeout(() => {
            setKnockoutMessage(null);
            // Check win condition after knockout
            setTimeout(() => checkWinCondition(), 100);
        }, 1500);

        if (multiplayer.connected) {
            multiplayer.reportKnockout?.(knockedOutPlayerId);
        }
    }, [playerPositions, multiplayer, modeConfig.stocksPerPlayer, getNextId, checkWinCondition]);

    // ========== POSITION UPDATE ==========
    const handlePositionUpdate = useCallback((position, velocity) => {
        setPlayerPositions(prev => ({
            ...prev,
            [multiplayer.playerId]: position
        }));

        if (Math.random() < 0.25) {
            multiplayer.sendPosition?.(position, velocity, 0);
        }
    }, [multiplayer]);

    // ========== POWERUP COLLECTION ==========
    const handleCollectPowerup = useCallback((powerupId, playerId) => {
        const powerup = localPowerups.find(p => p.id === powerupId);
        if (!powerup) return;

        setPlayerPowerups(prev => ({
            ...prev,
            [playerId]: powerup.type
        }));

        setLocalPowerups(prev => prev.filter(p => p.id !== powerupId));

        if (multiplayer.connected) {
            multiplayer.collectPowerup?.(powerupId);
        }

        // Handle buff duration
        const powerupInfo = getPowerupInfo(powerup.type?.id || powerup.type);
        if (powerupInfo?.duration > 0) {
            setTimeout(() => {
                setPlayerPowerups(prev => ({
                    ...prev,
                    [playerId]: null
                }));
            }, powerupInfo.duration);
        }
    }, [localPowerups, multiplayer]);

    // ========== EFFECT CLEANUP ==========
    const handleEffectComplete = useCallback((effectId) => {
        setEffects(prev => prev.filter(e => e.id !== effectId));
    }, []);

    // ========== PROJECTILE HIT ==========
    const handleProjectileHit = useCallback((projId, targetId, type) => {
        let damage = 20;
        if (type === 'rocket') damage = 35;
        if (type === 'bomb_throw') damage = 50;

        setPlayerDamage(prev => ({
            ...prev,
            [targetId]: (prev[targetId] || 0) + damage
        }));
        
        setProjectiles(prev => prev.filter(p => p.id !== projId));
    }, []);

    // ========== POWERUP SPAWNING ==========
    useEffect(() => {
        if (multiplayer.gameState !== 'playing') return;
        if (multiplayer.connected) return;

        const spawnRate = modeConfig.powerupSpawnRate || 1;
        const interval = (PHYSICS_CONFIG.powerups.minSpawnInterval + 
            Math.random() * (PHYSICS_CONFIG.powerups.maxSpawnInterval - PHYSICS_CONFIG.powerups.minSpawnInterval)) / spawnRate;

        const spawnInterval = setInterval(() => {
            if (localPowerups.length < PHYSICS_CONFIG.powerups.maxOnField) {
                setLocalPowerups(prev => [...prev, {
                    id: `local_${getNextId()}`,
                    type: getRandomPowerupType(),
                    position: getRandomPowerupPosition(mapData)
                }]);
            }
        }, interval);

        return () => clearInterval(spawnInterval);
    }, [multiplayer.gameState, multiplayer.connected, localPowerups.length, modeConfig.powerupSpawnRate, mapData, getNextId]);

    // ========== LOADOUT POWERUP REFRESH ==========
    useEffect(() => {
        if (multiplayer.gameState !== 'playing') return;

        const refreshInterval = setInterval(() => {
            setPlayerPowerups(prev => {
                if (prev[multiplayer.playerId]) return prev;

                const myLoadout = playerLoadouts[multiplayer.playerId] || DEFAULT_LOADOUT || ['speed_boost', 'rocket', 'shield'];
                const randomId = myLoadout[Math.floor(Math.random() * myLoadout.length)];
                const info = getPowerupInfo(randomId);
                
                return { ...prev, [multiplayer.playerId]: info };
            });
        }, 5000);

        return () => clearInterval(refreshInterval);
    }, [multiplayer.gameState, multiplayer.playerId, playerLoadouts]);

    // ========== MULTIPLAYER HANDLERS ==========
    useEffect(() => {
        multiplayer.registerHandlers?.({
            onPlayerMoved: ({ playerId, position, velocity }) => {
                setPlayerPositions(prev => ({ ...prev, [playerId]: position }));
            },
            onKnockout: (scorerId, knockedOutId) => {
                setKnockoutMessage('KNOCKOUT!');
                setPlayerDamage(prev => ({ ...prev, [knockedOutId]: 0 }));
                setTimeout(() => setKnockoutMessage(null), 1500);
            },
            onDamageUpdate: (id, damage) => {
                setPlayerDamage(prev => ({ ...prev, [id]: damage }));
            },
            onPowerupRejected: (powerupId) => {
                console.log(`Powerup ${powerupId} already taken`);
            }
        });
    }, [multiplayer]);

    // ========== POWERUPS LIST ==========
    const powerups = multiplayer.connected && multiplayer.gameState === 'playing'
        ? multiplayer.serverPowerups?.map(p => ({
            id: p.id,
            type: p.type,
            position: p.position
        })) || []
        : localPowerups;

    // ========== HUD DATA ==========
    const hudScores = {
        player1: playerScores[multiplayer.playerId] || 0,
        player2: Object.entries(playerScores).find(([id]) => id !== multiplayer.playerId)?.[1] || 0
    };

    const hudDamage = {
        player1: playerDamage[multiplayer.playerId] || 0,
        player2: Object.entries(playerDamage).find(([id]) => id !== multiplayer.playerId)?.[1] || 0
    };

    const hudStocks = modeConfig.stocksPerPlayer < Infinity ? {
        player1: playerStocks[multiplayer.playerId] ?? modeConfig.stocksPerPlayer,
        player2: Object.entries(playerStocks).find(([id]) => id !== multiplayer.playerId)?.[1] ?? modeConfig.stocksPerPlayer
    } : undefined;

    // ========== RENDER OVERLAY ==========
    const renderOverlay = () => {
        if (multiplayer.gameState === 'disconnected' || multiplayer.gameState === 'lobby') {
            return (
                <Lobby
                    connected={multiplayer.connected}
                    roomCode={multiplayer.roomCode}
                    players={multiplayer.players}
                    playerId={multiplayer.playerId}
                    onCreateRoom={multiplayer.createRoom}
                    onJoinRoom={multiplayer.joinRoom}
                    onQuickJoin={multiplayer.quickJoin}
                    onReady={(ready, loadout) => {
                        setPlayerLoadouts(prev => ({ ...prev, [multiplayer.playerId]: loadout }));
                        multiplayer.setReady?.(ready);
                    }}
                    onVoteMap={(mapId) => {
                        multiplayer.voteMap?.(mapId);
                    }}
                    onSelectMode={(mode) => {
                        setGameMode(mode);
                        multiplayer.selectMode?.(mode);
                    }}
                    onBack={multiplayer.leaveRoom}
                />
            );
        }

        if (multiplayer.gameState === 'ended') {
            const winnerId = multiplayer.winner || Object.entries(playerScores)
                .sort(([,a], [,b]) => b - a)[0]?.[0];
            
            return (
                <VictoryScreen
                    winner={winnerId === multiplayer.playerId ? 'You' : 'Opponent'}
                    scores={hudScores}
                    stats={matchStats}
                    onRestart={() => multiplayer.requestRematch?.()}
                    onMenu={multiplayer.leaveRoom}
                />
            );
        }

        return null;
    };

    return (
        <div className="game-container">
            {renderOverlay()}

            <Canvas
                className="game-canvas"
                shadows
                camera={{ position: [0, 18, 15], fov: 50 }}
                gl={{ antialias: true, alpha: false }}
            >
                <Suspense fallback={<LoadingScreen />}>
                    <Physics gravity={PHYSICS_CONFIG.gravity}>
                        {multiplayer.gameState === 'playing' && (
                            <>
                                <GameScene
                                    players={multiplayer.players}
                                    localPlayerId={multiplayer.playerId}
                                    powerups={powerups}
                                    playerPositions={playerPositions}
                                    playerPowerups={playerPowerups}
                                    playerDamage={playerDamage}
                                    onKnockout={handleKnockout}
                                    onStomp={handleStomp}
                                    onCollectPowerup={handleCollectPowerup}
                                    onPositionUpdate={handlePositionUpdate}
                                    onCollision={handleCollision}
                                    onUseItem={handleUseItem}
                                    effects={effects}
                                    onEffectComplete={handleEffectComplete}
                                    mapData={mapData}
                                    mapType={multiplayer.selectedMap}
                                    onImpact={handleImpact}
                                    isPaused={isPaused}
                                    screenShake={screenShake}
                                    knockoutTarget={knockoutTarget}
                                    slowmo={slowmo}
                                    gameMode={gameMode}
                                />
                                <ProjectileSystem
                                    projectiles={projectiles}
                                    onProjectileHit={handleProjectileHit}
                                    playerPositions={playerPositions}
                                />
                            </>
                        )}

                        {(multiplayer.gameState === 'disconnected' || multiplayer.gameState === 'lobby') && (
                            <>
                                <Stars radius={100} depth={50} count={3000} factor={4} fade speed={0.5} />
                                <Environment preset="night" />
                                <fog attach="fog" args={['#0a0a1a', 20, 60]} />
                                <ArenaChaos />
                            </>
                        )}
                    </Physics>
                </Suspense>
            </Canvas>

            {multiplayer.gameState === 'playing' && (
                <GameHUD
                    scores={hudScores}
                    timer={gameTimer}
                    activePowerup={playerPowerups[multiplayer.playerId]}
                    loadout={playerLoadouts[multiplayer.playerId] || DEFAULT_LOADOUT || ['speed_boost', 'rocket', 'shield']}
                    damageStats={hudDamage}
                    stocks={hudStocks}
                    knockoutMessage={knockoutMessage}
                    gameStatus={multiplayer.gameState}
                    gameMode={gameMode}
                    combo={combo}
                    lastHitTime={lastHitTime.current}
                    players={multiplayer.players}
                    localPlayerId={multiplayer.playerId}
                />
            )}

            <style jsx>{`
                .game-container {
                    position: fixed;
                    inset: 0;
                    background: #000;
                }
            `}</style>
        </div>
    );
}

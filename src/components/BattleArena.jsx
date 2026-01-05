import React, { useState, useCallback, Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
import { useMultiplayer } from '../hooks/useMultiplayer';
import { PHYSICS_CONFIG, MATERIALS, getRandomPowerupPosition, getRandomPowerupType, getSpawnPosition } from '../utils/physics';

import { getPowerupInfo, POWERUP_REGISTRY } from '../utils/powerups';

const POWERUP_TYPES = {
    SPEED: { color: '#00ff00', texture: '/textures/speed.png', label: '⚡' },
    SHIELD: { color: '#0099ff', texture: '/textures/shield.png', label: '🛡️' },
    GROW: { color: '#ff0000', texture: '/textures/grow.png', label: '🍄' },
};

// Loading fallback


// Game scene with multiplayer
function GameScene({
    players,
    localPlayerId,
    powerups,
    playerPositions,
    playerPowerups,
    playerDamage, // New prop
    onKnockout,
    onCollectPowerup,
    onPositionUpdate,
    onCollision, // New prop
    onUseItem,
    effects,
    onEffectComplete,
    mapType // New prop
}) {
    return (
        <>
            {/* Environment - Optimized */}
            <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
            <Environment preset="night" />
            <fog attach="fog" args={['#0a0a1a', 25, 70]} />

            {/* Dynamic camera */}
            <DynamicCamera playerPositions={playerPositions} />

            {/* Chaos Arena */}
            <ArenaChaos mapType={mapType} />

            {/* All players */}
            {players.map((player, index) => (
                <Puck
                    key={player.id}
                    playerId={player.id}
                    color={player.color}
                    startPosition={getSpawnPosition(index)}
                    isLocalPlayer={player.id === localPlayerId}
                    powerup={playerPowerups[player.id]}
                    damage={playerDamage[player.id] || 0} // Pass damage
                    onKnockout={onKnockout}
                    onPositionUpdate={player.id === localPlayerId ? onPositionUpdate : undefined}
                    onCollision={player.id === localPlayerId ? onCollision : undefined} // Pass collision handler
                    onUseItem={player.id === localPlayerId ? onUseItem : undefined} // Pass use handler
                    remotePosition={player.id !== localPlayerId ? player.position : undefined}
                    remoteVelocity={player.id !== localPlayerId ? player.velocity : undefined}
                />
            ))}

            {/* Power-ups */}
            <PowerUps
                powerups={powerups}
                playerPositions={playerPositions}
                onCollect={onCollectPowerup}
            />

            {/* Knockout effects */}
            <KnockoutEffects effects={effects} onEffectComplete={onEffectComplete} />

            {/* Post-processing */}
            <PostProcessing />
        </>
    );
}

// Main BattleArena component
export default function BattleArena() {
    const multiplayer = useMultiplayer();

    // Local game state
    const [localPowerups, setLocalPowerups] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({});
    const [playerPowerups, setPlayerPowerups] = useState({});
    const [players, setPlayers] = useState([]);
    const [projectiles, setProjectiles] = useState([]);
    const [playerLoadouts, setPlayerLoadouts] = useState({});
    const [playerDamage, setPlayerDamage] = useState({}); // New state: Damage %
    const [knockoutMessage, setKnockoutMessage] = useState(null);
    const [effects, setEffects] = useState([]);
    const nextEffectId = useRef(0);
    const nextPowerupId = useRef(0);

    // Handle "Use Item" (Spacebar)
    const handleUseItem = useCallback((playerId) => {
        const activePowerup = playerPowerups[playerId];
        if (!activePowerup) return;

        const playerPos = playerPositions[playerId];
        if (!playerPos) return;

        // Execute Powerup Logic
        switch (activePowerup.id) {
            case 'speed_boost':
                // Handled in Puck.jsx physics
                break;
            case 'rocket':
            case 'saw_blade':
            case 'glue_gun':
                // Spawn Projectile
                const velocity = [0, 0, 5]; // simple forward vector (needs real aim)
                setProjectiles(prev => [...prev, {
                    id: Date.now(),
                    type: activePowerup.id,
                    position: [playerPos[0], playerPos[1] + 1, playerPos[2]],
                    velocity: velocity,
                    ownerId: playerId
                }]);
                break;
            case 'shield':
                // Handled in Puck state
                break;
        }

        // Consume Item (unless it's a duration buff that persists? For now consume immediately for non-buffs)
        if (activePowerup.type !== 'buff') {
            setPlayerPowerups(prev => ({ ...prev, [playerId]: null }));
        }
    }, [playerPowerups, playerPositions]);

    // Projectile Hit Handler
    const handleProjectileHit = (projId, targetId) => {
        // Apply effect (Damage, Slow, Knockback)
        setPlayerDamage(prev => ({
            ...prev,
            [targetId]: (prev[targetId] || 0) + 20 // Flat damage for now
        }));
        // Remove projectile
        setProjectiles(prev => prev.filter(p => p.id !== projId));
    };

    // Powerup Management (Loadout based)
    useEffect(() => {
        if (multiplayer.gameState !== 'playing') return;

        const spawnInterval = setInterval(() => {
            // Check if we have an empty slot (logic: currently only 1 active slot supported for simplicity)
            setPlayerPowerups(prev => {
                if (prev[multiplayer.playerId]) return prev; // Already have one

                // Pick random from loadout
                const myLoadout = playerLoadouts[multiplayer.playerId] || ['speed_boost', 'rocket', 'shield'];
                const randomId = myLoadout[Math.floor(Math.random() * myLoadout.length)];

                const info = getPowerupInfo(randomId);
                return {
                    ...prev,
                    [multiplayer.playerId]: { id: randomId, ...info }
                };
            });
        }, 5000); // Spawn every 5s if empty

        return () => clearInterval(spawnInterval);
    }, [multiplayer.gameState, multiplayer.playerId, playerLoadouts]);

    // Use server powerups if connected, otherwise local
    const powerups = multiplayer.connected && multiplayer.gameState === 'playing'
        ? multiplayer.serverPowerups.map(p => ({
            id: p.id,
            type: POWERUP_TYPES[p.type.toUpperCase()] || { id: p.type, color: '#ffffff' },
            position: p.position,
        }))
        : localPowerups;

    // Local power-up spawning (for single player or offline)
    useEffect(() => {
        if (multiplayer.gameState === 'playing' && !multiplayer.connected) {
            const spawnInterval = setInterval(() => {
                if (localPowerups.length < 3) {
                    setLocalPowerups(prev => [...prev, {
                        id: `local_${nextPowerupId.current++}`,
                        type: getRandomPowerupType(),
                        position: getRandomPowerupPosition(),
                    }]);
                }
            }, 8000 + Math.random() * 4000);

            return () => clearInterval(spawnInterval);
        }
    }, [multiplayer.gameState, multiplayer.connected, localPowerups.length]);

    // Handle damage collision
    const handleCollision = useCallback((impactForce) => {
        // Only register significant hits if not connected (single player test)
        // In multiplayer, the server should ideally track this, but for now we do local prediction

        setPlayerDamage(prev => {
            const current = prev[multiplayer.playerId] || 0;
            return {
                ...prev,
                [multiplayer.playerId]: current + impactForce // Add damage based on impact
            };
        });

        // Notify server of new damage value
        if (multiplayer.connected) {
            multiplayer.reportDamage((playerDamage[multiplayer.playerId] || 0) + impactForce);
        }
    }, [multiplayer, playerDamage]);

    // Handle position update from local player
    const handlePositionUpdate = useCallback((position, velocity) => {
        setPlayerPositions(prev => ({
            ...prev,
            [multiplayer.playerId]: position,
        }));

        // Send to server every few frames
        if (Math.random() < 0.3) {
            multiplayer.sendPosition(position, velocity, 0);
        }
    }, [multiplayer]);

    // Register multiplayer event handlers
    useEffect(() => {
        multiplayer.registerHandlers({
            onPlayerMoved: ({ playerId, position, velocity }) => {
                setPlayerPositions(prev => ({
                    ...prev,
                    [playerId]: position,
                }));
            },
            onKnockout: (scorerId, knockedOutId) => {
                setKnockoutMessage('KNOCKOUT!');
                // Reset damage on knockout
                setPlayerDamage(prev => ({ ...prev, [knockedOutId]: 0 }));
                setTimeout(() => setKnockoutMessage(null), 1500);
            },
            onDamageUpdate: (id, damage) => { // New handler
                setPlayerDamage(prev => ({ ...prev, [id]: damage }));
            }
        });
    }, [multiplayer]);

    // Handle knockout
    const handleKnockout = useCallback((knockedOutPlayerId) => {
        // Add explosion effect
        const pos = playerPositions[knockedOutPlayerId] || [0, 0, 0];
        const player = multiplayer.players.find(p => p.id === knockedOutPlayerId);
        const color = player?.color || '#ffffff';

        const effectId = nextEffectId.current++;
        setEffects(prev => [
            ...prev,
            { id: effectId, type: 'explosion', position: pos, color },
            { id: effectId + 1, type: 'shockwave', position: [pos[0], 0, pos[2]], color },
        ]);
        nextEffectId.current += 2;

        setKnockoutMessage('KNOCKOUT!');
        setTimeout(() => setKnockoutMessage(null), 1500);

        // Report to server (scorer is whoever caused it - for now, any other player)
        if (multiplayer.connected) {
            multiplayer.reportKnockout(knockedOutPlayerId);
        }
    }, [playerPositions, multiplayer]);

    // Handle power-up collection
    const handleCollectPowerup = useCallback((powerupId, playerId) => {
        const powerup = powerups.find(p => p.id === powerupId);
        if (!powerup) return;

        // Apply power-up effect
        setPlayerPowerups(prev => ({
            ...prev,
            [playerId]: powerup.type,
        }));

        // Remove from local list
        setLocalPowerups(prev => prev.filter(p => p.id !== powerupId));

        // Notify server
        if (multiplayer.connected) {
            multiplayer.collectPowerup(powerupId);
        }

        // Clear after duration
        if (powerup.type.duration > 0) {
            setTimeout(() => {
                setPlayerPowerups(prev => ({
                    ...prev,
                    [playerId]: null,
                }));
            }, powerup.type.duration);
        }
    }, [powerups, multiplayer]);

    const handleEffectComplete = useCallback((effectId) => {
        setEffects(prev => prev.filter(e => e.id !== effectId));
    }, []);

    // Get current view based on game state
    const renderView = () => {
        const gameState = multiplayer.gameState;

        // Lobby/Menu
        if (gameState === 'disconnected' || gameState === 'lobby') {
            return (
                <Lobby
                    connected={multiplayer.connected}
                    roomCode={multiplayer.roomCode}
                    players={multiplayer.players}
                    playerId={multiplayer.playerId}
                    onCreateRoom={multiplayer.createRoom}
                    onJoinRoom={multiplayer.joinRoom}
                    onQuickJoin={multiplayer.quickJoin}
                    onReady={multiplayer.setReady}
                    onBack={multiplayer.leaveRoom}
                />
            );
        }

        // Victory
        if (gameState === 'ended') {
            return (
                <VictoryScreen
                    winner={multiplayer.winner === multiplayer.playerId ? 'You' : 'Opponent'}
                    scores={multiplayer.scores}
                    onRestart={multiplayer.leaveRoom}
                    onMenu={multiplayer.leaveRoom}
                />
            );
        }

        return null;
    };

    // Format scores for HUD
    const scores = {
        player1: multiplayer.scores[multiplayer.playerId] || 0,
        player2: Object.entries(multiplayer.scores).find(([id]) => id !== multiplayer.playerId)?.[1] || 0,
    };

    return (
        <div className="game-container">
            {/* Overlay UI */}
            {renderView()}

            {/* Game Canvas */}
            <Canvas
                className="game-canvas"
                shadows
                camera={{ position: [0, 18, 15], fov: 45 }}
                gl={{ antialias: true }}
            >
                <Suspense fallback={<LoadingScreen />}>
                    <Physics gravity={PHYSICS_CONFIG.gravity}>
                        {multiplayer.gameState === 'playing' && (
                            <>
                                <GameScene
                                    // ... props
                                    onUseItem={() => handleUseItem(multiplayer.playerId)}
                                    mapType={multiplayer.selectedMap}
                                />
                                <ProjectileSystem projectiles={projectiles} onProjectileHit={handleProjectileHit} />
                            </>
                        )}
                        )}

                        {/* Show arena preview in lobby */}
                        {(multiplayer.gameState === 'disconnected' || multiplayer.gameState === 'lobby') && (
                            <>
                                <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
                                <Environment preset="night" />
                                <fog attach="fog" args={['#0a0a1a', 25, 70]} />
                                <ArenaChaos />
                            </>
                        )}
                    </Physics>
                </Suspense>
            </Canvas>

            {/* HUD Overlay */}
            {multiplayer.gameState === 'playing' && (
                <GameHUD
                    scores={scores}
                    timer={120}
                    activePowerup={playerPowerups[multiplayer.playerId] ?
                        (playerPowerups[multiplayer.playerId].type ||
                            // Map server powerup type to full info if needed, or assume it's properly hydrated
                            getPowerupInfo(playerPowerups[multiplayer.playerId].id || playerPowerups[multiplayer.playerId]))
                        : null}
                    loadout={playerLoadouts[multiplayer.playerId] || DEFAULT_LOADOUT} // Pass actual loadout
                    damageStats={{
                        player1: playerDamage[multiplayer.playerId] || 0,
                        player2: Object.entries(playerDamage).find(([id]) => id !== multiplayer.playerId)?.[1] || 0
                    }}
                    knockoutMessage={knockoutMessage}
                    gameStatus="playing"
                />
            )}
        </div>
    );
}

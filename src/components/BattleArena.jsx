import React, { useState, useCallback, Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Stars, Environment, ContactShadows, Sparkles, Html } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, ToneMapping, Vignette } from '@react-three/postprocessing';

import DynamicCamera from './DynamicCamera';
import ProceduralArena from './ProceduralArena';
import ArenaChaos from './ArenaChaos';
import Puck from './Puck';
import PowerUps from './PowerUps';
import KnockoutEffects from './KnockoutEffects';
import ExplosionParticles from './ExplosionParticles';
import ProjectileSystem from './ProjectileSystem';
import { logGame } from './DebugLogger';
import DebugLogger from './DebugLogger';
import ReplayPlayer from './ReplaySystem';
import { useReplayRecorder } from './ReplaySystem';

import Lobby from './UI/Lobby';
import GameHUD from './UI/GameHUD';
import SandboxControls from './UI/SandboxControls';
import MaintenanceOverlay from './UI/MaintenanceOverlay';
import ControllerHints from './UI/ControllerHints';
import LoadingScreen from './UI/LoadingScreen';
import SettingsMenu from './UI/SettingsMenu';
import MatchHonors from './UI/MatchHonors'; // [NEW]

import { useMultiplayer } from '../hooks/useMultiplayer';
import { useAuth } from '../contexts/AuthContext';

import { PHYSICS_CONFIG, getSpawnPosition, calculateStompDamage, getRandomPowerupType, getRandomPowerupPosition } from '../utils/physics';
import { generateMap } from '../utils/mapGenerator';
import { GAME_MODES } from '../utils/gameModes';
import { analytics } from '../utils/analytics';
import { audio } from '../utils/audio';
import { getPowerupInfo, DEFAULT_LOADOUT } from '../utils/powerups';
import { getIconById } from '../utils/economy';

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
    onInput,
    onUseItem,
    onUseLoadoutItem,
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
    gameMode,
    onInvincibleChange,
    isSpectating = false, // Added for spectator support
    explosionEvent,
    projectileImpactEvent,
    videoSettings
}) {
    // [PERFORMANCE] Pause rendering when tab is hidden to save GPU/Battery
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState === 'visible');
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // If tab is hidden, don't render ANYTHING heavy
    if (!isVisible) return null;

    return (
        <>
            {/* Environment & Lighting (AAA Overhaul) */}
            <Environment preset="city" blur={0.8} background />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 20, 10]} intensity={2} color="#ffffff" castShadow shadow-bias={-0.0001} />
            <pointLight position={[-10, 5, -10]} intensity={1.5} color="#00d4ff" /> {/* Cyan Rim */}
            <pointLight position={[10, 5, -10]} intensity={1.5} color="#ff006e" /> {/* Pink Rim */}

            {/* Fog (Dynamically matched to biome) */}
            <fog attach="fog" args={[mapData?.biome?.fog?.color || '#0b0b15', 10, 50]} />

            {/* Dynamic Camera */}
            <DynamicCamera
                playerPositions={playerPositions}
                localPlayerId={isSpectating ? null : localPlayerId} // Null ID forces center-view
                shake={screenShake}
                knockoutTarget={knockoutTarget}
                slowmo={slowmo}
                isSpectating={isSpectating}
            />

            {/* Arena */}
            <group>
                {mapData ? (
                    <ProceduralArena mapData={mapData} />
                ) : (
                    <ArenaChaos mapType={mapType} />
                )}
                {videoSettings.shadows !== false && (
                    <ContactShadows resolution={1024} scale={100} blur={2} opacity={0.5} far={10} color="#000000" />
                )}
                <Sparkles count={400} scale={40} size={3} speed={0.4} opacity={0.4} color="#ffffff" />
            </group>

            {/* Players */}
            {players.map((player, index) => {
                const iconData = getIconById(player.skinId);
                const iconPath = iconData?.imageUrl || player.iconPath || '/images/logo.png';
                const tier = player.tier || iconData?.tier || 1;
                
                return (
                    <Puck
                        key={player.id}
                        playerId={player.id}
                        playerName={player.name}
                        color={player.color}
                        startPosition={getSpawnPosition(index, mapData)}
                        isLocalPlayer={player.id === localPlayerId}
                        isBot={player.isBot || false}
                        iconPath={iconPath}
                        tier={tier}
                        powerup={playerPowerups[player.id]}
                        damage={playerDamage[player.id] || 0}
                        onKnockout={onKnockout}
                        onStomp={onStomp}
                        onPositionUpdate={player.id === localPlayerId ? onPositionUpdate : undefined}
                        onInput={player.id === localPlayerId ? onInput : undefined}
                        onCollision={player.id === localPlayerId ? onCollision : undefined}
                        onUseItem={player.id === localPlayerId ? onUseItem : undefined}
                        onUseLoadoutItem={player.id === localPlayerId ? onUseLoadoutItem : undefined}
                        onImpact={player.id === localPlayerId ? onImpact : undefined}
                        isPaused={isPaused}
                        remotePosition={player.id !== localPlayerId ? (playerPositions[player.id] || player.position) : undefined}
                        remoteVelocity={player.id !== localPlayerId ? player.velocity : undefined}
                        allPlayerPositions={playerPositions}
                        gameMode={gameMode}
                        skinTier={player.skinTier || 0}
                        onInvincibleChange={player.id === localPlayerId ? onInvincibleChange : undefined}
                        explosionEvent={explosionEvent}
                        projectileImpactEvent={projectileImpactEvent}
                    />
                );
            })}

            {/* Power-ups */}
            <PowerUps
                powerups={powerups}
                playerPositions={playerPositions}
                onCollect={onCollectPowerup}
            />

            {/* Effects */}
            <KnockoutEffects effects={effects} onEffectComplete={onEffectComplete} />

            {/* Explosion Particles */}
            {explosionEvent && (
                <ExplosionParticles
                    key={explosionEvent.timestamp}
                    position={explosionEvent.position}
                    color="#ff006e"
                    count={150}
                />
            )}

            {/* Post-processing (AAA Overhaul) */}
            <EffectComposer disableNormalPass>
                {videoSettings.bloom !== false && (
                    <Bloom
                        luminanceThreshold={1}
                        mipmapBlur
                        intensity={videoSettings.preset === 'low' ? 0.5 : 1.5}
                        radius={0.6}
                    />
                )}
                {videoSettings.chromaticAberration !== false && (
                    <ChromaticAberration offset={[0.002, 0.002]} />
                )}
                <ToneMapping />
                <Vignette eskil={false} offset={0.1} darkness={0.5} />
            </EffectComposer>
        </>
    );
}


// ============================================
// MAIN BATTLE ARENA COMPONENT
// ============================================
export default function BattleArena({ forceOffline }) {
    const { user, updateMatchStats, isAdmin } = useAuth() || {};
    const multiplayer = useMultiplayer(user?.email);

    // [NEW] Force Offline Mode from App.js (Auth Wall)
    useEffect(() => {
        if (forceOffline) {
            multiplayer.enableOfflineMode();
        }
    }, [forceOffline, multiplayer]);

    // ========== GAME STATE ==========
    const [gameMode, setGameMode] = useState('knockout');
    // mapSeed removed, using multiplayer.seed directly
    const [localPowerups, setLocalPowerups] = useState([]);
    const [playerPositions, setPlayerPositions] = useState({});
    const [projectileImpactEvent, setProjectileImpactEvent] = useState(null);
    const [playerPowerups, setPlayerPowerups] = useState({});
    const [playerDamage, setPlayerDamage] = useState({});
    const [playerStocks, setPlayerStocks] = useState({});
    const [playerScores, setPlayerScores] = useState({});
    const [projectiles, setProjectiles] = useState([]);
    const [playerLoadouts, setPlayerLoadouts] = useState({});
    const [effects, setEffects] = useState([]);
    const [knockoutMessage, setKnockoutMessage] = useState(null);
    const [knockoutTarget, setKnockoutTarget] = useState(null);
    const [explosionEvent, setExplosionEvent] = useState(null); // { position, force, timestamp }

    const [showSettings, setShowSettings] = useState(false);
    const [videoSettings, setVideoSettings] = useState(() => {
        const saved = localStorage.getItem('puckoff_video_settings');
        return saved ? JSON.parse(saved) : { bloom: true, shadows: true, chromaticAberration: true, preset: 'high' };
    });

    // Visual effects
    const [isPaused, setIsPaused] = useState(false);
    const [screenShake, setScreenShake] = useState(0);
    const [slowmo, setSlowmo] = useState(false);
    const shakeDecayTimerRef = useRef(null);

    // Game Start Countdown (Freeze before match)
    const [startCountdown, setStartCountdown] = useState(3); // 3, 2, 1, 'GO!', null

    // Cleanup shake timer on unmount
    useEffect(() => {
        return () => {
            if (shakeDecayTimerRef.current) clearInterval(shakeDecayTimerRef.current);
        };
    }, []);

    // Timer - Timestamp based for smooth syncing
    const [gameTimer, setGameTimer] = useState(180);
    const endTimeRef = useRef(Date.now() + 180000);
    const rafRef = useRef(null);

    // Stats tracking
    const [matchStats, setMatchStats] = useState({
        totalDamage: 0,
        maxCombo: 0,
        stomps: 0,
        knockouts: 0
    });
    const [combo, setCombo] = useState(0);
    const lastHitTime = useRef(0);
    const lastDamageTimeRef = useRef({}); // { playerId: timestamp }

    const replayRecorder = useReplayRecorder();
    const [activeReplay, setActiveReplay] = useState(null);
    const [showReplay, setShowReplay] = useState(false);

    // Loadout Cooldowns: { [playerId_itemId]: { end: timestamp, duration: ms } }
    const [powerupCooldowns, setPowerupCooldowns] = useState({});

    // Player state
    const [isInvincible, setIsInvincible] = useState(false);

    // FPS tracking
    const fpsRef = useRef(0);

    // Effect ID counter - FIX: Single atomic counter
    const nextIdRef = useRef(0);
    const getNextId = useCallback(() => nextIdRef.current++, []);

    // ========== GENERATE MAP ==========
    const mapData = useMemo(() => {
        if (multiplayer.seed) {
            const chaosLevel = gameMode === 'chaos' ? 0.8 : 0.5;
            // Use selectedMap as forcedBiomeId
            return generateMap(multiplayer.seed, 14, chaosLevel, multiplayer.selectedMap);
        }
        return null;
    }, [multiplayer.seed, multiplayer.selectedMap, gameMode]);

    const modeConfig = GAME_MODES[gameMode] || GAME_MODES.knockout;

    const gameEndedRef = useRef(false);

    const checkWinCondition = useCallback((timeUp = false) => {
        if (gameEndedRef.current) return;

        const mode = modeConfig;
        let winnerId = null;

        if (mode.winCondition === 'stocks') {
            const playersWithStocks = Object.entries(playerStocks).filter(([_, stocks]) => stocks > 0);
            if (playersWithStocks.length === 1) winnerId = playersWithStocks[0][0];
        } else if (mode.winCondition === 'score' && timeUp) {
            const sortedScores = Object.entries(playerScores).sort(([, a], [, b]) => b - a);
            if (sortedScores.length > 0) winnerId = sortedScores[0][0];
        } else if (mode.winCondition === 'lastStanding') {
            const playersWithStocks = Object.entries(playerStocks).filter(([_, stocks]) => stocks > 0);
            if (playersWithStocks.length === 1) winnerId = playersWithStocks[0][0];
        }

        if (winnerId) {
            gameEndedRef.current = true;
            if (multiplayer.connected) multiplayer.reportGameEnd?.(winnerId, playerScores, matchStats);
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

    // Sync with server time
    useEffect(() => {
        if (multiplayer.timer !== null && multiplayer.timer !== undefined) {
            // Calculate target end time based on server remaining time
            const targetEndTime = Date.now() + multiplayer.timer * 1000;

            // Only update if difference is significant (>500ms) to avoid jitter
            if (Math.abs(targetEndTime - endTimeRef.current) > 500) {
                endTimeRef.current = targetEndTime;
            }
        }
    }, [multiplayer.timer]);

    // Expose for testing
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__GAME_INTERNALS = {
                multiplayer,
                forceStart: () => {
                    console.log('🧪 Testing: Forcing Offline Start');
                    multiplayer.enableOfflineMode();
                    setTimeout(() => multiplayer.setReady(true), 500);
                }
            };
        }
    }, [multiplayer]);

    // ========== INITIAL COUNTDOWN LOGIC ==========
    useEffect(() => {
        if (multiplayer.gameState !== 'playing') {
            setStartCountdown(3);
            return;
        }

        if (typeof startCountdown === 'number' && startCountdown > 0) {
            const timer = setTimeout(() => {
                setStartCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (startCountdown === 0) {
            setStartCountdown('GO!');
            audio.playImpact(10); // Use impact sound for GO!

            // Start the actual game timer now
            if (modeConfig.timeLimit > 0) {
                endTimeRef.current = Date.now() + modeConfig.timeLimit * 1000;
            }

            setTimeout(() => setStartCountdown(null), 1000);
        }
    }, [multiplayer.gameState, startCountdown, modeConfig.timeLimit]);

    // Timer Loop
    useEffect(() => {
        if (multiplayer.gameState !== 'playing' || startCountdown !== null) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }

        // Initialize end time if just starting
        if (modeConfig.timeLimit > 0 && gameTimer === modeConfig.timeLimit) {
            endTimeRef.current = Date.now() + modeConfig.timeLimit * 1000;
        }

        const updateTimer = () => {
            if (modeConfig.timeLimit <= 0) return; // Infinite time

            const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));

            setGameTimer(prev => {
                if (prev !== remaining) {
                    if (remaining === 0) {
                        checkWinCondition(true);
                    }
                    return remaining;
                }
                return prev;
            });

            if (remaining > 0) {
                rafRef.current = requestAnimationFrame(updateTimer);
            }
        };

        rafRef.current = requestAnimationFrame(updateTimer);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [multiplayer.gameState, modeConfig.timeLimit, checkWinCondition]);

    // ========== WIN CONDITION CHECK ==========
    // ========== POWERUP EXECUTION CORE ==========
    const executePowerup = useCallback((powerupId, ownerId) => {
        const playerPos = playerPositions[ownerId];
        if (!playerPos) return;

        const powerupInfo = getPowerupInfo(powerupId);
        if (!powerupInfo) return;

        // Handle projectile powerups
        if (powerupInfo.type === 'projectile') {
            setProjectiles(prev => [...prev, {
                id: getNextId(),
                type: powerupInfo.id,
                position: [playerPos[0], playerPos[1] + 0.5, playerPos[2]],
                velocity: [0, 0, 8], // Forward
                damage: powerupInfo.damage || 20,
                ownerId: ownerId
            }]);
        }

        // Setup Buff Effects (handled later in update loop by effect duration)

        if (multiplayer.connected && ownerId === multiplayer.playerId) {
            multiplayer.usePowerup?.(powerupInfo.id);
        }

        return powerupInfo;
    }, [playerPositions, multiplayer, getNextId]);

    // ========== SPACEBAR: USE MAP POWERUP ==========
    const handleUseItem = useCallback(() => {
        const activePowerup = playerPowerups[multiplayer.playerId];
        if (!activePowerup) return;

        const powerupInfo = typeof activePowerup === 'string'
            ? getPowerupInfo(activePowerup)
            : activePowerup;

        if (!powerupInfo) return;

        executePowerup(powerupInfo.id, multiplayer.playerId);

        // Consume non-buff powerups
        if (powerupInfo.type !== 'buff') {
            setPlayerPowerups(prev => ({ ...prev, [multiplayer.playerId]: null }));
        }
    }, [playerPowerups, multiplayer, executePowerup]);

    // ========== 1-2-3 KEYS: USE LOADOUT ITEM ==========
    const handleUseLoadoutItem = useCallback((slotIndex) => {
        const myLoadout = playerLoadouts[multiplayer.playerId] || DEFAULT_LOADOUT || ['speed_boost', 'rocket', 'shield'];
        const itemId = myLoadout[slotIndex];
        if (!itemId) return;

        const now = Date.now();
        const cdKey = `${multiplayer.playerId}_${itemId}`;
        if (powerupCooldowns[cdKey] && now < powerupCooldowns[cdKey].end) {
            return; // Still on cooldown
        }

        const info = executePowerup(itemId, multiplayer.playerId);
        if (info) {
            // Set cooldown
            const cooldownTime = info.cooldown || 5000;
            setPowerupCooldowns(prev => ({
                ...prev,
                [cdKey]: { end: now + cooldownTime, duration: cooldownTime }
            }));
        }
    }, [playerLoadouts, multiplayer, powerupCooldowns, executePowerup]);

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
        if (shakeDecayTimerRef.current) clearInterval(shakeDecayTimerRef.current);
        shakeDecayTimerRef.current = setInterval(() => {
            setScreenShake(prev => {
                if (prev <= 0.005) {
                    clearInterval(shakeDecayTimerRef.current);
                    shakeDecayTimerRef.current = null;
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

    // ========== SYNC REMOTE DAMAGE ARRIVALS FOR DECAY ==========
    useEffect(() => {
        // Find which players took damage recently from remote sync
        Object.entries(playerDamage).forEach(([id, dmg]) => {
            const prevDmg = playerDamageRef.current[id] || 0;
            if (dmg > prevDmg) {
                lastDamageTimeRef.current[id] = Date.now();
            }
        });
        playerDamageRef.current = playerDamage;
    }, [playerDamage]);

    const handleCollision = useCallback((impactForce) => {
        const damage = Math.floor(impactForce * 2);

        setPlayerDamage(prev => {
            const current = prev[multiplayer.playerId] || 0;
            const newDamage = current + damage;
            lastDamageTimeRef.current[multiplayer.playerId] = Date.now();
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
        logGame(`Stomp! Target: ${targetId} Damage: ${damage}`, 'warn');

        setPlayerDamage(prev => {
            const newDmg = (prev[targetId] || 0) + damage;
            lastDamageTimeRef.current[targetId] = Date.now();
            return { ...prev, [targetId]: newDmg };
        });

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
    const handleKnockout = useCallback((knockedOutPlayerId, killerId) => {
        logGame(`Knockout: ${knockedOutPlayerId} by ${killerId || 'unknown'}`, 'error');
        const pos = playerPositions[knockedOutPlayerId] || [0, 0, 0];
        const player = multiplayer.players.find(p => p.id === knockedOutPlayerId);
        const color = player?.color || '#ffffff';

        // Dramatic effects

        // HIT STOP: Brief freeze-frame for impact
        setIsPaused(true);
        setTimeout(() => {
            setIsPaused(false);
            setSlowmo(true);
        }, 80); // 80ms freeze

        setKnockoutTarget(knockedOutPlayerId);

        // TRIGGER EXPLOSION PHYSICS
        setExplosionEvent({
            position: pos,
            force: 60, // Massive force
            timestamp: Date.now()
        });

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

        // Score for killer — ONLY the actual killer, not everyone
        const scorerId = killerId && killerId !== knockedOutPlayerId ? killerId : multiplayer.playerId;
        if (scorerId !== knockedOutPlayerId) {
            setPlayerScores(prev => ({
                ...prev,
                [scorerId]: (prev[scorerId] || 0) + 1
            }));
        }

        // Reset damage
        setPlayerDamage(prev => ({ ...prev, [knockedOutPlayerId]: 0 }));
        setMatchStats(s => ({ ...s, knockouts: s.knockouts + 1 }));

        // Analytics tracking
        analytics.trackKnockout(knockedOutPlayerId, multiplayer.playerId, 'knockout');

        // Capture replay
        const replay = replayRecorder.captureReplay(Date.now());
        if (replay.frames.length > 0) {
            setActiveReplay(replay);
            // Show replay after slowmo
            setTimeout(() => setShowReplay(true), 1500);
        }

        setKnockoutMessage('KNOCKOUT!');
        setTimeout(() => {
            setKnockoutMessage(null);
            // Check win condition after knockout
            setTimeout(() => checkWinCondition(), 100);
        }, 1500);

        if (multiplayer.connected) {
            multiplayer.reportKnockout?.(knockedOutPlayerId);
        }
    }, [playerPositions, multiplayer, modeConfig.stocksPerPlayer, getNextId, checkWinCondition, replayRecorder]);

    // ========== POSITION UPDATE ==========
    const handlePositionUpdate = useCallback((playerId, position, velocity) => {
        setPlayerPositions(prev => ({
            ...prev,
            [playerId]: position
        }));

        if (playerId === multiplayer.playerId && Math.random() < 0.25) {
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
        audio.playPowerup();

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
    const handleProjectileHit = useCallback((projId, targetId, type, impactSpeed, ownerId) => {
        let damage = 20;
        if (type === 'rocket') damage = 35;
        if (type === 'bomb_throw') damage = 50;

        // Velocity bonus
        if (impactSpeed) {
            if (impactSpeed > 25) damage = Math.floor(damage * 1.5);
            else if (impactSpeed > 15) damage = Math.floor(damage * 1.2);
        }

        setPlayerDamage(prev => ({
            ...prev,
            [targetId]: (prev[targetId] || 0) + damage
        }));

        // [NEW] Attribute "Last Hit By" for knockouts
        setProjectileImpactEvent({ targetId, ownerId, timestamp: Date.now() });
        setTimeout(() => setProjectileImpactEvent(null), 500);

        setProjectiles(prev => prev.filter(p => p.id !== projId));
    }, []);

    // ========== POWERUP SPAWNING ==========
    useEffect(() => {
        if (multiplayer.gameState !== 'playing') return;
        if (multiplayer.connected && !multiplayer.isOffline) return; // Allow offline with faked connection

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
    }, [multiplayer.gameState, multiplayer.connected, multiplayer.isOffline, localPowerups.length, modeConfig.powerupSpawnRate, mapData, getNextId]);

    // ========== DAMAGE DECAY LOOP ==========
    useEffect(() => {
        if (!modeConfig.damageDecay || multiplayer.gameState !== 'playing' || startCountdown !== null) return;

        const decayInterval = setInterval(() => {
            const now = Date.now();
            let changed = false;

            setPlayerDamage(prev => {
                const newDamage = { ...prev };
                Object.entries(newDamage).forEach(([id, dmg]) => {
                    const lastHit = lastDamageTimeRef.current[id] || now;
                    // If no damage taken in last 3 seconds, heal 1 damage per tick (5 DPS at 200ms)
                    if (dmg > 0 && now - lastHit > 3000) {
                        newDamage[id] = Math.max(0, dmg - 1);
                        changed = true;
                    }
                });
                return changed ? newDamage : prev;
            });

            // Only local player reports to server
            if (changed && multiplayer.connected && playerDamageRef.current[multiplayer.playerId] > 0) {
                const myLastHit = lastDamageTimeRef.current[multiplayer.playerId] || now;
                if (now - myLastHit > 3000) {
                    // We don't spam network every 200ms, rely on clients predicting decay 
                    // or sync next time we hit
                }
            }

        }, 200);

        return () => clearInterval(decayInterval);
    }, [modeConfig.damageDecay, multiplayer.gameState, startCountdown, multiplayer.connected, multiplayer.playerId]);

    // ========== LOADOUT POWERUP SYSTEM OVERHAULED ==========
    // Previously random refresh. Now uses 1, 2, 3 cooldown slots.

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
                    matchmakingStatus={multiplayer.matchmakingStatus}
                    onStartMatchmaking={multiplayer.startMatchmaking}
                    onCancelMatchmaking={multiplayer.cancelMatchmaking}
                    currentRegion={multiplayer.currentRegion}
                    onSwitchRegion={multiplayer.switchRegion}
                    onReady={(ready, loadout) => {
                        setPlayerLoadouts(prev => ({ ...prev, [multiplayer.playerId]: loadout }));
                        multiplayer.setReady?.(ready);
                    }}
                    selectedMap={multiplayer.selectedMap}
                    gameMode={gameMode}
                    mapVotes={multiplayer.mapVotes}
                    onVoteMap={(mapId) => {
                        multiplayer.voteMap?.(mapId);
                    }}
                    onSelectMode={(mode) => {
                        setGameMode(mode);
                        multiplayer.selectMode?.(mode);
                    }}
                    onBack={multiplayer.leaveRoom}
                    connectionError={multiplayer.connectionError}
                    onPlayOffline={multiplayer.enableOfflineMode}
                    onTestMaintenance={multiplayer.triggerTestMaintenance}
                    onShowSettings={() => setShowSettings(true)}
                    fetchLeaderboard={multiplayer.fetchLeaderboard}
                    quests={multiplayer.quests}
                    fetchQuests={multiplayer.fetchQuests}
                />
            );
        }

        if (multiplayer.gameState === 'ended') {
            return (
                <MatchHonors 
                    honors={multiplayer.honors}
                    isWinner={multiplayer.winner === multiplayer.playerId}
                    onRestart={() => {
                        audio.playClick();
                        multiplayer.setHonors(null);
                        multiplayer.leaveRoom();
                    }}
                />
            );
        }

        // [NEW] Sandbox UI
        if (multiplayer.roomCode === 'sandbox' && multiplayer.gameState === 'playing') {
            return (
                <>
                    {/* Minimal HUD for Free Play */}
                    <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', zIndex: 10 }}>
                        <h2>🧪 FREE PLAY</h2>
                        <p style={{ opacity: 0.7 }}>Experiment with physics and powerups</p>
                    </div>

                    <SandboxControls
                        debugMode={isAdmin} // Reusing isAdmin state for debug toggle visually
                        onToggleDebug={() => { /* Toggle debug visual if we had one */ }}
                        onReset={() => {
                            // Reset local player
                            setPlayerDamage({});
                            setPlayerStocks({});
                            setLocalPowerups([]);
                            // Respawn
                            const startPos = getSpawnPosition(0, mapData);
                            setPlayerPositions({ [multiplayer.playerId]: startPos });
                            multiplayer.sendPosition?.(startPos, [0, 0, 0], 0);
                        }}
                        onSpawnPowerup={(type) => {
                            setLocalPowerups(prev => [...prev, {
                                id: `sandbox_${getNextId()}`,
                                type: type,
                                position: getRandomPowerupPosition(mapData)
                            }]);
                        }}
                    />

                    {/* Overlay Navigation */}
                    <button
                        style={{ position: 'absolute', top: 20, right: 20, zIndex: 100 }}
                        className="btn btn-small"
                        onClick={multiplayer.leaveRoom}
                    >
                        EXIT SANDBOX
                    </button>
                </>
            );
        }

        return null;
    };



    // ... (in render)
    return (
        <div className="game-container">
            {/* Maintenance Overlay - Always Visible if Active */}
            {multiplayer.serverMessage && multiplayer.serverMessage.type === 'maintenance' && (
                <MaintenanceOverlay message={multiplayer.serverMessage} />
            )}

            {isAdmin && <DebugLogger visible={true} />}
            <ControllerHints />
            {renderOverlay()}

            <Canvas
                className="game-canvas"
                shadows
                camera={{ position: [0, 18, 15], fov: 50 }}
                gl={{ antialias: true, alpha: false }}
            >
                <Suspense fallback={<Html center><LoadingScreen /></Html>}>
                    <Physics 
                        gravity={PHYSICS_CONFIG.gravity} 
                        step={1 / 120} 
                        substeps={4} 
                        broadphase="SAP" 
                        allowSleep
                    >
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
                                    onInput={multiplayer.sendInput}
                                    onCollision={handleCollision}
                                    isSpectating={multiplayer.isSpectating}
                                    onUseItem={handleUseItem}
                                    onUseLoadoutItem={handleUseLoadoutItem}
                                    effects={effects}
                                    onEffectComplete={handleEffectComplete}
                                    mapData={mapData}
                                    mapType={multiplayer.selectedMap}
                                    onImpact={handleImpact}
                                    isPaused={isPaused || startCountdown !== null} // Freeze physics
                                    screenShake={screenShake}
                                    knockoutTarget={knockoutTarget}
                                    slowmo={slowmo}
                                    gameMode={gameMode}
                                    onInvincibleChange={setIsInvincible}
                                    explosionEvent={explosionEvent}
                                    projectileImpactEvent={projectileImpactEvent}
                                    videoSettings={videoSettings}
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
                    cooldowns={powerupCooldowns}
                    damageStats={hudDamage}
                    stocks={hudStocks}
                    knockoutMessage={knockoutMessage}
                    gameStatus={multiplayer.gameState}
                    gameMode={gameMode}
                    combo={combo}
                    lastHitTime={lastHitTime.current}
                    players={multiplayer.players}
                    localPlayerId={multiplayer.playerId}
                    fps={fpsRef.current}
                    invincible={isInvincible}
                />
            )}

            {/* Spectator HUD */}
            {multiplayer.isSpectating && (
                <div className="spectator-hud">
                    <div className="spectator-badge">
                        <div className="pulse-dot"></div>
                        <span>SPECTATING</span>
                    </div>
                    {multiplayer.spectatorCount > 1 && (
                        <div className="spectator-count">
                             {multiplayer.spectatorCount} observers
                        </div>
                    )}
                    <button 
                        className="btn-glass exit-spectator-btn"
                        onClick={multiplayer.exitSpectator}
                    >
                        LEAVE MATCH
                    </button>
                </div>
            )}

            {/* Match Start Countdown Overlay */}
            {startCountdown !== null && multiplayer.gameState === 'playing' && (
                <div className="countdown-overlay">
                    <h1 className={startCountdown === 'GO!' ? 'go-text' : 'number-text'}>
                        {startCountdown}
                    </h1>
                    {multiplayer.wagerAmount > 0 && startCountdown !== 'GO!' && (
                        <div className="prize-pool-container">
                            <div className="prize-pool-label">TOTAL PRIZE POOL</div>
                            <div className="prize-pool-value">{multiplayer.wagerAmount * multiplayer.players.length} Z</div>
                            {multiplayer.wagerAmount >= 500 && (
                                <div className="high-stakes-warning-banner">⚠️ HIGH STAKES MATCH ⚠️</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Replay Killcam */}
            {showReplay && activeReplay && (
                <ReplayPlayer
                    replayData={activeReplay}
                    onClose={() => setShowReplay(false)}
                />
            )}

            {showSettings && (
                <SettingsMenu
                    videoSettings={videoSettings}
                    setVideoSettings={setVideoSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {/* Admin/Debug tools */}
            {isAdmin && (
                <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 1000, display: 'flex', gap: '5px' }}>
                    <button className="btn-small" onClick={() => setShowSettings(true)}>Settings</button>
                </div>
            )}

            <style jsx>{`
                .game-container {
                    position: fixed;
                    inset: 0;
                    background: #000;
                }
                .countdown-overlay {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.5);
                    z-index: 150;
                    pointer-events: none;
                }
                .number-text, .go-text {
                    font-family: 'Orbitron', sans-serif;
                    font-weight: 900;
                    padding: 0;
                    margin: 0;
                    text-align: center;
                }
                .number-text {
                    font-size: 15rem;
                    color: #fff;
                    text-shadow: 0 0 50px rgba(0,212,255,0.8);
                    animation: count-pop 1s infinite;
                }
                .go-text {
                    font-size: 20rem;
                    background: linear-gradient(135deg, #00ff87, #60efff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 50px rgba(0,255,135,0.8));
                    animation: go-pop 0.5s ease-out;
                }
                .prize-pool-container {
                    position: absolute;
                    bottom: 20%;
                    width: 100%;
                    text-align: center;
                    animation: fade-in-up 0.5s ease-out;
                }
                .prize-pool-label {
                    font-size: 1rem;
                    letter-spacing: 0.3em;
                    color: rgba(255,255,255,0.6);
                    font-family: 'Orbitron', sans-serif;
                }
                .prize-pool-value {
                    font-size: 5rem;
                    font-weight: 900;
                    color: #ffd700;
                    text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
                    font-family: 'Orbitron', sans-serif;
                }
                .high-stakes-warning-banner {
                    margin-top: 2rem;
                    font-size: 1.5rem;
                    font-weight: 900;
                    color: #ff006e;
                    text-shadow: 0 0 20px #ff006e;
                    animation: pulse 1s infinite;
                    letter-spacing: 0.1em;
                }
                    text-shadow: 0 0 80px rgba(0,255,135,0.6);
                    animation: go-blast 1s ease-out forwards;
                }
                @keyframes count-pop {
                    0% { transform: scale(0.5); opacity: 0; }
                    20% { transform: scale(1.1); opacity: 1; }
                    40% { transform: scale(1); opacity: 1; }
                    80% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes go-blast {
                    0% { transform: scale(0.1) rotate(-10deg); opacity: 0; }
                    30% { transform: scale(1.2) rotate(5deg); opacity: 1; filter: brightness(2); }
                    100% { transform: scale(3) rotate(0deg); opacity: 0; filter: brightness(1); }
                }

                .spectator-hud {
                    position: fixed;
                    top: 2rem;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    z-index: 200;
                    pointer-events: none;
                }

                .spectator-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.6rem 1.2rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50px;
                    color: #fff;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.9rem;
                    letter-spacing: 2px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    pointer-events: auto;
                }

                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #ff006e;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #ff006e;
                    animation: pulse 1.5s infinite;
                }

                .spectator-count {
                    font-family: 'Inter', sans-serif;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.6);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .exit-spectator-btn {
                    pointer-events: auto;
                    font-size: 0.8rem;
                    padding: 0.5rem 1.5rem;
                    border-radius: 8px;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

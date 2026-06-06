import React, { useState } from 'react';
import Store from './Store';
import PackOpener from './PackOpener';
import LoadoutMenu from './LoadoutMenu';
import IconChooser from './IconChooser';
import AdminDashboard from './AdminDashboard';
import SeasonPassModal from './SeasonPassModal';
import FriendListModal from './FriendListModal';
import PlayerProfileModal from './PlayerProfileModal';
import NotificationCenter from './NotificationCenter';
import LobbyChat from './LobbyChat';
import TradeModal from './TradeModal';
import CraftingModal from './CraftingModal';
import ProModal from './ProModal';
import HighStakesConfirmModal from './HighStakesConfirmModal';
import { useMultiplayer } from '../../hooks/useMultiplayer';
// AdBanner removed from Lobby (AdSense policy: no ads on nav/menu screens)
import ZoinCube from './ZoinCube';
import { getIconById } from '../../utils/economy';
import { DEFAULT_LOADOUT } from '../../utils/powerups';
import { useAuth } from '../../contexts/AuthContext';
import { audio } from '../../utils/audio';

import { getBiomeList } from '../../utils/mapGenerator';
import { GAME_MODES } from '../../utils/gameModes';
import { getLevelFromXp, getLevelProgress, getRankName, getRankFromRP, getRankProgress } from '../../utils/leveling';
import { REGIONS } from '../../utils/config';

export default function Lobby({
    connected,
    roomCode,
    players,
    playerId,
    onCreateRoom,
    onJoinRoom,
    onQuickJoin,
    onReady,
    onVoteMap,
    onBack,
    connectionError,
    onPlayOffline,
    selectedMap,
    gameMode,
    onSelectMode,
    mapVotes,
    onTestMaintenance,
    onShowSettings,
    matchmakingStatus = 'idle',
    onStartMatchmaking,
    onCancelMatchmaking,
    currentRegion,
    onSwitchRegion,
    fetchLeaderboard,
    quests = [],
    fetchQuests
}) {
    const { user, inventory, loginWithGoogle, loginWithEmail, signupWithEmail, logout, equipIcon, updateLoadout, setActiveLoadout, updateUsername, loading, joinWagerMatch, isAdmin, notifications, sendNotification } = useAuth();
    const {
        lastInvite, setLastInvite, invitePlayer, chatMessages, sendChatMessage,
        dailyShop, purchaseShopItem,
        tradeInvite, tradeSession, craftItem,
        sendTradeInvite, respondToTrade, updateTradeOffer, setTradeReady, executeTrade, cancelTrade, // [TRADE] New methods
        claimProReward // [PRO]
    } = useMultiplayer(user); // [NEW] Initialize multiplayer context

    const [showStore, setShowStore] = useState(false);
    const [showCrafting, setShowCrafting] = useState(false);
    const [showProModal, setShowProModal] = useState(false);
    const [showHSConfirm, setShowHSConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [showLoadout, setShowLoadout] = useState(false);
    const [showIcons, setShowIcons] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // login or signup
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [isWagerMode, setIsWagerMode] = useState(false);
    const [wagerAmount, setWagerAmount] = useState(100);

    const [openingPack, setOpeningPack] = useState(null);
    const [playerName, setPlayerName] = useState(inventory?.username || user?.displayName || '');
    const [activePlayers, setActivePlayers] = useState(0);

    const isHighStakesActive = isWagerMode && wagerAmount >= 500;
    const [searchingTime, setSearchingTime] = useState(0);
    const [showRegionMenu, setShowRegionMenu] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [leaderboardCategory, setLeaderboardCategory] = useState('rankPoints');
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [showQuests, setShowQuests] = useState(false);
    const [showSeasonPass, setShowSeasonPass] = useState(false);
    const [showFriends, setShowFriends] = useState(false); // [NEW] Social state
    const [selectedProfileUid, setSelectedProfileUid] = useState(null); // [NEW] Profile search state
    const [showNotifications, setShowNotifications] = useState(false); // [NEW] Notification state

    // [NEW] Force Loadout Selection if empty
    React.useEffect(() => {
        if (connected && inventory) {
            const currentLoadout = inventory.loadouts?.[inventory.activeLoadout || 0];
            const isValid = currentLoadout && currentLoadout.length === 3 && currentLoadout.every(p => p !== null);

            if (!isValid && !showLoadout) {
                // Determine if we should set default or prompt user
                // User asked for "panel pop up for them to select 3"
                // But also "maybe having 3 default ones"
                // Let's set a default IF it's completely empty, otherwise show menu

                if (!currentLoadout || currentLoadout.length === 0) {
                    // Auto-equip default if completely missing
                    updateLoadout(0, DEFAULT_LOADOUT);
                } else {
                    // If partially filled or invalid, show menu
                    setShowLoadout(true);
                }
            }
        }
    }, [connected, inventory, showLoadout, updateLoadout]);

    // [NEW] Listen for server stats
    React.useEffect(() => {
        const { socket } = require('../../services/socket'); // Import here to avoid circular dep issues if any

        const onServerStats = (data) => {
            if (data?.playersOnline) setActivePlayers(data.playersOnline);
        };

        socket.on('serverStats', onServerStats);
        return () => {
            socket.off('serverStats', onServerStats);
        };
    }, []);

    // [NEW] Sync username from inventory if available
    React.useEffect(() => {
        if (inventory?.username) {
            setPlayerName(inventory.username);
        } else if (user?.displayName) {
            setPlayerName(user.displayName);
        }
    }, [inventory?.username, user]);

    // [NEW] Matchmaking Timer
    React.useEffect(() => {
        let interval;
        if (matchmakingStatus === 'searching') {
            setSearchingTime(0);
            interval = setInterval(() => {
                setSearchingTime(prev => prev + 1);
            }, 1000);
        } else {
            setSearchingTime(0);
        }
        return () => clearInterval(interval);
    }, [matchmakingStatus]);

    // [NEW] Auto-close auth modal when signed in
    React.useEffect(() => {
        if (user && showAuthModal) {
            setShowAuthModal(false);
        }
    }, [user, showAuthModal]);

    // [NEW] Save username on blur or enter
    const handleNameChange = (e) => {
        setPlayerName(e.target.value);
    };

    const saveName = () => {
        if (user && playerName !== inventory?.username) {
            updateUsername(playerName);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            if (authMode === 'login') {
                await loginWithEmail(authEmail, authPassword);
            } else {
                await signupWithEmail(authEmail, authPassword);
            }
            setShowAuthModal(false);
            setAuthEmail('');
            setAuthPassword('');
        } catch (error) {
            setAuthError(error.message);
        }
    };

    const localPlayer = players.find(p => p.id === playerId);
    const isReady = localPlayer?.ready;

    // [NEW] Map options logic
    const getVotingOptions = (code) => {
        const allBiomes = getBiomeList();
        if (code === 'OFFLINE') return allBiomes; // Show all maps for free play

        // Online: Pseudo-random based on roomCode so all clients see same 3
        if (!code) return allBiomes.slice(0, 3);

        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            hash = code.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Simple seeded shuffle
        const shuffled = [...allBiomes];
        let m = shuffled.length, t, idx;
        let seedRng = (Math.abs(hash) % 1000000) / 1000000; // Normalize hash to a seed between 0 and 1
        while (m) {
            seedRng = (seedRng * 9301 + 49297) % 233280 / 233280; // Simple LCG for pseudo-randomness
            idx = Math.floor(seedRng * m--);
            t = shuffled[m];
            shuffled[m] = shuffled[idx];
            shuffled[idx] = t;
        }
        return shuffled.slice(0, 3);
    };

    return (
        <div className="lobby-overlay">
            {/* Modals */}
            {/* Matchmaking Overlay */}
            {matchmakingStatus === 'searching' && (
                <div className="matchmaking-overlay">
                    <div className="searching-card glass-dark">
                        <div className="searching-spinner">
                            <div className="spinner-orbit"></div>
                            <div className="spinner-puck"></div>
                        </div>
                        <h2>SEARCHING FOR MATCH</h2>
                        <div className="searching-timer">{Math.floor(searchingTime / 60)}:{(searchingTime % 60).toString().padStart(2, '0')}</div>
                        <p className="searching-desc">Finding the best arena for you...</p>
                        <button className="btn btn-secondary cancel-search" onClick={() => { audio.playClick(); onCancelMatchmaking(); }}>
                            CANCEL
                        </button>
                    </div>
                </div>
            )}

            {openingPack && (
                <PackOpener
                    packType={openingPack}
                    onClose={() => {
                        setOpeningPack(null);
                        // Stats are updated in AuthContext now
                    }}
                />
            )}

            {/* LEADERBOARD MODAL */}
            {showLeaderboard && (
                <div className="leaderboard-overlay" onClick={() => setShowLeaderboard(false)}>
                    <div className="leaderboard-modal glass-dark" onClick={e => e.stopPropagation()}>
                        <div className="lb-header">
                            <h2>🏆 Global Leaderboard</h2>
                            <button className="lb-close" onClick={() => setShowLeaderboard(false)}>✕</button>
                        </div>
                        <div className="lb-tabs">
                            {[
                                { key: 'rankPoints', label: 'Rank Points' },
                                { key: 'wins', label: 'Wins' },
                                { key: 'kills', label: 'Kills' }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    className={`lb-tab ${leaderboardCategory === tab.key ? 'active' : ''}`}
                                    onClick={() => {
                                        setLeaderboardCategory(tab.key);
                                        if (fetchLeaderboard) {
                                            setLeaderboardLoading(true);
                                            fetchLeaderboard(tab.key)
                                                .then(data => setLeaderboardData(data))
                                                .catch(err => console.error(err))
                                                .finally(() => setLeaderboardLoading(false));
                                        }
                                    }}
                                >{tab.label}</button>
                            ))}
                        </div>
                        <div className="lb-list">
                            {leaderboardLoading ? (
                                <div className="lb-loading">Loading...</div>
                            ) : leaderboardData.length === 0 ? (
                                <div className="lb-empty">No data yet. Go play some matches! 🎮</div>
                            ) : (
                                leaderboardData.map((entry, idx) => (
                                    <div key={entry.id} className={`lb-row ${idx < 3 ? 'lb-top3' : ''} ${entry.uid === user?.uid ? 'is-self' : ''}`}>
                                        <div className="lb-rank">
                                            {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </div>
                                        <div
                                            className="lb-name player-name clickable"
                                            onClick={() => entry.uid && setSelectedProfileUid(entry.uid)}
                                        >
                                            {entry.name}
                                        </div>
                                        <div className="lb-badge" style={{ color: getRankFromRP(entry.rankPoints).color }}>
                                            {getRankFromRP(entry.rankPoints).name}
                                        </div>
                                        <div className="lb-score player-rp">{entry[leaderboardCategory] || 0}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showStore && (
                <Store
                    onClose={() => setShowStore(false)}
                    onOpenPack={(type) => {
                        setOpeningPack(type);
                        setShowStore(false);
                    }}
                    playerInventory={inventory?.icons || []}
                    dailyShop={dailyShop}
                    purchaseShopItem={purchaseShopItem}
                />
            )}

            {showLoadout && (
                <LoadoutMenu
                    equipped={inventory?.loadouts?.[inventory?.activeLoadout || 0] || DEFAULT_LOADOUT}
                    loadoutSlot={inventory?.activeLoadout || 0}
                    allLoadouts={inventory?.loadouts || [DEFAULT_LOADOUT, DEFAULT_LOADOUT, DEFAULT_LOADOUT]}
                    onEquip={(newLoadout, slot) => {
                        updateLoadout(slot ?? inventory?.activeLoadout ?? 0, newLoadout);
                    }}
                    onSwitchSlot={(slot) => {
                        setActiveLoadout(slot);
                    }}
                    onClose={() => setShowLoadout(false)}
                />
            )}

            {showIcons && (
                <IconChooser
                    ownedIcons={inventory?.icons || []}
                    equippedIcon={inventory?.equippedSkin}
                    isLegacy={inventory?.isLegacy}
                    loading={loading}
                    onClose={() => setShowIcons(false)}
                    onSelect={(icon) => {
                        equipIcon(icon.id);
                        setShowIcons(false);
                    }}
                />
            )}

            {/* [CRAFTING] Modal */}
            {showCrafting && (
                <CraftingModal 
                    onClose={() => setShowCrafting(false)}
                    inventory={inventory}
                    craftItem={craftItem}
                    showNotification={sendNotification}
                />
            )}

            {showAdmin && (
                <AdminDashboard onClose={() => setShowAdmin(false)} onTestMaintenance={onTestMaintenance} />
            )}

            {showQuests && (
                <div className="quest-modal-overlay" onClick={() => setShowQuests(false)}>
                    <div className="quest-modal glass-dark" onClick={e => e.stopPropagation()}>
                        <div className="quest-header">
                            <h2>🚀 Daily Challenges</h2>
                            <button className="quest-close" onClick={() => setShowQuests(false)}>✕</button>
                        </div>
                        <div className="quest-list">
                            {quests.length === 0 ? (
                                <div className="quest-empty">Loading challenges...</div>
                            ) : (
                                quests.map(q => (
                                    <div key={q.id} className={`quest-item ${q.completed ? 'completed' : ''}`}>
                                        <div className="quest-info">
                                            <div className="quest-top">
                                                <span className="quest-label">{q.label}</span>
                                                <span className="quest-reward">+ {q.reward} Z</span>
                                            </div>
                                            <p className="quest-desc">{q.description}</p>
                                        </div>
                                        <div className="quest-progress-container">
                                            <div className="quest-progress-bar">
                                                <div 
                                                    className="quest-progress-fill" 
                                                    style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="quest-stats">
                                                {q.progress} / {q.goal}
                                            </div>
                                        </div>
                                        {q.completed && <div className="quest-check">✓</div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showSeasonPass && <SeasonPassModal onClose={() => setShowSeasonPass(false)} />}
            {showFriends && (
                <FriendListModal 
                    onClose={() => setShowFriends(false)} 
                    invitePlayer={(targetUid) => {
                        const inviterName = inventory?.username || user?.displayName || 'A Friend';
                        invitePlayer(targetUid, roomCode || 'LOBBY', inviterName);
                        sendNotification(targetUid, 'invite', { roomCode: roomCode || 'LOBBY' });
                    }}
                    onTradeInvite={sendTradeInvite} // [TRADE] New prop
                    onProfileClick={setSelectedProfileUid}
                />
            )}

            {/* [TRADE] Incoming Invitation Popup */}
            {tradeInvite && (
                <div className="trade-invite-popup glass-dark">
                    <div className="invite-content">
                        <span className="invite-icon">🤝</span>
                        <div className="invite-text">
                            <strong>{tradeInvite.fromUsername}</strong> wants to trade!
                        </div>
                    </div>
                    <div className="invite-actions">
                        <button className="btn-decline" onClick={() => respondToTrade(tradeInvite.inviteId, false)}>Decline</button>
                        <button className="btn-accept" onClick={() => respondToTrade(tradeInvite.inviteId, true)}>Accept</button>
                    </div>
                </div>
            )}

            {/* [TRADE] Active Trade Session Modal */}
            <HighStakesConfirmModal 
                isOpen={showHSConfirm}
                amount={wagerAmount}
                onClose={() => setShowHSConfirm(false)}
                onConfirm={() => {
                    setShowHSConfirm(false);
                    pendingAction?.();
                }}
            />

            {tradeSession && (
                <TradeModal 
                    session={tradeSession}
                    user={user}
                    inventory={inventory}
                    onUpdate={updateTradeOffer}
                    onReady={setTradeReady}
                    onConfirm={executeTrade}
                    onCancel={cancelTrade}
                />
            )}

            <ProModal 
                isOpen={showProModal}
                onClose={() => setShowProModal(false)}
                user={user}
                isPro={inventory?.isPro}
                onSubscribe={async () => {
                    // Simulation of purchase
                    const res = await fetch('/api/admin/simulate-purchase', {
                        method: 'POST',
                        body: JSON.stringify({ email: user.email, packId: 'puckoff_pro' }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setShowProModal(false);
                        sendNotification(user.uid, 'success', { title: 'PUCKOFF PRO ACTIVATED!', message: 'Welcome to the elite tier.' });
                    }
                }}
            />

            {showNotifications && (
                <NotificationCenter 
                    onClose={() => setShowNotifications(false)}
                    onJoinRoom={onJoinRoom}
                />
            )}

            {/* [NEW] Global Lobby Chat */}
            {connected && !showAuthModal && (
                <LobbyChat 
                    user={user} 
                    inventory={inventory} 
                    chatMessages={chatMessages || []} 
                    sendChatMessage={sendChatMessage} 
                    onProfileClick={setSelectedProfileUid}
                />
            )}

            {/* [NEW] Player Profile Modal */}
            {selectedProfileUid && (
                <PlayerProfileModal 
                    uid={selectedProfileUid} 
                    onClose={() => setSelectedProfileUid(null)}
                    onInvite={invitePlayer}
                />
            )}

            {/* [NEW] Social Invite Notification */}
            {lastInvite && (
                <div className="social-invite-toast glass-dark">
                    <div className="invite-icon">🎖️</div>
                    <div className="invite-content">
                        <strong>{lastInvite.inviterName}</strong>
                        <span>Invited you to a match!</span>
                    </div>
                    <div className="invite-actions">
                        <button className="btn-accept" onClick={() => {
                            audio.playClick();
                            onJoinRoom(lastInvite.roomCode);
                            setLastInvite(null);
                        }}>Accept</button>
                        <button className="btn-decline" onClick={() => {
                            audio.playClick();
                            setLastInvite(null);
                        }}>✕</button>
                    </div>
                </div>
            )}

                {/* Auth Modal */}
            {showAuthModal && (
                <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
                    <div className="auth-modal glass-dark" onClick={e => e.stopPropagation()}>
                        <h2>{authMode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</h2>
                        <form onSubmit={handleAuth}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={authEmail}
                                onChange={e => setAuthEmail(e.target.value)}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)}
                                required
                            />
                            {authError && <div className="auth-error">{authError}</div>}
                            <button type="submit" className="btn btn-primary">
                                {authMode === 'login' ? 'SIGN IN' : 'SIGN UP'}
                            </button>
                        </form>
                        <button className="btn btn-google" onClick={loginWithGoogle}>
                            🔵 Continue with Google
                        </button>
                        <div className="auth-toggle">
                            {authMode === 'login' ? (
                                <span>New here? <button className="btn-link" onClick={() => setAuthMode('signup')}>Create account</button></span>
                            ) : (
                                <span>Have an account? <button className="btn-link" onClick={() => setAuthMode('login')}>Sign in</button></span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={`lobby-container glass-dark ${isHighStakesActive ? 'heat-mode' : ''}`} style={{ padding: '3rem 2rem', borderTop: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 0 50px rgba(0,212,255,0.1)' }}>
                {/* User Bar */}
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="active-players-pill" title="Players Online">
                        <span className="live-dot">●</span>
                        {activePlayers} Online
                    </div>

                    {/* Region Picker */}
                    <div className="region-selector-container">
                        <button className="region-btn" onClick={() => setShowRegionMenu(!showRegionMenu)}>
                            {currentRegion?.name || 'Region'}
                            <span style={{ marginLeft: '4px', opacity: 0.5, fontSize: '0.8em' }}>▼</span>
                        </button>
                        {showRegionMenu && (
                            <div className="region-dropdown">
                                {REGIONS.map(r => (
                                    <div 
                                        key={r.id} 
                                        className={`region-item ${currentRegion?.id === r.id ? 'active' : ''}`}
                                        onClick={() => {
                                            onSwitchRegion?.(r.id);
                                            setShowRegionMenu(false);
                                            audio.playClick();
                                        }}
                                    >
                                        {r.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="btn-lobby-circle" onClick={() => {
                        audio.playClick();
                        setShowLeaderboard(true);
                        if (fetchLeaderboard) {
                            setLeaderboardLoading(true);
                            fetchLeaderboard('rankPoints').then(data => {
                                setLeaderboardData(data);
                            }).catch(err => console.error('Leaderboard error:', err)).finally(() => setLeaderboardLoading(false));
                        }
                    }} title="Leaderboard">🏆</button>
                    <button className="btn-lobby-circle" onClick={() => {
                        audio.playClick();
                        setShowFriends(true);
                    }} title="Social / Friends">👥</button>
                    <button className="btn-lobby-circle" onClick={() => {
                        audio.playClick();
                        fetchQuests(user?.uid); // Pass UID to fetch quests
                        setShowQuests(true);
                    }} title="Daily Quests">🎯</button>
                    <button className="btn-lobby-circle" onClick={() => {
                        audio.playClick();
                        setShowSeasonPass(true);
                    }} title="Season Pass">🎖️</button>
                    <button className="btn-lobby-circle btn-rotate" onClick={() => { audio.playClick(); onShowSettings(); }} title="Settings">⚙️</button>
                    {isAdmin && (
                        <button className="btn-admin-hidden" onClick={() => { audio.playClick(); setShowAdmin(true); }} style={{ opacity: 0.2 }}>🛠️</button>
                    )}
                    <button className="btn-lobby-circle notify-btn" onClick={() => {
                        audio.playClick();
                        setShowNotifications(true);
                    }} title="Notifications">
                        🔔
                        {notifications.filter(n => !n.read).length > 0 && (
                            <span className="notify-badge">{notifications.filter(n => !n.read).length}</span>
                        )}
                    </button>
                    {user && (
                        <>
                            <div className="zoin-wallet-widget" title="My Stash (Zoins)">
                                <div className="zoin-cube-wrapper">
                                    <ZoinCube theme="STANDARD" />
                                </div>
                                <div className="zoin-balance-text">
                                    <span className="z-icon">Z</span>
                                    {inventory?.zoins || 0}
                                </div>
                            </div>
                            <button className="btn-small" onClick={logout} style={{ opacity: 0.7 }}>
                                Logout
                            </button>
                        </>
                    )}
                </div>

                <div className="logo-container">
                    <h1 className="game-title">puck<span>OFF</span></h1>
                </div>
                <p className="game-subtitle">The Ultimate Physics-Based Arena Combat. Smash. Collect. puck<span>OFF</span>.</p>

                {!connected ? (
                    <div className="connection-status">
                        {connectionError ? (
                            <div className="error-container">
                                <div className="error-msg">⚠️ Server Unreachable</div>
                                <button className="btn btn-primary shimmer" onClick={onPlayOffline}>
                                    PLAY OFFLINE MODE
                                </button>
                            </div>
                        ) : (
                            "Connecting to server..."
                        )}
                    </div>
                ) : !roomCode ? (
                    <div className="menu-options">
                        {/* NEW: Profile Integration in Name Input */}
                        <div className="name-input-container">
                            {user ? (
                                <div className="player-progression">
                                    <div className="logged-in-badge">
                                        <span className="status-dot"></span>
                                        LOGGED IN AS
                                    </div>
                                    <div className="level-badge">
                                        <div className="level-number">{getLevelFromXp(inventory?.xp || 0)}</div>
                                        <div className="rank-name">{getRankName(getLevelFromXp(inventory?.xp || 0))}</div>
                                    </div>
                                    <div className="xp-bar-container" title={`XP: ${inventory?.xp || 0}`}>
                                        <div
                                            className="xp-bar-fill"
                                            style={{ width: `${getLevelProgress(inventory?.xp || 0) * 100}%` }}
                                        />
                                    </div>

                                    {/* [PRO] Weekly Reward CTA */}
                                    {inventory?.isPro && (Date.now() - (inventory?.lastProReward || 0) > 7 * 24 * 60 * 60 * 1000) && (
                                        <button className="pro-reward-cta pulse-gold" onClick={async () => {
                                            const res = await claimProReward();
                                            if (res?.success) {
                                                sendNotification(user.uid, 'success', { title: 'WEEKLY REWARD', message: res.reward });
                                            } else {
                                                sendNotification(user.uid, 'error', { title: 'REWARD FAILED', message: res?.error });
                                            }
                                        }}>
                                            🎁 CLAIM PRO REWARD
                                        </button>
                                    )}

                                    {!inventory?.isPro && (
                                        <button className="pro-btn-lobby" onClick={() => setShowProModal(true)}>
                                            ✨ UPGRADE TO PRO
                                        </button>
                                    )}

                                    {/* Rank Display */}
                                    <div className="rank-container">
                                        <div className="rank-badge" style={{ borderColor: getRankFromRP(inventory?.rankPoints || 0).color }}>
                                            <div className="rank-tier-name">{getRankFromRP(inventory?.rankPoints || 0).name}</div>
                                            <div className="rp-value">{inventory?.rankPoints || 0} RP</div>
                                        </div>
                                        <div className="rp-bar-container">
                                            <div 
                                                className="rp-bar-fill" 
                                                style={{ 
                                                    width: `${getRankProgress(inventory?.rankPoints || 0) * 100}%`,
                                                    background: getRankFromRP(inventory?.rankPoints || 0).color 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn-text-link" onClick={() => setShowAuthModal(true)}>
                                    Login to Save Progress
                                </button>
                            )}
                            <input
                                type="text"
                                placeholder="ENTER YOUR NAME"
                                className={`name-input glass ${user ? 'verified' : ''}`}
                                value={playerName}
                                onChange={handleNameChange}
                                onBlur={saveName} // Save on blur
                            />
                            {inventory?.isPro && (
                                <div className="pro-badge-lobby" title="PuckOff Pro Member">
                                    PRO
                                </div>
                            )}
                            {inventory?.isLegacy && (
                                <div className="legacy-player-badge" title="Legacy Alpha Tester">
                                    <span className="badge-star">★</span> LEGACY
                                </div>
                            )}
                        </div>

                        <div className="main-buttons">
                            {/* [NEW] Wager Selector */}
                            <div className="wager-selector" style={{ marginBottom: '1rem', width: '100%', maxWidth: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.9rem', color: '#ffd700', fontWeight: 'bold' }}>
                                        <input
                                            type="checkbox"
                                            checked={isWagerMode}
                                            onChange={(e) => setIsWagerMode(e.target.checked)}
                                            style={{ marginRight: '0.5rem' }}
                                        />
                                        High Stakes Mode
                                    </label>
                                    {isWagerMode && (
                                        <select
                                            value={wagerAmount}
                                            onChange={(e) => setWagerAmount(Number(e.target.value))}
                                            style={{ background: '#333', color: '#ffd700', border: '1px solid #ffd700', borderRadius: '5px', padding: '2px 5px' }}
                                        >
                                            <option value={100}>100 Z</option>
                                            <option value={500}>500 Z</option>
                                            <option value={1000}>1000 Z</option>
                                        </select>
                                    )}
                                </div>
                                {isWagerMode && (
                                    <div style={{ fontSize: '0.75rem', color: '#aaa', textAlign: 'center' }}>
                                        Winner Takes: <span style={{ color: '#00ff87' }}>{Math.floor(wagerAmount * 2 * (inventory?.isPro ? 1.0 : 0.9))} Z</span> {inventory?.isPro ? '(0% PRO FEE!)' : '(10% House Fee)'}
                                    </div>
                                )}
                            </div>

                            <button
                                className={`btn btn-large shimmer ${isWagerMode ? 'btn-wager' : 'btn-primary'} ${!user ? 'disabled' : ''}`}
                                onClick={async () => {
                                    if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                    }
                                    audio.playClick();
                                    const joinAction = async () => {
                                        if (isWagerMode) {
                                            if ((inventory?.zoins || 0) < wagerAmount) {
                                                alert("Low Fuel! Top up Zoins at the Store.");
                                                setShowStore(true);
                                                return;
                                            }
                                            const joined = await joinWagerMatch(wagerAmount);
                                            if (!joined) return;
                                        }
                                        onStartMatchmaking(playerName, user?.email, null, wagerAmount);
                                    };

                                    if (isHighStakesActive) {
                                        setPendingAction(() => joinAction);
                                        setShowHSConfirm(true);
                                    } else {
                                        joinAction();
                                    }
                                }}
                            >
                                {isWagerMode ? `⚔️ WAGER ${wagerAmount} Z` : (user ? '⚡ QUICK PLAY' : '🔒 SIGN IN TO PLAY')}
                            </button>
                            <button
                                className={`btn btn-secondary btn-large ${!user ? 'disabled' : ''}`}
                                onClick={() => {
                                    if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                    }
                                    audio.playClick();
                                    if (isHighStakesActive) {
                                        setPendingAction(() => () => onCreateRoom(playerName, user?.email));
                                        setShowHSConfirm(true);
                                    } else {
                                        onCreateRoom(playerName, user?.email);
                                    }
                                }}
                            >
                                {user ? '🏠 CREATE ROOM' : '🔒 CREATE ROOM'}
                            </button>
                            <button className={`btn btn-secondary btn-large sandbox ${!user ? 'primary-guest' : ''}`} onClick={() => { audio.playClick(); onJoinRoom('sandbox'); }}>
                                🎮 FREE PLAY (OFFLINE)
                            </button>
                        </div>

                        <div className="join-form">
                            <input type="text" placeholder="ROOM CODE" id="roomCodeInput" maxLength={6} />
                            <button className="btn btn-small" onClick={() => {
                                audio.playClick();
                                const code = document.getElementById('roomCodeInput').value;
                                if (code) {
                                    if (isHighStakesActive) {
                                        setPendingAction(() => () => onJoinRoom(code, playerName, user?.email));
                                        setShowHSConfirm(true);
                                    } else {
                                        onJoinRoom(code, playerName, user?.email);
                                    }
                                }
                            }}>JOIN</button>
                        </div>

                        <div className="divider"></div>

                        <div className="feature-buttons">
                            <button className="btn btn-loadout" onClick={() => { audio.playClick(); setShowLoadout(true); }}>
                                🎒 LOADOUT
                                <span className="btn-desc">Choose 3 Powerups for Battle</span>
                            </button>

                            <button className="btn btn-icons" onClick={() => { audio.playClick(); setShowIcons(true); }}>
                                ✨ ICONS
                                <span className="btn-desc">{inventory?.icons?.length || 0} / 150 Collected</span>
                            </button>
                        </div>

                        <div className="cosmetics-row">
                            <button className="btn btn-store" onClick={() => { audio.playClick(); setShowStore(true); }}>
                                🛒 STORE
                            </button>
                            <button className="btn btn-forge" onClick={() => { audio.playClick(); setShowCrafting(true); }}>
                                ⚒️ FORGE
                            </button>

                            {/* Replaced old skin selector with proper Icon Selector UI */}
                            <div className="equipped-icon-preview">
                                <button className="btn-icon-select" onClick={() => { audio.playClick(); setShowIcons(true); }}>
                                    <div className="current-icon">
                                        {/* Show currently equipped icon or default to Standard Issue (logo) */}
                                        {(() => {
                                            const equippedIcon = getIconById(inventory?.equippedSkin);
                                            if (equippedIcon?.tier === 0 && equippedIcon?.color) {
                                                return (
                                                    <div style={{
                                                        width: 48, height: 48, borderRadius: '50%',
                                                        background: `radial-gradient(circle at 35% 35%, ${equippedIcon.color}cc, ${equippedIcon.color})`,
                                                        boxShadow: `0 0 12px ${equippedIcon.color}66`
                                                    }} />
                                                );
                                            }
                                            return (
                                                <img
                                                    src={equippedIcon?.imageUrl || '/images/logo.png'}
                                                    alt="Equipped Icon"
                                                    onError={(e) => e.target.src = '/images/logo.png'}
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div className="icon-select-label">
                                        <span>EQUIPPED ICON</span>
                                        <strong>{getIconById(inventory?.equippedSkin)?.name || 'Standard Issue'}</strong>
                                    </div>
                                    <div className="icon-arrow">Change ▼</div>
                                </button>
                            </div>
                        </div>

                        {/* AdBanner removed — AdSense policy violation on nav screens */}

                        <div className="lobby-footer-links">
                            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                        </div>
                    </div>
                ) : (
                    <div className="room-view">
                        <h2>ROOM CODE</h2>
                        <div className="room-code glow-blue">{roomCode}</div>

                        <div className="player-list glass" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="player-count">Players ({players.length}/10)</div>
                            {players.map((p, i) => (
                                <div key={p.id} className={`player-item ${p.id === playerId ? 'local' : ''}`}>
                                    <div className="player-avatar" style={{ background: p.color }}></div>
                                    <div className="player-name">
                                        {p.name || `Player ${i + 1}`} {p.id === playerId ? '(You)' : ''}
                                    </div>
                                    <div className={`ready-status ${p.ready ? 'ready' : ''}`}>
                                        {p.ready ? '✔ Ready' : '⏳ Waiting'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="game-settings">
                            <h3>GAME MODE</h3>
                            <div className="mode-options">
                                {Object.entries(GAME_MODES).map(([key, mode]) => (
                                    <button
                                        key={key}
                                        className={`btn mode-btn ${gameMode === key ? 'selected' : ''}`}
                                        disabled={!isReady && players.length > 0 && players[0].id !== playerId} // Only host can change
                                        onClick={() => {
                                            if (players.length > 0 && players[0].id !== playerId) return;
                                            audio.playClick();
                                            onSelectMode && onSelectMode(key);
                                        }}
                                        title={mode.description}
                                    >
                                        {mode.name}
                                    </button>
                                ))}
                            </div>
                            <div className="mode-desc">
                                {GAME_MODES[gameMode]?.description}
                            </div>
                        </div>

                        <div className="map-voting">
                            <h3>{roomCode === 'OFFLINE' ? 'SELECT ARENA' : 'VOTE FOR BIOME'}</h3>
                            <div className="vote-subtext">
                                {roomCode === 'OFFLINE' ? 'Select your precise battleground layout will be procedurally generated.' : 'Vote for the arena theme. Layout is procedurally generated.'}
                            </div>
                            <div className={`vote-options ${roomCode === 'OFFLINE' ? 'offline-grid' : ''}`}>
                                {getVotingOptions(roomCode).map(biome => (
                                    <div
                                        key={biome.id}
                                        className={`map-card glass ${selectedMap === biome.id ? 'selected neon-border-blue' : ''}`}
                                        onClick={() => { audio.playClick(); onVoteMap && onVoteMap(biome.id); }}
                                    >
                                        <div className="map-preview" style={{ background: `linear-gradient(45deg, ${biome.colors.floor}, ${biome.colors.accent})` }}>
                                            <div className="map-overlay">
                                                {roomCode !== 'OFFLINE' && (
                                                    <div className="vote-count">🔥 {Object.values(mapVotes).filter(v => v === biome.id).length}</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="map-info">
                                            <h4>{biome.name}</h4>
                                            <p>{biome.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="room-actions">
                            <button
                                className={`btn ${isReady ? 'btn-ready' : 'btn-primary'}`}
                                onClick={() => { audio.playClick(); onReady(!isReady, inventory?.loadouts?.[0] || DEFAULT_LOADOUT); }}
                            >
                                {isReady ? 'CANCEL READY' : '✔ READY UP'}
                            </button>
                            <button className="btn btn-danger" onClick={() => { audio.playClick(); onBack(); }}>LEAVE ROOM</button>
                        </div>

                        <div className="lobby-hint">Game starts when all players are ready!</div>

                        {/* AdBanner removed — AdSense policy violation on low-content screens */}
                    </div>
                )}

                {/* OpenArt Attribution */}
                {/* OpenArt Attribution REMOVED as requested */}
            </div>

            <style>{`
                .lobby-overlay {
                    position: fixed; inset: 0;
                    background: url('/images/lobby_background.png') center center / cover no-repeat;
                    display: flex; align-items: center; justify-content: center;
                    font-family: 'Orbitron', 'Inter', sans-serif;
                    color: white;
                    z-index: 100;
                }
                .lobby-overlay::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(10,10,26,0.85) 0%, rgba(26,10,46,0.8) 50%, rgba(10,26,46,0.85) 100%);
                    pointer-events: none;
                }
                .lobby-container {
                    text-align: center; width: 100%; max-width: 500px; padding: 2rem;
                    position: relative; z-index: 1;
                }

                /* User Bar */
                .user-bar {
                    position: absolute; top: 1rem; right: 1rem;
                    display: flex; align-items: center; gap: 1rem;
                    font-size: 0.85rem;
                }
                .user-email { color: #00d4ff; }
                .user-packs { color: #ffd700; }
                .btn-small { 
                    padding: 0.4rem 0.8rem; font-size: 0.75rem; 
                    background: rgba(255,255,255,0.1); border: 1px solid #444;
                    border-radius: 20px; cursor: pointer; color: white;
                }
                .btn-login { background: linear-gradient(45deg, #00d4ff, #00ff87); color: #000; }
                .btn-wager { background: linear-gradient(45deg, #ff006e, #ffd700); color: #000; border: none; cursor: pointer; animation: pulse 1.5s infinite; }
                .btn-admin-hidden:hover { opacity: 1; }
                .btn-lobby-circle {
                    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 50%; width: 44px; height: 44px; display: flex;
                    align-items: center; justify-content: center; cursor: pointer;
                    color: white; font-size: 1.3rem; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .btn-lobby-circle:hover { 
                    background: rgba(255,255,255,0.2); border-color: #fff; 
                    transform: scale(1.15);
                    box-shadow: 0 0 20px rgba(255,255,255,0.3);
                }
                .btn-rotate:hover { transform: scale(1.15) rotate(45deg); }

                .notify-btn { position: relative; }
                .notify-badge {
                    position: absolute; top: -5px; right: -5px;
                    background: #ff006e; color: white;
                    font-size: 0.65rem; font-weight: 800;
                    padding: 2px 6px; border-radius: 10px;
                    box-shadow: 0 0 10px rgba(255,0,110,0.5);
                    border: 1px solid rgba(255,255,255,0.2);
                    min-width: 14px; text-align: center;
                }

                .btn-admin-hidden:hover { opacity: 1; }

                /* NEW Zoin Wallet Widget */
                .zoin-wallet-widget {
                    position: relative;
                    width: 140px;
                    height: 44px;
                    background: rgba(0, 0, 0, 0.6);
                    border: 1px solid #ffd700;
                    border-radius: 25px;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding-right: 16px;
                    overflow: visible;
                    box-shadow: 0 0 15px rgba(255, 215, 0, 0.15);
                    transition: transform 0.2s;
                    margin-right: 0.5rem;
                }
                .zoin-wallet-widget:hover {
                    transform: scale(1.05);
                    background: rgba(20, 20, 20, 0.8);
                }

                .zoin-cube-wrapper {
                    position: absolute;
                    left: -12px;
                    top: -12px;
                    width: 68px;
                    height: 68px;
                    z-index: 10;
                    /* Ensure events pass through to canvas but wrapper doesn't block layout */
                    pointer-events: none; 
                }

                .zoin-balance-text {
                    color: #ffd700;
                    font-weight: 800;
                    font-size: 1.1rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                }

                .z-icon {
                    background: linear-gradient(135deg, #ffd700, #ff8c00);
                    color: black;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 900;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }

                .active-players-pill {
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid #333;
                    padding: 0.4rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    color: #aaa;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }
                .live-dot { color: #00ff87; font-size: 0.6rem; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                
                .btn-large.disabled {
                    background: #2a2a2a; border-color: #444; color: #666; cursor: not-allowed;
                    position: relative;
                }
                .btn-secondary.primary-guest {
                    border-color: #00d4ff; box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
                    background: rgba(0, 212, 255, 0.1);
                }

                .logo-container {
                    display: flex; flex-direction: column; align-items: center; margin-bottom: 0.5rem;
                }
                .logo-img {
                    width: 120px; height: 120px; object-fit: contain;
                    filter: drop-shadow(0 0 20px rgba(0,212,255,0.4));
                    animation: logoFloat 4s ease-in-out infinite;
                }
                @keyframes logoFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                /* Title */
                .game-title {
                    font-size: 3.5rem; margin: 0;
                    font-weight: 900;
                    letter-spacing: -2px;
                    background: linear-gradient(45deg, #00d4ff, #ff006e, #00ff87);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    text-shadow: 0 0 30px rgba(0,212,255,0.3);
                }
                .game-title span { font-style: italic; color: #ff006e; -webkit-text-fill-color: initial; }
                .game-subtitle { color: #aaa; margin-bottom: 2rem; font-size: 1rem; font-weight: 500; }

                @keyframes titleGlow {
                    0%, 100% { filter: brightness(1); }
                    50% { filter: brightness(1.3); }
                }

                /* Menu Options */
                .menu-options { 
                    display: flex; flex-direction: column; gap: 1rem; 
                    align-items: center;
                }
                .name-input-container {
                    width: 100%; max-width: 300px;
                    display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
                }
                .name-input { 
                    padding: 12px 20px;
                    border: 2px solid #333; color: white; text-align: center;
                    border-radius: 30px; width: 100%;
                    font-size: 1rem; transition: all 0.3s;
                }
                .name-input:focus { border-color: #00d4ff; outline: none; }
                .name-input.verified { border-color: #00ff87; box-shadow: 0 0 10px rgba(0,255,135,0.2); }
                
                .logged-in-badge {
                    font-size: 0.6rem; color: #00ff87; letter-spacing: 1px;
                    display: flex; align-items: center; gap: 0.3rem;
                }
                .status-dot { width: 6px; height: 6px; background: #00ff87; border-radius: 50%; box-shadow: 0 0 5px #00ff87; }
                .btn-text-link {
                    background: none; border: none; color: #ff006e; font-size: 0.7rem;
                    cursor: pointer; text-decoration: underline; padding: 0;
                }

                .main-buttons { 
                    display: flex; flex-direction: column; gap: 0.8rem; 
                    width: 100%; max-width: 300px;
                }
                .btn-large { 
                    padding: 1rem 2rem; font-size: 1.2rem; border-radius: 40px;
                    font-weight: bold;
                }
                .btn-primary { 
                    background: linear-gradient(45deg, #00d4ff, #00ff87); 
                    color: #000; border: none; cursor: pointer;
                }
                .btn-secondary { 
                    background: rgba(255,255,255,0.1); 
                    border: 2px solid #00d4ff; color: #00d4ff; cursor: pointer;
                }

                .join-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
                .join-form input { 
                    flex: 1; padding: 10px;
                    border: 1px solid #555; color: white; text-align: center;
                    border-radius: 8px; text-transform: uppercase;
                }

                .divider { 
                    width: 80%; height: 1px; 
                    background: linear-gradient(90deg, transparent, #333, transparent);
                    margin: 1rem 0;
                }

                .feature-buttons { 
                    display: flex; gap: 1rem; width: 100%; max-width: 350px;
                }
                .btn-loadout, .btn-icons {
                    flex: 1; padding: 1rem; border-radius: 15px;
                    display: flex; flex-direction: column; gap: 0.3rem;
                    font-weight: bold; cursor: pointer; border: none;
                }
                .btn-loadout { background: linear-gradient(135deg, #ff006e, #ff4500); color: white; }
                .btn-icons { background: linear-gradient(135deg, #9d4edd, #00d4ff); color: white; }
                .btn-desc { font-size: 0.7rem; font-weight: normal; opacity: 0.8; }

                .cosmetics-row { 
                    display: flex; gap: 1rem; margin-top: 1rem; 
                    width: 100%; max-width: 400px;
                    align-items: center;
                    overflow: hidden;
                }
                .btn-store, .btn-forge { 
                    width: 100px; background: linear-gradient(135deg, #ffd700, #ff8c00); 
                    color: #000; font-weight: bold; padding: 0.8rem;
                    border-radius: 12px; border: none; cursor: pointer;
                    font-size: 0.85rem; transition: transform 0.2s;
                }
                .btn-store:hover, .btn-forge:hover { transform: scale(1.05); }

                .equipped-icon-preview {
                    flex: 1;
                    display: flex;
                }

                .btn-icon-select {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.5rem 1rem;
                    background: rgba(0,0,0,0.4);
                    border: 1px solid #444;
                    border-radius: 12px;
                    cursor: pointer;
                    color: white;
                    transition: all 0.2s;
                }

                .btn-icon-select:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: #00d4ff;
                    box-shadow: 0 0 15px rgba(0,212,255,0.2);
                }

                .current-icon {
                    width: 48px;
                    height: 48px;
                    background: #111;
                    border-radius: 8px;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #333;
                    flex-shrink: 0;
                }

                .current-icon img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .icon-select-label {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    font-size: 0.75rem;
                    overflow: hidden;
                }

                .icon-select-label span {
                    color: #888;
                    font-size: 0.6rem;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                .icon-select-label strong {
                    color: #00d4ff;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    width: 100%;
                    text-align: left;
                }

                .icon-arrow {
                    color: #555;
                    font-size: 0.7rem;
                    flex-shrink: 0;
                }

                /* Auth Modal */
                .auth-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .auth-modal {
                    padding: 2rem; border-radius: 20px;
                    width: 100%; max-width: 350px; text-align: center;
                    border: 1px solid #333;
                }
                .auth-modal h2 { margin-bottom: 1.5rem; color: #00d4ff; }
                .auth-modal form { display: flex; flex-direction: column; gap: 1rem; }
                .auth-modal input {
                    padding: 12px; border: 1px solid #333;
                    color: white; border-radius: 8px;
                }
                .auth-error { color: #ff006e; font-size: 0.85rem; }
                .btn-google {
                    margin-top: 1rem; background: #fff; color: #333;
                    border: none; padding: 12px; border-radius: 8px;
                    cursor: pointer; font-weight: bold; width: 100%;
                }
                .auth-toggle { margin-top: 1rem; font-size: 0.85rem; color: #888; }
                .btn-link { 
                    background: none; border: none; color: #00d4ff; 
                    cursor: pointer; padding: 0; font-family: inherit; 
                    text-decoration: underline;
                }

                /* Shimmer */
                .shimmer { position: relative; overflow: hidden; }
                .shimmer::after {
                    content: ''; position: absolute; top: 0; left: -100%; 
                    width: 50%; height: 100%;
                    background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }
                @keyframes shimmer { to { left: 200%; } }

                /* Room View */
                .room-view { width: 100%; }
                
                /* Progression Logic */
                .player-progression {
                    display: flex; flex-direction: column; align-items: start; gap: 0.2rem; margin-bottom: 0.5rem; width: 100%;
                }
                .level-badge {
                    display: flex; align-items: center; gap: 0.5rem;
                    color: gold; font-weight: bold; font-size: 0.9rem;
                    text-transform: uppercase; letter-spacing: 1px;
                }
                .level-number {
                    background: gold; color: black; width: 24px; height: 24px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 50%; font-size: 0.8rem;
                }
                .xp-bar-container {
                    width: 100%; height: 6px; background: rgba(255,255,255,0.1);
                    border-radius: 3px; overflow: hidden;
                    margin-top: 2px;
                }
                .xp-bar-fill {
                    height: 100%; background: linear-gradient(90deg, #ffd700, #ffaa00);
                    transition: width 0.5s ease-out;
                }

                .room-code { 
                    font-size: 3rem; font-weight: bold; color: #00d4ff;
                    letter-spacing: 0.5rem; margin: 1rem 0;
                }
                .player-list { 
                    border-radius: 15px; 
                    padding: 1rem; margin: 1rem 0;
                }
                .error-container { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
                .error-msg { color: #ff006e; font-weight: bold; font-size: 1.2rem; }
                
                .player-count { color: #888; margin-bottom: 0.5rem; }
                .player-item {
                    display: flex; align-items: center; gap: 1rem;
                    padding: 0.5rem; border-radius: 8px;
                }
                .player-item.local { background: rgba(0,212,255,0.1); }
                .player-avatar { width: 30px; height: 30px; border-radius: 50%; }
                .player-name { flex: 1; text-align: left; }
                .ready-status { font-size: 0.8rem; color: #888; }
                .ready-status.ready { color: #00ff87; }

                .game-settings { margin: 1rem 0; width: 100%; }
                .game-settings h3 { color: #fff; margin-bottom: 0.5rem; font-size: 1rem; letter-spacing: 2px; }
                .mode-options { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
                .mode-btn { 
                    background: rgba(255,255,255,0.05); color: #888; border: 1px solid #444;
                    padding: 0.5rem 1rem; font-size: 0.8rem;
                }
                .mode-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: white; }
                .mode-btn.selected { 
                    background: linear-gradient(45deg, #00d4ff, #00ff87); 
                    color: black; border-color: transparent;
                    box-shadow: 0 0 15px rgba(0,212,255,0.3);
                }
                .mode-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .mode-desc { color: #aaa; font-size: 0.75rem; margin-top: 0.5rem; font-style: italic; }

                .map-voting { margin: 2rem 0; width: 100%; }
                .map-voting h3 { color: #fff; margin-bottom: 0.2rem; font-size: 1rem; letter-spacing: 2px; }
                .vote-subtext { color: #888; font-size: 0.7rem; margin-bottom: 1rem; font-style: italic; }
                .vote-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
                .vote-options.offline-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
                
                .map-card {
                    border-radius: 12px; overflow: hidden;
                    cursor: pointer; transition: all 0.3s; border: 2px solid transparent;
                }
                .map-card:hover { background: rgba(255,255,255,0.08); transform: translateY(-5px); }
                .map-card.selected { border-color: #00d4ff; box-shadow: 0 0 20px rgba(0,212,255,0.3); }
                
                .map-preview { position: relative; aspect-ratio: 16/9; overflow: hidden; }
                /* img rule removed as we use gradients */
                
                .map-overlay {
                    position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                    display: flex; align-items: flex-end; padding: 0.5rem;
                }
                .vote-count {
                    background: rgba(0,212,255,0.8); color: #000; padding: 2px 8px;
                    border-radius: 20px; font-size: 0.75rem; font-weight: bold;
                }
                
                .map-info { padding: 0.8rem; text-align: left; }
                .map-info h4 { margin: 0; font-size: 0.8rem; color: #fff; }
                .map-info p { margin: 0.3rem 0 0; font-size: 0.65rem; color: #888; line-height: 1.2; }

                .room-actions { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; }
                .btn { padding: 0.8rem 1.5rem; border-radius: 30px; cursor: pointer; font-weight: bold; }
                .btn-ready { background: #00ff87; color: #000; border: none; }
                .btn-danger { background: transparent; border: 2px solid #ff006e; color: #ff006e; }

                .lobby-hint { color: #555; font-size: 0.8rem; margin-top: 1rem; }

                /* OpenArt Attribution */
                .openart-credit {
                    position: fixed;
                    bottom: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.75rem;
                    color: #666;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                .openart-credit a {
                    color: #00d4ff;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .openart-credit a:hover {
                    color: #00ff87;
                    text-decoration: underline;
                }

                .lobby-footer-links {
                    text-align: center;
                    margin-top: 0.5rem;
                    padding: 0.5rem 0;
                }
                .lobby-footer-links a {
                    color: #555;
                    font-size: 0.7rem;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .lobby-footer-links a:hover {
                    color: #00d4ff;
                }

                /* Matchmaking Overlay */
                .matchmaking-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 500;
                }
                .searching-card {
                    padding: 3rem; border-radius: 30px; text-align: center;
                    width: 100%; max-width: 400px;
                    border: 1px solid rgba(0,212,255,0.3);
                    box-shadow: 0 0 50px rgba(0,212,255,0.2);
                    background: rgba(10, 10, 20, 0.9);
                }
                .searching-spinner {
                    position: relative; width: 80px; height: 80px; margin: 0 auto 2rem;
                }
                .spinner-orbit {
                    position: absolute; inset: 0;
                    border: 3px solid rgba(0,212,255,0.1);
                    border-top-color: #00d4ff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                .spinner-puck {
                    position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px;
                    background: #ff006e; border-radius: 50%;
                    box-shadow: 0 0 15px #ff006e;
                    animation: breathe 2s ease-in-out infinite;
                }
                .searching-timer {
                    font-size: 2rem; font-weight: 900; color: #00d4ff;
                    margin: 1rem 0; font-family: 'Orbitron', sans-serif;
                }
                .searching-desc { color: #aaa; margin-bottom: 2rem; font-size: 0.9rem; }
                .cancel-search { width: 100%; border-radius: 30px; }

                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes breathe { 0%, 100% { transform: scale(0.8); opacity: 0.8; } 50% { transform: scale(1); opacity: 1; } }

                /* Region Selector */
                .region-selector-container {
                    position: relative;
                }
                .region-btn {
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 6px 14px;
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 0.85rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: all 0.2s;
                    font-family: 'Inter', sans-serif;
                }
                .region-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    border-color: rgba(255, 255, 255, 0.3);
                }
                .region-dropdown {
                    position: absolute;
                    top: calc(100% + 10px);
                    right: 0;
                    background: rgba(15, 15, 25, 0.95);
                    backdrop-filter: blur(15px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    width: 160px;
                    overflow: hidden;
                    z-index: 1000;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.6);
                }
                .region-item {
                    padding: 12px 18px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: rgba(255,255,255,0.7);
                    text-align: left;
                }
                .region-item:hover {
                    background: rgba(0, 212, 255, 0.15);
                    color: #00d4ff;
                }
                .region-item.active {
                    color: #00ff87;
                    font-weight: bold;
                    background: rgba(0, 255, 135, 0.05);
                }

                /* Rank UI */
                .rank-container {
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .rank-badge {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    font-family: 'Orbitron', sans-serif;
                }
                .rank-tier-name {
                    font-weight: 900;
                    font-size: 0.8rem;
                    letter-spacing: 1px;
                }
                .rp-value {
                    font-size: 0.75rem;
                    opacity: 0.8;
                }
                .rp-bar-container {
                    height: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 2px;
                    overflow: hidden;
                }
                .rp-bar-fill {
                    height: 100%;
                    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
                }

                /* Leaderboard Modal */
                .leaderboard-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.2s ease;
                }
                .leaderboard-modal {
                    width: 500px;
                    max-width: 90vw;
                    max-height: 80vh;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s cubic-bezier(0.2, 0, 0, 1);
                }
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .lb-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .lb-header h2 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-family: 'Orbitron', sans-serif;
                    letter-spacing: 1px;
                }
                .lb-close {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 1.2rem;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .lb-close:hover { color: #ff006e; }
                .lb-tabs {
                    display: flex;
                    gap: 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }
                .lb-tab {
                    flex: 1;
                    padding: 0.75rem;
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.4);
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-bottom: 2px solid transparent;
                    font-family: 'Orbitron', sans-serif;
                }
                .lb-tab:hover { color: rgba(255, 255, 255, 0.7); }
                .lb-tab.active {
                    color: #00d4ff;
                    border-bottom-color: #00d4ff;
                }
                .lb-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem;
                }
                .lb-row {
                    display: grid;
                    grid-template-columns: 50px 1fr auto 80px;
                    align-items: center;
                    padding: 0.6rem 0.8rem;
                    border-radius: 8px;
                    transition: background 0.2s;
                    gap: 0.5rem;
                }
                .lb-row:hover { background: rgba(255, 255, 255, 0.03); }
                .lb-top3 {
                    background: rgba(255, 215, 0, 0.03);
                    border: 1px solid rgba(255, 215, 0, 0.08);
                }
                .lb-rank {
                    font-size: 0.9rem;
                    text-align: center;
                    font-weight: 700;
                    opacity: 0.7;
                }
                .lb-name {
                    font-weight: 600;
                    font-size: 0.85rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .lb-badge {
                    font-size: 0.7rem;
                    font-weight: 900;
                    font-family: 'Orbitron', sans-serif;
                    letter-spacing: 0.5px;
                }
                .lb-score {
                    text-align: right;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: #00d4ff;
                    font-family: 'Orbitron', sans-serif;
                }
                .lb-loading, .lb-empty {
                    text-align: center;
                    padding: 3rem 1rem;
                    opacity: 0.5;
                    font-size: 0.9rem;
                }

                /* Trade Invitation Popup */
                .trade-invite-popup {
                    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
                    background: rgba(15,10,25,0.9); border: 1px solid #00ff87;
                    border-radius: 15px; padding: 1rem 1.5rem; z-index: 3000;
                    display: flex; align-items: center; gap: 2rem;
                    box-shadow: 0 0 30px rgba(0,255,135,0.2);
                    animation: slideUp 0.3s ease-out;
                }
                .invite-content { display: flex; align-items: center; gap: 1rem; }
                .invite-icon { font-size: 1.5rem; }
                .invite-text { font-size: 0.9rem; }
                .invite-actions { display: flex; gap: 0.5rem; }
                .btn-accept { 
                    background: #00ff87; color: black; border: none; 
                    padding: 0.5rem 1rem; border-radius: 8px; font-weight: bold; cursor: pointer;
                }
                .btn-decline { 
                    background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.2);
                    padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;
                }

                @keyframes slideUp { from { transform: translate(-50%, 50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

                /* Daily Quests UI */
                .quest-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1500;
                    animation: fadeIn 0.3s ease;
                }
                .quest-modal {
                    width: 450px;
                    max-width: 90%;
                    padding: 2.5rem;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.1);
                    position: relative;
                }
                .quest-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .quest-header h2 {
                    font-family: 'Orbitron', sans-serif;
                    margin: 0;
                    font-size: 1.5rem;
                    letter-spacing: 2px;
                    color: #00d4ff;
                    text-shadow: 0 0 15px rgba(0,212,255,0.5);
                }
                .quest-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    opacity: 0.5;
                    transition: 0.2s;
                }
                .quest-close:hover { opacity: 1; transform: rotate(90deg); }
                
                .quest-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .quest-item {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 1.25rem;
                    border-radius: 12px;
                    position: relative;
                    transition: 0.3s;
                }
                .quest-item.completed {
                    border-color: rgba(0,255,135,0.3);
                    background: rgba(0,255,135,0.03);
                }
                .quest-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                .quest-label {
                    font-weight: 700;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 0.9rem;
                    color: #fff;
                }
                .quest-reward {
                    color: #ffd700;
                    font-weight: 900;
                    font-size: 0.8rem;
                }
                .quest-desc {
                    margin: 0 0 1rem 0;
                    font-size: 0.8rem;
                    opacity: 0.6;
                }
                .quest-progress-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .quest-progress-bar {
                    flex-grow: 1;
                    height: 6px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 3px;
                    overflow: hidden;
                }
                .quest-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #00d4ff, #00ff87);
                    box-shadow: 0 0 10px rgba(0,212,255,0.5);
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .quest-stats {
                    font-size: 0.75rem;
                    font-family: 'Orbitron', sans-serif;
                    opacity: 0.8;
                    min-width: 45px;
                    text-align: right;
                }
                .quest-check {
                    position: absolute;
                    top: -10px; right: -10px;
                    background: #00ff87;
                    color: #000;
                    width: 24px; height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    box-shadow: 0 0 15px rgba(0,255,135,0.5);
                    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes popIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .legacy-player-badge {
                    position: absolute; top: -12px; right: 10px;
                    background: linear-gradient(90deg, #ff006e, #ff8e00);
                    color: white; font-size: 0.6rem; font-weight: 900;
                    padding: 2px 10px; border-radius: 4px;
                    box-shadow: 0 0 10px rgba(255,0,110,0.4);
                    z-index: 5; letter-spacing: 1px;
                    border: 1px solid rgba(255,255,255,0.2);
                    display: flex; align-items: center; gap: 4px;
                }
                .badge-star { color: #ffd700; font-size: 0.75rem; }

                /* Pro UI */
                .pro-badge-lobby {
                    position: absolute; top: -12px; right: 80px;
                    background: linear-gradient(90deg, #ffd700, #ff8e00);
                    color: black; font-size: 0.65rem; font-weight: 900;
                    padding: 2px 10px; border-radius: 4px;
                    box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
                    z-index: 5; letter-spacing: 1px;
                }
                .pro-btn-lobby {
                    margin-top: 15px;
                    width: 100%;
                    padding: 10px;
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    border-radius: 12px;
                    color: #ffd700;
                    font-size: 0.8rem;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .pro-btn-lobby:hover {
                    background: rgba(255, 215, 0, 0.2);
                    box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
                }
                .pro-reward-cta {
                    margin-top: 15px;
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #ffd700, #ff8c00);
                    border: none;
                    border-radius: 12px;
                    color: black;
                    font-weight: 900;
                    font-size: 0.85rem;
                    cursor: pointer;
                    font-family: 'Orbitron', sans-serif;
                }
                .pulse-gold {
                    animation: pulseGold 2s infinite;
                }
                @keyframes pulseGold {
                    0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
                }

                /* HEAT MODE EFFECT */
                .lobby-main-screen.heat-mode {
                    box-shadow: inset 0 0 200px rgba(255, 69, 0, 0.4), inset 0 0 50px rgba(255, 215, 0, 0.2);
                    animation: heatPulse 1s infinite alternate;
                    border: 2px solid rgba(255, 69, 0, 0.3);
                }
                @keyframes heatPulse {
                    from { box-shadow: inset 0 0 150px rgba(255, 69, 0, 0.3); border-color: rgba(255, 69, 0, 0.3); }
                    to { box-shadow: inset 0 0 250px rgba(255, 69, 0, 0.5); border-color: rgba(255, 215, 0, 0.5); }
                }
            `}</style>
        </div>
    );
}

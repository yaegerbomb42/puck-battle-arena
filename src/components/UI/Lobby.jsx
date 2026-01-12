import React, { useState } from 'react';
import Store from './Store';
import PackOpener from './PackOpener';
import LoadoutMenu from './LoadoutMenu';
import IconChooser from './IconChooser';
import AdminDashboard from './AdminDashboard';
import { getIconById } from '../../utils/economy';
import { DEFAULT_LOADOUT } from '../../utils/powerups';
import { useAuth } from '../../contexts/AuthContext';
import { audio } from '../../utils/audio';
import SkeletonLoader from './SkeletonLoader';
import { getBiomeList } from '../../utils/mapGenerator';
import { GAME_MODES } from '../../utils/gameModes';

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
    mapVotes
}) {
    const { user, inventory, loading, loginWithGoogle, loginWithEmail, signupWithEmail, logout, equipIcon, equipSkin, updateLoadout, setActiveLoadout } = useAuth();

    const [showStore, setShowStore] = useState(false);
    const [showLoadout, setShowLoadout] = useState(false);
    const [showIcons, setShowIcons] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // login or signup
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [openingPack, setOpeningPack] = useState(null);
    const [playerName, setPlayerName] = useState(user?.displayName || '');

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

    return (
        <div className="lobby-overlay">
            {/* Modals */}
            {openingPack && (
                <PackOpener
                    packType={openingPack}
                    onClose={() => {
                        setOpeningPack(null);
                        // Stats are updated in AuthContext now
                    }}
                />
            )}

            {showStore && (
                <Store
                    onClose={() => setShowStore(false)}
                    onOpenPack={(type) => {
                        setOpeningPack(type);
                        setShowStore(false);
                    }}
                    playerInventory={inventory?.icons || []}
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
                    loading={loading}
                    onClose={() => setShowIcons(false)}
                    onSelect={(icon) => {
                        equipIcon(icon.id);
                        setShowIcons(false);
                    }}
                />
            )}

            {showAdmin && (
                <AdminDashboard onClose={() => setShowAdmin(false)} />
            )}

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
                    <div className="auth-modal" onClick={e => e.stopPropagation()}>
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

            <div className="lobby-container">
                {/* User Bar */}
                <div className="user-bar">
                    {loading ? (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <SkeletonLoader width="150px" height="24px" />
                            <SkeletonLoader width="80px" height="24px" />
                        </div>
                    ) : user ? (
                        <>
                            <span className="user-email">👤 {user.email}</span>
                            <span className="user-packs">🎁 {inventory?.freePacks || 0} Packs</span>
                            <button className="btn-small" onClick={logout}>Logout</button>
                        </>
                    ) : (
                        <button className="btn-small btn-login" onClick={() => setShowAuthModal(true)}>
                            🔐 Sign In / Sign Up
                        </button>
                    )}
                    <button className="btn-admin-hidden" onClick={() => { audio.playClick(); setShowAdmin(true); }}>⚙️</button>
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
                        <input
                            type="text"
                            placeholder="ENTER YOUR NAME"
                            className="name-input"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />

                        <div className="main-buttons">
                            <button className="btn btn-primary btn-large shimmer" onClick={() => { audio.playClick(); onQuickJoin(playerName, user?.email); }}>
                                ⚡ QUICK PLAY
                            </button>
                            <button className="btn btn-secondary btn-large" onClick={() => { audio.playClick(); onCreateRoom(playerName, user?.email); }}>
                                🏠 CREATE ROOM
                            </button>
                        </div>

                        <div className="join-form">
                            <input type="text" placeholder="ROOM CODE" id="roomCodeInput" maxLength={6} />
                            <button className="btn btn-small" onClick={() => {
                                audio.playClick();
                                const code = document.getElementById('roomCodeInput').value;
                                if (code) onJoinRoom(code, playerName, user?.email);
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

                            {/* Replaced old skin selector with proper Icon Selector UI */}
                            <div className="equipped-icon-preview">
                                <button className="btn-icon-select" onClick={() => { audio.playClick(); setShowIcons(true); }}>
                                    <div className="current-icon">
                                        {/* Show currently equipped icon or default to Standard Issue (logo) */}
                                        <img
                                            src={getIconById(inventory?.equippedSkin)?.imageUrl || '/images/logo.png'}
                                            alt="Equipped Icon"
                                            onError={(e) => e.target.src = '/images/logo.png'}
                                        />
                                    </div>
                                    <div className="icon-select-label">
                                        <span>EQUIPPED ICON</span>
                                        <strong>{getIconById(inventory?.equippedSkin)?.name || 'Standard Issue'}</strong>
                                    </div>
                                    <div className="icon-arrow">Change ▼</div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="room-view">
                        <h2>ROOM CODE</h2>
                        <div className="room-code">{roomCode}</div>

                        <div className="player-list">
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
                            <h3>VOTE FOR BIOME</h3>
                            <div className="vote-subtext">Vote for the arena theme. Layout is procedurally generated.</div>
                            <div className="vote-options">
                                {getBiomeList().slice(0, 3).map(biome => (
                                    <div
                                        key={biome.id}
                                        className={`map-card ${selectedMap === biome.id ? 'selected' : ''}`}
                                        onClick={() => { audio.playClick(); onVoteMap && onVoteMap(biome.id); }}
                                    >
                                        <div className="map-preview" style={{ background: `linear-gradient(45deg, ${biome.colors.floor}, ${biome.colors.accent})` }}>
                                            <div className="map-overlay">
                                                <div className="vote-count">🔥 {Object.values(mapVotes).filter(v => v === biome.id).length}</div>
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
                    </div>
                )}

                {/* OpenArt Attribution */}
                <div className="openart-credit">
                    <span>🎨 Game icons created with </span>
                    <a href="https://openart.ai/home/?via=cloudCompute" target="_blank" rel="noopener noreferrer">
                        OpenArt.ai
                    </a>
                </div>
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
                .btn-admin-hidden {
                    opacity: 0.3; background: none; border: none; cursor: pointer;
                    font-size: 1rem; padding: 0.5rem;
                }
                .btn-admin-hidden:hover { opacity: 1; }

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
                .name-input { 
                    padding: 12px 20px; background: rgba(0,0,0,0.5); 
                    border: 2px solid #333; color: white; text-align: center;
                    border-radius: 30px; width: 100%; max-width: 300px;
                    font-size: 1rem;
                }
                .name-input:focus { border-color: #00d4ff; outline: none; }

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
                    flex: 1; padding: 10px; background: rgba(0,0,0,0.5);
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
                .btn-store { 
                    width: 100px; background: linear-gradient(135deg, #ffd700, #ff8c00); 
                    color: #000; font-weight: bold; padding: 0.8rem;
                    border-radius: 12px; border: none; cursor: pointer;
                    font-size: 0.85rem; transition: transform 0.2s;
                }
                .btn-store:hover { transform: scale(1.05); }

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
                    background: #1a1a2e; padding: 2rem; border-radius: 20px;
                    width: 100%; max-width: 350px; text-align: center;
                    border: 1px solid #333;
                }
                .auth-modal h2 { margin-bottom: 1.5rem; color: #00d4ff; }
                .auth-modal form { display: flex; flex-direction: column; gap: 1rem; }
                .auth-modal input {
                    padding: 12px; background: #0a0a1a; border: 1px solid #333;
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
                .room-code { 
                    font-size: 3rem; font-weight: bold; color: #00d4ff;
                    letter-spacing: 0.5rem; margin: 1rem 0;
                }
                .player-list { 
                    background: rgba(0,0,0,0.3); border-radius: 15px; 
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
                
                .map-card {
                    background: rgba(255,255,255,0.03); border-radius: 12px; overflow: hidden;
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
            `}</style>
        </div>
    );
}

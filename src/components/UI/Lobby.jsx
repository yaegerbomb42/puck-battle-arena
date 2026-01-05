import React, { useState } from 'react';
import Store from './Store';
import PackOpener from './PackOpener';
import LoadoutMenu from './LoadoutMenu';
import { SKIN_DEFINITIONS } from '../../utils/skins';
import { DEFAULT_LOADOUT } from '../../utils/powerups';

export default function Lobby({
    connected,
    roomCode,
    players,
    playerId,
    onCreateRoom,
    onJoinRoom,
    onQuickJoin,
    onReady,
    onVoteMap, // New prop
    onBack
}) {
    const [showStore, setShowStore] = useState(false);
    const [showLoadout, setShowLoadout] = useState(false);
    const [openingPack, setOpeningPack] = useState(null);
    const [credits, setCredits] = useState(1200); // Mock starting credits
    const [unlockedSkins, setUnlockedSkins] = useState(['skin_1', 'skin_2']); // Basic reds/greens
    const [equippedSkin, setEquippedSkin] = useState('skin_1');
    const [loadout, setLoadout] = useState(DEFAULT_LOADOUT);
    const [playerName, setPlayerName] = useState('');

    const handlePurchaseCredits = (amount, packType) => {
        // Simulate Stripe purchase or credit spend
        if (amount > 0) {
            // Buying credits (redirect to Stripe in real app)
            window.open('https://stripe.com', '_blank');
        } else {
            // Spending credits (opening pack)
            setCredits(c => c + amount); // amount is negative
            setOpeningPack(packType);
            setShowStore(false);
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
                        // Unlock a random skin (mock logic)
                        const randomId = Math.floor(Math.random() * 20) + 1;
                        setUnlockedSkins(prev => [...new Set([...prev, `skin_${randomId}`])]);
                    }}
                />
            )}

            {showStore && (
                <Store
                    credits={credits}
                    onClose={() => setShowStore(false)}
                    onPurchaseCredits={handlePurchaseCredits}
                />
            )}

            {showLoadout && (
                <LoadoutMenu
                    equipped={loadout}
                    onEquip={setLoadout}
                    onClose={() => setShowLoadout(false)}
                />
            )}

            <div className="lobby-container">
                <h1 className="game-title">PUCK BATTLE ARENA</h1>

                {!connected ? (
                    <div className="connection-status">Connecting to server...</div>
                ) : !roomCode ? (
                    <div className="menu-options">
                        <input
                            type="text"
                            placeholder="ENTER NAME (OPTIONAL)"
                            className="name-input"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />

                        <button className="btn btn-primary shimmer" onClick={() => onQuickJoin(playerName)}>QUICK PLAY</button>
                        <button className="btn btn-secondary" onClick={() => onCreateRoom(playerName)}>CREATE ROOM</button>

                        <div className="join-form">
                            <input type="text" placeholder="ENTER CODE" id="roomCodeInput" maxLength={6} />
                            <button className="btn btn-small" onClick={() => {
                                const code = document.getElementById('roomCodeInput').value;
                                if (code) onJoinRoom(code, playerName);
                            }}>JOIN</button>
                        </div>

                        <div className="divider"></div>

                        <button className="btn btn-loadout" onClick={() => setShowLoadout(true)}>
                            🎒 LOADOUT (PICK 3)
                        </button>

                        <div className="cosmetics-row">
                            <button className="btn btn-store" onClick={() => setShowStore(true)}>
                                🛒 STORE ({credits} 💎)
                            </button>
                            <div className="skin-selector">
                                <select value={equippedSkin} onChange={(e) => setEquippedSkin(e.target.value)}>
                                    {SKIN_DEFINITIONS.filter(s => unlockedSkins.includes(s.id) || s.rarity === 'common').map(skin => (
                                        <option key={skin.id} value={skin.id}>
                                            {skin.name} ({skin.rarity})
                                        </option>
                                    ))}
                                </select>
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

                        <div className="map-voting">
                            <h3>VOTE MAP</h3>
                            <div className="vote-options">
                                {['SAWBLADE CITY', 'RAMP HEAVEN', 'BOX FORT'].map(map => (
                                    <button
                                        key={map}
                                        className="btn-vote"
                                        onClick={() => onVoteMap && onVoteMap(map)} // Verify onVoteMap exists in props
                                    >{map}</button>
                                ))}
                            </div>
                        </div>

                        <div className="room-actions">
                            <button
                                className={`btn ${isReady ? 'btn-ready' : 'btn-primary'}`}
                                onClick={() => onReady(!isReady, loadout)}
                            >
                                {isReady ? 'CANCEL READY' : '✔ READY UP'}
                            </button>
                            <button className="btn btn-danger" onClick={onBack}>LEAVE ROOM</button>
                        </div>

                        <div className="lobby-hint">Wait for host to pick Game Mode...</div>
                    </div>
                )}
            </div>

            <style jsx>{`
        .menu-options { display: flex; flex-direction: column; gap: 1rem; width: 100%; max-width: 300px; }
        .cosmetics-row { margin-top: 1rem; display: flex; gap: 10px; align-items: center; justify-content: center; }
        .btn-store { background: #ffd700; color: black; font-weight: bold; flex: 1; }
        .btn-loadout { background: #ff006e; color: white; font-weight: bold; }
        .skin-selector select { background: #333; color: white; border: 1px solid #555; padding: 10px; border-radius: 5px; flex: 1; }
        .name-input { padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid #555; color: white; text-align: center; }
        .shimmer { position: relative; overflow: hidden; }
        .shimmer::after {
            content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer { to { left: 200%; } }
      `}</style>
        </div>
    );
}

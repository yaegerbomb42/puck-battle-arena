import React, { useState } from 'react';
import { TIERS, burnIcons, forgeIcons, getIconsByTier } from '../../utils/economy';

export default function Forge({ playerInventory = [], onClose, onBurn, onForge }) {
    const [mode, setMode] = useState('forge'); // 'forge' or 'burn'
    const [selectedIcons, setSelectedIcons] = useState([]);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Group inventory by icon ID for duplicate detection
    const inventoryGroups = playerInventory.reduce((acc, iconId) => {
        acc[iconId] = (acc[iconId] || 0) + 1;
        return acc;
    }, {});

    // Get icons that have duplicates (2+)
    const duplicateIcons = Object.entries(inventoryGroups)
        .filter(([id, count]) => count >= 2)
        .map(([id]) => parseInt(id));

    const handleSelectIcon = (iconId) => {
        if (selectedIcons.includes(iconId)) {
            setSelectedIcons([]);
        } else if (selectedIcons.length < 2) {
            // For forge/burn, we need 2 of the same icon
            if (selectedIcons.length === 0 || selectedIcons[0] === iconId) {
                setSelectedIcons([...selectedIcons, iconId]);
            }
        }
    };

    const handleAction = () => {
        if (selectedIcons.length !== 2) return;

        setProcessing(true);

        // Simulate action delay for dramatic effect
        setTimeout(() => {
            const icon1 = { id: selectedIcons[0], tier: getTierForIcon(selectedIcons[0]) };
            const icon2 = { id: selectedIcons[1], tier: getTierForIcon(selectedIcons[1]) };

            let actionResult;
            if (mode === 'burn') {
                actionResult = burnIcons(icon1, icon2);
                if (onBurn) onBurn(actionResult);
            } else {
                actionResult = forgeIcons(icon1, icon2);
                if (onForge) onForge(actionResult);
            }

            setResult(actionResult);
            setProcessing(false);
        }, 1500);
    };

    const getTierForIcon = (iconId) => {
        // Simplified tier lookup based on ID ranges
        if (iconId <= 60) return 1;
        if (iconId <= 90) return 2;
        if (iconId <= 108) return 3;
        if (iconId <= 120) return 4;
        if (iconId <= 129) return 5;
        if (iconId <= 135) return 6;
        if (iconId <= 140) return 7;
        if (iconId <= 143) return 8;
        if (iconId <= 146) return 9;
        return 10;
    };

    const resetSelection = () => {
        setSelectedIcons([]);
        setResult(null);
    };

    return (
        <div className="forge-overlay">
            <div className="forge-header">
                <h2>{mode === 'forge' ? '⚒️ THE FORGE' : '🔥 THE BURN'}</h2>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            {/* Mode Toggle */}
            <div className="mode-toggle">
                <button
                    className={`toggle-btn ${mode === 'forge' ? 'active' : ''}`}
                    onClick={() => { setMode('forge'); resetSelection(); }}
                >
                    ⚒️ FORGE (Upgrade)
                </button>
                <button
                    className={`toggle-btn ${mode === 'burn' ? 'active' : ''}`}
                    onClick={() => { setMode('burn'); resetSelection(); }}
                >
                    🔥 BURN (Gamble)
                </button>
            </div>

            {/* Instructions */}
            <div className="instructions">
                {mode === 'forge' ? (
                    <p>Combine <strong>2 identical icons</strong> → Get <strong>1 icon of the NEXT tier</strong></p>
                ) : (
                    <p>Sacrifice <strong>2 identical icons</strong> → <strong>50% chance</strong> for a Free Pack</p>
                )}
            </div>

            {/* Selection Area */}
            {!result && (
                <>
                    <div className="selection-area">
                        <div className="slot">
                            {selectedIcons[0] ? (
                                <div className="selected-icon">
                                    <span className="icon-id">#{selectedIcons[0]}</span>
                                </div>
                            ) : (
                                <div className="empty-slot">?</div>
                            )}
                        </div>
                        <div className="plus-sign">+</div>
                        <div className="slot">
                            {selectedIcons[1] ? (
                                <div className="selected-icon">
                                    <span className="icon-id">#{selectedIcons[1]}</span>
                                </div>
                            ) : (
                                <div className="empty-slot">?</div>
                            )}
                        </div>
                        <div className="arrow">=</div>
                        <div className="slot result-slot">
                            {processing ? (
                                <div className="processing">⚡</div>
                            ) : (
                                <div className="unknown">?</div>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        className="action-btn"
                        disabled={selectedIcons.length !== 2 || processing}
                        onClick={handleAction}
                    >
                        {processing ? 'PROCESSING...' : mode === 'forge' ? '⚒️ FORGE' : '🔥 BURN'}
                    </button>

                    {/* Duplicate Icons Grid */}
                    <div className="duplicates-section">
                        <h3>Your Duplicates ({duplicateIcons.length})</h3>
                        {duplicateIcons.length === 0 ? (
                            <p className="no-dupes">No duplicates found. Open more packs!</p>
                        ) : (
                            <div className="duplicates-grid">
                                {duplicateIcons.map(iconId => {
                                    const tier = getTierForIcon(iconId);
                                    const tierInfo = TIERS[tier];
                                    return (
                                        <div
                                            key={iconId}
                                            className={`dupe-card ${selectedIcons.includes(iconId) ? 'selected' : ''}`}
                                            style={{ borderColor: tierInfo.color }}
                                            onClick={() => handleSelectIcon(iconId)}
                                        >
                                            <span className="dupe-tier" style={{ color: tierInfo.color }}>
                                                {tierInfo.name}
                                            </span>
                                            <span className="dupe-id">#{iconId}</span>
                                            <span className="dupe-count">x{inventoryGroups[iconId]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Result Display */}
            {result && (
                <div className="result-display">
                    {result.success ? (
                        <>
                            {result.rewardType === 'free_pack' && (
                                <div className="reward-card success">
                                    <div className="reward-icon">🎟️</div>
                                    <h3>FREE PACK WON!</h3>
                                    <p>Your sacrifice was rewarded!</p>
                                </div>
                            )}
                            {result.rewardType === 'nothing' && (
                                <div className="reward-card fail">
                                    <div className="reward-icon">💨</div>
                                    <h3>NOTHING...</h3>
                                    <p>The icons burned to ash.</p>
                                </div>
                            )}
                            {result.rewardType === 'upgraded_icon' && (
                                <div className="reward-card upgrade">
                                    <div className="reward-icon">⭐</div>
                                    <h3>UPGRADED!</h3>
                                    <p>New {TIERS[result.reward?.tier]?.name} icon obtained!</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="reward-card error">
                            <p>{result.error}</p>
                        </div>
                    )}
                    <button className="action-btn" onClick={resetSelection}>
                        TRY AGAIN
                    </button>
                </div>
            )}

            <style jsx>{`
                .forge-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, rgba(20, 10, 30, 0.98), rgba(40, 20, 60, 0.98));
                    z-index: 1000;
                    display: flex; flex-direction: column;
                    padding: 2rem; color: white;
                    font-family: 'Inter', sans-serif;
                    overflow-y: auto;
                }
                .forge-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 1rem;
                }
                .forge-header h2 { font-size: 2rem; margin: 0; }
                .close-btn {
                    background: rgba(255,255,255,0.1); border: none;
                    color: white; font-size: 1.5rem; width: 40px; height: 40px;
                    border-radius: 50%; cursor: pointer;
                }

                .mode-toggle {
                    display: flex; gap: 1rem; justify-content: center;
                    margin-bottom: 1rem;
                }
                .toggle-btn {
                    padding: 0.8rem 1.5rem; border: 2px solid #444;
                    background: rgba(255,255,255,0.05); color: white;
                    border-radius: 10px; cursor: pointer; font-size: 1rem;
                    transition: all 0.2s;
                }
                .toggle-btn.active {
                    border-color: #00ff87; background: rgba(0,255,135,0.1);
                }
                .toggle-btn:hover { border-color: #666; }

                .instructions {
                    text-align: center; color: #888; margin-bottom: 2rem;
                }

                .selection-area {
                    display: flex; align-items: center; justify-content: center;
                    gap: 1rem; margin-bottom: 2rem;
                }
                .slot {
                    width: 100px; height: 100px;
                    background: rgba(255,255,255,0.05);
                    border: 2px dashed #444; border-radius: 16px;
                    display: flex; align-items: center; justify-content: center;
                }
                .empty-slot, .unknown { font-size: 2rem; color: #666; }
                .selected-icon { text-align: center; }
                .icon-id { font-size: 1.2rem; font-weight: bold; }
                .plus-sign, .arrow { font-size: 2rem; color: #666; }
                .result-slot { border-style: solid; border-color: #00ff87; }
                .processing { font-size: 2rem; animation: spin 0.5s linear infinite; }

                .action-btn {
                    display: block; margin: 0 auto 2rem;
                    padding: 1rem 3rem; font-size: 1.2rem;
                    background: linear-gradient(45deg, #ff006e, #ff5a00);
                    border: none; border-radius: 30px;
                    color: white; font-weight: bold; cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .action-btn:not(:disabled):hover { transform: scale(1.05); }

                .duplicates-section { text-align: center; }
                .duplicates-section h3 { margin-bottom: 1rem; }
                .no-dupes { color: #666; }
                .duplicates-grid {
                    display: flex; flex-wrap: wrap; gap: 0.8rem;
                    justify-content: center; max-width: 600px; margin: 0 auto;
                }
                .dupe-card {
                    width: 80px; padding: 0.8rem;
                    background: rgba(255,255,255,0.05);
                    border: 2px solid; border-radius: 12px;
                    text-align: center; cursor: pointer;
                    transition: all 0.2s;
                }
                .dupe-card:hover { transform: scale(1.05); }
                .dupe-card.selected { 
                    box-shadow: 0 0 20px rgba(0,255,135,0.5);
                    background: rgba(0,255,135,0.1);
                }
                .dupe-tier { font-size: 0.6rem; display: block; }
                .dupe-id { font-size: 0.9rem; font-weight: bold; display: block; }
                .dupe-count { font-size: 0.7rem; color: #888; }

                .result-display { text-align: center; padding: 2rem; }
                .reward-card {
                    max-width: 300px; margin: 0 auto 2rem;
                    padding: 2rem; border-radius: 20px;
                    animation: popIn 0.5s;
                }
                .reward-card.success { background: rgba(0,255,135,0.1); border: 2px solid #00ff87; }
                .reward-card.fail { background: rgba(255,0,0,0.1); border: 2px solid #ff4444; }
                .reward-card.upgrade { background: rgba(255,215,0,0.1); border: 2px solid #ffd700; }
                .reward-card.error { background: rgba(255,0,0,0.1); border: 2px solid #ff4444; }
                .reward-icon { font-size: 4rem; margin-bottom: 1rem; }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes popIn {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

import React from 'react';
import { TIERS, getAllIcons } from '../../utils/economy';

// Get all 150 icons from the centralized database
const ICON_SLOTS = getAllIcons().sort((a, b) => a.id - b.id);

export default function IconChooser({ ownedIcons = [], onClose, onSelect }) {
    const groupedByTier = {};
    ICON_SLOTS.forEach(icon => {
        if (!groupedByTier[icon.tier]) groupedByTier[icon.tier] = [];
        groupedByTier[icon.tier].push(icon);
    });

    const ownedSet = new Set(ownedIcons);
    const totalOwned = ownedIcons.length;

    return (
        <div className="icon-chooser-overlay" onClick={onClose}>
            <div className="icon-chooser-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>✨ ICON COLLECTION</h2>
                    <p className="collection-progress">{totalOwned} / 150 Collected</p>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="icon-grid-container">
                    {Object.entries(groupedByTier).map(([tier, icons]) => {
                        const tierData = TIERS[tier];
                        const ownedInTier = icons.filter(i => ownedSet.has(i.id)).length;

                        return (
                            <div key={tier} className="tier-section">
                                <div className="tier-header" style={{ borderColor: tierData.color }}>
                                    <span className="tier-badge" style={{ background: tierData.color }}>
                                        {tierData.isMystery ? '???' : tierData.name}
                                    </span>
                                    <span className="tier-count">{ownedInTier} / {icons.length}</span>
                                </div>
                                <div className="tier-icons">
                                    {icons.map(icon => {
                                        const owned = ownedSet.has(icon.id);
                                        return (
                                            <div
                                                key={icon.id}
                                                className={`icon-slot ${owned ? 'owned' : 'locked'}`}
                                                style={{
                                                    borderColor: owned ? tierData.color : '#333',
                                                    boxShadow: owned ? `0 0 10px ${tierData.color}40` : 'none'
                                                }}
                                                onClick={() => owned && onSelect && onSelect(icon)}
                                            >
                                                {owned ? (
                                                    <>
                                                        <div className="icon-visual">
                                                            <img src={icon.imageUrl} alt={icon.name} className="icon-img" />
                                                        </div>
                                                        <div className="icon-name">{icon.name}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="icon-visual locked-visual">?</div>
                                                        <div className="icon-name locked-name">Locked</div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                .icon-chooser-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2000;
                    font-family: 'Orbitron', sans-serif;
                }
                .icon-chooser-modal {
                    background: linear-gradient(135deg, #0a0a1a, #1a0a2e);
                    border: 1px solid #333; border-radius: 20px;
                    width: 95%; max-width: 900px; max-height: 85vh;
                    overflow: hidden; display: flex; flex-direction: column;
                }
                .modal-header {
                    padding: 1.5rem; text-align: center;
                    border-bottom: 1px solid #333; position: relative;
                }
                .modal-header h2 {
                    margin: 0; color: #fff;
                    background: linear-gradient(45deg, #ffd700, #ff006e);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .collection-progress { color: #888; margin-top: 0.5rem; }
                .close-btn {
                    position: absolute; right: 1rem; top: 1rem;
                    background: none; border: none; color: #888;
                    font-size: 1.5rem; cursor: pointer;
                }
                .close-btn:hover { color: #ff006e; }

                .icon-grid-container {
                    flex: 1; overflow-y: auto; padding: 1.5rem;
                }

                .tier-section { margin-bottom: 2rem; }
                .tier-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding-bottom: 0.5rem; margin-bottom: 1rem;
                    border-bottom: 2px solid;
                }
                .tier-badge {
                    padding: 0.3rem 1rem; border-radius: 20px;
                    font-size: 0.8rem; font-weight: bold; color: #000;
                }
                .tier-count { color: #666; font-size: 0.85rem; }

                .tier-icons {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 0.8rem;
                }

                .icon-slot {
                    aspect-ratio: 1; border-radius: 50%;
                    border: 3px solid; display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    transition: all 0.3s; cursor: pointer;
                    background: rgba(0,0,0,0.3);
                }
                .icon-slot.owned:hover {
                    transform: scale(1.1);
                }
                .icon-slot.locked {
                    opacity: 0.4; cursor: not-allowed;
                }

                .icon-visual { 
                    font-size: 1.8rem; 
                    width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                }
                .icon-img {
                    width: 90%; height: 90%;
                    object-fit: contain;
                    border-radius: 50%;
                }
                .locked-visual { color: #333; font-size: 1.5rem; }
                .icon-name {
                    font-size: 0.55rem; color: #888; margin-top: 0.2rem;
                    text-align: center; max-width: 90%;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .locked-name { color: #444; }

                /* Scrollbar */
                .icon-grid-container::-webkit-scrollbar { width: 8px; }
                .icon-grid-container::-webkit-scrollbar-track { background: #111; }
                .icon-grid-container::-webkit-scrollbar-thumb { 
                    background: #333; border-radius: 4px; 
                }
            `}</style>
        </div>
    );
}

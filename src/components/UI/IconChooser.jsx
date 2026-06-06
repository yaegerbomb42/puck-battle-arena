import React, { useState } from 'react';
import { TIERS, getAllIcons } from '../../utils/economy';
import SkeletonLoader from './SkeletonLoader';
import PuckPreview from './PuckPreview';
import PuckCard from './PuckCard';
import { useAuth } from '../../contexts/AuthContext';

// Get all 150 icons from the centralized database
const ICON_SLOTS = getAllIcons().sort((a, b) => a.id - b.id);

export default function IconChooser({ ownedIcons = [], onClose, onSelect, equippedIcon, isLegacy, loading }) {
    const { pucks, equipPuck } = useAuth();
    const [hoveredIcon, setHoveredIcon] = useState(null);
    const [selectedPreview, setSelectedPreview] = useState(null);
    const [view, setView] = useState('stable'); // 'stable' (owned pucks) or 'collection' (all icons)

    const equippedPuckId = localStorage.getItem('equipped_puck_id');

    const groupedByTier = {};
    ICON_SLOTS.forEach(icon => {
        if (!groupedByTier[icon.tier]) groupedByTier[icon.tier] = [];
        groupedByTier[icon.tier].push(icon);
    });

    const ownedSet = new Set(ownedIcons);
    const totalOwned = ownedIcons.length;

    const previewIcon = hoveredIcon || selectedPreview || (equippedIcon ? ICON_SLOTS.find(i => i.id === equippedIcon) : null);

    return (
        <div className="icon-chooser-overlay" onClick={onClose}>
            <div className="icon-chooser-modal" onClick={e => e.stopPropagation()}>
                {/* Preview Panel */}
                <div className="preview-panel">
                    <div className="preview-puck">
                        {previewIcon ? (
                            <>
                                <div className="preview-container" style={{ width: '280px', height: '280px', position: 'relative' }}>
                                    <PuckPreview icon={previewIcon} size={280} />
                                </div>
                                <div className="preview-info">
                                    <div className="preview-name">{previewIcon.name}</div>
                                    <div
                                        className="preview-tier"
                                        style={{ color: TIERS[previewIcon.tier]?.color }}
                                    >
                                        {TIERS[previewIcon.tier]?.name || 'Unknown'}
                                    </div>
                                </div>
                                {ownedSet.has(previewIcon.id) && (
                                    <button
                                        className="equip-btn"
                                        onClick={() => onSelect && onSelect(previewIcon)}
                                    >
                                        {equippedIcon === previewIcon.id ? '✓ EQUIPPED' : 'EQUIP'}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="no-preview">
                                <span>👆</span>
                                <p>Hover over an icon to preview</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Collection Grid */}
                <div className="collection-panel">
                    <div className="modal-header">
                        <div className="header-tabs">
                            <button 
                                className={`tab-btn ${view === 'stable' ? 'active' : ''}`}
                                onClick={() => setView('stable')}
                            >
                                🏟️ MY STABLE
                            </button>
                            <button 
                                className={`tab-btn ${view === 'collection' ? 'active' : ''}`}
                                onClick={() => setView('collection')}
                            >
                                ✨ COLLECTION
                            </button>
                        </div>
                        <p className="collection-progress">
                            {view === 'collection' ? (
                                loading ? <SkeletonLoader width="100px" height="20px" /> : `${totalOwned} / 150 Collected`
                            ) : (
                                `${pucks?.length || 0} Registered Pucks`
                            )}
                        </p>
                        <button className="close-btn" onClick={onClose}>✕</button>
                    </div>

                    <div className="icon-grid-container">
                        {loading ? (
                            <div className="tier-section">
                                {/* ... skeletons ... */}
                            </div>
                        ) : view === 'stable' ? (
                            <div className="puck-stable-grid">
                                {pucks?.length > 0 ? (
                                    pucks.map(p => (
                                        <PuckCard 
                                            key={p.id} 
                                            puck={p} 
                                            isEquipped={equippedPuckId === p.id}
                                            onSelect={() => {
                                                equipPuck(p.id);
                                                if (onSelect) onSelect(ICON_SLOTS.find(i => i.id === p.iconId));
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="empty-stable">
                                        <h3>Your stable is empty</h3>
                                        <p>Collect icons from the shop or packs to register new pucks!</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            Object.entries(groupedByTier).map(([tier, icons]) => {
                                const tierData = TIERS[tier] || { color: '#555', name: 'Unknown' };
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
                                                const isEquipped = equippedIcon === icon.id && (view === 'collection');
                                                const isPreviewable = icon.tier < 8;
                                                const showIcon = owned || isPreviewable;

                                                return (
                                                    <div
                                                        key={icon.id}
                                                        className={`icon-slot ${owned ? 'owned' : 'locked'} ${isEquipped ? 'equipped' : ''} ${isPreviewable && !owned ? 'viewable-locked' : ''}`}
                                                        style={{
                                                            borderColor: owned ? tierData.color : (isPreviewable ? tierData.color + '44' : '#222'),
                                                            boxShadow: owned ? `0 0 15px ${tierData.color}66` : 'none',
                                                            cursor: showIcon ? 'pointer' : 'not-allowed'
                                                        }}
                                                        onMouseEnter={() => showIcon && setHoveredIcon(icon)}
                                                        onMouseLeave={() => setHoveredIcon(null)}
                                                        onClick={() => {
                                                            if (showIcon && owned) {
                                                                // Find existing puck for this icon if exists
                                                                const matchingPuck = pucks?.find(p => p.iconId === icon.id);
                                                                if (matchingPuck) {
                                                                    equipPuck(matchingPuck.id);
                                                                }
                                                                if (onSelect) onSelect(icon);
                                                            } else if (showIcon) {
                                                                setSelectedPreview(icon);
                                                            }
                                                        }}
                                                    >
                                                        {showIcon ? (
                                                            <>
                                                                <div className="icon-visual">
                                                                    {icon.color && icon.tier === 0 ? (
                                                                        <div
                                                                            className="icon-color-circle"
                                                                            style={{
                                                                                background: `radial-gradient(circle at 35% 35%, ${icon.color}cc, ${icon.color})`,
                                                                                width: '100%',
                                                                                height: '100%',
                                                                                borderRadius: '50%',
                                                                                boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2), 0 0 12px ${icon.color}44`,
                                                                                filter: owned ? 'none' : 'grayscale(1) brightness(0.3)',
                                                                                opacity: owned ? 1 : 0.6
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <img
                                                                            src={icon.imageUrl}
                                                                            alt={icon.name}
                                                                            className="icon-img"
                                                                            style={{
                                                                                filter: owned ? 'none' : 'grayscale(1) brightness(0.3) contrast(1.2)',
                                                                                opacity: owned ? 1 : 0.6
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                                {isLegacy && owned && <div className="legacy-sash">LEGACY</div>}
                                                                {isEquipped && <div className="equipped-badge">✓</div>}
                                                                {!owned && <div className="lock-icon">🔒</div>}
                                                            </>
                                                        ) : (
                                                            <div className="icon-visual locked-visual">
                                                                <span className="mystery-mark">?</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .icon-chooser-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2000;
                    font-family: 'Orbitron', sans-serif;
                }
                .icon-chooser-modal {
                    background: linear-gradient(135deg, rgba(10, 10, 26, 0.95), rgba(26, 10, 46, 0.95));
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    width: 95%; max-width: 1000px; max-height: 85vh;
                    overflow: hidden; display: flex; flex-direction: row;
                    box-shadow: 0 0 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.05);
                }
                
                /* HEADER */
                .header-tabs {
                    display: flex; gap: 1rem; flex: 1;
                }
                .tab-btn {
                    background: transparent; border: none;
                    color: #555; font-family: 'Orbitron', sans-serif;
                    font-size: 1.1rem; font-weight: 800; cursor: pointer;
                    padding: 0.5rem 0; position: relative;
                    transition: all 0.2s;
                }
                .tab-btn.active { color: #fff; }
                .tab-btn.active::after {
                    content: ''; position: absolute; bottom: -1rem; left: 0; right: 0;
                    height: 3px; background: #00ff87; border-radius: 2px;
                    box-shadow: 0 0 10px #00ff87;
                }
                .tab-btn:hover { color: #aaa; }
                
                .close-btn {
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1);
                    color: #fff; width: 36px; height: 36px; border-radius: 50%;
                    font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                }
                .close-btn:hover { background: #ff006e; border-color: #ff006e; transform: rotate(90deg); }

                /* NEW STYLES */
                .puck-stable-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 1.5rem;
                }
                .empty-stable {
                    grid-column: 1 / -1;
                    padding: 4rem; text-align: center; color: #555;
                    border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px;
                }
                .empty-stable h3 { color: #fff; margin-bottom: 0.5rem; }

                /* PANELS */
                .preview-panel {
                    width: 320px; min-width: 320px;
                    background: radial-gradient(circle at center, rgba(30,30,50,0.5), rgba(10,10,20,0.8));
                    border-right: 1px solid rgba(255,255,255,0.1);
                    display: flex; align-items: center; justify-content: center;
                    padding: 2rem;
                    position: relative;
                    flex-direction: column;
                }
                .collection-panel {
                    flex: 1; display: flex; flex-direction: column;
                    background: rgba(0,0,0,0.2);
                }

                /* PREVIEW */
                .preview-puck {
                    display: flex; flex-direction: column;
                    align-items: center; text-align: center;
                    width: 100%;
                }
                .preview-container {
                    margin-bottom: 2rem;
                    filter: drop-shadow(0 0 30px rgba(0,0,0,0.5));
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

                .preview-info { margin-bottom: 2rem; width: 100%; }
                .preview-name { 
                    font-size: 1.5rem; font-weight: 800; color: #fff; 
                    margin-bottom: 0.5rem; text-transform: uppercase;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
                }
                .preview-tier { 
                    font-size: 1rem; font-weight: 600; 
                    padding: 0.3rem 1rem; border-radius: 20px;
                    background: rgba(0,0,0,0.3); border: 1px solid;
                    display: inline-block;
                }

                .equip-btn {
                    padding: 1rem 3rem;
                    background: linear-gradient(45deg, #00ff87, #00d4ff);
                    border: none; border-radius: 4px; clip-path: polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%);
                    color: #000; font-weight: 900; font-size: 1.1rem;
                    cursor: pointer; font-family: 'Orbitron', sans-serif;
                    transition: all 0.2s; letter-spacing: 1px;
                    box-shadow: 0 0 20px rgba(0, 255, 135, 0.4);
                    text-transform: uppercase;
                }
                .equip-btn:hover {
                    transform: scale(1.05) translateY(-2px);
                    box-shadow: 0 0 30px rgba(0, 255, 135, 0.6);
                    background: linear-gradient(45deg, #00ff87, #fff);
                }

                /* GRID */
                .icon-grid-container {
                    flex: 1; overflow-y: auto; padding: 2rem;
                }
                .tier-section { margin-bottom: 3rem; }
                .tier-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding-bottom: 0.8rem; margin-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .tier-badge {
                    padding: 0.4rem 1.2rem; border-radius: 4px;
                    font-size: 0.9rem; font-weight: 800; color: #000;
                    text-transform: uppercase; letter-spacing: 1px;
                    clip-path: polygon(10% 0, 100% 0, 90% 100%, 0% 100%);
                }
                .tier-count { color: #666; font-size: 0.9rem; font-family: 'Inter', sans-serif; }

                .tier-icons {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
                    gap: 1rem;
                }

                /* ICON SLOT */
                .icon-slot {
                    aspect-ratio: 1; border-radius: 12px;
                    border: 2px solid rgba(255,255,255,0.1);
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    transition: all 0.2s; cursor: pointer;
                    background: rgba(255,255,255,0.03);
                    position: relative;
                    overflow: hidden;
                }
                .icon-slot:hover {
                    transform: translateY(-5px);
                    border-color: rgba(255,255,255,0.5) !important;
                    background: rgba(255,255,255,0.08);
                }
                .icon-slot.equipped {
                    border-color: #00ff87 !important;
                    box-shadow: 0 0 20px rgba(0, 255, 135, 0.3) !important;
                    background: rgba(0, 255, 135, 0.05);
                }
                .icon-slot.locked {
                    opacity: 0.5;
                    filter: grayscale(1);
                }
                .icon-slot.locked:hover {
                    transform: none;
                    cursor: not-allowed;
                }
                .icon-slot.viewable-locked {
                    opacity: 0.7;
                    cursor: pointer;
                }
                .icon-slot.viewable-locked:hover {
                    transform: scale(1.05);
                    opacity: 1;
                    filter: grayscale(0.5);
                }

                .icon-visual { 
                    width: 70%; height: 70%;
                    display: flex; align-items: center; justify-content: center;
                    position: relative; z-index: 1;
                }
                .icon-img {
                    width: 100%; height: 100%;
                    object-fit: contain;
                    filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
                }
                
                .equipped-badge {
                    position: absolute; top: 5px; right: 5px;
                    background: #00ff87; color: #000;
                    width: 24px; height: 24px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.8rem; font-weight: bold;
                    box-shadow: 0 0 10px rgba(0, 255, 135, 0.5);
                    z-index: 2;
                }
                .lock-icon {
                    position: absolute; inset: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.6);
                    font-size: 1.5rem; color: rgba(255,255,255,0.5);
                    z-index: 2;
                }

                .legacy-sash {
                    position: absolute; top: 12px; left: -28px;
                    background: linear-gradient(90deg, #ff006e, #ff8e00);
                    color: white; font-size: 0.55rem; font-weight: 900;
                    padding: 2px 30px; transform: rotate(-45deg);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    z-index: 5; pointer-events: none;
                    letter-spacing: 1px;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    text-transform: uppercase;
                }

                .no-preview {
                    color: #555; text-align: center;
                    padding: 2rem; border: 2px dashed #333; border-radius: 12px;
                }
                .no-preview span { font-size: 3rem; display: block; margin-bottom: 1rem; }

                /* Scrollbar */
                .icon-grid-container::-webkit-scrollbar { width: 6px; }
                .icon-grid-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .icon-grid-container::-webkit-scrollbar-thumb { 
                    background: rgba(255,255,255,0.2); border-radius: 3px; 
                }
            `}</style>
        </div>
    );
}

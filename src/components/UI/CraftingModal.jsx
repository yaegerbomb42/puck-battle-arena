import React, { useState, useMemo } from 'react';
import { audio } from '../../utils/audio';
import { getIconById, TIERS } from '../../utils/economy';

const CRAFTING_RECIPES = [
    { id: 'forge_rare', label: 'Forge Rare', reqCount: 5, reqTier: 0, cost: 100, desc: 'Combine 5 Common items' },
    { id: 'forge_epic', label: 'Forge Epic', reqCount: 3, reqTier: 2, cost: 250, desc: 'Combine 3 Rare items' },
    { id: 'forge_legendary', label: 'Forge Legendary', reqCount: 2, reqTier: 3, cost: 500, desc: 'Combine 2 Epic items' },
    { id: 'disenchant', label: 'Disenchant', reqCount: 1, reqTier: 'any', cost: 0, desc: 'Recycle for 50 Zoins' }
];

export default function CraftingModal({ onClose, inventory, craftItem, showNotification }) {
    const [selectedRecipe, setSelectedRecipe] = useState(CRAFTING_RECIPES[0]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isCrafting, setIsCrafting] = useState(false);
    
    // Filter owned icons by the required tier of the selected recipe
    const validIcons = useMemo(() => {
        const icons = inventory?.icons || [];
        return icons.filter(iconObj => {
            const iconId = iconObj.id || iconObj;
            const icon = getIconById(iconId);
            if (selectedRecipe.reqTier === 'any') return true;
            return icon?.tier === selectedRecipe.reqTier;
        });
    }, [inventory, selectedRecipe]);

    const toggleItem = (iconId) => {
        audio.playClick();
        if (selectedItems.includes(iconId)) {
            setSelectedItems(selectedItems.filter(id => id !== iconId));
        } else {
            if (selectedItems.length < selectedRecipe.reqCount) {
                setSelectedItems([...selectedItems, iconId]);
            }
        }
    };

    const handleSelectRecipe = (recipe) => {
        audio.playClick();
        setSelectedRecipe(recipe);
        setSelectedItems([]); // Reset selection when changing recipe
    };

    const handleCraft = async () => {
        if (selectedItems.length < selectedRecipe.reqCount) return;
        if ((inventory?.zoins || 0) < selectedRecipe.cost) {
            showNotification('Insufficient Zoins!', 'error');
            return;
        }

        setIsCrafting(true);
        audio.playClick();
        try {
             // Let the backend handle the actual deduction and reward
             const res = await craftItem(selectedRecipe.id, selectedItems);
             if (res && res.success) {
                 showNotification(`Success! ${res.reward}`, 'success');
                 setSelectedItems([]);
                 // We don't close the modal automatically so they can see result
             } else {
                 showNotification(res?.error || 'Crafting failed', 'error');
             }
        } catch (err) {
             showNotification(err.message || 'Crafting error', 'error');
        } finally {
             setIsCrafting(false);
        }
    };

    return (
        <div className="crafting-overlay" onClick={onClose}>
            <div className="crafting-window glass-dark" onClick={e => e.stopPropagation()}>
                <div className="crafting-header">
                    <h2>⚒️ THE FORGE</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="crafting-content">
                    {/* RECIPE SELECTION */}
                    <div className="recipe-sidebar">
                        <h3>RECIPES</h3>
                        <div className="recipe-list">
                            {CRAFTING_RECIPES.map(r => (
                                <button 
                                    key={r.id} 
                                    className={`recipe-btn ${selectedRecipe.id === r.id ? 'active' : ''}`}
                                    onClick={() => handleSelectRecipe(r)}
                                >
                                    <strong>{r.label}</strong>
                                    <span>cost: {r.cost} Z</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MAIN CRAFTING AREA */}
                    <div className="crafting-main">
                        <div className="recipe-info">
                            <h3>{selectedRecipe.label}</h3>
                            <p>{selectedRecipe.desc}</p>
                            <div className="cost-tag">{selectedRecipe.cost > 0 ? `-${selectedRecipe.cost} Z` : 'FREE'}</div>
                        </div>

                        <div className="forge-slots">
                            {Array(selectedRecipe.reqCount).fill(0).map((_, idx) => {
                                const matchedItem = selectedItems[idx];
                                const icon = matchedItem ? getIconById(matchedItem) : null;
                                const tier = icon ? TIERS[icon.tier] : null;
                                return (
                                    <div 
                                        key={idx} 
                                        className="forge-slot" 
                                        onClick={() => matchedItem && toggleItem(matchedItem)}
                                        style={{ borderColor: tier?.color || 'rgba(255,255,255,0.2)' }}
                                    >
                                        {matchedItem ? (
                                            <img src={icon?.imageUrl || `/icons/${matchedItem}.png`} alt={matchedItem} onError={e => e.target.src = '/icons/placeholder.png'} />
                                        ) : (
                                            <span className="slot-empty">+</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="action-row">
                             <button 
                                className={`btn-forge ${selectedItems.length === selectedRecipe.reqCount ? 'ready' : ''}`}
                                disabled={selectedItems.length !== selectedRecipe.reqCount || isCrafting}
                                onClick={handleCraft}
                             >
                                 {isCrafting ? 'FORGING...' : 'CRAFT'}
                             </button>
                        </div>

                        <div className="inventory-section">
                            <h4>AVAILABLE FOR THIS RECIPE</h4>
                            <div className="inventory-grid">
                                {validIcons.map((iconObj, idx) => {
                                    const iconId = iconObj.id || iconObj;
                                    const icon = getIconById(iconId);
                                    const tier = TIERS[icon?.tier || 0];
                                    const isSelected = selectedItems.includes(iconId);
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`inv-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleItem(iconId)}
                                            style={{ backgroundColor: `${tier?.color}11` }}
                                            title={`${icon?.name} (${tier?.name})`}
                                        >
                                            <img src={icon?.imageUrl || `/icons/${iconId}.png`} alt={iconId} onError={e => e.target.src = '/icons/placeholder.png'}/>
                                        </div>
                                    );
                                })}
                                {validIcons.length === 0 && <div className="empty-msg">No eligible items in inventory.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .crafting-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
                    backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;
                    z-index: 3500; font-family: 'Orbitron', sans-serif;
                }
                .crafting-window {
                    width: 900px; height: 600px; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;
                    box-shadow: 0 0 50px rgba(0,255,135,0.2);
                    animation: scaleUp 0.3s ease-out;
                }
                .crafting-header {
                    padding: 1.5rem; display: flex; justify-content: space-between; align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .crafting-header h2 { margin: 0; color: #ffaa00; text-shadow: 0 0 10px rgba(255,170,0,0.5); }
                .btn-close {
                    background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; opacity: 0.6;
                }
                .btn-close:hover { opacity: 1; color: #ff006e; }

                .crafting-content { display: flex; flex: 1; overflow: hidden; }
                
                .recipe-sidebar {
                    width: 250px; border-right: 1px solid rgba(255,255,255,0.1);
                    padding: 1.5rem; background: rgba(0,0,0,0.2);
                }
                .recipe-sidebar h3 { font-size: 0.9rem; opacity: 0.5; margin-top: 0; letter-spacing: 2px; }
                .recipe-list { display: flex; flex-direction: column; gap: 0.5rem; }
                .recipe-btn {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    padding: 1rem; border-radius: 12px; color: white; cursor: pointer;
                    display: flex; flex-direction: column; align-items: flex-start; gap: 0.3rem;
                    transition: 0.2s; text-align: left;
                }
                .recipe-btn span { font-size: 0.7rem; color: #ffaa00; font-family: 'Orbitron'; }
                .recipe-btn:hover { background: rgba(255,255,255,0.1); transform: translateX(5px); }
                .recipe-btn.active {
                    background: rgba(255,170,0,0.15); border-color: #ffaa00;
                    box-shadow: inset 4px 0 0 #ffaa00;
                }

                .crafting-main {
                    flex: 1; padding: 2rem; display: flex; flex-direction: column; gap: 2rem;
                }
                .recipe-info h3 { margin: 0 0 0.5rem 0; font-size: 1.5rem; color: white; }
                .recipe-info p { margin: 0; color: #aaa; font-size: 0.9rem; }
                .cost-tag {
                    display: inline-block; background: rgba(0,0,0,0.5); padding: 0.3rem 0.8rem;
                    border-radius: 20px; font-weight: bold; color: #ffaa00; margin-top: 0.8rem;
                    border: 1px solid rgba(255,170,0,0.3);
                }

                .forge-slots {
                    display: flex; gap: 1rem; justify-content: center; align-items: center;
                    min-height: 120px;
                }
                .forge-slot {
                    width: 80px; height: 80px; border: 2px dashed rgba(255,255,255,0.2);
                    border-radius: 15px; display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,0.3); cursor: pointer; transition: 0.2s;
                }
                .forge-slot:hover { border-color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05); }
                .forge-slot img { width: 80%; height: 80%; object-fit: contain; }
                .slot-empty { font-size: 2rem; color: rgba(255,255,255,0.2); }

                .action-row { display: flex; justify-content: center; }
                .btn-forge {
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.5); padding: 1rem 3rem; border-radius: 30px;
                    font-family: 'Orbitron'; font-weight: 900; font-size: 1.2rem;
                    letter-spacing: 2px; transition: 0.3s;
                }
                .btn-forge.ready {
                    background: linear-gradient(90deg, #ffaa00, #ff006e);
                    border: none; color: white; cursor: pointer;
                    box-shadow: 0 0 30px rgba(255,170,0,0.4);
                }
                .btn-forge.ready:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 0 40px rgba(255,170,0,0.6); }
                .btn-forge:disabled { cursor: not-allowed; }

                .inventory-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .inventory-section h4 { font-size: 0.8rem; opacity: 0.5; margin-bottom: 1rem; }
                .inventory-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
                    gap: 1rem; overflow-y: auto; padding-right: 10px;
                }
                .inv-item {
                    aspect-ratio: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px; padding: 10px; cursor: pointer; transition: 0.2s;
                }
                .inv-item:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.3); }
                .inv-item.selected { border-color: #ffaa00; background: rgba(255,170,0,0.1); opacity: 0.5; }
                .inv-item img { width: 100%; height: 100%; object-fit: contain; }

                .empty-msg { opacity: 0.5; font-style: italic; font-size: 0.9rem; grid-column: 1 / -1; }

                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

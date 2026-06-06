import React, { useState, useEffect } from 'react';
import { audio } from '../../utils/audio';
import { getIconById, TIERS } from '../../utils/economy';

export default function TradeModal({ session, user, inventory, onUpdate, onReady, onConfirm, onCancel }) {
    const isP1 = session.p1.uid === user.uid;
    const me = isP1 ? session.p1 : session.p2;
    const them = isP1 ? session.p2 : session.p1;

    const [selectedItems, setSelectedItems] = useState(me.items || []);
    const [offeredZoins, setOfferedZoins] = useState(me.zoins || 0);
    const [isConfirming, setIsConfirming] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Sync local state with session if changed externally (e.g. initial load)
    useEffect(() => {
        setSelectedItems(me.items);
        setOfferedZoins(me.zoins);
    }, [session.id]); // Only on session start

    const toggleItem = (itemId) => {
        if (me.ready) return; // Can't change while ready
        audio.playClick();
        const next = selectedItems.includes(itemId)
            ? selectedItems.filter(id => id !== itemId)
            : [...selectedItems, itemId];
        
        setSelectedItems(next);
        onUpdate(session.id, next, offeredZoins);
    };

    const handleZoinChange = (val) => {
        if (me.ready) return;
        const amount = Math.max(0, Math.min(inventory?.zoins || 0, parseInt(val) || 0));
        setOfferedZoins(amount);
        onUpdate(session.id, selectedItems, amount);
    };

    const handleReady = () => {
        audio.playClick();
        onReady(session.id, !me.ready);
    };

    // Auto-countdown when both are ready
    useEffect(() => {
        let timer;
        if (session.p1.ready && session.p2.ready) {
            setIsConfirming(true);
            timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setIsConfirming(false);
            setCountdown(3);
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [session.p1.ready, session.p2.ready]);

    useEffect(() => {
        if (countdown === 0 && isConfirming && isP1) {
            // P1 triggers the final execution to avoid double calls
            onConfirm(session.id);
        }
    }, [countdown, isConfirming, isP1, onConfirm, session.id]);

    return (
        <div className="trade-modal-overlay">
            <div className="trade-window glass-dark">
                <div className="trade-header">
                    <h2>🤝 SECURE TRADE</h2>
                    <div className="trade-status">
                        {isConfirming ? `FINALIZING IN ${countdown}s...` : 'WAITING FOR OFFERS'}
                    </div>
                </div>

                <div className="trade-panels">
                    {/* MY PANEL */}
                    <div className={`trade-panel my-side ${me.ready ? 'ready' : ''}`}>
                        <div className="panel-label">YOUR OFFER</div>
                        <div className="offer-slots">
                            {selectedItems.map(itemId => {
                                const icon = getIconById(itemId);
                                const tier = TIERS[icon?.tier || 0];
                                return (
                                    <div 
                                        key={itemId} 
                                        className="offer-item" 
                                        onClick={() => toggleItem(itemId)}
                                        style={{ borderColor: tier?.color, boxShadow: `0 0 10px ${tier?.color}33` }}
                                        title={`${icon?.name} (${tier?.name})`}
                                    >
                                        <img src={icon?.imageUrl || `/icons/${itemId}.png`} alt={itemId} onError={(e) => e.target.src = '/icons/placeholder.png'} />
                                    </div>
                                );
                            })}
                            {selectedItems.length === 0 && <div className="slot-empty">Empty</div>}
                        </div>
                        <div className="zoin-input-wrapper">
                            <input 
                                type="number" 
                                value={offeredZoins} 
                                onChange={(e) => handleZoinChange(e.target.value)}
                                disabled={me.ready}
                                placeholder="0"
                            />
                            <span>Z</span>
                        </div>
                        <button className={`btn-ready ${me.ready ? 'is-ready' : ''}`} onClick={handleReady}>
                            {me.ready ? 'READY!' : 'SET READY'}
                        </button>
                    </div>

                    {/* THEIR PANEL */}
                    <div className={`trade-panel their-side ${them.ready ? 'ready' : ''}`}>
                        <div className="panel-label">THEIR OFFER</div>
                        <div className="offer-slots">
                            {them.items.map(itemId => {
                                const icon = getIconById(itemId);
                                const tier = TIERS[icon?.tier || 0];
                                return (
                                    <div 
                                        key={itemId} 
                                        className="offer-item"
                                        style={{ borderColor: tier?.color, boxShadow: `0 0 10px ${tier?.color}33` }}
                                        title={`${icon?.name} (${tier?.name})`}
                                    >
                                        <img src={icon?.imageUrl || `/icons/${itemId}.png`} alt={itemId} onError={(e) => e.target.src = '/icons/placeholder.png'} />
                                    </div>
                                );
                            })}
                            {them.items.length === 0 && <div className="slot-empty">Empty</div>}
                        </div>
                        <div className="zoin-display">
                            <strong>{them.zoins}</strong> <span>Z</span>
                        </div>
                        <div className={`ready-tag ${them.ready ? 'is-ready' : ''}`}>
                            {them.ready ? 'READY' : 'CONSIDERING...'}
                        </div>
                    </div>
                </div>

                <div className="trade-inventory">
                    <div className="inventory-header">YOUR INVENTORY (Duplicates Recommended)</div>
                    <div className="inventory-grid">
                        {(inventory?.icons || []).map((iconObj, idx) => {
                            const iconId = iconObj.id || iconObj;
                            const icon = getIconById(iconId);
                            const tier = TIERS[icon?.tier || 0];
                            const isSelected = selectedItems.includes(iconId);
                            return (
                                <div 
                                    key={idx} 
                                    className={`inventory-icon ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleItem(iconId)}
                                    style={{ 
                                        borderColor: isSelected ? '#00ff87' : `${tier?.color}66`,
                                        background: isSelected ? 'rgba(0,255,135,0.1)' : 'rgba(255,255,255,0.03)'
                                    }}
                                    title={`${icon?.name} (${tier?.name})`}
                                >
                                    <img src={icon?.imageUrl || `/icons/${iconId}.png`} alt={iconId} onError={(e) => e.target.src = '/icons/placeholder.png'} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="trade-footer">
                    <button className="btn-cancel" onClick={() => onCancel(session.id)}>CANCEL TRADE</button>
                </div>
            </div>

            <style>{`
                .trade-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.9); backdrop-filter: blur(15px);
                    display: flex; align-items: center; justify-content: center; z-index: 4000;
                }
                .trade-window {
                    width: 800px; height: 750px; border-radius: 25px;
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .trade-header {
                    padding: 1.5rem; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .trade-header h2 { margin: 0; font-family: 'Orbitron', sans-serif; color: #00ff87; }
                .trade-status { font-size: 0.8rem; opacity: 0.6; margin-top: 0.5rem; letter-spacing: 2px; }

                .trade-panels { display: flex; flex: 1; min-height: 350px; }
                .trade-panel {
                    flex: 1; padding: 2rem; display: flex; flex-direction: column; align-items: center;
                    gap: 1.5rem; transition: 0.3s;
                }
                .my-side { border-right: 1px solid rgba(255,255,255,0.1); background: rgba(0,255,135,0.02); }
                .their-side { background: rgba(0,212,255,0.02); }
                .trade-panel.ready { background: rgba(0,255,135,0.08); }

                .panel-label { font-size: 0.7rem; font-weight: 900; opacity: 0.5; letter-spacing: 1px; }
                .offer-slots {
                    display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;
                    min-height: 80px; width: 100%; align-content: center;
                }
                .offer-item, .inventory-icon {
                    width: 60px; height: 60px; background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
                    padding: 5px; cursor: pointer; transition: 0.2s;
                }
                .offer-item img, .inventory-icon img { width: 100%; height: 100%; object-fit: contain; }
                .offer-item:hover, .inventory-icon:hover { transform: scale(1.1); border-color: #00ff87; }
                .inventory-icon.selected { border-color: #00ff87; background: rgba(0,255,135,0.1); }

                .slot-empty { opacity: 0.2; font-style: italic; font-size: 0.8rem; }

                .zoin-input-wrapper, .zoin-display {
                    display: flex; align-items: center; gap: 0.5rem;
                    background: rgba(0,0,0,0.3); padding: 0.5rem 1rem; border-radius: 30px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .zoin-input-wrapper input {
                    width: 80px; background: none; border: none; color: white;
                    font-family: 'Orbitron', sans-serif; text-align: right; outline: none;
                }
                .zoin-input-wrapper span, .zoin-display span { color: #00ff87; font-weight: bold; }

                .btn-ready, .ready-tag {
                    width: 150px; padding: 0.8rem; border-radius: 12px;
                    font-weight: 900; font-family: 'Orbitron', sans-serif;
                    text-align: center; transition: 0.3s;
                }
                .btn-ready { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: white; cursor: pointer; }
                .btn-ready.is-ready { background: #00ff87; color: black; box-shadow: 0 0 20px rgba(0,255,135,0.4); }
                .ready-tag { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.3); font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.05); }
                .ready-tag.is-ready { background: rgba(0,255,135,0.1); color: #00ff87; border-color: #00ff87; }

                .trade-inventory {
                    padding: 1.5rem; background: rgba(0,0,0,0.2); flex: 1;
                    display: flex; flex-direction: column; gap: 1rem;
                }
                .inventory-header { font-size: 0.7rem; opacity: 0.4; font-weight: bold; }
                .inventory-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
                    gap: 0.8rem; overflow-y: auto; padding-right: 5px;
                }

                .trade-footer { padding: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: center; }
                .btn-cancel { background: none; border: 1px solid rgba(255,0,110,0.3); color: #ff006e; padding: 0.5rem 1.5rem; border-radius: 10px; cursor: pointer; font-size: 0.8rem; font-weight: bold; }
                .btn-cancel:hover { background: rgba(255,0,110,0.1); border-color: #ff006e; }

                @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

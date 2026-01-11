import React, { useState } from 'react';
import { POWERUP_REGISTRY, getPowerupInfo, DEFAULT_LOADOUT } from '../../utils/powerups';
import { audio } from '../../utils/audio';

export default function LoadoutMenu({
    equipped = DEFAULT_LOADOUT,
    loadoutSlot = 0,
    allLoadouts = [DEFAULT_LOADOUT, DEFAULT_LOADOUT, DEFAULT_LOADOUT],
    onEquip,
    onSwitchSlot,
    onClose
}) {
    const [selectedSlot, setSelectedSlot] = useState(0);

    const handleSelectPowerup = (id) => {
        audio.playClick();
        const newLoadout = [...equipped];
        newLoadout[selectedSlot] = id;
        onEquip(newLoadout, loadoutSlot);
        // Auto-advance to next slot
        if (selectedSlot < 2) setSelectedSlot(selectedSlot + 1);
    };

    const handleSwitchLoadoutSlot = (slot) => {
        audio.playClick();
        onSwitchSlot?.(slot);
    };

    const powerupList = Object.values(POWERUP_REGISTRY);

    // Group powerups by type
    const grouped = {
        'Offensive': powerupList.filter(p => ['projectile', 'trap', 'beam', 'curse'].includes(p.type)),
        'Defensive': powerupList.filter(p => p.type === 'buff' && ['shield', 'spike_armor', 'ghost', 'shrink'].includes(p.id)),
        'Mobility': powerupList.filter(p => ['speed_boost', 'jump_jet', 'teleport', 'grapple'].includes(p.id)),
        'Chaos': powerupList.filter(p => ['giant', 'invisible', 'magnet', 'black_hole', 'fart'].includes(p.id))
    };

    return (
        <div className="loadout-overlay" onClick={onClose}>
            <div className="loadout-container" onClick={e => e.stopPropagation()}>
                <div className="header">
                    <div className="header-text">
                        <h2>🎒 POWERUP LOADOUT</h2>
                        <p className="header-desc">
                            Equip 3 powerups. Use <strong>Key 1, 2, or 3</strong> during battle to activate!
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>✓ CONFIRM</button>
                </div>

                {/* Loadout Slot Selector */}
                <div className="loadout-tabs">
                    {[0, 1, 2].map((slot) => (
                        <button
                            key={slot}
                            className={`loadout-tab ${loadoutSlot === slot ? 'active' : ''}`}
                            onClick={() => handleSwitchLoadoutSlot(slot)}
                        >
                            Loadout {slot + 1}
                        </button>
                    ))}
                </div>

                <div className="slots-section">
                    <div className="slots-row">
                        {equipped.map((id, index) => {
                            const info = getPowerupInfo(id);
                            return (
                                <div
                                    key={index}
                                    className={`loadout-slot ${selectedSlot === index ? 'active' : ''}`}
                                    onClick={() => setSelectedSlot(index)}
                                >
                                    <div className="slot-number">{index + 1}</div>
                                    <div className="slot-icon" style={{
                                        background: `linear-gradient(135deg, ${info.color}, ${info.color}88)`,
                                        boxShadow: `0 0 20px ${info.color}66`
                                    }}>
                                        {info.imagePath ? <img src={info.imagePath} alt={info.name} className="powerup-img" /> : info.icon}
                                    </div>
                                    <div className="slot-name">{info.name}</div>
                                    <div className="slot-hint">Key {index + 1}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="slot-instruction">
                        Click a slot above, then choose a powerup below
                    </div>
                </div>

                <div className="powerup-grid-container">
                    {Object.entries(grouped).map(([category, powerups]) => (
                        <div key={category} className="powerup-category">
                            <h3 className="category-title">{category}</h3>
                            <div className="powerup-grid">
                                {powerups.map(p => (
                                    <div
                                        key={p.id}
                                        className={`powerup-item ${equipped.includes(p.id) ? 'equipped' : ''}`}
                                        onClick={() => !equipped.includes(p.id) && handleSelectPowerup(p.id)}
                                        style={{
                                            borderColor: equipped.includes(p.id) ? p.color : 'transparent'
                                        }}
                                    >
                                        <div className="p-icon" style={{
                                            background: `linear-gradient(135deg, ${p.color}33, transparent)`,
                                            color: p.color
                                        }}>
                                            {p.imagePath ? <img src={p.imagePath} alt={p.name} className="powerup-img" /> : p.icon}
                                        </div>
                                        <div className="p-info">
                                            <h4>{p.name}</h4>
                                            <p>{p.desc}</p>
                                        </div>
                                        {equipped.includes(p.id) && (
                                            <div className="equipped-badge" style={{ background: p.color }}>
                                                SLOT {equipped.indexOf(p.id) + 1}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .loadout-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.95); z-index: 1500;
                    display: flex; justify-content: center; align-items: center;
                    color: white; font-family: 'Orbitron', sans-serif;
                }
                .loadout-container {
                    width: 95%; max-width: 1000px; height: 90%;
                    background: linear-gradient(135deg, #0f0f25, #250f3e);
                    border: 1px solid #444; border-radius: 20px;
                    padding: 2rem; display: flex; flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 0 50px rgba(0,0,0,0.5);
                }

                .header { 
                    display: flex; justify-content: space-between; 
                    align-items: flex-start; margin-bottom: 1.5rem;
                }
                .header-text h2 { 
                    margin: 0; font-size: 2.2rem;
                    background: linear-gradient(45deg, #ff006e, #00d4ff);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .header-desc { color: #ccc; font-size: 0.95rem; margin-top: 0.5rem; }
                .close-btn {
                    background: linear-gradient(45deg, #00ff87, #00d4ff);
                    border: none; padding: 0.8rem 1.5rem; border-radius: 30px;
                    color: #000; font-weight: bold; cursor: pointer;
                    font-family: 'Orbitron'; font-size: 0.9rem;
                }

                .slots-section { text-align: center; margin-bottom: 1.5rem; }
                .slots-row { 
                    display: flex; gap: 1.5rem; justify-content: center; 
                    margin-bottom: 0.5rem;
                }
                .loadout-slot {
                    width: 140px; padding: 1rem; 
                    border: 2px solid #333; border-radius: 15px;
                    display: flex; flex-direction: column; align-items: center;
                    background: rgba(0,0,0,0.3); cursor: pointer; 
                    transition: all 0.3s; position: relative;
                }
                .loadout-slot:hover { border-color: #555; }
                .loadout-slot.active { 
                    border-color: #00ff87; 
                    box-shadow: 0 0 30px rgba(0,255,135,0.3);
                    transform: scale(1.05);
                }
                .slot-number {
                    position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
                    background: #00ff87; color: #000; width: 24px; height: 24px;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-weight: bold; font-size: 0.8rem;
                }
                .slot-icon { 
                    font-size: 2.5rem; width: 70px; height: 70px; 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    margin: 0.8rem 0;
                }
                .slot-name { font-size: 0.8rem; font-weight: bold; }
                .slot-hint { font-size: 0.65rem; color: #555; margin-top: 0.3rem; }
                .slot-instruction { color: #555; font-size: 0.75rem; }

                .powerup-grid-container { 
                    flex: 1; overflow-y: auto; padding-right: 0.5rem;
                }
                .powerup-category { margin-bottom: 1.5rem; }
                .category-title {
                    color: #fff; font-size: 1rem; margin-bottom: 1rem;
                    padding-bottom: 0.5rem; border-bottom: 1px solid #444;
                    letter-spacing: 1px;
                }

                .powerup-grid {
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 0.8rem;
                }
                .powerup-item {
                    background: rgba(255,255,255,0.03); padding: 0.8rem;
                    border-radius: 12px; display: flex; gap: 0.8rem;
                    cursor: pointer; border: 2px solid transparent;
                    position: relative; transition: all 0.2s;
                }
                .powerup-item:hover:not(.equipped) { 
                    background: rgba(255,255,255,0.12);
                    transform: translateY(-3px) scale(1.02);
                    border-color: rgba(255,255,255,0.2);
                }
                .powerup-item.equipped { 
                    opacity: 0.4; cursor: not-allowed; grayscale: 50%;
                }
                .p-icon { 
                    font-size: 1.8rem; width: 50px; height: 50px;
                    border-radius: 10px; display: flex; 
                    align-items: center; justify-content: center;
                    flex-shrink: 0; overflow: hidden;
                }
                .powerup-img {
                    width: 100%; height: 100%; object-fit: cover;
                }
                .slot-icon { overflow: hidden; }
                .p-info { flex: 1; min-width: 0; }
                .p-info h4 { margin: 0 0 0.3rem 0; font-size: 0.9rem; color: #fff; }
                .p-info p { margin: 0; font-size: 0.75rem; color: #bbb; line-height: 1.4; }
                .equipped-badge {
                    position: absolute; top: 8px; right: 8px; 
                    font-size: 0.6rem; color: #000; padding: 3px 8px; 
                    border-radius: 10px; font-weight: bold;
                }

                /* Scrollbar */
                .powerup-grid-container::-webkit-scrollbar { width: 6px; }
                .powerup-grid-container::-webkit-scrollbar-track { background: #111; }
                .powerup-grid-container::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

                /* Loadout Tabs */
                .loadout-tabs {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                    justify-content: center;
                }
                .loadout-tab {
                    padding: 0.5rem 1rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid #333;
                    border-radius: 20px;
                    color: #888;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .loadout-tab:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .loadout-tab.active {
                    background: linear-gradient(135deg, #00d4ff33, #ff006e33);
                    border-color: #00d4ff;
                    color: #00d4ff;
                }
            `}</style>
        </div>
    );
}

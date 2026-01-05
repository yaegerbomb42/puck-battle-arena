import React, { useState } from 'react';
import { POWERUP_REGISTRY, getPowerupInfo, DEFAULT_LOADOUT } from '../../utils/powerups';

export default function LoadoutMenu({ equipped = DEFAULT_LOADOUT, onEquip, onClose }) {
    const [selectedSlot, setSelectedSlot] = useState(0); // 0, 1, 2

    const handleSelectPowerup = (id) => {
        const newLoadout = [...equipped];
        newLoadout[selectedSlot] = id;
        onEquip(newLoadout);
    };

    const powerupList = Object.values(POWERUP_REGISTRY);

    return (
        <div className="loadout-overlay">
            <div className="loadout-container">
                <div className="header">
                    <h2>TACTICAL LOADOUT</h2>
                    <button className="close-btn" onClick={onClose}>CONFIRM</button>
                </div>

                <div className="slots-row">
                    {equipped.map((id, index) => {
                        const info = getPowerupInfo(id);
                        return (
                            <div
                                key={index}
                                className={`loadout-slot ${selectedSlot === index ? 'active' : ''}`}
                                onClick={() => setSelectedSlot(index)}
                            >
                                <div className="slot-label">SLOT {index + 1}</div>
                                <div className="slot-icon" style={{ background: info.color }}>{info.icon}</div>
                                <div className="slot-name">{info.name}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="powerup-grid-container">
                    <h3>AVAILABLE ARSENAL</h3>
                    <div className="powerup-grid">
                        {powerupList.map(p => (
                            <div
                                key={p.id}
                                className={`powerup-item ${equipped.includes(p.id) ? 'equipped' : ''}`}
                                onClick={() => handleSelectPowerup(p.id)}
                            >
                                <div className="p-icon" style={{ color: p.color }}>{p.icon}</div>
                                <div className="p-info">
                                    <h4>{p.name}</h4>
                                    <p>{p.desc}</p>
                                </div>
                                {equipped.includes(p.id) && <div className="equipped-badge">EQUIPPED</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .loadout-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9); z-index: 1500;
          display: flex; justify-content: center; align-items: center;
          color: white; font-family: 'Orbitron', sans-serif;
        }
        .loadout-container {
          width: 900px; height: 80%; background: #1a1a1a;
          border: 2px solid #444; border-radius: 12px;
          padding: 2rem; display: flex; flex-direction: column;
        }
        .header { display: flex; justify-content: space-between; margin-bottom: 2rem; }
        .slots-row { display: flex; gap: 2rem; justify-content: center; margin-bottom: 2rem; }
        .loadout-slot {
          width: 150px; height: 200px; border: 2px solid #555; border-radius: 8px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: #222; cursor: pointer; transition: 0.2s;
        }
        .loadout-slot.active { border-color: #00ff87; box-shadow: 0 0 20px rgba(0,255,135,0.3); transform: scale(1.05); }
        .slot-icon { font-size: 3rem; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 1rem 0; color: black; }
        
        .powerup-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem; overflow-y: auto; padding-right: 1rem;
        }
        .powerup-item {
          background: #333; padding: 1rem; border-radius: 8px; display: flex; gap: 1rem;
          cursor: pointer; border: 1px solid transparent; position: relative;
        }
        .powerup-item:hover { background: #444; }
        .powerup-item.equipped { border-color: #00d4ff; opacity: 0.5; }
        .p-icon { font-size: 2rem; }
        .p-info h4 { margin: 0 0 0.5rem 0; font-size: 0.9rem; }
        .p-info p { margin: 0; font-size: 0.7rem; color: #aaa; }
        .equipped-badge {
            position: absolute; top: 5px; right: 5px; font-size: 0.6rem;
            background: #00d4ff; color: black; padding: 2px 5px; border-radius: 4px;
        }
      `}</style>
        </div>
    );
}

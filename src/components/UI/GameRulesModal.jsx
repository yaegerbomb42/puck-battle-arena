import React, { useState } from 'react';
import './GameRulesModal.css';

/**
 * Custom Game Rules Modal
 * Allows host to configure game parameters
 */
export default function GameRulesModal({ isOpen, onClose, onApply, isHost }) {
    const [rules, setRules] = useState({
        timeLimit: 120,
        lives: 3,
        powerupsEnabled: true,
        gravityModifier: 1.0,
        knockbackMultiplier: 1.0,
        speedMultiplier: 1.0
    });

    if (!isOpen) return null;

    const handleChange = (key, value) => {
        setRules(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApply(rules);
        onClose();
    };

    return (
        <div className="game-rules-modal-overlay" onClick={onClose}>
            <div className="game-rules-modal" onClick={e => e.stopPropagation()}>
                <h2>⚙️ Custom Game Rules</h2>

                <div className="rules-grid">
                    <label>
                        <span>Time Limit</span>
                        <select
                            value={rules.timeLimit}
                            onChange={e => handleChange('timeLimit', Number(e.target.value))}
                            disabled={!isHost}
                        >
                            <option value={60}>1 Minute</option>
                            <option value={120}>2 Minutes</option>
                            <option value={180}>3 Minutes</option>
                            <option value={300}>5 Minutes</option>
                            <option value={0}>Unlimited</option>
                        </select>
                    </label>

                    <label>
                        <span>Lives</span>
                        <select
                            value={rules.lives}
                            onChange={e => handleChange('lives', Number(e.target.value))}
                            disabled={!isHost}
                        >
                            <option value={1}>1 Life</option>
                            <option value={3}>3 Lives</option>
                            <option value={5}>5 Lives</option>
                            <option value={99}>Unlimited</option>
                        </select>
                    </label>

                    <label>
                        <span>Powerups</span>
                        <select
                            value={rules.powerupsEnabled ? 'on' : 'off'}
                            onChange={e => handleChange('powerupsEnabled', e.target.value === 'on')}
                            disabled={!isHost}
                        >
                            <option value="on">Enabled</option>
                            <option value="off">Disabled</option>
                        </select>
                    </label>

                    <label>
                        <span>Gravity</span>
                        <select
                            value={rules.gravityModifier}
                            onChange={e => handleChange('gravityModifier', Number(e.target.value))}
                            disabled={!isHost}
                        >
                            <option value={0.5}>Low (Moon)</option>
                            <option value={1.0}>Normal</option>
                            <option value={1.5}>High</option>
                            <option value={2.0}>Extreme</option>
                        </select>
                    </label>

                    <label>
                        <span>Knockback</span>
                        <select
                            value={rules.knockbackMultiplier}
                            onChange={e => handleChange('knockbackMultiplier', Number(e.target.value))}
                            disabled={!isHost}
                        >
                            <option value={0.5}>Light</option>
                            <option value={1.0}>Normal</option>
                            <option value={2.0}>Heavy</option>
                            <option value={3.0}>INSANE</option>
                        </select>
                    </label>

                    <label>
                        <span>Speed</span>
                        <select
                            value={rules.speedMultiplier}
                            onChange={e => handleChange('speedMultiplier', Number(e.target.value))}
                            disabled={!isHost}
                        >
                            <option value={0.75}>Slow</option>
                            <option value={1.0}>Normal</option>
                            <option value={1.5}>Fast</option>
                            <option value={2.0}>Turbo</option>
                        </select>
                    </label>
                </div>

                <div className="modal-actions">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    {isHost && <button className="apply-btn" onClick={handleApply}>Apply Rules</button>}
                </div>
            </div>
        </div>
    );
}

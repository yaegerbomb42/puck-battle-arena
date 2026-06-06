import React from 'react';
import { audio } from '../../utils/audio';

export default function HighStakesConfirmModal({ isOpen, onClose, onConfirm, amount }) {
    if (!isOpen) return null;

    const handleConfirm = () => {
        audio.playClick();
        onConfirm();
    };

    return (
        <div className="hs-confirm-overlay">
            <div className="hs-confirm-card glass-dark">
                <div className="hs-warning-icon">⚠️</div>
                <h2>HIGH STAKES DETECTED</h2>
                <p className="hs-desc">
                    You are about to wager <span className="highlight-z">{amount} Zoins</span>.
                    <br />
                    Winning = 100% Validation. Loss = 0% Mercy.
                </p>
                
                <div className="hs-risk-breakdown">
                    <div className="risk-item">
                        <span className="label">POTENTIAL WIN:</span>
                        <span className="value win">{(amount * 2).toLocaleString()} Z</span>
                    </div>
                    <div className="risk-item">
                        <span className="label">RISK:</span>
                        <span className="value loss">-{amount.toLocaleString()} Z</span>
                    </div>
                </div>

                <div className="hs-actions">
                    <button className="btn-hs-cancel" onClick={() => { audio.playClick(); onClose(); }}>RETREAT</button>
                    <button className="btn-hs-confirm" onClick={handleConfirm}>ENTER THE ARENA</button>
                </div>
            </div>

            <style>{`
                .hs-confirm-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3000;
                    backdrop-filter: blur(20px);
                }
                .hs-confirm-card {
                    width: 400px;
                    padding: 40px;
                    text-align: center;
                    border: 2px solid #ff4500;
                    border-radius: 24px;
                    box-shadow: 0 0 50px rgba(255, 69, 0, 0.3);
                    animation: vibrate 0.15s infinite;
                }
                @keyframes vibrate {
                    0% { transform: translate(0); }
                    25% { transform: translate(1px, 1px); }
                    50% { transform: translate(-1px, 1px); }
                    75% { transform: translate(1px, -1px); }
                    100% { transform: translate(0); }
                }
                .hs-warning-icon { font-size: 48px; margin-bottom: 10px; }
                .hs-confirm-card h2 { 
                    font-family: 'Orbitron', sans-serif; 
                    color: #ff4500; margin: 0; letter-spacing: 2px;
                }
                .hs-desc { color: rgba(255,255,255,0.7); margin-top: 15px; font-size: 0.9rem; }
                .highlight-z { color: #ffd700; font-weight: bold; }
                
                .hs-risk-breakdown {
                    margin: 30px 0;
                    background: rgba(0,0,0,0.3);
                    padding: 20px;
                    border-radius: 12px;
                }
                .risk-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .risk-item .label { font-size: 0.75rem; opacity: 0.6; }
                .risk-item .value { font-weight: bold; }
                .risk-item .win { color: #00ff87; }
                .risk-item .loss { color: #ff4500; }

                .hs-actions { display: flex; flex-direction: column; gap: 10px; }
                .btn-hs-confirm {
                    padding: 15px; border: none; border-radius: 500px;
                    background: #ff4500; color: white; font-weight: bold;
                    font-family: 'Orbitron', sans-serif; cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-hs-confirm:hover { background: #ff5722; transform: scale(1.02); }
                .btn-hs-cancel {
                    background: none; border: 1px solid rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.5); padding: 10px; border-radius: 500px;
                    cursor: pointer;
                }
                .btn-hs-cancel:hover { color: white; border-color: white; }
            `}</style>
        </div>
    );
}

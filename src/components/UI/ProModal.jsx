import React from 'react';
import { audio } from '../../utils/audio';

// Premium Pro Modal - Using Golden/Purple Palette for "Luxury" feel
export default function ProModal({ isOpen, onClose, user, isPro, onSubscribe }) {
    if (!isOpen) return null;

    const benefits = [
        { icon: '💎', title: '1,000 Zoins / Week', desc: 'Automatic weekly fuel top-up.' },
        { icon: '📦', title: 'Free Epic Pack / Week', desc: 'Guaranteed Rare, Epic, or Legendary icon.' },
        { icon: '⚖️', title: '0% Wager Fees', desc: 'Keep 100% of your winnings in High Stakes (Normally -10%).' },
        { icon: '👑', title: 'Golden Identity', desc: 'Exclusive gold name & "PRO" badge in lobby/chat.' },
        { icon: '🔬', title: 'Evo-Lab Access', desc: 'Early access to Puck Evolution & Scrimmage features.' },
        { icon: '📊', title: 'Advanced Analytics', desc: 'See your win/loss data and hit-box statistics.' }
    ];

    const handleSubscribe = () => {
        audio.playClick();
        onSubscribe();
    };

    return (
        <div className="pro-modal-overlay">
            <div className="pro-modal-content glass">
                <button className="close-btn" onClick={() => { audio.playClick(); onClose(); }}>✕</button>
                
                <div className="pro-header">
                    <div className="pro-badge-large">PUCKOFF PRO</div>
                    <h1>Upgrade Your Identity</h1>
                    <p>The definitive competitive ecosystem for elite puck masters.</p>
                </div>

                <div className="benefits-grid">
                    {benefits.map((b, i) => (
                        <div key={i} className="benefit-card">
                            <div className="benefit-icon">{b.icon}</div>
                            <div className="benefit-text">
                                <h3>{b.title}</h3>
                                <p>{b.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pro-footer">
                    {isPro ? (
                        <div className="pro-active-status">
                            <span className="check">✓</span> PRO STATUS ACTIVE
                        </div>
                    ) : (
                        <button className="btn-go-pro" onClick={handleSubscribe}>
                            ACTIVATE PRO — $4.99/mo
                        </button>
                    )}
                    <p className="footer-note">Secure payment via Stripe. Cancel anytime.</p>
                </div>
            </div>

            <style>{`
                .pro-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(8px);
                    padding: 20px;
                }
                .pro-modal-content {
                    width: 100%;
                    max-width: 600px;
                    background: linear-gradient(145deg, rgba(30, 10, 50, 0.9), rgba(10, 10, 30, 0.9));
                    border: 1px solid rgba(255, 215, 0, 0.3);
                    border-radius: 32px;
                    padding: 40px;
                    position: relative;
                    box-shadow: 0 0 50px rgba(255, 215, 0, 0.1);
                    animation: modalPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes modalPop {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .close-btn {
                    position: absolute;
                    top: 20px; right: 20px;
                    background: none; border: none;
                    color: rgba(255,255,255,0.5);
                    font-size: 24px; cursor: pointer;
                    transition: color 0.2s;
                }
                .close-btn:hover { color: white; }
                
                .pro-header { text-align: center; margin-bottom: 30px; }
                .pro-badge-large {
                    display: inline-block;
                    padding: 4px 16px;
                    background: linear-gradient(90deg, #ffd700, #ffaa00);
                    color: black;
                    font-weight: 800;
                    font-size: 14px;
                    border-radius: 50px;
                    margin-bottom: 15px;
                    letter-spacing: 2px;
                    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
                }
                .pro-header h1 { 
                    font-family: 'Orbitron', sans-serif;
                    font-size: 32px; margin: 0; color: white;
                }
                .pro-header p { color: rgba(255,255,255,0.6); margin-top: 5px; }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 30px;
                }
                .benefit-card {
                    display: flex;
                    gap: 12px;
                    padding: 15px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.05);
                    transition: transform 0.2s;
                }
                .benefit-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.05); }
                .benefit-icon { font-size: 24px; }
                .benefit-text h3 { font-size: 14px; margin: 0; color: #ffd700; }
                .benefit-text p { font-size: 11px; margin: 4px 0 0; color: rgba(255,255,255,0.5); line-height: 1.3; }

                .pro-footer { text-align: center; }
                .btn-go-pro {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(90deg, #ffd700, #ffaa00);
                    border: none;
                    border-radius: 500px;
                    font-weight: 800;
                    font-size: 16px;
                    font-family: 'Orbitron', sans-serif;
                    color: black;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .btn-go-pro:hover {
                    transform: scale(1.02);
                    box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
                }
                .pro-active-status {
                    padding: 16px;
                    background: rgba(29, 185, 84, 0.1);
                    color: #1db954;
                    border: 1px solid #1db954;
                    border-radius: 500px;
                    font-weight: bold;
                }
                .footer-note { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 10px; }
            `}</style>
        </div>
    );
}

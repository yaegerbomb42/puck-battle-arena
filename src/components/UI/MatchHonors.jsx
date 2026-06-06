import React, { useEffect, useState } from 'react';

export default function MatchHonors({ honors, onRestart, isWinner }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    if (!honors) return null;

    const honorItems = [
        { id: 'mvp', title: '👑 MATCH MVP', data: honors.mvp, icon: '🏆', color: '#ffd700', desc: 'Highest Score' },
        { id: 'damage', title: '💥 DAMAGE DEALER', data: honors.damageDealer, icon: '🔥', color: '#ff4d4d', desc: 'Most Damage' },
        { id: 'stomp', title: '👞 STOMP MASTER', data: honors.stompMaster, icon: '👣', color: '#00d4ff', desc: 'Most Stomps' },
        { id: 'survival', title: '🛡️ SURVIVALIST', data: honors.survivalist, icon: '⌛', color: '#00ff87', desc: 'Longest Life' }
    ];

    return (
        <div className={`match-honors-overlay ${visible ? 'visible' : ''}`}>
            <div className="honors-content">
                <h1 className="honors-title">
                    {isWinner ? '🎉 VICTORY!' : 'GG! MATCH ENDED'}
                </h1>
                
                <div className="honors-grid">
                    {honorItems.map((item, index) => (
                        <div 
                            key={item.id} 
                            className="honor-card glass"
                            style={{ '--delay': `${index * 0.1}s`, '--accent': item.color }}
                        >
                            <div className="honor-icon">{item.icon}</div>
                            <div className="honor-info">
                                <div className="honor-label">{item.title}</div>
                                <div className="honor-player">{item.data?.name || 'Unknown'}</div>
                                <div className="honor-value">
                                    {item.id === 'survival' ? `${item.data?.value}s` : item.data?.value}
                                    <span className="honor-desc"> {item.desc}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="honors-actions">
                    <button className="btn btn-primary shimmer" onClick={onRestart}>
                        RETURN TO LOBBY
                    </button>
                </div>
            </div>

            <style jsx>{`
                .match-honors-overlay {
                    position: fixed; inset: 0;
                    background: rgba(10, 10, 20, 0.9);
                    backdrop-filter: blur(20px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 3000;
                    opacity: 0; transition: opacity 0.8s ease;
                    font-family: 'Orbitron', sans-serif;
                }
                .match-honors-overlay.visible { opacity: 1; }

                .honors-content {
                    width: 90%; max-width: 1000px;
                    text-align: center;
                    transform: translateY(20px);
                    transition: transform 0.8s cubic-bezier(0.19, 1, 0.22, 1);
                }
                .match-honors-overlay.visible .honors-content { transform: translateY(0); }

                .honors-title {
                    font-size: 3.5rem; font-weight: 900; color: #fff;
                    margin-bottom: 3rem; text-transform: uppercase;
                    letter-spacing: 5px;
                    text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
                }

                .honors-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.5rem; margin-bottom: 3rem;
                }

                .honor-card {
                    padding: 2rem; border-radius: 20px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    position: relative; overflow: hidden;
                    opacity: 0; transform: scale(0.9);
                    animation: cardIn 0.6s var(--delay) forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    transition: all 0.3s;
                }
                .honor-card:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: var(--accent);
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px var(--accent) 33;
                }

                @keyframes cardIn {
                    to { opacity: 1; transform: scale(1); }
                }

                .honor-icon {
                    font-size: 2.5rem; margin-bottom: 1rem;
                    filter: drop-shadow(0 0 10px rgba(255,255,255,0.3));
                }

                .honor-label {
                    font-size: 0.75rem; font-weight: 800; color: var(--accent);
                    margin-bottom: 0.5rem; letter-spacing: 1px;
                }
                .honor-player {
                    font-size: 1.3rem; font-weight: 700; color: #fff;
                    margin-bottom: 0.5rem;
                }
                .honor-value {
                    font-size: 1.5rem; font-weight: 900; color: #fff;
                    opacity: 0.9;
                }
                .honor-desc {
                    font-size: 0.65rem; color: #aaa;
                    text-transform: uppercase; font-weight: 500;
                    display: block; margin-top: 4px;
                }

                .honors-actions { margin-top: 2rem; }
                .btn {
                    padding: 1.2rem 4rem; font-size: 1.2rem;
                    border-radius: 40px; border: none; font-weight: 900;
                    cursor: pointer; transition: all 0.3s;
                    text-transform: uppercase; letter-spacing: 2px;
                }
                .btn-primary {
                    background: linear-gradient(90deg, #ff006e, #ff8e00);
                    color: #fff; box-shadow: 0 0 30px rgba(255,0,110,0.4);
                }
                .btn-primary:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 50px rgba(255,0,110,0.6);
                }

                @media (max-width: 768px) {
                    .honors-title { font-size: 2rem; }
                    .honors-grid { grid-template-columns: 1fr 1fr; }
                }
            `}</style>
        </div>
    );
}

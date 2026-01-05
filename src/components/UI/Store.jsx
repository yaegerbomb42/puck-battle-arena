import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TIERS, PACK_PRICES, TOTAL_ICONS, getCollectionStats } from '../../utils/economy';

// Stripe Payment Links (Replace with your real URLs)
const STRIPE_LINKS = {
    single: 'https://buy.stripe.com/5kQeV577v6FsgIZ0m1aIM07',
    bundle10: 'https://buy.stripe.com/3cIbIT0J78NAgIZ0m1aIM06',
    unlockAll: 'https://buy.stripe.com/6oU4grcrPgg29gx0m1aIM08'
};

export default function Store({ onClose, onOpenPack }) {
    const { inventory, useFreePack } = useAuth();
    const stats = getCollectionStats(inventory?.icons || []);

    const handleOpenFreePack = async (type) => {
        if (inventory.freePacks > 0) {
            const success = await useFreePack();
            if (success) {
                onOpenPack(type);
            }
        } else {
            // Redirect to purchase if no free packs
            /* Logic for direct purchase is below */
        }
    };

    return (
        <div className="store-overlay">
            <div className="store-header">
                <div className="header-info">
                    <h2>🎰 ICON VAULT</h2>
                    {inventory?.freePacks > 0 && (
                        <div className="free-packs-badge">
                            🎁 {inventory.freePacks} Packs Owned
                        </div>
                    )}
                </div>
                <div className="collection-progress">
                    📦 {stats.owned}/{stats.total} ({stats.percentage}%)
                </div>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <div className="store-content">
                {/* Pack Purchasing Section */}
                <div className="packs-section">
                    <h3>Open Packs</h3>
                    <p className="pack-info">Each pack contains <strong>3 random icons</strong> • 2.5% chance for Free Pack Token</p>

                    <div className="packs-grid">
                        <PackCard
                            name="Single Pack"
                            price={inventory?.freePacks > 0 ? "OPEN NOW" : "$0.50"}
                            slots={3}
                            color="#00d4ff"
                            image="/images/packs/single_pack.png"
                            owned={inventory?.freePacks > 0}
                            onClick={() => {
                                if (inventory?.freePacks > 0) {
                                    handleOpenFreePack('single');
                                } else {
                                    window.open(STRIPE_LINKS.single, '_blank');
                                }
                            }}
                        />
                        <PackCard
                            name="10-Pack Bundle"
                            price="$3.00"
                            slots={30}
                            color="#a855f7"
                            image="/images/packs/bundle_10.png"
                            badge="SAVE 40%"
                            onClick={() => window.open(STRIPE_LINKS.bundle10, '_blank')}
                        />
                    </div>
                </div>

                <hr className="divider" />

                {/* Whale Option */}
                <div className="whale-section">
                    <div className="whale-card" onClick={() => window.open(STRIPE_LINKS.unlockAll, '_blank')}>
                        <div className="whale-glow"></div>
                        <img src="/images/packs/unlock_all.png" alt="Unlock All" className="whale-image" />
                        <h3>🐋 UNLOCK ALL</h3>
                        <p>Instantly unlock all 150 icons including Mystery Tiers</p>
                        <div className="whale-price">$99.99</div>
                        <div className="whale-bonus">+ Hidden Divine Bonuses</div>
                    </div>
                </div>

                <hr className="divider" />

                {/* Tier Preview */}
                <div className="tier-section">
                    <h3>Rarity Tiers</h3>
                    <div className="tier-grid">
                        {Object.entries(TIERS).map(([id, tier]) => (
                            <div
                                key={id}
                                className={`tier-chip ${tier.isMystery ? 'mystery' : ''}`}
                                style={{ borderColor: tier.color }}
                            >
                                <span className="tier-dot" style={{ background: tier.color }}></span>
                                <span className="tier-name">{tier.isMystery ? '???' : tier.name}</span>
                                <span className="tier-rate">{(tier.dropRate * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .store-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, rgba(10, 10, 30, 0.98), rgba(20, 10, 40, 0.98));
                    backdrop-filter: blur(10px);
                    z-index: 1000;
                    display: flex; flex-direction: column;
                    padding: 2rem;
                    color: white;
                    font-family: 'Inter', 'Orbitron', sans-serif;
                    overflow-y: auto;
                }
                .store-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 2rem;
                }
                .store-header h2 { font-size: 2rem; margin: 0; }
                .collection-progress {
                    font-size: 1.1rem; color: #00ff87; 
                    background: rgba(0,255,135,0.1); 
                    padding: 0.5rem 1rem; border-radius: 20px;
                }
                .close-btn {
                    background: rgba(255,255,255,0.1); border: none;
                    color: white; font-size: 1.5rem; width: 40px; height: 40px;
                    border-radius: 50%; cursor: pointer;
                }
                .close-btn:hover { background: rgba(255,0,110,0.3); }

                .packs-section, .whale-section, .tier-section { margin-bottom: 2rem; }
                .packs-section h3, .tier-section h3 { text-align: center; margin-bottom: 0.5rem; }
                .pack-info { text-align: center; color: #888; font-size: 0.9rem; margin-bottom: 1rem; }
                
                .packs-grid { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; }
                
                .pack-card {
                    width: 220px; 
                    background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.3));
                    border: 2px solid; border-radius: 20px;
                    padding: 2rem 1.5rem; text-align: center;
                    cursor: pointer; transition: all 0.3s;
                    position: relative;
                }
                .pack-card:hover { 
                    transform: translateY(-8px) scale(1.02); 
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .pack-badge {
                    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
                    background: linear-gradient(45deg, #ff006e, #ff5a00);
                    font-size: 0.7rem; padding: 4px 12px; border-radius: 20px;
                    font-weight: bold;
                }
                .pack-image { 
                    width: 120px; height: 120px; 
                    object-fit: contain; margin: 0.5rem 0;
                    filter: drop-shadow(0 0 15px rgba(0,212,255,0.3));
                }
                .whale-image {
                    width: 180px; height: 180px;
                    object-fit: contain; margin-bottom: 1rem;
                    filter: drop-shadow(0 0 25px rgba(255,215,0,0.4));
                }
                .pack-name { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
                .pack-slots { color: #aaa; font-size: 0.9rem; }
                .pack-price {
                    font-size: 1.8rem; font-weight: bold; margin-top: 1rem;
                    background: linear-gradient(45deg, #00ff87, #00d4ff);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }

                .divider { border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 2rem 0; }

                .whale-card {
                    max-width: 500px; margin: 0 auto;
                    background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,0,110,0.1));
                    border: 2px solid #ffd700; border-radius: 24px;
                    padding: 2rem; text-align: center;
                    cursor: pointer; transition: all 0.3s;
                    position: relative; overflow: hidden;
                }
                .whale-card:hover { 
                    transform: scale(1.02); 
                    box-shadow: 0 0 50px rgba(255,215,0,0.3);
                }
                .whale-glow {
                    position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 50%);
                    animation: pulse 3s infinite;
                }
                .whale-card h3 { font-size: 1.8rem; margin-bottom: 0.5rem; position: relative; }
                .whale-card p { color: #aaa; position: relative; }
                .whale-price { 
                    font-size: 2.5rem; font-weight: bold; color: #ffd700; 
                    margin: 1rem 0; position: relative;
                }
                .whale-bonus { color: #ff006e; font-size: 0.9rem; position: relative; }

                .tier-grid {
                    display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;
                }
                .tier-chip {
                    display: flex; align-items: center; gap: 0.5rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid; border-radius: 20px;
                    padding: 0.4rem 0.8rem; font-size: 0.8rem;
                }
                .tier-chip.mystery { 
                    background: rgba(128,0,255,0.1); 
                    animation: mysteryPulse 2s infinite;
                }
                .tier-dot { width: 10px; height: 10px; border-radius: 50%; }
                .tier-name { font-weight: bold; }
                .tier-rate { color: #888; }

                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
                @keyframes mysteryPulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; box-shadow: 0 0 10px rgba(128,0,255,0.5); }
                }
            `}</style>
        </div>
    );
}

function PackCard({ name, price, slots, color, image, badge, onClick }) {
    return (
        <div className="pack-card" style={{ borderColor: color }} onClick={onClick}>
            {badge && <div className="pack-badge">{badge}</div>}
            <img src={image} alt={name} className="pack-image" />
            <div className="pack-name">{name}</div>
            <div className="pack-slots">{slots} icons</div>
            <div className="pack-price">{price}</div>
        </div>
    );
}

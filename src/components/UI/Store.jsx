import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TIERS, getCollectionStats, ZOIN_BUNDLES, BETTING_OPTS } from '../../utils/economy';
import { audio } from '../../utils/audio';
import SkeletonLoader from './SkeletonLoader';
import ZoinCube from './ZoinCube';
// AdBanner removed (AdSense policy compliance)

// Animated Counter Component
function RollingCounter({ value }) {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValue = useRef(value);

    useEffect(() => {
        if (value !== prevValue.current) {
            const diff = value - prevValue.current;
            const steps = 20;
            const stepValue = diff / steps;
            let current = prevValue.current;

            const interval = setInterval(() => {
                current += stepValue;
                if ((diff > 0 && current >= value) || (diff < 0 && current <= value)) {
                    setDisplayValue(value);
                    clearInterval(interval);
                } else {
                    setDisplayValue(Math.floor(current));
                }
            }, 30);

            prevValue.current = value;
            return () => clearInterval(interval);
        }
    }, [value]);

    return <span>{displayValue.toLocaleString()}</span>;
}

export default function Store({ onClose, onOpenPack, dailyShop, purchaseShopItem }) {
    const { user, inventory, loading, spendZoins, isAdmin } = useAuth();
    const stats = getCollectionStats(inventory?.icons || []);

    // Betting State
    const [isHighStakes, setIsHighStakes] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    const currentBet = isHighStakes ? BETTING_OPTS.high_roller : BETTING_OPTS.standard;

    // [PSYCH] Hide prices until clicked state
    const [showPriceFor, setShowPriceFor] = useState(null);

    // Zoin Theme State
    const [zoinTheme, setZoinTheme] = useState('STANDARD');
    const [purchasingId, setPurchasingId] = useState(null);
    const [purchaseError, setPurchaseError] = useState(null);

    const handleOpenPack = async () => {
        if (!user || isOpening) return;

        const bet = currentBet;
        if ((inventory?.zoins || 0) < bet.cost) {
            const buySection = document.getElementById('buy-zoins');
            if (buySection) buySection.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        setIsOpening(true);
        audio.playClick();

        const success = await spendZoins(bet.cost);
        if (success) {
            onOpenPack(bet.cost);
        }
        setIsOpening(false);
    };

    const handleDailyPurchase = async (itemId) => {
        if (!user || purchasingId) return;
        setPurchasingId(itemId);
        setPurchaseError(null);
        audio.playClick();

        const result = await purchaseShopItem(itemId);
        if (result.success) {
            // Success is handled by Firestore real-time sync in AuthContext
            setPurchasingId(null);
        } else {
            setPurchaseError(result.error);
            setPurchasingId(null);
            setTimeout(() => setPurchaseError(null), 3000);
        }
    };

    return (
        <div className="store-overlay">
            <div className="store-header">
                <div className="header-info">
                    <h2>🎰 ICON VAULT</h2>
                    {/* Zoin Cube Display */}
                    <div style={{ position: 'relative', height: '120px', width: '200px', margin: '-40px 0' }}>
                        <ZoinCube theme={zoinTheme} />
                        <div className="zoin-overlay-text" style={{
                            position: 'absolute', bottom: '10px', width: '100%',
                            textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            pointerEvents: 'none', zIndex: 10
                        }}>
                            <RollingCounter value={inventory?.zoins || 0} /> <span className="z-icon" style={{ display: 'inline-flex' }}>Z</span>
                        </div>
                        {/* Theme Toggles */}
                        <div style={{ position: 'absolute', top: 0, right: -20, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {['STANDARD', 'HOLO', 'GEM'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setZoinTheme(t)}
                                    style={{
                                        width: 12, height: 12, borderRadius: '50%',
                                        border: '1px solid white',
                                        background: zoinTheme === t ? '#00ff87' : 'transparent',
                                        cursor: 'pointer', opacity: 0.5
                                    }}
                                    title={`Skin: ${t}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                {!user && !loading && <div className="auth-nag">Sign in to save progress!</div>}

                <div className="collection-progress">
                    {loading ? (
                        <SkeletonLoader width="150px" height="24px" />
                    ) : (
                        `📦 ${stats.owned}/${stats.total} (${stats.percentage}%)`
                    )}
                </div>
                <button className="close-btn" onClick={() => { audio.playClick(); onClose(); }}>✕</button>
            </div>

            <div className="store-content">
                {/* 0. DAILY DEALS SECTION [NEW] */}
                <div className="featured-section">
                    <div className="section-header">
                        <h3>⚡ DAILY DEALS</h3>
                        <div className="timer-badge">RESETS IN: {Math.max(0, Math.floor((24 * 60 * 60 * 1000 - (Date.now() - (dailyShop?.lastRotation || 0))) / (60 * 60 * 1000)))}h</div>
                    </div>
                    
                    <div className="featured-grid">
                        {(dailyShop?.items || []).map(item => {
                            const isOwned = (inventory?.icons || []).some(icon => icon.id === item.id || icon === item.id);
                            return (
                                <div key={item.id} className={`featured-card tier-${item.tier} ${isOwned ? 'owned' : ''}`}>
                                    <div className="featured-tag">LIMITED TIME</div>
                                    <div className="featured-icon-img">
                                        <img src={item.imageUrl} alt={item.name} onError={(e) => e.target.src = '/icons/placeholder.png'} />
                                    </div>
                                    <div className="featured-info">
                                        <div className="item-name">{item.name}</div>
                                        <div className="item-tier">{TIERS[item.tier]?.name || 'UNKNOWN'}</div>
                                    </div>
                                    
                                    <button 
                                        className={`btn-purchase ${isOwned ? 'owned' : ''}`}
                                        disabled={isOwned || (inventory?.zoins || 0) < item.cost || purchasingId === item.id}
                                        onClick={() => handleDailyPurchase(item.id)}
                                    >
                                        {isOwned ? 'OWNED' : (purchasingId === item.id ? '...' : `${item.cost} Z`)}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    {purchaseError && <div className="purchase-error">⚠️ {purchaseError}</div>}
                </div>

                {/* 1. HIGH ROLLER BETTING SECTION */}
                {/* 1. PACK OPENING SECTION (Refactored) */}
                <div className="pack-opener-section">
                    <div className="pack-visual">
                        <div className={`pack-card ${isHighStakes ? 'high-stakes' : 'standard'}`}>
                            <div className="pack-glow"></div>
                            <div className="pack-icon">{isHighStakes ? '🔥' : '📦'}</div>
                            <div className="pack-label">{isHighStakes ? 'HIGH STAKES PACK' : 'STANDARD PACK'}</div>
                        </div>
                    </div>

                    <div className="pack-controls">
                        <div className="toggle-wrapper">
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={isHighStakes}
                                    onChange={() => { audio.playClick(); setIsHighStakes(!isHighStakes); }}
                                />
                                <span className="slider round"></span>
                            </label>
                            <span className={`toggle-label ${isHighStakes ? 'active' : ''}`}>
                                HIGH STAKES MODE (Better Odds)
                            </span>
                        </div>

                        <button
                            className={`btn-roll ${!user || (inventory?.zoins || 0) < currentBet.cost ? 'disabled' : ''}`}
                            onClick={handleOpenPack}
                            disabled={!user || (inventory?.zoins || 0) < currentBet.cost || isOpening}
                        >
                            {isOpening ? 'OPENING...' : (
                                (!user || (inventory?.zoins || 0) >= currentBet.cost)
                                    ? `OPEN PACK (${currentBet.cost} Z)`
                                    : 'INSUFFICIENT FUNDS'
                            )}
                        </button>

                        <div className="bet-info">
                            {isHighStakes ? (
                                <span className="high-stakes-text">Cost: 500 Z | Luck: <span className="highlight">1.5x</span></span>
                            ) : (
                                <span className="standard-text">Cost: 100 Z | Luck: 1.0x</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. ZOIN BUNDLES SECTION (FUEL) */}
                <div id="buy-zoins" className="bundles-section">
                    <h3>⛽ REFUEL STATION</h3>
                    <p className="section-desc">Keep the action going. Instant top-up.</p>
                    <div className="bundles-grid">
                        {Object.values(ZOIN_BUNDLES).map((bundle) => {
                            const tierClass = bundle.id === 'vault' ? 'tier-whale'
                                : bundle.id === 'cache' ? 'tier-pro'
                                    : 'tier-starter';
                            const coinImg = bundle.id === 'vault' ? '/images/zoins/bundle_whale.jpg'
                                : bundle.id === 'cache' ? '/images/zoins/bundle_pro.jpg'
                                    : '/images/zoins/bundle_starter.jpg';
                            const tierLabel = bundle.id === 'vault' ? '👑 LEGENDARY'
                                : bundle.id === 'cache' ? '⚡ BEST VALUE'
                                    : null;
                            return (
                                <div key={bundle.id} className={`bundle-card ${tierClass}`}>
                                    {tierLabel && <div className={`tier-badge ${tierClass}`}>{tierLabel}</div>}
                                    <div className="bundle-coin-img">
                                        <img src={coinImg} alt={bundle.name} />
                                    </div>
                                    <div className="bundle-name">{bundle.name}</div>
                                    <div className="bundle-amount">
                                        <span className="z-icon">Z</span> {bundle.zoins.toLocaleString()}
                                    </div>
                                    <div className="bundle-price">${bundle.price}</div>

                                    {showPriceFor === bundle.id ? (
                                        <button
                                            className="btn-buy confirm"
                                            onClick={async () => {
                                                audio.playClick();

                                                if (isAdmin) {
                                                    // ADMIN BYPASS
                                                    try {
                                                        const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
                                                        const res = await fetch(`${serverUrl}/api/admin/simulate-purchase`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                email: user.email,
                                                                packId: bundle.id
                                                            })
                                                        });

                                                        if (res.ok) {
                                                            // Redirect to success page on the SERVER
                                                            window.location.href = `${serverUrl}/payment/success`;
                                                        } else {
                                                            alert('Admin simulation failed');
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('Admin simulation error');
                                                    }
                                                } else {
                                                    // NORMAL USER
                                                    window.open(bundle.stripeLink, '_blank');
                                                }
                                                setShowPriceFor(null);
                                            }}
                                        >
                                            {isAdmin ? `ADMIN BUY ${bundle.price}` : `CONFIRM $${bundle.price}`}
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-buy"
                                            onClick={() => {
                                                audio.playClick();
                                                setShowPriceFor(bundle.id);
                                            }}
                                        >
                                            UNLOCK
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. TIER PREVIEW */}
                <div className="tier-section">
                    <h4>DROP RATES (Base)</h4>
                    <div className="tier-grid">
                        {Object.entries(TIERS).map(([id, tier]) => (
                            <div key={id} className={`tier-chip ${isHighStakes && parseInt(id) > 1 ? 'boosted' : ''}`} style={{ borderColor: tier.color }}>
                                <span className="tier-dot" style={{ background: tier.color }}></span>
                                <span className="tier-name">{tier.name}</span>
                                <span className="tier-rate">
                                    {isHighStakes && parseInt(id) > 1
                                        ? `${(tier.dropRate * 100 * 1.5).toFixed(1)}%`
                                        : `${(tier.dropRate * 100).toFixed(1)}%`
                                    }
                                    {isHighStakes && parseInt(id) > 1 && <span className="boost-arrow">↑</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AdBanner removed — AdSense policy: no ads on modal/overlay screens */}
            </div>

            <style jsx>{`
                .store-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: radial-gradient(circle at 50% 50%, rgba(15, 10, 30, 0.95), rgba(8, 8, 20, 0.98));
                    backdrop-filter: blur(25px) saturate(180%);
                    z-index: 1000;
                    display: flex; flex-direction: column;
                    padding: 2rem;
                    color: white;
                    font-family: 'Orbitron', sans-serif;
                    overflow-y: auto;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .featured-section {
                    margin-bottom: 3rem;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 20px;
                    padding: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .section-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 1.5rem;
                }
                .section-header h3 { margin: 0; color: #00ff87; font-size: 1.2rem; }
                .timer-badge {
                    background: rgba(255, 68, 68, 0.1); border: 1px solid #ff4444;
                    color: #ff4444; padding: 0.2rem 0.6rem; border-radius: 10px;
                    font-size: 0.7rem; font-weight: bold;
                }
                .featured-grid {
                    display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap;
                }
                .featured-card {
                    width: 180px; background: rgba(0,0,0,0.4);
                    border-radius: 15px; border: 1px solid rgba(255,255,255,0.1);
                    padding: 1rem; position: relative; transition: transform 0.2s;
                    display: flex; flex-direction: column; align-items: center;
                }
                .featured-card:hover:not(.owned) { transform: translateY(-5px); border-color: rgba(255,255,255,0.3); }
                .featured-card.owned { opacity: 0.6; grayscale: 0.8; }
                
                .featured-tag {
                    position: absolute; top: 10px; left: 10px;
                    background: #ff006e; color: white; font-size: 0.5rem;
                    padding: 0.2rem 0.4rem; border-radius: 4px; font-weight: 900;
                }
                .featured-icon-img {
                    width: 80px; height: 80px; margin: 1rem 0;
                }
                .featured-icon-img img { width: 100%; height: 100%; object-fit: contain; }
                
                .featured-info { text-align: center; margin-bottom: 1rem; }
                .item-name { font-size: 0.9rem; font-weight: bold; margin-bottom: 0.2rem; }
                .item-tier { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; }

                .btn-purchase {
                    width: 100%; padding: 0.6rem; border-radius: 10px;
                    border: none; background: #00ff87; color: black;
                    font-weight: 900; cursor: pointer; transition: all 0.2s;
                }
                .btn-purchase:hover:not(.owned):not(:disabled) { background: #00d488; }
                .btn-purchase:disabled { background: #333; color: #666; cursor: not-allowed; }
                .btn-purchase.owned { background: #222; color: #555; border: 1px solid #444; }

                .purchase-error {
                    color: #ff4444; text-align: center; margin-top: 1rem; font-size: 0.8rem;
                }

                .featured-card.tier-2 { border-color: rgba(0, 212, 255, 0.3); }
                .featured-card.tier-3 { border-color: rgba(139, 92, 246, 0.4); }
                .featured-card.tier-4 { border-color: rgba(255, 215, 0, 0.5); }
                
                .store-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 1rem;
                }
                .store-header h2 { font-size: 2rem; margin: 0; color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
                
                .stat-badge.zoins {
                    background: rgba(255, 215, 0, 0.1);
                    border: 1px solid #ffd700;
                    color: #ffd700;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-size: 1.2rem;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .z-icon {
                    background: #ffd700; color: #000;
                    width: 20px; height: 20px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; font-size: 0.8rem;
                }

                .close-btn {
                    background: none; border: none; color: #fff; font-size: 2rem; cursor: pointer;
                    opacity: 0.7; transition: opacity 0.2s;
                }
                .close-btn:hover { opacity: 1; transform: scale(1.1); }

                .pack-opener-section {
                    display: flex; align-items: center; justify-content: center; gap: 3rem;
                    background: rgba(0,0,0,0.3); border-radius: 20px; padding: 2rem;
                    margin-bottom: 2rem; border: 1px solid rgba(255,255,255,0.05);
                    flex-wrap: wrap;
                }
                .pack-visual { perspective: 1000px; }
                .pack-card {
                    width: 140px; height: 180px;
                    background: linear-gradient(135deg, #333, #111);
                    border: 2px solid #555; border-radius: 15px;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    position: relative; transition: all 0.3s;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .pack-card.high-stakes {
                    background: linear-gradient(135deg, #4a0000, #220000);
                    border-color: #ff4444;
                    animation: pulseStakes 2s infinite;
                }
                .pack-card.high-stakes .pack-glow {
                    position: absolute; inset: -10px; border-radius: 20px;
                    background: rgba(255, 68, 68, 0.2); filter: blur(10px); z-index: -1;
                }
                .pack-icon { font-size: 3rem; margin-bottom: 0.5rem; }
                .pack-label { font-size: 0.7rem; font-weight: 900; text-align: center; color: #fff; max-width: 80%; }
                
                @keyframes pulseStakes {
                    0%, 100% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(255, 68, 68, 0.5); }
                }

                .pack-controls { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
                
                /* Toggle Switch */
                .toggle-wrapper { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
                .switch { position: relative; display: inline-block; width: 60px; height: 34px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider {
                    position: absolute; cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #ccc; transition: .4s;
                    border-radius: 34px;
                }
                .slider:before {
                    position: absolute; content: "";
                    height: 26px; width: 26px;
                    left: 4px; bottom: 4px;
                    background-color: white; transition: .4s;
                    border-radius: 50%;
                }
                input:checked + .slider { background-color: #ff4444; }
                input:checked + .slider:before { transform: translateX(26px); }
                
                .toggle-label { color: #888; font-size: 0.9rem; font-weight: bold; transition: color 0.3s; }
                .toggle-label.active { color: #ff4444; text-shadow: 0 0 10px rgba(255,68,68,0.4); }

                .btn-roll {
                    background: linear-gradient(45deg, #00d4ff, #00ff87);
                    color: black; border: none;
                    padding: 1rem 3rem; font-size: 1.2rem; font-weight: 900;
                    border-radius: 50px; cursor: pointer;
                    box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
                    transition: all 0.2s; text-transform: uppercase;
                    width: 100%; min-width: 250px;
                }
                .high-stakes ~ .btn-roll { /* Contextual styling? No, button is sibling */ } 
                /* Logic check: styling based on isHighStakes state in JS */

                .btn-roll:hover:not(.disabled) { transform: scale(1.05); }
                .btn-roll.disabled { background: #444; color: #888; cursor: not-allowed; box-shadow: none; }
                
                .bet-info { font-size: 0.8rem; color: #aaa; margin-top: 0.5rem; }
                .highlight { color: #00ff87; font-weight: bold; }
                .high-stakes-text .highlight { color: #ff4444; }

                .tier-chip.boosted { border-color: #00ff87; background: rgba(0, 255, 135, 0.1); }
                .tier-chip.boosted .tier-rate { color: #00ff87; font-weight: bold; }
                .boost-arrow { margin-left: 2px; font-size: 0.8em; }

                .bundles-section {
                    margin-bottom: 3rem;
                    text-align: center;
                }
                .bundles-grid {
                    display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap;
                    align-items: flex-start;
                }

                /* Base bundle card */
                .bundle-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 1.5rem;
                    width: 200px;
                    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
                    position: relative;
                    overflow: hidden;
                }
                .bundle-card:hover { transform: translateY(-8px); }

                /* Tier: Starter ($0.99) — subtle teal accent */
                .bundle-card.tier-starter {
                    border-color: rgba(0, 212, 255, 0.3);
                }
                .bundle-card.tier-starter:hover {
                    box-shadow: 0 4px 20px rgba(0, 212, 255, 0.15);
                }

                /* Tier: Pro ($2.99) — electric blue-violet glow */
                .bundle-card.tier-pro {
                    border-color: rgba(99, 102, 241, 0.6);
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05), rgba(0,0,0,0.2));
                    box-shadow: 0 0 15px rgba(99, 102, 241, 0.15);
                }
                .bundle-card.tier-pro:hover {
                    box-shadow: 0 0 30px rgba(99, 102, 241, 0.3), 0 8px 25px rgba(139, 92, 246, 0.15);
                    border-color: rgba(139, 92, 246, 0.8);
                }

                /* Tier: Whale ($4.99) — legendary gold-magenta shimmer */
                .bundle-card.tier-whale {
                    border-color: rgba(255, 215, 0, 0.6);
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.06), rgba(255, 0, 110, 0.04), rgba(0,0,0,0.3));
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.15), 0 0 40px rgba(255, 0, 110, 0.05);
                }
                .bundle-card.tier-whale:hover {
                    box-shadow: 0 0 35px rgba(255, 215, 0, 0.35), 0 0 60px rgba(255, 0, 110, 0.1);
                    border-color: rgba(255, 215, 0, 0.9);
                    transform: translateY(-10px) scale(1.02);
                }
                .bundle-card.tier-whale::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: conic-gradient(from 0deg, transparent, rgba(255, 215, 0, 0.1), transparent, rgba(255, 0, 110, 0.08), transparent);
                    animation: shimmerRotate 4s linear infinite;
                    pointer-events: none;
                    filter: blur(5px);
                }
                @keyframes shimmerRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Tier badges */
                .tier-badge {
                    position: absolute;
                    top: -1px;
                    right: -1px;
                    font-size: 0.65rem;
                    font-weight: 900;
                    padding: 0.25rem 0.75rem;
                    border-radius: 0 18px 0 12px;
                    letter-spacing: 0.5px;
                    z-index: 2;
                }
                .tier-badge.tier-pro {
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    color: white;
                }
                .tier-badge.tier-whale {
                    background: linear-gradient(90deg, #ffd700, #ff006e);
                    color: black;
                    animation: badgePulse 2s ease-in-out infinite;
                }
                @keyframes badgePulse {
                    0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); }
                    50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.6); }
                }

                /* Coin image */
                .bundle-coin-img {
                    width: 64px;
                    height: 64px;
                    margin: 0 auto 0.5rem;
                    position: relative;
                    z-index: 1;
                }
                .bundle-coin-img img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    filter: drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3));
                }
                .tier-whale .bundle-coin-img img {
                    filter: drop-shadow(0 2px 12px rgba(255, 215, 0, 0.5));
                    animation: coinFloat 3s ease-in-out infinite;
                }
                @keyframes coinFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                .bundle-amount {
                    font-size: 1.8rem; color: #ffd700; margin-bottom: 0.5rem;
                    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
                    position: relative;
                    z-index: 1;
                }
                .bundle-price {
                    font-size: 1.4rem;
                    color: #fff;
                    margin-bottom: 1rem;
                    font-weight: 900;
                    position: relative;
                    z-index: 1;
                }
                .tier-starter .bundle-price { color: #aaa; font-size: 1.2rem; }
                .tier-pro .bundle-price { color: #a78bfa; }
                .tier-whale .bundle-price { color: #ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.3); }

                .btn-buy {
                    background: transparent; border: 1px solid #ffd700;
                    color: #ffd700; padding: 0.5rem 1rem;
                    border-radius: 20px; cursor: pointer;
                    font-weight: bold; transition: all 0.2s;
                    width: 100%;
                    position: relative;
                    z-index: 1;
                }
                .btn-buy:hover { background: #ffd700; color: black; }
                .tier-pro .btn-buy { border-color: #8b5cf6; color: #a78bfa; }
                .tier-pro .btn-buy:hover { background: #8b5cf6; color: white; }
                .tier-whale .btn-buy { border-color: #ffd700; color: #ffd700; }
                .tier-whale .btn-buy:hover { background: linear-gradient(90deg, #ffd700, #ff006e); color: black; }

                .refund-text {
                    font-size: 0.7rem; color: #00ff87; margin-top: 0.5rem;
                    animation: pulse 2s infinite; font-weight: bold;
                }
                .bundle-name {
                    font-size: 1rem; color: #aaa; margin-bottom: 0.2rem;
                    text-transform: uppercase; letter-spacing: 1px;
                    position: relative;
                    z-index: 1;
                }
                .tier-pro .bundle-name { color: #c4b5fd; }
                .tier-whale .bundle-name { color: #fde68a; }

                .btn-buy.confirm {
                    background: #00ff87; color: black; border-color: #00ff87;
                    animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                @keyframes popIn {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .tier-section { text-align: center; opacity: 0.7; }
                .tier-grid { display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
                .tier-chip {
                    display: flex; align-items: center; gap: 0.4rem;
                    border: 1px solid; border-radius: 15px;
                    padding: 0.3rem 0.6rem; font-size: 0.7rem;
                }
                .tier-dot { width: 8px; height: 8px; border-radius: 50%; }

                .store-overlay::-webkit-scrollbar { width: 8px; }
                .store-overlay::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
                .store-overlay::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
            `}</style>
        </div >
    );
}

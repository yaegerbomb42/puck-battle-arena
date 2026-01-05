import React, { useState, useMemo } from 'react';
import { TIERS, getAllIcons, getMaskedIcon, getCollectionStats } from '../../utils/economy';

export default function Collection({ playerInventory = [], onClose }) {
    const [filterTier, setFilterTier] = useState(null);
    const [sortBy, setSortBy] = useState('tier'); // 'tier', 'id', 'owned'

    const stats = getCollectionStats(playerInventory);
    const ownedSet = new Set(playerInventory);

    const allIcons = useMemo(() => {
        let icons = getAllIcons().map(icon => ({
            ...getMaskedIcon(icon, playerInventory),
            isOwned: ownedSet.has(icon.id),
            count: playerInventory.filter(id => id === icon.id).length
        }));

        // Filter
        if (filterTier !== null) {
            icons = icons.filter(i => i.tier === filterTier);
        }

        // Sort
        if (sortBy === 'tier') {
            icons.sort((a, b) => b.tier - a.tier); // Highest first
        } else if (sortBy === 'id') {
            icons.sort((a, b) => a.id - b.id);
        } else if (sortBy === 'owned') {
            icons.sort((a, b) => (b.isOwned ? 1 : 0) - (a.isOwned ? 1 : 0));
        }

        return icons;
    }, [playerInventory, filterTier, sortBy]);

    return (
        <div className="collection-overlay">
            <div className="collection-header">
                <h2>📚 COLLECTION</h2>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${stats.percentage}%` }}></div>
                    <span>{stats.owned}/{stats.total}</span>
                </div>
                <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            {/* Filters */}
            <div className="filters">
                <div className="filter-group">
                    <label>Tier:</label>
                    <select value={filterTier ?? ''} onChange={e => setFilterTier(e.target.value ? parseInt(e.target.value) : null)}>
                        <option value="">All</option>
                        {Object.entries(TIERS).map(([id, tier]) => (
                            <option key={id} value={id}>
                                {tier.isMystery ? `??? (${tier.name})` : tier.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Sort:</label>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="tier">Rarity (High→Low)</option>
                        <option value="id">ID</option>
                        <option value="owned">Owned First</option>
                    </select>
                </div>
            </div>

            {/* Tier Stats */}
            <div className="tier-stats">
                {Object.entries(TIERS).map(([id, tier]) => (
                    <div key={id} className="tier-stat" style={{ borderColor: tier.color }}>
                        <span className="dot" style={{ background: tier.color }}></span>
                        <span className="name">{tier.isMystery ? '???' : tier.name}</span>
                        <span className="count">
                            {stats.byTier[id]?.owned}/{stats.byTier[id]?.total}
                        </span>
                    </div>
                ))}
            </div>

            {/* Icons Grid */}
            <div className="icons-grid">
                {allIcons.map(icon => (
                    <IconCard key={icon.id} icon={icon} />
                ))}
            </div>

            <style jsx>{`
                .collection-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, rgba(10, 10, 30, 0.98), rgba(20, 10, 40, 0.98));
                    z-index: 1000;
                    display: flex; flex-direction: column;
                    padding: 1.5rem; color: white;
                    font-family: 'Inter', sans-serif;
                    overflow-y: auto;
                }
                .collection-header {
                    display: flex; align-items: center; gap: 1rem;
                    margin-bottom: 1rem;
                }
                .collection-header h2 { margin: 0; font-size: 1.5rem; }
                .progress-bar {
                    flex: 1; max-width: 300px; height: 24px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 12px; position: relative;
                    overflow: hidden;
                }
                .progress-fill {
                    position: absolute; top: 0; left: 0; height: 100%;
                    background: linear-gradient(90deg, #00ff87, #00d4ff);
                    border-radius: 12px;
                    transition: width 0.3s;
                }
                .progress-bar span {
                    position: absolute; width: 100%; text-align: center;
                    line-height: 24px; font-size: 0.8rem; font-weight: bold;
                }
                .close-btn {
                    background: rgba(255,255,255,0.1); border: none;
                    color: white; font-size: 1.2rem; width: 36px; height: 36px;
                    border-radius: 50%; cursor: pointer; margin-left: auto;
                }

                .filters {
                    display: flex; gap: 1rem; margin-bottom: 1rem;
                    flex-wrap: wrap;
                }
                .filter-group { display: flex; align-items: center; gap: 0.5rem; }
                .filter-group label { color: #888; font-size: 0.9rem; }
                .filter-group select {
                    background: rgba(255,255,255,0.1);
                    border: 1px solid #444; color: white;
                    padding: 0.4rem 0.8rem; border-radius: 8px;
                }

                .tier-stats {
                    display: flex; flex-wrap: wrap; gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .tier-stat {
                    display: flex; align-items: center; gap: 0.3rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid; border-radius: 16px;
                    padding: 0.3rem 0.6rem; font-size: 0.75rem;
                }
                .dot { width: 8px; height: 8px; border-radius: 50%; }
                .name { font-weight: bold; }
                .count { color: #888; }

                .icons-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 0.8rem;
                }
            `}</style>
        </div>
    );
}

function IconCard({ icon }) {
    const tier = TIERS[icon.tier];
    const isOwned = icon.isOwned;
    const isMasked = icon.isMasked;

    return (
        <div
            className={`icon-card ${isOwned ? 'owned' : 'unowned'} ${isMasked ? 'masked' : ''}`}
            style={{ borderColor: tier?.color }}
        >
            <div className="icon-image">
                {isMasked ? '🔒' : '⭐'}
            </div>
            <div className="icon-info">
                <span className="icon-name">{icon.name}</span>
                {isOwned && icon.count > 1 && (
                    <span className="icon-count">x{icon.count}</span>
                )}
            </div>
            <div className="tier-badge" style={{ background: tier?.color }}>
                {isMasked ? '???' : tier?.name?.charAt(0)}
            </div>

            <style jsx>{`
                .icon-card {
                    background: rgba(255,255,255,0.05);
                    border: 2px solid; border-radius: 12px;
                    padding: 0.6rem; text-align: center;
                    position: relative;
                    transition: all 0.2s;
                }
                .icon-card:hover { transform: scale(1.05); }
                .icon-card.unowned { opacity: 0.4; }
                .icon-card.masked { 
                    background: rgba(128,0,255,0.1);
                    animation: mysteryPulse 2s infinite;
                }
                .icon-image { font-size: 2rem; margin: 0.5rem 0; }
                .icon-info { font-size: 0.7rem; }
                .icon-name { 
                    display: block; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis;
                }
                .icon-count {
                    display: inline-block;
                    background: rgba(0,255,135,0.2);
                    color: #00ff87;
                    padding: 0 4px; border-radius: 4px;
                    font-size: 0.6rem; margin-top: 2px;
                }
                .tier-badge {
                    position: absolute; top: 4px; right: 4px;
                    width: 18px; height: 18px;
                    border-radius: 50%; font-size: 0.6rem;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: bold; color: #000;
                }
                @keyframes mysteryPulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

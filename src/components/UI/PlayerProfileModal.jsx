import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getLevelFromXp, getLevelProgress, getRankName, getRankFromRP } from '../../utils/leveling';
import { getIconById } from '../../utils/economy';
import PuckPreview from './PuckPreview';
import { audio } from '../../utils/audio';

export default function PlayerProfileModal({ uid, onClose, onInvite }) {
    const { fetchPublicProfile, followUser, unfollowUser, inventory, sendNotification } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        async function loadProfile() {
            setLoading(true);
            const data = await fetchPublicProfile(uid);
            if (mounted) {
                setProfile(data);
                setLoading(false);
            }
        }
        loadProfile();
        return () => { mounted = false; };
    }, [uid, fetchPublicProfile]);

    if (loading) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="profile-modal glass-dark loading-state">
                    <div className="loader-ring"></div>
                    <p>Fetching Tactical Data...</p>
                </div>
                <style>{`
                    .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #00d4ff; }
                    .loader-ring {
                        width: 40px;
                        height: 40px;
                        border: 3px solid rgba(0,212,255,0.1);
                        border-top: 3px solid #00d4ff;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="profile-modal glass-dark">
                    <p>User profile could not be retrieved.</p>
                    <button className="btn-social" style={{ marginTop: '1rem' }} onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    const level = getLevelFromXp(profile.xp || 0);
    const levelProgress = getLevelProgress(profile.xp || 0);
    const rankTitle = getRankName(level);
    const compRank = getRankFromRP(profile.stats?.rankPoints || 0);
    const iconData = getIconById(profile.equippedIcon || 1001);
    const isFollowing = inventory.following?.includes(uid);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="profile-modal glass-dark" onClick={e => e.stopPropagation()}>
                <button className="btn-close-profile" onClick={onClose}>✕</button>
                
                <div className="profile-header">
                    <div className={`status-dot ${profile.onlineStatus}`}></div>
                    <h2>{profile.username || 'Unknown Player'}</h2>
                    {profile.isLegacy && (
                        <div className="legacy-profile-badge" title="Legacy Alpha Tester">
                            ★ LEGACY
                        </div>
                    )}
                    <span className="uid-tag">#{uid.substring(0, 6).toUpperCase()}</span>
                </div>

                <div className="profile-body">
                    <div className="profile-hero">
                        <div className="puck-view">
                            <PuckPreview icon={iconData} size={240} />
                            <div className="rank-label" style={{ color: compRank.color }}>
                                {compRank.name}
                            </div>
                        </div>
                    </div>

                    <div className="profile-details">
                        <div className="stats-container">
                            <div className="stat-item">
                                <label>Wins</label>
                                <span className="value">{profile.stats?.wins || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>KOs</label>
                                <span className="value">{profile.stats?.knockouts || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>Stomps</label>
                                <span className="value">{profile.stats?.stomps || 0}</span>
                            </div>
                            <div className="stat-item">
                                <label>Damage</label>
                                <span className="value">{Math.floor((profile.stats?.damageDealt || 0) / 100).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="progression-card">
                            <div className="lvl-info">
                                <span className="lvl-text">Level {level}</span>
                                <span className="title-text">{rankTitle}</span>
                            </div>
                            <div className="xp-bar">
                                <div className="xp-fill" style={{ width: `${levelProgress * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-footer">
                    {uid !== inventory.uid ? (
                        <>
                            <button 
                                className={`btn-profile-action ${isFollowing ? 'btn-unfollow' : 'btn-follow'}`}
                                onClick={() => {
                                    audio.playClick();
                                    isFollowing ? unfollowUser(uid) : followUser(uid);
                                }}
                            >
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </button>
                            <button 
                                className="btn-profile-action btn-invite-profile"
                                onClick={() => {
                                    audio.playClick();
                                    onInvite && onInvite(uid);
                                    sendNotification(uid, 'invite', { roomCode: 'LOBBY' }); // Persistent fallback
                                    onClose();
                                }}
                            >
                                Send Invite
                            </button>
                        </>
                    ) : (
                        <p className="self-tag">This is you!</p>
                    )}
                </div>

                <style>{`
                    .profile-modal {
                        width: 520px;
                        padding: 2.5rem;
                        border-radius: 24px;
                        border: 1px solid rgba(0,212,255,0.4);
                        background: rgba(10, 15, 25, 0.9);
                        box-shadow: 0 20px 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,212,255,0.05);
                        position: relative;
                        animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    @keyframes modalScale {
                        from { transform: scale(0.9); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }

                    .btn-close-profile {
                        position: absolute;
                        top: 1.5rem;
                        right: 1.5rem;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                        opacity: 0.5;
                        transition: 0.2s;
                    }
                    .btn-close-profile:hover { opacity: 1; color: #ff006e; transform: rotate(90deg); }

                    .profile-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
                    .status-dot { width: 14px; height: 14px; border-radius: 50%; }
                    .status-dot.online { background: #00ff88; box-shadow: 0 0 10px #00ff88; }
                    .status-dot.offline { background: #444; }
                    .status-dot.in-game { background: #00d4ff; box-shadow: 0 0 10px #00d4ff; }
                    
                    .profile-header h2 { margin: 0; font-size: 1.8rem; letter-spacing: 1px; }
                    .uid-tag { font-size: 0.8rem; opacity: 0.3; font-family: 'JetBrains Mono', monospace; }

                    .profile-body { display: flex; gap: 2rem; }
                    .profile-hero { flex: 1; }
                    .puck-view { 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        background: radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 75%);
                        padding: 1rem;
                        border-radius: 20px;
                    }
                    .rank-label { 
                        margin-top: -1rem; 
                        font-weight: 900; 
                        font-size: 1.4rem; 
                        text-transform: uppercase; 
                        font-style: italic;
                        text-shadow: 0 0 20px currentColor;
                    }

                    .profile-details { flex: 1.2; display: flex; flex-direction: column; gap: 1.5rem; }
                    .stats-container { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
                    .stat-item { 
                        background: rgba(255,255,255,0.03); 
                        padding: 1rem; 
                        border-radius: 12px; 
                        border: 1px solid rgba(255,255,255,0.05);
                        transition: 0.3s;
                    }
                    .stat-item:hover { border-color: rgba(0,212,255,0.3); background: rgba(0,212,255,0.05); }
                    .stat-item label { display: block; font-size: 0.7rem; text-transform: uppercase; opacity: 0.5; margin-bottom: 0.2rem; }
                    .stat-item .value { font-size: 1.4rem; font-weight: 800; color: #fff; }

                    .progression-card { 
                        padding: 1.2rem; 
                        background: rgba(0,212,255,0.05); 
                        border-radius: 16px; 
                        border: 1px solid rgba(0,212,255,0.1); 
                    }
                    .lvl-info { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem; }
                    .lvl-text { font-weight: 900; color: #00d4ff; font-size: 1.2rem; }
                    .title-text { font-size: 0.8rem; opacity: 0.6; }
                    .xp-bar { height: 8px; background: rgba(0,0,0,0.4); border-radius: 4px; overflow: hidden; }
                    .xp-fill { height: 100%; background: linear-gradient(90deg, #00d4ff, #8a2be2); box-shadow: 0 0 10px rgba(0,212,255,0.5); }

                    .profile-footer { margin-top: 2.5rem; display: flex; gap: 1rem; justify-content: center; }
                    .btn-profile-action { 
                        padding: 1rem 2rem; 
                        border-radius: 12px; 
                        border: none; 
                        font-weight: 800; 
                        cursor: pointer; 
                        transition: 0.3s;
                        text-transform: uppercase;
                        font-size: 0.9rem;
                        letter-spacing: 1px;
                        flex: 1;
                    }
                    .btn-follow { background: #00d4ff; color: #000; }
                    .btn-unfollow { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.1); }
                    .btn-invite-profile { background: #ff006e; color: #fff; box-shadow: 0 0 20px rgba(255,0,110,0.3); }
                    .btn-profile-action:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
                    .self-tag { opacity: 0.5; font-style: italic; }
                    .legacy-profile-badge {
                        background: linear-gradient(135deg, #ff006e, #ff8e00);
                        color: white; font-size: 0.7rem; font-weight: 900;
                        padding: 2px 10px; border-radius: 4px;
                        box-shadow: 0 0 15px rgba(255,0,110,0.4);
                        letter-spacing: 1px;
                        border: 1px solid rgba(255,255,255,0.2);
                        text-transform: uppercase;
                    }
                `}</style>
            </div>
        </div>
    );
}

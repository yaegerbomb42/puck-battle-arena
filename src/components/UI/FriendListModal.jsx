import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { audio } from '../../utils/audio';

export default function FriendListModal({ onClose, invitePlayer, onProfileClick, onTradeInvite }) {
    const { user, inventory, followUser, unfollowUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [followingData, setFollowingData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('following'); // 'following' or 'search'

    // Sync followed users status via polling the SQLite backend
    useEffect(() => {
        if (!user || !inventory.following || inventory.following.length === 0) {
            setFollowingData([]);
            return;
        }

        const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
        const token = localStorage.getItem('pba_jwt_token');

        const fetchFriends = async () => {
            try {
                const res = await fetch(`${serverUrl}/api/user/friends`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ uids: inventory.following.slice(0, 10) })
                });
                if (res.ok) {
                    const data = await res.json();
                    setFollowingData(data.friends || []);
                }
            } catch (err) {
                console.error("Friend list sync error:", err);
            }
        };

        fetchFriends();
        
        // Lightweight 5-second polling interval while modal is open
        const interval = setInterval(fetchFriends, 5000);
        return () => clearInterval(interval);
    }, [user, inventory.following]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setLoading(true);
        audio.playClick();
        try {
            const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
            const token = localStorage.getItem('pba_jwt_token');

            const res = await fetch(`${serverUrl}/api/user/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (res.ok) {
                const data = await res.json();
                setSearchResults((data.results || []).filter(r => r.uid !== user.uid));
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFollow = async (targetUser) => {
        audio.playClick();
        const isFollowing = inventory.following.includes(targetUser.uid);
        if (isFollowing) {
            await unfollowUser(targetUser.uid);
        } else {
            await followUser(targetUser.uid);
        }
    };

    return (
        <div className="social-modal-overlay" onClick={onClose}>
            <div className="social-modal glass-dark" onClick={e => e.stopPropagation()}>
                <div className="social-header">
                    <div className="social-tabs">
                        <button 
                            className={`tab-btn ${activeTab === 'following' ? 'active' : ''}`}
                            onClick={() => { audio.playClick(); setActiveTab('following'); }}
                        >
                            Following ({followingData.length})
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                            onClick={() => { audio.playClick(); setActiveTab('search'); }}
                        >
                            Find Players
                        </button>
                    </div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="social-content">
                    {activeTab === 'search' && (
                        <div className="search-section">
                            <form onSubmit={handleSearch} className="search-bar">
                                <input 
                                    type="text" 
                                    placeholder="Search by username or email..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="glass-input"
                                />
                                <button type="submit" className="btn-search" disabled={loading}>
                                    {loading ? '...' : '🔍'}
                                </button>
                            </form>

                            <div className="results-list">
                                {searchResults.length === 0 && !loading && searchQuery && (
                                    <p className="empty-msg">No players found.</p>
                                )}
                                {searchResults.map(p => (
                                    <div key={p.uid} className="user-card">
                                        <div className="user-info">
                                            <span className="user-name">{p.username || 'Anonymous'}</span>
                                            <span className="user-email">{p.email}</span>
                                        </div>
                                        <button 
                                            className={`btn-follow ${inventory.following.includes(p.uid) ? 'following' : ''}`}
                                            onClick={() => toggleFollow(p)}
                                        >
                                            {inventory.following.includes(p.uid) ? 'Unfollow' : 'Follow'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'following' && (
                        <div className="following-section">
                            {followingData.length === 0 && (
                                <p className="empty-msg">You aren't following anyone yet. Go find some rivals!</p>
                            )}
                            <div className="friends-list">
                                {followingData.map(friend => (
                                    <div key={friend.uid} className="friend-card">
                                        <div className="status-indicator">
                                            <span className={`dot ${friend.onlineStatus || 'offline'}`} />
                                        </div>
                                        <div className="friend-info">
                                            <span 
                                                className="friend-name clickable"
                                                onClick={() => onProfileClick && onProfileClick(friend.uid)}
                                            >
                                                {friend.username || 'Anonymous'}
                                            </span>
                                            <span className="friend-status">{friend.onlineStatus === 'online' ? 'Online' : friend.onlineStatus === 'ingame' ? 'In Match' : 'Offline'}</span>
                                        </div>
                                        <div className="friend-actions">
                                            {friend.onlineStatus === 'online' && (
                                                <>
                                                    <button className="btn-invite" onClick={() => { audio.playClick(); invitePlayer(friend.uid); }}>
                                                        Invite
                                                    </button>
                                                    <button className="btn-trade" onClick={() => { audio.playClick(); onTradeInvite(friend.uid); }}>
                                                        Trade
                                                    </button>
                                                </>
                                            )}
                                            <button className="btn-unfollow" onClick={() => unfollowUser(friend.uid)}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .social-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center; z-index: 2000;
                    animation: fadeIn 0.2s ease;
                }
                .social-modal {
                    width: 450px; max-width: 90%; height: 600px;
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .social-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0 1.5rem; background: rgba(255,255,255,0.03);
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .social-tabs { display: flex; gap: 1rem; }
                .tab-btn {
                    padding: 1.5rem 0.5rem; background: none; border: none;
                    color: rgba(255,255,255,0.5); cursor: pointer; font-weight: 600;
                    position: relative; transition: 0.3s;
                }
                .tab-btn.active { color: #00d4ff; }
                .tab-btn.active::after {
                    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
                    height: 2px; background: #00d4ff; box-shadow: 0 0 10px #00d4ff;
                }
                .close-btn { 
                    background: none; border: none; color: white; opacity: 0.4; 
                    cursor: pointer; font-size: 1.2rem; 
                }
                .social-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
                
                .search-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
                .glass-input {
                    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 10px; padding: 0.8rem 1rem; color: white; outline: none;
                }
                .btn-search {
                    background: #00d4ff; border: none; border-radius: 10px;
                    padding: 0 1.2rem; cursor: pointer;
                }

                .user-card, .friend-card {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px; padding: 1rem; margin-bottom: 0.8rem;
                    display: flex; align-items: center; gap: 1rem;
                }

                .friend-info { flex: 1; display: flex; flex-direction: column; }
                .friend-name { font-weight: 700; color: #fff; }
                .friend-name.clickable { cursor: pointer; }
                .friend-name.clickable:hover { text-decoration: underline; color: #00d4ff; }
                .friend-status { font-size: 0.7rem; opacity: 0.6; }

                .status-indicator .dot {
                    width: 10px; height: 10px; border-radius: 50%; display: block;
                }
                .dot.online { background: #00ff87; box-shadow: 0 0 8px #00ff87; }
                .dot.ingame { background: #ff006e; box-shadow: 0 0 8px #ff006e; }
                .dot.offline { background: #555; }

                .friend-actions { display: flex; gap: 0.5rem; }
                .btn-invite {
                    background: rgba(0,212,255,0.15); border: 1px solid #00d4ff;
                    color: #00d4ff; border-radius: 6px; padding: 0.4rem 0.8rem;
                    font-size: 0.8rem; font-weight: 700; cursor: pointer;
                }
                .btn-unfollow {
                    background: none; border: none; color: #ff006e; 
                    cursor: pointer; font-size: 1rem; opacity: 0.4;
                }
                .btn-unfollow:hover { opacity: 1; }

                .btn-trade {
                    background: rgba(0,255,135,0.15); border: 1px solid #00ff87;
                    color: #00ff87; border-radius: 6px; padding: 0.4rem 0.8rem;
                    font-size: 0.8rem; font-weight: 700; cursor: pointer;
                }
                .btn-trade:hover { background: rgba(0,255,135,0.25); }

                .empty-msg { text-align: center; opacity: 0.4; margin-top: 3rem; font-style: italic; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}

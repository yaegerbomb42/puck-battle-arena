import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ADMIN_PASSWORD = 'Zawe1234!';

export default function AdminDashboard({ onClose, onTestMaintenance }) {
    const { user, resetIcons, addIcons } = useAuth();
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [metrics, setMetrics] = useState({ playersOnline: 0 });
    const [loading, setLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setAuthenticated(true);
            setError('');
            loadData();
        } else {
            setError('Incorrect password');
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3002';
            
            // Load users from SQLite backend
            try {
                const usersRes = await fetch(`${serverUrl}/api/admin/users`);
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData.users || []);
                }
            } catch (e) {
                console.error('Failed to load admin users:', e);
            }

            // Parallel fetch with 3s timeout to prevent "stuck" state
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            try {
                const [roomsRes, revenueRes] = await Promise.all([
                    fetch(`${serverUrl}/api/admin/rooms`, { signal: controller.signal }).catch(() => null),
                    fetch(`${serverUrl}/api/admin/revenue`, { signal: controller.signal }).catch(() => null)
                ]);

                if (roomsRes?.ok) {
                    const roomsData = await roomsRes.json();
                    setRooms(roomsData.rooms || []);
                    setMetrics(prev => ({
                        ...prev,
                        playersOnline: roomsData.playersOnline || 0,
                        totalTimePlayedSeconds: roomsData.totalTimePlayedSeconds || 0
                    }));
                }

                if (revenueRes?.ok) {
                    const revenueData = await revenueRes.json();
                    setMetrics(prev => ({
                        ...prev,
                        totalRevenue: revenueData.totalRevenue,
                        transactions: revenueData.transactions
                    }));
                }
            } catch (e) {
                console.log('Server metrics fetch timed out or failed');
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            console.error('Error loading admin data:', error);
        }
        setLoading(false);
    };

    const handleGrantPack = async (userId) => {
        // For the current user, open a pack
        if (userId === user?.uid) {
            // Grant 10 random icons
            const randomIcons = [];
            for (let i = 0; i < 3; i++) {
                randomIcons.push(Math.floor(Math.random() * 150) + 1);
            }
            await addIcons(randomIcons);
            alert(`Granted 3 random icons: ${randomIcons.join(', ')}`);
            loadData();
        } else {
            alert('Can only grant packs to yourself in admin mode');
        }
    };

    const handleResetIcons = async () => {
        if (window.confirm('Reset all your icons? This cannot be undone.')) {
            await resetIcons();
            alert('Icons reset successfully');
            loadData();
        }
    };

    const handleUnlockAll = async () => {
        if (!user) return;
        if (window.confirm('🐋 WHALE TEST: Unlock ALL 150 skins for your account?')) {
            setLoading(true);
            try {
                // Ensure IDs are strings as used in IconChooser if needed, 
                // but usually they are numbers. We'll grant numbers 1-150.
                const allIcons = Array.from({ length: 150 }, (_, i) => (i + 1));
                await addIcons(allIcons);
                alert('Success! All 150 skins unlocked. Restart game to see full collection.');
                loadData();
            } catch (err) {
                alert('Unlock failed: ' + err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    if (!authenticated) {
        return (
            <div className="admin-overlay" onClick={onClose}>
                <div className="admin-login" onClick={e => e.stopPropagation()}>
                    <h2>🔐 ADMIN LOGIN</h2>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            placeholder="Enter admin password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoFocus
                        />
                        {error && <div className="error">{error}</div>}
                        <button type="submit">LOGIN</button>
                    </form>
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                </div>
                <style jsx>{`
                    .admin-overlay {
                        position: fixed; inset: 0; background: rgba(0,0,0,0.9);
                        display: flex; align-items: center; justify-content: center;
                        z-index: 3000; font-family: 'Orbitron', sans-serif;
                    }
                    .admin-login {
                        background: #1a1a2e; padding: 2rem; border-radius: 20px;
                        text-align: center; border: 1px solid #333;
                    }
                    .admin-login h2 { color: #ff006e; margin-bottom: 1.5rem; }
                    .admin-login input {
                        padding: 12px; width: 100%; background: #0a0a1a;
                        border: 1px solid #333; color: white; border-radius: 8px;
                        margin-bottom: 1rem;
                    }
                    .admin-login button {
                        width: 100%; padding: 12px; background: #ff006e;
                        border: none; color: white; border-radius: 8px;
                        cursor: pointer; font-weight: bold;
                    }
                    .error { color: #ff006e; margin-bottom: 1rem; font-size: 0.85rem; }
                    .cancel-btn {
                        margin-top: 1rem; background: transparent !important;
                        border: 1px solid #333 !important; color: #888 !important;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="admin-overlay" onClick={onClose}>
            <div className="admin-dashboard" onClick={e => e.stopPropagation()}>
                <div className="admin-header">
                    <h2>⚙️ ADMIN DASHBOARD</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="admin-tabs">
                    <button
                        className={activeTab === 'users' ? 'active' : ''}
                        onClick={() => setActiveTab('users')}
                    >👥 Users</button>
                    <button
                        className={activeTab === 'rooms' ? 'active' : ''}
                        onClick={() => setActiveTab('rooms')}
                    >🏠 Rooms</button>
                    <button
                        className={activeTab === 'metrics' ? 'active' : ''}
                        onClick={() => setActiveTab('metrics')}
                    >📊 Metrics</button>
                    <button
                        className={activeTab === 'revenue' ? 'active' : ''}
                        onClick={() => setActiveTab('revenue')}
                    >💰 Revenue</button>
                    <button
                        className={activeTab === 'store_links' ? 'active' : ''}
                        onClick={() => setActiveTab('store_links')}
                    >🛒 Links</button>
                    <button
                        className={activeTab === 'tools' ? 'active' : ''}
                        onClick={() => setActiveTab('tools')}
                    >🛠️ Tools</button>
                </div>

                <div className="admin-content">
                    {loading && <div className="loading">Loading...</div>}

                    {activeTab === 'users' && (
                        <div className="users-tab">
                            <div className="section-header">
                                <span>Registered Users ({users.length})</span>
                                <button onClick={loadData}>🔄 Refresh</button>
                            </div>
                            <div className="users-list">
                                {users.map(u => (
                                    <div key={u.id} className="user-row">
                                        <div className="user-info">
                                            <div className="user-email">{u.email || 'No email'}</div>
                                            <div className="user-stats">
                                                Icons: {u.icons?.length || 0} |
                                                Packs: {u.freePacks || 0}
                                            </div>
                                        </div>
                                        <div className="user-actions">
                                            {u.id === user?.uid && (
                                                <button onClick={() => handleGrantPack(u.id)}>
                                                    🎁 Grant Pack
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {users.length === 0 && <div className="empty">No users found</div>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'rooms' && (
                        <div className="rooms-tab">
                            <div className="section-header">
                                <span>Active Rooms ({rooms.length})</span>
                                <button onClick={loadData}>🔄 Refresh</button>
                            </div>
                            <div className="rooms-list">
                                {rooms.map(room => (
                                    <div key={room.code} className="room-row">
                                        <div className="room-code">{room.code}</div>
                                        <div className="room-players">{room.playerCount} players</div>
                                        <div className="room-status">{room.status}</div>
                                    </div>
                                ))}
                                {rooms.length === 0 && <div className="empty">No active rooms</div>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'metrics' && (
                        <div className="metrics-tab">
                            <div className="metric-card">
                                <div className="metric-value">{metrics.playersOnline}</div>
                                <div className="metric-label">Players Online</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{rooms.length}</div>
                                <div className="metric-label">Active Rooms</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-value">{users.length}</div>
                                <div className="metric-label">Total Users</div>
                            </div>
                            {/* NEW: Total Time Played */}
                            <div className="metric-card extended">
                                <div className="metric-value" style={{ fontSize: '2rem' }}>
                                    {Math.floor((metrics.totalTimePlayedSeconds || 0) / 3600)}h {Math.floor(((metrics.totalTimePlayedSeconds || 0) % 3600) / 60)}m
                                </div>
                                <div className="metric-label">Total Playtime (Global)</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'revenue' && (
                        <div className="revenue-tab">
                            <div className="section-header">
                                <span>Real Revenue (Stripe)</span>
                                <button onClick={loadData}>🔄 Refresh</button>
                            </div>
                            <div className="revenue-cards">
                                <div className="metric-card money">
                                    <div className="metric-value">
                                        ${metrics.totalRevenue || '0.00'}
                                    </div>
                                    <div className="metric-label">Total Earnings</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-value">
                                        {metrics.transactions?.length || 0}
                                    </div>
                                    <div className="metric-label">Transactions</div>
                                </div>
                            </div>

                            <div className="transactions-list">
                                <h4>Recent Transactions</h4>
                                {metrics.transactions?.slice(0, 10).map(tx => (
                                    <div key={tx.id} className="tx-row">
                                        <span className="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
                                        <span className="tx-email">{tx.email}</span>
                                        <span className="tx-item">{tx.packType}</span>
                                        <span className="tx-amount">+${(tx.amount / 100).toFixed(2)}</span>
                                    </div>
                                ))}
                                {(!metrics.transactions || metrics.transactions.length === 0) && (
                                    <div className="empty">No real transactions recorded yet.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'store_links' && (
                        <div className="store-links-tab">
                            <h3>🛒 Store Testing Links (Stripe)</h3>
                            <div className="link-list">
                                <div className="link-row">
                                    <span className="link-label">Single Pack ($0.50)</span>
                                    <input type="text" readOnly value="https://buy.stripe.com/5kQeV577v6FsgIZ0m1aIM07" />
                                    <button onClick={() => window.open("https://buy.stripe.com/5kQeV577v6FsgIZ0m1aIM07")}>Test</button>
                                </div>
                                <div className="link-row">
                                    <span className="link-label">10-Pack Bundle ($3.00)</span>
                                    <input type="text" readOnly value="https://buy.stripe.com/3cIbIT0J78NAgIZ0m1aIM06" />
                                    <button onClick={() => window.open("https://buy.stripe.com/3cIbIT0J78NAgIZ0m1aIM06")}>Test</button>
                                </div>
                                <div className="link-row">
                                    <span className="link-label">Unlock All ($99.99)</span>
                                    <input type="text" readOnly value="https://buy.stripe.com/6oU4grcrPgg29gx0m1aIM08" />
                                    <button onClick={() => window.open("https://buy.stripe.com/6oU4grcrPgg29gx0m1aIM08")}>Test</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tools' && (
                        <div className="tools-tab">
                            <h3>Admin Tools</h3>
                            <p>Logged in as: {user?.email || 'Not logged in'}</p>

                            <div className="tool-buttons">
                                <button className="tool-btn grant" onClick={() => handleGrantPack(user?.uid)}>
                                    🎁 Grant Yourself 3 Icons
                                </button>
                                <button className="tool-btn whale" onClick={handleUnlockAll}>
                                    🐋 Unlock ALL Skins
                                </button>
                                <button className="tool-btn reset" onClick={handleResetIcons}>
                                    🗑️ Reset Your Icons
                                </button>
                                <button className="tool-btn test-maint" onClick={() => {
                                    if (window.confirm('Trigger local maintenance warning? (Persists on refresh)')) {
                                        onTestMaintenance && onTestMaintenance();
                                        alert('Maintenance warning triggered! Refresh page to test persistence.');
                                    }
                                }}>
                                    ⚠️ Test Maintenance
                                </button>
                            </div>

                            <div className="tool-info">
                                <p>• Grant Pack: Adds 3 random icons to your account</p>
                                <p>• Unlock ALL: Instantly grants 1-150 icons (Whale Status)</p>
                                <p>• Reset Icons: Clears all your icons for testing</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .admin-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.95);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 3000; font-family: 'Orbitron', sans-serif;
                }
                .admin-dashboard {
                    background: linear-gradient(135deg, #1a0a2e, #0a1a2e);
                    border: 1px solid #ff006e; border-radius: 20px;
                    width: 95%; max-width: 800px; max-height: 85vh;
                    overflow: hidden; display: flex; flex-direction: column;
                }
                .admin-header {
                    padding: 1.5rem; display: flex; justify-content: space-between;
                    align-items: center; border-bottom: 1px solid #333;
                }
                .admin-header h2 { color: #ff006e; margin: 0; }
                .close-btn {
                    background: none; border: none; color: #888;
                    font-size: 1.5rem; cursor: pointer;
                }

                .admin-tabs {
                    display: flex; border-bottom: 1px solid #333;
                }
                .admin-tabs button {
                    flex: 1; padding: 1rem; background: transparent;
                    border: none; color: #888; cursor: pointer;
                    transition: 0.3s;
                }
                .admin-tabs button:hover { background: rgba(255,0,110,0.1); }
                .admin-tabs button.active { 
                    color: #ff006e; background: rgba(255,0,110,0.1);
                    border-bottom: 2px solid #ff006e;
                }

                .admin-content {
                    flex: 1; overflow-y: auto; padding: 1.5rem;
                }

                .section-header {
                    display: flex; justify-content: space-between;
                    align-items: center; margin-bottom: 1rem;
                }
                .section-header button {
                    padding: 0.5rem 1rem; background: rgba(255,255,255,0.1);
                    border: 1px solid #333; border-radius: 8px;
                    color: white; cursor: pointer;
                }

                .users-list, .rooms-list {
                    display: flex; flex-direction: column; gap: 0.5rem;
                }
                .user-row, .room-row {
                    display: flex; justify-content: space-between;
                    align-items: center; padding: 1rem;
                    background: rgba(0,0,0,0.3); border-radius: 10px;
                }
                .user-email { font-weight: bold; }
                .user-stats { font-size: 0.8rem; color: #888; margin-top: 0.3rem; }
                .user-actions button {
                    padding: 0.4rem 0.8rem; background: #00d4ff;
                    border: none; border-radius: 5px; cursor: pointer;
                    font-size: 0.8rem;
                }

                .room-code { font-weight: bold; color: #00d4ff; }
                .room-players { color: #888; }
                .room-status { 
                    padding: 0.3rem 0.8rem; background: #00ff87;
                    color: #000; border-radius: 10px; font-size: 0.8rem;
                }

                .metrics-tab {
                    display: grid; grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }
                .metric-card {
                    background: rgba(0,0,0,0.3); padding: 2rem;
                    border-radius: 15px; text-align: center;
                }
                .metric-value { font-size: 3rem; font-weight: bold; color: #00d4ff; }
                .metric-label { color: #888; margin-top: 0.5rem; }

                .tools-tab { text-align: center; }
                .tools-tab h3 { color: #ff006e; }
                .tools-tab p { color: #888; margin-bottom: 1rem; }
                .tool-buttons {
                    display: flex; gap: 1rem; justify-content: center;
                    margin: 2rem 0;
                }

                /* Revenue Tab */
                .revenue-cards { display: flex; gap: 1rem; justify-content: center; margin-top: 1rem; margin-bottom: 2rem; }
                .metric-card.money .metric-value { color: #00ff87; }
                
                .transactions-list h4 { margin-bottom: 0.5rem; color: #888; }
                .tx-row {
                    display: flex; justify-content: space-between; padding: 0.8rem;
                    background: rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);
                    font-size: 0.9rem;
                }
                .tx-row:first-of-type { border-top-left-radius: 10px; border-top-right-radius: 10px; }
                .tx-row:last-of-type { border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; border-bottom: none; }
                .tx-date { color: #666; width: 80px; }
                .tx-email { flex: 1; text-align: left; padding-left: 1rem; color: #aaa; }
                .tx-item { color: #e0e0e0; margin-right: 1rem; }
                .tx-amount { color: #00ff87; font-weight: bold; width: 60px; text-align: right; }

                /* Links Tab */
                .link-list { display: flex; flex-direction: column; gap: 1rem; }
                .link-row { 
                    display: flex; gap: 1rem; align-items: center; 
                    background: rgba(255,255,255,0.05); padding: 1rem;
                    border-radius: 10px;
                }
                .link-label { width: 150px; font-weight: bold; color: #00d4ff; }
                .link-row input { 
                    flex: 1; background: #000; border: 1px solid #444; 
                    color: #888; padding: 0.5rem; border-radius: 5px;
                }
                .link-row button {
                    padding: 0.5rem 1rem; background: #ff006e; border: none;
                    color: white; border-radius: 5px; cursor: pointer;
                }

                .tool-btn {
                    padding: 1rem 2rem; border: none; border-radius: 10px;
                    cursor: pointer; font-weight: bold; font-size: 1rem;
                }
                .tool-btn.grant { background: #00ff87; color: #000; }
                .tool-btn.whale { background: #ffd700; color: #000; }
                .tool-btn.reset { background: #ff006e; color: #fff; }
                .tool-btn.test-maint { background: #ff4d4d; color: #fff; border: 2px solid #fff; }
                .tool-info {
                    background: rgba(0,0,0,0.3); padding: 1rem;
                    border-radius: 10px; text-align: left;
                }
                .tool-info p { color: #666; font-size: 0.85rem; margin: 0.3rem 0; }

                .empty { color: #555; text-align: center; padding: 2rem; }
                .loading { text-align: center; color: #888; padding: 2rem; }
            `}</style>
        </div>
    );
}

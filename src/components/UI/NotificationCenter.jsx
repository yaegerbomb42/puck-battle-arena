import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { audio } from '../../utils/audio';

export default function NotificationCenter({ onClose, onJoinRoom }) {
    const { notifications, markNotificationRead, deleteNotification, clearNotifications } = useAuth();
    
    const friendInvites = notifications.filter(n => n.type === 'invite');
    const others = notifications.filter(n => n.type !== 'invite');

    const handleAccept = (notification) => {
        audio.playClick();
        if (notification.data?.roomCode) {
            onJoinRoom(notification.data.roomCode);
            markNotificationRead(notification.id);
            onClose();
        }
    };

    return (
        <div className="notification-panel-overlay" onClick={onClose}>
            <div className="notification-panel glass-dark" onClick={e => e.stopPropagation()}>
                <div className="notify-header">
                    <h2>🔔 Notifications</h2>
                    <div className="header-actions">
                        <button className="btn-clear" onClick={clearNotifications}>Clear All</button>
                        <button className="btn-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="notify-content">
                    {notifications.length === 0 ? (
                        <div className="empty-notify">
                            <div className="empty-icon">📭</div>
                            <p>All caught up! No new notifications.</p>
                        </div>
                    ) : (
                        <>
                            {friendInvites.length > 0 && (
                                <div className="notify-section">
                                    <h3>Match Invites</h3>
                                    {friendInvites.map(n => (
                                        <div key={n.id} className={`notify-card invite ${n.read ? 'read' : 'unread'}`}>
                                            <div className="notify-main">
                                                <div className="notify-icon">🕹️</div>
                                                <div className="notify-text">
                                                    <strong>{n.fromName}</strong> invited you to a match!
                                                    <span className="notify-time">{new Date(n.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                            <div className="notify-actions">
                                                <button className="btn-accept" onClick={() => handleAccept(n)}>Accept</button>
                                                <button className="btn-decline" onClick={() => deleteNotification(n.id)}>Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {others.length > 0 && (
                                <div className="notify-section">
                                    <h3>Activities</h3>
                                    {others.map(n => (
                                        <div key={n.id} className={`notify-card ${n.read ? 'read' : 'unread'}`} onClick={() => markNotificationRead(n.id)}>
                                            <div className="notify-icon">
                                                {n.type === 'reward' ? '🎁' : '📢'}
                                            </div>
                                            <div className="notify-text">
                                                <p>{n.data?.message || 'System Notification'}</p>
                                                <span className="notify-time">{new Date(n.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
                                            </div>
                                            <button className="btn-remove" onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <style>{`
                .notification-panel-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.4); z-index: 3000;
                    display: flex; justify-content: flex-end;
                    animation: fadeIn 0.2s ease;
                }
                .notification-panel {
                    width: 400px; height: 100%;
                    border-left: 1px solid rgba(255,255,255,0.1);
                    display: flex; flex-direction: column;
                    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .notify-header {
                    padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);
                    display: flex; justify-content: space-between; align-items: center;
                    background: rgba(0,212,255,0.05);
                }
                .notify-header h2 { margin: 0; font-size: 1.2rem; }
                .header-actions { display: flex; gap: 1rem; align-items: center; }
                .btn-clear { 
                    background: none; border: none; color: #00d4ff; font-size: 0.8rem; 
                    cursor: pointer; opacity: 0.7; 
                }
                .btn-clear:hover { opacity: 1; text-decoration: underline; }
                .btn-close { background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; opacity: 0.5; }

                .notify-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
                .notify-section h3 { 
                    font-size: 0.8rem; text-transform: uppercase; color: rgba(255,255,255,0.4); 
                    margin: 1.5rem 0 1rem; letter-spacing: 1px;
                }
                .notify-section:first-child h3 { margin-top: 0; }

                .notify-card {
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 12px; padding: 1rem; margin-bottom: 1rem;
                    position: relative; transition: 0.2s;
                }
                .notify-card:hover { background: rgba(255,255,255,0.06); }
                .notify-card.unread { border-left: 3px solid #00d4ff; }
                
                .notify-main { display: flex; gap: 1rem; align-items: flex-start; }
                .notify-icon { font-size: 1.5rem; }
                .notify-text { flex: 1; font-size: 0.95rem; line-height: 1.4; }
                .notify-time { display: block; font-size: 0.75rem; opacity: 0.4; margin-top: 0.3rem; }

                .notify-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
                .btn-accept {
                    flex: 1; background: #00d4ff; border: none; border-radius: 8px;
                    padding: 0.6rem; color: #000; font-weight: 700; cursor: pointer;
                    transition: 0.2s;
                }
                .btn-accept:hover { transform: scale(1.02); filter: brightness(1.1); }
                .btn-decline {
                    flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px; padding: 0.6rem; color: white; cursor: pointer;
                }

                .btn-remove { 
                    position: absolute; top: 0.5rem; right: 0.5rem;
                    background: none; border: none; color: white; opacity: 0.2;
                    cursor: pointer; font-size: 0.8rem;
                }
                .btn-remove:hover { opacity: 0.8; }

                .empty-notify { 
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 100%; opacity: 0.3; text-align: center;
                }
                .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    );
}

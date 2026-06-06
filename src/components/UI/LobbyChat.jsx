import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../../utils/audio';
import { getLevelFromXp, getLevelProgress, getRankName, getRankFromRP } from '../../utils/leveling';

export default function LobbyChat({ user, inventory, chatMessages, sendChatMessage, onProfileClick }) {
    const [message, setMessage] = useState('');
    const [isOpen, setIsOpen] = useState(true);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isOpen]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!message || message.trim() === '') return;

        const username = inventory?.username || user?.displayName || 'Player';
        const skinTier = parseInt(inventory?.loadouts?.[inventory?.activeLoadout || 0]?.[0]?.tier || '0');

        sendChatMessage(username, message, skinTier, user?.uid);
        setMessage('');
        audio.playClick();
    };

    if (!isOpen) {
        return (
            <button className="chat-toggle-btn glass-dark" onClick={() => { setIsOpen(true); audio.playClick(); }}>
                💬 Chat 
                {chatMessages.length > 0 && <span className="chat-badge">{chatMessages.length}</span>}
            </button>
        );
    }

    return (
        <div className="lobby-chat-container glass-dark">
            <div className="chat-header">
                <h3>Global Chat</h3>
                <button className="btn-close-chat" onClick={() => { setIsOpen(false); audio.playClick(); }}>—</button>
            </div>
            
            <div className="chat-messages custom-scrollbar">
                {chatMessages.length === 0 ? (
                    <div className="chat-empty">No messages yet. Say hello! 👋</div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={msg.id || idx} className={`chat-msg ${msg.username === (inventory?.username || user?.displayName) ? 'msg-self' : ''}`}>
                            <span 
                                className={`msg-user tier-${msg.skinTier} ${msg.uid ? 'clickable' : ''}`}
                                onClick={() => msg.uid && onProfileClick && onProfileClick(msg.uid)}
                            >
                                {msg.username}:
                            </span>
                            <span className="msg-text">{msg.message}</span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
                <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={150}
                />
                <button type="submit" disabled={!message.trim()}>►</button>
            </form>

            <style>{`
                .chat-toggle-btn {
                    position: absolute;
                    bottom: 2rem;
                    left: 2rem;
                    padding: 0.8rem 1.5rem;
                    border-radius: 20px;
                    border: 1px solid rgba(0,212,255,0.4);
                    color: white;
                    font-weight: 700;
                    cursor: pointer;
                    z-index: 1000;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(10, 15, 30, 0.8);
                }
                .chat-toggle-btn:hover {
                    box-shadow: 0 0 15px rgba(0,212,255,0.4);
                    transform: translateY(-2px);
                }
                .chat-badge {
                    background: #ff006e;
                    color: white;
                    font-size: 0.7rem;
                    padding: 0.2rem 0.5rem;
                    border-radius: 10px;
                }

                .lobby-chat-container {
                    position: absolute;
                    bottom: 2rem;
                    left: 2rem;
                    width: 320px;
                    height: 400px;
                    display: flex;
                    flex-direction: column;
                    border-radius: 12px;
                    border: 1px solid rgba(0,212,255,0.3);
                    background: rgba(10, 15, 30, 0.85);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
                    z-index: 1000;
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                }

                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.8rem 1rem;
                    background: rgba(0,212,255,0.1);
                    border-bottom: 1px solid rgba(0,212,255,0.2);
                }
                .chat-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    color: #00d4ff;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .btn-close-chat {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1.2rem;
                    opacity: 0.7;
                    transition: 0.2s;
                }
                .btn-close-chat:hover { opacity: 1; color: #ff006e; }

                .chat-messages {
                    flex: 1;
                    padding: 1rem;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .chat-empty {
                    color: rgba(255,255,255,0.4);
                    text-align: center;
                    margin-top: 2rem;
                    font-style: italic;
                }
                .chat-msg {
                    background: rgba(0,0,0,0.4);
                    padding: 0.6rem 0.8rem;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    word-wrap: break-word;
                    line-height: 1.4;
                }
                .msg-self {
                    background: rgba(0,212,255,0.1);
                    border-left: 2px solid #00d4ff;
                }
                .msg-user {
                    font-weight: 700;
                    margin-right: 0.5rem;
                }
                .msg-user.clickable {
                    cursor: pointer;
                }
                .msg-user.clickable:hover {
                    text-decoration: underline;
                }
                .msg-text {
                    color: #ddd;
                }

                /* Tier Colors */
                .tier-0, .tier-1, .tier-2 { color: #a1a1a1; }
                .tier-3 { color: #00d4ff; }
                .tier-4 { color: #8a2be2; text-shadow: 0 0 5px rgba(138,43,226,0.5); }
                .tier-5, .tier-6, .tier-7 { color: #ff006e; text-shadow: 0 0 8px rgba(255,0,110,0.6); }

                .chat-input-area {
                    display: flex;
                    padding: 0.8rem;
                    background: rgba(0,0,0,0.5);
                    border-top: 1px solid rgba(0,212,255,0.2);
                    gap: 0.5rem;
                }
                .chat-input-area input {
                    flex: 1;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 6px;
                    padding: 0.5rem 0.8rem;
                    color: white;
                    font-family: inherit;
                    outline: none;
                    transition: 0.2s;
                }
                .chat-input-area input:focus {
                    background: rgba(255,255,255,0.15);
                    border-color: #00d4ff;
                    box-shadow: 0 0 10px rgba(0,212,255,0.2);
                }
                .chat-input-area button {
                    background: #00d4ff;
                    color: #000;
                    border: none;
                    border-radius: 6px;
                    padding: 0 1rem;
                    font-weight: 900;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .chat-input-area button:hover:not(:disabled) {
                    background: #fff;
                    box-shadow: 0 0 15px #00d4ff;
                }
                .chat-input-area button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    background: #555;
                }

                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3); border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,212,255,0.5); }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

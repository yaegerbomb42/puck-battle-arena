import React, { useEffect, useState } from 'react';

export default function MaintenanceOverlay({ message }) {
    const [timeLeft, setTimeLeft] = useState(message?.duration ? message.duration * 60 : 0);

    useEffect(() => {
        if (!message || !message.duration) return;

        // Reset timer when message changes
        setTimeLeft(message.duration * 60);

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [message]);

    if (!message) return null;

    // Formatting MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const isCritical = timeLeft < 60; // Red alert last minute

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Allow clicking through
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            paddingTop: '5vh'
        }}>
            {/* Top Bar Banner */}
            <div style={{
                background: isCritical
                    ? 'rgba(255, 0, 0, 0.4)'
                    : 'rgba(255, 165, 0, 0.4)',
                color: '#fff',
                padding: '0.5rem 2rem',
                borderRadius: '0 0 10px 10px',
                textAlign: 'center',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.4)',
                transform: 'translateY(0)',
                transition: 'all 0.5s ease',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderTop: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        ⚠️ SERVER RESTART IN:
                    </h2>
                    <div style={{
                        fontSize: '1.2rem',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        color: isCritical ? '#ffcccc' : '#fff'
                    }}>
                        {timeString}
                    </div>
                </div>
                <p style={{ margin: '0', opacity: 0.8, fontSize: '0.75rem', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1rem' }}>
                    Please finish your match.
                </p>
            </div>

            {/* Screen border effect removed for minimal styling */}
        </div>
    );
}

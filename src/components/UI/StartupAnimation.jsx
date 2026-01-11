import React, { useState, useEffect, memo } from 'react';

/**
 * PUCK OFF Startup Animation - OPTIMIZED
 * GPU-accelerated with matching game color scheme
 */
const StartupAnimation = memo(function StartupAnimation({ onComplete }) {
    const [phase, setPhase] = useState(0); // 0=intro, 1=collision, 2=knockoff, 3=fadeout

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase(1), 200),    // F starts sliding
            setTimeout(() => setPhase(2), 900),    // Impact + O flies
            setTimeout(() => setPhase(3), 2200),   // Fade out
            setTimeout(() => onComplete?.(), 3000) // Complete
        ];
        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    if (phase > 3) return null;

    return (
        <div className={`startup-overlay phase-${phase}`}>
            <div className="logo-wrap">
                <span className="word-puck">PUCK</span>
                <span className="word-off">
                    <span className="letter-o">O</span>
                    <span className="letter-f1">F</span>
                    <span className="letter-f2">F</span>
                </span>
            </div>

            <div className="tagline">KNOCK 'EM OUT</div>

            {/* Simple impact flash */}
            {phase === 2 && <div className="impact-flash" />}

            <style>{`
                .startup-overlay {
                    position: fixed;
                    inset: 0;
                    background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    font-family: 'Orbitron', 'Impact', sans-serif;
                    overflow: hidden;
                    will-change: opacity;
                }
                .startup-overlay.phase-3 {
                    animation: fadeOut 0.8s ease-out forwards;
                }

                .logo-wrap {
                    display: flex;
                    gap: 0.15em;
                    font-size: clamp(3rem, 12vw, 8rem);
                    font-weight: 900;
                    text-transform: uppercase;
                    will-change: transform;
                }

                .word-puck {
                    background: linear-gradient(180deg, #00d4ff 0%, #0099dd 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    filter: drop-shadow(0 0 20px rgba(0,212,255,0.6));
                }

                .word-off {
                    display: flex;
                    color: #ff006e;
                    filter: drop-shadow(0 0 15px rgba(255,0,110,0.5));
                }

                .letter-o, .letter-f1, .letter-f2 {
                    display: inline-block;
                    will-change: transform, opacity;
                }

                /* F1 slides in from right */
                .letter-f1 {
                    transform: translate3d(150px, 0, 0);
                    opacity: 0;
                }
                .phase-1 .letter-f1,
                .phase-2 .letter-f1,
                .phase-3 .letter-f1 {
                    animation: slideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                }

                /* O gets knocked out */
                .phase-2 .letter-o,
                .phase-3 .letter-o {
                    animation: knockOut 0.8s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
                }

                /* Impact shake on F */
                .phase-2 .letter-f1 {
                    animation: slideIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards,
                               impactShake 0.15s ease-out 0.05s;
                }

                @keyframes slideIn {
                    0% { transform: translate3d(150px, 0, 0) rotate(-10deg); opacity: 0; }
                    60% { transform: translate3d(-8px, 0, 0) rotate(3deg); opacity: 1; }
                    100% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 1; }
                }

                @keyframes knockOut {
                    0% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); opacity: 1; }
                    15% { transform: translate3d(-15px, -20px, 0) rotate(-15deg) scale(1.1); }
                    100% { transform: translate3d(-300px, -500px, 0) rotate(-120deg) scale(0.4); opacity: 0; }
                }

                @keyframes impactShake {
                    0%, 100% { transform: translate3d(0, 0, 0); }
                    25% { transform: translate3d(-4px, 0, 0); }
                    75% { transform: translate3d(4px, 0, 0); }
                }

                @keyframes fadeOut {
                    to { opacity: 0; visibility: hidden; }
                }

                /* Impact flash */
                .impact-flash {
                    position: absolute;
                    top: 50%; left: 50%;
                    width: 200px; height: 200px;
                    margin: -100px 0 0 -100px;
                    background: radial-gradient(circle, rgba(255,0,110,0.8) 0%, transparent 70%);
                    border-radius: 50%;
                    animation: flashPulse 0.4s ease-out forwards;
                    pointer-events: none;
                    will-change: transform, opacity;
                }
                @keyframes flashPulse {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }

                /* Tagline */
                .tagline {
                    margin-top: 1.5rem;
                    font-size: clamp(0.8rem, 3vw, 1.5rem);
                    color: #666;
                    letter-spacing: 0.4em;
                    opacity: 0;
                    transform: translate3d(0, 15px, 0);
                    will-change: transform, opacity;
                }
                .phase-2 .tagline,
                .phase-3 .tagline {
                    animation: taglineIn 0.5s ease-out 0.3s forwards;
                }
                @keyframes taglineIn {
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
            `}</style>
        </div>
    );
});

export default StartupAnimation;

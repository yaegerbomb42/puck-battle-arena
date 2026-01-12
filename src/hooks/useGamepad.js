import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useGamepad - Hook for Xbox/PS4 controller support via Gamepad API
 * 
 * Optimized for Xbox Edge browser:
 * - Polls inside animation frame for efficiency
 * - Supports fullscreen/pointer lock for reduced latency
 * 
 * Button Mapping (Standard Gamepad):
 * - A (button 0): Jump
 * - B (button 1): Dash
 * - X (button 2): Use Item
 * - Y (button 3): Toggle Fullscreen
 * - Left Stick: Movement
 * - Right Stick: Aim (future)
 * - LT/RT: Boost
 * - Start (button 9): Pause
 */

const DEADZONE = 0.15;

export default function useGamepad() {
    const [connected, setConnected] = useState(false);
    const [gamepadIndex, setGamepadIndex] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Cached input state for RAF polling
    const inputState = useRef({
        moveX: 0,
        moveY: 0,
        aimX: 0,
        aimY: 0,
        jump: false,
        dash: false,
        useItem: false,
        boost: false,
        pause: false,
        toggleFullscreen: false
    });

    // Previous button states for edge detection
    const prevButtonState = useRef({});

    // Handle gamepad connection
    useEffect(() => {
        const handleConnect = (e) => {
            console.log('🎮 Gamepad connected:', e.gamepad.id);
            setGamepadIndex(e.gamepad.index);
            setConnected(true);
        };

        const handleDisconnect = (e) => {
            console.log('🎮 Gamepad disconnected');
            if (e.gamepad.index === gamepadIndex) {
                setGamepadIndex(null);
                setConnected(false);
            }
        };

        window.addEventListener('gamepadconnected', handleConnect);
        window.addEventListener('gamepaddisconnected', handleDisconnect);

        // Check for already connected gamepads
        const gamepads = navigator.getGamepads?.() || [];
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                setGamepadIndex(i);
                setConnected(true);
                break;
            }
        }

        return () => {
            window.removeEventListener('gamepadconnected', handleConnect);
            window.removeEventListener('gamepaddisconnected', handleDisconnect);
        };
    }, [gamepadIndex]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Toggle fullscreen mode (reduces input latency on Xbox Edge)
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                // Also request pointer lock for even lower latency
                document.body.requestPointerLock?.();
            } else {
                await document.exitFullscreen();
                document.exitPointerLock?.();
            }
        } catch (err) {
            console.warn('Fullscreen toggle failed:', err);
        }
    }, []);

    // Poll gamepad state - call this in useFrame/requestAnimationFrame
    const poll = useCallback(() => {
        if (gamepadIndex === null) return inputState.current;

        const gamepads = navigator.getGamepads?.();
        const gamepad = gamepads?.[gamepadIndex];

        if (!gamepad) return inputState.current;

        // Left Stick (movement) with deadzone
        const lx = Math.abs(gamepad.axes[0]) > DEADZONE ? gamepad.axes[0] : 0;
        const ly = Math.abs(gamepad.axes[1]) > DEADZONE ? gamepad.axes[1] : 0;

        // Right Stick (aim) with deadzone
        const rx = Math.abs(gamepad.axes[2]) > DEADZONE ? gamepad.axes[2] : 0;
        const ry = Math.abs(gamepad.axes[3]) > DEADZONE ? gamepad.axes[3] : 0;

        // Buttons (standard mapping)
        // 0=A, 1=B, 2=X, 3=Y, 4=LB, 5=RB, 6=LT, 7=RT, 8=Back, 9=Start
        const buttons = {
            a: gamepad.buttons[0]?.pressed || false,
            b: gamepad.buttons[1]?.pressed || false,
            x: gamepad.buttons[2]?.pressed || false,
            y: gamepad.buttons[3]?.pressed || false,
            lb: gamepad.buttons[4]?.pressed || false,
            rb: gamepad.buttons[5]?.pressed || false,
            lt: gamepad.buttons[6]?.value > 0.5,
            rt: gamepad.buttons[7]?.value > 0.5,
            back: gamepad.buttons[8]?.pressed || false,
            start: gamepad.buttons[9]?.pressed || false
        };

        // Edge detection for Y button (fullscreen toggle)
        const yJustPressed = buttons.y && !prevButtonState.current.y;
        if (yJustPressed) {
            toggleFullscreen();
        }

        // Update previous state for edge detection
        prevButtonState.current = { ...buttons };

        inputState.current = {
            moveX: lx,
            moveY: ly,
            aimX: rx,
            aimY: ry,
            jump: buttons.a,
            dash: buttons.b,
            useItem: buttons.x,
            boost: buttons.lt || buttons.rt,
            pause: buttons.start,
            toggleFullscreen: yJustPressed
        };

        return inputState.current;
    }, [gamepadIndex, toggleFullscreen]);

    // Vibration feedback (if supported)
    const vibrate = useCallback((duration = 200, weakMagnitude = 0.5, strongMagnitude = 0.5) => {
        if (gamepadIndex === null) return;

        const gamepads = navigator.getGamepads?.();
        const gamepad = gamepads?.[gamepadIndex];

        if (gamepad?.vibrationActuator) {
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration,
                weakMagnitude,
                strongMagnitude
            }).catch(() => { }); // Silently fail if not supported
        }
    }, [gamepadIndex]);

    return {
        connected,
        isFullscreen,
        poll,
        vibrate,
        toggleFullscreen,
        inputState: inputState.current
    };
}

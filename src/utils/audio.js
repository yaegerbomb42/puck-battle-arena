/**
 * puckOFF Synthetic Audio System
 * Uses Web Audio API to generate "neon-tech" sounds procedurally.
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.enabled = false;
        this.initialized = false;
        this.muted = false;
        this.ambientOsc = null;
        this.ambientGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.5;

            // Separate music and SFX channels
            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = 0.3;

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = 0.7;

            this.initialized = true;
            this.enabled = true;
            console.log("Audio System Initialized");
        } catch (e) {
            console.error("Audio API not supported", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- VOLUME CONTROLS ---

    setMasterVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    setMusicVolume(value) {
        if (this.musicGain) {
            this.musicGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    setSfxVolume(value) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        return this.muted;
    }

    // --- AMBIENT AUDIO ---

    startAmbient() {
        if (!this.enabled || !this.ctx || this.ambientOsc) return;
        this.resume();

        // Create a droning ambient pad
        this.ambientOsc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        this.ambientGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Base drone
        this.ambientOsc.type = 'sine';
        this.ambientOsc.frequency.value = 55; // Low A
        osc2.type = 'triangle';
        osc2.frequency.value = 82.41; // Low E (perfect fifth)

        // LFO for subtle movement
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        lfoGain.gain.value = 5;

        // Filter for warmth
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;

        // Connect LFO to filter frequency
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        // Connect oscillators
        this.ambientOsc.connect(filter);
        osc2.connect(filter);
        filter.connect(this.ambientGain);
        this.ambientGain.connect(this.musicGain);
        this.ambientGain.gain.value = 0.15;

        this.ambientOsc.start();
        osc2.start();
        lfo.start();
    }

    stopAmbient() {
        if (this.ambientOsc) {
            this.ambientOsc.stop();
            this.ambientOsc = null;
        }
        if (this.ambientGain) {
            this.ambientGain.disconnect();
            this.ambientGain = null;
        }
    }

    // --- SPATIAL AUDIO ---

    playPositional(x, z, intensity = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        // Calculate pan from x position (-1 to 1)
        const pan = Math.max(-1, Math.min(1, x / 20));
        // Calculate volume from distance
        const distance = Math.sqrt(x * x + z * z);
        const volume = Math.max(0.1, 1 - distance / 50) * intensity;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100 + intensity * 50, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

        panner.pan.value = pan;
        gain.gain.setValueAtTime(volume * 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(panner);
        panner.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    // --- PACK REVEAL SOUNDS ---

    playReveal(tier = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;

        // Base frequency scales with tier (higher tier = higher pitch)
        const baseFreq = 200 + (tier * 50);
        const noteCount = Math.min(tier + 2, 8);

        // Arpeggio pattern
        for (let i = 0; i < noteCount; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const freq = baseFreq * Math.pow(1.2, i);
            const startTime = now + i * 0.08;

            osc.type = tier >= 8 ? 'sawtooth' : tier >= 5 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        }

        // Celebration burst for high tiers
        if (tier >= 7) {
            this.playCelebration(tier);
        }
    }

    playCelebration(tier) {
        const now = this.ctx.currentTime;

        // Shimmer effect - more for higher tiers
        const shimmerCount = Math.min(tier + 2, 8);
        for (let i = 0; i < shimmerCount; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 1200, now + i * 0.1);

            gain.gain.setValueAtTime(0.05, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        }
    }

    // --- ORIGINAL SYNTHESIZERS ---

    playClick() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playJump() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playImpact(intensity = 1, x = 0, z = 0) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        const duration = 0.1 + (intensity * 0.05);

        // Spatial panning
        panner.pan.value = Math.max(-1, Math.min(1, x / 20));

        // Sub-thump
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 * intensity, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + duration);

        // White noise "crunch"
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        gain.gain.setValueAtTime(0.3 * intensity, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(panner);
        noise.connect(panner);
        panner.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        noise.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playPowerup() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // A Major arpeggio

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.3);
        });
    }

    playKnockout() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 1.0);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 1.0);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start();
        osc.stop(now + 1.0);
    }

    playStart() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        // 3 beeps and a long one
        [0, 0.5, 1.0].forEach(t => this.beep(400, t, 0.1));
        this.beep(800, 1.5, 0.5);
    }

    beep(freq, delay, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime + delay;

        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + duration);
    }
}

export const audio = new AudioManager();


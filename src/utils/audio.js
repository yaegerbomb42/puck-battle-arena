/**
 * puckOFF Enhanced Audio System
 * Uses Web Audio API with Reverb, Compression, and Layered Synthesis for "Rich" Audio.
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.compressor = null;
        this.reverbNode = null;

        this.enabled = false;
        this.initialized = false;
        this.muted = false;

        // Persistent nodes
        this.ambientOscs = [];
        this.ambientGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // --- SIGNAL CHAIN ---
            // Source -> Channel Gain -> Reverb (Send) -> Compressor -> Master Gain -> Destination

            // 1. Master Output
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;

            // 2. Dynamics Compressor (The "Glue")
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);

            // 3. Reverb (Convolver) - Synthetic "Stadium" Impulse
            this.reverbNode = this.ctx.createConvolver();
            this.reverbNode.buffer = this.createImpulseResponse(2.0, 2.0); // 2s reverb

            // Reverb Mix (Wet signal)
            const reverbGain = this.ctx.createGain();
            reverbGain.gain.value = 0.3; // 30% wet
            this.reverbNode.connect(reverbGain);
            reverbGain.connect(this.compressor);

            // 4. Channel Gains
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.3;
            // Music bypasses reverb to stay clean, goes straight to compressor
            this.musicGain.connect(this.compressor);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.8;
            // SFX goes to BOTH compressor (dry) and reverb (wet)
            this.sfxGain.connect(this.compressor);
            this.sfxGain.connect(this.reverbNode);

            this.initialized = true;
            this.enabled = true;
            console.log("🔊 Enhanced Audio System Initialized");
        } catch (e) {
            console.error("Audio API not supported", e);
        }
    }

    // Generate a synthetic reverb impulse response
    createImpulseResponse(duration, decay) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // Exponential decay noise
            const n = i / length;
            const vol = Math.pow(1 - n, decay) * (Math.random() * 2 - 1);
            left[i] = vol;
            right[i] = vol;
        }
        return impulse;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- PLAYBACK METHODS ---

    playClick() {
        if (!this.enabled) return;
        this.resume();

        const t = this.ctx.currentTime;

        // High-tech "blip"
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    playImpact(intensity = 1, x = 0, z = 0) {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;
        const vol = Math.min(1, intensity);

        // 1. Low Thud (Body)
        const oscLow = this.ctx.createOscillator();
        const gainLow = this.ctx.createGain();
        oscLow.frequency.setValueAtTime(150, t);
        oscLow.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        gainLow.gain.setValueAtTime(0.5 * vol, t);
        gainLow.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        // 2. Mid Impact (Punch)
        const oscMid = this.ctx.createOscillator();
        const gainMid = this.ctx.createGain();
        oscMid.type = 'triangle';
        oscMid.frequency.setValueAtTime(300, t);
        oscMid.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gainMid.gain.setValueAtTime(0.3 * vol, t);
        gainMid.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        // 3. Noise Burst (Texture)
        const noiseBufferSize = this.ctx.sampleRate * 0.1;
        const noiseBuffer = this.ctx.createBuffer(1, noiseBufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuffer;
        const noiseGain = this.ctx.createGain();
        // Lowpass filter the noise
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;

        noiseGain.gain.setValueAtTime(0.4 * vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        // Spatial Panning
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, x / 20));

        // Connect graph
        oscLow.connect(gainLow);
        oscMid.connect(gainMid);
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);

        gainLow.connect(panner);
        gainMid.connect(panner);
        noiseGain.connect(panner);

        panner.connect(this.sfxGain);

        // Start/Stop
        oscLow.start(t);
        oscMid.start(t);
        noiseSrc.start(t);

        oscLow.stop(t + 0.2);
        oscMid.stop(t + 0.1);
        noiseSrc.stop(t + 0.1);
    }

    playJump() {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;

        // "Whoosh" up
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.2); // Slower rise

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    playDash() {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(2000, t + 0.15);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(t);
    }

    playKnockout() {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;

        // 1. Main Explosion (Sawtooth drop)
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 1.0);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

        // 2. High Ring (Tinnitus effect)
        const ring = this.ctx.createOscillator();
        ring.type = 'sine';
        ring.frequency.setValueAtTime(2000, t);
        const ringGain = this.ctx.createGain();
        ringGain.gain.setValueAtTime(0.05, t);
        ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        ring.connect(ringGain);
        gain.connect(this.sfxGain);
        ringGain.connect(this.sfxGain);

        osc.start(t);
        ring.start(t);
        osc.stop(t + 1.0);
        ring.stop(t + 0.5);
    }

    playPowerup() {
        if (!this.enabled) return;
        this.resume();
        const t = this.ctx.currentTime;

        // Magical chiming arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C Major 7
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.frequency.value = freq;
            osc.type = 'sine';

            const start = t + i * 0.05;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.1, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain); // Goes to reverb = nice tails
            osc.start(start);
            osc.stop(start + 0.5);
        });
    }

    playStart() {
        if (!this.enabled) return;
        this.resume();
        // 3... 2... 1... GO!
        const t = this.ctx.currentTime;
        [0, 1, 2].forEach(dt => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = 440; // A4
            osc.type = 'square';
            gain.gain.setValueAtTime(0.1, t + dt);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.1);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + dt);
            osc.stop(t + dt + 0.1);
        });

        // GO!
        setTimeout(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = 880; // A5
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.4);
        }, 3000);
    }

    startAmbient() {
        if (!this.enabled || this.ambientOscs.length > 0) return;
        this.resume();

        // Deep drone + LFO filter
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0.15;
        this.ambientGain.connect(this.musicGain); // Bypasses reverb

        const freqs = [55, 110]; // Low A drone
        freqs.forEach(f => {
            const osc = this.ctx.createOscillator();
            osc.frequency.value = f;
            osc.type = 'sube'; // or sine
            osc.connect(this.ambientGain);
            osc.start();
            this.ambientOscs.push(osc);
        });
    }

    stopAmbient() {
        this.ambientOscs.forEach(o => o.stop());
        this.ambientOscs = [];
        if (this.ambientGain) {
            this.ambientGain.disconnect();
            this.ambientGain = null;
        }
    }
    setMasterVolume(val) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        }
    }

    setMusicVolume(val) {
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        }
    }

    setSFXVolume(val) {
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
        }
    }
}

export const audio = new AudioManager();

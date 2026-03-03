// ===== Age of Fun - Sound Effects (Web Audio API) =====

const SFX = (() => {
    let ctx = null, muted = false, volume = 0.3;

    function getCtx() {
        if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function gain(v = volume) {
        const c = getCtx(); if (!c) return null;
        const g = c.createGain(); g.gain.value = v; g.connect(c.destination); return g;
    }

    // Oscillator helper
    function osc(type, freq, start, dur, dest, detune = 0) {
        const c = getCtx(); if (!c) return;
        const o = c.createOscillator();
        o.type = type; o.frequency.value = freq;
        if (detune) o.detune.value = detune;
        o.connect(dest); o.start(start); o.stop(start + dur);
    }

    // Noise helper
    function noise(dur, dest, startTime) {
        const c = getCtx(); if (!c) return;
        const len = c.sampleRate * dur, buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
        const src = c.createBufferSource();
        src.buffer = buf; src.connect(dest);
        src.start(startTime); src.stop(startTime + dur);
    }

    const sounds = {
        // --- Resource Management ---
        dice() {
            const g = gain(0.15); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            for (let i = 0; i < 6; i++) {
                const ng = c.createGain();
                ng.gain.setValueAtTime(0.12, t + i * 0.035);
                ng.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.03);
                ng.connect(g);
                noise(0.03, ng, t + i * 0.035);
            }
        },

        collect() {
            const g = gain(0.2); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            osc('sine', 880, t, 0.08, g);
            osc('sine', 1100, t + 0.06, 0.08, g);
            osc('sine', 1320, t + 0.12, 0.12, g);
            const env = c.createGain();
            env.gain.setValueAtTime(0.2, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            env.connect(g);
        },

        craft() {
            const g = gain(0.18); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            // Metallic hammer taps
            for (let i = 0; i < 3; i++) {
                const env = c.createGain();
                env.gain.setValueAtTime(0.18, t + i * 0.1);
                env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.08);
                env.connect(g);
                osc('square', 420 + i * 60, t + i * 0.1, 0.06, env);
                noise(0.03, env, t + i * 0.1);
            }
        },

        upgrade() {
            const g = gain(0.2); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
            notes.forEach((f, i) => {
                const env = c.createGain();
                env.gain.setValueAtTime(0.2, t + i * 0.1);
                env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.25);
                env.connect(g);
                osc('sine', f, t + i * 0.1, 0.25, env);
                osc('sine', f * 1.5, t + i * 0.1, 0.15, env);
            });
        },

        coins() {
            const g = gain(0.15); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            for (let i = 0; i < 3; i++) {
                const env = c.createGain();
                env.gain.setValueAtTime(0.15, t + i * 0.07);
                env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.12);
                env.connect(g);
                osc('sine', 2200 + i * 300, t + i * 0.07, 0.1, env);
                osc('sine', 3300 + i * 200, t + i * 0.07, 0.06, env);
            }
        },

        train() {
            const g = gain(0.18); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            // Sword unsheath
            const env = c.createGain();
            env.gain.setValueAtTime(0.001, t);
            env.gain.linearRampToValueAtTime(0.18, t + 0.05);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
            env.connect(g);
            const o = c.createOscillator();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t);
            o.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
            o.frequency.exponentialRampToValueAtTime(800, t + 0.35);
            o.connect(env); o.start(t); o.stop(t + 0.35);
            noise(0.12, env, t + 0.02);
        },

        disassemble() {
            const g = gain(0.15); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            // Reverse unsheath
            const env = c.createGain();
            env.gain.setValueAtTime(0.15, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            env.connect(g);
            const o = c.createOscillator();
            o.type = 'sawtooth'; o.frequency.setValueAtTime(1000, t);
            o.frequency.exponentialRampToValueAtTime(250, t + 0.3);
            o.connect(env); o.start(t); o.stop(t + 0.3);
            noise(0.08, env, t);
        },

        error() {
            const g = gain(0.12); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            osc('square', 180, t, 0.12, g);
            osc('square', 140, t + 0.12, 0.15, g);
        },

        chest() {
            const g = gain(0.1); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.1, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            env.connect(g);
            osc('sine', 1800, t, 0.03, env);
        },

        chestOpen() {
            const g = gain(0.25); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const notes = [784, 988, 1175, 1568]; // G5 B5 D6 G6
            notes.forEach((f, i) => {
                const env = c.createGain();
                env.gain.setValueAtTime(0.22, t + i * 0.08);
                env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
                env.connect(g);
                osc('sine', f, t + i * 0.08, 0.3, env);
                osc('triangle', f * 2, t + i * 0.08, 0.15, env);
            });
        },

        click() {
            const g = gain(0.08); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.08, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
            env.connect(g);
            osc('sine', 1000, t, 0.03, env);
        },

        // --- Battle ---
        warHorn() {
            const g = gain(0.25); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.001, t);
            env.gain.linearRampToValueAtTime(0.25, t + 0.2);
            env.gain.setValueAtTime(0.25, t + 0.8);
            env.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
            env.connect(g);
            osc('sawtooth', 110, t, 1.5, env);
            osc('sawtooth', 165, t + 0.1, 1.3, env);
            osc('triangle', 220, t + 0.2, 1.0, env);
        },

        meleeHit() {
            const g = gain(0.14); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.14, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            env.connect(g);
            noise(0.06, env, t);
            osc('square', 300 + Math.random() * 200, t, 0.04, env);
            osc('sine', 150, t + 0.02, 0.06, env);
        },

        arrowShot() {
            const g = gain(0.1); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.001, t);
            env.gain.linearRampToValueAtTime(0.1, t + 0.02);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            env.connect(g);
            const o = c.createOscillator();
            o.type = 'sine'; o.frequency.setValueAtTime(800, t);
            o.frequency.exponentialRampToValueAtTime(200, t + 0.15);
            o.connect(env); o.start(t); o.stop(t + 0.15);
            noise(0.06, env, t);
        },

        arrowHit() {
            const g = gain(0.1); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.1, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            env.connect(g);
            osc('sine', 120, t, 0.08, env);
            noise(0.04, env, t);
        },

        miss() {
            const g = gain(0.06); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.06, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            env.connect(g);
            const o = c.createOscillator();
            o.type = 'sine'; o.frequency.setValueAtTime(600, t);
            o.frequency.exponentialRampToValueAtTime(100, t + 0.12);
            o.connect(env); o.start(t); o.stop(t + 0.12);
        },

        unitDeath() {
            const g = gain(0.12); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.12, t);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            env.connect(g);
            osc('sine', 200, t, 0.3, env);
            osc('sine', 120, t + 0.1, 0.3, env);
            noise(0.08, env, t);
        },

        victory() {
            const g = gain(0.25); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            // Triumphant major chord fanfare
            const melody = [523, 659, 784, 523 * 2, 784, 1047];
            const times = [0, 0.15, 0.3, 0.45, 0.65, 0.8];
            const durs = [0.15, 0.15, 0.15, 0.2, 0.15, 0.5];
            melody.forEach((f, i) => {
                const env = c.createGain();
                env.gain.setValueAtTime(0.22, t + times[i]);
                env.gain.exponentialRampToValueAtTime(0.001, t + times[i] + durs[i] + 0.1);
                env.connect(g);
                osc('sine', f, t + times[i], durs[i] + 0.1, env);
                osc('triangle', f * 0.5, t + times[i], durs[i], env);
            });
        },

        defeat() {
            const g = gain(0.2); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            // Sad minor descend
            const notes = [392, 349, 311, 261]; // G4 F4 Eb4 C4
            notes.forEach((f, i) => {
                const env = c.createGain();
                env.gain.setValueAtTime(0.18, t + i * 0.25);
                env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.4);
                env.connect(g);
                osc('sine', f, t + i * 0.25, 0.35, env);
                osc('triangle', f * 0.5, t + i * 0.25, 0.3, env);
            });
        },

        retreat() {
            const g = gain(0.18); if (!g) return;
            const c = getCtx(), t = c.currentTime;
            const env = c.createGain();
            env.gain.setValueAtTime(0.001, t);
            env.gain.linearRampToValueAtTime(0.18, t + 0.1);
            env.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            env.connect(g);
            osc('sawtooth', 220, t, 0.25, env);
            osc('sawtooth', 165, t + 0.25, 0.35, env);
        }
    };

    return {
        play(name) {
            if (muted) return;
            try { if (sounds[name]) sounds[name](); }
            catch (e) { /* silently ignore audio errors */ }
        },
        toggleMute() {
            muted = !muted;
            // Save preference
            try { localStorage.setItem('aof_muted', muted ? '1' : '0'); } catch (e) { }
            return muted;
        },
        isMuted() { return muted; },
        init() {
            try { muted = localStorage.getItem('aof_muted') === '1'; } catch (e) { }
        }
    };
})();

SFX.init();

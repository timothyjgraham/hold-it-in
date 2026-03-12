// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Sound Manager                                               ║
// ║  Web Audio API engine with pooling, variation selection, pitch             ║
// ║  randomization, cooldown tracking, and per-category volume control.        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { SOUND_EVENTS, SFX_PATH } from '../data/soundConfig.js';

const STORAGE_KEY = 'holditin_audio';

class SoundManager {
    constructor() {
        this._ctx = null;           // AudioContext (created on first user interaction)
        this._buffers = new Map();  // filename → AudioBuffer
        this._loading = new Set();  // filenames currently being fetched
        this._lastPlay = {};        // eventName → timestamp of last play (cooldown)
        this._activeSources = {};   // eventName → count of currently playing sources

        // Volume levels (0–1)
        this._masterVolume = 1.0;
        this._categoryVolumes = {
            sfx: 0.8,
            ui: 0.8,
            ambient: 0.5,
        };

        // Gain nodes (created when AudioContext initializes)
        this._masterGain = null;
        this._categoryGains = {};

        // Ambient loop handles
        this._ambientSources = {};  // eventName → { source, gainNode }

        // Preload state
        this._preloaded = false;
        this._unlocked = false;

        // Load saved settings
        this._loadSettings();
    }

    // ─── INITIALIZATION ────────────────────────────────────────────────

    /**
     * Unlock audio context on first user gesture (required by browsers).
     * Call this from a click/touch/keydown handler.
     */
    unlock() {
        if (this._unlocked) return;

        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }

        // Create gain node hierarchy: source → categoryGain → masterGain → destination
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this._masterVolume;
        this._masterGain.connect(this._ctx.destination);

        for (const cat of ['sfx', 'ui', 'ambient']) {
            const g = this._ctx.createGain();
            g.gain.value = this._categoryVolumes[cat];
            g.connect(this._masterGain);
            this._categoryGains[cat] = g;
        }

        this._unlocked = true;

        // Start preloading all sounds
        if (!this._preloaded) {
            this._preloadAll();
        }
    }

    /**
     * Preload all sound buffers asynchronously.
     */
    _preloadAll() {
        this._preloaded = true;
        for (const [eventName, config] of Object.entries(SOUND_EVENTS)) {
            for (const file of config.files) {
                this._loadBuffer(file);
            }
        }
    }

    /**
     * Load a single audio file into buffer cache.
     */
    async _loadBuffer(filename) {
        if (this._buffers.has(filename) || this._loading.has(filename)) return;
        this._loading.add(filename);

        try {
            const response = await fetch(SFX_PATH + filename);
            if (!response.ok) {
                console.warn(`SoundManager: failed to fetch ${filename}`);
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
            this._buffers.set(filename, audioBuffer);
        } catch (e) {
            console.warn(`SoundManager: error loading ${filename}:`, e.message);
        } finally {
            this._loading.delete(filename);
        }
    }

    // ─── PLAYBACK ──────────────────────────────────────────────────────

    /**
     * Play a sound event by name.
     * @param {string} eventName - Key from SOUND_EVENTS
     * @param {object} [opts] - Override options
     * @param {number} [opts.volume] - Override volume (0–1)
     * @param {number} [opts.pitch] - Override pitch (playback rate)
     * @param {boolean} [opts.force] - Bypass cooldown/simultaneous checks
     * @returns {AudioBufferSourceNode|null} The source node, or null if skipped
     */
    play(eventName, opts = {}) {
        if (!this._unlocked || !this._ctx) return null;

        const config = SOUND_EVENTS[eventName];
        if (!config) {
            console.warn(`SoundManager: unknown event "${eventName}"`);
            return null;
        }

        const now = this._ctx.currentTime;

        // Cooldown check
        if (!opts.force && config.cooldown) {
            const last = this._lastPlay[eventName] || 0;
            if (now - last < config.cooldown) return null;
        }

        // Simultaneous instance limit
        const maxSim = config.maxSimultaneous || 3;
        if (!opts.force) {
            const active = this._activeSources[eventName] || 0;
            if (active >= maxSim) return null;
        }

        // Pick random file variation
        const file = config.files[Math.floor(Math.random() * config.files.length)];
        const buffer = this._buffers.get(file);
        if (!buffer) {
            // Not loaded yet — try to load for next time
            this._loadBuffer(file);
            return null;
        }

        // Create source
        const source = this._ctx.createBufferSource();
        source.buffer = buffer;

        // Pitch randomization
        if (opts.pitch !== undefined) {
            source.playbackRate.value = opts.pitch;
        } else if (config.pitch) {
            const [minP, maxP] = config.pitch;
            source.playbackRate.value = minP + Math.random() * (maxP - minP);
        }

        // Loop
        if (config.loop) {
            source.loop = true;
        }

        // Volume — per-source gain node
        const sourceGain = this._ctx.createGain();
        const vol = opts.volume !== undefined ? opts.volume : config.volume;
        sourceGain.gain.value = vol;

        // Route: source → sourceGain → categoryGain → masterGain → destination
        const category = config.category || 'sfx';
        const catGain = this._categoryGains[category] || this._categoryGains.sfx;
        source.connect(sourceGain);
        sourceGain.connect(catGain);

        // Track active sources
        this._activeSources[eventName] = (this._activeSources[eventName] || 0) + 1;
        this._lastPlay[eventName] = now;

        source.onended = () => {
            this._activeSources[eventName] = Math.max(0, (this._activeSources[eventName] || 1) - 1);
        };

        source.start(0);
        return source;
    }

    /**
     * Start a looping ambient sound.
     * @param {string} eventName - Key from SOUND_EVENTS (must have loop: true)
     */
    startAmbient(eventName) {
        if (this._ambientSources[eventName]) return; // Already playing

        const config = SOUND_EVENTS[eventName];
        if (!config) return;

        const file = config.files[0];
        const buffer = this._buffers.get(file);
        if (!buffer) {
            // Retry after a short delay (buffer may still be loading)
            setTimeout(() => this.startAmbient(eventName), 500);
            return;
        }

        const source = this._ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = this._ctx.createGain();
        gainNode.gain.value = config.volume;

        const category = config.category || 'ambient';
        const catGain = this._categoryGains[category] || this._categoryGains.sfx;
        source.connect(gainNode);
        gainNode.connect(catGain);

        source.start(0);
        this._ambientSources[eventName] = { source, gainNode };
    }

    /**
     * Stop a looping ambient sound with optional fade-out.
     */
    stopAmbient(eventName, fadeTime = 0.5) {
        const entry = this._ambientSources[eventName];
        if (!entry) return;

        const { source, gainNode } = entry;
        gainNode.gain.linearRampToValueAtTime(0, this._ctx.currentTime + fadeTime);
        setTimeout(() => {
            try { source.stop(); } catch (_) { /* already stopped */ }
        }, fadeTime * 1000 + 50);
        delete this._ambientSources[eventName];
    }

    /**
     * Stop all ambient sounds.
     */
    stopAllAmbient(fadeTime = 0.5) {
        for (const name of Object.keys(this._ambientSources)) {
            this.stopAmbient(name, fadeTime);
        }
    }

    // ─── VOLUME CONTROL ────────────────────────────────────────────────

    setMasterVolume(v) {
        this._masterVolume = Math.max(0, Math.min(1, v));
        if (this._masterGain) {
            this._masterGain.gain.value = this._masterVolume;
        }
        this._saveSettings();
    }

    setCategoryVolume(category, v) {
        v = Math.max(0, Math.min(1, v));
        this._categoryVolumes[category] = v;
        if (this._categoryGains[category]) {
            this._categoryGains[category].gain.value = v;
        }
        this._saveSettings();
    }

    getMasterVolume() { return this._masterVolume; }
    getCategoryVolume(category) { return this._categoryVolumes[category] || 0; }

    // Convenience aliases matching settings UI
    setSFXVolume(v) { this.setCategoryVolume('sfx', v); }
    setUIVolume(v) { this.setCategoryVolume('ui', v); }
    setAmbientVolume(v) { this.setCategoryVolume('ambient', v); }

    // ─── PERSISTENCE ───────────────────────────────────────────────────

    _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                master: this._masterVolume,
                sfx: this._categoryVolumes.sfx,
                ui: this._categoryVolumes.ui,
                ambient: this._categoryVolumes.ambient,
            }));
        } catch (_) { /* storage unavailable */ }
    }

    _loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const s = JSON.parse(saved);
                if (s.master !== undefined) this._masterVolume = s.master;
                if (s.sfx !== undefined) this._categoryVolumes.sfx = s.sfx;
                if (s.ui !== undefined) this._categoryVolumes.ui = s.ui;
                if (s.ambient !== undefined) this._categoryVolumes.ambient = s.ambient;
            }
        } catch (_) { /* ignore */ }
    }

    // ─── QUERY ─────────────────────────────────────────────────────────

    /**
     * Check if a buffer is loaded for a given event.
     */
    isLoaded(eventName) {
        const config = SOUND_EVENTS[eventName];
        if (!config) return false;
        return config.files.some(f => this._buffers.has(f));
    }

    /**
     * Get loading progress (0–1).
     */
    getLoadProgress() {
        let total = 0, loaded = 0;
        for (const config of Object.values(SOUND_EVENTS)) {
            for (const f of config.files) {
                total++;
                if (this._buffers.has(f)) loaded++;
            }
        }
        return total > 0 ? loaded / total : 1;
    }
}

// Singleton
const SFX = new SoundManager();
export { SFX, SoundManager };

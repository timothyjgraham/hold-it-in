// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Music Manager                                               ║
// ║  HTML5 Audio-based music player with crossfading, shuffled playlists,     ║
// ║  pause/resume, and volume ducking. Uses streaming playback (not           ║
// ║  AudioBuffer) to keep memory usage low for long tracks.                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MUSIC_PATH, MUSIC_PLAYLISTS, MUSIC_DEFAULTS } from '../data/musicConfig.js';

const STORAGE_KEY = 'holditin_audio';

class MusicManager {
    constructor() {
        this._volume = MUSIC_DEFAULTS.baseVolume;
        this._currentPlaylist = null;   // playlist name string
        this._queue = [];               // shuffled track filenames remaining
        this._currentAudio = null;      // HTMLAudioElement currently playing
        this._fadingOutAudio = null;    // HTMLAudioElement fading out during crossfade
        this._fadeInterval = null;      // interval handle for crossfade ticks
        this._paused = false;
        this._ducked = false;
        this._duckMultiplier = 1.0;
        this._unlocked = false;

        // Load saved volume from shared audio settings
        this._loadVolume();
    }

    // ─── INITIALIZATION ─────────────────────────────────────────────────

    /**
     * Call on first user gesture (alongside SFX.unlock).
     * HTML5 Audio doesn't strictly require unlocking on most browsers,
     * but autoplay policies may block playback until a user gesture.
     */
    unlock() {
        if (this._unlocked) return;
        this._unlocked = true;
    }

    // ─── PLAYLIST CONTROL ───────────────────────────────────────────────

    /**
     * Switch to a named playlist. Crossfades from current track.
     * @param {string} playlistName - Key from MUSIC_PLAYLISTS
     */
    play(playlistName) {
        if (!this._unlocked) return;

        const tracks = MUSIC_PLAYLISTS[playlistName];
        if (!tracks || tracks.length === 0) return;

        // Already playing this playlist — don't restart
        if (this._currentPlaylist === playlistName && this._currentAudio && !this._currentAudio.paused) {
            return;
        }

        this._currentPlaylist = playlistName;
        this._queue = this._shuffle([...tracks]);
        this._paused = false;

        this._crossfadeToNext();
    }

    /**
     * Stop all music with a fade-out.
     */
    stop(fadeDuration = MUSIC_DEFAULTS.crossfadeDuration) {
        this._currentPlaylist = null;
        this._queue = [];

        if (this._currentAudio) {
            this._fadeOut(this._currentAudio, fadeDuration);
            this._currentAudio = null;
        }
    }

    /**
     * Pause music with a gentle fade.
     */
    pause(fadeDuration = MUSIC_DEFAULTS.pauseFadeDuration) {
        if (!this._currentAudio || this._paused) return;
        this._paused = true;
        this._fadeOut(this._currentAudio, fadeDuration, true); // true = pause, don't destroy
    }

    /**
     * Resume music from pause.
     */
    resume(fadeDuration = MUSIC_DEFAULTS.pauseFadeDuration) {
        if (!this._currentAudio || !this._paused) return;
        this._paused = false;
        this._currentAudio.play().catch(() => {});
        this._fadeIn(this._currentAudio, fadeDuration);
    }

    // ─── VOLUME ─────────────────────────────────────────────────────────

    setVolume(v) {
        this._volume = Math.max(0, Math.min(1, v));
        this._applyVolume();
        this._saveVolume();
    }

    getVolume() {
        return this._volume;
    }

    /**
     * Duck volume (e.g., during upgrade selection).
     */
    duck() {
        if (this._ducked) return;
        this._ducked = true;
        this._animateDuck(MUSIC_DEFAULTS.duckVolume, MUSIC_DEFAULTS.duckFadeDuration);
    }

    /**
     * Restore volume after ducking.
     */
    unduck() {
        if (!this._ducked) return;
        this._ducked = false;
        this._animateDuck(1.0, MUSIC_DEFAULTS.duckFadeDuration);
    }

    // ─── INTERNALS ──────────────────────────────────────────────────────

    _crossfadeToNext() {
        // If queue is empty, reshuffle the current playlist
        if (this._queue.length === 0) {
            const tracks = MUSIC_PLAYLISTS[this._currentPlaylist];
            if (!tracks) return;
            this._queue = this._shuffle([...tracks]);
        }

        const nextFile = this._queue.shift();
        const nextAudio = new Audio(MUSIC_PATH + nextFile);
        nextAudio.loop = false;
        nextAudio.volume = 0; // Start silent for fade-in

        // When this track ends, crossfade to next
        nextAudio.addEventListener('ended', () => {
            if (this._currentAudio === nextAudio && this._currentPlaylist) {
                this._crossfadeToNext();
            }
        });

        // Fade out current track
        if (this._currentAudio && !this._currentAudio.paused) {
            this._fadeOut(this._currentAudio, MUSIC_DEFAULTS.crossfadeDuration);
        }

        // Start and fade in new track
        this._currentAudio = nextAudio;
        nextAudio.play().then(() => {
            this._fadeIn(nextAudio, MUSIC_DEFAULTS.crossfadeDuration);
        }).catch(() => {
            // Autoplay blocked — will retry on next user gesture
        });
    }

    _fadeIn(audio, duration) {
        const targetVol = this._getEffectiveVolume();
        const steps = Math.max(1, Math.round(duration * 30)); // ~30fps
        const stepTime = (duration * 1000) / steps;
        const volStep = targetVol / steps;
        let step = 0;

        audio.volume = 0;
        const interval = setInterval(() => {
            step++;
            if (step >= steps || audio.paused) {
                audio.volume = targetVol;
                clearInterval(interval);
                return;
            }
            audio.volume = Math.min(targetVol, volStep * step);
        }, stepTime);
    }

    _fadeOut(audio, duration, pauseAfter = false) {
        const startVol = audio.volume;
        if (startVol <= 0) {
            if (!pauseAfter) { audio.pause(); audio.src = ''; }
            return;
        }

        const steps = Math.max(1, Math.round(duration * 30));
        const stepTime = (duration * 1000) / steps;
        const volStep = startVol / steps;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            if (step >= steps) {
                audio.volume = 0;
                clearInterval(interval);
                if (pauseAfter) {
                    audio.pause();
                } else {
                    audio.pause();
                    audio.src = '';
                }
                return;
            }
            audio.volume = Math.max(0, startVol - volStep * step);
        }, stepTime);
    }

    _animateDuck(targetMultiplier, duration) {
        const startMult = this._duckMultiplier;
        const steps = Math.max(1, Math.round(duration * 30));
        const stepTime = (duration * 1000) / steps;
        const multStep = (targetMultiplier - startMult) / steps;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            if (step >= steps) {
                this._duckMultiplier = targetMultiplier;
                this._applyVolume();
                clearInterval(interval);
                return;
            }
            this._duckMultiplier = startMult + multStep * step;
            this._applyVolume();
        }, stepTime);
    }

    _getEffectiveVolume() {
        return this._volume * this._duckMultiplier;
    }

    _applyVolume() {
        if (this._currentAudio && !this._paused) {
            this._currentAudio.volume = this._getEffectiveVolume();
        }
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // ─── PERSISTENCE ────────────────────────────────────────────────────

    _saveVolume() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const s = saved ? JSON.parse(saved) : {};
            s.music = this._volume;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        } catch (_) { /* storage unavailable */ }
    }

    _loadVolume() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const s = JSON.parse(saved);
                if (s.music !== undefined) this._volume = s.music;
            }
        } catch (_) { /* ignore */ }
    }
}

// Singleton
const Music = new MusicManager();
export { Music, MusicManager };

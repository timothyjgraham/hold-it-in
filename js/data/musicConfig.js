// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Music Configuration                                         ║
// ║  Track definitions and scenario playlists.                                ║
// ║  Bossa Nova pack by Bell Kalengar (itch.io).                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export const MUSIC_PATH = './music/';

// ─── PLAYLISTS ──────────────────────────────────────────────────────────────
// Each context maps to an array of track filenames. Tracks shuffle each time
// the playlist starts. When all tracks have played, the list reshuffles.

export const MUSIC_PLAYLISTS = {

    // Title screen / menus — smooth, inviting, sets the bossa nova mood
    title: [
        'old_fashioned.mp3',
        'warm-hearted.mp3',
        'seasonal_love.mp3',
    ],

    // Office scenario — urban, corporate-adjacent, cool confidence
    office: [
        'play_it_cool_buddy.mp3',
        'its_quiz_time.mp3',
        'plaza.mp3',
        'break_time.mp3',
    ],

    // Forest scenario — warm, natural, golden-hour outdoors
    forest: [
        'coconut_water.mp3',
        'summer_nights.mp3',
        'sunset.mp3',
        'grilled_fish.mp3',
    ],

    // Ocean scenario — coastal, breezy, nautical
    ocean: [
        'beach_breeze.mp3',
        'coast.mp3',
        'sailing.mp3',
        'sandcastle.mp3',
    ],

    // Airplane scenario — travel, movement, jet-set energy
    airplane: [
        'rendezvous.mp3',
        'summer_school.mp3',
        'overflow.mp3',
        'play_the_slow_one.mp3',
    ],

    // Game over / results — mellow, reflective
    gameover: [
        'reflection.mp3',
        'play_the_slow_one.mp3',
    ],

    // Boss / intense waves — high energy (shared across scenarios)
    boss: [
        'boss_fight.mp3',
    ],
};

// ─── CROSSFADE & TIMING ─────────────────────────────────────────────────────

export const MUSIC_DEFAULTS = {
    crossfadeDuration: 2.0,   // seconds to crossfade between tracks
    pauseFadeDuration: 0.8,   // seconds to fade when pausing
    duckVolume: 0.3,          // multiplier during upgrade selection
    duckFadeDuration: 0.5,    // seconds to duck/unduck
    baseVolume: 0.5,          // default music volume (0–1)
};

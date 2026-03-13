// Tower Introduction Intermission Data
// Flavor text and metadata shown when a tower is unlocked for the first time.
// coinmagnet and ubik are excluded — they're available from wave 1.

export const TOWER_INTRO_DATA = {
    wetfloor: {
        name: 'WET FLOOR SIGN',
        tagline: 'NEW TOWER UNLOCKED!',
        traits: ['Blocks the path like a barricade', 'Enemies must smash through it', 'Cheap and disposable — spam them!'],
        color: 0xe8d44a,  // PALETTE.sign
    },
    mop: {
        name: 'MOP TURRET',
        tagline: 'NEW TOWER UNLOCKED!',
        traits: ['Sweeps enemies back with knockback', 'Crowd control powerhouse', 'Covers a wide arc around it'],
        color: 0x9b59b6,  // PALETTE.mop
    },
    potplant: {
        name: 'POT PLANT',
        tagline: 'NEW TOWER UNLOCKED!',
        traits: ['Trips enemies — sends them flying!', 'Cheap decoy to slow the horde', 'Gets kicked and breaks after 3 hits'],
        color: 0xc4663a,  // PALETTE.potplant
    },
};

// Maps wave number → tower type key (matches TOWER_UNLOCK_WAVES in index.html)
export const TOWER_INTRO_WAVE_MAP = {
    3: 'wetfloor',
    5: 'mop',
    7: 'potplant',
};

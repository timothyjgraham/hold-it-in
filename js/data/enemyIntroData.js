// Enemy Introduction Intermission Data
// Flavor text and metadata shown before waves that introduce new enemy types.

export const ENEMY_INTRO_DATA = {
    dancer:      { wave: 3,  name: 'THE PEE DANCER',    tagline: "Someone else is busting to go!",    traits: ['Tiny and FAST', 'Bounces around frantically', 'Travels in swarms'],                                          walkState: 'hop_walk' },
    waddle:      { wave: 5,  name: 'THE WADDLE TANK',   tagline: "Something BIG this way comes...",   traits: ['Huge and slow', 'Built like a brick outhouse', 'Hits HARD'],                                                   walkState: 'waddle' },
    panicker:    { wave: 7,  name: 'THE PANICKER',      tagline: "Someone's REALLY losing it!",       traits: ['Total meltdown', 'Arms flailing everywhere', 'Panic is contagious...'],                                        walkState: 'panic_run' },
    powerwalker: { wave: 9,  name: 'THE POWER WALKER',  tagline: 'You can hear the footsteps...',     traits: ['Intense. Determined. Unstoppable.', 'Perfect form, terrifying purpose', 'Nothing gets in the way'],             walkState: 'power_walk' },
    girls:       { wave: 10, name: 'THE GIRLS',         tagline: 'They ALWAYS go together.',          traits: ['They always go together', "Small but there's a LOT of them", "Don't underestimate girl power"],                walkState: 'walk_chat' },
};

export const INTRO_WAVE_MAP = { 3: 'dancer', 5: 'waddle', 7: 'panicker', 9: 'powerwalker', 10: 'girls' };

// Enemy Introduction Intermission Data
// Flavor text and metadata shown before waves that introduce new enemy types.

export const ENEMY_INTRO_DATA = {
    // ── Office enemies ──
    dancer:      { wave: 3,  name: 'THE PEE DANCER',    tagline: "Someone else is busting to go!",    traits: ['Tiny and FAST', 'Bounces around frantically', 'Travels in swarms'],                                          walkState: 'hop_walk' },
    waddle:      { wave: 5,  name: 'THE WADDLE TANK',   tagline: "Something BIG this way comes...",   traits: ['Huge and slow', 'Built like a brick outhouse', 'Hits HARD'],                                                   walkState: 'waddle' },
    panicker:    { wave: 7,  name: 'THE PANICKER',      tagline: "Someone's REALLY losing it!",       traits: ['Total meltdown', 'Arms flailing everywhere', 'Panic is contagious...'],                                        walkState: 'panic_run' },
    powerwalker: { wave: 9,  name: 'THE POWER WALKER',  tagline: 'You can hear the footsteps...',     traits: ['Intense. Determined. Unstoppable.', 'Perfect form, terrifying purpose', 'Nothing gets in the way'],             walkState: 'power_walk' },
    girls:       { wave: 10, name: 'THE GIRLS',         tagline: 'They ALWAYS go together.',          traits: ['They always go together', "Small but there's a LOT of them", "Don't underestimate girl power"],                walkState: 'walk_chat' },

    // ── Forest enemies ──
    squirrel:    { wave: 3,  name: 'THE SQUIRREL',      tagline: 'Something small and twitchy...',    traits: ['Tiny and hyperactive', 'Hops around erratically', 'They come in droves'],                                       walkState: 'hop' },
    bear:        { wave: 5,  name: 'THE BEAR',          tagline: "The ground is shaking...",          traits: ['Massive and powerful', 'Thick hide absorbs damage', 'Enrages when wounded'],                                    walkState: 'waddle' },
    fox:         { wave: 7,  name: 'THE FOX',           tagline: "A flash of orange in the trees!",   traits: ['Quick and cunning', 'Zig-zags unpredictably', 'Panic spreads to the pack...'],                                 walkState: 'dart' },
    moose:       { wave: 9,  name: 'THE MOOSE',         tagline: 'Those antlers mean business.',      traits: ['Massive rack of antlers', 'Charges with unstoppable force', 'Immune to slowing effects'],                       walkState: 'charge' },
    raccoon:     { wave: 10, name: 'THE RACCOONS',      tagline: 'Trash pandas travel in packs.',     traits: ['They raid in groups', "Small but there's a LOT of them", "Surprisingly clever little bandits"],                 walkState: 'waddle' },

    // ── Ocean enemies ──
    flyfish:     { wave: 3,  name: 'THE FLYING FISH',   tagline: 'Something leaps from the waves!',    traits: ['Tiny and blindingly fast', 'Glides above the water on wing-fins', 'They swarm in schools'],                         walkState: 'walk' },
    shark:       { wave: 5,  name: 'THE SHARK',         tagline: 'A fin breaks the surface...',        traits: ['Massive and terrifying', 'Rows of razor teeth', 'Enrages when wounded'],                                              walkState: 'walk' },
    pirate:      { wave: 7,  name: 'THE PIRATE',        tagline: "Yarr! Someone's rowing this way!",   traits: ['Armed and dangerous in a tiny boat', 'Rallies nearby sea creatures', 'Surprisingly determined bladder'],               walkState: 'walk' },
    seaturtle:   { wave: 9,  name: 'THE SEA TURTLE',    tagline: 'An ancient shape glides steadily.',  traits: ['Armored shell deflects everything', 'Impossibly steady pace', 'Cannot be slowed down'],                                walkState: 'walk' },
    jellyfish:   { wave: 10, name: 'THE JELLYFISH',     tagline: 'The water starts to glow...',        traits: ['They drift in swarms', "Tiny but there's a LOT of them", "Surprisingly desperate little blobs"],                      walkState: 'walk' },

    // ── Airplane enemies ──
    business:    { wave: 3,  name: 'BUSINESS CLASS',        tagline: "Don't touch the suit.",                traits: ["Won't be pushed around", 'Mops? Please.', 'Takes the widest route possible'],                                     walkState: 'walk' },
    stumbler:    { wave: 5,  name: 'THE TURBULENCE STUMBLER', tagline: "Someone ate the fish...",            traits: ['Massive and nauseous', 'Stumbles straight through barricades', 'Gets FAST when panicked'],                          walkState: 'waddle' },
    attendant:   { wave: 7,  name: 'THE FLIGHT ATTENDANT',  tagline: 'Service with a desperate smile.',     traits: ['Fast and professional', 'Spray? They deal with worse daily', 'Hops over barriers like a pro'],                     walkState: 'walk' },
    marshal:     { wave: 9,  name: 'THE AIR MARSHAL',       tagline: 'Badge out. Bladder full.',             traits: ['Cannot be slowed down', 'Confiscates your coin magnets', 'Speeds up everyone nearby'],                             walkState: 'power_walk' },
    unruly:      { wave: 10, name: 'THE UNRULY PASSENGERS', tagline: "They've had too many free drinks.",    traits: ['They stumble in packs', "Too drunk to trip over pot plants", "Small but there's a LOT of them"],                   walkState: 'walk' },
};

export const INTRO_WAVE_MAP = {
    office:   { 3: 'dancer', 5: 'waddle', 7: 'panicker', 9: 'powerwalker', 10: 'girls' },
    forest:   { 3: 'squirrel', 5: 'bear', 7: 'fox', 9: 'moose', 10: 'raccoon' },
    ocean:    { 3: 'flyfish', 5: 'shark', 7: 'pirate', 9: 'seaturtle', 10: 'jellyfish' },
    airplane: { 3: 'business', 5: 'stumbler', 7: 'attendant', 9: 'marshal', 10: 'unruly' },
};

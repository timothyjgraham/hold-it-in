// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Master Color Palette                                        ║
// ║  Single source of truth for every color in the game.                      ║
// ║  NO hex literals anywhere else. Import from here.                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// PALETTE RULES:
// 1. Every color used in 3D, UI, or CSS must be defined here
// 2. Player hoodie blue is EXCLUSIVE — no other element uses it
// 3. Enemy colors are warm/organic, tower colors are cool/synthetic
// 4. All outlines, borders, shadows, and fog use INK
// 5. GOLD is the reward color (coins, badges, selections)
// 6. DANGER is the loss color (HP, game over, warnings)
//
// Pure data module — no THREE.js dependency.

export const PALETTE = {

    // ─── FOUNDATION ───────────────────────────────────────────────────────────
    // The structural darks and lights that frame everything

    ink:        0x1a1a2e,   // Outlines, borders, text, fog, clear color, deepest darks
    charcoal:   0x2d2b3d,   // Secondary dark surfaces, dark accents
    cream:      0xfff4d9,   // UI card backgrounds, paper, parchment surfaces
    white:      0xfaf5ef,   // Porcelain, brightest surfaces, highlights

    // ─── ENVIRONMENT ──────────────────────────────────────────────────────────
    // Warm institutional bathroom + office — desaturated, recedes behind characters

    tileLight:  0xddd2c0,   // Floor tiles light, wall panels light
    tileDark:   0xc4b8a5,   // Floor tiles dark, wall panels dark, grout shadow
    wall:       0x7e8e96,   // Institutional blue-gray — stall dividers, wall surfaces
    fixture:    0xa8a098,   // Sinks, hand dryers, neutral metal, chrome (de-PBR'd)
    wood:       0x8b6e4e,   // Doors, desks, office furniture
    carpet:     0x5a6658,   // Office floor (muted olive-gray)

    // ─── PLAYER ───────────────────────────────────────────────────────────────
    // The protagonist has a UNIQUE color that nothing else in the game shares

    hoodie:     0x4a86c8,   // Player exclusive blue — THE player color
    skin:       0xffccaa,   // Shared skin tone (player + all enemies)
    pants:      0x3a3a4a,   // Dark clothing (player pants, enemy legs)

    // ─── ENEMIES ──────────────────────────────────────────────────────────────
    // Each type has a signature color. Warm/organic tones — these are people.
    // Shared: skin (0xffccaa), pants/legs (0x3a3a4a), outline (ink)

    polite:     0xd4a574,   // Polite Knocker — warm tan (baseline, unremarkable)
    dancer:     0x59c3e8,   // Pee Dancer — sky blue (lighter/greener than player hoodie)
    waddle:     0x8b5e3c,   // Waddle Tank — rich brown (heavy, earthy)
    panicker:   0xf5c842,   // Panicker — gold-yellow (warning! alarm!)
    power:      0x20b89a,   // Power Walker — jade/teal (athletic, composed)
    girls:      0xe84888,   // The Girls — hot pink (unmistakable cluster)

    // ─── TOWERS ───────────────────────────────────────────────────────────────
    // Defensive structures — slightly cooler/synthetic vs. the warm enemy palette

    magnet:     0xf0a030,   // Coin Magnet — amber/orange (economy, magnetic)
    sign:       0xe8d44a,   // Wet Floor Sign — safety yellow (caution ⚠)
    mop:        0x9b59b6,   // Mop Turret — purple (unique, melee)
    ubik:       0x6bcb77,   // Ubik Spray — mint green (chemical, aerosol)
    potplant:   0xc4663a,   // Pot Plant — terracotta (earthy, disposable trip hazard)

    // ─── UI / EFFECTS ─────────────────────────────────────────────────────────
    // Functional colors used in HUD, feedback, particles, highlights

    gold:       0xffd93d,   // Coins, rewards, wave badge, selected state, sparkles
    danger:     0xff6b7a,   // HP loss, game over title, critical warnings
    success:    0x50c878,   // Valid placement, positive feedback
    glow:       0xfff0c0,   // Warm glow effects, light beams, fill lights

    // ─── LIGHTING ─────────────────────────────────────────────────────────────
    // Scene light colors — used in THREE.js light constructors

    ambient:    0x505060,   // Ambient light (cool-neutral)
    holyGold:   0xffd080,   // Toilet spotlight (warm gold beam)
    rimCool:    0x6688aa,   // Rim/back lighting (cool contrast)
    fillWarm:   0xfff0d0,   // Warm fill lights

    // ─── DRONES ─────────────────────────────────────────────────────────────
    // Three distinct pastels for upgrade drones (one per slot in a trio)

    droneAlpha:  0xf2b8c6,  // Soft rose — warm pastel, reads against all backgrounds
    droneBeta:   0xa8d8ea,  // Powder blue — cool pastel, distinct from player hoodie
    droneGamma:  0xc5e8b7,  // Sage green — neutral pastel, complements both others

    // ─── MEDIC DRONES ──────────────────────────────────────────────────────
    // Ambulance-themed rescue drones that collect defeated enemies

    medicBody:    0xf5f0e8,   // Off-white ambulance body — warm, not sterile
    medicCross:   0xe05050,   // Red cross accent — classic rescue, pops against cream
    medicBed:     0xddd2c0,   // Stretcher bed — matches tileLight, institutional

    // ─── FOREST ENVIRONMENT ────────────────────────────────────────────────
    // Earthy greens and browns for the forest scenario

    forestGrass:     0x5a7247,  // Forest floor grass
    forestDirt:      0x8b7355,  // Dirt path
    forestBark:      0x6b4423,  // Tree bark dark
    forestLeaf:      0x4a8c3f,  // Tree leaves bright
    forestLeafDark:  0x3a6b30,  // Canopy shadows, darker leaves
    forestBush:      0x5a8a4a,  // Bush foliage
    forestMoss:      0x7a9b6a,  // Moss, lichen, soft highlights
    forestPlanks:    0xa08060,  // Outhouse planks — weathered pine
    forestRoof:      0x6b5a4a,  // Outhouse roof shingles
    forestFog:       0x3a4a3a,  // Misty forest fog (replaces ink for forest scene)
    forestSunbeam:   0xffe8b0,  // Dappled sunlight shafts
    forestStone:     0x8a8a7a,  // Boulders, rocks
    forestFlower:    0xe87090,  // Wildflower pink
    forestFlowerY:   0xf0d060,  // Wildflower yellow

    // ─── FOREST ENEMIES ─────────────────────────────────────────────────────
    // Nature-themed, warm/earthy animal tones

    forestDeer:      0xc4a882,  // Fawn tan — gentle, warm
    forestSquirrel:  0xd4874a,  // Orange-brown — quick, bright
    forestBear:      0x5a4030,  // Dark umber — heavy, imposing
    forestFox:       0xe0842a,  // Bright orange — cunning, alert
    forestMoose:     0x6a5a4a,  // Gray-brown — massive, stoic
    forestRaccoon:   0x7a7a7a,  // Charcoal gray — sneaky, masked

    // ─── FOREST LIGHTING ────────────────────────────────────────────────────

    forestAmbient:   0x506850,  // Warm green ambient
    forestSun:       0xfff0c0,  // Warm sunlight through trees
    forestRim:       0x88aa66,  // Green-tinted rim light

    // ─── OCEAN ENVIRONMENT ─────────────────────────────────────────────────
    // Deep blues and teals for the ocean scenario

    oceanDeep:       0x1a3a5c,  // Deep ocean water — darkest blue
    oceanMid:        0x2e6b8a,  // Mid-depth water — teal blue
    oceanSurf:       0x4ab8c8,  // Surface water — bright cyan (distinct from player hoodie)
    oceanFoam:       0xe8f4f8,  // Whitecap foam — near-white with cool tint
    oceanBoatWood:   0x9b7850,  // Dinghy planks — warm weathered wood
    oceanBoatDark:   0x6b5030,  // Dinghy keel/trim — darker wood
    oceanRope:       0xc4b090,  // Rope/rigging — sandy tan
    oceanBuoy:       0xe05050,  // Red buoy — classic maritime red
    oceanBuoyYellow: 0xf0d040,  // Yellow buoy — safety yellow
    oceanFog:        0x2a4a6a,  // Ocean mist fog — deep blue-gray
    oceanHorizon:    0x88b8d8,  // Horizon sky blend — pale blue
    oceanSky:        0x6ca0c8,  // Sky above ocean — warm blue

    // ─── OCEAN ENEMIES ─────────────────────────────────────────────────────
    // Marine creatures + pirate — cool ocean tones

    oceanDolphin:    0x7a9ab0,  // Blue-gray dolphin — friendly, sleek
    oceanFlyfish:    0xc0d8e8,  // Silver-blue flying fish — bright, quick
    oceanShark:      0x506878,  // Dark slate shark — menacing, cool
    oceanPirate:     0x8b2020,  // Crimson pirate coat — bold, dangerous
    oceanPirateSkin: 0xddb88a,  // Pirate sun-weathered skin
    oceanTurtle:     0x4a8a50,  // Green sea turtle shell — earthy green
    oceanTurtleBelly:0xd4c890,  // Turtle underbelly — pale sandy
    oceanJelly:      0xd080c0,  // Pink-purple jellyfish bell — ethereal
    oceanJellyGlow:  0xe8a0e0,  // Jellyfish inner glow — brighter pink

    // ─── OCEAN LIGHTING ────────────────────────────────────────────────────

    oceanAmbient:    0x3a5a7a,  // Cool blue ambient
    oceanSun:        0xfff0d0,  // Warm sunlight on water
    oceanRim:        0x80b0d0,  // Cool rim light — ocean reflection

    // ─── AIRPLANE ENVIRONMENT ─────────────────────────────────────────────
    // Commercial airliner cabin interior — warm dim lighting, neutral upholstery

    airplaneCarpet:     0x2a3a5a,  // Dark navy cabin carpet
    airplaneSeat:       0x5a6a7a,  // Grey-blue fabric seat cushion
    airplaneSeatBack:   0x4a5a6a,  // Slightly darker seat back
    airplaneOverhead:   0xd8d4cc,  // Off-white overhead bin panels
    airplaneWall:       0xc8c4bc,  // Beige cabin wall panel
    airplaneWindow:     0x88c8e8,  // Sky blue through window portals
    airplaneCeiling:    0xe0dcd4,  // Light cream cabin ceiling
    airplaneCubicle:    0xb8b2a8,  // Light grey toilet cubicle panels
    airplaneDoor:       0xa8a298,  // Cubicle fold-door panel
    airplaneFog:        0x2a2a3a,  // Dark pressurized-cabin atmosphere
    airplaneStrip:      0xffeebb,  // Warm LED strip light glow
    airplaneFloor:      0x3a4a5a,  // Darker aisle carpet strip

    // ─── AIRPLANE ENEMIES ─────────────────────────────────────────────────
    // Air travelers — each a distinct archetype with warm/human tones

    airplaneNervous:    0xd4c4a4,  // Sandy beige — anxious, sweating
    airplaneBusiness:   0x2a3a5a,  // Dark navy — expensive suit
    airplaneStumbler:   0x7ab87a,  // Queasy green — motion sick
    airplaneAttendant:  0xc03040,  // Airline burgundy — professional
    airplaneMarshal:    0x4a4a5a,  // Dark charcoal — undercover authority
    airplaneUnruly:     0xe87830,  // Party orange — rowdy passenger

    // ─── AIRPLANE LIGHTING ────────────────────────────────────────────────

    airplaneAmbient:    0x504848,  // Warm dim cabin ambient
    airplaneSun:        0xfff8e0,  // Warm overhead LED strip
    airplaneRim:        0x6080a0,  // Cool window-spill blue

    // ─── RARITY GLOW ────────────────────────────────────────────────────────
    // Emissive/glow colors per upgrade rarity tier

    rarityCommon:    0xfaf5ef,  // Clean cream — matches PALETTE.white, subtle
    rarityRare:      0x9b8ec4,  // Soft violet — cool, noticeable, not overwhelming
    rarityLegendary: 0xffd93d,  // Rich gold — matches PALETTE.gold, unmistakable

    // ─── TOON SHADER PARAMS ───────────────────────────────────────────────────
    // Shared across all toon materials for consistency

    outlineColor: 0x1a1a2e, // Same as ink — unified outline language
};

// ─── OUTLINE WIDTHS ───────────────────────────────────────────────────────────
// Consistent outline scale per category

export const OUTLINE_WIDTH = {
    // Characters (skinned, animated)
    characterSmall: 0.02,   // Girls, small enemies
    characterMed:   0.03,   // Polite, Panicker, Power Walker, Player
    characterLarge: 0.04,   // Waddle Tank
    dancer:         0.025,  // Pee Dancer (between small and med)

    // Environment (static objects)
    environmentThin:  0.015, // Small fixtures, details
    environmentMed:   0.025, // Walls, panels, furniture
    environmentThick: 0.035, // Large structures, doors

    // Towers
    tower:          0.025,  // All towers

    // Forest characters
    forestSmall:    0.02,   // Squirrel, Raccoon
    forestMed:      0.03,   // Deer, Fox
    forestLarge:    0.04,   // Bear, Moose

    // Ocean characters
    oceanSmall:     0.02,   // Flying Fish, Jellyfish
    oceanMed:       0.03,   // Dolphin, Sea Turtle, Pirate
    oceanLarge:     0.04,   // Shark

    // Airplane characters
    airplaneSmall:  0.02,   // Unruly Passengers
    airplaneMed:    0.03,   // Nervous Flyer, Business Class, Flight Attendant
    airplaneLarge:  0.04,   // Turbulence Stumbler
};

// ─── GRADIENT MAP TONES ───────────────────────────────────────────────────────
// The 3-tone ramp values for toon shading (0-255 per tone)
// Shadow / Mid / Highlight — applied via gradient map or shader ramp

export const TOON_RAMP = {
    shadow:    0.35,    // Darkest tone multiplier (color * 0.35)
    mid:       0.85,    // Mid tone multiplier (color * 0.85)
    highlight: 1.0,     // Brightest tone (full color)
};

// ─── CSS CUSTOM PROPERTIES ────────────────────────────────────────────────────
// Call injectCSSPalette() once at startup to make palette available in CSS
// Usage in CSS: var(--pal-ink), var(--pal-gold), etc.

function hexToCSS(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

export function injectCSSPalette() {
    const root = document.documentElement.style;
    for (const [key, value] of Object.entries(PALETTE)) {
        root.setProperty(`--pal-${key}`, hexToCSS(value));
    }
}

// ─── PALETTE REFERENCE (copy-pasteable) ───────────────────────────────────────
//
// FOUNDATION        ink #1a1a2e │ charcoal #2d2b3d │ cream #fff4d9 │ white #faf5ef
// ENVIRONMENT       tileLight #ddd2c0 │ tileDark #c4b8a5 │ wall #7e8e96 │ fixture #a8a098 │ wood #8b6e4e │ carpet #5a6658
// PLAYER            hoodie #4a86c8 │ skin #ffccaa │ pants #3a3a4a
// ENEMIES           polite #d4a574 │ dancer #59c3e8 │ waddle #8b5e3c │ panicker #f5c842 │ power #20b89a │ girls #e84888
// TOWERS            magnet #f0a030 │ sign #e8d44a │ mop #9b59b6 │ ubik #6bcb77 │ potplant #c4663a
// UI/EFFECTS        gold #ffd93d │ danger #ff6b7a │ success #50c878 │ glow #fff0c0
// LIGHTING          ambient #505060 │ holyGold #ffd080 │ rimCool #6688aa │ fillWarm #fff0d0
// DRONES            alpha #f2b8c6 │ beta #a8d8ea │ gamma #c5e8b7
// MEDIC             medicBody #f5f0e8 │ medicCross #e05050 │ medicBed #ddd2c0
// RARITY            common #faf5ef │ rare #9b8ec4 │ legendary #ffd93d

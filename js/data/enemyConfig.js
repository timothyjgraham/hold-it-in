// Enemy Visual Configuration — per-type appearance, skeleton, and animation parameters
// Pure data module. No THREE.js dependency.
// All colors sourced from the master palette.

import { PALETTE } from './palette.js';

export const ENEMY_VISUAL_CONFIG = {

    // ─── POLITE KNOCKER ─── wave 1, baseline, 11 bones
    polite: {
        size: 1.5,
        bones: {
            neck: true,
            upperArms: true,
            forearms: false,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.80,  z: 0 },
            spine:       { x: 0,     y: 0.25,  z: 0 },
            chest:       { x: 0,     y: 0.30,  z: 0 },
            neck:        { x: 0,     y: 0.20,  z: 0 },
            head:        { x: 0,     y: 0.25,  z: 0 },
            upperArm_L:  { x: -0.45, y: 0.05,  z: 0 },
            upperArm_R:  { x: 0.45,  y: 0.05,  z: 0 },
            upperLeg_L:  { x: -0.15, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.15,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.40, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.40, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.80,
            torsoHeight: 1.40,
            torsoDepth: 0.50,
            headRadius: 0.35,
            limbThickness: 0.25,
            legHeight: 0.80,
            legSpacing: 0.15,
        },
        materialColors: {
            body: PALETTE.polite,
            skin: PALETTE.skin,
            legs: PALETTE.pants,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 1.0,
            bobHeight: 0.05,
            legSwing: 0.52,     // ~30°
            armSwing: 0.35,     // ~20°
            spineForwardLean: 0.087, // ~5°
        },
        restPose: {},
    },

    // ─── PEE DANCER ─── wave 3, fast swarm, 9 bones (no arms)
    dancer: {
        size: 1.25,
        bones: {
            neck: true,
            upperArms: false,
            forearms: false,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.70,  z: 0 },
            spine:       { x: 0,     y: 0.20,  z: 0 },
            chest:       { x: 0,     y: 0.25,  z: 0 },
            neck:        { x: 0,     y: 0.15,  z: 0 },
            head:        { x: 0,     y: 0.20,  z: 0 },
            upperLeg_L:  { x: -0.08, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.08,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.35, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.35, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.80,
            torsoHeight: 1.40,
            torsoDepth: 0.50,
            headRadius: 0.35,
            limbThickness: 0.25,
            legHeight: 0.70,
            legSpacing: 0.08,
        },
        materialColors: {
            body: PALETTE.dancer,
            skin: PALETTE.skin,
            legs: PALETTE.pants,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.4,
            bobHeight: 0.15,
            legSwing: 0.17,     // tiny micro-steps
            armSwing: 0,        // arms baked into mesh
            spineForwardLean: 0.26, // ~15° hunched
            bodyRock: 0.26,     // side-to-side 15°
        },
        restPose: {},
    },

    // ─── WADDLE TANK ─── wave 5, big slow tank, 15 bones (+ belly, no neck)
    waddle: {
        size: 2.0,
        bones: {
            neck: false,
            upperArms: true,
            forearms: true,
            feet: true,
            belly: true,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.80,  z: 0 },
            spine:       { x: 0,     y: 0.20,  z: 0 },
            chest:       { x: 0,     y: 0.30,  z: 0 },
            head:        { x: 0,     y: 0.30,  z: 0 },
            belly:       { x: 0,     y: -0.10, z: 0.30 },
            upperArm_L:  { x: -0.55, y: 0.05,  z: 0 },
            upperArm_R:  { x: 0.55,  y: 0.05,  z: 0 },
            forearm_L:   { x: 0,     y: -0.30, z: 0 },
            forearm_R:   { x: 0,     y: -0.30, z: 0 },
            upperLeg_L:  { x: -0.35, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.35,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.40, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.40, z: 0 },
            foot_L:      { x: 0,     y: -0.40, z: 0 },
            foot_R:      { x: 0,     y: -0.40, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.90,
            torsoHeight: 1.40,
            torsoDepth: 0.55,
            headRadius: 0.38,
            limbThickness: 0.28,
            legHeight: 0.80,
            legSpacing: 0.25,
            bellyRadius: 0.30,
        },
        materialColors: {
            body: PALETTE.waddle,
            skin: PALETTE.skin,
            legs: PALETTE.pants,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 1.4,
            bobHeight: 0.03,
            legSwing: 0.26,     // ~15° short steps
            armSwing: 0.17,
            bodyRock: 0.175,    // ~10° lateral sway
            spineForwardLean: 0.087,
            bellyDelay: 0.1,    // seconds of follow-through delay
            bellyOvershoot: 1.2, // 20% overshoot on belly jiggle
        },
        restPose: {},
    },

    // ─── PANICKER ─── wave 7, priority target, 13 bones
    panicker: {
        size: 1.6,
        bones: {
            neck: true,
            upperArms: true,
            forearms: true,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.80,  z: 0 },
            spine:       { x: 0,     y: 0.30,  z: 0 },
            chest:       { x: 0,     y: 0.35,  z: 0 },
            neck:        { x: 0,     y: 0.20,  z: 0 },
            head:        { x: 0,     y: 0.25,  z: 0 },
            upperArm_L:  { x: -0.35, y: 0.10,  z: 0 },
            upperArm_R:  { x: 0.35,  y: 0.10,  z: 0 },
            forearm_L:   { x: 0,     y: -0.35, z: 0 },
            forearm_R:   { x: 0,     y: -0.35, z: 0 },
            upperLeg_L:  { x: -0.12, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.12,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.40, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.40, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.60,
            torsoHeight: 1.40,
            torsoDepth: 0.50,
            headRadius: 0.35,
            limbThickness: 0.18,
            legHeight: 0.80,
            legSpacing: 0.14,
        },
        materialColors: {
            body: PALETTE.panicker,
            skin: PALETTE.skin,
            legs: PALETTE.pants,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.5,
            bobHeight: 0.08,
            legSwing: 0.70,     // ~40° fast pump
            armSwing: 1.20,     // wide flailing arcs
            spineForwardLean: 0.087,
            spineTwist: 0.175,  // ~10° alternating with stride
            armFreqL: 1.3,      // left arm 1.3x speed (asymmetric)
            armFreqR: 1.0,
        },
        restPose: {},
    },

    // ─── POWER WALKER ─── wave 9, slow immune, 15 bones (full hierarchy)
    powerwalker: {
        size: 1.4,
        bones: {
            neck: true,
            upperArms: true,
            forearms: true,
            feet: true,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.80,  z: 0 },
            spine:       { x: 0,     y: 0.25,  z: 0 },
            chest:       { x: 0,     y: 0.30,  z: 0 },
            neck:        { x: 0,     y: 0.20,  z: 0 },
            head:        { x: 0,     y: 0.20,  z: 0 },
            upperArm_L:  { x: -0.45, y: 0.05,  z: 0 },
            upperArm_R:  { x: 0.45,  y: 0.05,  z: 0 },
            forearm_L:   { x: 0,     y: -0.25, z: 0 },
            forearm_R:   { x: 0,     y: -0.25, z: 0 },
            upperLeg_L:  { x: -0.15, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.15,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.40, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.40, z: 0 },
            foot_L:      { x: 0,     y: -0.40, z: 0.10 },
            foot_R:      { x: 0,     y: -0.40, z: 0.10 },
        },
        bodyDimensions: {
            torsoWidth: 0.80,
            torsoHeight: 1.40,
            torsoDepth: 0.50,
            headRadius: 0.30,
            limbThickness: 0.20,
            legHeight: 0.80,
            legSpacing: 0.15,
        },
        materialColors: {
            body: PALETTE.power,
            skin: PALETTE.skin,
            legs: PALETTE.pants,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.7,
            bobHeight: 0.02,    // eerily smooth
            legSwing: 0.61,     // ~35° strong deliberate swing
            armSwing: 0.61,     // matches leg swing
            spineForwardLean: 0, // perfectly upright
        },
        restPose: {},
    },

    // ─── THE GIRLS ─── wave 10, cluster swarm, 9 bones (no arms)
    girls: {
        size: 0.85,
        bones: {
            neck: true,
            upperArms: false,
            forearms: false,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.75,  z: 0 },
            spine:       { x: 0,     y: 0.20,  z: 0 },
            chest:       { x: 0,     y: 0.25,  z: 0 },
            neck:        { x: 0,     y: 0.15,  z: 0 },
            head:        { x: 0,     y: 0.20,  z: 0 },
            upperLeg_L:  { x: -0.10, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.10,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.35, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.35, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.70,
            torsoHeight: 1.20,
            torsoDepth: 0.45,
            headRadius: 0.35,
            ponytailRadius: 0.15,
            limbThickness: 0.18,
            legHeight: 0.70,
            legSpacing: 0.10,
        },
        materialColors: {
            body: PALETTE.girls,
            skin: PALETTE.skin,
            legs: PALETTE.pants,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.9,
            bobHeight: 0.04,
            legSwing: 0.44,     // ~25° casual stride
            armSwing: 0,        // arms baked into mesh
            hipSway: 0.10,
            spineForwardLean: 0.05,
        },
        restPose: {},
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // FOREST SCENARIO — anthropomorphic woodland creatures
    // Same skeleton pipeline, forest-themed geometry + animation params
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── DEER ─── baseline, gentle approach (→ Polite Knocker)
    deer: {
        size: 1.5,
        bones: {
            neck: true,
            upperArms: true,
            forearms: false,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.80,  z: 0 },
            spine:       { x: 0,     y: 0.25,  z: 0 },
            chest:       { x: 0,     y: 0.30,  z: 0 },
            neck:        { x: 0,     y: 0.25,  z: 0 },
            head:        { x: 0,     y: 0.25,  z: 0 },
            upperArm_L:  { x: -0.40, y: 0.05,  z: 0 },
            upperArm_R:  { x: 0.40,  y: 0.05,  z: 0 },
            upperLeg_L:  { x: -0.12, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.12,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.40, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.40, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.65,
            torsoHeight: 1.30,
            torsoDepth: 0.45,
            headRadius: 0.28,
            limbThickness: 0.18,
            legHeight: 0.85,
            legSpacing: 0.12,
            neckLength: 0.30,
            antlerSize: 0.25,
            earSize: 0.15,
        },
        materialColors: {
            body: PALETTE.forestDeer,
            skin: PALETTE.forestDeer,    // Deer: face same color as body
            legs: PALETTE.forestDeer,    // Legs match body (no pants!)
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 1.0,
            bobHeight: 0.04,
            legSwing: 0.48,
            armSwing: 0.30,
            spineForwardLean: 0.10,
            neckBob: 0.08,
        },
        restPose: {},
    },

    // ─── SQUIRREL ─── fast swarm, bouncy (→ Pee Dancer)
    squirrel: {
        size: 1.0,
        bones: {
            neck: true,
            upperArms: false,
            forearms: false,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.60,  z: 0 },
            spine:       { x: 0,     y: 0.18,  z: 0 },
            chest:       { x: 0,     y: 0.22,  z: 0 },
            neck:        { x: 0,     y: 0.12,  z: 0 },
            head:        { x: 0,     y: 0.18,  z: 0 },
            upperLeg_L:  { x: -0.10, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.10,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.30, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.30, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.55,
            torsoHeight: 1.00,
            torsoDepth: 0.45,
            headRadius: 0.32,
            limbThickness: 0.16,
            legHeight: 0.60,
            legSpacing: 0.10,
            tailLength: 0.65,
            tailRadius: 0.18,
            earSize: 0.12,
        },
        materialColors: {
            body: PALETTE.forestSquirrel,
            skin: PALETTE.forestSquirrel,
            legs: PALETTE.forestSquirrel,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.35,
            bobHeight: 0.18,
            legSwing: 0.20,
            armSwing: 0,
            spineForwardLean: 0.20,
            bodyRock: 0.15,
            tailWag: 0.40,
        },
        restPose: {},
    },

    // ─── BEAR ─── big tank, lumbering (→ Waddle Tank)
    bear: {
        size: 2.2,
        bones: {
            neck: false,
            upperArms: true,
            forearms: true,
            feet: true,
            belly: true,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.85,  z: 0 },
            spine:       { x: 0,     y: 0.22,  z: 0 },
            chest:       { x: 0,     y: 0.30,  z: 0 },
            head:        { x: 0,     y: 0.30,  z: 0 },
            belly:       { x: 0,     y: -0.10, z: 0.30 },
            upperArm_L:  { x: -0.55, y: 0.05,  z: 0 },
            upperArm_R:  { x: 0.55,  y: 0.05,  z: 0 },
            forearm_L:   { x: 0,     y: -0.30, z: 0 },
            forearm_R:   { x: 0,     y: -0.30, z: 0 },
            upperLeg_L:  { x: -0.30, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.30,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.40, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.40, z: 0 },
            foot_L:      { x: 0,     y: -0.40, z: 0 },
            foot_R:      { x: 0,     y: -0.40, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 1.00,
            torsoHeight: 1.50,
            torsoDepth: 0.65,
            headRadius: 0.38,
            limbThickness: 0.30,
            legHeight: 0.80,
            legSpacing: 0.25,
            bellyRadius: 0.35,
            earSize: 0.14,
            snoutLength: 0.15,
        },
        materialColors: {
            body: PALETTE.forestBear,
            skin: PALETTE.forestBear,
            legs: PALETTE.forestBear,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 1.5,
            bobHeight: 0.03,
            legSwing: 0.22,
            armSwing: 0.15,
            bodyRock: 0.18,
            spineForwardLean: 0.12,
            bellyDelay: 0.12,
            bellyOvershoot: 1.3,
        },
        restPose: {},
    },

    // ─── FOX ─── priority target, cunning (→ Panicker)
    fox: {
        size: 1.4,
        bones: {
            neck: true,
            upperArms: true,
            forearms: true,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.75,  z: 0 },
            spine:       { x: 0,     y: 0.25,  z: 0 },
            chest:       { x: 0,     y: 0.30,  z: 0 },
            neck:        { x: 0,     y: 0.18,  z: 0 },
            head:        { x: 0,     y: 0.22,  z: 0 },
            upperArm_L:  { x: -0.35, y: 0.08,  z: 0 },
            upperArm_R:  { x: 0.35,  y: 0.08,  z: 0 },
            forearm_L:   { x: 0,     y: -0.28, z: 0 },
            forearm_R:   { x: 0,     y: -0.28, z: 0 },
            upperLeg_L:  { x: -0.12, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.12,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.38, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.38, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.55,
            torsoHeight: 1.20,
            torsoDepth: 0.42,
            headRadius: 0.28,
            limbThickness: 0.16,
            legHeight: 0.78,
            legSpacing: 0.12,
            earSize: 0.18,
            snoutLength: 0.20,
            tailLength: 0.60,
            tailRadius: 0.14,
        },
        materialColors: {
            body: PALETTE.forestFox,
            skin: PALETTE.cream,       // Fox: cream chest/muzzle
            legs: PALETTE.forestFox,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.5,
            bobHeight: 0.07,
            legSwing: 0.65,
            armSwing: 1.00,
            spineForwardLean: 0.10,
            spineTwist: 0.15,
            tailWag: 0.35,
            armFreqL: 1.2,
            armFreqR: 1.0,
        },
        restPose: {},
    },

    // ─── MOOSE ─── slow-immune powerhouse (→ Power Walker)
    moose: {
        size: 1.8,
        bones: {
            neck: true,
            upperArms: true,
            forearms: true,
            feet: true,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.85,  z: 0 },
            spine:       { x: 0,     y: 0.25,  z: 0 },
            chest:       { x: 0,     y: 0.32,  z: 0 },
            neck:        { x: 0,     y: 0.22,  z: 0 },
            head:        { x: 0,     y: 0.22,  z: 0 },
            upperArm_L:  { x: -0.48, y: 0.05,  z: 0 },
            upperArm_R:  { x: 0.48,  y: 0.05,  z: 0 },
            forearm_L:   { x: 0,     y: -0.28, z: 0 },
            forearm_R:   { x: 0,     y: -0.28, z: 0 },
            upperLeg_L:  { x: -0.18, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.18,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.42, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.42, z: 0 },
            foot_L:      { x: 0,     y: -0.42, z: 0.10 },
            foot_R:      { x: 0,     y: -0.42, z: 0.10 },
        },
        bodyDimensions: {
            torsoWidth: 0.85,
            torsoHeight: 1.50,
            torsoDepth: 0.55,
            headRadius: 0.32,
            limbThickness: 0.22,
            legHeight: 0.85,
            legSpacing: 0.18,
            antlerSize: 0.50,
            earSize: 0.14,
            snoutLength: 0.18,
        },
        materialColors: {
            body: PALETTE.forestMoose,
            skin: PALETTE.forestMoose,
            legs: PALETTE.forestMoose,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.75,
            bobHeight: 0.02,
            legSwing: 0.55,
            armSwing: 0.55,
            spineForwardLean: 0,
        },
        restPose: {},
    },

    // ─── RACCOON ─── sneaky cluster swarm (→ The Girls)
    raccoon: {
        size: 0.85,
        bones: {
            neck: true,
            upperArms: false,
            forearms: false,
            feet: false,
            belly: false,
        },
        bonePositions: {
            root:        { x: 0,     y: 0.65,  z: 0 },
            spine:       { x: 0,     y: 0.18,  z: 0 },
            chest:       { x: 0,     y: 0.22,  z: 0 },
            neck:        { x: 0,     y: 0.14,  z: 0 },
            head:        { x: 0,     y: 0.18,  z: 0 },
            upperLeg_L:  { x: -0.10, y: 0,     z: 0 },
            upperLeg_R:  { x: 0.10,  y: 0,     z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.32, z: 0 },
            lowerLeg_R:  { x: 0,     y: -0.32, z: 0 },
        },
        bodyDimensions: {
            torsoWidth: 0.60,
            torsoHeight: 1.00,
            torsoDepth: 0.45,
            headRadius: 0.30,
            limbThickness: 0.16,
            legHeight: 0.65,
            legSpacing: 0.10,
            tailLength: 0.50,
            tailRadius: 0.10,
            earSize: 0.12,
            maskWidth: 0.22,
        },
        materialColors: {
            body: PALETTE.forestRaccoon,
            skin: PALETTE.cream,        // Raccoon: cream face with dark mask
            legs: PALETTE.forestRaccoon,
            outline: PALETTE.ink,
        },
        animationParams: {
            walkDuration: 0.8,
            bobHeight: 0.05,
            legSwing: 0.40,
            armSwing: 0,
            hipSway: 0.12,
            spineForwardLean: 0.08,
            tailWag: 0.30,
        },
        restPose: {},
    },
};

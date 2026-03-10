// Player Visual Configuration — seated character on toilet with phone
// Pure data module. No THREE.js dependency.
// Bone positions encode the SEATED configuration directly (thighs forward, shins down).

export const PLAYER_VISUAL_CONFIG = {
    player: {
        size: 1.8,
        bones: {
            neck: true,
            upperArms: true,
            forearms: true,
            hands: true,      // hand bones for phone interaction
            thumb: true,       // right-hand thumb for phone tapping
            feet: true,
            belly: false,
        },
        bonePositions: {
            // Root = pelvis, seated on toilet (y=0 in local space)
            root:        { x: 0,     y: 0,     z: 0 },
            // Spine chain — slight forward lean encoded in z offsets
            spine:       { x: 0,     y: 0.22,  z: -0.02 },
            chest:       { x: 0,     y: 0.28,  z: -0.01 },
            neck:        { x: 0,     y: 0.18,  z: 0 },
            head:        { x: 0,     y: 0.20,  z: -0.03 },
            // Arms — longer, thinner, reaching forward to hold phone
            upperArm_L:  { x: -0.38, y: 0.02,  z: 0.02 },
            upperArm_R:  { x: 0.38,  y: 0.02,  z: 0.02 },
            forearm_L:   { x: 0.18,  y: -0.08, z: 0.40 },
            forearm_R:   { x: -0.18, y: -0.08, z: 0.40 },
            hand_L:      { x: 0.08,  y: -0.04, z: 0.28 },
            hand_R:      { x: -0.08, y: -0.04, z: 0.28 },
            thumb_R:     { x: -0.02, y: 0.01,  z: 0.04 },
            // Legs — seated: thigh extends forward, shin hangs down
            upperLeg_L:  { x: -0.14, y: -0.03, z: 0 },
            upperLeg_R:  { x: 0.14,  y: -0.03, z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.02, z: 0.33 },
            lowerLeg_R:  { x: 0,     y: -0.02, z: 0.33 },
            foot_L:      { x: 0,     y: -0.33, z: 0.02 },
            foot_R:      { x: 0,     y: -0.33, z: 0.02 },
        },
        bodyDimensions: {
            torsoWidth: 0.50,       // was 0.80 — narrower (old was wider than arms were long!)
            torsoHeight: 0.65,      // was 0.55 — taller
            torsoDepth: 0.32,       // was 0.50 — thinner front-to-back
            headRadius: 0.26,       // was 0.30 — slightly smaller
            limbThickness: 0.18,    // was 0.28 — arms were wider than they were long!
            legSpacing: 0.14,
            handSize: 0.10,         // was 0.13
        },
        materialColors: {
            body: 0x4a86c8,    // blue hoodie
            skin: 0xffccaa,    // skin tone
            legs: 0x2c3e50,    // dark pants
            outline: 0x1a1a1a,
        },
        restPose: {
            head: { x: -0.20 },   // looking down at phone
        },
    },
};

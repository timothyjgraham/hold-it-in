// Player Visual Configuration — seated character on toilet with phone
// Pure data module. No THREE.js dependency.
// Bone positions encode the SEATED configuration directly (thighs forward, shins down).

export const PLAYER_VISUAL_CONFIG = {
    player: {
        size: 1.2,
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
            // Arms — positioned to hold phone in lap area
            upperArm_L:  { x: -0.35, y: 0,     z: 0.05 },
            upperArm_R:  { x: 0.35,  y: 0,     z: 0.05 },
            forearm_L:   { x: 0.08,  y: -0.18, z: 0.10 },
            forearm_R:   { x: -0.08, y: -0.18, z: 0.10 },
            hand_L:      { x: 0.04,  y: -0.10, z: 0.03 },
            hand_R:      { x: -0.04, y: -0.10, z: 0.03 },
            thumb_R:     { x: -0.02, y: 0.01,  z: 0.04 },
            // Legs — seated: thigh extends forward, shin hangs down
            upperLeg_L:  { x: -0.12, y: -0.03, z: 0 },
            upperLeg_R:  { x: 0.12,  y: -0.03, z: 0 },
            lowerLeg_L:  { x: 0,     y: -0.02, z: 0.33 },
            lowerLeg_R:  { x: 0,     y: -0.02, z: 0.33 },
            foot_L:      { x: 0,     y: -0.33, z: 0.02 },
            foot_R:      { x: 0,     y: -0.33, z: 0.02 },
        },
        bodyDimensions: {
            torsoWidth: 0.70,
            torsoHeight: 0.50,
            torsoDepth: 0.40,
            headRadius: 0.27,
            limbThickness: 0.16,
            legSpacing: 0.12,
            handSize: 0.07,
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

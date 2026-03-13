// AnimationLibrary.js — AAA keyframe clips for 24 enemy types (6 office + 6 forest + 6 ocean + 6 airplane)
// 104 clips: walk/bash/hit/death per type + waddle/bear panic_sprint + L/R bash variants
// Rich multi-bone animation with proper weight shift, secondary motion,
// and unique character personality in every movement.
// Clip cache + lazy construction. Quaternion/keyframe helpers.

import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

export function quatFromAxisAngle(axis, angle) {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(axis, angle);
    return [q.x, q.y, q.z, q.w];
}

function quatFromEuler(x, y, z) {
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(x || 0, y || 0, z || 0, 'XYZ'));
    return [q.x, q.y, q.z, q.w];
}

export function buildRotationTrack(boneName, times, angles, axis) {
    const values = [];
    for (const a of angles) {
        values.push(...quatFromAxisAngle(axis, a));
    }
    return new THREE.QuaternionKeyframeTrack(boneName + '.quaternion', times, values);
}

function eulerTrack(boneName, times, eulers) {
    const values = [];
    for (const [x, y, z] of eulers) {
        values.push(...quatFromEuler(x, y, z));
    }
    return new THREE.QuaternionKeyframeTrack(boneName + '.quaternion', times, values);
}

function posTrack(boneName, times, positions) {
    const values = [];
    for (const [x, y, z] of positions) {
        values.push(x, y, z);
    }
    return new THREE.VectorKeyframeTrack(boneName + '.position', times, values);
}

function scaleTrack(boneName, times, scales) {
    const values = [];
    for (const [x, y, z] of scales) {
        values.push(x, y, z);
    }
    return new THREE.VectorKeyframeTrack(boneName + '.scale', times, values);
}


// ═══════════════════════════════════════════════════════════════════════
// POLITE KNOCKER — civilized gentleman stride, measured composure
// Personality: patient, proper, waits his turn... but still needs to GO
// ═══════════════════════════════════════════════════════════════════════

function _politeWalk() {
    const c = ENEMY_VISUAL_CONFIG.polite;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.25, 0.5, 0.75, dur];

    // Spine counter-twist: shoulders rotate opposite to hips
    const twist = 0.09;
    // Lateral sway toward planted foot
    const sway = 0.04;

    return new THREE.AnimationClip('polite_walk', dur, [
        // Root: bob down at contact, up at passing position
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: forward lean + counter-twist + weight-shift sway
        eulerTrack('spine', t, [
            [lean, twist, sway], [lean, 0, 0], [lean, -twist, -sway],
            [lean, 0, 0], [lean, twist, sway]
        ]),
        // Head: counter-twist stabilization + downward gaze (uncomfortable)
        eulerTrack('head', t, [
            [-0.08, -twist * 0.6, 0], [-0.05, 0, 0], [-0.08, twist * 0.6, 0],
            [-0.05, 0, 0], [-0.08, -twist * 0.6, 0]
        ]),
        // Arms: held across groin (busting to pee!), slight squeeze with each step
        eulerTrack('upperArm_L', t, [
            [0.7, 0, 0.6], [0.72, 0, 0.62], [0.7, 0, 0.6], [0.72, 0, 0.62], [0.7, 0, 0.6]
        ]),
        eulerTrack('upperArm_R', t, [
            [0.7, 0, -0.6], [0.72, 0, -0.62], [0.7, 0, -0.6], [0.72, 0, -0.62], [0.7, 0, -0.6]
        ]),
        // Upper legs: measured stride
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: proper knee bend — flex peaks during swing-through
        buildRotationTrack('lowerLeg_L', t, [-0.10, -0.55, -0.15, -0.65, -0.10], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.15, -0.65, -0.10, -0.55, -0.15], AXIS_X),
    ]);
}

function _politeBashR() {
    const c = ENEMY_VISUAL_CONFIG.polite;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 1.0;

    // Right arm lifts from groin hold → knock × 3 → returns to groin
    // Polite knock-knock-knock with pauses to listen
    const t = [0, 0.15, 0.22, 0.35, 0.42, 0.55, 0.62, 0.78, dur];

    return new THREE.AnimationClip('polite_bash_door_R', dur, [
        // Root: subtle forward lean into each knock
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0], [0, ry, 0.06 * s], [0, ry, 0.02 * s],
            [0, ry, 0.06 * s], [0, ry, 0.02 * s], [0, ry, 0.06 * s],
            [0, ry, 0.01 * s], [0, ry, 0]
        ]),
        // Spine: leans into each knock, slight tilt toward knocking arm
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.03, 0, 0], [lean - 0.12, 0, -0.04], [lean - 0.04, 0, 0],
            [lean - 0.12, 0, -0.04], [lean - 0.04, 0, 0.03], [lean - 0.12, 0, -0.04],
            [lean - 0.03, 0, 0], [lean, 0, 0]
        ]),
        // Right arm (knocking): groin hold → raise → knock × 3 → return
        eulerTrack('upperArm_R', t, [
            [0.7, 0, -0.6],     // groin hold
            [1.8, 0, -0.1],     // arm raised high, fist ready
            [0.8, 0, 0.1],      // first knock — fist contacts door
            [1.3, 0, 0],        // recoil
            [0.8, 0, 0.1],      // second knock
            [1.2, 0, 0],        // recoil
            [0.8, 0, 0.1],      // third knock
            [0.9, 0, -0.3],     // arm lowering back
            [0.7, 0, -0.6],     // return to groin hold
        ]),
        // Left arm (stays holding groin, squeezes harder on impacts)
        eulerTrack('upperArm_L', t, [
            [0.7, 0, 0.6], [0.72, 0, 0.62], [0.75, 0, 0.65], [0.72, 0, 0.62],
            [0.75, 0, 0.65], [0.72, 0, 0.62], [0.75, 0, 0.65],
            [0.72, 0, 0.62], [0.7, 0, 0.6]
        ]),
        // Head: tilts to listen between knocks
        eulerTrack('head', t, [
            [-0.06, 0, 0], [-0.02, 0, 0], [-0.08, 0, 0.05], [-0.04, 0.14, 0.08],
            [-0.08, 0, -0.05], [-0.04, -0.12, -0.06], [-0.08, 0, 0.04],
            [-0.04, 0.05, 0.03], [-0.06, 0, 0]
        ]),
        // Legs: shift weight forward on knocks
        buildRotationTrack('upperLeg_L', t,
            [0, -0.03, 0.06, 0.03, 0.06, 0.03, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.03, 0.06, 0.03, 0.06, 0.03, 0.06, 0.02, 0], AXIS_X),
        // Knees absorb lean
        buildRotationTrack('lowerLeg_L', t,
            [0, 0.02, -0.10, -0.05, -0.10, -0.05, -0.10, -0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.02, -0.10, -0.05, -0.10, -0.05, -0.10, -0.04, 0], AXIS_X),
    ]);
}

function _politeBashL() {
    // Mirror of _politeBashR — left arm knocks, right holds groin
    const c = ENEMY_VISUAL_CONFIG.polite;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 1.0;

    const t = [0, 0.15, 0.22, 0.35, 0.42, 0.55, 0.62, 0.78, dur];

    return new THREE.AnimationClip('polite_bash_door_L', dur, [
        // Root: same forward lean
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0], [0, ry, 0.06 * s], [0, ry, 0.02 * s],
            [0, ry, 0.06 * s], [0, ry, 0.02 * s], [0, ry, 0.06 * s],
            [0, ry, 0.01 * s], [0, ry, 0]
        ]),
        // Spine: leans into each knock, slight tilt toward left arm
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.03, 0, 0], [lean - 0.12, 0, 0.04], [lean - 0.04, 0, 0],
            [lean - 0.12, 0, 0.04], [lean - 0.04, 0, -0.03], [lean - 0.12, 0, 0.04],
            [lean - 0.03, 0, 0], [lean, 0, 0]
        ]),
        // Left arm (knocking): groin hold → raise → knock × 3 → return
        eulerTrack('upperArm_L', t, [
            [0.7, 0, 0.6],      // groin hold
            [1.8, 0, 0.1],      // arm raised high
            [0.8, 0, -0.1],     // first knock
            [1.3, 0, 0],        // recoil
            [0.8, 0, -0.1],     // second knock
            [1.2, 0, 0],        // recoil
            [0.8, 0, -0.1],     // third knock
            [0.9, 0, 0.3],      // arm lowering
            [0.7, 0, 0.6],      // return to groin hold
        ]),
        // Right arm (stays holding groin, squeezes harder on impacts)
        eulerTrack('upperArm_R', t, [
            [0.7, 0, -0.6], [0.72, 0, -0.62], [0.75, 0, -0.65], [0.72, 0, -0.62],
            [0.75, 0, -0.65], [0.72, 0, -0.62], [0.75, 0, -0.65],
            [0.72, 0, -0.62], [0.7, 0, -0.6]
        ]),
        // Head: tilts to listen (mirrored from R version)
        eulerTrack('head', t, [
            [-0.06, 0, 0], [-0.02, 0, 0], [-0.08, 0, -0.05], [-0.04, -0.14, -0.08],
            [-0.08, 0, 0.05], [-0.04, 0.12, 0.06], [-0.08, 0, -0.04],
            [-0.04, -0.05, -0.03], [-0.06, 0, 0]
        ]),
        // Legs: same as R version
        buildRotationTrack('upperLeg_L', t,
            [0, -0.03, 0.06, 0.03, 0.06, 0.03, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.03, 0.06, 0.03, 0.06, 0.03, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0.02, -0.10, -0.05, -0.10, -0.05, -0.10, -0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.02, -0.10, -0.05, -0.10, -0.05, -0.10, -0.04, 0], AXIS_X),
    ]);
}

function _politeHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];
    return new THREE.AnimationClip('polite_hit_react', dur, [
        // Stumble backward (additive position delta)
        posTrack('root', t, [[0, 0, 0], [0, -0.04, -0.10], [0, -0.01, -0.05], [0, 0, -0.02], [0, 0, 0]]),
        // Spine flinch forward + slight lateral (additive rotation from identity)
        eulerTrack('spine', t, [
            [0, 0, 0], [0.14, 0, 0.04], [0.05, 0, 0.01], [0.01, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _politeDeath() {
    const c = ENEMY_VISUAL_CONFIG.polite;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;
    const t = [0, 0.10, 0.25, 0.38, 0.50, dur];

    return new THREE.AnimationClip('polite_death', dur, [
        // Staggers, sinks to knees, tips forward
        posTrack('root', t, [
            [0, ry, 0], [0, ry - 0.05, -0.08 * s], [0.05 * s, ry * 0.6, -0.04 * s],
            [0.03 * s, ry * 0.25, 0.05 * s], [0, ry * 0.1, 0.12 * s], [0, 0, 0.15 * s]
        ]),
        // Tries to stay upright, then collapses forward
        eulerTrack('spine', t, [
            [-0.087, 0, 0], [-0.15, 0, 0.05], [-0.5, 0, 0.10],
            [-0.9, 0, 0.12], [-1.3, 0, 0.08], [-1.5, 0, 0.05]
        ]),
        // Arms reach out then go limp (multi-axis)
        eulerTrack('upperArm_L', t, [
            [0, 0, 0], [0.3, 0, -0.15], [0.6, 0, -0.35],
            [0.3, 0, -0.40], [0.1, 0, -0.30], [-0.2, 0, -0.20]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0], [0.2, 0, 0.15], [0.5, 0, 0.35],
            [0.2, 0, 0.40], [0, 0, 0.30], [-0.3, 0, 0.20]
        ]),
        // Legs buckle
        buildRotationTrack('upperLeg_L', t, [0, 0.3, 0.7, 0.9, 1.0, 1.1], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.2, 0.5, 0.8, 0.95, 1.0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.3, -0.8, -1.2, -1.5, -1.6], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.2, -0.7, -1.1, -1.4, -1.5], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// PEE DANCER — frantic hopping, knees together, desperate urgency
// Personality: tiny, fast, bouncing from foot to foot, GOTTA GO
// ═══════════════════════════════════════════════════════════════════════

function _dancerHopWalk() {
    const c = ENEMY_VISUAL_CONFIG.dancer;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const rock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.1, 0.2, 0.3, dur];

    return new THREE.AnimationClip('dancer_hop_walk', dur, [
        // Root: BIG vertical hops — airborne between steps
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Strong squash on landing, stretch on jump
        scaleTrack('root', t, [
            [1.14, 0.80, 1.14], [0.90, 1.16, 0.90], [1.14, 0.80, 1.14],
            [0.90, 1.16, 0.90], [1.14, 0.80, 1.14]
        ]),
        // Spine: hunched forward, dramatic side-to-side desperation rock
        eulerTrack('spine', t, [
            [-0.22, 0, -rock], [-0.16, 0, 0], [-0.22, 0, rock],
            [-0.16, 0, 0], [-0.22, 0, -rock]
        ]),
        // Chest: delayed follow-through on rock (secondary motion)
        eulerTrack('chest', t, [
            [0, 0, 0], [0, 0, -rock * 0.4], [0, 0, 0],
            [0, 0, rock * 0.4], [0, 0, 0]
        ]),
        // Head: bobbing hard + slight frantic shake
        eulerTrack('head', t, [
            [0.12, 0.06, rock * 0.3], [-0.06, -0.08, 0],
            [0.12, -0.06, -rock * 0.3], [-0.06, 0.08, 0],
            [0.12, 0.06, rock * 0.3]
        ]),
        // Legs: knees together, tiny desperate micro-steps
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: turned inward (knees pressed together — gotta go!)
        eulerTrack('lowerLeg_L', t, [
            [-0.25, 0, 0.20], [-0.12, 0, 0.20], [-0.25, 0, 0.20],
            [-0.12, 0, 0.20], [-0.25, 0, 0.20]
        ]),
        eulerTrack('lowerLeg_R', t, [
            [-0.25, 0, -0.20], [-0.12, 0, -0.20], [-0.25, 0, -0.20],
            [-0.12, 0, -0.20], [-0.25, 0, -0.20]
        ]),
    ]);
}

function _dancerBash() {
    const c = ENEMY_VISUAL_CONFIG.dancer;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;

    // Rapid-fire whole-body door slams
    const t = [0, 0.07, 0.14, 0.22, 0.30, 0.38, 0.46, 0.54, dur];

    return new THREE.AnimationClip('dancer_bash_door', dur, [
        // Root: lunges into door, bounces back, repeat
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.12 * s], [0, ry - 0.04, 0], [0, ry + 0.06, 0],
            [0, ry, 0.14 * s], [0, ry - 0.04, 0], [0, ry + 0.05, 0],
            [0, ry, 0.12 * s], [0, ry, 0]
        ]),
        // Squash on every impact, stretch on recoil
        scaleTrack('root', t, [
            [1, 1, 1], [1.18, 0.78, 1.18], [0.88, 1.15, 0.88], [1, 1, 1],
            [1.20, 0.76, 1.20], [0.86, 1.16, 0.86], [1, 1, 1],
            [1.16, 0.80, 1.16], [1, 1, 1]
        ]),
        // Spine: slams forward, wobbles on recoil
        eulerTrack('spine', t, [
            [-0.15, 0, 0], [-0.42, 0, 0], [0.05, 0, 0.12], [-0.10, 0, -0.08],
            [-0.48, 0, 0], [0.08, 0, -0.12], [-0.10, 0, 0.06],
            [-0.42, 0, 0], [-0.15, 0, 0]
        ]),
        // Head: shaking in desperation between slams
        eulerTrack('head', t, [
            [0, 0, 0], [0.15, 0, 0], [-0.08, 0.14, 0], [0, 0, 0],
            [0.18, 0, 0], [-0.06, -0.14, 0], [0, 0, 0],
            [0.12, 0, 0], [0, 0, 0]
        ]),
        // Legs: stomping in frustration between slams
        buildRotationTrack('upperLeg_L', t,
            [0, 0.22, -0.10, 0.18, 0.25, -0.10, 0.20, 0.22, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, 0.25, -0.10, 0.20, 0.22, -0.10, 0.18, 0.25, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.25, -0.40, -0.15, -0.28, -0.42, -0.15, -0.25, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, -0.28, -0.42, -0.15, -0.25, -0.40, -0.15, -0.28, 0], AXIS_X),
    ]);
}

function _dancerHitReact() {
    const dur = 0.25;
    const t = [0, 0.03, 0.10, 0.18, dur];
    return new THREE.AnimationClip('dancer_hit_react', dur, [
        // Bounces upward then settles (additive position delta)
        posTrack('root', t, [[0, 0, 0], [0, 0.06, -0.05], [0, -0.03, -0.02], [0, 0.01, -0.01], [0, 0, 0]]),
        // Spine crunch forward (additive rotation from identity)
        buildRotationTrack('spine', t, [0, 0.10, 0.03, 0.01, 0], AXIS_X),
    ]);
}

function _dancerDeath() {
    const c = ENEMY_VISUAL_CONFIG.dancer;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const t = [0, 0.08, 0.18, 0.30, 0.42, dur];

    return new THREE.AnimationClip('dancer_death', dur, [
        // Squats down, deflates, splats
        posTrack('root', t, [
            [0, ry, 0], [0, ry * 0.75, 0], [0.04, ry * 0.3, 0.03],
            [0.06, ry * 0.1, 0.04], [0.05, ry * 0.02, 0.04], [0.05, 0, 0.04]
        ]),
        // Spine crumples
        eulerTrack('spine', t, [
            [-0.15, 0, 0], [-0.4, 0, 0.15], [-0.8, 0, 0.25],
            [-1.1, 0, 0.18], [-1.3, 0, 0.10], [-1.5, 0, 0.05]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.3, 0.5, 0.6, 0.7, 0.7], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.2, 0.4, 0.5, 0.6, 0.6], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.3, -0.6, -0.8, -0.9, -0.9], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.2, -0.5, -0.7, -0.8, -0.8], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// WADDLE TANK — heavy penguin waddle, belly jiggle, unstoppable mass
// Personality: huge, slow, heavy, belly leads the way, shakes the earth
// ═══════════════════════════════════════════════════════════════════════

function _waddleWaddle() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const bodyRock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.35, 0.7, 1.05, dur];

    // Belly follow-through overshoot
    const bellyRock = bodyRock * c.animationParams.bellyOvershoot;

    return new THREE.AnimationClip('waddle_waddle', dur, [
        // Root: MASSIVE lateral rock — the defining trait
        eulerTrack('root', t, [
            [0, 0, -bodyRock], [0, 0, 0], [0, 0, bodyRock], [0, 0, 0], [0, 0, -bodyRock]
        ]),
        // Root bob: heavy body barely lifts
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: deep forward lean + counter-sway to keep head stable
        eulerTrack('spine', t, [
            [-0.24, 0, bodyRock * 0.6], [-0.24, 0, 0],
            [-0.24, 0, -bodyRock * 0.6], [-0.24, 0, 0], [-0.24, 0, bodyRock * 0.6]
        ]),
        // Belly: secondary motion — follows body rock with phase delay + overshoot
        eulerTrack('belly', t, [
            [0.05, 0, 0], [0.05, 0, bellyRock], [0.05, 0, 0],
            [0.05, 0, -bellyRock], [0.05, 0, 0]
        ]),
        // Belly jiggle on each step (scale bounce)
        scaleTrack('belly', t, [
            [1, 1, 1], [1.08, 0.94, 1.10], [1, 1, 1], [1.08, 0.94, 1.10], [1, 1, 1]
        ]),
        // Head: counter-rocks opposite to body (vestibular stabilization)
        eulerTrack('head', t, [
            [0, 0, bodyRock * 0.7], [0, 0, 0], [0, 0, -bodyRock * 0.7],
            [0, 0, 0], [0, 0, bodyRock * 0.7]
        ]),
        // Arms: splayed outward for balance (Z abduction) + small swing
        eulerTrack('upperArm_L', t, [
            [-asw, 0, -0.28], [0, 0, -0.28], [asw, 0, -0.28], [0, 0, -0.28], [-asw, 0, -0.28]
        ]),
        eulerTrack('upperArm_R', t, [
            [asw, 0, 0.28], [0, 0, 0.28], [-asw, 0, 0.28], [0, 0, 0.28], [asw, 0, 0.28]
        ]),
        // Forearms: slight lag follow-through
        buildRotationTrack('forearm_L', t, [0.10, -0.12, 0.10, -0.12, 0.10], AXIS_X),
        buildRotationTrack('forearm_R', t, [-0.12, 0.10, -0.12, 0.10, -0.12], AXIS_X),
        // Legs: wide short steps
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: barely bend (heavy, stiff, ponderous)
        buildRotationTrack('lowerLeg_L', t, [-0.08, -0.22, -0.08, -0.26, -0.08], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.08, -0.26, -0.08, -0.22, -0.08], AXIS_X),
        // Feet: flat-footed planting (no heel-toe, just slams down)
        buildRotationTrack('foot_L', t, [-0.08, 0.06, -0.08, 0, -0.08], AXIS_X),
        buildRotationTrack('foot_R', t, [-0.08, 0, -0.08, 0.06, -0.08], AXIS_X),
    ]);
}

function _waddlePanicSprint() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.5;
    const t = [0, 0.125, 0.25, 0.375, dur];

    return new THREE.AnimationClip('waddle_panic_sprint', dur, [
        // Root: fast bob, lower stance (leaning into sprint)
        posTrack('root', t, [
            [0, ry - 0.05, 0], [0, ry + 0.08, 0], [0, ry - 0.05, 0],
            [0, ry + 0.08, 0], [0, ry - 0.05, 0]
        ]),
        // Body rocks more violently in panic
        eulerTrack('root', t, [
            [0, 0, -0.14], [0, 0, 0], [0, 0, 0.14], [0, 0, 0], [0, 0, -0.14]
        ]),
        // Spine: WAY forward (panicked desperate lean)
        eulerTrack('spine', t, [
            [-0.38, 0, 0.10], [-0.32, 0, 0], [-0.38, 0, -0.10],
            [-0.32, 0, 0], [-0.38, 0, 0.10]
        ]),
        // Belly: WILD jiggle from panicked running
        scaleTrack('belly', t, [
            [1.12, 0.88, 1.14], [0.90, 1.10, 0.88], [1.12, 0.88, 1.14],
            [0.90, 1.10, 0.88], [1.12, 0.88, 1.14]
        ]),
        eulerTrack('belly', t, [
            [0.20, 0, 0.12], [-0.18, 0, -0.10], [0.20, 0, -0.12],
            [-0.18, 0, 0.10], [0.20, 0, 0.12]
        ]),
        // Arms: pumping wildly (no balance, pure panic!)
        buildRotationTrack('upperArm_L', t, [0.95, -0.45, -0.95, 0.45, 0.95], AXIS_X),
        buildRotationTrack('upperArm_R', t, [-0.95, 0.45, 0.95, -0.45, -0.95], AXIS_X),
        // Forearms: flapping
        buildRotationTrack('forearm_L', t, [-0.45, 0.35, -0.45, 0.35, -0.45], AXIS_X),
        buildRotationTrack('forearm_R', t, [0.35, -0.45, 0.35, -0.45, 0.35], AXIS_X),
        // Legs: desperate longer stride
        buildRotationTrack('upperLeg_L', t, [0.92, 0, -0.92, 0, 0.92], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-0.92, 0, 0.92, 0, -0.92], AXIS_X),
        // Lower legs: proper flex during swing
        buildRotationTrack('lowerLeg_L', t, [-0.10, -0.60, -0.15, -0.70, -0.10], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.15, -0.70, -0.10, -0.60, -0.15], AXIS_X),
        // Feet: desperate stomping
        buildRotationTrack('foot_L', t, [-0.18, 0.12, -0.18, 0.08, -0.18], AXIS_X),
        buildRotationTrack('foot_R', t, [-0.18, 0.08, -0.18, 0.12, -0.18], AXIS_X),
        // Head: looking around panicked
        eulerTrack('head', t, [
            [0.10, 0.18, 0], [-0.06, -0.12, 0], [0.10, -0.18, 0],
            [-0.06, 0.12, 0], [0.10, 0.18, 0]
        ]),
    ]);
}

function _waddleBash() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Wind-up → CHARGE → IMPACT → belly bounce cascade → settle
    const t = [0, 0.22, 0.38, 0.46, 0.54, 0.64, 0.78, dur];

    return new THREE.AnimationClip('waddle_bash_door', dur, [
        // Root: steps BACK (wind-up), then SLAMS forward
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.04, -0.22 * s], [0, ry - 0.06, 0.32 * s],
            [0, ry - 0.10, 0.26 * s], [0, ry - 0.04, 0.15 * s],
            [0, ry, 0.08 * s], [0, ry, 0.03 * s], [0, ry, 0]
        ]),
        // Spine: arches back (anticipation), slams forward (charge)
        eulerTrack('spine', t, [
            [-0.20, 0, 0], [0.22, 0, 0], [-0.58, 0, 0],
            [-0.48, 0, 0.08], [-0.32, 0, -0.05],
            [-0.24, 0, 0.03], [-0.20, 0, 0], [-0.20, 0, 0]
        ]),
        // Belly: compresses on wind-up, EXPLODES on impact, multi-bounce settle
        scaleTrack('belly', t, [
            [1, 1, 1], [0.88, 1.06, 0.84], [1.35, 0.78, 1.42],
            [0.86, 1.16, 0.78], [1.14, 0.90, 1.18],
            [0.94, 1.04, 0.93], [1.03, 0.99, 1.02], [1, 1, 1]
        ]),
        // Belly rotation follows body with overshoot
        eulerTrack('belly', t, [
            [0, 0, 0], [-0.12, 0, 0], [0.28, 0, 0],
            [-0.14, 0, 0], [0.08, 0, 0],
            [-0.04, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Arms: fly forward on impact (follow-through momentum)
        buildRotationTrack('upperArm_L', t,
            [0, 0.6, -0.55, -0.35, -0.15, 0.05, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [0, 0.6, -0.55, -0.35, -0.15, 0.05, 0, 0], AXIS_X),
        // Forearms: flail forward on impact
        buildRotationTrack('forearm_L', t,
            [0, 0.3, -0.8, -0.4, -0.2, 0, 0, 0], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0, 0.3, -0.8, -0.4, -0.2, 0, 0, 0], AXIS_X),
        // Head: rocks with impact, stabilizes
        eulerTrack('head', t, [
            [0, 0, 0], [0.12, 0, 0], [-0.22, 0, 0.08],
            [0.10, 0, -0.05], [-0.06, 0, 0.03],
            [0.03, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Legs: brace for impact
        buildRotationTrack('upperLeg_L', t,
            [0, -0.15, 0.28, 0.22, 0.12, 0.05, 0, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.15, 0.28, 0.22, 0.12, 0.05, 0, 0], AXIS_X),
    ]);
}

function _waddleHitReact() {
    const dur = 0.35;
    const t = [0, 0.05, 0.12, 0.22, 0.30, dur];
    return new THREE.AnimationClip('waddle_hit_react', dur, [
        // Tank barely flinches (additive position delta)
        posTrack('root', t, [
            [0, 0, 0], [0, 0, -0.04], [0, 0, -0.02], [0, 0, -0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Belly jiggles via rotation only (additive from identity — no scale tracks)
        eulerTrack('belly', t, [
            [0, 0, 0], [0.10, 0, 0.04], [-0.06, 0, -0.02],
            [0.03, 0, 0.01], [-0.01, 0, 0], [0, 0, 0]
        ]),
        buildRotationTrack('spine', t, [0, 0.04, 0.01, 0.005, 0, 0], AXIS_X),
    ]);
}

function _waddleDeath() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;
    const t = [0, 0.12, 0.30, 0.48, 0.60, 0.72, dur];

    return new THREE.AnimationClip('waddle_death', dur, [
        // Timber fall to the side — slow, heavy, inevitable
        posTrack('root', t, [
            [0, ry, 0], [0.06 * s, ry * 0.95, 0], [0.22 * s, ry * 0.7, 0],
            [0.42 * s, ry * 0.35, 0], [0.56 * s, ry * 0.1, 0],
            [0.60 * s, ry * 0.02, 0], [0.60 * s, 0, 0]
        ]),
        // Root tilts sideways gradually
        buildRotationTrack('root', t, [0, -0.15, -0.50, -0.95, -1.30, -1.50, -1.57], AXIS_Z),
        // Spine curls forward during fall
        eulerTrack('spine', t, [
            [-0.20, 0, 0], [-0.28, 0, 0.05], [-0.42, 0, 0.12],
            [-0.58, 0, 0.20], [-0.68, 0, 0.24], [-0.72, 0, 0.26], [-0.78, 0, 0.26]
        ]),
        // Belly bounces from the fall (secondary motion)
        scaleTrack('belly', t, [
            [1, 1, 1], [1, 1, 1], [1.06, 0.94, 1.06],
            [1.18, 0.84, 1.20], [0.88, 1.12, 0.86],
            [1.06, 0.96, 1.04], [1, 1, 1]
        ]),
        eulerTrack('belly', t, [
            [0, 0, 0], [0.05, 0, 0], [0.12, 0, 0.06],
            [0.22, 0, 0.16], [0.14, 0, 0.22], [0.06, 0, 0.14], [0, 0, 0.08]
        ]),
        // Arms reach out as they topple
        eulerTrack('upperArm_L', t, [
            [0, 0, -0.25], [0.2, 0, -0.38], [0.4, 0, -0.48],
            [0.3, 0, -0.55], [0.1, 0, -0.42], [0, 0, -0.32], [0, 0, -0.25]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0.25], [0.3, 0, 0.42], [0.6, 0, 0.58],
            [0.5, 0, 0.68], [0.3, 0, 0.56], [0.1, 0, 0.42], [0, 0, 0.30]
        ]),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// PANICKER — absolute chaos, wild asymmetric arm flailing, spine twist
// Personality: loud, frantic, EVERYONE PANIC, arms windmill overhead
// ═══════════════════════════════════════════════════════════════════════

function _panickerPanicRun() {
    const c = ENEMY_VISUAL_CONFIG.panicker;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const spineTwist = c.animationParams.spineTwist;
    const spineRest = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.125, 0.25, 0.375, dur];
    const PI = Math.PI;

    // Left arm at 1.3x frequency — different timing creates asymmetric flailing
    const tArmL = [0, 0.077, 0.154, 0.231, 0.308, 0.385, dur];

    return new THREE.AnimationClip('panicker_panic_run', dur, [
        // Root: bob with lateral chaos (slightly different each step)
        posTrack('root', t, [
            [0.02 * s, ry, 0], [-0.03 * s, ry + bob, 0], [0.03 * s, ry, 0],
            [-0.02 * s, ry + bob, 0], [0.02 * s, ry, 0]
        ]),
        // Spine: big forward lean + wild twist + lateral chaos
        eulerTrack('spine', t, [
            [spineRest - 0.06, spineTwist, 0.04],
            [spineRest, 0, -0.05],
            [spineRest - 0.06, -spineTwist, 0.06],
            [spineRest, 0, -0.04],
            [spineRest - 0.06, spineTwist, 0.04]
        ]),
        // Head: whipping around frantically (very visible from top-down!)
        eulerTrack('head', t, [
            [0.06, 0.28, 0.08], [-0.05, -0.18, -0.06],
            [0.08, -0.32, 0.06], [-0.04, 0.22, -0.08],
            [0.06, 0.28, 0.08]
        ]),
        // Left arm: WILD overhead arc at faster frequency (7 keyframes)
        eulerTrack('upperArm_L', tArmL, [
            [PI + 0.7, 0, 0.38], [PI - 0.6, 0, -0.28], [PI + 0.5, 0, 0.48],
            [PI - 0.8, 0, -0.38], [PI + 0.6, 0, 0.32],
            [PI - 0.5, 0, -0.22], [PI + 0.7, 0, 0.38]
        ]),
        // Right arm: different pattern, normal frequency
        eulerTrack('upperArm_R', t, [
            [PI - 0.5, 0, -0.32], [PI + 0.7, 0, 0.38],
            [PI - 0.6, 0, -0.28], [PI + 0.8, 0, 0.42],
            [PI - 0.5, 0, -0.32]
        ]),
        // Forearms: chaotic follow-through (different phases per arm)
        buildRotationTrack('forearm_L', tArmL,
            [0.5, -0.6, 0.7, -0.5, 0.6, -0.4, 0.5], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0.4, -0.5, 0.4, -0.5, 0.4], AXIS_X),
        // Legs: HIGH knees, fast frantic pumping
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw * 0.85, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw * 0.85, 0, lsw, 0, -lsw * 0.85], AXIS_X),
        // Lower legs: deep flex during swing (high-knee running form)
        buildRotationTrack('lowerLeg_L', t, [-0.12, -0.78, -0.18, -0.82, -0.12], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.18, -0.82, -0.12, -0.78, -0.18], AXIS_X),
    ]);
}

function _panickerBash() {
    const c = ENEMY_VISUAL_CONFIG.panicker;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const PI = Math.PI;

    // Frantic pounding: R slam, L slam, both + kick, flail
    const t = [0, 0.07, 0.14, 0.22, 0.30, 0.38, 0.44, dur];

    return new THREE.AnimationClip('panicker_bash_door', dur, [
        // Root: lurches with each wild pound
        posTrack('root', t, [
            [0, ry, 0], [0.03, ry, 0.06], [-0.03, ry, 0.06],
            [0, ry, 0.08], [0.02, ry, 0.04], [-0.02, ry, 0.06],
            [0, ry, 0.04], [0, ry, 0]
        ]),
        // Spine: twisting wildly with each hit
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [-0.22, 0.18, 0.06], [-0.22, -0.18, -0.06],
            [-0.28, 0, 0], [-0.16, 0.12, 0.08], [-0.22, -0.14, -0.06],
            [-0.16, 0, 0], [-0.10, 0, 0]
        ]),
        // Arms: alternating overhead slams — pure chaos
        eulerTrack('upperArm_R', t, [
            [PI, 0, 0], [PI * 0.35, 0, -0.22], [PI + 0.3, 0, 0],
            [PI * 0.28, 0, -0.18], [PI + 0.2, 0, 0.12], [PI * 0.45, 0, -0.12],
            [PI + 0.4, 0, 0], [PI, 0, 0]
        ]),
        eulerTrack('upperArm_L', t, [
            [PI + 0.3, 0, 0], [PI, 0, 0.22], [PI * 0.35, 0, 0.22],
            [PI * 0.28, 0, 0.18], [PI + 0.3, 0, -0.12], [PI * 0.45, 0, 0.12],
            [PI, 0, 0], [PI + 0.3, 0, 0]
        ]),
        // Forearms: flail on every hit
        buildRotationTrack('forearm_R', t,
            [0.3, -0.85, 0.4, -0.92, 0.3, -0.65, 0.4, 0.3], AXIS_X),
        buildRotationTrack('forearm_L', t,
            [0.4, 0.3, -0.85, -0.92, 0.4, -0.72, 0.3, 0.4], AXIS_X),
        // Head: whipping around desperately
        eulerTrack('head', t, [
            [0, 0, 0], [0.12, 0.22, 0], [-0.06, -0.28, 0],
            [0.10, 0, 0.12], [-0.04, 0.18, -0.08], [0.06, -0.22, 0],
            [-0.05, 0.12, 0.06], [0, 0, 0]
        ]),
        // Legs: KICKING the door too!
        buildRotationTrack('upperLeg_L', t,
            [0, 0.06, 0.32, 0.12, 0.06, 0.28, 0.08, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, 0.32, 0.06, 0.12, 0.30, 0.06, 0.08, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.10, -0.48, -0.16, -0.08, -0.42, -0.12, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, -0.48, -0.10, -0.16, -0.44, -0.08, -0.12, 0], AXIS_X),
    ]);
}

function _panickerHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.10, 0.18, 0.25, dur];
    return new THREE.AnimationClip('panicker_hit_react', dur, [
        // Dramatic flinch backward (additive position delta)
        posTrack('root', t, [
            [0, 0, 0], [0, -0.04, -0.12], [0, -0.01, -0.06],
            [0, -0.005, -0.02], [0, 0, -0.01], [0, 0, 0]
        ]),
        // Spine twists on flinch (additive rotation from identity)
        eulerTrack('spine', t, [
            [0, 0, 0], [0.18, 0.10, 0.06], [0.06, 0.03, 0.02],
            [0.02, 0.01, 0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Head whips to side
        eulerTrack('head', t, [
            [0, 0, 0], [0.08, -0.14, 0], [0.03, -0.05, 0],
            [0.01, -0.02, 0], [0, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _panickerDeath() {
    const c = ENEMY_VISUAL_CONFIG.panicker;
    const ry = c.bonePositions.root.y * c.size;
    const PI = Math.PI;
    const dur = 0.6;
    const t = [0, 0.08, 0.18, 0.30, 0.42, 0.52, dur];

    return new THREE.AnimationClip('panicker_death', dur, [
        // Zigzag spiral descent
        posTrack('root', t, [
            [0, ry, 0], [0.04, ry * 0.85, 0], [-0.06, ry * 0.55, 0.05],
            [0.05, ry * 0.25, 0.10], [-0.03, ry * 0.08, 0.15],
            [0, ry * 0.02, 0.18], [0, 0, 0.20]
        ]),
        // Spine: twisting wildly as they spiral down
        eulerTrack('spine', t, [
            [-0.087, 0, 0], [-0.28, 0.18, 0.10], [-0.58, -0.22, -0.14],
            [-0.88, 0.28, 0.16], [-1.18, -0.18, -0.10],
            [-1.42, 0.10, 0.08], [-1.5, 0, 0]
        ]),
        // Arms: windmill all the way down (from overhead to limp)
        eulerTrack('upperArm_L', t, [
            [PI, 0, 0.22], [PI + 0.8, 0, 0.42], [PI - 0.6, 0, -0.32],
            [PI * 0.6, 0, 0.48], [PI * 0.3, 0, -0.22], [0.5, 0, 0.30], [0.3, 0, 0.20]
        ]),
        eulerTrack('upperArm_R', t, [
            [PI, 0, -0.22], [PI - 0.7, 0, -0.42], [PI + 0.5, 0, 0.32],
            [PI * 0.7, 0, -0.48], [PI * 0.4, 0, 0.22], [0.6, 0, -0.30], [0.4, 0, -0.20]
        ]),
        // Forearms: flailing all the way down
        buildRotationTrack('forearm_L', t,
            [0.3, -0.65, 0.55, -0.72, 0.42, -0.30, -0.20], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [-0.3, 0.55, -0.65, 0.62, -0.50, 0.22, 0.15], AXIS_X),
        // Legs buckle and flail
        buildRotationTrack('upperLeg_L', t, [0, 0.5, 0.8, 1.0, 1.1, 1.1, 1.1], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.4, 0.7, 0.9, 1.0, 1.0, 1.0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.4, -0.9, -1.2, -1.4, -1.5, -1.5], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.3, -0.8, -1.1, -1.3, -1.4, -1.4], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// POWER WALKER — eerily smooth, rigid, mechanical precision
// Personality: robotic, unnervingly still head, 90° arm pumps, zero sway
// ═══════════════════════════════════════════════════════════════════════

function _powerwalkerPowerWalk() {
    const c = ENEMY_VISUAL_CONFIG.powerwalker;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const dur = c.animationParams.walkDuration;
    const t5 = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];
    const armRest = -Math.PI / 2;

    // 9-keyframe legs for flat spots at extremes (firm mechanical planting)
    const d8 = dur / 8;
    const tLegs = [0, d8, d8 * 2, d8 * 3, d8 * 4, d8 * 5, d8 * 6, d8 * 7, dur];

    return new THREE.AnimationClip('powerwalker_power_walk', dur, [
        // Root: minimal bob — eerily smooth, almost floating
        posTrack('root', t5, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: PERFECTLY upright. ZERO twist. ZERO sway. Unnervingly still.
        eulerTrack('spine', t5, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Head: does NOT bob, does NOT turn — staring straight ahead, empty
        eulerTrack('head', t5, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Arms: precise 90° pump, perfectly mirrored opposition to legs
        buildRotationTrack('upperArm_L', t5,
            [armRest - asw, armRest, armRest + asw, armRest, armRest - asw], AXIS_X),
        buildRotationTrack('upperArm_R', t5,
            [armRest + asw, armRest, armRest - asw, armRest, armRest + asw], AXIS_X),
        // Forearms: LOCKED at 90° — zero flop, zero lag. Pure machine.
        buildRotationTrack('forearm_L', t5, [-0.5, -0.5, -0.5, -0.5, -0.5], AXIS_X),
        buildRotationTrack('forearm_R', t5, [-0.5, -0.5, -0.5, -0.5, -0.5], AXIS_X),
        // Legs: deliberate swing with FLAT SPOTS at extremes (held mechanical poses)
        buildRotationTrack('upperLeg_L', tLegs,
            [lsw, lsw, 0, -lsw, -lsw, -lsw, 0, lsw, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', tLegs,
            [-lsw, -lsw, 0, lsw, lsw, lsw, 0, -lsw, -lsw], AXIS_X),
        // Lower legs: crisp, precise knee bend
        buildRotationTrack('lowerLeg_L', t5, [-0.05, -0.48, -0.05, -0.52, -0.05], AXIS_X),
        buildRotationTrack('lowerLeg_R', t5, [-0.05, -0.52, -0.05, -0.48, -0.05], AXIS_X),
        // Feet: deliberate heel-strike → toe-off
        buildRotationTrack('foot_L', t5, [-0.24, 0, 0.20, 0, -0.24], AXIS_X),
        buildRotationTrack('foot_R', t5, [0.20, 0, -0.24, 0, 0.20], AXIS_X),
    ]);
}

function _powerwalkerBash() {
    const c = ENEMY_VISUAL_CONFIG.powerwalker;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const armRest = -Math.PI / 2;
    const dur = 0.7;

    // Calculated: measure → rotate → drive → impact → reset (precise, mechanical)
    const t = [0, 0.18, 0.32, 0.42, 0.50, 0.60, dur];

    return new THREE.AnimationClip('powerwalker_bash_door', dur, [
        // Root: one precise step back, then calculated forward drive
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.12 * s], [0, ry, 0.20 * s],
            [0, ry, 0.16 * s], [0, ry, 0.08 * s], [0, ry, 0.03 * s], [0, ry, 0]
        ]),
        // Spine: Y-rotate to load right shoulder, then drive forward
        eulerTrack('spine', t, [
            [0, 0, 0], [0, -0.28, 0], [0, 0.22, -0.10],
            [0, 0.16, -0.08], [0, 0.08, -0.04], [0, 0.03, 0], [0, 0, 0]
        ]),
        // Arms: stay LOCKED at 90° throughout — no personality break
        buildRotationTrack('upperArm_L', t,
            [armRest, armRest + 0.15, armRest - 0.10, armRest - 0.08, armRest, armRest, armRest], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [armRest, armRest - 0.10, armRest + 0.22, armRest + 0.16, armRest + 0.06, armRest, armRest], AXIS_X),
        // Forearms: LOCKED. Not even a wobble. Machine.
        buildRotationTrack('forearm_L', t,
            [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5], AXIS_X),
        // Head: stays PERFECTLY forward throughout. Creepy.
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Legs: precise step
        buildRotationTrack('upperLeg_L', t,
            [0, -0.12, 0.16, 0.12, 0.06, 0, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.12, 0.16, 0.12, 0.06, 0, 0], AXIS_X),
        // Feet: firm plant on drive
        buildRotationTrack('foot_L', t,
            [0, 0.12, -0.14, -0.10, 0, 0, 0], AXIS_X),
        buildRotationTrack('foot_R', t,
            [0, 0.12, -0.14, -0.10, 0, 0, 0], AXIS_X),
    ]);
}

function _powerwalkerHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, dur];
    // BARELY reacts — eerily resilient. Terrifying.
    return new THREE.AnimationClip('powerwalker_hit_react', dur, [
        posTrack('root', t, [[0, 0, 0], [0, 0, -0.03], [0, 0, -0.01], [0, 0, 0]]),
        buildRotationTrack('spine', t, [0, 0.02, 0.005, 0], AXIS_X),
    ]);
}

function _powerwalkerDeath() {
    const c = ENEMY_VISUAL_CONFIG.powerwalker;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.6;
    const t = [0, 0.12, 0.28, 0.42, 0.55, dur];
    const armRest = -Math.PI / 2;

    return new THREE.AnimationClip('powerwalker_death', dur, [
        // Falls FORWARD like a rigid plank — perfect timber fall
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.08 * s], [0, ry * 0.65, 0.35 * s],
            [0, ry * 0.25, 0.65 * s], [0, ry * 0.05, 0.85 * s], [0, 0, 0.95 * s]
        ]),
        // Root tips forward — perfectly rigid like a falling tree
        buildRotationTrack('root', t, [0, -0.15, -0.55, -1.05, -1.40, -1.57], AXIS_X),
        // Spine: PERFECTLY straight even in death — defining character trait
        eulerTrack('spine', t, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Arms: LOCKED at 90° even in death — commitment to character
        buildRotationTrack('upperArm_L', t,
            [armRest, armRest, armRest, armRest, armRest, armRest], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [armRest, armRest, armRest, armRest, armRest, armRest], AXIS_X),
        // Forearms: locked to the end
        buildRotationTrack('forearm_L', t,
            [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [-0.5, -0.5, -0.5, -0.5, -0.5, -0.5], AXIS_X),
        // Head: perfectly still. Even. In. Death.
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// THE GIRLS — casual hip sway, chatty head turns, unbothered strut
// Personality: social, impatient, synchronized, "OMG hurry UP"
// ═══════════════════════════════════════════════════════════════════════

function _girlsWalkChat() {
    const c = ENEMY_VISUAL_CONFIG.girls;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const hipSway = c.animationParams.hipSway;
    const dur = c.animationParams.walkDuration;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    return new THREE.AnimationClip('girls_walk_chat', dur, [
        // Root: hip sway — the signature trait (very visible from top-down)
        eulerTrack('root', t, [
            [0, 0, -hipSway], [0, 0, 0], [0, 0, hipSway], [0, 0, 0], [0, 0, -hipSway]
        ]),
        // Light bouncy bob
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: counter-sway + very slight lean
        eulerTrack('spine', t, [
            [-0.05, 0, hipSway * 0.55], [-0.05, 0, 0], [-0.05, 0, -hipSway * 0.55],
            [-0.05, 0, 0], [-0.05, 0, hipSway * 0.55]
        ]),
        // Chest: delayed follow-through on sway (secondary motion)
        eulerTrack('chest', t, [
            [0, 0, 0], [0, 0, hipSway * 0.3], [0, 0, 0], [0, 0, -hipSway * 0.3], [0, 0, 0]
        ]),
        // Head: turns side to side chatting + slight bounce (ponytail effect)
        eulerTrack('head', t, [
            [0.04, 0.25, 0], [-0.03, 0.08, 0], [0.04, -0.25, 0],
            [-0.03, -0.08, 0], [0.04, 0.25, 0]
        ]),
        // Legs: relaxed casual stride
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: springy natural bend
        buildRotationTrack('lowerLeg_L', t, [-0.08, -0.42, -0.10, -0.48, -0.08], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.10, -0.48, -0.08, -0.42, -0.10], AXIS_X),
    ]);
}

function _girlsBash() {
    const c = ENEMY_VISUAL_CONFIG.girls;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.7;

    // Impatient: rapid knocking + head turns (talking) + foot stomp
    const t = [0, 0.08, 0.16, 0.26, 0.36, 0.46, 0.56, dur];

    return new THREE.AnimationClip('girls_bash_door', dur, [
        // Root: bouncing impatiently + hip shift on stomp
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.05 * s], [0, ry, 0],
            [0, ry, 0.05 * s], [0, ry, 0],
            [0, ry + 0.03, 0], [0, ry, 0.04 * s], [0, ry, 0]
        ]),
        // Hip shift (foot stomp emphasis at phase 5)
        eulerTrack('root', t, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0],
            [0, 0, 0], [0, 0, 0],
            [0, 0, -0.14], [0, 0, 0.06], [0, 0, 0]
        ]),
        // Spine: lean forward on knocks, back between
        eulerTrack('spine', t, [
            [-0.05, 0, 0], [-0.20, 0, 0], [-0.05, 0, 0],
            [-0.20, 0, 0], [-0.05, 0, 0],
            [-0.02, 0, 0], [-0.18, 0, 0], [-0.05, 0, 0]
        ]),
        // Head: turns to chat with friends, looks back at door — "OMG HURRY UP"
        eulerTrack('head', t, [
            [0, 0.22, 0], [0, 0, 0], [0, -0.25, 0],
            [-0.05, -0.10, 0], [0, 0.20, 0],
            [0, 0.28, 0.08], [0, 0, 0], [0, 0.22, 0]
        ]),
        // Legs: stomping between knocks
        buildRotationTrack('upperLeg_L', t,
            [0, 0.12, 0, 0.14, 0, 0.28, 0.10, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, 0.14, 0, 0.12, 0, 0, 0.12, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.16, 0, -0.20, 0, -0.42, -0.14, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, -0.20, 0, -0.16, 0, 0, -0.16, 0], AXIS_X),
    ]);
}

function _girlsHitReact() {
    const dur = 0.25;
    const t = [0, 0.04, 0.10, 0.18, dur];
    return new THREE.AnimationClip('girls_hit_react', dur, [
        // Dramatic stumble back (gasp!)
        posTrack('root', t, [[0, 0, 0], [0, 0.08, -0.06], [0, 0.03, -0.03], [0, 0.01, -0.01], [0, 0, 0]]),
        // Spine arches back dramatically
        eulerTrack('spine', t, [
            [0, 0, 0], [-0.16, 0, 0.06], [-0.06, 0, 0.02], [-0.02, 0, 0], [0, 0, 0]
        ]),
        // Head tilts back (shocked gasp)
        eulerTrack('head', t, [
            [0, 0, 0], [-0.18, 0.12, 0], [-0.06, 0.04, 0], [-0.02, 0.01, 0], [0, 0, 0]
        ]),
    ]);
}

function _girlsDeath() {
    const c = ENEMY_VISUAL_CONFIG.girls;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const t = [0, 0.08, 0.20, 0.32, 0.44, dur];

    return new THREE.AnimationClip('girls_death', dur, [
        // Swoon backward then crumple to the side
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.05, -0.03], [0.03, ry * 0.6, -0.05],
            [0.05, ry * 0.25, -0.06], [0.04, ry * 0.05, -0.04], [0.04, 0, -0.03]
        ]),
        // Spine arches backward then curls (swooning faint)
        eulerTrack('spine', t, [
            [-0.05, 0, 0], [-0.22, 0, 0], [-0.62, 0, 0.16],
            [-1.02, 0, 0.22], [-1.22, 0, 0.16], [-1.32, 0, 0.10]
        ]),
        // Head: dramatic tilt back then rolls to side
        eulerTrack('head', t, [
            [0, 0, 0], [-0.28, 0.10, 0.08], [-0.16, 0.22, 0.16],
            [-0.06, 0.16, 0.22], [0, 0.10, 0.16], [0, 0.06, 0.12]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.2, 0.5, 0.75, 0.85, 0.90], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.15, 0.4, 0.65, 0.75, 0.80], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.15, -0.40, -0.65, -0.80, -0.85], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.10, -0.35, -0.55, -0.70, -0.75], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// DEER — graceful quadruped, elegant 4-beat lateral walk
// Personality: alert, gentle, thin hooves barely lift, curious neck bob
// Bones: root, pelvis, spine_mid, chest, neck_01, neck_02, head,
//   scapula_L/R, frontUpperLeg_L/R, frontLowerLeg_L/R, frontFoot_L/R,
//   hindUpperLeg_L/R, hindLowerLeg_L/R, hindFoot_L/R, tail_01, tail_02
// ═══════════════════════════════════════════════════════════════════════

function _deerWalk() {
    const c = ENEMY_VISUAL_CONFIG.deer;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const fsw = a.frontLegSwing;
    const hsw = a.hindLegSwing;
    const und = a.spineUndulate;
    const nb = a.neckBob;
    const tw = a.tailWave;
    const sc = a.scapulaSlide;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // 4-beat lateral walk: LH(0%) → LF(25%) → RH(50%) → RF(75%)
    // 4 foot contacts = 4 bobs per cycle
    const t8 = [0, dur*0.125, dur*0.25, dur*0.375, dur*0.5, dur*0.625, dur*0.75, dur*0.875, dur];

    return new THREE.AnimationClip('deer_walk', dur, [
        // Root: 4 bobs per cycle — one per foot contact
        posTrack('root', t8, [
            [0, ry - bob, 0], [0, ry + bob, 0], [0, ry - bob, 0], [0, ry + bob, 0],
            [0, ry - bob, 0], [0, ry + bob, 0], [0, ry - bob, 0], [0, ry + bob, 0],
            [0, ry - bob, 0]
        ]),
        // Pelvis: lateral S-curve undulation — sways toward planted hind leg
        eulerTrack('pelvis', t, [
            [0, und, 0], [0, 0, 0], [0, -und, 0], [0, 0, 0], [0, und, 0]
        ]),
        // Spine_mid: counter-undulates for S-curve
        eulerTrack('spine_mid', t, [
            [0, -und * 0.6, 0], [0, 0, 0], [0, und * 0.6, 0],
            [0, 0, 0], [0, -und * 0.6, 0]
        ]),
        // Chest: counter-rotates to pelvis for natural spine flow
        eulerTrack('chest', t, [
            [0, -und * 0.4, 0], [0, 0, 0], [0, und * 0.4, 0],
            [0, 0, 0], [0, -und * 0.4, 0]
        ]),
        // Neck_01: gentle forward bob — curious deer head motion
        buildRotationTrack('neck_01', t, [nb, -nb * 0.5, nb, -nb * 0.5, nb], AXIS_X),
        // Neck_02: follows with slight delay
        buildRotationTrack('neck_02', t, [-nb * 0.3, nb * 0.3, -nb * 0.3, nb * 0.3, -nb * 0.3], AXIS_X),
        // Head: counter-bobs to stabilize gaze + alert ear-twitching turns
        eulerTrack('head', t, [
            [-nb * 0.5, -0.06, 0], [nb * 0.3, 0.04, 0],
            [-nb * 0.5, 0.06, 0], [nb * 0.3, -0.04, 0],
            [-nb * 0.5, -0.06, 0]
        ]),
        // Scapulae: slide forward/back with front leg stride
        buildRotationTrack('scapula_L', t, [sc, 0, -sc, 0, sc], AXIS_X),
        buildRotationTrack('scapula_R', t, [0, -sc, 0, sc, 0], AXIS_X),
        // Front upper legs: LF peaks at 25%, RF peaks at 75%
        buildRotationTrack('frontUpperLeg_L', t, [0, fsw, 0, -fsw, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, -fsw, 0, fsw, 0], AXIS_X),
        // Front lower legs: flex during swing, extend on plant
        buildRotationTrack('frontLowerLeg_L', t, [-0.08, -0.45, -0.08, -0.10, -0.08], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [-0.08, -0.10, -0.08, -0.45, -0.08], AXIS_X),
        // Front feet: dainty hoof articulation
        buildRotationTrack('frontFoot_L', t, [0, -0.12, 0.06, 0, 0], AXIS_X),
        buildRotationTrack('frontFoot_R', t, [0, 0, 0, -0.12, 0], AXIS_X),
        // Hind upper legs: LH peaks at 0%, RH peaks at 50%
        buildRotationTrack('hindUpperLeg_L', t, [hsw, 0, -hsw, 0, hsw], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [-hsw, 0, hsw, 0, -hsw], AXIS_X),
        // Hind lower legs: flex during swing, extend on plant
        buildRotationTrack('hindLowerLeg_L', t, [-0.50, -0.10, -0.08, -0.10, -0.50], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [-0.08, -0.10, -0.50, -0.10, -0.08], AXIS_X),
        // Hind feet: subtle plant/lift
        buildRotationTrack('hindFoot_L', t, [-0.10, 0.04, 0.06, 0, -0.10], AXIS_X),
        buildRotationTrack('hindFoot_R', t, [0.06, 0, -0.10, 0.04, 0.06], AXIS_X),
        // Tail: gentle wave with progressive delay per bone
        buildRotationTrack('tail_01', t, [tw, 0, -tw, 0, tw], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, tw, 0, -tw, 0], AXIS_Y),
    ]);
}

function _deerBash() {
    const c = ENEMY_VISUAL_CONFIG.deer;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;

    // Wind-up → lower head → charge forward → antler impact → recoil
    const t = [0, 0.15, 0.28, 0.38, 0.50, 0.65, dur];

    return new THREE.AnimationClip('deer_bash_door', dur, [
        // Root: steps back slightly, then lunges forward into door
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.03, -0.06 * s], [0, ry - 0.04, 0.18 * s],
            [0, ry - 0.06, 0.14 * s], [0, ry - 0.02, 0.06 * s],
            [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Pelvis: drives forward on charge
        eulerTrack('pelvis', t, [
            [0, 0, 0], [0.06, 0, 0], [-0.12, 0, 0],
            [-0.08, 0, 0], [-0.04, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Spine_mid: arches back (loading), drives forward (charge)
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.08, 0, 0], [-0.20, 0, 0],
            [-0.14, 0, 0], [-0.06, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Chest: follows spine drive
        eulerTrack('chest', t, [
            [0, 0, 0], [0.04, 0, 0], [-0.16, 0, 0],
            [-0.10, 0, 0], [-0.04, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Neck_01: extends way forward on impact — antlers leading
        buildRotationTrack('neck_01', t, [0, 0.12, -0.25, -0.16, -0.06, 0.02, 0], AXIS_X),
        // Neck_02: follows through
        buildRotationTrack('neck_02', t, [0, 0.08, -0.18, -0.12, -0.04, 0, 0], AXIS_X),
        // Head: dips down then snaps up on impact recoil
        eulerTrack('head', t, [
            [0, 0, 0], [0.10, 0, 0], [-0.22, 0, 0],
            [0.12, 0, 0.06], [0.04, 0, -0.03], [0, 0, 0], [0, 0, 0]
        ]),
        // Front legs: brace forward on impact
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.15, -0.20, -0.14, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.15, -0.20, -0.14, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.06, -0.22, -0.14, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.06, -0.22, -0.14, -0.06, 0, 0], AXIS_X),
        // Hind legs: push off for charge
        buildRotationTrack('hindUpperLeg_L', t, [0, -0.12, 0.22, 0.16, 0.08, 0.02, 0], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, -0.12, 0.22, 0.16, 0.08, 0.02, 0], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, 0.04, -0.18, -0.12, -0.06, -0.02, 0], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, 0.04, -0.18, -0.12, -0.06, -0.02, 0], AXIS_X),
        // Tail: flicks up on impact
        buildRotationTrack('tail_01', t, [0, 0, -0.30, -0.18, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('tail_02', t, [0, 0, -0.20, -0.12, -0.04, 0, 0], AXIS_X),
    ]);
}

function _deerHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];
    return new THREE.AnimationClip('deer_hit_react', dur, [
        // Startled flinch — jerks back like a spooked deer
        posTrack('root', t, [
            [0, 0, 0], [0, 0.03, -0.12], [0, 0.01, -0.06], [0, 0, -0.02], [0, 0, 0]
        ]),
        // Spine_mid recoils backward
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.10, 0, 0.03], [0.04, 0, 0.01], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Neck_01 snaps back — startled reflex
        buildRotationTrack('neck_01', t, [0, 0.14, 0.05, 0.01, 0], AXIS_X),
        // Neck_02 follows
        buildRotationTrack('neck_02', t, [0, 0.10, 0.03, 0.008, 0], AXIS_X),
        // Head jerks back and to the side — classic deer startle
        eulerTrack('head', t, [
            [0, 0, 0], [0.16, -0.12, 0], [0.05, -0.04, 0], [0.01, -0.01, 0], [0, 0, 0]
        ]),
        // Tail flicks up in alarm
        buildRotationTrack('tail_01', t, [0, -0.30, -0.12, -0.03, 0], AXIS_X),
    ]);
}

function _deerDeath() {
    const c = ENEMY_VISUAL_CONFIG.deer;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.7;
    const t = [0, 0.10, 0.22, 0.35, 0.50, 0.62, dur];

    return new THREE.AnimationClip('deer_death', dur, [
        // Staggers, legs buckle, sinks and curls up on side
        posTrack('root', t, [
            [0, ry, 0], [0.04 * s, ry * 0.85, 0], [0.10 * s, ry * 0.55, 0.04 * s],
            [0.18 * s, ry * 0.28, 0.06 * s], [0.22 * s, ry * 0.08, 0.05 * s],
            [0.22 * s, ry * 0.02, 0.04 * s], [0.22 * s, 0, 0.03 * s]
        ]),
        // Root tilts sideways as it falls
        buildRotationTrack('root', t, [0, -0.08, -0.30, -0.65, -1.05, -1.35, -1.50], AXIS_Z),
        // Pelvis curls
        eulerTrack('pelvis', t, [
            [0, 0, 0], [-0.06, 0, 0.02], [-0.14, 0, 0.06],
            [-0.22, 0, 0.08], [-0.28, 0, 0.06], [-0.30, 0, 0.04], [-0.30, 0, 0.03]
        ]),
        // Spine_mid curls forward protectively
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.08, 0, 0.02], [-0.18, 0, 0.05],
            [-0.28, 0, 0.06], [-0.34, 0, 0.06], [-0.36, 0, 0.05], [-0.38, 0, 0.04]
        ]),
        // Neck_01 curls in — tucking head
        buildRotationTrack('neck_01', t, [0, -0.08, -0.18, -0.28, -0.32, -0.34, -0.35], AXIS_X),
        // Neck_02 follows
        buildRotationTrack('neck_02', t, [0, -0.04, -0.10, -0.14, -0.16, -0.17, -0.18], AXIS_X),
        // Head rolls to side
        eulerTrack('head', t, [
            [0, 0, 0], [-0.06, 0.08, 0], [-0.12, 0.16, 0.10],
            [-0.08, 0.12, 0.18], [-0.04, 0.08, 0.14], [-0.02, 0.04, 0.10], [0, 0, 0.08]
        ]),
        // Front legs buckle
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.20, 0.45, 0.65, 0.80, 0.90, 0.95], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.15, 0.35, 0.55, 0.70, 0.80, 0.85], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.18, -0.45, -0.70, -0.90, -1.05, -1.10], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.14, -0.38, -0.60, -0.80, -0.95, -1.00], AXIS_X),
        // Hind legs buckle
        buildRotationTrack('hindUpperLeg_L', t, [0, 0.25, 0.55, 0.80, 0.95, 1.05, 1.10], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, 0.18, 0.42, 0.68, 0.85, 0.95, 1.00], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, -0.20, -0.55, -0.90, -1.20, -1.40, -1.50], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, -0.15, -0.45, -0.78, -1.10, -1.30, -1.40], AXIS_X),
        // Tail goes limp
        buildRotationTrack('tail_01', t, [0, -0.10, -0.18, -0.12, -0.06, -0.03, 0], AXIS_Y),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// SQUIRREL — hyperactive bounding gait, massive spine compression
// Personality: explosive energy, front pair then hind pair, huge vertical bob
// Bones: root, pelvis, spine_mid, chest, neck_01, head,
//   frontUpperLeg_L/R, frontLowerLeg_L/R,
//   hindUpperLeg_L/R, hindLowerLeg_L/R,
//   tail_01 through tail_05
// ═══════════════════════════════════════════════════════════════════════

function _squirrelHop() {
    const c = ENEMY_VISUAL_CONFIG.squirrel;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const fsw = a.frontLegSwing;
    const hsw = a.hindLegSwing;
    const comp = a.spineCompress;
    const tw = a.tailWave;
    const rock = a.bodyRock;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // Bound gait: fronts(0%) → spine extends(25%) → hinds(50%) → spine gathers(75%)
    return new THREE.AnimationClip('squirrel_hop', dur, [
        // Root: BIG vertical bounding — launches high, slams down
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0],
            [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Extreme squash and stretch — cartoon energy
        scaleTrack('root', t, [
            [1.18, 0.75, 1.18], [0.82, 1.25, 0.82], [1.18, 0.75, 1.18],
            [0.82, 1.25, 0.82], [1.18, 0.75, 1.18]
        ]),
        // Pelvis: drives the compression/extension cycle
        buildRotationTrack('pelvis', t, [-comp, 0, comp, 0, -comp], AXIS_X),
        // Spine_mid: dramatic compression/extension — backbone of the bound
        buildRotationTrack('spine_mid', t, [comp, 0, -comp, 0, comp], AXIS_X),
        // Chest: twitchy side-to-side rock
        eulerTrack('chest', t, [
            [0, 0, -rock], [0, 0, 0], [0, 0, rock],
            [0, 0, 0], [0, 0, -rock]
        ]),
        // Neck_01: twitchy darting — squirrels constantly scan for danger
        eulerTrack('neck_01', t, [
            [0.06, 0.10, 0], [-0.04, -0.12, 0], [0.06, -0.08, 0],
            [-0.04, 0.14, 0], [0.06, 0.10, 0]
        ]),
        // Head: rapid twitchy scanning, big eyes darting
        eulerTrack('head', t, [
            [0.08, -0.15, rock * 0.3], [-0.06, 0.18, 0],
            [0.08, 0.12, -rock * 0.3], [-0.06, -0.16, 0],
            [0.08, -0.15, rock * 0.3]
        ]),
        // Front legs: both move together (bound gait) — plant at 0%, swing at 25%
        buildRotationTrack('frontUpperLeg_L', t, [fsw, -fsw, fsw, -fsw, fsw], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [fsw, -fsw, fsw, -fsw, fsw], AXIS_X),
        // Front lower legs: deep flex on landing, extend on swing
        buildRotationTrack('frontLowerLeg_L', t, [-0.35, -0.08, -0.35, -0.08, -0.35], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [-0.35, -0.08, -0.35, -0.08, -0.35], AXIS_X),
        // Hind legs: both move together — plant at 50%, swing at 75%
        buildRotationTrack('hindUpperLeg_L', t, [-hsw, hsw, hsw, -hsw, -hsw], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [-hsw, hsw, hsw, -hsw, -hsw], AXIS_X),
        // Hind lower legs: spring flex
        buildRotationTrack('hindLowerLeg_L', t, [-0.10, -0.40, -0.40, -0.10, -0.10], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [-0.10, -0.40, -0.40, -0.10, -0.10], AXIS_X),
        // Tail: massive stream behind with wave delay per bone — signature squirrel plume
        buildRotationTrack('tail_01', t, [tw, 0, -tw, 0, tw], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, tw, 0, -tw, 0], AXIS_Y),
        buildRotationTrack('tail_03', t, [-tw, 0, tw, 0, -tw], AXIS_Y),
        buildRotationTrack('tail_04', t, [0, -tw, 0, tw, 0], AXIS_Y),
        buildRotationTrack('tail_05', t, [tw, 0, -tw, 0, tw], AXIS_Y),
        // Tail vertical stream — curls up and back behind
        buildRotationTrack('tail_01', t, [-0.20, -0.10, -0.20, -0.10, -0.20], AXIS_X),
    ]);
}

function _squirrelBash() {
    const c = ENEMY_VISUAL_CONFIG.squirrel;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.5;

    // Frantic body-slam scratching — rapid chaotic energy
    const t = [0, 0.06, 0.12, 0.18, 0.25, 0.32, 0.40, dur];

    return new THREE.AnimationClip('squirrel_bash_door', dur, [
        // Root: rapid wiggly body slams — can't stay still
        posTrack('root', t, [
            [0, ry, 0], [0.03 * s, ry - 0.03, 0.08 * s], [-0.03 * s, ry, 0],
            [0.02 * s, ry - 0.02, 0.10 * s], [-0.02 * s, ry + 0.02, 0],
            [0.04 * s, ry - 0.04, 0.12 * s], [-0.02 * s, ry, 0.04 * s],
            [0, ry, 0]
        ]),
        // Wild squash on each slam
        scaleTrack('root', t, [
            [1, 1, 1], [1.15, 0.82, 1.15], [0.90, 1.12, 0.90], [1, 1, 1],
            [1.18, 0.80, 1.18], [0.88, 1.14, 0.88], [1.12, 0.86, 1.12], [1, 1, 1]
        ]),
        // Spine_mid: twisting frantically with each slam
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.25, 0.12, 0.08], [0.05, -0.10, -0.06],
            [-0.28, -0.14, 0.06], [0.08, 0.12, -0.08],
            [-0.30, 0.10, 0.10], [0.05, -0.08, -0.04], [0, 0, 0]
        ]),
        // Head: darting around between slams, manic energy
        eulerTrack('head', t, [
            [0, 0, 0], [0.12, 0.20, 0], [-0.06, -0.22, 0],
            [0.14, -0.18, 0.08], [-0.04, 0.24, -0.06],
            [0.10, 0.16, 0], [-0.08, -0.14, 0.04], [0, 0, 0]
        ]),
        // Front legs: scratching frenzy at door
        buildRotationTrack('frontUpperLeg_L', t,
            [0, 0.28, -0.10, 0.32, -0.08, 0.30, 0.12, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t,
            [0, -0.10, 0.30, -0.08, 0.28, -0.06, 0.26, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t,
            [0, -0.35, -0.10, -0.38, -0.08, -0.36, -0.12, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t,
            [0, -0.10, -0.36, -0.08, -0.34, -0.06, -0.30, 0], AXIS_X),
        // Hind legs: stomping support
        buildRotationTrack('hindUpperLeg_L', t,
            [0, 0.12, 0, 0.16, 0, 0.14, 0.06, 0], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t,
            [0, 0.14, 0, 0.12, 0, 0.16, 0.08, 0], AXIS_X),
        // Tail: wild whipping
        buildRotationTrack('tail_01', t, [0, 0.30, -0.25, 0.35, -0.20, 0.28, -0.10, 0], AXIS_Y),
        buildRotationTrack('tail_03', t, [0, -0.25, 0.30, -0.30, 0.25, -0.22, 0.08, 0], AXIS_Y),
    ]);
}

function _squirrelHitReact() {
    const dur = 0.2;
    const t = [0, 0.03, 0.08, 0.14, dur];
    return new THREE.AnimationClip('squirrel_hit_react', dur, [
        // Springs backward startled — launches into the air
        posTrack('root', t, [
            [0, 0, 0], [0, 0.10, -0.14], [0, 0.04, -0.08], [0, 0.01, -0.03], [0, 0, 0]
        ]),
        // Spine locks stiff — freeze response
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.22, 0, 0], [0.10, 0, 0], [0.03, 0, 0], [0, 0, 0]
        ]),
        // Stretch on jump — cartoon squash/stretch
        scaleTrack('root', t, [
            [1, 1, 1], [0.80, 1.25, 0.80], [0.92, 1.10, 0.92], [0.98, 1.02, 0.98], [1, 1, 1]
        ]),
        // Tail puffs straight out
        buildRotationTrack('tail_01', t, [0, -0.40, -0.20, -0.06, 0], AXIS_X),
        buildRotationTrack('tail_03', t, [0, -0.30, -0.15, -0.04, 0], AXIS_X),
    ]);
}

function _squirrelDeath() {
    const c = ENEMY_VISUAL_CONFIG.squirrel;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.4;
    const t = [0, 0.06, 0.14, 0.24, 0.34, dur];

    return new THREE.AnimationClip('squirrel_death', dur, [
        // Dramatic backward flip, then curls up tiny
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.12, -0.08], [0, ry * 0.7, -0.14],
            [0, ry * 0.25, -0.10], [0, ry * 0.05, -0.06], [0, 0, -0.04]
        ]),
        // Root flips backward
        buildRotationTrack('root', t, [0, 0.40, 0.90, 1.30, 1.50, 1.57], AXIS_X),
        // Spine_mid curls into tight ball
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.20, 0, 0], [-0.45, 0, 0.06],
            [-0.65, 0, 0.04], [-0.75, 0, 0.02], [-0.80, 0, 0]
        ]),
        // Pelvis tucks under
        buildRotationTrack('pelvis', t, [0, -0.15, -0.30, -0.40, -0.45, -0.48], AXIS_X),
        // Squashes flat on landing
        scaleTrack('root', t, [
            [1, 1, 1], [0.85, 1.20, 0.85], [0.90, 1.12, 0.90],
            [1.20, 0.70, 1.20], [1.15, 0.75, 1.15], [1.10, 0.80, 1.10]
        ]),
        // All four legs tuck in
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.35, 0.60, 0.80, 0.90, 0.95], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.30, 0.52, 0.72, 0.82, 0.88], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.40, -0.70, -0.95, -1.10, -1.20], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.35, -0.62, -0.85, -1.00, -1.10], AXIS_X),
        buildRotationTrack('hindUpperLeg_L', t, [0, 0.40, 0.70, 0.90, 1.00, 1.05], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, 0.35, 0.60, 0.80, 0.90, 0.95], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, -0.45, -0.80, -1.10, -1.30, -1.40], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, -0.40, -0.70, -1.00, -1.20, -1.30], AXIS_X),
        // Tail curls around body
        buildRotationTrack('tail_01', t, [0, 0.30, 0.55, 0.70, 0.78, 0.80], AXIS_X),
        buildRotationTrack('tail_03', t, [0, 0.20, 0.40, 0.55, 0.62, 0.65], AXIS_X),
        buildRotationTrack('tail_05', t, [0, 0.10, 0.25, 0.38, 0.45, 0.50], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// BEAR — heavy lumbering quadruped, 4-beat walk with belly jiggle
// Personality: massive, slow, earth-shaking, unstoppable weight
// Bones: root, pelvis, spine_mid, chest, neck_01, head,
//   scapula_L/R, frontUpperLeg_L/R, frontLowerLeg_L/R,
//   hindUpperLeg_L/R, hindLowerLeg_L/R, tail_01, belly
// ═══════════════════════════════════════════════════════════════════════

function _bearWaddle() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const fsw = a.frontLegSwing;
    const hsw = a.hindLegSwing;
    const bodyRock = a.bodyRock;
    const und = a.spineUndulate;
    const tw = a.tailWave;
    const sc = a.scapulaSlide;
    const bellyOS = a.bellyOvershoot;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // 4-beat walk: LH(0%) → LF(25%) → RH(50%) → RF(75%)
    const t8 = [0, dur*0.125, dur*0.25, dur*0.375, dur*0.5, dur*0.625, dur*0.75, dur*0.875, dur];
    const bellyRock = bodyRock * bellyOS;

    return new THREE.AnimationClip('bear_waddle', dur, [
        // Root: MASSIVE lateral rock — heavy bear sway, barely lifts
        eulerTrack('root', t, [
            [0, 0, -bodyRock], [0, 0, 0], [0, 0, bodyRock],
            [0, 0, 0], [0, 0, -bodyRock]
        ]),
        // Root bob: 4 contacts per cycle — heavy body barely lifts
        posTrack('root', t8, [
            [0, ry - bob, 0], [0, ry + bob, 0], [0, ry - bob, 0], [0, ry + bob, 0],
            [0, ry - bob, 0], [0, ry + bob, 0], [0, ry - bob, 0], [0, ry + bob, 0],
            [0, ry - bob, 0]
        ]),
        // Pelvis: lateral S-curve — sways with heavy hind end
        eulerTrack('pelvis', t, [
            [0, und, 0], [0, 0, 0], [0, -und, 0], [0, 0, 0], [0, und, 0]
        ]),
        // Spine_mid: counter-sway for weight balance
        eulerTrack('spine_mid', t, [
            [0, -und * 0.6, bodyRock * 0.6], [0, 0, 0],
            [0, und * 0.6, -bodyRock * 0.6], [0, 0, 0],
            [0, -und * 0.6, bodyRock * 0.6]
        ]),
        // Chest: counter-sway continues up the spine
        eulerTrack('chest', t, [
            [0, -und * 0.3, 0], [0, 0, 0], [0, und * 0.3, 0],
            [0, 0, 0], [0, -und * 0.3, 0]
        ]),
        // Belly: secondary jiggle — follows body rock with phase delay + overshoot
        eulerTrack('belly', t, [
            [0.06, 0, 0], [0.06, 0, bellyRock], [0.06, 0, 0],
            [0.06, 0, -bellyRock], [0.06, 0, 0]
        ]),
        // Belly jiggle scale bounce on each heavy step
        scaleTrack('belly', t, [
            [1, 1, 1], [1.10, 0.92, 1.12], [1, 1, 1], [1.10, 0.92, 1.12], [1, 1, 1]
        ]),
        // Neck_01: low and forward, slight sniffing bob
        eulerTrack('neck_01', t, [
            [-0.04, 0, 0], [-0.02, 0, 0], [-0.04, 0, 0],
            [-0.02, 0, 0], [-0.04, 0, 0]
        ]),
        // Head: counter-rocks opposite to body, sniffing
        eulerTrack('head', t, [
            [-0.06, 0, bodyRock * 0.7], [-0.02, 0, 0], [-0.06, 0, -bodyRock * 0.7],
            [-0.02, 0, 0], [-0.06, 0, bodyRock * 0.7]
        ]),
        // Scapulae: push heavy shoulders forward/back
        buildRotationTrack('scapula_L', t, [sc, 0, -sc, 0, sc], AXIS_X),
        buildRotationTrack('scapula_R', t, [0, -sc, 0, sc, 0], AXIS_X),
        // Front upper legs: LF peaks at 25%, RF peaks at 75%
        buildRotationTrack('frontUpperLeg_L', t, [0, fsw, 0, -fsw, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, -fsw, 0, fsw, 0], AXIS_X),
        // Front lower legs: barely bend — heavy, stiff, massive weight
        buildRotationTrack('frontLowerLeg_L', t, [-0.06, -0.20, -0.06, -0.10, -0.06], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [-0.06, -0.10, -0.06, -0.20, -0.06], AXIS_X),
        // Hind upper legs: LH peaks at 0%, RH peaks at 50%
        buildRotationTrack('hindUpperLeg_L', t, [hsw, 0, -hsw, 0, hsw], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [-hsw, 0, hsw, 0, -hsw], AXIS_X),
        // Hind lower legs: stiff heavy legs
        buildRotationTrack('hindLowerLeg_L', t, [-0.20, -0.06, -0.06, -0.06, -0.20], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [-0.06, -0.06, -0.20, -0.06, -0.06], AXIS_X),
        // Tail: small stubby wag
        buildRotationTrack('tail_01', t, [tw, 0, -tw, 0, tw], AXIS_Y),
    ]);
}

function _bearPanicSprint() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = 0.8;
    const t = [0, 0.2, 0.4, 0.6, dur];
    const bellyOS = a.bellyOvershoot;

    return new THREE.AnimationClip('bear_panic_sprint', dur, [
        // Root: faster bob, deeper — panicked gallop
        posTrack('root', t, [
            [0, ry * 0.88, 0], [0, ry * 0.88 + 0.06, 0],
            [0, ry * 0.88, 0], [0, ry * 0.88 + 0.06, 0], [0, ry * 0.88, 0]
        ]),
        // Body rocks more violently in desperate charge
        eulerTrack('root', t, [
            [0, 0, -0.18], [0, 0, 0], [0, 0, 0.18], [0, 0, 0], [0, 0, -0.18]
        ]),
        // Pelvis: pumps hard
        buildRotationTrack('pelvis', t, [-0.10, 0.06, -0.10, 0.06, -0.10], AXIS_X),
        // Spine_mid: lunging forward
        eulerTrack('spine_mid', t, [
            [-0.12, 0, 0.10], [-0.06, 0, 0], [-0.12, 0, -0.10],
            [-0.06, 0, 0], [-0.12, 0, 0.10]
        ]),
        // Belly: WILD jiggle from panicked galloping
        scaleTrack('belly', t, [
            [1.14, 0.86, 1.16], [0.88, 1.12, 0.86], [1.14, 0.86, 1.16],
            [0.88, 1.12, 0.86], [1.14, 0.86, 1.16]
        ]),
        eulerTrack('belly', t, [
            [0.22, 0, 0.14], [-0.20, 0, -0.12], [0.22, 0, -0.14],
            [-0.20, 0, 0.12], [0.22, 0, 0.14]
        ]),
        // Neck_01: low, forward — desperate
        buildRotationTrack('neck_01', t, [-0.10, -0.06, -0.10, -0.06, -0.10], AXIS_X),
        // Head: low and scanning side to side
        eulerTrack('head', t, [
            [-0.12, 0.14, 0], [-0.06, -0.10, 0], [-0.12, -0.14, 0],
            [-0.06, 0.10, 0], [-0.12, 0.14, 0]
        ]),
        // Front legs: reaching forward desperately — almost galloping
        buildRotationTrack('frontUpperLeg_L', t, [0.55, -0.35, 0.55, -0.35, 0.55], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [-0.35, 0.55, -0.35, 0.55, -0.35], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [-0.10, -0.45, -0.10, -0.48, -0.10], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [-0.10, -0.48, -0.10, -0.45, -0.10], AXIS_X),
        // Hind legs: desperate longer stride — heavy but fast
        buildRotationTrack('hindUpperLeg_L', t, [0.60, 0, -0.60, 0, 0.60], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [-0.60, 0, 0.60, 0, -0.60], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [-0.10, -0.50, -0.12, -0.55, -0.10], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [-0.12, -0.55, -0.10, -0.50, -0.12], AXIS_X),
        // Tail: bouncing wildly
        buildRotationTrack('tail_01', t, [0.15, -0.10, 0.15, -0.10, 0.15], AXIS_Y),
    ]);
}

function _bearBash() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // REARS UP → front legs lift → SLAMS DOWN → belly explodes → settle
    const t = [0, 0.25, 0.40, 0.50, 0.60, 0.72, 0.86, dur];

    return new THREE.AnimationClip('bear_bash_door', dur, [
        // Root: rises up (rear), then CRASHES forward and down
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.14 * s, -0.08 * s], [0, ry - 0.08, 0.28 * s],
            [0, ry - 0.12, 0.22 * s], [0, ry - 0.06, 0.12 * s],
            [0, ry - 0.02, 0.06 * s], [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Spine_mid: arches back to rear up (~60°), then drives down hard
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.50, 0, 0], [-0.35, 0, 0],
            [-0.25, 0, 0.04], [-0.14, 0, -0.03],
            [-0.06, 0, 0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Chest: follows the rear/slam
        eulerTrack('chest', t, [
            [0, 0, 0], [0.55, 0, 0], [-0.30, 0, 0],
            [-0.20, 0, 0.03], [-0.10, 0, -0.02],
            [-0.04, 0, 0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Pelvis: tilts back on rear, forward on slam
        buildRotationTrack('pelvis', t, [0, 0.20, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
        // Belly: compresses on rear, EXPLODES on slam, multi-bounce settle
        scaleTrack('belly', t, [
            [1, 1, 1], [0.85, 1.08, 0.82], [1.40, 0.72, 1.48],
            [0.84, 1.18, 0.78], [1.16, 0.88, 1.20],
            [0.92, 1.05, 0.90], [1.04, 0.98, 1.03], [1, 1, 1]
        ]),
        eulerTrack('belly', t, [
            [0, 0, 0], [-0.14, 0, 0], [0.32, 0, 0],
            [-0.16, 0, 0], [0.10, 0, 0],
            [-0.05, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Neck_01: looks up during rear, slams down
        buildRotationTrack('neck_01', t, [0, 0.15, -0.20, 0.08, -0.04, 0.02, 0, 0], AXIS_X),
        // Head: follows neck
        eulerTrack('head', t, [
            [0, 0, 0], [0.18, 0, 0], [-0.25, 0, 0.06],
            [0.12, 0, -0.04], [-0.06, 0, 0.02],
            [0.03, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Front legs: reach up high for rear, then slam down together
        buildRotationTrack('frontUpperLeg_L', t,
            [0, -1.20, 0.35, 0.22, 0.10, 0.04, 0, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t,
            [0, -1.20, 0.35, 0.22, 0.10, 0.04, 0, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t,
            [0, 0.30, -0.65, -0.35, -0.15, -0.05, 0, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t,
            [0, 0.30, -0.65, -0.35, -0.15, -0.05, 0, 0], AXIS_X),
        // Hind legs: brace for the massive slam
        buildRotationTrack('hindUpperLeg_L', t,
            [0, -0.20, 0.30, 0.22, 0.14, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t,
            [0, -0.20, 0.30, 0.22, 0.14, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t,
            [0, 0.10, -0.22, -0.14, -0.08, -0.03, 0, 0], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t,
            [0, 0.10, -0.22, -0.14, -0.08, -0.03, 0, 0], AXIS_X),
    ]);
}

function _bearHitReact() {
    const dur = 0.3;
    const t = [0, 0.05, 0.14, 0.24, dur];
    return new THREE.AnimationClip('bear_hit_react', dur, [
        // Barely flinches — just a tiny shift backward. Bear is TOUGH.
        posTrack('root', t, [
            [0, 0, 0], [0, 0, -0.03], [0, 0, -0.015], [0, 0, -0.005], [0, 0, 0]
        ]),
        // Slight head turn — more annoyed than hurt, growl pose
        eulerTrack('head', t, [
            [0, 0, 0], [-0.06, -0.10, 0], [-0.02, -0.04, 0], [-0.005, -0.01, 0], [0, 0, 0]
        ]),
        // Belly jiggles from impact (secondary)
        eulerTrack('belly', t, [
            [0, 0, 0], [0.08, 0, 0.03], [-0.04, 0, -0.015], [0.02, 0, 0.005], [0, 0, 0]
        ]),
        scaleTrack('belly', t, [
            [1, 1, 1], [1.08, 0.94, 1.10], [0.96, 1.03, 0.95], [1.02, 0.99, 1.01], [1, 1, 1]
        ]),
        // Spine_mid barely moves — just a tiny grunt-flex
        buildRotationTrack('spine_mid', t, [0, 0.03, 0.01, 0.003, 0], AXIS_X),
    ]);
}

function _bearDeath() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;
    const t = [0, 0.12, 0.26, 0.42, 0.56, 0.70, dur];

    return new THREE.AnimationClip('bear_death', dur, [
        // Slow, inevitable forward topple — tries to stay up, legs give out
        posTrack('root', t, [
            [0, ry, 0], [0, ry * 0.95, 0.04 * s], [0, ry * 0.82, 0.12 * s],
            [0, ry * 0.55, 0.28 * s], [0, ry * 0.22, 0.52 * s],
            [0, ry * 0.06, 0.72 * s], [0, 0, 0.82 * s]
        ]),
        // Root tips forward — timber fall, massive frame
        buildRotationTrack('root', t, [0, -0.10, -0.30, -0.65, -1.05, -1.38, -1.57], AXIS_X),
        // Pelvis sags
        buildRotationTrack('pelvis', t, [0, -0.04, -0.10, -0.18, -0.24, -0.28, -0.30], AXIS_X),
        // Spine_mid: sways trying to balance, then gives up
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.04, 0, 0.06], [-0.12, 0, -0.08],
            [-0.22, 0, 0.10], [-0.30, 0, 0.06], [-0.35, 0, 0.03], [-0.38, 0, 0]
        ]),
        // Belly: bounces as the body falls
        scaleTrack('belly', t, [
            [1, 1, 1], [1, 1, 1], [1.06, 0.94, 1.08],
            [1.20, 0.82, 1.24], [0.86, 1.14, 0.84],
            [1.08, 0.95, 1.06], [1, 1, 1]
        ]),
        eulerTrack('belly', t, [
            [0, 0, 0], [0.04, 0, 0], [0.10, 0, 0.04],
            [0.24, 0, 0.12], [0.16, 0, 0.18], [0.08, 0, 0.10], [0.04, 0, 0.06]
        ]),
        // Head: tries to look up, then droops
        eulerTrack('head', t, [
            [0, 0, 0], [0.10, 0, 0], [0.18, 0, 0.06],
            [0.08, 0, 0.10], [-0.04, 0, 0.08], [-0.08, 0, 0.04], [-0.10, 0, 0]
        ]),
        // Front legs: reach out trying to catch self, then go limp
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.12, 0.30, 0.20, 0.08, 0, -0.08], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.16, 0.38, 0.25, 0.10, 0.02, -0.06], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.10, -0.30, -0.50, -0.65, -0.75, -0.80], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.08, -0.25, -0.42, -0.58, -0.68, -0.74], AXIS_X),
        // Hind legs: buckle
        buildRotationTrack('hindUpperLeg_L', t, [0, 0.15, 0.40, 0.65, 0.82, 0.95, 1.00], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, 0.10, 0.32, 0.55, 0.72, 0.85, 0.90], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, -0.12, -0.38, -0.68, -0.95, -1.20, -1.35], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, -0.08, -0.30, -0.55, -0.82, -1.10, -1.25], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// FOX — darting trot gait, diagonal pairs, low predatory crouch
// Personality: cunning, quick, head darts side to side, nervous scanning
// Bones: root, pelvis, spine_mid, chest, neck_01, head,
//   scapula_L/R, frontUpperLeg_L/R, frontLowerLeg_L/R,
//   hindUpperLeg_L/R, hindLowerLeg_L/R,
//   tail_01 through tail_04
// ═══════════════════════════════════════════════════════════════════════

function _foxDart() {
    const c = ENEMY_VISUAL_CONFIG.fox;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const fsw = a.frontLegSwing;
    const hsw = a.hindLegSwing;
    const und = a.spineUndulate;
    const twist = a.spineTwist;
    const tw = a.tailWave;
    const sc = a.scapulaSlide;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // Trot gait: LH+RF diagonal (0%) → suspension (25%) → RH+LF diagonal (50%) → suspension (75%)
    return new THREE.AnimationClip('fox_dart', dur, [
        // Root: pronounced vertical bounce between diagonals — brief airborne suspension
        posTrack('root', t, [
            [0.02 * s, ry, 0], [-0.02 * s, ry + bob, 0],
            [0.02 * s, ry, 0], [-0.02 * s, ry + bob, 0],
            [0.02 * s, ry, 0]
        ]),
        // Pelvis: minimal lateral sway — spine stays straighter in trot
        eulerTrack('pelvis', t, [
            [-und, 0, 0], [0, 0, 0], [und, 0, 0], [0, 0, 0], [-und, 0, 0]
        ]),
        // Spine_mid: dorsoventral flexion — straighter than walk, slight compression
        eulerTrack('spine_mid', t, [
            [und, twist, 0], [0, 0, 0], [-und, -twist, 0],
            [0, 0, 0], [und, twist, 0]
        ]),
        // Chest: counter-twist — slinky predator motion
        eulerTrack('chest', t, [
            [0, -twist * 0.4, 0], [0, 0, 0],
            [0, twist * 0.4, 0], [0, 0, 0], [0, -twist * 0.4, 0]
        ]),
        // Neck_01: low and forward — hunting posture, darting side to side
        eulerTrack('neck_01', t, [
            [-0.08, 0, 0], [-0.04, 0, 0], [-0.08, 0, 0],
            [-0.04, 0, 0], [-0.08, 0, 0]
        ]),
        // Head: darts side to side nervously — quick scanning
        eulerTrack('head', t, [
            [0.04, 0.22, 0.05], [-0.03, -0.16, -0.04],
            [0.06, -0.25, 0.06], [-0.03, 0.18, -0.05],
            [0.04, 0.22, 0.05]
        ]),
        // Scapulae: slide with front stride
        buildRotationTrack('scapula_L', t, [-sc, 0, sc, 0, -sc], AXIS_X),
        buildRotationTrack('scapula_R', t, [sc, 0, -sc, 0, sc], AXIS_X),
        // TROT: LH + RF swing together (diagonal pair at 0%)
        buildRotationTrack('hindUpperLeg_L', t, [hsw, 0, -hsw, 0, hsw], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [fsw, 0, -fsw, 0, fsw], AXIS_X),
        // TROT: RH + LF swing together (opposite phase, diagonal pair at 50%)
        buildRotationTrack('hindUpperLeg_R', t, [-hsw, 0, hsw, 0, -hsw], AXIS_X),
        buildRotationTrack('frontUpperLeg_L', t, [-fsw, 0, fsw, 0, -fsw], AXIS_X),
        // Front lower legs: deep flex during swing — nimble paws
        buildRotationTrack('frontLowerLeg_L', t, [-0.10, -0.55, -0.14, -0.10, -0.10], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [-0.14, -0.10, -0.10, -0.55, -0.14], AXIS_X),
        // Hind lower legs: quick flex
        buildRotationTrack('hindLowerLeg_L', t, [-0.55, -0.10, -0.10, -0.10, -0.55], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [-0.10, -0.10, -0.55, -0.10, -0.10], AXIS_X),
        // Tail: sways with wave delay per bone — bushy fox tail streams
        buildRotationTrack('tail_01', t, [tw, 0, -tw, 0, tw], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, tw, 0, -tw, 0], AXIS_Y),
        buildRotationTrack('tail_03', t, [-tw, 0, tw, 0, -tw], AXIS_Y),
        buildRotationTrack('tail_04', t, [0, -tw, 0, tw, 0], AXIS_Y),
    ]);
}

function _foxBash() {
    const c = ENEMY_VISUAL_CONFIG.fox;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;

    // Quick lunging pounce bites — rapid root forward, neck extends, head snaps
    const t = [0, 0.08, 0.16, 0.24, 0.34, 0.44, 0.52, dur];

    return new THREE.AnimationClip('fox_bash_door', dur, [
        // Root: quick lunges forward — pounce, pull back, pounce again
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.10 * s], [0, ry, 0.02 * s],
            [0, ry, 0.12 * s], [0, ry, 0.02 * s],
            [0, ry, 0.14 * s], [0, ry, 0.04 * s], [0, ry, 0]
        ]),
        // Spine_mid: snaps forward on each lunge, recoils between
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.22, 0.08, 0], [0, -0.05, 0],
            [-0.25, -0.10, 0], [0, 0.06, 0],
            [-0.28, 0.06, 0], [-0.04, -0.04, 0], [0, 0, 0]
        ]),
        // Neck_01: extends far forward on each bite/snap
        buildRotationTrack('neck_01', t, [0, -0.25, 0.05, -0.28, 0.06, -0.30, 0.04, 0], AXIS_X),
        // Head: snapping bites — jaw clamps down with each strike
        eulerTrack('head', t, [
            [0, 0, 0], [-0.18, 0, 0], [0.10, 0.08, 0],
            [-0.20, -0.10, 0], [0.08, 0.06, 0],
            [-0.22, 0, 0.05], [0.06, -0.06, -0.03], [0, 0, 0]
        ]),
        // Front legs: scratch at door between bites
        buildRotationTrack('frontUpperLeg_L', t,
            [0, -0.30, 0.10, -0.35, 0.08, -0.32, 0.06, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t,
            [0, 0.10, -0.32, 0.08, -0.30, 0.06, -0.28, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t,
            [0, -0.45, 0.08, -0.50, 0.06, -0.42, 0.04, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t,
            [0, 0.08, -0.48, 0.06, -0.44, 0.04, -0.40, 0], AXIS_X),
        // Hind legs: shift weight forward on each lunge
        buildRotationTrack('hindUpperLeg_L', t,
            [0, 0.10, 0, 0.12, 0, 0.14, 0.04, 0], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t,
            [0, 0.12, 0, 0.10, 0, 0.16, 0.04, 0], AXIS_X),
        // Tail: flicks with excitement on each pounce
        buildRotationTrack('tail_01', t, [0, 0.20, -0.10, 0.25, -0.08, 0.22, -0.06, 0], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, -0.10, 0.18, -0.12, 0.20, -0.10, 0.08, 0], AXIS_Y),
    ]);
}

function _foxHitReact() {
    const dur = 0.25;
    const t = [0, 0.03, 0.10, 0.18, dur];
    return new THREE.AnimationClip('fox_hit_react', dur, [
        // Yelp pose — crouches low, spine cringes, neck tucks
        posTrack('root', t, [
            [0, 0, 0], [0, -0.04, -0.12], [0, -0.02, -0.06], [0, -0.005, -0.02], [0, 0, 0]
        ]),
        // Spine_mid cringes — curls protectively
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.16, 0, 0.06], [0.06, 0, 0.02], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Neck_01 tucks in
        buildRotationTrack('neck_01', t, [0, 0.15, 0.05, 0.01, 0], AXIS_X),
        // Head jerks back — yelp!
        eulerTrack('head', t, [
            [0, 0, 0], [0.12, -0.14, 0], [0.04, -0.05, 0], [0.01, -0.01, 0], [0, 0, 0]
        ]),
        // Tail tucks slightly
        buildRotationTrack('tail_01', t, [0, 0.20, 0.08, 0.02, 0], AXIS_X),
    ]);
}

function _foxDeath() {
    const c = ENEMY_VISUAL_CONFIG.fox;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;
    const t = [0, 0.08, 0.18, 0.30, 0.44, dur];

    return new THREE.AnimationClip('fox_death', dur, [
        // Spins, stumbles, drops sideways — dramatic fox tumble
        posTrack('root', t, [
            [0, ry, 0], [0.06 * s, ry * 0.80, 0], [0.16 * s, ry * 0.45, 0.04 * s],
            [0.28 * s, ry * 0.15, 0.02 * s], [0.32 * s, ry * 0.02, 0],
            [0.32 * s, 0, 0]
        ]),
        // Root spins during fall — dramatic twist
        eulerTrack('root', t, [
            [0, 0, 0], [0, 0.35, -0.20], [0, 0.65, -0.55],
            [0, 0.45, -0.95], [0, 0.25, -1.35], [0, 0.15, -1.50]
        ]),
        // Spine_mid twists with the spin
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.12, 0.10, 0.06], [-0.28, -0.08, 0.10],
            [-0.42, 0.06, 0.12], [-0.52, 0.03, 0.08], [-0.55, 0, 0.05]
        ]),
        // Pelvis follows
        buildRotationTrack('pelvis', t, [0, -0.06, -0.15, -0.22, -0.28, -0.30], AXIS_X),
        // Neck_01: goes limp during fall
        buildRotationTrack('neck_01', t, [0, -0.08, -0.18, -0.14, -0.08, -0.04], AXIS_X),
        // Head: rolls with momentum
        eulerTrack('head', t, [
            [0, 0, 0], [-0.08, 0.14, 0.06], [-0.14, -0.10, 0.14],
            [-0.06, 0.08, 0.18], [-0.02, 0.04, 0.12], [0, 0.02, 0.08]
        ]),
        // Front legs buckle
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.25, 0.50, 0.72, 0.85, 0.90], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.18, 0.40, 0.60, 0.75, 0.80], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.20, -0.45, -0.70, -0.90, -1.00], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.16, -0.38, -0.60, -0.82, -0.90], AXIS_X),
        // Hind legs buckle
        buildRotationTrack('hindUpperLeg_L', t, [0, 0.30, 0.60, 0.85, 0.95, 1.00], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, 0.22, 0.48, 0.72, 0.85, 0.90], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, -0.25, -0.55, -0.85, -1.10, -1.20], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, -0.20, -0.45, -0.72, -1.00, -1.10], AXIS_X),
        // Tail goes limp, trails behind
        buildRotationTrack('tail_01', t, [0, 0.10, 0.06, -0.04, -0.08, -0.10], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, 0.06, 0.10, 0, -0.06, -0.08], AXIS_Y),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// MOOSE — unstoppable quadruped, eerily smooth 4-beat walk
// Personality: massive antlers, barely any bob, relentless mechanical march
// Bones: root, pelvis, spine_mid, chest, neck_01, neck_02, head,
//   scapula_L/R, frontUpperLeg_L/R, frontLowerLeg_L/R, frontFoot_L/R,
//   hindUpperLeg_L/R, hindLowerLeg_L/R, hindFoot_L/R, tail_01
// ═══════════════════════════════════════════════════════════════════════

function _mooseCharge() {
    const c = ENEMY_VISUAL_CONFIG.moose;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const fsw = a.frontLegSwing;
    const hsw = a.hindLegSwing;
    const und = a.spineUndulate;
    const tw = a.tailWave;
    const sc = a.scapulaSlide;
    const t5 = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // 9-keyframe legs for flat spots at extremes (mechanical planting, like power walker)
    const d8 = dur / 8;
    const tLegs = [0, d8, d8 * 2, d8 * 3, d8 * 4, d8 * 5, d8 * 6, d8 * 7, dur];

    // 4-beat walk: LH → LF → RH → RF
    return new THREE.AnimationClip('moose_charge', dur, [
        // Root: barely any bob — eerily smooth, massive weight glides forward
        posTrack('root', t5, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Pelvis: almost zero undulation — eerily rigid
        eulerTrack('pelvis', t5, [
            [0, und, 0], [0, 0, 0], [0, -und, 0], [0, 0, 0], [0, und, 0]
        ]),
        // Spine_mid: perfectly straight, relentless forward momentum
        eulerTrack('spine_mid', t5, [
            [0, -und * 0.3, 0], [0, 0, 0], [0, und * 0.3, 0],
            [0, 0, 0], [0, -und * 0.3, 0]
        ]),
        // Chest: barely moves
        eulerTrack('chest', t5, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Neck_01: angled slightly down — head leads the charge
        buildRotationTrack('neck_01', t5, [-0.04, -0.02, -0.04, -0.02, -0.04], AXIS_X),
        // Neck_02: barely moves — mechanical
        buildRotationTrack('neck_02', t5, [-0.02, -0.01, -0.02, -0.01, -0.02], AXIS_X),
        // Head: barely moves — antlers sway with subtle weight
        eulerTrack('head', t5, [
            [0, 0, -0.02], [0, 0, 0], [0, 0, 0.02],
            [0, 0, 0], [0, 0, -0.02]
        ]),
        // Scapulae: slide with front stride
        buildRotationTrack('scapula_L', t5, [0, sc, 0, -sc, 0], AXIS_X),
        buildRotationTrack('scapula_R', t5, [0, -sc, 0, sc, 0], AXIS_X),
        // Front upper legs: massive deliberate swing with flat spots (mechanical planting)
        // LF peaks at 25%, RF peaks at 75%
        buildRotationTrack('frontUpperLeg_L', tLegs,
            [0, fsw * 0.5, fsw, fsw, 0, -fsw * 0.5, -fsw, -fsw * 0.5, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', tLegs,
            [0, -fsw * 0.5, -fsw, -fsw * 0.5, 0, fsw * 0.5, fsw, fsw, 0], AXIS_X),
        // Front lower legs: crisp knee bend
        buildRotationTrack('frontLowerLeg_L', t5, [-0.06, -0.45, -0.06, -0.10, -0.06], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t5, [-0.06, -0.10, -0.06, -0.45, -0.06], AXIS_X),
        // Front feet: firm hooved planting
        buildRotationTrack('frontFoot_L', t5, [0, -0.18, 0.12, 0, 0], AXIS_X),
        buildRotationTrack('frontFoot_R', t5, [0, 0, 0, -0.18, 0], AXIS_X),
        // Hind upper legs: massive swing with flat spots — LH peaks at 0%, RH at 50%
        buildRotationTrack('hindUpperLeg_L', tLegs,
            [hsw, hsw, 0, -hsw * 0.5, -hsw, -hsw, 0, hsw * 0.5, hsw], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', tLegs,
            [-hsw, -hsw, 0, hsw * 0.5, hsw, hsw, 0, -hsw * 0.5, -hsw], AXIS_X),
        // Hind lower legs: crisp knee bend
        buildRotationTrack('hindLowerLeg_L', t5, [-0.50, -0.06, -0.06, -0.06, -0.50], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t5, [-0.06, -0.06, -0.50, -0.06, -0.06], AXIS_X),
        // Hind feet: firm hoof plant
        buildRotationTrack('hindFoot_L', t5, [-0.18, 0.08, 0.12, 0, -0.18], AXIS_X),
        buildRotationTrack('hindFoot_R', t5, [0.12, 0, -0.18, 0.08, 0.12], AXIS_X),
        // Tail: barely sways — stiff stubby moose tail
        buildRotationTrack('tail_01', t5, [tw, 0, -tw, 0, tw], AXIS_Y),
    ]);
}

function _mooseBash() {
    const c = ENEMY_VISUAL_CONFIG.moose;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.9;

    // Lowers head → charges forward → MASSIVE antler impact → bounces back
    const t = [0, 0.20, 0.35, 0.45, 0.55, 0.68, 0.80, dur];

    return new THREE.AnimationClip('moose_bash_door', dur, [
        // Root: steps back, lowers, then charges → SLAM
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.10 * s], [0, ry - 0.06, 0.24 * s],
            [0, ry - 0.10, 0.18 * s], [0, ry - 0.04, 0.10 * s],
            [0, ry, 0.05 * s], [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Pelvis: drives the charge
        buildRotationTrack('pelvis', t, [0, 0.06, -0.14, -0.10, -0.05, -0.02, 0, 0], AXIS_X),
        // Spine_mid: loads up, then drives forward with full body
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.08, 0, 0], [-0.22, 0, 0],
            [-0.16, 0, 0.04], [-0.08, 0, -0.02],
            [-0.03, 0, 0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Neck_01: extends forward massively — antlers leading
        buildRotationTrack('neck_01', t, [0, 0.10, -0.28, -0.20, -0.10, -0.03, 0, 0], AXIS_X),
        // Neck_02: follows
        buildRotationTrack('neck_02', t, [0, 0.06, -0.20, -0.14, -0.06, -0.02, 0, 0], AXIS_X),
        // Head: dips down (antlers forward), recoils on impact
        eulerTrack('head', t, [
            [0, 0, 0], [0.08, 0, 0], [-0.25, 0, 0],
            [0.15, 0, 0.04], [0.06, 0, -0.02],
            [0.02, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Front legs: brace on impact
        buildRotationTrack('frontUpperLeg_L', t,
            [0, 0.10, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t,
            [0, 0.10, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t,
            [0, -0.06, -0.28, -0.18, -0.08, -0.03, 0, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t,
            [0, -0.06, -0.28, -0.18, -0.08, -0.03, 0, 0], AXIS_X),
        // Front feet: dig in
        buildRotationTrack('frontFoot_L', t,
            [0, 0.10, -0.16, -0.10, -0.04, -0.01, 0, 0], AXIS_X),
        buildRotationTrack('frontFoot_R', t,
            [0, 0.10, -0.16, -0.10, -0.04, -0.01, 0, 0], AXIS_X),
        // Hind legs: drive off back legs for the charge
        buildRotationTrack('hindUpperLeg_L', t,
            [0, -0.16, 0.26, 0.20, 0.10, 0.04, 0.01, 0], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t,
            [0, -0.16, 0.26, 0.20, 0.10, 0.04, 0.01, 0], AXIS_X),
        // Hind feet: dig in for charge momentum
        buildRotationTrack('hindFoot_L', t,
            [0, 0.16, -0.20, -0.14, -0.06, -0.02, 0, 0], AXIS_X),
        buildRotationTrack('hindFoot_R', t,
            [0, 0.16, -0.20, -0.14, -0.06, -0.02, 0, 0], AXIS_X),
    ]);
}

function _mooseHitReact() {
    const dur = 0.3;
    const t = [0, 0.05, 0.14, dur];
    // Barely reacts — slight head toss, antlers sway with weight. Unstoppable.
    return new THREE.AnimationClip('moose_hit_react', dur, [
        posTrack('root', t, [[0, 0, 0], [0, 0, -0.025], [0, 0, -0.008], [0, 0, 0]]),
        // Spine_mid: tiny flex
        buildRotationTrack('spine_mid', t, [0, 0.02, 0.006, 0], AXIS_X),
        // Head toss — antlers swing with weight
        eulerTrack('head', t, [
            [0, 0, 0], [-0.10, 0, -0.08], [-0.03, 0, -0.025], [0, 0, 0]
        ]),
        // Neck_01 recoil
        buildRotationTrack('neck_01', t, [0, 0.06, 0.02, 0], AXIS_X),
        // Neck_02 follows
        buildRotationTrack('neck_02', t, [0, 0.04, 0.012, 0], AXIS_X),
    ]);
}

function _mooseDeath() {
    const c = ENEMY_VISUAL_CONFIG.moose;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.9;
    const t = [0, 0.14, 0.30, 0.48, 0.64, 0.78, dur];

    return new THREE.AnimationClip('moose_death', dur, [
        // Legs give out, massive sideways topple — ground-shaking timber fall
        posTrack('root', t, [
            [0, ry, 0], [0.06 * s, ry * 0.92, 0], [0.18 * s, ry * 0.65, 0],
            [0.38 * s, ry * 0.32, 0], [0.52 * s, ry * 0.08, 0],
            [0.58 * s, ry * 0.01, 0], [0.60 * s, 0, 0]
        ]),
        // Root tilts sideways — massive timber fall
        buildRotationTrack('root', t, [0, -0.12, -0.40, -0.82, -1.25, -1.48, -1.57], AXIS_Z),
        // Pelvis: tries to compensate, fails
        eulerTrack('pelvis', t, [
            [0, 0, 0], [0, 0, 0.06], [0, 0, 0.12],
            [0, 0, 0.16], [0, 0, 0.12], [0, 0, 0.08], [0, 0, 0.05]
        ]),
        // Spine_mid: tries to right itself, then gives up
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0, 0, 0.04], [0, 0, 0.10],
            [0, 0, 0.14], [0, 0, 0.10], [0, 0, 0.06], [0, 0, 0.04]
        ]),
        // Neck_01: goes limp
        buildRotationTrack('neck_01', t, [0, -0.04, -0.12, -0.20, -0.26, -0.28, -0.30], AXIS_X),
        // Neck_02: follows
        buildRotationTrack('neck_02', t, [0, -0.02, -0.06, -0.10, -0.13, -0.14, -0.15], AXIS_X),
        // Head: antlers swing with momentum, then settle heavy
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, -0.06], [0, 0.08, -0.14],
            [0, 0.06, -0.22], [0, 0.03, -0.16], [0, 0.02, -0.10], [0, 0, -0.08]
        ]),
        // Front legs: reach out then go limp
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.10, 0.28, 0.18, 0.06, 0, -0.08], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.14, 0.35, 0.25, 0.10, 0.02, -0.05], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.08, -0.28, -0.50, -0.70, -0.85, -0.92], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.06, -0.22, -0.42, -0.62, -0.78, -0.85], AXIS_X),
        // Hind legs buckle — heavy crash
        buildRotationTrack('hindUpperLeg_L', t, [0, 0.15, 0.45, 0.75, 0.95, 1.05, 1.10], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, 0.10, 0.35, 0.60, 0.82, 0.95, 1.00], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, -0.12, -0.40, -0.75, -1.10, -1.35, -1.50], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, -0.08, -0.30, -0.62, -0.95, -1.25, -1.40], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// RACCOON — sneaky quadruped, exaggerated hip-sway waddle
// Personality: curious mischief-maker, always looking around, hunched and sneaky
// Bones: root, pelvis, spine_mid, chest, neck_01, head,
//   frontUpperLeg_L/R, frontLowerLeg_L/R,
//   hindUpperLeg_L/R, hindLowerLeg_L/R,
//   tail_01 through tail_04
// ═══════════════════════════════════════════════════════════════════════

function _raccoonWaddle() {
    const c = ENEMY_VISUAL_CONFIG.raccoon;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const fsw = a.frontLegSwing;
    const hsw = a.hindLegSwing;
    const hipSway = a.hipSway;
    const und = a.spineUndulate;
    const tw = a.tailWave;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // 4-beat lateral walk: LH(0%) → LF(25%) → RH(50%) → RF(75%)
    return new THREE.AnimationClip('raccoon_waddle', dur, [
        // Root: exaggerated hip sway — sneaky little waddle
        eulerTrack('root', t, [
            [0, 0, -hipSway], [0, 0, 0], [0, 0, hipSway],
            [0, 0, 0], [0, 0, -hipSway]
        ]),
        // Bouncy little bob
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Pelvis: lateral S-curve with hip sway
        eulerTrack('pelvis', t, [
            [0, und, hipSway * 0.5], [0, 0, 0], [0, -und, -hipSway * 0.5],
            [0, 0, 0], [0, und, hipSway * 0.5]
        ]),
        // Spine_mid: hunched forward + counter-sway — sneaky posture
        eulerTrack('spine_mid', t, [
            [0, -und * 0.5, 0], [0, 0, 0], [0, und * 0.5, 0],
            [0, 0, 0], [0, -und * 0.5, 0]
        ]),
        // Chest: delayed follow-through on sway
        eulerTrack('chest', t, [
            [0, 0, 0], [0, 0, hipSway * 0.3], [0, 0, 0],
            [0, 0, -hipSway * 0.3], [0, 0, 0]
        ]),
        // Neck_01: curious craning — looking around for opportunities
        buildRotationTrack('neck_01', t, [0.04, -0.02, 0.04, -0.02, 0.04], AXIS_X),
        // Head: turns side to side constantly — curious and chatty raccoon
        eulerTrack('head', t, [
            [0.06, 0.28, 0], [-0.04, 0.10, 0], [0.06, -0.28, 0],
            [-0.04, -0.10, 0], [0.06, 0.28, 0]
        ]),
        // Front upper legs: LF peaks at 25%, RF at 75%
        buildRotationTrack('frontUpperLeg_L', t, [0, fsw, 0, -fsw, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, -fsw, 0, fsw, 0], AXIS_X),
        // Front lower legs: springy little steps
        buildRotationTrack('frontLowerLeg_L', t, [-0.08, -0.35, -0.10, -0.08, -0.08], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [-0.08, -0.08, -0.10, -0.35, -0.08], AXIS_X),
        // Hind upper legs: LH peaks at 0%, RH at 50%
        buildRotationTrack('hindUpperLeg_L', t, [hsw, 0, -hsw, 0, hsw], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [-hsw, 0, hsw, 0, -hsw], AXIS_X),
        // Hind lower legs: playful waddling steps
        buildRotationTrack('hindLowerLeg_L', t, [-0.38, -0.08, -0.10, -0.08, -0.38], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [-0.10, -0.08, -0.38, -0.08, -0.10], AXIS_X),
        // Tail: sways with wave delay per bone — raccoon ring-tail
        buildRotationTrack('tail_01', t, [tw, 0, -tw, 0, tw], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, tw, 0, -tw, 0], AXIS_Y),
        buildRotationTrack('tail_03', t, [-tw, 0, tw, 0, -tw], AXIS_Y),
        buildRotationTrack('tail_04', t, [0, -tw, 0, tw, 0], AXIS_Y),
    ]);
}

function _raccoonBash() {
    const c = ENEMY_VISUAL_CONFIG.raccoon;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;

    // Small frantic body pushes + examining door between pushes — curious raccoon
    const t = [0, 0.08, 0.16, 0.24, 0.34, 0.44, 0.52, dur];

    return new THREE.AnimationClip('raccoon_bash_door', dur, [
        // Root: little frantic pushes — body bumps against door
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.06 * s], [0, ry, 0],
            [0, ry - 0.02, 0.08 * s], [0, ry, 0.02 * s],
            [0, ry, 0.07 * s], [0, ry + 0.02, 0.03 * s], [0, ry, 0]
        ]),
        // Hip shift — sneaky weight distribution
        eulerTrack('root', t, [
            [0, 0, 0], [0, 0, 0.06], [0, 0, 0],
            [0, 0, -0.08], [0, 0, 0],
            [0, 0, 0.05], [0, 0, -0.04], [0, 0, 0]
        ]),
        // Spine_mid: leans into each push, pulls back to examine
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.16, 0, 0], [0, 0.10, 0],
            [-0.18, -0.08, 0], [0.02, 0.06, 0],
            [-0.17, 0, 0.04], [0, -0.06, -0.03], [0, 0, 0]
        ]),
        // Neck_01: cranes to examine door
        buildRotationTrack('neck_01', t, [0, -0.08, 0.04, -0.10, 0.03, -0.09, 0.02, 0], AXIS_X),
        // Head: examining the door between pushes — curious raccoon behavior
        eulerTrack('head', t, [
            [0, 0.18, 0], [-0.06, 0, 0], [0, -0.22, 0.06],
            [-0.04, 0.14, -0.04], [0, -0.18, 0],
            [-0.08, 0.08, 0.06], [0.04, -0.12, -0.04], [0, 0.18, 0]
        ]),
        // Front legs: scratching and pushing at door
        buildRotationTrack('frontUpperLeg_L', t,
            [0, -0.20, 0.06, -0.24, 0.04, -0.22, 0.02, 0], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t,
            [0, 0.06, -0.22, 0.04, -0.20, 0.02, -0.18, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t,
            [0, -0.25, -0.06, -0.28, -0.04, -0.26, -0.08, 0], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t,
            [0, -0.06, -0.26, -0.04, -0.24, -0.06, -0.22, 0], AXIS_X),
        // Hind legs: little frustrated stomps between pushes
        buildRotationTrack('hindUpperLeg_L', t,
            [0, 0.14, 0, 0.18, 0, 0.22, 0.08, 0], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t,
            [0, 0.18, 0, 0.14, 0, 0.16, 0.10, 0], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t,
            [0, -0.18, 0, -0.22, 0, -0.30, -0.10, 0], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t,
            [0, -0.22, 0, -0.18, 0, -0.24, -0.12, 0], AXIS_X),
        // Tail: twitches with frustration
        buildRotationTrack('tail_01', t, [0, 0.18, -0.12, 0.22, -0.08, 0.16, -0.06, 0], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, -0.12, 0.16, -0.14, 0.10, -0.10, 0.04, 0], AXIS_Y),
    ]);
}

function _raccoonHitReact() {
    const dur = 0.25;
    const t = [0, 0.03, 0.10, 0.18, dur];
    return new THREE.AnimationClip('raccoon_hit_react', dur, [
        // Startled jump upward — springs up, flattens briefly
        posTrack('root', t, [
            [0, 0, 0], [0, 0.08, -0.06], [0, -0.02, -0.03], [0, 0, -0.01], [0, 0, 0]
        ]),
        // Spine crunches flat (playing dead instinct)
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [0.14, 0, 0], [0.05, 0, 0], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Squash scale on land — flattens
        scaleTrack('root', t, [
            [1, 1, 1], [0.85, 1.20, 0.85], [1.10, 0.88, 1.10], [1.02, 0.98, 1.02], [1, 1, 1]
        ]),
        // Tail poofs out
        buildRotationTrack('tail_01', t, [0, -0.30, -0.12, -0.03, 0], AXIS_X),
        buildRotationTrack('tail_02', t, [0, -0.20, -0.08, -0.02, 0], AXIS_X),
    ]);
}

function _raccoonDeath() {
    const c = ENEMY_VISUAL_CONFIG.raccoon;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const t = [0, 0.08, 0.18, 0.30, 0.42, dur];

    return new THREE.AnimationClip('raccoon_death', dur, [
        // Rolls over dramatically — playing dead! Classic raccoon
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.04, -0.04], [0, ry * 0.50, -0.06],
            [0, ry * 0.15, -0.04], [0, ry * 0.02, -0.02], [0, 0, 0]
        ]),
        // Root rolls backward — dramatic playing dead
        buildRotationTrack('root', t, [0, 0.30, 0.80, 1.30, 1.50, 1.57], AXIS_X),
        // Pelvis curls under
        buildRotationTrack('pelvis', t, [0, -0.10, -0.22, -0.32, -0.38, -0.40], AXIS_X),
        // Spine_mid curls up — belly exposed (playing dead pose)
        eulerTrack('spine_mid', t, [
            [0, 0, 0], [-0.14, 0, 0.04], [-0.30, 0, 0.06],
            [-0.42, 0, 0.04], [-0.48, 0, 0.02], [-0.50, 0, 0]
        ]),
        // Head: dramatically tilts to side — tongue-out death pose
        eulerTrack('head', t, [
            [0, 0, 0], [-0.10, 0.12, 0.10], [-0.06, 0.20, 0.22],
            [-0.02, 0.16, 0.28], [0, 0.10, 0.24], [0, 0.06, 0.20]
        ]),
        // All four legs stick up stiffly (classic playing dead)
        buildRotationTrack('frontUpperLeg_L', t, [0, 0.30, 0.55, 0.70, 0.76, 0.78], AXIS_X),
        buildRotationTrack('frontUpperLeg_R', t, [0, 0.24, 0.45, 0.60, 0.66, 0.70], AXIS_X),
        buildRotationTrack('frontLowerLeg_L', t, [0, -0.08, -0.16, -0.20, -0.18, -0.16], AXIS_X),
        buildRotationTrack('frontLowerLeg_R', t, [0, -0.06, -0.12, -0.16, -0.14, -0.12], AXIS_X),
        buildRotationTrack('hindUpperLeg_L', t, [0, 0.35, 0.65, 0.80, 0.85, 0.88], AXIS_X),
        buildRotationTrack('hindUpperLeg_R', t, [0, 0.28, 0.55, 0.72, 0.78, 0.82], AXIS_X),
        buildRotationTrack('hindLowerLeg_L', t, [0, -0.10, -0.20, -0.25, -0.22, -0.20], AXIS_X),
        buildRotationTrack('hindLowerLeg_R', t, [0, -0.08, -0.15, -0.20, -0.18, -0.16], AXIS_X),
        // Tail curls up (stiff, playing dead)
        buildRotationTrack('tail_01', t, [0, 0.20, 0.35, 0.42, 0.44, 0.45], AXIS_X),
        buildRotationTrack('tail_02', t, [0, 0.14, 0.25, 0.32, 0.34, 0.35], AXIS_X),
        buildRotationTrack('tail_03', t, [0, 0.08, 0.18, 0.24, 0.26, 0.27], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// OCEAN SCENARIO — marine creatures & pirate
// Smooth aquatic movement, tail propulsion, flipper dynamics,
// and one salty pirate rowing furiously toward the toilet.
// ═══════════════════════════════════════════════════════════════════════


// ─── DOLPHIN ─── smooth undulating swimmer, friendly, nose-first curiosity
// Personality: playful, graceful, rhythmic sine-wave body motion
// ─────────────────────────────────────────────────────────────────────────

function _dolphinWalk() {
    const c = ENEMY_VISUAL_CONFIG.dolphin;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const und = a.bodyUndulate;
    const tsw = a.tailSwing;
    const fp = a.flipperPaddle;
    const ds = a.dorsalSway || 0.05;

    // 11-keyframe BREACH cycle — dramatic dolphin leaping out of water!
    // 0-3: LAUNCH (explosive rise), 3-5: APEX (hang time), 5-7: DIVE (graceful descent),
    // 7-10: UNDERWATER (recovery + power stroke for next breach)
    const t = [0, dur*0.1, dur*0.2, dur*0.3, dur*0.4, dur*0.5, dur*0.6, dur*0.7, dur*0.8, dur*0.9, dur];

    return new THREE.AnimationClip('dolphin_walk', dur, [
        // Root: DRAMATIC breach arc — launches HIGH, hangs at apex, dives back
        posTrack('root', t, [
            [0, ry, 0],                           // at surface, about to launch
            [0, ry + bob * 0.55, 0],               // rising fast
            [0, ry + bob * 0.88, 0],               // near apex
            [0, ry + bob, 0],                      // APEX!
            [0, ry + bob * 0.90, 0],               // still hanging
            [0, ry + bob * 0.55, 0],               // descending
            [0, ry, 0],                            // water level
            [0, ry - bob * 0.22, 0],               // underwater dip
            [0, ry - bob * 0.28, 0],               // deepest
            [0, ry - bob * 0.12, 0],               // rising
            [0, ry, 0]                             // back to surface
        ]),
        // Squash/stretch: stretch on launch, spread at apex, SQUASH at splash
        scaleTrack('root', t, [
            [1, 1, 1],
            [0.90, 1.14, 0.90],                    // stretched upward (launching)
            [0.93, 1.10, 0.93],                    // still stretched
            [1.04, 0.96, 1.04],                    // spread at apex (hang time)
            [1.03, 0.97, 1.03],                    // still spread
            [0.92, 1.12, 0.92],                    // stretching into dive
            [1.16, 0.80, 1.16],                    // SQUASH on water entry!
            [1.06, 0.92, 1.06],                    // recovering underwater
            [1, 1, 1],
            [0.96, 1.05, 0.96],                    // slight pre-stretch
            [1, 1, 1]
        ]),
        // Body front: pitches to follow arc — nose UP on launch, DOWN on dive
        eulerTrack('body_front', t, [
            [und * 0.4, 0, 0],                     // slightly nose-up, about to breach
            [und, 0, 0],                           // nose UP, breaching hard
            [und * 0.5, 0, 0],                     // leveling near apex
            [0, 0, 0.02],                          // level at apex, slight curious tilt
            [-und * 0.3, 0, 0],                    // starting to tip over
            [-und * 0.8, 0, 0],                    // nose DOWN, diving
            [-und * 0.3, 0, 0],                    // leveling at water entry
            [0, 0, 0],                             // level underwater
            [0, 0, 0],                             // level, recovery
            [und * 0.2, 0, 0],                     // starting to angle up
            [und * 0.4, 0, 0]                      // nose up for next breach
        ]),
        // Head: counter-pitch stabilizes gaze, curious look at apex
        eulerTrack('head', t, [
            [-und * 0.25, 0, 0],
            [-und * 0.5, 0.04, 0],                 // stabilized during launch
            [-und * 0.2, -0.02, 0],
            [0.03, -0.04, 0.04],                   // curious look around at apex!
            [und * 0.15, 0.03, -0.02],             // tracking descent
            [und * 0.4, 0, 0],                     // counter-pitch for dive
            [und * 0.15, 0, 0],
            [0, 0.02, 0],                          // scanning underwater
            [0, -0.02, 0],
            [-und * 0.1, 0, 0],
            [-und * 0.25, 0, 0]
        ]),
        // Snout: nods with body motion
        buildRotationTrack('snout', t, [
            -0.02, -0.04, -0.02, 0.02, 0.01, 0.03, 0.01, -0.01, -0.01, -0.02, -0.02
        ], AXIS_X),
        // Dorsal: follows body tilt passively
        buildRotationTrack('dorsal', t, [
            ds, ds * 0.5, 0, -ds * 0.5, -ds, -ds * 0.5, 0, ds * 0.5, ds, ds * 0.5, ds
        ], AXIS_Z),
        // Flippers: swept BACK during launch, SPREAD at apex, tuck on dive, paddle underwater
        eulerTrack('flipper_L', t, [
            [fp * 0.5, 0, 0],                     // neutral
            [fp, 0, 0.12],                         // swept back (launch)
            [fp * 0.6, 0, 0.08],
            [-fp * 0.3, 0, -0.18],                 // SPREAD wide at apex (gliding)
            [-fp * 0.2, 0, -0.14],                 // still spread
            [fp * 0.4, 0, 0.10],                   // tucking for dive
            [fp * 0.8, 0, 0.15],                   // tucked on entry
            [0, 0, 0],                             // neutral underwater
            [-fp * 0.4, 0, -0.06],                 // paddling
            [fp * 0.3, 0, 0.04],                   // paddle return
            [fp * 0.5, 0, 0]
        ]),
        eulerTrack('flipper_R', t, [
            [-fp * 0.5, 0, 0],                     // mirrored
            [-fp, 0, -0.12],
            [-fp * 0.6, 0, -0.08],
            [fp * 0.3, 0, 0.18],                   // SPREAD at apex
            [fp * 0.2, 0, 0.14],
            [-fp * 0.4, 0, -0.10],
            [-fp * 0.8, 0, -0.15],
            [0, 0, 0],
            [fp * 0.4, 0, 0.06],
            [-fp * 0.3, 0, -0.04],
            [-fp * 0.5, 0, 0]
        ]),
        // Body rear: RELAXED in air, POWERFUL driving underwater
        eulerTrack('body_rear', t, [
            [-und * 0.3, 0, 0],                    // coiled for launch
            [und * 0.2, 0, 0],                     // driving
            [0, 0, 0],                             // relaxed in air
            [0, 0, 0],                             // relaxed at apex
            [0, 0, 0],
            [und * 0.15, 0, 0],                    // following dive
            [und * 0.3, 0, 0],                     // absorbing splash
            [0, und * 0.4, 0],                     // POWER STROKE left
            [0, -und * 0.4, 0],                    // POWER STROKE right
            [-und * 0.2, 0, 0],                    // coiling
            [-und * 0.3, 0, 0]
        ]),
        // Tail chain: RELAXED trailing in air, POWERFUL driving underwater
        buildRotationTrack('tail_01', t, [
            0, tsw * 0.2, 0, 0, 0, -tsw * 0.15, 0,
            tsw * 0.8, -tsw * 0.8, tsw * 0.4, 0
        ], AXIS_Y),
        buildRotationTrack('tail_02', t, [
            0, tsw * 0.1, 0, 0, 0, -tsw * 0.1, 0,
            -tsw * 0.5, tsw, -tsw * 0.5, 0
        ], AXIS_Y),
        // Flukes: fan during power strokes, neutral in air
        buildRotationTrack('fluke_L', t, [
            0, 0.02, 0, 0.04, 0.02, 0, -0.02,
            0.10, -0.10, 0.06, 0
        ], AXIS_Z),
        buildRotationTrack('fluke_R', t, [
            0, -0.02, 0, -0.04, -0.02, 0, 0.02,
            -0.10, 0.10, -0.06, 0
        ], AXIS_Z),
    ]);
}

function _dolphinBash() {
    const c = ENEMY_VISUAL_CONFIG.dolphin;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Wind-up → nose-ram → impact → recoil → settle
    const t = [0, 0.18, 0.32, 0.42, 0.58, 0.75, dur];

    return new THREE.AnimationClip('dolphin_bash_door', dur, [
        // Root: pulls back then lunges nose-first into door
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.04, -0.10 * s], [0, ry - 0.02, 0.18 * s],
            [0, ry - 0.04, 0.12 * s], [0, ry, 0.06 * s],
            [0, ry + 0.02, 0.02 * s], [0, ry, 0]
        ]),
        // Body front: pitches down for the ram, snaps back on impact
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.12, 0, 0], [-0.20, 0, 0],
            [0.08, 0, 0], [0.02, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Head: dips down on charge, pushes forward at impact
        eulerTrack('head', t, [
            [0, 0, 0], [0.10, 0, 0], [-0.18, 0, 0],
            [0.10, 0, 0.04], [0.03, 0, -0.02], [0, 0, 0], [0, 0, 0]
        ]),
        // Snout: extends into the ram
        buildRotationTrack('snout', t, [0, 0.06, -0.14, 0.06, 0.02, 0, 0], AXIS_X),
        // Tail powers the lunge — big sweep then settles
        buildRotationTrack('tail_01', t, [0, -0.20, 0.35, 0.18, 0.06, 0.02, 0], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, -0.30, 0.45, 0.22, 0.08, 0.02, 0], AXIS_Y),
        // Flippers brace outward on impact
        buildRotationTrack('flipper_L', t, [0, 0.15, -0.30, -0.15, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, 0.15, -0.30, -0.15, -0.06, 0, 0], AXIS_X),
        // Body rear drives the charge
        eulerTrack('body_rear', t, [
            [0, 0, 0], [-0.10, 0, 0], [0.14, 0, 0],
            [0.06, 0, 0], [0.02, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _dolphinHit() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];
    return new THREE.AnimationClip('dolphin_hit_react', dur, [
        // Quick lateral flinch — body tilts to side
        posTrack('root', t, [
            [0, 0, 0], [0, 0.02, -0.06], [0, 0.01, -0.03], [0, 0, -0.01], [0, 0, 0]
        ]),
        // Body front rocks to the side
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.06, 0, 0.18], [0.02, 0, 0.06], [0, 0, 0.02], [0, 0, 0]
        ]),
        // Flippers flare outward in surprise
        buildRotationTrack('flipper_L', t, [0, -0.35, -0.12, -0.03, 0], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, -0.35, -0.12, -0.03, 0], AXIS_X),
        // Tail whips reactively
        buildRotationTrack('tail_01', t, [0, 0.22, 0.08, 0.02, 0], AXIS_Y),
    ]);
}

function _dolphinDeath() {
    const c = ENEMY_VISUAL_CONFIG.dolphin;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.9;
    const t = [0, 0.12, 0.28, 0.45, 0.65, 0.80, dur];

    return new THREE.AnimationClip('dolphin_death', dur, [
        // Roll to side, sink down — beached dolphin
        posTrack('root', t, [
            [0, ry, 0], [0.06 * s, ry * 0.85, 0], [0.12 * s, ry * 0.60, 0.02 * s],
            [0.16 * s, ry * 0.35, 0.03 * s], [0.18 * s, ry * 0.12, 0.02 * s],
            [0.18 * s, ry * 0.04, 0.01 * s], [0.18 * s, 0, 0]
        ]),
        // Root rotates on Z — rolling to side, belly up
        buildRotationTrack('root', t, [0, -0.20, -0.55, -1.0, -1.35, -1.50, -1.57], AXIS_Z),
        // Body front goes limp — slight droop
        eulerTrack('body_front', t, [
            [0, 0, 0], [-0.04, 0, 0.03], [-0.10, 0, 0.06],
            [-0.16, 0, 0.08], [-0.20, 0, 0.06], [-0.22, 0, 0.04], [-0.24, 0, 0.03]
        ]),
        // Head droops
        eulerTrack('head', t, [
            [0, 0, 0], [-0.06, 0.05, 0], [-0.14, 0.08, 0.06],
            [-0.20, 0.06, 0.10], [-0.24, 0.04, 0.08], [-0.26, 0.02, 0.06], [-0.28, 0, 0.04]
        ]),
        // Tail goes limp — droops with gravity
        buildRotationTrack('tail_01', t, [0, 0.06, 0.14, 0.22, 0.28, 0.32, 0.35], AXIS_X),
        buildRotationTrack('tail_02', t, [0, 0.04, 0.10, 0.18, 0.24, 0.28, 0.30], AXIS_X),
        // Flippers droop outward
        buildRotationTrack('flipper_L', t, [0, -0.10, -0.22, -0.35, -0.42, -0.46, -0.48], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, -0.10, -0.22, -0.35, -0.42, -0.46, -0.48], AXIS_X),
    ]);
}


// ─── FLYING FISH ─── rapid darting, wing-flapping frenzy, hyperactive
// Personality: twitchy, breakneck speed, panicky energy, wings beating furiously
// ───────────────────────────────────────────────────────────────────────────────

function _flyfishWalk() {
    const c = ENEMY_VISUAL_CONFIG.flyfish;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const und = a.bodyUndulate;
    const tsw = a.tailSwing;
    const fp = a.flipperPaddle;
    const ds = a.dorsalSway || 0.08;

    // 12-keyframe cycle: FLAP-FLAP-FLAP (0-40%) → GLIIIIDE (40-90%) → SKIM (90-100%)
    // Two distinct phases give flying fish their signature look
    const t = [0, dur*0.08, dur*0.16, dur*0.24, dur*0.32, dur*0.40,
               dur*0.50, dur*0.60, dur*0.70, dur*0.80, dur*0.90, dur];

    return new THREE.AnimationClip('flyfish_walk', dur, [
        // Root: rapid wing-beat ascent, then long graceful glide descent
        posTrack('root', t, [
            [0, ry - bob * 0.2, 0],                // low (water skim)
            [0, ry + bob * 0.2, 0],                 // FLAP 1 — pop up
            [0, ry + bob * 0.1, 0],                 // dip between flaps
            [0, ry + bob * 0.6, 0],                 // FLAP 2 — higher!
            [0, ry + bob * 0.5, 0],                 // dip
            [0, ry + bob, 0],                       // FLAP 3 — APEX! wings spread now
            [0, ry + bob * 0.88, 0],                // glide...
            [0, ry + bob * 0.65, 0],                // glide...
            [0, ry + bob * 0.40, 0],                // glide descending...
            [0, ry + bob * 0.15, 0],                // glide descending
            [0, ry - bob * 0.10, 0],                // water skim
            [0, ry - bob * 0.2, 0]                  // back to start
        ]),
        // Squash/stretch — pumping on flaps, streamlined on glide
        scaleTrack('root', t, [
            [1.08, 0.88, 1.08],                     // compact at water
            [0.88, 1.16, 0.88],                     // STRETCH on flap
            [1.06, 0.90, 1.06],                     // squash between flaps
            [0.86, 1.18, 0.86],                     // STRETCH on flap
            [1.04, 0.92, 1.04],                     // squash
            [0.90, 1.14, 0.90],                     // final stretch
            [0.96, 1.06, 0.96],                     // elongating into glide
            [0.94, 1.08, 0.94],                     // streamlined glide
            [0.96, 1.06, 0.96],                     // glide
            [1, 1, 1],                              // normalizing
            [1.10, 0.86, 1.10],                     // SQUASH at water skim
            [1.08, 0.88, 1.08]                      // compact
        ]),
        // Body front: nose up on flaps, level on glide, nose down approaching water
        eulerTrack('body_front', t, [
            [und, 0, 0.04],                         // nose up, slight bank
            [und * 1.2, 0, -0.03],                  // nose UP (flapping)
            [und * 0.4, 0, 0.05],                   // between flaps, bank
            [und * 1.5, 0, -0.04],                  // nose UP (big flap)
            [und * 0.5, 0, 0.03],                   // between
            [und * 0.8, 0, 0],                      // leveling at apex
            [0, 0, -0.02],                          // level glide
            [-und * 0.3, 0, 0.03],                  // nose down (descending)
            [-und * 0.5, 0, -0.04],                 // nose down + bank (evasive)
            [-und * 0.7, 0, 0.02],                  // approaching water
            [und * 0.3, 0, -0.06],                  // nose up at skim (evasive jink!)
            [und, 0, 0.04]                          // nose up for next launch
        ]),
        // Head: frantic during flaps, calm during glide — personality contrast!
        eulerTrack('head', t, [
            [-0.06, 0.10, 0],                       // looking left
            [0.04, -0.08, 0.04],                    // twitch right
            [-0.05, 0.12, -0.03],                   // snap left
            [0.03, -0.10, 0.05],                    // twitch right
            [-0.04, 0.08, -0.02],                   // left
            [0, -0.04, 0],                          // settling
            [0, 0.02, 0],                           // calm glide
            [0, -0.02, 0],                          // tiny look
            [0, 0.03, 0.01],                        // slight look
            [-0.03, -0.05, -0.02],                  // looking down (water coming)
            [0.06, 0.10, 0.04],                     // startled by water!
            [-0.06, 0.10, 0]                        // ready for next launch
        ]),
        // Wings: RAPID FLAPPING during ascent → LOCKED SPREAD during glide
        eulerTrack('flipper_L', t, [
            [fp, 0, -0.10],                         // wings up (pre-flap)
            [-fp, 0, -0.35],                        // DOWN stroke! (power)
            [fp * 0.8, 0, -0.15],                   // UP stroke
            [-fp * 1.1, 0, -0.40],                  // BIG DOWN stroke!
            [fp * 0.6, 0, -0.12],                   // up
            [-fp * 0.8, 0, -0.35],                  // last downstroke
            [-fp * 0.2, 0, -0.42],                  // SPREAD for glide (locked)
            [-fp * 0.15, 0, -0.44],                 // held wide open
            [-fp * 0.15, 0, -0.42],                 // tiny flex
            [-fp * 0.1, 0, -0.40],                  // starting to close
            [fp * 0.4, 0, -0.20],                   // folding for water skim
            [fp, 0, -0.10]                          // tucked for next cycle
        ]),
        eulerTrack('flipper_R', t, [
            [-fp, 0, 0.10],                         // mirrored
            [fp, 0, 0.35],
            [-fp * 0.8, 0, 0.15],
            [fp * 1.1, 0, 0.40],
            [-fp * 0.6, 0, 0.12],
            [fp * 0.8, 0, 0.35],
            [fp * 0.2, 0, 0.42],
            [fp * 0.15, 0, 0.44],
            [fp * 0.15, 0, 0.42],
            [fp * 0.1, 0, 0.40],
            [-fp * 0.4, 0, 0.20],
            [-fp, 0, 0.10]
        ]),
        // Dorsal: bounces during flaps, stable during glide
        buildRotationTrack('dorsal', t, [
            ds, -ds, ds, -ds * 1.2, ds, -ds * 0.5, 0, 0, 0, ds * 0.3, -ds, ds
        ], AXIS_Z),
        // Body rear: whips during flaps, trails calmly during glide
        eulerTrack('body_rear', t, [
            [0, und * 0.8, 0],                     // whip
            [0, -und, 0],                          // whip
            [0, und * 0.6, 0],                     // whip
            [0, -und * 1.2, 0],                    // big whip
            [0, und * 0.5, 0],                     // whip
            [0, -und * 0.3, 0],                    // settling
            [0, 0, 0],                             // calm glide
            [0, und * 0.1, 0],                     // tiny wag
            [0, -und * 0.1, 0],                    // tiny wag
            [0, 0, 0],                             // calm
            [0, und * 0.4, 0],                     // waking up
            [0, und * 0.8, 0]                      // ready for flaps
        ]),
        // Tail: snaps during flaps, streams behind during glide
        buildRotationTrack('tail_01', t, [
            tsw, -tsw * 0.5, tsw * 0.8, -tsw, tsw * 0.6, -tsw * 0.3,
            0, tsw * 0.1, -tsw * 0.1, 0, tsw * 0.3, tsw
        ], AXIS_Y),
        // Flukes: whipping during flaps, relaxed during glide
        buildRotationTrack('fluke_L', t, [
            0.10, -0.08, 0.08, -0.12, 0.06, -0.04, 0, 0.02, -0.02, 0, 0.04, 0.10
        ], AXIS_Z),
        buildRotationTrack('fluke_R', t, [
            -0.10, 0.08, -0.08, 0.12, -0.06, 0.04, 0, -0.02, 0.02, 0, -0.04, -0.10
        ], AXIS_Z),
    ]);
}

function _flyfishBash() {
    const c = ENEMY_VISUAL_CONFIG.flyfish;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Quick headbutt — springs forward, wings fold, SLAM
    const t = [0, 0.12, 0.22, 0.32, 0.48, 0.68, dur];

    return new THREE.AnimationClip('flyfish_bash_door', dur, [
        // Root: darts forward in a burst
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.06, -0.06 * s], [0, ry, 0.16 * s],
            [0, ry - 0.04, 0.10 * s], [0, ry + 0.04, 0.04 * s],
            [0, ry + 0.02, 0.02 * s], [0, ry, 0]
        ]),
        // Squash on impact, stretch on recoil
        scaleTrack('root', t, [
            [1, 1, 1], [0.90, 1.12, 0.90], [1.22, 0.76, 1.22],
            [0.92, 1.10, 0.92], [1, 1, 1], [1, 1, 1], [1, 1, 1]
        ]),
        // Body front: pitches into headbutt
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.10, 0, 0], [-0.24, 0, 0],
            [0.06, 0, 0], [0.02, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Head: drives into door
        eulerTrack('head', t, [
            [0, 0, 0], [0.08, 0, 0], [-0.16, 0, 0],
            [0.10, 0, 0.05], [0.03, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Wings fold in on approach, flare on recoil
        buildRotationTrack('flipper_L', t, [0, 0.30, 0.50, -0.20, -0.08, 0, 0], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, 0.30, 0.50, -0.20, -0.08, 0, 0], AXIS_X),
        // Tail whips on the strike
        buildRotationTrack('tail_01', t, [0, -0.25, 0.40, 0.20, 0.08, 0.02, 0], AXIS_Y),
    ]);
}

function _flyfishHit() {
    const dur = 0.3;
    const t = [0, 0.03, 0.10, 0.18, dur];
    return new THREE.AnimationClip('flyfish_hit_react', dur, [
        // Spin/tumble reaction — body rocks dramatically
        posTrack('root', t, [
            [0, 0, 0], [0, 0.05, -0.08], [0, -0.02, -0.04], [0, 0.01, -0.01], [0, 0, 0]
        ]),
        // Body front rocks hard — tumbling fish
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.16, 0.12, 0.20], [0.05, 0.04, 0.06], [0.01, 0.01, 0.02], [0, 0, 0]
        ]),
        // Root spins slightly
        buildRotationTrack('root', t, [0, 0.30, 0.10, 0.02, 0], AXIS_Z),
        // Wings flare in shock
        buildRotationTrack('flipper_L', t, [0, -0.45, -0.15, -0.04, 0], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, -0.45, -0.15, -0.04, 0], AXIS_X),
    ]);
}

function _flyfishDeath() {
    const c = ENEMY_VISUAL_CONFIG.flyfish;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.8;
    const t = [0, 0.10, 0.22, 0.38, 0.55, 0.70, dur];

    return new THREE.AnimationClip('flyfish_death', dur, [
        // Wings fold in, spiral downward
        posTrack('root', t, [
            [0, ry, 0], [0.04 * s, ry * 0.80, 0], [0.08 * s, ry * 0.55, 0.02 * s],
            [0.10 * s, ry * 0.30, 0.03 * s], [0.08 * s, ry * 0.10, 0.02 * s],
            [0.06 * s, ry * 0.03, 0.01 * s], [0.04 * s, 0, 0]
        ]),
        // Root spins in a spiral + tilts as it spirals
        eulerTrack('root', t, [
            [0, 0, 0], [0, 0.80, -0.10], [0, 2.0, -0.30],
            [0, 3.50, -0.55], [0, 5.0, -0.80], [0, 5.80, -1.10], [0, 6.28, -1.30]
        ]),
        // Wings fold in progressively — losing lift
        buildRotationTrack('flipper_L', t, [0, 0.20, 0.45, 0.70, 0.90, 1.05, 1.10], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, 0.20, 0.45, 0.70, 0.90, 1.05, 1.10], AXIS_X),
        // Body front droops
        eulerTrack('body_front', t, [
            [0, 0, 0], [-0.06, 0, 0], [-0.14, 0, 0.04],
            [-0.22, 0, 0.06], [-0.28, 0, 0.04], [-0.32, 0, 0.02], [-0.34, 0, 0]
        ]),
        // Tail goes limp
        buildRotationTrack('tail_01', t, [0, 0.08, 0.18, 0.28, 0.34, 0.38, 0.40], AXIS_X),
        // Shrinks slightly — crumpling
        scaleTrack('root', t, [
            [1, 1, 1], [1, 1, 1], [0.96, 0.96, 0.96],
            [0.90, 0.90, 0.90], [0.84, 0.84, 0.84], [0.80, 0.80, 0.80], [0.78, 0.78, 0.78]
        ]),
    ]);
}


// ─── SHARK ─── slow menacing tank, barely moves but radiates danger
// Personality: relentless, powerful, cold efficiency, the tail does all the talking
// ─────────────────────────────────────────────────────────────────────────────────

function _sharkWalk() {
    const c = ENEMY_VISUAL_CONFIG.shark;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const und = a.bodyUndulate;
    const tsw = a.tailSwing;
    const fp = a.flipperPaddle;
    const ds = a.dorsalSway || 0.02;
    const jaw = a.jawOpen || 0.08;

    // Slow 8-keyframe cycle — measured, powerful, menacing
    const t8 = [0, dur*0.125, dur*0.25, dur*0.375, dur*0.5, dur*0.625, dur*0.75, dur*0.875, dur];
    const t = [0, dur*0.25, dur*0.5, dur*0.75, dur];

    return new THREE.AnimationClip('shark_walk', dur, [
        // Root: barely bobs — dead-level, unstoppable menace
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Slow menacing lateral roll — weight shifts like a submarine
        eulerTrack('root', t8, [
            [0, 0, und * 0.4], [0, 0, und * 0.2], [0, 0, 0], [0, 0, -und * 0.2],
            [0, 0, -und * 0.4], [0, 0, -und * 0.2], [0, 0, 0], [0, 0, und * 0.2],
            [0, 0, und * 0.4]
        ]),
        // Body front: beginning of sinuous S-wave — pitch + yaw
        eulerTrack('body_front', t8, [
            [und * 0.3, und * 0.5, 0], [und * 0.15, und * 0.25, 0], [0, 0, 0],
            [-und * 0.15, -und * 0.25, 0], [-und * 0.3, -und * 0.5, 0],
            [-und * 0.15, -und * 0.25, 0], [0, 0, 0], [und * 0.15, und * 0.25, 0],
            [und * 0.3, und * 0.5, 0]
        ]),
        // Head: JAW BREATHING — rhythmic open/close, dead-eyed lock forward
        // Head tilts back = jaw drops open (menacing breathing)
        eulerTrack('head', t8, [
            [-0.01, 0, 0], [jaw * 0.4, 0, 0], [jaw, 0, 0], [jaw * 0.4, 0, 0],
            [-0.01, 0, 0], [jaw * 0.4, 0, 0], [jaw, 0, 0], [jaw * 0.4, 0, 0],
            [-0.01, 0, 0]
        ]),
        // Snout: compensates jaw — keeps nose pointed forward while jaw drops
        buildRotationTrack('snout', t8, [
            0, -jaw * 0.3, -jaw * 0.6, -jaw * 0.3, 0, -jaw * 0.3, -jaw * 0.6, -jaw * 0.3, 0
        ], AXIS_X),
        // Dorsal: rock-solid — the iconic fin slicing through water
        buildRotationTrack('dorsal', t, [0, ds, 0, -ds, 0], AXIS_Z),
        // Flippers: banking stabilizers — counter the body roll
        buildRotationTrack('flipper_L', t8, [
            fp, fp * 0.5, 0, -fp * 0.5, -fp, -fp * 0.5, 0, fp * 0.5, fp
        ], AXIS_X),
        buildRotationTrack('flipper_R', t8, [
            -fp, -fp * 0.5, 0, fp * 0.5, fp, fp * 0.5, 0, -fp * 0.5, -fp
        ], AXIS_X),
        // Body rear: POWERFUL S-curve — OPPOSITE phase to body front
        eulerTrack('body_rear', t8, [
            [0, -und * 1.2, 0], [0, -und * 0.6, 0], [0, 0, 0], [0, und * 0.6, 0],
            [0, und * 1.2, 0], [0, und * 0.6, 0], [0, 0, 0], [0, -und * 0.6, 0],
            [0, -und * 1.2, 0]
        ]),
        // Tail chain: progressive S-wave — each segment delayed and amplified
        buildRotationTrack('tail_01', t8, [
            tsw * 0.5, tsw * 0.25, 0, -tsw * 0.25, -tsw * 0.5, -tsw * 0.25, 0, tsw * 0.25, tsw * 0.5
        ], AXIS_Y),
        buildRotationTrack('tail_02', t8, [
            0, tsw * 0.55, tsw * 0.9, tsw * 0.55, 0, -tsw * 0.55, -tsw * 0.9, -tsw * 0.55, 0
        ], AXIS_Y),
        buildRotationTrack('tail_03', t8, [
            -tsw * 0.5, 0, tsw * 0.65, tsw * 1.1, tsw * 0.65, 0, -tsw * 0.65, -tsw * 1.1, -tsw * 0.5
        ], AXIS_Y),
        // Flukes: massive power strokes
        buildRotationTrack('fluke_L', t, [0.06, -0.05, 0.06, -0.05, 0.06], AXIS_Z),
        buildRotationTrack('fluke_R', t, [-0.06, 0.05, -0.06, 0.05, -0.06], AXIS_Z),
    ]);
}

function _sharkBash() {
    const c = ENEMY_VISUAL_CONFIG.shark;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Massive body slam — slow wind-up, devastating impact
    const t = [0, 0.25, 0.40, 0.50, 0.62, 0.80, dur];

    return new THREE.AnimationClip('shark_bash_door', dur, [
        // Root: slow menacing lunge — the WHOLE shark slams forward
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.02, -0.08 * s], [0, ry - 0.06, 0.22 * s],
            [0, ry - 0.08, 0.16 * s], [0, ry - 0.03, 0.08 * s],
            [0, ry, 0.03 * s], [0, ry, 0]
        ]),
        // Body front: drives forward, head tilts back (jaw opening) on impact
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.06, 0, 0], [-0.16, 0, 0],
            [0.10, 0, 0], [0.04, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Head: tilts BACK on impact — jaw opens wide, menacing
        eulerTrack('head', t, [
            [0, 0, 0], [0.04, 0, 0], [0.22, 0, 0],
            [-0.08, 0, 0], [-0.02, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Snout: lifts to expose jaw
        buildRotationTrack('snout', t, [0, 0.04, 0.18, -0.06, -0.02, 0, 0], AXIS_X),
        // Tail drives the charge with massive sweep
        buildRotationTrack('tail_01', t, [0, -0.18, 0.30, 0.16, 0.06, 0.02, 0], AXIS_Y),
        buildRotationTrack('tail_02', t, [0, -0.28, 0.42, 0.22, 0.10, 0.03, 0], AXIS_Y),
        buildRotationTrack('tail_03', t, [0, -0.35, 0.50, 0.28, 0.12, 0.04, 0], AXIS_Y),
        // Flippers brace — preparing for impact
        buildRotationTrack('flipper_L', t, [0, 0.12, -0.25, -0.12, -0.04, 0, 0], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, 0.12, -0.25, -0.12, -0.04, 0, 0], AXIS_X),
        // Body rear powers the slam
        eulerTrack('body_rear', t, [
            [0, 0, 0], [-0.08, 0, 0], [0.18, 0, 0],
            [0.08, 0, 0], [0.03, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _sharkHit() {
    const dur = 0.3;
    const t = [0, 0.05, 0.14, 0.24, dur];
    return new THREE.AnimationClip('shark_hit_react', dur, [
        // Barely flinches — slight lateral shift, quick recovery
        posTrack('root', t, [
            [0, 0, 0], [0, 0, -0.03], [0, 0, -0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Body barely tilts — shrugs off the hit
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.02, 0, 0.06], [0.008, 0, 0.02], [0, 0, 0.005], [0, 0, 0]
        ]),
        // Quick tail flick — annoyed, not hurt
        buildRotationTrack('tail_01', t, [0, 0.10, 0.04, 0.01, 0], AXIS_Y),
    ]);
}

function _sharkDeath() {
    const c = ENEMY_VISUAL_CONFIG.shark;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 1.0;
    const t = [0, 0.15, 0.32, 0.50, 0.70, 0.85, dur];

    return new THREE.AnimationClip('shark_death', dur, [
        // Dramatic slow roll — belly up, the classic shark death
        posTrack('root', t, [
            [0, ry, 0], [0.04 * s, ry * 0.90, 0], [0.10 * s, ry * 0.70, 0],
            [0.16 * s, ry * 0.45, 0.02 * s], [0.20 * s, ry * 0.18, 0.02 * s],
            [0.22 * s, ry * 0.06, 0.01 * s], [0.22 * s, 0, 0]
        ]),
        // Slow, DRAMATIC roll — belly up
        buildRotationTrack('root', t, [0, -0.12, -0.40, -0.85, -1.25, -1.48, -1.57], AXIS_Z),
        // Body front: stiffens then droops
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.03, 0, 0], [0.06, 0, 0.02],
            [0.04, 0, 0.04], [0, 0, 0.06], [-0.06, 0, 0.05], [-0.10, 0, 0.04]
        ]),
        // Head: jaw drops open (head tilts back)
        eulerTrack('head', t, [
            [0, 0, 0], [0.04, 0, 0], [0.10, 0, 0.04],
            [0.16, 0, 0.06], [0.20, 0, 0.04], [0.22, 0, 0.02], [0.24, 0, 0]
        ]),
        // Tail: goes completely limp — slow droop
        buildRotationTrack('tail_01', t, [0, 0.04, 0.10, 0.18, 0.24, 0.28, 0.30], AXIS_X),
        buildRotationTrack('tail_02', t, [0, 0.03, 0.08, 0.14, 0.20, 0.24, 0.26], AXIS_X),
        buildRotationTrack('tail_03', t, [0, 0.02, 0.06, 0.12, 0.18, 0.22, 0.24], AXIS_X),
        // Flippers splay out — lifeless
        buildRotationTrack('flipper_L', t, [0, -0.08, -0.18, -0.30, -0.40, -0.46, -0.50], AXIS_X),
        buildRotationTrack('flipper_R', t, [0, -0.08, -0.18, -0.30, -0.40, -0.46, -0.50], AXIS_X),
        // Dorsal: the iconic fin — slowly tilts over
        buildRotationTrack('dorsal', t, [0, -0.04, -0.10, -0.20, -0.30, -0.38, -0.42], AXIS_Z),
    ]);
}


// ─── PIRATE ─── salty seadog in a rowboat, arms pumping oars
// Personality: determined, grizzled, rowing with furious intensity
// ─────────────────────────────────────────────────────────────────

function _pirateWalk() {
    const c = ENEMY_VISUAL_CONFIG.pirate;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const asw = a.armSwing;
    const lean = -a.spineForwardLean;
    const twist = a.spineTwist;
    const look = a.headLook || 0.12;

    // 8-keyframe rowing cycle — heave-ho, heave-ho
    const t8 = [0, dur*0.125, dur*0.25, dur*0.375, dur*0.5, dur*0.625, dur*0.75, dur*0.875, dur];
    const t = [0, dur*0.25, dur*0.5, dur*0.75, dur];

    return new THREE.AnimationClip('pirate_walk', dur, [
        // Root: heaving with each stroke — weight behind the oars
        posTrack('root', t8, [
            [0, ry, 0], [0, ry - bob * 0.3, 0], [0, ry - bob, 0], [0, ry - bob * 0.5, 0],
            [0, ry, 0], [0, ry - bob * 0.3, 0], [0, ry - bob, 0], [0, ry - bob * 0.5, 0],
            [0, ry, 0]
        ]),
        // Spine: BIG lean forward on pull, extend back on catch + rowing twist
        eulerTrack('spine', t8, [
            [lean - 0.18, twist, 0.03],            // pull left — big lean + twist
            [lean - 0.10, twist * 0.5, 0.02],      // mid-pull
            [lean + 0.06, 0, 0],                    // catch — extended back
            [lean, -twist * 0.3, -0.01],            // transition
            [lean - 0.18, -twist, -0.03],           // pull right — lean + twist
            [lean - 0.10, -twist * 0.5, -0.02],    // mid-pull
            [lean + 0.06, 0, 0],                    // catch
            [lean, twist * 0.3, 0.01],              // transition
            [lean - 0.18, twist, 0.03]              // back to start
        ]),
        // Chest: follows with twist delay — upper body mass
        eulerTrack('chest', t8, [
            [0, twist * 0.6, 0], [0, twist * 0.3, 0], [0, -twist * 0.3, 0], [0, -twist * 0.5, 0],
            [0, -twist * 0.6, 0], [0, -twist * 0.3, 0], [0, twist * 0.3, 0], [0, twist * 0.5, 0],
            [0, twist * 0.6, 0]
        ]),
        // Neck: counter-twist to stabilize head
        eulerTrack('neck', t, [
            [0, -twist * 0.4, 0], [0, twist * 0.3, 0],
            [0, twist * 0.4, 0], [0, -twist * 0.3, 0],
            [0, -twist * 0.4, 0]
        ]),
        // Head: LOOKING AROUND while rowing — scanning for the toilet!
        eulerTrack('head', t8, [
            [-0.10, look, 0.02],                   // looking left
            [-0.06, look * 0.5, 0.01],             // easing
            [-0.06, 0, 0],                         // forward
            [-0.08, -look * 0.3, -0.01],           // glancing right
            [-0.10, -look, -0.02],                 // looking right
            [-0.06, -look * 0.5, -0.01],           // easing
            [-0.06, 0, 0],                         // forward
            [-0.08, look * 0.3, 0.01],             // glancing left
            [-0.10, look, 0.02]                    // looking left
        ]),
        // Left arm: BIG rowing pull — drives with body
        eulerTrack('upperArm_L', t, [
            [asw * 0.7, 0, 0.22],                  // pulled back (power!)
            [-asw * 0.5, 0, 0.32],                 // pushed forward (recovery)
            [asw * 0.7, 0, 0.22],
            [-asw * 0.5, 0, 0.32],
            [asw * 0.7, 0, 0.22]
        ]),
        // Right arm: OPPOSITE phase
        eulerTrack('upperArm_R', t, [
            [-asw * 0.5, 0, -0.32],                // pushed forward
            [asw * 0.7, 0, -0.22],                 // pulled back
            [-asw * 0.5, 0, -0.32],
            [asw * 0.7, 0, -0.22],
            [-asw * 0.5, 0, -0.32]
        ]),
        // Forearms: flex HARD on pull, extend on push
        buildRotationTrack('forearm_L', t, [-0.70, -0.18, -0.70, -0.18, -0.70], AXIS_X),
        buildRotationTrack('forearm_R', t, [-0.18, -0.70, -0.18, -0.70, -0.18], AXIS_X),
        // Legs: bracing against strokes
        buildRotationTrack('upperLeg_L', t, [0.04, -0.03, 0.04, -0.03, 0.04], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-0.03, 0.04, -0.03, 0.04, -0.03], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [-0.08, -0.02, -0.08, -0.02, -0.08], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.02, -0.08, -0.02, -0.08, -0.02], AXIS_X),
    ]);
}

function _pirateBash() {
    const c = ENEMY_VISUAL_CONFIG.pirate;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;
    const PI = Math.PI;

    // Cutlass swing: wind-up → overhead arc → slash down → recover
    const t = [0, 0.18, 0.32, 0.42, 0.55, 0.72, 0.88, dur];

    return new THREE.AnimationClip('pirate_bash_door', dur, [
        // Root: leans into the swing
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.02, 0], [0, ry + 0.04, 0.04 * s],
            [0, ry - 0.02, 0.08 * s], [0, ry - 0.04, 0.06 * s],
            [0, ry, 0.04 * s], [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Spine: twists hard for the cutlass swing
        eulerTrack('spine', t, [
            [-0.17, 0, 0], [-0.12, -0.30, 0.06], [-0.08, -0.45, 0.10],
            [-0.25, 0.35, -0.08], [-0.20, 0.20, -0.04],
            [-0.17, 0.08, 0], [-0.17, 0.02, 0], [-0.17, 0, 0]
        ]),
        // Right arm (cutlass arm): overhead arc → slash down
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.3], [-PI * 0.6, 0.20, -0.2], [-PI * 0.8, 0.30, -0.15],
            [0.5, -0.20, -0.1], [0.3, -0.10, -0.15],
            [0.1, 0, -0.2], [0, 0, -0.25], [0, 0, -0.3]
        ]),
        // Right forearm: extends on swing
        buildRotationTrack('forearm_R', t, [-0.3, -0.8, -0.2, -0.5, -0.4, -0.35, -0.32, -0.3], AXIS_X),
        // Left arm: braces against the boat
        eulerTrack('upperArm_L', t, [
            [0.3, 0, 0.3], [0.4, 0, 0.35], [0.5, 0, 0.40],
            [0.3, 0, 0.32], [0.3, 0, 0.30],
            [0.3, 0, 0.30], [0.3, 0, 0.30], [0.3, 0, 0.3]
        ]),
        // Left forearm: grips gunwale
        buildRotationTrack('forearm_L', t, [-0.4, -0.5, -0.55, -0.45, -0.42, -0.40, -0.40, -0.4], AXIS_X),
        // Head: tracks the swing
        eulerTrack('head', t, [
            [-0.06, 0, 0], [-0.04, -0.15, 0], [-0.02, -0.20, 0.04],
            [-0.10, 0.12, -0.02], [-0.08, 0.06, 0],
            [-0.06, 0.02, 0], [-0.06, 0, 0], [-0.06, 0, 0]
        ]),
    ]);
}

function _pirateHit() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];
    return new THREE.AnimationClip('pirate_hit_react', dur, [
        // Falls back in seat — jolted by impact
        posTrack('root', t, [
            [0, 0, 0], [0, 0.03, -0.08], [0, 0, -0.04], [0, 0, -0.01], [0, 0, 0]
        ]),
        // Spine extends back — knocked backward in boat
        eulerTrack('spine', t, [
            [0, 0, 0], [0.22, 0, 0.05], [0.08, 0, 0.02], [0.02, 0, 0.005], [0, 0, 0]
        ]),
        // Head tilts back — whiplash
        eulerTrack('head', t, [
            [0, 0, 0], [0.16, 0.06, 0], [0.05, 0.02, 0], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Arms flail outward
        buildRotationTrack('upperArm_L', t, [0, -0.30, -0.10, -0.02, 0], AXIS_Z),
        buildRotationTrack('upperArm_R', t, [0, 0.30, 0.10, 0.02, 0], AXIS_Z),
    ]);
}

function _pirateDeath() {
    const c = ENEMY_VISUAL_CONFIG.pirate;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.8;
    const t = [0, 0.10, 0.22, 0.38, 0.55, 0.70, dur];

    return new THREE.AnimationClip('pirate_death', dur, [
        // Topples out of boat — spine extends, rolls to side
        posTrack('root', t, [
            [0, ry, 0], [0.04 * s, ry * 0.90, -0.04 * s], [0.10 * s, ry * 0.65, -0.06 * s],
            [0.16 * s, ry * 0.35, -0.04 * s], [0.20 * s, ry * 0.12, -0.02 * s],
            [0.22 * s, ry * 0.03, -0.01 * s], [0.22 * s, 0, 0]
        ]),
        // Root rolls sideways — falling out of boat
        buildRotationTrack('root', t, [0, -0.15, -0.45, -0.85, -1.20, -1.42, -1.57], AXIS_Z),
        // Spine: extends back then goes limp
        eulerTrack('spine', t, [
            [-0.17, 0, 0], [0.10, 0, 0.06], [0.25, 0, 0.10],
            [0.15, 0, 0.12], [0.06, 0, 0.08], [0.02, 0, 0.04], [0, 0, 0.02]
        ]),
        // Head: dramatic head-back fall
        eulerTrack('head', t, [
            [-0.06, 0, 0], [0.12, 0.08, 0.06], [0.22, 0.12, 0.10],
            [0.16, 0.08, 0.14], [0.10, 0.04, 0.10], [0.06, 0.02, 0.06], [0.04, 0, 0.04]
        ]),
        // Arms: reach out then go limp
        eulerTrack('upperArm_L', t, [
            [0, 0, 0], [0.4, 0, -0.30], [0.8, 0, -0.50],
            [0.5, 0, -0.55], [0.2, 0, -0.40], [0, 0, -0.25], [-0.2, 0, -0.15]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0], [0.3, 0, 0.25], [0.7, 0, 0.45],
            [0.4, 0, 0.50], [0.15, 0, 0.35], [0, 0, 0.20], [-0.15, 0, 0.12]
        ]),
        // Forearms: flop
        buildRotationTrack('forearm_L', t, [0, -0.2, -0.5, -0.7, -0.8, -0.85, -0.9], AXIS_X),
        buildRotationTrack('forearm_R', t, [0, -0.15, -0.4, -0.6, -0.7, -0.75, -0.8], AXIS_X),
        // Legs: dangle from boat edge
        buildRotationTrack('upperLeg_L', t, [0, 0.10, 0.25, 0.40, 0.50, 0.55, 0.60], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.08, 0.20, 0.35, 0.45, 0.52, 0.56], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.12, -0.30, -0.50, -0.65, -0.72, -0.78], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.10, -0.25, -0.42, -0.58, -0.66, -0.72], AXIS_X),
    ]);
}


// ─── SEA TURTLE ─── steady, deliberate paddle strokes, armored serenity
// Personality: unflappable, methodical, ancient wisdom, front flippers do butterfly
// ─────────────────────────────────────────────────────────────────────────────────

function _seaturtleWalk() {
    const c = ENEMY_VISUAL_CONFIG.seaturtle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const und = a.bodyUndulate || 0.04;
    const fp = a.flipperPaddle;
    const tsw = a.tailSwing;

    // 11-keyframe for majestic butterfly stroke cycle
    // 0-3: POWER STROKE (front flippers sweep DOWN and BACK)
    // 3-6: FOLLOW-THROUGH (gliding momentum)
    // 6-10: RECOVERY (flippers sweep UP and FORWARD, close to body)
    const t = [0, dur*0.1, dur*0.2, dur*0.3, dur*0.4, dur*0.5, dur*0.6, dur*0.7, dur*0.8, dur*0.9, dur];
    const t5 = [0, dur*0.25, dur*0.5, dur*0.75, dur];

    return new THREE.AnimationClip('seaturtle_walk', dur, [
        // Root: gentle rise with power stroke, sink with recovery
        posTrack('root', t, [
            [0, ry, 0],
            [0, ry + bob * 0.4, 0],                // rising (power stroke starting)
            [0, ry + bob * 0.8, 0],
            [0, ry + bob, 0],                      // peak (end of power stroke)
            [0, ry + bob * 0.8, 0],                // gliding
            [0, ry + bob * 0.4, 0],
            [0, ry, 0],                            // recovery begins
            [0, ry - bob * 0.3, 0],                // slight dip during recovery
            [0, ry - bob * 0.2, 0],
            [0, ry - bob * 0.1, 0],
            [0, ry, 0]
        ]),
        // Body front: extends on power, retracts on recovery — the turtle's "reach"
        eulerTrack('body_front', t, [
            [-und, 0, 0],                          // reaching forward
            [-und * 1.5, 0, 0],                    // extending (power stroke)
            [-und * 1.2, 0, 0],
            [-und * 0.5, 0, 0],                    // pulling back
            [0, 0, 0],
            [und * 0.5, 0, 0],                     // tucking
            [und, 0, 0],                           // tucked (recovery)
            [und * 0.5, 0, 0],
            [0, 0, 0],
            [-und * 0.5, 0, 0],
            [-und, 0, 0]
        ]),
        // Head: gentle wise searching — serene side-to-side looking
        eulerTrack('head', t, [
            [-0.06, 0.06, 0],                      // looking slightly left
            [-0.04, 0.04, 0],
            [-0.03, 0, 0],                         // forward
            [-0.04, -0.04, 0],
            [-0.06, -0.06, 0],                     // looking right
            [-0.04, -0.04, 0],
            [-0.03, 0, 0],                         // forward
            [-0.05, 0.03, 0.02],                   // looking left with wise tilt
            [-0.04, 0.05, 0.01],
            [-0.05, 0.04, 0],
            [-0.06, 0.06, 0]
        ]),
        // Shell: follows body's gentle motion — massive inertia
        buildRotationTrack('shell', t, [
            0, 0.005, 0.008, 0.005, 0, -0.005, -0.008, -0.005, 0, 0.003, 0
        ], AXIS_Z),
        // Front flippers: MAJESTIC butterfly stroke!
        // Power: sweep DOWN and BACK wide (big spread)
        // Recovery: sweep UP and FORWARD close to body (tucked)
        eulerTrack('frontFlipper_L', t, [
            [fp * 0.2, 0, -0.08],                  // start: slightly up
            [-fp * 0.4, 0, -0.22],                 // sweeping DOWN (power!)
            [-fp * 0.9, 0, -0.38],                 // full downstroke (wide spread)
            [-fp, 0, -0.42],                       // MAXIMUM sweep (peak power)
            [-fp * 0.7, 0, -0.30],                 // follow-through
            [-fp * 0.3, 0, -0.16],                 // finishing
            [fp * 0.1, 0, 0.05],                   // transition to recovery
            [fp * 0.5, 0, 0.18],                   // sweeping UP (recovery, tucked in)
            [fp * 0.8, 0, 0.28],                   // high recovery (close to body)
            [fp * 0.5, 0, 0.12],                   // coming forward
            [fp * 0.2, 0, -0.08]                   // ready for next stroke
        ]),
        eulerTrack('frontFlipper_R', t, [
            [fp * 0.2, 0, 0.08],                   // mirrored
            [-fp * 0.4, 0, 0.22],
            [-fp * 0.9, 0, 0.38],
            [-fp, 0, 0.42],
            [-fp * 0.7, 0, 0.30],
            [-fp * 0.3, 0, 0.16],
            [fp * 0.1, 0, -0.05],
            [fp * 0.5, 0, -0.18],
            [fp * 0.8, 0, -0.28],
            [fp * 0.5, 0, -0.12],
            [fp * 0.2, 0, 0.08]
        ]),
        // Body rear: gentle counter-rhythm to front flippers
        eulerTrack('body_rear', t, [
            [0, 0, 0], [und * 0.2, 0, 0], [und * 0.4, 0, 0], [und * 0.3, 0, 0],
            [und * 0.1, 0, 0], [0, 0, 0], [-und * 0.2, 0, 0], [-und * 0.3, 0, 0],
            [-und * 0.2, 0, 0], [-und * 0.1, 0, 0], [0, 0, 0]
        ]),
        // Hind flippers: alternating gentle rudder kicks
        eulerTrack('hindFlipper_L', t, [
            [fp * 0.2, 0, -0.04], [-fp * 0.1, 0, -0.08], [-fp * 0.2, 0, -0.06],
            [fp * 0.15, 0, -0.02], [fp * 0.2, 0, 0], [-fp * 0.1, 0, -0.04],
            [-fp * 0.15, 0, -0.06], [fp * 0.1, 0, -0.02], [fp * 0.2, 0, 0],
            [fp * 0.1, 0, -0.02], [fp * 0.2, 0, -0.04]
        ]),
        eulerTrack('hindFlipper_R', t, [
            [-fp * 0.1, 0, 0.04], [fp * 0.15, 0, 0.08], [fp * 0.2, 0, 0.06],
            [-fp * 0.1, 0, 0.02], [-fp * 0.2, 0, 0], [fp * 0.1, 0, 0.04],
            [fp * 0.15, 0, 0.06], [-fp * 0.1, 0, 0.02], [-fp * 0.2, 0, 0],
            [-fp * 0.1, 0, 0.02], [-fp * 0.1, 0, 0.04]
        ]),
        // Tail: gentle rudder wag
        buildRotationTrack('tail_01', t, [
            tsw, tsw * 0.5, 0, -tsw * 0.5, -tsw, -tsw * 0.5, 0, tsw * 0.5, tsw, tsw * 0.5, tsw
        ], AXIS_Y),
    ]);
}

function _seaturtleBash() {
    const c = ENEMY_VISUAL_CONFIG.seaturtle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Head extends forward, shell rocks with forward momentum
    const t = [0, 0.20, 0.35, 0.48, 0.62, 0.80, dur];

    return new THREE.AnimationClip('seaturtle_bash_door', dur, [
        // Root: deliberate lunge — shell momentum carries it forward
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.04 * s], [0, ry - 0.02, 0.14 * s],
            [0, ry - 0.03, 0.10 * s], [0, ry, 0.05 * s],
            [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Body front: extends way forward for the push
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.06, 0, 0], [-0.16, 0, 0],
            [-0.08, 0, 0], [-0.03, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Head: stretches forward, pushes into door
        eulerTrack('head', t, [
            [-0.06, 0, 0], [-0.02, 0, 0], [-0.22, 0, 0],
            [-0.10, 0, 0.03], [-0.06, 0, 0], [-0.06, 0, 0], [-0.06, 0, 0]
        ]),
        // Shell: rocks forward on impact
        buildRotationTrack('shell', t, [0, 0.02, -0.08, -0.04, -0.02, 0, 0], AXIS_X),
        // Front flippers: power stroke to drive body forward
        buildRotationTrack('frontFlipper_L', t, [0, 0.20, -0.40, -0.20, -0.08, 0, 0], AXIS_X),
        buildRotationTrack('frontFlipper_R', t, [0, 0.20, -0.40, -0.20, -0.08, 0, 0], AXIS_X),
        // Hind flippers: kick for extra push
        buildRotationTrack('hindFlipper_L', t, [0, -0.10, 0.20, 0.10, 0.04, 0, 0], AXIS_X),
        buildRotationTrack('hindFlipper_R', t, [0, -0.10, 0.20, 0.10, 0.04, 0, 0], AXIS_X),
    ]);
}

function _seaturtleHit() {
    const dur = 0.3;
    const t = [0, 0.05, 0.14, 0.24, dur];
    return new THREE.AnimationClip('seaturtle_hit_react', dur, [
        // Shell absorbs — minimal body reaction, head retracts
        posTrack('root', t, [
            [0, 0, 0], [0, 0, -0.04], [0, 0, -0.02], [0, 0, -0.005], [0, 0, 0]
        ]),
        // Head retracts toward shell — protective reflex
        eulerTrack('head', t, [
            [0, 0, 0], [0.14, 0, 0], [0.05, 0, 0], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Body front: pulls back slightly
        eulerTrack('body_front', t, [
            [0, 0, 0], [0.08, 0, 0], [0.03, 0, 0], [0.008, 0, 0], [0, 0, 0]
        ]),
        // Shell: tilts back slightly from impact
        buildRotationTrack('shell', t, [0, 0.06, 0.02, 0.005, 0], AXIS_X),
    ]);
}

function _seaturtleDeath() {
    const c = ENEMY_VISUAL_CONFIG.seaturtle;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 1.0;
    const t = [0, 0.15, 0.32, 0.50, 0.70, 0.85, dur];

    return new THREE.AnimationClip('seaturtle_death', dur, [
        // Flips upside down — classic turtle on its back
        posTrack('root', t, [
            [0, ry, 0], [0, ry * 0.95, 0], [0, ry * 0.80, 0],
            [0, ry * 0.55, 0], [0, ry * 0.25, 0],
            [0, ry * 0.08, 0], [0, 0, 0]
        ]),
        // Root rotates 180 on Z — flipped on back, belly up
        buildRotationTrack('root', t, [0, -0.30, -0.80, -1.40, -2.20, -2.90, -3.14], AXIS_Z),
        // Head: droops out from shell
        eulerTrack('head', t, [
            [-0.06, 0, 0], [-0.10, 0.04, 0], [-0.16, 0.06, 0.04],
            [-0.22, 0.04, 0.06], [-0.26, 0.02, 0.04], [-0.28, 0, 0.02], [-0.30, 0, 0]
        ]),
        // Body front: goes limp
        eulerTrack('body_front', t, [
            [0, 0, 0], [-0.04, 0, 0], [-0.10, 0, 0.02],
            [-0.16, 0, 0.04], [-0.20, 0, 0.03], [-0.22, 0, 0.02], [-0.24, 0, 0]
        ]),
        // All flippers go limp — drooping with gravity
        buildRotationTrack('frontFlipper_L', t, [0, -0.10, -0.25, -0.45, -0.60, -0.70, -0.75], AXIS_X),
        buildRotationTrack('frontFlipper_R', t, [0, -0.10, -0.25, -0.45, -0.60, -0.70, -0.75], AXIS_X),
        buildRotationTrack('hindFlipper_L', t, [0, -0.06, -0.14, -0.25, -0.34, -0.40, -0.44], AXIS_X),
        buildRotationTrack('hindFlipper_R', t, [0, -0.06, -0.14, -0.25, -0.34, -0.40, -0.44], AXIS_X),
        // Tail: limp
        buildRotationTrack('tail_01', t, [0, 0.04, 0.10, 0.16, 0.20, 0.22, 0.24], AXIS_X),
        // Shell: stays rigid (it's a shell)
        buildRotationTrack('shell', t, [0, 0, 0, 0, 0, 0, 0], AXIS_X),
    ]);
}


// ─── JELLYFISH ─── pulsing bell propulsion, trailing tentacles, ethereal drift
// Personality: dreamy, alien, hypnotic bell contractions, tentacle ballet
// ─────────────────────────────────────────────────────────────────────────────────

function _jellyfishWalk() {
    const c = ENEMY_VISUAL_CONFIG.jellyfish;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const dur = a.walkDuration;
    const bob = a.bobHeight;
    const pulse = a.bellPulse;
    const tentSway = a.tentacleSway;
    const drift = a.bodyDrift || 0.14;

    // 11-keyframe asymmetric pulse cycle:
    // SHARP contraction (0-16%) → SLOW expansion/drift (16-100%)
    // This creates the characteristic jellyfish "pump and glide"
    const t = [0, dur*0.08, dur*0.16, dur*0.28, dur*0.40, dur*0.52,
               dur*0.64, dur*0.76, dur*0.88, dur*0.96, dur];

    return new THREE.AnimationClip('jellyfish_walk', dur, [
        // Root: SHARP rise on contraction, SLOW dreamy drift down
        posTrack('root', t, [
            [0, ry - bob * 0.3, 0],                // low (relaxed bell)
            [0, ry + bob * 0.5, 0],                // SHARP upward pulse!
            [0, ry + bob, 0],                      // peak height
            [0, ry + bob * 0.85, 0],               // drifting down...
            [0, ry + bob * 0.55, 0],               // drifting...
            [0, ry + bob * 0.30, 0],               // drifting...
            [0, ry + bob * 0.05, 0],               // drifting...
            [0, ry - bob * 0.12, 0],               // still drifting
            [0, ry - bob * 0.22, 0],               // near bottom
            [0, ry - bob * 0.28, 0],               // lowest
            [0, ry - bob * 0.3, 0]                 // ready for next pulse
        ]),
        // Ethereal drift — dreamy lateral sway
        eulerTrack('root', t, [
            [0, 0, drift], [0, 0, drift * 0.6], [0, 0, drift * 0.2],
            [0, 0, -drift * 0.2], [0, 0, -drift * 0.6], [0, 0, -drift],
            [0, 0, -drift * 0.6], [0, 0, -drift * 0.2], [0, 0, drift * 0.2],
            [0, 0, drift * 0.6], [0, 0, drift]
        ]),
        // Bell: SHARP contraction (wide + flat) → SLOW expansion (tall + narrow)
        scaleTrack('body_front', t, [
            [1.0 - pulse, 1.0 + pulse * 1.2, 1.0 - pulse],
            [1.0 + pulse * 1.5, 1.0 - pulse * 2.0, 1.0 + pulse * 1.5],  // SHARP CONTRACT!
            [1.0 + pulse * 0.8, 1.0 - pulse * 1.2, 1.0 + pulse * 0.8],
            [1.0 + pulse * 0.3, 1.0 - pulse * 0.4, 1.0 + pulse * 0.3],
            [1.0, 1.0, 1.0],
            [1.0 - pulse * 0.3, 1.0 + pulse * 0.4, 1.0 - pulse * 0.3],
            [1.0 - pulse * 0.6, 1.0 + pulse * 0.8, 1.0 - pulse * 0.6],
            [1.0 - pulse * 0.8, 1.0 + pulse * 1.0, 1.0 - pulse * 0.8],
            [1.0 - pulse * 0.9, 1.0 + pulse * 1.1, 1.0 - pulse * 0.9],
            [1.0 - pulse, 1.0 + pulse * 1.2, 1.0 - pulse],
            [1.0 - pulse, 1.0 + pulse * 1.2, 1.0 - pulse]
        ]),
        // Head (bell top): delayed contraction pulse
        scaleTrack('head', t, [
            [1, 1, 1],
            [1.0 + pulse * 0.8, 1.0 - pulse * 1.2, 1.0 + pulse * 0.8],
            [1.0 + pulse * 0.5, 1.0 - pulse * 0.8, 1.0 + pulse * 0.5],
            [1.0 + pulse * 0.2, 1.0 - pulse * 0.3, 1.0 + pulse * 0.2],
            [1, 1, 1],
            [1.0 - pulse * 0.2, 1.0 + pulse * 0.3, 1.0 - pulse * 0.2],
            [1.0 - pulse * 0.4, 1.0 + pulse * 0.5, 1.0 - pulse * 0.4],
            [1.0 - pulse * 0.3, 1.0 + pulse * 0.4, 1.0 - pulse * 0.3],
            [1.0 - pulse * 0.1, 1.0 + pulse * 0.1, 1.0 - pulse * 0.1],
            [1, 1, 1],
            [1, 1, 1]
        ]),
        // Body rear: responds to contraction by PUSHING down (water ejection)
        scaleTrack('body_rear', t, [
            [1, 1, 1],
            [1.0 - pulse * 0.6, 1.0 + pulse * 1.0, 1.0 - pulse * 0.6],
            [1.0 - pulse * 0.3, 1.0 + pulse * 0.5, 1.0 - pulse * 0.3],
            [1, 1, 1],
            [1.0 + pulse * 0.2, 1.0 - pulse * 0.3, 1.0 + pulse * 0.2],
            [1.0 + pulse * 0.3, 1.0 - pulse * 0.4, 1.0 + pulse * 0.3],
            [1.0 + pulse * 0.2, 1.0 - pulse * 0.2, 1.0 + pulse * 0.2],
            [1, 1, 1],
            [1.0 - pulse * 0.2, 1.0 + pulse * 0.3, 1.0 - pulse * 0.2],
            [1.0 - pulse * 0.4, 1.0 + pulse * 0.6, 1.0 - pulse * 0.4],
            [1, 1, 1]
        ]),
        // ── TENTACLES: trail BEHIND on contraction, spread during drift ──
        // Each tentacle responds to the bell pulse — whipped up on contraction, trail down on drift
        // Progressive phase offsets create organic flowing ballet

        // Tentacle 0 (front-center)
        buildRotationTrack('tent_0_01', t, [
            tentSway * 0.5, tentSway * 1.2, tentSway * 0.8, tentSway * 0.3, 0,
            -tentSway * 0.3, -tentSway * 0.6, -tentSway * 0.8, -tentSway * 0.5, -tentSway * 0.2,
            tentSway * 0.5
        ], AXIS_X),
        buildRotationTrack('tent_0_02', t, [
            tentSway * 0.8, tentSway * 1.5, tentSway * 1.2, tentSway * 0.6, tentSway * 0.2,
            -tentSway * 0.2, -tentSway * 0.6, -tentSway * 1.0, -tentSway * 0.8, -tentSway * 0.4,
            tentSway * 0.8
        ], AXIS_X),
        buildRotationTrack('tent_0_03', t, [
            tentSway * 1.0, tentSway * 1.8, tentSway * 1.5, tentSway * 0.9, tentSway * 0.4,
            0, -tentSway * 0.4, -tentSway * 0.9, -tentSway * 1.0, -tentSway * 0.6,
            tentSway * 1.0
        ], AXIS_X),

        // Tentacle 1 (front-left) — phase offset, lateral sway
        eulerTrack('tent_1_01', t, [
            [tentSway * 0.3, 0, tentSway * 0.4],
            [tentSway * 1.0, 0, tentSway * 0.2],
            [tentSway * 0.6, 0, 0],
            [tentSway * 0.1, 0, -tentSway * 0.2],
            [-tentSway * 0.2, 0, -tentSway * 0.4],
            [-tentSway * 0.5, 0, -tentSway * 0.3],
            [-tentSway * 0.7, 0, -tentSway * 0.1],
            [-tentSway * 0.5, 0, tentSway * 0.1],
            [-tentSway * 0.2, 0, tentSway * 0.3],
            [tentSway * 0.1, 0, tentSway * 0.4],
            [tentSway * 0.3, 0, tentSway * 0.4]
        ]),
        buildRotationTrack('tent_1_02', t, [
            tentSway * 0.6, tentSway * 1.3, tentSway * 1.0, tentSway * 0.5, 0,
            -tentSway * 0.4, -tentSway * 0.8, -tentSway * 1.0, -tentSway * 0.6, -tentSway * 0.2,
            tentSway * 0.6
        ], AXIS_X),
        buildRotationTrack('tent_1_03', t, [
            tentSway * 0.9, tentSway * 1.6, tentSway * 1.3, tentSway * 0.8, tentSway * 0.3,
            -tentSway * 0.1, -tentSway * 0.5, -tentSway * 0.8, -tentSway * 0.9, -tentSway * 0.5,
            tentSway * 0.9
        ], AXIS_X),

        // Tentacle 2 (front-right) — mirrored lateral
        eulerTrack('tent_2_01', t, [
            [tentSway * 0.3, 0, -tentSway * 0.4],
            [tentSway * 1.0, 0, -tentSway * 0.2],
            [tentSway * 0.6, 0, 0],
            [tentSway * 0.1, 0, tentSway * 0.2],
            [-tentSway * 0.2, 0, tentSway * 0.4],
            [-tentSway * 0.5, 0, tentSway * 0.3],
            [-tentSway * 0.7, 0, tentSway * 0.1],
            [-tentSway * 0.5, 0, -tentSway * 0.1],
            [-tentSway * 0.2, 0, -tentSway * 0.3],
            [tentSway * 0.1, 0, -tentSway * 0.4],
            [tentSway * 0.3, 0, -tentSway * 0.4]
        ]),
        buildRotationTrack('tent_2_02', t, [
            tentSway * 0.5, tentSway * 1.2, tentSway * 0.9, tentSway * 0.4, -tentSway * 0.1,
            -tentSway * 0.5, -tentSway * 0.8, -tentSway * 0.9, -tentSway * 0.5, -tentSway * 0.1,
            tentSway * 0.5
        ], AXIS_X),
        buildRotationTrack('tent_2_03', t, [
            tentSway * 0.8, tentSway * 1.5, tentSway * 1.2, tentSway * 0.7, tentSway * 0.2,
            -tentSway * 0.2, -tentSway * 0.6, -tentSway * 0.9, -tentSway * 0.8, -tentSway * 0.4,
            tentSway * 0.8
        ], AXIS_X),

        // Tentacle 3 (rear-left) — more phase offset
        eulerTrack('tent_3_01', t, [
            [-tentSway * 0.2, 0, tentSway * 0.3],
            [tentSway * 0.5, 0, tentSway * 0.5],
            [tentSway * 1.0, 0, tentSway * 0.3],
            [tentSway * 0.7, 0, 0],
            [tentSway * 0.2, 0, -tentSway * 0.2],
            [-tentSway * 0.2, 0, -tentSway * 0.4],
            [-tentSway * 0.5, 0, -tentSway * 0.3],
            [-tentSway * 0.7, 0, -tentSway * 0.1],
            [-tentSway * 0.4, 0, tentSway * 0.1],
            [-tentSway * 0.1, 0, tentSway * 0.2],
            [-tentSway * 0.2, 0, tentSway * 0.3]
        ]),
        buildRotationTrack('tent_3_02', t, [
            tentSway * 0.2, tentSway * 0.8, tentSway * 1.3, tentSway * 1.0, tentSway * 0.5,
            0, -tentSway * 0.4, -tentSway * 0.7, -tentSway * 0.8, -tentSway * 0.4,
            tentSway * 0.2
        ], AXIS_X),
        buildRotationTrack('tent_3_03', t, [
            tentSway * 0.5, tentSway * 1.0, tentSway * 1.5, tentSway * 1.2, tentSway * 0.7,
            tentSway * 0.2, -tentSway * 0.3, -tentSway * 0.6, -tentSway * 0.7, -tentSway * 0.3,
            tentSway * 0.5
        ], AXIS_X),

        // Tentacle 4 (rear-right) — most delayed phase
        eulerTrack('tent_4_01', t, [
            [-tentSway * 0.4, 0, -tentSway * 0.3],
            [tentSway * 0.2, 0, -tentSway * 0.5],
            [tentSway * 0.8, 0, -tentSway * 0.3],
            [tentSway * 1.0, 0, 0],
            [tentSway * 0.6, 0, tentSway * 0.2],
            [tentSway * 0.1, 0, tentSway * 0.4],
            [-tentSway * 0.3, 0, tentSway * 0.3],
            [-tentSway * 0.6, 0, tentSway * 0.1],
            [-tentSway * 0.7, 0, -tentSway * 0.1],
            [-tentSway * 0.5, 0, -tentSway * 0.2],
            [-tentSway * 0.4, 0, -tentSway * 0.3]
        ]),
        buildRotationTrack('tent_4_02', t, [
            0, tentSway * 0.5, tentSway * 1.0, tentSway * 1.3, tentSway * 0.9,
            tentSway * 0.4, 0, -tentSway * 0.4, -tentSway * 0.6, -tentSway * 0.3,
            0
        ], AXIS_X),
        buildRotationTrack('tent_4_03', t, [
            tentSway * 0.3, tentSway * 0.7, tentSway * 1.2, tentSway * 1.5, tentSway * 1.1,
            tentSway * 0.6, tentSway * 0.1, -tentSway * 0.3, -tentSway * 0.5, -tentSway * 0.2,
            tentSway * 0.3
        ], AXIS_X),
    ]);
}

function _jellyfishBash() {
    const c = ENEMY_VISUAL_CONFIG.jellyfish;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const a = c.animationParams;
    const pulse = a.bellPulse;
    const tentSway = a.tentacleSway;
    const dur = 1.0;

    // Bell contracts HARD, tentacles whip forward
    const t = [0, 0.18, 0.30, 0.42, 0.58, 0.76, dur];

    return new THREE.AnimationClip('jellyfish_bash_door', dur, [
        // Root: pulse forward into door
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.06, 0], [0, ry - 0.02, 0.12 * s],
            [0, ry - 0.04, 0.08 * s], [0, ry, 0.04 * s],
            [0, ry + 0.02, 0.02 * s], [0, ry, 0]
        ]),
        // Bell: violent contraction (squash) → slow recovery
        scaleTrack('body_front', t, [
            [1, 1, 1], [1 + pulse * 2, 1 - pulse * 3, 1 + pulse * 2],
            [1 + pulse * 3, 1 - pulse * 4, 1 + pulse * 3],
            [1 - pulse, 1 + pulse * 1.5, 1 - pulse],
            [1, 1, 1], [1, 1, 1], [1, 1, 1]
        ]),
        // All tentacles whip FORWARD on impact — the sting!
        // Tentacle 0
        buildRotationTrack('tent_0_01', t, [0, 0.15, -0.50, -0.25, -0.08, 0, 0], AXIS_X),
        buildRotationTrack('tent_0_02', t, [0, 0.10, -0.60, -0.30, -0.10, -0.02, 0], AXIS_X),
        buildRotationTrack('tent_0_03', t, [0, 0.05, -0.70, -0.35, -0.12, -0.03, 0], AXIS_X),
        // Tentacle 1
        buildRotationTrack('tent_1_01', t, [0, 0.12, -0.45, -0.22, -0.08, 0, 0], AXIS_X),
        buildRotationTrack('tent_1_02', t, [0, 0.08, -0.55, -0.28, -0.10, -0.02, 0], AXIS_X),
        buildRotationTrack('tent_1_03', t, [0, 0.04, -0.65, -0.32, -0.12, -0.03, 0], AXIS_X),
        // Tentacle 2
        buildRotationTrack('tent_2_01', t, [0, 0.12, -0.45, -0.22, -0.08, 0, 0], AXIS_X),
        buildRotationTrack('tent_2_02', t, [0, 0.08, -0.55, -0.28, -0.10, -0.02, 0], AXIS_X),
        buildRotationTrack('tent_2_03', t, [0, 0.04, -0.65, -0.32, -0.12, -0.03, 0], AXIS_X),
        // Tentacle 3
        buildRotationTrack('tent_3_01', t, [0, 0.10, -0.40, -0.20, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('tent_3_02', t, [0, 0.06, -0.50, -0.25, -0.08, -0.02, 0], AXIS_X),
        buildRotationTrack('tent_3_03', t, [0, 0.03, -0.60, -0.30, -0.10, -0.03, 0], AXIS_X),
        // Tentacle 4
        buildRotationTrack('tent_4_01', t, [0, 0.10, -0.40, -0.20, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('tent_4_02', t, [0, 0.06, -0.50, -0.25, -0.08, -0.02, 0], AXIS_X),
        buildRotationTrack('tent_4_03', t, [0, 0.03, -0.60, -0.30, -0.10, -0.03, 0], AXIS_X),
    ]);
}

function _jellyfishHit() {
    const c = ENEMY_VISUAL_CONFIG.jellyfish;
    const a = c.animationParams;
    const pulse = a.bellPulse;
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];

    return new THREE.AnimationClip('jellyfish_hit_react', dur, [
        // Bell flares wide (shock expansion) then contracts (recoil)
        posTrack('root', t, [
            [0, 0, 0], [0, 0.04, -0.06], [0, -0.02, -0.03], [0, 0.01, -0.01], [0, 0, 0]
        ]),
        // Bell flares — shock wave through the body
        scaleTrack('body_front', t, [
            [1, 1, 1], [1 + pulse * 2.5, 1 - pulse * 2, 1 + pulse * 2.5],
            [1 - pulse, 1 + pulse * 0.5, 1 - pulse], [1, 1, 1], [1, 1, 1]
        ]),
        // Tentacles splay outward in shock
        buildRotationTrack('tent_0_01', t, [0, 0.30, 0.10, 0.02, 0], AXIS_X),
        buildRotationTrack('tent_1_01', t, [0, 0.25, 0.08, 0.02, 0], AXIS_X),
        buildRotationTrack('tent_2_01', t, [0, 0.25, 0.08, 0.02, 0], AXIS_X),
        buildRotationTrack('tent_3_01', t, [0, 0.20, 0.06, 0.015, 0], AXIS_X),
        buildRotationTrack('tent_4_01', t, [0, 0.20, 0.06, 0.015, 0], AXIS_X),
    ]);
}

function _jellyfishDeath() {
    const c = ENEMY_VISUAL_CONFIG.jellyfish;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const a = c.animationParams;
    const pulse = a.bellPulse;
    const dur = 1.0;
    const t = [0, 0.12, 0.28, 0.45, 0.65, 0.82, dur];

    return new THREE.AnimationClip('jellyfish_death', dur, [
        // Bell deflates, sinks slowly — tragically beautiful
        posTrack('root', t, [
            [0, ry, 0], [0, ry * 0.88, 0], [0, ry * 0.65, 0],
            [0, ry * 0.40, 0], [0, ry * 0.18, 0],
            [0, ry * 0.05, 0], [0, 0, 0]
        ]),
        // Bell deflates — scale shrinks progressively
        scaleTrack('body_front', t, [
            [1, 1, 1], [1.05, 0.92, 1.05], [0.95, 0.80, 0.95],
            [0.82, 0.65, 0.82], [0.70, 0.50, 0.70],
            [0.60, 0.40, 0.60], [0.55, 0.35, 0.55]
        ]),
        // Head (bell top) also deflates
        scaleTrack('head', t, [
            [1, 1, 1], [1.02, 0.95, 1.02], [0.96, 0.85, 0.96],
            [0.86, 0.72, 0.86], [0.76, 0.58, 0.76],
            [0.68, 0.48, 0.68], [0.62, 0.42, 0.62]
        ]),
        // Root tilts as it sinks — asymmetric, organic
        eulerTrack('root', t, [
            [0, 0, 0], [0.02, 0, 0.04], [0.04, 0, 0.10],
            [0.06, 0.04, 0.18], [0.06, 0.06, 0.24],
            [0.05, 0.05, 0.28], [0.04, 0.04, 0.30]
        ]),
        // All tentacles curl upward — dying jellyfish reflex
        // Tentacle 0: curls tight
        buildRotationTrack('tent_0_01', t, [0, 0.15, 0.35, 0.55, 0.72, 0.82, 0.88], AXIS_X),
        buildRotationTrack('tent_0_02', t, [0, 0.10, 0.28, 0.48, 0.65, 0.76, 0.82], AXIS_X),
        buildRotationTrack('tent_0_03', t, [0, 0.08, 0.22, 0.40, 0.56, 0.68, 0.74], AXIS_X),
        // Tentacle 1
        buildRotationTrack('tent_1_01', t, [0, 0.12, 0.30, 0.50, 0.68, 0.78, 0.84], AXIS_X),
        buildRotationTrack('tent_1_02', t, [0, 0.08, 0.24, 0.44, 0.60, 0.72, 0.78], AXIS_X),
        buildRotationTrack('tent_1_03', t, [0, 0.06, 0.18, 0.36, 0.52, 0.64, 0.70], AXIS_X),
        // Tentacle 2
        buildRotationTrack('tent_2_01', t, [0, 0.12, 0.30, 0.50, 0.68, 0.78, 0.84], AXIS_X),
        buildRotationTrack('tent_2_02', t, [0, 0.08, 0.24, 0.44, 0.60, 0.72, 0.78], AXIS_X),
        buildRotationTrack('tent_2_03', t, [0, 0.06, 0.18, 0.36, 0.52, 0.64, 0.70], AXIS_X),
        // Tentacle 3
        buildRotationTrack('tent_3_01', t, [0, 0.10, 0.26, 0.45, 0.62, 0.74, 0.80], AXIS_X),
        buildRotationTrack('tent_3_02', t, [0, 0.07, 0.20, 0.38, 0.54, 0.66, 0.72], AXIS_X),
        buildRotationTrack('tent_3_03', t, [0, 0.05, 0.15, 0.32, 0.48, 0.58, 0.64], AXIS_X),
        // Tentacle 4
        buildRotationTrack('tent_4_01', t, [0, 0.10, 0.26, 0.45, 0.62, 0.74, 0.80], AXIS_X),
        buildRotationTrack('tent_4_02', t, [0, 0.07, 0.20, 0.38, 0.54, 0.66, 0.72], AXIS_X),
        buildRotationTrack('tent_4_03', t, [0, 0.05, 0.15, 0.32, 0.48, 0.58, 0.64], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// NERVOUS FLYER — anxious fidgety walk, slightly hunched, gripping armrests
// Personality: white-knuckle flyer, hands clasped, eyes darting, tense shoulders
// Bones: 11 (neck, upperArms, no forearms/feet/belly)
// ═══════════════════════════════════════════════════════════════════════

function _nervousWalk() {
    const c = ENEMY_VISUAL_CONFIG.nervous;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.25, 0.5, 0.75, dur];

    // Fidgety micro-sway — can't hold still
    const fidget = 0.06;
    // Shoulder hunch from tension
    const hunch = 0.08;

    return new THREE.AnimationClip('nervous_walk', dur, [
        // Root: nervous quick bob, slightly uneven (asymmetric stress)
        posTrack('root', t, [
            [0, ry, 0], [0.01 * s, ry + bob, 0], [0, ry, 0],
            [-0.01 * s, ry + bob * 0.8, 0], [0, ry, 0]
        ]),
        // Spine: hunched forward + nervous micro-sway + slight twist
        eulerTrack('spine', t, [
            [lean - hunch, fidget, 0.02], [lean - hunch * 0.7, 0, -0.01],
            [lean - hunch, -fidget, -0.02], [lean - hunch * 0.7, 0, 0.01],
            [lean - hunch, fidget, 0.02]
        ]),
        // Head: darting glances, never settled — eyes scanning for danger
        eulerTrack('head', t, [
            [0.06, 0.18, -0.04], [-0.02, -0.12, 0.02],
            [0.04, -0.22, 0.05], [-0.03, 0.14, -0.03],
            [0.06, 0.18, -0.04]
        ]),
        // Arms: clutched across torso, gripping themselves — self-comforting
        // Slight squeeze tighter on each step (anxiety spike)
        eulerTrack('upperArm_L', t, [
            [0.65, 0, 0.55], [0.70, 0, 0.58], [0.65, 0, 0.55],
            [0.72, 0, 0.60], [0.65, 0, 0.55]
        ]),
        eulerTrack('upperArm_R', t, [
            [0.65, 0, -0.55], [0.72, 0, -0.60], [0.65, 0, -0.55],
            [0.70, 0, -0.58], [0.65, 0, -0.55]
        ]),
        // Legs: quick short steps (wants to get there fast but afraid to run)
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: tight knee bend — tense, not relaxed stride
        buildRotationTrack('lowerLeg_L', t, [-0.12, -0.58, -0.15, -0.62, -0.12], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.15, -0.62, -0.12, -0.58, -0.15], AXIS_X),
    ]);
}

function _nervousBashR() {
    const c = ENEMY_VISUAL_CONFIG.nervous;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 1.0;

    // Timid knocking — hesitant, apologetic, then increasingly frantic
    const t = [0, 0.18, 0.28, 0.42, 0.52, 0.62, 0.72, 0.85, dur];

    return new THREE.AnimationClip('nervous_bash_door_R', dur, [
        // Root: barely leans in, flinches back between knocks
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0], [0, ry, 0.04 * s], [0, ry, -0.02 * s],
            [0, ry, 0.05 * s], [0, ry, -0.02 * s], [0, ry, 0.06 * s],
            [0, ry, 0], [0, ry, 0]
        ]),
        // Spine: flinches forward then pulls back (scared of own knocking)
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.04, 0, 0], [lean - 0.10, 0, -0.03],
            [lean + 0.04, 0, 0], [lean - 0.12, 0, -0.04],
            [lean + 0.03, 0, 0], [lean - 0.14, 0, -0.05],
            [lean - 0.02, 0, 0], [lean, 0, 0]
        ]),
        // Right arm: hesitant raise → timid knock × 3 → snaps back to clutch
        eulerTrack('upperArm_R', t, [
            [0.65, 0, -0.55],    // self-clutch
            [1.4, 0, -0.1],      // hesitant raise (not as high as polite)
            [0.7, 0, 0.05],      // first knock — timid
            [1.2, 0, -0.05],     // flinch back
            [0.65, 0, 0.08],     // second knock — harder
            [1.3, 0, 0],         // flinch
            [0.55, 0, 0.10],     // third knock — frantic
            [0.8, 0, -0.3],      // pulling back
            [0.65, 0, -0.55],    // return to clutch
        ]),
        // Left arm: clutches tighter during knocking (stress response)
        eulerTrack('upperArm_L', t, [
            [0.65, 0, 0.55], [0.68, 0, 0.58], [0.72, 0, 0.62],
            [0.70, 0, 0.60], [0.75, 0, 0.65], [0.72, 0, 0.62],
            [0.78, 0, 0.68], [0.70, 0, 0.60], [0.65, 0, 0.55]
        ]),
        // Head: looking around nervously between knocks — "is anyone watching?"
        eulerTrack('head', t, [
            [0.04, 0, 0], [0, 0.16, 0], [-0.06, 0, 0.04],
            [0.02, -0.20, -0.06], [-0.05, 0.08, 0.03],
            [0.03, 0.22, 0.05], [-0.06, -0.10, -0.03],
            [0.02, -0.14, 0], [0.04, 0, 0]
        ]),
        // Legs: shifting weight nervously
        buildRotationTrack('upperLeg_L', t,
            [0, 0, 0.04, 0.02, 0.05, 0.02, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.02, 0.04, 0.02, 0.05, 0.02, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0, -0.06, -0.03, -0.08, -0.03, -0.10, -0.03, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.02, -0.06, -0.03, -0.08, -0.03, -0.10, -0.03, 0], AXIS_X),
    ]);
}

function _nervousBashL() {
    const c = ENEMY_VISUAL_CONFIG.nervous;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 1.0;

    const t = [0, 0.18, 0.28, 0.42, 0.52, 0.62, 0.72, 0.85, dur];

    return new THREE.AnimationClip('nervous_bash_door_L', dur, [
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0], [0, ry, 0.04 * s], [0, ry, -0.02 * s],
            [0, ry, 0.05 * s], [0, ry, -0.02 * s], [0, ry, 0.06 * s],
            [0, ry, 0], [0, ry, 0]
        ]),
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.04, 0, 0], [lean - 0.10, 0, 0.03],
            [lean + 0.04, 0, 0], [lean - 0.12, 0, 0.04],
            [lean + 0.03, 0, 0], [lean - 0.14, 0, 0.05],
            [lean - 0.02, 0, 0], [lean, 0, 0]
        ]),
        // Left arm knocks (mirrored)
        eulerTrack('upperArm_L', t, [
            [0.65, 0, 0.55],
            [1.4, 0, 0.1],
            [0.7, 0, -0.05],
            [1.2, 0, 0.05],
            [0.65, 0, -0.08],
            [1.3, 0, 0],
            [0.55, 0, -0.10],
            [0.8, 0, 0.3],
            [0.65, 0, 0.55],
        ]),
        // Right arm clutches tighter
        eulerTrack('upperArm_R', t, [
            [0.65, 0, -0.55], [0.68, 0, -0.58], [0.72, 0, -0.62],
            [0.70, 0, -0.60], [0.75, 0, -0.65], [0.72, 0, -0.62],
            [0.78, 0, -0.68], [0.70, 0, -0.60], [0.65, 0, -0.55]
        ]),
        eulerTrack('head', t, [
            [0.04, 0, 0], [0, -0.16, 0], [-0.06, 0, -0.04],
            [0.02, 0.20, 0.06], [-0.05, -0.08, -0.03],
            [0.03, -0.22, -0.05], [-0.06, 0.10, 0.03],
            [0.02, 0.14, 0], [0.04, 0, 0]
        ]),
        buildRotationTrack('upperLeg_L', t,
            [0, 0, 0.04, 0.02, 0.05, 0.02, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.02, 0.04, 0.02, 0.05, 0.02, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0, -0.06, -0.03, -0.08, -0.03, -0.10, -0.03, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.02, -0.06, -0.03, -0.08, -0.03, -0.10, -0.03, 0], AXIS_X),
    ]);
}

function _nervousHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];
    return new THREE.AnimationClip('nervous_hit_react', dur, [
        // Dramatic flinch — already on edge, so HUGE startle response
        posTrack('root', t, [[0, 0, 0], [0, -0.06, -0.14], [0, -0.02, -0.06], [0, 0, -0.02], [0, 0, 0]]),
        eulerTrack('spine', t, [
            [0, 0, 0], [0.20, 0, 0.06], [0.08, 0, 0.02], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Head ducks down (protective reflex)
        eulerTrack('head', t, [
            [0, 0, 0], [0.16, 0, 0.08], [0.06, 0, 0.03], [0.01, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _nervousDeath() {
    const c = ENEMY_VISUAL_CONFIG.nervous;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;
    const t = [0, 0.10, 0.25, 0.38, 0.50, dur];

    return new THREE.AnimationClip('nervous_death', dur, [
        // Crumples inward — collapses like their worst fear came true
        posTrack('root', t, [
            [0, ry, 0], [0, ry - 0.06, -0.04 * s], [0.04 * s, ry * 0.55, 0],
            [0.03 * s, ry * 0.20, 0.06 * s], [0, ry * 0.06, 0.10 * s], [0, 0, 0.12 * s]
        ]),
        // Spine curls forward (fetal response)
        eulerTrack('spine', t, [
            [-0.12, 0, 0], [-0.30, 0, 0.04], [-0.65, 0, 0.10],
            [-1.05, 0, 0.14], [-1.35, 0, 0.10], [-1.50, 0, 0.06]
        ]),
        // Arms wrap inward protectively
        eulerTrack('upperArm_L', t, [
            [0.65, 0, 0.55], [0.80, 0, 0.70], [0.90, 0, 0.50],
            [0.60, 0, 0.30], [0.30, 0, 0.10], [0.10, 0, -0.10]
        ]),
        eulerTrack('upperArm_R', t, [
            [0.65, 0, -0.55], [0.80, 0, -0.70], [0.90, 0, -0.50],
            [0.60, 0, -0.30], [0.30, 0, -0.10], [0.10, 0, 0.10]
        ]),
        // Head tucks down
        eulerTrack('head', t, [
            [0.06, 0, 0], [0.18, 0.10, 0.06], [0.12, -0.08, -0.04],
            [0.06, 0.04, 0.02], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Legs buckle (knees give out from fear)
        buildRotationTrack('upperLeg_L', t, [0, 0.35, 0.75, 0.95, 1.05, 1.10], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.25, 0.55, 0.85, 1.00, 1.05], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.30, -0.80, -1.20, -1.45, -1.55], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.20, -0.65, -1.05, -1.35, -1.45], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// BUSINESS CLASS — entitled dignified stride, minimal bounce, imperious
// Personality: "Do you know who I am?", chin up, stiff upper lip, barely
//   deigns to hurry, arms at sides like a board meeting power stance
// Bones: 11 (neck, upperArms, no forearms/feet/belly)
// ═══════════════════════════════════════════════════════════════════════

function _businessWalk() {
    const c = ENEMY_VISUAL_CONFIG.business;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // Minimal twist — too dignified for body language
    const twist = 0.04;

    return new THREE.AnimationClip('business_walk', dur, [
        // Root: barely bounces — glides like first-class turbulence dampening
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: nearly vertical, minimal twist, slight entitled lean-back
        eulerTrack('spine', t, [
            [lean, twist, 0], [lean, 0, 0], [lean, -twist, 0],
            [lean, 0, 0], [lean, twist, 0]
        ]),
        // Head: chin UP, looking DOWN nose at everyone, barely moves
        eulerTrack('head', t, [
            [-0.10, -twist * 0.3, 0], [-0.10, 0, 0], [-0.10, twist * 0.3, 0],
            [-0.10, 0, 0], [-0.10, -twist * 0.3, 0]
        ]),
        // Arms: stiff at sides, minimal swing — briefcase posture
        eulerTrack('upperArm_L', t, [
            [asw, 0, 0.08], [0, 0, 0.08], [-asw, 0, 0.08],
            [0, 0, 0.08], [asw, 0, 0.08]
        ]),
        eulerTrack('upperArm_R', t, [
            [-asw, 0, -0.08], [0, 0, -0.08], [asw, 0, -0.08],
            [0, 0, -0.08], [-asw, 0, -0.08]
        ]),
        // Legs: measured, deliberate stride — never rushes
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: crisp, sharp knee action
        buildRotationTrack('lowerLeg_L', t, [-0.08, -0.45, -0.10, -0.50, -0.08], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.10, -0.50, -0.08, -0.45, -0.10], AXIS_X),
    ]);
}

function _businessBashR() {
    const c = ENEMY_VISUAL_CONFIG.business;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 0.9;

    // Imperious: one firm knock, pause, TWO impatient raps, snap fingers, done
    const t = [0, 0.14, 0.22, 0.38, 0.46, 0.56, 0.66, 0.80, dur];

    return new THREE.AnimationClip('business_bash_door_R', dur, [
        // Root: barely moves — won't debase themselves
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0], [0, ry, 0.03 * s], [0, ry, 0.01 * s],
            [0, ry, 0.04 * s], [0, ry, 0.01 * s], [0, ry, 0.04 * s],
            [0, ry, 0], [0, ry, 0]
        ]),
        // Spine: barely leans — maintains composure
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.02, 0, 0], [lean - 0.06, 0, -0.02],
            [lean - 0.02, 0, 0], [lean - 0.08, 0, -0.03],
            [lean - 0.02, 0, 0], [lean - 0.08, 0, -0.03],
            [lean - 0.01, 0, 0], [lean, 0, 0]
        ]),
        // Right arm: controlled, precise knocks — no wasted motion
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.08],       // at side
            [1.6, 0, -0.06],     // raised precisely
            [0.9, 0, 0.05],      // first knock — firm
            [1.3, 0, 0],         // controlled recoil
            [0.85, 0, 0.06],     // second knock — impatient
            [1.2, 0, 0],         // recoil
            [0.80, 0, 0.08],     // third knock — "I said OPEN"
            [0.6, 0, -0.04],     // lowering
            [0, 0, -0.08],       // return to side
        ]),
        // Left arm: stays rigid at side — too dignified to clutch
        eulerTrack('upperArm_L', t, [
            [0, 0, 0.08], [0, 0, 0.08], [0.02, 0, 0.10], [0, 0, 0.08],
            [0.03, 0, 0.10], [0, 0, 0.08], [0.04, 0, 0.12],
            [0, 0, 0.10], [0, 0, 0.08]
        ]),
        // Head: impatient, looks at watch, sighs
        eulerTrack('head', t, [
            [-0.10, 0, 0], [-0.08, 0, 0], [-0.12, 0, 0.03],
            [-0.10, -0.14, -0.04], [-0.12, 0.06, 0.02],
            [-0.08, 0.16, 0.05], [-0.12, -0.08, -0.02],
            [-0.10, 0, 0], [-0.10, 0, 0]
        ]),
        // Legs: barely shift — standing ground
        buildRotationTrack('upperLeg_L', t,
            [0, 0, 0.02, 0.01, 0.03, 0.01, 0.03, 0.01, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.01, 0.02, 0.01, 0.03, 0.01, 0.03, 0.01, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0, -0.04, -0.02, -0.05, -0.02, -0.05, -0.02, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.01, -0.04, -0.02, -0.05, -0.02, -0.05, -0.02, 0], AXIS_X),
    ]);
}

function _businessBashL() {
    const c = ENEMY_VISUAL_CONFIG.business;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 0.9;

    const t = [0, 0.14, 0.22, 0.38, 0.46, 0.56, 0.66, 0.80, dur];

    return new THREE.AnimationClip('business_bash_door_L', dur, [
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0], [0, ry, 0.03 * s], [0, ry, 0.01 * s],
            [0, ry, 0.04 * s], [0, ry, 0.01 * s], [0, ry, 0.04 * s],
            [0, ry, 0], [0, ry, 0]
        ]),
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.02, 0, 0], [lean - 0.06, 0, 0.02],
            [lean - 0.02, 0, 0], [lean - 0.08, 0, 0.03],
            [lean - 0.02, 0, 0], [lean - 0.08, 0, 0.03],
            [lean - 0.01, 0, 0], [lean, 0, 0]
        ]),
        // Left arm knocks (mirrored)
        eulerTrack('upperArm_L', t, [
            [0, 0, 0.08],
            [1.6, 0, 0.06],
            [0.9, 0, -0.05],
            [1.3, 0, 0],
            [0.85, 0, -0.06],
            [1.2, 0, 0],
            [0.80, 0, -0.08],
            [0.6, 0, 0.04],
            [0, 0, 0.08],
        ]),
        // Right arm stays at side
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.08], [0, 0, -0.08], [0.02, 0, -0.10], [0, 0, -0.08],
            [0.03, 0, -0.10], [0, 0, -0.08], [0.04, 0, -0.12],
            [0, 0, -0.10], [0, 0, -0.08]
        ]),
        eulerTrack('head', t, [
            [-0.10, 0, 0], [-0.08, 0, 0], [-0.12, 0, -0.03],
            [-0.10, 0.14, 0.04], [-0.12, -0.06, -0.02],
            [-0.08, -0.16, -0.05], [-0.12, 0.08, 0.02],
            [-0.10, 0, 0], [-0.10, 0, 0]
        ]),
        buildRotationTrack('upperLeg_L', t,
            [0, 0, 0.02, 0.01, 0.03, 0.01, 0.03, 0.01, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.01, 0.02, 0.01, 0.03, 0.01, 0.03, 0.01, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0, -0.04, -0.02, -0.05, -0.02, -0.05, -0.02, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.01, -0.04, -0.02, -0.05, -0.02, -0.05, -0.02, 0], AXIS_X),
    ]);
}

function _businessHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, 0.22, dur];
    return new THREE.AnimationClip('business_hit_react', dur, [
        // Barely deigns to react — indignant micro-flinch
        posTrack('root', t, [[0, 0, 0], [0, -0.02, -0.06], [0, -0.005, -0.02], [0, 0, -0.01], [0, 0, 0]]),
        eulerTrack('spine', t, [
            [0, 0, 0], [0.08, 0, 0.02], [0.03, 0, 0.01], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Head tilts back in offense — "How DARE you"
        eulerTrack('head', t, [
            [0, 0, 0], [-0.12, 0, 0], [-0.04, 0, 0], [-0.01, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _businessDeath() {
    const c = ENEMY_VISUAL_CONFIG.business;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.7;
    const t = [0, 0.12, 0.28, 0.42, 0.56, dur];

    return new THREE.AnimationClip('business_death', dur, [
        // Falls backward with dignity — tries to maintain composure to the end
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.06 * s], [0, ry * 0.65, -0.20 * s],
            [0, ry * 0.30, -0.40 * s], [0, ry * 0.08, -0.55 * s], [0, 0, -0.60 * s]
        ]),
        // Spine arches backward — stiff, rigid to the end
        eulerTrack('spine', t, [
            [-0.04, 0, 0], [0.10, 0, 0], [0.35, 0, 0.04],
            [0.65, 0, 0.06], [0.90, 0, 0.04], [1.05, 0, 0.02]
        ]),
        // Arms reach out indignantly
        eulerTrack('upperArm_L', t, [
            [0, 0, 0.08], [0.20, 0, -0.10], [0.50, 0, -0.30],
            [0.35, 0, -0.40], [0.15, 0, -0.30], [0, 0, -0.20]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.08], [0.15, 0, 0.10], [0.40, 0, 0.30],
            [0.25, 0, 0.40], [0.10, 0, 0.30], [0, 0, 0.20]
        ]),
        // Head: maintains chin-up even falling
        eulerTrack('head', t, [
            [-0.10, 0, 0], [-0.14, 0, 0], [-0.08, 0.06, 0.04],
            [0, 0.04, 0.02], [0.04, 0, 0], [0.06, 0, 0]
        ]),
        // Legs stiffen straight (won't buckle — too proud)
        buildRotationTrack('upperLeg_L', t, [0, -0.10, -0.30, -0.50, -0.65, -0.70], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, -0.08, -0.25, -0.45, -0.60, -0.65], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, 0.05, 0.15, 0.25, 0.30, 0.32], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, 0.04, 0.12, 0.20, 0.25, 0.28], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// TURBULENCE STUMBLER — nauseous side-to-side lurch, belly physics
// Personality: ate the fish, regrets everything, stumbling like turbulence
//   hit mid-stride, arms out for balance, gut leading the way
// Bones: 15 ALL (neck, upperArms, forearms, feet, belly)
// ═══════════════════════════════════════════════════════════════════════

function _stumblerWaddle() {
    const c = ENEMY_VISUAL_CONFIG.stumbler;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const bodyRock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const dur = c.animationParams.walkDuration;
    const bellyJ = c.animationParams.bellyJiggle;
    const t = [0, 0.35, 0.7, 1.05, dur];

    // Belly follow-through — delayed, sloshing
    const bellySway = bodyRock * 1.2;

    return new THREE.AnimationClip('stumbler_waddle', dur, [
        // Root: MASSIVE lateral rock — stumbling between steps as if turbulence
        eulerTrack('root', t, [
            [0, 0, -bodyRock], [0, 0.04, 0], [0, 0, bodyRock],
            [0, -0.04, 0], [0, 0, -bodyRock]
        ]),
        // Root bob: heavy lurching bob (nauseous dipping)
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry - bob * 0.3, 0],
            [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: deep forward lean (hunched, nauseous) + counter-sway
        eulerTrack('spine', t, [
            [-0.18, 0, bodyRock * 0.5], [-0.22, 0, 0],
            [-0.18, 0, -bodyRock * 0.5], [-0.22, 0, 0],
            [-0.18, 0, bodyRock * 0.5]
        ]),
        // Belly: secondary sloshing motion — delayed phase + jiggle
        eulerTrack('belly', t, [
            [bellyJ, 0, 0], [bellyJ, 0, bellySway],
            [bellyJ, 0, 0], [bellyJ, 0, -bellySway], [bellyJ, 0, 0]
        ]),
        // Belly jiggle on each step (scale bounce — nauseous wobble)
        scaleTrack('belly', t, [
            [1, 1, 1], [1.10, 0.92, 1.12], [1, 1, 1], [1.10, 0.92, 1.12], [1, 1, 1]
        ]),
        // Head: fighting to stay upright, nauseated sway
        eulerTrack('head', t, [
            [0.08, 0, bodyRock * 0.6], [0.04, 0, 0],
            [0.08, 0, -bodyRock * 0.6], [0.04, 0, 0],
            [0.08, 0, bodyRock * 0.6]
        ]),
        // Arms: splayed outward for balance (wider than waddle — more desperate)
        eulerTrack('upperArm_L', t, [
            [-asw, 0, -0.35], [0, 0, -0.38], [asw, 0, -0.35],
            [0, 0, -0.38], [-asw, 0, -0.35]
        ]),
        eulerTrack('upperArm_R', t, [
            [asw, 0, 0.35], [0, 0, 0.38], [-asw, 0, 0.35],
            [0, 0, 0.38], [asw, 0, 0.35]
        ]),
        // Forearms: limp, nauseous lag behind (barely controlling them)
        buildRotationTrack('forearm_L', t, [0.15, -0.18, 0.15, -0.18, 0.15], AXIS_X),
        buildRotationTrack('forearm_R', t, [-0.18, 0.15, -0.18, 0.15, -0.18], AXIS_X),
        // Legs: unsteady short steps (can barely walk straight)
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: stiff, heavy (nausea makes everything hard)
        buildRotationTrack('lowerLeg_L', t, [-0.10, -0.25, -0.10, -0.28, -0.10], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.10, -0.28, -0.10, -0.25, -0.10], AXIS_X),
        // Feet: flat stumbling plants (no heel-toe finesse)
        buildRotationTrack('foot_L', t, [-0.10, 0.05, -0.10, 0, -0.10], AXIS_X),
        buildRotationTrack('foot_R', t, [-0.10, 0, -0.10, 0.05, -0.10], AXIS_X),
    ]);
}

function _stumblerBash() {
    const c = ENEMY_VISUAL_CONFIG.stumbler;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Stumble-CRASH: lurches forward, SLAMS body into door, belly impact cascade
    const t = [0, 0.22, 0.38, 0.46, 0.54, 0.64, 0.78, dur];

    return new THREE.AnimationClip('stumbler_bash_door', dur, [
        // Root: stumbles back, lurches forward into door face-first
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.04, -0.18 * s], [0, ry - 0.08, 0.28 * s],
            [0, ry - 0.12, 0.22 * s], [0, ry - 0.06, 0.12 * s],
            [0, ry - 0.02, 0.06 * s], [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Spine: lurches back (winding up from nausea) then crashes forward
        eulerTrack('spine', t, [
            [-0.18, 0, 0], [0.18, 0, 0.06], [-0.52, 0, -0.04],
            [-0.42, 0, 0.08], [-0.28, 0, -0.04],
            [-0.22, 0, 0.02], [-0.18, 0, 0], [-0.18, 0, 0]
        ]),
        // Belly: compresses on wind-up, EXPLODES on impact, sloshy settle
        scaleTrack('belly', t, [
            [1, 1, 1], [0.86, 1.08, 0.82], [1.38, 0.76, 1.45],
            [0.84, 1.18, 0.76], [1.16, 0.88, 1.20],
            [0.92, 1.06, 0.91], [1.04, 0.98, 1.03], [1, 1, 1]
        ]),
        eulerTrack('belly', t, [
            [0, 0, 0], [-0.14, 0, 0], [0.30, 0, 0.06],
            [-0.16, 0, -0.04], [0.10, 0, 0.02],
            [-0.05, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Arms: flail forward on impact (no control)
        buildRotationTrack('upperArm_L', t,
            [0, 0.5, -0.60, -0.40, -0.18, 0.04, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [0, 0.5, -0.60, -0.40, -0.18, 0.04, 0, 0], AXIS_X),
        // Forearms: completely limp on impact
        buildRotationTrack('forearm_L', t,
            [0, 0.25, -0.85, -0.45, -0.22, 0, 0, 0], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0, 0.25, -0.85, -0.45, -0.22, 0, 0, 0], AXIS_X),
        // Head: rocks from the impact, dazed
        eulerTrack('head', t, [
            [0.08, 0, 0], [0.14, 0, 0], [-0.20, 0, 0.10],
            [0.12, 0, -0.06], [-0.06, 0, 0.04],
            [0.04, 0, 0], [0.08, 0, 0], [0.08, 0, 0]
        ]),
        // Legs: brace weakly
        buildRotationTrack('upperLeg_L', t,
            [0, -0.12, 0.24, 0.18, 0.10, 0.04, 0, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.12, 0.24, 0.18, 0.10, 0.04, 0, 0], AXIS_X),
        // Feet: stumble on impact
        buildRotationTrack('foot_L', t,
            [0, 0.08, -0.16, -0.10, -0.04, 0, 0, 0], AXIS_X),
        buildRotationTrack('foot_R', t,
            [0, 0.08, -0.16, -0.10, -0.04, 0, 0, 0], AXIS_X),
    ]);
}

function _stumblerHitReact() {
    const dur = 0.35;
    const t = [0, 0.05, 0.12, 0.22, 0.30, dur];
    return new THREE.AnimationClip('stumbler_hit_react', dur, [
        // Lurches back — already unsteady, so bigger reaction
        posTrack('root', t, [
            [0, 0, 0], [0, -0.02, -0.06], [0, -0.01, -0.03],
            [0, 0, -0.01], [0, 0, 0], [0, 0, 0]
        ]),
        // Belly sloshes from impact
        eulerTrack('belly', t, [
            [0, 0, 0], [0.12, 0, 0.05], [-0.08, 0, -0.03],
            [0.04, 0, 0.01], [-0.01, 0, 0], [0, 0, 0]
        ]),
        buildRotationTrack('spine', t, [0, 0.06, 0.02, 0.008, 0, 0], AXIS_X),
    ]);
}

function _stumblerDeath() {
    const c = ENEMY_VISUAL_CONFIG.stumbler;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;
    const t = [0, 0.12, 0.30, 0.48, 0.60, 0.72, dur];

    return new THREE.AnimationClip('stumbler_death', dur, [
        // Timber fall forward — finally succumbs, face-plants
        posTrack('root', t, [
            [0, ry, 0], [0, ry * 0.92, 0.08 * s], [0, ry * 0.65, 0.25 * s],
            [0, ry * 0.30, 0.48 * s], [0, ry * 0.08, 0.62 * s],
            [0, ry * 0.02, 0.68 * s], [0, 0, 0.70 * s]
        ]),
        // Root tips forward (face-plant)
        buildRotationTrack('root', t, [0, -0.12, -0.45, -0.85, -1.25, -1.48, -1.57], AXIS_X),
        // Spine curls forward (body crumples)
        eulerTrack('spine', t, [
            [-0.18, 0, 0], [-0.30, 0, 0.06], [-0.48, 0, 0.10],
            [-0.62, 0, 0.16], [-0.72, 0, 0.20], [-0.78, 0, 0.22], [-0.82, 0, 0.22]
        ]),
        // Belly: final sloshy bounce cascade on collapse
        scaleTrack('belly', t, [
            [1, 1, 1], [1.04, 0.96, 1.04], [1.12, 0.88, 1.14],
            [1.22, 0.80, 1.24], [0.90, 1.10, 0.88],
            [1.08, 0.94, 1.06], [1, 1, 1]
        ]),
        eulerTrack('belly', t, [
            [0, 0, 0], [0.06, 0, 0], [0.14, 0, 0.08],
            [0.24, 0, 0.18], [0.16, 0, 0.24], [0.08, 0, 0.16], [0, 0, 0.10]
        ]),
        // Arms reach forward weakly
        eulerTrack('upperArm_L', t, [
            [0, 0, -0.35], [0.15, 0, -0.42], [0.35, 0, -0.50],
            [0.25, 0, -0.55], [0.10, 0, -0.45], [0, 0, -0.38], [0, 0, -0.30]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0.35], [0.20, 0, 0.45], [0.40, 0, 0.55],
            [0.30, 0, 0.60], [0.15, 0, 0.50], [0.05, 0, 0.40], [0, 0, 0.32]
        ]),
        // Forearms: go limp
        buildRotationTrack('forearm_L', t,
            [0, -0.10, -0.30, -0.50, -0.65, -0.72, -0.75], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0, -0.08, -0.25, -0.45, -0.58, -0.68, -0.72], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// FLIGHT ATTENDANT — brisk professional stride, upright, efficient
// Personality: "Please return to your seats", snappy walk, arms precisely
//   at sides, maintains composure even while desperate. Cart-pushing stance.
// Bones: 11 (neck, upperArms, no forearms/feet/belly)
// ═══════════════════════════════════════════════════════════════════════

function _attendantWalk() {
    const c = ENEMY_VISUAL_CONFIG.attendant;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // Brisk professional counter-twist
    const twist = 0.07;

    return new THREE.AnimationClip('attendant_walk', dur, [
        // Root: light bouncy bob — confident, brisk
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: very upright, crisp professional twist
        eulerTrack('spine', t, [
            [lean, twist, 0], [lean, 0, 0], [lean, -twist, 0],
            [lean, 0, 0], [lean, twist, 0]
        ]),
        // Head: steady, forward-focused, slight counter-stabilization
        eulerTrack('head', t, [
            [0, -twist * 0.5, 0], [0, 0, 0], [0, twist * 0.5, 0],
            [0, 0, 0], [0, -twist * 0.5, 0]
        ]),
        // Arms: crisp, close, efficient swing — "aisle-width" movement
        eulerTrack('upperArm_L', t, [
            [asw, 0, 0.06], [0, 0, 0.06], [-asw, 0, 0.06],
            [0, 0, 0.06], [asw, 0, 0.06]
        ]),
        eulerTrack('upperArm_R', t, [
            [-asw, 0, -0.06], [0, 0, -0.06], [asw, 0, -0.06],
            [0, 0, -0.06], [-asw, 0, -0.06]
        ]),
        // Legs: brisk, efficient stride — practiced aisle walker
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: springy, practiced knee action
        buildRotationTrack('lowerLeg_L', t, [-0.10, -0.50, -0.12, -0.55, -0.10], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.12, -0.55, -0.10, -0.50, -0.12], AXIS_X),
    ]);
}

function _attendantBashR() {
    const c = ENEMY_VISUAL_CONFIG.attendant;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 0.7;

    // Rapid, efficient knocking — professional urgency, not chaos
    const t = [0, 0.10, 0.18, 0.28, 0.36, 0.46, 0.56, dur];

    return new THREE.AnimationClip('attendant_bash_door_R', dur, [
        // Root: leans forward efficiently
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.03 * s], [0, ry, 0.05 * s],
            [0, ry, 0.02 * s], [0, ry, 0.05 * s], [0, ry, 0.02 * s],
            [0, ry, 0.04 * s], [0, ry, 0]
        ]),
        // Spine: controlled lean into each knock
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.04, 0, 0], [lean - 0.12, 0, -0.03],
            [lean - 0.04, 0, 0], [lean - 0.14, 0, -0.04],
            [lean - 0.04, 0, 0], [lean - 0.12, 0, -0.03], [lean, 0, 0]
        ]),
        // Right arm: rapid professional knock — like knocking on cockpit door
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.06],       // at side
            [1.5, 0, -0.04],     // raised briskly
            [0.75, 0, 0.06],     // first knock — firm
            [1.2, 0, 0],         // quick recoil
            [0.70, 0, 0.08],     // second knock — rapid
            [1.1, 0, 0],         // recoil
            [0.65, 0, 0.10],     // third knock — urgent
            [0, 0, -0.06],       // snap back to side
        ]),
        // Left arm: stays at side, slightly tense
        eulerTrack('upperArm_L', t, [
            [0, 0, 0.06], [0.02, 0, 0.08], [0.04, 0, 0.10], [0.02, 0, 0.08],
            [0.04, 0, 0.10], [0.02, 0, 0.08], [0.04, 0, 0.10], [0, 0, 0.06]
        ]),
        // Head: stays focused on the door — professional
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, 0], [-0.04, 0, 0.02], [0, 0, 0],
            [-0.05, 0, -0.02], [0, 0, 0], [-0.04, 0, 0.02], [0, 0, 0]
        ]),
        // Legs: firm stance, slight weight shift
        buildRotationTrack('upperLeg_L', t,
            [0, 0.02, 0.06, 0.03, 0.07, 0.03, 0.06, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.02, 0.06, 0.03, 0.07, 0.03, 0.06, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.02, -0.08, -0.04, -0.10, -0.04, -0.08, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.02, -0.08, -0.04, -0.10, -0.04, -0.08, 0], AXIS_X),
    ]);
}

function _attendantBashL() {
    const c = ENEMY_VISUAL_CONFIG.attendant;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 0.7;

    const t = [0, 0.10, 0.18, 0.28, 0.36, 0.46, 0.56, dur];

    return new THREE.AnimationClip('attendant_bash_door_L', dur, [
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.03 * s], [0, ry, 0.05 * s],
            [0, ry, 0.02 * s], [0, ry, 0.05 * s], [0, ry, 0.02 * s],
            [0, ry, 0.04 * s], [0, ry, 0]
        ]),
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean - 0.04, 0, 0], [lean - 0.12, 0, 0.03],
            [lean - 0.04, 0, 0], [lean - 0.14, 0, 0.04],
            [lean - 0.04, 0, 0], [lean - 0.12, 0, 0.03], [lean, 0, 0]
        ]),
        // Left arm knocks (mirrored)
        eulerTrack('upperArm_L', t, [
            [0, 0, 0.06],
            [1.5, 0, 0.04],
            [0.75, 0, -0.06],
            [1.2, 0, 0],
            [0.70, 0, -0.08],
            [1.1, 0, 0],
            [0.65, 0, -0.10],
            [0, 0, 0.06],
        ]),
        // Right arm stays at side
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.06], [0.02, 0, -0.08], [0.04, 0, -0.10], [0.02, 0, -0.08],
            [0.04, 0, -0.10], [0.02, 0, -0.08], [0.04, 0, -0.10], [0, 0, -0.06]
        ]),
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, 0], [-0.04, 0, -0.02], [0, 0, 0],
            [-0.05, 0, 0.02], [0, 0, 0], [-0.04, 0, -0.02], [0, 0, 0]
        ]),
        buildRotationTrack('upperLeg_L', t,
            [0, 0.02, 0.06, 0.03, 0.07, 0.03, 0.06, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.02, 0.06, 0.03, 0.07, 0.03, 0.06, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.02, -0.08, -0.04, -0.10, -0.04, -0.08, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.02, -0.08, -0.04, -0.10, -0.04, -0.08, 0], AXIS_X),
    ]);
}

function _attendantHitReact() {
    const dur = 0.25;
    const t = [0, 0.04, 0.10, 0.18, dur];
    return new THREE.AnimationClip('attendant_hit_react', dur, [
        // Controlled stumble — trained to stay composed
        posTrack('root', t, [[0, 0, 0], [0, -0.03, -0.08], [0, -0.01, -0.03], [0, 0, -0.01], [0, 0, 0]]),
        eulerTrack('spine', t, [
            [0, 0, 0], [0.12, 0, 0.03], [0.04, 0, 0.01], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Quick professional composure recovery
        eulerTrack('head', t, [
            [0, 0, 0], [0.06, -0.06, 0], [0.02, -0.02, 0], [0.005, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _attendantDeath() {
    const c = ENEMY_VISUAL_CONFIG.attendant;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.55;
    const t = [0, 0.10, 0.22, 0.34, 0.46, dur];

    return new THREE.AnimationClip('attendant_death', dur, [
        // Graceful collapse to the side — even dying looks professional
        posTrack('root', t, [
            [0, ry, 0], [0.02 * s, ry * 0.85, 0], [0.06 * s, ry * 0.55, -0.03 * s],
            [0.08 * s, ry * 0.22, -0.05 * s], [0.08 * s, ry * 0.05, -0.04 * s],
            [0.08 * s, 0, -0.03 * s]
        ]),
        // Spine: controlled crumple (not wild flailing)
        eulerTrack('spine', t, [
            [-0.05, 0, 0], [-0.18, 0, -0.10], [-0.45, 0, -0.22],
            [-0.78, 0, -0.32], [-1.05, 0, -0.28], [-1.18, 0, -0.22]
        ]),
        // Arms reach out with dignity
        eulerTrack('upperArm_L', t, [
            [0, 0, 0.06], [0.15, 0, -0.08], [0.35, 0, -0.22],
            [0.20, 0, -0.30], [0.08, 0, -0.22], [0, 0, -0.15]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, -0.06], [0.10, 0, 0.10], [0.28, 0, 0.24],
            [0.18, 0, 0.32], [0.06, 0, 0.24], [0, 0, 0.16]
        ]),
        // Head: tilts gracefully
        eulerTrack('head', t, [
            [0, 0, 0], [-0.10, 0.06, -0.06], [-0.06, 0.12, -0.14],
            [0, 0.08, -0.18], [0.02, 0.04, -0.14], [0.02, 0.02, -0.10]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.15, 0.45, 0.70, 0.82, 0.88], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.12, 0.35, 0.60, 0.72, 0.78], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.12, -0.38, -0.62, -0.78, -0.82], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.10, -0.32, -0.52, -0.68, -0.72], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// AIR MARSHAL — authoritative compact stride, rigid, controlled
// Personality: law enforcement confidence, squared shoulders, arms close
//   and ready, head on a swivel scanning threats. Suppressed urgency.
// Bones: 13 (neck, upperArms, forearms, no feet/belly)
// ═══════════════════════════════════════════════════════════════════════

function _marshalPowerWalk() {
    const c = ENEMY_VISUAL_CONFIG.marshal;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t5 = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // Arms held at tactical ready position
    const armReady = -Math.PI / 3; // ~60 degrees — hands near belt

    return new THREE.AnimationClip('marshal_power_walk', dur, [
        // Root: minimal bob — disciplined, almost silent stride
        posTrack('root', t5, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: very upright, squared shoulders, minimal twist
        eulerTrack('spine', t5, [
            [lean, 0.03, 0], [lean, 0, 0], [lean, -0.03, 0],
            [lean, 0, 0], [lean, 0.03, 0]
        ]),
        // Head: scanning — deliberate controlled turns (threat assessment)
        eulerTrack('head', t5, [
            [0, 0.10, 0], [0, 0, 0], [0, -0.10, 0],
            [0, 0, 0], [0, 0.10, 0]
        ]),
        // Arms: held at tactical ready, tight controlled swing
        buildRotationTrack('upperArm_L', t5,
            [armReady - asw, armReady, armReady + asw, armReady, armReady - asw], AXIS_X),
        buildRotationTrack('upperArm_R', t5,
            [armReady + asw, armReady, armReady - asw, armReady, armReady + asw], AXIS_X),
        // Forearms: held at ~90° — ready stance, barely any play
        buildRotationTrack('forearm_L', t5, [-0.6, -0.58, -0.6, -0.58, -0.6], AXIS_X),
        buildRotationTrack('forearm_R', t5, [-0.58, -0.6, -0.58, -0.6, -0.58], AXIS_X),
        // Legs: compact, deliberate stride — trained tactical movement
        buildRotationTrack('upperLeg_L', t5, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t5, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: crisp, precise knee bend
        buildRotationTrack('lowerLeg_L', t5, [-0.06, -0.46, -0.08, -0.50, -0.06], AXIS_X),
        buildRotationTrack('lowerLeg_R', t5, [-0.08, -0.50, -0.06, -0.46, -0.08], AXIS_X),
    ]);
}

function _marshalBashR() {
    const c = ENEMY_VISUAL_CONFIG.marshal;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.7;

    // Tactical breach: shoulder-check → controlled pound × 2 → demand entry
    const t = [0, 0.16, 0.28, 0.38, 0.48, 0.58, dur];

    return new THREE.AnimationClip('marshal_bash_door_R', dur, [
        // Root: controlled step back, then shoulder drive
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.10 * s], [0, ry, 0.18 * s],
            [0, ry, 0.12 * s], [0, ry, 0.16 * s],
            [0, ry, 0.08 * s], [0, ry, 0]
        ]),
        // Spine: rotates to load right shoulder, drives forward
        eulerTrack('spine', t, [
            [-0.06, 0, 0], [-0.06, -0.22, 0], [-0.06, 0.18, -0.08],
            [-0.06, 0.10, -0.04], [-0.06, 0.16, -0.06],
            [-0.06, 0.06, 0], [-0.06, 0, 0]
        ]),
        // Right arm: drives forward into door — controlled force
        eulerTrack('upperArm_R', t, [
            [-1.05, 0, -0.06],    // ready position
            [-0.80, 0, 0.10],     // wind back
            [0.50, 0, -0.12],     // drive into door
            [0.30, 0, -0.08],     // hold
            [0.55, 0, -0.14],     // second drive
            [0.20, 0, -0.06],     // ease back
            [-1.05, 0, -0.06],    // return to ready
        ]),
        // Right forearm: extends on impact
        buildRotationTrack('forearm_R', t,
            [-0.6, -0.3, -1.0, -0.8, -1.1, -0.6, -0.6], AXIS_X),
        // Left arm: stays at ready — covering
        eulerTrack('upperArm_L', t, [
            [-1.05, 0, 0.06], [-1.05, 0, 0.08], [-1.00, 0, 0.10],
            [-1.02, 0, 0.08], [-1.00, 0, 0.10],
            [-1.02, 0, 0.08], [-1.05, 0, 0.06]
        ]),
        buildRotationTrack('forearm_L', t,
            [-0.6, -0.6, -0.62, -0.60, -0.62, -0.60, -0.6], AXIS_X),
        // Head: stays locked on target — no wavering
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, 0], [-0.04, 0, 0],
            [0, 0, 0], [-0.04, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Legs: firm tactical stance
        buildRotationTrack('upperLeg_L', t,
            [0, -0.10, 0.14, 0.08, 0.12, 0.04, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.10, 0.14, 0.08, 0.12, 0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0.06, -0.12, -0.08, -0.10, -0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.06, -0.12, -0.08, -0.10, -0.04, 0], AXIS_X),
    ]);
}

function _marshalBashL() {
    const c = ENEMY_VISUAL_CONFIG.marshal;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.7;

    const t = [0, 0.16, 0.28, 0.38, 0.48, 0.58, dur];

    return new THREE.AnimationClip('marshal_bash_door_L', dur, [
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.10 * s], [0, ry, 0.18 * s],
            [0, ry, 0.12 * s], [0, ry, 0.16 * s],
            [0, ry, 0.08 * s], [0, ry, 0]
        ]),
        // Spine: rotates to load LEFT shoulder (mirrored)
        eulerTrack('spine', t, [
            [-0.06, 0, 0], [-0.06, 0.22, 0], [-0.06, -0.18, 0.08],
            [-0.06, -0.10, 0.04], [-0.06, -0.16, 0.06],
            [-0.06, -0.06, 0], [-0.06, 0, 0]
        ]),
        // Left arm drives (mirrored)
        eulerTrack('upperArm_L', t, [
            [-1.05, 0, 0.06],
            [-0.80, 0, -0.10],
            [0.50, 0, 0.12],
            [0.30, 0, 0.08],
            [0.55, 0, 0.14],
            [0.20, 0, 0.06],
            [-1.05, 0, 0.06],
        ]),
        buildRotationTrack('forearm_L', t,
            [-0.6, -0.3, -1.0, -0.8, -1.1, -0.6, -0.6], AXIS_X),
        // Right arm stays at ready
        eulerTrack('upperArm_R', t, [
            [-1.05, 0, -0.06], [-1.05, 0, -0.08], [-1.00, 0, -0.10],
            [-1.02, 0, -0.08], [-1.00, 0, -0.10],
            [-1.02, 0, -0.08], [-1.05, 0, -0.06]
        ]),
        buildRotationTrack('forearm_R', t,
            [-0.6, -0.6, -0.62, -0.60, -0.62, -0.60, -0.6], AXIS_X),
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, 0], [-0.04, 0, 0],
            [0, 0, 0], [-0.04, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        buildRotationTrack('upperLeg_L', t,
            [0, -0.10, 0.14, 0.08, 0.12, 0.04, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.10, 0.14, 0.08, 0.12, 0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0.06, -0.12, -0.08, -0.10, -0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.06, -0.12, -0.08, -0.10, -0.04, 0], AXIS_X),
    ]);
}

function _marshalHitReact() {
    const dur = 0.3;
    const t = [0, 0.04, 0.12, dur];
    // Minimal reaction — trained to absorb hits. Unsettling resilience.
    return new THREE.AnimationClip('marshal_hit_react', dur, [
        posTrack('root', t, [[0, 0, 0], [0, 0, -0.04], [0, 0, -0.01], [0, 0, 0]]),
        buildRotationTrack('spine', t, [0, 0.03, 0.008, 0], AXIS_X),
    ]);
}

function _marshalDeath() {
    const c = ENEMY_VISUAL_CONFIG.marshal;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.6;
    const t = [0, 0.12, 0.28, 0.42, 0.55, dur];
    const armReady = -Math.PI / 3;

    return new THREE.AnimationClip('marshal_death', dur, [
        // Falls forward — controlled even in death, tries to catch themselves
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.06 * s], [0, ry * 0.68, 0.28 * s],
            [0, ry * 0.28, 0.52 * s], [0, ry * 0.06, 0.72 * s], [0, 0, 0.80 * s]
        ]),
        // Root tips forward — controlled fall
        buildRotationTrack('root', t, [0, -0.10, -0.48, -0.95, -1.35, -1.52], AXIS_X),
        // Spine: tries to stay straight (training), eventually crumples
        eulerTrack('spine', t, [
            [-0.06, 0, 0], [-0.10, 0, 0], [-0.18, 0, 0.04],
            [-0.30, 0, 0.06], [-0.38, 0, 0.04], [-0.42, 0, 0.02]
        ]),
        // Arms: reach forward to break fall (trained reflex)
        eulerTrack('upperArm_L', t, [
            [armReady, 0, 0.06], [armReady + 0.5, 0, -0.12], [armReady + 1.2, 0, -0.28],
            [armReady + 1.6, 0, -0.35], [armReady + 1.8, 0, -0.30], [armReady + 1.9, 0, -0.25]
        ]),
        eulerTrack('upperArm_R', t, [
            [armReady, 0, -0.06], [armReady + 0.4, 0, 0.10], [armReady + 1.0, 0, 0.25],
            [armReady + 1.5, 0, 0.32], [armReady + 1.7, 0, 0.28], [armReady + 1.8, 0, 0.22]
        ]),
        // Forearms: extend to break fall
        buildRotationTrack('forearm_L', t,
            [-0.6, -0.8, -1.2, -1.5, -1.6, -1.6], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [-0.6, -0.7, -1.1, -1.4, -1.5, -1.5], AXIS_X),
        // Head: stays forward (discipline) then drops
        eulerTrack('head', t, [
            [0, 0, 0], [0.04, 0, 0], [0.10, 0, 0],
            [0.18, 0, 0], [0.24, 0, 0], [0.28, 0, 0]
        ]),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// UNRULY PASSENGERS — chaotic small swarm, swaying, no arms
// Personality: rowdy, drunk, stumbling mobs, body-bash everything,
//   high bounce, wild sway, head-butting the door. Pure chaos.
// Bones: 9 (neck only, NO upperArms/forearms/feet/belly)
// ═══════════════════════════════════════════════════════════════════════

function _unrulyWalk() {
    const c = ENEMY_VISUAL_CONFIG.unruly;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const bodyRock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    return new THREE.AnimationClip('unruly_walk', dur, [
        // Root: HIGH bouncy bob + wild lateral sway — drunk stumble
        posTrack('root', t, [
            [0, ry, 0], [0.03 * s, ry + bob, 0], [0, ry, 0],
            [-0.03 * s, ry + bob, 0], [0, ry, 0]
        ]),
        // Root rock: massive swaying (no arms for balance!)
        eulerTrack('root', t, [
            [0, 0, -bodyRock], [0, 0.06, 0], [0, 0, bodyRock],
            [0, -0.06, 0], [0, 0, -bodyRock]
        ]),
        // Spine: forward lean + chaotic counter-sway
        eulerTrack('spine', t, [
            [lean, 0, bodyRock * 0.4], [lean - 0.04, 0, 0],
            [lean, 0, -bodyRock * 0.4], [lean - 0.04, 0, 0],
            [lean, 0, bodyRock * 0.4]
        ]),
        // Head: wild bobbing, looking everywhere — can't focus
        eulerTrack('head', t, [
            [0.08, 0.18, -bodyRock * 0.5], [-0.04, -0.12, 0],
            [0.06, -0.20, bodyRock * 0.5], [-0.04, 0.14, 0],
            [0.08, 0.18, -bodyRock * 0.5]
        ]),
        // No arm tracks — unruly has no arms!
        // Legs: short stumbling steps (tiny legs, big body sway)
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: barely bend (stumbling, not walking properly)
        buildRotationTrack('lowerLeg_L', t, [-0.06, -0.18, -0.06, -0.20, -0.06], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.06, -0.20, -0.06, -0.18, -0.06], AXIS_X),
    ]);
}

function _unrulyBash() {
    const c = ENEMY_VISUAL_CONFIG.unruly;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.6;

    // Body-slam / head-butt: no arms, so they THROW themselves at the door
    const t = [0, 0.12, 0.22, 0.32, 0.42, 0.52, dur];

    return new THREE.AnimationClip('unruly_bash_door', dur, [
        // Root: rock back, then HURL forward (body slam × 2)
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.04, -0.12 * s], [0, ry - 0.06, 0.20 * s],
            [0, ry, 0.08 * s], [0, ry - 0.04, 0.18 * s],
            [0, ry, 0.05 * s], [0, ry, 0]
        ]),
        // Root sway: wild lateral rock with each slam
        eulerTrack('root', t, [
            [0, 0, 0], [0, 0, 0.10], [0, 0, -0.14],
            [0, 0, 0.08], [0, 0, -0.12],
            [0, 0, 0.04], [0, 0, 0]
        ]),
        // Spine: arches back (wind-up) then SLAMS forward (head-butt)
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [0.18, 0, 0], [-0.42, 0, 0.06],
            [-0.18, 0, -0.04], [-0.38, 0, 0.05],
            [-0.14, 0, 0], [-0.10, 0, 0]
        ]),
        // Head: leads the charge — head-butt the door
        eulerTrack('head', t, [
            [0, 0, 0], [0.14, 0, 0], [-0.28, 0, 0.08],
            [0.08, 0, -0.04], [-0.24, 0, 0.06],
            [0.04, 0, 0], [0, 0, 0]
        ]),
        // Legs: brace and push off for each slam
        buildRotationTrack('upperLeg_L', t,
            [0, -0.10, 0.22, 0.10, 0.20, 0.06, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.10, 0.22, 0.10, 0.20, 0.06, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, 0.06, -0.18, -0.08, -0.16, -0.04, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.06, -0.18, -0.08, -0.16, -0.04, 0], AXIS_X),
    ]);
}

function _unrulyHitReact() {
    const dur = 0.25;
    const t = [0, 0.04, 0.10, 0.18, dur];
    return new THREE.AnimationClip('unruly_hit_react', dur, [
        // Wild stumble — already unsteady, so big reaction
        posTrack('root', t, [[0, 0, 0], [0, -0.05, -0.10], [0, -0.02, -0.04], [0, 0, -0.01], [0, 0, 0]]),
        // Body rocks sideways from impact
        eulerTrack('spine', t, [
            [0, 0, 0], [0.14, 0, 0.10], [0.05, 0, 0.04], [0.01, 0, 0.01], [0, 0, 0]
        ]),
        // Head snaps from impact
        eulerTrack('head', t, [
            [0, 0, 0], [0.10, -0.12, 0.08], [0.04, -0.04, 0.03], [0.01, -0.01, 0.01], [0, 0, 0]
        ]),
    ]);
}

function _unrulyDeath() {
    const c = ENEMY_VISUAL_CONFIG.unruly;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.5;
    const t = [0, 0.08, 0.18, 0.28, 0.40, dur];

    return new THREE.AnimationClip('unruly_death', dur, [
        // Topples sideways like a drunk falling off a barstool
        posTrack('root', t, [
            [0, ry, 0], [-0.04 * s, ry * 0.88, 0], [-0.14 * s, ry * 0.55, 0.02 * s],
            [-0.22 * s, ry * 0.22, 0.04 * s], [-0.26 * s, ry * 0.04, 0.05 * s],
            [-0.28 * s, 0, 0.05 * s]
        ]),
        // Root tilts sideways (topples like a bowling pin)
        buildRotationTrack('root', t, [0, 0.15, 0.50, 0.95, 1.35, 1.57], AXIS_Z),
        // Spine: curls forward during fall
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [-0.18, 0, 0.06], [-0.32, 0, 0.14],
            [-0.48, 0, 0.20], [-0.58, 0, 0.22], [-0.62, 0, 0.22]
        ]),
        // Head: flops loosely
        eulerTrack('head', t, [
            [0, 0, 0], [0.08, 0.10, -0.06], [0.04, 0.18, -0.14],
            [0, 0.14, -0.18], [-0.02, 0.10, -0.14], [-0.04, 0.08, -0.10]
        ]),
        // Legs: stiffen then go limp
        buildRotationTrack('upperLeg_L', t, [0, 0.10, 0.28, 0.42, 0.52, 0.55], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.08, 0.22, 0.38, 0.48, 0.50], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.08, -0.22, -0.38, -0.48, -0.50], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.06, -0.18, -0.32, -0.42, -0.44], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// CLIP REGISTRY & CACHE
// ═══════════════════════════════════════════════════════════════════════

const _clipBuilders = {
    polite_walk:        _politeWalk,
    polite_bash_door:    _politeBashR,    // default (backward compat for barriers)
    polite_bash_door_L:  _politeBashL,
    polite_bash_door_R:  _politeBashR,
    polite_hit_react:   _politeHitReact,
    polite_death:       _politeDeath,

    dancer_hop_walk:    _dancerHopWalk,
    dancer_bash_door:   _dancerBash,
    dancer_hit_react:   _dancerHitReact,
    dancer_death:       _dancerDeath,

    waddle_waddle:          _waddleWaddle,
    waddle_panic_sprint:    _waddlePanicSprint,
    waddle_bash_door:       _waddleBash,
    waddle_hit_react:       _waddleHitReact,
    waddle_death:           _waddleDeath,

    panicker_panic_run:     _panickerPanicRun,
    panicker_bash_door:     _panickerBash,
    panicker_hit_react:     _panickerHitReact,
    panicker_death:         _panickerDeath,

    powerwalker_power_walk: _powerwalkerPowerWalk,
    powerwalker_bash_door:  _powerwalkerBash,
    powerwalker_hit_react:  _powerwalkerHitReact,
    powerwalker_death:      _powerwalkerDeath,

    girls_walk_chat:    _girlsWalkChat,
    girls_bash_door:    _girlsBash,
    girls_hit_react:    _girlsHitReact,
    girls_death:        _girlsDeath,

    // Forest entries
    deer_walk:          _deerWalk,
    deer_bash_door:     _deerBash,
    deer_hit_react:     _deerHitReact,
    deer_death:         _deerDeath,

    squirrel_hop:           _squirrelHop,
    squirrel_bash_door:     _squirrelBash,
    squirrel_hit_react:     _squirrelHitReact,
    squirrel_death:         _squirrelDeath,

    bear_waddle:            _bearWaddle,
    bear_panic_sprint:      _bearPanicSprint,
    bear_bash_door:         _bearBash,
    bear_hit_react:         _bearHitReact,
    bear_death:             _bearDeath,

    fox_dart:               _foxDart,
    fox_bash_door:          _foxBash,
    fox_hit_react:          _foxHitReact,
    fox_death:              _foxDeath,

    moose_charge:           _mooseCharge,
    moose_bash_door:        _mooseBash,
    moose_hit_react:        _mooseHitReact,
    moose_death:            _mooseDeath,

    raccoon_waddle:         _raccoonWaddle,
    raccoon_bash_door:      _raccoonBash,
    raccoon_hit_react:      _raccoonHitReact,
    raccoon_death:          _raccoonDeath,

    // Ocean entries
    dolphin_walk:           _dolphinWalk,
    dolphin_bash_door:      _dolphinBash,
    dolphin_bash_door_L:    _dolphinBash,
    dolphin_bash_door_R:    _dolphinBash,
    dolphin_hit_react:      _dolphinHit,
    dolphin_death:          _dolphinDeath,

    flyfish_walk:           _flyfishWalk,
    flyfish_bash_door:      _flyfishBash,
    flyfish_bash_door_L:    _flyfishBash,
    flyfish_bash_door_R:    _flyfishBash,
    flyfish_hit_react:      _flyfishHit,
    flyfish_death:          _flyfishDeath,

    shark_walk:             _sharkWalk,
    shark_panic_sprint:     _sharkWalk,
    shark_bash_door:        _sharkBash,
    shark_bash_door_L:      _sharkBash,
    shark_bash_door_R:      _sharkBash,
    shark_hit_react:        _sharkHit,
    shark_death:            _sharkDeath,

    pirate_walk:            _pirateWalk,
    pirate_bash_door:       _pirateBash,
    pirate_bash_door_L:     _pirateBash,
    pirate_bash_door_R:     _pirateBash,
    pirate_hit_react:       _pirateHit,
    pirate_death:           _pirateDeath,

    seaturtle_walk:         _seaturtleWalk,
    seaturtle_bash_door:    _seaturtleBash,
    seaturtle_bash_door_L:  _seaturtleBash,
    seaturtle_bash_door_R:  _seaturtleBash,
    seaturtle_hit_react:    _seaturtleHit,
    seaturtle_death:        _seaturtleDeath,

    jellyfish_walk:         _jellyfishWalk,
    jellyfish_bash_door:    _jellyfishBash,
    jellyfish_bash_door_L:  _jellyfishBash,
    jellyfish_bash_door_R:  _jellyfishBash,
    jellyfish_hit_react:    _jellyfishHit,
    jellyfish_death:        _jellyfishDeath,

    // Airplane entries
    nervous_walk:           _nervousWalk,
    nervous_bash_door:      _nervousBashR,
    nervous_bash_door_L:    _nervousBashL,
    nervous_bash_door_R:    _nervousBashR,
    nervous_hit_react:      _nervousHitReact,
    nervous_death:          _nervousDeath,

    business_walk:          _businessWalk,
    business_bash_door:     _businessBashR,
    business_bash_door_L:   _businessBashL,
    business_bash_door_R:   _businessBashR,
    business_hit_react:     _businessHitReact,
    business_death:         _businessDeath,

    stumbler_waddle:        _stumblerWaddle,
    stumbler_bash_door:     _stumblerBash,
    stumbler_bash_door_L:   _stumblerBash,
    stumbler_bash_door_R:   _stumblerBash,
    stumbler_hit_react:     _stumblerHitReact,
    stumbler_death:         _stumblerDeath,

    attendant_walk:         _attendantWalk,
    attendant_bash_door:    _attendantBashR,
    attendant_bash_door_L:  _attendantBashL,
    attendant_bash_door_R:  _attendantBashR,
    attendant_hit_react:    _attendantHitReact,
    attendant_death:        _attendantDeath,

    marshal_power_walk:     _marshalPowerWalk,
    marshal_bash_door:      _marshalBashR,
    marshal_bash_door_L:    _marshalBashL,
    marshal_bash_door_R:    _marshalBashR,
    marshal_hit_react:      _marshalHitReact,
    marshal_death:          _marshalDeath,

    unruly_walk:            _unrulyWalk,
    unruly_bash_door:       _unrulyBash,
    unruly_hit_react:       _unrulyHitReact,
    unruly_death:           _unrulyDeath,
};

const _clipCache = new Map();

/**
 * Get a shared AnimationClip for the given enemy type and state.
 * Clips are built lazily on first request and cached.
 *
 * @param {string} enemyType - Key into ENEMY_VISUAL_CONFIG
 * @param {string} stateName - Animation state name (walk, bash_door, hit_react, death, etc.)
 * @returns {THREE.AnimationClip}
 */
export function getAnimationClip(enemyType, stateName) {
    const key = `${enemyType}_${stateName}`;

    let clip = _clipCache.get(key);
    if (clip) return clip;

    const builder = _clipBuilders[key];
    if (!builder) {
        throw new Error(`AnimationLibrary: no clip for "${key}"`);
    }

    clip = builder();
    _clipCache.set(key, clip);
    return clip;
}

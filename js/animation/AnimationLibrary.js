// AnimationLibrary.js — AAA keyframe clips for 12 enemy types (6 office + 6 forest)
// 50 clips: walk/bash/hit/death per type + waddle/bear panic_sprint
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
// DEER — gentle, cautious, head-bobbing stride like a real deer
// Personality: graceful, alert, neck extends forward curiously, big ears twitch
// ═══════════════════════════════════════════════════════════════════════

function _deerWalk() {
    const c = ENEMY_VISUAL_CONFIG.deer;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const lean = -c.animationParams.spineForwardLean;
    const neckBob = c.animationParams.neckBob;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.25, 0.5, 0.75, dur];

    // Deer have subtle lateral sway — weight shifts gently side to side
    const sway = 0.03;
    // Spine counter-twist for natural four-legged feel
    const twist = 0.06;

    return new THREE.AnimationClip('deer_walk', dur, [
        // Root: gentle bob — deer walk is smooth, hooves barely lift
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: slight forward lean + gentle counter-twist + sway
        eulerTrack('spine', t, [
            [lean, twist, sway], [lean, 0, 0], [lean, -twist, -sway],
            [lean, 0, 0], [lean, twist, sway]
        ]),
        // Chest: delayed follow-through on sway (secondary motion)
        eulerTrack('chest', t, [
            [0, 0, 0], [0, 0, -sway * 0.4], [0, 0, 0],
            [0, 0, sway * 0.4], [0, 0, 0]
        ]),
        // Neck: extends forward on each step, curious bobbing motion
        eulerTrack('neck', t, [
            [neckBob, 0, 0], [-neckBob * 0.5, 0, 0], [neckBob, 0, 0],
            [-neckBob * 0.5, 0, 0], [neckBob, 0, 0]
        ]),
        // Head: counter-bobs to stabilize gaze, slight alert ear-twitching turns
        eulerTrack('head', t, [
            [-neckBob * 0.6, -0.06, 0], [neckBob * 0.3, 0.04, 0],
            [-neckBob * 0.6, 0.06, 0], [neckBob * 0.3, -0.04, 0],
            [-neckBob * 0.6, -0.06, 0]
        ]),
        // Arms (front legs): graceful forward swing — dainty, precise
        buildRotationTrack('upperArm_L', t, [asw, 0, -asw, 0, asw], AXIS_X),
        buildRotationTrack('upperArm_R', t, [-asw, 0, asw, 0, -asw], AXIS_X),
        // Legs: longer graceful stride — elegant deer gait
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: springy flex during swing — nimble hooves
        buildRotationTrack('lowerLeg_L', t, [-0.08, -0.50, -0.12, -0.55, -0.08], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.12, -0.55, -0.08, -0.50, -0.12], AXIS_X),
    ]);
}

function _deerBash() {
    const c = ENEMY_VISUAL_CONFIG.deer;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;

    // Wind-up: lower head → charge forward → antler impact → pull back
    const t = [0, 0.15, 0.28, 0.38, 0.50, 0.65, dur];

    return new THREE.AnimationClip('deer_bash_door', dur, [
        // Root: steps back slightly, then lunges forward into door
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.03, -0.06 * s], [0, ry - 0.04, 0.18 * s],
            [0, ry - 0.06, 0.14 * s], [0, ry - 0.02, 0.06 * s],
            [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Spine: arches back (loading), then drives forward (charge)
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [0.08, 0, 0], [-0.35, 0, 0],
            [-0.28, 0, 0], [-0.16, 0, 0],
            [-0.10, 0, 0], [-0.10, 0, 0]
        ]),
        // Neck: extends way forward on impact — antlers leading
        eulerTrack('neck', t, [
            [0, 0, 0], [0.15, 0, 0], [-0.30, 0, 0],
            [-0.20, 0, 0], [-0.08, 0, 0],
            [0.02, 0, 0], [0, 0, 0]
        ]),
        // Head: dips down then snaps up on impact recoil
        eulerTrack('head', t, [
            [0, 0, 0], [0.10, 0, 0], [-0.20, 0, 0],
            [0.12, 0, 0.06], [0.04, 0, -0.03],
            [0, 0, 0], [0, 0, 0]
        ]),
        // Arms (front legs): brace forward on impact
        buildRotationTrack('upperArm_L', t,
            [0, 0.15, -0.20, -0.14, -0.06, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [0, 0.15, -0.20, -0.14, -0.06, 0, 0], AXIS_X),
        // Legs: push off for charge
        buildRotationTrack('upperLeg_L', t,
            [0, -0.12, 0.22, 0.16, 0.08, 0.02, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.12, 0.22, 0.16, 0.08, 0.02, 0], AXIS_X),
        // Lower legs: absorb impact
        buildRotationTrack('lowerLeg_L', t,
            [0, 0.04, -0.18, -0.12, -0.06, -0.02, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, 0.04, -0.18, -0.12, -0.06, -0.02, 0], AXIS_X),
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
        // Spine recoils backward
        eulerTrack('spine', t, [
            [0, 0, 0], [0.14, 0, 0.03], [0.05, 0, 0.01], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Neck snaps back — startled reflex
        eulerTrack('neck', t, [
            [0, 0, 0], [0.18, 0, 0], [0.06, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Head jerks back and to the side — classic deer startle
        eulerTrack('head', t, [
            [0, 0, 0], [0.16, -0.12, 0], [0.05, -0.04, 0], [0.01, -0.01, 0], [0, 0, 0]
        ]),
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
        // Spine curls forward protectively
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [-0.22, 0, 0.04], [-0.45, 0, 0.10],
            [-0.68, 0, 0.14], [-0.85, 0, 0.16], [-0.92, 0, 0.14], [-0.95, 0, 0.12]
        ]),
        // Neck curls in — tucking head
        eulerTrack('neck', t, [
            [0, 0, 0], [-0.10, 0, 0], [-0.25, 0, 0],
            [-0.38, 0, 0], [-0.42, 0, 0], [-0.44, 0, 0], [-0.45, 0, 0]
        ]),
        // Head rolls to side
        eulerTrack('head', t, [
            [0, 0, 0], [-0.06, 0.08, 0], [-0.12, 0.16, 0.10],
            [-0.08, 0.12, 0.18], [-0.04, 0.08, 0.14], [-0.02, 0.04, 0.10], [0, 0, 0.08]
        ]),
        // Legs buckle — knees fold
        buildRotationTrack('upperLeg_L', t, [0, 0.25, 0.55, 0.80, 0.95, 1.05, 1.10], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.18, 0.42, 0.68, 0.85, 0.95, 1.00], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.20, -0.55, -0.90, -1.20, -1.40, -1.50], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.15, -0.45, -0.78, -1.10, -1.30, -1.40], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// SQUIRREL — hyperactive, bouncy, twitchy, explosive energy
// Personality: tiny acorn hoarder, springs everywhere, cannot sit still
// ═══════════════════════════════════════════════════════════════════════

function _squirrelHop() {
    const c = ENEMY_VISUAL_CONFIG.squirrel;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const rock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    // Very fast cycle — 5 keyframes crammed into 0.35s
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    return new THREE.AnimationClip('squirrel_hop', dur, [
        // Root: BIG bouncy hops — launches high, slams down
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0],
            [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Extreme squash and stretch — cartoon energy
        scaleTrack('root', t, [
            [1.18, 0.75, 1.18], [0.82, 1.25, 0.82], [1.18, 0.75, 1.18],
            [0.82, 1.25, 0.82], [1.18, 0.75, 1.18]
        ]),
        // Spine: hunched forward, twitchy side-to-side rock
        eulerTrack('spine', t, [
            [lean, 0, -rock], [lean + 0.06, 0, 0], [lean, 0, rock],
            [lean + 0.06, 0, 0], [lean, 0, -rock]
        ]),
        // Chest: nervous counter-rock
        eulerTrack('chest', t, [
            [0, 0, rock * 0.5], [0, 0, 0], [0, 0, -rock * 0.5],
            [0, 0, 0], [0, 0, rock * 0.5]
        ]),
        // Neck: twitchy darting — squirrels constantly scan for danger
        eulerTrack('neck', t, [
            [0.06, 0.10, 0], [-0.04, -0.12, 0], [0.06, -0.08, 0],
            [-0.04, 0.14, 0], [0.06, 0.10, 0]
        ]),
        // Head: rapid twitchy scanning, big eyes darting
        eulerTrack('head', t, [
            [0.08, -0.15, rock * 0.3], [-0.06, 0.18, 0],
            [0.08, 0.12, -rock * 0.3], [-0.06, -0.16, 0],
            [0.08, -0.15, rock * 0.3]
        ]),
        // Legs: spring-loaded hops — both legs in sync (bunny hop style)
        buildRotationTrack('upperLeg_L', t, [lsw, -lsw * 0.8, lsw, -lsw * 0.8, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [lsw, -lsw * 0.8, lsw, -lsw * 0.8, lsw], AXIS_X),
        // Lower legs: deep spring flex on landing
        buildRotationTrack('lowerLeg_L', t, [-0.35, -0.10, -0.35, -0.10, -0.35], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.35, -0.10, -0.35, -0.10, -0.35], AXIS_X),
    ]);
}

function _squirrelBash() {
    const c = ENEMY_VISUAL_CONFIG.squirrel;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.5;

    // Frantic scratching/clawing — rapid body slams, chaotic energy
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
        // Spine: twisting frantically with each slam
        eulerTrack('spine', t, [
            [-0.15, 0, 0], [-0.35, 0.12, 0.08], [-0.10, -0.10, -0.06],
            [-0.38, -0.14, 0.06], [-0.08, 0.12, -0.08],
            [-0.40, 0.10, 0.10], [-0.15, -0.08, -0.04], [-0.15, 0, 0]
        ]),
        // Head: darting around between slams, manic energy
        eulerTrack('head', t, [
            [0, 0, 0], [0.12, 0.20, 0], [-0.06, -0.22, 0],
            [0.14, -0.18, 0.08], [-0.04, 0.24, -0.06],
            [0.10, 0.16, 0], [-0.08, -0.14, 0.04], [0, 0, 0]
        ]),
        // Legs: stomping and scratching frenzy
        buildRotationTrack('upperLeg_L', t,
            [0, 0.28, -0.10, 0.32, -0.08, 0.30, 0.12, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.10, 0.30, -0.08, 0.28, -0.06, 0.26, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.30, -0.12, -0.35, -0.10, -0.32, -0.15, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, -0.12, -0.32, -0.10, -0.30, -0.08, -0.28, 0], AXIS_X),
    ]);
}

function _squirrelHitReact() {
    const dur = 0.2;
    const t = [0, 0.03, 0.08, 0.14, dur];
    return new THREE.AnimationClip('squirrel_hit_react', dur, [
        // Jumps backward startled — springs into the air
        posTrack('root', t, [
            [0, 0, 0], [0, 0.10, -0.14], [0, 0.04, -0.08], [0, 0.01, -0.03], [0, 0, 0]
        ]),
        // Brief freeze-up (spine locks stiff)
        eulerTrack('spine', t, [
            [0, 0, 0], [0.22, 0, 0], [0.10, 0, 0], [0.03, 0, 0], [0, 0, 0]
        ]),
        // Stretch on jump
        scaleTrack('root', t, [
            [1, 1, 1], [0.80, 1.25, 0.80], [0.92, 1.10, 0.92], [0.98, 1.02, 0.98], [1, 1, 1]
        ]),
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
        // Spine curls into tight ball
        eulerTrack('spine', t, [
            [-0.20, 0, 0], [-0.50, 0, 0], [-0.90, 0, 0.10],
            [-1.20, 0, 0.06], [-1.40, 0, 0.03], [-1.50, 0, 0]
        ]),
        // Squashes flat on landing
        scaleTrack('root', t, [
            [1, 1, 1], [0.85, 1.20, 0.85], [0.90, 1.12, 0.90],
            [1.20, 0.70, 1.20], [1.15, 0.75, 1.15], [1.10, 0.80, 1.10]
        ]),
        // Legs tuck in
        buildRotationTrack('upperLeg_L', t, [0, 0.40, 0.70, 0.90, 1.00, 1.05], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.35, 0.60, 0.80, 0.90, 0.95], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.45, -0.80, -1.10, -1.30, -1.40], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.40, -0.70, -1.00, -1.20, -1.30], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// BEAR — heavy, lumbering, earth-shaking, unstoppable mass
// Personality: massive, slow, belly-first, shakes the ground with each step
// ═══════════════════════════════════════════════════════════════════════

function _bearWaddle() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const bodyRock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const dur = c.animationParams.walkDuration;
    const lean = -c.animationParams.spineForwardLean;
    const t = [0, 0.375, 0.75, 1.125, dur];

    // Belly follow-through with massive overshoot
    const bellyRock = bodyRock * c.animationParams.bellyOvershoot;

    return new THREE.AnimationClip('bear_waddle', dur, [
        // Root: MASSIVE lateral rock — heavy bear sway, barely lifts
        eulerTrack('root', t, [
            [0, 0, -bodyRock], [0, 0, 0], [0, 0, bodyRock],
            [0, 0, 0], [0, 0, -bodyRock]
        ]),
        // Root bob: heavy body barely lifts off ground
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: deep forward hunch + counter-sway for weight balance
        eulerTrack('spine', t, [
            [lean, 0, bodyRock * 0.6], [lean, 0, 0],
            [lean, 0, -bodyRock * 0.6], [lean, 0, 0], [lean, 0, bodyRock * 0.6]
        ]),
        // Belly: secondary jiggle — follows body rock with phase delay + overshoot
        eulerTrack('belly', t, [
            [0.06, 0, 0], [0.06, 0, bellyRock], [0.06, 0, 0],
            [0.06, 0, -bellyRock], [0.06, 0, 0]
        ]),
        // Belly jiggle on each heavy step (scale bounce)
        scaleTrack('belly', t, [
            [1, 1, 1], [1.10, 0.92, 1.12], [1, 1, 1], [1.10, 0.92, 1.12], [1, 1, 1]
        ]),
        // Head: counter-rocks opposite to body, slight sniffing bob
        eulerTrack('head', t, [
            [-0.06, 0, bodyRock * 0.7], [-0.02, 0, 0], [-0.06, 0, -bodyRock * 0.7],
            [-0.02, 0, 0], [-0.06, 0, bodyRock * 0.7]
        ]),
        // Arms: wide heavy swing — big meaty paws sway with momentum
        eulerTrack('upperArm_L', t, [
            [-asw, 0, -0.30], [0, 0, -0.30], [asw, 0, -0.30],
            [0, 0, -0.30], [-asw, 0, -0.30]
        ]),
        eulerTrack('upperArm_R', t, [
            [asw, 0, 0.30], [0, 0, 0.30], [-asw, 0, 0.30],
            [0, 0, 0.30], [asw, 0, 0.30]
        ]),
        // Forearms: slight lag follow-through — heavy limbs
        buildRotationTrack('forearm_L', t, [0.08, -0.14, 0.08, -0.14, 0.08], AXIS_X),
        buildRotationTrack('forearm_R', t, [-0.14, 0.08, -0.14, 0.08, -0.14], AXIS_X),
        // Legs: wide short steps — ponderous heavy gait
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: barely bend (heavy, stiff — massive weight)
        buildRotationTrack('lowerLeg_L', t, [-0.06, -0.20, -0.06, -0.24, -0.06], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.06, -0.24, -0.06, -0.20, -0.06], AXIS_X),
        // Feet: flat-footed planting — no finesse, just massive slams
        buildRotationTrack('foot_L', t, [-0.10, 0.06, -0.10, 0, -0.10], AXIS_X),
        buildRotationTrack('foot_R', t, [-0.10, 0, -0.10, 0.06, -0.10], AXIS_X),
    ]);
}

function _bearPanicSprint() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.8;
    const t = [0, 0.2, 0.4, 0.6, dur];

    return new THREE.AnimationClip('bear_panic_sprint', dur, [
        // Root: faster bob, lower stance — drops toward all fours
        posTrack('root', t, [
            [0, ry * 0.82, 0], [0, ry * 0.82 + 0.06, 0],
            [0, ry * 0.82, 0], [0, ry * 0.82 + 0.06, 0], [0, ry * 0.82, 0]
        ]),
        // Body rocks more violently in desperate charge
        eulerTrack('root', t, [
            [0, 0, -0.16], [0, 0, 0], [0, 0, 0.16], [0, 0, 0], [0, 0, -0.16]
        ]),
        // Spine: WAY forward — almost on all fours, desperate lurch
        eulerTrack('spine', t, [
            [-0.42, 0, 0.12], [-0.36, 0, 0], [-0.42, 0, -0.12],
            [-0.36, 0, 0], [-0.42, 0, 0.12]
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
        // Arms: reaching forward — almost galloping, paws stretching out
        buildRotationTrack('upperArm_L', t, [0.80, -0.40, 0.80, -0.40, 0.80], AXIS_X),
        buildRotationTrack('upperArm_R', t, [-0.40, 0.80, -0.40, 0.80, -0.40], AXIS_X),
        // Forearms: reaching and pulling motion
        buildRotationTrack('forearm_L', t, [-0.50, 0.30, -0.50, 0.30, -0.50], AXIS_X),
        buildRotationTrack('forearm_R', t, [0.30, -0.50, 0.30, -0.50, 0.30], AXIS_X),
        // Legs: desperate longer stride — heavy but fast
        buildRotationTrack('upperLeg_L', t, [0.75, 0, -0.75, 0, 0.75], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-0.75, 0, 0.75, 0, -0.75], AXIS_X),
        // Lower legs: deeper flex — bounding gait
        buildRotationTrack('lowerLeg_L', t, [-0.10, -0.55, -0.12, -0.60, -0.10], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.12, -0.60, -0.10, -0.55, -0.12], AXIS_X),
        // Feet: heavy stomping
        buildRotationTrack('foot_L', t, [-0.20, 0.10, -0.20, 0.06, -0.20], AXIS_X),
        buildRotationTrack('foot_R', t, [-0.20, 0.06, -0.20, 0.10, -0.20], AXIS_X),
        // Head: low and forward, slight side-to-side scanning
        eulerTrack('head', t, [
            [-0.12, 0.14, 0], [-0.06, -0.10, 0], [-0.12, -0.14, 0],
            [-0.06, 0.10, 0], [-0.12, 0.14, 0]
        ]),
    ]);
}

function _bearBash() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;

    // Rears up → slams both forearms down → belly impact cascade → settle
    const t = [0, 0.25, 0.40, 0.50, 0.60, 0.72, 0.86, dur];

    return new THREE.AnimationClip('bear_bash_door', dur, [
        // Root: rises up (rear), then CRASHES forward and down
        posTrack('root', t, [
            [0, ry, 0], [0, ry + 0.12 * s, -0.08 * s], [0, ry - 0.08, 0.28 * s],
            [0, ry - 0.12, 0.22 * s], [0, ry - 0.06, 0.12 * s],
            [0, ry - 0.02, 0.06 * s], [0, ry, 0.02 * s], [0, ry, 0]
        ]),
        // Spine: arches back to rear up, then drives down hard
        eulerTrack('spine', t, [
            [-0.12, 0, 0], [0.25, 0, 0], [-0.55, 0, 0],
            [-0.45, 0, 0.06], [-0.30, 0, -0.04],
            [-0.18, 0, 0.02], [-0.12, 0, 0], [-0.12, 0, 0]
        ]),
        // Belly: compresses on rear, EXPLODES on slam, multi-bounce settle
        scaleTrack('belly', t, [
            [1, 1, 1], [0.85, 1.08, 0.82], [1.40, 0.72, 1.48],
            [0.84, 1.18, 0.78], [1.16, 0.88, 1.20],
            [0.92, 1.05, 0.90], [1.04, 0.98, 1.03], [1, 1, 1]
        ]),
        // Belly rotation with overshoot
        eulerTrack('belly', t, [
            [0, 0, 0], [-0.14, 0, 0], [0.32, 0, 0],
            [-0.16, 0, 0], [0.10, 0, 0],
            [-0.05, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Arms: reach up high for rear, then slam down together
        eulerTrack('upperArm_L', t, [
            [0, 0, -0.25], [-1.8, 0, -0.40], [0.5, 0, -0.15],
            [0.3, 0, -0.20], [0.1, 0, -0.25], [0, 0, -0.25],
            [0, 0, -0.25], [0, 0, -0.25]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0.25], [-1.8, 0, 0.40], [0.5, 0, 0.15],
            [0.3, 0, 0.20], [0.1, 0, 0.25], [0, 0, 0.25],
            [0, 0, 0.25], [0, 0, 0.25]
        ]),
        // Forearms: flail forward on impact — massive paws
        buildRotationTrack('forearm_L', t,
            [0, 0.4, -0.9, -0.5, -0.2, -0.08, 0, 0], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0, 0.4, -0.9, -0.5, -0.2, -0.08, 0, 0], AXIS_X),
        // Head: looks up during rear, slams down on impact
        eulerTrack('head', t, [
            [0, 0, 0], [0.18, 0, 0], [-0.25, 0, 0.06],
            [0.12, 0, -0.04], [-0.06, 0, 0.02],
            [0.03, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Legs: brace for the massive slam
        buildRotationTrack('upperLeg_L', t,
            [0, -0.20, 0.30, 0.22, 0.14, 0.06, 0.02, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.20, 0.30, 0.22, 0.14, 0.06, 0.02, 0], AXIS_X),
        // Feet: plant hard for stability
        buildRotationTrack('foot_L', t,
            [0, 0.14, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
        buildRotationTrack('foot_R', t,
            [0, 0.14, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
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
        // Spine barely moves — just a tiny grunt-flex
        buildRotationTrack('spine', t, [0, 0.03, 0.01, 0.003, 0], AXIS_X),
    ]);
}

function _bearDeath() {
    const c = ENEMY_VISUAL_CONFIG.bear;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;
    const t = [0, 0.12, 0.26, 0.42, 0.56, 0.70, dur];

    return new THREE.AnimationClip('bear_death', dur, [
        // Slow, inevitable topple forward — tries to stay upright, then timber!
        posTrack('root', t, [
            [0, ry, 0], [0, ry * 0.95, 0.04 * s], [0, ry * 0.82, 0.12 * s],
            [0, ry * 0.55, 0.28 * s], [0, ry * 0.22, 0.52 * s],
            [0, ry * 0.06, 0.72 * s], [0, 0, 0.82 * s]
        ]),
        // Root tips forward — timber fall, massive frame
        buildRotationTrack('root', t, [0, -0.10, -0.30, -0.65, -1.05, -1.38, -1.57], AXIS_X),
        // Spine: sways trying to balance, then gives up
        eulerTrack('spine', t, [
            [-0.12, 0, 0], [-0.08, 0, 0.06], [-0.20, 0, -0.08],
            [-0.35, 0, 0.10], [-0.48, 0, 0.06], [-0.55, 0, 0.03], [-0.58, 0, 0]
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
        // Arms: reach out trying to catch self, then go limp
        eulerTrack('upperArm_L', t, [
            [0, 0, -0.25], [0.15, 0, -0.35], [0.35, 0, -0.50],
            [0.25, 0, -0.58], [0.10, 0, -0.42], [0, 0, -0.32], [-0.10, 0, -0.25]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0.25], [0.20, 0, 0.38], [0.45, 0, 0.55],
            [0.30, 0, 0.62], [0.12, 0, 0.48], [0, 0, 0.35], [-0.10, 0, 0.25]
        ]),
        // Head: tries to look up, then droops
        eulerTrack('head', t, [
            [0, 0, 0], [0.10, 0, 0], [0.18, 0, 0.06],
            [0.08, 0, 0.10], [-0.04, 0, 0.08], [-0.08, 0, 0.04], [-0.10, 0, 0]
        ]),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// FOX — darting, nervous, quick direction changes, sly trot
// Personality: cunning, low crouch, head darts side to side, fast and erratic
// ═══════════════════════════════════════════════════════════════════════

function _foxDart() {
    const c = ENEMY_VISUAL_CONFIG.fox;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const spineTwist = c.animationParams.spineTwist;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.125, 0.25, 0.375, dur];

    // Left arm at different frequency for asymmetric darting feel (like panicker)
    const tArmL = [0, 0.083, 0.167, 0.250, 0.333, 0.417, dur];

    return new THREE.AnimationClip('fox_dart', dur, [
        // Root: low crouching bob with lateral jitter — nervous energy
        posTrack('root', t, [
            [0.02 * s, ry - 0.04, 0], [-0.02 * s, ry - 0.04 + bob, 0],
            [0.02 * s, ry - 0.04, 0], [-0.02 * s, ry - 0.04 + bob, 0],
            [0.02 * s, ry - 0.04, 0]
        ]),
        // Spine: crouched forward + twist with stride — slinky fox motion
        eulerTrack('spine', t, [
            [lean - 0.08, spineTwist, 0.03], [lean - 0.04, 0, -0.04],
            [lean - 0.08, -spineTwist, 0.05], [lean - 0.04, 0, -0.03],
            [lean - 0.08, spineTwist, 0.03]
        ]),
        // Chest: counter-twist — slinky predator motion
        eulerTrack('chest', t, [
            [0, -spineTwist * 0.4, 0], [0, 0, 0],
            [0, spineTwist * 0.4, 0], [0, 0, 0], [0, -spineTwist * 0.4, 0]
        ]),
        // Neck: low and forward — hunting posture
        eulerTrack('neck', t, [
            [-0.08, 0, 0], [-0.04, 0, 0], [-0.08, 0, 0],
            [-0.04, 0, 0], [-0.08, 0, 0]
        ]),
        // Head: darts side to side nervously — quick scanning
        eulerTrack('head', t, [
            [0.04, 0.22, 0.05], [-0.03, -0.16, -0.04],
            [0.06, -0.25, 0.06], [-0.03, 0.18, -0.05],
            [0.04, 0.22, 0.05]
        ]),
        // Left arm: erratic pumping at faster frequency (asymmetric)
        eulerTrack('upperArm_L', tArmL, [
            [-0.65, 0, 0.12], [0.45, 0, -0.08], [-0.55, 0, 0.14],
            [0.50, 0, -0.10], [-0.60, 0, 0.10],
            [0.48, 0, -0.06], [-0.65, 0, 0.12]
        ]),
        // Right arm: normal frequency, controlled pumping
        eulerTrack('upperArm_R', t, [
            [0.55, 0, -0.12], [-0.50, 0, 0.10],
            [0.60, 0, -0.14], [-0.45, 0, 0.08], [0.55, 0, -0.12]
        ]),
        // Forearms: quick flex follow-through
        buildRotationTrack('forearm_L', tArmL,
            [-0.30, 0.25, -0.35, 0.22, -0.28, 0.20, -0.30], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0.28, -0.25, 0.30, -0.22, 0.28], AXIS_X),
        // Legs: fast nervous trot — longer stride, quick recovery
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw * 0.85, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw * 0.85, 0, lsw, 0, -lsw * 0.85], AXIS_X),
        // Lower legs: deep flex during swing — nimble paws
        buildRotationTrack('lowerLeg_L', t, [-0.10, -0.65, -0.14, -0.70, -0.10], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.14, -0.70, -0.10, -0.65, -0.14], AXIS_X),
    ]);
}

function _foxBash() {
    const c = ENEMY_VISUAL_CONFIG.fox;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;

    // Quick lunging bites/strikes at door — rapid head-forward snaps
    const t = [0, 0.08, 0.16, 0.24, 0.34, 0.44, 0.52, dur];

    return new THREE.AnimationClip('fox_bash_door', dur, [
        // Root: quick lunges forward — strike, pull back, strike again
        posTrack('root', t, [
            [0, ry, 0], [0, ry, 0.10 * s], [0, ry, 0.02 * s],
            [0, ry, 0.12 * s], [0, ry, 0.02 * s],
            [0, ry, 0.14 * s], [0, ry, 0.04 * s], [0, ry, 0]
        ]),
        // Spine: snaps forward on each lunge, recoils between
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [-0.32, 0.08, 0], [-0.10, -0.05, 0],
            [-0.35, -0.10, 0], [-0.10, 0.06, 0],
            [-0.38, 0.06, 0], [-0.14, -0.04, 0], [-0.10, 0, 0]
        ]),
        // Neck: extends far forward on each bite/snap
        eulerTrack('neck', t, [
            [0, 0, 0], [-0.25, 0, 0], [0.05, 0, 0],
            [-0.28, 0, 0], [0.06, 0, 0],
            [-0.30, 0, 0], [0.04, 0, 0], [0, 0, 0]
        ]),
        // Head: snapping bites — jaw clamps down with each strike
        eulerTrack('head', t, [
            [0, 0, 0], [-0.18, 0, 0], [0.10, 0.08, 0],
            [-0.20, -0.10, 0], [0.08, 0.06, 0],
            [-0.22, 0, 0.05], [0.06, -0.06, -0.03], [0, 0, 0]
        ]),
        // Arms (front paws): scratch at door between bites
        buildRotationTrack('upperArm_L', t,
            [0, -0.30, 0.10, -0.35, 0.08, -0.32, 0.06, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [0, 0.10, -0.32, 0.08, -0.30, 0.06, -0.28, 0], AXIS_X),
        // Forearms: scratching motion
        buildRotationTrack('forearm_L', t,
            [0, -0.50, 0.15, -0.55, 0.12, -0.48, 0.10, 0], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0, 0.15, -0.52, 0.10, -0.50, 0.12, -0.45, 0], AXIS_X),
        // Legs: shift weight forward on each lunge
        buildRotationTrack('upperLeg_L', t,
            [0, 0.10, 0, 0.12, 0, 0.14, 0.04, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, 0.12, 0, 0.10, 0, 0.16, 0.04, 0], AXIS_X),
    ]);
}

function _foxHitReact() {
    const dur = 0.25;
    const t = [0, 0.03, 0.10, 0.18, dur];
    return new THREE.AnimationClip('fox_hit_react', dur, [
        // Yelp pose — jerks back, body cringes low
        posTrack('root', t, [
            [0, 0, 0], [0, -0.04, -0.12], [0, -0.02, -0.06], [0, -0.005, -0.02], [0, 0, 0]
        ]),
        // Spine cringes — curls protectively
        eulerTrack('spine', t, [
            [0, 0, 0], [0.20, 0, 0.06], [0.08, 0, 0.02], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Neck tucks in
        eulerTrack('neck', t, [
            [0, 0, 0], [0.15, 0, 0], [0.05, 0, 0], [0.01, 0, 0], [0, 0, 0]
        ]),
        // Head jerks back — yelp!
        eulerTrack('head', t, [
            [0, 0, 0], [0.12, -0.14, 0], [0.04, -0.05, 0], [0.01, -0.01, 0], [0, 0, 0]
        ]),
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
        // Spine twists with the spin
        eulerTrack('spine', t, [
            [-0.10, 0, 0], [-0.25, 0.12, 0.08], [-0.50, -0.10, 0.14],
            [-0.78, 0.08, 0.18], [-0.92, 0.04, 0.12], [-0.98, 0, 0.08]
        ]),
        // Neck: goes limp during fall
        eulerTrack('neck', t, [
            [0, 0, 0], [-0.10, 0.06, 0], [-0.22, 0.12, 0.08],
            [-0.16, 0.08, 0.12], [-0.08, 0.04, 0.08], [-0.04, 0.02, 0.05]
        ]),
        // Head: rolls with momentum
        eulerTrack('head', t, [
            [0, 0, 0], [-0.08, 0.14, 0.06], [-0.14, -0.10, 0.14],
            [-0.06, 0.08, 0.18], [-0.02, 0.04, 0.12], [0, 0.02, 0.08]
        ]),
        // Legs buckle
        buildRotationTrack('upperLeg_L', t, [0, 0.30, 0.60, 0.85, 0.95, 1.00], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.22, 0.48, 0.72, 0.85, 0.90], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.25, -0.55, -0.85, -1.10, -1.20], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.20, -0.45, -0.72, -1.00, -1.10], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// MOOSE — unstoppable, mechanical, powerful stride, eerily smooth
// Personality: massive antlers, barely any vertical motion, relentless march
// ═══════════════════════════════════════════════════════════════════════

function _mooseCharge() {
    const c = ENEMY_VISUAL_CONFIG.moose;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const dur = c.animationParams.walkDuration;
    const t5 = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    // 9-keyframe legs for flat spots at extremes (firm mechanical planting, like power walker)
    const d8 = dur / 8;
    const tLegs = [0, d8, d8 * 2, d8 * 3, d8 * 4, d8 * 5, d8 * 6, d8 * 7, dur];

    return new THREE.AnimationClip('moose_charge', dur, [
        // Root: barely any bob — eerily smooth, massive weight glides forward
        posTrack('root', t5, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: perfectly upright, zero twist — relentless forward momentum
        eulerTrack('spine', t5, [
            [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Neck: slight forward extension — head leads the charge
        eulerTrack('neck', t5, [
            [-0.04, 0, 0], [-0.02, 0, 0], [-0.04, 0, 0],
            [-0.02, 0, 0], [-0.04, 0, 0]
        ]),
        // Head: barely moves — antlers sway with subtle weight
        eulerTrack('head', t5, [
            [0, 0, -0.02], [0, 0, 0], [0, 0, 0.02],
            [0, 0, 0], [0, 0, -0.02]
        ]),
        // Arms (front legs): powerful, precise opposition stride
        buildRotationTrack('upperArm_L', t5,
            [-asw, 0, asw, 0, -asw], AXIS_X),
        buildRotationTrack('upperArm_R', t5,
            [asw, 0, -asw, 0, asw], AXIS_X),
        // Forearms: controlled flex — no flop, pure power
        buildRotationTrack('forearm_L', t5, [-0.15, -0.40, -0.15, -0.42, -0.15], AXIS_X),
        buildRotationTrack('forearm_R', t5, [-0.15, -0.42, -0.15, -0.40, -0.15], AXIS_X),
        // Legs: massive deliberate swing with flat spots (mechanical planting)
        buildRotationTrack('upperLeg_L', tLegs,
            [lsw, lsw, 0, -lsw, -lsw, -lsw, 0, lsw, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', tLegs,
            [-lsw, -lsw, 0, lsw, lsw, lsw, 0, -lsw, -lsw], AXIS_X),
        // Lower legs: crisp knee bend
        buildRotationTrack('lowerLeg_L', t5, [-0.06, -0.50, -0.06, -0.54, -0.06], AXIS_X),
        buildRotationTrack('lowerLeg_R', t5, [-0.06, -0.54, -0.06, -0.50, -0.06], AXIS_X),
        // Feet: firm hooved planting
        buildRotationTrack('foot_L', t5, [-0.22, 0, 0.18, 0, -0.22], AXIS_X),
        buildRotationTrack('foot_R', t5, [0.18, 0, -0.22, 0, 0.18], AXIS_X),
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
        // Spine: loads up, then drives forward with full body
        eulerTrack('spine', t, [
            [0, 0, 0], [0.10, 0, 0], [-0.30, 0, 0],
            [-0.22, 0, 0.05], [-0.12, 0, -0.03],
            [-0.05, 0, 0.02], [-0.02, 0, 0], [0, 0, 0]
        ]),
        // Neck: extends forward massively — antlers leading
        eulerTrack('neck', t, [
            [0, 0, 0], [0.12, 0, 0], [-0.35, 0, 0],
            [-0.25, 0, 0], [-0.12, 0, 0],
            [-0.04, 0, 0], [-0.01, 0, 0], [0, 0, 0]
        ]),
        // Head: dips down (antlers forward), recoils on impact
        eulerTrack('head', t, [
            [0, 0, 0], [0.08, 0, 0], [-0.25, 0, 0],
            [0.15, 0, 0.04], [0.06, 0, -0.02],
            [0.02, 0, 0], [0, 0, 0], [0, 0, 0]
        ]),
        // Arms: brace on impact
        buildRotationTrack('upperArm_L', t,
            [0, 0.10, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [0, 0.10, -0.18, -0.12, -0.06, -0.02, 0, 0], AXIS_X),
        // Forearms: absorb impact force
        buildRotationTrack('forearm_L', t,
            [0, 0.06, -0.30, -0.18, -0.08, -0.03, 0, 0], AXIS_X),
        buildRotationTrack('forearm_R', t,
            [0, 0.06, -0.30, -0.18, -0.08, -0.03, 0, 0], AXIS_X),
        // Legs: drive off back legs for the charge
        buildRotationTrack('upperLeg_L', t,
            [0, -0.16, 0.26, 0.20, 0.10, 0.04, 0.01, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, -0.16, 0.26, 0.20, 0.10, 0.04, 0.01, 0], AXIS_X),
        // Feet: dig in for charge momentum
        buildRotationTrack('foot_L', t,
            [0, 0.16, -0.20, -0.14, -0.06, -0.02, 0, 0], AXIS_X),
        buildRotationTrack('foot_R', t,
            [0, 0.16, -0.20, -0.14, -0.06, -0.02, 0, 0], AXIS_X),
    ]);
}

function _mooseHitReact() {
    const dur = 0.3;
    const t = [0, 0.05, 0.14, dur];
    // Barely reacts — slight head toss, antlers sway. Unstoppable.
    return new THREE.AnimationClip('moose_hit_react', dur, [
        posTrack('root', t, [[0, 0, 0], [0, 0, -0.025], [0, 0, -0.008], [0, 0, 0]]),
        // Spine: tiny flex
        buildRotationTrack('spine', t, [0, 0.02, 0.006, 0], AXIS_X),
        // Head toss — antlers swing with weight
        eulerTrack('head', t, [
            [0, 0, 0], [-0.10, 0, -0.08], [-0.03, 0, -0.025], [0, 0, 0]
        ]),
        // Neck recoil
        eulerTrack('neck', t, [
            [0, 0, 0], [0.06, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
    ]);
}

function _mooseDeath() {
    const c = ENEMY_VISUAL_CONFIG.moose;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.9;
    const t = [0, 0.14, 0.30, 0.48, 0.64, 0.78, dur];

    return new THREE.AnimationClip('moose_death', dur, [
        // Legs give out, massive topple to side — ground-shaking collapse
        posTrack('root', t, [
            [0, ry, 0], [0.06 * s, ry * 0.92, 0], [0.18 * s, ry * 0.65, 0],
            [0.38 * s, ry * 0.32, 0], [0.52 * s, ry * 0.08, 0],
            [0.58 * s, ry * 0.01, 0], [0.60 * s, 0, 0]
        ]),
        // Root tilts sideways — massive timber fall
        buildRotationTrack('root', t, [0, -0.12, -0.40, -0.82, -1.25, -1.48, -1.57], AXIS_Z),
        // Spine: tries to right itself, then gives up
        eulerTrack('spine', t, [
            [0, 0, 0], [0, 0, 0.08], [0, 0, 0.16],
            [0, 0, 0.22], [0, 0, 0.18], [0, 0, 0.12], [0, 0, 0.08]
        ]),
        // Neck: goes limp
        eulerTrack('neck', t, [
            [0, 0, 0], [-0.04, 0, 0.04], [-0.12, 0, 0.10],
            [-0.20, 0, 0.16], [-0.26, 0, 0.20], [-0.28, 0, 0.18], [-0.30, 0, 0.16]
        ]),
        // Head: antlers swing with momentum, then settle heavy
        eulerTrack('head', t, [
            [0, 0, 0], [0, 0, -0.06], [0, 0.08, -0.14],
            [0, 0.06, -0.22], [0, 0.03, -0.16], [0, 0.02, -0.10], [0, 0, -0.08]
        ]),
        // Arms: reach out then go limp
        eulerTrack('upperArm_L', t, [
            [0, 0, 0], [0.12, 0, -0.28], [0.30, 0, -0.42],
            [0.20, 0, -0.52], [0.08, 0, -0.38], [0, 0, -0.28], [0, 0, -0.20]
        ]),
        eulerTrack('upperArm_R', t, [
            [0, 0, 0], [0.18, 0, 0.32], [0.42, 0, 0.48],
            [0.30, 0, 0.58], [0.14, 0, 0.44], [0.04, 0, 0.32], [0, 0, 0.22]
        ]),
        // Legs buckle — heavy crash
        buildRotationTrack('upperLeg_L', t, [0, 0.15, 0.45, 0.75, 0.95, 1.05, 1.10], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.10, 0.35, 0.60, 0.82, 0.95, 1.00], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.12, -0.40, -0.75, -1.10, -1.35, -1.50], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.08, -0.30, -0.62, -0.95, -1.25, -1.40], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════════════════
// RACCOON — sneaky, chatty, waddling in groups, curious mischief-makers
// Personality: playful hip sway, always looking around, tiny grabby paws
// ═══════════════════════════════════════════════════════════════════════

function _raccoonWaddle() {
    const c = ENEMY_VISUAL_CONFIG.raccoon;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const lsw = c.animationParams.legSwing;
    const hipSway = c.animationParams.hipSway;
    const lean = -c.animationParams.spineForwardLean;
    const dur = c.animationParams.walkDuration;
    const t = [0, dur * 0.25, dur * 0.5, dur * 0.75, dur];

    return new THREE.AnimationClip('raccoon_waddle', dur, [
        // Root: hip sway — sneaky little waddle (like girls but more mischievous)
        eulerTrack('root', t, [
            [0, 0, -hipSway], [0, 0, 0], [0, 0, hipSway],
            [0, 0, 0], [0, 0, -hipSway]
        ]),
        // Bouncy little bob
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        // Spine: hunched forward + counter-sway — sneaky posture
        eulerTrack('spine', t, [
            [lean, 0, hipSway * 0.5], [lean, 0, 0], [lean, 0, -hipSway * 0.5],
            [lean, 0, 0], [lean, 0, hipSway * 0.5]
        ]),
        // Chest: delayed follow-through on sway
        eulerTrack('chest', t, [
            [0, 0, 0], [0, 0, hipSway * 0.3], [0, 0, 0],
            [0, 0, -hipSway * 0.3], [0, 0, 0]
        ]),
        // Neck: curious craning — looking around for opportunities
        eulerTrack('neck', t, [
            [0.04, 0, 0], [-0.02, 0, 0], [0.04, 0, 0],
            [-0.02, 0, 0], [0.04, 0, 0]
        ]),
        // Head: turns side to side, looking around — curious and chatty
        eulerTrack('head', t, [
            [0.06, 0.28, 0], [-0.04, 0.10, 0], [0.06, -0.28, 0],
            [-0.04, -0.10, 0], [0.06, 0.28, 0]
        ]),
        // Legs: playful waddling stride
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        // Lower legs: springy little steps
        buildRotationTrack('lowerLeg_L', t, [-0.08, -0.38, -0.10, -0.42, -0.08], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [-0.10, -0.42, -0.08, -0.38, -0.10], AXIS_X),
    ]);
}

function _raccoonBash() {
    const c = ENEMY_VISUAL_CONFIG.raccoon;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.6;

    // Scratching and pushing at door — small frantic body pushes + examining
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
        // Spine: leans into each push, pulls back to examine
        eulerTrack('spine', t, [
            [-0.08, 0, 0], [-0.22, 0, 0], [-0.08, 0.10, 0],
            [-0.25, -0.08, 0], [-0.06, 0.06, 0],
            [-0.24, 0, 0.05], [-0.08, -0.06, -0.03], [-0.08, 0, 0]
        ]),
        // Head: examining the door between pushes — curious raccoon behavior
        eulerTrack('head', t, [
            [0, 0.18, 0], [-0.06, 0, 0], [0, -0.22, 0.06],
            [-0.04, 0.14, -0.04], [0, -0.18, 0],
            [-0.08, 0.08, 0.06], [0.04, -0.12, -0.04], [0, 0.18, 0]
        ]),
        // Legs: little frustrated stomps between pushes
        buildRotationTrack('upperLeg_L', t,
            [0, 0.14, 0, 0.18, 0, 0.22, 0.08, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t,
            [0, 0.18, 0, 0.14, 0, 0.16, 0.10, 0], AXIS_X),
        buildRotationTrack('lowerLeg_L', t,
            [0, -0.18, 0, -0.22, 0, -0.30, -0.10, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t,
            [0, -0.22, 0, -0.18, 0, -0.24, -0.12, 0], AXIS_X),
    ]);
}

function _raccoonHitReact() {
    const dur = 0.25;
    const t = [0, 0.03, 0.10, 0.18, dur];
    return new THREE.AnimationClip('raccoon_hit_react', dur, [
        // Startled jump — springs upward, flattens briefly
        posTrack('root', t, [
            [0, 0, 0], [0, 0.08, -0.06], [0, -0.02, -0.03], [0, 0, -0.01], [0, 0, 0]
        ]),
        // Spine crunches flat (playing dead instinct)
        eulerTrack('spine', t, [
            [0, 0, 0], [0.18, 0, 0], [0.06, 0, 0], [0.02, 0, 0], [0, 0, 0]
        ]),
        // Squash on land — flattens
        scaleTrack('root', t, [
            [1, 1, 1], [0.85, 1.20, 0.85], [1.10, 0.88, 1.10], [1.02, 0.98, 1.02], [1, 1, 1]
        ]),
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
        // Spine curls up — belly exposed (playing dead pose)
        eulerTrack('spine', t, [
            [-0.08, 0, 0], [-0.28, 0, 0.06], [-0.55, 0, 0.10],
            [-0.82, 0, 0.08], [-0.95, 0, 0.04], [-1.00, 0, 0]
        ]),
        // Head: dramatically tilts to side — tongue-out death pose
        eulerTrack('head', t, [
            [0, 0, 0], [-0.10, 0.12, 0.10], [-0.06, 0.20, 0.22],
            [-0.02, 0.16, 0.28], [0, 0.10, 0.24], [0, 0.06, 0.20]
        ]),
        // Legs stick up stiffly (classic playing dead)
        buildRotationTrack('upperLeg_L', t, [0, 0.35, 0.65, 0.80, 0.85, 0.88], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.28, 0.55, 0.72, 0.78, 0.82], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.10, -0.20, -0.25, -0.22, -0.20], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.08, -0.15, -0.20, -0.18, -0.16], AXIS_X),
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

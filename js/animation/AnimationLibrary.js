// AnimationLibrary.js — AAA keyframe clips for 6 enemy types
// 25 clips: walk/bash/hit/death per type + waddle panic_sprint
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
            [0.5, 0, 0.35], [0.52, 0, 0.37], [0.5, 0, 0.35], [0.52, 0, 0.37], [0.5, 0, 0.35]
        ]),
        eulerTrack('upperArm_R', t, [
            [0.5, 0, -0.35], [0.52, 0, -0.37], [0.5, 0, -0.35], [0.52, 0, -0.37], [0.5, 0, -0.35]
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
            [0.5, 0, -0.35],    // groin hold
            [1.3, 0, -0.05],    // arm raised, fist at door height
            [0.55, 0, 0],       // first knock — fist contacts door
            [0.9, 0, -0.08],    // recoil
            [0.55, 0, 0],       // second knock
            [0.85, 0, -0.06],   // recoil
            [0.55, 0, 0],       // third knock
            [0.75, 0, -0.20],   // arm lowering
            [0.5, 0, -0.35],    // return to groin hold
        ]),
        // Left arm (stays holding groin, squeezes harder on impacts)
        eulerTrack('upperArm_L', t, [
            [0.5, 0, 0.35], [0.52, 0, 0.37], [0.56, 0, 0.40], [0.53, 0, 0.38],
            [0.56, 0, 0.40], [0.53, 0, 0.38], [0.56, 0, 0.40],
            [0.52, 0, 0.37], [0.5, 0, 0.35]
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
            [0.5, 0, 0.35],     // groin hold
            [1.3, 0, 0.05],     // arm raised, fist at door height
            [0.55, 0, 0],       // first knock
            [0.9, 0, 0.08],     // recoil
            [0.55, 0, 0],       // second knock
            [0.85, 0, 0.06],    // recoil
            [0.55, 0, 0],       // third knock
            [0.75, 0, 0.20],    // arm lowering
            [0.5, 0, 0.35],     // return to groin hold
        ]),
        // Right arm (stays holding groin, squeezes harder on impacts)
        eulerTrack('upperArm_R', t, [
            [0.5, 0, -0.35], [0.52, 0, -0.37], [0.56, 0, -0.40], [0.53, 0, -0.38],
            [0.56, 0, -0.40], [0.53, 0, -0.38], [0.56, 0, -0.40],
            [0.52, 0, -0.37], [0.5, 0, -0.35]
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
        scaleTrack('root', [0, 0.45, dur], [[1, 1, 1], [1, 1, 1], [0.01, 0.01, 0.01]]),
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
        // Extreme squash → deflate → splat
        scaleTrack('root', t, [
            [1, 1, 1], [1.25, 0.65, 1.25], [1.38, 0.42, 1.38],
            [1.42, 0.22, 1.42], [1.45, 0.10, 1.45], [0.01, 0.01, 0.01]
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
        scaleTrack('root', [0, 0.60, dur], [[1, 1, 1], [1, 1, 1], [0.01, 0.01, 0.01]]),
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
        scaleTrack('root', [0, 0.45, dur], [[1, 1, 1], [1, 1, 1], [0.01, 0.01, 0.01]]),
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
        scaleTrack('root', [0, 0.45, dur], [[1, 1, 1], [1, 1, 1], [0.01, 0.01, 0.01]]),
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
        scaleTrack('root', [0, 0.35, dur], [[1, 1, 1], [1, 1, 1], [0.01, 0.01, 0.01]]),
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

// AnimationLibrary.js — 25 keyframe clips for 6 enemy types
// Clip cache + lazy construction. Quaternion/keyframe helpers.

import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

/**
 * Create a flat [x,y,z,w] quaternion from axis-angle.
 */
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

/**
 * Build a QuaternionKeyframeTrack from single-axis rotations.
 */
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


// ═══════════════════════════════════════════════════════════
// POLITE KNOCKER — baseline, measured stride, civilized
// ═══════════════════════════════════════════════════════════

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
    const twist = 0.05;

    return new THREE.AnimationClip('polite_walk', dur, [
        posTrack('root', t, [
            [0, ry, 0], [0, ry + bob, 0], [0, ry, 0], [0, ry + bob, 0], [0, ry, 0]
        ]),
        eulerTrack('spine', t, [
            [lean, twist, 0], [lean, 0, 0], [lean, -twist, 0], [lean, 0, 0], [lean, twist, 0]
        ]),
        buildRotationTrack('head', t, [-twist * 0.7, 0, twist * 0.7, 0, -twist * 0.7], AXIS_Y),
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0.1, 0, 0, -0.4, 0.1], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.4, 0.1, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_L', t, [-asw, 0, asw, 0, -asw], AXIS_X),
        buildRotationTrack('upperArm_R', t, [asw, 0, -asw, 0, asw], AXIS_X),
    ]);
}

function _politeBash() {
    const c = ENEMY_VISUAL_CONFIG.polite;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const lean = -c.animationParams.spineForwardLean;
    const dur = 0.8;
    const t = [0, 0.2, 0.35, 0.45, 0.8];

    return new THREE.AnimationClip('polite_bash_door', dur, [
        posTrack('root', t, [
            [0, ry, 0], [0, ry, -0.15 * s], [0, ry, 0.2 * s], [0, ry, 0.2 * s], [0, ry, 0]
        ]),
        eulerTrack('spine', t, [
            [lean, 0, 0], [lean + 0.2, 0, 0], [lean - 0.3, 0, 0], [lean - 0.3, 0, 0], [lean, 0, 0]
        ]),
        buildRotationTrack('upperArm_L', t, [0, -0.2, 1.2, 1.2, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t, [0, -0.2, 1.2, 1.2, 0], AXIS_X),
        buildRotationTrack('upperLeg_L', t, [0, -0.1, 0.15, 0.15, 0], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, -0.1, 0.15, 0.15, 0], AXIS_X),
    ]);
}

function _politeHitReact() {
    const dur = 0.3;
    const t = [0, 0.05, 0.15, dur];
    return new THREE.AnimationClip('polite_hit_react', dur, [
        posTrack('root', t, [[0,0,0], [0,-0.05,-0.12], [0,-0.02,-0.05], [0,0,0]]),
        buildRotationTrack('spine', t, [0, 0.15, 0.05, 0], AXIS_X),
    ]);
}

function _politeDeath() {
    const c = ENEMY_VISUAL_CONFIG.polite;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.6;
    const t = [0, 0.1, 0.3, 0.4, 0.6];
    return new THREE.AnimationClip('polite_death', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry-0.1,0], [0,ry*0.3,0.1], [0,ry*0.1,0.15], [0,0,0.2]
        ]),
        eulerTrack('spine', t, [
            [-0.087,0,0], [-0.2,0,0], [-0.8,0,0.1], [-1.2,0,0.15], [-1.5,0,0.2]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.3, 0.6, 0.8, 1.0], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.2, 0.5, 0.7, 0.9], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, -0.3, -0.8, -1.2, -1.5], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.4, -0.9, -1.3, -1.4], AXIS_X),
        scaleTrack('root', [0, 0.4, 0.6], [[1,1,1], [1,1,1], [0.01,0.01,0.01]]),
    ]);
}


// ═══════════════════════════════════════════════════════════
// PEE DANCER — frantic hopping, squash & stretch
// ═══════════════════════════════════════════════════════════

function _dancerHopWalk() {
    const c = ENEMY_VISUAL_CONFIG.dancer;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const rock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const spineLean = -0.15;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.1, 0.2, 0.3, dur];

    return new THREE.AnimationClip('dancer_hop_walk', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry+bob,0], [0,ry,0], [0,ry+bob,0], [0,ry,0]
        ]),
        scaleTrack('root', t, [
            [1.1,0.85,1.1], [0.95,1.1,0.95], [1.1,0.85,1.1], [0.95,1.1,0.95], [1.1,0.85,1.1]
        ]),
        eulerTrack('spine', t, [
            [spineLean,0,-rock], [spineLean,0,0], [spineLean,0,rock], [spineLean,0,0], [spineLean,0,-rock]
        ]),
        eulerTrack('head', t, [
            [0.1,0,rock*0.3], [-0.05,0,0], [0.1,0,-rock*0.3], [-0.05,0,0], [0.1,0,rock*0.3]
        ]),
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        eulerTrack('lowerLeg_L', t, [
            [-0.2,0,0.15], [-0.1,0,0.15], [-0.2,0,0.15], [-0.1,0,0.15], [-0.2,0,0.15]
        ]),
        eulerTrack('lowerLeg_R', t, [
            [-0.2,0,-0.15], [-0.1,0,-0.15], [-0.2,0,-0.15], [-0.1,0,-0.15], [-0.2,0,-0.15]
        ]),
    ]);
}

function _dancerBash() {
    const c = ENEMY_VISUAL_CONFIG.dancer;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.6;
    const t = [0, 0.1, 0.2, 0.3, 0.4, 0.5, dur];
    return new THREE.AnimationClip('dancer_bash_door', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry+0.08,0.05], [0,ry,0], [0,ry+0.08,0.05],
            [0,ry,0], [0,ry+0.08,0.05], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [-0.15,0,0], [-0.3,0,0], [-0.15,0,0], [-0.3,0,0],
            [-0.15,0,0], [-0.3,0,0], [-0.15,0,0]
        ]),
        scaleTrack('root', t, [
            [1.05,0.9,1.05], [0.97,1.05,0.97], [1.05,0.9,1.05], [0.97,1.05,0.97],
            [1.05,0.9,1.05], [0.97,1.05,0.97], [1.05,0.9,1.05]
        ]),
    ]);
}

function _dancerHitReact() {
    const dur = 0.25;
    const t = [0, 0.04, 0.12, dur];
    return new THREE.AnimationClip('dancer_hit_react', dur, [
        posTrack('root', t, [[0,0,0], [0,-0.03,-0.06], [0,-0.01,-0.02], [0,0,0]]),
        buildRotationTrack('spine', t, [0, 0.1, 0.03, 0], AXIS_X),
    ]);
}

function _dancerDeath() {
    const c = ENEMY_VISUAL_CONFIG.dancer;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const t = [0, 0.1, 0.25, 0.35, 0.5];
    return new THREE.AnimationClip('dancer_death', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry*0.7,0], [0,ry*0.2,0.05], [0,ry*0.05,0.05], [0,0,0.05]
        ]),
        scaleTrack('root', t, [
            [1,1,1], [1.1,0.8,1.1], [1.3,0.5,1.3], [1.4,0.2,1.4], [0.01,0.01,0.01]
        ]),
        eulerTrack('spine', t, [
            [-0.15,0,0], [-0.5,0,0.2], [-1.0,0,0.3], [-1.3,0,0.2], [-1.5,0,0.1]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.3, 0.5, 0.6, 0.7], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.2, 0.4, 0.5, 0.6], AXIS_X),
    ]);
}


// ═══════════════════════════════════════════════════════════
// WADDLE TANK — heavy lateral rock, belly jiggle, panic mode
// ═══════════════════════════════════════════════════════════

function _waddleWaddle() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const bob = c.animationParams.bobHeight;
    const bodyRock = c.animationParams.bodyRock;
    const lsw = c.animationParams.legSwing;
    const asw = c.animationParams.armSwing;
    const spineRest = -0.20;
    const dur = c.animationParams.walkDuration;
    const t = [0, 0.35, 0.7, 1.05, dur];

    return new THREE.AnimationClip('waddle_waddle', dur, [
        eulerTrack('root', t, [
            [0,0,-bodyRock], [0,0,0], [0,0,bodyRock], [0,0,0], [0,0,-bodyRock]
        ]),
        posTrack('root', t, [
            [0,ry,0], [0,ry+bob,0], [0,ry,0], [0,ry+bob,0], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [spineRest,0,bodyRock*0.6], [spineRest,0,0],
            [spineRest,0,-bodyRock*0.6], [spineRest,0,0], [spineRest,0,bodyRock*0.6]
        ]),
        // Belly: delayed follow + 20% overshoot (secondary motion)
        eulerTrack('belly', t, [
            [0,0,0], [0,0,bodyRock*0.6*1.2], [0,0,0], [0,0,-bodyRock*0.6*1.2], [0,0,0]
        ]),
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, 0, 0, -0.3, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.3, 0, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_L', t, [0, 0, 0, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t, [-asw, 0, asw, 0, -asw], AXIS_X),
        buildRotationTrack('head', t, [bodyRock*0.8, 0, -bodyRock*0.8, 0, bodyRock*0.8], AXIS_Z),
    ]);
}

function _waddlePanicSprint() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const t = [0, 0.125, 0.25, 0.375, dur];

    return new THREE.AnimationClip('waddle_panic_sprint', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry+0.1,0], [0,ry,0], [0,ry+0.1,0], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [-0.08,0,0], [-0.05,0,0], [-0.08,0,0], [-0.05,0,0], [-0.08,0,0]
        ]),
        buildRotationTrack('upperLeg_L', t, [0.87, 0, -0.87, 0, 0.87], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-0.87, 0, 0.87, 0, -0.87], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, 0, 0, -0.6, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.6, 0, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_L', t, [0.8, -0.3, -0.8, 0.3, 0.8], AXIS_X),
        buildRotationTrack('upperArm_R', t, [-0.8, 0.3, 0.8, -0.3, -0.8], AXIS_X),
        eulerTrack('belly', t, [
            [0.15,0,0], [-0.15,0,0], [0.15,0,0], [-0.15,0,0], [0.15,0,0]
        ]),
        buildRotationTrack('head', t, [0.1, -0.1, 0.1, -0.1, 0.1], AXIS_X),
    ]);
}

function _waddleBash() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 1.0;
    const t = [0, 0.3, 0.5, 0.6, 0.7, 1.0];

    return new THREE.AnimationClip('waddle_bash_door', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry+0.05,-0.25*s], [0,ry-0.05,0.3*s],
            [0,ry-0.1,0.3*s], [0,ry,0.15*s], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [-0.20,0,0], [0.3,0,0], [-0.6,0,0], [-0.6,0,0], [-0.3,0,0], [-0.20,0,0]
        ]),
        scaleTrack('belly', t, [
            [1,1,1], [1,1,0.9], [1.2,0.9,1.3], [0.9,1.1,0.8], [1.05,0.97,1.05], [1,1,1]
        ]),
        buildRotationTrack('upperArm_L', t, [0, 0.5, -0.3, -0.3, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_R', t, [0, 0.5, -0.3, -0.3, 0, 0], AXIS_X),
    ]);
}

function _waddleHitReact() {
    const dur = 0.35;
    const t = [0, 0.06, 0.15, 0.25, dur];
    return new THREE.AnimationClip('waddle_hit_react', dur, [
        posTrack('root', t, [
            [0,0,0], [0,0,-0.15], [0,0,-0.08], [0,0,-0.03], [0,0,0]
        ]),
        scaleTrack('belly', [0, 0.06, 0.12, 0.2, 0.28, dur], [
            [1,1,1], [1.15,0.9,1.2], [0.9,1.1,0.85], [1.05,0.97,1.05], [0.98,1.02,0.98], [1,1,1]
        ]),
        buildRotationTrack('spine', t, [0, 0.1, 0.05, 0.02, 0], AXIS_X),
    ]);
}

function _waddleDeath() {
    const c = ENEMY_VISUAL_CONFIG.waddle;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.8;
    const t = [0, 0.15, 0.35, 0.55, 0.7, dur];

    return new THREE.AnimationClip('waddle_death', dur, [
        posTrack('root', t, [
            [0,ry,0], [0.1*s,ry*0.9,0], [0.3*s,ry*0.5,0],
            [0.5*s,ry*0.2,0], [0.6*s,ry*0.05,0], [0.6*s,0,0]
        ]),
        buildRotationTrack('root', t, [0, -0.3, -0.8, -1.2, -1.5, -1.57], AXIS_Z),
        eulerTrack('spine', t, [
            [-0.20,0,0], [-0.3,0,0], [-0.5,0,-0.2], [-0.7,0,-0.3], [-0.8,0,-0.3], [-0.9,0,-0.3]
        ]),
        eulerTrack('belly', t, [
            [0,0,0], [0.1,0,0], [0.2,0,0.1], [0.15,0,0.2], [0.1,0,0.15], [0,0,0.1]
        ]),
        scaleTrack('root', [0, 0.6, dur], [[1,1,1], [1,1,1], [0.01,0.01,0.01]]),
    ]);
}


// ═══════════════════════════════════════════════════════════
// PANICKER — frantic, asymmetric arm flailing, spine twist
// ═══════════════════════════════════════════════════════════

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

    return new THREE.AnimationClip('panicker_panic_run', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry+bob,0], [0,ry,0], [0,ry+bob,0], [0,ry,0]
        ]),
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw*0.9, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw*0.9, 0, lsw, 0, -lsw*0.9], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, 0, 0, -0.5, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.5, 0, 0, 0], AXIS_X),
        eulerTrack('spine', t, [
            [spineRest, spineTwist, 0], [spineRest, 0, 0],
            [spineRest, -spineTwist, 0], [spineRest, 0, 0], [spineRest, spineTwist, 0]
        ]),
        eulerTrack('head', t, [
            [0,0,0], [0,spineTwist*0.5,0], [0,0,0], [0,-spineTwist*0.5,0], [0,0,0]
        ]),
        // Left arm: wide asymmetric arc (1.3x feel — different pattern than right)
        eulerTrack('upperArm_L', [0, 0.1, 0.2, 0.3, 0.4, 0.5], [
            [PI+0.5, 0, 0.3], [PI-0.4, 0, -0.2], [PI+0.3, 0, 0.4],
            [PI-0.6, 0, -0.3], [PI+0.4, 0, 0.2], [PI+0.5, 0, 0.3]
        ]),
        // Right arm: different arc, different timing
        eulerTrack('upperArm_R', t, [
            [PI-0.3, 0, -0.2], [PI+0.5, 0, 0.3],
            [PI-0.3, 0, -0.2], [PI+0.5, 0, 0.3], [PI-0.3, 0, -0.2]
        ]),
        buildRotationTrack('forearm_L', [0, 0.1, 0.2, 0.3, 0.4, 0.5],
            [0.3, -0.4, 0.5, -0.3, 0.4, 0.3], AXIS_X),
        buildRotationTrack('forearm_R', t, [0.2, -0.3, 0.2, -0.3, 0.2], AXIS_X),
    ]);
}

function _panickerBash() {
    const c = ENEMY_VISUAL_CONFIG.panicker;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const PI = Math.PI;
    const t = [0, 0.1, 0.2, 0.3, 0.4, dur];

    return new THREE.AnimationClip('panicker_bash_door', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry,0.05], [0,ry,0], [0,ry,0.05], [0,ry,0], [0,ry,0]
        ]),
        buildRotationTrack('upperArm_L', t,
            [PI-0.3, PI+0.5, PI-0.3, PI+0.5, PI-0.3, PI-0.3], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [PI+0.5, PI-0.3, PI+0.5, PI-0.3, PI+0.5, PI+0.5], AXIS_X),
        buildRotationTrack('forearm_L', t, [0.5, -0.6, 0.5, -0.6, 0.5, 0.5], AXIS_X),
        buildRotationTrack('forearm_R', t, [-0.6, 0.5, -0.6, 0.5, -0.6, -0.6], AXIS_X),
        eulerTrack('spine', t, [
            [-0.087,0,0], [-0.15,0,0.05], [-0.087,0,-0.05],
            [-0.15,0,0.05], [-0.087,0,-0.05], [-0.087,0,0]
        ]),
    ]);
}

function _panickerHitReact() {
    const dur = 0.3;
    const t = [0, 0.05, 0.12, 0.2, dur];
    return new THREE.AnimationClip('panicker_hit_react', dur, [
        posTrack('root', t, [[0,0,0], [0,-0.05,-0.15], [0,-0.02,-0.08], [0,-0.01,-0.03], [0,0,0]]),
        buildRotationTrack('upperArm_L', t, [0, -0.5, -0.2, -0.1, 0], AXIS_Z),
        buildRotationTrack('upperArm_R', t, [0, 0.5, 0.2, 0.1, 0], AXIS_Z),
        buildRotationTrack('spine', t, [0, 0.2, 0.08, 0.03, 0], AXIS_X),
    ]);
}

function _panickerDeath() {
    const c = ENEMY_VISUAL_CONFIG.panicker;
    const ry = c.bonePositions.root.y * c.size;
    const PI = Math.PI;
    const dur = 0.6;
    const t = [0, 0.1, 0.25, 0.4, 0.5, dur];

    return new THREE.AnimationClip('panicker_death', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry*0.8,0], [0,ry*0.3,0.1], [0,ry*0.1,0.15], [0,0,0.2], [0,0,0.2]
        ]),
        eulerTrack('spine', t, [
            [-0.087,0,0], [-0.3,0,0], [-0.8,0,0.2], [-1.3,0,0.3], [-1.5,0,0.2], [-1.5,0,0.2]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.4, 0.8, 1.0, 1.1, 1.1], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.3, 0.7, 0.9, 1.0, 1.0], AXIS_X),
        // Arms go limp LAST — follow-through (heaviest parts settle last)
        buildRotationTrack('upperArm_L', t,
            [PI, PI, PI*0.8, PI*0.3, 0.5, 0.3], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [PI, PI, PI*0.9, PI*0.4, 0.6, 0.4], AXIS_X),
        scaleTrack('root', [0, 0.4, dur], [[1,1,1], [1,1,1], [0.01,0.01,0.01]]),
    ]);
}


// ═══════════════════════════════════════════════════════════
// POWER WALKER — eerily smooth, rigid, mechanical precision
// ═══════════════════════════════════════════════════════════

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

    // 9-keyframe legs for flat spots at extremes (firm planting)
    const t9 = [0, 0.05, dur*0.25, dur*0.43, dur*0.5, dur*0.57, dur*0.75, dur*0.93, dur];

    return new THREE.AnimationClip('powerwalker_power_walk', dur, [
        posTrack('root', t5, [
            [0,ry,0], [0,ry+bob,0], [0,ry,0], [0,ry+bob,0], [0,ry,0]
        ]),
        // Spine: perfectly upright, zero sway
        buildRotationTrack('spine', t5, [0, 0, 0, 0, 0], AXIS_X),
        // Head: does NOT bob — eerily still
        buildRotationTrack('head', t5, [0, 0, 0, 0, 0], AXIS_X),
        // Legs: deliberate swing with holds at extremes
        buildRotationTrack('upperLeg_L', t9,
            [lsw, lsw, 0, -lsw, -lsw, -lsw, 0, lsw, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t9,
            [-lsw, -lsw, 0, lsw, lsw, lsw, 0, -lsw, -lsw], AXIS_X),
        buildRotationTrack('lowerLeg_L', t5, [0.05, 0, 0, -0.4, 0.05], AXIS_X),
        buildRotationTrack('lowerLeg_R', t5, [0, -0.4, 0.05, 0, 0], AXIS_X),
        // Feet: heel-strike at extremes
        buildRotationTrack('foot_L', t5, [-0.2, 0, 0.15, 0, -0.2], AXIS_X),
        buildRotationTrack('foot_R', t5, [0.15, 0, -0.2, 0, 0.15], AXIS_X),
        // Arms: 90° pump in perfect sync with opposite leg
        buildRotationTrack('upperArm_L', t5,
            [armRest-asw, armRest, armRest+asw, armRest, armRest-asw], AXIS_X),
        buildRotationTrack('upperArm_R', t5,
            [armRest+asw, armRest, armRest-asw, armRest, armRest+asw], AXIS_X),
    ]);
}

function _powerwalkerBash() {
    const c = ENEMY_VISUAL_CONFIG.powerwalker;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const armRest = -Math.PI / 2;
    const dur = 0.7;
    const t = [0, 0.15, 0.3, 0.4, 0.55, dur];

    return new THREE.AnimationClip('powerwalker_bash_door', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry,-0.08*s], [0,ry,0.15*s], [0,ry,0.15*s], [0,ry,0.05*s], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [0,0,0], [0,-0.15,0], [0,0.2,-0.1], [0,0.2,-0.1], [0,0.1,-0.05], [0,0,0]
        ]),
        buildRotationTrack('upperArm_L', t,
            [armRest, armRest+0.3, armRest-0.2, armRest-0.2, armRest, armRest], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [armRest, armRest-0.2, armRest+0.3, armRest+0.3, armRest, armRest], AXIS_X),
    ]);
}

function _powerwalkerHitReact() {
    const dur = 0.3;
    const t = [0, 0.05, 0.15, dur];
    return new THREE.AnimationClip('powerwalker_hit_react', dur, [
        posTrack('root', t, [[0,0,0], [0,0,-0.04], [0,0,-0.01], [0,0,0]]),
        buildRotationTrack('spine', t, [0, 0.03, 0.01, 0], AXIS_X),
    ]);
}

function _powerwalkerDeath() {
    const c = ENEMY_VISUAL_CONFIG.powerwalker;
    const s = c.size;
    const ry = c.bonePositions.root.y * s;
    const dur = 0.6;
    const t = [0, 0.15, 0.35, 0.5, dur];
    const armRest = -Math.PI / 2;

    return new THREE.AnimationClip('powerwalker_death', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry,0.1*s], [0,ry*0.6,0.4*s], [0,ry*0.2,0.7*s], [0,0,0.9*s]
        ]),
        // Falls stiffly forward like a tree
        buildRotationTrack('root', t, [0, -0.2, -0.8, -1.3, -1.57], AXIS_X),
        // Spine stays STIFF — key personality trait
        buildRotationTrack('spine', t, [0, 0, 0, 0, 0], AXIS_X),
        buildRotationTrack('upperArm_L', t,
            [armRest, armRest, armRest, armRest, armRest], AXIS_X),
        buildRotationTrack('upperArm_R', t,
            [armRest, armRest, armRest, armRest, armRest], AXIS_X),
        scaleTrack('root', [0, 0.4, dur], [[1,1,1], [1,1,1], [0.01,0.01,0.01]]),
    ]);
}


// ═══════════════════════════════════════════════════════════
// THE GIRLS — casual, chatty, hip sway, head turns
// ═══════════════════════════════════════════════════════════

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
        eulerTrack('root', t, [
            [0,0,-hipSway], [0,0,0], [0,0,hipSway], [0,0,0], [0,0,-hipSway]
        ]),
        posTrack('root', t, [
            [0,ry,0], [0,ry+bob,0], [0,ry,0], [0,ry+bob,0], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [-0.05,0,hipSway*0.5], [-0.05,0,0], [-0.05,0,-hipSway*0.5],
            [-0.05,0,0], [-0.05,0,hipSway*0.5]
        ]),
        // Head turns side to side — chatting with friends
        eulerTrack('head', t, [
            [0,0.15,0], [0,0.05,0], [0,-0.15,0], [0,-0.05,0], [0,0.15,0]
        ]),
        buildRotationTrack('upperLeg_L', t, [lsw, 0, -lsw, 0, lsw], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [-lsw, 0, lsw, 0, -lsw], AXIS_X),
        buildRotationTrack('lowerLeg_L', t, [0, 0, 0, -0.3, 0], AXIS_X),
        buildRotationTrack('lowerLeg_R', t, [0, -0.3, 0, 0, 0], AXIS_X),
    ]);
}

function _girlsBash() {
    const c = ENEMY_VISUAL_CONFIG.girls;
    const ry = c.bonePositions.root.y * c.size;
    const s = c.size;
    const dur = 0.7;
    const t = [0, 0.15, 0.25, 0.35, 0.55, dur];

    return new THREE.AnimationClip('girls_bash_door', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry,0.05*s], [0,ry,0], [0,ry,0.05*s], [0,ry,0], [0,ry,0]
        ]),
        eulerTrack('spine', t, [
            [-0.05,0,0], [-0.15,0,0], [-0.05,0,0], [-0.15,0,0], [-0.05,0,0], [-0.05,0,0]
        ]),
        eulerTrack('head', t, [
            [0,0.2,0], [0,0,0], [0,-0.2,0], [0,-0.1,0], [0,0.15,0], [0,0.2,0]
        ]),
    ]);
}

function _girlsHitReact() {
    const dur = 0.25;
    const t = [0, 0.04, 0.12, dur];
    return new THREE.AnimationClip('girls_hit_react', dur, [
        posTrack('root', t, [[0,0,0], [0,0.1,-0.03], [0,0.03,-0.01], [0,0,0]]),
        buildRotationTrack('spine', t, [0, -0.1, -0.03, 0], AXIS_X),
    ]);
}

function _girlsDeath() {
    const c = ENEMY_VISUAL_CONFIG.girls;
    const ry = c.bonePositions.root.y * c.size;
    const dur = 0.5;
    const t = [0, 0.1, 0.25, 0.4, dur];

    return new THREE.AnimationClip('girls_death', dur, [
        posTrack('root', t, [
            [0,ry,0], [0,ry*0.6,0], [0,ry*0.2,0.05], [0,ry*0.05,0.05], [0,0,0.05]
        ]),
        eulerTrack('spine', t, [
            [-0.05,0,0], [-0.3,0,0.1], [-0.8,0,0.2], [-1.0,0,0.15], [-1.2,0,0.1]
        ]),
        buildRotationTrack('upperLeg_L', t, [0, 0.3, 0.6, 0.8, 0.9], AXIS_X),
        buildRotationTrack('upperLeg_R', t, [0, 0.2, 0.5, 0.7, 0.8], AXIS_X),
        scaleTrack('root', [0, 0.3, dur], [[1,1,1], [1,1,1], [0.01,0.01,0.01]]),
    ]);
}


// ═══════════════════════════════════════════════════════════
// CLIP REGISTRY & CACHE
// ═══════════════════════════════════════════════════════════

const _clipBuilders = {
    polite_walk:        _politeWalk,
    polite_bash_door:   _politeBash,
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

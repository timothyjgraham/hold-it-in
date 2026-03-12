// Skeleton Factory — builds THREE.Bone hierarchies per enemy type
// Uses ENEMY_VISUAL_CONFIG for bone positions, enabled flags, and rest poses.

import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';
import { PLAYER_VISUAL_CONFIG } from '../data/playerConfig.js';

// Merged config for all entity types (enemies + player)
const ALL_VISUAL_CONFIGS = { ...ENEMY_VISUAL_CONFIG, ...PLAYER_VISUAL_CONFIG };

/**
 * Create a skeleton for the given enemy type and size.
 *
 * @param {string} enemyType - Key into ENEMY_VISUAL_CONFIG
 * @param {number} size - Scale factor for bone positions
 * @returns {{ bones: THREE.Bone[], rootBone: THREE.Bone, boneMap: Object.<string, THREE.Bone> }}
 */
export function createSkeleton(enemyType, size) {
    const config = ALL_VISUAL_CONFIGS[enemyType];
    if (!config) {
        throw new Error(`SkeletonFactory: unknown entity type "${enemyType}"`);
    }

    // Quadruped skeleton branch (forest animals)
    if (config.skeletonType === 'quadruped') {
        return _createQuadrupedSkeleton(enemyType, size, config);
    }

    // Marine skeleton branch (ocean creatures)
    if (config.skeletonType === 'marine') {
        return _createMarineSkeleton(enemyType, size, config);
    }

    const bones = [];
    const boneMap = {};
    const bp = config.bonePositions;
    const flags = config.bones;

    // Helper: create a bone, set its position, attach to parent
    function makeBone(name, parent) {
        const bone = new THREE.Bone();
        bone.name = name;

        const pos = bp[name];
        if (pos) {
            bone.position.set(
                (pos.x || 0) * size,
                (pos.y || 0) * size,
                (pos.z || 0) * size
            );
        }

        if (parent) {
            parent.add(bone);
        }

        bones.push(bone);
        boneMap[name] = bone;
        return bone;
    }

    // ── Core hierarchy (always present) ──
    const root  = makeBone('root', null);
    const spine = makeBone('spine', root);
    const chest = makeBone('chest', spine);

    // Head chain — neck is optional
    let headParent = chest;
    if (flags.neck) {
        headParent = makeBone('neck', chest);
    }
    makeBone('head', headParent);

    // ── Arms (optional) ──
    if (flags.upperArms) {
        const upperArmL = makeBone('upperArm_L', chest);
        const upperArmR = makeBone('upperArm_R', chest);

        if (flags.forearms) {
            const forearmL = makeBone('forearm_L', upperArmL);
            const forearmR = makeBone('forearm_R', upperArmR);

            if (flags.hands) {
                const handL = makeBone('hand_L', forearmL);
                const handR = makeBone('hand_R', forearmR);

                if (flags.thumb) {
                    makeBone('thumb_R', handR);
                }
            }
        }
    }

    // ── Belly jiggle bone (Waddle Tank only) ──
    if (flags.belly) {
        makeBone('belly', spine);
    }

    // ── Legs (always present) ──
    const upperLegL = makeBone('upperLeg_L', root);
    const lowerLegL = makeBone('lowerLeg_L', upperLegL);

    const upperLegR = makeBone('upperLeg_R', root);
    const lowerLegR = makeBone('lowerLeg_R', upperLegR);

    if (flags.feet) {
        makeBone('foot_L', lowerLegL);
        makeBone('foot_R', lowerLegR);
    }

    // ── Apply rest pose rotations ──
    if (config.restPose) {
        for (const [boneName, rotation] of Object.entries(config.restPose)) {
            const bone = boneMap[boneName];
            if (bone) {
                bone.rotation.set(
                    rotation.x || 0,
                    rotation.y || 0,
                    rotation.z || 0
                );
            }
        }
    }

    // Compute world matrices so SkeletonHelper can read them
    root.updateMatrixWorld(true);

    return { bones, rootBone: root, boneMap };
}


// ═══════════════════════════════════════
// QUADRUPED SKELETON — horizontal spine, 4 legs, tail chain
// ═══════════════════════════════════════

function _createQuadrupedSkeleton(enemyType, size, config) {
    const bones = [];
    const boneMap = {};
    const bp = config.bonePositions;
    const flags = config.bones;

    function makeBone(name, parent) {
        const bone = new THREE.Bone();
        bone.name = name;
        const pos = bp[name];
        if (pos) {
            bone.position.set(
                (pos.x || 0) * size,
                (pos.y || 0) * size,
                (pos.z || 0) * size
            );
        }
        if (parent) parent.add(bone);
        bones.push(bone);
        boneMap[name] = bone;
        return bone;
    }

    // ── Core spine: root → pelvis → spine_mid → chest ──
    const root   = makeBone('root', null);
    const pelvis = makeBone('pelvis', root);
    const spineMid = makeBone('spine_mid', pelvis);
    const chest  = makeBone('chest', spineMid);

    // ── Neck chain: chest → neck_01 → [neck_02] → head ──
    const neck01 = makeBone('neck_01', chest);
    let headParent = neck01;
    if (flags.neck_02) {
        headParent = makeBone('neck_02', neck01);
    }
    makeBone('head', headParent);

    // ── Front legs: chest → [scapula] → frontUpperLeg → frontLowerLeg → [frontFoot] ──
    let frontLegParentL = chest;
    let frontLegParentR = chest;
    if (flags.scapulae) {
        frontLegParentL = makeBone('scapula_L', chest);
        frontLegParentR = makeBone('scapula_R', chest);
    }
    const frontUpperL = makeBone('frontUpperLeg_L', frontLegParentL);
    const frontLowerL = makeBone('frontLowerLeg_L', frontUpperL);
    const frontUpperR = makeBone('frontUpperLeg_R', frontLegParentR);
    const frontLowerR = makeBone('frontLowerLeg_R', frontUpperR);
    if (flags.frontFeet) {
        makeBone('frontFoot_L', frontLowerL);
        makeBone('frontFoot_R', frontLowerR);
    }

    // ── Tail: pelvis → tail_01 → tail_02 → ... ──
    const tailCount = flags.tailCount || 0;
    let tailParent = pelvis;
    for (let i = 1; i <= tailCount; i++) {
        tailParent = makeBone(`tail_0${i}`, tailParent);
    }

    // ── Hind legs: pelvis → hindUpperLeg → hindLowerLeg → [hindFoot] ──
    const hindUpperL = makeBone('hindUpperLeg_L', pelvis);
    const hindLowerL = makeBone('hindLowerLeg_L', hindUpperL);
    const hindUpperR = makeBone('hindUpperLeg_R', pelvis);
    const hindLowerR = makeBone('hindLowerLeg_R', hindUpperR);
    if (flags.hindFeet) {
        makeBone('hindFoot_L', hindLowerL);
        makeBone('hindFoot_R', hindLowerR);
    }

    // ── Belly jiggle bone (bear only) ──
    if (flags.belly) {
        makeBone('belly', root);
    }

    // ── Apply rest pose rotations ──
    if (config.restPose) {
        for (const [boneName, rotation] of Object.entries(config.restPose)) {
            const bone = boneMap[boneName];
            if (bone) {
                bone.rotation.set(
                    rotation.x || 0,
                    rotation.y || 0,
                    rotation.z || 0
                );
            }
        }
    }

    root.updateMatrixWorld(true);
    return { bones, rootBone: root, boneMap };
}


// ═══════════════════════════════════════
// MARINE SKELETON — horizontal body, tail chain, flipper bones
// Used for: dolphin, shark, flyfish, seaturtle, jellyfish
// ═══════════════════════════════════════

function _createMarineSkeleton(enemyType, size, config) {
    const bones = [];
    const boneMap = {};
    const bp = config.bonePositions;
    const flags = config.bones;

    function makeBone(name, parent) {
        const bone = new THREE.Bone();
        bone.name = name;
        const pos = bp[name];
        if (pos) {
            bone.position.set(
                (pos.x || 0) * size,
                (pos.y || 0) * size,
                (pos.z || 0) * size
            );
        }
        if (parent) parent.add(bone);
        bones.push(bone);
        boneMap[name] = bone;
        return bone;
    }

    // ── Core: root → body_front → head ──
    const root = makeBone('root', null);
    const bodyFront = makeBone('body_front', root);

    // ── Optional snout (dolphin, shark) ──
    let headParent = bodyFront;
    if (flags.snout) {
        headParent = makeBone('snout', bodyFront);
    }
    makeBone('head', headParent);

    // ── Dorsal fin (optional, attached to body_front) ──
    if (flags.dorsal) {
        makeBone('dorsal', bodyFront);
    }

    // ── Pectoral flippers: body_front → flipper_L/R ──
    if (flags.flippers) {
        makeBone('flipper_L', bodyFront);
        makeBone('flipper_R', bodyFront);
    }

    // ── Tail chain: root → body_rear → tail_01 → tail_02 → ... ──
    const bodyRear = makeBone('body_rear', root);
    const tailCount = flags.tailCount || 0;
    let tailParent = bodyRear;
    for (let i = 1; i <= tailCount; i++) {
        tailParent = makeBone(`tail_0${i}`, tailParent);
    }

    // ── Tail flukes/fins (optional, at end of tail chain) ──
    if (flags.tailFlukes) {
        makeBone('fluke_L', tailParent);
        makeBone('fluke_R', tailParent);
    }

    // ── Tentacles (jellyfish) ──
    if (flags.tentacleCount) {
        for (let t = 0; t < flags.tentacleCount; t++) {
            const tentBase = makeBone(`tent_${t}_01`, root);
            makeBone(`tent_${t}_02`, tentBase);
            if (flags.tentacleLength >= 3) {
                makeBone(`tent_${t}_03`, boneMap[`tent_${t}_02`]);
            }
        }
    }

    // ── Shell bone (turtle) ──
    if (flags.shell) {
        makeBone('shell', root);
    }

    // ── Legs/flippers for turtle (uses front/hind like quadruped) ──
    if (flags.turtleFlippers) {
        makeBone('frontFlipper_L', bodyFront);
        makeBone('frontFlipper_R', bodyFront);
        makeBone('hindFlipper_L', bodyRear);
        makeBone('hindFlipper_R', bodyRear);
    }

    // ── Apply rest pose rotations ──
    if (config.restPose) {
        for (const [boneName, rotation] of Object.entries(config.restPose)) {
            const bone = boneMap[boneName];
            if (bone) {
                bone.rotation.set(
                    rotation.x || 0,
                    rotation.y || 0,
                    rotation.z || 0
                );
            }
        }
    }

    root.updateMatrixWorld(true);
    return { bones, rootBone: root, boneMap };
}

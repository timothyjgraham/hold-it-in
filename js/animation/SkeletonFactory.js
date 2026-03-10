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

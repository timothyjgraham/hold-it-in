// Enemy Model Factory — builds fully skinned + shaded enemy meshes
// Calls SkeletonFactory, builds per-type geometry, merges, auto-skins, binds skeleton.

import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';
import { createSkeleton } from '../animation/SkeletonFactory.js';
import { createEnemyMaterials } from './EnemyMaterials.js';
import { mergeGeometries } from '../utils/geometryUtils.js';

/**
 * Create a fully rigged enemy model.
 *
 * @param {string} enemyType - Key into ENEMY_VISUAL_CONFIG
 * @param {number|THREE.Color} color - Body color override
 * @param {boolean} isDesperate - Apply desperate tint
 * @param {number} size - Scale factor (defaults to config size)
 * @returns {{ group: THREE.Group, skinnedMesh: THREE.SkinnedMesh, skeleton: THREE.Skeleton, boneMap: Object, outlineMesh: THREE.SkinnedMesh }}
 */
export function createEnemyModel(enemyType, color, isDesperate, size) {
    const config = ENEMY_VISUAL_CONFIG[enemyType];
    if (!config) {
        throw new Error(`EnemyModelFactory: unknown enemy type "${enemyType}"`);
    }

    size = size !== undefined ? size : config.size;

    // 1. Build skeleton
    const { bones, rootBone, boneMap } = createSkeleton(enemyType, size);

    // 2. Build materials
    const materials = createEnemyMaterials(enemyType, color, isDesperate);

    // 3. Build per-type geometry parts
    const builder = _geometryBuilders[enemyType];
    if (!builder) {
        throw new Error(`EnemyModelFactory: no geometry builder for "${enemyType}"`);
    }
    const builderResult = builder(size, config);
    const { geometries, transforms, materialIndices } = builderResult;
    const boneNames = builderResult.boneNames || null;

    // 4. We need to merge geometry per material group
    // Group geometry by material index: 0=body, 1=skin, 2=legs
    const groups = { 0: { geoms: [], xforms: [] }, 1: { geoms: [], xforms: [] }, 2: { geoms: [], xforms: [] } };
    for (let i = 0; i < geometries.length; i++) {
        const mi = materialIndices[i];
        groups[mi].geoms.push(geometries[i]);
        groups[mi].xforms.push(transforms[i]);
    }

    // Build per-vertex bone override mapping (follows final merge order: groups 0,1,2)
    let vertexBoneMap = null;
    if (boneNames) {
        const vertexCounts = geometries.map(g => g.attributes.position.count);
        // Track which original geometry indices went into each material group
        const groupOrigIndices = { 0: [], 1: [], 2: [] };
        for (let i = 0; i < geometries.length; i++) {
            groupOrigIndices[materialIndices[i]].push(i);
        }
        vertexBoneMap = [];
        for (const mi of [0, 1, 2]) {
            if (groups[mi].geoms.length === 0) continue;
            for (const origIdx of groupOrigIndices[mi]) {
                const bn = boneNames[origIdx];
                const vc = vertexCounts[origIdx];
                for (let v = 0; v < vc; v++) {
                    vertexBoneMap.push(bn);
                }
            }
        }
    }

    // Merge all groups into one geometry with material groups
    const allGeoms = [];
    const allXforms = [];
    const allMatIndices = [];
    const groupRanges = []; // { start, count, materialIndex }

    for (const mi of [0, 1, 2]) {
        if (groups[mi].geoms.length === 0) continue;
        const merged = mergeGeometries(groups[mi].geoms, groups[mi].xforms);
        const indexCount = merged.index.count;
        allGeoms.push(merged);
        allXforms.push(new THREE.Matrix4()); // identity — already transformed
        allMatIndices.push(mi);
        groupRanges.push({ materialIndex: mi, count: indexCount });
    }

    // Final merge of all material groups
    const finalGeometry = mergeGeometries(allGeoms, allXforms);

    // Set up material groups on the geometry
    let indexStart = 0;
    for (const range of groupRanges) {
        finalGeometry.addGroup(indexStart, range.count, range.materialIndex);
        indexStart += range.count;
    }

    // 5. Compute skinIndex and skinWeight
    _computeSkinWeights(finalGeometry, bones, boneMap, enemyType, size, vertexBoneMap);

    // 6. Create SkinnedMesh with multi-material
    const materialArray = [materials.body, materials.skin, materials.legs];
    const skinnedMesh = new THREE.SkinnedMesh(finalGeometry, materialArray);
    skinnedMesh.add(rootBone);

    const skeleton = new THREE.Skeleton(bones);
    skinnedMesh.bind(skeleton);
    skinnedMesh.normalizeSkinWeights();

    // 7. Create outline mesh — shares same skeleton for identical deformation
    const outlineGeometry = finalGeometry.clone();
    const outlineMesh = new THREE.SkinnedMesh(outlineGeometry, materials.outline);
    outlineMesh.bind(skeleton);
    outlineMesh.frustumCulled = false;

    // 8. Wrap in group
    const group = new THREE.Group();
    group.add(skinnedMesh);
    group.add(outlineMesh);

    return { group, skinnedMesh, skeleton, boneMap, outlineMesh, materials };
}


// ═══════════════════════════════════════════════════════
// Per-type geometry builders
// Each returns { geometries[], transforms[], materialIndices[] }
// Material indices: 0=body, 1=skin (head), 2=legs
// ═══════════════════════════════════════════════════════

function _buildPoliteKnockerGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Torso — rounded box (body material)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.4, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head — sphere (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.30 + 0.20 + 0.25), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Arms — cylinders (body material)
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, s * 0.55, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.3, s * (0.80 + 0.25 + 0.15) - s * 0.1, 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.3, s * (0.80 + 0.25 + 0.15) - s * 0.1, 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Upper legs — cylinders (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs — cylinders (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    const boneNames = [null, null, 'upperArm_L', 'upperArm_R', null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildPeeDancerGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Compact torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.35, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.70 + 0.20 + 0.12), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.70 + 0.20 + 0.25 + 0.15 + 0.20), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Close-set legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.70 - s * 0.17, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.70 - s * 0.17, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.70 - s * 0.52, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.70 - s * 0.52, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
}

function _buildWaddleTankGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Stocky torso (body) — wide but not absurd, no roundifyBox
    const torsoH = d.torsoHeight * s * 0.4;
    const torsoY = s * (0.80 + 0.20 + 0.15);
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, torsoH, d.torsoDepth * s, 4, 4, 4);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Belly sphere (body) — moderate bump on front of lower torso
    const belly = new THREE.SphereGeometry(d.bellyRadius * s, 12, 10);
    const bM = new THREE.Matrix4().makeTranslation(0, torsoY - s * 0.08, s * 0.25);
    geometries.push(belly); transforms.push(bM); materialIndices.push(0);

    // Head (skin) — slightly larger to balance the stocky body
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.20 + 0.30 + 0.30), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Arms — hang from shoulder level at torso edges
    const armX = d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25;
    const shoulderY = torsoY + torsoH * 0.3;
    const upperArmLen = s * 0.35;
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.38, upperArmLen, 6, 2);
    const uaY = shoulderY - upperArmLen * 0.15;
    const uaLM = new THREE.Matrix4().makeTranslation(-armX, uaY, 0);
    const uaRM = new THREE.Matrix4().makeTranslation(armX, uaY, 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    // Forearms — below upper arms
    const forearmLen = s * 0.30;
    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.38, d.limbThickness * s * 0.32, forearmLen, 6, 2);
    const faY = uaY - upperArmLen * 0.5 - forearmLen * 0.35;
    const faLM = new THREE.Matrix4().makeTranslation(-armX, faY, 0);
    const faRM = new THREE.Matrix4().makeTranslation(armX, faY, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Stocky legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.55, d.limbThickness * s * 0.48, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.48, d.limbThickness * s * 0.42, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // Feet (legs material) — positioned at leg bottoms
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.65, d.limbThickness * s * 0.25, d.limbThickness * s * 0.85, 2, 2, 2);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.84, s * 0.05);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.84, s * 0.05);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    const boneNames = [null, null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildPanickerGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Thin nervous torso (body) — narrower and shorter than polite
    const torsoH = d.torsoHeight * s * 0.35;
    const torsoY = s * (0.80 + 0.30 + 0.15);
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, torsoH, d.torsoDepth * s, 3, 4, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.30 + 0.35 + 0.20 + 0.25), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Arms — hang from shoulder level, slightly long for frantic flailing
    const armX = d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.3;
    const shoulderY = torsoY + torsoH * 0.35;
    const upperArmLen = s * 0.38;
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.35, upperArmLen, 6, 2);
    const uaY = shoulderY - upperArmLen * 0.15;
    const uaLM = new THREE.Matrix4().makeTranslation(-armX, uaY, 0);
    const uaRM = new THREE.Matrix4().makeTranslation(armX, uaY, 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    // Forearms — below upper arms (NOT above like the old bug!)
    const forearmLen = s * 0.32;
    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.28, forearmLen, 6, 2);
    const faY = uaY - upperArmLen * 0.5 - forearmLen * 0.35;
    const faLM = new THREE.Matrix4().makeTranslation(-armX, faY, 0);
    const faRM = new THREE.Matrix4().makeTranslation(armX, faY, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Narrow legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    const boneNames = [null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildPowerWalkerGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Athletic torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.4, d.torsoDepth * s, 3, 4, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.30 + 0.20 + 0.20), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Defined arms + forearms (body)
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.35, s * 0.35, 6, 2);
    const uaLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.25, s * (0.80 + 0.25 + 0.15), 0);
    const uaRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25, s * (0.80 + 0.25 + 0.15), 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.3, s * 0.25, 6, 2);
    const faLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.25, s * (0.80 + 0.25 + 0.15) - s * 0.30, 0);
    const faRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25, s * (0.80 + 0.25 + 0.15) - s * 0.30, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Strong legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.5, d.limbThickness * s * 0.45, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // Feet (legs material) — positioned at leg bottoms
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.55, d.limbThickness * s * 0.25, d.limbThickness * s * 0.7, 2, 2, 2);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.85, s * 0.10);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.85, s * 0.10);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    const boneNames = [null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildGirlsGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Petite torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.35, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.75 + 0.20 + 0.12), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.75 + 0.20 + 0.25 + 0.15 + 0.20), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Ponytail (body — hair color matches body)
    const ponytail = new THREE.SphereGeometry(d.ponytailRadius * s, 8, 8);
    const pM = new THREE.Matrix4().makeTranslation(0, s * (0.75 + 0.20 + 0.25 + 0.15 + 0.20) + d.headRadius * s * 0.6, -d.headRadius * s * 0.5);
    geometries.push(ponytail); transforms.push(pM); materialIndices.push(0);

    // Slim legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.75 - s * 0.17, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.75 - s * 0.17, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.3, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.75 - s * 0.52, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.75 - s * 0.52, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
}


// ═══════════════════════════════════════════════════════
// Forest enemy geometry builders
// ═══════════════════════════════════════════════════════

function _buildDeerGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Torso — slender, slightly elongated (body material)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.4, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head — elongated sphere (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    head.scale(1.0, 1.3, 1.0); // vertically stretched for deer face
    const headY = s * (0.80 + 0.25 + 0.30 + 0.25 + 0.20);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Antlers — two main branches angled outward (body material)
    const antlerThick = d.antlerSize * s * 0.15;
    const antlerLen = d.antlerSize * s * 1.2;
    const antlerGeo = new THREE.CylinderGeometry(antlerThick * 0.6, antlerThick, antlerLen, 5, 1);
    // Left antler — angled outward
    const alM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.2)
        .setPosition(-d.headRadius * s * 0.5, headY + d.headRadius * s * 0.9 + antlerLen * 0.4, 0);
    const arM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.2)
        .setPosition(d.headRadius * s * 0.5, headY + d.headRadius * s * 0.9 + antlerLen * 0.4, 0);
    geometries.push(antlerGeo); transforms.push(alM); materialIndices.push(0);
    geometries.push(antlerGeo); transforms.push(arM); materialIndices.push(0);

    // Antler tips — small branch tips (body material)
    const tipLen = d.antlerSize * s * 0.6;
    const tipGeo = new THREE.CylinderGeometry(antlerThick * 0.3, antlerThick * 0.5, tipLen, 4, 1);
    const tipY = headY + d.headRadius * s * 0.9 + antlerLen * 0.75;
    const tlM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.45)
        .setPosition(-d.headRadius * s * 0.8, tipY, 0);
    const trM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.45)
        .setPosition(d.headRadius * s * 0.8, tipY, 0);
    geometries.push(tipGeo); transforms.push(tlM); materialIndices.push(0);
    geometries.push(tipGeo); transforms.push(trM); materialIndices.push(0);

    // Pointed ears — small cones on sides of head (body material)
    const earGeo = new THREE.ConeGeometry(d.earSize * s * 0.5, d.earSize * s * 1.2, 6);
    const earY = headY + d.headRadius * s * 0.5;
    const elM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.25)
        .setPosition(-d.headRadius * s * 0.85, earY, 0);
    const erM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.25)
        .setPosition(d.headRadius * s * 0.85, earY, 0);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0);
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0);

    // Arms — thin, elegant (body material)
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.28, s * 0.50, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.25, s * (0.80 + 0.25 + 0.15) - s * 0.08, 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25, s * (0.80 + 0.25 + 0.15) - s * 0.08, 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Tail nub — small sphere behind (body material)
    const tail = new THREE.SphereGeometry(d.limbThickness * s * 0.5, 6, 6);
    const tailM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.05), -d.torsoDepth * s * 0.5 - d.limbThickness * s * 0.2);
    geometries.push(tail); transforms.push(tailM); materialIndices.push(0);

    // Upper legs — thin, elegant (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs — thin (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.28, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // boneNames: torso, head, antlerL, antlerR, tipL, tipR, earL, earR, armL, armR, tail, ulL, ulR, llL, llR
    const boneNames = [null, null, null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', null, null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildSquirrelGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Compact, roundish torso (body material)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.35, d.torsoDepth * s, 3, 3, 3);
    const torsoY = s * (0.60 + 0.18 + 0.12);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head — large for cuteness (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.60 + 0.18 + 0.22 + 0.12 + 0.18);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Small round ears (body material)
    const earGeo = new THREE.SphereGeometry(d.earSize * s * 0.8, 6, 6);
    const earY = headY + d.headRadius * s * 0.75;
    const elM = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.6, earY, 0);
    const erM = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.6, earY, 0);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0);
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0);

    // Bushy tail — S-curve of overlapping spheres behind (body material)
    const tailR = d.tailRadius * s;
    const tail1 = new THREE.SphereGeometry(tailR * 1.0, 8, 8);
    const t1M = new THREE.Matrix4().makeTranslation(0, torsoY - s * 0.05, -d.torsoDepth * s * 0.45);
    geometries.push(tail1); transforms.push(t1M); materialIndices.push(0);

    const tail2 = new THREE.SphereGeometry(tailR * 1.2, 8, 8);
    const t2M = new THREE.Matrix4().makeTranslation(0, torsoY + s * 0.08, -d.torsoDepth * s * 0.55 - tailR * 0.8);
    geometries.push(tail2); transforms.push(t2M); materialIndices.push(0);

    const tail3 = new THREE.SphereGeometry(tailR * 1.4, 8, 8);
    const t3M = new THREE.Matrix4().makeTranslation(0, torsoY + s * 0.25, -d.torsoDepth * s * 0.50 - tailR * 1.2);
    geometries.push(tail3); transforms.push(t3M); materialIndices.push(0);

    const tail4 = new THREE.SphereGeometry(tailR * 1.2, 8, 8);
    const t4M = new THREE.Matrix4().makeTranslation(0, torsoY + s * 0.42, -d.torsoDepth * s * 0.40 - tailR * 0.8);
    geometries.push(tail4); transforms.push(t4M); materialIndices.push(0);

    const tail5 = new THREE.SphereGeometry(tailR * 0.9, 8, 8);
    const t5M = new THREE.Matrix4().makeTranslation(0, torsoY + s * 0.55, -d.torsoDepth * s * 0.30 - tailR * 0.3);
    geometries.push(tail5); transforms.push(t5M); materialIndices.push(0);

    // Tiny arm nubs on torso sides (body material)
    const armNubGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.25, d.limbThickness * s * 0.2, s * 0.15, 5, 1);
    const anLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.45, torsoY + s * 0.05, 0);
    const anRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.45, torsoY + s * 0.05, 0);
    geometries.push(armNubGeo); transforms.push(anLM); materialIndices.push(0);
    geometries.push(armNubGeo); transforms.push(anRM); materialIndices.push(0);

    // Upper legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.60 - s * 0.15, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.60 - s * 0.15, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.60 - s * 0.45, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.60 - s * 0.45, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
}

function _buildBearGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Stocky wide torso (body material)
    const torsoH = d.torsoHeight * s * 0.4;
    const torsoY = s * (0.85 + 0.22 + 0.15);
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, torsoH, d.torsoDepth * s, 4, 4, 4);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Belly sphere (body material) — round bear belly
    const belly = new THREE.SphereGeometry(d.bellyRadius * s, 12, 10);
    const bM = new THREE.Matrix4().makeTranslation(0, torsoY - s * 0.08, s * 0.28);
    geometries.push(belly); transforms.push(bM); materialIndices.push(0);

    // Head — round (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.85 + 0.22 + 0.30 + 0.30);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Small round ears on top of head (body material)
    const earGeo = new THREE.SphereGeometry(d.earSize * s * 0.8, 6, 6);
    const earY = headY + d.headRadius * s * 0.8;
    const elM = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.6, earY, 0);
    const erM = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.6, earY, 0);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0);
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0);

    // Short snout (body material)
    const snout = new THREE.CylinderGeometry(d.snoutLength * s * 0.45, d.snoutLength * s * 0.55, d.snoutLength * s, 6, 1);
    const snM = new THREE.Matrix4()
        .makeRotationX(Math.PI * 0.5)
        .setPosition(0, headY - d.headRadius * s * 0.15, d.headRadius * s * 0.85);
    geometries.push(snout); transforms.push(snM); materialIndices.push(0);

    // Upper arms — thick (body material)
    const armX = d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25;
    const shoulderY = torsoY + torsoH * 0.3;
    const upperArmLen = s * 0.35;
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.5, d.limbThickness * s * 0.42, upperArmLen, 6, 2);
    const uaY = shoulderY - upperArmLen * 0.15;
    const uaLM = new THREE.Matrix4().makeTranslation(-armX, uaY, 0);
    const uaRM = new THREE.Matrix4().makeTranslation(armX, uaY, 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    // Forearms — thick (body material)
    const forearmLen = s * 0.30;
    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.36, forearmLen, 6, 2);
    const faY = uaY - upperArmLen * 0.5 - forearmLen * 0.35;
    const faLM = new THREE.Matrix4().makeTranslation(-armX, faY, 0);
    const faRM = new THREE.Matrix4().makeTranslation(armX, faY, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Stocky upper legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.58, d.limbThickness * s * 0.50, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Sturdy lower legs (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.50, d.limbThickness * s * 0.45, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // Feet — big bear paws (legs material)
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.7, d.limbThickness * s * 0.28, d.limbThickness * s * 0.9, 2, 2, 2);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.84, s * 0.05);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.84, s * 0.05);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    // boneNames: torso, belly, head, earL, earR, snout, uaL, uaR, faL, faR, ulL, ulR, llL, llR, footL, footR
    const boneNames = [null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildFoxGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Sleek, lean torso (body material)
    const torsoH = d.torsoHeight * s * 0.35;
    const torsoY = s * (0.75 + 0.25 + 0.15);
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, torsoH, d.torsoDepth * s, 3, 4, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Cream/white chest patch on front of torso (skin material)
    const chestPatch = new THREE.BoxGeometry(d.torsoWidth * s * 0.55, torsoH * 0.65, d.torsoDepth * s * 0.12, 2, 2, 1);
    const cpM = new THREE.Matrix4().makeTranslation(0, torsoY - s * 0.02, d.torsoDepth * s * 0.48);
    geometries.push(chestPatch); transforms.push(cpM); materialIndices.push(1);

    // Head — pointed triangular shape (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.75 + 0.25 + 0.30 + 0.18 + 0.22);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Pointed snout — cone (skin material)
    const snout = new THREE.ConeGeometry(d.snoutLength * s * 0.35, d.snoutLength * s * 1.2, 6);
    const snM = new THREE.Matrix4()
        .makeRotationX(Math.PI * 0.5)
        .setPosition(0, headY - d.headRadius * s * 0.25, d.headRadius * s * 0.85 + d.snoutLength * s * 0.3);
    geometries.push(snout); transforms.push(snM); materialIndices.push(1);

    // Large pointed ears — triangular (body material)
    const earGeo = new THREE.ConeGeometry(d.earSize * s * 0.45, d.earSize * s * 1.5, 6);
    const earY = headY + d.headRadius * s * 0.7;
    const elM = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.55, earY, 0);
    const erM = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.55, earY, 0);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0);
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0);

    // Fluffy tail — 4 overlapping spheres curving up (body material)
    const tailR = d.tailRadius * s;
    const tailBase = torsoY - s * 0.05;
    const tail1 = new THREE.SphereGeometry(tailR * 1.0, 8, 8);
    const ft1M = new THREE.Matrix4().makeTranslation(0, tailBase, -d.torsoDepth * s * 0.45);
    geometries.push(tail1); transforms.push(ft1M); materialIndices.push(0);

    const tail2 = new THREE.SphereGeometry(tailR * 1.3, 8, 8);
    const ft2M = new THREE.Matrix4().makeTranslation(0, tailBase + s * 0.08, -d.torsoDepth * s * 0.55 - tailR * 0.8);
    geometries.push(tail2); transforms.push(ft2M); materialIndices.push(0);

    const tail3 = new THREE.SphereGeometry(tailR * 1.4, 8, 8);
    const ft3M = new THREE.Matrix4().makeTranslation(0, tailBase + s * 0.20, -d.torsoDepth * s * 0.50 - tailR * 1.3);
    geometries.push(tail3); transforms.push(ft3M); materialIndices.push(0);

    const tail4 = new THREE.SphereGeometry(tailR * 1.1, 8, 8);
    const ft4M = new THREE.Matrix4().makeTranslation(0, tailBase + s * 0.35, -d.torsoDepth * s * 0.40 - tailR * 1.0);
    geometries.push(tail4); transforms.push(ft4M); materialIndices.push(0);

    // Arms — thin (body material)
    const armX = d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.3;
    const shoulderY = torsoY + torsoH * 0.35;
    const upperArmLen = s * 0.35;
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.32, upperArmLen, 6, 2);
    const uaY = shoulderY - upperArmLen * 0.15;
    const uaLM = new THREE.Matrix4().makeTranslation(-armX, uaY, 0);
    const uaRM = new THREE.Matrix4().makeTranslation(armX, uaY, 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    // Forearms — thin (body material)
    const forearmLen = s * 0.28;
    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.32, d.limbThickness * s * 0.25, forearmLen, 6, 2);
    const faY = uaY - upperArmLen * 0.5 - forearmLen * 0.35;
    const faLM = new THREE.Matrix4().makeTranslation(-armX, faY, 0);
    const faRM = new THREE.Matrix4().makeTranslation(armX, faY, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Thin upper legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.36, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.75 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.75 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Thin lower legs (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.36, d.limbThickness * s * 0.30, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.75 - s * 0.58, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.75 - s * 0.58, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // boneNames: torso, chestPatch, head, snout, earL, earR, tail1-4, uaL, uaR, faL, faR, ulL, ulR, llL, llR
    const boneNames = [null, null, null, null, null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildMooseGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Large, powerful torso (body material)
    const torsoH = d.torsoHeight * s * 0.4;
    const torsoY = s * (0.85 + 0.25 + 0.16);
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, torsoH, d.torsoDepth * s, 4, 4, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.85 + 0.25 + 0.32 + 0.22 + 0.22);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Droopy muzzle/snout (skin material)
    const snout = new THREE.BoxGeometry(d.snoutLength * s * 1.2, d.snoutLength * s * 0.8, d.snoutLength * s * 1.5, 2, 2, 2);
    const snM = new THREE.Matrix4().makeTranslation(0, headY - d.headRadius * s * 0.45, d.headRadius * s * 0.75);
    geometries.push(snout); transforms.push(snM); materialIndices.push(1);

    // HUGE palmate antlers — flat, wide, branching (body material) — the signature feature
    const antlerW = d.antlerSize * s * 1.2;
    const antlerH = d.antlerSize * s * 0.8;
    const antlerD = d.antlerSize * s * 0.12; // flat!

    // Left palmate antler — flat wide plate
    const antlerLGeo = new THREE.BoxGeometry(antlerW, antlerH, antlerD, 3, 3, 1);
    const antlerLY = headY + d.headRadius * s * 0.6 + antlerH * 0.4;
    const alM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.15)
        .setPosition(-d.headRadius * s * 0.5 - antlerW * 0.35, antlerLY, 0);
    geometries.push(antlerLGeo); transforms.push(alM); materialIndices.push(0);

    // Right palmate antler — flat wide plate
    const antlerRGeo = new THREE.BoxGeometry(antlerW, antlerH, antlerD, 3, 3, 1);
    const arM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.15)
        .setPosition(d.headRadius * s * 0.5 + antlerW * 0.35, antlerLY, 0);
    geometries.push(antlerRGeo); transforms.push(arM); materialIndices.push(0);

    // Antler tines — vertical prongs on top of palmate plates (body material)
    const tineGeo = new THREE.CylinderGeometry(d.antlerSize * s * 0.04, d.antlerSize * s * 0.06, d.antlerSize * s * 0.4, 4, 1);
    const tineTopY = antlerLY + antlerH * 0.35;
    // Left antler tines (3)
    const lt1M = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.5 - antlerW * 0.15, tineTopY, 0);
    const lt2M = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.5 - antlerW * 0.45, tineTopY, 0);
    const lt3M = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.5 - antlerW * 0.65, tineTopY - d.antlerSize * s * 0.1, 0);
    geometries.push(tineGeo); transforms.push(lt1M); materialIndices.push(0);
    geometries.push(tineGeo); transforms.push(lt2M); materialIndices.push(0);
    geometries.push(tineGeo); transforms.push(lt3M); materialIndices.push(0);
    // Right antler tines (3)
    const rt1M = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.5 + antlerW * 0.15, tineTopY, 0);
    const rt2M = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.5 + antlerW * 0.45, tineTopY, 0);
    const rt3M = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.5 + antlerW * 0.65, tineTopY - d.antlerSize * s * 0.1, 0);
    geometries.push(tineGeo); transforms.push(rt1M); materialIndices.push(0);
    geometries.push(tineGeo); transforms.push(rt2M); materialIndices.push(0);
    geometries.push(tineGeo); transforms.push(rt3M); materialIndices.push(0);

    // Small ears behind antlers (body material)
    const earGeo = new THREE.ConeGeometry(d.earSize * s * 0.5, d.earSize * s * 1.0, 5);
    const earY = headY + d.headRadius * s * 0.5;
    const elM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.2)
        .setPosition(-d.headRadius * s * 0.8, earY, -d.headRadius * s * 0.3);
    const erM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.2)
        .setPosition(d.headRadius * s * 0.8, earY, -d.headRadius * s * 0.3);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0);
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0);

    // Strong upper arms (body material)
    const armX = d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25;
    const shoulderY = torsoY + torsoH * 0.3;
    const upperArmLen = s * 0.38;
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.48, d.limbThickness * s * 0.38, upperArmLen, 6, 2);
    const uaY = shoulderY - upperArmLen * 0.15;
    const uaLM = new THREE.Matrix4().makeTranslation(-armX, uaY, 0);
    const uaRM = new THREE.Matrix4().makeTranslation(armX, uaY, 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    // Forearms (body material)
    const forearmLen = s * 0.30;
    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.38, d.limbThickness * s * 0.30, forearmLen, 6, 2);
    const faY = uaY - upperArmLen * 0.5 - forearmLen * 0.35;
    const faLM = new THREE.Matrix4().makeTranslation(-armX, faY, 0);
    const faRM = new THREE.Matrix4().makeTranslation(armX, faY, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Powerful upper legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.52, d.limbThickness * s * 0.46, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.46, d.limbThickness * s * 0.40, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.62, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.62, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // Feet — big hooves (legs material)
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.6, d.limbThickness * s * 0.25, d.limbThickness * s * 0.8, 2, 2, 2);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.88, s * 0.08);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.88, s * 0.08);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    // boneNames: torso, head, snout, antlerL, antlerR, tineL1-3, tineR1-3, earL, earR, uaL, uaR, faL, faR, ulL, ulR, llL, llR, footL, footR
    const boneNames = [null, null, null, null, null, null, null, null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildRaccoonGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Chubby compact torso (body material)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.35, d.torsoDepth * s, 3, 3, 3);
    const torsoY = s * (0.65 + 0.18 + 0.12);
    const tM = new THREE.Matrix4().makeTranslation(0, torsoY, 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head — round, lighter cream face (skin material)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.65 + 0.18 + 0.22 + 0.14 + 0.18);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Dark eye mask — horizontal box across face (body material — darker color)
    const mask = new THREE.BoxGeometry(d.maskWidth * s * 2, d.headRadius * s * 0.35, d.headRadius * s * 0.55, 2, 2, 2);
    const maskM = new THREE.Matrix4().makeTranslation(0, headY + d.headRadius * s * 0.08, d.headRadius * s * 0.55);
    geometries.push(mask); transforms.push(maskM); materialIndices.push(0);

    // Small rounded ears (body material)
    const earGeo = new THREE.SphereGeometry(d.earSize * s * 0.7, 6, 6);
    const earY = headY + d.headRadius * s * 0.8;
    const elM = new THREE.Matrix4().makeTranslation(-d.headRadius * s * 0.55, earY, 0);
    const erM = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.55, earY, 0);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0);
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0);

    // Striped tail — alternating dark/light cylinder segments (body material for all — visible stripe from geometry shape)
    const tailR = d.tailRadius * s;
    const segH = d.tailLength * s * 0.18;
    const tailBaseZ = -d.torsoDepth * s * 0.45;
    // 5 segments going upward/backward
    for (let i = 0; i < 5; i++) {
        const segGeo = new THREE.CylinderGeometry(tailR * (1.1 - i * 0.05), tailR * (1.15 - i * 0.05), segH, 6, 1);
        const segY = torsoY - s * 0.08 + i * segH * 0.7 + i * s * 0.03;
        const segZ = tailBaseZ - i * tailR * 0.4;
        const segM = new THREE.Matrix4().makeTranslation(0, segY, segZ);
        geometries.push(segGeo); transforms.push(segM); materialIndices.push(0);
    }

    // Upper legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.65 - s * 0.16, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.65 - s * 0.16, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs material)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.65 - s * 0.48, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.65 - s * 0.48, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
}


// ─── Geometry builder map ───
const _geometryBuilders = {
    polite: _buildPoliteKnockerGeometry,
    dancer: _buildPeeDancerGeometry,
    waddle: _buildWaddleTankGeometry,
    panicker: _buildPanickerGeometry,
    powerwalker: _buildPowerWalkerGeometry,
    girls: _buildGirlsGeometry,
    // Forest
    deer: _buildDeerGeometry,
    squirrel: _buildSquirrelGeometry,
    bear: _buildBearGeometry,
    fox: _buildFoxGeometry,
    moose: _buildMooseGeometry,
    raccoon: _buildRaccoonGeometry,
};


// ═══════════════════════════════════════════════════════
// Auto-skinning — assign skinIndex/skinWeight by proximity
// ═══════════════════════════════════════════════════════

function _computeSkinWeights(geometry, bones, boneMap, enemyType, size, vertexBoneMap) {
    const posAttr = geometry.getAttribute('position');
    const vertCount = posAttr.count;

    const skinIndices = new Float32Array(vertCount * 4);
    const skinWeights = new Float32Array(vertCount * 4);

    // Get world positions of all bones
    const boneWorldPositions = [];
    const tempVec = new THREE.Vector3();

    for (let i = 0; i < bones.length; i++) {
        bones[i].updateWorldMatrix(true, false);
        tempVec.setFromMatrixPosition(bones[i].matrixWorld);
        boneWorldPositions.push(tempVec.clone());
    }

    const vertPos = new THREE.Vector3();

    for (let v = 0; v < vertCount; v++) {
        vertPos.set(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));

        // Find 2 nearest bones
        let best1 = { idx: 0, dist: Infinity };
        let best2 = { idx: 0, dist: Infinity };

        for (let b = 0; b < bones.length; b++) {
            const dist = vertPos.distanceTo(boneWorldPositions[b]);
            if (dist < best1.dist) {
                best2 = { ...best1 };
                best1 = { idx: b, dist };
            } else if (dist < best2.dist) {
                best2 = { idx: b, dist };
            }
        }

        // Inverse-distance weights
        const d1 = Math.max(best1.dist, 0.001);
        const d2 = Math.max(best2.dist, 0.001);
        const w1 = 1.0 / d1;
        const w2 = 1.0 / d2;
        const totalW = w1 + w2;

        const idx = v * 4;
        skinIndices[idx] = best1.idx;
        skinIndices[idx + 1] = best2.idx;
        skinIndices[idx + 2] = 0;
        skinIndices[idx + 3] = 0;

        skinWeights[idx] = w1 / totalW;
        skinWeights[idx + 1] = w2 / totalW;
        skinWeights[idx + 2] = 0;
        skinWeights[idx + 3] = 0;
    }

    // Override: belly vertices go 100% to belly bone (if it exists)
    if (boneMap.belly) {
        const bellyIdx = bones.indexOf(boneMap.belly);
        if (bellyIdx >= 0) {
            const bellyWorldPos = boneWorldPositions[bellyIdx];
            const bellyRadius = (ENEMY_VISUAL_CONFIG[enemyType].bodyDimensions.bellyRadius || 0.45) * size * 1.2;

            for (let v = 0; v < vertCount; v++) {
                vertPos.set(posAttr.getX(v), posAttr.getY(v), posAttr.getZ(v));
                if (vertPos.distanceTo(bellyWorldPos) < bellyRadius) {
                    const idx = v * 4;
                    skinIndices[idx] = bellyIdx;
                    skinIndices[idx + 1] = bellyIdx;
                    skinWeights[idx] = 1.0;
                    skinWeights[idx + 1] = 0.0;
                }
            }
        }
    }

    // Override: explicitly assigned bone weights (arms, forearms)
    if (vertexBoneMap) {
        for (let v = 0; v < vertCount; v++) {
            const boneName = vertexBoneMap[v];
            if (boneName) {
                const bone = boneMap[boneName];
                if (bone) {
                    const boneIdx = bones.indexOf(bone);
                    if (boneIdx >= 0) {
                        const idx = v * 4;
                        skinIndices[idx] = boneIdx;
                        skinIndices[idx + 1] = boneIdx;
                        skinWeights[idx] = 1.0;
                        skinWeights[idx + 1] = 0.0;
                    }
                }
            }
        }
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(
        new Uint16Array(skinIndices), 4
    ));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}


// ─── Utility: round box edges ───
function _roundifyBox(geometry, radius) {
    const pos = geometry.attributes.position;
    const tempVec = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
        tempVec.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        const len = tempVec.length();
        if (len > 0) {
            tempVec.normalize().multiplyScalar(len + radius * (1 - Math.abs(tempVec.x / len) * Math.abs(tempVec.y / len)));
        }
        pos.setXYZ(i, tempVec.x, tempVec.y, tempVec.z);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
}

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
    const { geometries, transforms, materialIndices } = builder(size, config);

    // 4. We need to merge geometry per material group
    // Group geometry by material index: 0=body, 1=skin, 2=legs
    const groups = { 0: { geoms: [], xforms: [] }, 1: { geoms: [], xforms: [] }, 2: { geoms: [], xforms: [] } };
    for (let i = 0; i < geometries.length; i++) {
        const mi = materialIndices[i];
        groups[mi].geoms.push(geometries[i]);
        groups[mi].xforms.push(transforms[i]);
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
    _computeSkinWeights(finalGeometry, bones, boneMap, enemyType, size);

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

    return { geometries, transforms, materialIndices };
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

    // Wide rounded torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.4, d.torsoDepth * s, 4, 4, 4);
    _roundifyBox(torso, 0.15 * s);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.20 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Extended belly sphere (body)
    const belly = new THREE.SphereGeometry(d.bellyRadius * s, 12, 10);
    const bM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.20 - 0.10), s * 0.30);
    geometries.push(belly); transforms.push(bM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.20 + 0.30 + 0.30), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Arms (body) — with forearms
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, s * 0.35, 6, 2);
    const uaLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.55, s * (0.80 + 0.20 + 0.15), 0);
    const uaRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.55, s * (0.80 + 0.20 + 0.15), 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.3, s * 0.30, 6, 2);
    const faLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.55, s * (0.80 + 0.20 + 0.15) - s * 0.32, 0);
    const faRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.55, s * (0.80 + 0.20 + 0.15) - s * 0.32, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Wide-set legs (legs material)
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

    // Feet (legs material)
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.6, d.limbThickness * s * 0.25, d.limbThickness * s * 0.8, 2, 2, 2);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 1.0, s * 0.05);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 1.0, s * 0.05);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
}

function _buildPanickerGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Elongated thin torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.45, d.torsoDepth * s * 0.8, 3, 4, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.30 + 0.18), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.30 + 0.35 + 0.20 + 0.25), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Long arms with forearms (body) — exaggerated length
    const upperArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.3, s * 0.40, 6, 2);
    const uaLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.2, s * (0.80 + 0.30 + 0.35) + s * 0.10, 0);
    const uaRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.2, s * (0.80 + 0.30 + 0.35) + s * 0.10, 0);
    geometries.push(upperArmGeo); transforms.push(uaLM); materialIndices.push(0);
    geometries.push(upperArmGeo); transforms.push(uaRM); materialIndices.push(0);

    const forearmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.3, d.limbThickness * s * 0.25, s * 0.35, 6, 2);
    const faLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.2, s * (0.80 + 0.30 + 0.35) + s * 0.45, 0);
    const faRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.2, s * (0.80 + 0.30 + 0.35) + s * 0.45, 0);
    geometries.push(forearmGeo); transforms.push(faLM); materialIndices.push(0);
    geometries.push(forearmGeo); transforms.push(faRM); materialIndices.push(0);

    // Narrow legs (legs material)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.3, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
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

    // Feet (legs material)
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.55, d.limbThickness * s * 0.2, d.limbThickness * s * 0.7, 2, 2, 2);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 1.0, s * 0.10);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 1.0, s * 0.10);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
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


// ─── Geometry builder map ───
const _geometryBuilders = {
    polite: _buildPoliteKnockerGeometry,
    dancer: _buildPeeDancerGeometry,
    waddle: _buildWaddleTankGeometry,
    panicker: _buildPanickerGeometry,
    powerwalker: _buildPowerWalkerGeometry,
    girls: _buildGirlsGeometry,
};


// ═══════════════════════════════════════════════════════
// Auto-skinning — assign skinIndex/skinWeight by proximity
// ═══════════════════════════════════════════════════════

function _computeSkinWeights(geometry, bones, boneMap, enemyType, size) {
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

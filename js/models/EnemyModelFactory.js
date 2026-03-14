// Enemy Model Factory — builds enemy meshes
// Supports two pipelines:
//   1. Rigid body parts (new) — each part is a Mesh parented to its bone. No skinning.
//   2. Legacy skinned mesh — merge + auto-skin (for types not yet migrated).

import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';
import { createSkeleton } from '../animation/SkeletonFactory.js';
import { createEnemyMaterials, createRigidEnemyMaterials } from './EnemyMaterials.js';
import { mergeGeometries } from '../utils/geometryUtils.js';
import { createCapsule, createRoundedBox, createFlatCap } from '../utils/characterGeometry.js';

// Types that use the new rigid body parts pipeline
const RIGID_TYPES = new Set(['polite']);

/**
 * Create a fully rigged enemy model.
 * Routes to rigid-body or legacy pipeline based on enemy type.
 *
 * @param {string} enemyType - Key into ENEMY_VISUAL_CONFIG
 * @param {number|THREE.Color} color - Body color override
 * @param {boolean} isDesperate - Apply desperate tint
 * @param {number} size - Scale factor (defaults to config size)
 * @returns {{ group, skinnedMesh, skeleton, boneMap, outlineMesh, materials, parts }}
 */
export function createEnemyModel(enemyType, color, isDesperate, size) {
    if (RIGID_TYPES.has(enemyType)) {
        return _createRigidModel(enemyType, color, isDesperate, size);
    }
    return _createLegacyModel(enemyType, color, isDesperate, size);
}


// ═══════════════════════════════════════════════════════
// NEW: Rigid Body Parts Pipeline
// Each body part = separate Mesh parented to its bone.
// No SkinnedMesh, no skin weights, no deformation artifacts.
// ═══════════════════════════════════════════════════════

function _createRigidModel(enemyType, color, isDesperate, size) {
    const config = ENEMY_VISUAL_CONFIG[enemyType];
    if (!config) throw new Error(`EnemyModelFactory: unknown enemy type "${enemyType}"`);

    size = size !== undefined ? size : config.size;

    // 1. Build skeleton (same as before — bones are Object3D hierarchy)
    const { bones, rootBone, boneMap } = createSkeleton(enemyType, size);

    // 2. Build materials for rigid parts (no skinning needed)
    const materials = createRigidEnemyMaterials(enemyType, color, isDesperate);

    // 3. Build body parts and parent to bones
    const builder = _rigidBuilders[enemyType];
    if (!builder) throw new Error(`EnemyModelFactory: no rigid builder for "${enemyType}"`);

    const parts = builder(size, config, materials, boneMap);

    // 4. Create outline meshes for each visible part
    const outlineWidth = _outlineWidthForRigidType(enemyType);
    const outlineParts = [];
    for (const [partName, mesh] of Object.entries(parts)) {
        if (!mesh || !mesh.geometry) continue;
        const outlineGeo = mesh.geometry.clone();
        const outlineMat = materials.outline.clone();
        const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
        outlineMesh.name = partName + '_outline';
        // Position/rotation matches the part mesh (both parented to same bone)
        outlineMesh.position.copy(mesh.position);
        outlineMesh.rotation.copy(mesh.rotation);
        outlineMesh.scale.copy(mesh.scale);
        mesh.parent.add(outlineMesh);
        outlineParts.push(outlineMesh);
    }

    // 5. Wrap in group
    const group = new THREE.Group();
    group.add(rootBone);

    // 6. Build a Skeleton object for AnimationController compatibility
    const skeleton = new THREE.Skeleton(bones);

    // 7. Backward-compatible "skinnedMesh" shim for index.html uniform access.
    //    This is a lightweight proxy — not an actual SkinnedMesh.
    const allPartMaterials = Object.values(parts)
        .filter(m => m && m.material)
        .map(m => m.material);
    const materialShim = {
        material: allPartMaterials,
        // For AnimationMixer — it needs to call .traverse() on the root
        skeleton: skeleton,
    };

    return {
        group,
        skinnedMesh: materialShim,    // Shim — Array.isArray(mats) checks still work
        skeleton,
        boneMap,
        outlineMesh: null,             // No single outline mesh; outlines are per-part
        outlineParts,                  // Array of outline meshes for LOD toggling
        materials,
        parts,
        animRoot: rootBone,            // For AnimationMixer (new path)
        isRigid: true,                 // Flag for code that needs to distinguish
    };
}

function _outlineWidthForRigidType(type) {
    const map = { polite: 0.03, dancer: 0.025, waddle: 0.04, panicker: 0.03, powerwalker: 0.03, girls: 0.02 };
    return map[type] || 0.03;
}


// ═══════════════════════════════════════════════════════
// Rigid body part builders — one per migrated type
// Each returns a parts object: { torso: Mesh, head: Mesh, armL: Mesh, ... }
// ═══════════════════════════════════════════════════════

function _buildRigidPoliteKnocker(size, config, materials, boneMap) {
    const s = size;
    const parts = {};

    // ══════════════════════════════════════════════════════════════
    // BONE WORLD Y POSITIONS (with size=1.5):
    //   root=1.2, spine=1.575, chest=2.025, neck=2.325, head=2.7
    //   upperLeg=1.125, lowerLeg=0.645
    //
    // KEY INSIGHT: torso must bridge from chest area down to hip area.
    // Parent torso to SPINE (y≈1.575) so it extends both up and down.
    // ══════════════════════════════════════════════════════════════

    // Bone-local offset from spine to root ≈ -0.25*s (spine offset from root)
    // Bone-local offset from spine to chest ≈ +0.30*s (chest offset from spine)
    // Torso needs to cover this full range plus a little overlap at each end.
    const spineToRoot = 0.25 * s;  // how far below spine the root is
    const spineToChest = 0.30 * s; // how far above spine the chest is

    // ═══ TORSO: tall rounded box that bridges from shoulders to hips ═══
    const torsoW = 0.42 * s;  // narrow enough that arms don't clip
    const torsoH = (spineToRoot + spineToChest) * 1.15;  // covers full spine-to-chest plus overlap
    const torsoD = 0.32 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.07 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    // Center slightly above spine midpoint (biased toward chest for natural look)
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: clean sphere, no hat — keep it simple and readable ═══
    const headR = 0.28 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.92, 0.97);  // slightly oblate
    boneMap.head.add(head);
    parts.head = head;

    // Small hair tuft on top — subtle identity marker
    const tuftGeo = new THREE.SphereGeometry(headR * 0.35, 6, 5);
    const tuft = new THREE.Mesh(tuftGeo, materials.body);
    tuft.name = 'tuft';
    tuft.position.set(0, headR * 0.75, -headR * 0.1);
    tuft.scale.set(1.2, 0.5, 1.0);
    boneMap.head.add(tuft);
    parts.tuft = tuft;

    // ═══ FACE: Mii-style — dot eyes, worried brows, grimace mouth ═══
    // Use simple MeshBasicMaterial (outline shader won't render front faces correctly)
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });  // PALETTE.ink

    // Eyes — dark spheres on the front of the head, big enough to read from top-down
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * 0.05;
    const eyeZ = -headR * 0.90;  // front of head (faces -Z, toward camera)

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 1.3, 0.5);  // tall ovals, flattened into head
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, 1.3, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Eyebrows — worried angle (/\)
    const browGeo = new THREE.BoxGeometry(headR * 0.24, headR * 0.045, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, 0.30);  // angled worried
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, -0.30);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — small worried line
    const mouthGeo = new THREE.BoxGeometry(headR * 0.22, headR * 0.04, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.22, eyeZ - headR * 0.02);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ ARMS: chunky capsules — hang mostly DOWN, animation angles them to groin ═══
    // Keep mesh centered near the bone. The ANIMATION rotation (moderate forward + inward)
    // swings the arm down-and-in so hands end up at the crotch.
    const armRadius = 0.065 * s;
    const armLength = 0.50 * s;  // long enough to reach from shoulder to groin
    const armGeo = createCapsule(armRadius, armLength, 8, 4);

    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);  // centered below bone
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.body);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // Hands — small skin spheres at arm tips
    const handGeo = new THREE.SphereGeometry(armRadius * 1.1, 6, 5);

    const handL = new THREE.Mesh(handGeo, materials.skin);
    handL.name = 'handL';
    handL.position.set(0, -armLength * 0.88, 0);
    boneMap.upperArm_L.add(handL);
    parts.handL = handL;

    const handR = new THREE.Mesh(handGeo, materials.skin);
    handR.name = 'handR';
    handR.position.set(0, -armLength * 0.88, 0);
    boneMap.upperArm_R.add(handR);
    parts.handR = handR;

    // ═══ UPPER LEGS: thick capsules that start right at the hip ═══
    const upperLegRadius = 0.095 * s;
    const upperLegH = 0.34 * s;
    const upperLegGeo = createCapsule(upperLegRadius, upperLegH, 8, 4);

    const upperLegL = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegL.name = 'upperLegL';
    upperLegL.position.set(0, -upperLegH * 0.3, 0);  // offset down from bone
    boneMap.upperLeg_L.add(upperLegL);
    parts.upperLegL = upperLegL;

    const upperLegR = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegR.name = 'upperLegR';
    upperLegR.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_R.add(upperLegR);
    parts.upperLegR = upperLegR;

    // ═══ LOWER LEGS: slightly slimmer ═══
    const lowerLegRadius = 0.08 * s;
    const lowerLegH = 0.32 * s;
    const lowerLegGeo = createCapsule(lowerLegRadius, lowerLegH, 8, 4);

    const lowerLegL = new THREE.Mesh(lowerLegGeo, materials.legs);
    lowerLegL.name = 'lowerLegL';
    lowerLegL.position.set(0, -lowerLegH * 0.35, 0);
    boneMap.lowerLeg_L.add(lowerLegL);
    parts.lowerLegL = lowerLegL;

    const lowerLegR = new THREE.Mesh(lowerLegGeo, materials.legs);
    lowerLegR.name = 'lowerLegR';
    lowerLegR.position.set(0, -lowerLegH * 0.35, 0);
    boneMap.lowerLeg_R.add(lowerLegR);
    parts.lowerLegR = lowerLegR;

    // ═══ SHOES: little rounded blocks ═══
    const shoeGeo = createRoundedBox(0.11 * s, 0.05 * s, 0.15 * s, 0.02 * s);

    const shoeL = new THREE.Mesh(shoeGeo, materials.legs);
    shoeL.name = 'shoeL';
    shoeL.position.set(0, -lowerLegH * 0.72, 0.02 * s);
    boneMap.lowerLeg_L.add(shoeL);
    parts.shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo, materials.legs);
    shoeR.name = 'shoeR';
    shoeR.position.set(0, -lowerLegH * 0.72, 0.02 * s);
    boneMap.lowerLeg_R.add(shoeR);
    parts.shoeR = shoeR;

    return parts;
}

const _rigidBuilders = {
    polite: _buildRigidPoliteKnocker,
};


// ═══════════════════════════════════════════════════════
// LEGACY: Skinned Mesh Pipeline (unchanged — for non-migrated types)
// ═══════════════════════════════════════════════════════

function _createLegacyModel(enemyType, color, isDesperate, size) {
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

    return { group, skinnedMesh, skeleton, boneMap, outlineMesh, materials, isRigid: false };
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
// Forest enemy geometry builders — quadruped animals
// Orientation: -Z forward (toward toilet), +Z backward, Y up
// Horizontal spine with 4 legs, species-appropriate bodies
// ═══════════════════════════════════════════════════════

// Helper: compute world positions of all bones by tracing the bone chain
function _quadBoneWorldPos(bp, s) {
    const w = {};
    w.root     = { x: bp.root.x * s, y: bp.root.y * s, z: bp.root.z * s };
    w.pelvis   = { x: w.root.x + bp.pelvis.x * s, y: w.root.y + bp.pelvis.y * s, z: w.root.z + bp.pelvis.z * s };
    w.spine_mid = { x: w.pelvis.x + bp.spine_mid.x * s, y: w.pelvis.y + bp.spine_mid.y * s, z: w.pelvis.z + bp.spine_mid.z * s };
    w.chest    = { x: w.spine_mid.x + bp.chest.x * s, y: w.spine_mid.y + bp.chest.y * s, z: w.spine_mid.z + bp.chest.z * s };
    // Neck chain from chest
    w.neck_01  = bp.neck_01 ? { x: w.chest.x + bp.neck_01.x * s, y: w.chest.y + bp.neck_01.y * s, z: w.chest.z + bp.neck_01.z * s } : null;
    const neckBase = w.neck_01 || w.chest;
    w.neck_02  = bp.neck_02 ? { x: neckBase.x + bp.neck_02.x * s, y: neckBase.y + bp.neck_02.y * s, z: neckBase.z + bp.neck_02.z * s } : null;
    const headParent = w.neck_02 || w.neck_01 || w.chest;
    w.head     = bp.head ? { x: headParent.x + bp.head.x * s, y: headParent.y + bp.head.y * s, z: headParent.z + bp.head.z * s } : null;
    // Scapulae from chest
    w.scapula_L = bp.scapula_L ? { x: w.chest.x + bp.scapula_L.x * s, y: w.chest.y + bp.scapula_L.y * s, z: w.chest.z + bp.scapula_L.z * s } : null;
    w.scapula_R = bp.scapula_R ? { x: w.chest.x + bp.scapula_R.x * s, y: w.chest.y + bp.scapula_R.y * s, z: w.chest.z + bp.scapula_R.z * s } : null;
    // Front legs — parent is scapula if present, otherwise chest
    const flParentL = w.scapula_L || w.chest;
    const flParentR = w.scapula_R || w.chest;
    w.frontUpperLeg_L = bp.frontUpperLeg_L ? { x: flParentL.x + bp.frontUpperLeg_L.x * s, y: flParentL.y + bp.frontUpperLeg_L.y * s, z: flParentL.z + bp.frontUpperLeg_L.z * s } : null;
    w.frontUpperLeg_R = bp.frontUpperLeg_R ? { x: flParentR.x + bp.frontUpperLeg_R.x * s, y: flParentR.y + bp.frontUpperLeg_R.y * s, z: flParentR.z + bp.frontUpperLeg_R.z * s } : null;
    w.frontLowerLeg_L = bp.frontLowerLeg_L && w.frontUpperLeg_L ? { x: w.frontUpperLeg_L.x + bp.frontLowerLeg_L.x * s, y: w.frontUpperLeg_L.y + bp.frontLowerLeg_L.y * s, z: w.frontUpperLeg_L.z + bp.frontLowerLeg_L.z * s } : null;
    w.frontLowerLeg_R = bp.frontLowerLeg_R && w.frontUpperLeg_R ? { x: w.frontUpperLeg_R.x + bp.frontLowerLeg_R.x * s, y: w.frontUpperLeg_R.y + bp.frontLowerLeg_R.y * s, z: w.frontUpperLeg_R.z + bp.frontLowerLeg_R.z * s } : null;
    w.frontFoot_L = bp.frontFoot_L && w.frontLowerLeg_L ? { x: w.frontLowerLeg_L.x + bp.frontFoot_L.x * s, y: w.frontLowerLeg_L.y + bp.frontFoot_L.y * s, z: w.frontLowerLeg_L.z + bp.frontFoot_L.z * s } : null;
    w.frontFoot_R = bp.frontFoot_R && w.frontLowerLeg_R ? { x: w.frontLowerLeg_R.x + bp.frontFoot_R.x * s, y: w.frontLowerLeg_R.y + bp.frontFoot_R.y * s, z: w.frontLowerLeg_R.z + bp.frontFoot_R.z * s } : null;
    // Hind legs from pelvis
    w.hindUpperLeg_L = bp.hindUpperLeg_L ? { x: w.pelvis.x + bp.hindUpperLeg_L.x * s, y: w.pelvis.y + bp.hindUpperLeg_L.y * s, z: w.pelvis.z + bp.hindUpperLeg_L.z * s } : null;
    w.hindUpperLeg_R = bp.hindUpperLeg_R ? { x: w.pelvis.x + bp.hindUpperLeg_R.x * s, y: w.pelvis.y + bp.hindUpperLeg_R.y * s, z: w.pelvis.z + bp.hindUpperLeg_R.z * s } : null;
    w.hindLowerLeg_L = bp.hindLowerLeg_L && w.hindUpperLeg_L ? { x: w.hindUpperLeg_L.x + bp.hindLowerLeg_L.x * s, y: w.hindUpperLeg_L.y + bp.hindLowerLeg_L.y * s, z: w.hindUpperLeg_L.z + bp.hindLowerLeg_L.z * s } : null;
    w.hindLowerLeg_R = bp.hindLowerLeg_R && w.hindUpperLeg_R ? { x: w.hindUpperLeg_R.x + bp.hindLowerLeg_R.x * s, y: w.hindUpperLeg_R.y + bp.hindLowerLeg_R.y * s, z: w.hindUpperLeg_R.z + bp.hindLowerLeg_R.z * s } : null;
    w.hindFoot_L = bp.hindFoot_L && w.hindLowerLeg_L ? { x: w.hindLowerLeg_L.x + bp.hindFoot_L.x * s, y: w.hindLowerLeg_L.y + bp.hindFoot_L.y * s, z: w.hindLowerLeg_L.z + bp.hindFoot_L.z * s } : null;
    w.hindFoot_R = bp.hindFoot_R && w.hindLowerLeg_R ? { x: w.hindLowerLeg_R.x + bp.hindFoot_R.x * s, y: w.hindLowerLeg_R.y + bp.hindFoot_R.y * s, z: w.hindLowerLeg_R.z + bp.hindFoot_R.z * s } : null;
    // Tail chain from pelvis
    let tailParent = w.pelvis;
    for (let i = 1; i <= 5; i++) {
        const key = 'tail_0' + i;
        if (bp[key]) {
            w[key] = { x: tailParent.x + bp[key].x * s, y: tailParent.y + bp[key].y * s, z: tailParent.z + bp[key].z * s };
            tailParent = w[key];
        }
    }
    // Belly from spine_mid
    w.belly = bp.belly ? { x: w.spine_mid.x + bp.belly.x * s, y: w.spine_mid.y + bp.belly.y * s, z: w.spine_mid.z + bp.belly.z * s } : null;
    return w;
}

// Helper: midpoint between two positions
function _mid(a, b) { return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5, z: (a.z + b.z) * 0.5 }; }

// Helper: distance between two positions
function _dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2); }

// Helper: add a cylinder limb segment between two world positions
function _addLimb(geometries, transforms, materialIndices, boneNames, topPos, bottomPos, radiusTop, radiusBottom, matIdx, boneName) {
    const len = _dist(topPos, bottomPos);
    if (len < 0.001) return;
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, len, 6, 2);
    const mid = _mid(topPos, bottomPos);
    const m = new THREE.Matrix4().makeTranslation(mid.x, mid.y, mid.z);
    geometries.push(geo); transforms.push(m); materialIndices.push(matIdx); boneNames.push(boneName);
}


function _buildRaccoonGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _quadBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Body: horizontal box between chest and pelvis ---
    const bodyMid = _mid(w.chest, w.pelvis);
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyLen, 3, 3, 3);
    const bodyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyMid.y, bodyMid.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Head: cream-colored round face (skin=1) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Dark mask overlay box across face (body=0) ---
    const maskW = d.maskWidth * s;
    const maskGeo = new THREE.BoxGeometry(maskW * 2.2, headR * 0.35, headR * 0.5, 2, 2, 2);
    const maskM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y + headR * 0.08, w.head.z - headR * 0.6);
    geometries.push(maskGeo); transforms.push(maskM); materialIndices.push(0); boneNames.push('head');

    // --- Small rounded ears ---
    const earR = d.earSize * s * 0.7;
    const earGeo = new THREE.SphereGeometry(earR, 6, 6);
    const earY = w.head.y + headR * 0.75;
    const elM = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.55, earY, w.head.z);
    const erM = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.55, earY, w.head.z);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0); boneNames.push('head');
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0); boneNames.push('head');

    // --- 4 legs (2-segment each), front from chest, hind from pelvis ---
    const lt = d.legThickness * s;
    // Front left
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_L, w.frontLowerLeg_L, lt * 1.1, lt * 0.9, 0, 'frontUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_L, { x: w.frontLowerLeg_L.x, y: w.frontLowerLeg_L.y - lt * 1.5, z: w.frontLowerLeg_L.z }, lt * 0.9, lt * 0.7, 0, 'frontLowerLeg_L');
    // Front right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_R, w.frontLowerLeg_R, lt * 1.1, lt * 0.9, 0, 'frontUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_R, { x: w.frontLowerLeg_R.x, y: w.frontLowerLeg_R.y - lt * 1.5, z: w.frontLowerLeg_R.z }, lt * 0.9, lt * 0.7, 0, 'frontLowerLeg_R');
    // Hind left
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_L, w.hindLowerLeg_L, lt * 1.2, lt * 1.0, 0, 'hindUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_L, { x: w.hindLowerLeg_L.x, y: w.hindLowerLeg_L.y - lt * 1.5, z: w.hindLowerLeg_L.z }, lt * 1.0, lt * 0.7, 0, 'hindLowerLeg_L');
    // Hind right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_R, w.hindLowerLeg_R, lt * 1.2, lt * 1.0, 0, 'hindUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_R, { x: w.hindLowerLeg_R.x, y: w.hindLowerLeg_R.y - lt * 1.5, z: w.hindLowerLeg_R.z }, lt * 1.0, lt * 0.7, 0, 'hindLowerLeg_R');

    // --- Front paws: slightly hand-like (wider boxes) ---
    const pawW = lt * 2.0;
    const pawH = lt * 0.6;
    const pawGeo = new THREE.BoxGeometry(pawW, pawH, pawW * 1.2, 2, 2, 2);
    const flPawY = w.frontLowerLeg_L.y - lt * 1.5 - pawH * 0.5;
    const flPawM = new THREE.Matrix4().makeTranslation(w.frontLowerLeg_L.x, flPawY, w.frontLowerLeg_L.z);
    const frPawM = new THREE.Matrix4().makeTranslation(w.frontLowerLeg_R.x, flPawY, w.frontLowerLeg_R.z);
    geometries.push(pawGeo); transforms.push(flPawM); materialIndices.push(0); boneNames.push('frontLowerLeg_L');
    geometries.push(pawGeo); transforms.push(frPawM); materialIndices.push(0); boneNames.push('frontLowerLeg_R');

    // --- Ringed tail: 4 cylinder segments with alternating widths ---
    const tailR = d.tailRadius * s;
    const tailBones = ['tail_01', 'tail_02', 'tail_03', 'tail_04'];
    const tailWidths = [1.0, 1.15, 0.95, 1.1]; // alternating for stripe effect
    for (let i = 0; i < tailBones.length; i++) {
        const tKey = tailBones[i];
        if (!w[tKey]) continue;
        const nextKey = tailBones[i + 1];
        const segEnd = nextKey && w[nextKey] ? w[nextKey] : { x: w[tKey].x, y: w[tKey].y - tailR * 0.3, z: w[tKey].z + d.tailRadius * s * 1.5 };
        const segLen = _dist(w[tKey], segEnd);
        const rMul = tailWidths[i];
        const segGeo = new THREE.CylinderGeometry(tailR * rMul * 0.9, tailR * rMul, Math.max(segLen, tailR * 1.2), 6, 1);
        const segMid = _mid(w[tKey], segEnd);
        const segM = new THREE.Matrix4().makeTranslation(segMid.x, segMid.y, segMid.z);
        geometries.push(segGeo); transforms.push(segM); materialIndices.push(0); boneNames.push(tKey);
    }

    return { geometries, transforms, materialIndices, boneNames };
}

function _buildFoxGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _quadBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Body: lean angular horizontal torso ---
    const bodyMid = _mid(w.chest, w.pelvis);
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    // Slightly tapered — narrower at pelvis end (use box, slim)
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyLen, 3, 3, 3);
    const bodyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyMid.y, bodyMid.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Tucked belly silhouette: underside narrowing box ---
    const bellyGeo = new THREE.BoxGeometry(bodyW * 0.7, bodyH * 0.4, bodyLen * 0.5, 2, 2, 2);
    const bellyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyMid.y - bodyH * 0.55, bodyMid.z + bodyLen * 0.1);
    geometries.push(bellyGeo); transforms.push(bellyM); materialIndices.push(0); boneNames.push(null);

    // --- Cream chest patch on front of torso (skin=1) ---
    const chestGeo = new THREE.BoxGeometry(bodyW * 0.6, bodyH * 0.7, bodyLen * 0.12, 2, 2, 1);
    const chestM = new THREE.Matrix4().makeTranslation(w.chest.x, w.chest.y - bodyH * 0.15, w.chest.z - bodyLen * 0.08);
    geometries.push(chestGeo); transforms.push(chestM); materialIndices.push(1); boneNames.push('chest');

    // --- Pointed head (skin=1) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Long cone snout (skin=1) ---
    const snoutLen = d.snoutLength * s;
    const snoutGeo = new THREE.ConeGeometry(snoutLen * 0.3, snoutLen * 1.2, 6);
    // Rotate to point -Z (forward)
    const snoutM = new THREE.Matrix4()
        .makeRotationX(Math.PI * 0.5)
        .setPosition(w.head.x, w.head.y - headR * 0.2, w.head.z - headR * 0.8 - snoutLen * 0.3);
    geometries.push(snoutGeo); transforms.push(snoutM); materialIndices.push(1); boneNames.push('head');

    // --- Large pointed ears (body=0) ---
    const earH = d.earSize * s * 1.5;
    const earGeo = new THREE.ConeGeometry(d.earSize * s * 0.45, earH, 6);
    const earY = w.head.y + headR * 0.7;
    const elM = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.5, earY, w.head.z);
    const erM = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.5, earY, w.head.z);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0); boneNames.push('head');
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0); boneNames.push('head');

    // --- 4 thin legs with digitigrade proportions ---
    const lt = d.legThickness * s;
    // Front left (scapula -> upper -> lower)
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_L, w.frontLowerLeg_L, lt * 1.0, lt * 0.8, 0, 'frontUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_L, { x: w.frontLowerLeg_L.x, y: w.frontLowerLeg_L.y - lt * 2, z: w.frontLowerLeg_L.z }, lt * 0.8, lt * 0.5, 0, 'frontLowerLeg_L');
    // Front right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_R, w.frontLowerLeg_R, lt * 1.0, lt * 0.8, 0, 'frontUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_R, { x: w.frontLowerLeg_R.x, y: w.frontLowerLeg_R.y - lt * 2, z: w.frontLowerLeg_R.z }, lt * 0.8, lt * 0.5, 0, 'frontLowerLeg_R');
    // Hind left — slightly angled (thicker upper)
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_L, w.hindLowerLeg_L, lt * 1.2, lt * 0.9, 0, 'hindUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_L, { x: w.hindLowerLeg_L.x, y: w.hindLowerLeg_L.y - lt * 2, z: w.hindLowerLeg_L.z }, lt * 0.9, lt * 0.5, 0, 'hindLowerLeg_L');
    // Hind right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_R, w.hindLowerLeg_R, lt * 1.2, lt * 0.9, 0, 'hindUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_R, { x: w.hindLowerLeg_R.x, y: w.hindLowerLeg_R.y - lt * 2, z: w.hindLowerLeg_R.z }, lt * 0.9, lt * 0.5, 0, 'hindLowerLeg_R');

    // --- Bushy bottle-brush tail: 4 overlapping spheres ---
    const tailR = d.tailRadius * s;
    const tailBones = ['tail_01', 'tail_02', 'tail_03', 'tail_04'];
    const tailSizes = [1.0, 1.4, 1.5, 1.2]; // increase then decrease
    for (let i = 0; i < tailBones.length; i++) {
        const tKey = tailBones[i];
        if (!w[tKey]) continue;
        const tr = tailR * tailSizes[i];
        const tailGeo = new THREE.SphereGeometry(tr, 8, 8);
        const tailM = new THREE.Matrix4().makeTranslation(w[tKey].x, w[tKey].y, w[tKey].z);
        geometries.push(tailGeo); transforms.push(tailM); materialIndices.push(0); boneNames.push(tKey);
    }

    return { geometries, transforms, materialIndices, boneNames };
}

function _buildDeerGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _quadBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Elegant body: withers higher than rump ---
    const bodyMid = _mid(w.chest, w.pelvis);
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyLen, 3, 3, 3);
    // Slight upward tilt at chest end: offset Y toward chest
    const bodyY = bodyMid.y + (w.chest.y - w.pelvis.y) * 0.15;
    const bodyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyY, bodyMid.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Elongated head (skin=1) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    headGeo.scale(0.85, 1.1, 1.2); // elongated snout shape
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Pointed ears ---
    const earH = d.earSize * s * 1.2;
    const earGeo = new THREE.ConeGeometry(d.earSize * s * 0.4, earH, 6);
    const earY = w.head.y + headR * 0.6;
    const elM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.2)
        .setPosition(w.head.x - headR * 0.7, earY, w.head.z);
    const erM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.2)
        .setPosition(w.head.x + headR * 0.7, earY, w.head.z);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0); boneNames.push('head');
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0); boneNames.push('head');

    // --- Antlers: rigid cylinders + tip branches (body=0) ---
    const antlerThick = d.antlerSize * s * 0.12;
    const antlerLen = d.antlerSize * s * 1.0;
    const antlerGeo = new THREE.CylinderGeometry(antlerThick * 0.5, antlerThick, antlerLen, 5, 1);
    const antlerBaseY = w.head.y + headR * 0.8;
    const alM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.2)
        .setPosition(w.head.x - headR * 0.45, antlerBaseY + antlerLen * 0.4, w.head.z);
    const arM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.2)
        .setPosition(w.head.x + headR * 0.45, antlerBaseY + antlerLen * 0.4, w.head.z);
    geometries.push(antlerGeo); transforms.push(alM); materialIndices.push(0); boneNames.push('head');
    geometries.push(antlerGeo); transforms.push(arM); materialIndices.push(0); boneNames.push('head');

    // Antler tip branches
    const tipLen = d.antlerSize * s * 0.5;
    const tipGeo = new THREE.CylinderGeometry(antlerThick * 0.25, antlerThick * 0.4, tipLen, 4, 1);
    const tipY = antlerBaseY + antlerLen * 0.75;
    const tlM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.45)
        .setPosition(w.head.x - headR * 0.7, tipY, w.head.z);
    const trM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.45)
        .setPosition(w.head.x + headR * 0.7, tipY, w.head.z);
    geometries.push(tipGeo); transforms.push(tlM); materialIndices.push(0); boneNames.push('head');
    geometries.push(tipGeo); transforms.push(trM); materialIndices.push(0); boneNames.push('head');

    // --- Thin long 3-segment legs with hooves ---
    const lt = d.legThickness * s;
    const hoofSize = d.hoofSize * s;

    // Front left: upper + lower + hoof
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_L, w.frontLowerLeg_L, lt * 1.0, lt * 0.75, 0, 'frontUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_L, w.frontFoot_L, lt * 0.75, lt * 0.55, 0, 'frontLowerLeg_L');
    // Hoof
    const fHoofGeo = new THREE.BoxGeometry(hoofSize * 2, hoofSize * 1.5, hoofSize * 2.5, 2, 2, 2);
    const flHoofM = new THREE.Matrix4().makeTranslation(w.frontFoot_L.x, w.frontFoot_L.y - hoofSize * 0.5, w.frontFoot_L.z);
    geometries.push(fHoofGeo); transforms.push(flHoofM); materialIndices.push(0); boneNames.push('frontFoot_L');

    // Front right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_R, w.frontLowerLeg_R, lt * 1.0, lt * 0.75, 0, 'frontUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_R, w.frontFoot_R, lt * 0.75, lt * 0.55, 0, 'frontLowerLeg_R');
    const frHoofM = new THREE.Matrix4().makeTranslation(w.frontFoot_R.x, w.frontFoot_R.y - hoofSize * 0.5, w.frontFoot_R.z);
    geometries.push(fHoofGeo); transforms.push(frHoofM); materialIndices.push(0); boneNames.push('frontFoot_R');

    // Hind left
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_L, w.hindLowerLeg_L, lt * 1.2, lt * 0.85, 0, 'hindUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_L, w.hindFoot_L, lt * 0.85, lt * 0.55, 0, 'hindLowerLeg_L');
    const hlHoofM = new THREE.Matrix4().makeTranslation(w.hindFoot_L.x, w.hindFoot_L.y - hoofSize * 0.5, w.hindFoot_L.z);
    geometries.push(fHoofGeo); transforms.push(hlHoofM); materialIndices.push(0); boneNames.push('hindFoot_L');

    // Hind right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_R, w.hindLowerLeg_R, lt * 1.2, lt * 0.85, 0, 'hindUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_R, w.hindFoot_R, lt * 0.85, lt * 0.55, 0, 'hindLowerLeg_R');
    const hrHoofM = new THREE.Matrix4().makeTranslation(w.hindFoot_R.x, w.hindFoot_R.y - hoofSize * 0.5, w.hindFoot_R.z);
    geometries.push(fHoofGeo); transforms.push(hrHoofM); materialIndices.push(0); boneNames.push('hindFoot_R');

    // --- Short tail nub: 2 small spheres ---
    const tailNubR = lt * 1.5;
    const t1Geo = new THREE.SphereGeometry(tailNubR, 6, 6);
    const t1M = new THREE.Matrix4().makeTranslation(w.tail_01.x, w.tail_01.y, w.tail_01.z);
    geometries.push(t1Geo); transforms.push(t1M); materialIndices.push(0); boneNames.push('tail_01');
    if (w.tail_02) {
        const t2Geo = new THREE.SphereGeometry(tailNubR * 0.7, 6, 6);
        const t2M = new THREE.Matrix4().makeTranslation(w.tail_02.x, w.tail_02.y, w.tail_02.z);
        geometries.push(t2Geo); transforms.push(t2M); materialIndices.push(0); boneNames.push('tail_02');
    }

    return { geometries, transforms, materialIndices, boneNames };
}

function _buildSquirrelGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _quadBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Compact round body ---
    const bodyMid = _mid(w.chest, w.pelvis);
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    // Rounded body: sphere-ish box
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyLen, 4, 4, 4);
    _roundifyBox(bodyGeo, bodyH * 0.15);
    const bodyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyMid.y, bodyMid.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Large head (20-25% of body) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Large round ears ---
    const earR = d.earSize * s * 0.9;
    const earGeo = new THREE.SphereGeometry(earR, 6, 6);
    const earY = w.head.y + headR * 0.7;
    const elM = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.6, earY, w.head.z);
    const erM = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.6, earY, w.head.z);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0); boneNames.push('head');
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0); boneNames.push('head');

    // --- Short 2-segment legs: front thinner, hind slightly thicker ---
    const lt = d.legThickness * s;
    // Tiny front paw nubs (very short legs)
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_L, w.frontLowerLeg_L, lt * 0.9, lt * 0.7, 0, 'frontUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_L, { x: w.frontLowerLeg_L.x, y: w.frontLowerLeg_L.y - lt * 1.2, z: w.frontLowerLeg_L.z }, lt * 0.7, lt * 0.5, 0, 'frontLowerLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_R, w.frontLowerLeg_R, lt * 0.9, lt * 0.7, 0, 'frontUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_R, { x: w.frontLowerLeg_R.x, y: w.frontLowerLeg_R.y - lt * 1.2, z: w.frontLowerLeg_R.z }, lt * 0.7, lt * 0.5, 0, 'frontLowerLeg_R');
    // Hind legs — slightly thicker
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_L, w.hindLowerLeg_L, lt * 1.3, lt * 1.0, 0, 'hindUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_L, { x: w.hindLowerLeg_L.x, y: w.hindLowerLeg_L.y - lt * 1.2, z: w.hindLowerLeg_L.z }, lt * 1.0, lt * 0.7, 0, 'hindLowerLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_R, w.hindLowerLeg_R, lt * 1.3, lt * 1.0, 0, 'hindUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_R, { x: w.hindLowerLeg_R.x, y: w.hindLowerLeg_R.y - lt * 1.2, z: w.hindLowerLeg_R.z }, lt * 1.0, lt * 0.7, 0, 'hindLowerLeg_R');

    // --- MASSIVE fluffy tail: 5 overlapping spheres curving upward over back ---
    const tailR = d.tailRadius * s;
    const tailBones = ['tail_01', 'tail_02', 'tail_03', 'tail_04', 'tail_05'];
    const tailSizes = [1.0, 1.3, 1.6, 1.4, 1.1]; // huge in the middle
    for (let i = 0; i < tailBones.length; i++) {
        const tKey = tailBones[i];
        if (!w[tKey]) continue;
        const tr = tailR * tailSizes[i];
        const tailGeo = new THREE.SphereGeometry(tr, 8, 8);
        const tailM = new THREE.Matrix4().makeTranslation(w[tKey].x, w[tKey].y, w[tKey].z);
        geometries.push(tailGeo); transforms.push(tailM); materialIndices.push(0); boneNames.push(tKey);
    }

    return { geometries, transforms, materialIndices, boneNames };
}

function _buildMooseGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _quadBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Large powerful body with prominent shoulder hump ---
    const bodyMid = _mid(w.chest, w.pelvis);
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyLen, 4, 4, 3);
    const bodyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyMid.y, bodyMid.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Shoulder hump: raised sphere on top of chest area ---
    const humpR = bodyH * 0.5;
    const humpGeo = new THREE.SphereGeometry(humpR, 8, 8);
    const humpM = new THREE.Matrix4().makeTranslation(w.chest.x, w.chest.y + bodyH * 0.5, w.chest.z);
    geometries.push(humpGeo); transforms.push(humpM); materialIndices.push(0); boneNames.push('chest');

    // --- Heavy head ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Droopy snout box ---
    const snoutLen = d.snoutLength * s;
    const snoutGeo = new THREE.BoxGeometry(snoutLen * 0.9, snoutLen * 0.7, snoutLen * 1.4, 2, 2, 2);
    const snoutM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y - headR * 0.35, w.head.z - headR * 0.7 - snoutLen * 0.3);
    geometries.push(snoutGeo); transforms.push(snoutM); materialIndices.push(1); boneNames.push('head');

    // --- Dewlap: hanging flap under chin ---
    const dewlapLen = d.dewlapLength * s;
    const dewlapGeo = new THREE.BoxGeometry(dewlapLen * 0.4, dewlapLen * 1.0, dewlapLen * 0.5, 2, 2, 2);
    const dewlapM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y - headR * 0.8 - dewlapLen * 0.3, w.head.z - headR * 0.3);
    geometries.push(dewlapGeo); transforms.push(dewlapM); materialIndices.push(0); boneNames.push('head');

    // --- MASSIVE palmate antlers: flat wide plates + tines ---
    const antlerW = d.antlerSize * s * 1.2;
    const antlerH = d.antlerSize * s * 0.8;
    const antlerD = d.antlerSize * s * 0.1; // flat
    const antlerBaseY = w.head.y + headR * 0.5;

    // Left palmate plate
    const antlerLGeo = new THREE.BoxGeometry(antlerW, antlerH, antlerD, 3, 3, 1);
    const antlerLY = antlerBaseY + antlerH * 0.4;
    const alM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.15)
        .setPosition(w.head.x - headR * 0.5 - antlerW * 0.35, antlerLY, w.head.z);
    geometries.push(antlerLGeo); transforms.push(alM); materialIndices.push(0); boneNames.push('head');

    // Right palmate plate
    const antlerRGeo = new THREE.BoxGeometry(antlerW, antlerH, antlerD, 3, 3, 1);
    const arM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.15)
        .setPosition(w.head.x + headR * 0.5 + antlerW * 0.35, antlerLY, w.head.z);
    geometries.push(antlerRGeo); transforms.push(arM); materialIndices.push(0); boneNames.push('head');

    // Tines — vertical prongs on palmate plates (3 per side)
    const tineGeo = new THREE.CylinderGeometry(d.antlerSize * s * 0.035, d.antlerSize * s * 0.055, d.antlerSize * s * 0.35, 4, 1);
    const tineTopY = antlerLY + antlerH * 0.35;
    // Left tines
    const lt1M = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.5 - antlerW * 0.15, tineTopY, w.head.z);
    const lt2M = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.5 - antlerW * 0.45, tineTopY, w.head.z);
    const lt3M = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.5 - antlerW * 0.65, tineTopY - d.antlerSize * s * 0.08, w.head.z);
    geometries.push(tineGeo); transforms.push(lt1M); materialIndices.push(0); boneNames.push('head');
    geometries.push(tineGeo); transforms.push(lt2M); materialIndices.push(0); boneNames.push('head');
    geometries.push(tineGeo); transforms.push(lt3M); materialIndices.push(0); boneNames.push('head');
    // Right tines
    const rt1M = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.5 + antlerW * 0.15, tineTopY, w.head.z);
    const rt2M = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.5 + antlerW * 0.45, tineTopY, w.head.z);
    const rt3M = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.5 + antlerW * 0.65, tineTopY - d.antlerSize * s * 0.08, w.head.z);
    geometries.push(tineGeo); transforms.push(rt1M); materialIndices.push(0); boneNames.push('head');
    geometries.push(tineGeo); transforms.push(rt2M); materialIndices.push(0); boneNames.push('head');
    geometries.push(tineGeo); transforms.push(rt3M); materialIndices.push(0); boneNames.push('head');

    // --- Small ears behind antlers ---
    const earGeo = new THREE.ConeGeometry(d.earSize * s * 0.45, d.earSize * s * 1.0, 5);
    const earY = w.head.y + headR * 0.4;
    const elM = new THREE.Matrix4()
        .makeRotationZ(Math.PI * 0.2)
        .setPosition(w.head.x - headR * 0.75, earY, w.head.z + headR * 0.3);
    const erM = new THREE.Matrix4()
        .makeRotationZ(-Math.PI * 0.2)
        .setPosition(w.head.x + headR * 0.75, earY, w.head.z + headR * 0.3);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0); boneNames.push('head');
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0); boneNames.push('head');

    // --- Very long 3-segment legs with hooves ---
    const lt2 = d.legThickness * s;
    const hoofSize = d.hoofSize * s;
    const hoofGeo = new THREE.BoxGeometry(hoofSize * 2.5, hoofSize * 2, hoofSize * 3, 2, 2, 2);

    // Front left
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_L, w.frontLowerLeg_L, lt2 * 1.1, lt2 * 0.85, 0, 'frontUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_L, w.frontFoot_L, lt2 * 0.85, lt2 * 0.6, 0, 'frontLowerLeg_L');
    const mflHoofM = new THREE.Matrix4().makeTranslation(w.frontFoot_L.x, w.frontFoot_L.y - hoofSize * 0.6, w.frontFoot_L.z);
    geometries.push(hoofGeo); transforms.push(mflHoofM); materialIndices.push(0); boneNames.push('frontFoot_L');

    // Front right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_R, w.frontLowerLeg_R, lt2 * 1.1, lt2 * 0.85, 0, 'frontUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_R, w.frontFoot_R, lt2 * 0.85, lt2 * 0.6, 0, 'frontLowerLeg_R');
    const mfrHoofM = new THREE.Matrix4().makeTranslation(w.frontFoot_R.x, w.frontFoot_R.y - hoofSize * 0.6, w.frontFoot_R.z);
    geometries.push(hoofGeo); transforms.push(mfrHoofM); materialIndices.push(0); boneNames.push('frontFoot_R');

    // Hind left
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_L, w.hindLowerLeg_L, lt2 * 1.3, lt2 * 0.95, 0, 'hindUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_L, w.hindFoot_L, lt2 * 0.95, lt2 * 0.6, 0, 'hindLowerLeg_L');
    const mhlHoofM = new THREE.Matrix4().makeTranslation(w.hindFoot_L.x, w.hindFoot_L.y - hoofSize * 0.6, w.hindFoot_L.z);
    geometries.push(hoofGeo); transforms.push(mhlHoofM); materialIndices.push(0); boneNames.push('hindFoot_L');

    // Hind right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_R, w.hindLowerLeg_R, lt2 * 1.3, lt2 * 0.95, 0, 'hindUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_R, w.hindFoot_R, lt2 * 0.95, lt2 * 0.6, 0, 'hindLowerLeg_R');
    const mhrHoofM = new THREE.Matrix4().makeTranslation(w.hindFoot_R.x, w.hindFoot_R.y - hoofSize * 0.6, w.hindFoot_R.z);
    geometries.push(hoofGeo); transforms.push(mhrHoofM); materialIndices.push(0); boneNames.push('hindFoot_R');

    // --- Tiny tail nub (1 segment) ---
    if (w.tail_01) {
        const tailNubGeo = new THREE.SphereGeometry(lt2 * 1.5, 6, 6);
        const tailM = new THREE.Matrix4().makeTranslation(w.tail_01.x, w.tail_01.y, w.tail_01.z);
        geometries.push(tailNubGeo); transforms.push(tailM); materialIndices.push(0); boneNames.push('tail_01');
    }

    return { geometries, transforms, materialIndices, boneNames };
}

function _buildBearGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _quadBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Massive wide body ---
    const bodyMid = _mid(w.chest, w.pelvis);
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyLen, 4, 4, 4);
    const bodyM = new THREE.Matrix4().makeTranslation(bodyMid.x, bodyMid.y, bodyMid.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Shoulder hump: raised box/sphere on top of chest ---
    const humpH = d.shoulderHumpH * s;
    const humpGeo = new THREE.SphereGeometry(humpH * 1.5, 8, 8);
    humpGeo.scale(1.3, 1.0, 1.0); // wide hump
    const humpM = new THREE.Matrix4().makeTranslation(w.chest.x, w.chest.y + bodyH * 0.5 + humpH * 0.2, w.chest.z);
    geometries.push(humpGeo); transforms.push(humpM); materialIndices.push(0); boneNames.push('chest');

    // --- Belly sphere (body=0), assigned to belly bone ---
    const bellyR = d.bellyRadius * s;
    const bellyGeo = new THREE.SphereGeometry(bellyR, 10, 8);
    const bellyM = new THREE.Matrix4().makeTranslation(w.belly.x, w.belly.y, w.belly.z);
    geometries.push(bellyGeo); transforms.push(bellyM); materialIndices.push(0); boneNames.push('belly');

    // --- Round head with small ears ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // Small round ears
    const earR2 = d.earSize * s * 0.7;
    const earGeo = new THREE.SphereGeometry(earR2, 6, 6);
    const earY = w.head.y + headR * 0.75;
    const elM = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.6, earY, w.head.z);
    const erM = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.6, earY, w.head.z);
    geometries.push(earGeo); transforms.push(elM); materialIndices.push(0); boneNames.push('head');
    geometries.push(earGeo); transforms.push(erM); materialIndices.push(0); boneNames.push('head');

    // --- Short snout ---
    const snoutLen = d.snoutLength * s;
    const snoutGeo = new THREE.CylinderGeometry(snoutLen * 0.4, snoutLen * 0.5, snoutLen, 6, 1);
    const snoutM = new THREE.Matrix4()
        .makeRotationX(Math.PI * 0.5)
        .setPosition(w.head.x, w.head.y - headR * 0.15, w.head.z - headR * 0.8 - snoutLen * 0.2);
    geometries.push(snoutGeo); transforms.push(snoutM); materialIndices.push(0); boneNames.push('head');

    // --- Thick 2-segment legs from scapulae (front) and pelvis (hind) ---
    const lt = d.legThickness * s;

    // Front left: upper + lower
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_L, w.frontLowerLeg_L, lt * 1.4, lt * 1.1, 0, 'frontUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_L, { x: w.frontLowerLeg_L.x, y: w.frontLowerLeg_L.y - lt * 1.5, z: w.frontLowerLeg_L.z }, lt * 1.1, lt * 0.9, 0, 'frontLowerLeg_L');
    // Front right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontUpperLeg_R, w.frontLowerLeg_R, lt * 1.4, lt * 1.1, 0, 'frontUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.frontLowerLeg_R, { x: w.frontLowerLeg_R.x, y: w.frontLowerLeg_R.y - lt * 1.5, z: w.frontLowerLeg_R.z }, lt * 1.1, lt * 0.9, 0, 'frontLowerLeg_R');
    // Hind left
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_L, w.hindLowerLeg_L, lt * 1.5, lt * 1.2, 0, 'hindUpperLeg_L');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_L, { x: w.hindLowerLeg_L.x, y: w.hindLowerLeg_L.y - lt * 1.5, z: w.hindLowerLeg_L.z }, lt * 1.2, lt * 0.9, 0, 'hindLowerLeg_L');
    // Hind right
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindUpperLeg_R, w.hindLowerLeg_R, lt * 1.5, lt * 1.2, 0, 'hindUpperLeg_R');
    _addLimb(geometries, transforms, materialIndices, boneNames, w.hindLowerLeg_R, { x: w.hindLowerLeg_R.x, y: w.hindLowerLeg_R.y - lt * 1.5, z: w.hindLowerLeg_R.z }, lt * 1.2, lt * 0.9, 0, 'hindLowerLeg_R');

    // --- Big flat paw boxes at bottom of each leg (geometry only, assigned to lower leg bones) ---
    const pawW2 = lt * 3.0;
    const pawH2 = lt * 1.0;
    const pawGeo = new THREE.BoxGeometry(pawW2, pawH2, pawW2 * 1.2, 2, 2, 2);
    const flPawBottom = w.frontLowerLeg_L.y - lt * 1.5;
    const frPawBottom = w.frontLowerLeg_R.y - lt * 1.5;
    const hlPawBottom = w.hindLowerLeg_L.y - lt * 1.5;
    const hrPawBottom = w.hindLowerLeg_R.y - lt * 1.5;
    const flPawM = new THREE.Matrix4().makeTranslation(w.frontLowerLeg_L.x, flPawBottom - pawH2 * 0.3, w.frontLowerLeg_L.z);
    const frPawM = new THREE.Matrix4().makeTranslation(w.frontLowerLeg_R.x, frPawBottom - pawH2 * 0.3, w.frontLowerLeg_R.z);
    const hlPawM = new THREE.Matrix4().makeTranslation(w.hindLowerLeg_L.x, hlPawBottom - pawH2 * 0.3, w.hindLowerLeg_L.z);
    const hrPawM = new THREE.Matrix4().makeTranslation(w.hindLowerLeg_R.x, hrPawBottom - pawH2 * 0.3, w.hindLowerLeg_R.z);
    geometries.push(pawGeo); transforms.push(flPawM); materialIndices.push(0); boneNames.push('frontLowerLeg_L');
    geometries.push(pawGeo); transforms.push(frPawM); materialIndices.push(0); boneNames.push('frontLowerLeg_R');
    geometries.push(pawGeo); transforms.push(hlPawM); materialIndices.push(0); boneNames.push('hindLowerLeg_L');
    geometries.push(pawGeo); transforms.push(hrPawM); materialIndices.push(0); boneNames.push('hindLowerLeg_R');

    // --- Tiny tail nub ---
    if (w.tail_01) {
        const tailNubGeo = new THREE.SphereGeometry(lt * 1.2, 6, 6);
        const tailM = new THREE.Matrix4().makeTranslation(w.tail_01.x, w.tail_01.y, w.tail_01.z);
        geometries.push(tailNubGeo); transforms.push(tailM); materialIndices.push(0); boneNames.push('tail_01');
    }

    return { geometries, transforms, materialIndices, boneNames };
}


// ═══════════════════════════════════════════════════════
// MARINE world-position helper — resolves chain for marine skeleton
// ═══════════════════════════════════════════════════════

function _marineBoneWorldPos(bp, s) {
    const w = {};
    w.root = { x: bp.root.x * s, y: bp.root.y * s, z: bp.root.z * s };
    // body_front from root
    w.body_front = bp.body_front ? { x: w.root.x + bp.body_front.x * s, y: w.root.y + bp.body_front.y * s, z: w.root.z + bp.body_front.z * s } : w.root;
    // snout from body_front
    w.snout = bp.snout ? { x: w.body_front.x + bp.snout.x * s, y: w.body_front.y + bp.snout.y * s, z: w.body_front.z + bp.snout.z * s } : null;
    // head from snout or body_front
    const headParent = w.snout || w.body_front;
    w.head = bp.head ? { x: headParent.x + bp.head.x * s, y: headParent.y + bp.head.y * s, z: headParent.z + bp.head.z * s } : null;
    // dorsal from body_front
    w.dorsal = bp.dorsal ? { x: w.body_front.x + bp.dorsal.x * s, y: w.body_front.y + bp.dorsal.y * s, z: w.body_front.z + bp.dorsal.z * s } : null;
    // flippers from body_front
    w.flipper_L = bp.flipper_L ? { x: w.body_front.x + bp.flipper_L.x * s, y: w.body_front.y + bp.flipper_L.y * s, z: w.body_front.z + bp.flipper_L.z * s } : null;
    w.flipper_R = bp.flipper_R ? { x: w.body_front.x + bp.flipper_R.x * s, y: w.body_front.y + bp.flipper_R.y * s, z: w.body_front.z + bp.flipper_R.z * s } : null;
    // body_rear from root
    w.body_rear = bp.body_rear ? { x: w.root.x + bp.body_rear.x * s, y: w.root.y + bp.body_rear.y * s, z: w.root.z + bp.body_rear.z * s } : null;
    // tail chain from body_rear
    let tailParent = w.body_rear || w.root;
    for (let i = 1; i <= 5; i++) {
        const key = 'tail_0' + i;
        if (bp[key]) {
            w[key] = { x: tailParent.x + bp[key].x * s, y: tailParent.y + bp[key].y * s, z: tailParent.z + bp[key].z * s };
            tailParent = w[key];
        }
    }
    // flukes from last tail
    w.fluke_L = bp.fluke_L ? { x: tailParent.x + bp.fluke_L.x * s, y: tailParent.y + bp.fluke_L.y * s, z: tailParent.z + bp.fluke_L.z * s } : null;
    w.fluke_R = bp.fluke_R ? { x: tailParent.x + bp.fluke_R.x * s, y: tailParent.y + bp.fluke_R.y * s, z: tailParent.z + bp.fluke_R.z * s } : null;
    // shell from root
    w.shell = bp.shell ? { x: w.root.x + bp.shell.x * s, y: w.root.y + bp.shell.y * s, z: w.root.z + bp.shell.z * s } : null;
    // turtle flippers
    w.frontFlipper_L = bp.frontFlipper_L ? { x: w.body_front.x + bp.frontFlipper_L.x * s, y: w.body_front.y + bp.frontFlipper_L.y * s, z: w.body_front.z + bp.frontFlipper_L.z * s } : null;
    w.frontFlipper_R = bp.frontFlipper_R ? { x: w.body_front.x + bp.frontFlipper_R.x * s, y: w.body_front.y + bp.frontFlipper_R.y * s, z: w.body_front.z + bp.frontFlipper_R.z * s } : null;
    w.hindFlipper_L = bp.hindFlipper_L && w.body_rear ? { x: w.body_rear.x + bp.hindFlipper_L.x * s, y: w.body_rear.y + bp.hindFlipper_L.y * s, z: w.body_rear.z + bp.hindFlipper_L.z * s } : null;
    w.hindFlipper_R = bp.hindFlipper_R && w.body_rear ? { x: w.body_rear.x + bp.hindFlipper_R.x * s, y: w.body_rear.y + bp.hindFlipper_R.y * s, z: w.body_rear.z + bp.hindFlipper_R.z * s } : null;
    // tentacles from root
    for (let t = 0; t < 6; t++) {
        let tParent = w.root;
        for (let seg = 1; seg <= 3; seg++) {
            const key = `tent_${t}_0${seg}`;
            if (bp[key]) {
                w[key] = { x: tParent.x + bp[key].x * s, y: tParent.y + bp[key].y * s, z: tParent.z + bp[key].z * s };
                tParent = w[key];
            }
        }
    }
    return w;
}


// ═══════════════════════════════════════════════════════
// OCEAN ENEMY GEOMETRY BUILDERS
// ═══════════════════════════════════════════════════════

// ─── DOLPHIN — sleek torpedo body, dorsal fin, flippers, tail flukes ───
function _buildDolphinGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _marineBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Main torpedo body (body=0) ---
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.SphereGeometry(1, 12, 10);
    bodyGeo.scale(bodyW * 0.5, bodyH * 0.5, bodyLen * 0.5);
    const bodyM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y, w.root.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Lighter underbelly (skin=1) — flattened sphere on bottom ---
    const bellyGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4);
    bellyGeo.scale(bodyW * 0.45, bodyH * 0.35, bodyLen * 0.4);
    const bellyM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y - bodyH * 0.15, w.root.z);
    geometries.push(bellyGeo); transforms.push(bellyM); materialIndices.push(1); boneNames.push(null);

    // --- Head/snout — elongated sphere (skin=1) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    headGeo.scale(0.8, 0.9, 1.3); // elongated forward
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Snout/beak — tapered cone (skin=1) ---
    const snoutLen = d.snoutLength * s;
    const snoutGeo = new THREE.ConeGeometry(headR * 0.4, snoutLen, 8);
    const snoutRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const snoutPos = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y - headR * 0.1, w.head.z - snoutLen * 0.4);
    const snoutM = snoutPos.multiply(snoutRot);
    geometries.push(snoutGeo); transforms.push(snoutM); materialIndices.push(1); boneNames.push('head');

    // --- Dorsal fin (body=0) — triangle/cone ---
    const dorsH = d.dorsalHeight * s;
    const dorsL = d.dorsalLength * s;
    const dorsGeo = new THREE.ConeGeometry(dorsL * 0.5, dorsH, 4);
    const dorsM = new THREE.Matrix4().makeTranslation(w.dorsal.x, w.dorsal.y + dorsH * 0.3, w.dorsal.z);
    geometries.push(dorsGeo); transforms.push(dorsM); materialIndices.push(0); boneNames.push('dorsal');

    // --- Pectoral flippers (body=0) — flat paddles ---
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = new THREE.BoxGeometry(flipLen, flipW * 0.3, flipW * 1.5, 2, 1, 2);
    const flipLRot = new THREE.Matrix4().makeRotationZ(-0.4);
    const flipLPos = new THREE.Matrix4().makeTranslation(w.flipper_L.x - flipLen * 0.3, w.flipper_L.y, w.flipper_L.z);
    geometries.push(flipGeo); transforms.push(flipLPos.multiply(flipLRot)); materialIndices.push(0); boneNames.push('flipper_L');
    const flipRRot = new THREE.Matrix4().makeRotationZ(0.4);
    const flipRPos = new THREE.Matrix4().makeTranslation(w.flipper_R.x + flipLen * 0.3, w.flipper_R.y, w.flipper_R.z);
    geometries.push(flipGeo.clone()); transforms.push(flipRPos.multiply(flipRRot)); materialIndices.push(0); boneNames.push('flipper_R');

    // --- Tail section (body=0) — tapered cylinder ---
    const tailMid = w.tail_01 || w.body_rear;
    const tailEnd = w.tail_02 || tailMid;
    const tailGeo = new THREE.CylinderGeometry(bodyW * 0.15, bodyW * 0.08, _dist(w.body_rear, tailEnd) || s * 0.2, 6);
    const tailRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const tailPos = new THREE.Matrix4().makeTranslation(_mid(w.body_rear, tailEnd).x, _mid(w.body_rear, tailEnd).y, _mid(w.body_rear, tailEnd).z);
    geometries.push(tailGeo); transforms.push(tailPos.multiply(tailRot)); materialIndices.push(0); boneNames.push('tail_01');

    // --- Tail flukes (body=0) — two flat triangular fins ---
    const flukeSpan = d.flukeSpan * s;
    const flukeGeo = new THREE.BoxGeometry(flukeSpan, flukeSpan * 0.1, flukeSpan * 0.6, 2, 1, 2);
    if (w.fluke_L) {
        const flkLM = new THREE.Matrix4().makeTranslation(w.fluke_L.x, w.fluke_L.y, w.fluke_L.z);
        geometries.push(flukeGeo); transforms.push(flkLM); materialIndices.push(0); boneNames.push('fluke_L');
    }
    if (w.fluke_R) {
        const flkRM = new THREE.Matrix4().makeTranslation(w.fluke_R.x, w.fluke_R.y, w.fluke_R.z);
        geometries.push(flukeGeo.clone()); transforms.push(flkRM); materialIndices.push(0); boneNames.push('fluke_R');
    }

    // --- Eye dots (skin=1) ---
    const eyeR = headR * 0.12;
    const eyeGeo = new THREE.SphereGeometry(eyeR, 6, 6);
    const eyeLM = new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.65, w.head.y + headR * 0.2, w.head.z - headR * 0.4);
    const eyeRM = new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.65, w.head.y + headR * 0.2, w.head.z - headR * 0.4);
    geometries.push(eyeGeo); transforms.push(eyeLM); materialIndices.push(2); boneNames.push('head');
    geometries.push(eyeGeo); transforms.push(eyeRM); materialIndices.push(2); boneNames.push('head');

    // --- Dolphin smile line (legs=2 dark) — the characteristic friendly curve ---
    const smileGeo = new THREE.TorusGeometry(headR * 0.35, headR * 0.025, 4, 8, Math.PI * 0.55);
    const smileRot = new THREE.Matrix4().makeRotationX(Math.PI * 0.15);
    smileRot.multiply(new THREE.Matrix4().makeRotationZ(Math.PI));
    const smilePos = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y - headR * 0.3, w.head.z - headR * 0.7);
    smilePos.multiply(smileRot);
    geometries.push(smileGeo); transforms.push(smilePos); materialIndices.push(2); boneNames.push('head');

    // --- Blowhole (legs=2 dark) — small circle on top of head ---
    const blowholeGeo = new THREE.CircleGeometry(headR * 0.08, 6);
    const blowholeRot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    const blowholePos = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y + headR * 0.85, w.head.z + headR * 0.1);
    blowholePos.multiply(blowholeRot);
    geometries.push(blowholeGeo); transforms.push(blowholePos); materialIndices.push(2); boneNames.push('head');

    return { geometries, transforms, materialIndices, boneNames };
}

// ─── FLYING FISH — sleek fish with large wing-like pectoral fins ───
function _buildFlyfishGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _marineBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Streamlined body (body=0) ---
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.SphereGeometry(1, 10, 8);
    bodyGeo.scale(bodyW * 0.5, bodyH * 0.5, bodyLen * 0.5);
    const bodyM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y, w.root.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- Lighter belly (skin=1) ---
    const bellyGeo = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.35);
    bellyGeo.scale(bodyW * 0.42, bodyH * 0.3, bodyLen * 0.35);
    const bellyM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y - bodyH * 0.12, w.root.z);
    geometries.push(bellyGeo); transforms.push(bellyM); materialIndices.push(1); boneNames.push(null);

    // --- Head — pointed (skin=1) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    headGeo.scale(0.7, 0.8, 1.2);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Large wing-like pectoral fins (body=0) — the signature feature ---
    const wingLen = d.flipperLength * s;
    const wingW = d.flipperWidth * s;
    const wingGeo = new THREE.PlaneGeometry(wingLen, wingW * 2);
    const wingLRot = new THREE.Matrix4().makeRotationZ(-0.3);
    const wingLPos = new THREE.Matrix4().makeTranslation(w.flipper_L.x - wingLen * 0.4, w.flipper_L.y, w.flipper_L.z);
    geometries.push(wingGeo); transforms.push(wingLPos.multiply(wingLRot)); materialIndices.push(0); boneNames.push('flipper_L');
    const wingRRot = new THREE.Matrix4().makeRotationZ(0.3);
    const wingRPos = new THREE.Matrix4().makeTranslation(w.flipper_R.x + wingLen * 0.4, w.flipper_R.y, w.flipper_R.z);
    geometries.push(wingGeo.clone()); transforms.push(wingRPos.multiply(wingRRot)); materialIndices.push(0); boneNames.push('flipper_R');

    // --- Dorsal fin (body=0) ---
    const dorsH = d.dorsalHeight * s;
    const dorsGeo = new THREE.ConeGeometry(d.dorsalLength * s * 0.4, dorsH, 4);
    const dorsM = new THREE.Matrix4().makeTranslation(w.dorsal.x, w.dorsal.y + dorsH * 0.3, w.dorsal.z);
    geometries.push(dorsGeo); transforms.push(dorsM); materialIndices.push(0); boneNames.push('dorsal');

    // --- Tail section + flukes (body=0) ---
    const tailEnd = w.tail_01 || w.body_rear;
    const tailGeo = new THREE.CylinderGeometry(bodyW * 0.12, bodyW * 0.06, s * 0.1, 6);
    const tailRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const tailMidPt = _mid(w.body_rear, tailEnd);
    const tailPos = new THREE.Matrix4().makeTranslation(tailMidPt.x, tailMidPt.y, tailMidPt.z);
    geometries.push(tailGeo); transforms.push(tailPos.multiply(tailRot)); materialIndices.push(0); boneNames.push('tail_01');

    // Tail fork
    const forkSpan = d.flukeSpan * s;
    const forkGeo = new THREE.BoxGeometry(forkSpan, forkSpan * 0.08, forkSpan * 0.4);
    if (w.fluke_L) {
        geometries.push(forkGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.fluke_L.x, w.fluke_L.y, w.fluke_L.z)); materialIndices.push(0); boneNames.push('fluke_L');
    }
    if (w.fluke_R) {
        geometries.push(forkGeo.clone()); transforms.push(new THREE.Matrix4().makeTranslation(w.fluke_R.x, w.fluke_R.y, w.fluke_R.z)); materialIndices.push(0); boneNames.push('fluke_R');
    }

    // --- Eyes (legs=2, dark) ---
    const eyeR = headR * 0.15;
    const eyeGeo = new THREE.SphereGeometry(eyeR, 5, 5);
    geometries.push(eyeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.55, w.head.y + headR * 0.15, w.head.z - headR * 0.3)); materialIndices.push(2); boneNames.push('head');
    geometries.push(eyeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.55, w.head.y + headR * 0.15, w.head.z - headR * 0.3)); materialIndices.push(2); boneNames.push('head');

    return { geometries, transforms, materialIndices, boneNames };
}

// ─── SHARK — massive menacing predator, thick body, huge dorsal, jaw ───
function _buildSharkGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _marineBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Massive torpedo body (body=0) ---
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;
    const bodyGeo = new THREE.SphereGeometry(1, 12, 10);
    bodyGeo.scale(bodyW * 0.5, bodyH * 0.55, bodyLen * 0.5);
    const bodyM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y, w.root.z);
    geometries.push(bodyGeo); transforms.push(bodyM); materialIndices.push(0); boneNames.push(null);

    // --- White underbelly (skin=1) — the classic shark coloring ---
    const bellyGeo = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.4);
    bellyGeo.scale(bodyW * 0.48, bodyH * 0.4, bodyLen * 0.45);
    const bellyM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y - bodyH * 0.2, w.root.z);
    geometries.push(bellyGeo); transforms.push(bellyM); materialIndices.push(1); boneNames.push(null);

    // --- Blunt head (skin=1 for lighter underbelly) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    headGeo.scale(1.1, 0.7, 1.4);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(0); boneNames.push('head');

    // --- Jaw (skin=1) — wide flat box under head ---
    const jawW = (d.jawWidth || 0.10) * s;
    const jawGeo = new THREE.BoxGeometry(jawW * 2, jawW * 0.3, jawW * 1.5);
    const jawM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y - headR * 0.5, w.head.z - headR * 0.2);
    geometries.push(jawGeo); transforms.push(jawM); materialIndices.push(1); boneNames.push('head');

    // --- Teeth — small triangles along jaw edge (body=0 for dark color) ---
    const toothGeo = new THREE.ConeGeometry(jawW * 0.08, jawW * 0.2, 3);
    for (let i = 0; i < 5; i++) {
        const tx = w.head.x - jawW * 0.7 + i * jawW * 0.35;
        const toothM = new THREE.Matrix4().makeTranslation(tx, w.head.y - headR * 0.6, w.head.z - headR * 0.3);
        geometries.push(toothGeo); transforms.push(toothM); materialIndices.push(1); boneNames.push('head');
    }

    // --- Gill slits (legs=2 dark) — 3 thin slashes on each side, iconic shark detail ---
    const gillGeo = new THREE.BoxGeometry(headR * 0.04, headR * 0.45, headR * 0.06);
    for (let g = 0; g < 3; g++) {
        const gz = w.head.z + headR * (0.5 + g * 0.4);
        const gillLM = new THREE.Matrix4().makeTranslation(w.root.x - bodyW * 0.47, w.root.y - bodyH * 0.05, gz);
        geometries.push(gillGeo); transforms.push(gillLM); materialIndices.push(2); boneNames.push(null);
        const gillRM = new THREE.Matrix4().makeTranslation(w.root.x + bodyW * 0.47, w.root.y - bodyH * 0.05, gz);
        geometries.push(gillGeo.clone()); transforms.push(gillRM); materialIndices.push(2); boneNames.push(null);
    }

    // --- HUGE dorsal fin (body=0) — the iconic shark silhouette ---
    const dorsH = d.dorsalHeight * s;
    const dorsL = d.dorsalLength * s;
    const dorsGeo = new THREE.ConeGeometry(dorsL * 0.5, dorsH, 4);
    // Lean the dorsal back slightly
    const dorsRot = new THREE.Matrix4().makeRotationX(0.15);
    const dorsPos = new THREE.Matrix4().makeTranslation(w.dorsal.x, w.dorsal.y + dorsH * 0.35, w.dorsal.z);
    geometries.push(dorsGeo); transforms.push(dorsPos.multiply(dorsRot)); materialIndices.push(0); boneNames.push('dorsal');

    // --- Pectoral fins (body=0) — wider, more rigid than dolphin ---
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = new THREE.BoxGeometry(flipLen, flipW * 0.2, flipW * 2, 2, 1, 2);
    const flipLM = new THREE.Matrix4().makeRotationZ(-0.5).setPosition(w.flipper_L.x - flipLen * 0.3, w.flipper_L.y, w.flipper_L.z);
    geometries.push(flipGeo); transforms.push(flipLM); materialIndices.push(0); boneNames.push('flipper_L');
    const flipRM = new THREE.Matrix4().makeRotationZ(0.5).setPosition(w.flipper_R.x + flipLen * 0.3, w.flipper_R.y, w.flipper_R.z);
    geometries.push(flipGeo.clone()); transforms.push(flipRM); materialIndices.push(0); boneNames.push('flipper_R');

    // --- Thick tail section (body=0) ---
    const tailChain = [w.body_rear, w.tail_01, w.tail_02, w.tail_03].filter(Boolean);
    for (let i = 0; i < tailChain.length - 1; i++) {
        const top = tailChain[i];
        const bot = tailChain[i + 1];
        const segLen = _dist(top, bot);
        if (segLen < 0.001) continue;
        const taper = 1 - (i / tailChain.length) * 0.5;
        const segGeo = new THREE.CylinderGeometry(bodyW * 0.18 * taper, bodyW * 0.14 * taper, segLen, 6);
        const segRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
        const segMid = _mid(top, bot);
        const segPos = new THREE.Matrix4().makeTranslation(segMid.x, segMid.y, segMid.z);
        geometries.push(segGeo); transforms.push(segPos.multiply(segRot)); materialIndices.push(0); boneNames.push(`tail_0${i + 1}`);
    }

    // --- Tail flukes — large crescent (body=0) ---
    const flukeSpan = d.flukeSpan * s;
    const flukeGeo = new THREE.BoxGeometry(flukeSpan * 0.6, flukeSpan * 0.08, flukeSpan * 0.8);
    if (w.fluke_L) {
        geometries.push(flukeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.fluke_L.x, w.fluke_L.y, w.fluke_L.z)); materialIndices.push(0); boneNames.push('fluke_L');
    }
    if (w.fluke_R) {
        geometries.push(flukeGeo.clone()); transforms.push(new THREE.Matrix4().makeTranslation(w.fluke_R.x, w.fluke_R.y, w.fluke_R.z)); materialIndices.push(0); boneNames.push('fluke_R');
    }

    // --- Eyes (legs=2, dark) ---
    const eyeR = headR * 0.1;
    const eyeGeo = new THREE.SphereGeometry(eyeR, 6, 6);
    geometries.push(eyeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.9, w.head.y + headR * 0.1, w.head.z - headR * 0.3)); materialIndices.push(2); boneNames.push('head');
    geometries.push(eyeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.9, w.head.y + headR * 0.1, w.head.z - headR * 0.3)); materialIndices.push(2); boneNames.push('head');

    return { geometries, transforms, materialIndices, boneNames };
}

// ─── PIRATE — biped human seated in a tiny rowboat ───
function _buildPirateGeometry(size, config) {
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];
    const s = size;

    // --- Rowboat hull (body=0) — sits below the pirate ---
    const boatLen = d.boatLength * s;
    const boatW = d.boatWidth * s;
    const boatH = d.boatHeight * s;
    // Hull bottom — elongated box tapered slightly
    const hullGeo = new THREE.BoxGeometry(boatW, boatH, boatLen, 3, 1, 3);
    const hullM = new THREE.Matrix4().makeTranslation(0, s * 0.5, 0);
    geometries.push(hullGeo); transforms.push(hullM); materialIndices.push(0); boneNames.push(null);

    // Boat gunwales (thin rim)
    const gunwaleGeo = new THREE.BoxGeometry(boatW * 1.1, boatH * 0.2, boatLen * 1.02);
    const gunwaleM = new THREE.Matrix4().makeTranslation(0, s * 0.5 + boatH * 0.55, 0);
    geometries.push(gunwaleGeo); transforms.push(gunwaleM); materialIndices.push(0); boneNames.push(null);

    // Boat pointed bow (front)
    const bowGeo = new THREE.ConeGeometry(boatW * 0.5, boatLen * 0.3, 4);
    const bowRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const bowPos = new THREE.Matrix4().makeTranslation(0, s * 0.55, -boatLen * 0.6);
    geometries.push(bowGeo); transforms.push(bowPos.multiply(bowRot)); materialIndices.push(0); boneNames.push(null);

    // --- Pirate torso (body=0, crimson coat) ---
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.4, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0); boneNames.push(null);

    // --- Pirate head (skin=1) ---
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.80 + 0.25 + 0.30 + 0.20 + 0.25);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1); boneNames.push('head');

    // --- Tricorn hat (body=0) — flat disc + upturned brim ---
    const hatBase = new THREE.CylinderGeometry(d.hatBrim * s, d.hatBrim * s, d.hatHeight * s * 0.3, 8);
    const hatBaseM = new THREE.Matrix4().makeTranslation(0, headY + d.headRadius * s * 0.8, 0);
    geometries.push(hatBase); transforms.push(hatBaseM); materialIndices.push(2); boneNames.push('head');

    const hatTop = new THREE.ConeGeometry(d.hatBrim * s * 0.7, d.hatHeight * s * 0.7, 6);
    const hatTopM = new THREE.Matrix4().makeTranslation(0, headY + d.headRadius * s * 1.1, 0);
    geometries.push(hatTop); transforms.push(hatTopM); materialIndices.push(2); boneNames.push('head');

    // --- Arms — rowing position (body=0) ---
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, s * 0.55, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.3, s * (0.80 + 0.25 + 0.1), 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.3, s * (0.80 + 0.25 + 0.1), 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0); boneNames.push('upperArm_L');
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0); boneNames.push('upperArm_R');

    // Forearms (skin=1 for hands showing)
    const foreGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.32, d.limbThickness * s * 0.28, s * 0.35, 6, 2);
    const foreLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.55, s * (0.80 + 0.1), s * 0.15);
    const foreRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.55, s * (0.80 + 0.1), s * 0.15);
    geometries.push(foreGeo); transforms.push(foreLM); materialIndices.push(1); boneNames.push('forearm_L');
    geometries.push(foreGeo); transforms.push(foreRM); materialIndices.push(1); boneNames.push('forearm_R');

    // --- Legs (legs=2) — seated, bent ---
    const legGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.38, d.legHeight * s * 0.5, 6, 2);
    const legLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const legRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(legGeo); transforms.push(legLM); materialIndices.push(2); boneNames.push(null);
    geometries.push(legGeo); transforms.push(legRM); materialIndices.push(2); boneNames.push(null);

    // Lower legs
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.38, d.limbThickness * s * 0.34, d.legHeight * s * 0.5, 6, 2);
    geometries.push(lowerLegGeo); transforms.push(new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.5, s * 0.2)); materialIndices.push(2); boneNames.push(null);
    geometries.push(lowerLegGeo); transforms.push(new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.5, s * 0.2)); materialIndices.push(2); boneNames.push(null);

    // --- Eyepatch (legs=2 for dark color) ---
    const patchGeo = new THREE.CircleGeometry(d.headRadius * s * 0.18, 6);
    const patchM = new THREE.Matrix4().makeTranslation(d.headRadius * s * 0.5, headY + d.headRadius * s * 0.1, -d.headRadius * s * 0.85);
    geometries.push(patchGeo); transforms.push(patchM); materialIndices.push(2); boneNames.push('head');

    return { geometries, transforms, materialIndices, boneNames };
}

// ─── SEA TURTLE — domed shell, four paddle flippers, ancient head ───
function _buildSeaTurtleGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _marineBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Domed shell (body=0) — the iconic turtle feature ---
    const shellW = d.shellWidth * s;
    const shellH = d.shellHeight * s;
    const shellL = d.shellLength * s;
    // Top dome: squashed sphere
    const shellGeo = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    shellGeo.scale(shellW * 0.5, shellH, shellL * 0.5);
    const shellPos = w.shell || w.root;
    const shellM = new THREE.Matrix4().makeTranslation(shellPos.x, shellPos.y, shellPos.z);
    geometries.push(shellGeo); transforms.push(shellM); materialIndices.push(0); boneNames.push('shell');

    // Shell pattern — hexagonal plates (thin discs on surface)
    const plateGeo = new THREE.CylinderGeometry(shellW * 0.08, shellW * 0.08, shellH * 0.05, 6);
    for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const px = shellPos.x + Math.cos(angle) * shellW * 0.22;
        const pz = shellPos.z + Math.sin(angle) * shellL * 0.22;
        const plateM = new THREE.Matrix4().makeTranslation(px, shellPos.y + shellH * 0.85, pz);
        geometries.push(plateGeo); transforms.push(plateM); materialIndices.push(2); boneNames.push('shell');
    }
    // Center plate
    geometries.push(plateGeo); transforms.push(new THREE.Matrix4().makeTranslation(shellPos.x, shellPos.y + shellH * 0.95, shellPos.z)); materialIndices.push(2); boneNames.push('shell');

    // --- Underbelly plastron (skin=1) — flat bottom plate ---
    const plastronGeo = new THREE.BoxGeometry(shellW * 0.8, shellH * 0.15, shellL * 0.85);
    const plastronM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y - shellH * 0.2, w.root.z);
    geometries.push(plastronGeo); transforms.push(plastronM); materialIndices.push(1); boneNames.push(null);

    // --- Head — small rounded with wrinkly texture effect (skin=1) ---
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    headGeo.scale(0.9, 0.8, 1.1);
    const headM = new THREE.Matrix4().makeTranslation(w.head.x, w.head.y, w.head.z);
    geometries.push(headGeo); transforms.push(headM); materialIndices.push(1); boneNames.push('head');

    // --- Four paddle-like flippers ---
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;

    // Front flippers — larger, paddle-shaped
    const frontFlipGeo = new THREE.BoxGeometry(flipLen, flipW * 0.25, flipW * 1.8, 3, 1, 2);
    if (w.frontFlipper_L) {
        const fflM = new THREE.Matrix4().makeRotationZ(-0.3).setPosition(w.frontFlipper_L.x - flipLen * 0.35, w.frontFlipper_L.y, w.frontFlipper_L.z);
        geometries.push(frontFlipGeo); transforms.push(fflM); materialIndices.push(0); boneNames.push('frontFlipper_L');
    }
    if (w.frontFlipper_R) {
        const ffrM = new THREE.Matrix4().makeRotationZ(0.3).setPosition(w.frontFlipper_R.x + flipLen * 0.35, w.frontFlipper_R.y, w.frontFlipper_R.z);
        geometries.push(frontFlipGeo.clone()); transforms.push(ffrM); materialIndices.push(0); boneNames.push('frontFlipper_R');
    }

    // Hind flippers — smaller
    const hindFlipGeo = new THREE.BoxGeometry(flipLen * 0.6, flipW * 0.2, flipW * 1.2, 2, 1, 2);
    if (w.hindFlipper_L) {
        const hflM = new THREE.Matrix4().makeRotationZ(-0.25).setPosition(w.hindFlipper_L.x - flipLen * 0.2, w.hindFlipper_L.y, w.hindFlipper_L.z);
        geometries.push(hindFlipGeo); transforms.push(hflM); materialIndices.push(0); boneNames.push('hindFlipper_L');
    }
    if (w.hindFlipper_R) {
        const hfrM = new THREE.Matrix4().makeRotationZ(0.25).setPosition(w.hindFlipper_R.x + flipLen * 0.2, w.hindFlipper_R.y, w.hindFlipper_R.z);
        geometries.push(hindFlipGeo.clone()); transforms.push(hfrM); materialIndices.push(0); boneNames.push('hindFlipper_R');
    }

    // --- Small tail (body=0) ---
    if (w.tail_01) {
        const tailGeo = new THREE.ConeGeometry(shellW * 0.04, s * 0.08, 4);
        const tailRot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
        const tailPos = new THREE.Matrix4().makeTranslation(w.tail_01.x, w.tail_01.y, w.tail_01.z);
        geometries.push(tailGeo); transforms.push(tailPos.multiply(tailRot)); materialIndices.push(0); boneNames.push('tail_01');
    }

    // --- Eyes (legs=2, dark) ---
    const eyeR = headR * 0.15;
    const eyeGeo = new THREE.SphereGeometry(eyeR, 5, 5);
    geometries.push(eyeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.head.x - headR * 0.6, w.head.y + headR * 0.25, w.head.z - headR * 0.5)); materialIndices.push(2); boneNames.push('head');
    geometries.push(eyeGeo); transforms.push(new THREE.Matrix4().makeTranslation(w.head.x + headR * 0.6, w.head.y + headR * 0.25, w.head.z - headR * 0.5)); materialIndices.push(2); boneNames.push('head');

    return { geometries, transforms, materialIndices, boneNames };
}

// ─── JELLYFISH — translucent bell with trailing tentacles ───
function _buildJellyfishGeometry(size, config) {
    const d = config.bodyDimensions;
    const bp = config.bonePositions;
    const s = size;
    const w = _marineBoneWorldPos(bp, s);
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const boneNames = [];

    // --- Bell dome (body=0) — the main body, hemisphere ---
    const bellR = d.bellRadius * s;
    const bellH = d.bellHeight * s;
    const bellGeo = new THREE.SphereGeometry(bellR, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const bellM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y + bellH * 0.3, w.root.z);
    geometries.push(bellGeo); transforms.push(bellM); materialIndices.push(0); boneNames.push(null);

    // --- Inner glow (skin=1) — smaller sphere inside bell ---
    const glowR = d.innerGlowRadius * s;
    const glowGeo = new THREE.SphereGeometry(glowR, 8, 6);
    const glowM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y + bellH * 0.2, w.root.z);
    geometries.push(glowGeo); transforms.push(glowM); materialIndices.push(1); boneNames.push(null);

    // --- Bell rim/skirt (body=0) — wavy bottom edge ---
    const skirtGeo = new THREE.TorusGeometry(bellR * 0.85, bellR * 0.1, 6, 12);
    const skirtM = new THREE.Matrix4().makeTranslation(w.root.x, w.root.y, w.root.z);
    geometries.push(skirtGeo); transforms.push(skirtM); materialIndices.push(0); boneNames.push(null);

    // --- Tentacles (body=0) — thin dangling cylinders ---
    const tentThick = d.tentacleThickness * s;
    const tentLen = d.tentacleLength * s;

    for (let t = 0; t < 5; t++) {
        for (let seg = 1; seg <= 3; seg++) {
            const key = `tent_${t}_0${seg}`;
            const prevKey = seg === 1 ? null : `tent_${t}_0${seg - 1}`;
            const topPos = prevKey && w[prevKey] ? w[prevKey] : w.root;
            const botPos = w[key];
            if (!botPos) continue;
            const segLen = _dist(topPos, botPos);
            if (segLen < 0.001) continue;
            const taper = 1 - (seg - 1) * 0.25;
            const tentGeo = new THREE.CylinderGeometry(tentThick * taper, tentThick * taper * 0.7, segLen, 4, 1);
            const tentMid = _mid(topPos, botPos);
            const tentM = new THREE.Matrix4().makeTranslation(tentMid.x, tentMid.y, tentMid.z);
            geometries.push(tentGeo); transforms.push(tentM); materialIndices.push(0); boneNames.push(key);
        }
    }

    return { geometries, transforms, materialIndices, boneNames };
}


// ═══════════════════════════════════════════════════════
// AIRPLANE ENEMIES — biped travelers
// ═══════════════════════════════════════════════════════

function _buildNervousGeometry(size, config) {
    // Nervous Flyer — standard build, arms held close, slightly hunched
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.4, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.30 + 0.20 + 0.25), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Arms (body) — held slightly forward
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.38, d.limbThickness * s * 0.33, s * 0.50, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.28, s * (0.80 + 0.25 + 0.12), s * 0.05);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.28, s * (0.80 + 0.25 + 0.12), s * 0.05);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Upper legs (legs)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.45, d.limbThickness * s * 0.4, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.4, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.80 - s * 0.6, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // Messy ruffled hair tuft — anxious disheveled look (body color, darker)
    const hairGeo = new THREE.SphereGeometry(d.headRadius * s * 0.32, 6, 5);
    const hairM = new THREE.Matrix4()
        .makeScale(1.3, 0.6, 1.1)
        .premultiply(new THREE.Matrix4().makeTranslation(0, s * (0.80 + 0.25 + 0.30 + 0.20 + 0.25 + d.headRadius * s * 0.45), -d.headRadius * s * 0.08));
    geometries.push(hairGeo); transforms.push(hairM); materialIndices.push(0);

    // Sweat bead — tiny sphere on temple (skin material, catches light)
    const sweatGeo = new THREE.SphereGeometry(s * 0.035, 5, 4);
    const sweatM = new THREE.Matrix4().makeTranslation(
        d.headRadius * s * 0.65, s * (0.80 + 0.25 + 0.30 + 0.20 + 0.28), d.headRadius * s * 0.45);
    geometries.push(sweatGeo); transforms.push(sweatM); materialIndices.push(1);

    const boneNames = [null, null, 'upperArm_L', 'upperArm_R', null, null, null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildBusinessGeometry(size, config) {
    // Business Class — broad-shouldered suit, dignified proportions
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Wide torso — suit jacket (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.42, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.28 + 0.16), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.28 + 0.32 + 0.22 + 0.25), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Tie — thin strip down chest front (skin material for contrast)
    const tieGeo = new THREE.BoxGeometry(s * 0.06, d.torsoHeight * s * 0.30, s * 0.04);
    const tieM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.28 + 0.06), d.torsoDepth * s * 0.52);
    geometries.push(tieGeo); transforms.push(tieM); materialIndices.push(1);

    // Tie knot — small box at collar (skin material)
    const knotGeo = new THREE.BoxGeometry(s * 0.08, s * 0.05, s * 0.05);
    const knotM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.28 + 0.22), d.torsoDepth * s * 0.52);
    geometries.push(knotGeo); transforms.push(knotM); materialIndices.push(1);

    // Briefcase — angular block at right hand (body)
    const briefcaseGeo = new THREE.BoxGeometry(s * 0.25, s * 0.18, s * 0.08);
    const briefM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.3, s * 0.85 - s * 0.05, 0);
    geometries.push(briefcaseGeo); transforms.push(briefM); materialIndices.push(0);

    // Briefcase handle — thin bar on top (skin material for metal look)
    const handleGeo = new THREE.BoxGeometry(s * 0.12, s * 0.03, s * 0.02);
    const handleM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.3, s * 0.85 + s * 0.05, 0);
    geometries.push(handleGeo); transforms.push(handleM); materialIndices.push(1);

    // Arms (body) — close to sides
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.38, d.limbThickness * s * 0.33, s * 0.55, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.25, s * (0.85 + 0.28 + 0.10), 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.25, s * (0.85 + 0.28 + 0.10), 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Upper legs — suit pants (legs, same color as body for matching suit)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.44, d.limbThickness * s * 0.40, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.40, d.limbThickness * s * 0.35, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.62, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.62, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    const boneNames = [null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildStumblerGeometry(size, config) {
    // Turbulence Stumbler — big belly, wide stance (like waddle tank but greener)
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Stocky torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.38, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.25 + 0.14), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Belly sphere (body)
    const bellyGeo = new THREE.SphereGeometry(d.bellyRadius * s, 10, 8);
    const bellyM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.25 + 0.05), s * d.torsoDepth * 0.35);
    geometries.push(bellyGeo); transforms.push(bellyM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.85 + 0.25 + 0.28 + 0.18 + 0.22);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Puffed cheeks — motion sick, holding it in (skin material)
    const cheekGeo = new THREE.SphereGeometry(d.headRadius * s * 0.22, 6, 5);
    const cheekLM = new THREE.Matrix4().makeTranslation(
        -d.headRadius * s * 0.62, headY - d.headRadius * s * 0.10, d.headRadius * s * 0.58);
    const cheekRM = new THREE.Matrix4().makeTranslation(
        d.headRadius * s * 0.62, headY - d.headRadius * s * 0.10, d.headRadius * s * 0.58);
    geometries.push(cheekGeo); transforms.push(cheekLM); materialIndices.push(1);
    geometries.push(cheekGeo); transforms.push(cheekRM); materialIndices.push(1);

    // Barf bag — crumpled rectangle in left hand (body material)
    const bagGeo = new THREE.BoxGeometry(s * 0.14, s * 0.20, s * 0.06, 2, 2, 1);
    const bagM = new THREE.Matrix4().makeTranslation(
        -d.torsoWidth * s * 0.55, s * (0.85 + 0.25 - 0.08), s * 0.12);
    geometries.push(bagGeo); transforms.push(bagM); materialIndices.push(0);

    // Arms out for balance (body)
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.36, s * 0.55, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.55, s * (0.85 + 0.25 + 0.10), 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.55, s * (0.85 + 0.25 + 0.10), 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Upper legs (legs) — wide stance
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.48, d.limbThickness * s * 0.43, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.18, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.18, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.43, d.limbThickness * s * 0.38, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.56, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.56, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    // Feet (legs)
    const footGeo = new THREE.BoxGeometry(d.limbThickness * s * 0.7, s * 0.08, d.limbThickness * s * 0.9);
    const fLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.05, s * 0.06);
    const fRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.05, s * 0.06);
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    const boneNames = [null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', null, null, null, null, 'foot_L', 'foot_R'];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildAttendantGeometry(size, config) {
    // Flight Attendant — slim, professional, quick
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Slim torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.40, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.75 + 0.25 + 0.15), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.75 + 0.25 + 0.30 + 0.20 + 0.23), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Hair bun (body) — small sphere on back of head
    const bunGeo = new THREE.SphereGeometry(d.headRadius * s * 0.35, 8, 6);
    const bunM = new THREE.Matrix4().makeTranslation(0, s * (0.75 + 0.25 + 0.30 + 0.20 + 0.28), -d.headRadius * s * 0.7);
    geometries.push(bunGeo); transforms.push(bunM); materialIndices.push(0);

    // Pillbox hat — short cylinder perched on top of head (body material, uniform)
    const hatGeo = new THREE.CylinderGeometry(d.headRadius * s * 0.45, d.headRadius * s * 0.48, s * 0.06, 8, 1);
    const hatM = new THREE.Matrix4().makeTranslation(
        0, s * (0.75 + 0.25 + 0.30 + 0.20 + 0.23 + d.headRadius * s * 0.85), d.headRadius * s * 0.12);
    geometries.push(hatGeo); transforms.push(hatM); materialIndices.push(0);

    // Neckerchief — small pointed triangle at collar (skin material for contrast)
    const scarfGeo = new THREE.BoxGeometry(s * 0.12, s * 0.08, s * 0.03);
    const scarfM = new THREE.Matrix4().makeTranslation(
        0, s * (0.75 + 0.25 + 0.30 + 0.01), d.torsoDepth * s * 0.48);
    geometries.push(scarfGeo); transforms.push(scarfM); materialIndices.push(1);

    // Arms (body) — professional, at sides
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.35, d.limbThickness * s * 0.30, s * 0.48, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.48, s * (0.75 + 0.25 + 0.10), 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.48, s * (0.75 + 0.25 + 0.10), 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Upper legs (legs)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.40, d.limbThickness * s * 0.36, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.75 - s * 0.18, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.75 - s * 0.18, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.36, d.limbThickness * s * 0.30, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.75 - s * 0.56, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.75 - s * 0.56, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    const boneNames = [null, null, null, null, null, 'upperArm_L', 'upperArm_R', null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildMarshalGeometry(size, config) {
    // Air Marshal — athletic, imposing, badge on chest
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Athletic torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.42, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.28 + 0.16), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const hM = new THREE.Matrix4().makeTranslation(0, s * (0.85 + 0.28 + 0.32 + 0.20 + 0.25), 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Badge on chest — small gold circle (skin material for visibility)
    const badgeGeo = new THREE.CircleGeometry(s * 0.06, 8);
    const badgeM = new THREE.Matrix4()
        .makeTranslation(-d.torsoWidth * s * 0.22, s * (0.85 + 0.28 + 0.22), d.torsoDepth * s * 0.52);
    geometries.push(badgeGeo); transforms.push(badgeM); materialIndices.push(1);

    // Sunglasses — dark visor strip across eyes (body material = dark charcoal)
    const glassGeo = new THREE.BoxGeometry(d.headRadius * s * 1.30, s * 0.05, s * 0.04);
    const headY = s * (0.85 + 0.28 + 0.32 + 0.20 + 0.25);
    const glassM = new THREE.Matrix4().makeTranslation(
        0, headY + d.headRadius * s * 0.08, d.headRadius * s * 0.82);
    geometries.push(glassGeo); transforms.push(glassM); materialIndices.push(0);

    // Earpiece — tiny sphere at right ear (body material, dark)
    const earGeo = new THREE.SphereGeometry(s * 0.028, 5, 4);
    const earM = new THREE.Matrix4().makeTranslation(
        d.headRadius * s * 0.82, headY + d.headRadius * s * 0.12, 0);
    geometries.push(earGeo); transforms.push(earM); materialIndices.push(0);

    // Belt — thin strip around waist (skin material for buckle effect)
    const beltGeo = new THREE.BoxGeometry(d.torsoWidth * s * 1.05, s * 0.04, d.torsoDepth * s * 1.05);
    const beltM = new THREE.Matrix4().makeTranslation(
        0, s * (0.85 + 0.28 - 0.02), 0);
    geometries.push(beltGeo); transforms.push(beltM); materialIndices.push(1);

    // Arms (body) — strong, close to body
    const armGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.36, s * 0.58, 6, 2);
    const armLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.28, s * (0.85 + 0.28 + 0.10), 0);
    const armRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.28, s * (0.85 + 0.28 + 0.10), 0);
    geometries.push(armGeo); transforms.push(armLM); materialIndices.push(0);
    geometries.push(armGeo); transforms.push(armRM); materialIndices.push(0);

    // Forearms (body)
    const fArmGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.36, d.limbThickness * s * 0.30, s * 0.32, 6, 2);
    const fArmLM = new THREE.Matrix4().makeTranslation(-d.torsoWidth * s * 0.5 - d.limbThickness * s * 0.28, s * (0.85 + 0.05), 0);
    const fArmRM = new THREE.Matrix4().makeTranslation(d.torsoWidth * s * 0.5 + d.limbThickness * s * 0.28, s * (0.85 + 0.05), 0);
    geometries.push(fArmGeo); transforms.push(fArmLM); materialIndices.push(0);
    geometries.push(fArmGeo); transforms.push(fArmRM); materialIndices.push(0);

    // Upper legs (legs)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.46, d.limbThickness * s * 0.42, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.2, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    // Lower legs (legs)
    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.36, d.legHeight * s * 0.5, 6, 2);
    const llLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.85 - s * 0.62, 0);
    const llRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.85 - s * 0.62, 0);
    geometries.push(lowerLegGeo); transforms.push(llLM); materialIndices.push(2);
    geometries.push(lowerLegGeo); transforms.push(llRM); materialIndices.push(2);

    const boneNames = [null, null, null, null, null, null, 'upperArm_L', 'upperArm_R', 'forearm_L', 'forearm_R', null, null, null, null];
    return { geometries, transforms, materialIndices, boneNames };
}

function _buildUnrulyGeometry(size, config) {
    // Unruly Passengers — small, no arms, party-shirt colored
    const d = config.bodyDimensions;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];
    const s = size;

    // Compact torso (body)
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s * 0.35, d.torsoDepth * s, 3, 3, 3);
    const tM = new THREE.Matrix4().makeTranslation(0, s * (0.65 + 0.20 + 0.11), 0);
    geometries.push(torso); transforms.push(tM); materialIndices.push(0);

    // Head (skin)
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headY = s * (0.65 + 0.20 + 0.22 + 0.15 + 0.20);
    const hM = new THREE.Matrix4().makeTranslation(0, headY, 0);
    geometries.push(head); transforms.push(hM); materialIndices.push(1);

    // Backwards cap — flat crown + visor pointing back (body material, party orange)
    const capGeo = new THREE.CylinderGeometry(d.headRadius * s * 0.78, d.headRadius * s * 0.82, s * 0.06, 8, 1);
    const capM = new THREE.Matrix4().makeTranslation(0, headY + d.headRadius * s * 0.55, 0);
    geometries.push(capGeo); transforms.push(capM); materialIndices.push(0);

    // Cap visor — flat box pointing BACKWARD (backwards cap)
    const visorGeo = new THREE.BoxGeometry(d.headRadius * s * 1.1, s * 0.02, d.headRadius * s * 0.55);
    const visorM = new THREE.Matrix4().makeTranslation(
        0, headY + d.headRadius * s * 0.48, -d.headRadius * s * 0.55);
    geometries.push(visorGeo); transforms.push(visorM); materialIndices.push(0);

    // Open collar — small box at neckline (skin material, exposed chest)
    const collarGeo = new THREE.BoxGeometry(d.torsoWidth * s * 0.40, s * 0.04, s * 0.03);
    const collarM = new THREE.Matrix4().makeTranslation(
        0, s * (0.65 + 0.20 + 0.22 + 0.03), d.torsoDepth * s * 0.48);
    geometries.push(collarGeo); transforms.push(collarM); materialIndices.push(1);

    // Close-set legs (legs)
    const upperLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.42, d.limbThickness * s * 0.38, d.legHeight * s * 0.5, 6, 2);
    const ulLM = new THREE.Matrix4().makeTranslation(-d.legSpacing * s, s * 0.65 - s * 0.16, 0);
    const ulRM = new THREE.Matrix4().makeTranslation(d.legSpacing * s, s * 0.65 - s * 0.16, 0);
    geometries.push(upperLegGeo); transforms.push(ulLM); materialIndices.push(2);
    geometries.push(upperLegGeo); transforms.push(ulRM); materialIndices.push(2);

    const lowerLegGeo = new THREE.CylinderGeometry(d.limbThickness * s * 0.38, d.limbThickness * s * 0.32, d.legHeight * s * 0.5, 6, 2);
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
    // Ocean
    dolphin: _buildDolphinGeometry,
    flyfish: _buildFlyfishGeometry,
    shark: _buildSharkGeometry,
    pirate: _buildPirateGeometry,
    seaturtle: _buildSeaTurtleGeometry,
    jellyfish: _buildJellyfishGeometry,
    // Airplane
    nervous: _buildNervousGeometry,
    business: _buildBusinessGeometry,
    stumbler: _buildStumblerGeometry,
    attendant: _buildAttendantGeometry,
    marshal: _buildMarshalGeometry,
    unruly: _buildUnrulyGeometry,
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

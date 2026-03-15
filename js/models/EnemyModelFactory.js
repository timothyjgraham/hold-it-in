// Enemy Model Factory — builds enemy meshes
// Supports two pipelines:
//   1. Rigid body parts (new) — each part is a Mesh parented to its bone. No skinning.
//   2. Legacy skinned mesh — merge + auto-skin (for types not yet migrated).

import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';
import { createSkeleton } from '../animation/SkeletonFactory.js';
import { createEnemyMaterials, createRigidEnemyMaterials } from './EnemyMaterials.js';
import { mergeGeometries } from '../utils/geometryUtils.js';
import { createCapsule, createRoundedBox, createFlatCap, createOrganicTorso } from '../utils/characterGeometry.js';
import { GLBModelCache } from '../loaders/GLBModelCache.js';

// Types that use the new rigid body parts pipeline
const RIGID_TYPES = new Set(['polite', 'dancer', 'waddle', 'panicker', 'powerwalker', 'girls', 'deer', 'squirrel', 'dolphin', 'flyfish', 'shark', 'pirate', 'seaturtle', 'jellyfish', 'nervous', 'business', 'stumbler', 'attendant', 'marshal', 'unruly', 'drunk', 'ant', 'seahorse', 'trolley', 'vaulter', 'kangaroo', 'frog', 'hurdler']);

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

    // 4. Create outline meshes for STRUCTURAL parts only.
    //    Skip facial features, accessories, and small details — they create
    //    visual noise when outlined at small sizes.
    const outlineWidth = _outlineWidthForRigidType(enemyType);
    const outlineParts = [];
    const _outlinePartNames = new Set([
        'torso', 'head', 'belly',
        'armL', 'armR', 'handL', 'handR',
        'upperLegL', 'upperLegR', 'lowerLegL', 'lowerLegR',
        'shoeL', 'shoeR',
        // GLB body parts (ocean)
        'glbBody',
    ]);
    for (const [partName, mesh] of Object.entries(parts)) {
        if (!mesh || !mesh.geometry) continue;
        if (!_outlinePartNames.has(partName) && !partName.startsWith('glb_')) continue;
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
    const map = { polite: 0.03, dancer: 0.025, waddle: 0.04, panicker: 0.03, powerwalker: 0.03, girls: 0.02, deer: 0.03, squirrel: 0.02, dolphin: 0.03, flyfish: 0.03, shark: 0.04, pirate: 0.03, seaturtle: 0.03, jellyfish: 0.03, nervous: 0.03, business: 0.03, stumbler: 0.04, attendant: 0.03, marshal: 0.03, unruly: 0.02, drunk: 0.03, ant: 0.02, seahorse: 0.03, trolley: 0.03, vaulter: 0.03, kangaroo: 0.03, frog: 0.03, hurdler: 0.03 };
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
    shoeL.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_L.add(shoeL);
    parts.shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo, materials.legs);
    shoeR.name = 'shoeR';
    shoeR.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_R.add(shoeR);
    parts.shoeR = shoeR;

    return parts;
}

// ─── PEE DANCER ─── no arms, frantic bouncy hop, legs crossed, panicked face, sweat droplet
function _buildRigidPeeDancer(size, config, materials, boneMap) {
    const s = size;
    const parts = {};

    // Compact bone chain — spine to root and spine to chest distances
    const spineToRoot = 0.22 * s;
    const spineToChest = 0.26 * s;

    // ═══ TORSO: pill-shaped, slightly narrow — no arms so silhouette IS the torso ═══
    const torsoW = 0.34 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.12;
    const torsoD = 0.28 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.08 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: big sphere — readable from top-down, slightly larger than polite ═══
    const headR = 0.30 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.90, 0.95);  // slightly squished — frantic energy
    boneMap.head.add(head);
    parts.head = head;

    // Small messy hair tuft — frazzled look
    const tuftGeo = new THREE.SphereGeometry(headR * 0.30, 6, 5);
    const tuft = new THREE.Mesh(tuftGeo, materials.body);
    tuft.name = 'tuft';
    tuft.position.set(0, headR * 0.70, -headR * 0.05);
    tuft.scale.set(1.3, 0.45, 1.0);
    boneMap.head.add(tuft);
    parts.tuft = tuft;

    // ═══ FACE: Mii-style — panicked wide eyes, open mouth ═══
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // Eyes — big wide panicked circles
    const eyeSize = headR * 0.13;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.30;
    const eyeY = headR * 0.08;
    const eyeZ = -headR * 0.90;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 1.4, 0.5);  // tall wide ovals — panicked
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, 1.4, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Pupils — tiny white dots for wide-eyed panic look
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.35, 4, 3);

    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.name = 'pupilL';
    pupilL.position.set(-eyeSpacing + eyeSize * 0.15, eyeY + eyeSize * 0.2, eyeZ - eyeSize * 0.2);
    boneMap.head.add(pupilL);
    parts.pupilL = pupilL;

    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.name = 'pupilR';
    pupilR.position.set(eyeSpacing + eyeSize * 0.15, eyeY + eyeSize * 0.2, eyeZ - eyeSize * 0.2);
    boneMap.head.add(pupilR);
    parts.pupilR = pupilR;

    // Eyebrows — high arched panic (/\)
    const browGeo = new THREE.BoxGeometry(headR * 0.22, headR * 0.04, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.26, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, 0.35);
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.26, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, -0.35);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — open circle (panicked "oh no!")
    const mouthGeo = new THREE.SphereGeometry(headR * 0.09, 6, 5);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.20, eyeZ - headR * 0.02);
    mouth.scale.set(1.0, 1.2, 0.5);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ SWEAT DROPLET — floating above head ═══
    const sweatMat = new THREE.MeshBasicMaterial({ color: 0x59c3e8, transparent: true, opacity: 0.8 });
    const sweatGeo = new THREE.SphereGeometry(headR * 0.12, 5, 4);
    const sweat = new THREE.Mesh(sweatGeo, sweatMat);
    sweat.name = 'sweat';
    sweat.position.set(headR * 0.25, headR * 1.0, -headR * 0.3);
    sweat.scale.set(0.7, 1.2, 0.6);  // teardrop shape
    boneMap.head.add(sweat);
    parts.sweat = sweat;

    // ═══ UPPER LEGS: close together — knees pressed ═══
    const upperLegRadius = 0.085 * s;
    const upperLegH = 0.30 * s;
    const upperLegGeo = createCapsule(upperLegRadius, upperLegH, 8, 4);

    const upperLegL = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegL.name = 'upperLegL';
    upperLegL.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_L.add(upperLegL);
    parts.upperLegL = upperLegL;

    const upperLegR = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegR.name = 'upperLegR';
    upperLegR.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_R.add(upperLegR);
    parts.upperLegR = upperLegR;

    // ═══ LOWER LEGS: slightly slimmer ═══
    const lowerLegRadius = 0.07 * s;
    const lowerLegH = 0.28 * s;
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

    // ═══ SHOES: small rounded blocks ═══
    const shoeGeo = createRoundedBox(0.10 * s, 0.045 * s, 0.13 * s, 0.018 * s);

    const shoeL = new THREE.Mesh(shoeGeo, materials.legs);
    shoeL.name = 'shoeL';
    shoeL.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_L.add(shoeL);
    parts.shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo, materials.legs);
    shoeR.name = 'shoeR';
    shoeR.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_R.add(shoeR);
    parts.shoeR = shoeR;

    return parts;
}

// ─── WADDLE TANK ─── pear-shaped tank, stumpy limbs, belly, hard hat, determined grimace
function _buildRigidWaddleTank(size, config, materials, boneMap) {
    const s = size;
    const parts = {};

    const spineToRoot = 0.22 * s;
    const spineToChest = 0.28 * s;

    // ═══ TORSO: pear-shaped organic body — wide bottom, narrower chest ═══
    const waistR = 0.30 * s;
    const chestR = 0.22 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.10;
    const torsoGeo = createOrganicTorso(waistR, chestR, torsoH, 0.35);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.30, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ BELLY: secondary sphere parented to belly bone for jiggle ═══
    const bellyR = 0.22 * s;
    const bellyGeo = new THREE.SphereGeometry(bellyR, 10, 8);
    const belly = new THREE.Mesh(bellyGeo, materials.body);
    belly.name = 'belly';
    belly.scale.set(1.1, 0.85, 1.0);
    boneMap.belly.add(belly);
    parts.belly = belly;

    // ═══ HEAD: smaller relative to body — tough little melon ═══
    const headR = 0.22 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.90, 0.95);
    boneMap.head.add(head);
    parts.head = head;

    // ═══ HARD HAT: flat cap on top ═══
    const hatGeo = createFlatCap(headR * 0.85, headR * 0.22, 8);
    const hatMat = new THREE.MeshBasicMaterial({ color: 0xf0c030 });  // safety yellow
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.name = 'hat';
    hat.position.set(0, headR * 0.72, 0);
    boneMap.head.add(hat);
    parts.hat = hat;

    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(headR * 0.95, headR * 0.95, headR * 0.04, 8);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.name = 'hatBrim';
    brim.position.set(0, headR * 0.58, 0);
    boneMap.head.add(brim);
    parts.hatBrim = brim;

    // ═══ FACE: Mii-style — determined grimace, thick brows ═══
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.26;
    const eyeY = headR * 0.05;
    const eyeZ = -headR * 0.90;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 0.8, 0.5);  // narrow squinting eyes — determined
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, 0.8, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Eyebrows — flat angry/determined (\_/)
    const browGeo = new THREE.BoxGeometry(headR * 0.28, headR * 0.06, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.18, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, -0.20);  // angled down inward — determined
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.18, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, 0.20);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — wide grimace line
    const mouthGeo = new THREE.BoxGeometry(headR * 0.32, headR * 0.05, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.24, eyeZ - headR * 0.02);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ ARMS: thick stumpy — splayed out for balance ═══
    const armRadius = 0.075 * s;
    const armLength = 0.32 * s;
    const armGeo = createCapsule(armRadius, armLength, 8, 4);

    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.body);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // ═══ FOREARMS: slightly thinner ═══
    const forearmRadius = 0.065 * s;
    const forearmLength = 0.24 * s;
    const forearmGeo = createCapsule(forearmRadius, forearmLength, 8, 4);

    const forearmL = new THREE.Mesh(forearmGeo, materials.body);
    forearmL.name = 'forearmL';
    forearmL.position.set(0, -forearmLength * 0.42, 0);
    boneMap.forearm_L.add(forearmL);
    parts.forearmL = forearmL;

    const forearmR = new THREE.Mesh(forearmGeo, materials.body);
    forearmR.name = 'forearmR';
    forearmR.position.set(0, -forearmLength * 0.42, 0);
    boneMap.forearm_R.add(forearmR);
    parts.forearmR = forearmR;

    // Hands — chunky fists
    const handGeo = new THREE.SphereGeometry(forearmRadius * 1.2, 6, 5);

    const handL = new THREE.Mesh(handGeo, materials.skin);
    handL.name = 'handL';
    handL.position.set(0, -forearmLength * 0.85, 0);
    boneMap.forearm_L.add(handL);
    parts.handL = handL;

    const handR = new THREE.Mesh(handGeo, materials.skin);
    handR.name = 'handR';
    handR.position.set(0, -forearmLength * 0.85, 0);
    boneMap.forearm_R.add(handR);
    parts.handR = handR;

    // ═══ UPPER LEGS: thick stumpy ═══
    const upperLegRadius = 0.10 * s;
    const upperLegH = 0.32 * s;
    const upperLegGeo = createCapsule(upperLegRadius, upperLegH, 8, 4);

    const upperLegL = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegL.name = 'upperLegL';
    upperLegL.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_L.add(upperLegL);
    parts.upperLegL = upperLegL;

    const upperLegR = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegR.name = 'upperLegR';
    upperLegR.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_R.add(upperLegR);
    parts.upperLegR = upperLegR;

    // ═══ LOWER LEGS: ═══
    const lowerLegRadius = 0.085 * s;
    const lowerLegH = 0.30 * s;
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

    // ═══ FEET: big flat stompers ═══
    const footGeo = createRoundedBox(0.14 * s, 0.055 * s, 0.18 * s, 0.025 * s);

    const footL = new THREE.Mesh(footGeo, materials.legs);
    footL.name = 'footL';
    footL.position.set(0, -lowerLegH * 0.12, -0.04 * s);
    boneMap.foot_L.add(footL);
    parts.footL = footL;

    const footR = new THREE.Mesh(footGeo, materials.legs);
    footR.name = 'footR';
    footR.position.set(0, -lowerLegH * 0.12, -0.04 * s);
    boneMap.foot_R.add(footR);
    parts.footR = footR;

    return parts;
}

// ─── PANICKER ─── narrow frantic runner, flailing arms+forearms, terrified screaming face
function _buildRigidPanicker(size, config, materials, boneMap) {
    const s = size;
    const parts = {};

    const spineToRoot = 0.22 * s;
    const spineToChest = 0.26 * s;

    // ═══ TORSO: narrow and slim — scrawny panicked person ═══
    const torsoW = 0.32 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.12;
    const torsoD = 0.26 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: big — panicked people look big-headed ═══
    const headR = 0.28 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.95, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Messy spiky hair — panicked, disheveled
    const tuftGeo = new THREE.SphereGeometry(headR * 0.28, 6, 5);
    for (let i = 0; i < 3; i++) {
        const tuft = new THREE.Mesh(tuftGeo, materials.body);
        tuft.name = 'tuft' + i;
        const angle = (i - 1) * 0.4;
        tuft.position.set(
            Math.sin(angle) * headR * 0.3,
            headR * 0.72,
            -headR * 0.1 + Math.cos(angle) * headR * 0.15
        );
        tuft.scale.set(0.8, 0.6, 0.7);
        boneMap.head.add(tuft);
        parts['tuft' + i] = tuft;
    }

    // ═══ FACE: Mii-style — wide terrified eyes, screaming O mouth ═══
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // Eyes — HUGE terrified circles
    const eyeSize = headR * 0.14;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * 0.08;
    const eyeZ = -headR * 0.90;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 1.5, 0.5);  // very tall — terrified
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, 1.5, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Tiny pupils — wild-eyed terror
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilGeo = new THREE.SphereGeometry(eyeSize * 0.30, 4, 3);

    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.name = 'pupilL';
    pupilL.position.set(-eyeSpacing, eyeY + eyeSize * 0.15, eyeZ - eyeSize * 0.2);
    boneMap.head.add(pupilL);
    parts.pupilL = pupilL;

    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.name = 'pupilR';
    pupilR.position.set(eyeSpacing, eyeY + eyeSize * 0.15, eyeZ - eyeSize * 0.2);
    boneMap.head.add(pupilR);
    parts.pupilR = pupilR;

    // Eyebrows — high arched terror (/\)
    const browGeo = new THREE.BoxGeometry(headR * 0.20, headR * 0.04, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.30, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, 0.40);  // very high arch
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.30, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, -0.40);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — big open screaming O
    const mouthGeo = new THREE.SphereGeometry(headR * 0.12, 6, 5);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.22, eyeZ - headR * 0.02);
    mouth.scale.set(1.0, 1.3, 0.5);  // tall oval scream
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ ARMS: thin, long — for dramatic flailing ═══
    const armRadius = 0.055 * s;
    const armLength = 0.40 * s;
    const armGeo = createCapsule(armRadius, armLength, 8, 4);

    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.body);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // ═══ FOREARMS: thin whipping appendages ═══
    const forearmRadius = 0.045 * s;
    const forearmLength = 0.32 * s;
    const forearmGeo = createCapsule(forearmRadius, forearmLength, 8, 4);

    const forearmL = new THREE.Mesh(forearmGeo, materials.body);
    forearmL.name = 'forearmL';
    forearmL.position.set(0, -forearmLength * 0.42, 0);
    boneMap.forearm_L.add(forearmL);
    parts.forearmL = forearmL;

    const forearmR = new THREE.Mesh(forearmGeo, materials.body);
    forearmR.name = 'forearmR';
    forearmR.position.set(0, -forearmLength * 0.42, 0);
    boneMap.forearm_R.add(forearmR);
    parts.forearmR = forearmR;

    // Hands — small frantic fists
    const handGeo = new THREE.SphereGeometry(forearmRadius * 1.2, 6, 5);

    const handL = new THREE.Mesh(handGeo, materials.skin);
    handL.name = 'handL';
    handL.position.set(0, -forearmLength * 0.88, 0);
    boneMap.forearm_L.add(handL);
    parts.handL = handL;

    const handR = new THREE.Mesh(handGeo, materials.skin);
    handR.name = 'handR';
    handR.position.set(0, -forearmLength * 0.88, 0);
    boneMap.forearm_R.add(handR);
    parts.handR = handR;

    // ═══ UPPER LEGS ═══
    const upperLegRadius = 0.08 * s;
    const upperLegH = 0.32 * s;
    const upperLegGeo = createCapsule(upperLegRadius, upperLegH, 8, 4);

    const upperLegL = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegL.name = 'upperLegL';
    upperLegL.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_L.add(upperLegL);
    parts.upperLegL = upperLegL;

    const upperLegR = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegR.name = 'upperLegR';
    upperLegR.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_R.add(upperLegR);
    parts.upperLegR = upperLegR;

    // ═══ LOWER LEGS ═══
    const lowerLegRadius = 0.065 * s;
    const lowerLegH = 0.30 * s;
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

    // ═══ SHOES ═══
    const shoeGeo = createRoundedBox(0.10 * s, 0.045 * s, 0.14 * s, 0.018 * s);

    const shoeL = new THREE.Mesh(shoeGeo, materials.legs);
    shoeL.name = 'shoeL';
    shoeL.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_L.add(shoeL);
    parts.shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo, materials.legs);
    shoeR.name = 'shoeR';
    shoeR.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_R.add(shoeR);
    parts.shoeR = shoeR;

    return parts;
}

// ─── POWER WALKER ─── athletic, upright, full skeleton + feet, sweatband, stern focused face
function _buildRigidPowerWalker(size, config, materials, boneMap) {
    const s = size;
    const parts = {};

    const spineToRoot = 0.24 * s;
    const spineToChest = 0.28 * s;

    // ═══ TORSO: broad-shouldered athletic build ═══
    const torsoW = 0.40 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.12;
    const torsoD = 0.30 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: proportional, not oversized — serious athlete ═══
    const headR = 0.24 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.95, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // ═══ SWEATBAND: wrapped around forehead ═══
    const bandGeo = new THREE.CylinderGeometry(headR * 0.92, headR * 0.92, headR * 0.14, 10);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.name = 'sweatband';
    band.position.set(0, headR * 0.30, 0);
    boneMap.head.add(band);
    parts.sweatband = band;

    // ═══ FACE: Mii-style — focused stern expression ═══
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // Eyes — narrow focused
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.26;
    const eyeY = headR * 0.02;
    const eyeZ = -headR * 0.90;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.2, 0.7, 0.5);  // wide but narrow — focused
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.2, 0.7, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Eyebrows — flat stern (—— ——)
    const browGeo = new THREE.BoxGeometry(headR * 0.26, headR * 0.055, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.16, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, -0.08);  // slightly angled down — stern
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.16, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, 0.08);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — tight determined line
    const mouthGeo = new THREE.BoxGeometry(headR * 0.18, headR * 0.035, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.22, eyeZ - headR * 0.02);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ ARMS: athletic, well-proportioned ═══
    const armRadius = 0.060 * s;
    const armLength = 0.36 * s;
    const armGeo = createCapsule(armRadius, armLength, 8, 4);

    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.body);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // ═══ FOREARMS ═══
    const forearmRadius = 0.052 * s;
    const forearmLength = 0.28 * s;
    const forearmGeo = createCapsule(forearmRadius, forearmLength, 8, 4);

    const forearmL = new THREE.Mesh(forearmGeo, materials.body);
    forearmL.name = 'forearmL';
    forearmL.position.set(0, -forearmLength * 0.42, 0);
    boneMap.forearm_L.add(forearmL);
    parts.forearmL = forearmL;

    const forearmR = new THREE.Mesh(forearmGeo, materials.body);
    forearmR.name = 'forearmR';
    forearmR.position.set(0, -forearmLength * 0.42, 0);
    boneMap.forearm_R.add(forearmR);
    parts.forearmR = forearmR;

    // Hands
    const handGeo = new THREE.SphereGeometry(forearmRadius * 1.1, 6, 5);

    const handL = new THREE.Mesh(handGeo, materials.skin);
    handL.name = 'handL';
    handL.position.set(0, -forearmLength * 0.88, 0);
    boneMap.forearm_L.add(handL);
    parts.handL = handL;

    const handR = new THREE.Mesh(handGeo, materials.skin);
    handR.name = 'handR';
    handR.position.set(0, -forearmLength * 0.88, 0);
    boneMap.forearm_R.add(handR);
    parts.handR = handR;

    // ═══ UPPER LEGS ═══
    const upperLegRadius = 0.088 * s;
    const upperLegH = 0.34 * s;
    const upperLegGeo = createCapsule(upperLegRadius, upperLegH, 8, 4);

    const upperLegL = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegL.name = 'upperLegL';
    upperLegL.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_L.add(upperLegL);
    parts.upperLegL = upperLegL;

    const upperLegR = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegR.name = 'upperLegR';
    upperLegR.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_R.add(upperLegR);
    parts.upperLegR = upperLegR;

    // ═══ LOWER LEGS ═══
    const lowerLegRadius = 0.075 * s;
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

    // ═══ FEET: proper athletic shoes ═══
    const footGeo = createRoundedBox(0.11 * s, 0.05 * s, 0.16 * s, 0.02 * s);

    const footL = new THREE.Mesh(footGeo, materials.legs);
    footL.name = 'footL';
    footL.position.set(0, -lowerLegH * 0.10, -0.04 * s);
    boneMap.foot_L.add(footL);
    parts.footL = footL;

    const footR = new THREE.Mesh(footGeo, materials.legs);
    footR.name = 'footR';
    footR.position.set(0, -lowerLegH * 0.10, -0.04 * s);
    boneMap.foot_R.add(footR);
    parts.footR = footR;

    return parts;
}

// ─── THE GIRLS ─── tiny chibi, no arms, big head, ponytail, happy mischievous face
function _buildRigidGirls(size, config, materials, boneMap) {
    const s = size;
    const parts = {};

    const spineToRoot = 0.18 * s;
    const spineToChest = 0.22 * s;

    // ═══ TORSO: small compact chibi body ═══
    const torsoW = 0.30 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.10;
    const torsoD = 0.24 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.07 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: BIG relative to body — chibi proportions ═══
    const headR = 0.32 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.92, 0.95);
    boneMap.head.add(head);
    parts.head = head;

    // ═══ PONYTAIL: offset sphere behind head ═══
    const ptGeo = new THREE.SphereGeometry(headR * 0.40, 8, 6);
    const ponytail = new THREE.Mesh(ptGeo, materials.body);
    ponytail.name = 'ponytail';
    ponytail.position.set(headR * 0.15, headR * 0.35, headR * 0.65);
    ponytail.scale.set(0.8, 1.1, 0.9);
    boneMap.head.add(ponytail);
    parts.ponytail = ponytail;

    // Ponytail tie — small ring
    const tieGeo = new THREE.SphereGeometry(headR * 0.10, 5, 4);
    const tie = new THREE.Mesh(tieGeo, materials.body);
    tie.name = 'ponytailTie';
    tie.position.set(headR * 0.15, headR * 0.55, headR * 0.45);
    boneMap.head.add(tie);
    parts.ponytailTie = tie;

    // ═══ FACE: Mii-style — happy/mischievous ═══
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // Eyes — big bright happy eyes
    const eyeSize = headR * 0.12;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.26;
    const eyeY = headR * 0.05;
    const eyeZ = -headR * 0.90;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 1.2, 0.5);  // round-ish — friendly
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, 1.2, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Eye highlights — sparkly happy eyes
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const highlightGeo = new THREE.SphereGeometry(eyeSize * 0.35, 4, 3);

    const hlL = new THREE.Mesh(highlightGeo, highlightMat);
    hlL.name = 'eyeHighlightL';
    hlL.position.set(-eyeSpacing + eyeSize * 0.2, eyeY + eyeSize * 0.25, eyeZ - eyeSize * 0.2);
    boneMap.head.add(hlL);
    parts.eyeHighlightL = hlL;

    const hlR = new THREE.Mesh(highlightGeo, highlightMat);
    hlR.name = 'eyeHighlightR';
    hlR.position.set(eyeSpacing + eyeSize * 0.2, eyeY + eyeSize * 0.25, eyeZ - eyeSize * 0.2);
    boneMap.head.add(hlR);
    parts.eyeHighlightR = hlR;

    // Eyebrows — slight playful arch
    const browGeo = new THREE.BoxGeometry(headR * 0.18, headR * 0.035, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, 0.15);  // gentle playful arch
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, -0.15);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — small happy smile (curved up)
    const mouthGeo = new THREE.BoxGeometry(headR * 0.16, headR * 0.03, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.18, eyeZ - headR * 0.02);
    mouth.rotation.set(0, 0, 0);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // Smile corners — two tiny dots angled up
    const cornerGeo = new THREE.SphereGeometry(headR * 0.025, 4, 3);
    const cornerL = new THREE.Mesh(cornerGeo, faceMat);
    cornerL.name = 'smileCornerL';
    cornerL.position.set(-headR * 0.10, -headR * 0.16, eyeZ - headR * 0.02);
    boneMap.head.add(cornerL);
    parts.smileCornerL = cornerL;

    const cornerR = new THREE.Mesh(cornerGeo, faceMat);
    cornerR.name = 'smileCornerR';
    cornerR.position.set(headR * 0.10, -headR * 0.16, eyeZ - headR * 0.02);
    boneMap.head.add(cornerR);
    parts.smileCornerR = cornerR;

    // ═══ UPPER LEGS: tiny chibi legs ═══
    const upperLegRadius = 0.075 * s;
    const upperLegH = 0.26 * s;
    const upperLegGeo = createCapsule(upperLegRadius, upperLegH, 8, 4);

    const upperLegL = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegL.name = 'upperLegL';
    upperLegL.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_L.add(upperLegL);
    parts.upperLegL = upperLegL;

    const upperLegR = new THREE.Mesh(upperLegGeo, materials.legs);
    upperLegR.name = 'upperLegR';
    upperLegR.position.set(0, -upperLegH * 0.3, 0);
    boneMap.upperLeg_R.add(upperLegR);
    parts.upperLegR = upperLegR;

    // ═══ LOWER LEGS ═══
    const lowerLegRadius = 0.065 * s;
    const lowerLegH = 0.24 * s;
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

    // ═══ SHOES: tiny cute shoes ═══
    const shoeGeo = createRoundedBox(0.09 * s, 0.04 * s, 0.12 * s, 0.016 * s);

    const shoeL = new THREE.Mesh(shoeGeo, materials.body);  // body color shoes — cute
    shoeL.name = 'shoeL';
    shoeL.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_L.add(shoeL);
    parts.shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo, materials.body);
    shoeR.name = 'shoeR';
    shoeR.position.set(0, -lowerLegH * 0.72, -0.03 * s);
    boneMap.lowerLeg_R.add(shoeR);
    parts.shoeR = shoeR;

    return parts;
}


// ═══════════════════════════════════════════════════════
// QUADRUPED: Forest Enemies — horizontal spine, 4 legs, tail, species features
// ═══════════════════════════════════════════════════════

function _buildRigidDeer(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // PALETTE.ink

    // ═══ BODY: horizontal organic barrel on spine_mid ═══
    // Bridges from pelvis area (rear/+Z) to chest area (front/-Z).
    // OrganicTorso rotated 90° — waist param = front (narrower chest),
    // chest param = back (wider rump).
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    const bodyGeo = createOrganicTorso(bodyW * 0.82, bodyW, bodyLen, 0.08, 10, 10);
    const body = new THREE.Mesh(bodyGeo, materials.body);
    body.name = 'body';
    body.rotation.x = Math.PI / 2;  // Y→Z, lies horizontal
    body.scale.set(1.0, 1.0, bodyH / bodyW); // oval cross-section (wider than tall)
    boneMap.spine_mid.add(body);
    parts.body = body;

    // ═══ SHOULDER: ellipsoid on chest bone — bridges body barrel to front legs ═══
    const shoulderR = bodyW * 0.90;
    const shoulderGeo = new THREE.SphereGeometry(shoulderR, 10, 8);
    const shoulder = new THREE.Mesh(shoulderGeo, materials.body);
    shoulder.name = 'shoulder';
    shoulder.scale.set(1.05, 0.80, 0.90 * (bodyH / bodyW)); // wide, flat, match body height ratio
    shoulder.position.set(0, -shoulderR * 0.10, 0); // sit slightly below chest bone
    boneMap.chest.add(shoulder);
    parts.shoulder = shoulder;

    // ═══ HAUNCH: ellipsoid on pelvis bone — bridges body barrel to hind legs ═══
    const haunchR = bodyW * 1.05;
    const haunchGeo = new THREE.SphereGeometry(haunchR, 10, 8);
    const haunch = new THREE.Mesh(haunchGeo, materials.body);
    haunch.name = 'haunch';
    haunch.scale.set(1.10, 0.85, 0.90 * (bodyH / bodyW)); // wider rump, flattened
    haunch.position.set(0, -haunchR * 0.08, 0);
    boneMap.pelvis.add(haunch);
    parts.haunch = haunch;

    // ═══ NECK: two capsule segments bridging chest to head ═══
    const neckR = bodyW * 0.42;
    const neck1Len = 0.14 * s;
    const neck1Geo = createCapsule(neckR, neck1Len, 8, 4);
    const neck1 = new THREE.Mesh(neck1Geo, materials.body);
    neck1.name = 'neck1';
    neck1.position.set(0, neck1Len * 0.08, 0);
    boneMap.neck_01.add(neck1);
    parts.neck1 = neck1;

    const neck2Len = 0.12 * s;
    const neck2Geo = createCapsule(neckR * 0.88, neck2Len, 8, 4);
    const neck2 = new THREE.Mesh(neck2Geo, materials.body);
    neck2.name = 'neck2';
    neck2.position.set(0, neck2Len * 0.08, 0);
    boneMap.neck_02.add(neck2);
    parts.neck2 = neck2;

    // ═══ HEAD: slightly elongated sphere (deer have longer snout axis) ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.85, 0.88, 1.12); // narrow sides, stretched toward snout
    boneMap.head.add(head);
    parts.head = head;

    // Snout: capsule extending forward (-Z)
    const snoutR = headR * 0.36;
    const snoutLen = headR * 0.70;
    const snoutGeo = createCapsule(snoutR, snoutLen, 8, 4);
    const snoutMesh = new THREE.Mesh(snoutGeo, materials.body);
    snoutMesh.name = 'snout';
    snoutMesh.rotation.x = Math.PI * 0.55; // angled slightly downward
    snoutMesh.position.set(0, -headR * 0.18, -headR * 0.78);
    boneMap.head.add(snoutMesh);
    parts.snout = snoutMesh;

    // Nose: small dark oval at snout tip
    const noseGeo = new THREE.SphereGeometry(snoutR * 0.55, 6, 5);
    const nose = new THREE.Mesh(noseGeo, faceMat);
    nose.name = 'nose';
    nose.position.set(0, -headR * 0.32, -headR * 1.20);
    nose.scale.set(1.2, 0.8, 0.7);
    boneMap.head.add(nose);
    parts.nose = nose;

    // Eyes: dark spheres, set wider apart (deer have lateral vision)
    const eyeSize = headR * 0.09;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.42;
    const eyeY = headR * 0.12;
    const eyeZ = -headR * 0.52;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(0.7, 1.3, 0.5); // tall ovals
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR.scale.set(0.7, 1.3, 0.5);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // ═══ EARS: flattened cones, splayed outward and slightly back ═══
    const earH = d.earSize * s;
    const earGeo = new THREE.ConeGeometry(earH * 0.32, earH, 5);

    const earL = new THREE.Mesh(earGeo, materials.skin);
    earL.name = 'earL';
    earL.position.set(-headR * 0.55, headR * 0.52, headR * 0.05);
    earL.rotation.set(-0.25, 0, 0.60); // tilt outward
    earL.scale.set(0.50, 1.0, 0.60); // flattened
    boneMap.head.add(earL);
    parts.earL = earL;

    const earR = new THREE.Mesh(earGeo, materials.skin);
    earR.name = 'earR';
    earR.position.set(headR * 0.55, headR * 0.52, headR * 0.05);
    earR.rotation.set(-0.25, 0, -0.60);
    earR.scale.set(0.50, 1.0, 0.60);
    boneMap.head.add(earR);
    parts.earR = earR;

    // ═══ ANTLERS: main beams + 2 tines per side ═══
    const antH = d.antlerSize * s;
    const antTip = antH * 0.055; // tine tip radius
    const mainAntGeo = new THREE.ConeGeometry(antTip, antH, 4);
    const tineGeo = new THREE.ConeGeometry(antTip * 0.85, antH * 0.55, 4);

    // Left main beam — angled outward
    const antMainL = new THREE.Mesh(mainAntGeo, materials.skin);
    antMainL.name = 'antlerMainL';
    antMainL.position.set(-headR * 0.22, headR * 0.62, headR * 0.10);
    antMainL.rotation.set(-0.12, 0, 0.35);
    boneMap.head.add(antMainL);
    parts.antlerMainL = antMainL;

    // Left tine 1 — branches forward
    const tine1L = new THREE.Mesh(tineGeo, materials.skin);
    tine1L.name = 'antlerTine1L';
    tine1L.position.set(-headR * 0.38, headR * 0.88, -headR * 0.06);
    tine1L.rotation.set(-0.10, 0, 0.52);
    boneMap.head.add(tine1L);
    parts.antlerTine1L = tine1L;

    // Left tine 2 — branches backward/up
    const tine2L = new THREE.Mesh(tineGeo, materials.skin);
    tine2L.name = 'antlerTine2L';
    tine2L.position.set(-headR * 0.48, headR * 1.05, headR * 0.14);
    tine2L.rotation.set(0.08, 0, 0.62);
    tine2L.scale.set(0.80, 0.72, 0.80);
    boneMap.head.add(tine2L);
    parts.antlerTine2L = tine2L;

    // Right main beam — mirror
    const antMainR = new THREE.Mesh(mainAntGeo, materials.skin);
    antMainR.name = 'antlerMainR';
    antMainR.position.set(headR * 0.22, headR * 0.62, headR * 0.10);
    antMainR.rotation.set(-0.12, 0, -0.35);
    boneMap.head.add(antMainR);
    parts.antlerMainR = antMainR;

    const tine1R = new THREE.Mesh(tineGeo, materials.skin);
    tine1R.name = 'antlerTine1R';
    tine1R.position.set(headR * 0.38, headR * 0.88, -headR * 0.06);
    tine1R.rotation.set(-0.10, 0, -0.52);
    boneMap.head.add(tine1R);
    parts.antlerTine1R = tine1R;

    const tine2R = new THREE.Mesh(tineGeo, materials.skin);
    tine2R.name = 'antlerTine2R';
    tine2R.position.set(headR * 0.48, headR * 1.05, headR * 0.14);
    tine2R.rotation.set(0.08, 0, -0.62);
    tine2R.scale.set(0.80, 0.72, 0.80);
    boneMap.head.add(tine2R);
    parts.antlerTine2R = tine2R;

    // ═══ FRONT LEGS: slender capsules on scapula → upperLeg → lowerLeg chain ═══
    const legThick = d.legThickness * s;
    const fUpperH = 0.24 * s;
    const fUpperGeo = createCapsule(legThick, fUpperH, 8, 4);

    const fUpperL = new THREE.Mesh(fUpperGeo, materials.legs);
    fUpperL.name = 'frontUpperLegL';
    fUpperL.position.set(0, -fUpperH * 0.38, 0);
    boneMap.frontUpperLeg_L.add(fUpperL);
    parts.frontUpperLegL = fUpperL;

    const fUpperR = new THREE.Mesh(fUpperGeo, materials.legs);
    fUpperR.name = 'frontUpperLegR';
    fUpperR.position.set(0, -fUpperH * 0.38, 0);
    boneMap.frontUpperLeg_R.add(fUpperR);
    parts.frontUpperLegR = fUpperR;

    const fLowerH = 0.26 * s;
    const fLowerGeo = createCapsule(legThick * 0.80, fLowerH, 8, 4);

    const fLowerL = new THREE.Mesh(fLowerGeo, materials.legs);
    fLowerL.name = 'frontLowerLegL';
    fLowerL.position.set(0, -fLowerH * 0.38, 0);
    boneMap.frontLowerLeg_L.add(fLowerL);
    parts.frontLowerLegL = fLowerL;

    const fLowerR = new THREE.Mesh(fLowerGeo, materials.legs);
    fLowerR.name = 'frontLowerLegR';
    fLowerR.position.set(0, -fLowerH * 0.38, 0);
    boneMap.frontLowerLeg_R.add(fLowerR);
    parts.frontLowerLegR = fLowerR;

    // ═══ HIND LEGS: slightly thicker at haunch ═══
    const hUpperH = 0.24 * s;
    const hUpperGeo = createCapsule(legThick * 1.15, hUpperH, 8, 4);

    const hUpperL = new THREE.Mesh(hUpperGeo, materials.legs);
    hUpperL.name = 'hindUpperLegL';
    hUpperL.position.set(0, -hUpperH * 0.38, 0);
    boneMap.hindUpperLeg_L.add(hUpperL);
    parts.hindUpperLegL = hUpperL;

    const hUpperR = new THREE.Mesh(hUpperGeo, materials.legs);
    hUpperR.name = 'hindUpperLegR';
    hUpperR.position.set(0, -hUpperH * 0.38, 0);
    boneMap.hindUpperLeg_R.add(hUpperR);
    parts.hindUpperLegR = hUpperR;

    const hLowerH = 0.26 * s;
    const hLowerGeo = createCapsule(legThick * 0.80, hLowerH, 8, 4);

    const hLowerL = new THREE.Mesh(hLowerGeo, materials.legs);
    hLowerL.name = 'hindLowerLegL';
    hLowerL.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_L.add(hLowerL);
    parts.hindLowerLegL = hLowerL;

    const hLowerR = new THREE.Mesh(hLowerGeo, materials.legs);
    hLowerR.name = 'hindLowerLegR';
    hLowerR.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_R.add(hLowerR);
    parts.hindLowerLegR = hLowerR;

    // ═══ HOOVES: small rounded blocks at foot bones ═══
    const hoofS = d.hoofSize * s;
    const hoofGeo = createRoundedBox(hoofS * 1.2, hoofS * 0.8, hoofS * 1.5, hoofS * 0.2);

    const fHoofL = new THREE.Mesh(hoofGeo, materials.legs);
    fHoofL.name = 'frontHoofL';
    fHoofL.position.set(0, -hoofS * 0.2, 0);
    boneMap.frontFoot_L.add(fHoofL);
    parts.frontHoofL = fHoofL;

    const fHoofR = new THREE.Mesh(hoofGeo, materials.legs);
    fHoofR.name = 'frontHoofR';
    fHoofR.position.set(0, -hoofS * 0.2, 0);
    boneMap.frontFoot_R.add(fHoofR);
    parts.frontHoofR = fHoofR;

    const hHoofL = new THREE.Mesh(hoofGeo, materials.legs);
    hHoofL.name = 'hindHoofL';
    hHoofL.position.set(0, -hoofS * 0.2, 0);
    boneMap.hindFoot_L.add(hHoofL);
    parts.hindHoofL = hHoofL;

    const hHoofR = new THREE.Mesh(hoofGeo, materials.legs);
    hHoofR.name = 'hindHoofR';
    hHoofR.position.set(0, -hoofS * 0.2, 0);
    boneMap.hindFoot_R.add(hHoofR);
    parts.hindHoofR = hHoofR;

    // ═══ TAIL: short 2-segment deer tail ═══
    const tailR = legThick * 0.55;
    const tail1Len = 0.08 * s;
    const tail1Geo = createCapsule(tailR, tail1Len, 6, 3);
    const tail1 = new THREE.Mesh(tail1Geo, materials.body);
    tail1.name = 'tail1';
    boneMap.tail_01.add(tail1);
    parts.tail1 = tail1;

    const tail2Len = 0.06 * s;
    const tail2Geo = createCapsule(tailR * 0.75, tail2Len, 6, 3);
    const tail2 = new THREE.Mesh(tail2Geo, materials.body);
    tail2.name = 'tail2';
    boneMap.tail_02.add(tail2);
    parts.tail2 = tail2;

    return parts;
}


// ═══════════════════════════════════════
// SQUIRREL — chibi quadruped, oversized head, BIG fluffy 5-segment tail
// ═══════════════════════════════════════

function _buildRigidSquirrel(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // PALETTE.ink

    // ═══ BODY: small compact barrel on spine_mid ═══
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    const bodyGeo = createOrganicTorso(bodyW * 0.85, bodyW, bodyLen, 0.12, 10, 10);
    const body = new THREE.Mesh(bodyGeo, materials.body);
    body.name = 'body';
    body.rotation.x = Math.PI / 2;  // horizontal
    body.scale.set(1.0, 1.0, bodyH / bodyW); // slightly flattened oval
    boneMap.spine_mid.add(body);
    parts.body = body;

    // ═══ SHOULDER: small ellipsoid on chest — bridges body to front legs ═══
    const shoulderR = bodyW * 0.88;
    const shoulderGeo = new THREE.SphereGeometry(shoulderR, 8, 6);
    const shoulder = new THREE.Mesh(shoulderGeo, materials.body);
    shoulder.name = 'shoulder';
    shoulder.scale.set(1.0, 0.78, 0.85 * (bodyH / bodyW));
    shoulder.position.set(0, -shoulderR * 0.08, 0);
    boneMap.chest.add(shoulder);
    parts.shoulder = shoulder;

    // ═══ HAUNCH: slightly larger ellipsoid on pelvis — bridges to hind legs ═══
    const haunchR = bodyW * 1.0;
    const haunchGeo = new THREE.SphereGeometry(haunchR, 8, 6);
    const haunch = new THREE.Mesh(haunchGeo, materials.body);
    haunch.name = 'haunch';
    haunch.scale.set(1.05, 0.82, 0.85 * (bodyH / bodyW));
    haunch.position.set(0, -haunchR * 0.06, 0);
    boneMap.pelvis.add(haunch);
    parts.haunch = haunch;

    // ═══ NECK: single short segment (no neck_02) ═══
    const neckR = bodyW * 0.50;
    const neckLen = 0.06 * s;
    const neckGeo = createCapsule(neckR, neckLen, 8, 4);
    const neck = new THREE.Mesh(neckGeo, materials.body);
    neck.name = 'neck';
    neck.position.set(0, neckLen * 0.08, 0);
    boneMap.neck_01.add(neck);
    parts.neck = neck;

    // ═══ HEAD: oversized chibi sphere — signature squirrel proportions ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(1.0, 0.95, 1.05); // very slightly stretched toward snout
    boneMap.head.add(head);
    parts.head = head;

    // Cheeks: small puffed spheres on sides of head for chubby chibi look
    const cheekR = headR * 0.32;
    const cheekGeo = new THREE.SphereGeometry(cheekR, 6, 5);
    const cheekL = new THREE.Mesh(cheekGeo, materials.body);
    cheekL.name = 'cheekL';
    cheekL.position.set(-headR * 0.58, -headR * 0.18, -headR * 0.38);
    cheekL.scale.set(1.0, 0.80, 0.90);
    boneMap.head.add(cheekL);
    parts.cheekL = cheekL;

    const cheekR2 = new THREE.Mesh(cheekGeo, materials.body);
    cheekR2.name = 'cheekR';
    cheekR2.position.set(headR * 0.58, -headR * 0.18, -headR * 0.38);
    cheekR2.scale.set(1.0, 0.80, 0.90);
    boneMap.head.add(cheekR2);
    parts.cheekR = cheekR2;

    // Snout: tiny rounded bump (squirrels have small noses)
    const snoutR = headR * 0.22;
    const snoutGeo = new THREE.SphereGeometry(snoutR, 6, 5);
    const snoutMesh = new THREE.Mesh(snoutGeo, materials.body);
    snoutMesh.name = 'snout';
    snoutMesh.position.set(0, -headR * 0.22, -headR * 0.88);
    snoutMesh.scale.set(1.0, 0.80, 0.80);
    boneMap.head.add(snoutMesh);
    parts.snout = snoutMesh;

    // Nose: small dark oval
    const noseGeo = new THREE.SphereGeometry(snoutR * 0.55, 5, 4);
    const nose = new THREE.Mesh(noseGeo, faceMat);
    nose.name = 'nose';
    nose.position.set(0, -headR * 0.22, -headR * 1.05);
    nose.scale.set(1.0, 0.70, 0.50);
    boneMap.head.add(nose);
    parts.nose = nose;

    // Eyes: BIG round — chibi squirrel eyes, set forward for cute look
    const eyeSize = headR * 0.14;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.32;
    const eyeY = headR * 0.12;
    const eyeZ = -headR * 0.72;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(0.80, 1.10, 0.50); // tall round ovals
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR.scale.set(0.80, 1.10, 0.50);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // Eye highlights: tiny white sparkles for chibi cuteness
    const highlightGeo = new THREE.SphereGeometry(eyeSize * 0.30, 4, 3);
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const hlL = new THREE.Mesh(highlightGeo, highlightMat);
    hlL.name = 'hlL';
    hlL.position.set(-eyeSpacing + eyeSize * 0.18, eyeY + eyeSize * 0.20, eyeZ - eyeSize * 0.30);
    boneMap.head.add(hlL);
    parts.hlL = hlL;

    const hlR = new THREE.Mesh(highlightGeo, highlightMat);
    hlR.name = 'hlR';
    hlR.position.set(eyeSpacing + eyeSize * 0.18, eyeY + eyeSize * 0.20, eyeZ - eyeSize * 0.30);
    boneMap.head.add(hlR);
    parts.hlR = hlR;

    // ═══ EARS: small rounded ovals, perked up ═══
    const earH = d.earSize * s;
    const earGeo = new THREE.SphereGeometry(earH, 6, 5);

    const earL = new THREE.Mesh(earGeo, materials.body);
    earL.name = 'earL';
    earL.position.set(-headR * 0.42, headR * 0.68, headR * 0.10);
    earL.scale.set(0.50, 1.20, 0.45); // tall, thin, flat
    earL.rotation.set(-0.15, 0, 0.35);
    boneMap.head.add(earL);
    parts.earL = earL;

    const earR = new THREE.Mesh(earGeo, materials.body);
    earR.name = 'earR';
    earR.position.set(headR * 0.42, headR * 0.68, headR * 0.10);
    earR.scale.set(0.50, 1.20, 0.45);
    earR.rotation.set(-0.15, 0, -0.35);
    boneMap.head.add(earR);
    parts.earR = earR;

    // Buck teeth: two tiny white rectangles under snout
    const toothGeo = new THREE.BoxGeometry(snoutR * 0.28, snoutR * 0.40, snoutR * 0.15);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xfaf5ef }); // PALETTE.white

    const toothL = new THREE.Mesh(toothGeo, toothMat);
    toothL.name = 'toothL';
    toothL.position.set(-snoutR * 0.22, -headR * 0.42, -headR * 0.90);
    boneMap.head.add(toothL);
    parts.toothL = toothL;

    const toothR = new THREE.Mesh(toothGeo, toothMat);
    toothR.name = 'toothR';
    toothR.position.set(snoutR * 0.22, -headR * 0.42, -headR * 0.90);
    boneMap.head.add(toothR);
    parts.toothR = toothR;

    // ═══ FRONT LEGS: very thin, squirrel limbs ═══
    const legThick = d.legThickness * s;
    const fUpperH = 0.14 * s;
    const fUpperGeo = createCapsule(legThick, fUpperH, 6, 3);

    const fUpperL = new THREE.Mesh(fUpperGeo, materials.legs);
    fUpperL.name = 'frontUpperLegL';
    fUpperL.position.set(0, -fUpperH * 0.38, 0);
    boneMap.frontUpperLeg_L.add(fUpperL);
    parts.frontUpperLegL = fUpperL;

    const fUpperR = new THREE.Mesh(fUpperGeo, materials.legs);
    fUpperR.name = 'frontUpperLegR';
    fUpperR.position.set(0, -fUpperH * 0.38, 0);
    boneMap.frontUpperLeg_R.add(fUpperR);
    parts.frontUpperLegR = fUpperR;

    const fLowerH = 0.14 * s;
    const fLowerGeo = createCapsule(legThick * 0.80, fLowerH, 6, 3);

    const fLowerL = new THREE.Mesh(fLowerGeo, materials.legs);
    fLowerL.name = 'frontLowerLegL';
    fLowerL.position.set(0, -fLowerH * 0.38, 0);
    boneMap.frontLowerLeg_L.add(fLowerL);
    parts.frontLowerLegL = fLowerL;

    const fLowerR = new THREE.Mesh(fLowerGeo, materials.legs);
    fLowerR.name = 'frontLowerLegR';
    fLowerR.position.set(0, -fLowerH * 0.38, 0);
    boneMap.frontLowerLeg_R.add(fLowerR);
    parts.frontLowerLegR = fLowerR;

    // ═══ HIND LEGS: slightly thicker than fronts (powerful spring legs) ═══
    const hUpperH = 0.14 * s;
    const hUpperGeo = createCapsule(legThick * 1.30, hUpperH, 6, 3);

    const hUpperL = new THREE.Mesh(hUpperGeo, materials.legs);
    hUpperL.name = 'hindUpperLegL';
    hUpperL.position.set(0, -hUpperH * 0.38, 0);
    boneMap.hindUpperLeg_L.add(hUpperL);
    parts.hindUpperLegL = hUpperL;

    const hUpperR = new THREE.Mesh(hUpperGeo, materials.legs);
    hUpperR.name = 'hindUpperLegR';
    hUpperR.position.set(0, -hUpperH * 0.38, 0);
    boneMap.hindUpperLeg_R.add(hUpperR);
    parts.hindUpperLegR = hUpperR;

    const hLowerH = 0.14 * s;
    const hLowerGeo = createCapsule(legThick * 0.90, hLowerH, 6, 3);

    const hLowerL = new THREE.Mesh(hLowerGeo, materials.legs);
    hLowerL.name = 'hindLowerLegL';
    hLowerL.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_L.add(hLowerL);
    parts.hindLowerLegL = hLowerL;

    const hLowerR = new THREE.Mesh(hLowerGeo, materials.legs);
    hLowerR.name = 'hindLowerLegR';
    hLowerR.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_R.add(hLowerR);
    parts.hindLowerLegR = hLowerR;

    // ═══ TAIL: BIG fluffy 5-segment plume — the signature squirrel feature ═══
    // Each segment is a squashed sphere that gets progressively larger then tapers
    // Curls upward and over the back, creating the iconic bushy tail silhouette
    const tailR = d.tailRadius * s;
    const tailSegRadii = [tailR * 0.70, tailR * 0.90, tailR * 1.10, tailR * 1.00, tailR * 0.75]; // bell curve shape

    for (let i = 0; i < 5; i++) {
        const segR = tailSegRadii[i];
        const segGeo = new THREE.SphereGeometry(segR, 7, 5);
        const seg = new THREE.Mesh(segGeo, materials.body);
        seg.name = `tail${i + 1}`;
        seg.scale.set(0.75, 0.85, 1.10); // flattened side-to-side, stretched along tail axis
        boneMap[`tail_0${i + 1}`].add(seg);
        parts[`tail${i + 1}`] = seg;
    }

    return parts;
}


// ═══════════════════════════════════════════════════════════════
// OCEAN ENEMIES — marine creatures + pirate
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════
// DOLPHIN — friendly torpedo, sleek body, snout, dorsal fin, flippers, tail + flukes
// ═══════════════════════════════════════

function _buildRigidDolphin(size, config, materials, boneMap) {
    // GLB model path — use imported mesh if available
    if (GLBModelCache.isLoaded('dolphin')) {
        return _buildGLBDolphin(size, config, materials, boneMap);
    }

    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ BODY: split torpedo into front half (body_front) and rear half (body_rear) ═══
    // This allows undulation animations to flex the body visually
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    // Front body: wider, rounder — attached to body_front
    const frontLen = bodyLen * 0.52;
    const frontGeo = createOrganicTorso(bodyW * 0.65, bodyW, frontLen, 0.08, 8, 8);
    const frontBody = new THREE.Mesh(frontGeo, materials.body);
    frontBody.name = 'bodyFront';
    frontBody.rotation.x = Math.PI / 2; // horizontal
    frontBody.scale.set(1.0, 1.0, bodyH / bodyW);
    frontBody.position.set(0, 0, frontLen * 0.15);
    boneMap.body_front.add(frontBody);
    parts.bodyFront = frontBody;

    // Rear body: tapers toward tail — attached to body_rear
    const rearLen = bodyLen * 0.52;
    const rearGeo = createOrganicTorso(bodyW * 0.30, bodyW * 0.70, rearLen, 0.04, 8, 8);
    const rearBody = new THREE.Mesh(rearGeo, materials.body);
    rearBody.name = 'bodyRear';
    rearBody.rotation.x = Math.PI / 2;
    rearBody.scale.set(1.0, 1.0, bodyH / bodyW);
    rearBody.position.set(0, 0, -rearLen * 0.15);
    boneMap.body_rear.add(rearBody);
    parts.bodyRear = rearBody;

    // Bridging mid-section on root
    const midR = bodyW * 0.95;
    const midGeo = new THREE.SphereGeometry(midR, 8, 6);
    const mid = new THREE.Mesh(midGeo, materials.body);
    mid.name = 'bodyMid';
    mid.scale.set(1.0, bodyH / bodyW, 1.15);
    boneMap.root.add(mid);
    parts.bodyMid = mid;

    // Belly: lighter underside on body_front
    const bellyGeo = new THREE.SphereGeometry(bodyW * 0.80, 8, 5,
        0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45);
    const belly = new THREE.Mesh(bellyGeo, materials.skin);
    belly.name = 'belly';
    belly.position.set(0, -bodyH * 0.10, 0);
    belly.scale.set(1.0, 0.90, 1.30);
    boneMap.body_front.add(belly);
    parts.belly = belly;

    // ═══ HEAD: rounded melon (dolphin forehead) ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.95, 0.90, 1.05);
    boneMap.head.add(head);
    parts.head = head;

    // Snout: elongated beak
    const snoutLen = d.snoutLength * s;
    const snoutR = headR * 0.30;
    const snoutGeo = createCapsule(snoutR, snoutLen, 8, 4);
    const snout = new THREE.Mesh(snoutGeo, materials.body);
    snout.name = 'snout';
    snout.rotation.x = Math.PI * 0.52;
    snout.position.set(0, -headR * 0.25, -headR * 0.60);
    boneMap.snout.add(snout);
    parts.snout = snout;

    // Eyes: friendly round, set on sides
    const eyeSize = headR * 0.12;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.52;
    const eyeY = headR * 0.05;
    const eyeZ = -headR * 0.45;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(0.60, 1.10, 0.50);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR.scale.set(0.60, 1.10, 0.50);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // Mouth line: subtle smile
    const mouthGeo = new THREE.BoxGeometry(headR * 0.04, headR * 0.02, headR * 0.40);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.28, -headR * 0.70);
    mouth.rotation.y = 0.05; // slight curve hint
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ DORSAL FIN: tall triangle on top of body_front ═══
    const dorsalH = d.dorsalHeight * s;
    const dorsalL = d.dorsalLength * s;
    const dorsalGeo = new THREE.ConeGeometry(dorsalL * 0.5, dorsalH, 4);
    const dorsal = new THREE.Mesh(dorsalGeo, materials.body);
    dorsal.name = 'dorsal';
    dorsal.rotation.z = 0; // upright
    dorsal.position.set(0, dorsalH * 0.35, 0);
    boneMap.dorsal.add(dorsal);
    parts.dorsal = dorsal;

    // ═══ FLIPPERS: flat paddle shapes ═══
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = createCapsule(flipW, flipLen, 6, 3);

    const flipL = new THREE.Mesh(flipGeo, materials.body);
    flipL.name = 'flipperL';
    flipL.scale.set(0.40, 1.0, 1.0); // flattened
    flipL.rotation.z = 0.35; // angled out
    flipL.position.set(0, -flipLen * 0.30, 0);
    boneMap.flipper_L.add(flipL);
    parts.flipperL = flipL;

    const flipR = new THREE.Mesh(flipGeo, materials.body);
    flipR.name = 'flipperR';
    flipR.scale.set(0.40, 1.0, 1.0);
    flipR.rotation.z = -0.35;
    flipR.position.set(0, -flipLen * 0.30, 0);
    boneMap.flipper_R.add(flipR);
    parts.flipperR = flipR;

    // ═══ TAIL: 2 segments tapering toward flukes ═══
    const tailW = d.tailWidth * s;
    const tail1Len = 0.12 * s;
    const tail1Geo = createCapsule(tailW * 0.30, tail1Len, 6, 3);
    const tail1 = new THREE.Mesh(tail1Geo, materials.body);
    tail1.name = 'tail1';
    tail1.rotation.x = Math.PI * 0.50;
    boneMap.tail_01.add(tail1);
    parts.tail1 = tail1;

    const tail2Len = 0.10 * s;
    const tail2Geo = createCapsule(tailW * 0.22, tail2Len, 6, 3);
    const tail2 = new THREE.Mesh(tail2Geo, materials.body);
    tail2.name = 'tail2';
    tail2.rotation.x = Math.PI * 0.50;
    boneMap.tail_02.add(tail2);
    parts.tail2 = tail2;

    // ═══ FLUKES: horizontal tail fins ═══
    const flukeSpan = d.flukeSpan * s;
    const flukeGeo = createCapsule(flukeSpan * 0.12, flukeSpan * 0.50, 5, 3);

    const flukeL = new THREE.Mesh(flukeGeo, materials.body);
    flukeL.name = 'flukeL';
    flukeL.scale.set(0.30, 1.0, 1.0); // flat
    flukeL.rotation.z = 0.60;
    boneMap.fluke_L.add(flukeL);
    parts.flukeL = flukeL;

    const flukeR = new THREE.Mesh(flukeGeo, materials.body);
    flukeR.name = 'flukeR';
    flukeR.scale.set(0.30, 1.0, 1.0);
    flukeR.rotation.z = -0.60;
    boneMap.fluke_R.add(flukeR);
    parts.flukeR = flukeR;

    return parts;
}


// ═══════════════════════════════════════
// FLYING FISH — sleek body, massive wing-like pectoral fins, fast darting
// ═══════════════════════════════════════

function _buildRigidFlyfish(size, config, materials, boneMap) {
    // GLB model path
    if (GLBModelCache.isLoaded('flyfish')) {
        return _buildGLBFlyfish(size, config, materials, boneMap);
    }

    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ BODY: sleek streamlined torpedo, split front/rear ═══
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    // Front body: slightly wider, attached to body_front
    const frontLen = bodyLen * 0.50;
    const frontGeo = createOrganicTorso(bodyW * 0.60, bodyW, frontLen, 0.06, 8, 8);
    const frontBody = new THREE.Mesh(frontGeo, materials.body);
    frontBody.name = 'bodyFront';
    frontBody.rotation.x = Math.PI / 2;
    frontBody.scale.set(1.0, 1.0, bodyH / bodyW);
    frontBody.position.set(0, 0, frontLen * 0.15);
    boneMap.body_front.add(frontBody);
    parts.bodyFront = frontBody;

    // Rear body: tapers sharply
    const rearLen = bodyLen * 0.50;
    const rearGeo = createOrganicTorso(bodyW * 0.22, bodyW * 0.65, rearLen, 0.03, 8, 8);
    const rearBody = new THREE.Mesh(rearGeo, materials.body);
    rearBody.name = 'bodyRear';
    rearBody.rotation.x = Math.PI / 2;
    rearBody.scale.set(1.0, 1.0, bodyH / bodyW);
    rearBody.position.set(0, 0, -rearLen * 0.15);
    boneMap.body_rear.add(rearBody);
    parts.bodyRear = rearBody;

    // Bridging mid-section
    const midR = bodyW * 0.85;
    const midGeo = new THREE.SphereGeometry(midR, 8, 6);
    const mid = new THREE.Mesh(midGeo, materials.body);
    mid.name = 'bodyMid';
    mid.scale.set(1.0, bodyH / bodyW, 1.10);
    boneMap.root.add(mid);
    parts.bodyMid = mid;

    // Silver belly highlight
    const bellyGeo = new THREE.SphereGeometry(bodyW * 0.70, 6, 4,
        0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45);
    const belly = new THREE.Mesh(bellyGeo, materials.skin);
    belly.name = 'belly';
    belly.position.set(0, -bodyH * 0.10, 0);
    belly.scale.set(1.0, 0.85, 1.20);
    boneMap.body_front.add(belly);
    parts.belly = belly;

    // ═══ HEAD: small pointed ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.90, 0.85, 1.15); // narrow, elongated
    boneMap.head.add(head);
    parts.head = head;

    // Eyes: small, alert
    const eyeSize = headR * 0.14;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 5, 4);
    const eyeSpacing = headR * 0.48;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.10, -headR * 0.40);
    eyeL.scale.set(0.55, 1.0, 0.45);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.10, -headR * 0.40);
    eyeR.scale.set(0.55, 1.0, 0.45);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // ═══ DORSAL: small fin ═══
    const dorsalH = d.dorsalHeight * s;
    const dorsalGeo = new THREE.ConeGeometry(d.dorsalLength * s * 0.4, dorsalH, 4);
    const dorsal = new THREE.Mesh(dorsalGeo, materials.body);
    dorsal.name = 'dorsal';
    dorsal.position.set(0, dorsalH * 0.35, 0);
    boneMap.dorsal.add(dorsal);
    parts.dorsal = dorsal;

    // ═══ FLIPPERS: MASSIVE wing-like pectoral fins — signature feature ═══
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = createCapsule(flipW, flipLen, 6, 3);

    const flipL = new THREE.Mesh(flipGeo, materials.body);
    flipL.name = 'flipperL';
    flipL.scale.set(0.25, 1.0, 1.0); // very flat
    flipL.rotation.z = 0.50; // swept outward
    flipL.position.set(0, -flipLen * 0.25, 0);
    boneMap.flipper_L.add(flipL);
    parts.flipperL = flipL;

    const flipR = new THREE.Mesh(flipGeo, materials.body);
    flipR.name = 'flipperR';
    flipR.scale.set(0.25, 1.0, 1.0);
    flipR.rotation.z = -0.50;
    flipR.position.set(0, -flipLen * 0.25, 0);
    boneMap.flipper_R.add(flipR);
    parts.flipperR = flipR;

    // ═══ TAIL: single segment + flukes ═══
    const tailW = d.tailWidth * s;
    const tail1Len = 0.08 * s;
    const tail1Geo = createCapsule(tailW * 0.25, tail1Len, 6, 3);
    const tail1 = new THREE.Mesh(tail1Geo, materials.body);
    tail1.name = 'tail1';
    tail1.rotation.x = Math.PI * 0.50;
    boneMap.tail_01.add(tail1);
    parts.tail1 = tail1;

    // Flukes: forked tail fin
    const flukeSpan = d.flukeSpan * s;
    const flukeGeo = createCapsule(flukeSpan * 0.10, flukeSpan * 0.40, 5, 3);

    const flukeL = new THREE.Mesh(flukeGeo, materials.body);
    flukeL.name = 'flukeL';
    flukeL.scale.set(0.25, 1.0, 1.0);
    flukeL.rotation.z = 0.70;
    boneMap.fluke_L.add(flukeL);
    parts.flukeL = flukeL;

    const flukeR = new THREE.Mesh(flukeGeo, materials.body);
    flukeR.name = 'flukeR';
    flukeR.scale.set(0.25, 1.0, 1.0);
    flukeR.rotation.z = -0.70;
    boneMap.fluke_R.add(flukeR);
    parts.flukeR = flukeR;

    return parts;
}


// ═══════════════════════════════════════
// SHARK — massive menacing torpedo, big dorsal fin, jaw, 3-segment tail
// ═══════════════════════════════════════

function _buildRigidShark(size, config, materials, boneMap) {
    // GLB model path
    if (GLBModelCache.isLoaded('shark')) {
        return _buildGLBShark(size, config, materials, boneMap);
    }

    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ BODY: massive torpedo, split front/rear ═══
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    // Front body: wide, intimidating
    const frontLen = bodyLen * 0.52;
    const frontGeo = createOrganicTorso(bodyW * 0.70, bodyW, frontLen, 0.10, 10, 10);
    const frontBody = new THREE.Mesh(frontGeo, materials.body);
    frontBody.name = 'bodyFront';
    frontBody.rotation.x = Math.PI / 2;
    frontBody.scale.set(1.0, 1.0, bodyH / bodyW);
    frontBody.position.set(0, 0, frontLen * 0.12);
    boneMap.body_front.add(frontBody);
    parts.bodyFront = frontBody;

    // Rear body: long taper to tail
    const rearLen = bodyLen * 0.52;
    const rearGeo = createOrganicTorso(bodyW * 0.25, bodyW * 0.75, rearLen, 0.04, 10, 10);
    const rearBody = new THREE.Mesh(rearGeo, materials.body);
    rearBody.name = 'bodyRear';
    rearBody.rotation.x = Math.PI / 2;
    rearBody.scale.set(1.0, 1.0, bodyH / bodyW);
    rearBody.position.set(0, 0, -rearLen * 0.12);
    boneMap.body_rear.add(rearBody);
    parts.bodyRear = rearBody;

    // Bridging mid-section
    const midR = bodyW * 1.0;
    const midGeo = new THREE.SphereGeometry(midR, 10, 8);
    const mid = new THREE.Mesh(midGeo, materials.body);
    mid.name = 'bodyMid';
    mid.scale.set(1.0, bodyH / bodyW, 1.15);
    boneMap.root.add(mid);
    parts.bodyMid = mid;

    // Light belly (classic counter-shading)
    const bellyGeo = new THREE.SphereGeometry(bodyW * 0.85, 8, 5,
        0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48);
    const belly = new THREE.Mesh(bellyGeo, materials.skin);
    belly.name = 'belly';
    belly.position.set(0, -bodyH * 0.12, 0);
    belly.scale.set(1.0, 0.90, 1.35);
    boneMap.body_front.add(belly);
    parts.belly = belly;

    // ═══ HEAD: blunt, wide snout with menacing jaw ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(1.10, 0.75, 1.05); // wide, flat
    boneMap.head.add(head);
    parts.head = head;

    // Snout: broad and flat
    const snoutLen = d.snoutLength * s;
    const snoutR = headR * 0.40;
    const snoutGeo = createCapsule(snoutR, snoutLen, 8, 4);
    const snoutMesh = new THREE.Mesh(snoutGeo, materials.body);
    snoutMesh.name = 'snout';
    snoutMesh.rotation.x = Math.PI * 0.50;
    snoutMesh.position.set(0, -headR * 0.20, -headR * 0.50);
    snoutMesh.scale.set(1.30, 1.0, 0.70); // wide, flat
    boneMap.snout.add(snoutMesh);
    parts.snout = snoutMesh;

    // Eyes: small, cold, set far to sides
    const eyeSize = headR * 0.08;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 5, 4);
    const eyeSpacing = headR * 0.68;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.10, -headR * 0.30);
    eyeL.scale.set(0.50, 0.80, 0.40);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.10, -headR * 0.30);
    eyeR.scale.set(0.50, 0.80, 0.40);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // Jaw: dark underside gap suggesting open mouth
    const jawW = d.jawWidth * s;
    const jawGeo = new THREE.BoxGeometry(jawW, headR * 0.10, headR * 0.50);
    const jaw = new THREE.Mesh(jawGeo, faceMat);
    jaw.name = 'jaw';
    jaw.position.set(0, -headR * 0.42, -headR * 0.60);
    boneMap.head.add(jaw);
    parts.jaw = jaw;

    // Teeth: small white triangles in jaw
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xfaf5ef });
    const toothGeo = new THREE.ConeGeometry(headR * 0.03, headR * 0.08, 3);
    for (let i = 0; i < 5; i++) {
        const tx = (i - 2) * jawW * 0.18;
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.name = `tooth${i}`;
        tooth.position.set(tx, -headR * 0.36, -headR * 0.50 - i * 0.003);
        tooth.rotation.x = Math.PI; // point down
        boneMap.head.add(tooth);
        parts[`tooth${i}`] = tooth;
    }

    // ═══ DORSAL FIN: big iconic shark fin ═══
    const dorsalH = d.dorsalHeight * s;
    const dorsalL = d.dorsalLength * s;
    const dorsalGeo = new THREE.ConeGeometry(dorsalL * 0.5, dorsalH, 4);
    const dorsal = new THREE.Mesh(dorsalGeo, materials.body);
    dorsal.name = 'dorsal';
    dorsal.position.set(0, dorsalH * 0.40, 0);
    dorsal.rotation.x = -0.08; // slight backward lean
    boneMap.dorsal.add(dorsal);
    parts.dorsal = dorsal;

    // ═══ FLIPPERS: wide pectoral fins ═══
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = createCapsule(flipW, flipLen, 6, 3);

    const flipL = new THREE.Mesh(flipGeo, materials.body);
    flipL.name = 'flipperL';
    flipL.scale.set(0.35, 1.0, 1.0);
    flipL.rotation.z = 0.45;
    flipL.position.set(0, -flipLen * 0.28, 0);
    boneMap.flipper_L.add(flipL);
    parts.flipperL = flipL;

    const flipR = new THREE.Mesh(flipGeo, materials.body);
    flipR.name = 'flipperR';
    flipR.scale.set(0.35, 1.0, 1.0);
    flipR.rotation.z = -0.45;
    flipR.position.set(0, -flipLen * 0.28, 0);
    boneMap.flipper_R.add(flipR);
    parts.flipperR = flipR;

    // ═══ TAIL: 3 segments progressively thinner ═══
    const tailW2 = d.tailWidth * s;
    const tailRadii = [tailW2 * 0.28, tailW2 * 0.22, tailW2 * 0.16];
    const tailLens = [0.12 * s, 0.10 * s, 0.08 * s];
    for (let i = 0; i < 3; i++) {
        const tGeo = createCapsule(tailRadii[i], tailLens[i], 6, 3);
        const tMesh = new THREE.Mesh(tGeo, materials.body);
        tMesh.name = `tail${i + 1}`;
        tMesh.rotation.x = Math.PI * 0.50;
        boneMap[`tail_0${i + 1}`].add(tMesh);
        parts[`tail${i + 1}`] = tMesh;
    }

    // ═══ FLUKES: vertical crescent tail fin (sharks have vertical tails!) ═══
    const flukeSpan = d.flukeSpan * s;
    const flukeGeo = createCapsule(flukeSpan * 0.10, flukeSpan * 0.55, 5, 3);

    // Shark flukes are VERTICAL (unlike horizontal dolphin flukes)
    const flukeL = new THREE.Mesh(flukeGeo, materials.body);
    flukeL.name = 'flukeL';
    flukeL.scale.set(0.25, 1.0, 1.0);
    flukeL.position.set(0, flukeSpan * 0.15, 0);
    boneMap.fluke_L.add(flukeL);
    parts.flukeL = flukeL;

    const flukeR = new THREE.Mesh(flukeGeo, materials.body);
    flukeR.name = 'flukeR';
    flukeR.scale.set(0.25, 1.0, 1.0);
    flukeR.position.set(0, -flukeSpan * 0.15, 0);
    boneMap.fluke_R.add(flukeR);
    parts.flukeR = flukeR;

    return parts;
}


// ═══════════════════════════════════════
// PIRATE — biped human in a rowboat, hat, rowing arms
// Uses biped skeleton (not marine)
// ═══════════════════════════════════════

function _buildRigidPirate(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // Try GLB boat — replace procedural rowboat with imported model
    const hasGLBBoat = GLBModelCache.isLoaded('boat') && _buildGLBPirateBoat(s, boneMap, parts);

    // ═══ ROWBOAT: wooden boat on root, pirate sits inside ═══
    const boatL = d.boatLength * s;
    const boatW = d.boatWidth * s;
    const boatH = d.boatHeight * s;

    // Hull: rounded box (skip if GLB boat loaded)
    if (!hasGLBBoat) {
        const hullGeo = createRoundedBox(boatW, boatH, boatL, boatH * 0.20);
        const boatMat = new THREE.MeshBasicMaterial({ color: 0x9b7850 }); // PALETTE.oceanBoatWood
        const hull = new THREE.Mesh(hullGeo, boatMat);
        hull.name = 'hull';
        hull.position.set(0, -boatH * 0.80, 0);
        boneMap.root.add(hull);
        parts.hull = hull;

        // Boat rim / gunwale: slightly wider
        const rimGeo = createRoundedBox(boatW * 1.08, boatH * 0.15, boatL * 1.02, boatH * 0.06);
        const rimMat = new THREE.MeshBasicMaterial({ color: 0x6b5030 }); // PALETTE.oceanBoatDark
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.name = 'boatRim';
        rim.position.set(0, -boatH * 0.55, 0);
        boneMap.root.add(rim);
        parts.boatRim = rim;
    }

    // ═══ TORSO: pirate body sitting in the boat ═══
    const torsoW = d.torsoWidth * 0.45 * s;
    const torsoH = (config.bonePositions.spine.y + config.bonePositions.chest.y) * s * 1.10;
    const torsoD = d.torsoDepth * 0.45 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, Math.min(torsoW, torsoD) * 0.20);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, torsoH * 0.15, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: round with scruffy personality ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.95, 1.0);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes: narrowed, determined
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 5, 4);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * 0.08;
    const eyeZ = -headR * 0.88;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 0.70, 0.50); // squinting
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR.scale.set(1.0, 0.70, 0.50);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // Eyepatch: dark box over right eye
    const patchGeo = new THREE.BoxGeometry(headR * 0.18, headR * 0.14, headR * 0.04);
    const patch = new THREE.Mesh(patchGeo, faceMat);
    patch.name = 'eyepatch';
    patch.position.set(eyeSpacing, eyeY, eyeZ - eyeSize * 0.30);
    boneMap.head.add(patch);
    parts.eyepatch = patch;

    // Eyepatch strap
    const strapGeo = new THREE.BoxGeometry(headR * 0.04, headR * 0.04, headR * 0.80);
    const strap = new THREE.Mesh(strapGeo, faceMat);
    strap.name = 'strap';
    strap.position.set(eyeSpacing + headR * 0.08, eyeY + headR * 0.06, -headR * 0.40);
    boneMap.head.add(strap);
    parts.strap = strap;

    // Mouth: wide grin
    const mouthGeo = new THREE.BoxGeometry(headR * 0.25, headR * 0.05, headR * 0.04);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.28, eyeZ);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ PIRATE HAT: tricorn with brim ═══
    const hatH = d.hatHeight * s;
    const hatBrim = d.hatBrim * s;

    // Hat crown
    const crownGeo = createRoundedBox(headR * 0.65, hatH, headR * 0.55, hatH * 0.15);
    const hatMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // dark hat
    const crown = new THREE.Mesh(crownGeo, hatMat);
    crown.name = 'hatCrown';
    crown.position.set(0, headR * 0.70, 0);
    boneMap.head.add(crown);
    parts.hatCrown = crown;

    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(hatBrim, hatBrim, hatH * 0.12, 8);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.name = 'hatBrim';
    brim.position.set(0, headR * 0.55, -headR * 0.05);
    boneMap.head.add(brim);
    parts.hatBrim = brim;

    // ═══ ARMS: rowing arms with forearms ═══
    const armR2 = d.limbThickness * 0.45 * s;
    const armLen = 0.32 * s;
    const armGeo = createCapsule(armR2, armLen, 6, 3);

    const armL = new THREE.Mesh(armGeo, materials.skin);
    armL.name = 'armL';
    armL.position.set(0, -armLen * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.skin);
    armR.name = 'armR';
    armR.position.set(0, -armLen * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    const forearmLen = 0.28 * s;
    const forearmGeo = createCapsule(armR2 * 0.85, forearmLen, 6, 3);

    const forearmL = new THREE.Mesh(forearmGeo, materials.skin);
    forearmL.name = 'forearmL';
    forearmL.position.set(0, -forearmLen * 0.42, 0);
    boneMap.forearm_L.add(forearmL);
    parts.forearmL = forearmL;

    const forearmR = new THREE.Mesh(forearmGeo, materials.skin);
    forearmR.name = 'forearmR';
    forearmR.position.set(0, -forearmLen * 0.42, 0);
    boneMap.forearm_R.add(forearmR);
    parts.forearmR = forearmR;

    // ═══ LEGS: hidden in boat but needed for skeleton ═══
    const legR2 = d.limbThickness * 0.40 * s;
    const legLen = 0.30 * s;
    const legGeo = createCapsule(legR2, legLen, 6, 3);

    const legL = new THREE.Mesh(legGeo, materials.legs);
    legL.name = 'legL';
    legL.position.set(0, -legLen * 0.38, 0);
    boneMap.upperLeg_L.add(legL);
    parts.legL = legL;

    const legR = new THREE.Mesh(legGeo, materials.legs);
    legR.name = 'legR';
    legR.position.set(0, -legLen * 0.38, 0);
    boneMap.upperLeg_R.add(legR);
    parts.legR = legR;

    const lowerLegLen = 0.30 * s;
    const lowerLegGeo = createCapsule(legR2 * 0.85, lowerLegLen, 6, 3);

    const lowerLegL = new THREE.Mesh(lowerLegGeo, materials.legs);
    lowerLegL.name = 'lowerLegL';
    lowerLegL.position.set(0, -lowerLegLen * 0.38, 0);
    boneMap.lowerLeg_L.add(lowerLegL);
    parts.lowerLegL = lowerLegL;

    const lowerLegR = new THREE.Mesh(lowerLegGeo, materials.legs);
    lowerLegR.name = 'lowerLegR';
    lowerLegR.position.set(0, -lowerLegLen * 0.38, 0);
    boneMap.lowerLeg_R.add(lowerLegR);
    parts.lowerLegR = lowerLegR;

    return parts;
}


// ═══════════════════════════════════════
// SEA TURTLE — dome shell, flat body, 4 paddle flippers, small head
// ═══════════════════════════════════════

function _buildRigidSeaturtle(size, config, materials, boneMap) {
    // GLB model path — turtle GLB has separate parts, perfect for bone mapping
    if (GLBModelCache.isLoaded('seaturtle')) {
        return _buildGLBSeaturtle(size, config, materials, boneMap);
    }

    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ SHELL: dominant visual — dome on top, flat on bottom ═══
    const shellW = d.shellWidth * s;
    const shellH = d.shellHeight * s;
    const shellL = d.shellLength * s;

    // Shell dome: upper hemisphere
    const shellGeo = new THREE.SphereGeometry(shellW * 0.50, 10, 6,
        0, Math.PI * 2, 0, Math.PI * 0.55); // just top portion
    const shell = new THREE.Mesh(shellGeo, materials.body);
    shell.name = 'shell';
    shell.scale.set(1.0, shellH / (shellW * 0.50), shellL / shellW);
    shell.position.set(0, shellH * 0.10, 0);
    boneMap.shell.add(shell);
    parts.shell = shell;

    // Shell underside / plastron: flat
    const plastronGeo = new THREE.CylinderGeometry(shellW * 0.42, shellW * 0.38, shellH * 0.20, 10);
    const plastron = new THREE.Mesh(plastronGeo, materials.skin);
    plastron.name = 'plastron';
    plastron.position.set(0, -shellH * 0.15, 0);
    plastron.scale.set(1.0, 1.0, shellL / shellW);
    boneMap.shell.add(plastron);
    parts.plastron = plastron;

    // Shell pattern: subtle hexagonal scute marks (dark lines on shell)
    // Simple: a few dark rings as scute boundaries
    const scuteGeo = new THREE.TorusGeometry(shellW * 0.22, shellW * 0.008, 4, 6);
    const scute1 = new THREE.Mesh(scuteGeo, faceMat);
    scute1.name = 'scute1';
    scute1.position.set(0, shellH * 0.55, 0);
    scute1.rotation.x = Math.PI / 2;
    boneMap.shell.add(scute1);
    parts.scute1 = scute1;

    const scute2Geo = new THREE.TorusGeometry(shellW * 0.35, shellW * 0.006, 4, 8);
    const scute2 = new THREE.Mesh(scute2Geo, faceMat);
    scute2.name = 'scute2';
    scute2.position.set(0, shellH * 0.38, 0);
    scute2.rotation.x = Math.PI / 2;
    boneMap.shell.add(scute2);
    parts.scute2 = scute2;

    // ═══ BODY: flat horizontal body under shell ═══
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    // Front body section
    const frontGeo = new THREE.SphereGeometry(bodyW * 0.40, 8, 6);
    const frontBody = new THREE.Mesh(frontGeo, materials.body);
    frontBody.name = 'bodyFront';
    frontBody.scale.set(1.0, 0.50, 1.30);
    boneMap.body_front.add(frontBody);
    parts.bodyFront = frontBody;

    // Rear body section
    const rearGeo = new THREE.SphereGeometry(bodyW * 0.35, 8, 6);
    const rearBody = new THREE.Mesh(rearGeo, materials.body);
    rearBody.name = 'bodyRear';
    rearBody.scale.set(1.0, 0.45, 1.20);
    boneMap.body_rear.add(rearBody);
    parts.bodyRear = rearBody;

    // ═══ HEAD: small, endearing, extends forward ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.90, 0.85, 1.10);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes: small, kind
    const eyeSize = headR * 0.14;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 5, 4);
    const eyeSpacing = headR * 0.45;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.12, -headR * 0.55);
    eyeL.scale.set(0.60, 1.0, 0.45);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.12, -headR * 0.55);
    eyeR.scale.set(0.60, 1.0, 0.45);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // Beak: small hooked mouth
    const beakGeo = new THREE.ConeGeometry(headR * 0.12, headR * 0.15, 4);
    const beak = new THREE.Mesh(beakGeo, faceMat);
    beak.name = 'beak';
    beak.position.set(0, -headR * 0.15, -headR * 0.80);
    beak.rotation.x = Math.PI * 0.60; // points down-forward
    boneMap.head.add(beak);
    parts.beak = beak;

    // ═══ FLIPPERS: 4 paddle-like limbs ═══
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = createCapsule(flipW, flipLen, 6, 3);

    // Front flippers: larger, for swimming
    const fFlipL = new THREE.Mesh(flipGeo, materials.body);
    fFlipL.name = 'frontFlipperL';
    fFlipL.scale.set(0.35, 1.0, 1.0); // flat
    fFlipL.rotation.z = 0.50;
    fFlipL.position.set(0, -flipLen * 0.30, 0);
    boneMap.frontFlipper_L.add(fFlipL);
    parts.frontFlipperL = fFlipL;

    const fFlipR = new THREE.Mesh(flipGeo, materials.body);
    fFlipR.name = 'frontFlipperR';
    fFlipR.scale.set(0.35, 1.0, 1.0);
    fFlipR.rotation.z = -0.50;
    fFlipR.position.set(0, -flipLen * 0.30, 0);
    boneMap.frontFlipper_R.add(fFlipR);
    parts.frontFlipperR = fFlipR;

    // Hind flippers: smaller
    const hFlipLen = flipLen * 0.65;
    const hFlipGeo = createCapsule(flipW * 0.80, hFlipLen, 6, 3);

    const hFlipL = new THREE.Mesh(hFlipGeo, materials.body);
    hFlipL.name = 'hindFlipperL';
    hFlipL.scale.set(0.30, 1.0, 1.0);
    hFlipL.rotation.z = 0.40;
    hFlipL.position.set(0, -hFlipLen * 0.30, 0);
    boneMap.hindFlipper_L.add(hFlipL);
    parts.hindFlipperL = hFlipL;

    const hFlipR = new THREE.Mesh(hFlipGeo, materials.body);
    hFlipR.name = 'hindFlipperR';
    hFlipR.scale.set(0.30, 1.0, 1.0);
    hFlipR.rotation.z = -0.40;
    hFlipR.position.set(0, -hFlipLen * 0.30, 0);
    boneMap.hindFlipper_R.add(hFlipR);
    parts.hindFlipperR = hFlipR;

    // ═══ TAIL: short stubby ═══
    const tailLen = 0.06 * s;
    const tailR2 = bodyW * 0.08;
    const tailGeo = createCapsule(tailR2, tailLen, 5, 3);
    const tail = new THREE.Mesh(tailGeo, materials.body);
    tail.name = 'tail1';
    tail.rotation.x = Math.PI * 0.55;
    boneMap.tail_01.add(tail);
    parts.tail1 = tail;

    return parts;
}


// ═══════════════════════════════════════
// JELLYFISH — pulsing bell, 5 tentacle chains, ethereal glow
// ═══════════════════════════════════════

function _buildRigidJellyfish(size, config, materials, boneMap) {
    // GLB model path — use imported bell, keep procedural tentacles
    if (GLBModelCache.isLoaded('jellyfish')) {
        return _buildGLBJellyfish(size, config, materials, boneMap);
    }

    const s = size;
    const parts = {};
    const d = config.bodyDimensions;

    // ═══ BELL: half-sphere, the main body ═══
    const bellR = d.bellRadius * s;
    const bellH = d.bellHeight * s;

    // Bell dome: upper hemisphere (pulsing via animation scale)
    const bellGeo = new THREE.SphereGeometry(bellR, 12, 8,
        0, Math.PI * 2, 0, Math.PI * 0.60); // top portion
    const bell = new THREE.Mesh(bellGeo, materials.body);
    bell.name = 'bell';
    bell.scale.set(1.0, bellH / bellR, 1.0);
    boneMap.body_front.add(bell);
    parts.bell = bell;

    // Bell underside rim: slight lip
    const rimGeo = new THREE.TorusGeometry(bellR * 0.85, bellR * 0.06, 6, 16);
    const rim = new THREE.Mesh(rimGeo, materials.body);
    rim.name = 'bellRim';
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, -bellH * 0.15, 0);
    boneMap.body_front.add(rim);
    parts.bellRim = rim;

    // Inner glow: slightly smaller, brighter sphere visible through translucent bell
    const glowR = d.innerGlowRadius * s;
    const glowGeo = new THREE.SphereGeometry(glowR, 8, 6,
        0, Math.PI * 2, 0, Math.PI * 0.50);
    const glowMat = new THREE.MeshBasicMaterial({
        color: config.materialColors.skin,
        transparent: true,
        opacity: 0.60,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'innerGlow';
    glow.scale.set(1.0, bellH / glowR * 0.65, 1.0);
    glow.position.set(0, bellH * 0.05, 0);
    boneMap.head.add(glow);
    parts.innerGlow = glow;

    // ═══ TENTACLES: 5 chains of 3 segments each ═══
    const tentR = d.tentacleThickness * s;
    const tentLen = d.tentacleLength * s;
    const segLens = [tentLen * 0.35, tentLen * 0.35, tentLen * 0.30];
    const segRadii = [tentR, tentR * 0.75, tentR * 0.50];

    for (let t = 0; t < 5; t++) {
        for (let seg = 0; seg < 3; seg++) {
            const segGeo = createCapsule(segRadii[seg], segLens[seg], 5, 3);
            const segMesh = new THREE.Mesh(segGeo, materials.body);
            segMesh.name = `tent${t}_${seg + 1}`;
            segMesh.position.set(0, -segLens[seg] * 0.35, 0);
            const boneName = `tent_${t}_0${seg + 1}`;
            boneMap[boneName].add(segMesh);
            parts[`tent${t}_${seg + 1}`] = segMesh;
        }
    }

    // Small oral arms: short frilly bits near center under bell
    const oralGeo = createCapsule(tentR * 1.20, tentLen * 0.20, 4, 2);
    const oralMat = materials.skin;
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const oral = new THREE.Mesh(oralGeo, oralMat);
        oral.name = `oral${i}`;
        oral.position.set(
            Math.sin(angle) * bellR * 0.25,
            -bellH * 0.30,
            Math.cos(angle) * bellR * 0.25
        );
        boneMap.body_rear.add(oral);
        parts[`oral${i}`] = oral;
    }

    return parts;
}


// ═══════════════════════════════════════════════════════════════
// GLB MODEL BUILDERS — imported 3D models, toon-shaded
// Each builder loads geometry from GLBModelCache, centers/scales it,
// applies toon materials, and parents to bones for animation.
// Falls back to procedural if GLB not loaded.
// ═══════════════════════════════════════════════════════════════

/**
 * Helper: take a cached GLB geometry, center it, scale to target length,
 * create a Mesh with given material, and parent to a bone.
 */
function _glbMeshFromCache(key, material, targetLength, bone, opts = {}) {
    const clones = GLBModelCache.cloneGeometries(key);
    if (!clones || clones.length === 0) return null;

    const bboxSize = GLBModelCache.getBBoxSize(key);
    const bboxCenter = GLBModelCache.getBBoxCenter(key);

    // Determine which axis is longest for scale reference
    const longest = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
    const scale = targetLength / longest;

    // Merge all sub-meshes into a single group or use first mesh
    const parts = [];
    for (const clone of clones) {
        const geo = clone.geometry;
        // Center geometry at origin
        geo.translate(-bboxCenter.x, -bboxCenter.y, -bboxCenter.z);
        // Scale to target
        geo.scale(scale, scale, scale);
        // Optional rotation correction
        if (opts.rotX) geo.rotateX(opts.rotX);
        if (opts.rotY) geo.rotateY(opts.rotY);
        if (opts.rotZ) geo.rotateZ(opts.rotZ);
        // Recompute normals after transform
        geo.computeVertexNormals();

        const mat = opts.materialForMesh
            ? opts.materialForMesh(clone.name, clone.originalMaterialName)
            : material;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = clone.name;
        parts.push(mesh);
    }
    return { parts, scale };
}

/**
 * Split a single geometry into front (z < splitZ) and rear (z >= splitZ) halves.
 * Returns { frontGeo, rearGeo } — both cloned and ready for use.
 */
function _splitGeometryZ(geometry, splitZ) {
    const pos = geometry.getAttribute('position');
    const idx = geometry.getIndex();
    if (!idx || !pos) return null;

    const indices = idx.array;
    const positions = pos.array;
    const frontIndices = [];
    const rearIndices = [];

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        const z0 = positions[i0 * 3 + 2];
        const z1 = positions[i1 * 3 + 2];
        const z2 = positions[i2 * 3 + 2];
        const avgZ = (z0 + z1 + z2) / 3;
        if (avgZ < splitZ) {
            frontIndices.push(i0, i1, i2);
        } else {
            rearIndices.push(i0, i1, i2);
        }
    }

    const frontGeo = geometry.clone();
    frontGeo.setIndex(frontIndices);
    const rearGeo = geometry.clone();
    rearGeo.setIndex(rearIndices);

    return { frontGeo, rearGeo };
}


// ─── GLB DOLPHIN ───
function _buildGLBDolphin(size, config, materials, boneMap) {
    const parts = {};
    const s = size;
    const d = config.bodyDimensions;
    const targetLen = d.bodyLength * s * 1.4;

    const result = _glbMeshFromCache('dolphin', materials.body, targetLen, boneMap.root, {
        rotY: Math.PI,
    });
    if (!result) return _buildRigidDolphin(size, config, materials, boneMap);

    // GLB body on root — the model already has dorsal, flippers, tail, flukes built in
    const body = result.parts[0];
    body.name = 'glbBody';
    body.material = materials.body;
    boneMap.root.add(body);
    parts.glbBody = body;

    // Belly highlight — skin-colored underside
    const bellyGeo = body.geometry.clone();
    const belly = new THREE.Mesh(bellyGeo, materials.skin);
    belly.name = 'belly';
    belly.scale.set(0.92, 0.82, 0.92);
    belly.position.y = -d.bodyHeight * s * 0.10;
    boneMap.root.add(belly);
    parts.belly = belly;

    // Eyes on head bone
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const headR = d.headRadius * s;
    const eyeGeo = new THREE.SphereGeometry(headR * 0.14, 6, 5);
    const eyeSpacing = headR * 0.48;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.05, headR * 0.50);
    eyeL.scale.set(0.55, 1.10, 0.45);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.05, headR * 0.50);
    eyeR.scale.set(0.55, 1.10, 0.45);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    return parts;
}


// ─── GLB FLYING FISH ───
// GLB body on root + fix wing attachment + procedural animated parts on bones
function _buildGLBFlyfish(size, config, materials, boneMap) {
    const parts = {};
    const s = size;
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const targetLen = d.bodyLength * s * 1.4;

    const result = _glbMeshFromCache('flyfish', materials.body, targetLen, boneMap.root, {
        rotY: Math.PI,
    });
    if (!result) return _buildRigidFlyfish(size, config, materials, boneMap);

    // ═══ GLB body on root — preserves beautiful 3D model shape ═══
    const body = result.parts[0];
    body.name = 'glbBody';
    body.material = materials.body;
    boneMap.root.add(body);
    parts.glbBody = body;

    // ═══ Wings: FIXED attachment — overlaps body at base, no gap ═══
    const flipLen = d.flipperLength * s;
    const flipW = d.flipperWidth * s;
    const flipGeo = createCapsule(flipW, flipLen, 6, 3);

    // Wings centered on bone (bone is at body edge), inner portion overlaps body
    const flipL = new THREE.Mesh(flipGeo, materials.body);
    flipL.name = 'flipperL';
    flipL.scale.set(0.28, 1.0, 1.0);
    flipL.rotation.z = 0.50;
    flipL.position.set(0, -flipLen * 0.08, 0); // minimal drop — stays connected
    boneMap.flipper_L.add(flipL);
    parts.flipperL = flipL;

    const flipR = new THREE.Mesh(flipGeo, materials.body);
    flipR.name = 'flipperR';
    flipR.scale.set(0.28, 1.0, 1.0);
    flipR.rotation.z = -0.50;
    flipR.position.set(0, -flipLen * 0.08, 0);
    boneMap.flipper_R.add(flipR);
    parts.flipperR = flipR;

    // ═══ Eyes on head bone ═══
    const headR = d.headRadius * s;
    const eyeGeo = new THREE.SphereGeometry(headR * 0.12, 5, 4);
    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-headR * 0.42, headR * 0.05, headR * 0.45);
    eyeL.scale.set(0.55, 1.0, 0.50);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(headR * 0.42, headR * 0.05, headR * 0.45);
    eyeR.scale.set(0.55, 1.0, 0.50);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    return parts;
}


// ─── GLB SHARK ───
// GLB body on root + procedural animated appendages on bones
function _buildGLBShark(size, config, materials, boneMap) {
    const parts = {};
    const s = size;
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const targetLen = d.bodyLength * s * 1.3;

    const result = _glbMeshFromCache('shark', materials.body, targetLen, boneMap.root, {
        rotY: Math.PI,
    });
    if (!result) return _buildRigidShark(size, config, materials, boneMap);

    // ═══ GLB body on root — preserves beautiful 3D model shape ═══
    const body = result.parts[0];
    body.name = 'glbBody';
    body.material = materials.body;
    boneMap.root.add(body);
    parts.glbBody = body;

    // Belly counter-shading
    const bellyGeo = body.geometry.clone();
    const belly = new THREE.Mesh(bellyGeo, materials.skin);
    belly.name = 'belly';
    belly.scale.set(0.90, 0.80, 0.90);
    belly.position.y = -d.bodyHeight * s * 0.08;
    boneMap.root.add(belly);
    parts.belly = belly;

    // ═══ Eyes on head bone ═══
    const headR = d.headRadius * s;
    const eyeGeo = new THREE.SphereGeometry(headR * 0.10, 5, 4);
    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-headR * 0.68, headR * 0.08, headR * 0.40);
    eyeL.scale.set(0.50, 0.90, 0.45);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(headR * 0.68, headR * 0.08, headR * 0.40);
    eyeR.scale.set(0.50, 0.90, 0.45);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // ═══ Jaw: organic rounded shape (no more square box!) ═══
    const jawW = d.jawWidth * s;
    const jawGeo = new THREE.SphereGeometry(jawW * 0.55, 10, 5);
    const jaw = new THREE.Mesh(jawGeo, faceMat);
    jaw.name = 'jaw';
    jaw.position.set(0, -headR * 0.45, headR * 0.30);
    jaw.scale.set(1.3, 0.35, 0.9); // wide, thin ellipsoid — organic mouth
    boneMap.head.add(jaw);
    parts.jaw = jaw;

    // Teeth arranged in gentle arc
    const toothGeo = new THREE.ConeGeometry(jawW * 0.04, jawW * 0.12, 3);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xfaf5ef });
    for (let t = 0; t < 5; t++) {
        const tooth = new THREE.Mesh(toothGeo, toothMat);
        tooth.name = `tooth${t}`;
        const frac = (t - 2) / 2.5;
        const tx = frac * jawW * 0.50;
        const tz = headR * 0.50 + (1 - frac * frac) * jawW * 0.15;
        tooth.position.set(tx, -headR * 0.50, tz);
        tooth.rotation.x = Math.PI;
        boneMap.head.add(tooth);
        parts[`tooth${t}`] = tooth;
    }

    return parts;
}


// ─── GLB SEA TURTLE ───
function _buildGLBSeaturtle(size, config, materials, boneMap) {
    const parts = {};
    const s = size;
    const d = config.bodyDimensions;

    const targetWidth = d.shellWidth * s * 1.2;
    const result = _glbMeshFromCache('seaturtle', materials.body, targetWidth, boneMap.root, {
        rotY: Math.PI,
    });
    if (!result) return _buildRigidSeaturtle(size, config, materials, boneMap);

    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // Attach all turtle meshes to root
    for (let i = 0; i < result.parts.length; i++) {
        const mesh = result.parts[i];
        const name = mesh.name;

        if (name === 'Plastron') {
            mesh.material = materials.skin;
        } else if (name === 'Eye_Left' || name === 'Eye_Right') {
            mesh.material = faceMat;
        } else {
            mesh.material = materials.body;
        }

        boneMap.root.add(mesh);
        parts[name || `part${i}`] = mesh;
    }

    return parts;
}


// ─── GLB JELLYFISH ───
function _buildGLBJellyfish(size, config, materials, boneMap) {
    const parts = {};
    const s = size;
    const d = config.bodyDimensions;
    const targetDiam = d.bellRadius * s * 2.5; // bell diameter

    const result = _glbMeshFromCache('jellyfish', materials.body, targetDiam, boneMap.root);
    if (!result) return _buildRigidJellyfish(size, config, materials, boneMap);

    // Bell — attach to root (body_front offset causes misalignment)
    const bellMesh = result.parts[0];
    bellMesh.name = 'bell';
    bellMesh.material = materials.body.clone();
    bellMesh.material.transparent = true;
    bellMesh.material.opacity = 0.85;
    boneMap.root.add(bellMesh);
    parts.bell = bellMesh;

    // Inner glow — brighter sphere visible through bell
    const glowR = d.innerGlowRadius * s;
    const glowGeo = new THREE.SphereGeometry(glowR, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.50);
    const glowMat = new THREE.MeshBasicMaterial({
        color: config.materialColors.skin,
        transparent: true,
        opacity: 0.60,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'innerGlow';
    glow.scale.set(1.0, d.bellHeight / glowR * 0.65, 1.0);
    glow.position.set(0, d.bellHeight * s * 0.05, 0);
    boneMap.head.add(glow);
    parts.innerGlow = glow;

    // Tentacles — keep procedural for per-bone animation
    const tentR = d.tentacleThickness * s;
    const tentLen = d.tentacleLength * s;
    const segLens = [tentLen * 0.35, tentLen * 0.35, tentLen * 0.30];
    const segRadii = [tentR, tentR * 0.75, tentR * 0.50];

    for (let t = 0; t < 5; t++) {
        for (let seg = 0; seg < 3; seg++) {
            const segGeo = createCapsule(segRadii[seg], segLens[seg], 5, 3);
            const segMesh = new THREE.Mesh(segGeo, materials.body);
            segMesh.name = `tent${t}_${seg + 1}`;
            segMesh.position.set(0, -segLens[seg] * 0.35, 0);
            const boneName = `tent_${t}_0${seg + 1}`;
            boneMap[boneName].add(segMesh);
            parts[`tent${t}_${seg + 1}`] = segMesh;
        }
    }

    // Oral arms
    const oralGeo = createCapsule(tentR * 1.20, tentLen * 0.20, 4, 2);
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const oral = new THREE.Mesh(oralGeo, materials.skin);
        oral.name = `oral${i}`;
        oral.position.set(
            Math.sin(angle) * d.bellRadius * s * 0.25,
            -d.bellHeight * s * 0.30,
            Math.cos(angle) * d.bellRadius * s * 0.25
        );
        boneMap.body_rear.add(oral);
        parts[`oral${i}`] = oral;
    }

    return parts;
}


// ─── GLB PIRATE BOAT ───
// Pirate stays fully procedural, but swaps procedural rowboat for GLB version
function _buildGLBPirateBoat(size, boneMap, parts) {
    const data = GLBModelCache.get('boat');
    if (!data) return false;

    const bboxSize = GLBModelCache.getBBoxSize('boat');
    const bboxCenter = GLBModelCache.getBBoxCenter('boat');

    // Scale boat to match pirate's boat dimensions
    const targetLen = 1.8 * size; // boatLength from config
    const scaleFactor = targetLen / Math.max(bboxSize.x, bboxSize.y, bboxSize.z);

    const clones = GLBModelCache.cloneGeometries('boat');
    if (!clones) return false;

    const boatMat = new THREE.MeshBasicMaterial({ color: 0x9b7850 });
    for (const clone of clones) {
        const geo = clone.geometry;
        geo.translate(-bboxCenter.x, -bboxCenter.y, -bboxCenter.z);
        geo.scale(scaleFactor, scaleFactor, scaleFactor);
        geo.rotateY(Math.PI); // face +Z (toward toilet)
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, boatMat);
        mesh.name = 'glb_' + clone.name;
        mesh.position.y = -0.4 * size; // sit below the pirate
        boneMap.root.add(mesh);
        parts['glb_' + clone.name] = mesh;
    }
    return true;
}


// ═══════════════════════════════════════════════════════
// AIRPLANE ENEMIES — fully procedural, matching Office quality bar.
// Each has: distinctive silhouette, expressive Mii-style face,
// signature accessories, and personality-driven proportions.
// ═══════════════════════════════════════════════════════

// Shared ink material for facial features
// Helper: standard biped face (eyes, brows, mouth) on head bone
function _addFace(parts, boneMap, headR, faceMat, opts = {}) {
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * (opts.eyeY || 0.05);
    const eyeZ = -headR * 0.90;
    const eyeScaleY = opts.eyeScaleY || 1.3;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, eyeScaleY, 0.5);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, eyeScaleY, 0.5);
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(headR * 0.24, headR * 0.045, headR * 0.05);
    const browAngle = opts.browAngle || 0;
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, browAngle);
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, -browAngle);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth
    if (opts.mouthShape === 'O') {
        const mouthGeo = new THREE.TorusGeometry(headR * 0.09, headR * 0.025, 6, 8);
        const mouth = new THREE.Mesh(mouthGeo, faceMat);
        mouth.name = 'mouth';
        mouth.position.set(0, -headR * 0.22, eyeZ);
        mouth.rotation.set(Math.PI / 2, 0, 0);
        boneMap.head.add(mouth);
        parts.mouth = mouth;
    } else if (opts.mouthShape === 'smile') {
        const mouthGeo = new THREE.TorusGeometry(headR * 0.10, headR * 0.02, 4, 8, Math.PI);
        const mouth = new THREE.Mesh(mouthGeo, faceMat);
        mouth.name = 'mouth';
        mouth.position.set(0, -headR * 0.22, eyeZ - headR * 0.02);
        mouth.rotation.set(0, 0, Math.PI);
        boneMap.head.add(mouth);
        parts.mouth = mouth;
    } else {
        const mw = opts.mouthWidth || 0.22;
        const mouthGeo = new THREE.BoxGeometry(headR * mw, headR * 0.04, headR * 0.05);
        const mouth = new THREE.Mesh(mouthGeo, faceMat);
        mouth.name = 'mouth';
        mouth.position.set(0, -headR * 0.22, eyeZ - headR * 0.02);
        if (opts.mouthAngle) mouth.rotation.set(0, 0, opts.mouthAngle);
        boneMap.head.add(mouth);
        parts.mouth = mouth;
    }
}

// Helper: standard procedural arms (capsules on arm bones)
function _addArms(parts, boneMap, s, materials, opts = {}) {
    const armRadius = (opts.armRadius || 0.065) * s;
    const armLength = (opts.armLength || 0.50) * s;
    const armGeo = createCapsule(armRadius, armLength, 8, 4);
    const armMat = opts.armMaterial || materials.body;

    const armL = new THREE.Mesh(armGeo, armMat);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, armMat);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // Hands
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
}

// Helper: standard procedural legs (capsules on leg bones)
function _addLegs(parts, boneMap, s, materials, opts = {}) {
    const ulRadius = (opts.ulRadius || 0.095) * s;
    const ulH = (opts.ulHeight || 0.34) * s;
    const ulGeo = createCapsule(ulRadius, ulH, 8, 4);

    const ulL = new THREE.Mesh(ulGeo, materials.legs);
    ulL.name = 'upperLegL';
    ulL.position.set(0, -ulH * 0.3, 0);
    boneMap.upperLeg_L.add(ulL);
    parts.upperLegL = ulL;

    const ulR = new THREE.Mesh(ulGeo, materials.legs);
    ulR.name = 'upperLegR';
    ulR.position.set(0, -ulH * 0.3, 0);
    boneMap.upperLeg_R.add(ulR);
    parts.upperLegR = ulR;

    const llRadius = (opts.llRadius || 0.08) * s;
    const llH = (opts.llHeight || 0.32) * s;
    const llGeo = createCapsule(llRadius, llH, 8, 4);

    const llL = new THREE.Mesh(llGeo, materials.legs);
    llL.name = 'lowerLegL';
    llL.position.set(0, -llH * 0.35, 0);
    boneMap.lowerLeg_L.add(llL);
    parts.lowerLegL = llL;

    const llR = new THREE.Mesh(llGeo, materials.legs);
    llR.name = 'lowerLegR';
    llR.position.set(0, -llH * 0.35, 0);
    boneMap.lowerLeg_R.add(llR);
    parts.lowerLegR = llR;

    // Shoes — chunky rounded blocks, visible from top-down
    const shoeW = Math.max(0.11 * s, llRadius * 1.6);
    const shoeH = Math.max(0.05 * s, llRadius * 0.5);
    const shoeD = Math.max(0.15 * s, llRadius * 2.0);
    const shoeGeo = createRoundedBox(shoeW, shoeH, shoeD, 0.02 * s);
    const shoeL = new THREE.Mesh(shoeGeo, materials.legs);
    shoeL.name = 'shoeL';
    shoeL.position.set(0, -llH * 0.72, -0.03 * s);
    boneMap.lowerLeg_L.add(shoeL);
    parts.shoeL = shoeL;

    const shoeR = new THREE.Mesh(shoeGeo, materials.legs);
    shoeR.name = 'shoeR';
    shoeR.position.set(0, -llH * 0.72, -0.03 * s);
    boneMap.lowerLeg_R.add(shoeR);
    parts.shoeR = shoeR;
}

// ─── NERVOUS FLYER ─── hunched anxious body, huge worried eyes, neck pillow, sweat drops
function _buildRigidNervousFlyer(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: slightly hunched, compressed — tense posture ═══
    const spineToRoot = 0.25 * s;
    const spineToChest = 0.30 * s;
    const torsoW = 0.42 * s;   // wide enough to read
    const torsoH = (spineToRoot + spineToChest) * 1.15;
    const torsoD = 0.34 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.07 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    torso.scale.set(1.0, 0.95, 1.0);  // slightly compressed — tense
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: sphere with PANIC face — huge wide eyes, arched brows ═══
    const headR = 0.30 * s;  // slightly larger head — vulnerability
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.92, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes — WIDE with visible whites (pupils + white eyeball)
    const eyeSize = headR * 0.13;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * 0.06;
    const eyeZ = -headR * 0.90;
    // White eyeball
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const whiteGeo = new THREE.SphereGeometry(eyeSize * 1.2, 6, 5);
    const whiteL = new THREE.Mesh(whiteGeo, whiteMat);
    whiteL.name = 'whiteL';
    whiteL.position.set(-eyeSpacing, eyeY, eyeZ + headR * 0.02);
    whiteL.scale.set(1.0, 1.3, 0.4);
    boneMap.head.add(whiteL);
    parts.whiteL = whiteL;
    const whiteR = whiteL.clone();
    whiteR.name = 'whiteR';
    whiteR.position.x = eyeSpacing;
    boneMap.head.add(whiteR);
    parts.whiteR = whiteR;
    // Dark pupils — small, high (showing whites below)
    const pupilL = new THREE.Mesh(eyeGeo, faceMat);
    pupilL.name = 'eyeL';
    pupilL.position.set(-eyeSpacing, eyeY + headR * 0.04, eyeZ);
    pupilL.scale.set(0.7, 0.9, 0.5);
    boneMap.head.add(pupilL);
    parts.eyeL = pupilL;
    const pupilR = pupilL.clone();
    pupilR.name = 'eyeR';
    pupilR.position.x = eyeSpacing;
    boneMap.head.add(pupilR);
    parts.eyeR = pupilR;

    // Eyebrows — high worried arch (/\)
    const browGeo = new THREE.BoxGeometry(headR * 0.24, headR * 0.05, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.24, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, 0.35);
    boneMap.head.add(browL);
    parts.browL = browL;
    const browR = browL.clone();
    browR.name = 'browR';
    browR.position.x = eyeSpacing;
    browR.rotation.set(0, 0, -0.35);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — tight grimace line
    const mouthGeo = new THREE.BoxGeometry(headR * 0.20, headR * 0.04, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.24, eyeZ - headR * 0.02);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ NECK PILLOW: big puffy torus — signature accessory ═══
    const pillowGeo = new THREE.TorusGeometry(headR * 0.62, headR * 0.22, 8, 14);
    const pillowMat = materials.body.clone();
    pillowMat.uniforms.uBaseColor = { value: new THREE.Color(0x6688aa) };
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.name = 'neckPillow';
    pillow.position.set(0, -headR * 0.50, 0);
    pillow.rotation.set(Math.PI / 2, 0, 0);
    boneMap.head.add(pillow);
    parts.neckPillow = pillow;

    // ═══ SWEAT DROPS: two floating droplets — stress indicator ═══
    const sweatGeo = new THREE.SphereGeometry(headR * 0.08, 5, 4);
    const sweatMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 });
    const sweat1 = new THREE.Mesh(sweatGeo, sweatMat);
    sweat1.name = 'sweat1';
    sweat1.position.set(-headR * 0.60, headR * 0.30, -headR * 0.50);
    sweat1.scale.set(0.6, 1.4, 0.5);
    boneMap.head.add(sweat1);
    parts.sweat1 = sweat1;
    const sweat2 = new THREE.Mesh(sweatGeo, sweatMat);
    sweat2.name = 'sweat2';
    sweat2.position.set(headR * 0.55, headR * 0.45, -headR * 0.40);
    sweat2.scale.set(0.5, 1.2, 0.4);
    boneMap.head.add(sweat2);
    parts.sweat2 = sweat2;

    // Small messy hair tuft
    const tuftGeo = new THREE.SphereGeometry(headR * 0.30, 6, 5);
    const tuft = new THREE.Mesh(tuftGeo, materials.body);
    tuft.name = 'tuft';
    tuft.position.set(0, headR * 0.72, -headR * 0.1);
    tuft.scale.set(1.2, 0.50, 1.0);
    boneMap.head.add(tuft);
    parts.tuft = tuft;

    // ═══ ARMS: chunky, close to body ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.085, armLength: 0.42 });
    _addLegs(parts, boneMap, s, materials, { ulRadius: 0.11, ulHeight: 0.30, llRadius: 0.09, llHeight: 0.28 });

    return parts;
}

// ─── BUSINESS CLASS ─── broad shoulders, dark navy suit, briefcase, tie, slicked hair, stern
function _buildRigidBusinessClass(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: wider at shoulders, tapered — power suit silhouette ═══
    const spineToRoot = 0.28 * s;
    const spineToChest = 0.32 * s;
    const torsoW = 0.46 * s;  // broad shoulders
    const torsoH = (spineToRoot + spineToChest) * 1.18;
    const torsoD = 0.34 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.30, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // Shirt collar — white V-shape at top of torso
    const collarGeo = new THREE.BoxGeometry(torsoW * 0.50, 0.04 * s, torsoD * 0.30);
    const collarMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e8 });
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.name = 'collar';
    collar.position.set(0, torsoH * 0.42, -torsoD * 0.42);
    boneMap.spine.add(collar);
    parts.collar = collar;

    // TIE: red stripe down front
    const tieGeo = new THREE.BoxGeometry(0.04 * s, torsoH * 0.65, 0.015 * s);
    const tieMat = new THREE.MeshBasicMaterial({ color: 0xc03040 });
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.name = 'tie';
    tie.position.set(0, 0, -torsoD * 0.52);
    boneMap.spine.add(tie);
    parts.tie = tie;

    // ═══ HEAD: slightly smaller (proportionally) — suit makes body dominant ═══
    const headR = 0.27 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.95, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes — narrowed, judgmental
    _addFace(parts, boneMap, headR, faceMat, {
        browAngle: -0.20,    // stern furrowed
        eyeScaleY: 0.9,     // narrowed, disapproving
        mouthWidth: 0.16,   // tight pursed lips
    });

    // Slicked-back hair — prominent dark cap
    const hairGeo = new THREE.SphereGeometry(headR * 0.92, 10, 8);
    const hairMat = materials.body.clone();
    hairMat.uniforms.uBaseColor = { value: new THREE.Color(0x1a1a1a) };
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.name = 'hair';
    hair.position.set(0, headR * 0.18, headR * 0.10);
    hair.scale.set(1.06, 0.50, 1.12);
    boneMap.head.add(hair);
    parts.hair = hair;

    // ═══ BRIEFCASE: prominent leather box at hand height ═══
    const bcW = 0.22 * s;
    const bcH = 0.16 * s;
    const bcD = 0.06 * s;
    const bcGeo = createRoundedBox(bcW, bcH, bcD, 0.012 * s);
    const bcMat = new THREE.MeshBasicMaterial({ color: 0x4a3a2a });
    const bc = new THREE.Mesh(bcGeo, bcMat);
    bc.name = 'briefcase';
    bc.position.set(0, -0.46 * s, 0);
    boneMap.upperArm_R.add(bc);
    parts.briefcase = bc;
    // Briefcase clasp
    const claspGeo = new THREE.BoxGeometry(bcW * 0.15, bcH * 0.08, bcD * 0.5);
    const claspMat = new THREE.MeshBasicMaterial({ color: 0xdaa520 });
    const clasp = new THREE.Mesh(claspGeo, claspMat);
    clasp.name = 'clasp';
    clasp.position.set(0, -0.46 * s + bcH * 0.35, -bcD * 0.55);
    boneMap.upperArm_R.add(clasp);
    parts.clasp = clasp;

    // ═══ ARMS (chunky suit) + LEGS (matching suit, thick) ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.090, armLength: 0.40 });
    _addLegs(parts, boneMap, s, materials, { ulRadius: 0.115, ulHeight: 0.30, llRadius: 0.095, llHeight: 0.28 });

    return parts;
}

// ─── TURBULENCE STUMBLER ─── pear-shaped, huge belly, green-sick, vomit bag, wide stance
function _buildRigidStumbler(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: pear-shaped organic — bottom-heavy like the Waddle Tank ═══
    const waistR = 0.32 * s;
    const chestR = 0.22 * s;
    const torsoH = 0.65 * s;
    const torsoGeo = createOrganicTorso(waistR, chestR, torsoH, 0.15, 10, 10);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, 0, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ BELLY: protruding gut — parented to belly bone ═══
    if (boneMap.belly) {
        const bellyR = (d.bellyRadius || 0.45) * s;
        const bellyGeo = new THREE.SphereGeometry(bellyR * 0.7, 10, 8);
        const belly = new THREE.Mesh(bellyGeo, materials.body);
        belly.name = 'belly';
        belly.scale.set(1.15, 0.85, 1.3);  // wide and protruding forward
        belly.position.set(0, 0, -0.05 * s);
        boneMap.belly.add(belly);
        parts.belly = belly;
    }

    // ═══ HEAD: big, greenish-tinged, queasy expression ═══
    const headR = 0.32 * s;  // big round head
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.05, 0.95, 1.0);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes — HUGE with terror/nausea, pupils tiny
    const eyeSize = headR * 0.14;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * 0.08;
    const eyeZ = -headR * 0.90;
    // White eyeballs
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xeeffee });  // slightly green whites
    const whiteGeo = new THREE.SphereGeometry(eyeSize * 1.3, 6, 5);
    const whiteL = new THREE.Mesh(whiteGeo, whiteMat);
    whiteL.name = 'whiteL';
    whiteL.position.set(-eyeSpacing, eyeY, eyeZ + headR * 0.02);
    whiteL.scale.set(1.0, 1.5, 0.4);
    boneMap.head.add(whiteL);
    parts.whiteL = whiteL;
    const whiteR = whiteL.clone();
    whiteR.name = 'whiteR';
    whiteR.position.x = eyeSpacing;
    boneMap.head.add(whiteR);
    parts.whiteR = whiteR;
    // Tiny terrified pupils
    const pupilL = new THREE.Mesh(eyeGeo, faceMat);
    pupilL.name = 'eyeL';
    pupilL.position.set(-eyeSpacing, eyeY, eyeZ);
    pupilL.scale.set(0.5, 0.6, 0.5);
    boneMap.head.add(pupilL);
    parts.eyeL = pupilL;
    const pupilR = pupilL.clone();
    pupilR.name = 'eyeR';
    pupilR.position.x = eyeSpacing;
    boneMap.head.add(pupilR);
    parts.eyeR = pupilR;

    // Brows — high arch
    const browGeo = new THREE.BoxGeometry(headR * 0.26, headR * 0.05, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.26, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, 0.40);
    boneMap.head.add(browL);
    parts.browL = browL;
    const browR = browL.clone();
    browR.name = 'browR';
    browR.position.x = eyeSpacing;
    browR.rotation.set(0, 0, -0.40);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — big O (about to be sick)
    const mouthGeo = new THREE.SphereGeometry(headR * 0.12, 8, 6);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.22, eyeZ);
    mouth.scale.set(1.0, 1.3, 0.5);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // Green cheek patches — queasy tint
    const cheekGeo = new THREE.SphereGeometry(headR * 0.18, 6, 5);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0x7ab87a, transparent: true, opacity: 0.45 });
    const cheekL = new THREE.Mesh(cheekGeo, cheekMat);
    cheekL.name = 'cheekL';
    cheekL.position.set(-headR * 0.38, -headR * 0.08, -headR * 0.72);
    cheekL.scale.set(1.0, 0.65, 0.3);
    boneMap.head.add(cheekL);
    parts.cheekL = cheekL;
    const cheekR = cheekL.clone();
    cheekR.name = 'cheekR';
    cheekR.position.x = headR * 0.38;
    boneMap.head.add(cheekR);
    parts.cheekR = cheekR;

    // ═══ VOMIT BAG: white paper bag held in front ═══
    const bagW = 0.10 * s;
    const bagH = 0.16 * s;
    const bagGeo = createRoundedBox(bagW, bagH, 0.06 * s, 0.008 * s);
    const bagMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e0 });
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.name = 'vomitBag';
    bag.position.set(0, -0.36 * s, -0.04 * s);
    boneMap.upperArm_L.add(bag);
    parts.vomitBag = bag;

    // ═══ ARMS (thick, unsteady) + LEGS (wide stumpy stance) ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.095, armLength: 0.38 });
    _addLegs(parts, boneMap, s, materials, { ulRadius: 0.13, ulHeight: 0.28, llRadius: 0.105, llHeight: 0.26 });

    return parts;
}

// ─── FLIGHT ATTENDANT ─── slim upright, pill hat, serving tray, forced smile, heels
function _buildRigidAttendant(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: narrow, tall, upright — professional stance ═══
    const spineToRoot = 0.25 * s;
    const spineToChest = 0.30 * s;
    const torsoW = 0.32 * s;  // slim
    const torsoH = (spineToRoot + spineToChest) * 1.20;  // tall
    const torsoD = 0.26 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // Scarf/neckerchief — bright gold triangle at neck
    const scarfGeo = new THREE.BoxGeometry(torsoW * 0.65, 0.06 * s, 0.015 * s);
    const scarfMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.name = 'scarf';
    scarf.position.set(0, torsoH * 0.38, -torsoD * 0.50);
    boneMap.spine.add(scarf);
    parts.scarf = scarf;

    // Name badge — small white rectangle
    const badgeGeo = new THREE.BoxGeometry(0.10 * s, 0.04 * s, 0.01 * s);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xfaf5ef });
    const nameBadge = new THREE.Mesh(badgeGeo, badgeMat);
    nameBadge.name = 'nameBadge';
    nameBadge.position.set(0.10 * s, torsoH * 0.20, -torsoD * 0.52);
    boneMap.spine.add(nameBadge);
    parts.nameBadge = nameBadge;

    // ═══ HEAD: neat, with pill-box hat and bun ═══
    const headR = 0.26 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(0.95, 0.95, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Face — professional forced smile
    _addFace(parts, boneMap, headR, faceMat, {
        browAngle: 0.08,       // politely raised
        eyeScaleY: 1.15,      // bright, attentive
        mouthShape: 'smile',
    });

    // Pill-box hat (small cylinder on top)
    const hatGeo = createFlatCap(headR * 0.50, headR * 0.22, 8);
    const hat = new THREE.Mesh(hatGeo, materials.body);
    hat.name = 'hat';
    hat.position.set(0, headR * 0.72, headR * 0.10);
    hat.rotation.set(-0.10, 0, 0);
    boneMap.head.add(hat);
    parts.hat = hat;

    // Dark brown hair — neat bob under hat
    const hairGeo = new THREE.SphereGeometry(headR * 0.88, 8, 6);
    const hairMat = materials.body.clone();
    hairMat.uniforms.uBaseColor = { value: new THREE.Color(0x3a2a1a) };
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.name = 'hair';
    hair.position.set(0, headR * 0.10, headR * 0.05);
    hair.scale.set(1.05, 0.55, 1.08);
    boneMap.head.add(hair);
    parts.hair = hair;

    // Hair bun at back
    const bunGeo = new THREE.SphereGeometry(headR * 0.28, 8, 6);
    const bun = new THREE.Mesh(bunGeo, hairMat);
    bun.name = 'hairBun';
    bun.position.set(0, headR * 0.15, headR * 0.72);
    boneMap.head.add(bun);
    parts.hairBun = bun;

    // ═══ SERVING TRAY: prominent silver platform with cups ═══
    const trayGeo = createRoundedBox(0.24 * s, 0.02 * s, 0.16 * s, 0.005 * s);
    const trayMat = new THREE.MeshBasicMaterial({ color: 0xc8c8c8 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.name = 'tray';
    tray.position.set(0.04 * s, -0.28 * s, -0.04 * s);
    boneMap.upperArm_R.add(tray);
    parts.tray = tray;
    // Cups on tray
    const cupGeo = new THREE.CylinderGeometry(0.022 * s, 0.018 * s, 0.055 * s, 6);
    const cupMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e0 });
    for (let i = 0; i < 2; i++) {
        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.name = 'cup' + i;
        cup.position.set((i - 0.5) * 0.06 * s + 0.04 * s, -0.25 * s, -0.04 * s);
        boneMap.upperArm_R.add(cup);
        parts['cup' + i] = cup;
    }

    // ═══ ARMS (slim but readable) + LEGS (neat, professional) ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.075, armLength: 0.40 });
    _addLegs(parts, boneMap, s, materials, { ulRadius: 0.10, ulHeight: 0.30, llRadius: 0.08, llHeight: 0.28 });

    return parts;
}

// ─── AIR MARSHAL ─── broad V-torso, sunglasses (signature!), earpiece, badge, tactical
function _buildRigidMarshal(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: V-shaped, broad chest — athletic authority ═══
    const spineToRoot = 0.28 * s;
    const spineToChest = 0.32 * s;
    const torsoW = 0.48 * s;  // broadest of all airplane types
    const torsoH = (spineToRoot + spineToChest) * 1.18;
    const torsoD = 0.36 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.05 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.30, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // Badge — gold star/disc
    const badgeGeo = new THREE.CylinderGeometry(0.055 * s, 0.055 * s, 0.012 * s, 6);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd93d });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.name = 'badge';
    badge.position.set(0.14 * s, torsoH * 0.20, -torsoD * 0.52);
    badge.rotation.set(Math.PI / 2, 0, 0);
    boneMap.spine.add(badge);
    parts.badge = badge;

    // ═══ HEAD: square-jawed, with SUNGLASSES (defining feature) ═══
    const headR = 0.28 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.02, 0.94, 0.97);  // slightly wider jaw
    boneMap.head.add(head);
    parts.head = head;

    // SUNGLASSES — the defining visual element, dark visor across face
    const glassW = headR * 0.78;
    const glassH = headR * 0.18;
    const glassGeo = new THREE.BoxGeometry(glassW, glassH, headR * 0.05);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x0a0a14 });
    const glasses = new THREE.Mesh(glassGeo, glassMat);
    glasses.name = 'sunglasses';
    glasses.position.set(0, headR * 0.06, -headR * 0.92);
    boneMap.head.add(glasses);
    parts.sunglasses = glasses;
    // Frame — thin line above lenses
    const frameGeo = new THREE.BoxGeometry(glassW * 1.08, glassH * 0.18, headR * 0.06);
    const frame = new THREE.Mesh(frameGeo, glassMat);
    frame.name = 'frame';
    frame.position.set(0, headR * 0.06 + glassH * 0.55, -headR * 0.93);
    boneMap.head.add(frame);
    parts.frame = frame;

    // Mouth — set jaw, thin determined line
    const mouthGeo = new THREE.BoxGeometry(headR * 0.22, headR * 0.04, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.26, -headR * 0.90);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // Buzz-cut hair — military tight
    const hairGeo = new THREE.SphereGeometry(headR * 0.90, 10, 8);
    const hairMat = materials.body.clone();
    hairMat.uniforms.uBaseColor = { value: new THREE.Color(0x2a2a2a) };
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.name = 'hair';
    hair.position.set(0, headR * 0.20, 0);
    hair.scale.set(1.04, 0.42, 1.04);
    boneMap.head.add(hair);
    parts.hair = hair;

    // ═══ EARPIECE + COILED WIRE ═══
    const earMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const earGeo = new THREE.SphereGeometry(headR * 0.09, 5, 4);
    const earpiece = new THREE.Mesh(earGeo, earMat);
    earpiece.name = 'earpiece';
    earpiece.position.set(headR * 0.78, -headR * 0.08, -headR * 0.12);
    boneMap.head.add(earpiece);
    parts.earpiece = earpiece;
    const wireGeo = new THREE.CylinderGeometry(headR * 0.018, headR * 0.018, headR * 0.55, 4);
    const wire = new THREE.Mesh(wireGeo, earMat);
    wire.name = 'wire';
    wire.position.set(headR * 0.78, -headR * 0.42, -headR * 0.12);
    boneMap.head.add(wire);
    parts.wire = wire;

    // ═══ ARMS (thick, powerful) + LEGS (wide tactical stance) ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.095, armLength: 0.40 });
    _addLegs(parts, boneMap, s, materials, { ulRadius: 0.12, ulHeight: 0.30, llRadius: 0.10, llHeight: 0.28 });

    return parts;
}

// ─── UNRULY PASSENGERS ─── tiny, NO ARMS, oversized head, angry yelling, messy hair, drink
function _buildRigidUnrulyPassengers(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: small compact pill — no arms means torso IS the silhouette ═══
    const spineToRoot = 0.20 * s;
    const spineToChest = 0.22 * s;
    const torsoW = 0.30 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.10;
    const torsoD = 0.24 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.07 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // Drink stain on shirt
    const stainGeo = new THREE.SphereGeometry(0.07 * s, 5, 4);
    const stainMat = new THREE.MeshBasicMaterial({ color: 0xa05020, transparent: true, opacity: 0.45 });
    const stain = new THREE.Mesh(stainGeo, stainMat);
    stain.name = 'stain';
    stain.position.set(0.04 * s, 0, -torsoD * 0.48);
    stain.scale.set(1.3, 1.0, 0.3);
    boneMap.spine.add(stain);
    parts.stain = stain;

    // ═══ HEAD: OVERSIZED for comedy — angry screaming face ═══
    const headR = 0.32 * s;  // huge relative to tiny body
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.88, 0.95);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes — angry squinting
    const eyeSize = headR * 0.12;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.26;
    const eyeY = headR * 0.08;
    const eyeZ = -headR * 0.90;
    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 0.7, 0.5);  // squinted
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;
    const eyeR = eyeL.clone();
    eyeR.name = 'eyeR';
    eyeR.position.x = eyeSpacing;
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // Brows — ANGRY V
    const browGeo = new THREE.BoxGeometry(headR * 0.26, headR * 0.055, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.16, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, -0.38);  // angry V
    boneMap.head.add(browL);
    parts.browL = browL;
    const browR = browL.clone();
    browR.name = 'browR';
    browR.position.x = eyeSpacing;
    browR.rotation.set(0, 0, 0.38);
    boneMap.head.add(browR);
    parts.browR = browR;

    // Mouth — wide open YELLING
    const mouthGeo = new THREE.SphereGeometry(headR * 0.14, 8, 6);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.20, eyeZ);
    mouth.scale.set(1.2, 1.0, 0.5);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // ═══ MESSY HAIR — 4 wild tufts like the Panicker ═══
    const tuftGeo = new THREE.SphereGeometry(headR * 0.25, 6, 5);
    const hairMat = materials.body.clone();
    hairMat.uniforms.uBaseColor = { value: new THREE.Color(0x8a6a3a) };
    for (let i = 0; i < 4; i++) {
        const tuft = new THREE.Mesh(tuftGeo, hairMat);
        tuft.name = 'hairTuft' + i;
        const angle = (i / 4) * Math.PI * 2 + 0.3;
        tuft.position.set(
            Math.cos(angle) * headR * 0.38,
            headR * 0.58 + (i % 2) * headR * 0.12,
            Math.sin(angle) * headR * 0.38
        );
        tuft.scale.set(0.55, 0.35 + (i % 2) * 0.15, 0.55);
        boneMap.head.add(tuft);
        parts['hairTuft' + i] = tuft;
    }

    // ═══ NO ARMS — chaotic swarm type (like Dancer/Girls) ═══

    // ═══ LEGS: stubby little stompers ═══
    _addLegs(parts, boneMap, s, materials, {
        ulRadius: 0.085, ulHeight: 0.26,
        llRadius: 0.065, llHeight: 0.22,
    });

    return parts;
}


// ═══════════════════════════════════════
// DRUNK — Office biped, party-goer with hat and loosened tie
// ═══════════════════════════════════════

function _buildRigidDrunk(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // PALETTE.ink

    // ═══ TORSO: same proportions as polite knocker ═══
    const spineToRoot = 0.25 * s;
    const spineToChest = 0.30 * s;
    const torsoW = 0.42 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.15;
    const torsoD = 0.32 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.07 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ LOOSENED TIE: thin box hanging from chest, angled askew ═══
    const tieW = 0.06 * s;
    const tieH = torsoH * 0.55;
    const tieD = 0.015 * s;
    const tieGeo = new THREE.BoxGeometry(tieW, tieH, tieD);
    const tie = new THREE.Mesh(tieGeo, materials.legs);
    tie.name = 'tie';
    tie.position.set(0.03 * s, torsoH * 0.05, -torsoD * 0.52);
    tie.rotation.set(0.08, 0.12, 0.18); // disheveled angle
    boneMap.spine.add(tie);
    parts.tie = tie;

    // Tie knot — small box at top of tie, pulled loose
    const knotGeo = new THREE.BoxGeometry(tieW * 1.6, tieW * 0.8, tieD * 1.2);
    const knot = new THREE.Mesh(knotGeo, materials.legs);
    knot.name = 'tieKnot';
    knot.position.set(0.02 * s, torsoH * 0.32, -torsoD * 0.53);
    knot.rotation.set(0, 0, 0.15);
    boneMap.spine.add(knot);
    parts.tieKnot = knot;

    // ═══ HEAD: slightly ruddy (skin tinted red) ═══
    const headR = 0.28 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const ruddyMat = materials.skin.clone();
    ruddyMat.uniforms.uBaseColor = { value: new THREE.Color(0xf0b898) }; // flushed skin tone
    const head = new THREE.Mesh(headGeo, ruddyMat);
    head.name = 'head';
    head.scale.set(1.0, 0.92, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // ═══ FACE: unfocused eyes, red nose, dopey grin ═══

    // Eyes — slightly unfocused, rotated outward
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.28;
    const eyeY = headR * 0.05;
    const eyeZ = -headR * 0.90;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, eyeY, eyeZ);
    eyeL.scale.set(1.0, 1.1, 0.5);
    eyeL.rotation.set(0, 0, 0.15); // rotated outward — unfocused
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR_mesh = new THREE.Mesh(eyeGeo, faceMat);
    eyeR_mesh.name = 'eyeR';
    eyeR_mesh.position.set(eyeSpacing, eyeY, eyeZ);
    eyeR_mesh.scale.set(1.0, 1.1, 0.5);
    eyeR_mesh.rotation.set(0, 0, -0.15); // rotated outward — unfocused
    boneMap.head.add(eyeR_mesh);
    parts.eyeR = eyeR_mesh;

    // Red nose — small red sphere on nose
    const redNoseGeo = new THREE.SphereGeometry(headR * 0.10, 6, 5);
    const redNoseMat = new THREE.MeshBasicMaterial({ color: 0xdd3333 });
    const redNose = new THREE.Mesh(redNoseGeo, redNoseMat);
    redNose.name = 'redNose';
    redNose.position.set(0, -headR * 0.08, -headR * 0.95);
    boneMap.head.add(redNose);
    parts.redNose = redNose;

    // Dopey grin — wider mouth box
    const mouthGeo = new THREE.BoxGeometry(headR * 0.36, headR * 0.05, headR * 0.05);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.26, eyeZ - headR * 0.02);
    mouth.rotation.set(0, 0, 0.05); // slight lopsided grin
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // Eyebrows — relaxed, slightly droopy
    const browGeo = new THREE.BoxGeometry(headR * 0.24, headR * 0.045, headR * 0.05);
    const browL = new THREE.Mesh(browGeo, faceMat);
    browL.name = 'browL';
    browL.position.set(-eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browL.rotation.set(0, 0, -0.15); // droopy
    boneMap.head.add(browL);
    parts.browL = browL;

    const browR = new THREE.Mesh(browGeo, faceMat);
    browR.name = 'browR';
    browR.position.set(eyeSpacing, eyeY + headR * 0.20, eyeZ - headR * 0.02);
    browR.rotation.set(0, 0, 0.15); // droopy
    boneMap.head.add(browR);
    parts.browR = browR;

    // ═══ PARTY HAT: small cone, tilted on head ═══
    const hatH = headR * 0.55;
    const hatR = headR * 0.28;
    const hatGeo = new THREE.ConeGeometry(hatR, hatH, 8);
    const hatMat = materials.body.clone();
    hatMat.uniforms.uBaseColor = { value: new THREE.Color(0xe84888) }; // festive pink
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.name = 'partyHat';
    hat.position.set(headR * 0.15, headR * 0.72, -headR * 0.05);
    hat.rotation.set(0.10, 0, 0.25); // tilted jauntily
    boneMap.head.add(hat);
    parts.partyHat = hat;

    // Hat brim — small torus at hat base
    const brimGeo = new THREE.TorusGeometry(hatR * 0.95, hatR * 0.12, 4, 8);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.name = 'hatBrim';
    brim.position.set(headR * 0.15, headR * 0.47, -headR * 0.05);
    brim.rotation.set(Math.PI / 2 + 0.10, 0, 0.25);
    boneMap.head.add(brim);
    parts.hatBrim = brim;

    // ═══ ARMS: standard capsules ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.065, armLength: 0.50 });

    // ═══ LEGS: standard bipedal legs ═══
    _addLegs(parts, boneMap, s, materials, { ulRadius: 0.095, ulHeight: 0.34, llRadius: 0.08, llHeight: 0.32 });

    return parts;
}


// ═══════════════════════════════════════
// ANT — Forest quadruped (insect), 3 body segments, 6 legs, antennae, mandibles
// ═══════════════════════════════════════

function _buildRigidAnt(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // PALETTE.ink

    // ═══ HEAD SEGMENT: sphere on head bone ═══
    const headR = (d.headRadius || 0.10) * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.95, 0.90, 1.05); // slightly elongated forward
    boneMap.head.add(head);
    parts.head = head;

    // ═══ EYES: compound-eye look, spheres on sides of head ═══
    const eyeSize = headR * 0.25;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.65;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.10, -headR * 0.30);
    eyeL.scale.set(0.80, 1.0, 0.70);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.10, -headR * 0.30);
    eyeR.scale.set(0.80, 1.0, 0.70);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // ═══ ANTENNAE: 2 thin capsules extending forward from head, angled outward ═══
    const antLen = 0.15 * s;
    const antR = 0.012 * s;
    const antGeo = createCapsule(antR, antLen, 6, 3);

    const antL = new THREE.Mesh(antGeo, materials.body);
    antL.name = 'antennaL';
    antL.position.set(-headR * 0.30, headR * 0.55, -headR * 0.40);
    antL.rotation.set(-0.80, -0.25, 0.20); // angled forward and outward
    boneMap.head.add(antL);
    parts.antennaL = antL;

    const antennR = new THREE.Mesh(antGeo, materials.body);
    antennR.name = 'antennaR';
    antennR.position.set(headR * 0.30, headR * 0.55, -headR * 0.40);
    antennR.rotation.set(-0.80, 0.25, -0.20); // mirror
    boneMap.head.add(antennR);
    parts.antennaR = antennR;

    // Antenna tips — small spheres at ends
    const tipGeo = new THREE.SphereGeometry(antR * 2.2, 5, 4);
    const tipL = new THREE.Mesh(tipGeo, materials.body);
    tipL.name = 'antennaTipL';
    tipL.position.set(-headR * 0.30 - antLen * 0.15, headR * 0.55 + antLen * 0.55, -headR * 0.40 - antLen * 0.60);
    boneMap.head.add(tipL);
    parts.antennaTipL = tipL;

    const tipR = new THREE.Mesh(tipGeo, materials.body);
    tipR.name = 'antennaTipR';
    tipR.position.set(headR * 0.30 + antLen * 0.15, headR * 0.55 + antLen * 0.55, -headR * 0.40 - antLen * 0.60);
    boneMap.head.add(tipR);
    parts.antennaTipR = tipR;

    // ═══ MANDIBLES: 2 small capsules below head, angled toward center ═══
    const mandLen = headR * 0.55;
    const mandR = 0.015 * s;
    const mandGeo = createCapsule(mandR, mandLen, 6, 3);

    const mandL = new THREE.Mesh(mandGeo, materials.body);
    mandL.name = 'mandibleL';
    mandL.position.set(-headR * 0.22, -headR * 0.35, -headR * 0.65);
    mandL.rotation.set(-0.50, 0.35, 0); // angle inward
    boneMap.head.add(mandL);
    parts.mandibleL = mandL;

    const mandibleR = new THREE.Mesh(mandGeo, materials.body);
    mandibleR.name = 'mandibleR';
    mandibleR.position.set(headR * 0.22, -headR * 0.35, -headR * 0.65);
    mandibleR.rotation.set(-0.50, -0.35, 0); // mirror inward
    boneMap.head.add(mandibleR);
    parts.mandibleR = mandibleR;

    // ═══ THORAX: slightly smaller segment on spine_mid ═══
    const thoraxW = (d.bodyWidth || 0.12) * s;
    const thoraxH = (d.bodyHeight || 0.10) * s;
    const thoraxLen = (d.bodyLength || 0.18) * s * 0.45;
    const thoraxGeo = new THREE.SphereGeometry(thoraxW, 10, 8);
    const thorax = new THREE.Mesh(thoraxGeo, materials.body);
    thorax.name = 'thorax';
    thorax.scale.set(1.0, thoraxH / thoraxW, thoraxLen / thoraxW); // oval cross-section
    boneMap.spine_mid.add(thorax);
    parts.thorax = thorax;

    // ═══ ABDOMEN: larger egg-shaped segment on pelvis ═══
    const abdW = thoraxW * 1.35;
    const abdLen = thoraxLen * 1.5;
    const abdGeo = new THREE.SphereGeometry(abdW, 10, 8);
    const abdomen = new THREE.Mesh(abdGeo, materials.body);
    abdomen.name = 'abdomen';
    abdomen.scale.set(1.0, 0.85, abdLen / abdW); // elongated egg shape
    abdomen.position.set(0, -abdW * 0.08, 0);
    boneMap.pelvis.add(abdomen);
    parts.abdomen = abdomen;

    // ═══ ANIMATED LEGS: 4 on quadruped bone chains (thin capsules) ═══
    const legThick = (d.legThickness || 0.03) * s;
    const fUpperH = 0.18 * s;
    const fUpperGeo = createCapsule(legThick, fUpperH, 6, 3);

    const fUpperL = new THREE.Mesh(fUpperGeo, materials.legs);
    fUpperL.name = 'frontUpperLegL';
    fUpperL.position.set(0, -fUpperH * 0.38, 0);
    boneMap.frontUpperLeg_L.add(fUpperL);
    parts.frontUpperLegL = fUpperL;

    const fUpperR = new THREE.Mesh(fUpperGeo, materials.legs);
    fUpperR.name = 'frontUpperLegR';
    fUpperR.position.set(0, -fUpperH * 0.38, 0);
    boneMap.frontUpperLeg_R.add(fUpperR);
    parts.frontUpperLegR = fUpperR;

    const fLowerH = 0.20 * s;
    const fLowerGeo = createCapsule(legThick * 0.75, fLowerH, 6, 3);

    const fLowerL = new THREE.Mesh(fLowerGeo, materials.legs);
    fLowerL.name = 'frontLowerLegL';
    fLowerL.position.set(0, -fLowerH * 0.38, 0);
    boneMap.frontLowerLeg_L.add(fLowerL);
    parts.frontLowerLegL = fLowerL;

    const fLowerR = new THREE.Mesh(fLowerGeo, materials.legs);
    fLowerR.name = 'frontLowerLegR';
    fLowerR.position.set(0, -fLowerH * 0.38, 0);
    boneMap.frontLowerLeg_R.add(fLowerR);
    parts.frontLowerLegR = fLowerR;

    const hUpperH = 0.18 * s;
    const hUpperGeo = createCapsule(legThick, hUpperH, 6, 3);

    const hUpperL = new THREE.Mesh(hUpperGeo, materials.legs);
    hUpperL.name = 'hindUpperLegL';
    hUpperL.position.set(0, -hUpperH * 0.38, 0);
    boneMap.hindUpperLeg_L.add(hUpperL);
    parts.hindUpperLegL = hUpperL;

    const hUpperR = new THREE.Mesh(hUpperGeo, materials.legs);
    hUpperR.name = 'hindUpperLegR';
    hUpperR.position.set(0, -hUpperH * 0.38, 0);
    boneMap.hindUpperLeg_R.add(hUpperR);
    parts.hindUpperLegR = hUpperR;

    const hLowerH = 0.20 * s;
    const hLowerGeo = createCapsule(legThick * 0.75, hLowerH, 6, 3);

    const hLowerL = new THREE.Mesh(hLowerGeo, materials.legs);
    hLowerL.name = 'hindLowerLegL';
    hLowerL.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_L.add(hLowerL);
    parts.hindLowerLegL = hLowerL;

    const hLowerR = new THREE.Mesh(hLowerGeo, materials.legs);
    hLowerR.name = 'hindLowerLegR';
    hLowerR.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_R.add(hLowerR);
    parts.hindLowerLegR = hLowerR;

    // ═══ 2 DECORATIVE MIDDLE LEGS: static on spine_mid, between front and hind ═══
    const midLegLen = 0.20 * s;
    const midLegGeo = createCapsule(legThick * 0.85, midLegLen, 6, 3);

    const midLegL = new THREE.Mesh(midLegGeo, materials.legs);
    midLegL.name = 'midLegL';
    midLegL.position.set(-thoraxW * 0.75, -midLegLen * 0.30, 0);
    midLegL.rotation.set(0, 0, 0.45); // angled outward
    boneMap.spine_mid.add(midLegL);
    parts.midLegL = midLegL;

    const midLegR = new THREE.Mesh(midLegGeo, materials.legs);
    midLegR.name = 'midLegR';
    midLegR.position.set(thoraxW * 0.75, -midLegLen * 0.30, 0);
    midLegR.rotation.set(0, 0, -0.45); // mirror outward
    boneMap.spine_mid.add(midLegR);
    parts.midLegR = midLegR;

    // ═══ TAIL SEGMENT: small sphere on tail_01 for abdomen tip ═══
    const tailR = abdW * 0.35;
    const tailGeo = new THREE.SphereGeometry(tailR, 6, 5);
    const tail = new THREE.Mesh(tailGeo, materials.body);
    tail.name = 'tail';
    tail.scale.set(0.80, 0.80, 1.10);
    boneMap.tail_01.add(tail);
    parts.tail = tail;

    return parts;
}


// ═══════════════════════════════════════
// SEAHORSE — Ocean marine, vertical posture, curled tail, snout tube
// ═══════════════════════════════════════

function _buildRigidSeahorse(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // PALETTE.ink

    // ═══ UPPER BODY: wider at chest, narrowing upward (body_front) ═══
    // Seahorse has VERTICAL orientation — unique among marine types
    const bodyW = (d.bodyWidth || 0.10) * s;
    const bodyH = (d.bodyHeight || 0.10) * s;
    const bodyLen = (d.bodyLength || 0.25) * s;

    const upperLen = bodyLen * 0.50;
    const upperGeo = createOrganicTorso(bodyW * 0.55, bodyW * 0.90, upperLen, 0.06, 8, 8);
    const upperBody = new THREE.Mesh(upperGeo, materials.body);
    upperBody.name = 'upperBody';
    // Keep vertical — no 90° rotation like horizontal marine creatures
    upperBody.scale.set(1.0, 1.0, bodyH / bodyW);
    upperBody.position.set(0, upperLen * 0.10, 0);
    boneMap.body_front.add(upperBody);
    parts.upperBody = upperBody;

    // ═══ LOWER BODY: narrowing downward (body_rear) ═══
    const lowerLen = bodyLen * 0.50;
    const lowerGeo = createOrganicTorso(bodyW * 0.30, bodyW * 0.65, lowerLen, 0.04, 8, 8);
    const lowerBody = new THREE.Mesh(lowerGeo, materials.body);
    lowerBody.name = 'lowerBody';
    lowerBody.scale.set(1.0, 1.0, bodyH / bodyW);
    lowerBody.position.set(0, -lowerLen * 0.10, 0);
    boneMap.body_rear.add(lowerBody);
    parts.lowerBody = lowerBody;

    // Bridging midsection on root
    const midR = bodyW * 0.80;
    const midGeo = new THREE.SphereGeometry(midR, 8, 6);
    const mid = new THREE.Mesh(midGeo, materials.body);
    mid.name = 'bodyMid';
    mid.scale.set(1.0, 1.15, bodyH / bodyW);
    boneMap.root.add(mid);
    parts.bodyMid = mid;

    // ═══ HEAD: small elongated sphere ═══
    const headR = (d.headRadius || 0.08) * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.85, 0.95, 1.05); // slightly elongated
    boneMap.head.add(head);
    parts.head = head;

    // ═══ SNOUT: long thin tube extending forward (capsule on snout bone) ═══
    const snoutLen = (d.snoutLength || 0.12) * s;
    const snoutR = headR * 0.18;
    const snoutGeo = createCapsule(snoutR, snoutLen, 8, 4);
    const snout = new THREE.Mesh(snoutGeo, materials.body);
    snout.name = 'snout';
    snout.rotation.x = Math.PI * 0.52; // angled slightly downward
    snout.position.set(0, -headR * 0.15, -headR * 0.35);
    boneMap.snout.add(snout);
    parts.snout = snout;

    // Snout tip — tiny sphere
    const snoutTipGeo = new THREE.SphereGeometry(snoutR * 1.2, 5, 4);
    const snoutTip = new THREE.Mesh(snoutTipGeo, materials.body);
    snoutTip.name = 'snoutTip';
    snoutTip.position.set(0, -headR * 0.15 - snoutLen * 0.45, -headR * 0.35 - snoutLen * 0.35);
    boneMap.snout.add(snoutTip);
    parts.snoutTip = snoutTip;

    // ═══ EYES: small spheres on sides of head ═══
    const eyeSize = headR * 0.14;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.52;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.10, -headR * 0.35);
    eyeL.scale.set(0.65, 1.10, 0.50);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.10, -headR * 0.35);
    eyeR.scale.set(0.65, 1.10, 0.50);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // ═══ CROWN/CREST: small triangular shapes on top of head ═══
    const crownH = headR * 0.45;
    const crownGeo = new THREE.ConeGeometry(headR * 0.12, crownH, 4);
    const crownMat = materials.body.clone();
    crownMat.uniforms.uBaseColor = { value: new THREE.Color(0xe8a050) }; // slightly lighter crown

    for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(crownGeo, crownMat);
        spike.name = 'crownSpike' + i;
        const angle = (i - 1) * 0.25; // fan across top
        spike.position.set(
            Math.sin(angle) * headR * 0.15,
            headR * 0.65 + (i === 1 ? crownH * 0.15 : 0), // center spike taller
            Math.cos(angle) * headR * 0.10
        );
        spike.rotation.set(-0.10, 0, angle * 0.30);
        spike.scale.set(1.0, i === 1 ? 1.2 : 0.85, 1.0); // center taller
        boneMap.head.add(spike);
        parts['crownSpike' + i] = spike;
    }

    // ═══ DORSAL FIN RIDGE: thin box along the back (on dorsal bone) ═══
    const dorsalH = (d.dorsalHeight || 0.06) * s;
    const dorsalLen = (d.dorsalLength || 0.10) * s;
    const dorsalGeo = new THREE.BoxGeometry(0.008 * s, dorsalH, dorsalLen);
    const dorsalMat = materials.body.clone();
    dorsalMat.uniforms.uBaseColor = { value: new THREE.Color(0xf0c070) }; // slightly translucent-looking lighter
    const dorsal = new THREE.Mesh(dorsalGeo, dorsalMat);
    dorsal.name = 'dorsal';
    dorsal.position.set(0, dorsalH * 0.30, 0);
    boneMap.dorsal.add(dorsal);
    parts.dorsal = dorsal;

    // ═══ SMALL SIDE FINS: tiny flattened capsules on flipper bones (flutter) ═══
    const finLen = (d.flipperLength || 0.04) * s;
    const finW = (d.flipperWidth || 0.02) * s;
    const finGeo = createCapsule(finW, finLen, 6, 3);

    const finL = new THREE.Mesh(finGeo, materials.body);
    finL.name = 'finL';
    finL.scale.set(0.30, 1.0, 0.80); // tiny and flat
    finL.rotation.set(0, 0, 0.50); // angled outward
    finL.position.set(0, -finLen * 0.20, 0);
    boneMap.flipper_L.add(finL);
    parts.finL = finL;

    const finR = new THREE.Mesh(finGeo, materials.body);
    finR.name = 'finR';
    finR.scale.set(0.30, 1.0, 0.80);
    finR.rotation.set(0, 0, -0.50);
    finR.position.set(0, -finLen * 0.20, 0);
    boneMap.flipper_R.add(finR);
    parts.finR = finR;

    // ═══ CURLED TAIL: chain of small spheres/capsules on tail bones ═══
    // The tail curls inward — each segment positioned to create a curve
    const tailW = (d.tailWidth || 0.04) * s;

    const tail1Len = 0.08 * s;
    const tail1Geo = createCapsule(tailW * 0.35, tail1Len, 6, 3);
    const tail1 = new THREE.Mesh(tail1Geo, materials.body);
    tail1.name = 'tail1';
    tail1.position.set(0, -tail1Len * 0.20, 0);
    boneMap.tail_01.add(tail1);
    parts.tail1 = tail1;

    const tail2Len = 0.07 * s;
    const tail2Geo = createCapsule(tailW * 0.25, tail2Len, 6, 3);
    const tail2 = new THREE.Mesh(tail2Geo, materials.body);
    tail2.name = 'tail2';
    tail2.position.set(0, -tail2Len * 0.20, tail2Len * 0.15); // start curling toward front
    boneMap.tail_02.add(tail2);
    parts.tail2 = tail2;

    const tail3Len = 0.05 * s;
    const tail3Geo = createCapsule(tailW * 0.18, tail3Len, 6, 3);
    const tail3 = new THREE.Mesh(tail3Geo, materials.body);
    tail3.name = 'tail3';
    tail3.position.set(0, -tail3Len * 0.10, tail3Len * 0.25); // more curl
    boneMap.tail_03.add(tail3);
    parts.tail3 = tail3;

    // Tail tip — small sphere
    const tailTipGeo = new THREE.SphereGeometry(tailW * 0.15, 5, 4);
    const tailTip = new THREE.Mesh(tailTipGeo, materials.body);
    tailTip.name = 'tailTip';
    tailTip.position.set(0, -tail3Len * 0.30, tail3Len * 0.30);
    boneMap.tail_03.add(tailTip);
    parts.tailTip = tailTip;

    return parts;
}


// ═══════════════════════════════════════
// TROLLEY — Airplane biped + beverage cart, attendant pushing cart
// ═══════════════════════════════════════

function _buildRigidTrolley(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e }); // PALETTE.ink

    // ═══ TORSO: narrow, tall, professional — similar to attendant ═══
    const spineToRoot = 0.25 * s;
    const spineToChest = 0.30 * s;
    const torsoW = 0.32 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.20;
    const torsoD = 0.26 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // ═══ HEAD: small sphere with face ═══
    const headR = 0.26 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(0.95, 0.95, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Face — professional forced smile
    _addFace(parts, boneMap, headR, faceMat, {
        browAngle: 0.08,
        eyeScaleY: 1.15,
        mouthShape: 'smile',
    });

    // Pillbox hat
    const hatGeo = createFlatCap(headR * 0.48, headR * 0.20, 8);
    const hat = new THREE.Mesh(hatGeo, materials.body);
    hat.name = 'hat';
    hat.position.set(0, headR * 0.72, headR * 0.10);
    hat.rotation.set(-0.08, 0, 0);
    boneMap.head.add(hat);
    parts.hat = hat;

    // Dark hair — neat bob under hat
    const hairGeo = new THREE.SphereGeometry(headR * 0.88, 8, 6);
    const hairMat = materials.body.clone();
    hairMat.uniforms.uBaseColor = { value: new THREE.Color(0x3a2a1a) };
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.name = 'hair';
    hair.position.set(0, headR * 0.10, headR * 0.05);
    hair.scale.set(1.05, 0.55, 1.08);
    boneMap.head.add(hair);
    parts.hair = hair;

    // ═══ ARMS: positioned EXTENDED FORWARD to simulate pushing the cart ═══
    // Use standard arm capsules but on bones that will be posed forward
    const armRadius = 0.075 * s;
    const armLength = 0.40 * s;
    const armGeo = createCapsule(armRadius, armLength, 8, 4);

    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.body);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // Hands
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

    // ═══ LEGS: standard biped ═══
    _addLegs(parts, boneMap, s, materials, {
        ulRadius: 0.10, ulHeight: 0.30,
        llRadius: 0.08, llHeight: 0.28,
    });

    // ═══ THE CART: built as child of root bone, positioned in FRONT ═══
    const cartW = 0.40 * s;
    const cartH = 0.30 * s;
    const cartD = 0.25 * s;

    // Cart body — metallic silver rounded box
    const cartMat = materials.body.clone();
    cartMat.uniforms.uBaseColor = { value: new THREE.Color(0x9a9aa8) };
    const cartGeo = createRoundedBox(cartW, cartH, cartD, 0.02 * s, 3);
    const cart = new THREE.Mesh(cartGeo, cartMat);
    cart.name = 'cartBody';
    cart.position.set(0, -0.30 * s, -0.50 * s); // in front of attendant
    boneMap.root.add(cart);
    parts.cartBody = cart;

    // 4 wheels — small cylinders at corners
    const wheelR = 0.03 * s;
    const wheelH = 0.02 * s;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelH, 8);
    const wheelMat = materials.outline; // dark wheels
    const wheelPositions = [
        [-cartW * 0.42, -cartH * 0.50, -cartD * 0.38],
        [ cartW * 0.42, -cartH * 0.50, -cartD * 0.38],
        [-cartW * 0.42, -cartH * 0.50,  cartD * 0.38],
        [ cartW * 0.42, -cartH * 0.50,  cartD * 0.38],
    ];
    for (let i = 0; i < 4; i++) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.name = 'wheel' + i;
        wheel.position.set(
            wheelPositions[i][0],
            wheelPositions[i][1] + (-0.30 * s), // offset by cart Y position
            wheelPositions[i][2] + (-0.50 * s),  // offset by cart Z position
        );
        wheel.rotation.x = Math.PI / 2; // rotate 90° so cylinder axis is horizontal
        boneMap.root.add(wheel);
        parts['wheel' + i] = wheel;
    }

    // Handle bar — thin capsule going up from cart, toward attendant hands
    const handleH = 0.25 * s;
    const handleGeo = createCapsule(0.012 * s, handleH, 6, 3);
    const handle = new THREE.Mesh(handleGeo, cartMat);
    handle.name = 'cartHandle';
    handle.position.set(0, -0.18 * s, -0.28 * s); // between cart and attendant
    handle.rotation.set(-0.35, 0, 0); // angled toward attendant
    boneMap.root.add(handle);
    parts.cartHandle = handle;

    // Horizontal handle bar across the top
    const handleBarGeo = createCapsule(0.010 * s, cartW * 0.70, 6, 3);
    const handleBar = new THREE.Mesh(handleBarGeo, cartMat);
    handleBar.name = 'cartHandleBar';
    handleBar.position.set(0, -0.08 * s, -0.32 * s);
    handleBar.rotation.set(0, 0, Math.PI / 2); // horizontal
    boneMap.root.add(handleBar);
    parts.cartHandleBar = handleBar;

    // Shelf items — 2-3 small cylinders on top (bottles/cups)
    const itemGeo = new THREE.CylinderGeometry(0.020 * s, 0.016 * s, 0.06 * s, 6);
    const itemColors = [0xf5f0e0, 0xffccaa, 0xc8d8e8]; // cream, warm, cool
    for (let i = 0; i < 3; i++) {
        const itemMat = materials.body.clone();
        itemMat.uniforms.uBaseColor = { value: new THREE.Color(itemColors[i]) };
        const item = new THREE.Mesh(itemGeo, itemMat);
        item.name = 'cartItem' + i;
        item.position.set(
            (i - 1) * 0.08 * s,           // spread across cart top
            -0.30 * s + cartH * 0.55,     // on top of cart
            -0.50 * s + (i % 2) * 0.04 * s // slight Z variation
        );
        boneMap.root.add(item);
        parts['cartItem' + i] = item;
    }

    return parts;
}


// ═══════════════════════════════════════
// VAULTER — lean athletic biped, sport headband, fingerless gloves, running shoes
// Office Parkour jumper — determined V-taper build, confident face
// ═══════════════════════════════════════

function _buildRigidVaulter(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: lean V-taper — wider shoulders tapering to narrow waist ═══
    const spineToRoot = 0.20 * s;
    const spineToChest = 0.24 * s;
    const torsoW = 0.38 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.12;
    const torsoD = 0.28 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    torso.scale.set(1.0, 1.0, 0.92); // slightly compressed depth — athletic
    boneMap.spine.add(torso);
    parts.torso = torso;

    // Shoulder pads — wider than torso, gives V-taper silhouette
    const shoulderGeo = createRoundedBox(torsoW * 1.20, 0.06 * s, torsoD * 0.70, 0.03 * s);
    const shoulderL = new THREE.Mesh(shoulderGeo, materials.body);
    shoulderL.name = 'shoulderPad';
    shoulderL.position.set(0, torsoH * 0.38, 0);
    boneMap.spine.add(shoulderL);
    parts.shoulderPad = shoulderL;

    // ═══ HEAD: determined face, sport headband ═══
    const headR = 0.26 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.94, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes — confident, slightly narrowed (focused)
    _addFace(parts, boneMap, headR, faceMat, {
        browAngle: -0.15,    // slightly furrowed — determined
        eyeScaleY: 1.0,     // alert but not panicked
        mouthShape: 'line',
        mouthWidth: 0.18,
    });

    // Sport headband — wraps around forehead
    const bandGeo = new THREE.TorusGeometry(headR * 0.82, headR * 0.08, 6, 16);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.name = 'headband';
    band.position.set(0, headR * 0.28, 0);
    band.rotation.set(Math.PI / 2, 0, 0);
    band.scale.set(1.0, 1.0, 0.65); // flattened torus
    boneMap.head.add(band);
    parts.headband = band;

    // Short spiky hair above headband
    const hairGeo = new THREE.SphereGeometry(headR * 0.55, 8, 6);
    const hair = new THREE.Mesh(hairGeo, materials.body);
    hair.name = 'hair';
    hair.position.set(0, headR * 0.60, -headR * 0.05);
    hair.scale.set(1.1, 0.45, 1.0);
    boneMap.head.add(hair);
    parts.hair = hair;

    // ═══ ARMS: athletic, slightly longer for parkour reach ═══
    const armRadius = 0.060 * s;
    const armLength = 0.48 * s;
    const armGeo = createCapsule(armRadius, armLength, 8, 4);

    const armL = new THREE.Mesh(armGeo, materials.body);
    armL.name = 'armL';
    armL.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_L.add(armL);
    parts.armL = armL;

    const armR = new THREE.Mesh(armGeo, materials.body);
    armR.name = 'armR';
    armR.position.set(0, -armLength * 0.42, 0);
    boneMap.upperArm_R.add(armR);
    parts.armR = armR;

    // Fingerless gloves — slightly larger hands with knuckle details
    const gloveGeo = new THREE.SphereGeometry(armRadius * 1.3, 6, 5);
    const gloveMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });

    const gloveL = new THREE.Mesh(gloveGeo, gloveMat);
    gloveL.name = 'gloveL';
    gloveL.position.set(0, -armLength * 0.88, 0);
    gloveL.scale.set(1.0, 0.85, 1.2);
    boneMap.upperArm_L.add(gloveL);
    parts.gloveL = gloveL;

    const gloveR = new THREE.Mesh(gloveGeo, gloveMat);
    gloveR.name = 'gloveR';
    gloveR.position.set(0, -armLength * 0.88, 0);
    gloveR.scale.set(1.0, 0.85, 1.2);
    boneMap.upperArm_R.add(gloveR);
    parts.gloveR = gloveR;

    // ═══ LEGS: athletic, runner's proportions ═══
    _addLegs(parts, boneMap, s, materials, {
        ulRadius: 0.090, ulHeight: 0.32,
        llRadius: 0.075, llHeight: 0.30,
    });

    // Running shoes — replace the default chunky shoes with sleek ones
    // Override the shoe meshes from _addLegs with custom athletic shoes
    if (parts.shoeL) {
        parts.shoeL.geometry.dispose();
        const runShoeGeo = createRoundedBox(0.10 * s, 0.045 * s, 0.17 * s, 0.018 * s);
        parts.shoeL.geometry = runShoeGeo;
        parts.shoeL.material = materials.body; // chartreuse running shoes
    }
    if (parts.shoeR) {
        const runShoeGeo = createRoundedBox(0.10 * s, 0.045 * s, 0.17 * s, 0.018 * s);
        parts.shoeR.geometry = runShoeGeo;
        parts.shoeR.material = materials.body;
    }

    return parts;
}


// ═══════════════════════════════════════
// KANGAROO — muscular quadruped, massive hind legs, thick 3-segment tail, tiny arms
// Forest jumper — sandy tan with pale belly, big pointed ears
// ═══════════════════════════════════════

function _buildRigidKangaroo(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ BODY: barrel torso, more upright than deer ═══
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    // Main body: pear-shaped — wider at the bottom (belly/rump area)
    const bodyGeo = createOrganicTorso(bodyW * 0.75, bodyW * 1.1, bodyLen, 0.15, 10, 10);
    const body = new THREE.Mesh(bodyGeo, materials.body);
    body.name = 'body';
    body.rotation.x = Math.PI / 2;
    body.scale.set(1.0, 1.0, bodyH / bodyW);
    boneMap.spine_mid.add(body);
    parts.body = body;

    // ═══ SHOULDER: smaller than deer — kangaroos are top-light ═══
    const shoulderR = bodyW * 0.70;
    const shoulderGeo = new THREE.SphereGeometry(shoulderR, 10, 8);
    const shoulder = new THREE.Mesh(shoulderGeo, materials.body);
    shoulder.name = 'shoulder';
    shoulder.scale.set(0.90, 0.75, 0.85 * (bodyH / bodyW));
    shoulder.position.set(0, -shoulderR * 0.08, 0);
    boneMap.chest.add(shoulder);
    parts.shoulder = shoulder;

    // ═══ HAUNCH: very large — muscular rump ═══
    const haunchR = bodyW * 1.30;
    const haunchGeo = new THREE.SphereGeometry(haunchR, 10, 8);
    const haunch = new THREE.Mesh(haunchGeo, materials.body);
    haunch.name = 'haunch';
    haunch.scale.set(1.15, 0.90, 0.95 * (bodyH / bodyW));
    haunch.position.set(0, -haunchR * 0.05, 0);
    boneMap.pelvis.add(haunch);
    parts.haunch = haunch;

    // Belly: lighter underbelly patch
    const bellyGeo = new THREE.SphereGeometry(bodyW * 0.80, 8, 6,
        0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55);
    const belly = new THREE.Mesh(bellyGeo, materials.skin);
    belly.name = 'belly';
    belly.rotation.x = Math.PI / 2;
    belly.position.set(0, -bodyH * 0.15, 0);
    belly.scale.set(1.0, 0.90, 1.20);
    boneMap.spine_mid.add(belly);
    parts.belly = belly;

    // ═══ NECK: short, thick — kangaroo neck ═══
    const neckR = bodyW * 0.50;
    const neckLen = 0.12 * s;
    const neckGeo = createCapsule(neckR, neckLen, 8, 4);
    const neck = new THREE.Mesh(neckGeo, materials.body);
    neck.name = 'neck';
    neck.position.set(0, neckLen * 0.05, 0);
    boneMap.neck_01.add(neck);
    parts.neck = neck;

    // ═══ HEAD: small relative to body, slightly elongated snout ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(0.85, 0.90, 1.15); // elongated snout direction
    boneMap.head.add(head);
    parts.head = head;

    // Snout: blunt muzzle
    const snoutR = headR * 0.40;
    const snoutLen = headR * 0.55;
    const snoutGeo = createCapsule(snoutR, snoutLen, 8, 4);
    const snout = new THREE.Mesh(snoutGeo, materials.body);
    snout.name = 'snout';
    snout.rotation.x = Math.PI * 0.52;
    snout.position.set(0, -headR * 0.20, -headR * 0.70);
    boneMap.head.add(snout);
    parts.snout = snout;

    // Dark nose
    const noseGeo = new THREE.SphereGeometry(snoutR * 0.60, 6, 5);
    const nose = new THREE.Mesh(noseGeo, faceMat);
    nose.name = 'nose';
    nose.position.set(0, -headR * 0.35, -headR * 1.05);
    nose.scale.set(1.3, 0.8, 0.7);
    boneMap.head.add(nose);
    parts.nose = nose;

    // Eyes: small, beady — set wider apart
    const eyeSize = headR * 0.10;
    const eyeGeo = new THREE.SphereGeometry(eyeSize, 6, 5);
    const eyeSpacing = headR * 0.40;

    const eyeL = new THREE.Mesh(eyeGeo, faceMat);
    eyeL.name = 'eyeL';
    eyeL.position.set(-eyeSpacing, headR * 0.15, -headR * 0.50);
    eyeL.scale.set(0.7, 1.2, 0.5);
    boneMap.head.add(eyeL);
    parts.eyeL = eyeL;

    const eyeR = new THREE.Mesh(eyeGeo, faceMat);
    eyeR.name = 'eyeR';
    eyeR.position.set(eyeSpacing, headR * 0.15, -headR * 0.50);
    eyeR.scale.set(0.7, 1.2, 0.5);
    boneMap.head.add(eyeR);
    parts.eyeR = eyeR;

    // ═══ EARS: large pointed — signature kangaroo feature ═══
    const earH = d.earSize * s;
    const earGeo = new THREE.ConeGeometry(earH * 0.25, earH, 6);

    const earL = new THREE.Mesh(earGeo, materials.body);
    earL.name = 'earL';
    earL.position.set(-headR * 0.35, headR * 0.70, headR * 0.10);
    earL.rotation.set(-0.15, 0, 0.25);
    earL.scale.set(0.55, 1.0, 0.45);
    boneMap.head.add(earL);
    parts.earL = earL;

    const earR = new THREE.Mesh(earGeo, materials.body);
    earR.name = 'earR';
    earR.position.set(headR * 0.35, headR * 0.70, headR * 0.10);
    earR.rotation.set(-0.15, 0, -0.25);
    earR.scale.set(0.55, 1.0, 0.45);
    boneMap.head.add(earR);
    parts.earR = earR;

    // Inner ears — lighter color
    const innerEarGeo = new THREE.ConeGeometry(earH * 0.14, earH * 0.70, 5);
    const innerEarL = new THREE.Mesh(innerEarGeo, materials.skin);
    innerEarL.name = 'innerEarL';
    innerEarL.position.set(0, -earH * 0.08, -earH * 0.04);
    earL.add(innerEarL);
    parts.innerEarL = innerEarL;

    const innerEarR = new THREE.Mesh(innerEarGeo, materials.skin);
    innerEarR.name = 'innerEarR';
    innerEarR.position.set(0, -earH * 0.08, -earH * 0.04);
    earR.add(innerEarR);
    parts.innerEarR = innerEarR;

    // ═══ FRONT LEGS: tiny T-rex arms — signature kangaroo proportions ═══
    const tinyArmR = d.legThickness * s * 0.55;
    const tinyArmH = 0.10 * s;
    const tinyArmGeo = createCapsule(tinyArmR, tinyArmH, 6, 3);

    const fArmL = new THREE.Mesh(tinyArmGeo, materials.body);
    fArmL.name = 'frontArmL';
    fArmL.position.set(0, -tinyArmH * 0.35, 0);
    boneMap.frontUpperLeg_L.add(fArmL);
    parts.frontArmL = fArmL;

    const fArmR = new THREE.Mesh(tinyArmGeo, materials.body);
    fArmR.name = 'frontArmR';
    fArmR.position.set(0, -tinyArmH * 0.35, 0);
    boneMap.frontUpperLeg_R.add(fArmR);
    parts.frontArmR = fArmR;

    // Tiny paws
    const pawGeo = new THREE.SphereGeometry(tinyArmR * 1.1, 5, 4);
    const pawL = new THREE.Mesh(pawGeo, materials.body);
    pawL.name = 'pawL';
    pawL.position.set(0, -tinyArmH * 0.65, 0);
    boneMap.frontLowerLeg_L.add(pawL);
    parts.pawL = pawL;

    const pawR = new THREE.Mesh(pawGeo, materials.body);
    pawR.name = 'pawR';
    pawR.position.set(0, -tinyArmH * 0.65, 0);
    boneMap.frontLowerLeg_R.add(pawR);
    parts.pawR = pawR;

    // ═══ HIND LEGS: massive, powerful — signature kangaroo feature ═══
    const hindThick = d.legThickness * s * 2.2;
    const hUpperH = 0.28 * s;
    const hUpperGeo = createCapsule(hindThick, hUpperH, 8, 4);

    const hUpperL = new THREE.Mesh(hUpperGeo, materials.body);
    hUpperL.name = 'hindUpperLegL';
    hUpperL.position.set(0, -hUpperH * 0.35, 0);
    boneMap.hindUpperLeg_L.add(hUpperL);
    parts.hindUpperLegL = hUpperL;

    const hUpperR = new THREE.Mesh(hUpperGeo, materials.body);
    hUpperR.name = 'hindUpperLegR';
    hUpperR.position.set(0, -hUpperH * 0.35, 0);
    boneMap.hindUpperLeg_R.add(hUpperR);
    parts.hindUpperLegR = hUpperR;

    const hLowerH = 0.30 * s;
    const hLowerGeo = createCapsule(hindThick * 0.70, hLowerH, 8, 4);

    const hLowerL = new THREE.Mesh(hLowerGeo, materials.body);
    hLowerL.name = 'hindLowerLegL';
    hLowerL.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_L.add(hLowerL);
    parts.hindLowerLegL = hLowerL;

    const hLowerR = new THREE.Mesh(hLowerGeo, materials.body);
    hLowerR.name = 'hindLowerLegR';
    hLowerR.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_R.add(hLowerR);
    parts.hindLowerLegR = hLowerR;

    // ═══ BIG FEET: large flat kangaroo feet ═══
    const footS = d.hoofSize * s;
    const footGeo = createRoundedBox(footS * 1.8, footS * 0.7, footS * 3.5, footS * 0.25);

    const footL = new THREE.Mesh(footGeo, materials.body);
    footL.name = 'hindFootL';
    footL.position.set(0, -footS * 0.1, -footS * 0.5);
    boneMap.hindFoot_L.add(footL);
    parts.hindFootL = footL;

    const footR = new THREE.Mesh(footGeo, materials.body);
    footR.name = 'hindFootR';
    footR.position.set(0, -footS * 0.1, -footS * 0.5);
    boneMap.hindFoot_R.add(footR);
    parts.hindFootR = footR;

    // ═══ TAIL: thick 3-segment tail — heavy, used for balance ═══
    const tailR = d.tailThickness * s;
    const tail1Len = 0.14 * s;
    const tail1Geo = createCapsule(tailR, tail1Len, 8, 4);
    const tail1 = new THREE.Mesh(tail1Geo, materials.body);
    tail1.name = 'tail1';
    boneMap.tail_01.add(tail1);
    parts.tail1 = tail1;

    const tail2Len = 0.12 * s;
    const tail2Geo = createCapsule(tailR * 0.85, tail2Len, 8, 4);
    const tail2 = new THREE.Mesh(tail2Geo, materials.body);
    tail2.name = 'tail2';
    boneMap.tail_02.add(tail2);
    parts.tail2 = tail2;

    const tail3Len = 0.10 * s;
    const tail3Geo = createCapsule(tailR * 0.65, tail3Len, 7, 3);
    const tail3 = new THREE.Mesh(tail3Geo, materials.body);
    tail3.name = 'tail3';
    boneMap.tail_03.add(tail3);
    parts.tail3 = tail3;

    return parts;
}


// ═══════════════════════════════════════
// FROG — squat wide quadruped, huge bulging eyes, webbed feet, no tail
// Ocean Tree Frog jumper — vivid green with pale belly, wide flat body
// ═══════════════════════════════════════

function _buildRigidFrog(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const d = config.bodyDimensions;
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ BODY: wide, squat, rounded — classic frog shape ═══
    const bodyLen = d.bodyLength * s;
    const bodyW = d.bodyWidth * s;
    const bodyH = d.bodyHeight * s;

    // Main body: wide egg shape — much wider than tall
    const bodyGeo = createOrganicTorso(bodyW * 0.65, bodyW * 1.1, bodyLen, 0.25, 10, 12);
    const body = new THREE.Mesh(bodyGeo, materials.body);
    body.name = 'body';
    body.rotation.x = Math.PI / 2;
    body.scale.set(1.35, 1.0, bodyH / bodyW * 0.80); // extra wide, squat
    boneMap.spine_mid.add(body);
    parts.body = body;

    // Shoulder bridge — smooth transition to head
    const shoulderR = bodyW * 0.85;
    const shoulderGeo = new THREE.SphereGeometry(shoulderR, 10, 8);
    const shoulder = new THREE.Mesh(shoulderGeo, materials.body);
    shoulder.name = 'shoulder';
    shoulder.scale.set(1.30, 0.65, 0.80 * (bodyH / bodyW));
    shoulder.position.set(0, -shoulderR * 0.05, 0);
    boneMap.chest.add(shoulder);
    parts.shoulder = shoulder;

    // Haunch — wide rear
    const haunchR = bodyW * 1.10;
    const haunchGeo = new THREE.SphereGeometry(haunchR, 10, 8);
    const haunch = new THREE.Mesh(haunchGeo, materials.body);
    haunch.name = 'haunch';
    haunch.scale.set(1.25, 0.70, 0.85 * (bodyH / bodyW));
    haunch.position.set(0, -haunchR * 0.05, 0);
    boneMap.pelvis.add(haunch);
    parts.haunch = haunch;

    // Belly: pale yellow-green underbelly
    const bellyGeo = new THREE.SphereGeometry(bodyW * 0.90, 8, 6,
        0, Math.PI * 2, Math.PI * 0.40, Math.PI * 0.60);
    const bellyMesh = new THREE.Mesh(bellyGeo, materials.skin);
    bellyMesh.name = 'belly';
    bellyMesh.rotation.x = Math.PI / 2;
    bellyMesh.position.set(0, -bodyH * 0.18, 0);
    bellyMesh.scale.set(1.30, 0.85, 1.10);
    boneMap.spine_mid.add(bellyMesh);
    parts.belly = bellyMesh;

    // ═══ HEAD: wide, flat, with bulging eyes on top — very frog ═══
    const headR = d.headRadius * s;
    const headGeo = new THREE.SphereGeometry(headR, 10, 8);
    const head = new THREE.Mesh(headGeo, materials.body);
    head.name = 'head';
    head.scale.set(1.40, 0.70, 1.10); // very wide and flat
    boneMap.head.add(head);
    parts.head = head;

    // ═══ EYES: huge bulging — signature tree frog feature ═══
    const eyeBulgeR = headR * 0.38;
    const eyeBulgeGeo = new THREE.SphereGeometry(eyeBulgeR, 8, 6);

    // Eye bulges (colored, sit on top of head)
    const eyeBulgeL = new THREE.Mesh(eyeBulgeGeo, materials.body);
    eyeBulgeL.name = 'eyeBulgeL';
    eyeBulgeL.position.set(-headR * 0.55, headR * 0.45, -headR * 0.25);
    eyeBulgeL.scale.set(1.0, 1.1, 0.9);
    boneMap.head.add(eyeBulgeL);
    parts.eyeBulgeL = eyeBulgeL;

    const eyeBulgeR_m = new THREE.Mesh(eyeBulgeGeo, materials.body);
    eyeBulgeR_m.name = 'eyeBulgeR';
    eyeBulgeR_m.position.set(headR * 0.55, headR * 0.45, -headR * 0.25);
    eyeBulgeR_m.scale.set(1.0, 1.1, 0.9);
    boneMap.head.add(eyeBulgeR_m);
    parts.eyeBulgeR = eyeBulgeR_m;

    // Pupils — dark horizontal ovals on the eye bulges
    const pupilGeo = new THREE.SphereGeometry(eyeBulgeR * 0.55, 6, 5);
    const pupilL = new THREE.Mesh(pupilGeo, faceMat);
    pupilL.name = 'eyeL';
    pupilL.position.set(-headR * 0.55, headR * 0.48, -headR * 0.52);
    pupilL.scale.set(1.3, 0.70, 0.40); // wide horizontal slits
    boneMap.head.add(pupilL);
    parts.eyeL = pupilL;

    const pupilR = new THREE.Mesh(pupilGeo, faceMat);
    pupilR.name = 'eyeR';
    pupilR.position.set(headR * 0.55, headR * 0.48, -headR * 0.52);
    pupilR.scale.set(1.3, 0.70, 0.40);
    boneMap.head.add(pupilR);
    parts.eyeR = pupilR;

    // Wide smiling mouth line
    const mouthGeo = new THREE.TorusGeometry(headR * 0.50, headR * 0.025, 4, 10, Math.PI);
    const mouth = new THREE.Mesh(mouthGeo, faceMat);
    mouth.name = 'mouth';
    mouth.position.set(0, -headR * 0.20, -headR * 0.80);
    mouth.rotation.set(0, 0, Math.PI);
    mouth.scale.set(1.0, 1.0, 0.40);
    boneMap.head.add(mouth);
    parts.mouth = mouth;

    // Nostrils — two tiny dots
    const nostrilGeo = new THREE.SphereGeometry(headR * 0.05, 4, 3);
    const nostrilL = new THREE.Mesh(nostrilGeo, faceMat);
    nostrilL.name = 'nostrilL';
    nostrilL.position.set(-headR * 0.18, headR * 0.02, -headR * 0.95);
    boneMap.head.add(nostrilL);
    parts.nostrilL = nostrilL;

    const nostrilR = new THREE.Mesh(nostrilGeo, faceMat);
    nostrilR.name = 'nostrilR';
    nostrilR.position.set(headR * 0.18, headR * 0.02, -headR * 0.95);
    boneMap.head.add(nostrilR);
    parts.nostrilR = nostrilR;

    // ═══ FRONT LEGS: short, splayed outward — frog pose ═══
    const fLegR = d.legThickness * s;
    const fUpperH = 0.10 * s;
    const fUpperGeo = createCapsule(fLegR, fUpperH, 6, 3);

    const fUpperL = new THREE.Mesh(fUpperGeo, materials.body);
    fUpperL.name = 'frontUpperLegL';
    fUpperL.position.set(0, -fUpperH * 0.35, 0);
    boneMap.frontUpperLeg_L.add(fUpperL);
    parts.frontUpperLegL = fUpperL;

    const fUpperRm = new THREE.Mesh(fUpperGeo, materials.body);
    fUpperRm.name = 'frontUpperLegR';
    fUpperRm.position.set(0, -fUpperH * 0.35, 0);
    boneMap.frontUpperLeg_R.add(fUpperRm);
    parts.frontUpperLegR = fUpperRm;

    const fLowerH = 0.08 * s;
    const fLowerGeo = createCapsule(fLegR * 0.80, fLowerH, 6, 3);

    const fLowerL = new THREE.Mesh(fLowerGeo, materials.body);
    fLowerL.name = 'frontLowerLegL';
    fLowerL.position.set(0, -fLowerH * 0.35, 0);
    boneMap.frontLowerLeg_L.add(fLowerL);
    parts.frontLowerLegL = fLowerL;

    const fLowerRm = new THREE.Mesh(fLowerGeo, materials.body);
    fLowerRm.name = 'frontLowerLegR';
    fLowerRm.position.set(0, -fLowerH * 0.35, 0);
    boneMap.frontLowerLeg_R.add(fLowerRm);
    parts.frontLowerLegR = fLowerRm;

    // Front webbed feet — flat splayed toes
    const fFootS = d.hoofSize * s;
    const fFootGeo = createRoundedBox(fFootS * 2.0, fFootS * 0.4, fFootS * 2.0, fFootS * 0.15);
    const fFootL = new THREE.Mesh(fFootGeo, materials.body);
    fFootL.name = 'frontFootL';
    fFootL.position.set(0, -fFootS * 0.1, -fFootS * 0.3);
    boneMap.frontFoot_L.add(fFootL);
    parts.frontFootL = fFootL;

    const fFootR = new THREE.Mesh(fFootGeo, materials.body);
    fFootR.name = 'frontFootR';
    fFootR.position.set(0, -fFootS * 0.1, -fFootS * 0.3);
    boneMap.frontFoot_R.add(fFootR);
    parts.frontFootR = fFootR;

    // ═══ HIND LEGS: large, powerful — folded Z-shape for jumping ═══
    const hLegR = d.legThickness * s * 1.5;
    const hUpperH = 0.16 * s;
    const hUpperGeo = createCapsule(hLegR, hUpperH, 8, 4);

    const hUpperL = new THREE.Mesh(hUpperGeo, materials.body);
    hUpperL.name = 'hindUpperLegL';
    hUpperL.position.set(0, -hUpperH * 0.35, 0);
    boneMap.hindUpperLeg_L.add(hUpperL);
    parts.hindUpperLegL = hUpperL;

    const hUpperRm = new THREE.Mesh(hUpperGeo, materials.body);
    hUpperRm.name = 'hindUpperLegR';
    hUpperRm.position.set(0, -hUpperH * 0.35, 0);
    boneMap.hindUpperLeg_R.add(hUpperRm);
    parts.hindUpperLegR = hUpperRm;

    const hLowerH = 0.18 * s;
    const hLowerGeo = createCapsule(hLegR * 0.72, hLowerH, 8, 4);

    const hLowerL = new THREE.Mesh(hLowerGeo, materials.body);
    hLowerL.name = 'hindLowerLegL';
    hLowerL.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_L.add(hLowerL);
    parts.hindLowerLegL = hLowerL;

    const hLowerRm = new THREE.Mesh(hLowerGeo, materials.body);
    hLowerRm.name = 'hindLowerLegR';
    hLowerRm.position.set(0, -hLowerH * 0.38, 0);
    boneMap.hindLowerLeg_R.add(hLowerRm);
    parts.hindLowerLegR = hLowerRm;

    // Hind webbed feet — BIG, flat, splayed
    const hFootS = d.hoofSize * s;
    const hFootGeo = createRoundedBox(hFootS * 2.8, hFootS * 0.45, hFootS * 3.5, hFootS * 0.18);
    const hFootL = new THREE.Mesh(hFootGeo, materials.body);
    hFootL.name = 'hindFootL';
    hFootL.position.set(0, -hFootS * 0.1, -hFootS * 0.6);
    boneMap.hindFoot_L.add(hFootL);
    parts.hindFootL = hFootL;

    const hFootR = new THREE.Mesh(hFootGeo, materials.body);
    hFootR.name = 'hindFootR';
    hFootR.position.set(0, -hFootS * 0.1, -hFootS * 0.6);
    boneMap.hindFoot_R.add(hFootR);
    parts.hindFootR = hFootR;

    // ═══ SPOTS: darker green patches on the back ═══
    const spotGeo = new THREE.SphereGeometry(bodyW * 0.22, 6, 5);
    const spotMat = materials.body.clone();
    spotMat.uniforms.uBaseColor = { value: new THREE.Color(0x508820) };
    const spotPositions = [
        { x: bodyW * 0.30, y: bodyH * 0.15, z: 0 },
        { x: -bodyW * 0.25, y: bodyH * 0.18, z: bodyLen * 0.15 },
        { x: bodyW * 0.10, y: bodyH * 0.20, z: -bodyLen * 0.10 },
    ];
    spotPositions.forEach((pos, i) => {
        const spot = new THREE.Mesh(spotGeo, spotMat);
        spot.name = 'spot' + i;
        spot.position.set(pos.x, pos.y, pos.z);
        spot.scale.set(1.2, 0.35, 1.0); // flat patches
        boneMap.spine_mid.add(spot);
        parts['spot' + i] = spot;
    });

    return parts;
}


// ═══════════════════════════════════════
// HURDLER — athletic biped, track spikes, race bib, headband, powerful legs
// Airplane Olympic Hurdler jumper — determined competitive face
// ═══════════════════════════════════════

function _buildRigidHurdler(size, config, materials, boneMap) {
    const s = size;
    const parts = {};
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });

    // ═══ TORSO: athletic tank top silhouette — exposed shoulders ═══
    const spineToRoot = 0.20 * s;
    const spineToChest = 0.25 * s;
    const torsoW = 0.40 * s;
    const torsoH = (spineToRoot + spineToChest) * 1.10;
    const torsoD = 0.28 * s;
    const torsoGeo = createRoundedBox(torsoW, torsoH, torsoD, 0.06 * s, 3);
    const torso = new THREE.Mesh(torsoGeo, materials.body);
    torso.name = 'torso';
    torso.position.set(0, (spineToChest - spineToRoot) * 0.35, 0);
    boneMap.spine.add(torso);
    parts.torso = torso;

    // Race bib — white rectangle with number on chest
    const bibW = torsoW * 0.55;
    const bibH = torsoH * 0.35;
    const bibGeo = new THREE.PlaneGeometry(bibW, bibH);
    const bibMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
    const bib = new THREE.Mesh(bibGeo, bibMat);
    bib.name = 'raceBib';
    bib.position.set(0, torsoH * 0.08, -torsoD * 0.52);
    boneMap.spine.add(bib);
    parts.raceBib = bib;

    // Bib number stripe — dark horizontal line (implies a number)
    const numGeo = new THREE.BoxGeometry(bibW * 0.60, bibH * 0.12, 0.005 * s);
    const numMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
    const num = new THREE.Mesh(numGeo, numMat);
    num.name = 'bibNumber';
    num.position.set(0, torsoH * 0.08, -torsoD * 0.54);
    boneMap.spine.add(num);
    parts.bibNumber = num;

    // ═══ HEAD: focused competitor face ═══
    const headR = 0.27 * s;
    const headGeo = new THREE.SphereGeometry(headR, 12, 10);
    const head = new THREE.Mesh(headGeo, materials.skin);
    head.name = 'head';
    head.scale.set(1.0, 0.94, 0.97);
    boneMap.head.add(head);
    parts.head = head;

    // Eyes — intense, focused
    _addFace(parts, boneMap, headR, faceMat, {
        browAngle: -0.25,    // deeply furrowed — competitive intensity
        eyeScaleY: 1.1,     // focused but alert
        mouthWidth: 0.16,   // tight determined mouth
    });

    // Athletic headband — thinner than vaulter's
    const hbGeo = new THREE.TorusGeometry(headR * 0.80, headR * 0.06, 6, 14);
    const hbMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });
    const hb = new THREE.Mesh(hbGeo, hbMat);
    hb.name = 'headband';
    hb.position.set(0, headR * 0.30, 0);
    hb.rotation.set(Math.PI / 2, 0, 0);
    hb.scale.set(1.0, 1.0, 0.50);
    boneMap.head.add(hb);
    parts.headband = hb;

    // Short cropped hair
    const hairGeo = new THREE.SphereGeometry(headR * 0.88, 8, 6);
    const hairMat = materials.body.clone();
    hairMat.uniforms.uBaseColor = { value: new THREE.Color(0x2a2020) };
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.name = 'hair';
    hair.position.set(0, headR * 0.18, headR * 0.05);
    hair.scale.set(1.02, 0.42, 1.06);
    boneMap.head.add(hair);
    parts.hair = hair;

    // ═══ ARMS: powerful runner's arms ═══
    _addArms(parts, boneMap, s, materials, { armRadius: 0.070, armLength: 0.46 });

    // Wristbands — small accent
    const wbGeo = new THREE.TorusGeometry(0.075 * s, 0.015 * s, 4, 8);
    const wbMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0 });

    const wbL = new THREE.Mesh(wbGeo, wbMat);
    wbL.name = 'wristbandL';
    wbL.position.set(0, -0.38 * s, 0);
    wbL.rotation.set(Math.PI / 2, 0, 0);
    boneMap.upperArm_L.add(wbL);
    parts.wristbandL = wbL;

    const wbR = new THREE.Mesh(wbGeo, wbMat);
    wbR.name = 'wristbandR';
    wbR.position.set(0, -0.38 * s, 0);
    wbR.rotation.set(Math.PI / 2, 0, 0);
    boneMap.upperArm_R.add(wbR);
    parts.wristbandR = wbR;

    // ═══ LEGS: powerful, long — runner's legs with track spikes ═══
    _addLegs(parts, boneMap, s, materials, {
        ulRadius: 0.10, ulHeight: 0.36,
        llRadius: 0.080, llHeight: 0.34,
    });

    // Track spikes — sleek pointed shoes
    if (parts.shoeL) {
        parts.shoeL.geometry.dispose();
        const spikeGeo = createRoundedBox(0.09 * s, 0.04 * s, 0.18 * s, 0.015 * s);
        parts.shoeL.geometry = spikeGeo;
        parts.shoeL.material = materials.body; // red-orange track spikes
    }
    if (parts.shoeR) {
        const spikeGeo = createRoundedBox(0.09 * s, 0.04 * s, 0.18 * s, 0.015 * s);
        parts.shoeR.geometry = spikeGeo;
        parts.shoeR.material = materials.body;
    }

    return parts;
}


const _rigidBuilders = {
    polite: _buildRigidPoliteKnocker,
    dancer: _buildRigidPeeDancer,
    waddle: _buildRigidWaddleTank,
    panicker: _buildRigidPanicker,
    powerwalker: _buildRigidPowerWalker,
    girls: _buildRigidGirls,
    deer: _buildRigidDeer,
    squirrel: _buildRigidSquirrel,
    dolphin: _buildRigidDolphin,
    flyfish: _buildRigidFlyfish,
    shark: _buildRigidShark,
    pirate: _buildRigidPirate,
    seaturtle: _buildRigidSeaturtle,
    jellyfish: _buildRigidJellyfish,
    // Airplane enemies
    nervous: _buildRigidNervousFlyer,
    business: _buildRigidBusinessClass,
    stumbler: _buildRigidStumbler,
    attendant: _buildRigidAttendant,
    marshal: _buildRigidMarshal,
    unruly: _buildRigidUnrulyPassengers,
    // Train types
    drunk: _buildRigidDrunk,
    ant: _buildRigidAnt,
    seahorse: _buildRigidSeahorse,
    trolley: _buildRigidTrolley,
    // Jumper archetypes — unique models
    vaulter: _buildRigidVaulter,
    kangaroo: _buildRigidKangaroo,
    frog: _buildRigidFrog,
    hurdler: _buildRigidHurdler,
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

    // --- Rounded paw shapes at bottom of each leg (assigned to lower leg bones) ---
    const pawR = lt * 1.5;
    const pawGeo = new THREE.SphereGeometry(pawR, 8, 6);
    pawGeo.scale(1.2, 0.5, 1.3); // wide, flat, elongated forward
    const flPawBottom = w.frontLowerLeg_L.y - lt * 1.5;
    const frPawBottom = w.frontLowerLeg_R.y - lt * 1.5;
    const hlPawBottom = w.hindLowerLeg_L.y - lt * 1.5;
    const hrPawBottom = w.hindLowerLeg_R.y - lt * 1.5;
    const flPawM = new THREE.Matrix4().makeTranslation(w.frontLowerLeg_L.x, flPawBottom - pawR * 0.3, w.frontLowerLeg_L.z);
    const frPawM = new THREE.Matrix4().makeTranslation(w.frontLowerLeg_R.x, frPawBottom - pawR * 0.3, w.frontLowerLeg_R.z);
    const hlPawM = new THREE.Matrix4().makeTranslation(w.hindLowerLeg_L.x, hlPawBottom - pawR * 0.3, w.hindLowerLeg_L.z);
    const hrPawM = new THREE.Matrix4().makeTranslation(w.hindLowerLeg_R.x, hrPawBottom - pawR * 0.3, w.hindLowerLeg_R.z);
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

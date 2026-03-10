// Player Model Factory — builds a fully skinned player character
// Seated pose with phone-holding arms. Uses toon shader + auto-skinning.

import { PLAYER_VISUAL_CONFIG } from '../data/playerConfig.js';
import { createSkeleton } from '../animation/SkeletonFactory.js';
import { createToonMaterial, createOutlineMaterial } from '../shaders/toonShader.js';
import { mergeGeometries } from '../utils/geometryUtils.js';

/**
 * Create a fully rigged player model (seated pose, toon shaded).
 * @returns {{ group: THREE.Group, skinnedMesh: THREE.SkinnedMesh, skeleton: THREE.Skeleton, boneMap: Object, outlineMesh: THREE.SkinnedMesh, materials: Object }}
 */
export function createPlayerModel() {
    const config = PLAYER_VISUAL_CONFIG.player;
    const size = config.size;

    // 1. Build skeleton
    const { bones, rootBone, boneMap } = createSkeleton('player', size);

    // 2. Read bone world positions for geometry placement
    const boneWorldPos = {};
    const tempVec = new THREE.Vector3();
    for (const [name, bone] of Object.entries(boneMap)) {
        bone.updateWorldMatrix(true, false);
        tempVec.setFromMatrixPosition(bone.matrixWorld);
        boneWorldPos[name] = tempVec.clone();
    }

    // 3. Build materials
    const materials = _createPlayerMaterials(config);

    // 4. Build geometry at bone world positions
    const { geometries, transforms, materialIndices } = _buildPlayerGeometry(size, config, boneWorldPos);

    // 5. Merge per material group (0=body, 1=skin, 2=legs)
    const groups = { 0: { geoms: [], xforms: [] }, 1: { geoms: [], xforms: [] }, 2: { geoms: [], xforms: [] } };
    for (let i = 0; i < geometries.length; i++) {
        const mi = materialIndices[i];
        groups[mi].geoms.push(geometries[i]);
        groups[mi].xforms.push(transforms[i]);
    }

    const allGeoms = [];
    const allXforms = [];
    const groupRanges = [];

    for (const mi of [0, 1, 2]) {
        if (groups[mi].geoms.length === 0) continue;
        const merged = mergeGeometries(groups[mi].geoms, groups[mi].xforms);
        allGeoms.push(merged);
        allXforms.push(new THREE.Matrix4());
        groupRanges.push({ materialIndex: mi, count: merged.index.count });
    }

    const finalGeometry = mergeGeometries(allGeoms, allXforms);

    let indexStart = 0;
    for (const range of groupRanges) {
        finalGeometry.addGroup(indexStart, range.count, range.materialIndex);
        indexStart += range.count;
    }

    // 6. Auto-skin by proximity
    _computeSkinWeights(finalGeometry, bones, boneMap, size);

    // 7. Create SkinnedMesh
    const materialArray = [materials.body, materials.skin, materials.legs];
    const skinnedMesh = new THREE.SkinnedMesh(finalGeometry, materialArray);
    skinnedMesh.add(rootBone);

    const skeleton = new THREE.Skeleton(bones);
    skinnedMesh.bind(skeleton);
    skinnedMesh.normalizeSkinWeights();
    skinnedMesh.castShadow = true;

    // 8. Outline mesh (shares skeleton)
    const outlineGeometry = finalGeometry.clone();
    const outlineMesh = new THREE.SkinnedMesh(outlineGeometry, materials.outline);
    outlineMesh.bind(skeleton);
    outlineMesh.frustumCulled = false;

    // 9. Group
    const group = new THREE.Group();
    group.add(skinnedMesh);
    group.add(outlineMesh);

    return { group, skinnedMesh, skeleton, boneMap, outlineMesh, materials };
}


// ═══════════════════════════════════════
// Materials
// ═══════════════════════════════════════

function _createPlayerMaterials(config) {
    const colors = config.materialColors;
    const lightDir = new THREE.Vector3(0.5, 1.0, 0.3).normalize();

    return {
        body: createToonMaterial({
            baseColor: new THREE.Color(colors.body),
            lightDir,
            skinning: true,
            rimPower: 3.0,
            rimIntensity: 0.4,
        }),
        skin: createToonMaterial({
            baseColor: new THREE.Color(colors.skin),
            lightDir,
            skinning: true,
            rimPower: 3.0,
            rimIntensity: 0.3,
        }),
        legs: createToonMaterial({
            baseColor: new THREE.Color(colors.legs),
            lightDir,
            skinning: true,
            rimPower: 3.5,
            rimIntensity: 0.3,
        }),
        outline: createOutlineMaterial({
            outlineWidth: 0.035,
            outlineColor: new THREE.Color(colors.outline),
            skinning: true,
        }),
    };
}


// ═══════════════════════════════════════
// Geometry Builder
// ═══════════════════════════════════════

function _buildPlayerGeometry(size, config, bp) {
    const d = config.bodyDimensions;
    const s = size;
    const geometries = [];
    const transforms = [];
    const materialIndices = [];

    // ─── TORSO (body 0) — box between spine and chest ───
    const torso = new THREE.BoxGeometry(d.torsoWidth * s, d.torsoHeight * s, d.torsoDepth * s, 3, 3, 3);
    const torsoCenter = new THREE.Vector3().addVectors(bp.spine, bp.chest).multiplyScalar(0.5);
    const torsoM = new THREE.Matrix4().makeTranslation(torsoCenter.x, torsoCenter.y, torsoCenter.z);
    geometries.push(torso); transforms.push(torsoM); materialIndices.push(0);

    // ─── HEAD (skin 1) ───
    const head = new THREE.SphereGeometry(d.headRadius * s, 12, 10);
    const headM = new THREE.Matrix4().makeTranslation(bp.head.x, bp.head.y, bp.head.z);
    geometries.push(head); transforms.push(headM); materialIndices.push(1);

    // ─── HAIR (body 0) — hemisphere cap ───
    const hair = new THREE.SphereGeometry(d.headRadius * s * 1.08, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairM = new THREE.Matrix4().makeTranslation(bp.head.x, bp.head.y + d.headRadius * s * 0.05, bp.head.z - d.headRadius * s * 0.05);
    geometries.push(hair); transforms.push(hairM); materialIndices.push(0);

    // ─── SHOULDER JOINTS (body 0) — spheres connecting torso to arms ───
    const shoulderR = d.limbThickness * s * 0.50;
    const shoulderGeo = new THREE.SphereGeometry(shoulderR, 8, 6);
    const shoulderLM = new THREE.Matrix4().makeTranslation(bp.upperArm_L.x, bp.upperArm_L.y, bp.upperArm_L.z);
    const shoulderRM = new THREE.Matrix4().makeTranslation(bp.upperArm_R.x, bp.upperArm_R.y, bp.upperArm_R.z);
    geometries.push(shoulderGeo); transforms.push(shoulderLM); materialIndices.push(0);
    geometries.push(shoulderGeo); transforms.push(shoulderRM); materialIndices.push(0);

    // ─── UPPER ARMS (body 0) — chunky hoodie sleeves ───
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.55, d.limbThickness * s * 0.48, 6,
        bp.upperArm_L, bp.forearm_L, 0);
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.55, d.limbThickness * s * 0.48, 6,
        bp.upperArm_R, bp.forearm_R, 0);

    // ─── ELBOW JOINTS (body 0) — spheres at forearm positions ───
    const elbowR = d.limbThickness * s * 0.45;
    const elbowGeo = new THREE.SphereGeometry(elbowR, 8, 6);
    const elbowLM = new THREE.Matrix4().makeTranslation(bp.forearm_L.x, bp.forearm_L.y, bp.forearm_L.z);
    const elbowRM = new THREE.Matrix4().makeTranslation(bp.forearm_R.x, bp.forearm_R.y, bp.forearm_R.z);
    geometries.push(elbowGeo); transforms.push(elbowLM); materialIndices.push(0);
    geometries.push(elbowGeo); transforms.push(elbowRM); materialIndices.push(0);

    // ─── FOREARMS (body 0 — hoodie sleeves) ───
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.48, d.limbThickness * s * 0.40, 6,
        bp.forearm_L, bp.hand_L, 0);
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.48, d.limbThickness * s * 0.40, 6,
        bp.forearm_R, bp.hand_R, 0);

    // ─── HANDS (skin 1) — palm sphere + finger nub + thumb ───
    const hs = d.handSize * s;

    // Palm — rounded sphere (reads as hand, not brick)
    const palmGeo = new THREE.SphereGeometry(hs * 0.50, 8, 6);
    geometries.push(palmGeo);
    transforms.push(new THREE.Matrix4().makeTranslation(bp.hand_L.x, bp.hand_L.y, bp.hand_L.z));
    materialIndices.push(1);
    geometries.push(palmGeo);
    transforms.push(new THREE.Matrix4().makeTranslation(bp.hand_R.x, bp.hand_R.y, bp.hand_R.z));
    materialIndices.push(1);

    // Fingers — thin rounded box extending forward from palm
    const fingerGeo = new THREE.BoxGeometry(hs * 0.45, hs * 0.22, hs * 0.55, 2, 2, 2);
    geometries.push(fingerGeo);
    transforms.push(new THREE.Matrix4().makeTranslation(
        bp.hand_L.x, bp.hand_L.y - hs * 0.06, bp.hand_L.z + hs * 0.45));
    materialIndices.push(1);
    geometries.push(fingerGeo);
    transforms.push(new THREE.Matrix4().makeTranslation(
        bp.hand_R.x, bp.hand_R.y - hs * 0.06, bp.hand_R.z + hs * 0.45));
    materialIndices.push(1);

    // Thumbs — small sphere offset to outer side of each hand
    const thumbGeo = new THREE.SphereGeometry(hs * 0.18, 6, 4);
    // Left thumb — toward -X (away from body center)
    geometries.push(thumbGeo);
    transforms.push(new THREE.Matrix4().makeTranslation(
        bp.hand_L.x - hs * 0.42, bp.hand_L.y + hs * 0.05, bp.hand_L.z + hs * 0.2));
    materialIndices.push(1);
    // Right thumb — toward +X, positioned at thumb_R bone for animation
    geometries.push(thumbGeo);
    transforms.push(new THREE.Matrix4().makeTranslation(
        bp.hand_R.x + hs * 0.42, bp.hand_R.y + hs * 0.05, bp.hand_R.z + hs * 0.2));
    materialIndices.push(1);

    // ─── THIGHS (legs 2) — oriented forward (seated) ───
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.45, d.limbThickness * s * 0.40, 6,
        bp.upperLeg_L, bp.lowerLeg_L, 2);
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.45, d.limbThickness * s * 0.40, 6,
        bp.upperLeg_R, bp.lowerLeg_R, 2);

    // ─── SHINS (legs 2) — hanging down ───
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.40, d.limbThickness * s * 0.35, 6,
        bp.lowerLeg_L, bp.foot_L, 2);
    _addOrientedCylinder(geometries, transforms, materialIndices,
        d.limbThickness * s * 0.40, d.limbThickness * s * 0.35, 6,
        bp.lowerLeg_R, bp.foot_R, 2);

    // ─── FEET (legs 2) ───
    const footGeo = new THREE.BoxGeometry(
        d.limbThickness * s * 0.55, d.limbThickness * s * 0.25, d.limbThickness * s * 0.7, 2, 2, 2
    );
    const fLM = new THREE.Matrix4().makeTranslation(
        bp.foot_L.x, bp.foot_L.y - d.limbThickness * s * 0.1, bp.foot_L.z + d.limbThickness * s * 0.15
    );
    const fRM = new THREE.Matrix4().makeTranslation(
        bp.foot_R.x, bp.foot_R.y - d.limbThickness * s * 0.1, bp.foot_R.z + d.limbThickness * s * 0.15
    );
    geometries.push(footGeo); transforms.push(fLM); materialIndices.push(2);
    geometries.push(footGeo); transforms.push(fRM); materialIndices.push(2);

    return { geometries, transforms, materialIndices };
}


/**
 * Create a cylinder oriented between two bone world positions.
 */
function _addOrientedCylinder(geometries, transforms, materialIndices,
    radiusTop, radiusBottom, segments, startPos, endPos, matIndex) {
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    const length = dir.length();
    if (length < 0.001) return;

    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments, 2);
    const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);

    const yAxis = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());

    const mat = new THREE.Matrix4();
    mat.compose(mid, quat, new THREE.Vector3(1, 1, 1));

    geometries.push(geo);
    transforms.push(mat);
    materialIndices.push(matIndex);
}


// ═══════════════════════════════════════
// Auto-skinning (2-bone proximity)
// ═══════════════════════════════════════

function _computeSkinWeights(geometry, bones, boneMap, size) {
    const posAttr = geometry.getAttribute('position');
    const vertCount = posAttr.count;

    const skinIndices = new Float32Array(vertCount * 4);
    const skinWeights = new Float32Array(vertCount * 4);

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

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(
        new Uint16Array(skinIndices), 4
    ));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}

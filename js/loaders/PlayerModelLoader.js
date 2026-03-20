// PlayerModelLoader — preloads Mixamo character (Pete FBX) + GLB animations
// Separate from GLBModelCache because we PRESERVE skinning data (GLBModelCache strips it)

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { PALETTE } from '../data/palette.js';
import { createToonMaterial, createOutlineMaterial } from '../shaders/toonShader.js';

const _gltfLoader = new GLTFLoader();
const _fbxLoader = new FBXLoader();
const _cache = {};   // key → { scene, animations } (normalized format)
let _loaded = false;
let _loading = null;  // singleton Promise

// Model manifest — key → { path, type }
// idle = Pete FBX (base mesh + skeleton + idle clip)
// others = GLB animation-only files (clips retarget onto Pete's skeleton)
const MANIFEST = {
    idle:        { path: 'models/player/pete_sitting_idle.fbx', type: 'fbx' },
    texting:     { path: 'models/player/touchscreen_tablet.glb', type: 'glb' },
    disapproval: { path: 'models/player/sitting_disapproval.glb', type: 'glb' },
    disbelief:   { path: 'models/player/sitting_disbelief.glb', type: 'glb' },
};

// Mixamo bone name → game short name mapping
// Note: GLTF export strips colons from "mixamorig:" prefix → "mixamorig"
const BONE_MAP_MIXAMO_TO_SHORT = {
    'mixamorigHips':              'root',
    'mixamorigSpine':             'spine',
    'mixamorigSpine1':            'spine1',
    'mixamorigSpine2':            'chest',
    'mixamorigNeck':              'neck',
    'mixamorigHead':              'head',
    'mixamorigLeftShoulder':      'shoulder_L',
    'mixamorigLeftArm':           'upperArm_L',
    'mixamorigLeftForeArm':       'forearm_L',
    'mixamorigLeftHand':          'hand_L',
    'mixamorigRightShoulder':     'shoulder_R',
    'mixamorigRightArm':          'upperArm_R',
    'mixamorigRightForeArm':      'forearm_R',
    'mixamorigRightHand':         'hand_R',
    'mixamorigRightHandThumb1':   'thumb_R',
    'mixamorigLeftUpLeg':         'upperLeg_L',
    'mixamorigLeftLeg':           'lowerLeg_L',
    'mixamorigLeftFoot':          'foot_L',
    'mixamorigRightUpLeg':        'upperLeg_R',
    'mixamorigRightLeg':          'lowerLeg_R',
    'mixamorigRightFoot':         'foot_R',
};

// Bone name substrings → color region for vertex coloring
const SKIN_BONES = ['Head', 'Neck', 'Hand', 'Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const PANTS_BONES = ['UpLeg', 'Leg', 'Foot', 'Toe'];


function _loadGLB(url) {
    return new Promise((resolve, reject) => {
        _gltfLoader.load(url, resolve, undefined, reject);
    });
}

function _loadFBX(url) {
    return new Promise((resolve, reject) => {
        _fbxLoader.load(url, resolve, undefined, reject);
    });
}

/**
 * Strip "mixamorig:" colons from bone names so they match GLB convention ("mixamorigHips").
 * Also renames animation track targets to match.
 */
function _normalizeFBXBoneNames(fbxGroup) {
    // Rename all bones
    fbxGroup.traverse(child => {
        if (child.isBone || child.isSkinnedMesh || child.isObject3D) {
            if (child.name && child.name.includes(':')) {
                child.name = child.name.replace(/:/g, '');
            }
        }
    });

    // Rename animation track targets (e.g. "mixamorig:Hips.position" → "mixamorigHips.position")
    if (fbxGroup.animations) {
        for (const clip of fbxGroup.animations) {
            for (const track of clip.tracks) {
                if (track.name.includes(':')) {
                    track.name = track.name.replace(/:/g, '');
                }
            }
        }
    }
}

/**
 * Scale FBX from centimeters to meters (Mixamo FBX exports at cm scale).
 * Applies to the root transform so downstream code sees meter-scale geometry.
 */
function _normalizeFBXScale(fbxGroup) {
    fbxGroup.scale.multiplyScalar(0.01);
    fbxGroup.updateMatrixWorld(true);
}

function _getBoneColorRegion(boneName) {
    if (SKIN_BONES.some(s => boneName.includes(s))) return 'skin';
    if (PANTS_BONES.some(s => boneName.includes(s))) return 'pants';
    return 'hoodie';
}

/**
 * Strip leg bone tracks and Hips position track from a clip.
 * Keeps only upper body animation so legs stay in sitting pose from idle.
 */
function _stripLegTracks(clip) {
    const STRIP_PATTERNS = [
        'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'LeftToe_End',
        'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'RightToe_End',
    ];

    const filtered = clip.tracks.filter(track => {
        const name = track.name;
        // Strip Hips position track (prevents standing up) but keep Hips rotation
        if (name.includes('Hips') && name.endsWith('.position')) return false;
        // Strip all leg bone tracks
        return !STRIP_PATTERNS.some(p => name.includes(p));
    });

    return new THREE.AnimationClip(clip.name + '_upper', clip.duration, filtered);
}

/**
 * Assign vertex colors based on dominant bone weight per vertex.
 * Head/Neck/Hands → skin color, Legs → pants color, everything else → hoodie color.
 */
function _assignVertexColors(skinnedMesh, bones) {
    const geo = skinnedMesh.geometry;
    const skinIdx = geo.getAttribute('skinIndex');
    const skinWt = geo.getAttribute('skinWeight');
    const posCount = geo.getAttribute('position').count;

    const hoodieCol = new THREE.Color(PALETTE.hoodie);
    const skinCol = new THREE.Color(PALETTE.skin);
    const pantsCol = new THREE.Color(PALETTE.pants);

    const colors = new Float32Array(posCount * 3);

    for (let v = 0; v < posCount; v++) {
        // Find dominant bone (highest weight)
        let maxW = 0, maxBoneIdx = 0;
        for (let j = 0; j < 4; j++) {
            const w = skinWt.array[v * skinWt.itemSize + j];
            if (w > maxW) {
                maxW = w;
                maxBoneIdx = Math.round(skinIdx.array[v * skinIdx.itemSize + j]);
            }
        }

        const boneName = (bones[maxBoneIdx] && bones[maxBoneIdx].name) || '';
        const region = _getBoneColorRegion(boneName);

        let c;
        if (region === 'skin') c = skinCol;
        else if (region === 'pants') c = pantsCol;
        else c = hoodieCol;

        colors[v * 3] = c.r;
        colors[v * 3 + 1] = c.g;
        colors[v * 3 + 2] = c.b;
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}


export const PlayerModelLoader = {
    get loaded() { return _loaded; },

    /**
     * Preload all 3 player GLBs in parallel. Safe to call multiple times.
     * @returns {Promise<void>}
     */
    async preloadAll() {
        if (_loaded) return;
        if (_loading) return _loading;

        _loading = (async () => {
            const entries = Object.entries(MANIFEST);
            const results = await Promise.allSettled(
                entries.map(([key, { path, type }]) => {
                    if (type === 'fbx') {
                        return _loadFBX(path).then(fbx => {
                            _normalizeFBXBoneNames(fbx);
                            _normalizeFBXScale(fbx);
                            // Wrap in GLTF-like format: { scene, animations }
                            return { key, gltf: { scene: fbx, animations: fbx.animations || [] } };
                        });
                    }
                    return _loadGLB(path).then(gltf => ({ key, gltf }));
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { key, gltf } = result.value;
                    _cache[key] = gltf;
                } else {
                    console.warn('PlayerModelLoader: failed to load:', result.reason);
                }
            }

            _loaded = true;
            console.log(`PlayerModelLoader: loaded ${Object.keys(_cache).length}/${entries.length} models`);
        })();

        return _loading;
    },

    /**
     * Create a player instance from cached models.
     * Must be called after preloadAll() completes.
     * @returns {{ group, skinnedMesh, skeleton, boneMap, outlineMesh, clips }}
     */
    createPlayerInstance() {
        const idleGltf = _cache.idle;
        if (!idleGltf) throw new Error('PlayerModelLoader: idle model not loaded');

        // Clone the idle model with skeleton intact
        const cloned = SkeletonUtils.clone(idleGltf.scene);

        // Find the surface SkinnedMesh (skip debug meshes like Beta_Joints)
        let skinnedMesh = null;
        const toRemove = [];
        cloned.traverse(child => {
            if (!child.isSkinnedMesh) return;
            if (child.name === 'Beta_Joints') {
                toRemove.push(child);
            } else if (!skinnedMesh) {
                skinnedMesh = child;
            }
        });

        // Fallback: take the first SkinnedMesh
        if (!skinnedMesh) {
            cloned.traverse(child => {
                if (child.isSkinnedMesh && !skinnedMesh) skinnedMesh = child;
            });
        }
        if (!skinnedMesh) throw new Error('PlayerModelLoader: no SkinnedMesh found');

        // Remove unwanted meshes
        toRemove.forEach(m => m.parent && m.parent.remove(m));


        const skeleton = skinnedMesh.skeleton;
        const bones = skeleton.bones;

        // Build bone map: shortName → bone object
        const boneMap = {};
        for (const bone of bones) {
            const shortName = BONE_MAP_MIXAMO_TO_SHORT[bone.name];
            if (shortName) boneMap[shortName] = bone;
        }

        // Clone geometry for outline BEFORE adding vertex colors (avoids unnecessary color data)
        const outlineGeo = skinnedMesh.geometry.clone();

        // Assign vertex colors based on dominant skin weight
        _assignVertexColors(skinnedMesh, bones);

        // Apply toon material with vertex colors
        const lightDir = new THREE.Vector3(0.5, 1.0, 0.3).normalize();
        const toonMat = createToonMaterial({
            baseColor: new THREE.Color(PALETTE.hoodie), // fallback when vertex colors unavailable
            lightDir,
            skinning: true,
            vertexColors: true,
            rimPower: 3.0,
            rimIntensity: 0.4,
        });
        skinnedMesh.material = toonMat;
        skinnedMesh.castShadow = true;

        // Create outline mesh (shares skeleton, uses same bind matrix)
        // Outline width in model space (meters) — multiplied by group scale (1.8) in world
        const outlineMat = createOutlineMaterial({
            outlineWidth: 0.01,
            outlineColor: new THREE.Color(PALETTE.ink),
            skinning: true,
        });
        const outlineMesh = new THREE.SkinnedMesh(outlineGeo, outlineMat);
        outlineMesh.bind(skeleton, skinnedMesh.bindMatrix);
        outlineMesh.frustumCulled = false;

        // Add outline as sibling of skinnedMesh so they share the same parent transform
        skinnedMesh.parent.add(outlineMesh);

        // Wrap in a group for positioning
        const group = new THREE.Group();
        group.add(cloned);

        // Collect animation clips
        const clips = {};

        // Idle clip from the idle model
        if (idleGltf.animations && idleGltf.animations.length > 0) {
            clips.idle = idleGltf.animations[0];
        }

        // Texting clip (upper body only — legs stripped so sitting pose preserved)
        if (_cache.texting && _cache.texting.animations && _cache.texting.animations.length > 0) {
            clips.texting = _stripLegTracks(_cache.texting.animations[0]);
        }

        // Disapproval clip
        if (_cache.disapproval && _cache.disapproval.animations && _cache.disapproval.animations.length > 0) {
            clips.disapproval = _cache.disapproval.animations[0];
        }

        // Disbelief clip (door bust reaction)
        if (_cache.disbelief && _cache.disbelief.animations && _cache.disbelief.animations.length > 0) {
            clips.disbelief = _cache.disbelief.animations[0];
        }

        return { group, skinnedMesh, skeleton, boneMap, outlineMesh, clips };
    },
};

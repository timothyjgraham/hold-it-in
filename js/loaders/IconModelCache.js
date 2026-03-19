// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Icon Model Cache                                            ║
// ║  Loads 3D icon pack GLB, extracts individual models by name,             ║
// ║  applies toon materials + outlines, caches for reuse.                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';
import { PALETTE } from '../data/palette.js';

const _loader = new GLTFLoader();
const _models = new Map();   // modelName → { geometry, bbox }
let _loaded = false;
let _loading = null;
let _atlasTexture = null;
let _outlineMat = null;

const GLB_PATH = 'models/icons/icon-pack.glb';
const ATLAS_PATH = 'models/icons/Color.png';

// Toon gradient map (shared with the rest of the game's toon materials)
let _gradientMap = null;
function _getGradientMap() {
    if (_gradientMap) return _gradientMap;
    // 3-tone ramp: dark, mid, light
    const size = 3;
    const data = new Uint8Array([0, 128, 255]);
    const tex = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    _gradientMap = tex;
    return tex;
}

function _loadGLB(url) {
    return new Promise((resolve, reject) => {
        _loader.load(url, resolve, undefined, reject);
    });
}

function _loadTexture(url) {
    return new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(url, resolve, undefined, reject);
    });
}

export const IconModelCache = {
    get loaded() { return _loaded; },

    /**
     * Preload the icon pack GLB + atlas texture.
     * Safe to call multiple times (singleton promise).
     */
    async preloadAll() {
        if (_loaded) return;
        if (_loading) return _loading;

        _loading = (async () => {
            try {
                const [gltf, atlas] = await Promise.all([
                    _loadGLB(GLB_PATH),
                    _loadTexture(ATLAS_PATH),
                ]);

                _atlasTexture = atlas;
                _atlasTexture.flipY = false; // GLB convention
                _atlasTexture.colorSpace = THREE.SRGBColorSpace;

                const scene = gltf.scene || gltf.scenes[0];
                scene.updateMatrixWorld(true);

                // Extract named models — may be top-level or nested under a RootNode
                const searchNodes = (parent) => {
                    for (const child of parent.children) {
                        if (!child.name || child.name === 'RootNode') {
                            // Recurse into container nodes
                            if (child.children && child.children.length > 0) {
                                searchNodes(child);
                            }
                            continue;
                        }
                        _extractModel(child);
                    }
                };
                searchNodes(scene);

                _loaded = true;
                console.log(`[IconModelCache] Loaded ${_models.size} icon models`);
            } catch (err) {
                console.warn('[IconModelCache] Failed to load icon pack:', err);
                // Non-fatal — procedural icons will be used as fallback
            }
        })();

        return _loading;
    },

    /**
     * Get a cloned THREE.Group for the given model name.
     * Applies toon material + outline. Auto-scales to fit ~1.6 unit box.
     * Returns null if model not found.
     */
    getIconGroup(modelName, scaleOverride) {
        const entry = _models.get(modelName);
        if (!entry) {
            console.warn(`[IconModelCache] Model "${modelName}" not found`);
            return null;
        }

        const g = new THREE.Group();

        // Create toon material using the atlas texture
        const mat = new THREE.MeshToonMaterial({
            map: _atlasTexture,
            gradientMap: _getGradientMap(),
        });

        // Add each mesh with outline
        for (const meshData of entry.meshes) {
            const geo = meshData.geometry.clone();
            const mesh = new THREE.Mesh(geo, mat);
            g.add(mesh);

            // Outline mesh (inverted hull)
            if (!_outlineMat) _outlineMat = outlineMatStatic(0.02);
            const outline = new THREE.Mesh(geo, _outlineMat);
            g.add(outline);
        }

        // Auto-scale to fit within target bounding box
        const bbox = new THREE.Box3().setFromObject(g);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 1.4; // fit within ~1.4 units (leaves margin in 2-unit viewport)
        const s = (targetSize / maxDim) * (scaleOverride || 1);
        g.scale.setScalar(s);

        // Center at origin
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        g.position.set(-center.x * s, -center.y * s, -center.z * s);

        // Wrap in outer group so position offset is baked
        const wrapper = new THREE.Group();
        wrapper.add(g);

        return wrapper;
    },

    /** List all available model names (debug helper) */
    listModels() {
        return [..._models.keys()].sort();
    },
};

// ── Internal ────────────────────────────────────────────────────────────────

function _extractModel(node) {
    const meshes = [];

    node.traverse((child) => {
        if (!child.isMesh) return;

        const geo = child.geometry.clone();
        // Apply the node's local transform to geometry
        geo.applyMatrix4(child.matrixWorld);
        geo.computeBoundingBox();

        meshes.push({
            name: child.name,
            geometry: geo,
        });
    });

    if (meshes.length === 0) return;

    // Compute overall bounding box
    const bbox = new THREE.Box3();
    meshes.forEach(m => bbox.union(m.geometry.boundingBox));

    _models.set(node.name, { meshes, bbox });
}

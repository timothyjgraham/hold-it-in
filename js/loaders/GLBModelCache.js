// GLBModelCache — preloads and caches GLB ocean creature models
// Strips meshes from loaded scenes, stores geometry + metadata for EnemyModelFactory

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const _loader = new GLTFLoader();
const _cache = new Map();   // modelKey → { scene, meshes: [{ name, geometry, materialIndex }], bbox }
let _loaded = false;
let _loading = null;         // singleton Promise

// Model manifest — modelKey → path relative to public/
const MANIFEST = {
    dolphin:   'models/ocean/dolphin.glb',
    shark:     'models/ocean/shark_lowpoly.glb',
    seaturtle: 'models/ocean/turtle.glb',
    jellyfish: 'models/ocean/jellyfish.glb',
    flyfish:   'models/ocean/fish_lowpoly.glb',
    boat:      'models/ocean/boat-row-small.glb',
};

function _loadOne(url) {
    return new Promise((resolve, reject) => {
        _loader.load(
            url,
            (gltf) => resolve(gltf),
            undefined,
            (err) => reject(err)
        );
    });
}

function _extractMeshData(gltf, key) {
    const meshes = [];
    const scene = gltf.scene || gltf.scenes[0];

    scene.updateMatrixWorld(true);

    scene.traverse((child) => {
        if (!child.isMesh) return;

        // Apply the node's world transform to geometry so we get pre-baked positions
        const geo = child.geometry.clone();
        geo.applyMatrix4(child.matrixWorld);
        geo.computeBoundingBox();

        meshes.push({
            name: child.name || `mesh_${meshes.length}`,
            geometry: geo,
            originalMaterialName: child.material?.name || '',
        });
    });

    // Compute overall bounding box from all extracted geometries
    const bbox = new THREE.Box3();
    meshes.forEach(m => bbox.union(m.geometry.boundingBox));

    return { meshes, bbox };
}

export const GLBModelCache = {
    get loaded() { return _loaded; },

    /**
     * Preload all ocean GLB models. Safe to call multiple times (singleton).
     * @returns {Promise<void>}
     */
    async preloadAll() {
        if (_loaded) return;
        if (_loading) return _loading;

        _loading = (async () => {
            const entries = Object.entries(MANIFEST);
            const results = await Promise.allSettled(
                entries.map(([key, path]) =>
                    _loadOne(path).then(gltf => ({ key, gltf }))
                )
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const { key, gltf } = result.value;
                    const data = _extractMeshData(gltf, key);
                    _cache.set(key, data);
                } else {
                    console.warn('GLBModelCache: failed to load a model:', result.reason);
                }
            }

            _loaded = true;
            console.log(`GLBModelCache: loaded ${_cache.size}/${entries.length} models`);
        })();

        return _loading;
    },

    /**
     * Check if a specific model is loaded
     */
    isLoaded(key) {
        return _cache.has(key);
    },

    /**
     * Get cached mesh data for a model key
     * @returns {{ meshes: Array<{name, geometry}>, bbox: THREE.Box3 } | null}
     */
    get(key) {
        return _cache.get(key) || null;
    },

    /**
     * Clone all geometries for a model (each pool instance needs its own)
     * @param {string} key
     * @returns {Array<{name: string, geometry: THREE.BufferGeometry}>}
     */
    cloneGeometries(key) {
        const data = _cache.get(key);
        if (!data) return null;
        return data.meshes.map(m => ({
            name: m.name,
            geometry: m.geometry.clone(),
            originalMaterialName: m.originalMaterialName,
        }));
    },

    /**
     * Get the bounding box size for scaling calculations
     */
    getBBoxSize(key) {
        const data = _cache.get(key);
        if (!data) return null;
        const size = new THREE.Vector3();
        data.bbox.getSize(size);
        return size;
    },

    /**
     * Get the bounding box center for centering calculations
     */
    getBBoxCenter(key) {
        const data = _cache.get(key);
        if (!data) return null;
        const center = new THREE.Vector3();
        data.bbox.getCenter(center);
        return center;
    },
};

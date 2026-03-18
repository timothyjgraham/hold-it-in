// GLBModelCache — preloads and caches GLB models (ocean creatures + airplane characters)
// Strips meshes from loaded scenes, stores geometry + metadata for EnemyModelFactory

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const _loader = new GLTFLoader();
const _cache = new Map();   // modelKey → { scene, meshes: [{ name, geometry, materialIndex }], bbox }
let _loaded = false;
let _loading = null;         // singleton Promise

// Model manifest — modelKey → path relative to public/
const MANIFEST = {
    // Ocean creatures
    dolphin:   'models/ocean/dolphin.glb',
    shark:     'models/ocean/shark_lowpoly.glb',
    seaturtle: 'models/ocean/turtle.glb',
    jellyfish: 'models/ocean/jellyfish.glb',
    flyfish:   'models/ocean/fish_lowpoly.glb',
    // boat removed — embedded texture causes decode errors; pirate uses procedural fallback
    // KayKit airplane models removed — all airplane enemies use procedural geometry
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

        // Strip skinning attributes — we use rigid parts, not SkinnedMesh
        geo.deleteAttribute('skinIndex');
        geo.deleteAttribute('skinWeight');
        // Also strip JOINTS_0 / WEIGHTS_0 (GLTF naming convention)
        if (geo.attributes['JOINTS_0']) geo.deleteAttribute('JOINTS_0');
        if (geo.attributes['WEIGHTS_0']) geo.deleteAttribute('WEIGHTS_0');

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
                    _loadOne(path).then(gltf => ({ key, path, gltf }))
                )
            );

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const [key, path] = entries[i];
                if (result.status === 'fulfilled') {
                    const { gltf } = result.value;
                    const data = _extractMeshData(gltf, key);
                    _cache.set(key, data);
                } else {
                    console.warn(`GLBModelCache: failed to load "${key}" (${path}):`, result.reason);
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

    /**
     * Clone a single named body part, centered at its own bbox origin.
     * Used for KayKit character models that have separate Body/Head/Arm/Leg meshes.
     * @param {string} key - Model cache key (e.g. 'airplane_slim')
     * @param {string} partName - Mesh name to extract (e.g. 'Rogue_Body')
     * @param {number} targetHeight - Desired height of the FULL model (for consistent scaling)
     * @returns {{ geometry: THREE.BufferGeometry, scale: number, center: THREE.Vector3 } | null}
     */
    cloneNamedPart(key, partName, targetHeight) {
        const data = _cache.get(key);
        if (!data) return null;

        const match = data.meshes.find(m => m.name === partName);
        if (!match) return null;

        // Scale factor based on full model height
        const fullSize = new THREE.Vector3();
        data.bbox.getSize(fullSize);
        const scale = targetHeight / fullSize.y;

        // Clone and center this part at its own origin
        const geo = match.geometry.clone();
        geo.computeBoundingBox();
        const partCenter = new THREE.Vector3();
        geo.boundingBox.getCenter(partCenter);
        geo.translate(-partCenter.x, -partCenter.y, -partCenter.z);
        geo.scale(scale, scale, scale);
        geo.computeVertexNormals();

        return {
            geometry: geo,
            scale,
            center: partCenter.multiplyScalar(scale),  // where this part WAS in scaled model space
        };
    },

    /**
     * Clone all body parts for a KayKit model, each centered at its own origin.
     * @param {string} key - Model cache key
     * @param {number} targetHeight - Desired height of the full model
     * @param {Array<string>} partNames - Which mesh names to extract
     * @returns {Object<string, { geometry, scale, center }>}
     */
    cloneNamedParts(key, targetHeight, partNames) {
        const result = {};
        for (const name of partNames) {
            const part = this.cloneNamedPart(key, name, targetHeight);
            if (part) result[name] = part;
        }
        return result;
    },
};

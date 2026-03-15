// EnemyPool.js — Object pool for skeletal enemy models (Phase 6A)
// Reuses SkinnedMesh + AnimationMixer after death instead of dispose+create.

import { createEnemyModel } from '../models/EnemyModelFactory.js';
import { AnimationController } from '../animation/AnimationController.js';

// Pre-allocation counts per type
const PRE_ALLOC = {
    polite: 10,
    dancer: 5,
    waddle: 5,
    panicker: 5,
    powerwalker: 5,
    girls: 7,
    // Forest
    deer: 10,
    squirrel: 5,
    bear: 5,
    fox: 5,
    moose: 5,
    raccoon: 7,
    // Ocean
    dolphin: 10,
    flyfish: 5,
    shark: 5,
    pirate: 5,
    seaturtle: 5,
    jellyfish: 7,
    // Airplane
    nervous: 10,
    business: 5,
    stumbler: 5,
    attendant: 5,
    marshal: 5,
    unruly: 7,
    // Train enemies
    drunk: 8,
    ant: 10,
    seahorse: 8,
    trolley: 4,
};

/**
 * EnemyPool — manages reusable enemy model instances per type.
 *
 * acquire() returns a model (from pool or newly created).
 * release() resets and returns a model to the pool.
 */
export class EnemyPool {
    constructor() {
        // type -> [{group, skinnedMesh, skeleton, boneMap, outlineMesh, materials, animController}]
        this._pools = {};
        this._stats = { hits: 0, misses: 0 };
    }

    /**
     * Pre-allocate pool entries for common enemy types.
     * Call once after game init.
     */
    preAllocate() {
        for (const [type, count] of Object.entries(PRE_ALLOC)) {
            if (!this._pools[type]) this._pools[type] = [];
            for (let i = 0; i < count; i++) {
                const defaultColor = this._defaultColor(type);
                const model = createEnemyModel(type, defaultColor, false, undefined);
                // Rigid models use animRoot (bone hierarchy), legacy uses skinnedMesh
                const animTarget = model.isRigid ? model.animRoot : model.skinnedMesh;
                const ac = new AnimationController(animTarget, type, model.isRigid ? model.skeleton : undefined);
                model.animController = ac;
                model.enemyType = type;
                model.group.visible = false;
                this._pools[type].push(model);
            }
        }
    }

    /**
     * Acquire a model from the pool, or create a new one.
     *
     * @param {string} type - Enemy type key
     * @param {number} color - Body color (hex)
     * @param {boolean} isDesperate - Apply desperate tint
     * @param {number} size - Size (unused for pool reuse — all same type have same size)
     * @returns {{ group, skinnedMesh, skeleton, boneMap, outlineMesh, materials, animController }}
     */
    acquire(type, color, isDesperate, size) {
        if (!this._pools[type]) this._pools[type] = [];
        const pool = this._pools[type];

        if (pool.length > 0) {
            this._stats.hits++;
            const model = pool.pop();
            this._resetModel(model, color, isDesperate);
            return model;
        }

        // Pool miss — create new
        this._stats.misses++;
        const model = createEnemyModel(type, color, isDesperate, size);
        const animTarget = model.isRigid ? model.animRoot : model.skinnedMesh;
        const ac = new AnimationController(animTarget, type, model.isRigid ? model.skeleton : undefined);
        model.animController = ac;
        model.enemyType = type;
        return model;
    }

    /**
     * Release a model back to the pool after death animation.
     * Resets animation and uniforms, hides the group.
     *
     * @param {{ group, skinnedMesh, animController, ... }} model
     */
    release(model) {
        const type = model.enemyType;
        if (!type) return;
        if (!this._pools[type]) this._pools[type] = [];

        // Reset animation controller (keep mixer alive)
        if (model.animController) {
            model.animController.reset();
        }

        // Reset all material uniforms
        this._resetUniforms(model);

        // Reset group transforms (gameplay/cinematic may have modified these)
        model.group.scale.set(1, 1, 1);
        model.group.rotation.set(0, 0, 0);
        model.group.position.set(0, 0, 0);

        // Remove from scene if still attached
        if (model.group.parent) {
            model.group.parent.remove(model.group);
        }

        model.group.visible = false;
        // Ensure outlines are visible again (may have been hidden by LOD)
        if (model.outlineMesh) model.outlineMesh.visible = true;
        if (model.outlineParts) {
            for (const ol of model.outlineParts) ol.visible = true;
        }

        this._pools[type].push(model);
    }

    /**
     * Release all active models back to the pool (for game restart).
     * @param {Array} enemies - Active enemy array
     */
    releaseAll(enemies) {
        for (const e of enemies) {
            const model = {
                group: e.mesh,
                skinnedMesh: e.skinnedMesh,
                skeleton: e.skeleton,
                boneMap: e.boneMap,
                outlineMesh: e.outlineMesh,
                outlineParts: e.outlineParts,
                materials: e.materials,
                animController: e.animController,
                enemyType: e.type,
                parts: e.parts,
                animRoot: e.animRoot,
                isRigid: e.isRigid,
            };
            this.release(model);
        }
    }

    /**
     * Dispose everything — full cleanup.
     */
    clear() {
        for (const pool of Object.values(this._pools)) {
            for (const model of pool) {
                if (model.animController) model.animController.dispose();
                if (model.group) {
                    model.group.traverse(child => {
                        if (child.isMesh) {
                            if (child.geometry) child.geometry.dispose();
                            if (child.material) {
                                const mats = Array.isArray(child.material) ? child.material : [child.material];
                                for (const m of mats) {
                                    if (m.map) m.map.dispose();
                                    if (m.normalMap) m.normalMap.dispose();
                                    if (m.emissiveMap) m.emissiveMap.dispose();
                                    m.dispose();
                                }
                            }
                        }
                    });
                }
            }
        }
        this._pools = {};
    }

    /** Pool stats for performance monitoring */
    getStats() {
        const poolSizes = {};
        for (const [type, pool] of Object.entries(this._pools)) {
            poolSizes[type] = pool.length;
        }
        return { ...this._stats, poolSizes };
    }

    // ── Private ──

    _resetModel(model, color, isDesperate) {
        // Update body color uniform
        const bodyColor = new THREE.Color(color);
        const mats = this._getMaterials(model);
        if (Array.isArray(mats)) {
            // Find a body material — one with uBaseColor
            for (const m of mats) {
                if (m.uniforms && m.uniforms.uBaseColor) {
                    m.uniforms.uBaseColor.value.copy(bodyColor);
                    break;
                }
            }
        }

        // Reset all uniforms
        this._resetUniforms(model);

        // Apply desperate tint if needed
        if (isDesperate) {
            this._setUniformAll(model, 'uDesperateTint', 1.0);
        }

        model.group.visible = true;
        if (model.outlineMesh) model.outlineMesh.visible = true;
        if (model.outlineParts) {
            for (const ol of model.outlineParts) ol.visible = true;
        }
    }

    _resetUniforms(model) {
        this._setUniformAll(model, 'uHitFlash', 0.0);
        this._setUniformAll(model, 'uDesperateTint', 0.0);
        this._setUniformAll(model, 'uAuraGlow', 0.0);
    }

    _getMaterials(model) {
        // Rigid models: skinnedMesh is a shim with .material = array of part materials
        // Legacy models: skinnedMesh is actual SkinnedMesh with .material = array or single
        if (model.skinnedMesh && model.skinnedMesh.material) {
            return model.skinnedMesh.material;
        }
        return null;
    }

    _setUniformAll(model, name, value) {
        const mats = this._getMaterials(model);
        if (Array.isArray(mats)) {
            for (const m of mats) {
                if (m.uniforms && m.uniforms[name]) m.uniforms[name].value = value;
            }
        } else if (mats && mats.uniforms && mats.uniforms[name]) {
            mats.uniforms[name].value = value;
        }
    }

    _defaultColor(type) {
        const colors = {
            polite: 0xd4a574,
            dancer: 0x3498db,
            waddle: 0x795548,
            panicker: 0xf1c40f,
            powerwalker: 0x1abc9c,
            girls: 0xe91e8c,
            // Forest
            deer: 0xc4a882,
            squirrel: 0xd4874a,
            bear: 0x5a4030,
            fox: 0xe0842a,
            moose: 0x6a5a4a,
            raccoon: 0x7a7a7a,
            // Ocean
            dolphin: 0x7a9ab0,
            flyfish: 0xc0d8e8,
            shark: 0x506878,
            pirate: 0x8b2020,
            seaturtle: 0x4a8a50,
            jellyfish: 0xd080c0,
            // Airplane
            nervous: 0xd4c4a4,
            business: 0x2a3a5a,
            stumbler: 0x7ab87a,
            attendant: 0xc03040,
            marshal: 0x4a4a5a,
            unruly: 0xe87830,
            // Train enemies
            drunk: 0xd47070,
            ant: 0x6b3030,
            seahorse: 0xf0a870,
            trolley: 0x9a9aa8,
        };
        return colors[type] || 0xcccccc;
    }
}

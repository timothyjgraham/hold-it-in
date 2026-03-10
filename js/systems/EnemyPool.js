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
                const ac = new AnimationController(model.skinnedMesh, type);
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
        const ac = new AnimationController(model.skinnedMesh, type);
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

        // Remove from scene if still attached
        if (model.group.parent) {
            model.group.parent.remove(model.group);
        }

        model.group.visible = false;
        // Ensure outline is visible again (may have been hidden by LOD)
        if (model.outlineMesh) model.outlineMesh.visible = true;

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
                materials: e.materials,
                animController: e.animController,
                enemyType: e.type,
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
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(m => m.dispose());
                                } else {
                                    child.material.dispose();
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
        const mats = model.skinnedMesh.material;
        if (Array.isArray(mats)) {
            // Index 0 = body material — update its base color
            if (mats[0] && mats[0].uniforms && mats[0].uniforms.uBaseColor) {
                mats[0].uniforms.uBaseColor.value.copy(bodyColor);
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
    }

    _resetUniforms(model) {
        this._setUniformAll(model, 'uHitFlash', 0.0);
        this._setUniformAll(model, 'uDesperateTint', 0.0);
        this._setUniformAll(model, 'uAuraGlow', 0.0);
    }

    _setUniformAll(model, name, value) {
        const mats = model.skinnedMesh.material;
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
        };
        return colors[type] || 0xcccccc;
    }
}

// AnimationController.js — Per-enemy animation state machine
// Phase 4: LOD throttling, crossfade blending, speed synchronization

import { getAnimationClip } from './AnimationLibrary.js';

// ═══════════════════════════════════════
// LOD THRESHOLDS (4B)
// ═══════════════════════════════════════

const LOD_NEAR  = 20;   // < 20 units: every frame
const LOD_MID   = 40;   // 20-40 units: ~30fps
const LOD_NEAR_INTERVAL = 0;       // every frame
const LOD_MID_INTERVAL  = 0.033;   // ~30fps
const LOD_FAR_INTERVAL  = 0.066;   // ~15fps

// ═══════════════════════════════════════
// CROSSFADE DURATIONS
// ═══════════════════════════════════════

const DEFAULT_CROSSFADE = 0.2;
const WADDLE_PANIC_CROSSFADE = 0.4;

/**
 * AnimationController — per-enemy state machine with LOD throttling
 * and speed synchronization.
 *
 * Manages an AnimationMixer bound to a SkinnedMesh, handles state
 * transitions with crossfade blending, additive one-shot layers
 * (hit_react), and distance-based update throttling.
 */
export class AnimationController {

    /**
     * @param {THREE.SkinnedMesh} skinnedMesh — the mesh to animate
     * @param {string} enemyType — key into ENEMY_VISUAL_CONFIG (polite, dancer, etc.)
     */
    constructor(skinnedMesh, enemyType) {
        this.mesh = skinnedMesh;
        this.type = enemyType;
        this.mixer = new THREE.AnimationMixer(skinnedMesh);

        this.currentState = null;
        this.currentAction = null;

        // LOD throttling (4B)
        this.updateAccumulator = 0;

        // Speed sync (4C) — base timeScale applied to looping actions
        this._timeScale = 1.0;
    }

    // ───────────────────────────────────────
    // 4A — State transitions with crossfade
    // ───────────────────────────────────────

    /**
     * Transition to a new looping animation state with crossfade blending.
     * @param {string} newState — animation state name (walk, bash_door, waddle, panic_sprint, etc.)
     */
    setState(newState) {
        if (newState === this.currentState) return;

        const clip = getAnimationClip(this.type, newState);
        const newAction = this.mixer.clipAction(clip);

        // Determine crossfade duration
        let fadeDuration = DEFAULT_CROSSFADE;
        if (this.currentState === 'waddle' && newState === 'panic_sprint') {
            fadeDuration = WADDLE_PANIC_CROSSFADE;
        }

        newAction.setEffectiveTimeScale(this._timeScale);
        newAction.setEffectiveWeight(1);
        newAction.setLoop(THREE.LoopRepeat);

        if (this.currentAction) {
            newAction.reset();
            newAction.play();
            this.currentAction.crossFadeTo(newAction, fadeDuration, true);
        } else {
            newAction.play();
        }

        this.currentState = newState;
        this.currentAction = newAction;
    }

    /**
     * Play a one-shot animation layered additively over the current state.
     * Used for hit_react — blends on top without interrupting walk/bash.
     * @param {string} clipName — animation clip name (e.g. 'hit_react')
     */
    playOneShot(clipName) {
        const clip = getAnimationClip(this.type, clipName);
        const action = this.mixer.clipAction(clip);

        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.blendMode = THREE.AdditiveAnimationBlendMode;

        // Reset to play from the beginning each time
        action.reset();
        action.setEffectiveWeight(1);
        action.play();
    }

    // ───────────────────────────────────────
    // 4C — Speed synchronization
    // ───────────────────────────────────────

    /**
     * Set animation playback speed to match game movement speed.
     *
     * Examples:
     *  - Wet floor slow: setTimeScale(0.4)
     *  - Normal:         setTimeScale(1.0)
     *  - Desperate:      setTimeScale(1.5)
     *  - Panicker aura:  setTimeScale(1.5) (reflects +50% speed boost)
     *
     * Note: Waddle Tank panic is handled by setState('panic_sprint'),
     * NOT by time scale — it has a distinct animation.
     *
     * @param {number} scale
     */
    setTimeScale(scale) {
        this._timeScale = scale;
        if (this.currentAction) {
            this.currentAction.setEffectiveTimeScale(scale);
        }
    }

    // ───────────────────────────────────────
    // 4B — LOD-throttled update
    // ───────────────────────────────────────

    /**
     * Advance the animation mixer, throttled by distance to camera.
     *
     * - < 20 units: every frame (full fidelity)
     * - 20–40 units: ~30 fps (skip every other frame)
     * - > 40 units: ~15 fps (update every ~4 frames)
     *
     * Accumulated dt is passed to the mixer so animations stay in sync
     * even when frames are skipped.
     *
     * @param {number} dt — frame delta time in seconds
     * @param {number} distanceToCamera — world-space distance from enemy to camera
     */
    update(dt, distanceToCamera) {
        this.updateAccumulator += dt;

        // Determine update interval from distance
        let interval;
        if (distanceToCamera < LOD_NEAR) {
            interval = LOD_NEAR_INTERVAL;
        } else if (distanceToCamera < LOD_MID) {
            interval = LOD_MID_INTERVAL;
        } else {
            interval = LOD_FAR_INTERVAL;
        }

        // Update when enough time has accumulated (or every frame for near)
        if (this.updateAccumulator >= interval) {
            this.mixer.update(this.updateAccumulator);
            this.updateAccumulator = 0;
        }
    }

    // ───────────────────────────────────────
    // Cleanup
    // ───────────────────────────────────────

    /**
     * Reset for object pool reuse — stop all actions but keep mixer alive.
     * Call when releasing an enemy back to the pool.
     */
    reset() {
        this.mixer.stopAllAction();
        this.currentAction = null;
        this.currentState = null;
        this._timeScale = 1.0;
        this.updateAccumulator = 0;
    }

    /**
     * Dispose all animation resources. Call on enemy death/removal.
     */
    dispose() {
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot(this.mesh);
        this.mixer = null;
        this.mesh = null;
        this.currentAction = null;
        this.currentState = null;
    }
}

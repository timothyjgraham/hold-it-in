// Player Character — manages the Mixamo-based player model, phone, and animations
// Sits on the toilet, holds phone, taps it when ordering drone deliveries.
// Uses GLB models loaded by PlayerModelLoader.

import { PALETTE } from '../data/palette.js';

export class PlayerCharacter {

    constructor() {
        this.group = null;
        this.skinnedMesh = null;
        this.skeleton = null;
        this.boneMap = null;
        this.mixer = null;
        this.phoneMesh = null;
        this.clips = null;

        // Animation actions
        this._idleAction = null;
        this._disapprovalAction = null;

        this._tapQ = new THREE.Quaternion(); // reused temp quat for panic animation

        // Panic state (cinematic game-over reaction)
        this._isPanicking = false;
        this._panicElapsed = 0;
        this._panicStartPos = new THREE.Vector3();
    }

    /**
     * Build the player model from preloaded Mixamo GLBs, position on toilet, start idle.
     * @param {THREE.Scene} scene
     * @param {THREE.Vector3} toiletPosition — world position of toilet group
     */
    create(scene, toiletPosition) {
        // Create instance from warm cache (preloaded in _initCore)
        const model = window.PlayerModelLoader.createPlayerInstance();
        this.group = model.group;
        this.skinnedMesh = model.skinnedMesh;
        this.skeleton = model.skeleton;
        this.boneMap = model.boneMap;
        this.clips = model.clips;

        // Mixamo Beta is ~1.8m (meter scale). Scale up to match game's stylized proportions.
        // Old procedural player was ~2.0 units visible above toilet seat.
        this.group.scale.setScalar(3.6);

        // Position on toilet seat
        const toiletScale = 0.85;
        const seatWorldY = toiletPosition.y + (1.65 + 0.05) * toiletScale;
        this.group.position.set(
            toiletPosition.x,
            seatWorldY,
            toiletPosition.z + 0.1 * toiletScale
        );

        scene.add(this.group);

        // Create phone attached to hand bone
        this._createPhone();

        // Animation mixer on the group (traverses hierarchy to find Mixamo bones)
        this.mixer = new THREE.AnimationMixer(this.group);

        // Start idle sitting loop
        if (this.clips.idle) {
            this._idleAction = this.mixer.clipAction(this.clips.idle);
            this._idleAction.play();
        }
    }

    /**
     * Trigger phone tap animation (called when player places a tower).
     * Plays the upper-body tablet clip as a one-shot overlay, then returns to idle.
     */
    playPhoneTap() {
        if (!this.boneMap || !this.clips || !this.clips.texting) return;
        if (this._isPanicking) return;

        // Get a fresh action each time to avoid stale state
        const action = this.mixer.clipAction(this.clips.texting);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = false;
        action.reset();
        action.weight = 4.0;  // high weight to override idle on upper body
        action.fadeIn(0.1);
        action.play();
        this._textingAction = action;

        // Only play ~1 second of the animation, then fade back to idle
        clearTimeout(this._textingFadeTimeout);
        clearTimeout(this._textingStopTimeout);
        this._textingFadeTimeout = setTimeout(() => {
            if (this._textingAction === action) {
                action.fadeOut(0.2);
                this._textingStopTimeout = setTimeout(() => action.stop(), 200);
            }
        }, 800);
    }

    /**
     * Trigger disapproval reaction (called when enemies bash the door).
     * Plays the Mixamo disapproval clip as a weighted one-shot overlay.
     */
    playDisapproval() {
        if (!this.boneMap || !this.clips || !this.clips.disapproval) return;
        if (this._isPanicking) return;
        // Don't overlap if already playing
        if (this._disapprovalAction && this._disapprovalAction.isRunning()) return;

        this._disapprovalAction = this.mixer.clipAction(this.clips.disapproval);
        this._disapprovalAction.setLoop(THREE.LoopOnce, 1);
        this._disapprovalAction.clampWhenFinished = false;
        this._disapprovalAction.weight = 0.7;
        this._disapprovalAction.reset();
        this._disapprovalAction.fadeIn(0.2);
        this._disapprovalAction.play();

        // Auto fade out near end of clip
        const dur = this.clips.disapproval.duration;
        const fadeStart = Math.max(0, (dur - 0.3)) * 1000;
        setTimeout(() => {
            if (this._disapprovalAction) {
                this._disapprovalAction.fadeOut(0.3);
            }
        }, fadeStart);
    }

    /**
     * Trigger panic reaction — plays sitting disbelief animation.
     * Called when door shatters and enemies rush in.
     */
    startPanic() {
        if (!this.boneMap) return;
        this._isPanicking = true;
        if (this.mixer) {
            this.mixer.stopAllAction();

            // Play disbelief clip if available, otherwise fall back to procedural panic
            if (this.clips && this.clips.disbelief) {
                const action = this.mixer.clipAction(this.clips.disbelief);
                action.setLoop(THREE.LoopRepeat);
                action.reset();
                action.play();
                this._disbeliefAction = action;
            }
        }
    }

    /**
     * Detach phone from hand bone and return it for physics simulation.
     * Returns the phone mesh at its current world position, or null.
     */
    detachPhone(scene) {
        if (!this.phoneMesh || !this.boneMap.hand_L) return null;
        const worldPos = new THREE.Vector3();
        this.phoneMesh.getWorldPosition(worldPos);
        const worldQuat = new THREE.Quaternion();
        this.phoneMesh.getWorldQuaternion(worldQuat);
        this.boneMap.hand_L.remove(this.phoneMesh);
        this.phoneMesh.position.copy(worldPos);
        this.phoneMesh.quaternion.copy(worldQuat);
        scene.add(this.phoneMesh);
        const phone = this.phoneMesh;
        this.phoneMesh = null;
        return phone;
    }

    /**
     * Reset to calm seated state (called on game restart).
     */
    reset(toiletPosition) {
        this._isPanicking = false;
        this._panicElapsed = 0;
        this._textingAction = null;
        this._disapprovalAction = null;
        this._disbeliefAction = null;
        clearTimeout(this._textingFadeTimeout);
        clearTimeout(this._textingStopTimeout);
        this.group.rotation.y = 0;

        const toiletScale = 0.85;
        const seatWorldY = toiletPosition.y + (1.65 + 0.05) * toiletScale;
        this.group.position.set(
            toiletPosition.x,
            seatWorldY,
            toiletPosition.z + 0.1 * toiletScale
        );

        // Recreate phone if it was detached
        if (!this.phoneMesh) {
            this._createPhone();
        }

        // Restart idle animation (mixer resets all bones to idle clip pose)
        if (this.mixer) {
            this.mixer.stopAllAction();
            if (this.clips && this.clips.idle) {
                this._idleAction = this.mixer.clipAction(this.clips.idle);
                this._idleAction.play();
            }
        }
    }

    /**
     * Update animations and phone screen pulse.
     * @param {number} dt — delta time in seconds
     */
    update(dt) {
        // Panic mode — disbelief animation plays via mixer, or procedural fallback
        if (this._isPanicking) {
            if (this._disbeliefAction) {
                // Disbelief clip handles everything via mixer
                if (this.mixer) this.mixer.update(dt);
                return;
            }
            this._panicElapsed += dt;
            this._updatePanic();
            return;
        }

        if (this.mixer) {
            this.mixer.update(dt);
        }

        // Pulse phone screen glow (bright enough to see from above)
        if (this.phoneMesh && this.phoneMesh.children[0]) {
            const t = Date.now() * 0.001;
            // Flash brighter during tap
            const tapBoost = (this._textingAction && this._textingAction.isRunning()) ? 0.8 : 0;
            this.phoneMesh.children[0].material.emissiveIntensity =
                1.0 + Math.sin(t * 2) * 0.4 + tapBoost;
        }
    }

    // ───────────────────────────────────────
    // Panic animation (cinematic game-over)
    // ───────────────────────────────────────

    _updatePanic() {
        const t = this._panicElapsed;
        const bm = this.boneMap;
        const q = this._tapQ;

        // ── Stand up — rise from seated ──
        const standT = Math.min(1, t / 0.25);
        const standEase = 1 - (1 - standT) * (1 - standT);
        this.group.position.y = this._panicStartPos.y + standEase * 0.8;

        // ── Stagger backward (away from door, -Z) ──
        if (t > 0.2) {
            const staggerT = Math.min(1, (t - 0.2) / 2.0);
            const staggerEase = staggerT * (2 - staggerT); // ease-out
            this.group.position.z = this._panicStartPos.z - staggerEase * 2.5;
        }

        // ── Stumble wobble ──
        this.group.rotation.y = Math.sin(t * 8) * 0.15 * Math.min(1, t / 0.3);

        // ── Spine — lean back in shock ──
        if (bm.spine) {
            q.setFromEuler(new THREE.Euler(
                -0.35 * standEase + Math.sin(t * 6) * 0.12,
                Math.sin(t * 7) * 0.15,
                Math.sin(t * 5) * 0.1
            ));
            bm.spine.quaternion.copy(q);
        }

        // ── Chest — heaving ──
        if (bm.chest) {
            q.setFromEuler(new THREE.Euler(
                Math.sin(t * 8) * 0.08,
                0,
                Math.sin(t * 6) * 0.05
            ));
            bm.chest.quaternion.copy(q);
        }

        // ── Head — snapping around wildly ──
        if (bm.head) {
            q.setFromEuler(new THREE.Euler(
                -0.4 + Math.sin(t * 14) * 0.25,
                Math.sin(t * 11) * 0.35,
                Math.cos(t * 9) * 0.15
            ));
            bm.head.quaternion.copy(q);
        }

        // ── Arms — wild flailing ──
        const flailAmp = 0.7 + Math.sin(t * 3) * 0.3;

        if (bm.upperArm_L) {
            q.setFromEuler(new THREE.Euler(
                Math.sin(t * 15) * flailAmp,
                Math.cos(t * 13) * 0.5,
                -1.0 + Math.sin(t * 11) * 0.6
            ));
            bm.upperArm_L.quaternion.copy(q);
        }

        if (bm.upperArm_R) {
            q.setFromEuler(new THREE.Euler(
                Math.cos(t * 14) * flailAmp,
                Math.sin(t * 12) * 0.5,
                1.0 + Math.cos(t * 10) * 0.6
            ));
            bm.upperArm_R.quaternion.copy(q);
        }

        // ── Forearms flop around ──
        if (bm.forearm_L) {
            q.setFromEuler(new THREE.Euler(
                -0.5 + Math.sin(t * 17) * 0.6,
                Math.cos(t * 13) * 0.3, 0
            ));
            bm.forearm_L.quaternion.copy(q);
        }

        if (bm.forearm_R) {
            q.setFromEuler(new THREE.Euler(
                -0.5 + Math.cos(t * 16) * 0.6,
                Math.sin(t * 12) * 0.3, 0
            ));
            bm.forearm_R.quaternion.copy(q);
        }

        // ── Hands flap wildly ──
        if (bm.hand_L) {
            q.setFromEuler(new THREE.Euler(
                Math.sin(t * 22) * 0.5,
                Math.cos(t * 18) * 0.3, 0
            ));
            bm.hand_L.quaternion.copy(q);
        }
        if (bm.hand_R) {
            q.setFromEuler(new THREE.Euler(
                Math.cos(t * 20) * 0.5,
                Math.sin(t * 16) * 0.3, 0
            ));
            bm.hand_R.quaternion.copy(q);
        }
    }

    // ───────────────────────────────────────
    // Phone mesh
    // ───────────────────────────────────────

    _createPhone() {
        // Phone dimensions in model-local space (meters). Group scale (1.8) applies on top.
        const phoneW = 0.15;
        const phoneH = 0.25;
        const phoneD = 0.025;

        // Phone body
        const phoneGeo = new THREE.BoxGeometry(phoneW, phoneH, phoneD);
        const phoneMat = new THREE.MeshToonMaterial({
            color: PALETTE.ink,
        });
        this.phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);

        // Screen — bright emissive blue glow (visible from above)
        const screenGeo = new THREE.PlaneGeometry(phoneW * 0.85, phoneH * 0.85);
        const screenMat = new THREE.MeshToonMaterial({
            color: 0x4fc3f7,
            emissive: new THREE.Color(0x4fc3f7),
            emissiveIntensity: 1.2,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.z = phoneD * 0.51;
        this.phoneMesh.add(screen);

        // Attach to LEFT hand bone (model-space offsets, meters)
        // Mixamo LeftHand: local Y points along fingers, X is side-to-side, Z is palm normal
        if (this.boneMap.hand_L) {
            this.phoneMesh.position.set(0, 0.1, 0.04);
            this.phoneMesh.rotation.set(-1.2, 0.3, 0);
            this.boneMap.hand_L.add(this.phoneMesh);
        }
    }
}

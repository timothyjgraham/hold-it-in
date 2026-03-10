// Player Character — manages the player model, phone, and animations
// Sits on the toilet, holds phone, taps it when ordering drone deliveries.

import { PLAYER_VISUAL_CONFIG } from '../data/playerConfig.js';
import { createPlayerModel } from './PlayerModelFactory.js';
import { buildRotationTrack } from '../animation/AnimationLibrary.js';

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// ─── Local animation helpers ───

function _quatFromEuler(x, y, z) {
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(x || 0, y || 0, z || 0, 'XYZ'));
    return [q.x, q.y, q.z, q.w];
}

function _eulerTrack(boneName, times, eulers) {
    const values = [];
    for (const [x, y, z] of eulers) {
        values.push(..._quatFromEuler(x, y, z));
    }
    return new THREE.QuaternionKeyframeTrack(boneName + '.quaternion', times, values);
}

function _posTrack(boneName, times, positions) {
    const values = [];
    for (const [x, y, z] of positions) {
        values.push(x, y, z);
    }
    return new THREE.VectorKeyframeTrack(boneName + '.position', times, values);
}


export class PlayerCharacter {

    constructor() {
        this.group = null;
        this.skinnedMesh = null;
        this.skeleton = null;
        this.boneMap = null;
        this.mixer = null;
        this.phoneMesh = null;
        // Manual phone tap state (bypasses broken additive blending in r128)
        this._isTapping = false;
        this._tapElapsed = 0;
        this._tapQ = new THREE.Quaternion();
        // Rest quaternions for MANUAL bones (not reset by idle mixer each frame)
        this._restQuats = {};
    }

    /**
     * Build the player model, position on the toilet, and start idle animation.
     * @param {THREE.Scene} scene
     * @param {THREE.Vector3} toiletPosition — world position of toilet group
     */
    create(scene, toiletPosition) {
        const config = PLAYER_VISUAL_CONFIG.player;
        const s = config.size;

        // Build model
        const model = createPlayerModel();
        this.group = model.group;
        this.skinnedMesh = model.skinnedMesh;
        this.skeleton = model.skeleton;
        this.boneMap = model.boneMap;

        // Position on toilet seat
        // Toilet group is at toiletPosition with scale 1.4x
        // Seat is at local y=1.65 within toilet group
        const toiletScale = 1.4;
        const seatWorldY = toiletPosition.y + (1.65 + 0.05) * toiletScale;
        this.group.position.set(
            toiletPosition.x,
            seatWorldY,
            toiletPosition.z + 0.1 * toiletScale  // nudged forward for camera visibility
        );

        // No rotation — character faces +Z (toward door), same as toilet.
        // Phone visibility comes from the screen glow + arm motion during tap.

        scene.add(this.group);

        // Create phone attached to hand bone
        this._createPhone(config, s);

        // Save rest quaternions for MANUAL bones (mixer doesn't have quaternion
        // tracks for these, so multiply() would accumulate every frame).
        // Only right arm moves during tap — left arm stays untouched.
        const manualBones = ['upperArm_R', 'hand_R'];
        for (const name of manualBones) {
            if (this.boneMap[name]) {
                this._restQuats[name] = this.boneMap[name].quaternion.clone();
            }
        }

        // Animation mixer
        this.mixer = new THREE.AnimationMixer(this.skinnedMesh);

        // Start idle sitting loop
        const idleClip = this._buildIdleSitting(config);
        const idleAction = this.mixer.clipAction(idleClip);
        idleAction.play();
    }

    /**
     * Trigger phone tap animation (called when player places a tower).
     */
    playPhoneTap() {
        if (!this.boneMap) return;
        this._isTapping = true;
        this._tapElapsed = 0;
    }

    /**
     * Update animations and phone screen pulse.
     * @param {number} dt — delta time in seconds
     */
    update(dt) {
        if (this.mixer) {
            this.mixer.update(dt);
        }

        // Manual phone tap overlay — applied AFTER mixer sets idle bone rotations.
        // Multiplies small extra rotations onto just the tap-relevant bones.
        // (Three.js r128 AdditiveAnimationBlendMode doesn't reliably apply
        //  quaternion deltas, so we do manual additive blending here.)
        if (this._isTapping) {
            this._tapElapsed += dt;
            const duration = 0.5;

            if (this._tapElapsed >= duration) {
                this._isTapping = false;
                // Reset MANUAL bones to rest quaternions
                for (const [name, restQ] of Object.entries(this._restQuats)) {
                    if (this.boneMap[name]) {
                        this.boneMap[name].quaternion.copy(restQ);
                    }
                }
            } else {
                this._applyTapOverlay(this._tapElapsed / duration);
            }
        }

        // Pulse phone screen glow (bright enough to see from above)
        if (this.phoneMesh && this.phoneMesh.children[0]) {
            const t = Date.now() * 0.001;
            // Flash brighter during tap
            const tapBoost = this._isTapping ? 0.8 : 0;
            this.phoneMesh.children[0].material.emissiveIntensity =
                1.0 + Math.sin(t * 2) * 0.4 + tapBoost;
        }
    }

    /**
     * Apply phone tap overlay.
     *
     * Left arm/hand are NOT touched — they hold the phone and stay still.
     * Only the RIGHT arm reaches across to tap the phone screen.
     *
     * IDLE bones (spine, forearm_R, head, thumb_R) — mixer resets their
     * quaternions each frame, so multiply() is safe/additive.
     *
     * MANUAL bones (upperArm_R, hand_R) — no idle quaternion tracks,
     * must copy-from-rest before multiply each frame.
     *
     * @param {number} t — normalized time 0..1
     */
    _applyTapOverlay(t) {
        // Quick reach, tap, pull back
        let e;
        if (t < 0.15) {
            e = t / 0.15;                              // snap in
        } else if (t < 0.40) {
            e = 1.0;                                    // hold
        } else {
            e = Math.max(0, (1.0 - t) / 0.60);         // ease out
        }

        const q = this._tapQ;
        const bm = this.boneMap;

        // ── IDLE bones (safe to multiply — mixer resets each frame) ──

        // Spine leans forward slightly into the tap
        q.setFromAxisAngle(AXIS_X, e * 0.12);
        bm.spine.quaternion.multiply(q);

        // Right forearm reaches across toward phone (inward + down)
        q.setFromEuler(new THREE.Euler(e * -0.25, e * -0.50, 0));
        bm.forearm_R.quaternion.multiply(q);

        // Head nods down (glancing at phone during tap)
        q.setFromAxisAngle(AXIS_X, e * 0.08);
        bm.head.quaternion.multiply(q);

        // Thumb presses on screen
        q.setFromAxisAngle(AXIS_X, e * 0.35);
        bm.thumb_R.quaternion.multiply(q);

        // ── MANUAL bones (copy rest quat first, then multiply) ──

        // Right upper arm swings inward across body toward the phone
        if (this._restQuats.upperArm_R) {
            bm.upperArm_R.quaternion.copy(this._restQuats.upperArm_R);
            q.setFromEuler(new THREE.Euler(e * -0.60, e * -0.35, e * 0.20));
            bm.upperArm_R.quaternion.multiply(q);
        }

        // Right hand angles down to tap on phone screen
        if (this._restQuats.hand_R) {
            bm.hand_R.quaternion.copy(this._restQuats.hand_R);
            q.setFromEuler(new THREE.Euler(e * -0.30, e * -0.20, 0));
            bm.hand_R.quaternion.multiply(q);
        }
    }

    // ───────────────────────────────────────
    // Phone mesh
    // ───────────────────────────────────────

    _createPhone(config, s) {
        const phoneW = 0.15 * s;
        const phoneH = 0.25 * s;
        const phoneD = 0.025 * s;

        // Phone body
        const phoneGeo = new THREE.BoxGeometry(phoneW, phoneH, phoneD);
        const phoneMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.3,
            metalness: 0.5,
        });
        this.phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);

        // Screen — bright emissive blue glow (visible from above)
        const screenGeo = new THREE.PlaneGeometry(phoneW * 0.85, phoneH * 0.85);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            emissive: 0x4fc3f7,
            emissiveIntensity: 1.2,
            roughness: 0.1,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.z = phoneD * 0.51;
        this.phoneMesh.add(screen);

        // Attach to LEFT hand bone (left hand holds phone, right hand taps it)
        // Offset pushes phone out to the left and up so it's visible from
        // the top-down camera (not hidden behind the body).
        // rotation.x = -1.4 makes screen nearly horizontal (faces up toward camera).
        if (this.boneMap.hand_L) {
            this.phoneMesh.position.set(0.05 * s, 0.12 * s, 0.04 * s);
            this.phoneMesh.rotation.set(-1.4, 0, -0.08);
            this.boneMap.hand_L.add(this.phoneMesh);
        }
    }

    // ───────────────────────────────────────
    // Animation clips
    // ───────────────────────────────────────

    _buildIdleSitting(config) {
        const dur = 4.0;
        const s = config.size;
        const t = [0, 1.0, 2.0, 3.0, dur];
        const breathAmt = 0.025 * s;

        // Chest position for breathing (absolute values, matching bone offset)
        const cy = config.bonePositions.chest.y * s;
        const cz = (config.bonePositions.chest.z || 0) * s;

        // Head rest pose value (looking down at phone)
        const headTilt = config.restPose.head.x;

        return new THREE.AnimationClip('player_idle_sitting', dur, [
            // Breathing — chest bobs up
            _posTrack('chest', t, [
                [0, cy, cz],
                [0, cy + breathAmt, cz],
                [0, cy, cz],
                [0, cy + breathAmt * 0.7, cz],
                [0, cy, cz],
            ]),
            // Lateral sway (visible from above as body rocks side to side)
            buildRotationTrack('spine', t, [0, 0.06, 0, -0.06, 0], AXIS_Z),
            // Head movements while reading phone (Y rotation = turning, visible from above)
            _eulerTrack('head', t, [
                [headTilt, 0, 0],
                [headTilt - 0.04, 0.06, 0],
                [headTilt + 0.02, -0.04, 0],
                [headTilt - 0.03, 0.05, 0],
                [headTilt, 0, 0],
            ]),
            // Forearms gently rock (shows arm movement from above)
            buildRotationTrack('forearm_R', t, [0, -0.04, 0, -0.06, 0], AXIS_X),
            buildRotationTrack('forearm_L', t, [0, -0.03, 0, -0.05, 0], AXIS_X),
            // Thumb scrolling motion
            buildRotationTrack('thumb_R', t, [0, 0.15, 0, 0.22, 0], AXIS_X),
        ]);
    }
}

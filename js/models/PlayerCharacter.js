// Player Character — manages the player model, phone, and animations
// Sits on the toilet, holds phone, taps it when ordering drone deliveries.

import { PLAYER_VISUAL_CONFIG } from '../data/playerConfig.js';
import { createPlayerModel } from './PlayerModelFactory.js';
import { buildRotationTrack } from '../animation/AnimationLibrary.js';

const AXIS_X = new THREE.Vector3(1, 0, 0);
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
        this.tapClip = null;
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

        scene.add(this.group);

        // Create phone attached to hand bone
        this._createPhone(config, s);

        // Animation mixer
        this.mixer = new THREE.AnimationMixer(this.skinnedMesh);

        // Start idle sitting loop
        const idleClip = this._buildIdleSitting(config);
        const idleAction = this.mixer.clipAction(idleClip);
        idleAction.play();

        // Prepare one-shot phone tap clip
        this.tapClip = this._buildPhoneTap(config);
    }

    /**
     * Trigger phone tap animation (called when player places a tower).
     */
    playPhoneTap() {
        if (!this.mixer || !this.tapClip) return;

        const action = this.mixer.clipAction(this.tapClip);
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = false;
        action.blendMode = THREE.AdditiveAnimationBlendMode;
        action.reset();
        action.setEffectiveWeight(1);
        action.play();
    }

    /**
     * Update animations and phone screen pulse.
     * @param {number} dt — delta time in seconds
     */
    update(dt) {
        if (this.mixer) {
            this.mixer.update(dt);
        }
        // Pulse phone screen glow (bright enough to see from above)
        if (this.phoneMesh && this.phoneMesh.children[0]) {
            const t = Date.now() * 0.001;
            this.phoneMesh.children[0].material.emissiveIntensity = 1.0 + Math.sin(t * 2) * 0.4;
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

        // Attach to right hand bone — angled so screen faces upward (visible from top-down camera)
        if (this.boneMap.hand_R) {
            this.phoneMesh.position.set(0.04 * s, -0.02 * s, 0.02 * s);
            this.phoneMesh.rotation.x = -0.8; // tilted more horizontal so screen faces camera
            this.boneMap.hand_R.add(this.phoneMesh);
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

    _buildPhoneTap(config) {
        const dur = 0.8;
        const s = config.size;
        const t = [0, 0.10, 0.20, 0.35, 0.55, dur];

        return new THREE.AnimationClip('player_phone_tap', dur, [
            // Thumb presses down hard then releases
            buildRotationTrack('thumb_R', t, [0, 0.25, 0.60, 0.25, 0.08, 0], AXIS_X),
            // Whole character lurches forward (visible from above as body shifts toward door)
            _posTrack('root', t, [
                [0, 0, 0],
                [0, 0, 0.03 * s],
                [0, -0.02 * s, 0.08 * s],
                [0, -0.01 * s, 0.04 * s],
                [0, 0, 0.01 * s],
                [0, 0, 0],
            ]),
            // Upper body lean forward
            buildRotationTrack('spine', t, [0, -0.03, -0.15, -0.08, -0.02, 0], AXIS_X),
            // Head dips to look at phone
            buildRotationTrack('head', t, [0, -0.10, -0.22, -0.10, -0.03, 0], AXIS_X),
            // Both forearms pivot forward (elbows extend out as hands push phone)
            buildRotationTrack('forearm_R', t, [0, -0.08, -0.20, -0.10, -0.03, 0], AXIS_X),
            buildRotationTrack('forearm_L', t, [0, -0.05, -0.12, -0.06, -0.02, 0], AXIS_X),
            // Upper arms pull inward slightly during tap (visible as arms move)
            buildRotationTrack('upperArm_R', t, [0, 0.02, 0.08, 0.04, 0.01, 0], AXIS_Z),
            buildRotationTrack('upperArm_L', t, [0, -0.02, -0.08, -0.04, -0.01, 0], AXIS_Z),
        ]);
    }
}

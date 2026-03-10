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
        const seatWorldY = toiletPosition.y + (1.65 + 0.12) * toiletScale;
        this.group.position.set(
            toiletPosition.x,
            seatWorldY,
            toiletPosition.z - 0.15 * toiletScale
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
        // Pulse phone screen glow
        if (this.phoneMesh && this.phoneMesh.children[0]) {
            const t = Date.now() * 0.001;
            this.phoneMesh.children[0].material.emissiveIntensity = 0.4 + Math.sin(t * 2) * 0.15;
        }
    }

    // ───────────────────────────────────────
    // Phone mesh
    // ───────────────────────────────────────

    _createPhone(config, s) {
        const phoneW = 0.12 * s;
        const phoneH = 0.20 * s;
        const phoneD = 0.02 * s;

        // Phone body
        const phoneGeo = new THREE.BoxGeometry(phoneW, phoneH, phoneD);
        const phoneMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.3,
            metalness: 0.5,
        });
        this.phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);

        // Screen — emissive blue glow
        const screenGeo = new THREE.PlaneGeometry(phoneW * 0.85, phoneH * 0.85);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            emissive: 0x4fc3f7,
            emissiveIntensity: 0.5,
            roughness: 0.1,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.z = phoneD * 0.51;
        this.phoneMesh.add(screen);

        // Attach to right hand bone
        if (this.boneMap.hand_R) {
            this.phoneMesh.position.set(0.03 * s, -0.01 * s, 0.01 * s);
            this.phoneMesh.rotation.x = -0.3; // angled screen toward face
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
        const breathAmt = 0.012 * s;

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
            // Subtle lateral sway
            buildRotationTrack('spine', t, [0, 0.010, 0, -0.010, 0], AXIS_Z),
            // Head micro-movements while reading phone
            _eulerTrack('head', t, [
                [headTilt, 0, 0],
                [headTilt - 0.02, 0.02, 0],
                [headTilt + 0.01, -0.01, 0],
                [headTilt - 0.015, 0.015, 0],
                [headTilt, 0, 0],
            ]),
            // Ambient thumb twitch
            buildRotationTrack('thumb_R', t, [0, 0.06, 0, 0.09, 0], AXIS_X),
        ]);
    }

    _buildPhoneTap(config) {
        const dur = 0.5;
        const s = config.size;
        const t = [0, 0.08, 0.15, 0.25, 0.38, dur];

        return new THREE.AnimationClip('player_phone_tap', dur, [
            // Thumb presses down then releases
            buildRotationTrack('thumb_R', t, [0, 0.15, 0.40, 0.18, 0.05, 0], AXIS_X),
            // Right hand slight forward push
            _posTrack('hand_R', t, [
                [0, 0, 0],
                [0, 0, 0.004 * s],
                [0, -0.006 * s, 0.010 * s],
                [0, -0.003 * s, 0.005 * s],
                [0, -0.001 * s, 0.002 * s],
                [0, 0, 0],
            ]),
            // Head nod (acknowledging the order)
            buildRotationTrack('head', t, [0, -0.02, -0.05, -0.025, -0.008, 0], AXIS_X),
            // Spine micro-lean forward
            buildRotationTrack('spine', t, [0, 0, -0.018, -0.010, -0.003, 0], AXIS_X),
        ]);
    }
}

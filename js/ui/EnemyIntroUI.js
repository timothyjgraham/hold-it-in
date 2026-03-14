// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Enemy Introduction Intermission UI                          ║
// ║  PvZ-style "a new enemy approaches" screen between waves.                ║
// ║  Drone flies in with a sign, animated enemy model on a pedestal.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { toonMat } from '../shaders/toonMaterials.js';
import { ENEMY_INTRO_DATA, INTRO_WAVE_MAP } from '../data/enemyIntroData.js';
import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';
import { createUpgradeDrone, updateUpgradeDrone, disposeUpgradeDrone } from '../models/UpgradeDroneModel.js';
import { createEnemyModel } from '../models/EnemyModelFactory.js';
import { AnimationController } from '../animation/AnimationController.js';

// ─── TIMING CONSTANTS ────────────────────────────────────────────────────────

const ENTRY_DURATION = 2.0;       // Phase 1 total
const ENEMY_APPEAR_DELAY = 0.3;   // Delay before enemy model appears
const ENEMY_POP_DUR = 0.4;        // Scale 0→1.1
const ENEMY_SETTLE_DUR = 0.2;     // Scale 1.1→1.0
const PEDESTAL_FADE_DELAY = 0.5;
const PARTICLE_BURST_DELAY = 1.0;
const INPUT_ENABLE_DELAY = 1.8;
// No auto-dismiss — waits for player input
const EXIT_DURATION = 0.8;        // Phase 3
const ENEMY_EXIT_DUR = 0.5;

// ─── RENDER ORDER LAYERS ──────────────────────────────────────────────────────
// Intro elements render ON TOP of the dim plane, which renders on top of the game world.
const DIM_RENDER_ORDER = 999;
const INTRO_RENDER_ORDER = 1000;

// ─── SIGN CANVAS DIMENSIONS ─────────────────────────────────────────────────
// Match the placard geometry aspect ratio (4.5 / 2.8125 ≈ 1.6:1)
// High-res for crisp text at close viewing distance
const SIGN_CANVAS_W = 1600;
const SIGN_CANVAS_H = 1000;

// ─── HELPER: hex to CSS ──────────────────────────────────────────────────────

function hexCSS(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

// ─── SIGN CANVAS TEXTURE ────────────────────────────────────────────────────

function _createIntroSignTexture(enemyType) {
    const data = ENEMY_INTRO_DATA[enemyType];
    const config = ENEMY_VISUAL_CONFIG[enemyType];
    const enemyColor = hexCSS(config.materialColors.body);

    const canvas = document.createElement('canvas');
    canvas.width = SIGN_CANVAS_W;
    canvas.height = SIGN_CANVAS_H;
    const ctx = canvas.getContext('2d');
    const cW = SIGN_CANVAS_W, cH = SIGN_CANVAS_H;

    // Cream background
    ctx.fillStyle = hexCSS(PALETTE.cream);
    ctx.fillRect(0, 0, cW, cH);

    // Enemy color border (10px)
    ctx.strokeStyle = enemyColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, cW - 10, cH - 10);

    // Top colored bar with tagline
    const barH = 105;
    ctx.fillStyle = enemyColor;
    ctx.fillRect(0, 0, cW, barH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexCSS(PALETTE.ink);
    ctx.font = "52px 'Bangers', sans-serif";
    ctx.fillText(data.tagline, cW / 2, barH / 2);

    // Enemy name (large)
    ctx.fillStyle = hexCSS(PALETTE.ink);
    const nameLen = data.name.length;
    const nameFontSize = nameLen > 18 ? 96 : nameLen > 14 ? 112 : 130;
    ctx.font = `bold ${nameFontSize}px 'Bangers', sans-serif`;
    ctx.fillText(data.name, cW / 2, barH + 130);

    // Divider line
    const dividerY = barH + 225;
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, dividerY);
    ctx.lineTo(cW - 100, dividerY);
    ctx.stroke();

    // Trait bullets
    ctx.fillStyle = hexCSS(PALETTE.ink);
    ctx.font = "62px 'Bangers', sans-serif";
    ctx.textAlign = 'center';
    const traitStartY = dividerY + 80;
    const traitLineH = 82;
    for (let i = 0; i < data.traits.length; i++) {
        ctx.fillText('• ' + data.traits[i], cW / 2, traitStartY + i * traitLineH);
    }

    const texture = new THREE.CanvasTexture(canvas);
    // Crisp text: disable mipmaps and use linear filtering
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

// ─── TAP TO CONTINUE TEXT ────────────────────────────────────────────────────

let _tapTextEl = null;

function _ensureTapTextElement() {
    if (_tapTextEl) return _tapTextEl;
    _tapTextEl = document.createElement('div');
    _tapTextEl.id = 'enemy-intro-tap';
    _tapTextEl.style.cssText = `
        position: fixed;
        bottom: 22%;
        left: 50%;
        transform: translateX(-50%);
        z-index: 15;
        font-family: 'Bangers', sans-serif;
        font-size: 44px;
        color: var(--pal-cream, #fff4d9);
        text-shadow: 2px 2px 0 var(--pal-ink, #1a1a2e), -1px -1px 0 var(--pal-ink, #1a1a2e);
        letter-spacing: 3px;
        padding: 12px 36px;
        background: rgba(26, 26, 46, 0.6);
        border: 2px solid rgba(255, 244, 217, 0.4);
        border-radius: 8px;
        opacity: 0;
        transition: opacity 0.4s;
        pointer-events: none;
        user-select: none;
    `;
    _tapTextEl.textContent = 'CLICK TO CONTINUE';
    document.body.appendChild(_tapTextEl);
    return _tapTextEl;
}

// ─── HELPER: set renderOrder on all meshes in a hierarchy ────────────────────

function _setRenderOrder(obj, order) {
    obj.traverse(child => {
        if (child.isMesh) {
            child.renderOrder = order;
        }
    });
}

// ─── ENEMY INTRO UI CLASS ────────────────────────────────────────────────────

export class EnemyIntroUI {
    constructor() {
        this.active = false;
        this._phase = 'idle'; // idle | entering | display | exiting
        this._timer = 0;
        this._inputEnabled = false;

        // 3D objects
        this._drone = null;
        this._dimPlane = null;
        this._signGroup = null;
        this._signTexture = null;
        this._enemyGroup = null;
        this._enemyAnimCtrl = null;
        this._displayScale = 1.0;
        this._particles = [];
        this._introLights = [];

        // Scene refs
        this._scene = null;
        this._camera = null;
        this._onComplete = null;
        this._enemyType = null;

        // Input handler
        this._onDismiss = this._handleDismiss.bind(this);
    }

    /**
     * Check if the given wave number has an enemy intro.
     * @param {number} waveNumber
     * @param {string} [scenario='office'] - Current scenario key
     * @returns {string|null} Enemy type key or null
     */
    static getIntroEnemyType(waveNumber, scenario = 'office') {
        const map = INTRO_WAVE_MAP[scenario] || INTRO_WAVE_MAP.office;
        return map[waveNumber] || null;
    }

    /**
     * Start the enemy introduction intermission.
     * @param {string} enemyType - Key into ENEMY_INTRO_DATA
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     * @param {Array} windowPositions - Available window positions for drone entry
     * @param {Function} onComplete - Called when intermission ends
     */
    activate(enemyType, scene, camera, windowPositions, onComplete) {
        if (this.active) this.deactivate();

        this.active = true;
        this._phase = 'entering';
        this._timer = 0;
        if (window.SFX) SFX.play('intro_reveal');
        this._inputEnabled = false;
        this._scene = scene;
        this._camera = camera;
        this._onComplete = onComplete;
        this._enemyType = enemyType;

        const introData = ENEMY_INTRO_DATA[enemyType];
        const visualConfig = ENEMY_VISUAL_CONFIG[enemyType];

        // ── Background dim (3D plane, renders on top of game world via renderOrder) ──
        this._createDimPlane();

        // ── Create drone with sign ──
        this._createDroneWithSign(enemyType, windowPositions);

        // ── Create enemy model on pedestal ──
        this._createEnemyDisplay(enemyType);

        // ── Dedicated intro lighting (scene lights don't reach y=23-28) ──
        this._createIntroLights();

        // ── Tap text (hidden initially) ──
        const tapEl = _ensureTapTextElement();
        tapEl.style.opacity = '0';

        // ── Input listeners (added, but not enabled until delay) ──
        window.addEventListener('click', this._onDismiss);
        window.addEventListener('touchstart', this._onDismiss);
        window.addEventListener('keydown', this._onDismiss);
    }

    /**
     * Create a fullscreen dim plane that renders ON TOP of the game world
     * (via renderOrder) but BEHIND the intro elements. Writes to depth buffer
     * so intro elements can depth-test against it correctly.
     */
    _createDimPlane() {
        const geo = new THREE.PlaneGeometry(200, 200);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.35,
            depthTest: true,    // Test against depth buffer: fails where intro elements
                                // already drew (13-18 units) → leaves them bright.
                                // Passes over game world (37+ units) → dims it.
            depthWrite: false,  // Don't modify depth buffer
            fog: false,
            side: THREE.DoubleSide,
        });
        this._dimPlane = new THREE.Mesh(geo, mat);
        this._dimPlane.renderOrder = DIM_RENDER_ORDER;

        // Position 25 units along camera view direction — behind intro elements
        // (13-18 units from camera) but in front of game world (37+ units).
        const cam = this._camera;
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        this._dimPlane.position.copy(cam.position).add(dir.multiplyScalar(25));
        this._dimPlane.lookAt(cam.position);

        this._scene.add(this._dimPlane);
    }

    /**
     * Add dedicated lights so the intro elements are well-lit.
     * Scene lights are designed for y=0-5 (game floor) and don't reach y=17-22.
     * Uses PointLights with limited range to avoid changing the game world look.
     */
    _createIntroLights() {
        // Gentle key light from above/behind — ambient is already 0.7,
        // so these just add enough to make the elements look properly lit.
        const keyLight = new THREE.PointLight(0xfff0d0, 0.6, 25, 1);
        keyLight.position.set(0, 34, -2);
        this._scene.add(keyLight);
        this._introLights.push(keyLight);

        // Fill from the left side (illuminates enemy model on its left position)
        const fillLight = new THREE.PointLight(0xfff0d0, 0.3, 20, 1);
        fillLight.position.set(-8, 28, 2);
        this._scene.add(fillLight);
        this._introLights.push(fillLight);
    }

    /**
     * Create the drone and its attached intro sign.
     */
    _createDroneWithSign(enemyType, windowPositions) {
        // Create a common-tier drone (reuse upgrade drone factory with a fake upgrade)
        const fakeUpgrade = { name: '', rarity: 'common', icon: 'star', description: '' };
        this._drone = createUpgradeDrone(fakeUpgrade, 0);

        // Replace the placard texture with our intro sign
        const signTexture = _createIntroSignTexture(enemyType);
        this._signTexture = signTexture;

        // Find the placard mesh and replace its texture
        this._drone.traverse(child => {
            if (child.name === 'placard' && child.isMesh) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                    if (mat.map) {
                        mat.map.dispose();
                        mat.map = signTexture;
                        mat.needsUpdate = true;
                    }
                }
            }
        });

        // Scale up the sign group for larger intro placard
        const signGroup = this._drone.userData.signGroup;
        if (signGroup) {
            signGroup.scale.set(1.8, 1.8, 1.8);
        }

        // Mark all drone meshes to render on top of dim plane
        _setRenderOrder(this._drone, INTRO_RENDER_ORDER);

        // Flight path: pick random window → hover position (right of center, model is on left)
        const hoverPos = new THREE.Vector3(2.5, 30, 3);
        let startPos;

        if (windowPositions && windowPositions.length > 0) {
            const win = windowPositions[Math.floor(Math.random() * windowPositions.length)];
            const outsideX = win.x + (win.x < 0 ? -3 : 3);
            startPos = new THREE.Vector3(outsideX, win.y, win.z);

            this._drone.userData.flightCurve = new THREE.CatmullRomCurve3([
                startPos.clone(),
                new THREE.Vector3(win.x, win.y + 2, win.z),
                new THREE.Vector3(win.x * 0.3, (win.y + hoverPos.y) / 2 + 2, (win.z + hoverPos.z) / 2),
                hoverPos.clone(),
            ], false, 'catmullrom', 0.3);
        } else {
            // Fallback: fly in from above
            startPos = new THREE.Vector3(0, 45, -2);
            this._drone.userData.flightCurve = new THREE.CatmullRomCurve3([
                startPos.clone(),
                new THREE.Vector3(0, 40, -2),
                hoverPos.clone(),
            ], false, 'catmullrom', 0.3);
        }

        this._drone.position.copy(startPos);
        this._drone.userData.state = 'entering';
        this._drone.userData.flightProgress = 0;
        this._drone.userData.enterDuration = 1.8;
        this._drone.userData.targetPos = hoverPos.clone();
        this._drone.userData.prevPos = startPos.clone();

        this._scene.add(this._drone);
    }

    /**
     * Create the enemy model for display (no pedestal).
     * Model is created at normal config size with a group scale to normalize visual size.
     */
    _createEnemyDisplay(enemyType) {
        const config = ENEMY_VISUAL_CONFIG[enemyType];
        const introData = ENEMY_INTRO_DATA[enemyType];

        // Create at normal game size so animations match correctly
        const result = createEnemyModel(enemyType, config.materialColors.body, false, config.size);
        this._enemyGroup = result.group;

        // Normalize visual size — all enemies appear roughly similar screen size
        const targetSize = 4.5;
        this._displayScale = targetSize / config.size;

        // Calculate approximate feet bottom in local space for Y positioning
        const bp = config.bonePositions;
        const isQuad = config.skeletonType === 'quadruped';
        let feetLocalY;
        if (isQuad) {
            const pelvisY = (bp.pelvis || {}).y || 0;
            const hULY = (bp.hindUpperLeg_L || {}).y || 0;
            const hLLY = (bp.hindLowerLeg_L || {}).y || 0;
            const hFY = (bp.hindFoot_L || {}).y || 0;
            feetLocalY = (bp.root.y + pelvisY + hULY + hLLY + hFY) * config.size;
        } else {
            const uLY = (bp.upperLeg_L || {}).y || 0;
            const lLY = (bp.lowerLeg_L || {}).y || 0;
            const fY = (bp.foot_L || {}).y || 0;
            feetLocalY = (bp.root.y + uLY + lLY + fY) * config.size;
        }
        const feetMargin = 0.08 * config.size;
        const groundY = 22;
        const groupY = groundY - (feetLocalY - feetMargin) * this._displayScale;

        // Position model to the LEFT of the info card
        this._enemyGroup.position.set(-5, groupY, 4);
        this._enemyGroup.scale.setScalar(0); // pop-in starts at 0

        _setRenderOrder(this._enemyGroup, INTRO_RENDER_ORDER);
        this._scene.add(this._enemyGroup);

        // Start walk animation
        const animTarget = result.isRigid ? result.animRoot : result.skinnedMesh;
        this._enemyAnimCtrl = new AnimationController(
            animTarget, enemyType, result.isRigid ? result.skeleton : undefined
        );
        this._enemyAnimCtrl.setState(introData.walkState);

        // No pedestal — clean floating display
    }

    /**
     * Spawn a burst of particles in the enemy's color.
     */
    _spawnEnemyParticles() {
        const config = ENEMY_VISUAL_CONFIG[this._enemyType];
        const color = config.materialColors.body;
        const center = new THREE.Vector3(-5, 24.5, 4);

        for (let i = 0; i < 20; i++) {
            const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4);
            const mat = toonMat(color, {
                emissive: color,
                emissiveIntensity: 0.5,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(center);
            mesh.renderOrder = INTRO_RENDER_ORDER;
            this._scene.add(mesh);

            const angle = Math.random() * Math.PI * 2;
            const upAngle = Math.random() * Math.PI * 0.6 - Math.PI * 0.1;
            const spd = 3 * (0.6 + Math.random() * 0.8);
            this._particles.push({
                mesh,
                vx: Math.cos(angle) * Math.cos(upAngle) * spd,
                vy: Math.sin(upAngle) * spd + 2,
                vz: Math.sin(angle) * Math.cos(upAngle) * spd,
                life: 0.8 * (0.5 + Math.random() * 0.5),
                maxLife: 0.8,
            });
        }
    }

    // ─── DISMISS HANDLER ─────────────────────────────────────────────────

    _handleDismiss(e) {
        if (!this._inputEnabled) return;
        if (e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
        e.stopPropagation();
        e.preventDefault();
        this._beginExit();
    }

    // ─── UPDATE (called every frame) ─────────────────────────────────────

    update(dt) {
        if (!this.active) return;

        this._timer += dt;

        // ── Phase 1: Entry ──
        if (this._phase === 'entering') {
            this._updateEntry(dt);

            // Enable input after delay
            if (this._timer >= INPUT_ENABLE_DELAY && !this._inputEnabled) {
                this._inputEnabled = true;
                const tapEl = _tapTextEl;
                if (tapEl) {
                    tapEl.style.opacity = '1';
                    // Pulse animation via CSS
                    tapEl.style.animation = 'enemyIntroPulse 1.2s ease-in-out infinite';
                    this._ensurePulseCSS();
                }
            }

            if (this._timer >= ENTRY_DURATION) {
                this._phase = 'display';

                // Ensure drone is in hover state
                const ud = this._drone.userData;
                if (ud.state !== 'hovering') {
                    ud.state = 'hovering';
                    this._drone.position.copy(ud.targetPos);
                    this._drone.rotation.set(0, 0, 0);
                }
            }
        }

        // ── Phase 2: Display (waits for player input) ──
        if (this._phase === 'display') {
            // No auto-dismiss — player must click/tap/press to continue
        }

        // ── Phase 3: Exit ──
        if (this._phase === 'exiting') {
            this._updateExit(dt);
        }

        // ── Always: update drone animations, enemy animation, particles ──
        this._updateDrone(dt);
        this._updateEnemyModel(dt);
        this._updateParticles(dt);
    }

    // ─── ENTRY PHASE UPDATE ──────────────────────────────────────────────

    _updateEntry(dt) {
        const ud = this._drone.userData;

        // Drone flight
        if (ud.state === 'entering' && ud.flightCurve) {
            ud.flightProgress += dt / ud.enterDuration;
            const t = Math.min(1, ud.flightProgress);
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const pos = new THREE.Vector3();
            ud.flightCurve.getPoint(et, pos);

            // Smoothed velocity for pendulum
            const rawVel = ud.prevPos ? pos.clone().sub(ud.prevPos) : new THREE.Vector3();
            if (!ud._smoothVel) ud._smoothVel = rawVel.clone();
            ud._smoothVel.lerp(rawVel, 0.15);

            this._drone.position.copy(pos);
            ud._externalAccel = -ud._smoothVel.x * 3.0;

            // Tilt fading
            const tiltFade = Math.min(1, (1 - t) / 0.2);
            const speed = ud._smoothVel.length() / Math.max(dt, 0.001);
            const tilt = Math.min(0.3, speed * 0.02) * tiltFade;
            const hDir = new THREE.Vector2(ud._smoothVel.x, ud._smoothVel.z);
            if (hDir.length() > 0.001) {
                hDir.normalize();
                this._drone.rotation.y = Math.atan2(hDir.x, hDir.y) * tiltFade;
                this._drone.rotation.x = -tilt;
                this._drone.rotation.z = -ud._smoothVel.x * 0.1 * tiltFade;
            }

            ud.prevPos = pos.clone();

            if (t >= 1) {
                ud.state = 'settling';
                ud._settleTimer = 0;
                this._drone.position.copy(ud.targetPos);
                ud._externalAccel = 0;
            }
        }

        if (ud.state === 'settling') {
            const decay = Math.pow(0.88, dt * 60);
            this._drone.rotation.x *= decay;
            this._drone.rotation.y *= decay;
            this._drone.rotation.z *= decay;

            ud._settleTimer = (ud._settleTimer || 0) + dt;
            const bob = ud._hoverBob || 0;
            this._drone.position.y = ud.targetPos.y + bob;

            if (ud._settleTimer >= 0.5) {
                ud.state = 'hovering';
                this._drone.rotation.set(0, 0, 0);
            }
        }

        if (ud.state === 'hovering') {
            const bob = ud._hoverBob || 0;
            this._drone.position.y = ud.targetPos.y + bob;
        }

        // Enemy model pop-in (scales to _displayScale instead of 1.0)
        if (this._enemyGroup && this._timer >= ENEMY_APPEAR_DELAY) {
            const ds = this._displayScale || 1.0;
            const enemyT = this._timer - ENEMY_APPEAR_DELAY;
            if (enemyT < ENEMY_POP_DUR) {
                // Scale 0 → ds*1.1
                const t = enemyT / ENEMY_POP_DUR;
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                this._enemyGroup.scale.setScalar(eased * ds * 1.1);
            } else if (enemyT < ENEMY_POP_DUR + ENEMY_SETTLE_DUR) {
                // Scale ds*1.1 → ds
                const t = (enemyT - ENEMY_POP_DUR) / ENEMY_SETTLE_DUR;
                this._enemyGroup.scale.setScalar(ds * (1.1 - t * 0.1));
            } else {
                this._enemyGroup.scale.setScalar(ds);
            }
        }

        // Particle burst
        if (this._timer >= PARTICLE_BURST_DELAY && this._particles.length === 0 && this._phase === 'entering') {
            this._spawnEnemyParticles();
        }
    }

    // ─── DRONE UPDATE (always running) ───────────────────────────────────

    _updateDrone(dt) {
        if (!this._drone) return;
        updateUpgradeDrone(this._drone, dt);

        // Billboard the sign to face the camera flat-on (override pendulum tilt).
        // For non-camera objects, lookAt() makes +Z face the target.
        // The textured face is on -Z, so we look at a point AWAY from camera
        // to make -Z (textured side) point toward the camera.
        const signGroup = this._drone.userData.signGroup;
        if (signGroup && this._camera) {
            const wPos = new THREE.Vector3();
            signGroup.getWorldPosition(wPos);
            const awayFromCamera = wPos.clone().multiplyScalar(2).sub(this._camera.position);
            signGroup.lookAt(awayFromCamera);
        }
    }

    // ─── ENEMY MODEL UPDATE ──────────────────────────────────────────────

    _updateEnemyModel(dt) {
        if (!this._enemyGroup || !this._enemyAnimCtrl) return;

        // Update animation (use near-distance for full fidelity)
        this._enemyAnimCtrl.update(dt, 0);

        // Turntable rotation
        if (this._phase !== 'exiting') {
            this._enemyGroup.rotation.y += 0.3 * dt;
        }
    }

    // ─── PARTICLES UPDATE ────────────────────────────────────────────────

    _updateParticles(dt) {
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life -= dt;
            p.vy -= 6 * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            const fade = Math.max(0, p.life / p.maxLife);
            p.mesh.material.transparent = true;
            p.mesh.material.opacity = fade;
            p.mesh.scale.setScalar(0.5 + fade * 0.5);

            if (p.life <= 0) {
                this._scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this._particles.splice(i, 1);
            }
        }
    }

    // ─── EXIT PHASE ──────────────────────────────────────────────────────

    _beginExit() {
        if (this._phase === 'exiting') return;
        this._phase = 'exiting';
        this._timer = 0;
        this._inputEnabled = false;

        // Remove input listeners
        window.removeEventListener('click', this._onDismiss);
        window.removeEventListener('touchstart', this._onDismiss);
        window.removeEventListener('keydown', this._onDismiss);

        // Hide tap text
        if (_tapTextEl) _tapTextEl.style.opacity = '0';

        // Set drone exit flight
        if (this._drone) {
            const ud = this._drone.userData;
            ud.state = 'exiting';

            // Fly out to a random direction
            const startPos = this._drone.position.clone();
            const exitX = (Math.random() - 0.5) * 20;
            const exitTarget = new THREE.Vector3(exitX, 45, startPos.z - 10);

            ud._exitCurve = new THREE.CatmullRomCurve3([
                startPos,
                new THREE.Vector3((startPos.x + exitTarget.x) / 2, startPos.y + 3, (startPos.z + exitTarget.z) / 2),
                exitTarget,
            ], false, 'catmullrom', 0.3);
            ud._exitProgress = 0;
        }
    }

    _updateExit(dt) {
        const exitT = this._timer; // _timer was reset when exit began

        // Drone exit flight
        if (this._drone) {
            const ud = this._drone.userData;
            if (ud._exitCurve) {
                ud._exitProgress += dt / EXIT_DURATION;
                const t = Math.min(1, ud._exitProgress);
                const et = t * t; // Accelerating

                const pos = new THREE.Vector3();
                ud._exitCurve.getPoint(et, pos);
                this._drone.position.copy(pos);

                // Tilt forward as it flies away
                this._drone.rotation.x = -t * 0.3;
            }
        }

        // Enemy model: spin + scale to 0
        if (this._enemyGroup) {
            const ds = this._displayScale || 1.0;
            const t = Math.min(1, exitT / ENEMY_EXIT_DUR);
            this._enemyGroup.rotation.y += dt * 8; // fast spin
            this._enemyGroup.scale.setScalar(Math.max(0, ds * (1 - t)));
        }

        // Dim plane fade out
        if (this._dimPlane) {
            const t = Math.min(1, exitT / EXIT_DURATION);
            this._dimPlane.material.opacity = 0.35 * (1 - t);
        }

        // Complete
        if (exitT >= EXIT_DURATION) {
            const callback = this._onComplete;
            this.deactivate();
            if (callback) callback();
        }
    }

    // ─── DEACTIVATE (cleanup) ────────────────────────────────────────────

    deactivate() {
        if (!this.active && !this._drone && !this._enemyGroup) return;

        this.active = false;
        this._phase = 'idle';
        this._inputEnabled = false;

        // Remove input listeners
        window.removeEventListener('click', this._onDismiss);
        window.removeEventListener('touchstart', this._onDismiss);
        window.removeEventListener('keydown', this._onDismiss);

        // Clean up drone
        if (this._drone && this._scene) {
            this._scene.remove(this._drone);
            disposeUpgradeDrone(this._drone);
            this._drone = null;
        }

        // Clean up sign texture
        if (this._signTexture) {
            this._signTexture.dispose();
            this._signTexture = null;
        }

        // Clean up enemy model
        if (this._enemyGroup && this._scene) {
            this._scene.remove(this._enemyGroup);
            this._enemyGroup.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else if (child.material) {
                        child.material.dispose();
                    }
                }
            });
            this._enemyGroup = null;
        }

        // Clean up animation controller
        if (this._enemyAnimCtrl) {
            this._enemyAnimCtrl.dispose();
            this._enemyAnimCtrl = null;
        }

        // Clean up dim plane
        if (this._dimPlane && this._scene) {
            this._scene.remove(this._dimPlane);
            this._dimPlane.geometry.dispose();
            this._dimPlane.material.dispose();
            this._dimPlane = null;
        }

        // Clean up intro lights
        if (this._scene) {
            for (const light of this._introLights) {
                this._scene.remove(light);
            }
        }
        this._introLights = [];

        // Clean up particles
        if (this._scene) {
            for (const p of this._particles) {
                this._scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
            }
        }
        this._particles = [];

        // Hide DOM elements
        if (_tapTextEl) {
            _tapTextEl.style.opacity = '0';
            _tapTextEl.style.animation = '';
        }

        this._scene = null;
        this._camera = null;
        this._onComplete = null;
        this._enemyType = null;
    }

    // ─── DISPOSE (full teardown) ─────────────────────────────────────────

    dispose() {
        this.deactivate();
        if (_tapTextEl && _tapTextEl.parentNode) {
            _tapTextEl.parentNode.removeChild(_tapTextEl);
            _tapTextEl = null;
        }
    }

    // ─── CSS ANIMATION HELPER ────────────────────────────────────────────

    _ensurePulseCSS() {
        if (document.getElementById('enemy-intro-pulse-style')) return;
        const style = document.createElement('style');
        style.id = 'enemy-intro-pulse-style';
        style.textContent = `
            @keyframes enemyIntroPulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1.0; }
            }
        `;
        document.head.appendChild(style);
    }
}

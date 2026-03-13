// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Tower Introduction Intermission UI                          ║
// ║  Celebrates first-time tower unlocks with a drone + 3D model display.    ║
// ║  Mirrors EnemyIntroUI but uses pre-built tower meshes (no animation).    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';
import { TOWER_INTRO_DATA, TOWER_INTRO_WAVE_MAP } from '../data/towerIntroData.js';
import { createUpgradeDrone, updateUpgradeDrone, disposeUpgradeDrone } from '../models/UpgradeDroneModel.js';

// ─── TIMING CONSTANTS ────────────────────────────────────────────────────────

const ENTRY_DURATION = 2.0;
const TOWER_APPEAR_DELAY = 0.3;
const TOWER_POP_DUR = 0.4;
const TOWER_SETTLE_DUR = 0.2;
const PEDESTAL_FADE_DELAY = 0.5;
const PARTICLE_BURST_DELAY = 1.0;
const INPUT_ENABLE_DELAY = 1.8;
const EXIT_DURATION = 0.8;
const TOWER_EXIT_DUR = 0.5;

// ─── RENDER ORDER LAYERS ──────────────────────────────────────────────────────
const DIM_RENDER_ORDER = 999;
const INTRO_RENDER_ORDER = 1000;

// ─── SIGN CANVAS DIMENSIONS ─────────────────────────────────────────────────
const SIGN_CANVAS_W = 1600;
const SIGN_CANVAS_H = 1000;

// ─── DISPLAY SCALES PER TOWER ────────────────────────────────────────────────
const TOWER_DISPLAY_SCALES = {
    wetfloor: 1.5,
    mop: 1.2,
    potplant: 2.2,
};

// ─── HELPER: hex to CSS ──────────────────────────────────────────────────────

function hexCSS(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

// ─── SIGN CANVAS TEXTURE ────────────────────────────────────────────────────

function _createTowerSignTexture(towerType) {
    const data = TOWER_INTRO_DATA[towerType];
    const towerColor = hexCSS(data.color);

    const canvas = document.createElement('canvas');
    canvas.width = SIGN_CANVAS_W;
    canvas.height = SIGN_CANVAS_H;
    const ctx = canvas.getContext('2d');
    const cW = SIGN_CANVAS_W, cH = SIGN_CANVAS_H;

    // Cream background
    ctx.fillStyle = hexCSS(PALETTE.cream);
    ctx.fillRect(0, 0, cW, cH);

    // Tower color border
    ctx.strokeStyle = towerColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, cW - 10, cH - 10);

    // Top colored bar with "NEW TOWER UNLOCKED!"
    const barH = 105;
    ctx.fillStyle = towerColor;
    ctx.fillRect(0, 0, cW, barH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexCSS(PALETTE.ink);
    ctx.font = "52px 'Bangers', sans-serif";
    ctx.fillText(data.tagline, cW / 2, barH / 2);

    // Tower name (large)
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
    _tapTextEl.id = 'tower-intro-tap';
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

// ─── TOWER INTRO UI CLASS ────────────────────────────────────────────────────

export class TowerIntroUI {
    constructor() {
        this.active = false;
        this._phase = 'idle'; // idle | entering | display | exiting
        this._timer = 0;
        this._inputEnabled = false;

        // 3D objects
        this._drone = null;
        this._dimPlane = null;
        this._signTexture = null;
        this._towerGroup = null;
        this._pedestal = null;
        this._pedestalOutline = null;
        this._particles = [];
        this._introLights = [];

        // Scene refs
        this._scene = null;
        this._camera = null;
        this._onComplete = null;
        this._towerType = null;

        // Input handler
        this._onDismiss = this._handleDismiss.bind(this);
    }

    /**
     * Check if the given wave number has a tower intro.
     * @param {number} waveNumber
     * @returns {string|null} Tower type key or null
     */
    static getIntroTowerType(waveNumber) {
        return TOWER_INTRO_WAVE_MAP[waveNumber] || null;
    }

    /**
     * Start the tower introduction intermission.
     * @param {string} towerType - Key into TOWER_INTRO_DATA
     * @param {THREE.Mesh} towerMesh - Pre-built tower mesh from _createTowerMesh()
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     * @param {Array} windowPositions - Available window positions for drone entry
     * @param {Function} onComplete - Called when intermission ends
     */
    activate(towerType, towerMesh, scene, camera, windowPositions, onComplete) {
        if (this.active) this.deactivate();

        this.active = true;
        this._phase = 'entering';
        this._timer = 0;
        if (window.SFX) SFX.play('intro_reveal');
        this._inputEnabled = false;
        this._scene = scene;
        this._camera = camera;
        this._onComplete = onComplete;
        this._towerType = towerType;

        // ── Background dim ──
        this._createDimPlane();

        // ── Create drone with sign ──
        this._createDroneWithSign(towerType, windowPositions);

        // ── Set up tower model on pedestal ──
        this._createTowerDisplay(towerType, towerMesh);

        // ── Dedicated intro lighting ──
        this._createIntroLights();

        // ── Tap text (hidden initially) ──
        const tapEl = _ensureTapTextElement();
        tapEl.style.opacity = '0';

        // ── Input listeners ──
        window.addEventListener('click', this._onDismiss);
        window.addEventListener('touchstart', this._onDismiss);
        window.addEventListener('keydown', this._onDismiss);
    }

    _createDimPlane() {
        const geo = new THREE.PlaneGeometry(200, 200);
        const mat = new THREE.MeshBasicMaterial({
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.35,
            depthTest: true,
            depthWrite: false,
            fog: false,
            side: THREE.DoubleSide,
        });
        this._dimPlane = new THREE.Mesh(geo, mat);
        this._dimPlane.renderOrder = DIM_RENDER_ORDER;

        const cam = this._camera;
        const dir = new THREE.Vector3();
        cam.getWorldDirection(dir);
        this._dimPlane.position.copy(cam.position).add(dir.multiplyScalar(25));
        this._dimPlane.lookAt(cam.position);

        this._scene.add(this._dimPlane);
    }

    _createIntroLights() {
        const keyLight = new THREE.PointLight(0xfff0d0, 0.6, 25, 1);
        keyLight.position.set(0, 34, -2);
        this._scene.add(keyLight);
        this._introLights.push(keyLight);

        const fillLight = new THREE.PointLight(0xfff0d0, 0.3, 20, 1);
        fillLight.position.set(5, 28, 2);
        this._scene.add(fillLight);
        this._introLights.push(fillLight);
    }

    _createDroneWithSign(towerType, windowPositions) {
        const fakeUpgrade = { name: '', rarity: 'common', icon: 'star', description: '' };
        this._drone = createUpgradeDrone(fakeUpgrade, 0);

        // Replace placard texture with tower intro sign
        const signTexture = _createTowerSignTexture(towerType);
        this._signTexture = signTexture;

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

        // Scale up sign for intro
        const signGroup = this._drone.userData.signGroup;
        if (signGroup) {
            signGroup.scale.set(1.8, 1.8, 1.8);
        }

        _setRenderOrder(this._drone, INTRO_RENDER_ORDER);

        // Flight path
        const hoverPos = new THREE.Vector3(-3.5, 28, 3);
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

    _createTowerDisplay(towerType, towerMesh) {
        const displayScale = TOWER_DISPLAY_SCALES[towerType] || 1.5;

        // Wrap in a group for positioning
        this._towerGroup = new THREE.Group();
        this._towerGroup.add(towerMesh);
        this._towerGroup.position.set(3.5, 23, 4);
        this._towerGroup.scale.setScalar(0); // Start at 0, will pop in

        // Scale the tower mesh itself
        towerMesh.scale.setScalar(displayScale);

        // Face camera
        this._towerGroup.rotation.y = Math.PI;

        _setRenderOrder(this._towerGroup, INTRO_RENDER_ORDER);
        this._scene.add(this._towerGroup);

        // Pedestal
        const pedR = displayScale * 0.5;
        const pedH = 0.3;
        const pedGeo = new THREE.CylinderGeometry(pedR, pedR, pedH, 24);
        const pedMat = toonMat(PALETTE.cream);
        this._pedestal = new THREE.Mesh(pedGeo, pedMat);
        this._pedestal.position.set(3.5, 23 - pedH / 2, 4);
        this._pedestal.scale.setScalar(0);
        this._pedestal.renderOrder = INTRO_RENDER_ORDER;
        this._scene.add(this._pedestal);

        // Pedestal outline
        const outGeo = new THREE.CylinderGeometry(pedR + 0.03, pedR + 0.03, pedH + 0.03, 24);
        this._pedestalOutline = new THREE.Mesh(outGeo, outlineMatStatic(0.03));
        this._pedestalOutline.position.copy(this._pedestal.position);
        this._pedestalOutline.scale.setScalar(0);
        this._pedestalOutline.renderOrder = INTRO_RENDER_ORDER;
        this._scene.add(this._pedestalOutline);
    }

    _spawnTowerParticles() {
        const data = TOWER_INTRO_DATA[this._towerType];
        const color = data.color;
        const center = new THREE.Vector3(3.5, 24.5, 4);

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

            if (this._timer >= INPUT_ENABLE_DELAY && !this._inputEnabled) {
                this._inputEnabled = true;
                const tapEl = _tapTextEl;
                if (tapEl) {
                    tapEl.style.opacity = '1';
                    tapEl.style.animation = 'towerIntroPulse 1.2s ease-in-out infinite';
                    this._ensurePulseCSS();
                }
            }

            if (this._timer >= ENTRY_DURATION) {
                this._phase = 'display';

                const ud = this._drone.userData;
                if (ud.state !== 'hovering') {
                    ud.state = 'hovering';
                    this._drone.position.copy(ud.targetPos);
                    this._drone.rotation.set(0, 0, 0);
                }
            }
        }

        // ── Phase 2: Display (waits for input) ──

        // ── Phase 3: Exit ──
        if (this._phase === 'exiting') {
            this._updateExit(dt);
        }

        // ── Always: update drone, tower turntable, particles ──
        this._updateDrone(dt);
        this._updateTowerModel(dt);
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

            const rawVel = ud.prevPos ? pos.clone().sub(ud.prevPos) : new THREE.Vector3();
            if (!ud._smoothVel) ud._smoothVel = rawVel.clone();
            ud._smoothVel.lerp(rawVel, 0.15);

            this._drone.position.copy(pos);
            ud._externalAccel = -ud._smoothVel.x * 3.0;

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

        // Tower model pop-in
        if (this._towerGroup && this._timer >= TOWER_APPEAR_DELAY) {
            const towerT = this._timer - TOWER_APPEAR_DELAY;
            if (towerT < TOWER_POP_DUR) {
                const t = towerT / TOWER_POP_DUR;
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                this._towerGroup.scale.setScalar(eased * 1.1);
            } else if (towerT < TOWER_POP_DUR + TOWER_SETTLE_DUR) {
                const t = (towerT - TOWER_POP_DUR) / TOWER_SETTLE_DUR;
                this._towerGroup.scale.setScalar(1.1 - t * 0.1);
            } else {
                this._towerGroup.scale.setScalar(1.0);
            }
        }

        // Pedestal fade in
        if (this._pedestal && this._timer >= PEDESTAL_FADE_DELAY) {
            const pedT = Math.min(1, (this._timer - PEDESTAL_FADE_DELAY) / 0.4);
            this._pedestal.scale.setScalar(pedT);
            this._pedestalOutline.scale.setScalar(pedT);
        }

        // Particle burst
        if (this._timer >= PARTICLE_BURST_DELAY && this._particles.length === 0 && this._phase === 'entering') {
            this._spawnTowerParticles();
        }
    }

    // ─── DRONE UPDATE ───────────────────────────────────────────────────

    _updateDrone(dt) {
        if (!this._drone) return;
        updateUpgradeDrone(this._drone, dt);

        const signGroup = this._drone.userData.signGroup;
        if (signGroup && this._camera) {
            const wPos = new THREE.Vector3();
            signGroup.getWorldPosition(wPos);
            const awayFromCamera = wPos.clone().multiplyScalar(2).sub(this._camera.position);
            signGroup.lookAt(awayFromCamera);
        }
    }

    // ─── TOWER MODEL UPDATE (turntable only — no animation) ─────────────

    _updateTowerModel(dt) {
        if (!this._towerGroup) return;

        // Turntable rotation
        if (this._phase !== 'exiting') {
            this._towerGroup.rotation.y += 0.3 * dt;
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

        window.removeEventListener('click', this._onDismiss);
        window.removeEventListener('touchstart', this._onDismiss);
        window.removeEventListener('keydown', this._onDismiss);

        if (_tapTextEl) _tapTextEl.style.opacity = '0';

        if (this._drone) {
            const ud = this._drone.userData;
            ud.state = 'exiting';

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
        const exitT = this._timer;

        // Drone exit flight
        if (this._drone) {
            const ud = this._drone.userData;
            if (ud._exitCurve) {
                ud._exitProgress += dt / EXIT_DURATION;
                const t = Math.min(1, ud._exitProgress);
                const et = t * t;

                const pos = new THREE.Vector3();
                ud._exitCurve.getPoint(et, pos);
                this._drone.position.copy(pos);

                this._drone.rotation.x = -t * 0.3;
            }
        }

        // Tower model: spin + scale to 0
        if (this._towerGroup) {
            const t = Math.min(1, exitT / TOWER_EXIT_DUR);
            this._towerGroup.rotation.y += dt * 8;
            this._towerGroup.scale.setScalar(Math.max(0, 1 - t));
        }

        // Pedestal fade
        if (this._pedestal) {
            const t = Math.min(1, exitT / TOWER_EXIT_DUR);
            this._pedestal.scale.setScalar(Math.max(0, 1 - t));
            this._pedestalOutline.scale.setScalar(Math.max(0, 1 - t));
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
        if (!this.active && !this._drone && !this._towerGroup) return;

        this.active = false;
        this._phase = 'idle';
        this._inputEnabled = false;

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

        // Clean up tower model
        if (this._towerGroup && this._scene) {
            this._scene.remove(this._towerGroup);
            this._towerGroup.traverse(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else if (child.material) {
                        child.material.dispose();
                    }
                }
            });
            this._towerGroup = null;
        }

        // Clean up pedestal
        if (this._pedestal && this._scene) {
            this._scene.remove(this._pedestal);
            this._pedestal.geometry.dispose();
            this._pedestal.material.dispose();
            this._pedestal = null;
        }
        if (this._pedestalOutline && this._scene) {
            this._scene.remove(this._pedestalOutline);
            this._pedestalOutline.geometry.dispose();
            this._pedestalOutline.material.dispose();
            this._pedestalOutline = null;
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
        this._towerType = null;
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
        if (document.getElementById('tower-intro-pulse-style')) return;
        const style = document.createElement('style');
        style.id = 'tower-intro-pulse-style';
        style.textContent = `
            @keyframes towerIntroPulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1.0; }
            }
        `;
        document.head.appendChild(style);
    }
}

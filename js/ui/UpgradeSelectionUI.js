// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Selection UI                                        ║
// ║  Orchestrates Stage 3 (interaction/selection) and Stage 4 (game phase).   ║
// ║  Hover detection, selection ceremonies, rejected-drone exits, dimming.    ║
// ║  Card-drop animation flies chosen upgrade to bottom-left HUD.            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { toonMat } from '../shaders/toonMaterials.js';
import { draw3DUpgradeIcon } from './UpgradeIconRenderer.js';
import { t } from '../i18n.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const HOVER_RISE = 0.3;           // Hovered drone rises this many units
const DIM_BRIGHTNESS = 0.7;       // Non-hovered drones dim to this
const HOVER_EXTRA_TILT = 0.1;     // Extra tilt toward camera when hovered

// Scratch vectors — reused every frame to avoid GC pressure during animations
const _scratchPos = new THREE.Vector3();
const _scratchAhead = new THREE.Vector3();
const _scratchDir = new THREE.Vector3();

// Selection animation durations (seconds)
const COMMON_SELECT_DUR = 0.6;
const RARE_SELECT_DUR = 0.9;
const LEGENDARY_SELECT_DUR = 1.4;
const REJECTED_EXIT_DUR = 1.5;
const REJECTED_STAGGER = 0.2;

// Slowmo
const LEGENDARY_SLOWMO_DUR = 0.5;
const RARE_SLOWMO_DUR = 0.15;

// Presenting phase (chosen drone close-up)
const PRESENT_FLY_DUR = 0.8;      // Fly to close-up position
const PRESENT_WAIT_DUR = 1.5;     // Hold close-up before card drop

// Card drop animation
const CARD_DROP_DUR = 0.9;        // Card flight to HUD duration

// Card drop display dimensions
const CARD_DROP_W = 360;
const CARD_DROP_H = 293;

// ─── UPGRADE STAT PREVIEW LOOKUP ─────────────────────────────────────────────

const UPGRADE_STAT_PREVIEWS = {
    // Common upgrades
    C1:  [{ label: 'Magnet Range', text: '+12', beneficial: true }, { label: 'Magnet HP', text: '+2', beneficial: true }],
    C2:  [{ label: 'Coin Value', text: '+50%', beneficial: true }],
    C3:  [{ label: 'Magnet HP', text: '+5', beneficial: true }, { label: 'Pull Speed', text: '+10%', beneficial: true }],
    C4:  [{ label: 'Sign HP', text: '+120%', beneficial: true }],
    C5:  [{ label: 'Sign Slow', text: '15% speed', beneficial: true }],
    C6:  [{ label: 'Bash DMG', text: '10 per hit', beneficial: true }],
    C7:  [{ label: 'Mop Arc', text: '180\u00B0', beneficial: true }, { label: 'Mop DMG', text: '+15%', beneficial: true }],
    C8:  [{ label: 'Mop Cooldown', text: '-30%', beneficial: true }],
    C9:  [{ label: 'Mop Knockback', text: '+75%', beneficial: true }],
    C10: [{ label: 'Mop HP', text: '+4', beneficial: true }],
    C11: [{ label: 'Ubik Range', text: '2\u00D7', beneficial: true }, { label: 'Ubik DMG', text: '+35%', beneficial: true }],
    C12: [{ label: 'Ubik Arc', text: '+80%', beneficial: true }],
    C13: [{ label: 'Ubik DMG', text: '+40%', beneficial: true }],
    C14: [{ label: 'Ubik Cooldown', text: '-25%', beneficial: true }],
    C15: [{ label: 'Pot Stun', text: '+0.5s', beneficial: true }],
    C16: [{ label: 'Pot DPS', text: '3+', beneficial: true }, { label: 'Pot Slow', text: '15%', beneficial: true }],
    C17: [{ label: 'Tower DMG', text: '+50%', beneficial: true }, { label: 'Tower HP', text: '-50%', beneficial: false }],
    C18: [{ label: 'Tower DMG', text: '+70%', beneficial: true }, { label: 'Attack Speed', text: '-40%', beneficial: false }],
    C19: [{ label: 'Pot Cost', text: '0 coins', beneficial: true }, { label: 'Pot HP', text: '2', beneficial: false }],
    C20: [{ label: 'Zap DMG', text: '8+', beneficial: true }, { label: 'Shock Buff', text: '+35% taken', beneficial: true }],
    // Rare upgrades
    R1:  [{ label: 'Soak Mult', text: '2\u00D7 Ubik on slowed', beneficial: true }],
    R2:  [{ label: 'Mop Attack', text: 'AoE stun 1.2s', beneficial: true }],
    R3:  [{ label: 'Mop Attack', text: '+15% per Magnet', beneficial: true }],
    R4:  [{ label: 'Pot Slide', text: '2.5\u00D7 further', beneficial: true }, { label: 'Pot DPS', text: '+50%', beneficial: true }],
    R5:  [{ label: 'Big Coin Chance', text: '15% on collect', beneficial: true }],
    R6:  [{ label: 'Sign HP', text: 'shared', beneficial: true }],
    R7:  [{ label: 'Mop DMG', text: '+8 in spray', beneficial: true }],
    R8:  [{ label: 'Pot Slide', text: 'pulled to Magnet', beneficial: true }],
    R9:  [{ label: 'Puddle Slow', text: '40% for 3s', beneficial: true }],
    R10: [{ label: 'Chain Range', text: '3 units', beneficial: true }],
    R11: [{ label: 'Overkill Coins', text: '+5 on 5+ hit', beneficial: true }],
    R12: [{ label: 'Coin Drop', text: '+50% near Magnets', beneficial: true }],
    R13: [{ label: 'Big Coin Chance', text: '15%', beneficial: true }, { label: 'Big Coin Value', text: '3\u00D7', beneficial: true }],
    R14: [{ label: 'Tower Cost', text: '-20%', beneficial: true }],
    R15: [{ label: 'Tower Cost', text: '50% refund on destroy', beneficial: true }],
    R16: [{ label: 'Crossfire DMG', text: '+40% multi-hit', beneficial: true }],
    R17: [{ label: 'Soak Mult', text: '+40% on slowed', beneficial: true }],
    R18: [{ label: 'Crowd DMG', text: '+30% in groups', beneficial: true }],
    R19: [{ label: 'Overkill Coins', text: '1 per 5 excess', beneficial: true }],
    R20: [{ label: 'Burst Radius', text: '3 units', beneficial: true }, { label: 'Burst DMG', text: '8', beneficial: true }],
    R21: [{ label: 'Empty Slot Bonus', text: '+15% per type', beneficial: true }],
    R22: [{ label: 'Sell Refund', text: '100%', beneficial: true }],
    R23: [{ label: 'Tower DMG', text: '+60% chosen', beneficial: true }, { label: 'Tower Cost', text: '-30% chosen', beneficial: true }],
    R24: [{ label: 'Max Towers', text: '6', beneficial: false }, { label: 'Empty Slot Bonus', text: '+25% each', beneficial: true }],
    R25: [{ label: 'Wave Bonus', text: '+5% of coins', beneficial: true }],
    R26: [{ label: 'Burst Radius', text: '5 units', beneficial: true }, { label: 'Self DMG', text: '-5% toilet HP', beneficial: false }],
    R27: [{ label: 'Attack Speed', text: '+40%', beneficial: true }, { label: 'Self DMG', text: '2 per attack', beneficial: false }],
    R28: [{ label: 'Front DMG', text: '+50%', beneficial: true }, { label: 'Back DMG', text: '-30%', beneficial: false }],
    R29: [{ label: 'Slow Spread', text: '4 units at 50%', beneficial: true }],
    R30: [{ label: 'Damage Share', text: '8% in 4 units', beneficial: true }],
    R31: [{ label: 'Early DMG', text: '2.5\u00D7 for 3s', beneficial: true }, { label: 'Late DMG', text: '-25%', beneficial: false }],
    R32: [{ label: 'Damage Ramp', text: '+4%/s up to +50%', beneficial: true }],
    R33: [{ label: 'Soak Mult', text: '\u00D71.5 on mop hit', beneficial: true }],
    R34: [{ label: 'Cracked Mult', text: '\u00D71.4 on trip', beneficial: true }],
    R35: [{ label: 'Coin Generation', text: '+1% DMG per coin', beneficial: true }],
    // Legendary upgrades
    L1:  [{ label: 'Door HP', text: '+4 max', beneficial: true }],
    L2:  [{ label: 'Low HP DMG', text: '2\u00D7 below 50%', beneficial: true }],
    L3:  [{ label: 'Attack Speed', text: '3\u00D7 on door hit', beneficial: true }],
    L4:  [{ label: 'Collision Stun', text: '0.8s + 4 DMG', beneficial: true }],
    L5:  [{ label: 'Chain Range', text: 'trip chains', beneficial: true }],
    L6:  [{ label: 'Puddle Slow', text: '25%', beneficial: true }, { label: 'Puddle Duration', text: '4s', beneficial: true }],
    L7:  [{ label: 'Pot Stun', text: '0.5s coin trip', beneficial: true }],
    L8:  [{ label: 'Mop Knockback', text: '3x', beneficial: true }],
    L9:  [{ label: 'Ubik DMG', text: 'zone 1+ DPS', beneficial: true }],
    L10: [{ label: 'Coin Generation', text: '1 per 5s', beneficial: true }],
    L11: [{ label: 'Burst Radius', text: '5 units', beneficial: true }, { label: 'Burst DMG', text: '25% max HP', beneficial: true }],
    L12: [{ label: 'Early DMG', text: '2\u00D7 speed 3s', beneficial: true }],
    L13: [{ label: 'Max Towers', text: '4', beneficial: false }, { label: 'Tower DMG', text: '2\u00D7', beneficial: true }],
    L14: [{ label: 'Coin Generation', text: '+10% per 50 coins', beneficial: true }],
    L15: [{ label: 'Chain Range', text: '12 units', beneficial: true }],
    L16: [{ label: 'Instant Coins', text: '+60', beneficial: true }, { label: 'Wave Bonus', text: '-50%', beneficial: false }],
    L17: [{ label: 'Row Bonus', text: '+20% per adj.', beneficial: true }],
    L18: [{ label: 'Low HP DMG', text: '3\u00D7 at 1 HP', beneficial: true }],
};

// Map stat label English text → i18n key
const STAT_LABEL_KEYS = {
    'Magnet Range': 'upgrade.stat.magnetRange',
    'Magnet HP': 'upgrade.stat.magnetHP',
    'Coin Value': 'upgrade.stat.coinValue',
    'Sign HP': 'upgrade.stat.signHP',
    'Sign Slow': 'upgrade.stat.signSlow',
    'Bash DMG': 'upgrade.stat.bashDMG',
    'Mop Arc': 'upgrade.stat.mopArc',
    'Mop DMG': 'upgrade.stat.mopDMG',
    'Mop Cooldown': 'upgrade.stat.mopCooldown',
    'Mop Knockback': 'upgrade.stat.mopKnockback',
    'Mop HP': 'upgrade.stat.mopHP',
    'Ubik Cooldown': 'upgrade.stat.ubikCooldown',
    'Pot Stun': 'upgrade.stat.potStun',
    'Tower DMG': 'upgrade.stat.towerDMG',
    'Tower HP': 'upgrade.stat.towerHP',
    'Pot Cost': 'upgrade.stat.potCost',
    'Pot HP': 'upgrade.stat.potHP',
    'Coin Drop': 'upgrade.stat.coinDrop',
    'Tower Cost': 'upgrade.stat.towerCost',
    'Sell Refund': 'upgrade.stat.sellRefund',
    'Door HP': 'upgrade.stat.doorHP',
    'Collision Stun': 'upgrade.stat.collisionStun',
    // New stat labels
    'Pull Speed': 'upgrade.stat.pullSpeed',
    'Ubik Range': 'upgrade.stat.ubikRange',
    'Ubik Arc': 'upgrade.stat.ubikArc',
    'Ubik DMG': 'upgrade.stat.ubikDMG',
    'Pot DPS': 'upgrade.stat.potDPS',
    'Pot Slow': 'upgrade.stat.potSlow',
    'Pot Slide': 'upgrade.stat.potSlide',
    'Attack Speed': 'upgrade.stat.attackSpeed',
    'Zap DMG': 'upgrade.stat.zapDMG',
    'Shock Buff': 'upgrade.stat.shockBuff',
    'Soak Mult': 'upgrade.stat.soakMult',
    'Mop Attack': 'upgrade.stat.mopAttack',
    'Big Coin Chance': 'upgrade.stat.bigCoinChance',
    'Big Coin Value': 'upgrade.stat.bigCoinValue',
    'Puddle Slow': 'upgrade.stat.puddleSlow',
    'Chain Range': 'upgrade.stat.chainRange',
    'Overkill Coins': 'upgrade.stat.overkillCoins',
    'Crossfire DMG': 'upgrade.stat.crossfireDMG',
    'Crowd DMG': 'upgrade.stat.crowdDMG',
    'Burst Radius': 'upgrade.stat.burstRadius',
    'Burst DMG': 'upgrade.stat.burstDMG',
    'Empty Slot Bonus': 'upgrade.stat.emptySlotBonus',
    'Max Towers': 'upgrade.stat.maxTowers',
    'Wave Bonus': 'upgrade.stat.waveBonus',
    'Self DMG': 'upgrade.stat.selfDMG',
    'Front DMG': 'upgrade.stat.frontDMG',
    'Back DMG': 'upgrade.stat.backDMG',
    'Slow Spread': 'upgrade.stat.slowSpread',
    'Damage Share': 'upgrade.stat.damageShare',
    'Damage Ramp': 'upgrade.stat.damageRamp',
    'Early DMG': 'upgrade.stat.earlyDMG',
    'Late DMG': 'upgrade.stat.lateDMG',
    'Cracked Mult': 'upgrade.stat.crackedMult',
    'Coin Generation': 'upgrade.stat.coinGeneration',
    'Low HP DMG': 'upgrade.stat.lowHPDMG',
    'Puddle Duration': 'upgrade.stat.puddleDuration',
    'Instant Coins': 'upgrade.stat.instantCoins',
    'Row Bonus': 'upgrade.stat.rowBonus',
};

function _getUpgradeStatPreview(upgrade) {
    if (!upgrade || !upgrade.id) return [];
    const stats = UPGRADE_STAT_PREVIEWS[upgrade.id];
    if (!stats) return [];
    return stats.map(s => ({
        ...s,
        label: STAT_LABEL_KEYS[s.label] ? t(STAT_LABEL_KEYS[s.label]) : s.label,
    }));
}

// ─── SCREEN FLASH OVERLAY ───────────────────────────────────────────────────

let _flashEl = null;

function _ensureFlashElement() {
    if (_flashEl) return _flashEl;
    _flashEl = document.createElement('div');
    _flashEl.id = 'upgrade-screen-flash';
    _flashEl.style.cssText = `
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 90;
        background: var(--pal-gold, #ffd93d);
        opacity: 0;
        transition: opacity 0.08s;
    `;
    document.body.appendChild(_flashEl);
    return _flashEl;
}

function _screenFlash(duration, color, opacity) {
    const el = _ensureFlashElement();
    if (color) el.style.background = color;
    el.style.transition = 'none';
    el.style.opacity = String(opacity || 0.6);
    void el.offsetWidth;
    el.style.transition = `opacity ${duration}s`;
    el.style.opacity = '0';
}

// ─── SHOCKWAVE RING (expanding torus in 3D) ─────────────────────────────────

function _spawnShockwaveRing(scene, position, color, maxRadius, duration) {
    const ringGeo = new THREE.TorusGeometry(1, 0.06, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.rotation.x = Math.PI / 2; // Flat horizontal
    scene.add(ring);
    return {
        mesh: ring,
        life: duration,
        maxLife: duration,
        maxRadius: maxRadius,
    };
}

// ─── CONFETTI BURST (varied shapes with spin) ───────────────────────────────

let _confettiGeos = null;
function _getConfettiGeos() {
    if (!_confettiGeos) {
        _confettiGeos = [
            new THREE.PlaneGeometry(0.12, 0.12),
            new THREE.PlaneGeometry(0.08, 0.16),
            new THREE.BoxGeometry(0.06, 0.06, 0.06),
        ];
    }
    return _confettiGeos;
}

function _spawnConfettiBurst(scene, position, colors, count, speed, lifetime) {
    const particles = [];
    const geos = _getConfettiGeos();
    for (let i = 0; i < count; i++) {
        const geo = geos[Math.floor(Math.random() * geos.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = _getBasicMat(color);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        scene.add(mesh);

        const angle = Math.random() * Math.PI * 2;
        const upAngle = Math.random() * Math.PI * 0.5;
        const spd = speed * (0.6 + Math.random() * 0.8);
        particles.push({
            mesh,
            vx: Math.cos(angle) * Math.cos(upAngle) * spd,
            vy: Math.sin(upAngle) * spd + 3,
            vz: Math.sin(angle) * Math.cos(upAngle) * spd,
            spinX: (Math.random() - 0.5) * 12,
            spinY: (Math.random() - 0.5) * 12,
            spinZ: (Math.random() - 0.5) * 12,
            life: lifetime * (0.5 + Math.random() * 0.5),
            maxLife: lifetime,
            isConfetti: true,
        });
    }
    return particles;
}

// ─── DIM OVERLAY ────────────────────────────────────────────────────────────

let _dimEl = null;

function _ensureDimElement() {
    if (_dimEl) return _dimEl;
    _dimEl = document.createElement('div');
    _dimEl.id = 'upgrade-dim-overlay';
    _dimEl.style.cssText = `
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 5;
        background: rgba(26, 26, 46, 0.4);
        opacity: 0;
        transition: opacity 0.5s;
    `;
    document.body.appendChild(_dimEl);
    return _dimEl;
}

// ─── SHARED PARTICLE GEOMETRY & MATERIAL POOLS ─────────────────────────────

let _particleGeoSmall = null;
let _particleGeoLarge = null;
function getParticleGeoSmall() {
    if (!_particleGeoSmall) _particleGeoSmall = new THREE.SphereGeometry(0.08, 4, 4);
    return _particleGeoSmall;
}
function getParticleGeoLarge() {
    if (!_particleGeoLarge) _particleGeoLarge = new THREE.SphereGeometry(0.12, 4, 4);
    return _particleGeoLarge;
}

// Material pool keyed by color hex — each particle gets its own clone for
// independent opacity, but cloning is far cheaper than full material creation
const _basicMatPool = {};
function _getBasicMat(color) {
    const key = typeof color === 'number' ? color : (color.getHex ? color.getHex() : color);
    if (!_basicMatPool[key]) {
        _basicMatPool[key] = new THREE.MeshBasicMaterial({
            color: key,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
    }
    return _basicMatPool[key].clone();
}

const _toonMatPool = {};
function _getToonParticleMat(color) {
    const key = typeof color === 'number' ? color : (color.getHex ? color.getHex() : color);
    if (!_toonMatPool[key]) {
        _toonMatPool[key] = toonMat(key, {
            emissive: key,
            emissiveIntensity: 0.5,
        });
    }
    return _toonMatPool[key].clone();
}

const _toonGoldMatPool = {};
function _getToonGoldMat(color) {
    const key = typeof color === 'number' ? color : (color.getHex ? color.getHex() : color);
    if (!_toonGoldMatPool[key]) {
        _toonGoldMatPool[key] = toonMat(key, {
            emissive: key,
            emissiveIntensity: 0.6,
        });
    }
    return _toonGoldMatPool[key].clone();
}

// ─── PARTICLE BURST SYSTEM ──────────────────────────────────────────────────

function _spawnParticleBurst(scene, position, color, count, speed, lifetime) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const geo = getParticleGeoSmall();
        const mat = _getToonParticleMat(color);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        scene.add(mesh);

        const angle = Math.random() * Math.PI * 2;
        const upAngle = Math.random() * Math.PI * 0.6 - Math.PI * 0.1;
        const spd = speed * (0.6 + Math.random() * 0.8);
        particles.push({
            mesh,
            vx: Math.cos(angle) * Math.cos(upAngle) * spd,
            vy: Math.sin(upAngle) * spd + 2,
            vz: Math.sin(angle) * Math.cos(upAngle) * spd,
            life: lifetime * (0.5 + Math.random() * 0.5),
            maxLife: lifetime,
        });
    }
    return particles;
}

function _spawnGoldShower(scene, cameraPos, count) {
    const particles = [];
    const spread = 20;
    for (let i = 0; i < count; i++) {
        const geo = getParticleGeoLarge();
        const mat = _getToonGoldMat(PALETTE.gold);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            cameraPos.x + (Math.random() - 0.5) * spread,
            cameraPos.y + 5 + Math.random() * 3,
            cameraPos.z + 10 + Math.random() * 5
        );
        scene.add(mesh);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 2,
            vy: -(3 + Math.random() * 4),
            vz: (Math.random() - 0.5) * 2,
            life: 1.5 + Math.random() * 0.5,
            maxLife: 2.0,
        });
    }
    return particles;
}

// ─── UPGRADE SELECTION UI CLASS ─────────────────────────────────────────────

export class UpgradeSelectionUI {
    constructor() {
        this.active = false;          // True during upgrade selection phase
        this.drones = [];             // Array of drone THREE.Groups
        this.options = [];            // Array of upgrade data objects
        this.hoveredIndex = -1;       // Which drone is hovered (-1 = none)
        this.selectedIndex = -1;      // Which drone was clicked
        this.phase = 'idle';          // idle | choosing | selecting | presenting | cardDrop | done

        // Selection animation state
        this._selectTimer = 0;
        this._selectDuration = 0;

        // Particles
        this._particles = [];

        // Ambient dimming
        this._savedAmbientIntensity = 0.7;
        this._ambientLight = null;

        // Camera zoom-punch
        this._zoomPunch = 0;
        this._zoomPunchVel = 0;

        // Screen shake
        this._shakeTimer = 0;
        this._shakeIntensity = 0;

        // Shockwave rings
        this._shockwaves = [];

        // Saturation punch
        this._satPunch = 0;
        this._satPunchVel = 0;

        // Slowmo
        this._slowmoTimer = 0;

        // Presenting phase
        this._presentWaiting = false;
        this._presentWaitTimer = 0;

        // Card drop
        this._cardDropEl = null;
        this._cardDropProgress = 0;
        this._cardDropStart = null;
        this._cardDropTarget = null;

        // Raycasting
        this._raycaster = new THREE.Raycaster();
        this._mouseNDC = new THREE.Vector2();

        // Bound handlers (for cleanup)
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onClick = this._handleClick.bind(this);

        // Gamepad hover flag — when true, skip raycaster-based hover
        this._gamepadHoverActive = false;
    }

    // ─── ACTIVATE (enter upgrade selection phase) ─────────────────────────

    /**
     * Start the upgrade selection phase.
     * @param {THREE.Group[]} drones - Drone meshes (already in scene, hovering)
     * @param {Object[]} options - Upgrade data objects matching drones
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     */
    activate(drones, options, scene, camera) {
        this.active = true;
        this.drones = drones;
        this.options = options;
        this.hoveredIndex = -1;
        this.selectedIndex = -1;
        this.phase = 'choosing';
        this._particles = [];
        this._zoomPunch = 0;
        this._zoomPunchVel = 0;
        this._slowmoTimer = 0;
        this._scene = scene;
        this._camera = camera;

        // Store each drone's base brightness and cache meshes for raycasting
        for (const drone of drones) {
            drone.userData._baseBrightness = 1.0;
            drone.userData._currentBrightness = 1.0;
            drone.userData._hoverRise = 0;
            // Skip expensive Sobel post-process during selection — icons still rotate
            // (inverted-hull outlines on 3D models are sufficient)
            drone.userData._iconSkipPostProcess = true;
            // Cache mesh array to avoid per-frame traverse in _updateHover
            const meshes = [];
            drone.traverse(child => { if (child.isMesh) meshes.push(child); });
            drone.userData._meshes = meshes;
        }

        // Dim background
        this._dimBackground(scene, true);

        // Add interaction listeners
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('click', this._onClick);
    }

    // ─── DEACTIVATE ───────────────────────────────────────────────────────

    deactivate() {
        this.active = false;
        this.phase = 'done';
        this.hoveredIndex = -1;
        this.selectedIndex = -1;
        this._gamepadHoverActive = false;

        // Remove listeners
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('click', this._onClick);

        // Restore background
        if (this._scene) {
            this._dimBackground(this._scene, false);
        }

        // Clean up particles
        this._cleanupParticles();

        // Clean up card drop element
        if (this._cardDropEl && this._cardDropEl.parentNode) {
            this._cardDropEl.parentNode.removeChild(this._cardDropEl);
            this._cardDropEl = null;
        }
    }

    // ─── MOUSE HANDLERS ──────────────────────────────────────────────────

    _handleMouseMove(e) {
        this._mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
        this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this._mouseScreenX = e.clientX;
        this._mouseScreenY = e.clientY;
    }

    _handleClick(e) {
        if (this.phase !== 'choosing' || this.hoveredIndex < 0) return;
        e.stopPropagation();
        this._selectDrone(this.hoveredIndex);
    }

    // ─── HOVER DETECTION (raycasting) ─────────────────────────────────────

    _updateHover() {
        if (this.phase !== 'choosing' || !this._camera || this.drones.length === 0) {
            if (this.hoveredIndex !== -1) {
                this.hoveredIndex = -1;
            }
            return;
        }

        // Skip raycasting when gamepad is driving hover
        if (this._gamepadHoverActive) return;

        this._raycaster.setFromCamera(this._mouseNDC, this._camera);

        // Collect all meshes from all drones for intersection
        let bestIndex = -1;
        let bestDist = Infinity;

        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            if (drone.userData.state !== 'hovering' && drone.userData.state !== 'settling') continue;

            const meshes = drone.userData._meshes || [];

            const hits = this._raycaster.intersectObjects(meshes, false);
            if (hits.length > 0 && hits[0].distance < bestDist) {
                bestDist = hits[0].distance;
                bestIndex = i;
            }
        }

        // Update hovered index
        if (bestIndex !== this.hoveredIndex) {
            this.hoveredIndex = bestIndex;
            document.body.style.cursor = bestIndex >= 0 ? 'pointer' : '';
            if (bestIndex >= 0 && window.SFX) SFX.play('drone_hover');
        }
    }

    // ─── GAMEPAD HOVER / SELECTION ──────────────────────────────────────

    setHoveredIndex(index) {
        const clamped = Math.max(-1, Math.min(this.drones.length - 1, index));
        if (clamped !== this.hoveredIndex) {
            this.hoveredIndex = clamped;
            if (clamped >= 0 && window.SFX) SFX.play('drone_hover');
        }
    }

    confirmSelection() {
        if (this.phase !== 'choosing' || this.hoveredIndex < 0) return;
        this._selectDrone(this.hoveredIndex);
    }

    // ─── HOVER FEEDBACK ──────────────────────────────────────────────────

    _applyHoverFeedback(dt) {
        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            const ud = drone.userData;
            if (ud.state !== 'hovering' && ud.state !== 'settling') continue;

            const isHovered = (i === this.hoveredIndex);

            // Smooth rise/fall
            const targetRise = isHovered ? HOVER_RISE : 0;
            ud._hoverRise = ud._hoverRise || 0;
            ud._hoverRise += (targetRise - ud._hoverRise) * Math.min(1, dt * 8);
            drone.position.y = ud.targetPos.y + (ud._hoverBob || 0) + ud._hoverRise;

            // Billboard sign to face camera, with extra tilt on hover
            if (ud.signGroup) {
                const baseTilt = this._computeCameraTilt(drone.position);
                const targetTilt = isHovered ? baseTilt + HOVER_EXTRA_TILT : baseTilt;
                ud.signGroup.rotation.x += (targetTilt - ud.signGroup.rotation.x) * Math.min(1, dt * 6);
            }

            // Brightness dimming
            const targetBright = isHovered ? 1.0 : (this.hoveredIndex >= 0 ? DIM_BRIGHTNESS : 1.0);
            ud._currentBrightness = ud._currentBrightness || 1.0;
            ud._currentBrightness += (targetBright - ud._currentBrightness) * Math.min(1, dt * 6);

            // Apply brightness to all toon materials on this drone
            if (Math.abs(ud._currentBrightness - (ud._lastAppliedBrightness || 1.0)) > 0.01) {
                this._applyBrightness(drone, ud._currentBrightness);
                ud._lastAppliedBrightness = ud._currentBrightness;
            }

            // Legendary hover ring pulse
            if (ud.rarity === 'legendary' && ud.orbitalRing && ud.ringMat) {
                if (isHovered) {
                    const pulseT = (ud.hoverTime || 0) * 6;
                    ud.ringMat.emissiveIntensity = 0.75 + Math.sin(pulseT) * 0.25;
                    const rs = 1.04 + Math.sin(pulseT) * 0.04;
                    ud.orbitalRing.scale.set(rs, rs, rs);
                } else {
                    ud.ringMat.emissiveIntensity = 0.5;
                    ud.orbitalRing.scale.set(1, 1, 1);
                }
            }
        }
    }

    _applyBrightness(drone, brightness) {
        const meshes = drone.userData._meshes || [];
        for (const child of meshes) {
            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                    if (mat.isMeshToonMaterial && mat.color) {
                        if (!mat._origColor) {
                            mat._origColor = mat.color.clone();
                        }
                        mat.color.copy(mat._origColor).multiplyScalar(brightness);
                    }
                }
            }
        }
    }

    // ─── CAMERA-FACING TILT ──────────────────────────────────────────────

    /**
     * Compute the X-axis tilt angle so a sign faces the camera from a given position.
     */
    _computeCameraTilt(dronePos) {
        if (!this._camera) return 0;
        const dx = this._camera.position.x - dronePos.x;
        const dy = this._camera.position.y - dronePos.y;
        const dz = this._camera.position.z - dronePos.z;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        return Math.atan2(dy, horizDist);
    }

    // ─── SELECTION ───────────────────────────────────────────────────────

    _selectDrone(index) {
        this.selectedIndex = index;
        this.phase = 'selecting';
        document.body.style.cursor = '';

        // Remove click/move listeners during animation
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('click', this._onClick);

        const drone = this.drones[index];
        const rarity = drone.userData.rarity;

        // Set selection duration
        if (rarity === 'legendary') {
            this._selectDuration = LEGENDARY_SELECT_DUR;
        } else if (rarity === 'rare') {
            this._selectDuration = RARE_SELECT_DUR;
        } else {
            this._selectDuration = COMMON_SELECT_DUR;
        }
        this._selectTimer = 0;

        // Mark selected drone
        drone.userData.state = 'selected';
        drone.userData._selectAnimTime = 0;

        // Restore brightness on all drones
        for (const d of this.drones) {
            this._applyBrightness(d, 1.0);
            d.userData._currentBrightness = 1.0;
        }

        // ─── Rarity-specific VFX ─────────────────────────────────────────
        const droneWorldPos = new THREE.Vector3();
        drone.getWorldPosition(droneWorldPos);

        if (rarity === 'common') {
            if (window.SFX) SFX.play('upgrade_common');
            // White sparkle burst
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, PALETTE.white, 12, 3, 0.5
            ));
        } else if (rarity === 'rare') {
            if (window.SFX) SFX.play('upgrade_rare');

            // Violet screen flash
            _screenFlash(0.2, '#9b8ec4', 0.35);

            // Colored particle burst — MORE particles
            const upgrade = this.options[index];
            const burstColor = upgrade.towerRequirement && upgrade.towerRequirement[0]
                ? this._getTowerColor(upgrade.towerRequirement[0])
                : PALETTE.rarityRare;
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, burstColor, 35, 5, 0.8
            ));

            // Confetti burst in rarity colors
            this._particles.push(..._spawnConfettiBurst(
                this._scene, droneWorldPos,
                [PALETTE.rarityRare, PALETTE.white, burstColor],
                15, 4, 1.0
            ));

            // Brief slowmo
            this._slowmoTimer = RARE_SLOWMO_DUR;

            // Zoom-punch (lighter than legendary)
            this._zoomPunch = 0;
            this._zoomPunchVel = 8;

            // Screen shake (light)
            this._shakeTimer = 0.12;
            this._shakeIntensity = 0.15;

            // Shockwave ring
            this._shockwaves.push(_spawnShockwaveRing(
                this._scene, droneWorldPos, PALETTE.rarityRare, 6, 0.6
            ));

            // Saturation punch
            this._satPunch = 0;
            this._satPunchVel = 0.4;

        } else if (rarity === 'legendary') {
            if (window.SFX) SFX.play('upgrade_legendary');

            // Double gold flash — first big, then a staggered follow-up
            _screenFlash(0.2, 'var(--pal-gold, #ffd93d)', 0.7);
            setTimeout(() => _screenFlash(0.25, '#fff0c0', 0.4), 120);

            // Massive gold particle shower from above
            this._particles.push(..._spawnGoldShower(
                this._scene, this._camera.position, 80
            ));

            // Gold confetti burst at drone
            this._particles.push(..._spawnConfettiBurst(
                this._scene, droneWorldPos,
                [PALETTE.gold, PALETTE.rarityLegendary, PALETTE.white, 0xffe066],
                30, 6, 1.4
            ));

            // Extra radial burst from drone
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, PALETTE.gold, 25, 5, 0.9
            ));

            // Slowmo — longer, more dramatic
            this._slowmoTimer = LEGENDARY_SLOWMO_DUR;

            // Zoom-punch — BIGGER
            if (window.SFX) SFX.play('zoom_punch');
            this._zoomPunch = 0;
            this._zoomPunchVel = 20;

            // Screen shake — strong rumble
            this._shakeTimer = 0.25;
            this._shakeIntensity = 0.3;

            // Expanding shockwave ring
            this._shockwaves.push(_spawnShockwaveRing(
                this._scene, droneWorldPos, PALETTE.gold, 10, 0.8
            ));
            // Staggered second ring
            setTimeout(() => {
                if (this._scene) {
                    this._shockwaves.push(_spawnShockwaveRing(
                        this._scene, droneWorldPos, PALETTE.glow, 8, 0.7
                    ));
                }
            }, 100);

            // Saturation punch (post-processing)
            this._satPunch = 0;
            this._satPunchVel = 0.8;

            // Make rejected drones droop/wobble
            for (let i = 0; i < this.drones.length; i++) {
                if (i === index) continue;
                const rd = this.drones[i].userData;
                rd._droopTimer = 0;
                rd._drooping = true;
            }
        }
    }

    _getTowerColor(towerType) {
        const map = {
            coinmagnet: PALETTE.magnet,
            wetfloor: PALETTE.sign,
            mop: PALETTE.mop,
            ubik: PALETTE.ubik,
            potplant: PALETTE.potplant,
        };
        return map[towerType] || PALETTE.rarityRare;
    }

    // ─── SELECTION ANIMATION UPDATE ─────────────────────────────────────

    _updateSelectionAnim(dt) {
        if (this.phase !== 'selecting') return;

        this._selectTimer += dt;
        const t = Math.min(1, this._selectTimer / this._selectDuration);

        const selDrone = this.drones[this.selectedIndex];
        const rarity = selDrone.userData.rarity;
        selDrone.userData._selectAnimTime += dt;

        // ─── Common: nod (quick dip + rise) ──────────────────────────────
        if (rarity === 'common') {
            const nodPhase = t * Math.PI * 2;
            const nodY = -Math.sin(nodPhase) * 0.3 * (1 - t);
            selDrone.position.y = selDrone.userData.targetPos.y + nodY;

            // Sign flash white then fade
            if (t < 0.3) {
                this._applyBrightness(selDrone, 1.0 + (1 - t / 0.3) * 0.5);
            }
        }

        // ─── Rare: victory spin (360 yaw) + sign flip ────────────────────
        if (rarity === 'rare') {
            // 360 degree yaw spin
            const spinT = Math.min(1, t / 0.7); // Complete spin in first 70% of duration
            const easedSpin = spinT < 0.5 ? 2 * spinT * spinT : 1 - Math.pow(-2 * spinT + 2, 2) / 2;
            selDrone.rotation.y = easedSpin * Math.PI * 2;

            // Sign flip
            if (selDrone.userData.signGroup) {
                selDrone.userData.signGroup.rotation.x = easedSpin * Math.PI * 2;
            }
        }

        // ─── Legendary: barrel roll ──────────────────────────────────────
        if (rarity === 'legendary') {
            const rollT = Math.min(1, t / 0.6);
            const easedRoll = rollT < 0.5 ? 2 * rollT * rollT : 1 - Math.pow(-2 * rollT + 2, 2) / 2;
            selDrone.rotation.z = easedRoll * Math.PI * 2;

            // Droop/wobble on rejected drones
            for (let i = 0; i < this.drones.length; i++) {
                if (i === this.selectedIndex) continue;
                const rd = this.drones[i];
                const rud = rd.userData;
                if (rud._drooping) {
                    rud._droopTimer += dt;
                    // Droop down
                    rd.position.y = rud.targetPos.y - Math.sin(rud._droopTimer * 3) * 0.2 - rud._droopTimer * 0.3;
                    // Wobble
                    rd.rotation.z = Math.sin(rud._droopTimer * 8) * 0.1;
                }
            }
        }

        // ─── Camera zoom-punch (rare + legendary) ────────────────────────
        if (rarity !== 'common') {
            // Spring-damped zoom
            const stiffness = 200;
            const dampFactor = 12;
            this._zoomPunchVel += (-this._zoomPunch * stiffness - this._zoomPunchVel * dampFactor) * dt;
            this._zoomPunch += this._zoomPunchVel * dt;
        }

        // ─── Transition to presenting phase ──────────────────────────────
        if (t >= 1) {
            this.phase = 'presenting';
            this._beginPresenting();
        }
    }

    // ─── PRESENTING PHASE (chosen drone close-up + rejected exits) ───────

    _beginPresenting() {
        this._presentWaiting = false;
        this._presentWaitTimer = 0;

        // --- Rejected drones exit to windows ---
        let staggerIdx = 0;
        for (let i = 0; i < this.drones.length; i++) {
            if (i === this.selectedIndex) continue;

            const drone = this.drones[i];
            drone.userData.state = 'exiting';
            if (staggerIdx === 0 && window.SFX) SFX.play('drone_reject');

            // Pick a random window to fly toward
            const game = window.Game;
            const windows = (game && game.windowPositions) || [];
            let target;
            if (windows.length > 0) {
                const win = windows[Math.floor(Math.random() * windows.length)];
                target = new THREE.Vector3(win.x + (win.x < 0 ? -12 : 12), 45, win.z);
            } else {
                target = new THREE.Vector3((Math.random() - 0.5) * 30, 45, 70);
            }

            // Build upward exit flight path (zip off-screen)
            const startPos = drone.position.clone();
            const midPoint = new THREE.Vector3(
                (startPos.x + target.x) / 2,
                startPos.y + 3, // Rise upward
                (startPos.z + target.z) / 2
            );

            drone.userData._exitCurve = new THREE.CatmullRomCurve3([
                startPos, midPoint, target,
            ], false, 'catmullrom', 0.3);
            drone.userData._exitProgress = 0;
            drone.userData._exitDelay = staggerIdx * REJECTED_STAGGER;
            staggerIdx++;
        }

        // --- Selected drone: fly to close-up position ---
        const selDrone = this.drones[this.selectedIndex];
        selDrone.userData.state = 'presenting';
        const startPos = selDrone.position.clone();

        // Calculate close-up: 9 units in front of camera along view direction
        const viewDir = new THREE.Vector3();
        this._camera.getWorldDirection(viewDir);
        const presentPos = this._camera.position.clone().add(viewDir.multiplyScalar(9));

        selDrone.userData._presentStartPos = startPos;
        selDrone.userData._presentTargetPos = presentPos;
        selDrone.userData._presentProgress = 0;

        // Reset rotations from selection ceremony
        selDrone.rotation.set(0, 0, 0);
    }

    _updatePresenting(dt) {
        if (this.phase !== 'presenting') return;

        // --- Update rejected drone exits ---
        for (let i = 0; i < this.drones.length; i++) {
            if (i === this.selectedIndex) continue;
            const drone = this.drones[i];
            const ud = drone.userData;
            if (ud.state !== 'exiting') continue;

            // Stagger delay
            if (ud._exitDelay > 0) {
                ud._exitDelay -= dt;
                continue;
            }

            ud._exitProgress += dt / REJECTED_EXIT_DUR;
            const t = Math.min(1, ud._exitProgress);
            const et = t * t; // Accelerating exit

            if (ud._exitCurve) {
                ud._exitCurve.getPoint(et, _scratchPos);
                drone.position.copy(_scratchPos);

                // Tilt in flight direction
                const lookAhead = Math.min(1, et + 0.05);
                ud._exitCurve.getPoint(lookAhead, _scratchAhead);
                _scratchDir.subVectors(_scratchAhead, _scratchPos);
                if (_scratchDir.length() > 0.001) {
                    drone.rotation.y = Math.atan2(_scratchDir.x, _scratchDir.z);
                    drone.rotation.x = -Math.min(0.3, _scratchDir.length() * 0.1);
                }
            }

            if (t >= 1) ud.state = 'done';
        }

        // --- Animate selected drone to close-up ---
        const selDrone = this.drones[this.selectedIndex];
        const selUd = selDrone.userData;

        if (selUd.state === 'presenting') {
            selUd._presentProgress += dt / PRESENT_FLY_DUR;
            const t = Math.min(1, selUd._presentProgress);
            // Ease-in-out
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            selDrone.position.lerpVectors(selUd._presentStartPos, selUd._presentTargetPos, et);

            // Smooth body rotation to zero
            selDrone.rotation.y *= 0.92;
            selDrone.rotation.x *= 0.92;
            selDrone.rotation.z *= 0.92;

            // Billboard sign toward camera during close-up
            if (selUd.signGroup) {
                const tilt = this._computeCameraTilt(selDrone.position);
                selUd.signGroup.rotation.x += (tilt - selUd.signGroup.rotation.x) * Math.min(1, dt * 6);
            }

            if (t >= 1 && !this._presentWaiting) {
                this._presentWaiting = true;
                this._presentWaitTimer = 0;
            }
        }

        // --- Wait before card drop ---
        if (this._presentWaiting) {
            this._presentWaitTimer += dt;
            if (this._presentWaitTimer >= PRESENT_WAIT_DUR) {
                this._beginCardDrop();
            }
        }
    }

    // ─── CARD DROP ANIMATION ─────────────────────────────────────────────

    _beginCardDrop() {
        this.phase = 'cardDrop';
        if (window.SFX) SFX.play('card_fly');

        const selDrone = this.drones[this.selectedIndex];
        const upgrade = this.options[this.selectedIndex];

        // Project sign center to screen coordinates
        const signWorldPos = new THREE.Vector3();
        selDrone.userData.signGroup.getWorldPosition(signWorldPos);
        signWorldPos.project(this._camera);
        const screenX = (signWorldPos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-signWorldPos.y * 0.5 + 0.5) * window.innerHeight;

        // Create floating DOM card at sign's screen position
        this._cardDropEl = this._createCardDropElement(upgrade, screenX, screenY);

        // Hide 3D sign
        selDrone.userData.signGroup.visible = false;

        // Target: bottom-left HUD area
        const hud = document.getElementById('upgrade-hud');
        let targetX, targetY;
        if (hud) {
            const rect = hud.getBoundingClientRect();
            // Target the next card slot
            const cardCount = hud.children.length;
            const col = Math.floor(cardCount / 6);
            const row = cardCount % 6;
            targetX = rect.left + col * 80 + 36;
            targetY = rect.bottom - row * 80 - 36;
        } else {
            // HUD not yet created — target bottom-left corner
            targetX = 16 + 36;
            targetY = window.innerHeight - 16 - 36;
        }

        this._cardDropStart = { x: screenX, y: screenY };
        this._cardDropTarget = { x: targetX, y: targetY };
        this._cardDropProgress = 0;

        selDrone.userData.state = 'cardDrop';

        // Set up exit flight curve for selected drone body
        const droneStart = selDrone.position.clone();
        const exitX = droneStart.x + (Math.random() - 0.5) * 10;
        const exitMid = new THREE.Vector3(
            (droneStart.x + exitX) / 2,
            droneStart.y + 5,
            droneStart.z
        );
        const exitEnd = new THREE.Vector3(exitX, 45, droneStart.z);
        selDrone.userData._cardExitCurve = new THREE.CatmullRomCurve3([
            droneStart, exitMid, exitEnd,
        ], false, 'catmullrom', 0.3);
        selDrone.userData._cardExitProgress = 0;
    }

    _createCardDropElement(upgrade, screenX, screenY) {
        const rarity = upgrade.rarity;

        // ── Render card content onto a canvas (mirrors the 3D placard sign) ──
        const cW = 800, cH = 650;
        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d');

        // Rounded-rect background with subtle gradient
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, cW, cH, 20);
        ctx.clip();
        const bgGrad = ctx.createLinearGradient(0, 0, 0, cH);
        if (rarity === 'legendary') {
            bgGrad.addColorStop(0, '#ffe066');
            bgGrad.addColorStop(1, '#ffd93d');
        } else if (rarity === 'rare') {
            bgGrad.addColorStop(0, '#fff8ed');
            bgGrad.addColorStop(1, '#fff4d9');
        } else {
            bgGrad.addColorStop(0, '#ffffff');
            bgGrad.addColorStop(1, '#faf5ef');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, cW, cH);
        ctx.restore();

        // Legendary: diagonal shimmer lines
        if (rarity === 'legendary') {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, cW, cH, 20);
            ctx.clip();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            for (let i = -cH; i < cW + cH; i += 30) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + cH, cH);
                ctx.stroke();
            }
            ctx.restore();
        }

        // (No borders — icons render edge-to-edge without clipping)

        // ── Rarity banner (0-55px) ──
        const bannerH = 55;
        const bannerFill = rarity === 'legendary' ? '#e6b800'
                         : rarity === 'rare' ? '#9b8ec4'
                         : '#f0ebe0';
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, cW, cH, 20);
        ctx.clip();
        ctx.fillStyle = bannerFill;
        ctx.fillRect(0, 0, cW, bannerH);
        ctx.restore();

        ctx.strokeStyle = 'rgba(26, 26, 46, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, bannerH);
        ctx.lineTo(cW, bannerH);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rarity === 'rare' ? '#ffffff' : '#1a1a2e';
        ctx.font = "bold 32px 'Bangers', sans-serif";
        ctx.fillText(t('upgrade.rarity.' + rarity), cW / 2, bannerH / 2);

        // ── Icon — centered, prominent ──
        const iconSize = 300;
        const iconCX = cW / 2;
        const iconCY = 210;
        draw3DUpgradeIcon(ctx, upgrade.icon || 'star', rarity, iconCX, iconCY, iconSize, 0);

        // ── Name — centered below icon ──
        const upgradeName = t('upgrade.' + upgrade.id + '.name');
        const nameFontSize = upgradeName.length > 18 ? 48 : upgradeName.length > 12 ? 54 : 62;
        ctx.font = `bold ${nameFontSize}px 'Bangers', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameMaxW = 680;
        const nameWords = upgradeName.split(' ');
        const nameLines = [];
        let curLine = nameWords[0];
        for (let w = 1; w < nameWords.length; w++) {
            const test = curLine + ' ' + nameWords[w];
            if (ctx.measureText(test).width > nameMaxW) {
                nameLines.push(curLine);
                curLine = nameWords[w];
            } else {
                curLine = test;
            }
        }
        nameLines.push(curLine);

        const nLineH = nameFontSize + 6;
        const nStartY = 400 - (nameLines.length - 1) * nLineH / 2;
        for (let i = 0; i < nameLines.length; i++) {
            // Drop shadow
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillText(nameLines[i], cW / 2 + 2, nStartY + i * nLineH + 2);
            // Main text
            ctx.fillStyle = '#1a1a2e';
            ctx.fillText(nameLines[i], cW / 2, nStartY + i * nLineH);
        }

        // ── Divider with decorative diamond ──
        const dividerY = nStartY + (nameLines.length - 1) * nLineH + nLineH / 2 + 12;
        ctx.strokeStyle = 'rgba(26, 26, 46, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, dividerY);
        ctx.lineTo(cW - 80, dividerY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(26, 26, 46, 0.2)';
        ctx.save();
        ctx.translate(cW / 2, dividerY);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();

        // ── Stat preview + Description (auto-scaling font) ──
        const previews = _getUpgradeStatPreview(upgrade);
        const previewLineH = 40;
        const previewTotalH = previews.length > 0 ? previews.length * previewLineH + 12 : 0;

        const upgradeDesc = t('upgrade.' + upgrade.id + '.desc');
        if (upgradeDesc) {
            const descMaxW = 700;
            const descAreaTop = dividerY + 16;
            const descAreaBot = cH - 16 - previewTotalH;
            const descAreaH = descAreaBot - descAreaTop;

            let descFontSize = 42;
            let dLines, descLineH;

            // Shrink font until description fits available area
            for (; descFontSize >= 24; descFontSize -= 2) {
                ctx.font = `${descFontSize}px 'Bangers', sans-serif`;
                descLineH = descFontSize + 10;

                const dWords = upgradeDesc.split(' ');
                dLines = [];
                let dLine = dWords[0] || '';
                for (let w = 1; w < dWords.length; w++) {
                    const word = dWords[w];
                    if (word.startsWith('(')) {
                        dLines.push(dLine);
                        dLine = word;
                        continue;
                    }
                    const test = dLine + ' ' + word;
                    if (ctx.measureText(test).width > descMaxW) {
                        dLines.push(dLine);
                        dLine = word;
                    } else {
                        dLine = test;
                    }
                }
                dLines.push(dLine);

                if (dLines.length * descLineH <= descAreaH) break;
            }

            ctx.fillStyle = '#3a3a4a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const dCenter = (descAreaTop + descAreaBot) / 2;
            const dStartY = dCenter - (dLines.length - 1) * descLineH / 2;
            for (let i = 0; i < dLines.length; i++) {
                ctx.fillText(dLines[i], cW / 2, dStartY + i * descLineH);
            }
        }

        // ── Stat preview lines (below description) ──
        if (previews.length > 0) {
            const previewStartY = cH - 16 - previewTotalH + 8;
            ctx.font = "28px 'Bangers', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let i = 0; i < previews.length; i++) {
                const p = previews[i];
                ctx.fillStyle = p.beneficial ? '#50c878' : '#ff6b7a';
                ctx.fillText(`${p.label}: ${p.text}`, cW / 2, previewStartY + i * previewLineH);
            }
        }

        // ── Build DOM element ──
        const shadowGlow = rarity === 'legendary'
            ? '3px 4px 0px rgba(26,26,46,0.5), 0 0 30px rgba(255,217,61,0.6)'
            : rarity === 'rare'
                ? '3px 4px 0px rgba(26,26,46,0.5), 0 0 18px rgba(155,142,196,0.4)'
                : '3px 4px 0px rgba(26,26,46,0.5)';

        const el = document.createElement('div');
        el.id = 'upgrade-card-drop';
        el.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 110;
            width: ${CARD_DROP_W}px;
            height: ${CARD_DROP_H}px;
            border-radius: 12px;
            overflow: visible;
            opacity: 0;
            box-shadow: ${shadowGlow};
            left: ${screenX - CARD_DROP_W / 2}px;
            top: ${screenY - CARD_DROP_H / 2}px;
        `;

        canvas.style.cssText = 'width:100%;height:100%;display:block;';
        el.appendChild(canvas);

        document.body.appendChild(el);
        return el;
    }

    _updateCardDrop(dt) {
        if (this.phase !== 'cardDrop') return;

        this._cardDropProgress += dt / CARD_DROP_DUR;
        const t = Math.min(1, this._cardDropProgress);

        const start = this._cardDropStart;
        const target = this._cardDropTarget;

        // Cubic bezier curve: drop down first, then arc to bottom-left HUD
        const cp1x = start.x;
        const cp1y = start.y + 80;    // Drop down
        const cp2x = target.x + 120;  // Approach from the right
        const cp2y = target.y - 60;   // Approach from above

        const u = 1 - t;
        const x = u*u*u*start.x + 3*u*u*t*cp1x + 3*u*t*t*cp2x + t*t*t*target.x;
        const y = u*u*u*start.y + 3*u*u*t*cp1y + 3*u*t*t*cp2y + t*t*t*target.y;

        if (this._cardDropEl) {
            this._cardDropEl.style.left = (x - CARD_DROP_W / 2) + 'px';
            this._cardDropEl.style.top = (y - CARD_DROP_H / 2) + 'px';

            // Scale: shrink from full size with juicy pop in the middle
            const shrink = 1.0 - t * 0.65;
            const pop = Math.sin(t * Math.PI) * 0.15;
            const scale = shrink + pop;
            // Wobble rotation that damps out
            const rot = Math.sin(t * Math.PI * 4) * 15 * (1 - t);
            this._cardDropEl.style.transform = `scale(${scale}) rotate(${rot}deg)`;

            // Fade in quickly, stay visible, fade out at end
            if (t < 0.08) {
                this._cardDropEl.style.opacity = String(t / 0.08);
            } else if (t > 0.88) {
                this._cardDropEl.style.opacity = String((1 - t) / 0.12);
            } else {
                this._cardDropEl.style.opacity = '1';
            }
        }

        // Fly selected drone body off-screen (accelerating)
        const selDrone = this.drones[this.selectedIndex];
        if (selDrone.userData._cardExitCurve) {
            selDrone.userData._cardExitProgress += dt / CARD_DROP_DUR;
            const ep = Math.min(1, selDrone.userData._cardExitProgress);
            const et = ep * ep; // Accelerating easing
            const pos = new THREE.Vector3();
            selDrone.userData._cardExitCurve.getPoint(et, pos);
            selDrone.position.copy(pos);
            // Tilt forward as it flies up
            selDrone.rotation.x = -ep * 0.4;
        }

        if (t >= 1) {
            // Clean up card drop element
            if (this._cardDropEl && this._cardDropEl.parentNode) {
                this._cardDropEl.parentNode.removeChild(this._cardDropEl);
                this._cardDropEl = null;
            }
            this.phase = 'done';
        }
    }

    // ─── PARTICLE UPDATE ─────────────────────────────────────────────────

    _updateParticles(dt) {
        const arr = this._particles;
        for (let i = arr.length - 1; i >= 0; i--) {
            const p = arr[i];
            p.life -= dt;
            p.vy -= 6 * dt; // gravity
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            // Confetti spin
            if (p.isConfetti) {
                p.mesh.rotation.x += p.spinX * dt;
                p.mesh.rotation.y += p.spinY * dt;
                p.mesh.rotation.z += p.spinZ * dt;
                // Flutter drag — confetti falls slower
                p.vy += 2 * dt;
            }

            // Fade out
            const fade = Math.max(0, p.life / p.maxLife);
            p.mesh.material.opacity = fade;
            const s = 0.5 + fade * 0.5;
            p.mesh.scale.setScalar(s);

            if (p.life <= 0) {
                this._scene.remove(p.mesh);
                p.mesh.material.dispose();
                // Swap-and-pop instead of splice to avoid O(n) array shift
                arr[i] = arr[arr.length - 1];
                arr.pop();
            }
        }
    }

    // ─── SHOCKWAVE UPDATE ─────────────────────────────────────────────────

    _updateShockwaves(dt) {
        const arr = this._shockwaves;
        for (let i = arr.length - 1; i >= 0; i--) {
            const sw = arr[i];
            sw.life -= dt;
            const t = 1 - sw.life / sw.maxLife; // 0→1

            // Expand radius with ease-out
            const eased = 1 - Math.pow(1 - t, 3);
            const radius = eased * sw.maxRadius;
            sw.mesh.scale.setScalar(radius);

            // Fade out + thin the ring
            sw.mesh.material.opacity = 0.7 * (1 - t);
            sw.mesh.scale.y = 1 - t * 0.5; // Flatten as it expands

            if (sw.life <= 0) {
                this._scene.remove(sw.mesh);
                sw.mesh.geometry.dispose();
                sw.mesh.material.dispose();
                // Swap-and-pop instead of splice
                arr[i] = arr[arr.length - 1];
                arr.pop();
            }
        }
    }

    _cleanupParticles() {
        if (!this._scene) return;
        for (const p of this._particles) {
            this._scene.remove(p.mesh);
            // Don't dispose shared geometry (getParticleGeoSmall/Large, confetti geos)
            p.mesh.material.dispose();
        }
        this._particles = [];

        // Clean up shockwaves too
        for (const sw of this._shockwaves) {
            this._scene.remove(sw.mesh);
            sw.mesh.geometry.dispose();
            sw.mesh.material.dispose();
        }
        this._shockwaves = [];
    }

    // ─── BACKGROUND DIMMING ──────────────────────────────────────────────

    _dimBackground(scene, dim) {
        // Disabled — cards must be bright and readable without any darkening
        // The drones and placards are the focus during upgrade selection.
    }

    // ─── MAIN UPDATE (called every frame from _animate) ──────────────────

    /**
     * @param {number} dt - Delta time
     * @returns {{ dtScale: number, done: boolean, selectedUpgrade: Object|null }}
     */
    update(dt) {
        const result = { dtScale: 1.0, done: false, selectedUpgrade: null };
        if (!this.active) return result;

        // Slowmo
        if (this._slowmoTimer > 0) {
            this._slowmoTimer -= dt;
            result.dtScale = 0.15; // Drastic time scale reduction
        }

        // Hover detection + feedback
        if (this.phase === 'choosing') {
            this._updateHover();
            this._applyHoverFeedback(dt);
        }

        // Selection animation
        if (this.phase === 'selecting') {
            this._updateSelectionAnim(dt);
        }

        // Presenting phase (close-up + rejected exits)
        if (this.phase === 'presenting') {
            this._updatePresenting(dt);
        }

        // Card drop animation
        if (this.phase === 'cardDrop') {
            this._updateCardDrop(dt);
        }

        // Particles
        this._updateParticles(dt);

        // Shockwaves
        this._updateShockwaves(dt);

        // Camera zoom-punch
        if (Math.abs(this._zoomPunch) > 0.001) {
            result.zoomPunch = this._zoomPunch;
        }

        // Screen shake
        if (this._shakeTimer > 0) {
            this._shakeTimer -= dt;
            const t = Math.max(0, this._shakeTimer / 0.25);
            result.shakeX = (Math.random() - 0.5) * this._shakeIntensity * t;
            result.shakeY = (Math.random() - 0.5) * this._shakeIntensity * t * 0.7;
        }

        // Saturation punch (spring-damped)
        if (Math.abs(this._satPunch) > 0.001 || Math.abs(this._satPunchVel) > 0.001) {
            this._satPunchVel += (-this._satPunch * 80 - this._satPunchVel * 8) * dt;
            this._satPunch += this._satPunchVel * dt;
            result.saturationPunch = this._satPunch;
        }

        // Done — signal completion
        if (this.phase === 'done' && this.selectedIndex >= 0) {
            result.done = true;
            result.selectedUpgrade = this.options[this.selectedIndex];
        }

        return result;
    }

    // ─── CLEANUP ─────────────────────────────────────────────────────────

    dispose() {
        this.deactivate();
        if (_flashEl && _flashEl.parentNode) _flashEl.parentNode.removeChild(_flashEl);
        if (_dimEl && _dimEl.parentNode) _dimEl.parentNode.removeChild(_dimEl);
        _flashEl = null;
        _dimEl = null;
    }
}

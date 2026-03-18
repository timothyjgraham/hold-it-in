// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Scenario Icon Renderer                                      ║
// ║  Offscreen rendering of rotating 3D scenario models with Borderlands-     ║
// ║  style toon post-processing. One model per scenario, rendered into        ║
// ║  dedicated DOM canvases on the scenario select screen.                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';
import { createRoundedBox } from '../utils/characterGeometry.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const _RES = 256;
const _SZ = _RES * _RES;
const BASE_SPIN = 0.4;      // rad/s idle rotation
const HOVER_SPIN = 0.8;     // additional rad/s on hover
const HOVER_SCALE = 1.2;
const IDLE_SCALE = 1.0;
const SCALE_LERP = 0.08;
const PUNCH_DURATION = 0.35;
const DENIED_DURATION = 0.4;
const FRAME_SKIP = 2;       // Render every Nth frame (~30fps at 60hz)

const SCENARIOS = ['office', 'forest', 'ocean', 'airplane'];

// ─── RENDERER STATE ────────────────────────────────────────────────────────

let _renderer = null;
let _camera = null;
let _scenes = {};           // { office: THREE.Scene, ... }
let _models = {};           // { office: THREE.Group, ... }
let _canvases = {};         // { office: HTMLCanvasElement, ... }
let _ctxs = {};             // { office: CanvasRenderingContext2D, ... }

// Animation state per scenario
let _hover = {};            // { office: false, ... }
let _currentScale = {};     // { office: 1.0, ... }
let _targetScale = {};      // { office: 1.0, ... }
let _angles = {};           // { office: 0, ... }

// Punch animation
let _punchActive = {};
let _punchStart = {};

// Denied animation
let _deniedActive = {};
let _deniedStart = {};

// rAF handle
let _rafId = null;
let _lastTime = 0;
let _frameCount = 0;

// Post-process buffers (shared, pre-allocated)
let _postCanvas = null;
let _postCtx = null;
let _mergeCanvas = null;
let _mergeCtx = null;
const _lum = new Float32Array(_SZ);
const _alpha = new Float32Array(_SZ);
const _edges = new Float32Array(_SZ);

// Outline material (shared)
let _olMat = null;
function ol() {
    if (!_olMat) _olMat = outlineMatStatic(0.015);
    return _olMat;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function addWithOutline(group, geo, mat, pos, rot, scale) {
    const mesh = new THREE.Mesh(geo, mat);
    if (pos) mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    if (rot) mesh.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
    if (scale) {
        if (typeof scale === 'number') mesh.scale.setScalar(scale);
        else mesh.scale.set(scale.x || 1, scale.y || 1, scale.z || 1);
    }
    group.add(mesh);

    const outline = new THREE.Mesh(geo, ol());
    if (pos) outline.position.copy(mesh.position);
    if (rot) outline.rotation.copy(mesh.rotation);
    if (scale) outline.scale.copy(mesh.scale);
    group.add(outline);

    return mesh;
}

// ─── 3D MODELS ──────────────────────────────────────────────────────────────

function _buildOfficeModel() {
    const g = new THREE.Group();

    // === DESK ===
    // Desktop surface
    const deskTopGeo = createRoundedBox(1.0, 0.06, 0.55, 0.02);
    addWithOutline(g, deskTopGeo, toonMat(PALETTE.wood), { y: -0.15 });

    // Desk legs (4 corners)
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6);
    const legMat = toonMat(PALETTE.fixture);
    for (const lx of [-0.44, 0.44]) {
        for (const lz of [-0.22, 0.22]) {
            addWithOutline(g, legGeo, legMat, { x: lx, y: -0.35, z: lz });
        }
    }

    // === MONITOR ===
    // Screen bezel (dark frame)
    const bezelGeo = createRoundedBox(0.48, 0.34, 0.03, 0.02);
    addWithOutline(g, bezelGeo, toonMat(PALETTE.charcoal), { x: -0.05, y: 0.18 });

    // Screen (bright, slightly recessed)
    const screenGeo = createRoundedBox(0.42, 0.28, 0.01, 0.015);
    addWithOutline(g, screenGeo, toonMat(PALETTE.airplaneWindow, { emissive: PALETTE.airplaneWindow, emissiveIntensity: 0.3 }),
        { x: -0.05, y: 0.19, z: 0.018 });

    // Monitor stand neck
    const neckGeo = createRoundedBox(0.06, 0.16, 0.04, 0.01);
    addWithOutline(g, neckGeo, toonMat(PALETTE.fixture), { x: -0.05, y: -0.03 });

    // Monitor stand base
    const standGeo = createRoundedBox(0.18, 0.025, 0.12, 0.01);
    addWithOutline(g, standGeo, toonMat(PALETTE.fixture), { x: -0.05, y: -0.11 });

    // === KEYBOARD ===
    const kbGeo = createRoundedBox(0.3, 0.02, 0.1, 0.01);
    addWithOutline(g, kbGeo, toonMat(PALETTE.tileDark), { x: -0.05, y: -0.1, z: 0.22 });

    // === COFFEE MUG ===
    const mugGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.1, 8);
    addWithOutline(g, mugGeo, toonMat(PALETTE.white), { x: 0.35, y: -0.07 });

    // Mug handle
    const handleGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 8, Math.PI);
    addWithOutline(g, handleGeo, toonMat(PALETTE.white),
        { x: 0.40, y: -0.06 }, { z: Math.PI / 2 });

    // Coffee inside mug (dark circle on top)
    const coffeeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.01, 8);
    addWithOutline(g, coffeeGeo, toonMat(PALETTE.wood), { x: 0.35, y: -0.02 });

    // === RESTROOM DOOR (behind desk, offset right) ===
    // Door panel
    const doorGeo = createRoundedBox(0.28, 0.52, 0.04, 0.02);
    addWithOutline(g, doorGeo, toonMat(PALETTE.tileDark), { x: 0.42, y: 0.14, z: -0.28 });

    // Door frame top
    const frameGeo = createRoundedBox(0.34, 0.04, 0.06, 0.01);
    addWithOutline(g, frameGeo, toonMat(PALETTE.wall), { x: 0.42, y: 0.42, z: -0.28 });

    // Door knob
    const knobGeo = new THREE.SphereGeometry(0.025, 8, 6);
    addWithOutline(g, knobGeo, toonMat(PALETTE.gold), { x: 0.32, y: 0.12, z: -0.24 });

    // WC sign on door
    const signGeo = createRoundedBox(0.12, 0.07, 0.015, 0.01);
    addWithOutline(g, signGeo, toonMat(PALETTE.danger), { x: 0.42, y: 0.30, z: -0.26 });

    g.position.y = -0.05;
    return g;
}

function _buildForestModel() {
    const g = new THREE.Group();

    // Ground disc
    const groundGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.06, 16);
    addWithOutline(g, groundGeo, toonMat(PALETTE.forestGrass), { y: -0.5 });

    // Tree 1 (left, tall)
    const trunkGeo1 = new THREE.CylinderGeometry(0.07, 0.09, 0.6, 6);
    addWithOutline(g, trunkGeo1, toonMat(PALETTE.forestBark), { x: -0.38, y: -0.17 });

    const coneGeo1 = new THREE.ConeGeometry(0.32, 0.5, 8);
    addWithOutline(g, coneGeo1, toonMat(PALETTE.forestLeaf), { x: -0.38, y: 0.3 });
    const coneGeo1b = new THREE.ConeGeometry(0.25, 0.4, 8);
    addWithOutline(g, coneGeo1b, toonMat(PALETTE.forestLeafDark), { x: -0.38, y: 0.58 });

    // Tree 2 (right, medium)
    const trunkGeo2 = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6);
    addWithOutline(g, trunkGeo2, toonMat(PALETTE.forestBark), { x: 0.42, y: -0.22 });

    const coneGeo2 = new THREE.ConeGeometry(0.26, 0.42, 8);
    addWithOutline(g, coneGeo2, toonMat(PALETTE.forestLeaf), { x: 0.42, y: 0.18 });
    const coneGeo2b = new THREE.ConeGeometry(0.20, 0.32, 8);
    addWithOutline(g, coneGeo2b, toonMat(PALETTE.forestLeafDark), { x: 0.42, y: 0.42 });

    // Outhouse body (smaller — 65% of original)
    const houseGeo = createRoundedBox(0.26, 0.36, 0.23, 0.03);
    addWithOutline(g, houseGeo, toonMat(PALETTE.forestPlanks), { y: -0.28 });

    // Outhouse roof (pitched — two angled panels)
    const roofGeo = createRoundedBox(0.32, 0.04, 0.15, 0.015);
    addWithOutline(g, roofGeo, toonMat(PALETTE.forestRoof), { y: -0.06, z: 0.04 }, { x: -0.3 });
    addWithOutline(g, roofGeo, toonMat(PALETTE.forestRoof), { y: -0.06, z: -0.04 }, { x: 0.3 });

    // Outhouse door
    const doorGeo = createRoundedBox(0.12, 0.21, 0.03, 0.015);
    addWithOutline(g, doorGeo, toonMat(PALETTE.wood), { y: -0.32, z: 0.13 });

    // Crescent cutout (fake — small half-moon shape)
    const crescentGeo = new THREE.TorusGeometry(0.025, 0.008, 6, 8, Math.PI);
    addWithOutline(g, crescentGeo, toonMat(PALETTE.gold), { y: -0.22, z: 0.145 });

    g.position.y = 0.05;
    return g;
}

function _buildOceanModel() {
    const g = new THREE.Group();

    // Water surface — flat disc
    const waterGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.05, 20);
    addWithOutline(g, waterGeo, toonMat(PALETTE.oceanMid, { transparent: true, opacity: 0.6 }),
        { y: -0.48 });

    // Wave crests on water surface
    const waveGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 16, Math.PI);
    addWithOutline(g, waveGeo, toonMat(PALETTE.oceanSurf), { y: -0.42, z: 0.2 }, { x: Math.PI / 2 });
    const waveGeo2 = new THREE.TorusGeometry(0.45, 0.035, 6, 14, Math.PI);
    addWithOutline(g, waveGeo2, toonMat(PALETTE.oceanSurf), { y: -0.42, z: -0.15 }, { x: Math.PI / 2, y: Math.PI });

    // Boat hull — proper V-shape using lathe
    const hullPts = [];
    hullPts.push(new THREE.Vector2(0, -0.12));     // keel bottom
    hullPts.push(new THREE.Vector2(0.15, -0.06));   // bilge
    hullPts.push(new THREE.Vector2(0.20, 0.02));    // waterline
    hullPts.push(new THREE.Vector2(0.18, 0.06));    // gunwale
    const hullGeo = new THREE.LatheGeometry(hullPts, 12, 0, Math.PI * 2);
    const hull = addWithOutline(g, hullGeo, toonMat(PALETTE.oceanBoatWood), { y: -0.28 }, null, { x: 1, y: 1, z: 1.8 });

    // Hull stripe (darker trim at waterline)
    const stripeGeo = new THREE.TorusGeometry(0.19, 0.015, 6, 16);
    addWithOutline(g, stripeGeo, toonMat(PALETTE.oceanBoatDark), { y: -0.26 }, { x: Math.PI / 2 }, { x: 1, y: 1, z: 1.8 });

    // Cabin / wheelhouse
    const cabinGeo = createRoundedBox(0.16, 0.16, 0.14, 0.03);
    addWithOutline(g, cabinGeo, toonMat(PALETTE.white), { y: -0.1, z: -0.06 });

    // Cabin roof
    const cabRoofGeo = createRoundedBox(0.20, 0.03, 0.18, 0.02);
    addWithOutline(g, cabRoofGeo, toonMat(PALETTE.oceanBoatDark), { y: -0.0, z: -0.06 });

    // Cabin window
    const cabWinGeo = createRoundedBox(0.10, 0.06, 0.02, 0.01);
    addWithOutline(g, cabWinGeo, toonMat(PALETTE.airplaneWindow || 0x87CEEB), { y: -0.08, z: 0.04 });

    // Mast
    const mastGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.55, 6);
    addWithOutline(g, mastGeo, toonMat(PALETTE.oceanRope), { y: 0.1, z: 0.1 });

    // Sail (triangle)
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(0.25, 0);
    sailShape.lineTo(0.04, 0.38);
    sailShape.lineTo(0, 0);
    const sailGeo = new THREE.ExtrudeGeometry(sailShape, { depth: 0.015, bevelEnabled: false });
    sailGeo.center();
    addWithOutline(g, sailGeo, toonMat(PALETTE.white), { x: 0.06, y: 0.08, z: 0.1 });

    // Life buoy — proper torus ring
    const buoyGeo = new THREE.TorusGeometry(0.065, 0.02, 8, 12);
    addWithOutline(g, buoyGeo, toonMat(PALETTE.oceanBuoy), { x: -0.25, y: -0.15, z: 0.15 }, { x: 0.3, z: 0.2 });

    // Buoy white stripes (smaller torus segments for the classic red-white look)
    const buoyWhiteGeo = new THREE.TorusGeometry(0.065, 0.022, 8, 4, Math.PI / 2);
    addWithOutline(g, buoyWhiteGeo, toonMat(PALETTE.white), { x: -0.25, y: -0.15, z: 0.15 }, { x: 0.3, z: 0.2 });

    g.position.y = 0.08;
    return g;
}

function _buildAirplaneModel() {
    const g = new THREE.Group();

    const fuseMat = toonMat(PALETTE.white);
    const wingMat = toonMat(PALETTE.fixture);

    // Main fuselage (longer, slimmer cylinder)
    const fuseGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.4, 14);
    addWithOutline(g, fuseGeo, fuseMat, null, { z: Math.PI / 2 });

    // Nose cone (smooth hemisphere)
    const noseGeo = new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    addWithOutline(g, noseGeo, fuseMat, { x: 0.7 }, { z: -Math.PI / 2 });

    // Cockpit windshield band
    const cockpitGeo = new THREE.CylinderGeometry(0.165, 0.13, 0.12, 14);
    addWithOutline(g, cockpitGeo, toonMat(PALETTE.charcoal), { x: 0.64 }, { z: Math.PI / 2 });

    // Tail taper (narrowing cone for aft section)
    const tailGeo = new THREE.ConeGeometry(0.16, 0.50, 14);
    addWithOutline(g, tailGeo, fuseMat, { x: -0.94 }, { z: Math.PI / 2 });

    // Tail tip (APU exhaust nub)
    const tailTipGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.08, 6);
    addWithOutline(g, tailTipGeo, toonMat(PALETTE.charcoal), { x: -1.2 }, { z: Math.PI / 2 });

    // === WINGS (swept-back, tapered trapezoid shape) ===
    // Use a custom shape for proper swept wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(-0.15, 0);        // trailing edge root
    wingShape.lineTo(0.2, 0);          // leading edge root
    wingShape.lineTo(0.05, 0.55);      // leading edge tip (swept back)
    wingShape.lineTo(-0.05, 0.45);     // trailing edge tip
    wingShape.lineTo(-0.15, 0);
    const wingExtrudeGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.025, bevelEnabled: false });
    wingExtrudeGeo.center();

    // Right wing
    addWithOutline(g, wingExtrudeGeo, wingMat,
        { x: 0.0, y: -0.04, z: 0.28 }, { x: Math.PI / 2, z: 0 });
    // Left wing (mirrored)
    addWithOutline(g, wingExtrudeGeo, wingMat,
        { x: 0.0, y: -0.04, z: -0.28 }, { x: -Math.PI / 2, z: 0 });

    // === ENGINES (bigger, hung under wings on pylons) ===
    const engMat = toonMat(PALETTE.wall);

    // Engine nacelle body
    const engGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.22, 10);
    addWithOutline(g, engGeo, engMat, { x: 0.06, z: 0.32, y: -0.14 }, { z: Math.PI / 2 });
    addWithOutline(g, engGeo, engMat, { x: 0.06, z: -0.32, y: -0.14 }, { z: Math.PI / 2 });

    // Engine intake rings (front)
    const intakeGeo = new THREE.TorusGeometry(0.07, 0.014, 8, 14);
    const intakeMat = toonMat(PALETTE.charcoal);
    addWithOutline(g, intakeGeo, intakeMat, { x: 0.17, z: 0.32, y: -0.14 }, { y: Math.PI / 2 });
    addWithOutline(g, intakeGeo, intakeMat, { x: 0.17, z: -0.32, y: -0.14 }, { y: Math.PI / 2 });

    // Engine exhaust (back)
    const exhaustGeo = new THREE.TorusGeometry(0.055, 0.01, 6, 10);
    addWithOutline(g, exhaustGeo, toonMat(PALETTE.ink), { x: -0.06, z: 0.32, y: -0.14 }, { y: Math.PI / 2 });
    addWithOutline(g, exhaustGeo, toonMat(PALETTE.ink), { x: -0.06, z: -0.32, y: -0.14 }, { y: Math.PI / 2 });

    // Pylon struts connecting engines to wings
    const pylonGeo = createRoundedBox(0.10, 0.06, 0.02, 0.005);
    addWithOutline(g, pylonGeo, wingMat, { x: 0.06, z: 0.30, y: -0.08 });
    addWithOutline(g, pylonGeo, wingMat, { x: 0.06, z: -0.30, y: -0.08 });

    // === TAIL SECTION ===
    // Vertical tail fin (taller, swept)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.12, 0);
    finShape.lineTo(-0.06, 0.35);
    finShape.lineTo(-0.14, 0.30);
    finShape.lineTo(0, 0);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.025, bevelEnabled: false });
    finGeo.center();
    addWithOutline(g, finGeo, toonMat(PALETTE.fixture), { x: -0.78, y: 0.28 });

    // Horizontal stabilizers (swept-back)
    const stabShape = new THREE.Shape();
    stabShape.moveTo(-0.06, 0);
    stabShape.lineTo(0.08, 0);
    stabShape.lineTo(0.02, 0.22);
    stabShape.lineTo(-0.04, 0.18);
    stabShape.lineTo(-0.06, 0);
    const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.018, bevelEnabled: false });
    stabGeo.center();
    addWithOutline(g, stabGeo, wingMat, { x: -0.72, y: 0.06, z: 0.08 }, { x: Math.PI / 2 });
    addWithOutline(g, stabGeo, wingMat, { x: -0.72, y: 0.06, z: -0.08 }, { x: -Math.PI / 2 });

    // === WINDOW ROWS (two rows for visibility during rotation) ===
    const winGeo = new THREE.CircleGeometry(0.018, 8);
    const winMat = toonMat(PALETTE.airplaneWindow, { emissive: PALETTE.airplaneWindow, emissiveIntensity: 0.5 });

    // Windows on top (visible from above)
    for (let i = 0; i < 8; i++) {
        const xPos = 0.38 - i * 0.10;
        addWithOutline(g, winGeo, winMat, { x: xPos, y: 0.155 });
    }

    // Belly stripe (accent line)
    const stripeGeo = createRoundedBox(1.0, 0.018, 0.005, 0.002);
    addWithOutline(g, stripeGeo, toonMat(PALETTE.oceanSurf || PALETTE.rimCool), { x: -0.05, y: -0.06, z: 0.16 });
    addWithOutline(g, stripeGeo, toonMat(PALETTE.oceanSurf || PALETTE.rimCool), { x: -0.05, y: -0.06, z: -0.16 });

    g.position.y = 0.02;
    g.scale.setScalar(0.75);
    return g;
}

// ─── SCENE SETUP ────────────────────────────────────────────────────────────

const LIGHTING = {
    office: {
        ambient: { color: PALETTE.ambient, intensity: 0.65 },
        key: { color: PALETTE.fillWarm, intensity: 1.2, pos: [2, 3, 2] },
        rim: { color: PALETTE.rimCool, intensity: 0.35, pos: [-2, -1, 1] },
    },
    forest: {
        ambient: { color: PALETTE.forestAmbient, intensity: 0.7 },
        key: { color: PALETTE.forestSun, intensity: 1.1, pos: [1, 4, 2] },
        rim: { color: PALETTE.forestRim, intensity: 0.3, pos: [-2, 0, 1] },
    },
    ocean: {
        ambient: { color: PALETTE.oceanAmbient, intensity: 0.6 },
        key: { color: PALETTE.oceanSun, intensity: 1.3, pos: [2, 5, 1] },
        rim: { color: PALETTE.oceanRim, intensity: 0.4, pos: [-1, -1, 2] },
    },
    airplane: {
        ambient: { color: PALETTE.airplaneAmbient, intensity: 0.55 },
        key: { color: PALETTE.airplaneSun, intensity: 1.0, pos: [0, 3, 2] },
        rim: { color: PALETTE.airplaneRim, intensity: 0.35, pos: [-2, 0, 1] },
    },
};

function _buildScene(scenario) {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1000, 1000);

    const cfg = LIGHTING[scenario];
    scene.add(new THREE.AmbientLight(cfg.ambient.color, cfg.ambient.intensity));

    const key = new THREE.DirectionalLight(cfg.key.color, cfg.key.intensity);
    key.position.set(...cfg.key.pos);
    scene.add(key);

    const rim = new THREE.DirectionalLight(cfg.rim.color, cfg.rim.intensity);
    rim.position.set(...cfg.rim.pos);
    scene.add(rim);

    return scene;
}

const MODEL_BUILDERS = {
    office: _buildOfficeModel,
    forest: _buildForestModel,
    ocean: _buildOceanModel,
    airplane: _buildAirplaneModel,
};

// ─── POST-PROCESSING (ported from UpgradeIconRenderer) ──────────────────────

function _borderlandsPostProcess() {
    if (!_postCtx) return _renderer.domElement;

    const W = _RES, H = _RES;

    _postCtx.clearRect(0, 0, W, H);
    _postCtx.drawImage(_renderer.domElement, 0, 0);

    const imageData = _postCtx.getImageData(0, 0, W, H);
    const px = imageData.data;

    // Step 1: luminance + alpha
    const lum = _lum;
    const alpha = _alpha;
    for (let i = 0; i < W * H; i++) {
        const off = i * 4;
        const a = px[off + 3] / 255;
        alpha[i] = a;
        lum[i] = a > 0
            ? (0.299 * px[off] + 0.587 * px[off + 1] + 0.114 * px[off + 2]) / 255
            : 0;
    }

    // Step 2: Sobel edge detection
    const edges = _edges;
    edges.fill(0);
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            const idx = y * W + x;

            const tl = lum[(y - 1) * W + (x - 1)];
            const tc = lum[(y - 1) * W + x];
            const tr = lum[(y - 1) * W + (x + 1)];
            const ml = lum[y * W + (x - 1)];
            const mr = lum[y * W + (x + 1)];
            const bl = lum[(y + 1) * W + (x - 1)];
            const bc = lum[(y + 1) * W + x];
            const br = lum[(y + 1) * W + (x + 1)];

            const gxL = -tl + tr - 2 * ml + 2 * mr - bl + br;
            const gyL = -tl - 2 * tc - tr + bl + 2 * bc + br;
            let edgeL = Math.sqrt(gxL * gxL + gyL * gyL);

            const atl = alpha[(y - 1) * W + (x - 1)];
            const atc = alpha[(y - 1) * W + x];
            const atr = alpha[(y - 1) * W + (x + 1)];
            const aml = alpha[y * W + (x - 1)];
            const amr = alpha[y * W + (x + 1)];
            const abl = alpha[(y + 1) * W + (x - 1)];
            const abc = alpha[(y + 1) * W + x];
            const abr = alpha[(y + 1) * W + (x + 1)];

            const gxA = -atl + atr - 2 * aml + 2 * amr - abl + abr;
            const gyA = -atl - 2 * atc - atr + abl + 2 * abc + abr;
            let edgeA = Math.sqrt(gxA * gxA + gyA * gyA);

            edges[idx] = Math.min(1.0, edgeL * 1.8 + edgeA * 3.0);
        }
    }

    // Step 3: ink edge overlay
    _postCtx.clearRect(0, 0, W, H);
    _postCtx.drawImage(_renderer.domElement, 0, 0);

    const inkR = (PALETTE.ink >> 16) & 0xff;
    const inkG = (PALETTE.ink >> 8) & 0xff;
    const inkB = PALETTE.ink & 0xff;

    const edgeData = _postCtx.createImageData(W, H);
    const epx = edgeData.data;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const idx = y * W + x;
            const off = idx * 4;

            let e = edges[idx];
            if (e < 0.28) { e = 0; }
            else { e = Math.min(1.0, (e - 0.28) / 0.35); }
            if (alpha[idx] < 0.01 && e < 0.3) { e = 0; }

            if (e > 0) {
                epx[off]     = inkR;
                epx[off + 1] = inkG;
                epx[off + 2] = inkB;
                epx[off + 3] = Math.round(e * 230);
            }
        }
    }

    _postCtx.putImageData(edgeData, 0, 0);

    // Composite
    _mergeCtx.clearRect(0, 0, W, H);
    _mergeCtx.drawImage(_renderer.domElement, 0, 0);
    _mergeCtx.drawImage(_postCanvas, 0, 0);

    // Step 4: cross-hatching
    const mCtx = _mergeCtx;
    mCtx.save();
    mCtx.strokeStyle = `rgba(${inkR}, ${inkG}, ${inkB}, 0.04)`;
    mCtx.lineWidth = 1;

    const hatchSpacing = 8;
    for (let y = 0; y < H; y += hatchSpacing) {
        for (let x = 0; x < W; x += hatchSpacing) {
            const idx = y * W + x;
            if (alpha[idx] < 0.3) continue;
            if (lum[idx] > 0.40) continue;

            const len = hatchSpacing * 0.7;
            mCtx.beginPath();
            mCtx.moveTo(x, y);
            mCtx.lineTo(x + len, y + len);
            mCtx.stroke();

            if (lum[idx] < 0.20) {
                mCtx.beginPath();
                mCtx.moveTo(x + len, y);
                mCtx.lineTo(x, y + len);
                mCtx.stroke();
            }
        }
    }
    mCtx.restore();

    return _mergeCanvas;
}

// ─── ANIMATION LOOP ─────────────────────────────────────────────────────────

function _tick(timestamp) {
    _rafId = requestAnimationFrame(_tick);

    _frameCount++;
    if (_frameCount % FRAME_SKIP !== 0) return;

    const dt = _lastTime ? (timestamp - _lastTime) / 1000 : 0.016;
    _lastTime = timestamp;

    for (const scenario of SCENARIOS) {
        const canvas = _canvases[scenario];
        const ctx = _ctxs[scenario];
        const model = _models[scenario];
        const scene = _scenes[scenario];
        if (!canvas || !ctx || !model || !scene) continue;

        // Lerp scale
        const tgt = _targetScale[scenario];
        _currentScale[scenario] += (_targetScale[scenario] - _currentScale[scenario]) * SCALE_LERP;

        // Punch animation override
        if (_punchActive[scenario]) {
            const elapsed = (timestamp - _punchStart[scenario]) / 1000;
            if (elapsed < PUNCH_DURATION) {
                const t = elapsed / PUNCH_DURATION;
                // Ease: punch up to 1.4 then settle back
                let punchScale;
                if (t < 0.3) {
                    punchScale = 1.0 + 0.4 * (t / 0.3);
                } else if (t < 0.6) {
                    punchScale = 1.4 - 0.45 * ((t - 0.3) / 0.3);
                } else {
                    punchScale = 0.95 + 0.05 * ((t - 0.6) / 0.4);
                }
                _currentScale[scenario] = punchScale;
            } else {
                _punchActive[scenario] = false;
            }
        }

        // Denied jitter override
        let jitterX = 0;
        if (_deniedActive[scenario]) {
            const elapsed = (timestamp - _deniedStart[scenario]) / 1000;
            if (elapsed < DENIED_DURATION) {
                const decay = 1 - elapsed / DENIED_DURATION;
                jitterX = Math.sin(elapsed * 40) * 0.12 * decay;
            } else {
                _deniedActive[scenario] = false;
            }
        }

        // Spin
        const spinSpeed = BASE_SPIN + (_hover[scenario] ? HOVER_SPIN : 0);
        _angles[scenario] += spinSpeed * dt;

        // Apply transforms
        model.rotation.y = _angles[scenario];
        model.scale.setScalar(_currentScale[scenario]);
        model.position.x = jitterX;

        // Render
        _renderer.render(scene, _camera);
        const result = _borderlandsPostProcess();

        // Draw to DOM canvas
        ctx.clearRect(0, 0, _RES, _RES);
        ctx.drawImage(result, 0, 0);
    }
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * Build renderer, models, scenes, lights. Call once with canvas references.
 * @param {Object} canvasMap - { office: HTMLCanvasElement, forest: ..., ocean: ..., airplane: ... }
 */
export function initScenarioIcons(canvasMap) {
    // Renderer (shared across all 4 scenes)
    _renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
    });
    _renderer.setSize(_RES, _RES);
    _renderer.setPixelRatio(1);
    _renderer.setClearColor(0x000000, 0);

    // Shared camera
    _camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    _camera.position.set(0, 0.3, 3.2);
    _camera.lookAt(0, 0, 0);

    // Post-process canvases
    _postCanvas = document.createElement('canvas');
    _postCanvas.width = _RES;
    _postCanvas.height = _RES;
    _postCtx = _postCanvas.getContext('2d', { willReadFrequently: true });

    _mergeCanvas = document.createElement('canvas');
    _mergeCanvas.width = _RES;
    _mergeCanvas.height = _RES;
    _mergeCtx = _mergeCanvas.getContext('2d');

    // Build per-scenario scenes and models
    for (const scenario of SCENARIOS) {
        _scenes[scenario] = _buildScene(scenario);
        _models[scenario] = MODEL_BUILDERS[scenario]();
        _scenes[scenario].add(_models[scenario]);

        _canvases[scenario] = canvasMap[scenario];
        _ctxs[scenario] = canvasMap[scenario].getContext('2d');

        _hover[scenario] = false;
        _currentScale[scenario] = IDLE_SCALE;
        _targetScale[scenario] = IDLE_SCALE;
        _angles[scenario] = Math.random() * Math.PI * 2; // Stagger start angles
        _punchActive[scenario] = false;
        _deniedActive[scenario] = false;
    }
}

/**
 * Start the rAF animation loop.
 */
export function startScenarioIcons() {
    if (_rafId) return;
    _lastTime = 0;
    _frameCount = 0;
    _rafId = requestAnimationFrame(_tick);
}

/**
 * Stop the rAF animation loop.
 */
export function stopScenarioIcons() {
    if (_rafId) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
    }
}

/**
 * Set hover state for a scenario (lerp scale/spin targets).
 */
export function setScenarioHover(scenario, hovering) {
    _hover[scenario] = hovering;
    _targetScale[scenario] = hovering ? HOVER_SCALE : IDLE_SCALE;
}

/**
 * Trigger punch-zoom click animation.
 */
export function triggerScenarioClick(scenario) {
    _punchActive[scenario] = true;
    _punchStart[scenario] = performance.now();
}

/**
 * Trigger rapid X-jitter denied animation.
 */
export function triggerScenarioDenied(scenario) {
    _deniedActive[scenario] = true;
    _deniedStart[scenario] = performance.now();
}

/**
 * Clean up all resources.
 */
export function disposeScenarioIcons() {
    stopScenarioIcons();

    if (_renderer) {
        _renderer.dispose();
        _renderer = null;
    }

    for (const scenario of SCENARIOS) {
        if (_models[scenario]) {
            _models[scenario].traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.dispose) child.material.dispose();
                }
            });
        }
    }

    _scenes = {};
    _models = {};
    _canvases = {};
    _ctxs = {};
    _camera = null;
    _postCanvas = null;
    _postCtx = null;
    _mergeCanvas = null;
    _mergeCtx = null;
}

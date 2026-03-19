// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — 3D Upgrade Icon Renderer                                    ║
// ║  Offscreen rendering of rotating 3D icons with Borderlands-style          ║
// ║  toon post-processing: thick ink edges, cross-hatching, sketch wobble.    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { createIconModel } from '../models/UpgradeIconFactory.js';

// ─── RENDERER STATE ──────────────────────────────────────────────────────────

let _renderer = null;
let _scene = null;
let _camera = null;

// Cached clones per icon key (avoids per-frame allocation)
const _iconClones = {};

// Current icon in scene
let _currentIcon = null;
let _currentKey = '';

// Post-process canvases (reused across frames)
let _postCanvas = null;
let _postCtx = null;
let _mergeCanvas = null;
let _mergeCtx = null;

// Cache for static data URLs (collection screen renders time=0 for all icons)
const _dataURLCache = {};

// Reusable resize canvas (avoid per-call allocation)
let _resizeCanvas = null;
let _resizeCtx = null;

// Internal render resolution — higher = crisper icons
const _RES = 512;

// Pre-allocated buffers for post-process (avoid GC on hot path)
const _SZ = _RES * _RES;
const _lum = new Float32Array(_SZ);
const _alpha = new Float32Array(_SZ);
const _edges = new Float32Array(_SZ);

const ROT_SPEED = 0.8;                  // rad/s Y-axis rotation
const TILT = 15 * Math.PI / 180;        // Star/coin tilt toward viewer

// ─── INIT ────────────────────────────────────────────────────────────────────

/**
 * Initialize the offscreen icon renderer. Call once at startup.
 */
export function initIconRenderer() {
    _renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
    });
    _renderer.setSize(_RES, _RES);
    _renderer.setPixelRatio(1);            // Explicit 1:1 — resolution is our quality lever
    _renderer.setClearColor(0x000000, 0);

    _scene = new THREE.Scene();
    // Fog prevents outline shader WebGL warnings (fog uniforms expected)
    _scene.fog = new THREE.Fog(0x000000, 1000, 1000);

    // Tighter framing — icons fill more of the canvas
    _camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    _camera.position.set(0, 0.15, 2.2);
    _camera.lookAt(0, 0, 0);

    // Lighting: punchy contrast for clean toon steps
    _scene.add(new THREE.AmbientLight(PALETTE.ambient, 0.65));
    const dir = new THREE.DirectionalLight(PALETTE.fillWarm, 1.2);
    dir.position.set(2, 3, 2);
    _scene.add(dir);

    // Second fill light from lower-left for rim definition
    const fill = new THREE.DirectionalLight(PALETTE.rimCool, 0.35);
    fill.position.set(-2, -1, 1);
    _scene.add(fill);

    // Post-process canvases (persistent — no per-frame allocation)
    _postCanvas = document.createElement('canvas');
    _postCanvas.width = _RES;
    _postCanvas.height = _RES;
    _postCtx = _postCanvas.getContext('2d', { willReadFrequently: true });

    _mergeCanvas = document.createElement('canvas');
    _mergeCanvas.width = _RES;
    _mergeCanvas.height = _RES;
    _mergeCtx = _mergeCanvas.getContext('2d');
}

// ─── SCENE SETUP ─────────────────────────────────────────────────────────────

function _getIcon(iconKey) {
    if (!_iconClones[iconKey]) {
        _iconClones[iconKey] = createIconModel(iconKey);
    }
    return _iconClones[iconKey];
}

function _setupScene(iconKey, rarity, time) {
    // Remove previous icon from scene
    if (_currentIcon) _scene.remove(_currentIcon);

    // Add icon model (cached clone)
    _currentIcon = _getIcon(iconKey);
    _currentKey = iconKey;

    // Rotation
    _currentIcon.rotation.set(0, 0, 0);
    if (iconKey === 'star' || iconKey === 'coin') {
        _currentIcon.rotation.x = TILT;
    }
    _currentIcon.rotation.y = time * ROT_SPEED;

    _scene.add(_currentIcon);
}

// ─── BORDERLANDS POST-PROCESS ────────────────────────────────────────────────
// Operates on the _RES×_RES WebGL output:
//   1. Sobel edge detection on luminance + alpha → crisp ink outlines
//   2. Subtle cross-hatching in shadow regions

function _borderlandsPostProcess(time) {
    if (!_postCtx) return _renderer.domElement;

    const W = _RES, H = _RES;

    // Copy WebGL output to post-process canvas
    _postCtx.clearRect(0, 0, W, H);
    _postCtx.drawImage(_renderer.domElement, 0, 0);

    const imageData = _postCtx.getImageData(0, 0, W, H);
    const px = imageData.data;

    // ── Step 1: Build luminance + alpha arrays (pre-allocated) ──
    const lum = _lum;
    const alpha = _alpha;
    for (let i = 0; i < W * H; i++) {
        const off = i * 4;
        const a = px[off + 3] / 255;
        alpha[i] = a;
        // Perceived luminance (premultiply-aware)
        lum[i] = a > 0
            ? (0.299 * px[off] + 0.587 * px[off + 1] + 0.114 * px[off + 2]) / 255
            : 0;
    }

    // ── Step 2: Sobel edge detection (pre-allocated) ──
    const edges = _edges;
    edges.fill(0);
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            const idx = y * W + x;

            // Sobel on luminance
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

            // Sobel on alpha (catches silhouette edges)
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

            // Higher res → edges are thinner, so boost multipliers slightly
            edges[idx] = Math.min(1.0, edgeL * 1.8 + edgeA * 3.0);
        }
    }

    // ── Step 3: Draw edges as crisp ink strokes ──
    _postCtx.clearRect(0, 0, W, H);
    _postCtx.drawImage(_renderer.domElement, 0, 0);

    // Get ink color components
    const inkR = (PALETTE.ink >> 16) & 0xff;
    const inkG = (PALETTE.ink >> 8) & 0xff;
    const inkB = PALETTE.ink & 0xff;

    // Create edge overlay
    const edgeData = _postCtx.createImageData(W, H);
    const epx = edgeData.data;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const idx = y * W + x;
            const off = idx * 4;

            let e = edges[idx];

            // Higher threshold → only real edges survive (no fuzzy gradients)
            if (e < 0.28) { e = 0; }
            else { e = Math.min(1.0, (e - 0.28) / 0.35); }

            // Only draw where there's actual content nearby
            if (alpha[idx] < 0.01 && e < 0.3) { e = 0; }

            if (e > 0) {
                epx[off]     = inkR;
                epx[off + 1] = inkG;
                epx[off + 2] = inkB;
                // Full-opacity ink for solid, confident lines
                epx[off + 3] = Math.round(e * 230);
            }
        }
    }

    _postCtx.putImageData(edgeData, 0, 0);

    // Composite: original + edges merged on persistent canvas
    _mergeCtx.clearRect(0, 0, W, H);
    _mergeCtx.drawImage(_renderer.domElement, 0, 0);
    _mergeCtx.drawImage(_postCanvas, 0, 0);
    const mCtx = _mergeCtx;

    // ── Step 4: Subtle cross-hatching in dark regions ──
    mCtx.save();
    mCtx.strokeStyle = `rgba(${inkR}, ${inkG}, ${inkB}, 0.04)`;
    mCtx.lineWidth = 1;

    const hatchSpacing = 10;
    for (let y = 0; y < H; y += hatchSpacing) {
        for (let x = 0; x < W; x += hatchSpacing) {
            const idx = y * W + x;
            if (alpha[idx] < 0.3) continue;
            if (lum[idx] > 0.40) continue; // Only hatch deep shadows

            const len = hatchSpacing * 0.7;
            mCtx.beginPath();
            mCtx.moveTo(x, y);
            mCtx.lineTo(x + len, y + len);
            mCtx.stroke();

            // Cross-hatch for very dark areas only
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

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Draw a rotating 3D upgrade icon onto a 2D canvas context.
 * Includes Borderlands-style post-processing (ink edges, cross-hatching).
 *
 * @param {CanvasRenderingContext2D} ctx - Target 2D context
 * @param {string} iconKey - Icon type (magnet|coin|sign|mop|spray|pot|star|chain|door)
 * @param {string} rarity - common|rare|legendary
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} size - Bounding box size in pixels
 * @param {number} time - Elapsed time in seconds (drives rotation + glow)
 * @param {boolean} [skipPostProcess=false] - Skip Sobel/cross-hatch for performance (models still have inverted-hull outlines)
 */
export function draw3DUpgradeIcon(ctx, iconKey, rarity, cx, cy, size, time, skipPostProcess) {
    if (!_renderer) return;

    _setupScene(iconKey, rarity || 'common', time || 0);
    _renderer.render(_scene, _camera);

    const result = skipPostProcess ? _renderer.domElement : _borderlandsPostProcess(time);
    const half = size / 2;
    ctx.drawImage(result, cx - half, cy - half, size, size);
}

/**
 * Render a 3D icon and return a PNG data URL.
 * Includes Borderlands-style post-processing.
 *
 * @param {string} iconKey - Icon type
 * @param {string} rarity - common|rare|legendary
 * @param {number} [size=64] - Output image size in pixels
 * @param {number} [time=0] - Elapsed time in seconds
 * @returns {string} PNG data URL
 */
export function create3DIconDataURL(iconKey, rarity, size, time) {
    if (!_renderer) return '';

    size = size || 64;

    // Cache static renders (time=0) — avoids re-rendering the same icon
    const t = time || 0;
    if (t === 0) {
        const cacheKey = `${iconKey}_${rarity}_${size}`;
        if (_dataURLCache[cacheKey]) return _dataURLCache[cacheKey];
    }

    _setupScene(iconKey, rarity || 'common', t);
    _renderer.render(_scene, _camera);

    const result = _borderlandsPostProcess(t);

    let url;
    if (size === _RES) {
        url = result.toDataURL('image/png');
    } else {
        // Reuse resize canvas (avoid per-call allocation)
        if (!_resizeCanvas) {
            _resizeCanvas = document.createElement('canvas');
            _resizeCtx = _resizeCanvas.getContext('2d');
        }
        _resizeCanvas.width = size;
        _resizeCanvas.height = size;
        _resizeCtx.clearRect(0, 0, size, size);
        _resizeCtx.drawImage(result, 0, 0, size, size);
        url = _resizeCanvas.toDataURL('image/png');
    }

    // Store in cache for static renders
    if (t === 0) {
        _dataURLCache[`${iconKey}_${rarity}_${size}`] = url;
    }

    return url;
}

/**
 * Clear all cached icon clones and data URLs without destroying the renderer.
 * Call after IconModelCache finishes loading to force re-render with GLB models.
 */
export function clearIconRenderCache() {
    for (const key in _iconClones) {
        delete _iconClones[key];
    }
    for (const key in _dataURLCache) {
        delete _dataURLCache[key];
    }
    _currentIcon = null;
    _currentKey = '';
}

/**
 * Clean up offscreen renderer resources.
 */
export function disposeIconRenderer() {
    if (_renderer) {
        _renderer.dispose();
        _renderer = null;
    }
    _currentIcon = null;
    _scene = null;
    _camera = null;
    _postCanvas = null;
    _postCtx = null;
    _mergeCanvas = null;
    _mergeCtx = null;

    // Clear cached clones
    for (const key in _iconClones) {
        delete _iconClones[key];
    }

    // Clear data URL cache
    for (const key in _dataURLCache) {
        delete _dataURLCache[key];
    }

    _resizeCanvas = null;
    _resizeCtx = null;
}

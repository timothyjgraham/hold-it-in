// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — 3D Upgrade Icon Renderer                                    ║
// ║  Offscreen rendering of rotating 3D icons with rarity glow effects.      ║
// ║  Drop-in replacement for 2D canvas icon drawing API.                     ║
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

// Glow objects
let _glowSphere = null;
let _glowRing = null;
let _glowParticles = [];

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
    _renderer.setSize(256, 256);
    _renderer.setClearColor(0x000000, 0);

    _scene = new THREE.Scene();
    // Fog prevents outline shader WebGL warnings (fog uniforms expected)
    _scene.fog = new THREE.Fog(0x000000, 1000, 1000);

    _camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    _camera.position.set(0, 0.3, 3.5);
    _camera.lookAt(0, 0, 0);

    // Lighting: ambient + directional from upper-right
    _scene.add(new THREE.AmbientLight(PALETTE.ambient, 0.8));
    const dir = new THREE.DirectionalLight(PALETTE.fillWarm, 0.9);
    dir.position.set(2, 3, 2);
    _scene.add(dir);

    _buildGlowObjects();
}

// ─── GLOW OBJECTS ────────────────────────────────────────────────────────────

function _buildGlowObjects() {
    // Shared glow sphere (material color/opacity swapped per rarity)
    _glowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
            side: THREE.BackSide,
        })
    );

    // Rare: rotating torus ring
    _glowRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.3, 0.04, 8, 32),
        new THREE.MeshBasicMaterial({
            color: PALETTE.rarityRare,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
        })
    );

    // Legendary: orbiting particle spheres
    for (let i = 0; i < 6; i++) {
        _glowParticles.push(new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 6, 6),
            new THREE.MeshBasicMaterial({
                color: PALETTE.rarityLegendary,
                transparent: true,
                opacity: 0.8,
                depthWrite: false,
            })
        ));
    }
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

    // Remove glow objects
    _scene.remove(_glowSphere);
    _scene.remove(_glowRing);
    for (const p of _glowParticles) _scene.remove(p);

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

    // ─── Rarity glow effects ────────────────────────────────────────────
    if (rarity === 'common') {
        // Subtle white glow sphere with gentle opacity pulse
        _glowSphere.material.color.setHex(PALETTE.rarityCommon);
        _glowSphere.material.opacity = 0.12 + Math.sin(time * 2) * 0.04;
        _glowSphere.scale.setScalar(1.0);
        _scene.add(_glowSphere);

    } else if (rarity === 'rare') {
        // Violet glow sphere + rotating torus ring
        _glowSphere.material.color.setHex(PALETTE.rarityRare);
        _glowSphere.material.opacity = 0.18 + Math.sin(time * 3) * 0.06;
        _glowSphere.scale.setScalar(1.0);
        _scene.add(_glowSphere);

        _glowRing.rotation.set(time * 1.5, 0, time * 0.5);
        _scene.add(_glowRing);

    } else if (rarity === 'legendary') {
        // Intense gold glow sphere + scale breathing + orbiting particles
        _glowSphere.material.color.setHex(PALETTE.rarityLegendary);
        _glowSphere.material.opacity = 0.2 + Math.sin(time * 4) * 0.1;
        _glowSphere.scale.setScalar(1.0 + Math.sin(time * 2) * 0.05);
        _scene.add(_glowSphere);

        for (let i = 0; i < _glowParticles.length; i++) {
            const angle = time * 1.2 + (i / _glowParticles.length) * Math.PI * 2;
            _glowParticles[i].position.set(
                Math.cos(angle) * 1.4,
                Math.sin(angle * 0.7 + i) * 0.3,
                Math.sin(angle) * 1.4
            );
            _scene.add(_glowParticles[i]);
        }
    }
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Draw a rotating 3D upgrade icon onto a 2D canvas context.
 * Drop-in replacement for drawUpgradeIcon with added rarity + time params.
 *
 * @param {CanvasRenderingContext2D} ctx - Target 2D context
 * @param {string} iconKey - Icon type (magnet|coin|sign|mop|spray|pot|star|chain|door)
 * @param {string} rarity - common|rare|legendary
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} size - Bounding box size in pixels
 * @param {number} time - Elapsed time in seconds (drives rotation + glow)
 */
export function draw3DUpgradeIcon(ctx, iconKey, rarity, cx, cy, size, time) {
    if (!_renderer) return;

    _setupScene(iconKey, rarity || 'common', time || 0);
    _renderer.render(_scene, _camera);

    const half = size / 2;
    ctx.drawImage(_renderer.domElement, cx - half, cy - half, size, size);
}

/**
 * Render a 3D icon and return a PNG data URL.
 * Drop-in replacement for createIconDataURL with added rarity + time params.
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
    _setupScene(iconKey, rarity || 'common', time || 0);
    _renderer.render(_scene, _camera);

    // If native size, return directly
    if (size === 256) return _renderer.domElement.toDataURL('image/png');

    // Resize via offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d').drawImage(_renderer.domElement, 0, 0, size, size);
    return canvas.toDataURL('image/png');
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

    // Clear cached clones
    for (const key in _iconClones) {
        delete _iconClones[key];
    }
}

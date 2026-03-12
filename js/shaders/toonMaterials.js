// Toon Material Factories — static (non-skinned) objects
// Uses THREE.MeshToonMaterial with a shared 3-tone gradient map.
// These materials respond to scene lights (unlike the custom skinned shader).
// All environment, towers, and props should use these.

import { PALETTE, TOON_RAMP } from '../data/palette.js';

// ─── SHARED GRADIENT MAP ──────────────────────────────────────────────────────
// 3-tone ramp texture: shadow / mid / highlight
// Created once, shared across all MeshToonMaterial instances.

let _gradientMap = null;

function getGradientMap() {
    if (_gradientMap) return _gradientMap;

    // 3-pixel 1D texture: shadow, mid, highlight
    const data = new Uint8Array([
        Math.round(TOON_RAMP.shadow * 255),
        Math.round(TOON_RAMP.mid * 255),
        Math.round(TOON_RAMP.highlight * 255),
    ]);

    // r128: use DataTexture with LuminanceFormat for grayscale gradient
    _gradientMap = new THREE.DataTexture(data, 3, 1, THREE.LuminanceFormat);
    _gradientMap.minFilter = THREE.NearestFilter;
    _gradientMap.magFilter = THREE.NearestFilter;
    _gradientMap.needsUpdate = true;

    return _gradientMap;
}

// ─── TOON MATERIAL (static objects) ───────────────────────────────────────────

/**
 * Create a MeshToonMaterial for static (non-skinned) objects.
 * Responds to scene lights. 3-tone ramp matches the custom skinned shader.
 *
 * @param {number} color - Hex color from PALETTE
 * @param {Object} [opts] - Optional overrides
 * @param {boolean} [opts.transparent=false]
 * @param {number} [opts.opacity=1.0]
 * @param {number} [opts.side] - THREE.FrontSide (default), BackSide, DoubleSide
 * @param {number} [opts.emissive] - Emissive hex color
 * @param {number} [opts.emissiveIntensity=0]
 * @returns {THREE.MeshToonMaterial}
 */
export function toonMat(color, opts = {}) {
    const mat = new THREE.MeshToonMaterial({
        color: color,
        gradientMap: getGradientMap(),
        transparent: opts.transparent || false,
        opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
        side: opts.side || THREE.FrontSide,
    });

    if (opts.emissive !== undefined) {
        mat.emissive.setHex(opts.emissive);
        mat.emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.3;
    }

    return mat;
}

// ─── OUTLINE MATERIAL (static objects) ────────────────────────────────────────
// Inverted hull outline — same technique as the skinned shader but simpler.

const _outlineVertStatic = /* glsl */ `
uniform float uOutlineWidth;

void main() {
    vec3 pos = position + normal * uOutlineWidth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const _outlineFragStatic = /* glsl */ `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uOutlineColor;

void main() {
    gl_FragColor = vec4(uOutlineColor, 1.0);
    #include <fog_fragment>
}
`;

/**
 * Create an outline ShaderMaterial for static objects.
 * Renders on BackSide to create inverted hull outline.
 *
 * @param {number} [width=0.025] - Outline thickness
 * @param {number} [color] - Outline color (defaults to PALETTE.outlineColor)
 * @returns {THREE.ShaderMaterial}
 */
export function outlineMatStatic(width = 0.025, color) {
    const uniforms = {
        uOutlineWidth: { value: width },
        uOutlineColor: { value: new THREE.Color(color !== undefined ? color : PALETTE.outlineColor) },
    };

    // Merge fog uniforms
    if (THREE.UniformsLib && THREE.UniformsLib.fog) {
        const fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
        Object.assign(uniforms, fogUniforms);
    }

    return new THREE.ShaderMaterial({
        vertexShader: _outlineVertStatic,
        fragmentShader: _outlineFragStatic,
        uniforms,
        side: THREE.BackSide,
        fog: true,
    });
}

// ─── JITTERY OUTLINE (Borderlands ink jitter — legendary drones) ──────────────

const _outlineVertJittery = /* glsl */ `
uniform float uOutlineWidth;
uniform float uTime;

void main() {
    float jitter = sin(position.x * 40.0 + uTime * 8.0) *
                   sin(position.y * 40.0 + uTime * 6.0) * 0.005;
    vec3 pos = position + normal * (uOutlineWidth + jitter);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const _outlineFragJittery = /* glsl */ `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uOutlineColor;
uniform float uAlpha;

void main() {
    gl_FragColor = vec4(uOutlineColor, uAlpha);
    #include <fog_fragment>
}
`;

/**
 * Create a jittery outline ShaderMaterial (Borderlands-style ink jitter).
 * Time uniform must be updated each frame via material.uniforms.uTime.value.
 *
 * @param {number} [width=0.025] - Outline thickness
 * @param {number} [color] - Outline color
 * @param {number} [alpha=1.0] - Outline alpha
 * @returns {THREE.ShaderMaterial}
 */
export function outlineMatJittery(width = 0.025, color, alpha = 1.0) {
    const uniforms = {
        uOutlineWidth: { value: width },
        uOutlineColor: { value: new THREE.Color(color !== undefined ? color : PALETTE.outlineColor) },
        uAlpha: { value: alpha },
        uTime: { value: 0 },
    };

    if (THREE.UniformsLib && THREE.UniformsLib.fog) {
        const fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
        Object.assign(uniforms, fogUniforms);
    }

    return new THREE.ShaderMaterial({
        vertexShader: _outlineVertJittery,
        fragmentShader: _outlineFragJittery,
        uniforms,
        side: THREE.BackSide,
        fog: true,
        transparent: alpha < 1.0,
        depthWrite: alpha >= 1.0,
    });
}

// ─── CONVENIENCE MATERIAL PRESETS ─────────────────────────────────────────────
// Named factories matching common environment roles.
// Replace the old chrome(), porcelain(), whitePlastic() etc. in EnvironmentModels.js

export function matWall()       { return toonMat(PALETTE.wall); }
export function matTileLight()  { return toonMat(PALETTE.tileLight); }
export function matTileDark()   { return toonMat(PALETTE.tileDark); }
export function matFixture()    { return toonMat(PALETTE.fixture); }
export function matWood()       { return toonMat(PALETTE.wood); }
export function matWhite()      { return toonMat(PALETTE.white); }
export function matDark()       { return toonMat(PALETTE.charcoal); }
export function matInk()        { return toonMat(PALETTE.ink); }
// Carpet with subtle commercial carpet-tile texture
let _carpetTexture = null;
export function matCarpet() {
    if (!_carpetTexture) {
        const sz = 512;
        const canvas = document.createElement('canvas');
        canvas.width = sz;
        canvas.height = sz;
        const ctx = canvas.getContext('2d');

        // Base carpet color
        ctx.fillStyle = '#5a6658';
        ctx.fillRect(0, 0, sz, sz);

        // 2x2 carpet tile grid with subtle warm/cool shift
        const half = sz / 2;
        for (let ty = 0; ty < 2; ty++) {
            for (let tx = 0; tx < 2; tx++) {
                const x = tx * half;
                const y = ty * half;

                // Alternate tiles warm/cool
                ctx.fillStyle = (tx + ty) % 2 === 0
                    ? 'rgba(200, 190, 160, 0.035)'
                    : 'rgba(80, 100, 120, 0.035)';
                ctx.fillRect(x, y, half, half);

                // Directional fiber lines (horizontal)
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.018)';
                ctx.lineWidth = 1;
                for (let ly = y; ly < y + half; ly += 4) {
                    ctx.beginPath();
                    ctx.moveTo(x, ly);
                    ctx.lineTo(x + half, ly);
                    ctx.stroke();
                }

                // Subtle speckle (carpet fiber variation)
                for (let i = 0; i < 400; i++) {
                    const fx = x + Math.random() * half;
                    const fy = y + Math.random() * half;
                    ctx.fillStyle = Math.random() > 0.5
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.03)';
                    ctx.fillRect(fx, fy, 2, 2);
                }
            }
        }

        // Seam lines between carpet tiles
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, half);
        ctx.lineTo(sz, half);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(half, 0);
        ctx.lineTo(half, sz);
        ctx.stroke();

        _carpetTexture = new THREE.CanvasTexture(canvas);
        _carpetTexture.wrapS = THREE.RepeatWrapping;
        _carpetTexture.wrapT = THREE.RepeatWrapping;
        _carpetTexture.repeat.set(6, 5);
    }

    return new THREE.MeshToonMaterial({
        map: _carpetTexture,
        gradientMap: getGradientMap(),
    });
}

// Tower materials
export function matMagnet()     { return toonMat(PALETTE.magnet); }
export function matSign()       { return toonMat(PALETTE.sign); }
export function matMop()        { return toonMat(PALETTE.mop); }
export function matUbik()       { return toonMat(PALETTE.ubik); }
export function matPotplant()   { return toonMat(PALETTE.potplant); }

// Porcelain (toilet, sinks) — white with subtle cool emissive
export function matPorcelain() {
    return toonMat(PALETTE.white, {
        emissive: PALETTE.rimCool,
        emissiveIntensity: 0.08,
    });
}

// Gold accent (flush handle, coin magnet details)
export function matGold() {
    return toonMat(PALETTE.gold, {
        emissive: PALETTE.gold,
        emissiveIntensity: 0.3,
    });
}

// Transparent beam / glow material (non-toon, stays MeshBasic for transparency)
export function matBeam(opacity = 0.05) {
    return new THREE.MeshBasicMaterial({
        color: PALETTE.glow,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

// Particle material (sparkles, sprays)
export function matParticles(color, size = 0.2, opacity = 0.8) {
    return new THREE.PointsMaterial({
        color: color || PALETTE.gold,
        size: size,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
    });
}

// Spray particle material
export function matSpray() {
    return new THREE.MeshBasicMaterial({
        color: PALETTE.ubik,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
    });
}

// Danger / warning emissive (exit sign, alerts)
export function matDanger() {
    return toonMat(PALETTE.danger, {
        emissive: PALETTE.danger,
        emissiveIntensity: 0.8,
    });
}

// Range circle material
export function matRangeCircle(color) {
    return new THREE.MeshBasicMaterial({
        color: color || PALETTE.success,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
    });
}

// ─── FOREST MATERIALS ──────────────────────────────────────────────────────
export function matForestGrass()   { return toonMat(PALETTE.forestGrass); }
export function matForestDirt()    { return toonMat(PALETTE.forestDirt); }
export function matForestBark()    { return toonMat(PALETTE.forestBark); }
export function matForestLeaf()    { return toonMat(PALETTE.forestLeaf); }
export function matForestLeafDk()  { return toonMat(PALETTE.forestLeafDark); }
export function matForestBush()    { return toonMat(PALETTE.forestBush); }
export function matForestPlanks()  { return toonMat(PALETTE.forestPlanks); }
export function matForestRoof()    { return toonMat(PALETTE.forestRoof); }
export function matForestStone()   { return toonMat(PALETTE.forestStone); }
export function matForestMoss()    { return toonMat(PALETTE.forestMoss, { transparent: true, opacity: 0.7 }); }
export function matForestSunbeam(opacity = 0.1) {
    return new THREE.MeshBasicMaterial({
        color: PALETTE.forestSunbeam,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

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
export function matCarpet()     { return toonMat(PALETTE.carpet); }

// Tower materials
export function matMagnet()     { return toonMat(PALETTE.magnet); }
export function matSign()       { return toonMat(PALETTE.sign); }
export function matMop()        { return toonMat(PALETTE.mop); }
export function matUbik()       { return toonMat(PALETTE.ubik); }

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

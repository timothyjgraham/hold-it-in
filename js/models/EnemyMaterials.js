// Enemy Materials — toon + outline material factory with template caching
// Uses toonShader.js from Phase 1. All materials are skinning-compatible.

import {
    createToonMaterial,
    createOutlineMaterial,
} from '../shaders/toonShader.js';
import { ENEMY_VISUAL_CONFIG } from '../data/enemyConfig.js';

// ─── Template cache: one set of materials per enemy type ───
const _templateCache = new Map();

/**
 * Create (or clone from cache) a full set of toon + outline materials
 * for a given enemy type.
 *
 * @param {string} enemyType - Key into ENEMY_VISUAL_CONFIG
 * @param {number|THREE.Color} baseColor - Override body color (hex or Color)
 * @param {boolean} isDesperate - Apply desperate red tint
 * @returns {{ body: THREE.ShaderMaterial, skin: THREE.ShaderMaterial, legs: THREE.ShaderMaterial, outline: THREE.ShaderMaterial }}
 */
export function createEnemyMaterials(enemyType, baseColor, isDesperate) {
    const config = ENEMY_VISUAL_CONFIG[enemyType];
    if (!config) {
        throw new Error(`EnemyMaterials: unknown enemy type "${enemyType}"`);
    }

    // Resolve baseColor to a THREE.Color
    const bodyColor = baseColor instanceof THREE.Color
        ? baseColor.clone()
        : new THREE.Color(baseColor !== undefined ? baseColor : config.materialColors.body);

    // Build or retrieve template
    if (!_templateCache.has(enemyType)) {
        _templateCache.set(enemyType, _buildTemplate(enemyType, config));
    }

    const template = _templateCache.get(enemyType);

    // Clone materials from template — each instance gets its own uniforms
    const body = template.body.clone();
    const skin = template.skin.clone();
    const legs = template.legs.clone();
    const outline = template.outline.clone();

    // Per-instance overrides
    body.uniforms.uBaseColor = { value: bodyColor };
    body.uniforms.uHitFlash = { value: 0.0 };
    body.uniforms.uDesperateTint = { value: isDesperate ? 1.0 : 0.0 };
    body.uniforms.uAuraGlow = { value: 0.0 };

    skin.uniforms.uHitFlash = { value: 0.0 };
    skin.uniforms.uDesperateTint = { value: isDesperate ? 1.0 : 0.0 };
    skin.uniforms.uAuraGlow = { value: 0.0 };

    legs.uniforms.uHitFlash = { value: 0.0 };
    legs.uniforms.uDesperateTint = { value: isDesperate ? 1.0 : 0.0 };
    legs.uniforms.uAuraGlow = { value: 0.0 };

    return { body, skin, legs, outline };
}

/**
 * Build a template set of materials for a given enemy type.
 * These are never used directly — always cloned.
 */
function _buildTemplate(enemyType, config) {
    const colors = config.materialColors;
    const lightDir = new THREE.Vector3(0.5, 1.0, 0.3).normalize();

    const body = createToonMaterial({
        baseColor: new THREE.Color(colors.body),
        lightDir,
        skinning: true,
        rimPower: 3.0,
        rimIntensity: 0.4,
    });

    const skin = createToonMaterial({
        baseColor: new THREE.Color(colors.skin),
        lightDir,
        skinning: true,
        rimPower: 3.0,
        rimIntensity: 0.3,
    });

    const legs = createToonMaterial({
        baseColor: new THREE.Color(colors.legs),
        lightDir,
        skinning: true,
        rimPower: 3.5,
        rimIntensity: 0.3,
    });

    const outlineWidth = _outlineWidthForType(enemyType);
    const outline = createOutlineMaterial({
        outlineWidth,
        outlineColor: new THREE.Color(colors.outline),
        skinning: true,
    });

    return { body, skin, legs, outline };
}

/**
 * Scale outline width by enemy size — larger enemies get slightly thicker outlines.
 */
function _outlineWidthForType(enemyType) {
    const sizeMap = {
        polite: 0.03,
        dancer: 0.025,
        waddle: 0.04,
        panicker: 0.03,
        powerwalker: 0.03,
        girls: 0.02,
    };
    return sizeMap[enemyType] || 0.03;
}

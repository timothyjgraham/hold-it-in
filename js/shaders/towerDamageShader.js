// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Tower Damage Shader System                                                ║
// ║  Procedural Voronoi cracks on towers that scale with damage level.         ║
// ║  Replaces MeshToonMaterial on tower child meshes with a custom             ║
// ║  ShaderMaterial maintaining toon shading + adding crack visuals.           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';

// ─── TOWER DAMAGE VERTEX SHADER ─────────────────────────────────────────────────

const towerDamageVertexShader = /* glsl */ `
#include <fog_pars_vertex>

varying vec3 vObjPos;
varying vec3 vNormal;

void main() {
    vObjPos = position;
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
}
`;

// ─── TOWER DAMAGE FRAGMENT SHADER ───────────────────────────────────────────────

const towerDamageFragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uBaseColor;
uniform vec3 uDarkColor;
uniform vec3 uCrackGlow;
uniform vec3 uDangerColor;
uniform vec3 uLightDir;
uniform float uDamageLevel;
uniform float uTime;
uniform float uHitFlash;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;
uniform float uOpacity;

varying vec3 vObjPos;
varying vec3 vNormal;

// ── Voronoi crack pattern ──────────────────────────────────────────────

vec2 hash2(vec2 p) {
    return fract(sin(vec2(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3))
    )) * 43758.5453);
}

float voronoiEdge(vec2 p, float scale) {
    vec2 ip = floor(p * scale);
    vec2 fp = fract(p * scale);

    float d1 = 10.0;
    float d2 = 10.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash2(ip + g);
            vec2 r = g + o - fp;
            float d = dot(r, r);
            if (d < d1) {
                d2 = d1;
                d1 = d;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }

    return sqrt(d2) - sqrt(d1);
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);

    // ── 3-tone toon shading ─────────────────────────────────────────
    float NdotL = dot(normal, lightDir);
    float shadow = smoothstep(0.25, 0.35, NdotL);
    float highlight = smoothstep(0.65, 0.75, NdotL);
    vec3 color = mix(uBaseColor * 0.4, uBaseColor, shadow);
    color = mix(color, uBaseColor * 1.2, highlight);

    // Add original emissive
    color += uEmissive * uEmissiveIntensity;

    // ── Compute surface UV from object-space (cylindrical projection) ─
    // Works for cylinders, boxes, spheres — cracks wrap around the shape
    vec2 towerUV = vec2(
        atan(vObjPos.x, vObjPos.z) / 6.28318 + 0.5,
        vObjPos.y * 0.8 + 0.5
    );

    // ── Voronoi cracks — scale visibility with damage ───────────────
    if (uDamageLevel > 0.05) {
        float crackVisibility = smoothstep(0.0, 0.35, uDamageLevel);

        // Two-octave Voronoi for chunky + detail cracks
        float edge1 = voronoiEdge(towerUV, 3.0);
        float edge2 = voronoiEdge(towerUV * 1.4 + vec2(2.1, 0.7), 5.5);
        float crackDist = min(edge1, edge2 * 0.85);

        // Thick crack lines (toon style)
        float crackLine = 1.0 - step(0.09, crackDist);
        crackLine *= crackVisibility;

        // Dark interior through cracks
        color = mix(color, uDarkColor, crackLine * 0.9);

        // Wide glow halo along edges
        float glowEdge = smoothstep(0.22, 0.02, crackDist) * crackVisibility;
        float glowPulse = 0.55 + 0.45 * sin(uTime * 3.5);
        color += uCrackGlow * glowEdge * glowPulse * 0.7;

        // Ambient warmth near cracks
        color += uCrackGlow * crackVisibility * 0.08;
    }

    // ── Progressive damage effects ──────────────────────────────────
    color *= 1.0 - uDamageLevel * 0.2;

    // Danger tint at high damage (pulsing red)
    if (uDamageLevel > 0.5) {
        float dangerPulse = sin(uTime * 6.0) * 0.5 + 0.5;
        float dangerAmt = (uDamageLevel - 0.5) * 2.0;
        color = mix(color, uDangerColor, dangerAmt * dangerPulse * 0.3);
    }

    // ── Hit flash — white burst ─────────────────────────────────────
    color = mix(color, vec3(1.0), uHitFlash);

    gl_FragColor = vec4(color, uOpacity);

    #include <fog_fragment>
}
`;


// ════════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create a tower damage ShaderMaterial from a base color.
 * Matches MeshToonMaterial 3-tone ramp + adds Voronoi crack system.
 *
 * @param {number} baseColorHex — Hex color (e.g. PALETTE.sign)
 * @param {Object} [opts] — { emissive, emissiveIntensity }
 * @returns {THREE.ShaderMaterial}
 */
export function createTowerDamageMaterial(baseColorHex, opts = {}) {
    let fogUniforms = {};
    if (THREE.UniformsLib && THREE.UniformsLib.fog) {
        fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
    }

    const emissiveColor = opts.emissive !== undefined
        ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000);
    const emissiveInt = opts.emissiveIntensity !== undefined
        ? opts.emissiveIntensity : 0;

    const uniforms = {
        uBaseColor:         { value: new THREE.Color(baseColorHex) },
        uDarkColor:         { value: new THREE.Color(PALETTE.ink) },
        uCrackGlow:         { value: new THREE.Color(PALETTE.glow) },
        uDangerColor:       { value: new THREE.Color(PALETTE.danger) },
        uLightDir:          { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
        uDamageLevel:       { value: 0 },
        uTime:              { value: 0 },
        uHitFlash:          { value: 0 },
        uEmissive:          { value: emissiveColor },
        uEmissiveIntensity: { value: emissiveInt },
        uOpacity:           { value: 1.0 },
        ...fogUniforms,
    };

    return new THREE.ShaderMaterial({
        vertexShader: towerDamageVertexShader,
        fragmentShader: towerDamageFragmentShader,
        uniforms,
        fog: true,
    });
}

/**
 * Enhance a tower by replacing eligible toonMat materials with
 * the tower damage ShaderMaterial. Stores references for updates.
 *
 * Call this once after _createTowerMesh().
 *
 * @param {Object} tower — tower object with .mesh (THREE.Group)
 */
export function enhanceTowerWithDamageShader(tower) {
    const damageMaterials = [];

    tower.mesh.traverse(child => {
        if (!child.isMesh) return;
        const mat = child.material;

        // Only replace opaque MeshToonMaterial (not outlines, transparent, or textured)
        if (!(mat instanceof THREE.MeshToonMaterial)) return;
        if (mat.transparent) return;
        if (mat.side === THREE.BackSide) return;
        if (mat.map) return;  // skip canvas-textured materials (Ubik label)

        // Extract properties from original material
        const baseColor = mat.color.getHex();
        const emissive = mat.emissive ? mat.emissive.getHex() : 0x000000;
        const emissiveInt = mat.emissiveIntensity || 0;

        // Create replacement damage material
        const dmgMat = createTowerDamageMaterial(baseColor, {
            emissive,
            emissiveIntensity: emissiveInt,
        });

        // Swap
        child.material = dmgMat;
        damageMaterials.push(dmgMat);

        // Dispose old
        mat.dispose();
    });

    // Store for fast access during update loop
    tower._damageMaterials = damageMaterials;
}

/**
 * Update tower damage uniforms. Call each frame from the tower update loop.
 *
 * @param {Object} tower — tower object
 * @param {number} time — current game time
 */
export function updateTowerDamage(tower, time) {
    if (!tower._damageMaterials || tower._damageMaterials.length === 0) return;

    const dmgPct = tower.maxHp > 0 ? 1 - tower.hp / tower.maxHp : 0;
    const hitFlashVal = tower.hitShake > 0.1
        ? Math.min(1, (tower.hitShake - 0.1) / 0.1) : 0;

    for (const mat of tower._damageMaterials) {
        mat.uniforms.uDamageLevel.value = dmgPct;
        mat.uniforms.uTime.value = time;
        mat.uniforms.uHitFlash.value = hitFlashVal;
    }
}

// Toon Shader System — 3-tone ramp, rim lighting, and effect uniforms
// Includes inverted-hull outline shader. Compatible with Three.js r128 skinning.

// ─── TOON VERTEX SHADER ───
export const toonVertexShader = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
#include <fog_pars_vertex>

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    #include <skinbase_vertex>

    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

    #include <begin_vertex>
    #include <skinning_vertex>
    #include <project_vertex>

    #include <fog_vertex>

    // World-space normal for lighting (uniform scale safe)
    vNormal = normalize(mat3(modelMatrix) * objectNormal);

    // World position for rim lighting
    vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPos.xyz;
}
`;

// ─── TOON FRAGMENT SHADER ───
export const toonFragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uBaseColor;
uniform vec3 uLightDir;
uniform float uHitFlash;
uniform float uDesperateTint;
uniform float uAuraGlow;
uniform float uRimPower;
uniform float uRimIntensity;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);

    float NdotL = dot(normal, lightDir);

    // 3-tone ramp: shadow / mid / highlight
    float shadow = smoothstep(0.25, 0.35, NdotL);
    float highlight = smoothstep(0.65, 0.75, NdotL);

    vec3 color = mix(uBaseColor * 0.4, uBaseColor, shadow);
    color = mix(color, uBaseColor * 1.2, highlight);

    // Rim lighting (fresnel) — silhouette pop at steep camera angle
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float rim = pow(1.0 - max(0.0, dot(viewDir, normal)), uRimPower);
    color += rim * uRimIntensity * vec3(1.0);

    // Hit flash — lerp entire output toward white
    color = mix(color, vec3(1.0), uHitFlash);

    // Desperate tint — shift toward red
    vec3 desperateColor = vec3(
        min(1.0, color.r + 0.3),
        color.g * 0.6,
        color.b * 0.6
    );
    color = mix(color, desperateColor, uDesperateTint);

    // Aura glow — pulsing emissive for Panicker speed aura
    color += vec3(uAuraGlow * 0.3, uAuraGlow * 0.2, 0.0);

    gl_FragColor = vec4(color, 1.0);

    #include <fog_fragment>
}
`;

// ─── OUTLINE VERTEX SHADER ───
export const outlineVertexShader = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
#include <fog_pars_vertex>

uniform float uOutlineWidth;

void main() {
    #include <skinbase_vertex>

    #include <beginnormal_vertex>
    #include <skinnormal_vertex>

    #include <begin_vertex>
    #include <skinning_vertex>

    // Extrude along bone-deformed normal
    transformed += normalize(objectNormal) * uOutlineWidth;

    #include <project_vertex>
    #include <fog_vertex>
}
`;

// ─── OUTLINE FRAGMENT SHADER ───
export const outlineFragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uOutlineColor;

void main() {
    gl_FragColor = vec4(uOutlineColor, 1.0);

    #include <fog_fragment>
}
`;

// ─── DEFAULT UNIFORM VALUES ───
export const TOON_UNIFORM_DEFAULTS = {
    uBaseColor:     { value: null }, // set per instance (THREE.Color)
    uLightDir:      { value: null }, // set at creation (THREE.Vector3)
    uHitFlash:      { value: 0.0 },
    uDesperateTint: { value: 0.0 },
    uAuraGlow:      { value: 0.0 },
    uRimPower:      { value: 3.0 },
    uRimIntensity:  { value: 0.4 },
};

// ─── MATERIAL FACTORIES ───

/**
 * Create a toon ShaderMaterial.
 * @param {Object} options
 * @param {THREE.Color} [options.baseColor] - Base diffuse color
 * @param {THREE.Vector3} [options.lightDir] - World-space light direction
 * @param {number} [options.rimPower=3.0]
 * @param {number} [options.rimIntensity=0.4]
 * @param {number} [options.desperateTint=0.0]
 * @param {boolean} [options.skinning=false]
 */
export function createToonMaterial(options = {}) {
    const uniforms = {
        uBaseColor:     { value: options.baseColor || new THREE.Color(0xffffff) },
        uLightDir:      { value: options.lightDir || new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
        uHitFlash:      { value: 0.0 },
        uDesperateTint: { value: options.desperateTint || 0.0 },
        uAuraGlow:      { value: 0.0 },
        uRimPower:      { value: options.rimPower !== undefined ? options.rimPower : 3.0 },
        uRimIntensity:  { value: options.rimIntensity !== undefined ? options.rimIntensity : 0.4 },
    };

    // Merge fog uniforms so Three.js can update them
    if (THREE.UniformsLib && THREE.UniformsLib.fog) {
        const fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
        Object.assign(uniforms, fogUniforms);
    }

    return new THREE.ShaderMaterial({
        vertexShader: toonVertexShader,
        fragmentShader: toonFragmentShader,
        uniforms,
        skinning: options.skinning || false,
        fog: true,
    });
}

/**
 * Create an outline ShaderMaterial (inverted hull, BackSide rendering).
 * @param {Object} options
 * @param {number} [options.outlineWidth=0.03]
 * @param {THREE.Color} [options.outlineColor]
 * @param {boolean} [options.skinning=false]
 */
export function createOutlineMaterial(options = {}) {
    const uniforms = {
        uOutlineWidth: { value: options.outlineWidth !== undefined ? options.outlineWidth : 0.03 },
        uOutlineColor: { value: options.outlineColor || new THREE.Color(0x1a1a1a) },
    };

    if (THREE.UniformsLib && THREE.UniformsLib.fog) {
        const fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
        Object.assign(uniforms, fogUniforms);
    }

    return new THREE.ShaderMaterial({
        vertexShader: outlineVertexShader,
        fragmentShader: outlineFragmentShader,
        uniforms,
        side: THREE.BackSide,
        skinning: options.skinning || false,
        fog: true,
    });
}

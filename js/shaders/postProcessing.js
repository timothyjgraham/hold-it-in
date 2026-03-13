// Post-processing pipeline: "Ink & Paint" visual overhaul
// Single fullscreen ShaderPass — depth-adaptive edges, boiling line jitter,
// triple edge detection, cross-hatching, paper grain, posterize, vignette.
// All effects have strength uniforms (0 = off) for per-scenario tuning.

import { PALETTE } from '../data/palette.js';

/* ── Shader source ───────────────────────────────────────── */

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uResolution;
uniform float uEdgeStrength;
uniform vec3 uEdgeColor;
uniform float uEdgeThreshold;
uniform float uPosterizeLevels;
uniform float uVignetteStrength;
uniform float uCameraNear;
uniform float uCameraFar;

// New uniforms
uniform float uTime;
uniform float uEdgeWidthNear;
uniform float uEdgeWidthFar;
uniform float uEdgeNearDist;
uniform float uEdgeFarDist;
uniform float uNormalEdgeStrength;
uniform float uColorEdgeStrength;
uniform float uJitterAmount;
uniform float uHatchStrength;
uniform float uHatchDensity;
uniform vec3 uHatchColor;
uniform float uPaperStrength;
uniform float uPaperScale;
uniform float uSaturationBoost;

varying vec2 vUv;

/* ── Helpers ─────────────────────────────────────────────── */

// Fast hash for paper grain / hatch noise
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Linear world-space depth from depth buffer
float sampleLinearDepth(vec2 uv) {
    float d = texture2D(tDepth, uv).r;
    float z = d * 2.0 - 1.0;
    return (2.0 * uCameraNear * uCameraFar)
         / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
}

// Log-linearized depth for edge detection (existing logic)
float sampleLogDepth(vec2 uv) {
    return log2(sampleLinearDepth(uv) + 1.0);
}

// Luminance from RGB
float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// RGB ↔ HSV conversions
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Reconstruct view-space normal from depth neighbors
vec3 reconstructNormal(vec2 uv, vec2 texel) {
    float dc = sampleLinearDepth(uv);
    float dl = sampleLinearDepth(uv - vec2(texel.x, 0.0));
    float dr = sampleLinearDepth(uv + vec2(texel.x, 0.0));
    float dt = sampleLinearDepth(uv + vec2(0.0, texel.y));
    float db = sampleLinearDepth(uv - vec2(0.0, texel.y));

    // Use the closer pair for each axis to handle discontinuities
    float dx = (abs(dl - dc) < abs(dr - dc)) ? (dc - dl) : (dr - dc);
    float dy = (abs(db - dc) < abs(dt - dc)) ? (dc - db) : (dt - dc);

    return normalize(vec3(dx, dy, texel.x * dc * 2.0));
}

void main() {
    // ── Adaptive edge width based on center depth ───────────
    float centerDepth = sampleLinearDepth(vUv);
    float depthT = smoothstep(uEdgeNearDist, uEdgeFarDist, centerDepth);
    float edgeWidth = mix(uEdgeWidthNear, uEdgeWidthFar, depthT);
    vec2 texel = edgeWidth / uResolution;

    vec4 color = texture2D(tDiffuse, vUv);

    // ── Boiling line jitter ─────────────────────────────────
    // Temporal noise offsets applied to all Sobel sample positions
    float jitterPhase = uTime * 8.0;
    vec2 jitter = vec2(0.0);
    if (uJitterAmount > 0.0) {
        float jScale = uJitterAmount / uResolution.x;
        jitter = vec2(
            sin(jitterPhase + vUv.y * 200.0) * jScale,
            cos(jitterPhase * 1.3 + vUv.x * 200.0) * jScale
        );
    }

    // ── 1. Depth Sobel (existing, with jitter + adaptive width) ──
    float d00 = sampleLogDepth(vUv + vec2(-texel.x, -texel.y) + jitter);
    float d10 = sampleLogDepth(vUv + vec2(     0.0, -texel.y) + jitter);
    float d20 = sampleLogDepth(vUv + vec2( texel.x, -texel.y) + jitter);
    float d01 = sampleLogDepth(vUv + vec2(-texel.x,      0.0) + jitter);
    float d21 = sampleLogDepth(vUv + vec2( texel.x,      0.0) + jitter);
    float d02 = sampleLogDepth(vUv + vec2(-texel.x,  texel.y) + jitter);
    float d12 = sampleLogDepth(vUv + vec2(     0.0,  texel.y) + jitter);
    float d22 = sampleLogDepth(vUv + vec2( texel.x,  texel.y) + jitter);

    float dgx = -d00 - 2.0*d01 - d02 + d20 + 2.0*d21 + d22;
    float dgy = -d00 - 2.0*d10 - d20 + d02 + 2.0*d12 + d22;
    float depthEdge = sqrt(dgx*dgx + dgy*dgy);
    depthEdge = smoothstep(uEdgeThreshold * 0.5, uEdgeThreshold, depthEdge);

    // ── 2. Luminance Sobel (color boundary edges) ───────────
    float lumEdge = 0.0;
    if (uColorEdgeStrength > 0.0) {
        float l00 = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y) + jitter).rgb);
        float l10 = luminance(texture2D(tDiffuse, vUv + vec2(     0.0, -texel.y) + jitter).rgb);
        float l20 = luminance(texture2D(tDiffuse, vUv + vec2( texel.x, -texel.y) + jitter).rgb);
        float l01 = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x,      0.0) + jitter).rgb);
        float l21 = luminance(texture2D(tDiffuse, vUv + vec2( texel.x,      0.0) + jitter).rgb);
        float l02 = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x,  texel.y) + jitter).rgb);
        float l12 = luminance(texture2D(tDiffuse, vUv + vec2(     0.0,  texel.y) + jitter).rgb);
        float l22 = luminance(texture2D(tDiffuse, vUv + vec2( texel.x,  texel.y) + jitter).rgb);

        float lgx = -l00 - 2.0*l01 - l02 + l20 + 2.0*l21 + l22;
        float lgy = -l00 - 2.0*l10 - l20 + l02 + 2.0*l12 + l22;
        lumEdge = sqrt(lgx*lgx + lgy*lgy);
        lumEdge = smoothstep(0.05, 0.15, lumEdge) * uColorEdgeStrength;
    }

    // ── 3. Normal-from-depth edges (surface creases) ────────
    float normalEdge = 0.0;
    if (uNormalEdgeStrength > 0.0) {
        vec2 ntexel = 1.0 / uResolution; // 1px for normal reconstruction
        vec3 nc  = reconstructNormal(vUv, ntexel);
        vec3 nl  = reconstructNormal(vUv - vec2(texel.x, 0.0), ntexel);
        vec3 nr  = reconstructNormal(vUv + vec2(texel.x, 0.0), ntexel);
        vec3 nt  = reconstructNormal(vUv + vec2(0.0, texel.y), ntexel);
        vec3 nb  = reconstructNormal(vUv - vec2(0.0, texel.y), ntexel);

        float ndiff = 0.0;
        ndiff = max(ndiff, 1.0 - dot(nc, nl));
        ndiff = max(ndiff, 1.0 - dot(nc, nr));
        ndiff = max(ndiff, 1.0 - dot(nc, nt));
        ndiff = max(ndiff, 1.0 - dot(nc, nb));

        normalEdge = smoothstep(0.1, 0.4, ndiff) * uNormalEdgeStrength;
    }

    // ── Combined edge (max to avoid over-darkening) ─────────
    float edge = max(depthEdge, max(lumEdge, normalEdge)) * uEdgeStrength;

    // ── 4. Composite ink edges onto color ───────────────────
    color.rgb = mix(color.rgb, uEdgeColor, edge);

    // ── 5. Posterization ────────────────────────────────────
    if (uPosterizeLevels > 1.0) {
        color.rgb = floor(color.rgb * uPosterizeLevels + 0.5) / uPosterizeLevels;
    }

    // ── 6. Saturation boost in midtones ─────────────────────
    if (uSaturationBoost > 0.0) {
        float lum = luminance(color.rgb);
        float midMask = smoothstep(0.1, 0.25, lum) * smoothstep(0.9, 0.75, lum);
        vec3 hsv = rgb2hsv(color.rgb);
        hsv.y = min(1.0, hsv.y + uSaturationBoost * midMask);
        color.rgb = hsv2rgb(hsv);
    }

    // ── 7. Cross-hatching in shadow regions ─────────────────
    if (uHatchStrength > 0.0) {
        float lum = luminance(color.rgb);
        // Shadow masks: light shadow < 0.4, deep shadow < 0.2
        float lightShadow = smoothstep(0.45, 0.25, lum);
        float deepShadow  = smoothstep(0.25, 0.10, lum);

        // Screen-space hatching with slow temporal boil
        vec2 screenPos = vUv * uResolution;
        float hatchBoil = uTime * 3.0;

        // First hatch direction (~30°)
        float angle1 = 0.52; // ~30 degrees
        float h1 = sin((screenPos.x * cos(angle1) + screenPos.y * sin(angle1)) * uHatchDensity / edgeWidth
                   + sin(hatchBoil + screenPos.y * 0.02) * 2.0);
        h1 = smoothstep(0.3, 0.5, h1);

        // Second hatch direction (~90°)
        float angle2 = 1.57; // ~90 degrees
        float h2 = sin((screenPos.x * cos(angle2) + screenPos.y * sin(angle2)) * uHatchDensity / edgeWidth
                   + cos(hatchBoil * 0.7 + screenPos.x * 0.02) * 2.0);
        h2 = smoothstep(0.3, 0.5, h2);

        // Single hatch in light shadows, cross-hatch in deep shadows
        float hatch = h1 * lightShadow + h1 * h2 * deepShadow;
        hatch = clamp(hatch, 0.0, 1.0);

        color.rgb = mix(color.rgb, uHatchColor, hatch * uHatchStrength);
    }

    // ── 8. Paper grain ──────────────────────────────────────
    if (uPaperStrength > 0.0) {
        vec2 grainUV = floor(gl_FragCoord.xy / uPaperScale * uResolution.y);
        float grain = hash(grainUV) * 2.0 - 1.0; // -1..1

        float lum = luminance(color.rgb);
        // Warm tint in highlights, cool tint in shadows
        vec3 warmGrain = vec3(1.0, 0.95, 0.85);  // warm paper
        vec3 coolGrain = vec3(0.85, 0.9, 1.0);    // cool shadow
        vec3 grainTint = mix(coolGrain, warmGrain, lum);

        color.rgb += grain * uPaperStrength * grainTint;
    }

    // ── 9. Vignette ─────────────────────────────────────────
    if (uVignetteStrength > 0.0) {
        float dist = length(vUv - 0.5) * 1.4;
        float vig = 1.0 - smoothstep(0.4, 1.2, dist);
        color.rgb *= mix(1.0, vig, uVignetteStrength);
    }

    gl_FragColor = color;
}`;

/* ── Pipeline setup ──────────────────────────────────────── */

/**
 * Creates the post-processing pipeline.
 * Returns an object with render(), setSize(), uniforms, enabled, and dispose().
 *
 * Usage in Game.init():
 *   this.postFX = setupPostProcessing(this.renderer, this.scene, this.camera);
 *
 * Usage in Game._animate():
 *   this.postFX.uniforms.uTime.value = this.clock.elapsedTime;
 *   this.postFX.render();            // replaces renderer.render(scene, camera)
 *
 * Usage in resize handler:
 *   this.postFX.setSize(w, h);
 */
export function setupPostProcessing(renderer, scene, camera) {
    const pr = renderer.getPixelRatio();
    const w  = window.innerWidth  * pr;
    const h  = window.innerHeight * pr;

    // Off-screen render target with attached depth texture
    const renderTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format:    THREE.RGBAFormat,
    });
    renderTarget.depthTexture = new THREE.DepthTexture(w, h);
    renderTarget.depthTexture.type = THREE.UnsignedIntType;

    // Edge + hatch colors from palette (→ vec3)
    const inkColor   = new THREE.Color(PALETTE.ink);
    const hatchColor = new THREE.Color(PALETTE.hatchInk);

    const uniforms = {
        tDiffuse:            { value: renderTarget.texture },
        tDepth:              { value: renderTarget.depthTexture },
        uResolution:         { value: new THREE.Vector2(w, h) },
        uEdgeStrength:       { value: 1.0 },
        uEdgeColor:          { value: new THREE.Vector3(inkColor.r, inkColor.g, inkColor.b) },
        uEdgeThreshold:      { value: 0.15 },
        uPosterizeLevels:    { value: 0.0 },      // 0 = off; 10+ for subtle effect
        uVignetteStrength:   { value: 0.3 },
        uCameraNear:         { value: camera.near },
        uCameraFar:          { value: camera.far },

        // New uniforms (all default to safe/off values — tune per scenario)
        uTime:               { value: 0.0 },
        uEdgeWidthNear:      { value: 1.5 },      // was 2.0, reverted to original
        uEdgeWidthFar:       { value: 0.8 },
        uEdgeNearDist:       { value: 5.0 },
        uEdgeFarDist:        { value: 80.0 },
        uNormalEdgeStrength: { value: 0.0 },       // off — was causing smudged outlines
        uColorEdgeStrength:  { value: 0.0 },       // off — was adding false edges
        uJitterAmount:       { value: 0.0 },       // off — was causing heat-haze distortion
        uHatchStrength:      { value: 0.0 },       // off — was causing swirly floor patterns
        uHatchDensity:       { value: 50.0 },
        uHatchColor:         { value: new THREE.Vector3(hatchColor.r, hatchColor.g, hatchColor.b) },
        uPaperStrength:      { value: 0.0 },       // off — was adding grain noise
        uPaperScale:         { value: 400.0 },
        uSaturationBoost:    { value: 0.0 },       // off — was shifting colors
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        depthWrite: false,
        depthTest:  false,
    });

    // Fullscreen quad + orthographic camera for the post-processing pass
    const postScene  = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    let enabled = true;

    return {
        get enabled()  { return enabled; },
        set enabled(v) { enabled = v; },
        uniforms,

        /** Call instead of renderer.render(scene, camera) */
        render() {
            if (!enabled) {
                renderer.render(scene, camera);
                return;
            }
            // Pass 1: render scene → off-screen target (fills color + depth textures)
            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, camera);
            // Pass 2: fullscreen quad reads color + depth, writes to screen
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCamera);
        },

        /** Call on window resize (pass CSS pixel dimensions, not device pixels) */
        setSize(width, height) {
            const pr = renderer.getPixelRatio();
            const pw = width  * pr;
            const ph = height * pr;
            renderTarget.setSize(pw, ph);
            uniforms.uResolution.value.set(pw, ph);
        },

        dispose() {
            renderTarget.depthTexture.dispose();
            renderTarget.dispose();
            material.dispose();
        },
    };
}

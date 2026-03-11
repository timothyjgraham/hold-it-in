// Post-processing pipeline: depth-based Sobel edge detection + posterize + vignette
// Single fullscreen ShaderPass — complements per-object inverted hull outlines
// with screen-space outlines for environment geometry, intersections, and silhouettes.

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
uniform float uEdgeWidth;
uniform vec3 uEdgeColor;
uniform float uEdgeThreshold;
uniform float uPosterizeLevels;
uniform float uVignetteStrength;
uniform float uCameraNear;
uniform float uCameraFar;

varying vec2 vUv;

// Convert non-linear depth buffer value to linear world-space depth,
// then log2 for consistent edge detection across near/far ranges.
float sampleDepth(vec2 uv) {
    float d = texture2D(tDepth, uv).r;
    float z = d * 2.0 - 1.0;
    float linear = (2.0 * uCameraNear * uCameraFar)
                 / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
    return log2(linear + 1.0);
}

void main() {
    vec2 texel = uEdgeWidth / uResolution;
    vec4 color = texture2D(tDiffuse, vUv);

    // ── 3×3 Sobel on log-linearized depth ──────────────
    float d00 = sampleDepth(vUv + vec2(-texel.x, -texel.y));
    float d10 = sampleDepth(vUv + vec2(     0.0, -texel.y));
    float d20 = sampleDepth(vUv + vec2( texel.x, -texel.y));
    float d01 = sampleDepth(vUv + vec2(-texel.x,      0.0));
    float d21 = sampleDepth(vUv + vec2( texel.x,      0.0));
    float d02 = sampleDepth(vUv + vec2(-texel.x,  texel.y));
    float d12 = sampleDepth(vUv + vec2(     0.0,  texel.y));
    float d22 = sampleDepth(vUv + vec2( texel.x,  texel.y));

    float gx = -d00 - 2.0 * d01 - d02 + d20 + 2.0 * d21 + d22;
    float gy = -d00 - 2.0 * d10 - d20 + d02 + 2.0 * d12 + d22;
    float edge = sqrt(gx * gx + gy * gy);

    // Smooth threshold: ramps from 0 at half-threshold to 1 at threshold
    edge = smoothstep(uEdgeThreshold * 0.5, uEdgeThreshold, edge) * uEdgeStrength;

    // Composite ink-colored edge over scene
    color.rgb = mix(color.rgb, uEdgeColor, edge);

    // ── Posterization (set uPosterizeLevels > 1 to enable; 8–16 = subtle) ──
    if (uPosterizeLevels > 1.0) {
        color.rgb = floor(color.rgb * uPosterizeLevels + 0.5) / uPosterizeLevels;
    }

    // ── Vignette ──
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

    // Edge color from palette (PALETTE.ink → vec3)
    const inkColor = new THREE.Color(PALETTE.ink);

    const uniforms = {
        tDiffuse:          { value: renderTarget.texture },
        tDepth:            { value: renderTarget.depthTexture },
        uResolution:       { value: new THREE.Vector2(w, h) },
        uEdgeStrength:     { value: 1.0 },     // 0 = no edges, 1 = full
        uEdgeWidth:        { value: 1.5 },      // pixel multiplier for Sobel kernel
        uEdgeColor:        { value: new THREE.Vector3(inkColor.r, inkColor.g, inkColor.b) },
        uEdgeThreshold:    { value: 0.15 },     // depth-gradient cutoff (tune to taste)
        uPosterizeLevels:  { value: 0.0 },      // 0 = off; try 8–16 for subtle effect
        uVignetteStrength: { value: 0.3 },      // 0 = off, 0.3 = gentle darkening
        uCameraNear:       { value: camera.near },
        uCameraFar:        { value: camera.far },
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

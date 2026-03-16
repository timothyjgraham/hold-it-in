// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  Door Damage Shader System                                                 ║
// ║  Fortnite-style procedural crack + impact VFX for the bathroom door.       ║
// ║  Custom ShaderMaterial with Voronoi cracks, radial fracture lines,         ║
// ║  impact flash, glow pulses, and progressive damage visualization.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';

const MAX_IMPACTS = 12;

// ─── DOOR DAMAGE VERTEX SHADER ─────────────────────────────────────────────────
const doorDamageVertexShader = /* glsl */ `
#include <fog_pars_vertex>

uniform float uDoorHalfW;
uniform float uDoorHalfH;
uniform vec2 uImpacts[${MAX_IMPACTS}];
uniform float uImpactStrengths[${MAX_IMPACTS}];
uniform int uImpactCount;

varying vec2 vDoorUV;
varying vec3 vObjectNormal;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
    vObjectNormal = normal;
    vNormal = normalize(normalMatrix * normal);

    // Compute door-face UV from object-space position
    vDoorUV = vec2(
        (position.x + uDoorHalfW) / (uDoorHalfW * 2.0),
        (position.y + uDoorHalfH) / (uDoorHalfH * 2.0)
    );

    // Vertex displacement — bulge outward at impact points (front face only)
    vec3 displaced = position;
    if (normal.z > 0.5) {
        for (int i = 0; i < ${MAX_IMPACTS}; i++) {
            if (i >= uImpactCount) break;
            float dist = distance(vDoorUV, uImpacts[i]);
            float bulge = uImpactStrengths[i] * exp(-dist * dist * 20.0) * 0.06;
            displaced.z += bulge;
        }
    }

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
}
`;

// ─── DOOR DAMAGE FRAGMENT SHADER ────────────────────────────────────────────────
const doorDamageFragmentShader = /* glsl */ `
#include <common>
#include <fog_pars_fragment>

uniform vec3 uBaseColor;
uniform vec3 uDarkColor;
uniform vec3 uCrackGlow;
uniform vec3 uDangerColor;
uniform vec3 uLightDir;
uniform float uTime;
uniform float uDamageLevel;
uniform float uBaseOpacity;
uniform vec2 uImpacts[${MAX_IMPACTS}];
uniform float uImpactStrengths[${MAX_IMPACTS}];
uniform float uImpactTimes[${MAX_IMPACTS}];
uniform int uImpactCount;
uniform float uHealFlash;

varying vec2 vDoorUV;
varying vec3 vObjectNormal;
varying vec3 vWorldPosition;
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

// ── Radial crack lines from an impact point ────────────────────────────

float radialCracks(vec2 uv, vec2 center, float strength) {
    vec2 delta = uv - center;
    float dist = length(delta);
    float angle = atan(delta.y, delta.x);

    // Jagged radial spokes (7 main rays + sine distortion)
    float rays = abs(sin(angle * 7.0 + dist * 25.0));
    rays = smoothstep(0.88, 1.0, rays);

    // Concentric ring stress lines
    float rings = abs(sin(dist * 40.0));
    rings = smoothstep(0.92, 1.0, rings) * 0.5;

    // Fade with distance from impact center
    float fade = smoothstep(strength * 0.4, 0.0, dist);

    return (rays + rings) * fade;
}

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDir);

    // Is this the front face of the door box?
    bool isFrontFace = vObjectNormal.z > 0.5;

    // ── 3-tone toon shading (matches game aesthetic) ───────────────────
    float NdotL = dot(normal, lightDir);
    float shadow = smoothstep(0.25, 0.35, NdotL);
    float highlight = smoothstep(0.65, 0.75, NdotL);
    vec3 color = mix(uBaseColor * 0.4, uBaseColor, shadow);
    color = mix(color, uBaseColor * 1.2, highlight);

    float alpha = uBaseOpacity;

    if (isFrontFace) {
        vec2 duv = vDoorUV;

        // ── Accumulate damage influence from all impact points ────────
        float damageField = 0.0;
        float freshFlash = 0.0;
        float radialSum = 0.0;

        for (int i = 0; i < ${MAX_IMPACTS}; i++) {
            if (i >= uImpactCount) break;

            float dist = distance(duv, uImpacts[i]);
            float radius = uImpactStrengths[i] * 0.35;
            float influence = smoothstep(radius, radius * 0.1, dist);
            damageField = max(damageField, influence);

            // Radial cracks from this impact
            radialSum += radialCracks(duv, uImpacts[i], uImpactStrengths[i] * 0.5);

            // Fresh impact flash (first 0.35 seconds)
            float age = uTime - uImpactTimes[i];
            if (age >= 0.0 && age < 0.35) {
                float flashPow = 1.0 - age / 0.35;
                flashPow *= flashPow; // quadratic falloff for snappy pop
                float flash = flashPow * influence;
                freshFlash = max(freshFlash, flash);
            }
        }

        damageField = clamp(damageField, 0.0, 1.0);
        radialSum = clamp(radialSum, 0.0, 1.0);

        // ── Voronoi crack pattern (two octaves for detail) ────────────
        float edge1 = voronoiEdge(duv, 7.0);
        float edge2 = voronoiEdge(duv * 1.5 + vec2(3.7, 1.3), 13.0);
        float crackDist = min(edge1, edge2 * 0.8);

        // Sharp crack lines (toon style — hard step, not soft gradient)
        float crackLine = 1.0 - step(0.04, crackDist);

        // Cracks only appear where damage field exists
        float crackMask = crackLine * damageField;

        // Merge radial cracks
        crackMask = max(crackMask, radialSum * damageField * 0.7);
        crackMask = clamp(crackMask, 0.0, 1.0);

        // ── Wider glow along crack edges ──────────────────────────────
        float glowEdge = smoothstep(0.12, 0.015, crackDist) * damageField;
        float glowPulse = 0.55 + 0.45 * sin(uTime * 3.5);

        // ── Apply crack visual effects ────────────────────────────────

        // Dark interior showing through cracks
        color = mix(color, uDarkColor, crackMask * 0.85);

        // Warm glow along crack edges
        color += uCrackGlow * glowEdge * glowPulse * 0.55;

        // Radial glow near impact centers (ambient heat)
        color += uCrackGlow * damageField * 0.12;

        // Fresh impact flash — bright white-gold burst
        color = mix(color, vec3(1.0, 0.95, 0.85), freshFlash * 0.9);

        // ── Progressive damage effects ────────────────────────────────

        // Subtle darkening as damage accumulates
        color *= 1.0 - uDamageLevel * 0.15;

        // Red danger tint at high damage (pulsing)
        if (uDamageLevel > 0.5) {
            float dangerPulse = sin(uTime * 5.0) * 0.5 + 0.5;
            float dangerAmount = (uDamageLevel - 0.5) / 0.5;
            color = mix(color, uDangerColor, dangerAmount * dangerPulse * 0.25);
        }

        // ── Heal flash (L1 upgrade) ──────────────────────────────────
        if (uHealFlash > 0.0) {
            color = mix(color, vec3(0.3, 1.0, 0.55), uHealFlash * 0.6);
        }

        // ── Opacity: damage makes the door more visible ──────────────
        alpha += damageField * 0.4;
        alpha += crackMask * 0.35;
        alpha += glowEdge * glowPulse * 0.15;
        alpha += freshFlash * 0.5;
        alpha = min(alpha, 0.92);
    }

    gl_FragColor = vec4(color, alpha);

    #include <fog_fragment>
}
`;

// ─── IMPACT RING SHADER ────────────────────────────────────────────────────────

const _ringVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const _ringFragmentShader = /* glsl */ `
uniform float uProgress;
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center) * 2.0;

    // Expanding ring with bright leading edge
    float radius = uProgress * 0.85;
    float ringWidth = 0.12 * (1.0 - uProgress * 0.6);
    float ring = smoothstep(radius - ringWidth, radius, dist)
               * smoothstep(radius + ringWidth, radius, dist);

    // Soft inner glow (dissipates as ring expands)
    float innerGlow = smoothstep(radius, 0.0, dist) * 0.25 * (1.0 - uProgress);

    float a = (ring * 1.5 + innerGlow) * uOpacity * (1.0 - uProgress * uProgress);

    gl_FragColor = vec4(uColor, a);
}
`;


// ════════════════════════════════════════════════════════════════════════════════
//  DOOR DAMAGE SYSTEM
//  Manages the door damage shader, impact tracking, and all VFX.
// ════════════════════════════════════════════════════════════════════════════════

export class DoorDamageSystem {

    constructor() {
        this._scene = null;
        this._materials = [];       // ShaderMaterial instances (one per door panel)
        this._impacts = [];          // {u, v, strength, time, panelIndex}
        this._rings = [];            // Active expanding ring VFX
        this._particles = [];        // Enhanced particles (splinters, dust, sparks)
        this._flashLights = [];      // Impact point lights + sprites
        this._damageLevel = 0;       // 0-1 overall
        this._time = 0;
        this._doorConfig = null;
        this._initialized = false;

        // Pre-allocated uniform arrays
        this._uImpacts = [];
        this._uImpactStrengths = [];
        this._uImpactTimes = [];
        for (let i = 0; i < MAX_IMPACTS; i++) {
            this._uImpacts.push(new THREE.Vector2(0, 0));
            this._uImpactStrengths.push(0);
            this._uImpactTimes.push(-999);
        }

        // Shared geometries (reused across particle spawns)
        this._splinterGeos = null;
        this._dustGeo = null;
        this._sparkGeo = null;
    }

    // ── PUBLIC API ──────────────────────────────────────────────────────────────

    /**
     * Initialize the damage system for a door group.
     * Auto-detects door dimensions and replaces the material.
     * Removes old crack overlay groups.
     *
     * @param {THREE.Group} doorGroup
     * @param {THREE.Scene} scene
     */
    init(doorGroup, scene) {
        this._scene = scene;
        this._initialized = true;

        const ud = doorGroup.userData;
        const panels = ud.doorPanels || (ud.door ? [ud.door] : []);
        if (panels.length === 0) return;

        // Auto-detect door config from the first panel
        const refPanel = panels[0];
        refPanel.geometry.computeBoundingBox();
        const bb = refPanel.geometry.boundingBox;
        const width = bb.max.x - bb.min.x;
        const height = bb.max.y - bb.min.y;
        const centerY = refPanel.position.y;

        // Detect panel offsets (for dual-door airplane)
        const panelOffsets = panels.map(p => {
            // Panel may be inside a sub-group (panelGroup) with an x offset
            if (p.parent && p.parent !== doorGroup) {
                return p.parent.position.x;
            }
            return 0;
        });

        this._doorConfig = {
            width,
            height,
            centerY,
            baseColor: ud.originalColor || PALETTE.wood,
            baseOpacity: 0.2,
            panels,
            panelOffsets,
            doorZ: doorGroup.position.z,
        };

        // Create shared particle geometries
        this._splinterGeos = [
            new THREE.BoxGeometry(0.25, 0.06, 0.04),   // long splinter
            new THREE.BoxGeometry(0.12, 0.06, 0.04),    // short chip
            new THREE.TetrahedronGeometry(0.05, 0),      // shard
        ];
        this._dustGeo = new THREE.SphereGeometry(0.12, 4, 4);
        this._sparkGeo = new THREE.SphereGeometry(0.04, 3, 3);

        // Create the door damage ShaderMaterial for each panel
        const halfW = width / 2;
        const halfH = height / 2;

        for (const panel of panels) {
            const mat = this._createDoorMaterial(halfW, halfH);
            if (panel.material) {
                panel.material.dispose();
            }
            panel.material = mat;
            this._materials.push(mat);
        }

        // Remove old crack overlay groups (replaced by shader)
        this._removeCracks(ud, 'cracks');
        this._removeCracks(ud, 'cracksRight');
    }

    /**
     * Register a new impact on the door.
     */
    addImpact(worldX, worldY, damage, time, panelIndex) {
        if (!this._initialized || !this._doorConfig) return;

        const cfg = this._doorConfig;

        // Determine which panel (for dual-door)
        if (panelIndex === undefined) {
            if (cfg.panelOffsets.length > 1) {
                // Pick closest panel
                let bestIdx = 0, bestDist = Infinity;
                for (let i = 0; i < cfg.panelOffsets.length; i++) {
                    const d = Math.abs(worldX - cfg.panelOffsets[i]);
                    if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
                panelIndex = bestIdx;
            } else {
                panelIndex = 0;
            }
        }

        // Convert world position to door UV (0-1)
        const offset = cfg.panelOffsets[panelIndex] || 0;
        const localX = worldX - offset;
        const localY = worldY - (cfg.centerY - cfg.height / 2);
        const u = Math.max(0.05, Math.min(0.95, (localX + cfg.width / 2) / cfg.width));
        const v = Math.max(0.05, Math.min(0.95, localY / cfg.height));

        // Strength scales with damage
        const strength = Math.min(1.0, damage / 4.0) * 0.7 + 0.3;

        // Add to impact list (circular buffer)
        this._impacts.push({ u, v, strength, time, panelIndex });
        if (this._impacts.length > MAX_IMPACTS) {
            this._impacts.shift();
        }

        // Update shader uniforms
        this._syncUniforms();

        // Spawn VFX at the world-space impact point
        this._spawnImpactRing(worldX, worldY, cfg.doorZ, strength);
        this._spawnEnhancedParticles(worldX, worldY, cfg.doorZ, damage);
        this._spawnImpactFlash(worldX, worldY, cfg.doorZ, damage);
    }

    /**
     * Set the overall damage level (0 = pristine, 1 = destroyed).
     */
    setDamageLevel(level) {
        this._damageLevel = Math.max(0, Math.min(1, level));
        for (const mat of this._materials) {
            mat.uniforms.uDamageLevel.value = this._damageLevel;
        }
    }

    /**
     * Trigger heal flash (e.g. for L1 Double Flush upgrade).
     * Fades out over ~1 second.
     */
    triggerHealFlash() {
        this._healFlashTimer = 1.0;
        for (const mat of this._materials) {
            mat.uniforms.uHealFlash.value = 1.0;
        }
    }

    /**
     * Update every frame. Call from the main game loop.
     */
    update(dt, time) {
        if (!this._initialized) return;
        this._time = time;

        // Update shader time
        for (const mat of this._materials) {
            mat.uniforms.uTime.value = time;
        }

        // Heal flash decay
        if (this._healFlashTimer > 0) {
            this._healFlashTimer -= dt;
            const val = Math.max(0, this._healFlashTimer);
            for (const mat of this._materials) {
                mat.uniforms.uHealFlash.value = val;
            }
        }

        // Update impact rings
        for (let i = this._rings.length - 1; i >= 0; i--) {
            const ring = this._rings[i];
            ring.life -= dt;
            if (ring.life <= 0) {
                this._scene.remove(ring.mesh);
                ring.mesh.geometry.dispose();
                ring.mesh.material.dispose();
                this._rings.splice(i, 1);
            } else {
                const t = 1 - ring.life / ring.maxLife;
                ring.mesh.material.uniforms.uProgress.value = t;
                ring.mesh.material.uniforms.uOpacity.value = 0.9 * (1 - t * t);
                const s = 1 + t * 2.5;
                ring.mesh.scale.set(s, s, 1);
            }
        }

        // Update particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life -= dt;
            p.vy -= p.gravity * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.mesh.rotation.x += p.rotX * dt;
            p.mesh.rotation.z += p.rotZ * dt;

            const lifeRatio = p.life / p.maxLife;
            const fade = Math.min(1, lifeRatio / 0.3);
            p.mesh.material.opacity = fade * p.baseOpacity;
            p.mesh.material.transparent = true;
            const s = Math.max(0.05, fade);
            p.mesh.scale.set(s, s, s);

            if (p.life <= 0 || p.mesh.position.y < -1) {
                this._scene.remove(p.mesh);
                // Don't dispose shared geometries
                if (!p.sharedGeo) p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this._particles.splice(i, 1);
            }
        }

        // Update flash lights + sprites
        for (let i = this._flashLights.length - 1; i >= 0; i--) {
            const fl = this._flashLights[i];
            fl.life -= dt;
            if (fl.life <= 0) {
                this._scene.remove(fl.light);
                if (fl.sprite) {
                    this._scene.remove(fl.sprite);
                    fl.sprite.material.dispose();
                }
                this._flashLights.splice(i, 1);
            } else {
                const t = fl.life / fl.maxLife;
                fl.light.intensity = fl.startIntensity * t * t;
                if (fl.sprite) {
                    fl.sprite.material.opacity = t * t * 0.7;
                    const s = 0.8 + (1 - t) * 2.0;
                    fl.sprite.scale.set(s, s, 1);
                }
            }
        }
    }

    /**
     * Reset for new wave / game restart.
     */
    reset() {
        if (!this._initialized) return;

        this._impacts = [];
        this._damageLevel = 0;
        this._healFlashTimer = 0;

        // Clear uniform arrays
        for (let i = 0; i < MAX_IMPACTS; i++) {
            this._uImpacts[i].set(0, 0);
            this._uImpactStrengths[i] = 0;
            this._uImpactTimes[i] = -999;
        }

        // Reset materials
        for (const mat of this._materials) {
            mat.uniforms.uDamageLevel.value = 0;
            mat.uniforms.uImpactCount.value = 0;
            mat.uniforms.uHealFlash.value = 0;
        }

        // Clean up active VFX
        for (const ring of this._rings) {
            this._scene.remove(ring.mesh);
            ring.mesh.geometry.dispose();
            ring.mesh.material.dispose();
        }
        this._rings = [];

        for (const p of this._particles) {
            this._scene.remove(p.mesh);
            if (!p.sharedGeo) p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        }
        this._particles = [];

        for (const fl of this._flashLights) {
            this._scene.remove(fl.light);
            if (fl.sprite) {
                this._scene.remove(fl.sprite);
                fl.sprite.material.dispose();
            }
        }
        this._flashLights = [];
    }

    /**
     * Full dispose (scenario change).
     */
    dispose() {
        this.reset();
        for (const mat of this._materials) {
            mat.dispose();
        }
        this._materials = [];
        if (this._splinterGeos) {
            this._splinterGeos.forEach(g => g.dispose());
            this._splinterGeos = null;
        }
        if (this._dustGeo) { this._dustGeo.dispose(); this._dustGeo = null; }
        if (this._sparkGeo) { this._sparkGeo.dispose(); this._sparkGeo = null; }
        this._initialized = false;
        this._doorConfig = null;
    }

    // ── PRIVATE: Material creation ─────────────────────────────────────────────

    _createDoorMaterial(halfW, halfH) {
        const cfg = this._doorConfig;

        // Merge fog uniforms
        let fogUniforms = {};
        if (THREE.UniformsLib && THREE.UniformsLib.fog) {
            fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
        }

        const uniforms = {
            uBaseColor:       { value: new THREE.Color(cfg.baseColor) },
            uDarkColor:       { value: new THREE.Color(PALETTE.ink) },
            uCrackGlow:       { value: new THREE.Color(PALETTE.glow) },
            uDangerColor:     { value: new THREE.Color(PALETTE.danger) },
            uLightDir:        { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
            uTime:            { value: 0 },
            uDamageLevel:     { value: 0 },
            uBaseOpacity:     { value: cfg.baseOpacity || 0.2 },
            uDoorHalfW:       { value: halfW },
            uDoorHalfH:       { value: halfH },
            uImpacts:         { value: this._uImpacts },
            uImpactStrengths: { value: this._uImpactStrengths },
            uImpactTimes:     { value: this._uImpactTimes },
            uImpactCount:     { value: 0 },
            uHealFlash:       { value: 0 },
            ...fogUniforms,
        };

        return new THREE.ShaderMaterial({
            vertexShader: doorDamageVertexShader,
            fragmentShader: doorDamageFragmentShader,
            uniforms,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            fog: true,
        });
    }

    // ── PRIVATE: Remove old crack groups ───────────────────────────────────────

    _removeCracks(userData, key) {
        const arr = userData[key];
        if (arr && Array.isArray(arr)) {
            for (const crack of arr) {
                if (crack.parent) crack.parent.remove(crack);
                crack.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        }
        // Set to empty array so existing forEach calls are safe
        userData[key] = [];
    }

    // ── PRIVATE: Sync uniform arrays ──────────────────────────────────────────

    _syncUniforms() {
        const impacts = this._impacts;
        const count = impacts.length;

        for (let i = 0; i < MAX_IMPACTS; i++) {
            if (i < count) {
                this._uImpacts[i].set(impacts[i].u, impacts[i].v);
                this._uImpactStrengths[i] = impacts[i].strength;
                this._uImpactTimes[i] = impacts[i].time;
            } else {
                this._uImpacts[i].set(0, 0);
                this._uImpactStrengths[i] = 0;
                this._uImpactTimes[i] = -999;
            }
        }

        for (const mat of this._materials) {
            mat.uniforms.uImpactCount.value = count;
        }
    }

    // ── PRIVATE: Impact ring VFX ──────────────────────────────────────────────

    _spawnImpactRing(x, y, z, strength) {
        const size = 1.5 + strength * 1.5;
        const geo = new THREE.PlaneGeometry(size, size);
        const mat = new THREE.ShaderMaterial({
            vertexShader: _ringVertexShader,
            fragmentShader: _ringFragmentShader,
            uniforms: {
                uProgress: { value: 0 },
                uColor:    { value: new THREE.Color(PALETTE.glow) },
                uOpacity:  { value: 0.9 },
            },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });

        const ring = new THREE.Mesh(geo, mat);
        ring.position.set(x, y, z - 0.08);
        // Face toward camera (approximately -z direction)
        ring.lookAt(x, y, z - 5);
        this._scene.add(ring);

        this._rings.push({
            mesh: ring,
            life: 0.45,
            maxLife: 0.45,
        });
    }

    // ── PRIVATE: Enhanced particles ───────────────────────────────────────────

    _spawnEnhancedParticles(x, y, z, damage) {
        const cfg = this._doorConfig;
        const chipColor = cfg.baseColor;

        // ── Wood splinters (main debris) ──────────────────────────────
        const splinterCount = 12 + Math.floor(damage * 3);
        for (let i = 0; i < splinterCount; i++) {
            const geoIdx = Math.floor(Math.random() * this._splinterGeos.length);
            const geo = this._splinterGeos[geoIdx];

            // Slightly vary the wood color per chip
            const colorVar = new THREE.Color(chipColor);
            colorVar.offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);

            const mat = new THREE.MeshBasicMaterial({
                color: colorVar,
                transparent: true,
                opacity: 0.9,
            });

            const chip = new THREE.Mesh(geo, mat);
            chip.position.set(
                x + (Math.random() - 0.5) * 1.0,
                y + (Math.random() - 0.5) * 0.6,
                z - 0.05
            );
            chip.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            this._scene.add(chip);

            this._particles.push({
                mesh: chip,
                vx: (Math.random() - 0.5) * 7,
                vy: 2 + Math.random() * 5,
                vz: -(2 + Math.random() * 4),
                rotX: (Math.random() - 0.5) * 14,
                rotZ: (Math.random() - 0.5) * 10,
                life: 0.6 + Math.random() * 0.5,
                maxLife: 0.6 + Math.random() * 0.5,
                gravity: 13 + Math.random() * 4,
                baseOpacity: 0.9,
                sharedGeo: true,
            });
        }

        // ── Dust puff (soft rising particles) ─────────────────────────
        const dustCount = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < dustCount; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(PALETTE.cream),
                transparent: true,
                opacity: 0.25,
                depthWrite: false,
            });

            const dust = new THREE.Mesh(this._dustGeo, mat);
            dust.position.set(
                x + (Math.random() - 0.5) * 1.2,
                y + (Math.random() - 0.5) * 0.4,
                z - 0.2
            );
            const s = 0.8 + Math.random() * 0.6;
            dust.scale.set(s, s, s);
            this._scene.add(dust);

            this._particles.push({
                mesh: dust,
                vx: (Math.random() - 0.5) * 1.5,
                vy: 1.0 + Math.random() * 1.5,
                vz: -(0.5 + Math.random() * 1.0),
                rotX: 0,
                rotZ: 0,
                life: 0.7 + Math.random() * 0.5,
                maxLife: 0.7 + Math.random() * 0.5,
                gravity: -0.3, // negative = floats up
                baseOpacity: 0.25,
                sharedGeo: true,
            });
        }

        // ── Spark/glow particles (bright quick flashes) ───────────────
        const sparkCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < sparkCount; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(PALETTE.glow),
                transparent: true,
                opacity: 1.0,
                depthWrite: false,
            });

            const spark = new THREE.Mesh(this._sparkGeo, mat);
            spark.position.set(
                x + (Math.random() - 0.5) * 0.6,
                y + (Math.random() - 0.5) * 0.4,
                z - 0.1
            );
            this._scene.add(spark);

            this._particles.push({
                mesh: spark,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.2) * 7,
                vz: -(3 + Math.random() * 4),
                rotX: 0,
                rotZ: 0,
                life: 0.15 + Math.random() * 0.15,
                maxLife: 0.15 + Math.random() * 0.15,
                gravity: 3,
                baseOpacity: 1.0,
                sharedGeo: true,
            });
        }
    }

    // ── PRIVATE: Impact flash (point light + glow sprite) ─────────────────────

    _spawnImpactFlash(x, y, z, damage) {
        const intensity = 2.0 + damage * 0.5;
        const light = new THREE.PointLight(PALETTE.glow, intensity, 8, 2);
        light.position.set(x, y, z - 0.5);
        this._scene.add(light);

        // Additive glow sprite
        const spriteMat = new THREE.SpriteMaterial({
            color: PALETTE.glow,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(x, y, z - 0.25);
        sprite.scale.set(1.2, 1.2, 1);
        this._scene.add(sprite);

        this._flashLights.push({
            light,
            sprite,
            life: 0.2,
            maxLife: 0.2,
            startIntensity: intensity,
        });
    }
}

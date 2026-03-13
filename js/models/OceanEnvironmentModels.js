// OceanEnvironmentModels.js — Low-poly 3D ocean environment for "Hold It In"
// Ocean scenario: outhouse on a log raft, floating on open water.
// All functions return THREE.Group objects with toon materials.

import { PALETTE } from '../data/palette.js';
import { toonMat, matWood, matDark, matInk, outlineMatStatic } from '../shaders/toonMaterials.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Color Conversions ──────────────────────────────────────────────────────

/** Convert a PALETTE hex int to a vec3 string for GLSL */
function hexToVec3(hex) {
    const r = ((hex >> 16) & 0xff) / 255;
    const g = ((hex >> 8) & 0xff) / 255;
    const b = (hex & 0xff) / 255;
    return `vec3(${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)})`;
}

// ─── 1. Ocean Water ─────────────────────────────────────────────────────────
// Toon-shaded Gerstner wave ocean with procedural foam, Fresnel depth,
// anime highlight lines, and ink outlines on wave crests.

export function createOceanWater() {
    const group = new THREE.Group();
    group.name = 'oceanWater';

    const waterVertexShader = /* glsl */ `
        #include <fog_pars_vertex>

        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
        varying vec2 vUv;

        // Gerstner wave: computes displacement AND accumulates normal
        // dir = wave direction, Q = steepness (0-1), wl = wavelength, spd = speed multiplier
        void addWave(vec2 sp, vec2 dir, float Q, float wl, float spd,
                     inout vec3 disp, inout vec3 norm) {
            float k  = 6.28318 / wl;
            float w  = sqrt(9.8 * k);
            vec2  d  = normalize(dir);
            float f  = k * dot(d, sp) - w * spd * uTime;
            float A  = Q / k;
            float cf = cos(f);
            float sf = sin(f);

            // Horizontal + vertical displacement (peaked crests, flat troughs)
            disp.x += d.x * A * cf;
            disp.y += A * sf;
            disp.z += d.y * A * cf;

            // Analytical normal contribution
            norm.x += -d.x * Q * cf;
            norm.y -= Q * sf;
            norm.z += -d.y * Q * cf;
        }

        void main() {
            vUv = uv;

            // Transform to world space for consistent wave sampling
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vec2 sp = worldPos.xz;

            vec3 disp = vec3(0.0);
            vec3 norm = vec3(0.0, 1.0, 0.0);

            // 4 Gerstner waves — layered for natural ocean motion
            addWave(sp, vec2(1.0, 0.5),  0.12, 30.0, 0.8, disp, norm); // Long swell
            addWave(sp, vec2(-0.4, 1.0), 0.10, 20.0, 0.6, disp, norm); // Cross swell
            addWave(sp, vec2(0.6, 0.7),  0.18, 12.0, 1.0, disp, norm); // Medium chop
            addWave(sp, vec2(-0.2, 0.9), 0.10,  6.0, 1.3, disp, norm); // Small ripples

            worldPos.xyz += disp;
            vWaveHeight = disp.y;
            vWorldPos = worldPos.xyz;
            vNormal = normalize(norm);

            vec4 mvPosition = viewMatrix * worldPos;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
        }
    `;

    const waterFragmentShader = /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>

        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
        varying vec2 vUv;

        // Palette colors
        const vec3 COL_DEEP = ${hexToVec3(PALETTE.oceanDeep)};
        const vec3 COL_MID  = ${hexToVec3(PALETTE.oceanMid)};
        const vec3 COL_SURF = ${hexToVec3(PALETTE.oceanSurf)};
        const vec3 COL_FOAM = ${hexToVec3(PALETTE.oceanFoam)};
        const vec3 COL_INK  = ${hexToVec3(PALETTE.ink)};

        // ── Procedural noise (texture-free) ──
        float hash21(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 3; i++) {
                v += a * noise(p);
                p *= 2.0;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec3 N = normalize(vNormal);
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            vec2 sp = vWorldPos.xz;

            // ── 1. Base color: 3-tone cel bands from wave height ──
            float hNorm = smoothstep(-1.5, 1.5, vWaveHeight);
            vec3 color = COL_DEEP;
            color = mix(color, COL_MID,  smoothstep(0.30, 0.38, hNorm));
            color = mix(color, COL_SURF, smoothstep(0.58, 0.66, hNorm));

            // ── 2. Fresnel: darken at grazing angles for depth ──
            float fresnel = 1.0 - max(dot(N, viewDir), 0.0);
            fresnel = pow(fresnel, 2.5);
            color = mix(color, COL_DEEP, smoothstep(0.3, 0.6, fresnel) * 0.35);

            // ── 3. Surface detail: dual-layer scrolling noise (painted look) ──
            float d1 = noise(sp * 1.8 + vec2(uTime * 0.4, -uTime * 0.25));
            float d2 = noise(sp * 3.5 + vec2(-uTime * 0.3, uTime * 0.35));
            float detail = d1 * 0.6 + d2 * 0.4;
            color *= 0.90 + detail * 0.20;

            // ── 4. Foam: organic noise whitecaps on crests ──
            float fn1 = fbm(sp * 0.6 + vec2(uTime * 0.25, uTime * 0.15));
            float fn2 = noise(sp * 1.2 + vec2(-uTime * 0.15, uTime * 0.3));
            float foamNoise = fn1 * 0.65 + fn2 * 0.35;

            float crestMask = smoothstep(0.45, 0.75, hNorm);
            float foam = smoothstep(0.30, 0.42, crestMask * foamNoise);

            // Scattered foam blobs across surface
            foam = max(foam, smoothstep(0.72, 0.78, foamNoise) * 0.35);

            color = mix(color, COL_FOAM, foam);

            // ── 5. Anime highlight lines (scrolling interference pattern) ──
            float r1 = sin(sp.x * 1.8 + sp.y * 0.5 + uTime * 1.0);
            float r2 = sin(sp.x * 0.4 + sp.y * 2.2 - uTime * 0.7);
            float highlight = smoothstep(0.88, 0.95, r1 * r2);
            vec3 hlColor = mix(COL_FOAM, COL_SURF, 0.3);
            color = mix(color, hlColor, highlight * 0.30);

            // ── 6. Toon specular (sun glint) ──
            vec3 lightDir = normalize(vec3(0.2, 0.9, 0.4));
            vec3 halfVec = normalize(lightDir + viewDir);
            float spec = max(dot(N, halfVec), 0.0);
            color = mix(color, COL_FOAM, smoothstep(0.90, 0.95, spec) * 0.75);

            // ── 7. Ink outlines on steep wave faces ──
            float steepness = 1.0 - N.y;
            color = mix(color, COL_INK, smoothstep(0.28, 0.36, steepness) * 0.5);

            // ── 8. Subtle contour lines at tone boundaries ──
            float ew = 0.022;
            float e1 = smoothstep(0.34 - ew, 0.34, hNorm) - smoothstep(0.34, 0.34 + ew, hNorm);
            float e2 = smoothstep(0.62 - ew, 0.62, hNorm) - smoothstep(0.62, 0.62 + ew, hNorm);
            color = mix(color, COL_INK, max(e1, e2) * 0.25);

            gl_FragColor = vec4(color, 1.0);
            #include <fog_fragment>
        }
    `;

    const uniforms = {
        uTime: { value: 0.0 },
    };
    if (THREE.UniformsLib && THREE.UniformsLib.fog) {
        const fogUniforms = THREE.UniformsUtils.clone(THREE.UniformsLib.fog);
        Object.assign(uniforms, fogUniforms);
    }

    const waterMat = new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms,
        fog: true,
    });

    const waterGeo = new THREE.PlaneGeometry(200, 200, 200, 200);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -0.5, 35);
    waterMesh.receiveShadow = true;
    group.add(waterMesh);

    group.userData.waterMesh = waterMesh;

    return group;
}

// ─── 2. Ocean Raft + Outhouse ───────────────────────────────────────────────
// A makeshift log raft with a rustic outhouse structure built on top.
// Logs lashed to planks form the base; the outhouse surrounds the toilet.

export function createOceanRaft() {
    const group = new THREE.Group();
    group.name = 'oceanRaft';

    const logMat = toonMat(PALETTE.oceanBoatWood);
    const plankMat = toonMat(PALETTE.oceanBoatDark);
    const ropeMat = toonMat(PALETTE.oceanRope);
    const gapMat = matDark();

    // ─── Raft base: logs lashed to planks ───────────────────────────────

    // 5 logs running lengthwise (Z axis), slightly varied radii for organic feel
    const logLength = 6.5;
    const logData = [
        { x: -1.8, r: 0.24 },
        { x: -0.9, r: 0.20 },
        { x:  0.0, r: 0.22 },
        { x:  0.9, r: 0.21 },
        { x:  1.8, r: 0.23 },
    ];

    for (const ld of logData) {
        const logGeo = new THREE.CylinderGeometry(ld.r, ld.r * 0.92, logLength, 8);
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.x = Math.PI / 2; // lay flat along Z
        log.position.set(ld.x, -0.12, 0);
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
    }

    // Log end-grain visible at front and back (dark circles)
    for (const ld of logData) {
        for (const zSign of [-1, 1]) {
            const capGeo = new THREE.CircleGeometry(ld.r * 0.85, 8);
            const cap = new THREE.Mesh(capGeo, plankMat);
            cap.position.set(ld.x, -0.12, zSign * logLength / 2);
            if (zSign < 0) cap.rotation.y = Math.PI;
            group.add(cap);
        }
    }

    // Cross planks across the top (perpendicular to logs)
    const plankZPositions = [-2.8, -2.0, -1.2, -0.4, 0.4, 1.2, 2.0, 2.8];
    for (const pz of plankZPositions) {
        const pw = 4.2 + (Math.sin(pz * 3.7) * 0.15); // slight width variation
        const plankGeo = new THREE.BoxGeometry(pw, 0.06, 0.32);
        const plank = new THREE.Mesh(plankGeo, plankMat);
        plank.position.set(0, 0.1, pz);
        plank.castShadow = true;
        plank.receiveShadow = true;
        group.add(plank);

        // Plank gap line
        const gapLineGeo = new THREE.BoxGeometry(pw - 0.1, 0.01, 0.01);
        const gapLine = new THREE.Mesh(gapLineGeo, gapMat);
        gapLine.position.set(0, 0.14, pz + 0.14);
        group.add(gapLine);
    }

    // Rope lashings where planks cross outer logs
    const ropeGeo = new THREE.TorusGeometry(0.10, 0.022, 4, 8);
    const lashXPositions = [-1.8, 0, 1.8];
    const lashZPositions = [-2.8, -1.2, 1.2, 2.8];
    for (const lx of lashXPositions) {
        for (const lz of lashZPositions) {
            const rope = new THREE.Mesh(ropeGeo, ropeMat);
            rope.rotation.x = -Math.PI / 2;
            rope.position.set(lx, 0.08, lz);
            group.add(rope);
        }
    }

    // ─── Outhouse structure on the raft ─────────────────────────────────
    // 3x3 outhouse centered at z=0 local, front (door) faces +Z (north)

    const wallThickness = 0.12;
    const wallHeight = 3.6;
    const yBase = 0.15; // base of walls on deck

    // Back wall (south side)
    const backWallGeo = new THREE.BoxGeometry(3.0, wallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, logMat);
    backWall.position.set(0, yBase + wallHeight / 2, -1.44);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Left wall (west side)
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 3.0);
    const leftWall = new THREE.Mesh(sideWallGeo, logMat);
    leftWall.position.set(-1.44, yBase + wallHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Right wall (east side)
    const rightWall = new THREE.Mesh(sideWallGeo, logMat);
    rightWall.position.set(1.44, yBase + wallHeight / 2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Front wall — narrow panels flanking the 2-unit door opening
    const frontPanelGeo = new THREE.BoxGeometry(0.5, wallHeight, wallThickness);
    const frontLeft = new THREE.Mesh(frontPanelGeo, logMat);
    frontLeft.position.set(-1.25, yBase + wallHeight / 2, 1.44);
    frontLeft.castShadow = true;
    group.add(frontLeft);

    const frontRight = new THREE.Mesh(frontPanelGeo, logMat);
    frontRight.position.set(1.25, yBase + wallHeight / 2, 1.44);
    frontRight.castShadow = true;
    group.add(frontRight);

    // Transom above door
    const transomGeo = new THREE.BoxGeometry(2.0, 0.4, wallThickness);
    const transomMesh = new THREE.Mesh(transomGeo, logMat);
    transomMesh.position.set(0, yBase + wallHeight - 0.2, 1.44);
    transomMesh.castShadow = true;
    group.add(transomMesh);

    // Horizontal plank gap lines on back wall
    for (let i = 1; i <= 3; i++) {
        const bgGeo = new THREE.BoxGeometry(2.9, 0.02, 0.01);
        const bg = new THREE.Mesh(bgGeo, gapMat);
        bg.position.set(0, yBase + i * 0.95, -1.44 + wallThickness / 2 + 0.01);
        group.add(bg);
    }

    // Moon cutout on back wall (classic outhouse detail)
    const moonGeo = new THREE.CircleGeometry(0.18, 8);
    const moonMat2 = toonMat(PALETTE.oceanSun, {
        emissive: PALETTE.oceanSun,
        emissiveIntensity: 0.4,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat2);
    moon.position.set(0, yBase + wallHeight - 0.7, -1.44 + wallThickness / 2 + 0.02);
    group.add(moon);

    // Warm lantern light inside the outhouse
    const lanternLight = new THREE.PointLight(PALETTE.oceanSun, 0.35, 6);
    lanternLight.position.set(-0.7, 1.5, -0.8);
    group.add(lanternLight);

    // Small lantern body on back wall
    const fixtureMat2 = toonMat(PALETTE.fixture);
    const lanternBodyGeo = new THREE.BoxGeometry(0.12, 0.18, 0.12);
    const lanternBody = new THREE.Mesh(lanternBodyGeo, fixtureMat2);
    lanternBody.position.set(-0.7, 1.4, -1.3);
    group.add(lanternBody);

    // Position the raft at the toilet location
    group.position.set(0, 0.3, 3);

    return group;
}

// ─── 3. Outhouse Door (North Edge of Raft) ──────────────────────────────────
// Rustic wooden door that enemies attack. Moon cutout, hinges, damage cracks.

export function createOceanOuthouseDoor() {
    const group = new THREE.Group();
    group.name = 'oceanOuthouseDoor';

    const doorColor = PALETTE.oceanBoatWood;

    const doorMat = toonMat(doorColor, {
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    doorMat.depthWrite = false;

    // --- Door panel ---
    const doorGeo = new THREE.BoxGeometry(2.0, 3.2, 0.1);
    const doorPanel = new THREE.Mesh(doorGeo, doorMat);
    doorPanel.position.set(0, 1.75, 0);
    doorPanel.castShadow = false;
    doorPanel.receiveShadow = false;
    group.add(doorPanel);

    // --- Horizontal plank lines on door ---
    const plankLineMat = matDark();
    for (let i = 1; i <= 3; i++) {
        const lineGeo = new THREE.BoxGeometry(1.9, 0.02, 0.01);
        const line = new THREE.Mesh(lineGeo, plankLineMat);
        line.position.set(0, 0.3 + i * 0.8, 0.06);
        group.add(line);
    }

    // --- Moon cutout circle (upper door) ---
    const moonGeo = new THREE.CircleGeometry(0.18, 8);
    const moonDoorMat = toonMat(PALETTE.oceanSun, {
        emissive: PALETTE.oceanSun,
        emissiveIntensity: 0.5,
    });
    const moonCutout = new THREE.Mesh(moonGeo, moonDoorMat);
    moonCutout.position.set(0, 2.8, 0.06);
    group.add(moonCutout);

    // --- Rustic handle (wooden peg) ---
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    const handleMat2 = toonMat(PALETTE.oceanBoatDark);
    const handle = new THREE.Mesh(handleGeo, handleMat2);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.7, 1.6, 0.12);
    group.add(handle);

    // --- Hinges (two dark cylinders on left side) ---
    const hingeMat = matInk();
    for (let i = 0; i < 2; i++) {
        const hingeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6);
        const hinge = new THREE.Mesh(hingeGeo, hingeMat);
        hinge.position.set(-0.95, 0.8 + i * 1.8, 0.06);
        group.add(hinge);

        const plateGeo = new THREE.BoxGeometry(0.2, 0.1, 0.02);
        const plate = new THREE.Mesh(plateGeo, hingeMat);
        plate.position.set(-0.85, 0.8 + i * 1.8, 0.055);
        group.add(plate);
    }

    // --- Metal reinforcement strips ---
    const metalMat = toonMat(PALETTE.fixture);
    for (let i = 0; i < 2; i++) {
        const stripGeo = new THREE.BoxGeometry(1.9, 0.06, 0.03);
        const strip = new THREE.Mesh(stripGeo, metalMat);
        strip.position.set(0, 0.5 + i * 2.0, 0.07);
        group.add(strip);
    }

    // --- Bolt heads on strips ---
    const boltMat = matInk();
    for (let i = 0; i < 2; i++) {
        for (let bx = -0.7; bx <= 0.7; bx += 0.35) {
            const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6);
            const bolt = new THREE.Mesh(boltGeo, boltMat);
            bolt.rotation.x = Math.PI / 2;
            bolt.position.set(bx, 0.5 + i * 2.0, 0.09);
            group.add(bolt);
        }
    }

    // --- Crack / damage overlay meshes (Fortnite-style 3-layer glow) ---
    // Three layers per segment: soft halo → dark outline → bright glow center
    const crackDarkMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.9 });
    const crackGlowMat = new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0.85 });
    const crackHaloMat = new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0.25 });
    const cracks = [];

    function buildCrack(segments, zBase) {
        const crackGroup = new THREE.Group();
        for (const seg of segments) {
            const haloGeo = new THREE.BoxGeometry(seg.w * 1.6, seg.h * 4, 0.01);
            const haloMesh = new THREE.Mesh(haloGeo, crackHaloMat);
            haloMesh.position.set(seg.x, seg.y, zBase - 0.003);
            if (seg.rot) haloMesh.rotation.z = seg.rot;
            crackGroup.add(haloMesh);

            const darkGeo = new THREE.BoxGeometry(seg.w * 1.2, seg.h * 2.5, 0.01);
            const darkMesh = new THREE.Mesh(darkGeo, crackDarkMat);
            darkMesh.position.set(seg.x, seg.y, zBase);
            if (seg.rot) darkMesh.rotation.z = seg.rot;
            crackGroup.add(darkMesh);

            const glowGeo = new THREE.BoxGeometry(seg.w, seg.h * 1.5, 0.01);
            const glowMesh = new THREE.Mesh(glowGeo, crackGlowMat);
            glowMesh.position.set(seg.x, seg.y, zBase + 0.003);
            if (seg.rot) glowMesh.rotation.z = seg.rot;
            crackGroup.add(glowMesh);
        }
        crackGroup.visible = false;
        return crackGroup;
    }

    // Crack 0 — upper left (HP ≤ 80%)
    const crack0 = buildCrack([
        { x: -0.6, y: 2.2, w: 0.42, h: 0.08, rot: 0.3 },
        { x: -0.45, y: 2.1, w: 0.32, h: 0.08, rot: -0.5 },
        { x: -0.35, y: 2.0, w: 0.25, h: 0.07, rot: 0.15 },
        { x: -0.7, y: 2.12, w: 0.2, h: 0.07, rot: -0.3 },
        { x: -0.25, y: 1.95, w: 0.2, h: 0.06, rot: 0.55 },
    ], 0.07);
    crack0.name = 'crack_0';
    group.add(crack0);
    cracks.push(crack0);

    // Crack 1 — center right (HP ≤ 60%)
    const crack1 = buildCrack([
        { x: 0.5, y: 1.5, w: 0.48, h: 0.08, rot: -0.2 },
        { x: 0.7, y: 1.4, w: 0.38, h: 0.08, rot: 0.5 },
        { x: 0.4, y: 1.6, w: 0.25, h: 0.07, rot: -0.4 },
        { x: 0.8, y: 1.32, w: 0.22, h: 0.07, rot: -0.1 },
        { x: 0.35, y: 1.45, w: 0.2, h: 0.06, rot: 0.6 },
    ], 0.07);
    crack1.name = 'crack_1';
    group.add(crack1);
    cracks.push(crack1);

    // Crack 2 — lower center (HP ≤ 40%)
    const crack2 = buildCrack([
        { x: -0.1, y: 0.7, w: 0.55, h: 0.09, rot: 0.1 },
        { x: 0.1, y: 0.6, w: 0.42, h: 0.08, rot: -0.35 },
        { x: -0.15, y: 0.8, w: 0.3, h: 0.08, rot: 0.5 },
        { x: 0.2, y: 0.5, w: 0.25, h: 0.07, rot: -0.15 },
        { x: -0.3, y: 0.65, w: 0.22, h: 0.07, rot: 0.65 },
        { x: 0.35, y: 0.72, w: 0.18, h: 0.06, rot: -0.5 },
    ], 0.07);
    crack2.name = 'crack_2';
    group.add(crack2);
    cracks.push(crack2);

    // Crack 3 — upper right (HP ≤ 20%)
    const crack3 = buildCrack([
        { x: 0.7, y: 2.0, w: 0.38, h: 0.09, rot: -0.6 },
        { x: 0.6, y: 1.9, w: 0.3, h: 0.08, rot: 0.25 },
        { x: 0.8, y: 1.95, w: 0.25, h: 0.08, rot: -0.1 },
        { x: 0.5, y: 1.82, w: 0.22, h: 0.07, rot: 0.5 },
        { x: 0.85, y: 2.05, w: 0.18, h: 0.07, rot: -0.4 },
    ], 0.07);
    crack3.name = 'crack_3';
    group.add(crack3);
    cracks.push(crack3);

    // Crack 4 — center critical (HP ≤ 10%)
    const crack4 = buildCrack([
        { x: 0.0, y: 1.1, w: 0.6, h: 0.10, rot: 0.2 },
        { x: -0.1, y: 0.9, w: 0.42, h: 0.09, rot: -0.4 },
        { x: 0.2, y: 1.2, w: 0.38, h: 0.09, rot: 0.6 },
        { x: -0.15, y: 1.25, w: 0.3, h: 0.08, rot: -0.15 },
        { x: 0.3, y: 1.0, w: 0.25, h: 0.08, rot: -0.5 },
        { x: -0.25, y: 1.05, w: 0.2, h: 0.07, rot: 0.45 },
    ], 0.07);
    crack4.name = 'crack_4';
    group.add(crack4);
    cracks.push(crack4);

    // --- Store metadata on group.userData (matches door interface) ---
    group.userData.door = doorPanel;
    group.userData.cracks = cracks;
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    // Position at front of the outhouse (north edge of raft)
    group.position.set(0, 0, 4.5);

    return group;
}

// ─── 4. Buoy Platform ──────────────────────────────────────────────────────

export function createBuoyPlatform() {
    const group = new THREE.Group();
    group.name = 'buoyPlatform';

    const redMat = toonMat(PALETTE.oceanBuoy);
    const yellowMat = toonMat(PALETTE.oceanBuoyYellow);
    const ropeMat = toonMat(PALETTE.oceanRope);
    const darkMat = matInk();

    // --- Ring float (life preserver shape) ---
    // Top half — red
    const ringGeo = new THREE.TorusGeometry(0.5, 0.15, 8, 16);
    const ringRed = new THREE.Mesh(ringGeo, redMat);
    ringRed.rotation.x = -Math.PI / 2;
    ringRed.position.y = 0.0;
    ringRed.castShadow = true;
    ringRed.receiveShadow = true;
    group.add(ringRed);

    // Yellow stripe bands (4 sections around the ring)
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const stripeGeo = new THREE.BoxGeometry(0.18, 0.08, 0.32);
        const stripe = new THREE.Mesh(stripeGeo, yellowMat);
        stripe.position.set(
            Math.cos(angle) * 0.5,
            0.0,
            Math.sin(angle) * 0.5
        );
        stripe.rotation.y = -angle;
        stripe.castShadow = true;
        group.add(stripe);
    }

    // --- Center platform (flat cylinder for tower to sit on) ---
    const platformGeo = new THREE.CylinderGeometry(0.4, 0.35, 0.12, 10);
    const platformMat = toonMat(PALETTE.oceanBoatWood);
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = 0.1;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    // --- Rope/chain hanging down ---
    const chainSegments = 4;
    for (let i = 0; i < chainSegments; i++) {
        const linkGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
        const link = new THREE.Mesh(linkGeo, ropeMat);
        link.position.set(0.0, -0.15 - i * 0.14, 0.0);
        // Alternate rotation for chain link look
        link.rotation.z = i % 2 === 0 ? 0 : Math.PI / 4;
        group.add(link);
    }

    // Small anchor weight at bottom
    const weightGeo = new THREE.SphereGeometry(0.06, 6, 4);
    const weight = new THREE.Mesh(weightGeo, darkMat);
    weight.position.set(0, -0.15 - chainSegments * 0.14 - 0.06, 0);
    group.add(weight);

    return group;
}

// ─── 5. Seagulls ────────────────────────────────────────────────────────────

export function createSeagulls() {
    const group = new THREE.Group();
    group.name = 'oceanSeagulls';

    const bodyMat = toonMat(PALETTE.cream);
    const wingTipMat = toonMat(PALETTE.fixture);
    const beakMat = toonMat(PALETTE.oceanBuoyYellow);
    const inkMat = matInk();

    const seagulls = [];
    const count = 6 + Math.floor(Math.random() * 5); // 6-10

    for (let i = 0; i < count; i++) {
        const gull = new THREE.Group();
        gull.name = 'seagull';

        // Body — small elongated cylinder
        const bodyGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 6);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        body.castShadow = true;
        gull.add(body);

        // Head — small sphere
        const headGeo = new THREE.SphereGeometry(0.07, 6, 6);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.set(0.22, 0.03, 0);
        gull.add(head);

        // Beak — tiny cone
        const beakGeo = new THREE.ConeGeometry(0.025, 0.08, 4);
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.rotation.z = -Math.PI / 2;
        beak.position.set(0.32, 0.02, 0);
        gull.add(beak);

        // Eye — tiny dark sphere
        const eyeGeo = new THREE.SphereGeometry(0.012, 4, 4);
        const eye = new THREE.Mesh(eyeGeo, inkMat);
        eye.position.set(0.26, 0.06, 0.05);
        gull.add(eye);

        // --- Wings (triangular shapes) ---
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(0.35, 0.05);
        wingShape.lineTo(0.25, -0.15);
        wingShape.lineTo(0.05, -0.05);
        wingShape.closePath();

        const wingGeo = new THREE.ShapeGeometry(wingShape);

        // Left wing
        const leftWing = new THREE.Mesh(wingGeo, bodyMat);
        leftWing.position.set(-0.05, 0.02, 0.08);
        leftWing.rotation.y = Math.PI / 2;
        leftWing.rotation.x = 0.2;
        gull.add(leftWing);

        // Left wing tip (darker)
        const tipShapeL = new THREE.Shape();
        tipShapeL.moveTo(0.25, -0.1);
        tipShapeL.lineTo(0.35, 0.05);
        tipShapeL.lineTo(0.25, -0.15);
        tipShapeL.closePath();

        const tipGeoL = new THREE.ShapeGeometry(tipShapeL);
        const tipL = new THREE.Mesh(tipGeoL, wingTipMat);
        tipL.position.set(-0.05, 0.02, 0.085);
        tipL.rotation.y = Math.PI / 2;
        tipL.rotation.x = 0.2;
        gull.add(tipL);

        // Right wing
        const rightWing = new THREE.Mesh(wingGeo, bodyMat);
        rightWing.position.set(-0.05, 0.02, -0.08);
        rightWing.rotation.y = -Math.PI / 2;
        rightWing.rotation.x = -0.2;
        rightWing.scale.x = -1;
        gull.add(rightWing);

        // Right wing tip (darker)
        const tipR = new THREE.Mesh(tipGeoL, wingTipMat);
        tipR.position.set(-0.05, 0.02, -0.085);
        tipR.rotation.y = -Math.PI / 2;
        tipR.rotation.x = -0.2;
        tipR.scale.x = -1;
        gull.add(tipR);

        // Tail — small wedge
        const tailGeo = new THREE.ConeGeometry(0.04, 0.12, 3);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.rotation.z = Math.PI / 2;
        tail.position.set(-0.25, 0.0, 0);
        gull.add(tail);

        // Random orbit position
        const cx = rand(-30, 30);
        const cy = rand(8, 16);
        const cz = rand(10, 60);
        gull.position.set(cx, cy, cz);

        group.add(gull);

        seagulls.push({
            mesh: gull,
            phase: Math.random() * Math.PI * 2,
            speed: rand(0.2, 0.5),
            center: new THREE.Vector3(cx, cy, cz),
            radius: rand(3, 8),
            leftWing: leftWing,
            rightWing: rightWing,
        });
    }

    group.userData.seagulls = seagulls;

    return group;
}

// ─── 6. Sun Sparkles ────────────────────────────────────────────────────────

export function createSunSparkles() {
    const group = new THREE.Group();
    group.name = 'oceanSunSparkles';

    const sparkles = [];
    const count = 15 + Math.floor(Math.random() * 11); // 15-25

    const sparkleMat = toonMat(PALETTE.gold, {
        emissive: PALETTE.gold,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8,
    });
    sparkleMat.depthWrite = false;

    for (let i = 0; i < count; i++) {
        // Diamond/star shape — a rotated box
        const sparkle = new THREE.Group();
        sparkle.name = 'sparkle';

        // Clone material per sparkle so each can twinkle independently
        const mat = sparkleMat.clone();
        mat.depthWrite = false;

        // Primary diamond (rotated plane)
        const diamondGeo = new THREE.PlaneGeometry(0.2, 0.2);
        const diamond = new THREE.Mesh(diamondGeo, mat);
        diamond.rotation.z = Math.PI / 4;
        diamond.rotation.x = -Math.PI / 2;
        sparkle.add(diamond);

        // Cross-plane for 3D look
        const crossGeo = new THREE.PlaneGeometry(0.15, 0.15);
        const cross = new THREE.Mesh(crossGeo, mat);
        cross.rotation.z = Math.PI / 4;
        cross.rotation.y = Math.PI / 2;
        sparkle.add(cross);

        // Position scattered on water surface
        const sx = rand(-40, 40);
        const sz = rand(5, 65);
        sparkle.position.set(sx, 0.5, sz);

        // Random size variation
        const s = rand(0.5, 1.5);
        sparkle.scale.set(s, s, s);

        group.add(sparkle);

        sparkles.push({
            mesh: sparkle,
            material: mat,
            phase: Math.random() * Math.PI * 2,
            baseY: 0.5,
            x: sx,
            z: sz,
        });
    }

    group.userData.sparkles = sparkles;

    return group;
}

// ─── 7. Ocean Props ─────────────────────────────────────────────────────────

export function createOceanProps() {
    const group = new THREE.Group();
    group.name = 'oceanProps';

    const woodMat = toonMat(PALETTE.oceanBoatWood);
    const darkWoodMat = toonMat(PALETTE.oceanBoatDark);
    const ropeMat = toonMat(PALETTE.oceanRope);
    const inkMat = matInk();
    const fixtureMat = toonMat(PALETTE.fixture);
    const goldMat = toonMat(PALETTE.gold, {
        emissive: PALETTE.gold,
        emissiveIntensity: 0.2,
    });

    // --- Floating barrels (3-4) ---
    const barrelCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < barrelCount; i++) {
        const barrel = new THREE.Group();
        barrel.name = 'floatingBarrel';

        const barrelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 8);
        const barrelMesh = new THREE.Mesh(barrelGeo, woodMat);
        barrelMesh.castShadow = true;
        barrelMesh.receiveShadow = true;
        barrel.add(barrelMesh);

        // Metal bands
        for (let b = -1; b <= 1; b++) {
            const bandGeo = new THREE.TorusGeometry(0.36, 0.02, 4, 12);
            const band = new THREE.Mesh(bandGeo, fixtureMat);
            band.position.y = b * 0.3;
            barrel.add(band);
        }

        // Tilt slightly for floating look
        barrel.rotation.x = rand(-0.2, 0.2);
        barrel.rotation.z = rand(-0.3, 0.3);
        barrel.position.set(
            rand(-15, 15),
            rand(-0.1, 0.2),
            rand(15, 55)
        );

        group.add(barrel);
    }

    // --- Floating crates (2-3) ---
    const crateCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < crateCount; i++) {
        const crate = new THREE.Group();
        crate.name = 'floatingCrate';

        const crateGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
        const crateMesh = new THREE.Mesh(crateGeo, woodMat);
        crateMesh.castShadow = true;
        crateMesh.receiveShadow = true;
        crate.add(crateMesh);

        // Cross slats on top
        const slatGeo = new THREE.BoxGeometry(0.72, 0.02, 0.08);
        const slatMat = darkWoodMat;
        const slat1 = new THREE.Mesh(slatGeo, slatMat);
        slat1.position.y = 0.26;
        crate.add(slat1);

        const slat2 = new THREE.Mesh(slatGeo, slatMat);
        slat2.position.y = 0.26;
        slat2.rotation.y = Math.PI / 2;
        crate.add(slat2);

        crate.rotation.y = rand(0, Math.PI);
        crate.rotation.x = rand(-0.1, 0.1);
        crate.position.set(
            rand(-18, 18),
            rand(-0.05, 0.15),
            rand(12, 58)
        );

        group.add(crate);
    }

    // --- Anchor near the boat ---
    const anchor = new THREE.Group();
    anchor.name = 'anchor';

    // Anchor shank (vertical bar)
    const shankGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const shank = new THREE.Mesh(shankGeo, fixtureMat);
    shank.position.y = -0.4;
    shank.castShadow = true;
    anchor.add(shank);

    // Anchor ring at top
    const ringGeo = new THREE.TorusGeometry(0.08, 0.02, 6, 8);
    const ring = new THREE.Mesh(ringGeo, fixtureMat);
    ring.position.y = 0.0;
    anchor.add(ring);

    // Anchor arms (curved flukes) — left
    const armGeoL = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6);
    const armL = new THREE.Mesh(armGeoL, fixtureMat);
    armL.rotation.z = Math.PI / 4;
    armL.position.set(-0.12, -0.75, 0);
    anchor.add(armL);

    // Anchor arms — right
    const armR = new THREE.Mesh(armGeoL, fixtureMat);
    armR.rotation.z = -Math.PI / 4;
    armR.position.set(0.12, -0.75, 0);
    anchor.add(armR);

    // Anchor chain going up to boat
    for (let c = 0; c < 6; c++) {
        const chainGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4);
        const chain = new THREE.Mesh(chainGeo, fixtureMat);
        chain.position.set(0, 0.05 + c * 0.1, 0);
        chain.rotation.z = c % 2 === 0 ? 0.3 : -0.3;
        anchor.add(chain);
    }

    anchor.position.set(1.8, -0.3, 1.5);
    anchor.rotation.z = 0.2;
    group.add(anchor);

    // --- Flag / pennant on thin pole at stern ---
    const flagGroup = new THREE.Group();
    flagGroup.name = 'flag';

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.025, 2.5, 6);
    const pole = new THREE.Mesh(poleGeo, darkWoodMat);
    pole.position.y = 1.25;
    pole.castShadow = true;
    flagGroup.add(pole);

    // Pennant (triangular shape)
    const pennantShape = new THREE.Shape();
    pennantShape.moveTo(0, 0);
    pennantShape.lineTo(0.6, -0.15);
    pennantShape.lineTo(0, -0.35);
    pennantShape.closePath();

    const pennantGeo = new THREE.ShapeGeometry(pennantShape);
    const pennantMat = toonMat(PALETTE.oceanBuoy, { side: THREE.DoubleSide });
    const pennant = new THREE.Mesh(pennantGeo, pennantMat);
    pennant.position.set(0.02, 2.4, 0);
    flagGroup.add(pennant);

    flagGroup.position.set(1.8, 0.3, 0.5);
    group.add(flagGroup);

    // --- Compass / lantern on forward bench ---
    const lanternGroup = new THREE.Group();
    lanternGroup.name = 'lantern';

    // Lantern body (small box)
    const lanternGeo = new THREE.BoxGeometry(0.15, 0.22, 0.15);
    const lanternMesh = new THREE.Mesh(lanternGeo, fixtureMat);
    lanternMesh.position.y = 0.11;
    lanternGroup.add(lanternMesh);

    // Lantern glass (glowing)
    const glassGeo = new THREE.BoxGeometry(0.1, 0.12, 0.1);
    const glassMat = toonMat(PALETTE.oceanSun, {
        emissive: PALETTE.oceanSun,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.7,
    });
    glassMat.depthWrite = false;
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 0.15;
    lanternGroup.add(glass);

    // Handle
    const handleGeo = new THREE.TorusGeometry(0.06, 0.01, 4, 8, Math.PI);
    const handle = new THREE.Mesh(handleGeo, fixtureMat);
    handle.position.y = 0.24;
    handle.rotation.x = Math.PI;
    lanternGroup.add(handle);

    // Small warm light
    const lanternLight = new THREE.PointLight(PALETTE.oceanSun, 0.3, 5);
    lanternLight.position.y = 0.2;
    lanternGroup.add(lanternLight);

    lanternGroup.position.set(2.2, 0.45, 2.0);
    group.add(lanternGroup);

    // --- Floating seaweed patches ---
    const seaweedMat = toonMat(PALETTE.oceanSurf, {
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
    });
    seaweedMat.depthWrite = false;

    for (let i = 0; i < 6; i++) {
        const swGeo = new THREE.PlaneGeometry(rand(0.5, 1.5), rand(0.3, 0.8));
        const seaweed = new THREE.Mesh(swGeo, seaweedMat);
        seaweed.rotation.x = -Math.PI / 2;
        seaweed.rotation.z = rand(0, Math.PI * 2);
        seaweed.position.set(
            rand(-20, 20),
            0.05,
            rand(10, 60)
        );
        seaweed.receiveShadow = true;
        group.add(seaweed);
    }

    return group;
}

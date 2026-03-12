// OceanEnvironmentModels.js — Low-poly 3D ocean environment for "Hold It In"
// Ocean scenario: small dinghy on open water, toilet on the boat.
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

// ─── 2. Dinghy ──────────────────────────────────────────────────────────────

export function createDinghy() {
    const group = new THREE.Group();
    group.name = 'dinghy';

    const plankMat = toonMat(PALETTE.oceanBoatWood);
    const keelMat = toonMat(PALETTE.oceanBoatDark);
    const ropeMat = toonMat(PALETTE.oceanRope);
    const inkMat = matInk();

    // --- Hull: wide center, tapered ends ---
    // Build hull from several boxes layered to approximate a boat shape

    // Bottom keel — flat plank running bow to stern
    const keelGeo = new THREE.BoxGeometry(1.6, 0.15, 5.5);
    const keel = new THREE.Mesh(keelGeo, keelMat);
    keel.position.set(0, -0.3, 0);
    keel.castShadow = true;
    keel.receiveShadow = true;
    group.add(keel);

    // Hull mid-section — widest part
    const hullMidGeo = new THREE.BoxGeometry(3.0, 0.5, 3.0);
    const hullMid = new THREE.Mesh(hullMidGeo, plankMat);
    hullMid.position.set(0, -0.05, 0);
    hullMid.castShadow = true;
    hullMid.receiveShadow = true;
    group.add(hullMid);

    // Hull bow taper — narrower box at front
    const hullBowGeo = new THREE.BoxGeometry(2.0, 0.5, 1.2);
    const hullBow = new THREE.Mesh(hullBowGeo, plankMat);
    hullBow.position.set(0, -0.05, 2.0);
    hullBow.castShadow = true;
    hullBow.receiveShadow = true;
    group.add(hullBow);

    // Hull bow tip — pointed
    const hullTipGeo = new THREE.BoxGeometry(1.0, 0.4, 0.8);
    const hullTip = new THREE.Mesh(hullTipGeo, plankMat);
    hullTip.position.set(0, -0.05, 2.8);
    hullTip.castShadow = true;
    hullTip.receiveShadow = true;
    group.add(hullTip);

    // Hull stern taper
    const hullSternGeo = new THREE.BoxGeometry(2.2, 0.5, 1.2);
    const hullStern = new THREE.Mesh(hullSternGeo, plankMat);
    hullStern.position.set(0, -0.05, -1.8);
    hullStern.castShadow = true;
    hullStern.receiveShadow = true;
    group.add(hullStern);

    // --- Left hull side (gunwale) ---
    const gunwaleLeftGeo = new THREE.BoxGeometry(0.12, 0.35, 5.0);
    const gunwaleLeft = new THREE.Mesh(gunwaleLeftGeo, keelMat);
    gunwaleLeft.position.set(-1.45, 0.35, 0);
    gunwaleLeft.castShadow = true;
    group.add(gunwaleLeft);

    // --- Right hull side (gunwale) ---
    const gunwaleRight = new THREE.Mesh(gunwaleLeftGeo, keelMat);
    gunwaleRight.position.set(1.45, 0.35, 0);
    gunwaleRight.castShadow = true;
    group.add(gunwaleRight);

    // --- Bow gunwale taper (left) ---
    const bowGunwaleLGeo = new THREE.BoxGeometry(0.1, 0.3, 1.8);
    const bowGunwaleL = new THREE.Mesh(bowGunwaleLGeo, keelMat);
    bowGunwaleL.position.set(-0.9, 0.35, 2.2);
    bowGunwaleL.rotation.y = 0.25;
    bowGunwaleL.castShadow = true;
    group.add(bowGunwaleL);

    // --- Bow gunwale taper (right) ---
    const bowGunwaleR = new THREE.Mesh(bowGunwaleLGeo, keelMat);
    bowGunwaleR.position.set(0.9, 0.35, 2.2);
    bowGunwaleR.rotation.y = -0.25;
    bowGunwaleR.castShadow = true;
    group.add(bowGunwaleR);

    // --- Stern transom (flat back panel) ---
    const transomGeo = new THREE.BoxGeometry(2.4, 0.55, 0.12);
    const transom = new THREE.Mesh(transomGeo, keelMat);
    transom.position.set(0, 0.2, -2.4);
    transom.castShadow = true;
    group.add(transom);

    // --- Bench seats (two cross-beams) ---
    const benchGeo = new THREE.BoxGeometry(2.6, 0.1, 0.4);
    const bench1 = new THREE.Mesh(benchGeo, keelMat);
    bench1.position.set(0, 0.25, -0.8);
    bench1.castShadow = true;
    bench1.receiveShadow = true;
    group.add(bench1);

    const bench2 = new THREE.Mesh(benchGeo, keelMat);
    bench2.position.set(0, 0.25, 0.8);
    bench2.castShadow = true;
    bench2.receiveShadow = true;
    group.add(bench2);

    // --- Oars (two, resting in oarlocks) ---
    for (let side = -1; side <= 1; side += 2) {
        const oarGroup = new THREE.Group();
        oarGroup.name = 'oar';

        // Shaft
        const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6);
        const shaft = new THREE.Mesh(shaftGeo, plankMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.set(side * 0.5, 0, 0);
        shaft.castShadow = true;
        oarGroup.add(shaft);

        // Paddle end (flat box)
        const paddleGeo = new THREE.BoxGeometry(0.8, 0.03, 0.3);
        const paddle = new THREE.Mesh(paddleGeo, keelMat);
        paddle.position.set(side * 2.0, 0, 0);
        paddle.castShadow = true;
        oarGroup.add(paddle);

        // Oarlock (small ring)
        const oarlockGeo = new THREE.TorusGeometry(0.06, 0.02, 6, 6);
        const oarlock = new THREE.Mesh(oarlockGeo, inkMat);
        oarlock.position.set(side * 1.4, 0.35, 0);
        oarlock.rotation.x = Math.PI / 2;
        oarGroup.add(oarlock);

        oarGroup.position.set(0, 0.4, 0);
        oarGroup.rotation.y = side * 0.15;
        group.add(oarGroup);
    }

    // --- Rope coil on rear bench ---
    const ropeGeo = new THREE.TorusGeometry(0.2, 0.04, 6, 12);
    const ropeCoil = new THREE.Mesh(ropeGeo, ropeMat);
    ropeCoil.rotation.x = -Math.PI / 2;
    ropeCoil.position.set(-0.7, 0.35, -0.8);
    ropeCoil.castShadow = true;
    group.add(ropeCoil);

    // --- Plank lines on hull for detail ---
    const plankLineMat = matDark();
    for (let i = -2; i <= 2; i++) {
        const lineGeo = new THREE.BoxGeometry(0.01, 0.02, 5.0);
        const line = new THREE.Mesh(lineGeo, plankLineMat);
        line.position.set(i * 0.55, 0.21, 0);
        group.add(line);
    }

    // Position the dinghy at the toilet location
    group.position.set(0, 0.3, 3);

    return group;
}

// ─── 3. Boat Door (Bow Panel) ───────────────────────────────────────────────

export function createBoatDoor() {
    const group = new THREE.Group();
    group.name = 'boatDoor';

    const doorColor = PALETTE.oceanBoatWood;

    const doorMat = toonMat(doorColor, {
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    doorMat.depthWrite = false;

    // --- Curved bow panel (the "door" enemies attack) ---
    const doorGeo = new THREE.BoxGeometry(2.4, 2.5, 0.12);
    const doorPanel = new THREE.Mesh(doorGeo, doorMat);
    doorPanel.position.set(0, 1.35, 0);
    doorPanel.castShadow = false;
    doorPanel.receiveShadow = false;
    group.add(doorPanel);

    // --- Plank lines on door ---
    const plankLineMat = matDark();
    for (let i = 1; i <= 4; i++) {
        const lineGeo = new THREE.BoxGeometry(2.2, 0.02, 0.01);
        const line = new THREE.Mesh(lineGeo, plankLineMat);
        line.position.set(0, 0.3 + i * 0.5, 0.07);
        group.add(line);
    }

    // --- Metal reinforcement strips (horizontal) ---
    const metalMat = toonMat(PALETTE.fixture);
    for (let i = 0; i < 2; i++) {
        const stripGeo = new THREE.BoxGeometry(2.3, 0.08, 0.03);
        const strip = new THREE.Mesh(stripGeo, metalMat);
        strip.position.set(0, 0.6 + i * 1.5, 0.07);
        group.add(strip);
    }

    // --- Bolt heads on strips ---
    const boltMat = matInk();
    for (let i = 0; i < 2; i++) {
        for (let bx = -0.8; bx <= 0.8; bx += 0.4) {
            const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6);
            const bolt = new THREE.Mesh(boltGeo, boltMat);
            bolt.rotation.x = Math.PI / 2;
            bolt.position.set(bx, 0.6 + i * 1.5, 0.09);
            group.add(bolt);
        }
    }

    // --- Crack / damage overlay meshes (initially invisible) ---
    const crackMat = new THREE.MeshBasicMaterial({
        color: PALETTE.ink,
        transparent: true,
        opacity: 0.6,
    });
    const cracks = [];

    function buildCrack(segments) {
        const crackGroup = new THREE.Group();
        for (const seg of segments) {
            const segGeo = new THREE.BoxGeometry(seg.w, seg.h, 0.02);
            const segMesh = new THREE.Mesh(segGeo, crackMat);
            segMesh.position.set(seg.x, seg.y, 0.07);
            if (seg.rot) segMesh.rotation.z = seg.rot;
            crackGroup.add(segMesh);
        }
        crackGroup.visible = false;
        return crackGroup;
    }

    // Crack 0 — upper left
    const crack0 = buildCrack([
        { x: -0.6, y: 2.2, w: 0.35, h: 0.03, rot: 0.3 },
        { x: -0.45, y: 2.1, w: 0.25, h: 0.03, rot: -0.5 },
        { x: -0.35, y: 2.0, w: 0.2, h: 0.03, rot: 0.15 },
    ]);
    crack0.name = 'crack_0';
    group.add(crack0);
    cracks.push(crack0);

    // Crack 1 — center right
    const crack1 = buildCrack([
        { x: 0.5, y: 1.5, w: 0.4, h: 0.03, rot: -0.2 },
        { x: 0.7, y: 1.4, w: 0.3, h: 0.03, rot: 0.5 },
        { x: 0.4, y: 1.6, w: 0.2, h: 0.03, rot: -0.4 },
    ]);
    crack1.name = 'crack_1';
    group.add(crack1);
    cracks.push(crack1);

    // Crack 2 — lower center
    const crack2 = buildCrack([
        { x: -0.1, y: 0.7, w: 0.45, h: 0.04, rot: 0.1 },
        { x: 0.1, y: 0.6, w: 0.35, h: 0.03, rot: -0.35 },
        { x: -0.15, y: 0.8, w: 0.25, h: 0.03, rot: 0.5 },
        { x: 0.2, y: 0.5, w: 0.2, h: 0.03, rot: -0.15 },
    ]);
    crack2.name = 'crack_2';
    group.add(crack2);
    cracks.push(crack2);

    // Crack 3 — upper right
    const crack3 = buildCrack([
        { x: 0.7, y: 2.0, w: 0.3, h: 0.03, rot: -0.6 },
        { x: 0.6, y: 1.9, w: 0.25, h: 0.03, rot: 0.25 },
        { x: 0.8, y: 1.95, w: 0.2, h: 0.03, rot: -0.1 },
    ]);
    crack3.name = 'crack_3';
    group.add(crack3);
    cracks.push(crack3);

    // Crack 4 — center, critical damage
    const crack4 = buildCrack([
        { x: 0.0, y: 1.1, w: 0.5, h: 0.03, rot: 0.2 },
        { x: -0.1, y: 0.9, w: 0.35, h: 0.03, rot: -0.4 },
        { x: 0.2, y: 1.2, w: 0.3, h: 0.03, rot: 0.6 },
        { x: -0.15, y: 1.25, w: 0.25, h: 0.03, rot: -0.15 },
    ]);
    crack4.name = 'crack_4';
    group.add(crack4);
    cracks.push(crack4);

    // --- Store metadata on group.userData (matches door interface) ---
    group.userData.door = doorPanel;
    group.userData.cracks = cracks;
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    // Position at front of the boat
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

    flagGroup.position.set(0, 0.3, -0.5);
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

    lanternGroup.position.set(0.6, 0.55, 3.8);
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

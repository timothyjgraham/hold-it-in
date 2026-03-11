// The Sacred Throne — a low-poly toilet model with dramatic angled spotlight
// All colors from master palette. All materials use toon shading.

import { PALETTE } from '../data/palette.js';
import { matPorcelain, matGold, matBeam, matParticles, toonMat } from '../shaders/toonMaterials.js';

export function createToilet() {
    const group = new THREE.Group();
    group.name = 'toilet';

    const porcelain = matPorcelain();
    const porcelainInner = toonMat(PALETTE.rimCool);
    const gold = matGold();

    // === BASE / PEDESTAL ===
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.1, 0.4, 12),
        porcelain
    );
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // === BOWL (outer) ===
    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 0.8, 1.2, 12),
        porcelain
    );
    bowl.position.y = 1.0;
    bowl.castShadow = true;
    group.add(bowl);

    // === BOWL (inner hollow) ===
    const bowlInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.5, 0.5, 12),
        porcelainInner
    );
    bowlInner.position.y = 1.45;
    group.add(bowlInner);

    // === SEAT (torus ring) ===
    const seat = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.12, 8, 16),
        porcelain
    );
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = 1.65;
    seat.castShadow = true;
    group.add(seat);

    // === TANK (box behind the bowl) ===
    const tank = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 0.7),
        porcelain
    );
    tank.position.set(0, 1.3, -0.85);
    tank.castShadow = true;
    group.add(tank);

    // === TANK LID ===
    const tankLid = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.15, 0.8),
        porcelain
    );
    tankLid.position.set(0, 2.25, -0.85);
    tankLid.castShadow = true;
    group.add(tankLid);

    // === FLUSH HANDLE (gold!) ===
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8),
        gold
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.95, 2.0, -0.85);
    group.add(handle);

    const handleKnob = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        gold
    );
    handleKnob.position.set(1.15, 2.0, -0.85);
    group.add(handleKnob);

    // === HOLY SPOTLIGHT FROM UPPER-RIGHT (angled, dramatic) ===
    const lightOrigin = { x: -5, y: 12, z: 3 };

    const holySpot = new THREE.SpotLight(PALETTE.holyGold, 1.2, 25, Math.PI / 7, 0.6, 1.5);
    holySpot.position.set(lightOrigin.x, lightOrigin.y, lightOrigin.z);
    holySpot.castShadow = true;
    holySpot.shadow.mapSize.width = 1024;
    holySpot.shadow.mapSize.height = 1024;
    group.add(holySpot);

    // SpotLight target at the toilet
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(0, 0.5, 0);
    group.add(spotTarget);
    holySpot.target = spotTarget;

    // Secondary warm fill from the other side (subtle)
    const fillLight = new THREE.PointLight(PALETTE.fillWarm, 0.2, 8, 2);
    fillLight.position.set(2, 5, -1);
    group.add(fillLight);

    // Rim light from behind (outlines the toilet against the dark background)
    const rimLight = new THREE.PointLight(PALETTE.rimCool, 0.6, 8, 2);
    rimLight.position.set(0, 3, 3);
    group.add(rimLight);

    // === ANGLED LIGHT BEAM (cone from spotlight to toilet) ===
    const dx = -lightOrigin.x, dy = -lightOrigin.y + 0.5, dz = -lightOrigin.z;
    const beamLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const beamGeo = new THREE.CylinderGeometry(3.5, 0.2, beamLength, 16, 1, true);
    const beamMaterial = matBeam(0.05);
    const beam = new THREE.Mesh(beamGeo, beamMaterial);

    // Position at midpoint between light and toilet
    beam.position.set(
        lightOrigin.x / 2,
        (lightOrigin.y + 0.5) / 2,
        lightOrigin.z / 2
    );

    // Rotate cone to align with light direction
    const lightDir = new THREE.Vector3(dx, dy, dz).normalize();
    const yAxis = new THREE.Vector3(0, 1, 0);
    beam.quaternion.setFromUnitVectors(yAxis, lightDir);
    group.add(beam);

    // === SPARKLE PARTICLES (golden motes in the light beam) ===
    const sparkleCount = 30;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
        const t = Math.random();
        sparklePositions[i * 3] = lightOrigin.x * t + (Math.random() - 0.5) * 3 * (1 - t);
        sparklePositions[i * 3 + 1] = lightOrigin.y * t + (Math.random() - 0.5) * 2;
        sparklePositions[i * 3 + 2] = lightOrigin.z * t + (Math.random() - 0.5) * 3 * (1 - t);
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = matParticles(PALETTE.gold, 0.2, 0.8);
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    sparkles.name = 'sparkles';
    group.add(sparkles);

    // === SPARKLY CLEAN PARTICLES (pristine toilet effect) ===
    const cleanSparkleCount = 25;
    const cleanSparkleGeo = new THREE.BufferGeometry();
    const cleanPos = new Float32Array(cleanSparkleCount * 3);
    for (let i = 0; i < cleanSparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 1.2;
        cleanPos[i * 3] = Math.cos(angle) * radius;
        cleanPos[i * 3 + 1] = Math.random() * 2.5;
        cleanPos[i * 3 + 2] = Math.sin(angle) * radius - 0.3;
    }
    cleanSparkleGeo.setAttribute('position', new THREE.BufferAttribute(cleanPos, 3));
    const cleanSparkleMat = matParticles(PALETTE.white, 0.15, 0.9);
    const cleanSparkles = new THREE.Points(cleanSparkleGeo, cleanSparkleMat);
    cleanSparkles.name = 'cleanSparkles';
    group.add(cleanSparkles);

    // Scale up so it reads as a toilet, but stay proportional to enemies
    group.scale.set(0.85, 0.85, 0.85);

    // Store references for animation
    group.userData.sparkles = sparkles;
    group.userData.cleanSparkles = cleanSparkles;
    group.userData.beam = beam;
    group.userData.holySpot = holySpot;
    group.userData.lightOrigin = lightOrigin;

    return group;
}

// Animate the toilet's holy aura
export function updateToilet(toilet, time) {
    if (!toilet || !toilet.userData) return;

    // Pulse the spotlight intensity
    const spot = toilet.userData.holySpot;
    if (spot) {
        spot.intensity = 1.2 + Math.sin(time * 2) * 0.3;
    }

    // Drift sparkles upward and along the beam
    const sparkles = toilet.userData.sparkles;
    const lo = toilet.userData.lightOrigin;
    if (sparkles && lo) {
        const pos = sparkles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 1] += 0.008; // drift up
            // Respawn when drifted too far
            if (pos.array[i * 3 + 1] > lo.y + 2) {
                const t = Math.random();
                pos.array[i * 3] = lo.x * t + (Math.random() - 0.5) * 3 * (1 - t);
                pos.array[i * 3 + 1] = Math.random() * lo.y * 0.3;
                pos.array[i * 3 + 2] = lo.z * t + (Math.random() - 0.5) * 3 * (1 - t);
            }
        }
        pos.needsUpdate = true;
    }

    // Pulse beam opacity
    const beam = toilet.userData.beam;
    if (beam) {
        beam.material.opacity = 0.04 + Math.sin(time * 1.5) * 0.02;
    }

    // Sparkly clean particles — drift upward, twinkle, respawn near toilet
    const cleanSparkles = toilet.userData.cleanSparkles;
    if (cleanSparkles) {
        const cpos = cleanSparkles.geometry.attributes.position;
        for (let i = 0; i < cpos.count; i++) {
            cpos.array[i * 3 + 1] += 0.006 + Math.sin(time * 3 + i * 2.1) * 0.003;
            if (cpos.array[i * 3 + 1] > 3.2) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 0.3 + Math.random() * 1.2;
                cpos.array[i * 3] = Math.cos(angle) * radius;
                cpos.array[i * 3 + 1] = Math.random() * 0.5;
                cpos.array[i * 3 + 2] = Math.sin(angle) * radius - 0.3;
            }
        }
        cpos.needsUpdate = true;
        cleanSparkles.material.opacity = 0.5 + Math.sin(time * 4) * 0.4;
    }
}

// The Sacred Throne — a low-poly toilet model with dramatic angled spotlight

export function createToilet() {
    const group = new THREE.Group();
    group.name = 'toilet';

    const porcelain = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0x556677,
        emissiveIntensity: 0.2,
    });

    const porcelainInner = new THREE.MeshStandardMaterial({
        color: 0x88aacc,
        roughness: 0.4,
        metalness: 0.0,
    });

    const gold = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.15,
        metalness: 0.85,
        emissive: 0xffa500,
        emissiveIntensity: 0.4,
    });

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
    const lightOrigin = { x: 5, y: 12, z: -3 };

    const holySpot = new THREE.SpotLight(0xffd700, 3.5, 30, Math.PI / 5, 0.4, 1.2);
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
    const fillLight = new THREE.PointLight(0xfff4b0, 0.8, 10, 2);
    fillLight.position.set(-3, 4, 2);
    group.add(fillLight);

    // Rim light from behind (outlines the toilet against the dark background)
    const rimLight = new THREE.PointLight(0x6688aa, 0.6, 8, 2);
    rimLight.position.set(0, 3, -3);
    group.add(rimLight);

    // === ANGLED LIGHT BEAM (cone from spotlight to toilet) ===
    const dx = -lightOrigin.x, dy = -lightOrigin.y + 0.5, dz = -lightOrigin.z;
    const beamLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const beamGeo = new THREE.CylinderGeometry(3.5, 0.2, beamLength, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfff8d0,
        transparent: true,
        opacity: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);

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
        // Distribute sparkles along the beam path
        const t = Math.random();
        sparklePositions[i * 3] = lightOrigin.x * t + (Math.random() - 0.5) * 3 * (1 - t);
        sparklePositions[i * 3 + 1] = lightOrigin.y * t + (Math.random() - 0.5) * 2;
        sparklePositions[i * 3 + 2] = lightOrigin.z * t + (Math.random() - 0.5) * 3 * (1 - t);
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
        color: 0xffd700,
        size: 0.2,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    sparkles.name = 'sparkles';
    group.add(sparkles);

    // Scale up so it reads as a toilet, but stay proportional to enemies
    group.scale.set(1.4, 1.4, 1.4);

    // Store references for animation
    group.userData.sparkles = sparkles;
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
        spot.intensity = 3.5 + Math.sin(time * 2) * 0.8;
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
}

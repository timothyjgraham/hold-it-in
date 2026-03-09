// The Sacred Throne — a low-poly toilet model with holy golden glow

export function createToilet() {
    const group = new THREE.Group();
    group.name = 'toilet';

    const porcelain = new THREE.MeshStandardMaterial({
        color: 0xf5f5f0,
        roughness: 0.15,
        metalness: 0.05,
    });

    const porcelainInner = new THREE.MeshStandardMaterial({
        color: 0xdde8ee,
        roughness: 0.3,
        metalness: 0.0,
    });

    const gold = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0xffa500,
        emissiveIntensity: 0.3,
    });

    // === BASE / PEDESTAL ===
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 1.1, 0.4, 8),
        porcelain
    );
    base.position.y = 0.2;
    group.add(base);

    // === BOWL (outer) ===
    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 0.8, 1.2, 8),
        porcelain
    );
    bowl.position.y = 1.0;
    group.add(bowl);

    // === BOWL (inner hollow) - slightly recessed dark interior ===
    const bowlInner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.5, 0.5, 8),
        porcelainInner
    );
    bowlInner.position.y = 1.45;
    group.add(bowlInner);

    // === SEAT (torus ring) ===
    const seat = new THREE.Mesh(
        new THREE.TorusGeometry(0.8, 0.12, 6, 8),
        porcelain
    );
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = 1.65;
    group.add(seat);

    // === TANK (box behind the bowl) ===
    const tank = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.8, 0.7, 1, 1, 1),
        porcelain
    );
    tank.position.set(0, 1.3, -0.85);
    group.add(tank);

    // === TANK LID ===
    const tankLid = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.15, 0.8),
        porcelain
    );
    tankLid.position.set(0, 2.25, -0.85);
    group.add(tankLid);

    // === FLUSH HANDLE (gold!) ===
    const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6),
        gold
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.95, 2.0, -0.85);
    group.add(handle);

    const handleKnob = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 6),
        gold
    );
    handleKnob.position.set(1.15, 2.0, -0.85);
    group.add(handleKnob);

    // === HOLY GOLDEN LIGHT FROM ABOVE ===
    const holyLight = new THREE.PointLight(0xffd700, 2.5, 20, 1.5);
    holyLight.position.set(0, 10, 0);
    group.add(holyLight);

    // Secondary warm fill light
    const fillLight = new THREE.PointLight(0xfff4b0, 1.0, 12, 2);
    fillLight.position.set(0, 4, 0);
    group.add(fillLight);

    // === LIGHT BEAM (transparent cone from above) ===
    const beamGeo = new THREE.CylinderGeometry(0.3, 3.0, 12, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfff8d0,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 8;
    group.add(beam);

    // === SPARKLE PARTICLES (floating golden motes) ===
    const sparkleCount = 20;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
        sparklePositions[i * 3] = (Math.random() - 0.5) * 4;
        sparklePositions[i * 3 + 1] = Math.random() * 10 + 1;
        sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
        color: 0xffd700,
        size: 0.15,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    sparkles.name = 'sparkles';
    group.add(sparkles);

    // Store references for animation
    group.userData.sparkles = sparkles;
    group.userData.beam = beam;
    group.userData.holyLight = holyLight;

    return group;
}

// Animate the toilet's holy aura
export function updateToilet(toilet, time) {
    if (!toilet || !toilet.userData) return;

    // Pulse the holy light
    const light = toilet.userData.holyLight;
    if (light) {
        light.intensity = 2.5 + Math.sin(time * 2) * 0.5;
    }

    // Drift sparkles upward
    const sparkles = toilet.userData.sparkles;
    if (sparkles) {
        const pos = sparkles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3 + 1] += 0.01; // drift up
            if (pos.array[i * 3 + 1] > 12) {
                pos.array[i * 3 + 1] = 1;
                pos.array[i * 3] = (Math.random() - 0.5) * 4;
                pos.array[i * 3 + 2] = (Math.random() - 0.5) * 4;
            }
        }
        pos.needsUpdate = true;
    }

    // Slowly pulse beam opacity
    const beam = toilet.userData.beam;
    if (beam) {
        beam.material.opacity = 0.05 + Math.sin(time * 1.5) * 0.02;
    }
}

// EnvironmentModels.js — Low-poly 3D bathroom/office environment for "Hold It In"
// All functions return THREE.Group objects with polished geometry and materials.

// ─── Shared Materials ─────────────────────────────────────────────────────────

function chrome() {
    return new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.1,
    });
}

function porcelain() {
    return new THREE.MeshStandardMaterial({
        color: 0xf0f0f0,
        metalness: 0.05,
        roughness: 0.2,
    });
}

function matteGrayBlue() {
    return new THREE.MeshStandardMaterial({
        color: 0x8899aa,
        metalness: 0.05,
        roughness: 0.6,
    });
}

function whitePlastic() {
    return new THREE.MeshStandardMaterial({
        color: 0xe8e8e8,
        metalness: 0.0,
        roughness: 0.4,
    });
}

function darkGray() {
    return new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.1,
        roughness: 0.5,
    });
}

// ─── 1. Bathroom Stalls ──────────────────────────────────────────────────────

export function createBathroomStalls() {
    const group = new THREE.Group();
    group.name = 'bathroomStalls';

    const chromeMat = chrome();
    const panelMat = matteGrayBlue();
    const footMat = new THREE.MeshStandardMaterial({
        color: 0x999999,
        metalness: 0.7,
        roughness: 0.2,
    });

    function buildStallDivider(xPos, side) {
        const divider = new THREE.Group();
        divider.name = `stallDivider_${side}`;

        // Main divider panel
        const panelGeo = new THREE.BoxGeometry(0.1, 4, 9);
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 2, 3.5);
        panel.castShadow = true;
        panel.receiveShadow = true;
        divider.add(panel);

        // Top edge trim (chrome strip along the top)
        const topTrimGeo = new THREE.BoxGeometry(0.14, 0.08, 9);
        const topTrim = new THREE.Mesh(topTrimGeo, chromeMat);
        topTrim.position.set(0, 4.04, 3.5);
        divider.add(topTrim);

        // Chrome posts — front and back
        const postPositions = [-1, 8];
        for (const pz of postPositions) {
            // Main post cylinder
            const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8);
            const post = new THREE.Mesh(postGeo, chromeMat);
            post.position.set(0, 2.25, pz);
            post.castShadow = true;
            divider.add(post);

            // Post cap (small sphere on top)
            const capGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const cap = new THREE.Mesh(capGeo, chromeMat);
            cap.position.set(0, 4.55, pz);
            divider.add(cap);

            // Floor foot/bracket (rectangular plate)
            const footGeo = new THREE.BoxGeometry(0.3, 0.08, 0.3);
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(0, 0.04, pz);
            foot.receiveShadow = true;
            divider.add(foot);

            // Small foot support cylinder connecting post to plate
            const supportGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.15, 6);
            const support = new THREE.Mesh(supportGeo, chromeMat);
            support.position.set(0, 0.12, pz);
            divider.add(support);
        }

        // Coat hook on the inside face
        const hookStemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6);
        const hookStem = new THREE.Mesh(hookStemGeo, chromeMat);
        hookStem.rotation.z = Math.PI / 2;
        hookStem.position.set(side === 'left' ? 0.15 : -0.15, 3.2, 3.0);
        divider.add(hookStem);

        const hookTipGeo = new THREE.SphereGeometry(0.04, 5, 5);
        const hookTip = new THREE.Mesh(hookTipGeo, chromeMat);
        hookTip.position.set(side === 'left' ? 0.25 : -0.25, 3.2, 3.0);
        divider.add(hookTip);

        divider.position.x = xPos;
        return divider;
    }

    group.add(buildStallDivider(-5, 'left'));
    group.add(buildStallDivider(5, 'right'));

    return group;
}

// ─── 2. Sinks ────────────────────────────────────────────────────────────────

export function createSinks() {
    const group = new THREE.Group();
    group.name = 'sinks';

    const porcelainMat = porcelain();
    const chromeMat = chrome();
    const counterMat = new THREE.MeshStandardMaterial({
        color: 0xd0cfc8,
        metalness: 0.1,
        roughness: 0.3,
    });
    const soapMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.3,
        roughness: 0.3,
    });
    const soapButtonMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.6,
        roughness: 0.2,
    });

    function buildSink(zPos) {
        const sink = new THREE.Group();
        sink.name = `sink_z${zPos}`;

        // Counter/shelf (wall-mounted slab)
        const counterGeo = new THREE.BoxGeometry(1.8, 0.12, 1.2);
        const counter = new THREE.Mesh(counterGeo, counterMat);
        counter.position.set(0, 2.0, 0);
        counter.castShadow = true;
        counter.receiveShadow = true;
        sink.add(counter);

        // Counter front edge bevel (subtle rounded edge)
        const edgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6);
        const edge = new THREE.Mesh(edgeGeo, counterMat);
        edge.rotation.z = Math.PI / 2;
        edge.position.set(0, 1.97, 0.6);
        sink.add(edge);

        // Basin (half-sphere sunk into counter, facing up)
        const basinGeo = new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const basin = new THREE.Mesh(basinGeo, porcelainMat);
        basin.rotation.x = Math.PI; // invert so hollow faces up
        basin.position.set(0, 2.0, 0.1);
        basin.castShadow = true;
        sink.add(basin);

        // Basin rim (torus ring around the basin lip)
        const rimGeo = new THREE.TorusGeometry(0.5, 0.03, 6, 12);
        const rim = new THREE.Mesh(rimGeo, porcelainMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 2.06, 0.1);
        sink.add(rim);

        // Drain (small dark circle at bottom of basin)
        const drainGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8);
        const drainMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2,
        });
        const drain = new THREE.Mesh(drainGeo, drainMat);
        drain.position.set(0, 1.56, 0.1);
        sink.add(drain);

        // Faucet base (chrome cylinder on counter)
        const faucetBaseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
        const faucetBase = new THREE.Mesh(faucetBaseGeo, chromeMat);
        faucetBase.position.set(0, 2.14, -0.25);
        sink.add(faucetBase);

        // Faucet neck (vertical then curves forward)
        const neckGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
        const neck = new THREE.Mesh(neckGeo, chromeMat);
        neck.position.set(0, 2.51, -0.25);
        neck.castShadow = true;
        sink.add(neck);

        // Faucet spout (angled cylinder going toward basin)
        const spoutGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.45, 8);
        const spout = new THREE.Mesh(spoutGeo, chromeMat);
        spout.rotation.x = Math.PI / 3;
        spout.position.set(0, 2.75, -0.05);
        spout.castShadow = true;
        sink.add(spout);

        // Spout tip
        const tipGeo = new THREE.SphereGeometry(0.035, 6, 6);
        const tip = new THREE.Mesh(tipGeo, chromeMat);
        tip.position.set(0, 2.6, 0.12);
        sink.add(tip);

        // Handle knobs (left and right)
        for (const side of [-1, 1]) {
            const knobStemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
            const knobStem = new THREE.Mesh(knobStemGeo, chromeMat);
            knobStem.position.set(side * 0.25, 2.2, -0.25);
            sink.add(knobStem);

            const knobGeo = new THREE.SphereGeometry(0.05, 6, 6);
            const knob = new THREE.Mesh(knobGeo, chromeMat);
            knob.position.set(side * 0.25, 2.33, -0.25);
            sink.add(knob);
        }

        // Wall bracket (supports the counter from below)
        const bracketGeo = new THREE.BoxGeometry(0.08, 0.6, 0.8);
        const bracketMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.5,
            roughness: 0.3,
        });
        for (const bx of [-0.7, 0.7]) {
            const bracket = new THREE.Mesh(bracketGeo, bracketMat);
            bracket.position.set(bx, 1.65, -0.1);
            sink.add(bracket);
        }

        // Soap dispenser (wall-mounted above and to the right)
        const soapGroup = new THREE.Group();
        soapGroup.name = 'soapDispenser';

        // Dispenser body
        const soapBodyGeo = new THREE.BoxGeometry(0.3, 0.4, 0.15);
        const soapBody = new THREE.Mesh(soapBodyGeo, soapMat);
        soapBody.position.set(0, 0, 0);
        soapGroup.add(soapBody);

        // Dispenser top cap
        const soapCapGeo = new THREE.BoxGeometry(0.32, 0.06, 0.17);
        const soapCap = new THREE.Mesh(soapCapGeo, chromeMat);
        soapCap.position.set(0, 0.23, 0);
        soapGroup.add(soapCap);

        // Dispenser push button/lever
        const soapLeverGeo = new THREE.BoxGeometry(0.12, 0.04, 0.18);
        const soapLever = new THREE.Mesh(soapLeverGeo, soapButtonMat);
        soapLever.position.set(0, -0.1, 0.08);
        soapGroup.add(soapLever);

        // Nozzle opening
        const nozzleGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.04, 6);
        const nozzle = new THREE.Mesh(nozzleGeo, chromeMat);
        nozzle.position.set(0, -0.22, 0.04);
        soapGroup.add(nozzle);

        soapGroup.position.set(0.6, 3.2, -0.4);
        sink.add(soapGroup);

        // Position entire sink assembly on the left wall
        sink.position.set(-7.5, 0, zPos);
        // Rotate to face right (toward center of bathroom)
        sink.rotation.y = Math.PI / 2;

        return sink;
    }

    group.add(buildSink(2));
    group.add(buildSink(6));

    return group;
}

// ─── 3. Mirror ───────────────────────────────────────────────────────────────

export function createMirror() {
    const group = new THREE.Group();
    group.name = 'mirror';

    const chromeMat = chrome();

    // Mirror reflective surface
    const mirrorSurfaceGeo = new THREE.PlaneGeometry(3.5, 2.2);
    const mirrorSurfaceMat = new THREE.MeshStandardMaterial({
        color: 0xaaccdd,
        metalness: 0.95,
        roughness: 0.05,
        side: THREE.FrontSide,
    });
    const mirrorSurface = new THREE.Mesh(mirrorSurfaceGeo, mirrorSurfaceMat);
    mirrorSurface.position.set(0, 0, 0.02);
    group.add(mirrorSurface);

    // Frame — four chrome border pieces
    const frameThickness = 0.08;
    const frameDepth = 0.06;

    // Top frame
    const topFrameGeo = new THREE.BoxGeometry(3.66, frameThickness, frameDepth);
    const topFrame = new THREE.Mesh(topFrameGeo, chromeMat);
    topFrame.position.set(0, 1.14, 0);
    topFrame.castShadow = true;
    group.add(topFrame);

    // Bottom frame
    const bottomFrame = new THREE.Mesh(topFrameGeo, chromeMat);
    bottomFrame.position.set(0, -1.14, 0);
    group.add(bottomFrame);

    // Left frame
    const sideFrameGeo = new THREE.BoxGeometry(frameThickness, 2.36, frameDepth);
    const leftFrame = new THREE.Mesh(sideFrameGeo, chromeMat);
    leftFrame.position.set(-1.79, 0, 0);
    group.add(leftFrame);

    // Right frame
    const rightFrame = new THREE.Mesh(sideFrameGeo, chromeMat);
    rightFrame.position.set(1.79, 0, 0);
    group.add(rightFrame);

    // Corner accents (small spheres at corners for polish)
    const cornerGeo = new THREE.SphereGeometry(0.06, 6, 6);
    for (const cx of [-1.79, 1.79]) {
        for (const cy of [-1.14, 1.14]) {
            const corner = new THREE.Mesh(cornerGeo, chromeMat);
            corner.position.set(cx, cy, 0.02);
            group.add(corner);
        }
    }

    // Backing plate (thin dark panel behind mirror)
    const backingGeo = new THREE.BoxGeometry(3.6, 2.3, 0.03);
    const backingMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.0,
        roughness: 0.8,
    });
    const backing = new THREE.Mesh(backingGeo, backingMat);
    backing.position.set(0, 0, -0.02);
    group.add(backing);

    // Position on left wall, facing right (+x direction)
    group.position.set(-7.9, 3.2, 4);
    group.rotation.y = Math.PI / 2;

    return group;
}

// ─── 4. Hand Dryer ───────────────────────────────────────────────────────────

export function createHandDryer() {
    const group = new THREE.Group();
    group.name = 'handDryer';

    const plasticMat = whitePlastic();
    const chromeMat = chrome();

    // Main body (rounded box approximation using a slightly tapered cylinder + box)
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
    const body = new THREE.Mesh(bodyGeo, plasticMat);
    body.position.set(0, 0, 0);
    body.castShadow = true;
    group.add(body);

    // Rounded top (half-cylinder on top of body)
    const topGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 8, 1, false, 0, Math.PI);
    const top = new THREE.Mesh(topGeo, plasticMat);
    top.rotation.z = Math.PI;
    top.rotation.y = Math.PI / 2;
    top.position.set(0, 0.5, 0);
    top.castShadow = true;
    group.add(top);

    // Chrome nozzle opening (slot at the bottom front)
    const nozzleGeo = new THREE.BoxGeometry(0.5, 0.06, 0.15);
    const nozzle = new THREE.Mesh(nozzleGeo, chromeMat);
    nozzle.position.set(0, -0.45, 0.28);
    group.add(nozzle);

    // Nozzle interior (dark slot)
    const slotGeo = new THREE.BoxGeometry(0.4, 0.03, 0.1);
    const slotMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.0,
        roughness: 0.8,
    });
    const slot = new THREE.Mesh(slotGeo, slotMat);
    slot.position.set(0, -0.48, 0.28);
    group.add(slot);

    // Sensor window (small dark rectangle)
    const sensorGeo = new THREE.BoxGeometry(0.15, 0.1, 0.02);
    const sensorMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.3,
        roughness: 0.5,
    });
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.set(0, -0.15, 0.26);
    group.add(sensor);

    // Indicator light (emissive green dot)
    const lightGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const lightMat = new THREE.MeshStandardMaterial({
        color: 0x00ff44,
        emissive: 0x00ff44,
        emissiveIntensity: 0.8,
        metalness: 0.0,
        roughness: 0.3,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0.25, 0.3, 0.26);
    group.add(light);

    // Brand label area (subtle darker rectangle)
    const labelGeo = new THREE.BoxGeometry(0.4, 0.12, 0.01);
    const labelMat = new THREE.MeshStandardMaterial({
        color: 0xbbbbbb,
        metalness: 0.1,
        roughness: 0.3,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.1, 0.26);
    group.add(label);

    // Wall mounting plate (behind the unit)
    const mountGeo = new THREE.BoxGeometry(0.9, 1.1, 0.04);
    const mountMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.4,
        roughness: 0.3,
    });
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(0, 0, -0.27);
    group.add(mount);

    // Position on right wall, facing left (-x direction)
    group.position.set(7.9, 2.5, 4);
    group.rotation.y = -Math.PI / 2;

    return group;
}

// ─── 5. Trash Can ────────────────────────────────────────────────────────────

export function createTrashCan() {
    const group = new THREE.Group();
    group.name = 'trashCan';

    const bodyMat = darkGray();
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.2,
        roughness: 0.4,
    });
    const lidMat = new THREE.MeshStandardMaterial({
        color: 0x505050,
        metalness: 0.15,
        roughness: 0.4,
    });

    // Main body (slightly tapered cylinder)
    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.45, 1.8, 10);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Rim at top (wider torus)
    const rimGeo = new THREE.TorusGeometry(0.57, 0.04, 6, 10);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 1.82;
    rim.castShadow = true;
    group.add(rim);

    // Inner rim (dark circle visible inside)
    const innerRimGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.05, 10);
    const innerRimMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.0,
        roughness: 0.9,
    });
    const innerRim = new THREE.Mesh(innerRimGeo, innerRimMat);
    innerRim.position.y = 1.78;
    group.add(innerRim);

    // Swinging lid (half-cylinder on top)
    const lidGeo = new THREE.CylinderGeometry(0.53, 0.53, 0.06, 10, 1, false, 0, Math.PI);
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.rotation.x = -Math.PI / 2;
    lid.position.set(0, 1.87, 0);
    lid.castShadow = true;
    group.add(lid);

    // Lid push flap (small rectangle on the lid)
    const flapGeo = new THREE.BoxGeometry(0.3, 0.04, 0.2);
    const flap = new THREE.Mesh(flapGeo, rimMat);
    flap.position.set(0, 1.9, 0.15);
    group.add(flap);

    // Base ring (slightly wider ring at the bottom for stability)
    const baseRingGeo = new THREE.TorusGeometry(0.47, 0.03, 6, 10);
    const baseRing = new THREE.Mesh(baseRingGeo, rimMat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.03;
    baseRing.receiveShadow = true;
    group.add(baseRing);

    // Subtle vertical ridges on the body (decorative thin boxes)
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const ridgeGeo = new THREE.BoxGeometry(0.02, 1.6, 0.01);
        const ridge = new THREE.Mesh(ridgeGeo, rimMat);
        const rx = Math.cos(angle) * 0.5;
        const rz = Math.sin(angle) * 0.5;
        ridge.position.set(rx, 0.9, rz);
        ridge.rotation.y = -angle;
        group.add(ridge);
    }

    group.position.set(6, 0, 12);

    return group;
}

// ─── 6. Paper Towel Dispenser ────────────────────────────────────────────────

export function createPaperTowelDispenser() {
    const group = new THREE.Group();
    group.name = 'paperTowelDispenser';

    const plasticMat = whitePlastic();
    const chromeMat = chrome();

    // Main body
    const bodyGeo = new THREE.BoxGeometry(1.0, 0.7, 0.4);
    const body = new THREE.Mesh(bodyGeo, plasticMat);
    body.position.set(0, 0, 0);
    body.castShadow = true;
    group.add(body);

    // Top edge lip
    const topLipGeo = new THREE.BoxGeometry(1.04, 0.04, 0.44);
    const topLip = new THREE.Mesh(topLipGeo, plasticMat);
    topLip.position.set(0, 0.37, 0);
    group.add(topLip);

    // Viewing window (slightly recessed, tinted)
    const windowGeo = new THREE.BoxGeometry(0.6, 0.2, 0.02);
    const windowMat = new THREE.MeshStandardMaterial({
        color: 0x667788,
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        opacity: 0.6,
    });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(0, 0.1, 0.21);
    group.add(windowMesh);

    // Dispensing slot at bottom (dark opening)
    const slotGeo = new THREE.BoxGeometry(0.7, 0.08, 0.15);
    const slotMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.0,
        roughness: 0.9,
    });
    const slot = new THREE.Mesh(slotGeo, slotMat);
    slot.position.set(0, -0.32, 0.15);
    group.add(slot);

    // Slot chrome trim
    const slotTrimGeo = new THREE.BoxGeometry(0.74, 0.03, 0.16);
    const slotTrim = new THREE.Mesh(slotTrimGeo, chromeMat);
    slotTrim.position.set(0, -0.27, 0.15);
    group.add(slotTrim);

    // Dangling paper towel piece
    const paperGeo = new THREE.BoxGeometry(0.5, 0.35, 0.01);
    const paperMat = new THREE.MeshStandardMaterial({
        color: 0xfaf8f0,
        metalness: 0.0,
        roughness: 0.9,
        side: THREE.DoubleSide,
    });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.set(0, -0.52, 0.15);
    paper.rotation.x = 0.08; // slight curl
    group.add(paper);

    // Mounting plate
    const mountGeo = new THREE.BoxGeometry(1.1, 0.8, 0.04);
    const mountMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.3,
        roughness: 0.3,
    });
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(0, 0, -0.22);
    group.add(mount);

    // Lock keyhole (small chrome circle)
    const keyholeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
    const keyhole = new THREE.Mesh(keyholeGeo, chromeMat);
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(0.35, -0.15, 0.21);
    group.add(keyhole);

    // Position on right wall, facing left
    group.position.set(7.9, 2.5, 7);
    group.rotation.y = -Math.PI / 2;

    return group;
}

// ─── 7. Bathroom Walls ──────────────────────────────────────────────────────

export function createBathroomWalls() {
    const group = new THREE.Group();
    group.name = 'bathroomWalls';

    const wallHeight = 6;
    const tileColor1 = 0xe8e4df; // warm off-white
    const tileColor2 = 0xddd8d2; // slightly darker off-white

    // Helper: build a tiled wall segment
    function buildTiledWall(width, height, depth, transparent) {
        const wallGroup = new THREE.Group();

        // Number of horizontal tile strips
        const stripCount = 12;
        const stripHeight = height / stripCount;

        for (let i = 0; i < stripCount; i++) {
            const color = i % 2 === 0 ? tileColor1 : tileColor2;
            const mat = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.05,
                roughness: 0.35,
                transparent: !!transparent,
                opacity: transparent ? 0.3 : 1.0,
                side: transparent ? THREE.DoubleSide : THREE.FrontSide,
            });
            const stripGeo = new THREE.BoxGeometry(width, stripHeight - 0.02, depth);
            const strip = new THREE.Mesh(stripGeo, mat);
            strip.position.y = stripHeight * i + stripHeight / 2;
            strip.receiveShadow = true;
            wallGroup.add(strip);
        }

        return wallGroup;
    }

    // Baseboard molding material
    const baseboardMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.1,
        roughness: 0.5,
    });

    // === Back wall REMOVED — camera at (0, 14, -15) needs clear view of toilet ===

    // === Left wall: at x=-8, z=-2 to z=14, height 6 ===
    const leftWall = buildTiledWall(16, wallHeight, 0.3, false);
    leftWall.position.set(-8, 0, 6);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.name = 'leftWall';
    group.add(leftWall);

    // Left wall baseboard
    const bbLeftGeo = new THREE.BoxGeometry(0.35, 0.25, 16);
    const bbLeft = new THREE.Mesh(bbLeftGeo, baseboardMat);
    bbLeft.position.set(-7.85, 0.125, 6);
    bbLeft.receiveShadow = true;
    group.add(bbLeft);

    // === Right wall: at x=8, z=-2 to z=14, height 6 ===
    const rightWall = buildTiledWall(16, wallHeight, 0.3, false);
    rightWall.position.set(8, 0, 6);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.name = 'rightWall';
    group.add(rightWall);

    // Right wall baseboard
    const bbRightGeo = new THREE.BoxGeometry(0.35, 0.25, 16);
    const bbRight = new THREE.Mesh(bbRightGeo, baseboardMat);
    bbRight.position.set(7.85, 0.125, 6);
    bbRight.receiveShadow = true;
    group.add(bbRight);

    // === Door frame at z=14 (front opening) ===
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.3,
        roughness: 0.4,
    });

    // Left door post
    const postGeo = new THREE.BoxGeometry(0.4, wallHeight, 0.4);
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    leftPost.position.set(-3.2, wallHeight / 2, 14);
    leftPost.castShadow = true;
    group.add(leftPost);

    // Right door post
    const rightPost = new THREE.Mesh(postGeo, frameMat);
    rightPost.position.set(3.2, wallHeight / 2, 14);
    rightPost.castShadow = true;
    group.add(rightPost);

    // Lintel (horizontal beam across top)
    const lintelGeo = new THREE.BoxGeometry(6.8, 0.4, 0.4);
    const lintel = new THREE.Mesh(lintelGeo, frameMat);
    lintel.position.set(0, wallHeight, 14);
    lintel.castShadow = true;
    group.add(lintel);

    // Door frame inner trim (chrome strips on the inside edges)
    const trimMat = chrome();
    const trimGeoV = new THREE.BoxGeometry(0.04, wallHeight, 0.04);
    const trimGeoH = new THREE.BoxGeometry(6.4, 0.04, 0.04);

    const trimLeft = new THREE.Mesh(trimGeoV, trimMat);
    trimLeft.position.set(-3.0, wallHeight / 2, 14.2);
    group.add(trimLeft);

    const trimRight = new THREE.Mesh(trimGeoV, trimMat);
    trimRight.position.set(3.0, wallHeight / 2, 14.2);
    group.add(trimRight);

    const trimTop = new THREE.Mesh(trimGeoH, trimMat);
    trimTop.position.set(0, wallHeight - 0.2, 14.2);
    group.add(trimTop);

    // Wall sections flanking the door — SEMI-TRANSPARENT so enemies visible approaching
    const flankWidth = 4.6;

    const leftFlank = buildTiledWall(flankWidth, wallHeight, 0.3, true);
    leftFlank.position.set(-8 + flankWidth / 2, 0, 14);
    leftFlank.name = 'leftFlankWall';
    group.add(leftFlank);

    const rightFlank = buildTiledWall(flankWidth, wallHeight, 0.3, true);
    rightFlank.position.set(8 - flankWidth / 2, 0, 14);
    rightFlank.name = 'rightFlankWall';
    group.add(rightFlank);

    // Overhead fluorescent light fixture (centered on ceiling)
    const lightFixtureGroup = new THREE.Group();
    lightFixtureGroup.name = 'ceilingLight';

    const fixtureBaseMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.4,
        roughness: 0.3,
    });
    const fixtureBaseGeo = new THREE.BoxGeometry(1.2, 0.08, 4.0);
    const fixtureBase = new THREE.Mesh(fixtureBaseGeo, fixtureBaseMat);
    lightFixtureGroup.add(fixtureBase);

    // Fluorescent tube covers (translucent white)
    const tubeCoverMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe8e6e0,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.9,
        metalness: 0.0,
        roughness: 0.2,
    });
    const tubeCoverGeo = new THREE.BoxGeometry(0.9, 0.04, 3.6);
    const tubeCover = new THREE.Mesh(tubeCoverGeo, tubeCoverMat);
    tubeCover.position.y = -0.06;
    lightFixtureGroup.add(tubeCover);

    lightFixtureGroup.position.set(0, wallHeight - 0.1, 6);
    group.add(lightFixtureGroup);

    return group;
}

// ─── 8. Office Peek ──────────────────────────────────────────────────────────

export function createOfficePeek() {
    const group = new THREE.Group();
    group.name = 'officePeek';

    // Shared materials
    const deskMat = new THREE.MeshStandardMaterial({
        color: 0x7a7a7a,
        metalness: 0.1,
        roughness: 0.5,
    });
    const deskLegMat = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.3,
        roughness: 0.4,
    });
    const cubicleWallMat = new THREE.MeshStandardMaterial({
        color: 0x9999aa,
        metalness: 0.05,
        roughness: 0.7,
    });
    const cubicleFrameMat = new THREE.MeshStandardMaterial({
        color: 0x666666,
        metalness: 0.3,
        roughness: 0.4,
    });

    // ─── Helper: build a desk with monitor ─────────────────────────────────
    function buildDesk() {
        const deskGroup = new THREE.Group();

        // Desktop surface
        const deskTopGeo = new THREE.BoxGeometry(3.0, 0.12, 1.5);
        const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
        deskTop.position.y = 1.9;
        deskTop.castShadow = true;
        deskTop.receiveShadow = true;
        deskGroup.add(deskTop);

        // Desk legs (4 thin cylinders)
        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.84, 6);
        const legPositions = [
            [-1.35, 0.92, -0.6],
            [1.35, 0.92, -0.6],
            [-1.35, 0.92, 0.6],
            [1.35, 0.92, 0.6],
        ];
        for (const [lx, ly, lz] of legPositions) {
            const leg = new THREE.Mesh(legGeo, deskLegMat);
            leg.position.set(lx, ly, lz);
            leg.castShadow = true;
            deskGroup.add(leg);
        }

        // Keyboard on desk
        const keyboardGeo = new THREE.BoxGeometry(1.0, 0.04, 0.4);
        const keyboardMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.1,
            roughness: 0.6,
        });
        const keyboard = new THREE.Mesh(keyboardGeo, keyboardMat);
        keyboard.position.set(-0.2, 2.0, 0.1);
        deskGroup.add(keyboard);

        // Monitor
        const monitorScreenGeo = new THREE.BoxGeometry(1.4, 1.0, 0.06);
        const monitorScreenMat = new THREE.MeshStandardMaterial({
            color: 0x222244,
            metalness: 0.1,
            roughness: 0.3,
            emissive: 0x111133,
            emissiveIntensity: 0.3,
        });
        const monitorScreen = new THREE.Mesh(monitorScreenGeo, monitorScreenMat);
        monitorScreen.position.set(-0.2, 2.9, -0.4);
        monitorScreen.castShadow = true;
        deskGroup.add(monitorScreen);

        // Monitor stand
        const standGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
        const stand = new THREE.Mesh(standGeo, deskLegMat);
        stand.position.set(-0.2, 2.2, -0.4);
        deskGroup.add(stand);

        const standBaseGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 8);
        const standBase = new THREE.Mesh(standBaseGeo, deskLegMat);
        standBase.position.set(-0.2, 1.98, -0.4);
        deskGroup.add(standBase);

        return deskGroup;
    }

    // ─── Helper: build an office chair ─────────────────────────────────────
    function buildChair() {
        const chairGroup = new THREE.Group();

        const chairSeatMat = new THREE.MeshStandardMaterial({
            color: 0x334466,
            metalness: 0.05,
            roughness: 0.7,
        });
        const chairFrameMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.3,
            roughness: 0.4,
        });

        // Seat cushion
        const seatGeo = new THREE.BoxGeometry(1.1, 0.15, 1.0);
        const seat = new THREE.Mesh(seatGeo, chairSeatMat);
        seat.position.y = 1.2;
        seat.castShadow = true;
        chairGroup.add(seat);

        // Seat cushion bevel
        const seatEdgeGeo = new THREE.CylinderGeometry(0.075, 0.075, 1.1, 6);
        const seatEdge = new THREE.Mesh(seatEdgeGeo, chairSeatMat);
        seatEdge.rotation.z = Math.PI / 2;
        seatEdge.position.set(0, 1.2, 0.5);
        chairGroup.add(seatEdge);

        // Backrest
        const backrestGeo = new THREE.BoxGeometry(1.0, 1.3, 0.12);
        const backrest = new THREE.Mesh(backrestGeo, chairSeatMat);
        backrest.position.set(0, 2.0, -0.5);
        backrest.rotation.x = 0.15;
        backrest.castShadow = true;
        chairGroup.add(backrest);

        // Central post
        const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
        const post = new THREE.Mesh(postGeo, chairFrameMat);
        post.position.y = 0.75;
        chairGroup.add(post);

        // Gas cylinder shroud
        const shroudGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.3, 8);
        const shroud = new THREE.Mesh(shroudGeo, chairFrameMat);
        shroud.position.y = 0.5;
        chairGroup.add(shroud);

        // Star base with 5 legs
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const baseLegGeo = new THREE.BoxGeometry(0.06, 0.06, 0.6);
            const baseLeg = new THREE.Mesh(baseLegGeo, chairFrameMat);
            baseLeg.position.set(
                Math.sin(angle) * 0.3,
                0.08,
                Math.cos(angle) * 0.3
            );
            baseLeg.rotation.y = angle;
            chairGroup.add(baseLeg);

            // Caster wheel
            const wheelGeo = new THREE.SphereGeometry(0.06, 6, 6);
            const wheel = new THREE.Mesh(wheelGeo, chairFrameMat);
            wheel.position.set(
                Math.sin(angle) * 0.55,
                0.06,
                Math.cos(angle) * 0.55
            );
            chairGroup.add(wheel);
        }

        // Armrests
        for (const side of [-1, 1]) {
            const armPostGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
            const armPost = new THREE.Mesh(armPostGeo, chairFrameMat);
            armPost.position.set(side * 0.55, 1.5, -0.1);
            chairGroup.add(armPost);

            const armPadGeo = new THREE.BoxGeometry(0.12, 0.06, 0.5);
            const armPad = new THREE.Mesh(armPadGeo, chairFrameMat);
            armPad.position.set(side * 0.55, 1.72, -0.1);
            chairGroup.add(armPad);
        }

        return chairGroup;
    }

    // ─── Helper: build a cubicle wall partition ────────────────────────────
    function buildCubiclePartition(width, height) {
        const partitionGroup = new THREE.Group();

        // Main panel
        const panelGeo = new THREE.BoxGeometry(width, height, 0.12);
        const panel = new THREE.Mesh(panelGeo, cubicleWallMat);
        panel.position.y = height / 2;
        panel.castShadow = true;
        panel.receiveShadow = true;
        partitionGroup.add(panel);

        // Top metal trim
        const trimGeo = new THREE.BoxGeometry(width + 0.04, 0.06, 0.14);
        const trim = new THREE.Mesh(trimGeo, cubicleFrameMat);
        trim.position.y = height + 0.03;
        partitionGroup.add(trim);

        // Bottom metal rail
        const railGeo = new THREE.BoxGeometry(width + 0.04, 0.06, 0.14);
        const rail = new THREE.Mesh(railGeo, cubicleFrameMat);
        rail.position.y = 0.03;
        partitionGroup.add(rail);

        // Support feet (two L-shaped feet at each end)
        for (const sx of [-1, 1]) {
            const footGeo = new THREE.BoxGeometry(0.08, 0.04, 0.5);
            const foot = new THREE.Mesh(footGeo, cubicleFrameMat);
            foot.position.set(sx * (width / 2 - 0.1), 0.02, 0.2);
            foot.receiveShadow = true;
            partitionGroup.add(foot);
        }

        return partitionGroup;
    }

    // ════════════════════════════════════════════════════════════════════════
    // LEFT SIDE — desk + chair at approximately x=-18, z=30
    // ════════════════════════════════════════════════════════════════════════

    const leftDesk = buildDesk();
    leftDesk.name = 'officeDeskLeft';
    leftDesk.position.set(-18, 0, 30);
    leftDesk.rotation.y = Math.PI / 2; // face inward toward the lane
    group.add(leftDesk);

    const leftChair = buildChair();
    leftChair.name = 'officeChairLeft';
    leftChair.position.set(-16.5, 0, 30);
    leftChair.rotation.y = -0.4;
    group.add(leftChair);

    // ════════════════════════════════════════════════════════════════════════
    // RIGHT SIDE — water cooler + second desk at approximately x=18, z=25
    // ════════════════════════════════════════════════════════════════════════

    // Water cooler (right side)
    const coolerGroup = new THREE.Group();
    coolerGroup.name = 'waterCooler';

    const coolerBodyMat = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        metalness: 0.05,
        roughness: 0.4,
    });
    const waterJugMat = new THREE.MeshStandardMaterial({
        color: 0x88bbdd,
        metalness: 0.05,
        roughness: 0.1,
        transparent: true,
        opacity: 0.6,
    });

    // Cooler body
    const coolerBodyGeo = new THREE.BoxGeometry(0.7, 2.0, 0.7);
    const coolerBody = new THREE.Mesh(coolerBodyGeo, coolerBodyMat);
    coolerBody.position.y = 1.0;
    coolerBody.castShadow = true;
    coolerGroup.add(coolerBody);

    // Cooler top platform
    const coolerTopGeo = new THREE.BoxGeometry(0.75, 0.08, 0.75);
    const coolerTop = new THREE.Mesh(coolerTopGeo, coolerBodyMat);
    coolerTop.position.y = 2.04;
    coolerGroup.add(coolerTop);

    // Water jug
    const jugGeo = new THREE.CylinderGeometry(0.25, 0.15, 1.3, 8);
    const jug = new THREE.Mesh(jugGeo, waterJugMat);
    jug.position.y = 2.73;
    jug.castShadow = true;
    coolerGroup.add(jug);

    // Jug cap
    const jugCapGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8);
    const jugCapMat = new THREE.MeshStandardMaterial({
        color: 0x3366aa,
        metalness: 0.1,
        roughness: 0.3,
    });
    const jugCap = new THREE.Mesh(jugCapGeo, jugCapMat);
    jugCap.position.y = 3.4;
    coolerGroup.add(jugCap);

    // Spigots (red=hot, blue=cold)
    for (const [sx, color] of [[0.15, 0xcc3333], [-0.15, 0x3355cc]]) {
        const spigotMat = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.3,
            roughness: 0.3,
        });
        const spigotGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6);
        const spigot = new THREE.Mesh(spigotGeo, spigotMat);
        spigot.rotation.x = Math.PI / 2;
        spigot.position.set(sx, 1.5, 0.38);
        coolerGroup.add(spigot);

        const handleGeo = new THREE.BoxGeometry(0.08, 0.06, 0.04);
        const handle = new THREE.Mesh(handleGeo, spigotMat);
        handle.position.set(sx, 1.5, 0.45);
        coolerGroup.add(handle);
    }

    // Drip tray
    const dripTrayGeo = new THREE.BoxGeometry(0.5, 0.04, 0.15);
    const dripTrayMat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.3,
        roughness: 0.3,
    });
    const dripTray = new THREE.Mesh(dripTrayGeo, dripTrayMat);
    dripTray.position.set(0, 1.2, 0.42);
    coolerGroup.add(dripTray);

    // Cup dispenser
    const cupDispenserGeo = new THREE.CylinderGeometry(0.1, 0.06, 0.3, 8);
    const cupDispenserMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.2,
        roughness: 0.3,
    });
    const cupDispenser = new THREE.Mesh(cupDispenserGeo, cupDispenserMat);
    cupDispenser.position.set(0.45, 1.7, 0);
    coolerGroup.add(cupDispenser);

    coolerGroup.position.set(18, 0, 23);
    coolerGroup.rotation.y = -Math.PI / 2; // face inward toward the lane
    group.add(coolerGroup);

    // Second desk (right side)
    const rightDesk = buildDesk();
    rightDesk.name = 'officeDeskRight';
    rightDesk.position.set(18, 0, 27);
    rightDesk.rotation.y = -Math.PI / 2; // face inward toward the lane
    group.add(rightDesk);

    // ════════════════════════════════════════════════════════════════════════
    // EXTRA OFFICE DRESSING
    // ════════════════════════════════════════════════════════════════════════

    // --- Filing cabinet (left side, near the desk) ---
    const filingGroup = new THREE.Group();
    filingGroup.name = 'filingCabinet';

    const filingMat = new THREE.MeshStandardMaterial({
        color: 0x777788,
        metalness: 0.4,
        roughness: 0.4,
    });
    const chromeMat = chrome();

    // Cabinet body
    const cabinetGeo = new THREE.BoxGeometry(1.0, 3.0, 0.8);
    const cabinet = new THREE.Mesh(cabinetGeo, filingMat);
    cabinet.position.y = 1.5;
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    filingGroup.add(cabinet);

    // Drawer faces (3 drawers)
    for (let d = 0; d < 3; d++) {
        const drawerY = 0.5 + d * 1.0;

        // Drawer face (slightly proud of cabinet)
        const drawerGeo = new THREE.BoxGeometry(0.92, 0.85, 0.02);
        const drawer = new THREE.Mesh(drawerGeo, filingMat);
        drawer.position.set(0, drawerY, 0.41);
        filingGroup.add(drawer);

        // Drawer handle
        const handleGeo = new THREE.BoxGeometry(0.3, 0.04, 0.06);
        const handle = new THREE.Mesh(handleGeo, chromeMat);
        handle.position.set(0, drawerY + 0.15, 0.44);
        filingGroup.add(handle);

        // Label holder (small rectangle below handle)
        const labelGeo = new THREE.BoxGeometry(0.2, 0.12, 0.02);
        const labelMat = new THREE.MeshStandardMaterial({
            color: 0xccccbb,
            metalness: 0.1,
            roughness: 0.3,
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.position.set(0, drawerY - 0.1, 0.42);
        filingGroup.add(label);
    }

    filingGroup.position.set(-18, 0, 35);
    filingGroup.rotation.y = Math.PI / 2;
    group.add(filingGroup);

    // --- Potted plant (right side, decorative) ---
    const plantGroup = new THREE.Group();
    plantGroup.name = 'pottedPlant';

    // Pot (tapered cylinder)
    const potMat = new THREE.MeshStandardMaterial({
        color: 0x8B5E3C,
        metalness: 0.05,
        roughness: 0.7,
    });
    const potGeo = new THREE.CylinderGeometry(0.4, 0.3, 0.8, 8);
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.4;
    pot.castShadow = true;
    plantGroup.add(pot);

    // Pot rim
    const potRimGeo = new THREE.TorusGeometry(0.42, 0.04, 6, 8);
    const potRim = new THREE.Mesh(potRimGeo, potMat);
    potRim.rotation.x = -Math.PI / 2;
    potRim.position.y = 0.82;
    plantGroup.add(potRim);

    // Soil (dark disc)
    const soilGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.06, 8);
    const soilMat = new THREE.MeshStandardMaterial({
        color: 0x3a2a1a,
        metalness: 0.0,
        roughness: 0.9,
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.8;
    plantGroup.add(soil);

    // Foliage (clusters of green spheres)
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x44aa44,
        metalness: 0.0,
        roughness: 0.6,
    });
    const leafPositions = [
        [0, 1.5, 0, 0.4],
        [0.2, 1.7, 0.15, 0.3],
        [-0.15, 1.8, -0.1, 0.28],
        [0.1, 1.3, -0.15, 0.25],
        [-0.2, 1.4, 0.1, 0.22],
    ];
    for (const [lx, ly, lz, lr] of leafPositions) {
        const leafGeo = new THREE.SphereGeometry(lr, 6, 6);
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(lx, ly, lz);
        leaf.castShadow = true;
        plantGroup.add(leaf);
    }

    // Trunk/stem
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x6B4226,
        metalness: 0.0,
        roughness: 0.8,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    plantGroup.add(trunk);

    plantGroup.position.set(18, 0, 20);
    group.add(plantGroup);

    // --- Whiteboard section (left side, on the "wall" behind the desk) ---
    const whiteboardGroup = new THREE.Group();
    whiteboardGroup.name = 'whiteboard';

    // Board surface
    const boardGeo = new THREE.BoxGeometry(3.0, 2.0, 0.08);
    const boardMat = new THREE.MeshStandardMaterial({
        color: 0xf5f5f0,
        metalness: 0.1,
        roughness: 0.15,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.castShadow = true;
    whiteboardGroup.add(board);

    // Frame (aluminum look)
    const wbFrameMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.5,
        roughness: 0.3,
    });

    // Top/bottom frame
    const wbFrameHGeo = new THREE.BoxGeometry(3.1, 0.06, 0.1);
    const wbFrameTop = new THREE.Mesh(wbFrameHGeo, wbFrameMat);
    wbFrameTop.position.y = 1.03;
    whiteboardGroup.add(wbFrameTop);
    const wbFrameBot = new THREE.Mesh(wbFrameHGeo, wbFrameMat);
    wbFrameBot.position.y = -1.03;
    whiteboardGroup.add(wbFrameBot);

    // Side frames
    const wbFrameVGeo = new THREE.BoxGeometry(0.06, 2.12, 0.1);
    const wbFrameL = new THREE.Mesh(wbFrameVGeo, wbFrameMat);
    wbFrameL.position.x = -1.53;
    whiteboardGroup.add(wbFrameL);
    const wbFrameR = new THREE.Mesh(wbFrameVGeo, wbFrameMat);
    wbFrameR.position.x = 1.53;
    whiteboardGroup.add(wbFrameR);

    // Marker tray
    const trayGeo = new THREE.BoxGeometry(2.0, 0.06, 0.15);
    const tray = new THREE.Mesh(trayGeo, wbFrameMat);
    tray.position.set(0, -1.08, 0.08);
    whiteboardGroup.add(tray);

    // A couple of marker pens on the tray
    const markerColors = [0xcc2222, 0x2244cc, 0x222222];
    for (let m = 0; m < 3; m++) {
        const markerGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6);
        const markerMat = new THREE.MeshStandardMaterial({
            color: markerColors[m],
            metalness: 0.1,
            roughness: 0.5,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.rotation.z = Math.PI / 2;
        marker.position.set(-0.4 + m * 0.4, -1.03, 0.1);
        whiteboardGroup.add(marker);
    }

    whiteboardGroup.position.set(-20, 3.5, 30);
    whiteboardGroup.rotation.y = Math.PI / 2; // face inward
    group.add(whiteboardGroup);

    // ════════════════════════════════════════════════════════════════════════
    // CUBICLE WALL PARTITIONS — frame the lane edges
    // ════════════════════════════════════════════════════════════════════════

    const partitionHeight = 3.5;

    // Left side partitions (along x ~ -15.5, at various z positions)
    const leftPartition1 = buildCubiclePartition(6.0, partitionHeight);
    leftPartition1.name = 'cubiclePartitionL1';
    leftPartition1.position.set(-15.5, 0, 25);
    leftPartition1.rotation.y = Math.PI / 2;
    group.add(leftPartition1);

    const leftPartition2 = buildCubiclePartition(6.0, partitionHeight);
    leftPartition2.name = 'cubiclePartitionL2';
    leftPartition2.position.set(-15.5, 0, 38);
    leftPartition2.rotation.y = Math.PI / 2;
    group.add(leftPartition2);

    const leftPartition3 = buildCubiclePartition(6.0, partitionHeight);
    leftPartition3.name = 'cubiclePartitionL3';
    leftPartition3.position.set(-15.5, 0, 51);
    leftPartition3.rotation.y = Math.PI / 2;
    group.add(leftPartition3);

    // Right side partitions (along x ~ 15.5)
    const rightPartition1 = buildCubiclePartition(6.0, partitionHeight);
    rightPartition1.name = 'cubiclePartitionR1';
    rightPartition1.position.set(15.5, 0, 25);
    rightPartition1.rotation.y = Math.PI / 2;
    group.add(rightPartition1);

    const rightPartition2 = buildCubiclePartition(6.0, partitionHeight);
    rightPartition2.name = 'cubiclePartitionR2';
    rightPartition2.position.set(15.5, 0, 38);
    rightPartition2.rotation.y = Math.PI / 2;
    group.add(rightPartition2);

    const rightPartition3 = buildCubiclePartition(6.0, partitionHeight);
    rightPartition3.name = 'cubiclePartitionR3';
    rightPartition3.position.set(15.5, 0, 51);
    rightPartition3.rotation.y = Math.PI / 2;
    group.add(rightPartition3);

    // ════════════════════════════════════════════════════════════════════════
    // FLOOR ELEMENTS
    // ════════════════════════════════════════════════════════════════════════

    // Carpet transition strip on the floor at the doorway
    const stripGeo = new THREE.BoxGeometry(6.0, 0.04, 0.15);
    const stripMat = new THREE.MeshStandardMaterial({
        color: 0x998877,
        metalness: 0.5,
        roughness: 0.3,
    });
    const transitionStrip = new THREE.Mesh(stripGeo, stripMat);
    transitionStrip.position.set(0, 0.02, 14.5);
    transitionStrip.receiveShadow = true;
    group.add(transitionStrip);

    // Office carpet floor patch (wider to cover the lane area)
    const carpetGeo = new THREE.BoxGeometry(36, 0.05, 55);
    const carpetMat = new THREE.MeshStandardMaterial({
        color: 0x556677,
        metalness: 0.0,
        roughness: 0.95,
    });
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.position.set(0, 0.01, 42);
    carpet.receiveShadow = true;
    group.add(carpet);

    return group;
}

// ─── 9. Bathroom Door ───────────────────────────────────────────────────────

export function createBathroomDoor() {
    const group = new THREE.Group();
    group.name = 'bathroomDoor';

    const doorColor = 0x8B6914;

    const doorMat = new THREE.MeshStandardMaterial({
        color: doorColor,
        metalness: 0.05,
        roughness: 0.7,
    });
    const chromeMat = chrome();

    // ─── Door panel ────────────────────────────────────────────────────────
    // Fills the doorway between posts at x=-3.2 to x=3.2, y=0 to y=6, at z=14
    const doorGeo = new THREE.BoxGeometry(6.0, 5.8, 0.15);
    const doorPanel = new THREE.Mesh(doorGeo, doorMat);
    doorPanel.position.set(0, 3.0, 0); // centered vertically (5.8/2 + 0.1 gap at bottom)
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    group.add(doorPanel);

    // ─── Decorative raised panels (two rectangular frames on the door face) ─
    const panelFrameMat = new THREE.MeshStandardMaterial({
        color: 0x7A5C10,
        metalness: 0.05,
        roughness: 0.65,
    });

    // Upper panel frame
    const upperPanelGeo = new THREE.BoxGeometry(4.0, 1.8, 0.03);
    const upperPanel = new THREE.Mesh(upperPanelGeo, panelFrameMat);
    upperPanel.position.set(0, 4.2, 0.09);
    group.add(upperPanel);

    // Lower panel frame
    const lowerPanelGeo = new THREE.BoxGeometry(4.0, 2.2, 0.03);
    const lowerPanel = new THREE.Mesh(lowerPanelGeo, panelFrameMat);
    lowerPanel.position.set(0, 1.6, 0.09);
    group.add(lowerPanel);

    // ─── Small rectangular window/panel at top ─────────────────────────────
    const windowMat = new THREE.MeshStandardMaterial({
        color: 0x9B7924,
        metalness: 0.08,
        roughness: 0.5,
    });
    const windowGeo = new THREE.BoxGeometry(2.5, 0.6, 0.02);
    const windowPanel = new THREE.Mesh(windowGeo, windowMat);
    windowPanel.position.set(0, 4.5, 0.09);
    group.add(windowPanel);

    // ─── Door handle (right side) ──────────────────────────────────────────
    // Handle base (chrome sphere)
    const handleBaseGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const handleBase = new THREE.Mesh(handleBaseGeo, chromeMat);
    handleBase.position.set(2.2, 2.5, 0.12);
    group.add(handleBase);

    // Handle lever (chrome cylinder)
    const handleLeverGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const handleLever = new THREE.Mesh(handleLeverGeo, chromeMat);
    handleLever.rotation.z = Math.PI / 2;
    handleLever.position.set(2.2, 2.5, 0.2);
    group.add(handleLever);

    // Handle escutcheon (back plate on the other side)
    const handleBackGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const handleBack = new THREE.Mesh(handleBackGeo, chromeMat);
    handleBack.position.set(2.2, 2.5, -0.12);
    group.add(handleBack);

    // ─── Crack / damage overlay meshes (initially invisible) ───────────────
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const cracks = [];

    // Helper: build a jagged crack pattern from thin boxes
    function buildCrack(segments) {
        const crackGroup = new THREE.Group();
        for (const seg of segments) {
            const segGeo = new THREE.BoxGeometry(seg.w, seg.h, 0.02);
            const segMesh = new THREE.Mesh(segGeo, crackMat);
            segMesh.position.set(seg.x, seg.y, 0.085);
            if (seg.rot) segMesh.rotation.z = seg.rot;
            crackGroup.add(segMesh);
        }
        crackGroup.visible = false;
        return crackGroup;
    }

    // Crack 0 — upper left area
    const crack0 = buildCrack([
        { x: -1.5, y: 4.0, w: 0.6, h: 0.04, rot: 0.3 },
        { x: -1.2, y: 3.85, w: 0.4, h: 0.04, rot: -0.5 },
        { x: -1.0, y: 3.7, w: 0.35, h: 0.04, rot: 0.15 },
        { x: -1.35, y: 4.1, w: 0.3, h: 0.04, rot: -0.8 },
    ]);
    crack0.name = 'crack_0';
    group.add(crack0);
    cracks.push(crack0);

    // Crack 1 — center-right area
    const crack1 = buildCrack([
        { x: 1.0, y: 3.2, w: 0.7, h: 0.04, rot: -0.2 },
        { x: 1.3, y: 3.05, w: 0.5, h: 0.04, rot: 0.6 },
        { x: 0.8, y: 3.35, w: 0.3, h: 0.04, rot: -0.4 },
        { x: 1.1, y: 2.9, w: 0.45, h: 0.04, rot: 0.1 },
    ]);
    crack1.name = 'crack_1';
    group.add(crack1);
    cracks.push(crack1);

    // Crack 2 — lower center
    const crack2 = buildCrack([
        { x: -0.3, y: 1.5, w: 0.8, h: 0.05, rot: 0.1 },
        { x: 0.1, y: 1.3, w: 0.6, h: 0.04, rot: -0.35 },
        { x: -0.1, y: 1.7, w: 0.4, h: 0.04, rot: 0.5 },
        { x: 0.3, y: 1.15, w: 0.35, h: 0.04, rot: -0.15 },
        { x: -0.5, y: 1.4, w: 0.3, h: 0.04, rot: 0.7 },
    ]);
    crack2.name = 'crack_2';
    group.add(crack2);
    cracks.push(crack2);

    // Crack 3 — upper right
    const crack3 = buildCrack([
        { x: 1.8, y: 4.5, w: 0.5, h: 0.04, rot: -0.6 },
        { x: 1.6, y: 4.3, w: 0.45, h: 0.04, rot: 0.25 },
        { x: 2.0, y: 4.35, w: 0.35, h: 0.04, rot: -0.1 },
    ]);
    crack3.name = 'crack_3';
    group.add(crack3);
    cracks.push(crack3);

    // Crack 4 — lower left
    const crack4 = buildCrack([
        { x: -1.8, y: 1.8, w: 0.55, h: 0.05, rot: 0.4 },
        { x: -2.0, y: 2.0, w: 0.4, h: 0.04, rot: -0.3 },
        { x: -1.6, y: 1.6, w: 0.5, h: 0.04, rot: 0.6 },
        { x: -1.9, y: 2.15, w: 0.3, h: 0.04, rot: -0.7 },
        { x: -1.5, y: 1.9, w: 0.35, h: 0.04, rot: 0.2 },
    ]);
    crack4.name = 'crack_4';
    group.add(crack4);
    cracks.push(crack4);

    // ─── Store metadata on group.userData ───────────────────────────────────
    group.userData.door = doorPanel;
    group.userData.cracks = cracks;
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    // Position the door group at the doorway
    group.position.set(0, 0, 14);

    return group;
}

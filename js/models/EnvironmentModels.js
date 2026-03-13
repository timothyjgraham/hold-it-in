// EnvironmentModels.js — Low-poly 3D bathroom/office environment for "Hold It In"
// All functions return THREE.Group objects with polished geometry and toon materials.

import { PALETTE } from '../data/palette.js';
import {
    toonMat, matWall, matTileLight, matTileDark, matFixture,
    matWood, matWhite, matDark, matInk, matCarpet, matPorcelain,
    matGold, matDanger,
} from '../shaders/toonMaterials.js';

// ─── Shared Materials ─────────────────────────────────────────────────────────

function chrome() {
    return matFixture();
}

function porcelain() {
    return matPorcelain();
}

function matteGrayBlue() {
    return matWall();
}

function whitePlastic() {
    return matWhite();
}

function darkGray() {
    return matDark();
}

// ─── 1. Bathroom Stalls ──────────────────────────────────────────────────────

export function createBathroomStalls() {
    const group = new THREE.Group();
    group.name = 'bathroomStalls';

    const chromeMat = chrome();
    const panelMat = matteGrayBlue();
    const footMat = matFixture();

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
    const counterMat = matTileLight();
    const soapMat = matFixture();
    const soapButtonMat = matFixture();

    function buildSink(zPos) {
        const sink = new THREE.Group();
        sink.name = `sink_z${zPos}`;

        // Counter/shelf (wall-mounted slab)
        const counterGeo = new THREE.BoxGeometry(1.8, 0.12, 1.2);
        const counter = new THREE.Mesh(counterGeo, counterMat);
        counter.position.set(0, 1.6, 0);
        counter.castShadow = true;
        counter.receiveShadow = true;
        sink.add(counter);

        // Counter front edge bevel (subtle rounded edge)
        const edgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6);
        const edge = new THREE.Mesh(edgeGeo, counterMat);
        edge.rotation.z = Math.PI / 2;
        edge.position.set(0, 1.57, 0.6);
        sink.add(edge);

        // Basin (half-sphere sunk into counter, facing up)
        const basinGeo = new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const basin = new THREE.Mesh(basinGeo, porcelainMat);
        basin.rotation.x = Math.PI; // invert so hollow faces up
        basin.position.set(0, 1.6, 0.1);
        basin.castShadow = true;
        sink.add(basin);

        // Basin rim (torus ring around the basin lip)
        const rimGeo = new THREE.TorusGeometry(0.5, 0.03, 6, 12);
        const rim = new THREE.Mesh(rimGeo, porcelainMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(0, 1.66, 0.1);
        sink.add(rim);

        // Drain (small dark circle at bottom of basin)
        const drainGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8);
        const drainMat = matDark();
        const drain = new THREE.Mesh(drainGeo, drainMat);
        drain.position.set(0, 1.16, 0.1);
        sink.add(drain);

        // Faucet base (chrome cylinder on counter)
        const faucetBaseGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
        const faucetBase = new THREE.Mesh(faucetBaseGeo, chromeMat);
        faucetBase.position.set(0, 1.74, -0.25);
        sink.add(faucetBase);

        // Faucet neck (vertical then curves forward)
        const neckGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
        const neck = new THREE.Mesh(neckGeo, chromeMat);
        neck.position.set(0, 2.11, -0.25);
        neck.castShadow = true;
        sink.add(neck);

        // Faucet spout (angled cylinder going toward basin)
        const spoutGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.45, 8);
        const spout = new THREE.Mesh(spoutGeo, chromeMat);
        spout.rotation.x = Math.PI / 3;
        spout.position.set(0, 2.35, -0.05);
        spout.castShadow = true;
        sink.add(spout);

        // Spout tip
        const tipGeo = new THREE.SphereGeometry(0.035, 6, 6);
        const tip = new THREE.Mesh(tipGeo, chromeMat);
        tip.position.set(0, 2.2, 0.12);
        sink.add(tip);

        // Handle knobs (left and right)
        for (const side of [-1, 1]) {
            const knobStemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
            const knobStem = new THREE.Mesh(knobStemGeo, chromeMat);
            knobStem.position.set(side * 0.25, 1.8, -0.25);
            sink.add(knobStem);

            const knobGeo = new THREE.SphereGeometry(0.05, 6, 6);
            const knob = new THREE.Mesh(knobGeo, chromeMat);
            knob.position.set(side * 0.25, 1.93, -0.25);
            sink.add(knob);
        }

        // Wall bracket (supports the counter from below)
        const bracketGeo = new THREE.BoxGeometry(0.08, 0.6, 0.8);
        const bracketMat = matFixture();
        for (const bx of [-0.7, 0.7]) {
            const bracket = new THREE.Mesh(bracketGeo, bracketMat);
            bracket.position.set(bx, 1.25, -0.1);
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

        soapGroup.position.set(0.6, 2.8, -0.4);
        sink.add(soapGroup);

        // Position entire sink assembly on the left wall
        sink.position.set(-5.5, 0, zPos);
        // Rotate to face right (toward center of bathroom)
        sink.rotation.y = Math.PI / 2;

        return sink;
    }

    group.add(buildSink(4));

    return group;
}

// ─── 3. Mirror ───────────────────────────────────────────────────────────────

export function createMirror() {
    const group = new THREE.Group();
    group.name = 'mirror';

    const chromeMat = chrome();

    // Mirror reflective surface
    const mirrorSurfaceGeo = new THREE.PlaneGeometry(3.5, 2.2);
    const mirrorSurfaceMat = toonMat(PALETTE.rimCool);
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
    const backingMat = matInk();
    const backing = new THREE.Mesh(backingGeo, backingMat);
    backing.position.set(0, 0, -0.02);
    group.add(backing);

    // Position on left wall, facing right (+x direction)
    group.position.set(-5.9, 2.5, 3);
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
    const slotMat = matInk();
    const slot = new THREE.Mesh(slotGeo, slotMat);
    slot.position.set(0, -0.48, 0.28);
    group.add(slot);

    // Sensor window (small dark rectangle)
    const sensorGeo = new THREE.BoxGeometry(0.15, 0.1, 0.02);
    const sensorMat = matInk();
    const sensor = new THREE.Mesh(sensorGeo, sensorMat);
    sensor.position.set(0, -0.15, 0.26);
    group.add(sensor);

    // Indicator light (emissive green dot)
    const lightGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const lightMat = toonMat(PALETTE.success, { emissive: PALETTE.success, emissiveIntensity: 0.5 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0.25, 0.3, 0.26);
    group.add(light);

    // Brand label area (subtle darker rectangle)
    const labelGeo = new THREE.BoxGeometry(0.4, 0.12, 0.01);
    const labelMat = matTileLight();
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.set(0, 0.1, 0.26);
    group.add(label);

    // Wall mounting plate (behind the unit)
    const mountGeo = new THREE.BoxGeometry(0.9, 1.1, 0.04);
    const mountMat = matFixture();
    const mount = new THREE.Mesh(mountGeo, mountMat);
    mount.position.set(0, 0, -0.27);
    group.add(mount);

    // Position on right wall, facing left (-x direction)
    group.position.set(5.9, 2.2, 3);
    group.rotation.y = -Math.PI / 2;

    return group;
}

// ─── 5. Trash Can ────────────────────────────────────────────────────────────

export function createTrashCan() {
    const group = new THREE.Group();
    group.name = 'trashCan';

    const bodyMat = matInk();
    const rimMat = matDark();
    const lidMat = matDark();

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
    const innerRimMat = matInk();
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

    group.position.set(4, 0, 7);

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
    const windowMat = toonMat(PALETTE.wall, { transparent: true, opacity: 0.6 });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(0, 0.1, 0.21);
    group.add(windowMesh);

    // Dispensing slot at bottom (dark opening)
    const slotGeo = new THREE.BoxGeometry(0.7, 0.08, 0.15);
    const slotMat = matInk();
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
    const paperMat = toonMat(PALETTE.cream, { side: THREE.DoubleSide });
    const paper = new THREE.Mesh(paperGeo, paperMat);
    paper.position.set(0, -0.52, 0.15);
    paper.rotation.x = 0.08; // slight curl
    group.add(paper);

    // Mounting plate
    const mountGeo = new THREE.BoxGeometry(1.1, 0.8, 0.04);
    const mountMat = matFixture();
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
    group.position.set(5.9, 2.2, 6);
    group.rotation.y = -Math.PI / 2;

    return group;
}

// ─── 7. Bathroom Walls ──────────────────────────────────────────────────────

export function createBathroomWalls() {
    const group = new THREE.Group();
    group.name = 'bathroomWalls';

    const wallHeight = 3.5;

    // Helper: build a tiled wall segment
    function buildTiledWall(width, height, depth, transparent) {
        const wallGroup = new THREE.Group();

        // Number of horizontal tile strips
        const stripCount = 12;
        const stripHeight = height / stripCount;

        for (let i = 0; i < stripCount; i++) {
            const mat = i % 2 === 0
                ? toonMat(PALETTE.tileLight, {
                    transparent: !!transparent,
                    opacity: transparent ? 0.12 : 1.0,
                    side: transparent ? THREE.DoubleSide : THREE.FrontSide,
                })
                : toonMat(PALETTE.tileDark, {
                    transparent: !!transparent,
                    opacity: transparent ? 0.12 : 1.0,
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
    const baseboardMat = matFixture();

    // === Back wall REMOVED — camera at (0, 14, -15) needs clear view of toilet ===

    // === Left wall: at x=-6, extends past corners for overlap ===
    const leftWall = buildTiledWall(10.6, wallHeight, 0.3, false);
    leftWall.position.set(-6, 0, 4.3);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.name = 'leftWall';
    group.add(leftWall);

    // Left wall baseboard
    const bbLeftGeo = new THREE.BoxGeometry(0.35, 0.25, 10.6);
    const bbLeft = new THREE.Mesh(bbLeftGeo, baseboardMat);
    bbLeft.position.set(-5.85, 0.125, 4.3);
    bbLeft.receiveShadow = true;
    group.add(bbLeft);

    // === Right wall: at x=6, extends past corners for overlap ===
    const rightWall = buildTiledWall(10.6, wallHeight, 0.3, false);
    rightWall.position.set(6, 0, 4.3);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.name = 'rightWall';
    group.add(rightWall);

    // Right wall baseboard
    const bbRightGeo = new THREE.BoxGeometry(0.35, 0.25, 10.6);
    const bbRight = new THREE.Mesh(bbRightGeo, baseboardMat);
    bbRight.position.set(5.85, 0.125, 4.3);
    bbRight.receiveShadow = true;
    group.add(bbRight);

    // === Front flanking walls at z=9 (transparent, either side of door) ===
    // Door is 5.0 wide (x=-2.5 to 2.5), side walls at x=±6, so flanks are 3.5 wide each
    const leftFlank = buildTiledWall(3.5, wallHeight, 0.3, true);
    leftFlank.position.set(-4.25, 0, 9);
    leftFlank.name = 'leftFlank';
    group.add(leftFlank);

    const rightFlank = buildTiledWall(3.5, wallHeight, 0.3, true);
    rightFlank.position.set(4.25, 0, 9);
    rightFlank.name = 'rightFlank';
    group.add(rightFlank);

    return group;
}

// ─── 8. Office Peek ──────────────────────────────────────────────────────────

export function createOfficePeek() {
    const group = new THREE.Group();
    group.name = 'officePeek';

    // Shared materials
    const deskMat = matFixture();
    const deskLegMat = matDark();
    const cubicleWallMat = matWall();
    const cubicleFrameMat = matDark();
    const officeWallMat = matTileLight();
    const filingMat = matWall();
    const chromeMat = chrome();
    const keyboardMat = matInk();
    const monitorScreenMat = toonMat(PALETTE.charcoal, {
        emissive: PALETTE.ink,
        emissiveIntensity: 0.3,
    });
    const chairSeatMat = toonMat(PALETTE.wall);
    const chairFrameMat2 = matInk();
    const potMat = matWood();
    const leafMat = toonMat(PALETTE.success);

    // ─── Helper: build a desk with monitor ─────────────────────────────────
    function buildDesk() {
        const deskGroup = new THREE.Group();

        const deskTopGeo = new THREE.BoxGeometry(3.0, 0.12, 1.5);
        const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
        deskTop.position.y = 1.4;
        deskTop.castShadow = true;
        deskTop.receiveShadow = true;
        deskGroup.add(deskTop);

        const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.34, 6);
        for (const [lx, ly, lz] of [[-1.35,0.67,-0.6],[1.35,0.67,-0.6],[-1.35,0.67,0.6],[1.35,0.67,0.6]]) {
            const leg = new THREE.Mesh(legGeo, deskLegMat);
            leg.position.set(lx, ly, lz);
            leg.castShadow = true;
            deskGroup.add(leg);
        }

        const kb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.4), keyboardMat);
        kb.position.set(-0.2, 1.5, 0.1);
        deskGroup.add(kb);

        const mon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.06), monitorScreenMat);
        mon.position.set(-0.2, 2.4, -0.4);
        mon.castShadow = true;
        deskGroup.add(mon);

        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), deskLegMat);
        stand.position.set(-0.2, 1.7, -0.4);
        deskGroup.add(stand);

        const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 8), deskLegMat);
        standBase.position.set(-0.2, 1.48, -0.4);
        deskGroup.add(standBase);

        return deskGroup;
    }

    // ─── Helper: build an office chair ─────────────────────────────────────
    function buildChair() {
        const chairGroup = new THREE.Group();

        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 1.0), chairSeatMat);
        seat.position.y = 0.85;
        seat.castShadow = true;
        chairGroup.add(seat);

        const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.12), chairSeatMat);
        backrest.position.set(0, 1.65, -0.5);
        backrest.rotation.x = 0.15;
        backrest.castShadow = true;
        chairGroup.add(backrest);

        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), chairFrameMat2);
        post.position.y = 0.50;
        chairGroup.add(post);

        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const baseLeg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), chairFrameMat2);
            baseLeg.position.set(Math.sin(angle)*0.3, 0.08, Math.cos(angle)*0.3);
            baseLeg.rotation.y = angle;
            chairGroup.add(baseLeg);
            const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), chairFrameMat2);
            wheel.position.set(Math.sin(angle)*0.55, 0.06, Math.cos(angle)*0.55);
            chairGroup.add(wheel);
        }

        return chairGroup;
    }

    // ─── Helper: build a cubicle wall partition ────────────────────────────
    function buildCubiclePartition(width, height) {
        const partitionGroup = new THREE.Group();

        const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), cubicleWallMat);
        panel.position.y = height / 2;
        panel.castShadow = true;
        panel.receiveShadow = true;
        partitionGroup.add(panel);

        const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.06, 0.14), cubicleFrameMat);
        trim.position.y = height + 0.03;
        partitionGroup.add(trim);

        const rail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, 0.06, 0.14), cubicleFrameMat);
        rail.position.y = 0.03;
        partitionGroup.add(rail);

        for (const sx of [-1, 1]) {
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.5), cubicleFrameMat);
            foot.position.set(sx * (width / 2 - 0.1), 0.02, 0.2);
            foot.receiveShadow = true;
            partitionGroup.add(foot);
        }

        return partitionGroup;
    }

    // ─── Helper: build a filing cabinet ────────────────────────────────────
    function buildFilingCabinet() {
        const fg = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 0.8), filingMat);
        body.position.y = 1.2;
        body.castShadow = true;
        body.receiveShadow = true;
        fg.add(body);

        for (let d = 0; d < 3; d++) {
            const dy = 0.4 + d * 0.8;
            const face = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.68, 0.02), filingMat);
            face.position.set(0, dy, 0.41);
            fg.add(face);
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.06), chromeMat);
            handle.position.set(0, dy + 0.12, 0.44);
            fg.add(handle);
        }
        return fg;
    }

    // ─── Helper: build a potted plant ──────────────────────────────────────
    function buildPlant() {
        const pg = new THREE.Group();
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 8), potMat);
        pot.position.y = 0.4;
        pot.castShadow = true;
        pg.add(pot);

        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.06, 8),
            toonMat(PALETTE.ink));
        soil.position.y = 0.8;
        pg.add(soil);

        const trunkMat = matWood();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), trunkMat);
        trunk.position.y = 1.1;
        pg.add(trunk);

        for (const [lx,ly,lz,lr] of [[0,1.5,0,0.4],[0.2,1.7,0.15,0.3],[-0.15,1.8,-0.1,0.28],[0.1,1.3,-0.15,0.25],[-0.2,1.4,0.1,0.22]]) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr, 6, 6), leafMat);
            leaf.position.set(lx, ly, lz);
            leaf.castShadow = true;
            pg.add(leaf);
        }
        return pg;
    }

    // ─── Helper: build a printer/copier ────────────────────────────────────
    function buildPrinter() {
        const pg = new THREE.Group();
        const printerBodyMat = matWhite();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.5), printerBodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        pg.add(body);

        // Top lid / scanner
        const lid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 1.5), matFixture());
        lid.position.y = 1.23;
        pg.add(lid);

        // Front panel (dark)
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.02), matInk());
        panel.position.set(0, 0.9, 0.76);
        pg.add(panel);

        // Paper tray sticking out
        const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.6), printerBodyMat);
        tray.position.set(0, 0.15, 1.0);
        pg.add(tray);

        // Status LED
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6),
            toonMat(PALETTE.success, { emissive: PALETTE.success, emissiveIntensity: 0.5 }));
        led.position.set(0.6, 0.95, 0.76);
        pg.add(led);

        return pg;
    }

    // ─── Helper: build a whiteboard ────────────────────────────────────────
    function buildWhiteboard() {
        const wg = new THREE.Group();
        const boardMat = matWhite();
        const wbFrameMat = matFixture();

        const board = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.0, 0.08), boardMat);
        board.castShadow = true;
        wg.add(board);

        const fh = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 0.1), wbFrameMat);
        fh.position.y = 1.03;
        wg.add(fh);
        const fb = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 0.1), wbFrameMat);
        fb.position.y = -1.03;
        wg.add(fb);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.12, 0.1), wbFrameMat);
        fl.position.x = -1.53;
        wg.add(fl);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.12, 0.1), wbFrameMat);
        fr.position.x = 1.53;
        wg.add(fr);

        const tray = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.15), wbFrameMat);
        tray.position.set(0, -1.08, 0.08);
        wg.add(tray);

        const markerColors = [0xcc2222, 0x2244cc, 0x222222];
        for (let m = 0; m < 3; m++) {
            const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6),
                toonMat(markerColors[m]));
            marker.rotation.z = Math.PI / 2;
            marker.position.set(-0.4 + m * 0.4, -1.03, 0.1);
            wg.add(marker);
        }
        return wg;
    }

    // ─── Helper: build a bookshelf ─────────────────────────────────────────
    function buildBookshelf() {
        const bg = new THREE.Group();
        const woodMat = matWood();

        // Frame (back, sides, top, bottom)
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.0, 0.06), woodMat);
        back.position.set(0, 2.0, -0.35);
        back.castShadow = true;
        bg.add(back);

        for (const sx of [-1, 1]) {
            const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 0.7), woodMat);
            side.position.set(sx * 1.2, 2.0, 0);
            side.castShadow = true;
            bg.add(side);
        }

        // 4 shelves
        for (let s = 0; s < 4; s++) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.06, 0.68), woodMat);
            shelf.position.set(0, 0.03 + s * 1.3, 0);
            shelf.receiveShadow = true;
            bg.add(shelf);
        }

        // Books on each shelf (colored blocks)
        const bookColors = [0x8B2222, 0x22448B, 0x2E8B57, 0x8B8B00, 0x6B3FA0, 0xCC6633, 0x336699];
        for (let s = 0; s < 3; s++) {
            const shelfY = 0.06 + s * 1.3;
            let bx = -1.0;
            for (let b = 0; b < 5 + Math.floor(Math.random() * 3); b++) {
                const bw = 0.12 + Math.random() * 0.15;
                const bh = 0.8 + Math.random() * 0.4;
                const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.5),
                    toonMat(bookColors[b % bookColors.length]));
                book.position.set(bx + bw / 2, shelfY + bh / 2, 0);
                bg.add(book);
                bx += bw + 0.02;
                if (bx > 1.0) break;
            }
        }
        return bg;
    }

    // ════════════════════════════════════════════════════════════════════════
    // OFFICE WALLS — enclose the space at far left/right
    // ════════════════════════════════════════════════════════════════════════

    // Office walls with windows — drones fly through these!
    const windowDefs = [
        { z: 24, width: 5, height: 2.5, sillY: 1.5 },
        { z: 35, width: 5, height: 2.5, sillY: 1.5 },
        { z: 46, width: 5, height: 2.5, sillY: 1.5 },
        { z: 57, width: 5, height: 2.5, sillY: 1.5 },
    ];
    const wallZStart = 12.5;
    const wallZEnd = 67.5;
    const wallHeight = 6;
    const windowFrameMat = matFixture();
    const windowGlassMat = toonMat(PALETTE.rimCool, {
        transparent: true,
        opacity: 0.15,
    });

    // Store window center positions for drone spawning
    const windowPositions = [];

    for (const wallX of [-36, 36]) {
        // Bottom strip (below windows)
        const bottomStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, windowDefs[0].sillY, wallZEnd - wallZStart),
            officeWallMat
        );
        bottomStrip.position.set(wallX, windowDefs[0].sillY / 2, (wallZStart + wallZEnd) / 2);
        bottomStrip.receiveShadow = true;
        group.add(bottomStrip);

        // Top strip (above windows)
        const topY = windowDefs[0].sillY + windowDefs[0].height;
        const topH = wallHeight - topY;
        const topStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, topH, wallZEnd - wallZStart),
            officeWallMat
        );
        topStrip.position.set(wallX, topY + topH / 2, (wallZStart + wallZEnd) / 2);
        topStrip.receiveShadow = true;
        group.add(topStrip);

        // Pillars between windows (at window height)
        const pillarH = windowDefs[0].height;
        const pillarY = windowDefs[0].sillY + pillarH / 2;
        const sorted = [...windowDefs].sort((a, b) => a.z - b.z);
        let prevEnd = wallZStart;
        for (const w of sorted) {
            const wStart = w.z - w.width / 2;
            if (wStart > prevEnd + 0.01) {
                const pillarLen = wStart - prevEnd;
                const pillar = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, pillarH, pillarLen),
                    officeWallMat
                );
                pillar.position.set(wallX, pillarY, prevEnd + pillarLen / 2);
                pillar.receiveShadow = true;
                group.add(pillar);
            }
            prevEnd = w.z + w.width / 2;
        }
        // Final pillar after last window
        if (prevEnd < wallZEnd - 0.01) {
            const pillarLen = wallZEnd - prevEnd;
            const pillar = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, pillarH, pillarLen),
                officeWallMat
            );
            pillar.position.set(wallX, pillarY, prevEnd + pillarLen / 2);
            pillar.receiveShadow = true;
            group.add(pillar);
        }

        // Window frames + glass
        for (const w of windowDefs) {
            const cy = w.sillY + w.height / 2;

            // Glass pane
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, w.height - 0.1, w.width - 0.1),
                windowGlassMat
            );
            glass.position.set(wallX, cy, w.z);
            group.add(glass);

            // Frame — top
            const ft = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.1, w.width + 0.2),
                windowFrameMat
            );
            ft.position.set(wallX, w.sillY + w.height, w.z);
            group.add(ft);

            // Frame — sill (wider, for visual weight)
            const fs = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.1, w.width + 0.3),
                windowFrameMat
            );
            fs.position.set(wallX, w.sillY, w.z);
            group.add(fs);

            // Frame — left post
            const fl = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, w.height, 0.1),
                windowFrameMat
            );
            fl.position.set(wallX, cy, w.z - w.width / 2);
            group.add(fl);

            // Frame — right post
            const fr = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, w.height, 0.1),
                windowFrameMat
            );
            fr.position.set(wallX, cy, w.z + w.width / 2);
            group.add(fr);

            // Cross dividers (muntin bars)
            const crossH = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, 0.05, w.width),
                windowFrameMat
            );
            crossH.position.set(wallX, cy, w.z);
            group.add(crossH);
            const crossV = new THREE.Mesh(
                new THREE.BoxGeometry(0.22, w.height, 0.05),
                windowFrameMat
            );
            crossV.position.set(wallX, cy, w.z);
            group.add(crossV);

            // Store window center for drone system
            windowPositions.push({ x: wallX, y: cy, z: w.z });
        }
    }

    // Attach window positions to group for drone spawning
    group.userData.windowPositions = windowPositions;

    // Back office wall (far end) — split with a wide corridor doorway in the center
    const exitDoorWidth = 12;
    const wallTotalWidth = 72;
    const halfSectionWidth = (wallTotalWidth - exitDoorWidth) / 2;

    // Left section of back wall
    const backWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(halfSectionWidth, 6, 0.2),
        officeWallMat
    );
    backWallLeft.position.set(-(exitDoorWidth / 2 + halfSectionWidth / 2), 3, 68);
    backWallLeft.receiveShadow = true;
    group.add(backWallLeft);

    // Right section of back wall
    const backWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(halfSectionWidth, 6, 0.2),
        officeWallMat
    );
    backWallRight.position.set(exitDoorWidth / 2 + halfSectionWidth / 2, 3, 68);
    backWallRight.receiveShadow = true;
    group.add(backWallRight);

    // Door header (lintel above the doorway)
    const doorHeader = new THREE.Mesh(
        new THREE.BoxGeometry(exitDoorWidth + 0.4, 1.0, 0.25),
        officeWallMat
    );
    doorHeader.position.set(0, 5.5, 68);
    group.add(doorHeader);

    // Door frame — vertical posts
    const doorFrameMat = matFixture();
    for (const side of [-1, 1]) {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 6, 0.3),
            doorFrameMat
        );
        post.position.set(side * (exitDoorWidth / 2 + 0.12), 3, 68);
        group.add(post);
    }

    // Double doors — start closed, enemies push them open (spring physics)
    const exitDoorMat = matWood();
    const exitDoorHalf = exitDoorWidth / 2;

    // Left door — pivot on left edge (hinge at x = -exitDoorHalf)
    const leftDoor = new THREE.Mesh(
        new THREE.BoxGeometry(exitDoorHalf - 0.1, 5.0, 0.12),
        matWood()
    );
    leftDoor.castShadow = true;
    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-exitDoorHalf, 0, 68);
    leftDoor.position.set(exitDoorHalf / 2, 2.5, 0);
    leftDoorPivot.add(leftDoor);
    leftDoorPivot.rotation.y = 0; // starts closed
    group.add(leftDoorPivot);

    // Right door — pivot on right edge (hinge at x = +exitDoorHalf)
    const rightDoor = new THREE.Mesh(
        new THREE.BoxGeometry(exitDoorHalf - 0.1, 5.0, 0.12),
        matWood()
    );
    rightDoor.castShadow = true;
    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(exitDoorHalf, 0, 68);
    rightDoor.position.set(-exitDoorHalf / 2, 2.5, 0);
    rightDoorPivot.add(rightDoor);
    rightDoorPivot.rotation.y = 0; // starts closed
    group.add(rightDoorPivot);

    // Push-bar handles (chrome, on each door — the side facing the corridor)
    for (const door of [leftDoor, rightDoor]) {
        const handleBar = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.08, 0.08),
            chromeMat
        );
        handleBar.position.set(0, 0, 0.1);
        door.add(handleBar);

        for (const mx of [-0.6, 0.6]) {
            const mount = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, 0.1, 6),
                chromeMat
            );
            mount.rotation.x = Math.PI / 2;
            mount.position.set(mx, 0, 0.06);
            door.add(mount);
        }
    }

    // Store door physics state for the update loop
    group.userData.exitDoors = {
        leftPivot: leftDoorPivot,
        rightPivot: rightDoorPivot,
        leftAngle: 0,    // current angle (positive = open inward, toward -z)
        rightAngle: 0,
        leftAngVel: 0,   // angular velocity
        rightAngVel: 0,
        doorZ: 68,
        halfWidth: exitDoorHalf,
        springK: 8,       // spring stiffness (pulls door closed)
        dampK: 3,         // damping (reduces oscillation, but allows bouncing)
        pushImpulse: 5,   // base angular impulse per enemy push
        maxAngle: 1.4,    // max open angle (~80 degrees)
        minAngle: -0.15,  // slight backward bounce allowed
    };

    // EXIT sign above the door
    const exitSignGroup = new THREE.Group();
    exitSignGroup.name = 'exitSign';

    // Sign box (red background)
    const signBoxGeo = new THREE.BoxGeometry(2.4, 0.7, 0.1);
    const signBoxMat = matDanger();
    const signBox = new THREE.Mesh(signBoxGeo, signBoxMat);
    exitSignGroup.add(signBox);

    // "EXIT" text — four individual letter blocks (simple geometric approximation)
    const letterMat = new THREE.MeshBasicMaterial({
        color: PALETTE.white,
    });

    // E
    const eGroup = new THREE.Group();
    eGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.05), letterMat));
    eGroup.children[0].position.set(-0.1, 0, 0.06);
    eGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), letterMat));
    eGroup.children[1].position.set(0, 0.15, 0.06);
    eGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), letterMat));
    eGroup.children[2].position.set(-0.02, 0, 0.06);
    eGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), letterMat));
    eGroup.children[3].position.set(0, -0.15, 0.06);
    eGroup.position.x = -0.65;
    exitSignGroup.add(eGroup);

    // X
    const xGroup = new THREE.Group();
    const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.05), letterMat);
    xBar1.rotation.z = 0.5;
    xBar1.position.z = 0.06;
    xGroup.add(xBar1);
    const xBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.05), letterMat);
    xBar2.rotation.z = -0.5;
    xBar2.position.z = 0.06;
    xGroup.add(xBar2);
    xGroup.position.x = -0.25;
    exitSignGroup.add(xGroup);

    // I
    const iBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.05), letterMat);
    iBar.position.set(0.1, 0, 0.06);
    exitSignGroup.add(iBar);

    // T
    const tGroup = new THREE.Group();
    tGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.05), letterMat));
    tGroup.children[0].position.set(0, 0, 0.06);
    tGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.05), letterMat));
    tGroup.children[1].position.set(0, 0.15, 0.06);
    tGroup.position.x = 0.5;
    exitSignGroup.add(tGroup);

    // Small red glow light under the sign
    const exitLight = new THREE.PointLight(PALETTE.danger, 0.4, 8, 2);
    exitLight.position.set(0, -0.6, 0.3);
    exitSignGroup.add(exitLight);

    exitSignGroup.position.set(0, 6.2, 68.05);
    group.add(exitSignGroup);

    // ════════════════════════════════════════════════════════════════════════
    // DESKS + CHAIRS — populate the office in rows
    // ════════════════════════════════════════════════════════════════════════

    // Left row (x = -20, facing right)
    const leftDeskPositions = [22, 30, 38, 46];
    for (const z of leftDeskPositions) {
        const d = buildDesk();
        d.position.set(-20, 0, z);
        d.rotation.y = Math.PI / 2;
        group.add(d);

        const c = buildChair();
        c.position.set(-18, 0, z);
        c.rotation.y = -0.3 + Math.random() * 0.6;
        group.add(c);
    }

    // Left outer row (x = -28, facing right)
    for (const z of [22, 30, 38, 46]) {
        const d = buildDesk();
        d.position.set(-28, 0, z);
        d.rotation.y = Math.PI / 2;
        group.add(d);

        const c = buildChair();
        c.position.set(-26, 0, z);
        c.rotation.y = -0.2 + Math.random() * 0.4;
        group.add(c);
    }

    // Right row (x = 20, facing left)
    const rightDeskPositions = [22, 30, 38, 46];
    for (const z of rightDeskPositions) {
        const d = buildDesk();
        d.position.set(20, 0, z);
        d.rotation.y = -Math.PI / 2;
        group.add(d);

        const c = buildChair();
        c.position.set(18, 0, z);
        c.rotation.y = Math.PI + (-0.3 + Math.random() * 0.6);
        group.add(c);
    }

    // Right outer row (x = 28, facing left)
    for (const z of [22, 30, 38, 46]) {
        const d = buildDesk();
        d.position.set(28, 0, z);
        d.rotation.y = -Math.PI / 2;
        group.add(d);

        const c = buildChair();
        c.position.set(26, 0, z);
        c.rotation.y = Math.PI + (-0.2 + Math.random() * 0.4);
        group.add(c);
    }

    // ════════════════════════════════════════════════════════════════════════
    // WATER COOLER
    // ════════════════════════════════════════════════════════════════════════

    const coolerGroup = new THREE.Group();
    coolerGroup.name = 'waterCooler';

    const coolerBodyMat = matWhite();
    const waterJugMat = toonMat(PALETTE.rimCool, {
        transparent: true,
        opacity: 0.6,
    });

    const coolerBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7), coolerBodyMat);
    coolerBody.position.y = 0.7;
    coolerBody.castShadow = true;
    coolerGroup.add(coolerBody);

    const coolerTop = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.75), coolerBodyMat);
    coolerTop.position.y = 1.44;
    coolerGroup.add(coolerTop);

    const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.15, 0.9, 8), waterJugMat);
    jug.position.y = 1.93;
    coolerGroup.add(jug);

    const jugCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8),
        toonMat(PALETTE.wall));
    jugCap.position.y = 2.40;
    coolerGroup.add(jugCap);

    for (const [sx, color] of [[0.15, PALETTE.danger], [-0.15, PALETTE.rimCool]]) {
        const sm = toonMat(color);
        const spigot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), sm);
        spigot.rotation.x = Math.PI / 2;
        spigot.position.set(sx, 1.05, 0.38);
        coolerGroup.add(spigot);
    }

    coolerGroup.position.set(16, 0, 18);
    coolerGroup.rotation.y = -Math.PI / 2;
    group.add(coolerGroup);

    // Second water cooler on far left
    const cooler2 = coolerGroup.clone();
    cooler2.position.set(-16, 0, 50);
    cooler2.rotation.y = Math.PI / 2;
    group.add(cooler2);

    // ════════════════════════════════════════════════════════════════════════
    // FILING CABINETS — scattered around
    // ════════════════════════════════════════════════════════════════════════

    const fcPositions = [
        { x: -20, z: 26, ry: Math.PI / 2 },
        { x: -28, z: 35, ry: Math.PI / 2 },
        { x: 20, z: 26, ry: -Math.PI / 2 },
        { x: 28, z: 42, ry: -Math.PI / 2 },
        { x: -20, z: 50, ry: Math.PI / 2 },
        { x: 20, z: 50, ry: -Math.PI / 2 },
    ];
    for (const fp of fcPositions) {
        const fc = buildFilingCabinet();
        fc.position.set(fp.x, 0, fp.z);
        fc.rotation.y = fp.ry;
        group.add(fc);
    }

    // ════════════════════════════════════════════════════════════════════════
    // POTTED PLANTS — decorative touches
    // ════════════════════════════════════════════════════════════════════════

    const plantPositions = [
        { x: 16, z: 20 },
        { x: -16, z: 18 },
        { x: -33, z: 25 },
        { x: 33, z: 25 },
        { x: -33, z: 45 },
        { x: 33, z: 45 },
    ];
    for (const pp of plantPositions) {
        const plant = buildPlant();
        plant.position.set(pp.x, 0, pp.z);
        group.add(plant);
    }

    // ════════════════════════════════════════════════════════════════════════
    // WHITEBOARDS — on the office walls
    // ════════════════════════════════════════════════════════════════════════

    const wb1 = buildWhiteboard();
    wb1.position.set(-35.8, 3.5, 30);
    wb1.rotation.y = Math.PI / 2;
    group.add(wb1);

    const wb2 = buildWhiteboard();
    wb2.position.set(35.8, 3.5, 40);
    wb2.rotation.y = -Math.PI / 2;
    group.add(wb2);

    const wb3 = buildWhiteboard();
    wb3.position.set(-35.8, 3.5, 45);
    wb3.rotation.y = Math.PI / 2;
    group.add(wb3);

    // ════════════════════════════════════════════════════════════════════════
    // PRINTERS — in the aisles
    // ════════════════════════════════════════════════════════════════════════

    const printer1 = buildPrinter();
    printer1.position.set(-24, 0, 34);
    printer1.rotation.y = Math.PI / 2;
    group.add(printer1);

    const printer2 = buildPrinter();
    printer2.position.set(24, 0, 42);
    printer2.rotation.y = -Math.PI / 2;
    group.add(printer2);

    // ════════════════════════════════════════════════════════════════════════
    // BOOKSHELVES — against the office walls
    // ════════════════════════════════════════════════════════════════════════

    const bs1 = buildBookshelf();
    bs1.position.set(-35.5, 0, 40.5);
    bs1.rotation.y = Math.PI / 2;
    group.add(bs1);

    const bs2 = buildBookshelf();
    bs2.position.set(35.5, 0, 36);
    bs2.rotation.y = -Math.PI / 2;
    group.add(bs2);

    const bs3 = buildBookshelf();
    bs3.position.set(35.5, 0, 50);
    bs3.rotation.y = -Math.PI / 2;
    group.add(bs3);

    // ════════════════════════════════════════════════════════════════════════
    // CUBICLE WALL PARTITIONS — frame the lane and create cubicle rows
    // ════════════════════════════════════════════════════════════════════════

    const partitionHeight = 3.5;

    // Inner lane partitions (x = ±15.5) — frame the gameplay lane
    for (const z of [25, 38, 51]) {
        const lp = buildCubiclePartition(6.0, partitionHeight);
        lp.position.set(-15.5, 0, z);
        lp.rotation.y = Math.PI / 2;
        group.add(lp);

        const rp = buildCubiclePartition(6.0, partitionHeight);
        rp.position.set(15.5, 0, z);
        rp.rotation.y = Math.PI / 2;
        group.add(rp);
    }

    // Middle row partitions (x = ±24) — divide the desk rows
    for (const z of [20, 33, 46]) {
        const lp = buildCubiclePartition(6.0, partitionHeight);
        lp.position.set(-24, 0, z);
        lp.rotation.y = Math.PI / 2;
        group.add(lp);

        const rp = buildCubiclePartition(6.0, partitionHeight);
        rp.position.set(24, 0, z);
        rp.rotation.y = Math.PI / 2;
        group.add(rp);
    }

    // Outer row partitions (x = ±32) — near the walls
    for (const z of [22, 38, 54]) {
        const lp = buildCubiclePartition(6.0, partitionHeight);
        lp.position.set(-32, 0, z);
        lp.rotation.y = Math.PI / 2;
        group.add(lp);

        const rp = buildCubiclePartition(6.0, partitionHeight);
        rp.position.set(32, 0, z);
        rp.rotation.y = Math.PI / 2;
        group.add(rp);
    }

    // Cross-partitions (run along X) to create cubicle cells
    for (const x of [-20, -28]) {
        for (const z of [26, 34, 42]) {
            const cp = buildCubiclePartition(4.0, partitionHeight);
            cp.position.set(x, 0, z);
            group.add(cp);
        }
    }
    for (const x of [20, 28]) {
        for (const z of [26, 34, 42]) {
            const cp = buildCubiclePartition(4.0, partitionHeight);
            cp.position.set(x, 0, z);
            group.add(cp);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // OFFICE LIGHTING — subtle PointLights only, no visible fixtures
    // ════════════════════════════════════════════════════════════════════════

    const officeLight1 = new THREE.PointLight(PALETTE.fillWarm, 0.6, 25, 2);
    officeLight1.position.set(-20, 5.5, 30);
    group.add(officeLight1);

    const officeLight2 = new THREE.PointLight(PALETTE.fillWarm, 0.6, 25, 2);
    officeLight2.position.set(20, 5.5, 30);
    group.add(officeLight2);

    const officeLight3 = new THREE.PointLight(PALETTE.fillWarm, 0.5, 25, 2);
    officeLight3.position.set(0, 5.5, 45);
    group.add(officeLight3);

    // ════════════════════════════════════════════════════════════════════════
    // FLOOR ELEMENTS
    // ════════════════════════════════════════════════════════════════════════

    // Carpet transition strip on the floor at the doorway
    const transitionStrip = new THREE.Mesh(
        new THREE.BoxGeometry(6.0, 0.04, 0.15),
        matFixture()
    );
    transitionStrip.position.set(0, 0.02, 10.5);
    transitionStrip.receiveShadow = true;
    group.add(transitionStrip);

    // Office carpet — wide enough to cover entire visible area
    const carpet = new THREE.Mesh(
        new THREE.BoxGeometry(80, 0.05, 60),
        matCarpet()
    );
    carpet.position.set(0, 0.01, 42);
    carpet.receiveShadow = true;
    group.add(carpet);

    return group;
}

// ─── 9. Bathroom Door ───────────────────────────────────────────────────────

export function createBathroomDoor() {
    const group = new THREE.Group();
    group.name = 'bathroomDoor';

    const doorColor = PALETTE.wood;

    const doorMat = toonMat(doorColor, {
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    // depthWrite: false not natively supported by toonMat — set manually
    doorMat.depthWrite = false;

    const chromeMat = chrome();

    // ─── Door panel ────────────────────────────────────────────────────────
    // Sized to match compact bathroom (walls at x=+-6, height 3.5)
    const doorGeo = new THREE.BoxGeometry(5.0, 3.3, 0.15);
    const doorPanel = new THREE.Mesh(doorGeo, doorMat);
    doorPanel.position.set(0, 1.75, 0); // centered vertically
    doorPanel.castShadow = false;
    doorPanel.receiveShadow = false;
    group.add(doorPanel);

    // ─── Door handle (right side) ──────────────────────────────────────────
    // Handle base (chrome sphere)
    const handleBaseGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const handleBase = new THREE.Mesh(handleBaseGeo, chromeMat);
    handleBase.position.set(1.8, 1.7, 0.12);
    group.add(handleBase);

    // Handle lever (chrome cylinder)
    const handleLeverGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    const handleLever = new THREE.Mesh(handleLeverGeo, chromeMat);
    handleLever.rotation.z = Math.PI / 2;
    handleLever.position.set(1.8, 1.7, 0.2);
    group.add(handleLever);

    // Handle escutcheon (back plate on the other side)
    const handleBackGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const handleBack = new THREE.Mesh(handleBackGeo, chromeMat);
    handleBack.position.set(1.8, 1.7, -0.12);
    group.add(handleBack);

    // ─── Crack / damage overlay meshes (Fortnite-style 3-layer glow) ─────
    // Three layers per segment: soft halo → dark outline → bright glow center
    const crackDarkMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.9 });
    const crackGlowMat = new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0.85 });
    const crackHaloMat = new THREE.MeshBasicMaterial({ color: PALETTE.glow, transparent: true, opacity: 0.25 });
    const cracks = [];

    function buildCrack(segments, zBase) {
        const crackGroup = new THREE.Group();
        for (const seg of segments) {
            // Soft ambient halo (widest, behind)
            const haloGeo = new THREE.BoxGeometry(seg.w * 1.6, seg.h * 4, 0.01);
            const haloMesh = new THREE.Mesh(haloGeo, crackHaloMat);
            haloMesh.position.set(seg.x, seg.y, zBase - 0.003);
            if (seg.rot) haloMesh.rotation.z = seg.rot;
            crackGroup.add(haloMesh);

            // Dark crack outline (middle layer)
            const darkGeo = new THREE.BoxGeometry(seg.w * 1.2, seg.h * 2.5, 0.01);
            const darkMesh = new THREE.Mesh(darkGeo, crackDarkMat);
            darkMesh.position.set(seg.x, seg.y, zBase);
            if (seg.rot) darkMesh.rotation.z = seg.rot;
            crackGroup.add(darkMesh);

            // Bright glow center (front, thinnest)
            const glowGeo = new THREE.BoxGeometry(seg.w, seg.h * 1.5, 0.01);
            const glowMesh = new THREE.Mesh(glowGeo, crackGlowMat);
            glowMesh.position.set(seg.x, seg.y, zBase + 0.003);
            if (seg.rot) glowMesh.rotation.z = seg.rot;
            crackGroup.add(glowMesh);
        }
        crackGroup.visible = false;
        return crackGroup;
    }

    // Crack 0 — upper left area (HP ≤ 80%)
    const crack0 = buildCrack([
        { x: -1.25, y: 2.3, w: 0.6, h: 0.09, rot: 0.3 },
        { x: -1.0, y: 2.2, w: 0.45, h: 0.09, rot: -0.5 },
        { x: -0.83, y: 2.1, w: 0.38, h: 0.08, rot: 0.15 },
        { x: -1.12, y: 2.35, w: 0.3, h: 0.08, rot: -0.8 },
        { x: -0.65, y: 2.05, w: 0.28, h: 0.07, rot: 0.55 },
        { x: -1.35, y: 2.18, w: 0.22, h: 0.07, rot: -0.2 },
    ], 0.085);
    crack0.name = 'crack_0';
    group.add(crack0);
    cracks.push(crack0);

    // Crack 1 — center-right area (HP ≤ 60%)
    const crack1 = buildCrack([
        { x: 0.83, y: 1.82, w: 0.7, h: 0.09, rot: -0.2 },
        { x: 1.08, y: 1.74, w: 0.5, h: 0.09, rot: 0.6 },
        { x: 0.67, y: 1.9, w: 0.32, h: 0.08, rot: -0.4 },
        { x: 0.92, y: 1.65, w: 0.45, h: 0.08, rot: 0.1 },
        { x: 1.2, y: 1.85, w: 0.25, h: 0.07, rot: -0.7 },
        { x: 0.55, y: 1.72, w: 0.22, h: 0.07, rot: 0.45 },
    ], 0.085);
    crack1.name = 'crack_1';
    group.add(crack1);
    cracks.push(crack1);

    // Crack 2 — lower center (HP ≤ 40%)
    const crack2 = buildCrack([
        { x: -0.25, y: 0.85, w: 0.75, h: 0.10, rot: 0.1 },
        { x: 0.08, y: 0.74, w: 0.6, h: 0.09, rot: -0.35 },
        { x: -0.08, y: 0.97, w: 0.42, h: 0.09, rot: 0.5 },
        { x: 0.25, y: 0.65, w: 0.38, h: 0.08, rot: -0.15 },
        { x: -0.42, y: 0.8, w: 0.3, h: 0.08, rot: 0.7 },
        { x: 0.4, y: 0.88, w: 0.25, h: 0.07, rot: -0.5 },
        { x: -0.55, y: 0.92, w: 0.22, h: 0.07, rot: 0.3 },
    ], 0.085);
    crack2.name = 'crack_2';
    group.add(crack2);
    cracks.push(crack2);

    // Crack 3 — upper right (HP ≤ 20%)
    const crack3 = buildCrack([
        { x: 1.5, y: 2.56, w: 0.5, h: 0.10, rot: -0.6 },
        { x: 1.33, y: 2.45, w: 0.45, h: 0.10, rot: 0.25 },
        { x: 1.67, y: 2.48, w: 0.38, h: 0.09, rot: -0.1 },
        { x: 1.2, y: 2.38, w: 0.3, h: 0.08, rot: 0.5 },
        { x: 1.75, y: 2.6, w: 0.25, h: 0.08, rot: -0.45 },
    ], 0.085);
    crack3.name = 'crack_3';
    group.add(crack3);
    cracks.push(crack3);

    // Crack 4 — center critical (HP ≤ 10%)
    const crack4 = buildCrack([
        { x: -1.5, y: 1.02, w: 0.55, h: 0.12, rot: 0.4 },
        { x: -1.67, y: 1.14, w: 0.42, h: 0.10, rot: -0.3 },
        { x: -1.33, y: 0.91, w: 0.48, h: 0.10, rot: 0.6 },
        { x: -1.58, y: 1.22, w: 0.3, h: 0.09, rot: -0.7 },
        { x: -1.25, y: 1.08, w: 0.38, h: 0.09, rot: 0.2 },
        { x: -1.8, y: 1.08, w: 0.25, h: 0.08, rot: -0.15 },
        { x: -1.1, y: 0.82, w: 0.22, h: 0.08, rot: 0.55 },
    ], 0.085);
    crack4.name = 'crack_4';
    group.add(crack4);
    cracks.push(crack4);

    // ─── Store metadata on group.userData ───────────────────────────────────
    group.userData.door = doorPanel;
    group.userData.cracks = cracks;
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    // Position the door group flush with the flanking walls
    group.position.set(0, 0, 9);

    return group;
}

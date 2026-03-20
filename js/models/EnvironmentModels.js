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

    const FURN_SCALE = 2.5;

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

        deskGroup.scale.setScalar(FURN_SCALE);
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

        chairGroup.scale.setScalar(FURN_SCALE);
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
        fg.scale.setScalar(FURN_SCALE);
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
        pg.scale.setScalar(FURN_SCALE);
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

        pg.scale.setScalar(FURN_SCALE);
        return pg;
    }

    // ─── Helper: build a whiteboard ────────────────────────────────────────
    function buildWhiteboard() {
        const wg = new THREE.Group();
        const boardMat = matWhite();
        const wbFrameMat = matFixture();

        const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 0.08), boardMat);
        board.castShadow = true;
        wg.add(board);

        const fh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.1), wbFrameMat);
        fh.position.y = 1.03;
        wg.add(fh);
        const fb = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.1), wbFrameMat);
        fb.position.y = -1.03;
        wg.add(fb);
        const fl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.12, 0.1), wbFrameMat);
        fl.position.x = -1.13;
        wg.add(fl);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.12, 0.1), wbFrameMat);
        fr.position.x = 1.13;
        wg.add(fr);

        const tray = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.15), wbFrameMat);
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
        wg.scale.setScalar(FURN_SCALE);
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
        bg.scale.setScalar(FURN_SCALE);
        return bg;
    }

    // ─── Helper: add desk clutter based on index ─────────────────────────
    // Items use exclusive zones to avoid clipping:
    //   Right-front (x~0.7, z~0.2): mug OR mouse+pad (mutually exclusive)
    //   Right-back  (x~1.0, z~-0.5): photo frame OR lamp (mutually exclusive)
    //   Center-back (x~0.5, z~-0.15): paper stack (doesn't conflict)
    //   Monitor face (z~-0.37): sticky notes (doesn't conflict)
    function addDeskClutter(deskGroup, idx) {
        const slot = idx % 5; // 0-4 determines which right-front item

        // Right-front zone — pick ONE item
        if (slot === 0 || slot === 2 || slot === 4) {
            // Coffee mug
            const mugColors = [0xcc4444, 0x4488cc, 0xf0f0e8, 0x44aa44, 0xeecc44];
            const mugMat = toonMat(mugColors[idx % mugColors.length]);
            const mugBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.09, 0.2, 8), mugMat);
            mugBody.position.set(0.8, 1.56, 0.2);
            mugBody.castShadow = true;
            deskGroup.add(mugBody);
            const handle = new THREE.Mesh(
                new THREE.TorusGeometry(0.06, 0.015, 6, 8), mugMat);
            handle.position.set(0.9, 1.56, 0.2);
            handle.rotation.y = Math.PI / 2;
            deskGroup.add(handle);
        } else if (slot === 1) {
            // Mouse + mousepad
            const pad = new THREE.Mesh(
                new THREE.BoxGeometry(0.45, 0.01, 0.35), matDark());
            pad.position.set(0.65, 1.47, 0.2);
            deskGroup.add(pad);
            const mouse = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.04, 0.12), matInk());
            mouse.position.set(0.65, 1.49, 0.2);
            deskGroup.add(mouse);
        } else {
            // Pen holder
            const holder = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), matDark());
            holder.position.set(0.7, 1.55, 0.35);
            deskGroup.add(holder);
            const penColors = [0x2222cc, 0xcc2222, 0x222222];
            for (let p = 0; p < 3; p++) {
                const pen = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.01, 0.01, 0.22, 4),
                    toonMat(penColors[p]));
                pen.position.set(0.7 + (p - 1) * 0.02, 1.7, 0.35 + (p - 1) * 0.01);
                pen.rotation.x = (p - 1) * 0.15;
                pen.rotation.z = (p - 1) * 0.1;
                deskGroup.add(pen);
            }
        }

        // Right-back zone — pick ONE item (or none)
        if (idx % 7 === 0) {
            // Desk lamp (rare)
            const lampMat = matDark();
            const lampBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8), lampMat);
            lampBase.position.set(1.1, 1.48, -0.3);
            deskGroup.add(lampBase);
            const lampArm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), lampMat);
            lampArm.position.set(1.1, 1.83, -0.3);
            lampArm.rotation.z = 0.2;
            deskGroup.add(lampArm);
            const lampShade = new THREE.Mesh(
                new THREE.ConeGeometry(0.15, 0.12, 8), lampMat);
            lampShade.position.set(1.17, 2.18, -0.3);
            lampShade.rotation.z = Math.PI;
            deskGroup.add(lampShade);
        } else if (idx % 4 === 2) {
            // Photo frame
            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.3, 0.03), matWood());
            frame.position.set(1.0, 1.62, -0.55);
            frame.rotation.x = -0.2;
            deskGroup.add(frame);
            const photo = new THREE.Mesh(
                new THREE.BoxGeometry(0.19, 0.24, 0.01), matWhite());
            photo.position.set(1.0, 1.62, -0.53);
            photo.rotation.x = -0.2;
            deskGroup.add(photo);
        }

        // Center-back zone — paper stack (occasional)
        if (idx % 3 === 0) {
            const paperMat = matWhite();
            const numSheets = 2 + (idx % 3);
            for (let s = 0; s < numSheets; s++) {
                const sheet = new THREE.Mesh(
                    new THREE.BoxGeometry(0.55, 0.008, 0.7), paperMat);
                sheet.position.set(0.5, 1.46 + s * 0.009, -0.15);
                sheet.rotation.y = (s * 0.04) - 0.02;
                deskGroup.add(sheet);
            }
        }

        // Monitor face — sticky notes (occasional, never conflicts)
        if (idx % 5 === 2) {
            const stickyColors = [0xffee77, 0xff99aa, 0x99eebb, 0xaaccff];
            const stickyMat = toonMat(stickyColors[idx % stickyColors.length]);
            const sticky = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.12, 0.005), stickyMat);
            sticky.position.set(0.1, 2.7, -0.37);
            sticky.rotation.z = 0.05;
            deskGroup.add(sticky);
        }
    }

    // ─── Helper: build a seated worker NPC ───────────────────────────────
    function buildSeatedWorker(idx) {
        const wg = new THREE.Group();
        const shirtColors = [0xe8e0d8, 0x98b8a0, 0xc8a8a8, 0xb0b8c8, 0xe8d8b8, 0xd0c0b0, 0xddd0c0, 0xa8c0b0];
        const skinTones = [0xffccaa, 0xd4a070, 0xf0c090, 0x8b6848, 0xe8b888, 0xc49060];
        const hairColors = [0x3a2a1a, 0x1a1a1a, 0xc89050, 0x5a3a2a, 0x8a4a2a, 0x2a2a2a, 0x887050];

        const shirtMat = toonMat(shirtColors[idx % shirtColors.length]);
        const skinMat = toonMat(skinTones[idx % skinTones.length]);
        const hairMat = toonMat(hairColors[idx % hairColors.length]);
        const pantsMat = matDark();
        const shoeMat = matInk();

        const isHunched = (idx % 3 === 0);
        const forwardLean = isHunched ? 0.25 : 0.08 + (idx % 5) * 0.03;

        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.55, 0.25), shirtMat);
        torso.position.set(0, 1.45, 0);
        torso.rotation.x = forwardLean;
        torso.castShadow = true;
        wg.add(torso);

        // Head
        const headY = isHunched ? 1.75 : 1.85;
        const headZ = isHunched ? 0.1 : 0.05;
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8), skinMat);
        head.position.set(0, headY, headZ);
        head.castShadow = true;
        wg.add(head);

        // Hair (hemisphere on top)
        const hair = new THREE.Mesh(
            new THREE.SphereGeometry(0.21, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
        hair.position.set(0, headY, headZ);
        hair.castShadow = true;
        wg.add(hair);

        // Upper arms + forearms (from shoulders)
        const forearms = [];
        const upperArms = [];
        for (const sx of [-1, 1]) {
            const upperArm = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.3, 0.1), shirtMat);
            upperArm.position.set(sx * 0.28, 1.35, 0.05);
            upperArm.rotation.x = 0.4;
            wg.add(upperArm);
            upperArms.push(upperArm);

            // Forearm reaching forward (typing pose)
            const forearm = new THREE.Mesh(
                new THREE.BoxGeometry(0.09, 0.25, 0.09), skinMat);
            forearm.position.set(sx * 0.28, 1.2, 0.22);
            forearm.rotation.x = 1.2;
            wg.add(forearm);
            forearms.push(forearm);
        }

        // Thighs (horizontal, seated)
        for (const sx of [-1, 1]) {
            const thigh = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.14, 0.4), pantsMat);
            thigh.position.set(sx * 0.13, 0.95, 0.1);
            wg.add(thigh);
        }

        // Shins (vertical, hanging down from seat)
        for (const sx of [-1, 1]) {
            const shin = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.4, 0.12), pantsMat);
            shin.position.set(sx * 0.13, 0.6, 0.28);
            wg.add(shin);
        }

        // Shoes
        for (const sx of [-1, 1]) {
            const shoe = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.08, 0.2), shoeMat);
            shoe.position.set(sx * 0.13, 0.38, 0.32);
            wg.add(shoe);
        }

        // Optional glasses
        if (idx % 4 === 1) {
            const glassesMat = matDark();
            for (const sx of [-1, 1]) {
                const lens = new THREE.Mesh(
                    new THREE.TorusGeometry(0.05, 0.01, 4, 8), glassesMat);
                lens.position.set(sx * 0.08, headY, headZ + 0.18);
                wg.add(lens);
            }
            const bridge = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.01, 0.01), glassesMat);
            bridge.position.set(0, headY, headZ + 0.2);
            wg.add(bridge);
        }

        // Optional tie
        if (idx % 5 === 0) {
            const tieColors = [0xcc2222, 0x2244aa, 0x338844, 0x884422];
            const tieMat = toonMat(tieColors[idx % tieColors.length]);
            const tieKnot = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.06, 0.04), tieMat);
            tieKnot.position.set(0, 1.65, 0.13);
            wg.add(tieKnot);
            const tieBody = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 0.2, 0.03), tieMat);
            tieBody.position.set(0, 1.5, 0.13);
            wg.add(tieBody);
        }

        // Scale up so workers are clearly visible above desk furniture
        wg.scale.setScalar(FURN_SCALE);

        // Store animation refs for NPC idle anims
        wg.userData.anim = {
            head,
            hair,
            torso,
            forearms,
            upperArms,
            baseHeadY: headY,
            baseHeadZ: headZ,
            baseTorsoRotX: forwardLean,
            baseForearmY: 1.2,
            baseForearmRotX: 1.2,
            baseUpperArmRotX: 0.4,
            // Head turn state
            headTurnAngle: 0,
            headTurnTarget: 0,
            headTurnTimer: 8 + idx * 2.3,  // staggered initial delay
            headTurnPhase: 'idle', // 'idle' | 'turning' | 'holding' | 'returning'
            headTurnHoldTimer: 0,
            // Lean-back stretch state
            stretchTimer: 20 + idx * 3.7,
            stretchPhase: 'idle', // 'idle' | 'leaning' | 'holding' | 'returning'
            stretchProgress: 0,
            // Gesture state
            gestureType: 'none',
            gesturePhase: 'idle',
            gestureTimer: 15 + idx * 2.9,
            gestureProgress: 0,
        };

        return wg;
    }

    // ─── Helper: build a fluorescent ceiling panel ───────────────────────
    function buildFluorescentPanel() {
        const fg = new THREE.Group();
        // Housing
        const housing = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 0.08, 0.8), matWhite());
        housing.position.y = 0.04;
        fg.add(housing);
        // Diffuser panel (slightly emissive)
        const diffuserMat = toonMat(PALETTE.white, {
            emissive: PALETTE.fillWarm,
            emissiveIntensity: 0.3,
        });
        const diffuser = new THREE.Mesh(
            new THREE.BoxGeometry(2.3, 0.03, 0.65), diffuserMat);
        diffuser.position.y = -0.01;
        fg.add(diffuser);
        fg.scale.setScalar(FURN_SCALE);
        return fg;
    }

    // ─── Helper: build a notice board ────────────────────────────────────
    function buildNoticeBoard() {
        const ng = new THREE.Group();
        const corkMat = toonMat(0xc8a870);
        const frameMat = matWood();

        // Cork board
        const board = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 1.8, 0.06), corkMat);
        board.castShadow = true;
        ng.add(board);

        // Frame edges
        const fTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.08), frameMat);
        fTop.position.y = 0.93;
        ng.add(fTop);
        const fBot = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.08), frameMat);
        fBot.position.y = -0.93;
        ng.add(fBot);
        const fLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.92, 0.08), frameMat);
        fLeft.position.x = -1.03;
        ng.add(fLeft);
        const fRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.92, 0.08), frameMat);
        fRight.position.x = 1.03;
        ng.add(fRight);

        // Pinned papers
        const paperColors = [0xfff8e0, 0xe8f0ff, 0xffe8e8, 0xe8ffe8, 0xfff0d0, 0xf0e8ff];
        const pinColors = [0xcc2222, 0x2244cc, 0x44aa44, 0xeecc22, 0xcc44aa, 0x4488cc];
        const paperData = [
            { x: -0.7, y: 0.4, w: 0.6, h: 0.45, rot: 0.05 },
            { x: 0.5, y: 0.5, w: 0.5, h: 0.55, rot: -0.08 },
            { x: -0.3, y: -0.3, w: 0.55, h: 0.4, rot: 0.12 },
            { x: 0.7, y: -0.2, w: 0.45, h: 0.5, rot: -0.03 },
            { x: 0.0, y: 0.2, w: 0.5, h: 0.6, rot: 0.02 },
            { x: -0.6, y: -0.1, w: 0.4, h: 0.35, rot: -0.1 },
        ];
        for (let i = 0; i < paperData.length; i++) {
            const pd = paperData[i];
            const paper = new THREE.Mesh(
                new THREE.BoxGeometry(pd.w, pd.h, 0.005),
                toonMat(paperColors[i % paperColors.length]));
            paper.position.set(pd.x, pd.y, 0.035);
            paper.rotation.z = pd.rot;
            ng.add(paper);
            // Pin
            const pin = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 6, 6),
                toonMat(pinColors[i % pinColors.length]));
            pin.position.set(pd.x, pd.y + pd.h * 0.35, 0.05);
            ng.add(pin);
        }
        ng.scale.setScalar(FURN_SCALE);
        return ng;
    }

    // ─── Helper: build a wall clock ──────────────────────────────────────
    function buildWallClock() {
        const cg = new THREE.Group();
        // Face (white disc)
        const face = new THREE.Mesh(
            new THREE.CylinderGeometry(0.6, 0.6, 0.05, 16), matWhite());
        face.rotation.x = Math.PI / 2;
        cg.add(face);
        // Rim
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(0.6, 0.04, 8, 24), matInk());
        cg.add(rim);
        // Hour markers
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dot = new THREE.Mesh(
                new THREE.SphereGeometry(0.025, 4, 4), matInk());
            dot.position.set(Math.sin(angle) * 0.48, Math.cos(angle) * 0.48, 0.03);
            cg.add(dot);
        }
        // Hour hand
        const hourHand = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.3, 0.02), matInk());
        hourHand.position.set(0, 0.12, 0.04);
        hourHand.rotation.z = -0.8;
        cg.add(hourHand);
        // Minute hand
        const minuteHand = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.42, 0.02), matInk());
        minuteHand.position.set(0, 0.18, 0.04);
        minuteHand.rotation.z = 0.4;
        cg.add(minuteHand);
        // Center dot
        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 6, 6), matDark());
        center.position.z = 0.04;
        cg.add(center);
        cg.scale.setScalar(FURN_SCALE);
        return cg;
    }

    // ─── Helper: build a fire extinguisher ───────────────────────────────
    function buildFireExtinguisher() {
        const fg = new THREE.Group();
        const redMat = matDanger();
        // Wall bracket
        const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.5, 0.06), matDark());
        bracket.position.set(0, 0.8, -0.05);
        fg.add(bracket);
        // Body cylinder
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8), redMat);
        body.position.set(0, 0.6, 0);
        body.castShadow = true;
        fg.add(body);
        // Valve top
        const valve = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.08, 0.1, 8), chromeMat);
        valve.position.set(0, 1.0, 0);
        fg.add(valve);
        // Handle
        const handleBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.04, 0.04), chromeMat);
        handleBar.position.set(0, 1.08, 0);
        fg.add(handleBar);
        // Hose
        const hose = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), matInk());
        hose.position.set(0.08, 0.85, 0.06);
        hose.rotation.z = 0.6;
        fg.add(hose);
        fg.scale.setScalar(FURN_SCALE);
        return fg;
    }

    // ─── Helper: build a waste bin ───────────────────────────────────────
    function buildWasteBin() {
        const bg = new THREE.Group();
        // Tapered cylinder body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.22, 0.6, 8), matDark());
        body.position.y = 0.3;
        body.castShadow = true;
        bg.add(body);
        // Crumpled paper balls
        const paperMat = matWhite();
        const ballPositions = [[0.05, 0.55, 0.02], [-0.08, 0.5, 0.06], [0.04, 0.58, -0.05]];
        for (const [bx, by, bz] of ballPositions) {
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 5, 5), paperMat);
            ball.position.set(bx, by, bz);
            bg.add(ball);
        }
        bg.scale.setScalar(FURN_SCALE);
        return bg;
    }

    // ─── Helper: build a break room counter ──────────────────────────────
    function buildBreakCounter() {
        const cg = new THREE.Group();
        // Cabinet base (white)
        const cabinet = new THREE.Mesh(
            new THREE.BoxGeometry(4.0, 1.3, 0.8), matWhite());
        cabinet.position.set(0, 0.65, 0);
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        cg.add(cabinet);
        // Counter top (fixture material)
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(4.1, 0.08, 0.9), matFixture());
        top.position.set(0, 1.34, 0);
        top.receiveShadow = true;
        cg.add(top);
        // Cabinet door lines
        const doorLineMat = matDark();
        for (let d = 0; d < 4; d++) {
            const doorLine = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 1.1, 0.01), doorLineMat);
            doorLine.position.set(-1.5 + d * 1.0, 0.6, 0.41);
            cg.add(doorLine);
        }
        // Handles
        for (let d = 0; d < 3; d++) {
            const handleGrip = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.15, 0.04), chromeMat);
            handleGrip.position.set(-1.0 + d * 1.0, 0.85, 0.43);
            cg.add(handleGrip);
        }
        cg.scale.setScalar(FURN_SCALE);
        return cg;
    }

    // ─── Helper: build a round break table ───────────────────────────────
    function buildBreakTable() {
        const tg = new THREE.Group();
        // Round table top
        const tableTop = new THREE.Mesh(
            new THREE.CylinderGeometry(1.0, 1.0, 0.08, 16), matWhite());
        tableTop.position.y = 1.4;
        tableTop.castShadow = true;
        tableTop.receiveShadow = true;
        tg.add(tableTop);
        // Chrome pedestal
        const pedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1.32, 8), chromeMat);
        pedestal.position.y = 0.7;
        tg.add(pedestal);
        // Pedestal base
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), chromeMat);
        base.position.y = 0.03;
        tg.add(base);
        // 3 chairs around the table (scaled down)
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + 0.3;
            const chair = buildChair();
            chair.scale.set(0.85, 0.85, 0.85);
            chair.position.set(Math.sin(angle) * 1.6, 0, Math.cos(angle) * 1.6);
            chair.rotation.y = angle + Math.PI;
            tg.add(chair);
        }
        tg.scale.setScalar(FURN_SCALE);
        return tg;
    }

    // ─── Helper: build a vending machine ─────────────────────────────────
    function buildVendingMachine() {
        const vg = new THREE.Group();
        // Main body (dark)
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 4.0, 1.2), matDark());
        body.position.y = 2.0;
        body.castShadow = true;
        vg.add(body);
        // Glass front (translucent)
        const glassMat = toonMat(PALETTE.rimCool, {
            transparent: true,
            opacity: 0.25,
        });
        const glass = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 2.8, 0.02), glassMat);
        glass.position.set(0, 2.4, 0.61);
        vg.add(glass);
        // Snack rectangles behind glass
        const snackColors = [0xcc2222, 0x2244cc, 0x44aa44, 0xeecc44, 0xcc44aa, 0xff8833,
            0x2288aa, 0xaa4422, 0x44cc88, 0x8844cc, 0xcc8844, 0x4488cc];
        let snackIdx = 0;
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const snack = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.35, 0.15),
                    toonMat(snackColors[snackIdx % snackColors.length]));
                snack.position.set(-0.4 + col * 0.4, 3.3 - row * 0.65, 0.4);
                vg.add(snack);
                snackIdx++;
            }
        }
        // Pickup slot
        const slot = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.4, 0.15), matInk());
        slot.position.set(0, 0.6, 0.53);
        vg.add(slot);
        // Payment panel
        const payPanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.6, 0.04), matFixture());
        payPanel.position.set(0.8, 2.5, 0.62);
        vg.add(payPanel);
        // Top brand panel
        const brandPanel = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.4, 0.03),
            toonMat(0xcc3333));
        brandPanel.position.set(0, 3.7, 0.61);
        vg.add(brandPanel);
        vg.scale.setScalar(FURN_SCALE);
        return vg;
    }

    // ─── Helper: build a coat rack ───────────────────────────────────────
    function buildCoatRack() {
        const rg = new THREE.Group();
        const poleMat = matDark();
        // Center pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 3.5, 8), poleMat);
        pole.position.y = 1.75;
        pole.castShadow = true;
        rg.add(pole);
        // Disc base
        const baseDisk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 0.06, 12), poleMat);
        baseDisk.position.y = 0.03;
        rg.add(baseDisk);
        // Hook arms at top (4 directions)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const hook = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.03, 0.3), poleMat);
            hook.position.set(Math.sin(angle) * 0.15, 3.4, Math.cos(angle) * 0.15);
            hook.rotation.y = angle;
            rg.add(hook);
            // Hook tip (downward)
            const tip = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.12, 0.03), poleMat);
            tip.position.set(Math.sin(angle) * 0.3, 3.35, Math.cos(angle) * 0.3);
            rg.add(tip);
        }
        // 2 draped coats
        const coatColors = [0x2a2a3a, 0x5a4a3a];
        for (let c = 0; c < 2; c++) {
            const angle = (c / 4) * Math.PI * 2;
            const coat = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.8, 0.15),
                toonMat(coatColors[c]));
            coat.position.set(Math.sin(angle) * 0.25, 2.9, Math.cos(angle) * 0.25);
            coat.rotation.z = (c - 0.5) * 0.15;
            coat.castShadow = true;
            rg.add(coat);
        }
        rg.scale.setScalar(FURN_SCALE);
        return rg;
    }

    // ─── Helper: build an umbrella stand ─────────────────────────────────
    function buildUmbrellaStand() {
        const ug = new THREE.Group();
        // Dark cylinder container
        const container = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.18, 0.6, 8), matDark());
        container.position.y = 0.3;
        container.castShadow = true;
        ug.add(container);
        // Umbrella shafts poking out
        const umbrellaColors = [0x2222aa, 0x222222];
        for (let u = 0; u < 2; u++) {
            const shaft = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6),
                toonMat(umbrellaColors[u]));
            shaft.position.set((u - 0.5) * 0.08, 0.7, (u - 0.5) * 0.04);
            shaft.rotation.z = (u - 0.5) * 0.12;
            ug.add(shaft);
            // Curved handle
            const handle = new THREE.Mesh(
                new THREE.TorusGeometry(0.05, 0.012, 4, 8, Math.PI),
                toonMat(umbrellaColors[u]));
            handle.position.set((u - 0.5) * 0.08 + (u - 0.5) * 0.06, 1.15, (u - 0.5) * 0.04);
            handle.rotation.z = (u - 0.5) * 0.12;
            ug.add(handle);
        }
        ug.scale.setScalar(FURN_SCALE);
        return ug;
    }

    // ─── Helper: add content to a whiteboard ─────────────────────────────
    function addWhiteboardContent(wbGroup, seed) {
        const s = seed || 0;
        const contentColors = [0xcc2222, 0x2244cc, 0x222222, 0x22aa44];

        // Horizontal lines (simulating writing)
        const lineMat = toonMat(contentColors[s % contentColors.length]);
        const numLines = 3 + (s % 3);
        for (let l = 0; l < numLines; l++) {
            const lineWidth = 0.8 + ((s + l) % 4) * 0.3;
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(lineWidth, 0.03, 0.005), lineMat);
            line.position.set(-0.3 + (l % 2) * 0.2, 0.6 - l * 0.22, 0.05);
            wbGroup.add(line);
        }

        // Diagram elements (box or circle)
        const diagMat = toonMat(contentColors[(s + 1) % contentColors.length]);
        if (s % 2 === 0) {
            // Rectangle diagram
            const rect = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.4, 0.005), diagMat);
            rect.position.set(0.7, -0.3, 0.05);
            wbGroup.add(rect);
            // Arrow line
            const arrow = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.025, 0.005), diagMat);
            arrow.position.set(0.3, -0.3, 0.05);
            wbGroup.add(arrow);
        } else {
            // Circle diagram (torus)
            const circle = new THREE.Mesh(
                new THREE.TorusGeometry(0.2, 0.015, 6, 12), diagMat);
            circle.position.set(0.7, -0.4, 0.05);
            wbGroup.add(circle);
        }

        // A few short lines under the diagram (labels)
        const labelMat = toonMat(contentColors[(s + 2) % contentColors.length]);
        for (let l = 0; l < 2; l++) {
            const label = new THREE.Mesh(
                new THREE.BoxGeometry(0.4 + l * 0.15, 0.025, 0.005), labelMat);
            label.position.set(-0.5, -0.5 - l * 0.18, 0.05);
            wbGroup.add(label);
        }
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
    // DESKS + CHAIRS — sparse layout with pod pairs & standalone desks
    // ════════════════════════════════════════════════════════════════════════

    // Data-driven desk layout: 14 desks in clusters with open floor gaps
    // ry: desk rotation (PI/2 = front faces +X, -PI/2 = front faces -X)
    // angle: slight extra rotation for standalone variety
    // workerRy: explicit rotation for NPC (worker model faces +Z; PI/2 = face -X, -PI/2 = face +X)
    // chairX: X position of chair/worker (on the front side of the desk)
    const deskLayout = [
        // ── Left side ──
        // Pod A: two desks facing each other at z=22,30
        { x: -20, z: 22, ry: Math.PI / 2, angle: 0,     hasWorker: true,  chairX: -17.5, workerRy: -Math.PI / 2 },   // faces +X, worker faces -X (toward desk)
        { x: -20, z: 30, ry: Math.PI / 2, angle: 0,     hasWorker: true,  chairX: -17.5, workerRy: -Math.PI / 2 },   // faces +X, same orientation
        // Standalone angled
        { x: -27, z: 26, ry: Math.PI / 2, angle: 0.12,  hasWorker: false, chairX: -24.5, workerRy: -Math.PI / 2 },
        // Standalone angled
        { x: -20, z: 42, ry: Math.PI / 2, angle: -0.08, hasWorker: true,  chairX: -17.5, workerRy: -Math.PI / 2 },
        // Pod B: two desks at z=48,56
        { x: -27, z: 48, ry: Math.PI / 2, angle: 0,     hasWorker: true,  chairX: -24.5, workerRy: -Math.PI / 2 },
        { x: -27, z: 56, ry: Math.PI / 2, angle: 0,     hasWorker: false, chairX: -24.5, workerRy: -Math.PI / 2 },

        // ── Right side ──
        // Standalone angled
        { x: 20,  z: 22, ry: -Math.PI / 2, angle: 0.1,  hasWorker: true,  chairX: 17.5, workerRy: Math.PI / 2 },  // faces -X, worker faces +X (toward desk)
        // Pod C: two desks facing each other at z=34,42
        { x: 20,  z: 34, ry: -Math.PI / 2, angle: 0,    hasWorker: true,  chairX: 17.5, workerRy: Math.PI / 2 },
        { x: 20,  z: 42, ry: -Math.PI / 2, angle: 0,    hasWorker: true,  chairX: 17.5, workerRy: Math.PI / 2 },
        // Standalone angled
        { x: 28,  z: 30, ry: -Math.PI / 2, angle: -0.1, hasWorker: false, chairX: 25.5, workerRy: Math.PI / 2 },
        // Standalone
        { x: 28,  z: 46, ry: -Math.PI / 2, angle: 0,    hasWorker: true,  chairX: 25.5, workerRy: Math.PI / 2 },
        // Pod D: two desks at z=52,60
        { x: 20,  z: 52, ry: -Math.PI / 2, angle: 0,    hasWorker: true,  chairX: 17.5, workerRy: Math.PI / 2 },
        { x: 20,  z: 60, ry: -Math.PI / 2, angle: 0,    hasWorker: false, chairX: 17.5, workerRy: Math.PI / 2 },
        // Standalone angled
        { x: 28,  z: 58, ry: -Math.PI / 2, angle: 0.08, hasWorker: true,  chairX: 25.5, workerRy: Math.PI / 2 },
    ];

    const npcWorkers = [];
    let workerIdx = 0;

    for (let di = 0; di < deskLayout.length; di++) {
        const dl = deskLayout[di];
        const d = buildDesk();
        d.position.set(dl.x, 0, dl.z);
        d.rotation.y = dl.ry + dl.angle;
        addDeskClutter(d, di);
        group.add(d);

        if (dl.hasWorker) {
            const worker = buildSeatedWorker(workerIdx);
            worker.position.set(dl.chairX, 0, dl.z);
            worker.rotation.y = dl.workerRy;
            worker.userData.anim.phaseOffset = workerIdx * 1.7;
            worker.userData.anim.workerIdx = workerIdx;
            worker.userData.anim.gestureSlot = di % 5;
            group.add(worker);
            npcWorkers.push(worker);
            workerIdx++;
        } else {
            const c = buildChair();
            c.position.set(dl.chairX, 0, dl.z);
            c.rotation.y = dl.workerRy + (-0.3 + Math.random() * 0.6);
            group.add(c);
        }
    }

    // Store NPC worker refs on group for animation in _animate()
    group.userData.npcWorkers = npcWorkers;

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
    coolerGroup.scale.setScalar(FURN_SCALE);
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
        { x: -20, z: 36, ry: Math.PI / 2 },
        { x: 20, z: 28, ry: -Math.PI / 2 },
        { x: 28, z: 38, ry: -Math.PI / 2 },
        { x: -27, z: 52, ry: Math.PI / 2 },
        { x: 20, z: 48, ry: -Math.PI / 2 },
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

    // Plants near walls are pulled in to x=±31 so they don't block wall items
    const plantPositions = [
        { x: 16, z: 20 },
        { x: -16, z: 18 },
        { x: -31, z: 22 },
        { x: 31, z: 22 },
        { x: -31, z: 52 },
        { x: 31, z: 46 },
    ];
    for (const pp of plantPositions) {
        const plant = buildPlant();
        plant.position.set(pp.x, 0, pp.z);
        group.add(plant);
    }

    // ════════════════════════════════════════════════════════════════════════
    // WHITEBOARDS — on the office walls
    // ════════════════════════════════════════════════════════════════════════

    // Wall items must fit in gaps BETWEEN windows.
    // Windows at z=24,35,46,57 (each 5 wide) → gaps:
    //   z=12.5–21.5 (9u), z=26.5–32.5 (6u), z=37.5–43.5 (6u),
    //   z=48.5–54.5 (6u), z=59.5–67.5 (8u)
    // Whiteboard: 2.2×2.5 = 5.5 wide | Bookshelf: 2.4×2.5 = 6.0 wide
    // Notice board: 2.0×2.5 = 5.0 wide | Clock: 1.2×2.5 = 3.0 wide

    // ── Left wall (x = -35.8) ──
    // Gap 1 (12.5–21.5): whiteboard at z=17
    const wb1 = buildWhiteboard();
    addWhiteboardContent(wb1, 0);
    wb1.position.set(-35.8, 3.5, 17);
    wb1.rotation.y = Math.PI / 2;
    group.add(wb1);

    // Gap 2 (26.5–32.5): bookshelf at z=29.5
    const bs1 = buildBookshelf();
    bs1.position.set(-35.5, 0, 29.5);
    bs1.rotation.y = Math.PI / 2;
    group.add(bs1);

    // Gap 3 (37.5–43.5): whiteboard at z=40.5
    const wb3 = buildWhiteboard();
    addWhiteboardContent(wb3, 2);
    wb3.position.set(-35.8, 3.5, 40.5);
    wb3.rotation.y = Math.PI / 2;
    group.add(wb3);

    // Gap 4 (48.5–54.5): empty (fire ext on right wall uses this gap)

    // ── Right wall (x = 35.8) ──
    // Gap 2 (26.5–32.5): notice board at z=29.5
    // (moved from separate section below)
    const nbRightWallInline = buildNoticeBoard();
    nbRightWallInline.position.set(35.8, 3.0, 29.5);
    nbRightWallInline.rotation.y = -Math.PI / 2;
    group.add(nbRightWallInline);

    // Gap 3 (37.5–43.5): whiteboard at z=40.5
    const wb2 = buildWhiteboard();
    addWhiteboardContent(wb2, 1);
    wb2.position.set(35.8, 3.5, 40.5);
    wb2.rotation.y = -Math.PI / 2;
    group.add(wb2);

    // Gap 4 (48.5–54.5): bookshelf at z=51.5
    const bs2 = buildBookshelf();
    bs2.position.set(35.5, 0, 51.5);
    bs2.rotation.y = -Math.PI / 2;
    group.add(bs2);

    // Gap 5 (59.5–67.5): bookshelf at z=63
    const bs3 = buildBookshelf();
    bs3.position.set(35.5, 0, 63);
    bs3.rotation.y = -Math.PI / 2;
    group.add(bs3);

    // ════════════════════════════════════════════════════════════════════════
    // PRINTERS — in the aisles
    // ════════════════════════════════════════════════════════════════════════

    const printer1 = buildPrinter();
    printer1.position.set(-24, 0, 34);
    printer1.rotation.y = Math.PI / 2;
    group.add(printer1);

    const printer2 = buildPrinter();
    printer2.position.set(24, 0, 48);
    printer2.rotation.y = -Math.PI / 2;
    group.add(printer2);

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

    // Cross-partitions (run along X) — only frame desk clusters, leave open floor gaps
    const crossPartitions = [
        // Left: frame Pod A cluster
        { x: -20, z: 26 },
        // Left: frame Pod B cluster
        { x: -27, z: 52 },
        // Right: frame Pod C cluster
        { x: 20, z: 38 },
        // Right: frame Pod D cluster
        { x: 20, z: 56 },
    ];
    for (const cp of crossPartitions) {
        const part = buildCubiclePartition(4.0, partitionHeight);
        part.position.set(cp.x, 0, cp.z);
        group.add(part);
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

    // NPC workers are now placed inline with the desk layout above
    // (see deskLayout array and group.userData.npcWorkers)

    // ════════════════════════════════════════════════════════════════════════
    // BREAK ROOM AREA — far left (x=-26 to -34, z=58-64)
    // ════════════════════════════════════════════════════════════════════════

    // Break counter
    const breakCounter = buildBreakCounter();
    breakCounter.position.set(-30, 0, 60);
    breakCounter.rotation.y = Math.PI / 2;
    group.add(breakCounter);

    // Coffee machine on counter (small brown box with dark front)
    const coffeeMachine = new THREE.Group();
    const cmBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.7, 0.5), matDark());
    cmBody.position.y = 0.35;
    cmBody.castShadow = true;
    coffeeMachine.add(cmBody);
    const cmTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.08, 0.45), matFixture());
    cmTop.position.y = 0.74;
    coffeeMachine.add(cmTop);
    const cmNozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6), chromeMat);
    cmNozzle.position.set(0, 0.3, 0.25);
    coffeeMachine.add(cmNozzle);
    coffeeMachine.position.set(-30, 1.38, 58.5);
    coffeeMachine.scale.setScalar(FURN_SCALE);
    group.add(coffeeMachine);

    // Microwave on counter
    const microwave = new THREE.Group();
    const mwBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.5), matWhite());
    mwBody.position.y = 0.25;
    mwBody.castShadow = true;
    microwave.add(mwBody);
    const mwDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.02), matDark());
    mwDoor.position.set(-0.1, 0.25, 0.26);
    microwave.add(mwDoor);
    const mwPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.35, 0.02), matFixture());
    mwPanel.position.set(0.3, 0.25, 0.26);
    microwave.add(mwPanel);
    microwave.position.set(-30, 1.38, 61);
    microwave.scale.setScalar(FURN_SCALE);
    group.add(microwave);

    // Mini fridge
    const miniFridge = new THREE.Group();
    const fridgeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.2, 0.7), matWhite());
    fridgeBody.position.y = 0.6;
    fridgeBody.castShadow = true;
    miniFridge.add(fridgeBody);
    const fridgeHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.5, 0.06), chromeMat);
    fridgeHandle.position.set(0.35, 0.8, 0.38);
    miniFridge.add(fridgeHandle);
    miniFridge.position.set(-34, 0, 62);
    miniFridge.scale.setScalar(FURN_SCALE);
    group.add(miniFridge);

    // Break table with chairs
    const breakTable = buildBreakTable();
    breakTable.position.set(-24, 0, 62);
    group.add(breakTable);

    // ════════════════════════════════════════════════════════════════════════
    // VENDING MACHINE — far right
    // ════════════════════════════════════════════════════════════════════════

    const vendingMachine = buildVendingMachine();
    vendingMachine.position.set(34, 0, 60);
    vendingMachine.rotation.y = -Math.PI / 2;
    group.add(vendingMachine);

    // ════════════════════════════════════════════════════════════════════════
    // ENTRANCE AREA — near end (z=14-18)
    // ════════════════════════════════════════════════════════════════════════

    // Coat rack
    const coatRack = buildCoatRack();
    coatRack.position.set(-17, 0, 15);
    group.add(coatRack);

    // Umbrella stand
    const umbrellaStand = buildUmbrellaStand();
    umbrellaStand.position.set(-17, 0, 16.5);
    group.add(umbrellaStand);

    // Notice boards at entrance (on inner partitions, facing into lane)
    const nbEntryLeft = buildNoticeBoard();
    nbEntryLeft.position.set(-15.4, 2.5, 18);
    nbEntryLeft.rotation.y = Math.PI / 2;
    group.add(nbEntryLeft);

    const nbEntryRight = buildNoticeBoard();
    nbEntryRight.position.set(15.4, 2.5, 18);
    nbEntryRight.rotation.y = -Math.PI / 2;
    group.add(nbEntryRight);

    // ════════════════════════════════════════════════════════════════════════
    // WALL DECORATIONS
    // ════════════════════════════════════════════════════════════════════════

    // Wall clock — left wall, gap 4 (48.5–54.5), z=51.5
    const wallClock = buildWallClock();
    wallClock.position.set(-35.8, 4.0, 51.5);
    wallClock.rotation.y = Math.PI / 2;
    group.add(wallClock);

    // Fire extinguisher — right wall, gap 1 (12.5–21.5), z=17
    const fireExt = buildFireExtinguisher();
    fireExt.position.set(35.8, 2.0, 17);
    fireExt.rotation.y = -Math.PI / 2;
    group.add(fireExt);

    // ════════════════════════════════════════════════════════════════════════
    // WASTE BINS — scattered near desks
    // ════════════════════════════════════════════════════════════════════════

    const wasteBinPositions = [
        { x: -19, z: 24 },
        { x: -26, z: 50 },
        { x: 19, z: 36 },
        { x: 27, z: 44 },
        { x: 19, z: 54 },
    ];
    for (const wbp of wasteBinPositions) {
        const bin = buildWasteBin();
        bin.position.set(wbp.x, 0, wbp.z);
        group.add(bin);
    }

    // ════════════════════════════════════════════════════════════════════════
    // EXTRA PARTITIONS — for the extended desk area
    // ════════════════════════════════════════════════════════════════════════

    // Inner lane at z=64
    for (const sx of [-15.5, 15.5]) {
        const ep = buildCubiclePartition(6.0, partitionHeight);
        ep.position.set(sx, 0, 64);
        ep.rotation.y = Math.PI / 2;
        group.add(ep);
    }

    // Middle row at z=58
    for (const sx of [-24, 24]) {
        const ep = buildCubiclePartition(6.0, partitionHeight);
        ep.position.set(sx, 0, 58);
        ep.rotation.y = Math.PI / 2;
        group.add(ep);
    }

    // Cross-partition for extension area — single partition near Pod D
    {
        const cp = buildCubiclePartition(4.0, partitionHeight);
        cp.position.set(28, 0, 54);
        group.add(cp);
    }

    // ════════════════════════════════════════════════════════════════════════
    // EXTRA PLANTS
    // ════════════════════════════════════════════════════════════════════════

    const extraPlantPositions = [
        { x: -16, z: 56 },
        { x: 16, z: 56 },
        { x: -31, z: 63 },
        { x: 31, z: 60 },
    ];
    for (const epp of extraPlantPositions) {
        const ep = buildPlant();
        ep.position.set(epp.x, 0, epp.z);
        group.add(ep);
    }

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

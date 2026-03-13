// AirplaneEnvironmentModels.js — Low-poly 3D airplane cabin interior for "Hold It In"
// Airplane scenario: 747 economy class cabin with two aisles separated by a middle seat column.
// Toilet cubicle at the rear with two doors (one per aisle).
// All functions return THREE.Group objects with toon materials.

import { PALETTE } from '../data/palette.js';
import { toonMat, matDark, matInk, matPorcelain, matGold, matFixture } from '../shaders/toonMaterials.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min, max) {
    return min + Math.random() * (max - min);
}

// Rounded rectangle THREE.Shape for airplane windows
function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
}

// ─── 1. Airplane Cabin Floor ────────────────────────────────────────────────
// Dark navy carpet across the full cabin width, with lighter aisle strips.

export function createAirplaneCabin() {
    const group = new THREE.Group();
    group.name = 'airplaneCabin';

    // --- Full-width carpet base ---
    const carpetGeo = new THREE.PlaneGeometry(36, 80);
    const carpetMat = toonMat(PALETTE.airplaneCarpet);
    const carpet = new THREE.Mesh(carpetGeo, carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, -0.05, 35);
    carpet.receiveShadow = true;
    group.add(carpet);

    // --- Aisle floor strips (slightly lighter) ---
    const aisleMat = toonMat(PALETTE.airplaneFloor);
    for (const aisleX of [-6, 6]) {
        const aisleGeo = new THREE.PlaneGeometry(6, 70);
        const aisle = new THREE.Mesh(aisleGeo, aisleMat);
        aisle.rotation.x = -Math.PI / 2;
        aisle.position.set(aisleX, -0.03, 38);
        aisle.receiveShadow = true;
        group.add(aisle);
    }

    // --- Cabin walls (long panels on both sides) ---
    const wallMat = toonMat(PALETTE.airplaneWall);
    for (const side of [-1, 1]) {
        const wallGeo = new THREE.BoxGeometry(0.3, 6, 72);
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(side * 17.5, 3, 38);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
    }

    // --- Airplane windows (rounded rectangles with frames, recesses, shades) ---
    const winW = 0.9, winH = 1.2, winR = 0.25;
    const winGlassGeo = new THREE.ShapeGeometry(roundedRectShape(winW, winH, winR));
    const winFrameGeo = new THREE.ShapeGeometry(roundedRectShape(winW + 0.2, winH + 0.2, winR + 0.08));
    const winRecessGeo = new THREE.BoxGeometry(winW + 0.3, winH + 0.3, 0.15);

    const winGlassMat = toonMat(PALETTE.airplaneWindow, {
        emissive: PALETTE.airplaneWindow,
        emissiveIntensity: 0.4,
    });
    const winFrameMat = toonMat(PALETTE.airplaneSeatBack);
    const winRecessMat = toonMat(PALETTE.charcoal);
    const winShadeMat = toonMat(PALETTE.airplaneOverhead);

    // Deterministic random for shade placement
    let _wSeed = 54321;
    function wRng() { _wSeed = (_wSeed * 16807) % 2147483647; return (_wSeed - 1) / 2147483646; }

    for (const side of [-1, 1]) {
        for (let z = 12; z <= 66; z += 3) {
            const rotY = side * Math.PI / 2;

            // Dark recess behind window (creates depth illusion)
            const recess = new THREE.Mesh(winRecessGeo, winRecessMat);
            recess.position.set(side * 17.38, 3.5, z);
            group.add(recess);

            // Outer frame
            const frame = new THREE.Mesh(winFrameGeo, winFrameMat);
            frame.position.set(side * 17.3, 3.5, z);
            frame.rotation.y = rotY;
            group.add(frame);

            // Glass pane (sky blue glow)
            const glass = new THREE.Mesh(winGlassGeo, winGlassMat);
            glass.position.set(side * 17.28, 3.5, z);
            glass.rotation.y = rotY;
            group.add(glass);

            // Window shade (pulled down on ~35% of windows)
            if (wRng() < 0.35) {
                const shadeH = 0.3 + wRng() * 0.5;
                const shadeGeo = new THREE.PlaneGeometry(winW - 0.1, shadeH);
                const shade = new THREE.Mesh(shadeGeo, winShadeMat);
                shade.position.set(side * 17.26, 3.5 + (winH / 2 - shadeH / 2), z);
                shade.rotation.y = rotY;
                group.add(shade);
            }
        }
    }

    return group;
}

// ─── 2. Airplane Seats ──────────────────────────────────────────────────────
// Three columns: left (2-abreast), middle (3-abreast), right (2-abreast)
// Rows from z=12 to z=66, spaced every 3 units.

export function createAirplaneSeats() {
    const group = new THREE.Group();
    group.name = 'airplaneSeats';

    const seatMat = toonMat(PALETTE.airplaneSeat);
    const backMat = toonMat(PALETTE.airplaneSeatBack);
    const armMat = toonMat(PALETTE.fixture);

    // TV screen material pool (shared across seats for performance)
    const TV_MAT_COUNT = 8;
    const tvMaterials = [];
    for (let i = 0; i < TV_MAT_COUNT; i++) {
        tvMaterials.push(new THREE.MeshBasicMaterial({
            color: PALETTE.airplaneTVScreen,
            transparent: true,
            opacity: 0.9,
        }));
    }
    const tvBezelMat = toonMat(PALETTE.charcoal);
    const tvBezelGeo = new THREE.BoxGeometry(1.3, 0.9, 0.04);
    const tvScreenGeo = new THREE.BoxGeometry(1.1, 0.7, 0.02);

    // Seat column definitions: [centerX, seatCount, seatSpacing]
    // Wider spacing to accommodate larger seats proportional to enemy characters
    const columns = [
        { cx: -12, count: 2, spacing: 2.8 },   // left window seats
        { cx: 0,   count: 3, spacing: 2.5 },    // middle seats
        { cx: 12,  count: 2, spacing: 2.8 },    // right window seats
    ];

    for (let z = 12; z <= 66; z += 3) {
        for (const col of columns) {
            for (let s = 0; s < col.count; s++) {
                const seatX = col.cx + (s - (col.count - 1) / 2) * col.spacing;
                const seatGroup = new THREE.Group();

                // Seat cushion (wider to fit proportional passengers)
                const cushGeo = new THREE.BoxGeometry(2.0, 0.55, 1.6);
                const cush = new THREE.Mesh(cushGeo, seatMat);
                cush.position.set(0, 0.8, 0);
                seatGroup.add(cush);

                // Seat back (taller)
                const backGeo = new THREE.BoxGeometry(2.0, 2.5, 0.3);
                const back = new THREE.Mesh(backGeo, backMat);
                back.position.set(0, 2.05, -0.7);
                seatGroup.add(back);

                // Headrest (wider)
                const headGeo = new THREE.BoxGeometry(1.3, 0.85, 0.25);
                const head = new THREE.Mesh(headGeo, backMat);
                head.position.set(0, 3.55, -0.65);
                seatGroup.add(head);

                // Armrests (wider spacing)
                for (const armSide of [-0.95, 0.95]) {
                    const armGeo = new THREE.BoxGeometry(0.1, 0.15, 1.4);
                    const arm = new THREE.Mesh(armGeo, armMat);
                    arm.position.set(armSide, 1.15, -0.05);
                    seatGroup.add(arm);
                }

                // Seatback TV screen (in-flight entertainment)
                const tvBezel = new THREE.Mesh(tvBezelGeo, tvBezelMat);
                tvBezel.position.set(0, 2.0, -0.88);
                seatGroup.add(tvBezel);

                const tvScreen = new THREE.Mesh(tvScreenGeo, tvMaterials[Math.floor(Math.random() * TV_MAT_COUNT)]);
                tvScreen.position.set(0, 2.0, -0.91);
                seatGroup.add(tvScreen);

                seatGroup.position.set(seatX, 0, z);
                seatGroup.castShadow = true;
                group.add(seatGroup);
            }
        }
    }

    group.userData.tvMaterials = tvMaterials;
    return group;
}

// ─── 3. Airplane Toilet Cubicle ─────────────────────────────────────────────
// Rectangular cubicle at the rear center with two door openings (left aisle, right aisle).

export function createAirplaneCubicle() {
    const group = new THREE.Group();
    group.name = 'airplaneCubicle';

    const cubMat = toonMat(PALETTE.airplaneCubicle);
    const wallThickness = 0.3;

    // Cubicle dimensions: x from -7 to 7 (14 wide), z from 2 to 8 (6 deep)
    const cubW = 14, cubD = 6, cubH = 4;
    const cubZ = 5; // center Z of cubicle

    // --- Back wall (solid) ---
    const backWallGeo = new THREE.BoxGeometry(cubW, cubH, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, cubMat);
    backWall.position.set(0, cubH / 2, 2);
    backWall.castShadow = true;
    group.add(backWall);

    // --- Side walls (full length) ---
    for (const side of [-1, 1]) {
        const sideGeo = new THREE.BoxGeometry(wallThickness, cubH, cubD);
        const sideWall = new THREE.Mesh(sideGeo, cubMat);
        sideWall.position.set(side * cubW / 2, cubH / 2, cubZ);
        sideWall.castShadow = true;
        group.add(sideWall);
    }

    // --- Front wall with TWO door openings ---
    // Left section: x from -7 to -7 (left edge to left door edge)
    // Left door opening: x from -7 to -3 (4 units wide)
    // Center pillar: x from -3 to 3 (6 units, contains middle seat column base)
    // Right door opening: x from 3 to 7 (4 units wide)
    // Right section: x from 7 to 7 (right edge)

    // Center pillar (between doors)
    const pillarGeo = new THREE.BoxGeometry(6, cubH, wallThickness);
    const pillar = new THREE.Mesh(pillarGeo, cubMat);
    pillar.position.set(0, cubH / 2, 8);
    pillar.castShadow = true;
    group.add(pillar);

    // NOTE: "OCCUPIED" signs are now part of the door group (createAirplaneDoor)
    // so they get hidden when the door shatters.

    // --- Floor inside cubicle (slightly different color) ---
    const floorGeo = new THREE.PlaneGeometry(cubW - 0.6, cubD - 0.6);
    const floorMat = toonMat(PALETTE.tileLight);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, cubZ);
    group.add(floor);

    // ─── LAVATORY FURNISHINGS ──────────────────────────────────────────────
    const chromeMat = matFixture();
    const porcelainMat = matPorcelain();
    const panelMat = toonMat(PALETTE.airplaneOverhead);

    // --- Sink (left wall, facing center) ---
    const sinkGroup = new THREE.Group();
    sinkGroup.name = 'airplaneSink';

    // Counter shelf (wall-mounted)
    const counterGeo = new THREE.BoxGeometry(1.2, 0.08, 0.8);
    const counter = new THREE.Mesh(counterGeo, toonMat(PALETTE.airplaneCubicle));
    counter.position.set(0, 1.5, 0);
    sinkGroup.add(counter);

    // Basin (half-sphere)
    const basinGeo = new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const basin = new THREE.Mesh(basinGeo, porcelainMat);
    basin.rotation.x = Math.PI;
    basin.position.set(0, 1.5, 0.05);
    sinkGroup.add(basin);

    // Basin rim
    const basinRimGeo = new THREE.TorusGeometry(0.3, 0.02, 6, 10);
    const basinRim = new THREE.Mesh(basinRimGeo, porcelainMat);
    basinRim.rotation.x = -Math.PI / 2;
    basinRim.position.set(0, 1.55, 0.05);
    sinkGroup.add(basinRim);

    // Faucet
    const faucetBaseGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.1, 6);
    const faucetBase = new THREE.Mesh(faucetBaseGeo, chromeMat);
    faucetBase.position.set(0, 1.6, -0.2);
    sinkGroup.add(faucetBase);

    const faucetNeckGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6);
    const faucetNeck = new THREE.Mesh(faucetNeckGeo, chromeMat);
    faucetNeck.position.set(0, 1.82, -0.2);
    sinkGroup.add(faucetNeck);

    const faucetSpoutGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.3, 6);
    const faucetSpout = new THREE.Mesh(faucetSpoutGeo, chromeMat);
    faucetSpout.rotation.x = Math.PI / 3;
    faucetSpout.position.set(0, 1.95, -0.05);
    sinkGroup.add(faucetSpout);

    // Handle knobs
    for (const side of [-1, 1]) {
        const knobGeo = new THREE.SphereGeometry(0.03, 5, 5);
        const knob = new THREE.Mesh(knobGeo, chromeMat);
        knob.position.set(side * 0.15, 1.65, -0.2);
        sinkGroup.add(knob);
    }

    // Wall brackets
    for (const bx of [-0.45, 0.45]) {
        const bracketGeo = new THREE.BoxGeometry(0.05, 0.35, 0.5);
        const bracket = new THREE.Mesh(bracketGeo, chromeMat);
        bracket.position.set(bx, 1.28, -0.1);
        sinkGroup.add(bracket);
    }

    sinkGroup.position.set(-6.2, 0, 4.5);
    sinkGroup.rotation.y = Math.PI / 2;
    group.add(sinkGroup);

    // --- Mirror (above sink on left wall) ---
    const mirrorGroup = new THREE.Group();
    mirrorGroup.name = 'airplaneMirror';

    // Mirror surface (cool-tinted reflective)
    const mirrorSurfGeo = new THREE.PlaneGeometry(1.6, 1.2);
    const mirrorSurfMat = toonMat(PALETTE.rimCool, {
        emissive: PALETTE.rimCool,
        emissiveIntensity: 0.15,
    });
    const mirrorSurf = new THREE.Mesh(mirrorSurfGeo, mirrorSurfMat);
    mirrorSurf.position.z = 0.02;
    mirrorGroup.add(mirrorSurf);

    // Chrome frame
    const mfT = 0.05;
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, mfT, 0.04), chromeMat);
    topFrame.position.y = 0.625;
    mirrorGroup.add(topFrame);

    const botFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, mfT, 0.04), chromeMat);
    botFrame.position.y = -0.625;
    mirrorGroup.add(botFrame);

    const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(mfT, 1.3, 0.04), chromeMat);
    leftFrame.position.x = -0.825;
    mirrorGroup.add(leftFrame);

    const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(mfT, 1.3, 0.04), chromeMat);
    rightFrame.position.x = 0.825;
    mirrorGroup.add(rightFrame);

    // Backing plate
    const mirrorBackGeo = new THREE.BoxGeometry(1.65, 1.25, 0.02);
    const mirrorBack = new THREE.Mesh(mirrorBackGeo, matInk());
    mirrorGroup.add(mirrorBack);

    mirrorGroup.position.set(-6.7, 2.7, 4.5);
    mirrorGroup.rotation.y = Math.PI / 2;
    group.add(mirrorGroup);

    // --- Soap dispenser (left wall, near front) ---
    const soapGroup = new THREE.Group();
    soapGroup.name = 'soapDispenser';

    const soapBodyGeo = new THREE.BoxGeometry(0.22, 0.3, 0.12);
    soapGroup.add(new THREE.Mesh(soapBodyGeo, panelMat));

    const soapCapGeo = new THREE.BoxGeometry(0.24, 0.04, 0.14);
    const soapCap = new THREE.Mesh(soapCapGeo, chromeMat);
    soapCap.position.y = 0.17;
    soapGroup.add(soapCap);

    const soapLeverGeo = new THREE.BoxGeometry(0.08, 0.03, 0.14);
    const soapLever = new THREE.Mesh(soapLeverGeo, chromeMat);
    soapLever.position.set(0, -0.08, 0.06);
    soapGroup.add(soapLever);

    const soapNozzGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.03, 5);
    const soapNozz = new THREE.Mesh(soapNozzGeo, chromeMat);
    soapNozz.position.set(0, -0.17, 0.03);
    soapGroup.add(soapNozz);

    soapGroup.position.set(-6.7, 2.3, 6);
    soapGroup.rotation.y = Math.PI / 2;
    group.add(soapGroup);

    // --- Paper towel dispenser (right wall) ---
    const ptGroup = new THREE.Group();
    ptGroup.name = 'paperTowelDispenser';

    const ptBodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.3);
    ptGroup.add(new THREE.Mesh(ptBodyGeo, panelMat));

    const ptSlotGeo = new THREE.BoxGeometry(0.5, 0.05, 0.1);
    const ptSlot = new THREE.Mesh(ptSlotGeo, matInk());
    ptSlot.position.set(0, -0.23, 0.12);
    ptGroup.add(ptSlot);

    const ptTrimGeo = new THREE.BoxGeometry(0.54, 0.025, 0.11);
    const ptTrim = new THREE.Mesh(ptTrimGeo, chromeMat);
    ptTrim.position.set(0, -0.2, 0.12);
    ptGroup.add(ptTrim);

    const ptPaperGeo = new THREE.BoxGeometry(0.35, 0.25, 0.01);
    const ptPaper = new THREE.Mesh(ptPaperGeo, toonMat(PALETTE.cream, { side: THREE.DoubleSide }));
    ptPaper.position.set(0, -0.38, 0.12);
    ptPaper.rotation.x = 0.08;
    ptGroup.add(ptPaper);

    ptGroup.position.set(6.7, 2.2, 4.5);
    ptGroup.rotation.y = -Math.PI / 2;
    group.add(ptGroup);

    // --- Trash bin (right side, floor) ---
    const binGroup = new THREE.Group();
    binGroup.name = 'trashBin';

    const binBodyGeo = new THREE.CylinderGeometry(0.3, 0.25, 1.0, 8);
    const binBody = new THREE.Mesh(binBodyGeo, matInk());
    binBody.position.y = 0.5;
    binGroup.add(binBody);

    const binRimGeo = new THREE.TorusGeometry(0.32, 0.025, 5, 8);
    const binRim = new THREE.Mesh(binRimGeo, matDark());
    binRim.rotation.x = -Math.PI / 2;
    binRim.position.y = 1.02;
    binGroup.add(binRim);

    const binLidGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8, 1, false, 0, Math.PI);
    const binLid = new THREE.Mesh(binLidGeo, matDark());
    binLid.rotation.x = -Math.PI / 2;
    binLid.position.y = 1.05;
    binGroup.add(binLid);

    binGroup.position.set(5, 0, 3.5);
    group.add(binGroup);

    // --- No Smoking sign (back wall) ---
    const nsGroup = new THREE.Group();
    nsGroup.name = 'noSmokingSign';

    const nsBackGeo = new THREE.CircleGeometry(0.35, 12);
    nsGroup.add(new THREE.Mesh(nsBackGeo, toonMat(PALETTE.charcoal)));

    const dangerMat = toonMat(PALETTE.danger, {
        emissive: PALETTE.danger,
        emissiveIntensity: 0.3,
    });
    const nsRingGeo = new THREE.TorusGeometry(0.3, 0.05, 6, 12);
    const nsRing = new THREE.Mesh(nsRingGeo, dangerMat);
    nsRing.position.z = 0.01;
    nsGroup.add(nsRing);

    const nsSlashGeo = new THREE.BoxGeometry(0.55, 0.06, 0.02);
    const nsSlash = new THREE.Mesh(nsSlashGeo, dangerMat);
    nsSlash.rotation.z = Math.PI / 4;
    nsSlash.position.z = 0.02;
    nsGroup.add(nsSlash);

    nsGroup.position.set(-2.5, 3.0, 2.2);
    group.add(nsGroup);

    // --- "Return to Seat" illuminated sign (back wall) ---
    const rsGroup = new THREE.Group();
    rsGroup.name = 'returnToSeatSign';

    const rsPlateGeo = new THREE.BoxGeometry(2.0, 0.5, 0.08);
    rsGroup.add(new THREE.Mesh(rsPlateGeo, toonMat(PALETTE.charcoal)));

    const rsTextGeo = new THREE.BoxGeometry(1.7, 0.3, 0.02);
    const rsText = new THREE.Mesh(rsTextGeo, toonMat(PALETTE.airplaneStrip, {
        emissive: PALETTE.airplaneStrip,
        emissiveIntensity: 0.4,
    }));
    rsText.position.z = 0.05;
    rsGroup.add(rsText);

    rsGroup.position.set(2, 3.0, 2.2);
    group.add(rsGroup);

    // --- Flush button panel (back wall, near toilet) ---
    const flushPlateGeo = new THREE.BoxGeometry(0.2, 0.3, 0.06);
    const flushPlate = new THREE.Mesh(flushPlateGeo, chromeMat);
    flushPlate.position.set(1.5, 1.8, 2.2);
    group.add(flushPlate);

    const flushBtnGeo = new THREE.CircleGeometry(0.05, 8);
    const flushBtn = new THREE.Mesh(flushBtnGeo, toonMat(PALETTE.success, {
        emissive: PALETTE.success,
        emissiveIntensity: 0.5,
    }));
    flushBtn.position.set(1.5, 1.8, 2.24);
    group.add(flushBtn);

    // --- Small shelf (right wall, above paper towels) ---
    const shelfGeo = new THREE.BoxGeometry(1.0, 0.06, 0.4);
    const shelf = new THREE.Mesh(shelfGeo, toonMat(PALETTE.airplaneCubicle));
    shelf.position.set(6.5, 2.8, 6);
    shelf.rotation.y = -Math.PI / 2;
    group.add(shelf);

    return group;
}

// ─── 4. Airplane Dual Door ──────────────────────────────────────────────────
// Two fold-doors sharing a single HP pool. Matches the door interface for game logic.

export function createAirplaneDoor() {
    const group = new THREE.Group();
    group.name = 'airplaneDoor';

    const doorColor = PALETTE.airplaneDoor;
    const doorMat = toonMat(doorColor, {
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    doorMat.depthWrite = false;

    const doorPanels = [];
    const allCracks = [];

    // Create two door panels (left at x=-5, right at x=5)
    for (const doorX of [-5, 5]) {
        const panelGroup = new THREE.Group();
        panelGroup.name = doorX < 0 ? 'leftDoor' : 'rightDoor';

        // Door panel
        const panelGeo = new THREE.BoxGeometry(3.5, 3.2, 0.1);
        const panel = new THREE.Mesh(panelGeo, doorMat);
        panel.position.set(0, 1.75, 0);
        panelGroup.add(panel);
        doorPanels.push(panel);

        // Door handle (horizontal bar)
        const handleGeo = new THREE.BoxGeometry(1.0, 0.12, 0.15);
        const handleMat = toonMat(PALETTE.fixture);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 1.6, 0.12);
        panelGroup.add(handle);

        // "LAVATORY" text backing
        const textGeo = new THREE.BoxGeometry(2.0, 0.4, 0.05);
        const textMat = toonMat(PALETTE.charcoal);
        const textBacking = new THREE.Mesh(textGeo, textMat);
        textBacking.position.set(0, 2.6, 0.06);
        panelGroup.add(textBacking);

        // Lock indicator (small circle)
        const lockGeo = new THREE.CircleGeometry(0.12, 8);
        const lockMat = toonMat(PALETTE.danger, {
            emissive: PALETTE.danger,
            emissiveIntensity: 0.5,
        });
        const lockLight = new THREE.Mesh(lockGeo, lockMat);
        lockLight.position.set(1.2, 2.6, 0.08);
        panelGroup.add(lockLight);

        // Hinges
        const hingeMat = matInk();
        for (let i = 0; i < 2; i++) {
            const hingeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6);
            const hinge = new THREE.Mesh(hingeGeo, hingeMat);
            hinge.position.set(-1.7, 0.8 + i * 1.8, 0.06);
            panelGroup.add(hinge);
        }

        // Crack / damage overlay meshes (Fortnite-style 3-layer glow)
        const crackDarkMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.9 });
        const crackGlowMat = new THREE.MeshBasicMaterial({ color: PALETTE.white, transparent: true, opacity: 0.85 });
        const crackHaloMat = new THREE.MeshBasicMaterial({ color: PALETTE.white, transparent: true, opacity: 0.25 });

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

        const cracks = [];

        const crack0 = buildCrack([
            { x: -0.5, y: 2.5, w: 0.42, h: 0.08, rot: 0.3 },
            { x: -0.35, y: 2.4, w: 0.32, h: 0.08, rot: -0.5 },
            { x: -0.6, y: 2.42, w: 0.2, h: 0.07, rot: -0.2 },
            { x: -0.25, y: 2.35, w: 0.2, h: 0.06, rot: 0.5 },
        ], 0.06);
        panelGroup.add(crack0); cracks.push(crack0);

        const crack1 = buildCrack([
            { x: 0.4, y: 1.9, w: 0.48, h: 0.08, rot: -0.2 },
            { x: 0.6, y: 1.8, w: 0.38, h: 0.08, rot: 0.5 },
            { x: 0.3, y: 1.98, w: 0.22, h: 0.07, rot: -0.4 },
            { x: 0.7, y: 1.72, w: 0.2, h: 0.06, rot: 0.1 },
        ], 0.06);
        panelGroup.add(crack1); cracks.push(crack1);

        const crack2 = buildCrack([
            { x: -0.1, y: 0.9, w: 0.55, h: 0.09, rot: 0.1 },
            { x: 0.1, y: 0.8, w: 0.42, h: 0.08, rot: -0.35 },
            { x: -0.2, y: 0.98, w: 0.25, h: 0.07, rot: 0.5 },
            { x: 0.25, y: 0.72, w: 0.2, h: 0.06, rot: -0.15 },
        ], 0.06);
        panelGroup.add(crack2); cracks.push(crack2);

        const crack3 = buildCrack([
            { x: 0.5, y: 2.3, w: 0.38, h: 0.09, rot: -0.6 },
            { x: 0.4, y: 2.2, w: 0.3, h: 0.08, rot: 0.25 },
            { x: 0.6, y: 2.35, w: 0.22, h: 0.07, rot: -0.1 },
            { x: 0.3, y: 2.12, w: 0.2, h: 0.07, rot: 0.5 },
        ], 0.06);
        panelGroup.add(crack3); cracks.push(crack3);

        const crack4 = buildCrack([
            { x: 0.0, y: 1.4, w: 0.6, h: 0.10, rot: 0.2 },
            { x: -0.1, y: 1.2, w: 0.42, h: 0.09, rot: -0.4 },
            { x: 0.2, y: 1.5, w: 0.38, h: 0.09, rot: 0.6 },
            { x: -0.2, y: 1.55, w: 0.25, h: 0.08, rot: -0.15 },
            { x: 0.3, y: 1.3, w: 0.22, h: 0.07, rot: -0.5 },
        ], 0.06);
        panelGroup.add(crack4); cracks.push(crack4);

        allCracks.push(cracks);

        panelGroup.position.set(doorX, 0, 8);
        group.add(panelGroup);
    }

    // --- "OCCUPIED" signs above each door (part of door group so they shatter too) ---
    const signMat = toonMat(PALETTE.danger, {
        emissive: PALETTE.danger,
        emissiveIntensity: 0.4,
    });
    for (const doorX of [-5, 5]) {
        const signBackGeo = new THREE.BoxGeometry(2.5, 0.5, 0.15);
        const signBack = new THREE.Mesh(signBackGeo, toonMat(PALETTE.charcoal));
        signBack.position.set(doorX, 4.3, 8.1);
        group.add(signBack);

        const signGeo = new THREE.BoxGeometry(2.2, 0.35, 0.05);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(doorX, 4.3, 8.2);
        group.add(sign);
    }

    // --- Store metadata (matches door interface) ---
    // Both doors share the same HP pool. 'door' references the first panel for color tinting.
    // 'cracks' is a flat array of 5 crack groups (shown on BOTH doors simultaneously).
    group.userData.door = doorPanels[0];
    group.userData.doorPanels = doorPanels;
    group.userData.cracks = allCracks[0]; // Primary crack display (left door)
    group.userData.cracksRight = allCracks[1]; // Secondary crack display (right door)
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    return group;
}

// ─── 5. Airplane Props ──────────────────────────────────────────────────────
// Trolleys, safety cards, and small cabin details.

export function createAirplaneProps() {
    const group = new THREE.Group();
    group.name = 'airplaneProps';

    const metalMat = toonMat(PALETTE.fixture);
    const darkMat = toonMat(PALETTE.charcoal);

    // --- Drink trolleys parked near the spawn area ---
    function createTrolley(x, z) {
        const trolley = new THREE.Group();

        // Body
        const bodyGeo = new THREE.BoxGeometry(1.4, 2.0, 1.8);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        body.position.set(0, 1.2, 0);
        trolley.add(body);

        // Handle
        const handleGeo = new THREE.BoxGeometry(0.08, 1.0, 0.08);
        const handle = new THREE.Mesh(handleGeo, darkMat);
        handle.position.set(0, 2.6, -0.8);
        trolley.add(handle);

        // Wheels (4 small cylinders)
        for (const wx of [-0.5, 0.5]) {
            for (const wz of [-0.6, 0.6]) {
                const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
                const wheel = new THREE.Mesh(wheelGeo, darkMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(wx, 0.12, wz);
                trolley.add(wheel);
            }
        }

        trolley.position.set(x, 0, z);
        trolley.castShadow = true;
        return trolley;
    }

    // Trolleys near the back of each aisle
    group.add(createTrolley(-6, 67));
    group.add(createTrolley(6, 68));

    // --- Row number signs on the walls ---
    const signMat = toonMat(PALETTE.cream);
    for (let z = 12; z <= 66; z += 6) {
        for (const signX of [-17.2, 17.2]) {
            const signGeo = new THREE.BoxGeometry(0.1, 0.5, 0.8);
            const rowSign = new THREE.Mesh(signGeo, signMat);
            rowSign.position.set(signX, 4.5, z);
            group.add(rowSign);
        }
    }

    // --- Emergency exit signs on the walls (glowing green) ---
    const exitMat = toonMat(PALETTE.success, {
        emissive: PALETTE.success,
        emissiveIntensity: 0.6,
    });
    for (const exitZ of [30, 50]) {
        for (const side of [-1, 1]) {
            const exitGeo = new THREE.BoxGeometry(0.1, 0.6, 1.5);
            const exitSign = new THREE.Mesh(exitGeo, exitMat);
            exitSign.position.set(side * 17.2, 4.0, exitZ);
            group.add(exitSign);
        }
    }

    // --- Tray tables (folded up, visible on seat backs) are part of seat geometry ---

    return group;
}

// ─── 6. Cabin Light Strips ──────────────────────────────────────────────────
// Animated LED strips along the ceiling for atmosphere.

export function createCabinLightStrips() {
    const group = new THREE.Group();
    group.name = 'cabinLightStrips';

    const stripMat = new THREE.MeshBasicMaterial({
        color: PALETTE.airplaneStrip,
        transparent: true,
        opacity: 0.4,
    });

    const strips = [];

    // Two long LED strips along the ceiling transition
    for (const stripX of [-8, 8]) {
        const stripGeo = new THREE.BoxGeometry(0.2, 0.05, 56);
        const strip = new THREE.Mesh(stripGeo, stripMat.clone());
        strip.position.set(stripX, 6.9, 38);
        group.add(strip);
        strips.push(strip);
    }

    // Reading light spots (small circles on ceiling at intervals)
    const spotMat = new THREE.MeshBasicMaterial({
        color: PALETTE.airplaneStrip,
        transparent: true,
        opacity: 0.3,
    });
    const spots = [];
    for (let z = 12; z <= 66; z += 3) {
        for (const spotX of [-6, 6]) {
            const spotGeo = new THREE.CircleGeometry(0.3, 8);
            const spot = new THREE.Mesh(spotGeo, spotMat.clone());
            spot.rotation.x = Math.PI / 2;
            spot.position.set(spotX, 6.85, z);
            group.add(spot);
            spots.push(spot);
        }
    }

    group.userData.strips = strips;
    group.userData.spots = spots;

    return group;
}

// ─── 7. Airplane Passengers ─────────────────────────────────────────────────
// Simple seated figures in ~65% of seats for a lived-in cabin feel.

export function createAirplanePassengers() {
    const group = new THREE.Group();
    group.name = 'airplanePassengers';

    // Deterministic seeded random for consistent placement
    let _pSeed = 42;
    function pRng() { _pSeed = (_pSeed * 16807) % 2147483647; return (_pSeed - 1) / 2147483646; }

    const skinMat = toonMat(PALETTE.skin);

    // Clothing colors drawn from existing palette entries
    const clothingMats = [
        PALETTE.airplaneNervous,
        PALETTE.airplaneBusiness,
        PALETTE.airplaneStumbler,
        PALETTE.airplaneAttendant,
        PALETTE.airplaneMarshal,
        PALETTE.airplaneUnruly,
        PALETTE.cream,
        PALETTE.charcoal,
    ].map(c => toonMat(c));

    // Shared geometries — scaled to match enemy character proportions
    // (enemies at size ~1.5 have head radius ~0.52, torso ~1.2 wide)
    const headGeo = new THREE.SphereGeometry(0.42, 8, 6);
    const torsoGeo = new THREE.BoxGeometry(1.1, 0.85, 0.45);

    // Seat columns (must match createAirplaneSeats layout)
    const columns = [
        { cx: -12, count: 2, spacing: 2.8 },
        { cx: 0,   count: 3, spacing: 2.5 },
        { cx: 12,  count: 2, spacing: 2.8 },
    ];

    for (let z = 18; z <= 66; z += 3) {
        for (const col of columns) {
            for (let s = 0; s < col.count; s++) {
                if (pRng() > 0.65) continue; // ~65% occupancy

                const seatX = col.cx + (s - (col.count - 1) / 2) * col.spacing;
                const clothMat = clothingMats[Math.floor(pRng() * clothingMats.length)];

                // Upper torso / shoulders (visible between seat back and headrest)
                const torso = new THREE.Mesh(torsoGeo, clothMat);
                torso.position.set(seatX, 2.9, z - 0.15);
                group.add(torso);

                // Head (proportional to enemy characters)
                const head = new THREE.Mesh(headGeo, skinMat);
                head.position.set(seatX, 3.75, z - 0.1);
                group.add(head);

                // Slight random head tilt for variety
                if (pRng() < 0.3) {
                    head.rotation.z = (pRng() - 0.5) * 0.4;
                }
            }
        }
    }

    return group;
}

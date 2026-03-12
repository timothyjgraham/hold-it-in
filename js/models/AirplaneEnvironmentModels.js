// AirplaneEnvironmentModels.js — Low-poly 3D airplane cabin interior for "Hold It In"
// Airplane scenario: 747 economy class cabin with two aisles separated by a middle seat column.
// Toilet cubicle at the rear with two doors (one per aisle).
// All functions return THREE.Group objects with toon materials.

import { PALETTE } from '../data/palette.js';
import { toonMat, matDark, matInk, matPorcelain, matGold } from '../shaders/toonMaterials.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function rand(min, max) {
    return min + Math.random() * (max - min);
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

    // --- Windows on both sides (small bright ovals) ---
    const windowMat = toonMat(PALETTE.airplaneWindow, {
        emissive: PALETTE.airplaneWindow,
        emissiveIntensity: 0.4,
    });
    for (const side of [-1, 1]) {
        for (let z = 12; z <= 66; z += 3) {
            const windowGeo = new THREE.CircleGeometry(0.5, 8);
            const win = new THREE.Mesh(windowGeo, windowMat);
            win.position.set(side * 17.3, 3.5, z);
            win.rotation.y = side * Math.PI / 2;
            group.add(win);

            // Window frame
            const frameGeo = new THREE.RingGeometry(0.5, 0.65, 8);
            const frameMat = toonMat(PALETTE.airplaneSeatBack);
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.set(side * 17.28, 3.5, z);
            frame.rotation.y = side * Math.PI / 2;
            group.add(frame);
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

    // Seat column definitions: [centerX, seatCount, seatSpacing]
    const columns = [
        { cx: -12, count: 2, spacing: 2.2 },   // left window seats
        { cx: 0,   count: 3, spacing: 2.0 },    // middle seats
        { cx: 12,  count: 2, spacing: 2.2 },    // right window seats
    ];

    for (let z = 12; z <= 66; z += 3) {
        for (const col of columns) {
            for (let s = 0; s < col.count; s++) {
                const seatX = col.cx + (s - (col.count - 1) / 2) * col.spacing;
                const seatGroup = new THREE.Group();

                // Seat cushion
                const cushGeo = new THREE.BoxGeometry(1.6, 0.5, 1.4);
                const cush = new THREE.Mesh(cushGeo, seatMat);
                cush.position.set(0, 0.8, 0);
                seatGroup.add(cush);

                // Seat back
                const backGeo = new THREE.BoxGeometry(1.6, 2.2, 0.3);
                const back = new THREE.Mesh(backGeo, backMat);
                back.position.set(0, 1.9, -0.65);
                seatGroup.add(back);

                // Headrest
                const headGeo = new THREE.BoxGeometry(1.0, 0.7, 0.25);
                const head = new THREE.Mesh(headGeo, backMat);
                head.position.set(0, 3.2, -0.6);
                seatGroup.add(head);

                // Armrests (thin rails on sides)
                for (const armSide of [-0.75, 0.75]) {
                    const armGeo = new THREE.BoxGeometry(0.1, 0.15, 1.2);
                    const arm = new THREE.Mesh(armGeo, armMat);
                    arm.position.set(armSide, 1.1, -0.05);
                    seatGroup.add(arm);
                }

                seatGroup.position.set(seatX, 0, z);
                seatGroup.castShadow = true;
                group.add(seatGroup);
            }
        }
    }

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

    // --- "OCCUPIED" signs above each door ---
    const signMat = toonMat(PALETTE.danger, {
        emissive: PALETTE.danger,
        emissiveIntensity: 0.4,
    });
    for (const doorX of [-5, 5]) {
        // Sign backing plate
        const signBackGeo = new THREE.BoxGeometry(2.5, 0.5, 0.15);
        const signBack = new THREE.Mesh(signBackGeo, toonMat(PALETTE.charcoal));
        signBack.position.set(doorX, cubH + 0.3, 8.1);
        group.add(signBack);

        // Sign glow rectangle
        const signGeo = new THREE.BoxGeometry(2.2, 0.35, 0.05);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(doorX, cubH + 0.3, 8.2);
        group.add(sign);
    }

    // --- Floor inside cubicle (slightly different color) ---
    const floorGeo = new THREE.PlaneGeometry(cubW - 0.6, cubD - 0.6);
    const floorMat = toonMat(PALETTE.tileLight);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.01, cubZ);
    group.add(floor);

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

        // Crack / damage overlay meshes (shared across both doors)
        const crackMat = new THREE.MeshBasicMaterial({
            color: PALETTE.ink,
            transparent: true,
            opacity: 0.6,
        });

        function buildCrack(segments) {
            const crackGroup = new THREE.Group();
            for (const seg of segments) {
                const segGeo = new THREE.BoxGeometry(seg.w, seg.h, 0.02);
                const segMesh = new THREE.Mesh(segGeo, crackMat);
                segMesh.position.set(seg.x, seg.y, 0.06);
                if (seg.rot) segMesh.rotation.z = seg.rot;
                crackGroup.add(segMesh);
            }
            crackGroup.visible = false;
            return crackGroup;
        }

        const cracks = [];

        const crack0 = buildCrack([
            { x: -0.5, y: 2.5, w: 0.35, h: 0.03, rot: 0.3 },
            { x: -0.35, y: 2.4, w: 0.25, h: 0.03, rot: -0.5 },
        ]);
        panelGroup.add(crack0); cracks.push(crack0);

        const crack1 = buildCrack([
            { x: 0.4, y: 1.9, w: 0.4, h: 0.03, rot: -0.2 },
            { x: 0.6, y: 1.8, w: 0.3, h: 0.03, rot: 0.5 },
        ]);
        panelGroup.add(crack1); cracks.push(crack1);

        const crack2 = buildCrack([
            { x: -0.1, y: 0.9, w: 0.45, h: 0.04, rot: 0.1 },
            { x: 0.1, y: 0.8, w: 0.35, h: 0.03, rot: -0.35 },
        ]);
        panelGroup.add(crack2); cracks.push(crack2);

        const crack3 = buildCrack([
            { x: 0.5, y: 2.3, w: 0.3, h: 0.03, rot: -0.6 },
            { x: 0.4, y: 2.2, w: 0.25, h: 0.03, rot: 0.25 },
        ]);
        panelGroup.add(crack3); cracks.push(crack3);

        const crack4 = buildCrack([
            { x: 0.0, y: 1.4, w: 0.5, h: 0.03, rot: 0.2 },
            { x: -0.1, y: 1.2, w: 0.35, h: 0.03, rot: -0.4 },
            { x: 0.2, y: 1.5, w: 0.3, h: 0.03, rot: 0.6 },
        ]);
        panelGroup.add(crack4); cracks.push(crack4);

        allCracks.push(cracks);

        panelGroup.position.set(doorX, 0, 8);
        group.add(panelGroup);
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

// ForestEnvironmentModels.js — Low-poly 3D forest environment for "Hold It In"
// Forest scenario: dirt path through dense woods, outhouse replaces bathroom.
// All functions return THREE.Group objects with toon materials.

import { PALETTE } from '../data/palette.js';
import { toonMat, matWood, matDark, matInk, outlineMatStatic } from '../shaders/toonMaterials.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple seeded-ish random for consistent placement (not truly seeded, but stable per session) */
function rand(min, max) {
    return min + Math.random() * (max - min);
}

function randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── 1. Forest Ground ───────────────────────────────────────────────────────

export function createForestGround() {
    const group = new THREE.Group();
    group.name = 'forestGround';

    // --- Large grass ground plane extending well past viewport edges ---
    const grassGeo = new THREE.PlaneGeometry(160, 160);
    const grassMat = toonMat(PALETTE.forestGrass);
    const grassPlane = new THREE.Mesh(grassGeo, grassMat);
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.set(0, -0.05, 35);
    grassPlane.receiveShadow = true;
    group.add(grassPlane);

    // --- Dirt path with canvas texture for subtle variation ---
    const pathCanvas = document.createElement('canvas');
    pathCanvas.width = 256;
    pathCanvas.height = 512;
    const ctx = pathCanvas.getContext('2d');

    // Base dirt color
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, 0, 256, 512);

    // Random darker patches for texture
    for (let i = 0; i < 80; i++) {
        const px = Math.random() * 256;
        const py = Math.random() * 512;
        const ps = 8 + Math.random() * 20;
        ctx.fillStyle = `rgba(80, 60, 40, ${0.1 + Math.random() * 0.15})`;
        ctx.beginPath();
        ctx.ellipse(px, py, ps, ps * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    // Small pebble-like dots
    for (let i = 0; i < 120; i++) {
        const px = Math.random() * 256;
        const py = Math.random() * 512;
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '100,90,70' : '160,140,110'}, ${0.15 + Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.arc(px, py, 1 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    const pathTexture = new THREE.CanvasTexture(pathCanvas);
    pathTexture.wrapS = THREE.RepeatWrapping;
    pathTexture.wrapT = THREE.RepeatWrapping;
    pathTexture.repeat.set(2, 4);

    const pathMat = new THREE.MeshToonMaterial({
        map: pathTexture,
        // toonMat gradient map is private, so we create a quick 3-tone ramp
    });
    // Apply gradient map manually for toon look
    const gradData = new Uint8Array([89, 217, 255]); // matches TOON_RAMP
    const gradTex = new THREE.DataTexture(gradData, 3, 1, THREE.LuminanceFormat);
    gradTex.minFilter = THREE.NearestFilter;
    gradTex.magFilter = THREE.NearestFilter;
    gradTex.needsUpdate = true;
    pathMat.gradientMap = gradTex;

    const pathGeo = new THREE.PlaneGeometry(20, 70);
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(0, -0.03, 35);
    pathMesh.receiveShadow = true;
    group.add(pathMesh);

    // --- Small clearing around outhouse (z = 0 to 12) ---
    const clearingGeo = new THREE.PlaneGeometry(24, 14);
    const clearingMat = toonMat(PALETTE.forestDirt);
    const clearingMesh = new THREE.Mesh(clearingGeo, clearingMat);
    clearingMesh.rotation.x = -Math.PI / 2;
    clearingMesh.position.set(0, -0.02, 6);
    clearingMesh.receiveShadow = true;
    group.add(clearingMesh);

    return group;
}

// ─── 2. Forest Trees ────────────────────────────────────────────────────────

export function createForestTrees() {
    const group = new THREE.Group();
    group.name = 'forestTrees';

    const barkMat = toonMat(PALETTE.forestBark);
    const leafMat = toonMat(PALETTE.forestLeaf);
    const leafDarkMat = toonMat(PALETTE.forestLeafDark);

    // --- Helper: create a pine tree ---
    function createPine(x, z, scale) {
        const pine = new THREE.Group();
        pine.name = 'pineTree';

        const trunkH = rand(8, 14) * scale;
        const trunkR = rand(0.3, 0.5) * scale;

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        pine.add(trunk);

        // 2-3 stacked cones for canopy
        const coneCount = Math.random() > 0.4 ? 3 : 2;
        const canopyStart = trunkH * 0.35;
        const canopySpan = trunkH * 0.75;

        for (let i = 0; i < coneCount; i++) {
            const t = i / coneCount;
            const coneR = (2.5 - t * 0.8) * scale;
            const coneH = (3.5 - t * 0.5) * scale;
            const mat = i === 0 ? leafDarkMat : leafMat;

            const coneGeo = new THREE.ConeGeometry(coneR, coneH, 7);
            const cone = new THREE.Mesh(coneGeo, mat);
            cone.position.y = canopyStart + t * canopySpan + coneH / 2;
            cone.castShadow = true;
            cone.receiveShadow = true;
            pine.add(cone);
        }

        pine.position.set(x, 0, z);
        pine.rotation.y = Math.random() * Math.PI * 2;
        return pine;
    }

    // --- Helper: create a round deciduous tree ---
    function createDeciduous(x, z, scale) {
        const tree = new THREE.Group();
        tree.name = 'deciduousTree';

        const trunkH = rand(5, 8) * scale;
        const trunkR = rand(0.25, 0.4) * scale;

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
        const trunk = new THREE.Mesh(trunkGeo, barkMat);
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // Large sphere canopy
        const canopyR = rand(2, 4) * scale;
        const canopyGeo = new THREE.SphereGeometry(canopyR, 8, 8);
        const canopyMat = Math.random() > 0.5 ? leafMat : leafDarkMat;
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.y = trunkH + canopyR * 0.5;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        tree.add(canopy);

        tree.position.set(x, 0, z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        return tree;
    }

    // --- Place trees on both sides — dense wall of forest, no gaps ---
    // Path is 20 wide (x ±10), so trees start at x=12 inward edge
    for (let side = -1; side <= 1; side += 2) {
        // Inner band — tree line just beyond the path
        for (let i = 0; i < 20; i++) {
            const x = side * rand(12, 22);
            const z = rand(-5, 75);
            group.add(createPine(x, z, rand(0.7, 1.3)));
        }
        for (let i = 0; i < 10; i++) {
            const x = side * rand(12, 22);
            const z = rand(-5, 75);
            group.add(createDeciduous(x, z, rand(0.7, 1.2)));
        }

        // Middle band — dense fill
        for (let i = 0; i < 18; i++) {
            const x = side * rand(20, 35);
            const z = rand(-5, 78);
            group.add(createPine(x, z, rand(0.8, 1.4)));
        }
        for (let i = 0; i < 10; i++) {
            const x = side * rand(20, 35);
            const z = rand(-5, 78);
            group.add(createDeciduous(x, z, rand(0.8, 1.3)));
        }

        // Outer band — fills to camera edges
        for (let i = 0; i < 15; i++) {
            const x = side * rand(32, 50);
            const z = rand(-8, 80);
            group.add(createPine(x, z, rand(0.9, 1.5)));
        }
        for (let i = 0; i < 8; i++) {
            const x = side * rand(32, 50);
            const z = rand(-8, 80);
            group.add(createDeciduous(x, z, rand(0.9, 1.4)));
        }

        // Far outer band — for wide screens
        for (let i = 0; i < 10; i++) {
            const x = side * rand(45, 65);
            const z = rand(-10, 82);
            group.add(createPine(x, z, rand(1.0, 1.6)));
        }

        // Bottom edge fill — behind/beside the outhouse (low Z)
        for (let i = 0; i < 6; i++) {
            const x = side * rand(5, 20);
            const z = rand(-8, 2);
            group.add(createPine(x, z, rand(0.8, 1.2)));
        }
        for (let i = 0; i < 4; i++) {
            const x = side * rand(5, 20);
            const z = rand(-8, 2);
            group.add(createDeciduous(x, z, rand(0.7, 1.1)));
        }
    }

    // Back tree line — behind outhouse, spanning full width
    for (let i = 0; i < 12; i++) {
        const x = rand(-40, 40);
        const z = rand(-10, -3);
        group.add(createPine(x, z, rand(0.8, 1.3)));
    }

    return group;
}

// ─── 3. Forest Bushes ───────────────────────────────────────────────────────

export function createForestBushes() {
    const group = new THREE.Group();
    group.name = 'forestBushes';

    const bushMat = toonMat(PALETTE.forestBush);
    const flowerPinkMat = toonMat(PALETTE.forestFlower);
    const flowerYellowMat = toonMat(PALETTE.forestFlowerY);

    // --- Helper: create a bush ---
    function createBush(x, z) {
        const bush = new THREE.Group();
        bush.name = 'bush';

        const sphereCount = 2 + Math.floor(Math.random() * 2); // 2-3
        for (let i = 0; i < sphereCount; i++) {
            const r = rand(0.5, 1.5);
            const geo = new THREE.SphereGeometry(r, 8, 6);
            const mesh = new THREE.Mesh(geo, bushMat);
            mesh.position.set(
                rand(-0.5, 0.5),
                r * 0.6,
                rand(-0.5, 0.5)
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            bush.add(mesh);
        }

        // Chance of tiny flowers
        if (Math.random() > 0.5) {
            const flowerCount = 2 + Math.floor(Math.random() * 4);
            const flowerMat = Math.random() > 0.5 ? flowerPinkMat : flowerYellowMat;
            for (let i = 0; i < flowerCount; i++) {
                const fGeo = new THREE.SphereGeometry(0.08, 4, 4);
                const flower = new THREE.Mesh(fGeo, flowerMat);
                flower.position.set(
                    rand(-1.0, 1.0),
                    rand(0.5, 1.5),
                    rand(-1.0, 1.0)
                );
                bush.add(flower);
            }
        }

        bush.position.set(x, 0, z);
        return bush;
    }

    // --- Helper: create a mushroom ---
    function createMushroom(x, z) {
        const shroom = new THREE.Group();
        shroom.name = 'mushroom';

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6);
        const stemMat = toonMat(PALETTE.cream);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.15;
        shroom.add(stem);

        // Cap (half-sphere)
        const capGeo = new THREE.SphereGeometry(0.15, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
        const capColor = Math.random() > 0.5 ? PALETTE.forestFlower : PALETTE.forestBark;
        const capMat = toonMat(capColor);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 0.3;
        shroom.add(cap);

        shroom.position.set(x, 0, z);
        const s = rand(0.8, 1.5);
        shroom.scale.set(s, s, s);
        return shroom;
    }

    // Place bushes along path edges and scattered in the forest
    const bushCount = 30 + Math.floor(Math.random() * 11);
    for (let i = 0; i < bushCount; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * rand(10, 25);
        const z = rand(-3, 72);
        group.add(createBush(x, z));
    }

    // Place mushrooms scattered wider
    const shroomCount = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < shroomCount; i++) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * rand(6, 25);
        const z = rand(3, 68);
        group.add(createMushroom(x, z));
    }

    return group;
}

// ─── 4. Forest Rocks ────────────────────────────────────────────────────────

export function createForestRocks() {
    const group = new THREE.Group();
    group.name = 'forestRocks';

    const stoneMat = toonMat(PALETTE.forestStone);
    const mossMat = toonMat(PALETTE.forestMoss, { transparent: true, opacity: 0.7 });

    const rockCount = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < rockCount; i++) {
        const rock = new THREE.Group();
        rock.name = 'rock';

        const size = rand(0.3, 1.5);

        // Use dodecahedron for organic look, slightly squashed
        const geo = new THREE.DodecahedronGeometry(size, 0);
        const mesh = new THREE.Mesh(geo, stoneMat);
        mesh.scale.y = rand(0.5, 0.8); // squash vertically
        mesh.position.y = size * 0.3;
        mesh.rotation.set(
            rand(-0.3, 0.3),
            rand(0, Math.PI * 2),
            rand(-0.3, 0.3)
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        rock.add(mesh);

        // Chance of moss patch on top
        if (Math.random() > 0.5) {
            const mossGeo = new THREE.PlaneGeometry(size * 0.8, size * 0.8);
            const moss = new THREE.Mesh(mossGeo, mossMat);
            moss.rotation.x = -Math.PI / 2;
            moss.position.y = size * 0.55;
            rock.add(moss);
        }

        const side = Math.random() > 0.5 ? 1 : -1;
        rock.position.set(
            side * rand(8, 30),
            0,
            rand(-3, 72)
        );

        group.add(rock);
    }

    return group;
}

// ─── 5. Outhouse ────────────────────────────────────────────────────────────

export function createOuthouse() {
    const group = new THREE.Group();
    group.name = 'outhouse';

    const plankMat = toonMat(PALETTE.forestPlanks);
    const plankDarkMat = toonMat(PALETTE.forestBark); // darker shade for bench
    const inkMat = matInk();

    // --- Floor platform ---
    const floorGeo = new THREE.BoxGeometry(3, 0.15, 3);
    const floorMesh = new THREE.Mesh(floorGeo, plankMat);
    floorMesh.position.set(0, 0.075, 0);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // --- Walls ---
    const wallThickness = 0.12;

    // Back wall (full)
    const backWallGeo = new THREE.BoxGeometry(3, 4, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, plankMat);
    backWall.position.set(0, 2.15, -1.5 + wallThickness / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    group.add(backWall);

    // Left wall (full)
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, 4, 3);
    const leftWall = new THREE.Mesh(sideWallGeo, plankMat);
    leftWall.position.set(-1.5 + wallThickness / 2, 2.15, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    group.add(leftWall);

    // Right wall (full)
    const rightWall = new THREE.Mesh(sideWallGeo, plankMat);
    rightWall.position.set(1.5 - wallThickness / 2, 2.15, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    group.add(rightWall);

    // Front wall — two narrow panels flanking the door opening (2 unit gap)
    // Left panel (0.5 wide)
    const frontPanelGeo = new THREE.BoxGeometry(0.5, 4, wallThickness);
    const frontLeft = new THREE.Mesh(frontPanelGeo, plankMat);
    frontLeft.position.set(-1.25, 2.15, 1.5 - wallThickness / 2);
    frontLeft.castShadow = true;
    group.add(frontLeft);

    // Right panel (0.5 wide)
    const frontRight = new THREE.Mesh(frontPanelGeo, plankMat);
    frontRight.position.set(1.25, 2.15, 1.5 - wallThickness / 2);
    frontRight.castShadow = true;
    group.add(frontRight);

    // Transom above door (2 wide, 0.5 tall)
    const transomGeo = new THREE.BoxGeometry(2, 0.5, wallThickness);
    const transom = new THREE.Mesh(transomGeo, plankMat);
    transom.position.set(0, 3.9, 1.5 - wallThickness / 2);
    transom.castShadow = true;
    group.add(transom);

    // --- Plank gap details (thin dark lines between planks) ---
    const gapMat = matDark();
    function addPlankGaps(parent, width, height, posZ, isVertical) {
        const gapCount = Math.floor(height / 1.0);
        for (let i = 1; i < gapCount; i++) {
            const gapGeo = isVertical
                ? new THREE.BoxGeometry(width + 0.02, 0.02, 0.01)
                : new THREE.BoxGeometry(0.02, height + 0.02, 0.01);
            const gap = new THREE.Mesh(gapGeo, gapMat);
            if (isVertical) {
                gap.position.set(0, 0.15 + i * 1.0, posZ + 0.07);
            }
            parent.add(gap);
        }
    }

    // Horizontal plank lines on back wall
    for (let i = 1; i <= 3; i++) {
        const gapGeo = new THREE.BoxGeometry(2.9, 0.02, 0.01);
        const gap = new THREE.Mesh(gapGeo, gapMat);
        gap.position.set(0, 0.15 + i * 1.0, -1.5 + wallThickness + 0.01);
        group.add(gap);
    }

    // --- Roof removed — invisible so player can see inside the outhouse ---

    // --- Interior: bench/seat ---
    const benchGeo = new THREE.BoxGeometry(2.4, 0.15, 1.0);
    const bench = new THREE.Mesh(benchGeo, plankDarkMat);
    bench.position.set(0, 1.0, -0.8);
    bench.receiveShadow = true;
    group.add(bench);

    // Bench front face
    const benchFrontGeo = new THREE.BoxGeometry(2.4, 0.85, 0.1);
    const benchFront = new THREE.Mesh(benchFrontGeo, plankDarkMat);
    benchFront.position.set(0, 0.575, -0.35);
    group.add(benchFront);

    // Hole in bench (dark cylinder going down)
    const holeGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 8);
    const holeMat = matInk();
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(0, 0.95, -0.8);
    group.add(hole);

    // --- Lantern / candle providing warm light ---
    // Small lantern body
    const lanternGeo = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const lanternMat = toonMat(PALETTE.forestSunbeam);
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(-0.8, 1.3, -1.2);
    group.add(lantern);

    // Warm point light
    const lanternLight = new THREE.PointLight(PALETTE.forestSunbeam, 0.5, 8);
    lanternLight.position.set(-0.8, 1.6, -1.2);
    group.add(lanternLight);

    // --- Moon cutout decoration (small yellow circle on transom area) ---
    const moonGeo = new THREE.CircleGeometry(0.18, 8);
    const moonMat = toonMat(PALETTE.forestSunbeam, {
        emissive: PALETTE.forestSunbeam,
        emissiveIntensity: 0.4,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(0, 3.9, 1.5 - wallThickness / 2 + 0.07);
    group.add(moon);

    // Position the outhouse at the toilet location
    group.position.set(0, 0, 3);

    return group;
}

// ─── 6. Outhouse Door ───────────────────────────────────────────────────────

export function createOuthouseDoor() {
    const group = new THREE.Group();
    group.name = 'outhouseDoor';

    const doorColor = PALETTE.forestPlanks;

    const doorMat = toonMat(doorColor, {
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
    });
    doorMat.depthWrite = false;

    // --- Door panel ---
    const doorGeo = new THREE.BoxGeometry(2.0, 3.5, 0.1);
    const doorPanel = new THREE.Mesh(doorGeo, doorMat);
    doorPanel.position.set(0, 1.85, 0);
    doorPanel.castShadow = false;
    doorPanel.receiveShadow = false;
    group.add(doorPanel);

    // --- Horizontal plank lines on door ---
    const plankLineMat = matDark();
    for (let i = 1; i <= 3; i++) {
        const lineGeo = new THREE.BoxGeometry(1.9, 0.02, 0.01);
        const line = new THREE.Mesh(lineGeo, plankLineMat);
        line.position.set(0, 0.3 + i * 0.85, 0.06);
        group.add(line);
    }

    // --- Moon cutout circle (yellow circle on upper third of door) ---
    const moonGeo = new THREE.CircleGeometry(0.2, 8);
    const moonMat = toonMat(PALETTE.forestSunbeam, {
        emissive: PALETTE.forestSunbeam,
        emissiveIntensity: 0.5,
    });
    const moonCutout = new THREE.Mesh(moonGeo, moonMat);
    moonCutout.position.set(0, 3.0, 0.06);
    group.add(moonCutout);

    // --- Rustic handle (wooden peg) ---
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    const handleMat = toonMat(PALETTE.forestBark);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.7, 1.8, 0.15);
    group.add(handle);

    // --- Hinges (two small dark cylinders on left side) ---
    const hingeMat = matInk();
    for (let i = 0; i < 2; i++) {
        const hingeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6);
        const hinge = new THREE.Mesh(hingeGeo, hingeMat);
        hinge.position.set(-0.95, 1.0 + i * 2.0, 0.06);
        group.add(hinge);

        // Hinge plate (small dark box)
        const plateGeo = new THREE.BoxGeometry(0.2, 0.1, 0.02);
        const plate = new THREE.Mesh(plateGeo, hingeMat);
        plate.position.set(-0.85, 1.0 + i * 2.0, 0.055);
        group.add(plate);
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
            segMesh.position.set(seg.x, seg.y, 0.06);
            if (seg.rot) segMesh.rotation.z = seg.rot;
            crackGroup.add(segMesh);
        }
        crackGroup.visible = false;
        return crackGroup;
    }

    // Crack 0 — upper left
    const crack0 = buildCrack([
        { x: -0.5, y: 2.8, w: 0.35, h: 0.03, rot: 0.3 },
        { x: -0.35, y: 2.7, w: 0.25, h: 0.03, rot: -0.5 },
        { x: -0.25, y: 2.6, w: 0.2, h: 0.03, rot: 0.15 },
    ]);
    crack0.name = 'crack_0';
    group.add(crack0);
    cracks.push(crack0);

    // Crack 1 — center right
    const crack1 = buildCrack([
        { x: 0.4, y: 1.9, w: 0.4, h: 0.03, rot: -0.2 },
        { x: 0.6, y: 1.8, w: 0.3, h: 0.03, rot: 0.5 },
        { x: 0.3, y: 2.0, w: 0.2, h: 0.03, rot: -0.4 },
    ]);
    crack1.name = 'crack_1';
    group.add(crack1);
    cracks.push(crack1);

    // Crack 2 — lower center
    const crack2 = buildCrack([
        { x: -0.1, y: 0.9, w: 0.45, h: 0.04, rot: 0.1 },
        { x: 0.1, y: 0.8, w: 0.35, h: 0.03, rot: -0.35 },
        { x: -0.15, y: 1.0, w: 0.25, h: 0.03, rot: 0.5 },
        { x: 0.2, y: 0.7, w: 0.2, h: 0.03, rot: -0.15 },
    ]);
    crack2.name = 'crack_2';
    group.add(crack2);
    cracks.push(crack2);

    // Crack 3 — upper right
    const crack3 = buildCrack([
        { x: 0.6, y: 2.6, w: 0.3, h: 0.03, rot: -0.6 },
        { x: 0.5, y: 2.5, w: 0.25, h: 0.03, rot: 0.25 },
        { x: 0.7, y: 2.55, w: 0.2, h: 0.03, rot: -0.1 },
    ]);
    crack3.name = 'crack_3';
    group.add(crack3);
    cracks.push(crack3);

    // Crack 4 — center, critical damage
    const crack4 = buildCrack([
        { x: 0.0, y: 1.4, w: 0.5, h: 0.03, rot: 0.2 },
        { x: -0.1, y: 1.2, w: 0.35, h: 0.03, rot: -0.4 },
        { x: 0.2, y: 1.5, w: 0.3, h: 0.03, rot: 0.6 },
        { x: -0.15, y: 1.55, w: 0.25, h: 0.03, rot: -0.15 },
    ]);
    crack4.name = 'crack_4';
    group.add(crack4);
    cracks.push(crack4);

    // --- Store metadata on group.userData (matches bathroom door interface) ---
    group.userData.door = doorPanel;
    group.userData.cracks = cracks;
    group.userData.doorHP = 100;
    group.userData.maxDoorHP = 100;
    group.userData.originalColor = doorColor;

    // Position: centered at the corridor start area
    group.position.set(0, 0, 7);

    return group;
}

// ─── 7. Sunbeams ────────────────────────────────────────────────────────────

export function createSunbeams() {
    const group = new THREE.Group();
    group.name = 'forestSunbeams';

    const beams = [];

    const beamCount = 6 + Math.floor(Math.random() * 5); // 6-10

    for (let i = 0; i < beamCount; i++) {
        const beamLength = rand(10, 20);
        const beamRadius = rand(0.5, 1.5);

        const beamGeo = new THREE.CylinderGeometry(beamRadius * 0.3, beamRadius, beamLength, 6, 1, true);
        const beamMat = toonMat(PALETTE.forestSunbeam, {
            transparent: true,
            opacity: rand(0.08, 0.12),
            side: THREE.DoubleSide,
        });
        beamMat.depthWrite = false;

        const beam = new THREE.Mesh(beamGeo, beamMat);

        // Angle from upper-left to lower-right
        beam.rotation.z = rand(-0.6, -0.3);
        beam.rotation.x = rand(-0.2, 0.2);

        beam.position.set(
            rand(-25, 25),
            rand(6, 14),
            rand(5, 65)
        );

        beam.castShadow = false;
        beam.receiveShadow = false;
        group.add(beam);

        beams.push(beam);
    }

    group.userData.beams = beams;

    return group;
}

// ─── 8. Butterflies ─────────────────────────────────────────────────────────

export function createButterflies() {
    const group = new THREE.Group();
    group.name = 'forestButterflies';

    const butterflyColors = [PALETTE.forestFlower, PALETTE.forestFlowerY, PALETTE.cream];
    const butterflies = [];

    const count = 8 + Math.floor(Math.random() * 5); // 8-12

    for (let i = 0; i < count; i++) {
        const butterfly = new THREE.Group();
        butterfly.name = 'butterfly';

        const wingColor = randPick(butterflyColors);
        const wingMat = toonMat(wingColor, { side: THREE.DoubleSide });

        // Wing shape: small triangle via custom geometry
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(0.15, 0.1);
        wingShape.lineTo(0.12, -0.08);
        wingShape.closePath();

        const wingGeo = new THREE.ShapeGeometry(wingShape);

        // Left wing
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.x = -0.02;
        leftWing.rotation.y = 0.3;
        butterfly.add(leftWing);

        // Right wing (mirrored)
        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.scale.x = -1;
        rightWing.position.x = 0.02;
        rightWing.rotation.y = -0.3;
        butterfly.add(rightWing);

        // Tiny body
        const bodyGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4);
        const bodyMat = matInk();
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        butterfly.add(body);

        // Random starting position — spread across wider forest
        const cx = rand(-25, 25);
        const cy = rand(1, 4);
        const cz = rand(5, 68);
        butterfly.position.set(cx, cy, cz);

        group.add(butterfly);

        butterflies.push({
            mesh: butterfly,
            phase: Math.random() * Math.PI * 2,
            speed: rand(0.3, 0.8),
            center: new THREE.Vector3(cx, cy, cz),
            radius: rand(0.5, 2.0),
            leftWing: leftWing,
            rightWing: rightWing,
        });
    }

    group.userData.butterflies = butterflies;

    return group;
}

// ─── 9. Forest Props ────────────────────────────────────────────────────────

export function createForestProps() {
    const group = new THREE.Group();
    group.name = 'forestProps';

    const barkMat = toonMat(PALETTE.forestBark);
    const stoneMat = toonMat(PALETTE.forestStone);
    const stumpMat = toonMat(PALETTE.forestBark);

    // --- Fallen logs ---
    for (let i = 0; i < 3; i++) {
        const logLength = rand(3, 6);
        const logRadius = rand(0.2, 0.5);
        const logGeo = new THREE.CylinderGeometry(logRadius, logRadius * 1.1, logLength, 6);
        const log = new THREE.Mesh(logGeo, barkMat);

        // Lying on ground at angle
        log.rotation.z = Math.PI / 2;
        log.rotation.y = rand(-0.5, 0.5);
        log.position.set(
            (i === 0 ? -1 : 1) * rand(12, 25),
            logRadius * 0.8,
            rand(15, 55)
        );
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
    }

    // --- Campfire near the outhouse ---
    const campfire = new THREE.Group();
    campfire.name = 'campfire';

    // Ring of stones
    const stoneCount = 8;
    for (let i = 0; i < stoneCount; i++) {
        const angle = (i / stoneCount) * Math.PI * 2;
        const stoneGeo = new THREE.SphereGeometry(rand(0.12, 0.18), 5, 4);
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(
            Math.cos(angle) * 0.6,
            0.1,
            Math.sin(angle) * 0.6
        );
        stone.scale.y = 0.7;
        campfire.add(stone);
    }

    // Pile of sticks (thin cylinders crossed)
    for (let i = 0; i < 5; i++) {
        const stickGeo = new THREE.CylinderGeometry(0.02, 0.025, rand(0.6, 0.9), 4);
        const stick = new THREE.Mesh(stickGeo, barkMat);
        stick.position.set(
            rand(-0.15, 0.15),
            0.2 + i * 0.05,
            rand(-0.15, 0.15)
        );
        stick.rotation.z = rand(-0.8, 0.8);
        stick.rotation.x = rand(-0.5, 0.5);
        campfire.add(stick);
    }

    // Orange/yellow glow cone above fire
    const glowGeo = new THREE.ConeGeometry(0.4, 1.2, 6, 1, true);
    const glowMat = toonMat(PALETTE.forestSunbeam, {
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
    });
    glowMat.depthWrite = false;
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.7;
    campfire.add(glow);

    // Campfire point light
    const fireLight = new THREE.PointLight(PALETTE.forestSunbeam, 0.4, 6);
    fireLight.position.y = 0.5;
    campfire.add(fireLight);

    campfire.position.set(3, 0, 5);
    group.add(campfire);

    // --- Tree stumps ---
    for (let i = 0; i < 3; i++) {
        const stumpR = rand(0.3, 0.6);
        const stumpH = rand(0.2, 0.5);
        const stumpGeo = new THREE.CylinderGeometry(stumpR, stumpR * 1.1, stumpH, 7);
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.set(
            (Math.random() > 0.5 ? 1 : -1) * rand(12, 25),
            stumpH / 2,
            rand(10, 60)
        );
        stump.castShadow = true;
        stump.receiveShadow = true;
        group.add(stump);
    }

    // --- Small wooden sign post ---
    const signPost = new THREE.Group();
    signPost.name = 'signPost';

    // Post
    const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.0, 6);
    const post = new THREE.Mesh(postGeo, barkMat);
    post.position.y = 1.0;
    post.castShadow = true;
    signPost.add(post);

    // Sign board
    const boardGeo = new THREE.BoxGeometry(1.0, 0.5, 0.06);
    const boardMat = toonMat(PALETTE.forestPlanks);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 1.8, 0);
    board.rotation.y = 0.15;
    board.castShadow = true;
    signPost.add(board);

    signPost.position.set(-5, 0, 10);
    group.add(signPost);

    return group;
}

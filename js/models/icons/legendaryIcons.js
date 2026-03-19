// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Legendary Tier Upgrade Icons (L1–L18)                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../../data/palette.js';
import { toonMat, matGold, matDanger, matSign, matMop, matUbik, matPotplant } from '../../shaders/toonMaterials.js';
import { ol, addWithOutline, shockwaveRings, explosionBurst, skullShape, heartShape, coinStack, hourglass, lightningBolt } from './iconPrimitives.js';

// ─── L1: Double Flush ─────────────────────────────────────────────────────────
// Two toilets side by side. "Double" = two. "Flush" = toilet. Literal.
function buildL1() {
    const g = new THREE.Group();
    const porcelain = toonMat(PALETTE.white);
    const rim = toonMat(PALETTE.fixture);
    for (const sx of [-0.28, 0.28]) {
        // Toilet bowl (cylinder)
        addWithOutline(g, new THREE.CylinderGeometry(0.18, 0.15, 0.25, 10), porcelain, { x: sx, y: -0.2 });
        // Toilet seat rim (torus)
        addWithOutline(g, new THREE.TorusGeometry(0.17, 0.03, 6, 12), rim,
            { x: sx, y: -0.06 }, { x: Math.PI / 2 });
        // Tank (box behind)
        addWithOutline(g, new THREE.BoxGeometry(0.25, 0.3, 0.12), porcelain, { x: sx, y: 0.12, z: -0.12 });
        // Flush handle
        addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), rim,
            { x: sx + 0.12, y: 0.22 }, { z: Math.PI / 2 });
    }
    return g;
}

// ─── L2: Desperate Measures ───────────────────────────────────────────────────
// "Eek" panic face — circle face, wide-open mouth (O), raised eyebrows. 😱
function buildL2() {
    const g = new THREE.Group();
    const skinMat = toonMat(PALETTE.skin);
    const inkMat = toonMat(PALETTE.ink);
    // Round face
    addWithOutline(g, new THREE.SphereGeometry(0.42, 14, 12), skinMat);
    // Wide-open mouth (dark circle = "O" of shock)
    addWithOutline(g, new THREE.SphereGeometry(0.12, 10, 10), inkMat, { y: -0.15, z: 0.35 });
    // Two wide eyes (white circles with dark pupils)
    const eyeWhite = toonMat(PALETTE.white);
    for (const sx of [-0.14, 0.14]) {
        addWithOutline(g, new THREE.SphereGeometry(0.09, 8, 8), eyeWhite, { x: sx, y: 0.08, z: 0.34 });
        addWithOutline(g, new THREE.SphereGeometry(0.045, 6, 6), inkMat, { x: sx, y: 0.08, z: 0.42 });
    }
    // Raised eyebrows (two short arcs above eyes)
    for (const sx of [-0.14, 0.14]) {
        addWithOutline(g, new THREE.TorusGeometry(0.06, 0.02, 4, 8, Math.PI), inkMat,
            { x: sx, y: 0.2, z: 0.36 });
    }
    return g;
}

// ─── L3: Plunger Protocol ─────────────────────────────────────────────────────
// Actual plunger — long wooden handle, fat red rubber cup at the bottom.
function buildL3() {
    const g = new THREE.Group();
    const woodMat = toonMat(PALETTE.wood);
    const rubberMat = toonMat(PALETTE.danger, { emissive: PALETTE.danger, emissiveIntensity: 0.15 });
    // Long wooden handle
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), woodMat, { y: 0.15 });
    // Fat red rubber cup at bottom (inverted dome)
    addWithOutline(g, new THREE.SphereGeometry(0.25, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        rubberMat, { y: -0.22 }, { x: Math.PI });
    // Rubber cup rim ring
    addWithOutline(g, new THREE.TorusGeometry(0.25, 0.03, 6, 14),
        rubberMat, { y: -0.22 }, { x: Math.PI / 2 });
    // Handle top knob (round)
    addWithOutline(g, new THREE.SphereGeometry(0.06, 8, 6), woodMat, { y: 0.53 });
    return g;
}

// ─── L4: Rush Hour Pileup ─────────────────────────────────────────────────────
// Angry/frustrated face 😤 — red-tinted, furrowed brows, gritted teeth. Road rage!
function buildL4() {
    const g = new THREE.Group();
    const faceMat = toonMat(PALETTE.danger, { emissive: PALETTE.danger, emissiveIntensity: 0.15 });
    const inkMat = toonMat(PALETTE.ink);
    const whiteMat = toonMat(PALETTE.white);
    // Round angry face
    addWithOutline(g, new THREE.SphereGeometry(0.42, 14, 12), faceMat);
    // Angry eyes (white, narrow, angled inward)
    for (const sx of [-1, 1]) {
        // Eye white (squished flat = angry squint)
        addWithOutline(g, new THREE.SphereGeometry(0.08, 8, 6), whiteMat,
            { x: sx * 0.14, y: 0.08, z: 0.34 }, null, { x: 1, y: 0.5, z: 1 });
        // Pupil
        addWithOutline(g, new THREE.SphereGeometry(0.045, 6, 6), inkMat,
            { x: sx * 0.14, y: 0.06, z: 0.4 });
        // Angry furrowed eyebrow (thick bar, angled down toward center)
        addWithOutline(g, new THREE.BoxGeometry(0.14, 0.04, 0.04), inkMat,
            { x: sx * 0.14, y: 0.18, z: 0.35 }, { z: sx * 0.35 });
    }
    // Gritted teeth (wide flat white bar with dark lines = teeth)
    addWithOutline(g, new THREE.BoxGeometry(0.22, 0.08, 0.04), whiteMat,
        { y: -0.15, z: 0.38 });
    // Teeth gap lines
    for (const x of [-0.06, 0, 0.06]) {
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.01), inkMat));
        g.children[g.children.length - 1].position.set(x, -0.15, 0.41);
    }
    return g;
}

// ─── L5: Domino Effect ────────────────────────────────────────────────────────
// 4 white dominoes at decreasing tilt (fallen to standing), ink dots, ground line.
function buildL5() {
    const g = new THREE.Group();
    const dominoMat = toonMat(PALETTE.white);
    const dotMat = toonMat(PALETTE.ink);
    const dominoGeo = new THREE.BoxGeometry(0.14, 0.6, 0.08);
    const tilts = [Math.PI / 2, Math.PI / 3, Math.PI / 6, 0];
    const dotCounts = [1, 2, 3, 4];
    for (let i = 0; i < 4; i++) {
        const x = -0.45 + i * 0.3;
        const tilt = tilts[i];
        const pivotY = -0.35 + 0.3 * Math.cos(tilt);
        const pivotX = x + 0.3 * Math.sin(tilt);
        addWithOutline(g, dominoGeo, dominoMat, { x: pivotX, y: pivotY }, { z: tilt });
        const count = dotCounts[i];
        const dotGeo = new THREE.SphereGeometry(0.03, 5, 5);
        for (let d = 0; d < count; d++) {
            const dy = (d - (count - 1) / 2) * 0.1;
            const worldY = pivotY + dy * Math.cos(tilt);
            const worldXOff = pivotX - dy * Math.sin(tilt);
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(worldXOff, worldY, 0.05);
            g.add(dot);
        }
    }
    addWithOutline(g, new THREE.BoxGeometry(1.2, 0.03, 0.3), toonMat(PALETTE.fixture), { y: -0.36 });
    return g;
}

// ─── L6: Spill Zone ──────────────────────────────────────────────────────────
// Spilled coffee cup ☕ tipped on its side with green puddle spreading. Unmistakable "spill."
function buildL6() {
    const g = new THREE.Group();
    // Tipped mug (cylinder on its side)
    const mugMat = toonMat(PALETTE.white);
    addWithOutline(g, new THREE.CylinderGeometry(0.15, 0.13, 0.25, 10), mugMat,
        { x: 0.1, y: 0.05 }, { z: Math.PI / 2.5 });
    // Mug handle (torus arc on the side)
    addWithOutline(g, new THREE.TorusGeometry(0.07, 0.025, 6, 10, Math.PI), mugMat,
        { x: 0.25, y: 0.12 }, { z: Math.PI / 2.5 + Math.PI / 2 });
    // Green puddle spreading from the mug opening
    addWithOutline(g, new THREE.CylinderGeometry(0.5, 0.55, 0.025, 16),
        toonMat(PALETTE.ubik, { transparent: true, opacity: 0.45 }), { y: -0.25 });
    // Liquid stream from mug to puddle
    addWithOutline(g, new THREE.CylinderGeometry(0.06, 0.12, 0.2, 8),
        toonMat(PALETTE.ubik, { transparent: true, opacity: 0.35 }),
        { x: -0.05, y: -0.12 }, { z: 0.3 });
    return g;
}

// ─── L7: Loose Change ────────────────────────────────────────────────────────
// 6 big gold coins scattered at various angles. Just coins.
function buildL7() {
    const g = new THREE.Group();
    const gold = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14);
    const coins = [
        { x: -0.25, y: -0.22, z: 0.12, rx: 1.4, rz: 0.3 },
        { x: 0.2, y: -0.2, z: -0.1, rx: 1.2, rz: 1.0 },
        { x: -0.05, y: -0.18, z: -0.15, rx: 1.5, rz: 2.0 },
        { x: 0.3, y: 0.0, z: 0.1, rx: 0.5, rz: 0.5 },
        { x: -0.3, y: 0.05, z: -0.05, rx: 0.1, rz: -0.3 },
        { x: 0.05, y: 0.15, z: 0.15, rx: 0.6, rz: 1.5 },
    ];
    for (const c of coins) {
        addWithOutline(g, coinGeo, gold, { x: c.x, y: c.y, z: c.z }, { x: c.rx, z: c.rz });
    }
    return g;
}

// ─── L8: Nuclear Mop ─────────────────────────────────────────────────────────
// Big mop glowing bright green + ☢️ radioactive symbol as a big disc on the handle.
function buildL8() {
    const g = new THREE.Group();
    const glowGreen = toonMat(PALETTE.success, { emissive: PALETTE.success, emissiveIntensity: 0.7 });
    // Handle
    addWithOutline(g, new THREE.CylinderGeometry(0.05, 0.05, 0.8, 10),
        toonMat(PALETTE.wood), { y: 0.1 });
    // Mop head — big, glowing bright green
    addWithOutline(g, new THREE.SphereGeometry(0.3, 12, 10), glowGreen,
        { y: -0.32 }, null, { x: 1.4, y: 0.65, z: 1.1 });
    // Big ☢️ radiation warning disc on handle (face-on, yellow + black)
    const discGrp = new THREE.Group();
    discGrp.rotation.x = Math.PI / 2;
    // Yellow disc background
    addWithOutline(discGrp, new THREE.CylinderGeometry(0.16, 0.16, 0.03, 12), matSign());
    // 3 black pie slices (the trefoil blades — simplified as 3 boxes radiating)
    const bladeMat = toonMat(PALETTE.ink);
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const bx = Math.cos(a) * 0.07, by = Math.sin(a) * 0.07;
        addWithOutline(discGrp, new THREE.BoxGeometry(0.06, 0.12, 0.035), bladeMat,
            { x: bx, y: by }, { z: a });
    }
    // Center dot
    addWithOutline(discGrp, new THREE.CylinderGeometry(0.03, 0.03, 0.035, 8), bladeMat);
    discGrp.position.set(0, 0.2, 0.06);
    g.add(discGrp);
    return g;
}

// ─── L9: Ubik Flood ──────────────────────────────────────────────────────────
// Big spray can at top, translucent spray cone below nozzle, wide green puddle.
function buildL9() {
    const g = new THREE.Group();
    const bodyR = 0.16, bodyH = 0.4;
    addWithOutline(g, new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 12), matUbik(), { y: 0.2 });
    addWithOutline(g, new THREE.SphereGeometry(bodyR, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), matUbik(), { y: 0.4 });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(bodyR + 0.003, bodyR + 0.003, 0.1, 12), toonMat(PALETTE.white)));
    g.children[g.children.length - 1].position.set(0, 0.2, 0);
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.05, 0.06, 6), toonMat(PALETTE.fixture), { y: -0.02 });
    const sprayCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.3, 10, 1, true),
        toonMat(PALETTE.ubik, {
            transparent: true, opacity: 0.25,
            emissive: PALETTE.ubik, emissiveIntensity: 0.3,
            side: THREE.DoubleSide,
        }));
    sprayCone.position.y = -0.2;
    g.add(sprayCone);
    addWithOutline(g, new THREE.CylinderGeometry(0.5, 0.55, 0.03, 16),
        toonMat(PALETTE.ubik, { transparent: true, opacity: 0.4 }), { y: -0.38 });
    return g;
}

// ─── L10: Golden Magnet ──────────────────────────────────────────────────────
// Full gold horseshoe magnet with red caps, coin between poles, emissive glow.
function buildL10() {
    const g = new THREE.Group();
    const goldMat = matGold();
    addWithOutline(g, new THREE.TorusGeometry(0.36, 0.09, 12, 20, Math.PI),
        goldMat, { y: 0.1 }, { x: -Math.PI / 2 });
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.25, 10);
    addWithOutline(g, poleGeo, goldMat, { x: -0.36, y: -0.02 });
    addWithOutline(g, poleGeo, goldMat, { x: 0.36, y: -0.02 });
    const capGeo = new THREE.CylinderGeometry(0.095, 0.095, 0.07, 10);
    const capMat = toonMat(PALETTE.danger);
    addWithOutline(g, capGeo, capMat, { x: -0.36, y: -0.17 });
    addWithOutline(g, capGeo, capMat, { x: 0.36, y: -0.17 });
    const coinGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 12);
    const coinGroup = new THREE.Group();
    coinGroup.rotation.x = Math.PI / 2;
    coinGroup.rotation.z = 0.3;
    addWithOutline(coinGroup, coinGeo, goldMat);
    coinGroup.position.set(0, -0.12, 0.06);
    g.add(coinGroup);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8),
        toonMat(PALETTE.glow, { transparent: true, opacity: 0.25, emissive: PALETTE.gold, emissiveIntensity: 0.9 }));
    glow.position.set(0, -0.08, 0);
    g.add(glow);
    return g;
}

// ─── L11: Bladder Burst ──────────────────────────────────────────────────────
// Big round bomb with a lit fuse — universal "about to explode" symbol.
function buildL11() {
    const g = new THREE.Group();

    // Big round bomb body (dark sphere)
    addWithOutline(g, new THREE.SphereGeometry(0.38, 14, 12),
        toonMat(PALETTE.charcoal, { emissive: PALETTE.ink, emissiveIntensity: 0.2 }), { y: -0.08 });

    // Highlight band (subtle rim to show spherical form)
    addWithOutline(g, new THREE.TorusGeometry(0.3, 0.02, 6, 16),
        toonMat(PALETTE.fixture), { y: -0.08 }, { x: Math.PI / 3 });

    // Fuse nozzle (short cylinder on top)
    addWithOutline(g, new THREE.CylinderGeometry(0.06, 0.08, 0.1, 8),
        toonMat(PALETTE.fixture), { y: 0.32 });

    // Fuse (curving cylinder going up and right)
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6),
        toonMat(PALETTE.wood), { x: 0.05, y: 0.42 }, { z: -0.4 });

    // Spark at fuse tip (gold glowing sphere)
    addWithOutline(g, new THREE.SphereGeometry(0.06, 8, 8),
        toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.9 }),
        { x: 0.12, y: 0.5 });
    // Smaller spark dots
    addWithOutline(g, new THREE.SphereGeometry(0.03, 5, 5),
        toonMat(PALETTE.danger, { emissive: PALETTE.danger, emissiveIntensity: 0.7 }),
        { x: 0.18, y: 0.52 });
    addWithOutline(g, new THREE.SphereGeometry(0.025, 5, 5),
        toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.8 }),
        { x: 0.08, y: 0.55 });

    return g;
}

// ─── L12: Overtime ───────────────────────────────────────────────────────────
// Alarm clock — round face, two bells on top, legs at bottom. Classic alarm clock shape.
function buildL12() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    const inkMat = toonMat(PALETTE.ink);
    // Round clock body
    addWithOutline(g, new THREE.SphereGeometry(0.35, 14, 12), metalMat);
    // Clock face (white disc on front)
    addWithOutline(g, new THREE.CylinderGeometry(0.28, 0.28, 0.02, 16), toonMat(PALETTE.white),
        { z: 0.25 }, { x: Math.PI / 2 });
    // Two bells on top
    addWithOutline(g, new THREE.SphereGeometry(0.1, 8, 6), matGold(), { x: -0.2, y: 0.38 });
    addWithOutline(g, new THREE.SphereGeometry(0.1, 8, 6), matGold(), { x: 0.2, y: 0.38 });
    // Hammer between bells
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), metalMat,
        { y: 0.42 }, { z: Math.PI / 2 });
    // Two legs at bottom
    addWithOutline(g, new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), metalMat,
        { x: -0.18, y: -0.4 }, { z: 0.2 });
    addWithOutline(g, new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), metalMat,
        { x: 0.18, y: -0.4 }, { z: -0.2 });
    // Clock hands
    const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.01), inkMat);
    hand1.position.set(0, 0.06, 0.3); hand1.rotation.z = -0.3; g.add(hand1);
    const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.01), inkMat);
    hand2.position.set(0, 0.04, 0.3); hand2.rotation.z = 0.8; g.add(hand2);
    return g;
}

// ─── L13: Minimalist ─────────────────────────────────────────────────────────
// Diamond gem 💎 — single precious octahedron in gold. "Less is more" = one precious thing.
function buildL13() {
    const g = new THREE.Group();
    addWithOutline(g, new THREE.OctahedronGeometry(0.42, 0),
        toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.4 }));
    return g;
}

// ─── L14: Hoarder ────────────────────────────────────────────────────────────
// Open treasure chest overflowing with gold coins.
function buildL14() {
    const g = new THREE.Group();
    const woodMat = toonMat(PALETTE.wood);
    const gold = matGold();
    addWithOutline(g, new THREE.BoxGeometry(0.65, 0.4, 0.45), woodMat, { y: -0.18 });
    addWithOutline(g, new THREE.BoxGeometry(0.68, 0.04, 0.48), toonMat(PALETTE.fixture), { y: 0.03 });
    addWithOutline(g, new THREE.BoxGeometry(0.65, 0.06, 0.45), woodMat, { y: 0.25, z: -0.2 }, { x: -0.7 });
    addWithOutline(g, new THREE.BoxGeometry(0.1, 0.06, 0.04), gold, { y: 0.15, z: -0.02 });
    const stack = coinStack(4, 0.1);
    stack.position.set(0, 0.05, 0);
    g.add(stack);
    const looseCoinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10);
    addWithOutline(g, looseCoinGeo, gold, { x: 0.38, y: -0.15, z: 0.18 }, { x: 0.9, z: 0.3 });
    addWithOutline(g, looseCoinGeo, gold, { x: -0.4, y: -0.25, z: 0.15 }, { x: 1.2, z: -0.5 });
    addWithOutline(g, looseCoinGeo, gold, { x: 0.25, y: -0.3, z: -0.18 }, { x: 0.4, z: 1.0 });
    return g;
}

// ─── L15: Chain Reaction ──────────────────────────────────────────────────────
// 3 interlocking chain links.
function buildL15() {
    const g = new THREE.Group();
    const linkMat = toonMat(PALETTE.fixture);
    const linkGeo = new THREE.TorusGeometry(0.18, 0.04, 8, 12);
    addWithOutline(g, linkGeo, linkMat, { x: -0.2 }, { x: Math.PI / 2 });
    addWithOutline(g, linkGeo, linkMat, null, { z: Math.PI / 2 });
    addWithOutline(g, linkGeo, linkMat, { x: 0.2 }, { x: Math.PI / 2 });
    return g;
}

// ─── L16: Loan Shark ─────────────────────────────────────────────────────────
// Shark fin (ExtrudeGeometry) cutting through scattered gold coins — dark menacing
function buildL16() {
    const g = new THREE.Group();

    // Shark fin — big triangular extrusion with curved base
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0.55);
    finShape.bezierCurveTo(0.08, 0.35, 0.12, 0.1, 0.18, -0.35);
    finShape.bezierCurveTo(0.1, -0.4, -0.15, -0.4, -0.22, -0.35);
    finShape.bezierCurveTo(-0.08, -0.1, -0.04, 0.3, 0, 0.55);

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
        depth: 0.08, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2,
    });
    finGeo.center();
    const finMat = toonMat(PALETTE.charcoal, { emissive: PALETTE.ink, emissiveIntensity: 0.35 });
    addWithOutline(g, finGeo, finMat, { y: 0.1 });

    // Scattered gold coins around the base
    const gold = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12);
    const coinPositions = [
        [-0.4, -0.32, 0.15, 0.2], [0.35, -0.34, -0.1, 0.8],
        [-0.15, -0.35, -0.2, 1.5], [0.5, -0.3, 0.1, 0.4],
        [0.1, -0.33, 0.25, 1.1], [-0.45, -0.36, -0.05, 2.0],
    ];
    for (const [x, y, z, rz] of coinPositions) {
        addWithOutline(g, coinGeo, gold, { x, y, z }, { x: Math.PI / 2 + (Math.random() - 0.5) * 0.3, z: rz });
    }

    // Dark shadow/water ring at base
    const shadowGeo = new THREE.TorusGeometry(0.45, 0.025, 6, 18);
    const shadowMat = toonMat(PALETTE.ink, { transparent: true, opacity: 0.35 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = Math.PI / 2;
    shadow.position.y = -0.32;
    g.add(shadow);

    return g;
}

// ─── L17: Assembly Line ──────────────────────────────────────────────────────
// Conveyor belt with 3 small boxes on it. Flat belt + roller cylinders at ends.
function buildL17() {
    const g = new THREE.Group();
    const beltMat = toonMat(PALETTE.charcoal);
    const metalMat = toonMat(PALETTE.fixture);
    // Flat belt
    addWithOutline(g, new THREE.BoxGeometry(1.2, 0.04, 0.4), beltMat, { y: -0.25 });
    // Roller cylinders at ends
    addWithOutline(g, new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10), metalMat,
        { x: -0.6, y: -0.25 }, { x: Math.PI / 2 });
    addWithOutline(g, new THREE.CylinderGeometry(0.07, 0.07, 0.45, 10), metalMat,
        { x: 0.6, y: -0.25 }, { x: Math.PI / 2 });
    // 3 cardboard boxes on belt
    const boxMat = toonMat(PALETTE.wood);
    for (const bx of [-0.35, 0, 0.35]) {
        addWithOutline(g, new THREE.BoxGeometry(0.22, 0.2, 0.2), boxMat, { x: bx, y: -0.12 });
    }
    g.scale.setScalar(0.8);
    return g;
}

// ─── L18: Last Stand ─────────────────────────────────────────────────────────
// Sword planted in the ground — a "last stand" monument. Blade up, hilt visible.
function buildL18() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    // Blade (long tapered box)
    addWithOutline(g, new THREE.BoxGeometry(0.06, 0.7, 0.02), metalMat, { y: 0.15 });
    // Blade tip (cone)
    addWithOutline(g, new THREE.ConeGeometry(0.03, 0.15, 4), metalMat, { y: 0.55 });
    // Crossguard (horizontal bar)
    addWithOutline(g, new THREE.BoxGeometry(0.35, 0.06, 0.06), matGold(), { y: -0.2 });
    // Grip (wrapped handle)
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), toonMat(PALETTE.wood), { y: -0.32 });
    // Pommel (sphere at bottom)
    addWithOutline(g, new THREE.SphereGeometry(0.05, 8, 6), matGold(), { y: -0.43 });
    // Ground line / crack
    addWithOutline(g, new THREE.BoxGeometry(0.5, 0.03, 0.3), toonMat(PALETTE.charcoal), { y: -0.48 });
    // Gold emissive glow behind blade (heroic)
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10),
        toonMat(PALETTE.glow, { transparent: true, opacity: 0.15, emissive: PALETTE.gold, emissiveIntensity: 0.8 }));
    glow.position.z = -0.06;
    g.add(glow);
    const crackMat = toonMat(PALETTE.ink);
    addWithOutline(g, new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4),
        crackMat, { x: 0.05, y: 0.0, z: 0.08 }, { z: 0.3 });
    addWithOutline(g, new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4),
        crackMat, { x: -0.08, y: -0.1, z: 0.08 }, { z: -0.5 });
    return g;
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export const LEGENDARY_ICON_BUILDERS = {
    L1:  buildL1,
    L2:  buildL2,
    L3:  buildL3,
    L4:  buildL4,
    L5:  buildL5,
    L6:  buildL6,
    L7:  buildL7,
    L8:  buildL8,
    L9:  buildL9,
    L10: buildL10,
    L11: buildL11,
    L12: buildL12,
    L13: buildL13,
    L14: buildL14,
    L15: buildL15,
    L16: buildL16,
    L17: buildL17,
    L18: buildL18,
};

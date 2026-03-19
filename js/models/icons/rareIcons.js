// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Rare Tier Upgrade Icons (R1–R35)                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../../data/palette.js';
import { toonMat, matGold, matDanger, matSign, matMop, matUbik, matPotplant } from '../../shaders/toonMaterials.js';
import { ol, addWithOutline, shieldShape, shockwaveRings, crosshair, circularArrows, clockFace, heartShape, explosionBurst, skullShape, coinStack, hourglass, timelineArrow, lightningBolt, dottedOutlineTower } from './iconPrimitives.js';

// ─── R1: Wet & Soapy ──────────────────────────────────────────────────────────
function buildR1() {
    const g = new THREE.Group();
    const signMat = matSign();
    const panelGeo = new THREE.BoxGeometry(0.45, 0.55, 0.04);
    addWithOutline(g, panelGeo, signMat, { x: -0.14, y: 0 }, { z: 0.2 });
    addWithOutline(g, panelGeo, signMat, { x: 0.14, y: 0 }, { z: -0.2 });
    const ridgeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 6);
    addWithOutline(g, ridgeGeo, toonMat(PALETTE.ink), { y: 0.25 }, { x: Math.PI / 2 });
    const footGeo = new THREE.BoxGeometry(0.1, 0.03, 0.06);
    addWithOutline(g, footGeo, toonMat(PALETTE.ink), { x: -0.3, y: -0.28 });
    addWithOutline(g, footGeo, toonMat(PALETTE.ink), { x: 0.3, y: -0.28 });
    const bubbleMat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.4 });
    addWithOutline(g, new THREE.SphereGeometry(0.08, 8, 6), bubbleMat, { x: -0.05, y: 0.1, z: 0.06 });
    addWithOutline(g, new THREE.SphereGeometry(0.07, 8, 6), bubbleMat, { x: 0.1, y: -0.05, z: 0.06 });
    addWithOutline(g, new THREE.SphereGeometry(0.06, 8, 6), bubbleMat, { x: -0.1, y: -0.15, z: 0.06 });
    return g;
}

// ─── R2: Mop Splash ───────────────────────────────────────────────────────────
function buildR2() {
    const g = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.15 }, { z: 0.35 });
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const head = addWithOutline(g, headGeo, matMop(), { x: -0.15, y: -0.18 }, null, { x: 1.3, y: 0.5, z: 1.0 });
    const dropMat = toonMat(PALETTE.dancer);
    const dropGeo = new THREE.SphereGeometry(0.05, 6, 6);
    addWithOutline(g, dropGeo, dropMat, { x: -0.25, y: -0.38, z: 0.05 });
    addWithOutline(g, dropGeo, dropMat, { x: -0.08, y: -0.42, z: -0.04 });
    addWithOutline(g, dropGeo, dropMat, { x: 0.05, y: -0.36, z: 0.08 });
    return g;
}

// ─── R3: Magnetic Mops ────────────────────────────────────────────────────────
function buildR3() {
    const g = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.05 });
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    addWithOutline(g, headGeo, matMop(), { y: -0.38 }, null, { x: 1.3, y: 0.5, z: 1.0 });
    const arcGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 12, Math.PI);
    addWithOutline(g, arcGeo, matDanger(), { y: 0.1 }, { z: -Math.PI / 2 });
    const tipGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
    addWithOutline(g, tipGeo, toonMat(PALETTE.fixture), { y: 0.25 });
    addWithOutline(g, tipGeo, toonMat(PALETTE.fixture), { y: -0.05 });
    return g;
}

// ─── R4: Ubik Slick ───────────────────────────────────────────────────────────
// Banana peel 🍌 — universal "slippery" symbol. Everyone knows this.
function buildR4() {
    const g = new THREE.Group();
    const yellowMat = matSign();
    const whiteMat = toonMat(PALETTE.cream);
    // Banana body (curved cylinder)
    addWithOutline(g, new THREE.TorusGeometry(0.35, 0.08, 8, 12, Math.PI * 0.6),
        yellowMat, { y: -0.1 }, { z: -0.3 });
    // Peel flaps (3 flaps splayed out like a peeled banana)
    const flapGeo = new THREE.BoxGeometry(0.1, 0.25, 0.03);
    addWithOutline(g, flapGeo, yellowMat, { x: -0.2, y: 0.15 }, { z: 0.5 });
    addWithOutline(g, flapGeo, yellowMat, { x: 0.2, y: 0.15 }, { z: -0.5 });
    addWithOutline(g, flapGeo, yellowMat, { z: 0.12, y: 0.18 }, { x: -0.4 });
    // White inner of banana (visible on flap insides)
    addWithOutline(g, new THREE.SphereGeometry(0.1, 8, 6), whiteMat, { y: 0.05 });
    return g;
}

// ─── R5: Coin Shrapnel ────────────────────────────────────────────────────────
function buildR5() {
    const g = new THREE.Group();
    const goldMat = matGold();
    const coinGroup = new THREE.Group();
    coinGroup.rotation.x = Math.PI / 2;
    addWithOutline(coinGroup, new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), goldMat);
    g.add(coinGroup);
    const crackGeo = new THREE.BoxGeometry(0.03, 0.55, 0.03);
    addWithOutline(g, crackGeo, toonMat(PALETTE.ink), { z: 0.05 }, { z: 0.15 });
    const shardGeo = new THREE.ConeGeometry(0.05, 0.14, 3);
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const dist = 0.5;
        addWithOutline(g, shardGeo, goldMat,
            { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, z: 0 },
            { z: angle - Math.PI / 2 });
    }
    return g;
}

// ─── R6: Sign Fortress ────────────────────────────────────────────────────────
function buildR6() {
    const g = new THREE.Group();
    const shield = shieldShape(0.75, 0.95);
    g.add(shield);
    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0.12);
    triShape.lineTo(-0.12, -0.08);
    triShape.lineTo(0.12, -0.08);
    triShape.closePath();
    const triGeo = new THREE.ExtrudeGeometry(triShape, {
        depth: 0.04, bevelEnabled: true,
        bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1,
    });
    triGeo.center();
    addWithOutline(g, triGeo, matSign(), { z: 0.08 });
    return g;
}

// ─── R7: Mop & Bucket ─────────────────────────────────────────────────────────
function buildR7() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    const bucketGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.35, 10);
    addWithOutline(g, bucketGeo, metalMat, { y: -0.15 });
    const rimGeo = new THREE.TorusGeometry(0.22, 0.025, 6, 14);
    const rim = new THREE.Mesh(rimGeo, metalMat);
    rim.position.y = 0.025;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { x: 0.1, y: 0.3 }, { z: -0.3 });
    const overGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const overMat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.5 });
    const over = new THREE.Mesh(overGeo, overMat);
    over.position.set(0.18, 0.02, 0.08);
    g.add(over);
    return g;
}

// ─── R8: Pot Magnet ───────────────────────────────────────────────────────────
function buildR8() {
    const g = new THREE.Group();
    const potGeo = new THREE.CylinderGeometry(0.25, 0.16, 0.3, 8);
    addWithOutline(g, potGeo, matPotplant(), { y: -0.15 });
    const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.05, 8);
    addWithOutline(g, rimGeo, matPotplant(), { y: 0.02 });
    addWithOutline(g, new THREE.SphereGeometry(0.18, 8, 6), toonMat(PALETTE.success), { y: 0.2 });
    const arcGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 12, Math.PI);
    addWithOutline(g, arcGeo, matDanger(), { y: 0.3 }, { z: Math.PI });
    const tipGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
    addWithOutline(g, tipGeo, toonMat(PALETTE.fixture), { x: -0.15, y: 0.3 });
    addWithOutline(g, tipGeo, toonMat(PALETTE.fixture), { x: 0.15, y: 0.3 });
    return g;
}

// ─── R9: Sticky Mop ──────────────────────────────────────────────────────────
function buildR9() {
    const g = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.1 });
    addWithOutline(g, new THREE.SphereGeometry(0.2, 8, 6), matMop(), { y: -0.32 }, null, { x: 1.3, y: 0.5, z: 1.0 });
    const dripMat = toonMat(PALETTE.ubik);
    const dripGeo = new THREE.SphereGeometry(0.05, 6, 6);
    addWithOutline(g, dripGeo, dripMat, { x: -0.1, y: -0.45, z: 0.04 });
    addWithOutline(g, dripGeo, dripMat, { x: 0.05, y: -0.5, z: -0.03 });
    addWithOutline(g, dripGeo, dripMat, { x: 0.15, y: -0.43, z: 0.06 });
    return g;
}

// ─── R10: Chain Trip ──────────────────────────────────────────────────────────
// Pot with chain links 🔗 dangling from it — "chain" + "trip" (pot trips enemies).
function buildR10() {
    const g = new THREE.Group();
    // Pot
    addWithOutline(g, new THREE.CylinderGeometry(0.25, 0.16, 0.3, 8), matPotplant(), { y: 0.1 });
    addWithOutline(g, new THREE.CylinderGeometry(0.27, 0.27, 0.05, 8), matPotplant(), { y: 0.27 });
    addWithOutline(g, new THREE.SphereGeometry(0.18, 8, 6), toonMat(PALETTE.success), { y: 0.45 });
    // 2 chain links below pot
    const linkMat = toonMat(PALETTE.fixture);
    const linkGeo = new THREE.TorusGeometry(0.12, 0.03, 6, 10);
    addWithOutline(g, linkGeo, linkMat, { y: -0.15 }, { x: Math.PI / 2 });
    addWithOutline(g, linkGeo, linkMat, { y: -0.35 }, { z: Math.PI / 2 });
    return g;
}

// ─── R11: Spray & Pray ────────────────────────────────────────────────────────
function buildR11() {
    const g = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.48, 10);
    addWithOutline(g, bodyGeo, matUbik(), { x: -0.2, y: -0.05 });
    const topGeo = new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeo, matUbik());
    top.position.set(-0.2, 0.19, 0);
    g.add(top);
    const nozzleGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.08, 6);
    addWithOutline(g, nozzleGeo, toonMat(PALETTE.fixture), { x: -0.12, y: 0.22 });
    const coneGeo = new THREE.ConeGeometry(0.4, 0.4, 8, 1, true);
    const cone = new THREE.Mesh(coneGeo, toonMat(PALETTE.ubik, { transparent: true, opacity: 0.2, side: THREE.DoubleSide }));
    cone.position.set(0.2, 0, 0);
    cone.rotation.z = -Math.PI / 2;
    g.add(cone);
    const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10);
    const goldMat = matGold();
    for (const [x, y, z] of [[0.12, 0.12, 0.06], [0.28, -0.08, -0.04], [0.18, -0.15, 0.08]]) {
        const cg = new THREE.Group();
        cg.rotation.x = Math.PI / 2;
        addWithOutline(cg, coinGeo, goldMat);
        cg.position.set(x, y, z);
        g.add(cg);
    }
    return g;
}

// ─── R12: Payday ──────────────────────────────────────────────────────────────
// Bag of money — a sack with a $ sign on it. Classic "payday" image.
function buildR12() {
    const g = new THREE.Group();
    const bagMat = toonMat(PALETTE.wood);
    // Sack body (sphere, slightly squished)
    addWithOutline(g, new THREE.SphereGeometry(0.35, 12, 10), bagMat,
        { y: -0.1 }, null, { x: 1.0, y: 0.9, z: 0.85 });
    // Sack neck/tie (pinched top)
    addWithOutline(g, new THREE.CylinderGeometry(0.08, 0.15, 0.15, 8), bagMat, { y: 0.22 });
    // Tie string (torus)
    addWithOutline(g, new THREE.TorusGeometry(0.09, 0.02, 6, 10), toonMat(PALETTE.ink),
        { y: 0.18 }, { x: Math.PI / 2 });
    // $ sign on front (vertical bar + 2 arcs)
    const dollarMat = matGold();
    addWithOutline(g, new THREE.CylinderGeometry(0.018, 0.018, 0.25, 6), dollarMat,
        { y: -0.08, z: 0.32 });
    addWithOutline(g, new THREE.TorusGeometry(0.06, 0.018, 6, 8, Math.PI), dollarMat,
        { y: -0.02, z: 0.33 }, { z: Math.PI / 2 });
    addWithOutline(g, new THREE.TorusGeometry(0.06, 0.018, 6, 8, Math.PI), dollarMat,
        { y: -0.14, z: 0.33 }, { z: -Math.PI / 2 });
    return g;
}

// ─── R13: The Tip Jar ─────────────────────────────────────────────────────────
// Big cylindrical glass jar (translucent) overflowing with thick gold coins, jar rim at top
function buildR13() {
    const g = new THREE.Group();
    const goldMat = matGold();

    // Big translucent jar body
    const jarGeo = new THREE.CylinderGeometry(0.38, 0.34, 0.8, 14);
    const jarMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.3 });
    const jar = new THREE.Mesh(jarGeo, jarMat);
    jar.position.y = -0.05;
    g.add(jar);

    // Jar rim (thick torus at top)
    const rimGeo = new THREE.TorusGeometry(0.38, 0.04, 8, 16);
    const rimMat = toonMat(PALETTE.fixture);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = 0.35;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    // Jar bottom rim
    const botRimGeo = new THREE.TorusGeometry(0.34, 0.03, 8, 16);
    const botRim = new THREE.Mesh(botRimGeo, rimMat);
    botRim.position.y = -0.45;
    botRim.rotation.x = Math.PI / 2;
    g.add(botRim);

    // Stack of thick coins inside the jar (inline)
    const coinGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12);
    const coinRimGeo = new THREE.TorusGeometry(0.15, 0.02, 6, 12);
    for (let i = 0; i < 5; i++) {
        const yy = -0.35 + i * 0.1;
        const xOff = (i % 2 === 0) ? 0.02 : -0.03;
        addWithOutline(g, coinGeo, goldMat, { x: xOff, y: yy, z: 0 });
        const cRim = new THREE.Mesh(coinRimGeo, goldMat);
        cRim.position.set(xOff, yy + 0.03, 0);
        cRim.rotation.x = Math.PI / 2;
        g.add(cRim);
    }

    // Overflowing coins spilling over the top
    for (const [x, y, rz] of [[0.25, 0.32, 0.6], [-0.2, 0.38, -0.5], [0.05, 0.42, 0.2]]) {
        const inner = new THREE.Group();
        inner.rotation.x = Math.PI / 2;
        addWithOutline(inner, coinGeo, goldMat);
        inner.position.set(x, y, 0.05);
        inner.rotation.z = rz;
        g.add(inner);
    }

    return g;
}

// ─── R14: Clearance Sale ──────────────────────────────────────────────────────
function buildR14() {
    const g = new THREE.Group();
    const tagGeo = new THREE.BoxGeometry(0.5, 0.65, 0.05);
    addWithOutline(g, tagGeo, toonMat(PALETTE.cream));
    const holeGeo = new THREE.TorusGeometry(0.035, 0.012, 6, 8);
    const hole = new THREE.Mesh(holeGeo, toonMat(PALETTE.ink));
    hole.position.set(0, 0.28, 0.03);
    g.add(hole);
    const stringGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 4);
    const string = new THREE.Mesh(stringGeo, toonMat(PALETTE.ink));
    string.position.set(0, 0.38, 0.03);
    g.add(string);
    const slashGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6);
    addWithOutline(g, slashGeo, matDanger(), { z: 0.04 }, { z: Math.PI / 4 });
    return g;
}

// ─── R15: Insurance Policy ────────────────────────────────────────────────────
function buildR15() {
    const g = new THREE.Group();
    const shield = shieldShape(0.8, 1.0);
    g.add(shield);
    const goldMat = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 14);
    const coinRimGeo = new THREE.TorusGeometry(0.14, 0.02, 6, 12);
    const coinGrp = new THREE.Group();
    coinGrp.rotation.x = Math.PI / 2;
    addWithOutline(coinGrp, coinGeo, goldMat);
    const cRim = new THREE.Mesh(coinRimGeo, goldMat);
    cRim.position.y = 0.03;
    coinGrp.add(cRim);
    coinGrp.position.set(0, -0.05, 0.08);
    g.add(coinGrp);
    return g;
}

// ─── R16: Crossfire ───────────────────────────────────────────────────────────
// Two crossed swords ⚔️ — universal "combat/crossfire" symbol.
function buildR16() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    const goldMat = matGold();
    // Sword 1 (tilted right)
    addWithOutline(g, new THREE.BoxGeometry(0.05, 0.7, 0.02), metalMat, { x: -0.05 }, { z: 0.4 });
    addWithOutline(g, new THREE.ConeGeometry(0.025, 0.12, 4), metalMat,
        { x: -0.05 - 0.35 * Math.sin(0.4), y: 0.35 * Math.cos(0.4) }, { z: 0.4 });
    addWithOutline(g, new THREE.BoxGeometry(0.22, 0.04, 0.05), goldMat,
        { x: -0.05 + 0.15 * Math.sin(0.4), y: -0.15 * Math.cos(0.4) }, { z: 0.4 });
    // Sword 2 (tilted left)
    addWithOutline(g, new THREE.BoxGeometry(0.05, 0.7, 0.02), metalMat, { x: 0.05 }, { z: -0.4 });
    addWithOutline(g, new THREE.ConeGeometry(0.025, 0.12, 4), metalMat,
        { x: 0.05 + 0.35 * Math.sin(0.4), y: 0.35 * Math.cos(0.4) }, { z: -0.4 });
    addWithOutline(g, new THREE.BoxGeometry(0.22, 0.04, 0.05), goldMat,
        { x: 0.05 - 0.15 * Math.sin(0.4), y: -0.15 * Math.cos(0.4) }, { z: -0.4 });
    return g;
}

// ─── R17: Marked for Death ────────────────────────────────────────────────────
function buildR17() {
    const g = new THREE.Group();
    const ch = crosshair(0.55);
    g.add(ch);
    return g;
}

// ─── R18: Crowd Surfing ──────────────────────────────────────────────────────
// Surfboard — elongated rounded board shape. "Crowd SURFING" = surfboard.
function buildR18() {
    const g = new THREE.Group();
    // Surfboard body (long flat box with rounded ends via scale)
    addWithOutline(g, new THREE.CylinderGeometry(0.15, 0.12, 0.9, 10),
        toonMat(PALETTE.dancer), null, null, { x: 1, y: 1, z: 0.25 });
    // Stripe on board
    addWithOutline(g, new THREE.CylinderGeometry(0.08, 0.06, 0.5, 8),
        toonMat(PALETTE.white), null, null, { x: 1, y: 1, z: 0.1 });
    // Fin underneath (small triangle)
    addWithOutline(g, new THREE.ConeGeometry(0.06, 0.15, 4),
        toonMat(PALETTE.fixture), { y: -0.25, z: -0.08 }, { x: Math.PI / 6 });
    return g;
}

// ─── R19: Overkill Bonus ──────────────────────────────────────────────────────
// Skull with dollar sign — "overkill" (skull) + "bonus" ($). Two clear symbols.
function buildR19() {
    const g = new THREE.Group();
    // Skull
    const bone = toonMat(PALETTE.white);
    const ink = toonMat(PALETTE.ink);
    addWithOutline(g, new THREE.SphereGeometry(0.28, 10, 8), bone, { x: -0.12, y: 0.05 });
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), bone);
    jaw.position.set(-0.12, -0.13, 0.04); jaw.scale.set(1.1, 0.6, 0.8); g.add(jaw);
    addWithOutline(g, new THREE.SphereGeometry(0.06, 6, 6), ink, { x: -0.2, y: 0.08, z: 0.22 });
    addWithOutline(g, new THREE.SphereGeometry(0.06, 6, 6), ink, { x: -0.04, y: 0.08, z: 0.22 });
    // Gold $ sign next to skull
    const dollarMat = matGold();
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), dollarMat,
        { x: 0.32, y: 0 });
    addWithOutline(g, new THREE.TorusGeometry(0.07, 0.02, 6, 8, Math.PI), dollarMat,
        { x: 0.32, y: 0.06 }, { z: Math.PI / 2 });
    addWithOutline(g, new THREE.TorusGeometry(0.07, 0.02, 6, 8, Math.PI), dollarMat,
        { x: 0.32, y: -0.06 }, { z: -Math.PI / 2 });
    return g;
}

// ─── R20: Aftershock ──────────────────────────────────────────────────────────
function buildR20() {
    const g = new THREE.Group();
    // Pot
    addWithOutline(g, new THREE.CylinderGeometry(0.28, 0.18, 0.35, 10), matPotplant(), { y: 0.05 });
    addWithOutline(g, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), matPotplant(), { y: 0.25 });
    addWithOutline(g, new THREE.SphereGeometry(0.2, 8, 6), toonMat(PALETTE.success), { y: 0.45 });
    // Cracked ground lines radiating from base (zigzag, like earthquake cracks)
    const crackMat = toonMat(PALETTE.ink);
    const crackGeo = new THREE.BoxGeometry(0.03, 0.02, 0.35);
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        addWithOutline(g, crackGeo, crackMat,
            { x: Math.cos(angle) * 0.25, y: -0.22, z: Math.sin(angle) * 0.25 },
            { y: angle });
    }
    return g;
}

// ─── R21: Specialist ──────────────────────────────────────────────────────────
// Medal — gold disc with a ribbon. "Specialist" = excellence = medal.
function buildR21() {
    const g = new THREE.Group();
    const gold = matGold();
    // Ribbon (two strips in a V)
    const ribbonMat = toonMat(PALETTE.danger);
    addWithOutline(g, new THREE.BoxGeometry(0.12, 0.3, 0.03), ribbonMat,
        { x: -0.08, y: 0.35 }, { z: 0.15 });
    addWithOutline(g, new THREE.BoxGeometry(0.12, 0.3, 0.03), ribbonMat,
        { x: 0.08, y: 0.35 }, { z: -0.15 });
    // Gold medal disc (face-on via rotated group)
    const medalGrp = new THREE.Group();
    medalGrp.rotation.x = Math.PI / 2;
    addWithOutline(medalGrp, new THREE.CylinderGeometry(0.28, 0.28, 0.06, 18), gold);
    // Rim ring
    medalGrp.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 16), gold));
    medalGrp.position.set(0, -0.05, 0.02);
    g.add(medalGrp);
    // Star on medal face
    const starS = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 0.12 : 0.05;
        if (i === 0) starS.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else starS.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starS.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starS, { depth: 0.02, bevelEnabled: false });
    starGeo.center();
    addWithOutline(g, starGeo, toonMat(PALETTE.glow, { emissive: PALETTE.gold, emissiveIntensity: 0.5 }),
        { y: -0.05, z: 0.06 });
    return g;
}

// ─── R22: Recycler ────────────────────────────────────────────────────────────
// Recycle symbol — 3 curved arrows in a triangle, facing the camera. Green.
function buildR22() {
    const g = new THREE.Group();
    const greenMat = toonMat(PALETTE.success);
    const R = 0.35;
    // 3 curved arrow segments forming the recycle triangle
    for (let i = 0; i < 3; i++) {
        const baseAngle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        // Arc segment
        const arcGeo = new THREE.TorusGeometry(R, 0.04, 6, 10, Math.PI * 0.55);
        addWithOutline(g, arcGeo, greenMat, null, { z: baseAngle });
        // Arrow tip at the end of each arc
        const tipAngle = baseAngle + Math.PI * 0.55;
        const tipGeo = new THREE.ConeGeometry(0.08, 0.14, 5);
        const tipX = Math.cos(tipAngle) * R;
        const tipY = Math.sin(tipAngle) * R;
        addWithOutline(g, tipGeo, greenMat, { x: tipX, y: tipY },
            { z: tipAngle - Math.PI / 2 });
    }
    return g;
}

// ─── R23: Devotion ────────────────────────────────────────────────────────────
// Big red extruded heart shape — bold and unmistakable
function buildR23() {
    const g = new THREE.Group();

    // Big extruded heart filling the frame
    const heart = heartShape();
    heart.scale.setScalar(1.4);
    g.add(heart);

    // Soft emissive glow behind the heart
    const glowGeo = new THREE.SphereGeometry(0.35, 10, 10);
    const glowMat = toonMat(PALETTE.danger, {
        transparent: true, opacity: 0.12,
        emissive: PALETTE.danger, emissiveIntensity: 0.5,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.08;
    g.add(glow);

    return g;
}

// ─── R24: Skeleton Crew ───────────────────────────────────────────────────────
function buildR24() {
    const g = new THREE.Group();
    const boneMat = toonMat(PALETTE.white);
    const inkMat = toonMat(PALETTE.ink);
    // Cranium (1.3x scale of skullShape)
    addWithOutline(g, new THREE.SphereGeometry(0.325, 10, 8), boneMat, { y: 0.1 });
    // Jaw
    const jaw = addWithOutline(g, new THREE.SphereGeometry(0.208, 8, 6), boneMat, { y: -0.16, z: 0.065 });
    jaw.scale.set(1.1, 0.6, 0.8);
    // Eye sockets
    const eyeGeo = new THREE.SphereGeometry(0.091, 6, 6);
    for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, inkMat);
        eye.position.set(sx * 0.13, 0.1, 0.26);
        g.add(eye);
    }
    // Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 4, 4), inkMat);
    nose.position.set(0, -0.03, 0.29);
    g.add(nose);
    return g;
}

// ─── R25: Compound Interest ───────────────────────────────────────────────────
// Piggy bank — round pink body, snout, ears, coin slot on top. Classic "savings."
function buildR25() {
    const g = new THREE.Group();
    const pinkMat = toonMat(PALETTE.girls);
    const inkMat = toonMat(PALETTE.ink);
    // Round body
    addWithOutline(g, new THREE.SphereGeometry(0.35, 12, 10), pinkMat,
        null, null, { x: 1.1, y: 0.9, z: 0.85 });
    // Snout (cylinder, front)
    addWithOutline(g, new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), pinkMat,
        { z: 0.32, y: -0.04 }, { x: Math.PI / 2 });
    // Nostrils (2 dark dots on snout)
    addWithOutline(g, new THREE.SphereGeometry(0.025, 5, 5), inkMat, { x: -0.04, y: -0.04, z: 0.38 });
    addWithOutline(g, new THREE.SphereGeometry(0.025, 5, 5), inkMat, { x: 0.04, y: -0.04, z: 0.38 });
    // Eyes
    addWithOutline(g, new THREE.SphereGeometry(0.035, 6, 6), inkMat, { x: -0.12, y: 0.1, z: 0.28 });
    addWithOutline(g, new THREE.SphereGeometry(0.035, 6, 6), inkMat, { x: 0.12, y: 0.1, z: 0.28 });
    // Ears (two small cones on top)
    addWithOutline(g, new THREE.ConeGeometry(0.07, 0.12, 5), pinkMat, { x: -0.15, y: 0.32 }, { z: 0.2 });
    addWithOutline(g, new THREE.ConeGeometry(0.07, 0.12, 5), pinkMat, { x: 0.15, y: 0.32 }, { z: -0.2 });
    // Coin slot on top (dark rectangle)
    addWithOutline(g, new THREE.BoxGeometry(0.15, 0.02, 0.04), inkMat, { y: 0.33 });
    // 4 stubby legs
    for (const [x, z] of [[-0.18, 0.12], [0.18, 0.12], [-0.18, -0.12], [0.18, -0.12]]) {
        addWithOutline(g, new THREE.CylinderGeometry(0.05, 0.06, 0.1, 6), pinkMat, { x, y: -0.35, z });
    }
    return g;
}

// ─── R26: Controlled Demolition ───────────────────────────────────────────────
function buildR26() {
    const g = new THREE.Group();
    const tntMat = matDanger();
    const stickGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8);
    const stickPos = [{ x: -0.06, z: -0.035 }, { x: 0.06, z: -0.035 }, { x: 0, z: 0.035 }];
    for (const sp of stickPos) {
        addWithOutline(g, stickGeo, tntMat, { x: sp.x, y: 0, z: sp.z });
    }
    const capGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.03, 8);
    const capMat = toonMat(PALETTE.charcoal);
    for (const sp of stickPos) {
        addWithOutline(g, capGeo, capMat, { x: sp.x, y: 0.21, z: sp.z });
        addWithOutline(g, capGeo, capMat, { x: sp.x, y: -0.21, z: sp.z });
    }
    const fuseGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.15, 6);
    addWithOutline(g, fuseGeo, toonMat(PALETTE.wood), { x: 0, y: 0.35, z: 0.035 }, { z: 0.3 });
    const sparkMat = toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.8 });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), sparkMat);
    spark.position.set(0.03, 0.42, 0.035);
    g.add(spark);
    return g;
}

// ─── R27: Double Shift ────────────────────────────────────────────────────────
// Two overlapping clock faces — "double" = two clocks. Unmistakable.
function buildR27() {
    const g = new THREE.Group();
    const whiteMat = toonMat(PALETTE.white);
    const metalMat = toonMat(PALETTE.fixture);
    const inkMat = toonMat(PALETTE.ink);
    const R = 0.3;
    // Back clock (offset left and up)
    const back = new THREE.Group();
    back.rotation.x = Math.PI / 2;
    addWithOutline(back, new THREE.CylinderGeometry(R, R, 0.04, 16), whiteMat);
    addWithOutline(back, new THREE.TorusGeometry(R, 0.025, 6, 16), metalMat);
    const bHand = new THREE.Mesh(new THREE.BoxGeometry(0.025, R * 0.6, 0.015), inkMat);
    bHand.position.set(0, R * 0.22, 0.025); bHand.rotation.z = 0.5; back.add(bHand);
    const bHand2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, R * 0.4, 0.015), inkMat);
    bHand2.position.set(0, R * 0.15, 0.025); bHand2.rotation.z = -0.8; back.add(bHand2);
    back.position.set(-0.12, 0.1, -0.04);
    g.add(back);
    // Front clock (offset right and down, slightly larger)
    const front = new THREE.Group();
    front.rotation.x = Math.PI / 2;
    addWithOutline(front, new THREE.CylinderGeometry(R, R, 0.04, 16), whiteMat);
    addWithOutline(front, new THREE.TorusGeometry(R, 0.025, 6, 16), metalMat);
    const fHand = new THREE.Mesh(new THREE.BoxGeometry(0.025, R * 0.6, 0.015), inkMat);
    fHand.position.set(0, R * 0.22, 0.025); fHand.rotation.z = -0.3; front.add(fHand);
    const fHand2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, R * 0.4, 0.015), inkMat);
    fHand2.position.set(0, R * 0.15, 0.025); fHand2.rotation.z = 1.2; front.add(fHand2);
    front.position.set(0.12, -0.1, 0.04);
    g.add(front);
    return g;
}

// ─── R28: Danger Pay ──────────────────────────────────────────────────────────
function buildR28() {
    const g = new THREE.Group();
    const triShape = new THREE.Shape();
    triShape.moveTo(0, 0.25);
    triShape.lineTo(-0.275, -0.25);
    triShape.lineTo(0.275, -0.25);
    triShape.closePath();
    const triGeo = new THREE.ExtrudeGeometry(triShape, {
        depth: 0.08, bevelEnabled: true,
        bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1,
    });
    triGeo.center();
    addWithOutline(g, triGeo, matSign());
    const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10);
    const coinGrp = new THREE.Group();
    coinGrp.rotation.x = Math.PI / 2;
    addWithOutline(coinGrp, coinGeo, matGold());
    coinGrp.position.set(0, -0.02, 0.06);
    g.add(coinGrp);
    return g;
}

// ─── R29: Contagion ───────────────────────────────────────────────────────────
function buildR29() {
    const g = new THREE.Group();
    const coreR = 0.25;
    const coreMat = toonMat(PALETTE.ubik);
    addWithOutline(g, new THREE.IcosahedronGeometry(coreR, 0), coreMat);
    const spikeGeo = new THREE.ConeGeometry(0.05, 0.18, 5);
    const refGeo = new THREE.IcosahedronGeometry(coreR, 0);
    const positions = refGeo.getAttribute('position');
    const seen = new Set();
    for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i);
        const key = `${px.toFixed(2)},${py.toFixed(2)},${pz.toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const dir = new THREE.Vector3(px, py, pz).normalize();
        const spike = new THREE.Mesh(spikeGeo, coreMat);
        spike.position.copy(dir.clone().multiplyScalar(coreR + 0.04));
        spike.lookAt(spike.position.clone().add(dir));
        spike.rotation.x += Math.PI / 2;
        g.add(spike);
        const spikeOl = new THREE.Mesh(spikeGeo, ol());
        spikeOl.position.copy(spike.position);
        spikeOl.rotation.copy(spike.rotation);
        g.add(spikeOl);
    }
    return g;
}

// ─── R30: Sympathetic Damage ──────────────────────────────────────────────────
// Broken heart — heart shape split in two halves with gap between. "Sympathetic" pain.
function buildR30() {
    const g = new THREE.Group();
    const heart = heartShape();
    heart.scale.setScalar(1.3);
    g.add(heart);
    // Crack line down the middle (dark line splitting the heart)
    addWithOutline(g, new THREE.BoxGeometry(0.03, 0.6, 0.15),
        toonMat(PALETTE.ink), { z: 0.02 }, { z: 0.1 });
    return g;
}

// ─── R31: Rush Defense ────────────────────────────────────────────────────────
// Stopwatch — round clock face with a button on top and a ring. "Rush" = time pressure.
function buildR31() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    const inkMat = toonMat(PALETTE.ink);
    // Round watch body
    addWithOutline(g, new THREE.SphereGeometry(0.38, 14, 12), metalMat,
        null, null, { x: 1, y: 1, z: 0.5 });
    // White face disc
    addWithOutline(g, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 16), toonMat(PALETTE.white),
        { z: 0.16 }, { x: Math.PI / 2 });
    // Button on top
    addWithOutline(g, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), metalMat,
        { y: 0.38 });
    // Crown ring at top
    addWithOutline(g, new THREE.TorusGeometry(0.08, 0.02, 6, 10), metalMat,
        { y: 0.38 }, { x: Math.PI / 2 });
    // Single hand pointing at "go"
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.22, 0.01), inkMat);
    hand.position.set(0, 0.08, 0.2);
    hand.rotation.z = -0.5;
    g.add(hand);
    return g;
}

// ─── R32: Attrition ───────────────────────────────────────────────────────────
// Thermometer 🌡️ — rising red mercury level. "Damage ramps up" = temperature rising.
function buildR32() {
    const g = new THREE.Group();
    const glassMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.6 });
    const redMat = matDanger();
    const metalMat = toonMat(PALETTE.fixture);
    // Glass tube (tall, thin)
    addWithOutline(g, new THREE.CylinderGeometry(0.06, 0.06, 0.7, 10), glassMat, { y: 0.1 });
    // Bulb at bottom (sphere)
    addWithOutline(g, new THREE.SphereGeometry(0.12, 10, 8), redMat, { y: -0.3 });
    // Red mercury inside tube (fills about 70% — "high")
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), redMat, { y: 0.0 });
    // Cap at top
    addWithOutline(g, new THREE.SphereGeometry(0.07, 8, 6), metalMat, { y: 0.48 });
    // Tick marks on the side (3 small horizontal lines)
    const tickGeo = new THREE.BoxGeometry(0.08, 0.015, 0.02);
    for (const y of [-0.1, 0.1, 0.3]) {
        addWithOutline(g, tickGeo, metalMat, { x: 0.1, y });
    }
    return g;
}

// ─── R33: Plumber's Union ─────────────────────────────────────────────────────
// Big pipe wrench 🔧 — one single clear tool. "Plumber" = wrench.
function buildR33() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    // Handle (long thick bar)
    addWithOutline(g, new THREE.BoxGeometry(0.08, 0.7, 0.05), metalMat, { y: -0.05 });
    // Jaw head (open wrench jaw — two parallel prongs at top)
    addWithOutline(g, new THREE.BoxGeometry(0.08, 0.2, 0.05), metalMat,
        { x: -0.1, y: 0.38 });
    addWithOutline(g, new THREE.BoxGeometry(0.08, 0.25, 0.05), metalMat,
        { x: 0.1, y: 0.4 });
    // Connecting bar between jaw prongs (top)
    addWithOutline(g, new THREE.BoxGeometry(0.28, 0.06, 0.05), metalMat, { y: 0.48 });
    // Adjustment wheel (torus on the side)
    addWithOutline(g, new THREE.TorusGeometry(0.06, 0.02, 6, 10), toonMat(PALETTE.ink),
        { x: 0.12, y: 0.22 });
    return g;
}

// ─── R34: Terracotta Army ─────────────────────────────────────────────────────
// One big terracotta pot wearing a warrior helmet — like a terracotta soldier head.
function buildR34() {
    const g = new THREE.Group();
    const potMat = matPotplant();
    const helmetMat = toonMat(PALETTE.fixture);
    // Big pot body (the "head")
    addWithOutline(g, new THREE.CylinderGeometry(0.3, 0.2, 0.4, 10), potMat, { y: -0.15 });
    // Pot rim
    addWithOutline(g, new THREE.CylinderGeometry(0.32, 0.32, 0.05, 10), potMat, { y: 0.07 });
    // Big warrior helmet dome on top
    addWithOutline(g, new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        helmetMat, { y: 0.1 });
    // Helmet brim (flat ring around helmet)
    addWithOutline(g, new THREE.TorusGeometry(0.3, 0.03, 6, 14), helmetMat,
        { y: 0.1 }, { x: Math.PI / 2 });
    // Helmet top knob/spike
    addWithOutline(g, new THREE.ConeGeometry(0.05, 0.12, 6), helmetMat, { y: 0.42 });
    // Two dot eyes (dark, peering out from under helmet)
    const eyeMat = toonMat(PALETTE.ink);
    addWithOutline(g, new THREE.SphereGeometry(0.04, 6, 6), eyeMat, { x: -0.1, y: 0.0, z: 0.25 });
    addWithOutline(g, new THREE.SphereGeometry(0.04, 6, 6), eyeMat, { x: 0.1, y: 0.0, z: 0.25 });
    // Slight mouth line
    addWithOutline(g, new THREE.BoxGeometry(0.12, 0.02, 0.02), eyeMat, { y: -0.12, z: 0.22 });
    return g;
}


// ─── R35: Money Printer ───────────────────────────────────────────────────────
function buildR35() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    addWithOutline(g, new THREE.BoxGeometry(0.6, 0.4, 0.35), metalMat, { y: -0.05 });
    addWithOutline(g, new THREE.BoxGeometry(0.62, 0.04, 0.37), toonMat(PALETTE.charcoal), { y: 0.17 });
    const rollerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8);
    for (const x of [-0.12, 0.12]) {
        const rg = new THREE.Group();
        rg.rotation.z = Math.PI / 2;
        addWithOutline(rg, rollerGeo, toonMat(PALETTE.charcoal));
        rg.position.set(x, 0.24, 0);
        g.add(rg);
    }
    const slotGeo = new THREE.BoxGeometry(0.02, 0.12, 0.22);
    const slot = new THREE.Mesh(slotGeo, toonMat(PALETTE.ink));
    slot.position.set(0.31, -0.03, 0);
    g.add(slot);
    const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10);
    const coinGrp = new THREE.Group();
    coinGrp.rotation.x = Math.PI / 2;
    addWithOutline(coinGrp, coinGeo, matGold());
    coinGrp.position.set(0.4, -0.02, 0);
    coinGrp.rotation.z = Math.PI / 8;
    g.add(coinGrp);
    return g;
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export const RARE_ICON_BUILDERS = {
    R1: buildR1,
    R2: buildR2,
    R3: buildR3,
    R4: buildR4,
    R5: buildR5,
    R6: buildR6,
    R7: buildR7,
    R8: buildR8,
    R9: buildR9,
    R10: buildR10,
    R11: buildR11,
    R12: buildR12,
    R13: buildR13,
    R14: buildR14,
    R15: buildR15,
    R16: buildR16,
    R17: buildR17,
    R18: buildR18,
    R19: buildR19,
    R20: buildR20,
    R21: buildR21,
    R22: buildR22,
    R23: buildR23,
    R24: buildR24,
    R25: buildR25,
    R26: buildR26,
    R27: buildR27,
    R28: buildR28,
    R29: buildR29,
    R30: buildR30,
    R31: buildR31,
    R32: buildR32,
    R33: buildR33,
    R34: buildR34,
    R35: buildR35,
};

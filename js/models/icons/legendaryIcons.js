// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Legendary Tier Upgrade Icons (L1–L18)                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../../data/palette.js';
import { toonMat, matGold, matDanger, matSign, matMop, matUbik, matPotplant } from '../../shaders/toonMaterials.js';
import {
    ol, addWithOutline,
    miniMagnet, miniCoin, miniSign, miniMop, miniSpray, miniPot, miniStar, miniChain, miniDoor,
    lightningBolt, shieldShape, shockwaveRings, springCoil, arrowUp, arrowDown,
    circularArrows, clockFace, crosshair, priceTag, splashDroplets, bubbles,
    flameShape, explosionBurst, skullShape, heartShape, puddleDisc, coinStack,
    miniTower, capsuleFigure, sparkSpheres, motionLines,
} from './iconPrimitives.js';

// ─── L1: Double Flush ─────────────────────────────────────────────────────────
// Flush lever arm + health cross (green) + 4 indicator spheres
function buildL1() {
    const g = new THREE.Group();

    // Flush lever arm — horizontal cylinder + knob
    const leverGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8);
    addWithOutline(g, leverGeo, toonMat(PALETTE.fixture), { x: 0.1, y: 0.3 }, { z: Math.PI / 2 });

    const knobGeo = new THREE.SphereGeometry(0.08, 8, 8);
    addWithOutline(g, knobGeo, toonMat(PALETTE.fixture), { x: 0.4, y: 0.3 });

    // Health cross — two crossed green cylinders
    const crossMat = toonMat(PALETTE.success, { emissive: PALETTE.success, emissiveIntensity: 0.4 });
    const crossGeoH = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    const crossGeoV = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
    addWithOutline(g, crossGeoH, crossMat, { y: -0.1 }, { z: Math.PI / 2 });
    addWithOutline(g, crossGeoV, crossMat, { y: -0.1 });

    // 4 small spheres indicating +4
    const dotMat = toonMat(PALETTE.glow, { emissive: PALETTE.gold, emissiveIntensity: 0.5 });
    const dotGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const dotPositions = [[0.5, -0.05, 0], [0.55, -0.3, 0], [-0.5, -0.05, 0], [-0.55, -0.3, 0]];
    for (const [x, y, z] of dotPositions) {
        addWithOutline(g, dotGeo, dotMat, { x, y, z });
    }

    return g;
}

// ─── L2: Desperate Measures ───────────────────────────────────────────────────
// Mini door with dark crack lines + flame shapes erupting from cracks
function buildL2() {
    const g = new THREE.Group();

    // Door
    const door = miniDoor();
    door.position.set(-0.1, 0, 0);
    g.add(door);

    // Crack lines on door — thin dark cylinders
    const crackMat = toonMat(PALETTE.ink);
    const crackGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4);
    addWithOutline(g, crackGeo, crackMat, { x: -0.1, y: 0.05, z: 0.06 }, { z: 0.15 });
    const crackGeo2 = new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4);
    addWithOutline(g, crackGeo2, crackMat, { x: -0.02, y: -0.1, z: 0.06 }, { z: -0.25 });

    // Flames erupting from cracks
    const flame1 = flameShape(0.5);
    flame1.position.set(0.2, 0.15, 0.08);
    flame1.rotation.z = -0.3;
    flame1.scale.setScalar(0.7);
    g.add(flame1);

    const flame2 = flameShape(0.4);
    flame2.position.set(0.35, -0.1, 0.08);
    flame2.rotation.z = -0.5;
    flame2.scale.setScalar(0.6);
    g.add(flame2);

    return g;
}

// ─── L3: Plunger Protocol ─────────────────────────────────────────────────────
// Plunger (stick + hemisphere cup) + shockwave rings + exclamation mark
function buildL3() {
    const g = new THREE.Group();

    // Plunger stick
    const stickGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8);
    addWithOutline(g, stickGeo, toonMat(PALETTE.wood), { y: 0.15 });

    // Plunger cup (hemisphere)
    const cupGeo = new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    addWithOutline(g, cupGeo, toonMat(PALETTE.danger, { emissive: PALETTE.danger, emissiveIntensity: 0.2 }),
        { y: -0.22 }, { x: Math.PI });

    // Shockwave rings expanding outward
    const rings = shockwaveRings(3, 0.3);
    rings.position.set(0, -0.35, 0);
    g.add(rings);

    // Exclamation mark floating above
    const exclMat = toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.6 });
    const exclBarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    addWithOutline(g, exclBarGeo, exclMat, { y: 0.65 });
    const exclDotGeo = new THREE.SphereGeometry(0.05, 6, 6);
    addWithOutline(g, exclDotGeo, exclMat, { y: 0.5 });

    return g;
}

// ─── L4: Rush Hour Pileup ─────────────────────────────────────────────────────
// 2 capsule figures leaning into each other + explosion burst at collision + motion lines
function buildL4() {
    const g = new THREE.Group();

    // Two capsule figures leaning toward center
    const fig1 = capsuleFigure(0.55, PALETTE.polite);
    fig1.position.set(-0.35, -0.1, 0);
    fig1.rotation.z = 0.35;
    g.add(fig1);

    const fig2 = capsuleFigure(0.55, PALETTE.panicker);
    fig2.position.set(0.35, -0.1, 0);
    fig2.rotation.z = -0.35;
    g.add(fig2);

    // Explosion burst at collision point
    const burst = explosionBurst(0.3);
    burst.position.set(0, 0.15, 0.1);
    burst.scale.setScalar(0.7);
    g.add(burst);

    // Motion lines behind each figure
    const lines1 = motionLines(3, 0.25);
    lines1.position.set(-0.6, 0.1, 0);
    g.add(lines1);

    const lines2 = motionLines(3, 0.25);
    lines2.position.set(0.9, 0.1, 0);
    lines2.rotation.y = Math.PI;
    g.add(lines2);

    return g;
}

// ─── L5: Domino Effect ────────────────────────────────────────────────────────
// 4 thin rounded boxes at decreasing tilt angles (90->60->30->0) like falling dominoes
function buildL5() {
    const g = new THREE.Group();

    const dominoMat = toonMat(PALETTE.white);
    const dotMat = toonMat(PALETTE.ink);
    const dominoGeo = new THREE.BoxGeometry(0.12, 0.5, 0.06);
    const tilts = [Math.PI / 2, Math.PI / 3, Math.PI / 6, 0];

    for (let i = 0; i < 4; i++) {
        const x = -0.45 + i * 0.3;
        const tilt = tilts[i];
        // Pivot from bottom: offset y by half-height * cos, x by half-height * sin
        const pivotY = -0.35 + 0.25 * Math.cos(tilt);
        const pivotX = x + 0.25 * Math.sin(tilt);

        addWithOutline(g, dominoGeo, dominoMat, { x: pivotX, y: pivotY, z: 0 }, { z: tilt });

        // Dots on domino faces
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), dotMat);
        dot.position.set(pivotX, pivotY + 0.08, 0.04);
        g.add(dot);
    }

    // Ground line
    const groundGeo = new THREE.BoxGeometry(1.4, 0.02, 0.3);
    addWithOutline(g, groundGeo, toonMat(PALETTE.fixture), { y: -0.36 });

    return g;
}

// ─── L6: Spill Zone ──────────────────────────────────────────────────────────
// Capsule figure tipped sideways + large puddle disc + warning ring
function buildL6() {
    const g = new THREE.Group();

    // Large spreading puddle
    const puddle = puddleDisc(0.65);
    puddle.position.set(0, -0.35, 0);
    g.add(puddle);

    // Warning ring around puddle
    const warnGeo = new THREE.TorusGeometry(0.7, 0.025, 8, 24);
    const warnMat = toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.4 });
    const warn = new THREE.Mesh(warnGeo, warnMat);
    warn.rotation.x = Math.PI / 2;
    warn.position.y = -0.33;
    g.add(warn);

    // Tipped-over figure
    const fig = capsuleFigure(0.45, PALETTE.dancer);
    fig.position.set(0.15, -0.05, 0.1);
    fig.rotation.z = Math.PI / 2.5;
    g.add(fig);

    // Splash droplets
    const splash = splashDroplets(4);
    splash.position.set(-0.2, -0.15, 0.1);
    g.add(splash);

    return g;
}

// ─── L7: Loose Change ────────────────────────────────────────────────────────
// 4-5 coins scattered on ground + capsule figure tripping/stumbling
function buildL7() {
    const g = new THREE.Group();

    // Ground plane
    const groundGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.02, 16);
    addWithOutline(g, groundGeo, toonMat(PALETTE.fixture), { y: -0.4 });

    // Scattered coins on ground
    const gold = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12);
    const coinPositions = [
        [-0.3, -0.37, 0.1], [0.1, -0.37, -0.15], [-0.1, -0.37, 0.25],
        [0.3, -0.37, 0.05], [0.0, -0.37, -0.05],
    ];
    for (const [x, y, z] of coinPositions) {
        const inner = new THREE.Group();
        inner.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        inner.rotation.z = Math.random() * Math.PI;
        addWithOutline(inner, coinGeo, gold);
        inner.position.set(x, y, z);
        g.add(inner);
    }

    // Stumbling figure
    const fig = capsuleFigure(0.5, PALETTE.polite);
    fig.position.set(0.05, 0.05, 0);
    fig.rotation.z = 0.45;
    fig.rotation.x = 0.2;
    g.add(fig);

    return g;
}

// ─── L8: Nuclear Mop ─────────────────────────────────────────────────────────
// Massive mop + radioactive trefoil symbol on head, emissive green glow
function buildL8() {
    const g = new THREE.Group();

    // Oversized mop handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.2 });

    // Mop head — big
    const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
    const mopGlow = toonMat(PALETTE.mop, { emissive: PALETTE.success, emissiveIntensity: 0.6 });
    addWithOutline(g, headGeo, mopGlow, { y: -0.35 }, null, { x: 1.4, y: 0.7, z: 1.1 });

    // Radioactive trefoil — 3 pie wedge cylinders
    const trefoilMat = toonMat(PALETTE.success, { emissive: PALETTE.success, emissiveIntensity: 0.8 });
    const wedgeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8, 1, false, 0, Math.PI * 0.55);
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const wx = Math.cos(angle) * 0.08;
        const wz = Math.sin(angle) * 0.08;
        addWithOutline(g, wedgeGeo, trefoilMat,
            { x: wx, y: -0.35, z: wz + 0.22 },
            { x: Math.PI / 2, y: angle }
        );
    }

    // Inner circle of trefoil
    const innerGeo = new THREE.TorusGeometry(0.05, 0.02, 6, 12);
    const inner = new THREE.Mesh(innerGeo, trefoilMat);
    inner.rotation.x = Math.PI / 2;
    inner.position.set(0, -0.35, 0.22);
    g.add(inner);

    return g;
}

// ─── L9: Ubik Flood ──────────────────────────────────────────────────────────
// Large wave shape in ubik green + spray particles at crest
function buildL9() {
    const g = new THREE.Group();

    // Wave profile via ExtrudeGeometry
    const waveShape = new THREE.Shape();
    waveShape.moveTo(-0.7, -0.3);
    waveShape.lineTo(-0.7, 0.0);
    waveShape.bezierCurveTo(-0.5, 0.5, -0.1, 0.7, 0.2, 0.5);
    waveShape.bezierCurveTo(0.35, 0.35, 0.45, 0.1, 0.3, -0.05);
    waveShape.bezierCurveTo(0.2, -0.15, 0.0, -0.1, -0.1, 0.0);
    waveShape.lineTo(0.7, -0.3);
    waveShape.closePath();

    const waveGeo = new THREE.ExtrudeGeometry(waveShape, {
        depth: 0.3, bevelEnabled: true,
        bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2,
    });
    waveGeo.center();
    const waveMat = toonMat(PALETTE.ubik, { emissive: PALETTE.ubik, emissiveIntensity: 0.3 });
    addWithOutline(g, waveGeo, waveMat, { y: -0.1 });

    // Spray particles at the crest
    const sprayMat = toonMat(PALETTE.glow, { emissive: PALETTE.ubik, emissiveIntensity: 0.5 });
    const sprayGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const sprayPositions = [
        [0.05, 0.5, 0], [-0.15, 0.55, 0.1], [0.2, 0.4, -0.08],
        [-0.05, 0.6, 0.05], [0.15, 0.55, 0.12],
    ];
    for (const [x, y, z] of sprayPositions) {
        const drop = new THREE.Mesh(sprayGeo, sprayMat);
        drop.position.set(x, y, z);
        g.add(drop);
    }

    return g;
}

// ─── L10: Golden Magnet ──────────────────────────────────────────────────────
// Full gold horseshoe magnet on platform + coin generated between poles
function buildL10() {
    const g = new THREE.Group();

    // Raised platform
    const platGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.08, 12);
    addWithOutline(g, platGeo, toonMat(PALETTE.fixture), { y: -0.4 });

    // Gold horseshoe magnet
    const goldMat = matGold();
    const arcGeo = new THREE.TorusGeometry(0.32, 0.07, 8, 16, Math.PI);
    addWithOutline(g, arcGeo, goldMat, { y: 0.1 }, { x: -Math.PI / 2 });

    // Magnet pole tips
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8);
    addWithOutline(g, poleGeo, goldMat, { x: -0.32, y: -0.0 });
    addWithOutline(g, poleGeo, goldMat, { x: 0.32, y: -0.0 });

    // Pole caps — red
    const capGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.06, 8);
    const capMat = toonMat(PALETTE.danger);
    addWithOutline(g, capGeo, capMat, { x: -0.32, y: -0.12 });
    addWithOutline(g, capGeo, capMat, { x: 0.32, y: -0.12 });

    // Coin being attracted between poles
    const coin = miniCoin();
    coin.position.set(0, -0.15, 0.05);
    coin.scale.setScalar(0.5);
    g.add(coin);

    // Emissive glow between poles
    const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const glowMat = toonMat(PALETTE.glow, {
        transparent: true, opacity: 0.25,
        emissive: PALETTE.gold, emissiveIntensity: 0.8,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, -0.1, 0);
    g.add(glow);

    return g;
}

// ─── L11: Bladder Burst ──────────────────────────────────────────────────────
// Central sphere with radial spike cones + shockwave rings + flying debris
function buildL11() {
    const g = new THREE.Group();

    // Central sphere
    const coreMat = toonMat(PALETTE.danger, { emissive: PALETTE.danger, emissiveIntensity: 0.6 });
    const coreGeo = new THREE.SphereGeometry(0.25, 10, 10);
    addWithOutline(g, coreGeo, coreMat);

    // Radial spike cones
    const spikeMat = toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.4 });
    const spikeGeo = new THREE.ConeGeometry(0.06, 0.35, 5);
    const spikeCount = 10;
    for (let i = 0; i < spikeCount; i++) {
        const phi = (i / spikeCount) * Math.PI * 2;
        const theta = (i % 3 - 1) * 0.5;
        const dist = 0.35;
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(
            Math.cos(phi) * dist * Math.cos(theta),
            Math.sin(theta) * dist,
            Math.sin(phi) * dist * Math.cos(theta)
        );
        spike.lookAt(0, 0, 0);
        spike.rotation.x += Math.PI;
        g.add(spike);
    }

    // Shockwave rings
    const rings = shockwaveRings(2, 0.5);
    rings.position.y = -0.1;
    g.add(rings);

    // Flying debris spheres
    const debrisMat = toonMat(PALETTE.fixture);
    const debrisGeo = new THREE.SphereGeometry(0.04, 4, 4);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const d = 0.6 + Math.random() * 0.2;
        const debris = new THREE.Mesh(debrisGeo, debrisMat);
        debris.position.set(Math.cos(a) * d, (Math.random() - 0.3) * 0.5, Math.sin(a) * d);
        g.add(debris);
    }

    return g;
}

// ─── L12: Overtime ───────────────────────────────────────────────────────────
// Clock face with hands at 12 + emissive gold torus aura + lightning sparks
function buildL12() {
    const g = new THREE.Group();

    // Clock face (hands at 12)
    const clock = clockFace(0.45);
    g.add(clock);

    // Override the clock hands to point at 12 — re-add custom ones
    // The clockFace primitive already has hands, so we enhance with gold aura

    // Emissive gold torus ring aura
    const auraGeo = new THREE.TorusGeometry(0.6, 0.04, 8, 24);
    const auraMat = toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.8 });
    addWithOutline(g, auraGeo, auraMat, null, { x: Math.PI / 2 });

    // Small lightning sparks around clock
    const sparkPositions = [
        [0.55, 0.3, 0], [-0.5, -0.25, 0], [0.3, -0.5, 0], [-0.35, 0.45, 0],
    ];
    for (const [x, y, z] of sparkPositions) {
        const bolt = lightningBolt(0.25);
        bolt.position.set(x, y, z);
        bolt.scale.setScalar(0.4);
        g.add(bolt);
    }

    return g;
}

// ─── L13: Minimalist ─────────────────────────────────────────────────────────
// Single elegant mini tower on subtle platform — negative space IS the icon
function buildL13() {
    const g = new THREE.Group();

    // Subtle circular platform
    const platGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.04, 16);
    addWithOutline(g, platGeo, toonMat(PALETTE.charcoal), { y: -0.42 });

    // Single elegant tower — centered, slightly larger than the standard miniTower
    const tower = miniTower();
    tower.position.set(0, -0.1, 0);
    tower.scale.setScalar(1.3);
    g.add(tower);

    return g;
}

// ─── L14: Hoarder ────────────────────────────────────────────────────────────
// Open chest (box body + tilted lid) + coin stack inside + loose coins tumbling out
function buildL14() {
    const g = new THREE.Group();
    const woodMat = toonMat(PALETTE.wood);
    const gold = matGold();

    // Chest body — open box
    const bodyGeo = new THREE.BoxGeometry(0.65, 0.4, 0.45);
    addWithOutline(g, bodyGeo, woodMat, { y: -0.2 });

    // Chest rim strip
    const rimGeo = new THREE.BoxGeometry(0.68, 0.04, 0.48);
    addWithOutline(g, rimGeo, toonMat(PALETTE.fixture), { y: 0.01 });

    // Tilted lid panel — hinged open
    const lidGeo = new THREE.BoxGeometry(0.65, 0.06, 0.45);
    addWithOutline(g, lidGeo, woodMat, { x: 0, y: 0.25, z: -0.2 }, { x: -0.7 });

    // Lid clasp
    const claspGeo = new THREE.BoxGeometry(0.1, 0.06, 0.04);
    addWithOutline(g, claspGeo, gold, { y: 0.15, z: -0.02 }, { x: -0.4 });

    // Coin stack inside chest
    const stack = coinStack(4, 0.1);
    stack.position.set(-0.05, -0.05, 0);
    g.add(stack);

    // Loose coins tumbling out
    const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 10);
    const loosePositions = [
        [0.35, -0.15, 0.15, 0.8, 0.3],
        [0.45, -0.3, 0.1, 1.2, -0.2],
        [-0.4, -0.3, 0.2, 0.5, 0.6],
        [0.2, -0.35, -0.2, -0.3, 0.9],
        [-0.35, -0.38, -0.05, 1.0, -0.4],
    ];
    for (const [x, y, z, rx, rz] of loosePositions) {
        addWithOutline(g, coinGeo, gold, { x, y, z }, { x: rx, z: rz });
    }

    return g;
}

// ─── L15: Chain Reaction ──────────────────────────────────────────────────────
// 3 mini towers in triangle + lightning bolt segments connecting them
function buildL15() {
    const g = new THREE.Group();

    // 3 towers in triangle formation
    const positions = [
        [0, 0.3],       // top
        [-0.4, -0.25],  // bottom-left
        [0.4, -0.25],   // bottom-right
    ];

    for (const [x, y] of positions) {
        const tower = miniTower();
        tower.position.set(x, y, 0);
        tower.scale.setScalar(0.7);
        g.add(tower);
    }

    // Lightning bolt segments connecting towers in chain
    const pairs = [[0, 1], [1, 2], [2, 0]];
    for (const [a, b] of pairs) {
        const [ax, ay] = positions[a];
        const [bx, by] = positions[b];
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const angle = Math.atan2(by - ay, bx - ax);
        const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);

        const bolt = lightningBolt(dist * 0.6);
        bolt.position.set(mx, my, 0.1);
        bolt.rotation.z = angle - Math.PI / 2;
        bolt.scale.setScalar(0.5);
        g.add(bolt);
    }

    return g;
}

// ─── L16: Loan Shark ─────────────────────────────────────────────────────────
// Shark fin cutting through a pile of coins, dark menacing accent
function buildL16() {
    const g = new THREE.Group();

    // Coin pile on ground
    const gold = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10);
    for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const r = 0.15 + Math.random() * 0.25;
        addWithOutline(g, coinGeo, gold,
            { x: Math.cos(angle) * r, y: -0.35 + i * 0.02, z: Math.sin(angle) * r },
            { x: Math.PI / 2 + (Math.random() - 0.5) * 0.4, z: Math.random() }
        );
    }

    // Shark fin — triangular extrusion
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(-0.2, -0.5);
    finShape.bezierCurveTo(-0.15, -0.52, 0.15, -0.52, 0.12, -0.5);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
        depth: 0.06, bevelEnabled: true,
        bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1,
    });
    finGeo.center();
    const finMat = toonMat(PALETTE.charcoal, { emissive: PALETTE.ink, emissiveIntensity: 0.3 });
    addWithOutline(g, finGeo, finMat, { y: 0.15, z: 0 });

    // Dark menacing accent — shadow ring at base
    const shadowGeo = new THREE.TorusGeometry(0.35, 0.02, 6, 16);
    const shadowMat = toonMat(PALETTE.ink, { transparent: true, opacity: 0.4 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = Math.PI / 2;
    shadow.position.y = -0.33;
    g.add(shadow);

    return g;
}

// ─── L17: Assembly Line ──────────────────────────────────────────────────────
// 3 mini towers on flat conveyor belt + roller cylinders at ends + arrow
function buildL17() {
    const g = new THREE.Group();

    // Conveyor belt — flat thin box
    const beltGeo = new THREE.BoxGeometry(1.5, 0.04, 0.45);
    addWithOutline(g, beltGeo, toonMat(PALETTE.charcoal), { y: -0.35 });

    // Belt surface lines (ridges)
    const ridgeMat = toonMat(PALETTE.ink, { transparent: true, opacity: 0.3 });
    const ridgeGeo = new THREE.BoxGeometry(0.02, 0.05, 0.45);
    for (let i = 0; i < 8; i++) {
        const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
        ridge.position.set(-0.6 + i * 0.18, -0.33, 0);
        g.add(ridge);
    }

    // Roller cylinders at each end
    const rollerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 10);
    const rollerMat = toonMat(PALETTE.fixture);
    addWithOutline(g, rollerGeo, rollerMat, { x: -0.75, y: -0.35 }, { x: Math.PI / 2 });
    addWithOutline(g, rollerGeo, rollerMat, { x: 0.75, y: -0.35 }, { x: Math.PI / 2 });

    // 3 mini towers on belt
    for (let i = 0; i < 3; i++) {
        const tower = miniTower();
        tower.position.set(-0.4 + i * 0.4, -0.05, 0);
        tower.scale.setScalar(0.55);
        g.add(tower);
    }

    // Horizontal arrow indicating direction
    const arrow = arrowUp(0.5);
    arrow.rotation.z = -Math.PI / 2;
    arrow.position.set(0.3, 0.4, 0);
    g.add(arrow);

    return g;
}

// ─── L18: Last Stand ─────────────────────────────────────────────────────────
// Damaged mini tower (tilted, crack lines) + heroic gold glow + radial aura torus
function buildL18() {
    const g = new THREE.Group();

    // Radial aura torus ring — heroic gold backdrop
    const auraGeo = new THREE.TorusGeometry(0.65, 0.04, 8, 28);
    const auraMat = toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.9 });
    addWithOutline(g, auraGeo, auraMat, { y: 0 }, { x: Math.PI / 2 });

    // Bright emissive glow sphere behind tower
    const glowGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const glowMat = toonMat(PALETTE.glow, {
        transparent: true, opacity: 0.2,
        emissive: PALETTE.gold, emissiveIntensity: 1.0,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -0.05);
    g.add(glow);

    // Damaged tower — tilted
    const tower = miniTower();
    tower.position.set(0, -0.05, 0);
    tower.rotation.z = 0.2;
    tower.scale.setScalar(1.1);
    g.add(tower);

    // Crack lines on tower body
    const crackMat = toonMat(PALETTE.ink);
    const crackGeo1 = new THREE.CylinderGeometry(0.012, 0.012, 0.25, 4);
    addWithOutline(g, crackGeo1, crackMat, { x: 0.06, y: 0.0, z: 0.13 }, { z: 0.4 });
    const crackGeo2 = new THREE.CylinderGeometry(0.01, 0.01, 0.18, 4);
    addWithOutline(g, crackGeo2, crackMat, { x: -0.04, y: -0.15, z: 0.13 }, { z: -0.6 });
    const crackGeo3 = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4);
    addWithOutline(g, crackGeo3, crackMat, { x: 0.08, y: -0.12, z: 0.13 }, { z: 0.8 });

    // Spark spheres — heroic energy
    const sparks = sparkSpheres(5, 0.6);
    g.add(sparks);

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

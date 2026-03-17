// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Rare Tier Upgrade Icons (R1–R35)                            ║
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

// ─── R1: Wet & Soapy ──────────────────────────────────────────────────────────
// Warning sign half-submerged in green ubik puddle disc + 4 floating bubbles
function buildR1() {
    const g = new THREE.Group();

    // Green ubik puddle at base
    const puddle = puddleDisc(0.55);
    puddle.position.y = -0.35;
    g.add(puddle);

    // Warning sign half-submerged
    const sign = miniSign();
    sign.position.y = -0.1;
    sign.scale.setScalar(0.7);
    g.add(sign);

    // 4 floating bubbles
    const bubs = bubbles(4, 0.4);
    bubs.position.y = 0.15;
    g.add(bubs);

    return g;
}

// ─── R2: Mop Splash ───────────────────────────────────────────────────────────
// Mop striking flat puddle disc (sign yellow) + 6 splash droplets radiating
function buildR2() {
    const g = new THREE.Group();

    // Yellow puddle (sign color)
    const puddleGeo = new THREE.CylinderGeometry(0.45, 0.5, 0.03, 14);
    const puddleMat = toonMat(PALETTE.sign, { transparent: true, opacity: 0.5 });
    const disc = new THREE.Mesh(puddleGeo, puddleMat);
    disc.position.y = -0.35;
    g.add(disc);

    // Mop angled down into puddle
    const mop = miniMop();
    mop.rotation.z = 0.3;
    mop.position.set(-0.1, 0.05, 0);
    mop.scale.setScalar(0.8);
    g.add(mop);

    // 6 splash droplets radiating outward
    const drops = splashDroplets(6);
    drops.position.y = -0.2;
    drops.scale.setScalar(1.3);
    g.add(drops);

    return g;
}

// ─── R3: Magnetic Mops ────────────────────────────────────────────────────────
// Mop + small magnet nearby + 2 curved torus segment field arcs
function buildR3() {
    const g = new THREE.Group();

    // Mop on left
    const mop = miniMop();
    mop.position.set(-0.3, 0, 0);
    mop.scale.setScalar(0.7);
    g.add(mop);

    // Small magnet on right
    const mag = miniMagnet();
    mag.position.set(0.35, -0.05, 0);
    mag.scale.setScalar(0.6);
    g.add(mag);

    // 2 curved field arcs between them
    const arcMat = toonMat(PALETTE.magnet, { transparent: true, opacity: 0.4 });
    const arcGeo = new THREE.TorusGeometry(0.35, 0.02, 6, 12, Math.PI * 0.6);
    for (let i = 0; i < 2; i++) {
        const arc = new THREE.Mesh(arcGeo, arcMat);
        arc.position.set(0, 0.05 + i * 0.15, 0);
        arc.rotation.y = Math.PI * 0.2;
        arc.rotation.x = Math.PI / 2;
        g.add(arc);
    }

    return g;
}

// ─── R4: Ubik Slick ───────────────────────────────────────────────────────────
// Pot tilted at 20deg + elongated flat green box trail + motion lines
function buildR4() {
    const g = new THREE.Group();

    // Pot tilted forward
    const pot = miniPot();
    pot.position.set(0.25, 0.05, 0);
    pot.rotation.z = -0.35; // ~20 degrees
    pot.scale.setScalar(0.7);
    g.add(pot);

    // Elongated flat green trail behind pot
    const trailGeo = new THREE.BoxGeometry(0.8, 0.04, 0.25);
    const trailMat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.45 });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.set(-0.15, -0.35, 0);
    g.add(trail);

    // Motion lines trailing behind
    const lines = motionLines(3, 0.25);
    lines.position.set(0.1, 0.0, 0);
    g.add(lines);

    return g;
}

// ─── R5: Coin Shrapnel ────────────────────────────────────────────────────────
// Central cracked coin + 5 triangular shard wedges flying outward
function buildR5() {
    const g = new THREE.Group();

    // Central cracked coin
    const coin = miniCoin();
    coin.scale.setScalar(0.7);
    g.add(coin);

    // Crack line through center
    const crackGeo = new THREE.BoxGeometry(0.03, 0.5, 0.02);
    const crackMat = toonMat(PALETTE.ink);
    const crack = new THREE.Mesh(crackGeo, crackMat);
    crack.position.z = 0.06;
    crack.rotation.z = 0.2;
    g.add(crack);

    // 5 triangular shards flying outward
    const shardMat = matGold();
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const shardGeo = new THREE.ConeGeometry(0.06, 0.15, 3);
        const shard = new THREE.Mesh(shardGeo, shardMat);
        const dist = 0.5;
        shard.position.set(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist,
            0
        );
        shard.rotation.z = angle - Math.PI / 2;
        g.add(shard);
    }

    return g;
}

// ─── R6: Sign Fortress ────────────────────────────────────────────────────────
// 4 small warning signs arranged in a square formation facing outward
function buildR6() {
    const g = new THREE.Group();

    const positions = [
        { x: -0.3, z: -0.3, ry: -Math.PI / 4 },
        { x:  0.3, z: -0.3, ry:  Math.PI / 4 },
        { x: -0.3, z:  0.3, ry: -Math.PI * 3 / 4 },
        { x:  0.3, z:  0.3, ry:  Math.PI * 3 / 4 },
    ];

    for (const p of positions) {
        const sign = miniSign();
        sign.scale.setScalar(0.5);
        sign.position.set(p.x, -0.05, p.z);
        sign.rotation.y = p.ry;
        g.add(sign);
    }

    return g;
}

// ─── R7: Mop & Bucket ─────────────────────────────────────────────────────────
// Mop + larger bucket cylinder + green sphere overflow spilling over rim
function buildR7() {
    const g = new THREE.Group();

    // Mop on left side, leaning
    const mop = miniMop();
    mop.position.set(-0.3, 0.05, 0);
    mop.rotation.z = 0.2;
    mop.scale.setScalar(0.7);
    g.add(mop);

    // Bucket (cylinder)
    const bucketGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.35, 10);
    addWithOutline(g, bucketGeo, toonMat(PALETTE.fixture), { x: 0.2, y: -0.2 });

    // Bucket rim
    const rimGeo = new THREE.TorusGeometry(0.22, 0.025, 6, 14);
    const rim = new THREE.Mesh(rimGeo, toonMat(PALETTE.fixture));
    rim.position.set(0.2, -0.025, 0);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    // Green overflow spilling over rim
    const overflowGeo = new THREE.SphereGeometry(0.14, 8, 6);
    const overflowMat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.6 });
    const overflow = new THREE.Mesh(overflowGeo, overflowMat);
    overflow.position.set(0.2, 0.02, 0.1);
    overflow.scale.set(1.3, 0.6, 1);
    g.add(overflow);

    return g;
}

// ─── R8: Pot Magnet ───────────────────────────────────────────────────────────
// Pot tilted + small magnet with torus arc pulling pot toward it
function buildR8() {
    const g = new THREE.Group();

    // Pot tilted toward magnet
    const pot = miniPot();
    pot.position.set(-0.3, -0.05, 0);
    pot.rotation.z = 0.3;
    pot.scale.setScalar(0.65);
    g.add(pot);

    // Magnet on right
    const mag = miniMagnet();
    mag.position.set(0.35, 0.05, 0);
    mag.scale.setScalar(0.6);
    g.add(mag);

    // Torus arc showing magnetic pull
    const arcMat = toonMat(PALETTE.magnet, { transparent: true, opacity: 0.35 });
    const arcGeo = new THREE.TorusGeometry(0.3, 0.02, 6, 12, Math.PI * 0.7);
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.set(0.05, 0.1, 0);
    arc.rotation.x = Math.PI / 2;
    arc.rotation.z = Math.PI * 0.15;
    g.add(arc);

    return g;
}

// ─── R9: Sticky Mop ──────────────────────────────────────────────────────────
// Mop at angle + 3 small puddle discs trailing behind
function buildR9() {
    const g = new THREE.Group();

    // Mop angled
    const mop = miniMop();
    mop.position.set(0.2, 0.1, 0);
    mop.rotation.z = -0.25;
    mop.scale.setScalar(0.75);
    g.add(mop);

    // 3 small puddle discs trailing behind
    const offsets = [
        { x: -0.1, z: 0 },
        { x: -0.35, z: 0.08 },
        { x: -0.55, z: -0.05 },
    ];
    for (let i = 0; i < 3; i++) {
        const p = puddleDisc(0.12 + i * 0.03);
        p.position.set(offsets[i].x, -0.35, offsets[i].z);
        g.add(p);
    }

    return g;
}

// ─── R10: Chain Trip ──────────────────────────────────────────────────────────
// Pot on ground + 2 flat shockwave rings expanding at base level
function buildR10() {
    const g = new THREE.Group();

    // Pot sitting on ground
    const pot = miniPot();
    pot.position.y = -0.1;
    pot.scale.setScalar(0.65);
    g.add(pot);

    // 2 expanding shockwave rings at base
    const rings = shockwaveRings(2, 0.35);
    rings.position.y = -0.35;
    g.add(rings);

    return g;
}

// ─── R11: Spray & Pray ────────────────────────────────────────────────────────
// Spray can with wide cone + 3 mini coins scattered in spray area
function buildR11() {
    const g = new THREE.Group();

    // Spray can on left
    const spray = miniSpray();
    spray.position.set(-0.3, 0, 0);
    spray.scale.setScalar(0.7);
    g.add(spray);

    // Wide spray cone
    const coneGeo = new THREE.ConeGeometry(0.35, 0.5, 8, 1, true);
    const coneMat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.15 });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0.15, 0, 0);
    cone.rotation.z = -Math.PI / 2;
    g.add(cone);

    // 3 mini coins scattered in spray area
    const coinPositions = [
        { x: 0.25, y: 0.15 },
        { x: 0.4, y: -0.1 },
        { x: 0.15, y: -0.2 },
    ];
    for (const cp of coinPositions) {
        const c = miniCoin();
        c.scale.setScalar(0.3);
        c.position.set(cp.x, cp.y, 0.05);
        g.add(c);
    }

    return g;
}

// ─── R12: Payday ──────────────────────────────────────────────────────────────
// Large magnet + 5 tiny coins arcing inward from different angles
function buildR12() {
    const g = new THREE.Group();

    // Large magnet center
    const mag = miniMagnet();
    mag.scale.setScalar(0.9);
    g.add(mag);

    // 5 tiny coins arcing inward
    const goldMat = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10);
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 3;
        const dist = 0.55;
        const inner = new THREE.Group();
        inner.rotation.x = Math.PI / 2;
        addWithOutline(inner, coinGeo, goldMat);
        inner.position.set(
            Math.cos(angle) * dist,
            Math.sin(angle) * dist * 0.7 + 0.1,
            Math.sin(angle) * 0.1
        );
        inner.rotation.z = angle;
        g.add(inner);
    }

    return g;
}

// ─── R13: The Tip Jar ─────────────────────────────────────────────────────────
// Cylindrical jar (translucent white) filled with coin stack, 2 coins toppling off
function buildR13() {
    const g = new THREE.Group();

    // Translucent jar
    const jarGeo = new THREE.CylinderGeometry(0.28, 0.25, 0.6, 12);
    const jarMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.35 });
    const jar = new THREE.Mesh(jarGeo, jarMat);
    jar.position.y = -0.05;
    g.add(jar);

    // Jar rim
    const rimGeo = new THREE.TorusGeometry(0.28, 0.025, 6, 14);
    const rim = new THREE.Mesh(rimGeo, toonMat(PALETTE.fixture));
    rim.position.y = 0.25;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    // Coin stack inside
    const stack = coinStack(3, 0.15);
    stack.position.y = -0.1;
    g.add(stack);

    // 2 coins toppling off the top
    const goldMat = matGold();
    const topplerGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 10);
    for (const [x, ry, rz] of [[0.2, 0, 0.8], [-0.15, 0, -0.6]]) {
        const inner = new THREE.Group();
        inner.rotation.x = Math.PI / 2;
        addWithOutline(inner, topplerGeo, goldMat);
        inner.position.set(x, 0.35, 0.05);
        inner.rotation.z = rz;
        g.add(inner);
    }

    return g;
}

// ─── R14: Clearance Sale ──────────────────────────────────────────────────────
// Large price tag + red diagonal slash cylinder + coin with down arrow
function buildR14() {
    const g = new THREE.Group();

    // Price tag
    const tag = priceTag(0.5, 0.65);
    tag.position.set(-0.15, 0.05, 0);
    tag.scale.setScalar(0.8);
    g.add(tag);

    // Red diagonal slash across tag
    const slashGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6);
    addWithOutline(g, slashGeo, matDanger(), { x: -0.15, y: 0.05, z: 0.06 }, { z: Math.PI / 4 });

    // Small coin + down arrow on right
    const coin = miniCoin();
    coin.scale.setScalar(0.4);
    coin.position.set(0.4, 0.15, 0);
    g.add(coin);

    const arrow = arrowDown(0.35);
    arrow.position.set(0.4, -0.2, 0);
    arrow.scale.setScalar(0.6);
    g.add(arrow);

    return g;
}

// ─── R15: Insurance Policy ────────────────────────────────────────────────────
// Shield shape with mini coin inset in center, slight emissive glow
function buildR15() {
    const g = new THREE.Group();

    // Shield
    const shield = shieldShape(0.75, 0.95);
    g.add(shield);

    // Mini coin centered on shield
    const coin = miniCoin();
    coin.scale.setScalar(0.4);
    coin.position.z = 0.08;
    g.add(coin);

    // Soft emissive glow sphere behind
    const glowGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMat = toonMat(PALETTE.gold, {
        transparent: true, opacity: 0.15,
        emissive: PALETTE.gold, emissiveIntensity: 0.4,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.z = -0.05;
    g.add(glow);

    return g;
}

// ─── R16: Crossfire ───────────────────────────────────────────────────────────
// Two mini tower silhouettes crossed in X + explosion burst at intersection
function buildR16() {
    const g = new THREE.Group();

    // Two towers crossed in an X
    const t1 = miniTower();
    t1.scale.setScalar(0.55);
    t1.position.set(-0.15, 0.1, 0);
    t1.rotation.z = 0.45;
    g.add(t1);

    const t2 = miniTower();
    t2.scale.setScalar(0.55);
    t2.position.set(0.15, 0.1, 0);
    t2.rotation.z = -0.45;
    g.add(t2);

    // Explosion burst at intersection
    const burst = explosionBurst(0.3);
    burst.position.y = -0.1;
    g.add(burst);

    return g;
}

// ─── R17: Marked for Death ────────────────────────────────────────────────────
// Target crosshair (large) with skull centered inside
function buildR17() {
    const g = new THREE.Group();

    // Large crosshair
    const ch = crosshair(0.55);
    g.add(ch);

    // Skull centered inside
    const skull = skullShape();
    skull.scale.setScalar(0.5);
    skull.position.y = -0.02;
    g.add(skull);

    return g;
}

// ─── R18: Crowd Surfing ──────────────────────────────────────────────────────
// 3 small capsule figures (different heights) + shockwave ring around them
function buildR18() {
    const g = new THREE.Group();

    // 3 capsule figures at different heights/positions
    const colors = [PALETTE.polite, PALETTE.dancer, PALETTE.panicker];
    const xs = [-0.2, 0, 0.2];
    const heights = [0.4, 0.5, 0.35];
    for (let i = 0; i < 3; i++) {
        const fig = capsuleFigure(heights[i], colors[i]);
        fig.position.set(xs[i], -0.1, 0);
        fig.scale.setScalar(0.65);
        g.add(fig);
    }

    // Shockwave ring around them
    const ring = shockwaveRings(1, 0.5);
    ring.position.y = -0.35;
    g.add(ring);

    return g;
}

// ─── R19: Overkill Bonus ──────────────────────────────────────────────────────
// Explosion burst center + 4 mini coins flying outward at angles
function buildR19() {
    const g = new THREE.Group();

    // Central explosion burst
    const burst = explosionBurst(0.3);
    g.add(burst);

    // 4 coins flying outward
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const coin = miniCoin();
        coin.scale.setScalar(0.3);
        coin.position.set(
            Math.cos(angle) * 0.55,
            Math.sin(angle) * 0.55,
            0
        );
        g.add(coin);
    }

    return g;
}

// ─── R20: Aftershock ──────────────────────────────────────────────────────────
// Pot (cracked) + radial crack lines (thin dark cylinders) + shockwave ring
function buildR20() {
    const g = new THREE.Group();

    // Pot
    const pot = miniPot();
    pot.position.y = 0.05;
    pot.scale.setScalar(0.6);
    g.add(pot);

    // Crack lines radiating from pot base
    const crackMat = toonMat(PALETTE.ink);
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const crackGeo = new THREE.CylinderGeometry(0.015, 0.008, 0.25, 4);
        const crack = new THREE.Mesh(crackGeo, crackMat);
        crack.position.set(
            Math.cos(angle) * 0.2,
            -0.3,
            Math.sin(angle) * 0.2
        );
        crack.rotation.x = Math.PI / 2;
        crack.rotation.z = angle;
        g.add(crack);
    }

    // Shockwave ring at base
    const ring = shockwaveRings(1, 0.45);
    ring.position.y = -0.32;
    g.add(ring);

    return g;
}

// ─── R21: Specialist ──────────────────────────────────────────────────────────
// 1 mini tower on raised cylinder platform + 2 empty small platforms + spotlight cone
function buildR21() {
    const g = new THREE.Group();

    const platMat = toonMat(PALETTE.fixture);

    // Center platform (raised) with tower
    const mainPlatGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.12, 10);
    addWithOutline(g, mainPlatGeo, platMat, { y: -0.25 });

    const tower = miniTower();
    tower.scale.setScalar(0.5);
    tower.position.y = 0.1;
    g.add(tower);

    // 2 empty small platforms flanking
    const smallPlatGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 8);
    for (const sx of [-0.4, 0.4]) {
        addWithOutline(g, smallPlatGeo, platMat, { x: sx, y: -0.32 });
    }

    // Spotlight cone from above
    const spotGeo = new THREE.ConeGeometry(0.2, 0.5, 8, 1, true);
    const spotMat = toonMat(PALETTE.glow, { transparent: true, opacity: 0.12 });
    const spot = new THREE.Mesh(spotGeo, spotMat);
    spot.position.y = 0.55;
    spot.rotation.x = Math.PI;
    g.add(spot);

    return g;
}

// ─── R22: Recycler ────────────────────────────────────────────────────────────
// Circular chasing arrows triangle + 3 tiny coins inside the loop
function buildR22() {
    const g = new THREE.Group();

    // Circular chasing arrows
    const arrows = circularArrows(0.45);
    g.add(arrows);

    // 3 tiny coins inside the loop
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const coin = miniCoin();
        coin.scale.setScalar(0.25);
        coin.position.set(
            Math.cos(angle) * 0.15,
            0,
            Math.sin(angle) * 0.15
        );
        g.add(coin);
    }

    return g;
}

// ─── R23: Devotion ────────────────────────────────────────────────────────────
// 2 different mini towers on shared platform + heart floating between them
function buildR23() {
    const g = new THREE.Group();

    // Shared platform
    const platGeo = new THREE.BoxGeometry(0.9, 0.08, 0.35);
    addWithOutline(g, platGeo, toonMat(PALETTE.fixture), { y: -0.35 });

    // Tower 1 (left) — mop colored
    const t1 = miniTower();
    t1.scale.setScalar(0.45);
    t1.position.set(-0.3, -0.05, 0);
    // Tint top sphere mop purple
    g.add(t1);

    // Tower 2 (right) — sign colored
    const t2 = miniTower();
    t2.scale.setScalar(0.45);
    t2.position.set(0.3, -0.05, 0);
    g.add(t2);

    // Heart floating between them
    const heart = heartShape();
    heart.scale.setScalar(0.5);
    heart.position.set(0, 0.3, 0.05);
    g.add(heart);

    return g;
}

// ─── R24: Skeleton Crew ───────────────────────────────────────────────────────
// Skull with flat cap on top + 2 tiny towers flanking
function buildR24() {
    const g = new THREE.Group();

    // Central skull
    const skull = skullShape();
    skull.scale.setScalar(0.7);
    g.add(skull);

    // Flat cap on top of skull
    const capGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.06, 10);
    addWithOutline(g, capGeo, toonMat(PALETTE.charcoal), { y: 0.28 });

    const brimGeo = new THREE.CylinderGeometry(0.15, 0.3, 0.025, 10);
    const brim = new THREE.Mesh(brimGeo, toonMat(PALETTE.charcoal));
    brim.position.set(0, 0.25, 0.1);
    brim.rotation.x = -0.15;
    g.add(brim);

    // 2 tiny towers flanking
    for (const sx of [-0.5, 0.5]) {
        const t = miniTower();
        t.scale.setScalar(0.3);
        t.position.set(sx, -0.1, 0);
        g.add(t);
    }

    return g;
}

// ─── R25: Compound Interest ───────────────────────────────────────────────────
// Coin stack in ascending staircase (4 columns) + arrow up alongside
function buildR25() {
    const g = new THREE.Group();

    // 4 ascending columns of coins
    const goldMat = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10);
    for (let col = 0; col < 4; col++) {
        const count = col + 1;
        for (let row = 0; row < count; row++) {
            addWithOutline(g, coinGeo, goldMat, {
                x: (col - 1.5) * 0.22,
                y: -0.3 + row * 0.06,
            });
        }
    }

    // Arrow up alongside
    const arrow = arrowUp(0.5);
    arrow.position.set(0.5, 0.05, 0);
    arrow.scale.setScalar(0.7);
    g.add(arrow);

    return g;
}

// ─── R26: Controlled Demolition ───────────────────────────────────────────────
// Mini tower + red cylinder (TNT) strapped to side + explosion burst behind
function buildR26() {
    const g = new THREE.Group();

    // Mini tower front-center
    const tower = miniTower();
    tower.scale.setScalar(0.5);
    tower.position.set(-0.15, -0.05, 0.1);
    g.add(tower);

    // Red TNT cylinder strapped to tower side
    const tntGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8);
    addWithOutline(g, tntGeo, matDanger(), { x: 0.05, y: -0.05, z: 0.15 });

    // Small fuse line on top
    const fuseGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 4);
    const fuse = new THREE.Mesh(fuseGeo, toonMat(PALETTE.ink));
    fuse.position.set(0.05, 0.1, 0.15);
    fuse.rotation.z = 0.5;
    g.add(fuse);

    // Explosion burst behind
    const burst = explosionBurst(0.3);
    burst.position.set(0.15, 0.05, -0.15);
    g.add(burst);

    return g;
}

// ─── R27: Double Shift ────────────────────────────────────────────────────────
// Large clock face with hands at blur angle + crack lines radiating from center
function buildR27() {
    const g = new THREE.Group();

    // Clock face
    const clock = clockFace(0.5);
    g.add(clock);

    // Crack lines radiating from clock center
    const crackMat = toonMat(PALETTE.danger);
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + 0.3;
        const crackGeo = new THREE.BoxGeometry(0.02, 0.18, 0.02);
        const crack = new THREE.Mesh(crackGeo, crackMat);
        crack.position.set(
            Math.cos(angle) * 0.2,
            Math.sin(angle) * 0.2,
            0.06
        );
        crack.rotation.z = angle + Math.PI / 2;
        g.add(crack);
    }

    return g;
}

// ─── R28: Danger Pay ──────────────────────────────────────────────────────────
// Mini tower front-lit (emissive warm) + shadow plane behind, contrast
function buildR28() {
    const g = new THREE.Group();

    // Tower with warm emissive glow
    const tower = miniTower();
    tower.scale.setScalar(0.6);
    tower.position.set(0, 0, 0.1);
    g.add(tower);

    // Warm front glow
    const glowGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const glowMat = toonMat(PALETTE.glow, {
        transparent: true, opacity: 0.2,
        emissive: PALETTE.gold, emissiveIntensity: 0.5,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, 0.2);
    g.add(glow);

    // Dark shadow plane behind
    const shadowGeo = new THREE.PlaneGeometry(0.7, 0.9);
    const shadowMat = toonMat(PALETTE.ink, { transparent: true, opacity: 0.3 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(0.05, 0, -0.1);
    g.add(shadow);

    return g;
}

// ─── R29: Contagion ───────────────────────────────────────────────────────────
// Spiky sphere (icosahedron with small spike cones) + 3 expanding shockwave rings
function buildR29() {
    const g = new THREE.Group();

    // Central icosahedron core
    const coreGeo = new THREE.IcosahedronGeometry(0.2, 0);
    const coreMat = toonMat(PALETTE.ubik);
    addWithOutline(g, coreGeo, coreMat, { y: 0.1 });

    // Spike cones on icosahedron vertices
    const spikeGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
    const positions = new THREE.IcosahedronGeometry(0.2, 0).getAttribute('position');
    const seen = new Set();
    for (let i = 0; i < positions.count; i++) {
        const key = `${positions.getX(i).toFixed(2)},${positions.getY(i).toFixed(2)},${positions.getZ(i).toFixed(2)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const spike = new THREE.Mesh(spikeGeo, coreMat);
        const dir = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
        dir.normalize();
        spike.position.copy(dir.multiplyScalar(0.25));
        spike.position.y += 0.1;
        spike.lookAt(spike.position.clone().add(dir));
        spike.rotation.x += Math.PI / 2;
        g.add(spike);
    }

    // 3 expanding shockwave rings
    const rings = shockwaveRings(3, 0.3);
    rings.position.y = -0.25;
    g.add(rings);

    return g;
}

// ─── R30: Sympathetic Damage ──────────────────────────────────────────────────
// 2 small capsule figures with curved torus arc between them + spark at midpoint
function buildR30() {
    const g = new THREE.Group();

    // Two capsule figures
    const fig1 = capsuleFigure(0.45, PALETTE.polite);
    fig1.position.set(-0.35, -0.1, 0);
    fig1.scale.setScalar(0.65);
    g.add(fig1);

    const fig2 = capsuleFigure(0.45, PALETTE.panicker);
    fig2.position.set(0.35, -0.1, 0);
    fig2.scale.setScalar(0.65);
    g.add(fig2);

    // Curved arc between them
    const arcGeo = new THREE.TorusGeometry(0.3, 0.02, 6, 16, Math.PI);
    const arcMat = toonMat(PALETTE.danger, { transparent: true, opacity: 0.5 });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.y = 0.2;
    arc.rotation.z = Math.PI;
    g.add(arc);

    // Spark at midpoint
    const sparks = sparkSpheres(4, 0.15);
    sparks.position.y = 0.2;
    g.add(sparks);

    return g;
}

// ─── R31: Rush Defense ────────────────────────────────────────────────────────
// Hourglass (2 cones tip-to-tip) with lightning bolt in top half
function buildR31() {
    const g = new THREE.Group();

    // Top cone (inverted)
    const coneGeo = new THREE.ConeGeometry(0.25, 0.4, 8);
    const glassMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.4 });
    addWithOutline(g, coneGeo, glassMat, { y: 0.2 }, { x: Math.PI });

    // Bottom cone
    addWithOutline(g, coneGeo, glassMat, { y: -0.2 });

    // Frame rings at top, middle, bottom
    const ringMat = toonMat(PALETTE.fixture);
    const ringGeo = new THREE.TorusGeometry(0.26, 0.025, 6, 14);
    for (const y of [0.4, 0, -0.4]) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = y;
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
    }

    // Lightning bolt in top half
    const bolt = lightningBolt(0.35);
    bolt.position.y = 0.15;
    bolt.scale.setScalar(0.5);
    g.add(bolt);

    return g;
}

// ─── R32: Attrition ───────────────────────────────────────────────────────────
// Vertical cylinder tube + red inner fill cylinder at ~80% + bulb sphere at base
function buildR32() {
    const g = new THREE.Group();

    // Outer tube (translucent)
    const tubeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12);
    const tubeMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.3 });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    g.add(tube);

    // Tube frame rings
    const frameMat = toonMat(PALETTE.fixture);
    const frameGeo = new THREE.TorusGeometry(0.16, 0.02, 6, 12);
    for (const y of [0.4, -0.4]) {
        const ring = new THREE.Mesh(frameGeo, frameMat);
        ring.position.y = y;
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
    }

    // Red inner fill at ~80%
    const fillH = 0.8 * 0.8;
    const fillGeo = new THREE.CylinderGeometry(0.12, 0.12, fillH, 10);
    const fillMat = toonMat(PALETTE.danger, { transparent: true, opacity: 0.6 });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.position.y = -0.4 + fillH / 2;
    g.add(fill);

    // Bulb sphere at base
    const bulbGeo = new THREE.SphereGeometry(0.18, 10, 8);
    addWithOutline(g, bulbGeo, matDanger(), { y: -0.55 });

    return g;
}

// ─── R33: Plumber's Union ─────────────────────────────────────────────────────
// Wrench (box + torus head) crossed with plunger (stick + hemisphere cup) + badge disc
function buildR33() {
    const g = new THREE.Group();

    const metalMat = toonMat(PALETTE.fixture);

    // Wrench: handle + torus head
    const handleGeo = new THREE.BoxGeometry(0.07, 0.55, 0.04);
    addWithOutline(g, handleGeo, metalMat, { x: -0.15, y: -0.05 }, { z: 0.35 });

    const headGeo = new THREE.TorusGeometry(0.1, 0.035, 6, 10, Math.PI * 1.4);
    const wrenchHead = new THREE.Mesh(headGeo, metalMat);
    wrenchHead.position.set(-0.35, 0.2, 0);
    wrenchHead.rotation.z = 0.35 + Math.PI * 0.3;
    g.add(wrenchHead);

    // Plunger: stick + hemisphere cup
    const stickGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6);
    addWithOutline(g, stickGeo, toonMat(PALETTE.wood), { x: 0.15, y: -0.05 }, { z: -0.35 });

    const cupGeo = new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const cupMat = toonMat(PALETTE.danger);
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(0.35, -0.2, 0);
    cup.rotation.x = Math.PI;
    cup.rotation.z = 0.35;
    g.add(cup);

    // Badge disc behind
    const badgeGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12);
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2;
    addWithOutline(inner, badgeGeo, matGold());
    inner.position.z = -0.06;
    g.add(inner);

    return g;
}

// ─── R34: Terracotta Army ─────────────────────────────────────────────────────
// 3 small pots with tiny hemisphere helmet caps, front pot has visible crack line
function buildR34() {
    const g = new THREE.Group();

    const potColor = matPotplant();
    const helmetMat = toonMat(PALETTE.fixture);

    // 3 pots in formation
    const positions = [
        { x: 0, z: 0.1 },      // front
        { x: -0.3, z: -0.15 }, // back left
        { x: 0.3, z: -0.15 },  // back right
    ];

    for (let i = 0; i < 3; i++) {
        const p = positions[i];

        // Pot body
        const potGeo = new THREE.CylinderGeometry(0.14, 0.1, 0.2, 8);
        addWithOutline(g, potGeo, potColor, { x: p.x, y: -0.25, z: p.z });

        // Pot rim
        const rimGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 8);
        const rim = new THREE.Mesh(rimGeo, potColor);
        rim.position.set(p.x, -0.14, p.z);
        g.add(rim);

        // Hemisphere helmet cap
        const helmGeo = new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const helm = new THREE.Mesh(helmGeo, helmetMat);
        helm.position.set(p.x, -0.1, p.z);
        g.add(helm);

        // Front pot has a visible crack line
        if (i === 0) {
            const crackGeo = new THREE.BoxGeometry(0.015, 0.15, 0.02);
            const crack = new THREE.Mesh(crackGeo, toonMat(PALETTE.ink));
            crack.position.set(p.x + 0.05, -0.22, p.z + 0.12);
            crack.rotation.z = 0.3;
            g.add(crack);
        }
    }

    return g;
}

// ─── R35: Money Printer ───────────────────────────────────────────────────────
// Box machine body + roller cylinders + gold coin emerging from slot + crank handle
function buildR35() {
    const g = new THREE.Group();

    const metalMat = toonMat(PALETTE.fixture);

    // Machine body (box)
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 0.35);
    addWithOutline(g, bodyGeo, metalMat, { y: -0.05 });

    // Top panel slightly different shade
    const topGeo = new THREE.BoxGeometry(0.62, 0.04, 0.37);
    const top = new THREE.Mesh(topGeo, toonMat(PALETTE.charcoal));
    top.position.y = 0.17;
    g.add(top);

    // Roller cylinders on top
    const rollerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8);
    for (const x of [-0.12, 0.12]) {
        const inner = new THREE.Group();
        inner.rotation.z = Math.PI / 2;
        addWithOutline(inner, rollerGeo, toonMat(PALETTE.charcoal));
        inner.position.set(x, 0.22, 0);
        g.add(inner);
    }

    // Gold coin emerging from slot on right side
    const coin = miniCoin();
    coin.scale.setScalar(0.4);
    coin.position.set(0.38, 0, 0);
    coin.rotation.z = Math.PI / 6;
    g.add(coin);

    // Slot on right face
    const slotGeo = new THREE.BoxGeometry(0.02, 0.12, 0.22);
    const slot = new THREE.Mesh(slotGeo, toonMat(PALETTE.ink));
    slot.position.set(0.31, 0, 0);
    g.add(slot);

    // Crank handle on left side
    const crankShaftGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6);
    const crankShaft = new THREE.Mesh(crankShaftGeo, metalMat);
    crankShaft.position.set(-0.36, 0.05, 0);
    crankShaft.rotation.z = Math.PI / 2;
    g.add(crankShaft);

    const crankKnobGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const crankKnob = new THREE.Mesh(crankKnobGeo, metalMat);
    crankKnob.position.set(-0.42, 0.05, 0);
    g.add(crankKnob);

    // Crank arm going up
    const crankArmGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4);
    const crankArm = new THREE.Mesh(crankArmGeo, metalMat);
    crankArm.position.set(-0.42, 0.12, 0);
    g.add(crankArm);

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

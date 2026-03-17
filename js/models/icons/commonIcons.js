// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Common Tier Upgrade Icons (C1–C20)                          ║
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

// ─── C1: Overclocked Magnet ────────────────────────────────────────────────────
// Horseshoe magnet with 2 shockwave rings expanding from it + spark spheres
function buildC1() {
    const g = new THREE.Group();

    const magnet = miniMagnet();
    magnet.position.y = 0.15;
    g.add(magnet);

    const rings = shockwaveRings(2, 0.35);
    rings.position.y = -0.15;
    g.add(rings);

    const sparks = sparkSpheres(5, 0.25);
    sparks.position.y = -0.1;
    g.add(sparks);

    return g;
}

// ─── C2: Double Dip ────────────────────────────────────────────────────────────
// Gold coin tilted at 30 deg with small magnet above + curved torus arc connecting
function buildC2() {
    const g = new THREE.Group();

    const coin = miniCoin();
    coin.rotation.z = Math.PI / 6;
    coin.position.y = -0.25;
    g.add(coin);

    const magnet = miniMagnet();
    magnet.scale.setScalar(0.6);
    magnet.position.y = 0.35;
    g.add(magnet);

    const arcGeo = new THREE.TorusGeometry(0.3, 0.02, 6, 12, Math.PI);
    const arc = new THREE.Mesh(arcGeo, matGold());
    arc.rotation.z = Math.PI;
    arc.position.set(0.05, 0.05, 0);
    g.add(arc);

    return g;
}

// ─── C3: Magnet Durability ─────────────────────────────────────────────────────
// Magnet inside shield frame with rivet spheres at corners
function buildC3() {
    const g = new THREE.Group();

    const shield = shieldShape(0.8, 1.0);
    g.add(shield);

    const magnet = miniMagnet();
    magnet.scale.setScalar(0.7);
    magnet.position.z = 0.1;
    g.add(magnet);

    const rivetGeo = new THREE.SphereGeometry(0.045, 6, 6);
    const rivetMat = toonMat(PALETTE.fixture);
    const corners = [
        { x: -0.3, y: 0.25 }, { x: 0.3, y: 0.25 },
        { x: -0.25, y: -0.2 }, { x: 0.25, y: -0.2 },
    ];
    for (const c of corners) {
        addWithOutline(g, rivetGeo, rivetMat, { x: c.x, y: c.y, z: 0.12 });
    }

    return g;
}

// ─── C4: Reinforced Signs ──────────────────────────────────────────────────────
// Warning sign with thick torus frame border, 4 bolt spheres at corners
function buildC4() {
    const g = new THREE.Group();

    const sign = miniSign();
    g.add(sign);

    const frameGeo = new THREE.TorusGeometry(0.42, 0.04, 8, 3);
    addWithOutline(g, frameGeo, toonMat(PALETTE.fixture), { y: 0.02, z: -0.02 });

    const boltGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const boltMat = toonMat(PALETTE.fixture);
    const bolts = [
        { x: -0.32, y: -0.2 }, { x: 0.32, y: -0.2 },
        { x: -0.16, y: 0.3 }, { x: 0.16, y: 0.3 },
    ];
    for (const b of bolts) {
        addWithOutline(g, boltGeo, boltMat, { x: b.x, y: b.y, z: 0.07 });
    }

    return g;
}

// ─── C5: Extra Slippery ────────────────────────────────────────────────────────
// Warning sign on flat puddle disc, 3 splash droplets arcing off
function buildC5() {
    const g = new THREE.Group();

    const puddle = puddleDisc(0.55);
    puddle.position.y = -0.35;
    g.add(puddle);

    const sign = miniSign();
    sign.scale.setScalar(0.8);
    sign.position.y = 0.1;
    g.add(sign);

    const drops = splashDroplets(3);
    drops.position.set(0.15, -0.15, 0.1);
    g.add(drops);

    return g;
}

// ─── C6: Prickly Signs ─────────────────────────────────────────────────────────
// Warning sign with 8-10 small cone spikes radiating from edges
function buildC6() {
    const g = new THREE.Group();

    const sign = miniSign();
    g.add(sign);

    const spikeGeo = new THREE.ConeGeometry(0.04, 0.18, 5);
    const spikeMat = toonMat(PALETTE.fixture);
    const count = 9;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 0.38;
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(Math.cos(angle) * r, Math.sin(angle) * r * 0.75 + 0.02, 0);
        spike.rotation.z = angle - Math.PI / 2;
        g.add(spike);

        const olSpike = new THREE.Mesh(spikeGeo, ol());
        olSpike.position.copy(spike.position);
        olSpike.rotation.copy(spike.rotation);
        g.add(olSpike);
    }

    return g;
}

// ─── C7: Industrial Mop Head ───────────────────────────────────────────────────
// Giant wide mop head (squished hemisphere), thick handle, 180 deg torus arc
function buildC7() {
    const g = new THREE.Group();

    // Thick handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.15 });

    // Giant wide squished hemisphere mop head
    const headGeo = new THREE.SphereGeometry(0.32, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    addWithOutline(g, headGeo, matMop(), { y: -0.22 }, { x: Math.PI }, { x: 1.6, y: 0.6, z: 1.2 });

    // 180 deg arc indicator above
    const arcGeo = new THREE.TorusGeometry(0.25, 0.025, 6, 12, Math.PI);
    addWithOutline(g, arcGeo, toonMat(PALETTE.success), { y: 0.5 }, { z: Math.PI / 2 });

    return g;
}

// ─── C8: Quick Sweep ───────────────────────────────────────────────────────────
// Mop + small clock face overlay + motion streak lines
function buildC8() {
    const g = new THREE.Group();

    const mop = miniMop();
    mop.position.x = -0.15;
    g.add(mop);

    const clock = clockFace(0.3);
    clock.position.set(0.25, 0.2, 0.1);
    g.add(clock);

    const lines = motionLines(3, 0.25);
    lines.position.set(0.1, -0.1, 0);
    g.add(lines);

    return g;
}

// ─── C9: Heavy Mop ────────────────────────────────────────────────────────────
// Oversized thick box-shaped mop head, reinforced handle, impact star at tip
function buildC9() {
    const g = new THREE.Group();

    // Reinforced handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.6, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.1 });

    // Metal band reinforcement
    const bandGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8);
    addWithOutline(g, bandGeo, toonMat(PALETTE.fixture), { y: -0.1 });

    // Oversized thick box mop head
    const headGeo = new THREE.BoxGeometry(0.5, 0.18, 0.3);
    addWithOutline(g, headGeo, matMop(), { y: -0.3 });

    // Impact star at bottom tip
    const star = miniStar();
    star.scale.setScalar(0.35);
    star.position.set(0, -0.45, 0.1);
    g.add(star);

    return g;
}

// ─── C10: Extra Absorbent ──────────────────────────────────────────────────────
// Inflated sphere mop head, blue water droplets dripping from it
function buildC10() {
    const g = new THREE.Group();

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.2 });

    // Inflated sphere mop head
    const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
    addWithOutline(g, headGeo, matMop(), { y: -0.2 });

    // Blue water droplets dripping
    const dropGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const dropMat = toonMat(PALETTE.dancer);
    const dropPositions = [
        { x: -0.1, y: -0.5, z: 0.05 },
        { x: 0.08, y: -0.55, z: -0.03 },
        { x: 0.0, y: -0.6, z: 0.08 },
        { x: -0.05, y: -0.65, z: -0.02 },
    ];
    for (const p of dropPositions) {
        addWithOutline(g, dropGeo, dropMat, p);
    }

    return g;
}

// ─── C11: Pressure Washer ──────────────────────────────────────────────────────
// Spray can with elongated narrow nozzle + tight bright cylinder beam
function buildC11() {
    const g = new THREE.Group();

    const spray = miniSpray();
    spray.position.x = -0.1;
    g.add(spray);

    // Elongated narrow nozzle
    const nozzleGeo = new THREE.CylinderGeometry(0.02, 0.035, 0.25, 6);
    addWithOutline(g, nozzleGeo, toonMat(PALETTE.fixture),
        { x: 0.15, y: 0.32 }, { z: -Math.PI / 6 });

    // Tight bright beam
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.5, 8);
    const beamMat = toonMat(PALETTE.ubik, {
        emissive: PALETTE.ubik, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.6,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0.35, 0.5, 0);
    beam.rotation.z = -Math.PI / 6;
    g.add(beam);

    return g;
}

// ─── C12: Wide Spray ───────────────────────────────────────────────────────────
// Spray can with wide translucent cone in ubik green
function buildC12() {
    const g = new THREE.Group();

    const spray = miniSpray();
    spray.position.y = -0.1;
    g.add(spray);

    // Wide translucent cone spray
    const coneGeo = new THREE.ConeGeometry(0.45, 0.6, 12, 1, true);
    const coneMat = toonMat(PALETTE.ubik, {
        transparent: true, opacity: 0.25,
        emissive: PALETTE.ubik, emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.55;
    cone.rotation.z = Math.PI;
    g.add(cone);

    return g;
}

// ─── C13: Corrosive Formula ────────────────────────────────────────────────────
// Spray can with small skull overlay + green acid droplets dripping
function buildC13() {
    const g = new THREE.Group();

    const spray = miniSpray();
    spray.position.x = -0.15;
    g.add(spray);

    const skull = skullShape();
    skull.scale.setScalar(0.55);
    skull.position.set(0.25, 0.1, 0.15);
    g.add(skull);

    // Green acid droplets
    const acidGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const acidMat = toonMat(PALETTE.ubik, { emissive: PALETTE.ubik, emissiveIntensity: 0.4 });
    const drips = [
        { x: -0.2, y: -0.4, z: 0.05 },
        { x: -0.05, y: -0.45, z: -0.03 },
        { x: 0.1, y: -0.5, z: 0.07 },
    ];
    for (const p of drips) {
        addWithOutline(g, acidGeo, acidMat, p);
    }

    return g;
}

// ─── C14: Rapid Spray ──────────────────────────────────────────────────────────
// Spray can with 3 angled small cones (spray bursts) + speed line cylinders
function buildC14() {
    const g = new THREE.Group();

    const spray = miniSpray();
    spray.position.y = -0.1;
    g.add(spray);

    // 3 angled spray burst cones
    const burstGeo = new THREE.ConeGeometry(0.1, 0.25, 8);
    const burstMat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.5 });
    const angles = [-0.3, 0, 0.3];
    for (const a of angles) {
        const burst = new THREE.Mesh(burstGeo, burstMat);
        burst.position.set(Math.sin(a) * 0.15, 0.35, 0);
        burst.rotation.z = a;
        g.add(burst);
    }

    // Speed lines
    const lines = motionLines(3, 0.2);
    lines.position.set(0.15, 0.1, 0);
    g.add(lines);

    return g;
}

// ─── C15: Spring-Loaded Pot ────────────────────────────────────────────────────
// Pot plant sitting atop spring coil, slight upward offset
function buildC15() {
    const g = new THREE.Group();

    const coil = springCoil(0.18, 0.4, 4);
    coil.position.y = -0.25;
    g.add(coil);

    const pot = miniPot();
    pot.scale.setScalar(0.8);
    pot.position.y = 0.2;
    g.add(pot);

    return g;
}

// ─── C16: Cactus Pot ───────────────────────────────────────────────────────────
// Terracotta pot + tall cactus (cylinder + sphere top) with small cone thorns
function buildC16() {
    const g = new THREE.Group();

    // Terracotta pot
    const potGeo = new THREE.CylinderGeometry(0.25, 0.16, 0.3, 8);
    addWithOutline(g, potGeo, matPotplant(), { y: -0.35 });

    const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.05, 8);
    addWithOutline(g, rimGeo, matPotplant(), { y: -0.18 });

    // Cactus body
    const cactusMat = toonMat(PALETTE.success);
    const bodyGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.55, 8);
    addWithOutline(g, bodyGeo, cactusMat, { y: 0.08 });

    // Cactus top sphere
    const topGeo = new THREE.SphereGeometry(0.1, 8, 6);
    addWithOutline(g, topGeo, cactusMat, { y: 0.38 });

    // Small cone thorns
    const thornGeo = new THREE.ConeGeometry(0.02, 0.08, 4);
    const thornMat = toonMat(PALETTE.cream);
    const thornAngles = [0, 0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9, 5.6];
    for (let i = 0; i < thornAngles.length; i++) {
        const a = thornAngles[i];
        const ty = -0.05 + (i % 3) * 0.15;
        const thorn = new THREE.Mesh(thornGeo, thornMat);
        thorn.position.set(Math.cos(a) * 0.12, ty, Math.sin(a) * 0.12);
        thorn.lookAt(Math.cos(a) * 2, ty, Math.sin(a) * 2);
        thorn.rotation.x += Math.PI / 2;
        g.add(thorn);
    }

    return g;
}

// ─── C17: Glass Cannon ─────────────────────────────────────────────────────────
// Crystal tapered cylinder (translucent white), crack lines, small explosion at barrel
function buildC17() {
    const g = new THREE.Group();

    // Crystal barrel — tapered translucent cylinder
    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.16, 0.7, 8);
    const crystalMat = toonMat(PALETTE.white, {
        transparent: true, opacity: 0.5,
        emissive: PALETTE.glow, emissiveIntensity: 0.3,
    });
    addWithOutline(g, barrelGeo, crystalMat, null, null, { x: 1, y: 1, z: 1 });

    // Crack lines (thin dark cylinders across surface)
    const crackGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4);
    const crackMat = toonMat(PALETTE.ink);
    const cracks = [
        { pos: { x: 0.09, y: 0.05, z: 0.05 }, rot: { z: 0.5, x: 0.3 } },
        { pos: { x: -0.07, y: -0.1, z: 0.08 }, rot: { z: -0.4, x: -0.2 } },
        { pos: { x: 0.05, y: -0.15, z: -0.07 }, rot: { z: 0.6, x: 0.5 } },
    ];
    for (const c of cracks) {
        const crack = new THREE.Mesh(crackGeo, crackMat);
        crack.position.set(c.pos.x, c.pos.y, c.pos.z);
        crack.rotation.set(c.rot.x || 0, 0, c.rot.z || 0);
        g.add(crack);
    }

    // Small explosion at barrel tip
    const burst = explosionBurst(0.25);
    burst.position.y = 0.45;
    g.add(burst);

    return g;
}

// ─── C18: Slow and Steady ──────────────────────────────────────────────────────
// Anvil body (trapezoid box), hexagonal pattern on surface
function buildC18() {
    const g = new THREE.Group();

    const anvilMat = toonMat(PALETTE.charcoal);

    // Anvil top (wide)
    const topGeo = new THREE.BoxGeometry(0.7, 0.2, 0.4);
    addWithOutline(g, topGeo, anvilMat, { y: 0.15 });

    // Anvil body (narrower)
    const bodyGeo = new THREE.BoxGeometry(0.45, 0.25, 0.35);
    addWithOutline(g, bodyGeo, anvilMat, { y: -0.08 });

    // Anvil base (wider again)
    const baseGeo = new THREE.BoxGeometry(0.6, 0.1, 0.4);
    addWithOutline(g, baseGeo, anvilMat, { y: -0.25 });

    // Hexagonal pattern on top surface (small hex outlines)
    const hexMat = toonMat(PALETTE.fixture, { transparent: true, opacity: 0.6 });
    const hexGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 6);
    const hexPositions = [
        { x: 0, z: 0 }, { x: 0.14, z: 0 }, { x: -0.14, z: 0 },
        { x: 0.07, z: 0.12 }, { x: -0.07, z: 0.12 },
        { x: 0.07, z: -0.12 }, { x: -0.07, z: -0.12 },
    ];
    for (const h of hexPositions) {
        const hex = new THREE.Mesh(hexGeo, hexMat);
        hex.position.set(h.x, 0.26, h.z);
        g.add(hex);
    }

    return g;
}

// ─── C19: Bargain Bin ──────────────────────────────────────────────────────────
// Cracked pot (with gap) + price tag dangling from rim
function buildC19() {
    const g = new THREE.Group();

    // Cracked pot — use cylinder with partial arc to show gap
    const potGeo = new THREE.CylinderGeometry(0.24, 0.15, 0.32, 8, 1, false, 0.3, Math.PI * 1.7);
    addWithOutline(g, potGeo, matPotplant(), { y: -0.1 });

    // Rim (also with gap)
    const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 8, 1, false, 0.3, Math.PI * 1.7);
    addWithOutline(g, rimGeo, matPotplant(), { y: 0.07 });

    // Crack line accent (thin dark cylinder along gap)
    const crackGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
    const crack = new THREE.Mesh(crackGeo, toonMat(PALETTE.ink));
    crack.position.set(0.22, -0.08, 0.08);
    crack.rotation.z = 0.15;
    g.add(crack);

    // Price tag dangling from rim
    const tag = priceTag(0.3, 0.4);
    tag.position.set(-0.15, 0.35, 0.15);
    tag.rotation.z = 0.2;
    g.add(tag);

    return g;
}

// ─── C20: Static Charge ────────────────────────────────────────────────────────
// Magnet + lightning bolt crackling between two pole tips + spark particles
function buildC20() {
    const g = new THREE.Group();

    const magnet = miniMagnet();
    magnet.position.y = 0.15;
    g.add(magnet);

    // Lightning bolt between poles
    const bolt = lightningBolt(0.5);
    bolt.position.set(0, -0.1, 0.05);
    bolt.scale.set(0.7, 0.7, 0.7);
    g.add(bolt);

    // Spark particles around pole tips
    const sparkMat = toonMat(PALETTE.gold, {
        emissive: PALETTE.gold, emissiveIntensity: 0.6,
    });
    const sparkGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const sparkPositions = [
        { x: -0.3, y: -0.05, z: 0.05 },
        { x: 0.3, y: -0.05, z: 0.05 },
        { x: -0.25, y: 0.05, z: -0.03 },
        { x: 0.25, y: 0.05, z: -0.03 },
        { x: -0.28, y: -0.1, z: 0.08 },
        { x: 0.28, y: -0.1, z: 0.08 },
    ];
    for (const p of sparkPositions) {
        const spark = new THREE.Mesh(sparkGeo, sparkMat);
        spark.position.set(p.x, p.y, p.z);
        g.add(spark);
    }

    return g;
}

// ─── EXPORT ────────────────────────────────────────────────────────────────────

export const COMMON_ICON_BUILDERS = {
    C1:  buildC1,
    C2:  buildC2,
    C3:  buildC3,
    C4:  buildC4,
    C5:  buildC5,
    C6:  buildC6,
    C7:  buildC7,
    C8:  buildC8,
    C9:  buildC9,
    C10: buildC10,
    C11: buildC11,
    C12: buildC12,
    C13: buildC13,
    C14: buildC14,
    C15: buildC15,
    C16: buildC16,
    C17: buildC17,
    C18: buildC18,
    C19: buildC19,
    C20: buildC20,
};

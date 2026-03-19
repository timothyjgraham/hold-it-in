// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Common Tier Upgrade Icons (C1–C20)                          ║
// ║  Each icon = ONE clear symbolic object, 3-8 geometry pieces, polished.    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../../data/palette.js';
import { toonMat, matGold, matDanger, matSign, matMop, matUbik, matPotplant } from '../../shaders/toonMaterials.js';
import { ol, addWithOutline } from './iconPrimitives.js';

// ─── HELPERS ────────────────────────────────────────────────────────────────

// Reusable extruded lightning bolt shape
function _boltGeo(scale = 1) {
    const s = new THREE.Shape();
    s.moveTo(0.06 * scale, 0.28 * scale);
    s.lineTo(0.18 * scale, 0.28 * scale);
    s.lineTo(0.04 * scale, 0.04 * scale);
    s.lineTo(0.14 * scale, 0.04 * scale);
    s.lineTo(-0.06 * scale, -0.28 * scale);
    s.lineTo(-0.18 * scale, -0.28 * scale);
    s.lineTo(-0.02 * scale, -0.02 * scale);
    s.lineTo(-0.12 * scale, -0.02 * scale);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.08 * scale, bevelEnabled: true,
        bevelThickness: 0.02 * scale, bevelSize: 0.02 * scale, bevelSegments: 1,
    });
    geo.center();
    return geo;
}

// Reusable horseshoe magnet: returns group. R=arc radius, t=tube thickness
function _magnet(R = 0.36, t = 0.09) {
    const g = new THREE.Group();
    addWithOutline(g, new THREE.TorusGeometry(R, t, 12, 20, Math.PI),
        matDanger(), { y: 0.1 }, { x: -Math.PI / 2 });
    const tipGeo = new THREE.CylinderGeometry(t + 0.01, t + 0.01, 0.22, 10);
    const tipMat = toonMat(PALETTE.fixture);
    addWithOutline(g, tipGeo, tipMat, { x: -R, y: -0.01 });
    addWithOutline(g, tipGeo, tipMat, { x: R, y: -0.01 });
    return g;
}

// Reusable A-frame sign: returns group
function _aframeSign(w = 0.5, h = 0.6) {
    const g = new THREE.Group();
    const sm = matSign();
    const panel = new THREE.BoxGeometry(w, h, 0.04);
    addWithOutline(g, panel, sm, { z: 0.1, y: 0.05 }, { x: 0.18 });
    addWithOutline(g, panel, sm, { z: -0.1, y: 0.05 }, { x: -0.18 });
    addWithOutline(g, new THREE.BoxGeometry(w, 0.05, 0.05), toonMat(PALETTE.fixture), { y: h / 2 + 0.03 });
    // Exclamation mark on front
    addWithOutline(g, new THREE.CylinderGeometry(0.025, 0.025, 0.15, 6),
        toonMat(PALETTE.ink), { y: 0.12, z: 0.14 }, { x: 0.18 });
    addWithOutline(g, new THREE.SphereGeometry(0.03, 6, 6),
        toonMat(PALETTE.ink), { y: -0.02, z: 0.14 });
    // Feet
    const foot = new THREE.BoxGeometry(0.16, 0.05, 0.22);
    addWithOutline(g, foot, sm, { x: -w * 0.36, y: -h / 2 + 0.02 });
    addWithOutline(g, foot, sm, { x: w * 0.36, y: -h / 2 + 0.02 });
    return g;
}

// Reusable spray can: returns group
function _sprayCan() {
    const g = new THREE.Group();
    const R = 0.17, H = 0.48;
    addWithOutline(g, new THREE.CylinderGeometry(R, R, H, 12), matUbik());
    addWithOutline(g, new THREE.SphereGeometry(R, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        matUbik(), { y: H / 2 });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.1, 12), toonMat(PALETTE.white)));
    addWithOutline(g, new THREE.CylinderGeometry(0.035, 0.05, 0.06, 6),
        toonMat(PALETTE.fixture), { y: H / 2 + 0.06 });
    return g;
}

// Reusable mop: returns group
function _mop() {
    const g = new THREE.Group();
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8),
        toonMat(PALETTE.wood), { y: 0.1 });
    addWithOutline(g, new THREE.SphereGeometry(0.22, 10, 8), matMop(),
        { y: -0.28 }, null, { x: 1.3, y: 0.65, z: 1.0 });
    return g;
}

// Reusable pot: returns group
function _pot() {
    const g = new THREE.Group();
    addWithOutline(g, new THREE.CylinderGeometry(0.28, 0.18, 0.32, 10), matPotplant(), { y: -0.3 });
    addWithOutline(g, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), matPotplant(), { y: -0.12 });
    addWithOutline(g, new THREE.SphereGeometry(0.2, 8, 6), toonMat(PALETTE.success), { y: 0.08 });
    return g;
}

// Reusable extruded shield
function _shieldGeo() {
    const s = new THREE.Shape();
    const w = 0.35, h = 0.5;
    s.moveTo(0, -h / 2);
    s.quadraticCurveTo(-w * 1.2, -h * 0.05, -w, h * 0.25);
    s.lineTo(-w, h * 0.35);
    s.quadraticCurveTo(0, h * 0.55, 0, h / 2);
    s.quadraticCurveTo(0, h * 0.55, w, h * 0.35);
    s.lineTo(w, h * 0.25);
    s.quadraticCurveTo(w * 1.2, -h * 0.05, 0, -h / 2);
    const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.08, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1,
    });
    geo.center();
    return geo;
}

// ─── C1: Overclocked Magnet ────────────────────────────────────────────────────
function buildC1() {
    const g = new THREE.Group();
    const mag = _magnet(0.38, 0.1);
    g.add(mag);
    // Lightning bolt between poles
    addWithOutline(g, _boltGeo(1), toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.5 }),
        { y: -0.15 });
    return g;
}

// ─── C2: Double Dip ────────────────────────────────────────────────────────────
function buildC2() {
    const g = new THREE.Group();
    const gold = matGold();
    const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 18);
    // Back coin
    addWithOutline(g, coinGeo, gold, { x: -0.08, y: 0.05, z: -0.08 },
        { x: Math.PI / 2 + 0.15, z: -0.1 });
    // Front coin (overlapping)
    addWithOutline(g, coinGeo, gold, { x: 0.08, y: -0.05, z: 0.08 },
        { x: Math.PI / 2 - 0.15, z: 0.1 });
    return g;
}

// ─── C3: Magnet Durability ─────────────────────────────────────────────────────
function buildC3() {
    const g = new THREE.Group();
    // Shield behind
    addWithOutline(g, _shieldGeo(), toonMat(PALETTE.wall), { z: -0.08 });
    // Magnet in front
    const mag = _magnet(0.3, 0.08);
    mag.position.z = 0.04;
    g.add(mag);
    return g;
}

// ─── C4: Reinforced Signs ──────────────────────────────────────────────────────
function buildC4() {
    const g = new THREE.Group();
    const sign = _aframeSign();
    g.add(sign);
    // 3 hex bolts on front
    const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 6);
    const boltMat = toonMat(PALETTE.fixture);
    for (const [x, y] of [[-0.15, -0.12], [0.15, -0.12], [0, 0.22]]) {
        addWithOutline(g, boltGeo, boltMat, { x, y, z: 0.16 }, { x: Math.PI / 2 });
    }
    return g;
}

// ─── C5: Extra Slippery ────────────────────────────────────────────────────────
function buildC5() {
    const g = new THREE.Group();
    const sign = _aframeSign(0.45, 0.55);
    sign.position.y = 0.08;
    g.add(sign);
    // Puddle underneath
    addWithOutline(g, new THREE.CylinderGeometry(0.5, 0.55, 0.03, 16),
        toonMat(PALETTE.ubik, { transparent: true, opacity: 0.4 }), { y: -0.32 });
    return g;
}

// ─── C6: Prickly Signs ─────────────────────────────────────────────────────────
function buildC6() {
    const g = new THREE.Group();
    const sign = _aframeSign(0.45, 0.55);
    g.add(sign);
    // 8 spikes radiating from sign
    const spikeGeo = new THREE.ConeGeometry(0.04, 0.16, 5);
    const spikeMat = toonMat(PALETTE.fixture);
    const spikes = [
        { x: -0.14, y: 0.12, z: 0.15, rx: Math.PI / 2 },
        { x: 0.14, y: 0.12, z: 0.15, rx: Math.PI / 2 },
        { x: 0, y: -0.05, z: 0.15, rx: Math.PI / 2 },
        { x: 0.25, y: 0.05, z: 0, rz: -Math.PI / 2 },
        { x: -0.25, y: 0.05, z: 0, rz: Math.PI / 2 },
        { x: 0.25, y: -0.12, z: 0, rz: -Math.PI / 2 },
        { x: -0.25, y: -0.12, z: 0, rz: Math.PI / 2 },
        { x: 0, y: 0.22, z: 0.15, rx: Math.PI / 2 },
    ];
    for (const s of spikes) {
        addWithOutline(g, spikeGeo, spikeMat,
            { x: s.x, y: s.y, z: s.z },
            { x: s.rx || 0, z: s.rz || 0 });
    }
    return g;
}

// ─── C7: Industrial Mop Head ───────────────────────────────────────────────────
function buildC7() {
    const g = new THREE.Group();
    // Thick handle
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), toonMat(PALETTE.wood), { y: 0.15 });
    // Extra-wide rectangular mop head
    addWithOutline(g, new THREE.BoxGeometry(0.7, 0.12, 0.25), matMop(), { y: -0.28 });
    return g;
}

// ─── C8: Quick Sweep ───────────────────────────────────────────────────────────
function buildC8() {
    const g = new THREE.Group();
    const mop = _mop();
    mop.position.x = -0.12;
    g.add(mop);
    // Clock face (white disc + 2 hands)
    const clockGrp = new THREE.Group();
    clockGrp.rotation.x = Math.PI / 2;
    addWithOutline(clockGrp, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), toonMat(PALETTE.white));
    addWithOutline(clockGrp, new THREE.TorusGeometry(0.2, 0.018, 6, 16), toonMat(PALETTE.fixture));
    const ink = toonMat(PALETTE.ink);
    clockGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.015), ink));
    clockGrp.children[clockGrp.children.length - 1].position.set(0, 0.06, 0.025);
    clockGrp.children[clockGrp.children.length - 1].rotation.z = -0.3;
    clockGrp.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.015), ink));
    clockGrp.children[clockGrp.children.length - 1].position.set(0, 0.04, 0.025);
    clockGrp.children[clockGrp.children.length - 1].rotation.z = 0.8;
    clockGrp.position.set(0.25, 0.2, 0);
    g.add(clockGrp);
    return g;
}

// ─── C9: Heavy Mop ────────────────────────────────────────────────────────────
function buildC9() {
    const g = new THREE.Group();
    // Thick reinforced handle
    addWithOutline(g, new THREE.CylinderGeometry(0.045, 0.04, 0.6, 8), toonMat(PALETTE.wood), { y: 0.12 });
    addWithOutline(g, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), toonMat(PALETTE.fixture), { y: -0.08 });
    // Massive wide mop head
    addWithOutline(g, new THREE.BoxGeometry(0.6, 0.18, 0.3), matMop(), { y: -0.28 });
    // Impact star below
    const starS = new THREE.Shape();
    for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 6;
        const r = i % 2 === 0 ? 0.16 : 0.08;
        if (i === 0) starS.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else starS.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    starS.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starS, { depth: 0.05, bevelEnabled: false });
    starGeo.center();
    addWithOutline(g, starGeo, matGold(), { y: -0.42 });
    return g;
}

// ─── C10: Extra Absorbent ──────────────────────────────────────────────────────
function buildC10() {
    const g = new THREE.Group();
    const mop = _mop();
    g.add(mop);
    // Green HP cross
    const hm = toonMat(PALETTE.success, { emissive: PALETTE.success, emissiveIntensity: 0.4 });
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), hm, { x: 0.35, y: -0.15 }, { z: Math.PI / 2 });
    addWithOutline(g, new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6), hm, { x: 0.35, y: -0.15 });
    return g;
}

// ─── C11: Pressure Washer ──────────────────────────────────────────────────────
function buildC11() {
    const g = new THREE.Group();
    const can = _sprayCan();
    can.position.set(-0.08, -0.1, 0);
    g.add(can);
    // Long nozzle
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.04, 0.25, 6),
        toonMat(PALETTE.fixture), { x: 0.12, y: 0.22 }, { z: -0.3 });
    // Tight beam
    const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.03, 0.4, 8),
        toonMat(PALETTE.ubik, { emissive: PALETTE.ubik, emissiveIntensity: 0.5, transparent: true, opacity: 0.5 }));
    beam.position.set(0.28, 0.42, 0);
    beam.rotation.z = -0.3;
    g.add(beam);
    return g;
}

// ─── C12: Wide Spray ───────────────────────────────────────────────────────────
function buildC12() {
    const g = new THREE.Group();
    const can = _sprayCan();
    can.position.y = -0.12;
    g.add(can);
    // Wide cone
    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 0.45, 14, 1, true),
        toonMat(PALETTE.ubik, { transparent: true, opacity: 0.2, emissive: PALETTE.ubik, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
    cone.position.y = 0.46;
    cone.rotation.x = Math.PI;
    g.add(cone);
    return g;
}

// ─── C13: Corrosive Formula ────────────────────────────────────────────────────
function buildC13() {
    const g = new THREE.Group();
    const can = _sprayCan();
    g.add(can);
    // Skull on front
    const bone = toonMat(PALETTE.white);
    addWithOutline(g, new THREE.SphereGeometry(0.11, 8, 6), bone, { y: 0.0, z: 0.2 });
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), bone);
    jaw.position.set(0, -0.09, 0.2); jaw.scale.set(1.1, 0.6, 0.8); g.add(jaw);
    const eye = toonMat(PALETTE.ink);
    addWithOutline(g, new THREE.SphereGeometry(0.03, 5, 5), eye, { x: -0.04, y: 0.02, z: 0.28 });
    addWithOutline(g, new THREE.SphereGeometry(0.03, 5, 5), eye, { x: 0.04, y: 0.02, z: 0.28 });
    return g;
}

// ─── C14: Rapid Spray ──────────────────────────────────────────────────────────
function buildC14() {
    const g = new THREE.Group();
    const can = _sprayCan();
    g.add(can);
    // Lightning bolt on front
    addWithOutline(g, _boltGeo(0.55),
        toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.5 }),
        { y: -0.02, z: 0.2 });
    return g;
}

// ─── C15: Spring-Loaded Pot ────────────────────────────────────────────────────
function buildC15() {
    const g = new THREE.Group();
    // Chunky spring (torus rings stacked)
    const springMat = toonMat(PALETTE.fixture);
    for (let i = 0; i < 4; i++) {
        addWithOutline(g, new THREE.TorusGeometry(0.15, 0.03, 6, 12), springMat,
            { y: -0.42 + i * 0.08 }, { x: Math.PI / 2 });
    }
    // Pot on top
    const pot = _pot();
    pot.position.y = 0.15;
    pot.scale.setScalar(0.8);
    g.add(pot);
    return g;
}

// ─── C16: Cactus Pot ───────────────────────────────────────────────────────────
function buildC16() {
    const g = new THREE.Group();
    // Pot
    addWithOutline(g, new THREE.CylinderGeometry(0.28, 0.18, 0.3, 10), matPotplant(), { y: -0.32 });
    addWithOutline(g, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), matPotplant(), { y: -0.15 });
    // Cactus body + arm
    const cm = toonMat(PALETTE.success);
    addWithOutline(g, new THREE.CylinderGeometry(0.12, 0.14, 0.55, 10), cm, { y: 0.12 });
    addWithOutline(g, new THREE.SphereGeometry(0.12, 10, 6), cm, { y: 0.42 });
    addWithOutline(g, new THREE.CylinderGeometry(0.06, 0.07, 0.18, 8), cm,
        { x: 0.2, y: 0.2 }, { z: -Math.PI / 3 });
    addWithOutline(g, new THREE.SphereGeometry(0.06, 6, 6), cm, { x: 0.28, y: 0.3 });
    // Thorns (6 prominent ones)
    const thornGeo = new THREE.ConeGeometry(0.025, 0.1, 4);
    const thornMat = toonMat(PALETTE.cream);
    for (const [a, y] of [[0, 0.0], [1.8, 0.0], [3.6, 0.0], [0.9, 0.2], [2.7, 0.2], [4.5, 0.2]]) {
        const thorn = new THREE.Mesh(thornGeo, thornMat);
        thorn.position.set(Math.cos(a) * 0.15, y, Math.sin(a) * 0.15);
        thorn.lookAt(Math.cos(a) * 2, y, Math.sin(a) * 2);
        thorn.rotation.x += Math.PI / 2;
        g.add(thorn);
        const o = new THREE.Mesh(thornGeo, ol());
        o.position.copy(thorn.position); o.rotation.copy(thorn.rotation); g.add(o);
    }
    return g;
}

// ─── C17: Glass Cannon ─────────────────────────────────────────────────────────
// Actual cannon — barrel on two wheels. Everyone knows what a cannon looks like.
function buildC17() {
    const g = new THREE.Group();
    const metalMat = toonMat(PALETTE.fixture);
    const woodMat = toonMat(PALETTE.wood);
    // Barrel (cylinder, slightly tapered, tilted up)
    addWithOutline(g, new THREE.CylinderGeometry(0.1, 0.14, 0.65, 10),
        metalMat, { y: 0.08 }, { z: Math.PI / 6 });
    // Barrel muzzle ring
    addWithOutline(g, new THREE.TorusGeometry(0.1, 0.025, 6, 12),
        metalMat, { x: -0.16, y: 0.4 }, { z: Math.PI / 6, x: Math.PI / 2 });
    // Barrel base ring
    addWithOutline(g, new THREE.TorusGeometry(0.14, 0.025, 6, 12),
        metalMat, { x: 0.16, y: -0.24 }, { z: Math.PI / 6, x: Math.PI / 2 });
    // Carriage (wooden box under barrel)
    addWithOutline(g, new THREE.BoxGeometry(0.35, 0.12, 0.3), woodMat, { y: -0.25 });
    // Two wheels (torus side-on)
    const wheelGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 16);
    addWithOutline(g, wheelGeo, woodMat, { x: 0, y: -0.35, z: 0.2 });
    addWithOutline(g, wheelGeo, woodMat, { x: 0, y: -0.35, z: -0.2 });
    return g;
}

// ─── C18: Slow and Steady ──────────────────────────────────────────────────────
// Turtle — dome shell, head poking out front, 4 stubby legs. Unmistakable.
function buildC18() {
    const g = new THREE.Group();
    const shellMat = toonMat(PALETTE.fixture, { emissive: PALETTE.wood, emissiveIntensity: 0.15 });
    const skinMat = toonMat(PALETTE.success);
    // Shell dome (big half-sphere)
    addWithOutline(g, new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        shellMat, { y: -0.1 });
    // Shell belly disc
    addWithOutline(g, new THREE.CylinderGeometry(0.38, 0.38, 0.04, 14),
        toonMat(PALETTE.wood), { y: -0.12 });
    // Head (poking out front)
    addWithOutline(g, new THREE.SphereGeometry(0.12, 8, 8), skinMat,
        { z: 0.38, y: -0.05 });
    // Two eyes (small dark dots on head)
    const eyeMat = toonMat(PALETTE.ink);
    addWithOutline(g, new THREE.SphereGeometry(0.03, 5, 5), eyeMat, { x: -0.05, z: 0.48, y: 0.0 });
    addWithOutline(g, new THREE.SphereGeometry(0.03, 5, 5), eyeMat, { x: 0.05, z: 0.48, y: 0.0 });
    // 4 stubby legs
    const legGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8);
    for (const [x, z] of [[0.22, 0.2], [-0.22, 0.2], [0.22, -0.2], [-0.22, -0.2]]) {
        addWithOutline(g, legGeo, skinMat, { x, y: -0.2, z });
    }
    return g;
}

// ─── C19: Bargain Bin ──────────────────────────────────────────────────────────
// Shopping cart 🛒 — wire frame basket on wheels. "Bargain bin" = store/shopping.
function buildC19() {
    const g = new THREE.Group();
    const wireMat = toonMat(PALETTE.fixture);
    // Basket body (wire frame look — box with visible edges)
    addWithOutline(g, new THREE.BoxGeometry(0.5, 0.35, 0.3), wireMat, { y: 0.0 });
    // Handle bar (horizontal at top back)
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), wireMat,
        { y: 0.25, z: -0.15 }, { z: Math.PI / 2 });
    // Handle uprights
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), wireMat,
        { x: -0.22, y: 0.25, z: -0.15 });
    addWithOutline(g, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), wireMat,
        { x: 0.22, y: 0.25, z: -0.15 });
    // 4 wheels
    const wheelGeo = new THREE.TorusGeometry(0.06, 0.02, 6, 10);
    for (const [x, z] of [[-0.2, 0.12], [0.2, 0.12], [-0.2, -0.12], [0.2, -0.12]]) {
        addWithOutline(g, wheelGeo, toonMat(PALETTE.ink), { x, y: -0.24, z });
    }
    return g;
}

// ─── C20: Static Charge ────────────────────────────────────────────────────────
function buildC20() {
    const g = new THREE.Group();
    // Big bold lightning bolt (dominant)
    addWithOutline(g, _boltGeo(1.2),
        toonMat(PALETTE.gold, { emissive: PALETTE.gold, emissiveIntensity: 0.6 }),
        { y: -0.05 });
    // Small magnet at top
    const mag = _magnet(0.2, 0.05);
    mag.position.set(0, 0.38, 0);
    mag.scale.setScalar(0.7);
    g.add(mag);
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

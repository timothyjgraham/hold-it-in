// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — 3D Upgrade Icon Factory                                     ║
// ║  Creates toon-shaded 3D models for each upgrade icon type.               ║
// ║  9 icons: magnet, coin, sign, mop, spray, pot, star, chain, door         ║
// ║  All fit within ~2 unit bounding box, use PALETTE materials + outlines.  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import {
    toonMat, outlineMatStatic,
    matGold, matDanger, matSign, matMop, matUbik, matPotplant,
} from '../shaders/toonMaterials.js';
import { createRoundedBox } from '../utils/characterGeometry.js';

// ─── SHARED ──────────────────────────────────────────────────────────────────

const _cache = {};
let _outlineMat = null;

function _ol() {
    if (!_outlineMat) _outlineMat = outlineMatStatic(0.03);
    return _outlineMat;
}

// ─── MAGNET (horseshoe magnet) ───────────────────────────────────────────────

function _buildMagnet() {
    const g = new THREE.Group();
    const R = 0.5, tube = 0.1;

    // Red horseshoe arc (half torus, stood up in XY plane)
    const arcGeo = new THREE.TorusGeometry(R, tube, 8, 16, Math.PI);

    const arc = new THREE.Mesh(arcGeo, matDanger());
    arc.rotation.x = -Math.PI / 2;
    g.add(arc);

    const arcOl = new THREE.Mesh(arcGeo, _ol());
    arcOl.rotation.x = -Math.PI / 2;
    g.add(arcOl);

    // Silver pole tips extending down from arc ends
    const tipGeo = new THREE.CylinderGeometry(tube, tube, 0.28, 8);
    const tipMat = toonMat(PALETTE.fixture);
    for (const sx of [-1, 1]) {
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(sx * R, -0.14, 0);
        g.add(tip);

        const tipOl = new THREE.Mesh(tipGeo, _ol());
        tipOl.position.set(sx * R, -0.14, 0);
        g.add(tipOl);
    }

    return g;
}

// ─── COIN (flat disc with rim detail) ────────────────────────────────────────

function _buildCoin() {
    const g = new THREE.Group();

    // Orient so flat face points toward camera (+Z)
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2;

    const gold = matGold();
    const discGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.15, 24);
    inner.add(new THREE.Mesh(discGeo, gold));
    inner.add(new THREE.Mesh(discGeo, _ol()));

    // Rim ring on face
    const rimGeo = new THREE.TorusGeometry(0.6, 0.05, 8, 24);
    const rim = new THREE.Mesh(rimGeo, gold);
    rim.position.y = 0.08;
    inner.add(rim);

    // Inner detail ring
    const innerGeo = new THREE.TorusGeometry(0.3, 0.035, 6, 16);
    const innerRing = new THREE.Mesh(innerGeo, gold);
    innerRing.position.y = 0.08;
    inner.add(innerRing);

    g.add(inner);
    return g;
}

// ─── SIGN (A-frame warning triangle with !) ──────────────────────────────────

function _buildSign() {
    const g = new THREE.Group();

    // Warning triangle shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.7);
    shape.lineTo(-0.65, -0.5);
    shape.lineTo(0.65, -0.5);
    shape.closePath();

    const triGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 1,
    });
    triGeo.center();

    g.add(new THREE.Mesh(triGeo, matSign()));
    g.add(new THREE.Mesh(triGeo, _ol()));

    // "!" exclamation mark — bar + dot in ink
    const inkMat = toonMat(PALETTE.ink);

    const barGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.32, 6);
    const bar = new THREE.Mesh(barGeo, inkMat);
    bar.position.set(0, 0.05, 0.12);
    g.add(bar);

    const dotGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const dot = new THREE.Mesh(dotGeo, inkMat);
    dot.position.set(0, -0.2, 0.12);
    g.add(dot);

    return g;
}

// ─── MOP (handle + mop head + bucket) ────────────────────────────────────────

function _buildMop() {
    const g = new THREE.Group();

    // Wooden handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
    const handle = new THREE.Mesh(handleGeo, toonMat(PALETTE.wood));
    handle.position.y = 0.1;
    g.add(handle);

    const hOl = new THREE.Mesh(handleGeo, _ol());
    hOl.position.y = 0.1;
    g.add(hOl);

    // Mop head (squished sphere at bottom)
    const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
    const head = new THREE.Mesh(headGeo, matMop());
    head.position.y = -0.55;
    head.scale.set(1.3, 0.6, 1.0);
    g.add(head);

    const headOl = new THREE.Mesh(headGeo, _ol());
    headOl.position.y = -0.55;
    headOl.scale.set(1.3, 0.6, 1.0);
    g.add(headOl);

    // Small bucket beside mop
    const bucketGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.25, 8);
    const bucket = new THREE.Mesh(bucketGeo, toonMat(PALETTE.fixture));
    bucket.position.set(0.35, -0.62, 0);
    g.add(bucket);

    const bOl = new THREE.Mesh(bucketGeo, _ol());
    bOl.position.set(0.35, -0.62, 0);
    g.add(bOl);

    return g;
}

// ─── SPRAY (aerosol can) ─────────────────────────────────────────────────────

function _buildSpray() {
    const g = new THREE.Group();
    const bodyR = 0.28, bodyH = 0.85;

    // Can body (green)
    const bodyGeo = new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 12);
    g.add(new THREE.Mesh(bodyGeo, matUbik()));
    g.add(new THREE.Mesh(bodyGeo, _ol()));

    // Top hemisphere cap
    const topGeo = new THREE.SphereGeometry(bodyR, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeo, matUbik());
    top.position.y = bodyH / 2;
    g.add(top);

    // Bottom hemisphere cap
    const botGeo = new THREE.SphereGeometry(bodyR, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bot = new THREE.Mesh(botGeo, matUbik());
    bot.position.y = -bodyH / 2;
    g.add(bot);

    // White label strip around middle
    const labelGeo = new THREE.CylinderGeometry(bodyR + 0.005, bodyR + 0.005, 0.22, 12);
    g.add(new THREE.Mesh(labelGeo, toonMat(PALETTE.white)));

    // Nozzle on top
    const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.14, 6);
    const nozzle = new THREE.Mesh(nozzleGeo, toonMat(PALETTE.fixture));
    nozzle.position.set(0.1, bodyH / 2 + 0.07, 0);
    g.add(nozzle);

    return g;
}

// ─── POT (terracotta pot with foliage) ───────────────────────────────────────

function _buildPot() {
    const g = new THREE.Group();

    // Terracotta pot (tapered cylinder)
    const potGeo = new THREE.CylinderGeometry(0.38, 0.25, 0.5, 10);
    const pot = new THREE.Mesh(potGeo, matPotplant());
    pot.position.y = -0.25;
    g.add(pot);

    const potOl = new THREE.Mesh(potGeo, _ol());
    potOl.position.y = -0.25;
    g.add(potOl);

    // Rim
    const rimGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 10);
    const rim = new THREE.Mesh(rimGeo, matPotplant());
    rim.position.y = 0.02;
    g.add(rim);

    // Green foliage blob
    const foliageMat = toonMat(PALETTE.success);

    const mainFoliage = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), foliageMat);
    mainFoliage.position.y = 0.38;
    g.add(mainFoliage);

    const fOl = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), _ol());
    fOl.position.y = 0.38;
    g.add(fOl);

    // Extra leaf blobs for organic look
    for (const [x, y, z] of [[0.2, 0.5, 0.1], [-0.18, 0.52, -0.08], [0.05, 0.58, 0.05]]) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), foliageMat);
        blob.position.set(x, y, z);
        g.add(blob);
    }

    return g;
}

// ─── STAR (5-point extruded star) ────────────────────────────────────────────

function _buildStar() {
    const g = new THREE.Group();

    // 5-point star shape
    const shape = new THREE.Shape();
    const pts = 5, outerR = 0.8, innerR = 0.35;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < pts * 2; i++) {
        const angle = startAngle + (i * Math.PI) / pts;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
    });
    geo.center();

    g.add(new THREE.Mesh(geo, matGold()));
    g.add(new THREE.Mesh(geo, _ol()));

    return g;
}

// ─── CHAIN (two interlocking torus links) ────────────────────────────────────

function _buildChain() {
    const g = new THREE.Group();
    const linkMat = toonMat(PALETTE.rarityRare);
    const geo = new THREE.TorusGeometry(0.35, 0.07, 8, 16);

    // Link 1 — standing in XY plane
    const link1 = new THREE.Mesh(geo, linkMat);
    link1.rotation.x = Math.PI / 2;
    link1.position.x = -0.18;
    g.add(link1);

    const ol1 = new THREE.Mesh(geo, _ol());
    ol1.rotation.x = Math.PI / 2;
    ol1.position.x = -0.18;
    g.add(ol1);

    // Link 2 — perpendicular, interlocking
    const link2 = new THREE.Mesh(geo, linkMat);
    link2.rotation.z = Math.PI / 2;
    link2.position.x = 0.18;
    g.add(link2);

    const ol2 = new THREE.Mesh(geo, _ol());
    ol2.rotation.z = Math.PI / 2;
    ol2.position.x = 0.18;
    g.add(ol2);

    return g;
}

// ─── DOOR (panel door with gold knob) ────────────────────────────────────────

function _buildDoor() {
    const g = new THREE.Group();

    // Door body (rounded box)
    const doorGeo = createRoundedBox(0.8, 1.4, 0.12, 0.05);
    g.add(new THREE.Mesh(doorGeo, toonMat(PALETTE.wood)));
    g.add(new THREE.Mesh(doorGeo, _ol()));

    // Panel insets (slightly raised detail)
    const panelGeo = createRoundedBox(0.5, 0.45, 0.13, 0.03);
    const panelMat = toonMat(PALETTE.wood, { emissive: PALETTE.charcoal, emissiveIntensity: 0.1 });

    const topPanel = new THREE.Mesh(panelGeo, panelMat);
    topPanel.position.y = 0.25;
    g.add(topPanel);

    const botPanel = new THREE.Mesh(panelGeo, panelMat);
    botPanel.position.y = -0.25;
    g.add(botPanel);

    // Gold doorknob
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), matGold());
    knob.position.set(0.25, 0, 0.1);
    g.add(knob);

    return g;
}

// ─── BUILDER MAP ─────────────────────────────────────────────────────────────

const _builders = {
    magnet: _buildMagnet,
    coin:   _buildCoin,
    sign:   _buildSign,
    mop:    _buildMop,
    spray:  _buildSpray,
    pot:    _buildPot,
    star:   _buildStar,
    chain:  _buildChain,
    door:   _buildDoor,
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Create a 3D icon model. Returns a cloned THREE.Group from cache.
 *
 * @param {string} iconKey — magnet|coin|sign|mop|spray|pot|star|chain|door
 * @returns {THREE.Group}
 */
export function createIconModel(iconKey) {
    const key = iconKey || 'star';
    if (!_cache[key]) {
        const builder = _builders[key] || _builders.star;
        _cache[key] = builder();
    }
    return _cache[key].clone();
}

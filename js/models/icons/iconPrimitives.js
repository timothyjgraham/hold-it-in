// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Icon Primitives Library                                      ║
// ║  Reusable sub-models for composing unique upgrade icons.                  ║
// ║  8 tower mini-primitives + ~18 helper shapes.                             ║
// ║  All return THREE.Group, use PALETTE materials + outlines.                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../../data/palette.js';
import {
    toonMat, outlineMatStatic,
    matGold, matDanger, matSign, matMop, matUbik, matPotplant,
} from '../../shaders/toonMaterials.js';
import { createRoundedBox } from '../../utils/characterGeometry.js';

// ─── SHARED ──────────────────────────────────────────────────────────────────

let _olMat = null;

export function ol() {
    if (!_olMat) _olMat = outlineMatStatic(0.025);
    return _olMat;
}

// Helper: add mesh + outline clone
export function addWithOutline(group, geo, mat, pos, rot, scale) {
    const mesh = new THREE.Mesh(geo, mat);
    if (pos) mesh.position.set(pos.x || 0, pos.y || 0, pos.z || 0);
    if (rot) mesh.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
    if (scale) {
        if (typeof scale === 'number') mesh.scale.setScalar(scale);
        else mesh.scale.set(scale.x || 1, scale.y || 1, scale.z || 1);
    }
    group.add(mesh);

    const outline = new THREE.Mesh(geo, ol());
    if (pos) outline.position.copy(mesh.position);
    if (rot) outline.rotation.copy(mesh.rotation);
    if (scale) outline.scale.copy(mesh.scale);
    group.add(outline);

    return mesh;
}

// ─── TOWER MINI-PRIMITIVES ──────────────────────────────────────────────────
// Scaled-down versions of the 9 original tower icons (~0.6 unit).

export function miniMagnet() {
    const g = new THREE.Group();
    const R = 0.3, tube = 0.06;

    const arcGeo = new THREE.TorusGeometry(R, tube, 8, 16, Math.PI);
    addWithOutline(g, arcGeo, matDanger(), null, { x: -Math.PI / 2 });

    const tipGeo = new THREE.CylinderGeometry(tube, tube, 0.17, 8);
    const tipMat = toonMat(PALETTE.fixture);
    for (const sx of [-1, 1]) {
        addWithOutline(g, tipGeo, tipMat, { x: sx * R, y: -0.085 });
    }

    return g;
}

export function miniCoin() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2;

    const gold = matGold();
    const discGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
    addWithOutline(inner, discGeo, gold);

    const rimGeo = new THREE.TorusGeometry(0.25, 0.025, 6, 16);
    const rim = new THREE.Mesh(rimGeo, gold);
    rim.position.y = 0.045;
    inner.add(rim);

    g.add(inner);
    return g;
}

export function miniSign() {
    const g = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(0, 0.4);
    shape.lineTo(-0.38, -0.3);
    shape.lineTo(0.38, -0.3);
    shape.closePath();

    const triGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.09, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1,
    });
    triGeo.center();
    addWithOutline(g, triGeo, matSign());

    const inkMat = toonMat(PALETTE.ink);
    const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6);
    const bar = new THREE.Mesh(barGeo, inkMat);
    bar.position.set(0, 0.03, 0.07);
    g.add(bar);

    const dotGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const dot = new THREE.Mesh(dotGeo, inkMat);
    dot.position.set(0, -0.12, 0.07);
    g.add(dot);

    return g;
}

export function miniMop() {
    const g = new THREE.Group();

    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6);
    addWithOutline(g, handleGeo, toonMat(PALETTE.wood), { y: 0.06 });

    const headGeo = new THREE.SphereGeometry(0.18, 8, 6);
    addWithOutline(g, headGeo, matMop(), { y: -0.32 }, null, { x: 1.3, y: 0.6, z: 1.0 });

    return g;
}

export function miniSpray() {
    const g = new THREE.Group();
    const bodyR = 0.17, bodyH = 0.5;

    const bodyGeo = new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 10);
    addWithOutline(g, bodyGeo, matUbik());

    const topGeo = new THREE.SphereGeometry(bodyR, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const top = new THREE.Mesh(topGeo, matUbik());
    top.position.y = bodyH / 2;
    g.add(top);

    const labelGeo = new THREE.CylinderGeometry(bodyR + 0.003, bodyR + 0.003, 0.13, 10);
    g.add(new THREE.Mesh(labelGeo, toonMat(PALETTE.white)));

    const nozzleGeo = new THREE.CylinderGeometry(0.035, 0.05, 0.08, 6);
    const nozzle = new THREE.Mesh(nozzleGeo, toonMat(PALETTE.fixture));
    nozzle.position.set(0.06, bodyH / 2 + 0.04, 0);
    g.add(nozzle);

    return g;
}

export function miniPot() {
    const g = new THREE.Group();

    const potGeo = new THREE.CylinderGeometry(0.23, 0.15, 0.3, 8);
    addWithOutline(g, potGeo, matPotplant(), { y: -0.15 });

    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 8);
    const rim = new THREE.Mesh(rimGeo, matPotplant());
    rim.position.y = 0.01;
    g.add(rim);

    const foliageMat = toonMat(PALETTE.success);
    const mainGeo = new THREE.SphereGeometry(0.2, 8, 6);
    addWithOutline(g, mainGeo, foliageMat, { y: 0.22 });

    for (const [x, y, z] of [[0.12, 0.3, 0.06], [-0.1, 0.31, -0.05]]) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), foliageMat);
        blob.position.set(x, y, z);
        g.add(blob);
    }

    return g;
}

export function miniStar() {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const pts = 5, outerR = 0.45, innerR = 0.2;
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
        depth: 0.12, bevelEnabled: true,
        bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2,
    });
    geo.center();
    addWithOutline(g, geo, matGold());

    return g;
}

export function miniChain() {
    const g = new THREE.Group();
    const linkMat = toonMat(PALETTE.rarityRare);
    const geo = new THREE.TorusGeometry(0.2, 0.04, 8, 12);

    addWithOutline(g, geo, linkMat, { x: -0.1 }, { x: Math.PI / 2 });
    addWithOutline(g, geo, linkMat, { x: 0.1 }, { z: Math.PI / 2 });

    return g;
}

export function miniDoor() {
    const g = new THREE.Group();

    const doorGeo = createRoundedBox(0.48, 0.84, 0.07, 0.03);
    addWithOutline(g, doorGeo, toonMat(PALETTE.wood));

    const panelGeo = createRoundedBox(0.3, 0.27, 0.08, 0.02);
    const panelMat = toonMat(PALETTE.wood, { emissive: PALETTE.charcoal, emissiveIntensity: 0.1 });
    const topPanel = new THREE.Mesh(panelGeo, panelMat);
    topPanel.position.y = 0.15;
    g.add(topPanel);
    const botPanel = new THREE.Mesh(panelGeo, panelMat);
    botPanel.position.y = -0.15;
    g.add(botPanel);

    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), matGold());
    knob.position.set(0.15, 0, 0.06);
    g.add(knob);

    return g;
}

// ─── NEW HELPER SHAPES ─────────────────────────────────────────────────────

export function lightningBolt(h = 0.8) {
    const g = new THREE.Group();
    const mat = matGold();
    const s = h / 0.8;

    // Zigzag bolt from 3 thin boxes
    const seg = new THREE.BoxGeometry(0.08 * s, 0.3 * s, 0.06 * s);
    const m1 = new THREE.Mesh(seg, mat);
    m1.position.set(0.05 * s, 0.2 * s, 0);
    m1.rotation.z = 0.3;
    g.add(m1);

    const m2 = new THREE.Mesh(seg, mat);
    m2.position.set(-0.05 * s, 0, 0);
    m2.rotation.z = -0.3;
    g.add(m2);

    const m3 = new THREE.Mesh(seg, mat);
    m3.position.set(0.05 * s, -0.2 * s, 0);
    m3.rotation.z = 0.3;
    g.add(m3);

    // Outline — snapshot children first to avoid infinite loop
    const meshes = [...g.children];
    for (const c of meshes) {
        const o = new THREE.Mesh(c.geometry, ol());
        o.position.copy(c.position);
        o.rotation.copy(c.rotation);
        g.add(o);
    }

    return g;
}

export function shieldShape(w = 0.7, h = 0.9) {
    const g = new THREE.Group();

    const shape = new THREE.Shape();
    const hw = w / 2;
    shape.moveTo(0, -h / 2);
    shape.quadraticCurveTo(-hw * 1.2, -h * 0.1, -hw, h * 0.2);
    shape.lineTo(-hw, h * 0.35);
    shape.quadraticCurveTo(0, h * 0.55, 0, h / 2);
    shape.quadraticCurveTo(0, h * 0.55, hw, h * 0.35);
    shape.lineTo(hw, h * 0.2);
    shape.quadraticCurveTo(hw * 1.2, -h * 0.1, 0, -h / 2);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.1, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1,
    });
    geo.center();
    addWithOutline(g, geo, toonMat(PALETTE.fixture));

    return g;
}

export function shockwaveRings(count = 2, baseR = 0.4) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.danger, { transparent: true, opacity: 0.5 });

    for (let i = 0; i < count; i++) {
        const r = baseR + i * 0.25;
        const ringGeo = new THREE.TorusGeometry(r, 0.025, 6, 20);
        const ring = new THREE.Mesh(ringGeo, mat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -0.1 * i;
        g.add(ring);
    }

    return g;
}

export function springCoil(r = 0.2, h = 0.5, turns = 3) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.fixture);
    const segments = turns * 12;

    for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const angle = t * turns * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = t * h - h / 2;

        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), mat);
        dot.position.set(x, y, z);
        g.add(dot);
    }

    return g;
}

export function arrowUp(h = 0.6) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.success);

    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, h * 0.6, 6);
    addWithOutline(g, shaftGeo, mat, { y: -h * 0.1 });

    const headGeo = new THREE.ConeGeometry(0.12, h * 0.35, 6);
    addWithOutline(g, headGeo, mat, { y: h * 0.3 });

    return g;
}

export function arrowDown(h = 0.6) {
    const g = arrowUp(h);
    g.rotation.z = Math.PI;
    return g;
}

export function circularArrows(r = 0.4) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.success);

    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const arcGeo = new THREE.TorusGeometry(r, 0.03, 6, 8, Math.PI * 0.55);
        const arc = new THREE.Mesh(arcGeo, mat);
        arc.rotation.z = angle;
        arc.rotation.x = Math.PI / 2;
        g.add(arc);

        // Arrowhead at end of arc
        const tipAngle = angle + Math.PI * 0.55;
        const tipGeo = new THREE.ConeGeometry(0.06, 0.12, 4);
        const tip = new THREE.Mesh(tipGeo, mat);
        tip.position.set(
            Math.cos(tipAngle) * r,
            0,
            Math.sin(tipAngle) * r
        );
        tip.rotation.x = Math.PI / 2;
        tip.rotation.z = -tipAngle + Math.PI / 2;
        g.add(tip);
    }

    return g;
}

export function clockFace(r = 0.5) {
    const g = new THREE.Group();

    // Face disc
    const faceGeo = new THREE.CylinderGeometry(r, r, 0.06, 20);
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2;
    addWithOutline(inner, faceGeo, toonMat(PALETTE.white));

    // Hour marks
    const inkMat = toonMat(PALETTE.ink);
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const markGeo = new THREE.BoxGeometry(0.03, 0.08, 0.02);
        const mark = new THREE.Mesh(markGeo, inkMat);
        mark.position.set(
            Math.cos(a) * (r * 0.8),
            Math.sin(a) * (r * 0.8),
            0.04
        );
        mark.rotation.z = a + Math.PI / 2;
        inner.add(mark);
    }

    // Hour hand
    const hourGeo = new THREE.BoxGeometry(0.04, r * 0.5, 0.02);
    const hour = new THREE.Mesh(hourGeo, inkMat);
    hour.position.set(0, r * 0.2, 0.05);
    hour.rotation.z = Math.PI * 0.15;
    inner.add(hour);

    // Minute hand
    const minGeo = new THREE.BoxGeometry(0.03, r * 0.7, 0.02);
    const min = new THREE.Mesh(minGeo, inkMat);
    min.position.set(0, r * 0.3, 0.05);
    min.rotation.z = -Math.PI * 0.3;
    inner.add(min);

    g.add(inner);
    return g;
}

export function crosshair(r = 0.5) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.danger);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(r, 0.03, 6, 20);
    addWithOutline(g, ringGeo, mat, null, { x: Math.PI / 2 });

    // Crosshairs — 4 lines
    const lineGeo = new THREE.CylinderGeometry(0.025, 0.025, r * 0.4, 4);
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const line = new THREE.Mesh(lineGeo, mat);
        line.position.set(
            Math.cos(a) * r * 0.8,
            0,
            Math.sin(a) * r * 0.8
        );
        line.rotation.z = Math.PI / 2;
        line.rotation.y = a;
        g.add(line);
    }

    // Center dot
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mat));

    return g;
}

export function priceTag(w = 0.5, h = 0.7) {
    const g = new THREE.Group();

    const tagGeo = createRoundedBox(w, h, 0.06, 0.04);
    addWithOutline(g, tagGeo, toonMat(PALETTE.cream));

    // Hole for string
    const holeGeo = new THREE.TorusGeometry(0.04, 0.015, 6, 8);
    const hole = new THREE.Mesh(holeGeo, toonMat(PALETTE.ink));
    hole.position.set(0, h * 0.35, 0.04);
    g.add(hole);

    // String
    const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4);
    const string = new THREE.Mesh(stringGeo, toonMat(PALETTE.ink));
    string.position.set(0, h * 0.35 + 0.12, 0.04);
    g.add(string);

    return g;
}

export function splashDroplets(count = 5) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.dancer); // Light blue water

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI - Math.PI / 4;
        const r = 0.3 + Math.random() * 0.2;
        const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 6);
        const drop = new THREE.Mesh(geo, mat);
        drop.position.set(
            Math.cos(angle) * r,
            Math.sin(angle) * r * 0.5 + 0.1,
            Math.random() * 0.1
        );
        g.add(drop);
    }

    return g;
}

export function bubbles(count = 4, r = 0.3) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.white, { transparent: true, opacity: 0.4 });

    for (let i = 0; i < count; i++) {
        const size = 0.06 + Math.random() * 0.06;
        const geo = new THREE.SphereGeometry(size, 8, 8);
        const bubble = new THREE.Mesh(geo, mat);
        const a = (i / count) * Math.PI * 2;
        bubble.position.set(
            Math.cos(a) * r * (0.5 + Math.random() * 0.5),
            0.1 + Math.random() * 0.3,
            Math.sin(a) * r * (0.5 + Math.random() * 0.5)
        );
        g.add(bubble);
    }

    return g;
}

export function flameShape(h = 0.7) {
    const g = new THREE.Group();

    // Main flame — elongated sphere
    const flameGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const flameMat = toonMat(PALETTE.gold, {
        emissive: PALETTE.danger,
        emissiveIntensity: 0.6,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.scale.set(1, h / 0.4, 0.8);
    flame.position.y = h * 0.2;
    g.add(flame);

    // Inner bright core
    const coreGeo = new THREE.SphereGeometry(0.1, 6, 6);
    const coreMat = toonMat(PALETTE.glow, {
        emissive: PALETTE.gold,
        emissiveIntensity: 0.8,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.scale.set(1, h / 0.5, 0.8);
    core.position.y = h * 0.1;
    g.add(core);

    // Tip
    const tipGeo = new THREE.ConeGeometry(0.08, h * 0.4, 6);
    const tip = new THREE.Mesh(tipGeo, flameMat);
    tip.position.y = h * 0.55;
    g.add(tip);

    return g;
}

export function explosionBurst(r = 0.4) {
    const g = new THREE.Group();
    const mat = matGold();

    // Central sphere
    const centerGeo = new THREE.SphereGeometry(r * 0.3, 8, 8);
    addWithOutline(g, centerGeo, mat);

    // Radial spikes
    const spikeGeo = new THREE.ConeGeometry(0.06, r * 0.6, 4);
    const count = 8;
    for (let i = 0; i < count; i++) {
        const phi = (i / count) * Math.PI * 2;
        for (const elev of [0, 0.5, -0.5]) {
            if (elev !== 0 && i % 2 !== 0) continue;
            const spike = new THREE.Mesh(spikeGeo, mat);
            const dist = r * 0.6;
            spike.position.set(
                Math.cos(phi) * dist * Math.cos(elev),
                Math.sin(elev) * dist,
                Math.sin(phi) * dist * Math.cos(elev)
            );
            spike.lookAt(0, 0, 0);
            spike.rotation.x += Math.PI; // point outward
            g.add(spike);
        }
    }

    return g;
}

export function skullShape() {
    const g = new THREE.Group();
    const boneMat = toonMat(PALETTE.white);

    // Cranium
    const craniGeo = new THREE.SphereGeometry(0.25, 10, 8);
    addWithOutline(g, craniGeo, boneMat, { y: 0.08 });

    // Jaw
    const jawGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.position.set(0, -0.12, 0.05);
    jaw.scale.set(1.1, 0.6, 0.8);
    g.add(jaw);

    // Eye sockets (dark)
    const eyeMat = toonMat(PALETTE.ink);
    const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
    for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(sx * 0.1, 0.08, 0.2);
        g.add(eye);
    }

    // Nose hole
    const noseGeo = new THREE.SphereGeometry(0.03, 4, 4);
    const nose = new THREE.Mesh(noseGeo, eyeMat);
    nose.position.set(0, -0.02, 0.22);
    g.add(nose);

    return g;
}

export function heartShape() {
    const g = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(0, -0.25);
    shape.bezierCurveTo(-0.05, -0.15, -0.3, 0, -0.3, 0.15);
    shape.bezierCurveTo(-0.3, 0.35, 0, 0.35, 0, 0.2);
    shape.bezierCurveTo(0, 0.35, 0.3, 0.35, 0.3, 0.15);
    shape.bezierCurveTo(0.3, 0, 0.05, -0.15, 0, -0.25);

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.1, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2,
    });
    geo.center();
    addWithOutline(g, geo, matDanger());

    return g;
}

export function puddleDisc(r = 0.5) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.ubik, { transparent: true, opacity: 0.5 });

    const discGeo = new THREE.CylinderGeometry(r, r * 1.1, 0.03, 14);
    const disc = new THREE.Mesh(discGeo, mat);
    g.add(disc);

    return g;
}

export function coinStack(count = 4, r = 0.2) {
    const g = new THREE.Group();
    const gold = matGold();
    const coinGeo = new THREE.CylinderGeometry(r, r, 0.06, 12);

    for (let i = 0; i < count; i++) {
        addWithOutline(g, coinGeo, gold, {
            y: i * 0.07 - (count - 1) * 0.035,
            x: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02,
        });
    }

    return g;
}

export function miniTower() {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.fixture);

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.1, 8);
    addWithOutline(g, baseGeo, mat, { y: -0.25 });

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.4, 8);
    addWithOutline(g, bodyGeo, mat, { y: 0 });

    // Top sphere
    const topGeo = new THREE.SphereGeometry(0.1, 8, 6);
    addWithOutline(g, topGeo, toonMat(PALETTE.glow), { y: 0.25 });

    return g;
}

// ─── EXTRA UTILITY SHAPES ───────────────────────────────────────────────────

export function capsuleFigure(h = 0.5, color = PALETTE.fixture) {
    const g = new THREE.Group();
    const mat = toonMat(color);

    // Body capsule
    const bodyGeo = new THREE.SphereGeometry(h * 0.25, 8, 6);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.scale.set(1, 1.8, 0.8);
    g.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(h * 0.15, 6, 6);
    addWithOutline(g, headGeo, toonMat(PALETTE.skin), { y: h * 0.35 });

    const bodyOl = new THREE.Mesh(bodyGeo, ol());
    bodyOl.scale.copy(body.scale);
    g.add(bodyOl);

    return g;
}

export function sparkSpheres(count = 3, spread = 0.3) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.gold, {
        emissive: PALETTE.gold,
        emissiveIntensity: 0.5,
    });

    for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.03, 4, 4);
        const spark = new THREE.Mesh(geo, mat);
        spark.position.set(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        );
        g.add(spark);
    }

    return g;
}

export function motionLines(count = 3, length = 0.3) {
    const g = new THREE.Group();
    const mat = toonMat(PALETTE.ink, { transparent: true, opacity: 0.3 });

    for (let i = 0; i < count; i++) {
        const lineGeo = new THREE.CylinderGeometry(0.01, 0.01, length, 4);
        const line = new THREE.Mesh(lineGeo, mat);
        line.position.set(
            -0.3 - i * 0.1,
            (i - 1) * 0.1,
            0
        );
        line.rotation.z = Math.PI / 2;
        g.add(line);
    }

    return g;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Drone Model Factory                                 ║
// ║  Unified drone body with Fortnite-style rarity coloring and effects.      ║
// ║  One iconic silhouette — color, beam, and particles sell the rarity.      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE, OUTLINE_WIDTH } from '../data/palette.js';
import { toonMat, outlineMatStatic, outlineMatJittery } from '../shaders/toonMaterials.js';
import { draw3DUpgradeIcon } from '../ui/UpgradeIconRenderer.js';
import { t, getCanvasFont } from '../i18n.js';

// ─── BODY DIMENSIONS (universal — same shape for every rarity) ──────────────

const BODY_R      = 0.55;   // Main hull sphere radius
const BODY_SQUISH = 0.45;   // Y scale → smooth disc/saucer silhouette
const BODY_HALF_H = BODY_R * BODY_SQUISH;  // ~0.2475
const DOME_R      = 0.18;   // Top sensor dome radius
const LENS_R      = 0.12;   // Bottom sensor lens radius
const RING_R      = BODY_R + 0.02;  // Equator accent ring major radius
const ARM_DIST    = 0.8;    // Prop arm distance from center (diagonal)

// ─── RARITY CONFIGURATION ───────────────────────────────────────────────────
// Body shape is universal. Only color, glow, and effects change per rarity.

const RARITY = {
    common: {
        body:         PALETTE.droneCommon,       // warm off-white
        accent:       PALETTE.fixture,           // neutral metal
        glow:         PALETTE.rarityCommon,       // cream
        emissive:     0.05,
        outlineScale: 1.0,
        bladeCount:   2,
    },
    rare: {
        body:         PALETTE.droneRare,          // soft lavender
        accent:       PALETTE.rarityRare,         // deeper violet
        glow:         PALETTE.rarityRare,         // violet
        emissive:     0.25,
        outlineScale: 1.0,
        bladeCount:   2,
    },
    legendary: {
        body:         PALETTE.droneLegendary,     // rich gold
        accent:       PALETTE.rarityLegendary,    // deep gold
        glow:         PALETTE.rarityLegendary,    // gold
        emissive:     0.4,
        outlineScale: 1.5,
        bladeCount:   3,
    },
};

// ─── PLACARD CANVAS TEXTURE ─────────────────────────────────────────────────

function createPlacardTexture(upgrade, rarity) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 650;
    const ctx = canvas.getContext('2d');
    const cW = 800, cH = 650;

    // ── Background with subtle gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, cH);
    if (rarity === 'legendary') {
        bgGrad.addColorStop(0, '#ffe066');
        bgGrad.addColorStop(1, '#ffd93d');
    } else if (rarity === 'rare') {
        bgGrad.addColorStop(0, '#fff8ed');
        bgGrad.addColorStop(1, '#fff4d9');
    } else {
        bgGrad.addColorStop(0, '#ffffff');
        bgGrad.addColorStop(1, '#faf5ef');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cW, cH);

    // Legendary: diagonal shimmer lines across gold background
    if (rarity === 'legendary') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = -cH; i < cW + cH; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + cH, cH);
            ctx.stroke();
        }
    }

    // Rare: inner glow border in violet
    if (rarity === 'rare') {
        ctx.strokeStyle = '#9b8ec4';
        ctx.lineWidth = 10;
        ctx.strokeRect(6, 6, cW - 12, cH - 12);
        const glowW = 24;
        let grad;
        grad = ctx.createLinearGradient(10, 0, 10 + glowW, 0);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.4)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, 10, glowW, cH - 20);
        grad = ctx.createLinearGradient(cW - 10, 0, cW - 10 - glowW, 0);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.4)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cW - 10 - glowW, 10, glowW, cH - 20);
        grad = ctx.createLinearGradient(0, 10, 0, 10 + glowW);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.4)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, 10, cW - 20, glowW);
        grad = ctx.createLinearGradient(0, cH - 10, 0, cH - 10 - glowW);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.4)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, cH - 10 - glowW, cW - 20, glowW);
    }

    // Border (common + legendary)
    if (rarity === 'legendary') {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 10;
        ctx.strokeRect(4, 4, cW - 8, cH - 8);
    } else if (rarity === 'common') {
        ctx.strokeStyle = 'rgba(26, 26, 46, 0.25)';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, cW - 8, cH - 8);
    }

    // ── RARITY BANNER (0-55px) ──
    const bannerH = 55;
    const bannerFill = rarity === 'legendary' ? '#e6b800'
                     : rarity === 'rare' ? '#9b8ec4'
                     : '#f0ebe0';
    ctx.fillStyle = bannerFill;
    ctx.fillRect(0, 0, cW, bannerH);

    ctx.strokeStyle = 'rgba(26, 26, 46, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, bannerH);
    ctx.lineTo(cW, bannerH);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rarity === 'rare' ? '#ffffff' : '#1a1a2e';
    ctx.font = getCanvasFont(32, true);
    ctx.fillText(rarity.toUpperCase(), cW / 2, bannerH / 2);

    // ── ICON — centered, prominent ──
    const iconSize = 300;
    const iconCX = cW / 2;
    const iconCY = 185;

    // Save icon background region for animated re-rendering (avoids visible square artifact)
    const _iconHalf = Math.ceil(iconSize / 2) + 2;
    const _iconBgData = ctx.getImageData(iconCX - _iconHalf, iconCY - _iconHalf, _iconHalf * 2, _iconHalf * 2);

    draw3DUpgradeIcon(ctx, upgrade.icon || 'star', rarity, iconCX, iconCY, iconSize, 0);

    // ── NAME — centered below icon ──
    const upgradeName = t('upgrade.' + upgrade.id + '.name');
    const nameFontSize = upgradeName.length > 18 ? 48 : upgradeName.length > 12 ? 54 : 62;
    ctx.font = getCanvasFont(nameFontSize, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const nameMaxW = 680;
    const nameWords = upgradeName.split(' ');
    const nameLines = [];
    let currentLine = nameWords[0];
    for (let i = 1; i < nameWords.length; i++) {
        const test = currentLine + ' ' + nameWords[i];
        if (ctx.measureText(test).width > nameMaxW) {
            nameLines.push(currentLine);
            currentLine = nameWords[i];
        } else {
            currentLine = test;
        }
    }
    nameLines.push(currentLine);

    const nameLineH = nameFontSize + 6;
    const nameStartY = 400 - (nameLines.length - 1) * nameLineH / 2;
    for (let i = 0; i < nameLines.length; i++) {
        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillText(nameLines[i], cW / 2 + 2, nameStartY + i * nameLineH + 2);
        // Main text
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(nameLines[i], cW / 2, nameStartY + i * nameLineH);
    }

    // ── DIVIDER with decorative diamond ──
    const dividerY = nameStartY + (nameLines.length - 1) * nameLineH + nameLineH / 2 + 12;
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, dividerY);
    ctx.lineTo(cW - 80, dividerY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(26, 26, 46, 0.2)';
    ctx.save();
    ctx.translate(cW / 2, dividerY);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();

    // ── DESCRIPTION (auto-scaling font) ──
    const upgradeDesc = t('upgrade.' + upgrade.id + '.desc');
    if (upgradeDesc) {
        const descMaxW = 700;
        const descAreaTop = dividerY + 16;
        const descAreaBot = cH - 16;
        const descAreaH = descAreaBot - descAreaTop;

        let descFontSize = 42;
        let descLines, descLineH;

        // Shrink font until description fits available area
        for (; descFontSize >= 24; descFontSize -= 2) {
            ctx.font = getCanvasFont(descFontSize, false);
            descLineH = descFontSize + 10;

            const words = upgradeDesc.split(' ');
            descLines = [];
            let line = words[0] || '';
            for (let w = 1; w < words.length; w++) {
                const word = words[w];
                if (word.startsWith('(')) {
                    descLines.push(line);
                    line = word;
                    continue;
                }
                const test = line + ' ' + word;
                if (ctx.measureText(test).width > descMaxW) {
                    descLines.push(line);
                    line = word;
                } else {
                    line = test;
                }
            }
            descLines.push(line);

            if (descLines.length * descLineH <= descAreaH) break;
        }

        ctx.fillStyle = '#3a3a4a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const descCenter = (descAreaTop + descAreaBot) / 2;
        const descStartY = descCenter - (descLines.length - 1) * descLineH / 2;
        for (let i = 0; i < descLines.length; i++) {
            ctx.fillText(descLines[i], cW / 2, descStartY + i * descLineH);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Store refs for animated 3D icon re-rendering
    texture._iconCanvas = canvas;
    texture._iconCtx = ctx;
    texture._iconKey = upgrade.icon || 'star';
    texture._iconRarity = rarity;
    texture._iconBgData = _iconBgData;
    texture._iconBgX = iconCX - _iconHalf;
    texture._iconBgY = iconCY - _iconHalf;

    return texture;
}

// ─── PROPELLER BUILDER ──────────────────────────────────────────────────────

function _buildPropellers(root, armPositions, bladeCount) {
    const armMat = toonMat(PALETTE.fixture);
    const rotorMat = toonMat(PALETTE.white, {
        transparent: true, opacity: 0.35, side: THREE.DoubleSide,
    });
    const rotors = [];

    for (const ap of armPositions) {
        const diagLength = Math.sqrt(ap.x * ap.x + ap.z * ap.z);
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(diagLength, 0.03, 0.05),
            armMat
        );
        arm.position.set(ap.x * 0.5, BODY_HALF_H + 0.02, ap.z * 0.5);
        arm.rotation.y = Math.atan2(ap.z, ap.x);
        root.add(arm);

        const motor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8),
            toonMat(PALETTE.charcoal)
        );
        motor.position.set(ap.x, BODY_HALF_H + 0.06, ap.z);
        root.add(motor);

        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(ap.x, BODY_HALF_H + 0.12, ap.z);
        for (let b = 0; b < bladeCount; b++) {
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.01, 0.06),
                rotorMat
            );
            blade.rotation.y = (Math.PI / bladeCount) * b;
            rotorGroup.add(blade);
        }
        root.add(rotorGroup);
        rotors.push(rotorGroup);
    }

    return rotors;
}

// ─── UNIVERSAL DRONE BODY ───────────────────────────────────────────────────
// Same sleek saucer shape for every rarity. Color + emissive from RARITY cfg.

function _buildDroneBody(root, rarity) {
    const cfg = RARITY[rarity];
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'droneBody';

    const bodyMat = toonMat(cfg.body, {
        emissive: cfg.glow,
        emissiveIntensity: cfg.emissive,
    });

    // Main hull — squished sphere → smooth saucer silhouette
    const hull = new THREE.Mesh(
        new THREE.SphereGeometry(BODY_R, 20, 14),
        bodyMat
    );
    hull.scale.y = BODY_SQUISH;
    bodyGroup.add(hull);

    // Top sensor dome
    const domeMat = toonMat(cfg.accent, {
        emissive: cfg.glow,
        emissiveIntensity: cfg.emissive * 0.5,
    });
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(DOME_R, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat
    );
    dome.position.y = BODY_HALF_H;
    bodyGroup.add(dome);

    // Equator accent ring
    const accentRing = new THREE.Mesh(
        new THREE.TorusGeometry(RING_R, 0.02, 8, 32),
        toonMat(cfg.accent, { emissive: cfg.glow, emissiveIntensity: cfg.emissive * 0.3 })
    );
    accentRing.rotation.x = Math.PI / 2;
    bodyGroup.add(accentRing);

    // Bottom sensor lens (glowing)
    const lens = new THREE.Mesh(
        new THREE.SphereGeometry(LENS_R, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        new THREE.MeshBasicMaterial({
            color: cfg.glow,
            transparent: true,
            opacity: 0.4 + cfg.emissive,
        })
    );
    lens.position.y = -BODY_HALF_H;
    bodyGroup.add(lens);

    // Ink outline
    const outlineW = OUTLINE_WIDTH.tower * cfg.outlineScale;
    const outlineMesh = new THREE.Mesh(
        new THREE.SphereGeometry(BODY_R + outlineW, 20, 14),
        outlineMatStatic(outlineW)
    );
    outlineMesh.scale.y = BODY_SQUISH;
    bodyGroup.add(outlineMesh);

    root.add(bodyGroup);

    // Propeller arms (4 diagonals)
    const armPositions = [
        { x: ARM_DIST, z: ARM_DIST },
        { x: ARM_DIST, z: -ARM_DIST },
        { x: -ARM_DIST, z: ARM_DIST },
        { x: -ARM_DIST, z: -ARM_DIST },
    ];
    const rotors = _buildPropellers(root, armPositions, cfg.bladeCount);

    return { bodyGroup, rotors, outlineW };
}

// ─── RARITY BEAM (Fortnite-style column of light) ──────────────────────────
// Common = no beam. Rare = moderate violet. Legendary = dramatic gold.
// Beam flares downward from drone body, enveloping the sign in rarity color.

function _buildRarityBeam(root, rarity) {
    if (rarity === 'common') return null;

    const cfg = RARITY[rarity];
    const scale = rarity === 'legendary' ? 1.5 : 1.0;

    const beamH        = 4.5 + scale;
    const innerTopR    = 0.3 + scale * 0.15;
    const innerBotR    = 1.5 + scale * 0.5;
    const outerTopR    = innerTopR * 1.8;
    const outerBotR    = innerBotR * 1.4;
    const innerOpacity = 0.03 + scale * 0.02;
    const outerOpacity = innerOpacity * 0.35;

    const beamGroup = new THREE.Group();
    beamGroup.name = 'rarityBeam';

    // Inner beam — brighter core
    const innerMat = new THREE.MeshBasicMaterial({
        color: cfg.glow,
        transparent: true,
        opacity: innerOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(innerTopR, innerBotR, beamH, 16, 1, true),
        innerMat
    );
    inner.position.y = -beamH / 2;
    inner.userData._baseOpacity = innerOpacity;
    inner.raycast = () => {};   // Don't intercept hover raycasts
    beamGroup.add(inner);

    // Outer glow — softer, wider
    const outerMat = new THREE.MeshBasicMaterial({
        color: cfg.glow,
        transparent: true,
        opacity: outerOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const outer = new THREE.Mesh(
        new THREE.CylinderGeometry(outerTopR, outerBotR, beamH, 16, 1, true),
        outerMat
    );
    outer.position.y = -beamH / 2;
    outer.userData._baseOpacity = outerOpacity;
    outer.raycast = () => {};
    beamGroup.add(outer);

    root.add(beamGroup);
    return beamGroup;
}

// ─── LEGENDARY EXTRAS (ring, crown, jitter, glow dome) ─────────────────────

function _buildLegendaryExtras(root, cfg) {
    const extras = {};

    // Orbital ring (slowly rotating gold torus)
    const ringMat = toonMat(cfg.glow, { emissive: cfg.glow, emissiveIntensity: 0.5 });
    const orbitalRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.035, 8, 24),
        ringMat
    );
    orbitalRing.rotation.x = Math.PI / 2;
    root.add(orbitalRing);
    extras.orbitalRing = orbitalRing;
    extras.ringMat = ringMat;

    // Crown spikes (3 gold cones at 120° intervals)
    const crownMat = toonMat(cfg.glow, { emissive: cfg.glow, emissiveIntensity: 0.4 });
    const crownSpikes = new THREE.Group();
    crownSpikes.name = 'crownSpikes';
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), crownMat);
        cone.position.set(
            Math.cos(angle) * 0.25,
            BODY_HALF_H + DOME_R + 0.1,
            Math.sin(angle) * 0.25
        );
        crownSpikes.add(cone);
    }
    root.add(crownSpikes);
    extras.crownSpikes = crownSpikes;

    // Jittery outlines (Borderlands-style ink wobble)
    const outlineW = OUTLINE_WIDTH.tower * 1.5;
    const jitter1 = new THREE.Mesh(
        new THREE.SphereGeometry(BODY_R + outlineW * 1.5, 16, 12),
        outlineMatJittery(outlineW * 1.2, PALETTE.ink, 0.15)
    );
    jitter1.scale.y = BODY_SQUISH;
    root.add(jitter1);

    const jitter2 = new THREE.Mesh(
        new THREE.SphereGeometry(BODY_R + outlineW * 2.0, 16, 12),
        outlineMatJittery(outlineW * 1.5, cfg.glow, 0.10)
    );
    jitter2.scale.y = BODY_SQUISH;
    root.add(jitter2);
    extras.jitterMats = [jitter1.material, jitter2.material];

    // Glow dome underneath
    const glowDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({
            color: cfg.glow,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
    );
    glowDome.position.y = -BODY_HALF_H - 0.05;
    glowDome.rotation.x = Math.PI;
    root.add(glowDome);

    return extras;
}

// ─── AMBIENT MOTES ──────────────────────────────────────────────────────────
// Common: none. Rare: 6 violet. Legendary: 12 gold + 2 large counter-rotating.

function _createMotes(root, rarity) {
    if (rarity === 'common') return [];

    const cfg = RARITY[rarity];
    const motes = [];

    const count    = rarity === 'legendary' ? 12 : 6;
    const minR     = rarity === 'legendary' ? 0.8 : 0.6;
    const maxR     = rarity === 'legendary' ? 1.4 : 1.0;
    const minSpd   = rarity === 'legendary' ? 0.6 : 0.8;
    const maxSpd   = 1.4;
    const size     = rarity === 'legendary' ? 0.04 : 0.035;
    const ei       = rarity === 'legendary' ? 1.0 : 0.8;
    const opa      = rarity === 'legendary' ? 0.8 : 0.7;

    for (let i = 0; i < count; i++) {
        const mat = toonMat(cfg.glow, {
            emissive: cfg.glow, emissiveIntensity: ei,
            transparent: true, opacity: opa,
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 4, 4), mat);
        root.add(mesh);
        motes.push({
            mesh,
            radius: minR + Math.random() * (maxR - minR),
            speed: minSpd + Math.random() * (maxSpd - minSpd),
            phase: Math.random() * Math.PI * 2,
            yOffset: (Math.random() - 0.5) * 0.4,
            twinkleSpeed: 2 + Math.random() * 3,
            pulsing: false,
        });
    }

    // Legendary: 2 larger counter-rotating motes with scale pulsing
    if (rarity === 'legendary') {
        for (let i = 0; i < 2; i++) {
            const mat = toonMat(cfg.glow, {
                emissive: cfg.glow, emissiveIntensity: 1.2,
                transparent: true, opacity: 0.9,
            });
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), mat);
            root.add(mesh);
            motes.push({
                mesh,
                radius: 1.0 + i * 0.3,
                speed: -(0.5 + i * 0.3),    // negative = counter-rotating
                phase: i * Math.PI,
                yOffset: (Math.random() - 0.5) * 0.3,
                twinkleSpeed: 1,
                pulsing: true,
            });
        }
    }

    return motes;
}

// ─── BEAM PARTICLES (legendary — rising motes within the beam column) ──────

function _createBeamParticles(root, rarity) {
    if (rarity !== 'legendary') return [];

    const cfg = RARITY[rarity];
    const particles = [];
    const beamH = 6.0;

    for (let i = 0; i < 8; i++) {
        const mat = new THREE.MeshBasicMaterial({
            color: cfg.glow,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), mat);
        mesh.raycast = () => {};
        root.add(mesh);
        particles.push({
            mesh,
            angle: Math.random() * Math.PI * 2,
            radius: 0.1 + Math.random() * 0.3,
            y: -Math.random() * beamH,
            speed: 0.4 + Math.random() * 0.4,
            maxY: 0,
            minY: -beamH,
        });
    }

    return particles;
}

// ─── DRONE MESH FACTORY ─────────────────────────────────────────────────────

/**
 * Create a complete upgrade drone with sign.
 *
 * @param {Object} upgrade - Upgrade data object from registry
 * @param {number} slotIndex - 0, 1, or 2 (used for animation staggering)
 * @returns {THREE.Group} Drone group with userData for animation
 */
export function createUpgradeDrone(upgrade, slotIndex) {
    const rarity = upgrade.rarity || 'common';
    const cfg = RARITY[rarity];

    const root = new THREE.Group();
    root.name = 'upgradeDrone';

    // ── Build universal drone body ──────────────────────────────────────
    const { bodyGroup, rotors, outlineW } = _buildDroneBody(root, rarity);

    // ── Rarity beam (rare + legendary) ─────────────────────────────────
    const beamGroup = _buildRarityBeam(root, rarity);

    // ── Legendary extras (ring, crown, jitter, glow dome) ──────────────
    let extras = {};
    if (rarity === 'legendary') {
        extras = _buildLegendaryExtras(root, cfg);
    }

    // ── Ambient motes (rare + legendary) ───────────────────────────────
    const motes = _createMotes(root, rarity);

    // ── Beam particles (legendary) ─────────────────────────────────────
    const beamParticles = _createBeamParticles(root, rarity);

    // ── SIGN ATTACHMENT (two chain cylinders + placard) ─────────────────
    const signGroup = new THREE.Group();
    signGroup.name = 'signGroup';

    const chainMat = toonMat(PALETTE.fixture);
    const chainLength = 0.5;
    const chainSpacing = 0.35;

    const chainL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, chainLength, 4), chainMat
    );
    chainL.position.set(-chainSpacing, -chainLength / 2, 0);
    signGroup.add(chainL);

    const chainR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, chainLength, 4), chainMat
    );
    chainR.position.set(chainSpacing, -chainLength / 2, 0);
    signGroup.add(chainR);

    // Placard (800x650 canvas → 4.5 x 3.65625 world units)
    const placardW = 4.5;
    const placardH = 3.65625;
    const placardD = 0.04;

    const placardTexture = createPlacardTexture(upgrade, rarity);

    const placardFrontMat = toonMat(PALETTE.white, {});
    placardFrontMat.map = placardTexture;
    placardFrontMat.needsUpdate = true;
    const placardBackMat = toonMat(PALETTE.cream);

    const placardGeo = new THREE.BoxGeometry(placardW, placardH, placardD);
    const placardMaterials = [
        toonMat(PALETTE.cream), // right
        toonMat(PALETTE.cream), // left
        toonMat(PALETTE.cream), // top
        toonMat(PALETTE.cream), // bottom
        placardBackMat,         // front (+Z face, faces away from camera)
        placardFrontMat,        // back (-Z face, faces camera)
    ];
    const placard = new THREE.Mesh(placardGeo, placardMaterials);
    placard.position.y = -chainLength - placardH / 2 + 0.05;
    placard.name = 'placard';
    signGroup.add(placard);

    // Placard outline
    const placardOutline = new THREE.Mesh(
        new THREE.BoxGeometry(placardW + outlineW * 2, placardH + outlineW * 2, placardD + outlineW * 2),
        outlineMatStatic(outlineW)
    );
    placardOutline.position.copy(placard.position);
    signGroup.add(placardOutline);

    // Position sign group at bottom of drone body
    signGroup.position.y = -BODY_HALF_H - 0.1;
    root.add(signGroup);

    // ── USERDATA FOR ANIMATION ──────────────────────────────────────────
    root.userData = {
        type: 'upgradeDrone',
        upgrade: upgrade,
        slotIndex: slotIndex,
        rarity: rarity,
        rotors: rotors,
        signGroup: signGroup,
        bodyGroup: bodyGroup,
        placard: placard,

        // Placard texture (for animated icon re-rendering)
        placardTexture: placardTexture,
        _iconFrame: slotIndex,   // Stagger updates across drones

        // Pendulum physics state
        pendulumAngle: 0,
        pendulumVelocity: 0,

        // Hover bob state
        hoverPhase: slotIndex * Math.PI * 0.667,
        hoverTime: 0,

        // Rotor spin
        rotorSpin: 0,

        // Flight state
        flightProgress: 0,
        flightCurve: null,
        state: 'idle',

        // Rarity beam
        beamGroup: beamGroup,
        _beamTime: 0,

        // Per-rarity extras (legendary only)
        orbitalRing: extras.orbitalRing || null,
        crownSpikes: extras.crownSpikes || null,
        jitterMats: extras.jitterMats || null,
        ringMat: extras.ringMat || null,

        // Particles
        motes: motes,
        _moteTime: 0,
        beamParticles: beamParticles,
    };

    return root;
}

// ─── ANIMATION UPDATE ───────────────────────────────────────────────────────

/**
 * Update a single upgrade drone's animations.
 * Called each frame for each active drone.
 *
 * @param {THREE.Group} drone - Drone group created by createUpgradeDrone()
 * @param {number} dt - Delta time (seconds)
 */
export function updateUpgradeDrone(drone, dt) {
    const ud = drone.userData;
    if (!ud || ud.type !== 'upgradeDrone') return;

    // ── ROTOR SPIN ──────────────────────────────────────────────────────
    const spinSpeed = ud.rarity === 'legendary' ? 55 : ud.rarity === 'rare' ? 45 : 35;
    ud.rotorSpin += dt * spinSpeed;
    for (let i = 0; i < ud.rotors.length; i++) {
        ud.rotors[i].rotation.y = ud.rotorSpin + i * Math.PI / ud.rotors.length;
    }

    // ── HOVER BOB (hovering, settling, or idle) ─────────────────────────
    if (ud.state === 'hovering' || ud.state === 'settling' || ud.state === 'idle') {
        ud.hoverTime += dt;
        const bobAmplitude = 0.05;
        const bobFreq = 0.8;
        const bob = Math.sin(ud.hoverTime * bobFreq * Math.PI * 2 + ud.hoverPhase) * bobAmplitude;
        drone.userData._hoverBob = bob;
    }

    // ── PENDULUM PHYSICS (sign swing) ───────────────────────────────────
    const g = 9.8;
    const L = 0.5;
    const damping = 3.5;
    const accelForce = ud._externalAccel || 0;

    const angAccel = -(g / L) * Math.sin(ud.pendulumAngle)
                    - damping * ud.pendulumVelocity
                    + accelForce;
    ud.pendulumVelocity += angAccel * dt;
    ud.pendulumAngle += ud.pendulumVelocity * dt;
    ud.pendulumAngle = Math.max(-0.6, Math.min(0.6, ud.pendulumAngle));

    if (ud.signGroup) {
        ud.signGroup.rotation.z = ud.pendulumAngle;
    }

    // Ambient micro-sway when hovering
    if (ud.state === 'hovering') {
        const ambientSway = Math.sin(ud.hoverTime * 0.5 + ud.hoverPhase) * 0.015;
        ud._externalAccel = ambientSway;
    } else if (ud.state !== 'entering') {
        ud._externalAccel = 0;
    }

    // ── BEAM ANIMATION (rare + legendary) ───────────────────────────────
    if (ud.beamGroup) {
        ud._beamTime += dt;
        ud.beamGroup.rotation.y += dt * 0.3;

        // Pulse opacity — legendary pulses faster
        const pulseRate = ud.rarity === 'legendary' ? 2.5 : 1.5;
        const pulse = 0.85 + Math.sin(ud._beamTime * pulseRate) * 0.15;

        for (const child of ud.beamGroup.children) {
            if (child.userData._baseOpacity !== undefined) {
                child.material.opacity = child.userData._baseOpacity * pulse;
            }
        }
    }

    // ── BEAM PARTICLES (legendary — rising motes within beam) ───────────
    if (ud.beamParticles && ud.beamParticles.length > 0) {
        for (const p of ud.beamParticles) {
            p.y += p.speed * dt;
            if (p.y > p.maxY) p.y = p.minY + (p.y - p.maxY);
            p.mesh.position.set(
                Math.cos(p.angle) * p.radius,
                p.y,
                Math.sin(p.angle) * p.radius
            );
            // Fade near top/bottom edges
            const t = (p.y - p.minY) / (p.maxY - p.minY);
            p.mesh.material.opacity = Math.sin(t * Math.PI) * 0.5;
        }
    }

    // ── LEGENDARY EXTRAS ────────────────────────────────────────────────
    if (ud.rarity === 'legendary') {
        // Orbital ring rotation
        if (ud.orbitalRing) {
            ud.orbitalRing.rotation.z += dt * 0.8;
        }

        // Crown spikes bob
        if (ud.crownSpikes) {
            ud.crownSpikes.position.y = Math.sin(ud.hoverTime * 2.5) * 0.02;
        }

        // Update jitter shader time uniforms (different rates for visual variety)
        if (ud.jitterMats) {
            ud.jitterMats[0].uniforms.uTime.value += dt;
            if (ud.jitterMats[1]) ud.jitterMats[1].uniforms.uTime.value += dt * 1.3;
        }
    }

    // ── ANIMATED 3D ICON on placard (throttled to every 3rd frame) ─────
    if (ud.placardTexture && ud.placardTexture._iconCanvas && !ud._iconFrozen) {
        ud._iconFrame++;
        if (ud._iconFrame % 3 === 0) {
            const tex = ud.placardTexture;
            const ctx = tex._iconCtx;
            const cx = 400, cy = 185, half = 152;

            // Restore saved background region (avoids visible square artifact)
            if (tex._iconBgData) {
                ctx.putImageData(tex._iconBgData, tex._iconBgX, tex._iconBgY);
            } else {
                const bgColor = tex._iconRarity === 'legendary' ? '#ffd93d'
                              : tex._iconRarity === 'rare' ? '#fff4d9'
                              : '#faf5ef';
                ctx.fillStyle = bgColor;
                ctx.fillRect(cx - half, cy - half, half * 2, half * 2);
            }

            // Re-draw rotating 3D icon
            draw3DUpgradeIcon(ctx, tex._iconKey, tex._iconRarity, cx, cy, 300, performance.now() / 1000);
            tex.needsUpdate = true;
        }
    }

    // ── AMBIENT MOTES (orbit + twinkle) ─────────────────────────────────
    if (ud.motes && ud.motes.length > 0) {
        ud._moteTime += dt;
        for (const m of ud.motes) {
            const t = ud._moteTime * m.speed + m.phase;
            m.mesh.position.set(
                Math.cos(t) * m.radius,
                m.yOffset + Math.sin(t * 0.7) * 0.1,
                Math.sin(t) * m.radius
            );
            // Twinkle opacity
            m.mesh.material.opacity = 0.4 + Math.sin(ud._moteTime * m.twinkleSpeed + m.phase) * 0.3;
            // Scale pulsing for counter-rotating motes
            if (m.pulsing) {
                const pulse = 1.0 + Math.sin(ud._moteTime * 2 + m.phase) * 0.3;
                m.mesh.scale.setScalar(pulse);
            }
        }
    }
}

// ─── DISPOSE ────────────────────────────────────────────────────────────────

/**
 * Clean up a drone's geometry, materials, and textures.
 */
export function disposeUpgradeDrone(drone) {
    drone.traverse(child => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            } else if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        }
    });
}

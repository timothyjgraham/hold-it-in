// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Drone Model Factory                                 ║
// ║  Pill-body drones with propellers and dangling placard signs.             ║
// ║  Toon-shaded (MeshToonMaterial + static outline). Zero MeshStandard.     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE, OUTLINE_WIDTH } from '../data/palette.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';
import { drawUpgradeIcon } from '../data/upgradeIcons.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const DRONE_COLORS = [PALETTE.droneAlpha, PALETTE.droneBeta, PALETTE.droneGamma];

const RARITY_GLOW = {
    common:    PALETTE.rarityCommon,
    rare:      PALETTE.rarityRare,
    legendary: PALETTE.rarityLegendary,
};

// Propeller blade count per rarity
const RARITY_BLADES = {
    common:    1,
    rare:      2,
    legendary: 3,
};

// Outline width multiplier per rarity
const RARITY_OUTLINE = {
    common:    1.0,
    rare:      1.0,
    legendary: 1.5,
};

// ─── PLACARD CANVAS TEXTURE ─────────────────────────────────────────────────

/**
 * Render upgrade name + icon onto a canvas for use as a sign texture.
 * @param {Object} upgrade - Upgrade data object from registry
 * @param {string} rarity - 'common' | 'rare' | 'legendary'
 * @returns {THREE.CanvasTexture}
 */
function createPlacardTexture(upgrade, rarity) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const cW = 640, cH = 400;

    // Background
    if (rarity === 'legendary') {
        ctx.fillStyle = '#ffd93d'; // gold
    } else if (rarity === 'rare') {
        ctx.fillStyle = '#fff4d9'; // cream
    } else {
        ctx.fillStyle = '#ffffff'; // white
    }
    ctx.fillRect(0, 0, cW, cH);

    // Border
    if (rarity === 'rare') {
        ctx.strokeStyle = '#9b8ec4';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, cW - 10, cH - 10);
    } else if (rarity === 'legendary') {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, cW - 10, cH - 10);
    }

    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Icon (top area)
    drawUpgradeIcon(ctx, upgrade.icon || 'star', cW / 2, 65, 80);

    // Name (middle area, larger bold text)
    const nameFontSize = upgrade.name.length > 16 ? 34 : 42;
    ctx.font = `bold ${nameFontSize}px 'Bangers', sans-serif`;

    // Word wrap name
    const nameWords = upgrade.name.split(' ');
    const nameLines = [];
    let currentLine = nameWords[0];
    for (let i = 1; i < nameWords.length; i++) {
        const test = currentLine + ' ' + nameWords[i];
        if (ctx.measureText(test).width > 580) {
            nameLines.push(currentLine);
            currentLine = nameWords[i];
        } else {
            currentLine = test;
        }
    }
    nameLines.push(currentLine);

    const nameLineH = nameFontSize + 4;
    const nameStartY = 150 - (nameLines.length - 1) * nameLineH / 2;
    for (let i = 0; i < nameLines.length; i++) {
        if (rarity !== 'common') {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillText(nameLines[i], cW / 2 + 2, nameStartY + i * nameLineH + 2);
        }
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(nameLines[i], cW / 2, nameStartY + i * nameLineH);
    }

    // Divider line
    const dividerY = nameStartY + nameLines.length * nameLineH + 8;
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(75, dividerY);
    ctx.lineTo(cW - 75, dividerY);
    ctx.stroke();

    // Description (bottom area, larger text for legibility)
    if (upgrade.description) {
        ctx.fillStyle = '#3a3a4a';
        const descFontSize = 26;
        ctx.font = `${descFontSize}px 'Bangers', sans-serif`;

        const descWords = upgrade.description.split(' ');
        const descLines = [];
        let descLine = descWords[0] || '';
        for (let i = 1; i < descWords.length; i++) {
            const test = descLine + ' ' + descWords[i];
            if (ctx.measureText(test).width > 560) {
                descLines.push(descLine);
                descLine = descWords[i];
            } else {
                descLine = test;
            }
        }
        descLines.push(descLine);

        const descLineH = descFontSize + 6;
        const descStartY = dividerY + 22;
        for (let i = 0; i < descLines.length; i++) {
            ctx.fillText(descLines[i], cW / 2, descStartY + i * descLineH);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// ─── DRONE MESH FACTORY ─────────────────────────────────────────────────────

/**
 * Create a complete upgrade drone with sign.
 *
 * @param {Object} upgrade - Upgrade data object from registry
 * @param {number} slotIndex - 0, 1, or 2 (determines drone body color)
 * @returns {THREE.Group} Drone group with userData for animation
 */
export function createUpgradeDrone(upgrade, slotIndex) {
    const rarity = upgrade.rarity;
    const bodyColor = DRONE_COLORS[slotIndex % 3];
    const glowColor = RARITY_GLOW[rarity];
    const outlineW = OUTLINE_WIDTH.tower * RARITY_OUTLINE[rarity];
    const bladeCount = RARITY_BLADES[rarity];

    const root = new THREE.Group();
    root.name = 'upgradeDrone';

    // ── BODY (pill shape: cylinder + two hemisphere caps) ────────────────
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'droneBody';

    const bodyR = 0.45;
    const bodyH = 0.6;

    // Emissive opts for rare/legendary glow
    const bodyOpts = {};
    if (rarity === 'rare') {
        bodyOpts.emissive = glowColor;
        bodyOpts.emissiveIntensity = 0.15;
    } else if (rarity === 'legendary') {
        bodyOpts.emissive = glowColor;
        bodyOpts.emissiveIntensity = 0.35;
    }

    const bodyMat = toonMat(bodyColor, bodyOpts);

    // Cylinder core
    const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 12),
        bodyMat
    );
    bodyGroup.add(cylinder);

    // Top hemisphere
    const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(bodyR, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        bodyMat
    );
    topCap.position.y = bodyH / 2;
    bodyGroup.add(topCap);

    // Bottom hemisphere
    const bottomCap = new THREE.Mesh(
        new THREE.SphereGeometry(bodyR, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        bodyMat
    );
    bottomCap.position.y = -bodyH / 2;
    bodyGroup.add(bottomCap);

    // Body outline (single scaled-up mesh, BackSide)
    const outlineMat = outlineMatStatic(outlineW);
    const outlineBody = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR + outlineW, bodyR + outlineW, bodyH + outlineW * 2, 12),
        outlineMat
    );
    bodyGroup.add(outlineBody);

    root.add(bodyGroup);

    // ── PROPELLER ARMS (4x) ─────────────────────────────────────────────
    const armMat = toonMat(PALETTE.fixture);
    const rotorMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });

    const armLength = 0.7;
    const armPositions = [
        { x:  armLength, z:  armLength },
        { x:  armLength, z: -armLength },
        { x: -armLength, z:  armLength },
        { x: -armLength, z: -armLength },
    ];

    const rotors = [];

    for (const ap of armPositions) {
        // Arm strut — diagonal bar from body center to motor position
        const diagLength = Math.sqrt(ap.x * ap.x + ap.z * ap.z);
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(diagLength, 0.03, 0.05),
            armMat
        );
        arm.position.set(ap.x * 0.5, bodyH / 2 + 0.02, ap.z * 0.5);
        arm.rotation.y = Math.atan2(ap.z, ap.x);
        root.add(arm);

        // Motor mount
        const motor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8),
            toonMat(PALETTE.charcoal)
        );
        motor.position.set(ap.x, bodyH / 2 + 0.06, ap.z);
        root.add(motor);

        // Rotor disc(s)
        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(ap.x, bodyH / 2 + 0.12, ap.z);

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

    // ── SIGN ATTACHMENT (two chain cylinders + placard) ──────────────────
    const signGroup = new THREE.Group();
    signGroup.name = 'signGroup';

    const chainMat = toonMat(PALETTE.fixture);
    const chainLength = 1.2;
    const chainSpacing = 0.35;  // within body radius so chains connect to drone

    // Left chain
    const chainL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, chainLength, 4),
        chainMat
    );
    chainL.position.set(-chainSpacing, -chainLength / 2, 0);
    signGroup.add(chainL);

    // Right chain
    const chainR = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, chainLength, 4),
        chainMat
    );
    chainR.position.set(chainSpacing, -chainLength / 2, 0);
    signGroup.add(chainR);

    // Placard (flat box with canvas texture on front)
    const placardW = 4.0;
    const placardH = 2.5;
    const placardD = 0.04;

    const placardTexture = createPlacardTexture(upgrade, rarity);

    const placardFrontMat = toonMat(PALETTE.white, {});
    placardFrontMat.map = placardTexture;
    placardFrontMat.needsUpdate = true;
    const placardBackMat = toonMat(PALETTE.cream);

    // Build placard as a box with different front/back materials
    const placardGeo = new THREE.BoxGeometry(placardW, placardH, placardD);
    // Multi-material: right, left, top, bottom, front, back
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
    signGroup.position.y = -bodyH / 2 - 0.1;
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

        // Pendulum physics state
        pendulumAngle: 0,       // Current angle (radians)
        pendulumVelocity: 0,    // Angular velocity (rad/s)

        // Hover bob state
        hoverPhase: slotIndex * Math.PI * 0.667, // Offset phase so drones don't sync
        hoverTime: 0,

        // Rotor spin
        rotorSpin: 0,

        // Flight state (set by UpgradeSelectionUI)
        flightProgress: 0,
        flightCurve: null,
        state: 'idle',  // idle, entering, hovering, selected, rejected, exiting
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
        ud.rotors[i].rotation.y = ud.rotorSpin + i * Math.PI / 2;
    }

    // ── HOVER BOB (only when hovering) ──────────────────────────────────
    if (ud.state === 'hovering' || ud.state === 'idle') {
        ud.hoverTime += dt;
        const bobAmplitude = 0.15;
        const bobFreq = 1.8; // Hz
        const bob = Math.sin(ud.hoverTime * bobFreq * Math.PI * 2 + ud.hoverPhase) * bobAmplitude;
        // Apply bob to the drone's local Y offset (relative to its target position)
        drone.userData._hoverBob = bob;
    }

    // ── PENDULUM PHYSICS (sign swing) ───────────────────────────────────
    // Simple damped pendulum: θ'' = -g/L * sin(θ) - damping * θ'
    const g = 9.8;
    const L = 1.2;  // chain length
    const damping = 2.5;

    // Add external force from drone movement (acceleration drives swing)
    const accelForce = ud._externalAccel || 0;

    const angAccel = -(g / L) * Math.sin(ud.pendulumAngle)
                    - damping * ud.pendulumVelocity
                    + accelForce;
    ud.pendulumVelocity += angAccel * dt;
    ud.pendulumAngle += ud.pendulumVelocity * dt;

    // Clamp to reasonable range
    ud.pendulumAngle = Math.max(-0.6, Math.min(0.6, ud.pendulumAngle));

    // Apply pendulum rotation to sign group (rotate around top attachment point)
    if (ud.signGroup) {
        ud.signGroup.rotation.z = ud.pendulumAngle;
    }

    // Ambient micro-sway when hovering
    if (ud.state === 'hovering') {
        const ambientSway = Math.sin(ud.hoverTime * 0.8 + ud.hoverPhase) * 0.05;
        ud._externalAccel = ambientSway;
    } else if (ud.state !== 'entering') {
        ud._externalAccel = 0;
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

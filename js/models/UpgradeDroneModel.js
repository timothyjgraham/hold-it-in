// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Drone Model Factory                                 ║
// ║  Per-rarity drone bodies with toon-shaded propellers and placard signs.   ║
// ║  Common=Scout pill, Rare=Carrier hex, Legendary=Mothership disc.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE, OUTLINE_WIDTH } from '../data/palette.js';
import { toonMat, outlineMatStatic, outlineMatJittery } from '../shaders/toonMaterials.js';
import { drawUpgradeIcon } from '../data/upgradeIcons.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const DRONE_COLORS = [PALETTE.droneAlpha, PALETTE.droneBeta, PALETTE.droneGamma];

const RARITY_GLOW = {
    common:    PALETTE.rarityCommon,
    rare:      PALETTE.rarityRare,
    legendary: PALETTE.rarityLegendary,
};

const RARITY_BLADES = {
    common:    1,
    rare:      2,
    legendary: 3,
};

const RARITY_OUTLINE = {
    common:    1.0,
    rare:      1.0,
    legendary: 1.5,
};

// ─── PLACARD CANVAS TEXTURE ─────────────────────────────────────────────────

function createPlacardTexture(upgrade, rarity) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    const cW = 800, cH = 500;

    // Background
    if (rarity === 'legendary') {
        ctx.fillStyle = '#ffd93d';
    } else if (rarity === 'rare') {
        ctx.fillStyle = '#fff4d9';
    } else {
        ctx.fillStyle = '#ffffff';
    }
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
        ctx.lineWidth = 8;
        ctx.strokeRect(6, 6, cW - 12, cH - 12);
        const glowW = 18;
        let grad;
        grad = ctx.createLinearGradient(10, 0, 10 + glowW, 0);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.35)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, 10, glowW, cH - 20);
        grad = ctx.createLinearGradient(cW - 10, 0, cW - 10 - glowW, 0);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.35)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cW - 10 - glowW, 10, glowW, cH - 20);
        grad = ctx.createLinearGradient(0, 10, 0, 10 + glowW);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.35)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, 10, cW - 20, glowW);
        grad = ctx.createLinearGradient(0, cH - 10, 0, cH - 10 - glowW);
        grad.addColorStop(0, 'rgba(155, 142, 196, 0.35)');
        grad.addColorStop(1, 'rgba(155, 142, 196, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(10, cH - 10 - glowW, cW - 20, glowW);
    }

    // Border (common + legendary)
    if (rarity === 'legendary') {
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, cW - 8, cH - 8);
    } else if (rarity === 'common') {
        ctx.strokeStyle = 'rgba(26, 26, 46, 0.3)';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, cW - 8, cH - 8);
    }

    // ── RARITY BANNER (0-55px) ──
    const bannerH = 55;
    const bannerFill = rarity === 'legendary' ? '#e6b800'
                     : rarity === 'rare' ? '#9b8ec4'
                     : '#fff4d9';
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
    ctx.font = "28px 'Bangers', sans-serif";
    ctx.fillText(rarity.toUpperCase(), cW / 2, bannerH / 2);

    // ── ICON + NAME (55-250px) ──
    ctx.fillStyle = '#1a1a2e';
    drawUpgradeIcon(ctx, upgrade.icon || 'star', 120, 155, 110);

    const nameFontSize = upgrade.name.length > 14 ? 48 : upgrade.name.length > 10 ? 52 : 60;
    ctx.font = `bold ${nameFontSize}px 'Bangers', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const nameMaxW = 400;
    const nameWords = upgrade.name.split(' ');
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

    const nameLineH = nameFontSize + 4;
    const nameStartY = 155 - (nameLines.length - 1) * nameLineH / 2;
    for (let i = 0; i < nameLines.length; i++) {
        if (rarity !== 'common') {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillText(nameLines[i], 460 + 2, nameStartY + i * nameLineH + 2);
        }
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(nameLines[i], 460, nameStartY + i * nameLineH);
    }

    // ── DIVIDER (250-255px) ──
    ctx.strokeStyle = 'rgba(26, 26, 46, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 252);
    ctx.lineTo(cW - 40, 252);
    ctx.stroke();

    // ── DESCRIPTION (255-470px) ──
    if (upgrade.description) {
        ctx.fillStyle = '#3a3a4a';
        ctx.font = "40px 'Bangers', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const descWords = upgrade.description.split(' ');
        const descLines = [];
        let descLine = descWords[0] || '';
        for (let i = 1; i < descWords.length; i++) {
            const word = descWords[i];
            // Force line break before words starting with '('
            if (word.startsWith('(')) {
                descLines.push(descLine);
                descLine = word;
                continue;
            }
            const test = descLine + ' ' + word;
            if (ctx.measureText(test).width > 660) {
                descLines.push(descLine);
                descLine = word;
            } else {
                descLine = test;
            }
        }
        descLines.push(descLine);

        const descLineH = 50;
        const descCenter = (260 + 470) / 2;
        const descStartY = descCenter - (descLines.length - 1) * descLineH / 2;
        for (let i = 0; i < descLines.length; i++) {
            ctx.fillText(descLines[i], cW / 2, descStartY + i * descLineH);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

// ─── PROPELLER BUILDER (shared across rarities) ──────────────────────────────

function _buildPropellers(root, armPositions, bodyH, bladeCount) {
    const armMat = toonMat(PALETTE.fixture);
    const rotorMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const rotors = [];

    for (const ap of armPositions) {
        const diagLength = Math.sqrt(ap.x * ap.x + ap.z * ap.z);
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(diagLength, 0.03, 0.05),
            armMat
        );
        arm.position.set(ap.x * 0.5, bodyH / 2 + 0.02, ap.z * 0.5);
        arm.rotation.y = Math.atan2(ap.z, ap.x);
        root.add(arm);

        const motor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8),
            toonMat(PALETTE.charcoal)
        );
        motor.position.set(ap.x, bodyH / 2 + 0.06, ap.z);
        root.add(motor);

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

    return rotors;
}

// ─── PER-RARITY BODY BUILDERS ────────────────────────────────────────────────

function _buildCommonBody(root, bodyColor, outlineW, bladeCount) {
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'droneBody';
    const bodyR = 0.45, bodyH = 0.6;
    const bodyMat = toonMat(bodyColor);

    const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 12), bodyMat
    );
    bodyGroup.add(cylinder);

    const topCap = new THREE.Mesh(
        new THREE.SphereGeometry(bodyR, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat
    );
    topCap.position.y = bodyH / 2;
    bodyGroup.add(topCap);

    const bottomCap = new THREE.Mesh(
        new THREE.SphereGeometry(bodyR, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bodyMat
    );
    bottomCap.position.y = -bodyH / 2;
    bodyGroup.add(bottomCap);

    bodyGroup.add(new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR + outlineW, bodyR + outlineW, bodyH + outlineW * 2, 12),
        outlineMatStatic(outlineW)
    ));
    root.add(bodyGroup);

    const armLength = 0.7;
    const armPositions = [
        { x: armLength, z: armLength }, { x: armLength, z: -armLength },
        { x: -armLength, z: armLength }, { x: -armLength, z: -armLength },
    ];
    const rotors = _buildPropellers(root, armPositions, bodyH, bladeCount);

    return { bodyGroup, rotors, bodyH };
}

function _buildRareBody(root, bodyColor, glowColor, outlineW, bladeCount) {
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'droneBody';
    const bodyR = 0.5, bodyH = 0.5;

    const bodyMat = toonMat(bodyColor, { emissive: glowColor, emissiveIntensity: 0.15 });

    // Hexagonal prism body (6 sides)
    const hexBody = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR, bodyR, bodyH, 6), bodyMat
    );
    bodyGroup.add(hexBody);

    // Body outline
    bodyGroup.add(new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR + outlineW, bodyR + outlineW, bodyH + outlineW * 2, 6),
        outlineMatStatic(outlineW)
    ));

    // Two side-pods in rarity violet
    const podMat = toonMat(glowColor, { emissive: glowColor, emissiveIntensity: 0.2 });
    for (const sx of [-1, 1]) {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), podMat);
        pod.position.set(sx * 0.7, 0, 0);
        bodyGroup.add(pod);
    }

    // Thin antenna on top with violet sphere tip
    const antennaMat = toonMat(PALETTE.fixture);
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4), antennaMat
    );
    antenna.position.y = bodyH / 2 + 0.175;
    bodyGroup.add(antenna);

    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), podMat);
    antennaTip.position.y = bodyH / 2 + 0.38;
    bodyGroup.add(antennaTip);

    root.add(bodyGroup);

    // 6 prop arms at hexagonal positions
    const armLength = 0.7;
    const armPositions = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        armPositions.push({
            x: Math.cos(angle) * armLength,
            z: Math.sin(angle) * armLength,
        });
    }
    const rotors = _buildPropellers(root, armPositions, bodyH, bladeCount);

    return { bodyGroup, rotors, bodyH };
}

function _buildLegendaryBody(root, bodyColor, glowColor, outlineW, bladeCount) {
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'droneBody';

    const bodyMat = toonMat(bodyColor, { emissive: glowColor, emissiveIntensity: 0.35 });

    // Flattened disc body (squished sphere)
    const disc = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), bodyMat);
    disc.scale.y = 0.55;
    bodyGroup.add(disc);

    // Body outline
    const outlineDisc = new THREE.Mesh(
        new THREE.SphereGeometry(0.55 + outlineW, 16, 12),
        outlineMatStatic(outlineW)
    );
    outlineDisc.scale.y = 0.55;
    bodyGroup.add(outlineDisc);

    // Borderlands jittery ink outline shells
    const jitterOutline1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.55 + outlineW * 1.5, 16, 12),
        outlineMatJittery(outlineW * 1.2, PALETTE.ink, 0.15)
    );
    jitterOutline1.scale.y = 0.55;
    bodyGroup.add(jitterOutline1);

    const jitterOutline2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.55 + outlineW * 2.0, 16, 12),
        outlineMatJittery(outlineW * 1.5, glowColor, 0.10)
    );
    jitterOutline2.scale.y = 0.55;
    bodyGroup.add(jitterOutline2);

    // Gold orbital ring (slowly spins)
    const ringMat = toonMat(glowColor, { emissive: glowColor, emissiveIntensity: 0.5 });
    const orbitalRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.04, 8, 24), ringMat
    );
    orbitalRing.rotation.x = Math.PI / 2;
    bodyGroup.add(orbitalRing);

    // Crown spikes: 3 small gold cones at 120deg intervals
    const crownMat = toonMat(glowColor, { emissive: glowColor, emissiveIntensity: 0.4 });
    const crownSpikes = new THREE.Group();
    crownSpikes.name = 'crownSpikes';
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), crownMat);
        cone.position.set(Math.cos(angle) * 0.25, 0.55 * 0.55 + 0.1, Math.sin(angle) * 0.25);
        crownSpikes.add(cone);
    }
    bodyGroup.add(crownSpikes);

    // Translucent glow dome underneath
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
    );
    dome.position.y = -0.55 * 0.55;
    dome.rotation.x = Math.PI;
    bodyGroup.add(dome);

    root.add(bodyGroup);

    // 4 prop arms, longer (0.9 vs 0.7)
    const armLength = 0.9;
    const bodyH = 0.55 * 0.55 * 2; // effective height of squished sphere
    const armPositions = [
        { x: armLength, z: armLength }, { x: armLength, z: -armLength },
        { x: -armLength, z: armLength }, { x: -armLength, z: -armLength },
    ];
    const rotors = _buildPropellers(root, armPositions, bodyH, bladeCount);

    // Collect jitter materials for time updates
    const jitterMats = [jitterOutline1.material, jitterOutline2.material];

    return { bodyGroup, rotors, bodyH, orbitalRing, crownSpikes, jitterMats, ringMat };
}

// ─── AMBIENT MOTE PARTICLES ─────────────────────────────────────────────────

function _createAmbientMotes(root, rarity, glowColor) {
    const motes = [];

    if (rarity === 'rare') {
        // 5 violet motes, orbit radius 0.6-1.0, twinkle opacity
        for (let i = 0; i < 5; i++) {
            const mat = toonMat(glowColor, {
                emissive: glowColor, emissiveIntensity: 0.8,
                transparent: true, opacity: 0.7,
            });
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 4), mat);
            root.add(mesh);
            motes.push({
                mesh,
                radius: 0.6 + Math.random() * 0.4,
                speed: 0.8 + Math.random() * 0.6,
                phase: Math.random() * Math.PI * 2,
                yOffset: (Math.random() - 0.5) * 0.4,
                twinkleSpeed: 2 + Math.random() * 3,
            });
        }
    } else if (rarity === 'legendary') {
        // 10 gold motes, orbit radius 0.8-1.4
        for (let i = 0; i < 10; i++) {
            const mat = toonMat(glowColor, {
                emissive: glowColor, emissiveIntensity: 1.0,
                transparent: true, opacity: 0.8,
            });
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), mat);
            root.add(mesh);
            motes.push({
                mesh,
                radius: 0.8 + Math.random() * 0.6,
                speed: 0.6 + Math.random() * 0.8,
                phase: Math.random() * Math.PI * 2,
                yOffset: (Math.random() - 0.5) * 0.5,
                twinkleSpeed: 1.5 + Math.random() * 2,
                pulsing: false,
            });
        }
        // 2 larger counter-rotating motes with scale pulsing
        for (let i = 0; i < 2; i++) {
            const mat = toonMat(glowColor, {
                emissive: glowColor, emissiveIntensity: 1.2,
                transparent: true, opacity: 0.9,
            });
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), mat);
            root.add(mesh);
            motes.push({
                mesh,
                radius: 1.0 + i * 0.3,
                speed: -(0.5 + i * 0.3), // negative = counter-rotating
                phase: i * Math.PI,
                yOffset: (Math.random() - 0.5) * 0.3,
                twinkleSpeed: 1,
                pulsing: true,
            });
        }
    }

    return motes;
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

    // ── BUILD BODY (per-rarity) ─────────────────────────────────────────
    let buildResult;
    if (rarity === 'rare') {
        buildResult = _buildRareBody(root, bodyColor, glowColor, outlineW, bladeCount);
    } else if (rarity === 'legendary') {
        buildResult = _buildLegendaryBody(root, bodyColor, glowColor, outlineW, bladeCount);
    } else {
        buildResult = _buildCommonBody(root, bodyColor, outlineW, bladeCount);
    }

    const { bodyGroup, rotors, bodyH } = buildResult;

    // ── SIGN ATTACHMENT (two chain cylinders + placard) ──────────────────
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

    // Placard (800x500 canvas → 4.5 x 2.8125 world units)
    const placardW = 4.5;
    const placardH = 2.8125;
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
    signGroup.position.y = -bodyH / 2 - 0.1;
    root.add(signGroup);

    // ── AMBIENT MOTES ───────────────────────────────────────────────────
    const motes = _createAmbientMotes(root, rarity, glowColor);

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

        // Per-rarity extras (Phase 3+4)
        orbitalRing: buildResult.orbitalRing || null,
        crownSpikes: buildResult.crownSpikes || null,
        jitterMats: buildResult.jitterMats || null,
        ringMat: buildResult.ringMat || null,
        motes: motes,
        _moteTime: 0,
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
        const bobAmplitude = 0.15;
        const bobFreq = 1.8;
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
        const ambientSway = Math.sin(ud.hoverTime * 0.8 + ud.hoverPhase) * 0.05;
        ud._externalAccel = ambientSway;
    } else if (ud.state !== 'entering') {
        ud._externalAccel = 0;
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

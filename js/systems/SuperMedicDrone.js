// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Super Medivac Claw Drone                                    ║
// ║  When 5+ defeated enemies litter the field at wave end, a giant arcade    ║
// ║  claw-machine drone descends, grabs them all in one scoop, and flies off. ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE, OUTLINE_WIDTH } from '../data/palette.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';

// ─── TUNING ────────────────────────────────────────────────────────────────

const TRIGGER_THRESHOLD  = 5;      // Min corpses to trigger super medivac
const ENTRY_HEIGHT       = 25.0;   // Start altitude (high above the field)
const HOVER_HEIGHT       = 12.0;   // Altitude while claw descends
const CLAW_DROP_HEIGHT   = 0.8;    // How low the claw goes (just above ground)
const PULL_RADIUS        = 1.5;    // Corpses cluster to this radius under claw
const DANGLE_HEIGHT      = 3.0;    // Corpses hang this far below drone when lifted
const EXIT_HEIGHT        = 30.0;   // Altitude before flying off-screen

const ENTRY_SPEED        = 10.0;   // Units/sec — descent to hover
const CLAW_DROP_SPEED    = 6.0;    // Units/sec — claw lowering
const PULL_SPEED         = 5.0;    // Units/sec — corpses slide toward center
const CLAW_CLOSE_TIME    = 0.4;    // Seconds for claw close animation
const ASCEND_SPEED       = 8.0;    // Units/sec — rising with payload
const EXIT_SPEED         = 16.0;   // Units/sec — lateral exit

const ROTOR_SPEED        = 30;     // Rad/sec rotor spin
const CLAW_PRONG_COUNT   = 3;      // 3-prong arcade claw
const CLAW_OPEN_ANGLE    = 0.6;    // Radians — spread when open
const CLAW_CLOSED_ANGLE  = 0.08;   // Radians — grip when closed

// ─── CLAW MACHINE MODEL ─────────────────────────────────────────────────────

function _createSuperMedicModel() {
    const root = new THREE.Group();
    root.name = 'superMedicDrone';

    const bodyMat   = toonMat(PALETTE.superMedicBody, { emissive: PALETTE.superMedicBody, emissiveIntensity: 0.15 });
    const clawMat   = toonMat(PALETTE.superMedicClaw);
    const glassMat  = toonMat(PALETTE.superMedicGlass, { transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const cableMat  = toonMat(PALETTE.superMedicCable);
    const crossMat  = toonMat(PALETTE.medicCross, { emissive: PALETTE.medicCross, emissiveIntensity: 0.6 });
    const armMat    = toonMat(PALETTE.fixture);
    const rotorMat  = toonMat(PALETTE.white, { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const outW      = OUTLINE_WIDTH.tower;

    // ── HOUSING: chunky box with rounded feel ──
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'superMedicBody';

    // Main box
    const boxW = 2.2, boxH = 1.0, boxD = 2.2;
    const box = new THREE.Mesh(
        new THREE.BoxGeometry(boxW, boxH, boxD, 1, 1, 1), bodyMat
    );
    bodyGroup.add(box);

    // Outline
    bodyGroup.add(new THREE.Mesh(
        new THREE.BoxGeometry(boxW + outW * 2, boxH + outW * 2, boxD + outW * 2),
        outlineMatStatic(outW)
    ));

    // Glass dome on top — arcade machine window
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), glassMat
    );
    dome.position.y = boxH / 2;
    bodyGroup.add(dome);

    // Red cross on two sides (front and back)
    const cw = 0.7, cd = 0.18, ch = 0.04;
    for (const zSign of [-1, 1]) {
        const bar1 = new THREE.Mesh(new THREE.BoxGeometry(cw, cd, ch), crossMat);
        bar1.position.set(0, 0, zSign * (boxD / 2 + 0.02));
        bodyGroup.add(bar1);
        const bar2 = new THREE.Mesh(new THREE.BoxGeometry(cd, cw, ch), crossMat);
        bar2.position.set(0, 0, zSign * (boxD / 2 + 0.02));
        bodyGroup.add(bar2);
    }

    // Warning light on top
    const lightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 6),
        toonMat(PALETTE.medicCross, { emissive: PALETTE.medicCross, emissiveIntensity: 0.9 })
    );
    lightMesh.position.y = boxH / 2 + 0.8;
    bodyGroup.add(lightMesh);

    root.add(bodyGroup);

    // ── 6 ROTORS — big drone needs more lift ──
    const rotors = [];
    const armRadius = 1.8;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const ax = Math.cos(angle) * armRadius;
        const az = Math.sin(angle) * armRadius;

        // Arm
        const armLen = armRadius;
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(armLen, 0.04, 0.06), armMat
        );
        arm.position.set(ax * 0.5, boxH / 2 + 0.02, az * 0.5);
        arm.rotation.y = -angle;
        root.add(arm);

        // Motor
        const motor = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8),
            toonMat(PALETTE.charcoal)
        );
        motor.position.set(ax, boxH / 2 + 0.07, az);
        root.add(motor);

        // Rotor blades
        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(ax, boxH / 2 + 0.14, az);
        for (let b = 0; b < 3; b++) {
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 0.012, 0.07), rotorMat
            );
            blade.rotation.y = (Math.PI * 2 / 3) * b;
            rotorGroup.add(blade);
        }
        root.add(rotorGroup);
        rotors.push(rotorGroup);
    }

    // ── CLAW ASSEMBLY — hangs below the body ──
    const clawAssembly = new THREE.Group();
    clawAssembly.name = 'clawAssembly';

    // Winch motor at bottom of body
    const winch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8), clawMat
    );
    winch.position.y = 0;
    clawAssembly.add(winch);

    // Cable (will be scaled dynamically)
    const cable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 1, 4), cableMat
    );
    cable.name = 'clawCable';
    cable.position.y = -0.5; // half the unit length
    clawAssembly.add(cable);

    // Claw hub at end of cable
    const clawHub = new THREE.Group();
    clawHub.name = 'clawHub';
    clawHub.position.y = -1.0; // end of unit cable — repositioned dynamically

    // Hub sphere
    clawHub.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6), clawMat
    ));

    // 3 prongs — each is a curved arm with a scoop tip
    const prongs = [];
    for (let i = 0; i < CLAW_PRONG_COUNT; i++) {
        const prongAngle = (Math.PI * 2 / CLAW_PRONG_COUNT) * i;
        const prong = new THREE.Group();
        prong.rotation.y = prongAngle;

        // Upper arm segment
        const upper = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.6, 0.06), clawMat
        );
        upper.position.set(0.12, -0.3, 0);
        upper.rotation.z = 0.15; // slight outward angle
        prong.add(upper);

        // Lower curved tip (scoop)
        const tip = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.25, 0.12), clawMat
        );
        tip.position.set(0.18, -0.65, 0);
        tip.rotation.z = 0.5; // curved inward
        prong.add(tip);

        // Outline for prong
        const prongOutline = new THREE.Mesh(
            new THREE.BoxGeometry(0.06 + outW * 2, 0.6 + outW * 2, 0.06 + outW * 2),
            outlineMatStatic(outW)
        );
        prongOutline.position.copy(upper.position);
        prongOutline.rotation.copy(upper.rotation);
        prong.add(prongOutline);

        clawHub.add(prong);
        prongs.push(prong);
    }

    clawAssembly.add(clawHub);
    clawAssembly.position.y = -boxH / 2;
    root.add(clawAssembly);

    // Corpse anchor — reparented corpses attach here (inside claw hub)
    const corpseAnchor = new THREE.Group();
    corpseAnchor.name = 'corpseAnchor';
    clawHub.add(corpseAnchor);

    // Store references for animation
    root.userData = {
        rotors,
        lightMesh,
        clawAssembly,
        cable,
        clawHub,
        prongs,
        corpseAnchor,
        rotorSpin: 0,
    };

    return root;
}

// ─── SUPER MEDIC DRONE SYSTEM ───────────────────────────────────────────────

/**
 * States:
 *   idle       — waiting, no active sequence
 *   entering   — flying in from above to hover position
 *   lowering   — claw descending toward corpse cluster
 *   pulling    — corpses sliding toward center under claw
 *   closing    — claw prongs snapping shut
 *   collecting — reparenting corpses to claw
 *   ascending  — lifting with payload
 *   exiting    — flying off-screen
 */
export class SuperMedicDrone {
    constructor() {
        this._mesh = null;
        this._state = 'idle';
        this._time = 0;
        this._targets = [];      // { model, position } entries stolen from medic queue
        this._centerPos = null;  // centroid of all corpses
        this._onComplete = null; // callback when done
        this._duration = 0;
        this._startPos = null;
        this._endPos = null;
        this._clawStartY = 0;
        this._clawEndY = 0;
        this._wobbleTime = 0;
    }

    /** True while an animation sequence is running. */
    get active() {
        return this._state !== 'idle';
    }

    /**
     * Trigger the super medivac sequence.
     * @param {MedicDroneSystem} medicSystem — steals its corpse queue
     * @param {THREE.Scene} scene
     * @param {Function} onComplete — called when drone exits and corpses are released
     */
    trigger(medicSystem, scene, onComplete) {
        // Steal uncollected corpses from the regular medic queue
        const stolen = medicSystem.stealCorpseQueue(scene);
        if (stolen.length < TRIGGER_THRESHOLD) {
            // Not enough — return them (shouldn't happen if caller checked)
            // Put them back by re-queueing
            for (const s of stolen) {
                medicSystem.queueCorpse(s.model, s.position, scene);
            }
            if (onComplete) onComplete();
            return;
        }

        this._targets = stolen;
        this._onComplete = onComplete;

        // Compute centroid of all corpse positions
        const cx = stolen.reduce((s, t) => s + t.position.x, 0) / stolen.length;
        const cz = stolen.reduce((s, t) => s + t.position.z, 0) / stolen.length;
        this._centerPos = new THREE.Vector3(cx, 0, cz);

        // Create or reuse drone mesh
        if (!this._mesh) {
            this._mesh = _createSuperMedicModel();
        }
        this._mesh.visible = true;
        this._mesh.rotation.set(0, 0, 0);
        this._mesh.scale.set(1, 1, 1);

        // Reset claw to open position
        const ud = this._mesh.userData;
        for (const prong of ud.prongs) {
            prong.rotation.x = CLAW_OPEN_ANGLE;
        }
        // Reset cable to short
        ud.cable.scale.y = 0.5;
        ud.cable.position.y = -0.25;
        ud.clawHub.position.y = -0.5;
        // Clear corpse anchor
        while (ud.corpseAnchor.children.length > 0) {
            ud.corpseAnchor.remove(ud.corpseAnchor.children[0]);
        }

        // Start position: high above centroid
        this._mesh.position.set(cx, ENTRY_HEIGHT, cz);
        scene.add(this._mesh);

        // Begin entry
        this._state = 'entering';
        this._time = 0;
        this._startPos = new THREE.Vector3(cx, ENTRY_HEIGHT, cz);
        this._endPos = new THREE.Vector3(cx, HOVER_HEIGHT, cz);
        this._duration = (ENTRY_HEIGHT - HOVER_HEIGHT) / ENTRY_SPEED;
        this._wobbleTime = 0;

        if (window.SFX) SFX.play('medic_pickup');
    }

    /**
     * Called each frame from the game loop.
     */
    update(dt, scene, enemyPool) {
        if (this._state === 'idle') return;

        const mesh = this._mesh;
        const ud = mesh.userData;
        this._time += dt;
        this._wobbleTime += dt;

        // Rotor spin
        ud.rotorSpin += dt * ROTOR_SPEED;
        for (let i = 0; i < ud.rotors.length; i++) {
            ud.rotors[i].rotation.y = ud.rotorSpin + i * (Math.PI / 3);
        }

        // Warning light pulse
        if (ud.lightMesh) {
            const pulse = 0.5 + Math.sin(this._wobbleTime * 6) * 0.5;
            ud.lightMesh.material.emissiveIntensity = 0.5 + pulse * 0.5;
        }

        // Gentle drone wobble
        const wobbleX = Math.sin(this._wobbleTime * 1.8) * 0.01;
        const wobbleZ = Math.cos(this._wobbleTime * 1.5) * 0.01;

        switch (this._state) {
            case 'entering':
                this._updateEntering(dt, mesh, wobbleX, wobbleZ);
                break;
            case 'lowering':
                this._updateLowering(dt, mesh, ud, wobbleX, wobbleZ);
                break;
            case 'pulling':
                this._updatePulling(dt, mesh, scene, wobbleX, wobbleZ);
                break;
            case 'closing':
                this._updateClosing(dt, ud, wobbleX, wobbleZ, mesh);
                break;
            case 'collecting':
                this._doCollect(ud, scene);
                break;
            case 'ascending':
                this._updateAscending(dt, mesh, wobbleX, wobbleZ);
                break;
            case 'exiting':
                this._updateExiting(dt, mesh, scene, enemyPool);
                break;
        }
    }

    // ── STATE HANDLERS ──────────────────────────────────────────────────────

    _updateEntering(dt, mesh, wx, wz) {
        const t = Math.min(1, this._time / this._duration);
        const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
        mesh.position.lerpVectors(this._startPos, this._endPos, et);
        mesh.rotation.x = wx;
        mesh.rotation.z = wz;

        if (t >= 1) {
            // Start lowering claw
            this._state = 'lowering';
            this._time = 0;
            const cableLength = HOVER_HEIGHT - CLAW_DROP_HEIGHT;
            this._clawStartY = -0.5;
            this._clawEndY = -cableLength;
            this._duration = cableLength / CLAW_DROP_SPEED;
        }
    }

    _updateLowering(dt, mesh, ud, wx, wz) {
        const t = Math.min(1, this._time / this._duration);
        const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        // Extend cable + lower claw hub
        const hubY = this._clawStartY + (this._clawEndY - this._clawStartY) * et;
        ud.clawHub.position.y = hubY;

        // Scale cable to reach from winch to hub
        const cableLen = Math.abs(hubY);
        ud.cable.scale.y = cableLen;
        ud.cable.position.y = hubY / 2;

        mesh.rotation.x = wx;
        mesh.rotation.z = wz;

        if (t >= 1) {
            // Start pulling corpses toward center
            this._state = 'pulling';
            this._time = 0;
            // Compute max distance any corpse needs to travel
            let maxDist = 0;
            for (const tgt of this._targets) {
                const dx = tgt.position.x - this._centerPos.x;
                const dz = tgt.position.z - this._centerPos.z;
                maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dz * dz));
            }
            this._duration = Math.max(0.5, maxDist / PULL_SPEED);

            if (window.SFX) SFX.play('medic_pickup');
        }
    }

    _updatePulling(dt, mesh, scene, wx, wz) {
        const t = Math.min(1, this._time / this._duration);
        const et = t * t; // ease-in (accelerating pull)

        // Slide each corpse model toward center
        for (const tgt of this._targets) {
            if (!tgt.model || !tgt.model.group) continue;
            const group = tgt.model.group;
            if (!group.parent) continue;

            // Lerp from original position toward centroid + small random offset
            const tx = this._centerPos.x + (Math.random() - 0.5) * PULL_RADIUS * 0.3;
            const tz = this._centerPos.z + (Math.random() - 0.5) * PULL_RADIUS * 0.3;
            group.position.x += (tx - group.position.x) * Math.min(1, dt * 4);
            group.position.z += (tz - group.position.z) * Math.min(1, dt * 4);
        }

        mesh.rotation.x = wx;
        mesh.rotation.z = wz;

        if (t >= 1) {
            // Snap all to final cluster positions
            for (let i = 0; i < this._targets.length; i++) {
                const tgt = this._targets[i];
                if (!tgt.model || !tgt.model.group || !tgt.model.group.parent) continue;
                const angle = (Math.PI * 2 / this._targets.length) * i;
                const r = Math.min(PULL_RADIUS, this._targets.length * 0.15);
                tgt.model.group.position.x = this._centerPos.x + Math.cos(angle) * r;
                tgt.model.group.position.z = this._centerPos.z + Math.sin(angle) * r;
            }

            this._state = 'closing';
            this._time = 0;
            this._duration = CLAW_CLOSE_TIME;
        }
    }

    _updateClosing(dt, ud, wx, wz, mesh) {
        const t = Math.min(1, this._time / this._duration);

        // Animate prongs from open to closed
        const angle = CLAW_OPEN_ANGLE + (CLAW_CLOSED_ANGLE - CLAW_OPEN_ANGLE) * t;
        for (const prong of ud.prongs) {
            prong.rotation.x = angle;
        }

        mesh.rotation.x = wx;
        mesh.rotation.z = wz;

        if (t >= 1) {
            this._state = 'collecting';
        }
    }

    _doCollect(ud, scene) {
        // Reparent all corpses to the claw's corpse anchor
        const anchor = ud.corpseAnchor;
        for (const tgt of this._targets) {
            if (!tgt.model || !tgt.model.group) continue;
            const group = tgt.model.group;

            // Freeze death animation
            if (tgt.model.animController && tgt.model.animController.currentAction) {
                tgt.model.animController.currentAction.paused = true;
            }

            // Save world quaternion
            const savedQuat = new THREE.Quaternion();
            group.getWorldQuaternion(savedQuat);

            // Reparent
            anchor.attach(group);

            // Scale down for the bundle
            group.scale.multiplyScalar(0.35);

            // Restore rotation
            const parentQuat = new THREE.Quaternion();
            anchor.getWorldQuaternion(parentQuat);
            parentQuat.invert();
            group.quaternion.multiplyQuaternions(parentQuat, savedQuat);
        }

        // Transition to ascending
        this._state = 'ascending';
        this._time = 0;

        // Retract cable + lift
        this._startPos = this._mesh.position.clone();
        this._endPos = new THREE.Vector3(this._centerPos.x, EXIT_HEIGHT, this._centerPos.z);
        this._duration = (EXIT_HEIGHT - HOVER_HEIGHT) / ASCEND_SPEED;

        // Store initial hub position for retraction
        this._clawStartY = ud.clawHub.position.y;
        this._clawEndY = -DANGLE_HEIGHT; // retract to dangle distance

        if (window.SFX) SFX.play('medic_flyaway');
    }

    _updateAscending(dt, mesh, wx, wz) {
        const t = Math.min(1, this._time / this._duration);
        const et = t * t; // ease-in (accelerating lift)

        mesh.position.lerpVectors(this._startPos, this._endPos, et);

        // Retract cable while ascending
        const ud = mesh.userData;
        const hubY = this._clawStartY + (this._clawEndY - this._clawStartY) * Math.min(1, t * 2);
        ud.clawHub.position.y = hubY;
        const cableLen = Math.abs(hubY);
        ud.cable.scale.y = cableLen;
        ud.cable.position.y = hubY / 2;

        mesh.rotation.x = wx;
        mesh.rotation.z = wz;

        if (t >= 1) {
            this._state = 'exiting';
            this._time = 0;
            const exitSide = Math.random() < 0.5 ? -1 : 1;
            this._startPos = mesh.position.clone();
            this._endPos = new THREE.Vector3(exitSide * 30, EXIT_HEIGHT + 5, this._centerPos.z - 15);
            this._duration = this._startPos.distanceTo(this._endPos) / EXIT_SPEED;
        }
    }

    _updateExiting(dt, mesh, scene, enemyPool) {
        const t = Math.min(1, this._time / this._duration);
        const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        mesh.position.lerpVectors(this._startPos, this._endPos, et);

        // Tilt in direction of travel
        const dir = this._endPos.clone().sub(this._startPos).normalize();
        mesh.rotation.x = -0.15;
        mesh.rotation.z = -dir.x * 0.1;

        if (t >= 1) {
            this._finish(scene, enemyPool);
        }
    }

    // ── CLEANUP ─────────────────────────────────────────────────────────────

    _finish(scene, enemyPool) {
        const ud = this._mesh.userData;
        const anchor = ud.corpseAnchor;

        // Release all corpse models back to pool
        for (const tgt of this._targets) {
            if (!tgt.model) continue;
            const group = tgt.model.group;
            if (group.parent) group.parent.remove(group);
            group.scale.set(1, 1, 1);
            group.rotation.set(0, 0, 0);
            group.position.set(0, 0, 0);
            if (enemyPool) enemyPool.release(tgt.model);
        }
        this._targets = [];

        // Clear anchor
        while (anchor.children.length > 0) {
            anchor.remove(anchor.children[0]);
        }

        // Remove drone from scene (keep for reuse)
        scene.remove(this._mesh);
        this._mesh.visible = false;

        this._state = 'idle';

        if (this._onComplete) {
            const cb = this._onComplete;
            this._onComplete = null;
            cb();
        }
    }

    /**
     * Force-cleanup (e.g. on game restart). Releases everything immediately.
     */
    cleanup(scene, enemyPool) {
        if (this._state === 'idle') return;
        this._finish(scene, enemyPool);
    }

    dispose() {
        if (this._mesh) {
            this._mesh.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this._mesh = null;
        }
        this._targets = [];
        this._state = 'idle';
    }
}

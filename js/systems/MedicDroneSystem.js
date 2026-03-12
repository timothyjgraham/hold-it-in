// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Medic Drone System                                          ║
// ║  Defeated enemies crumple, then ambulance drones swoop in with a          ║
// ║  stretcher, collect multiple corpses (pancake-stacked), and fly off.      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE, OUTLINE_WIDTH } from '../data/palette.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';

// ─── TUNING ────────────────────────────────────────────────────────────────

const MAX_ACTIVE_DRONES = 3;          // Max medic drones in the scene at once
const MAX_STACK = 5;                  // Max corpses per stretcher run
const COLLECT_RADIUS = 6.0;           // How far a drone will detour to grab nearby corpses
const QUEUE_DELAY = 0.6;              // Seconds after death anim before corpse is "ready"
const DISPATCH_INTERVAL = 0.8;        // Min seconds between drone dispatches
const FLY_HEIGHT = 10.0;              // Cruise altitude
const APPROACH_HEIGHT = 3.5;          // Height when collecting corpses
const SWOOP_SPEED = 8.0;              // Units/sec for collection swoops
const EXIT_SPEED = 14.0;              // Units/sec for fly-off
const SQUASH_Y = 0.15;               // Y-scale of pancaked corpse on stretcher
const STACK_HEIGHT = 0.3;             // World-space height per pancaked corpse in the stack
const ROTOR_SPEED = 40;              // Rotor spin rad/sec
const WOBBLE_PER_CORPSE = 0.012;     // Extra drone wobble per stacked corpse

// ─── MEDIC DRONE MODEL ─────────────────────────────────────────────────────

function _createMedicDroneModel() {
    const root = new THREE.Group();
    root.name = 'medicDrone';

    const bodyMat = toonMat(PALETTE.medicBody);
    const crossMat = toonMat(PALETTE.medicCross, { emissive: PALETTE.medicCross, emissiveIntensity: 0.25 });
    const armMat = toonMat(PALETTE.fixture);
    const rotorMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const outW = OUTLINE_WIDTH.tower;

    // ── BODY: pill capsule (like the common upgrade drone but wider/flatter) ──
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'medicBody';
    const bodyR = 0.5, bodyH = 0.4;

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

    // Outline
    bodyGroup.add(new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR + outW, bodyR + outW, bodyH + outW * 2, 12),
        outlineMatStatic(outW)
    ));

    // ── RED CROSS on top ──
    const crossH = 0.02;
    const crossBarW = 0.35, crossBarD = 0.1;
    const crossBar1 = new THREE.Mesh(
        new THREE.BoxGeometry(crossBarW, crossH, crossBarD), crossMat
    );
    crossBar1.position.y = bodyH / 2 + 0.01;
    bodyGroup.add(crossBar1);

    const crossBar2 = new THREE.Mesh(
        new THREE.BoxGeometry(crossBarD, crossH, crossBarW), crossMat
    );
    crossBar2.position.y = bodyH / 2 + 0.01;
    bodyGroup.add(crossBar2);

    // Small red light on front
    const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        toonMat(PALETTE.medicCross, { emissive: PALETTE.medicCross, emissiveIntensity: 0.8 })
    );
    light.position.set(0, 0, bodyR + 0.02);
    bodyGroup.add(light);

    root.add(bodyGroup);

    // ── PROPELLERS (4 arms, X layout) ──
    const armLength = 0.75;
    const armPositions = [
        { x: armLength, z: armLength }, { x: armLength, z: -armLength },
        { x: -armLength, z: armLength }, { x: -armLength, z: -armLength },
    ];
    const rotors = [];
    for (const ap of armPositions) {
        const diagLength = Math.sqrt(ap.x * ap.x + ap.z * ap.z);
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(diagLength, 0.03, 0.05), armMat
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
        for (let b = 0; b < 2; b++) {
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.55, 0.01, 0.06), rotorMat
            );
            blade.rotation.y = (Math.PI / 2) * b;
            rotorGroup.add(blade);
        }
        root.add(rotorGroup);
        rotors.push(rotorGroup);
    }

    // ── STRETCHER (hangs below body) ──
    const stretcherGroup = new THREE.Group();
    stretcherGroup.name = 'stretcher';

    const bedMat = toonMat(PALETTE.medicBed);
    const railMat = toonMat(PALETTE.fixture);

    // Flat bed
    const bedW = 1.8, bedD = 0.8, bedH = 0.06;
    const bed = new THREE.Mesh(
        new THREE.BoxGeometry(bedW, bedH, bedD), bedMat
    );
    stretcherGroup.add(bed);

    // Bed outline
    stretcherGroup.add(new THREE.Mesh(
        new THREE.BoxGeometry(bedW + outW * 2, bedH + outW * 2, bedD + outW * 2),
        outlineMatStatic(outW)
    ));

    // Side rails
    const railR = 0.02, railLen = bedW;
    for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(railR, railR, railLen, 6), railMat
        );
        rail.rotation.z = Math.PI / 2;
        rail.position.set(0, bedH / 2 + railR, sz * (bedD / 2 + railR));
        stretcherGroup.add(rail);
    }

    // 4 cable/chain lines connecting stretcher to body
    const cableMat = toonMat(PALETTE.fixture);
    const cableLength = 0.6;
    const cablePositions = [
        { x: bedW * 0.35, z: bedD * 0.35 },
        { x: -bedW * 0.35, z: bedD * 0.35 },
        { x: bedW * 0.35, z: -bedD * 0.35 },
        { x: -bedW * 0.35, z: -bedD * 0.35 },
    ];
    for (const cp of cablePositions) {
        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, cableLength, 4), cableMat
        );
        cable.position.set(cp.x, bedH / 2 + cableLength / 2, cp.z);
        stretcherGroup.add(cable);
    }

    // Position stretcher below body
    stretcherGroup.position.y = -(bodyH / 2) - cableLength - bedH / 2;
    root.add(stretcherGroup);

    // ── CORPSE STACK ANCHOR (empty group on top of the bed surface) ──
    const stackAnchor = new THREE.Group();
    stackAnchor.name = 'stackAnchor';
    stackAnchor.position.y = bedH / 2 + 0.02;
    stretcherGroup.add(stackAnchor);

    // Store references for animation
    root.userData = {
        type: 'medicDrone',
        rotors,
        bodyGroup,
        stretcherGroup,
        stackAnchor,
        rotorSpin: 0,
        lightMesh: light,
    };

    return root;
}

// ─── MEDIC DRONE SYSTEM ────────────────────────────────────────────────────

/**
 * MedicDroneSystem — manages corpse collection by ambulance drones.
 *
 * Flow:
 *  1. Enemy dies → death anim plays → corpse queued (with mesh ref + position)
 *  2. System dispatches a medic drone toward nearest cluster of queued corpses
 *  3. Drone swoops to each corpse, squashes it onto the stretcher stack
 *  4. After collecting up to MAX_STACK (or no more nearby), drone flies off
 *  5. On exit, corpse meshes are released back to EnemyPool
 */
export class MedicDroneSystem {
    constructor() {
        this._corpseQueue = [];      // { model, position, readyTimer, type }
        this._activeDrones = [];     // { mesh, state, targets, stack, ... }
        this._dronePool = [];        // Reusable drone meshes
        this._dispatchTimer = 0;
    }

    /**
     * Pre-create drone meshes for the pool.
     * @param {number} count
     */
    preAllocate(count = MAX_ACTIVE_DRONES + 1) {
        for (let i = 0; i < count; i++) {
            const mesh = _createMedicDroneModel();
            mesh.visible = false;
            this._dronePool.push(mesh);
        }
    }

    /**
     * Queue a defeated enemy for medic pickup.
     * Called after death animation starts. The model reference is kept so
     * the medic drone can reparent the mesh onto the stretcher.
     *
     * @param {Object} model - { group, skinnedMesh, skeleton, boneMap, outlineMesh, materials, animController, enemyType }
     * @param {THREE.Vector3} position - World position where enemy died
     */
    queueCorpse(model, position) {
        this._corpseQueue.push({
            model,
            position: position.clone(),
            readyTimer: QUEUE_DELAY,
            collected: false,
        });
    }

    /**
     * Main update — call every frame.
     * @param {number} dt - Delta time in seconds
     * @param {THREE.Scene} scene
     * @param {EnemyPool} enemyPool - For releasing models after fly-off
     */
    update(dt, scene, enemyPool) {
        // Tick down readyTimers
        for (const c of this._corpseQueue) {
            if (c.readyTimer > 0) c.readyTimer -= dt;
        }

        // Dispatch new drones
        this._dispatchTimer -= dt;
        if (this._dispatchTimer <= 0 && this._activeDrones.length < MAX_ACTIVE_DRONES) {
            this._tryDispatch(scene);
            this._dispatchTimer = DISPATCH_INTERVAL;
        }

        // Update active drones
        for (let i = this._activeDrones.length - 1; i >= 0; i--) {
            const drone = this._activeDrones[i];
            this._updateDrone(drone, dt, scene, enemyPool);
            if (drone.state === 'done') {
                this._recycleDrone(drone, scene, enemyPool);
                this._activeDrones.splice(i, 1);
            }
        }
    }

    /**
     * Clean up everything (game restart).
     * @param {THREE.Scene} scene
     * @param {EnemyPool} enemyPool
     */
    cleanup(scene, enemyPool) {
        // Release any queued corpses back to pool immediately
        for (const c of this._corpseQueue) {
            if (c.model && enemyPool) {
                if (c.model.group.parent) c.model.group.parent.remove(c.model.group);
                enemyPool.release(c.model);
            }
        }
        this._corpseQueue = [];

        // Remove active drones and release their stacked corpses
        for (const drone of this._activeDrones) {
            this._recycleDrone(drone, scene, enemyPool);
        }
        this._activeDrones = [];

        this._dispatchTimer = 0;
    }

    /**
     * Full disposal (destroy pool meshes).
     */
    dispose() {
        for (const mesh of this._dronePool) {
            _disposeMesh(mesh);
        }
        this._dronePool = [];
        for (const drone of this._activeDrones) {
            _disposeMesh(drone.mesh);
        }
        this._activeDrones = [];
        this._corpseQueue = [];
    }

    // ── PRIVATE ──────────────────────────────────────────────────────────────

    _acquireDrone() {
        if (this._dronePool.length > 0) {
            const mesh = this._dronePool.pop();
            mesh.visible = true;
            mesh.userData.rotorSpin = 0;
            // Clear old stack anchor children
            const anchor = mesh.userData.stackAnchor;
            while (anchor.children.length > 0) anchor.remove(anchor.children[0]);
            return mesh;
        }
        return _createMedicDroneModel();
    }

    _tryDispatch(scene) {
        // Find ready corpses
        const ready = this._corpseQueue.filter(c => c.readyTimer <= 0 && !c.collected);
        if (ready.length === 0) return;

        // Pick the oldest ready corpse as the seed
        const seed = ready[0];

        // Gather nearby corpses into a collection route
        const targets = [seed];
        seed.collected = true;

        // Greedily add nearby ready corpses up to MAX_STACK
        for (let n = 1; n < MAX_STACK && n < ready.length; n++) {
            const last = targets[targets.length - 1];
            let bestDist = COLLECT_RADIUS;
            let bestIdx = -1;
            for (let j = 0; j < ready.length; j++) {
                if (ready[j].collected) continue;
                const dist = last.position.distanceTo(ready[j].position);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = j;
                }
            }
            if (bestIdx >= 0) {
                ready[bestIdx].collected = true;
                targets.push(ready[bestIdx]);
            } else {
                break;
            }
        }

        // Spawn drone
        const droneMesh = this._acquireDrone();

        // Entry position: fly in from behind camera (low Z = south, high Z = north)
        // Enemies come from north, so medic enters from east/west side at cruise altitude
        const side = Math.random() < 0.5 ? -1 : 1;
        const entryX = side * 20;
        const entryZ = targets[0].position.z;
        droneMesh.position.set(entryX, FLY_HEIGHT, entryZ);
        scene.add(droneMesh);

        this._activeDrones.push({
            mesh: droneMesh,
            state: 'entering',   // entering → collecting → exiting → done
            targets,
            targetIndex: 0,
            stack: [],           // Collected model refs (for pool release on exit)
            stackCount: 0,
            time: 0,

            // Entry animation
            entryStart: new THREE.Vector3(entryX, FLY_HEIGHT, entryZ),
            entryEnd: new THREE.Vector3(targets[0].position.x, APPROACH_HEIGHT, targets[0].position.z),
            entryDuration: 0,    // Calculated below

            // Per-state position tracking
            prevPos: new THREE.Vector3(entryX, FLY_HEIGHT, entryZ),
            swoopFrom: null,
            swoopTo: null,
            swoopDuration: 0,

            // Exit
            exitStart: null,
            exitEnd: null,
            exitDuration: 0,

            // Wobble
            wobbleTime: Math.random() * 100,
        });

        // Calculate entry duration based on distance
        const drone = this._activeDrones[this._activeDrones.length - 1];
        const entryDist = drone.entryStart.distanceTo(drone.entryEnd);
        drone.entryDuration = entryDist / EXIT_SPEED;
    }

    _updateDrone(drone, dt, scene, enemyPool) {
        const mesh = drone.mesh;
        const ud = mesh.userData;
        drone.time += dt;
        drone.wobbleTime += dt;

        // Rotor spin (always)
        ud.rotorSpin += dt * ROTOR_SPEED;
        for (let i = 0; i < ud.rotors.length; i++) {
            ud.rotors[i].rotation.y = ud.rotorSpin + i * Math.PI / ud.rotors.length;
        }

        // Red light pulse
        if (ud.lightMesh) {
            const pulse = 0.5 + Math.sin(drone.wobbleTime * 4) * 0.5;
            ud.lightMesh.material.emissiveIntensity = 0.4 + pulse * 0.6;
        }

        // Base wobble (increases with stack)
        const wobbleBase = 0.015 + drone.stackCount * WOBBLE_PER_CORPSE;
        const wobbleX = Math.sin(drone.wobbleTime * 2.3) * wobbleBase;
        const wobbleZ = Math.cos(drone.wobbleTime * 1.9) * wobbleBase;

        if (drone.state === 'entering') {
            const t = Math.min(1, drone.time / drone.entryDuration);
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease in-out
            mesh.position.lerpVectors(drone.entryStart, drone.entryEnd, et);

            if (t >= 1) {
                drone.state = 'collecting';
                drone.time = 0;
                drone.targetIndex = 0;
                this._startSwoop(drone);
            }
        } else if (drone.state === 'collecting') {
            if (!drone.swoopTo) {
                // No more targets — exit
                drone.state = 'ascending';
                drone.time = 0;
                drone.ascentStart = mesh.position.clone();
                drone.ascentEnd = new THREE.Vector3(mesh.position.x, FLY_HEIGHT, mesh.position.z);
                drone.ascentDuration = (FLY_HEIGHT - mesh.position.y) / SWOOP_SPEED;
                return;
            }

            const t = Math.min(1, drone.time / drone.swoopDuration);
            // Swoop arc: ease into descent, ease out at pickup
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            // Arc through a midpoint above
            const mid = new THREE.Vector3().lerpVectors(drone.swoopFrom, drone.swoopTo, 0.5);
            mid.y = Math.max(drone.swoopFrom.y, drone.swoopTo.y) + 1.5;

            // Quadratic bezier
            const p0 = drone.swoopFrom;
            const p1 = mid;
            const p2 = drone.swoopTo;
            const oneMinusT = 1 - et;
            mesh.position.set(
                oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * et * p1.x + et * et * p2.x,
                oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * et * p1.y + et * et * p2.y,
                oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * et * p1.z + et * et * p2.z,
            );

            if (t >= 1) {
                // Collect this corpse
                this._collectCorpse(drone, scene);
                drone.targetIndex++;

                // More targets?
                if (drone.targetIndex < drone.targets.length) {
                    drone.time = 0;
                    this._startSwoop(drone);
                } else {
                    // Done collecting — ascend
                    drone.state = 'ascending';
                    drone.time = 0;
                    drone.ascentStart = mesh.position.clone();
                    drone.ascentEnd = new THREE.Vector3(mesh.position.x, FLY_HEIGHT, mesh.position.z);
                    drone.ascentDuration = Math.max(0.3, (FLY_HEIGHT - mesh.position.y) / SWOOP_SPEED);
                }
            }
        } else if (drone.state === 'ascending') {
            const t = Math.min(1, drone.time / drone.ascentDuration);
            const et = t * t; // ease-in (gentle lift)
            mesh.position.lerpVectors(drone.ascentStart, drone.ascentEnd, et);

            if (t >= 1) {
                drone.state = 'exiting';
                drone.time = 0;
                // Fly off to the opposite side from entry
                const exitSide = mesh.position.x > 0 ? 1 : -1;
                drone.exitStart = mesh.position.clone();
                drone.exitEnd = new THREE.Vector3(exitSide * 25, FLY_HEIGHT + 3, mesh.position.z - 10);
                const exitDist = drone.exitStart.distanceTo(drone.exitEnd);
                drone.exitDuration = exitDist / EXIT_SPEED;
            }
        } else if (drone.state === 'exiting') {
            const t = Math.min(1, drone.time / drone.exitDuration);
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            mesh.position.lerpVectors(drone.exitStart, drone.exitEnd, et);

            if (t >= 1) {
                drone.state = 'done';
            }
        }

        // Drone tilt based on movement
        const velocity = mesh.position.clone().sub(drone.prevPos);
        if (velocity.length() > 0.001) {
            const speed = velocity.length() / Math.max(dt, 0.001);
            const tiltAmount = Math.min(0.3, speed * 0.02);
            const horizDir = new THREE.Vector2(velocity.x, velocity.z);
            if (horizDir.length() > 0.001) {
                horizDir.normalize();
                mesh.rotation.y = Math.atan2(horizDir.x, horizDir.y);
                mesh.rotation.x = -tiltAmount + wobbleX;
                mesh.rotation.z = -velocity.x * 0.1 + wobbleZ;
            }
        } else {
            mesh.rotation.x = wobbleX;
            mesh.rotation.z = wobbleZ;
        }
        drone.prevPos.copy(mesh.position);

        // Stretcher pendulum swing based on movement
        const stretcherGroup = ud.stretcherGroup;
        if (stretcherGroup) {
            const swingTarget = -velocity.x * 0.08;
            stretcherGroup.rotation.z += (swingTarget - stretcherGroup.rotation.z) * Math.min(1, dt * 5);
            // Counter-rotation so stretcher stays more level than the drone body
            stretcherGroup.rotation.x = mesh.rotation.x * -0.5;
        }
    }

    _startSwoop(drone) {
        const target = drone.targets[drone.targetIndex];
        if (!target) {
            drone.swoopTo = null;
            return;
        }
        drone.swoopFrom = drone.mesh.position.clone();
        drone.swoopTo = new THREE.Vector3(target.position.x, APPROACH_HEIGHT, target.position.z);
        const dist = drone.swoopFrom.distanceTo(drone.swoopTo);
        drone.swoopDuration = Math.max(0.3, dist / SWOOP_SPEED);
    }

    _collectCorpse(drone, scene) {
        const target = drone.targets[drone.targetIndex];
        if (!target || !target.model) return;

        const model = target.model;
        const group = model.group;

        // Remove from scene
        if (group.parent) group.parent.remove(group);

        // Stop animation so the corpse freezes in death pose
        if (model.animController && model.animController._currentAction) {
            model.animController._currentAction.paused = true;
        }

        // Squash the corpse into a pancake
        group.scale.set(1, SQUASH_Y, 1);

        // Reset rotation so it lies flat on the stretcher
        group.rotation.set(0, Math.random() * Math.PI * 2, 0); // Random yaw for variety

        // Position on the stack
        const stackY = drone.stackCount * STACK_HEIGHT;
        group.position.set(
            (Math.random() - 0.5) * 0.3, // Slight random X offset for messiness
            stackY,
            (Math.random() - 0.5) * 0.15  // Slight random Z offset
        );

        group.visible = true;

        // Add to stretcher's stack anchor
        const anchor = drone.mesh.userData.stackAnchor;
        anchor.add(group);

        drone.stack.push(model);
        drone.stackCount++;

        // Remove from corpse queue
        const qIdx = this._corpseQueue.indexOf(target);
        if (qIdx >= 0) this._corpseQueue.splice(qIdx, 1);
    }

    _recycleDrone(drone, scene, enemyPool) {
        const mesh = drone.mesh;

        // Release all stacked corpses back to pool
        const anchor = mesh.userData.stackAnchor;
        for (const model of drone.stack) {
            if (model.group.parent) model.group.parent.remove(model.group);
            // Reset transforms before pool release
            model.group.scale.set(1, 1, 1);
            model.group.rotation.set(0, 0, 0);
            model.group.position.set(0, 0, 0);
            if (model.animController && model.animController._currentAction) {
                model.animController._currentAction.paused = false;
            }
            if (enemyPool) {
                enemyPool.release(model);
            }
        }
        drone.stack = [];

        // Remove drone from scene and return to pool
        scene.remove(mesh);
        mesh.visible = false;
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        // Clear stack anchor
        while (anchor.children.length > 0) anchor.remove(anchor.children[0]);
        // Reset stretcher rotation
        if (mesh.userData.stretcherGroup) {
            mesh.userData.stretcherGroup.rotation.set(0, 0, 0);
        }
        this._dronePool.push(mesh);
    }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function _disposeMesh(root) {
    root.traverse(child => {
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
}

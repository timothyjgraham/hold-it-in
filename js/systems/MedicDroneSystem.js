// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Medic Drone System                                          ║
// ║  Defeated enemies collapse with birdies circling their heads, then        ║
// ║  ambulance drones swoop in, lay corpses flat on stacked stretcher layers, ║
// ║  and fly off with a chain of stretchers dangling below.                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE, OUTLINE_WIDTH } from '../data/palette.js';
import { toonMat, outlineMatStatic } from '../shaders/toonMaterials.js';

// ─── TUNING ────────────────────────────────────────────────────────────────

const MAX_ACTIVE_DRONES = 3;          // Max medic drones in the scene at once
const MAX_STACK = 5;                  // Max corpses per stretcher chain run
const COLLECT_RADIUS = 6.0;           // How far a drone will detour to grab nearby corpses
const QUEUE_DELAY = 0.6;              // Seconds after death anim before corpse is "ready"
const DISPATCH_INTERVAL = 0.8;        // Min seconds between drone dispatches
const FLY_HEIGHT = 10.0;              // Cruise altitude
const APPROACH_HEIGHT = 3.0;          // Base height when collecting (rises with layers)
const SWOOP_SPEED = 8.0;              // Units/sec for collection swoops
const EXIT_SPEED = 14.0;              // Units/sec for fly-off
const CORPSE_SCALE = 0.4;            // Scale of corpses lying on stretchers
const LAYER_CABLE_LEN = 0.35;        // Cable length between stretcher layers
const LAYER_BED_H = 0.06;            // Bed thickness per layer
const LAYER_HEIGHT = LAYER_CABLE_LEN + LAYER_BED_H + 0.15; // Total height per additional layer
const ROTOR_SPEED = 40;              // Rotor spin rad/sec
const WOBBLE_PER_CORPSE = 0.012;     // Extra drone wobble per stacked corpse

// ─── BIRDIES ─────────────────────────────────────────────────────────────

const BIRDIE_COUNT = 3;
const BIRDIE_RADIUS = 0.4;
const BIRDIE_ORBIT_SPEED = 3.0;      // rad/sec
const BIRDIE_BOB_SPEED = 2.5;        // Vertical bob frequency
const BIRDIE_BOB_AMP = 0.08;         // Vertical bob amplitude
const BIRDIE_HEIGHT = 1.2;           // Height above ground for birdie orbit

function _createBirdies() {
    const root = new THREE.Group();
    root.name = 'birdies';

    const birdMat = toonMat(PALETTE.gold);

    for (let i = 0; i < BIRDIE_COUNT; i++) {
        const bird = new THREE.Group();

        // Body: small stretched diamond shape
        const body = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.06, 0),
            birdMat
        );
        body.scale.set(1.0, 0.6, 1.6);
        bird.add(body);

        // Wing stubs
        const wingGeo = new THREE.BufferGeometry();
        const wingVerts = new Float32Array([
            0, 0, 0,   0.10, 0.02, 0,   0.05, 0, 0.03
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
        wingGeo.computeVertexNormals();
        const wingL = new THREE.Mesh(wingGeo, birdMat);
        wingL.position.x = 0.04;
        bird.add(wingL);
        const wingR = new THREE.Mesh(wingGeo, birdMat);
        wingR.scale.x = -1;
        wingR.position.x = -0.04;
        bird.add(wingR);

        const angle = (i / BIRDIE_COUNT) * Math.PI * 2;
        bird.position.set(
            Math.cos(angle) * BIRDIE_RADIUS,
            Math.sin(i * 1.3) * 0.05,
            Math.sin(angle) * BIRDIE_RADIUS
        );

        root.add(bird);
    }

    return root;
}

// ─── STRETCHER LAYER (dynamic, created per additional corpse pickup) ─────

const _layerBedW = 1.8, _layerBedD = 0.8;

function _createStretcherLayer() {
    const root = new THREE.Group();
    root.name = 'stretcherLayer';

    const bedMat = toonMat(PALETTE.medicBed);
    const railMat = toonMat(PALETTE.fixture);
    const cableMat = toonMat(PALETTE.fixture);
    const outW = OUTLINE_WIDTH.tower;

    // 4 cables going DOWN from the bed above to this bed
    const cablePositions = [
        { x: _layerBedW * 0.35, z: _layerBedD * 0.35 },
        { x: -_layerBedW * 0.35, z: _layerBedD * 0.35 },
        { x: _layerBedW * 0.35, z: -_layerBedD * 0.35 },
        { x: -_layerBedW * 0.35, z: -_layerBedD * 0.35 },
    ];
    for (const cp of cablePositions) {
        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, LAYER_CABLE_LEN, 4), cableMat
        );
        cable.position.set(cp.x, -(LAYER_CABLE_LEN / 2), cp.z);
        root.add(cable);
    }

    // Bed at the bottom of the cables
    const bedGroup = new THREE.Group();
    bedGroup.position.y = -(LAYER_CABLE_LEN + LAYER_BED_H / 2);

    bedGroup.add(new THREE.Mesh(
        new THREE.BoxGeometry(_layerBedW, LAYER_BED_H, _layerBedD), bedMat
    ));
    bedGroup.add(new THREE.Mesh(
        new THREE.BoxGeometry(_layerBedW + outW * 2, LAYER_BED_H + outW * 2, _layerBedD + outW * 2),
        outlineMatStatic(outW)
    ));

    // Side rails
    const railR = 0.02;
    for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(railR, railR, _layerBedW, 6), railMat
        );
        rail.rotation.z = Math.PI / 2;
        rail.position.set(0, LAYER_BED_H / 2 + railR, sz * (_layerBedD / 2 + railR));
        bedGroup.add(rail);
    }

    root.add(bedGroup);

    // Corpse anchor on top of the bed surface
    const corpseAnchor = new THREE.Group();
    corpseAnchor.position.y = LAYER_BED_H / 2 + 0.02;
    bedGroup.add(corpseAnchor);

    return { root, corpseAnchor };
}

// ─── MEDIC DRONE MODEL ─────────────────────────────────────────────────────

function _createMedicDroneModel() {
    const root = new THREE.Group();
    root.name = 'medicDrone';

    const bodyMat = toonMat(PALETTE.medicBody);
    const crossMat = toonMat(PALETTE.medicCross, { emissive: PALETTE.medicCross, emissiveIntensity: 0.5 });
    const armMat = toonMat(PALETTE.fixture);
    const rotorMat = toonMat(PALETTE.white, { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const outW = OUTLINE_WIDTH.tower;

    // ── BODY: pill capsule ──
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

    // ── BIG RED CROSS — clearly visible from top-down camera ──

    // White circle pad on top of dome (helipad-style background)
    const padY = bodyH / 2 + bodyR * 0.85; // Near top of dome
    const padMat = toonMat(PALETTE.white);
    const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(bodyR * 0.7, bodyR * 0.7, 0.02, 16), padMat
    );
    pad.position.y = padY;
    bodyGroup.add(pad);

    // Red cross on the pad — big, thick, glowing
    const cw = 0.55, cd = 0.14, ch = 0.04;
    const topCross1 = new THREE.Mesh(
        new THREE.BoxGeometry(cw, ch, cd), crossMat
    );
    topCross1.position.y = padY + 0.02;
    bodyGroup.add(topCross1);

    const topCross2 = new THREE.Mesh(
        new THREE.BoxGeometry(cd, ch, cw), crossMat
    );
    topCross2.position.y = padY + 0.02;
    bodyGroup.add(topCross2);

    // Side crosses (front and back of the body) — visible from camera angle
    const sideCrossW = 0.28, sideCrossD = 0.08, sideCrossH = 0.02;
    for (const zSign of [-1, 1]) {
        const bar1 = new THREE.Mesh(
            new THREE.BoxGeometry(sideCrossW, sideCrossD, sideCrossH), crossMat
        );
        bar1.position.set(0, 0, zSign * (bodyR + 0.01));
        bodyGroup.add(bar1);

        const bar2 = new THREE.Mesh(
            new THREE.BoxGeometry(sideCrossD, sideCrossW, sideCrossH), crossMat
        );
        bar2.position.set(0, 0, zSign * (bodyR + 0.01));
        bodyGroup.add(bar2);
    }

    // Left/right side crosses
    for (const xSign of [-1, 1]) {
        const bar1 = new THREE.Mesh(
            new THREE.BoxGeometry(sideCrossH, sideCrossD, sideCrossW), crossMat
        );
        bar1.position.set(xSign * (bodyR + 0.01), 0, 0);
        bodyGroup.add(bar1);

        const bar2 = new THREE.Mesh(
            new THREE.BoxGeometry(sideCrossH, sideCrossW, sideCrossD), crossMat
        );
        bar2.position.set(xSign * (bodyR + 0.01), 0, 0);
        bodyGroup.add(bar2);
    }

    // Red light on front
    const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        toonMat(PALETTE.medicCross, { emissive: PALETTE.medicCross, emissiveIntensity: 0.8 })
    );
    light.position.set(0, -bodyH * 0.2, bodyR + 0.03);
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

    // ── STRETCHER (first bed — hangs below body via cables) ──
    const stretcherGroup = new THREE.Group();
    stretcherGroup.name = 'stretcher';

    const bedMat = toonMat(PALETTE.medicBed);
    const railMat = toonMat(PALETTE.fixture);

    const bedW = 1.8, bedD = 0.8, bedH = 0.06;
    const bed = new THREE.Mesh(
        new THREE.BoxGeometry(bedW, bedH, bedD), bedMat
    );
    stretcherGroup.add(bed);

    stretcherGroup.add(new THREE.Mesh(
        new THREE.BoxGeometry(bedW + outW * 2, bedH + outW * 2, bedD + outW * 2),
        outlineMatStatic(outW)
    ));

    const railR = 0.02, railLen = bedW;
    for (const sz of [-1, 1]) {
        const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(railR, railR, railLen, 6), railMat
        );
        rail.rotation.z = Math.PI / 2;
        rail.position.set(0, bedH / 2 + railR, sz * (bedD / 2 + railR));
        stretcherGroup.add(rail);
    }

    // 4 cables connecting stretcher to body (long so stretcher hangs well below drone)
    const cableMat = toonMat(PALETTE.fixture);
    const cableLength = 1.5;
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

    stretcherGroup.position.y = -(bodyH / 2) - cableLength - bedH / 2;
    root.add(stretcherGroup);

    // ── STACK ANCHOR (on top of the first bed surface) ──
    const stackAnchor = new THREE.Group();
    stackAnchor.name = 'stackAnchor';
    stackAnchor.position.y = bedH / 2 + 0.02;
    stretcherGroup.add(stackAnchor);

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
 *  1. Enemy dies → death anim plays → corpse queued with birdies circling head
 *  2. System dispatches a medic drone toward nearest cluster of queued corpses
 *  3. Drone swoops to each corpse, lays it flat on a stretcher layer
 *  4. Each pickup after the first adds a new stretcher bed below the chain
 *  5. On exit, corpse meshes are released back to EnemyPool
 */
export class MedicDroneSystem {
    constructor() {
        this._corpseQueue = [];      // { model, position, readyTimer, collected, birdies }
        this._activeDrones = [];     // { mesh, state, targets, stack, ... }
        this._dronePool = [];        // Reusable drone meshes
        this._dispatchTimer = 0;
    }

    preAllocate(count = MAX_ACTIVE_DRONES + 1) {
        for (let i = 0; i < count; i++) {
            const mesh = _createMedicDroneModel();
            mesh.visible = false;
            this._dronePool.push(mesh);
        }
    }

    /**
     * Queue a defeated enemy for medic pickup.
     * @param {Object} model
     * @param {THREE.Vector3} position
     * @param {THREE.Scene} scene
     */
    queueCorpse(model, position, scene) {
        const birdies = _createBirdies();
        birdies.position.set(position.x, BIRDIE_HEIGHT, position.z);
        if (scene) scene.add(birdies);

        this._corpseQueue.push({
            model,
            position: position.clone(),
            readyTimer: QUEUE_DELAY,
            collected: false,
            birdies,
        });
    }

    update(dt, scene, enemyPool) {
        // Tick down readyTimers + animate birdies
        for (const c of this._corpseQueue) {
            if (c.readyTimer > 0) c.readyTimer -= dt;
            if (c.birdies) {
                c.birdies.rotation.y += dt * BIRDIE_ORBIT_SPEED;
                const t = c.birdies.rotation.y;
                for (let i = 0; i < c.birdies.children.length; i++) {
                    c.birdies.children[i].position.y = Math.sin(t * BIRDIE_BOB_SPEED + i * 2.1) * BIRDIE_BOB_AMP;
                }
            }
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

    cleanup(scene, enemyPool) {
        for (const c of this._corpseQueue) {
            if (c.birdies && c.birdies.parent) c.birdies.parent.remove(c.birdies);
            if (c.model && enemyPool) {
                if (c.model.group.parent) c.model.group.parent.remove(c.model.group);
                enemyPool.release(c.model);
            }
        }
        this._corpseQueue = [];

        for (const drone of this._activeDrones) {
            this._recycleDrone(drone, scene, enemyPool);
        }
        this._activeDrones = [];
        this._dispatchTimer = 0;
    }

    dispose() {
        for (const mesh of this._dronePool) _disposeMesh(mesh);
        this._dronePool = [];
        for (const drone of this._activeDrones) _disposeMesh(drone.mesh);
        this._activeDrones = [];
        this._corpseQueue = [];
    }

    // ── PRIVATE ──────────────────────────────────────────────────────────────

    _acquireDrone() {
        if (this._dronePool.length > 0) {
            const mesh = this._dronePool.pop();
            mesh.visible = true;
            mesh.userData.rotorSpin = 0;
            const anchor = mesh.userData.stackAnchor;
            while (anchor.children.length > 0) anchor.remove(anchor.children[0]);
            return mesh;
        }
        return _createMedicDroneModel();
    }

    _tryDispatch(scene) {
        const ready = this._corpseQueue.filter(c => c.readyTimer <= 0 && !c.collected);
        if (ready.length === 0) return;

        const seed = ready[0];
        const targets = [seed];
        seed.collected = true;

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

        const droneMesh = this._acquireDrone();
        const side = Math.random() < 0.5 ? -1 : 1;
        const entryX = side * 20;
        const entryZ = targets[0].position.z;
        droneMesh.position.set(entryX, FLY_HEIGHT, entryZ);
        scene.add(droneMesh);

        this._activeDrones.push({
            mesh: droneMesh,
            state: 'entering',
            targets,
            targetIndex: 0,
            stack: [],
            stackCount: 0,
            time: 0,
            entryStart: new THREE.Vector3(entryX, FLY_HEIGHT, entryZ),
            entryEnd: new THREE.Vector3(targets[0].position.x, APPROACH_HEIGHT, targets[0].position.z),
            entryDuration: 0,
            prevPos: new THREE.Vector3(entryX, FLY_HEIGHT, entryZ),
            swoopFrom: null,
            swoopTo: null,
            swoopDuration: 0,
            exitStart: null,
            exitEnd: null,
            exitDuration: 0,
            wobbleTime: Math.random() * 100,
        });

        const drone = this._activeDrones[this._activeDrones.length - 1];
        drone.entryDuration = drone.entryStart.distanceTo(drone.entryEnd) / EXIT_SPEED;
    }

    _updateDrone(drone, dt, scene, enemyPool) {
        const mesh = drone.mesh;
        const ud = mesh.userData;
        drone.time += dt;
        drone.wobbleTime += dt;

        ud.rotorSpin += dt * ROTOR_SPEED;
        for (let i = 0; i < ud.rotors.length; i++) {
            ud.rotors[i].rotation.y = ud.rotorSpin + i * Math.PI / ud.rotors.length;
        }

        if (ud.lightMesh) {
            const pulse = 0.5 + Math.sin(drone.wobbleTime * 4) * 0.5;
            ud.lightMesh.material.emissiveIntensity = 0.4 + pulse * 0.6;
        }

        const wobbleBase = 0.015 + drone.stackCount * WOBBLE_PER_CORPSE;
        const wobbleX = Math.sin(drone.wobbleTime * 2.3) * wobbleBase;
        const wobbleZ = Math.cos(drone.wobbleTime * 1.9) * wobbleBase;

        if (drone.state === 'entering') {
            const t = Math.min(1, drone.time / drone.entryDuration);
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            mesh.position.lerpVectors(drone.entryStart, drone.entryEnd, et);

            if (t >= 1) {
                drone.state = 'collecting';
                drone.time = 0;
                drone.targetIndex = 0;
                if (window.SFX) SFX.play('medic_pickup');
                this._startSwoop(drone);
            }
        } else if (drone.state === 'collecting') {
            if (!drone.swoopTo) {
                drone.state = 'ascending';
                drone.time = 0;
                drone.ascentStart = mesh.position.clone();
                drone.ascentEnd = new THREE.Vector3(mesh.position.x, FLY_HEIGHT, mesh.position.z);
                drone.ascentDuration = (FLY_HEIGHT - mesh.position.y) / SWOOP_SPEED;
                return;
            }

            const t = Math.min(1, drone.time / drone.swoopDuration);
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const mid = new THREE.Vector3().lerpVectors(drone.swoopFrom, drone.swoopTo, 0.5);
            mid.y = Math.max(drone.swoopFrom.y, drone.swoopTo.y) + 1.5;

            const p0 = drone.swoopFrom, p1 = mid, p2 = drone.swoopTo;
            const oneMinusT = 1 - et;
            mesh.position.set(
                oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * et * p1.x + et * et * p2.x,
                oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * et * p1.y + et * et * p2.y,
                oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * et * p1.z + et * et * p2.z,
            );

            if (t >= 1) {
                this._collectCorpse(drone, scene);
                drone.targetIndex++;

                if (drone.targetIndex < drone.targets.length) {
                    drone.time = 0;
                    this._startSwoop(drone);
                } else {
                    drone.state = 'ascending';
                    drone.time = 0;
                    drone.ascentStart = mesh.position.clone();
                    drone.ascentEnd = new THREE.Vector3(mesh.position.x, FLY_HEIGHT, mesh.position.z);
                    drone.ascentDuration = Math.max(0.3, (FLY_HEIGHT - mesh.position.y) / SWOOP_SPEED);
                }
            }
        } else if (drone.state === 'ascending') {
            const t = Math.min(1, drone.time / drone.ascentDuration);
            const et = t * t;
            mesh.position.lerpVectors(drone.ascentStart, drone.ascentEnd, et);

            if (t >= 1) {
                drone.state = 'exiting';
                drone.time = 0;
                const exitSide = mesh.position.x > 0 ? 1 : -1;
                drone.exitStart = mesh.position.clone();
                drone.exitEnd = new THREE.Vector3(exitSide * 25, FLY_HEIGHT + 3, mesh.position.z - 10);
                drone.exitDuration = drone.exitStart.distanceTo(drone.exitEnd) / EXIT_SPEED;
            }
        } else if (drone.state === 'exiting') {
            const t = Math.min(1, drone.time / drone.exitDuration);
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            mesh.position.lerpVectors(drone.exitStart, drone.exitEnd, et);

            if (t >= 1) drone.state = 'done';
        }

        // Drone tilt
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

        // Stretcher pendulum
        const stretcherGroup = ud.stretcherGroup;
        if (stretcherGroup) {
            const swingTarget = -velocity.x * 0.08;
            stretcherGroup.rotation.z += (swingTarget - stretcherGroup.rotation.z) * Math.min(1, dt * 5);
            stretcherGroup.rotation.x = mesh.rotation.x * -0.5;
        }
    }

    _startSwoop(drone) {
        const target = drone.targets[drone.targetIndex];
        if (!target) { drone.swoopTo = null; return; }
        drone.swoopFrom = drone.mesh.position.clone();
        // Approach height rises with each layer so the chain doesn't drag on the ground
        const approachY = APPROACH_HEIGHT + drone.stackCount * LAYER_HEIGHT;
        drone.swoopTo = new THREE.Vector3(target.position.x, approachY, target.position.z);
        const dist = drone.swoopFrom.distanceTo(drone.swoopTo);
        drone.swoopDuration = Math.max(0.3, dist / SWOOP_SPEED);
    }

    _collectCorpse(drone, scene) {
        const target = drone.targets[drone.targetIndex];
        if (!target || !target.model) return;

        const model = target.model;
        const group = model.group;

        // Remove birdies
        if (target.birdies) {
            if (target.birdies.parent) target.birdies.parent.remove(target.birdies);
            target.birdies = null;
        }

        // Freeze death pose (don't reset — keep the face-forward collapse)
        if (model.animController && model.animController.currentAction) {
            model.animController.currentAction.paused = true;
        }

        // Capture world orientation BEFORE reparenting so we can preserve it
        const savedWorldQuat = new THREE.Quaternion();
        group.getWorldQuaternion(savedWorldQuat);

        // Reparent to stretcher — use attach() to preserve world transform,
        // then override position to center on the bed while keeping rotation
        const anchor = drone.mesh.userData.stackAnchor;

        if (drone.stackCount === 0) {
            anchor.attach(group);
        } else {
            const layer = _createStretcherLayer();
            layer.root.position.y = -(drone.stackCount * LAYER_HEIGHT);
            anchor.add(layer.root);
            layer.corpseAnchor.attach(group);
        }

        // Center position on the stretcher but preserve world orientation
        group.position.set(0, 0, 0);
        // Reapply the saved world rotation in the new parent's local space
        const parentWorldQuat = new THREE.Quaternion();
        group.parent.getWorldQuaternion(parentWorldQuat);
        parentWorldQuat.invert();
        group.quaternion.multiplyQuaternions(parentWorldQuat, savedWorldQuat);

        group.visible = true;

        drone.stack.push(model);
        drone.stackCount++;

        // Remove from corpse queue
        const qIdx = this._corpseQueue.indexOf(target);
        if (qIdx >= 0) this._corpseQueue.splice(qIdx, 1);
    }

    _recycleDrone(drone, scene, enemyPool) {
        const mesh = drone.mesh;
        const anchor = mesh.userData.stackAnchor;

        for (const model of drone.stack) {
            if (model.group.parent) model.group.parent.remove(model.group);
            model.group.scale.set(1, 1, 1);
            model.group.rotation.set(0, 0, 0);
            model.group.position.set(0, 0, 0);
            if (enemyPool) enemyPool.release(model);
        }
        drone.stack = [];

        scene.remove(mesh);
        mesh.visible = false;
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        // Clear stack anchor (removes corpses + dynamic stretcher layers)
        while (anchor.children.length > 0) {
            const child = anchor.children[0];
            // Dispose dynamic layer geometry
            child.traverse(c => {
                if (c.isMesh && c.geometry) c.geometry.dispose();
            });
            anchor.remove(child);
        }
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

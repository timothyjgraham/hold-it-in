// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Selection UI                                        ║
// ║  Orchestrates Stage 3 (interaction/selection) and Stage 4 (game phase).   ║
// ║  Hover detection, selection ceremonies, rejected-drone exits, dimming.    ║
// ║  Card-drop animation flies chosen upgrade to bottom-left HUD.            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { toonMat } from '../shaders/toonMaterials.js';
import { drawUpgradeIcon } from '../data/upgradeIcons.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const HOVER_RISE = 0.3;           // Hovered drone rises this many units
const DIM_BRIGHTNESS = 0.7;       // Non-hovered drones dim to this
const HOVER_EXTRA_TILT = 0.1;     // Extra tilt toward camera when hovered

// Selection animation durations (seconds)
const COMMON_SELECT_DUR = 0.6;
const RARE_SELECT_DUR = 0.9;
const LEGENDARY_SELECT_DUR = 1.4;
const REJECTED_EXIT_DUR = 1.2;
const REJECTED_STAGGER = 0.2;

// Legendary slowmo
const LEGENDARY_SLOWMO_DUR = 0.3;

// Presenting phase (chosen drone close-up)
const PRESENT_FLY_DUR = 0.8;      // Fly to close-up position
const PRESENT_WAIT_DUR = 1.5;     // Hold close-up before card drop

// Card drop animation
const CARD_DROP_DUR = 0.9;        // Card flight to HUD duration

// Card drop display dimensions
const CARD_DROP_W = 360;
const CARD_DROP_H = 225;

// ─── SCREEN FLASH OVERLAY ───────────────────────────────────────────────────

let _flashEl = null;

function _ensureFlashElement() {
    if (_flashEl) return _flashEl;
    _flashEl = document.createElement('div');
    _flashEl.id = 'upgrade-screen-flash';
    _flashEl.style.cssText = `
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 90;
        background: var(--pal-gold, #ffd93d);
        opacity: 0;
        transition: opacity 0.08s;
    `;
    document.body.appendChild(_flashEl);
    return _flashEl;
}

function _screenFlash(duration) {
    const el = _ensureFlashElement();
    el.style.transition = 'none';
    el.style.opacity = '0.6';
    void el.offsetWidth;
    el.style.transition = `opacity ${duration}s`;
    el.style.opacity = '0';
}

// ─── DIM OVERLAY ────────────────────────────────────────────────────────────

let _dimEl = null;

function _ensureDimElement() {
    if (_dimEl) return _dimEl;
    _dimEl = document.createElement('div');
    _dimEl.id = 'upgrade-dim-overlay';
    _dimEl.style.cssText = `
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 5;
        background: rgba(26, 26, 46, 0.4);
        opacity: 0;
        transition: opacity 0.5s;
    `;
    document.body.appendChild(_dimEl);
    return _dimEl;
}

// ─── PARTICLE BURST SYSTEM ──────────────────────────────────────────────────

function _spawnParticleBurst(scene, position, color, count, speed, lifetime) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4);
        const mat = toonMat(color, {
            emissive: color,
            emissiveIntensity: 0.5,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        scene.add(mesh);

        const angle = Math.random() * Math.PI * 2;
        const upAngle = Math.random() * Math.PI * 0.6 - Math.PI * 0.1;
        const spd = speed * (0.6 + Math.random() * 0.8);
        particles.push({
            mesh,
            vx: Math.cos(angle) * Math.cos(upAngle) * spd,
            vy: Math.sin(upAngle) * spd + 2,
            vz: Math.sin(angle) * Math.cos(upAngle) * spd,
            life: lifetime * (0.5 + Math.random() * 0.5),
            maxLife: lifetime,
        });
    }
    return particles;
}

function _spawnGoldShower(scene, cameraPos, count) {
    const particles = [];
    const spread = 20;
    for (let i = 0; i < count; i++) {
        const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.08, 4, 4);
        const mat = toonMat(PALETTE.gold, {
            emissive: PALETTE.gold,
            emissiveIntensity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            cameraPos.x + (Math.random() - 0.5) * spread,
            cameraPos.y + 5 + Math.random() * 3,
            cameraPos.z + 10 + Math.random() * 5
        );
        scene.add(mesh);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 2,
            vy: -(3 + Math.random() * 4),
            vz: (Math.random() - 0.5) * 2,
            life: 1.5 + Math.random() * 0.5,
            maxLife: 2.0,
        });
    }
    return particles;
}

// ─── UPGRADE SELECTION UI CLASS ─────────────────────────────────────────────

export class UpgradeSelectionUI {
    constructor() {
        this.active = false;          // True during upgrade selection phase
        this.drones = [];             // Array of drone THREE.Groups
        this.options = [];            // Array of upgrade data objects
        this.hoveredIndex = -1;       // Which drone is hovered (-1 = none)
        this.selectedIndex = -1;      // Which drone was clicked
        this.phase = 'idle';          // idle | choosing | selecting | presenting | cardDrop | done

        // Selection animation state
        this._selectTimer = 0;
        this._selectDuration = 0;

        // Particles
        this._particles = [];

        // Ambient dimming
        this._savedAmbientIntensity = 0.7;
        this._ambientLight = null;

        // Camera zoom-punch
        this._zoomPunch = 0;
        this._zoomPunchVel = 0;

        // Slowmo
        this._slowmoTimer = 0;

        // Presenting phase
        this._presentWaiting = false;
        this._presentWaitTimer = 0;

        // Card drop
        this._cardDropEl = null;
        this._cardDropProgress = 0;
        this._cardDropStart = null;
        this._cardDropTarget = null;

        // Raycasting
        this._raycaster = new THREE.Raycaster();
        this._mouseNDC = new THREE.Vector2();

        // Bound handlers (for cleanup)
        this._onMouseMove = this._handleMouseMove.bind(this);
        this._onClick = this._handleClick.bind(this);
    }

    // ─── ACTIVATE (enter upgrade selection phase) ─────────────────────────

    /**
     * Start the upgrade selection phase.
     * @param {THREE.Group[]} drones - Drone meshes (already in scene, hovering)
     * @param {Object[]} options - Upgrade data objects matching drones
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     */
    activate(drones, options, scene, camera) {
        this.active = true;
        this.drones = drones;
        this.options = options;
        this.hoveredIndex = -1;
        this.selectedIndex = -1;
        this.phase = 'choosing';
        this._particles = [];
        this._zoomPunch = 0;
        this._zoomPunchVel = 0;
        this._slowmoTimer = 0;
        this._scene = scene;
        this._camera = camera;

        // Store each drone's base brightness for dimming
        for (const drone of drones) {
            drone.userData._baseBrightness = 1.0;
            drone.userData._currentBrightness = 1.0;
            drone.userData._hoverRise = 0;
        }

        // Dim background
        this._dimBackground(scene, true);

        // Add interaction listeners
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('click', this._onClick);
    }

    // ─── DEACTIVATE ───────────────────────────────────────────────────────

    deactivate() {
        this.active = false;
        this.phase = 'done';
        this.hoveredIndex = -1;
        this.selectedIndex = -1;

        // Remove listeners
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('click', this._onClick);

        // Restore background
        if (this._scene) {
            this._dimBackground(this._scene, false);
        }

        // Clean up particles
        this._cleanupParticles();

        // Clean up card drop element
        if (this._cardDropEl && this._cardDropEl.parentNode) {
            this._cardDropEl.parentNode.removeChild(this._cardDropEl);
            this._cardDropEl = null;
        }
    }

    // ─── MOUSE HANDLERS ──────────────────────────────────────────────────

    _handleMouseMove(e) {
        this._mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
        this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this._mouseScreenX = e.clientX;
        this._mouseScreenY = e.clientY;
    }

    _handleClick(e) {
        if (this.phase !== 'choosing' || this.hoveredIndex < 0) return;
        e.stopPropagation();
        this._selectDrone(this.hoveredIndex);
    }

    // ─── HOVER DETECTION (raycasting) ─────────────────────────────────────

    _updateHover() {
        if (this.phase !== 'choosing' || !this._camera || this.drones.length === 0) {
            if (this.hoveredIndex !== -1) {
                this.hoveredIndex = -1;
            }
            return;
        }

        this._raycaster.setFromCamera(this._mouseNDC, this._camera);

        // Collect all meshes from all drones for intersection
        let bestIndex = -1;
        let bestDist = Infinity;

        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            if (drone.userData.state !== 'hovering' && drone.userData.state !== 'settling') continue;

            const meshes = [];
            drone.traverse(child => {
                if (child.isMesh) meshes.push(child);
            });

            const hits = this._raycaster.intersectObjects(meshes, false);
            if (hits.length > 0 && hits[0].distance < bestDist) {
                bestDist = hits[0].distance;
                bestIndex = i;
            }
        }

        // Update hovered index
        if (bestIndex !== this.hoveredIndex) {
            this.hoveredIndex = bestIndex;
            document.body.style.cursor = bestIndex >= 0 ? 'pointer' : '';
        }
    }

    // ─── HOVER FEEDBACK ──────────────────────────────────────────────────

    _applyHoverFeedback(dt) {
        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            const ud = drone.userData;
            if (ud.state !== 'hovering' && ud.state !== 'settling') continue;

            const isHovered = (i === this.hoveredIndex);

            // Smooth rise/fall
            const targetRise = isHovered ? HOVER_RISE : 0;
            ud._hoverRise = ud._hoverRise || 0;
            ud._hoverRise += (targetRise - ud._hoverRise) * Math.min(1, dt * 8);
            drone.position.y = ud.targetPos.y + (ud._hoverBob || 0) + ud._hoverRise;

            // Billboard sign to face camera, with extra tilt on hover
            if (ud.signGroup) {
                const baseTilt = this._computeCameraTilt(drone.position);
                const targetTilt = isHovered ? baseTilt + HOVER_EXTRA_TILT : baseTilt;
                ud.signGroup.rotation.x += (targetTilt - ud.signGroup.rotation.x) * Math.min(1, dt * 6);
            }

            // Brightness dimming
            const targetBright = isHovered ? 1.0 : (this.hoveredIndex >= 0 ? DIM_BRIGHTNESS : 1.0);
            ud._currentBrightness = ud._currentBrightness || 1.0;
            ud._currentBrightness += (targetBright - ud._currentBrightness) * Math.min(1, dt * 6);

            // Apply brightness to all toon materials on this drone
            if (Math.abs(ud._currentBrightness - (ud._lastAppliedBrightness || 1.0)) > 0.01) {
                this._applyBrightness(drone, ud._currentBrightness);
                ud._lastAppliedBrightness = ud._currentBrightness;
            }

            // Legendary hover ring pulse
            if (ud.rarity === 'legendary' && ud.orbitalRing && ud.ringMat) {
                if (isHovered) {
                    const pulseT = (ud.hoverTime || 0) * 6;
                    ud.ringMat.emissiveIntensity = 0.75 + Math.sin(pulseT) * 0.25;
                    const rs = 1.04 + Math.sin(pulseT) * 0.04;
                    ud.orbitalRing.scale.set(rs, rs, rs);
                } else {
                    ud.ringMat.emissiveIntensity = 0.5;
                    ud.orbitalRing.scale.set(1, 1, 1);
                }
            }
        }
    }

    _applyBrightness(drone, brightness) {
        drone.traverse(child => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const mat of mats) {
                    if (mat.isMeshToonMaterial && mat.color) {
                        // Store original color on first encounter
                        if (!mat._origColor) {
                            mat._origColor = mat.color.clone();
                        }
                        mat.color.copy(mat._origColor).multiplyScalar(brightness);
                    }
                }
            }
        });
    }

    // ─── CAMERA-FACING TILT ──────────────────────────────────────────────

    /**
     * Compute the X-axis tilt angle so a sign faces the camera from a given position.
     */
    _computeCameraTilt(dronePos) {
        if (!this._camera) return 0;
        const dx = this._camera.position.x - dronePos.x;
        const dy = this._camera.position.y - dronePos.y;
        const dz = this._camera.position.z - dronePos.z;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        return Math.atan2(dy, horizDist);
    }

    // ─── SELECTION ───────────────────────────────────────────────────────

    _selectDrone(index) {
        this.selectedIndex = index;
        this.phase = 'selecting';
        document.body.style.cursor = '';

        // Remove click/move listeners during animation
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('click', this._onClick);

        const drone = this.drones[index];
        const rarity = drone.userData.rarity;

        // Set selection duration
        if (rarity === 'legendary') {
            this._selectDuration = LEGENDARY_SELECT_DUR;
        } else if (rarity === 'rare') {
            this._selectDuration = RARE_SELECT_DUR;
        } else {
            this._selectDuration = COMMON_SELECT_DUR;
        }
        this._selectTimer = 0;

        // Mark selected drone
        drone.userData.state = 'selected';
        drone.userData._selectAnimTime = 0;

        // Restore brightness on all drones
        for (const d of this.drones) {
            this._applyBrightness(d, 1.0);
            d.userData._currentBrightness = 1.0;
        }

        // ─── Rarity-specific VFX ─────────────────────────────────────────
        const droneWorldPos = new THREE.Vector3();
        drone.getWorldPosition(droneWorldPos);

        if (rarity === 'common') {
            if (window.SFX) SFX.play('upgrade_common');
            // White sparkle burst
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, PALETTE.white, 12, 3, 0.5
            ));
        } else if (rarity === 'rare') {
            if (window.SFX) SFX.play('upgrade_rare');
            // Colored particle burst
            const upgrade = this.options[index];
            const burstColor = upgrade.towerRequirement && upgrade.towerRequirement[0]
                ? this._getTowerColor(upgrade.towerRequirement[0])
                : PALETTE.rarityRare;
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, burstColor, 20, 4, 0.7
            ));
        } else if (rarity === 'legendary') {
            if (window.SFX) SFX.play('upgrade_legendary');
            // Gold screen flash
            _screenFlash(0.15);

            // Gold particle shower from above
            this._particles.push(..._spawnGoldShower(
                this._scene, this._camera.position, 40
            ));

            // Slowmo
            this._slowmoTimer = LEGENDARY_SLOWMO_DUR;

            // Zoom-punch
            if (window.SFX) SFX.play('zoom_punch');
            this._zoomPunch = 0;
            this._zoomPunchVel = 15;

            // Make rejected drones droop/wobble
            for (let i = 0; i < this.drones.length; i++) {
                if (i === index) continue;
                const rd = this.drones[i].userData;
                rd._droopTimer = 0;
                rd._drooping = true;
            }
        }
    }

    _getTowerColor(towerType) {
        const map = {
            coinmagnet: PALETTE.magnet,
            wetfloor: PALETTE.sign,
            mop: PALETTE.mop,
            ubik: PALETTE.ubik,
            potplant: PALETTE.potplant,
        };
        return map[towerType] || PALETTE.rarityRare;
    }

    // ─── SELECTION ANIMATION UPDATE ─────────────────────────────────────

    _updateSelectionAnim(dt) {
        if (this.phase !== 'selecting') return;

        this._selectTimer += dt;
        const t = Math.min(1, this._selectTimer / this._selectDuration);

        const selDrone = this.drones[this.selectedIndex];
        const rarity = selDrone.userData.rarity;
        selDrone.userData._selectAnimTime += dt;

        // ─── Common: nod (quick dip + rise) ──────────────────────────────
        if (rarity === 'common') {
            const nodPhase = t * Math.PI * 2;
            const nodY = -Math.sin(nodPhase) * 0.3 * (1 - t);
            selDrone.position.y = selDrone.userData.targetPos.y + nodY;

            // Sign flash white then fade
            if (t < 0.3) {
                this._applyBrightness(selDrone, 1.0 + (1 - t / 0.3) * 0.5);
            }
        }

        // ─── Rare: victory spin (360 yaw) + sign flip ────────────────────
        if (rarity === 'rare') {
            // 360 degree yaw spin
            const spinT = Math.min(1, t / 0.7); // Complete spin in first 70% of duration
            const easedSpin = spinT < 0.5 ? 2 * spinT * spinT : 1 - Math.pow(-2 * spinT + 2, 2) / 2;
            selDrone.rotation.y = easedSpin * Math.PI * 2;

            // Sign flip
            if (selDrone.userData.signGroup) {
                selDrone.userData.signGroup.rotation.x = easedSpin * Math.PI * 2;
            }
        }

        // ─── Legendary: barrel roll ──────────────────────────────────────
        if (rarity === 'legendary') {
            const rollT = Math.min(1, t / 0.6);
            const easedRoll = rollT < 0.5 ? 2 * rollT * rollT : 1 - Math.pow(-2 * rollT + 2, 2) / 2;
            selDrone.rotation.z = easedRoll * Math.PI * 2;

            // Droop/wobble on rejected drones
            for (let i = 0; i < this.drones.length; i++) {
                if (i === this.selectedIndex) continue;
                const rd = this.drones[i];
                const rud = rd.userData;
                if (rud._drooping) {
                    rud._droopTimer += dt;
                    // Droop down
                    rd.position.y = rud.targetPos.y - Math.sin(rud._droopTimer * 3) * 0.2 - rud._droopTimer * 0.3;
                    // Wobble
                    rd.rotation.z = Math.sin(rud._droopTimer * 8) * 0.1;
                }
            }
        }

        // ─── Camera zoom-punch (rare + legendary) ────────────────────────
        if (rarity !== 'common') {
            // Spring-damped zoom
            const stiffness = 200;
            const dampFactor = 12;
            this._zoomPunchVel += (-this._zoomPunch * stiffness - this._zoomPunchVel * dampFactor) * dt;
            this._zoomPunch += this._zoomPunchVel * dt;
        }

        // ─── Transition to presenting phase ──────────────────────────────
        if (t >= 1) {
            this.phase = 'presenting';
            this._beginPresenting();
        }
    }

    // ─── PRESENTING PHASE (chosen drone close-up + rejected exits) ───────

    _beginPresenting() {
        this._presentWaiting = false;
        this._presentWaitTimer = 0;

        // --- Rejected drones exit to windows ---
        let staggerIdx = 0;
        for (let i = 0; i < this.drones.length; i++) {
            if (i === this.selectedIndex) continue;

            const drone = this.drones[i];
            drone.userData.state = 'exiting';

            // Pick a random window to fly toward
            const game = window.Game;
            const windows = (game && game.windowPositions) || [];
            let target;
            if (windows.length > 0) {
                const win = windows[Math.floor(Math.random() * windows.length)];
                target = new THREE.Vector3(win.x + (win.x < 0 ? -4 : 4), win.y, win.z);
            } else {
                target = new THREE.Vector3((Math.random() - 0.5) * 30, 5, 70);
            }

            // Build sad exit flight path (lower arc)
            const startPos = drone.position.clone();
            const midPoint = new THREE.Vector3(
                (startPos.x + target.x) / 2,
                Math.min(startPos.y, target.y) - 2, // Lower arc = sad
                (startPos.z + target.z) / 2
            );

            drone.userData._exitCurve = new THREE.CatmullRomCurve3([
                startPos, midPoint, target,
            ], false, 'catmullrom', 0.3);
            drone.userData._exitProgress = 0;
            drone.userData._exitDelay = staggerIdx * REJECTED_STAGGER;
            staggerIdx++;
        }

        // --- Selected drone: fly to close-up position ---
        const selDrone = this.drones[this.selectedIndex];
        selDrone.userData.state = 'presenting';
        const startPos = selDrone.position.clone();

        // Calculate close-up: 9 units in front of camera along view direction
        const viewDir = new THREE.Vector3();
        this._camera.getWorldDirection(viewDir);
        const presentPos = this._camera.position.clone().add(viewDir.multiplyScalar(9));

        selDrone.userData._presentStartPos = startPos;
        selDrone.userData._presentTargetPos = presentPos;
        selDrone.userData._presentProgress = 0;

        // Reset rotations from selection ceremony
        selDrone.rotation.set(0, 0, 0);
    }

    _updatePresenting(dt) {
        if (this.phase !== 'presenting') return;

        // --- Update rejected drone exits ---
        for (let i = 0; i < this.drones.length; i++) {
            if (i === this.selectedIndex) continue;
            const drone = this.drones[i];
            const ud = drone.userData;
            if (ud.state !== 'exiting') continue;

            // Stagger delay
            if (ud._exitDelay > 0) {
                ud._exitDelay -= dt;
                continue;
            }

            ud._exitProgress += dt / REJECTED_EXIT_DUR;
            const t = Math.min(1, ud._exitProgress);
            const et = t * t; // Accelerating exit

            if (ud._exitCurve) {
                const pos = new THREE.Vector3();
                ud._exitCurve.getPoint(et, pos);
                drone.position.copy(pos);

                // Tilt in flight direction
                const lookAhead = Math.min(1, et + 0.05);
                const ahead = new THREE.Vector3();
                ud._exitCurve.getPoint(lookAhead, ahead);
                const dir = ahead.clone().sub(pos);
                if (dir.length() > 0.001) {
                    drone.rotation.y = Math.atan2(dir.x, dir.z);
                    drone.rotation.x = -Math.min(0.3, dir.length() * 0.1);
                }
            }

            // Fade out in last 30%
            if (t > 0.7) {
                const fade = 1 - (t - 0.7) / 0.3;
                drone.traverse(child => {
                    if (child.isMesh && child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        for (const mat of mats) {
                            mat.transparent = true;
                            mat.opacity = fade;
                        }
                    }
                });
            }

            if (t >= 1) ud.state = 'done';
        }

        // --- Animate selected drone to close-up ---
        const selDrone = this.drones[this.selectedIndex];
        const selUd = selDrone.userData;

        if (selUd.state === 'presenting') {
            selUd._presentProgress += dt / PRESENT_FLY_DUR;
            const t = Math.min(1, selUd._presentProgress);
            // Ease-in-out
            const et = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            selDrone.position.lerpVectors(selUd._presentStartPos, selUd._presentTargetPos, et);

            // Smooth body rotation to zero
            selDrone.rotation.y *= 0.92;
            selDrone.rotation.x *= 0.92;
            selDrone.rotation.z *= 0.92;

            // Billboard sign toward camera during close-up
            if (selUd.signGroup) {
                const tilt = this._computeCameraTilt(selDrone.position);
                selUd.signGroup.rotation.x += (tilt - selUd.signGroup.rotation.x) * Math.min(1, dt * 6);
            }

            if (t >= 1 && !this._presentWaiting) {
                this._presentWaiting = true;
                this._presentWaitTimer = 0;
            }
        }

        // --- Wait before card drop ---
        if (this._presentWaiting) {
            this._presentWaitTimer += dt;
            if (this._presentWaitTimer >= PRESENT_WAIT_DUR) {
                this._beginCardDrop();
            }
        }
    }

    // ─── CARD DROP ANIMATION ─────────────────────────────────────────────

    _beginCardDrop() {
        this.phase = 'cardDrop';
        if (window.SFX) SFX.play('card_fly');

        const selDrone = this.drones[this.selectedIndex];
        const upgrade = this.options[this.selectedIndex];

        // Project sign center to screen coordinates
        const signWorldPos = new THREE.Vector3();
        selDrone.userData.signGroup.getWorldPosition(signWorldPos);
        signWorldPos.project(this._camera);
        const screenX = (signWorldPos.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-signWorldPos.y * 0.5 + 0.5) * window.innerHeight;

        // Create floating DOM card at sign's screen position
        this._cardDropEl = this._createCardDropElement(upgrade, screenX, screenY);

        // Hide 3D sign
        selDrone.userData.signGroup.visible = false;

        // Target: bottom-left HUD area
        const hud = document.getElementById('upgrade-hud');
        let targetX, targetY;
        if (hud) {
            const rect = hud.getBoundingClientRect();
            // Target the next card slot
            const cardCount = hud.children.length;
            const col = Math.floor(cardCount / 6);
            const row = cardCount % 6;
            targetX = rect.left + col * 80 + 36;
            targetY = rect.bottom - row * 80 - 36;
        } else {
            // HUD not yet created — target bottom-left corner
            targetX = 16 + 36;
            targetY = window.innerHeight - 16 - 36;
        }

        this._cardDropStart = { x: screenX, y: screenY };
        this._cardDropTarget = { x: targetX, y: targetY };
        this._cardDropProgress = 0;

        selDrone.userData.state = 'cardDrop';
    }

    _createCardDropElement(upgrade, screenX, screenY) {
        const rarity = upgrade.rarity;

        // ── Render card content onto a canvas (mirrors the 3D placard sign) ──
        const cW = 800, cH = 500;
        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d');

        // Rounded-rect background
        const bgColors = { legendary: '#ffd93d', rare: '#fff4d9', common: '#ffffff' };
        ctx.fillStyle = bgColors[rarity] || bgColors.common;
        ctx.beginPath();
        ctx.roundRect(0, 0, cW, cH, 20);
        ctx.fill();

        // Legendary: diagonal shimmer lines
        if (rarity === 'legendary') {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0, 0, cW, cH, 20);
            ctx.clip();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            for (let i = -cH; i < cW + cH; i += 30) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + cH, cH);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Rare: inner glow border in violet
        if (rarity === 'rare') {
            ctx.strokeStyle = '#9b8ec4';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.roundRect(6, 6, cW - 12, cH - 12, 16);
            ctx.stroke();
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

        // Border
        if (rarity === 'legendary') {
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.roundRect(4, 4, cW - 8, cH - 8, 18);
            ctx.stroke();
        } else if (rarity === 'common') {
            ctx.strokeStyle = 'rgba(26, 26, 46, 0.3)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(4, 4, cW - 8, cH - 8, 18);
            ctx.stroke();
        }

        // ── Rarity banner (0-55px) ──
        const bannerH = 55;
        const bannerFill = rarity === 'legendary' ? '#e6b800'
                         : rarity === 'rare' ? '#9b8ec4'
                         : '#fff4d9';
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, cW, cH, 20);
        ctx.clip();
        ctx.fillStyle = bannerFill;
        ctx.fillRect(0, 0, cW, bannerH);
        ctx.restore();

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

        // ── Icon + Name (55-250px) ──
        ctx.fillStyle = '#1a1a2e';
        drawUpgradeIcon(ctx, upgrade.icon || 'star', 120, 155, 110);

        const nameFontSize = upgrade.name.length > 14 ? 48 : upgrade.name.length > 10 ? 52 : 60;
        ctx.font = `bold ${nameFontSize}px 'Bangers', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameMaxW = 400;
        const nameWords = upgrade.name.split(' ');
        const nameLines = [];
        let curLine = nameWords[0];
        for (let w = 1; w < nameWords.length; w++) {
            const test = curLine + ' ' + nameWords[w];
            if (ctx.measureText(test).width > nameMaxW) {
                nameLines.push(curLine);
                curLine = nameWords[w];
            } else {
                curLine = test;
            }
        }
        nameLines.push(curLine);

        const nLineH = nameFontSize + 4;
        const nStartY = 155 - (nameLines.length - 1) * nLineH / 2;
        for (let i = 0; i < nameLines.length; i++) {
            if (rarity !== 'common') {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.fillText(nameLines[i], 460 + 2, nStartY + i * nLineH + 2);
            }
            ctx.fillStyle = '#1a1a2e';
            ctx.fillText(nameLines[i], 460, nStartY + i * nLineH);
        }

        // ── Divider (250-255px) ──
        ctx.strokeStyle = 'rgba(26, 26, 46, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 252);
        ctx.lineTo(cW - 40, 252);
        ctx.stroke();

        // ── Description (255-470px) ──
        if (upgrade.description) {
            ctx.fillStyle = '#3a3a4a';
            ctx.font = "40px 'Bangers', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const dWords = upgrade.description.split(' ');
            const dLines = [];
            let dLine = dWords[0] || '';
            for (let w = 1; w < dWords.length; w++) {
                const word = dWords[w];
                // Force line break before words starting with '('
                if (word.startsWith('(')) {
                    dLines.push(dLine);
                    dLine = word;
                    continue;
                }
                const test = dLine + ' ' + word;
                if (ctx.measureText(test).width > 660) {
                    dLines.push(dLine);
                    dLine = word;
                } else {
                    dLine = test;
                }
            }
            dLines.push(dLine);
            const dLineH = 50;
            const dCenter = (260 + 470) / 2;
            const dStartY = dCenter - (dLines.length - 1) * dLineH / 2;
            for (let i = 0; i < dLines.length; i++) {
                ctx.fillText(dLines[i], cW / 2, dStartY + i * dLineH);
            }
        }

        // ── Build DOM element ──
        const shadowGlow = rarity === 'legendary'
            ? '3px 4px 0px rgba(26,26,46,0.5), 0 0 30px rgba(255,217,61,0.6)'
            : rarity === 'rare'
                ? '3px 4px 0px rgba(26,26,46,0.5), 0 0 18px rgba(155,142,196,0.4)'
                : '3px 4px 0px rgba(26,26,46,0.5)';

        const el = document.createElement('div');
        el.id = 'upgrade-card-drop';
        el.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 110;
            width: ${CARD_DROP_W}px;
            height: ${CARD_DROP_H}px;
            border-radius: 12px;
            overflow: hidden;
            opacity: 0;
            box-shadow: ${shadowGlow};
            left: ${screenX - CARD_DROP_W / 2}px;
            top: ${screenY - CARD_DROP_H / 2}px;
        `;

        canvas.style.cssText = 'width:100%;height:100%;display:block;';
        el.appendChild(canvas);

        document.body.appendChild(el);
        return el;
    }

    _updateCardDrop(dt) {
        if (this.phase !== 'cardDrop') return;

        this._cardDropProgress += dt / CARD_DROP_DUR;
        const t = Math.min(1, this._cardDropProgress);

        const start = this._cardDropStart;
        const target = this._cardDropTarget;

        // Cubic bezier curve: drop down first, then arc to bottom-left HUD
        const cp1x = start.x;
        const cp1y = start.y + 80;    // Drop down
        const cp2x = target.x + 120;  // Approach from the right
        const cp2y = target.y - 60;   // Approach from above

        const u = 1 - t;
        const x = u*u*u*start.x + 3*u*u*t*cp1x + 3*u*t*t*cp2x + t*t*t*target.x;
        const y = u*u*u*start.y + 3*u*u*t*cp1y + 3*u*t*t*cp2y + t*t*t*target.y;

        if (this._cardDropEl) {
            this._cardDropEl.style.left = (x - CARD_DROP_W / 2) + 'px';
            this._cardDropEl.style.top = (y - CARD_DROP_H / 2) + 'px';

            // Scale: shrink from full size with juicy pop in the middle
            const shrink = 1.0 - t * 0.65;
            const pop = Math.sin(t * Math.PI) * 0.15;
            const scale = shrink + pop;
            // Wobble rotation that damps out
            const rot = Math.sin(t * Math.PI * 4) * 15 * (1 - t);
            this._cardDropEl.style.transform = `scale(${scale}) rotate(${rot}deg)`;

            // Fade in quickly, stay visible, fade out at end
            if (t < 0.08) {
                this._cardDropEl.style.opacity = String(t / 0.08);
            } else if (t > 0.88) {
                this._cardDropEl.style.opacity = String((1 - t) / 0.12);
            } else {
                this._cardDropEl.style.opacity = '1';
            }
        }

        // Fade out the 3D drone body
        const selDrone = this.drones[this.selectedIndex];
        if (t > 0.2) {
            const fade = Math.max(0, 1 - (t - 0.2) / 0.5);
            selDrone.traverse(child => {
                if (child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const mat of mats) {
                        mat.transparent = true;
                        mat.opacity = fade;
                    }
                }
            });
        }

        if (t >= 1) {
            // Clean up card drop element
            if (this._cardDropEl && this._cardDropEl.parentNode) {
                this._cardDropEl.parentNode.removeChild(this._cardDropEl);
                this._cardDropEl = null;
            }
            this.phase = 'done';
        }
    }

    // ─── PARTICLE UPDATE ─────────────────────────────────────────────────

    _updateParticles(dt) {
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life -= dt;
            p.vy -= 6 * dt; // gravity
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            // Fade out
            const fade = Math.max(0, p.life / p.maxLife);
            p.mesh.material.transparent = true;
            p.mesh.material.opacity = fade;
            const s = 0.5 + fade * 0.5;
            p.mesh.scale.setScalar(s);

            if (p.life <= 0) {
                this._scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this._particles.splice(i, 1);
            }
        }
    }

    _cleanupParticles() {
        if (!this._scene) return;
        for (const p of this._particles) {
            this._scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
        }
        this._particles = [];
    }

    // ─── BACKGROUND DIMMING ──────────────────────────────────────────────

    _dimBackground(scene, dim) {
        // Disabled — cards must be bright and readable without any darkening
        // The drones and placards are the focus during upgrade selection.
    }

    // ─── MAIN UPDATE (called every frame from _animate) ──────────────────

    /**
     * @param {number} dt - Delta time
     * @returns {{ dtScale: number, done: boolean, selectedUpgrade: Object|null }}
     */
    update(dt) {
        const result = { dtScale: 1.0, done: false, selectedUpgrade: null };
        if (!this.active) return result;

        // Slowmo
        if (this._slowmoTimer > 0) {
            this._slowmoTimer -= dt;
            result.dtScale = 0.15; // Drastic time scale reduction
        }

        // Hover detection + feedback
        if (this.phase === 'choosing') {
            this._updateHover();
            this._applyHoverFeedback(dt);
        }

        // Selection animation
        if (this.phase === 'selecting') {
            this._updateSelectionAnim(dt);
        }

        // Presenting phase (close-up + rejected exits)
        if (this.phase === 'presenting') {
            this._updatePresenting(dt);
        }

        // Card drop animation
        if (this.phase === 'cardDrop') {
            this._updateCardDrop(dt);
        }

        // Particles
        this._updateParticles(dt);

        // Camera zoom-punch
        if (Math.abs(this._zoomPunch) > 0.001) {
            result.zoomPunch = this._zoomPunch;
        }

        // Done — signal completion
        if (this.phase === 'done' && this.selectedIndex >= 0) {
            result.done = true;
            result.selectedUpgrade = this.options[this.selectedIndex];
        }

        return result;
    }

    // ─── CLEANUP ─────────────────────────────────────────────────────────

    dispose() {
        this.deactivate();
        if (_flashEl && _flashEl.parentNode) _flashEl.parentNode.removeChild(_flashEl);
        if (_dimEl && _dimEl.parentNode) _dimEl.parentNode.removeChild(_dimEl);
        _flashEl = null;
        _dimEl = null;
    }
}

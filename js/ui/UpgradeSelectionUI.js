// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Selection UI                                        ║
// ║  Orchestrates Stage 3 (interaction/selection) and Stage 4 (game phase).   ║
// ║  Hover detection, selection ceremonies, rejected-drone exits, dimming.    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { toonMat } from '../shaders/toonMaterials.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const HOVER_RISE = 0.3;           // Hovered drone rises this many units
const DIM_BRIGHTNESS = 0.7;       // Non-hovered drones dim to this
const SIGN_TILT_ANGLE = 0.15;     // Sign tilts toward camera (radians)

// Selection animation durations (seconds)
const COMMON_SELECT_DUR = 0.6;
const RARE_SELECT_DUR = 0.9;
const LEGENDARY_SELECT_DUR = 1.4;
const REJECTED_EXIT_DUR = 1.2;
const REJECTED_STAGGER = 0.2;

// Legendary slowmo
const LEGENDARY_SLOWMO_DUR = 0.3;

// ─── DESCRIPTION TOOLTIP ────────────────────────────────────────────────────

let _descEl = null;

function _ensureDescElement() {
    if (_descEl) return _descEl;
    _descEl = document.createElement('div');
    _descEl.id = 'upgrade-desc-tooltip';
    _descEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 100;
        max-width: 260px;
        padding: 10px 14px;
        background: var(--pal-cream, #fff4d9);
        border: 3px solid var(--pal-ink, #1a1a2e);
        border-radius: 8px;
        font-family: 'Bangers', sans-serif;
        font-size: 15px;
        color: var(--pal-ink, #1a1a2e);
        opacity: 0;
        transition: opacity 0.15s;
        text-align: center;
        line-height: 1.3;
    `;
    document.body.appendChild(_descEl);
    return _descEl;
}

function _showDesc(text, screenX, screenY) {
    const el = _ensureDescElement();
    el.textContent = text;
    el.style.opacity = '1';
    el.style.left = (screenX - 130) + 'px';
    el.style.top = (screenY + 20) + 'px';
}

function _hideDesc() {
    if (_descEl) _descEl.style.opacity = '0';
}

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
        this.phase = 'idle';          // idle | entering | choosing | selecting | exiting | done

        // Selection animation state
        this._selectTimer = 0;
        this._selectDuration = 0;
        this._exitTimers = [];        // Per rejected drone

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

        // Hide tooltip
        _hideDesc();

        // Restore background
        if (this._scene) {
            this._dimBackground(this._scene, false);
        }

        // Clean up particles
        this._cleanupParticles();
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
                _hideDesc();
            }
            return;
        }

        this._raycaster.setFromCamera(this._mouseNDC, this._camera);

        // Collect all meshes from all drones for intersection
        let bestIndex = -1;
        let bestDist = Infinity;

        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            if (drone.userData.state !== 'hovering') continue;

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
            if (bestIndex >= 0) {
                // Show description tooltip
                const upgrade = this.options[bestIndex];
                _showDesc(upgrade.description, this._mouseScreenX || 0, this._mouseScreenY || 0);
                document.body.style.cursor = 'pointer';
            } else {
                _hideDesc();
                document.body.style.cursor = '';
            }
        } else if (bestIndex >= 0) {
            // Update tooltip position while hovering
            const upgrade = this.options[bestIndex];
            // Project drone sign position to screen for stable tooltip
            const drone = this.drones[bestIndex];
            const signWorldPos = new THREE.Vector3();
            drone.userData.signGroup.getWorldPosition(signWorldPos);
            signWorldPos.y -= 1.0; // Below the sign
            signWorldPos.project(this._camera);
            const screenX = (signWorldPos.x * 0.5 + 0.5) * window.innerWidth;
            const screenY = (-signWorldPos.y * 0.5 + 0.5) * window.innerHeight;
            _showDesc(upgrade.description, screenX, screenY);
        }
    }

    // ─── HOVER FEEDBACK ──────────────────────────────────────────────────

    _applyHoverFeedback(dt) {
        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            const ud = drone.userData;
            if (ud.state !== 'hovering') continue;

            const isHovered = (i === this.hoveredIndex);

            // Smooth rise/fall
            const targetRise = isHovered ? HOVER_RISE : 0;
            ud._hoverRise = ud._hoverRise || 0;
            ud._hoverRise += (targetRise - ud._hoverRise) * Math.min(1, dt * 8);
            drone.position.y = ud.targetPos.y + (ud._hoverBob || 0) + ud._hoverRise;

            // Sign tilt toward camera on hover
            if (isHovered) {
                const targetTilt = -SIGN_TILT_ANGLE;
                ud.signGroup.rotation.x += (targetTilt - ud.signGroup.rotation.x) * Math.min(1, dt * 6);
            } else {
                ud.signGroup.rotation.x += (0 - ud.signGroup.rotation.x) * Math.min(1, dt * 6);
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

    // ─── SELECTION ───────────────────────────────────────────────────────

    _selectDrone(index) {
        this.selectedIndex = index;
        this.phase = 'selecting';
        _hideDesc();
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
            // White sparkle burst
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, PALETTE.white, 12, 3, 0.5
            ));
        } else if (rarity === 'rare') {
            // Colored particle burst
            const upgrade = this.options[index];
            const burstColor = upgrade.towerRequirement && upgrade.towerRequirement[0]
                ? this._getTowerColor(upgrade.towerRequirement[0])
                : PALETTE.rarityRare;
            this._particles.push(..._spawnParticleBurst(
                this._scene, droneWorldPos, burstColor, 20, 4, 0.7
            ));
        } else if (rarity === 'legendary') {
            // Gold screen flash
            _screenFlash(0.15);

            // Gold particle shower from above
            this._particles.push(..._spawnGoldShower(
                this._scene, this._camera.position, 40
            ));

            // Slowmo
            this._slowmoTimer = LEGENDARY_SLOWMO_DUR;

            // Zoom-punch
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

        // ─── Transition to exit phase ────────────────────────────────────
        if (t >= 1) {
            this.phase = 'exiting';
            this._beginRejectedExit();
        }
    }

    // ─── REJECTED DRONE EXIT ─────────────────────────────────────────────

    _beginRejectedExit() {
        this._exitTimers = [];

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
                startPos,
                midPoint,
                target,
            ], false, 'catmullrom', 0.3);
            drone.userData._exitProgress = 0;
            drone.userData._exitDelay = this._exitTimers.length * REJECTED_STAGGER;

            this._exitTimers.push(i);
        }

        // Also start exit for selected drone (it flies off happily — slight upward arc)
        const selDrone = this.drones[this.selectedIndex];
        selDrone.userData.state = 'exiting';
        const selStart = selDrone.position.clone();
        // Fly upward and toward camera briefly then out
        selDrone.userData._exitCurve = new THREE.CatmullRomCurve3([
            selStart,
            new THREE.Vector3(selStart.x, selStart.y + 3, selStart.z - 5),
            new THREE.Vector3(selStart.x * 0.5, selStart.y + 8, selStart.z - 15),
        ], false, 'catmullrom', 0.3);
        selDrone.userData._exitProgress = 0;
        selDrone.userData._exitDelay = 0;
    }

    _updateExitAnim(dt) {
        if (this.phase !== 'exiting') return;

        let allDone = true;

        for (let i = 0; i < this.drones.length; i++) {
            const drone = this.drones[i];
            const ud = drone.userData;
            if (ud.state !== 'exiting') continue;

            // Delay (stagger)
            if (ud._exitDelay > 0) {
                ud._exitDelay -= dt;
                allDone = false;
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

            if (t >= 1) {
                ud.state = 'done';
            } else {
                allDone = false;
            }
        }

        if (allDone) {
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
        // CSS overlay for screen dimming
        const el = _ensureDimElement();
        el.style.opacity = dim ? '1' : '0';

        // Also reduce ambient light intensity
        if (dim) {
            scene.traverse(child => {
                if (child.isAmbientLight) {
                    this._ambientLight = child;
                    this._savedAmbientIntensity = child.intensity;
                    child.intensity = child.intensity * 0.5;
                }
            });
        } else if (this._ambientLight) {
            this._ambientLight.intensity = this._savedAmbientIntensity;
            this._ambientLight = null;
        }
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

        // Exit animation
        if (this.phase === 'exiting') {
            this._updateExitAnim(dt);
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
        if (_descEl && _descEl.parentNode) _descEl.parentNode.removeChild(_descEl);
        if (_flashEl && _flashEl.parentNode) _flashEl.parentNode.removeChild(_flashEl);
        if (_dimEl && _dimEl.parentNode) _dimEl.parentNode.removeChild(_dimEl);
        _descEl = null;
        _flashEl = null;
        _dimEl = null;
    }
}

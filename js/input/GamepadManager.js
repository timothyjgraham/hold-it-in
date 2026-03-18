// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Gamepad Manager                                             ║
// ║  Full gamepad support for Xbox, PlayStation, Steam Deck, generic pads.    ║
// ║  Grid cursor for gameplay, spatial focus nav for menus, haptic feedback.  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from '../data/palette.js';
import { CONFIG } from '../data/config.js';
import { toonMat } from '../shaders/toonMaterials.js';
import { t } from '../i18n.js';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const DEADZONE_DEFAULT = 0.15;
const CURSOR_SPEED = 30;          // World units/sec at full stick tilt
const DPAD_REPEAT_DELAY = 300;    // ms before D-pad repeat starts
const DPAD_REPEAT_RATE = 120;     // ms between D-pad repeats
const MODE_SWITCH_GAP = 100;      // ms gap before switching input mode
const TOAST_DURATION = 2000;      // ms for connection toast

// Stick axis indices (standard mapping)
const AXIS_LX = 0;
const AXIS_LY = 1;

// Standard gamepad button indices
const BTN = {
    A: 0, B: 1, X: 2, Y: 3,
    LB: 4, RB: 5, LT: 6, RT: 7,
    BACK: 8, START: 9,
    L3: 10, R3: 11,
    UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
};

// ─── SVG BUTTON ICONS ───────────────────────────────────────────────────────

const XBOX_ICONS = {
    [BTN.A]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#107C10" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif" font-weight="bold">A</text></svg>`,
    [BTN.B]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#E2371D" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif" font-weight="bold">B</text></svg>`,
    [BTN.X]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#0E6DC5" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif" font-weight="bold">X</text></svg>`,
    [BTN.Y]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#F4B81F" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="12" font-family="sans-serif" font-weight="bold">Y</text></svg>`,
    [BTN.LB]:    `<svg viewBox="0 0 30 20" width="24" height="16"><rect x="1" y="1" width="28" height="18" rx="4" fill="#333" stroke="#fff" stroke-width="1.5"/><text x="15" y="14" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif" font-weight="bold">LB</text></svg>`,
    [BTN.RB]:    `<svg viewBox="0 0 30 20" width="24" height="16"><rect x="1" y="1" width="28" height="18" rx="4" fill="#333" stroke="#fff" stroke-width="1.5"/><text x="15" y="14" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif" font-weight="bold">RB</text></svg>`,
    [BTN.START]: `<svg viewBox="0 0 30 20" width="24" height="16"><rect x="1" y="1" width="28" height="18" rx="4" fill="#333" stroke="#fff" stroke-width="1.5"/><text x="15" y="14" text-anchor="middle" fill="#fff" font-size="9" font-family="sans-serif">MENU</text></svg>`,
    dpad:        `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 2h8v8h6v4H16v8H8V14H2v-4h6V2z" fill="#333" stroke="#fff" stroke-width="1"/></svg>`,
};

const PS_ICONS = {
    [BTN.A]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#1E5CC8" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="14" font-family="sans-serif">✕</text></svg>`,
    [BTN.B]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#E2371D" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="14" font-family="sans-serif">○</text></svg>`,
    [BTN.X]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#D94EBF" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="14" font-family="sans-serif">□</text></svg>`,
    [BTN.Y]:     `<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="#2DAB4E" stroke="#fff" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" fill="#fff" font-size="14" font-family="sans-serif">△</text></svg>`,
    [BTN.LB]:    `<svg viewBox="0 0 30 20" width="24" height="16"><rect x="1" y="1" width="28" height="18" rx="4" fill="#333" stroke="#fff" stroke-width="1.5"/><text x="15" y="14" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif" font-weight="bold">L1</text></svg>`,
    [BTN.RB]:    `<svg viewBox="0 0 30 20" width="24" height="16"><rect x="1" y="1" width="28" height="18" rx="4" fill="#333" stroke="#fff" stroke-width="1.5"/><text x="15" y="14" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif" font-weight="bold">R1</text></svg>`,
    [BTN.START]: `<svg viewBox="0 0 30 20" width="24" height="16"><rect x="1" y="1" width="28" height="18" rx="4" fill="#333" stroke="#fff" stroke-width="1.5"/><text x="15" y="14" text-anchor="middle" fill="#fff" font-size="7" font-family="sans-serif">OPTIONS</text></svg>`,
    dpad:        `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 2h8v8h6v4H16v8H8V14H2v-4h6V2z" fill="#333" stroke="#fff" stroke-width="1"/></svg>`,
};

// ─── GAMEPAD MANAGER CLASS ──────────────────────────────────────────────────

export class GamepadManager {
    constructor() {
        this._game = null;
        this._gamepadIndex = -1;
        this._controllerType = 'generic'; // xbox | playstation | generic
        this._inputMode = 'mouse';        // mouse | gamepad

        // Button edge detection
        this._prevButtons = new Array(17).fill(false);
        this._currButtons = new Array(17).fill(false);

        // Stick state
        this._stickX = 0;
        this._stickY = 0;

        // Grid cursor (world-space)
        this._cursorWorldPos = { x: 0, z: 30 };
        this._cursorMesh = null;
        this._prevStickX = 0;

        // D-pad repeat
        this._dpadTimers = { 12: 0, 13: 0, 14: 0, 15: 0 };
        this._dpadHeld = { 12: false, 13: false, 14: false, 15: false };

        // Menu focus
        this._focusedEl = null;
        this._menuNavTimer = 0;
        this._menuNavDelay = 200;  // ms between menu nav steps

        // Mode switching
        this._lastMouseMove = Date.now();
        this._lastGamepadInput = 0;

        // Settings
        this._settings = {
            sensitivity: 5,
            deadzone: 15,
            vibration: true,
        };

        // Prompt bar
        this._promptBar = null;
        this._toastEl = null;

        // Upgrade selection gamepad hover
        this._gamepadHoverActive = false;
    }

    // ─── INIT ────────────────────────────────────────────────────────────

    init(game) {
        this._game = game;
        this._loadSettings();
        this._createPromptBar();
        this._createCursorMesh();

        window.addEventListener('gamepadconnected', (e) => {
            this._gamepadIndex = e.gamepad.index;
            this._controllerType = this._detectType(e.gamepad.id);
            this._showToast(t('gamepad.connected.' + this._controllerType));
            this._switchMode('gamepad');
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (e.gamepad.index === this._gamepadIndex) {
                this._gamepadIndex = -1;
                this._switchMode('mouse');
                this._showToast(t('gamepad.disconnected'));
            }
        });

        // Check for already-connected gamepads
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (gp) {
                this._gamepadIndex = gp.index;
                this._controllerType = this._detectType(gp.id);
                this._switchMode('gamepad');
                break;
            }
        }
    }

    // ─── CONTROLLER DETECTION ────────────────────────────────────────────

    _detectType(id) {
        const lower = id.toLowerCase();
        if (lower.includes('xbox') || lower.includes('xinput') || lower.includes('045e')) return 'xbox';
        if (lower.includes('playstation') || lower.includes('dualsense') || lower.includes('dualshock') ||
            lower.includes('054c') || lower.includes('sony')) return 'playstation';
        return 'xbox'; // Default to Xbox layout (Steam Deck, generic pads)
    }

    _controllerLabel() {
        if (this._controllerType === 'playstation') return 'PlayStation Controller';
        if (this._controllerType === 'xbox') return 'Xbox Controller';
        return 'Controller';
    }

    _getIcons() {
        return this._controllerType === 'playstation' ? PS_ICONS : XBOX_ICONS;
    }

    // ─── MODE SWITCHING ──────────────────────────────────────────────────

    _onMouseActivity() {
        this._lastMouseMove = Date.now();
        if (this._inputMode === 'gamepad' && Date.now() - this._lastGamepadInput > MODE_SWITCH_GAP) {
            this._switchMode('mouse');
        }
    }

    _switchMode(mode) {
        if (this._inputMode === mode) return;
        this._inputMode = mode;

        if (mode === 'gamepad') {
            document.body.classList.add('gamepad-active');
            if (this._promptBar) this._promptBar.style.display = '';
            if (this._cursorMesh) this._cursorMesh.visible = false; // Will show when gameplay starts
        } else {
            document.body.classList.remove('gamepad-active');
            if (this._promptBar) this._promptBar.style.display = 'none';
            if (this._cursorMesh) this._cursorMesh.visible = false;
            this._clearFocus();
            this._gamepadHoverActive = false;
            // Restore upgrade hover to raycasting
            if (this._game.upgradeSelectionUI) {
                this._game.upgradeSelectionUI._gamepadHoverActive = false;
            }
        }
    }

    // ─── POLLING ─────────────────────────────────────────────────────────

    update(dt) {
        if (this._gamepadIndex < 0 || this._inputMode !== 'gamepad') {
            if (this._cursorMesh) this._cursorMesh.visible = false;
            return;
        }

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[this._gamepadIndex];
        if (!gp) return;

        // Read button states with edge detection
        for (let i = 0; i < Math.min(gp.buttons.length, 17); i++) {
            this._prevButtons[i] = this._currButtons[i];
            this._currButtons[i] = gp.buttons[i].pressed;
        }

        // Read stick with deadzone
        const dz = this._settings.deadzone / 100;
        const rawX = gp.axes[AXIS_LX] || 0;
        const rawY = gp.axes[AXIS_LY] || 0;
        this._stickX = Math.abs(rawX) > dz ? rawX : 0;
        this._stickY = Math.abs(rawY) > dz ? rawY : 0;

        // Track gamepad activity for mode switching
        const anyInput = this._stickX !== 0 || this._stickY !== 0 ||
            this._currButtons.some((b, i) => b && !this._prevButtons[i]);
        if (anyInput) {
            this._lastGamepadInput = Date.now();
            if (this._inputMode !== 'gamepad') {
                this._switchMode('gamepad');
                return;
            }
        }

        // Context routing
        const game = this._game;
        const state = game.state;

        // Confirm dialog check (takes priority)
        const confirmDialog = document.getElementById('confirm-dialog');
        if (confirmDialog && confirmDialog.style.display === 'flex') {
            this._dispatchConfirmDialog();
            this._updatePrompts('confirm');
            return;
        }

        // Devotion picker
        if (game._devotionPickerActive) {
            this._dispatchMenus('devotion-picker');
            this._updatePrompts('menu');
            return;
        }

        // Upgrade selection
        if (game._upgradePhase && game.upgradeSelectionUI && game.upgradeSelectionUI.active &&
            game.upgradeSelectionUI.phase === 'choosing') {
            this._dispatchUpgradeSelection();
            this._updatePrompts('upgrade');
            return;
        }

        // Intro phases (enemy/tower)
        if (game._introPhase) {
            this._dispatchIntro();
            this._updatePrompts('intro');
            return;
        }

        // Tutorial active — A advances
        if (game._tutorialActive && game._tutorialStep >= 0) {
            this._dispatchTutorial();
        }

        if (state === 'title') {
            // Check which sub-screen is visible
            const screens = ['collection-screen', 'credits-screen', 'settings-screen', 'scenario-screen', 'title-screen'];
            let activeScreen = 'title-screen';
            for (const id of screens) {
                const el = document.getElementById(id);
                if (el && el.style.display !== 'none' && el.offsetParent !== null) {
                    activeScreen = id;
                    break;
                }
            }
            this._dispatchMenus(activeScreen);
            this._updatePrompts('menu');
        } else if (state === 'paused') {
            this._dispatchPause();
            this._updatePrompts('pause');
        } else if (state === 'gameover') {
            const victoryScreen = document.getElementById('victory-screen');
            if (victoryScreen && victoryScreen.classList.contains('active')) {
                this._dispatchMenus('victory-screen');
            } else {
                this._dispatchMenus('game-over-screen');
            }
            this._updatePrompts('menu');
        } else if (state === 'playing') {
            this._dispatchGameplay(dt);
            this._updatePrompts('gameplay');
        }

        // Pulse cursor mesh
        if (this._cursorMesh && this._cursorMesh.visible) {
            const pulse = 0.9 + Math.sin(Date.now() * 0.005) * 0.1;
            this._cursorMesh.scale.set(pulse, 1, pulse);
        }
    }

    // ─── BUTTON HELPERS ──────────────────────────────────────────────────

    _justPressed(btn) {
        return this._currButtons[btn] && !this._prevButtons[btn];
    }

    _isHeld(btn) {
        return this._currButtons[btn];
    }

    // D-pad with repeat
    _dpadJustPressedOrRepeat(btn, dt) {
        if (!this._currButtons[btn]) {
            this._dpadHeld[btn] = false;
            this._dpadTimers[btn] = 0;
            return false;
        }
        if (!this._prevButtons[btn]) {
            // Just pressed
            this._dpadHeld[btn] = true;
            this._dpadTimers[btn] = 0;
            return true;
        }
        // Held — check repeat
        this._dpadTimers[btn] += dt * 1000;
        const threshold = this._dpadHeld[btn] && this._dpadTimers[btn] > DPAD_REPEAT_DELAY
            ? DPAD_REPEAT_RATE
            : DPAD_REPEAT_DELAY;
        if (this._dpadTimers[btn] >= threshold) {
            this._dpadTimers[btn] -= DPAD_REPEAT_RATE;
            return true;
        }
        return false;
    }

    // ─── GAMEPLAY DISPATCH ───────────────────────────────────────────────

    _dispatchGameplay(dt) {
        const game = this._game;

        // Show cursor
        if (this._cursorMesh) {
            this._cursorMesh.visible = true;
            // Red ring in sell mode, gold otherwise
            const ringColor = game._sellMode ? PALETTE.danger : PALETTE.gold;
            this._cursorMesh.children.forEach(child => {
                if (child.isMesh && child.userData._isRing) {
                    child.material.color.setHex(ringColor);
                }
            });
        }

        // --- Cursor movement ---
        const sens = this._settings.sensitivity / 5; // 1.0 at default
        const speed = CURSOR_SPEED * sens;

        // Left stick (analog)
        if (this._stickX !== 0 || this._stickY !== 0) {
            const mag = Math.min(1, Math.sqrt(this._stickX * this._stickX + this._stickY * this._stickY));
            this._cursorWorldPos.x += this._stickX * speed * mag * dt;
            this._cursorWorldPos.z += this._stickY * speed * mag * dt; // stick-down = +Z = toward spawn
        }

        // D-pad (discrete cell movement)
        const gs = CONFIG.grid;
        if (this._dpadJustPressedOrRepeat(BTN.LEFT, dt))  this._cursorWorldPos.x -= gs;
        if (this._dpadJustPressedOrRepeat(BTN.RIGHT, dt)) this._cursorWorldPos.x += gs;
        if (this._dpadJustPressedOrRepeat(BTN.UP, dt))    this._cursorWorldPos.z -= gs; // Up = toward toilet
        if (this._dpadJustPressedOrRepeat(BTN.DOWN, dt))  this._cursorWorldPos.z += gs; // Down = toward spawn

        // Snap to grid
        this._cursorWorldPos.x = Math.round(this._cursorWorldPos.x / gs) * gs;
        this._cursorWorldPos.z = Math.round(this._cursorWorldPos.z / gs) * gs;

        // Clamp to bounds
        const laneW = game._layout ? game._layout.laneWidth : CONFIG.laneWidth;
        const halfW = Math.floor(laneW / gs / 2) * gs;
        const minZ = game._layout ? game._layout.minBuildZ : CONFIG.corridorStart + 2;
        const maxZ = CONFIG.laneLength - 4;
        this._cursorWorldPos.x = Math.max(-halfW, Math.min(halfW, this._cursorWorldPos.x));
        this._cursorWorldPos.z = Math.max(minZ, Math.min(maxZ, this._cursorWorldPos.z));

        // Position cursor mesh
        if (this._cursorMesh) {
            this._cursorMesh.position.set(this._cursorWorldPos.x, 0.05, this._cursorWorldPos.z);
        }

        // Project world position to NDC and write to game.mouse
        this._syncCursorToMouse();

        // --- Tower cycling (LB/RB) ---
        const towerTypes = ['coinmagnet', 'wetfloor', 'mop', 'ubik', 'potplant'];
        // Filter to unlocked towers
        const unlocked = towerTypes.filter(t => {
            const btn = document.querySelector(`.tower-btn[data-tower="${t}"]`);
            return btn && !btn.classList.contains('locked');
        });

        if (this._justPressed(BTN.RB) && unlocked.length > 0) {
            const currIdx = game.selectedTower ? unlocked.indexOf(game.selectedTower) : -1;
            const nextIdx = (currIdx + 1) % unlocked.length;
            game.selectTower(unlocked[nextIdx]);
            this._haptic(0.05, 0, 30);
        }
        if (this._justPressed(BTN.LB) && unlocked.length > 0) {
            const currIdx = game.selectedTower ? unlocked.indexOf(game.selectedTower) : -1;
            const nextIdx = currIdx <= 0 ? unlocked.length - 1 : currIdx - 1;
            game.selectTower(unlocked[nextIdx]);
            this._haptic(0.05, 0, 30);
        }

        // --- Place tower (A or RT) ---
        if (this._justPressed(BTN.A) || this._justPressed(BTN.RT)) {
            if (game._sellMode) {
                game._trySellTowerAtCursor();
                this._haptic(0.2, 0.3, 60);
            } else if (game.selectedTower) {
                game._tryPlaceTower();
                this._haptic(0.15, 0.3, 80);
            }
        }

        // --- Cancel / deselect (B) ---
        if (this._justPressed(BTN.B)) {
            if (game._sellMode) {
                game._exitSellMode();
                this._haptic(0.05, 0, 30);
            } else if (game.selectedTower) {
                game.selectedTower = null;
                game._updateTowerButtons();
                if (window.SFX) SFX.play('ui_tower_deselect');
                this._haptic(0.05, 0, 30);
            }
        }

        // --- Toggle sell mode (Y) ---
        if (this._justPressed(BTN.Y)) {
            game._toggleSellMode();
            this._haptic(0.1, 0.1, 50);
        }

        // --- Pause (Start) ---
        if (this._justPressed(BTN.START)) {
            if (!game._upgradePhase && !game._introPhase && !game._devotionPickerActive) {
                game.pause();
                this._haptic(0.05, 0, 30);
            }
        }
    }

    _syncCursorToMouse() {
        const game = this._game;
        if (!game.camera) return;

        // Create a world-space vector at cursor position, project to NDC
        const worldPos = new THREE.Vector3(this._cursorWorldPos.x, 0, this._cursorWorldPos.z);
        worldPos.project(game.camera);

        game.mouse.x = worldPos.x;
        game.mouse.y = worldPos.y;
    }

    // ─── MENU DISPATCH ───────────────────────────────────────────────────

    _dispatchMenus(screenId) {
        // Scan for focusable elements in the visible screen
        const screen = document.getElementById(screenId);
        if (!screen) return;

        const focusables = this._scanFocusables(screen);
        if (focusables.length === 0) return;

        // Ensure we have a focused element
        if (!this._focusedEl || !focusables.includes(this._focusedEl)) {
            this._setFocus(focusables[0]);
        }

        // Navigation with D-pad/stick
        this._menuNavTimer -= 16; // approximate frame time
        const canNav = this._menuNavTimer <= 0;

        let dx = 0, dy = 0;
        if (this._justPressed(BTN.LEFT) || (canNav && this._stickX < -0.5))  dx = -1;
        if (this._justPressed(BTN.RIGHT) || (canNav && this._stickX > 0.5))  dx = 1;
        if (this._justPressed(BTN.UP) || (canNav && this._stickY < -0.5))    dy = -1;
        if (this._justPressed(BTN.DOWN) || (canNav && this._stickY > 0.5))   dy = 1;

        if (dx !== 0 || dy !== 0) {
            // Special: if focused element is a range slider, left/right adjusts value
            if (this._focusedEl && this._focusedEl.type === 'range' && dx !== 0 && dy === 0) {
                const step = parseInt(this._focusedEl.step) || 5;
                const val = parseInt(this._focusedEl.value) + dx * step;
                this._focusedEl.value = Math.max(parseInt(this._focusedEl.min), Math.min(parseInt(this._focusedEl.max), val));
                this._focusedEl.dispatchEvent(new Event('input'));
                this._menuNavTimer = this._menuNavDelay;
                this._haptic(0.03, 0, 20);
                return;
            }

            const next = this._findNearest(focusables, this._focusedEl, dx, dy);
            if (next) {
                this._setFocus(next);
                this._haptic(0.05, 0, 30);
                this._menuNavTimer = this._menuNavDelay;
            }
        }

        // A = activate
        if (this._justPressed(BTN.A)) {
            this._activateFocused();
            this._haptic(0.1, 0.1, 50);
        }

        // B = back
        if (this._justPressed(BTN.B)) {
            this._navigateBack(screenId);
            this._haptic(0.05, 0, 30);
        }
    }

    _dispatchPause() {
        // Check which pause sub-panel is visible
        const pauseSettings = document.getElementById('pause-settings');
        const pauseHowto = document.getElementById('pause-howto');

        if (pauseSettings && pauseSettings.style.display !== 'none') {
            this._dispatchMenus('pause-settings');
            return;
        }
        if (pauseHowto && pauseHowto.style.display !== 'none') {
            this._dispatchMenus('pause-howto');
            return;
        }

        // Main pause buttons
        this._dispatchMenus('pause-content');

        // Start also unpauses
        if (this._justPressed(BTN.START)) {
            this._game.unpause();
            this._haptic(0.05, 0, 30);
        }
    }

    _dispatchIntro() {
        // A button or Start dismisses intro screens
        if (this._justPressed(BTN.A) || this._justPressed(BTN.START)) {
            // The intro UIs listen for click/keydown events, dispatch a click
            window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            this._haptic(0.05, 0, 30);
        }
    }

    _dispatchTutorial() {
        // A advances tutorial
        if (this._justPressed(BTN.A)) {
            // Tutorial advances via click on tutorial bubble too
            const bubble = document.querySelector('.tutorial-bubble');
            if (bubble) bubble.click();
        }
    }

    _dispatchConfirmDialog() {
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');
        if (!yesBtn || !noBtn) return;

        // Focus navigation between yes/no
        const focusables = [yesBtn];
        if (noBtn.style.display !== 'none') focusables.push(noBtn);

        if (!this._focusedEl || !focusables.includes(this._focusedEl)) {
            this._setFocus(focusables[0]);
        }

        if (this._justPressed(BTN.LEFT) || this._justPressed(BTN.RIGHT)) {
            const idx = focusables.indexOf(this._focusedEl);
            const next = focusables[(idx + 1) % focusables.length];
            this._setFocus(next);
            this._haptic(0.05, 0, 30);
        }

        if (this._justPressed(BTN.A)) {
            if (this._focusedEl) this._focusedEl.click();
            this._haptic(0.1, 0.1, 50);
        }

        if (this._justPressed(BTN.B)) {
            noBtn.click();
            this._haptic(0.05, 0, 30);
        }
    }

    // ─── UPGRADE SELECTION ───────────────────────────────────────────────

    _dispatchUpgradeSelection() {
        const ui = this._game.upgradeSelectionUI;
        if (!ui || !ui.active || ui.phase !== 'choosing') return;

        this._gamepadHoverActive = true;
        ui._gamepadHoverActive = true;

        const count = ui.drones.length;
        if (count === 0) return;

        // D-pad/stick left/right cycles between drones
        if (this._justPressed(BTN.LEFT) || (this._stickX < -0.5 && this._prevStickX >= -0.5)) {
            ui.setHoveredIndex(ui.hoveredIndex <= 0 ? count - 1 : ui.hoveredIndex - 1);
            this._haptic(0.05, 0, 30);
        }
        if (this._justPressed(BTN.RIGHT) || (this._stickX > 0.5 && this._prevStickX <= 0.5)) {
            ui.setHoveredIndex(ui.hoveredIndex < 0 ? 0 : (ui.hoveredIndex + 1) % count);
            this._haptic(0.05, 0, 30);
        }

        // Save stick state for edge detection
        this._prevStickX = this._stickX;

        // A = select
        if (this._justPressed(BTN.A)) {
            ui.confirmSelection();
            this._haptic(0.3, 0.5, 150);
        }
    }

    // ─── FOCUS MANAGEMENT ────────────────────────────────────────────────

    _scanFocusables(container) {
        const selectors = 'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
            'input[type=range], ' +
            'input[type=checkbox], ' +
            '.scenario-card, ' +
            '.collection-filter, ' +
            '.keybind-btn, ' +
            '.devotion-card, ' +
            '.diff-btn';
        const els = Array.from(container.querySelectorAll(selectors));
        // Filter out hidden elements
        return els.filter(el => {
            if (el.offsetParent === null && el.style.position !== 'fixed') return false;
            // Check parent visibility
            let p = el.parentElement;
            while (p && p !== container) {
                if (p.style.display === 'none') return false;
                p = p.parentElement;
            }
            return true;
        });
    }

    _setFocus(el) {
        if (this._focusedEl) {
            this._focusedEl.classList.remove('gamepad-focused');
        }
        this._focusedEl = el;
        if (el) {
            el.classList.add('gamepad-focused');
            el.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
        }
    }

    _clearFocus() {
        if (this._focusedEl) {
            this._focusedEl.classList.remove('gamepad-focused');
            this._focusedEl = null;
        }
    }

    _findNearest(focusables, current, dx, dy) {
        if (!current) return focusables[0];
        const rect = current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        let best = null;
        let bestScore = Infinity;

        for (const el of focusables) {
            if (el === current) continue;
            const r = el.getBoundingClientRect();
            const ex = r.left + r.width / 2;
            const ey = r.top + r.height / 2;
            const ddx = ex - cx;
            const ddy = ey - cy;

            // Must be in the right direction
            if (dx < 0 && ddx >= 0) continue;
            if (dx > 0 && ddx <= 0) continue;
            if (dy < 0 && ddy >= 0) continue;
            if (dy > 0 && ddy <= 0) continue;

            // Score: prefer aligned elements (weight perpendicular distance higher)
            const parallel = dx !== 0 ? Math.abs(ddx) : Math.abs(ddy);
            const perp = dx !== 0 ? Math.abs(ddy) : Math.abs(ddx);
            const score = parallel + perp * 3;

            if (score < bestScore) {
                bestScore = score;
                best = el;
            }
        }
        return best;
    }

    _activateFocused() {
        if (!this._focusedEl) return;
        const el = this._focusedEl;

        if (el.type === 'checkbox') {
            el.checked = !el.checked;
            el.dispatchEvent(new Event('change'));
        } else {
            el.click();
        }
    }

    _navigateBack(screenId) {
        // Context-sensitive back button routing
        const backMap = {
            'title-screen': null,  // No back from title
            'scenario-screen': 'btn-scenario-back',
            'settings-screen': 'btn-settings-back',
            'credits-screen': 'btn-credits-back',
            'collection-screen': 'btn-collection-back',
            'pause-content': null,  // B unpauses
            'pause-settings': 'btn-pause-settings-back',
            'pause-howto': 'btn-pause-howto-back',
            'gameover-screen': null,
            'victory-screen': null,
            'devotion-picker': null,
        };

        const backBtnId = backMap[screenId];
        if (backBtnId) {
            const btn = document.getElementById(backBtnId);
            if (btn) btn.click();
        } else if (screenId === 'pause-content') {
            this._game.unpause();
        }
    }

    // ─── 3D CURSOR MESH ─────────────────────────────────────────────────

    _createCursorMesh() {
        if (!this._game || !this._game.scene) return;

        const group = new THREE.Group();
        group.name = 'gamepad-cursor';

        // Gold ring
        const ringGeo = new THREE.RingGeometry(0.7, 0.9, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = toonMat(PALETTE.gold, { transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.userData._isRing = true;
        group.add(ring);

        // Crosshair lines (cream)
        const lineLen = 0.4;
        const lineMat = toonMat(PALETTE.cream, { transparent: true, opacity: 0.6 });
        const positions = [
            [-lineLen, 0], [lineLen, 0], // X axis
            [0, -lineLen], [0, lineLen], // Z axis
        ];
        for (let i = 0; i < 4; i += 2) {
            const geo = new THREE.BufferGeometry();
            const verts = new Float32Array([
                positions[i][0], 0.01, positions[i][1],
                positions[i + 1][0], 0.01, positions[i + 1][1],
            ]);
            geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
            const line = new THREE.Line(geo, lineMat);
            group.add(line);
        }

        group.visible = false;
        group.renderOrder = 999;
        this._game.scene.add(group);
        this._cursorMesh = group;
    }

    // ─── HAPTIC FEEDBACK ─────────────────────────────────────────────────

    _haptic(weakMag, strongMag, duration) {
        if (!this._settings.vibration) return;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[this._gamepadIndex];
        if (!gp || !gp.vibrationActuator) return;

        try {
            gp.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration,
                weakMagnitude: weakMag,
                strongMagnitude: strongMag,
            });
        } catch (e) {
            // Vibration not supported
        }
    }

    // Public methods for game code to trigger haptics
    hapticPlace()   { this._haptic(0.15, 0.3, 80); }
    hapticSell()    { this._haptic(0.2, 0.3, 60); this._haptic(0.2, 0.3, 60); }
    hapticDamage()  { this._haptic(0.5, 0.8, 200); }
    hapticUpgrade() { this._haptic(0.3, 0.5, 150); }

    // ─── BUTTON PROMPTS ──────────────────────────────────────────────────

    _createPromptBar() {
        const bar = document.createElement('div');
        bar.id = 'gamepad-prompts';
        bar.style.display = 'none';
        document.body.appendChild(bar);
        this._promptBar = bar;
    }

    _updatePrompts(context) {
        if (!this._promptBar || this._inputMode !== 'gamepad') return;

        const icons = this._getIcons();
        let prompts = [];

        switch (context) {
            case 'gameplay': {
                const game = this._game;
                if (game._sellMode) {
                    prompts = [
                        { icon: icons[BTN.A], label: t('gamepad.sell') },
                        { icon: icons[BTN.B], label: t('gamepad.exitSell') },
                        { icon: icons[BTN.Y], label: t('gamepad.sellMode') },
                    ];
                } else if (game.selectedTower) {
                    prompts = [
                        { icon: icons[BTN.A], label: t('gamepad.place') },
                        { icon: icons[BTN.B], label: t('gamepad.deselect') },
                        { icon: icons[BTN.Y], label: t('gamepad.sellMode') },
                        { icon: icons[BTN.LB], label: t('gamepad.prev') },
                        { icon: icons[BTN.RB], label: t('gamepad.next') },
                    ];
                } else {
                    prompts = [
                        { icon: icons[BTN.Y], label: t('gamepad.sellMode') },
                        { icon: icons[BTN.LB], label: t('gamepad.prev') },
                        { icon: icons[BTN.RB], label: t('gamepad.next') },
                    ];
                }
                prompts.push({ icon: icons[BTN.START], label: t('gamepad.pause') });
                break;
            }
            case 'menu':
                prompts = [
                    { icon: icons[BTN.A], label: t('gamepad.select') },
                    { icon: icons[BTN.B], label: t('gamepad.back') },
                    { icon: icons.dpad, label: t('gamepad.navigate') },
                ];
                break;
            case 'upgrade':
                prompts = [
                    { icon: icons[BTN.A], label: t('gamepad.select') },
                    { icon: icons.dpad, label: t('gamepad.choose') },
                ];
                break;
            case 'pause':
                prompts = [
                    { icon: icons[BTN.A], label: t('gamepad.select') },
                    { icon: icons[BTN.B], label: t('gamepad.back') },
                    { icon: icons[BTN.START], label: t('gamepad.resume') },
                ];
                break;
            case 'intro':
                prompts = [
                    { icon: icons[BTN.A], label: t('gamepad.continue') },
                ];
                break;
            case 'confirm':
                prompts = [
                    { icon: icons[BTN.A], label: t('gamepad.confirm') },
                    { icon: icons[BTN.B], label: t('gamepad.cancel') },
                ];
                break;
        }

        this._promptBar.innerHTML = prompts.map(p =>
            `<div class="gp-prompt">${p.icon}<span>${p.label}</span></div>`
        ).join('');
    }

    // ─── CONNECTION TOAST ────────────────────────────────────────────────

    _showToast(message) {
        if (this._toastEl) this._toastEl.remove();

        const toast = document.createElement('div');
        toast.id = 'gamepad-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        this._toastEl = toast;

        // Trigger entrance animation
        requestAnimationFrame(() => toast.classList.add('visible'));

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                if (toast.parentNode) toast.remove();
                if (this._toastEl === toast) this._toastEl = null;
            }, 400);
        }, TOAST_DURATION);
    }

    // ─── SETTINGS PERSISTENCE ────────────────────────────────────────────

    _loadSettings() {
        try {
            const stored = localStorage.getItem('holditin_gamepad_settings');
            if (stored) {
                const parsed = JSON.parse(stored);
                this._settings = { ...this._settings, ...parsed };
            }
        } catch (e) { /* ignore */ }
    }

    _saveSettings() {
        try {
            localStorage.setItem('holditin_gamepad_settings', JSON.stringify(this._settings));
        } catch (e) { /* ignore */ }
    }

    // Called by settings UI sliders/toggles
    setSensitivity(val) {
        this._settings.sensitivity = Math.max(1, Math.min(10, val));
        this._saveSettings();
    }
    setDeadzone(val) {
        this._settings.deadzone = Math.max(5, Math.min(30, val));
        this._saveSettings();
    }
    setVibration(val) {
        this._settings.vibration = !!val;
        this._saveSettings();
    }
}

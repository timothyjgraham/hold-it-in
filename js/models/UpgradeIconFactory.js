// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — 3D Upgrade Icon Factory                                     ║
// ║  Thin orchestrator: imports 73 unique icon builders from tier files       ║
// ║  + 9 legacy tower-type aliases for backward compatibility.                ║
// ║  All fit within ~2 unit bounding box, use PALETTE materials + outlines.   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import {
    miniMagnet, miniCoin, miniSign, miniMop, miniSpray, miniPot,
    miniStar, miniChain, miniDoor,
} from './icons/iconPrimitives.js';

import { COMMON_ICON_BUILDERS } from './icons/commonIcons.js';
import { RARE_ICON_BUILDERS } from './icons/rareIcons.js';
import { LEGENDARY_ICON_BUILDERS } from './icons/legendaryIcons.js';

// ─── SHARED ──────────────────────────────────────────────────────────────────

const _cache = {};

// ─── BUILDER MAP ─────────────────────────────────────────────────────────────
// Legacy tower-type keys (backward compat) + all 73 per-upgrade builders.

const _builders = {
    // Legacy keys — kept for any code still referencing tower-type strings
    magnet: miniMagnet,
    coin:   miniCoin,
    sign:   miniSign,
    mop:    miniMop,
    spray:  miniSpray,
    pot:    miniPot,
    star:   miniStar,
    chain:  miniChain,
    door:   miniDoor,

    // Per-upgrade unique icons (C1–C20, R1–R35, L1–L18)
    ...COMMON_ICON_BUILDERS,
    ...RARE_ICON_BUILDERS,
    ...LEGENDARY_ICON_BUILDERS,
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Create a 3D icon model. Returns a cloned THREE.Group from cache.
 *
 * @param {string} iconKey — upgrade ID (C1, R23, L5, etc.) or legacy key (magnet, coin, etc.)
 * @returns {THREE.Group}
 */
export function createIconModel(iconKey) {
    const key = iconKey || 'star';
    if (!_cache[key]) {
        const builder = _builders[key] || _builders.star;
        _cache[key] = builder();
    }
    return _cache[key].clone();
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — 3D Upgrade Icon Factory                                     ║
// ║  Returns THREE.Group models for upgrade icons.                            ║
// ║  Prefers GLB pack models when available; falls back to procedural.        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import {
    miniMagnet, miniCoin, miniSign, miniMop, miniSpray, miniPot,
    miniStar, miniChain, miniDoor,
} from './icons/iconPrimitives.js';

import { COMMON_ICON_BUILDERS } from './icons/commonIcons.js';
import { RARE_ICON_BUILDERS } from './icons/rareIcons.js';
import { LEGENDARY_ICON_BUILDERS } from './icons/legendaryIcons.js';
import { ICON_PACK_MAP } from '../data/iconPackMapping.js';
import { IconModelCache } from '../loaders/IconModelCache.js';

// ─── SHARED ──────────────────────────────────────────────────────────────────

const _cache = {};

// ─── BUILDER MAP ─────────────────────────────────────────────────────────────

const _builders = {
    // Legacy tower-type keys (backward compat)
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
 * Create a 3D icon model. Prefers GLB pack model if available, falls back to procedural.
 * Returns a cloned THREE.Group.
 *
 * @param {string} iconKey — upgrade ID (C1, R23, L5, etc.) or legacy key
 * @returns {THREE.Group}
 */
export function createIconModel(iconKey) {
    const key = iconKey || 'star';

    if (!_cache[key]) {
        // Try GLB pack model first
        const packEntry = ICON_PACK_MAP[key];
        if (packEntry && IconModelCache.loaded) {
            const group = IconModelCache.getIconGroup(packEntry.model, packEntry.scale);
            if (group) {
                _cache[key] = group;
            }
        }

        // Fallback to procedural builder
        if (!_cache[key]) {
            const builder = _builders[key] || _builders.star;
            _cache[key] = builder();
        }
    }

    return _cache[key].clone();
}

/**
 * Clear the icon cache (call when IconModelCache finishes loading to re-render with GLB models).
 */
export function clearIconCache() {
    for (const key in _cache) {
        delete _cache[key];
    }
}

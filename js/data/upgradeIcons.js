// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Icons                                               ║
// ║  Canvas-drawn toon-style icons for each upgrade/tower type.               ║
// ║  NO emoji, NO raster images — pure 2D canvas geometry only.              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PALETTE } from './palette.js';

// Convert a numeric hex color (0xRRGGBB) to a CSS color string.
function h(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

// Shared line-width formula: chunky toon stroke that scales with icon size.
function lw(s) {
    return Math.max(1.5, s * 0.15);
}

// Apply shared toon stroke settings to a context.
function toonStroke(ctx, s) {
    ctx.lineWidth   = lw(s);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = h(PALETTE.ink);
}

// ─── Individual icon draw functions ──────────────────────────────────────────
// Each receives (ctx, cx, cy, s) where s = size/2 (the "radius" of the bounding box).
// All drawing is centered on (cx, cy).

const ICONS = {

    magnet(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        // Horseshoe arc: full semicircle open downward
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.5, Math.PI, 0, false);
        ctx.strokeStyle = h(PALETTE.danger);
        ctx.lineWidth   = lw(s) * 1.4;
        ctx.stroke();

        // Restore ink for outline re-draw at slightly larger radius
        toonStroke(ctx, s);
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.1, s * 0.5, Math.PI, 0, false);
        ctx.stroke();

        // Silver tips — small rectangles dropping from the ends of the arc
        const tipW = s * 0.18;
        const tipH = s * 0.28;
        const leftX  = cx - s * 0.5 - tipW / 2;
        const rightX = cx + s * 0.5 - tipW / 2;
        const tipY   = cy - s * 0.1;

        // Fill tips in danger red to match magnet poles, then outline in ink
        for (const tx of [leftX, rightX]) {
            ctx.fillStyle = h(PALETTE.danger);
            ctx.fillRect(tx, tipY, tipW, tipH);
            toonStroke(ctx, s);
            ctx.strokeRect(tx, tipY, tipW, tipH);
        }
        // Silver cap highlights
        ctx.fillStyle = h(PALETTE.fixture);
        for (const tx of [leftX, rightX]) {
            ctx.fillRect(tx, tipY, tipW, tipH * 0.4);
        }
    },

    sign(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        // Warning triangle — point up
        const top  = { x: cx,           y: cy - s * 0.8 };
        const botL = { x: cx - s * 0.8, y: cy + s * 0.7 };
        const botR = { x: cx + s * 0.8, y: cy + s * 0.7 };

        ctx.beginPath();
        ctx.moveTo(top.x,  top.y);
        ctx.lineTo(botL.x, botL.y);
        ctx.lineTo(botR.x, botR.y);
        ctx.closePath();
        ctx.fillStyle = h(PALETTE.sign);
        ctx.fill();
        ctx.stroke();

        // "!" — vertical bar as a small rounded rect, then a dot
        const barW = s * 0.13;
        const barH = s * 0.4;
        const bx   = cx - barW / 2;
        const by   = cy - s * 0.1;

        ctx.fillStyle = h(PALETTE.ink);
        // Bar
        ctx.beginPath();
        ctx.roundRect(bx, by, barW, barH, barW * 0.4);
        ctx.fill();
        // Dot
        ctx.beginPath();
        ctx.arc(cx, cy + s * 0.42, barW * 0.6, 0, Math.PI * 2);
        ctx.fill();
    },

    mop(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        const handleW = s * 0.14;
        const handleH = s * 1.0;
        const hx = cx - handleW / 2;
        const hy = cy - s * 0.85;

        // Handle (wood brown)
        ctx.fillStyle = h(PALETTE.wood);
        ctx.fillRect(hx, hy, handleW, handleH);
        toonStroke(ctx, s);
        ctx.strokeRect(hx, hy, handleW, handleH);

        // Mop head — wide, fluffy rounded rect at bottom
        const headW = s * 1.2;
        const headH = s * 0.45;
        const headX = cx - headW / 2;
        const headY = cy + s * 0.3;

        ctx.fillStyle = h(PALETTE.mop);
        ctx.beginPath();
        ctx.roundRect(headX, headY, headW, headH, headH * 0.4);
        ctx.fill();
        toonStroke(ctx, s);
        ctx.beginPath();
        ctx.roundRect(headX, headY, headW, headH, headH * 0.4);
        ctx.stroke();
    },

    spray(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        const bodyW = s * 0.7;
        const bodyH = s * 1.2;
        const bx    = cx - bodyW / 2;
        const by    = cy - s * 0.55;

        // Can body (green)
        ctx.fillStyle = h(PALETTE.ubik);
        ctx.beginPath();
        ctx.roundRect(bx, by, bodyW, bodyH, bodyW * 0.25);
        ctx.fill();
        toonStroke(ctx, s);
        ctx.beginPath();
        ctx.roundRect(bx, by, bodyW, bodyH, bodyW * 0.25);
        ctx.stroke();

        // White label strip across the middle
        const lblH = s * 0.3;
        const lblY = cy - lblH / 2;
        ctx.fillStyle = h(PALETTE.white);
        ctx.fillRect(bx + 2, lblY, bodyW - 4, lblH);

        // Nozzle on top-right
        const nozW = s * 0.25;
        const nozH = s * 0.22;
        ctx.fillStyle = h(PALETTE.fixture);
        ctx.beginPath();
        ctx.roundRect(cx + bodyW * 0.1, by - nozH, nozW, nozH, nozW * 0.3);
        ctx.fill();
        toonStroke(ctx, s);
        ctx.beginPath();
        ctx.roundRect(cx + bodyW * 0.1, by - nozH, nozW, nozH, nozW * 0.3);
        ctx.stroke();
    },

    pot(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        // Terracotta pot — trapezoid (wider at top)
        const topW  = s * 1.1;
        const botW  = s * 0.7;
        const potH  = s * 0.85;
        const potY  = cy - s * 0.05;

        ctx.fillStyle = h(PALETTE.potplant);
        ctx.beginPath();
        ctx.moveTo(cx - topW / 2, potY - potH);
        ctx.lineTo(cx + topW / 2, potY - potH);
        ctx.lineTo(cx + botW / 2, potY);
        ctx.lineTo(cx - botW / 2, potY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rim — slightly wider than pot top
        const rimH = s * 0.14;
        ctx.fillStyle = h(PALETTE.potplant);
        ctx.beginPath();
        ctx.roundRect(cx - topW / 2 - s * 0.05, potY - potH - rimH, topW + s * 0.1, rimH, rimH * 0.3);
        ctx.fill();
        ctx.stroke();

        // Green plant blob on top
        ctx.fillStyle = h(PALETTE.success);
        ctx.beginPath();
        ctx.arc(cx, potY - potH - rimH - s * 0.3, s * 0.38, 0, Math.PI * 2);
        ctx.fill();
        toonStroke(ctx, s);
        ctx.beginPath();
        ctx.arc(cx, potY - potH - rimH - s * 0.3, s * 0.38, 0, Math.PI * 2);
        ctx.stroke();
    },

    chain(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        const rx = s * 0.38;  // ellipse x-radius
        const ry = s * 0.22;  // ellipse y-radius
        const offset = s * 0.28; // horizontal separation between link centers

        ctx.strokeStyle = h(PALETTE.rarityRare);
        ctx.lineWidth   = lw(s) * 1.3;

        // Left link
        ctx.beginPath();
        ctx.ellipse(cx - offset, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Right link (overlaps)
        ctx.beginPath();
        ctx.ellipse(cx + offset, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Re-draw outlines in ink over both
        toonStroke(ctx, s);
        ctx.beginPath();
        ctx.ellipse(cx - offset, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + offset, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    },

    coin(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        // Gold circle
        ctx.fillStyle = h(PALETTE.gold);
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // "$" text centered
        ctx.fillStyle   = h(PALETTE.ink);
        ctx.font        = `bold ${Math.round(s * 0.72)}px monospace`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy + s * 0.04);
    },

    star(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        const points    = 5;
        const outerR    = s * 0.82;
        const innerR    = s * 0.36;
        const startAngle = -Math.PI / 2;

        ctx.fillStyle = h(PALETTE.gold);
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = startAngle + (i * Math.PI) / points;
            const r     = i % 2 === 0 ? outerR : innerR;
            const px    = cx + Math.cos(angle) * r;
            const py    = cy + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    door(ctx, cx, cy, s) {
        toonStroke(ctx, s);
        const dW = s * 0.9;
        const dH = s * 1.55;
        const dx = cx - dW / 2;
        const dy = cy - dH / 2;

        // Door body with slightly rounded top corners
        ctx.fillStyle = h(PALETTE.wood);
        ctx.beginPath();
        ctx.roundRect(dx, dy, dW, dH, [s * 0.12, s * 0.12, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // Door panel inset (lighter line detail)
        const inset = s * 0.14;
        ctx.strokeStyle = h(PALETTE.charcoal);
        ctx.lineWidth   = Math.max(1, lw(s) * 0.5);
        ctx.beginPath();
        ctx.roundRect(dx + inset, dy + inset, dW - inset * 2, dH * 0.5 - inset, s * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(dx + inset, dy + dH * 0.5 + inset * 0.5, dW - inset * 2, dH * 0.42 - inset, s * 0.06);
        ctx.stroke();

        // Gold doorknob
        toonStroke(ctx, s);
        ctx.fillStyle = h(PALETTE.gold);
        ctx.beginPath();
        ctx.arc(cx + dW * 0.22, cy + s * 0.12, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Draw an upgrade icon into an existing canvas 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx  - Target 2D context (NOT cleared by this function)
 * @param {string}  iconKey              - One of: magnet | sign | mop | spray | pot |
 *                                         chain | coin | star | door
 * @param {number}  cx                   - Center X of icon in context space
 * @param {number}  cy                   - Center Y of icon in context space
 * @param {number}  size                 - Bounding box width/height in pixels
 */
export function drawUpgradeIcon(ctx, iconKey, cx, cy, size) {
    const s      = size / 2;
    const drawFn = ICONS[iconKey] ?? ICONS.star;

    ctx.save();
    drawFn(ctx, cx, cy, s);
    ctx.restore();
}

/**
 * Render an icon to an offscreen canvas and return a data URL.
 * Useful for populating <img> src attributes or CSS background-image.
 *
 * @param {string} iconKey - See drawUpgradeIcon
 * @param {number} size    - Canvas dimensions in pixels (square)
 * @returns {string}       - PNG data URL
 */
export function createIconDataURL(iconKey, size = 64) {
    const canvas  = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    const ctx     = canvas.getContext('2d');
    drawUpgradeIcon(ctx, iconKey, size / 2, size / 2, size * 0.85);
    return canvas.toDataURL('image/png');
}

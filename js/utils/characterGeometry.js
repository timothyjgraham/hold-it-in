// Character Geometry Library — polished procedural primitives for toon characters
// Capsules, rounded boxes, lathe torsos, and accessory shapes.
// All built from Three.js r128 primitives (no CapsuleGeometry dependency).

/**
 * Create a capsule geometry (cylinder with hemisphere caps) via LatheGeometry.
 * Replaces flat-ended CylinderGeometry for limbs.
 *
 * @param {number} radius - Capsule radius
 * @param {number} height - Total height (tip to tip)
 * @param {number} [radialSegs=8] - Segments around the circumference
 * @param {number} [capSegs=4] - Segments per hemisphere cap
 * @returns {THREE.LatheGeometry}
 */
export function createCapsule(radius, height, radialSegs = 8, capSegs = 4) {
    const points = [];
    const bodyH = Math.max(0, height - radius * 2);
    const halfBody = bodyH / 2;

    // Bottom hemisphere (from pole up to equator, excluding equator to avoid duplicates)
    for (let i = capSegs; i >= 1; i--) {
        const angle = (i / capSegs) * Math.PI * 0.5;
        points.push(new THREE.Vector2(
            Math.cos(angle) * radius,
            -halfBody - Math.sin(angle) * radius
        ));
    }

    // Equator bottom + cylinder body + equator top
    points.push(new THREE.Vector2(radius, -halfBody));
    if (bodyH > 0) {
        points.push(new THREE.Vector2(radius, halfBody));
    }

    // Top hemisphere (from equator up to pole, excluding equator)
    for (let i = 1; i <= capSegs; i++) {
        const angle = (i / capSegs) * Math.PI * 0.5;
        points.push(new THREE.Vector2(
            Math.cos(angle) * radius,
            halfBody + Math.sin(angle) * radius
        ));
    }

    const geom = new THREE.LatheGeometry(points, radialSegs);
    geom.computeVertexNormals();
    return geom;
}

/**
 * Create a rounded box geometry via ExtrudeGeometry with beveled edges.
 * Replaces hard-edged BoxGeometry for torsos.
 *
 * @param {number} width - Box width (X)
 * @param {number} height - Box height (Y)
 * @param {number} depth - Box depth (Z)
 * @param {number} [radius=0.05] - Corner radius
 * @param {number} [bevelSegs=2] - Bevel smoothness segments
 * @returns {THREE.ExtrudeGeometry}
 */
export function createRoundedBox(width, height, depth, radius = 0.05, bevelSegs = 2) {
    // Clamp radius to half the smallest dimension
    const r = Math.min(radius, width / 2, height / 2, depth / 2);

    const hw = width / 2 - r;
    const hh = height / 2 - r;

    const shape = new THREE.Shape();
    shape.moveTo(-hw, -height / 2);
    shape.lineTo(hw, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -hh);
    shape.lineTo(width / 2, hh);
    shape.quadraticCurveTo(width / 2, height / 2, hw, height / 2);
    shape.lineTo(-hw, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, hh);
    shape.lineTo(-width / 2, -hh);
    shape.quadraticCurveTo(-width / 2, -height / 2, -hw, -height / 2);

    const extrudeDepth = Math.max(0.001, depth - r * 2);

    const geom = new THREE.ExtrudeGeometry(shape, {
        depth: extrudeDepth,
        bevelEnabled: true,
        bevelThickness: r,
        bevelSize: r,
        bevelSegments: bevelSegs,
    });

    // Center on origin (ExtrudeGeometry extends along +Z from 0)
    geom.center();
    geom.computeVertexNormals();
    return geom;
}

/**
 * Create an organic torso via LatheGeometry with a custom profile curve.
 * Great for pear-shaped, egg-shaped, or bowling-pin bodies.
 *
 * @param {number} waistRadius - Radius at bottom
 * @param {number} chestRadius - Radius at top
 * @param {number} height - Total height
 * @param {number} [bulge=0] - Extra belly bulge (0-1 scale of waistRadius)
 * @param {number} [segments=10] - Profile curve resolution
 * @param {number} [radialSegs=10] - Segments around circumference
 * @returns {THREE.LatheGeometry}
 */
export function createOrganicTorso(waistRadius, chestRadius, height, bulge = 0, segments = 10, radialSegs = 10) {
    const points = [];
    const halfH = height / 2;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments; // 0=bottom, 1=top
        // Smooth cubic interpolation
        const base = waistRadius + (chestRadius - waistRadius) * (3 * t * t - 2 * t * t * t);
        // Belly bulge peaks at t≈0.35
        const bulgeFactor = Math.sin(t * Math.PI) * bulge * waistRadius;
        const r = base + bulgeFactor;
        points.push(new THREE.Vector2(Math.max(0.001, r), t * height - halfH));
    }

    const geom = new THREE.LatheGeometry(points, radialSegs);
    geom.computeVertexNormals();
    return geom;
}

/**
 * Create a flat cap/hat — a flattened cylinder.
 * @param {number} radius - Cap radius
 * @param {number} height - Cap thickness
 * @param {number} [segments=10] - Radial segments
 * @returns {THREE.CylinderGeometry}
 */
export function createFlatCap(radius, height, segments = 10) {
    return new THREE.CylinderGeometry(radius, radius * 1.05, height, segments);
}

/**
 * Create a cap brim — a wider flat ring under the cap.
 * @param {number} innerRadius - Inner ring radius (matches cap radius)
 * @param {number} outerRadius - Outer brim radius
 * @param {number} [segments=10] - Radial segments
 * @returns {THREE.RingGeometry} (rotated to horizontal)
 */
export function createBrim(innerRadius, outerRadius, segments = 10) {
    const geom = new THREE.RingGeometry(innerRadius * 0.8, outerRadius, segments);
    // Rotate to horizontal and give it slight thickness by using a thin cylinder instead
    const brim = new THREE.CylinderGeometry(outerRadius, outerRadius, 0.01, segments);
    return brim;
}

/**
 * Create a simple shoe/foot shape — slightly elongated rounded box.
 * @param {number} width
 * @param {number} height
 * @param {number} length
 * @returns {THREE.ExtrudeGeometry}
 */
export function createFoot(width, height, length) {
    return createRoundedBox(width, height, length, Math.min(height * 0.4, width * 0.3));
}

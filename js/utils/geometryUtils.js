// Geometry Utilities — merge multiple BufferGeometry instances with transforms

/**
 * Merge an array of BufferGeometry instances into a single BufferGeometry.
 * Handles indexed and non-indexed geometries, re-offsets indices, and
 * transforms positions/normals by the corresponding Matrix4.
 *
 * @param {THREE.BufferGeometry[]} geometries - Array of geometries to merge
 * @param {THREE.Matrix4[]} transforms - Corresponding transform for each geometry
 * @returns {THREE.BufferGeometry} Merged geometry with position, normal, and index
 */
export function mergeGeometries(geometries, transforms) {
    let totalVertices = 0;
    let totalIndices = 0;

    for (const geom of geometries) {
        totalVertices += geom.attributes.position.count;
        totalIndices += geom.index
            ? geom.index.count
            : geom.attributes.position.count;
    }

    const positions = new Float32Array(totalVertices * 3);
    const normals = new Float32Array(totalVertices * 3);
    const indices = totalIndices > 65535
        ? new Uint32Array(totalIndices)
        : new Uint16Array(totalIndices);

    const tempPos = new THREE.Vector3();
    const tempNorm = new THREE.Vector3();
    const normalMat = new THREE.Matrix3();

    let vertexOffset = 0;
    let indexOffset = 0;

    for (let g = 0; g < geometries.length; g++) {
        const geom = geometries[g];
        const transform = transforms[g];

        normalMat.getNormalMatrix(transform);

        const srcPos = geom.attributes.position;
        const srcNorm = geom.attributes.normal;
        const vCount = srcPos.count;

        // Transform and copy positions + normals
        for (let i = 0; i < vCount; i++) {
            const idx = (vertexOffset + i) * 3;

            tempPos.set(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i));
            tempPos.applyMatrix4(transform);
            positions[idx]     = tempPos.x;
            positions[idx + 1] = tempPos.y;
            positions[idx + 2] = tempPos.z;

            if (srcNorm) {
                tempNorm.set(srcNorm.getX(i), srcNorm.getY(i), srcNorm.getZ(i));
                tempNorm.applyMatrix3(normalMat).normalize();
                normals[idx]     = tempNorm.x;
                normals[idx + 1] = tempNorm.y;
                normals[idx + 2] = tempNorm.z;
            }
        }

        // Copy indices with vertex offset
        if (geom.index) {
            for (let i = 0; i < geom.index.count; i++) {
                indices[indexOffset + i] = geom.index.getX(i) + vertexOffset;
            }
            indexOffset += geom.index.count;
        } else {
            for (let i = 0; i < vCount; i++) {
                indices[indexOffset + i] = vertexOffset + i;
            }
            indexOffset += vCount;
        }

        vertexOffset += vCount;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    merged.setIndex(new THREE.BufferAttribute(indices, 1));

    return merged;
}

// SpatialGrid — fast spatial hash for enemy proximity queries.
// Replaces O(n) full-array scans with O(1) cell lookups.
// Rebuilt each frame (~50-100 inserts, trivial cost).

export class SpatialGrid {
    /**
     * @param {number} cellSize - Grid cell size in world units.
     *   Should roughly match typical tower range (4-6 units).
     */
    constructor(cellSize = 4) {
        this.cellSize = cellSize;
        this.invCellSize = 1 / cellSize;
        this.cells = new Map();
    }

    /**
     * Clear and re-insert all entities. Call once per frame.
     * @param {Array<{x: number, z: number}>} entities
     */
    rebuild(entities) {
        // Reuse existing cell arrays to avoid GC pressure
        for (const cell of this.cells.values()) cell.length = 0;

        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            const key = this._key(
                Math.floor(e.x * this.invCellSize),
                Math.floor(e.z * this.invCellSize)
            );
            let cell = this.cells.get(key);
            if (!cell) {
                cell = [];
                this.cells.set(key, cell);
            }
            cell.push(e);
        }
    }

    /**
     * Return all entities whose cell overlaps the bounding box
     * defined by (x ± radius, z ± radius).
     *
     * This is a broad-phase filter — callers still do exact distance checks.
     *
     * @param {number} x - Query center X
     * @param {number} z - Query center Z
     * @param {number} radius - Search radius
     * @returns {Array} Entities in overlapping cells
     */
    query(x, z, radius) {
        const results = [];
        const inv = this.invCellSize;
        const minCx = Math.floor((x - radius) * inv);
        const maxCx = Math.floor((x + radius) * inv);
        const minCz = Math.floor((z - radius) * inv);
        const maxCz = Math.floor((z + radius) * inv);

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cz = minCz; cz <= maxCz; cz++) {
                const cell = this.cells.get(this._key(cx, cz));
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        results.push(cell[i]);
                    }
                }
            }
        }
        return results;
    }

    /**
     * Encode cell coordinates into a unique numeric key.
     * Offset ensures positive values for reasonable game-world ranges.
     */
    _key(cx, cz) {
        return (cx + 500) * 1000 + (cz + 500);
    }
}

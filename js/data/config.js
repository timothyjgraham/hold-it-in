// Hold It In — Game Configuration

import { PALETTE } from './palette.js';

export const CONFIG = {
    // Grid
    grid: 2,                    // Grid cell size in world units

    // Lane dimensions
    laneWidth: 30,              // Width of the playable lane (X axis)
    laneLength: 70,             // Length from toilet to spawn edge (Z axis)
    corridorWidth: 12,          // Narrows near the toilet
    corridorStart: 12,          // Z position where corridor begins

    // Toilet
    toiletPos: { x: 0, y: 0, z: 3 },

    // Camera — ~47° angle (steeper isometric), centered on mid-field
    cameraPos: { x: 0, y: 36, z: -7 },
    cameraLookAt: { x: 0, y: 0, z: 27 },
    cameraFOV: 58,

    // Gameplay
    startingHygiene: 5,         // Lives
    startingCoins: 55,          // Starting currency — just enough for Ubik + Magnet on wave 1
    MAX_TOWERS: Infinity,       // No global tower cap (Skeleton Crew still limits to 6)

    // Spawn
    spawnZoneZ: 69,             // Where enemies appear (behind the exit doors at z=68)
    spawnWidth: 10,             // Spread across X at spawn (fits within 12-wide exit doorway)

    // Colors — all sourced from master palette
    colors: {
        ground: PALETTE.charcoal,
        tile: PALETTE.tileLight,
        tileAlt: PALETTE.tileDark,
        grid: PALETTE.fixture,
        toilet: PALETTE.white,
        toiletGold: PALETTE.gold,
        holyLight: PALETTE.glow,
        corridor: PALETTE.tileLight,
        enemy: PALETTE.polite,
        tower: PALETTE.hoodie,
    }
};

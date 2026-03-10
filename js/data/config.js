// Hold It In — Game Configuration

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

    // Camera — steep TD angle for clear field visibility
    cameraPos: { x: 0, y: 26, z: -15 },
    cameraLookAt: { x: 0, y: 0, z: 22 },
    cameraFOV: 50,

    // Gameplay
    startingHygiene: 5,         // Lives
    startingCoins: 100,         // Starting currency — enough for economy + first defense

    // Spawn
    spawnZoneZ: 69,             // Where enemies appear (behind the exit doors at z=68)
    spawnWidth: 10,             // Spread across X at spawn (fits within 12-wide exit doorway)

    // Colors
    colors: {
        ground: 0x2a2a2a,
        tile: 0xe8e0d0,
        tileAlt: 0xddd5c5,
        grid: 0xcccccc,
        toilet: 0xf5f5f0,
        toiletGold: 0xffd700,
        holyLight: 0xfff4b0,
        corridor: 0xd4e6f1,
        enemy: 0xe67e22,
        tower: 0x3498db,
    }
};

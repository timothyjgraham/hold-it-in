/**
 * Wave generator — extracted from balance-sim.js
 * Supports both Math.random() and seeded mulberry32 PRNG.
 */

const { GAME } = require('./gameData');
const { proceduralEnemyCount, spawnInterval, burstSize } = require('./formulas');

/**
 * Mulberry32 seeded PRNG — returns a function that produces [0,1) floats.
 */
function mulberry32(seed) {
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Append wall spawns to the given enemy array (mutates in place).
 * Mirrors the game's coordinated wall formations from wave 5+.
 */
function appendWallSpawns(enemies, wave, scenario, rand) {
  if (wave < 5) return;
  const wallChance = Math.min(0.8, 0.08 + (wave - 5) * 0.03);
  const maxWalls = Math.min(3, 1 + Math.floor((wave - 5) / 10));
  const layout = GAME.scenarioLayout[scenario] || GAME.scenarioLayout.office;
  for (let w = 0; w < maxWalls; w++) {
    if (rand() < wallChance) {
      for (let i = 0; i < layout.wallEnemyCount; i++) {
        enemies.push(layout.wallType);
      }
    }
  }
}

/**
 * Generate a wave's enemy composition.
 * @param {number} wave - Wave number (1-based)
 * @param {string} scenario - 'office'|'forest'|'ocean'|'airplane'
 * @param {function} [rng=Math.random] - RNG function returning [0,1)
 * @returns {{ enemies: string[], interval: number, event: object|null, eventSpeedMult: number, eventDesperateChance: number, burstSize: number }}
 */
function generateWave(wave, scenario, rng) {
  const rand = rng || Math.random;
  const events = GAME.waveEvents[scenario] || {};
  let event = events[wave] || null;

  // Recurring events after wave 50 (every 5th wave picks a random existing event, scaled)
  if (!event && wave > 50 && wave % 5 === 0) {
    const keys = Object.keys(events);
    if (keys.length > 0) {
      const base = events[keys[Math.floor(rand() * keys.length)]];
      const scale = 1 + (wave - 50) * 0.05;
      event = { ...base, enemyMult: (base.enemyMult || 1) * scale };
    }
  }

  // Curated waves 1-10: draw pool approach (mirrors game's ENEMY_DRAW_POOL)
  if (wave <= 10) {
    const curated = GAME.curatedWaves[scenario][wave];
    const total = curated.enemies.reduce((sum, [_, count]) => sum + count, 0);
    const expanded = [];

    // Build unlocked pool for this wave
    const fullPool = GAME.enemyDrawPool[scenario] || GAME.enemyDrawPool.office;
    const pool = fullPool.filter(e => e.unlocksAt <= wave);

    // On intro waves, guarantee some of the new type
    const introEntry = fullPool.find(e => e.unlocksAt === wave && e.unlocksAt > 1);
    let remaining = total;
    if (introEntry) {
      const guaranteed = (introEntry.type.endsWith('_train') || introEntry.type.endsWith('_group')) ? 1 : 2;
      const count = Math.min(guaranteed, remaining);
      for (let i = 0; i < count; i++) {
        // Expand trains and swarms for intro entries too
        const itype = introEntry.type;
        if (itype.endsWith('_train')) {
          const actual = itype.replace('_train', '');
          const [min, max] = GAME.trainSizes[actual] || [6, 8];
          const trainSize = min + Math.floor(rand() * (max - min + 1));
          for (let j = 0; j < trainSize; j++) expanded.push(actual);
        } else if (itype.endsWith('_group')) {
          const actual = itype.replace('_group', '');
          const groupSize = GAME.swarmSize[0] + Math.floor(rand() * (GAME.swarmSize[1] - GAME.swarmSize[0] + 1));
          for (let j = 0; j < groupSize; j++) expanded.push(actual);
        } else {
          expanded.push(itype);
        }
      }
      remaining -= count;
    }

    // Fill remaining slots with weighted random draws
    const drawFromPool = (pool) => {
      const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
      let roll = rand() * totalWeight;
      for (const entry of pool) {
        roll -= entry.weight;
        if (roll <= 0) return entry.type;
      }
      return pool[pool.length - 1].type;
    };

    for (let i = 0; i < remaining; i++) {
      const type = drawFromPool(pool);
      // Expand trains and swarms inline
      if (type.endsWith('_train')) {
        const actual = type.replace('_train', '');
        const [min, max] = GAME.trainSizes[actual] || [6, 8];
        const trainSize = min + Math.floor(rand() * (max - min + 1));
        for (let j = 0; j < trainSize; j++) expanded.push(actual);
      } else if (type.endsWith('_group')) {
        const actual = type.replace('_group', '');
        const groupSize = GAME.swarmSize[0] + Math.floor(rand() * (GAME.swarmSize[1] - GAME.swarmSize[0] + 1));
        for (let j = 0; j < groupSize; j++) expanded.push(actual);
      } else {
        expanded.push(type);
      }
    }

    // Wall spawns for curated waves 5-10
    appendWallSpawns(expanded, wave, scenario, rand);

    const burstSize_ = burstSize(wave);
    const eventBurstSize = event ? Math.min(12, burstSize_ * 2) : burstSize_;

    return { enemies: expanded, interval: curated.interval, event: null, eventSpeedMult: 1.0, eventDesperateChance: 0, burstSize: eventBurstSize };
  }

  // Procedural waves 11+
  let total = proceduralEnemyCount(wave);
  if (event && event.enemyMult) total = Math.floor(total * event.enemyMult);

  const weights = GAME.proceduralWeights[scenario];
  const fallback = GAME.fallbackType[scenario];
  const queue = [];

  for (let i = 0; i < total; i++) {
    const roll = rand();
    let type = fallback;

    if (event && event.weights) {
      let cumulative = 0;
      for (const [etype, weight] of Object.entries(event.weights)) {
        cumulative += weight;
        if (roll < cumulative) { type = etype; break; }
      }
    } else {
      let cumulative = 0;
      for (const [etype, w] of weights) {
        const weight = typeof w === 'function' ? w(wave) : w;
        cumulative += weight;
        if (roll < cumulative) { type = etype; break; }
      }
    }

    // Expand trains and swarms
    if (type.endsWith('_train')) {
      const actual = type.replace('_train', '');
      const [min, max] = GAME.trainSizes[actual] || [6, 8];
      const trainSize = min + Math.floor(rand() * (max - min + 1));
      for (let j = 0; j < trainSize; j++) queue.push(actual);
    } else if (type.endsWith('_group')) {
      const actual = type.replace('_group', '');
      const groupSize = GAME.swarmSize[0] + Math.floor(rand() * (GAME.swarmSize[1] - GAME.swarmSize[0] + 1));
      for (let j = 0; j < groupSize; j++) queue.push(actual);
    } else {
      queue.push(type);
    }
  }

  // Wall spawns for procedural waves 11+
  appendWallSpawns(queue, wave, scenario, rand);

  let interval = spawnInterval(wave);
  if (event && event.spawnMult) interval = Math.max(0.1, interval * event.spawnMult);
  const eventSpeedMult = event?.speedMult || 1.0;
  const eventDesperateChance = event?.desperateChance || 0;

  const burstSize_ = burstSize(wave);
  const eventBurstSize = event ? Math.min(12, burstSize_ * 2) : burstSize_;

  return { enemies: queue, interval, event, eventSpeedMult, eventDesperateChance, burstSize: eventBurstSize };
}

module.exports = { generateWave, mulberry32 };

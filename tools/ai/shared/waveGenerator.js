/**
 * Wave generator — extracted from balance-sim.js
 * Supports both Math.random() and seeded mulberry32 PRNG.
 */

const { GAME } = require('./gameData');
const { proceduralEnemyCount, spawnInterval } = require('./formulas');

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
 * Generate a wave's enemy composition.
 * @param {number} wave - Wave number (1-based)
 * @param {string} scenario - 'office'|'forest'|'ocean'|'airplane'
 * @param {function} [rng=Math.random] - RNG function returning [0,1)
 * @returns {{ enemies: string[], interval: number, event: object|null, eventSpeedMult: number, eventDesperateChance: number }}
 */
function generateWave(wave, scenario, rng) {
  const rand = rng || Math.random;
  const events = GAME.waveEvents[scenario] || {};
  const event = events[wave] || null;

  // Curated waves 1-10
  if (wave <= 10) {
    const curated = GAME.curatedWaves[scenario][wave];
    const expanded = [];
    for (const [type, count] of curated.enemies) {
      if (type.endsWith('_train')) {
        const actual = type.replace('_train', '');
        const [min, max] = GAME.trainSizes[actual] || [6, 8];
        const trainSize = min + Math.floor(rand() * (max - min + 1));
        for (let i = 0; i < trainSize; i++) expanded.push(actual);
      } else if (type.endsWith('_group')) {
        const actual = type.replace('_group', '');
        const groupSize = GAME.swarmSize[0] + Math.floor(rand() * (GAME.swarmSize[1] - GAME.swarmSize[0] + 1));
        for (let i = 0; i < groupSize; i++) expanded.push(actual);
      } else {
        for (let i = 0; i < count; i++) expanded.push(type);
      }
    }
    return { enemies: expanded, interval: curated.interval, event: null, eventSpeedMult: 1.0, eventDesperateChance: 0 };
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

  const interval = spawnInterval(wave);
  const eventSpeedMult = event?.speedMult || 1.0;
  const eventDesperateChance = event?.desperateChance || 0;

  return { enemies: queue, interval, event, eventSpeedMult, eventDesperateChance };
}

module.exports = { generateWave, mulberry32 };

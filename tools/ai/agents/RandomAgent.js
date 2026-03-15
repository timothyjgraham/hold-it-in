/**
 * RandomAgent — random baseline player for Hold It In.
 *
 * decideTowers: randomly buys 0-2 towers from available/affordable types. Never sells.
 * pickUpgrade:  picks a random index from the options array.
 */

const { GAME } = require('../shared/gameData');

class RandomAgent {
  /**
   * @param {object} [opts]
   * @param {function} [opts.rng] - RNG function returning [0,1). Defaults to Math.random.
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
  }

  /**
   * Decide which towers to buy/sell this wave.
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {{ buys: string[], sells: string[] }}
   */
  decideTowers(state) {
    const { wave, coins, towers } = state;
    const buys = [];
    const sells = [];

    // Determine how many towers to buy this wave (0, 1, or 2)
    const numBuys = Math.floor(this.rng() * 3); // 0, 1, or 2

    // Collect affordable and unlocked tower types
    const available = Object.keys(GAME.towers).filter(type => {
      const tDef = GAME.towers[type];
      return tDef.unlockWave <= wave;
    });

    if (available.length === 0) return { buys, sells };

    let budget = coins;

    for (let i = 0; i < numBuys; i++) {
      // Filter to affordable types given remaining budget
      const affordable = available.filter(type => GAME.towers[type].cost <= budget);
      if (affordable.length === 0) break;

      const type = affordable[Math.floor(this.rng() * affordable.length)];
      buys.push(type);
      budget -= GAME.towers[type].cost;
    }

    return { buys, sells };
  }

  /**
   * Pick an upgrade from the offered options.
   * @param {object[]} options - Array of upgrade objects (length 1-3)
   * @param {object} state - Current game state
   * @returns {number} Index of chosen upgrade (0, 1, or 2)
   */
  pickUpgrade(options, state) {
    return Math.floor(this.rng() * options.length);
  }
}

module.exports = { RandomAgent };

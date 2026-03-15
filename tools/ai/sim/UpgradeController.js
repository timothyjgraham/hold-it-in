/**
 * UpgradeController — mirrors UpgradeManager.js upgrade rolling/selection logic.
 * Pure simulation: no rendering, no UI, no ceremonies.
 */

const { GAME } = require('../shared/gameData');

class UpgradeController {
  constructor() {
    this.acquired = {}; // id -> stack count
  }

  /**
   * Roll 3 upgrade options for the given wave state.
   * Exactly mirrors the real game's UpgradeManager.rollUpgrades() logic:
   *  - filter pool by maxStacks, exclusives, tower requirements
   *  - roll 3 rarity slots
   *  - guarantee 1 general + 1 tower-specific when possible
   *
   * @param {number} wave
   * @param {object} ownedTowers - { coinmagnet: N, wetfloor: N, ... }
   * @param {function} rng - RNG function returning [0,1), defaults to Math.random
   * @returns {object[]} array of up to 3 upgrade objects from GAME.upgrades
   */
  rollOptions(wave, ownedTowers, rng) {
    const rand = rng || Math.random;

    // Build eligible pool
    const pool = GAME.upgrades.filter(u => {
      // Not maxed
      if ((this.acquired[u.id] || 0) >= u.maxStacks) return false;
      // Exclusive conflict
      if (u.exclusive && this.acquired[u.exclusive]) return false;
      // Tower requirement met
      if (u.tower !== null) {
        const required = Array.isArray(u.tower) ? u.tower : [u.tower];
        if (!required.some(t => ownedTowers[t] > 0)) return false;
      }
      return true;
    });

    const slots = this._raritySlots(wave, rand);
    const options = [];

    for (const rarity of slots) {
      const candidates = pool.filter(u => u.rarity === rarity && !options.find(o => o.id === u.id));
      if (candidates.length > 0) {
        options.push(candidates[Math.floor(rand() * candidates.length)]);
      } else {
        // Fallback: any rarity
        const fallback = pool.filter(u => !options.find(o => o.id === u.id));
        if (fallback.length > 0) {
          options.push(fallback[Math.floor(rand() * fallback.length)]);
        }
      }
    }

    // Guarantee at least one general (tower === null) option
    const hasGeneral = options.some(o => o.tower === null);
    if (!hasGeneral && options.length === 3) {
      const generals = pool.filter(u => u.tower === null && !options.find(o => o.id === u.id));
      if (generals.length > 0) {
        options[2] = generals[Math.floor(rand() * generals.length)];
      }
    }

    // Guarantee at least one tower-specific option if player owns towers
    const ownedTowerKeys = Object.keys(ownedTowers).filter(t => ownedTowers[t] > 0);
    if (ownedTowerKeys.length > 0 && options.length >= 2) {
      const hasTowerSpecific = options.some(o => {
        if (o.tower === null) return false;
        const required = Array.isArray(o.tower) ? o.tower : [o.tower];
        return required.some(t => ownedTowers[t] > 0);
      });
      if (!hasTowerSpecific) {
        const towerPool = pool.filter(u => {
          if (u.tower === null) return false;
          const required = Array.isArray(u.tower) ? u.tower : [u.tower];
          return required.some(t => ownedTowers[t] > 0) && !options.find(o => o.id === u.id);
        });
        if (towerPool.length > 0) {
          options[1] = towerPool[Math.floor(rand() * towerPool.length)];
        }
      }
    }

    return options;
  }

  /**
   * Exact rarity rates from the game (UpgradeManager._getRaritySlots).
   * Three independent rolls per slot.
   * @private
   */
  _raritySlots(wave, rand) {
    let cRate, rRate;
    if (wave <= 5) {
      cRate = 0.90; rRate = 0.10; // lRate = 0.00
    } else if (wave <= 9) {
      cRate = 0.70; rRate = 0.27; // lRate = 0.03
    } else if (wave <= 14) {
      cRate = 0.50; rRate = 0.35; // lRate = 0.15
    } else if (wave <= 19) {
      cRate = 0.38; rRate = 0.37; // lRate = 0.25
    } else {
      cRate = 0.30; rRate = 0.38; // lRate = 0.32
    }

    const rollSlot = () => {
      const r = rand();
      if (r < cRate) return 'common';
      if (r < cRate + rRate) return 'rare';
      return 'legendary';
    };

    return [rollSlot(), rollSlot(), rollSlot()];
  }

  /**
   * Pick (acquire) an upgrade — increment its stack count.
   */
  pick(upgrade) {
    this.acquired[upgrade.id] = (this.acquired[upgrade.id] || 0) + 1;
  }

  /**
   * Check if an upgrade has been acquired.
   */
  has(id) {
    return (this.acquired[id] || 0) > 0;
  }

  /**
   * Get the stack count for an upgrade.
   */
  stacks(id) {
    return this.acquired[id] || 0;
  }

  /**
   * Get an array of { id, stacks } for all acquired upgrades.
   */
  getAcquiredList() {
    const list = [];
    for (const [id, count] of Object.entries(this.acquired)) {
      if (count > 0) list.push({ id, stacks: count });
    }
    return list;
  }

  /**
   * Get a shallow copy of the acquired map for state snapshots.
   */
  snapshot() {
    return { ...this.acquired };
  }
}

module.exports = { UpgradeController };

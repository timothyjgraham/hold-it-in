/**
 * TowerController — manages tower inventory, buying, selling with upgrade effects.
 * Headless simulation counterpart to the in-game tower placement system.
 */

const { GAME } = require('../shared/gameData');

class TowerController {
  constructor() {
    this.towers = { coinmagnet: 0, wetfloor: 0, mop: 0, ubik: 0, potplant: 0 };
    this.totalTowers = 0;
    this.maxSlots = 999;
    this.costMult = 1.0;       // R14 Clearance Sale reduces this
    this.sellRefundRate = 0.5;  // R22 Recycler sets to 1.0
    this.permanentDmgBonus = 0; // R26 Controlled Demo stacks
    this._hasControlledDemo = false;
    this._bargainBin = false;   // C19: pot plants cost 0
  }

  /**
   * Get the current cost of a tower type, accounting for cost multiplier upgrades.
   */
  towerCost(type) {
    // C19: Bargain Bin — pot plants cost 0
    if (type === 'potplant' && this._bargainBin) return 0;
    return Math.ceil(GAME.towers[type].cost * this.costMult);
  }

  /**
   * Check whether a tower type can be purchased given coins, wave, and slot constraints.
   */
  canBuy(type, coins, wave) {
    const tDef = GAME.towers[type];
    if (!tDef) return false;
    if (coins < this.towerCost(type)) return false;
    if (this.totalTowers >= this.maxSlots) return false;
    if (tDef.unlockWave > wave) return false;
    return true;
  }

  /**
   * Buy a tower. Returns the cost paid.
   * Caller is responsible for checking canBuy() first.
   */
  buy(type) {
    const cost = this.towerCost(type);
    this.towers[type]++;
    this.totalTowers++;
    return cost;
  }

  /**
   * Sell a tower. Returns the refund amount.
   * If R26 (Controlled Demolition) is active, adds 0.08 to permanentDmgBonus.
   */
  sell(type) {
    if (this.towers[type] <= 0) return 0;
    this.towers[type]--;
    this.totalTowers--;
    const refund = Math.floor(this.towerCost(type) * this.sellRefundRate);

    // R26: Controlled Demolition — selling a tower permanently boosts damage
    if (this._hasControlledDemo) {
      this.permanentDmgBonus += 0.08;
    }

    return refund;
  }

  /**
   * Total value of all owned towers at current cost multiplier.
   */
  totalValue() {
    let v = 0;
    for (const [type, count] of Object.entries(this.towers)) {
      v += this.towerCost(type) * count;
    }
    return v;
  }

  /**
   * Apply an upgrade's tower-related effects.
   */
  applyUpgrade(upgradeId) {
    switch (upgradeId) {
      case 'R14': // Clearance Sale: all towers 20% cheaper
        this.costMult *= 0.8;
        break;
      case 'R22': // Recycler: full refund on sell
        this.sellRefundRate = 1.0;
        break;
      case 'R24': // Skeleton Crew: max 6 tower slots
        this.maxSlots = 6;
        break;
      case 'R23': // Devotion: 30% cost reduction for locked types only.
        // In practice player locks ~2 of 5 types, so ~40% of towers get the discount.
        // Approximate as a smaller global discount: ~12% overall savings.
        this.costMult *= 0.88;
        break;
      case 'C19': // Bargain Bin: pot plants cost 0 (but only 2 HP)
        this._bargainBin = true;
        break;
      case 'R26': // Controlled Demolition: track that we have it
        this._hasControlledDemo = true;
        break;
    }
  }

  /**
   * Get a shallow copy of tower counts for state snapshots.
   */
  snapshot() {
    return { ...this.towers };
  }
}

module.exports = { TowerController };

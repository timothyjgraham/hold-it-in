/**
 * HeuristicAgent — port of balance-sim.js TowerAI._balanced() + UpgradeSimulator.pickBest().
 *
 * Produces similar results to the Monte Carlo heuristic in balance-sim.js.
 * Pure heuristic, no learning or randomness.
 */

const { GAME } = require('../shared/gameData');
const { UPGRADE_TOWER_MAP, countUpgradesForTowerSim } = require('../shared/upgradeHelpers');

class HeuristicAgent {
  constructor() {}

  /**
   * Decide which towers to buy/sell this wave.
   * Port of TowerAI._balanced() from balance-sim.js.
   *
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {{ buys: string[], sells: string[] }}
   */
  decideTowers(state) {
    const { wave, coins, towers } = state;
    const buys = [];
    const sells = [];
    let budget = coins;

    const cost = (type) => GAME.towers[type].cost;
    const canBuy = (type) => {
      return GAME.towers[type].unlockWave <= wave && cost(type) <= budget;
    };
    const currentCount = (type) => (towers[type] || 0) + buys.filter(b => b === type).length;
    const doBuy = (type) => {
      buys.push(type);
      budget -= cost(type);
    };

    // Wave 1: buy 1 coinmagnet + 1 ubik
    if (wave === 1) {
      if (canBuy('coinmagnet')) doBuy('coinmagnet');
      if (canBuy('ubik')) doBuy('ubik');
      return { buys, sells };
    }

    // Wave 3+: add wetfloor (up to 2)
    if (wave >= 3 && currentCount('wetfloor') < 2 && canBuy('wetfloor')) {
      doBuy('wetfloor');
    }

    // Wave 5+: add mop (1 per wave if affordable)
    if (wave >= 5 && canBuy('mop')) {
      doBuy('mop');
    }

    // Wave 7+: add potplant (up to 3)
    if (wave >= 7 && currentCount('potplant') < 3 && canBuy('potplant')) {
      doBuy('potplant');
    }

    // General: buy 1 combat tower per wave from priority, keeping 20 coin reserve
    if (wave > 3) {
      const priority = ['ubik', 'mop', 'wetfloor'];
      for (const type of priority) {
        if (GAME.towers[type].unlockWave <= wave && cost(type) <= budget - 20) {
          doBuy(type);
          break;
        }
      }
    }

    // Wave 8+: second coinmagnet
    if (wave >= 8 && currentCount('coinmagnet') < 2 && canBuy('coinmagnet')) {
      doBuy('coinmagnet');
    }

    return { buys, sells };
  }

  /**
   * Pick an upgrade from the offered options.
   * Port of UpgradeSimulator.pickBest() from balance-sim.js.
   *
   * @param {object[]} options - Array of upgrade objects (length 1-3)
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {number} Index of chosen upgrade (0, 1, or 2)
   */
  pickUpgrade(options, state) {
    if (options.length === 0) return 0;

    const { towers, upgrades } = state;
    const totalTowers = Object.values(towers).reduce((a, b) => a + b, 0);

    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      let score = 0;

      // ── Rarity base score ──
      if (opt.rarity === 'legendary') score += 30;
      else if (opt.rarity === 'rare') score += 15;
      else score += 5;

      // ── Economy upgrades ──
      if (['coinValueMult', 'payday', 'tipJar', 'towerCostMult', 'goldenMagnet',
           'compoundInterest', 'loanShark'].includes(opt.effect)) {
        score += 20;
      }

      // ── Mild economy ──
      if (['overkillBonus', 'sprayBonus'].includes(opt.effect)) {
        score += 10;
      }

      // ── DPS upgrades scale with mop+ubik count ──
      if (['ubikDamage', 'ubikCooldown', 'mopCooldown'].includes(opt.effect)) {
        score += 10 * (towers.mop + towers.ubik);
      }

      // ── Global damage multipliers ──
      if (['glassCannon', 'slowSteady', 'crossfire', 'markedForDeath', 'crowdSurfing']
            .includes(opt.effect)) {
        score += 18;
      }

      // ── Build-defining upgrades ──
      if (opt.buildDefining) score += 22;

      // ── Specific build-definers ──
      if (opt.effect === 'doubleShift') score += 15;
      if (opt.effect === 'devotion') score += 10;
      if (['rushDefense', 'attrition'].includes(opt.effect)) score += 8;

      // ── Skeleton Crew / Minimalist ──
      if (opt.effect === 'skeletonCrew' && totalTowers <= 6) score += 15;
      if (opt.effect === 'minimalist' && totalTowers <= 4) score += 20;

      // ── Synergies ──
      if (opt.effect && opt.effect.startsWith('synergy')) score += 12;

      // ── Conditional damage ──
      if (opt.effect === 'desperateMeasures') score += 8;
      if (opt.effect === 'contagion' && towers.wetfloor > 0) score += 14;
      if (opt.effect === 'sympatheticDmg') score += 12;
      if (opt.effect === 'dangerPay') score += 10;

      // ── HP / durability — buffed: tower survival matters ──
      if (['magnetHP', 'signHP', 'mopHP'].includes(opt.effect)) score += 6;

      // ── Static Charge (reworked — on-collect proc) ──
      if (opt.effect === 'staticChargeOnCollect') score += 5 + towers.coinmagnet * 3;

      // ── Strong legendaries ──
      if (['chainReaction', 'assemblyLine', 'lastStand'].includes(opt.effect)) score += 12;

      // ── Conditional legendaries — LOW base, HIGH scaling with investment ──
      // Without tower-type support these should score poorly (skip the legendary).
      // With 2-3 same-type upgrades, they become very attractive.
      if (opt.effect === 'nuclearMop' || opt.effect === 'pileup') {
        const mopCount = countUpgradesForTowerSim(upgrades, 'mop');
        score += mopCount >= 2 ? 8 + mopCount * 7 : -5 + mopCount * 5;
      }
      if (opt.effect === 'ubikFlood') {
        const ubikCount = countUpgradesForTowerSim(upgrades, 'ubik');
        score += ubikCount >= 2 ? 8 + ubikCount * 7 : -5 + ubikCount * 5;
      }
      if (opt.effect === 'goldenMagnet' || opt.effect === 'hoarder' || opt.effect === 'looseChange') {
        const magCount = countUpgradesForTowerSim(upgrades, 'coinmagnet');
        score += magCount >= 2 ? 8 + magCount * 7 : -5 + magCount * 5;
      }
      if (opt.effect === 'spillZone' || opt.effect === 'overtime') {
        const signCount = countUpgradesForTowerSim(upgrades, 'wetfloor');
        score += signCount >= 2 ? 8 + signCount * 7 : -5 + signCount * 5;
      }
      if (opt.effect === 'domino') {
        const potCount = countUpgradesForTowerSim(upgrades, 'potplant');
        score += potCount >= 2 ? 8 + potCount * 7 : -5 + potCount * 5;
      }

      // ── Chase Cards — high base score + big conditional bonus near threshold ──
      if (opt.chaseThreshold && opt.chaseTowerType) {
        const typeCount = countUpgradesForTowerSim(upgrades, opt.chaseTowerType);
        // Base: attractive if player is committed to the tower type
        score += 20;
        // Conditional: bonus scales with how close to threshold
        score += typeCount * 5;
        // Extra bonus if threshold already met or will be met (typeCount >= threshold - 1)
        if (typeCount >= opt.chaseThreshold - 1) score += 15;
      }

      // ── AoE legendaries ──
      if (opt.effect === 'bladderBurst') score += 10;

      // ── Door upgrades ──
      if (opt.effect === 'doorHPBoost') score += 8;
      if (opt.effect === 'plungerProtocol') score += 6;

      // ── Tower specialization bonus ──
      // When agent already has 2+ upgrades of a tower type, bias toward more of that type.
      // Creates focused builds that exercise the conditional scaling system.
      const types = UPGRADE_TOWER_MAP[opt.id];
      if (types) {
        for (const type of types) {
          const typeCount = countUpgradesForTowerSim(upgrades, type);
          if (typeCount >= 2) score += typeCount * 3;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }
}

module.exports = { HeuristicAgent };

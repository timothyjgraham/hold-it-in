/**
 * Upgrade tower-type mapping + conditional scaling helpers for AI simulation.
 * Mirrors js/systems/UpgradeManager.countUpgradesForTower() logic.
 */

const UPGRADE_TOWER_MAP = {
  C1: ['coinmagnet'], C2: ['coinmagnet'], C3: ['coinmagnet'], C20: ['coinmagnet'],
  C4: ['wetfloor'], C5: ['wetfloor'], C6: ['wetfloor'],
  C7: ['mop'], C8: ['mop'], C9: ['mop'], C10: ['mop'],
  C11: ['ubik'], C12: ['ubik'], C13: ['ubik'], C14: ['ubik'],
  C15: ['potplant'], C16: ['potplant'], C19: ['potplant'],
  R1: ['wetfloor', 'ubik'], R2: ['mop', 'wetfloor'], R3: ['coinmagnet', 'mop'],
  R4: ['ubik', 'potplant'], R5: ['coinmagnet'], R6: ['wetfloor'],
  R7: ['mop', 'ubik'], R8: ['coinmagnet', 'potplant'],
  R9: ['mop'], R10: ['potplant'], R11: ['ubik'], R12: ['coinmagnet'],
  R17: ['wetfloor'], R20: ['potplant'], R29: ['wetfloor'],
  L4: ['mop'], L5: ['potplant'], L6: ['wetfloor'], L7: ['coinmagnet'],
  L8: ['mop'], L9: ['ubik'], L10: ['coinmagnet'], L12: ['wetfloor'],
  L14: ['coinmagnet'],
  R33: ['mop'], R34: ['potplant'], R35: ['coinmagnet'],
};

/**
 * Count total stacks of upgrades associated with a tower type (for sim).
 * Cross-tower rares count for both types.
 * @param {object} upgrades - { upgradeId: stackCount }
 * @param {string} towerType - e.g. 'mop', 'ubik', 'coinmagnet', 'wetfloor', 'potplant'
 * @param {string} [excludeId] - upgrade id to exclude
 * @returns {number}
 */
function countUpgradesForTowerSim(upgrades, towerType, excludeId) {
  let count = 0;
  for (const [id, stacks] of Object.entries(upgrades)) {
    if (id === excludeId || !stacks) continue;
    const types = UPGRADE_TOWER_MAP[id];
    if (types && types.includes(towerType)) {
      count += stacks;
    }
  }
  return count;
}

/**
 * Conditional scaling multiplier for tower-type legendaries.
 * Makes legendaries weak without same-type support, strong with it.
 *
 * 0 supports: 0.3x  (nearly useless without investment)
 * 1 support:  0.6x
 * 2 supports: 0.9x  (roughly break-even)
 * 3 supports: 1.2x
 * 4+ supports: 1.5x (rewarding deep specialization)
 *
 * @param {object} upgrades - { upgradeId: stackCount }
 * @param {string} towerType - e.g. 'mop', 'ubik', 'coinmagnet', 'wetfloor', 'potplant'
 * @param {string} [excludeId] - upgrade id to exclude (the legendary itself)
 * @returns {number} scaling multiplier
 */
function conditionalScale(upgrades, towerType, excludeId) {
  const count = countUpgradesForTowerSim(upgrades, towerType, excludeId);
  return Math.min(1.5, 0.3 + count * 0.3);
}

module.exports = { UPGRADE_TOWER_MAP, countUpgradesForTowerSim, conditionalScale };

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

module.exports = { UPGRADE_TOWER_MAP, countUpgradesForTowerSim };

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HOLD IT IN — Upgrade Manager                                             ║
// ║  Runtime upgrade state: rolling, applying, querying.                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import {
    COMMON_UPGRADES,
    RARE_UPGRADES,
    LEGENDARY_UPGRADES,
    ALL_UPGRADES,
    UPGRADE_MAP,
    GENERAL_UPGRADES,
} from '../data/upgradeRegistry.js';

export class UpgradeManager {
    constructor() {
        this.reset();
    }

    reset() {
        // Map of upgrade id → stack count (0 = not owned)
        this._stacks = {};
        // Ordered list of acquired upgrade ids (for HUD display)
        this._acquired = [];
    }

    // ─── QUERY HELPERS ──────────────────────────────────────────────────────

    /** Does the player own at least one stack of this upgrade? */
    hasUpgrade(id) {
        return (this._stacks[id] || 0) > 0;
    }

    /** How many stacks of this upgrade does the player own? */
    getStacks(id) {
        return this._stacks[id] || 0;
    }

    /** Get ordered list of acquired upgrade ids */
    getAcquired() {
        return this._acquired;
    }

    /**
     * Get cumulative modifier for a stat.
     * Returns a multiplier or additive value depending on the stat.
     *
     * Stat keys (to be wired in Stages 5-7):
     *   magnetRange, coinValueMult, magnetHP,
     *   signHP, signSlowMult, signBashDamage,
     *   mopArc, mopCooldownMult, mopKnockbackMult, mopHP,
     *   ubikWidthMult, ubikRangeMult, ubikDamageMult, ubikCooldownMult,
     *   potReturnToOrigin, potContactDPS,
     *   towerCostMult, doorMaxHP, ...
     */
    getModifier(stat) {
        // Placeholder — will be populated in Stages 5-7 when effectFns are wired
        // For now returns neutral values (1.0 for multipliers, 0 for additives)
        switch (stat) {
            // Multiplicative stats (return 1.0 = no change)
            case 'coinValueMult':
                return 1.0 + this.getStacks('C2') * 0.5;      // +50% per stack
            case 'mopCooldownMult':
                return 1.0 - this.getStacks('C8') * 0.3;      // -30% per stack
            case 'mopKnockbackMult':
                return 1.0 + this.getStacks('C9') * 0.5;      // +50% per stack
            case 'ubikDamageMult':
                return 1.0 + this.getStacks('C13') * 0.4;     // +40% per stack
            case 'ubikCooldownMult':
                return 1.0 - this.getStacks('C14') * 0.25;    // -25% per stack
            case 'towerCostMult':
                return this.hasUpgrade('R14') ? 0.8 : 1.0;    // -20% from Clearance Sale

            // Additive stats (return 0 = no change)
            case 'magnetRange':
                return this.hasUpgrade('C1') ? 8 : 0;         // +8 units (doubles 8→16)
            case 'magnetHP':
                return this.getStacks('C3') * 4;               // +4 per stack
            case 'signHP':
                return this.getStacks('C4') * 1.0;             // +100% per stack (multiplicative on base)
            case 'signBashDamage':
                return this.getStacks('C6') * 5;               // +5 per stack
            case 'mopHP':
                return this.getStacks('C10') * 4;              // +4 per stack
            case 'potContactDPS':
                return this.getStacks('C16') * 3;              // +3 dps per stack
            case 'doorMaxHP':
                return this.hasUpgrade('L1') ? 4 : 0;         // +4 from Double Flush

            default:
                return 0;
        }
    }

    // ─── APPLY UPGRADE ──────────────────────────────────────────────────────

    applyUpgrade(id) {
        const upgrade = UPGRADE_MAP[id];
        if (!upgrade) {
            console.warn(`UpgradeManager: unknown upgrade id "${id}"`);
            return false;
        }

        const current = this._stacks[id] || 0;

        // Check if already maxed
        if (current >= upgrade.maxStacks) {
            console.warn(`UpgradeManager: "${id}" already at max stacks (${upgrade.maxStacks})`);
            return false;
        }

        this._stacks[id] = current + 1;
        if (current === 0) {
            this._acquired.push(id);
        }

        // effectFn will be called here in Stages 5-7
        // if (upgrade.effectFn) upgrade.effectFn(this, game);

        console.log(`Upgrade acquired: ${upgrade.name} (${id}) — stack ${this._stacks[id]}/${upgrade.maxStacks}`);
        return true;
    }

    // ─── ROLL UPGRADES ──────────────────────────────────────────────────────

    /**
     * Generate 3 upgrade options for a wave.
     * @param {number} wave - Current wave number
     * @param {string[]} ownedTowerTypes - Array of tower type keys currently placed
     * @returns {Object[]} Array of 3 upgrade data objects
     */
    rollUpgrades(wave, ownedTowerTypes) {
        const slots = this._getRaritySlots(wave);
        const result = [];
        const usedIds = new Set();

        // Build the pool of eligible upgrades per rarity
        const pools = {
            common:    this._getEligiblePool(COMMON_UPGRADES, ownedTowerTypes),
            rare:      this._getEligiblePool(RARE_UPGRADES, ownedTowerTypes),
            legendary: this._getEligiblePool(LEGENDARY_UPGRADES, ownedTowerTypes),
        };

        // Fill each slot
        for (let i = 0; i < 3; i++) {
            const rarity = slots[i];
            const pick = this._pickFromPool(pools[rarity], usedIds);
            if (pick) {
                result.push(pick);
                usedIds.add(pick.id);
            }
        }

        // Guarantee at least one general option
        const hasGeneral = result.some(u => u.towerRequirement === null);
        if (!hasGeneral && result.length === 3) {
            // Replace the last slot with a general upgrade
            const generalPool = this._getEligiblePool(GENERAL_UPGRADES, ownedTowerTypes);
            const generalPick = this._pickFromPool(generalPool, usedIds);
            if (generalPick) {
                usedIds.delete(result[2].id);
                result[2] = generalPick;
                usedIds.add(generalPick.id);
            }
        }

        // If we couldn't fill all 3 slots (very unlikely), pad with generals
        while (result.length < 3) {
            const allPool = this._getEligiblePool(ALL_UPGRADES, ownedTowerTypes);
            const pick = this._pickFromPool(allPool, usedIds);
            if (pick) {
                result.push(pick);
                usedIds.add(pick.id);
            } else {
                break; // Truly no upgrades available
            }
        }

        return result;
    }

    // ─── RARITY SLOT DISTRIBUTION ───────────────────────────────────────────

    /**
     * Determine rarity for each of the 3 slots based on wave number.
     * Returns array of 3 rarity strings.
     */
    _getRaritySlots(wave) {
        if (wave <= 5) {
            // Waves 1-5: 3 Common
            return ['common', 'common', 'common'];
        } else if (wave <= 10) {
            // Waves 6-10: guaranteed 2C + 1R, slot 3 rolls 70%C/30%R
            const slot3 = Math.random() < 0.3 ? 'rare' : 'common';
            return ['common', 'rare', slot3];
        } else if (wave <= 15) {
            // Waves 11-15: 1C + 1R guaranteed, slot 3: 50%C / 40%R / 10%L
            return ['common', 'rare', this._rollSlot(0.50, 0.40, 0.10)];
        } else {
            // Waves 16+: 1C + 1R guaranteed, slot 3: 40%C / 35%R / 25%L
            return ['common', 'rare', this._rollSlot(0.40, 0.35, 0.25)];
        }
    }

    _rollSlot(commonChance, rareChance, _legendaryChance) {
        const roll = Math.random();
        if (roll < commonChance) return 'common';
        if (roll < commonChance + rareChance) return 'rare';
        return 'legendary';
    }

    // ─── ELIGIBLE POOL FILTERING ────────────────────────────────────────────

    /**
     * Filter upgrades to only those the player can receive.
     * Excludes: already-maxed, tower requirements unmet, exclusive conflicts.
     */
    _getEligiblePool(upgrades, ownedTowerTypes) {
        const towerSet = new Set(ownedTowerTypes);

        return upgrades.filter(u => {
            // Already at max stacks?
            if ((this._stacks[u.id] || 0) >= u.maxStacks) return false;

            // Tower requirement check
            if (u.towerRequirement !== null) {
                for (const req of u.towerRequirement) {
                    if (!towerSet.has(req)) return false;
                }
            }

            // Exclusive check (e.g. C11 vs C12)
            if (u.exclusive && this.hasUpgrade(u.exclusive)) return false;

            return true;
        });
    }

    // ─── RANDOM PICK ────────────────────────────────────────────────────────

    /**
     * Pick a random upgrade from a pool, avoiding already-used ids in this roll.
     */
    _pickFromPool(pool, usedIds) {
        const available = pool.filter(u => !usedIds.has(u.id));
        if (available.length === 0) return null;
        return available[Math.floor(Math.random() * available.length)];
    }
}

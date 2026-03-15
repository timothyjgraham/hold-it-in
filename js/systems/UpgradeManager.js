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
        switch (stat) {
            // ─── Multiplicative stats (return 1.0 = no change) ───
            case 'coinValueMult':
                return 1.0 + this.getStacks('C2') * 0.5;      // C2: +50% per stack
            case 'signSlowMult':
                return this.hasUpgrade('C5') ? 0.2 : 0.4;     // C5: 20% speed (base 40%)
            case 'mopCooldownMult':
                return 1.0 - this.getStacks('C8') * 0.3;      // C8: -30% per stack
            case 'mopKnockbackMult':
                return 1.0 + this.getStacks('C9') * 0.5;      // C9: +50% per stack
            case 'ubikWidthMult':
                if (this.hasUpgrade('C11')) return 0.5;        // C11: Pressure Washer halves width
                if (this.hasUpgrade('C12')) return 1.6;        // C12: Wide Spray +60% width
                return 1.0;
            case 'ubikRangeMult':
                return this.hasUpgrade('C11') ? 2.0 : 1.0;    // C11: Pressure Washer doubles range
            case 'ubikDamageMult': {
                const base = this.hasUpgrade('C12') ? 0.7 : 1.0; // C12: Wide Spray -30% damage
                return base + this.getStacks('C13') * 0.4;    // C13: +40% per stack
            }
            case 'ubikCooldownMult':
                return 1.0 - this.getStacks('C14') * 0.25;    // C14: -25% per stack
            case 'towerCostMult':
                return this.hasUpgrade('R14') ? 0.8 : 1.0;    // R14: Clearance Sale -20%

            // ─── Additive stats (return 0 = no change) ───
            case 'magnetRange':
                return this.hasUpgrade('C1') ? 8 : 0;         // C1: +8 units (doubles 8→16)
            case 'magnetHP':
                return this.getStacks('C3') * 4;               // C3: +4 per stack
            case 'signHP':
                return this.getStacks('C4') * 1.0;             // C4: +100% per stack (mult on base)
            case 'signBashDamage':
                return this.getStacks('C6') * 5;               // C6: +5 per stack
            case 'mopMinArc':
                return this.hasUpgrade('C7') ? Math.PI : 1.05; // C7: 180° (base ~60°)
            case 'mopHP':
                return this.getStacks('C10') * 4;              // C10: +4 per stack
            case 'potContactDPS':
                return this.getStacks('C16') * 3;              // C16: +3 dps per stack
            case 'doorMaxHP':
                return this.hasUpgrade('L1') ? 4 : 0;         // L1: Double Flush +4

            // ─── Tradeoff upgrades ───
            case 'glassCannon':
                return this.hasUpgrade('C17') ? 1 : 0;        // C17: +80% dmg, -50% HP
            case 'glassCannonDamageMult':
                return this.hasUpgrade('C17') ? 1.8 : 1.0;
            case 'glassCannonHPMult':
                return this.hasUpgrade('C17') ? 0.5 : 1.0;
            case 'slowSteady':
                return this.hasUpgrade('C18') ? 1 : 0;        // C18: -40% speed, +60% dmg
            case 'slowSteadyDamageMult':
                return this.hasUpgrade('C18') ? 1.6 : 1.0;
            case 'slowSteadyCooldownMult':
                return this.hasUpgrade('C18') ? 1.4 : 1.0;    // 40% slower = 1.4× cooldown
            case 'bargainBinCost':
                return this.hasUpgrade('C19') ? 1 : 0;        // C19: Pot Plants cost 0, 1 HP
            case 'staticChargeDPS':
                return this.getStacks('C20') * 1;              // C20: +1 dps per stack
            case 'markedForDeathMult':
                return this.hasUpgrade('R17') ? 1.4 : 1.0;    // R17: slowed enemies +40% dmg
            case 'crowdSurfingMult':
                return this.hasUpgrade('R18') ? 1.3 : 1.0;    // R18: clustered enemies +30% dmg
            case 'overkillCoinRate':
                return this.hasUpgrade('R19') ? 5 : 0;        // R19: 1 coin per 5 overkill
            case 'aftershockDamage':
                return this.hasUpgrade('R20') ? 8 : 0;        // R20: 8 AoE on trip
            case 'specialistDamagePer':
                return this.hasUpgrade('R21') ? 0.15 : 0;     // R21: +15% per missing type
            case 'recyclerRefund':
                return this.hasUpgrade('R22') ? 1.0 : 0.5;    // R22: 100% refund (base 50%)
            case 'recyclerBuff':
                return this.hasUpgrade('R22') ? 0.1 : 0;      // R22: +10% dmg to adjacent
            case 'minimalistMult':
                return this.hasUpgrade('L13') ? 2.5 : 1.0;    // L13: 2.5× if ≤4 towers
            case 'minimalistThreshold':
                return this.hasUpgrade('L13') ? 4 : 0;        // L13: tower count cap
            case 'hoarderPer50':
                return this.hasUpgrade('L14') ? 0.12 : 0;     // L14: +12% per 50 coins
            case 'chainReactionRange':
                return this.hasUpgrade('L15') ? 12 : 0;       // L15: 12 unit trigger range
            case 'loanSharkBonus':
                return this.hasUpgrade('L16') ? 100 : 0;      // L16: instant 100 coins
            case 'loanSharkPenalty':
                return this.hasUpgrade('L16') ? 0.5 : 1.0;    // L16: wave bonus halved
            case 'assemblyLinePer':
                return this.hasUpgrade('L17') ? 0.2 : 0;      // L17: +20% per neighbor
            case 'lastStandMult':
                return this.hasUpgrade('L18') ? 3.0 : 1.0;    // L18: 3× dmg at 1 HP
            case 'lastStandSpeedMult':
                return this.hasUpgrade('L18') ? 1.5 : 1.0;    // L18: +50% attack speed

            // ─── Boolean-like stats ───
            case 'potReturnToOrigin':
                return this.hasUpgrade('C15') ? 1 : 0;        // C15: Spring-Loaded Pot

            // ─── Build-Defining Upgrades (R23-R32) ───

            // R23: Devotion — lock to 2 tower types, +60% dmg, -30% cost
            case 'devotionActive':
                return this.hasUpgrade('R23') ? 1 : 0;
            case 'devotionDamageMult':
                return this.hasUpgrade('R23') ? 1.6 : 1.0;
            case 'devotionCostMult':
                return this.hasUpgrade('R23') ? 0.7 : 1.0;

            // R24: Skeleton Crew — max 6 towers, +25% dmg per empty slot
            case 'skeletonCrewActive':
                return this.hasUpgrade('R24') ? 1 : 0;
            case 'skeletonCrewMaxTowers':
                return this.hasUpgrade('R24') ? 6 : 0;
            case 'skeletonCrewDamagePerSlot':
                return this.hasUpgrade('R24') ? 0.25 : 0;     // +25% per empty slot

            // R25: Compound Interest — 10% of coins as wave-end bonus
            case 'compoundInterestActive':
                return this.hasUpgrade('R25') ? 1 : 0;
            case 'compoundInterestRate':
                return this.hasUpgrade('R25') ? 0.10 : 0;
            case 'compoundInterestCap':
                return this.hasUpgrade('R25') ? 20 : 0;

            // R26: Controlled Demolition — sell = explode + permanent buff
            case 'controlledDemolitionActive':
                return this.hasUpgrade('R26') ? 1 : 0;
            case 'controlledDemolitionDamage':
                return this.hasUpgrade('R26') ? 20 : 0;
            case 'controlledDemolitionRadius':
                return this.hasUpgrade('R26') ? 5 : 0;
            case 'controlledDemolitionBuff':
                return this.hasUpgrade('R26') ? 0.08 : 0;     // +8% permanent per sell

            // R27: Double Shift — attack twice, 1 self-damage per attack
            case 'doubleShiftActive':
                return this.hasUpgrade('R27') ? 1 : 0;
            case 'doubleShiftSelfDamage':
                return this.hasUpgrade('R27') ? 1 : 0;

            // R28: Danger Pay — front rows +80%, back rows -20%
            case 'dangerPayActive':
                return this.hasUpgrade('R28') ? 1 : 0;
            case 'dangerPayFrontMult':
                return this.hasUpgrade('R28') ? 1.8 : 1.0;
            case 'dangerPayBackMult':
                return this.hasUpgrade('R28') ? 0.8 : 1.0;
            case 'dangerPayFrontRows':
                return this.hasUpgrade('R28') ? 3 : 0;        // first 3 rows from spawn

            // R29: Contagion — slow spreads to nearby enemies
            case 'contagionActive':
                return this.hasUpgrade('R29') ? 1 : 0;
            case 'contagionRadius':
                return this.hasUpgrade('R29') ? 4 : 0;
            case 'contagionEffectiveness':
                return this.hasUpgrade('R29') ? 0.5 : 0;      // 50% of original slow

            // R30: Sympathetic Damage — damage splashes 15% to nearby
            case 'sympatheticDamageActive':
                return this.hasUpgrade('R30') ? 1 : 0;
            case 'sympatheticDamageRadius':
                return this.hasUpgrade('R30') ? 4 : 0;
            case 'sympatheticDamagePct':
                return this.hasUpgrade('R30') ? 0.15 : 0;     // 15% splash

            // R31: Rush Defense — 3s burst, then -15% penalty
            case 'rushDefenseActive':
                return this.hasUpgrade('R31') ? 1 : 0;
            case 'rushDefenseBurstMult':
                return this.hasUpgrade('R31') ? 3.0 : 1.0;
            case 'rushDefenseBurstDuration':
                return this.hasUpgrade('R31') ? 3 : 0;        // 3 seconds
            case 'rushDefensePenaltyMult':
                return this.hasUpgrade('R31') ? 0.85 : 1.0;

            // R32: Attrition — +5%/sec while enemies alive, caps +80%
            case 'attritionActive':
                return this.hasUpgrade('R32') ? 1 : 0;
            case 'attritionPerSecond':
                return this.hasUpgrade('R32') ? 0.05 : 0;     // +5% per second
            case 'attritionCap':
                return this.hasUpgrade('R32') ? 0.80 : 0;     // max +80%

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

        // Enforce exclusive pairs
        if (upgrade.exclusive && this.hasUpgrade(upgrade.exclusive)) {
            console.warn(`UpgradeManager: "${id}" blocked by exclusive "${upgrade.exclusive}"`);
            return false;
        }

        this._stacks[id] = current + 1;
        if (current === 0) {
            this._acquired.push(id);
        }

        // effectFn will be called here in Stages 5-7
        // if (upgrade.effectFn) upgrade.effectFn(this, game);

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

        // Guarantee at least one tower-specific option if player owns towers
        if (ownedTowerTypes.length > 0 && result.length >= 2) {
            const towerSet = new Set(ownedTowerTypes);
            const hasTowerSpecific = result.some(u => u.towerRequirement !== null);
            if (!hasTowerSpecific) {
                // Find a tower-specific upgrade matching an owned tower
                const allTowerUpgrades = [...COMMON_UPGRADES, ...RARE_UPGRADES, ...LEGENDARY_UPGRADES].filter(u => {
                    if (u.towerRequirement === null) return false;
                    if ((this._stacks[u.id] || 0) >= u.maxStacks) return false;
                    if (u.exclusive && this.hasUpgrade(u.exclusive)) return false;
                    for (const req of u.towerRequirement) {
                        if (!towerSet.has(req)) return false;
                    }
                    return !usedIds.has(u.id);
                });
                if (allTowerUpgrades.length > 0) {
                    usedIds.delete(result[1].id);
                    const pick = allTowerUpgrades[Math.floor(Math.random() * allTowerUpgrades.length)];
                    result[1] = pick;
                    usedIds.add(pick.id);
                }
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
     * Every slot is independently rolled — any rarity can appear at any wave.
     * Legendary is always possible (Balatro-style lottery tension).
     * Rates shift toward rarer pulls as waves progress.
     */
    _getRaritySlots(wave) {
        // Base rates that shift with wave progression
        // Early: mostly common, small rare/legendary chance
        // Late: common still anchors, but rare/legendary become frequent
        let cRate, rRate, lRate;
        if (wave <= 3) {
            // Waves 1-3: heavy common, but legendary is possible
            cRate = 0.82; rRate = 0.15; lRate = 0.03;
        } else if (wave <= 7) {
            // Waves 4-7: rares become noticeable
            cRate = 0.65; rRate = 0.28; lRate = 0.07;
        } else if (wave <= 12) {
            // Waves 8-12: solid rare presence, legendary creeping up
            cRate = 0.50; rRate = 0.35; lRate = 0.15;
        } else if (wave <= 18) {
            // Waves 13-18: late-game ramp
            cRate = 0.38; rRate = 0.37; lRate = 0.25;
        } else {
            // Waves 19+: endgame — legendaries are common treats
            cRate = 0.30; rRate = 0.38; lRate = 0.32;
        }

        return [
            this._rollSlot(cRate, rRate, lRate),
            this._rollSlot(cRate, rRate, lRate),
            this._rollSlot(cRate, rRate, lRate),
        ];
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

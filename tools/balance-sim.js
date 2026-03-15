#!/usr/bin/env node
/**
 * Hold It In — Comprehensive Balance Simulation & Analysis Tool
 *
 * Standalone Node.js tool (no game dependencies) that models the complete
 * game economy, combat, upgrade system, and wave progression.
 *
 * Usage:
 *   node tools/balance-sim.js                           # Full analysis (all modules)
 *   node tools/balance-sim.js --module economy          # Economy curves only
 *   node tools/balance-sim.js --module dps              # DPS vs EHP analysis
 *   node tools/balance-sim.js --module monte-carlo      # Monte Carlo simulation
 *   node tools/balance-sim.js --module upgrades         # Upgrade balance analysis
 *   node tools/balance-sim.js --scenario office         # Specific scenario
 *   node tools/balance-sim.js --waves 50                # Simulate up to wave 50
 *   node tools/balance-sim.js --runs 10000              # Monte Carlo sample size
 *   node tools/balance-sim.js --csv                     # Output CSV data
 *   node tools/balance-sim.js --json                    # Output JSON data
 */

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SHARED IMPORTS — game data, formulas, wave generator                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { GAME } from './ai/shared/gameData.js';
import { enemyHP, enemySpeed, proceduralEnemyCount, spawnInterval, burstSize, waveBonus, desperateChance, coinDropValue } from './ai/shared/formulas.js';
import { generateWave } from './ai/shared/waveGenerator.js';


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  SPATIAL COMBAT MODEL                                                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Abstracts the grid to a "coverage zone" model:
// - Enemies traverse 66 units from spawn to toilet
// - Towers are placed in a "kill zone" in the middle section
// - Time-in-range = how long an enemy spends within tower coverage
// - DPS is applied over that time window

class CoverageModel {
  constructor() {
    this.towerPositions = []; // { type, z } — abstract Z positions of towers
  }

  /**
   * Place towers in abstract positions. Strategy determines layout.
   */
  layoutTowers(towers) {
    this.towerPositions = [];
    // Distribute towers across the field (z=12 to z=60, usable zone)
    const minZ = 15;
    const maxZ = 55;
    const allTowers = [];

    // Create a position for each tower
    for (const [type, count] of Object.entries(towers)) {
      for (let i = 0; i < count; i++) {
        allTowers.push(type);
      }
    }

    if (allTowers.length === 0) return;

    // Spread towers across the field
    const spacing = (maxZ - minZ) / Math.max(1, allTowers.length);
    for (let i = 0; i < allTowers.length; i++) {
      this.towerPositions.push({
        type: allTowers[i],
        z: minZ + i * spacing + spacing / 2,
      });
    }
  }

  /**
   * Estimate how many seconds an enemy spends within range of a tower.
   * Returns { timeInRange, effectiveHits } for each tower.
   */
  calculateExposure(enemySpeed, enemyType) {
    const def = GAME.enemies[enemyType];
    const exposures = [];

    for (const tower of this.towerPositions) {
      const tDef = GAME.towers[tower.type];
      if (!tDef) continue;

      if (tower.type === 'wetfloor') {
        // Barrier: enemy must bash through, time = hp / bashRate
        // Enemy bashes at ~1 hit/sec, each hit does 1 damage to sign
        // While adjacent, enemy is slowed
        const slowZone = tDef.slowZoneFront + tDef.slowZoneBack; // 4 units
        const timeInSlow = slowZone / (enemySpeed * tDef.slowFactor);
        exposures.push({ type: 'wetfloor', timeInRange: timeInSlow, slow: true });
      } else if (tower.type === 'ubik') {
        // Spray has 18-unit range, width 2 — long cone
        // Enemy moves through the cone
        const rangeZ = tDef.range;
        const timeInRange = rangeZ / enemySpeed;
        exposures.push({ type: 'ubik', timeInRange });
      } else if (tower.type === 'mop') {
        // Mop has 4.5 range — small radius
        const rangeZ = tDef.range * 2; // circular, enemy traverses diameter
        const timeInRange = rangeZ / enemySpeed;
        exposures.push({ type: 'mop', timeInRange });
      } else if (tower.type === 'potplant') {
        // Trip on contact — instant
        exposures.push({ type: 'potplant', timeInRange: 0, instant: true });
      } else if (tower.type === 'coinmagnet') {
        // No damage
        exposures.push({ type: 'coinmagnet', timeInRange: 0 });
      }
    }

    return exposures;
  }

  /**
   * Estimate total damage dealt to a single enemy as it traverses the field.
   * Accounts for tower types, enemy immunities, and coverage zones.
   */
  estimateDamageToEnemy(enemyType, wave, upgrades = {}, eventSpeedMult = 1.0) {
    const def = GAME.enemies[enemyType];
    const speed = enemySpeed(enemyType, wave, eventSpeedMult);
    const exposures = this.calculateExposure(speed, enemyType);

    let totalDamage = 0;
    let totalSlowTime = 0;

    for (const exp of exposures) {
      const tDef = GAME.towers[exp.type];
      if (!tDef) continue;

      if (exp.type === 'wetfloor') {
        if (def.slowImmune) continue; // Power walkers etc ignore slow
        if (def.barrierBust) continue; // Stumblers destroy barriers
        totalSlowTime += exp.timeInRange;
        // C6: Prickly Signs damage
        const signDmg = (upgrades.C6 || 0) * 8;
        if (signDmg > 0) totalDamage += signDmg; // per bash hit
      } else if (exp.type === 'ubik') {
        // DPS = damage / (cooldown + duration), applied over exposure time
        const baseDmg = tDef.damage;
        const dmgMult = 1 + (upgrades.C13 || 0) * 0.4;
        const cdMult = 1 - (upgrades.C14 || 0) * 0.25;
        const sprayResist = def.sprayResist || 1.0;
        const effectiveDamage = baseDmg * dmgMult * sprayResist;
        const cycleTime = tDef.cooldown * cdMult + tDef.sprayDuration;
        const dps = effectiveDamage / cycleTime;

        // Synergy: R1 Wet & Soapy (2x damage if enemy is slowed)
        const wetBonus = (upgrades.R1 && totalSlowTime > 0) ? 2.0 : 1.0;

        totalDamage += dps * exp.timeInRange * wetBonus;
      } else if (exp.type === 'mop') {
        // Damage per sweep + knockback (sends enemy backward, gaining more exposure)
        const baseDmg = tDef.damage;
        const cdMult = 1 - (upgrades.C8 || 0) * 0.3;
        const sweepCooldown = tDef.cooldown * cdMult;
        const hitsInRange = Math.max(1, Math.floor(exp.timeInRange / sweepCooldown));

        if (!def.knockbackImmune) {
          const knockback = tDef.knockback * (1 + (upgrades.C9 || 0) * 0.75);
          const nuclearMult = upgrades.L8 ? 4 : 1;
          // Knockback adds traversal time
          const addedDistance = knockback * nuclearMult * hitsInRange;
          const addedTime = addedDistance / speed;
          totalDamage += baseDmg * hitsInRange;
          // Additional hits from knockback re-exposure
          const bonusHits = Math.floor(addedTime / sweepCooldown);
          totalDamage += baseDmg * bonusHits;
          // L4: Pileup damage (10 per collision — estimate 30% hit another enemy)
          if (upgrades.L4) totalDamage += 10 * 0.3 * (hitsInRange + bonusHits);
        } else {
          totalDamage += baseDmg * hitsInRange;
        }

        // R7: Mop & Bucket (+8 damage through Ubik spray)
        if (upgrades.R7) totalDamage += 8 * hitsInRange;
      } else if (exp.type === 'potplant') {
        if (def.tripImmune) continue;
        if (def.canJumpTower || def.canJumpBarrier) continue; // jumpers skip over
        totalDamage += tDef.damage;
        // C16: Cactus Pot (5 dps per stack while adjacent)
        const cactusDPS = (upgrades.C16 || 0) * 5;
        totalDamage += cactusDPS * tDef.stunDuration;
      }
    }

    // L6: Spill Zone (3 dps for 5s from dead enemies — estimate 0.5 puddles per enemy)
    if (upgrades.L6) totalDamage += 3 * 5 * 0.5;

    // R16: Crossfire (40% bonus if hit by 2+ tower types)
    const towerTypesHitting = new Set(exposures.filter(e => e.type !== 'coinmagnet' && e.timeInRange > 0).map(e => e.type));
    if (upgrades.R16 && towerTypesHitting.size >= 2) totalDamage *= 1.4;

    // Slow adds more time in range for all towers (retroactive bonus)
    if (totalSlowTime > 0 && !def.slowImmune) {
      // Being slowed means ~2x time in range for towers behind the slow zone
      const slowBonus = 1 + 0.3 * Math.min(totalSlowTime, 5);
      totalDamage *= slowBonus;
    }

    return totalDamage;
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  TOWER AI — Simulates player purchasing decisions                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class TowerAI {
  constructor(strategy) {
    this.strategy = strategy;
    this.towers = { coinmagnet: 0, wetfloor: 0, mop: 0, ubik: 0, potplant: 0 };
    this.totalTowers = 0;
    this.maxSlots = 999; // no global cap
    this.costMult = 1.0; // R14 reduces this
  }

  towerCost(type) {
    return Math.ceil(GAME.towers[type].cost * this.costMult);
  }

  canBuy(type, coins, wave = 999) {
    return coins >= this.towerCost(type) && this.totalTowers < this.maxSlots &&
      GAME.towers[type].unlockWave <= wave;
  }

  buy(type) {
    this.towers[type]++;
    this.totalTowers++;
    return this.towerCost(type);
  }

  buyPhase(coins, wave) {
    let spent = 0;
    switch (this.strategy) {
      case 'aggressive': spent = this._aggressive(coins, wave); break;
      case 'balanced':   spent = this._balanced(coins, wave); break;
      case 'economy':    spent = this._economy(coins, wave); break;
      case 'defensive':  spent = this._defensive(coins, wave); break;
      case 'random':     spent = this._random(coins, wave); break;
      default:           spent = this._balanced(coins, wave); break;
    }
    return spent;
  }

  _aggressive(coins, wave) {
    let spent = 0;
    // Buy heaviest DPS first
    const priority = ['ubik', 'mop', 'wetfloor', 'potplant', 'coinmagnet'];
    // Buy as many as we can afford, keep 15 coins reserve
    for (const type of priority) {
      while (this.canBuy(type, coins - spent - 15, wave)) {
        spent += this.buy(type);
      }
    }
    return spent;
  }

  _balanced(coins, wave) {
    let spent = 0;
    // Wave 1: 1 magnet + 1 ubik (95 - 15 - 40 = 40 left)
    if (wave === 1) {
      if (this.canBuy('coinmagnet', coins - spent, wave)) spent += this.buy('coinmagnet');
      if (this.canBuy('ubik', coins - spent, wave)) spent += this.buy('ubik');
      return spent;
    }
    // Wave 3: add wet floor
    if (wave >= 3 && this.towers.wetfloor < 2 && this.canBuy('wetfloor', coins - spent, wave)) {
      spent += this.buy('wetfloor');
    }
    // Wave 5+: add mops
    if (wave >= 5 && this.canBuy('mop', coins - spent, wave)) {
      spent += this.buy('mop');
    }
    // Wave 7+: add pot plants
    if (wave >= 7 && this.towers.potplant < 3 && this.canBuy('potplant', coins - spent, wave)) {
      spent += this.buy('potplant');
    }
    // General: buy 1 combat tower per wave if affordable
    if (wave > 3) {
      const priority = ['ubik', 'mop', 'wetfloor'];
      for (const type of priority) {
        if (this.canBuy(type, coins - spent - 20, wave)) {
          spent += this.buy(type);
          break;
        }
      }
    }
    // Second magnet around wave 8
    if (wave >= 8 && this.towers.coinmagnet < 2 && this.canBuy('coinmagnet', coins - spent, wave)) {
      spent += this.buy('coinmagnet');
    }
    return spent;
  }

  _economy(coins, wave) {
    let spent = 0;
    // Rush magnets first (up to 3)
    if (this.towers.coinmagnet < 3 && this.canBuy('coinmagnet', coins - spent, wave)) {
      spent += this.buy('coinmagnet');
    }
    // Then cheap defenses
    if (wave >= 3 && this.canBuy('potplant', coins - spent, wave)) {
      spent += this.buy('potplant');
    }
    // Combat from wave 5+
    if (wave >= 5) {
      const priority = ['mop', 'ubik', 'wetfloor'];
      for (const type of priority) {
        if (this.canBuy(type, coins - spent, wave)) {
          spent += this.buy(type);
          break;
        }
      }
    }
    return spent;
  }

  _defensive(coins, wave) {
    let spent = 0;
    // Prioritize barriers and pot plants
    if (wave >= 1 && this.towers.potplant < 4 && this.canBuy('potplant', coins - spent, wave)) {
      spent += this.buy('potplant');
    }
    if (wave >= 3 && this.towers.wetfloor < 4 && this.canBuy('wetfloor', coins - spent, wave)) {
      spent += this.buy('wetfloor');
    }
    // Add mops for knockback
    if (wave >= 5 && this.canBuy('mop', coins - spent, wave)) {
      spent += this.buy('mop');
    }
    // Magnet eventually
    if (wave >= 6 && this.towers.coinmagnet < 1 && this.canBuy('coinmagnet', coins - spent, wave)) {
      spent += this.buy('coinmagnet');
    }
    return spent;
  }

  _random(coins, wave) {
    let spent = 0;
    // Random tower each wave
    const types = Object.keys(GAME.towers);
    const available = types.filter(t => GAME.towers[t].unlockWave <= wave);
    if (available.length === 0) return spent;
    // Buy 1-2 random towers
    const buys = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < buys; i++) {
      const type = available[Math.floor(Math.random() * available.length)];
      if (this.canBuy(type, coins - spent, wave)) {
        spent += this.buy(type);
      }
    }
    return spent;
  }

  totalValue() {
    let v = 0;
    for (const [type, count] of Object.entries(this.towers)) {
      v += GAME.towers[type].cost * count;
    }
    return v;
  }

  estimateDPS(upgrades = {}) {
    let dps = 0;
    const t = this.towers;

    // Global damage multipliers
    let globalDmgMult = 1.0;
    // C17: Glass Cannon (+80% damage, -50% HP)
    if (upgrades.C17) globalDmgMult *= 1.8;
    // C18: Slow and Steady (+60% damage per hit, -40% attack speed)
    const slowSteadySpeedMult = upgrades.C18 ? 0.6 : 1.0;
    if (upgrades.C18) globalDmgMult *= 1.6;
    // R21: Specialist (+15% per tower type NOT owned)
    if (upgrades.R21) {
      const typesOwned = Object.keys(t).filter(k => t[k] > 0).length;
      const typesNotOwned = 5 - typesOwned;
      globalDmgMult *= 1 + typesNotOwned * 0.15;
    }
    // R23: Devotion (+60% damage — estimate 60% of towers are the locked types)
    if (upgrades.R23) globalDmgMult *= 1 + 0.6 * 0.6;
    // R28: Danger Pay (front +50%, back -30% — estimate avg ~+10% across all towers)
    if (upgrades.R28) globalDmgMult *= 1.10;
    // R30: Sympathetic Damage (8% splash — estimate ~10% bonus from crowd hits)
    if (upgrades.R30) globalDmgMult *= 1.10;

    // R27: Double Shift (1.6x attack rate)
    const doubleShiftMult = upgrades.R27 ? 1.6 : 1.0;

    // Mop: damage / cooldown
    const mopCdMult = 1 - (upgrades.C8 || 0) * 0.3;
    dps += t.mop * (GAME.towers.mop.damage / (GAME.towers.mop.cooldown * mopCdMult)) * slowSteadySpeedMult * doubleShiftMult;

    // Ubik: damage * (spray_duration / cycle_time) — hits multiple enemies
    const ubikDmgMult = 1 + (upgrades.C13 || 0) * 0.4;
    const ubikCdMult = 1 - (upgrades.C14 || 0) * 0.25;
    const ubikCycle = GAME.towers.ubik.cooldown * ubikCdMult + GAME.towers.ubik.sprayDuration;
    const ubikDPS = (GAME.towers.ubik.damage * ubikDmgMult * GAME.towers.ubik.sprayDuration) / ubikCycle;
    // Ubik hits ~2-3 enemies per spray (AoE bonus)
    dps += t.ubik * ubikDPS * 2.0 * slowSteadySpeedMult * doubleShiftMult;

    // Pot plant: trip damage / (stun + re-approach time)
    dps += t.potplant * (GAME.towers.potplant.damage / 4) * doubleShiftMult;

    // Cactus Pot DPS
    dps += t.potplant * (upgrades.C16 || 0) * 5;

    // C20: Static Charge (1 dps per stack per magnet)
    dps += t.coinmagnet * (upgrades.C20 || 0) * 1;

    // Apply global damage multiplier
    dps *= globalDmgMult;

    // Soft cap on damage multiplier
    const SOFT_CAP = 3.0;
    const DIMINISH = 0.25;
    if (globalDmgMult > SOFT_CAP) {
      const cappedMult = SOFT_CAP + (globalDmgMult - SOFT_CAP) * DIMINISH;
      dps = dps / globalDmgMult * cappedMult;
    }

    // L13: Minimalist (2.0x if ≤4 towers)
    if (upgrades.L13 && this.totalTowers <= 4) dps *= 2.0;
    // R24: Skeleton Crew (+25% per empty slot, max 6)
    if (upgrades.R24) {
      const emptySlots = Math.max(0, 6 - this.totalTowers);
      dps *= 1 + emptySlots * 0.25;
    }

    return dps;
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  UPGRADE SIMULATOR                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

class UpgradeSimulator {
  constructor() {
    this.acquired = {}; // id -> stack count
  }

  /**
   * Roll 3 upgrade options per game rarity rules.
   */
  rollOptions(wave, ownedTowers) {
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

    const slots = this._raritySlots(wave);
    const options = [];

    for (const rarity of slots) {
      const candidates = pool.filter(u => u.rarity === rarity && !options.find(o => o.id === u.id));
      if (candidates.length > 0) {
        options.push(candidates[Math.floor(Math.random() * candidates.length)]);
      } else {
        // Fallback: any rarity
        const fallback = pool.filter(u => !options.find(o => o.id === u.id));
        if (fallback.length > 0) options.push(fallback[Math.floor(Math.random() * fallback.length)]);
      }
    }

    // Guarantee at least one general option
    const hasGeneral = options.some(o => o.tower === null);
    if (!hasGeneral && options.length === 3) {
      const generals = pool.filter(u => u.tower === null && !options.find(o => o.id === u.id));
      if (generals.length > 0) {
        options[2] = generals[Math.floor(Math.random() * generals.length)];
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
          options[1] = towerPool[Math.floor(Math.random() * towerPool.length)];
        }
      }
    }

    return options;
  }

  _raritySlots(wave) {
    // Match real game: independent per-slot rolls (UpgradeManager._getRaritySlots)
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
      const r = Math.random();
      if (r < cRate) return 'common';
      if (r < cRate + rRate) return 'rare';
      return 'legendary';
    };

    return [rollSlot(), rollSlot(), rollSlot()];
  }

  pick(upgrade) {
    this.acquired[upgrade.id] = (this.acquired[upgrade.id] || 0) + 1;
  }

  /**
   * Simple AI: pick the "best" upgrade based on a value heuristic.
   */
  pickBest(options, towers) {
    if (options.length === 0) return null;

    const totalTowers = Object.values(towers).reduce((a, b) => a + b, 0);

    // Score each option
    let best = options[0];
    let bestScore = -1;

    for (const opt of options) {
      let score = 0;
      // Rarity base score
      if (opt.rarity === 'legendary') score += 30;
      else if (opt.rarity === 'rare') score += 15;
      else score += 5;

      // Economy upgrades are valuable early
      if (['coinValueMult', 'payday', 'tipJar', 'towerCostMult', 'goldenMagnet', 'compoundInterest', 'loanShark'].includes(opt.effect)) score += 20;
      // R19 overkill bonus, R11 spray bonus — mild econ
      if (['overkillBonus', 'sprayBonus'].includes(opt.effect)) score += 10;

      // DPS upgrades scale with tower count
      if (['ubikDamage', 'ubikCooldown', 'mopCooldown'].includes(opt.effect)) {
        score += 10 * (towers.mop + towers.ubik);
      }

      // Global damage multipliers are strong
      if (['glassCannon', 'slowSteady', 'crossfire', 'markedForDeath', 'crowdSurfing'].includes(opt.effect)) score += 18;

      // Build-defining upgrades — very high value
      if (opt.buildDefining) score += 22;

      // Specific build-definers:
      // R27 Double Shift is extremely strong (2x DPS)
      if (opt.effect === 'doubleShift') score += 15;
      // R23 Devotion is strong with focused builds
      if (opt.effect === 'devotion') score += 10;
      // R31/R32 time-based are good
      if (['rushDefense', 'attrition'].includes(opt.effect)) score += 8;
      // R24 Skeleton Crew / L13 Minimalist — powerful with few towers
      if (opt.effect === 'skeletonCrew' && totalTowers <= 6) score += 15;
      if (opt.effect === 'minimalist' && totalTowers <= 4) score += 20;

      // Synergies are great if you have both towers
      if (opt.effect.startsWith('synergy')) score += 12;

      // Conditional damage boosts
      if (opt.effect === 'desperateMeasures') score += 8; // only useful at low HP
      if (opt.effect === 'contagion' && towers.wetfloor > 0) score += 14; // very strong with wet floors
      if (opt.effect === 'sympatheticDmg') score += 12; // strong in crowds
      if (opt.effect === 'dangerPay') score += 10; // position-dependent

      // HP/durability less valuable
      if (['magnetHP', 'signHP', 'mopHP'].includes(opt.effect)) score += 3;

      // Static Charge gives magnets DPS
      if (opt.effect === 'staticCharge') score += 5 + towers.coinmagnet * 3;

      // Chain Reaction, Assembly Line, Last Stand — strong legendaries
      if (['chainReaction', 'assemblyLine', 'lastStand'].includes(opt.effect)) score += 12;
      if (opt.effect === 'hoarder') score += 10;

      // Bladder Burst, Spill Zone, Ubik Flood — AoE legendaries
      if (['bladderBurst', 'spillZone', 'ubikFlood'].includes(opt.effect)) score += 10;

      // Door upgrades
      if (opt.effect === 'doorHPBoost') score += 8;
      if (opt.effect === 'plungerProtocol') score += 6;

      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }

    this.pick(best);
    return best;
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE 1: ECONOMY ANALYSIS                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function analyzeEconomy(maxWaves, scenario) {
  console.log('\n' + '='.repeat(100));
  console.log('  MODULE 1: ECONOMY CURVES');
  console.log('  Scenario: ' + scenario.toUpperCase());
  console.log('='.repeat(100));

  console.log('\n  Expected income per wave (coin drops from kills + wave bonus):');
  console.log('  Assumes 100% kill rate and 80% coin collection efficiency.\n');

  console.log(pad('Wave', 6) + pad('Enemies', 8) + pad('TotalHP', 9) + pad('KillCoins', 10) +
    pad('WaveBonus', 10) + pad('GrossInc', 9) + pad('NetInc80%', 10) +
    pad('CumIncome', 10) + pad('Event', 20));
  console.log('-'.repeat(100));

  let cumIncome = GAME.startingCoins;

  for (let wave = 1; wave <= maxWaves; wave++) {
    const waveData = generateWave(wave, scenario);
    const enemies = waveData.enemies;

    // Count and tally
    const typeCounts = {};
    for (const t of enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;

    let totalHP = 0;
    let killCoins = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      totalHP += enemyHP(type, wave) * count;
      killCoins += coinDropValue(type) * count;
    }

    const bonus = waveBonus(wave);
    const gross = killCoins + bonus;
    const net = Math.round(killCoins * 0.8) + bonus; // 80% collection
    cumIncome += net;

    const eventName = waveData.event ? waveData.event.name : '';

    console.log(
      pad(wave, 6) + pad(enemies.length, 8) + pad(totalHP, 9) + pad(killCoins, 10) +
      pad(bonus, 10) + pad(gross, 9) + pad(net, 10) + pad(cumIncome, 10) +
      '  ' + eventName
    );
  }

  // Tower affordability analysis
  console.log('\n\n  TOWER AFFORDABILITY — How many of each tower can cumulative income buy:');
  console.log(pad('Wave', 6));
  for (const [type, def] of Object.entries(GAME.towers)) {
    console.log = console.log; // no-op line to keep lint happy
  }

  let cum = GAME.startingCoins;
  console.log('\n' + pad('Wave', 6) + pad('CumInc', 8) + pad('Magnets', 8) + pad('Signs', 8) +
    pad('Mops', 8) + pad('Ubiks', 8) + pad('Plants', 8) + pad('Mixed*', 8));
  console.log('-'.repeat(62));

  for (let wave = 1; wave <= Math.min(maxWaves, 20); wave++) {
    const waveData = generateWave(wave, scenario);
    let killCoins = 0;
    const typeCounts = {};
    for (const t of waveData.enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;
    for (const [type, count] of Object.entries(typeCounts)) killCoins += coinDropValue(type) * count;
    const net = Math.round(killCoins * 0.8) + waveBonus(wave);
    cum += net;

    // * Mixed = balanced buy: 1 magnet + rest split between mop/ubik
    const afterMagnet = cum - 15;
    const mixed = 1 + Math.floor(Math.max(0, afterMagnet) / 35);

    console.log(
      pad(wave, 6) + pad(cum, 8) +
      pad(Math.floor(cum / 15), 8) + pad(Math.floor(cum / 20), 8) +
      pad(Math.floor(cum / 30), 8) + pad(Math.floor(cum / 40), 8) +
      pad(Math.floor(cum / 10), 8) + pad(mixed, 8)
    );
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE 2: DPS vs EHP ANALYSIS                                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function analyzeDPS(maxWaves, scenario) {
  console.log('\n' + '='.repeat(110));
  console.log('  MODULE 2: DPS vs ENEMY HP SCALING');
  console.log('  Scenario: ' + scenario.toUpperCase());
  console.log('='.repeat(110));

  console.log('\n  HP scaling per enemy type (polynomial: linear * 1.04^wave):\n');

  // Get scenario-relevant enemies
  const scenarioEnemies = Object.entries(GAME.enemies).filter(([, e]) => e.scenario === scenario);
  const typeNames = scenarioEnemies.map(([k]) => k);

  // Header
  let header = pad('Wave', 6);
  for (const [key, def] of scenarioEnemies) {
    header += pad(key.slice(0, 8), 9);
  }
  header += pad('AvgSpeed', 9);
  console.log(header);
  console.log('-'.repeat(110));

  for (let wave = 1; wave <= maxWaves; wave += wave < 10 ? 1 : 5) {
    let line = pad(wave, 6);
    let totalSpeed = 0;
    for (const [key] of scenarioEnemies) {
      line += pad(enemyHP(key, wave), 9);
      totalSpeed += enemySpeed(key, wave);
    }
    const avgSpeed = (totalSpeed / scenarioEnemies.length).toFixed(1);
    line += pad(avgSpeed, 9);
    console.log(line);
  }

  // DPS comparison for different tower setups
  console.log('\n\n  TOWER DPS OUTPUT — Different loadouts:\n');
  const loadouts = [
    { name: '1 Ubik', towers: { coinmagnet: 0, wetfloor: 0, mop: 0, ubik: 1, potplant: 0 } },
    { name: '2 Ubik + 1 Mop', towers: { coinmagnet: 0, wetfloor: 0, mop: 1, ubik: 2, potplant: 0 } },
    { name: 'Balanced (1M+1S+2U+2M+2P)', towers: { coinmagnet: 1, wetfloor: 1, mop: 2, ubik: 2, potplant: 2 } },
    { name: 'Heavy DPS (4U+3M)', towers: { coinmagnet: 0, wetfloor: 0, mop: 3, ubik: 4, potplant: 0 } },
    { name: 'Max towers (2M+3S+4U+4M+4P)', towers: { coinmagnet: 2, wetfloor: 3, mop: 4, ubik: 4, potplant: 4 } },
  ];

  header = pad('Wave', 6) + pad('WaveHP', 9);
  for (const l of loadouts) header += pad(l.name.slice(0, 14), 15);
  header += pad('Ratio*', 8);
  console.log(header);
  console.log('-'.repeat(110));

  for (let wave = 1; wave <= maxWaves; wave += wave < 10 ? 1 : 5) {
    const waveData = generateWave(wave, scenario);
    const typeCounts = {};
    for (const t of waveData.enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;
    let totalHP = 0;
    for (const [type, count] of Object.entries(typeCounts)) totalHP += enemyHP(type, wave) * count;

    let line = pad(wave, 6) + pad(totalHP, 9);
    let balancedDPS = 0;

    for (let i = 0; i < loadouts.length; i++) {
      const ai = new TowerAI('balanced');
      ai.towers = { ...loadouts[i].towers };
      ai.totalTowers = Object.values(ai.towers).reduce((a, b) => a + b, 0);
      const dps = ai.estimateDPS();

      // Total wave duration estimate
      const avgSpeed = 3.5 * (1 + wave * 0.02);
      const traverseTime = GAME.traverseDistance / avgSpeed;
      const totalKillCapacity = dps * (waveData.enemies.length * waveData.interval + traverseTime);
      const killPct = Math.min(100, Math.round(totalKillCapacity / totalHP * 100));
      line += pad(dps.toFixed(1) + '/' + killPct + '%', 15);

      if (i === 2) balancedDPS = dps; // "Balanced" loadout
    }

    // Ratio: balanced DPS relative to wave HP per second
    const avgSpeed = 3.5 * (1 + wave * 0.02);
    const waveTime = waveData.enemies.length * waveData.interval + GAME.traverseDistance / avgSpeed;
    const hpPerSec = totalHP / waveTime;
    const ratio = (balancedDPS / hpPerSec).toFixed(2);
    line += pad(ratio, 8);

    console.log(line);
  }

  console.log('\n  * Ratio = Balanced DPS / (Wave HP / Wave Duration). >1 = winning, <1 = losing');
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE 3: MONTE CARLO SIMULATION                                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function runMonteCarlo(numRuns, maxWaves, scenario) {
  console.log('\n' + '='.repeat(100));
  console.log('  MODULE 3: MONTE CARLO SIMULATION');
  console.log(`  ${numRuns} runs, up to wave ${maxWaves}, scenario: ${scenario.toUpperCase()}`);
  console.log('='.repeat(100));

  const strategies = ['aggressive', 'balanced', 'economy', 'defensive', 'random'];
  const allResults = {};

  for (const strategy of strategies) {
    const survivalWaves = [];
    const waveCoins = {};    // wave -> [coins...]
    const waveDoorHP = {};   // wave -> [doorHP...]
    const waveKillPct = {};  // wave -> [killPct...]
    const upgradePickCounts = {};
    let wins = 0;

    for (let run = 0; run < numRuns; run++) {
      let coins = GAME.startingCoins;
      let doorHP = GAME.doorMaxHP;
      let doorMaxHP = GAME.doorMaxHP;
      const towerAI = new TowerAI(strategy);
      const upgrader = new UpgradeSimulator();
      const coverage = new CoverageModel();
      let survived = 0;

      for (let wave = 1; wave <= maxWaves; wave++) {
        // Buy phase
        const spent = towerAI.buyPhase(coins, wave);
        coins -= spent;

        // Upgrade selection (after wave 1)
        if (wave > 1) {
          const options = upgrader.rollOptions(wave, towerAI.towers);
          const picked = upgrader.pickBest(options, towerAI.towers);
          if (picked) {
            upgradePickCounts[picked.id] = (upgradePickCounts[picked.id] || 0) + 1;
            if (picked.effect === 'towerCostMult') towerAI.costMult *= 0.8;
            if (picked.effect === 'doorHPBoost') { doorMaxHP += 4; doorHP = doorMaxHP; }
            if (picked.effect === 'loanShark') coins += 60;
            if (picked.effect === 'devotion') towerAI.costMult *= 0.7; // -30% for locked types (approximated globally)
            if (picked.effect === 'bargainBin') { /* modeled implicitly via cheaper pots */ }
            if (picked.effect === 'skeletonCrew') towerAI.maxSlots = 6;
          }
        }

        // Generate wave
        const waveData = generateWave(wave, scenario);
        const enemies = waveData.enemies;

        // Simulate combat using capacity-based model:
        // Total DPS output × wave duration vs total enemy HP
        const typeCounts = {};
        for (const t of enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;

        let totalHP = 0;
        let totalCoinsIfAllKilled = 0;
        let totalDoorDmgIfAllLeak = 0;
        const despChance_ = desperateChance(wave, waveData.eventDesperateChance);

        for (const [type, count] of Object.entries(typeCounts)) {
          for (let i = 0; i < count; i++) {
            let hp = enemyHP(type, wave);
            if (Math.random() < despChance_) hp = Math.round(hp * 0.75);
            totalHP += hp;
            totalCoinsIfAllKilled += coinDropValue(type);
            totalDoorDmgIfAllLeak += (GAME.enemies[type]?.doorDmg || 1);
          }
        }

        // Tower DPS output
        const dps = towerAI.estimateDPS(upgrader.acquired);

        // Wave timing: spawn duration + traverse time
        const avgSpeed = 3.5 * (1 + wave * 0.02) * (waveData.eventSpeedMult || 1.0);
        const traverseTime = GAME.traverseDistance / avgSpeed;
        const spawnDuration_ = enemies.length * waveData.interval;
        const waveDuration_ = spawnDuration_ + traverseTime;

        // Slow towers add effective time (enemies in range longer)
        let slowBonus = towerAI.towers.wetfloor > 0 ? 1.25 : 1.0;
        // R29: Contagion (slow spreads — ~30% more enemies slowed)
        if (upgrader.acquired.R29 && towerAI.towers.wetfloor > 0) slowBonus *= 1.15;
        // R17: Marked for Death (+40% damage from all sources to slowed enemies)
        const markedBonus = (upgrader.acquired.R17 && towerAI.towers.wetfloor > 0) ? 1.25 : 1.0; // ~60% of enemies slowed × 40% bonus
        // L12: Overtime (first 5s = 3x tower speed)
        const overtimeBonus = upgrader.acquired.L12 ? (1 + 2.0 * Math.min(5, waveDuration_) / waveDuration_) : 1.0;
        // L2: Desperate Measures (2x damage below 50% door HP)
        const desperateBonus = (upgrader.acquired.L2 && doorHP < doorMaxHP * 0.5) ? 2.0 : 1.0;
        // R16: Crossfire bonus (estimate 30% of enemies hit by 2+ types)
        const crossfireBonus = upgrader.acquired.R16 ? 1.12 : 1.0;
        // R18: Crowd Surfing (+30% when 2+ enemies nearby — estimate ~40% of enemies in crowds)
        const crowdBonus = upgrader.acquired.R18 ? 1.12 : 1.0;
        // R31: Rush Defense (2.5x first 3s, then -25% — net effect depends on wave duration)
        const rushBonus = upgrader.acquired.R31 ? (1 + (2.5 * Math.min(3, waveDuration_) - 0.25 * Math.max(0, waveDuration_ - 3)) / waveDuration_) : 1.0;
        // R32: Attrition (+5%/sec cap 80% — average ~40% over a typical wave)
        const attritionBonus = upgrader.acquired.R32 ? 1.40 : 1.0;
        // L14: Hoarder (+12% per 50 unspent coins, cap +100%)
        const hoarderBonus = upgrader.acquired.L14 ? (1 + Math.min(Math.floor(coins / 50) * 0.12, 1.0)) : 1.0;
        // L17: Assembly Line (+20% per adjacent tower in line — estimate avg 1.5 adjacents)
        const assemblyBonus = upgrader.acquired.L17 ? 1.30 : 1.0;
        // L18: Last Stand (3x at 1HP — estimate ~10% of towers are at 1HP on average)
        const lastStandBonus = upgrader.acquired.L18 ? 1.20 : 1.0;
        // L11: Bladder Burst (25% max HP splash on death — estimate 15% bonus damage from chains)
        const burstBonus = upgrader.acquired.L11 ? 1.15 : 1.0;
        // L9: Ubik Flood (lingering damage zones, 2 dps × 8s — estimate per ubik)
        const floodBonus = (upgrader.acquired.L9 && towerAI.towers.ubik > 0) ? 1.15 : 1.0;
        // L15: Chain Reaction (nearest tower fires on kill — estimate +20% bonus DPS)
        const chainReactionBonus = upgrader.acquired.L15 ? 1.20 : 1.0;
        // L3: Plunger Protocol (door hit → 3x speed for 3s — only kicks in when leaking)
        const plungerBonus = (upgrader.acquired.L3 && doorHP < doorMaxHP) ? 1.10 : 1.0;

        const effectiveDPS = dps * slowBonus * markedBonus * overtimeBonus * desperateBonus *
          crossfireBonus * crowdBonus * rushBonus * attritionBonus * hoarderBonus *
          assemblyBonus * lastStandBonus * burstBonus * floodBonus * chainReactionBonus * plungerBonus;
        const totalDamageCapacity = effectiveDPS * waveDuration_;

        // R27 Double Shift: towers take self-damage, may lose towers over time
        // Estimate: each attacking tower fires ~once/1.2s, so ~waveDuration/1.2 self-hits
        // With avg 6 HP, tower dies after 6 attacks (~7.2s). Reduce effective DPS by ~15% late
        if (upgrader.acquired.R27 && waveDuration_ > 8) {
          // Approximate tower attrition: lose ~30% of attack power over long waves
          const attritionPenalty = Math.max(0.7, 1 - (waveDuration_ - 8) * 0.02);
          // Already factored into DPS via doubleShiftMult, but apply attrition
          // (This is a rough model — towers die and stop contributing)
        }

        // Kill ratio with some variance
        const variance = 0.85 + Math.random() * 0.3; // 85%-115% random efficiency
        const killRatio = Math.min(1.0, (totalDamageCapacity * variance) / totalHP);

        // Calculate outcomes
        const totalCoins = Math.round(totalCoinsIfAllKilled * killRatio);
        const doorDamage = Math.round(totalDoorDmgIfAllLeak * (1 - killRatio));

        const killPct = Math.round(killRatio * 100);

        // Coin collection (30% base + 25% per magnet, cap 100%)
        const collectionRate = Math.min(1.0, 0.3 + towerAI.towers.coinmagnet * 0.25);
        const coinValueMult = 1 + (upgrader.acquired.C2 || 0) * 0.5;
        let collected = Math.round(totalCoins * collectionRate * coinValueMult);

        // R13: Tip Jar (15% chance 3x coin per kill)
        if (upgrader.acquired.R13) {
          const killed = Math.round(enemies.length * killRatio);
          const goldenCoins = Math.round(killed * 0.15 * 3);
          collected += goldenCoins;
        }
        // R12: Payday (1.5x coins near magnets — estimate 50% of kills near magnets)
        if (upgrader.acquired.R12 && towerAI.towers.coinmagnet > 0) {
          collected = Math.round(collected * (1 + 0.5 * 0.5));
        }
        // R19: Overkill Bonus (1 coin per 5 overkill damage — estimate ~3 coins per kill)
        if (upgrader.acquired.R19) {
          const killed = Math.round(enemies.length * killRatio);
          collected += Math.round(killed * 0.6); // ~3 overkill per 5 kills
        }
        // R11: Spray & Pray (5 coins when ubik hits 5+ — estimate ~2 procs per wave per ubik)
        if (upgrader.acquired.R11 && towerAI.towers.ubik > 0) {
          collected += towerAI.towers.ubik * 2 * 5;
        }
        // L10: Golden Magnet (1 coin/4s per magnet)
        if (upgrader.acquired.L10) {
          collected += Math.round(towerAI.towers.coinmagnet * waveDuration_ / 4);
        }
        // R5: Coin Shrapnel (15% of coins bonk for 5 dmg — already modeled as econ here)
        // L7: Loose Change (uncollected coins trip — hard to model, skip direct econ)

        let waveBonusCoins = waveBonus(wave);
        // L16: Loan Shark (halved wave bonuses)
        if (upgrader.acquired.L16) waveBonusCoins = Math.round(waveBonusCoins / 2);

        coins += collected + waveBonusCoins;

        // R25: Compound Interest (5% of coins as bonus, uncapped)
        if (upgrader.acquired.R25) {
          coins += Math.floor(coins * 0.05);
        }
        doorHP -= doorDamage;

        // Track stats
        if (!waveCoins[wave]) { waveCoins[wave] = []; waveDoorHP[wave] = []; waveKillPct[wave] = []; }
        waveCoins[wave].push(coins);
        waveDoorHP[wave].push(doorHP);
        waveKillPct[wave].push(killPct);

        if (doorHP <= 0) {
          survived = wave;
          break;
        }
        survived = wave;
      }

      survivalWaves.push(survived);
      if (survived >= maxWaves) wins++;
    }

    allResults[strategy] = { survivalWaves, waveCoins, waveDoorHP, waveKillPct, upgradePickCounts, wins };
  }

  // ── Print results ──

  // Survival distribution
  console.log('\n  SURVIVAL DISTRIBUTION:\n');
  console.log(pad('Strategy', 12) + pad('Median', 8) + pad('Mean', 8) + pad('Min', 6) + pad('Max', 6) +
    pad('StdDev', 8) + pad('Win%', 7) + pad('P10', 6) + pad('P25', 6) + pad('P75', 6) + pad('P90', 6));
  console.log('-'.repeat(85));

  for (const strategy of strategies) {
    const waves = allResults[strategy].survivalWaves.sort((a, b) => a - b);
    const n = waves.length;
    const mean = (waves.reduce((a, b) => a + b, 0) / n).toFixed(1);
    const median = waves[Math.floor(n / 2)];
    const min = waves[0];
    const max = waves[n - 1];
    const stddev = Math.sqrt(waves.reduce((s, w) => s + Math.pow(w - parseFloat(mean), 2), 0) / n).toFixed(1);
    const winPct = (allResults[strategy].wins / n * 100).toFixed(1);
    const p10 = waves[Math.floor(n * 0.1)];
    const p25 = waves[Math.floor(n * 0.25)];
    const p75 = waves[Math.floor(n * 0.75)];
    const p90 = waves[Math.floor(n * 0.9)];

    console.log(
      pad(strategy, 12) + pad(median, 8) + pad(mean, 8) + pad(min, 6) + pad(max, 6) +
      pad(stddev, 8) + pad(winPct + '%', 7) + pad(p10, 6) + pad(p25, 6) + pad(p75, 6) + pad(p90, 6)
    );
  }

  // Wave-by-wave stats (balanced strategy)
  console.log('\n\n  WAVE-BY-WAVE STATS (Balanced Strategy):\n');
  console.log(pad('Wave', 6) + pad('Kill%', 8) + pad('AvgCoins', 9) + pad('AvgDoorHP', 10) +
    pad('Kill%P10', 9) + pad('Kill%P90', 9) + pad('CoinsP10', 9) + pad('CoinsP90', 9) + pad('Event', 20));
  console.log('-'.repeat(100));

  const balanced = allResults.balanced;
  const events = GAME.waveEvents[scenario] || {};

  for (let wave = 1; wave <= maxWaves; wave++) {
    const kills = balanced.waveKillPct[wave];
    const coins = balanced.waveCoins[wave];
    const doors = balanced.waveDoorHP[wave];
    if (!kills || kills.length === 0) continue;

    const sortedKills = [...kills].sort((a, b) => a - b);
    const sortedCoins = [...coins].sort((a, b) => a - b);

    const avgKill = (kills.reduce((a, b) => a + b, 0) / kills.length).toFixed(0);
    const avgCoins = (coins.reduce((a, b) => a + b, 0) / coins.length).toFixed(0);
    const avgDoor = (doors.reduce((a, b) => a + b, 0) / doors.length).toFixed(0);
    const killP10 = sortedKills[Math.floor(kills.length * 0.1)];
    const killP90 = sortedKills[Math.floor(kills.length * 0.9)];
    const coinsP10 = sortedCoins[Math.floor(coins.length * 0.1)];
    const coinsP90 = sortedCoins[Math.floor(coins.length * 0.9)];
    const eventName = events[wave]?.name || '';

    console.log(
      pad(wave, 6) + pad(avgKill + '%', 8) + pad(avgCoins, 9) + pad(avgDoor, 10) +
      pad(killP10 + '%', 9) + pad(killP90 + '%', 9) + pad(coinsP10, 9) + pad(coinsP90, 9) +
      '  ' + eventName
    );
  }

  // Upgrade pick rates
  console.log('\n\n  UPGRADE PICK RATES (all strategies combined):\n');
  const totalPicks = {};
  for (const strategy of strategies) {
    for (const [id, count] of Object.entries(allResults[strategy].upgradePickCounts)) {
      totalPicks[id] = (totalPicks[id] || 0) + count;
    }
  }

  const sorted = Object.entries(totalPicks).sort((a, b) => b[1] - a[1]);
  const totalAllPicks = sorted.reduce((s, [, c]) => s + c, 0);

  console.log(pad('Rank', 5) + pad('ID', 5) + pad('Name', 22) + pad('Rarity', 10) +
    pad('Picks', 7) + pad('PickRate', 9) + pad('Bar', 30));
  console.log('-'.repeat(88));

  for (let i = 0; i < sorted.length; i++) {
    const [id, count] = sorted[i];
    const upgrade = GAME.upgrades.find(u => u.id === id);
    if (!upgrade) continue;
    const rate = (count / totalAllPicks * 100).toFixed(1);
    const barLen = Math.round(count / sorted[0][1] * 25);
    const bar = '#'.repeat(barLen);

    console.log(
      pad(i + 1, 5) + pad(id, 5) + pad(upgrade.name.slice(0, 20), 22) +
      pad(upgrade.rarity, 10) + pad(count, 7) + pad(rate + '%', 9) + '  ' + bar
    );
  }

  return allResults;
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE 4: UPGRADE BALANCE ANALYSIS                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function analyzeUpgrades() {
  console.log('\n' + '='.repeat(100));
  console.log('  MODULE 4: UPGRADE BALANCE ANALYSIS');
  console.log('='.repeat(100));

  // Rarity distribution probabilities
  console.log('\n  RARITY DISTRIBUTION BY WAVE BRACKET (per-slot independent rolls):\n');
  console.log('  Waves 1-5:   90% Common / 10% Rare / 0% Legendary');
  console.log('  Waves 6-9:   70% Common / 27% Rare / 3% Legendary');
  console.log('  Waves 10-14: 50% Common / 35% Rare / 15% Legendary');
  console.log('  Waves 15-19: 38% Common / 37% Rare / 25% Legendary');
  console.log('  Waves 20+:   30% Common / 38% Rare / 32% Legendary');

  // Expected legendary by wave
  console.log('\n\n  EXPECTED LEGENDARY UPGRADES BY WAVE:\n');
  let cumLegendaryChance = 0;
  for (let wave = 1; wave <= 50; wave++) {
    // 3 independent rolls per wave — P(at least one legendary) = 1 - (1-lRate)^3
    let lRate;
    if (wave <= 5) lRate = 0.00;
    else if (wave <= 9) lRate = 0.03;
    else if (wave <= 14) lRate = 0.15;
    else if (wave <= 19) lRate = 0.25;
    else lRate = 0.32;

    const legendaryProb = 1 - Math.pow(1 - lRate, 3);
    cumLegendaryChance += legendaryProb;

    if (wave % 5 === 0 || wave <= 15) {
      console.log(`  Wave ${pad(wave, 2)}: ${(legendaryProb * 100).toFixed(0)}% any-leg/wave (${(lRate * 100).toFixed(0)}%/slot), expected legendaries by now: ${cumLegendaryChance.toFixed(1)}`);
    }
  }

  // Upgrade pool analysis
  console.log('\n\n  UPGRADE POOL SIZE BY TOWER OWNERSHIP:\n');
  const towerCombos = [
    { name: 'No towers', towers: {} },
    { name: 'Ubik only', towers: { ubik: 1 } },
    { name: 'Ubik+Magnet', towers: { ubik: 1, coinmagnet: 1 } },
    { name: 'All 5 types', towers: { coinmagnet: 1, wetfloor: 1, mop: 1, ubik: 1, potplant: 1 } },
  ];

  console.log(pad('Tower Setup', 20) + pad('Common', 8) + pad('Rare', 8) + pad('Legend', 8) + pad('Total', 8) + pad('General', 8));
  console.log('-'.repeat(60));

  for (const combo of towerCombos) {
    const available = GAME.upgrades.filter(u => {
      if (u.tower === null) return true;
      const required = Array.isArray(u.tower) ? u.tower : [u.tower];
      return required.some(t => combo.towers[t] > 0);
    });
    const common = available.filter(u => u.rarity === 'common').length;
    const rare = available.filter(u => u.rarity === 'rare').length;
    const legendary = available.filter(u => u.rarity === 'legendary').length;
    const general = available.filter(u => u.tower === null).length;

    console.log(
      pad(combo.name, 20) + pad(common, 8) + pad(rare, 8) + pad(legendary, 8) +
      pad(available.length, 8) + pad(general, 8)
    );
  }

  // Synergy clusters
  console.log('\n\n  SYNERGY CLUSTERS — Upgrade combinations that compound:\n');
  const synergies = [
    { name: 'Wet Floor + Ubik (R1 + C5 + R17 + R29)', desc: 'Slowed enemies take 2x Ubik (R1) + 40% from all (R17). Contagion (R29) spreads slow to crowds. Stack with C13.' },
    { name: 'Mop + Knockback (C9 + L8 + L4)', desc: 'Heavy Mop + Nuclear Mop + Rush Hour Pileup = massive knockback + collision damage.' },
    { name: 'Economy Engine (C2 + R12 + R13 + R25 + L10)', desc: 'Double Dip + Payday + Tip Jar + Compound Interest + Golden Magnet = exponential coin scaling.' },
    { name: 'Pot Plant Chaos (C15 + C16 + R10 + L5)', desc: 'Spring-Loaded + Cactus + Chain Trip + Domino = self-sustaining trip chain.' },
    { name: 'Tower Spam (R14 + Economy Engine)', desc: 'Clearance Sale + income = tower count snowball.' },
    { name: 'Defensive (L1 + L2 + L3)', desc: 'Double Flush + Desperate Measures + Plunger Protocol = door becomes a weapon.' },
    { name: 'Minimalist/Skeleton (R24 or L13 + R23)', desc: 'Few powerful towers. Devotion locks 2 types for +60%/−30% cost. Skeleton Crew or Minimalist amplifies.' },
    { name: 'Double Shift Burn (R27 + C17 + L18)', desc: '2x attacks + Glass Cannon (+80% dmg, -50% HP) + Last Stand (3x at 1HP). Self-damage accelerates into Last Stand.' },
    { name: 'Crowd Multiplier (R18 + R30 + L11)', desc: 'Crowd Surfing (+30% in groups) + Sympathetic Dmg (15% splash) + Bladder Burst (chain explosions). Dense waves melt.' },
    { name: 'Time Control (R31 or R32 + L12)', desc: 'Rush Defense (3x burst start) OR Attrition (ramping DPS) + Overtime (3x speed first 5s). Massive early or sustained DPS.' },
    { name: 'Demolition Economy (R26 + R22)', desc: 'Controlled Demolition (sell = 20 blast + +8% permanent) + Recycler (100% refund + +10% adj). Sell-and-rebuild loop.' },
    { name: 'Danger Pay Front Line (R28 + R27 + C17)', desc: 'Front towers at +80% + Double Shift 2x + Glass Cannon +80%. Fragile front-line murder zone.' },
  ];

  for (const syn of synergies) {
    console.log(`  ${syn.name}`);
    console.log(`    ${syn.desc}\n`);
  }

  // Power budget per rarity
  console.log('\n  ESTIMATED POWER BUDGET PER UPGRADE (DPS equivalent):\n');
  console.log(pad('ID', 5) + pad('Name', 22) + pad('Rarity', 10) + pad('DPS-Equiv*', 11) + pad('Notes', 40));
  console.log('-'.repeat(88));

  const powerEstimates = [
    // Common
    { id: 'C7', dps: 3.3, note: '180 arc = 3x enemies hit per sweep' },
    { id: 'C8', dps: 2.8, note: '-30% cooldown = +43% DPS per mop (per stack)' },
    { id: 'C13', dps: 2.7, note: '+40% Ubik damage (per stack)' },
    { id: 'C14', dps: 2.1, note: '-25% Ubik cooldown (per stack)' },
    { id: 'C17', dps: 5.0, note: '+80% ALL tower damage (but -50% tower HP — tradeoff)' },
    { id: 'C18', dps: 2.0, note: '+60% dmg per hit, -40% attack speed (net +~0% DPS, better burst)' },
    { id: 'C5', dps: 1.5, note: 'Deeper slow = more time in range for all towers' },
    { id: 'C16', dps: 5.0, note: '5 DPS per stack, passive, stacks to 15' },
    { id: 'C20', dps: 1.0, note: '1 DPS per stack per magnet (stacks to 3)' },
    { id: 'C2', dps: 0, note: 'Economy: +50% coin value' },
    // Rare — Synergies
    { id: 'R1', dps: 6.7, note: '2x Ubik damage to slowed targets — HUGE' },
    { id: 'R7', dps: 4.0, note: '+8 damage per mop sweep through Ubik' },
    { id: 'R16', dps: 5.0, note: '40% bonus when hit by 2+ types — universal amplifier' },
    { id: 'R17', dps: 5.5, note: '+40% from ALL sources to slowed — universal when paired with wet floors' },
    { id: 'R18', dps: 3.5, note: '+30% to crowded enemies — wave-dependent but often applies' },
    // Rare — Build-Defining
    { id: 'R23', dps: 5.0, note: 'Devotion: +60% dmg + -30% cost for 2 tower types — STRONG focused builds' },
    { id: 'R24', dps: 4.0, note: 'Skeleton Crew: +25% per empty slot (max 6 towers) — synergy with minimalist play' },
    { id: 'R27', dps: 5.0, note: '1.6x attack rate but 2 self-dmg — still strong, less OP' },
    { id: 'R28', dps: 2.5, note: 'front +50%, back -30% — ~+10% avg' },
    { id: 'R29', dps: 3.0, note: 'Contagion: slow spreads — massive with R17 Marked for Death combo' },
    { id: 'R30', dps: 2.5, note: '8% splash — scales with dense waves' },
    { id: 'R31', dps: 2.5, note: '2.5x first 3s then -25%' },
    { id: 'R32', dps: 4.0, note: 'Attrition: +5%/sec cap 80% — sustained DPS ramp, great for long waves' },
    { id: 'R25', dps: 0, note: '8% coins/wave (cap 12)' },
    { id: 'R26', dps: 2.0, note: 'Controlled Demo: 20 blast + permanent +8% — sell/rebuild loops' },
    // Rare — Economy
    { id: 'R12', dps: 0, note: 'Economy: +50% coins near magnets' },
    { id: 'R14', dps: 0, note: 'Economy: -20% tower costs' },
    { id: 'R21', dps: 2.5, note: 'Specialist: +15% per missing type — anti-synergy with diverse builds' },
    // Legendary
    { id: 'L2', dps: 8.0, note: '2x ALL tower damage below 50% door HP — clutch savior' },
    { id: 'L8', dps: 7.0, note: '4x knockback = massive time gained + wall collision damage' },
    { id: 'L12', dps: 6.0, note: '3x tower speed + 0.5x enemy speed for 5s = huge opening burst' },
    { id: 'L13', dps: 5.0, note: '2.0x damage with ≤4 towers' },
    { id: 'L11', dps: 5.0, note: 'Bladder Burst: 25% max HP splash + chains — devastating in crowds' },
    { id: 'L15', dps: 4.0, note: 'Chain Reaction: tower fires on kill — ~+20% DPS with clusters' },
    { id: 'L17', dps: 3.5, note: 'Assembly Line: +20% per adjacent in line — layout-dependent' },
    { id: 'L18', dps: 3.0, note: 'Last Stand: 3x at 1HP — niche but incredible with R27 Double Shift' },
    { id: 'L14', dps: 0, note: 'Economy: +12% per 50 unspent coins — rewards hoarding' },
    { id: 'L16', dps: 0, note: '+60 coins now, halved wave bonuses' },
  ];

  for (const est of powerEstimates) {
    const u = GAME.upgrades.find(up => up.id === est.id);
    if (!u) continue;
    console.log(
      pad(est.id, 5) + pad(u.name.slice(0, 20), 22) + pad(u.rarity, 10) +
      pad(est.dps > 0 ? est.dps.toFixed(1) : 'econ', 11) + '  ' + est.note
    );
  }

  console.log('\n  * DPS-Equiv estimates assume balanced loadout (2 Ubik + 2 Mop + 2 Sign + 2 Plant + 1 Magnet)');
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE 5: SCENARIO COMPARISON                                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function compareScenarios(maxWaves) {
  console.log('\n' + '='.repeat(100));
  console.log('  MODULE 5: SCENARIO DIFFICULTY COMPARISON');
  console.log('='.repeat(100));

  const scenarios = ['office', 'forest', 'ocean', 'airplane'];

  console.log('\n  AGGREGATE EHP PER WAVE (total enemy HP across all enemies in the wave):\n');

  let header = pad('Wave', 6);
  for (const s of scenarios) header += pad(s.slice(0, 8), 12);
  header += pad('Hardest', 10);
  console.log(header);
  console.log('-'.repeat(60));

  for (let wave = 1; wave <= maxWaves; wave += wave < 10 ? 1 : 5) {
    let line = pad(wave, 6);
    let maxHP = 0;
    let hardest = '';

    for (const s of scenarios) {
      const waveData = generateWave(wave, s);
      const typeCounts = {};
      for (const t of waveData.enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;
      let totalHP = 0;
      for (const [type, count] of Object.entries(typeCounts)) totalHP += enemyHP(type, wave) * count;

      line += pad(totalHP, 12);
      if (totalHP > maxHP) { maxHP = totalHP; hardest = s; }
    }
    line += pad(hardest, 10);
    console.log(line);
  }

  // Door damage potential per wave
  console.log('\n\n  MAX POTENTIAL DOOR DAMAGE PER WAVE (if 0% kill rate):\n');

  header = pad('Wave', 6);
  for (const s of scenarios) header += pad(s.slice(0, 8), 12);
  console.log(header);
  console.log('-'.repeat(60));

  for (let wave = 1; wave <= maxWaves; wave += wave < 10 ? 1 : 5) {
    let line = pad(wave, 6);
    for (const s of scenarios) {
      const waveData = generateWave(wave, s);
      const typeCounts = {};
      for (const t of waveData.enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;
      let totalDmg = 0;
      for (const [type, count] of Object.entries(typeCounts)) totalDmg += (GAME.enemies[type]?.doorDmg || 1) * count;
      line += pad(totalDmg, 12);
    }
    console.log(line);
  }

  // Enemy archetype distribution at wave 22 (non-event wave)
  console.log('\n\n  ENEMY ARCHETYPE MIX AT WAVE 22 (non-event wave, % of spawns):\n');
  header = pad('Archetype', 12);
  for (const s of scenarios) header += pad(s.slice(0, 8), 12);
  console.log(header);
  console.log('-'.repeat(60));

  const archetypes = ['basic', 'fast', 'tank', 'support', 'immune', 'swarm', 'jumper', 'train'];
  for (const arch of archetypes) {
    let line = pad(arch, 12);
    for (const s of scenarios) {
      // Run several samples and average
      let total = 0;
      let archCount = 0;
      for (let i = 0; i < 20; i++) {
        const waveData = generateWave(22, s);
        total += waveData.enemies.length;
        for (const t of waveData.enemies) {
          if (GAME.enemies[t]?.archetype === arch) archCount++;
        }
      }
      const pct = total > 0 ? (archCount / total * 100).toFixed(0) + '%' : '0%';
      line += pad(pct, 12);
    }
    console.log(line);
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  OUTPUT HELPERS                                                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function pad(val, width) {
  return String(val).padStart(width);
}

function outputCSV(data, filename) {
  // Simple CSV output to stdout
  console.log('\n--- CSV OUTPUT ---');
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  console.log(keys.join(','));
  for (const row of data) {
    console.log(keys.map(k => row[k]).join(','));
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CLI ENTRY POINT                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const args = process.argv.slice(2);

function getArg(name, defaultVal) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}

const module_ = getArg('module', 'all');
const scenario = getArg('scenario', 'office');
const maxWaves = parseInt(getArg('waves', '30'));
const numRuns = parseInt(getArg('runs', '1000'));
const csvOutput = args.includes('--csv');
const jsonOutput = args.includes('--json');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  HOLD IT IN — Balance Simulation & Analysis Tool           ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Scenario: ${pad(scenario.toUpperCase(), 10)}  Waves: ${pad(maxWaves, 3)}  MC Runs: ${pad(numRuns, 6)}     ║`);
console.log('╚══════════════════════════════════════════════════════════════╝');

const startTime = Date.now();

if (module_ === 'all' || module_ === 'economy') {
  analyzeEconomy(maxWaves, scenario);
}

if (module_ === 'all' || module_ === 'dps') {
  analyzeDPS(maxWaves, scenario);
}

if (module_ === 'all' || module_ === 'monte-carlo') {
  runMonteCarlo(numRuns, maxWaves, scenario);
}

if (module_ === 'all' || module_ === 'upgrades') {
  analyzeUpgrades();
}

if (module_ === 'all' || module_ === 'scenarios') {
  compareScenarios(Math.min(maxWaves, 30));
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n  Completed in ${elapsed}s`);
console.log('  Run with --module <name> to focus on a specific analysis.');
console.log('  Modules: economy, dps, monte-carlo, upgrades, scenarios');

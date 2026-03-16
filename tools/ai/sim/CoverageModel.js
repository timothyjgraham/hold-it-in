/**
 * CoverageModel — two-mode combat resolution for AI simulation.
 *
 * Fast mode (aggregate): capacity-based DPS vs HP, for GA mass evaluation.
 * Tick mode: per-tick (0.5s) simulation for Q-learning.
 *
 * Ported from balance-sim.js Monte Carlo combat resolution (lines 1260-1400)
 * and TowerAI.estimateDPS.
 */

const { GAME } = require('../shared/gameData');
const { enemyHP, enemySpeed, desperateChance, coinDropValue, waveBonus } = require('../shared/formulas');
const { countUpgradesForTowerSim, conditionalScale } = require('../shared/upgradeHelpers');

class CoverageModel {
  constructor() {
    this.tickInterval = 0.5; // seconds per tick for tick mode
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SHARED: DPS ESTIMATION (ported from TowerAI.estimateDPS)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Estimate raw DPS output for a tower setup + upgrade state.
   * Ported from balance-sim.js TowerAI.estimateDPS.
   *
   * @param {object} towers - { coinmagnet, wetfloor, mop, ubik, potplant }
   * @param {object} upgrades - { upgradeId: stackCount, ... }
   * @param {number} [permanentDmgBonus=0] - from R26 Controlled Demolition stacks
   * @returns {number} estimated DPS
   */
  computeDPS(towers, upgrades, permanentDmgBonus = 0) {
    let dps = 0;
    const t = towers;
    const totalTowers = Object.values(t).reduce((a, b) => a + b, 0);

    // ── Global damage multipliers ──
    let globalDmgMult = 1.0 + permanentDmgBonus;

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

    // ── Per-tower DPS contributions ──

    // Mop: damage / cooldown
    const mopCdMult = 1 - (upgrades.C8 || 0) * 0.3;
    // C7: Industrial Mop Head (+20% mop damage, +15% range — wider sweep)
    const mopHeadMult = upgrades.C7 ? 1.20 : 1.0;
    // C9: Heavy Mop (+75% knockback — more repositioning time ≈ +10% effective DPS)
    const heavyMopMult = upgrades.C9 ? 1.10 : 1.0;
    // C10: Extra Absorbent (+15% mop damage from soaking — stacks)
    const absorbentMult = 1 + (upgrades.C10 || 0) * 0.15;
    dps += t.mop * (GAME.towers.mop.damage / (GAME.towers.mop.cooldown * mopCdMult))
      * mopHeadMult * heavyMopMult * absorbentMult * slowSteadySpeedMult * doubleShiftMult;

    // Ubik: damage * (spray_duration / cycle_time) — hits ~2 enemies per spray (AoE)
    let ubikDmgMult = 1 + (upgrades.C13 || 0) * 0.4;
    // C11: Pressure Washer — multiplicative +35% damage (no longer clobbered by C13)
    if (upgrades.C11) ubikDmgMult *= 1.35;
    const ubikCdMult = 1 - (upgrades.C14 || 0) * 0.25;
    const ubikCycle = GAME.towers.ubik.cooldown * ubikCdMult + GAME.towers.ubik.sprayDuration;
    const ubikDPS = (GAME.towers.ubik.damage * ubikDmgMult * GAME.towers.ubik.sprayDuration) / ubikCycle;
    // C12: Wide Spray — 80% wider cone → hits ~50% more enemies (AoE 2.0 → 3.0)
    const ubikAoeMult = upgrades.C12 ? 3.0 : 2.0;
    dps += t.ubik * ubikDPS * ubikAoeMult * slowSteadySpeedMult * doubleShiftMult;

    // Pot plant: trip damage / (stun + re-approach time)
    dps += t.potplant * (GAME.towers.potplant.damage / 4) * doubleShiftMult;

    // C16: Cactus Pot DPS — scales with pot archetype + 5% global thorn bonus
    if (upgrades.C16) {
      const potCount = countUpgradesForTowerSim(upgrades, 'potplant');
      dps += t.potplant * (3 + 2.5 * potCount);
    }

    // C6: Prickly Signs — enemies take damage bashing into signs (~2 DPS per sign per stack)
    if (upgrades.C6 && t.wetfloor > 0) {
      dps += t.wetfloor * (upgrades.C6) * 2.0;
    }

    // C20: Static Charge — on-collect proc, ~1 proc/2s per magnet ≈ 1.5 effective DPS
    if (upgrades.C20 && t.coinmagnet > 0) {
      dps += t.coinmagnet * 1.5;
    }

    // Apply global damage multiplier
    dps *= globalDmgMult;

    // Soft cap on damage multiplier to prevent infinite scaling
    const SOFT_CAP = 3.0;
    const DIMINISH = 0.25;
    if (globalDmgMult > SOFT_CAP) {
      const cappedMult = SOFT_CAP + (globalDmgMult - SOFT_CAP) * DIMINISH;
      dps = dps / globalDmgMult * cappedMult;
    }

    // L13: Minimalist (2.0x if <=4 towers)
    if (upgrades.L13 && totalTowers <= 4) dps *= 2.0;
    // R24: Skeleton Crew (+25% per empty slot, max 6 slots)
    if (upgrades.R24) {
      const emptySlots = Math.max(0, 6 - totalTowers);
      dps *= 1 + emptySlots * 0.25;
    }

    return dps;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  FAST MODE: Aggregate capacity-based combat resolution
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Fast-mode combat resolution. Given tower counts, upgrade state, and wave
   * composition, returns aggregate results.
   *
   * Ported from balance-sim.js Monte Carlo combat (lines 1260-1400).
   *
   * @param {object} params
   * @param {object} params.towers - { coinmagnet, wetfloor, mop, ubik, potplant }
   * @param {object} params.upgrades - { upgradeId: stackCount, ... }
   * @param {number} params.permanentDmgBonus - from R26 Controlled Demolition
   * @param {string[]} params.enemies - array of enemy type strings
   * @param {number} params.wave - wave number
   * @param {number} params.interval - spawn interval
   * @param {number} params.eventSpeedMult - event speed multiplier
   * @param {number} params.eventDesperateChance - event desperate chance
   * @param {number} params.coins - current coin balance (for hoarder calc)
   * @param {number} params.doorHP - current door HP
   * @param {number} params.doorMaxHP - max door HP
   * @param {function} [rng] - RNG function, defaults to Math.random
   * @returns {{ killRate: number, coinIncome: number, doorDamage: number, waveDuration: number }}
   */
  resolveFast(params, rng) {
    const rand = rng || Math.random;
    const {
      towers, upgrades, permanentDmgBonus = 0,
      enemies, wave, interval,
      eventSpeedMult = 1.0, eventDesperateChance = 0,
      coins = 0, doorHP = 100, doorMaxHP = 100
    } = params;

    // ── 1. Count enemy types, compute totalHP ──
    const typeCounts = {};
    for (const t of enemies) typeCounts[t] = (typeCounts[t] || 0) + 1;

    let totalHP = 0;
    let totalCoinsIfAllKilled = 0;
    let totalDoorDmgIfAllLeak = 0;
    const despChance = desperateChance(wave, eventDesperateChance);

    for (const [type, count] of Object.entries(typeCounts)) {
      for (let i = 0; i < count; i++) {
        let hp = enemyHP(type, wave);
        if (rand() < despChance) hp = Math.round(hp * 0.75);
        totalHP += hp;
        totalCoinsIfAllKilled += coinDropValue(type);
        totalDoorDmgIfAllLeak += (GAME.enemies[type]?.doorDmg || 1);
      }
    }

    // ── 2. Compute tower DPS ──
    const dps = this.computeDPS(towers, upgrades, permanentDmgBonus);

    // ── 3. Compute wave timing ──
    const avgSpeed = 3.5 * (1 + wave * 0.02) * eventSpeedMult;
    const traverseTime = GAME.traverseDistance / avgSpeed;
    const spawnDuration = enemies.length * interval;
    const waveDuration = spawnDuration + traverseTime;

    // ── 4. Apply all upgrade bonuses ──

    // Slow towers add effective time
    let slowBonus = towers.wetfloor > 0 ? 1.25 : 1.0;
    // C5: Extra Slippery — slow to 15% (from 40%), massive slow improvement
    if (upgrades.C5 && towers.wetfloor > 0) slowBonus *= 1.30;
    // C4: Reinforced Signs — +120% HP per stack, signs survive longer = more slowing
    if (upgrades.C4 && towers.wetfloor > 0) slowBonus *= (1 + (upgrades.C4) * 0.06);
    // R29: Contagion (slow spreads — ~30% more enemies slowed)
    if (upgrades.R29 && towers.wetfloor > 0) slowBonus *= 1.15;
    // R17: Marked for Death (+40% damage to slowed enemies, ~60% slowed)
    const markedBonus = (upgrades.R17 && towers.wetfloor > 0) ? 1.25 : 1.0;
    // L12: Overtime — conditional: scales with sign upgrades, gated by conditionalScale
    const overtimeScale = upgrades.L12 ? conditionalScale(upgrades, 'wetfloor', 'L12') : 0;
    const overtimeDur = upgrades.L12 ? (3 + 0.8 * countUpgradesForTowerSim(upgrades, 'wetfloor', 'L12')) : 0;
    const overtimeBonus = upgrades.L12 ? (1 + overtimeScale * 1.0 * Math.min(overtimeDur, waveDuration) / waveDuration) : 1.0;
    // L2: Desperate Measures (2x damage below 50% door HP)
    const desperateBonus = (upgrades.L2 && doorHP < doorMaxHP * 0.5) ? 2.0 : 1.0;
    // R16: Crossfire (estimate 30% of enemies hit by 2+ types)
    const crossfireBonus = upgrades.R16 ? 1.12 : 1.0;
    // R18: Crowd Surfing (+30% when 2+ enemies nearby, ~40% in crowds)
    const crowdBonus = upgrades.R18 ? 1.12 : 1.0;
    // R31: Rush Defense (2.5x first 3s, then -25%)
    const rushBonus = upgrades.R31
      ? (1 + (2.5 * Math.min(3, waveDuration) - 0.25 * Math.max(0, waveDuration - 3)) / waveDuration)
      : 1.0;
    // R32: Attrition (+5%/sec cap 80% — average ~40% over typical wave)
    const attritionBonus = upgrades.R32 ? 1.40 : 1.0;
    // L14: Hoarder — conditional: threshold scales with magnet upgrades, gated by conditionalScale
    const hoarderScale = upgrades.L14 ? conditionalScale(upgrades, 'coinmagnet', 'L14') : 0;
    const hoarderThreshold = upgrades.L14 ? Math.max(25, 50 - 4 * countUpgradesForTowerSim(upgrades, 'coinmagnet', 'L14')) : 50;
    const hoarderBonus = upgrades.L14
      ? (1 + hoarderScale * Math.min(Math.floor(coins / hoarderThreshold) * 0.10, 0.80))
      : 1.0;
    // L17: Assembly Line (+20% per adjacent tower, estimate avg 1.5 adjacents)
    const assemblyBonus = upgrades.L17 ? 1.30 : 1.0;
    // L18: Last Stand (3x at 1HP, estimate ~10% of towers at 1HP avg)
    const lastStandBonus = upgrades.L18 ? 1.20 : 1.0;
    // L11: Bladder Burst (25% max HP splash on death, ~15% bonus)
    const burstBonus = upgrades.L11 ? 1.15 : 1.0;
    // L9: Ubik Flood — conditional: DPS scales with ubik upgrades, gated by conditionalScale
    const ubikFloodScale = upgrades.L9 ? conditionalScale(upgrades, 'ubik', 'L9') : 0;
    const floodDPS = upgrades.L9 ? (1 + countUpgradesForTowerSim(upgrades, 'ubik', 'L9')) : 0;
    const floodBonus = (upgrades.L9 && towers.ubik > 0) ? (1 + ubikFloodScale * floodDPS * 0.05) : 1.0;
    // L15: Chain Reaction (nearest tower fires on kill, ~20% bonus DPS)
    const chainReactionBonus = upgrades.L15 ? 1.20 : 1.0;
    // L3: Plunger Protocol (door hit -> 3x speed 3s, only when leaking)
    const plungerBonus = (upgrades.L3 && doorHP < doorMaxHP) ? 1.10 : 1.0;

    // ── Conditional legendaries: fast-mode approximations (L4, L5, L6, L7, L8) ──

    // L4: Rush Hour Pileup (mop) — collision stun + damage, scales with mop investment
    const pileupScale = upgrades.L4 ? conditionalScale(upgrades, 'mop', 'L4') : 0;
    const pileupBonus = upgrades.L4 ? (1 + pileupScale * 0.12) : 1.0;

    // L5: Domino Effect (pot) — chain tripping, scales with pot investment
    const dominoScale = upgrades.L5 ? conditionalScale(upgrades, 'potplant', 'L5') : 0;
    const dominoBonus = (upgrades.L5 && towers.potplant > 0) ? (1 + dominoScale * 0.10) : 1.0;

    // L6: Spill Zone (wetfloor) — death puddles slow+damage, scales with sign investment
    const spillScale = upgrades.L6 ? conditionalScale(upgrades, 'wetfloor', 'L6') : 0;
    const spillBonus = upgrades.L6 ? (1 + spillScale * 0.12) : 1.0;

    // L7: Loose Change (coinmagnet) — coin trips stun+damage, scales with magnet investment
    const looseScale = upgrades.L7 ? conditionalScale(upgrades, 'coinmagnet', 'L7') : 0;
    const looseBonus = (upgrades.L7 && towers.coinmagnet > 0) ? (1 + looseScale * 0.10) : 1.0;

    // L8: Nuclear Mop (mop) — 3x knockback + collision damage, scales with mop investment
    const nuclearScale = upgrades.L8 ? conditionalScale(upgrades, 'mop', 'L8') : 0;
    const nuclearBonus = upgrades.L8 ? (1 + nuclearScale * 0.15) : 1.0;

    // C1: Overclocked Magnet — wider collection ≈ +8% effective tower uptime from economy
    const overclockBonus = (upgrades.C1 && towers.coinmagnet > 0) ? 1.04 : 1.0;

    // C3: Magnet Durability — +5 HP/stack, magnets survive longer ≈ +3% uptime per stack
    const magDurBonus = (upgrades.C3 && towers.coinmagnet > 0) ? (1 + (upgrades.C3) * 0.03) : 1.0;

    // C16: Cactus Pot thorn bonus — enemies weakened by thorns take 3% more global damage
    const thornBonus = (upgrades.C16 && towers.potplant > 0) ? 1.03 : 1.0;

    const effectiveDPS = dps * slowBonus * markedBonus * overtimeBonus * desperateBonus *
      crossfireBonus * crowdBonus * rushBonus * attritionBonus * hoarderBonus *
      assemblyBonus * lastStandBonus * burstBonus * floodBonus * chainReactionBonus * plungerBonus *
      pileupBonus * dominoBonus * spillBonus * looseBonus * nuclearBonus *
      overclockBonus * magDurBonus * thornBonus;

    const totalDamageCapacity = effectiveDPS * waveDuration;

    // ── 5. Kill ratio with variance ──
    const variance = 0.85 + rand() * 0.3; // 85%-115%
    const killRatio = Math.min(1.0, (totalDamageCapacity * variance) / totalHP);

    // ── 6. Calculate coins collected ──
    const totalCoins = Math.round(totalCoinsIfAllKilled * killRatio);
    const doorDamage = Math.round(totalDoorDmgIfAllLeak * (1 - killRatio));

    // Coin collection: 30% base + 25% per magnet, cap 100%
    // C1: Overclocked Magnet — +12 range, improves collection by ~15%
    const overclockCollect = upgrades.C1 ? 0.15 : 0;
    const collectionRate = Math.min(1.0, 0.3 + towers.coinmagnet * 0.25 + overclockCollect);
    const coinValueMult = 1 + (upgrades.C2 || 0) * 0.5;
    let collected = Math.round(totalCoins * collectionRate * coinValueMult);

    // R13: Tip Jar (15% chance 3x coin per kill)
    if (upgrades.R13) {
      const killed = Math.round(enemies.length * killRatio);
      const goldenCoins = Math.round(killed * 0.15 * 3);
      collected += goldenCoins;
    }
    // R12: Payday (1.5x coins near magnets, estimate 50% near magnets)
    if (upgrades.R12 && towers.coinmagnet > 0) {
      collected = Math.round(collected * (1 + 0.5 * 0.5));
    }
    // R19: Overkill Bonus (1 coin per 5 overkill damage, ~3 coins per kill)
    if (upgrades.R19) {
      const killed = Math.round(enemies.length * killRatio);
      collected += Math.round(killed * 0.6);
    }
    // R11: Spray & Pray (5 coins when ubik hits 5+, ~2 procs per wave per ubik)
    if (upgrades.R11 && towers.ubik > 0) {
      collected += towers.ubik * 2 * 5;
    }
    // L10: Golden Magnet — conditional: interval scales with magnet upgrades, gated by conditionalScale
    if (upgrades.L10) {
      const gmScale = conditionalScale(upgrades, 'coinmagnet', 'L10');
      const gmInterval = Math.max(2, 5 - 0.5 * countUpgradesForTowerSim(upgrades, 'coinmagnet', 'L10'));
      collected += Math.round(gmScale * towers.coinmagnet * waveDuration / gmInterval);
    }

    let waveBonusCoins = waveBonus(wave);
    // L16: Loan Shark (halved wave bonuses)
    if (upgrades.L16) waveBonusCoins = Math.round(waveBonusCoins / 2);

    const coinIncome = collected + waveBonusCoins;

    return { killRate: killRatio, coinIncome, doorDamage, waveDuration };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TICK MODE: Per-tick simulation for Q-learning
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Tick-mode combat resolution. Simulates enemies advancing per-tick.
   *
   * @param {object} params - same as resolveFast, plus:
   * @param {function} [rng] - RNG function
   * @returns {{ killRate, coinIncome, doorDamage, waveDuration, snapshots: object[] }}
   */
  resolveTick(params, rng) {
    const rand = rng || Math.random;
    const {
      towers, upgrades, permanentDmgBonus = 0,
      enemies: enemyTypes, wave, interval,
      eventSpeedMult = 1.0, eventDesperateChance = 0,
      coins = 0, doorHP: startDoorHP = 100, doorMaxHP = 100
    } = params;

    const dt = this.tickInterval;
    const despChance = desperateChance(wave, eventDesperateChance);
    const toiletZ = GAME.toiletZ;

    // ── Build enemy objects ──
    const enemyObjs = enemyTypes.map((type, i) => {
      const def = GAME.enemies[type];
      let hp = enemyHP(type, wave);
      if (rand() < despChance) hp = Math.round(hp * 0.75);
      const speed = enemySpeed(type, wave, eventSpeedMult);
      return {
        type,
        hp,
        maxHP: hp,
        z: GAME.spawnZoneZ + i * interval * speed, // stagger spawn positions
        speed,
        alive: true,
        reachedDoor: false,
        slowed: false,
        slowTimer: 0,
        stunned: false,
        stunTimer: 0,
        def,
      };
    });

    // ── Build tower list with positions ──
    const towerList = [];
    const minZ = 15;
    const maxZ = 55;
    let idx = 0;
    const totalTowerCount = Object.values(towers).reduce((a, b) => a + b, 0);
    const spacing = totalTowerCount > 0 ? (maxZ - minZ) / Math.max(1, totalTowerCount) : 0;

    for (const [type, count] of Object.entries(towers)) {
      const tDef = GAME.towers[type];
      for (let i = 0; i < count; i++) {
        const z = minZ + idx * spacing + spacing / 2;
        const cdMult = type === 'mop'
          ? (1 - (upgrades.C8 || 0) * 0.3)
          : type === 'ubik'
            ? (1 - (upgrades.C14 || 0) * 0.25)
            : 1.0;
        const dmgMult = type === 'ubik' ? (1 + (upgrades.C13 || 0) * 0.4) : 1.0;
        towerList.push({
          type,
          z,
          range: tDef.range,
          damage: tDef.damage * dmgMult,
          cooldown: (tDef.cooldown || 1.0) * cdMult,
          cooldownTimer: 0,
          effect: tDef.effect,
          slowFactor: tDef.slowFactor || 0,
          stunDuration: tDef.stunDuration || 0,
          knockback: tDef.knockback || 0,
        });
        idx++;
      }
    }

    // ── Pre-compute global multiplier ──
    let globalMult = 1.0 + permanentDmgBonus;
    if (upgrades.C17) globalMult *= 1.8;
    if (upgrades.C18) globalMult *= 1.6;
    if (upgrades.R21) {
      const typesOwned = Object.keys(towers).filter(k => towers[k] > 0).length;
      globalMult *= 1 + (5 - typesOwned) * 0.15;
    }
    if (upgrades.R23) globalMult *= 1.36;
    if (upgrades.R27) globalMult *= 1.6;
    if (upgrades.L13 && totalTowerCount <= 4) globalMult *= 2.0;
    if (upgrades.R24) {
      const empty = Math.max(0, 6 - totalTowerCount);
      globalMult *= 1 + empty * 0.25;
    }

    // ── Simulation loop ──
    const snapshots = [];
    let totalCoinsEarned = 0;
    let totalDoorDamage = 0;
    let tick = 0;
    const maxTicks = 600; // 300s max wave time safety cap

    while (tick < maxTicks) {
      const time = tick * dt;
      let allDone = true;

      // ── Advance enemies ──
      for (const e of enemyObjs) {
        if (!e.alive || e.reachedDoor) continue;
        allDone = false;

        // Decrement status timers
        if (e.stunTimer > 0) {
          e.stunTimer -= dt;
          if (e.stunTimer <= 0) e.stunned = false;
          continue; // stunned enemies don't move
        }
        if (e.slowTimer > 0) {
          e.slowTimer -= dt;
          if (e.slowTimer <= 0) e.slowed = false;
        }

        // Movement
        const speedMult = e.slowed ? 0.4 : 1.0;
        e.z -= e.speed * speedMult * dt;

        // Check if reached door
        if (e.z <= toiletZ) {
          e.reachedDoor = true;
          totalDoorDamage += e.def.doorDmg;
        }
      }

      // ── Tower attacks ──
      for (const tw of towerList) {
        tw.cooldownTimer = Math.max(0, tw.cooldownTimer - dt);
        if (tw.cooldownTimer > 0) continue;

        if (tw.type === 'coinmagnet') continue; // magnets don't attack

        if (tw.type === 'wetfloor') {
          // Barrier: slow enemies that pass through zone
          const frontZ = tw.z + (GAME.towers.wetfloor.slowZoneFront || 3);
          const backZ = tw.z - (GAME.towers.wetfloor.slowZoneBack || 1);
          for (const e of enemyObjs) {
            if (!e.alive || e.reachedDoor || e.def.slowImmune) continue;
            if (e.z <= frontZ && e.z >= backZ && !e.slowed) {
              e.slowed = true;
              e.slowTimer = 3.0; // approximate slow duration
            }
          }
          tw.cooldownTimer = 1.0; // check once per second
          continue;
        }

        // Find nearest alive enemy in range
        let target = null;
        let bestDist = Infinity;
        for (const e of enemyObjs) {
          if (!e.alive || e.reachedDoor) continue;
          const dist = Math.abs(e.z - tw.z);
          if (dist <= tw.range && dist < bestDist) {
            bestDist = dist;
            target = e;
          }
        }

        if (!target) continue;

        // Apply damage
        let dmg = tw.damage * globalMult;
        if (target.slowed && upgrades.R17) dmg *= 1.4;

        if (tw.type === 'potplant') {
          if (target.def.tripImmune || target.def.canJumpTower || target.def.canJumpBarrier) continue;
          target.hp -= dmg;
          target.stunned = true;
          target.stunTimer = tw.stunDuration;
          // C16: Cactus Pot DPS during stun (buffed, scales with pot archetype)
          if (upgrades.C16) {
            const potDPS = 3 + 2.5 * countUpgradesForTowerSim(upgrades, 'potplant');
            target.hp -= potDPS * tw.stunDuration;
          }
          tw.cooldownTimer = tw.stunDuration + 2.0; // can't re-trip immediately
        } else if (tw.type === 'mop') {
          target.hp -= dmg;
          // Knockback
          if (!target.def.knockbackImmune && tw.knockback > 0) {
            const kbMult = 1 + (upgrades.C9 || 0) * 0.75;
            // L8: Nuclear Mop — knockback gated by conditionalScale
            const nuclearMult = upgrades.L8 ? (1 + 2 * conditionalScale(upgrades, 'mop', 'L8')) : 1;
            target.z += tw.knockback * kbMult * nuclearMult;
          }
          tw.cooldownTimer = tw.cooldown;
        } else if (tw.type === 'ubik') {
          // Spray hits multiple enemies in range
          for (const e of enemyObjs) {
            if (!e.alive || e.reachedDoor) continue;
            const dist = Math.abs(e.z - tw.z);
            if (dist <= tw.range) {
              const resist = e.def.sprayResist || 1.0;
              e.hp -= dmg * resist;
            }
          }
          tw.cooldownTimer = tw.cooldown + (GAME.towers.ubik.sprayDuration || 0.8);
        }

        // Check kills
        for (const e of enemyObjs) {
          if (e.alive && e.hp <= 0) {
            e.alive = false;
            totalCoinsEarned += coinDropValue(e.type);
          }
        }
      }

      // ── Snapshot ──
      const aliveCount = enemyObjs.filter(e => e.alive && !e.reachedDoor).length;
      const killedCount = enemyObjs.filter(e => !e.alive).length;
      const leakedCount = enemyObjs.filter(e => e.reachedDoor).length;

      snapshots.push({
        tick,
        time,
        alive: aliveCount,
        killed: killedCount,
        leaked: leakedCount,
        doorDamage: totalDoorDamage,
      });

      if (allDone) break;
      tick++;
    }

    // ── Compute results ──
    const totalEnemies = enemyObjs.length;
    const killed = enemyObjs.filter(e => !e.alive).length;
    const killRate = totalEnemies > 0 ? killed / totalEnemies : 1.0;

    // Coin collection
    const collectionRate = Math.min(1.0, 0.3 + towers.coinmagnet * 0.25);
    const coinValueMult = 1 + (upgrades.C2 || 0) * 0.5;
    let collected = Math.round(totalCoinsEarned * collectionRate * coinValueMult);

    // Coin upgrade bonuses (same as fast mode)
    if (upgrades.R13) {
      collected += Math.round(killed * 0.15 * 3);
    }
    if (upgrades.R12 && towers.coinmagnet > 0) {
      collected = Math.round(collected * 1.25);
    }
    if (upgrades.R19) {
      collected += Math.round(killed * 0.6);
    }
    if (upgrades.R11 && towers.ubik > 0) {
      collected += towers.ubik * 2 * 5;
    }
    const waveDuration = tick * dt;
    // L10: Golden Magnet — conditional: gated by conditionalScale in tick mode too
    if (upgrades.L10) {
      const gmScale = conditionalScale(upgrades, 'coinmagnet', 'L10');
      const gmInterval = Math.max(2, 5 - 0.5 * countUpgradesForTowerSim(upgrades, 'coinmagnet', 'L10'));
      collected += Math.round(gmScale * towers.coinmagnet * waveDuration / gmInterval);
    }

    let waveBonusCoins = waveBonus(wave);
    if (upgrades.L16) waveBonusCoins = Math.round(waveBonusCoins / 2);

    const coinIncome = collected + waveBonusCoins;

    return {
      killRate,
      coinIncome,
      doorDamage: totalDoorDamage,
      waveDuration,
      snapshots,
    };
  }
}

module.exports = { CoverageModel };

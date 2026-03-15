#!/usr/bin/env node
/**
 * Hold It In — Balance Simulation Model
 *
 * Simulates wave-by-wave economy, combat, and progression to identify
 * balance issues. Inspired by PvZ economy pacing principles.
 *
 * Usage:
 *   node tools/balance-sim.js                    # Run default simulation
 *   node tools/balance-sim.js --waves 30         # Simulate 30 waves
 *   node tools/balance-sim.js --strategy greedy  # AI buys towers aggressively
 *   node tools/balance-sim.js --strategy pvz     # PvZ-style pacing for comparison
 *   node tools/balance-sim.js --proposed         # Test proposed balance changes
 *   node tools/balance-sim.js --sweep            # Parameter sweep across strategies
 */

// ============================================================
// GAME DATA — mirrors index.html values exactly
// ============================================================

const CURRENT_BALANCE = {
  startingCoins: 75,
  doorMaxHP: 100,

  towers: {
    coinMagnet: { cost: 15, hp: 4,  range: 8,    damage: 0,  cooldown: 0.3, type: 'economy' },
    potPlant:   { cost: 10, hp: 3,  range: 0,    damage: 6,  cooldown: 0,   type: 'defense' },
    wetFloor:   { cost: 20, hp: 20, range: 0,    damage: 0,  cooldown: 0,   type: 'control', slowFactor: 0.4 },
    mopTurret:  { cost: 30, hp: 6,  range: 4.5,  damage: 8,  cooldown: 1.2, type: 'defense' },
    ubikSpray:  { cost: 40, hp: 6,  range: 18,   damage: 10, cooldown: 1.5, type: 'defense' },
  },

  // Coin drops — physical coins scattered on enemy death (at-or-below nominal)
  coinDrops: {
    polite:      { value: 4,  count: 2 },
    dancer:      { value: 3,  count: 1 },
    waddle:      { value: 10, count: 3 },
    panicker:    { value: 8,  count: 2 },
    powerWalker: { value: 6,  count: 2 },
    girls:       { value: 2,  count: 1 },
  },

  enemies: {
    polite:      { speed: 3.0, baseHP: 20, hpPerWave: 10, coins: 5,  doorDmg: 2, flankChance: 0.15 },
    dancer:      { speed: 5.5, baseHP: 10, hpPerWave: 4,  coins: 3,  doorDmg: 1, flankChance: 0.60 },
    waddle:      { speed: 2.0, baseHP: 60, hpPerWave: 18, coins: 12, doorDmg: 4, flankChance: 0.10 },
    panicker:    { speed: 4.0, baseHP: 40, hpPerWave: 12, coins: 10, doorDmg: 2, flankChance: 0.40 },
    powerWalker: { speed: 3.5, baseHP: 30, hpPerWave: 10, coins: 7,  doorDmg: 2, flankChance: 0.70 },
    girls:       { speed: 3.0, baseHP: 8,  hpPerWave: 3,  coins: 2,  doorDmg: 1, flankChance: 0.30, swarmSize: 6 },
  },

  // Curated waves 1-10
  curatedWaves: [
    null, // index 0 unused
    { enemies: { polite: 5 }, spawnInterval: 2.5 },
    { enemies: { polite: 7 }, spawnInterval: 2.0 },
    { enemies: { polite: 4, dancer: 4 }, spawnInterval: 1.8 },
    { enemies: { polite: 5, dancer: 5 }, spawnInterval: 1.5 },
    { enemies: { polite: 4, dancer: 3, waddle: 2 }, spawnInterval: 1.3 },
    { enemies: { polite: 5, dancer: 5, waddle: 3 }, spawnInterval: 1.2 },
    { enemies: { polite: 4, dancer: 4, waddle: 2, panicker: 1 }, spawnInterval: 1.0 },
    { enemies: { polite: 5, dancer: 5, waddle: 3, panicker: 2 }, spawnInterval: 0.9 },
    { enemies: { polite: 4, dancer: 4, waddle: 2, panicker: 1, powerWalker: 3 }, spawnInterval: 0.8 },
    { enemies: { polite: 3, dancer: 3, waddle: 2, panicker: 1, powerWalker: 2, girls: 1 }, spawnInterval: 0.8 },
  ],

  // Wave bonus formula
  waveBonus(wave) {
    return 10 + Math.min(wave, 8) * 3;
  },

  // Procedural wave formula (wave 11+)
  proceduralEnemyCount(wave) {
    return Math.round(8 + wave * 1.8 + Math.pow(wave, 1.3) * 0.25);
  },

  // HP scaling
  enemyHP(type, wave) {
    const e = this.enemies[type];
    const linear = e.baseHP + wave * e.hpPerWave;
    return Math.round(linear * Math.pow(1.04, wave));
  },

  // Speed scaling
  enemySpeed(type, wave) {
    const e = this.enemies[type];
    return e.speed * (1 + wave * 0.015);
  },

  // Procedural wave composition (simplified distribution for waves 11+)
  proceduralComposition(wave) {
    const total = this.proceduralEnemyCount(wave);
    // Weighted distribution shifts toward harder enemies over time
    const hardness = Math.min(1, (wave - 10) / 30); // 0 at wave 10, 1 at wave 40
    return {
      polite:      Math.round(total * (0.30 - hardness * 0.15)),
      dancer:      Math.round(total * (0.25 - hardness * 0.10)),
      waddle:      Math.round(total * (0.10 + hardness * 0.15)),
      panicker:    Math.round(total * (0.10 + hardness * 0.10)),
      powerWalker: Math.round(total * (0.15 + hardness * 0.05)),
      girls:       Math.round(total * (0.10 - hardness * 0.05)),
    };
  },
};


// ============================================================
// PROPOSED BALANCE CHANGES (PvZ-inspired)
// ============================================================

// PROPOSED_BALANCE now represents the OLD balance (pre-retuning) for comparison.
// CURRENT_BALANCE above already has the implemented retuned values.
// Deep-clone data only, then re-attach methods
const PROPOSED_BALANCE = {
  ...CURRENT_BALANCE,
  towers: JSON.parse(JSON.stringify(CURRENT_BALANCE.towers)),
  enemies: JSON.parse(JSON.stringify(CURRENT_BALANCE.enemies)),
  coinDrops: JSON.parse(JSON.stringify(CURRENT_BALANCE.coinDrops)),
  curatedWaves: CURRENT_BALANCE.curatedWaves.map(w => w ? { ...w, enemies: { ...w.enemies } } : null),
};

// Override with old pre-retuning values for comparison
PROPOSED_BALANCE.startingCoins = 100;
PROPOSED_BALANCE.towers.coinMagnet.cost = 10;
PROPOSED_BALANCE.towers.wetFloor.cost = 25;
PROPOSED_BALANCE.towers.mopTurret.cost = 25;
PROPOSED_BALANCE.towers.ubikSpray.cost = 35;
PROPOSED_BALANCE.coinDrops = {
  polite:      { value: 6,  count: 2 },
  dancer:      { value: 4,  count: 1 },
  waddle:      { value: 16, count: 4 },
  panicker:    { value: 13, count: 3 },
  powerWalker: { value: 9,  count: 2 },
  girls:       { value: 3,  count: 1 },
};
PROPOSED_BALANCE.waveBonus = (wave) => 15 + Math.min(wave, 10) * 5;
PROPOSED_BALANCE.proceduralEnemyCount = (wave) => Math.round(10 + wave * 2.5 + Math.pow(wave, 1.5) * 0.3);


// ============================================================
// TOWER AI — Simulates player spending decisions
// ============================================================

class TowerAI {
  constructor(strategy, balance) {
    this.strategy = strategy;
    this.balance = balance;
    this.towers = { coinMagnet: 0, potPlant: 0, wetFloor: 0, mopTurret: 0, ubikSpray: 0 };
    this.totalTowers = 0;
    this.maxSlots = 24; // approximate grid slots
  }

  /**
   * Decide what to buy between waves. Returns coins spent.
   */
  buyPhase(coins, wave) {
    let spent = 0;
    const b = this.balance;

    switch (this.strategy) {
      case 'greedy':
        // Buy the most expensive affordable tower every chance
        spent = this._buyLoop(coins, wave, ['ubikSpray', 'mopTurret', 'wetFloor', 'coinMagnet', 'potPlant']);
        break;

      case 'balanced':
        // Maintain a ratio: 1 magnet per 3 combat towers
        spent = this._balancedBuy(coins, wave);
        break;

      case 'economy':
        // Prioritize magnets early, then transition to combat
        spent = this._economyBuy(coins, wave);
        break;

      case 'pvz':
        // PvZ-inspired: very tight early spending, invest in economy first
        spent = this._pvzBuy(coins, wave);
        break;

      case 'minimal':
        // Only buy when absolutely necessary (low tower count)
        spent = this._minimalBuy(coins, wave);
        break;

      default:
        spent = this._balancedBuy(coins, wave);
    }

    return spent;
  }

  _canBuy(type, coins) {
    return coins >= this.balance.towers[type].cost && this.totalTowers < this.maxSlots;
  }

  _buy(type) {
    this.towers[type]++;
    this.totalTowers++;
    return this.balance.towers[type].cost;
  }

  _buyLoop(coins, wave, priority) {
    let spent = 0;
    let bought = true;
    while (bought) {
      bought = false;
      for (const type of priority) {
        if (this._canBuy(type, coins - spent)) {
          spent += this._buy(type);
          bought = true;
          break;
        }
      }
    }
    return spent;
  }

  _balancedBuy(coins, wave) {
    let spent = 0;
    const combatCount = this.towers.mopTurret + this.towers.ubikSpray + this.towers.wetFloor + this.towers.potPlant;

    // Buy 1 magnet early
    if (wave <= 3 && this.towers.coinMagnet === 0 && this._canBuy('coinMagnet', coins)) {
      spent += this._buy('coinMagnet');
    }

    // Then alternate combat towers
    const priority = wave < 5
      ? ['potPlant', 'mopTurret', 'wetFloor']
      : ['mopTurret', 'ubikSpray', 'wetFloor', 'potPlant'];

    // Buy up to 2 towers per wave
    let purchases = 0;
    for (const type of priority) {
      if (purchases >= 2) break;
      if (this._canBuy(type, coins - spent)) {
        spent += this._buy(type);
        purchases++;
      }
    }

    // Second magnet around wave 6
    if (wave >= 6 && this.towers.coinMagnet < 2 && this._canBuy('coinMagnet', coins - spent)) {
      spent += this._buy('coinMagnet');
    }

    return spent;
  }

  _economyBuy(coins, wave) {
    let spent = 0;

    // Rush magnets (up to 3)
    if (this.towers.coinMagnet < 3 && this._canBuy('coinMagnet', coins - spent)) {
      spent += this._buy('coinMagnet');
    }

    // Then combat
    if (wave >= 3) {
      const priority = ['mopTurret', 'ubikSpray', 'wetFloor', 'potPlant'];
      for (const type of priority) {
        if (this._canBuy(type, coins - spent)) {
          spent += this._buy(type);
          break;
        }
      }
    }

    return spent;
  }

  _pvzBuy(coins, wave) {
    let spent = 0;

    // PvZ model: tight budget, 1 tower per wave max early
    if (wave <= 2) {
      // Only 1 cheap tower
      if (this._canBuy('potPlant', coins - spent)) {
        spent += this._buy('potPlant');
      }
    } else if (wave <= 5) {
      // 1 tower per wave, mix economy and defense
      if (wave === 3 && this.towers.coinMagnet === 0 && this._canBuy('coinMagnet', coins - spent)) {
        spent += this._buy('coinMagnet');
      } else if (this._canBuy('mopTurret', coins - spent)) {
        spent += this._buy('mopTurret');
      } else if (this._canBuy('potPlant', coins - spent)) {
        spent += this._buy('potPlant');
      }
    } else {
      // Mid-late: 1-2 towers per wave
      let purchases = 0;
      const priority = ['mopTurret', 'ubikSpray', 'wetFloor', 'potPlant'];
      for (const type of priority) {
        if (purchases >= 2) break;
        if (this._canBuy(type, coins - spent)) {
          spent += this._buy(type);
          purchases++;
        }
      }
    }

    return spent;
  }

  _minimalBuy(coins, wave) {
    let spent = 0;
    // Only buy if tower count < wave/2
    if (this.totalTowers < Math.ceil(wave / 2)) {
      if (this._canBuy('mopTurret', coins - spent)) {
        spent += this._buy('mopTurret');
      } else if (this._canBuy('potPlant', coins - spent)) {
        spent += this._buy('potPlant');
      }
    }
    return spent;
  }

  /**
   * Estimate DPS output of current tower setup.
   * Simplified model — doesn't account for positioning/pathing.
   */
  estimateDPS() {
    let dps = 0;
    const t = this.towers;
    const b = this.balance.towers;

    // Mop turrets: damage / cooldown
    dps += t.mopTurret * (b.mopTurret.damage / b.mopTurret.cooldown);

    // Ubik spray: damage * (duration / cooldown) approximation
    // Spray hits for 0.8s every 1.5s cycle, assume 2 ticks
    dps += t.ubikSpray * (b.ubikSpray.damage * 2 / b.ubikSpray.cooldown);

    // Pot plants: trip damage on contact, roughly 1 trip every 3s
    dps += t.potPlant * (b.potPlant.damage / 3);

    // Wet floor signs don't do damage but slow (accounted for in kill time)

    return dps;
  }

  /**
   * Estimate coin generation from magnets (passive, if golden magnet upgrade).
   */
  magnetPassiveIncome(waveDuration) {
    // Base magnets don't generate income passively (only collect)
    // But they do increase collection radius, reducing lost coins
    // Model: each magnet collects coins from its radius
    return 0; // Only L10 upgrade adds passive generation
  }
}


// ============================================================
// COMBAT SIMULATOR
// ============================================================

class CombatSim {
  constructor(balance) {
    this.balance = balance;
  }

  /**
   * Simulate a wave of combat. Returns detailed results.
   */
  simulateWave(wave, towerAI) {
    const b = this.balance;
    const comp = this._getComposition(wave);

    // Calculate total enemies, HP, and reward
    let totalEnemies = 0;
    let totalHP = 0;
    let maxReward = 0;
    let totalDoorDmg = 0;
    const breakdown = {};

    for (const [type, count] of Object.entries(comp)) {
      if (count <= 0) continue;
      const actualCount = type === 'girls' ? count * (b.enemies.girls.swarmSize || 6) : count;
      const hp = b.enemyHP(type, wave);
      const speed = b.enemySpeed(type, wave);
      // Use COIN_DROPS value (physical coins) instead of nominal ENEMY_TYPES.coins
      const dropKey = type === 'powerWalker' ? 'powerWalker' : type;
      const coinDrop = b.coinDrops && b.coinDrops[dropKey];
      const coins = coinDrop ? coinDrop.value : b.enemies[type].coins;
      const doorDmg = b.enemies[type].doorDmg;

      totalEnemies += actualCount;
      totalHP += hp * actualCount;
      maxReward += coins * actualCount;

      breakdown[type] = { count: actualCount, hp, speed, coins, doorDmg };
    }

    // Get spawn interval
    const spawnInterval = wave <= 10
      ? b.curatedWaves[wave].spawnInterval
      : Math.max(0.3, 1.5 - (wave - 10) * 0.05); // decreases for procedural waves

    // Wave duration estimate (all enemies spawned + time for last to traverse)
    const spawnDuration = totalEnemies * spawnInterval;
    const traverseTime = 40 / 3.0; // ~13s for average speed enemy to cross field
    const waveDuration = spawnDuration + traverseTime;

    // DPS from towers
    const towerDPS = towerAI.estimateDPS();

    // Effective DPS accounting for slow towers
    const slowMultiplier = towerAI.towers.wetFloor > 0 ? 1.3 : 1.0; // slowed enemies in range longer
    const effectiveDPS = towerDPS * slowMultiplier;

    // Total damage towers can deal during wave
    const totalDamageCapacity = effectiveDPS * waveDuration;

    // Kill ratio: what fraction of enemies can be killed
    const killRatio = Math.min(1.0, totalDamageCapacity / totalHP);

    // Enemies that reach the door
    const enemiesLeaked = Math.round(totalEnemies * (1 - killRatio));

    // Door damage from leaked enemies (weighted average)
    let avgDoorDmg = 0;
    if (totalEnemies > 0) {
      for (const [type, info] of Object.entries(breakdown)) {
        avgDoorDmg += (info.doorDmg * info.count) / totalEnemies;
      }
    }
    totalDoorDmg = Math.round(enemiesLeaked * avgDoorDmg);

    // Coins earned (only from killed enemies)
    const coinsEarned = Math.round(maxReward * killRatio);

    // Coin collection efficiency (magnets help collect)
    const magnetCount = towerAI.towers.coinMagnet;
    const collectionRate = Math.min(1.0, 0.3 + magnetCount * 0.25); // 30% base, +25% per magnet
    const coinsCollected = Math.round(coinsEarned * collectionRate);

    return {
      wave,
      totalEnemies,
      totalHP,
      maxReward,
      spawnInterval,
      waveDuration: Math.round(waveDuration),
      towerDPS: Math.round(effectiveDPS * 10) / 10,
      totalDamageCapacity: Math.round(totalDamageCapacity),
      killRatio: Math.round(killRatio * 100),
      enemiesLeaked,
      doorDamage: totalDoorDmg,
      coinsEarned,
      coinsCollected,
      breakdown,
    };
  }

  _getComposition(wave) {
    if (wave <= 10) {
      return this.balance.curatedWaves[wave].enemies;
    }
    return this.balance.proceduralComposition(wave);
  }
}


// ============================================================
// MAIN SIMULATION
// ============================================================

class GameSimulation {
  constructor(balance, strategy = 'balanced', label = '') {
    this.balance = balance;
    this.strategy = strategy;
    this.label = label;
    this.combat = new CombatSim(balance);
    this.towerAI = new TowerAI(strategy, balance);
  }

  run(maxWaves = 25) {
    let coins = this.balance.startingCoins;
    let doorHP = this.balance.doorMaxHP;
    const doorMaxHP = this.balance.doorMaxHP;
    let gameOver = false;
    const results = [];

    // Track cumulative stats
    let totalCoinsEarned = 0;
    let totalCoinsSpent = 0;
    let cumulativeEnemies = 0;

    for (let wave = 1; wave <= maxWaves; wave++) {
      if (gameOver) break;

      // Buy phase (between waves)
      const spent = this.towerAI.buyPhase(coins, wave);
      coins -= spent;
      totalCoinsSpent += spent;

      // Combat phase
      const result = this.combat.simulateWave(wave, this.towerAI);

      // Economy update — kill rewards + wave bonus
      const waveBonus = this.balance.waveBonus ? this.balance.waveBonus(wave) : 0;
      coins += result.coinsCollected + waveBonus;
      totalCoinsEarned += result.coinsCollected + waveBonus;

      // Door HP (resets each wave in the actual game, but damage accumulates for this model)
      // Actually, door HP resets each wave, so we track per-wave damage
      const waveDoorDmg = result.doorDamage;

      // Track if this wave would have been fatal
      const waveSurvived = waveDoorDmg < doorMaxHP;

      results.push({
        wave,
        coinsStart: coins - result.coinsCollected + spent,
        coinsSpent: spent,
        coinsEarned: result.coinsCollected,
        coinsEnd: coins,
        netWorth: coins + this._towerValue(),
        totalEnemies: result.totalEnemies,
        totalHP: result.totalHP,
        towerDPS: result.towerDPS,
        killRatio: result.killRatio,
        enemiesLeaked: result.enemiesLeaked,
        doorDamage: waveDoorDmg,
        waveSurvived,
        towerCount: this.towerAI.totalTowers,
        towers: { ...this.towerAI.towers },
        waveDuration: result.waveDuration,
        cumulativeEarned: totalCoinsEarned,
        cumulativeSpent: totalCoinsSpent,
        surplus: totalCoinsEarned - totalCoinsSpent,
      });

      if (!waveSurvived) {
        gameOver = true;
      }
    }

    return results;
  }

  _towerValue() {
    let value = 0;
    for (const [type, count] of Object.entries(this.towerAI.towers)) {
      value += this.balance.towers[type].cost * count;
    }
    return value;
  }
}


// ============================================================
// OUTPUT FORMATTING
// ============================================================

function printResults(results, label) {
  console.log('\n' + '='.repeat(120));
  console.log(`  ${label}`);
  console.log('='.repeat(120));

  // Header
  console.log(
    pad('Wave', 5) +
    pad('Coins$', 7) +
    pad('Spent', 6) +
    pad('Earned', 7) +
    pad('Coins€', 7) +
    pad('NetW', 6) +
    pad('Surpl', 6) +
    pad('Enemies', 8) +
    pad('TotHP', 7) +
    pad('DPS', 6) +
    pad('Kill%', 6) +
    pad('Leaked', 7) +
    pad('DoorDmg', 8) +
    pad('Towers', 7) +
    pad('WaveDur', 8) +
    pad('Status', 8)
  );
  console.log('-'.repeat(120));

  for (const r of results) {
    const status = r.killRatio >= 95 ? 'EASY' :
                   r.killRatio >= 80 ? 'ok' :
                   r.killRatio >= 60 ? 'HARD' :
                   r.waveSurvived    ? 'DANGER' : 'DEAD';

    const statusColor = status === 'EASY' ? '\x1b[32m' :
                        status === 'ok'   ? '\x1b[33m' :
                        status === 'HARD' ? '\x1b[31m' :
                        status === 'DANGER' ? '\x1b[35m' : '\x1b[41m\x1b[37m';

    console.log(
      pad(r.wave, 5) +
      pad(r.coinsStart, 7) +
      pad(r.coinsSpent, 6) +
      pad(r.coinsEarned, 7) +
      pad(r.coinsEnd, 7) +
      pad(r.netWorth, 6) +
      pad(r.surplus, 6) +
      pad(r.totalEnemies, 8) +
      pad(r.totalHP, 7) +
      pad(r.towerDPS, 6) +
      pad(r.killRatio + '%', 6) +
      pad(r.enemiesLeaked, 7) +
      pad(r.doorDamage, 8) +
      pad(r.towerCount, 7) +
      pad(r.waveDuration + 's', 8) +
      statusColor + pad(status, 8) + '\x1b[0m'
    );
  }

  // Summary
  const last = results[results.length - 1];
  const deathWave = results.find(r => !r.waveSurvived);
  console.log('-'.repeat(120));
  console.log(`  Final: ${last.towerCount} towers, ${last.coinsEnd} coins, ${last.netWorth} net worth`);
  console.log(`  Economy: ${last.cumulativeEarned} total earned, ${last.cumulativeSpent} total spent, ${last.surplus} surplus`);
  if (deathWave) {
    console.log(`  \x1b[31mGAME OVER at wave ${deathWave.wave} (${deathWave.doorDamage} door damage)\x1b[0m`);
  } else {
    console.log(`  Survived all ${results.length} waves`);
  }
}

function pad(val, width) {
  return String(val).padStart(width);
}

function printEconomyAnalysis(currentResults, proposedResults) {
  console.log('\n' + '='.repeat(80));
  console.log('  ECONOMY ANALYSIS — Retuned vs Old');
  console.log('='.repeat(80));

  console.log('\n  Key metrics compared at wave milestones:\n');
  console.log(
    pad('Wave', 6) +
    pad('Cur$', 7) + pad('Pro$', 7) +
    pad('CurNW', 7) + pad('ProNW', 7) +
    pad('CurKill', 8) + pad('ProKill', 8) +
    pad('CurTow', 7) + pad('ProTow', 7) +
    pad('CurSurp', 8) + pad('ProSurp', 8)
  );
  console.log('-'.repeat(80));

  const milestones = [1, 3, 5, 7, 10, 12, 15, 20, 25];
  for (const w of milestones) {
    const c = currentResults.find(r => r.wave === w);
    const p = proposedResults.find(r => r.wave === w);
    if (!c || !p) continue;

    console.log(
      pad(w, 6) +
      pad(c.coinsEnd, 7) + pad(p.coinsEnd, 7) +
      pad(c.netWorth, 7) + pad(p.netWorth, 7) +
      pad(c.killRatio + '%', 8) + pad(p.killRatio + '%', 8) +
      pad(c.towerCount, 7) + pad(p.towerCount, 7) +
      pad(c.surplus, 8) + pad(p.surplus, 8)
    );
  }

  // PvZ comparison notes
  console.log('\n' + '='.repeat(80));
  console.log('  PVZ ECONOMY PRINCIPLES — How They Apply');
  console.log('='.repeat(80));
  console.log(`
  1. ECONOMY VS DEFENSE TENSION (Sunflowers vs Peashooters)
     Your game: Coin Magnets are too cheap (${CURRENT_BALANCE.towers.coinMagnet.cost} coins) and don't
     compete with combat towers. In PvZ, sunflowers cost the same as peashooters
     (50 sun each), creating a real tradeoff.
     → Proposed: Magnet cost raised to ${PROPOSED_BALANCE.towers.coinMagnet.cost}

  2. TIGHT EARLY ECONOMY
     PvZ gives exactly 50 sun to start = 1 plant. Your game gives ${CURRENT_BALANCE.startingCoins} coins
     = ${Math.floor(CURRENT_BALANCE.startingCoins / CURRENT_BALANCE.towers.coinMagnet.cost)} magnets or ${Math.floor(CURRENT_BALANCE.startingCoins / CURRENT_BALANCE.towers.mopTurret.cost)} mops before wave 1.
     → Proposed: Starting coins reduced to ${PROPOSED_BALANCE.startingCoins}

  3. WAVE INCOME SHOULD MATCH TOWER COSTS
     PvZ: ~175 sun per wave early (2 sunflowers × 25 sun × 3.5 cycles + 2 falling).
     Enough for 3 plants per 2 waves. You need to SAVE.
     Your game: Wave 5 gives ~${currentResults[4]?.coinsEarned || '??'} coins from kills alone.
     With towers costing ${CURRENT_BALANCE.towers.mopTurret.cost}, that's ${Math.floor((currentResults[4]?.coinsEarned || 0) / CURRENT_BALANCE.towers.mopTurret.cost)} free towers per wave.

  4. ENEMY COUNT PACING
     PvZ waves 1-10 have 4-12 zombies. Yours have 5-18.
     But PvZ lanes force spatial strategy — your grid does too via flanking.
     The issue is less count and more REWARD PER KILL being too generous.

  5. SPENDING PRESSURE
     In PvZ, zombies eat your plants — you must REPLACE. Tower HP in your game
     is similar, but magnets (HP ${CURRENT_BALANCE.towers.coinMagnet.hp}) and pot plants (HP ${CURRENT_BALANCE.towers.potPlant.hp}) die fast.
     This is good! But cheap replacement cost undermines the pressure.
  `);
}

function printPvZComparison() {
  console.log('\n' + '='.repeat(80));
  console.log('  PVZ WAVE PACING REFERENCE (Adventure Mode Levels 1-1 to 1-10)');
  console.log('='.repeat(80));
  console.log(`
  PvZ Level  Zombies  Types              Sun Economy     Player Plants
  ─────────  ───────  ─────              ───────────     ─────────────
  1-1        2-3      Regular only       50 start        1 Peashooter
  1-2        4-5      Regular            50 start        ~2 plants
  1-3        5-7      Regular+Cone       50 start        ~3 plants
  1-4        7-9      Reg+Cone           50 start        Sunflower intro
  1-5        8-10     Reg+Cone+Bucket    50 start        ~4-5 plants
  1-6        9-12     +Flag wave         50 start        ~5-6 plants
  1-7        10-14    Mixed              50 start        ~6-7 plants
  1-8        12-16    +Pole Vaulter      50 start        ~7-8 plants
  1-9        14-18    Mixed heavy        50 start        ~8-10 plants
  1-10       18-24    ALL + boss flag    50 start        ~10-12 plants

  KEY INSIGHT: PvZ gives you exactly 1 plant worth of currency to start.
  Economy grows slowly (sunflowers have delayed ROI).
  You can NEVER buy more than ~2 plants per wave even late.
  Tension comes from needing to replace eaten plants.

  YOUR GAME vs PvZ pacing ratio:
  ┌─────────────────────────────────────────────────────┐
  │ Metric            │  PvZ        │  Hold It In       │
  │ Start currency    │  1× plant   │  4-10× towers     │
  │ Income/wave       │  1-2 plants │  2-4+ towers      │
  │ Plant/tower life  │  Short      │  Variable         │
  │ Replacement cost  │  Same       │  Same (no repair) │
  │ Enemy scaling     │  Slow       │  Exponential      │
  └─────────────────────────────────────────────────────┘
  `);
}


// ============================================================
// PARAMETER SWEEP
// ============================================================

function parameterSweep(maxWaves = 20) {
  console.log('\n' + '='.repeat(90));
  console.log('  PARAMETER SWEEP — All strategies × Both balance sets');
  console.log('='.repeat(90));

  const strategies = ['greedy', 'balanced', 'economy', 'pvz', 'minimal'];
  const balances = [
    { balance: CURRENT_BALANCE, label: 'RETUNED' },
    { balance: PROPOSED_BALANCE, label: 'OLD' },
  ];

  console.log('\n' +
    pad('Strategy', 12) +
    pad('Balance', 10) +
    pad('W5 Coins', 9) +
    pad('W10 Coins', 10) +
    pad('W15 Coins', 10) +
    pad('W20 Coins', 10) +
    pad('W5 Kill%', 9) +
    pad('W10 Kill%', 10) +
    pad('W15 Kill%', 10) +
    pad('W20 Kill%', 10) +
    pad('DeathWv', 8)
  );
  console.log('-'.repeat(90));

  for (const strat of strategies) {
    for (const { balance, label } of balances) {
      const sim = new GameSimulation(balance, strat);
      const results = sim.run(maxWaves);

      const w5 = results.find(r => r.wave === 5);
      const w10 = results.find(r => r.wave === 10);
      const w15 = results.find(r => r.wave === 15);
      const w20 = results.find(r => r.wave === 20);
      const deathWave = results.find(r => !r.waveSurvived);

      console.log(
        pad(strat, 12) +
        pad(label, 10) +
        pad(w5?.coinsEnd ?? '-', 9) +
        pad(w10?.coinsEnd ?? '-', 10) +
        pad(w15?.coinsEnd ?? '-', 10) +
        pad(w20?.coinsEnd ?? '-', 10) +
        pad((w5?.killRatio ?? '-') + '%', 9) +
        pad((w10?.killRatio ?? '-') + '%', 10) +
        pad((w15?.killRatio ?? '-') + '%', 10) +
        pad((w20?.killRatio ?? '-') + '%', 10) +
        pad(deathWave ? 'W' + deathWave.wave : 'alive', 8)
      );
    }
  }
}


// ============================================================
// COIN-PER-TOWER RATIO ANALYSIS
// ============================================================

function coinPerTowerAnalysis() {
  console.log('\n' + '='.repeat(80));
  console.log('  COINS-PER-TOWER RATIO (Income relative to spending power)');
  console.log('='.repeat(80));
  console.log(`
  The "coins per tower" ratio measures how many towers a player can buy
  from a single wave's income. Values > 2 mean rapid tower accumulation.

  TARGET: 0.5-1.5 towers per wave income (forces hard choices)
  `);

  const avgTowerCost = (15 + 10 + 20 + 30 + 40) / 5; // retuned
  const avgTowerCostP = (10 + 10 + 25 + 25 + 35) / 5; // old

  console.log(pad('Wave', 6) + pad('CurIncome', 10) + pad('Cur T/W', 8) + pad('ProIncome', 10) + pad('Pro T/W', 8));
  console.log('-'.repeat(42));

  const simC = new GameSimulation(CURRENT_BALANCE, 'balanced');
  const simP = new GameSimulation(PROPOSED_BALANCE, 'balanced');
  const resC = simC.run(20);
  const resP = simP.run(20);

  for (let i = 0; i < 20; i++) {
    const rc = resC[i];
    const rp = resP[i];
    if (!rc || !rp) continue;

    const ratioC = (rc.coinsEarned / avgTowerCost).toFixed(1);
    const ratioP = (rp.coinsEarned / avgTowerCostP).toFixed(1);

    const flag = parseFloat(ratioC) > 2.0 ? ' ⚠️' : '';
    console.log(
      pad(rc.wave, 6) +
      pad(rc.coinsEarned, 10) +
      pad(ratioC + flag, 8) +
      pad(rp.coinsEarned, 10) +
      pad(ratioP, 8)
    );
  }
}


// ============================================================
// RECOMMENDED CHANGES SUMMARY
// ============================================================

function printRecommendations() {
  console.log('\n' + '='.repeat(80));
  console.log('  RECOMMENDED BALANCE CHANGES');
  console.log('='.repeat(80));
  console.log(`
  Based on simulation results and PvZ economy principles:

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ PRIORITY 1: TIGHTEN STARTING ECONOMY                                  │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ • Starting coins: 100 → 50                                            │
  │   Reason: 100 coins lets you place 4-10 towers before wave 1.         │
  │   PvZ gives you exactly enough for 1 plant. 50 coins = 1 mop OR      │
  │   2 pot plants OR 1 magnet + 1 pot plant. Forces a real choice.       │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ PRIORITY 2: REDUCE KILL REWARDS                                       │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ • Polite:      5 → 4  coins                                           │
  │ • Dancer:      3 → 2  coins                                           │
  │ • Waddle:     12 → 8  coins  (biggest offender — high HP = slow kill  │
  │   but huge payoff, making tanks a net positive for player economy)     │
  │ • Panicker:   10 → 7  coins                                           │
  │ • PowerWalker: 7 → 5  coins                                           │
  │ • Girls:       2 → 1  coin                                            │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ PRIORITY 3: ADJUST TOWER COSTS                                        │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ • Coin Magnet: 10 → 15 (economy should compete with defense spend)    │
  │ • Mop Turret:  25 → 30 (best DPS tower should cost more)              │
  │ • Ubik Spray:  35 → 40 (premium)                                      │
  │ • Wet Floor:   25 → 20 (utility/control — slight discount)            │
  │ • Pot Plant:   10 → 10 (keep cheap, it's the "wall-nut" of your game) │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ PRIORITY 4: ECONOMY UPGRADE NERFS                                     │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ • R12 "Payday" (2× coins in magnet range): Too snowball-y.            │
  │   Consider: 1.5× instead of 2×, or limit to once per wave.           │
  │ • R13 "Tip Jar" (20% chance 5× coin): Very swingy.                   │
  │   Consider: 10% chance 3× coin.                                       │
  │ • C2 "Double Dip" (up to 3× coin value): Consider max 2× total.      │
  │ • L10 "Golden Magnet" (1 coin/4s passive): Fine as legendary.         │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ PRIORITY 5: SPAWN PACING                                              │
  ├─────────────────────────────────────────────────────────────────────────┤
  │ • Waves 1-5: Slightly faster spawns (less idle time between enemies)   │
  │ • Consider adding "sub-waves" — a pause mid-wave, then a burst.       │
  │   PvZ does this with flag zombies marking intensity spikes.            │
  │ • Wave duration matters: shorter waves = less magnet collection time   │
  │   = indirect economy nerf without changing coin values.                │
  └─────────────────────────────────────────────────────────────────────────┘
  `);
}


// ============================================================
// CLI ENTRY POINT
// ============================================================

const args = process.argv.slice(2);
const maxWaves = parseInt(args.find((_, i, a) => a[i-1] === '--waves') || '25');
const strategy = args.find((_, i, a) => a[i-1] === '--strategy') || 'balanced';
const doProposed = args.includes('--proposed');
const doSweep = args.includes('--sweep');
const doAll = args.includes('--all') || args.length === 0;

if (doAll || doSweep) {
  // Full analysis
  const simCurrent = new GameSimulation(CURRENT_BALANCE, 'balanced', 'Retuned Balance (balanced strategy)');
  const currentResults = simCurrent.run(maxWaves);
  printResults(currentResults, 'RETUNED BALANCE — Balanced Strategy');

  const simProposed = new GameSimulation(PROPOSED_BALANCE, 'balanced', 'Old Balance (balanced strategy)');
  const proposedResults = simProposed.run(maxWaves);
  printResults(proposedResults, 'OLD BALANCE (pre-retune) — Balanced Strategy');

  printEconomyAnalysis(currentResults, proposedResults);
  printPvZComparison();
  parameterSweep(maxWaves);
  coinPerTowerAnalysis();
  printRecommendations();

} else if (doProposed) {
  const sim = new GameSimulation(PROPOSED_BALANCE, strategy, `Proposed Balance (${strategy})`);
  const results = sim.run(maxWaves);
  printResults(results, `PROPOSED BALANCE — ${strategy} strategy`);

} else {
  const sim = new GameSimulation(CURRENT_BALANCE, strategy, `Current Balance (${strategy})`);
  const results = sim.run(maxWaves);
  printResults(results, `CURRENT BALANCE — ${strategy} strategy`);
}

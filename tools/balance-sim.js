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
// ║  GAME DATA — exact mirror of index.html values                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const GAME = {
  startingCoins: 60,
  doorMaxHP: 100,
  gridCell: 2,
  laneWidth: 30,
  laneLength: 70,
  spawnZoneZ: 69,
  toiletZ: 3,
  // Effective traversal distance
  get traverseDistance() { return this.spawnZoneZ - this.toiletZ; }, // 66 units

  // ── TOWERS ──────────────────────────────────────────────────────────────
  towers: {
    coinmagnet: { name: 'Coin Magnet',    cost: 15, hp: 4,  range: 8,   damage: 0,  cooldown: 0.3, effect: 'magnet',  unlockWave: 1  },
    wetfloor:   { name: 'Wet Floor Sign', cost: 20, hp: 20, range: 0,   damage: 0,  cooldown: 0,   effect: 'barrier', unlockWave: 3, slowFactor: 0.4, slowZoneFront: 3, slowZoneBack: 1 },
    mop:        { name: 'Mop Turret',     cost: 30, hp: 6,  range: 4.5, damage: 8,  cooldown: 1.2, effect: 'sweep',   unlockWave: 5, knockback: 7.0, arcRad: 1.05 },
    ubik:       { name: 'Ubik Spray',     cost: 40, hp: 6,  range: 18,  damage: 10, cooldown: 1.5, effect: 'spray',   unlockWave: 1, sprayDuration: 0.8, sprayWidth: 2.0 },
    potplant:   { name: 'Pot Plant',      cost: 10, hp: 3,  range: 0,   damage: 6,  cooldown: 0,   effect: 'trip',    unlockWave: 7, stunDuration: 1.8 },
  },

  // ── ENEMIES ─────────────────────────────────────────────────────────────
  enemies: {
    // Office
    polite:      { name: 'Polite Knocker',   baseSpeed: 3.0, speedVar: 0.5, baseHP: 20, hpPerWave: 6,  coins: 5,  doorDmg: 2, flankChance: 0.15, scenario: 'office', archetype: 'basic' },
    dancer:      { name: 'Pee Dancer',       baseSpeed: 5.5, speedVar: 1.0, baseHP: 10, hpPerWave: 2,  coins: 3,  doorDmg: 1, flankChance: 0.60, scenario: 'office', archetype: 'fast', canJumpBarrier: true },
    waddle:      { name: 'Waddle Tank',      baseSpeed: 2.0, speedVar: 0.3, baseHP: 60, hpPerWave: 11, coins: 12, doorDmg: 4, flankChance: 0.10, scenario: 'office', archetype: 'tank', panicThreshold: 0.5 },
    panicker:    { name: 'Panicker',         baseSpeed: 4.0, speedVar: 0.5, baseHP: 40, hpPerWave: 7,  coins: 10, doorDmg: 2, flankChance: 0.40, scenario: 'office', archetype: 'support', speedAuraRange: 8, speedAuraBonus: 0.5 },
    powerwalker: { name: 'Power Walker',     baseSpeed: 3.5, speedVar: 0.3, baseHP: 30, hpPerWave: 6,  coins: 7,  doorDmg: 2, flankChance: 0.70, scenario: 'office', archetype: 'immune', slowImmune: true },
    girls:       { name: 'The Girls',        baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 2,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'office', archetype: 'swarm' },
    // Forest
    deer:        { name: 'Deer',             baseSpeed: 3.0, speedVar: 0.5, baseHP: 20, hpPerWave: 6,  coins: 5,  doorDmg: 2, flankChance: 0.20, scenario: 'forest', archetype: 'basic' },
    squirrel:    { name: 'Squirrel',         baseSpeed: 5.5, speedVar: 1.0, baseHP: 10, hpPerWave: 2,  coins: 3,  doorDmg: 1, flankChance: 0.55, scenario: 'forest', archetype: 'fast', canJumpBarrier: true },
    bear:        { name: 'Bear',             baseSpeed: 2.0, speedVar: 0.3, baseHP: 65, hpPerWave: 12, coins: 14, doorDmg: 5, flankChance: 0.08, scenario: 'forest', archetype: 'tank', panicThreshold: 0.5 },
    fox:         { name: 'Fox',              baseSpeed: 4.0, speedVar: 0.5, baseHP: 40, hpPerWave: 7,  coins: 10, doorDmg: 2, flankChance: 0.45, scenario: 'forest', archetype: 'support', speedAuraRange: 8, speedAuraBonus: 0.5 },
    moose:       { name: 'Moose',            baseSpeed: 3.5, speedVar: 0.3, baseHP: 35, hpPerWave: 7,  coins: 8,  doorDmg: 3, flankChance: 0.60, scenario: 'forest', archetype: 'immune', slowImmune: true },
    raccoon:     { name: 'Raccoon',          baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 2,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'forest', archetype: 'swarm' },
    // Ocean
    dolphin:     { name: 'Dolphin',          baseSpeed: 3.0, speedVar: 0.5, baseHP: 22, hpPerWave: 6,  coins: 5,  doorDmg: 2, flankChance: 0.20, scenario: 'ocean', archetype: 'basic' },
    flyfish:     { name: 'Flying Fish',      baseSpeed: 5.5, speedVar: 1.0, baseHP: 10, hpPerWave: 2,  coins: 3,  doorDmg: 1, flankChance: 0.60, scenario: 'ocean', archetype: 'fast', canJumpBarrier: true },
    shark:       { name: 'Shark',            baseSpeed: 2.0, speedVar: 0.3, baseHP: 70, hpPerWave: 13, coins: 15, doorDmg: 5, flankChance: 0.08, scenario: 'ocean', archetype: 'tank', panicThreshold: 0.5 },
    pirate:      { name: 'Pirate',           baseSpeed: 4.0, speedVar: 0.5, baseHP: 42, hpPerWave: 8,  coins: 11, doorDmg: 3, flankChance: 0.40, scenario: 'ocean', archetype: 'support', speedAuraRange: 8, speedAuraBonus: 0.5 },
    seaturtle:   { name: 'Sea Turtle',       baseSpeed: 3.5, speedVar: 0.3, baseHP: 38, hpPerWave: 7,  coins: 8,  doorDmg: 2, flankChance: 0.55, scenario: 'ocean', archetype: 'immune', slowImmune: true },
    jellyfish:   { name: 'Jellyfish',        baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 2,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'ocean', archetype: 'swarm' },
    // Airplane
    nervous:     { name: 'Nervous Flyer',    baseSpeed: 3.0, speedVar: 0.5, baseHP: 20, hpPerWave: 6,  coins: 5,  doorDmg: 2, flankChance: 0.15, scenario: 'airplane', archetype: 'basic' },
    business:    { name: 'Business Class',   baseSpeed: 3.5, speedVar: 0.3, baseHP: 35, hpPerWave: 7,  coins: 8,  doorDmg: 2, flankChance: 0.60, scenario: 'airplane', archetype: 'immune', knockbackImmune: true },
    stumbler:    { name: 'Turb. Stumbler',   baseSpeed: 2.0, speedVar: 0.3, baseHP: 55, hpPerWave: 9,  coins: 12, doorDmg: 4, flankChance: 0.10, scenario: 'airplane', archetype: 'tank', panicThreshold: 0.5, barrierBust: true },
    attendant:   { name: 'Flight Attendant', baseSpeed: 5.0, speedVar: 1.0, baseHP: 15, hpPerWave: 3,  coins: 4,  doorDmg: 1, flankChance: 0.50, scenario: 'airplane', archetype: 'fast', canJumpBarrier: true, sprayResist: 0.5 },
    marshal:     { name: 'Air Marshal',      baseSpeed: 3.5, speedVar: 0.3, baseHP: 40, hpPerWave: 8,  coins: 10, doorDmg: 3, flankChance: 0.50, scenario: 'airplane', archetype: 'support', slowImmune: true, magnetDisableRange: 6, speedAuraRange: 6, speedAuraBonus: 0.3 },
    unruly:      { name: 'Unruly Passengers',baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 2,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'airplane', archetype: 'swarm', tripImmune: true },
    // Jumpers (all scenarios)
    vaulter:     { name: 'Office Parkour',   baseSpeed: 2.0, speedVar: 0.3, baseHP: 40, hpPerWave: 7,  coins: 9,  doorDmg: 3, flankChance: 0.30, scenario: 'office', archetype: 'jumper', canJumpTower: true },
    kangaroo:    { name: 'Kangaroo',         baseSpeed: 2.2, speedVar: 0.3, baseHP: 45, hpPerWave: 8,  coins: 10, doorDmg: 3, flankChance: 0.25, scenario: 'forest', archetype: 'jumper', canJumpTower: true },
    frog:        { name: 'Tree Frog',        baseSpeed: 2.0, speedVar: 0.3, baseHP: 42, hpPerWave: 8,  coins: 9,  doorDmg: 3, flankChance: 0.30, scenario: 'ocean', archetype: 'jumper', canJumpTower: true },
    hurdler:     { name: 'Olympic Hurdler',  baseSpeed: 2.2, speedVar: 0.3, baseHP: 40, hpPerWave: 7,  coins: 9,  doorDmg: 3, flankChance: 0.35, scenario: 'airplane', archetype: 'jumper', canJumpTower: true },
    // Trains (all scenarios)
    drunk:       { name: 'Drunken Worker',   baseSpeed: 2.5, speedVar: 0.4, baseHP: 20, hpPerWave: 5,  coins: 3,  doorDmg: 2, flankChance: 0.15, scenario: 'office', archetype: 'train' },
    ant:         { name: 'Giant Ant',        baseSpeed: 4.0, speedVar: 0.3, baseHP: 12, hpPerWave: 3,  coins: 2,  doorDmg: 1, flankChance: 0.10, scenario: 'forest', archetype: 'train' },
    seahorse:    { name: 'Sea Horse',        baseSpeed: 2.8, speedVar: 0.2, baseHP: 10, hpPerWave: 2,  coins: 2,  doorDmg: 1, flankChance: 0.00, scenario: 'ocean', archetype: 'train' },
    trolley:     { name: 'Drinks Trolley',   baseSpeed: 1.8, speedVar: 0.2, baseHP: 65, hpPerWave: 10, coins: 12, doorDmg: 5, flankChance: 0.00, scenario: 'airplane', archetype: 'train', knockbackImmune: true },
  },

  // ── COIN DROPS ──────────────────────────────────────────────────────────
  coinDrops: {
    polite: { value: 3, count: 2 }, dancer: { value: 2, count: 1 }, waddle: { value: 8, count: 3 },
    panicker: { value: 6, count: 2 }, powerwalker: { value: 5, count: 2 }, girls: { value: 1, count: 1 },
    deer: { value: 3, count: 2 }, squirrel: { value: 2, count: 1 }, bear: { value: 8, count: 3 },
    fox: { value: 6, count: 2 }, moose: { value: 5, count: 2 }, raccoon: { value: 1, count: 1 },
    dolphin: { value: 3, count: 2 }, flyfish: { value: 2, count: 1 }, shark: { value: 9, count: 3 },
    pirate: { value: 7, count: 2 }, seaturtle: { value: 5, count: 2 }, jellyfish: { value: 1, count: 1 },
    nervous: { value: 3, count: 2 }, business: { value: 5, count: 2 }, stumbler: { value: 8, count: 3 },
    attendant: { value: 2, count: 1 }, marshal: { value: 6, count: 2 }, unruly: { value: 1, count: 1 },
    vaulter: { value: 5, count: 2 }, kangaroo: { value: 6, count: 2 }, frog: { value: 5, count: 2 }, hurdler: { value: 5, count: 2 },
    drunk: { value: 2, count: 1 }, ant: { value: 1, count: 1 }, seahorse: { value: 1, count: 1 }, trolley: { value: 9, count: 3 },
  },

  trainSizes: { drunk: [6,8], ant: [8,10], seahorse: [6,8], trolley: [3,4] },
  swarmSize: [5, 7], // min, max

  // ── CURATED WAVES ───────────────────────────────────────────────────────
  curatedWaves: {
    office: [
      null,
      { enemies: [['polite', 3]], interval: 5.0, delay: 8 },
      { enemies: [['polite', 7]], interval: 2.0, delay: 4 },
      { enemies: [['polite', 4], ['dancer', 4]], interval: 1.8, delay: 4 },
      { enemies: [['polite', 5], ['dancer', 5]], interval: 1.5, delay: 3.5 },
      { enemies: [['polite', 4], ['dancer', 3], ['waddle', 2]], interval: 1.3, delay: 3 },
      { enemies: [['polite', 5], ['dancer', 5], ['waddle', 3]], interval: 1.2, delay: 3 },
      { enemies: [['polite', 4], ['dancer', 4], ['waddle', 2], ['panicker', 1]], interval: 1.0, delay: 3 },
      { enemies: [['polite', 4], ['dancer', 4], ['waddle', 2], ['panicker', 2], ['drunk_train', 1]], interval: 0.9, delay: 3 },
      { enemies: [['polite', 4], ['dancer', 4], ['waddle', 2], ['panicker', 1], ['powerwalker', 3]], interval: 0.8, delay: 3 },
      { enemies: [['polite', 3], ['dancer', 3], ['waddle', 2], ['panicker', 1], ['powerwalker', 2], ['girls_group', 1]], interval: 0.8, delay: 3 },
    ],
    forest: [
      null,
      { enemies: [['deer', 5]], interval: 4.0, delay: 6 },
      { enemies: [['deer', 7]], interval: 2.0, delay: 4 },
      { enemies: [['deer', 4], ['squirrel', 4]], interval: 1.8, delay: 4 },
      { enemies: [['deer', 5], ['squirrel', 5]], interval: 1.5, delay: 3.5 },
      { enemies: [['deer', 4], ['squirrel', 3], ['bear', 2]], interval: 1.3, delay: 3 },
      { enemies: [['deer', 5], ['squirrel', 5], ['bear', 3]], interval: 1.2, delay: 3 },
      { enemies: [['deer', 4], ['squirrel', 4], ['bear', 2], ['fox', 1]], interval: 1.0, delay: 3 },
      { enemies: [['deer', 4], ['squirrel', 4], ['bear', 2], ['fox', 2], ['ant_train', 1]], interval: 0.9, delay: 3 },
      { enemies: [['deer', 4], ['squirrel', 4], ['bear', 2], ['fox', 1], ['moose', 3]], interval: 0.8, delay: 3 },
      { enemies: [['deer', 3], ['squirrel', 3], ['bear', 2], ['fox', 1], ['moose', 2], ['raccoon_group', 1]], interval: 0.8, delay: 3 },
    ],
    ocean: [
      null,
      { enemies: [['dolphin', 5]], interval: 4.0, delay: 6 },
      { enemies: [['dolphin', 7]], interval: 2.0, delay: 4 },
      { enemies: [['dolphin', 4], ['flyfish', 4]], interval: 1.8, delay: 4 },
      { enemies: [['dolphin', 5], ['flyfish', 5]], interval: 1.5, delay: 3.5 },
      { enemies: [['dolphin', 4], ['flyfish', 3], ['shark', 2]], interval: 1.3, delay: 3 },
      { enemies: [['dolphin', 5], ['flyfish', 5], ['shark', 3]], interval: 1.2, delay: 3 },
      { enemies: [['dolphin', 4], ['flyfish', 4], ['shark', 2], ['pirate', 1]], interval: 1.0, delay: 3 },
      { enemies: [['dolphin', 4], ['flyfish', 4], ['shark', 2], ['pirate', 2], ['seahorse_train', 1]], interval: 0.9, delay: 3 },
      { enemies: [['dolphin', 4], ['flyfish', 4], ['shark', 2], ['pirate', 1], ['seaturtle', 3]], interval: 0.8, delay: 3 },
      { enemies: [['dolphin', 3], ['flyfish', 3], ['shark', 2], ['pirate', 1], ['seaturtle', 2], ['jellyfish_group', 1]], interval: 0.8, delay: 3 },
    ],
    airplane: [
      null,
      { enemies: [['nervous', 5]], interval: 4.0, delay: 6 },
      { enemies: [['nervous', 7]], interval: 2.0, delay: 4 },
      { enemies: [['nervous', 4], ['business', 4]], interval: 1.8, delay: 4 },
      { enemies: [['nervous', 5], ['business', 5]], interval: 1.5, delay: 3.5 },
      { enemies: [['nervous', 4], ['business', 3], ['stumbler', 2]], interval: 1.3, delay: 3 },
      { enemies: [['nervous', 5], ['business', 5], ['stumbler', 3]], interval: 1.2, delay: 3 },
      { enemies: [['nervous', 4], ['business', 4], ['stumbler', 2], ['attendant', 2]], interval: 1.0, delay: 3 },
      { enemies: [['nervous', 4], ['business', 4], ['stumbler', 2], ['attendant', 2], ['trolley_train', 1]], interval: 0.9, delay: 3 },
      { enemies: [['nervous', 4], ['business', 4], ['stumbler', 2], ['attendant', 1], ['marshal', 3]], interval: 0.8, delay: 3 },
      { enemies: [['nervous', 3], ['business', 3], ['stumbler', 2], ['attendant', 1], ['marshal', 2], ['unruly_group', 1]], interval: 0.8, delay: 3 },
    ],
  },

  // ── EVENT WAVES ─────────────────────────────────────────────────────────
  waveEvents: {
    office: {
      15: { name: 'TACO TUESDAY', enemyMult: 2.5, spawnMult: 0.5, weights: { waddle: 0.35, polite: 0.20, dancer: 0.20, panicker: 0.10, powerwalker: 0.06, girls_group: 0.05, drunk_train: 0.04 } },
      20: { name: 'LUNCH RUSH', enemyMult: 3.0, spawnMult: 0.4, weights: { polite: 0.35, dancer: 0.25, powerwalker: 0.16, panicker: 0.10, waddle: 0.05, girls_group: 0.05, drunk_train: 0.04 } },
      25: { name: 'COFFEE KICKED IN', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.4, desperateChance: 0.6 },
      30: { name: 'FOOD POISONING', enemyMult: 3.5, spawnMult: 0.3, weights: { waddle: 0.25, panicker: 0.20, dancer: 0.20, polite: 0.15, vaulter: 0.10, girls_group: 0.10 } },
      35: { name: 'WING NIGHT', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.3, weights: { waddle: 0.35, polite: 0.18, powerwalker: 0.15, dancer: 0.12, panicker: 0.10, vaulter: 0.10 } },
      40: { name: 'FIRE DRILL', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.5, desperateChance: 0.8 },
      45: { name: 'CHILI COOK-OFF', enemyMult: 4.0, spawnMult: 0.25, weights: { waddle: 0.35, panicker: 0.30, powerwalker: 0.15, dancer: 0.10, girls_group: 0.10 } },
      50: { name: 'BLACK FRIDAY', enemyMult: 5.0, spawnMult: 0.15, speedMult: 1.6, desperateChance: 0.5 },
    },
    forest: {
      15: { name: 'BERRY SEASON', enemyMult: 2.5, spawnMult: 0.5, weights: { bear: 0.35, deer: 0.20, squirrel: 0.20, fox: 0.06, moose: 0.10, raccoon_group: 0.05, ant_train: 0.04 } },
      20: { name: 'MIGRATION', enemyMult: 3.0, spawnMult: 0.4, weights: { deer: 0.35, moose: 0.25, squirrel: 0.16, fox: 0.10, bear: 0.05, raccoon_group: 0.05, ant_train: 0.04 } },
      25: { name: 'FULL MOON', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.4, desperateChance: 0.6 },
      30: { name: 'FOREST FIRE', enemyMult: 3.5, spawnMult: 0.3, weights: { bear: 0.25, fox: 0.20, squirrel: 0.20, deer: 0.15, kangaroo: 0.10, raccoon_group: 0.10 } },
      35: { name: 'HIBERNATION PANIC', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.3, weights: { bear: 0.35, deer: 0.18, moose: 0.15, squirrel: 0.12, fox: 0.10, kangaroo: 0.10 } },
      40: { name: 'STAMPEDE', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.5, desperateChance: 0.8 },
    },
    ocean: {
      15: { name: 'FEEDING FRENZY', enemyMult: 2.5, spawnMult: 0.5, weights: { shark: 0.35, dolphin: 0.20, flyfish: 0.16, pirate: 0.10, seaturtle: 0.10, jellyfish_group: 0.05, seahorse_train: 0.04 } },
      20: { name: 'TIDAL WAVE', enemyMult: 3.0, spawnMult: 0.4, weights: { dolphin: 0.30, seaturtle: 0.21, flyfish: 0.20, pirate: 0.10, shark: 0.10, jellyfish_group: 0.05, seahorse_train: 0.04 } },
      25: { name: 'BLOOD MOON', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.4, desperateChance: 0.6 },
      30: { name: 'PIRATE ARMADA', enemyMult: 3.5, spawnMult: 0.3, weights: { pirate: 0.35, shark: 0.20, flyfish: 0.15, dolphin: 0.10, seaturtle: 0.10, frog: 0.05, jellyfish_group: 0.05 } },
      35: { name: 'KRAKEN STIRS', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.3, weights: { shark: 0.30, seaturtle: 0.18, pirate: 0.18, dolphin: 0.12, frog: 0.12, jellyfish_group: 0.10 } },
      40: { name: 'MAELSTROM', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.5, desperateChance: 0.8 },
    },
    airplane: {
      15: { name: 'TURBULENCE', enemyMult: 2.5, spawnMult: 0.5, weights: { stumbler: 0.35, nervous: 0.20, business: 0.16, attendant: 0.10, marshal: 0.10, unruly_group: 0.05, trolley_train: 0.04 } },
      20: { name: 'MEAL SERVICE', enemyMult: 3.0, spawnMult: 0.4, weights: { nervous: 0.30, business: 0.25, stumbler: 0.15, attendant: 0.11, marshal: 0.10, unruly_group: 0.05, trolley_train: 0.04 } },
      25: { name: 'SEATBELT OFF', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.4, desperateChance: 0.6 },
      30: { name: 'BAD FISH', enemyMult: 3.5, spawnMult: 0.3, weights: { stumbler: 0.30, nervous: 0.20, attendant: 0.15, business: 0.15, hurdler: 0.10, unruly_group: 0.10 } },
      35: { name: 'DUTY FREE', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.3, weights: { business: 0.25, nervous: 0.22, marshal: 0.18, attendant: 0.13, hurdler: 0.12, stumbler: 0.10 } },
      40: { name: 'EMERGENCY LANDING', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.5, desperateChance: 0.8 },
      45: { name: 'OPEN BAR', enemyMult: 4.0, spawnMult: 0.25, weights: { unruly_group: 0.30, stumbler: 0.25, nervous: 0.20, business: 0.15, attendant: 0.10 } },
      50: { name: 'FINAL DESCENT', enemyMult: 5.0, spawnMult: 0.15, speedMult: 1.6, desperateChance: 0.5 },
    },
  },

  // ── PROCEDURAL WAVE WEIGHTS (per scenario) ──────────────────────────────
  proceduralWeights: {
    office: [
      ['girls_group', 0.06], ['drunk_train', 0.04],
      ['vaulter', w => Math.min(0.10, 0.05 + w * 0.002)],
      ['panicker', w => Math.min(0.14, 0.08 + w * 0.002)],
      ['waddle', w => Math.min(0.16, 0.10 + w * 0.002)],
      ['powerwalker', w => Math.min(0.18, 0.14 + w * 0.001)],
      ['dancer', 0.22],
    ],
    forest: [
      ['raccoon_group', 0.06], ['ant_train', 0.04],
      ['kangaroo', w => Math.min(0.10, 0.05 + w * 0.002)],
      ['fox', w => Math.min(0.14, 0.08 + w * 0.002)],
      ['bear', w => Math.min(0.16, 0.10 + w * 0.002)],
      ['moose', w => Math.min(0.18, 0.14 + w * 0.001)],
      ['squirrel', 0.22],
    ],
    ocean: [
      ['jellyfish_group', 0.06], ['seahorse_train', 0.04],
      ['frog', w => Math.min(0.10, 0.05 + w * 0.002)],
      ['pirate', w => Math.min(0.14, 0.08 + w * 0.002)],
      ['shark', w => Math.min(0.16, 0.10 + w * 0.002)],
      ['seaturtle', w => Math.min(0.18, 0.14 + w * 0.001)],
      ['flyfish', 0.22],
    ],
    airplane: [
      ['unruly_group', 0.06], ['trolley_train', 0.04],
      ['hurdler', w => Math.min(0.10, 0.05 + w * 0.002)],
      ['marshal', w => Math.min(0.14, 0.08 + w * 0.002)],
      ['stumbler', w => Math.min(0.16, 0.10 + w * 0.002)],
      ['attendant', w => Math.min(0.14, 0.10 + w * 0.001)],
      ['business', 0.22],
    ],
  },

  fallbackType: { office: 'polite', forest: 'deer', ocean: 'dolphin', airplane: 'nervous' },

  // ── UPGRADES ────────────────────────────────────────────────────────────
  upgrades: [
    // Common (20)
    { id: 'C1', name: 'Overclocked Magnet', rarity: 'common', tower: 'coinmagnet', maxStacks: 1, effect: 'magnetRange', value: 8 },
    { id: 'C2', name: 'Double Dip', rarity: 'common', tower: 'coinmagnet', maxStacks: 1, effect: 'coinValueMult', value: 0.5 },
    { id: 'C3', name: 'Magnet Durability', rarity: 'common', tower: 'coinmagnet', maxStacks: 3, effect: 'magnetHP', value: 4 },
    { id: 'C4', name: 'Reinforced Signs', rarity: 'common', tower: 'wetfloor', maxStacks: 3, effect: 'signHP', value: 1.0 },
    { id: 'C5', name: 'Extra Slippery', rarity: 'common', tower: 'wetfloor', maxStacks: 1, effect: 'slowFactor', value: 0.2 },
    { id: 'C6', name: 'Prickly Signs', rarity: 'common', tower: 'wetfloor', maxStacks: 3, effect: 'signDamage', value: 5 },
    { id: 'C7', name: 'Industrial Mop Head', rarity: 'common', tower: 'mop', maxStacks: 1, effect: 'mopArc', value: 3.0 },
    { id: 'C8', name: 'Quick Sweep', rarity: 'common', tower: 'mop', maxStacks: 2, effect: 'mopCooldown', value: -0.3 },
    { id: 'C9', name: 'Heavy Mop', rarity: 'common', tower: 'mop', maxStacks: 2, effect: 'mopKnockback', value: 0.5 },
    { id: 'C10', name: 'Extra Absorbent', rarity: 'common', tower: 'mop', maxStacks: 3, effect: 'mopHP', value: 4 },
    { id: 'C11', name: 'Pressure Washer', rarity: 'common', tower: 'ubik', maxStacks: 1, effect: 'ubikNarrow', value: 1, exclusive: 'C12' },
    { id: 'C12', name: 'Wide Spray', rarity: 'common', tower: 'ubik', maxStacks: 1, effect: 'ubikWide', value: 1, exclusive: 'C11' },
    { id: 'C13', name: 'Corrosive Formula', rarity: 'common', tower: 'ubik', maxStacks: 2, effect: 'ubikDamage', value: 0.4 },
    { id: 'C14', name: 'Rapid Spray', rarity: 'common', tower: 'ubik', maxStacks: 2, effect: 'ubikCooldown', value: -0.25 },
    { id: 'C15', name: 'Spring-Loaded Pot', rarity: 'common', tower: 'potplant', maxStacks: 1, effect: 'potBounce', value: 1 },
    { id: 'C16', name: 'Cactus Pot', rarity: 'common', tower: 'potplant', maxStacks: 3, effect: 'potDPS', value: 3 },
    { id: 'C17', name: 'Glass Cannon', rarity: 'common', tower: null, maxStacks: 1, effect: 'glassCannon', value: 1, exclusive: 'C18' },
    { id: 'C18', name: 'Slow and Steady', rarity: 'common', tower: null, maxStacks: 1, effect: 'slowSteady', value: 1, exclusive: 'C17' },
    { id: 'C19', name: 'Bargain Bin', rarity: 'common', tower: 'potplant', maxStacks: 1, effect: 'bargainBin', value: 1 },
    { id: 'C20', name: 'Static Charge', rarity: 'common', tower: 'coinmagnet', maxStacks: 3, effect: 'staticCharge', value: 1 },
    // Rare (22)
    { id: 'R1', name: 'Wet & Soapy', rarity: 'rare', tower: ['wetfloor','ubik'], maxStacks: 1, effect: 'synergyWetUbik', value: 2.0 },
    { id: 'R2', name: 'Mop Splash', rarity: 'rare', tower: ['mop','wetfloor'], maxStacks: 1, effect: 'synergyMopWet', value: 1.2 },
    { id: 'R3', name: 'Magnetic Mops', rarity: 'rare', tower: ['coinmagnet','mop'], maxStacks: 1, effect: 'synergyMagMop', value: 0.15 },
    { id: 'R4', name: 'Ubik Slick', rarity: 'rare', tower: ['ubik','potplant'], maxStacks: 1, effect: 'synergyUbikPot', value: 2.5 },
    { id: 'R5', name: 'Coin Shrapnel', rarity: 'rare', tower: 'coinmagnet', maxStacks: 1, effect: 'coinShrapnel', value: 0.15 },
    { id: 'R6', name: 'Sign Fortress', rarity: 'rare', tower: 'wetfloor', maxStacks: 1, effect: 'signFortress', value: 1 },
    { id: 'R7', name: 'Mop & Bucket', rarity: 'rare', tower: ['mop','ubik'], maxStacks: 1, effect: 'synergyMopUbik', value: 8 },
    { id: 'R8', name: 'Pot Magnet', rarity: 'rare', tower: ['coinmagnet','potplant'], maxStacks: 1, effect: 'synergyMagPot', value: 1 },
    { id: 'R9', name: 'Sticky Mop', rarity: 'rare', tower: 'mop', maxStacks: 1, effect: 'mopPuddle', value: 1 },
    { id: 'R10', name: 'Chain Trip', rarity: 'rare', tower: 'potplant', maxStacks: 1, effect: 'chainTrip', value: 3 },
    { id: 'R11', name: 'Spray & Pray', rarity: 'rare', tower: 'ubik', maxStacks: 1, effect: 'sprayBonus', value: 5 },
    { id: 'R12', name: 'Payday', rarity: 'rare', tower: 'coinmagnet', maxStacks: 1, effect: 'payday', value: 1.5 },
    { id: 'R13', name: 'The Tip Jar', rarity: 'rare', tower: null, maxStacks: 1, effect: 'tipJar', value: 0.15 },
    { id: 'R14', name: 'Clearance Sale', rarity: 'rare', tower: null, maxStacks: 1, effect: 'towerCostMult', value: 0.8 },
    { id: 'R15', name: 'Insurance Policy', rarity: 'rare', tower: null, maxStacks: 1, effect: 'insurance', value: 0.5 },
    { id: 'R16', name: 'Crossfire', rarity: 'rare', tower: null, maxStacks: 1, effect: 'crossfire', value: 0.4 },
    { id: 'R17', name: 'Marked for Death', rarity: 'rare', tower: 'wetfloor', maxStacks: 1, effect: 'markedForDeath', value: 0.4 },
    { id: 'R18', name: 'Crowd Surfing', rarity: 'rare', tower: null, maxStacks: 1, effect: 'crowdSurfing', value: 0.3 },
    { id: 'R19', name: 'Overkill Bonus', rarity: 'rare', tower: null, maxStacks: 1, effect: 'overkillBonus', value: 5 },
    { id: 'R20', name: 'Aftershock', rarity: 'rare', tower: 'potplant', maxStacks: 1, effect: 'aftershock', value: 8 },
    { id: 'R21', name: 'Specialist', rarity: 'rare', tower: null, maxStacks: 1, effect: 'specialist', value: 0.15 },
    { id: 'R22', name: 'Recycler', rarity: 'rare', tower: null, maxStacks: 1, effect: 'recycler', value: 0.1 },
    // Legendary (18)
    { id: 'L1', name: 'Double Flush', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'doorHPBoost', value: 4 },
    { id: 'L2', name: 'Desperate Measures', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'desperateMeasures', value: 1 },
    { id: 'L3', name: 'Plunger Protocol', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'plungerProtocol', value: 3.0 },
    { id: 'L4', name: 'Rush Hour Pileup', rarity: 'legendary', tower: 'mop', maxStacks: 1, effect: 'pileup', value: 10 },
    { id: 'L5', name: 'Domino Effect', rarity: 'legendary', tower: 'potplant', maxStacks: 1, effect: 'domino', value: 1 },
    { id: 'L6', name: 'Spill Zone', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'spillZone', value: 3 },
    { id: 'L7', name: 'Loose Change', rarity: 'legendary', tower: 'coinmagnet', maxStacks: 1, effect: 'looseChange', value: 1 },
    { id: 'L8', name: 'Nuclear Mop', rarity: 'legendary', tower: 'mop', maxStacks: 1, effect: 'nuclearMop', value: 4 },
    { id: 'L9', name: 'Ubik Flood', rarity: 'legendary', tower: 'ubik', maxStacks: 1, effect: 'ubikFlood', value: 2 },
    { id: 'L10', name: 'Golden Magnet', rarity: 'legendary', tower: 'coinmagnet', maxStacks: 1, effect: 'goldenMagnet', value: 0.25 },
    { id: 'L11', name: 'Bladder Burst', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'bladderBurst', value: 0.25 },
    { id: 'L12', name: 'Overtime', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'overtime', value: 5 },
    { id: 'L13', name: 'Minimalist', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'minimalist', value: 2.5 },
    { id: 'L14', name: 'Hoarder', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'hoarder', value: 0.12 },
    { id: 'L15', name: 'Chain Reaction', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'chainReaction', value: 12 },
    { id: 'L16', name: 'Loan Shark', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'loanShark', value: 100 },
    { id: 'L17', name: 'Assembly Line', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'assemblyLine', value: 0.2 },
    { id: 'L18', name: 'Last Stand', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'lastStand', value: 3.0 },
  ],
};


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  CORE FORMULAS                                                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function enemyHP(type, wave) {
  const e = GAME.enemies[type];
  const linear = e.baseHP + wave * e.hpPerWave;
  return Math.round(linear);
}

function enemySpeed(type, wave, eventSpeedMult = 1.0) {
  const e = GAME.enemies[type];
  const speedCreep = 1 + wave * 0.015;
  return (e.baseSpeed + e.speedVar * 0.5) * speedCreep * eventSpeedMult;
}

function proceduralEnemyCount(wave) {
  return 10 + Math.floor(wave * 2.0 + Math.pow(wave, 1.4) * 0.3);
}

function spawnInterval(wave) {
  return Math.max(0.25, 1.5 - (wave - 8) * 0.06);
}

function burstSize(wave) {
  return Math.min(8, 1 + Math.floor(wave / 8));
}

function waveBonus(wave) {
  return 8 + Math.min(wave, 8) * 2;
}

function desperateChance(wave, eventChance = 0) {
  return Math.max(eventChance, wave >= 12 ? Math.min(0.4, (wave - 12) * 0.025) : 0);
}

function coinDropValue(type) {
  const d = GAME.coinDrops[type];
  return d ? d.value * d.count : GAME.enemies[type]?.coins || 0;
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  WAVE GENERATOR — exact replica of game logic                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function generateWave(wave, scenario) {
  const events = GAME.waveEvents[scenario] || {};
  const event = events[wave] || null;

  // Curated waves 1-10
  if (wave <= 10) {
    const curated = GAME.curatedWaves[scenario][wave];
    const expanded = [];
    for (const [type, count] of curated.enemies) {
      // Expand special types
      if (type.endsWith('_train')) {
        const actual = type.replace('_train', '');
        const [min, max] = GAME.trainSizes[actual] || [6, 8];
        const trainSize = min + Math.floor(Math.random() * (max - min + 1));
        for (let i = 0; i < trainSize; i++) expanded.push(actual);
      } else if (type.endsWith('_group')) {
        const actual = type.replace('_group', '');
        const groupSize = GAME.swarmSize[0] + Math.floor(Math.random() * (GAME.swarmSize[1] - GAME.swarmSize[0] + 1));
        for (let i = 0; i < groupSize; i++) expanded.push(actual);
      } else {
        for (let i = 0; i < count; i++) expanded.push(type);
      }
    }
    return { enemies: expanded, interval: curated.interval, event: null, eventSpeedMult: 1.0, eventDesperateChance: 0 };
  }

  // Procedural waves 11+
  let total = proceduralEnemyCount(wave);
  if (event && event.enemyMult) total = Math.floor(total * event.enemyMult);

  const weights = GAME.proceduralWeights[scenario];
  const fallback = GAME.fallbackType[scenario];
  const queue = [];

  for (let i = 0; i < total; i++) {
    const roll = Math.random();
    let type = fallback;

    if (event && event.weights) {
      let cumulative = 0;
      for (const [etype, weight] of Object.entries(event.weights)) {
        cumulative += weight;
        if (roll < cumulative) { type = etype; break; }
      }
    } else {
      let cumulative = 0;
      for (const [etype, w] of weights) {
        const weight = typeof w === 'function' ? w(wave) : w;
        cumulative += weight;
        if (roll < cumulative) { type = etype; break; }
      }
    }

    // Expand trains and swarms
    if (type.endsWith('_train')) {
      const actual = type.replace('_train', '');
      const [min, max] = GAME.trainSizes[actual] || [6, 8];
      const trainSize = min + Math.floor(Math.random() * (max - min + 1));
      for (let j = 0; j < trainSize; j++) queue.push(actual);
    } else if (type.endsWith('_group')) {
      const actual = type.replace('_group', '');
      const groupSize = GAME.swarmSize[0] + Math.floor(Math.random() * (GAME.swarmSize[1] - GAME.swarmSize[0] + 1));
      for (let j = 0; j < groupSize; j++) queue.push(actual);
    } else {
      queue.push(type);
    }
  }

  const interval = spawnInterval(wave);
  const eventSpeedMult = event?.speedMult || 1.0;
  const eventDesperateChance = event?.desperateChance || 0;

  return { enemies: queue, interval, event, eventSpeedMult, eventDesperateChance };
}


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
        const signDmg = (upgrades.C6 || 0) * 5;
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
          const knockback = tDef.knockback * (1 + (upgrades.C9 || 0) * 0.5);
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
        // C16: Cactus Pot (3 dps per stack while adjacent)
        const cactusDPS = (upgrades.C16 || 0) * 3;
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
    this.maxSlots = 20; // reasonable max towers on field
    this.costMult = 1.0; // R14 reduces this
  }

  towerCost(type) {
    return Math.ceil(GAME.towers[type].cost * this.costMult);
  }

  canBuy(type, coins) {
    return coins >= this.towerCost(type) && this.totalTowers < this.maxSlots;
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
      while (this.canBuy(type, coins - spent - 15)) {
        spent += this.buy(type);
      }
    }
    return spent;
  }

  _balanced(coins, wave) {
    let spent = 0;
    // Wave 1: 1 magnet + 1 ubik (95 - 15 - 40 = 40 left)
    if (wave === 1) {
      if (this.canBuy('coinmagnet', coins - spent)) spent += this.buy('coinmagnet');
      if (this.canBuy('ubik', coins - spent)) spent += this.buy('ubik');
      return spent;
    }
    // Wave 3: add wet floor
    if (wave >= 3 && this.towers.wetfloor < 2 && this.canBuy('wetfloor', coins - spent)) {
      spent += this.buy('wetfloor');
    }
    // Wave 5+: add mops
    if (wave >= 5 && this.canBuy('mop', coins - spent)) {
      spent += this.buy('mop');
    }
    // Wave 7+: add pot plants
    if (wave >= 7 && this.towers.potplant < 3 && this.canBuy('potplant', coins - spent)) {
      spent += this.buy('potplant');
    }
    // General: buy 1 combat tower per wave if affordable
    if (wave > 3) {
      const priority = ['ubik', 'mop', 'wetfloor'];
      for (const type of priority) {
        if (this.canBuy(type, coins - spent - 20)) {
          spent += this.buy(type);
          break;
        }
      }
    }
    // Second magnet around wave 8
    if (wave >= 8 && this.towers.coinmagnet < 2 && this.canBuy('coinmagnet', coins - spent)) {
      spent += this.buy('coinmagnet');
    }
    return spent;
  }

  _economy(coins, wave) {
    let spent = 0;
    // Rush magnets first (up to 3)
    if (this.towers.coinmagnet < 3 && this.canBuy('coinmagnet', coins - spent)) {
      spent += this.buy('coinmagnet');
    }
    // Then cheap defenses
    if (wave >= 3 && this.canBuy('potplant', coins - spent)) {
      spent += this.buy('potplant');
    }
    // Combat from wave 5+
    if (wave >= 5) {
      const priority = ['mop', 'ubik', 'wetfloor'];
      for (const type of priority) {
        if (this.canBuy(type, coins - spent)) {
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
    if (wave >= 1 && this.towers.potplant < 4 && this.canBuy('potplant', coins - spent)) {
      spent += this.buy('potplant');
    }
    if (wave >= 3 && this.towers.wetfloor < 4 && this.canBuy('wetfloor', coins - spent)) {
      spent += this.buy('wetfloor');
    }
    // Add mops for knockback
    if (wave >= 5 && this.canBuy('mop', coins - spent)) {
      spent += this.buy('mop');
    }
    // Magnet eventually
    if (wave >= 6 && this.towers.coinmagnet < 1 && this.canBuy('coinmagnet', coins - spent)) {
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
      if (this.canBuy(type, coins - spent)) {
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

    // Mop: damage / cooldown
    const mopCdMult = 1 - (upgrades.C8 || 0) * 0.3;
    dps += t.mop * (GAME.towers.mop.damage / (GAME.towers.mop.cooldown * mopCdMult));

    // Ubik: damage * (spray_duration / cycle_time) — hits multiple enemies
    const ubikDmgMult = 1 + (upgrades.C13 || 0) * 0.4;
    const ubikCdMult = 1 - (upgrades.C14 || 0) * 0.25;
    const ubikCycle = GAME.towers.ubik.cooldown * ubikCdMult + GAME.towers.ubik.sprayDuration;
    const ubikDPS = (GAME.towers.ubik.damage * ubikDmgMult * GAME.towers.ubik.sprayDuration) / ubikCycle;
    // Ubik hits ~2-3 enemies per spray (AoE bonus)
    dps += t.ubik * ubikDPS * 2.0;

    // Pot plant: trip damage / (stun + re-approach time)
    dps += t.potplant * (GAME.towers.potplant.damage / 4);

    // Cactus Pot DPS
    dps += t.potplant * (upgrades.C16 || 0) * 3;

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
    if (wave <= 5) return ['common', 'common', 'common'];
    if (wave <= 10) {
      const slot3 = Math.random() < 0.7 ? 'common' : 'rare';
      return ['common', 'rare', slot3];
    }
    if (wave <= 15) {
      const r = Math.random();
      const slot3 = r < 0.5 ? 'common' : r < 0.9 ? 'rare' : 'legendary';
      return ['common', 'rare', slot3];
    }
    // Wave 16+
    const r = Math.random();
    const slot3 = r < 0.4 ? 'common' : r < 0.75 ? 'rare' : 'legendary';
    return ['common', 'rare', slot3];
  }

  pick(upgrade) {
    this.acquired[upgrade.id] = (this.acquired[upgrade.id] || 0) + 1;
  }

  /**
   * Simple AI: pick the "best" upgrade based on a value heuristic.
   */
  pickBest(options, towers) {
    if (options.length === 0) return null;

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
      if (['coinValueMult', 'payday', 'tipJar', 'towerCostMult', 'goldenMagnet'].includes(opt.effect)) score += 20;

      // DPS upgrades scale with tower count
      if (['ubikDamage', 'ubikCooldown', 'mopCooldown'].includes(opt.effect)) {
        score += 10 * (towers.mop + towers.ubik);
      }

      // Synergies are great if you have both towers
      if (opt.effect.startsWith('synergy')) score += 12;

      // HP/durability less valuable
      if (['magnetHP', 'signHP', 'mopHP'].includes(opt.effect)) score += 3;

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
      const avgSpeed = 3.5 * (1 + wave * 0.015);
      const traverseTime = GAME.traverseDistance / avgSpeed;
      const totalKillCapacity = dps * (waveData.enemies.length * waveData.interval + traverseTime);
      const killPct = Math.min(100, Math.round(totalKillCapacity / totalHP * 100));
      line += pad(dps.toFixed(1) + '/' + killPct + '%', 15);

      if (i === 2) balancedDPS = dps; // "Balanced" loadout
    }

    // Ratio: balanced DPS relative to wave HP per second
    const avgSpeed = 3.5 * (1 + wave * 0.015);
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
            if (picked.effect === 'towerCostMult') towerAI.costMult = 0.8;
            if (picked.effect === 'doorHPBoost') { doorMaxHP += 4; doorHP = doorMaxHP; }
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
        const avgSpeed = 3.5 * (1 + wave * 0.015) * (waveData.eventSpeedMult || 1.0);
        const traverseTime = GAME.traverseDistance / avgSpeed;
        const spawnDuration_ = enemies.length * waveData.interval;
        const waveDuration_ = spawnDuration_ + traverseTime;

        // Slow towers add effective time (enemies in range longer)
        const slowBonus = towerAI.towers.wetfloor > 0 ? 1.25 : 1.0;
        // L12: Overtime (first 5s = 3x tower speed)
        const overtimeBonus = upgrader.acquired.L12 ? (1 + 2.0 * Math.min(5, waveDuration_) / waveDuration_) : 1.0;
        // L2: Desperate Measures (2x damage below 50% door HP)
        const desperateBonus = (upgrader.acquired.L2 && doorHP < doorMaxHP * 0.5) ? 2.0 : 1.0;
        // R16: Crossfire bonus (estimate 30% of enemies hit by 2+ types)
        const crossfireBonus = upgrader.acquired.R16 ? 1.12 : 1.0;

        const effectiveDPS = dps * slowBonus * overtimeBonus * desperateBonus * crossfireBonus;
        const totalDamageCapacity = effectiveDPS * waveDuration_;

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

        coins += collected + waveBonus(wave);
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
  console.log('\n  RARITY DISTRIBUTION BY WAVE BRACKET:\n');
  console.log('  Waves 1-5:   [Common, Common, Common]');
  console.log('  Waves 6-10:  [Common, Rare, 70%C/30%R]');
  console.log('  Waves 11-15: [Common, Rare, 50%C/40%R/10%L]');
  console.log('  Waves 16+:   [Common, Rare, 40%C/35%R/25%L]');

  // Expected legendary by wave
  console.log('\n\n  EXPECTED LEGENDARY UPGRADES BY WAVE:\n');
  let cumLegendaryChance = 0;
  for (let wave = 1; wave <= 50; wave++) {
    let legendaryProb = 0;
    if (wave <= 5) legendaryProb = 0;
    else if (wave <= 10) legendaryProb = 0;
    else if (wave <= 15) legendaryProb = 0.10;
    else legendaryProb = 0.25;

    cumLegendaryChance += legendaryProb;

    if (wave % 5 === 0 || wave <= 15) {
      console.log(`  Wave ${pad(wave, 2)}: ${(legendaryProb * 100).toFixed(0)}% per wave, expected legendaries by now: ${cumLegendaryChance.toFixed(1)}`);
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
    { name: 'Wet Floor + Ubik (R1 Wet & Soapy)', desc: 'Slowed enemies take 2x Ubik damage. Stack with C5 (deeper slow) + C13 (more Ubik dmg).' },
    { name: 'Mop + Knockback (C9 + L8 + L4)', desc: 'Heavy Mop + Nuclear Mop + Rush Hour Pileup = massive knockback + collision damage.' },
    { name: 'Economy Engine (C2 + R12 + R13 + L10)', desc: 'Double Dip + Payday + Tip Jar + Golden Magnet = exponential coin scaling.' },
    { name: 'Pot Plant Chaos (C15 + C16 + R10 + L5)', desc: 'Spring-Loaded + Cactus + Chain Trip + Domino = self-sustaining trip chain.' },
    { name: 'Tower Spam (R14 + Economy Engine)', desc: 'Clearance Sale + income = tower count snowball.' },
    { name: 'Defensive (L1 + L2 + L3)', desc: 'Double Flush + Desperate Measures + Plunger Protocol = door becomes a weapon.' },
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
    { id: 'C7', dps: 3.3, note: '180 arc = 3x enemies hit per sweep' },
    { id: 'C8', dps: 2.8, note: '-30% cooldown = +43% DPS per mop' },
    { id: 'C13', dps: 2.7, note: '+40% Ubik damage per stack' },
    { id: 'C14', dps: 2.1, note: '-25% Ubik cooldown per stack' },
    { id: 'C5', dps: 1.5, note: 'Deeper slow = more time in range for all towers' },
    { id: 'C16', dps: 3.0, note: '3 DPS per stack, passive, stacks to 9' },
    { id: 'R1', dps: 6.7, note: '2x Ubik damage to slowed targets — huge' },
    { id: 'R7', dps: 4.0, note: '+8 damage per mop sweep through Ubik' },
    { id: 'R16', dps: 5.0, note: '40% bonus when hit by 2+ types — universal amplifier' },
    { id: 'L2', dps: 8.0, note: '2x ALL tower damage below 50% door HP — clutch savior' },
    { id: 'L8', dps: 7.0, note: '4x knockback = massive time gained + wall collision damage' },
    { id: 'L12', dps: 6.0, note: '3x tower speed + 0.5x enemy speed for 5s = huge burst' },
    { id: 'C2', dps: 0, note: 'Economy: +50% coin value, not direct DPS' },
    { id: 'R12', dps: 0, note: 'Economy: +50% coins near magnets' },
    { id: 'R14', dps: 0, note: 'Economy: -20% tower costs' },
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

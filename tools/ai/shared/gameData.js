#!/usr/bin/env node
/**
 * GAME DATA — exact mirror of index.html values
 * Extracted from balance-sim.js for shared use across AI tools.
 */

const GAME = {
  startingCoins: 60,
  doorMaxHP: 100,
  gridCell: 2,
  laneWidth: 30,
  laneLength: 70,
  spawnZoneZ: 69,
  toiletZ: 3,
  // Per-scenario layout — door Z varies by scenario (enemies stop at doorZ + 1.5)
  scenarioLayout: {
    office:   { doorZ: 9,   wallEnemyCount: 7, wallType: 'polite' },
    forest:   { doorZ: 5.5, wallEnemyCount: 7, wallType: 'deer' },
    ocean:    { doorZ: 5.5, wallEnemyCount: 7, wallType: 'dolphin' },
    airplane: { doorZ: 8,   wallEnemyCount: 6, wallType: 'nervous' },
  },
  // Per-scenario traversal distance (spawnZoneZ - (doorZ + 1.5))
  traverseDistanceForScenario(scenario) {
    const layout = this.scenarioLayout[scenario] || this.scenarioLayout.office;
    return this.spawnZoneZ - (layout.doorZ + 1.5);
  },
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
    polite:      { name: 'Polite Knocker',   baseSpeed: 3.0, speedVar: 0.5, baseHP: 14, hpPerWave: 16, coins: 5,  doorDmg: 2, flankChance: 0.15, scenario: 'office', archetype: 'basic' },
    dancer:      { name: 'Pee Dancer',       baseSpeed: 5.5, speedVar: 1.0, baseHP: 7, hpPerWave: 6,  coins: 3,  doorDmg: 1, flankChance: 0.60, scenario: 'office', archetype: 'fast', canJumpBarrier: true },
    waddle:      { name: 'Waddle Tank',      baseSpeed: 2.0, speedVar: 0.3, baseHP: 60, hpPerWave: 28, coins: 12, doorDmg: 4, flankChance: 0.10, scenario: 'office', archetype: 'tank', panicThreshold: 0.5 },
    panicker:    { name: 'Panicker',         baseSpeed: 4.0, speedVar: 0.5, baseHP: 40, hpPerWave: 18, coins: 10, doorDmg: 2, flankChance: 0.40, scenario: 'office', archetype: 'support', speedAuraRange: 8, speedAuraBonus: 0.5 },
    powerwalker: { name: 'Power Walker',     baseSpeed: 3.5, speedVar: 0.3, baseHP: 30, hpPerWave: 16, coins: 7,  doorDmg: 2, flankChance: 0.70, scenario: 'office', archetype: 'immune', slowImmune: true },
    girls:       { name: 'The Girls',        baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 4,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'office', archetype: 'swarm' },
    // Forest
    deer:        { name: 'Deer',             baseSpeed: 3.0, speedVar: 0.5, baseHP: 14, hpPerWave: 16, coins: 5,  doorDmg: 2, flankChance: 0.20, scenario: 'forest', archetype: 'basic' },
    squirrel:    { name: 'Squirrel',         baseSpeed: 5.5, speedVar: 1.0, baseHP: 7, hpPerWave: 6,  coins: 3,  doorDmg: 1, flankChance: 0.55, scenario: 'forest', archetype: 'fast', canJumpBarrier: true },
    bear:        { name: 'Bear',             baseSpeed: 2.0, speedVar: 0.3, baseHP: 65, hpPerWave: 30, coins: 14, doorDmg: 5, flankChance: 0.08, scenario: 'forest', archetype: 'tank', panicThreshold: 0.5 },
    fox:         { name: 'Fox',              baseSpeed: 4.0, speedVar: 0.5, baseHP: 40, hpPerWave: 18, coins: 10, doorDmg: 2, flankChance: 0.45, scenario: 'forest', archetype: 'support', speedAuraRange: 8, speedAuraBonus: 0.5 },
    moose:       { name: 'Moose',            baseSpeed: 3.5, speedVar: 0.3, baseHP: 35, hpPerWave: 18, coins: 8,  doorDmg: 3, flankChance: 0.60, scenario: 'forest', archetype: 'immune', slowImmune: true },
    raccoon:     { name: 'Raccoon',          baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 4,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'forest', archetype: 'swarm' },
    // Ocean
    dolphin:     { name: 'Dolphin',          baseSpeed: 3.0, speedVar: 0.5, baseHP: 15, hpPerWave: 16, coins: 5,  doorDmg: 2, flankChance: 0.20, scenario: 'ocean', archetype: 'basic' },
    flyfish:     { name: 'Flying Fish',      baseSpeed: 5.5, speedVar: 1.0, baseHP: 7, hpPerWave: 6,  coins: 3,  doorDmg: 1, flankChance: 0.60, scenario: 'ocean', archetype: 'fast', canJumpBarrier: true },
    shark:       { name: 'Shark',            baseSpeed: 2.0, speedVar: 0.3, baseHP: 70, hpPerWave: 34, coins: 15, doorDmg: 5, flankChance: 0.08, scenario: 'ocean', archetype: 'tank', panicThreshold: 0.5 },
    pirate:      { name: 'Pirate',           baseSpeed: 4.0, speedVar: 0.5, baseHP: 42, hpPerWave: 20, coins: 11, doorDmg: 3, flankChance: 0.40, scenario: 'ocean', archetype: 'support', speedAuraRange: 8, speedAuraBonus: 0.5 },
    seaturtle:   { name: 'Sea Turtle',       baseSpeed: 3.5, speedVar: 0.3, baseHP: 38, hpPerWave: 18, coins: 8,  doorDmg: 2, flankChance: 0.55, scenario: 'ocean', archetype: 'immune', slowImmune: true },
    jellyfish:   { name: 'Jellyfish',        baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 4,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'ocean', archetype: 'swarm' },
    // Airplane
    nervous:     { name: 'Nervous Flyer',    baseSpeed: 3.0, speedVar: 0.5, baseHP: 14, hpPerWave: 16, coins: 5,  doorDmg: 2, flankChance: 0.15, scenario: 'airplane', archetype: 'basic' },
    business:    { name: 'Business Class',   baseSpeed: 3.5, speedVar: 0.3, baseHP: 35, hpPerWave: 18, coins: 8,  doorDmg: 2, flankChance: 0.60, scenario: 'airplane', archetype: 'immune', knockbackImmune: true },
    stumbler:    { name: 'Turb. Stumbler',   baseSpeed: 2.0, speedVar: 0.3, baseHP: 55, hpPerWave: 24, coins: 12, doorDmg: 4, flankChance: 0.10, scenario: 'airplane', archetype: 'tank', panicThreshold: 0.5, barrierBust: true },
    attendant:   { name: 'Flight Attendant', baseSpeed: 5.0, speedVar: 1.0, baseHP: 10, hpPerWave: 8,  coins: 4,  doorDmg: 1, flankChance: 0.50, scenario: 'airplane', archetype: 'fast', canJumpBarrier: true, sprayResist: 0.5 },
    marshal:     { name: 'Air Marshal',      baseSpeed: 3.5, speedVar: 0.3, baseHP: 40, hpPerWave: 20, coins: 10, doorDmg: 3, flankChance: 0.50, scenario: 'airplane', archetype: 'support', slowImmune: true, magnetDisableRange: 6, speedAuraRange: 6, speedAuraBonus: 0.3 },
    unruly:      { name: 'Unruly Passengers',baseSpeed: 3.0, speedVar: 0.3, baseHP: 8,  hpPerWave: 4,  coins: 2,  doorDmg: 1, flankChance: 0.30, scenario: 'airplane', archetype: 'swarm', tripImmune: true },
    // Jumpers (all scenarios)
    vaulter:     { name: 'Office Parkour',   baseSpeed: 2.0, speedVar: 0.3, baseHP: 40, hpPerWave: 18, coins: 9,  doorDmg: 3, flankChance: 0.30, scenario: 'office', archetype: 'jumper', canJumpTower: true },
    kangaroo:    { name: 'Kangaroo',         baseSpeed: 2.2, speedVar: 0.3, baseHP: 45, hpPerWave: 20, coins: 10, doorDmg: 3, flankChance: 0.25, scenario: 'forest', archetype: 'jumper', canJumpTower: true },
    frog:        { name: 'Tree Frog',        baseSpeed: 2.0, speedVar: 0.3, baseHP: 42, hpPerWave: 20, coins: 9,  doorDmg: 3, flankChance: 0.30, scenario: 'ocean', archetype: 'jumper', canJumpTower: true },
    hurdler:     { name: 'Olympic Hurdler',  baseSpeed: 2.2, speedVar: 0.3, baseHP: 40, hpPerWave: 18, coins: 9,  doorDmg: 3, flankChance: 0.35, scenario: 'airplane', archetype: 'jumper', canJumpTower: true },
    // Trains (all scenarios)
    drunk:       { name: 'Drunken Worker',   baseSpeed: 2.5, speedVar: 0.4, baseHP: 20, hpPerWave: 12, coins: 3,  doorDmg: 2, flankChance: 0.15, scenario: 'office', archetype: 'train' },
    ant:         { name: 'Giant Ant',        baseSpeed: 4.0, speedVar: 0.3, baseHP: 12, hpPerWave: 8,  coins: 2,  doorDmg: 1, flankChance: 0.10, scenario: 'forest', archetype: 'train' },
    seahorse:    { name: 'Sea Horse',        baseSpeed: 2.8, speedVar: 0.2, baseHP: 10, hpPerWave: 6,  coins: 2,  doorDmg: 1, flankChance: 0.00, scenario: 'ocean', archetype: 'train' },
    trolley:     { name: 'Drinks Trolley',   baseSpeed: 1.8, speedVar: 0.2, baseHP: 65, hpPerWave: 26, coins: 12, doorDmg: 5, flankChance: 0.00, scenario: 'airplane', archetype: 'train', knockbackImmune: true },
  },

  // ── COIN DROPS ──────────────────────────────────────────────────────────
  coinDrops: {
    polite: { value: 2, count: 2 }, dancer: { value: 2, count: 1 }, waddle: { value: 5, count: 3 },
    panicker: { value: 4, count: 2 }, powerwalker: { value: 3, count: 2 }, girls: { value: 1, count: 1 },
    deer: { value: 2, count: 2 }, squirrel: { value: 2, count: 1 }, bear: { value: 5, count: 3 },
    fox: { value: 4, count: 2 }, moose: { value: 3, count: 2 }, raccoon: { value: 1, count: 1 },
    dolphin: { value: 2, count: 2 }, flyfish: { value: 2, count: 1 }, shark: { value: 6, count: 3 },
    pirate: { value: 5, count: 2 }, seaturtle: { value: 3, count: 2 }, jellyfish: { value: 1, count: 1 },
    nervous: { value: 2, count: 2 }, business: { value: 3, count: 2 }, stumbler: { value: 5, count: 3 },
    attendant: { value: 2, count: 1 }, marshal: { value: 4, count: 2 }, unruly: { value: 1, count: 1 },
    vaulter: { value: 3, count: 2 }, kangaroo: { value: 4, count: 2 }, frog: { value: 3, count: 2 }, hurdler: { value: 3, count: 2 },
    drunk: { value: 2, count: 1 }, ant: { value: 1, count: 1 }, seahorse: { value: 1, count: 1 }, trolley: { value: 6, count: 3 },
  },

  trainSizes: { drunk: [6,8], ant: [8,10], seahorse: [6,8], trolley: [3,4] },
  swarmSize: [5, 7], // min, max
  wallSpawn: { startWave: 5, chanceBase: 0.08, chancePerWave: 0.03, chanceCap: 0.8, maxWallsFormula: 'Math.min(3, 1 + Math.floor((wave - 5) / 10))' },

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
      25: { name: 'COFFEE KICKED IN', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.5, desperateChance: 0.6 },
      30: { name: 'FOOD POISONING', enemyMult: 3.5, spawnMult: 0.3, weights: { waddle: 0.25, panicker: 0.20, dancer: 0.20, polite: 0.15, vaulter: 0.10, girls_group: 0.10 } },
      35: { name: 'WING NIGHT', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.4, weights: { waddle: 0.35, polite: 0.18, powerwalker: 0.15, dancer: 0.12, panicker: 0.10, vaulter: 0.10 } },
      40: { name: 'FIRE DRILL', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.6, desperateChance: 0.8 },
      45: { name: 'CHILI COOK-OFF', enemyMult: 4.0, spawnMult: 0.25, weights: { waddle: 0.35, panicker: 0.30, powerwalker: 0.15, dancer: 0.10, girls_group: 0.10 } },
      50: { name: 'BLACK FRIDAY', enemyMult: 5.0, spawnMult: 0.15, speedMult: 1.8, desperateChance: 0.5 },
    },
    forest: {
      15: { name: 'BERRY SEASON', enemyMult: 2.5, spawnMult: 0.5, weights: { bear: 0.35, deer: 0.20, squirrel: 0.20, fox: 0.06, moose: 0.10, raccoon_group: 0.05, ant_train: 0.04 } },
      20: { name: 'MIGRATION', enemyMult: 3.0, spawnMult: 0.4, weights: { deer: 0.35, moose: 0.25, squirrel: 0.16, fox: 0.10, bear: 0.05, raccoon_group: 0.05, ant_train: 0.04 } },
      25: { name: 'FULL MOON', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.5, desperateChance: 0.6 },
      30: { name: 'FOREST FIRE', enemyMult: 3.5, spawnMult: 0.3, weights: { bear: 0.25, fox: 0.20, squirrel: 0.20, deer: 0.15, kangaroo: 0.10, raccoon_group: 0.10 } },
      35: { name: 'HIBERNATION PANIC', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.4, weights: { bear: 0.35, deer: 0.18, moose: 0.15, squirrel: 0.12, fox: 0.10, kangaroo: 0.10 } },
      40: { name: 'STAMPEDE', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.6, desperateChance: 0.8 },
    },
    ocean: {
      15: { name: 'FEEDING FRENZY', enemyMult: 2.5, spawnMult: 0.5, weights: { shark: 0.35, dolphin: 0.20, flyfish: 0.16, pirate: 0.10, seaturtle: 0.10, jellyfish_group: 0.05, seahorse_train: 0.04 } },
      20: { name: 'TIDAL WAVE', enemyMult: 3.0, spawnMult: 0.4, weights: { dolphin: 0.30, seaturtle: 0.21, flyfish: 0.20, pirate: 0.10, shark: 0.10, jellyfish_group: 0.05, seahorse_train: 0.04 } },
      25: { name: 'BLOOD MOON', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.5, desperateChance: 0.6 },
      30: { name: 'PIRATE ARMADA', enemyMult: 3.5, spawnMult: 0.3, weights: { pirate: 0.35, shark: 0.20, flyfish: 0.15, dolphin: 0.10, seaturtle: 0.10, frog: 0.05, jellyfish_group: 0.05 } },
      35: { name: 'KRAKEN STIRS', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.4, weights: { shark: 0.30, seaturtle: 0.18, pirate: 0.18, dolphin: 0.12, frog: 0.12, jellyfish_group: 0.10 } },
      40: { name: 'MAELSTROM', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.6, desperateChance: 0.8 },
    },
    airplane: {
      15: { name: 'TURBULENCE', enemyMult: 2.5, spawnMult: 0.5, weights: { stumbler: 0.35, nervous: 0.20, business: 0.16, attendant: 0.10, marshal: 0.10, unruly_group: 0.05, trolley_train: 0.04 } },
      20: { name: 'MEAL SERVICE', enemyMult: 3.0, spawnMult: 0.4, weights: { nervous: 0.30, business: 0.25, stumbler: 0.15, attendant: 0.11, marshal: 0.10, unruly_group: 0.05, trolley_train: 0.04 } },
      25: { name: 'SEATBELT OFF', enemyMult: 2.5, spawnMult: 0.35, speedMult: 1.5, desperateChance: 0.6 },
      30: { name: 'BAD FISH', enemyMult: 3.5, spawnMult: 0.3, weights: { stumbler: 0.30, nervous: 0.20, attendant: 0.15, business: 0.15, hurdler: 0.10, unruly_group: 0.10 } },
      35: { name: 'DUTY FREE', enemyMult: 3.0, spawnMult: 0.3, speedMult: 1.4, weights: { business: 0.25, nervous: 0.22, marshal: 0.18, attendant: 0.13, hurdler: 0.12, stumbler: 0.10 } },
      40: { name: 'EMERGENCY LANDING', enemyMult: 4.0, spawnMult: 0.2, speedMult: 1.6, desperateChance: 0.8 },
      45: { name: 'OPEN BAR', enemyMult: 4.0, spawnMult: 0.25, weights: { unruly_group: 0.30, stumbler: 0.25, nervous: 0.20, business: 0.15, attendant: 0.10 } },
      50: { name: 'FINAL DESCENT', enemyMult: 5.0, spawnMult: 0.15, speedMult: 1.8, desperateChance: 0.5 },
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

  // Curated wave draw pool — weighted random draws (mirrors game's ENEMY_DRAW_POOL)
  enemyDrawPool: {
    office: [
      { type: 'polite',       weight: 1.0,  unlocksAt: 1 },
      { type: 'dancer',       weight: 0.8,  unlocksAt: 3 },
      { type: 'waddle',       weight: 0.4,  unlocksAt: 5 },
      { type: 'panicker',     weight: 0.3,  unlocksAt: 7 },
      { type: 'drunk_train',  weight: 0.1,  unlocksAt: 8 },
      { type: 'powerwalker',  weight: 0.45, unlocksAt: 9 },
      { type: 'girls_group',  weight: 0.12, unlocksAt: 10 },
    ],
    forest: [
      { type: 'deer',           weight: 1.0,  unlocksAt: 1 },
      { type: 'squirrel',       weight: 0.8,  unlocksAt: 3 },
      { type: 'bear',           weight: 0.4,  unlocksAt: 5 },
      { type: 'fox',            weight: 0.3,  unlocksAt: 7 },
      { type: 'ant_train',      weight: 0.1,  unlocksAt: 8 },
      { type: 'moose',          weight: 0.45, unlocksAt: 9 },
      { type: 'raccoon_group',  weight: 0.12, unlocksAt: 10 },
    ],
    ocean: [
      { type: 'dolphin',          weight: 1.0,  unlocksAt: 1 },
      { type: 'flyfish',          weight: 0.8,  unlocksAt: 3 },
      { type: 'shark',            weight: 0.4,  unlocksAt: 5 },
      { type: 'pirate',           weight: 0.3,  unlocksAt: 7 },
      { type: 'seahorse_train',   weight: 0.1,  unlocksAt: 8 },
      { type: 'seaturtle',        weight: 0.45, unlocksAt: 9 },
      { type: 'jellyfish_group',  weight: 0.12, unlocksAt: 10 },
    ],
    airplane: [
      { type: 'nervous',        weight: 1.0,  unlocksAt: 1 },
      { type: 'business',       weight: 0.8,  unlocksAt: 3 },
      { type: 'stumbler',       weight: 0.4,  unlocksAt: 5 },
      { type: 'attendant',      weight: 0.3,  unlocksAt: 7 },
      { type: 'trolley_train',  weight: 0.1,  unlocksAt: 8 },
      { type: 'marshal',        weight: 0.45, unlocksAt: 9 },
      { type: 'unruly_group',   weight: 0.12, unlocksAt: 10 },
    ],
  },

  // Last Straw mechanic — 20% chance of desperate final lunge when killed near toilet
  lastStraw: { chance: 0.2, zThreshold: 25, speedMult: 3.0, duration: 1.0 },

  // ── UPGRADES ────────────────────────────────────────────────────────────
  upgrades: [
    // Common (20)
    { id: 'C1', name: 'Overclocked Magnet', rarity: 'common', tower: 'coinmagnet', maxStacks: 1, effect: 'coinShockwave', shockBaseDmg: 3, shockPerUpgrade: 1.5, shockAoE: 6, value: 12, bonusHP: 2, exclusive: 'C20' },
    { id: 'C2', name: 'Double Dip', rarity: 'common', tower: 'coinmagnet', maxStacks: 1, effect: 'coinValueMult', value: 0.5 },
    { id: 'C3', name: 'Magnet Durability', rarity: 'common', tower: 'coinmagnet', maxStacks: 3, effect: 'coinResonance', value: 5, resonanceBase: 0.005, resonancePerStack: 0.0025, resonanceCap: 5.0 },
    { id: 'C4', name: 'Reinforced Signs', rarity: 'common', tower: 'wetfloor', maxStacks: 3, effect: 'signHP', value: 1.2 },
    { id: 'C5', name: 'Extra Slippery', rarity: 'common', tower: 'wetfloor', maxStacks: 1, effect: 'slowFactor', value: 0.15, signZoneDPS: true },
    { id: 'C6', name: 'Prickly Signs', rarity: 'common', tower: 'wetfloor', maxStacks: 3, effect: 'signDamage', value: 10 },
    { id: 'C7', name: 'Industrial Mop Head', rarity: 'common', tower: 'mop', maxStacks: 1, effect: 'mopArc', value: 3.0, exclusive: 'C9' },
    { id: 'C8', name: 'Quick Sweep', rarity: 'common', tower: 'mop', maxStacks: 2, effect: 'mopCooldown', value: -0.3 },
    { id: 'C9', name: 'Heavy Mop', rarity: 'common', tower: 'mop', maxStacks: 2, effect: 'mopKnockback', value: 0.75, mopRetrigger: true, exclusive: 'C7' },
    { id: 'C10', name: 'Extra Absorbent', rarity: 'common', tower: 'mop', maxStacks: 3, effect: 'mopHP', value: 4 },
    { id: 'C11', name: 'Pressure Washer', rarity: 'common', tower: 'ubik', maxStacks: 1, effect: 'ubikNarrow', value: 1, damageMult: 1.35, exclusive: 'C12' },
    { id: 'C12', name: 'Wide Spray', rarity: 'common', tower: 'ubik', maxStacks: 1, effect: 'ubikWide', value: 1.8, exclusive: 'C11' },
    { id: 'C13', name: 'Corrosive Formula', rarity: 'common', tower: 'ubik', maxStacks: 2, effect: 'ubikDamage', value: 0.4, exclusive: 'C14' },
    { id: 'C14', name: 'Rapid Spray', rarity: 'common', tower: 'ubik', maxStacks: 2, effect: 'ubikCooldown', value: -0.25, exclusive: 'C13' },
    { id: 'C15', name: 'Spring-Loaded Pot', rarity: 'common', tower: 'potplant', maxStacks: 1, effect: 'potBounce', value: 1, exclusive: 'C16' },
    { id: 'C16', name: 'Cactus Pot', rarity: 'common', tower: 'potplant', maxStacks: 1, effect: 'potDPS', value: 2, scaling: 'pot', potRetrigger: true, exclusive: 'C15' },
    { id: 'C17', name: 'Glass Cannon', rarity: 'common', tower: null, maxStacks: 1, effect: 'glassCannon', value: 1, exclusive: 'C18' },
    { id: 'C18', name: 'Slow and Steady', rarity: 'common', tower: null, maxStacks: 1, effect: 'slowSteady', value: 1, exclusive: 'C17' },
    { id: 'C19', name: 'Bargain Bin', rarity: 'common', tower: 'potplant', maxStacks: 1, effect: 'bargainBin', value: 1 },
    { id: 'C20', name: 'Static Charge', rarity: 'common', tower: 'coinmagnet', maxStacks: 1, effect: 'staticChargeOnCollect', value: 3, exclusive: 'C1' },
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
    // Build-Defining Rares (R23-R32)
    { id: 'R23', name: 'Devotion', rarity: 'rare', tower: null, maxStacks: 1, effect: 'devotion', value: 0.6, buildDefining: true },
    { id: 'R24', name: 'Skeleton Crew', rarity: 'rare', tower: null, maxStacks: 1, effect: 'skeletonCrew', value: 0.25, exclusive: 'L13', buildDefining: true },
    { id: 'R25', name: 'Compound Interest', rarity: 'rare', tower: null, maxStacks: 1, effect: 'compoundInterest', value: 0.05, buildDefining: true },
    { id: 'R26', name: 'Controlled Demolition', rarity: 'rare', tower: null, maxStacks: 1, effect: 'controlledDemo', value: 0.08, buildDefining: true },
    { id: 'R27', name: 'Double Shift', rarity: 'rare', tower: null, maxStacks: 1, effect: 'doubleShift', value: 1.4, buildDefining: true },
    { id: 'R28', name: 'Danger Pay', rarity: 'rare', tower: null, maxStacks: 1, effect: 'dangerPay', value: 0.5, buildDefining: true },
    { id: 'R29', name: 'Contagion', rarity: 'rare', tower: ['wetfloor'], maxStacks: 1, effect: 'contagion', value: 0.5, buildDefining: true },
    { id: 'R30', name: 'Sympathetic Damage', rarity: 'rare', tower: null, maxStacks: 1, effect: 'sympatheticDmg', value: 0.08, buildDefining: true },
    { id: 'R31', name: 'Rush Defense', rarity: 'rare', tower: null, maxStacks: 1, effect: 'rushDefense', value: 2.5, exclusive: 'R32', buildDefining: true },
    { id: 'R32', name: 'Attrition', rarity: 'rare', tower: null, maxStacks: 1, effect: 'attrition', value: 0.04, exclusive: 'R31', buildDefining: true },
    // Chase Cards — Specialist Rares (R33-R35): ungated, always offered, scale with investment
    { id: 'R33', name: "Plumber's Union", rarity: 'rare', tower: null, maxStacks: 1, effect: 'plumbersUnion', baseMult: 1.5, perUpgradeMult: 0.1, cap: 2.5, buildDefining: true },
    { id: 'R34', name: 'Terracotta Army', rarity: 'rare', tower: null, maxStacks: 1, effect: 'terracottaArmy', baseMult: 1.4, perUpgradeMult: 0.15, buildDefining: true },
    { id: 'R35', name: 'Money Printer', rarity: 'rare', tower: null, maxStacks: 1, effect: 'moneyPrinter', baseStackCap: 30, perUpgradeCapBonus: 5, buildDefining: true },
    // Legendary (18)
    { id: 'L1', name: 'Double Flush', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'doorHPBoost', value: 4 },
    { id: 'L2', name: 'Desperate Measures', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'desperateMeasures', value: 1 },
    { id: 'L3', name: 'Plunger Protocol', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'plungerProtocol', value: 3.0 },
    { id: 'L4', name: 'Rush Hour Pileup', rarity: 'legendary', tower: 'mop', maxStacks: 1, effect: 'pileup', value: 4, scaling: 'mop' },
    { id: 'L5', name: 'Domino Effect', rarity: 'legendary', tower: 'potplant', maxStacks: 1, effect: 'domino', value: 8, scaling: 'pot' },
    { id: 'L6', name: 'Spill Zone', rarity: 'legendary', tower: 'wetfloor', maxStacks: 1, effect: 'spillZone', value: 2, scaling: 'sign' },
    { id: 'L7', name: 'Loose Change', rarity: 'legendary', tower: 'coinmagnet', maxStacks: 1, effect: 'looseChange', value: 1, scaling: 'magnet' },
    { id: 'L8', name: 'Nuclear Mop', rarity: 'legendary', tower: 'mop', maxStacks: 1, effect: 'nuclearMop', value: 4, scaling: 'mop' },
    { id: 'L9', name: 'Ubik Flood', rarity: 'legendary', tower: 'ubik', maxStacks: 1, effect: 'ubikFlood', value: 1, scaling: 'ubik' },
    { id: 'L10', name: 'Golden Magnet', rarity: 'legendary', tower: 'coinmagnet', maxStacks: 1, effect: 'goldenMagnet', value: 0.2, scaling: 'magnet' },
    { id: 'L11', name: 'Bladder Burst', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'bladderBurst', value: 0.25 },
    { id: 'L12', name: 'Overtime', rarity: 'legendary', tower: 'wetfloor', maxStacks: 1, effect: 'overtime', value: 3, scaling: 'sign' },
    { id: 'L13', name: 'Minimalist', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'minimalist', value: 2.0, exclusive: 'R24' },
    { id: 'L14', name: 'Hoarder', rarity: 'legendary', tower: 'coinmagnet', maxStacks: 1, effect: 'hoarder', value: 0.10, cap: 0.80, scaling: 'magnet' },
    { id: 'L15', name: 'Chain Reaction', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'chainReaction', value: 12 },
    { id: 'L16', name: 'Loan Shark', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'loanShark', value: 60 },
    { id: 'L17', name: 'Assembly Line', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'assemblyLine', value: 0.2 },
    { id: 'L18', name: 'Last Stand', rarity: 'legendary', tower: null, maxStacks: 1, effect: 'lastStand', value: 3.0 },
  ],
};

module.exports = { GAME };

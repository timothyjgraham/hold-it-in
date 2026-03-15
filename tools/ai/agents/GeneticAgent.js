/**
 * GeneticAgent — genetic algorithm that evolves build plans using a 44-gene genome.
 *
 * Genome encoding (all float [0,1], interpreted at decision time):
 *   0-4:   tower type weights (buying priority for coinmagnet, wetfloor, mop, ubik, potplant)
 *   5-9:   tower count targets (mapped to 0-8 range per type)
 *   10:    spending aggression (0=hoard, 1=spend everything)
 *   11:    economy vs DPS preference (0=DPS, 1=economy)
 *   12-31: per-upgrade-category scoring offsets (20 categories)
 *   32-35: timing params (when to start buying each tower type relative to wave)
 *   36-39: affinity for tower specialization
 *   40-41: sell threshold and reserve coins
 *   42-43: extra upgrade weighting params
 */

const { GAME } = require('../shared/gameData');

// Tower type keys in canonical order
const TOWER_TYPES = ['coinmagnet', 'wetfloor', 'mop', 'ubik', 'potplant'];

// Upgrade category classifier — maps upgrade effect to category index (0-19)
// Genes 12-31 correspond to categories 0-19
function upgradeCategory(upgrade) {
  const eff = upgrade.effect;
  const tower = upgrade.tower;

  // Common tower-specific
  if (upgrade.rarity === 'common') {
    if (tower === 'coinmagnet') return 0;    // gene 12
    if (tower === 'wetfloor') return 1;      // gene 13
    if (tower === 'mop') return 2;           // gene 14
    if (tower === 'ubik' || tower === 'potplant') return 3; // gene 15
    return 4; // gene 16: common general (glassCannon, slowSteady, etc.)
  }

  // Rare synergy / tower-specific
  if (upgrade.rarity === 'rare') {
    if (upgrade.buildDefining) {
      // Build-defining rares
      if (['doubleShift', 'devotion'].includes(eff)) return 10; // gene 22
      if (['skeletonCrew', 'rushDefense', 'attrition'].includes(eff)) return 11; // gene 23
      if (['compoundInterest', 'dangerPay', 'contagion', 'sympatheticDmg', 'controlledDemo'].includes(eff)) return 12; // gene 24
      return 10; // fallback build-defining
    }
    if (eff && eff.startsWith('synergy')) return 5; // gene 17: rare synergy
    if (Array.isArray(tower)) return 6;              // gene 18: rare multi-tower
    if (tower !== null) return 7;                     // gene 19: rare single-tower
    if (['towerCostMult', 'tipJar', 'overkillBonus', 'insurance', 'recycler'].includes(eff)) return 9; // gene 21: rare economy
    return 8; // gene 20: rare general combat
  }

  // Legendary
  if (upgrade.rarity === 'legendary') {
    if (['chainReaction', 'assemblyLine', 'lastStand', 'desperateMeasures', 'pileup',
         'nuclearMop', 'domino'].includes(eff)) return 13; // gene 25: legendary combat
    if (['bladderBurst', 'spillZone', 'ubikFlood'].includes(eff)) return 14; // gene 26: legendary AoE
    if (['doorHPBoost', 'plungerProtocol', 'overtime'].includes(eff)) return 15; // gene 27: legendary utility
    if (['minimalist', 'hoarder', 'looseChange'].includes(eff)) return 16; // gene 28: legendary build
    if (['goldenMagnet', 'loanShark'].includes(eff)) return 17; // gene 29: legendary economy
    return 18; // gene 30: legendary other
  }

  return 19; // gene 31: fallback
}

class GeneticAgent {
  /**
   * @param {number[]} genome - 44-element float array, each in [0,1]
   */
  constructor(genome) {
    if (!genome || genome.length !== 44) {
      throw new Error('GeneticAgent requires a 44-element genome array');
    }
    this.genome = genome;
  }

  /**
   * Decide which towers to buy/sell this wave.
   * Uses genome weights to decide what to buy/sell.
   *
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {{ buys: string[], sells: string[] }}
   */
  decideTowers(state) {
    const { wave, coins, towers } = state;
    const g = this.genome;
    const buys = [];
    const sells = [];

    // Reserve coins (gene 40: 0-100 range)
    const reserve = g[40] * 100;
    let budget = coins - reserve;
    if (budget < 0) budget = 0;

    // Compute tower targets and priorities
    const candidates = [];
    for (let i = 0; i < TOWER_TYPES.length; i++) {
      const type = TOWER_TYPES[i];
      const tDef = GAME.towers[type];

      // Check unlock timing (gene 32-35 maps to wave threshold; coinmagnet always unlocked)
      // Gene 32 is for wetfloor, 33 for mop, 34 for ubik, 35 for potplant
      // coinmagnet has no timing gate
      if (i > 0) {
        const timingGene = g[31 + i]; // genes 32-35
        const minWave = timingGene * 15; // 0-15 wave range
        if (wave < minWave) continue;
      }

      // Check game unlock wave
      if (tDef.unlockWave > wave) continue;

      // Target count (gene 5-9, mapped to 0-8)
      const target = Math.round(g[5 + i] * 8);
      const current = towers[type] || 0;

      if (current < target) {
        // Priority weight (gene 0-4)
        const priority = g[i];
        candidates.push({ type, priority, deficit: target - current, cost: tDef.cost });
      }
    }

    // Sort by priority descending
    candidates.sort((a, b) => b.priority - a.priority);

    // Buy as many as affordable, respecting priority order
    for (const cand of candidates) {
      let bought = 0;
      while (bought < cand.deficit && cand.cost <= budget) {
        buys.push(cand.type);
        budget -= cand.cost;
        bought++;
      }
    }

    // Sell logic: if gene[41] > 0.7 and we have underperforming towers, consider selling
    if (g[41] > 0.7 && state.waveResult) {
      const killRate = state.waveResult.killRate || 1;
      if (killRate < 0.5) {
        // Specialization affinity (genes 36-39): types with low affinity get sold
        for (let i = 0; i < TOWER_TYPES.length; i++) {
          const type = TOWER_TYPES[i];
          const current = (towers[type] || 0);
          if (current > 0 && g[36 + Math.min(i, 3)] < 0.2) {
            sells.push(type);
            break; // sell at most one per wave
          }
        }
      }
    }

    return { buys, sells };
  }

  /**
   * Pick an upgrade from the offered options.
   * Scores options using genome-derived weights.
   *
   * @param {object[]} options - Array of upgrade objects (length 1-3)
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {number} Index of chosen upgrade (0, 1, or 2)
   */
  pickUpgrade(options, state) {
    if (options.length === 0) return 0;

    const g = this.genome;
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const cat = upgradeCategory(opt);

      // Base score from genome category weight (gene 12 + cat, mapped to -20..+40 range)
      let score = (g[12 + Math.min(cat, 19)] - 0.3) * 60;

      // Rarity base (scaled by genome economy/DPS preference gene 11)
      const econPref = g[11];
      if (opt.rarity === 'legendary') score += 25;
      else if (opt.rarity === 'rare') score += 12;
      else score += 3;

      // Economy vs DPS weighting (gene 11)
      const isEcon = ['coinValueMult', 'payday', 'tipJar', 'towerCostMult', 'goldenMagnet',
                       'compoundInterest', 'loanShark', 'overkillBonus', 'sprayBonus',
                       'hoarder', 'looseChange'].includes(opt.effect);
      if (isEcon) score += econPref * 25;
      else score += (1 - econPref) * 10;

      // Build-defining bonus
      if (opt.buildDefining) score += 15;

      // Extra weighting params (genes 42-43)
      // Gene 42: bonus for synergy upgrades
      if (opt.effect && opt.effect.startsWith('synergy')) {
        score += g[42] * 20;
      }
      // Gene 43: bonus for AoE / legendary combat
      if (['chainReaction', 'bladderBurst', 'spillZone', 'ubikFlood', 'nuclearMop',
           'domino', 'pileup'].includes(opt.effect)) {
        score += g[43] * 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Generate a random 44-float genome.
   * @param {function} [rng=Math.random] - RNG function returning [0,1)
   * @returns {number[]} 44-element float array
   */
  static randomGenome(rng) {
    const rand = rng || Math.random;
    const genome = new Array(44);
    for (let i = 0; i < 44; i++) {
      genome[i] = rand();
    }
    return genome;
  }

  /**
   * Uniform crossover: for each gene, randomly pick from parent1 or parent2.
   * @param {number[]} parent1 - 44-element genome
   * @param {number[]} parent2 - 44-element genome
   * @param {function} [rng=Math.random] - RNG function
   * @returns {number[]} child genome
   */
  static crossover(parent1, parent2, rng) {
    const rand = rng || Math.random;
    const child = new Array(44);
    for (let i = 0; i < 44; i++) {
      child[i] = rand() < 0.5 ? parent1[i] : parent2[i];
    }
    return child;
  }

  /**
   * Gaussian mutation: add N(0, sigma=0.1) to each gene with probability `rate`, clamp [0,1].
   * @param {number[]} genome - 44-element genome (mutated in place)
   * @param {number} rate - per-gene mutation probability
   * @param {function} [rng=Math.random] - RNG function
   * @returns {number[]} the mutated genome
   */
  static mutate(genome, rate, rng) {
    const rand = rng || Math.random;
    const sigma = 0.1;
    for (let i = 0; i < genome.length; i++) {
      if (rand() < rate) {
        // Box-Muller transform for Gaussian
        const u1 = rand() || 1e-10;
        const u2 = rand();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        genome[i] = Math.max(0, Math.min(1, genome[i] + z * sigma));
      }
    }
    return genome;
  }

  /**
   * Run a full genetic algorithm to evolve an optimal genome.
   *
   * @param {object} options
   * @param {number} [options.popSize=200] - Population size
   * @param {number} [options.generations=100] - Number of generations
   * @param {number} [options.tournamentSize=5] - Tournament selection size
   * @param {number} [options.mutationRate=0.1] - Per-gene mutation probability
   * @param {string} [options.scenario='office'] - Game scenario
   * @param {number} [options.maxWaves=50] - Max waves per evaluation
   * @param {number|null} [options.seed=null] - Base RNG seed (null = random)
   * @param {number} [options.evalRuns=3] - Number of evaluation runs per genome (averaged)
   * @param {function|null} [options.onGeneration=null] - Callback({ gen, bestFitness, avgFitness, bestGenome })
   * @returns {{ bestGenome: number[], bestFitness: number, history: object[] }}
   */
  static runGA(options = {}) {
    const {
      popSize = 200,
      generations = 100,
      tournamentSize = 5,
      mutationRate = 0.1,
      scenario = 'office',
      maxWaves = 50,
      seed = null,
      evalRuns = 3,
      onGeneration = null,
    } = options;

    // Lazy-require GameSimulator
    const { GameSimulator } = require('../sim/GameSimulator');
    const { mulberry32 } = require('../shared/waveGenerator');

    const baseRng = seed !== null ? mulberry32(seed) : Math.random;

    // Elitism: top 5%
    const eliteCount = Math.max(1, Math.floor(popSize * 0.05));

    // Initialize population
    let population = [];
    for (let i = 0; i < popSize; i++) {
      population.push(GeneticAgent.randomGenome(baseRng));
    }

    const history = [];
    let globalBestGenome = null;
    let globalBestFitness = -Infinity;

    for (let gen = 0; gen < generations; gen++) {
      // 1. Evaluate each genome
      const fitnesses = new Array(popSize);
      for (let i = 0; i < popSize; i++) {
        const agent = new GeneticAgent(population[i]);
        let totalFitness = 0;

        for (let run = 0; run < evalRuns; run++) {
          const runSeed = seed !== null ? (seed + gen * popSize + i * evalRuns + run) : null;
          const sim = new GameSimulator({
            scenario,
            maxWaves,
            seed: runSeed,
          });
          const result = sim.run(agent);
          totalFitness += result.fitness;
        }

        fitnesses[i] = totalFitness / evalRuns;
      }

      // 2. Sort by fitness (descending)
      const indices = Array.from({ length: popSize }, (_, i) => i);
      indices.sort((a, b) => fitnesses[b] - fitnesses[a]);

      const sortedPop = indices.map(i => population[i]);
      const sortedFit = indices.map(i => fitnesses[i]);

      if (sortedFit[0] > globalBestFitness) {
        globalBestFitness = sortedFit[0];
        globalBestGenome = sortedPop[0].slice();
      }

      const avgFitness = sortedFit.reduce((a, b) => a + b, 0) / popSize;

      const genStats = {
        gen,
        bestFitness: sortedFit[0],
        avgFitness,
        bestGenome: sortedPop[0].slice(),
      };
      history.push(genStats);

      if (onGeneration) onGeneration(genStats);

      // 3. Create next generation
      const nextPop = [];

      // Elitism: keep top eliteCount unchanged
      for (let i = 0; i < eliteCount; i++) {
        nextPop.push(sortedPop[i].slice());
      }

      // Fill rest with tournament selection + crossover + mutation
      while (nextPop.length < popSize) {
        // Tournament selection for two parents
        const parent1 = tournamentSelect(sortedPop, sortedFit, tournamentSize, baseRng);
        const parent2 = tournamentSelect(sortedPop, sortedFit, tournamentSize, baseRng);

        // Crossover
        let child = GeneticAgent.crossover(parent1, parent2, baseRng);

        // Mutation
        child = GeneticAgent.mutate(child, mutationRate, baseRng);

        nextPop.push(child);
      }

      population = nextPop;
    }

    return {
      bestGenome: globalBestGenome,
      bestFitness: globalBestFitness,
      history,
    };
  }
}

/**
 * Tournament selection: pick `size` random individuals, return the best.
 */
function tournamentSelect(population, fitnesses, size, rng) {
  const rand = rng || Math.random;
  let bestIdx = Math.floor(rand() * population.length);
  let bestFit = fitnesses[bestIdx];

  for (let i = 1; i < size; i++) {
    const idx = Math.floor(rand() * population.length);
    if (fitnesses[idx] > bestFit) {
      bestIdx = idx;
      bestFit = fitnesses[idx];
    }
  }

  return population[bestIdx];
}

module.exports = { GeneticAgent };

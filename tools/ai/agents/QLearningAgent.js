/**
 * QLearningAgent — linear function approximation Q-learning agent for Hold It In.
 *
 * 38 features for state encoding, two Q-functions with separate weight vectors:
 *   Q_tower:   6 actions (buy each of 5 types, or skip)
 *   Q_upgrade: 3 actions (pick option 0, 1, 2)
 *
 * Uses epsilon-greedy exploration with decay, TD(0) updates.
 */

const { GAME } = require('../shared/gameData');

const TOWER_TYPES = ['coinmagnet', 'wetfloor', 'mop', 'ubik', 'potplant'];
const NUM_FEATURES = 38;
const NUM_TOWER_ACTIONS = 6; // buy each of 5 types + skip
const NUM_UPGRADE_ACTIONS = 3;

// Key upgrade IDs for binary features
const KEY_ECON_UPGRADES = ['C2', 'R14', 'R25', 'L10', 'L16'];
const KEY_DPS_UPGRADES = ['R27', 'R23', 'R16', 'C17', 'L2'];

// Event waves per scenario
const EVENT_WAVES = {};
for (const [scenario, events] of Object.entries(GAME.waveEvents)) {
  EVENT_WAVES[scenario] = new Set(Object.keys(events).map(Number));
}

class QLearningAgent {
  /**
   * @param {object} [options]
   * @param {number} [options.alpha=0.01] - Learning rate
   * @param {number} [options.gamma=0.99] - Discount factor
   * @param {number} [options.epsilon=0.3] - Initial exploration rate
   * @param {number} [options.epsilonDecay=0.9995] - Multiplicative decay per episode
   * @param {number} [options.epsilonMin=0.05] - Minimum exploration rate
   * @param {string} [options.scenario='office'] - Scenario for event wave detection
   */
  constructor(options = {}) {
    this.alpha = options.alpha != null ? options.alpha : 0.01;
    this.gamma = options.gamma != null ? options.gamma : 0.99;
    this.epsilon = options.epsilon != null ? options.epsilon : 0.3;
    this.epsilonDecay = options.epsilonDecay != null ? options.epsilonDecay : 0.9995;
    this.epsilonMin = options.epsilonMin != null ? options.epsilonMin : 0.05;
    this.scenario = options.scenario || 'office';

    // Initialize weight matrices with small random values
    this.towerWeights = QLearningAgent._initWeights(NUM_TOWER_ACTIONS, NUM_FEATURES);
    this.upgradeWeights = QLearningAgent._initWeights(NUM_UPGRADE_ACTIONS, NUM_FEATURES);

    // Track last actions for learning
    this._lastTowerAction = null;
    this._lastUpgradeAction = null;
  }

  /**
   * Initialize weight matrix [numActions][numFeatures] with small random values.
   */
  static _initWeights(numActions, numFeatures) {
    const weights = [];
    for (let a = 0; a < numActions; a++) {
      const w = new Array(numFeatures);
      for (let f = 0; f < numFeatures; f++) {
        w[f] = (Math.random() - 0.5) * 0.01;
      }
      weights.push(w);
    }
    return weights;
  }

  /**
   * Extract 38-float feature vector from game state.
   *
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {number[]} 38-element feature vector
   */
  extractFeatures(state) {
    const f = new Array(NUM_FEATURES).fill(0);
    const { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult } = state;

    // 0: wave / 50
    f[0] = wave / 50;

    // 1: coins / 500
    f[1] = coins / 500;

    // 2: doorHP / doorMaxHP
    f[2] = doorMaxHP > 0 ? doorHP / doorMaxHP : 0;

    // 3-7: tower counts (each / 8)
    for (let i = 0; i < TOWER_TYPES.length; i++) {
      f[3 + i] = (towers[TOWER_TYPES[i]] || 0) / 8;
    }

    // 8: total towers / 20
    const totalTowers = Object.values(towers).reduce((a, b) => a + b, 0);
    f[8] = totalTowers / 20;

    // 9-11: upgrade count by rarity
    let commonCount = 0, rareCount = 0, legendaryCount = 0;
    if (upgrades) {
      for (const [id, stacks] of Object.entries(upgrades)) {
        const upDef = GAME.upgrades.find(u => u.id === id);
        if (!upDef) continue;
        if (upDef.rarity === 'common') commonCount += stacks;
        else if (upDef.rarity === 'rare') rareCount += stacks;
        else if (upDef.rarity === 'legendary') legendaryCount += stacks;
      }
    }
    f[9] = commonCount / 20;
    f[10] = rareCount / 20;
    f[11] = legendaryCount / 20;

    // 12-16: has key economy upgrades (binary)
    for (let i = 0; i < KEY_ECON_UPGRADES.length; i++) {
      f[12 + i] = (upgrades && upgrades[KEY_ECON_UPGRADES[i]]) ? 1 : 0;
    }

    // 17-21: has key DPS upgrades (binary)
    for (let i = 0; i < KEY_DPS_UPGRADES.length; i++) {
      f[17 + i] = (upgrades && upgrades[KEY_DPS_UPGRADES[i]]) ? 1 : 0;
    }

    // 22-25: wave composition (% basic, % tank, % fast, % special)
    // Estimated from wave number and scenario (heuristic approximation)
    if (wave <= 2) {
      f[22] = 1.0; // all basic
    } else if (wave <= 4) {
      f[22] = 0.5; f[24] = 0.5; // basic + fast
    } else if (wave <= 6) {
      f[22] = 0.35; f[23] = 0.2; f[24] = 0.35; f[25] = 0.1;
    } else {
      // Late game: diverse composition
      const lateScale = Math.min(1, (wave - 6) / 20);
      f[22] = Math.max(0.15, 0.4 - lateScale * 0.25);
      f[23] = Math.min(0.25, 0.1 + lateScale * 0.15);
      f[24] = Math.min(0.25, 0.2 + lateScale * 0.05);
      f[25] = Math.min(0.35, 0.1 + lateScale * 0.25);
    }

    // 26: last wave killRate
    f[26] = waveResult ? (waveResult.killRate || 0) : 1;

    // 27: last wave doorDamage / 20
    f[27] = waveResult ? (waveResult.doorDamage || 0) / 20 : 0;

    // 28: estimated kill capacity (rough DPS * waveDuration / totalHP, capped at 2)
    const estDPS = this._estimateDPS(towers, upgrades);
    const waveDuration = Math.max(10, 30 + wave * 2);
    const estEnemyHP = this._estimateTotalWaveHP(wave);
    f[28] = estEnemyHP > 0 ? Math.min(2, (estDPS * waveDuration) / estEnemyHP) : 0;

    // 29-33: tower DPS contribution by type (rough estimate, each / 20)
    f[29] = (towers.coinmagnet || 0) * 0.5 / 20; // magnets contribute little direct DPS
    f[30] = (towers.wetfloor || 0) * 2 / 20;     // slow zones enable others
    f[31] = (towers.mop || 0) * (8 / 1.2) / 20;  // mop DPS
    f[32] = (towers.ubik || 0) * (10 / 1.5) * 2 / 20; // ubik DPS (AoE)
    f[33] = (towers.potplant || 0) * 1.5 / 20;   // trip damage + stun

    // 34: unspent coins / 200
    f[34] = coins / 200;

    // 35: number of build-defining upgrades / 10
    let buildDefCount = 0;
    if (upgrades) {
      for (const id of Object.keys(upgrades)) {
        const upDef = GAME.upgrades.find(u => u.id === id);
        if (upDef && upDef.buildDefining) buildDefCount += upgrades[id];
      }
    }
    f[35] = buildDefCount / 10;

    // 36: number of synergy upgrades / 8
    let synergyCount = 0;
    if (upgrades) {
      for (const id of Object.keys(upgrades)) {
        const upDef = GAME.upgrades.find(u => u.id === id);
        if (upDef && upDef.effect && upDef.effect.startsWith('synergy')) synergyCount += upgrades[id];
      }
    }
    f[36] = synergyCount / 8;

    // 37: event wave indicator
    const scenarioEvents = EVENT_WAVES[this.scenario];
    f[37] = (scenarioEvents && scenarioEvents.has(wave)) ? 1 : 0;

    return f;
  }

  /**
   * Rough DPS estimate for feature extraction.
   */
  _estimateDPS(towers, upgrades) {
    let dps = 0;
    dps += (towers.mop || 0) * (8 / 1.2);
    dps += (towers.ubik || 0) * (10 / 1.5) * 2;
    dps += (towers.potplant || 0) * 1.5;
    dps += (towers.coinmagnet || 0) * 0.5;
    dps += (towers.wetfloor || 0) * 2;

    // Account for key DPS upgrades
    if (upgrades) {
      if (upgrades['R27']) dps *= 1.6; // Double Shift
      if (upgrades['C17']) dps *= 1.8; // Glass Cannon
      if (upgrades['R16']) dps *= 1.4; // Crossfire
    }

    return dps;
  }

  /**
   * Rough total HP estimate for the current wave.
   */
  _estimateTotalWaveHP(wave) {
    // Approximation: average enemy has ~(14 + wave*8) HP, ~(10 + wave*2) enemies
    const avgHP = 14 + wave * 8;
    const enemyCount = wave <= 10 ? (3 + wave * 2) : (10 + Math.floor(wave * 2.2));
    return avgHP * enemyCount;
  }

  /**
   * Compute Q(s,a) = dot(weights[a], features).
   */
  _qValue(weights, action, features) {
    let q = 0;
    for (let f = 0; f < NUM_FEATURES; f++) {
      q += weights[action][f] * features[f];
    }
    return q;
  }

  /**
   * Get argmax action for a weight matrix.
   */
  _argmax(weights, features, numActions) {
    let bestAction = 0;
    let bestQ = this._qValue(weights, 0, features);
    for (let a = 1; a < numActions; a++) {
      const q = this._qValue(weights, a, features);
      if (q > bestQ) {
        bestQ = q;
        bestAction = a;
      }
    }
    return bestAction;
  }

  /**
   * Get max Q value for a weight matrix.
   */
  _maxQ(weights, features, numActions) {
    let maxVal = this._qValue(weights, 0, features);
    for (let a = 1; a < numActions; a++) {
      const q = this._qValue(weights, a, features);
      if (q > maxVal) maxVal = q;
    }
    return maxVal;
  }

  /**
   * Decide which towers to buy/sell this wave.
   * Epsilon-greedy: repeatedly picks tower buy actions until can't afford or skip is chosen.
   *
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {{ buys: string[], sells: string[] }}
   */
  decideTowers(state) {
    const features = this.extractFeatures(state);
    const buys = [];
    const sells = [];
    let budget = state.coins;
    const towerCounts = { ...state.towers };

    // Repeatedly choose tower actions
    const maxBuys = 10; // safety limit
    let lastAction = 5; // will store for learning

    for (let step = 0; step < maxBuys; step++) {
      let action;

      // Epsilon-greedy
      if (Math.random() < this.epsilon) {
        action = Math.floor(Math.random() * NUM_TOWER_ACTIONS);
      } else {
        action = this._argmax(this.towerWeights, features, NUM_TOWER_ACTIONS);
      }

      // Action 5 = skip (stop buying)
      if (action === 5) {
        lastAction = 5;
        break;
      }

      // Action 0-4 = buy tower type
      const type = TOWER_TYPES[action];
      const tDef = GAME.towers[type];

      if (tDef.unlockWave <= state.wave && tDef.cost <= budget) {
        buys.push(type);
        budget -= tDef.cost;
        towerCounts[type] = (towerCounts[type] || 0) + 1;
        lastAction = action;
      } else {
        // Can't afford or not unlocked — treat as skip
        lastAction = 5;
        break;
      }
    }

    this._lastTowerAction = lastAction;
    return { buys, sells };
  }

  /**
   * Pick an upgrade from the offered options.
   * Epsilon-greedy from Q_upgrade.
   *
   * @param {object[]} options - Array of upgrade objects (length 1-3)
   * @param {object} state - { wave, coins, doorHP, doorMaxHP, towers, upgrades, waveResult }
   * @returns {number} Index of chosen upgrade (0, 1, or 2)
   */
  pickUpgrade(options, state) {
    if (options.length === 0) {
      this._lastUpgradeAction = 0;
      return 0;
    }

    const features = this.extractFeatures(state);
    let action;

    if (Math.random() < this.epsilon) {
      action = Math.floor(Math.random() * Math.min(options.length, NUM_UPGRADE_ACTIONS));
    } else {
      // Only consider valid actions (0 to options.length-1)
      let bestAction = 0;
      let bestQ = this._qValue(this.upgradeWeights, 0, features);
      for (let a = 1; a < Math.min(options.length, NUM_UPGRADE_ACTIONS); a++) {
        const q = this._qValue(this.upgradeWeights, a, features);
        if (q > bestQ) {
          bestQ = q;
          bestAction = a;
        }
      }
      action = bestAction;
    }

    this._lastUpgradeAction = action;
    return action;
  }

  /**
   * TD(0) update for both Q-functions.
   *
   * Reward = killRate * 10 + coinIncome * 0.01 - doorDamage * 5 + (wave >= maxWaves ? 100 : 0)
   *
   * @param {object} prevState - State before actions
   * @param {number} towerAction - Tower action taken (0-5)
   * @param {number} upgradeAction - Upgrade action taken (0-2)
   * @param {number} reward - Computed reward
   * @param {object} nextState - State after wave resolution
   */
  learn(prevState, towerAction, upgradeAction, reward, nextState) {
    const prevFeatures = this.extractFeatures(prevState);
    const nextFeatures = this.extractFeatures(nextState);

    // TD update for tower Q-function
    if (towerAction != null && towerAction >= 0 && towerAction < NUM_TOWER_ACTIONS) {
      const currentQ = this._qValue(this.towerWeights, towerAction, prevFeatures);
      const maxNextQ = this._maxQ(this.towerWeights, nextFeatures, NUM_TOWER_ACTIONS);
      const tdError = reward + this.gamma * maxNextQ - currentQ;

      for (let f = 0; f < NUM_FEATURES; f++) {
        this.towerWeights[towerAction][f] += this.alpha * tdError * prevFeatures[f];
      }
    }

    // TD update for upgrade Q-function
    if (upgradeAction != null && upgradeAction >= 0 && upgradeAction < NUM_UPGRADE_ACTIONS) {
      const currentQ = this._qValue(this.upgradeWeights, upgradeAction, prevFeatures);
      const maxNextQ = this._maxQ(this.upgradeWeights, nextFeatures, NUM_UPGRADE_ACTIONS);
      const tdError = reward + this.gamma * maxNextQ - currentQ;

      for (let f = 0; f < NUM_FEATURES; f++) {
        this.upgradeWeights[upgradeAction][f] += this.alpha * tdError * prevFeatures[f];
      }
    }
  }

  /**
   * Decay epsilon by multiplicative factor, respecting minimum.
   */
  decayEpsilon() {
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
  }

  /**
   * Train a QLearningAgent over many episodes.
   *
   * @param {object} options
   * @param {number} [options.episodes=10000] - Number of training episodes
   * @param {string} [options.scenario='office'] - Game scenario
   * @param {number} [options.maxWaves=50] - Max waves per episode
   * @param {number|null} [options.seed=null] - Base seed (null = random)
   * @param {number} [options.alpha] - Learning rate
   * @param {number} [options.gamma] - Discount factor
   * @param {number} [options.epsilon] - Initial exploration rate
   * @param {number} [options.epsilonDecay] - Epsilon decay rate
   * @param {function|null} [options.onEpisode=null] - Callback({ episode, wavesReached, fitness })
   * @returns {{ agent: QLearningAgent, history: object[] }}
   */
  static train(options = {}) {
    const {
      episodes = 10000,
      scenario = 'office',
      maxWaves = 50,
      seed = null,
      alpha,
      gamma,
      epsilon,
      epsilonDecay,
      onEpisode = null,
    } = options;

    // Lazy-require GameSimulator
    const { GameSimulator } = require('../sim/GameSimulator');

    const agent = new QLearningAgent({
      alpha,
      gamma,
      epsilon,
      epsilonDecay,
      scenario,
    });

    const history = [];

    for (let ep = 0; ep < episodes; ep++) {
      const epSeed = seed !== null ? seed + ep : null;
      const sim = new GameSimulator({
        scenario,
        maxWaves,
        seed: epSeed,
      });

      const result = sim.run(agent);

      // Learn from wave results
      const waveResults = result.waveResults || [];
      for (let w = 0; w < waveResults.length; w++) {
        const wr = waveResults[w];
        const reward = (wr.killRate || 0) * 10
          + (wr.coinIncome || 0) * 0.01
          - (wr.doorDamage || 0) * 5
          + (w === waveResults.length - 1 && result.wavesReached >= maxWaves ? 100 : 0);

        // Use wave state as both prev and next (simplified — full transitions would need GameSimulator support)
        const state = { wave: wr.wave, coins: wr.coins, doorHP: wr.doorHP, doorMaxHP: 100, towers: {}, upgrades: {} };
        agent.learn(state, 5, 0, reward, state);
      }

      agent.decayEpsilon();

      const epStats = {
        episode: ep,
        wavesReached: result.wavesReached || result.wave || 0,
        fitness: result.fitness || 0,
      };
      history.push(epStats);

      if (onEpisode) onEpisode(epStats);
    }

    return { agent, history };
  }

  /**
   * Serialize agent weights and parameters to JSON-safe object.
   * @returns {object} { towerWeights, upgradeWeights, epsilon }
   */
  toJSON() {
    return {
      towerWeights: this.towerWeights.map(w => w.slice()),
      upgradeWeights: this.upgradeWeights.map(w => w.slice()),
      epsilon: this.epsilon,
    };
  }

  /**
   * Reconstruct a QLearningAgent from saved JSON data.
   * @param {object} data - { towerWeights, upgradeWeights, epsilon }
   * @param {object} [options] - Additional constructor options (alpha, gamma, etc.)
   * @returns {QLearningAgent}
   */
  static fromJSON(data, options = {}) {
    const agent = new QLearningAgent({
      ...options,
      epsilon: data.epsilon != null ? data.epsilon : options.epsilon,
    });
    agent.towerWeights = data.towerWeights.map(w => w.slice());
    agent.upgradeWeights = data.upgradeWeights.map(w => w.slice());
    return agent;
  }
}

module.exports = { QLearningAgent };

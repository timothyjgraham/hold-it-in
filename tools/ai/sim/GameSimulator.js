/**
 * GameSimulator — headless game engine that runs complete games.
 *
 * Drives TowerController, UpgradeController, and CoverageModel through
 * a full wave loop, delegating decisions to a pluggable agent.
 *
 * The agent is any object with:
 *   - decideTowers(state) -> { buys: ['ubik', 'mop'], sells: [] }
 *   - pickUpgrade(options, state) -> index (0-2) of chosen upgrade
 */

const { GAME } = require('../shared/gameData');
const { generateWave, mulberry32 } = require('../shared/waveGenerator');
const { TowerController } = require('./TowerController');
const { UpgradeController } = require('./UpgradeController');
const { CoverageModel } = require('./CoverageModel');

class GameSimulator {
  /**
   * @param {object} options
   * @param {string} [options.scenario='office'] - 'office'|'forest'|'ocean'|'airplane'
   * @param {number} [options.maxWaves=50]
   * @param {number|null} [options.seed=null] - seed for deterministic RNG
   * @param {string} [options.combatMode='fast'] - 'fast' or 'tick'
   */
  constructor(options = {}) {
    this.scenario = options.scenario || 'office';
    this.maxWaves = options.maxWaves || 50;
    this.seed = options.seed != null ? options.seed : null;
    this.combatMode = options.combatMode || 'fast';
    this.traceBuild = options.traceBuild || false;
  }

  /**
   * Run a complete game driven by the given agent.
   *
   * @param {object} agent - Must implement decideTowers(state) and pickUpgrade(options, state)
   * @returns {object} GameResult
   */
  run(agent) {
    // ── Setup RNG ──
    const rng = this.seed != null ? mulberry32(this.seed) : Math.random;

    // ── Initialize state ──
    let coins = GAME.startingCoins;
    let doorHP = GAME.doorMaxHP;
    let doorMaxHP = GAME.doorMaxHP;

    const towerCtrl = new TowerController();
    const upgradeCtrl = new UpgradeController();
    const coverage = new CoverageModel();

    const waveResults = [];
    const towerHistory = [];
    const buildTrace = [];
    let totalCoinsEarned = 0;
    let score = 0;
    let wavesReached = 0;
    let lastWaveResult = null;

    // ── Wave loop ──
    for (let wave = 1; wave <= this.maxWaves; wave++) {
      wavesReached = wave;

      // ── 1. Build state snapshot for agent ──
      const state = {
        wave,
        coins,
        doorHP,
        doorMaxHP,
        towers: towerCtrl.snapshot(),
        upgrades: upgradeCtrl.snapshot(),
        totalTowers: towerCtrl.totalTowers,
        maxSlots: towerCtrl.maxSlots,
        waveResult: lastWaveResult,
        scenario: this.scenario,
      };

      // ── 2. Tower buy/sell phase ──
      const towerDecision = agent.decideTowers(state);

      // Execute sells first (to free up coins and slots)
      if (towerDecision.sells && towerDecision.sells.length > 0) {
        for (const type of towerDecision.sells) {
          if (towerCtrl.towers[type] > 0) {
            const refund = towerCtrl.sell(type);
            coins += refund;
          }
        }
      }

      // Execute buys
      if (towerDecision.buys && towerDecision.buys.length > 0) {
        for (const type of towerDecision.buys) {
          if (towerCtrl.canBuy(type, coins, wave)) {
            const cost = towerCtrl.buy(type);
            coins -= cost;
          }
        }
      }

      towerHistory.push({ wave, towers: towerCtrl.snapshot(), coins });

      // ── 3. Upgrade selection (after wave 1) ──
      if (wave > 1) {
        const options = upgradeCtrl.rollOptions(wave, towerCtrl.towers, rng);

        if (options.length > 0) {
          // Update state for upgrade decision
          const upgradeState = {
            wave,
            coins,
            doorHP,
            doorMaxHP,
            towers: towerCtrl.snapshot(),
            upgrades: upgradeCtrl.snapshot(),
            totalTowers: towerCtrl.totalTowers,
            maxSlots: towerCtrl.maxSlots,
            waveResult: lastWaveResult,
            scenario: this.scenario,
          };

          const pickIdx = agent.pickUpgrade(options, upgradeState);
          const idx = Math.max(0, Math.min(options.length - 1, pickIdx));
          const chosen = options[idx];

          if (this.traceBuild) {
            buildTrace.push({
              wave,
              offeredIds: options.map(o => o.id),
              chosenId: chosen.id,
              rejectedIds: options.filter((_, i) => i !== idx).map(o => o.id),
              state: { coins, doorHP, towers: towerCtrl.snapshot(), upgrades: upgradeCtrl.snapshot() },
            });
          }

          upgradeCtrl.pick(chosen);

          // ── 4. Apply immediate upgrade effects ──

          // Tower cost effects
          towerCtrl.applyUpgrade(chosen.id);

          // Door HP boost (L1: Double Flush)
          if (chosen.effect === 'doorHPBoost') {
            doorMaxHP += chosen.value;
            doorHP = doorMaxHP; // full heal on door upgrade
          }

          // Loan Shark (L16): immediate coin injection
          if (chosen.effect === 'loanShark') {
            coins += chosen.value; // +60 coins
          }

          // Recycler (R22): upgrade sell refund
          if (chosen.effect === 'recycler') {
            towerCtrl.sellRefundRate = 1.0;
          }

          // Skeleton Crew (R24): limit tower slots
          if (chosen.effect === 'skeletonCrew') {
            towerCtrl.maxSlots = 6;
          }
        }
      }

      // ── 5. Generate wave ──
      const waveData = generateWave(wave, this.scenario, rng);

      // ── 6. Resolve combat ──
      const combatParams = {
        towers: towerCtrl.towers,
        upgrades: upgradeCtrl.acquired,
        permanentDmgBonus: towerCtrl.permanentDmgBonus,
        enemies: waveData.enemies,
        wave,
        interval: waveData.interval,
        eventSpeedMult: waveData.eventSpeedMult,
        eventDesperateChance: waveData.eventDesperateChance,
        coins,
        doorHP,
        doorMaxHP,
      };

      let result;
      if (this.combatMode === 'tick') {
        result = coverage.resolveTick(combatParams, rng);
      } else {
        result = coverage.resolveFast(combatParams, rng);
      }

      // ── 7. Update state ──
      coins += result.coinIncome;
      totalCoinsEarned += result.coinIncome;
      doorHP -= result.doorDamage;

      // R25: Compound Interest (5% of coins as bonus, uncapped)
      if (upgradeCtrl.has('R25')) {
        const interest = Math.floor(coins * 0.05);
        coins += interest;
        totalCoinsEarned += interest;
      }

      // Score: killRate * wave * 10
      const waveScore = result.killRate * wave * 10;
      score += waveScore;

      lastWaveResult = {
        wave,
        killRate: result.killRate,
        coinIncome: result.coinIncome,
        doorDamage: result.doorDamage,
        waveDuration: result.waveDuration,
        coins,
        doorHP,
        enemyCount: waveData.enemies.length,
        eventName: waveData.event ? waveData.event.name : null,
      };

      waveResults.push(lastWaveResult);

      // ── 8. Check game over ──
      if (doorHP <= 0) {
        doorHP = 0;
        break;
      }
    }

    // ── Compute fitness ──
    // fitness = wavesReached * 100 + score * 0.1 + doorHP * 2 + totalCoinsEarned * 0.05
    const fitness = wavesReached * 100 + score * 0.1 + doorHP * 2 + totalCoinsEarned * 0.05;

    const result = {
      wavesReached,
      score: Math.round(score),
      doorHP,
      upgradesAcquired: upgradeCtrl.getAcquiredList(),
      towerHistory,
      waveResults,
      fitness: Math.round(fitness * 100) / 100,
      totalCoinsEarned,
      scenario: this.scenario,
      seed: this.seed,
      combatMode: this.combatMode,
    };

    if (this.traceBuild) {
      result.buildTrace = buildTrace;
    }

    return result;
  }
}

module.exports = { GameSimulator };

/**
 * Analyzer — analytics engine for game balance data.
 *
 * Operates on arrays of GameResult objects produced by GameSimulator:
 *   { wavesReached, score, doorHP, upgradesAcquired: [{id, stacks}],
 *     towerHistory, waveResults: [{wave, killRate, coinIncome, doorDamage, coins, doorHP}],
 *     fitness, genome? }
 */

const { GAME } = require('../shared/gameData');

class Analyzer {
  /**
   * @param {object[]} results - Array of GameResult objects
   */
  constructor(results) {
    this.results = results;
    // Build a lookup from upgrade id to its definition
    this._upgradeMap = {};
    for (const u of GAME.upgrades) {
      this._upgradeMap[u.id] = u;
    }
    // Build the full list of unique upgrade ids for bitmask indexing
    this._allUpgradeIds = GAME.upgrades.map(u => u.id);
    this._idToIndex = {};
    for (let i = 0; i < this._allUpgradeIds.length; i++) {
      this._idToIndex[this._allUpgradeIds[i]] = i;
    }
  }

  /**
   * Per-upgrade marginal value analysis.
   * Compares avg wavesReached of runs WITH vs WITHOUT each upgrade.
   * Marginal value = (avgWith - avgWithout) / avgWithout
   * Rank: S (>30% lift), A (15-30%), B (5-15%), C (-5% to 5%), D (<-5%)
   *
   * @returns {object[]} Sorted array of tier entries
   */
  tierList() {
    const upgradeStats = {};

    // Initialize stats for every upgrade
    for (const u of GAME.upgrades) {
      upgradeStats[u.id] = { withWaves: [], withoutWaves: [] };
    }

    // Classify each run
    for (const result of this.results) {
      const acquiredIds = new Set();
      if (result.upgradesAcquired) {
        for (const acq of result.upgradesAcquired) {
          acquiredIds.add(acq.id);
        }
      }

      for (const u of GAME.upgrades) {
        if (acquiredIds.has(u.id)) {
          upgradeStats[u.id].withWaves.push(result.wavesReached);
        } else {
          upgradeStats[u.id].withoutWaves.push(result.wavesReached);
        }
      }
    }

    const entries = [];

    for (const u of GAME.upgrades) {
      const stats = upgradeStats[u.id];
      const samplesWith = stats.withWaves.length;
      const samplesWithout = stats.withoutWaves.length;

      // Need at least 1 sample in each bucket for a meaningful comparison
      if (samplesWith === 0 || samplesWithout === 0) {
        entries.push({
          id: u.id,
          name: u.name,
          rarity: u.rarity,
          tier: 'N/A',
          marginalValue: 0,
          pickRate: samplesWith / this.results.length,
          avgWavesWithout: samplesWithout > 0 ? this._avg(stats.withoutWaves) : 0,
          avgWavesWith: samplesWith > 0 ? this._avg(stats.withWaves) : 0,
          samplesWith,
          samplesWithout,
        });
        continue;
      }

      const avgWith = this._avg(stats.withWaves);
      const avgWithout = this._avg(stats.withoutWaves);
      const marginalValue = avgWithout !== 0 ? (avgWith - avgWithout) / avgWithout : 0;

      let tier;
      if (marginalValue > 0.30) tier = 'S';
      else if (marginalValue > 0.15) tier = 'A';
      else if (marginalValue > 0.05) tier = 'B';
      else if (marginalValue > -0.05) tier = 'C';
      else tier = 'D';

      entries.push({
        id: u.id,
        name: u.name,
        rarity: u.rarity,
        tier,
        marginalValue,
        pickRate: samplesWith / this.results.length,
        avgWavesWithout: avgWithout,
        avgWavesWith: avgWith,
        samplesWith,
        samplesWithout,
      });
    }

    // Sort by marginal value descending
    entries.sort((a, b) => b.marginalValue - a.marginalValue);
    return entries;
  }

  /**
   * Pairwise synergy analysis.
   * lift = avg(both) - avg(onlyA) - avg(onlyB) + avg(neither)
   * Significance via chi-squared on 2x2 contingency table.
   * Returns top 30 synergies with samplesBoth >= 10.
   *
   * @returns {object[]} Top synergies sorted by lift descending
   */
  synergyMatrix() {
    // Precompute per-run upgrade sets and wavesReached for speed
    const runData = this.results.map(r => {
      const ids = new Set();
      if (r.upgradesAcquired) {
        for (const acq of r.upgradesAcquired) ids.add(acq.id);
      }
      return { ids, waves: r.wavesReached };
    });

    const upgrades = GAME.upgrades;
    const synergies = [];

    for (let i = 0; i < upgrades.length; i++) {
      for (let j = i + 1; j < upgrades.length; j++) {
        const idA = upgrades[i].id;
        const idB = upgrades[j].id;

        const buckets = { both: [], onlyA: [], onlyB: [], neither: [] };

        for (const run of runData) {
          const hasA = run.ids.has(idA);
          const hasB = run.ids.has(idB);
          if (hasA && hasB) buckets.both.push(run.waves);
          else if (hasA) buckets.onlyA.push(run.waves);
          else if (hasB) buckets.onlyB.push(run.waves);
          else buckets.neither.push(run.waves);
        }

        if (buckets.both.length < 10) continue;

        const avgBoth = this._avg(buckets.both);
        const avgOnlyA = buckets.onlyA.length > 0 ? this._avg(buckets.onlyA) : 0;
        const avgOnlyB = buckets.onlyB.length > 0 ? this._avg(buckets.onlyB) : 0;
        const avgNeither = buckets.neither.length > 0 ? this._avg(buckets.neither) : 0;

        const lift = avgBoth - avgOnlyA - avgOnlyB + avgNeither;

        // Chi-squared test on 2x2 contingency: (hasA vs not) x (hasB vs not)
        // Using wavesReached as the outcome measure: above vs below median
        const significance = this._chiSquared2x2(buckets);

        synergies.push({
          upgrade1: idA,
          upgrade2: idB,
          lift,
          significance,
          samplesBoth: buckets.both.length,
        });
      }
    }

    // Sort by lift descending, take top 30
    synergies.sort((a, b) => b.lift - a.lift);
    return synergies.slice(0, 30);
  }

  /**
   * Cluster top-performing builds using k-means with cosine similarity.
   * Takes top 20% of runs by wavesReached.
   *
   * @param {number} k - Number of clusters (default 5)
   * @returns {object[]} Cluster descriptions
   */
  buildClustering(k = 5) {
    // Sort runs by wavesReached descending, take top 20%
    const sorted = [...this.results].sort((a, b) => b.wavesReached - a.wavesReached);
    const topCount = Math.max(1, Math.floor(sorted.length * 0.2));
    const topRuns = sorted.slice(0, topCount);

    if (topRuns.length < k) {
      // Not enough data to cluster
      return [];
    }

    const dim = this._allUpgradeIds.length;

    // Create binary bitmask vectors for each run
    const vectors = topRuns.map(r => {
      const vec = new Float64Array(dim);
      if (r.upgradesAcquired) {
        for (const acq of r.upgradesAcquired) {
          const idx = this._idToIndex[acq.id];
          if (idx !== undefined) vec[idx] = 1;
        }
      }
      return vec;
    });

    // Initialize centroids: pick k random distinct indices from top runs
    const centroidIndices = [];
    const used = new Set();
    let attempts = 0;
    while (centroidIndices.length < k && attempts < topRuns.length * 3) {
      const idx = Math.floor(Math.random() * topRuns.length);
      if (!used.has(idx)) {
        used.add(idx);
        centroidIndices.push(idx);
      }
      attempts++;
    }

    // If we couldn't get k unique indices, fill with random picks
    while (centroidIndices.length < k) {
      centroidIndices.push(Math.floor(Math.random() * topRuns.length));
    }

    let centroids = centroidIndices.map(i => Float64Array.from(vectors[i]));
    let assignments = new Int32Array(vectors.length);

    // K-means iteration
    for (let iter = 0; iter < 50; iter++) {
      let changed = false;

      // Assignment step: assign each vector to nearest centroid by cosine similarity
      for (let i = 0; i < vectors.length; i++) {
        let bestCluster = 0;
        let bestSim = -Infinity;
        for (let c = 0; c < k; c++) {
          const sim = this._cosineSimilarity(vectors[i], centroids[c]);
          if (sim > bestSim) {
            bestSim = sim;
            bestCluster = c;
          }
        }
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      // Update step: recompute centroids as mean of assigned vectors
      const newCentroids = [];
      for (let c = 0; c < k; c++) {
        const sum = new Float64Array(dim);
        let count = 0;
        for (let i = 0; i < vectors.length; i++) {
          if (assignments[i] === c) {
            for (let d = 0; d < dim; d++) sum[d] += vectors[i][d];
            count++;
          }
        }
        if (count > 0) {
          for (let d = 0; d < dim; d++) sum[d] /= count;
        }
        newCentroids.push(sum);
      }
      centroids = newCentroids;
    }

    // Compute population-wide upgrade frequencies for comparison
    const popFreq = new Float64Array(dim);
    for (const v of vectors) {
      for (let d = 0; d < dim; d++) popFreq[d] += v[d];
    }
    for (let d = 0; d < dim; d++) popFreq[d] /= vectors.length;

    // Build cluster descriptions
    const clusters = [];
    for (let c = 0; c < k; c++) {
      const members = [];
      for (let i = 0; i < vectors.length; i++) {
        if (assignments[i] === c) members.push(i);
      }

      if (members.length === 0) continue;

      const clusterFreq = new Float64Array(dim);
      let totalWaves = 0;
      let totalFitness = 0;
      for (const mi of members) {
        for (let d = 0; d < dim; d++) clusterFreq[d] += vectors[mi][d];
        totalWaves += topRuns[mi].wavesReached;
        totalFitness += (topRuns[mi].fitness || topRuns[mi].wavesReached);
      }
      for (let d = 0; d < dim; d++) clusterFreq[d] /= members.length;

      // Find most distinctive upgrades (highest frequency delta vs population)
      const deltas = [];
      for (let d = 0; d < dim; d++) {
        deltas.push({ idx: d, id: this._allUpgradeIds[d], delta: clusterFreq[d] - popFreq[d], frequency: clusterFreq[d] });
      }
      deltas.sort((a, b) => b.delta - a.delta);

      // Key upgrades: top 5 with positive delta and frequency > 0.3
      const keyUpgrades = deltas
        .filter(d => d.delta > 0 && d.frequency > 0.3)
        .slice(0, 5)
        .map(d => ({ id: d.id, frequency: Math.round(d.frequency * 100) / 100 }));

      // Name the cluster by its top 2 distinctive upgrades
      const nameUpgrades = keyUpgrades.slice(0, 2).map(ku => {
        const def = this._upgradeMap[ku.id];
        return def ? def.name : ku.id;
      });
      const name = nameUpgrades.length > 0 ? nameUpgrades.join(' + ') : `Cluster ${c + 1}`;

      clusters.push({
        name,
        size: members.length,
        avgWaves: Math.round((totalWaves / members.length) * 10) / 10,
        avgFitness: Math.round((totalFitness / members.length) * 10) / 10,
        keyUpgrades,
        centroid: Array.from(centroids[c]),
      });
    }

    // Sort clusters by avgWaves descending
    clusters.sort((a, b) => b.avgWaves - a.avgWaves);
    return clusters;
  }

  /**
   * Survival curve and death spike analysis.
   * For each wave: what % of runs survived to that wave.
   * Death spikes: waves where survival drops by >5% in one step.
   *
   * @returns {object} { survivalCurve, deathSpikes, medianWave, p10, p90 }
   */
  breakpoints() {
    if (this.results.length === 0) {
      return { survivalCurve: [], deathSpikes: [], medianWave: 0, p10: 0, p90: 0 };
    }

    const wavesReached = this.results.map(r => r.wavesReached);
    const maxWave = Math.max(...wavesReached);
    const n = this.results.length;

    // Build wave event lookup across all scenarios for context
    const allEvents = {};
    for (const [scenario, events] of Object.entries(GAME.waveEvents)) {
      for (const [wave, event] of Object.entries(events)) {
        const w = parseInt(wave);
        if (!allEvents[w]) allEvents[w] = [];
        allEvents[w].push({ scenario, name: event.name });
      }
    }

    // Survival curve
    const survivalCurve = [];
    for (let w = 1; w <= maxWave; w++) {
      const survived = wavesReached.filter(wr => wr >= w).length;
      survivalCurve.push({ wave: w, survivalPct: Math.round((survived / n) * 10000) / 100 });
    }

    // Death spikes: waves where survival drops by >5%
    const deathSpikes = [];
    for (let i = 1; i < survivalCurve.length; i++) {
      const dropPct = survivalCurve[i - 1].survivalPct - survivalCurve[i].survivalPct;
      if (dropPct > 5) {
        const wave = survivalCurve[i].wave;
        const eventInfo = allEvents[wave];
        const eventName = eventInfo ? eventInfo.map(e => `${e.scenario}:${e.name}`).join(', ') : null;
        deathSpikes.push({
          wave,
          dropPct: Math.round(dropPct * 100) / 100,
          eventName,
        });
      }
    }

    // Sort death spikes by dropPct descending
    deathSpikes.sort((a, b) => b.dropPct - a.dropPct);

    // Percentiles
    const sortedWaves = [...wavesReached].sort((a, b) => a - b);
    const medianWave = this._percentile(sortedWaves, 0.5);
    const p10 = this._percentile(sortedWaves, 0.1);
    const p90 = this._percentile(sortedWaves, 0.9);

    return { survivalCurve, deathSpikes, medianWave, p10, p90 };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _avg(arr) {
    if (arr.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  _percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const idx = Math.floor(p * (sortedArr.length - 1));
    return sortedArr[idx];
  }

  _cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  /**
   * Chi-squared test on 2x2 contingency table.
   * Uses median wavesReached as the threshold for "above" vs "below".
   * Buckets: { both, onlyA, onlyB, neither } — each is an array of wavesReached.
   * Returns chi-squared statistic.
   */
  _chiSquared2x2(buckets) {
    // Compute overall median
    const allVals = [...buckets.both, ...buckets.onlyA, ...buckets.onlyB, ...buckets.neither];
    allVals.sort((a, b) => a - b);
    const median = allVals.length > 0 ? allVals[Math.floor(allVals.length / 2)] : 0;

    // Build 2x2 contingency: (hasA/notA) x (aboveMedian/belowOrEqual)
    // Row 1: has both A and B
    // Row 2: has neither A nor B
    // But for pairwise: we measure whether having both vs not correlates with performance

    // Simplify: treat "both" as group1, "rest" (onlyA + onlyB + neither) as group2
    const group1Above = buckets.both.filter(w => w > median).length;
    const group1Below = buckets.both.length - group1Above;
    const restWaves = [...buckets.onlyA, ...buckets.onlyB, ...buckets.neither];
    const group2Above = restWaves.filter(w => w > median).length;
    const group2Below = restWaves.length - group2Above;

    const table = [[group1Above, group1Below], [group2Above, group2Below]];
    const n = group1Above + group1Below + group2Above + group2Below;
    if (n === 0) return 0;

    // Expected values and chi-squared
    const rowTotals = [table[0][0] + table[0][1], table[1][0] + table[1][1]];
    const colTotals = [table[0][0] + table[1][0], table[0][1] + table[1][1]];

    let chi2 = 0;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const expected = (rowTotals[r] * colTotals[c]) / n;
        if (expected > 0) {
          const diff = table[r][c] - expected;
          chi2 += (diff * diff) / expected;
        }
      }
    }

    return Math.round(chi2 * 1000) / 1000;
  }
}

module.exports = { Analyzer };

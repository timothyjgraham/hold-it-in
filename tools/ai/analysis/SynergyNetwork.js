/**
 * SynergyNetwork — graph-based synergy analysis engine.
 *
 * Computes true interaction effects (not co-occurrence), mines frequent
 * itemsets via Apriori, builds a weighted synergy graph, detects communities
 * via Louvain, computes betweenness centrality via Brandes, and analyzes
 * upgrade rejection/timing patterns from build traces.
 */

const { GAME } = require('../shared/gameData');

class SynergyNetwork {
  /**
   * @param {object[]} results - Array of GameResult objects (with optional buildTrace)
   * @param {object} [opts]
   * @param {number} [opts.minSupport=0.03] - Minimum support threshold for frequent itemsets
   * @param {number} [opts.minLift=1.5] - Minimum lift for pairs in Apriori L2
   * @param {number} [opts.minInteraction=1.0] - Minimum |interaction effect| for graph edges (waves)
   * @param {number} [opts.successPctile=0.25] - Top percentile of runs considered "success"
   * @param {string} [opts.metric='wavesReached'] - Metric to optimize
   */
  constructor(results, opts = {}) {
    this.results = results;
    this.minSupport = opts.minSupport != null ? opts.minSupport : 0.03;
    this.minLift = opts.minLift != null ? opts.minLift : 1.5;
    this.minInteraction = opts.minInteraction != null ? opts.minInteraction : 1.0;
    this.successPctile = opts.successPctile != null ? opts.successPctile : 0.25;
    this.metric = opts.metric || 'wavesReached';

    // Build upgrade lookup
    this._upgradeMap = {};
    for (const u of GAME.upgrades) {
      this._upgradeMap[u.id] = u;
    }
    this._allIds = GAME.upgrades.map(u => u.id);
    this._idToIdx = {};
    for (let i = 0; i < this._allIds.length; i++) {
      this._idToIdx[this._allIds[i]] = i;
    }
    this._N = this._allIds.length;

    // Prepared data (filled by _prepareData)
    this._runs = null;
    this._successRuns = null;
    this._freqs = null;
    this._successFreqs = null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 1: Data Preparation
  // ══════════════════════════════════════════════════════════════════════════

  _prepareData() {
    const N = this._N;
    const runs = [];

    for (const r of this.results) {
      const upgradeSet = new Set();
      const bitVec = new Uint8Array(N);
      if (r.upgradesAcquired) {
        for (const acq of r.upgradesAcquired) {
          upgradeSet.add(acq.id);
          const idx = this._idToIdx[acq.id];
          if (idx !== undefined) bitVec[idx] = 1;
        }
      }
      runs.push({
        upgradeSet,
        bitVec,
        metric: r[this.metric] || r.wavesReached || 0,
        buildTrace: r.buildTrace || null,
      });
    }

    // Sort by metric to determine success threshold
    const sorted = runs.map(r => r.metric).sort((a, b) => a - b);
    const threshold = sorted[Math.floor(sorted.length * (1 - this.successPctile))] || 0;

    for (const run of runs) {
      run.isSuccess = run.metric >= threshold;
    }

    this._runs = runs;
    this._successRuns = runs.filter(r => r.isSuccess);

    // Per-upgrade frequencies (all runs)
    this._freqs = new Float64Array(N);
    for (const run of runs) {
      for (let i = 0; i < N; i++) {
        if (run.bitVec[i]) this._freqs[i]++;
      }
    }
    for (let i = 0; i < N; i++) this._freqs[i] /= runs.length;

    // Per-upgrade frequencies (success runs)
    this._successFreqs = new Float64Array(N);
    for (const run of this._successRuns) {
      for (let i = 0; i < N; i++) {
        if (run.bitVec[i]) this._successFreqs[i]++;
      }
    }
    if (this._successRuns.length > 0) {
      for (let i = 0; i < N; i++) this._successFreqs[i] /= this._successRuns.length;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 2: True Interaction Effects
  // ══════════════════════════════════════════════════════════════════════════

  computeInteractions() {
    const runs = this._runs;
    const N = this._N;
    const interactions = [];
    const minSamples = 15;

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        // Partition runs into 4 cells
        let sumBoth = 0, nBoth = 0;
        let sumAonly = 0, nAonly = 0;
        let sumBonly = 0, nBonly = 0;
        let sumNeither = 0, nNeither = 0;

        for (const run of runs) {
          const hasA = run.bitVec[i] === 1;
          const hasB = run.bitVec[j] === 1;
          if (hasA && hasB) { sumBoth += run.metric; nBoth++; }
          else if (hasA) { sumAonly += run.metric; nAonly++; }
          else if (hasB) { sumBonly += run.metric; nBonly++; }
          else { sumNeither += run.metric; nNeither++; }
        }

        // Require minimum samples in each cell
        if (nBoth < minSamples || nAonly < minSamples || nBonly < minSamples || nNeither < minSamples) continue;

        const meanBoth = sumBoth / nBoth;
        const meanAonly = sumAonly / nAonly;
        const meanBonly = sumBonly / nBonly;
        const meanNeither = sumNeither / nNeither;

        // Interaction effect: superadditive if positive, subadditive if negative
        const interaction = meanBoth - meanAonly - meanBonly + meanNeither;

        // Conditional lift: P(success|A&B) / (P(success|A) * P(success|B) / P(success))
        let successBoth = 0, successAonly = 0, successBonly = 0, successNeither = 0;
        for (const run of runs) {
          const hasA = run.bitVec[i] === 1;
          const hasB = run.bitVec[j] === 1;
          if (run.isSuccess) {
            if (hasA && hasB) successBoth++;
            else if (hasA) successAonly++;
            else if (hasB) successBonly++;
            else successNeither++;
          }
        }

        const pSuccGivenBoth = nBoth > 0 ? successBoth / nBoth : 0;
        const pSuccGivenA = (nBoth + nAonly) > 0 ? (successBoth + successAonly) / (nBoth + nAonly) : 0;
        const pSuccGivenB = (nBoth + nBonly) > 0 ? (successBoth + successBonly) / (nBoth + nBonly) : 0;
        const pSucc = runs.length > 0 ? (successBoth + successAonly + successBonly + successNeither) / runs.length : 0;

        const expectedLift = (pSuccGivenA * pSuccGivenB);
        const lift = expectedLift > 0 ? pSuccGivenBoth / (expectedLift / pSucc) : 0;

        // Chi-squared significance (2x2: has-both vs rest, success vs not)
        const chi2 = this._chiSquared(nBoth, successBoth, runs.length - nBoth,
          successAonly + successBonly + successNeither);

        interactions.push({
          idA: this._allIds[i],
          idB: this._allIds[j],
          nameA: this._upgradeName(this._allIds[i]),
          nameB: this._upgradeName(this._allIds[j]),
          interaction: Math.round(interaction * 100) / 100,
          lift: Math.round(lift * 100) / 100,
          chi2: Math.round(chi2 * 100) / 100,
          nBoth,
          nAonly,
          nBonly,
          nNeither,
          meanBoth: Math.round(meanBoth * 10) / 10,
          meanAonly: Math.round(meanAonly * 10) / 10,
          meanBonly: Math.round(meanBonly * 10) / 10,
          meanNeither: Math.round(meanNeither * 10) / 10,
        });
      }
    }

    // Sort by interaction effect descending
    interactions.sort((a, b) => b.interaction - a.interaction);
    return interactions;
  }

  /**
   * Chi-squared for 2x2 contingency: group1 (n1, success1) vs group2 (n2, success2)
   */
  _chiSquared(n1, success1, n2, success2) {
    const total = n1 + n2;
    if (total === 0) return 0;
    const fail1 = n1 - success1;
    const fail2 = n2 - success2;
    const rowTotals = [n1, n2];
    const colTotals = [success1 + success2, fail1 + fail2];
    const table = [[success1, fail1], [success2, fail2]];

    let chi2 = 0;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const expected = (rowTotals[r] * colTotals[c]) / total;
        if (expected > 0) {
          const diff = table[r][c] - expected;
          chi2 += (diff * diff) / expected;
        }
      }
    }
    return chi2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 3: Apriori Frequent Itemset Mining
  // ══════════════════════════════════════════════════════════════════════════

  mineFrequentSets(interactions) {
    const successRuns = this._successRuns;
    const nSuccess = successRuns.length;
    if (nSuccess === 0) return { L1: [], L2: [], L3: [], L4: [] };

    const minSup = this.minSupport;
    const minLift = this.minLift;

    // ── Level 1: singles with support >= minSupport in success runs ──
    const L1 = [];
    for (let i = 0; i < this._N; i++) {
      const support = this._successFreqs[i];
      if (support >= minSup) {
        L1.push({ items: [i], support });
      }
    }

    // Build interaction lookup for pairs
    const interactionMap = {};
    for (const ix of interactions) {
      const iA = this._idToIdx[ix.idA];
      const iB = this._idToIdx[ix.idB];
      const key = iA < iB ? `${iA},${iB}` : `${iB},${iA}`;
      interactionMap[key] = ix.interaction;
    }

    // ── Level 2: pairs from L1, with support >= minSup AND lift >= minLift AND positive interaction ──
    const L1set = new Set(L1.map(l => l.items[0]));
    const L2 = [];
    const L2set = new Set();

    for (let a = 0; a < L1.length; a++) {
      for (let b = a + 1; b < L1.length; b++) {
        const iA = L1[a].items[0];
        const iB = L1[b].items[0];

        // Count co-occurrence in success runs
        let count = 0;
        for (const run of successRuns) {
          if (run.bitVec[iA] && run.bitVec[iB]) count++;
        }
        const support = count / nSuccess;
        if (support < minSup) continue;

        // Check lift: support(A,B) / (support(A) * support(B))
        const lift = (L1[a].support * L1[b].support) > 0
          ? support / (L1[a].support * L1[b].support)
          : 0;
        if (lift < minLift) continue;

        // Check positive interaction
        const key = iA < iB ? `${iA},${iB}` : `${iB},${iA}`;
        const interaction = interactionMap[key] || 0;
        if (interaction <= 0) continue;

        const pair = [iA, iB].sort((a, b) => a - b);
        L2.push({ items: pair, support, lift: Math.round(lift * 100) / 100, interaction });
        L2set.add(key);
      }
    }

    // ── Level 3: triples where ALL 3 constituent pairs passed L2 ──
    const L3 = [];
    const L3set = new Set();

    // Candidate generation: merge L2 pairs that share first item
    const L2byFirst = {};
    for (const l2 of L2) {
      const first = l2.items[0];
      if (!L2byFirst[first]) L2byFirst[first] = [];
      L2byFirst[first].push(l2.items[1]);
    }

    for (const [first, seconds] of Object.entries(L2byFirst)) {
      const f = parseInt(first);
      for (let a = 0; a < seconds.length; a++) {
        for (let b = a + 1; b < seconds.length; b++) {
          const triple = [f, seconds[a], seconds[b]].sort((x, y) => x - y);
          const [i, j, k] = triple;

          // Check all 3 pairs are in L2
          const p1 = `${i},${j}`;
          const p2 = `${i},${k}`;
          const p3 = `${j},${k}`;
          if (!L2set.has(p1) || !L2set.has(p2) || !L2set.has(p3)) continue;

          // Count support in success runs
          let count = 0;
          for (const run of successRuns) {
            if (run.bitVec[i] && run.bitVec[j] && run.bitVec[k]) count++;
          }
          const support = count / nSuccess;
          if (support < minSup) continue;

          // 3-way interaction via Mobius inversion
          const interaction3 = this._computeThreeWayInteraction(i, j, k);

          const tripleKey = `${i},${j},${k}`;
          L3.push({
            items: triple,
            support,
            interaction: Math.round(interaction3 * 100) / 100,
          });
          L3set.add(tripleKey);
        }
      }
    }

    // ── Level 4: quads where ALL 4 constituent triples passed L3 ──
    const L4 = [];
    const L4set = new Set();

    if (L3.length > 0 && L3.length < 200) {
      // Candidate generation from L3
      const L3items = L3.map(l => l.items);
      for (let a = 0; a < L3items.length; a++) {
        for (let b = a + 1; b < L3items.length; b++) {
          // Merge: must share 2 of 3 items
          const merged = new Set([...L3items[a], ...L3items[b]]);
          if (merged.size !== 4) continue;

          const quad = [...merged].sort((x, y) => x - y);
          const [i, j, k, l] = quad;

          const quadKey = `${i},${j},${k},${l}`;
          if (L4set.has(quadKey)) continue;

          // Check all 4 constituent triples are in L3
          const t1 = `${i},${j},${k}`;
          const t2 = `${i},${j},${l}`;
          const t3 = `${i},${k},${l}`;
          const t4 = `${j},${k},${l}`;
          if (!L3set.has(t1) || !L3set.has(t2) || !L3set.has(t3) || !L3set.has(t4)) continue;

          // Count support
          let count = 0;
          for (const run of successRuns) {
            if (run.bitVec[i] && run.bitVec[j] && run.bitVec[k] && run.bitVec[l]) count++;
          }
          const support = count / nSuccess;
          if (support < minSup) continue;

          L4set.add(quadKey);
          L4.push({ items: quad, support });
        }
      }
    }

    // Convert indices to IDs for output
    const toIds = (items) => items.map(i => this._allIds[i]);
    const toNames = (items) => items.map(i => this._upgradeName(this._allIds[i]));

    return {
      L1: L1.map(l => ({ ids: toIds(l.items), names: toNames(l.items), support: l.support })),
      L2: L2.sort((a, b) => b.interaction - a.interaction)
        .map(l => ({ ids: toIds(l.items), names: toNames(l.items), support: l.support, lift: l.lift, interaction: l.interaction })),
      L3: L3.sort((a, b) => b.interaction - a.interaction)
        .map(l => ({ ids: toIds(l.items), names: toNames(l.items), support: l.support, interaction: l.interaction })),
      L4: L4.map(l => ({ ids: toIds(l.items), names: toNames(l.items), support: l.support })),
    };
  }

  /**
   * 3-way interaction via Mobius inversion:
   * I(A,B,C) = E[M|ABC] - E[M|AB~C] - E[M|A~BC] - E[M|~ABC]
   *          + E[M|A~B~C] + E[M|~AB~C] + E[M|~A~BC] - E[M|~A~B~C]
   */
  _computeThreeWayInteraction(i, j, k) {
    const buckets = {};
    for (let mask = 0; mask < 8; mask++) {
      buckets[mask] = { sum: 0, n: 0 };
    }

    for (const run of this._runs) {
      const mask = (run.bitVec[i] ? 4 : 0) | (run.bitVec[j] ? 2 : 0) | (run.bitVec[k] ? 1 : 0);
      buckets[mask].sum += run.metric;
      buckets[mask].n++;
    }

    // Mean for each bucket (or 0 if empty)
    const m = {};
    for (let mask = 0; mask < 8; mask++) {
      m[mask] = buckets[mask].n > 0 ? buckets[mask].sum / buckets[mask].n : 0;
    }

    // Mobius inversion for 3-way
    return m[7] - m[6] - m[5] - m[3] + m[4] + m[2] + m[1] - m[0];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 4: Weighted Synergy Graph
  // ══════════════════════════════════════════════════════════════════════════

  buildGraph(interactions) {
    const nodes = {};
    const edges = [];

    // Build nodes for all upgrades that appear in any run
    for (let i = 0; i < this._N; i++) {
      if (this._freqs[i] > 0) {
        const id = this._allIds[i];
        const def = this._upgradeMap[id];
        nodes[id] = {
          id,
          name: def ? def.name : id,
          rarity: def ? def.rarity : 'unknown',
          pickRate: Math.round(this._freqs[i] * 1000) / 1000,
          idx: i,
        };
      }
    }

    // Build edges from interactions with |effect| >= minInteraction
    for (const ix of interactions) {
      if (Math.abs(ix.interaction) >= this.minInteraction) {
        edges.push({
          source: ix.idA,
          target: ix.idB,
          weight: ix.interaction,
          type: ix.interaction > 0 ? 'synergy' : 'anti-synergy',
          lift: ix.lift,
          chi2: ix.chi2,
        });
      }
    }

    return { nodes, edges };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 5: Louvain Community Detection
  // ══════════════════════════════════════════════════════════════════════════

  detectCommunities(graph) {
    const { nodes, edges } = graph;
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return { communities: [], bridges: [] };

    // Only use positive edges (synergy)
    const positiveEdges = edges.filter(e => e.weight > 0);

    // Build adjacency map
    const adj = {};
    for (const id of nodeIds) adj[id] = {};
    for (const e of positiveEdges) {
      if (adj[e.source] && adj[e.target]) {
        adj[e.source][e.target] = (adj[e.source][e.target] || 0) + e.weight;
        adj[e.target][e.source] = (adj[e.target][e.source] || 0) + e.weight;
      }
    }

    // Total edge weight (2m)
    let totalWeight = 0;
    for (const e of positiveEdges) totalWeight += e.weight;
    const m2 = totalWeight; // sum of all weights (each edge counted once)
    if (m2 === 0) {
      // No positive edges — each node is its own community
      return {
        communities: nodeIds.map((id, i) => ({
          id: i,
          members: [{ id, name: nodes[id].name, rarity: nodes[id].rarity, pickRate: nodes[id].pickRate }],
          density: 0,
          size: 1,
        })),
        bridges: [],
      };
    }

    // Node degree (weighted)
    const degree = {};
    for (const id of nodeIds) {
      degree[id] = 0;
      for (const w of Object.values(adj[id])) degree[id] += w;
    }

    // Initialize: each node in its own community
    const community = {};
    for (let i = 0; i < nodeIds.length; i++) community[nodeIds[i]] = i;

    // Louvain iteration
    for (let iter = 0; iter < 20; iter++) {
      let changed = false;

      for (const node of nodeIds) {
        const currentComm = community[node];

        // Compute modularity gain for moving to each neighbor's community
        const neighborComms = {};
        for (const [neighbor, w] of Object.entries(adj[node])) {
          const nc = community[neighbor];
          neighborComms[nc] = (neighborComms[nc] || 0) + w;
        }

        // Also consider staying in current community
        if (!(currentComm in neighborComms)) neighborComms[currentComm] = 0;

        // Sum of weights to current community (for removal)
        const ki = degree[node];
        const kiIn = neighborComms[currentComm] || 0;

        // Compute sigma_tot for current community
        let sigmaCurrent = 0;
        for (const id of nodeIds) {
          if (community[id] === currentComm && id !== node) sigmaCurrent += degree[id];
        }

        let bestComm = currentComm;
        let bestGain = 0;

        for (const [commStr, kiToC] of Object.entries(neighborComms)) {
          const comm = parseInt(commStr);
          if (comm === currentComm) continue;

          // Sum of weights in target community
          let sigmaTarget = 0;
          for (const id of nodeIds) {
            if (community[id] === comm) sigmaTarget += degree[id];
          }

          // Delta Q for moving node from current to target community
          const gain = (kiToC - kiIn) / m2 - ki * (sigmaTarget - sigmaCurrent) / (2 * m2 * m2);

          if (gain > bestGain) {
            bestGain = gain;
            bestComm = comm;
          }
        }

        if (bestComm !== currentComm) {
          community[node] = bestComm;
          changed = true;
        }
      }

      if (!changed) break;
    }

    // Collect communities
    const commMembers = {};
    for (const [id, c] of Object.entries(community)) {
      if (!commMembers[c]) commMembers[c] = [];
      commMembers[c].push(id);
    }

    // Build community objects
    const communities = [];
    let commIdx = 0;
    for (const [, members] of Object.entries(commMembers)) {
      if (members.length === 0) continue;

      // Compute internal density
      let internalEdges = 0;
      let totalPossible = (members.length * (members.length - 1)) / 2;
      const memberSet = new Set(members);
      for (const e of positiveEdges) {
        if (memberSet.has(e.source) && memberSet.has(e.target)) internalEdges++;
      }
      const density = totalPossible > 0 ? Math.round((internalEdges / totalPossible) * 100) / 100 : 0;

      communities.push({
        id: commIdx++,
        members: members.map(id => ({ id, name: nodes[id].name, rarity: nodes[id].rarity, pickRate: nodes[id].pickRate })),
        density,
        size: members.length,
      });
    }

    // Sort by size descending
    communities.sort((a, b) => b.size - a.size);

    // Find bridge edges (between communities)
    const bridges = [];
    const nodeComm = {};
    for (const c of communities) {
      for (const m of c.members) nodeComm[m.id] = c.id;
    }
    for (const e of positiveEdges) {
      if (nodeComm[e.source] !== undefined && nodeComm[e.target] !== undefined &&
          nodeComm[e.source] !== nodeComm[e.target]) {
        bridges.push({
          source: e.source,
          sourceName: nodes[e.source] ? nodes[e.source].name : e.source,
          target: e.target,
          targetName: nodes[e.target] ? nodes[e.target].name : e.target,
          weight: e.weight,
          fromComm: nodeComm[e.source],
          toComm: nodeComm[e.target],
        });
      }
    }
    bridges.sort((a, b) => b.weight - a.weight);

    return { communities, bridges };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 6: Betweenness Centrality (Brandes)
  // ══════════════════════════════════════════════════════════════════════════

  computeCentrality(graph) {
    const { nodes, edges } = graph;
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return [];

    // Only positive edges for paths
    const positiveEdges = edges.filter(e => e.weight > 0);

    // Build adjacency list
    const adj = {};
    for (const id of nodeIds) adj[id] = [];
    for (const e of positiveEdges) {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (adj[e.target]) adj[e.target].push(e.source);
    }

    // Brandes algorithm
    const CB = {};
    for (const id of nodeIds) CB[id] = 0;

    for (const s of nodeIds) {
      const stack = [];
      const pred = {};
      const sigma = {};
      const dist = {};
      const delta = {};

      for (const id of nodeIds) {
        pred[id] = [];
        sigma[id] = 0;
        dist[id] = -1;
        delta[id] = 0;
      }

      sigma[s] = 1;
      dist[s] = 0;

      // BFS
      const queue = [s];
      let qi = 0;
      while (qi < queue.length) {
        const v = queue[qi++];
        stack.push(v);

        for (const w of adj[v]) {
          // First time finding w?
          if (dist[w] < 0) {
            dist[w] = dist[v] + 1;
            queue.push(w);
          }
          // Shortest path to w via v?
          if (dist[w] === dist[v] + 1) {
            sigma[w] += sigma[v];
            pred[w].push(v);
          }
        }
      }

      // Accumulation
      while (stack.length > 0) {
        const w = stack.pop();
        for (const v of pred[w]) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
        if (w !== s) {
          CB[w] += delta[w];
        }
      }
    }

    // Normalize (undirected graph: divide by 2)
    const n = nodeIds.length;
    const norm = n > 2 ? (n - 1) * (n - 2) : 1;
    const centrality = nodeIds.map(id => ({
      id,
      name: nodes[id].name,
      rarity: nodes[id].rarity,
      pickRate: nodes[id].pickRate,
      betweenness: Math.round((CB[id] / norm) * 10000) / 10000,
    }));

    centrality.sort((a, b) => b.betweenness - a.betweenness);
    return centrality;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 7: Disconnected Components (Islands)
  // ══════════════════════════════════════════════════════════════════════════

  detectIslands(graph, communityData) {
    const { nodes, edges } = graph;
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return { components: [], fragileConnections: [], suggestions: [] };

    // Only positive edges
    const positiveEdges = edges.filter(e => e.weight > 0);

    // Build adjacency
    const adj = {};
    for (const id of nodeIds) adj[id] = new Set();
    for (const e of positiveEdges) {
      if (adj[e.source]) adj[e.source].add(e.target);
      if (adj[e.target]) adj[e.target].add(e.source);
    }

    // BFS to find connected components
    const visited = new Set();
    const components = [];

    for (const start of nodeIds) {
      if (visited.has(start)) continue;
      const component = [];
      const queue = [start];
      visited.add(start);

      while (queue.length > 0) {
        const v = queue.shift();
        component.push(v);
        for (const w of adj[v]) {
          if (!visited.has(w)) {
            visited.add(w);
            queue.push(w);
          }
        }
      }

      components.push({
        members: component.map(id => ({ id, name: nodes[id].name })),
        size: component.length,
      });
    }

    components.sort((a, b) => b.size - a.size);

    // Find fragile connections: community pairs with 0-2 bridges
    // Only consider communities with 2+ members (skip singletons — they're just
    // upgrades with no detected interactions, not meaningful islands)
    const fragileConnections = [];
    if (communityData && communityData.communities) {
      const comms = communityData.communities.filter(c => c.size >= 2);
      for (let i = 0; i < comms.length; i++) {
        for (let j = i + 1; j < comms.length; j++) {
          const bridges = (communityData.bridges || []).filter(b =>
            (b.fromComm === comms[i].id && b.toComm === comms[j].id) ||
            (b.fromComm === comms[j].id && b.toComm === comms[i].id)
          );
          if (bridges.length <= 2) {
            fragileConnections.push({
              commA: comms[i].id,
              commASize: comms[i].size,
              commB: comms[j].id,
              commBSize: comms[j].size,
              bridgeCount: bridges.length,
              bridges: bridges.map(b => `${b.sourceName} <-> ${b.targetName}`),
            });
          }
        }
      }
    }

    // Design suggestions (ignore singletons — they're just upgrades without
    // enough interaction data, not actionable design problems)
    const suggestions = [];
    const multiComponents = components.filter(c => c.size >= 2);
    if (multiComponents.length > 1) {
      suggestions.push(`${multiComponents.length} multi-upgrade clusters found with no connections between them.`);
      for (let i = 1; i < multiComponents.length; i++) {
        const names = multiComponents[i].members.slice(0, 3).map(m => m.name).join(', ');
        suggestions.push(`Cluster (${multiComponents[i].size} upgrades): ${names}${multiComponents[i].size > 3 ? '...' : ''} — isolated from main network.`);
      }
    }
    const singletonCount = components.filter(c => c.size === 1).length;
    if (singletonCount > 0) {
      suggestions.push(`${singletonCount} upgrades are isolated singletons (no significant interaction effects with any other upgrade).`);
    }
    for (const fc of fragileConnections) {
      if (fc.bridgeCount === 0) {
        suggestions.push(`Communities ${fc.commA} (${fc.commASize} members) and ${fc.commB} (${fc.commBSize} members) have zero bridges — fully disconnected archetypes.`);
      } else if (fc.bridgeCount <= 2) {
        suggestions.push(`Communities ${fc.commA} and ${fc.commB} connected by only ${fc.bridgeCount} bridge(s): ${fc.bridges.join(', ')} — fragile pivot point.`);
      }
    }

    return { components, fragileConnections, suggestions };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 8: Rejection Analysis (requires build traces)
  // ══════════════════════════════════════════════════════════════════════════

  analyzeRejections() {
    const offerCount = {};
    const pickCount = {};
    const rejectionContexts = {}; // id -> array of { winnerId, wave }

    let hasTraces = false;

    for (const run of this._runs) {
      if (!run.buildTrace) continue;
      hasTraces = true;

      for (const entry of run.buildTrace) {
        // Count offers
        for (const offId of entry.offeredIds) {
          offerCount[offId] = (offerCount[offId] || 0) + 1;
        }

        // Count picks
        pickCount[entry.chosenId] = (pickCount[entry.chosenId] || 0) + 1;

        // Track rejections
        for (const rejId of entry.rejectedIds) {
          if (!rejectionContexts[rejId]) rejectionContexts[rejId] = [];
          rejectionContexts[rejId].push({
            winnerId: entry.chosenId,
            wave: entry.wave,
          });
        }
      }
    }

    if (!hasTraces) return null;

    // Build rejection analysis per upgrade
    const rejections = [];
    for (const id of this._allIds) {
      const offers = offerCount[id] || 0;
      const picks = pickCount[id] || 0;
      if (offers === 0) continue;

      const rejRate = 1 - (picks / offers);
      const contexts = rejectionContexts[id] || [];

      // What beats this upgrade? Count which upgrades are chosen over it
      const winnerCounts = {};
      for (const ctx of contexts) {
        winnerCounts[ctx.winnerId] = (winnerCounts[ctx.winnerId] || 0) + 1;
      }
      const topWinners = Object.entries(winnerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([wId, count]) => ({
          id: wId,
          name: this._upgradeName(wId),
          count,
        }));

      rejections.push({
        id,
        name: this._upgradeName(id),
        rarity: this._upgradeMap[id] ? this._upgradeMap[id].rarity : 'unknown',
        offers,
        picks,
        rejectionRate: Math.round(rejRate * 1000) / 1000,
        topWinners,
      });
    }

    // Sort by rejection rate descending
    rejections.sort((a, b) => b.rejectionRate - a.rejectionRate);
    return rejections;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 9: Timing Patterns (requires build traces)
  // ══════════════════════════════════════════════════════════════════════════

  analyzeTimingPatterns() {
    const earlyPicks = {};  // id -> count picked in waves 2-10
    const latePicks = {};   // id -> count picked in waves 30+
    const allPicks = {};    // id -> count total
    const pickWaves = {};   // id -> array of wave numbers

    let hasTraces = false;

    for (const run of this._runs) {
      if (!run.buildTrace) continue;
      hasTraces = true;

      for (const entry of run.buildTrace) {
        const id = entry.chosenId;
        allPicks[id] = (allPicks[id] || 0) + 1;

        if (!pickWaves[id]) pickWaves[id] = [];
        pickWaves[id].push(entry.wave);

        if (entry.wave <= 10) {
          earlyPicks[id] = (earlyPicks[id] || 0) + 1;
        } else if (entry.wave >= 30) {
          latePicks[id] = (latePicks[id] || 0) + 1;
        }
      }
    }

    if (!hasTraces) return null;

    // Per-upgrade timing data
    const timing = [];
    for (const id of this._allIds) {
      const total = allPicks[id] || 0;
      if (total === 0) continue;

      const early = earlyPicks[id] || 0;
      const late = latePicks[id] || 0;
      const waves = pickWaves[id] || [];
      const avgWave = waves.length > 0 ? waves.reduce((a, b) => a + b, 0) / waves.length : 0;

      timing.push({
        id,
        name: this._upgradeName(id),
        totalPicks: total,
        earlyPicks: early,
        earlyPct: Math.round((early / total) * 100),
        latePicks: late,
        latePct: Math.round((late / total) * 100),
        avgPickWave: Math.round(avgWave * 10) / 10,
      });
    }

    // Pivot wave detection: at what wave does average build identity crystallize?
    // Measure: for each wave, compute average Jaccard similarity between
    // the upgrade set at that wave and the final upgrade set
    const pivotData = [];
    const maxWave = Math.max(...this._runs.filter(r => r.buildTrace).map(r => r.buildTrace.length > 0 ? r.buildTrace[r.buildTrace.length - 1].wave : 0));

    if (maxWave > 0) {
      for (let w = 2; w <= Math.min(maxWave, 50); w++) {
        let totalSim = 0;
        let count = 0;

        for (const run of this._runs) {
          if (!run.buildTrace || run.buildTrace.length === 0) continue;

          // Upgrades picked by wave w
          const atWave = new Set();
          for (const entry of run.buildTrace) {
            if (entry.wave <= w) atWave.add(entry.chosenId);
          }

          // Final upgrade set
          const finalSet = run.upgradeSet;
          if (finalSet.size === 0) continue;

          // Jaccard similarity
          let intersection = 0;
          for (const id of atWave) {
            if (finalSet.has(id)) intersection++;
          }
          const union = new Set([...atWave, ...finalSet]).size;
          if (union > 0) {
            totalSim += intersection / union;
            count++;
          }
        }

        if (count > 0) {
          pivotData.push({
            wave: w,
            avgSimilarity: Math.round((totalSim / count) * 1000) / 1000,
          });
        }
      }
    }

    // Find pivot wave: first wave where similarity > 0.5
    let pivotWave = null;
    for (const pd of pivotData) {
      if (pd.avgSimilarity >= 0.5) {
        pivotWave = pd.wave;
        break;
      }
    }

    timing.sort((a, b) => a.avgPickWave - b.avgPickWave);

    return {
      upgrades: timing,
      pivotWave,
      pivotData,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Top-level orchestrator
  // ══════════════════════════════════════════════════════════════════════════

  analyze() {
    this._prepareData();

    const interactions = this.computeInteractions();
    const itemsets = this.mineFrequentSets(interactions);
    const graphData = this.buildGraph(interactions);
    const communityData = this.detectCommunities(graphData);
    const centrality = this.computeCentrality(graphData);
    const islands = this.detectIslands(graphData, communityData);
    const rejections = this.analyzeRejections();
    const timing = this.analyzeTimingPatterns();

    // Summary stats
    const summary = {
      totalRuns: this._runs.length,
      successRuns: this._successRuns.length,
      uniqueUpgradesUsed: this._allIds.filter((_, i) => this._freqs[i] > 0).length,
      totalUpgrades: this._N,
      graphNodes: Object.keys(graphData.nodes).length,
      graphEdges: graphData.edges.length,
      positiveEdges: graphData.edges.filter(e => e.weight > 0).length,
      negativeEdges: graphData.edges.filter(e => e.weight < 0).length,
      communities: communityData.communities.length,
      connectedComponents: islands.components.length,
      topSynergies: interactions.slice(0, 5).map(ix => `${ix.nameA} + ${ix.nameB} (+${ix.interaction}w)`),
      topAntiSynergies: interactions.slice(-5).reverse()
        .filter(ix => ix.interaction < 0)
        .map(ix => `${ix.nameA} + ${ix.nameB} (${ix.interaction}w)`),
      itemsetsL2: itemsets.L2.length,
      itemsetsL3: itemsets.L3.length,
      itemsetsL4: itemsets.L4.length,
      pivotWave: timing ? timing.pivotWave : null,
      hasTraces: this._runs.some(r => r.buildTrace !== null),
    };

    return {
      interactions,
      itemsets,
      communities: communityData,
      centrality,
      islands,
      rejections,
      timing,
      graphData,
      summary,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _upgradeName(id) {
    return this._upgradeMap[id] ? this._upgradeMap[id].name : id;
  }
}

module.exports = { SynergyNetwork };

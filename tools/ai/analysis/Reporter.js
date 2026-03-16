/**
 * Reporter — output formatting for analysis results.
 *
 * Supports ASCII tables, CSV, JSON, and Markdown output formats.
 */

const { GAME } = require('../shared/gameData');

class Reporter {
  /**
   * @param {object} options
   * @param {string} [options.format='ascii'] - 'ascii', 'csv', 'json', 'markdown'
   */
  constructor(options = {}) {
    this.format = options.format || 'ascii';
    // Build upgrade lookup
    this._upgradeMap = {};
    for (const u of GAME.upgrades) {
      this._upgradeMap[u.id] = u;
    }
  }

  /**
   * Right-pad a string to a given width.
   * @param {*} val - Value to pad (coerced to string)
   * @param {number} width - Target width
   * @returns {string}
   */
  pad(val, width) {
    const s = String(val);
    if (s.length >= width) return s.slice(0, width);
    return s + ' '.repeat(width - s.length);
  }

  /**
   * Left-pad a string to a given width.
   */
  _lpad(val, width) {
    const s = String(val);
    if (s.length >= width) return s.slice(0, width);
    return ' '.repeat(width - s.length) + s;
  }

  /**
   * Format the tier list as an ASCII table with visual bars.
   * @param {object[]} tierData - Output of Analyzer.tierList()
   * @returns {string}
   */
  reportTierList(tierData) {
    if (this.format === 'json') return this.toJSON(tierData) + '\n';
    if (this.format === 'csv') {
      return this.toCSV(tierData, ['id', 'name', 'rarity', 'tier', 'marginalValue', 'pickRate', 'avgWavesWith', 'avgWavesWithout', 'samplesWith', 'samplesWithout']) + '\n';
    }

    const sep = this.format === 'markdown' ? '|' : ' ';
    let out = '';

    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  UPGRADE TIER LIST\n';
    out += '='.repeat(90) + '\n\n';

    // Group by tier
    const tiers = ['S', 'A', 'B', 'C', 'D', 'N/A'];
    const tierLabels = {
      'S': 'S-TIER (>30% lift)  ',
      'A': 'A-TIER (15-30% lift)',
      'B': 'B-TIER (5-15% lift) ',
      'C': 'C-TIER (-5% to 5%)  ',
      'D': 'D-TIER (<-5% lift)  ',
      'N/A': 'UNRANKED (no data)  ',
    };

    if (this.format === 'markdown') {
      out += '| Tier | ID | Name | Rarity | Lift | Pick% | Avg With | Avg Without | Bar |\n';
      out += '|------|-----|------|--------|------|-------|----------|-------------|-----|\n';
      for (const entry of tierData) {
        const bar = this._bar(entry.marginalValue, 0.5, 10);
        out += `| ${entry.tier} | ${entry.id} | ${entry.name} | ${entry.rarity} | ${this._pct(entry.marginalValue)} | ${this._pct(entry.pickRate)} | ${entry.avgWavesWith.toFixed(1)} | ${entry.avgWavesWithout.toFixed(1)} | ${bar} |\n`;
      }
      out += '\n';
      return out;
    }

    // ASCII table
    const header = `  ${this.pad('Tier', 4)} ${this.pad('ID', 4)} ${this.pad('Name', 24)} ${this.pad('Rarity', 10)} ${this._lpad('Lift', 7)} ${this._lpad('Pick%', 6)} ${this._lpad('w/ Avg', 7)} ${this._lpad('w/o Avg', 7)}  Bar`;
    out += header + '\n';
    out += '  ' + '-'.repeat(header.length - 2) + '\n';

    for (const tierKey of tiers) {
      const items = tierData.filter(e => e.tier === tierKey);
      if (items.length === 0) continue;

      out += `\n  ${tierLabels[tierKey]}\n`;

      for (const entry of items) {
        const bar = this._bar(entry.marginalValue, 0.5, 20);
        out += `  ${this.pad(entry.tier, 4)} ${this.pad(entry.id, 4)} ${this.pad(entry.name, 24)} ${this.pad(entry.rarity, 10)} ${this._lpad(this._pct(entry.marginalValue), 7)} ${this._lpad(this._pct(entry.pickRate), 6)} ${this._lpad(entry.avgWavesWith.toFixed(1), 7)} ${this._lpad(entry.avgWavesWithout.toFixed(1), 7)}  ${bar}\n`;
      }
    }

    out += '\n';
    return out;
  }

  /**
   * Format synergy data as a table.
   * @param {object[]} synergyData - Output of Analyzer.synergyMatrix()
   * @returns {string}
   */
  reportSynergies(synergyData) {
    if (this.format === 'json') return this.toJSON(synergyData) + '\n';
    if (this.format === 'csv') {
      return this.toCSV(synergyData, ['upgrade1', 'upgrade2', 'lift', 'significance', 'samplesBoth']) + '\n';
    }

    let out = '';
    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  UPGRADE SYNERGIES (Top 30)\n';
    out += '='.repeat(90) + '\n\n';

    if (synergyData.length === 0) {
      out += '  No significant synergies found (need more data or samplesBoth >= 10).\n\n';
      return out;
    }

    if (this.format === 'markdown') {
      out += '| # | Upgrade 1 | Upgrade 2 | Lift | Chi2 | Samples |\n';
      out += '|---|-----------|-----------|------|------|----------|\n';
      for (let i = 0; i < synergyData.length; i++) {
        const s = synergyData[i];
        const name1 = this._upgradeName(s.upgrade1);
        const name2 = this._upgradeName(s.upgrade2);
        out += `| ${i + 1} | ${name1} (${s.upgrade1}) | ${name2} (${s.upgrade2}) | ${s.lift.toFixed(2)} | ${s.significance.toFixed(1)} | ${s.samplesBoth} |\n`;
      }
      out += '\n';
      return out;
    }

    // ASCII
    const header = `  ${this._lpad('#', 3)} ${this.pad('Upgrade 1', 28)} ${this.pad('Upgrade 2', 28)} ${this._lpad('Lift', 8)} ${this._lpad('Chi2', 7)} ${this._lpad('n(both)', 8)}`;
    out += header + '\n';
    out += '  ' + '-'.repeat(header.length - 2) + '\n';

    for (let i = 0; i < synergyData.length; i++) {
      const s = synergyData[i];
      const name1 = `${this._upgradeName(s.upgrade1)} (${s.upgrade1})`;
      const name2 = `${this._upgradeName(s.upgrade2)} (${s.upgrade2})`;
      const liftSign = s.lift >= 0 ? '+' : '';
      out += `  ${this._lpad(i + 1, 3)} ${this.pad(name1, 28)} ${this.pad(name2, 28)} ${this._lpad(liftSign + s.lift.toFixed(2), 8)} ${this._lpad(s.significance.toFixed(1), 7)} ${this._lpad(s.samplesBoth, 8)}\n`;
    }

    out += '\n';
    return out;
  }

  /**
   * Format build cluster data.
   * @param {object[]} clusterData - Output of Analyzer.buildClustering()
   * @returns {string}
   */
  reportClusters(clusterData) {
    if (this.format === 'json') return this.toJSON(clusterData) + '\n';
    if (this.format === 'csv') {
      const flat = clusterData.map(c => ({
        name: c.name,
        size: c.size,
        avgWaves: c.avgWaves,
        avgFitness: c.avgFitness,
        keyUpgrades: c.keyUpgrades.map(ku => `${ku.id}(${ku.frequency})`).join('; '),
      }));
      return this.toCSV(flat, ['name', 'size', 'avgWaves', 'avgFitness', 'keyUpgrades']) + '\n';
    }

    let out = '';
    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  BUILD ARCHETYPES (Top 20% Clustering)\n';
    out += '='.repeat(90) + '\n\n';

    if (clusterData.length === 0) {
      out += '  Not enough data to cluster builds.\n\n';
      return out;
    }

    for (let i = 0; i < clusterData.length; i++) {
      const c = clusterData[i];
      if (this.format === 'markdown') {
        out += `### Archetype ${i + 1}: ${c.name}\n`;
        out += `- **Size:** ${c.size} runs | **Avg Waves:** ${c.avgWaves} | **Avg Fitness:** ${c.avgFitness}\n`;
        out += `- **Key Upgrades:**\n`;
        for (const ku of c.keyUpgrades) {
          const name = this._upgradeName(ku.id);
          out += `  - ${name} (${ku.id}): ${Math.round(ku.frequency * 100)}% pick rate\n`;
        }
        out += '\n';
      } else {
        out += `  Archetype ${i + 1}: ${c.name}\n`;
        out += `  ${'~'.repeat(40)}\n`;
        out += `  Size: ${c.size} runs  |  Avg Waves: ${c.avgWaves}  |  Avg Fitness: ${c.avgFitness}\n`;
        out += `  Key Upgrades:\n`;
        for (const ku of c.keyUpgrades) {
          const name = this._upgradeName(ku.id);
          const freqBar = this._bar(ku.frequency, 1.0, 15);
          out += `    ${this.pad(`${name} (${ku.id})`, 32)} ${this._lpad(Math.round(ku.frequency * 100) + '%', 5)} ${freqBar}\n`;
        }
        out += '\n';
      }
    }

    return out;
  }

  /**
   * Format breakpoint / survival curve data.
   * @param {object} breakpointData - Output of Analyzer.breakpoints()
   * @returns {string}
   */
  reportBreakpoints(breakpointData) {
    if (this.format === 'json') return this.toJSON(breakpointData) + '\n';

    const { survivalCurve, deathSpikes, medianWave, p10, p90 } = breakpointData;

    if (this.format === 'csv') {
      let out = 'section,wave,value,label\n';
      for (const s of survivalCurve) {
        out += `survival,${s.wave},${s.survivalPct},\n`;
      }
      for (const d of deathSpikes) {
        out += `deathSpike,${d.wave},${d.dropPct},${d.eventName || ''}\n`;
      }
      out += `percentile,,${medianWave},median\n`;
      out += `percentile,,${p10},p10\n`;
      out += `percentile,,${p90},p90\n`;
      return out;
    }

    let out = '';
    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  SURVIVAL ANALYSIS\n';
    out += '='.repeat(90) + '\n\n';

    // Summary stats
    out += `  Median Wave: ${medianWave}  |  P10: ${p10}  |  P90: ${p90}\n\n`;

    // ASCII survival curve (show every 5th wave for compactness, or all if <= 30)
    if (survivalCurve.length > 0) {
      if (this.format === 'markdown') {
        out += '#### Survival Curve\n\n';
        out += '| Wave | Survival % | Bar |\n';
        out += '|------|-----------|-----|\n';
      } else {
        out += '  Survival Curve:\n';
        out += `  ${this._lpad('Wave', 6)} ${this._lpad('Surv%', 7)}  Graph\n`;
        out += '  ' + '-'.repeat(60) + '\n';
      }

      const step = survivalCurve.length <= 30 ? 1 : 5;
      for (let i = 0; i < survivalCurve.length; i += step) {
        const s = survivalCurve[i];
        const bar = this._bar(s.survivalPct / 100, 1.0, 30);
        if (this.format === 'markdown') {
          out += `| ${s.wave} | ${s.survivalPct.toFixed(1)}% | ${bar} |\n`;
        } else {
          out += `  ${this._lpad(s.wave, 6)} ${this._lpad(s.survivalPct.toFixed(1) + '%', 7)}  ${bar}\n`;
        }
      }
      out += '\n';
    }

    // Death spikes
    if (deathSpikes.length > 0) {
      if (this.format === 'markdown') {
        out += '#### Death Spikes (>5% drop)\n\n';
        out += '| Wave | Drop % | Event |\n';
        out += '|------|--------|-------|\n';
        for (const d of deathSpikes) {
          out += `| ${d.wave} | ${d.dropPct.toFixed(1)}% | ${d.eventName || '-'} |\n`;
        }
      } else {
        out += '  Death Spikes (>5% survival drop in one wave):\n';
        out += `  ${this._lpad('Wave', 6)} ${this._lpad('Drop', 7)}  Event\n`;
        out += '  ' + '-'.repeat(50) + '\n';
        for (const d of deathSpikes) {
          out += `  ${this._lpad(d.wave, 6)} ${this._lpad(d.dropPct.toFixed(1) + '%', 7)}  ${d.eventName || '-'}\n`;
        }
      }
      out += '\n';
    } else {
      out += '  No major death spikes detected.\n\n';
    }

    return out;
  }

  /**
   * Side-by-side agent comparison table.
   * @param {object} agentResults - { agentName: { results: GameResult[], stats: { avgWaves, medianWaves, maxWaves, avgScore, avgDoorHP } } }
   * @returns {string}
   */
  reportComparison(agentResults) {
    if (this.format === 'json') return this.toJSON(agentResults) + '\n';

    const agents = Object.keys(agentResults);

    if (this.format === 'csv') {
      const rows = agents.map(name => {
        const s = agentResults[name].stats || this._computeStats(agentResults[name].results);
        return { agent: name, ...s };
      });
      return this.toCSV(rows, ['agent', 'avgWaves', 'medianWaves', 'maxWaves', 'avgScore', 'avgDoorHP']) + '\n';
    }

    let out = '';
    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  AGENT COMPARISON\n';
    out += '='.repeat(90) + '\n\n';

    const metrics = ['avgWaves', 'medianWaves', 'maxWaves', 'avgScore', 'avgDoorHP'];
    const metricLabels = {
      avgWaves: 'Avg Waves',
      medianWaves: 'Median Waves',
      maxWaves: 'Max Waves',
      avgScore: 'Avg Score',
      avgDoorHP: 'Avg Door HP',
    };

    if (this.format === 'markdown') {
      out += '| Metric | ' + agents.join(' | ') + ' |\n';
      out += '|--------|' + agents.map(() => '------').join('|') + '|\n';
      for (const m of metrics) {
        const vals = agents.map(name => {
          const s = agentResults[name].stats || this._computeStats(agentResults[name].results);
          return typeof s[m] === 'number' ? s[m].toFixed(1) : '-';
        });
        out += `| ${metricLabels[m]} | ${vals.join(' | ')} |\n`;
      }
      out += '\n';
      return out;
    }

    // ASCII table
    const colWidth = 14;
    const labelWidth = 16;
    out += `  ${this.pad('Metric', labelWidth)}`;
    for (const name of agents) {
      out += this._lpad(name, colWidth);
    }
    out += '\n';
    out += '  ' + '-'.repeat(labelWidth + agents.length * colWidth) + '\n';

    for (const m of metrics) {
      out += `  ${this.pad(metricLabels[m], labelWidth)}`;
      for (const name of agents) {
        const s = agentResults[name].stats || this._computeStats(agentResults[name].results);
        const val = typeof s[m] === 'number' ? s[m].toFixed(1) : '-';
        out += this._lpad(val, colWidth);
      }
      out += '\n';
    }

    out += '\n';
    return out;
  }

  /**
   * Generation-by-generation GA fitness chart using ASCII sparklines.
   * @param {object[]} gaHistory - Array of { gen, bestFitness, avgFitness, worstFitness }
   * @returns {string}
   */
  reportGAProgress(gaHistory) {
    if (this.format === 'json') return this.toJSON(gaHistory) + '\n';
    if (this.format === 'csv') {
      return this.toCSV(gaHistory, ['gen', 'bestFitness', 'avgFitness', 'worstFitness']) + '\n';
    }

    let out = '';
    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  GA PROGRESS\n';
    out += '='.repeat(90) + '\n\n';

    if (gaHistory.length === 0) {
      out += '  No GA history data.\n\n';
      return out;
    }

    const maxFit = Math.max(...gaHistory.map(h => h.bestFitness));
    const minFit = Math.min(...gaHistory.map(h => h.worstFitness || h.avgFitness));

    if (this.format === 'markdown') {
      out += '| Gen | Best | Avg | Worst | Sparkline |\n';
      out += '|-----|------|-----|-------|----------|\n';
      for (const h of gaHistory) {
        const spark = this._sparkChar(h.bestFitness, minFit, maxFit);
        out += `| ${h.gen} | ${h.bestFitness.toFixed(1)} | ${h.avgFitness.toFixed(1)} | ${(h.worstFitness || 0).toFixed(1)} | ${spark} |\n`;
      }
      out += '\n';
      return out;
    }

    // ASCII chart
    const header = `  ${this._lpad('Gen', 5)} ${this._lpad('Best', 8)} ${this._lpad('Avg', 8)} ${this._lpad('Worst', 8)}  Chart`;
    out += header + '\n';
    out += '  ' + '-'.repeat(header.length - 2) + '\n';

    // Show every Nth generation to keep output manageable
    const step = gaHistory.length <= 50 ? 1 : Math.ceil(gaHistory.length / 50);

    for (let i = 0; i < gaHistory.length; i += step) {
      const h = gaHistory[i];
      const barLen = maxFit > minFit ? Math.round(((h.bestFitness - minFit) / (maxFit - minFit)) * 30) : 15;
      const avgBarLen = maxFit > minFit ? Math.round(((h.avgFitness - minFit) / (maxFit - minFit)) * 30) : 15;
      const bestBar = '#'.repeat(Math.max(0, barLen));
      const avgMark = avgBarLen < barLen ? ' '.repeat(avgBarLen) + '|' : '';
      out += `  ${this._lpad(h.gen, 5)} ${this._lpad(h.bestFitness.toFixed(1), 8)} ${this._lpad(h.avgFitness.toFixed(1), 8)} ${this._lpad((h.worstFitness || 0).toFixed(1), 8)}  ${bestBar}${avgMark ? ' avg:' + this._lpad(avgBarLen, 2) : ''}\n`;
    }

    // Show final entry if we skipped it
    if (step > 1) {
      const last = gaHistory[gaHistory.length - 1];
      const barLen = maxFit > minFit ? Math.round(((last.bestFitness - minFit) / (maxFit - minFit)) * 30) : 15;
      const bar = '#'.repeat(Math.max(0, barLen));
      out += `  ${this._lpad(last.gen, 5)} ${this._lpad(last.bestFitness.toFixed(1), 8)} ${this._lpad(last.avgFitness.toFixed(1), 8)} ${this._lpad((last.worstFitness || 0).toFixed(1), 8)}  ${bar} (final)\n`;
    }

    out += '\n';
    return out;
  }

  /**
   * Q-learning episode progress chart.
   * @param {object[]} qlHistory - Array of { episode, avgReward, epsilon, maxWaves }
   * @returns {string}
   */
  reportQLearningProgress(qlHistory) {
    if (this.format === 'json') return this.toJSON(qlHistory) + '\n';
    if (this.format === 'csv') {
      return this.toCSV(qlHistory, ['episode', 'avgReward', 'epsilon', 'maxWaves']) + '\n';
    }

    let out = '';
    out += '\n';
    out += '='.repeat(90) + '\n';
    out += '  Q-LEARNING PROGRESS\n';
    out += '='.repeat(90) + '\n\n';

    if (qlHistory.length === 0) {
      out += '  No Q-learning history data.\n\n';
      return out;
    }

    const maxReward = Math.max(...qlHistory.map(h => h.avgReward));
    const minReward = Math.min(...qlHistory.map(h => h.avgReward));

    if (this.format === 'markdown') {
      out += '| Episode | Avg Reward | Epsilon | Max Waves |\n';
      out += '|---------|-----------|---------|----------|\n';
      for (const h of qlHistory) {
        out += `| ${h.episode} | ${h.avgReward.toFixed(2)} | ${h.epsilon.toFixed(3)} | ${h.maxWaves} |\n`;
      }
      out += '\n';
      return out;
    }

    // ASCII
    const header = `  ${this._lpad('Episode', 8)} ${this._lpad('Avg Reward', 11)} ${this._lpad('Epsilon', 8)} ${this._lpad('Max Waves', 10)}  Chart`;
    out += header + '\n';
    out += '  ' + '-'.repeat(header.length - 2) + '\n';

    for (const h of qlHistory) {
      const barLen = maxReward > minReward ? Math.round(((h.avgReward - minReward) / (maxReward - minReward)) * 25) : 12;
      const bar = '#'.repeat(Math.max(0, barLen));
      out += `  ${this._lpad(h.episode, 8)} ${this._lpad(h.avgReward.toFixed(2), 11)} ${this._lpad(h.epsilon.toFixed(3), 8)} ${this._lpad(h.maxWaves, 10)}  ${bar}\n`;
    }

    out += '\n';
    return out;
  }

  /**
   * Full report combining all analyses.
   * @param {Analyzer} analyzer - Analyzer instance
   * @param {object} [agentResults] - Optional agent comparison data
   * @returns {string}
   */
  fullReport(analyzer, agentResults) {
    let output = '';
    output += this.reportTierList(analyzer.tierList());
    output += this.reportSynergies(analyzer.synergyMatrix());
    output += this.reportClusters(analyzer.buildClustering());
    output += this.reportBreakpoints(analyzer.breakpoints());
    if (agentResults) output += this.reportComparison(agentResults);
    return output;
  }

  /**
   * Convert data to CSV string.
   * @param {object[]} data - Array of objects
   * @param {string[]} columns - Column names (keys of objects)
   * @returns {string}
   */
  toCSV(data, columns) {
    if (!data || data.length === 0) return columns.join(',') + '\n';

    let out = columns.join(',') + '\n';
    for (const row of data) {
      const vals = columns.map(col => {
        const val = row[col];
        if (val === undefined || val === null) return '';
        const str = String(val);
        // Quote if contains comma, newline, or quote
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      out += vals.join(',') + '\n';
    }
    return out;
  }

  /**
   * Convert data to formatted JSON string.
   * @param {*} data
   * @returns {string}
   */
  toJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SYNERGY NETWORK REPORTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Main entry point for synergy network reporting.
   * @param {object} data - Output of SynergyNetwork.analyze()
   * @returns {string}
   */
  reportSynergyNetwork(data) {
    if (this.format === 'json') return this.toJSON(data) + '\n';

    let out = '';
    out += this.reportInteractionEffects(data.interactions);
    out += this.reportFrequentItemsets(data.itemsets);
    out += this.reportBuildCommunities(data.communities);
    out += this.reportBridgeUpgrades(data.centrality);
    out += this.reportIslands(data.islands);
    if (data.rejections) out += this.reportRejections(data.rejections);
    out += this.reportDesignInsights(data.summary);
    return out;
  }

  /**
   * Format interaction effects table — top 30 synergies + top 10 anti-synergies.
   * @param {object[]} interactions
   * @returns {string}
   */
  reportInteractionEffects(interactions) {
    if (this.format === 'json') return this.toJSON(interactions) + '\n';

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  INTERACTION EFFECTS (True Synergy / Anti-Synergy)\n';
    out += '='.repeat(100) + '\n\n';

    if (interactions.length === 0) {
      out += '  No significant interaction effects found.\n\n';
      return out;
    }

    // Top 30 synergies (positive interaction)
    const synergies = interactions.filter(ix => ix.interaction > 0).slice(0, 30);
    if (synergies.length > 0) {
      out += '  TOP SYNERGIES (superadditive — combo is better than sum of parts)\n';
      out += '  ' + '-'.repeat(96) + '\n';

      const header = `  ${this._lpad('#', 3)} ${this.pad('Upgrade A', 22)} ${this.pad('Upgrade B', 22)} ${this._lpad('Effect', 8)} ${this._lpad('Lift', 6)} ${this._lpad('Chi2', 7)} ${this._lpad('n(AB)', 6)} ${this._lpad('E[AB]', 6)} ${this._lpad('E[A]', 6)} ${this._lpad('E[B]', 6)}`;
      out += header + '\n';
      out += '  ' + '-'.repeat(96) + '\n';

      for (let i = 0; i < synergies.length; i++) {
        const ix = synergies[i];
        out += `  ${this._lpad(i + 1, 3)} ${this.pad(ix.nameA, 22)} ${this.pad(ix.nameB, 22)} ${this._lpad('+' + ix.interaction.toFixed(1) + 'w', 8)} ${this._lpad(ix.lift.toFixed(2), 6)} ${this._lpad(ix.chi2.toFixed(1), 7)} ${this._lpad(ix.nBoth, 6)} ${this._lpad(ix.meanBoth.toFixed(1), 6)} ${this._lpad(ix.meanAonly.toFixed(1), 6)} ${this._lpad(ix.meanBonly.toFixed(1), 6)}\n`;
      }
      out += '\n';
    }

    // Top 10 anti-synergies (negative interaction)
    const antis = interactions.filter(ix => ix.interaction < 0);
    antis.sort((a, b) => a.interaction - b.interaction);
    const topAntis = antis.slice(0, 10);

    if (topAntis.length > 0) {
      out += '  TOP ANTI-SYNERGIES (subadditive — combo is worse than expected)\n';
      out += '  ' + '-'.repeat(96) + '\n';

      for (let i = 0; i < topAntis.length; i++) {
        const ix = topAntis[i];
        out += `  ${this._lpad(i + 1, 3)} ${this.pad(ix.nameA, 22)} ${this.pad(ix.nameB, 22)} ${this._lpad(ix.interaction.toFixed(1) + 'w', 8)} ${this._lpad(ix.lift.toFixed(2), 6)} ${this._lpad(ix.chi2.toFixed(1), 7)} ${this._lpad(ix.nBoth, 6)}\n`;
      }
      out += '\n';
    }

    return out;
  }

  /**
   * Format frequent itemsets grouped by size (2/3/4-wise).
   * @param {object} itemsets - { L1, L2, L3, L4 }
   * @returns {string}
   */
  reportFrequentItemsets(itemsets) {
    if (this.format === 'json') return this.toJSON(itemsets) + '\n';

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  FREQUENT UPGRADE COMBOS (Apriori Itemsets)\n';
    out += '='.repeat(100) + '\n\n';

    out += `  L1 (singles): ${itemsets.L1.length} upgrades with sufficient support in success runs\n\n`;

    // L2: pairs
    if (itemsets.L2.length > 0) {
      out += `  L2 PAIRS (${itemsets.L2.length} significant combos):\n`;
      out += '  ' + '-'.repeat(80) + '\n';
      const header2 = `  ${this._lpad('#', 3)} ${this.pad('Upgrade A', 22)} ${this.pad('Upgrade B', 22)} ${this._lpad('Sup%', 6)} ${this._lpad('Lift', 6)} ${this._lpad('Effect', 8)}`;
      out += header2 + '\n';
      out += '  ' + '-'.repeat(80) + '\n';

      const show2 = itemsets.L2.slice(0, 30);
      for (let i = 0; i < show2.length; i++) {
        const l = show2[i];
        out += `  ${this._lpad(i + 1, 3)} ${this.pad(l.names[0], 22)} ${this.pad(l.names[1], 22)} ${this._lpad((l.support * 100).toFixed(1), 6)} ${this._lpad(l.lift.toFixed(2), 6)} ${this._lpad('+' + l.interaction.toFixed(1) + 'w', 8)}\n`;
      }
      if (itemsets.L2.length > 30) {
        out += `  ... and ${itemsets.L2.length - 30} more\n`;
      }
      out += '\n';
    }

    // L3: triples
    if (itemsets.L3.length > 0) {
      out += `  L3 TRIPLES (${itemsets.L3.length} significant combos):\n`;
      out += '  ' + '-'.repeat(80) + '\n';
      const header3 = `  ${this._lpad('#', 3)} ${this.pad('Upgrades', 60)} ${this._lpad('Sup%', 6)} ${this._lpad('3-way', 8)}`;
      out += header3 + '\n';
      out += '  ' + '-'.repeat(80) + '\n';

      const show3 = itemsets.L3.slice(0, 20);
      for (let i = 0; i < show3.length; i++) {
        const l = show3[i];
        const nameStr = l.names.join(' + ');
        out += `  ${this._lpad(i + 1, 3)} ${this.pad(nameStr, 60)} ${this._lpad((l.support * 100).toFixed(1), 6)} ${this._lpad(l.interaction.toFixed(1) + 'w', 8)}\n`;
      }
      if (itemsets.L3.length > 20) {
        out += `  ... and ${itemsets.L3.length - 20} more\n`;
      }
      out += '\n';
    }

    // L4: quads
    if (itemsets.L4.length > 0) {
      out += `  L4 QUADS (${itemsets.L4.length} significant combos):\n`;
      out += '  ' + '-'.repeat(80) + '\n';

      for (let i = 0; i < itemsets.L4.length; i++) {
        const l = itemsets.L4[i];
        out += `  ${this._lpad(i + 1, 3)} ${l.names.join(' + ')}  (sup: ${(l.support * 100).toFixed(1)}%)\n`;
      }
      out += '\n';
    }

    if (itemsets.L2.length === 0 && itemsets.L3.length === 0 && itemsets.L4.length === 0) {
      out += '  No significant multi-upgrade combos found at current thresholds.\n\n';
    }

    return out;
  }

  /**
   * Format build communities — members, density, bridges.
   * @param {object} communityData - { communities, bridges }
   * @returns {string}
   */
  reportBuildCommunities(communityData) {
    if (this.format === 'json') return this.toJSON(communityData) + '\n';

    const { communities, bridges } = communityData;

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  BUILD ARCHETYPES (Louvain Communities)\n';
    out += '='.repeat(100) + '\n\n';

    if (communities.length === 0) {
      out += '  No communities detected.\n\n';
      return out;
    }

    for (const c of communities) {
      if (c.size < 2) continue; // Skip singletons

      out += `  Community ${c.id} — ${c.size} upgrades, density: ${c.density}\n`;
      out += '  ' + '~'.repeat(50) + '\n';

      // Group members by rarity
      const byRarity = { common: [], rare: [], legendary: [], unknown: [] };
      for (const m of c.members) {
        const bucket = byRarity[m.rarity] || byRarity.unknown;
        bucket.push(m);
      }

      for (const [rarity, members] of Object.entries(byRarity)) {
        if (members.length === 0) continue;
        const names = members.map(m => `${m.name} (${(m.pickRate * 100).toFixed(0)}%)`).join(', ');
        out += `    ${rarity}: ${names}\n`;
      }
      out += '\n';
    }

    // Bridges between communities
    if (bridges.length > 0) {
      out += '  INTER-COMMUNITY BRIDGES:\n';
      out += '  ' + '-'.repeat(70) + '\n';
      const showBridges = bridges.slice(0, 15);
      for (const b of showBridges) {
        out += `    ${this.pad(b.sourceName, 22)} <-> ${this.pad(b.targetName, 22)} (comm ${b.fromComm} <-> ${b.toComm}, +${b.weight.toFixed(1)}w)\n`;
      }
      out += '\n';
    }

    return out;
  }

  /**
   * Format bridge upgrades — top 15 by betweenness centrality.
   * @param {object[]} centrality
   * @returns {string}
   */
  reportBridgeUpgrades(centrality) {
    if (this.format === 'json') return this.toJSON(centrality) + '\n';

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  BRIDGE / PIVOT UPGRADES (Betweenness Centrality)\n';
    out += '='.repeat(100) + '\n\n';

    if (centrality.length === 0) {
      out += '  No centrality data.\n\n';
      return out;
    }

    out += '  High betweenness = upgrade that connects separate archetypes (pivot point)\n\n';

    const header = `  ${this._lpad('#', 3)} ${this.pad('Upgrade', 24)} ${this.pad('Rarity', 10)} ${this._lpad('Betweenness', 12)} ${this._lpad('Pick%', 6)}  Bar`;
    out += header + '\n';
    out += '  ' + '-'.repeat(header.length - 2) + '\n';

    const top = centrality.filter(c => c.betweenness > 0).slice(0, 15);
    const maxBet = top.length > 0 ? top[0].betweenness : 1;

    for (let i = 0; i < top.length; i++) {
      const c = top[i];
      const bar = this._bar(c.betweenness, maxBet, 20);
      out += `  ${this._lpad(i + 1, 3)} ${this.pad(c.name, 24)} ${this.pad(c.rarity, 10)} ${this._lpad(c.betweenness.toFixed(4), 12)} ${this._lpad((c.pickRate * 100).toFixed(0) + '%', 6)}  ${bar}\n`;
    }

    out += '\n';
    return out;
  }

  /**
   * Format disconnected components + design suggestions.
   * @param {object} islandData - { components, fragileConnections, suggestions }
   * @returns {string}
   */
  reportIslands(islandData) {
    if (this.format === 'json') return this.toJSON(islandData) + '\n';

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  CONNECTIVITY ANALYSIS (Islands & Fragile Links)\n';
    out += '='.repeat(100) + '\n\n';

    const { components, fragileConnections, suggestions } = islandData;

    const multiComponents = components.filter(c => c.size >= 2);
    const singletonCount = components.filter(c => c.size === 1).length;

    out += `  Connected components: ${components.length} (${multiComponents.length} clusters, ${singletonCount} singletons)\n`;
    for (let i = 0; i < multiComponents.length; i++) {
      const c = multiComponents[i];
      const names = c.members.slice(0, 8).map(m => m.name).join(', ');
      const suffix = c.members.length > 8 ? ` ... (+${c.members.length - 8} more)` : '';
      out += `    Cluster ${i + 1} (${c.size}): ${names}${suffix}\n`;
    }
    out += '\n';

    if (fragileConnections.length > 0) {
      out += `  Fragile connections (0-2 bridges between communities):\n`;
      for (const fc of fragileConnections) {
        const bridgeStr = fc.bridges.length > 0 ? fc.bridges.join(', ') : 'none';
        out += `    Comm ${fc.commA} (${fc.commASize}) <-> Comm ${fc.commB} (${fc.commBSize}): ${fc.bridgeCount} bridge(s) [${bridgeStr}]\n`;
      }
      out += '\n';
    }

    if (suggestions.length > 0) {
      out += '  DESIGN SUGGESTIONS:\n';
      for (const s of suggestions) {
        out += `    * ${s}\n`;
      }
      out += '\n';
    }

    return out;
  }

  /**
   * Format most-rejected upgrades.
   * @param {object[]} rejections
   * @returns {string}
   */
  reportRejections(rejections) {
    if (this.format === 'json') return this.toJSON(rejections) + '\n';

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  REJECTION ANALYSIS (Most Rejected Upgrades)\n';
    out += '='.repeat(100) + '\n\n';

    if (!rejections || rejections.length === 0) {
      out += '  No rejection data available (need build traces).\n\n';
      return out;
    }

    const header = `  ${this._lpad('#', 3)} ${this.pad('Upgrade', 22)} ${this.pad('Rarity', 10)} ${this._lpad('Rej%', 6)} ${this._lpad('Offers', 7)} ${this._lpad('Picks', 6)}  Beaten By`;
    out += header + '\n';
    out += '  ' + '-'.repeat(95) + '\n';

    const top = rejections.slice(0, 20);
    for (let i = 0; i < top.length; i++) {
      const r = top[i];
      const beatenBy = r.topWinners.slice(0, 2).map(w => w.name).join(', ') || '-';
      out += `  ${this._lpad(i + 1, 3)} ${this.pad(r.name, 22)} ${this.pad(r.rarity, 10)} ${this._lpad((r.rejectionRate * 100).toFixed(0) + '%', 6)} ${this._lpad(r.offers, 7)} ${this._lpad(r.picks, 6)}  ${beatenBy}\n`;
    }

    out += '\n';
    return out;
  }

  /**
   * Format actionable design insights summary.
   * @param {object} summary
   * @returns {string}
   */
  reportDesignInsights(summary) {
    if (this.format === 'json') return this.toJSON(summary) + '\n';

    let out = '';
    out += '\n';
    out += '='.repeat(100) + '\n';
    out += '  DESIGN INSIGHTS SUMMARY\n';
    out += '='.repeat(100) + '\n\n';

    out += `  Data: ${summary.totalRuns} runs, ${summary.successRuns} success runs (top ${Math.round((1 - 0.75) * 100)}%)\n`;
    out += `  Upgrades: ${summary.uniqueUpgradesUsed} / ${summary.totalUpgrades} used\n`;
    out += `  Graph: ${summary.graphNodes} nodes, ${summary.graphEdges} edges (${summary.positiveEdges} synergy, ${summary.negativeEdges} anti-synergy)\n`;
    out += `  Communities: ${summary.communities}, Connected components: ${summary.connectedComponents}\n`;
    out += `  Frequent combos: ${summary.itemsetsL2} pairs, ${summary.itemsetsL3} triples, ${summary.itemsetsL4} quads\n`;
    if (summary.pivotWave != null) {
      out += `  Build identity crystallizes around wave ${summary.pivotWave}\n`;
    }
    out += '\n';

    if (summary.topSynergies.length > 0) {
      out += '  KEY FINDINGS:\n';
      out += '  Strongest synergies:\n';
      for (const s of summary.topSynergies) {
        out += `    + ${s}\n`;
      }
    }

    if (summary.topAntiSynergies.length > 0) {
      out += '  Strongest anti-synergies:\n';
      for (const s of summary.topAntiSynergies) {
        out += `    - ${s}\n`;
      }
    }

    out += '\n';

    // Actionable bullets
    const bullets = [];
    if (summary.connectedComponents > 1) {
      bullets.push('Multiple disconnected upgrade clusters — some build paths never interact. Consider bridge upgrades.');
    }
    if (summary.itemsetsL3 > 10) {
      bullets.push(`${summary.itemsetsL3} three-way combos found — players have meaningful multi-upgrade synergy chains.`);
    } else if (summary.itemsetsL3 === 0) {
      bullets.push('No three-way combos detected — upgrades may be too independent. Consider adding chain synergies.');
    }
    if (summary.negativeEdges > summary.positiveEdges * 0.5) {
      bullets.push('High anti-synergy count — many upgrades conflict. Check if this creates meaningful trade-offs or just feels bad.');
    }
    if (summary.pivotWave && summary.pivotWave < 10) {
      bullets.push(`Build identity locks in early (wave ${summary.pivotWave}) — consider delaying key synergy upgrades to later waves.`);
    }

    if (bullets.length > 0) {
      out += '  ACTIONABLE:\n';
      for (const b of bullets) {
        out += `    * ${b}\n`;
      }
      out += '\n';
    }

    return out;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Build an ASCII bar from a value [0..max].
   */
  _bar(value, max, width) {
    const clamped = Math.max(0, Math.min(value, max));
    const filled = max > 0 ? Math.round((clamped / max) * width) : 0;
    const neg = value < 0;
    if (neg) {
      const absFilled = max > 0 ? Math.round((Math.abs(value) / max) * width) : 0;
      return '<' + '='.repeat(Math.min(absFilled, width));
    }
    return '#'.repeat(filled) + '.'.repeat(Math.max(0, width - filled));
  }

  /**
   * Format a value as a percentage string.
   */
  _pct(val) {
    const sign = val >= 0 ? '+' : '';
    return sign + (val * 100).toFixed(1) + '%';
  }

  /**
   * Get the name of an upgrade by ID, or return the ID if not found.
   */
  _upgradeName(id) {
    return this._upgradeMap[id] ? this._upgradeMap[id].name : id;
  }

  /**
   * Sparkline character for a value in a range.
   */
  _sparkChar(val, min, max) {
    const chars = ' _.-:=+*#%@';
    if (max <= min) return chars[5];
    const idx = Math.round(((val - min) / (max - min)) * (chars.length - 1));
    return chars[Math.max(0, Math.min(idx, chars.length - 1))];
  }

  /**
   * Compute basic stats from an array of GameResult objects.
   */
  _computeStats(results) {
    if (!results || results.length === 0) {
      return { avgWaves: 0, medianWaves: 0, maxWaves: 0, avgScore: 0, avgDoorHP: 0 };
    }

    const waves = results.map(r => r.wavesReached);
    const scores = results.map(r => r.score || 0);
    const doorHPs = results.map(r => r.doorHP || 0);

    waves.sort((a, b) => a - b);

    return {
      avgWaves: Math.round(waves.reduce((a, b) => a + b, 0) / waves.length * 10) / 10,
      medianWaves: waves[Math.floor(waves.length / 2)],
      maxWaves: waves[waves.length - 1],
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      avgDoorHP: Math.round(doorHPs.reduce((a, b) => a + b, 0) / doorHPs.length * 10) / 10,
    };
  }
}

module.exports = { Reporter };

#!/usr/bin/env node
/**
 * CLI entry point for Hold It In AI tools.
 *
 * Usage:
 *   node tools/ai/run.js ga                          # Run GA (100 gen, 200 pop)
 *   node tools/ai/run.js ga --pop 500 --gen 200      # Custom params
 *   node tools/ai/run.js qlearn --episodes 50000     # Q-learning
 *   node tools/ai/run.js baseline                    # Random + Heuristic baselines
 *   node tools/ai/run.js analyze --input results.json # Analytics on saved data
 *   node tools/ai/run.js compare                     # Head-to-head comparison
 *
 * Flags: --scenario office|all, --waves 50, --seed 12345, --csv, --json, --markdown
 *        --output results.json  (save results to file)
 */

const { GameSimulator } = require('./sim/GameSimulator');
const { RandomAgent } = require('./agents/RandomAgent');
const { HeuristicAgent } = require('./agents/HeuristicAgent');
const { GeneticAgent } = require('./agents/GeneticAgent');
const { QLearningAgent } = require('./agents/QLearningAgent');
const { Analyzer } = require('./analysis/Analyzer');
const { Reporter } = require('./analysis/Reporter');
const fs = require('fs');
const path = require('path');

// ── CLI Argument Parsing ─────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0] || 'help';

function getArg(name, defaultVal) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return defaultVal;
  return args[idx + 1] || defaultVal;
}

function hasFlag(name) {
  return args.includes('--' + name);
}

const scenario = getArg('scenario', 'office');
const maxWaves = parseInt(getArg('waves', '50'));
const seed = getArg('seed', null) ? parseInt(getArg('seed', null)) : null;
const format = hasFlag('csv') ? 'csv' : hasFlag('json') ? 'json' : hasFlag('markdown') ? 'markdown' : 'ascii';
const outputFile = getArg('output', null);
const inputFile = getArg('input', null);
const reporter = new Reporter({ format });

// ── Utilities ────────────────────────────────────────────────────────────

/**
 * Get the list of scenarios to run.
 */
function getScenarios() {
  if (scenario === 'all') return ['office', 'forest', 'ocean', 'airplane'];
  return [scenario];
}

/**
 * Run N games with a given agent and collect GameResults.
 */
function runGames(agent, n, label) {
  const results = [];
  const scenarios = getScenarios();
  const gamesPerScenario = Math.ceil(n / scenarios.length);

  for (const sc of scenarios) {
    for (let i = 0; i < gamesPerScenario; i++) {
      const gameSeed = seed !== null ? seed + i : null;
      const sim = new GameSimulator({
        scenario: sc,
        maxWaves,
        seed: gameSeed,
      });
      const result = sim.run(agent);
      results.push(result);

      // Progress
      const total = scenarios.length * gamesPerScenario;
      const done = results.length;
      if (done % Math.max(1, Math.floor(total / 20)) === 0 || done === total) {
        const pct = Math.round((done / total) * 100);
        process.stderr.write(`\r  [${label}] ${progressBar(pct, 30)} ${pct}% (${done}/${total})`);
      }
    }
  }
  process.stderr.write('\n');
  return results;
}

/**
 * Simple ASCII progress bar.
 */
function progressBar(pct, width) {
  const filled = Math.round((pct / 100) * width);
  return '[' + '#'.repeat(filled) + '.'.repeat(Math.max(0, width - filled)) + ']';
}

/**
 * Compute basic stats from results.
 */
function computeStats(results) {
  if (results.length === 0) {
    return { avgWaves: 0, medianWaves: 0, maxWaves: 0, avgScore: 0, avgDoorHP: 0 };
  }

  const waves = results.map(r => r.wavesReached).sort((a, b) => a - b);
  const scores = results.map(r => r.score || 0);
  const doorHPs = results.map(r => r.doorHP || 0);

  return {
    avgWaves: Math.round(waves.reduce((a, b) => a + b, 0) / waves.length * 10) / 10,
    medianWaves: waves[Math.floor(waves.length / 2)],
    maxWaves: waves[waves.length - 1],
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    avgDoorHP: Math.round(doorHPs.reduce((a, b) => a + b, 0) / doorHPs.length * 10) / 10,
  };
}

/**
 * Save results to a JSON file.
 */
function saveResults(data, filepath) {
  const resolved = path.resolve(filepath);
  fs.writeFileSync(resolved, JSON.stringify(data, null, 2));
  process.stderr.write(`  Results saved to ${resolved}\n`);
}

/**
 * Load results from a JSON file.
 */
function loadResults(filepath) {
  const resolved = path.resolve(filepath);
  const raw = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(raw);
}

// ── Commands ─────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log(`
Hold It In — AI Balance Tools
==============================

Usage:
  node run.js <command> [options]

Commands:
  baseline                Run Random + Heuristic agents (1000 games each)
  ga                      Run Genetic Algorithm optimization
  qlearn                  Run Q-learning training
  analyze                 Analyze saved results from file
  compare                 Head-to-head comparison of all agents
  help                    Show this help message

Options:
  --scenario <name>       Scenario to test: office, forest, ocean, airplane, all
                          (default: office)
  --waves <n>             Max waves per game (default: 50)
  --seed <n>              RNG seed for reproducible runs
  --pop <n>               GA population size (default: 200)
  --gen <n>               GA generations (default: 100)
  --eval-runs <n>         GA evaluation runs per genome (default: 3)
  --episodes <n>          Q-learning episodes (default: 10000)
  --runs <n>              Number of runs for baseline/compare (default: 1000)
  --input <file>          Load results from JSON file (for analyze)
  --output <file>         Save results to JSON file
  --csv                   Output in CSV format
  --json                  Output in JSON format
  --markdown              Output in Markdown format

Examples:
  node run.js baseline --scenario office --waves 40
  node run.js ga --pop 300 --gen 150 --output ga_results.json
  node run.js analyze --input ga_results.json --csv
  node run.js compare --scenario all --waves 50
`);
}

function cmdBaseline() {
  const numRuns = parseInt(getArg('runs', '1000'));
  const startTime = Date.now();

  process.stderr.write('\n  Running baseline agents...\n\n');

  // Random agent
  process.stderr.write('  RandomAgent:\n');
  const randomAgent = new RandomAgent({ rng: seed !== null ? _seededRng(seed) : undefined });
  const randomResults = runGames(randomAgent, numRuns, 'Random');
  const randomStats = computeStats(randomResults);

  // Heuristic agent
  process.stderr.write('  HeuristicAgent:\n');
  const heuristicAgent = new HeuristicAgent({ rng: seed !== null ? _seededRng(seed + 999999) : undefined });
  const heuristicResults = runGames(heuristicAgent, numRuns, 'Heuristic');
  const heuristicStats = computeStats(heuristicResults);

  const agentResults = {
    Random: { results: randomResults, stats: randomStats },
    Heuristic: { results: heuristicResults, stats: heuristicStats },
  };

  // Print comparison
  console.log(reporter.reportComparison(agentResults));

  // Run analysis on combined results
  const allResults = [...randomResults, ...heuristicResults];
  const analyzer = new Analyzer(allResults);
  console.log(reporter.reportBreakpoints(analyzer.breakpoints()));
  console.log(reporter.reportTierList(analyzer.tierList()));

  // Save if requested
  if (outputFile) {
    saveResults({
      command: 'baseline',
      scenario,
      maxWaves,
      seed,
      numRuns,
      agents: {
        random: { stats: randomStats, results: randomResults },
        heuristic: { stats: heuristicStats, results: heuristicResults },
      },
    }, outputFile);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stderr.write(`\n  Completed in ${elapsed}s\n`);
}

function cmdGA() {
  const popSize = parseInt(getArg('pop', '200'));
  const generations = parseInt(getArg('gen', '100'));
  const evalRuns = parseInt(getArg('eval-runs', '3'));
  const startTime = Date.now();

  process.stderr.write(`\n  GA: pop=${popSize}, gen=${generations}, eval-runs=${evalRuns}\n`);
  process.stderr.write(`  Scenario: ${scenario}, Max waves: ${maxWaves}\n\n`);

  const gaResult = GeneticAgent.runGA({
    popSize,
    generations,
    evalRuns,
    scenario: scenario === 'all' ? 'office' : scenario,
    maxWaves,
    seed,
    onGeneration: (genData) => {
      const pct = Math.round(((genData.gen + 1) / generations) * 100);
      process.stderr.write(
        `\r  Gen ${String(genData.gen + 1).padStart(4)}/${generations} ` +
        `${progressBar(pct, 20)} ` +
        `Best: ${genData.bestFitness.toFixed(1)}  Avg: ${genData.avgFitness.toFixed(1)}`
      );
    },
  });

  process.stderr.write('\n\n');

  // Print GA progress chart
  console.log(reporter.reportGAProgress(gaResult.history));

  // Evaluate best genome in more runs for analysis
  process.stderr.write('  Evaluating best genome (500 runs)...\n');
  const bestAgent = new GeneticAgent(gaResult.bestGenome);
  const bestResults = runGames(bestAgent, 500, 'GA-Best');
  const bestStats = computeStats(bestResults);

  process.stderr.write(`\n  Best genome stats:\n`);
  process.stderr.write(`    Avg Waves: ${bestStats.avgWaves}\n`);
  process.stderr.write(`    Max Waves: ${bestStats.maxWaves}\n`);
  process.stderr.write(`    Median Waves: ${bestStats.medianWaves}\n\n`);

  // Print best genome
  console.log('\n  Best Genome:');
  console.log('  ' + JSON.stringify(gaResult.bestGenome, null, 2).replace(/\n/g, '\n  '));

  // Analyze the best agent's results
  const analyzer = new Analyzer(bestResults);
  console.log(reporter.reportTierList(analyzer.tierList()));
  console.log(reporter.reportBreakpoints(analyzer.breakpoints()));

  // Save if requested
  if (outputFile) {
    saveResults({
      command: 'ga',
      scenario,
      maxWaves,
      seed,
      popSize,
      generations,
      evalRuns,
      bestGenome: gaResult.bestGenome,
      bestFitness: gaResult.bestFitness,
      bestStats,
      gaHistory: gaResult.history,
      results: bestResults,
    }, outputFile);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stderr.write(`\n  Completed in ${elapsed}s\n`);
}

function cmdQLearning() {
  const episodes = parseInt(getArg('episodes', '10000'));
  const startTime = Date.now();

  process.stderr.write(`\n  Q-Learning: episodes=${episodes}\n`);
  process.stderr.write(`  Scenario: ${scenario}, Max waves: ${maxWaves}\n\n`);

  const reportInterval = Math.max(1, Math.floor(episodes / 20));
  const qlHistory = [];
  const recentWaves = [];

  const trainResult = QLearningAgent.train({
    episodes,
    scenario: scenario === 'all' ? 'office' : scenario,
    maxWaves,
    seed,
    onEpisode: (epStats) => {
      recentWaves.push(epStats.wavesReached);
      if (recentWaves.length > reportInterval) recentWaves.shift();

      const ep = epStats.episode + 1;
      if (ep % reportInterval === 0 || ep === episodes) {
        const avgWaves = recentWaves.reduce((a, b) => a + b, 0) / recentWaves.length;
        const maxW = Math.max(...recentWaves);

        qlHistory.push({
          episode: ep,
          avgReward: Math.round(avgWaves * 100) / 100,
          epsilon: 0,
          maxWaves: maxW,
        });

        const pct = Math.round((ep / episodes) * 100);
        process.stderr.write(
          `\r  Episode ${String(ep).padStart(6)}/${episodes} ` +
          `${progressBar(pct, 20)} ` +
          `Avg: ${avgWaves.toFixed(1)}  Max: ${maxW}`
        );
      }
    },
  });

  const ql = trainResult.agent;

  process.stderr.write('\n\n');

  // Print training progress
  console.log(reporter.reportQLearningProgress(qlHistory));

  // Evaluate trained agent (greedy mode — set epsilon to 0)
  process.stderr.write('  Evaluating trained Q-agent (500 runs, greedy)...\n');
  ql.epsilon = 0;
  const evalResults = runGames(ql, 500, 'QL-Eval');
  const evalStats = computeStats(evalResults);

  process.stderr.write(`\n  Trained agent stats:\n`);
  process.stderr.write(`    Avg Waves: ${evalStats.avgWaves}\n`);
  process.stderr.write(`    Max Waves: ${evalStats.maxWaves}\n`);
  process.stderr.write(`    Median Waves: ${evalStats.medianWaves}\n\n`);

  // Analyze
  const analyzer = new Analyzer(evalResults);
  console.log(reporter.reportTierList(analyzer.tierList()));
  console.log(reporter.reportBreakpoints(analyzer.breakpoints()));

  // Save if requested
  if (outputFile) {
    saveResults({
      command: 'qlearn',
      scenario,
      maxWaves,
      seed,
      episodes,
      evalStats,
      qlHistory,
      weights: ql.toJSON(),
      results: evalResults,
    }, outputFile);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stderr.write(`\n  Completed in ${elapsed}s\n`);
}

function cmdAnalyze() {
  if (!inputFile) {
    console.error('  Error: --input <file> is required for analyze command.');
    process.exit(1);
  }

  const startTime = Date.now();
  process.stderr.write(`\n  Loading results from ${inputFile}...\n`);

  const data = loadResults(inputFile);

  // Extract results array from the data (handle various formats)
  let results;
  if (Array.isArray(data)) {
    results = data;
  } else if (data.results) {
    results = data.results;
  } else if (data.agents) {
    // Baseline format: combine all agent results
    results = [];
    for (const agentData of Object.values(data.agents)) {
      if (agentData.results) results.push(...agentData.results);
    }
  } else {
    console.error('  Error: Could not find results array in input file.');
    process.exit(1);
  }

  process.stderr.write(`  Loaded ${results.length} results.\n\n`);

  const analyzer = new Analyzer(results);
  console.log(reporter.fullReport(analyzer));

  // Save formatted output if requested
  if (outputFile) {
    const output = reporter.fullReport(analyzer);
    fs.writeFileSync(path.resolve(outputFile), output);
    process.stderr.write(`  Report saved to ${path.resolve(outputFile)}\n`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stderr.write(`  Completed in ${elapsed}s\n`);
}

function cmdCompare() {
  const numRuns = parseInt(getArg('runs', '500'));
  const startTime = Date.now();

  process.stderr.write(`\n  Head-to-head comparison: ${numRuns} runs each\n`);
  process.stderr.write(`  Scenario: ${scenario}, Max waves: ${maxWaves}\n\n`);

  const agentResults = {};
  const allResults = [];

  // 1. Random Agent
  process.stderr.write('  RandomAgent:\n');
  const randomAgent = new RandomAgent({ rng: seed !== null ? _seededRng(seed) : undefined });
  const randomResults = runGames(randomAgent, numRuns, 'Random');
  agentResults.Random = { results: randomResults, stats: computeStats(randomResults) };
  allResults.push(...randomResults);

  // 2. Heuristic Agent
  process.stderr.write('  HeuristicAgent:\n');
  const heuristicAgent = new HeuristicAgent({ rng: seed !== null ? _seededRng(seed + 999999) : undefined });
  const heuristicResults = runGames(heuristicAgent, numRuns, 'Heuristic');
  agentResults.Heuristic = { results: heuristicResults, stats: computeStats(heuristicResults) };
  allResults.push(...heuristicResults);

  // 3. GA Agent (quick evolution then evaluate)
  process.stderr.write('  GeneticAgent (evolving 50 gen, pop 100)...\n');
  const gaResult = GeneticAgent.runGA({
    popSize: 100,
    generations: 50,
    evalRuns: 2,
    scenario: scenario === 'all' ? 'office' : scenario,
    maxWaves,
    seed,
    onGeneration: (genData) => {
      if ((genData.gen + 1) % 10 === 0) {
        process.stderr.write(
          `\r    Gen ${genData.gen + 1}/50  Best: ${genData.bestFitness.toFixed(1)}  Avg: ${genData.avgFitness.toFixed(1)}`
        );
      }
    },
  });
  process.stderr.write('\n');

  process.stderr.write('  GA-Best:\n');
  const gaAgent = new GeneticAgent(gaResult.bestGenome);
  const gaResults = runGames(gaAgent, numRuns, 'GA-Best');
  agentResults['GA-Best'] = { results: gaResults, stats: computeStats(gaResults) };
  allResults.push(...gaResults);

  // 4. Q-Learning Agent (quick training then evaluate)
  process.stderr.write('  QLearningAgent (training 5000 episodes)...\n');
  const trainResult = QLearningAgent.train({
    episodes: 5000,
    scenario: scenario === 'all' ? 'office' : scenario,
    maxWaves,
    seed,
    onEpisode: (epStats) => {
      const ep = epStats.episode + 1;
      if (ep % 1000 === 0) {
        process.stderr.write(`\r    Episode ${ep}/5000`);
      }
    },
  });
  process.stderr.write('\n');

  const ql = trainResult.agent;
  ql.epsilon = 0; // greedy evaluation
  process.stderr.write('  QL-Best:\n');
  const qlResults = runGames(ql, numRuns, 'QL-Best');
  agentResults['QL-Best'] = { results: qlResults, stats: computeStats(qlResults) };
  allResults.push(...qlResults);

  // Print comparison
  console.log(reporter.reportComparison(agentResults));

  // Full analysis on all combined results
  const analyzer = new Analyzer(allResults);
  console.log(reporter.reportTierList(analyzer.tierList()));
  console.log(reporter.reportSynergies(analyzer.synergyMatrix()));
  console.log(reporter.reportClusters(analyzer.buildClustering()));
  console.log(reporter.reportBreakpoints(analyzer.breakpoints()));

  // Save if requested
  if (outputFile) {
    const agentSummary = {};
    for (const [name, data] of Object.entries(agentResults)) {
      agentSummary[name] = { stats: data.stats, results: data.results };
    }
    saveResults({
      command: 'compare',
      scenario,
      maxWaves,
      seed,
      numRuns,
      agents: agentSummary,
    }, outputFile);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stderr.write(`\n  Completed in ${elapsed}s\n`);
}

// ── Seeded RNG Helper ────────────────────────────────────────────────────

function _seededRng(seed) {
  // Mulberry32 PRNG
  let s = seed | 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Main ─────────────────────────────────────────────────────────────────

const startGlobal = Date.now();

switch (command) {
  case 'baseline':
    cmdBaseline();
    break;
  case 'ga':
    cmdGA();
    break;
  case 'qlearn':
    cmdQLearning();
    break;
  case 'analyze':
    cmdAnalyze();
    break;
  case 'compare':
    cmdCompare();
    break;
  case 'help':
  case '--help':
  case '-h':
    cmdHelp();
    break;
  default:
    console.error(`  Unknown command: "${command}". Use "help" to see available commands.`);
    process.exit(1);
}

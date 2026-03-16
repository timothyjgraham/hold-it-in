#!/usr/bin/env node
/**
 * Diagnostic: WHY does random play succeed?
 *
 * Tests random agent with various upgrade pools removed to isolate
 * which categories carry random builds.
 */

const { GameSimulator } = require('./sim/GameSimulator');
const { RandomAgent } = require('./agents/RandomAgent');
const { GAME } = require('./shared/gameData');

const RUNS = 500;
const MAX_WAVES = 50;
const SCENARIO = 'office';

function runWithFilter(label, upgradeFilter) {
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    const sim = new GameSimulator({
      scenario: SCENARIO,
      maxWaves: MAX_WAVES,
      upgradeFilter, // pass filter to sim
    });
    const agent = new RandomAgent();
    const result = sim.run(agent);
    results.push(result);
  }
  const waves = results.map(r => r.wavesReached).sort((a, b) => a - b);
  const avg = (waves.reduce((a, b) => a + b, 0) / waves.length).toFixed(1);
  const med = waves[Math.floor(waves.length / 2)];
  const p10 = waves[Math.floor(waves.length * 0.1)];
  const p90 = waves[Math.floor(waves.length * 0.9)];
  const clearRate = (waves.filter(w => w >= 50).length / waves.length * 100).toFixed(1);
  console.log(`  ${label.padEnd(45)} avg=${avg.padStart(5)}  med=${String(med).padStart(3)}  p10=${String(p10).padStart(3)}  p90=${String(p90).padStart(3)}  clear=${clearRate.padStart(5)}%`);
  return { label, avg: parseFloat(avg), med, p10, p90, clearRate: parseFloat(clearRate) };
}

// Categorize upgrades
const allUpgrades = GAME.upgrades.map(u => u.id);

// Unconditional DPS bonuses (always fire regardless of build)
const unconditionalDPS = ['R16', 'R18', 'R32', 'L11', 'L15', 'L17', 'L18', 'L2', 'L3'];

// Chase cards
const chaseCards = ['R33', 'R34', 'R35'];

// Economy upgrades
const economyUpgrades = ['C2', 'R12', 'R13', 'R25', 'R14', 'L16', 'R19', 'R11', 'L10'];

// Global DPS multipliers (the soft-capped ones)
const globalDPSMults = ['C17', 'C18', 'R21', 'R23', 'R27', 'R28', 'R30'];

// Slow/CC bonuses
const slowBonuses = ['C5', 'R29', 'R17', 'L12'];

// Conditional legendaries
const conditionalLegendaries = ['L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L14'];

// Tower-specific DPS (mop)
const mopUpgrades = ['C7', 'C8', 'C9', 'C10', 'R2', 'R3', 'R7', 'R9'];

// Tower-specific DPS (ubik)
const ubikUpgrades = ['C11', 'C12', 'C13', 'C14', 'R1', 'R4', 'R11'];

// Tower-specific DPS (pot)
const potUpgrades = ['C15', 'C16', 'C19', 'R10', 'R20', 'R8'];

// Tower-specific DPS (sign)
const signUpgrades = ['C4', 'C5', 'C6', 'R6', 'R17', 'R29'];

// Tower-specific DPS (magnet)
const magnetUpgrades = ['C1', 'C3', 'C20', 'R5', 'R12'];

console.log('\n  DIAGNOSTIC: What carries random play?');
console.log('  =' .repeat(90));
console.log(`  ${RUNS} runs each, ${MAX_WAVES} waves, ${SCENARIO}\n`);

const experiments = [];

// Baseline
experiments.push(runWithFilter('BASELINE (all upgrades)', null));

// Remove categories one at a time
experiments.push(runWithFilter('WITHOUT unconditional DPS (R16,R18,R32,L11...)',
  id => !unconditionalDPS.includes(id)));

experiments.push(runWithFilter('WITHOUT chase cards (R33,R34,R35)',
  id => !chaseCards.includes(id)));

experiments.push(runWithFilter('WITHOUT economy upgrades (C2,R12,R13,R25...)',
  id => !economyUpgrades.includes(id)));

experiments.push(runWithFilter('WITHOUT global DPS mults (C17,C18,R21,R23...)',
  id => !globalDPSMults.includes(id)));

experiments.push(runWithFilter('WITHOUT slow/CC bonuses (C5,R29,R17,L12)',
  id => !slowBonuses.includes(id)));

experiments.push(runWithFilter('WITHOUT conditional legendaries (L4-L9,L14)',
  id => !conditionalLegendaries.includes(id)));

experiments.push(runWithFilter('WITHOUT ALL legendaries',
  id => !id.startsWith('L')));

experiments.push(runWithFilter('WITHOUT chase + unconditional DPS',
  id => !chaseCards.includes(id) && !unconditionalDPS.includes(id)));

experiments.push(runWithFilter('WITHOUT chase + unconditional + economy',
  id => !chaseCards.includes(id) && !unconditionalDPS.includes(id) && !economyUpgrades.includes(id)));

experiments.push(runWithFilter('ONLY common upgrades (no rare/legendary)',
  id => id.startsWith('C')));

experiments.push(runWithFilter('NO UPGRADES AT ALL',
  id => false)); // filter out everything

console.log('\n  IMPACT RANKING (drop from baseline):');
console.log('  ' + '-'.repeat(90));
const baseline = experiments[0].avg;
const ranked = experiments.slice(1)
  .map(e => ({ ...e, drop: baseline - e.avg }))
  .sort((a, b) => b.drop - a.drop);

for (const e of ranked) {
  const bar = '#'.repeat(Math.max(0, Math.round(e.drop)));
  console.log(`  ${e.label.padEnd(50)} -${e.drop.toFixed(1).padStart(5)} waves  ${bar}`);
}

console.log('\n  DONE\n');

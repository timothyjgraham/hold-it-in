/**
 * Core game formulas — extracted from balance-sim.js
 */

const { GAME } = require('./gameData');

function enemyHP(type, wave) {
  const e = GAME.enemies[type];
  const linear = e.baseHP + wave * e.hpPerWave;
  return Math.round(linear);
}

function enemySpeed(type, wave, eventSpeedMult = 1.0) {
  const e = GAME.enemies[type];
  const speedCreep = 1 + wave * 0.02;
  return (e.baseSpeed + e.speedVar * 0.5) * speedCreep * eventSpeedMult;
}

function proceduralEnemyCount(wave) {
  return 10 + Math.floor(wave * 2.2 + Math.pow(wave, 1.5) * 0.25);
}

function spawnInterval(wave) {
  return Math.max(0.25, 1.5 - (wave - 8) * 0.06);
}

function burstSize(wave) {
  return Math.min(8, 1 + Math.floor(wave / 8));
}

function waveBonus(wave) {
  return 10 + Math.min(wave, 8) * 2;
}

function desperateChance(wave, eventChance = 0) {
  return Math.max(eventChance, wave >= 12 ? Math.min(0.4, (wave - 12) * 0.025) : 0);
}

function coinDropValue(type) {
  const d = GAME.coinDrops[type];
  return d ? d.value * d.count : GAME.enemies[type]?.coins || 0;
}

module.exports = {
  enemyHP,
  enemySpeed,
  proceduralEnemyCount,
  spawnInterval,
  burstSize,
  waveBonus,
  desperateChance,
  coinDropValue,
};

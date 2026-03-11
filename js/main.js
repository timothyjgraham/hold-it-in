// Hold It In — Module Entry Point

import { CONFIG } from './data/config.js';
import { createToilet, updateToilet } from './models/ToiletModel.js';
import { AnimationController } from './animation/AnimationController.js';
import { getAnimationClip } from './animation/AnimationLibrary.js';
import { createEnemyModel } from './models/EnemyModelFactory.js';
import { EnemyPool } from './systems/EnemyPool.js';
import { CoinPool } from './systems/CoinPool.js';
import { PlayerCharacter } from './models/PlayerCharacter.js';
import {
    createBathroomStalls,
    createSinks,
    createMirror,
    createHandDryer,
    createTrashCan,
    createPaperTowelDispenser,
    createBathroomWalls,
    createOfficePeek,
    createBathroomDoor,
} from './models/EnvironmentModels.js';

// Expose to window for Game object in index.html
window.CONFIG = CONFIG;
window.createToilet = createToilet;
window.updateToilet = updateToilet;
window.createBathroomStalls = createBathroomStalls;
window.createSinks = createSinks;
window.createMirror = createMirror;
window.createHandDryer = createHandDryer;
window.createTrashCan = createTrashCan;
window.createPaperTowelDispenser = createPaperTowelDispenser;
window.createBathroomWalls = createBathroomWalls;
window.createOfficePeek = createOfficePeek;
window.createBathroomDoor = createBathroomDoor;

window.AnimationController = AnimationController;
window.getAnimationClip = getAnimationClip;
window.createEnemyModel = createEnemyModel;
window.EnemyPool = EnemyPool;
window.CoinPool = CoinPool;
window.PlayerCharacter = PlayerCharacter;

// Initialize game
window.Game = Game;
Game.init();

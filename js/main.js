// Hold It In — Module Entry Point

import { CONFIG } from './data/config.js';
import { PALETTE, OUTLINE_WIDTH, injectCSSPalette } from './data/palette.js';
import { createToilet, updateToilet } from './models/ToiletModel.js';
import { AnimationController } from './animation/AnimationController.js';
import { getAnimationClip } from './animation/AnimationLibrary.js';
import { createEnemyModel } from './models/EnemyModelFactory.js';
import { EnemyPool } from './systems/EnemyPool.js';
import { CoinPool } from './systems/CoinPool.js';
import { UpgradeManager } from './systems/UpgradeManager.js';
import { PlayerCharacter } from './models/PlayerCharacter.js';
import { createUpgradeDrone, updateUpgradeDrone, disposeUpgradeDrone } from './models/UpgradeDroneModel.js';
import { MedicDroneSystem } from './systems/MedicDroneSystem.js';
import { createIconDataURL } from './data/upgradeIcons.js';
import { UpgradeSelectionUI } from './ui/UpgradeSelectionUI.js';
import { EnemyIntroUI } from './ui/EnemyIntroUI.js';
import {
    toonMat, outlineMatStatic, matWall, matTileLight, matTileDark, matFixture, matWood,
    matWhite, matDark, matInk, matCarpet, matPorcelain, matGold,
    matDanger, matBeam, matParticles, matSpray, matMagnet, matSign, matMop, matUbik, matPotplant,
    matRangeCircle,
} from './shaders/toonMaterials.js';
import { setupPostProcessing } from './shaders/postProcessing.js';
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

// Inject CSS palette variables
injectCSSPalette();

// Expose to window for Game object in index.html
window.PALETTE = PALETTE;
window.OUTLINE_WIDTH = OUTLINE_WIDTH;
window.toonMat = toonMat;
window.matWall = matWall;
window.matTileLight = matTileLight;
window.matTileDark = matTileDark;
window.matFixture = matFixture;
window.matWood = matWood;
window.matWhite = matWhite;
window.matDark = matDark;
window.matInk = matInk;
window.matCarpet = matCarpet;
window.matPorcelain = matPorcelain;
window.matGold = matGold;
window.matDanger = matDanger;
window.matBeam = matBeam;
window.matParticles = matParticles;
window.matSpray = matSpray;
window.matMagnet = matMagnet;
window.matSign = matSign;
window.matMop = matMop;
window.matUbik = matUbik;
window.matPotplant = matPotplant;
window.matRangeCircle = matRangeCircle;
window.setupPostProcessing = setupPostProcessing;
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
window.UpgradeManager = UpgradeManager;
window.PlayerCharacter = PlayerCharacter;
window.createUpgradeDrone = createUpgradeDrone;
window.updateUpgradeDrone = updateUpgradeDrone;
window.disposeUpgradeDrone = disposeUpgradeDrone;
window.UpgradeSelectionUI = UpgradeSelectionUI;
window.EnemyIntroUI = EnemyIntroUI;
window.MedicDroneSystem = MedicDroneSystem;
window.createIconDataURL = createIconDataURL;
window.outlineMatStatic = outlineMatStatic;

// Initialize game
window.Game = Game;
Game.init();

// Hold It In — Module Entry Point

import { CONFIG } from './data/config.js';
import { PALETTE, OUTLINE_WIDTH, injectCSSPalette } from './data/palette.js';
import { t, setLanguage, getLanguage, getCanvasFont, applyHTMLTranslations, initI18n, LANGUAGES } from './i18n.js';
import { createToilet, updateToilet } from './models/ToiletModel.js';
import { AnimationController } from './animation/AnimationController.js';
import { getAnimationClip, disposeAnimationCache } from './animation/AnimationLibrary.js';
import { createEnemyModel, clearGeometryCache } from './models/EnemyModelFactory.js';
import { EnemyPool } from './systems/EnemyPool.js';
import { SpatialGrid } from './systems/SpatialGrid.js';
import { CoinPool } from './systems/CoinPool.js';
import { UpgradeManager } from './systems/UpgradeManager.js';
import { UPGRADE_MAP, ALL_UPGRADES } from './data/upgradeRegistry.js';
import { PlayerCharacter } from './models/PlayerCharacter.js';
import { createUpgradeDrone, updateUpgradeDrone, disposeUpgradeDrone } from './models/UpgradeDroneModel.js';
import { MedicDroneSystem } from './systems/MedicDroneSystem.js';
import { SuperMedicDrone } from './systems/SuperMedicDrone.js';
import { UpgradeSelectionUI } from './ui/UpgradeSelectionUI.js';
import { createIconModel } from './models/UpgradeIconFactory.js';
import { initIconRenderer, create3DIconDataURL, draw3DUpgradeIcon, disposeIconRenderer } from './ui/UpgradeIconRenderer.js';
import {
    initScenarioIcons, startScenarioIcons, stopScenarioIcons,
    setScenarioHover, triggerScenarioClick, triggerScenarioDenied,
    disposeScenarioIcons,
} from './ui/ScenarioIconRenderer.js';
import { EnemyIntroUI } from './ui/EnemyIntroUI.js';
import { TowerIntroUI } from './ui/TowerIntroUI.js';
import { SFX } from './systems/SoundManager.js';
import { Music } from './systems/MusicManager.js';
import { GamepadManager } from './input/GamepadManager.js';
import { GLBModelCache } from './loaders/GLBModelCache.js';
import { PlayerModelLoader } from './loaders/PlayerModelLoader.js';
import { ENEMY_DEATH_VOCAL } from './data/soundConfig.js';
import {
    toonMat, outlineMatStatic, matWall, matTileLight, matTileDark, matFixture, matWood,
    matWhite, matDark, matInk, matCarpet, matPorcelain, matGold,
    matDanger, matBeam, matParticles, matSpray, matMagnet, matSign, matMop, matUbik, matPotplant,
    matRangeCircle,
} from './shaders/toonMaterials.js';
import { setupPostProcessing } from './shaders/postProcessing.js';
import { DoorDamageSystem } from './shaders/doorDamageShader.js';
import { enhanceTowerWithDamageShader, updateTowerDamage } from './shaders/towerDamageShader.js';
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
import {
    createForestGround,
    createForestGrassTufts,
    createForestTrees,
    createForestBushes,
    createForestRocks,
    createOuthouse,
    createOuthouseDoor,
    createSunbeams,
    createButterflies,
    createForestProps,
} from './models/ForestEnvironmentModels.js';
import {
    createOceanWater,
    createOceanRaft,
    createOceanOuthouseDoor,
    createBuoyPlatform,
    createSeagulls,
    createSunSparkles,
    createOceanProps,
} from './models/OceanEnvironmentModels.js';
import {
    createAirplaneCabin,
    createAirplaneSeats,
    createAirplaneCubicle,
    createAirplaneDoor,
    createAirplaneProps,
    createCabinLightStrips,
    createAirplanePassengers,
} from './models/AirplaneEnvironmentModels.js';

// Demo flag — set via VITE_DEMO=true at build time
window.IS_DEMO = typeof __IS_DEMO__ !== 'undefined' ? __IS_DEMO__ : false;

// Inject CSS palette variables
injectCSSPalette();

// i18n — expose to window for inline script access
window.t = t;
window.setLanguage = setLanguage;
window.getLanguage = getLanguage;
window.getCanvasFont = getCanvasFont;
window.applyHTMLTranslations = applyHTMLTranslations;
window.initI18n = initI18n;
window.LANGUAGES = LANGUAGES;

// Initialize 3D icon offscreen renderer
initIconRenderer();

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

// Forest environment
window.createForestGround = createForestGround;
window.createForestGrassTufts = createForestGrassTufts;
window.createForestTrees = createForestTrees;
window.createForestBushes = createForestBushes;
window.createForestRocks = createForestRocks;
window.createOuthouse = createOuthouse;
window.createOuthouseDoor = createOuthouseDoor;
window.createSunbeams = createSunbeams;
window.createButterflies = createButterflies;
window.createForestProps = createForestProps;

// Ocean environment
window.createOceanWater = createOceanWater;
window.createOceanRaft = createOceanRaft;
window.createOceanOuthouseDoor = createOceanOuthouseDoor;
window.createBuoyPlatform = createBuoyPlatform;
window.createSeagulls = createSeagulls;
window.createSunSparkles = createSunSparkles;
window.createOceanProps = createOceanProps;

// Airplane environment
window.createAirplaneCabin = createAirplaneCabin;
window.createAirplaneSeats = createAirplaneSeats;
window.createAirplaneCubicle = createAirplaneCubicle;
window.createAirplaneDoor = createAirplaneDoor;
window.createAirplaneProps = createAirplaneProps;
window.createCabinLightStrips = createCabinLightStrips;
window.createAirplanePassengers = createAirplanePassengers;

window.AnimationController = AnimationController;
window.getAnimationClip = getAnimationClip;
window.disposeAnimationCache = disposeAnimationCache;
window.createEnemyModel = createEnemyModel;
window.EnemyPool = EnemyPool;
window.SpatialGrid = SpatialGrid;
window.clearGeometryCache = clearGeometryCache;
window.CoinPool = CoinPool;
window.UpgradeManager = UpgradeManager;
window.UPGRADE_MAP = UPGRADE_MAP;
window.ALL_UPGRADES = ALL_UPGRADES;
window.PlayerCharacter = PlayerCharacter;
window.createUpgradeDrone = createUpgradeDrone;
window.updateUpgradeDrone = updateUpgradeDrone;
window.disposeUpgradeDrone = disposeUpgradeDrone;
window.UpgradeSelectionUI = UpgradeSelectionUI;
window.EnemyIntroUI = EnemyIntroUI;
window.TowerIntroUI = TowerIntroUI;
window.MedicDroneSystem = MedicDroneSystem;
window.SuperMedicDrone = SuperMedicDrone;
// Backward-compatible wrapper: old API was (iconKey, size), new adds rarity + time
window.createIconDataURL = function(iconKey, rarityOrSize, size, time) {
    if (typeof rarityOrSize === 'number') {
        return create3DIconDataURL(iconKey, 'common', rarityOrSize, 0);
    }
    return create3DIconDataURL(iconKey, rarityOrSize || 'common', size || 64, time || 0);
};
window.createIconModel = createIconModel;
window.draw3DUpgradeIcon = draw3DUpgradeIcon;
window.disposeIconRenderer = disposeIconRenderer;
window.outlineMatStatic = outlineMatStatic;
window.DoorDamageSystem = DoorDamageSystem;
window.enhanceTowerWithDamageShader = enhanceTowerWithDamageShader;
window.updateTowerDamage = updateTowerDamage;
window.SFX = SFX;
window.Music = Music;
window.ENEMY_DEATH_VOCAL = ENEMY_DEATH_VOCAL;
window.GLBModelCache = GLBModelCache;
window.PlayerModelLoader = PlayerModelLoader;
window.GamepadManager = GamepadManager;
window.ScenarioIconRenderer = {
    initScenarioIcons, startScenarioIcons, stopScenarioIcons,
    setScenarioHover, triggerScenarioClick, triggerScenarioDenied,
    disposeScenarioIcons,
};

// Initialize i18n then game
initI18n().then(() => {
    window.Game.init();
});

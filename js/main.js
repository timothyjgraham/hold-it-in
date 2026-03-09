// Hold It In — Module Entry Point

import { CONFIG } from './data/config.js';
import { createToilet, updateToilet } from './models/ToiletModel.js';

// Expose to window for Game object in index.html
window.CONFIG = CONFIG;
window.createToilet = createToilet;
window.updateToilet = updateToilet;

// Initialize game
window.Game = Game;
Game.init();

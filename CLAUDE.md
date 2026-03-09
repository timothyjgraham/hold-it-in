# HOLD IT IN

A tower defense game where you defend YOUR toilet from an endless, escalating horde of desperate people. Dead serious mechanics. Completely absurd presentation.

## Project Structure

```
hold-it-in/
├── index.html              # Main HTML + Game object
├── css/
│   └── main.css            # Styles
├── js/
│   ├── main.js             # Module entry point
│   ├── data/               # Game data (towers, enemies, waves, config)
│   ├── models/             # THREE.js 3D model factories
│   ├── systems/            # Game systems (effects, audio, etc.)
│   └── utils/              # Utility functions
├── public/                 # Static assets (audio, images)
└── package.json            # Vite build config
```

## Development

```bash
npm install
npm run dev
# Game runs at http://localhost:3000
```

## Architecture

- Three.js loaded via CDN (importmap)
- ES6 modules in js/, exposed to window via js/main.js
- Game object defined in index.html
- 35-degree top-down perspective camera
- Single lane tower defense: enemies from north, toilet at south

## Design Doc

See `../GAME_DESIGN_DOC.md` for the full game design document.

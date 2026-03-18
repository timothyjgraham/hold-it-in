import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  base: './',
  define: {
    __IS_DEMO__: JSON.stringify(process.env.VITE_DEMO === 'true'),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    alias: [
      // Redirect bare 'three' imports to the global window.THREE
      // (loaded via lib/three.min.js) so Vite doesn't bundle a second copy.
      { find: /^three$/, replacement: path.resolve(__dirname, 'js/lib/three-global.js') }
    ]
  }
})

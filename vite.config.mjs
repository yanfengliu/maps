import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url)).replaceAll('\\', '/');

export default defineConfig({
  // Retained projects under artifacts/ also contain HTML. They are not app
  // entry points, and scanning them tries to optimize archived dependencies.
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: [`${root}artifacts/**`, `${root}data/**`] } },
  // Keep the large, pinned map engine cached when application/model code changes.
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.replaceAll('\\', '/').includes('/node_modules/maplibre-gl/')) return 'map-engine';
  } } } },
});

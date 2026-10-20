import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url)).replaceAll('\\', '/');

export default defineConfig({
  // Retained projects under artifacts/ also contain HTML. They are not app
  // entry points, and scanning them tries to optimize archived dependencies.
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: [`${root}artifacts/**`, `${root}data/**`] } },
});

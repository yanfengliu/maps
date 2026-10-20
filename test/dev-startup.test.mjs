import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { optimizeDeps, resolveConfig } from 'vite';
import config from '../vite.config.mjs';

test('cold dev optimizer scans the app, excluding retained archive HTML with unavailable dependencies', async () => {
  const artifactRoot = fileURLToPath(new URL('../artifacts/', import.meta.url));
  await mkdir(artifactRoot, { recursive: true });
  const fixture = await mkdtemp(`${artifactRoot}startup-gate-`);
  try {
    await mkdir(`${fixture}/artifacts/retained`, { recursive: true });
    await writeFile(`${fixture}/index.html`, '<script type="module" src="/main.js"></script>');
    await writeFile(`${fixture}/main.js`, 'import "maplibre-gl";');
    await writeFile(`${fixture}/artifacts/retained/index.html`, '<script type="module">import "archived-only-missing-map-startup";</script>');
    const resolve = (name, optimize) => resolveConfig({
      ...config, root: fixture, configFile: false, cacheDir: `${fixture}/${name}`,
      optimizeDeps: optimize, logLevel: 'silent',
    }, 'serve');

    // This is the reported defect: Vite's default HTML glob reaches archives.
    await assert.rejects(async () => optimizeDeps(await resolve('control-cache', {}), true), /archived-only-missing-map-startup/);
    const result = await optimizeDeps(await resolve('app-cache', config.optimizeDeps), true);
    assert.ok(result.optimized['maplibre-gl'], 'the real app dependency is optimized');
    assert.deepEqual(Object.keys(result.optimized), ['maplibre-gl']);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('watch ignores use this project root rather than hiding every worktree under an artifacts directory', () => {
  const root = fileURLToPath(new URL('../', import.meta.url)).replaceAll('\\', '/');
  assert.deepEqual(config.server.watch.ignored, [`${root}artifacts/**`, `${root}data/**`]);
});

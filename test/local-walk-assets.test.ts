/** Bound: actual private packet and runtime fetch loop over real HTTP/production data routes.
 * Rig construction is stubbed; stop before floor, simulation and GPU creation. No pixels claim. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { PreviewServer, Connect } from 'vite';
import { serveSceneData } from '../tools/vite/serve-scene-data.js';
import type { NetworkData } from '../src/world/network-data.js';
import { worldStyle } from '../src/world/styles.js';

const boundary = vi.hoisted(() => new Error('asset loading completed before floor/simulation/GPU'));
vi.mock('../src/agents/render/local-walk-rig.js', () => ({ createLocalRig: () => ({ d: null }) }));
vi.mock('../src/agents/population/local-walk-support.js', () => ({ createLocalFloor: () => { throw boundary; } }));
afterEach(() => vi.unstubAllGlobals());
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const packetDirectory = resolve('artifacts/pedestrian-corner331-20260928/packet');
const packetSha = '37ed690eeb9d6be25f9211b710e204cf50dccecff259f44b78fb1692efa0be15';
// Independent approved packet/capture registry. Do not derive expected URLs with the code under test.
const expected = [
  { url: '/scene/buildings/tileset.json', bytes: 67872, sha256: '71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483' },
  { url: '/scene/buildings/data/data518.b3dm', bytes: 4973844, sha256: '5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b' },
  { url: '/scene/decorations.json', bytes: 80890, sha256: 'f16d044aeefc16704f6bcd10c1e3d03039927d6226b68322631ea3edff1ac918' },
  { url: '/scene/control-hardware.json', bytes: 100180, sha256: '6b8afb406d339cb8bed7926ef8ec800711f4f309ef69c4794203aa0603248b3b' },
  { url: '/network/network.json', bytes: 10239410, sha256: '314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677' },
  { url: '/scene/pavements.mesh', bytes: 13071300, sha256: '841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6' },
];

describe('retained native walker asset-load contract', () => {
  it('loads all six live inputs, including the nested data tile, through actual served routes', async () => {
    const manifestBytes = readFileSync(resolve(packetDirectory, 'manifest.json'));
    expect(digest(manifestBytes), 'Restore the retained corner331 successor packet; do not regenerate it').toBe(packetSha);
    const packet = JSON.parse(manifestBytes.toString()) as { files: { name: string; sha256: string }[]; sourceInputs: { path: string; sha256: string }[] };
    const live = packet.sourceInputs.filter(row => row.path.includes('/data/') && !row.path.includes('/agents/'));
    expect(live.map(row => row.sha256)).toEqual(expected.map(row => row.sha256));
    const privateFiles = new Map([['/local-walk/manifest.json', manifestBytes], ...packet.files.map(row => {
      const bytes = readFileSync(resolve(packetDirectory, row.name));
      expect(digest(bytes)).toBe(row.sha256);
      return ['/local-walk/' + row.name, bytes] as const;
    })]);
    let sceneMiddleware: Connect.NextHandleFunction | undefined;
    const plugin = serveSceneData(process.cwd());
    const hook = plugin.configurePreviewServer;
    if (typeof hook !== 'function') throw Error('Expected production preview data hook');
    await hook.call({} as never, { middlewares: { use(fn: Connect.NextHandleFunction) { sceneMiddleware = fn; } } } as PreviewServer);
    if (!sceneMiddleware) throw Error('Production data middleware did not register');
    const server = createServer((request, response) => {
      const bytes = privateFiles.get(request.url ?? '');
      if (bytes) { response.setHeader('content-type', 'application/json'); response.end(bytes); return; }
      sceneMiddleware!(request, response, () => { response.statusCode = 404; response.end('Unbound test route'); });
    });
    const observed: { url: string; status: number; bytes: number; sha256: string }[] = [];
    const nativeFetch = globalThis.fetch;
    let closed = false;
    try {
      await new Promise<void>((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
      const origin = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
      // Node needs an origin. Preserve real HTTP responses and the runtime digest check.
      vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, origin);
        const response = await nativeFetch(url, init);
        const bytes = new Uint8Array(await response.clone().arrayBuffer());
        observed.push({ url: url.pathname, status: response.status, bytes: bytes.byteLength, sha256: digest(bytes) });
        return response;
      });
      vi.resetModules();
      vi.stubGlobal('__MAPS_LOCAL_WALK__', { url: '/local-walk/manifest.json', sha256: packetSha });
      const { createLocalWalker } = await import('../src/agents/local-walk-prototype.js');
      const network = JSON.parse(readFileSync(resolve('data/network/network.json'), 'utf8')) as NetworkData;
      await expect(createLocalWalker({ renderer: null as never, camera: null as never, loop: null as never, document: null as never, network, style: worldStyle('satellite'), ready: () => false })).rejects.toBe(boundary);
      expect(observed.filter(row => expected.some(pin => pin.url === row.url))).toEqual(expected.map(row => ({ ...row, status: 200 })));
      expect(observed).toHaveLength(12); // packet + four sidecars + six live inputs + female manifest
      expect(observed.every(row => row.status === 200)).toBe(true);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((ok, fail) => server.close(error => error ? fail(error) : ok()));
      closed = !server.listening;
      if (process.env.MAPS_ASSET_RECEIPT) writeFileSync(process.env.MAPS_ASSET_RECEIPT, JSON.stringify({ packetSha, expectedLiveInputs: expected, observed, closed, bound: 'real createLocalWalker asset loading; rig construction stubbed; stops before floor/simulation/GPU' }, null, 2));
    }
    expect(closed).toBe(true);
  });
});

describe('source-path refusal', () => {
  it('refuses an actual retained non-data source path instead of constructing a URL', async () => {
    const packet = JSON.parse(readFileSync(resolve(packetDirectory, 'manifest.json'), 'utf8')) as { sourceInputs: { path: string }[] };
    const source = packet.sourceInputs.find(row => !row.path.includes('/data/'));
    expect(source).toBeDefined();
    const { localWalkSourceUrl } = await import('../src/agents/local-walk-prototype.js');
    expect(() => localWalkSourceUrl(source!.path)).toThrow('lacks a file after /data/');
    expect(() => localWalkSourceUrl(source!.path)).toThrow(source!.path);
  });
  it('refuses a data directory without a file suffix', async () => {
    const { localWalkSourceUrl } = await import('../src/agents/local-walk-prototype.js');
    expect(() => localWalkSourceUrl('retained/data/')).toThrow('lacks a file after /data/');
  });
});

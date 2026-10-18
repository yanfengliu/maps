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
const packetDirectory = resolve('data/scene/local-walk/packet');
const packetSha = '801ce9a8f1b8400e3abe7aa0af779a0b30353467e7a5aa89a1aca98e5ff4dc98';
// Independent approved packet/capture registry. Do not derive expected URLs with the code under test.
const expected = [
  { url: '/scene/buildings/tileset.json', bytes: 67872, sha256: '71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483' },
  { url: '/scene/buildings/data/data518.b3dm', bytes: 4973844, sha256: '5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b' },
  { url: '/scene/decorations.json', bytes: 80952, sha256: 'afcf87518922f383a50dc63c1b014e35ad8ffc989154db7fc813b7aefb2ab3bc' },
  { url: '/scene/control-hardware.json', bytes: 100769, sha256: 'c5c93afbe2cbc4634018a2b0848bfbad19572157374b4bc42a9602406a767c6c' },
  { url: '/network/network.json', bytes: 10301111, sha256: '1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f' },
  { url: '/scene/pavements.mesh', bytes: 13071300, sha256: '841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6' },
];

describe('fresh-source walker asset-load contract', () => {
  it('loads all six live inputs, including the nested data tile, through actual served routes', async () => {
    const manifestBytes = readFileSync(resolve(packetDirectory, 'manifest.json'));
    expect(digest(manifestBytes), 'Restore the actual fresh1695 generated packet; do not repin its metadata').toBe(packetSha);
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

describe('fresh-source runtime guards', () => {
  it.each(['source bytes', 'route edge', 'junction authority'])('refuses changed %s through the real loader', async change => {
    const manifestBytes=readFileSync(resolve(packetDirectory,'manifest.json'));
    expect(digest(manifestBytes)).toBe(packetSha);
    const packet=JSON.parse(manifestBytes.toString()) as {files:{name:string}[]};
    const buffers=new Map<string,Buffer>([['/local-walk/manifest.json',manifestBytes],...packet.files.map(row=>['/local-walk/'+row.name,readFileSync(resolve(packetDirectory,row.name))] as [string,Buffer]),...expected.map(row=>[row.url,readFileSync(resolve('data'+row.url))] as [string,Buffer]),['/scene/agents/commuter-female.json',readFileSync(resolve('data/scene/agents/commuter-female.json'))]]);
    if(change==='source bytes')buffers.set('/network/network.json',Buffer.from('changed fresh source'));
    vi.stubGlobal('fetch',async(input:string)=>new Response(Uint8Array.from(buffers.get(input)!)));
    vi.resetModules();vi.stubGlobal('__MAPS_LOCAL_WALK__',{url:'/local-walk/manifest.json',sha256:packetSha});
    const {createLocalWalker}=await import('../src/agents/local-walk-prototype.js');
    const network=JSON.parse(readFileSync(resolve('data/network/network.json'),'utf8')) as NetworkData;
    if(change==='route edge')network.walks.find(edge=>edge.id==='walk:664532523:1:0:ground0:f')!.lengthM+=1;
    if(change==='junction authority'){const first=network.junctions[0]!;(first.conflictAreas?.[0]?.position??first.position).x+=1;}
    const call=createLocalWalker({renderer:null as never,camera:null as never,loop:null as never,document:null as never,network,style:worldStyle('satellite'),ready:()=>false});
    await expect(call).rejects.toThrow(change==='source bytes'?'SHA-256':change==='route edge'?'Live network local edge changed':'Live unheld junction geometry changed');
  });
});

/** Bound: real createApp async mount, style setter and disposal in Node, with
 * rendering/data factories stubbed. No browser, native pixels or gait claim. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Group, Mesh, MeshBasicMaterial, BufferGeometry, PerspectiveCamera } from "three";
import type { LocalWalker, LocalWalkStatus } from "../src/agents/local-walk-prototype.js";
import type { WorldStyle } from "../src/world/styles.js";
import { createApp, type App } from "../src/app.js";

const pending = vi.hoisted(() => ({ factory: vi.fn() }));
vi.mock("../src/agents/local-walk-prototype.js", () => ({ createLocalWalker: pending.factory }));
vi.mock("../src/scene/aoi-cutout.js", () => ({ clipCityRoot: vi.fn() }));
vi.mock("../src/harness/bridge.js", () => ({ installBridge: vi.fn() }));
vi.mock("../src/render/renderer.js", () => ({ createRenderer: () => ({ dispose: vi.fn() }), rendererFailure: () => null, resizeRendererToDisplay: vi.fn() }));
vi.mock("../src/render/camera.js", () => ({ createCameraRig: () => ({ camera: new PerspectiveCamera(), controls: { update: vi.fn(), dispose: vi.fn() } }) }));
vi.mock("../src/render/post.js", () => ({ createPostChain: () => ({ render: vi.fn(), dispose: vi.fn(), apply: vi.fn(), invalidate: vi.fn(), setSize: vi.fn(), setStill: vi.fn() }) }));
vi.mock("../src/scene/sky.js", () => ({ createSky: () => ({ mesh: new Mesh(new BufferGeometry(), new MeshBasicMaterial()) }), bakeEnvironment: () => ({ texture: null, dispose: vi.fn() }) }));
vi.mock("../src/scene/lighting.js", () => ({ createLighting: () => ({ root: new Group() }) }));
vi.mock("../src/scene/signage.js", () => ({ createAuthoredSignage: () => ({ root: new Group(), apply: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/tile-materials.js", () => ({ createFacadeStyle: () => ({}), applyFacadeStyle: vi.fn() }));
vi.mock("../src/scene/buildings.js", () => ({ createBuildings: () => ({ root: new Group(), ready: Promise.resolve(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/terrain.js", () => ({ createTerrain: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/roads.js", () => ({ createRoads: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn(), inputDigests: {}, paintHeightAt: () => 0 }) }));
vi.mock("../src/scene/vegetation.js", () => ({ createVegetation: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/rail-trial.js", () => ({ createRailTrialScene: vi.fn(), loadRailTrial: vi.fn() }));
vi.mock("../src/world/rail-trial.js", () => ({ RAIL_TRIAL_BINDING: null }));
vi.mock("../src/network/load.js", () => ({ loadNetwork: async () => ({}) }));
vi.mock("../src/scene/control-hardware.js", () => ({ loadControlHardware: async () => ({ records: [] }) }));
vi.mock("../src/scene/street-details.js", () => ({ createStreetDetails: () => ({ root: new Group(), paintPlacements: [], setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/agents/agents.js", () => ({ createAgents: () => ({ root: new Group(), dispose: vi.fn() }) }));
vi.mock("../src/agents/render/agents.js", () => ({ createAgentRenderer: vi.fn() }));
vi.mock("../src/agents/render/assets.js", () => ({ loadManifest: vi.fn() }));

const apps: App[] = [];
beforeEach(() => {
  pending.factory.mockReset();
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { for (const app of apps.splice(0)) app.dispose(); vi.unstubAllGlobals(); });

function canvas(): HTMLCanvasElement {
  return { clientWidth: 1280, clientHeight: 720, addEventListener: vi.fn(), ownerDocument: {
    createElement: () => ({ style: {}, setAttribute: vi.fn(), remove: vi.fn() }), body: { append: vi.fn() },
  } } as unknown as HTMLCanvasElement;
}
function heldWalker() {
  const root = new Group();
  const identity = Object.freeze({ actor: Object.freeze({ seed: 5970698, variant: 2, slot: 0, generation: 1, scale: 1.0391258001327515 }), started: false, tick: 0, root: Object.freeze({ generation: 1, elapsedSeconds: 0 }) });
  const mountParents: (Group | null)[] = [];
  const setStyle = vi.fn((_style: WorldStyle) => { mountParents.push(root.parent as Group | null); });
  const dispose = vi.fn();
  const walker: LocalWalker = { root, setStyle, dispose, moving: () => false, status: () => identity as unknown as LocalWalkStatus };
  let resolve!: (walker: LocalWalker) => void;
  const ready = new Promise<LocalWalker>(done => { resolve = done; });
  pending.factory.mockReturnValue(ready);
  return { root, identity, walker, setStyle, dispose, mountParents, resolve };
}

describe("local walker async app mount", () => {
  it.each([["satellite", "cartographic"], ["cartographic", "satellite"]])("mounts %s-to-%s loading in the current style without replacing the held actor", async (initial, latest) => {
    const held = heldWalker();
    const app = createApp(canvas(), { localWalk: true, style: initial }); apps.push(app);
    await vi.waitFor(() => expect(pending.factory).toHaveBeenCalledTimes(1));
    expect(pending.factory.mock.calls[0]![0].style.id).toBe(initial);
    app.setStyle(latest!);
    expect(held.root.parent).toBeNull();
    expect(held.setStyle).not.toHaveBeenCalled();
    held.resolve(held.walker);
    await app.ready;
    expect(held.setStyle.mock.calls.map(([style]) => style.id)).toEqual([latest]);
    expect(held.mountParents).toEqual([null]);
    expect(held.root.parent?.name).toBe("city:complete-cutout");
    const mountedParent = held.root.parent;
    expect(mountedParent!.children.filter(child => child === held.root)).toHaveLength(1);
    app.setStyle(initial!);
    expect(held.setStyle.mock.calls.map(([style]) => style.id)).toEqual([latest, initial]);
    expect(held.root.parent).toBe(mountedParent);
    expect(pending.factory).toHaveBeenCalledTimes(1);
    expect(held.walker.status()).toBe(held.identity);
    expect(held.walker.status()).toMatchObject({ actor: { slot: 0, generation: 1 }, started: false, tick: 0, root: { generation: 1, elapsedSeconds: 0 } });
    expect(held.dispose).not.toHaveBeenCalled();
  });

  it("disposes a walker resolving after app disposal exactly once without styling or mounting it", async () => {
    const held = heldWalker();
    const app = createApp(canvas(), { localWalk: true, style: "satellite" }); apps.push(app);
    await vi.waitFor(() => expect(pending.factory).toHaveBeenCalledTimes(1));
    app.setStyle("cartographic");
    app.dispose();
    held.resolve(held.walker);
    await app.ready;
    app.dispose();
    expect(held.dispose).toHaveBeenCalledTimes(1);
    expect(held.setStyle).not.toHaveBeenCalled();
    expect(held.root.parent).toBeNull();
    expect(held.walker.status()).toBe(held.identity);
  });
});

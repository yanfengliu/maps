/** Bound: actual createApp train wiring/stillness/readiness/style/late disposal;
 * data and graphics factories are stubbed. Component contact and pixels are separate. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BufferGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { createApp, type App } from "../src/app.js";
const state = vi.hoisted(() => ({ ready: false, moving: false, failure: null as null | { message: string }, load: vi.fn(), factory: vi.fn(), bridge: vi.fn(), still: vi.fn(), dispose: vi.fn(), style: vi.fn() }));
vi.mock("../src/harness/bridge.js", () => ({ installBridge: state.bridge }));
vi.mock("../src/harness/rail-still-snapshot.js", () => ({ createRailStillObserver: () => ({}) }));
vi.mock("../src/harness/rail-camera-clearance.js", () => ({ createRailCameraObserver: () => ({}) }));
vi.mock("../src/scene/aoi-cutout.js", () => ({ clipCityRoot: vi.fn() }));
vi.mock("../src/render/renderer.js", () => ({ createRenderer: () => ({ dispose: vi.fn() }), rendererFailure: () => state.failure, resizeRendererToDisplay: vi.fn() }));
vi.mock("../src/render/camera.js", () => ({ createCameraRig: () => ({ camera: new PerspectiveCamera(), controls: { update: vi.fn(), dispose: vi.fn() } }) }));
vi.mock("../src/render/post.js", () => ({ createPostChain: () => ({ render: vi.fn(), dispose: vi.fn(), apply: vi.fn(), invalidate: vi.fn(), setSize: vi.fn(), setStill: state.still }) }));
vi.mock("../src/scene/sky.js", () => ({ createSky: () => ({ mesh: new Mesh(new BufferGeometry(), new MeshBasicMaterial()) }), bakeEnvironment: () => ({ texture: null, dispose: vi.fn() }) }));
vi.mock("../src/scene/lighting.js", () => ({ createLighting: () => ({ root: new Group() }) }));
vi.mock("../src/scene/signage.js", () => ({ createAuthoredSignage: () => ({ root: new Group(), apply: vi.fn(), mount: vi.fn(), dispose: vi.fn(), counts: { boards: 0, lights: 0, cityLighting: {} } }) }));
vi.mock("../src/scene/tile-materials.js", () => ({ createFacadeStyle: () => ({}), applyFacadeStyle: vi.fn() }));
vi.mock("../src/scene/buildings.js", () => ({ createBuildings: () => ({ root: new Group(), ready: Promise.resolve(), setStyle: vi.fn(), dispose: vi.fn(), update: vi.fn(), displayReady: () => state.ready, settled: () => true, status: () => ({ revision: 1 }), loadingMessage: () => "Loading literal fixture", failure: () => null }) }));
vi.mock("../src/scene/terrain.js", () => ({ createTerrain: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/roads.js", () => ({ createRoads: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn(), inputDigests: {}, paintHeightAt: () => 0 }) }));
vi.mock("../src/scene/vegetation.js", () => ({ createVegetation: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/rail-trial.js", () => ({ createRailTrialScene: state.factory, loadRailTrial: state.load }));
vi.mock("../src/world/rail-trial.js", () => ({ RAIL_TRIAL_BINDING: { url: "/rail-trial/manifest.json", sha256: "literal" } }));
vi.mock("../src/network/load.js", () => ({ loadNetwork: async () => ({}) }));
vi.mock("../src/scene/control-hardware.js", () => ({ loadControlHardware: async () => ({ records: [] }) }));
vi.mock("../src/scene/street-details.js", () => ({ createStreetDetails: () => ({ root: new Group(), paintPlacements: [], setStyle: vi.fn(), updateSignals: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/agents/agents.js", () => ({ createAgents: () => ({ root: new Group(), signalSnapshot: () => [], dispose: vi.fn() }) }));
vi.mock("../src/agents/render/agents.js", () => ({ createAgentRenderer: vi.fn() }));
vi.mock("../src/agents/render/assets.js", () => ({ loadManifest: vi.fn() }));
const apps: App[] = [];
beforeEach(() => {
  vi.clearAllMocks(); state.ready = false; state.moving = false; state.failure = null;
  state.load.mockResolvedValue({ literal: "pinned packet" });
  state.factory.mockReturnValue({ root: new Group(), setStyle: state.style, dispose: state.dispose, trains: { moving: () => state.moving, status: () => ({ station: 123, simulatedSeconds: 17 }) } });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn()); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { apps.splice(0).forEach(app => app.dispose()); vi.unstubAllGlobals(); });
function canvas(): HTMLCanvasElement { return { clientWidth: 1280, clientHeight: 720, addEventListener: vi.fn(), ownerDocument: { createElement: () => ({ style: {}, setAttribute: vi.fn(), remove: vi.fn() }), body: { append: vi.fn() } } } as unknown as HTMLCanvasElement; }

describe("ordinary app train integration", () => {
  it("uses the shared loop, readiness and movement, preserving progress across styles and error visibility", async () => {
    const app = createApp(canvas()); apps.push(app); await app.ready;
    const bridge = state.bridge.mock.calls[0]![0], options = state.factory.mock.calls[0]![2];
    expect(options.loop).toBe(app.loop); expect(options.ready()).toBe(false);
    state.ready = true; app.loop.advance(performance.now() + 20);
    expect(options.ready()).toBe(true); expect(state.still).toHaveBeenLastCalledWith(true);
    state.moving = true; app.loop.advance(performance.now() + 40);
    expect(state.still).toHaveBeenLastCalledWith(false);
    const progress = bridge.trains(); app.setStyle("cartographic"); app.setStyle("satellite");
    expect(bridge.trains()).toEqual(progress); expect(state.factory).toHaveBeenCalledTimes(1);
    expect(state.style).toHaveBeenLastCalledWith(expect.objectContaining({ id: "satellite" }));
    state.failure = { message: "Literal train-adjacent shader failure" }; app.loop.advance(performance.now() + 60);
    expect(options.ready()).toBe(false); expect(bridge.isReady()).toBe(false); expect(bridge.error()).toBe(state.failure.message);
  });

  it("disposes a train scene resolving after app disposal once, without mounting it", async () => {
    let resolve!: (value: object) => void;
    state.load.mockReturnValueOnce(new Promise<object>(done => { resolve = done; }));
    const app = createApp(canvas()); apps.push(app); app.dispose(); resolve({ literal: "late pinned packet" }); await app.ready;
    app.dispose(); expect(state.factory).toHaveBeenCalledTimes(1); expect(state.dispose).toHaveBeenCalledTimes(1);
    expect(state.factory.mock.results[0]!.value.root.parent).toBeNull(); expect(state.factory.mock.calls[0]![2].ready()).toBe(false);
  });
});
/** Bound: same-draw createApp readiness and visible shader alert in Node;
 * graphics/data factories are stubbed, no pixel or train claim. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BufferGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { createApp, type App } from "../src/app.js";
const pending = vi.hoisted(() => ({ railFactory: vi.fn(), railLoad: vi.fn(), setStill: vi.fn(), bridge: vi.fn(), draw: vi.fn(), visibility: false, disposed: vi.fn(), style: vi.fn(), shaderFailure: null as null | { message: string } }));
vi.mock("../src/harness/bridge.js", () => ({ installBridge: pending.bridge }));
vi.mock("../src/scene/aoi-cutout.js", () => ({ clipCityRoot: vi.fn() }));
vi.mock("../src/harness/rail-still-snapshot.js", () => ({ createRailStillObserver: () => ({}) }));
vi.mock("../src/harness/rail-camera-clearance.js", () => ({ createRailCameraObserver: () => ({}) }));
vi.mock("../src/render/renderer.js", () => ({ createRenderer: () => ({ dispose: vi.fn() }), rendererFailure: () => pending.shaderFailure, resizeRendererToDisplay: vi.fn() }));
vi.mock("../src/render/camera.js", () => ({ createCameraRig: () => ({ camera: new PerspectiveCamera(), controls: { update: vi.fn(), dispose: vi.fn() } }) }));
vi.mock("../src/render/post.js", () => ({ createPostChain: () => ({ render: pending.draw, dispose: vi.fn(), apply: vi.fn(), invalidate: vi.fn(), setSize: vi.fn(), setStill: pending.setStill }) }));
vi.mock("../src/scene/sky.js", () => ({ createSky: () => ({ mesh: new Mesh(new BufferGeometry(), new MeshBasicMaterial()) }), bakeEnvironment: () => ({ texture: null, dispose: vi.fn() }) }));
vi.mock("../src/scene/lighting.js", () => ({ createLighting: () => ({ root: new Group() }) }));
vi.mock("../src/scene/signage.js", () => ({ createAuthoredSignage: () => ({ root: new Group(), apply: vi.fn(), mount: vi.fn(), dispose: vi.fn(), counts: { boards: 0, lights: 0, cityLighting: {} } }) }));
vi.mock("../src/scene/tile-materials.js", () => ({ createFacadeStyle: () => ({}), applyFacadeStyle: vi.fn() }));
vi.mock("../src/scene/buildings.js", () => ({ createBuildings: () => ({ root: new Group(), ready: Promise.resolve(), setStyle: vi.fn(), dispose: vi.fn(), update: vi.fn(), displayReady: () => pending.visibility, settled: () => true, status: () => ({ revision: 1 }), loadingMessage: () => "Loading fixture", failure: () => null }) }));
vi.mock("../src/scene/terrain.js", () => ({ createTerrain: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/roads.js", () => ({ createRoads: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn(), inputDigests: {}, paintHeightAt: () => 0 }) }));
vi.mock("../src/scene/vegetation.js", () => ({ createVegetation: async () => ({ root: new Group(), setStyle: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/scene/rail-trial.js", () => ({ createRailTrialScene: pending.railFactory, loadRailTrial: pending.railLoad }));
vi.mock("../src/world/rail-trial.js", () => ({ RAIL_TRIAL_BINDING: { url: "/rail-trial/manifest.json", sha256: "fixture" } }));
vi.mock("../src/network/load.js", () => ({ loadNetwork: async () => ({}) }));
vi.mock("../src/scene/control-hardware.js", () => ({ loadControlHardware: async () => ({ records: [] }) }));
vi.mock("../src/scene/street-details.js", () => ({ createStreetDetails: () => ({ root: new Group(), paintPlacements: [], setStyle: vi.fn(), updateSignals: vi.fn(), dispose: vi.fn() }) }));
vi.mock("../src/agents/agents.js", () => ({ createAgents: () => ({ root: new Group(), signalSnapshot: () => [], dispose: vi.fn() }) }));
vi.mock("../src/agents/render/agents.js", () => ({ createAgentRenderer: vi.fn() }));
vi.mock("../src/agents/render/assets.js", () => ({ loadManifest: vi.fn() }));
const apps: App[] = [];
beforeEach(() => {
  vi.clearAllMocks(); pending.visibility = false; pending.shaderFailure = null; pending.draw.mockReset();
  pending.railLoad.mockResolvedValue({ literal: "pinned packet" });
  pending.railFactory.mockReturnValue({ root: new Group(), setStyle: pending.style, dispose: pending.disposed });
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn()); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { apps.splice(0).forEach(app => app.dispose()); vi.unstubAllGlobals(); });
function canvas(): HTMLCanvasElement { return { clientWidth: 1280, clientHeight: 720, addEventListener: vi.fn(), ownerDocument: { createElement: () => ({ style: {}, setAttribute: vi.fn(), remove: vi.fn() }), body: { append: vi.fn() } } } as unknown as HTMLCanvasElement; }
describe("default app shader failure", () => {
  it("rejects ready and displays the named shader alert in the same failing draw", async () => {
    const statusElement = { style: {}, hidden: false, textContent: "", setAttribute: vi.fn(), remove: vi.fn() };
    const surface = canvas(); vi.spyOn(surface.ownerDocument, "createElement").mockReturnValue(statusElement as unknown as HTMLElement);
    const app = createApp(surface); apps.push(app); await app.ready;
    const bridge = pending.bridge.mock.calls[0]![0];
    pending.visibility = true; app.loop.advance(performance.now() + 20);
    expect(bridge.isReady()).toBe(true); expect(statusElement.hidden).toBe(true); expect(bridge.error()).toBeNull();
    const named = "Shibuya shader roads:surface (MeshStandardMaterial) could not link: ERROR: patch is reserved.";
    pending.draw.mockImplementationOnce(() => { pending.shaderFailure = { message: named }; });
    app.loop.advance(performance.now() + 40);
    expect(bridge.isReady()).toBe(false); expect(bridge.error()).toBe(named);
    expect(statusElement.hidden).toBe(false); expect(statusElement.textContent).toContain(named);
    expect(statusElement.setAttribute).toHaveBeenLastCalledWith("role", "alert");
    app.setStyle("cartographic"); app.loop.advance(performance.now() + 60);
    expect(bridge.isReady()).toBe(false); expect(statusElement.hidden).toBe(false);
  });
});

/**
 * Assembles the app: renderer, scene, camera rig, loop, and the systems hanging
 * off them.
 *
 * The scene graph the rest of the work grows into:
 *
 *   scene
 *   ├── sky        — analytic dome, driven by the real solar position
 *   ├── lighting   — key light and hemisphere fill, from the same instant
 *   ├── signage    — authored hero boards and street light (item 16)
 *   ├── terrain    — PLATEAU's 2.5 m TIN
 *   ├── roads      — PLATEAU's tran surfaces; the lane graph is Phase 6
 *   ├── buildings  — MLIT's 3D Tiles, refined and culled by 3d-tiles-renderer
 *   └── agents     — Phases 7-8, updated on the loop's fixed step
 *
 * Every one of those is one call below. Adding the real thing means changing the
 * module, not this file.
 *
 * **Boot is two stages, and the split matters to the visual gate.** The renderer,
 * the camera and the loop come up immediately, so a frame is drawn within
 * milliseconds and a failure in any of them is a boot error rather than a
 * timeout. The map data — 4 MB of terrain, 7 MB of roads and a 137 MB tileset —
 * loads after that, and `isReady` stays false until it is in. A harness that
 * captured on the first frame would photograph an empty sky and report a passing
 * sweep.
 *
 * **The frame goes through the post chain, not through `renderer.render`.** That
 * is item 20, and it is why `src/render/post.ts` owns the draw call.
 */

import { FogExp2, Scene, type WebGLRenderTarget } from "three";

import { createAgents, type AgentSystem } from "./agents/agents.js";
import { createAgentRenderer } from "./agents/render/agents.js";
import { loadManifest } from "./agents/render/assets.js";
import type { PopulationSettings } from "./agents/population/config.js";
import { VEHICLE_ASSET_URL, type VehicleAssetManifest } from "./world/agent-assets.js";
import { installBridge } from "./harness/bridge.js";
import { createCameraRig } from "./render/camera.js";
import { RenderLoop } from "./render/loop.js";
import { createPostChain, type PostChain } from "./render/post.js";
import { createRenderer, resizeRendererToDisplay } from "./render/renderer.js";
import { createBuildings, type Buildings } from "./scene/buildings.js";
import type { FacadeTextureOptions } from "./scene/facade-textures.js";
import { createLighting, type Lighting } from "./scene/lighting.js";
import { createRoads } from "./scene/roads.js";
import { createAuthoredSignage, type AuthoredSignage } from "./scene/signage.js";
import { bakeEnvironment, createSky } from "./scene/sky.js";
import { createTerrain } from "./scene/terrain.js";
import {
  DEFAULT_TIME_PRESET,
  lightingForPreset,
  type TimeOfDayLighting,
  type TimePresetId,
} from "./scene/time-of-day.js";
import { DEFAULT_SEED } from "./world/rng.js";
import { DEFAULT_WORLD_STYLE_ID, worldStyle, type WorldStyle } from "./world/styles.js";
import { applyFacadeStyle, createFacadeStyle } from "./scene/tile-materials.js";
import { loadNetwork } from "./network/load.js";
import { createStreetDetails, type PaintPlacement } from "./scene/street-details.js";
import { createVegetation } from "./scene/vegetation.js";
import { loadControlHardware } from "./scene/control-hardware.js";
import type { ControlHardwarePlacement } from "./world/control-hardware.js";
import type { PaintSeamUse } from "./scene/paint-support.js";

export interface AppOptions {
  /**
   * Seed for anything generated. Fixed so frames repeat.
   *
   * The terrain, roads and buildings are all survey data, so this reaches the
   * agent system that Phases 7 and 8 fill in, and the authored signage boards of
   * item 16, whose faces are drawn procedurally. It stays plumbed through because
   * the visual gate compares frames across runs, and a scene that reshuffles
   * itself would make the gate measure the shuffle.
   */
  seed?: number;
  /** Which time of day to render. Defaults to the hero preset, dusk. */
  time?: TimePresetId;
  style?: string;
  /** Switch the post chain off. Only the item 20 gate proof does this. */
  post?: boolean;
  /** Overrides for the facade pass. Only the item 35 and 16 gate proofs do this. */
  facade?: Partial<Omit<FacadeTextureOptions, "signageIntensity" | "style">> | undefined;
  /**
   * Population settings, from `?agents=`. Absent means no population at all,
   * which is the behaviour every run without the parameter has always had.
   */
  population?: Partial<PopulationSettings> | undefined;
}

export interface App {
  readonly loop: RenderLoop;
  readonly agents: AgentSystem;
  /** The seed everything generated in this scene draws from. */
  readonly seed: number;
  /** Resolves when the map data is in the scene; rejects with a named failure. */
  readonly ready: Promise<void>;
  setStyle(id: string): void;
  dispose(): void;
}

export function createApp(canvas: HTMLCanvasElement, options: AppOptions = {}): App {
  const renderer = createRenderer(canvas);

  let contextLost = false;
  canvas.addEventListener("webglcontextlost", (event) => {
    // Left unprevented on purpose: a lost context is a real failure here, and
    // swallowing it would let the harness photograph a stale framebuffer and
    // call it a frame.
    contextLost = true;
    console.error("WebGL context lost", event);
  });

  const timePreset: TimePresetId = options.time ?? DEFAULT_TIME_PRESET;
  const lighting: TimeOfDayLighting = lightingForPreset(timePreset);
  let style = worldStyle(options.style ?? DEFAULT_WORLD_STYLE_ID);
  const facadeStyle = createFacadeStyle(style);
  const styleConsumers: ((style: WorldStyle) => void)[] = [];

  const scene = new Scene();
  const sky = createSky(lighting);
  scene.add(sky.mesh);

  const lights: Lighting = createLighting(lighting);
  scene.add(lights.root);

  // Image-based lighting off the same dome. This is where most of the realism at
  // dusk comes from: these towers are largely glass, and glass with nothing to
  // reflect is a flat grey polygon whatever the sun is doing.
  let environment: WebGLRenderTarget | null = null;
  try {
    environment = bakeEnvironment(renderer, sky);
    scene.environment = environment.texture;
    scene.environmentIntensity = lighting.environmentIntensity;
  } catch (cause) {
    console.warn(
      "The sky could not be baked into an environment map, so nothing in the scene " +
        `reflects it and every glass facade is a flat grey. ${String(cause)}`,
    );
  }

  scene.fog = new FogExp2(lighting.fogColour.getHex(), lighting.fogDensity);

  // The one uniform every patched tile material reads its signage level from.
  const signageIntensity = { value: lighting.signageIntensity * style.signage };
  const signage: AuthoredSignage = createAuthoredSignage(options.seed ?? DEFAULT_SEED);
  signage.apply({ ...lighting, signageIntensity: signageIntensity.value });
  scene.add(signage.root);

  const { camera, controls } = createCameraRig(canvas);

  const post: PostChain = createPostChain({
    renderer,
    scene,
    camera,
    lighting: { ...lighting, bloom: { ...lighting.bloom, strength: lighting.bloom.strength * style.bloom } },
    width: canvas.clientWidth || 1280,
    height: canvas.clientHeight || 720,
    enabled: options.post ?? true,
  });

  const loop = new RenderLoop({
    render: () => {
      post.render();
    },
  });

  // Damping is a per-frame effect, so it runs on the frame step. This is also
  // the only place `controls.update` is called: the camera moves because input
  // reached the controls, never because something assigned a pose.
  loop.onFrame(() => {
    controls.update();
  });

  const agents = createAgents(loop, options.population ?? { pedestrians: 0, vehicles: 0 });
  scene.add(agents.root);

  // The tiles renderer needs the camera's world matrix as it will be *this*
  // frame, so it refines after the controls have moved it and before the draw.
  const buildings: Buildings = createBuildings(camera, renderer, {
    signageIntensity,
    style: facadeStyle,
    facade: options.facade,
  });
  scene.add(buildings.root);

  // Whether the picture is holding still, which is what the temporal pass needs
  // to know. Two independent witnesses, and both have to agree: the camera's own
  // world matrix, and the tileset. A camera that has come to rest over a city
  // still refining is not a still picture.
  const lastCameraMatrix = camera.matrixWorld.elements.slice();
  let tilesWereStill = false;
  loop.onFrame(() => {
    buildings.update();
    let cameraStill = true;
    const elements = camera.matrixWorld.elements;
    for (let index = 0; index < 16; index += 1) {
      if (Math.abs(elements[index]! - lastCameraMatrix[index]!) > 1e-7) cameraStill = false;
      lastCameraMatrix[index] = elements[index]!;
    }
    const tilesStill = buildings.settled();
    if (tilesStill && !tilesWereStill) signage.mount(buildings.root);
    tilesWereStill = tilesStill;
    // A populated scene is never still: thousands of pedestrians walking means the
    // picture changes every frame, so temporal accumulation stays off in populated
    // lanes by construction. A population-free run keeps the original predicate.
    post.setStill(cameraStill && tilesStill && (agents.root.children.length === 0 || !agents.moving()));
  });

  let sceneLoaded = false;
  let hardwareObservation: readonly ControlHardwarePlacement[] = [];
  let paintObservation: readonly PaintPlacement[] = [];
  let paintSeamObservation: readonly PaintSeamUse[] = [];
  let sceneError: string | null = null;
  let disposed = false;
  const disposers: (() => void)[] = [
    () => buildings.dispose(),
    () => post.dispose(),
    () => environment?.dispose(),
    () => signage.dispose(),
    () => { sky.mesh.geometry.dispose(); for (const material of Array.isArray(sky.mesh.material) ? sky.mesh.material : [sky.mesh.material]) material.dispose(); },
  ];
  const loadOwned = async <T extends { dispose(): void }>(loading: Promise<T>): Promise<T> => {
    const resource = await loading;
    let released = false;
    const dispose = (): void => { if (!released) { released = true; resource.dispose(); } };
    disposers.push(dispose);
    if (disposed) dispose();
    return resource;
  };

  const ready = (async (): Promise<void> => {
    // In parallel: the two meshes are one request each and the tileset root is a
    // small JSON. Serialising them would triple the wait for no gain.
    const [terrain, roads, network, vegetation] = await Promise.all([
      loadOwned(createTerrain(style)),
      loadOwned(createRoads(style)),
      loadNetwork(),
      loadOwned(createVegetation(style)),
      buildings.ready,
    ]);
    if (disposed) return;
    // The population is built here and nowhere else: it cannot exist before its
    // graph does, and it must not be rebuilt while actors hold admission
    // commitments against the graph they were planned on. The renderer is loaded
    // after the population so it can read the pose buffers the population writes.
    const populationWanted = (options.population?.pedestrians ?? 0) + (options.population?.vehicles ?? 0) > 0;
    if (populationWanted) {
      const fleet = await loadManifest<VehicleAssetManifest>(VEHICLE_ASSET_URL);
      if (disposed) return;
      agents.attach(network, fleet, options.population);
      const poses = agents.poses;
      if (poses !== null) {
        const renderer = await createAgentRenderer(poses, style);
        if (disposed) {
          renderer.dispose();
          return;
        }
        agents.mountRenderer(renderer);
        agents.root.add(renderer.group);
        styleConsumers.push((next) => renderer.setStyle(next));
        disposers.push(() => agents.mountRenderer(null));
        // The renderer runs on the frame step, with the loop's real interpolation
        // alpha: the simulation is a fixed step and the picture is not.
        loop.onFrame((_delta, elapsed, alpha) => renderer.update(alpha, camera, elapsed));
      }
    }
    const hardware = await loadControlHardware(network, roads.inputDigests);
    if (disposed) return;
    hardwareObservation = hardware.records;
    scene.add(terrain.root);
    scene.add(roads.root);
    const streets = createStreetDetails(network, style, roads.paintHeightAt, hardware.records);
    paintObservation = streets.paintPlacements;
    paintSeamObservation = roads.paintHeightAt.seamUses ?? [];
    scene.add(streets.root);
    scene.add(vegetation.root);
    vegetation.setStyle(style);
    styleConsumers.push(vegetation.setStyle);
    styleConsumers.push(streets.setStyle);
    disposers.push(() => streets.dispose());
    styleConsumers.push(terrain.setStyle, roads.setStyle);
    terrain.setStyle(style);
    roads.setStyle(style);

    // The tileset root being up is not the same as the buildings being on
    // screen: the traversal decides what to load from the camera, and it has not
    // run yet. Waiting for the first refinement to settle is the harness's job,
    // through `tiles` on the bridge.
    sceneLoaded = true;
  })();

  ready.catch((error: unknown) => {
    sceneError = error instanceof Error ? error.message : String(error);
    console.error(error);
  });

  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    resizeRendererToDisplay(renderer, width, height);
    post.setSize(width, height);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  installBridge({
    renderer,
    camera,
    controls,
    loop,
    // "Ready" means a frame has been drawn *and* the map data is in the scene.
    // Those are different claims and the harness needs the stronger one: a sweep
    // that captured after the first frame would photograph an empty sky twelve
    // times and every check in the gate would pass.
    isReady: () => loop.frameCount > 0 && !contextLost && sceneLoaded,
    contextLost: () => contextLost,
    error: () => sceneError,
    tiles: () => buildings.status(),
    lighting: () => ({
      preset: timePreset,
      label: lighting.label,
      tokyoClock: lighting.tokyoClock,
      ...lights.state(),
      exposure: renderer.toneMappingExposure,
      signageIntensity: signageIntensity.value,
      environmentIntensity: environment === null ? 0 : scene.environmentIntensity,
      authoredBoards: signage.counts.boards,
      authoredLights: signage.counts.lights,
    }),
    post: () => post.status(),
    style: () => ({ id: style.id, label: style.label }),
    facadeSamples: (rays) => buildings.facadeSamples(rays),
    hardware: () => hardwareObservation,
    paint: () => paintObservation,
    paintSeams: () => paintSeamObservation,
    population: () => agents.status(),
  });

  loop.start();

  return {
    loop,
    agents,
    seed: options.seed ?? DEFAULT_SEED,
    ready,
    setStyle(id: string): void {
      const next = worldStyle(id);
      if (next.id === style.id) return;
      style = next;
      applyFacadeStyle(facadeStyle, next);
      signageIntensity.value = lighting.signageIntensity * next.signage;
      for (const apply of styleConsumers) apply(next);
      signage.apply({ ...lighting, signageIntensity: lighting.signageIntensity * next.signage });
      post.apply({ ...lighting, bloom: { ...lighting.bloom, strength: lighting.bloom.strength * next.bloom } });
      post.invalidate();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      loop.stop();
      observer.disconnect();
      agents.dispose();
      controls.dispose();
      for (const dispose of disposers) dispose();
      renderer.dispose();
    },
  };
}

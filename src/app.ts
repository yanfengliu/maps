/**
 * Assembles the app: renderer, scene, camera rig, loop, and the systems hanging
 * off them.
 *
 * The scene graph the rest of the work grows into:
 *
 *   scene
 *   ├── sky        — Phase 5
 *   ├── lighting   — Phase 5
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
 */

import { Scene } from "three";

import { createAgents, type AgentSystem } from "./agents/agents.js";
import { installBridge } from "./harness/bridge.js";
import { createCameraRig } from "./render/camera.js";
import { RenderLoop } from "./render/loop.js";
import { createRenderer, resizeRendererToDisplay } from "./render/renderer.js";
import { createBuildings, type Buildings } from "./scene/buildings.js";
import { createLighting } from "./scene/lighting.js";
import { createRoads } from "./scene/roads.js";
import { createSky } from "./scene/sky.js";
import { createTerrain } from "./scene/terrain.js";
import { DEFAULT_SEED } from "./world/rng.js";

export interface AppOptions {
  /**
   * Seed for anything generated. Fixed so frames repeat.
   *
   * Nothing in the scene is generated any more — terrain, roads and buildings are
   * all survey data now — so this reaches only the agent system, which Phases 7
   * and 8 fill in. It stays plumbed through because the visual gate compares
   * frames across runs, and a scene that reshuffles itself would make the gate
   * measure the shuffle.
   */
  seed?: number;
}

export interface App {
  readonly loop: RenderLoop;
  readonly agents: AgentSystem;
  /** The seed everything generated in this scene draws from. */
  readonly seed: number;
  /** Resolves when the map data is in the scene; rejects with a named failure. */
  readonly ready: Promise<void>;
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

  const scene = new Scene();
  scene.add(createSky());
  scene.add(createLighting());

  const { camera, controls } = createCameraRig(canvas);

  const loop = new RenderLoop({
    render: () => {
      renderer.render(scene, camera);
    },
  });

  // Damping is a per-frame effect, so it runs on the frame step. This is also
  // the only place `controls.update` is called: the camera moves because input
  // reached the controls, never because something assigned a pose.
  loop.onFrame(() => {
    controls.update();
  });

  const agents = createAgents(loop);
  scene.add(agents.root);

  // The tiles renderer needs the camera's world matrix as it will be *this*
  // frame, so it refines after the controls have moved it and before the draw.
  const buildings: Buildings = createBuildings(camera, renderer);
  scene.add(buildings.root);
  loop.onFrame(() => {
    buildings.update();
  });

  let sceneLoaded = false;
  let sceneError: string | null = null;
  const disposers: (() => void)[] = [() => buildings.dispose()];

  const ready = (async (): Promise<void> => {
    // In parallel: the two meshes are one request each and the tileset root is a
    // small JSON. Serialising them would triple the wait for no gain.
    const [terrain, roads] = await Promise.all([
      createTerrain(),
      createRoads(),
      buildings.ready,
    ]);
    scene.add(terrain.root);
    scene.add(roads.root);
    disposers.push(() => terrain.dispose(), () => roads.dispose());

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
  });

  loop.start();

  return {
    loop,
    agents,
    seed: options.seed ?? DEFAULT_SEED,
    ready,
    dispose(): void {
      loop.stop();
      observer.disconnect();
      agents.dispose();
      controls.dispose();
      for (const dispose of disposers) dispose();
      renderer.dispose();
    },
  };
}

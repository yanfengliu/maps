/**
 * Assembles the app: renderer, scene, camera rig, loop, and the systems hanging
 * off them.
 *
 * The scene graph the rest of the work grows into:
 *
 *   scene
 *   ├── sky        — Phase 5
 *   ├── lighting   — Phase 5
 *   ├── terrain    — Phases 2-3
 *   ├── roads      — Phase 4 surface, Phase 6 graph
 *   ├── buildings  — Phases 2-4
 *   └── agents     — Phases 7-8, updated on the loop's fixed step
 *
 * Every one of those is one call below. Adding the real thing means changing the
 * module, not this file.
 */

import { Scene } from "three";

import { createAgents, type AgentSystem } from "./agents/agents.js";
import { installBridge } from "./harness/bridge.js";
import { createCameraRig } from "./render/camera.js";
import { RenderLoop } from "./render/loop.js";
import { createRenderer, resizeRendererToDisplay } from "./render/renderer.js";
import { createBuildings } from "./scene/buildings.js";
import { createLighting } from "./scene/lighting.js";
import { createRoads } from "./scene/roads.js";
import { createSky } from "./scene/sky.js";
import { createTerrain } from "./scene/terrain.js";
import { DEFAULT_SEED } from "./world/rng.js";

export interface AppOptions {
  /** Seed for every generated placeholder. Fixed so frames repeat. */
  seed?: number;
}

export interface App {
  readonly loop: RenderLoop;
  readonly agents: AgentSystem;
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
  scene.add(createTerrain());
  scene.add(createRoads());
  scene.add(createBuildings({ seed: options.seed ?? DEFAULT_SEED }));

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
    // "Ready" means a frame has been drawn, not that setup returned. Those are
    // different claims and the harness needs the stronger one.
    isReady: () => loop.frameCount > 0 && !contextLost,
    contextLost: () => contextLost,
  });

  loop.start();

  return {
    loop,
    agents,
    dispose(): void {
      loop.stop();
      observer.disconnect();
      agents.dispose();
      controls.dispose();
      renderer.dispose();
    },
  };
}

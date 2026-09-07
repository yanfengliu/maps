/**
 * The read-only window the visual harness looks through.
 *
 * Read-only is the point, and it is enforced here rather than asked for in a
 * comment. Every member is a function that returns a fresh plain object; the
 * bridge holds no setter, exposes no `camera`, no `controls`, no `scene`, and no
 * way to draw a frame. The harness can therefore see what the app did and cannot
 * make the app do anything — it has to go through the canvas with pointer and
 * wheel events like a person, which is the only path that exercises the code a
 * person's input runs through.
 *
 * If a later phase needs the harness to reach further in, widen this with
 * another observation, never with a mutation. A harness that can set state stops
 * testing the input path and starts testing itself.
 */

import type { PerspectiveCamera, WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { RenderLoop } from "../render/loop.js";
import type { BuildingsStatus } from "../scene/buildings.js";

/** The property the harness reads off `window`. */
export const HARNESS_KEY = "__mapsHarness";

export interface CameraSnapshot {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  /** Radians, as OrbitControls reports it. */
  azimuth: number;
  /** Radians down from straight up, as OrbitControls reports it. */
  polar: number;
  /** Metres from the camera to the controls' target. */
  distance: number;
}

export interface RenderStatus {
  /** True once the scene has been built and the first frame has been drawn. */
  ready: boolean;
  /** Frames drawn since boot. Zero here after a wait means the loop never ran. */
  frameCount: number;
  /** The message from a boot failure, or null. */
  error: string | null;
  /** True if the WebGL context was lost at any point. */
  contextLost: boolean;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  /** What the driver calls itself, so a software fallback is visible in a log. */
  glRenderer: string;
}

/**
 * What the building tileset is doing right now.
 *
 * An observation and nothing more: the harness reads it to know when the city
 * has finished refining for the pose it just moved to, and to record what loaded
 * and unloaded across a sweep. It cannot ask for a tile, evict one, or change the
 * error target — the traversal decides all of that from the camera, which moves
 * only through synthesised input.
 *
 * This is the widening the bridge's rule allows: another observation, never a
 * mutation. Without it the sweep photographs a half-loaded city and the frames
 * differ between runs for reasons that have nothing to do with the scene.
 */
export type TileStatus = BuildingsStatus;

export interface HarnessBridge {
  readonly version: 1;
  status(): RenderStatus;
  camera(): CameraSnapshot;
  tiles(): TileStatus;
}

declare global {
  interface Window {
    [HARNESS_KEY]?: HarnessBridge;
  }
}

export interface BridgeSources {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  loop: RenderLoop;
  isReady: () => boolean;
  contextLost: () => boolean;
  /** A failure that happened after boot — loading the map data, say. */
  error: () => string | null;
  tiles: () => TileStatus;
}

export function installBridge(sources: BridgeSources): HarnessBridge {
  const bridge: HarnessBridge = Object.freeze({
    version: 1 as const,
    status(): RenderStatus {
      const context = sources.renderer.getContext();
      return {
        ready: sources.isReady(),
        frameCount: sources.loop.frameCount,
        // A failure loading the map data arrives long after boot, so it cannot
        // be a thrown exception in `main.ts`. Reporting it here is what turns it
        // into a named failure in the gate instead of a wait for a `ready` that
        // is never coming.
        error: sources.error(),
        contextLost: sources.contextLost(),
        drawingBufferWidth: context.drawingBufferWidth,
        drawingBufferHeight: context.drawingBufferHeight,
        glRenderer: readGlRenderer(context),
      };
    },
    camera(): CameraSnapshot {
      const { camera, controls } = sources;
      return {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        azimuth: controls.getAzimuthalAngle(),
        polar: controls.getPolarAngle(),
        distance: controls.getDistance(),
      };
    },
    tiles(): TileStatus {
      return sources.tiles();
    },
  });

  window[HARNESS_KEY] = bridge;
  return bridge;
}

/**
 * Publish a boot failure through the same channel.
 *
 * Without this the harness sees a page that never becomes ready and has to guess
 * why. With it the failure text reaches the test report, which is the difference
 * between "the scene is broken" and "a twenty second timeout elapsed".
 */
export function installFailedBridge(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  window[HARNESS_KEY] = Object.freeze({
    version: 1 as const,
    status(): RenderStatus {
      return {
        ready: false,
        frameCount: 0,
        error: message,
        contextLost: false,
        drawingBufferWidth: 0,
        drawingBufferHeight: 0,
        glRenderer: "unavailable",
      };
    },
    camera(): CameraSnapshot {
      const zero = { x: 0, y: 0, z: 0 };
      return { position: zero, target: zero, azimuth: 0, polar: 0, distance: 0 };
    },
    tiles(): TileStatus {
      return {
        idle: false,
        visible: 0,
        active: 0,
        pending: 0,
        failed: 0,
        cachedBytes: 0,
        gpuBytes: 0,
        loaded: 0,
        unloaded: 0,
        texturesShrunk: 0,
        maxTextureSize: 0,
        error: message,
        drawnMeshes: 0,
        drawnTriangles: 0,
        drawnBounds: null,
      };
    },
  });
}

function readGlRenderer(context: WebGLRenderingContext | WebGL2RenderingContext): string {
  const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
  if (debugInfo !== null) {
    const unmasked = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    if (typeof unmasked === "string") return unmasked;
  }
  const masked = context.getParameter(context.RENDERER);
  return typeof masked === "string" ? masked : "unknown";
}

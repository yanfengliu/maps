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

import type { PostStatus } from "../render/post.js";
import type { RenderLoop } from "../render/loop.js";
import type { BuildingsStatus, FacadeSample, FacadeRay } from "../scene/buildings.js";
import type { AlbedoStats } from "../scene/delight.js";
import type { LightingState } from "../scene/lighting.js";
import type { ControlHardwarePlacement } from "../world/control-hardware.js";
import type { PaintPlacement } from "../scene/street-details.js";
import type { PaintSeamUse } from "../scene/paint-support.js";
import type { SignalSnapshot } from "../network/signals.js";
import { emptyPopulationStatus, type PopulationStatus } from "../agents/population/status.js";

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

/**
 * What time of day the scene is rendering, and what that made of the lights.
 *
 * Another observation, on the same terms as `tiles` above. The harness reads it
 * so a frame's review can be pinned to the sun that lit it — a sweep captured at
 * the wrong preset is a different sweep, and nothing in a screenshot says which
 * hour it was. Nothing here can change the time: `?time=` on the URL is the only
 * way in, which is the path a person uses.
 */
export interface LightingStatus extends LightingState {
  /** The preset id, which is what `?time=` takes. */
  preset: string;
  label: string;
  tokyoClock: string;
  exposure: number;
  signageIntensity: number;
  environmentIntensity: number;
  /** How many signs in this scene are hand-placed rather than derived. */
  authoredBoards: number;
  authoredLights: number;
}

/**
 * The shared signal clock, as the simulation last advanced it.
 *
 * A third observation on the terms of `tiles` and `lighting` above, and it
 * exists because a rendered signal is not otherwise checkable: a lens colour is
 * one or two pixels, so a frame says what the phase looked like and nothing
 * about which phase it was. With this the harness records the phase beside the
 * frame it captured, and the two can be read together.
 *
 * It is the same snapshot the scene's own lenses are coloured from — one source,
 * one clock — so a frame and its record cannot describe different phases. It
 * cannot advance a phase, hold a clearance or admit an actor.
 */
export interface HarnessBridge {
  readonly version: 1;
  status(): RenderStatus;
  camera(): CameraSnapshot;
  tiles(): TileStatus;
  lighting(): LightingStatus;
  post(): PostStatus;
  style(): { id: string; label: string };
  facadeSamples(rays?: readonly FacadeRay[]): FacadeSample[];
  hardware(): ControlHardwarePlacement[];
  paint(): PaintPlacement[];
  paintSeams(): PaintSeamUse[];
  /** The population's own counters, which `installBridge` has always published. */
  population(): PopulationStatus;
  /** Every governed junction's stage, active group and remaining seconds. */
  signals(): SignalSnapshot[];
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
  lighting: () => LightingStatus;
  post: () => PostStatus;
  style: () => { id: string; label: string };
  facadeSamples: (rays?: readonly FacadeRay[]) => FacadeSample[];
  hardware: () => readonly ControlHardwarePlacement[];
  paint: () => readonly PaintPlacement[];
  paintSeams: () => readonly PaintSeamUse[];
  population: () => PopulationStatus;
  signals: () => readonly SignalSnapshot[];
}

/**
 * Install the bridge.
 *
 * The object is built as a plain literal and *then* frozen, rather than being
 * written inline as `Object.freeze({...})`, so the compiler checks it against
 * `HarnessBridge` in both directions: a member the interface declares and this
 * object does not implement is an error, and so is one it implements and the
 * interface does not declare. `population()` was published here for a while
 * without being declared, and every harness that wanted it had to cast around
 * the type to reach a function that was already there.
 */
export function installBridge(sources: BridgeSources): HarnessBridge {
  const bridge: HarnessBridge = {
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
    lighting(): LightingStatus {
      return sources.lighting();
    },
    post(): PostStatus {
      return sources.post();
    },
    style(): { id: string; label: string } { return { ...sources.style() }; },
    facadeSamples(rays?: readonly FacadeRay[]): FacadeSample[] { return sources.facadeSamples(rays); },
    hardware(): ControlHardwarePlacement[] { return structuredClone(sources.hardware()) as ControlHardwarePlacement[]; },
    paint(): PaintPlacement[] { return structuredClone(sources.paint()) as PaintPlacement[]; },
    paintSeams(): PaintSeamUse[] { return structuredClone(sources.paintSeams()) as PaintSeamUse[]; },
    population(): PopulationStatus { return structuredClone(sources.population()); },
    signals(): SignalSnapshot[] { return structuredClone(sources.signals()) as SignalSnapshot[]; },
  };

  Object.freeze(bridge);
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
  const bridge: HarnessBridge = {
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
        facade: {
          processed: 0,
          shrunk: 0,
          maxTextureSize: 0,
          priorityAtlases: 0,
          cappedTextureBytes: 0,
          savedPixels: 0,
          delit: false,
          signMaskMean: 0,
          signMaskCoverage: 0,
          signMaskCoverageTable: [],
          materialsPatched: 0,
          proceduralFeatures: 0,
          error: message,
        },
        albedoBefore: emptyAlbedoStats(),
        albedoAfter: emptyAlbedoStats(),
        revision: 0,
        error: message,
        drawnMeshes: 0,
        drawnTriangles: 0,
        drawnBounds: null,
      };
    },
    lighting(): LightingStatus {
      return {
        preset: "none",
        label: "the scene did not start",
        tokyoClock: "",
        sunAzimuthDegrees: 0,
        sunElevationDegrees: 0,
        keyElevationDegrees: 0,
        keyIntensity: 0,
        keyColour: [0, 0, 0],
        shadowsEnabled: false,
        twilightStandIn: false,
        hemisphereIntensity: 0,
        exposure: 0,
        signageIntensity: 0,
        environmentIntensity: 0,
        authoredBoards: 0,
        authoredLights: 0,
      };
    },
    post(): PostStatus {
      return {
        active: false,
        error: message,
        passes: [],
        toneMapping: "ACESFilmic",
        exposure: 0,
        bloom: { strength: 0, threshold: 0, radius: 0 },
        ambientOcclusion: { blendIntensity: 0, radiusM: 0 },
        taaAccumulating: false,
        taaSamples: 0,
        bufferBytes: 0,
      };
    },
    style(): { id: string; label: string } { return { id: "unavailable", label: "Unavailable" }; },
    facadeSamples(): FacadeSample[] { return []; },
    hardware(): ControlHardwarePlacement[] { return []; },
    paint(): PaintPlacement[] { return []; },
    paintSeams(): PaintSeamUse[] { return []; },
    population(): PopulationStatus { return emptyPopulationStatus(); },
    signals(): SignalSnapshot[] { return []; },
  };

  Object.freeze(bridge);
  window[HARNESS_KEY] = bridge;
}

function emptyAlbedoStats(): AlbedoStats {
  return {
    samples: 0,
    meanLinearLuminance: 0,
    meanSrgbLuminance: 0,
    meanSaturation: 0,
    p05LinearLuminance: 0,
    p50LinearLuminance: 0,
    p95LinearLuminance: 0,
    dynamicRange: 1,
  };
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

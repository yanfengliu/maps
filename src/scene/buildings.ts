/**
 * Buildings. Plan items 10 and 12, delivered in Phase 2.
 *
 * The 1,740 buildings in the area of interest come from MLIT's own 3D Tiles build
 * of PLATEAU Shibuya-ku FY2025 — 67 tiles in a five-level `REPLACE` hierarchy,
 * moved into the world frame offline by `tools/scene/build-buildings.ts`. What
 * arrives here is therefore plain glTF 2.0 plus Draco, already in metres from the
 * Scramble Crossing, with `CESIUM_RTC` gone and each tile's placement carried by
 * an ordinary root node matrix.
 *
 * ## Why a library and not a loader of our own
 *
 * Item 12 asks for culling and level of detail. The tileset already carries both:
 * a real hierarchy, `REPLACE` refinement, and geometric errors from 316 down to
 * 0. What is left is screen-space error selection, frustum culling, a download
 * queue and an eviction policy — and the last of those is not optional here.
 * Measured on the built scene: 551.9 megapixels of texture across the 67 tiles,
 * 25 of them carrying a 4096x4096 atlas. All of it resident as RGBA with mipmaps
 * is about 2.9 GB, which no browser will hold. Something has to unload tiles, and
 * `3d-tiles-renderer`'s LRU cache does, with a byte budget and an unload plugin.
 *
 * Against that: three dependencies this project does not use (`@mapbox/
 * vector-tile`, `pbf`, `pmtiles`), and a library that assumes tiles are placed on
 * an ellipsoid. The second is the real cost and it is paid offline: the pipeline
 * rewrites the tileset's `region` bounding volumes as `box`es in world metres, so
 * nothing here needs an ellipsoid, a globe transform, or any coordinate larger
 * than about two kilometres. Writing the traversal, the queue and the cache by
 * hand would be a few thousand lines to arrive at the same place with worse
 * eviction.
 *
 * The facade plugin keeps the source atlas cached while applying the selected
 * world treatment. Per-building batch attributes supply real floor information
 * without replacing the surveyed geometry.
 */

import type { Camera, Mesh, MeshStandardMaterial, Object3D, WebGLRenderer } from "three";
import { Box3, Group, Matrix3, Raycaster, Vector2, Vector3 } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { TilesRenderer } from "3d-tiles-renderer";
import { GLTFExtensionsPlugin, UnloadTilesPlugin } from "3d-tiles-renderer/plugins";

import { SCENE_FILES } from "../world/scene-data.js";
import type { AlbedoStats } from "./delight.js";
import {
  DEFAULT_FACADE_OPTIONS,
  FacadeTexturePlugin,
  type FacadeTextureOptions,
  type FacadeTextureStats,
} from "./facade-textures.js";
import type { SignageUniform, FacadeStyleUniforms } from "./tile-materials.js";
import { wholeByteAccounting } from "./tile-memory.js";

/**
 * Screen-space error target, in pixels.
 *
 * A tile refines when its geometric error would cover more than this many pixels.
 * Lower is sharper and loads more; the default is 6. Sixteen was chosen by
 * looking at the sweep: at street level it still resolves the leaf tiles around
 * the crossing, and from 950 m up it stops the whole ward trying to be resident
 * at once. Phase 9 owns the frame budget and may move it.
 */
const ERROR_TARGET = 16;

/**
 * How many bytes of tile content may be resident before eviction starts.
 *
 * These are **decoded** bytes, not downloaded ones: the cache counts geometry
 * attributes plus each texture at width x height x 4 x 1.33 for mipmaps. That
 * distinction is the whole reason these numbers are what they are, and getting it
 * wrong does not degrade the scene — it stops it.
 *
 * A first attempt set the maximum to 48 MB, reasoning from the 137 MB the tiles
 * weigh on disk. Measured result: all 67 tiles downloaded, seven produced a
 * model, and the traversal never refined past the root, so the app drew the root
 * tile's seventeen decimated buildings over the whole ward — and reported itself
 * loaded, idle and error-free while doing it. The mechanism is in the library's
 * `markVisibleTiles`: a `REPLACE` parent keeps displaying until every used child
 * has finished loading, and a cache that cannot hold the children never lets that
 * happen. The visual gate did not catch it either, because the terrain and the
 * roads were still there and every pixel floor passed on a map of Shibuya with no
 * buildings on it.
 *
 * The fixed geographic policy selects 17 near-crossing tiles: one observed
 * frontage leaf at native 4096 pixels, the others at 2048; outside tiles use
 * 1024. The full-source audit estimates 561,075,583 texture bytes
 * with mipmaps plus 73,324,734 geometry bytes. A 640 MiB floor holds that bounded
 * population; 768 MiB is the eviction ceiling. Neither budget promises measured
 * GPU allocation or camera-dependent upgrades.
 */
const CACHE_BYTES = Object.freeze({
  minimum: 640 * 1024 * 1024,
  maximum: 768 * 1024 * 1024,
});

/** How long a tile stays resident after it stops being visible, milliseconds. */
const UNLOAD_DELAY_MS = 2_000;

export interface BuildingsStatus {
  /** True once the root tileset has loaded and no tile is in flight. */
  idle: boolean;
  /** Tiles the traversal currently wants on screen. */
  visible: number;
  /** Tiles held in memory, drawn or not. */
  active: number;
  /** Tiles queued, downloading or parsing right now. */
  pending: number;
  /** Tiles that failed to load this session. */
  failed: number;
  /** Bytes of tile content held in memory, decoded, as the cache counts them. */
  cachedBytes: number;
  /**
   * Bytes currently uploaded to the GPU.
   *
   * Not the same number as `cachedBytes` and the difference is the point.
   * `UnloadTilesPlugin` frees a tile's geometry, materials and textures as soon
   * as it stops being visible, while the decoded image stays in memory so it can
   * be re-uploaded without another download. So this is what the graphics driver
   * is holding, `cachedBytes` is what the tab is holding, and watching this one
   * fall as the camera turns is the evidence that tiles unload at all.
   */
  gpuBytes: number;
  /** Tiles this session has finished loading, cumulative. */
  loaded: number;
  /** Tiles this session has unloaded, cumulative. */
  unloaded: number;
  /**
   * What the facade pass did: the size cap, the de-lighting of item 35 and the
   * derived sign mask of item 16, all in one read of each atlas.
   */
  facade: FacadeTextureStats;
  /** Albedo statistics over every atlas, as PLATEAU shipped it. */
  albedoBefore: AlbedoStats;
  /** The same statistics after the de-lighting operator ran. */
  albedoAfter: AlbedoStats;
  /**
   * Bumped whenever a tile model arrives or leaves.
   *
   * The post chain's temporal accumulation needs to know the picture changed, and
   * a tileset refining behind a still camera changes it. Comparing this between
   * frames is cheaper than measuring the scene.
   */
  revision: number;
  /** The first load failure, or null. */
  error: string | null;
  /** Meshes currently in the buildings group and drawn. */
  drawnMeshes: number;
  /** Triangles in those meshes. */
  drawnTriangles: number;
  /**
   * The world-space box everything drawn sits in, metres, or null when nothing is.
   *
   * This is the observation that separates "tiles loaded" from "tiles are in the
   * scene where they belong". A tileset can report tiles visible, active and
   * cached while drawing nothing at all — an unsupported glTF extension, a
   * material that failed, a transform that put the city under the terrain — and
   * every pixel measure in the visual gate passes on the frame that results,
   * because the terrain and the roads are still there.
   */
  drawnBounds: { min: [number, number, number]; max: [number, number, number] } | null;
}

export interface Buildings {
  root: Group;
  /** Called once per frame with the camera that is about to draw. */
  update(): void;
  /**
   * Has the tileset stopped changing the picture since the last call?
   *
   * Cheap on purpose: `status()` walks every drawn mesh and is far too heavy to
   * call once a frame, and this is asked once a frame by the post chain's
   * temporal accumulation. False on the frame a tile arrives or leaves and on the
   * one after it, true from then until something else moves.
   */
  settled(): boolean;
  status(): BuildingsStatus;
  facadeSamples(rays?: readonly FacadeRay[]): FacadeSample[];
  /** Resolves once the root tileset is up; rejects with a named failure. */
  ready: Promise<void>;
  dispose(): void;
}

/** Observed atlas behind fixed screen rays, tied to the current control-driven
 * camera. Reports the live texture image dimensions, not the configured cap.
 */
export interface FacadeRay { x: number; y: number }
export interface FacadeSample {
  ndc: { x: number; y: number };
  position: { x: number; y: number; z: number };
  tileUri: string;
  tileBounds: number[] | null;
  limit: number;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  /** Source-map nearest texel, sRGB RGB and linear mask alpha; not a framebuffer read. */
  rgba: [number, number, number, number] | null;
  uv: { x: number; y: number } | null;
  worldNormal: { x: number; y: number; z: number } | null;
}

export interface BuildingsOptions {
  style: FacadeStyleUniforms;
  /** The shared uniform the patched tile materials read their signage level from. */
  signageIntensity: SignageUniform;
  /** Overrides for the facade pass; the gate proofs are the reason this exists. */
  facade?: Partial<Omit<FacadeTextureOptions, "signageIntensity">> | undefined;
}

export function createBuildings(
  camera: Camera,
  renderer: WebGLRenderer,
  options: BuildingsOptions,
): Buildings {
  const group = new Group();
  group.name = "buildings";

  const draco = new DRACOLoader();
  // Served out of node_modules by `tools/vite/serve-scene-data.ts` rather than
  // bundled: it is a 512 KB script and a 192 KB WebAssembly binary, and every
  // tile in this scene needs it.
  draco.setDecoderPath("/draco/");

  const tiles = new TilesRenderer(SCENE_FILES.buildingsTileset);
  // Upstream mipmap estimates include fractional bytes. Its zero-budget LRU
  // disposal loop compares differently ordered floating sums without an item
  // bound. Whole bytes keep those sums exact and conservatively budget memory.
  const accounting = tiles as TilesRenderer & { calculateBytesUsed(tile: unknown, scene: Object3D): number };
  const calculateBytesUsed = accounting.calculateBytesUsed.bind(tiles);
  accounting.calculateBytesUsed = wholeByteAccounting(calculateBytesUsed);
  tiles.registerPlugin(new GLTFExtensionsPlugin({ dracoLoader: draco }));
  // Before the unload plugin, and before anything measures a tile: the texture
  // cap has to be applied where the library still counts the bytes it will hold,
  // not after. The same pass de-lights the albedo and derives the sign mask, so
  // each atlas is read once. See `src/scene/facade-textures.ts`.
  const facade = new FacadeTexturePlugin({
    ...DEFAULT_FACADE_OPTIONS,
    ...options.facade,
    signageIntensity: options.signageIntensity,
    style: options.style,
  });
  tiles.registerPlugin(facade);
  const unloader = new UnloadTilesPlugin({ delay: UNLOAD_DELAY_MS });
  tiles.registerPlugin(unloader);
  tiles.errorTarget = ERROR_TARGET;
  tiles.lruCache.minBytesSize = CACHE_BYTES.minimum;
  tiles.lruCache.maxBytesSize = CACHE_BYTES.maximum;
  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);

  let loaded = 0;
  let unloaded = 0;
  let revision = 0;
  let rootUp = false;
  let error: string | null = null;

  const ready = new Promise<void>((resolve, reject) => {
    tiles.addEventListener("load-root-tileset", () => {
      rootUp = true;
      resolve();
    });
    tiles.addEventListener("load-error", (event) => {
      const detail = event as unknown as { url?: string | URL; error?: Error };
      const message =
        `A building tile failed to load: ${String(detail.url ?? "unknown URL")} — ` +
        `${detail.error?.message ?? "no message"}. The tileset and its 67 tiles are built by ` +
        "`npm run data:scene` into data/scene/buildings/ and served from there.";
      if (error === null) error = message;
      if (!rootUp) reject(new Error(message));
    });
  });

  tiles.addEventListener("load-model", (event) => {
    loaded += 1;
    revision += 1;
    const scene = (event as unknown as { scene: { traverse(cb: (o: unknown) => void): void } }).scene;
    scene.traverse((object) => {
      const mesh = object as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (mesh.isMesh === true) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  });
  tiles.addEventListener("dispose-model", () => {
    unloaded += 1;
    revision += 1;
  });

  group.add(tiles.group);

  let settledRevision = -1;

  return {
    root: group,
    facadeSamples(rays = [-0.82, -0.28, 0.18, 0.65].map((x) => ({ x, y: 0.48 }))): FacadeSample[] {
      if (rays.length > 64 || rays.some((ray) => !Number.isFinite(ray.x) || !Number.isFinite(ray.y) || Math.abs(ray.x) > 1 || Math.abs(ray.y) > 1)) throw new Error("Facade observations need at most 64 finite screen rays with x/y between -1 and 1.");
      const visible: Object3D[] = []; group.traverseVisible((object) => { if ((object as Mesh).isMesh) visible.push(object); });
      const ray = new Raycaster(); const result: FacadeSample[] = [];
      for (const point of rays) {
        const ndc = { x: point.x, y: point.y }; ray.setFromCamera(new Vector2(ndc.x, ndc.y), camera);
        const hit = ray.intersectObjects(visible, false)[0]; if (!hit) continue;
        const mesh = hit.object as Mesh; const material = Array.isArray(mesh.material) ? mesh.material[hit.face?.materialIndex ?? 0] : mesh.material;
        const map = (material as MeshStandardMaterial).map;
        const info = map?.userData.mapsAtlas as Pick<FacadeSample, "tileUri" | "tileBounds" | "limit" | "sourceWidth" | "sourceHeight"> | undefined; if (!map || !info) continue;
        const image = map.image as { width: number; height: number; data?: Uint8Array | Uint8ClampedArray };
        const uv = hit.uv?.clone(); if (uv) map.transformUv(uv);
        const offset = uv ? (Math.min(image.height - 1, Math.floor(uv.y * image.height)) * image.width + Math.min(image.width - 1, Math.floor(uv.x * image.width))) * 4 : -1;
        const rgba: FacadeSample["rgba"] = image.data && offset >= 0 ? [image.data[offset]!, image.data[offset + 1]!, image.data[offset + 2]!, image.data[offset + 3]!] : null;
        const normal = hit.normal?.clone() ?? hit.face?.normal.clone(); normal?.applyNormalMatrix(new Matrix3().getNormalMatrix(mesh.matrixWorld));
        result.push({ ...info, tileBounds: info.tileBounds?.slice() ?? null, ndc, position: { x: hit.point.x, y: hit.point.y, z: hit.point.z }, width: image.width, height: image.height, rgba, uv: uv ? { x: uv.x, y: uv.y } : null, worldNormal: normal ? { x: normal.x, y: normal.y, z: normal.z } : null });
      }
      return result;
    },
    settled(): boolean {
      const stats = statsOf(tiles);
      const pending = stats.queued + stats.downloading + stats.parsing;
      const steady = rootUp && pending === 0 && revision === settledRevision;
      settledRevision = revision;
      return steady;
    },
    update(): void {
      // The camera moved and the canvas may have resized, so both are restated
      // before the traversal decides what to load. Cheap, and skipping it is how
      // a tileset ends up refining against last frame's viewport.
      tiles.setResolutionFromRenderer(camera, renderer);
      tiles.update();
    },
    status(): BuildingsStatus {
      const stats = statsOf(tiles);
      const pending = stats.queued + stats.downloading + stats.parsing;
      const drawn = measureDrawn(group);
      return {
        ...drawn,
        idle: rootUp && pending === 0,
        visible: tiles.visibleTiles.size,
        active: tiles.activeTiles.size,
        pending,
        failed: stats.failed,
        cachedBytes: cachedBytesOf(tiles),
        gpuBytes: (unloader as unknown as { estimatedGpuBytes?: number }).estimatedGpuBytes ?? 0,
        loaded,
        unloaded,
        facade: facade.stats(),
        albedoBefore: facade.before.stats(),
        albedoAfter: facade.after.stats(),
        revision,
        error,
      };
    },
    ready,
    dispose(): void {
      tiles.dispose();
      draco.dispose();
    },
  };
}

/**
 * How many bytes the LRU cache is holding.
 *
 * The cache's byte accounting is real but is not on the published type, so this
 * reads it defensively and reports 0 rather than throwing if the field moves
 * under a library upgrade. It is a diagnostic the harness prints, not a number
 * anything decides on — the eviction policy itself lives inside the library.
 */
function cachedBytesOf(tiles: TilesRenderer): number {
  const cache = tiles.lruCache as unknown as { cachedBytes?: number };
  return typeof cache.cachedBytes === "number" ? cache.cachedBytes : 0;
}

/**
 * The tight world-space box of every mesh, computed once each and remembered.
 *
 * `Box3.expandByObject` transforms a mesh's *local* axis-aligned box and takes
 * the box of the result, which for geometry carrying a rotation is much larger
 * than the geometry — measured here at 300 m of slack on a tile 175 m across.
 * That is fine for culling and useless as evidence, so this walks the vertices.
 * The pass is paid once per mesh: a tile's placement never changes after it
 * loads, so the answer cannot go stale.
 */
const preciseBounds = new WeakMap<Mesh, Box3>();

function boundsOf(mesh: Mesh): Box3 {
  const cached = preciseBounds.get(mesh);
  if (cached !== undefined) return cached;

  const position = mesh.geometry.getAttribute("position");
  const box = new Box3();
  box.makeEmpty();
  if (position !== undefined) {
    const point = new Vector3();
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
      box.expandByPoint(point);
    }
  }
  preciseBounds.set(mesh, box);
  return box;
}

/**
 * Count what is actually in the scene under the buildings group.
 *
 * Walks the group rather than asking the tileset, because the two can disagree
 * and the disagreement is the interesting case: the tileset knows what it asked
 * for and this knows what arrived.
 */
function measureDrawn(group: Group): {
  drawnMeshes: number;
  drawnTriangles: number;
  drawnBounds: { min: [number, number, number]; max: [number, number, number] } | null;
} {
  let drawnMeshes = 0;
  let drawnTriangles = 0;
  const box = new Box3();
  box.makeEmpty();

  group.traverseVisible((object) => {
    const mesh = object as Mesh & { isMesh?: boolean };
    if (mesh.isMesh !== true) return;
    drawnMeshes += 1;
    const index = mesh.geometry.getIndex();
    const position = mesh.geometry.getAttribute("position");
    if (index !== null) drawnTriangles += index.count / 3;
    else if (position !== undefined) drawnTriangles += position.count / 3;
    box.union(boundsOf(mesh));
  });

  return {
    drawnMeshes,
    drawnTriangles: Math.round(drawnTriangles),
    drawnBounds: box.isEmpty()
      ? null
      : {
          min: [box.min.x, box.min.y, box.min.z],
          max: [box.max.x, box.max.y, box.max.z],
        },
  };
}

interface TileStats {
  queued: number;
  downloading: number;
  parsing: number;
  failed: number;
}

/** The renderer's own load counters, read defensively for the same reason. */
function statsOf(tiles: TilesRenderer): TileStats {
  const stats = (tiles as unknown as { stats?: Partial<TileStats> }).stats ?? {};
  return {
    queued: stats.queued ?? 0,
    downloading: stats.downloading ?? 0,
    parsing: stats.parsing ?? 0,
    failed: stats.failed ?? 0,
  };
}

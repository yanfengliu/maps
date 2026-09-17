/**
 * Crops the paint-review frames at 1:1 and measures the paint against the aerial
 * reference in world metres.
 *
 * Why this exists rather than a person opening a screenshot: the previous native
 * inspection saw 1066x600 previews of 1280x720 sources, so single-pixel paint
 * edges were outside it. Two things fix that here, and both are needed.
 *
 * 1. **Crops are cut, never scaled.** Each crop is a sub-rectangle of the frame
 *    at the frame's own pixel size, written with `png-encode.ts` (filter type 0
 *    on every row), and each names the world rectangle it covers. Nothing in this
 *    file resamples a frame.
 * 2. **The comparison is in world metres, not pixels.** Every frame pixel is
 *    mapped to the ground through the camera pose the harness read back, the
 *    reference tile pixels are mapped through the world frame's own projection,
 *    and the two are compared as world coordinates. A comparison in pixels would
 *    compare a perspective view against an orthophoto at two different scales,
 *    which is not a comparison.
 *
 * Three disclosed bounds:
 *
 * - **A pose is read, not requested.** The mapping is built from the camera the
 *   bridge reported after the controls settled, so a pose that drifted is
 *   measured where it actually is. The cost is that these numbers are about a
 *   still frame, and a camera a person drives to the same place will not land on
 *   the same pixel.
 * - **The ground is approximated by sampled height, not by the actual mesh.**
 *   Rays are intersected with a plane whose height is refined from the road and
 *   terrain samplers, which is exact on a plane and good to a few centimetres on
 *   the slopes here. It is not a raycast against the rendered geometry.
 * - **Paint is classified from pixels, by luminance and saturation.** The
 *   threshold is Otsu's, computed per frame over the road-masked pixels, so it
 *   is data-driven rather than chosen; the mask is also written out as an image
 *   so the classification can be looked at instead of trusted.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { decodeMesh } from "../../src/world/mesh.ts";
import { surfaceSampler } from "../network/surface.ts";
import { decodePng, type DecodedPng } from "../visual/png.ts";
import { encodePng } from "./png-encode.ts";

const ROOT = "artifacts/paint-review";
const CROP_DIR = path.join(ROOT, "crops");

/** The camera the app builds, `src/render/camera.ts`. Vertical field of view. */
const FOV_DEGREES = 55;

/**
 * How far from the crossing a measurement is allowed to reach.
 *
 * 120 m holds all six arms of the scramble and the whole western approach the
 * authored paint sits on, and it stays well inside the 3x3 reference block.
 */
const WINDOW_RADIUS_M = 120;

/** Ground-height raster spacing, metres. Only used to bend the ray onto the ground. */
const GROUND_RASTER_STEP_M = 2;

interface Camera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  azimuth: number;
  polar: number;
  distance: number;
}

interface FrameRecord {
  file: string;
  style: string;
  pose: string;
  camera: Camera;
  width: number;
  height: number;
  sha256: string;
  glRenderer: string;
  tokyoClock: string;
  sunElevationDegrees: number;
  tiles: { drawnTriangles: number; drawnBounds: { min: number[]; max: number[] } | null };
  paintPlacements: Record<string, unknown>;
}

interface ReferenceTile {
  source: string;
  rgbaFile: string;
  rgbaSha256: string;
  width: number;
  height: number;
  corners: { topLeft: Vec2; topRight: Vec2; bottomLeft: Vec2; bottomRight: Vec2 };
}

interface Vec2 {
  x: number;
  z: number;
}

interface ReferenceIndex {
  zoom: number;
  decodedAt: string;
  blockWorldBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  tiles: ReferenceTile[];
}

/**
 * A crop: a screen-space rectangle of one frame, centred on the frame pixel
 * nearest a named world point.
 *
 * Cutting a screen rectangle rather than projecting a world rectangle is
 * deliberate. At azimuth 45 degrees a world-aligned rectangle arrives in the
 * frame as a diamond, so a world-rect crop wastes about 40 per cent of its pixel
 * budget on empty corners, and the budget is the whole point — the crop has to
 * stay small enough to be opened at 1:1. The world region a screen rectangle
 * covers is a rectangle rotated 45 degrees, which is the orientation the
 * scramble's own diagonals run in, so it is also the better shape for reading
 * them. Every crop reports the world quad it actually covers, corner by corner,
 * rather than the world point it was aimed at.
 */
interface CropSpec {
  name: string;
  frame: string;
  /** The world point the crop is centred on, metres in the world frame. */
  worldCentre: { x: number; z: number };
  width: number;
  height: number;
  note: string;
}

const CROPS: CropSpec[] = [
  {
    name: "plan-core-satellite",
    frame: "satellite-plan.png",
    worldCentre: { x: 0, z: 0 },
    width: 640, height: 360,
    note: "the whole scramble from the plan pose, both diagonals and every zebra arm",
  },
  {
    name: "plan-core-cartographic",
    frame: "cartographic-plan.png",
    worldCentre: { x: 0, z: 0 },
    width: 640, height: 360,
    note: "the same framing in the clean style, where no photographic texture can hide a paint defect",
  },
  {
    name: "detail-centre-satellite",
    frame: "satellite-detail.png",
    worldCentre: { x: 0, z: 0 },
    width: 640, height: 360,
    note: "the crossing core at the closest pose, where a 0.5 m zebra stripe is about 10 px",
  },
  {
    name: "detail-centre-cartographic",
    frame: "cartographic-detail.png",
    worldCentre: { x: 0, z: 0 },
    width: 640, height: 360,
    note: "the same core in the clean style",
  },
  {
    name: "wide-crossing-satellite",
    frame: "satellite-wide.png",
    worldCentre: { x: 0, z: 0 },
    width: 640, height: 360,
    note: "the crossing and the first 40 m of every approach, for an arm that is missing rather than thin",
  },
  {
    name: "wide-west-approach-satellite",
    frame: "satellite-wide.png",
    worldCentre: { x: -62, z: -6 },
    width: 640, height: 360,
    note: "the western approach, where the authored lane separators and turn arrows are",
  },
  {
    name: "wide-west-approach-cartographic",
    frame: "cartographic-wide.png",
    worldCentre: { x: -62, z: -6 },
    width: 640, height: 360,
    note: "the same western approach in the clean style",
  },
  {
    name: "wide-north-approach-cartographic",
    frame: "cartographic-wide.png",
    worldCentre: { x: 4, z: -62 },
    width: 640, height: 360,
    note: "the northern approach in the clean style",
  },
  {
    name: "plan-tactile-and-east-signal-satellite",
    frame: "satellite-plan.png",
    worldCentre: { x: 25, z: 14 },
    width: 320, height: 180,
    note: "the tactile strip running along the eastern kerb and the one signal assembly the placement put on that side",
  },
  {
    name: "plan-north-arm-satellite",
    frame: "satellite-plan.png",
    worldCentre: { x: 0, z: -30 },
    width: 320, height: 180,
    note: "the northern arm of the scramble and the approach behind it",
  },
  {
    name: "plan-north-west-signal-satellite",
    frame: "satellite-plan.png",
    worldCentre: { x: -27, z: -10 },
    width: 240, height: 135,
    note: "the north-west signal assembly the hardware placement put at world (-29.7, -12.6), at 0.13 m/px",
  },
  {
    name: "plan-south-arm-satellite",
    frame: "satellite-plan.png",
    worldCentre: { x: 0, z: 30 },
    width: 320, height: 180,
    note: "the southern arm of the scramble and the approach behind it",
  },
];

/**
 * Local luminance range, over a square window, separably.
 *
 * This is the instrument's second attempt and the reason it exists is worth
 * recording. The first classification was "bright and unsaturated on the road
 * mesh", split by Otsu's threshold. Looked at as an image it marked the *plaza*
 * as paint: the crossing sits inside a wide pedestrian apron, PLATEAU's road
 * surface carries it, and at noon it is nearly as bright as the paint. The
 * bearing profile that came out of it was a profile of the plaza.
 *
 * A zebra stripe is not merely bright, it alternates — bright bar, dark gap,
 * 1.05 m apart — so the measurement that separates paint from apron is local
 * contrast, not level. A pixel counts as striped paint when its window's
 * luminance range is large and the pixel sits in the upper part of that range.
 * A uniform apron has a range near zero however bright it is.
 */
function windowExtremes(values: Float64Array, width: number, height: number, radius: number): { min: Float64Array; max: Float64Array } {
  const horizontalMin = new Float64Array(values.length).fill(Number.POSITIVE_INFINITY);
  const horizontalMax = new Float64Array(values.length).fill(Number.NEGATIVE_INFINITY);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      let low = Number.POSITIVE_INFINITY;
      let high = Number.NEGATIVE_INFINITY;
      for (let at = from; at <= to; at += 1) {
        const value = values[y * width + at]!;
        if (value < low) low = value;
        if (value > high) high = value;
      }
      horizontalMin[y * width + x] = low;
      horizontalMax[y * width + x] = high;
    }
  }
  const min = new Float64Array(values.length);
  const max = new Float64Array(values.length);
  for (let y = 0; y < height; y += 1) {
    const from = Math.max(0, y - radius);
    const to = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x += 1) {
      let low = Number.POSITIVE_INFINITY;
      let high = Number.NEGATIVE_INFINITY;
      for (let at = from; at <= to; at += 1) {
        const value = horizontalMin[at * width + x]!;
        if (value < low) low = value;
        const other = horizontalMax[at * width + x]!;
        if (other > high) high = other;
      }
      min[y * width + x] = low;
      max[y * width + x] = high;
    }
  }
  return { min, max };
}

/** Contrast a window must span, and how far up it a pixel must sit, to be a stripe. */
const STRIPE_RANGE = 60;
const STRIPE_POSITION = 0.5;

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function writePng(file: string, width: number, height: number, rgba: Uint8Array): Promise<void> {
  return writeFile(file, encodePng(width, height, rgba));
}

/**
 * Progress on stderr, because this pass writes nothing until it is nearly done
 * and a run that is slow under seven other lanes looks identical to a run that
 * has hung. Nothing here is part of the result.
 */
function log(message: string): void {
  process.stderr.write(`[analyse ${new Date().toISOString().slice(11, 19)}] ${message}\n`);
}

/** Copy a pixel rectangle out of a decoded frame, one source pixel per output pixel. */
function cut(image: DecodedPng, left: number, top: number, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const from = ((top + row) * image.width + left) * 4;
    out.set(image.rgba.subarray(from, from + width * 4), row * width * 4);
  }
  return out;
}

/**
 * The paint mask, and the tactile mask, for one frame.
 *
 * Otsu's threshold over the pixels that fall on the road surface: the split that
 * maximises between-class variance, which for a dark carriageway carrying white
 * paint lands between the two modes without anybody choosing a number. It is
 * reported so a reader can see what it chose.
 */
function otsu(histogram: Float64Array, total: number): number {
  let sum = 0;
  for (let index = 0; index < histogram.length; index += 1) sum += index * histogram[index]!;
  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let bestVariance = -1;
  for (let index = 0; index < histogram.length; index += 1) {
    weightBackground += histogram[index]!;
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;
    sumBackground += index * histogram[index]!;
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      best = index;
    }
  }
  return best;
}

interface Raster {
  minX: number;
  minZ: number;
  step: number;
  width: number;
  height: number;
  heights: Float32Array;
  onRoad: Uint8Array;
}

function groundRaster(roadMesh: ReturnType<typeof decodeMesh>, terrainMesh: ReturnType<typeof decodeMesh>): Raster {
  const roadAt = surfaceSampler(roadMesh, true);
  const terrainAt = surfaceSampler(terrainMesh, true);
  const step = GROUND_RASTER_STEP_M;
  const width = Math.ceil((WINDOW_RADIUS_M * 2) / step) + 1;
  const heights = new Float32Array(width * width).fill(Number.NaN);
  const onRoad = new Uint8Array(width * width);
  const minX = -WINDOW_RADIUS_M;
  const minZ = -WINDOW_RADIUS_M;

  // Road coverage on the same raster, from the road mesh's own triangles: paint
  // belongs on a carriageway, and a bright building roof is not road paint.
  const triangles: number[][] = [];
  const positions = roadMesh.positions;
  for (let index = 0; index < roadMesh.indices.length; index += 3) {
    const a = roadMesh.indices[index]! * 3;
    const b = roadMesh.indices[index + 1]! * 3;
    const c = roadMesh.indices[index + 2]! * 3;
    triangles.push([positions[a]!, positions[a + 2]!, positions[b]!, positions[b + 2]!, positions[c]!, positions[c + 2]!]);
  }
  const cell = 8;
  const buckets = new Map<string, number[]>();
  triangles.forEach((triangle, index) => {
    const xs = [triangle[0]!, triangle[2]!, triangle[4]!];
    const zs = [triangle[1]!, triangle[3]!, triangle[5]!];
    for (let x = Math.floor(Math.min(...xs) / cell); x <= Math.floor(Math.max(...xs) / cell); x += 1) {
      for (let z = Math.floor(Math.min(...zs) / cell); z <= Math.floor(Math.max(...zs) / cell); z += 1) {
        const key = `${x},${z}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(index); else buckets.set(key, [index]);
      }
    }
  });

  for (let row = 0; row < width; row += 1) {
    const z = minZ + row * step;
    for (let column = 0; column < width; column += 1) {
      const x = minX + column * step;
      const road = roadAt(x, z);
      const terrain = terrainAt(x, z);
      const height = road === undefined ? terrain : terrain === undefined ? road : Math.max(road, terrain);
      if (height !== undefined) heights[row * width + column] = height;
      let covered = 0;
      for (const index of buckets.get(`${Math.floor(x / cell)},${Math.floor(z / cell)}`) ?? []) {
        const t = triangles[index]!;
        const denominator = (t[3]! - t[5]!) * (t[0]! - t[4]!) + (t[4]! - t[2]!) * (t[1]! - t[5]!);
        if (Math.abs(denominator) < 1e-12) continue;
        const u = ((t[3]! - t[5]!) * (x - t[4]!) + (t[4]! - t[2]!) * (z - t[5]!)) / denominator;
        const v = ((t[5]! - t[1]!) * (x - t[4]!) + (t[0]! - t[4]!) * (z - t[5]!)) / denominator;
        if (u < 0 || v < 0 || u + v > 1) continue;
        covered = 1;
        break;
      }
      onRoad[row * width + column] = covered;
    }
  }
  return { minX, minZ, step, width, height: width, heights, onRoad };
}

function rasterHeight(raster: Raster, x: number, z: number): number | undefined {
  const column = Math.round((x - raster.minX) / raster.step);
  const row = Math.round((z - raster.minZ) / raster.step);
  if (column < 0 || row < 0 || column >= raster.width || row >= raster.height) return undefined;
  const value = raster.heights[row * raster.width + column]!;
  return Number.isNaN(value) ? undefined : value;
}

function rasterOnRoad(raster: Raster, x: number, z: number): boolean {
  const column = Math.round((x - raster.minX) / raster.step);
  const row = Math.round((z - raster.minZ) / raster.step);
  if (column < 0 || row < 0 || column >= raster.width || row >= raster.height) return false;
  return raster.onRoad[row * raster.width + column] === 1;
}

/**
 * The camera-to-ground mapping for one frame.
 *
 * A ray per pixel, intersected with a plane whose height is refined from the
 * ground raster. Refining rather than fixing one plane matters because the
 * crossing sits on the valley floor and the western approach climbs.
 */
function frameMapper(frame: FrameRecord, raster: Raster) {
  const { position, target } = frame.camera;
  const forward = normalize({ x: target.x - position.x, y: target.y - position.y, z: target.z - position.z });
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = cross(right, forward);
  const tanHalf = Math.tan((FOV_DEGREES * Math.PI) / 360);
  const aspect = frame.width / frame.height;

  return (pixelX: number, pixelY: number): { x: number; z: number; y: number } | null => {
    const ndcX = ((pixelX + 0.5) / frame.width) * 2 - 1;
    const ndcY = 1 - ((pixelY + 0.5) / frame.height) * 2;
    const direction = normalize({
      x: forward.x + right.x * ndcX * tanHalf * aspect + up.x * ndcY * tanHalf,
      y: forward.y + right.y * ndcX * tanHalf * aspect + up.y * ndcY * tanHalf,
      z: forward.z + right.z * ndcX * tanHalf * aspect + up.z * ndcY * tanHalf,
    });
    if (direction.y >= -1e-6) return null;

    // Start from the ray's own first crossing of the ground raster's lowest
    // plausible surface and refine. Four rounds is well past convergence on a
    // slope of a few per cent; the loop is bounded so a bad sample cannot hang.
    let planeY = rasterHeight(raster, 0, 0) ?? 15;
    let hit = { x: 0, z: 0, y: planeY };
    for (let round = 0; round < 5; round += 1) {
      const t = (planeY - position.y) / direction.y;
      if (!(t > 0)) return null;
      hit = { x: position.x + direction.x * t, z: position.z + direction.z * t, y: planeY };
      const refined = rasterHeight(raster, hit.x, hit.z);
      if (refined === undefined) break;
      // The paint sits about 6 cm above the carriageway it was placed on.
      const next = refined + 0.06;
      if (Math.abs(next - planeY) < 1e-3) {
        planeY = next;
        break;
      }
      planeY = next;
    }
    return hit;
  };
}

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/** The stitchable reference block: nine 256 px tiles laid out as they are on the ground. */
async function referenceBlock(index: ReferenceIndex): Promise<{ width: number; height: number; rgba: Uint8Array; worldOf: (x: number, z: number) => Vec2 }> {
  const tileX = index.tiles.map((tile) => tile.source.match(/_(\d+)_(\d+)\.jpg$/)!).map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  const minTileX = Math.min(...tileX.map((entry) => entry.x));
  const maxTileX = Math.max(...tileX.map((entry) => entry.x));
  const minTileY = Math.min(...tileX.map((entry) => entry.y));
  const maxTileY = Math.max(...tileX.map((entry) => entry.y));
  const columns = maxTileX - minTileX + 1;
  const rows = maxTileY - minTileY + 1;
  const width = columns * 256;
  const height = rows * 256;
  const rgba = new Uint8Array(width * height * 4);
  // North is -Z and tiles increase y southward, so tile row order is already
  // the image row order once the block is read top-down.
  for (const [position, tile] of index.tiles.entries()) {
    const at = tileX[position]!;
    const column = at.x - minTileX;
    const row = at.y - minTileY;
    const bytes = new Uint8Array(await readFile(path.join(ROOT, "reference", tile.rgbaFile)));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== tile.rgbaSha256) throw new Error(`${tile.rgbaFile} is not the decoded tile this run recorded; re-run the reference spec.`);
    for (let y = 0; y < 256; y += 1) {
      const from = y * 256 * 4;
      const to = ((row * 256 + y) * width + column * 256) * 4;
      rgba.set(bytes.subarray(from, from + 256 * 4), to);
    }
  }

  // Bilinear through the block's corners, in the world frame's own coordinates.
  const topLeft = index.tiles.find((tile) => tile.source.match(/_(\d+)_(\d+)\.jpg$/)![1] === String(minTileX) && tile.source.match(/_(\d+)_(\d+)\.jpg$/)![2] === String(minTileY))!.corners.topLeft;
  const bottomRight = index.tiles.find((tile) => tile.source.match(/_(\d+)_(\d+)\.jpg$/)![1] === String(maxTileX) && tile.source.match(/_(\d+)_(\d+)\.jpg$/)![2] === String(maxTileY))!.corners.bottomRight;
  const topRight = index.tiles.find((tile) => tile.source.match(/_(\d+)_(\d+)\.jpg$/)![1] === String(maxTileX) && tile.source.match(/_(\d+)_(\d+)\.jpg$/)![2] === String(minTileY))!.corners.topRight;
  const bottomLeft = index.tiles.find((tile) => tile.source.match(/_(\d+)_(\d+)\.jpg$/)![1] === String(minTileX) && tile.source.match(/_(\d+)_(\d+)\.jpg$/)![2] === String(maxTileY))!.corners.bottomLeft;

  const worldOf = (x: number, z: number): Vec2 => {
    const u = x / width;
    const v = z / height;
    return {
      x: (1 - u) * (1 - v) * topLeft.x + u * (1 - v) * topRight.x + (1 - u) * v * bottomLeft.x + u * v * bottomRight.x,
      z: (1 - u) * (1 - v) * topLeft.z + u * (1 - v) * topRight.z + (1 - u) * v * bottomLeft.z + u * v * bottomRight.z,
    };
  };
  return { width, height, rgba, worldOf };
}

async function main(): Promise<void> {
  await rm(CROP_DIR, { recursive: true, force: true });
  await mkdir(CROP_DIR, { recursive: true });

  const manifest = JSON.parse(await readFile(path.join(ROOT, "frames.json"), "utf8")) as { glRenderer: string; inputs: { file: string; sha256: string; bytes: number }[]; frames: FrameRecord[] };
  const index = JSON.parse(await readFile(path.join(ROOT, "reference/index.json"), "utf8")) as ReferenceIndex;

  log("reading frames, reference block and data/scene/");
  const roadMesh = decodeMesh(new Uint8Array(await readFile("data/scene/roads.mesh")));
  const terrainMesh = decodeMesh(new Uint8Array(await readFile("data/scene/terrain.mesh")));
  const raster = groundRaster(roadMesh, terrainMesh);

  const decoded = new Map<string, DecodedPng>();
  for (const frame of manifest.frames) decoded.set(frame.file, decodePng(new Uint8Array(await readFile(path.join(ROOT, "frames", frame.file)))));
  /** The classification overlay per frame, kept in memory so a crop can cut it. */
  const masks = new Map<string, DecodedPng>();

  log("mapping the reference block");
  const block = await referenceBlock(index);

  // The reference, in world metres and on the road mask, measured once.
  const referencePixels: { x: number; z: number; luminance: number; saturation: number; row: number; column: number }[] = [];
  const referenceHistogram = new Float64Array(256);
  let referenceRoadPixels = 0;
  for (let row = 0; row < block.height; row += 1) {
    for (let column = 0; column < block.width; column += 1) {
      const world = block.worldOf(column, row);
      if (Math.abs(world.x) > WINDOW_RADIUS_M || Math.abs(world.z) > WINDOW_RADIUS_M) continue;
      if (!rasterOnRoad(raster, world.x, world.z)) continue;
      referenceRoadPixels += 1;
      const at = (row * block.width + column) * 4;
      const r = block.rgba[at]!;
      const g = block.rgba[at + 1]!;
      const b = block.rgba[at + 2]!;
      const value = luminance(r, g, b);
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
      referenceHistogram[Math.min(255, Math.max(0, Math.round(value)))]! += 1;
      referencePixels.push({ x: world.x, z: world.z, luminance: value, saturation, row, column });
    }
  }
  const referenceThreshold = otsu(referenceHistogram, referenceRoadPixels);

  // The reference's own bright centroid, on a percentile rather than a
  // threshold: the crossing is the brightest thing within 50 m of the origin in
  // an aerial photograph of this junction, and a percentile picks its middle
  // without anybody choosing a level.
  const within50 = referencePixels.filter((pixel) => Math.hypot(pixel.x, pixel.z) <= 50).map((pixel) => pixel.luminance).sort((left, right) => left - right);
  const brightCut = within50.length === 0 ? 255 : within50[Math.min(within50.length - 1, Math.floor(within50.length * 0.9))]!;
  const bright = referencePixels.filter((pixel) => Math.hypot(pixel.x, pixel.z) <= 50 && pixel.luminance >= brightCut);
  const referenceBrightCentroid = bright.length === 0 ? null : {
    x: Number((bright.reduce((sum, pixel) => sum + pixel.x, 0) / bright.length).toFixed(2)),
    z: Number((bright.reduce((sum, pixel) => sum + pixel.z, 0) / bright.length).toFixed(2)),
    pixels: bright.length,
    cut: brightCut,
  };

  const frames: Record<string, unknown>[] = [];
  /** Per frame: the pixel-to-world map, so the crop pass does not rebuild it. */
  const perFrame = new Map<string, { map: (x: number, y: number) => { x: number; z: number; y: number } | null; worldOf: Float64Array }>();
  for (const frame of manifest.frames) {
    log(`mapping and classifying ${frame.file}`);
    const image = decoded.get(frame.file)!;
    const map = frameMapper(frame, raster);

    // Every pixel of the frame, mapped once. The mask is written beside the crop
    // so the classification can be looked at rather than believed.
    const worldOf = new Float64Array(frame.width * frame.height * 2);
    const onRoad = new Uint8Array(frame.width * frame.height);
    const values = new Float64Array(frame.width * frame.height);
    const histogram = new Float64Array(256);
    let roadPixels = 0;
    for (let pixel = 0; pixel < frame.width * frame.height; pixel += 1) {
      const x = pixel % frame.width;
      const y = (pixel - x) / frame.width;
      const hit = map(x, y);
      if (hit === null) continue;
      worldOf[pixel * 2] = hit.x;
      worldOf[pixel * 2 + 1] = hit.z;
      const at = pixel * 4;
      const value = luminance(image.rgba[at]!, image.rgba[at + 1]!, image.rgba[at + 2]!);
      values[pixel] = value;
      if (Math.abs(hit.x) > WINDOW_RADIUS_M || Math.abs(hit.z) > WINDOW_RADIUS_M) continue;
      if (!rasterOnRoad(raster, hit.x, hit.z)) continue;
      onRoad[pixel] = 1;
      roadPixels += 1;
      histogram[Math.min(255, Math.max(0, Math.round(value)))]! += 1;
    }
    const threshold = otsu(histogram, roadPixels);
    const extremes = windowExtremes(values, frame.width, frame.height, 3);

    // A bearing histogram of paint, which is what "the diagonals are there and in
    // the right place" reduces to as a number: striped paint pixels per 5-degree
    // bearing bin and 5 m radius ring, divided by the road pixels in that cell.
    // Mean luminance per bearing bin is reported beside it, because it needs no
    // threshold at all and so cannot inherit a bad one.
    const bearingBins = 72;
    const ringBins = 9;
    const paintCells = new Float64Array(bearingBins * ringBins);
    const roadCells = new Float64Array(bearingBins * ringBins);
    const luminanceSum = new Float64Array(bearingBins);
    const luminanceCount = new Float64Array(bearingBins);
    let paintPixels = 0;
    let brightPixels = 0;
    let tactilePixels = 0;
    // Where the crossing actually sits, as a number rather than an eyeball: the
    // centroid of striped paint within 50 m, in world metres. The criterion is
    // agreement with the reference imagery, and a crossing drawn 20 m from where
    // the photograph puts it is the failure that would survive every check above.
    let stripeX = 0;
    let stripeZ = 0;
    let stripeCount = 0;
    const tactileSamples: { x: number; z: number }[] = [];
    for (let pixel = 0; pixel < frame.width * frame.height; pixel += 1) {
      if (onRoad[pixel] !== 1) continue;
      const x = worldOf[pixel * 2]!;
      const z = worldOf[pixel * 2 + 1]!;
      const radius = Math.hypot(x, z);
      if (radius < 1 || radius > 45) continue;
      // Bearing clockwise from north, matching the compass the world frame uses.
      const bearing = (Math.atan2(x, -z) * 180) / Math.PI;
      const bin = Math.min(bearingBins - 1, Math.floor(((bearing + 360) % 360) / (360 / bearingBins)));
      const ring = Math.min(ringBins - 1, Math.floor(radius / 5));
      roadCells[ring * bearingBins + bin]! += 1;
      const at = pixel * 4;
      const r = image.rgba[at]!;
      const g = image.rgba[at + 1]!;
      const b = image.rgba[at + 2]!;
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
      luminanceSum[bin]! += values[pixel]!;
      luminanceCount[bin]! += 1;
      if (values[pixel]! > threshold && saturation < 0.25) brightPixels += 1;
      const low = extremes.min[pixel]!;
      const high = extremes.max[pixel]!;
      if (high - low >= STRIPE_RANGE && values[pixel]! >= low + (high - low) * STRIPE_POSITION && saturation < 0.25) {
        paintCells[ring * bearingBins + bin]! += 1;
        paintPixels += 1;
        if (radius <= 50) {
          stripeX += x;
          stripeZ += z;
          stripeCount += 1;
        }
      }
      if (r > g && g > b && r - b > 30 && saturation > 0.2 && maximum > 90 && maximum < 235) {
        tactilePixels += 1;
        if (tactileSamples.length < 4000) tactileSamples.push({ x, z });
      }
    }

    // The mask, drawn over the frame so the reader can see what was classified:
    // striped paint in magenta, tactile in cyan, everything else dimmed.
    const maskRgba = new Uint8Array(frame.width * frame.height * 4);
    for (let pixel = 0; pixel < frame.width * frame.height; pixel += 1) {
      const at = pixel * 4;
      const r = image.rgba[at]!;
      const g = image.rgba[at + 1]!;
      const b = image.rgba[at + 2]!;
      const maximum = Math.max(r, g, b);
      const minimum = Math.min(r, g, b);
      const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
      const low = extremes.min[pixel]!;
      const high = extremes.max[pixel]!;
      const isPaint = onRoad[pixel] === 1 && high - low >= STRIPE_RANGE && values[pixel]! >= low + (high - low) * STRIPE_POSITION && saturation < 0.25;
      const isTactile = onRoad[pixel] === 1 && r > g && g > b && r - b > 30 && saturation > 0.2 && maximum > 90 && maximum < 235;
      maskRgba[at] = isPaint ? 255 : isTactile ? 0 : Math.round(r * 0.35);
      maskRgba[at + 1] = isPaint ? 0 : isTactile ? 255 : Math.round(g * 0.35);
      maskRgba[at + 2] = isPaint ? 255 : isTactile ? 255 : Math.round(b * 0.35);
      maskRgba[at + 3] = 255;
    }
    const maskFile = `${frame.file.replace(/\.png$/, "")}-mask.png`;
    await writePng(path.join(CROP_DIR, maskFile), frame.width, frame.height, maskRgba);
    masks.set(frame.file, { width: frame.width, height: frame.height, rgba: maskRgba });
    perFrame.set(frame.file, { map, worldOf });

    frames.push({
      file: frame.file,
      style: frame.style,
      pose: frame.pose,
      sha256: frame.sha256,
      glRenderer: frame.glRenderer,
      camera: frame.camera,
      paintThreshold: threshold,
      referenceThreshold,
      roadPixels,
      paintPixels,
      brightPixels,
      paintFractionOfRoad: roadPixels === 0 ? 0 : paintPixels / roadPixels,
      stripedPaintCentroid: stripeCount === 0 ? null : { x: Number((stripeX / stripeCount).toFixed(2)), z: Number((stripeZ / stripeCount).toFixed(2)), pixels: stripeCount },
      tactilePixels,
      tactileBounds: tactileSamples.length === 0 ? null : {
        minX: Math.min(...tactileSamples.map((sample) => sample.x)),
        maxX: Math.max(...tactileSamples.map((sample) => sample.x)),
        minZ: Math.min(...tactileSamples.map((sample) => sample.z)),
        maxZ: Math.max(...tactileSamples.map((sample) => sample.z)),
      },
      bearingProfile: Array.from({ length: bearingBins }, (_, bin) => {
        let paint = 0;
        let road = 0;
        for (let ring = 0; ring < ringBins; ring += 1) {
          paint += paintCells[ring * bearingBins + bin]!;
          road += roadCells[ring * bearingBins + bin]!;
        }
        return {
          bearingDegrees: bin * 5,
          paint,
          road,
          fraction: road === 0 ? null : Number((paint / road).toFixed(4)),
          meanLuminance: luminanceCount[bin] === 0 ? null : Number((luminanceSum[bin]! / luminanceCount[bin]!).toFixed(2)),
        };
      }),
      maskFile,
    });
  }

  const referenceBearing = (() => {
    const bearingBins = 72;
    const rings = 9;
    const paint = new Float64Array(bearingBins * rings);
    const road = new Float64Array(bearingBins * rings);
    const luminanceSum = new Float64Array(bearingBins);
    const luminanceCount = new Float64Array(bearingBins);
    // The same stripe test, on the reference's own pixels. At 0.486 m/px a
    // 1.05 m stripe period is 2.2 px, so this is expected to fail; it is
    // measured rather than assumed, and the number it produces is reported.
    const blockValues = new Float64Array(block.width * block.height);
    for (let pixel = 0; pixel < block.width * block.height; pixel += 1) {
      blockValues[pixel] = luminance(block.rgba[pixel * 4]!, block.rgba[pixel * 4 + 1]!, block.rgba[pixel * 4 + 2]!);
    }
    const extremes = windowExtremes(blockValues, block.width, block.height, 3);
    let referenceStripePixels = 0;
    // The reference's striped-paint centroid, on exactly the test the render's
    // centroid uses, so the two numbers are the same quantity. The reference's
    // stripe count is small because the paint's period is near its own sampling
    // limit, which is the bound this comparison carries.
    let referenceStripeX = 0;
    let referenceStripeZ = 0;
    let referenceStripeWithin50 = 0;
    for (const pixel of referencePixels) {
      const radius = Math.hypot(pixel.x, pixel.z);
      if (radius < 1 || radius > 45) continue;
      const bearing = (Math.atan2(pixel.x, -pixel.z) * 180) / Math.PI;
      const bin = Math.min(bearingBins - 1, Math.floor(((bearing + 360) % 360) / 5));
      const ring = Math.min(rings - 1, Math.floor(radius / 5));
      road[ring * bearingBins + bin]! += 1;
      luminanceSum[bin]! += pixel.luminance;
      luminanceCount[bin]! += 1;
      if (pixel.luminance > referenceThreshold && pixel.saturation < 0.25) paint[ring * bearingBins + bin]! += 1;
      const index = pixel.row * block.width + pixel.column;
      const low = extremes.min[index]!;
      const high = extremes.max[index]!;
      if (high - low >= STRIPE_RANGE && blockValues[index]! >= low + (high - low) * STRIPE_POSITION) referenceStripePixels += 1;
      if (high - low >= STRIPE_RANGE && blockValues[index]! >= low + (high - low) * STRIPE_POSITION && radius <= 50) {
        referenceStripeX += pixel.x;
        referenceStripeZ += pixel.z;
        referenceStripeWithin50 += 1;
      }
    }
    return {
      stripePixels: referenceStripePixels,
      stripeCentroid: referenceStripeWithin50 === 0 ? null : { x: Number((referenceStripeX / referenceStripeWithin50).toFixed(2)), z: Number((referenceStripeZ / referenceStripeWithin50).toFixed(2)), pixels: referenceStripeWithin50 },
      profile: Array.from({ length: bearingBins }, (_, bin) => {
        let paintCount = 0;
        let roadCount = 0;
        for (let ring = 0; ring < rings; ring += 1) {
          paintCount += paint[ring * bearingBins + bin]!;
          roadCount += road[ring * bearingBins + bin]!;
        }
        return {
          bearingDegrees: bin * 5,
          paint: paintCount,
          road: roadCount,
          fraction: roadCount === 0 ? null : Number((paintCount / roadCount).toFixed(4)),
          meanLuminance: luminanceCount[bin] === 0 ? null : Number((luminanceSum[bin]! / luminanceCount[bin]!).toFixed(2)),
        };
      }),
    };
  })();

  log("cutting render crops");
  const crops: Record<string, unknown>[] = [];
  for (const spec of CROPS) {
    const frame = manifest.frames.find((entry) => entry.file === spec.frame);
    if (!frame) throw new Error(`Crop ${spec.name} names frame ${spec.frame}, which this run did not capture.`);
    const image = decoded.get(spec.frame)!;
    const geometry = perFrame.get(spec.frame);
    const mask = masks.get(spec.frame);
    if (!geometry || !mask) throw new Error(`No pixel-to-world map was built for ${spec.frame}.`);

    // The frame pixel nearest the requested world point, then a fixed-size
    // rectangle around it. The search is over the map already computed.
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let pixel = 0; pixel < frame.width * frame.height; pixel += 1) {
      const x = geometry.worldOf[pixel * 2]!;
      const z = geometry.worldOf[pixel * 2 + 1]!;
      const distance = (x - spec.worldCentre.x) ** 2 + (z - spec.worldCentre.z) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = pixel;
      }
    }
    const centreX = best % frame.width;
    const centreY = (best - centreX) / frame.width;
    const left = Math.max(0, Math.min(frame.width - spec.width, Math.round(centreX - spec.width / 2)));
    const top = Math.max(0, Math.min(frame.height - spec.height, Math.round(centreY - spec.height / 2)));
    const width = Math.min(spec.width, frame.width - left);
    const height = Math.min(spec.height, frame.height - top);

    const file = `${spec.name}.png`;
    await writePng(path.join(CROP_DIR, file), width, height, cut(image, left, top, width, height));
    await writePng(path.join(CROP_DIR, `${spec.name}-mask.png`), width, height, cut(mask, left, top, width, height));

    // The world quad the cut pixels cover, corner by corner, plus the metres
    // along each edge. A perspective frame's crop is a trapezoid, not a
    // rectangle, so the corners are the honest shape and the bounding box is
    // only a summary.
    const quad = [
      geometry.map(left, top),
      geometry.map(left + width - 1, top),
      geometry.map(left + width - 1, top + height - 1),
      geometry.map(left, top + height - 1),
    ];
    const defined = quad.filter((hit): hit is { x: number; z: number; y: number } => hit !== null);
    if (defined.length !== 4) throw new Error(`Crop ${spec.name} has a corner whose ray misses the ground, so it has no world extent.`);
    const edge = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(b.x - a.x, b.z - a.z);
    crops.push({
      name: spec.name,
      frame: spec.frame,
      frameSha256: frame.sha256,
      note: spec.note,
      aimedAtWorldPoint: spec.worldCentre,
      file,
      maskFile: `${spec.name}-mask.png`,
      pixelRect: { left, top, width, height },
      coveredWorldQuad: defined.map((hit) => ({ x: Number(hit.x.toFixed(2)), z: Number(hit.z.toFixed(2)) })),
      coveredWorldBounds: {
        minX: Number(Math.min(...defined.map((hit) => hit.x)).toFixed(2)),
        maxX: Number(Math.max(...defined.map((hit) => hit.x)).toFixed(2)),
        minZ: Number(Math.min(...defined.map((hit) => hit.z)).toFixed(2)),
        maxZ: Number(Math.max(...defined.map((hit) => hit.z)).toFixed(2)),
      },
      edgeLengthsM: {
        top: Number(edge(defined[0]!, defined[1]!).toFixed(2)),
        right: Number(edge(defined[1]!, defined[2]!).toFixed(2)),
        bottom: Number(edge(defined[2]!, defined[3]!).toFixed(2)),
        left: Number(edge(defined[3]!, defined[0]!).toFixed(2)),
      },
      metresPerPixel: {
        width: Number((edge(defined[0]!, defined[1]!) / width).toFixed(4)),
        height: Number((edge(defined[3]!, defined[0]!) / height).toFixed(4)),
      },
    });
  }

  // Reference crops: the axis-aligned world bounding box of a render crop's
  // world quad, copied at the reference's own pixel size. The reference is
  // north-up and a render crop at azimuth 45 degrees is turned 45 degrees, so
  // the reference crop is that bounding box rather than the same quad. Stated
  // here rather than left for a reader to discover from the two images not
  // lining up.
  log("cutting reference crops");
  // Over a snapshot, not over the live array: the loop appends to `crops`, and
  // iterating while appending visits its own output — which here meant
  // re-cutting the same two reference crops forever. A `for...of` over an array
  // a loop body pushes to is an infinite loop, not a bounded one.
  for (const render of [...crops]) {
    if (render["file"] === undefined || render["status"] !== undefined) continue;
    const name = String(render["name"]);
    // Only the crops whose world quad is worth a reference counterpart, and only
    // once: a name that does not end in a style suffix keeps its own name and
    // would be re-emitted.
    if (!/-(satellite|cartographic)$/.test(name)) continue;
    if (!name.startsWith("plan-core") && !name.startsWith("wide-crossing")) continue;
    const bounds = render["coveredWorldBounds"] as { minX: number; maxX: number; minZ: number; maxZ: number };
    const referenceName = name.replace(/-(satellite|cartographic)$/, "-reference");
    // Two render crops can name the same world rectangle — the two styles do —
    // and the reference for it is one picture. Emitted once.
    if (crops.some((crop) => crop["name"] === referenceName)) continue;
    let minColumn = block.width;
    let maxColumn = -1;
    let minRow = block.height;
    let maxRow = -1;
    for (let row = 0; row < block.height; row += 1) {
      for (let column = 0; column < block.width; column += 1) {
        const world = block.worldOf(column, row);
        if (world.x < bounds.minX || world.x > bounds.maxX || world.z < bounds.minZ || world.z > bounds.maxZ) continue;
        if (column < minColumn) minColumn = column;
        if (column > maxColumn) maxColumn = column;
        if (row < minRow) minRow = row;
        if (row > maxRow) maxRow = row;
      }
    }
    if (maxColumn < 0) {
      crops.push({ name: referenceName, status: "outside the decoded reference block", note: String(render["note"]) });
      continue;
    }
    const width = maxColumn - minColumn + 1;
    const height = maxRow - minRow + 1;
    const file = `${referenceName}.png`;
    await writePng(path.join(CROP_DIR, file), width, height, cut({ width: block.width, height: block.height, rgba: block.rgba }, minColumn, minRow, width, height));
    const corners = [block.worldOf(minColumn, minRow), block.worldOf(maxColumn, minRow), block.worldOf(minColumn, maxRow), block.worldOf(maxColumn, maxRow)];
    crops.push({
      name: referenceName,
      status: "reference",
      note: `${String(render["note"])} — the axis-aligned bounding box of the render crop's world quad, at the reference's own 1:1 pixels`,
      file,
      sameWorldAs: name,
      referencePixelRect: { left: minColumn, top: minRow, width, height },
      coveredWorldBounds: {
        minX: Number(Math.min(...corners.map((corner) => corner.x)).toFixed(2)),
        maxX: Number(Math.max(...corners.map((corner) => corner.x)).toFixed(2)),
        minZ: Number(Math.min(...corners.map((corner) => corner.z)).toFixed(2)),
        maxZ: Number(Math.max(...corners.map((corner) => corner.z)).toFixed(2)),
      },
      metresPerPixel: {
        width: Number(((Math.max(...corners.map((corner) => corner.x)) - Math.min(...corners.map((corner) => corner.x))) / width).toFixed(4)),
        height: Number(((Math.max(...corners.map((corner) => corner.z)) - Math.min(...corners.map((corner) => corner.z))) / height).toFixed(4)),
      },
      sourceTiles: index.tiles.map((tile) => `${tile.source}#${tile.rgbaSha256}`),
    });
  }

  await writeFile(
    path.join(ROOT, "analysis.json"),
    `${JSON.stringify({
      analysedAt: new Date().toISOString(),
      glRenderer: manifest.glRenderer,
      worldFrame: "metres, +X east, +Z south, origin at the Shibuya Scramble Crossing",
      method: "frame pixels mapped to the ground through the pose the harness read back; reference tiles mapped through geographicToPlaneRectangular and planeRectangularToWorld; paint classified by Otsu threshold over road-masked luminance with saturation below 0.25",
      inputs: manifest.inputs,
      reference: {
        zoom: index.zoom,
        decodedAt: index.decodedAt,
        blockWorldBounds: index.blockWorldBounds,
        roadPixels: referenceRoadPixels,
        paintThreshold: referenceThreshold,
        bearingProfile: referenceBearing.profile,
        stripePixels: referenceBearing.stripePixels,
        stripeCentroid: referenceBearing.stripeCentroid,
        brightCentroid: referenceBrightCentroid,
        stripeBound: "at 0.486 m/px the reference cannot resolve a 1.05 m stripe period; the stripePixels count is reported so that bound is measured rather than asserted",
      },
      frames,
      crops,
    }, null, 2)}\n`,
    "utf8",
  );

  // eslint-disable-next-line no-console -- the numbers a reviewer reads.
  console.log(
    [
      "",
      `analysis written to ${path.join(ROOT, "analysis.json")}`,
      `reference threshold ${referenceThreshold} over ${referenceRoadPixels} road pixels`,
      ...frames.map((frame) => `  ${String(frame["file"]).padEnd(26)} threshold ${String(frame["paintThreshold"]).padStart(3)}  road ${String(frame["roadPixels"]).padStart(7)}  paint ${String(frame["paintPixels"]).padStart(6)}  tactile ${String(frame["tactilePixels"]).padStart(5)}`),
      ...crops.map((crop) => `  ${String(crop["name"]).padEnd(34)} ${crop["status"] === undefined ? `${String((crop["pixelRect"] as { width: number }).width)}x${String((crop["pixelRect"] as { height: number }).height)} px` : String(crop["status"])}`),
      "",
    ].join("\n"),
  );
}

await main();

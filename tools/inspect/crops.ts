/**
 * Crops one captured frame into named 1:1 rectangles and writes a manifest that
 * binds each crop's bytes to the frame it was cut from.
 *
 * Why this exists: the inspection of the 44 verdict frames was taken through an
 * image path that reports 1280x720 but returns a 1066x600 preview, so
 * single-pixel judgement sat below native resolution and the report says so in
 * its own bounds. The paint lane got past the same bound by cutting crops and
 * confirming each came back at the size it was written at; this is that
 * instrument, generic over any captured frame rather than over one lane's poses.
 *
 * Three things make a crop evidence rather than a picture:
 *
 * 1. **Nothing is resampled.** A crop is a sub-rectangle of the decoded frame,
 *    copied pixel for pixel, and the writer asserts the PNG it wrote decodes
 *    back to the rectangle it came from. `--tile-check` goes further and
 *    reassembles the whole frame from the crops; if that comes back
 *    byte-identical to the source, the slicing and the encoder are both exact.
 * 2. **Region names describe screen rectangles, not scene materials.** A box
 *    named near-pavement or left-ground can contain roofs, facades or sky at
 *    another pose. Classify the pixels themselves; a crop label is not evidence
 *    of what material was drawn. The six rectangles tile a 1280x720 frame.
 * 3. **The manifest carries the digest.** Each crop's SHA-256 is recorded beside
 *    the frame's, so a review can be bound to the bytes it inspected and
 *    regenerating the crops strands that review instead of inheriting it.
 *
 * What it deliberately is not: it does not read the scene, the camera or the
 * app. A scale note is derived only from a camera pose that is either given on
 * the command line or looked up from a captured frame's own known pose, and when
 * there is no pose the manifest says so rather than guessing.
 *
 * Bounds: it decodes with `tools/visual/png.ts`, so 8-bit non-interlaced
 * greyscale, greyscale+alpha, RGB and RGBA only — what Chromium writes for
 * `page.screenshot()`. Anything else throws by name from that reader.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

// The reader the visual gate already uses, called rather than copied. Reading
// `tools/visual/**` does not change it, so nothing here can disturb a run that
// is digesting that directory.
import { decodePng, measureFrame, type DecodedPng } from "../visual/png.ts";
import { encodePng } from "../paint-review/png-encode.ts";

/** The capture viewport every verdict frame is written at (`tools/visual/shots.ts`). */
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
/**
 * The largest image this will decode, at 16x the capture.
 *
 * A decompression bomb, not a shape check: a frame of the wrong shape is a
 * different refusal with a different fix. 16x is above any plausible screenshot
 * and far below a size that would exhaust memory inflating one.
 */
const FRAME_PIXEL_BUDGET = 16 * FRAME_WIDTH * FRAME_HEIGHT;

/** `src/render/camera.ts` builds the app's camera at this vertical field of view. */
const DEFAULT_FOV_DEGREES = 55;

/** `GROUND_AT_ORIGIN_M` in `src/world/scene-data.ts`: metres above Tokyo Bay at the crossing. */
const GROUND_AT_ORIGIN_M = 15.2;

function fail(message: string): never {
  throw new Error(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Repository root, so a relative `--frame` means the same thing from any cwd. */
function repoRoot(): string {
  return path.resolve(import.meta.dirname, "..", "..");
}

function resolveFromRoot(candidate: string): string {
  return path.isAbsolute(candidate) ? candidate : path.join(repoRoot(), candidate);
}

function displayPath(candidate: string): string {
  const relative = path.relative(repoRoot(), candidate);
  return relative === "" || relative.startsWith("..") ? candidate : relative.replaceAll("\\", "/");
}

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

interface Region {
  /** What an inspector looks at, and the name the crop file carries. */
  name: string;
  /** Pixels in the 1280x720 capture frame. */
  rect: { left: number; top: number; width: number; height: number };
  /** One line saying what this rectangle is for, copied into the manifest. */
  note: string;
}

/**
 * The grid the regions come out of, in pixels of the 1280x720 capture frame.
 *
 * Three bands and three columns, and every region below is a rectangle of whole
 * cells. Writing the rectangles as cell ranges rather than as freehand numbers
 * is not tidiness: the first draft of this set was freehand, two regions shared
 * a cell, one cell belonged to none, and the tool's own tile check refused the
 * frame. Stating the grid once is what makes the tiling checkable by eye as well
 * as by `--tile-check`.
 *
 * The band heights are chosen so that the centre band is the crossing, the top
 * band is the signage against the sky, and the bottom band is the pavement the
 * camera stands on. The column widths put the right column over the style panel,
 * which `.world-style-picker` in `src/ui/style-picker.css` fixes at a 12 px
 * inset, 224 px wide, and which round 30 measured composited at x 1010..1275,
 * y 4..140 of the frame.
 */
const COLUMNS = Object.freeze([
  Object.freeze({ left: 0, width: 320 }),
  Object.freeze({ left: 320, width: 640 }),
  Object.freeze({ left: 960, width: 320 }),
]);
const BANDS = Object.freeze([
  Object.freeze({ top: 0, height: 180 }),
  Object.freeze({ top: 180, height: 360 }),
  Object.freeze({ top: 540, height: 180 }),
]);

function cells(column: number, firstBand: number, lastBand: number): Region["rect"] {
  const from = COLUMNS[column]!;
  const first = BANDS[firstBand]!;
  const last = BANDS[lastBand]!;
  return { left: from.left, top: first.top, width: from.width, height: last.top + last.height - first.top };
}

/** The eight regions, in the order they are reported: down the frame, left to right. */
const REGIONS: readonly Region[] = Object.freeze([
  Object.freeze({
    name: "left-upper",
    rect: cells(0, 0, 0),
    note: "the top-left cell: the western frontage against the sky, with no UI composited over it",
  }),
  Object.freeze({
    name: "left-lower",
    rect: cells(0, 1, 1),
    note: "the middle-left cell: the western approach and its facade bases at 1:1",
  }),
  Object.freeze({
    name: "left-ground",
    rect: cells(0, 2, 2),
    note: "the bottom-left cell: the pavement at the left edge of the frame, at the scale a viewer stands at",
  }),
  Object.freeze({
    name: "upper-signage-sky",
    rect: cells(1, 0, 0),
    note: "the top of the centre column: the signage band, the skyline and the buildings behind the crossing",
  }),
  Object.freeze({
    name: "centre-crossing",
    rect: cells(1, 1, 1),
    note: "the middle of the frame at 1:1: the crossing, its diagonal arms and the zebra bands on the approaches",
  }),
  Object.freeze({
    name: "near-pavement",
    rect: cells(1, 2, 2),
    note: "the bottom of the centre column: the pavement the camera stands on, where paving, kerbs, tactile strips and paint seams live and where foreshortening is worst",
  }),
  Object.freeze({
    name: "right-ui",
    rect: { ...cells(2, 0, 0), height: BANDS[0]!.height + BANDS[1]!.height },
    note: "the top of the right column: whatever the app composites there, which at this revision is the World style panel measured at about x 1010..1275, y 4..140 — the overlay no inspection has mentioned",
  }),
  Object.freeze({
    name: "right-ground",
    rect: cells(2, 2, 2),
    note: "the bottom-right cell: the near ground beside the attribution line, whose text sits in the lower part of this crop",
  }),
]);

function scaled(rect: Region["rect"], width: number, height: number): Region["rect"] {
  if (width === FRAME_WIDTH && height === FRAME_HEIGHT) return rect;
  const scaleX = width / FRAME_WIDTH;
  const scaleY = height / FRAME_HEIGHT;
  return {
    left: Math.round(rect.left * scaleX),
    top: Math.round(rect.top * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY),
  };
}

// ---------------------------------------------------------------------------
// Camera pose and the world-scale note
// ---------------------------------------------------------------------------

interface Pose {
  camera: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  /** Vertical field of view, degrees. */
  fovDegrees: number;
  /** Where the pose came from, recorded so a reader can weigh the note. */
  source: string;
}

/**
 * One hero pose, as `tools/visual/shots.ts` defines it.
 *
 * The numbers are copies rather than imports on purpose: that file sits inside
 * the harness closure the running capture digests, and this tool has no business
 * pulling a Playwright spec's module graph into a command a person runs. The
 * cost is that a changed pose leaves a stale row here, which is why every row
 * carries the frame name it applies to and the note says the scale is derived.
 */
const KNOWN_POSES: readonly { pattern: RegExp; azimuth: number; polar: number; distance: number; target: { x: number; y: number; z: number } }[] = Object.freeze([
  Object.freeze({
    pattern: /^hero-.+-crossing\.png$/,
    azimuth: Math.PI / 4,
    polar: 1.5,
    distance: 45,
    target: Object.freeze({ x: 0, y: GROUND_AT_ORIGIN_M, z: 0 }),
  }),
  Object.freeze({
    pattern: /^hero-.+-approach\.png$/,
    azimuth: Math.PI / 4,
    polar: 1.28,
    distance: 220,
    target: Object.freeze({ x: 0, y: GROUND_AT_ORIGIN_M, z: 0 }),
  }),
]);

function knownPose(framePath: string, fovDegrees: number): Pose | undefined {
  const file = path.basename(framePath);
  const match = KNOWN_POSES.find((entry) => entry.pattern.test(file));
  if (!match) return undefined;
  const sinPolar = Math.sin(match.polar);
  return {
    camera: {
      x: match.distance * sinPolar * Math.sin(match.azimuth),
      y: match.target.y + match.distance * Math.cos(match.polar),
      z: match.distance * sinPolar * Math.cos(match.azimuth),
    },
    target: match.target,
    fovDegrees,
    source:
      `the ${match.distance} m hero pose at polar ${match.polar} and azimuth 45 degrees, ` +
      "as `tools/visual/shots.ts` defines it; the camera position is derived here, not read from the capture",
  };
}

interface Triple {
  x: number;
  y: number;
  z: number;
}

function normalize(vector: Triple): Triple {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function cross(left: Triple, right: Triple): Triple {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

function cameraBasis(pose: Pose): { forward: Triple; right: Triple; up: Triple } {
  const forward = normalize({
    x: pose.target.x - pose.camera.x,
    y: pose.target.y - pose.camera.y,
    z: pose.target.z - pose.camera.z,
  });
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  return { forward, right, up: cross(right, forward) };
}

/**
 * Where a frame pixel's ray meets the horizontal plane through the pose target.
 *
 * This is the same construction `tools/paint-review/analyse.ts` maps frames
 * with, minus its terrain refinement: one plane, so the answer is a scale
 * estimate and not a measurement of the ground mesh. The returned distance is
 * along the ray from the camera, which is what turns a field of view into metres
 * a pixel.
 */
function rayToTargetPlane(pose: Pose, frameWidth: number, frameHeight: number, pixelX: number, pixelY: number): { x: number; z: number; distance: number } | null {
  const { forward, right, up } = cameraBasis(pose);
  const tanHalf = Math.tan((pose.fovDegrees * Math.PI) / 360);
  const aspect = frameWidth / frameHeight;
  const ndcX = ((pixelX + 0.5) / frameWidth) * 2 - 1;
  const ndcY = 1 - ((pixelY + 0.5) / frameHeight) * 2;
  const direction = normalize({
    x: forward.x + right.x * ndcX * tanHalf * aspect + up.x * ndcY * tanHalf,
    y: forward.y + right.y * ndcX * tanHalf * aspect + up.y * ndcY * tanHalf,
    z: forward.z + right.z * ndcX * tanHalf * aspect + up.z * ndcY * tanHalf,
  });
  if (Math.abs(direction.y) < 1e-9) return null;
  const t = (pose.target.y - pose.camera.y) / direction.y;
  if (!(t > 0)) return null;
  return {
    x: pose.camera.x + direction.x * t,
    z: pose.camera.z + direction.z * t,
    distance: Math.hypot(direction.x * t, direction.y * t, direction.z * t),
  };
}

interface WorldScale {
  /** How the pose was obtained, so the reader can weigh every number below. */
  poseSource: string;
  camera: Triple;
  target: Triple;
  fovDegrees: number;
  /** The height the rays are intersected with, metres. */
  datumMetres: number;
  /**
   * The rays sampled on a 3x3 grid across the crop.
   *
   * A grid rather than one number because foreshortening inside a single crop is
   * real: the near pavement and the crossing are one and a half times apart in
   * scale in the crossing pose. `sampled` is what landed on the datum plane;
   * the rest pointed above the horizon, where the pose defines no ground scale.
   */
  sampled: number;
  ofSamples: number;
  minMetresPerPixel: number;
  medianMetresPerPixel: number;
  maxMetresPerPixel: number;
  /** The ground quad, present only when all four corner rays meet the datum. */
  quad: { corners: { x: number; z: number }[]; minX: number; maxX: number; minZ: number; maxZ: number; widthMetres: number; heightMetres: number } | null;
  quadNote: string;
  bound: string;
}

function round(value: number, places = 3): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function worldScaleFor(pose: Pose, frameWidth: number, frameHeight: number, rect: Region["rect"]): WorldScale {
  const at = (pixelX: number, pixelY: number) => rayToTargetPlane(pose, frameWidth, frameHeight, pixelX, pixelY);
  const metresPerPixelAt = (hit: { distance: number }) => (2 * hit.distance * Math.tan((pose.fovDegrees * Math.PI) / 360)) / frameHeight;

  const samples: number[] = [];
  for (let step = 0; step < 3; step += 1) {
    for (let column = 0; column < 3; column += 1) {
      const hit = at(rect.left + (rect.width - 1) * (column / 2), rect.top + (rect.height - 1) * (step / 2));
      if (hit !== null) samples.push(metresPerPixelAt(hit));
    }
  }
  const sorted = [...samples].sort((left, right) => left - right);

  const corners = [
    at(rect.left, rect.top),
    at(rect.left + rect.width - 1, rect.top),
    at(rect.left, rect.top + rect.height - 1),
    at(rect.left + rect.width - 1, rect.top + rect.height - 1),
  ];
  const edge = (left: { x: number; z: number }, right: { x: number; z: number }) => Math.hypot(right.x - left.x, right.z - left.z);
  let quad: WorldScale["quad"] = null;
  if (corners.every((corner) => corner !== null)) {
    const defined = corners as { x: number; z: number }[];
    const xs = defined.map((corner) => corner.x);
    const zs = defined.map((corner) => corner.z);
    quad = {
      corners: defined.map((corner) => ({ x: round(corner.x, 2), z: round(corner.z, 2) })),
      minX: round(Math.min(...xs), 2),
      maxX: round(Math.max(...xs), 2),
      minZ: round(Math.min(...zs), 2),
      maxZ: round(Math.max(...zs), 2),
      widthMetres: round(edge(defined[0]!, defined[1]!), 2),
      heightMetres: round(edge(defined[0]!, defined[2]!), 2),
    };
  }

  return {
    poseSource: pose.source,
    camera: { x: round(pose.camera.x), y: round(pose.camera.y), z: round(pose.camera.z) },
    target: { x: round(pose.target.x), y: round(pose.target.y), z: round(pose.target.z) },
    fovDegrees: pose.fovDegrees,
    datumMetres: pose.target.y,
    sampled: samples.length,
    ofSamples: 9,
    minMetresPerPixel: samples.length === 0 ? 0 : round(sorted[0]!, 4),
    medianMetresPerPixel: samples.length === 0 ? 0 : round(sorted[(sorted.length - 1) >> 1]!, 4),
    maxMetresPerPixel: samples.length === 0 ? 0 : round(sorted[sorted.length - 1]!, 4),
    quad,
    quadNote:
      quad === null
        ? "no world quad: at least one corner ray points at or above the horizon, where this pose defines no ground scale — which is the honest answer for a crop holding sky"
        : "the ground quad the four corners land on, at the pose's target height",
    bound:
      "a ray-to-plane estimate at the pose's target height, not a measurement of the ground mesh: terrain and rooftops above " +
      "that plane make the true scale smaller, and the sample range is how much the scale moves across this crop",
  };
}

// ---------------------------------------------------------------------------
// Slicing and the manifest
// ---------------------------------------------------------------------------

/** One source pixel per output pixel, row by row. No filter, no resample. */
function cut(image: DecodedPng, rect: Region["rect"]): Uint8Array {
  const out = new Uint8Array(rect.width * rect.height * 4);
  for (let row = 0; row < rect.height; row += 1) {
    const from = ((rect.top + row) * image.width + rect.left) * 4;
    out.set(image.rgba.subarray(from, from + rect.width * 4), row * rect.width * 4);
  }
  return out;
}

/** A rectangle placed next to another one, with the pixels the other one holds. */
interface Placed {
  image: DecodedPng;
  rect: Region["rect"];
}

/**
 * Rebuild the frame from the crops and compare it, byte for byte.
 *
 * This is the check that the slicing and the encoder are exact rather than
 * nearly exact: a crop copied with an off-by-one row, or an encoder that
 * dropped an alpha byte, is invisible in a picture and obvious here.
 *
 * **Coverage is counted, not flagged, and that is not tidiness.** A flag per
 * pixel makes this check order-dependent: if two regions overlap and the second
 * one writes over the first, a bad crop is overwritten by a good one before the
 * comparison runs and the bad crop passes. That was watched happening — a
 * region cut one pixel to the right, tiled over by the strip below it, reported
 * as byte-identical — and a check that reports a pass on a known defect is worse
 * than no check, because it is believed. Every pixel must be written exactly
 * once, which makes the reassembly a reconstruction rather than a last-writer
 * -wins merge.
 */
function tileCheck(decoded: { width: number; height: number; rgba: Uint8Array }, placed: Placed[]): string {
  const pixels = new Uint8Array(decoded.rgba.length);
  const depth = new Uint8Array(decoded.width * decoded.height);
  for (const entry of placed) {
    for (let row = 0; row < entry.rect.height; row += 1) {
      const from = row * entry.rect.width * 4;
      const to = ((entry.rect.top + row) * decoded.width + entry.rect.left) * 4;
      pixels.set(entry.image.rgba.subarray(from, from + entry.rect.width * 4), to);
      const start = (entry.rect.top + row) * decoded.width + entry.rect.left;
      for (let column = 0; column < entry.rect.width; column += 1) depth[start + column] = Math.min(255, depth[start + column]! + 1);
    }
  }
  let uncovered = 0;
  let coveredTwice = 0;
  for (const count of depth) {
    if (count === 0) uncovered += 1;
    else if (count > 1) coveredTwice += 1;
  }
  if (uncovered !== 0 || coveredTwice !== 0) {
    fail(
      `The tile check cannot run: the ${placed.length} regions leave ${uncovered} of ${depth.length} pixels uncovered and ${coveredTwice} covered more than once. ` +
        "The regions must tile the frame exactly once each, or the reassembly is a merge that can hide a bad crop behind a good one. " +
        "This is a bug in this tool's region set, not in the frame.",
    );
  }
  let differing = 0;
  let firstAt = -1;
  for (let index = 0; index < pixels.length; index += 1) {
    if (pixels[index] === decoded.rgba[index]) continue;
    differing += 1;
    if (firstAt < 0) firstAt = index;
  }
  if (differing !== 0) {
    const pixel = firstAt - (firstAt % 4);
    fail(
      `The tile check failed: ${differing} of ${pixels.length} bytes differ between the frame and the crops reassembled. ` +
        `First difference at byte ${firstAt} (pixel ${pixel / 4}, column ${(pixel / 4) % decoded.width}, row ${Math.floor(pixel / 4 / decoded.width)}). ` +
        "A crop is not the frame's own pixels at that rectangle, or the encoder is not lossless; treat every crop as unverified.",
    );
  }
  return `the ${placed.length} regions tile the frame exactly and reassemble to it byte for byte (${pixels.length} bytes compared)`;
}

interface ManifestCrop {
  name: string;
  note: string;
  file: string;
  pixelRect: Region["rect"];
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  /** Recorded after re-decoding the file, so it is the file's size and not the intent. */
  decodedBounds: string;
  meanLuminance: number;
  luminanceSpread: number;
  distinctColours: number;
  losslessRoundTrip: boolean;
  worldScale: WorldScale | null;
  worldScaleNote: string;
}

interface Manifest {
  schema: string;
  tool: string;
  frame: {
    path: string;
    bytes: number;
    sha256: string;
    width: number;
    height: number;
    /** Rows above this are the crop set's own tile check, below it the crops. */
    pixelRect: Region["rect"];
  };
  regions: { name: string; pixelRect: Region["rect"]; note: string }[];
  reviewBinding: string;
  verification: string[];
  crops: ManifestCrop[];
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const USAGE = `
Crop a captured frame into named 1:1 rectangles, with a manifest that binds each
crop's bytes to the frame it was cut from.

  node tools/inspect/crops.ts --frame artifacts/visual/hero/hero-satellite-dusk-crossing.png

Options
  --frame <file>      The frame to cut. Required. A relative path is relative to
                      the repository root, so the command means the same thing
                      from any working directory.
  --out-dir <dir>     Where the crops and manifest.json go. Defaults to
                      artifacts/frame-crops/<frame name without .png>.
  --camera <x,y,z>    The camera position, metres in the world frame. With
                      --target this replaces the pose looked up from a known
                      hero frame name, for a frame this tool has no pose for.
  --target <x,y,z>    The camera target, metres in the world frame.
  --fov <degrees>     Vertical field of view. Default ${DEFAULT_FOV_DEGREES}, matching src/render/camera.ts.
  --regions           List the regions and exit. Writes nothing.
  --no-tile-check     Skip reassembling the frame from the crops.
  --help              This text.

What it refuses by name
  A frame that is not 1280x720, a region that would fall outside it, an output
  directory already holding crops from a different frame, and a tile check that
  does not come back byte-identical.
`.trim();

function parseTriple(text: string, flag: string): Triple {
  const parts = text.split(",").map((part) => part.trim());
  if (parts.length !== 3) fail(`${flag} takes three numbers as x,y,z; got "${text}" (${parts.length} values).`);
  const values = parts.map((part) => Number(part));
  if (values.some((value) => !Number.isFinite(value))) fail(`${flag} takes three finite numbers as x,y,z; got "${text}".`);
  return { x: values[0]!, y: values[1]!, z: values[2]! };
}

function loadRegions(): { name: string; pixelRect: Region["rect"]; note: string }[] {
  return REGIONS.map((region) => ({ name: region.name, pixelRect: region.rect, note: region.note }));
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      frame: { type: "string" },
      "out-dir": { type: "string" },
      camera: { type: "string" },
      target: { type: "string" },
      fov: { type: "string" },
      regions: { type: "boolean", default: false },
      "no-tile-check": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.help || (values.frame === undefined && !values.regions)) {
    process.stdout.write(`${USAGE}\n`);
    if (!values.help) process.exitCode = 2;
    return;
  }

  if (values.regions) {
    process.stdout.write(
      `${REGIONS.map((region) => {
        const { left, top, width, height } = region.rect;
        return `${region.name.padEnd(18)} ${String(width).padStart(4)}x${String(height).padStart(4)} at (${left},${top})  ${region.note}`;
      }).join("\n")}\n`,
    );
    return;
  }

  const frameArg = values.frame!;
  const framePath = resolveFromRoot(frameArg);
  if (!existsSync(framePath)) {
    fail(
      `No frame at ${displayPath(framePath)}. Pass an existing PNG with --frame; ` +
        "`npm run visual` writes the verdict frames under artifacts/visual/.",
    );
  }
  const frameBytes = new Uint8Array(await readFile(framePath));

  // The IHDR holds width and height at byte 16 and byte 20, which is where the
  // reader below looks too. Read here only to bound the decode.
  const header = frameBytes.length >= 24 ? new DataView(frameBytes.buffer, frameBytes.byteOffset, frameBytes.byteLength) : null;
  const declaredWidth = header?.getUint32(16) ?? 0;
  const declaredHeight = header?.getUint32(20) ?? 0;

  // Refused from the header before decoding, so an oversized image says so
  // rather than being inflated first and reported as a memory problem. A frame
  // of the wrong shape but a sane size is refused by the shape check below.
  if (declaredWidth * declaredHeight > FRAME_PIXEL_BUDGET) {
    fail(
      `The frame at ${displayPath(framePath)} declares ${declaredWidth}x${declaredHeight} in its header, more than 16x the ` +
        `${FRAME_WIDTH}x${FRAME_HEIGHT} capture size. This tool cuts regions measured in capture pixels, so it refuses rather than inflating an image it cannot cut correctly.`,
    );
  }

  const image = decodePng(frameBytes);
  if (image.width !== FRAME_WIDTH || image.height !== FRAME_HEIGHT) {
    fail(
      `The frame at ${displayPath(framePath)} is ${image.width}x${image.height}; every captured verdict frame is ${FRAME_WIDTH}x${FRAME_HEIGHT}. ` +
        "The regions this tool cuts are named for parts of the capture frame — the crossing, the pavement under it, the signage band, the style panel — " +
        "so a frame of another shape would be cut into rectangles that mean something else. Re-capture at the capture viewport, or pass regions of your own for this size.",
    );
  }

  const fovDegrees = values.fov === undefined ? DEFAULT_FOV_DEGREES : Number(values.fov);
  if (!Number.isFinite(fovDegrees) || fovDegrees <= 0 || fovDegrees >= 180) {
    fail(`--fov takes a field of view in degrees between 0 and 180; got "${String(values.fov)}".`);
  }

  let pose: Pose | undefined;
  if (values.camera !== undefined || values.target !== undefined) {
    if (values.camera === undefined || values.target === undefined) {
      fail("--camera and --target go together: one supplies the position, the other the point it looks at. Give both or neither.");
    }
    pose = {
      camera: parseTriple(values.camera, "--camera"),
      target: parseTriple(values.target, "--target"),
      fovDegrees,
      source: "the camera position and target given on the command line",
    };
  } else {
    pose = knownPose(framePath, fovDegrees);
  }

  // The regions are measured for this exact frame shape, so they fit by
  // construction. This is the guard that would fire if one ever did not — a
  // region partly outside the frame would be evidence of nothing — and it says
  // which region and which edge rather than failing later inside the cut.
  const regions = REGIONS.map((region) => ({ ...region, rect: scaled(region.rect, image.width, image.height) }));
  for (const region of regions) {
    const { left, top, width: regionWidth, height: regionHeight } = region.rect;
    if (left < 0 || top < 0 || regionWidth <= 0 || regionHeight <= 0 || left + regionWidth > image.width || top + regionHeight > image.height) {
      fail(
        `Region ${region.name} is ${regionWidth}x${regionHeight} at (${left},${top}), which falls outside the ${image.width}x${image.height} frame. ` +
          "A crop is evidence only if it comes from inside the frame; the region is wrong, not the frame.",
      );
    }
  }

  const frameName = path.basename(framePath, ".png");
  const outDir = values["out-dir"] === undefined ? path.join(repoRoot(), "artifacts", "frame-crops", frameName) : resolveFromRoot(values["out-dir"]);
  const manifestPath = path.join(outDir, "manifest.json");
  const frameSha = sha256(frameBytes);

  // A directory holding crops from another frame would silently mix two frames
  // in one review, which is exactly the confusion a digest is here to prevent.
  if (existsSync(manifestPath)) {
    const previous = JSON.parse(await readFile(manifestPath, "utf8")) as Partial<Manifest>;
    const previousFrame = previous.frame;
    if (previousFrame?.sha256 !== undefined && previousFrame.sha256 !== frameSha) {
      fail(
        `${displayPath(outDir)} already holds crops from ${String(previousFrame.path ?? "another frame")} (SHA-256 ${previousFrame.sha256.slice(0, 12)}…), ` +
          `and this frame is ${displayPath(framePath)} (SHA-256 ${frameSha.slice(0, 12)}…). ` +
          "Cut them into an output directory of their own with --out-dir, or delete that directory first — overwriting it would strand the review that is bound to those bytes.",
      );
    }
  }

  await mkdir(outDir, { recursive: true });

  const crops: ManifestCrop[] = [];
  const placed: Placed[] = [];
  const verification: string[] = [];

  for (const region of regions) {
    const pixels = cut(image, region.rect);
    const file = `${region.name}.png`;
    const target = path.join(outDir, file);
    const bytes = encodePng(region.rect.width, region.rect.height, pixels);
    await writeFile(target, bytes);

    // Read the file back rather than trusting the write: what the manifest
    // describes has to be what is on disk, and this is also the check that the
    // encoder and the reader agree on the rectangle that was cut.
    const written = decodePng(new Uint8Array(await readFile(target)));
    if (written.width !== region.rect.width || written.height !== region.rect.height) {
      fail(
        `${file} was written as ${region.rect.width}x${region.rect.height} but reads back as ${written.width}x${written.height}. ` +
          "The crop is not the size it was written at, so nothing about it can be trusted; the decoder and the encoder disagree.",
      );
    }
    let differing = 0;
    for (let index = 0; index < pixels.length; index += 1) if (pixels[index] !== written.rgba[index]) differing += 1;
    if (differing !== 0) {
      fail(
        `${file} came back from disk with ${differing} of ${pixels.length} bytes different from the pixels that were cut. ` +
          "A crop that is not lossless cannot be inspected as the frame's own pixels.",
      );
    }
    placed.push({ image: written, rect: region.rect });

    const stats = measureFrame(written);
    crops.push({
      name: region.name,
      note: region.note,
      file,
      pixelRect: region.rect,
      width: written.width,
      height: written.height,
      bytes: bytes.length,
      sha256: sha256(bytes),
      decodedBounds: `${written.width}x${written.height}`,
      meanLuminance: Number(stats.meanLuminance.toFixed(2)),
      luminanceSpread: Number(stats.luminanceSpread.toFixed(2)),
      distinctColours: stats.distinctColours,
      losslessRoundTrip: true,
      worldScale: pose === undefined ? null : worldScaleFor(pose, image.width, image.height, region.rect),
      worldScaleNote:
        pose === undefined
          ? "no camera pose was available for this frame, so no world scale is claimed"
          : "derived from the pose named in worldScale.poseSource; see its bound",
    });
  }

  verification.push(
    `every crop decodes back to the rectangle it was cut from, at the size it was written at (${crops.length} of ${crops.length})`,
  );
  if (!values["no-tile-check"]) verification.push(tileCheck(image, placed));
  verification.push(`the source frame decodes at ${image.width}x${image.height} from ${frameBytes.length} bytes`);

  const manifest: Manifest = {
    schema: "maps/frame-crops@1",
    tool: "tools/inspect/crops.ts",
    frame: {
      path: displayPath(framePath),
      bytes: frameBytes.length,
      sha256: frameSha,
      width: image.width,
      height: image.height,
      pixelRect: { left: 0, top: 0, width: image.width, height: image.height },
    },
    regions: loadRegions(),
    reviewBinding:
      "A review of these crops is bound to the frame.sha256 and to each crop's own sha256. Regenerating the crops from a different " +
      "frame changes the frame digest, and re-cutting the same frame changes nothing, so a review that names these digests cannot " +
      "inherit a run it did not read.",
    verification,
    crops,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const body = manifest.crops
    .map((crop) => {
      const scale =
        crop.worldScale === null
          ? "no pose for this frame"
          : crop.worldScale.sampled === 0
            ? "no ground in this crop"
            : `${crop.worldScale.minMetresPerPixel}-${crop.worldScale.maxMetresPerPixel} m/px over ${crop.worldScale.sampled} of 9 samples`;
      return `  ${crop.name.padEnd(18)} ${`${crop.width}x${crop.height}`.padStart(9)}  ${String(crop.bytes).padStart(8)} B  ${crop.sha256.slice(0, 12)}…  ${scale}`;
    })
    .join("\n");
  process.stdout.write(
    [
      "",
      `frame  ${manifest.frame.path}  ${frameBytes.length} B  ${frameSha}`,
      `crops  ${displayPath(outDir)}`,
      body,
      ...verification.map((line) => `check  ${line}`),
      "",
    ].join("\n"),
  );
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`crops: ${message}\n`);
  process.exitCode = 1;
}

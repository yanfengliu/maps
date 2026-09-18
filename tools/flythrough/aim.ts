/**
 * Aim the flythrough's street legs at the population, from measurements.
 *
 * This tool exists because aiming a camera at a crowd by counting bodies is how
 * an earlier flythrough photographed an empty street: the population stacks
 * several bodies on one position, so a camera sees *positions* and a probe that
 * counts bodies measures something the frame cannot show. This scores candidate
 * poses by the number of distinct positions in frame and by how many of those are
 * moving, and reports the vehicles in the same frustum.
 *
 * It also has to know where a camera *can* stand, which is two constraints no
 * free search would find:
 *
 * - the controls' target height is pinned at the crossing's ground level, so only
 *   the angle the camera looks at a target can be chosen, and a camera standing
 *   beside a target 20 m above it is looking up a hillside;
 * - the frame's centre is the target, so the subject has to be at the target.
 *
 * So a candidate is `(camera on a walking way within reach, azimuth, distance)`
 * where the camera looks at the knot from 3 m above the ground, which is the pose
 * `FlythroughDriver.standAt` can stand the camera in.
 *
 * ## What changed, and why the numbers below moved
 *
 * An earlier version scored every visible body at `TARGET_Y_M + 0.9`, a constant
 * 16.1 m in world Y whatever the terrain under it said, and required only that
 * the *target's* ground be non-NaN. The audit
 * (`artifacts/quality-audit/register.md` §2.2) found what that bought: the tool
 * ranked a knot on the AOI's margin ring first, on 27.5 m ground, where the
 * scorer's bodies sat 12.2 m above the real ones — 90% of the frame's vertical
 * half-extent at 26 m — and the passing flight's crowd leg pointed 34.7 degrees
 * down at pavement. Bodies are now scored at `ground(body) + 0.9 m` from the
 * terrain mesh, a candidate whose own ground is NaN is refused, and a candidate
 * whose stand height above its ground is under the leg's clearance floor is
 * refused too. `tools/flythrough/aim-score.ts` carries both rules and the unit
 * case that pins them.
 *
 *   node tools/flythrough/aim.ts --dump artifacts/flythrough2/reference-dump-t5400.json
 *
 * The score is a count and nothing else, so the report carries the geometry
 * beside it: every anchor named prints the ground under the camera and under the
 * target, the view pitch in degrees, and how tall a 1.7 m figure at the target's
 * depth appears in the frame. A pitch near 35 degrees is pavement; a pitch near
 * 10 degrees is people.
 *
 * Reference dumps are the populated lane's own probe output, kept as a measurement
 * of the population rather than as evidence about a frame. Re-measure from a live
 * probe when the population changes, and measure at the tick the leg will capture
 * at rather than at one the tool happens to have:
 *
 *   node tools/populated/probe.ts --ticks 3000 --dump-tick 3000 --dump-file <path>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// The real extension, not `.js`: this file is run by bare Node, which strips
// types but does not rewrite a `.js` specifier to the `.ts` file beside it
// (tsconfig's `allowImportingTsExtensions` permits both, and `tools/data/` reads
// the same way).
import { bestPerCell, distinctPositions, groundGrid, poseScore, scoreDump, terrainIndex, type AimOptions, type ScoredPose } from "./aim-score.ts";

const FOV_Y_DEG = 55;
const ASPECT = 1280 / 720;

/** The height a street leg stands at, metres above the terrain under the camera. */
const STAND_M = 3;

/** The clearance the lane's street legs hold the camera at; `Leg.minClearanceM`. */
const MIN_CLEARANCE_M = 2;

/** A body's centre above its own ground, metres. */
const BODY_CENTRE_M = 0.9;

/** The capture's frame height, pixels; `CAPTURE_VIEWPORT` in `tools/visual/shots.ts`. */
const FRAME_HEIGHT_PX = 720;

/**
 * The frame rows counted as the middle band, as fractions of the height.
 *
 * Rows 120 to 600 of 720. A body projected onto the frame's bottom edge is inside
 * the viewport and is not a person the frame shows, which is exactly the defect
 * this tool was fixed for: the margin-ring anchor put 457 moving bodies in frame
 * and every one of them between rows 636 and 710.
 */
const CENTRE_BAND_TOP = 1 / 6;
const CENTRE_BAND_BOTTOM = 5 / 6;

/**
 * The steepest optical axis a candidate may have, degrees below horizontal.
 *
 * 20 degrees. The lane's own evidence brackets it: the failed crowd leg's axis is
 * 28.7 degrees down, and the independent re-aim's two best anchors are 4.6 and 4.0
 * down. A leg that cannot get under 20 degrees is looking at pavement, and the
 * audit's anchor cannot: its camera ground is 26.4 m, so `cameraGround + 2 m` of
 * stand against the pinned 15.2 m target is at best 28.7 degrees over 26 m.
 */
const MAX_PITCH_DEGREES = 20;

/**
 * The range at which a walking body is the leg's subject rather than a count.
 *
 * 45 m. At this field of view a 1.7 m figure is 26 px tall there and 10 px at
 * 112 m, and the leg's questions — does a figure hold its shape between frames,
 * do two of them interpenetrate — are questions about a figure's pixels. The
 * control this number was chosen against is in the report: the independent re-aim
 * put 217 of its walking bodies inside 45 m at tick 3000 where the tool's own
 * best-by-count anchor put none.
 */
const NEAR_RANGE_M = 45;

/** The fewest walking bodies inside `NEAR_RANGE_M` a candidate may have. */
const MIN_NEAR_MOVING = 10;

/** The depths a scored body may sit at, metres along the view axis. */
const MIN_DEPTH_M = 4;
const MAX_DEPTH_M = 220;

interface Dump {
  tick: number;
  pedestrians: number[][];
  vehicles: number[][];
}

function argument(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function numberArgument(name: string, fallback: number): number {
  const raw = argument(name, String(fallback));
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`--${name} needs a number; received "${raw}". It sets a pose, so a non-number would be aimed at nothing.`);
  }
  return value;
}

const ROOT = resolve(import.meta.dirname, "..", "..");
const dumpFiles = process.argv
  .map((value, index) => (process.argv[index - 1] === "--dump" ? value : null))
  .filter((value): value is string => value !== null);
if (dumpFiles.length === 0) {
  throw new Error(
    "aim.ts needs at least one position dump: --dump <path>. The dump is the populated lane's probe output " +
      "(`node tools/populated/probe.ts --ticks 5400 --dump-tick 5400 --dump-file <path>`); without it this tool has " +
      "no population to aim at and would produce a plausible-looking pose aimed at nothing.",
  );
}
const out = argument("out", resolve(import.meta.dirname, "aim.json"));
const topCount = numberArgument("top", 5);

const OPTIONS: AimOptions = {
  standM: numberArgument("stand", STAND_M),
  minClearanceM: numberArgument("min-clearance", MIN_CLEARANCE_M),
  bodyHeightM: BODY_CENTRE_M,
  fovYDegrees: FOV_Y_DEG,
  aspect: ASPECT,
  frameHeightPx: FRAME_HEIGHT_PX,
  minDepthM: MIN_DEPTH_M,
  maxDepthM: MAX_DEPTH_M,
  maxSightings: 12,
  centreBandTop: CENTRE_BAND_TOP,
  centreBandBottom: CENTRE_BAND_BOTTOM,
  maxPitchDegrees: numberArgument("max-pitch", MAX_PITCH_DEGREES),
  nearRangeM: NEAR_RANGE_M,
  minNearMoving: MIN_NEAR_MOVING,
  movingSpeedMps: 0.2,
};

function loadTerrain(): { positions: Float32Array; vertexCount: number } {
  const bytes = readFileSync(resolve(ROOT, "data/scene/terrain.mesh"));
  const magic = bytes.toString("ascii", 0, 8);
  if (magic !== "MAPSMSH1") {
    throw new Error(
      `data/scene/terrain.mesh starts with "${magic}" rather than MAPSMSH1, so no pose can be checked against the ` +
        "ground it stands over. Run `npm run data:scene`.",
    );
  }
  const headerLength = bytes.readUInt32LE(8);
  const header = JSON.parse(bytes.toString("utf8", 12, 12 + headerLength)) as { vertexCount: number };
  return {
    positions: new Float32Array(bytes.buffer, bytes.byteOffset + 12 + headerLength, header.vertexCount * 3),
    vertexCount: header.vertexCount,
  };
}

const { positions: terrain, vertexCount: terrainCount } = loadTerrain();

/**
 * The ground under a point, at the radius the driver measures it with.
 *
 * The first version of this tool read the highest terrain in a 40 m box on an
 * 8 m grid, which reported 27.5 m for a camera the driver stood on 26.36 m of
 * pavement. `terrainIndex` answers with the ground within the driver's own 8 m
 * first radius, so the geometry this tool scores is the geometry the run gets.
 * `groundGrid` is kept and reported beside it, because the two disagreeing by
 * more than a metre anywhere is a fact about the terrain worth seeing.
 */
const ground = terrainIndex(terrain, terrainCount);
const wideGround = groundGrid(terrain, terrainCount);

interface WayPoint {
  x: number;
  z: number;
  id: string;
}

function walkingWays(): WayPoint[] {
  const network = JSON.parse(readFileSync(resolve(ROOT, "data/network/network.json"), "utf8")) as {
    walks: { id: string; points: { x: number; z: number }[] }[];
  };
  const points: WayPoint[] = [];
  for (const walk of network.walks) {
    const step = Math.max(1, Math.floor(walk.points.length / 10));
    for (let index = 0; index < walk.points.length; index += step) {
      points.push({ x: walk.points[index]!.x, z: walk.points[index]!.z, id: walk.id });
    }
  }
  return points;
}

const azimuths = Array.from({ length: 48 }, (_, index) => (index * Math.PI * 2) / 48);
/**
 * The distances a street leg can be scored at.
 *
 * 26 m is the distance the passing flight used, and it is kept so the re-scored
 * anchors are comparable with the old report. The shorter rungs are here because
 * the pitch does not depend on the distance alone: the camera's stand height is
 * an offset from the ground it is on, and at 26 m a metre of ground difference
 * between the two ends of the pose is only 2.2 degrees of pitch.
 */
const distances = argument("distances", "18,22,26,32,40,52")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));
if (distances.length === 0) {
  throw new Error(
    `--distances needs at least one number; received "${argument("distances", "18,22,26,32,40,52")}". The list is the ` +
      "set of separations a pose is scored at, so an empty one would score nothing and report a clean run.",
  );
}

const report: Record<string, unknown> = {
  tool: "tools/flythrough/aim.ts",
  bound:
    "Aiming aid, not evidence. It scores candidate poses against an offline dump of the population's positions, " +
    "which is the same simulation the browser runs from the same seed and the same fixed step, and it says nothing " +
    "about what any frame looks like. The world height of every body is the terrain mesh's, read at the driver's own " +
    "8 m ground radius; the frame a body is tested against is the renderer's own, camera to the pinned target height.",
  fovYDegrees: FOV_Y_DEG,
  frameHeightPx: FRAME_HEIGHT_PX,
  standM: OPTIONS.standM,
  minClearanceM: OPTIONS.minClearanceM,
  maxPitchDegrees: OPTIONS.maxPitchDegrees,
  nearRangeM: OPTIONS.nearRangeM,
  minNearMoving: OPTIONS.minNearMoving,
  bodyCentreM: BODY_CENTRE_M,
  centreBand: [CENTRE_BAND_TOP, CENTRE_BAND_BOTTOM],
  notes:
    "pitchDegrees is the optical axis below horizontal: the axis runs from the camera to the app's pinned target " +
    "height, which is the ray the renderer uses, so a camera standing 3 m above 26 m ground reads as 29 degrees down " +
    "whatever the ground under the target says, and a pose past maxPitchDegrees is refused rather than ranked. " +
    "nearMoving counts walking bodies in frame inside nearRangeM, which is the ranking's subject; moving counts every " +
    "walking body inside the viewport, however far away, and a pose whose moving count is much larger than its " +
    "nearMoving count is a crowd read through a long lens. figurePixels is a 1.7 m figure at the median body's depth.",
  dumps: [],
};

const ways = walkingWays();

/** One line per anchor, with the geometry the decision rests on. */
function line(entry: ScoredPose): string {
  const text =
    `   camera (${entry.camera.x.toFixed(1)}, ${entry.camera.z.toFixed(1)}) ground ` +
    `${entry.cameraGroundM.toFixed(2)} m (40 m box ${wideGround(entry.camera.x, entry.camera.z).toFixed(2)} m) -> ` +
    `target (${entry.target.x.toFixed(0)}, ${entry.target.z.toFixed(0)}) ` +
    `ground ${entry.targetGroundM.toFixed(2)} m az ${((entry.azimuth * 180) / Math.PI).toFixed(0)} deg ` +
    `dist ${entry.distance} m: ${entry.nearMoving} near / ${entry.moving} moving / ${entry.positions} positions, ` +
    `${entry.bodiesNearCentre} centred, ${entry.vehicles} vehicles, stand ${entry.standM.toFixed(2)} m, ` +
    `pitch ${entry.pitchDegrees.toFixed(1)} deg, nearest body ${entry.nearestBodyDepthM.toFixed(1)} m, ` +
    `med body ${entry.medianBodyPixelsDown.toFixed(0)} px down at ${entry.medianBodyDepthM.toFixed(0)} m, ` +
    `figure ${entry.figurePixels.toFixed(0)} px [${entry.way}]`;
  return entry.standable ? text : `   REFUSED ${text} -- ${entry.rejected}`;
}

for (const file of dumpFiles) {
  const dump = JSON.parse(readFileSync(file, "utf8")) as Dump;

  // Candidate cameras: walking ways within 60 m of a knot of moving pedestrians.
  const people = distinctPositions(dump.pedestrians, ground).length;
  const knots = new Map<string, { n: number; x: number; z: number }>();
  for (const actor of dump.pedestrians) {
    if (Math.abs(actor[3] ?? 0) <= OPTIONS.movingSpeedMps) continue;
    const key = `${Math.floor(actor[0]! / 12)}:${Math.floor(actor[2]! / 12)}`;
    const held = knots.get(key) ?? { n: 0, x: 0, z: 0 };
    held.n += 1;
    held.x += actor[0]!;
    held.z += actor[2]!;
    knots.set(key, held);
  }
  const centres = [...knots.values()]
    .map((knot) => ({ n: knot.n, x: knot.x / knot.n, z: knot.z / knot.n }))
    .filter((knot) => knot.n >= 5)
    .sort((a, b) => b.n - a.n)
    .slice(0, 30);
  const cameras = ways.filter((way) => centres.some((centre) => Math.hypot(way.x - centre.x, way.z - centre.z) < 60));

  const scored = scoreDump(dump, cameras, ground, OPTIONS, azimuths, distances);
  const cells = bestPerCell(scored.results);
  const ranked = [...cells]
    .filter((entry) => entry.standable)
    .sort((a, b) => poseScore(b) - poseScore(a));
  const crowded = [...ranked]
    .filter((entry) => entry.nearMoving > 0)
    .sort((a, b) => b.nearMoving - a.nearMoving)
    .slice(0, topCount);
  const traffic = [...ranked].sort((a, b) => b.vehicles - a.vehicles || b.nearMoving - a.nearMoving).slice(0, topCount);
  const flattest = [...ranked]
    .filter((entry) => entry.nearMoving > 0)
    .sort((a, b) => a.pitchDegrees - b.pitchDegrees || b.nearMoving - a.nearMoving)
    .slice(0, topCount);

  console.log(
    `\n== ${file} tick ${dump.tick}: ${dump.pedestrians.length} bodies at ${people} distinct positions ` +
      `(${scored.movingPositions} moving), ${dump.vehicles.length} vehicles at ${scored.vehiclePositions} positions`,
  );
  console.log(
    `   ${cameras.length} candidate camera positions on walking ways, ${scored.posesScored} poses scored, ` +
      `${scored.posesRefused} refused (unstandable, steep, or without a near crowd)`,
  );
  for (const [label, list] of [
    ["best overall (near walking bodies + 4 x vehicles)", ranked.slice(0, topCount)],
    ["most near walking bodies in frame", crowded],
    ["most vehicles in frame", traffic],
    ["flattest view with a near crowd", flattest],
  ] as const) {
    console.log(`-- ${label} --`);
    for (const entry of list) console.log(line(entry));
  }

  (report["dumps"] as unknown[]).push({
    file,
    tick: dump.tick,
    bodies: dump.pedestrians.length,
    distinctPositions: people,
    movingPositions: scored.movingPositions,
    vehicles: dump.vehicles.length,
    candidateCameras: cameras.length,
    posesScored: scored.posesScored,
    posesRefused: scored.posesRefused,
    bestOverall: ranked.slice(0, 8),
    mostMoving: crowded,
    mostVehicles: traffic,
    flattest,
  });
}

writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`\naim written to ${out}`);

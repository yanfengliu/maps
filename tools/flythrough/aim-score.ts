/**
 * Score candidate flythrough poses against the population and the real terrain.
 *
 * This is the scoring half of `tools/flythrough/aim.ts`, split out so a unit case
 * can drive it with a synthetic terrain instead of the 4 MB mesh the real tool
 * reads. The tool loads the scene, prints the report and writes `aim.json`; every
 * number it prints comes from `scoreDump` here.
 *
 * ## Why this exists, and what the earlier version got wrong
 *
 * The audit is `artifacts/quality-audit/register.md` §2.2. The tool picked the
 * crowd leg's anchor, the leg pointed at pavement, and the subject never
 * resolved. Two things were wrong, and they compound:
 *
 * 1. **Every body was scored at one height.** The earlier version scored a
 *    visible pedestrian at `TARGET_Y_M + bodyHeightM` — a constant 16.1 m in
 *    world Y, whatever the terrain under the body said. In this AOI the terrain
 *    runs from 7.3 m to 38.9 m, so the scorer could not tell a knot on the
 *    pavement from a knot on the margin ring, and it ranked the margin-ring knot
 *    first. Here a body's height is `ground(body) + bodyHeightM`, and a body
 *    whose ground is NaN is not scored at all: the tool cannot place it, so
 *    counting it would be counting something the frame cannot show.
 *
 * 2. **The ray the body was compared with was not the camera's ray.** The frame's
 *    centre is the controls' target, and the target's height is pinned at the
 *    app's origin datum (`GROUND_AT_ORIGIN_M`, 15.2 m, `src/world/scene-data.ts`)
 *    — no pan can move it. The camera's own height is `cameraGround + standM`, so
 *    the optical axis runs from the camera down (or up) to 15.2 m at the target's
 *    distance, and a camera standing 3 m above 26 m ground looks 29.6 degrees
 *    down whatever the terrain under the target says. The earlier version instead
 *    compared each body against a ray drawn to `ground(target) + bodyHeightM`,
 *    which for that camera is a **different ray, 25 m above the real one at the
 *    target**: it reported a level view and a crowd in frame for a pose whose
 *    frames put the crowd on the bottom edge of the picture. This module scores
 *    every body against `lookAt(camera, target)`, the ray the renderer uses, by
 *    projecting the body into the camera's own frame — the same three vectors
 *    `Object3D.lookAt` builds, with the camera's up axis the world's.
 *
 * The old anchor's own frames are the evidence for the second: at tick 2996 its
 * camera stood (-390.8, 30.0, -493.4) looking at (-407.8, 15.2, -480.4), and the
 * 311 bodies in the frame all projected to rows 636-710 of 720 — visible, and
 * photographing the pavement. The corrected scorer counts 457 moving bodies for
 * that pose at tick 3000 and reports their pixel rows, which is the number that
 * makes the defect visible without opening a frame.
 *
 * ## What the report carries, and why
 *
 * A count is not enough to pick an anchor, so every scored pose carries:
 *
 * - `pitchDegrees`: the optical axis below horizontal. This is the number the
 *   audit quotes as "34.7 degrees down". At the old margin-ring anchor the
 *   corrected tool reports 28.7, against the frame's own 34.70 — the difference
 *   is the ground reader, `terrainIndex` against the driver's exact search.
 * - `bodiesNearCentre`: moving bodies whose projection lands in the frame's
 *   middle band, rows 120-600 of 720. A crowd on the frame's bottom edge passes
 *   a count and fails the point of the leg.
 * - `medianBodyPixelsDown` and `medianBodyDepthM`: where the counted bodies
 *   actually sit, so a reader can see a knot at 100 m of depth read as a count
 *   of 400 and as figures 7 px tall.
 * - `figurePixels`: a 1.7 m figure's height, pixels, at the median body's depth.
 * - `standM`, `cameraGroundM` and `targetGroundM`: the geometry the driver will
 *   reproduce, measured at the driver's own first ground radius rather than in a
 *   40 m box.
 *
 * ## A candidate has to be standable
 *
 * The camera's height above the ground is bought by the polar angle and the
 * distance together: `camera.y - target.y = distance * cos(polar)` with
 * `target.y` pinned, and `camera.y = cameraGround + standM`. So at a fixed
 * distance and stand height the polar follows, and a camera on ground high (or
 * low) enough that the required height above the target falls outside the ratio
 * the controls can express cannot stand where the candidate says it does. The
 * candidate's ground must be non-NaN, its stand height above that ground positive
 * and no lower than the leg's clearance floor — the lane holds the camera
 * `minClearanceM` above the ground beneath it (`FlythroughDriver.holdClearance`),
 * so a pose accepted below that floor is a pose the run would raise.
 */

export interface Point {
  x: number;
  z: number;
}

export interface GroundQuery {
  /**
   * The terrain height at a point, or NaN when the point is not over the built
   * mesh. A candidate is refused on NaN rather than given a fallback: a guessed
   * ground is exactly how a pose ends up aimed at pavement.
   */
  (x: number, z: number): number;
}

export interface Actor {
  x: number;
  z: number;
  bodies: number;
  speed: number;
  /**
   * The terrain height under this position, metres, or NaN when it is not over
   * the built mesh.
   *
   * Carried on the actor rather than looked up per pose because the ground under
   * a body is the same fact for every candidate camera, and a full scan asks it
   * for every pose: 3,000 actors against 30,000 poses was 45 million grid queries
   * and a run that did not finish. A caller that has no ground to hand may leave
   * it undefined and the scorer will read its own; a caller that has one must
   * fill it, and `distinctPositions` does.
   */
  groundM: number;
}

export interface Candidate {
  camera: Point;
  way: string;
  /**
   * The azimuth the camera **looks**, radians: the direction from the camera to the
   * target, since `scorePose` builds the target as `camera + (sin, cos) * distance`.
   *
   * This is not `CameraSnapshot.azimuth`, which is `controls.getAzimuthalAngle()` and
   * measures from the target to the camera. The two are a half turn apart, so a pose
   * this tool ranks first flies on the far side of its own target when its azimuth is
   * handed to the route unchanged. `tools/flythrough/plan.ts` carries the run's
   * numbers for that and `test/flythrough-crowd-anchor.test.ts` pins them.
   */
  azimuth: number;
  distance: number;
}

export interface AimOptions {
  /**
   * How far above the ground beneath it the camera stands, metres. The lane's
   * street legs aim at 3 m.
   */
  standM: number;
  /**
   * The least stand height a candidate may have and still be one the run can
   * hold, metres. The lane's street legs say 2 m.
   */
  minClearanceM: number;
  /**
   * A body's centre above its own ground, metres. 0.9 puts the aim at chest
   * height on a 1.7 m figure.
   */
  bodyHeightM: number;
  fovYDegrees: number;
  aspect: number;
  /** The capture height the pixel figures are computed against. */
  frameHeightPx: number;
  /** The depths a scored body may sit at, metres along the view axis. */
  minDepthM: number;
  maxDepthM: number;
  /**
   * How many sightings one pose keeps, in whatever order they were met.
   *
   * A count is all the ranking needs; the list is for a reader checking the
   * geometry, and a 26 m frame at 3 m holds hundreds of bodies. Keeping every one
   * of them for every candidate costs gigabytes — the first version of this
   * module ran the tool out of heap at 4 GB — and buys nothing: `moving` carries
   * the count whatever this list holds.
   */
  maxSightings: number;
  /**
   * The frame rows counted as the middle band, as fractions of the height.
   *
   * A body projected inside the frame but on its bottom edge is a body the frame
   * does not show as a person, so the count that decides an anchor is the one in
   * this band and not the one inside the viewport.
   */
  centreBandTop: number;
  centreBandBottom: number;
  /**
   * The steepest optical axis a candidate may have and stay in the ranking,
   * degrees below horizontal.
   *
   * This is not a preference, it is a salvage test. `target.y` is pinned at the
   * origin datum and the camera stands `standM` above whatever ground is under
   * it, so the axis drops `cameraGround + standM - 15.2` metres over the leg's
   * distance, and nothing about stand height or distance can lift a camera on
   * high ground out of a steep look-down: raising the distance lowers the ratio
   * and lowers the camera with it. A candidate past this angle is a frame of
   * pavement whatever its counts say, and the audit's anchor is the proof — 28.7
   * degrees, with every body it counts on the frame's bottom edge.
   */
  maxPitchDegrees: number;
  /**
   * The range at which a body is near enough to be the leg's subject, metres.
   *
   * The leg judges whether figures hold their shape between frames, whether they
   * interpenetrate and whether a crowd reads as a crowd, and all three are
   * judgements about a figure's pixels: a body at 112 m is 10 px tall in this
   * frame and a count of 500 of them says nothing about any of it. `nearMoving` is
   * the count inside this range, and `minNearMoving` is the floor a candidate has
   * to clear to stay in the ranking.
   */
  nearRangeM: number;
  /** The fewest walking bodies inside `nearRangeM` a candidate may have. */
  minNearMoving: number;
  /** Above this speed a body counts as walking rather than standing. */
  movingSpeedMps: number;
}

export interface Sighting {
  x: number;
  z: number;
  bodies: number;
  depthM: number;
  /** Where the body's centre projects: column and row, pixels, origin top-left. */
  pixelX: number;
  pixelY: number;
}

export interface ScoredPose {
  camera: Point;
  way: string;
  azimuth: number;
  distance: number;
  target: Point;
  /** The ground under the camera and under the target, metres. */
  cameraGroundM: number;
  targetGroundM: number;
  /** The camera's height above the ground beneath it, metres. */
  standM: number;
  /** The polar angle the pins imply; NaN when the pose is not standable. */
  polarRad: number;
  /**
   * The angle of the optical axis below horizontal, degrees. Positive is looking
   * down. This is the ray the renderer uses: camera to the pinned target height.
   */
  pitchDegrees: number;
  /** The camera's eye height, world metres, where `pitchDegrees` is zero. */
  cameraY: number;
  /** Distinct positions the frame holds: all, walking, and vehicles. */
  positions: number;
  moving: number;
  vehicles: number;
  /** Walking bodies whose projection lands in the frame's middle band. */
  bodiesNearCentre: number;
  /** Walking bodies inside `nearRangeM` and in frame: the leg's actual subject. */
  nearMoving: number;
  /** The nearest walking body in frame, metres along the axis; NaN when none is. */
  nearestBodyDepthM: number;
  /**
   * Where the moving bodies sit: the median projection row, pixels down from the
   * top, and the median depth along the view axis. NaN when nothing is in frame.
   */
  medianBodyPixelsDown: number;
  medianBodyDepthM: number;
  /** A 1.7 m figure at `medianBodyDepthM`: how tall it is, pixels. */
  figurePixels: number;
  /** The walking positions the frame holds, with their depths along the axis. */
  sighted: Sighting[];
  /** False when the camera cannot stand here, with `rejected` saying why. */
  standable: boolean;
  /** Why a pose was refused, or "" when it was not. */
  rejected: string;
}

/**
 * Distinct positions in a set of actor dumps, with the fastest speed seen at each.
 *
 * `ground` fills each actor's terrain height once, which is what makes a full scan
 * affordable; leaving it out is allowed and the scorer will read its own ground per
 * pose, which is only sane for a handful of candidates.
 */
export function distinctPositions(actors: readonly number[][], ground?: GroundQuery): Actor[] {
  const seen = new Map<string, { bodies: number; speed: number }>();
  for (const actor of actors) {
    const key = `${actor[0]!.toFixed(2)}:${actor[2]!.toFixed(2)}`;
    const held = seen.get(key);
    if (held === undefined) seen.set(key, { bodies: 1, speed: Math.abs(actor[3] ?? 0) });
    else {
      held.bodies += 1;
      held.speed = Math.max(held.speed, Math.abs(actor[3] ?? 0));
    }
  }
  return [...seen.entries()].map(([key, held]) => {
    const [x, z] = key.split(":").map(Number) as [number, number];
    return { x, z, bodies: held.bodies, speed: held.speed, groundM: ground === undefined ? Number.NaN : ground(x, z) };
  });
}

/**
 * The highest terrain within a radius of a point, from a grid of cell maxima.
 *
 * The grid is conservative — it answers with the highest ground within reach
 * rather than the ground at the point — and that is deliberate: a pose chosen
 * against a lower figure than the driver accepts is a pose the lane refuses. The
 * cell size decides what "reach" means. The default query reads the cells that
 * reach 20 m, which is the reader the first version of this tool used and the
 * reader the report quotes beside the tighter one, because the two disagreeing
 * is itself a fact about the terrain.
 */
export function groundGrid(positions: Float32Array | readonly number[], vertexCount: number, cellM = 8) {
  const peaks = new Map<string, number>();
  for (let index = 0; index < vertexCount; index += 1) {
    const key = `${Math.floor(positions[index * 3]! / cellM)}:${Math.floor(positions[index * 3 + 2]! / cellM)}`;
    const y = positions[index * 3 + 1]!;
    const held = peaks.get(key);
    if (held === undefined || y > held) peaks.set(key, y);
  }
  return (x: number, z: number, reachM = 20): number => {
    const cx = Math.floor(x / cellM);
    const cz = Math.floor(z / cellM);
    const span = Math.max(0, Math.ceil(reachM / cellM) - 1);
    let highest = Number.NaN;
    for (let dx = -span; dx <= span; dx += 1) {
      for (let dz = -span; dz <= span; dz += 1) {
        const y = peaks.get(`${cx + dx}:${cz + dz}`);
        if (y === undefined) continue;
        if (Number.isNaN(highest) || y > highest) highest = y;
      }
    }
    return highest;
  };
}

/**
 * The ground under a point at the radius the driver measures it with.
 *
 * `FlythroughDriver.standAt` reads `groundBelow`, which searches outward from 8 m
 * and answers with the highest terrain vertex inside the first radius that finds
 * anything; every frame's record carries the radius that answered. A tool that
 * measured the ground over a wider box would score a pose against ground the
 * driver never sees, which is what made the first version of this reader report
 * 27.5 m for a camera the driver stood on 26.36 m.
 *
 * A 2 m grid of cell maxima with a 4-cell reach is the compromise: it reads the
 * highest cell maximum within about 9 m, never lower than the driver's own
 * figure, and it is fast enough for a full scan of the walking network. It is not
 * the exact highest vertex inside 8 m; `groundGrid` is the wider reader the
 * report quotes beside it, and the two agreeing on which knots are on high ground
 * is what a decision needs.
 */
export function terrainIndex(positions: Float32Array | readonly number[], vertexCount: number, cellM = 2): GroundQuery {
  const peaks = new Map<string, number>();
  for (let index = 0; index < vertexCount; index += 1) {
    const key = `${Math.floor(positions[index * 3]! / cellM)}:${Math.floor(positions[index * 3 + 2]! / cellM)}`;
    const y = positions[index * 3 + 1]!;
    const held = peaks.get(key);
    if (held === undefined || y > held) peaks.set(key, y);
  }
  const span = Math.max(1, Math.ceil(8 / cellM));
  return (x: number, z: number): number => {
    const cx = Math.floor(x / cellM);
    const cz = Math.floor(z / cellM);
    let highest = Number.NaN;
    for (let dx = -span; dx <= span; dx += 1) {
      for (let dz = -span; dz <= span; dz += 1) {
        const y = peaks.get(`${cx + dx}:${cz + dz}`);
        if (y === undefined) continue;
        if (Number.isNaN(highest) || y > highest) highest = y;
      }
    }
    return highest;
  };
}

/**
 * The ratio the controls' polar angle can express, from `tools/flythrough/driver.ts`.
 *
 * `standAt` clamps `(cameraY - target.y) / distance` to `[0.02, 0.999]`, so a pose
 * outside that band is not a pose the driver can stand: it would clamp the angle
 * and leave the camera at a height nobody scored. Restated here rather than
 * imported, because the driver's copies are module-private; a disagreement would
 * be caught by the tool refusing a pose the driver could stand, which is the safe
 * direction of the two.
 */
const MIN_HEIGHT_RATIO = 0.02;
const MAX_HEIGHT_RATIO = 0.999;
/** How tall the figure `figurePixels` is computed for, metres. */
export const FIGURE_HEIGHT_M = 1.7;

/** The controls' target height, `GROUND_AT_ORIGIN_M` in `src/world/scene-data.ts`. */
export const TARGET_Y_M = 15.2;

/** A camera basis built the way `Object3D.lookAt` builds it, up axis the world's. */
function cameraFrame(camera: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) {
  const forward = { x: target.x - camera.x, y: target.y - camera.y, z: target.z - camera.z };
  const length = Math.hypot(forward.x, forward.y, forward.z);
  forward.x /= length;
  forward.y /= length;
  forward.z /= length;
  // right = normalize(cross(forward, up)) with up = (0, 1, 0)
  const rightLength = Math.hypot(-forward.z, forward.x);
  const right = { x: -forward.z / rightLength, y: 0, z: forward.x / rightLength };
  // up = cross(right, forward)
  const up = {
    x: right.y * forward.z - right.z * forward.y,
    y: right.z * forward.x - right.x * forward.z,
    z: right.x * forward.y - right.y * forward.x,
  };
  return { forward, right, up };
}

/**
 * Score one candidate pose against one dump.
 *
 * The returned `sighted` list is the walking bodies the frame holds, each with the
 * depth it sits at and the pixel it projects to, so a reader can check the count
 * against the geometry rather than trust it.
 */
export function scorePose(
  candidate: Candidate,
  pedestrians: readonly Actor[],
  vehicles: readonly Actor[],
  ground: GroundQuery,
  options: AimOptions,
): ScoredPose {
  const target: Point = {
    x: candidate.camera.x + Math.sin(candidate.azimuth) * candidate.distance,
    z: candidate.camera.z + Math.cos(candidate.azimuth) * candidate.distance,
  };
  const cameraGroundM = ground(candidate.camera.x, candidate.camera.z);
  const targetGroundM = ground(target.x, target.z);
  const refuse = (reason: string): ScoredPose => ({
    camera: candidate.camera,
    way: candidate.way,
    azimuth: candidate.azimuth,
    distance: candidate.distance,
    target,
    cameraGroundM,
    targetGroundM,
    standM: Number.NaN,
    polarRad: Number.NaN,
    pitchDegrees: Number.NaN,
    cameraY: Number.NaN,
    positions: 0,
    moving: 0,
    vehicles: 0,
    bodiesNearCentre: 0,
    nearMoving: 0,
    nearestBodyDepthM: Number.NaN,
    medianBodyPixelsDown: Number.NaN,
    medianBodyDepthM: Number.NaN,
    figurePixels: Number.NaN,
    sighted: [],
    standable: false,
    rejected: reason,
  });

  if (Number.isNaN(cameraGroundM)) {
    return refuse(
      `no terrain within reach of the camera at (${candidate.camera.x.toFixed(1)}, ${candidate.camera.z.toFixed(1)}), ` +
        "so nothing can say what height it would stand at",
    );
  }
  if (Number.isNaN(targetGroundM)) {
    return refuse(
      `no terrain within reach of the target at (${target.x.toFixed(1)}, ${target.z.toFixed(1)}), so the frame's ` +
        "centre is off the built mesh and there is no ground for the subject to stand on",
    );
  }

  // The polar angle the pins imply: `camera.y = cameraGround + standM` and
  // `camera.y = target.y + distance * cos(polar)` with the app's target datum.
  // The controls cannot express a ratio outside the clamp, so a pose that needs
  // one cannot be stood at all.
  const standM = options.standM;
  const wantedY = cameraGroundM + standM;
  const ratio = (wantedY - TARGET_Y_M) / candidate.distance;
  if (ratio > MAX_HEIGHT_RATIO || ratio < MIN_HEIGHT_RATIO) {
    return refuse(
      `a camera standing ${standM} m above ${cameraGroundM.toFixed(2)} m of ground is ${wantedY.toFixed(2)} m up, ` +
        `which is ${(ratio * candidate.distance).toFixed(2)} m from the app's pinned ${TARGET_Y_M} m target at ` +
        `${candidate.distance.toFixed(1)} m of distance — the controls' polar angle only spans ` +
        `${(MIN_HEIGHT_RATIO * candidate.distance).toFixed(2)} to ${(MAX_HEIGHT_RATIO * candidate.distance).toFixed(2)} m ` +
        "there, so this camera cannot stand where the candidate says it does",
    );
  }
  if (!(standM > 0) || standM < options.minClearanceM) {
    return refuse(
      `the camera would stand ${standM} m above ${cameraGroundM.toFixed(2)} m of ground, under the ${options.minClearanceM} m ` +
        "clearance floor this leg holds, so the run would raise it and the pose scored is not the pose flown",
    );
  }

  const polarRad = Math.acos(ratio);
  const camera = { x: candidate.camera.x, y: TARGET_Y_M + candidate.distance * Math.cos(polarRad), z: candidate.camera.z };
  const frame = cameraFrame(camera, { x: target.x, y: TARGET_Y_M, z: target.z });
  const halfY = (options.fovYDegrees * Math.PI) / 360;
  const tanY = Math.tan(halfY);
  const tanX = Math.tan(Math.atan(tanY * options.aspect));
  const pitchDegrees = (Math.asin(-frame.forward.y) * 180) / Math.PI;
  if (pitchDegrees > options.maxPitchDegrees) {
    return refuse(
      `the camera stands ${standM} m above ${cameraGroundM.toFixed(2)} m of ground, so its optical axis to the app's ` +
        `pinned ${TARGET_Y_M} m target points ${pitchDegrees.toFixed(1)} degrees down — past the ` +
        `${options.maxPitchDegrees} degrees this leg accepts, and no stand height or distance can lift it: the axis ` +
        `drops ${(wantedY - TARGET_Y_M).toFixed(2)} m over the leg's ${candidate.distance.toFixed(1)} m whatever the ` +
        "distance is. A frame at this angle is a frame of pavement",
    );
  }
  const bandTop = options.centreBandTop * options.frameHeightPx;
  const bandBottom = options.centreBandBottom * options.frameHeightPx;

  /**
   * The actors a pose holds, each scored where it stands and against the ray the
   * renderer uses.
   *
   * `bodyHeightM` is the point on the actor the projection measures: a walking
   * body's centre for a pedestrian, the ground contact for a vehicle, whose own
   * origin is already there.
   */
  const sighting = (
    list: readonly Actor[],
    bodyHeightM: number,
    walkingOnly: boolean,
  ): { total: number; centre: number; near: number; nearest: number; entries: Sighting[]; rows: number[]; depths: number[] } => {
    let total = 0;
    let centre = 0;
    let near = 0;
    let nearest = Number.POSITIVE_INFINITY;
    const entries: Sighting[] = [];
    const rows: number[] = [];
    const depths: number[] = [];
    for (const entry of list) {
      if (walkingOnly && entry.speed <= options.movingSpeedMps) continue;
      // The actor's own ground when the caller precomputed it; the query only for
      // actors a caller built by hand. NaN means off the mesh either way.
      const bodyGroundM = Number.isNaN(entry.groundM) ? ground(entry.x, entry.z) : entry.groundM;
      if (Number.isNaN(bodyGroundM)) continue;
      const body = { x: entry.x, y: bodyGroundM + bodyHeightM, z: entry.z };
      const dx = body.x - camera.x;
      const dy = body.y - camera.y;
      const dz = body.z - camera.z;
      const depth = dx * frame.forward.x + dy * frame.forward.y + dz * frame.forward.z;
      if (depth < options.minDepthM || depth > options.maxDepthM) continue;
      const right = dx * frame.right.x + dy * frame.right.y + dz * frame.right.z;
      const up = dx * frame.up.x + dy * frame.up.y + dz * frame.up.z;
      const pixelX = (right / (depth * tanX) + 1) * (options.frameHeightPx * options.aspect) * 0.5;
      const pixelY = (1 - up / (depth * tanY)) * options.frameHeightPx * 0.5;
      if (pixelX < 0 || pixelX > options.frameHeightPx * options.aspect) continue;
      if (pixelY < 0 || pixelY > options.frameHeightPx) continue;
      total += entry.bodies;
      rows.push(pixelY);
      depths.push(depth);
      if (depth < nearest) nearest = depth;
      if (depth <= options.nearRangeM) near += entry.bodies;
      if (pixelY > bandTop && pixelY < bandBottom) centre += entry.bodies;
      if (entries.length < options.maxSightings) {
        entries.push({ x: entry.x, z: entry.z, bodies: entry.bodies, depthM: depth, pixelX, pixelY });
      }
    }
    return { total, centre, near, nearest, entries, rows, depths };
  };

  const every = sighting(pedestrians, options.bodyHeightM, false);
  const people = sighting(pedestrians, options.bodyHeightM, true);
  const cars = sighting(vehicles, 0, false);
  const median = (values: number[]): number => {
    if (values.length === 0) return Number.NaN;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
  };
  const medianBodyDepthM = median(people.depths);

  if (people.near < options.minNearMoving) {
    return refuse(
      `${people.near} walking bodies are inside the frame within ${options.nearRangeM} m of the camera and this leg ` +
        `needs ${options.minNearMoving}: a crowd further away than that is a count of figures too small to judge. ` +
        `The nearest body in frame is ${Number.isFinite(people.nearest) ? `${people.nearest.toFixed(1)} m` : "none"}`,
    );
  }

  return {
    camera: candidate.camera,
    way: candidate.way,
    azimuth: candidate.azimuth,
    distance: candidate.distance,
    target,
    cameraGroundM,
    targetGroundM,
    standM,
    polarRad,
    pitchDegrees,
    cameraY: camera.y,
    positions: every.total,
    moving: people.total,
    vehicles: cars.total,
    bodiesNearCentre: people.centre,
    nearMoving: people.near,
    nearestBodyDepthM: Number.isFinite(people.nearest) ? people.nearest : Number.NaN,
    medianBodyPixelsDown: median(people.rows),
    medianBodyDepthM,
    figurePixels: Number.isNaN(medianBodyDepthM)
      ? Number.NaN
      : (FIGURE_HEIGHT_M / medianBodyDepthM) * (options.frameHeightPx / (2 * tanY)),
    sighted: people.entries,
    standable: true,
    rejected: "",
  };
}

export interface DumpScore {
  tick: number;
  bodies: number;
  distinctPositions: number;
  movingPositions: number;
  vehicleBodies: number;
  vehiclePositions: number;
  candidateCameras: number;
  posesScored: number;
  posesRefused: number;
  results: ScoredPose[];
}

/**
 * Score every camera in `cameras` at every distance and azimuth.
 *
 * `cameras` are walking-way points, which is where the driver's `standAt` can put
 * the camera; the caller decides which of them are near the population.
 */
export function scoreDump(
  dump: { tick: number; pedestrians: number[][]; vehicles: number[][] },
  cameras: readonly { x: number; z: number; id: string }[],
  ground: GroundQuery,
  options: AimOptions,
  azimuths: readonly number[],
  distances: readonly number[],
): DumpScore {
  const people = distinctPositions(dump.pedestrians, ground);
  const moving = people.filter((entry) => entry.speed > options.movingSpeedMps);
  const vehicles = distinctPositions(dump.vehicles, ground);
  const results: ScoredPose[] = [];
  for (const camera of cameras) {
    for (const distance of distances) {
      for (const azimuth of azimuths) {
        results.push(
          scorePose({ camera: { x: camera.x, z: camera.z }, way: camera.id, azimuth, distance }, moving, vehicles, ground, options),
        );
      }
    }
  }
  return {
    tick: dump.tick,
    bodies: dump.pedestrians.length,
    distinctPositions: people.length,
    movingPositions: moving.length,
    vehicleBodies: dump.vehicles.length,
    vehiclePositions: vehicles.length,
    candidateCameras: cameras.length,
    posesScored: results.length,
    posesRefused: results.filter((entry) => !entry.standable).length,
    results,
  };
}

/**
 * The score order this tool ranks by: walking bodies inside the near range and in
 * the frame's middle band, then vehicles at four each.
 *
 * `nearMoving` rather than `moving`, for the reason `nearRangeM` gives: a body 100 m
 * out is a count, not a subject. A pose that has no near crowd is refused before it
 * reaches here, so the ranking is between poses that all have one.
 */
export function poseScore(pose: ScoredPose): number {
  return pose.standable ? pose.nearMoving + pose.vehicles * 4 : Number.NEGATIVE_INFINITY;
}

/**
 * One pose per 10 m cell and per 7.5 degree of bearing, keeping the best.
 *
 * Two candidate cameras a few metres apart at the same bearing are the same
 * frame, so leaving both in the ranking would fill the top five with one knot. A
 * refused pose scores below every standable one, so a cell whose only poses
 * cannot be stood disappears from the ranking rather than leading it.
 */
export function bestPerCell(results: readonly ScoredPose[], cellM = 10, azimuthCells = 48): ScoredPose[] {
  const byCell = new Map<string, ScoredPose>();
  for (const result of results) {
    const key =
      `${Math.round(result.camera.x / cellM)}:${Math.round(result.camera.z / cellM)}:` +
      `${Math.round((result.azimuth * azimuthCells) / (Math.PI * 2))}`;
    const held = byCell.get(key);
    if (held === undefined || poseScore(result) > poseScore(held)) byCell.set(key, result);
  }
  return [...byCell.values()];
}

/**
 * The flythrough lane's capture plan: a route through the city, in world metres,
 * driven through the controls.
 *
 * This lane exists for one criterion, from `docs/work/0_shibuya-1km/plan.md`
 * (Phase 10, item 33): "a multi-angle, multi-zoom sweep **and a flythrough driven
 * through the real controls** both come back clean". The sweep exists. The
 * flythrough did not, and neither can the two criteria that are about motion
 * rather than about a pose:
 *
 * - "The dusk preset renders with ACES tone mapping, bloom carrying the neon,
 *   SSAO and TAA, and holds still — **no flicker or crawl over a moving
 *   sequence**." Flicker and crawl are properties *between* adjacent frames, so
 *   no still frame contains them and no contact sheet of stills can answer them.
 * - The population criteria — vehicles holding lanes, pedestrians surging,
 *   nothing interpenetrating — are written "watched over a run rather than
 *   sampled in one frame" for the same reason.
 *
 * So the route below is a *flight*: four legs, each a continuous movement of two
 * to four inputs at once, at four heights from 675 m above the ground to 3 m, with
 * every frame one step of one movement rather than an unrelated view.
 *
 * ## The route, in world metres
 *
 * The origin is the Shibuya Scramble Crossing, +X is east and +Z is south, and
 * every number below is a world position or a height above the terrain in metres.
 * Nothing here is a pixel count or a camera pose: the pixels a drag buys are the
 * driver's business and the pose is the controls' answer, which each frame's
 * record carries.
 *
 * | Leg | Frames | Target | Camera height | Distance | What moves |
 * | --- | --- | --- | --- | --- | --- |
 * | `overview` | 11 | origin to the crowd's corner | 675 to 60 m | 620 to 170 m | pan 700 m north-west, zoom, bearing held |
 * | `approach` | 12 | the crowd | 60 to 3 m | 170 to 26 m | descent and an 82.5 degree swing onto the crowd |
 * | `crowd` | 12 | through the crowd | 3 m | 26 to 18.8 m | a slow push, 1.2 m a step, then six frames with no input |
 * | `ascent` | 11 | the crowd, back to the crossing | 18.8 to 110 m | 18.8 to 620 m | climb, swing, and a pan home |
 *
 * ## Why the crowd is the far corner, and why that is not a choice
 *
 * The population's own distribution decides this, and it is measured rather than
 * assumed. At the default seed the app draws — 5,970,698, because
 * `populationFromQuery` falls back to the scene seed unless `?seed=` is present,
 * so this lane captures with no `?seed=` at all — the crowd is not at the
 * crossing. It stands in knots along the edges of the area of interest, and the
 * largest of them is 600 m north-west of the origin. The crossing itself holds
 * almost nobody, and vehicles thin out with time (59 active at tick 2,400, 45 at
 * 7,200, 14 at 20,000), so the flight leaves early and aims at a knot rather than
 * at the middle of the map.
 *
 * The pose it aims at is now a scored one rather than a plain waypoint. The
 * route's own anchor was picked from a cell centre before the scoring tool could
 * run, and the tool has run:
 *
 *   node tools/flythrough/aim.ts --dump artifacts/flythrough2/reference-dump-t5400.json
 *
 * scores candidate poses over the 3,187 walking-way positions this network offers
 * and reports three anchors at tick 5,400, each an actual standable pose with the
 * way id it stands on. Its output is `tools/flythrough/aim.json`, the tool's own
 * default path, and the three anchors are:
 *
 * - most moving pedestrians in frame: camera `(-386.2, -496.3)`, ground 27.5 m at
 *   the tool's sampling, target `(-407, -480)` at 26 m, 415 moving of 487 distinct
 *   positions in frame and 0 vehicles, way `walk:665322366:0:0:ground0:f`;
 * - best overall (moving + 4 x vehicles): camera `(344.1, 396.5)`, target
 *   `(365, 381)` at 26 m, 395 moving and 12 vehicles, way
 *   `walk:1086844875:0:0:ground0:f`;
 * - most vehicles: camera `(292.8, 426.4)`, target `(319, 426)` at 26 m, 22
 *   vehicles with 313 moving, way `walk:1228977019:0:0:ground0:f`.
 *
 * The route stands on the first of them, and the reason is the leg's own
 * criterion rather than the score: the crowd leg judges whether figures hold their
 * shape, whether they interpenetrate and whether a crowd reads as a crowd, so
 * moving pedestrians are the subject and a vehicle in frame buys nothing for it.
 * `FRAME_FLOORS.vehiclesDrawn` is 1 across the whole route, not per leg, and the
 * legs over the district carry the traffic. That anchor is also the dump's highest
 * moving-pedestrian count, against 395 at the best-overall cell, and it leaves the
 * route's own shape alone: the flight already aims at this knot, so the scored
 * pose corrects the bearing and the distance instead of re-aiming the approach and
 * the ascent at the other side of the map.
 *
 * `CROWD_TARGET` and `CROWD_CAMERA` below are that pose, and they are the two
 * probe points the tool itself used: the target it aimed its ray at, and the
 * camera position on a walking way that its scoring accepted. They are **aim
 * anchors**: the flight moves the controls' target to the first and stands the
 * camera at the second, and the frames say where the camera actually ended up.
 * `CROWD_DISTANCE_M` below is measured between them and comes out at the tool's
 * own 26 m: the tool scored the pair as 26 m apart, and its ray endpoint is 26 m
 * from its camera position rather than a rounded waypoint. The route pulls in to
 * that figure rather than to a number written here, and the crowd leg's 7.2 m push
 * then takes the camera to 18.8 m.
 *
 * The bearing below is the **controls'** azimuth, which is the direction from the
 * target to the camera; the tool reports the opposite, the direction a camera
 * looking at the crowd faces. The tool requires its candidate target to be the
 * frame's centre, so the controls' target is exactly what it aimed its ray at and
 * the controls' azimuth is its own plus half a turn.
 *
 * One number below is deliberately the driver's and not the tool's. The ground
 * under the scored camera is 26.4 m by `groundBelow`, the function `standAt`
 * measures a camera's height with, against the tool's 27.5 m, because the tool
 * takes the highest terrain in a 40 m box on an 8 m grid and the driver searches
 * from 8 m outward. `standAtM` is a height above the terrain under the camera, so
 * the driver's figure is the datum that means something here.
 *
 * ## The clock
 *
 * Frames are captured as the movement runs, so the simulated clock advances at
 * whatever rate the machine pays for. Nothing here waits on a tick inside a leg:
 * a leg is a fixed number of steps, each step a small input plus a frame, and the
 * ticks each frame landed on are recorded beside it. The one tick bound is
 * `holdToTick`, used once at the start so the first leg does not cross a city
 * whose crowd has not formed.
 */

import type { LegStep } from "./driver.js";

export interface Leg {
  /** Directory under the lane root, and the prefix of every frame in it. */
  name: string;
  /** The half of the criterion this leg is here to judge. */
  purpose: string;
  /** What the frames should show, from the measurements above. */
  expectation: string;
  /**
   * Capture every step, or only every Nth.
   *
   * 1 is the default and is what a flicker judgement needs. A larger stride
   * keeps a long movement affordable and is recorded in the manifest, because a
   * frame pair 3 seconds apart answers a different question from one 0.7 seconds
   * apart and the reader has to know which they are looking at.
   */
  captureEvery: number;
  /** The steps, in order. */
  steps: readonly LegStep[];
  /**
   * The least clearance under the camera this leg will accept, metres.
   *
   * A floor and not a target: `holdClearance` only ever raises the camera, and
   * `standAt` is the aim. The street legs say 2 m because the camera stands 3 m
   * above the footway — a floor above the aim would fight it.
   */
  minClearanceM: number;
  /** Do not let this leg finish before the population reaches this tick. */
  holdToTick?: number;
  /**
   * The largest right-button drag one step of this leg may emit, CSS pixels.
   *
   * What a drag can afford is a property of the pose: at 620 m, 28 px buys 18 m of
   * target travel and at 28 m it buys 1.4 m. An earlier version of this lane
   * capped this at 28 px for every leg and recorded the cost — a 120 m crossing
   * leg became 13 m — so the limit is per leg and the plan says which.
   */
  panLimitPx: number;
  /** A note for the manifest about what this leg's pan is doing. */
  panNote: string;
}

/** Where the app opens: `INITIAL_VIEW` in `src/render/camera.ts`, restated. */
export const OPENING_AZIMUTH = Math.PI * 0.25;
export const OPENING_DISTANCE_M = 620;

/**
 * The crowd: the densest knot of moving pedestrians the aim measurement found.
 *
 * A scored pose of `tools/flythrough/aim.ts`, re-measurable with
 * `--dump artifacts/flythrough2/reference-dump-t5400.json`. It scores every
 * candidate camera on a walking way by the number of *distinct positions* in
 * frame and by how many of them are moving, because the population stacks several
 * bodies on one position and a camera sees positions. The tool's own report for
 * this pose, and the reasoning that chose it over the other two anchors, is in the
 * header above.
 */
export const CROWD_TARGET = Object.freeze({ x: -406.825, z: -480.469 });
/** The walking way the scored pose stands on, 26 m north-west of the target. */
export const CROWD_CAMERA = Object.freeze({ x: -386.198, z: -496.297 });
/**
 * The scored pose's own separation, measured between the two points above.
 *
 * Derived rather than written down a second time: the crowd leg's push divides by
 * it to get a unit direction, and a constant that disagrees with the pair it
 * divides is a push that changes the distance the pose was scored at.
 */
export const CROWD_DISTANCE_M = Math.hypot(CROWD_CAMERA.x - CROWD_TARGET.x, CROWD_CAMERA.z - CROWD_TARGET.z);
if (Math.abs(CROWD_DISTANCE_M - 26) > 0.5) {
  throw new Error(
    `The crowd anchor's two points are ${CROWD_DISTANCE_M.toFixed(2)} m apart and the scored pose is at 26 m, so this ` +
      "pair is not the pose the scoring tool reported. Its camera and its target travel together: moving one without the " +
      "other moves the camera, re-aims the approach and the ascent, and lands the crowd leg somewhere nobody scored. " +
      "Re-run `node tools/flythrough/aim.ts --dump artifacts/flythrough2/reference-dump-t5400.json`.",
  );
}
export const CROWD_AZIMUTH = Math.atan2(CROWD_CAMERA.x - CROWD_TARGET.x, CROWD_CAMERA.z - CROWD_TARGET.z);
export const CROWD_STAND_M = 3;

/** A point on the way back to the crossing, which the ascent pans through. */
export const ASCENT_WAYPOINT = Object.freeze({ x: -110, z: -120 });

/**
 * A ladder of distances and heights that holds one polar angle.
 *
 * The controls' target cannot be moved vertically, so the camera's height above
 * the ground is bought by the polar angle and the distance together: with
 * `camera.y - target.y = distance * cos(polar)`, a leg that halves its distance
 * while holding its angle halves the camera's height above the target — and above
 * a target at 15.2 m over ground that runs from 7 m to 39 m, that is not the
 * height the plan asked for.
 *
 * This ladder is the fix: every rung is computed from the height the leg wants
 * above the ground, so the polar angle barely changes along it and the vertical
 * control's corrections stay inside one step instead of fighting a descent.
 *
 * `TARGET_Y_M` is the app's own `GROUND_AT_ORIGIN_M` from
 * `src/world/scene-data.ts`, restated here because a plan written against the
 * wrong datum aims at the wrong height — and because the spec asserts every
 * frame's target height against it, which is how a frame whose camera was set
 * rather than driven is caught.
 */
export const TARGET_Y_M = 15.2;

function ladder(distances: readonly number[], heights: readonly number[]): readonly { distance: number; standM: number }[] {
  if (distances.length !== heights.length) {
    throw new Error(
      `A leg's ladder has ${distances.length} distances and ${heights.length} heights, so the two lists describe ` +
        "different flights. They are written as one rung per step on purpose: a rung missing a height is a step that " +
        "holds the angle and therefore does not hold the height it claims.",
    );
  }
  return distances.map((distance, index) => ({ distance, standM: heights[index]! }));
}

/**
 * Leg 1: the opening aerial travel, from over the crossing to over the crowd.
 *
 * The camera starts where the app opens — 620 m out at 45 degrees over the
 * crossing, 543 m up — and the leg does three things at once: it zooms out to the
 * whole area of interest and back in to 170 m, it pans the target 700 m
 * north-west onto the crowd's corner, and it holds the bearing. Holding the
 * bearing is not laziness: at 620 m the camera stands 543 m from its target on the
 * 45-degree diagonal, so a target 700 m north-west with a bearing swung towards
 * it would carry the camera out of the built scene, and a frame of the edge of the
 * mesh is not a frame of this city. With the bearing held the camera flies the
 * diagonal over the middle of the map and the crowd arrives from the south-east.
 *
 * The first step is the only one that moves nothing in the ground plane: it is the
 * zoom out to the whole box, 675 m above the ground, and it is the frame that says
 * whether the district reads as a city from the air before the flight starts.
 */
const OVERVIEW_LADDER = ladder(
  [620, 950, 760, 600, 470, 370, 290, 220, 175, 170, 170],
  [543, 675, 540, 425, 330, 260, 205, 155, 124, 60, 60],
);
const OVERVIEW_STEPS: readonly LegStep[] = OVERVIEW_LADDER.map((rung, index) => {
  const t = Math.min(1, index / 8);
  const previous = index === 0 ? OPENING_DISTANCE_M : OVERVIEW_LADDER[index - 1]!.distance;
  return {
    panToX: CROWD_TARGET.x * t,
    panToZ: CROWD_TARGET.z * t,
    zoom: rung.distance / previous,
    standAtM: rung.standM,
    standStepRad: 0.25,
    turnToAzimuth: OPENING_AZIMUTH,
    note:
      index === 0
        ? `the app's own opening pose, zooming out to ${rung.distance.toFixed(0)} m and ${rung.standM} m up`
        : `flying north-west: target (${(CROWD_TARGET.x * t).toFixed(0)}, ${(CROWD_TARGET.z * t).toFixed(0)}), ` +
          `${rung.distance.toFixed(0)} m out, ${rung.standM} m up`,
  };
});

/**
 * Leg 2: the descent and the swing that puts the camera on the crowd's side.
 *
 * Two movements at once, and they have to be ordered. The distance falls from
 * 170 m to 30 m and the height from 60 m to 3 m over the first six steps while
 * the bearing is still held, because a camera 170 m out that swings before it
 * closes would leave the area of interest; then the bearing swings the short way
 * onto the crowd over the last six, where the camera is under 60 m out and the
 * circle it turns on is small. The stand heights are a ladder down the descent,
 * so the camera arrives at the footway rather than over the roofs.
 *
 * The swing is 1.4399 rad, 82.5 degrees, from `OPENING_AZIMUTH` 0.7854 to
 * `CROWD_AZIMUTH` 2.2253. It is written as an interpolation *towards* the
 * crowd's bearing rather than as an angle that rises past it, and that is what
 * makes it arrive. The driver buys a bearing with a left-button drag whose
 * longest gesture is 40 px, which at this lane's 1280x720 canvas is 0.3491 rad,
 * so 1.4399 rad over six steps — 0.2400 rad a step — is inside the cap and the
 * last step lands on the crowd's bearing exactly. A swing written the other way
 * round, from 0.7854 up to 0.7854 + 1.4399 + 2*PI = 8.5085, asks for 1.2872 rad
 * a step, 3.7 times the cap, and the driver's own shortest-angle arithmetic then
 * flips sign twice on the way: the approach ended at azimuth 1.2872 rad, 0.9381
 * rad short of the crowd's, and the crowd leg opened on a hill face about 17 m
 * from the scored pose instead of at it. The run's clearance check caught that
 * and the fix is here, not in the check.
 *
 * Monotone because the short path is: no step below turns back on itself. That
 * is the "one direction" the long-way version was written for and did not have.
 *
 * The descent's last two rungs are `CROWD_DISTANCE_M` rather than a number written
 * here again, so the leg lands on the scored pose's own distance and the crowd leg
 * opens there with no zoom to make up. Written by hand the two disagreed — 26 m
 * here against the 26.000 m the anchor's own coordinates measure — and a route
 * whose approach and crowd legs aim at distances 1.6% apart is a disagreement the
 * next reader has to resolve. One number, in one place.
 */
const APPROACH_LADDER = ladder(
  [170, 140, 115, 95, 78, 64, 52, 43, 37, 33, CROWD_DISTANCE_M, CROWD_DISTANCE_M],
  [60, 48, 38, 30, 23, 17, 12, 8.5, 6, 4.5, 3.5, 3],
);
const APPROACH_STEPS: readonly LegStep[] = APPROACH_LADDER.map((rung, index) => {
  const previous = index === 0 ? 170 : APPROACH_LADDER[index - 1]!.distance;
  // The short way onto the crowd's own bearing: `turnTo` targets an absolute
  // azimuth and takes the shortest signed difference to it, so interpolating
  // towards `CROWD_AZIMUTH` is the path the driver can actually deliver. Every
  // step asks for 0.2400 rad against the 0.3491 rad a 40 px drag buys at this
  // canvas, where the long way round asks for 1.2872.
  const swing = index < 6 ? 0 : (index - 5) / 6;
  const azimuth = OPENING_AZIMUTH + (CROWD_AZIMUTH - OPENING_AZIMUTH) * swing;
  return {
    panToX: CROWD_TARGET.x,
    panToZ: CROWD_TARGET.z,
    zoom: rung.distance / previous,
    turnToAzimuth: azimuth,
    turnStepRad: 0.5,
    standAtM: rung.standM,
    standStepRad: 0.2,
    note:
      swing === 0
        ? `descending to ${rung.distance.toFixed(0)} m and ${rung.standM} m up, bearing still held`
        : `descending to ${rung.distance.toFixed(0)} m and ${rung.standM} m up, swinging to ` +
          `${((azimuth * 180) / Math.PI).toFixed(0)} deg`,
  };
});

/**
 * Leg 3: the crowd at three metres, then six frames the camera does not move for.
 *
 * The first six steps push the target 1.2 m a step away from the camera along the
 * line between them, which the camera follows: a slow push from the scored 26 m
 * into 18.8 m, about 4 cm of frame per step, which is the closest a 3 m eye height
 * can come without the crowd's own depth filling the frame with nothing but
 * shoulders. It closes **on** the pose the scoring tool accepted rather than past
 * it, so the leg opens where the tool's own candidate stood and its last frame
 * stands 7.2 m nearer the knot.
 *
 * The last six ask for nothing at all. That is deliberate and it is a different
 * measurement inside the same sequence: with the camera at rest and the population
 * still stepping, every change between those frames is the scene's own, so
 * flicker there is flicker with the camera's motion ruled out and a figure that
 * does not hold its shape is visible as itself. The damping tail is bounded and
 * recorded — `cameraTravelM` per frame — rather than assumed to be zero.
 */
const CROWD_PUSH_M = 1.2;
/** How many steps the crowd leg pushes for; the rest of it asks for nothing. */
const CROWD_PUSH_STEPS = 6;
/**
 * Where the crowd leg leaves the camera: the scored pose's distance less the push.
 *
 * The ascent opens here rather than at a distance of its own, because a leg that
 * claims a distance it did not reach computes every later step against the wrong
 * one — the same defect the approach ladder's ending had.
 */
export const CROWD_END_DISTANCE_M = CROWD_DISTANCE_M - CROWD_PUSH_M * CROWD_PUSH_STEPS;
const CROWD_STEPS: readonly LegStep[] = [
  ...Array.from({ length: CROWD_PUSH_STEPS }, (_, index) => {
    const push = CROWD_PUSH_M * (index + 1);
    const direction = {
      x: (CROWD_TARGET.x - CROWD_CAMERA.x) / CROWD_DISTANCE_M,
      z: (CROWD_TARGET.z - CROWD_CAMERA.z) / CROWD_DISTANCE_M,
    };
    return {
      panToX: CROWD_TARGET.x + direction.x * push,
      panToZ: CROWD_TARGET.z + direction.z * push,
      zoom: 1,
      turnToAzimuth: CROWD_AZIMUTH,
      standAtM: CROWD_STAND_M,
      note: `pushing in towards the crowd (${index + 1}/6), ${push.toFixed(1)} m`,
    };
  }),
  ...Array.from({ length: 6 }, () => ({
    zoom: 1,
    turnToAzimuth: CROWD_AZIMUTH,
    standAtM: CROWD_STAND_M,
    holdsCamera: true,
    note: "held: the camera asks for nothing, the population does not",
  })),
];

/**
 * Leg 4: the climb out, and the pan home.
 *
 * The first four steps turn the camera from the crowd back towards the crossing
 * while it climbs, and the distance grows from the crowd leg's own 18.8 m to 620 m
 * over the eleven with the target panning back across the district. The turn
 * happens first for the reason leg 2 reverses it: at 18.8 m, where the crowd leg
 * left the camera, a whole turn moves the camera round a 19 m circle, so it costs
 * nothing and cannot leave the scene, and at 620 m the same turn would be a 620 m
 * sweep of the camera's position.
 *
 * The camera ends where the app opened — 620 m out at 45 degrees over the
 * crossing — so the flight is a closed loop and the last frame is comparable with
 * the first.
 */
const ASCENT_LADDER = ladder(
  // The first rung is where the crowd leg left the camera, and the rest are the
  // distances this leg closes out to, reached by zooming as it climbs.
  [CROWD_END_DISTANCE_M, 30, 45, 75, 130, 210, 300, 400, 490, 570, 620],
  [18.8, 9, 16, 28, 45, 65, 85, 100, 110, 110, 110],
);
const ASCENT_STEPS: readonly LegStep[] = ASCENT_LADDER.map((rung, index) => {
  const previous = index === 0 ? CROWD_END_DISTANCE_M : ASCENT_LADDER[index - 1]!.distance;
  const t = Math.min(1, Math.max(0, (index - 2) / 8));
  // An unwrapped angle like the approach's old one, and this one converges, so it
  // stays. Checked against the driver's cap: the shortest-angle arithmetic
  // reverses at step 3, after 1.0472 rad the wrong way, and the last eight steps
  // turn the short way home — 3.538 rad of travel through eleven steps of 0.3491,
  // which is 3.840. It reaches `OPENING_AZIMUTH` at step 10 with one step spare,
  // and `test/flythrough-plan.test.ts` asserts it. It is not monotone, unlike the
  // approach's repaired swing, and a longer route would not fit the cap.
  const azimuth =
    index < 4
      ? CROWD_AZIMUTH + (OPENING_AZIMUTH + 2 * Math.PI - CROWD_AZIMUTH) * ((index + 1) / 4)
      : OPENING_AZIMUTH;
  return {
    panToX: CROWD_TARGET.x + (ASCENT_WAYPOINT.x - CROWD_TARGET.x) * t,
    panToZ: CROWD_TARGET.z + (ASCENT_WAYPOINT.z - CROWD_TARGET.z) * t,
    zoom: rung.distance / previous,
    turnToAzimuth: azimuth,
    turnStepRad: 0.6,
    standAtM: rung.standM,
    standStepRad: 0.25,
    note: `climbing to ${rung.distance.toFixed(0)} m and ${rung.standM} m up, bearing ${((azimuth * 180) / Math.PI).toFixed(0)} deg`,
  };
});

export const LEGS: readonly Leg[] = Object.freeze([
  {
    name: "overview",
    purpose:
      "The aerial half of the flight: a continuous travel across the district with the whole city in frame, where " +
      "roof lines, facades, the road surface and the bloom are judged as they slide, and where the whole km box " +
      "appears once at the widest zoom.",
    expectation:
      "620 m out over the crossing at 543 m up, zooming out to the whole box at 675 m, then panning 700 m " +
      "north-west to the crowd's corner while the distance falls to 170 m and the height to 60 m. The crossing and " +
      "its towers slide out of frame as the boundary knots come in.",
    captureEvery: 1,
    minClearanceM: 40,
    holdToTick: 1_200,
    panLimitPx: 200,
    panNote: "one long drag a step, affordable because the camera is 170-950 m from its target",
    steps: OVERVIEW_STEPS,
  },
  {
    name: "approach",
    purpose:
      "The aerial-to-street transition with a vertical axis, and the swing that puts the camera on the crowd's side: " +
      "the hardest thing in this lane for the tile traversal, the ambient occlusion and the bloom, and the leg where " +
      "a strobing light or a swimming shadow would be most visible.",
    expectation:
      "170 m to 30 m and 60 m up to 3 m over twelve steps, then an 82.5 degree swing onto the crowd while the camera " +
      "is under 60 m out. The frame should open on the district from 60 m up and close on a footway at eye height, " +
      "with the crowd arriving from a texture into people.",
    captureEvery: 1,
    minClearanceM: 2,
    panLimitPx: 60,
    panNote: "the target is already on the crowd, so the pan only holds it there",
    steps: APPROACH_STEPS,
  },
  {
    name: "crowd",
    purpose:
      "The crowd in motion at 3 m, which is the point of this lane: whether figures hold their shape between frames, " +
      "whether they interpenetrate, whether feet slide or float, and whether a crowd reads as a crowd rather than as " +
      "scattered props.",
    expectation:
      "Twelve frames from 30 m to 23 m at 3 m above the footway, looking at a knot of moving pedestrians with more " +
      "behind them. Six steps push the camera 7.2 m in; six ask for nothing, so any change between them is the " +
      "population's own.",
    captureEvery: 1,
    minClearanceM: 2,
    panLimitPx: 60,
    panNote: "slow drags: 1.2 m a step at 30 m is about 20 px",
    steps: CROWD_STEPS,
  },
  {
    name: "ascent",
    purpose:
      "Street to aerial in one movement: the turn at close range, then a climb with the vertical control on a rising " +
      "ladder, so the neon that filled the frame becomes a city of lights and the bloom is judged as the mip chain " +
      "and the exposure change.",
    expectation:
      "24 m to 620 m over eleven steps with the camera standing 3 to 110 m above the ground, the bearing turning " +
      "home over the first four and the target panning back across the district over the last eight. Roof level " +
      "about step 5; the whole city in frame from step 8.",
    captureEvery: 1,
    minClearanceM: 2,
    panLimitPx: 200,
    panNote: "long drags again as the camera climbs: the target travels about 700 m home",
    steps: ASCENT_STEPS,
  },
]);

/**
 * The URL this lane captures from.
 *
 * `?agents=1` is the population switch and this lane is judged with the
 * population running. **No `?seed=` and that is deliberate**: `populationFromQuery`
 * falls back to the scene seed unless the query carries one, so a run at
 * `?seed=9137` seeds the world and the population together and a route aimed at
 * one of them is aimed at neither. An earlier version of this lane captured at
 * `?seed=9137` and aimed its close legs at a footway measured at a population the
 * browser was not drawing.
 *
 * `time=dusk` is not a preference: the post-chain criterion this lane feeds is
 * written against the dusk preset, the one whose bloom carries the neon, and the
 * frames have to be at that preset for the "holds still over a moving sequence"
 * half of it to be judgeable at all. `style=satellite` is the style with
 * photographic materials, which is what a judgement about shimmer and crawl on
 * facades needs.
 */
export const CAPTURE_QUERY = "?agents=1&style=satellite&time=dusk";

/** The values `CAPTURE_QUERY` is expected to produce, checked before capture. */
export const EXPECTED_LIGHTING_PRESET = "dusk";
export const EXPECTED_POPULATION = Object.freeze({ pedestrians: 3_000, vehicles: 200 });

/**
 * The floor every leg's frames are checked against, over and above the pose.
 *
 * The city must actually be on screen and it must be inhabited: a frame of a
 * building wall at 3 m is a frame that judged nothing, and a flight through an
 * empty city answers nothing about the population criteria this lane feeds. The
 * numbers are floors and not targets, and they are recorded per frame so a run
 * that scrapes past one is visible as one.
 */
export const FRAME_FLOORS = Object.freeze({
  /** Drawn pedestrians in the frame's own record, at the far level or nearer. */
  pedestriansDrawn: 100,
  /** Drawn vehicles. The fleet is small at the ticks this lane captures. */
  vehiclesDrawn: 1,
  /**
   * Fraction of the frame's 16x9 grid of cells whose luminance shows structure:
   * a standard deviation above 12 absolute units, or above 2 with a cell mean
   * above 8 and a ratio above 30% of that mean. See `structuredFraction` in
   * `tools/flythrough/structure.ts`.
   */
  structuredPixels: 0.05,
});

/** Frames the plan intends, which is what the ledger promises. */
export const TOTAL_STEPS = LEGS.reduce((total, leg) => total + leg.steps.length, 0);

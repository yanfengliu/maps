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
 * | `overview` | 11 | origin to the crowd's corner | 675 to 60 m | 620 to 170 m | pan 593 m south-east, zoom, bearing held |
 * | `approach` | 12 | the crowd | 60 to 3 m | 170 to 26 m | descent and a 37.5 degree swing onto the crowd |
 * | `crowd` | 12 | through the crowd | 3 m | 26 to 18.8 m | a slow push, 1.2 m a step, then six frames with no input |
 * | `ascent` | 11 | the crowd, back to the crossing | 18.8 to 110 m | 18.8 to 620 m | climb, swing, and a pan home |
 *
 * ## Where the crowd is, and why the anchor moved
 *
 * The population's own distribution decides this, and it is measured rather than
 * assumed. At the default seed the app draws — 5,970,698, because
 * `populationFromQuery` falls back to the scene seed unless `?seed=` is present,
 * so this lane captures with no `?seed=` at all — the crowd is not at the
 * crossing. It stands in knots along the edges of the area of interest. The
 * crossing itself holds almost nobody, and vehicles thin out with time (59 active
 * at tick 2,400, 45 at 7,200, 14 at 20,000), so the flight leaves early and aims at
 * a knot rather than at the middle of the map.
 *
 * The anchor this leg flies is a scored one. The first scoring tool ranked a knot
 * on the area of interest's margin ring first, and the flight carried that pose for
 * a whole run: its camera stood on 26.4 m of ground, and the leg pointed 34.7
 * degrees down at pavement because the controls' target height is pinned at the
 * app's origin datum, 15.2 m. The audit is
 * `artifacts/quality-audit/register.md` §2.2. The tool was wrong in two ways, and
 * both are fixed:
 *
 * - it scored every visible body at `TARGET_Y_M + 0.9` — a constant 16.1 m in world
 *   Y, whatever the terrain under the body said — so a knot on 26 m ground scored
 *   as if it stood on the pavement. A body's height is now read off the terrain
 *   mesh, and a body whose ground is NaN is not scored at all;
 * - it drew the ray a body was compared against to `ground(target)`, not to the
 *   app's pinned target height, which is the ray the renderer uses. At the old
 *   anchor those two rays are 25 m apart at the target, so the tool reported a
 *   level view of a pose whose frames put the crowd on the bottom edge.
 *
 * `tools/flythrough/aim-score.ts` carries both rules, and
 * `test/flythrough-aim.test.ts` pins them.
 *
 * Re-measure with a dump taken at the tick this leg actually captures at, which is
 * about 3,000 rather than the 5,400 the first scoring used:
 *
 *   node tools/populated/probe.ts --ticks 3000 --dump-tick 3000 --dump-file artifacts/crowd-aim-fix/dump-current-t3000.json
 *   node tools/flythrough/aim.ts --dump artifacts/crowd-aim-fix/dump-current-t3000.json
 *
 * The tool now reports a pitch and a median body distance with every anchor, and
 * the anchor below is the pose it ranks first that the approach can also reach:
 * camera `(452.1, 353.9)` on 14.49 m of ground, target `(455.5, 379.7)` at 26 m,
 * 330 moving bodies of which 225 are inside 45 m, 17 vehicles, a 5.0 degree axis
 * and a 27 px figure at the median 43 m — way `walk:664819019:3:0:ground0:f`.
 *
 * `CROWD_TARGET` and `CROWD_CAMERA` below are that pose: the ray's far end, and the
 * camera position on a walking way that its scoring accepted. They are **aim
 * anchors**: the flight moves the controls' target to the first and stands the
 * camera at the second, and the frames say where the camera actually ended up.
 * `CROWD_DISTANCE_M` is the separation the tool scored, 26 m; the route pulls in to
 * that figure rather than to a number written here, and the crowd leg's 7.2 m push
 * then takes the camera to 18.8 m.
 *
 * The bearing below is the **controls'** azimuth, which is the direction from the
 * target to the camera; the view direction is the opposite one. The tool requires
 * its candidate target to be the frame's centre, so the controls' target is what it
 * aimed its ray at. This anchor's bearing is 7.5 degrees, so the approach turns 37.5
 * degrees instead of the old 82.5, and the swing's own arithmetic — the short-way
 * interpolation, whose long-way version cost a run — is in the approach leg below.
 *
 * ## The clock
 *
 * Frames are captured as the movement runs, so the simulated clock advances at
 * whatever rate the machine pays for. Nothing here waits on a tick inside a leg:
 * a leg is a fixed number of steps, each step a small input plus a frame, and the
 * ticks each frame landed on are recorded beside it. The one tick bound is
 * `holdToTick`, used once at the start so the first leg does not cross a city
 * whose crowd has not formed.
 *
 * The crowd leg is left where it was in the flight: it captures at about tick
 * 3,000, and this anchor is measured there. That is deliberate rather than lucky.
 * The re-aim's dump at tick 3,000 holds 1,979 moving positions against 1,607 at
 * 5,400, and the anchor itself is livelier early — 107 moving bodies within 25 m of
 * it at 3,000 against 6 at 5,400 — so a `holdToTick` that pushed the leg later would
 * buy a worse crowd, not a better one. The clock decision is recorded in
 * `docs/devlog/detailed/`.
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
 * The crowd: the knot the aim measurement scores first, re-planned onto low ground.
 *
 * A scored pose of `tools/flythrough/aim.ts`, re-measurable with
 * `--dump artifacts/crowd-aim-fix/dump-current-t3000.json`. It scores every
 * candidate camera on a walking way by the number of *distinct positions* in frame
 * and by how many of them are moving, because the population stacks several bodies
 * on one position and a camera sees positions.
 *
 * This pair replaces one whose camera stood on 26.4 m of ground at
 * `(-386.2, -496.3)`. The tool that chose it scored every body at a constant 16.1 m
 * and never asked whether the camera's axis was usable, so it ranked a knot on the
 * margin ring whose real crowd sat on the frame's bottom edge: the audit is
 * `artifacts/quality-audit/register.md` §2.2. The scorer now reads each body's
 * height off the terrain mesh, projects it into the camera's own frame, and refuses
 * a pose whose axis is steeper than 20 degrees or which holds no walking body
 * inside 45 m.
 *
 * The camera below stands on 14.49 m of ground — 0.47 m above the ground under the
 * target — so its axis to the app's pinned 15.2 m target is 5.0 degrees down where
 * the old anchor's was 34.7. At tick 3,000 this pose holds 330 moving bodies in
 * frame, 225 of them inside 45 m, the nearest 5.5 m out and the median at 43 m,
 * where a 1.7 m figure is 27 px tall. The old anchor held 457 moving bodies and not
 * one of them inside 45 m.
 *
 * The bearing is the swing's business as well as the framing's. The approach can
 * turn at most `40 px * 2*PI/720 = 0.3491` rad in one step, so its six turning steps
 * deliver at most 2.095 rad. This anchor's controls bearing is 0.1309 rad, a swing
 * of 0.654 rad from `OPENING_AZIMUTH` — 0.109 rad a step, seven times inside the
 * cap. A pair with a slightly higher count whose bearing asked for 0.3927 rad a step
 * was rejected for that reason alone.
 */
export const CROWD_AZIMUTH = (7.5 * Math.PI) / 180;
/** The separation the scoring tool scored this pose at, metres. */
export const CROWD_DISTANCE_M = 26;
export const CROWD_CAMERA = Object.freeze({ x: 452.07064295232846, z: 353.94944548056134 });
/** The ray's far end: the camera's own way point, 26 m along the bearing it looks down. */
export const CROWD_TARGET = Object.freeze({
  x: CROWD_CAMERA.x + Math.sin(CROWD_AZIMUTH) * CROWD_DISTANCE_M,
  z: CROWD_CAMERA.z + Math.cos(CROWD_AZIMUTH) * CROWD_DISTANCE_M,
});
/**
 * The anchor's own separation, measured between the two points above.
 *
 * Derived rather than written down a second time: the crowd leg's push divides by
 * it to get a unit direction, and a constant that disagrees with the pair it
 * divides is a push that changes the distance the pose was scored at. The two
 * points are constructed from `CROWD_DISTANCE_M`, so this can only disagree if a
 * later edit types one of them out by hand — which is exactly the edit it is here
 * to catch.
 */
export const CROWD_ANCHOR_DISTANCE_M = Math.hypot(CROWD_CAMERA.x - CROWD_TARGET.x, CROWD_CAMERA.z - CROWD_TARGET.z);
if (Math.abs(CROWD_ANCHOR_DISTANCE_M - CROWD_DISTANCE_M) > 0.5) {
  throw new Error(
    `The crowd anchor's two points are ${CROWD_ANCHOR_DISTANCE_M.toFixed(2)} m apart and the scored pose is at ` +
      `${CROWD_DISTANCE_M} m, so this pair is not the pose the scoring tool reported. Its camera and its target travel ` +
      "together: moving one without the other moves the camera, re-aims the approach and the ascent, and lands the crowd " +
      "leg somewhere nobody scored. Re-run `node tools/flythrough/aim.ts --dump " +
      "artifacts/crowd-aim-fix/dump-current-t3000.json`.",
  );
}
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
 * whole area of interest and back in to 170 m, it pans the target onto the crowd's
 * corner, and it holds the bearing. Holding the bearing is not laziness: at 620 m
 * the camera stands 543 m from its target on the 45-degree diagonal, and a bearing
 * swung towards a target this far away would carry the camera out of the built
 * scene, where a frame of the edge of the mesh is not a frame of this city. With
 * the bearing held the camera flies the diagonal over the middle of the map.
 *
 * The crowd is now 593 m south-east of the origin — it was 630 m north-west before
 * the anchor moved — so the pan is in the opposite direction along the same
 * diagonal, and the bearing still does not have to move. The crowd arrives from the
 * north-west corner of the frame instead of the south-east one.
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
        : `flying south-east: target (${(CROWD_TARGET.x * t).toFixed(0)}, ${(CROWD_TARGET.z * t).toFixed(0)}), ` +
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
 * The swing is 0.6545 rad, 37.5 degrees, from `OPENING_AZIMUTH` 0.7854 down to
 * `CROWD_AZIMUTH` 0.1309. It is written as an interpolation *towards* the crowd's
 * bearing rather than as an angle that rises past it, and that is what makes it
 * arrive. The driver buys a bearing with a left-button drag whose longest gesture is
 * 40 px, which at this lane's 1280x720 canvas is 0.3491 rad, so 0.6545 rad over six
 * steps — 0.1091 rad a step — is inside the cap with room to spare and the last step
 * lands on the crowd's bearing exactly.
 *
 * The interpolation is also a **cap** on the anchor: at most 2.095 rad can be
 * delivered over these six steps, so a crowd anchor whose bearing is more than that
 * from `OPENING_AZIMUTH` cannot be reached by this leg at all. That is why the aim
 * tool's highest-count pose is not the one below: its bearing asks for 0.3927 rad a
 * step.
 *
 * The long way round is what this replaced, and it cost a run. Written from 0.7854
 * up to `CROWD_AZIMUTH + 2*PI`, the old 82.5 degree swing asked for 1.2872 rad a
 * step, 3.7 times the cap, and the driver's own shortest-angle arithmetic then flips
 * sign twice on the way: the approach ended at azimuth 1.2872 rad, 0.9381 rad short
 * of the crowd's, and the crowd leg opened on a hill face about 17 m from the scored
 * pose instead of at it. The run's clearance check caught that and the fix is in the
 * arithmetic, not in the check.
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
  // step asks for 0.1091 rad against the 0.3491 rad a 40 px drag buys at this
  // canvas.
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
  // stays. Checked against the driver's cap by flying it through the driver's own
  // rotate arithmetic: the shortest-angle path reverses at step 3, after 1.0472 rad
  // the wrong way, and the last eight steps turn the short way home — 3.5343 rad of
  // travel through eleven steps whose cap is 0.3491 each, which is 3.840. It lands
  // exactly on `OPENING_AZIMUTH` at the final step, index 10 of 0..10; the tenth
  // step carries the last 0.0436 rad, so there is no spare step:
  // `test/flythrough-plan.test.ts` passes the last step only because its tolerance
  // is 0.05, and deleting that step leaves it green, 0.0436 rad short. It is not
  // monotone, unlike the approach's repaired swing, and a longer route would not
  // fit the cap.
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
      "620 m out over the crossing at 543 m up, zooming out to the whole box at 675 m, then panning 593 m " +
      "south-east to the crowd's corner while the distance falls to 170 m and the height to 60 m. The crossing and " +
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
      "170 m to 30 m and 60 m up to 3 m over twelve steps, then a 37.5 degree swing onto the crowd while the camera " +
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

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
 * | `overview` | 11 | origin to the crowd's corner | 675 to 60 m | 620 to 170 m | pan 619 m south-east, zoom, bearing held |
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
 * crossing itself holds almost nobody, and vehicles thin out with time (63 active
 * at tick 3,000, 38 at 6,000, 14 at 20,000), so the flight leaves early and aims at
 * a knot rather than at the middle of the map.
 *
 * The anchor this leg flies is a scored one, and the scoring tool has been wrong
 * twice. The first version ranked a knot on the area of interest's margin ring
 * first, and the flight carried that pose for a whole run: its camera stood on
 * 26.4 m of ground and the leg pointed 34.7 degrees down at pavement, because the
 * controls' target height is pinned at the app's origin datum, 15.2 m. The audit is
 * `artifacts/quality-audit/register.md` §2.2, and the tool was wrong in two ways,
 * both fixed:
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
 * `tools/flythrough/aim-score.ts` carries both rules and `test/flythrough-aim.test.ts`
 * pins them. The second wrong choice was the *anchor*, not the arithmetic: the
 * re-planned leg was flown on 2026-09-17 and the lane refused the run, because the
 * anchor had been picked on its best tick and the machine was loaded. That is the
 * ## The clock below.
 *
 * Re-measure across the whole window rather than at one tick:
 *
 *   node tools/populated/probe.ts --ticks 3000 --dump-tick 3000 --dump-file artifacts/crowd-aim-fix/dump-t3000.json
 *   node tools/flythrough/aim.ts --dump artifacts/crowd-aim-fix/dump-t3000.json
 *
 * `tools/flythrough/aim.ts` reports a pitch and a median body distance with every
 * anchor, so an anchor can be read as framing rather than as a count. The anchor
 * below is not the one it ranks first at any single tick: it is the one that holds
 * the most walking bodies inside 45 m at its **worst** tick in the window, which is
 * the property a leg whose tick depends on the machine's load actually needs.
 *
 * `CROWD_AIM_CAMERA` and `CROWD_TARGET` are that pose: the camera on a walking way,
 * and the target 26 m along the direction it looks. They are **aim anchors**:
 * `CROWD_TARGET` is also the point the flight pans the controls' target to, and
 * `CROWD_AIM_CAMERA` is where the *scoring tool* stood its camera, which is not
 * where the flight's camera goes. `CROWD_DISTANCE_M` is the separation they were
 * scored at, and the crowd leg's 7.2 m push then takes the camera to 18.8 m.
 *
 * ## The two azimuths, which are the same number meaning opposite things
 *
 * The scorer and the controls both call their angle an azimuth, and they measure
 * it from opposite ends of the same ray.
 *
 * - **`tools/flythrough/aim-score.ts`** builds its target as
 *   `camera + (sin az, cos az) * distance`: its azimuth is the direction the camera
 *   **looks**, so `CROWD_AIM_CAMERA` sits 26 m *behind* `CROWD_TARGET`.
 * - **The controls** (and `CameraSnapshot.azimuth`, read from
 *   `controls.getAzimuthalAngle()`) put the camera at
 *   `target + (sin az, cos az) * distance`: their azimuth is the direction from the
 *   target **to** the camera, so the same `CROWD_AZIMUTH` the plan commands flies a
 *   camera 26 m *beyond* `CROWD_TARGET`, on the far side.
 *
 * Both are in the passing run's own manifest, `artifacts/flythrough2/manifest.json`.
 * The app's opening pose has target `(0, 0)` and `azimuth` 0.7853982, and its camera
 * is at `(216.341, 554.452, 216.341)` — the controls' formula, `target + (sin, cos)`
 * `* 620` at 45 degrees, to the millimetre. The crowd leg's opening frame is then
 * camera `(462.439, 17.232, 442.423)` against target `(459.056, 15.200, 416.724)`,
 * `azimuth` 0.1308997 and `distance` 26.000001: the camera is 26.0000 m from that
 * target at a bearing of 187.50 degrees, and 7.50 degrees from it puts the camera at
 * `(462.439, 442.423)` — the frame's own position. So `CROWD_AZIMUTH` is the
 * scorer's 7.50 degrees, handed unchanged to a control that reads it as the
 * controls' 7.50 degrees, and the flight's own bearing is that plus 180 degrees.
 *
 * The flight's behaviour is read off those numbers and is not to be changed by a
 * later edit: `CROWD_TARGET` is the pan the approach closes on, and the crowd leg's
 * push direction is the `CROWD_AIM_CAMERA -> CROWD_TARGET` unit vector, so both
 * depend on this pair. Swapping the two roles — moving `CROWD_TARGET` to the far
 * side so the pair's own bearing equals `CROWD_AZIMUTH` — would move the flown pose
 * 53.1 m, which is the tension recorded in `test/flythrough-plan.test.ts` rather
 * than a change this file makes. What the flight's camera is, from the same
 * controls' formula, is `CROWD_FLOWN_CAMERA` below.
 *
 * This anchor's bearing is 7.5 degrees, so the approach turns 37.5 degrees instead
 * of the old 82.5, and the swing's own arithmetic — the short-way interpolation,
 * whose long-way version cost a run — is in the approach leg below.
 *
 * ## The clock
 *
 * Frames are captured as the movement runs, so the simulated clock advances with
 * wall time and not with the step count. Nothing here waits on a tick inside a leg:
 * a leg is a fixed number of steps, each step a small input plus a frame, and the
 * ticks each frame landed on are recorded beside it. The one tick bound is
 * `holdToTick`, used once at the start so the first leg does not cross a city whose
 * crowd has not formed.
 *
 * **A leg's tick is not a property of this route.** The 2026-09-17 run took 127 s of
 * wall clock against 72 s for the run before it, because eight inspection lanes were
 * loading the machine, and its crowd leg captured at ticks 4,899-5,332 instead of
 * ~3,000. An anchor chosen on a tick-3,000 peak therefore photographed nothing: five
 * of that run's six held pairs were byte-identical, and the lane refused it. The
 * anchor above is chosen on its worst tick across 3,000 to 7,200 precisely so that
 * the leg works at either end of that spread, and **no `holdToTick` is added**: a
 * hold cannot help, because the thing that moved is not where the leg starts but how
 * much wall time — and so how many ticks — each of its steps costs. The measurement
 * and the run are in `docs/devlog/detailed/`.
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
 * The crowd, as two poses that face the same way along one line.
 *
 * `CROWD_AIM_CAMERA` is the walking-way point whose pose the scoring tool accepted:
 * it is the camera of the scored frame, and the numbers in the table above are its
 * — measured 2026-09-18 at 26 m through `tools/flythrough/aim.ts`, which reports the
 * same near counts (152 / 99 / 95 / 100 / 100 / 10 walking bodies inside 45 m), the
 * same 3.9 degree axis and the same 131 / 36 / 55 / 55 / 39 / 25 px figures. Its
 * ground is 13.99 m, so standing 3 m on it looks 2.04 m down at the pinned 15.2 m
 * target, and it is not a pose the run can stand: `standAt`'s clearance floor is
 * 2 m of *clearance*, and this camera keeps 1.91 m to the surface.
 *
 * `CROWD_AZIMUTH` is that scored pose's own azimuth, in the scorer's convention:
 * the direction from `CROWD_AIM_CAMERA` **to** `CROWD_TARGET`. The controls read the
 * same field the other way round, so the flight carries this unchanged and the
 * camera it flies lands on the far side of `CROWD_TARGET` — `CROWD_FLOWN_CAMERA` at
 * a bearing of `CROWD_AZIMUTH + PI`. The header above carries the manifest numbers
 * that settle it.
 *
 * The pair is the one chosen on its **worst** tick across the window a loaded and an
 * unloaded run span, measured through the scorer at 26 m:
 *
 * | tick | near (in frame, <=45 m) | moving | nearest | median | 1.7 m figure |
 * | --- | --- | --- | --- | --- | --- |
 * | 3,000 | 152 | 218 | 4.0 m | 9 m | 131 px |
 * | 4,000 | 99 | 105 | 22.9 m | 33 m | 36 px |
 * | 4,900 | 95 | 101 | 18.5 m | 21 m | 55 px |
 * | 5,400 | 100 | 103 | 19.8 m | 22 m | 55 px |
 * | 6,000 | 100 | 103 | 11.7 m | 30 m | 39 px |
 * | 7,200 | 10 | 104 | 19.8 m | 46 m | 25 px |
 *
 * The leg's own runs have landed at 2,996 and at 3,985-4,328, so what it needs is
 * the 95-to-152 band from 3,000 to 6,000, and the 7,200 reading is the slack beyond
 * any run measured so far. The anchor before it, measured the same way, reads
 * 225 / 131 / 70 / 4 / 4 / 6 — which is why the run at 3,985 found the crowd gone.
 *
 * Neither value can be moved on its own. `CROWD_TARGET` is the pan the overview and
 * approach legs close on, and the crowd leg's push direction is this pair's own unit
 * vector, so an edit that swapped the roles to make the pair's mutual bearing equal
 * `CROWD_AZIMUTH` would carry the approach's target 53.1 m onto the other side of
 * the crowd and fly the crowd leg from the aim camera instead of from the pose that
 * photographed ~100 walking bodies inside 45 m. That is the tension
 * `test/flythrough-plan.test.ts` names; this file keeps the flown pose.
 */
export const CROWD_AZIMUTH = (7.5 * Math.PI) / 180;
/** The separation the scoring tool scored this pose at, metres. */
export const CROWD_DISTANCE_M = 26;
export const CROWD_AIM_CAMERA = Object.freeze({ x: 456.0, z: 389.7 });
/**
 * The scored frame's centre: 26 m from the aim camera, along the direction it looks.
 *
 * The scorer builds it as `camera + (sin, cos) * distance`, and this is that
 * arithmetic for `CROWD_AZIMUTH`. It is also the point the flight pans its controls'
 * target to, which is why the two legs' own records sit within a metre of it.
 */
export const CROWD_TARGET = Object.freeze({
  x: CROWD_AIM_CAMERA.x + Math.sin(CROWD_AZIMUTH) * CROWD_DISTANCE_M,
  z: CROWD_AIM_CAMERA.z + Math.cos(CROWD_AZIMUTH) * CROWD_DISTANCE_M,
});
/**
 * The anchor's own separation, measured between the two points above.
 *
 * Derived rather than written down a second time: the crowd leg's push divides by
 * it to get a unit direction, and a constant that disagrees with the pair it
 * divides is a push that moves the camera along a direction the scored pose was not
 * taken at. The two points are constructed from `CROWD_DISTANCE_M`, so this can
 * only disagree if a later edit types one of them out by hand — which is exactly
 * the edit it is here to catch.
 */
export const CROWD_ANCHOR_DISTANCE_M = Math.hypot(CROWD_AIM_CAMERA.x - CROWD_TARGET.x, CROWD_AIM_CAMERA.z - CROWD_TARGET.z);
if (Math.abs(CROWD_ANCHOR_DISTANCE_M - CROWD_DISTANCE_M) > 0.5) {
  throw new Error(
    `The crowd anchor's two points are ${CROWD_ANCHOR_DISTANCE_M.toFixed(2)} m apart and the scored pose is at ` +
      `${CROWD_DISTANCE_M} m, so this pair is not the pose the scoring tool reported. Its camera and its target travel ` +
      "together: moving one without the other moves the camera, re-aims the approach and the ascent, and lands the crowd " +
      "leg somewhere nobody scored. Re-run `node tools/flythrough/aim.ts --dump " +
      "artifacts/crowd-aim-fix/dump-t3000.json`.",
  );
}
/**
 * The pose the flight actually flies, from the controls' own formula.
 *
 * `CameraSnapshot.azimuth` is `controls.getAzimuthalAngle()`, and the controls read
 * their azimuth as the direction from the target to the camera — the opposite end of
 * the ray from the scorer. The scorer's offset from the camera to the target is
 * `(sin, cos) * distance` at `CROWD_AZIMUTH`, so the controls' own offset from the
 * target to the camera is the negative of it, and the flown camera is the aim camera
 * plus twice that offset. Both ends lie on one line through `CROWD_TARGET`, which is
 * the property the case in `test/flythrough-crowd-anchor.test.ts` pins; reading the
 * derivation as `CROWD_TARGET` minus the offset returns the aim camera itself, which
 * is the mistake that case caught in its own first draft.
 *
 * It is derived rather than written down because it is a *consequence* of the pair
 * above and not a second anchor: the three shared values are `CROWD_TARGET` (the pan
 * the approach closes on), `CROWD_AZIMUTH` (the bearing both legs turn to) and
 * `CROWD_DISTANCE_M` (the zoom ladder's last two rungs). The passing run's crowd leg
 * opened at `(462.439, 442.423)` on 14.21 m of ground, 3.04 m above it, against this
 * formula's `(462.788, 441.254)` — 1.24 m away, which is the approach's own pan
 * residual (`panErrorAfter` 0.909 m on its last step) rather than a second pose.
 */
export const CROWD_FLOWN_CAMERA = Object.freeze({
  x: CROWD_AIM_CAMERA.x + 2 * Math.sin(CROWD_AZIMUTH) * CROWD_DISTANCE_M,
  z: CROWD_AIM_CAMERA.z + 2 * Math.cos(CROWD_AZIMUTH) * CROWD_DISTANCE_M,
});
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
 *
 * ## The descent's floor, and why the ladder's own rungs are not enough
 *
 * The last three rungs ask for 4.5, 3.5 and 3 m, and over the crowd's own ground —
 * 22 m climbing to 26.4 m along the path — the camera is 33 m to 26 m from a target
 * parked at the crossing's 15.2 m. The vertical control buys height above that
 * target by lowering the polar angle, and the camera's offset from the target is
 * `distance * (sin polar, cos polar)`: the distance is closing fast at the same
 * time, so the offset's vertical term shrinks with it. The recorded 2026-09-17 run
 * sank the camera under the ground twice on that stretch — `approach-009` read
 * 0.19419 m above the terrain before its own vertical control ran and
 * `approach-010` 1.07751 m — because one capped drag per step delivered part of
 * the correction and the next step's zoom then shrank what was left.
 *
 * `standFloorM` is the leg's own floor, carried by each step so the vertical
 * control clamps the aim to it *within* the step: a rung that would stand the
 * camera below two metres is held at two metres, which is the same floor
 * `minClearanceM` states for the leg and the same one `holdClearance` rescues
 * against after the fact. It is deliberately the leg's `minClearanceM` value and
 * not a second number written here, so the ladder and the rescue cannot disagree
 * about how low this leg may go.
 */
const APPROACH_FLOOR_M = 2;
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
    standFloorM: APPROACH_FLOOR_M,
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
    // The unit vector from the aim camera to the target, which is the direction
    // the flight's camera looks; divided by the pair's measured separation rather
    // than by `CROWD_DISTANCE_M`, so the push is a unit vector whatever a later
    // edit does to the two points.
    const direction = {
      x: (CROWD_TARGET.x - CROWD_AIM_CAMERA.x) / CROWD_ANCHOR_DISTANCE_M,
      z: (CROWD_TARGET.z - CROWD_AIM_CAMERA.z) / CROWD_ANCHOR_DISTANCE_M,
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
    panNote: "long drags again as the camera climbs: the target travels about 780 m home",
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

/**
 * The flythrough lane's input path: one movement at a time, on the canvas, and a
 * read of the frozen bridge.
 *
 * The repository's camera rule does not bend here. Nothing in this file writes to
 * the page: the bearing and the camera's height are a **left-button drag**, the
 * distance is a **wheel** tick, and translation of the controls' target is a
 * **right-button drag**, all dispatched through `page.mouse`, which goes through
 * the Chrome DevTools Protocol and raises genuine `pointerdown`/`pointermove`/
 * `pointerup`/`wheel` events at the browser level. The only `evaluate` calls read
 * `window.__mapsHarness`, which is frozen and has no setter: `tools/visual/orbit.ts`
 * states the rule this shares.
 *
 * ## The four controls, and why a height is one of them
 *
 * The controls' target height cannot be moved by any input, and that is a
 * property of the app rather than of this lane: `screenSpacePanning` is false, so
 * both axes of a pan are horizontal and `controls.target.y` is set once at boot
 * to the crossing's own ground height. The probe measured a right-button drag of
 * (40, 40) px moving the target 2.39 m in the ground plane and 0.0000 m in
 * height, and the lane asserts that height has not changed in every frame it
 * captures.
 *
 * The camera's height is not pinned: it is `target.y + distance * cos(polar)`,
 * and both terms are controls. So the rig has four axes and this driver drives
 * all four: `zoomBy` (wheel) multiplies the distance, `panTo` (right drag) moves
 * the target in the ground plane, `turnTo` (left drag) sets the bearing, and
 * `standAt` (left drag) sets the height above the terrain under the camera.
 * Without the fourth the camera cannot leave the polar angle the app opens at,
 * which is what put an earlier version of this lane 11 m above a street
 * photographing facades.
 *
 * ## Why this is not `tools/visual/orbit.ts` with a loop around it
 *
 * `orbitTo` and `zoomTo` are closed loops that **stop**: they drive to a pose and
 * then wait for the camera to settle, which is exactly what a flicker judgement
 * cannot do — a sequence of settled frames is a sequence of stills. This driver
 * instead exposes one *step* of movement, so the spec can interleave one step
 * with one frame for as long as a leg lasts. Motion is continuous across the leg
 * because damping is never allowed to finish: `OrbitControls.update` runs every
 * frame, so a leg that keeps applying a small delta keeps the camera gliding.
 *
 * ## The sign and scale conventions, which are the easy thing to get wrong
 *
 * - `OrbitControls.rotateLeft` **subtracts** from theta and `rotateUp` subtracts
 *   from phi, so a positive `rotateY` (a drag to the right) decreases the
 *   azimuth, and a positive `rotateX` (a drag down) increases the polar angle —
 *   the camera rises, looking more steeply down.
 * - The wheel: one tick of deltaY = -100 scales the camera's radius by 0.95, so a
 *   **negative** deltaY dollies in. `zoom` here is a distance factor, so a factor
 *   below one pulls in and the tick count follows from `0.95 ** (-deltaY / 100)`.
 * - The pan is measured, not assumed. `_pan` scales a drag by the current target
 *   distance and the camera's own right/up axes, so the metres a drag buys are a
 *   property of the pose; `measurePanMap` takes two probe drags and records the
 *   local linear map, and `panTo` inverts it and closes the loop against the
 *   target the controls actually reached.
 */

import { readFileSync } from "node:fs";

import type { Page } from "@playwright/test";

import type { CameraSnapshot } from "../../src/harness/bridge.js";
import type { PopulationStatus } from "../../src/agents/population/status.js";

/** One movement step. Every field is optional and each is dispatched on its own. */
export interface LegStep {
  /**
   * The factor the camera's distance is multiplied by: 0.76 pulls in by 24%,
   * 1.3 pulls back by 30%. A factor rather than a wheel delta, because the
   * distance is multiplicative and one wheel tick is worth 5% of wherever the
   * camera already is: a delta written for 620 m means something else at 40 m.
   */
  zoom?: number;
  /** CSS pixels of left-button drag, down-positive (the camera rises). */
  rotateX?: number;
  /** CSS pixels of left-button drag, right-positive (the azimuth decreases). */
  rotateY?: number;
  /** CSS pixels of right-button drag, used when no pan goal applies. */
  panX?: number;
  panY?: number;
  /**
   * Drive the target towards this world point over this step, metres.
   *
   * The step emits one right-button drag sized by the measured pan map and
   * clamped to the leg's `panLimitPx`; the residual is left for the next step, so
   * a leg pans towards its goal across its whole length instead of in one jump.
   * This is the form the plan uses, because a leg that reaches its destination on
   * step three and then sits still is not a flythrough.
   *
   * World metres and not pixels of drag: `_pan` scales a drag by the target
   * distance and the camera's own axes, so the same drag moves the target 18 m at
   * 620 m and 1.4 m at 28 m, and a plan written in pixels means something
   * different at every pose. The pixels are the driver's business.
   */
  panToX?: number;
  panToZ?: number;
  /**
   * Turn the camera to this bearing over this step, radians clockwise from north.
   *
   * The closed-loop form, like `panToX`: the driver computes the drag from the
   * pose it reads, because the radians a drag buys are a property of the canvas
   * and not a constant this file could restate. The bearing is the azimuth the
   * controls report, which is the direction from the target to the camera.
   */
  turnToAzimuth?: number;
  /**
   * Stand the camera this many metres above the terrain under it, over this step.
   *
   * The vertical control. A target and not a floor: the plan asks for a height
   * and the step dispatches as much of the turn as `standStepRad` allows.
   */
  standAtM?: number;
  /**
   * The least height above the ground this step's vertical control may leave the
   * camera at, metres.
   *
   * The leg's clearance floor, carried by the step because it is the step that has
   * to honour it. A descent that would stand the camera below this is held at it —
   * the floor is clamped into the stand's aim rather than answered after the fact
   * by `holdClearance`, which rescues a camera that has already arrived under the
   * ground. Omitted means no floor, and a leg that omits it keeps the old behaviour
   * exactly.
   */
  standFloorM?: number;
  /**
   * The largest polar change one step of the vertical control may dispatch, radians.
   *
   * A descent that has to change the angle by 0.4 rad in one leg needs a bigger
   * step than a leg holding a settled height: the first would arrive at the street
   * over eight steps either way, and the second would lurch five metres if its
   * correction were allowed to be as large.
   */
  standStepRad?: number;
  /**
   * The largest bearing change one step may dispatch, radians.
   *
   * A leg that has to swing 82.5 degrees onto the crowd needs a bigger step than
   * one holding a bearing it already has: at the default quarter radian a ten-step
   * leg can only turn 143 degrees, and the swing would still be arriving after the
   * leg ended. This number is the ask, not the ceiling — `rotateStepRadians`
   * converts it to pixels and clamps those at `maxRotatePx`, so no leg delivers
   * more than 0.3491 rad a step at this lane's 720 px canvas whatever it asks for.
   */
  turnStepRad?: number;
  /**
   * True when this step deliberately asks the camera for nothing.
   *
   * The crowd leg's closing hold uses it: the camera stays where it is so that
   * every change between those frames is the scene's own, which is the
   * measurement the hold exists to make. The spec copies the mark onto the
   * frame's record, and the sequence judge exempts the pair from the travel
   * floor and requires the scene to be alive instead — the damping tail is
   * dead within one capture gap, so a held pair's travel is genuinely
   * sub-millimetre by design and proves nothing about the input path.
   */
  holdsCamera?: boolean;
  /** What this step is, for the manifest. */
  note?: string;
}

/** Everything the bridge publishes that a moving frame's record needs. */
export interface FlythroughObservation {
  frameCount: number;
  /** Milliseconds since this browser session's time origin. */
  now: number;
  camera: CameraSnapshot;
  population: PopulationStatus;
  style: { id: string; label: string };
  lighting: { preset: string; label: string; tokyoClock: string; exposure: number };
  glRenderer: string;
  tiles: { idle: boolean; pending: number; failed: number; visible: number; drawnMeshes: number; drawnTriangles: number };
  post: { active: boolean; error: string | null; taaAccumulating: boolean; taaSamples: number; passes: string[] };
}

const POLL_MS = 60;

/**
 * The controls' own distance limits, from `src/render/camera.ts`: `minDistance`
 * 25 m and `maxDistance` `AOI_HALF_EXTENT_M * 4`, about 1,994 m for a 997 m area
 * of interest. Restated here as numbers rather than imported, because a harness
 * that reads the app's own module to police itself would move with it silently;
 * a lane that goes out of step with the app should fail loudly.
 */
const MIN_DISTANCE_M = 25;
const MAX_DISTANCE_M = 1994;

/** How far one pan probe drag moves the pointer, CSS pixels. */
const PROBE_PX = 40;

/**
 * The lowest height above the target the vertical control will ask for, as a
 * fraction of the camera distance.
 *
 * The camera's height above the target is `distance * cos(polar)`, so a ratio is
 * a cosine, and this one is the `maxPolarAngle` of `src/render/camera.ts`
 * (PI * 0.495, a cosine of 0.0157) with a little room: a step that asks for the
 * clamp itself would send a drag the controls refuse and report a height the
 * camera never reached. It is the app's bound, not this lane's.
 */
const MIN_HEIGHT_RATIO = 0.02;

/** The highest, short of straight up. */
const MAX_HEIGHT_RATIO = 0.999;

/**
 * How close to the height it asked for the vertical control has to leave the
 * camera before it stops correcting, metres.
 *
 * `OrbitControls` turns a drag into a spherical delta that decays by 0.95 a frame,
 * so one drag delivers part of the angle it asked for and the rest lands over the
 * following frames. A convergence bar this tight is what makes the control finish
 * the correction inside its own step; the loose `toleranceM` a leg may pass stays
 * the bar for "the camera is where the plan put it", and this is the bar for "send
 * no more drags".
 */
export const STAND_CONVERGENCE_M = 0.05;

/** The most drags one step's vertical correction may spend converging. */
export const MAX_STAND_DRAGS = 8;

/**
 * What an input path that is not driven does, for the lane's own red control.
 *
 * `MAPS_FLYTHROUGH_INPUT=none` is a mutation of this instrument and not a mode of
 * it: the pointer and wheel events are still raised on the canvas, and every one
 * of them carries a zero delta, which is what a harness whose events never reach
 * the controls also produces. It exists so the lane's central claim — that the
 * camera moved because synthesised input moved it — can be made to fail on
 * purpose. A run in this mode cannot produce evidence, so `FlythroughDriver`
 * refuses to be constructed with it unless the spec has said, in as many words,
 * that it is running the red control.
 */
export const DISABLED_INPUT_MODE = "none";

interface PanMap {
  /** World metres per CSS pixel of drag, as the (x,z) columns of a 2x2 matrix. */
  a: number;
  b: number;
  c: number;
  d: number;
  /** Metres of target travel per pixel, in any direction. */
  metresPerPx: number;
  /** The camera distance this was measured at; a pan scales directly with it. */
  distance: number;
}

export interface FlythroughDriverOptions {
  /** The largest right-button drag one step may emit, CSS pixels. */
  maxPanPx?: number;
  /** The largest rotation one step may emit, CSS pixels. */
  maxRotatePx?: number;
  /**
   * True only when the specification is deliberately running the red control.
   *
   * Required to combine with `MAPS_FLYTHROUGH_INPUT=none`, so a disabled input
   * path cannot be reached by setting an environment variable alone and reported
   * as a normal run.
   */
  redControl?: boolean;
}

/**
 * What one step of the vertical control did.
 *
 * Every field is a reading or a dispatched input, because a frame's height is the
 * thing this lane's predecessor was missing and a number the report has to carry:
 * "the camera stood 3.1 m above the footway" is checkable against the frame, "the
 * camera was low" is not.
 */
export interface StandResult {
  /** What the step asked for: metres above the highest terrain under the camera. */
  wantedAboveGroundM: number;
  /** Height above that terrain before the step, and after it. */
  heightBeforeM: number;
  heightAfterM: number;
  /** The polar angle that height needs, and the one the camera had. */
  wantedPolar: number;
  polarBefore: number;
  polarAfter: number;
  /** The polar change this step dispatched, and the pixels it bought it with. */
  adjustRad: number;
  pixelsY: number;
  /** The terrain under the camera when it was read, and the radius that found it. */
  groundM: number;
  groundRadiusM: number;
  /** The controls' target height, which no input can change. */
  targetY: number;
  /** True when the camera stands within `toleranceM` of the asked height. */
  settled: boolean;
  /** Drags this step's vertical correction spent; 0 when the camera was already there. */
  iterations?: number;
  /** Why no input was sent, when none was. Empty when one was. */
  idle: string;
}

/** What one step of the bearing control did. */
export interface TurnResult {
  wantedAzimuth: number;
  azimuthBefore: number;
  azimuthAfter: number;
  /** Radians this step dispatched, and the pixels it bought them with. */
  adjustRad: number;
  pixelsX: number;
  /** Radians still to turn after the step, in (-PI, PI]. */
  remainingRad: number;
  idle: string;
}

export class FlythroughDriver {
  private readonly page: Page;
  private readonly inputMode: string;
  private maxPanPx: number;
  private readonly maxRotatePx: number;
  private box = { x: 0, y: 0, width: 0, height: 0 };
  private panMap: PanMap | null = null;
  /** The distance the pan map was measured at, so it can be re-measured when the pose moves. */
  private panMapDistance = 0;
  /** How many pointer and wheel events this driver has raised, for the manifest. */
  private events = 0;
  /**
   * The camera's bearing to its target after the last pan, radians clockwise from
   * north. A pan that changes it has moved the camera vertically, because the
   * camera's offset from the target is `distance * (sin(polar)sin(bearing),
   * cos(polar), sin(polar)cos(bearing))` — so a constant bearing with a constant
   * polar is a level pan, and a drifted bearing is a camera that has climbed or
   * sunk.
   */
  private lastPanBearing: number | null = null;


  constructor(page: Page, options: FlythroughDriverOptions = {}) {
    this.page = page;
    this.maxPanPx = options.maxPanPx ?? 28;
    this.maxRotatePx = options.maxRotatePx ?? 40;
    this.inputMode = process.env["MAPS_FLYTHROUGH_INPUT"] ?? "pointer";
    if (this.inputMode === DISABLED_INPUT_MODE && options.redControl !== true) {
      throw new Error(
        `MAPS_FLYTHROUGH_INPUT is "${DISABLED_INPUT_MODE}", which raises pointer and wheel events with zero deltas so ` +
          "that a run captures a sequence nothing drives. That is the red control and not a way to run this lane: no " +
          "frame it writes shows the camera being driven, so it can never be evidence, and the specification has to " +
          "ask for it by passing `redControl: true`. Nothing was dispatched.",
      );
    }
  }

  /** True when this driver is deliberately raising input that cannot move the camera. */
  get isRedControl(): boolean {
    return this.inputMode === DISABLED_INPUT_MODE;
  }

  /** How many pointer and wheel events this driver has raised. */
  dispatchedEvents(): number {
    return this.events;
  }

  async readBox(): Promise<void> {
    const box = await this.page.locator("#scene").boundingBox();
    if (box === null || box.width === 0 || box.height === 0) {
      throw new Error(
        "The canvas has no layout box, so no pointer event has anywhere to go. Either #scene is missing or CSS " +
          "collapsed it to zero, and a flythrough with no canvas is a sequence of identical frames.",
      );
    }
    this.box = box;
  }

  /**
   * Everything a moving frame's record needs, read in one browser task.
   *
   * One `evaluate`, not six: the pose, the frame number and the population's
   * counters have to describe the same instant, or a frame's record is a
   * description of two moments stitched together.
   */
  async observe(): Promise<FlythroughObservation> {
    const observation = await this.page.evaluate(() => {
      const harness = window.__mapsHarness;
      if (!harness) return null;
      const status = harness.status();
      const lighting = harness.lighting();
      return {
        frameCount: status.frameCount,
        now: performance.now(),
        camera: harness.camera(),
        population: harness.population(),
        style: harness.style(),
        lighting: {
          preset: lighting.preset,
          label: lighting.label,
          tokyoClock: lighting.tokyoClock,
          exposure: lighting.exposure,
        },
        glRenderer: status.glRenderer,
        tiles: harness.tiles(),
        post: harness.post(),
      };
    });
    if (observation === null) throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
    return observation as FlythroughObservation;
  }

  /**
   * Radians of camera rotation per CSS pixel of drag.
   *
   * `OrbitControls` turns a drag into `2 * PI * pixels / domElement.clientHeight`
   * on both axes. This is the opening estimate the closed loops below start from;
   * they read the pose back after every gesture, so a change to that constant
   * costs a corrective drag and nothing else.
   */
  private get radiansPerPixelY(): number {
    return (2 * Math.PI) / this.box.height;
  }

  /**
   * How far one step's pan drag may travel, CSS pixels.
   *
   * The plan sets this per leg, because what a drag can afford is a property of
   * the pose and not of the lane: at 620 m a 28 px drag buys 18 m of target
   * travel and at 34 m it buys 1.4 m, so a leg that has to cross the city while
   * the camera is far needs a long drag and a leg standing in the street needs a
   * short one. It is bounded by the canvas, because a drag longer than the
   * pointer can travel inside the element is a gesture the browser delivers in
   * pieces and the controls read as several pan events.
   */
  setPanLimit(pixels: number): void {
    const limit = this.box.width > 0 ? this.box.width * 0.3 : 384;
    if (!(pixels > 0) || pixels > limit) {
      throw new Error(
        `A leg asked for a pan of ${pixels} px a step, and the canvas is ${this.box.width} px wide so the most a ` +
          `single drag can carry while staying inside it is ${limit.toFixed(0)} px. A longer drag is delivered as ` +
          "several pointer events and read by the controls as several pans, which is not what the plan asked for.",
      );
    }
    this.maxPanPx = pixels;
  }

  /** The canvas centre and its size, for a caller that has to aim a drag. */
  canvas(): { x: number; y: number; width: number; height: number } {
    return { ...this.box };
  }

  /**
   * One drag the input path will deliver: press, move in steps, release.
   *
   * `steps` on the move is what makes this the incremental path `OrbitControls`
   * accumulates per `pointermove`, rather than a single teleport the controls
   * would read as one enormous delta. Split into passes for the same reason
   * `tools/visual/orbit.ts` splits its rotation: a drag has to stay inside the
   * canvas or the pointer leaves the element mid-gesture.
   *
   * The deltas are zeroed in the red-control mode and the events are still
   * raised, so what that mode removes is the movement and not the event.
   */
  private async drag(deltaX: number, deltaY: number, button: "left" | "right"): Promise<void> {
    const disabled = this.inputMode === DISABLED_INPUT_MODE;
    const wantedX = disabled ? 0 : deltaX;
    const wantedY = disabled ? 0 : deltaY;
    const limitX = this.box.width * 0.3;
    const limitY = this.box.height * 0.28;
    const passes = Math.max(1, Math.ceil(Math.abs(wantedX) / limitX), Math.ceil(Math.abs(wantedY) / limitY));

    for (let pass = 0; pass < passes; pass += 1) {
      const stepX = wantedX / passes;
      const stepY = wantedY / passes;
      const startX = this.box.x + this.box.width / 2 - stepX / 2;
      const startY = this.box.y + this.box.height / 2 - stepY / 2;
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down({ button });
      await this.page.mouse.move(startX + stepX, startY + stepY, { steps: 8 });
      await this.page.mouse.up({ button });
      this.events += 1;
    }
  }

  /** One or more wheel ticks over the middle of the canvas. */
  private async wheel(totalDelta: number): Promise<void> {
    const wanted = this.inputMode === DISABLED_INPUT_MODE ? 0 : totalDelta;
    const perTick = 240;
    const ticks = Math.max(1, Math.round(Math.abs(wanted) / perTick));
    const signedTick = Math.sign(wanted) * (Math.abs(wanted) / ticks);
    await this.page.mouse.move(this.box.x + this.box.width / 2, this.box.y + this.box.height / 2);
    for (let tick = 0; tick < ticks; tick += 1) {
      await this.page.mouse.wheel(0, signedTick);
      this.events += 1;
    }
  }

  /**
   * One wheel gesture that multiplies the camera's distance by `factor`.
   *
   * `factor < 1` pulls in. In `OrbitControls`, `getZoomScale() = 0.95 ** (-deltaY / 100)`
   * and a positive deltaY takes the `_dollyOut` branch, so a positive deltaY
   * multiplies the distance by more than one and one tick of -100 scales it by
   * 0.95. The tick count for a factor is therefore `log(factor) / log(0.95)`, and
   * the sign follows from it rather than being written down twice.
   */
  private async zoomBy(factor: number): Promise<void> {
    if (!(factor > 0)) {
      throw new Error(
        `A zoom step asked for a distance factor of ${factor}. The factor is the number the distance is ` +
          "multiplied by, so it has to be positive: 0.76 pulls in, 1.3 pulls back.",
      );
    }

    const current = (await this.observe()).camera.distance;
    const wanted = current * factor;
    // The controls' own limits, from `src/render/camera.ts`. A distance outside
    // them cannot be reached at all, and a distance past the far end of the scene
    // is a camera that has left the city: both are arithmetic errors in a plan, and
    // both are cheaper to catch here than to read off a frame of empty sky.
    if (wanted < MIN_DISTANCE_M || wanted > MAX_DISTANCE_M) {
      throw new Error(
        `A zoom step asked to take the camera from ${current.toFixed(1)} m to ${wanted.toFixed(1)} m (factor ` +
          `${factor}), and the controls run from ${MIN_DISTANCE_M} m to ${MAX_DISTANCE_M} m. A factor applied ` +
          "once per step compounds, so this is a plan whose steps do not multiply out to the distance it states.",
      );
    }

    // The sign, from one event at a time rather than from the source: the earlier
    // `tools/flythrough/probe.spec.ts` measured deltaY +100 at ratio 1.0526
    // (620 -> 652.63 m) and deltaY -100 back to 620 m, so a **negative** deltaY
    // pulls in and `0.95 ** (-deltaY / 100)` is the distance factor as advertised.
    // A factor below one therefore wants a negative delta, which is the leading
    // minus here and is the whole of the sign convention.
    const ticks = -Math.log(factor) / Math.log(0.95);
    if (Math.abs(ticks) < 0.5) return;    await this.wheel(ticks * 100);
    const reached = (await this.observe()).camera.distance;
    const ratio = reached / current;
    if (Math.abs(ratio - factor) / factor > 0.15) {
      throw new Error(
        `A zoom step asked for a factor of ${factor} at ${current.toFixed(1)} m and the controls reached ` +
          `${reached.toFixed(1)} m, a factor of ${ratio.toFixed(4)}. The wheel is the one input whose direction is ` +
          "not what its source reads like, so a step that did not do what it said is a step whose sign is wrong " +
          "again, and a leg that compounds it flies the camera out of the scene.",
      );
    }
  }

  /**
   * Two probe drags that measure the local map from canvas pixels to world metres.
   *
   * This is the one part of the flythrough that is not movement for its own sake:
   * the two drags move the target a few metres and are recorded as part of the
   * leg's motion like every other input. Measured rather than derived because
   * `OrbitControls._pan` scales a drag by the target distance, the canvas height
   * and the camera's own axes, and a closed loop that restates that arithmetic
   * from memory is a closed loop that is wrong after a three.js upgrade.
   *
   * The map is linear in the camera distance, so it is measured once and scaled
   * afterwards; `panTo` re-measures when the pose has moved far enough that
   * scaling would be the larger error.
   *
   * Its second job is the red control's first trip-wire: two drags that move the
   * target by nothing are refused here, in as many words, before a frame is
   * written. In a run where the input path is not driven this is the first check
   * that can tell, and it fails the run rather than recording 40 identical frames
   * and calling them a flythrough.
   */
  private async measurePanMap(distance: number): Promise<PanMap> {
    const before = (await this.observe()).camera;
    if (this.box.width === 0) await this.readBox();

    await this.drag(PROBE_PX, 0, "right");
    const across = (await this.observe()).camera.target;
    await this.drag(0, PROBE_PX, "right");
    const along = (await this.observe()).camera.target;

    const a = (across.x - before.target.x) / PROBE_PX;
    const c = (across.z - before.target.z) / PROBE_PX;
    const b = (along.x - across.x) / PROBE_PX;
    const d = (along.z - across.z) / PROBE_PX;
    const metresPerPx = Math.hypot(b, d);

    if (![a, b, c, d, metresPerPx].every(Number.isFinite) || metresPerPx < 1e-6 || a * d - b * c === 0) {
      throw new Error(
        `Two right-button drags of ${PROBE_PX} px moved the controls' target by ${metresPerPx.toFixed(9)} m per ` +
          `pixel at a camera distance of ${distance.toFixed(0)} m. Panning is the only control that moves the target ` +
          "off the crossing, so a drag that moves nothing means every leg below would photograph the crossing " +
          "whatever the plan says. Check the input path first: a canvas that is not receiving pointer events, an " +
          "overlay that swallows them, or `MAPS_FLYTHROUGH_INPUT=none` left set, all look exactly like this.",
      );
    }

    this.panMap = { a, b, c, d, metresPerPx, distance };
    this.panMapDistance = distance;
    // The two probe drags move the target and therefore the camera's bearing to
    // it. The levelling correction is a correction, not an absolute, so its
    // reference has to start again from the pose the probes left behind.
    this.lastPanBearing = null;
    console.log(
      `  pan map at ${distance.toFixed(0)} m: ${metresPerPx.toFixed(3)} m per pixel, ` +
        `x (${a.toFixed(4)}, ${c.toFixed(4)}) z (${b.toFixed(4)}, ${d.toFixed(4)})`,
    );
    return this.panMap;
  }

  /**
   * One step of the target's travel towards a world point.
   *
   * The drag is sized by the measured map scaled to the current distance and
   * clamped to the leg's pan limit, so the target converges over the leg's steps
   * instead of arriving in one. The measured map is re-taken when the pose has
   * moved more than 25% in distance since it was measured, because metres per
   * pixel scale with distance and a stale map is a wrong direction as well as a
   * wrong size.
   *
   * Returns what the pan was asked for and what the controls did with it. The
   * caller records both: the plan's request and the controls' answer are allowed
   * to differ, and a run where they differ is a run whose poses are read off the
   * frames rather than off this file.
   */
  private async panTo(goal: { x: number; z: number }): Promise<{ askedPx: { x: number; y: number }; errorBefore: number; targetBefore: { x: number; z: number } }> {
    const before = (await this.observe()).camera;
    const errorX = goal.x - before.target.x;
    const errorZ = goal.z - before.target.z;
    const errorBefore = Math.hypot(errorX, errorZ);

    // The levelling reference follows the pose whether or not this step pans, so
    // a leg that stops panning and starts again compares against the bearing it
    // actually left, not against one from several steps ago.
    const bearing = Math.atan2(before.target.x - before.position.x, before.target.z - before.position.z);

    // Below the resolution of a drag there is nothing to send, and sending it
    // would be a mouse press that moves the target by millimetres while claiming
    // a step of movement.
    if (errorBefore < 0.5) {
      this.lastPanBearing = bearing;
      return { askedPx: { x: 0, y: 0 }, errorBefore, targetBefore: before.target };
    }

    if (this.panMap === null || Math.abs(this.panMapDistance - before.distance) / before.distance > 0.25) {
      await this.measurePanMap(before.distance);
    }
    const map = this.panMap!;
    const scale = before.distance / map.distance;
    const a = map.a * scale;
    const b = map.b * scale;
    const c = map.c * scale;
    const d = map.d * scale;
    const determinant = a * d - b * c;

    let pixelsX = (d * errorX - b * errorZ) / determinant;
    let pixelsY = (-c * errorX + a * errorZ) / determinant;

    // Fold the bearing drift back in before the clamp, so the drag that goes out
    // is a level pan plus whatever travel the goal asked for. The bearing is read
    // from the pose the controls actually reached, and the conversion from yaw to
    // vertical pixels is the camera's own field of view over the canvas height —
    // the same "metres per pixel" the pan map measured, applied to the angle
    // instead of the distance.
    if (this.lastPanBearing !== null) {
      const drift = shortestAngle(bearing - this.lastPanBearing);
      pixelsY -= drift / this.radiansPerPixelY;
    }
    this.lastPanBearing = bearing;

    const magnitude = Math.hypot(pixelsX, pixelsY);
    if (magnitude > this.maxPanPx) {
      pixelsX = (pixelsX / magnitude) * this.maxPanPx;
      pixelsY = (pixelsY / magnitude) * this.maxPanPx;
    }
    await this.drag(clamp(pixelsX, -this.box.width * 0.8, this.box.width * 0.8), clamp(pixelsY, -this.box.height * 0.8, this.box.height * 0.8), "right");
    return { askedPx: { x: pixelsX, y: pixelsY }, errorBefore, targetBefore: before.target };
  }

  /**
   * One step of a leg: the movement the plan asks for, dispatched through the
   * real input path, and nothing else. It never waits for the camera to settle.
   */
  async step(step: LegStep, goal: { x: number; z: number } | null): Promise<{
    zoom: number;
    rotate: { x: number; y: number };
    pan: { x: number; y: number };
    /** How far the target still is from the leg's goal after this step, metres. */
    panErrorAfter: number | null;
    /** What the bearing control did, when the step asked for a bearing. */
    turn: TurnResult | null;
    /** What the vertical control did, when the step asked for a height. */
    stand: StandResult | null;
  }> {
    if (this.box.width === 0) await this.readBox();
    const zoom = step.zoom ?? 1;
    if (zoom !== 1) await this.zoomBy(zoom);
    const rotateX = clamp(step.rotateX ?? 0, -this.maxRotatePx, this.maxRotatePx);
    const rotateY = clamp(step.rotateY ?? 0, -this.maxRotatePx, this.maxRotatePx);
    if (rotateX !== 0 || rotateY !== 0) await this.drag(rotateY, rotateX, "left");

    let turn: TurnResult | null = null;
    if (step.turnToAzimuth !== undefined) {
      turn =
        step.turnStepRad === undefined
          ? await this.turnTo(step.turnToAzimuth)
          : await this.turnTo(step.turnToAzimuth, step.turnStepRad);
    }

    // The floor is answered **inside the step**, between the zoom that threatens
    // it and the pan that moves the camera on. `zoomBy` scales the camera's whole
    // offset from the target — the vertical term with it — so a step that closes
    // 21% of the distance lowers the camera by 21% of its altitude above the
    // target, and over the approach's rising ground that is the metres between the
    // camera and the terrain. Raising the camera after the pan instead lets the
    // step's own stand read the height the zoom left, which is the recorded
    // defect: `approach-010` read 0.66 m before its vertical control ran. Nothing
    // between here and the pan lowers the camera again — the pan's two axes are
    // horizontal (`screenSpacePanning` is false) — so a camera that clears the
    // floor here clears it for the rest of the step, and the stand that follows
    // converges on the height the plan asked for.
    await this.raiseToFloor(step.standFloorM, step.standStepRad ?? 0.2);
    let pan = { x: step.panX ?? 0, y: step.panY ?? 0 };
    let panErrorAfter: number | null = null;
    // A step may carry its own destination; the leg's goal is the fallback, so a
    // leg that pans along one line and a leg that turns on the spot are both
    // written in one place — the plan.
    const destination =
      step.panToX !== undefined && step.panToZ !== undefined ? { x: step.panToX, z: step.panToZ } : goal;
    if (destination !== null) {
      const result = await this.panTo(destination);
      pan = result.askedPx;
      const after = (await this.observe()).camera;
      panErrorAfter = Math.hypot(destination.x - after.target.x, destination.z - after.target.z);
    } else if (pan.x !== 0 || pan.y !== 0) {
      await this.drag(clamp(pan.x, -this.maxPanPx, this.maxPanPx), clamp(pan.y, -this.maxPanPx, this.maxPanPx), "right");
    }

    let stand: StandResult | null = null;
    if (step.standAtM !== undefined) {      stand =
        step.standStepRad === undefined
          ? await this.standAt(step.standAtM, { clearanceFloorM: step.standFloorM })
          : await this.standAt(step.standAtM, { maxStepRad: step.standStepRad, clearanceFloorM: step.standFloorM });
    }

    return { zoom, rotate: { x: rotateX, y: rotateY }, pan, panErrorAfter, turn, stand };
  }

  /**
   * Turn the camera to a bearing, through the rotate control.
   *
   * The second of the rig's four controls, and the one that decides what is in
   * frame: `zoomBy` sets the distance, `panTo` moves the target, `standAt` sets
   * the height, and this sets the direction. A bearing rather than a pixel delta,
   * because a leg that wants to look east along a footway wants an angle and the
   * pixels that buy one are a property of the canvas rather than of the plan.
   *
   * The angle is dispatched as a drag on the canvas centre, the same left button a
   * person turns the view with; nothing here writes the controls' azimuth.
   */
  async turnTo(azimuth: number, maxStepRad = 0.25): Promise<TurnResult> {
    const before = (await this.observe()).camera;
    // The nearest equivalent bearing, because OrbitControls accumulates theta and
    // a plan written in (-PI, PI] would otherwise ask for a two-turn spin.
    const delta = shortestAngle(azimuth - before.azimuth);
    const idle = (why: string): TurnResult => ({
      wantedAzimuth: azimuth,
      azimuthBefore: before.azimuth,
      azimuthAfter: before.azimuth,
      adjustRad: 0,
      pixelsX: 0,
      remainingRad: delta,
      idle: why,
    });
    if (Math.abs(delta) < 0.01) return idle("within a hundredth of a radian already");

    const step = rotateStepRadians(delta, {
      maxStepRad,
      canvasHeightPx: this.box.height,
      maxRotatePx: this.maxRotatePx,
    });
    const pixelsX = step.pixelsX;
    if (Math.abs(pixelsX) < 0.5) return idle(`a drag of ${pixelsX.toFixed(2)} px is below the pointer's resolution`);

    await this.drag(pixelsX, 0, "left");
    const after = (await this.observe()).camera;
    const moved = shortestAngle(after.azimuth - before.azimuth);
    // The sign is checked, not assumed: a three.js upgrade that flips it turns a
    // leg that looks down a footway into one that looks at a wall, and the frames
    // would show it as a framing failure rather than as an input failure. The
    // threshold is wide because a damped gesture from the previous step is still
    // landing, and that landing is not this step's sign.
    if (Math.abs(moved) > 0.05 && Math.sign(moved) !== Math.sign(step.askedRad)) {
      throw new Error(
        `A turn towards ${azimuth.toFixed(3)} rad asked for ${step.askedRad.toFixed(4)} rad of azimuth change and the ` +
          `controls moved ${moved.toFixed(4)} rad the other way (${before.azimuth.toFixed(3)} -> ${after.azimuth.toFixed(3)}). ` +
          "The rotate sign is wrong, and every leg aimed through this control would photograph the wrong direction.",
      );
    }
    return {
      wantedAzimuth: azimuth,
      azimuthBefore: before.azimuth,
      azimuthAfter: after.azimuth,
      adjustRad: moved,
      pixelsX,
      remainingRad: shortestAngle(azimuth - after.azimuth),
      idle: "",
    };
  }

  /**
   * Stand the camera at a chosen height above the ground beneath it.
   *
   * This is the vertical control an earlier version of this lane did not have, and
   * its absence is why the crowd was in none of that run's 56 frames. The rig's
   * target height is fixed by the app and not by this lane: a pan moves the target
   * along a horizontal axis in both of its directions (`screenSpacePanning` is
   * false, so `_panUp` takes `up x cameraRight`, whose y is zero), and
   * `controls.target.y` is set once, at boot, to the crossing's own
   * `GROUND_AT_ORIGIN_M`. No pointer gesture and no wheel tick can change it.
   *
   * The camera's height is not fixed. It is `target.y + distance * cos(polar)`, and
   * both terms are controls: the wheel sets the distance and a left-button drag
   * sets the polar angle. So the vertical axis exists, it is reachable through the
   * input path, and this method is the closed loop that uses it — it reads the
   * pose, computes the polar that stands the camera at the wanted height above the
   * terrain under it, and dispatches that much of the turn as a drag.
   *
   * A **target**, not a floor: `clearanceFloorM` is the floor and this is the aim.
   * The aim is reached **within the step**, by iterating the correction until the
   * camera stands at the asked height, and that is a fix rather than a flourish.
   *
   * A single capped drag does not deliver the angle it asks for: `OrbitControls`
   * accumulates the gesture into its spherical delta and lets that delta decay by
   * 0.95 a frame, so one drag buys part of the turn and the rest of it lands as a
   * tail over the following frames. The correction therefore has to be read back
   * and repeated, or the camera enters the next step still short of its height.
   * That is what sank the camera under the ground on the recorded 2026-09-17 run
   * and again on 2026-09-17's re-run in `artifacts/stand-repair/`: the approach
   * leg's ladder asks for 4.5 m at 33 m out over ground that has risen to 24.4 m,
   * the previous step's drag delivered 0.0070 of the 0.0132 rad it asked for, and
   * the next step's zoom then scales the camera's offset from the target — the
   * whole offset, vertical term included — by 0.788, which dropped the camera to
   * 0.55 m above the ground before this control ran (`heightBeforeM`), under the
   * 1.5 m floor the sequence judge reads. Iterating to the aim leaves the camera
   * at the asked height at the end of every step, so the zoom has the whole rung
   * to shrink instead of the last half metre of it.
   *
   * The floor is clamped into the aim as well: `max(wanted, floor)` above the
   * ground under the camera. A leg whose ladder would descend below its own floor
   * is held at the floor and recorded as such rather than being flown through it.
   */
  async standAt(
    wantedAboveGroundM: number,
    options: { maxStepRad?: number | undefined; toleranceM?: number | undefined; clearanceFloorM?: number | undefined } = {},
  ): Promise<StandResult> {
    const maxStepRad = options.maxStepRad ?? 0.05;
    const toleranceM = options.toleranceM ?? STAND_CONVERGENCE_M;
    const clearanceFloorM = Number.isFinite(options.clearanceFloorM) ? options.clearanceFloorM! : Number.NEGATIVE_INFINITY;
    const before = (await this.observe()).camera;
    const ground = groundBelow(before.position.x, before.position.z);
    const heightBeforeM = before.position.y - ground.heightM;
    const base = {
      wantedAboveGroundM,
      heightBeforeM,
      wantedPolar: Number.NaN,
      polarBefore: before.polar,
      polarAfter: before.polar,
      adjustRad: 0,
      pixelsY: 0,
      groundM: ground.heightM,
      groundRadiusM: ground.radiusM,
      targetY: before.target.y,
    };
    const done = (settled: boolean, idle: string, extra: Partial<StandResult> = {}): StandResult => ({
      ...base,
      heightAfterM: heightBeforeM,
      settled,
      idle,
      ...extra,
    });
    if (Math.abs(heightBeforeM - wantedAboveGroundM) <= toleranceM) {
      return done(true, `already within ${toleranceM} m of the asked height`);
    }

    // The correction, iterated to the aim by the loop the floor rescue runs as well.
    // Each round reads the pose back, so the part of the previous drag that is still
    // landing is simply the next round's error; convergence follows from the loop
    // reading the controls rather than from the drag delivering a figure this file
    // assumes.
    const correction = await runVerticalCorrection(this.verticalPage(), {
      polar: before.polar,
      distance: before.distance,
      targetY: before.target.y,
      groundM: ground.heightM,
      heightM: heightBeforeM,
      wantedAboveGroundM,
      clearanceFloorM,
      maxStepRad,
      maxRotatePx: this.maxRotatePx,
      radiansPerPixelY: this.radiansPerPixelY,
      toleranceM,
      iteration: 0,
      wantedPolar: before.polar,
      commandedRad: 0,
      pixelsY: 0,
      reachedAboveGroundM: wantedAboveGroundM,
      commanded: false,
      idle: "",
    });
    const heightAfterM = correction.heightAfterM;
    const polarAfter = correction.polarAfter;
    const movedPolar = polarAfter - before.polar;
    const askedPolar = correction.wantedPolar - before.polar;

    // The sign is checked on the **polar angle** and not on the height, and that is
    // a fix rather than a preference. At 275 m of distance a gesture that moves the
    // camera a metre changes the angle by 0.004 rad, so a check on the height reads
    // the tail of the previous step's gesture — or the ground rising under the
    // camera — as a sign error and refuses a leg that is behaving. The angle is what
    // this control drives, and a wrong sign sends the whole step in the wrong
    // direction at once, which is an order of magnitude past the tail. Read over the
    // step's whole correction, because it is now several drags and not one.
    if (Math.abs(askedPolar) >= 0.02 && Math.abs(movedPolar) > 0.02 && Math.sign(movedPolar) !== Math.sign(askedPolar)) {
      throw new Error(
        `Standing at ${wantedAboveGroundM.toFixed(1)} m asked for ${askedPolar.toFixed(4)} rad of polar change from ` +
          `${before.polar.toFixed(3)} and the angle moved ${movedPolar.toFixed(4)} rad the other way, taking the camera ` +
          `from ${heightBeforeM.toFixed(2)} m to ${heightAfterM.toFixed(2)} m above the ground. The vertical control's ` +
          "sign is wrong, and every leg aimed through it would photograph the city from the height it was trying to leave.",
      );
    }

    return {
      ...base,
      wantedPolar: correction.wantedPolar,
      polarAfter,
      adjustRad: movedPolar,
      pixelsY: correction.pixelsY,
      heightAfterM,
      iterations: correction.drags,
      settled: Math.abs(heightAfterM - correction.reachedAboveGroundM) <= STAND_CONVERGENCE_M,
      idle: correction.idle,
    };
  }

  /**
   * The vertical control's loop, bound to this page.
   *
   * `runVerticalCorrection` is the loop both the aim and the floor rescue run; this
   * is the two calls it makes on this driver and nothing else, so what a test drives
   * in its place is the loop itself rather than a second copy of it.
   */
  private verticalPage(): VerticalCorrectionPage {
    return {
      observe: async () => {
        const camera = (await this.observe()).camera;
        const ground = groundBelow(camera.position.x, camera.position.z);
        return {
          polar: camera.polar,
          distance: camera.distance,
          targetY: camera.target.y,
          groundM: ground.heightM,
          heightM: camera.position.y - ground.heightM,
        };
      },
      drag: async (pixelsY: number) => {
        await this.drag(0, pixelsY, "left");
      },
    };
  }

  /**
   * Raise the camera until it clears `floorM`, iterating the correction.
   *
   * This is `holdClearance`'s job done **inside** the step that needs it, and the
   * iteration is what makes it finish there. One capped drag delivers part of the
   * turn it asks for — `OrbitControls` decays its spherical delta by 0.95 a frame —
   * so a single nudge leaves the camera short of the floor and the *next* step's
   * zoom then takes it further down; that is the recorded defect, and it is why the
   * floor cannot be a rescue that runs once. The same convergence loop `standAt`
   * uses drives it, with the floor as its aim in place of a plan height.
   *
   * Never lowers the camera: a frame the plan already put above its floor is left
   * exactly where the plan put it. Fails by name rather than flying on if the
   * controls cannot reach the floor at all.
   */
  private async raiseToFloor(floorM: number | undefined, maxStepRad: number): Promise<void> {
    if (floorM === undefined || !Number.isFinite(floorM)) return;

    const camera = (await this.observe()).camera;
    const ground = groundBelow(camera.position.x, camera.position.z);
    const correction = await runVerticalCorrection(this.verticalPage(), {
      polar: camera.polar,
      distance: camera.distance,
      targetY: camera.target.y,
      groundM: ground.heightM,
      heightM: camera.position.y - ground.heightM,
      // The floor is the aim and the plan's height is not in play here: a camera
      // the plan already put above the floor is left alone, and one under it climbs
      // to the floor and no further.
      wantedAboveGroundM: Number.NEGATIVE_INFINITY,
      clearanceFloorM: floorM,
      maxStepRad,
      maxRotatePx: this.maxRotatePx,
      radiansPerPixelY: this.radiansPerPixelY,
      toleranceM: STAND_CONVERGENCE_M,
      iteration: 0,
      wantedPolar: camera.polar,
      commandedRad: 0,
      pixelsY: 0,
      reachedAboveGroundM: floorM,
      atLeast: true,
      commanded: false,
      idle: "",
    });
    if (correction.heightAfterM < floorM) {
      throw new Error(
        `A step's clearance rescue ran ${correction.drags} drags of up to ${maxStepRad} rad and left the camera ` +
          `${correction.heightAfterM.toFixed(2)} m above the ground, under the leg's ${floorM.toFixed(1)} m floor. The polar ` +
          "angle is the only axis this control has and it is at the controls' own limit, so this leg's distance from " +
          "its target cannot stand the camera clear of the terrain under it: the ladder's rungs are too close in, or " +
          "the route crosses ground higher than the target. Nothing below the floor is photographed.",
      );
    }
  }

  /**
   * Raise the camera until it stands `minimumM` above the ground beneath it.
   *
   * A floor and not a target: it only ever raises the camera, by at most
   * `maxStepRad` a step, so a leg whose camera has drifted down climbs back and
   * one already high enough is left exactly where the plan put it. `standAt`
   * aims and this bounds, and both are needed: a floor cannot choose a height and
   * an aim cannot promise one after a pan has moved the camera over a hill.
   *
   * The distinction between a floor and a target is a fix, not a style. An
   * earlier version took an unsigned proportional error and flew the aerial
   * camera from 284 m of clearance down to 11.6 m over fifteen frames, because
   * "too high" and "too low" went through the same term. Its second version
   * clamped the adjustment to `[0, maxStepRad]`, which is the direction that
   * *lowers* the camera, so the floor could only ever push the camera down — and
   * because the branch below returns early whenever the clearance is already
   * sufficient, a run where it never had to fire passed with the sign inverted.
   *
   * Returns what it did, which each frame's record carries: a frame whose camera
   * is 200 m above the roofs is a flight over the city and one 4 m above the
   * street is a street view, and the two are not interchangeable evidence.
   */
  async holdClearance(minimumM: number, maxStepRad = 0.012): Promise<{ clearanceM: number; adjustRad: number; groundM: number; radiusM: number }> {
    const camera = (await this.observe()).camera;
    const ground = groundBelow(camera.position.x, camera.position.z);
    const clearanceM = camera.position.y - ground.heightM;
    const noChange = { clearanceM, adjustRad: 0, groundM: ground.heightM, radiusM: ground.radiusM };    if (clearanceM >= minimumM) return noChange;

    // The camera's height above the target is `distance * cos(polar)`, so the angle
    // that stands it `h` above the target is `acos(h / distance)` — the target's own
    // height does not enter. `h` is clamped between the height that clears the
    // ground under the camera by `minimumM` and a ceiling that keeps the camera
    // inside the controls' own range, and it is the *height* that is clamped rather
    // than the angle: clamping the angle is what turned a 5 m floor into a nearly
    // level camera 5 m above the hill.
    const ceiling = camera.distance * 0.97;
    const wantedHeight = camera.position.y - camera.target.y + (minimumM - clearanceM);
    const height = clamp(Math.min(wantedHeight, ceiling), Math.min(minimumM, ceiling), ceiling);
    const wanted = Math.acos(clamp(height / camera.distance, MIN_HEIGHT_RATIO, MAX_HEIGHT_RATIO));
    const adjustRad = clamp(wanted - camera.polar, -maxStepRad, 0);
    if (adjustRad > -0.002) return noChange;

    // `_rotateUp` subtracts from phi, so raising the camera is a **downward** drag
    // and the pixels are positive. The sign lives here so the caller cannot
    // disagree with it.
    await this.drag(0, clamp(-adjustRad / this.radiansPerPixelY, 0, this.maxRotatePx), "left");
    return { clearanceM, adjustRad, groundM: ground.heightM, radiusM: ground.radiusM };
  }

  /**
   * Wait until the population's tick counter reaches a value.
   *
   * The one bound this lane puts on the simulated clock, and only at the start of
   * a leg: the first leg should not cross the city before the crowd has formed,
   * and it is a wait with no input, so it is never used inside a leg's step
   * sequence. The frames are captured as the movement runs and the ticks each one
   * landed on are recorded beside it, so no leg is coordinated to a tick.
   */
  async waitForTick(tick: number, timeoutMs = 10 * 60_000): Promise<PopulationStatus> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const observation = await this.observe();
      if (!observation.population.attached) {
        throw new Error(
          "No population is attached to this page. This lane loads ?agents=1; a page without it renders the same " +
            "empty city the appearance sweep photographs, and a flythrough of it would say nothing about the crowd.",
        );
      }
      if (observation.population.ticks >= tick) return observation.population;
      if (Date.now() > deadline) {
        throw new Error(
          `Waited ${timeoutMs} ms for population tick ${tick} and the simulation reached tick ` +
            `${observation.population.ticks} (${observation.population.simulatedSeconds.toFixed(1)} simulated ` +
            `seconds) at render frame ${observation.frameCount}. The simulated clock advances at most five fixed ` +
            "steps per rendered frame, so it is the frame rate that is short, not the tick count.",
        );
      }
      await this.page.waitForTimeout(POLL_MS);
    }
  }
}

/** The signed difference between two angles, in (-PI, PI]. */
export function shortestAngle(delta: number): number {
  let value = delta % (2 * Math.PI);
  if (value > Math.PI) value -= 2 * Math.PI;
  if (value <= -Math.PI) value += 2 * Math.PI;
  return value;
}

/** What one `turnTo` step does to the bearing, before any pixel reaches the page. */
export interface RotateStep {
  /** The change the step asked for, clamped to the leg's own `turnStepRad`. */
  askedRad: number;
  /** The left-button drag the pointer is given, CSS pixels. */
  pixelsX: number;
  /** The azimuth change the controls will deliver; zero below the pointer's half-pixel resolution. */
  deliveredRad: number;
}

/**
 * The rotate control's arithmetic, with no page in it.
 *
 * A bearing is bought with left-button pixels, and two limits decide how many of
 * the radians asked for actually arrive. The first is the leg's own
 * `turnStepRad`. The second is `maxRotatePx`, the longest drag the pointer may
 * make in one gesture, converted at `2 * PI / clientHeight` — at this lane's
 * 1280x720 capture that is 40 px for 0.3491 rad, and **that** is the limit that
 * sets what a leg can turn in one step, because the plan's 0.5 and 0.6 rad steps
 * never reach the pixel cap otherwise. A leg whose swing asks for more than
 * 0.3491 rad a step therefore arrives short, and the shortfall is silent: the
 * driver reports `remainingRad` and drives on, so the leg opens wherever the
 * camera got to.
 *
 * That is not a hypothetical. The approach leg's swing was written as an
 * unwrapped angle running from `OPENING_AZIMUTH` the long way round to
 * `CROWD_AZIMUTH`, which is 7.7231 rad over six steps — 1.2872 rad a step, or
 * 3.7 times this cap. The driver delivered 0.3491 rad a step and its
 * shortest-angle arithmetic flipped sign twice on the way, so the approach ended
 * at azimuth 1.2872 rad against the 2.2253 the crowd leg's first frame needed:
 * 0.9381 rad, 53.8 degrees, short. The crowd leg then opened on a hill face
 * about 17 m from the scored pose, and the frames failed the clearance check.
 *
 * Exported because a plan's swing is only convergent against *this* arithmetic,
 * and a test that re-derived the cap would be checking its own copy of it rather
 * than the control's.
 */
export function rotateStepRadians(
  deltaRad: number,
  options: { maxStepRad: number; canvasHeightPx: number; maxRotatePx: number },
): RotateStep {
  const askedRad = clamp(deltaRad, -options.maxStepRad, options.maxStepRad);
  // `rotateLeft` subtracts from theta and is called with
  // `2 * PI * pixelsX / clientHeight`, so pixels that buy a positive change in
  // the azimuth are negative: a drag to the left. The sign lives here alone, so
  // a caller cannot disagree with it.
  const pixelsX = clamp(-askedRad / ((2 * Math.PI) / options.canvasHeightPx), -options.maxRotatePx, options.maxRotatePx);
  const deliveredRad = Math.abs(pixelsX) < 0.5 ? 0 : -pixelsX * ((2 * Math.PI) / options.canvasHeightPx);
  return { askedRad, pixelsX, deliveredRad };
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(low, Math.min(high, value));
}

/** One moment of the vertical control's iteration, and what it decided to do next. */
export interface StandConvergence {
  /** The camera's polar angle at this moment, radians. */
  polar: number;
  /** The controls' distance, metres. */
  distance: number;
  /** The controls' target height, metres — fixed by the app, not by this lane. */
  targetY: number;
  /** The highest terrain under the camera at this moment, metres. */
  groundM: number;
  /** The camera's height above that terrain at this moment, metres. */
  heightM: number;
  /** The height the plan asked for, metres above the ground. */
  wantedAboveGroundM: number;
  /** The leg's clearance floor, metres; `-Infinity` when the leg has none. */
  clearanceFloorM: number;
  /** The largest polar change one drag may command, radians. */
  maxStepRad: number;
  /** The longest drag the pointer may make in one gesture, CSS pixels. */
  maxRotatePx: number;
  /** Radians of polar change per pixel of drag, from the canvas's own height. */
  radiansPerPixelY: number;
  /** The bar the correction stops at, metres. */
  toleranceM: number;
  /** How many drags this step has dispatched so far. */
  iteration: number;
  /** The polar angle that would stand the camera at `reachedAboveGroundM`. */
  wantedPolar: number;
  /** The polar change the next drag asks for, clamped to `maxStepRad`. */
  commandedRad: number;
  /** Pixels of downward drag that buy it. */
  pixelsY: number;
  /** The height this moment is aiming at: the plan's ask, or the leg's floor. */
  reachedAboveGroundM: number;
  /**
   * True when the aim is a **floor**: being above it is done, and the correction
   * only ever climbs. `standAt` aims at a height and approaches it from either
   * side; a clearance rescue must not lower a camera the plan already placed.
   */
  atLeast?: boolean;
  /** True when a drag is left to dispatch at this moment. */
  commanded: boolean;
  /** Why no drag is left, when none is. */
  idle: string;
}

/**
 * One moment of the vertical control's closed loop, with no page in it.
 *
 * `standAt` iterates this: it hands over the pose and the ground the browser
 * reported, dispatches whatever drag comes back, reads the pose again and calls
 * this once more. Separated from the browser for the reason `rotateStepRadians`
 * is: the correction's convergence is the claim, and a claim about a loop that
 * only runs against a live page cannot be watched to fail cheaply. What the
 * helper computes is the whole of the arithmetic — the polar that stands the
 * camera `max(wanted, floor)` metres above the ground, the part of the remaining
 * error one drag may command, and whether any error is left to command.
 *
 * The floor is a **clamp on the aim** and not a separate control: a leg whose
 * ladder descends past its own floor is held at the floor, so the floor is
 * honoured by the same correction that honours the plan instead of by a rescue
 * that runs after the camera is already under it. The helper never returns a
 * downward command that would take the camera below the floor: the aim is
 * `max(wanted, floor)` and the correction approaches it from either side.
 */
export function standConverge(state: StandConvergence): StandConvergence {
  const floor = Number.isFinite(state.clearanceFloorM) ? state.clearanceFloorM : Number.NEGATIVE_INFINITY;
  // A floor aim is held **above** the floor by a margin that scales with the
  // camera's distance, and that is a fix rather than caution. The height this
  // helper reads is the one the controls report the instant the previous drag
  // returned, and a drag's spherical delta is still landing then: the camera carries
  // on climbing after the reading, so a correction that stops the moment the reading
  // touches the floor can settle under it. The overshoot scales with the distance
  // and with the size of the step, so the margin is a fraction of the distance —
  // 3% of it, and at least a decimetre — and a rescue that stops this far above the
  // floor settles at or above it.
  const overshootMarginM = state.atLeast === true ? Math.max(0.1, state.distance * 0.03) : 0;
  const reachedAboveGroundM = Math.max(state.wantedAboveGroundM, floor + overshootMarginM);
  const wantedCameraY = state.groundM + reachedAboveGroundM;
  const ratio = clamp((wantedCameraY - state.targetY) / state.distance, MIN_HEIGHT_RATIO, MAX_HEIGHT_RATIO);
  const wantedPolar = Math.acos(ratio);
  const remaining = wantedPolar - state.polar;

  state.reachedAboveGroundM = reachedAboveGroundM;
  state.wantedPolar = wantedPolar;
  // Within the convergence bar of the height the step is aiming at: no drag is
  // left, whatever the remaining angle looks like. The two are not the same
  // question when the ground under the camera is moving, which is the whole reason
  // this is read off the height and not off the angle. An aim that is a floor is
  // the one case with no bar below it: the convergence tolerance would let the
  // correction stop a few centimetres *under* the floor and call it settled, so a
  // camera at or above the floor is done and one under it keeps climbing.
  const heightError = state.heightM - reachedAboveGroundM;
  if (state.atLeast === true ? heightError >= 0 : Math.abs(heightError) <= state.toleranceM) {
    state.commandedRad = 0;
    state.pixelsY = 0;
    state.commanded = false;
    state.idle = `already within ${state.toleranceM} m of the height this step is aiming at`;
    return state;
  }

  const commandedRad = clamp(remaining, -state.maxStepRad, state.maxStepRad);
  if (Math.abs(commandedRad) < 0.002) {
    state.commandedRad = commandedRad;
    state.pixelsY = 0;
    state.commanded = false;
    state.idle = `less than 0.002 rad is left to correct, which is under one step of ${state.maxStepRad} rad`;
    return state;
  }

  // A **downward** drag lowers the polar angle and therefore raises the camera:
  // `_rotateUp` subtracts `2 * PI * pixelsY / clientHeight` from phi. The pixels and
  // not the radians are the input, so the pointer's own resolution is the second
  // place the correction can run out of room.
  const pixelsY = clamp(-commandedRad / state.radiansPerPixelY, -state.maxRotatePx, state.maxRotatePx);
  const deliverable = Math.abs(pixelsY) >= 0.5;
  state.commandedRad = commandedRad;
  state.pixelsY = deliverable ? pixelsY : 0;
  state.commanded = deliverable;
  state.idle = deliverable ? "" : `a drag of ${pixelsY.toFixed(2)} px is below the pointer's resolution`;
  return state;
}

/** What one dispatched left-button drag did to the camera, read back from the page. */
export interface VerticalDragOutcome {
  /** The camera's polar angle after the drag, radians. */
  polar: number;
  /** The controls' distance after the drag, metres. */
  distance: number;
  /** The controls' target height after the drag, metres. */
  targetY: number;
  /** The highest terrain under the camera after the drag, metres. */
  groundM: number;
  /** The camera's height above that terrain after the drag, metres. */
  heightM: number;
}

/** Everything the vertical control's loop needs from the controls, and nothing else. */
export interface VerticalCorrectionPage {
  /**
   * Read the camera and the ground under it, in one moment.
   *
   * Called once before any drag and once after each, so what the loop corrects
   * against is the pose the controls actually reached rather than the pose this
   * file assumed the last drag would leave.
   */
  observe(): Promise<VerticalDragOutcome>;
  /**
   * Dispatch one vertical drag: `pixelsY` positive is a downward drag, which
   * raises the camera.
   */
  drag(pixelsY: number): Promise<void>;
}

/** What one step's vertical correction did, drag by drag. */
export interface VerticalCorrectionOutcome {
  /** The height above the ground the step's aim resolved to, metres. */
  reachedAboveGroundM: number;
  /** The polar angle that aim needs, radians. */
  wantedPolar: number;
  /** The camera's polar angle before and after the correction, radians. */
  polarBefore: number;
  polarAfter: number;
  /** The camera's height above the ground before and after, metres. */
  heightBeforeM: number;
  heightAfterM: number;
  /** The pixels this correction dispatched in total, and how many drags carried them. */
  pixelsY: number;
  drags: number;
  /** True when the loop ran out of correction to dispatch: the aim is reached. */
  settled: boolean;
  /** Why no further drag was left, when the correction stopped short of its aim. */
  idle: string;
}

/**
 * The vertical control's correction of one step, iterated to its aim.
 *
 * This is the loop `standAt` and the in-step floor rescue both run, and it is one
 * function rather than two so that neither can drift from the other about what
 * "converged" means. It hands over the pose and the ground the browser reported,
 * dispatches whatever drag `standConverge` comes back with, reads the pose again
 * and repeats, to `MAX_STAND_DRAGS` drags.
 *
 * The iteration is the fix and not a flourish: one capped drag does not deliver the
 * angle it asks for — `OrbitControls` decays its spherical delta by 0.95 a frame —
 * so a single drag leaves the camera short of the height it was aiming at, and the
 * next step's zoom then scales what is left of the camera's offset. The recorded
 * 2026-09-17 run measured that as `approach-009` reading 0.19419 m above the ground
 * before its own vertical control ran and `approach-010` 1.07751 m, both under the
 * 1.5 m floor their captured clearances passed.
 *
 * Exported, with `VerticalCorrectionPage` as its page, because this is the claim:
 * `test/flythrough-stand.test.ts` drives *this* loop with a camera and a ground
 * profile in place of a browser, so the convergence it asserts is the shipped
 * loop's and not a copy of it.
 */
export async function runVerticalCorrection(
  page: VerticalCorrectionPage,
  initial: StandConvergence,
): Promise<VerticalCorrectionOutcome> {
  let state = standConverge(initial);
  const polarBefore = state.polar;
  const heightBeforeM = state.heightM;
  let observed = { polar: state.polar, distance: state.distance, targetY: state.targetY, groundM: state.groundM };
  let heightM = state.heightM;
  let pixelsY = 0;
  while (state.commanded && state.iteration < MAX_STAND_DRAGS) {
    await page.drag(state.pixelsY);
    pixelsY += state.pixelsY;
    const after = await page.observe();
    observed = { polar: after.polar, distance: after.distance, targetY: after.targetY, groundM: after.groundM };
    // The height the controls report is the one the whole correction is judged on,
    // and it is measured against the ground the drag left the camera over: the
    // ground is the camera's own, not the terrain at some assumed position.
    heightM = after.heightM;
    state = standConverge({
      ...state,
      polar: after.polar,
      distance: after.distance,
      targetY: after.targetY,
      groundM: after.groundM,
      heightM,
      iteration: state.iteration + 1,
    });
  }
  return {
    reachedAboveGroundM: state.reachedAboveGroundM,
    wantedPolar: state.wantedPolar,
    polarBefore,
    polarAfter: observed.polar,
    heightBeforeM,
    heightAfterM: heightM,
    pixelsY,
    drags: state.iteration,
    settled: !state.commanded,
    // `idle` is why no input was sent, so a correction that dispatched drags has
    // none to report: the helper's last message describes how it stopped, which for
    // an iterated correction is the convergence it reached and not a reason to idle.
    idle: state.iteration === 0 && !state.commanded ? state.idle : "",
  };
}

/**
 * The ground under any world point, from the terrain mesh the app is served.
 *
 * A copy of `tools/populated/terrain.ts`'s reader, kept here so this lane's
 * frames can be checked against the ground they stand over without importing a
 * module whose pose solver is written for settled poses. Both read the same file
 * with the same format, and a disagreement between them would be a disagreement
 * about the file, not about the camera.
 */
export interface GroundSample {
  /** The highest terrain within the radius that found anything, metres. */
  heightM: number;
  /** The radius that found it. Grows when a tight one finds nothing. */
  radiusM: number;
}

/**
 * The highest ground within reach of a world point.
 *
 * The radius grows rather than being fixed, and that is a fix from an earlier
 * run: the camera flew outside the built mesh because of a zoom bug, and a check
 * that threw on "no vertex within 8 m" reported it as a tool failure instead of
 * as the camera being 200 m off the area of interest. Widening the search
 * answers the question that was actually being asked — is the camera above the
 * ground beneath it — and the radius that answered it is recorded, so a frame
 * judged against a 96 m neighbourhood is visible as one.
 */
export function groundBelow(x: number, z: number): GroundSample {
  const { positions, vertexCount } = terrain();
  for (const radiusM of [8, 24, 48, 96, 192]) {
    let highest = Number.NEGATIVE_INFINITY;
    let count = 0;
    const squared = radiusM * radiusM;
    for (let index = 0; index < vertexCount; index += 1) {
      const dx = positions[index * 3]! - x;
      const dz = positions[index * 3 + 2]! - z;
      if (dx * dx + dz * dz > squared) continue;
      const y = positions[index * 3 + 1]!;
      if (y > highest) highest = y;
      count += 1;
    }
    if (count > 0) return { heightM: highest, radiusM };
  }
  throw new Error(
    `No terrain vertex is within 192 m of (${x}, ${z}), so that point is not over the built scene at all — ` +
      "the camera has left the area of interest and the frame it took is not of this city.",
  );
}

let terrainCache: { positions: Float32Array; vertexCount: number } | null = null;

/** The terrain mesh, read once. 4 MB of float32 is not a per-frame read. */
function terrain(): { positions: Float32Array; vertexCount: number } {
  if (terrainCache !== null) return terrainCache;
  const bytes = readFileSync("data/scene/terrain.mesh");
  const magic = bytes.toString("ascii", 0, 8);
  if (magic !== "MAPSMSH1") {
    throw new Error(`data/scene/terrain.mesh starts with "${magic}" rather than MAPSMSH1, so no frame can be checked against the ground it stands over. Run \`npm run data:scene\`.`);
  }
  const headerLength = bytes.readUInt32LE(8);
  const header = JSON.parse(bytes.toString("utf8", 12, 12 + headerLength)) as { vertexCount: number };
  terrainCache = {
    positions: new Float32Array(bytes.buffer, bytes.byteOffset + 12 + headerLength, header.vertexCount * 3),
    vertexCount: header.vertexCount,
  };
  return terrainCache;
}

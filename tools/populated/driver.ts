/**
 * The populated lane's own input path: panning the controls' target, reading the
 * population the way the bridge publishes it, and nothing else.
 *
 * The camera rule the whole harness lives under does not move here: nothing in
 * this file writes to the page. Panning is a **right-button drag on the canvas**,
 * the same control a person uses, dispatched through Chromium's real input path
 * by `page.mouse`. `tools/visual/orbit.ts` already drives rotation and zoom that
 * way; it has no pan, because no earlier lane needed to look anywhere but the
 * crossing, and `OrbitControls` keeps its target on the crossing until a pan
 * moves it.
 *
 * Aiming is a closed loop rather than an assignment, for the same reason
 * `orbitTo` is: `OrbitControls._pan` scales a drag by the current target
 * distance, the canvas height and the camera's own axes, and it is damped, so the
 * metres a drag buys are a property of the pose rather than a constant this file
 * could restate. Two probe drags measure the local map from pixels to metres, and
 * the loop corrects against the target the controls actually reached.
 *
 * Height is corrected separately, and it has to be. `_panUp` moves the target
 * along the camera's forward axis, which is only horizontal when the camera is
 * level; at the angles these poses use, panning across the city moves the target
 * several metres up or down as well, and a target tens of metres underground
 * frames a face of terrain. So a pan that is asked for a height does it in two
 * passes: travel at a level angle where the vertical leak is negligible, then —
 * if the target is still off the ground it was asked for — rotate steeply, pan
 * along the steep forward axis, and return to level to re-fix the horizontal
 * error that pass introduced.
 */

import type { Page } from "@playwright/test";

import type { CameraSnapshot } from "../../src/harness/bridge.js";
import type { PopulationStatus } from "../../src/agents/population/status.js";
import { OrbitDriver } from "../visual/orbit.js";

/** What the harness is allowed to know about the population: counts, no state. */
export type PopulationObservation = PopulationStatus;

/**
 * One frame's worth of everything the bridge publishes that this lane records.
 *
 * Read in a single `evaluate`, so the counts, the pose and the frame number come
 * from the same browser task and cannot describe two different moments.
 */
export interface PopulatedObservation {
  frameCount: number;
  /** Milliseconds since this browser session's time origin. */
  now: number;
  camera: CameraSnapshot;
  population: PopulationObservation;
  style: { id: string; label: string };
  glRenderer: string;
  tiles: { idle: boolean; pending: number; failed: number; visible: number; drawnMeshes: number; drawnTriangles: number; error: string | null };
  post: { active: boolean; error: string | null; taaAccumulating: boolean };
}

/** A world point to put the controls' target on. Only x and z are controllable. */
export interface AimPoint {
  x: number;
  z: number;
}

const POLL_MS = 60;

/**
 * How far one calibration drag moves the pointer, in CSS pixels.
 *
 * Large enough that the damped pan it starts is clear of the controls' own
 * rounding, small enough that two of them do not carry the target far from
 * where the loop is aiming.
 */
const PROBE_PX = 60;

/** The polar angle used while travelling: level enough that panning keeps height. */
const TRAVEL_POLAR = 1.55;

interface PanCalibration {
  /** World metres per CSS pixel of horizontal drag, as (x, z) columns. */
  a: number;
  b: number;
  c: number;
  d: number;
  /** Metres of target travel per pixel, in any direction. */
  metresPerPx: number;
  /** The camera distance this was measured at; it scales directly with distance. */
  distance: number;
}

export class PopulatedDriver {
  private readonly page: Page;
  private readonly orbit: OrbitDriver;
  private box = { x: 0, y: 0, width: 0, height: 0 };
  private calibration: PanCalibration | null = null;

  constructor(page: Page, orbit: OrbitDriver) {
    this.page = page;
    this.orbit = orbit;
  }

  /** The canvas box, read the same way the orbit driver reads it. */
  async readBox(): Promise<void> {
    const box = await this.page.locator("#scene").boundingBox();
    if (box === null || box.width === 0 || box.height === 0) {
      throw new Error("The canvas has no layout box, so a pan has nowhere to be sent. Either #scene is missing or CSS collapsed it to zero.");
    }
    this.box = box;
  }

  /**
   * Everything the bridge publishes that a populated frame's record needs, read
   * in one browser task.
   */
  async observe(): Promise<PopulatedObservation> {
    const observation = await this.page.evaluate(() => {
      // No cast: `population()` is declared on `HarnessBridge` as of the
      // render-defects work, and this lane is the reason it had to be. A harness
      // that has to widen the type to call a published member is reading a
      // contract that does not describe the object it holds.
      const harness = window.__mapsHarness;
      if (!harness) return null;
      const status = harness.status();
      return {
        frameCount: status.frameCount,
        now: performance.now(),
        camera: harness.camera(),
        population: harness.population(),
        style: harness.style(),
        glRenderer: status.glRenderer,
        tiles: harness.tiles(),
        post: harness.post(),
      };
    });
    if (observation === null) throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
    return observation as PopulatedObservation;
  }

  /**
   * Wait for the population's tick counter to reach a value.
   *
   * The tick counter is the clock this lane's capture plan is written in. It is
   * the population's own fixed step, so it is the same counter
   * `tools/populated/probe.ts` measured, whatever rate the machine renders at.
   */
  async waitForTick(tick: number, timeoutMs = 40 * 60_000): Promise<PopulationObservation> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const observation = await this.observe();
      if (!observation.population.attached) {
        throw new Error(
          "No population is attached to this page. The lane loads ?agents=1; a page without it renders the " +
            "same city the population-free appearance sweep photographs, and a frame of it would be recorded " +
            "here as if it showed the population.",
        );
      }
      if (observation.population.ticks >= tick) return observation.population;
      if (Date.now() > deadline) {
        throw new Error(
          `Waited ${timeoutMs} ms for population tick ${tick} and the simulation reached tick ` +
            `${observation.population.ticks} (${observation.population.simulatedSeconds.toFixed(1)} simulated ` +
            `seconds) at render frame ${observation.frameCount}. The simulated clock advances at most five fixed ` +
            "steps per rendered frame, so this is the frame rate rather than the tick count that is short.",
        );
      }
      await this.page.waitForTimeout(POLL_MS);
    }
  }

  /**
   * One pan gesture: press the right button, move, release.
   *
   * Split into passes so a large drag does not leave the canvas, exactly as the
   * orbit driver splits its rotation.
   */
  private async panDrag(deltaX: number, deltaY: number): Promise<void> {
    const maxX = this.box.width * 0.3;
    const maxY = this.box.height * 0.3;
    const passes = Math.max(1, Math.ceil(Math.abs(deltaX) / maxX), Math.ceil(Math.abs(deltaY) / maxY));

    for (let pass = 0; pass < passes; pass += 1) {
      const stepX = deltaX / passes;
      const stepY = deltaY / passes;
      const startX = this.box.x + this.box.width / 2 - stepX / 2;
      const startY = this.box.y + this.box.height / 2 - stepY / 2;
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down({ button: "right" });
      await this.page.mouse.move(startX + stepX, startY + stepY, { steps: 10 });
      await this.page.mouse.up({ button: "right" });
    }
  }

  /** Two probe drags, measuring the pan map from canvas pixels to world metres. */
  private async measurePan(distance: number): Promise<PanCalibration> {
    if (this.calibration !== null && Math.abs(this.calibration.distance - distance) / distance < 0.02) {
      return this.calibration;
    }
    if (this.box.width === 0) await this.readBox();

    const start = (await this.orbit.readCamera()).target;
    await this.panDrag(PROBE_PX, 0);
    await this.orbit.settle();
    const across = (await this.orbit.readCamera()).target;
    await this.panDrag(0, PROBE_PX);
    await this.orbit.settle();
    const along = (await this.orbit.readCamera()).target;

    const a = (across.x - start.x) / PROBE_PX;
    const c = (across.z - start.z) / PROBE_PX;
    const b = (along.x - across.x) / PROBE_PX;
    const d = (along.z - across.z) / PROBE_PX;
    const metresPerPx = Math.hypot(b, d);
    if (![a, b, c, d, metresPerPx].every(Number.isFinite) || metresPerPx < 1e-6 || a * d - b * c === 0) {
      throw new Error(
        `Two right-button drags of ${PROBE_PX} px moved the target by ${metresPerPx.toFixed(9)} m per pixel. ` +
          "Panning is the only control that moves the target off the crossing, so a drag that moves nothing means " +
          "the pose this lane asks for would be a request rather than a movement, and every frame would be of the " +
          "crossing whatever the plan says.",
      );
    }
    this.calibration = { a, b, c, d, metresPerPx, distance };
    return this.calibration;
  }

  /** Drive the target's horizontal position to (x, z) with the measured map. */
  private async panHorizontal(x: number, z: number, calibration: PanCalibration, toleranceM: number, maxCorrections: number): Promise<CameraSnapshot> {
    let camera = await this.orbit.readCamera();
    const { a, b, c, d } = calibration;
    const determinant = a * d - b * c;

    for (let attempt = 0; attempt <= maxCorrections; attempt += 1) {
      const errorX = x - camera.target.x;
      const errorZ = z - camera.target.z;
      if (Math.hypot(errorX, errorZ) <= toleranceM) return camera;

      const pixelsX = (d * errorX - b * errorZ) / determinant;
      const pixelsY = (-c * errorX + a * errorZ) / determinant;
      await this.panDrag(
        clamp(pixelsX, -this.box.width * 0.8, this.box.width * 0.8),
        clamp(pixelsY, -this.box.height * 0.8, this.box.height * 0.8),
      );
      await this.orbit.settle();
      camera = await this.orbit.readCamera();
    }

    throw new Error(
      `The controls would not pan their target to x ${x}, z ${z} after ${maxCorrections} corrective drags; they ` +
        `reached x ${camera.target.x.toFixed(1)}, z ${camera.target.z.toFixed(1)}. The target starts at the crossing ` +
        "and only a pan moves it, so a target that does not move means the right-button drag did not reach the controls.",
    );
  }

  /**
   * Aim the controls' target at a world point.
   *
   * Only the horizontal position is driven, because only the horizontal position
   * can be driven: `OrbitControls` pans along the camera's right axis and along
   * `up x right`, and a cross product with the world up vector is horizontal, so
   * the target's height is the same after any pan as it was before it. That is
   * not an assumption — the first run of this lane measured it, and the target
   * stayed at the crossing's own 15.2 m through a 500 m pan. It is also why the
   * camera's *height* has to be solved from the terrain rather than panned to:
   * see `terrain.ts`.
   *
   * The returned snapshot is the pose the controls actually reached, which is what
   * every frame record carries: the plan's request is recorded beside it and the
   * two are allowed to differ.
   */
  async aimAt(point: AimPoint, toleranceM = 8): Promise<CameraSnapshot> {
    if (this.box.width === 0) await this.readBox();
    // Level first: at a nearly level camera both pan axes are horizontal, so
    // travelling across the city does not move the target's height at all.
    await this.orbit.orbitTo((await this.orbit.readCamera()).azimuth, TRAVEL_POLAR);

    // Three rounds, each with a freshly measured map. One measured map is enough
    // when the drags land where the map says they will; a long pan under a
    // reloading tileset does not always, and run 3 of this lane stopped 35 m short
    // of the boundary pose after eight corrections against one stale map. A round
    // that has to re-measure costs two probe drags; a pose that is never reached
    // costs the whole sequence.
    let camera = await this.orbit.readCamera();
    for (let round = 0; round < 3; round += 1) {
      this.calibration = null;
      const calibration = await this.measurePan((await this.orbit.readCamera()).distance);
      try {
        camera = await this.panHorizontal(point.x, point.z, calibration, toleranceM, 6);
        return camera;
      } catch (error) {
        if (round === 2) throw error;
        console.log(`  aim: pan round ${round + 1} stopped short, re-measuring and trying again`);
      }
    }
    return camera;
  }
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(low, Math.min(high, value));
}

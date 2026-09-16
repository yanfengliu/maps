/**
 * Drives the camera the way a person does: pointer drags and wheel ticks on the
 * canvas, dispatched through Chromium's real input path.
 *
 * The rule this file exists to keep, from the fleet canon:
 *
 *   "A harness that sets state directly — assigning the camera pose, calling the
 *   render function, writing the store — is not exercising the controls, and is
 *   structurally blind to every defect living in the input path it skipped,
 *   while reporting confidently on the path it kept."
 *
 * So nothing here writes to the page. `page.mouse` goes through the Chrome
 * DevTools Protocol, which raises genuine `pointerdown`, `pointermove`,
 * `pointerup` and `wheel` events at the browser level — the same events a mouse
 * raises, including pointer capture, not `element.dispatchEvent` fakes. The only
 * `evaluate` calls in this file read the frozen bridge in
 * `src/harness/bridge.ts`, which has no setter to call.
 *
 * Aiming at a pose is therefore a closed loop rather than an assignment: drag,
 * look at where the camera ended up, drag again if it is off. That is also what
 * a person does, and it keeps the harness working when the pixel-to-radian
 * constant inside OrbitControls changes under a three.js upgrade.
 */

import type { Page } from "@playwright/test";
import { CameraSettling, shortestAngle, type CameraObservation, type SettleMode } from "./settling.js";
export { shortestAngle } from "./settling.js";

// Types only. The import also brings in the `window.__mapsHarness` declaration
// so this file sees the same read-only shape the app publishes rather than a
// copy of it that can drift. Nothing runnable crosses this boundary: the checks
// on the frames themselves read the PNG bytes and share nothing with the app.
import type { CameraSnapshot, RenderStatus, TileStatus } from "../../src/harness/bridge.js";

export type { CameraSnapshot, RenderStatus, TileStatus };

export interface OrbitDriverOptions {
  /** How close to the requested pose counts as arrived, in radians. */
  angleTolerance?: number;
  /** How close to the requested distance counts as arrived, as a fraction. */
  distanceTolerance?: number;
  /** Corrective inputs allowed before giving up on a pose. */
  maxCorrections?: number;
}

/** Must match the `app-id` meta tag in `index.html`. */
const APP_ID = "maps-shibuya-1km";

const POLL_MS = 60;
const MAX_POLLS = 400;

/**
 * What the settle wait is allowed to spend, and why it is counted in frames.
 *
 * The predicate in `CameraSettling` is frame-counted: `advancedFrames >= 12`
 * plus three quiet intervals. The frame count it needs is therefore a property
 * of the camera and the predicate, not of the renderer — only the price of a
 * frame changes between lanes. Measured 2026-09-15/16 (`artifacts/gate-timing`):
 * the same predicate, pose and build need 12 frames / 200 ms on the RTX 4090
 * over D3D11 and 58 frames / 134.6 s on SwiftShader, where the frame interval
 * ranged 16.6 ms to 6,150 ms **within one run**.
 *
 * A wall-clock deadline cannot track a per-frame cost that moves 370x. The
 * previous 5-minute deadline did exactly that and failed a real gate run at
 * 301,660 ms with 71 frames advanced and 0 quiet intervals — 71 frames of
 * progress reported as if the renderer had stopped. The budget's unit is
 * therefore the unit the predicate consumes.
 *
 * Three bounds, and a failure names the one it hit:
 *
 * - `SETTLE_FRAME_BUDGET` (320 frames) — the real bound. Hardware needs 12
 *   frames for a correction and 76 for the longest measured `orbitTo`
 *   correction, so this is about 4x the worst observed need, and it is more
 *   than 4x the 71 frames the failing run reached. A pose that cannot settle in
 *   320 frames is not being failed by the machine's speed. Its limit: 320 frames
 *   is 22.7 minutes at the failing run's 4.25 s per frame, so at any cost below
 *   about 5.6 s per frame the frame budget is the one that expires first.
 * - `SETTLE_WALL_BACKSTOP_MS` (30 min) — a loose safety valve for the one case a
 *   frame ceiling cannot bound: frames that do advance, but so slowly that
 *   waiting is pointless. It is 6x the deadline it replaces, on purpose, so that
 *   the frame budget rather than the clock is what a real run hits.
 * - `STALLED_FRAME_FLOOR_MS` (15 s) and `STALL_MULTIPLE` (8x) — the renderer
 *   stopped, which is a different defect with a different fix and must never be
 *   reported as a budget failure. Silence is called a stall only after 8x the
 *   longest gap actually measured between two advances, floored at 15 s. Both
 *   numbers come from the measured spread rather than from taste: the software
 *   lane's largest observed frame gap was 6,150 ms and its p90 was 4,317 ms, so
 *   the floor clears the worst frame a real run has produced by 2.4x, and at the
 *   failing run's pace the measured bound is about 49 s.
 *
 * The floor's real constraint is not its margin but its position: a gap longer
 * than the floor can never complete, because the detector fires first. A floor
 * above a renderer's own gap therefore replaces the measured bound with a
 * constant exactly where the measurement is wanted, which is why this value is
 * 15 s and not the 30 s or 60 s tried first.
 */
const SETTLE_FRAME_BUDGET = 320;
const SETTLE_WALL_BACKSTOP_MS = 30 * 60_000;
const STALLED_FRAME_FLOOR_MS = 15_000;
const STALL_MULTIPLE = 8;

/**
 * The bounds above, as data.
 *
 * Exported so a test can state the shape of a failure without restating a
 * number that lives here. A unit case that hardcodes 60,000 is a second copy of
 * the constant, and the two can disagree while both look correct.
 */
export const SETTLE_BUDGET = Object.freeze({
  frames: SETTLE_FRAME_BUDGET,
  wallBackstopMs: SETTLE_WALL_BACKSTOP_MS,
  stalledFrameFloorMs: STALLED_FRAME_FLOOR_MS,
  stallMultiple: STALL_MULTIPLE,
});

function describeSettle(mode: SettleMode, elapsedMs: number, advancedFrames: number, quietIntervals: number, polls: number, maxFrameIntervalMs: number): string {
  return (
    `mode ${mode}, ${elapsedMs} ms elapsed, ${advancedFrames} frames advanced, ` +
    `${quietIntervals} quiet intervals, ${polls} polls, longest measured frame interval ${maxFrameIntervalMs} ms`
  );
}

export class OrbitDriver {
  private readonly page: Page;
  private readonly angleTolerance: number;
  private readonly distanceTolerance: number;
  private readonly maxCorrections: number;

  /** The canvas box in CSS pixels, read from the page once the scene is up. */
  private box = { x: 0, y: 0, width: 0, height: 0 };

  constructor(page: Page, options: OrbitDriverOptions = {}) {
    this.page = page;
    this.angleTolerance = options.angleTolerance ?? 0.012;
    this.distanceTolerance = options.distanceTolerance ?? 0.02;
    this.maxCorrections = options.maxCorrections ?? 8;
  }

  /**
   * Wait for the app to draw. Fails by name for each way it can fail to draw,
   * because "the scene is wrong" and "the scene never started" need different
   * fixes and a screenshot cannot tell them apart.
   */
  async waitForFirstFrame(timeoutMs = 60_000): Promise<RenderStatus> {
    await this.assertServingThisApp();
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      // Read through evaluate, not a locator: `locator.textContent()` waits for
      // the element to appear, and the element this looks for is one that should
      // never appear, so the wait would be the whole timeout every poll.
      const bootError = await this.page.evaluate(
        () => document.querySelector("#boot-error")?.textContent ?? null,
      );
      if (bootError !== null) {
        throw new Error(`The app reported a boot failure on the page:\n${bootError}`);
      }

      const status = await this.page.evaluate(() => window.__mapsHarness?.status() ?? null);
      if (status !== null) {
        if (status.error !== null) {
          throw new Error(`The app failed to start: ${status.error}`);
        }
        if (status.contextLost) {
          throw new Error(
            "The WebGL context was lost, so any frame captured now would be a stale buffer.",
          );
        }
        if (status.ready && status.frameCount > 0) {
          if (process.env["MAPS_VISUAL_GPU"] === "hardware" &&
            (!/NVIDIA|GeForce|RTX/i.test(status.glRenderer) || /SwiftShader|llvmpipe|software/i.test(status.glRenderer))) {
            throw new Error(`Hardware rendering was requested, but Chromium reports ${status.glRenderer}. This lane requires the NVIDIA GPU; software fallback is not a performance measurement.`);
          }
          await this.readCanvasBox();
          return status;
        }
      }
      await this.page.waitForTimeout(POLL_MS);
    }

    const last = await this.page.evaluate(() => window.__mapsHarness?.status() ?? null);
    if (last === null) {
      throw new Error(
        `No harness bridge appeared on window within ${timeoutMs} ms. The app's module never ran, ` +
          "so nothing was rendered and nothing is worth screenshotting.",
      );
    }
    throw new Error(
      `The render loop drew ${last.frameCount} frames in ${timeoutMs} ms, so the canvas never ` +
        `produced a frame. WebGL renderer reported as "${last.glRenderer}", drawing buffer ` +
        `${last.drawingBufferWidth}x${last.drawingBufferHeight}.`,
    );
  }

  /**
   * Check the page is this app before anything is captured.
   *
   * Ports are shared across the fleet and every Vite repo previews on the same
   * default, so "something answered on the port" is not "our app is running".
   * A sibling project's `vite preview` was found holding this port during
   * Phase 0, and without this check the gate spends ten minutes waiting on a
   * bridge that page was never going to publish, then reports a timeout that
   * says nothing about which app it was looking at.
   */
  private async assertServingThisApp(): Promise<void> {
    const identity = await this.page.evaluate(() => ({
      appId:
        document.querySelector<HTMLMetaElement>('meta[name="app-id"]')?.content ?? null,
      title: document.title,
      url: window.location.href,
    }));

    if (identity.appId !== APP_ID) {
      const port = portOf(identity.url);
      throw new Error(
        `Port ${port} is serving a different app, so this run would photograph that one. ` +
          `${identity.url} carries meta app-id ` +
          `${identity.appId === null ? "absent" : `"${identity.appId}"`} and the title ` +
          `"${identity.title}". This gate captures only a page whose ` +
          `<meta name="app-id"> is "${APP_ID}". Free port ${port}, or point the gate at the ` +
          "port this app previews on, and run it again.",
      );
    }
  }

  async readStatus(): Promise<RenderStatus> {
    const status = await this.page.evaluate(() => window.__mapsHarness?.status() ?? null);
    if (status === null) {
      throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
    }
    return status;
  }

  async readCamera(): Promise<CameraSnapshot> {
    const camera = await this.page.evaluate(() => window.__mapsHarness?.camera() ?? null);
    if (camera === null) {
      throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
    }
    return camera;
  }

  /** The pose and frame count must come from the same browser task. */
  async readCameraObservation(): Promise<CameraObservation> {
    const observation = await this.page.evaluate(() => {
      const harness = window.__mapsHarness;
      return harness ? { epoch: performance.timeOrigin, status: harness.status(), camera: harness.camera() } : null;
    });
    if (observation === null) throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
    return observation;
  }

  async readTiles(): Promise<TileStatus> {
    const tiles = await this.page.evaluate(() => window.__mapsHarness?.tiles() ?? null);
    if (tiles === null) {
      throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
    }
    return tiles;
  }

  /**
   * Wait until the building tileset has stopped loading for the pose it is at.
   *
   * The city refines from the camera: move it and the traversal asks for
   * different tiles, and until those arrive the frame shows a coarser Shibuya
   * than the one under review. Capturing without this waits produces frames that
   * differ between runs for reasons that have nothing to do with the scene, and —
   * worse — a reviewer would read a half-refined block as the data being poor.
   *
   * Idle is not one poll of a counter. A tile that finishes parsing queues its
   * children, so the count drops to zero and rises again; this asks for several
   * consecutive idle polls, and separately requires frames to keep being drawn,
   * because a stopped loop also reports nothing pending.
   */
  async waitForTilesIdle(): Promise<TileStatus> {
    const idlePollsNeeded = 5;
    let idlePolls = 0;
    let last = await this.readTiles();

    for (let poll = 0; poll < MAX_POLLS; poll += 1) {
      await this.page.waitForTimeout(POLL_MS);
      const tiles = await this.readTiles();
      const status = await this.readStatus();

      if (tiles.error !== null) {
        throw new Error(`The building tileset reported a load failure:
${tiles.error}`);
      }
      if (tiles.failed > 0) {
        throw new Error(
          `${tiles.failed} building tiles failed to load. The scene would be photographed with ` +
            "holes in it, and a hole in a city looks like a car park.",
        );
      }
      if (status.contextLost) {
        throw new Error("The WebGL context was lost while waiting for the tileset to settle.");
      }

      last = tiles;
      idlePolls = tiles.idle ? idlePolls + 1 : 0;
      if (idlePolls >= idlePollsNeeded) return tiles;
    }

    throw new Error(
      `The building tileset never stopped loading: after ${MAX_POLLS * POLL_MS} ms it still had ` +
        `${last.pending} tiles in flight, with ${last.loaded} loaded and ${last.visible} visible. ` +
        "Capturing now would photograph a city that is still filling in.",
    );
  }

  private async readCanvasBox(): Promise<void> {
    const box = await this.page.locator("#scene").boundingBox();
    if (box === null || box.width === 0 || box.height === 0) {
      throw new Error(
        "The canvas has no layout box, so there is nothing to send pointer events to. " +
          "Either #scene is missing or CSS collapsed it to zero.",
      );
    }
    this.box = box;
  }

  /**
   * Radians of camera rotation per CSS pixel of drag.
   *
   * OrbitControls turns a drag into `2 * PI * pixels / domElement.clientHeight`
   * for both axes. This is the opening estimate only; the closed loop below is
   * what actually gets the camera where it is asked to go, so a change to that
   * constant costs an extra corrective drag and nothing else.
   */
  private get radiansPerPixel(): number {
    return (2 * Math.PI) / this.box.height;
  }

  /** One press-move-release, split so the pointer stays inside the canvas. */
  private async drag(deltaX: number, deltaY: number): Promise<void> {
    const maxX = this.box.width * 0.34;
    const maxY = this.box.height * 0.28;
    const passes = Math.max(
      1,
      Math.ceil(Math.abs(deltaX) / maxX),
      Math.ceil(Math.abs(deltaY) / maxY),
    );

    for (let pass = 0; pass < passes; pass += 1) {
      const stepX = deltaX / passes;
      const stepY = deltaY / passes;
      const startX = this.box.x + this.box.width / 2 - stepX / 2;
      const startY = this.box.y + this.box.height / 2 - stepY / 2;

      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      // Several intermediate moves, so the incremental path OrbitControls takes
      // per `pointermove` is the path being exercised, not one giant jump.
      await this.page.mouse.move(startX + stepX, startY + stepY, { steps: 12 });
      await this.page.mouse.up();
    }
  }

  /** One or more wheel ticks over the middle of the canvas. */
  private async wheel(totalDelta: number): Promise<void> {
    const perTick = 240;
    const ticks = Math.max(1, Math.round(Math.abs(totalDelta) / perTick));
    const signedTick = Math.sign(totalDelta) * (Math.abs(totalDelta) / ticks);

    await this.page.mouse.move(this.box.x + this.box.width / 2, this.box.y + this.box.height / 2);
    for (let tick = 0; tick < ticks; tick += 1) {
      await this.page.mouse.wheel(0, signedTick);
    }
  }

  /**
   * Wait until the camera stops moving and frames are still being drawn.
   *
   * Damping means the camera keeps gliding after the pointer is released, so
   * capturing straight after an input would photograph a different point of the
   * glide every run. Two conditions, not one: the pose has to stop changing, and
   * the frame counter has to keep advancing. Without the second, a frozen loop
   * reads as a perfectly still camera.
   *
   * **The bar for settled is unchanged**: three quiet fresh intervals and at
   * least twelve advanced frames, exactly as `CameraSettling` computes it. What
   * changed is the deadline's unit. It used to be wall-clock alone, which is the
   * one quantity this lane cannot control, and which reported a 71-frame budget
   * failure as though the renderer had stalled. The bounds are now the frame
   * budget, the wall-clock backstop and the adaptive stall bound documented on
   * `SETTLE_FRAME_BUDGET` above, and each failure says which one it was.
   */
  async settle(mode: SettleMode = "capture"): Promise<CameraSnapshot> {
    const started = Date.now();
    let observation = await this.readCameraObservation();
    const tracker = new CameraSettling(observation, mode);
    let measured = tracker.observe(observation);

    let polls = 0;
    let previousFrameAt = started;
    let lastFrameAt = started;
    let lastFrameCount = observation.status.frameCount;
    let maxFrameIntervalMs = 0;

    const verdict = (elapsedMs: number): Error => {
      const situation = describeSettle(
        mode, elapsedMs, measured.advancedFrames, measured.quietIntervals, polls, maxFrameIntervalMs,
      );
      if (measured.advancedFrames >= SETTLE_FRAME_BUDGET) {
        return new Error(
          `Settle budget exhausted for ${mode} at ${SETTLE_FRAME_BUDGET} frames advanced over ` +
            `${elapsedMs} ms (${situation}). The renderer kept drawing, so this is a budget ` +
            "failure under load, not a stall: the frames advanced and the predicate's own bar " +
            "(three quiet intervals and twelve advanced frames) was still not met. Raise " +
            "SETTLE_FRAME_BUDGET only with a measurement that says how many frames the pose " +
            "needs. Capturing now would record a moving baseline.",
        );
      }
      return new Error(
        `Settle wall-clock backstop of ${SETTLE_WALL_BACKSTOP_MS} ms expired for ${mode} before ` +
          `the ${SETTLE_FRAME_BUDGET}-frame budget was reached (${situation}). Frames did advance, ` +
          "so this is a budget failure under a renderer this slow, not a stall. Capturing now " +
          "would record a moving baseline.",
      );
    };

    for (;;) {
      await this.page.waitForTimeout(POLL_MS);
      polls += 1;
      observation = await this.readCameraObservation();

      const now = Date.now();
      if (observation.status.frameCount > lastFrameCount) {
        // The gap between two advances, which is the only honest measure of this
        // renderer's pace. The wait from `started` to the first advance is not one
        // — it is the same quantity that grows when the renderer dies — so
        // counting it would let a renderer's own first slow frame set its own
        // bound, and a renderer that never draws a second frame would raise its
        // bound instead of tripping it.
        const gap = now - previousFrameAt;
        if (gap > maxFrameIntervalMs) maxFrameIntervalMs = gap;
        previousFrameAt = now;
        lastFrameAt = now;
        lastFrameCount = observation.status.frameCount;
      }

      measured = tracker.observe(observation);

      // The predicate is consulted first. A capture this wait has already earned
      // must not be failed by a stall that happens afterwards: the frames it
      // needed were drawn, the pose was still, and the buffer it would return is
      // the one that was asked for.
      if (measured.done) return observation.camera;

      // The stall bound follows the renderer rather than a constant: a frame
      // interval that has already been observed at 6,150 ms makes a 15 s deadline
      // a coin toss on the next frame, and calling a still-drawing renderer
      // stalled is exactly the confusion this file exists to end. On the failing
      // run's measured pace this bound is about 49 s, more forgiving than any
      // constant that machine could have been given. Until one gap has been
      // measured the floor is all there is, and the floor is the right answer
      // then: a renderer that has drawn one frame and then nothing for 15 s has
      // shown nothing to scale a bound from.
      const stalledAfterMs = Math.max(STALLED_FRAME_FLOOR_MS, maxFrameIntervalMs * STALL_MULTIPLE);
      const silentMs = now - lastFrameAt;
      if (silentMs >= stalledAfterMs) {
        throw new Error(
          `The renderer stopped advancing frames during ${mode} settling: frame ` +
            `${observation.status.frameCount} did not advance for ${silentMs} ms, against a ` +
            `stall bound of ${stalledAfterMs} ms (${describeSettle(
              mode, now - started, measured.advancedFrames, measured.quietIntervals, polls, maxFrameIntervalMs,
            )}). Nothing was drawn, so the camera may be perfectly still and the buffer is stale ` +
            "either way — a still buffer is not a completed capture. This is a stall, not a " +
            "budget failure: the frame counter, not the clock, is what stopped.",
        );
      }

      if (measured.advancedFrames >= SETTLE_FRAME_BUDGET || now - started >= SETTLE_WALL_BACKSTOP_MS) {
        throw verdict(now - started);
      }
    }
  }

  /**
   * Drag until the camera reaches the requested azimuth and polar angle.
   *
   * Requested, not assigned. If OrbitControls refuses to go somewhere — the
   * polar clamp that stops the camera going underground, say — this throws with
   * the pose it actually reached, which is the useful thing to know.
   */
  async orbitTo(azimuth: number, polar: number): Promise<CameraSnapshot> {
    let camera = await this.readCamera();

    for (let attempt = 0; attempt <= this.maxCorrections; attempt += 1) {
      const azimuthError = shortestAngle(azimuth - camera.azimuth);
      const polarError = polar - camera.polar;
      if (
        Math.abs(azimuthError) <= this.angleTolerance &&
        Math.abs(polarError) <= this.angleTolerance
      ) {
        return camera;
      }

      // rotateLeft subtracts from theta and rotateUp subtracts from phi, so a
      // positive wanted change needs a negative drag on both axes.
      const perPixel = this.radiansPerPixel;
      await this.drag(-azimuthError / perPixel, -polarError / perPixel);
      camera = await this.settle();
    }

    throw new Error(
      `The controls would not reach azimuth ${azimuth.toFixed(3)} rad, polar ${polar.toFixed(3)} rad ` +
        `after ${this.maxCorrections} corrective drags. They stopped at azimuth ` +
        `${camera.azimuth.toFixed(3)}, polar ${camera.polar.toFixed(3)}. If the polar angle is ` +
        "pinned, the requested elevation is outside the controls' own clamp.",
    );
  }

  /** Wheel until the camera is the requested distance from its target. */
  async zoomTo(distance: number): Promise<CameraSnapshot> {
    let camera = await this.readCamera();

    for (let attempt = 0; attempt <= this.maxCorrections; attempt += 1) {
      const ratio = distance / camera.distance;
      if (Math.abs(ratio - 1) <= this.distanceTolerance) {
        return camera;
      }

      // One wheel tick of -100 units scales the radius by 0.95, so the tick
      // count for a distance ratio is its log in that base. The sign matters and
      // is easy to get backwards: negative deltaY dollies *in*, so wanting a
      // smaller distance means a negative total.
      const ticks = Math.log(ratio) / Math.log(0.95);
      await this.wheel(-ticks * 100);
      camera = await this.settle();
    }

    throw new Error(
      `The controls would not reach ${distance.toFixed(0)} m from the target after ` +
        `${this.maxCorrections} wheel corrections; they stopped at ${camera.distance.toFixed(0)} m. ` +
        "If the distance is pinned, the requested zoom is outside minDistance/maxDistance.",
    );
  }
}

/**
 * The port a page URL was served from, as text.
 *
 * The port is the whole point of the wrong-app error, and a URL with the default
 * port in it does not spell the port out, so this fills it in rather than leaving
 * the reader to know which port a scheme implies.
 */
function portOf(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return `(no port in "${url}")`;
  }
  if (parsed.port !== "") return parsed.port;
  return parsed.protocol === "https:" ? "443" : "80";
}

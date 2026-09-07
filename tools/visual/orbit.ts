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

// Types only. The import also brings in the `window.__mapsHarness` declaration
// so this file sees the same read-only shape the app publishes rather than a
// copy of it that can drift. Nothing runnable crosses this boundary: the checks
// on the frames themselves read the PNG bytes and share nothing with the app.
import type { CameraSnapshot, RenderStatus } from "../../src/harness/bridge.js";

export type { CameraSnapshot, RenderStatus };

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
/** Per-poll pose change under which the camera counts as still. */
const STILL_EPSILON = 2e-4;
/** Consecutive still polls required before a frame is captured. */
const STILL_POLLS = 3;
/** Frames that must be drawn after an input before the camera can count as still. */
const MIN_FRAMES_AFTER_INPUT = 12;

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
   */
  async settle(): Promise<CameraSnapshot> {
    const framesAtStart = (await this.readStatus()).frameCount;
    let previous = await this.readCamera();
    let stillPolls = 0;
    let lastFrameCount = framesAtStart;
    let stalledPolls = 0;

    for (let poll = 0; poll < MAX_POLLS; poll += 1) {
      await this.page.waitForTimeout(POLL_MS);
      const status = await this.readStatus();
      const camera = await this.readCamera();

      if (status.contextLost) {
        throw new Error("The WebGL context was lost while waiting for the camera to settle.");
      }

      if (status.frameCount === lastFrameCount) {
        stalledPolls += 1;
        if (stalledPolls > 8) {
          throw new Error(
            `The render loop stopped: the frame count has been stuck at ${status.frameCount} for ` +
              `${stalledPolls * POLL_MS} ms. A still camera and a stopped renderer look identical ` +
              "in a screenshot, so this is failed rather than captured.",
          );
        }
      } else {
        stalledPolls = 0;
      }
      lastFrameCount = status.frameCount;

      const moved = Math.max(
        Math.abs(shortestAngle(camera.azimuth - previous.azimuth)),
        Math.abs(camera.polar - previous.polar),
        Math.abs(camera.distance - previous.distance) / Math.max(camera.distance, 1),
      );
      previous = camera;

      stillPolls = moved < STILL_EPSILON ? stillPolls + 1 : 0;
      if (
        stillPolls >= STILL_POLLS &&
        status.frameCount - framesAtStart >= MIN_FRAMES_AFTER_INPUT
      ) {
        return camera;
      }
    }

    throw new Error(
      `The camera never settled: it was still moving after ${MAX_POLLS * POLL_MS} ms. ` +
        "Capturing now would record a different point of the glide on every run.",
    );
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

/** Wrap an angle difference into [-PI, PI] so 359 degrees is a step of one. */
export function shortestAngle(radians: number): number {
  const wrapped = ((radians % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI);
  return wrapped - Math.PI;
}

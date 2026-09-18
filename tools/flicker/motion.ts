/**
 * A camera that is still moving when the shutter opens.
 *
 * Every existing lane in this repository settles the camera before it captures:
 * `OrbitDriver.settle` waits for three quiet intervals and twelve advanced
 * frames, because a frame taken mid-glide is a different picture every run. This
 * lane is the opposite instrument. Its question is what changes *between* two
 * frames while the camera moves, so the one thing it must not do is stop the
 * camera - and the criterion it exists for, "no flicker or crawl over a moving
 * sequence", cannot be judged from frames taken between two glides.
 *
 * What is unchanged is the rule the harness keeps: the camera moves only through
 * synthesised pointer input on the canvas, gone through Chromium's own input
 * path by `page.mouse`, and nothing here assigns a camera position, calls a
 * controls setter or calls the render function. `OrbitDriver` in
 * `tools/visual/orbit.ts` is reused rather than reimplemented, so the reading of
 * the frozen bridge and the app-identity check are the same code the appearance
 * gate runs. Only the *pacing* of the input is new, and it is new here because
 * every other lane wanted the opposite of it.
 *
 * ## The shape of the input path
 *
 * A path is walked as a run of short gestures: press, a few moves in the same
 * direction, release - repeated while the capture runs, so the camera is always
 * mid-motion when `page.screenshot()` opens its shutter. The gestures are small
 * enough (a few CSS pixels each) that the picture crawls rather than sweeps,
 * which is the regime the criterion names.
 *
 * The pointer is walked within a box at the centre of the canvas, and the
 * azimuth it produces is bounded by the arc's own radius: a bounded drag is what
 * keeps the camera inside the leg instead of turning past the pose the record
 * claims to be about.
 */

import type { Page } from "@playwright/test";

import type {} from "../../src/harness/bridge.js";
import { OrbitDriver, type CameraSnapshot } from "../visual/orbit.js";

/**
 * The patterns this lane can walk, and what each one is for.
 *
 * `orbit` is the required one: at the frozen hero pose - street level on the
 * crossing, azimuth 45 degrees - it turns the camera slowly, which is the
 * movement a person makes while looking at a facade and the movement the
 * criterion is about. `ascent` adds wheel ticks on top of the same orbit so the
 * camera also changes distance, which is the second pose the criterion's "or an
 * ascent" names and the one that changes the picture's scale rather than only
 * its framing.
 */
export const MOTION_PATTERNS = ["orbit", "ascent"] as const;
export type MotionPattern = (typeof MOTION_PATTERNS)[number];

export function isMotionPattern(value: string): value is MotionPattern {
  return (MOTION_PATTERNS as readonly string[]).includes(value);
}

/**
 * How far each gesture moves the pointer, in CSS pixels, and how many moves it
 * is split into.
 *
 * 4 px of drag is about 0.035 rad of azimuth on this canvas, which at the hero
 * pose moves the picture by a few pixels - a slow crawl rather than a sweep.
 * The gesture is split into four moves so the incremental path `OrbitControls`
 * takes per `pointermove` is the path being exercised, not one jump.
 */
const GESTURE_PX = 4;
const MOVES_PER_GESTURE = 4;

/** The circle the pointer walks on, as a fraction of the canvas box. */
const PATH_RADIUS_FRACTION = 0.05;

export interface MotionConfig {
  pattern: MotionPattern;
  /** Seconds of motion the run is asked for; the capture loop stops when it expires. */
  seconds: number;
  /** Wheel ticks a second, for the patterns that change distance. */
  wheelTicksPerSecond: number;
}

export interface MotionSample {
  /** `performance.now()` in the page, beside the frame counter it was read with. */
  atMs: number;
  frameCount: number;
  camera: CameraSnapshot;
}

interface Recorder {
  running: boolean;
  samples: MotionSample[];
}

declare global {
  interface Window {
    __flickerMotion?: Recorder;
  }
}

export class MotionPath {
  private readonly driver: OrbitDriver;
  private readonly page: Page;
  private readonly config: MotionConfig;
  private angle = 0;
  private wheelAccumulator = 0;

  constructor(page: Page, config: MotionConfig) {
    this.page = page;
    this.driver = new OrbitDriver(page);
    this.config = config;
  }

  /** The driver this path borrows, so a caller can wait for tiles or read a pose. */
  get orbit(): OrbitDriver {
    return this.driver;
  }

  /**
   * Start sampling the frame counter and the pose from inside the page.
   *
   * The samples are what lets a frame's capture be placed in the path rather
   * than merely between two of this lane's own calls: a screenshot costs about
   * 250 ms here and the loop draws through all of it, so a reading taken before
   * the call has missed fifteen frames. Nothing is written to the app - the
   * loop only reads `window.__mapsHarness`.
   */
  async startSampling(): Promise<void> {
    await this.page.evaluate(() => {
      const state: Recorder = { running: true, samples: [] };
      window.__flickerMotion = state;
      const tick = (): void => {
        const harness = window.__mapsHarness;
        if (state.running && harness !== undefined) {
          const status = harness.status();
          state.samples.push({
            atMs: performance.now(),
            frameCount: status.frameCount,
            camera: harness.camera(),
          });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Stop sampling and take the samples. */
  async collectSamples(): Promise<MotionSample[]> {
    return this.page.evaluate(() => {
      const state = window.__flickerMotion;
      if (state === undefined) return [];
      state.running = false;
      return state.samples;
    });
  }

  /**
   * One step of the path, and the pose it left the camera in.
   *
   * One gesture per call rather than an internal loop, so the capture loop can
   * interleave screenshots with the motion. The caller decides how often; this
   * decides only where the pointer goes next.
   */
  async step(): Promise<CameraSnapshot> {
    const box = await this.page.locator("#scene").boundingBox();
    if (box === null || box.width === 0 || box.height === 0) {
      throw new Error(
        "The canvas has no layout box, so there is nothing to send pointer events to and the camera " +
          "cannot be moved. Either #scene is missing or CSS collapsed it to zero.",
      );
    }

    const centreX = box.x + box.width / 2;
    const centreY = box.y + box.height / 2;
    // One full turn of the path would be a large rotation, so the radius is
    // small and the angle advances by the gesture's own arc. `angle` is the
    // path parameter and is not an azimuth: what the camera does with it is
    // measured from the bridge, never computed here.
    const radius = Math.min(box.width, box.height) * PATH_RADIUS_FRACTION;
    this.angle += (GESTURE_PX / radius) * 1;
    const from = { x: centreX + Math.cos(this.angle) * radius, y: centreY + Math.sin(this.angle) * radius };
    this.angle += GESTURE_PX / radius;
    const to = { x: centreX + Math.cos(this.angle) * radius, y: centreY + Math.sin(this.angle) * radius };

    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(to.x, to.y, { steps: MOVES_PER_GESTURE });
    await this.page.mouse.up();

    if (this.config.pattern === "ascent") {
      // Wheel ticks interleaved with the drags, so the camera is changing
      // distance at the same time as it turns. The tick is applied every few
      // steps rather than every one: a tick is a 5% change of radius, which
      // over a second is a dolly rather than a crawl.
      this.wheelAccumulator += 1;
      if (this.wheelAccumulator >= 4) {
        this.wheelAccumulator = 0;
        await this.page.mouse.wheel(0, -60);
      }
    }

    return this.driver.readCamera();
  }

  /** Read the frame counter and the pose in one browser task, as every other lane does. */
  async observe(): Promise<MotionSample> {
    const observation = await this.driver.readCameraObservation();
    return {
      atMs: Date.now(),
      frameCount: observation.status.frameCount,
      camera: observation.camera,
    };
  }
}

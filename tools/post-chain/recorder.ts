/**
 * A per-frame record of what the frozen bridge was reporting, sampled in the page.
 *
 * `window.__mapsHarness` is read once per `requestAnimationFrame` and nothing is
 * written, so the page keeps driving itself through its real input path while
 * the record is taken. Two fields are the point: `taaAccumulating`, which is the
 * app's own verdict on whether the picture held still on the last drawn frame,
 * and the camera pose beside it, which is what that verdict is supposed to be
 * about.
 *
 * Sampling inside the page rather than polling from the test matters here. A
 * `page.screenshot()` costs about 250 ms on this renderer and the loop draws
 * through all of it, so a reading taken after the call has missed fifteen frames
 * — and the frames a question about a transition is asked of are exactly the
 * ones a between-call poll cannot see.
 */

import type { Page } from "@playwright/test";

import type {} from "../../src/harness/bridge.js";

export interface FrameRow {
  /** Frames drawn since boot, at the moment of the sample. */
  f: number;
  /** `performance.now()` in the page. */
  t: number;
  /** `post.taaAccumulating` — the app's verdict on the last drawn frame. */
  acc: boolean;
  /** `post.taaSamples` — `TAARenderPass.accumulateIndex`. */
  n: number;
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  az: number;
  polar: number;
  d: number;
}

declare global {
  interface Window {
    __postChainRecorder?: { rows: FrameRow[]; running: boolean };
  }
}

/** Start sampling once per rendered frame. */
export async function startRecorder(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state: { rows: FrameRow[]; running: boolean } = { rows: [], running: false };
    window.__postChainRecorder = state;
    const tick = (): void => {
      const harness = window.__mapsHarness;
      if (state.running && harness !== undefined && harness !== null) {
        const post = harness.post();
        const status = harness.status();
        const camera = harness.camera();
        state.rows.push({
          f: status.frameCount,
          t: performance.now(),
          acc: post.taaAccumulating,
          n: post.taaSamples,
          px: camera.position.x,
          py: camera.position.y,
          pz: camera.position.z,
          tx: camera.target.x,
          ty: camera.target.y,
          tz: camera.target.z,
          az: camera.azimuth,
          polar: camera.polar,
          d: camera.distance,
        });
      }
      requestAnimationFrame(tick);
    };
    state.running = true;
    requestAnimationFrame(tick);
  });
}

/** Stop sampling and take the record. */
export async function collectRecorder(page: Page): Promise<FrameRow[]> {
  return page.evaluate(() => {
    const state = window.__postChainRecorder;
    if (state === undefined) return [];
    state.running = false;
    return state.rows;
  });
}

/** Metres the camera moved between two samples, and the pose change in radians. */
export function movementBetween(previous: FrameRow, row: FrameRow) {
  const positionM = Math.hypot(row.px - previous.px, row.py - previous.py, row.pz - previous.pz);
  const targetM = Math.hypot(row.tx - previous.tx, row.ty - previous.ty, row.tz - previous.tz);
  let azimuth = Math.abs(row.az - previous.az);
  if (azimuth > Math.PI) azimuth = Math.abs(azimuth - 2 * Math.PI);
  return { positionM, targetM, azimuth, polar: Math.abs(row.polar - previous.polar) };
}

/**
 * Keep the last sample of each frame.
 *
 * The recorder samples once per `requestAnimationFrame`, and a frame counter
 * that repeats means the loop had not drawn a new frame since the last sample.
 * Two samples of one frame are one observation, not two.
 */
export function onePerFrame(rows: readonly FrameRow[]): FrameRow[] {
  const kept: FrameRow[] = [];
  for (const row of rows) {
    if (kept.length > 0 && kept[kept.length - 1]!.f === row.f) kept[kept.length - 1] = row;
    else kept.push(row);
  }
  return kept;
}

/**
 * Frames where the accumulator was running although the camera had just moved.
 *
 * This is the anti-smear property stated as a measurement rather than as a
 * reading of the code: a temporal accumulator that is averaging samples from two
 * camera poses is a smear, and this names every frame where that happened. The
 * bar is a thousandth of a pixel at the pivot — far below anything the
 * accumulator could be blamed for, and far above the round-trip noise an
 * `OrbitControls.update()` leaves behind on an identical pose.
 */
export function accumulatingWhileMoving(
  rows: readonly FrameRow[],
  pixelAtPivotM: number,
): { frame: number; samples: number; positionM: number; azimuth: number }[] {
  const movementBar = Math.max(pixelAtPivotM * 0.001, 1e-9);
  const offenders: { frame: number; samples: number; positionM: number; azimuth: number }[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (!row.acc || row.n <= 1) continue;
    const movement = movementBetween(rows[index - 1]!, row);
    if (movement.positionM > movementBar || movement.azimuth > movementBar / Math.max(row.d, 1)) {
      offenders.push({ frame: row.f, samples: row.n, positionM: movement.positionM, azimuth: movement.azimuth });
    }
  }
  return offenders;
}

/**
 * harness: npm run visual:flicker.
 * Copy the WebGL canvas in RAF after the app's own RAF callback. No application
 * state is written. Copy and observations share one task; encode after the burst.
 */
import type { Page } from "@playwright/test";
import type {} from "../../src/harness/bridge.js";
import type { PostStatus } from "../../src/render/post.js";
import type { FramePose } from "./judge.js";
import type { FrameStats } from "../visual/png.js";

export interface CopyObservation {
  frameCount: number;
  pageMs: number;
  camera: FramePose;
  post: PostStatus;
}
export interface BurstFrame {
  before: CopyObservation;
  after: CopyObservation;
  copyMs: number;
  pngBase64: string;
}
export interface BurstResult {
  width: number;
  height: number;
  preserveDrawingBuffer: boolean | null;
  encodeMs: number;
  frames: BurstFrame[];
}

export async function captureAdjacentFrames(page: Page, count: number): Promise<BurstResult> {
  if (!Number.isInteger(count) || count < 2 || count > 32) {
    throw new Error(`Flicker burst requested ${count} frames; use an integer from 2 through 32 to bound canvas memory.`);
  }
  return page.evaluate(async (requested) => {
    const source = document.querySelector<HTMLCanvasElement>("#scene");
    if (source === null || source.width === 0 || source.height === 0) {
      throw new Error("Flicker copy has no non-empty #scene canvas; wait for the app's first frame.");
    }
    const gl = source.getContext("webgl2");
    const preserveDrawingBuffer = gl?.getContextAttributes()?.preserveDrawingBuffer ?? null;
    const read = (): CopyObservation => {
      const harness = window.__mapsHarness;
      if (harness === undefined) throw new Error("Flicker copy lost the read-only app bridge; the page was replaced.");
      const status = harness.status();
      if (!status.ready || status.contextLost || status.error !== null) {
        throw new Error(`Flicker copy cannot observe a live renderer: ${JSON.stringify(status)}.`);
      }
      return { frameCount: status.frameCount, pageMs: performance.now(), camera: harness.camera(), post: harness.post() };
    };
    const copies = Array.from({ length: requested }, () => {
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (context === null) throw new Error("Flicker copy could not allocate a 2D snapshot canvas.");
      return { canvas, context };
    });
    const observations: Omit<BurstFrame, "pngBase64">[] = [];
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        const step = (): void => {
          try {
            const copy = copies[observations.length]!;
            const before = read();
            const started = performance.now();
            copy.context.drawImage(source, 0, 0);
            const copyMs = performance.now() - started;
            const after = read();
            observations.push({ before, after, copyMs });
            if (observations.length === requested) resolve();
            else raf = requestAnimationFrame(step);
          } catch (error) { reject(error); }
        };
        timeout = setTimeout(() => reject(new Error(`Flicker burst captured ${observations.length}/${requested} frames in 8 seconds; renderer stopped or the page is too slow.`)), 8_000);
        raf = requestAnimationFrame(step);
      });
      const encodeStart = performance.now();
      const frames = observations.map((observation, index) => ({ ...observation,
        pngBase64: copies[index]!.canvas.toDataURL("image/png").split(",")[1]!,
      }));
      return { width: source.width, height: source.height, preserveDrawingBuffer,
        encodeMs: performance.now() - encodeStart, frames };
    } finally {
      cancelAnimationFrame(raf);
      if (timeout !== undefined) clearTimeout(timeout);
      for (const copy of copies) { copy.canvas.width = 0; copy.canvas.height = 0; }
    }
  }, count);
}

/** Exact observation binding. Pixels are checked independently after decoding. */
export function copyObservationRefusals(frame: Pick<BurstFrame, "before" | "after">): string[] {
  const { before, after } = frame;
  const failures: string[] = [];
  if (!Number.isInteger(before.frameCount) || before.frameCount < 1 || before.frameCount !== after.frameCount) {
    failures.push(`canvas copy is not bound to one rendered frame (${before.frameCount} -> ${after.frameCount}); capture synchronously inside the app's RAF interval`);
  }
  if (JSON.stringify(before.camera) !== JSON.stringify(after.camera) || JSON.stringify(before.post) !== JSON.stringify(after.post)) {
    failures.push("camera or post state changed during the canvas copy; the observation does not identify its pixels");
  }
  if (before.post.taaAccumulating || after.post.taaAccumulating) {
    failures.push("TAA accumulated during the moving-frame copy; drive the camera through the controls before the burst");
  }
  for (const observation of [before, after]) {
    const pose = observation.camera;
    if (![pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z,
      pose.azimuth, pose.polar, pose.distance, observation.pageMs].every(Number.isFinite)) {
      failures.push("canvas copy has a non-finite pose or clock; inspect the app observation before judging the sequence");
    }
    if (!observation.post.active || observation.post.error !== null) {
      failures.push(`the moving post chain is inactive (${observation.post.error}); restore it before judging dusk motion`);
    }
  }
  return failures;
}

/** Decoded bytes, not a DOM/canvas claim, decide whether a copy is nonblank. */
export function copyPixelRefusals(stats: FrameStats, viewport: { width: number; height: number }): string[] {
  const failures: string[] = [];
  if (stats.width !== viewport.width || stats.height !== viewport.height) {
    failures.push(`copy is ${stats.width}x${stats.height}; require native ${viewport.width}x${viewport.height}`);
  }
  if (!Number.isFinite(stats.luminanceSpread) || stats.luminanceSpread < 1 || stats.distinctColours < 32) {
    failures.push(`canvas copy is blank or nearly flat: spread ${stats.luminanceSpread}, colours ${stats.distinctColours}; verify copy timing before judging pixels`);
  }
  return failures;
}

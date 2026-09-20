/** Real pointer and wheel input for npm run visual:flicker. No app setters. */
import type { Page } from "@playwright/test";
import { OrbitDriver, type CameraSnapshot } from "../visual/orbit.js";
export const MOTION_PATTERNS = ["orbit", "ascent"] as const;
export type MotionPattern = (typeof MOTION_PATTERNS)[number];
export function isMotionPattern(value: string): value is MotionPattern {
  return (MOTION_PATTERNS as readonly string[]).includes(value);
}
export interface InputEventReceipt {
  kind: "pointer" | "wheel";
  requestedAtMs: number;
  returnedAtMs: number;
  /** Last drawn app frame after Chromium acknowledged this input command. */
  acknowledgedAtFrame: number;
  delta: number;
}
export interface MotionReceipt {
  pattern: MotionPattern;
  pointerMoves: number;
  wheelEvents: number;
  wheelDeltaY: number;
  before: CameraSnapshot;
  after: CameraSnapshot;
  events: InputEventReceipt[];
}
/** Positive wheel input increases camera distance: this is an ascent. */
export function wheelDeltaForPattern(pattern: MotionPattern): number {
  return pattern === "ascent" ? 6 : 0;
}
export class MotionPath {
  readonly orbit: OrbitDriver;
  constructor(private readonly page: Page, private readonly pattern: MotionPattern) {
    this.orbit = new OrbitDriver(page);
  }
  /** Keep actual input active throughout capture, including its final frame. */
  async during<T>(capture: () => Promise<T>): Promise<{ value: T; input: MotionReceipt }> {
    const box = await this.page.locator("#scene").boundingBox();
    if (box === null || box.width === 0 || box.height === 0) {
      throw new Error("The #scene canvas has no layout box; wait for a non-empty canvas before moving the camera.");
    }
    const before = await this.orbit.readCamera();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const events: InputEventReceipt[] = [];
    const send = async (kind: InputEventReceipt["kind"], delta: number, action: () => Promise<void>): Promise<void> => {
      const requestedAtMs = Date.now();
      await action();
      const returnedAtMs = Date.now();
      const acknowledgedAtFrame = (await this.orbit.readStatus()).frameCount;
      events.push({ kind, delta, requestedAtMs, returnedAtMs, acknowledgedAtFrame });
    };
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    let done = false;
    let value: T | undefined;
    let captureError: unknown;
    let captureFailed = false;
    let pending: Promise<void> | undefined;
    let input: MotionReceipt | undefined;
    const errors: unknown[] = [];
    const wheelDeltaY = wheelDeltaForPattern(this.pattern);
    try {
      await send("pointer", 0.5, () => this.page.mouse.move(x + 0.5, y));
      // Start the RAF observer without awaiting it: Chromium input commands
      // continue while its promise waits on rendered frames. Do not synthesise
      // DOM events inside evaluate; the real controls receive page.mouse input.
      pending = capture().then((result) => { value = result; done = true; }, (error: unknown) => {
        captureError = error; captureFailed = true; done = true;
      });
      for (let step = 1; !done && step <= 64; step += 1) {
        await send("pointer", 0.25, () => this.page.mouse.move(x + 0.5 + step * 0.25, y));
        if (!done && wheelDeltaY !== 0 && step % 2 === 1) {
          // OrbitControls ignores wheels while its pointer state is ROTATE.
          // Exercise the ordinary release/wheel/press sequence a user needs.
          await this.page.mouse.up();
          await send("wheel", wheelDeltaY, () => this.page.mouse.wheel(0, wheelDeltaY));
          await this.page.mouse.down();
        }
      }
      if (!done) throw new Error("Flicker capture outlasted 64 real pointer moves; inspect RAF/input synchronization before increasing the bounded path.");
      await pending;
      if (!captureFailed) {
        input = { pattern: this.pattern,
          pointerMoves: events.filter((event) => event.kind === "pointer").length,
          wheelEvents: events.filter((event) => event.kind === "wheel").length,
          wheelDeltaY, before, after: await this.orbit.readCamera(), events };
      }
    } catch (error) {
      errors.push(error);
    } finally {
      try {
        await this.page.mouse.up();
      } catch (error) {
        errors.push(error);
      } finally {
        // The burst has its own eight-second deadline and RAF/canvas cleanup;
        // Playwright's outer test deadline still bounds an unresponsive page.
        // Release failure cannot bypass settlement or erase observer failure.
        await pending;
        if (captureFailed) errors.push(captureError);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, `Flicker motion/capture cleanup failed: ${errors.map(String).join("; ")}`, { cause: errors[0] });
    }
    return { value: value as T, input: input! };
  }
}

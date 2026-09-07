/**
 * The render loop, and the seam every per-frame system hooks into.
 *
 * Two kinds of callback, because they answer to different clocks:
 *
 * - A **fixed step** runs at a constant `stepSeconds` regardless of frame rate.
 *   Simulation goes here. Car following and pedestrian avoidance are both
 *   integrators, and an integrator fed a variable timestep gives a different
 *   answer on a fast machine than on a slow one. Phases 7 and 8 register here.
 * - A **frame step** runs once per rendered frame with the real elapsed time.
 *   Interpolating a simulated pose to the fraction of a step the frame landed
 *   on, damping the controls, animating a material — anything that should look
 *   smooth rather than be reproducible.
 *
 * The loop calls the fixed steps, then the frame steps, then renders. It never
 * renders from anywhere else, so `frameCount` is a true count of frames drawn.
 */

/** Called at a constant rate. `step` is always exactly `stepSeconds`. */
export type FixedStep = (step: number, simulatedSeconds: number) => void;

/** Called once per rendered frame. */
export type FrameStep = (delta: number, elapsed: number, alpha: number) => void;

export interface LoopOptions {
  /** Seconds per simulation step. Defaults to 1/60. */
  stepSeconds?: number;
  /**
   * Most simulation steps allowed in one frame. Without a cap, a tab that was
   * backgrounded for a minute comes back and tries to catch up sixty seconds of
   * simulation in one frame, which freezes the page instead of dropping time.
   */
  maxStepsPerFrame?: number;
  render: () => void;
}

export class RenderLoop {
  readonly stepSeconds: number;
  private readonly maxStepsPerFrame: number;
  private readonly render: () => void;
  private readonly fixedSteps: FixedStep[] = [];
  private readonly frameSteps: FrameStep[] = [];

  private handle: number | null = null;
  private lastTimestamp = 0;
  private accumulator = 0;

  /** Simulated seconds, advanced only in whole steps. */
  simulatedSeconds = 0;
  /** Wall-clock seconds since the loop started. */
  elapsedSeconds = 0;
  /** Frames actually drawn. The visual harness waits on this. */
  frameCount = 0;

  constructor(options: LoopOptions) {
    this.stepSeconds = options.stepSeconds ?? 1 / 60;
    this.maxStepsPerFrame = options.maxStepsPerFrame ?? 5;
    this.render = options.render;
  }

  /**
   * Register a simulation system. Phases 7 and 8 call this — vehicles and
   * pedestrians are two registrations against one clock, which is what Phase 6's
   * signal phase model needs in order to drive both.
   */
  onFixedStep(step: FixedStep): () => void {
    this.fixedSteps.push(step);
    return () => {
      const at = this.fixedSteps.indexOf(step);
      if (at >= 0) this.fixedSteps.splice(at, 1);
    };
  }

  /** Register a per-frame system. */
  onFrame(step: FrameStep): () => void {
    this.frameSteps.push(step);
    return () => {
      const at = this.frameSteps.indexOf(step);
      if (at >= 0) this.frameSteps.splice(at, 1);
    };
  }

  start(): void {
    if (this.handle !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (timestamp: number): void => {
      this.handle = requestAnimationFrame(tick);
      this.advance(timestamp);
    };
    this.handle = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.handle === null) return;
    cancelAnimationFrame(this.handle);
    this.handle = null;
  }

  /** One iteration. Exposed so a test can drive the loop without a browser. */
  advance(timestamp: number): void {
    // A quarter second cap on the raw delta: past that the frame was a stall,
    // not slow motion, and the honest thing is to drop the missing time.
    const delta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.25);
    this.lastTimestamp = timestamp;
    this.elapsedSeconds += delta;

    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= this.stepSeconds && steps < this.maxStepsPerFrame) {
      this.simulatedSeconds += this.stepSeconds;
      for (const step of this.fixedSteps) step(this.stepSeconds, this.simulatedSeconds);
      this.accumulator -= this.stepSeconds;
      steps += 1;
    }
    if (steps === this.maxStepsPerFrame) {
      // Catching up is off the table; throw the backlog away rather than carry
      // a debt that can never be paid down.
      this.accumulator = 0;
    }

    const alpha = this.accumulator / this.stepSeconds;
    for (const step of this.frameSteps) step(delta, this.elapsedSeconds, alpha);

    this.render();
    this.frameCount += 1;
  }
}

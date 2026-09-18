/**
 * The simulation step a captured frame was drawn at, derived from the page's own
 * clock.
 *
 * This is a module of its own rather than a helper inside `capture.spec.ts`
 * because the derivation is arithmetic that a unit case can drive and the
 * specification is a browser lane that a unit case cannot. The first version of
 * this function lived in the spec, so the only thing that could have caught its
 * bug was a run: every frame in both of the first run's records carries
 * `tick ≈ -1.07e11` and nothing read the field, so the record presented a number
 * that was not a measurement and no check was in a position to say so.
 * `test/flicker-step.test.ts` is that check.
 *
 * ## What the clock actually is, and the bug this file exists for
 *
 * `performance.timeOrigin` is **epoch** milliseconds - a value of about
 * 1.789e12 on this machine - while `performance.now()` is milliseconds since the
 * page navigate. Subtracting the first from the second is not an elapsed time: it
 * is the whole of the Unix epoch, about minus fifty-six years. Multiplied by 60
 * that reads about `-1.07e11` steps, which is what the first run recorded.
 *
 * The fix is to read the same clock twice: `performance.now()` once before the
 * first still, and again per frame. The difference is the page's own elapsed time.
 *
 * ## The derivation, and its two bounds
 *
 * `RenderLoop` advances its fixed step by `stepSeconds` (1/60 s) once per
 * rendered frame of wall time, so the step index at a moment is
 * `elapsed seconds * 60`, clamped to the frame counter because the loop can never
 * have run more simulation steps than it has drawn frames.
 *
 * **Bound one: it is a claim about the clock, not a reading of the loop.** It
 * cannot see a run whose fixed-step clock stopped while frames kept being drawn.
 * That is why the judge's stalled-render-counter predicate, not this field, is
 * what carries a sequence's aliveness.
 *
 * **Bound two: it is only as good as its origin.** The origin has to be read from
 * the same document as the `pageMs` it is subtracted from. A capture that cannot
 * read one records `null` rather than 0, so an absent step is never read as a step
 * of zero.
 */

/** The ratio the derivation rests on: one fixed step per 1/60 s of wall time. */
export const STEPS_PER_SECOND = 60;

/**
 * The simulation step index a captured frame was drawn at, or null when the
 * capture could not name the page clock at all.
 *
 * @param pageMs `performance.now()` in the page, read beside the frame counter.
 * @param startPageMs `performance.now()` read once when the capture began.
 * @param frameCount Frames the render loop has drawn, read beside `pageMs`.
 */
export function deriveStep(pageMs: number, startPageMs: number | null, frameCount: number): number | null {
  if (startPageMs === null) return null;
  const elapsedSeconds = (pageMs - startPageMs) / 1_000;
  return Math.min(frameCount, Math.floor(elapsedSeconds * STEPS_PER_SECOND));
}

/**
 * How much of a frame shows structure rather than one flat surface.
 *
 * A wall, a roof and the sky are all one colour across most of the frame, and a
 * leg aimed into a building produces frames of exactly that. The measure is the
 * fraction of a 16x9 grid of cells whose luminance shows structure — not a
 * fraction of the frame's pixels. A cell counts when its luminance standard
 * deviation is above 12 absolute units (the 0-255 Rec.709 scale) or, on a dark
 * frame, above 30% of the cell's own mean: dusk tone mapping compresses
 * absolute contrast, so a purely absolute threshold reads a textured dusk
 * facade as a blank wall — the lane's approach-005 false positive, measured at
 * 4.2% of cells over the absolute leg against 24.3% over a relative one
 * (`artifacts/flythrough2/adjudication-report.md`). The relative leg is guarded
 * by a mean above 2 so a near-black cell cannot qualify on noise, and a
 * genuinely flat dark wall keeps a ratio near zero and still fails.
 *
 * The statistic is the same one `tools/populated/capture.ts` uses to tell a
 * drained scene from a full one, at a finer grid because a 3 m camera sees
 * less. It lives in its own module so `test/flythrough-frames.test.ts` can
 * drive it over synthetic frames — a check that lives inside a 20-minute
 * browser spec cannot be made to go red cheaply.
 */

import type { DecodedPng } from "../visual/png.js";

export function structuredFraction(png: DecodedPng): number {
  const cellsX = 16;
  const cellsY = 9;
  const cellW = Math.floor(png.width / cellsX);
  const cellH = Math.floor(png.height / cellsY);
  let structured = 0;
  for (let cy = 0; cy < cellsY; cy += 1) {
    for (let cx = 0; cx < cellsX; cx += 1) {
      let sum = 0;
      let sumSquares = 0;
      let count = 0;
      for (let y = cy * cellH; y < (cy + 1) * cellH; y += 2) {
        for (let x = cx * cellW; x < (cx + 1) * cellW; x += 2) {
          const at = (y * png.width + x) * 4;
          const luminance = 0.2126 * png.rgba[at]! + 0.7152 * png.rgba[at + 1]! + 0.0722 * png.rgba[at + 2]!;
          sum += luminance;
          sumSquares += luminance * luminance;
          count += 1;
        }
      }
      const mean = sum / count;
      const deviation = Math.sqrt(Math.max(0, sumSquares / count - mean * mean));
      if (deviation > 12 || (mean > 2 && deviation / mean > 0.3)) structured += 1;
    }
  }
  return structured / (cellsX * cellsY);
}

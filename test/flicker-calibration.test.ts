/**
 * harness: npm run visual:flicker / judgeFlicker.
 * Finite model calibration: one immutable seeded field, 192x108, eight frames.
 * Fractional translation, rotation and two depth layers are legitimate image
 * motion with no texture change. Their residuals bound what this integer rigid
 * translation indicator can diagnose; these tests do not certify the scene.
 */
import { describe, expect, it } from "vitest";
import { CRAWL_FRACTION_PER_FRAME, judgeFlicker } from "../tools/flicker/judge.js";
import { frameAt } from "./flicker-frames.js";
import { sampleField } from "./flicker-synthetic.js";

const width = 192, height = 108, fieldWidth = 320, fieldHeight = 220;
const field = sampleField(fieldWidth, fieldHeight, 9137);
function bilinear(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const at = (dx: number, dy: number): number => field[(iy + dy) * fieldWidth + ix + dx]!;
  return at(0, 0) * (1 - fx) * (1 - fy) + at(1, 0) * fx * (1 - fy) +
    at(0, 1) * (1 - fx) * fy + at(1, 1) * fx * fy;
}
function record(map: (x: number, y: number, frame: number) => [number, number]) {
  return Array.from({ length: 8 }, (_, index) => {
    const rgba = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const [sx, sy] = map(x, y, index);
      const value = Math.round(bilinear(sx + 40, sy + 40));
      const at = (y * width + x) * 4;
      rgba[at] = value; rgba[at + 1] = value; rgba[at + 2] = value; rgba[at + 3] = 255;
    }
    return frameAt(index, { image: { width, height, rgba } });
  });
}
describe("the integer-translation estimator's calibration bound", () => {
  const transforms = {
    integer: (x: number, y: number, index: number): [number, number] => [x + index * 3, y + index],
    fractional: (x: number, y: number, index: number): [number, number] => [x + index * 0.25, y + index * 0.17],
    rotation: (x: number, y: number, index: number): [number, number] => {
      const angle = index * 0.002, cx = x - width / 2, cy = y - height / 2;
      return [width / 2 + cx * Math.cos(angle) - cy * Math.sin(angle), height / 2 + cx * Math.sin(angle) + cy * Math.cos(angle)];
    },
    depthLayers: (x: number, y: number, index: number): [number, number] => [x + index * (y < height / 2 ? 0.25 : 0.75), y],
  };
  for (const [name, transform] of Object.entries(transforms)) {
    it(`measures unchanged-texture ${name} motion without claiming scene diagnosis`, () => {
      const report = judgeFlicker(record(transform));
      const values = report.pairs_.map((pair) => pair.unexplainedFraction);
      console.log(`model-calibration ${name}: ${JSON.stringify({ values, failures: report.failures.length,
        compared: report.pairs_[0]!.comparedFeaturePixels, excluded: report.pairs_[0]!.excludedFeaturePixels })}`);
      expect(values).toHaveLength(7);
      expect(values.every(Number.isFinite)).toBe(true);
      expect(report.pairs_.every((pair) => pair.comparedFeaturePixels + pair.excludedFeaturePixels === width * height)).toBe(true);
      if (name === "integer") {
        expect(report.failures).toEqual([]);
        expect(Math.max(...values)).toBe(0);
        expect(report.pairs_[0]!.comparedFeaturePixels).toBe((width - 3 - 2) * (height - 1 - 2));
      } else {
        // This guards the scope of the present instrument: valid resampling can
        // exceed its provisional bar. It must not be called proof of a shader,
        // TAA or scene defect without a motion model that explains these cases.
        expect(Math.max(...values)).toBeGreaterThan(CRAWL_FRACTION_PER_FRAME);
        expect(report.failures.some((failure) => failure.includes("upper bound on crawl"))).toBe(true);
      }
    });
  }
});

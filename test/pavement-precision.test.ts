/** Bound: source-derived Float32 boundary uncertainty remains separate from
 * coverage. A missing interior or lowered interior stays a failure.
 */
import { expect, it } from "vitest";
import { sourceBoundaryPrecision } from "../tools/scene/pavement-precision.js";

it("recognizes a rounding-scale edge and refuses to excuse a material interior gap", () => {
  const triangle = [[10.0000002, 15, 0], [11.0000002, 15, 0], [10.0000002, 15, 1]];
  const edge = sourceBoundaryPrecision(triangle, 10.0000003, 0.2);
  expect(edge.maximumVertexDisplacementM).toBeCloseTo(0.0000002, 12);
  expect(edge.distanceToBoundaryM).toBeCloseTo(0.0000001, 12);
  expect(edge.withinEncodingBoundary).toBe(true);
  expect(sourceBoundaryPrecision(triangle, 10.25, 0.25).withinEncodingBoundary).toBe(false);
  expect(() => sourceBoundaryPrecision([[NaN, 0, 0], [1, 0, 0], [0, 0, 1]], 0, 0)).toThrow(/finite XYZ/);
});

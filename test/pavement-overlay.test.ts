/** Bound: assigned planar support patches, exact area partition, connected
 * edges, partial shared edges and vertically separate layers. Actual source
 * classification, the frozen camera rays and rendered pixels are separate gates.
 */
import { expect, it } from "vitest";
import { exposedRisers, overlayPatches, patchArea, planeHeight, type PavementPatch, type PlanPoint } from "../tools/scene/pavement-overlay.js";

const patch = (ring: PlanPoint[], y: number, source = "ground", layer = "ground"): PavementPatch => ({ source, layer, ring, plane: [0, 0, y], base: [0, 0, y - 0.1] });

it("retains every footprint through an interior support ridge without raising unrelated regions", () => {
  const original = patch([[0, 0], [4, 0], [4, 4], [0, 4]], 1);
  const result = overlayPatches([original], [[1, 1], [3, 1], [3, 3], [1, 3]], [0.5, 0, 0]);
  expect(result.reduce((sum, piece) => sum + patchArea(piece.ring), 0)).toBeCloseTo(16, 10);
  expect(result.some((piece) => piece.ring.some((point) => planeHeight(piece.plane, point) > 1.4))).toBe(true);
  expect(result.every((piece) => piece.ring.every((point) => planeHeight(piece.plane, point) >= 1))).toBe(true);
  expect(result.filter((piece) => piece.plane[0] === 0.5).reduce((sum, piece) => sum + patchArea(piece.ring), 0)).toBeCloseTo(2, 10);
  const same = overlayPatches([original], original.ring, original.plane);
  expect(same).toHaveLength(1); expect(patchArea(same[0]!.ring)).toBe(16);
});

it("closes an oblique shared step once and nodes a long edge against shorter neighbors", () => {
  const patches = [
    patch([[0, 0], [4, 1], [4, 3], [0, 2]], 1.3, "high"),
    patch([[0, 2], [2, 2.5], [2, 4.5], [0, 4]], 1, "low-a"),
    patch([[2, 2.5], [4, 3], [4, 5], [2, 4.5]], 1, "low-b"),
  ];
  const shared = exposedRisers(patches).filter((riser) => riser.source === "high" && Math.abs(riser.a[2] - (2 + riser.a[0] / 4)) < 1e-8 && Math.abs(riser.b[2] - (2 + riser.b[0] / 4)) < 1e-8);
  expect(shared).toHaveLength(2);
  expect(shared.every((riser) => riser.lowerA === 1 && riser.lowerB === 1 && riser.a[1] === 1.3 && riser.b[1] === 1.3)).toBe(true);
  expect(shared.reduce((sum, riser) => sum + Math.hypot(riser.b[0] - riser.a[0], riser.b[2] - riser.a[2]), 0)).toBeCloseTo(Math.sqrt(17), 10);
  const flat = patches.map((p) => ({ ...p, plane: [0, 0, 1] as const, base: [0, 0, 0.9] as const }));
  expect(exposedRisers(flat).filter((riser) => Math.abs(riser.a[2] - (2 + riser.a[0] / 4)) < 1e-8 && Math.abs(riser.b[2] - (2 + riser.b[0] / 4)) < 1e-8)).toHaveLength(0);
});

it("keeps stacked same-plan levels separate and closes each only to its own base", () => {
  const ring: PlanPoint[] = [[0, 0], [3, 0], [3, 2], [0, 2]];
  const lower = patch(ring, 14.8, "sidewalk", "lower-passage"), upper = patch(ring, 31.165, "deck", "upper-deck");
  const result = exposedRisers([lower, upper]);
  expect(result).toHaveLength(8);
  for (const riser of result) {
    expect(riser.a[1] - riser.lowerA).toBeCloseTo(0.1, 10);
    expect(riser.b[1] - riser.lowerB).toBeCloseTo(0.1, 10);
  }
  expect(new Set(result.map((riser) => riser.layer))).toEqual(new Set(["lower-passage", "upper-deck"]));
});

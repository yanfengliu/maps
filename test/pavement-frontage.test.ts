/** Bound: one authored contour replaces inherited top slivers, keeps outside
 * support and unrelated ordinals, and refuses an unreviewed production input.
 * These fixtures do not certify native appearance or citywide support. */
import { expect, it } from "vitest";
import { surfaceSampler } from "../src/world/surface-sampler.js";
import { PavementMeshWriter, meshTriangle } from "../tools/scene/pavement-geometry.js";
import { buildFrontageInfill, replaceFrontageFaces } from "../tools/scene/pavement-frontage.js";
import type { Point } from "../tools/scene/select-pavement-source.js";
const header = { version: 1 as const, name: "frontage-fixture", vertexCount: 0, triangleCount: 0, bounds: { min: [0, 0, 0] as Point, max: [0, 0, 0] as Point } };
function fixture() {
  const w = new PavementMeshWriter();
  w.triangle([[.75, .7, 0], [2, .7, 1], [2, .7, 0]]);
  w.triangle([[.75, .7, 0], [.75, .7, 1], [2, .7, 1]]);
  w.triangle([[10, 3, 10], [10, 3, 11], [11, 3, 10]]);
  const original = w.finish(header), patch = new PavementMeshWriter();
  const contour: Point[] = [[0, 1, 0], [2, 1, 0], [1.5, 1, 1], [0, 1, 1]];
  patch.triangle([contour[0]!, contour[2]!, contour[1]!]); patch.triangle([contour[0]!, contour[3]!, contour[2]!]);
  return { original, authored: patch.finish(header), contour };
}
function topHits(mesh: ReturnType<typeof fixture>["original"], x: number, z: number): number[] {
  const hits: number[] = [];
  for (let i = 0; i < mesh.header.triangleCount; i++) {
    const triangle = meshTriangle(mesh, i * 3), w = new PavementMeshWriter(); w.triangle(triangle);
    const height = surfaceSampler(w.finish(header))(x, z); if (height !== undefined) hits.push(height);
  }
  return hits;
}
it("replaces a lower overlapping sliver with one noded top and keeps support outside its nonrectangular contour", () => {
  const { original, authored, contour } = fixture(), built = replaceFrontageFaces(original, contour, authored, [0, 1]);
  // Retained old geometry alone is the negative control: the wall-side gap has
  // no pavement and the overlap station still reads the lower inherited level.
  expect(surfaceSampler(original)(.21, .37)).toBeUndefined(); expect(topHits(original, 1.13, .37)).toEqual([expect.closeTo(.7, 6)]);
  expect(topHits(built.mesh, .21, .37)).toEqual([1]); expect(topHits(built.mesh, 1.13, .37)).toEqual([1]);
  expect(surfaceSampler(built.mesh)(1.92, .91)).toBeCloseTo(.7, 6);
  expect(meshTriangle(built.mesh, 6)).toEqual(meshTriangle(original, 6));
  expect([...built.mesh.indices.slice(6, 9)]).toEqual([...original.indices.slice(6, 9)]);
  expect([...built.mesh.positions.slice(0, original.positions.length)]).toEqual([...original.positions]);
  expect([...built.mesh.normals.slice(0, original.normals.length)]).toEqual([...original.normals]);
  expect(built.ledger.reduce((sum, r) => sum + r.removedAreaM2, 0)).toBeCloseTo(1, 10);
  expect(built.maximumEncodedHeightResidualM).toBeLessThan(1e-6);
});
it("refuses a stale affected-face record and an unreviewed production mesh", () => {
  const { original, authored, contour } = fixture();
  expect(() => replaceFrontageFaces(original, contour, authored, [2])).toThrow(/face 2 no longer intersects.*review/);
  expect(() => buildFrontageInfill(original, original)).toThrow(/pavement has SHA-256.*restore.*review/);
});

// Actual Float32 face265511 from C5 mesh3b24c5ef, clipped by the approved
// frontage contour. Its narrow retained fragments can reverse sign on rounding.
it.each([false, true])("preserves inherited encoded winding through Float32 subdivision (reversed=%s)", (reversed) => {
  const points: Point[] = [[-9.993000030517578,15.446000099182129,-28.291500091552734],[-10.012245178222656,15.445796966552734,-28.28864288330078],[-10.01224422454834,15.445796966552734,-28.28864288330078]];
  const contour: Point[] = [[-13.871151357154464,0,-28.50205515315521],[-13.779376199254505,0,-27.729499761881275],[-12.536043167114258,0,-27.914043426513672],[-12.536044120788574,0,-27.914043426513672],[-10.682999610900879,0,-28.189085006713867],[-8.182263374328613,0,-28.56026268005371],[-7.001600742340088,0,-28.735504150390625],[-5.683000087738037,0,-28.93121910095215],[-5.543000221252441,0,-28.95199966430664],[-5.542999744415283,0,-28.95199966430664],[-3.795076370239258,0,-29.17307472229004],[-3.1611547470092773,0,-29.253252029418945],[-0.6830000281333923,0,-29.566686630249023],[-0.2767351812876815,0,-29.618070420404155],[-0.3351796697853153,0,-30.11005110136698]];
  const originalWriter = new PavementMeshWriter(); originalWriter.triangle(reversed ? [...points].reverse() : points);
  const original = originalWriter.finish(header), authoredWriter = new PavementMeshWriter();
  authoredWriter.triangle([[-12, 16, -28.3], [-12, 16, -28.2], [-11.9, 16, -28.3]]);
  const result = replaceFrontageFaces(original, contour, authoredWriter.finish(header), [0]);
  const normalY = ([a, b, c]: Point[]): number => (b![2] - a![2]) * (c![0] - a![0]) - (b![0] - a![0]) * (c![2] - a![2]);
  const expected = Math.sign(normalY(meshTriangle(original, 0)));
  expect(expected).toBe(reversed ? -1 : 1); expect(result.outsideTriangles).toBeGreaterThan(0);
  for (let i = 0; i < result.outsideTriangles; i++) expect(Math.sign(normalY(meshTriangle(result.mesh, i * 3)))).toBe(expected);
});

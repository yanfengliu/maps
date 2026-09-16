/** A geometry-derived uncertainty bound for converting a source triangle to
 * Float32. It classifies boundary observations; it never turns them into a
 * strict coverage or clearance pass.
 */
export function sourceBoundaryPrecision(triangle: readonly (readonly number[])[], x: number, z: number): { maximumVertexDisplacementM: number; distanceToBoundaryM: number; withinEncodingBoundary: boolean } {
  if (triangle.length !== 3 || triangle.some((point) => point.length !== 3 || point.some((n) => !Number.isFinite(n))) || !Number.isFinite(x) || !Number.isFinite(z)) throw new Error("Pavement precision needs one finite XYZ source triangle and a finite X/Z probe point.");
  const maximumVertexDisplacementM = Math.max(...triangle.map((p) => Math.hypot(Math.fround(p[0]!) - p[0]!, Math.fround(p[2]!) - p[2]!)));
  let distanceToBoundaryM = Infinity;
  for (let i = 0; i < 3; i++) {
    const a = triangle[i]!, b = triangle[(i + 1) % 3]!, dx = b[0]! - a[0]!, dz = b[2]! - a[2]!, squared = dx * dx + dz * dz;
    const t = squared ? Math.max(0, Math.min(1, ((x - a[0]!) * dx + (z - a[2]!) * dz) / squared)) : 0;
    distanceToBoundaryM = Math.min(distanceToBoundaryM, Math.hypot(x - a[0]! - t * dx, z - a[2]! - t * dz));
  }
  return { maximumVertexDisplacementM, distanceToBoundaryM, withinEncodingBoundary: distanceToBoundaryM <= maximumVertexDisplacementM };
}

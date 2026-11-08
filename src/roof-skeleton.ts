import earcut from 'earcut';

type Point = [number, number];
type RoofVertex = [number, number, number];
type Triple = [number, number, number];
/** Source vertices come first; each remaining node intersects three source-edge roof planes. */
export interface RoofTopology { source: number; intersections: Triple[]; faces: number[][] }

const signedArea = (ring: Point[]) => ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - p[1] * q[0]; }, 0) / 2;
export const orientRoofRings = (rings: Point[][]): Point[][] => rings.map((ring, i) => (signedArea(ring) > 0) === (i === 0) ? ring : ring.slice().reverse());

// Projection uses implementation-approximated log/tan. Hash a guard-only 10 um
// grid so harmless engine roundoff cannot look like a changed source footprint.
// The generator checks an 8 nm margin around every pinned input; the exact source
// file SHA256 remains independently pinned. Geometry never uses this grid.
export const ROOF_SIGNATURE_GRID = 1e-5;
export const ROOF_SIGNATURE_ROUNDOFF = 8e-9;
export function roofSignatureMargin(rings: Point[][]): number {
  return Math.min(...rings.flat(2).map(value => (0.5 - Math.abs(value / ROOF_SIGNATURE_GRID - Math.round(value / ROOF_SIGNATURE_GRID))) * ROOF_SIGNATURE_GRID));
}

/** Guard topology at 10 um precision; the separate source SHA256 stays exact. */
export function roofSourceSignature(rings: Point[][]): string {
  let hash = 0xcbf29ce484222325n;
  const signatureCoordinates = rings.map(ring => ring.map(point => point.map(value => Math.round(value / ROOF_SIGNATURE_GRID))));
  for (const char of JSON.stringify(signatureCoordinates)) hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 0x100000001b3n);
  return hash.toString(16).padStart(16, '0');
}

const determinant = (a: number[], b: number[], c: number[]): number => a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);

/** Evaluate a reviewed straight-skeleton topology using the unchanged source edges.
 * Each face rises by one metre per metre inward from its own source edge. Shared
 * ridge nodes are evaluated once. Earcut only partitions an already planar face.
 * The offline tool's rounded times and approximate bisectors are never rendered.
 */
export function evaluateRoofSkeleton(rings: Point[][], topology: RoofTopology) {
  const source = rings.flat();
  if (source.length !== topology.source) throw new Error('Roof topology source vertex count changed.');
  const vertices: RoofVertex[] = source.map(([x, y]) => [x, y, 0]);
  const planes = topology.faces.map(face => {
    const a = source[face[0]], b = source[face[1]], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    return { a, normal: [-dy / length, dx / length, -1] };
  });
  for (const intersection of topology.intersections) {
    const selected = intersection.map(i => planes[i]), origin = selected[0].a;
    const rows = selected.map(plane => plane.normal), denominator = determinant(rows[0], rows[1], rows[2]);
    if (Math.abs(denominator) < 1e-14) throw new Error('Roof topology contains an unstable ridge intersection.');
    // Translating the solve avoids subtracting large absolute line constants.
    const columns = [0, 1, 2].map(axis => rows.map(row => row[axis]));
    let point: RoofVertex = [origin[0], origin[1], 0];
    // Near-collinear mapped edges produce ill-conditioned triples. Re-evaluate
    // the residual around the solved node so their small faces stay planar too.
    for (let iteration = 0; iteration < 3; iteration++) {
      const rhs = selected.map(({ a, normal }) => normal[0] * (a[0] - point[0]) + normal[1] * (a[1] - point[1]) + point[2]);
      point = [0, 1, 2].map(axis => {
        const replaced = columns.map((column, i) => i === axis ? rhs : column);
        return point[axis] + determinant(replaced[0], replaced[1], replaced[2]) / denominator;
      }) as RoofVertex;
    }
    if (point.some(value => !Number.isFinite(value)) || point[2] < 0) throw new Error('Roof topology contains an invalid ridge node.');
    vertices.push(point);
  }
  const triangles: Triple[] = [];
  for (const [faceIndex, face] of topology.faces.entries()) {
    const { a, normal } = planes[faceIndex];
    for (const index of face) {
      const point = vertices[index];
      if (Math.abs((point[0] - a[0]) * normal[0] + (point[1] - a[1]) * normal[1] - point[2]) > 1e-7) throw new Error('Roof face is not planar. Review its authored topology.');
    }
    const indices = earcut(face.flatMap(index => vertices[index].slice(0, 2)));
    for (let i = 0; i < indices.length; i += 3) triangles.push([face[indices[i]], face[indices[i + 1]], face[indices[i + 2]]]);
  }
  return { vertices, triangles, maximumTime: Math.max(...vertices.map(point => point[2])) };
}

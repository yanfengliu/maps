import { QUAD_ROOF_PROFILES } from './quad-roof-profile.ts';
import { evaluateRoofSkeleton, orientRoofRings, roofSourceSignature } from './roof-skeleton.ts';

type Point = [number, number];
// All three low Quad components use the same pitch and the existing 6.2/9.5 m envelope.
export const QUAD_ROOF_MAXIMUM_TIME = 11.662155337689937;

export function quadRoof(id: string, component: number, rings: Point[][]) {
  const oriented = orientRoofRings(rings), profile = QUAD_ROOF_PROFILES[`${id}/${component}`];
  if (!profile || roofSourceSignature(oriented) !== profile.signature) throw new Error(`Mapped Quad roof footprint changed (${id}/${component}, ${oriented.flat().length} vertices). Regenerate and review its straight-skeleton roof profile.`);
  const model = evaluateRoofSkeleton(oriented, profile);
  const points: Point[] = model.vertices.map(([x, y]) => [x, y]);
  const times = new Map(points.map((point, i) => [point, model.vertices[i][2]]));
  const maximumTime = id === 'relation/35820' ? QUAD_ROOF_MAXIMUM_TIME : model.maximumTime;
  let longest = 0, axis: Point = [1, 0];
  for (const [i, a] of rings[0].entries()) {
    const b = rings[0][(i + 1) % rings[0].length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > longest) { longest = length; axis = [(b[0] - a[0]) / length, (b[1] - a[1]) / length]; }
  }
  return {
    triangles: model.triangles.map(triangle => triangle.map(i => points[i]) as [Point, Point, Point]),
    fraction: (point: Point) => (times.get(point) ?? 0) / maximumTime,
    edge: (a: Point, b: Point): Point[] => [a, b],
    uv: (point: Point): Point => [point[0] * axis[0] + point[1] * axis[1], -point[0] * axis[1] + point[1] * axis[0]],
  };
}

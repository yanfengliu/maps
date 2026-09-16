import type { PlanPoint } from "../../world/vehicle-surfaces.ts";

export const cross = (a: PlanPoint, b: PlanPoint, c: PlanPoint): number => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function signedArea(points: readonly PlanPoint[]): number {
  let area = 0;
  for (let i = 1; i + 1 < points.length; i++) area += cross(points[0]!, points[i]!, points[i + 1]!);
  return area / 2;
}
export function counterclockwise(points: readonly PlanPoint[]): PlanPoint[] {
  return signedArea(points) < 0 ? [...points].reverse() : [...points];
}
export function convexHull(points: readonly PlanPoint[]): PlanPoint[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const half = (list: readonly PlanPoint[]): PlanPoint[] => {
    const result: PlanPoint[] = [];
    for (const point of list) {
      while (result.length > 1 && cross(result.at(-2)!, result.at(-1)!, point) <= 0) result.pop();
      result.push(point);
    }
    result.pop();
    return result;
  };
  return [...half(sorted), ...half(sorted.toReversed())];
}
/** Exact half-plane partition in double precision; no positive tolerance band
 * that could turn a gap into coverage. Callers account for residual area.
 */
export function partitionConvex(subject: readonly PlanPoint[], clip: readonly PlanPoint[]): { inside: PlanPoint[]; outside: PlanPoint[][] } {
  let inside = [...subject];
  const outside: PlanPoint[][] = [];
  for (let i = 0; i < clip.length && inside.length >= 3; i++) {
    const a = clip[i]!, b = clip[(i + 1) % clip.length]!, keep: PlanPoint[] = [], rest: PlanPoint[] = [];
    // A repeated vertex has no half-plane. Treating 0 <= 0 as outside would
    // copy the entire subject into both sides. Ignore only sub-nanometre edges.
    if (Math.hypot(b[0]-a[0],b[1]-a[1]) < 1e-10) continue;
    for (let j = 0; j < inside.length; j++) {
      const p = inside[j]!, q = inside[(j + 1) % inside.length]!, fp = cross(a, b, p), fq = cross(a, b, q);
      if (fp >= 0) keep.push(p);
      if (fp <= 0) rest.push(p);
      if (fp * fq < 0) {
        const t = fp / (fp - fq), hit: PlanPoint = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        keep.push(hit); rest.push(hit);
      }
    }
    if (rest.length >= 3 && Math.abs(signedArea(rest)) > 1e-14) outside.push(rest);
    inside = keep;
  }
  return { inside: inside.length >= 3 ? inside : [], outside };
}
export function uncovered(subject: readonly PlanPoint[], covers: readonly (readonly PlanPoint[])[]): PlanPoint[][] {
  if (subject.length < 3) return [];
  let remaining: PlanPoint[][] = [counterclockwise(subject)];
  for (const cover of covers) {
    const minX=Math.min(...cover.map(p=>p[0])),maxX=Math.max(...cover.map(p=>p[0])),minZ=Math.min(...cover.map(p=>p[1])),maxZ=Math.max(...cover.map(p=>p[1]));
    remaining = remaining.flatMap(piece => piece.every(p=>p[0]<minX)||piece.every(p=>p[0]>maxX)||piece.every(p=>p[1]<minZ)||piece.every(p=>p[1]>maxZ)?[piece]:partitionConvex(piece, cover).outside);
    if (!remaining.length) break;
  }
  return remaining;
}

/** Exact XZ centre-segment containment in a union of source corridor capsules.
 * Bound: only the supplied local occurrences; their authored widths describe the
 * movement corridor. This checks the centre, not a sole or rotating body hull.
 */
import type { NetworkEdge, WorldPoint } from "../../world/network-data.ts";
type Interval = [number, number];
function linear(lo: number, hi: number, start: number, delta: number, min: number, max: number): Interval | undefined {
  if (Math.abs(delta) < 1e-15) return start >= min && start <= max ? [lo, hi] : undefined;
  const a = (min - start) / delta, b = (max - start) / delta;
  lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
  return hi >= lo ? [lo, hi] : undefined;
}
function circle(a: Readonly<WorldPoint>, b: Readonly<WorldPoint>, p: Readonly<WorldPoint>, radius: number): Interval | undefined {
  const dx = b.x - a.x, dz = b.z - a.z, x = a.x - p.x, z = a.z - p.z, aa = dx * dx + dz * dz, cc = x * x + z * z - radius * radius;
  if (aa < 1e-24) return cc <= 0 ? [0, 1] : undefined;
  const bb = 2 * (x * dx + z * dz), discriminant = bb * bb - 4 * aa * cc;
  if (discriminant < 0) return undefined;
  const root = Math.sqrt(discriminant), lo = Math.max(0, (-bb - root) / (2 * aa)), hi = Math.min(1, (-bb + root) / (2 * aa));
  return hi >= lo ? [lo, hi] : undefined;
}
export function walkingCorridorContains(a: Readonly<WorldPoint>, b: Readonly<WorldPoint>, edges: readonly NetworkEdge[]): boolean {
  const intervals: Interval[] = [];
  for (const edge of edges) {
    const radius = edge.widthM / 2;
    if (!Number.isFinite(radius) || radius <= 0) continue;
    for (let i = 1; i < edge.points.length; i++) {
      const p = edge.points[i - 1]!, q = edge.points[i]!, dx = q.x - p.x, dz = q.z - p.z, length = Math.hypot(dx, dz);
      for (const centre of [p, q]) { const hit = circle(a, b, centre, radius); if (hit) intervals.push(hit); }
      if (length < 1e-12) continue;
      const ux = dx / length, uz = dz / length, x = a.x - p.x, z = a.z - p.z, vx = b.x - a.x, vz = b.z - a.z;
      const along = linear(0, 1, x * ux + z * uz, vx * ux + vz * uz, 0, length);
      if (!along) continue;
      const side = linear(along[0], along[1], x * uz - z * ux, vx * uz - vz * ux, -radius, radius);
      if (side) intervals.push(side);
    }
  }
  intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let covered = 0;
  for (const [lo, hi] of intervals) {
    if (lo > covered + 1e-12) return false;
    covered = Math.max(covered, hi);
    if (covered >= 1 - 1e-12) return true;
  }
  return false;
}

/** Exact planar patches for an explicitly assigned pavement layer. This module
 * does not assign physical levels or choose a terrain/road authority.
 */
export type PlanPoint = readonly [number, number];
/** y = x * plane[0] + z * plane[1] + plane[2]. */
export type HeightPlane = readonly [number, number, number];
export interface PavementPatch {
  layer: string;
  source: string;
  ring: PlanPoint[];
  plane: HeightPlane;
  /** Lower surface used only to close an exposed outer edge. */
  base: HeightPlane;
}
export const planeHeight = (plane: HeightPlane, point: PlanPoint): number => plane[0] * point[0] + plane[1] * point[1] + plane[2];
const cross = (a: PlanPoint, b: PlanPoint, c: PlanPoint): number => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export function patchArea(ring: readonly PlanPoint[]): number {
  let twice = 0;
  for (let i = 1; i + 1 < ring.length; i++) twice += cross(ring[0]!, ring[i]!, ring[i + 1]!);
  return Math.abs(twice) / 2;
}
const valid = (ring: PlanPoint[]): boolean => ring.length >= 3 && patchArea(ring) > 1e-12;
function clean(ring: PlanPoint[]): PlanPoint[] {
  const out: PlanPoint[] = [];
  for (const point of ring) if (!out.length || Math.hypot(point[0] - out.at(-1)![0], point[1] - out.at(-1)![1]) > 1e-10) out.push(point);
  if (out.length > 1 && Math.hypot(out[0]![0] - out.at(-1)![0], out[0]![1] - out.at(-1)![1]) < 1e-10) out.pop();
  return out;
}

/** Split without a positive/negative tolerance band: such a band silently
 * duplicates thin area. Round-off is checked by the caller's area ledger.
 */
export function splitPatch(ring: PlanPoint[], signed: (point: PlanPoint) => number): [PlanPoint[], PlanPoint[]] {
  const inside: PlanPoint[] = [], outside: PlanPoint[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!, b = ring[(i + 1) % ring.length]!, fa = signed(a), fb = signed(b);
    if (fa >= 0) inside.push(a); if (fa <= 0) outside.push(a);
    if (fa * fb < 0) { const t = fa / (fa - fb); const point: PlanPoint = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; inside.push(point); outside.push(point); }
  }
  return [clean(inside), clean(outside)];
}

/** Return the intersection and every outside fragment of a convex clip ring.
 * Both rings are counterclockwise in X/Z; output retains the input plane.
 */
export function partitionPatch(ring: PlanPoint[], clip: readonly PlanPoint[]): { inside: PlanPoint[]; outside: PlanPoint[][] } {
  let inside = ring; const outside: PlanPoint[][] = [];
  for (let i = 0; i < clip.length && valid(inside); i++) {
    const [keep, rest] = splitPatch(inside, (point) => cross(clip[i]!, clip[(i + 1) % clip.length]!, point));
    if (valid(rest)) outside.push(rest); inside = keep;
  }
  return { inside: valid(inside) ? inside : [], outside };
}

/** Raise an already assigned layer only inside an explicitly eligible support
 * footprint. Source ownership and the lower surface survive every split.
 */
export function overlayPatches(patches: readonly PavementPatch[], footprint: readonly PlanPoint[], plane: HeightPlane): PavementPatch[] {
  const out: PavementPatch[] = [];
  for (const patch of patches) {
    const firstOutput = out.length;
    const part = partitionPatch(patch.ring, footprint);
    for (const ring of part.outside) out.push({ ...patch, ring });
    if (valid(part.inside)) {
      const [raised, original] = splitPatch(part.inside, (point) => planeHeight(plane, point) - planeHeight(patch.plane, point));
      if (valid(raised)) out.push({ ...patch, ring: raised, plane });
      // Equal planes split into both sides. Keep one whole inside patch instead.
      if (part.inside.every((point) => planeHeight(plane, point) === planeHeight(patch.plane, point))) {
        if (valid(raised)) out.pop(); out.push({ ...patch, ring: part.inside });
      } else if (valid(original)) out.push({ ...patch, ring: original });
    }
    const originalArea = patchArea(patch.ring);
    const residual = Math.abs(originalArea - out.slice(firstOutput).reduce((sum, item) => sum + patchArea(item.ring), 0));
    if (residual > Math.max(1e-6, originalArea * 1e-10)) throw new Error(`Pavement overlay lost ${residual} square metres of source ${patch.source} in layer ${patch.layer}; repair the clipping partition before publishing this surface.`);
  }
  return out;
}

interface Edge { patch: PavementPatch; a: PlanPoint; b: PlanPoint; length: number; direction: PlanPoint }
export interface PavementRiser { layer: string; source: string; a: readonly [number, number, number]; b: readonly [number, number, number]; lowerA: number; lowerB: number }

/** Node only collinear edges belonging to the same explicit layer. Opposite
 * patch edges cancel at equal heights; a height step emits only its exposed
 * interval. There is no global X/Z vertex weld or all-triangle wall extrusion.
 * Coincidence tolerance is 2 micrometres, below final Float32 world precision.
 */
export function exposedRisers(patches: readonly PavementPatch[]): PavementRiser[] {
  const tolerance = 2e-6, cellSize = 10;
  const edges: Edge[] = [], cells = new Map<string, number[]>();
  const keys = (a: PlanPoint, b: PlanPoint, layer: string): string[] => {
    const result: string[] = [];
    for (let x = Math.floor((Math.min(a[0], b[0]) - tolerance) / cellSize); x <= Math.floor((Math.max(a[0], b[0]) + tolerance) / cellSize); x++) for (let z = Math.floor((Math.min(a[1], b[1]) - tolerance) / cellSize); z <= Math.floor((Math.max(a[1], b[1]) + tolerance) / cellSize); z++) result.push(`${layer}:${x}:${z}`);
    return result;
  };
  for (const patch of patches) for (let i = 0; i < patch.ring.length; i++) {
    const a = patch.ring[i]!, b = patch.ring[(i + 1) % patch.ring.length]!, length = Math.hypot(b[0] - a[0], b[1] - a[1]); if (length < tolerance) continue;
    const index = edges.length; edges.push({ patch, a, b, length, direction: [(b[0] - a[0]) / length, (b[1] - a[1]) / length] });
    for (const key of keys(a, b, patch.layer)) { const list = cells.get(key) ?? []; list.push(index); cells.set(key, list); }
  }
  const result: PavementRiser[] = [];
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index]!, project = (p: PlanPoint): number => (p[0] - edge.a[0]) * edge.direction[0] + (p[1] - edge.a[1]) * edge.direction[1];
    const candidates = new Set(keys(edge.a, edge.b, edge.patch.layer).flatMap((key) => cells.get(key) ?? []));
    const neighbors: { edge: Edge; from: number; to: number }[] = [], knots = [0, edge.length];
    for (const otherIndex of candidates) {
      if (otherIndex === index) continue; const other = edges[otherIndex]!;
      if (edge.direction[0] * other.direction[0] + edge.direction[1] * other.direction[1] > -0.999999) continue;
      if (Math.abs(cross(edge.a, edge.b, other.a)) / edge.length > tolerance || Math.abs(cross(edge.a, edge.b, other.b)) / edge.length > tolerance) continue;
      const from = Math.max(0, Math.min(project(other.a), project(other.b))), to = Math.min(edge.length, Math.max(project(other.a), project(other.b)));
      if (to - from <= tolerance) continue; neighbors.push({ edge: other, from, to }); knots.push(from, to);
    }
    for (let a = 0; a < neighbors.length; a++) for (let b = a + 1; b < neighbors.length; b++) {
      const one = neighbors[a]!, two = neighbors[b]!;
      const from = Math.max(one.from, two.from), to = Math.min(one.to, two.to); if (to - from <= tolerance) continue;
      const at = (distance: number): PlanPoint => [edge.a[0] + edge.direction[0] * distance, edge.a[1] + edge.direction[1] * distance];
      const left = planeHeight(one.edge.patch.plane, at(from)) - planeHeight(two.edge.patch.plane, at(from));
      const right = planeHeight(one.edge.patch.plane, at(to)) - planeHeight(two.edge.patch.plane, at(to));
      if (left * right < 0) knots.push(from + (to - from) * left / (left - right));
    }
    knots.sort((a, b) => a - b); const unique = knots.filter((value, i) => !i || value - knots[i - 1]! > tolerance);
    for (let i = 0; i + 1 < unique.length; i++) {
      const from = unique[i]!, to = unique[i + 1]!, mid = (from + to) / 2;
      if (to - from <= tolerance) continue;
      const a: PlanPoint = [edge.a[0] + edge.direction[0] * from, edge.a[1] + edge.direction[1] * from], b: PlanPoint = [edge.a[0] + edge.direction[0] * to, edge.a[1] + edge.direction[1] * to];
      const adjacent = neighbors.filter((n) => n.from <= mid && n.to >= mid);
      const topA = planeHeight(edge.patch.plane, a), topB = planeHeight(edge.patch.plane, b);
      const lowerA = adjacent.length ? Math.max(...adjacent.map((n) => planeHeight(n.edge.patch.plane, a))) : planeHeight(edge.patch.base, a);
      const lowerB = adjacent.length ? Math.max(...adjacent.map((n) => planeHeight(n.edge.patch.plane, b))) : planeHeight(edge.patch.base, b);
      // Crossing height functions need one more exact interval split.
      const da = topA - lowerA, db = topB - lowerB;
      if (Math.max(da, db) <= tolerance) continue;
      if (da * db < 0) {
        const t = da / (da - db), p: PlanPoint = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], y = topA + (topB - topA) * t;
        result.push(da > 0 ? { layer: edge.patch.layer, source: edge.patch.source, a: [a[0], topA, a[1]], b: [p[0], y, p[1]], lowerA, lowerB: y } : { layer: edge.patch.layer, source: edge.patch.source, a: [p[0], y, p[1]], b: [b[0], topB, b[1]], lowerA: y, lowerB });
      } else result.push({ layer: edge.patch.layer, source: edge.patch.source, a: [a[0], topA, a[1]], b: [b[0], topB, b[1]], lowerA, lowerB });
    }
  }
  return result;
}

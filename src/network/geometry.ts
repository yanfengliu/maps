import type { Junction, LaneEdge, NetworkEdge, WorldPoint } from "../world/network-data.ts";

export function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function pathLength(points: readonly WorldPoint[]): number {
  let result = 0;
  for (let i = 1; i < points.length; i += 1) result += distance(points[i - 1]!, points[i]!);
  return result;
}

/**
 * Per-edge segment lengths and their prefix sums, derived once from point lists
 * that never change after the network is loaded. `segmentLengths[i]` is exactly
 * the `distance(points[i], points[i + 1])` the walk below would have computed,
 * so a sample neither recomputes a length nor recovers one by subtraction.
 */
interface EdgeArcTable {
  readonly pointCount: number;
  readonly segmentLengths: Float64Array;
  readonly cumulative: Float64Array;
}

const arcTables = new WeakMap<object, EdgeArcTable>();

/**
 * A one-entry memo in front of the `WeakMap`.
 *
 * `sampleRoute` samples one edge three times in a row — its own position and the two
 * `headingAt` probes — and a `WeakMap.get` per call was measurable in the tick's own CPU
 * profile, where `sampleEdge` is about an eighth of the fixed step. The memo caches the
 * last edge looked up, so calls that share an edge share one lookup. It caches an
 * identity and not a value: a hit returns the very table the `WeakMap` holds, so no
 * sample changes.
 */
let memoEdge: object | null = null;
let memoTable: EdgeArcTable | null = null;

function arcTable(edge: Pick<NetworkEdge, "points">): EdgeArcTable {
  if (edge === memoEdge) return memoTable!;
  let table = arcTables.get(edge);
  if (!table) {
    const points = edge.points;
    const count = points.length;
    const segmentLengths = new Float64Array(Math.max(0, count - 1));
    const cumulative = new Float64Array(Math.max(1, count));
    for (let i = 1; i < count; i += 1) {
      const length = distance(points[i - 1]!, points[i]!);
      segmentLengths[i - 1] = length;
      cumulative[i] = cumulative[i - 1]! + length;
    }
    table = { pointCount: count, segmentLengths, cumulative };
    arcTables.set(edge, table);
  }
  memoEdge = edge;
  memoTable = table;
  return table;
}

/**
 * The furthest point the walk reaches: the first `i` with
 * `cumulative[i] >= remaining` whose segment `i - 1` has positive length, or
 * `points.length - 1` when no segment carries `remaining`. Those are the linear
 * walk's two exits, and `cumulative` is non-decreasing, so the predicate is
 * false over a prefix of the indices and true after it.
 */
function arcPointIndex(table: EdgeArcTable, remaining: number): number {
  const count = table.pointCount;
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (middle > 0 && remaining <= table.cumulative[middle]! && table.segmentLengths[middle - 1]! > 0) high = middle;
    else low = middle + 1;
  }
  return low >= count ? count - 1 : low;
}

/** Arc-length sampling shared by the simulation and its unit tests. */
export function sampleEdge(edge: Pick<NetworkEdge, "points" | "lengthM">, distanceM: number): WorldPoint {
  const remaining = Math.max(0, Math.min(edge.lengthM, distanceM));
  const table = arcTable(edge);
  const index = arcPointIndex(table, remaining);
  if (index <= 0) return { ...edge.points[0]! };
  if (index < table.pointCount - 1) {
    // The residual is recovered by the walk's own subtractions, in the walk's own
    // order: subtracting one prefix sum instead rounds differently and moves the
    // pose by an ulp, which is enough to change a digest even though it changes
    // nothing visible.
    let residual = remaining;
    for (let i = 1; i < index; i += 1) residual -= table.segmentLengths[i - 1]!;
    const length = table.segmentLengths[index - 1]!;
    if (residual <= length) {
      const t = residual / length;
      const a = edge.points[index - 1]!, b = edge.points[index]!;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
  }
  // Either the last segment carries the arc length, or the residual landed just
  // past its segment because the walk's own rounding drift is comparable to the
  // arc left inside it — which is exactly when the walk stops early and returns
  // the final point. The binary search cannot tell those two apart from prefix
  // sums alone, so this last stretch is walked. It costs one `distance` per
  // segment once per call at worst, which is the walk it replaces.
  let walked = remaining;
  for (let i = 1; i < edge.points.length; i += 1) {
    const a = edge.points[i - 1]!, b = edge.points[i]!;
    const length = table.segmentLengths[i - 1]!;
    if (walked <= length && length > 0) {
      const t = walked / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
    walked -= length;
  }
  return { ...edge.points[edge.points.length - 1]! };
}

export function headingAt(edge: Pick<NetworkEdge, "points" | "lengthM">, distanceM: number): number {
  const a = sampleEdge(edge, Math.max(0, distanceM - 0.2));
  const b = sampleEdge(edge, Math.min(edge.lengthM, distanceM + 0.2));
  return Math.atan2(b.x - a.x, b.z - a.z);
}

export function projectOntoEdge(edge: Pick<NetworkEdge,"points"|"lengthM">, point:WorldPoint): {distanceM:number;offsetM:number} {
  let best=Infinity,along=0,bestAlong=0;
  for(let i=1;i<edge.points.length;i++) {
    const a=edge.points[i-1]!,b=edge.points[i]!,dx=b.x-a.x,dz=b.z-a.z,squared=dx*dx+dz*dz;
    const t=squared===0?0:Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/squared));
    const residual=(point.x-a.x-dx*t)**2+(point.z-a.z-dz*t)**2,segment=distance(a,b);
    if(residual<best){best=residual;bestAlong=along+segment*t;}along+=segment;
  }
  return {distanceM:bestAlong,offsetM:Math.sqrt(best)};
}

/** Consumers may change lanes only within the shared arc-length window of these parallel approach sections. */
export function laneChangeOverlap(a:LaneEdge,b:LaneEdge): {startM:number;endM:number;neighbourStartM:number;neighbourEndM:number}|null {
  if(a.kind!=="lane"||b.kind!=="lane"||a.junctionId||b.junctionId||a.sourceWayId!==b.sourceWayId)return null;
  const ha=headingAt(a,a.lengthM/2),hb=headingAt(b,b.lengthM/2);
  if(Math.cos(ha-hb)<.95)return null;
  const startM=projectOntoEdge(a,b.points[0]!).distanceM,endM=projectOntoEdge(a,b.points.at(-1)!).distanceM;
  const neighbourStartM=projectOntoEdge(b,a.points[0]!).distanceM,neighbourEndM=projectOntoEdge(b,a.points.at(-1)!).distanceM;
  if(endM-startM<8||neighbourEndM-neighbourStartM<8)return null;
  const middle=sampleEdge(a,(startM+endM)/2),offset=projectOntoEdge(b,middle).offsetM;
  if(offset<.5||offset>Math.max(a.widthM,b.widthM)*1.8)return null;
  return {startM,endM,neighbourStartM,neighbourEndM};
}

/** Full vehicle footprint, including a tail on the previous edge. Queues outside do not hold clearance. */
export function occupiesJunction(junction: Junction, centre: WorldPoint, heading: number, lengthM: number, widthM = 0): boolean {
  const sine=Math.sin(heading),cosine=Math.cos(heading);
  return (junction.conflictAreas ?? [junction]).some((area) => {
    const dx=area.position.x-centre.x,dz=area.position.z-centre.z;
    const lateral=dx*cosine-dz*sine,longitudinal=dx*sine+dz*cosine;
    return Math.hypot(Math.max(0,Math.abs(lateral)-widthM/2),Math.max(0,Math.abs(longitudinal)-lengthM/2))<area.radiusM-1e-6;
  });
}

import type { Junction, LaneEdge, NetworkEdge, WorldPoint } from "../world/network-data.ts";

export function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function pathLength(points: readonly WorldPoint[]): number {
  let result = 0;
  for (let i = 1; i < points.length; i += 1) result += distance(points[i - 1]!, points[i]!);
  return result;
}

/** Arc-length sampling shared by the simulation and its unit tests. */
export function sampleEdge(edge: Pick<NetworkEdge, "points" | "lengthM">, distanceM: number): WorldPoint {
  let remaining = Math.max(0, Math.min(edge.lengthM, distanceM));
  for (let i = 1; i < edge.points.length; i += 1) {
    const a = edge.points[i - 1]!, b = edge.points[i]!;
    const length = distance(a, b);
    if (remaining <= length && length > 0) {
      const t = remaining / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    }
    remaining -= length;
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

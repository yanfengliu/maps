/**
 * harness: tools/scene/build.ts owns surface truth; this is the OSM graph builder
 * and its full-source validator. Synthetic fixtures test graph rules separately.
 */
import { AOI_BOUNDS_WGS84, AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import type { Junction, LaneEdge, NetworkData, NetworkDiagnostics, NetworkEdge, NetworkNode, PhysicalTrafficControl, WalkEdge, WorldPoint } from "../../src/world/network-data.ts";
import { distance, laneChangeOverlap, pathLength, sampleEdge } from "../../src/network/geometry.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { DRIVABLE, WALKABLE, indexOsm, laneLayout, surfaceExclusion, type OsmDocument, type OsmElement } from "./osm.ts";
import { physicalWalkingFacts } from "./physical.ts";
import { groupCompounds } from "./compounds.ts";
import { ADMISSION_BOUNDS, MAX_BOUNDARY_EGRESS_M } from "../../src/network/admission-bounds.ts";

interface SourcePoint extends WorldPoint { id: string; boundary: boolean }
interface Segment { id: string; way: OsmElement; points: SourcePoint[] }
interface LaneSource { edge: LaneEdge; start: string; end: string; way: OsmElement; direction: number; laneIndex: number; laneCount: number }
export interface GenerateOptions {
  groundHeight: (x: number, z: number) => number | undefined;
  roadHeight?: (x: number, z: number) => number | undefined;
  provenance: NetworkData["provenance"];
  /** Synthetic fixtures can disable the place-specific authored diagonal. */
  includeScramble?: boolean;
}

export function generateNetwork(document: OsmDocument, options: GenerateOptions): NetworkData {
  const index = indexOsm(document), all = [...index.values()];
  const diagnostics: NetworkDiagnostics = { sourceElements: document.elements.length, uniqueElements: index.size, surfaceWays: 0, surfaceSignalNodes:0, excludedWays: {}, inferredLaneWays: [], inferredWidthWays: [], conservativeRestrictions: [], clippedSegments: 0, droppedShortSegments: 0, undrapableSegments: [], authoredEdges: [], vehicleComponents: 0, pedestrianComponents: 0, vehicleEdgesReachingExit:0, vehicleEdgesReachableFromEntry:0, vehicleEntriesWithoutExit:[] };
  const sourceNodes = new Map(all.filter((e) => e.type === "node").map((e) => [e.id, e]));
  const ways = all.filter((e) => {
    if (e.type !== "way" || !e.tags?.highway) return false;
    const reason = surfaceExclusion(e.tags);
    if (reason) { diagnostics.excludedWays[reason] = (diagnostics.excludedWays[reason] ?? 0) + 1; return false; }
    if (!e.nodes || e.nodes.length < 2) return false;
    diagnostics.surfaceWays += 1;
    return true;
  });
  const vehicleWays = ways.filter((w) => {
    if (!DRIVABLE.has(w.tags!.highway!) || ["no", "private"].includes(w.tags!.motor_vehicle ?? w.tags!.vehicle ?? "")) return false;
    const width = Number.parseFloat(w.tags!.width ?? "");
    if (Number.isFinite(width) && width < 2) { diagnostics.excludedWays["too-narrow-for-vehicles"] = (diagnostics.excludedWays["too-narrow-for-vehicles"] ?? 0) + 1; return false; }
    return true;
  });
  const walkWays = ways.filter((w) => WALKABLE.has(w.tags!.highway!) && w.tags!.foot !== "no" && w.tags!.area !== "yes");
  const height = (x: number, z: number): number => {
    const ground = options.groundHeight(x, z);
    if (ground === undefined || !Number.isFinite(ground)) throw new Error(`Network point (${x.toFixed(2)}, ${z.toFixed(2)}) is off the terrain; rebuild data:scene or fix AOI clipping.`);
    // Road mesh is already lifted .2 m by its builder; do not add that twice.
    const road = options.roadHeight?.(x, z);
    return Math.max(ground + 0.22, road !== undefined && road < ground + 2 ? road + 0.025 : ground + 0.22);
  };
  const project = (node: OsmElement, id = `n${node.id}`, boundary = false): SourcePoint => {
    if (!Number.isFinite(node.lat) || !Number.isFinite(node.lon)) throw new Error(`OSM node/${node.id} has no finite latitude/longitude; fetch complete way members.`);
    const projected = geographicToPlaneRectangular(node.lat!, node.lon!);
    const point = planeRectangularToWorld({ ...projected, height: 0 }, AOI_ORIGIN_EPSG6677);
    return { id, boundary, x: point.x, y: options.groundHeight(point.x, point.z) ?? 0, z: point.z };
  };
  const nodes = new Map<string, NetworkNode>();
  const addNode = (id: string, point: WorldPoint, boundary = false) => {
    const old = nodes.get(id);
    if (old && distance(old.position, point) > 0.001) throw new Error(`Network node ${id} has two positions; keep lane endpoints separate from OSM topology nodes.`);
    if (!old) nodes.set(id, { id, position: { x: point.x, y: point.y, z: point.z }, boundary });
  };
  const drape = (points: readonly WorldPoint[]) => resample(points, height);
  const aoiCorners = [
    [AOI_BOUNDS_WGS84.south,AOI_BOUNDS_WGS84.west], [AOI_BOUNDS_WGS84.south,AOI_BOUNDS_WGS84.east],
    [AOI_BOUNDS_WGS84.north,AOI_BOUNDS_WGS84.east], [AOI_BOUNDS_WGS84.north,AOI_BOUNDS_WGS84.west],
  ].map(([lat,lon])=>project({type:"node",id:0,lat:lat!,lon:lon!}));
  const alignBoundary = (point:WorldPoint,source:SourcePoint,tangent:{x:number;z:number}):WorldPoint => {
    if(!source.boundary)return point;
    let best:{a:WorldPoint;normal:{x:number;z:number};distance:number}|undefined;
    for(let i=0;i<4;i++) {
      const a=aoiCorners[i]!,b=aoiCorners[(i+1)%4]!,direction=unit(a,b),normal={x:direction.z,z:-direction.x};
      const separation=Math.abs((source.x-a.x)*normal.x+(source.z-a.z)*normal.z);
      if(!best||separation<best.distance)best={a,normal,distance:separation};
    }
    const dot=tangent.x*best!.normal.x+tangent.z*best!.normal.z;
    if(Math.abs(dot)<1e-6)throw new Error(`Boundary lane ${source.id} is tangent to the AOI edge; inspect clipping before creating a portal.`);
    const along=((best!.a.x-point.x)*best!.normal.x+(best!.a.z-point.z)*best!.normal.z)/dot;
    return{x:point.x+tangent.x*along,y:point.y,z:point.z+tangent.z*along};
  };
  const roadSegments = drapableSegments(segmentsFor(vehicleWays, sourceNodes, project, diagnostics, false), true);
  const walkingSegments = drapableSegments(segmentsFor(walkWays, sourceNodes, project, diagnostics, true), false);
  function drapableSegments(segments: Segment[], vehicle: boolean): Segment[] {
    const kept: Segment[] = [];
    for (const segment of segments) {
      const dense = resample(segment.points, () => 0);
      const layout = vehicle ? laneLayout(segment.way.tags!) : null;
      const offsets: number[] = [0];
      if (layout) {
        const width = Math.max(1.8, Math.min(3.5, layout.widthM / (layout.forward + layout.backward)));
        const both = layout.forward > 0 && layout.backward > 0;
        for (const direction of [1,-1]) for(let i=0;i<(direction===1?layout.forward:layout.backward);i++) {
          const count=direction===1?layout.forward:layout.backward;
          offsets.push(direction*(both?(count-i-.5)*width:((count-1)/2-i)*width));
        }
      }
      const checks=offsets.map((offset)=>offsetPath(dense,offset));
      const valid=dense.map((_,i)=>checks.every((path)=>Number.isFinite(options.groundHeight(path[i]!.x,path[i]!.z))));
      let run:SourcePoint[]=[],part=0,lost=0,firstMissing:WorldPoint|undefined;
      const finish=()=>{if(run.length>=2&&pathLength(run)>=0.1)kept.push({...segment,id:`${segment.id}:ground${part++}`,points:run});run=[];};
      for(let i=0;i<dense.length;i++) {
        const p=dense[i]!;
        if(i>0&&(!valid[i]||!valid[i-1]))lost+=Math.hypot(p.x-dense[i-1]!.x,p.z-dense[i-1]!.z);
        if(!valid[i]){firstMissing??=p;finish();continue;}
        const original=i===0?segment.points[0]:i===dense.length-1?segment.points.at(-1):undefined;
        run.push({...p,id:original?.id??`ground:${segment.id}:${i}`,boundary:original?.boundary??false});
      }
      finish();
      if(firstMissing)diagnostics.undrapableSegments.push({sourceWayId:segment.way.id,segmentId:segment.id,x:firstMissing.x,z:firstMissing.z,lostLengthM:lost,reason:vehicle?"Terrain absent under a lane centre; drapable pieces kept, no invented bridge.":"Terrain absent under walking path; drapable pieces kept, no invented ground."});
    }
    return kept;
  }
  const lanes: LaneEdge[] = [], walks: WalkEdge[] = [], laneSources: LaneSource[] = [];
  for (const segment of roadSegments) {
    const layout = laneLayout(segment.way.tags!);
    if (layout.inferredLanes && !diagnostics.inferredLaneWays.includes(segment.way.id)) diagnostics.inferredLaneWays.push(segment.way.id);
    if (layout.inferredWidth && !diagnostics.inferredWidthWays.includes(segment.way.id)) diagnostics.inferredWidthWays.push(segment.way.id);
    for (const direction of [1, -1]) {
      const count = direction === 1 ? layout.forward : layout.backward;
      const both = layout.forward > 0 && layout.backward > 0;
      const laneWidth = Math.max(1.8, Math.min(3.5, layout.widthM / (layout.forward + layout.backward)));
      const source = direction === 1 ? segment.points : segment.points.toReversed();
      for (let lane = 0; lane < count; lane += 1) {
        const offset = both ? (count - lane - 0.5) * laneWidth : ((count - 1) / 2 - lane) * laneWidth;
        const offsetPoints = offsetPath(source, offset);
        offsetPoints[0]=alignBoundary(offsetPoints[0]!,source[0]!,unit(offsetPoints[0]!,offsetPoints[1]!));
        const lastIndex=offsetPoints.length-1;
        offsetPoints[lastIndex]=alignBoundary(offsetPoints[lastIndex]!,source.at(-1)!,unit(offsetPoints[lastIndex-1]!,offsetPoints[lastIndex]!));
        const points = drape(offsetPoints);
        if (pathLength(points) < 0.1) continue;
        const id = `lane:${segment.id}:${direction === 1 ? "f" : "r"}:${lane}`;
        const from = `${id}:start`, to = `${id}:end`;
        addNode(from, points[0]!, source[0]!.boundary); addNode(to, points.at(-1)!, source.at(-1)!.boundary);
        const speedTag = Number.parseFloat(segment.way.tags!.maxspeed ?? "");
        const speedMps = Number.isFinite(speedTag) ? Math.max(2, Math.min(80, speedTag)) / 3.6 : (["service", "living_street"].includes(segment.way.tags!.highway!) ? 15 : 30) / 3.6;
        const edge: LaneEdge = { id, from, to, points, lengthM: pathLength(points), widthM: laneWidth, sourceWayId: segment.way.id, nextIds: [], signalGroupId: null, junctionId: null, kind: "lane", speedMps, leftLaneId: lane > 0 ? `lane:${segment.id}:${direction === 1 ? "f" : "r"}:${lane - 1}` : null, rightLaneId: lane + 1 < count ? `lane:${segment.id}:${direction === 1 ? "f" : "r"}:${lane + 1}` : null,entryRule:"none",sourceControlNodeIds:[] };
        lanes.push(edge); laneSources.push({ edge, start: source[0]!.id, end: source.at(-1)!.id, way: segment.way, direction, laneIndex: lane, laneCount: count });
      }
    }
  }
  const restrictions = all.filter((e) => e.type === "relation" && e.tags?.type === "restriction");
  const allowed = restrictionFilter(restrictions, diagnostics);
  const starts = new Map<string, LaneSource[]>();
  for (const source of laneSources) { const list = starts.get(source.start) ?? []; list.push(source); starts.set(source.start, list); }
  const roadNeighbours=new Map<string,Set<string>>();
  for(const source of laneSources)for(const[a,b]of[[source.start,source.end],[source.end,source.start]]){const set=roadNeighbours.get(a!)??new Set<string>();set.add(b!);roadNeighbours.set(a!,set);}
  const ownPermissions=new Map<string,string>(),effectivePermissions=new Map<string,string>();
  for(const source of laneSources) {
    const tags=source.way.tags!,laneTags=tags[source.direction===1?"turn:lanes:forward":"turn:lanes:backward"]??(["yes","true","1","-1"].includes(tags.oneway??"")?tags["turn:lanes"]:undefined);
    const permission=laneTags?.split("|")[source.laneIndex];
    if(permission&&permission!=="none"){ownPermissions.set(source.edge.id,permission);effectivePermissions.set(source.edge.id,permission);}
  }
  // OSM may split a road into several ways before its actual junction. Carry
  // destination permissions across degree-two continuation, without applying a
  // turn-only label to the artificial split itself or forgetting it afterwards.
  const permissionQueue=laneSources.filter(source=>effectivePermissions.has(source.edge.id));
  while(permissionQueue.length) {
    const incoming=permissionQueue.shift()!,permission=effectivePermissions.get(incoming.edge.id)!;
    if((roadNeighbours.get(incoming.end)?.size??0)>2)continue;
    for(const outgoing of starts.get(incoming.end)??[]) {
      if(outgoing.end===incoming.start||outgoing.laneIndex!==Math.min(incoming.laneIndex,outgoing.laneCount-1)||ownPermissions.has(outgoing.edge.id))continue;
      const a=unit(incoming.edge.points.at(-2)!,incoming.edge.points.at(-1)!),b=unit(outgoing.edge.points[0]!,outgoing.edge.points[1]!);
      if(a.x*b.x+a.z*b.z<.5)continue;
      if(!effectivePermissions.has(outgoing.edge.id)){effectivePermissions.set(outgoing.edge.id,permission);permissionQueue.push(outgoing);}
    }
  }
  const welds = new Map<string, string>();
  const resolveWeld = (id: string): string => { let current = id; while (welds.has(current)) current = welds.get(current)!; return current; };
  for (const incoming of laneSources) {
    for (const outgoing of starts.get(incoming.end) ?? []) {
      // A U turn is not an ordinary successor, including at an interior dead end.
      if (incoming.start === outgoing.end || incoming.edge.id === outgoing.edge.id) continue;
      if (!allowed(incoming, outgoing)) continue;
      const a = incoming.edge.points, b = outgoing.edge.points;
      const da = unit(a.at(-2)!, a.at(-1)!), db = unit(b[0]!, b[1]!);
      const dot = da.x * db.x + da.z * db.z;
      const internalContinuation = (incoming.way.id === outgoing.way.id && incoming.direction === outgoing.direction)||((roadNeighbours.get(incoming.end)?.size??0)<=2&&dot>.5);
      if (!internalContinuation && dot < -0.7) continue;
      const cross = da.x * db.z - da.z * db.x;
      const turn = dot > 0.8 ? "through" : cross < 0 ? "left" : "right";
      const permissions = effectivePermissions.get(incoming.edge.id);
      if (!internalContinuation && permissions && permissions !== "none" && !permissions.split(";").some((value) => value === turn || value === `slight_${turn}` || value === `sharp_${turn}`)) continue;
      // Keep parallel lanes ordered through the intersection; merge excess lanes at the far end.
      const targetLane = internalContinuation ? Math.min(incoming.laneIndex,outgoing.laneCount-1) : turn === "left" ? 0 : turn === "right" ? outgoing.laneCount - 1 : Math.min(incoming.laneIndex, outgoing.laneCount - 1);
      if (outgoing.laneIndex !== targetLane) continue;
      const curve = bezier(a.at(-1)!, b[0]!, da, db);
      const check = resample(curve, () => 0);
      const missing = check.find((p) => !Number.isFinite(options.groundHeight(p.x,p.z)));
      if (missing) { diagnostics.undrapableSegments.push({sourceWayId:incoming.way.id,segmentId:`turn:${incoming.edge.id}>${outgoing.edge.id}`,x:missing.x,z:missing.z,lostLengthM:pathLength(check),reason:"Terrain absent under turn connector; turn omitted."}); continue; }
      const points = drape(curve);
      if (pathLength(points) < 0.03) {
        const from = resolveWeld(outgoing.edge.from), to = resolveWeld(incoming.edge.to);
        if (from !== to) welds.set(from, to);
        incoming.edge.nextIds.push(outgoing.edge.id);
      } else {
        const id = `turn:${incoming.edge.id}>${outgoing.edge.id}`;
        lanes.push({ id, from: incoming.edge.to, to: outgoing.edge.from, points, lengthM: pathLength(points), widthM: Math.min(incoming.edge.widthM, outgoing.edge.widthM), sourceWayId: incoming.way.id, nextIds: [outgoing.edge.id], signalGroupId: null, junctionId: null, kind: "turn", speedMps: Math.min(incoming.edge.speedMps, outgoing.edge.speedMps, turn === "through" ? 9 : 5), leftLaneId: null, rightLaneId: null,entryRule:"none",sourceControlNodeIds:[] });
        incoming.edge.nextIds.push(id);
      }
    }
  }
  for (const edge of lanes) { edge.from = resolveWeld(edge.from); edge.to = resolveWeld(edge.to); }
  for (const segment of walkingSegments) {
    const kind = segment.way.tags!.footway === "crossing" ? "crossing" : "sidewalk";
    const parsedWidth = Number.parseFloat(segment.way.tags!.width ?? "");
    const widthM = Number.isFinite(parsedWidth) ? Math.max(1, Math.min(12, parsedWidth)) : kind === "crossing" ? (segment.way.tags!["crossing:scramble"] === "yes" ? 5 : 3) : segment.way.tags!.highway === "pedestrian" ? 5 : 2.5;
    addWalkPair(`walk:${segment.id}`, segment.points, segment.way.id, kind, widthM);
  }
  function addWalkPair(id: string, points: readonly SourcePoint[], sourceWayId: number | null, kind: WalkEdge["kind"], widthM: number) {
    const path = drape(points);
    if (pathLength(path) < 0.1) return;
    const from = `walk:${points[0]!.id}`, to = `walk:${points.at(-1)!.id}`;
    addNode(from, path[0]!, points[0]!.boundary); addNode(to, path.at(-1)!, points.at(-1)!.boundary);
    for (const reverse of [false, true]) walks.push({ id: `${id}:${reverse ? "r" : "f"}`, from: reverse ? to : from, to: reverse ? from : to, points: reverse ? path.toReversed() : path, lengthM: pathLength(path), widthM, sourceWayId, kind, nextIds: [], signalGroupId: null, junctionId: null });
  }
  if (options.includeScramble !== false) {
    // The missing NE-SW diagonal joins real sidewalk endpoints. OSM maps the other one.
    const endpoints = [3608568703, 3608568744].map((id) => sourceNodes.get(id));
    if (endpoints.some((node) => !node)) throw new Error("Shibuya diagonal endpoints node/3608568703 and node/3608568744 are missing; inspect the current OSM extract before authoring a replacement.");
    addWalkPair("walk:authored:scramble-diagonal", endpoints.map((node) => project(node!)), null, "crossing", 5);
    diagnostics.authoredEdges.push("walk:authored:scramble-diagonal:f", "walk:authored:scramble-diagonal:r");
  }
  connectWalks(walks);
  const physicalWalking=physicalWalkingFacts(walkingSegments,(points)=>drape(points));
  const authored=walks.find((edge)=>edge.id==="walk:authored:scramble-diagonal:f");
  if(authored)physicalWalking.crossings.push({id:"authored:scramble-diagonal",source:"authored",sourceWayId:null,paths:[authored.points],markings:"zebra",sourceMarkings:null,control:"signals",widthM:5,widthSource:"authored"});
  let junctions = buildJunctions(walks, sourceNodes, project, height, options.includeScramble !== false,new Set(physicalWalking.crossings.filter(c=>c.control==="signals"&&c.sourceWayId!==null).map(c=>c.sourceWayId!)));
  const surfaceNodeIds=new Set(roadSegments.flatMap((segment)=>segment.points.map((point)=>point.id)));
  const surfaceSignals: {id:number;point:WorldPoint}[]=[];
  for(const node of sourceNodes.values())if(node.tags?.highway==="traffic_signals"&&surfaceNodeIds.has(`n${node.id}`)) {
    diagnostics.surfaceSignalNodes+=1;
    const point=project(node);
    surfaceSignals.push({id:node.id,point});
    const existing=nearestJunction(point,junctions);
    if(existing){existing.controlKind="signal";existing.controlSource="mapped";}
    else junctions.push(junction(`signal:node:${node.id}`,{...point,y:height(point.x,point.z)},12,"signal","mapped"));
  }
  for (const walk of walks) if (walk.kind === "crossing") {
    const middle = sampleEdge(walk, walk.lengthM / 2);
    const junction = nearestJunction(middle, junctions);
    if (!junction) throw new Error(`Crossing ${walk.id} has no conflict controller; every road crossing requires shared entry control.`);
    walk.junctionId = junction.id; walk.signalGroupId = junction.pedestrianGroup;
    junction.radiusM = Math.max(junction.radiusM, ...walk.points.map((point) => Math.hypot(point.x - junction.position.x, point.z - junction.position.z) + 3));
  }
  // OSM junction topology and mapped stop/yield nodes need shared admission even
  // where no traffic signal or pedestrian crossing was mapped.
  const neighbours=new Map<string,Set<string>>();
  for(const source of laneSources)for(const[a,b]of[[source.start,source.end],[source.end,source.start]]){const adjacent=neighbours.get(a!)??new Set<string>();adjacent.add(b!);neighbours.set(a!,adjacent);}
  for(const[id,adjacent]of neighbours)if(id.startsWith("n")&&adjacent.size>=3) {
    const node=sourceNodes.get(Number(id.slice(1)))!,point=project(node);
    if(!nearestJunction(point,junctions)) {
      const touches=laneSources.filter((source)=>source.start===id||source.end===id);
      const radius=Math.max(4,...touches.map((source)=>{const p=source.start===id?source.edge.points[0]!:source.edge.points.at(-1)!;return Math.hypot(p.x-point.x,p.z-point.z)+1;}));
      junctions.push(junction(`priority:node:${node.id}`,{...point,y:height(point.x,point.z)},radius));
    }
  }
  const controlSources:{control:PhysicalTrafficControl;originalApproaches:LaneSource[]}[]=[];
  for(const node of sourceNodes.values())if(surfaceNodeIds.has(`n${node.id}`)&&["traffic_signals","stop","give_way"].includes(node.tags?.highway??"")) {
    const kind=node.tags!.highway as PhysicalTrafficControl["kind"],rawDirection=node.tags!["traffic_signals:direction"]??node.tags!.direction;
    const direction:PhysicalTrafficControl["direction"]=["forward","backward","both"].includes(rawDirection??"")?rawDirection as PhysicalTrafficControl["direction"]:"unknown";
    const sources=laneSources.filter((source)=>source.end===`n${node.id}`&&(direction!=="forward"||source.direction===1)&&(direction!=="backward"||source.direction===-1));
    const point=project(node);
    if(!nearestJunction(point,junctions))junctions.push(junction(`priority:node:${node.id}`,{...point,y:height(point.x,point.z)},4,"reservation","mapped"));
    for(const source of sources){source.edge.sourceControlNodeIds.push(node.id);if(kind==="stop")source.edge.entryRule="stop";else if(kind==="give_way"&&source.edge.entryRule!=="stop")source.edge.entryRule="yield";}
    const vectors=sources.map((source)=>unit(source.edge.points.at(-2)!,source.edge.points.at(-1)!));
    const travelDirection=vectors.length&&vectors.every((v)=>v.x*vectors[0]!.x+v.z*vectors[0]!.z>.95)?vectors[0]!:null;
    controlSources.push({control:{id:`osm:node:${node.id}:${kind}`,sourceNodeId:node.id,position:{x:point.x,y:height(point.x,point.z),z:point.z},kind,direction,travelDirection,sourceWayIds:[...new Set(vehicleWays.filter((way)=>way.nodes!.includes(node.id)).map((way)=>way.id))],approachEdgeIds:[],entryEdgeIds:[],controllerId:null,sourceTags:{...node.tags}},originalApproaches:sources});
  }
  const merged=mergeOverlappingJunctions(junctions);
  junctions=merged.junctions;
  for(const signal of surfaceSignals)if(!nearestJunction(signal.point,junctions))throw new Error(`Surface traffic signal node/${signal.id} at (${signal.point.x},${signal.point.z}) lost its controller after overlap merging.`);
  for(const walk of walks)if(walk.junctionId){walk.junctionId=merged.owners.get(walk.junctionId)!;walk.signalGroupId=junctions.find(j=>j.id===walk.junctionId)!.controlKind==="signal"?`${walk.junctionId}:pedestrian`:null;}
  const splitLanes = splitConflictSections(lanes, junctions, nodes, height);
  junctions=groupCompounds(junctions,splitLanes,walks).junctions;
  for (const junction of junctions) junction.vehicleGroups = [...new Set(splitLanes.filter((lane) => lane.junctionId === junction.id && lane.signalGroupId).map((lane) => lane.signalGroupId!))].sort();
  const incomingByEdge=new Map<string,LaneEdge[]>();
  for(const edge of splitLanes)for(const next of edge.nextIds){const incoming=incomingByEdge.get(next)??[];incoming.push(edge);incomingByEdge.set(next,incoming);}
  for(const{control,originalApproaches}of controlSources) {
    const owner=nearestJunction(control.position,junctions)!;control.controllerId=owner.id;
    const belongs=(edge:LaneEdge)=>originalApproaches.some((source)=>edge.id===source.edge.id||edge.id.startsWith(`${source.edge.id}:section`));
    control.approachEdgeIds=splitLanes.filter(belongs).map((edge)=>edge.id);
    // A mapped control node may be an internal split inside a merged union.
    // Find its applicable admission boundary through actual predecessor paths,
    // rather than leaving the consumer to reinterpret road IDs or invent heads.
    const stack=splitLanes.filter((edge)=>belongs(edge)&&edge.junctionId===owner.id),seen=new Set<string>(),entries=new Set<string>();
    while(stack.length){const edge=stack.pop()!;if(seen.has(edge.id))continue;seen.add(edge.id);const previous=incomingByEdge.get(edge.id)??[];if(previous.some(p=>p.junctionId!==owner.id)||nodes.get(edge.from)?.boundary)entries.add(edge.id);for(const p of previous)if(p.junctionId===owner.id)stack.push(p);}
    control.entryEdgeIds=[...entries].sort();
  }
  const usedNodes = new Set([...splitLanes, ...walks].flatMap((edge) => [edge.from, edge.to]));
  const nodeList = [...nodes.values()].filter((node) => usedNodes.has(node.id));
  const boundary = new Set(nodeList.filter((node) => node.boundary).map((node) => node.id));
  diagnostics.vehicleComponents = componentCount(splitLanes);
  diagnostics.pedestrianComponents = componentCount(walks);
  const portals={ vehicleEntry: splitLanes.filter((edge) => boundary.has(edge.from)).map((edge) => edge.id), vehicleExit: splitLanes.filter((edge) => boundary.has(edge.to)).map((edge) => edge.id), pedestrian: walks.filter((edge) => boundary.has(edge.from)).map((edge) => edge.id) };
  const forward=new Map(splitLanes.map((edge)=>[edge.id,edge.nextIds])),reverse=new Map<string,string[]>();
  for(const edge of splitLanes)for(const id of edge.nextIds){const ids=reverse.get(id)??[];ids.push(edge.id);reverse.set(id,ids)}
  const reachable=(initial:string[],adjacency:Map<string,string[]>)=>{const seen=new Set(initial),stack=[...initial];while(stack.length)for(const id of adjacency.get(stack.pop()!)??[])if(!seen.has(id)){seen.add(id);stack.push(id)}return seen;};
  const canExit=reachable(portals.vehicleExit,reverse);
  diagnostics.vehicleEdgesReachingExit=canExit.size;
  diagnostics.vehicleEdgesReachableFromEntry=reachable(portals.vehicleEntry,forward).size;
  diagnostics.vehicleEntriesWithoutExit=portals.vehicleEntry.filter((id)=>!canExit.has(id));
  return { version: 1, admissionBounds:{...ADMISSION_BOUNDS},boundary:{polygon:aoiCorners.map(p=>({x:p.x,y:0,z:p.z})),provenance:"projected-aoi-bounds",maxEgressDistanceM:MAX_BOUNDARY_EGRESS_M},provenance: { ...options.provenance }, nodes: nodeList, lanes: splitLanes, walks, junctions, physical:{...physicalWalking,trafficControls:controlSources.map((source)=>source.control)},portals, diagnostics };
}

function segmentsFor(ways: OsmElement[], nodes: Map<number, OsmElement>, project: (n: OsmElement, id?: string, boundary?: boolean) => SourcePoint, diagnostics: NetworkDiagnostics, walking: boolean): Segment[] {
  const usage = new Map<number, number>();
  for (const way of ways) for (const id of new Set(way.nodes!)) usage.set(id, (usage.get(id) ?? 0) + 1);
  const result: Segment[] = [];
  for (const way of ways) {
    let source: OsmElement[] = [], segmentIndex = 0;
    const emit = () => {
      if (source.length < 2) return;
      let run: SourcePoint[] = [], clipIndex = 0;
      const finish = () => {
        if (run.length >= 2 && pathLength(run) >= 0.1) result.push({ id: `${way.id}:${segmentIndex}:${clipIndex++}`, way, points: run });
        else if (run.length) diagnostics.droppedShortSegments += 1;
        run = [];
      };
      for (let i = 1; i < source.length; i += 1) {
        const a = source[i - 1]!, b = source[i]!, interval = clip(a, b);
        if (!interval) { finish(); continue; }
        const [t0, t1] = interval;
        const at = (t: number, which: string) => t === 0 ? project(a) : t === 1 ? project(b) : project({ type: "node", id: way.id, lat: a.lat! + (b.lat! - a.lat!) * t, lon: a.lon! + (b.lon! - a.lon!) * t }, `border:${way.id}:${segmentIndex}:${i}:${which}`, true);
        const start = at(t0, "a"), end = at(t1, "b");
        if (t0 > 0 || t1 < 1) diagnostics.clippedSegments += 1;
        if (run.length && distance(run.at(-1)!, start) > 0.01) finish();
        if (!run.length) run.push(start);
        if (distance(run.at(-1)!, end) >= 0.001) run.push(end);
        if (t1 < 1) finish();
      }
      finish(); segmentIndex += 1;
    };
    for (let i = 0; i < way.nodes!.length; i += 1) {
      const id = way.nodes![i]!, node = nodes.get(id);
      if (!node) throw new Error(`OSM way/${way.id} refers to missing node/${id}; fetch complete way members.`);
      source.push(node);
      const crossing = way.tags!.footway === "crossing";
      const split = i > 0 && ((usage.get(id) ?? 0) > 1 || (!walking && ["crossing", "traffic_signals", "stop","give_way"].includes(node.tags?.highway ?? "")));
      // A crossing remains one route edge unless another walk joins it. A road's shared node alone is not a pedestrian connection.
      if (split && (!crossing || (usage.get(id) ?? 0) > 1)) { emit(); source = [node]; }
    }
    emit();
  }
  return result;
}

function clip(a: OsmElement, b: OsmElement): [number, number] | null {
  let lo = 0, hi = 1;
  const dx = b.lon! - a.lon!, dz = b.lat! - a.lat!;
  for (const [p, q] of [[-dx, a.lon! - AOI_BOUNDS_WGS84.west], [dx, AOI_BOUNDS_WGS84.east - a.lon!], [-dz, a.lat! - AOI_BOUNDS_WGS84.south], [dz, AOI_BOUNDS_WGS84.north - a.lat!]]) {
    if (Math.abs(p!) < 1e-15) { if (q! < 0) return null; continue; }
    const t = q! / p!;
    if (p! < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
    if (lo > hi) return null;
  }
  return [lo, hi];
}

function unit(a: WorldPoint, b: WorldPoint): { x: number; z: number } {
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
}

function offsetPath(points: readonly WorldPoint[], offset: number): WorldPoint[] {
  return points.map((point, i) => {
    const a = unit(points[Math.max(0, i - 1)]!, point), b = unit(point, points[Math.min(points.length - 1, i + 1)]!);
    const nx = a.z + b.z, nz = -a.x - b.x, length = Math.hypot(nx, nz) || 1;
    return { x: point.x + nx / length * offset, y: point.y, z: point.z + nz / length * offset };
  });
}

function resample(points: readonly WorldPoint[], height: (x: number, z: number) => number): WorldPoint[] {
  const result: WorldPoint[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!, b = points[i]!, steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1.5));
    for (let j = 0; j < steps; j += 1) {
      const t = j / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const p = { x, y: height(x, z), z };
      if (!result.length || distance(result.at(-1)!, p) > 0.001) result.push(p);
    }
  }
  const last = points.at(-1)!; result.push({ x: last.x, y: height(last.x, last.z), z: last.z });
  return result;
}

function bezier(a: WorldPoint, b: WorldPoint, da: {x:number;z:number}, db: {x:number;z:number}): WorldPoint[] {
  const handle = Math.min(8, Math.hypot(b.x - a.x, b.z - a.z) / 2);
  const result: WorldPoint[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8, s = 1 - t;
    result.push({ x: s ** 3 * a.x + 3 * s * s * t * (a.x + da.x * handle) + 3 * s * t * t * (b.x - db.x * handle) + t ** 3 * b.x, y: a.y + (b.y - a.y) * t, z: s ** 3 * a.z + 3 * s * s * t * (a.z + da.z * handle) + 3 * s * t * t * (b.z - db.z * handle) + t ** 3 * b.z });
  }
  return result;
}

function restrictionFilter(relations: OsmElement[], diagnostics: NetworkDiagnostics): (a: LaneSource, b: LaneSource) => boolean {
  const rules = relations.map((relation) => {
    const from = relation.members?.find((m) => m.role === "from" && m.type === "way")?.ref;
    const to = relation.members?.find((m) => m.role === "to" && m.type === "way")?.ref;
    const via = relation.members?.filter((m) => m.role === "via") ?? [];
    const type = relation.tags!.restriction;
    const supported = via.length === 1 && via[0]!.type === "node" && !!type && /^(only|no)_(left_turn|right_turn|straight_on|u_turn)$/.test(type) && !relation.tags!["restriction:conditional"];
    if (!supported) diagnostics.conservativeRestrictions.push({ relationId: relation.id, reason: "Via-way, conditional, vehicle-specific or unknown restriction: block its from-to/via entry instead of assuming permission." });
    return { from, to, via, type, supported };
  });
  return (a, b) => {
    for (const rule of rules) {
      if (rule.from !== a.way.id) continue;
      if (!rule.supported) {
        if (rule.to === b.way.id || rule.via.some((m) => m.type === "way" && m.ref === b.way.id) || rule.to === undefined) return false;
        continue;
      }
      if (a.end !== `n${rule.via[0]!.ref}`) continue;
      if (rule.type!.startsWith("only_") && b.way.id !== rule.to) return false;
      if (rule.type!.startsWith("no_") && b.way.id === rule.to) return false;
    }
    return true;
  };
}

function connectWalks(walks: WalkEdge[]): void {
  const starts = new Map<string, string[]>();
  for (const edge of walks) { const list = starts.get(edge.from) ?? []; list.push(edge.id); starts.set(edge.from, list); }
  for (const edge of walks) edge.nextIds = starts.get(edge.to) ?? [];
}

function buildJunctions(walks: WalkEdge[], sourceNodes: Map<number, OsmElement>, project: (n: OsmElement) => SourcePoint, height: (x:number,z:number)=>number, includeScramble: boolean,signalWays:Set<number>): Junction[] {
  const junctions: Junction[] = [];
  if (includeScramble) {
    const node = sourceNodes.get(291758776);
    if (!node) throw new Error("The Shibuya crossing node/291758776 is missing; inspect the fetched extract.");
    junctions.push(junction("scramble", project(node), 39,"signal","authored"));
  }
  for (const edge of walks.filter((w) => w.kind === "crossing" && w.id.endsWith(":f"))) {
    const middle = sampleEdge(edge, edge.lengthM / 2);
    const mappedSignal=edge.sourceWayId!==null&&signalWays.has(edge.sourceWayId);
    const existing=nearestJunction(middle,junctions);
    if(existing){if(mappedSignal){existing.controlKind="signal";existing.controlSource="mapped";}continue;}
    const max = Math.max(...edge.points.map((point) => Math.hypot(point.x - middle.x, point.z - middle.z)));
    // The source way controls this distinction; a crossing corridor by itself is not a signal.
    junctions.push(junction(`junction:${edge.id.slice(0,-2)}`, { x: middle.x, y: height(middle.x,middle.z), z: middle.z }, Math.max(8, max + 5),mappedSignal?"signal":"reservation",mappedSignal?"mapped":"inferred"));
  }
  return junctions;
}

function junction(id: string, position: WorldPoint, radiusM: number,controlKind:Junction["controlKind"]="reservation",controlSource:Junction["controlSource"]="inferred"): Junction {
  return { id,controlKind,controlSource, position: { x: position.x, y: position.y, z: position.z }, radiusM, vehicleGroups: [], pedestrianGroup: `${id}:pedestrian`, clearanceSeconds: 3, vehicleGreenSeconds: id === "scramble" ? 16 : 12, pedestrianGreenSeconds: id === "scramble" ? 25 : 16 };
}

function nearestJunction(point: WorldPoint, junctions: Junction[]): Junction | undefined {
  return junctions.filter((j) => (j.conflictAreas??[j]).some((area)=>Math.hypot(point.x - area.position.x, point.z - area.position.z) <= area.radiusM)).sort((a,b) => Math.hypot(point.x-a.position.x,point.z-a.position.z)-Math.hypot(point.x-b.position.x,point.z-b.position.z))[0];
}

/** Share authority over original intersecting disks, without growing/re-merging enclosing circles. */
export function mergeOverlappingJunctions(input:Junction[]):{junctions:Junction[];owners:Map<string,string>} {
  const parents=input.map((_,i)=>i);
  const find=(i:number):number=>parents[i]===i?i:(parents[i]=find(parents[i]!));
  for(let a=0;a<input.length;a++)for(let b=a+1;b<input.length;b++) {
    if((input[a]!.conflictAreas??[input[a]!]).some((x)=>(input[b]!.conflictAreas??[input[b]!]).some((y)=>Math.hypot(x.position.x-y.position.x,x.position.z-y.position.z)<x.radiusM+y.radiusM)))parents[find(b)]=find(a);
  }
  const groups=new Map<number,Junction[]>();
  for(let i=0;i<input.length;i++){const group=groups.get(find(i))??[];group.push(input[i]!);groups.set(find(i),group)}
  const owners=new Map<string,string>(),junctions:Junction[]=[];
  for(const group of groups.values()) {
    const first=group.find((j)=>j.id==="scramble")??group[0]!;
    for(const item of group)owners.set(item.id,first.id);
    if(group.length===1){junctions.push(first);continue;}
    const areas=group.flatMap((j)=>(j.conflictAreas??[j]).map((area)=>({position:area.position,radiusM:area.radiusM})));
    const signal=group.some((j)=>j.controlKind==="signal");
    junctions.push({...first,controlKind:signal?"signal":"reservation",controlSource:group.some((j)=>j.controlSource==="mapped")?"mapped":first.controlSource,conflictAreas:areas,radiusM:Math.max(...areas.map((area)=>Math.hypot(area.position.x-first.position.x,area.position.z-first.position.z)+area.radiusM))});
  }
  return {junctions,owners};
}

function splitConflictSections(lanes: LaneEdge[], junctions: Junction[], nodes: Map<string,NetworkNode>, height:(x:number,z:number)=>number): LaneEdge[] {
  const result: LaneEdge[] = [], replacements = new Map<string,LaneEdge[]>();
  for (const edge of lanes) {
    const pieces: {points:WorldPoint[];junction:Junction|undefined}[] = [];
    // Analytic circle intersections ensure stopping occurs exactly at the conflict boundary.
    for (let i=1;i<edge.points.length;i+=1) {
      const a=edge.points[i-1]!,b=edge.points[i]!,dx=b.x-a.x,dz=b.z-a.z,A=dx*dx+dz*dz;
      const cuts=[0,1];
      if(A>1e-12) for(const j of junctions.flatMap((junction)=>junction.conflictAreas??[junction])) {
        const ox=a.x-j.position.x,oz=a.z-j.position.z,B=2*(ox*dx+oz*dz),C=ox*ox+oz*oz-j.radiusM*j.radiusM,D=B*B-4*A*C;
        if(D<=0)continue;
        for(const t of [(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)])if(t>1e-7&&t<1-1e-7)cuts.push(t);
      }
      cuts.sort((x,y)=>x-y);
      for(let c=1;c<cuts.length;c+=1) {
        const at=(t:number):WorldPoint=>{const x=a.x+dx*t,z=a.z+dz*t;return{x,y:height(x,z),z}};
        const start=at(cuts[c-1]!),end=at(cuts[c]!),j=nearestJunction(at((cuts[c-1]!+cuts[c]!)/2),junctions),last=pieces.at(-1);
        if(distance(start,end)<0.0001)continue;
        if(last?.junction?.id===j?.id&&last)last.points.push(end);else pieces.push({points:[start,end],junction:j});
      }
    }
    const split:LaneEdge[]=[];
    for(let i=0;i<pieces.length;i+=1) {
      const piece=pieces[i]!,id=pieces.length===1?edge.id:`${edge.id}:section${i}`,from=i===0?edge.from:`${edge.id}:cut${i}`,to=i===pieces.length-1?edge.to:`${edge.id}:cut${i+1}`;
      const heading=unit(piece.points[0]!,piece.points[Math.min(2,piece.points.length-1)]!);
      const sector=((Math.round(Math.atan2(heading.x,heading.z)/(Math.PI/2))%4)+4)%4;
      const group=piece.junction?.controlKind==="signal"?`${piece.junction.id}:vehicle:${sector}`:null;
      const entryRule=edge.entryRule==="stop"||edge.entryRule==="yield"?edge.entryRule:piece.junction?(piece.junction.controlKind==="signal"?"signal":"priority"):"none";
      const item:LaneEdge={...edge,id,from,to,points:piece.points,lengthM:pathLength(piece.points),junctionId:piece.junction?.id??null,signalGroupId:group,nextIds:[],leftLaneId:null,rightLaneId:null,entryRule};
      split.push(item); result.push(item);
      if(!nodes.has(from))nodes.set(from,{id:from,position:piece.points[0]!,boundary:false});
      if(!nodes.has(to))nodes.set(to,{id:to,position:piece.points.at(-1)!,boundary:false});
    }
    for(let i=0;i<split.length;i+=1)split[i]!.nextIds=i+1<split.length?[split[i+1]!.id]:edge.nextIds;
    replacements.set(edge.id,split);
  }
  for(const edge of result) {
    edge.nextIds=edge.nextIds.map((id)=>replacements.get(id)?.[0]?.id??id);
  }
  // Match corresponding outside-conflict pieces, rather than copying source IDs
  // only when a whole road happened not to intersect a control envelope.
  for(const original of lanes) {
    if(original.kind!=="lane"||!original.rightLaneId)continue;
    const leftPieces=replacements.get(original.id)??[],rightPieces=replacements.get(original.rightLaneId)??[];
    const candidates:{left:LaneEdge;right:LaneEdge;overlap:number}[]=[];
    for(const left of leftPieces)for(const right of rightPieces) {
      const window=laneChangeOverlap(left,right);
      if(window)candidates.push({left,right,overlap:window.endM-window.startM});
    }
    candidates.sort((a,b)=>b.overlap-a.overlap||a.left.id.localeCompare(b.left.id)||a.right.id.localeCompare(b.right.id));
    for(const{left,right}of candidates)if(!left.rightLaneId&&!right.leftLaneId){left.rightLaneId=right.id;right.leftLaneId=left.id;}
  }
  return result;
}

function componentCount(edges: NetworkEdge[]): number {
  const adjacency=new Map<string,Set<string>>();
  for(const edge of edges)for(const [a,b]of [[edge.from,edge.to],[edge.to,edge.from]]) {const set=adjacency.get(a!)??new Set();set.add(b!);adjacency.set(a!,set)}
  let count=0;const seen=new Set<string>();
  for(const node of adjacency.keys())if(!seen.has(node)){count+=1;const stack=[node];while(stack.length){const id=stack.pop()!;if(seen.has(id))continue;seen.add(id);for(const next of adjacency.get(id)??[])stack.push(next)}}
  return count;
}

import { distance, laneChangeOverlap, pathLength } from "./geometry.ts";
import type { LaneEdge, NetworkData, NetworkEdge, WalkEdge, WorldPoint } from "../world/network-data.ts";
import { ADMISSION_BOUNDS, MAX_BOUNDARY_EGRESS_M } from "./admission-bounds.ts";

/**
 * Bounds: database shape, directed adjacency, finite/draped geometry and known source IDs.
 * This does not establish visual lane placement or traffic behaviour; those need the rendered run.
 */
export function validateNetwork(input: unknown): asserts input is NetworkData {
  const fail = (message: string): never => { throw new Error(`Movement network: ${message} Re-run npm run data:network after correcting the source or builder.`); };
  if (!input || typeof input !== "object") fail("expected a JSON object.");
  const data = input as NetworkData;
  if (data.version !== 1) fail(`version ${String(data.version)} is unsupported; this app reads version 1.`);
  for(const key of ["maxFootprintDiagonalM","stopGapM","routeGroupingGapM"] as const)if(data.admissionBounds?.[key]!==ADMISSION_BOUNDS[key])fail(`admission bound ${key} differs from the supported engineering envelope.`);
  if (!data.provenance || !data.provenance.osmTimestamp || !data.provenance.method) fail("source timestamp/method are missing.");
  for (const key of ["osmSha256", "terrainSha256", "roadsSha256"] as const) if (!/^[a-f0-9]{64}$/.test(data.provenance[key] ?? "")) fail(`${key} must be a SHA-256 digest of the input bytes.`);
  for (const key of ["nodes", "lanes", "walks", "junctions"] as const) if (!Array.isArray(data[key])) fail(`${key} must be an array.`);
  const finitePoint = (point: WorldPoint, label: string) => {
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite)) fail(`${label} has a non-finite world coordinate.`);
    if (Math.abs(point.x) > 800 || Math.abs(point.z) > 800 || point.y < -10 || point.y > 100) fail(`${label} is outside the local Shibuya world frame.`);
  };
  if(data.boundary?.provenance!=="projected-aoi-bounds"||data.boundary.maxEgressDistanceM!==MAX_BOUNDARY_EGRESS_M||!Array.isArray(data.boundary.polygon)||data.boundary.polygon.length!==4)fail("boundary needs the projected AOI quadrilateral and the supported retirement envelope.");
  const polygon=data.boundary.polygon;
  for(let i=0;i<4;i++){
    const a=polygon[i]!,b=polygon[(i+1)%4]!,c=polygon[(i+2)%4]!;finitePoint(a,"boundary corner");finitePoint(b,"boundary corner");finitePoint(c,"boundary corner");
    if(a.y!==0||(b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x)>=-1)fail("boundary corners must form the clockwise projected AOI polygon at reference height zero.");
  }
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  if (nodes.size !== data.nodes.length) fail("node IDs are duplicated.");
  for (const node of data.nodes) { if (!node.id || typeof node.boundary !== "boolean") fail(`node ${node.id} has an invalid ID/boundary flag.`); finitePoint(node.position, `node ${node.id}`); }
  const junctions = new Map(data.junctions.map((junction) => [junction.id, junction]));
  if (junctions.size !== data.junctions.length) fail("junction IDs are duplicated.");
  const groups = new Map<string, string>(), members = new Set<string>();
  for (const junction of data.junctions) {
    finitePoint(junction.position, `junction ${junction.id}`);
    if(!["signal","reservation"].includes(junction.controlKind)||!["mapped","authored","inferred"].includes(junction.controlSource))fail(`junction ${junction.id} has no supported admission authority/provenance.`);
    if(junction.memberIds!==undefined){if(!Array.isArray(junction.memberIds)||!junction.memberIds.length||!junction.memberIds.includes(junction.id))fail(`junction ${junction.id} lost its original controller members.`);for(const member of junction.memberIds){if(typeof member!=="string"||!member||members.has(member))fail(`original controller ${member} has missing or duplicate compound ownership.`);members.add(member);}}
    for (const n of [junction.radiusM, junction.clearanceSeconds, junction.vehicleGreenSeconds, junction.pedestrianGreenSeconds]) if (!Number.isFinite(n) || n <= 0) fail(`junction ${junction.id} has a non-positive extent/duration.`);
    if(junction.conflictAreas!==undefined){if(!Array.isArray(junction.conflictAreas)||!junction.conflictAreas.length)fail(`junction ${junction.id} has an empty conflict union.`);for(const area of junction.conflictAreas){finitePoint(area.position,`junction ${junction.id} conflict area`);if(!Number.isFinite(area.radiusM)||area.radiusM<=0)fail(`junction ${junction.id} has an invalid conflict radius.`);}}
    if (!Array.isArray(junction.vehicleGroups)) fail(`junction ${junction.id} has no vehicle group list.`);
    if(junction.vehicleGroups.length>4)fail(`junction ${junction.id} exceeds the four authored approach sectors.`);
    if(junction.controlKind==="reservation"&&junction.vehicleGroups.length)fail(`reservation ${junction.id} invents signal groups.`);
    if(junction.controlKind==="signal")for (const group of [...junction.vehicleGroups, junction.pedestrianGroup]) { if (!group || groups.has(group)) fail(`signal group ${group} is missing or duplicated.`); groups.set(group, junction.id); }
  }
  for(let a=0;a<data.junctions.length;a++)for(let b=a+1;b<data.junctions.length;b++) {
    const left=data.junctions[a]!,right=data.junctions[b]!;
    if((left.conflictAreas??[left]).some((x)=>(right.conflictAreas??[right]).some((y)=>Math.hypot(x.position.x-y.position.x,x.position.z-y.position.z)<x.radiusM+y.radiusM-1e-6)))fail(`controllers ${left.id} and ${right.id} overlap; merge their original conflict areas under one authority.`);
  }
  const all = [...data.lanes, ...data.walks];
  if (new Set(all.map((edge) => edge.id)).size !== all.length) fail("edge IDs are duplicated.");
  const validateEdges = (edges: NetworkEdge[], vehicle: boolean) => {
    const byId = new Map(edges.map((edge) => [edge.id, edge]));
    for (const edge of edges) {
      if (!edge.id || !nodes.has(edge.from) || !nodes.has(edge.to)) fail(`edge ${edge.id} has a missing endpoint ${edge.from}/${edge.to}.`);
      if (!Array.isArray(edge.points) || edge.points.length < 2) fail(`edge ${edge.id} needs at least two points.`);
      for (const point of edge.points) finitePoint(point, `edge ${edge.id}`);
      if (!Number.isFinite(edge.lengthM) || edge.lengthM <= 0 || Math.abs(pathLength(edge.points) - edge.lengthM) > 0.001) fail(`edge ${edge.id} has an invalid arc length ${edge.lengthM}.`);
      if (!Number.isFinite(edge.widthM) || edge.widthM <= 0 || edge.widthM > 20) fail(`edge ${edge.id} has an invalid width ${edge.widthM}.`);
      if (edge.sourceWayId !== null && (!Number.isSafeInteger(edge.sourceWayId) || edge.sourceWayId <= 0)) fail(`edge ${edge.id} has an invalid source way ID.`);
      if (distance(edge.points[0]!, nodes.get(edge.from)!.position) > 0.04 || distance(edge.points.at(-1)!, nodes.get(edge.to)!.position) > 0.04) fail(`edge ${edge.id} does not meet its endpoint node positions.`);
      for (let i = 1; i < edge.points.length; i += 1) {
        const a = edge.points[i - 1]!, b = edge.points[i]!;
        if (Math.hypot(a.x - b.x, a.z - b.z) > 2.01) fail(`edge ${edge.id} skips more than 2 m of ground between samples.`);
      }
      if (!Array.isArray(edge.nextIds) || new Set(edge.nextIds).size !== edge.nextIds.length) fail(`edge ${edge.id} has a missing/duplicated successor list.`);
      for (const id of edge.nextIds) {
        const next = byId.get(id);
        if (!next) fail(`edge ${edge.id} refers to missing successor ${id}.`);
        if (edge.to !== next!.from || distance(edge.points.at(-1)!, next!.points[0]!) > 0.04) fail(`edge ${edge.id} does not connect to successor ${id}.`);
      }
      if (edge.junctionId !== null && !junctions.has(edge.junctionId)) fail(`edge ${edge.id} refers to missing junction ${edge.junctionId}.`);
      if (edge.signalGroupId !== null && groups.get(edge.signalGroupId) !== edge.junctionId) fail(`edge ${edge.id} has a signal group outside its junction.`);
      if (vehicle) {
        const lane = edge as LaneEdge;
        if(!["signal","stop","yield","priority","none"].includes(lane.entryRule)||!Array.isArray(lane.sourceControlNodeIds)||lane.sourceControlNodeIds.some(id=>!Number.isSafeInteger(id)||id<=0))fail(`lane ${edge.id} lost its entry rule/source control IDs.`);
        if(lane.entryRule==="signal"&&(!lane.junctionId||junctions.get(lane.junctionId)?.controlKind!=="signal"))fail(`lane ${edge.id} invents a signal entry rule.`);
        if (!["lane", "turn"].includes(lane.kind) || !Number.isFinite(lane.speedMps) || lane.speedMps <= 0) fail(`lane ${edge.id} has an invalid kind or speed.`);
        for (const [side,id] of [["left",lane.leftLaneId],["right",lane.rightLaneId]] as const) if (id !== null) {
          const neighbour = byId.get(id) as LaneEdge | undefined;
          if (!neighbour || neighbour.kind !== "lane" || neighbour.sourceWayId !== lane.sourceWayId) fail(`lane ${edge.id} has an invalid lateral neighbour ${id}.`);
          if(lane.junctionId||neighbour!.junctionId)fail(`lane ${edge.id} permits a lane change inside a conflict area.`);
          if(neighbour![side==="left"?"rightLaneId":"leftLaneId"]!==lane.id)fail(`lane ${edge.id} has a non-reciprocal ${side} neighbour ${id}.`);
          if(!laneChangeOverlap(lane,neighbour!))fail(`lane ${edge.id} and ${id} have no parallel lane-change overlap of at least 8 m.`);
        }
      } else if (!["sidewalk", "crossing", "connector"].includes((edge as WalkEdge).kind)) fail(`walk ${edge.id} has an invalid kind.`);
    }
  };
  validateEdges(data.lanes, true); validateEdges(data.walks, false);
  const lanes = new Map(data.lanes.map((edge) => [edge.id, edge])), walks = new Map(data.walks.map((edge) => [edge.id, edge]));
  if(!data.physical||![data.physical.crossings,data.physical.tactilePaths,data.physical.trafficControls].every(Array.isArray))fail("physical crossings, tactile paths and mapped traffic controls must be separate arrays.");
  const unique=(ids:unknown[],label:string)=>{if(ids.some(id=>!id)||new Set(ids).size!==ids.length)fail(`${label} has missing or duplicated IDs.`);};
  const sourceId=(id:number,label:string)=>{if(!Number.isSafeInteger(id)||id<=0)fail(`${label} has no valid OSM source ID.`);};
  const physicalPaths=(paths:WorldPoint[][],label:string)=>{if(!Array.isArray(paths)||!paths.length)fail(`${label} has no mapped paths.`);for(const path of paths){if(!Array.isArray(path)||path.length<2)fail(`${label} has an empty path.`);for(const p of path)finitePoint(p,label);if(pathLength(path)<=0)fail(`${label} has zero path length.`);}};
  for(const[key,records]of Object.entries(data.physical))unique(records.map(record=>record.id),`physical ${key}`);
  unique(data.physical.crossings.filter(c=>c.source==="osm").map(c=>c.sourceWayId),"physical crossing source ways");
  unique(data.physical.tactilePaths.map(c=>c.sourceWayId),"tactile source ways");
  unique(data.physical.trafficControls.map(c=>c.sourceNodeId),"physical control source nodes");
  for(const crossing of data.physical.crossings){
    physicalPaths(crossing.paths,`physical crossing ${crossing.id}`);
    if(!["osm","authored"].includes(crossing.source)||!["zebra","none","unknown","other"].includes(crossing.markings)||!["signals","uncontrolled","unknown"].includes(crossing.control)||!["osm","inferred","authored"].includes(crossing.widthSource)||!Number.isFinite(crossing.widthM)||crossing.widthM<=0)fail(`physical crossing ${crossing.id} has invalid marking/control/width provenance.`);
    if(crossing.source==="osm"){sourceId(crossing.sourceWayId!,crossing.id);if(!data.walks.some(w=>w.sourceWayId===crossing.sourceWayId&&w.kind==="crossing"))fail(`physical crossing ${crossing.id} lost its source movement path.`);}else if(crossing.sourceWayId!==null||crossing.widthSource!=="authored")fail(`authored crossing ${crossing.id} claims surveyed source geometry.`);
  }
  for(const tactile of data.physical.tactilePaths){sourceId(tactile.sourceWayId,tactile.id);physicalPaths(tactile.paths,`tactile ${tactile.id}`);if(!["tactile_paving_tag","source_note"].includes(tactile.sourceReason)||!["path","endpoints","unspecified"].includes(tactile.extent)||!data.walks.some(w=>w.sourceWayId===tactile.sourceWayId))fail(`tactile ${tactile.id} lost its extent/source movement path.`);}
  const controls=new Map(data.physical.trafficControls.map(c=>[c.sourceNodeId,c]));
  const predecessors=new Map<string,LaneEdge[]>();for(const lane of data.lanes)for(const id of lane.nextIds){const previous=predecessors.get(id)??[];previous.push(lane);predecessors.set(id,previous);}
  for(const control of controls.values()){
    sourceId(control.sourceNodeId,control.id);finitePoint(control.position,control.id);
    if(!["traffic_signals","stop","give_way"].includes(control.kind)||!["forward","backward","both","unknown"].includes(control.direction)||!control.sourceTags||control.sourceTags.highway!==control.kind)fail(`control ${control.id} lost its mapped kind/direction/tags.`);
    if(control.travelDirection&&(![control.travelDirection.x,control.travelDirection.z].every(Number.isFinite)||Math.abs(Math.hypot(control.travelDirection.x,control.travelDirection.z)-1)>.001))fail(`control ${control.id} has an invalid travel vector.`);
    for(const[key,ids]of [["ways",control.sourceWayIds],["approaches",control.approachEdgeIds],["entries",control.entryEdgeIds]] as const){if(!Array.isArray(ids))fail(`control ${control.id} lost its applicable ${key}.`);unique(ids,`control ${control.id} ${key}`);}
    for(const id of control.sourceWayIds)sourceId(id,control.id);
    if(!control.controllerId||!junctions.has(control.controllerId))fail(`control ${control.id} lost its shared admission owner.`);
    if(control.kind==="traffic_signals"&&junctions.get(control.controllerId!)!.controlKind!=="signal")fail(`mapped signal ${control.id} was assigned reservation-only admission.`);
    for(const id of control.approachEdgeIds)if(!lanes.has(id)||!lanes.get(id)!.sourceControlNodeIds.includes(control.sourceNodeId))fail(`control ${control.id} refers to missing/unrelated approach ${id}.`);
    for(const id of control.entryEdgeIds){const edge=lanes.get(id);if(!edge||edge.junctionId!==control.controllerId||(!(predecessors.get(id)??[]).some(p=>p.junctionId!==control.controllerId)&&!nodes.get(edge.from)!.boundary))fail(`control ${control.id} has no admission boundary at entry ${id}.`);}
  }
  for(const lane of data.lanes)for(const id of lane.sourceControlNodeIds)if(!controls.get(id)?.approachEdgeIds.includes(lane.id))fail(`lane ${lane.id} has an orphaned mapped control node/${id}.`);
  if (!data.portals || !data.diagnostics) fail("portals or build diagnostics are missing.");
  for (const [key, collection, end] of [["vehicleEntry", lanes, "from"], ["vehicleExit", lanes, "to"], ["pedestrian", walks, "from"]] as const) {
    if (!Array.isArray(data.portals[key])) fail(`portal list ${key} is missing.`);
    for (const id of data.portals[key]) { const edge = collection.get(id); if (!edge || !nodes.get(edge[end])!.boundary) fail(`portal ${key}/${id} does not meet the AOI boundary.`); }
  }
}

/** Named current-source requirements. Fixtures cannot stand in for this whole-data check. */
export function validateShibuyaNetwork(data: NetworkData): void {
  validateNetwork(data);
  const fail = (message:string):never => { throw new Error(`Shibuya network: ${message}`); };
  if (data.lanes.length < 500 || data.walks.length < 500) fail(`only ${data.lanes.length} lanes and ${data.walks.length} walks were built; inspect source filtering and AOI clipping.`);
  const controls=data.physical.trafficControls;
  if(controls.filter(c=>c.kind==="traffic_signals").length!==data.diagnostics.surfaceSignalNodes||data.diagnostics.surfaceSignalNodes!==78||controls.filter(c=>c.kind==="stop").length!==41)fail("the pinned extract must retain all 78 surface signal nodes and 41 stop nodes; audit any changed source before updating this coverage gate.");
  if(controls.some(c=>!c.approachEdgeIds.length||!c.entryEdgeIds.length))fail("a mapped control lost its applicable approach or shared-union admission boundary.");
  for(const id of [1335178883,977916824,1335178868])if(data.physical.crossings.find(c=>c.sourceWayId===id)?.markings!=="none")fail(`source crossing way/${id} must retain explicit no-markings metadata.`);
  for(const id of [664532520,1335178880])if(!data.walks.some(w=>w.sourceWayId===id)||data.physical.tactilePaths.find(p=>p.sourceWayId===id)?.extent!=="path")fail(`source tactile way/${id} must retain its movement path and separate source-note extent.`);
  if (data.portals.vehicleEntry.length < 8 || data.portals.vehicleExit.length < 8 || data.portals.pedestrian.length < 8) fail("too few real AOI portals; do not replace boundary demand with interior teleports.");
  if(data.diagnostics.vehicleEdgesReachingExit<data.lanes.length*.8||data.portals.vehicleEntry.length-data.diagnostics.vehicleEntriesWithoutExit.length<50)fail("most lane sections or boundary entries lost routes to an AOI exit.");
  for (const collection of [data.lanes, data.walks]) for (const axis of ["x", "z"] as const) {
    const values = collection.flatMap((edge) => edge.points.map((point) => point[axis]));
    const min = values.reduce((a,b)=>Math.min(a,b), Infinity), max = values.reduce((a,b)=>Math.max(a,b),-Infinity);
    if (min > -440 || max < 440) fail(`${collection === data.lanes ? "vehicle" : "walking"} graph does not reach both sides of the AOI on ${axis}.`);
  }
  const scramble = data.junctions.find((j) => j.id === "scramble");
  if (!scramble || scramble.vehicleGroups.length < 2) fail("scramble has no independent vehicle approaches.");
  for (const sourceId of [664527469, 664527472]) if (data.walks.some((edge)=>edge.sourceWayId===sourceId)) fail(`underground way/${sourceId} was joined to surface node/291758776.`);
  const mapped = data.walks.filter((edge)=>edge.sourceWayId===754454449 && edge.junctionId==="scramble");
  const authored = data.walks.filter((edge)=>edge.id.startsWith("walk:authored:scramble-diagonal:") && edge.junctionId==="scramble");
  if (mapped.length < 2 || authored.length!==2) fail("both directed scramble diagonals must exist and share the scramble controller.");
  const forward = authored.find((edge)=>edge.id.endsWith(":f"))!;
  if (forward.points[0]!.x >= 0 || forward.points[0]!.z <= 0 || forward.points.at(-1)!.x <= 0 || forward.points.at(-1)!.z >= 0) fail("the authored diagonal does not join the SW and NE sidewalk endpoints.");
  for (const edge of data.walks.filter((w)=>w.kind==="crossing")) {
    const j = data.junctions.find((j)=>j.id===edge.junctionId);
    if (!j || edge.points.some((point)=>(j.conflictAreas??[j]).every((area)=>Math.hypot(point.x-area.position.x,point.z-area.position.z)>area.radiusM+0.01))) fail(`crossing ${edge.id} reaches outside its shared conflict envelope.`);
  }
}

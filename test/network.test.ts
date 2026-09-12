/**
 * Bounds: synthetic crossing/one-way/restriction/AOI fixtures and real Shibuya IDs.
 * The offline builder separately runs validateShibuyaNetwork on the entire extract.
 * No fixture claims observed lane placement or pedestrian collision avoidance.
 */
import { describe, expect, it } from "vitest";
import { generateNetwork, mergeOverlappingJunctions } from "../tools/network/generate.ts";
import { indexOsm, laneLayout, surfaceExclusion, type OsmDocument, type OsmElement } from "../tools/network/osm.ts";
import { validateNetwork } from "../src/network/validate.ts";
import { surfaceSampler } from "../tools/network/surface.ts";
import type { MeshData } from "../src/world/mesh.ts";
import type { Junction } from "../src/world/network-data.ts";
import { occupiesJunction } from "../src/network/geometry.ts";

const node=(id:number,lat:number,lon:number,tags?:Record<string,string>):OsmElement=>({type:"node",id,lat,lon,...tags?{tags}:{}});
const way=(id:number,nodes:number[],tags:Record<string,string>):OsmElement=>({type:"way",id,nodes,tags});
const provenance={osmTimestamp:"2026-09-07T03:23:56Z",osmSha256:"a".repeat(64),terrainSha256:"b".repeat(64),roadsSha256:"c".repeat(64),method:"synthetic test"};
const fixture=():OsmDocument=>({osm3s:{timestamp_osm_base:provenance.osmTimestamp},elements:[
  node(1,35.6595,139.694),node(2,35.6595,139.7005,{highway:"crossing"}),node(3,35.6595,139.707),node(4,35.661,139.7005),
  node(5,35.6593,139.7005),node(6,35.6597,139.7005),node(7,35.6593,139.701),node(8,35.6597,139.701),
  way(10,[1,2],{highway:"tertiary",lanes:"2"}),way(11,[2,3],{highway:"tertiary",lanes:"2"}),way(12,[2,4],{highway:"tertiary",lanes:"1",oneway:"yes"}),
  way(20,[5,2,6],{highway:"footway",footway:"crossing",crossing:"traffic_signals"}),way(21,[7,5],{highway:"footway",footway:"sidewalk"}),way(22,[6,8],{highway:"footway",footway:"sidewalk"}),
]});
const build=(doc=fixture())=>generateNetwork(doc,{groundHeight:(x,z)=>15+x*.001+z*.002,provenance,includeScramble:false});

describe("OSM movement graph",()=>{
  it("rejects missing, malformed and unsupported boundary retirement metadata",()=>{
    for(const change of [(d:ReturnType<typeof build>)=>{d.boundary.provenance="unknown" as never;},(d:ReturnType<typeof build>)=>{d.boundary.maxEgressDistanceM=20;},(d:ReturnType<typeof build>)=>{d.boundary.polygon[0]!.x=NaN;},(d:ReturnType<typeof build>)=>{d.boundary.polygon.reverse();}]){const data=build();change(data);expect(()=>validateNetwork(data)).toThrow(/boundary/);}
  });
  it("keeps tagged first occurrences and never joins the real shared subway node to surface",()=>{
    const doc=fixture();doc.elements.push(node(291758776,35.6595,139.7005,{highway:"crossing"}),{type:"node",id:291758776,lat:35.6595,lon:139.7005});
    doc.elements.push(way(664527469,[5,291758776,6],{highway:"footway",layer:"-3",level:"-3",tunnel:"yes"}),way(664527472,[7,291758776,8],{highway:"footway",layer:"-3",level:"-3",tunnel:"yes"}));
    expect(indexOsm(doc).get("node/291758776")!.tags!.highway).toBe("crossing");
    const data=build(doc);expect(data.walks.some(e=>e.sourceWayId===664527469||e.sourceWayId===664527472)).toBe(false);
    expect(data.diagnostics.excludedWays.tunnel).toBe(2);
  });
  it("builds directed left-hand lanes, real AOI portals, continuous turns and separate walk staging",()=>{
    const data=build();validateNetwork(data);
    expect(data.portals.vehicleEntry.length).toBe(2);expect(data.portals.vehicleExit.length).toBe(2);
    const eastbound=data.lanes.find(e=>e.id.startsWith("lane:10:")&&e.id.includes(":f:0")&&e.junctionId===null)!;
    const westbound=data.lanes.find(e=>e.id.startsWith("lane:10:")&&e.id.includes(":r:0")&&e.junctionId===null)!;
    expect(eastbound.points[0]!.z).toBeLessThan(westbound.points.at(-1)!.z);
    expect(data.lanes.filter(e=>e.sourceWayId===12&&e.kind==="lane").every(e=>e.id.includes(":f:"))).toBe(true);
    expect(data.lanes.some(e=>e.kind==="turn")).toBe(true);
    expect(data.walks.filter(e=>e.kind==="sidewalk").every(e=>e.junctionId===null)).toBe(true);
    expect(data.walks.filter(e=>e.kind==="crossing").every(e=>e.signalGroupId)).toBe(true);
    // Stop line is the envelope boundary; a long approach is never conflict occupancy.
    for(const lane of data.lanes.filter(e=>e.junctionId===null))for(const id of lane.nextIds){const next=data.lanes.find(e=>e.id===id)!;if(!next.junctionId)continue;const j=data.junctions.find(j=>j.id===next.junctionId)!;expect(Math.hypot(next.points[0]!.x-j.position.x,next.points[0]!.z-j.position.z)).toBeCloseTo(j.radiusM,3);}
  });
  it("removes prohibited turns and treats unsupported via-way restrictions conservatively",()=>{
    const doc=fixture();doc.elements.push({type:"relation",id:100,tags:{type:"restriction",restriction:"no_left_turn"},members:[{type:"way",ref:10,role:"from"},{type:"node",ref:2,role:"via"},{type:"way",ref:12,role:"to"}]});
    let data=build(doc);expect(data.lanes.some(e=>e.id.startsWith("turn:lane:10:")&&e.id.includes(">lane:12:"))).toBe(false);
    doc.elements.push({type:"relation",id:101,tags:{type:"restriction",restriction:"no_straight_on"},members:[{type:"way",ref:10,role:"from"},{type:"way",ref:11,role:"via"},{type:"way",ref:12,role:"to"}]});
    data=build(doc);expect(data.diagnostics.conservativeRestrictions[0]!.relationId).toBe(101);expect(data.lanes.some(e=>e.id.startsWith("turn:lane:10:")&&e.id.includes(">lane:11:"))).toBe(false);
  });
  it("validates corrupt successors, lengths and provenance rather than rendering smaller success",()=>{
    const data=build();data.lanes[0]!.nextIds=["missing"];expect(()=>validateNetwork(data)).toThrow(/missing successor/);
    const wrong=build();wrong.lanes[0]!.lengthM=NaN;expect(()=>validateNetwork(wrong)).toThrow(/arc length/);
    const source=build();source.provenance.osmSha256="old";expect(()=>validateNetwork(source)).toThrow(/SHA-256/);
    const members=build();members.junctions[0]!.memberIds=[members.junctions[0]!.id,members.junctions[0]!.id];expect(()=>validateNetwork(members)).toThrow(/duplicate compound ownership/);
    const bounds=build();bounds.admissionBounds.maxFootprintDiagonalM=12;expect(()=>validateNetwork(bounds)).toThrow(/engineering envelope/);
  });
  it("rebuilds deterministically and samples slopes at no more than two metres",()=>{
    const a=build(),b=build();expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for(const e of [...a.lanes,...a.walks])for(const p of e.points)expect(p.y).toBeCloseTo(15+p.x*.001+p.z*.002+.22,5);
  });
  it("retains good path pieces and reports the lost length of terrain holes",()=>{
    const data=generateNetwork(fixture(),{groundHeight:(x,z)=>x>15&&x<20&&z>15?undefined:15,provenance,includeScramble:false});
    expect(data.diagnostics.undrapableSegments.length).toBeGreaterThan(0);
    expect(data.diagnostics.undrapableSegments.reduce((sum,e)=>sum+e.lostLengthM,0)).toBeGreaterThan(0);
    expect(data.walks.some(e=>e.sourceWayId===21)).toBe(true);
    validateNetwork(data);
  });
  it("shares overlapping controls without inventing an enclosing conflict area",()=>{
    const make=(id:string,x:number,z:number):Junction=>({id,controlKind:"signal",controlSource:"authored",position:{x,y:15,z},radiusM:10,vehicleGroups:[],pedestrianGroup:`${id}:pedestrian`,clearanceSeconds:2,vehicleGreenSeconds:10,pedestrianGreenSeconds:10});
    const merged=mergeOverlappingJunctions([make("a",0,0),make("b",15,0),make("c",15,30)]);
    expect(merged.junctions).toHaveLength(2);expect(merged.owners.get("a")).toBe(merged.owners.get("b"));expect(merged.owners.get("c")).not.toBe(merged.owners.get("a"));
    const union=merged.junctions[0]!;expect(union.conflictAreas).toHaveLength(2);
    expect(occupiesJunction(union,{x:0,y:15,z:18},0,0)).toBe(false); // Inside display bound, outside both original disks.
    expect(occupiesJunction(union,{x:15,y:15,z:0},0,0)).toBe(true);
  });
  it("controls a mapped surface traffic signal even when its crossing ways are absent",()=>{
    const doc=fixture();doc.elements=doc.elements.filter(e=>e.type!=="way"||e.id<20);
    doc.elements.find(e=>e.type==="node"&&e.id===2)!.tags={highway:"traffic_signals"};
    const data=build(doc);validateNetwork(data);expect(data.diagnostics.surfaceSignalNodes).toBe(1);
    expect(data.junctions[0]!.id).toBe("signal:node:2");expect(data.lanes.some(e=>e.signalGroupId?.startsWith("signal:node:2:"))).toBe(true);
  });
});

describe("lane tag and ground contracts",()=>{
  it("supports observed two/three lane direction tags and explicit oneway variants",()=>{
    expect(laneLayout({lanes:"3","lanes:forward":"2","lanes:backward":"1"})).toMatchObject({forward:2,backward:1,widthM:9});
    expect(laneLayout({lanes:"1",oneway:"-1"})).toMatchObject({forward:0,backward:1});
    expect(laneLayout({lanes:"2",oneway:"no",junction:"roundabout"})).toMatchObject({forward:1,backward:1});
    expect(laneLayout({lanes:"2",oneway:"true"})).toMatchObject({forward:2,backward:0});
    expect(()=>laneLayout({lanes:"1"})).toThrow(/shared narrow-road/);
    expect(()=>laneLayout({lanes:"2","lanes:forward":"2","lanes:backward":"2"})).toThrow(/disagrees/);
    expect(surfaceExclusion({level:"-3"})).toBe("level");
  });
  it("samples actual triangles and leaves absent terrain absent",()=>{
    const mesh:MeshData={header:{version:1,name:"triangle",vertexCount:3,triangleCount:1,bounds:{min:[0,10,0],max:[10,20,10]}},positions:new Float32Array([0,10,0,10,20,0,0,10,10]),normals:new Float32Array(9),indices:new Uint32Array([0,1,2])};
    const sample=surfaceSampler(mesh);expect(sample(2,2)).toBeCloseTo(12);expect(sample(9,9)).toBeUndefined();
  });
});

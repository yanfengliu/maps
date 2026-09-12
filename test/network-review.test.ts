/** Review 0 F0-F3 gates. Bounds: exact promoted OSM ways named by the critic plus synthetic direction/overlap controls. */
import { describe, expect, it } from "vitest";
import { generateNetwork } from "../tools/network/generate.ts";
import { NETWORK_SOURCE_FIXTURE } from "./network-source-fixture.ts";
import type { OsmDocument } from "../tools/network/osm.ts";
import type { NetworkData } from "../src/world/network-data.ts";
import { validateNetwork } from "../src/network/validate.ts";

const provenance={osmTimestamp:"2026-09-07T03:23:56Z",osmSha256:"a".repeat(64),terrainSha256:"b".repeat(64),roadsSha256:"c".repeat(64),method:"Promoted source fixture for independent review findings"};
function sourceWays(ids:number[]):OsmDocument {
  const ways=NETWORK_SOURCE_FIXTURE.elements.filter(e=>e.type==="way"&&ids.includes(e.id));
  const nodes=new Set(ways.flatMap(e=>e.nodes!));
  return {osm3s:NETWORK_SOURCE_FIXTURE.osm3s,elements:[...NETWORK_SOURCE_FIXTURE.elements.filter(e=>e.type==="node"&&nodes.has(e.id)),...ways]};
}
const build=(ids:number[])=>generateNetwork(sourceWays(ids),{groundHeight:()=>15,provenance,includeScramble:false});

describe("review 0 network source counterexamples",()=>{
  it.each([[1071659161,"f",0,[0,1]],[1087233628,"f",0,[2,3]],[1377702569,"r",1,[0]]] as const)("F0 keeps turn-only way %i internal %s continuation",(way,direction,segment,lanes)=>{
    const data=build(way===1377702569?[way,41522094]:[way]);
    for(const lane of lanes){
      const candidates=data.lanes.filter(e=>e.kind==="lane"&&e.id.startsWith(`lane:${way}:${segment}:`)&&e.id.includes(`:${direction}:${lane}`));
      const final=candidates.find(e=>!e.nextIds.some(id=>candidates.some(c=>c.id===id)))!;
      expect(final,`way${way} lane${lane} exists`).toBeDefined();
      expect(final.nextIds.length,`way${way} lane${lane} may continue internally despite turn-only destination`).toBeGreaterThan(0);
    }
  });
  it("F1 forbids conflict lateral links and restores long parallel approach links",()=>{
    const data=build([1087233628,1298036687]);
    expect(data.lanes.filter(e=>e.junctionId&&(e.leftLaneId||e.rightLaneId))).toEqual([]);
    const long=data.lanes.filter(e=>e.kind==="lane"&&e.sourceWayId===1087233628&&!e.junctionId&&e.lengthM>70);
    expect(long.length).toBeGreaterThanOrEqual(4);
    expect(long.every(e=>e.leftLaneId||e.rightLaneId)).toBe(true);
    const byId=new Map(data.lanes.map(e=>[e.id,e]));
    for(const edge of long)for(const[side,id]of[["left",edge.leftLaneId],["right",edge.rightLaneId]] as const)if(id){const neighbour=byId.get(id)!;expect(neighbour[side==="left"?"rightLaneId":"leftLaneId"]).toBe(edge.id);const a=edge.points.at(-1)!,b=edge.points[0]!,c=neighbour.points.at(-1)!,d=neighbour.points[0]!;expect((a.x-b.x)*(c.x-d.x)+(a.z-b.z)*(c.z-d.z)).toBeGreaterThan(0);}
  });
  it("F0 preserves the real reverse cross-way continuation from 1377702569 into 1134321670",()=>{
    const data=build([1377702569,41522094,1134321670]);
    expect(data.lanes.some(e=>e.id.startsWith("turn:lane:1377702569:")&&e.id.includes(">lane:1134321670:"))||data.lanes.some(e=>e.sourceWayId===1377702569&&e.nextIds.some(id=>id.startsWith("lane:1134321670:")))).toBe(true);
  });
  it("F0 carries turn permission through a degree-two way split and enforces it at the actual branch",()=>{
    const n=(id:number,lat:number,lon:number)=>({type:"node" as const,id,lat,lon});
    const w=(id:number,nodes:number[],tags:Record<string,string>={})=>({type:"way" as const,id,nodes,tags:{highway:"tertiary",oneway:"yes",lanes:"1",...tags}});
    const doc:OsmDocument={osm3s:NETWORK_SOURCE_FIXTURE.osm3s,elements:[n(1,35.6595,139.6995),n(2,35.6595,139.7),n(3,35.6595,139.7005),n(4,35.6595,139.701),n(5,35.659,139.7005),w(10,[1,2],{"turn:lanes":"right"}),w(11,[2,3]),w(12,[3,4]),w(13,[3,5])]};
    const data=generateNetwork(doc,{groundHeight:()=>15,provenance,includeScramble:false});
    expect(data.junctions.some(j=>j.controlKind==="reservation"&&j.controlSource==="inferred")).toBe(true);
    expect(data.lanes.some(e=>e.id.startsWith("turn:lane:10:")&&e.id.includes(">lane:11:"))||data.lanes.some(e=>e.sourceWayId===10&&e.nextIds.some(id=>id.startsWith("lane:11:")))).toBe(true);
    expect(data.lanes.some(e=>e.id.startsWith("turn:lane:11:")&&e.id.includes(">lane:13:"))||data.lanes.some(e=>e.sourceWayId===11&&e.nextIds.some(id=>id.startsWith("lane:13:")))).toBe(true);
    expect(data.lanes.some(e=>e.id.startsWith("turn:lane:11:")&&e.id.includes(">lane:12:"))||data.lanes.some(e=>e.sourceWayId===11&&e.nextIds.some(id=>id.startsWith("lane:12:")))).toBe(false);
  });
  it("F2 preserves physical no-markings and tactile provenance without deleting movement routes",()=>{
    const data=build([1335178883,977916824,1335178868,664532520,1335178880]);
    const physical=(data as NetworkData & {physical?:{crossings:{sourceWayId:number;markings:string}[];tactilePaths:{sourceWayId:number}[]}}).physical;
    expect(physical).toBeDefined();
    for(const id of [1335178883,977916824,1335178868])expect(physical!.crossings.find(c=>c.sourceWayId===id)?.markings).toBe("none");
    for(const id of [664532520,1335178880]){expect(physical!.tactilePaths.some(p=>p.sourceWayId===id)).toBe(true);expect(data.walks.some(w=>w.sourceWayId===id)).toBe(true);}
    expect(data.physical.crossings).toHaveLength(3);
    expect(data.physical.tactilePaths.filter(p=>[664532520,1335178880].includes(p.sourceWayId)).map(p=>p.extent)).toEqual(["path","path"]);
    expect(data.physical.crossings.every(c=>c.markings==="none")).toBe(true);
    validateNetwork(data);
  });
  it("F3 retains mapped stop nodes and gives conflicting unsignalized movement shared admission",()=>{
    const data=build([30012066,138594011]);
    const physical=(data as NetworkData & {physical?:{trafficControls:{sourceNodeId:number;kind:string;controllerId:string|null}[]}}).physical;
    expect(physical).toBeDefined();
    for(const id of [1496233582,5133172807]){
      const control=data.physical.trafficControls.find(c=>c.sourceNodeId===id)!;
      expect(control).toMatchObject({kind:"stop",direction:"forward"});expect(control.travelDirection).not.toBeNull();
      expect(control.approachEdgeIds.length).toBeGreaterThan(0);expect(control.entryEdgeIds.length).toBeGreaterThan(0);
      for(const entry of control.entryEdgeIds)expect(data.lanes.find(e=>e.id===entry)).toMatchObject({entryRule:"stop",signalGroupId:null,junctionId:control.controllerId});
      expect(data.junctions.find(j=>j.id===control.controllerId)).toMatchObject({controlKind:"reservation",controlSource:"mapped",vehicleGroups:[]});
    }
    validateNetwork(data);
  });
  it("pins the one excluded boundary demand to a real interior dead end and the explicit no-U-turn policy",()=>{
    const data=build([138385061]);expect(data.portals.vehicleEntry).toHaveLength(1);expect(data.portals.vehicleExit).toHaveLength(1);
    expect(data.diagnostics.vehicleEntriesWithoutExit).toEqual(data.portals.vehicleEntry);
    const way=NETWORK_SOURCE_FIXTURE.elements.find(e=>e.type==="way"&&e.id===138385061)!;
    expect(way.nodes?.at(-1)).toBe(1517396357);
    expect(data.lanes.filter(e=>e.id.includes(":f:0")).at(-1)!.nextIds).toEqual([]);
  });
  it("rejects physical metadata duplication, invented signal authority and orphaned source controls",()=>{
    const duplicate=build([1335178883]);duplicate.physical.crossings.push({...duplicate.physical.crossings[0]!});expect(()=>validateNetwork(duplicate)).toThrow(/duplicated/);
    const authority=build([30012066]);authority.junctions[0]!.vehicleGroups=["fake"];expect(()=>validateNetwork(authority)).toThrow(/invents signal/);
    const control=build([30012066]);control.physical.trafficControls[0]!.entryEdgeIds=["missing"];expect(()=>validateNetwork(control)).toThrow(/admission boundary/);
  });
});

/** Bounds: two named source vintages and the literal bridge-to-surface endpoint.
 * Synthetic flat support proves applicability/consumer semantics, not placement. */
import { describe, expect, it } from "vitest";
import { validateNetwork, validateShibuyaSourceControls } from "../src/network/validate.ts";
import { generateNetwork } from "../tools/network/generate.ts";
import type { NetworkData, PhysicalTrafficControl } from "../src/world/network-data.ts";
import { BRIDGE_STOP_SOURCE, REVIEWED_SIGNAL_IDS, REVIEWED_STOP_IDS } from "./shibuya-source-fixture.ts";
import { placeControlHardware } from "../tools/scene/control-hardware.ts";
import { validateControlHardware, type ControlHardwareData } from "../src/world/control-hardware.ts";
import type { VehicleAsset } from "../src/world/agent-assets.ts";
import { createRoutePassage } from "../src/network/passages.ts";
const oldHash="9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671",freshHash="162fbdec3baa5ed5c07eed33fa8ae20568dbd74d8f1f36a3490dccfbbd2d32b0";
function coverage(fresh:boolean):NetworkData {
  const controls:PhysicalTrafficControl[]=[...REVIEWED_SIGNAL_IDS.map(sourceNodeId=>({sourceNodeId,kind:"traffic_signals" as const})),...REVIEWED_STOP_IDS.map(sourceNodeId=>({sourceNodeId,kind:"stop" as const}))].map(c=>({...c,id:`osm:node:${c.sourceNodeId}:${c.kind}`,position:{x:0,y:15,z:0},direction:"forward",travelDirection:{x:0,z:1},sourceTags:{highway:c.kind},sourceWayIds:[1],approachEdgeIds:["approach"],entryEdgeIds:["entry"],controllerId:"owner"}));
  for(const [id,x,z] of (fresh?[[252683741,146.03168477095642,-446.12311132013565],[3790205548,154.83138527512347,-445.8007276650387]]:[[252683741,145.7555541692691,-456.29685896807496],[3790205548,154.72727792212754,-455.9853396521212]]))controls.find(c=>c.sourceNodeId===id)!.position={x:x!,y:15,z:z!};
  if(fresh)controls.push({id:"osm:node:728435717:stop",sourceNodeId:728435717,kind:"stop",direction:"forward",position:{x:226.59930697600066,y:15,z:196.13809874963044},travelDirection:null,sourceTags:{direction:"forward",highway:"stop"},sourceWayIds:[58777418],controllerId:"junction:walk:1569138624:0:0:ground0",approachEdgeIds:[],entryEdgeIds:[]});
  return {provenance:{osmSha256:fresh?freshHash:oldHash,osmTimestamp:fresh?"2026-10-18T13:27:51Z":"2026-09-07T03:23:56Z"},physical:{trafficControls:controls},diagnostics:{surfaceSignalNodes:78},lanes:[]} as unknown as NetworkData;
}
const build=(source=structuredClone(BRIDGE_STOP_SOURCE))=>generateNetwork(source,{groundHeight:()=>15,includeScramble:false,provenance:{osmTimestamp:"2026-10-18T13:27:51Z",osmSha256:freshHash,terrainSha256:"b".repeat(64),roadsSha256:"c".repeat(64),method:"Literal source endpoint on synthetic flat support"}});
describe("named Shibuya source succession",()=>{
  it.each([false,true])("retains exact old and fresh coverage (fresh=%s)",fresh=>expect(()=>validateShibuyaSourceControls(coverage(fresh))).not.toThrow());
  it.each([false,true])("rejects equal-count substitution, retyping and duplicate/omission (fresh=%s)",fresh=>{
    for(const mutate of [(n:NetworkData)=>{n.physical.trafficControls[0]!.sourceNodeId=999;n.physical.trafficControls[0]!.id="osm:node:999:traffic_signals";},(n:NetworkData)=>{n.physical.trafficControls[0]!.kind="stop";},(n:NetworkData)=>{n.physical.trafficControls[0]=structuredClone(n.physical.trafficControls[1]!);}]){const n=coverage(fresh);mutate(n);expect(()=>validateShibuyaSourceControls(n)).toThrow(/identity.kind coverage/);}
  });
  it("refuses unknown hash, wrong timestamp and either moved signal",()=>{
    const unknown=coverage(true);unknown.provenance.osmSha256="d".repeat(64);expect(()=>validateShibuyaSourceControls(unknown)).toThrow(/not a reviewed/);
    const stamp=coverage(true);stamp.provenance.osmTimestamp="2026-09-07T03:23:56Z";expect(()=>validateShibuyaSourceControls(stamp)).toThrow(/timestamp/);
    for(const id of [252683741,3790205548]){const n=coverage(true);n.physical.trafficControls.find(c=>c.sourceNodeId===id)!.position.z+=1;expect(()=>validateShibuyaSourceControls(n)).toThrow(/reviewed X.Z position/);}
  });
  it("allows no second empty control and keeps the sole exception exact",()=>{
    const n=coverage(true);n.physical.trafficControls[0]!.approachEdgeIds=[];expect(()=>validateShibuyaSourceControls(n)).toThrow(/lost its applicable approach/);
    for(const mutate of [(c:PhysicalTrafficControl)=>{c.approachEdgeIds=["outgoing"];},(c:PhysicalTrafficControl)=>{c.travelDirection={x:0,z:1};},(c:PhysicalTrafficControl)=>{c.sourceTags.direction="backward";},(c:PhysicalTrafficControl)=>{c.sourceWayIds.push(58777433);},(c:PhysicalTrafficControl)=>{c.position.x+=1;},(c:PhysicalTrafficControl)=>{c.controllerId="fake";}]){const data=coverage(true);mutate(data.physical.trafficControls.at(-1)!);expect(()=>validateShibuyaSourceControls(data)).toThrow(/728435717 must retain/);}
    for(const lane of [{sourceWayId:58777433,sourceControlNodeIds:[]},{sourceWayId:58777418,sourceControlNodeIds:[728435717]}]){const data=coverage(true);data.lanes=[lane] as NetworkData["lanes"];expect(()=>validateShibuyaSourceControls(data)).toThrow(/excluded bridge.*false outgoing/);}
  });
});
describe("literal stop728435717 applicability",()=>{
  it("preserves the source node and excludes incoming bridge/outgoing surface obligations",()=>{
    const n=build();validateNetwork(n);const c=n.physical.trafficControls.find(c=>c.sourceNodeId===728435717)!;
    expect(c).toMatchObject({id:"osm:node:728435717:stop",sourceWayIds:[58777418],direction:"forward",sourceTags:{direction:"forward",highway:"stop"},position:{x:226.59930697600066,y:15.22,z:196.13809874963044},approachEdgeIds:[],entryEdgeIds:[],travelDirection:null});
    expect(n.lanes.every(l=>l.sourceWayId!==58777433&&!l.sourceControlNodeIds.includes(728435717))).toBe(true);
    const first=n.lanes.find(l=>l.junctionId)!;const route=[first.id];let edge=first;while(edge.nextIds[0]){edge=n.lanes.find(l=>l.id===edge.nextIds[0])!;route.push(edge.id);}
    expect(createRoutePassage(n,"vehicle",route,0).controls).toEqual([]);
  });
  it("attaches a real forward incoming surface approach, retaining the ordinary stop obligation",()=>{
    const source=structuredClone(BRIDGE_STOP_SOURCE);const bridge=source.elements.find(e=>e.type==="way"&&e.id===58777433)!;bridge.tags={highway:"unclassified",oneway:"yes",surface:"paved"};
    const n=build(source),c=n.physical.trafficControls[0]!;expect(c.approachEdgeIds.length).toBeGreaterThan(0);expect(c.travelDirection).not.toBeNull();expect(n.lanes.some(l=>l.sourceWayId===58777433&&l.sourceControlNodeIds.includes(728435717)&&l.entryRule==="stop")).toBe(true);
  });
  it("honors backward control direction on a reverse one-way surface",()=>{
    const source=structuredClone(BRIDGE_STOP_SOURCE);source.elements.find(e=>e.type==="node"&&e.id===728435717)!.tags={highway:"stop",direction:"backward"};source.elements.find(e=>e.type==="way"&&e.id===58777418)!.tags={highway:"unclassified",oneway:"-1"};
    const n=build(source),c=n.physical.trafficControls[0]!;expect(c.approachEdgeIds.length).toBeGreaterThan(0);expect(c.travelDirection).not.toBeNull();expect(n.lanes.some(l=>l.sourceWayId===58777418&&l.sourceControlNodeIds.includes(728435717))).toBe(true);
  });

  it("retains one explicit unplaced hardware record and refuses missing/duplicate accounting",()=>{
    const network=build();
    const vehicle:VehicleAsset={id:"bus",length:10.5,width:2.5,height:3.3,wheelRadius:.45,model:"fixture.glb",sha256:"fixture",bytes:1,vertexCount:8,wheelObjects:["front-right","front-left","rear-right","rear-left"],bounds:{min:[-1.64,0,-5.2775],max:[1.64,3.3245,5.2825]},collision:{width:3.28,length:10.565},axles:{frontZ:3.276,rearZ:-2.86,trackMetres:2.4}};
    const records=placeControlHardware(network,[vehicle,{...vehicle,id:"kei"},{...vehicle,id:"taxi"}],()=>undefined,()=>undefined);
    expect(records).toHaveLength(1);expect(records[0]).toMatchObject({sourceId:"osm:node:728435717:stop",sourceNodeId:728435717,status:"unplaced",reason:"No source-associated travel direction for authored hardware orientation.",base:null,head:null,direction:null});
    const inputs={network:"a".repeat(64),networkCanonical:"b".repeat(64),roads:"c".repeat(64),pavements:"d".repeat(64),vehicles:"e".repeat(64)};
    const data:ControlHardwareData={version:1,method:"Synthetic hardware accounting",bounds:{vehicleScale:1,routeStepM:.5,clearanceM:.6,searchRadiusM:18},inputs,records};
    expect(()=>validateControlHardware(data,network,inputs)).not.toThrow();
    expect(()=>validateControlHardware({...data,records:[]},network,inputs)).toThrow(/accounts for 0 of 1/);
    expect(()=>validateControlHardware({...data,records:[...records,...records]},network,inputs)).toThrow(/duplicate source control/);
  });
});

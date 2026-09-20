/** Finite supplied triangles only: normal contact, interior clearance and persistent drift.
 * Actual selected commuter-male binding is exercised by the separately frozen source run.
 */
import { describe, expect, it } from "vitest";
import { commitPlant, observeShoe } from "../tools/contact/finite-shoe-contact.js";
import type { Binding, Point, ShoePose, ShoeReference, SurfaceTriangle } from "../tools/contact/finite-shoe-contact.js";
const binding:Binding={variant:"analytic-control",lod:"near",modelSha256:"fixture",referenceSha256:"fixture",weightsSha256:"fixture",membershipSha256:"fixture",scale:1};
function fixture(points:Point[]) {
  const ref:ShoeReference={binding,triangles:[{id:"shoe",ids:[0,1,2]}],soleTriangleIds:["shoe"],sampleIds:[0,1,2]};
  const pose:ShoePose={binding,points:new Map(points.map((p,i)=>[i,p])),loadPoint:[0,0,0],packingErrorM:1e-8};
  return {ref,pose};
}
const surface=(id:string,points:SurfaceTriangle["points"]):SurfaceTriangle=>({id,meshSha256:"ground",role:"surface",points});
const flat=surface("flat",[[-2,0,-2],[2,0,-2],[0,0,2]]);
const select=(s:SurfaceTriangle[])=>({meshSha256:"ground",triangleIds:s.map(t=>t.id)});
describe("finite shoe observer",()=>{
  it("uses strict normal residual and reports vertical residual separately on a slope",()=>{
    const s=surface("slope",[[-2,-2,-2],[2,2,-2],[0,0,2]]);
    const {ref,pose}=fixture([[-.1,-.08,-.1],[.1,.12,-.1],[0,.02,.1]]);
    const r=observeShoe(ref,pose,select([s]),[s],[]);
    expect(r.contactVerdict).toBe("pass");
    expect(r.patches[0]!.vertices[0]!.normalM).toBeCloseTo(.02/Math.sqrt(2),12);
    expect(r.patches[0]!.vertices[0]!.verticalM).toBeCloseTo(.02,12);
  });
  it("does not use a nearby triangle when normal projection is outside it",()=>{
    const s=surface("tiny-slope",[[0,0,0],[.001,.001,0],[0,0,.001]]);
    const {ref,pose}=fixture([[0,.02,0],[.001,.021,0],[0,.02,.001]]);
    expect(observeShoe(ref,pose,select([s]),[s],[]).contactVerdict).toBe("fail");
  });
  it("detects penetration of a shoe interior whose original vertices miss the obstacle",()=>{
    const {ref,pose}=fixture([[-1,.001,-1],[1,.001,-1],[0,.001,1]]);
    const obstacle=surface("interior",[[-.01,.01,-.01],[.01,.01,-.01],[0,.01,.01]]);
    const r=observeShoe(ref,pose,select([flat]),[flat],[obstacle]);
    expect(r.clearanceVerdict).toBe("fail");
    expect(r.clearance.find(c=>c.surfaceTriangleId==="interior")!.minimumVerticalM).toBeCloseTo(-.009,12);
  });
  it("checks vertical projected shoe faces rather than dropping them",()=>{
    const {ref,pose}=fixture([[0,-.01,-.1],[0,.02,-.1],[0,.02,.1]]);
    const r=observeShoe(ref,pose,select([flat]),[flat],[]);
    expect(r.clearanceVerdict).toBe("fail");
    expect(r.clearance[0]!.degenerateShoeProjection).toBe(true);
  });
  it("reports a contact-sign ambiguity as uncertain, not clean",()=>{
    const {ref,pose}=fixture([[-.1,0,-.1],[.1,0,-.1],[0,0,.1]]);
    expect(observeShoe(ref,pose,select([flat]),[flat],[]).clearanceVerdict).toBe("uncertain");
  });
  it("keeps the original baseline across triangle changes and refuses changed samples",()=>{
    const {ref,pose}=fixture([[-.1,.001,-.1],[.1,.001,-.1],[0,.001,.1]]),plant=commitPlant(ref,pose);
    const moved={...pose,points:new Map([...pose.points].map(([id,p])=>[id,[p[0]+.006,p[1],p[2]] as Point]))},other={...flat,id:"other"};
    const r=observeShoe(ref,moved,select([other]),[other],[],plant);
    expect(r.drift!.verdict).toBe("fail");expect(r.drift!.maximumM).toBeCloseTo(.006,12);
    expect(()=>observeShoe({...ref,sampleIds:[0,1]},moved,select([other]),[other],[],plant)).toThrow("plant sample membership changed");
    expect(Object.isFrozen(plant.samples[0]!.point)).toBe(true);
  });
  it("keeps area at the measurement boundary unresolved",()=>{
    const {ref,pose}=fixture([[-1e-10,.001,0],[1e-10,.001,0],[0,.001,1e-10]]);
    expect(observeShoe(ref,pose,select([flat]),[flat],[]).contactVerdict).toBe("uncertain");
  });
  it("does not silently accept vertical support outside its height-field bound",()=>{
    const {ref,pose}=fixture([[-.1,.001,-.1],[.1,.001,-.1],[0,.001,.1]]),vertical=surface("wall",[[0,-1,-1],[0,1,-1],[0,1,1]]);
    const r=observeShoe(ref,pose,select([flat]),[flat],[vertical]);
    expect(r.clearanceVerdict).toBe("uncertain");expect(r.unresolved).toHaveLength(1);
  });
});

// F34: the contact-band intersection can move much farther than the input error
// when shoe and support planes are nearly parallel. These finite analytic cases
// gate both review reproductions, not actual city poses or continuous motion.
function rectangle(height:(x:number)=>number,width=1,halfDepth=1) {
  const points:Point[]=[[0,height(0),-halfDepth],[width,height(width),-halfDepth],[width,height(width),halfDepth],[0,height(0),halfDepth]];
  const ref:ShoeReference={binding,triangles:[{id:"a",ids:[0,1,2]},{id:"b",ids:[0,2,3]}],soleTriangleIds:["a","b"],sampleIds:[0,1,2,3]};
  const pose:ShoePose={binding,points:new Map(points.map((p,i)=>[i,p])),loadPoint:[.3,0,0],packingErrorM:5e-8};
  const supports=[surface("s0",[[-2,0,-2],[2,0,-2],[2,0,2]]),surface("s1",[[-2,0,-2],[2,0,2],[-2,0,2]])];
  const run=(p=pose)=>observeShoe(ref,p,select(supports),supports,[]);
  return {ref,pose,supports,run};
}
describe("F34 uncertainty in contact geometry",()=>{
  it("does not certify a nominal band boundary that an admissible displacement removes",()=>{
    const {pose,run}=rectangle(x=>.0149998+.0000006*x);
    expect(run().hullVerdict).toBe("uncertain");
    const displaced={...pose,packingErrorM:0,points:new Map([...pose.points].map(([id,p])=>[id,[p[0],p[1]+5e-8,p[2]] as Point]))};
    expect(run(displaced).hullVerdict).toBe("fail");
    expect(run({...pose,loadPoint:[.2,0,0]}).verdict).toBe("pass");
    expect(run({...pose,loadPoint:[.4,0,0]}).hullVerdict).toBe("uncertain");
    expect(run({...pose,loadPoint:[.45,0,0]}).hullVerdict).toBe("fail");
  });
  it("does not certify support lost by the measured Float32 round trip",()=>{
    const {pose,run}=rectangle(x=>x===0?.0149999985:.015000003,.125,.0625);
    const packed=new Map([...pose.points].map(([id,p])=>[id,p.map(Math.fround) as unknown as Point]));
    const error=Math.max(...[...pose.points].map(([id,p])=>Math.hypot(...p.map((v,k)=>v-packed.get(id)![k]!))));
    expect(error).toBe(3.900141719997974e-10);
    const nominal={...pose,loadPoint:[.0375,0,0] as Point,packingErrorM:error};
    expect(run(nominal).hullVerdict).toBe("uncertain");
    expect(run({...nominal,points:packed,packingErrorM:0}).hullVerdict).toBe("fail");
    expect(run({...nominal,loadPoint:[.02,0,0]}).verdict).toBe("pass");
    expect(run({...nominal,loadPoint:[.06,0,0]}).hullVerdict).toBe("fail");
  });
  it("keeps possible contact uncertain when the inner contact set is empty",()=>{
    const {pose,run}=rectangle(()=>.014999975);
    expect(run().contactVerdict).toBe("uncertain");
    expect(run().hullVerdict).toBe("uncertain");
    expect(run({...pose,points:new Map([...pose.points].map(([id,p])=>[id,[p[0],.0150001,p[2]] as Point]))}).contactVerdict).toBe("fail");
  });
  it("propagates the lower normal-band boundary as well as the upper one",()=>{
    const {run}=rectangle(x=>-(.0149998+.0000006*x));
    expect(run().contactVerdict).toBe("pass");
    expect(run().hullVerdict).toBe("uncertain");
    expect(run().clearanceVerdict).toBe("fail");
  });
  it("keeps possible support at a displaced edge even when nominal overlap is absent",()=>{
    const {ref,pose}=fixture([[-4e-8,.001,-.1],[-2e-8,.001,-.1],[-3e-8,.001,.1]]);
    const s=surface("right-bank",[[0,0,-1],[1,0,-1],[0,0,1]]);
    const p={...pose,packingErrorM:5e-8,loadPoint:[0,0,0] as Point};
    const r=observeShoe(ref,p,select([s]),[s],[]);
    expect(r.contactVerdict).toBe("uncertain");
    expect(r.hullVerdict).toBe("uncertain");
    const bank=observeShoe(ref,p,{...select([s]),requiredBanks:[[s.id]]},[s],[]);
    expect(bank.banks[0]!.verdict).toBe("uncertain");
    expect(observeShoe(ref,{...p,loadPoint:[-.001,0,0]},select([s]),[s],[]).hullVerdict).toBe("fail");
  });
  it("retains point and line outer hulls as uncertain rather than absent",()=>{
    for(const points of [
      [[0,.001,0],[0,.001,0],[0,.001,0]],
      [[0,.001,-.1],[0,.001,0],[0,.001,.1]],
    ] as Point[][]){
      const {ref,pose}=fixture(points);
      const r=observeShoe(ref,pose,select([flat]),[flat],[]);
      expect(r.contactVerdict).toBe("uncertain");
      expect(r.hullVerdict).toBe("uncertain");
      expect(observeShoe(ref,{...pose,loadPoint:[.001,0,0]},select([flat]),[flat],[]).hullVerdict).toBe("fail");
    }
  });
  it("keeps the exact contact threshold unresolved without changing its physical value",()=>{
    expect(rectangle(()=>.015).run().contactVerdict).toBe("uncertain");
    expect(rectangle(()=>.014).run().verdict).toBe("pass");
    expect(rectangle(()=>.016).run().contactVerdict).toBe("fail");
  });
});

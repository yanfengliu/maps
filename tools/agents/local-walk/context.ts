import {loadOwnedHero,weights,height} from "./grounding.ts";
import {sampleRoute} from "../../../src/agents/population/routes.ts";
import {createRetainedRoute} from "./route.ts";
export function createContext(project:string,profile="historical") {
const hero=loadOwnedHero(project,profile),{network,route,scale}=createRetainedRoute(project);
const edges=route.edges;
const discrepancySamples:any[]=[];
function floorAt(x:number,z:number){const floors=hero.nearby([[x-.6,z-.6],[x+.6,z-.6],[x+.6,z+.6],[x-.6,z+.6]]),hits=floors.filter((t:any)=>Math.min(...weights(t,{x,z}))>=-1e-10);let selected=hits,seam=false;
 if(!hits.length){const distance=(t:any)=>Math.min(...[0,1,2].map(k=>{const a=t.vertices[k],b=t.vertices[(k+1)%3],dx=b.x-a.x,dz=b.z-a.z,q=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a.x-q*dx,z-a.z-q*dz)}));const near=floors.map((t:any)=>({t,d:distance(t)})).filter((r:any)=>r.d<=.000005).sort((a:any,b:any)=>a.d-b.d);if(near.length<2)throw Error("Local foot patch unavailable at "+JSON.stringify({x,z,nearest:near.map((a:any)=>a.d)}));selected=near.slice(0,2).map((r:any)=>r.t);seam=true;discrepancySamples.push({x,z,triangles:selected.map((t:any)=>t.index),distanceM:near.slice(0,2).map((r:any)=>r.d)});}
 const ys=selected.map((t:any)=>height(t,{x,z}));if(Math.max(...ys)-Math.min(...ys)>.00001)throw Error("Competing real local foot-patch heights");return{y:ys.reduce((s:number,y:number)=>s+y,0)/ys.length,patch:{id:"hero:"+selected.map((t:any)=>t.index).sort().join(","),triangles:selected.map((t:any)=>t.index),rootHeightLaw:seam?"two actual bounding patches; root is over numeric seam":"actual retained pavement",seam}};
}
const sourcePoint=(occurrence:number,localM:number)=>{const p=sampleRoute(route,occurrence,localM),floor=floorAt(p.x,p.z);return{...p,y:floor.y,patch:floor.patch}};
const origin=sourcePoint(0,0),L=edges[0]!.lengthM;
const legs=[{from:sourcePoint(0,0),to:sourcePoint(0,L),sourceFrom:0,sourceTo:L,occurrence:0,edgeId:edges[0]!.id},{from:sourcePoint(0,L),to:sourcePoint(1,0),sourceFrom:L,sourceTo:L,occurrence:1,edgeId:edges[1]!.id},{from:sourcePoint(1,0),to:sourcePoint(1,L),sourceFrom:L,sourceTo:2*L,occurrence:1,edgeId:edges[1]!.id},{from:sourcePoint(1,L),to:sourcePoint(2,0),sourceFrom:2*L,sourceTo:2*L,occurrence:2,edgeId:edges[2]!.id}].map(leg=>({...leg,length:Math.hypot(leg.to.x-leg.from.x,leg.to.z-leg.from.z),heading:Math.atan2(leg.to.x-leg.from.x,leg.to.z-leg.from.z)}));
function normalizedFloor(x:number,z:number){const f=floorAt(origin.x+x*scale,origin.z+z*scale);return{y:(f.y-origin.y)/scale,patch:f.patch}};

return {hero,network,route,scale,origin,legs,floorAt,normalizedFloor};
}

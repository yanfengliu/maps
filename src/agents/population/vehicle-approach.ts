/** A vehicle's first approach to a whole authority union on its unchanged source
 * route. The enclosing sphere is sufficient clearance, not a swept exact hull.
 * No backward clear-point search, topology edit or mapped-control relocation. */
import type {NetworkData,WorldPoint} from '../../world/network-data.ts';
import type {HaltRoute,ApproachHalt,VehicleFinalRelease} from '../../network/halts.ts';
import {passageCovers} from '../../network/halts.ts';
import type {RoutePassage} from '../../network/passages.ts';

/** First point where a directed source segment reaches a closed expanded disk. */
function firstContact(a:WorldPoint,b:WorldPoint,centre:WorldPoint,radius:number):number|null {
  const x=a.x-centre.x,z=a.z-centre.z,dx=b.x-a.x,dz=b.z-a.z;
  const c=x*x+z*z-radius*radius;
  if(c<=0)return 0;
  const aa=dx*dx+dz*dz;if(aa===0)return null;
  const bb=2*(x*dx+z*dz),discriminant=bb*bb-4*aa*c;
  if(discriminant<0)return null;
  const t=(-bb-Math.sqrt(discriminant))/(2*aa);
  return t>=0&&t<=1?t:null;
}

export function vehicleApproachHalts(network:Pick<NetworkData,'junctions'|'admissionBounds'>,route:HaltRoute,
  originRadiusM:number,authorityRadiusM:number,boundaryEntry?:RoutePassage|null):{halts:readonly ApproachHalt[];reason?:string} {
  if(!Number.isFinite(originRadiusM)||originRadiusM<=0||!Number.isFinite(authorityRadiusM)||authorityRadiusM<=0)throw new Error('Vehicle approach clearance needs its actual finite positive body and authority radii.');
  const halts:ApproachHalt[]=[];
  let previous:RoutePassage|undefined;
  let previousApproachM=0;
  for(const passage of route.passages){
    if(boundaryEntry&&passageCovers(boundaryEntry,passage)){previous=passage;continue;}
    const owner=network.junctions.find(j=>j.id===passage.junctionId);
    if(!owner)return{halts:[],reason:`Vehicle approach ${passage.junctionId} has no source authority.`};
    const entryDistanceM=route.starts[passage.entryIndex]!,nominal=entryDistanceM-authorityRadiusM;
    const startIndex=previous?previous.lastConflictIndex+1:0;
    if(startIndex>passage.entryIndex||nominal<route.starts[startIndex]! -1e-9)return{halts:[],reason:`Vehicle approach to ${owner.id} at occurrence ${passage.entryIndex} has no halt after its previous visit; keep the complete route refused.`};
    let firstM:number|null=null;
    // A distinct next owner may already overlap the prior held visit.
    // Reject that first contact; cutting the scan at the section end would hide it.
    const scanStartM=previous&&previous.junctionId!==passage.junctionId?previousApproachM:route.starts[startIndex]!;
    for(let i=0;i<passage.entryIndex;i++){
      const edge=route.edges[i]!;if(route.starts[i]!+edge.lengthM<scanStartM)continue;let local=0;
      for(let p=1;p<edge.points.length;p++){
        const sourceA=edge.points[p-1]!,b=edge.points[p]!,length=Math.hypot(b.x-sourceA.x,b.y-sourceA.y,b.z-sourceA.z);
        const segmentStart=route.starts[i]!+local,cut=Math.max(0,scanStartM-segmentStart);
        if(cut>length){local+=length;continue;}
        const fraction=length>0?cut/length:0;
        const a={x:sourceA.x+(b.x-sourceA.x)*fraction,y:sourceA.y+(b.y-sourceA.y)*fraction,z:sourceA.z+(b.z-sourceA.z)*fraction};
        // Four float32 units bound published X/Z origin and body rounding here.
        const rounding=(Math.max(1,Math.abs(a.x),Math.abs(a.z),Math.abs(b.x),Math.abs(b.z))+originRadiusM)*2**-22;
        for(const area of owner.conflictAreas??[owner]){
          const t=firstContact(a,b,area.position,area.radiusM+originRadiusM+network.admissionBounds.stopGapM+rounding);
          if(t!==null){const distance=segmentStart+cut+t*(length-cut);if(firstM===null||distance<firstM)firstM=distance;}
        }
        local+=length;
      }
      if(firstM!==null)break;
    }
    const distanceM=Math.min(nominal,firstM??Infinity);
    if(distanceM<=route.starts[startIndex]!+1e-9)return{halts:[],reason:`Vehicle approach to ${owner.id} at occurrence ${passage.entryIndex} starts inside its expanded physical union; no complete clear approach remains after the previous visit.`};
    halts.push(Object.freeze({entryIndex:passage.entryIndex,distanceM,sourceGateDistanceM:entryDistanceM,originRadiusM}));
    previous=passage;previousApproachM=distanceM;
  }
  return{halts:Object.freeze(halts)};
}

/** The final visit cannot release in a clear hole before a later terminal-tail lobe.
 * Reverse each segment's intersection to bound its LAST possible body contact.
 * This covers only the final factory visit (or its retained ingress prefix), never
 * joins distinct visits, and leaves the source lastConflictIndex untouched. */
export function vehicleFinalRelease(network:Pick<NetworkData,'junctions'>,route:HaltRoute,
  originRadiusM:number,boundaryEntry?:RoutePassage|null):VehicleFinalRelease|undefined {
  const final=route.passages.at(-1);
  const passage=final&&boundaryEntry&&passageCovers(boundaryEntry,final)?boundaryEntry:final??boundaryEntry;
  if(!passage)return undefined;
  const owner=network.junctions.find(j=>j.id===passage.junctionId);
  if(!owner||!Number.isFinite(originRadiusM)||originRadiusM<=0)throw new Error(`Final vehicle visit ${passage.junctionId} needs its source authority and finite positive body-origin radius.`);
  const last=passage.lastConflictIndex;
  let distanceM=last<0?0:route.starts[last]!+route.edges[last]!.lengthM;
  for(let i=last+1;i<route.edges.length;i++){
    const edge=route.edges[i]!;let local=0;
    for(let p=1;p<edge.points.length;p++){
      const a=edge.points[p-1]!,b=edge.points[p]!,length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
      const rounding=(Math.max(1,Math.abs(a.x),Math.abs(a.z),Math.abs(b.x),Math.abs(b.z))+originRadiusM)*2**-22;
      for(const area of owner.conflictAreas??[owner]){
        const reverse=firstContact(b,a,area.position,area.radiusM+originRadiusM+rounding);
        if(reverse!==null)distanceM=Math.max(distanceM,route.starts[i]!+Math.min(edge.lengthM,local+(1-reverse)*length));
      }
      local+=length;
    }
  }
  return Object.freeze({passage,distanceM});
}

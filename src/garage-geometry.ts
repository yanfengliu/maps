import earcut from 'earcut';
import type * as GeoJSON from 'geojson';
import {garageProfile} from './garage-architecture.ts';
type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface MeshWriter {triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void;quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void}
const signedArea=(ring:Point[])=>ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
const inside=(p:Point,ring:Point[])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};

/** Open parking decks follow the full pinned perimeter, including Roth's
 * rounded and stepped outline. No opaque building shell fills these openings. */
export function addGarage(roofs:MeshWriter,facades:MeshWriter,rings:Point[][],building:number,properties:GeoJSON.GeoJsonProperties,base:number,height:number):boolean{
 const profile=garageProfile(properties);if(!profile||!['open-deck','screened'].includes(profile.kind))return false;
 const ring=rings[0],vertices=rings.flat(),holes:number[]=[];let offset=ring.length;
 for(const hole of rings.slice(1)){holes.push(offset);offset+=hole.length;}
 const triangles=earcut(vertices.flat(),holes,2);
 let longest=0,axis:Point=[1,0];for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]);if(length>longest){longest=length;axis=[(q[0]-p[0])/length,(q[1]-p[1])/length];}}
 const across:Point=[-axis[1],axis[0]],origin=ring[0];
 const uv=(p:Point):Point=>[(p[0]-origin[0])*across[0]+(p[1]-origin[1])*across[1],(p[0]-origin[0])*axis[0]+(p[1]-origin[1])*axis[1]];
 const concrete:Color=properties?.id==='way/232841898'?[.78,.73,.60]:properties?.id==='way/324983017'?[.81,.79,.75]:[.75,.74,.68];
 const slab=(z:number,kind:number,tint:Color)=>{for(let i=0;i<triangles.length;i+=3){const [a,b,c]=triangles.slice(i,i+3).map(j=>vertices[j]);roofs.triangle([...a,z],[...b,z],[...c,z],tint,kind,building,[uv(a),uv(b),uv(c)]);}};
 if(profile.kind==='screened'){
  slab(height,43,[.56,.59,.49]);
  for(const [ri,r] of rings.entries())for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),direction=(signedArea(r)>0?1:-1)*(ri?-1:1),at=(p:Point,z:number):Vertex=>[p[0]+direction*(b[1]-a[1])/length*.045,p[1]-direction*(b[0]-a[0])/length*.045,z];facades.quad(at(a,base),at(b,base),at(b,height),at(a,height),[.65,.66,.62],42,building,[[0,0],[length,0],[length,height-base],[0,height-base]]);}
  return true;
 }
 const top=height-.9,rise=(top-base)/(profile.levels-1);
 for(let level=0;level<profile.levels;level++)slab(base+level*rise+(level===0?.06:0),level===profile.levels-1?41:9,level===profile.levels-1?[.50,.51,.48]:[.40,.40,.36]);
 for(const [ri,r] of rings.entries()){
  const direction=(signedArea(r)>0?1:-1)*(ri?-1:1);let perimeter=0;
  for(let i=0;i<r.length;i++){
   const a=r[i],b=r[(i+1)%r.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.00001)continue;
   const inward:Point=[-direction*dy/length,direction*dx/length],at=(p:Point,z:number,d=0):Vertex=>[p[0]+inward[0]*d,p[1]+inward[1]*d,z];
   for(let level=1;level<profile.levels;level++){
    const floor=base+level*rise,low=floor-.18,high=level===profile.levels-1?height:Math.min(height,floor+.9);
    facades.quad(at(a,low),at(b,low),at(b,high),at(a,high),concrete,40,building,[[perimeter,low-base],[perimeter+length,low-base],[perimeter+length,high-base],[perimeter,high-base]]);
    roofs.quad(at(a,high),at(b,high),at(b,high,.22),at(a,high,.22),concrete,9,building);
   }
   // Six-sided columns retain the round Roth support silhouette without one
   // object per parking bay. Others use square precast supports.
   // The primary Hoover photograph shows vertical precast fins on the long
   // Quarry-facing elevation. Other elevations retain a quieter support grid.
   const fin=properties?.id==='way/324983017'&&inward[0]*.75+inward[1]*.66>.8,spacing=fin?3.2:8;
   for(let distance=Math.ceil((perimeter+.5)/spacing)*spacing-perimeter;distance<length-.1;distance+=spacing){
    const center:Point=[a[0]+dx*distance/length+inward[0]*.55,a[1]+dy*distance/length+inward[1]*.55];
    if(!inside(center,ring)||rings.slice(1).some(hole=>inside(center,hole)))continue;
    const sides=properties?.id==='way/232841898'?6:4,radius=.24;
    const points:Point[]=fin?[[.14,.50],[-.14,.50],[-.14,-.50],[.14,-.50]].map(([u,v])=>[center[0]+dx/length*u+inward[0]*v,center[1]+dy/length*u+inward[1]*v]):Array.from({length:sides},(_,j)=>[center[0]+Math.cos(j/sides*Math.PI*2)*radius,center[1]+Math.sin(j/sides*Math.PI*2)*radius]);
    for(let side=0;side<points.length;side++){const p=points[side],q=points[(side+1)%points.length],z=fin?height:top;facades.quad([...p,base],[...q,base],[...q,z],[...p,z],concrete,2,building);}
   }
   perimeter+=length;
  }
 }
 return true;
}

import { CAMPUS_ROOF_PROFILES } from './campus-roof-profile.ts';
import { evaluateRoofSkeleton, orientRoofRings, roofSourceSignature } from './roof-skeleton.ts';

type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
export const BRAUN_MUSIC_ID='relation/12460152';

/** Analytic source-edge planes replace sampled height fields. The signature
 * phase only avoids floating-point guard boundaries; no position is rounded. */
export function campusRoof(id:string,component:number,rings:Point[][]){
 const oriented=orientRoofRings(rings),profile=CAMPUS_ROOF_PROFILES[`${id}/${component}`];
 if(!profile||roofSourceSignature(oriented.map(r=>r.map(([x,y])=>[x+profile.offset,y+profile.offset])))!==profile.signature)throw new Error(`Mapped campus roof footprint changed (${id}/${component}). Regenerate and review its roof topology.`);
 const model=evaluateRoofSkeleton(oriented,profile),points:Point[]=model.vertices.map(([x,y])=>[x,y]),times=new Map(points.map((p,i)=>[p,model.vertices[i][2]]));
 let triangles=model.triangles.map(t=>t.map(i=>points[i]) as [Point,Point,Point]);
 const braun=id===BRAUN_MUSIC_ID,edgeWidth=.9;
 if(braun){
  // Stanford documents a flat photovoltaic roof; the department photograph
  // shows narrow red tile edging. Split planar faces at that authored width.
  const split:[Point,Point,Point][]=[];
  for(const tri of triangles)for(const sign of [-1,1]){
   const clipped:Point[]=[];
   for(let i=0;i<3;i++){
    const a=tri[i],b=tri[(i+1)%3],da=(times.get(a)!-edgeWidth)*sign,db=(times.get(b)!-edgeWidth)*sign;
    if(da>=0)clipped.push(a);
    if((da>0)!==(db>0)){const t=da/(da-db),p:Point=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];times.set(p,edgeWidth);clipped.push(p);}
   }
   for(let i=1;i+1<clipped.length;i++)split.push([clipped[0],clipped[i],clipped[i+1]]);
  }
  triangles=split;
 }
 let longest=0,axis:Point=[1,0];
 for(const [i,a] of rings[0].entries()){const b=rings[0][(i+1)%rings[0].length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>longest){longest=l;axis=[(b[0]-a[0])/l,(b[1]-a[1])/l];}}
 return {triangles,
  fraction:(p:Point)=>braun?.75*Math.min(1,(times.get(p)??0)/edgeWidth):(times.get(p)??0)/model.maximumTime,
  edge:(a:Point,b:Point):Point[]=>[a,b],
  uv:(p:Point):Point=>[p[0]*axis[0]+p[1]*axis[1],-p[0]*axis[1]+p[1]*axis[0]],
  flat:(tri:[Point,Point,Point])=>braun&&tri.every(p=>(times.get(p)??0)>=edgeWidth-1e-8),
 };
}

interface RoofMesh{quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number):void}
/** Solar presence follows Stanford's 2017 report; array spacing and count are
 * estimates. Leave access margins and every courtyard completely unobstructed. */
export function addBraunSolar(mesh:RoofMesh,rings:Point[][],building:number,height:number):void{
 let longest=0,u:Point=[1,0];for(const [i,a] of rings[0].entries()){const b=rings[0][(i+1)%rings[0].length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l>longest){longest=l;u=[(b[0]-a[0])/l,(b[1]-a[1])/l];}}
 const v:Point=[-u[1],u[0]],dot=(a:Point,b:Point)=>a[0]*b[0]+a[1]*b[1],origin=rings[0][0],local=(p:Point):Point=>[dot([p[0]-origin[0],p[1]-origin[1]],u),dot([p[0]-origin[0],p[1]-origin[1]],v)],lr=rings.map(r=>r.map(local));
 const inside=(p:Point,ring:Point[])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
 const clear=(p:Point)=>inside(p,lr[0])&&!lr.slice(1).some(r=>inside(p,r))&&lr.every(r=>r.every((a,i)=>{const b=r[(i+1)%r.length],d:Point=[b[0]-a[0],b[1]-a[1]],t=Math.max(0,Math.min(1,dot([p[0]-a[0],p[1]-a[1]],d)/dot(d,d)));return Math.hypot(p[0]-a[0]-t*d[0],p[1]-a[1]-t*d[1])>1.5;}));
 const at=(x:number,y:number,z:number):Vertex=>[origin[0]+u[0]*x+v[0]*y,origin[1]+u[1]*x+v[1]*y,z],xs=lr[0].map(p=>p[0]),ys=lr[0].map(p=>p[1]);
 for(let x=Math.min(...xs)+2;x+2.2<Math.max(...xs);x+=2.6)for(let y=Math.min(...ys)+2;y+1.15<Math.max(...ys);y+=2.8){
  if(!([[x,y],[x+2.2,y],[x+2.2,y+1.15],[x,y+1.15]] as Point[]).every(clear))continue;
  mesh.quad(at(x,y,height-.025),at(x+2.2,y,height-.025),at(x+2.2,y+1.15,height-.025),at(x,y+1.15,height-.025),[.65,.68,.67],2,building);
  mesh.quad(at(x+.045,y+.045,height-.015),at(x+2.155,y+.045,height-.015),at(x+2.155,y+1.105,height-.015),at(x+.045,y+1.105,height-.015),[.12,.20,.25],2,building);
 }
}

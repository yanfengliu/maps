import earcut from 'earcut';
import { STADIUM_CONCOURSE_ID, STADIUM_SEATING_IDS, STADIUM_PRESSBOX_IDS, STADIUM_SCOREBOARD_IDS } from './stadium-architecture.ts';
import { addStadiumElevation } from './stadium-elevation.ts';
type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface MeshWriter {triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void;quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void}
// The two vertices on each mapped field-facing edge. This prevents every
// skillion stand rising northward, as a generic building roof would do.
const FRONT:Record<string,[number,number]>={
 'way/1351986681':[2,3],'way/1351986682':[3,4],'way/1351986683':[3,4],'way/1351986684':[5,0],
 'way/1351986685':[4,0],'way/1351986686':[7,0],'way/1351986687':[2,3],'way/1351986688':[6,0],
 'way/1363840342':[5,0],'way/1363840343':[0,1],'way/1363840344':[15,0],'way/1363840345':[2,3],
 'way/1363840346':[2,3],'way/1363840347':[0,1],'way/1363840348':[5,0],'way/1363840349':[6,7],
};
const RED:Color=[.48,.075,.105],RISER:Color=[.39,.055,.075],CONCRETE:Color=[.68,.67,.61];
const dot=(p:Point,q:Point)=>p[0]*q[0]+p[1]*q[1];
// A concave rear edge can split a terrace into separate islands. Trace the
// clipped boundary instead of joining those islands across a pressbox notch.
function clipParts(poly:Point[],axis:Point,limit:number,above:boolean):Point[][]{
 const edges:[Point,Point][]=[],cuts:Point[]=[],key=(p:Point)=>p.map(n=>n.toFixed(6)).join(',');
 const distance=(p:Point)=>(dot(p,axis)-limit)*(above?1:-1);
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b),ai=da>=-1e-8,bi=db>=-1e-8;
  if(ai&&bi)edges.push([a,b]);
  else if(ai!==bi){const t=da/(da-db),p:Point=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];cuts.push(p);edges.push(ai?[a,p]:[p,b]);}
 }
 const area=poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
 const direction:Point=[axis[1]*(above?1:-1)*(area>0?1:-1),-axis[0]*(above?1:-1)*(area>0?1:-1)];
 cuts.sort((a,b)=>dot(a,direction)-dot(b,direction));for(let i=0;i+1<cuts.length;i+=2)edges.push([cuts[i],cuts[i+1]]);
 const next=new Map<string,Point>();for(const [a,b] of edges)if(key(a)!==key(b))next.set(key(a),b);
 const result:Point[][]=[];
 while(next.size){const first=next.keys().next().value!,ring:Point[]=[];let current=first;
  do{const p=next.get(current);if(!p)break;next.delete(current);ring.push(p);current=key(p);}while(current!==first&&ring.length<=edges.length);
  if(ring.length>=3)result.push(ring);
 }
 return result;
}
function face(mesh:MeshWriter,poly:Point[],z:number,tint:Color,kind:number,building:number,uv:(p:Point)=>Point):void{
 if(poly.length<3)return;const indices=earcut(poly.flat(),undefined,2);
 for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>poly[j]);mesh.triangle([...a,z],[...b,z],[...c,z],tint,kind,building,[uv(a),uv(b),uv(c)]);}
}
/** Real row relief within each unchanged source polygon and height envelope.
 * Row counts, aisle spacing and structural thickness are authored estimates. */
export function addStadiumSeating(mesh:MeshWriter,id:string,ring:Point[],building:number,base:number,height:number,center:Point):boolean{
 if(!STADIUM_SEATING_IDS.has(id))return false;
 const pair=FRONT[id],a=ring[pair[0]],b=ring[pair[1]];
 const length=Math.hypot(b[0]-a[0],b[1]-a[1]),along:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length];
 let outward:Point=[along[1],-along[0]];
 if(dot(outward,[(a[0]+b[0])/2-center[0],(a[1]+b[1])/2-center[1]])<0)outward=[-outward[0],-outward[1]];
 const distances=ring.map(p=>dot(p,outward)),low=Math.min(...distances),high=Math.max(...distances),span=high-low;
 const upper=base>0,rows=upper?22:26,front=base+1,rise=height-front;
 const uv=(p:Point):Point=>[dot([p[0]-(a[0]+b[0])/2,p[1]-(a[1]+b[1])/2],along),dot(p,outward)-low];
 for(let row=0;row<rows;row++){
  const start=low+span*row/rows,end=low+span*(row+1)/rows,z=front+rise*(row+1)/rows;
  const strips=clipParts(ring,outward,start,true).flatMap(part=>clipParts(part,outward,end,false));
  // An actual vertical riser closes every tread; all vertices remain in its
  // mapped stand. x UV stays fixed across rows, so material aisles line up.
  for(const strip of strips){face(mesh,strip,z,RED,31,building,uv);
   const edge=strip.filter(p=>Math.abs(dot(p,outward)-start)<1e-5).sort((p,q)=>dot(p,along)-dot(q,along));
   for(let i=0;i+1<edge.length;i+=2){const p=edge[i],q=edge[i+1];mesh.quad([...p,z-rise/rows],[...q,z-rise/rows],[...q,z],[...p,z],RISER,31,building,[uv(p),uv(q),uv(q),uv(p)]);}
  }
 }
 // Sloped concrete raker walls support the stepped terraces; their outer
 // lip reaches the original mapped height exactly.
 const elevation=(p:Point)=>front+rise*Math.min(1,Math.max(0,(dot(p,outward)-low)/span));
 for(let i=0;i<ring.length;i++){
  const p=ring[i],q=ring[(i+1)%ring.length];
  mesh.quad([...p,base],[...q,base],[...q,elevation(q)],[...p,elevation(p)],CONCRETE,2,building);
 }
 // A narrow rear walking strip gives the exact source-height roof closure.
 for(const rear of clipParts(ring,outward,high-Math.min(.22,span*.025),true))face(mesh,rear,height,CONCRETE,9,building,uv);
 return true;
}
/** Field is ground-level infill in the existing bowl opening, not a roof over
 * it. Coordinates follow the mapped sideline; the football markings use yards. */
export function addStadiumField(mesh:MeshWriter,building:number,project:(p:Point)=>Point):void{
 const a=project([-122.1618507,37.4347127]),b=project([-122.1609212,37.433893]);
 const c=project([-122.1610945,37.434510375]),l=Math.hypot(b[0]-a[0],b[1]-a[1]),v:Point=[(b[0]-a[0])/l,(b[1]-a[1])/l],u:Point=[v[1],-v[0]];
 const at=(x:number,y:number,z:number):Vertex=>[c[0]+u[0]*x+v[0]*y,c[1]+u[1]*x+v[1]*y,z];
 const w=48.768/2,h=109.728/2;
 mesh.quad(at(-w-5,-h-7,.04),at(w+5,-h-7,.04),at(w+5,h+7,.04),at(-w-5,h+7,.04),[.28,.43,.19],2,building);
 mesh.quad(at(-w,-h,.06),at(w,-h,.06),at(w,h,.06),at(-w,h,.06),[.28,.48,.22],32,building,[[-w,-h],[w,-h],[w,h],[-w,h]]);
 // Goalposts are closed square steel sections; dimensions follow the college
 // field standard, with an authored behind-line support bend.
 const beam=(x0:number,y0:number,z0:number,x1:number,y1:number,z1:number,width:number)=>{
  const p=at(x0,y0,z0),q=at(x1,y1,z1),d=q.map((n,i)=>n-p[i]) as Vertex,dl=Math.hypot(...d),vertical=Math.abs(d[2]/dl)>.9;
  const normal:Vertex=vertical?[1,0,0]:[-d[1]/Math.hypot(d[0],d[1]),d[0]/Math.hypot(d[0],d[1]),0],side=normal.map(n=>n*width/2) as Vertex;
  const other:Vertex=[(d[1]*normal[2]-d[2]*normal[1])/dl*width/2,(d[2]*normal[0]-d[0]*normal[2])/dl*width/2,(d[0]*normal[1]-d[1]*normal[0])/dl*width/2];
  const corner=(p:Vertex,s:number,t:number):Vertex=>p.map((n,i)=>n+side[i]*s+other[i]*t) as Vertex;
  for(let i=0;i<4;i++){const signs:[[number,number],[number,number],[number,number],[number,number]]=[[1,1],[-1,1],[-1,-1],[1,-1]],a=signs[i],b=signs[(i+1)%4];mesh.quad(corner(p,...a),corner(p,...b),corner(q,...b),corner(q,...a),[.88,.72,.15],2,building);}
  for(const end of [p,q])mesh.quad(corner(end,1,1),corner(end,-1,1),corner(end,-1,-1),corner(end,1,-1),[.88,.72,.15],2,building);
 };
 for(const end of [-1,1]){const y=end*h;beam(0,y+end*1.3,.08,0,y+end*1.3,3.048,.18);beam(0,y+end*1.3,3.048,0,y,3.048,.16);beam(-2.8194,y,3.048,2.8194,y,3.048,.13);for(const x of [-2.8194,2.8194])beam(x,y,3.048,x,y,8,.13);}
}

/** Flat concrete concourse, pale pressbox and black video boards replace
 * generic terracotta roofs. The exact mapped holes/base/height are retained. */
export function addStadiumStructure(roofs:MeshWriter,facades:MeshWriter,id:string,rings:Point[][],building:number,base:number,height:number,center:Point):boolean{
 if(addStadiumElevation(roofs,facades,id,rings,building,base,height))return true;
 const concourse=id===STADIUM_CONCOURSE_ID,press=STADIUM_PRESSBOX_IDS.has(id),screen=STADIUM_SCOREBOARD_IDS.has(id);
 if(!concourse&&!press&&!screen)return false;
 const concrete:Color=concourse?[.73,.73,.67]:screen?[.12,.15,.16]:[.87,.85,.79],cap:Color=screen?[.12,.15,.16]:[.84,.83,.76];
 const vertices=rings.flat(),holes:number[]=[];let count=rings[0].length;for(const ring of rings.slice(1)){holes.push(count);count+=ring.length;}
 const indices=earcut(vertices.flat(),holes,2);for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>vertices[j]);roofs.triangle([...a,height],[...b,height],[...c,height],cap,9,building);}
 for(const [ri,ring] of rings.entries())for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const facing=((a[0]+b[0])/2-center[0])*(b[1]-a[1])-((a[1]+b[1])/2-center[1])*(b[0]-a[0]);
  const glass=press&&id==='way/1354417642'&&length>20;
  const area=ring.reduce((sum,p,j)=>{const q=ring[(j+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0),outward=(area>0?1:-1)*(ri?-1:1);
  const at=(p:Point,z:number):Vertex=>[p[0]+outward*(b[1]-a[1])/length*.045,p[1]-outward*(b[0]-a[0])/length*.045,z];
  facades.quad(at(a,base),at(b,base),at(b,height),at(a,height),concrete,glass?5:2,building,[[0,0],[length,0],[length,10.8],[0,10.8]]);
  // Neutral fascia around the upper concourse, based on the current stadium
  // photograph. Internal walk edges retain the source opening at full width.
  if(concourse&&ri===0)facades.quad(at(a,height-.45),at(b,height-.45),at(b,height),at(a,height),[.89,.88,.82],2,building);
  if(screen&&length>10&&height-base<12&&Math.abs(facing)>length*30){
   const nx=(center[0]-(a[0]+b[0])/2),ny=(center[1]-(a[1]+b[1])/2),n=Math.hypot(nx,ny),at=(t:number,z:number):Vertex=>[a[0]+(b[0]-a[0])*t+nx/n*.055,a[1]+(b[1]-a[1])*t+ny/n*.055,z];
   facades.quad(at(.035,base+.4),at(.965,base+.4),at(.965,height-.5),at(.035,height-.5),[.035,.065,.065],2,building);
   facades.quad(at(.035,height-1.15),at(.965,height-1.15),at(.965,height-.5),at(.035,height-.5),[.46,.055,.075],2,building);
  }
 }
 // The north board is mapped as a raised panel without its columns. The
 // reference aerial shows two steel supports; keep the panel's base/height
 // intact and add estimated columns wholly inside its footprint below it.
 if(id==='way/1354429136'){
  const ring=rings[0],edges=ring.map((p,i)=>[p,ring[(i+1)%ring.length]] as [Point,Point]);
  const [a,b]=edges.sort((a,b)=>Math.hypot(b[1][0]-b[0][0],b[1][1]-b[0][1])-Math.hypot(a[1][0]-a[0][0],a[1][1]-a[0][1]))[0];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),axis:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length];
  const middle:Point=[(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2,(Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2];
  for(const offset of [-.26,.26]){
   const corners=([[-1,-1],[1,-1],[1,1],[-1,1]] as Point[]).map(([x,y]):Point=>[middle[0]+axis[0]*(offset*length+x*.42)-axis[1]*y*.42,middle[1]+axis[1]*(offset*length+x*.42)+axis[0]*y*.42]);
   for(let i=0;i<4;i++){const p=corners[i],q=corners[(i+1)%4];facades.quad([...p,0],[...q,0],[...q,base],[...p,base],[.22,.24,.23],33,building);}
   for(const z of [0,base])facades.quad([...corners[0],z],[...corners[1],z],[...corners[2],z],[...corners[3],z],[.22,.24,.23],33,building);
  }
 }
 return true;
}

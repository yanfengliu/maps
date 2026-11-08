import { ENGINEERING_REFERENCES, engineeringRoofOffset } from './engineering-architecture.ts';
type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface MeshWriter {triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void;quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void}
const inside=(p:Point,ring:Point[])=>{let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;}return result;};

/** Long masonry workshop elevations are a single tall composition, not a
 * stack of identical glass office floors. 50/51 use one normalized bay. */
export function addEngineeringElevation(mesh:MeshWriter,id:string,a:Point,b:Point,normal:Point,base:number,wall:number,building:number,tint:Color):boolean {
  const ref=ENGINEERING_REFERENCES[id];if(!ref||!['workshop','concrete-frame'].includes(ref.family))return false;
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<1.8||wall<=base+1)return false;
  // The surveyed southern workshop wings are stucco. Direction is geographic
  // north (+y), never the camera; unphotographed returns remain estimates.
  const stucco=id==='way/232841878'||id!=='way/232841919'&&normal[1]<-.45;
  const kind=ref.family==='concrete-frame'?52:stucco?51:50;
  const bays=Math.max(1,Math.round(length/ref.bayWidth));
  const at=(u:number,z:number,d=.055):Vertex=>[a[0]+(b[0]-a[0])*u+normal[0]*d,a[1]+(b[1]-a[1])*u+normal[1]*d,z];
  mesh.quad(at(0,base),at(1,base),at(1,wall-.12),at(0,wall-.12),tint,kind,building,[[0,0],[bays,0],[bays,1],[0,1]]);
  // MERL's photo has two clearly separated storeys. A dark shader crossbar
  // alone disappears at map scale, so the concrete floor edge has real relief.
  if(kind===52)for(const z of [base+(wall-base)*.5,wall-.35]){
    const bottom=z-.16,top=z+.16;
    mesh.quad(at(0,bottom,.055),at(1,bottom,.055),at(1,bottom,.22),at(0,bottom,.22),tint,2,building);
    mesh.quad(at(0,bottom,.22),at(1,bottom,.22),at(1,top,.22),at(0,top,.22),tint,2,building);
    mesh.quad(at(0,top,.22),at(1,top,.22),at(1,top,.055),at(0,top,.055),tint,2,building);
  }
  // Physical shallow pilasters supply the strong edge shadows visible on the
  // stucco workshops. Bay spacing and 18 cm projection are authored estimates.
  if(kind===51&&length>20)for(let i=1;i<bays;i+=2){
    const u=i/bays,half=.22/length,z0=base+.18,z1=wall-.23;
    mesh.quad(at(u-half,z0,.06),at(u-half,z0,.23),at(u-half,z1,.23),at(u-half,z1,.06),tint,2,building);
    mesh.quad(at(u-half,z0,.23),at(u+half,z0,.23),at(u+half,z1,.23),at(u-half,z1,.23),tint,2,building);
    mesh.quad(at(u+half,z0,.23),at(u+half,z0,.06),at(u+half,z1,.06),at(u+half,z1,.23),tint,2,building);
  }
  return true;
}

/** Hipped, glazed roof monitors are a defining feature of the 520–550
 * workshops. Fit slender forms inside long wings; never bridge a courtyard.
 * Their placement is an estimate from the mapped wing, not a roof survey. */
export function addEngineeringMonitors(mesh:MeshWriter,id:string,rings:Point[][],building:number,wall:number,height:number,tint:Color):number {
  if(!ENGINEERING_REFERENCES[id]?.monitor)return 0;
  const ring=rings[0],area=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0),sign=area>0?1:-1;
  const candidates=ring.map((a,i)=>{const b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return {a,b,length};}).filter(e=>e.length>30).sort((a,b)=>b.length-a.length);
  const centers:Point[]=[],offset=engineeringRoofOffset(id,wall,height),bottom=height-offset-.12,top=height-Math.min(.28,offset*.4);
  const contains=(p:Point)=>inside(p,ring)&&!rings.slice(1).some(hole=>inside(p,hole));
  for(const {a,b,length} of candidates){
    const along:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length],inward:Point=[-along[1]*sign,along[0]*sign];
    const center:Point=[(a[0]+b[0])/2+inward[0]*7.8,(a[1]+b[1])/2+inward[1]*7.8];
    if(centers.some(c=>Math.hypot(c[0]-center[0],c[1]-center[1])<5))continue;
    const half=Math.max(4,length/2-7),wide=1.55;
    const point=(u:number,v:number):Point=>[center[0]+along[0]*u+inward[0]*v,center[1]+along[1]*u+inward[1]*v];
    // Include intermediate samples: corner-only tests can miss a courtyard.
    if([-half,0,half].some(u=>[-wide,0,wide].some(v=>!contains(point(u,v)))))continue;
    centers.push(center);
    const corners=[point(-half,-wide),point(half,-wide),point(half,wide),point(-half,wide)];
    const v=(p:Point,z:number):Vertex=>[...p,z];
    for(let i=0;i<4;i++){const p=corners[i],q=corners[(i+1)%4],span=Math.hypot(q[0]-p[0],q[1]-p[1]);mesh.quad(v(p,bottom),v(q,bottom),v(q,top),v(p,top),[.28,.29,.25],52,building,[[0,2],[span,2],[span,3],[0,3]]);}
    const left=point(-half+wide,0),right=point(half-wide,0);
    mesh.quad(v(corners[0],top),v(corners[1],top),v(right,height),v(left,height),tint,17,building,[[-half,-wide],[half,-wide],[half-wide,0],[-half+wide,0]]);
    mesh.quad(v(corners[2],top),v(corners[3],top),v(left,height),v(right,height),tint,17,building,[[half,wide],[-half,wide],[-half+wide,0],[half-wide,0]]);
    mesh.triangle(v(corners[3],top),v(corners[0],top),v(left,height),tint,17,building,[[-half,wide],[-half,-wide],[-half+wide,0]]);
    mesh.triangle(v(corners[1],top),v(corners[2],top),v(right,height),tint,17,building,[[half,-wide],[half,wide],[half-wide,0]]);
    if(centers.length===2)break;
  }
  return centers.length;
}

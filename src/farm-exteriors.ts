type Point=[number,number]; type Vertex=[number,number,number]; type Color=[number,number,number];
interface Mesh {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,id:number,uv?:[Point,Point,Point]):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,id:number,uv?:[Point,Point,Point,Point]):void;
}
type Form='glasshouse'|'barn'|'shade'|'canopy'|'array';
export const FARM_FORMS: Readonly<Record<string,Form>> = {
  'way/232715723':'glasshouse', 'way/922801148':'glasshouse',
  'way/922801147':'barn', 'way/922801150':'shade', 'way/232715761':'canopy',
  'way/905706383':'array','way/905706384':'array','way/905706385':'array',
  'way/905706386':'array','way/905706387':'array','way/905706388':'array',
};
export const FARM_IDS=Object.keys(FARM_FORMS);
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const length=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const at=(p:Point,z:number):Vertex=>[p[0],p[1],z];
export function addFarmExterior(mesh:Mesh,id:string,ring:Point[],owner:number,base:number,top:number):boolean {
  const form=FARM_FORMS[id];
  if(!form)return false;
  if(ring.length!==4)throw Error('Recheck the photographed four-corner footprint '+id);
  const edges=ring.map((a,i)=>length(a,ring[(i+1)%4]));
  const start=edges.indexOf(Math.max(...edges)),[a,b,c,d]=[0,1,2,3].map(i=>ring[(i+start)%4]);
  const long=length(a,b),wide=length(a,d);
  const height=top-base;
  if(form==='canopy'||form==='array'){
    const array=form==='array',thickness=array?.18:.28;
    const deck:Color=array?[.30,.36,.40]:[.55,.54,.50];
    mesh.quad(at(a,top),at(b,top),at(c,top),at(d,top),deck,array?49:2,owner,[[0,0],[long,0],[long,wide],[0,wide]]);
    mesh.quad(at(d,top-thickness),at(c,top-thickness),at(b,top-thickness),at(a,top-thickness),[.58,.58,.55],2,owner);
    for(const [i,p] of ring.entries()){
      const q=ring[(i+1)%4];
      mesh.quad(at(p,top-thickness),at(q,top-thickness),at(q,top),at(p,top),[.29,.29,.28],2,owner);
    }
    const posts=array?Math.max(2,Math.round(long/12)):2;
    for(let i=0;i<posts;i++){
      const t=.12+.76*i/(posts-1),p=mix(mix(a,b,t),mix(d,c,t),.5),r=array?.11:.14;
      const corners:Point[]=[[-r,-r],[r,-r],[r,r],[-r,r]].map(([x,y])=>[p[0]+x,p[1]+y]);
      for(const [j,v] of corners.entries()){
        const q=corners[(j+1)%4];mesh.quad(at(v,base),at(q,base),at(q,top-thickness),at(v,top-thickness),[.33,.32,.30],2,owner);
      }
    }
    return true;
  }
  const glass=form==='glasshouse',barn=form==='barn',wallTint:Color=glass?[.74,.77,.73]:barn?[.40,.30,.22]:[.69,.48,.30];
  const roof:Color=glass?[.83,.84,.78]:[.73,.74,.69],kind=glass?59:48;
  const eave=base+height*.68,first=mix(a,d,.5),last=mix(b,c,.5);
  mesh.quad(at(a,eave),at(b,eave),at(last,top),at(first,top),roof,glass?59:2,owner,[[0,0],[long,0],[long,wide/2],[0,wide/2]]);
  mesh.quad(at(first,top),at(last,top),at(c,eave),at(d,eave),roof,glass?59:2,owner,[[0,wide/2],[long,wide/2],[long,wide],[0,wide]]);
  for(const [i,p] of [a,b,c,d].entries()){
    const q=[b,c,d,a][i],span=length(p,q),end=i%2===1;
    const y=eave-base;
    // The farm barn opens onto the drive at its southeast gable. Both ends of
    // the shade structure are open in the visitor photograph. Keep side slats.
    const front=(p[0]+q[0])/2>(first[0]+last[0])/2;
    const doorway=end && !glass && (!barn||front);
    const low=base+(doorway?height*.48:0);
    if(doorway)for(const [u,v] of [[0,.2],[.8,1]]){
      mesh.quad(at(mix(p,q,u),base),at(mix(p,q,v),base),at(mix(p,q,v),low),at(mix(p,q,u),low),wallTint,kind,owner,[[u*span,0],[v*span,0],[v*span,low-base],[u*span,low-base]]);
    }
    mesh.quad(at(p,low),at(q,low),at(q,eave),at(p,eave),wallTint,kind,owner,[[0,low-base],[span,low-base],[span,y],[0,y]]);
    if(end)mesh.triangle(at(p,eave),at(q,eave),at(mix(p,q,.5),top),wallTint,kind,owner,[[0,y],[span,y],[span/2,height]]);
  }
  return true;
}

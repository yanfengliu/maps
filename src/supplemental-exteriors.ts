import earcut from 'earcut';
import {CLOCK_PERGOLA,DIAMOND_DUGOUTS} from './supplemental-architecture.ts';

type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface Mesh {
  triangle(a:Vertex,b:Vertex,c:Vertex,color:Color,material:number,building:number):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,color:Color,material:number,building:number):void;
}
const stone:Color=[.79,.73,.59],wood:Color=[.76,.69,.52],grey:Color=[.65,.66,.63],sand:Color=[.74,.69,.59];
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

export function addSupplementalExterior(mesh:Mesh,id:string,ring:Point[],building:number,base:number,height:number):boolean {
  if(id!==CLOCK_PERGOLA&&!DIAMOND_DUGOUTS.has(id))return false;
  const vertex=(p:Point,z:number):Vertex=>[p[0],p[1],z];
  const vertical=(a:Point,b:Point,lo:number,hi:number,color:Color)=>
    mesh.quad(vertex(a,lo),vertex(b,lo),vertex(b,hi),vertex(a,hi),color,2,building);
  const cap=(points:Point[],z:number,color:Color)=>{
    const indices=earcut(points.flat());
    for(let i=0;i<indices.length;i+=3)mesh.triangle(vertex(points[indices[i]],z),vertex(points[indices[i+1]],z),vertex(points[indices[i+2]],z),color,2,building);
  };
  const pillar=(center:Point,radius:number,top:number,color:Color)=>{
    const sides=6;
    const points=Array.from({length:sides},(_,i):Point=>[center[0]+radius*Math.cos(2*Math.PI*i/sides),center[1]+radius*Math.sin(2*Math.PI*i/sides)]);
    for(let i=0;i<sides;i++)vertical(points[i],points[(i+1)%sides],base,top,color);
  };
  if(id===CLOCK_PERGOLA){
    if(ring.length!==8)throw new Error('Clock colonnade footprint changed; review both official facility polygons.');
    // The campus plan and pinned way share this eight-corner T and have a
    // separate square for the tower. Form a continuous long arm and short spur.
    const spur=[ring[1],ring[2],ring[3],ring[0]];
    const spine=[ring[4],ring[5],ring[6],ring[7]];
    const beam=(from:Point,to:Point,width:number,lo:number,hi:number)=>{
      const dx=to[0]-from[0],dy=to[1]-from[1],scale=width/(2*Math.hypot(dx,dy));
      const side:Point=[-dy*scale,dx*scale];
      const offset=(p:Point,s:number):Point=>[p[0]+s*side[0],p[1]+s*side[1]];
      const corners=[offset(from,1),offset(from,-1),offset(to,-1),offset(to,1)];
      mesh.quad(...corners.map(p=>vertex(p,hi)) as [Vertex,Vertex,Vertex,Vertex],wood,2,building);
      for(let i=0;i<4;i++)vertical(corners[i],corners[(i+1)%4],lo,hi,wood);
    };
    // Inset the members from the mapped edge. The posts are set in from the
    // beam faces and end beneath the slats visible in Stanford’s photographs.
    for(const [arm,bays] of [[spine,4],[spur,1]] as const){
      const [a,b,c,d]=arm;
      const edge=(t:number,s:number)=>mix(mix(a,d,t),mix(b,c,t),s);
      const t0=.035,t1=.965;
      for(const s of [.10,.90]){
        beam(edge(t0,s),edge(t1,s),.23,height-.32,height-.10);
        for(let i=0;i<=bays;i++)pillar(edge(t0+(t1-t0)*i/bays,s),.20,height-.23,stone);
      }
      const slats=bays*7;
      for(let i=0;i<=slats;i++){
        const t=t0+(t1-t0)*i/slats;
        beam(edge(t,.035),edge(t,.965),.16,height-.13,height);
      }
    }
    return true;
  }
  // The long straight edge faces the field. The opposite long edge of each
  // original way is split in two, midway along the back of the shelter.
  if(ring.length!==5)throw new Error('Sunken Diamond dugout outline changed; review its field-facing edge.');
  const front=ring.reduce((best,a,i)=>{
    const b=ring[(i+1)%ring.length],q=ring[best],r=ring[(best+1)%ring.length];
    return Math.hypot(a[0]-b[0],a[1]-b[1])>Math.hypot(q[0]-r[0],q[1]-r[1])?i:best;
  },0);
  const soffit=height-.18;
  cap(ring,height,grey);
  cap(ring,soffit,grey);
  for(const [i,a] of ring.entries()){
    const b=ring[(i+1)%ring.length];
    vertical(a,b,soffit,height,grey);
    if(i===front){
      const middle=ring.reduce<Point>((total,q)=>[total[0]+q[0]/ring.length,total[1]+q[1]/ring.length],[0,0]);
      for(const t of [.14,.5,.86])pillar(mix(mix(a,b,t),middle,.16),.10,soffit,sand);
    }else{
      // The long rear surface is visible in shade through the opening.
      const isBack=Math.hypot(a[0]-b[0],a[1]-b[1])>4;
      vertical(a,b,base,soffit,isBack?[.36,.34,.29]:sand);
    }
  }
  return true;
}

/** Four broad field-facing panes below the pale press-box parapet. The
 * remaining elevations stay plain because the photograph does not show them. */
export function addPressBoxGlazing(mesh:Mesh,ring:Point[],building:number,base:number,height:number):void {
  const front=ring.reduce((best,a,i)=>a[1]+ring[(i+1)%ring.length][1]<ring[best][1]+ring[(best+1)%ring.length][1]?i:best,0);
  const a=ring[front],b=ring[(front+1)%ring.length],out:Point=[b[1]-a[1],a[0]-b[0]];
  const length=Math.hypot(...out);
  const sign=out[1]<0?1:-1;
  const at=(t:number,h:number):Vertex=>{const p=mix(a,b,t);return [p[0]+.04*sign*out[0]/length,p[1]+.04*sign*out[1]/length,base+h*(height-base)];};
  for(let i=0;i<4;i++){
    const left=.045+.23*i,right=left+.205;
    mesh.quad(at(left,.49),at(right,.49),at(right,.88),at(left,.88),[.34,.36,.35],2,building);
  }
}

/** The Knoll's south-facing bay shares five exterior edges with the parent.
 * Facet widths follow those exact edges. Opening proportions are photographic
 * estimates. Dark wall panels give the recesses their visible depth in shade. */
export function addKnollFrontBay(mesh:Mesh,edge:number,a:Point,b:Point,normal:Point,base:number,top:number,building:number,tint:Color):void {
  const at=(along:number,level:number,offset:number):Vertex=>{
    const p=mix(a,b,along);
    return [p[0]+normal[0]*offset,p[1]+normal[1]*offset,base+(top-base)*level];
  };
  const panel=(left:number,right:number,lo:number,hi:number,offset:number,color:Color)=>
    mesh.quad(at(left,lo,offset),at(right,lo,offset),at(right,hi,offset),at(left,hi,offset),color,2,building);
  panel(0,1,0,1,.045,tint);
  const glass:Color=[.27,.27,.29],trim:Color=[.74,.70,.63];
  panel(.09,.91,.68,.95,.08,glass);
  panel(.485,.515,.68,.95,.095,trim);
  panel(0,1,.63,.665,.12,trim);
  panel(0,1,.315,.35,.18,trim);
  panel(0,1,.41,.421,.15,trim);
  if(edge===0||edge===4)return;
  panel(.27,.73,.35,.56,.08,glass);
  const shade:Color=[.25,.22,.19],spring=.17,width=.32;
  panel(.5-width,.5+width,0,spring,.08,shade);
  const radius=Math.min(.13,width*Math.hypot(b[0]-a[0],b[1]-a[1])/(top-base));
  const arch=(angle:number)=>at(.5+width*Math.cos(angle),spring+radius*Math.sin(angle),.08);
  for(let j=0;j<8;j++)mesh.triangle(at(.5,spring,.08),arch(j*Math.PI/8),arch((j+1)*Math.PI/8),shade,2,building);
}

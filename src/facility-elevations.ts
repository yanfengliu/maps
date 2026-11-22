import {CIVIC_FACADE_PHOTOS} from './civic-facades.ts';

// The visitor-map photographs in tools/quality/facility-refs-photos.json
// identify the visible exterior. Model dimensions and opening locations are estimates.
type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];
type Corners = [Point, Point, Point, Point];
interface Mesh {
  triangle(a: Vertex, b: Vertex, c: Vertex, tint: Color, kind: number, owner: number): void;
  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex, tint: Color, kind: number, owner: number): void;
}
type Form = 'mausoleum' | 'barnes' | 'bleeker' | 'wadsworth' | 'price' | 'softball';
interface Elevation {
  form: Form; code: string; facilityName?: string; wall: string; roof: string; roofShape: string;
  modelHeight: number; eaveFraction: number; observed: string;
}

export const FACILITY_ELEVATIONS: Readonly<Record<string, Elevation>> = {
  'way/232715721': {form:'mausoleum', code:'13-010', wall:CIVIC_FACADE_PHOTOS['way/232715721'].wall, roof:'#aaa69f', roofShape:'gabled', modelHeight:8.6, eaveFraction:.79, observed:'The Stanford Mausoleum has a stone plinth, four columns across its recessed portico and a layered triangular pediment. The approach path meets its southeast end.'},
  'way/232715588': {form:'barnes', code:'14-630', wall:CIVIC_FACADE_PHOTOS['way/232715588'].wall, roof:'#8d8780', roofShape:'gabled', modelHeight:4.8, eaveFraction:.68, observed:'Barnes Hall has a plain yellow gable end with a central door and a narrow pale roof edge.'},
  'way/232715589': {form:'bleeker', code:'14-620', wall:CIVIC_FACADE_PHOTOS['way/232715589'].wall, roof:'#77716a', roofShape:'gabled', modelHeight:4.9, eaveFraction:.67, observed:'Bleeker Hall has a low yellow wall, a dark gable face and a shaded porch on slender supports.'},
  'way/232715590': {form:'wadsworth', code:'14-610', wall:CIVIC_FACADE_PHOTOS['way/232715590'].wall, roof:'#c4c5be', roofShape:'gabled', modelHeight:4.3, eaveFraction:.77, observed:'Wadsworth Hall has yellow siding, a small group of horizontal windows and a shallow pale metal roof with raised roof lights.'},
  'way/232715591': {form:'price', code:'14-600', wall:CIVIC_FACADE_PHOTOS['way/232715591'].wall, roof:'#817d74', roofShape:'compound', modelHeight:5.2, eaveFraction:.68, observed:'Price Hall has a darker pitched roof behind a lower, pale-roofed yellow wing with a single small opening on the photographed side.'},
  'way/985743262': {form:'softball', code:'09-358', facilityName:'Softball Field House', wall:'#bdb8aa', roof:'#d0cec0', roofShape:'flat', modelHeight:4.3, eaveFraction:.96, observed:'The softball field house has a light, low-slope roof and a narrow high window ribbon ending at a recessed door in the concrete wall.'},
};

// Retain the upstream height, including its provenance, on the feature. Fit
// these photographed single-level forms only when the source has an estimate.
export function facilityModelHeight(id: string, base: number, height: number, heightSource: unknown) {
  const profile=FACILITY_ELEVATIONS[id];
  if(!profile) return undefined;
  return heightSource==='estimated' ? Math.min(height,base+profile.modelHeight) : height;
}

const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const rgb=(hex:string):Color=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255) as Color;
const trim=rgb('#d4d1c6'), shade=rgb('#706b61'), glass=rgb('#5d717b'), door=rgb('#776b53');
const lightStone=rgb('#d4d0c9'), darkStone=rgb('#9a9894');
const metal=rgb('#b2b5ae');

// Keep the four outside corners, ignoring a collinear point in the mapped
// Mausoleum entrance edge. Coordinates remain attached to the original outline.
function fourCorners(ring:Point[],front:Point):Corners {
  const corners=ring.filter((p,i)=>{
    const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length];
    return Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))/distance(a,b)>.04;
  });
  if (corners.length!==4) throw Error('Recheck the referenced four-corner facility footprint');
  const lengths=corners.map((p,i)=>distance(p,corners[(i+1)%4]));
  const maxShort=[...lengths].sort((a,b)=>a-b)[1]+.01;
  let best=-Infinity,start=0;
  for (let i=0;i<4;i++) if(lengths[i]<=maxShort){
    const midpoint=mix(corners[i],corners[(i+1)%4],.5);
    const projection=midpoint[0]*front[0]+midpoint[1]*front[1];
    if(projection>best){best=projection;start=i;}
  }
  const sorted=[0,1,2,3].map(i=>corners[(start+i)%4]) as Corners;
  const [a,b,c,d]=sorted;
  return (b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0])>0 ? sorted : [b,a,d,c];
}

// Normalized u runs along the front, v toward the rear, and z vertically.
// Interpolation uses all four mapped corners, including their small skew.
function surfaces(mesh:Mesh, owner:number, corners:Corners, base:number, top:number) {
  const [a,b,c,d]=corners;
  function vertex(u:number,v:number,z:number):Vertex {
    const p=mix(mix(a,b,u),mix(d,c,u),v); return [...p,base+(top-base)*z];
  }
  const quad=(p:Vertex,q:Vertex,r:Vertex,s:Vertex,tint:Color)=>mesh.quad(p,q,r,s,tint,2,owner);
  const tri=(p:Vertex,q:Vertex,r:Vertex,tint:Color)=>mesh.triangle(p,q,r,tint,2,owner);
  function wall(u0:number,v0:number,u1:number,v1:number,low:number,high:number,tint:Color){
    quad(vertex(u0,v0,low),vertex(u1,v1,low),vertex(u1,v1,high),vertex(u0,v0,high),tint);
  }
  function plate(u0:number,v0:number,u1:number,v1:number,z:number,tint:Color){
    quad(vertex(u0,v0,z),vertex(u1,v0,z),vertex(u1,v1,z),vertex(u0,v1,z),tint);
  }
  function block(l:number,f:number,r:number,b:number,low:number,high:number,tint:Color){
    wall(l,f,r,f,low,high,tint);wall(r,f,r,b,low,high,tint);
    wall(r,b,l,b,low,high,tint);wall(l,b,l,f,low,high,tint);plate(l,f,r,b,high,tint);
  }
  function gable(l:number,f:number,r:number,b:number,eave:number,peak:number,roof:Color,end:Color){
    const mid=(l+r)/2;
    for(const v of [f,b]) tri(vertex(l,v,eave),vertex(r,v,eave),vertex(mid,v,peak),end);
    quad(vertex(l,f,eave),vertex(mid,f,peak),vertex(mid,b,peak),vertex(l,b,eave),roof);
    quad(vertex(mid,f,peak),vertex(r,f,eave),vertex(r,b,eave),vertex(mid,b,peak),roof);
  }
  return {vertex,quad,tri,wall,block,plate,gable};
}

function mausoleum(s:ReturnType<typeof surfaces>,wall:Color,roof:Color){
  // Steps lead between two plinths into the portico. The chamber begins at
  // v=.30, leaving an actual open volume behind the four front columns.
  s.block(0,0,1,1,0,.06,darkStone);
  s.block(.07,.04,.93,.97,.06,.105,lightStone);
  s.block(.09,.085,.91,.97,.105,.155,wall);
  s.block(.07,.30,.93,.96,.155,.74,wall);
  s.wall(.35,.298,.65,.298,.155,.565,lightStone);
  s.wall(.381,.296,.619,.296,.155,.535,rgb('#564c46'));
  s.wall(.343,.295,.657,.295,.554,.59,darkStone);
  for(const u of [.16,.32,.68,.84]){
    s.block(u-.053,.105,u+.053,.177,.155,.205,lightStone);
    const count=8;
    for(let j=0;j<count;j++){
      const angle=j*2*Math.PI/count,next=(j+1)*2*Math.PI/count;
      const p=(angle:number,z:number,r:number)=>s.vertex(u+Math.cos(angle)*r,.142+Math.sin(angle)*r*.53,z);
      s.quad(p(angle,.205,.040),p(next,.205,.040),p(next,.674,.032),p(angle,.674,.032),wall);
    }
    s.block(u-.05,.109,u+.05,.175,.674,.711,lightStone);
  }
  s.block(.035,.095,.965,.975,.711,.762,lightStone);
  s.block(.02,.082,.98,.985,.762,.803,wall);
  s.gable(.02,.082,.98,.985,.803,1,roof,lightStone);
  s.tri(s.vertex(.09,.081,.824),s.vertex(.91,.081,.824),s.vertex(.5,.081,.975),darkStone);
  s.tri(s.vertex(.13,.08,.836),s.vertex(.87,.08,.836),s.vertex(.5,.08,.961),wall);
}

// Price's mapped L splits along the inside corner into a dark pitched main
// volume and the lower, pale-roofed wing visible from the access lane.
function price(mesh:Mesh,owner:number,ring:Point[],base:number,top:number,wall:Color,roof:Color){
  if(ring.length!==6)throw Error('Recheck the referenced Price Hall L-shaped footprint');
  const north=ring.reduce((best,p)=>p[1]>best[1]?p:best);
  const next=(offset:number)=>ring[(ring.indexOf(north)+offset+12)%6];
  const step=next(1)[0]>next(-1)[0]?-1:1;
  const [nw,sw,se,east,inside,ne]=[0,1,2,3,4,5].map(i=>next(step*i));
  const v=[sw[0]-nw[0],sw[1]-nw[1]],u=[ne[0]-nw[0],ne[1]-nw[1]];
  const across=((inside[0]-nw[0])*u[1]-(inside[1]-nw[1])*u[0])/(v[0]*u[1]-v[1]*u[0]);
  const split=mix(nw,sw,across);
  const main=surfaces(mesh,owner,[ne,inside,split,nw],base,top);
  main.block(0,0,1,1,0,.68,wall);main.gable(0,0,1,1,.68,1,roof,wall);
  const wing=surfaces(mesh,owner,[sw,se,east,split],base,top);
  wing.block(0,0,1,1,0,.58,wall);wing.block(0,0,1,1,.58,.61,metal);
  wing.wall(.72,-.001,.80,-.001,.25,.45,shade);
}

export function addFacilityElevation(mesh:Mesh,id:string,ring:Point[],owner:number,base:number,top:number):boolean {
  const profile=FACILITY_ELEVATIONS[id];
  if(!profile)return false;
  const {form,eaveFraction:eave}=profile,wall=rgb(profile.wall),roof=rgb(profile.roof);
  if(form==='price'){price(mesh,owner,ring,base,top,wall,roof);return true;}
  const front:Point=form==='mausoleum'||form==='softball'?[1,-1]:form==='wadsworth'?[0,1]:[1,0];
  const s=surfaces(mesh,owner,fourCorners(ring,front),base,top);
  if(form==='mausoleum'){mausoleum(s,wall,roof);return true;}
  if(form==='softball'){
    s.wall(0,0,1,0,0,.972,wall); s.wall(0,1,0,0,0,.972,wall); s.wall(1,1,0,1,0,.972,wall);
    s.wall(1,0,1,1,.705,.972,wall); s.wall(1,0,1,.15,0,.705,wall);
    s.wall(1,.15,1,.87,0,.57,wall); s.wall(1,.945,1,1,0,.705,wall);
    s.block(0,0,1,1,.972,1,roof);
    // The dark frame and glazing sit inside the outer concrete face. The
    // ribbon meets a full-height door recess on the same photographed wall.
    s.wall(.986,.15,.986,.87,.57,.705,shade);
    for(let i=0;i<8;i++)s.wall(.987,.157+i*.089,.987,.242+i*.089,.585,.69,glass);
    s.plate(.986,.15,1,.87,.57,wall);s.plate(.976,.15,1,.945,.705,wall);
    s.wall(.986,.15,1,.15,.57,.705,wall);s.wall(.976,.87,1,.87,0,.57,wall);
    s.wall(.976,.945,1,.945,0,.705,wall);s.wall(.976,.87,.976,.945,0,.705,shade);
    s.wall(.977,.877,.977,.936,0,.675,glass);
    return true;
  }
  const recessed=form==='bleeker'?.041:0;
  s.block(0,recessed,1,1,0,eave,wall);
  s.gable(0,0,1,1,eave,1,roof,form==='bleeker'?rgb('#846b56'):wall);
  if(form==='barnes'){
    s.wall(.39,-.001,.61,-.001,0,.54,shade);s.wall(.40,-.002,.52,-.002,0,.53,wall);
  }else if(form==='bleeker'){
    s.plate(0,0,1,recessed,eave,trim);
    for(const u of [.035,.965])s.block(u-.011,.004,u+.011,.008,0,eave,trim);
    s.wall(.43,recessed-.001,.58,recessed-.001,0,.44,door);
    s.wall(.62,recessed-.001,.85,recessed-.001,.30,.53,glass);
  }else{
    s.wall(1.0005,.38,1.0005,.60,.37,.62,trim);
    for(let i=0;i<4;i++)s.wall(1.001,.385+i*.054,1.001,.436+i*.054,.385,.605,glass);
    s.wall(1.001,.64,1.001,.70,0,.61,door);
    for(const v of [.31,.57]) {
      // Raised metal roof-light housings follow the west roof plane.
      const z=(u:number)=>eave+(1-eave)*2*u;
      for(const a of [v,v+.045])s.quad(s.vertex(.26,a,z(.26)),s.vertex(.44,a,z(.44)),s.vertex(.44,a,z(.44)+.025),s.vertex(.26,a,z(.26)+.025),metal);
      for(const u of [.26,.44])s.quad(s.vertex(u,v,z(u)),s.vertex(u,v+.045,z(u)),s.vertex(u,v+.045,z(u)+.025),s.vertex(u,v,z(u)+.025),metal);
      s.quad(s.vertex(.26,v,z(.26)+.025),s.vertex(.44,v,z(.44)+.025),s.vertex(.44,v+.045,z(.44)+.025),s.vertex(.26,v+.045,z(.26)+.025),trim);
    }
  }
  return true;
}

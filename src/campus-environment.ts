import type * as GeoJSON from 'geojson';

type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];
interface MeshWriter {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point],normals?:[Vertex,Vertex,Vertex]):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number):void;
}
export type CampusEnvironment = GeoJSON.FeatureCollection<GeoJSON.Point|GeoJSON.LineString, {id:string;version:number;kind:'tree'|'bench'|'lamp';[key:string]:unknown}>;
export interface EnvironmentCounts { trees:number; palms:number; broadleaf:number; conifers:number; benches:number; lamps:number }
export const ENVIRONMENT_BUILDING = -2;
export const ENVIRONMENT_VERTEX_KIND = 10;
export const emptyEnvironmentCounts = ():EnvironmentCounts=>({trees:0,palms:0,broadleaf:0,conifers:0,benches:0,lamps:0});

/** A malformed or missing local input fails the existing detail retry path. */
export function validateCampusEnvironment(value:unknown):CampusEnvironment {
  const data=value as CampusEnvironment;
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>1200)throw new Error('Campus environment input must contain at most 1,200 mapped features. Restore /data/stanford-environment.geojson and retry campus detail.');
  const ids=new Set<string>();
  for(const feature of data.features){
    const p=feature?.properties,geometry=feature?.geometry;
    const line=geometry?.type==='LineString',points=line&&Array.isArray(geometry.coordinates)?geometry.coordinates:geometry?.type==='Point'?[geometry.coordinates]:[];
    if(!p||!['tree','bench','lamp'].includes(p.kind)||ids.has(p.id)||!(line?p.kind==='bench'&&/^way\/\d+$/.test(p.id)&&points.length>=2&&points.length<=80:geometry?.type==='Point'&&/^node\/\d+$/.test(p.id))||points.some(point=>!Array.isArray(point)||point.length!==2||point.some(x=>!Number.isFinite(x))||point[0]<-122.19||point[0]>-122.15||point[1]<37.415||point[1]>37.445))throw new Error(`Campus environment feature ${String(p?.id??'unknown')} has an invalid identity, kind or Stanford coordinate. Restore the pinned environment input and retry campus detail.`);
    ids.add(p.id);
  }
  return data;
}

/** OSM direction describes the seated person's facing normal, not the long axis. */
export function benchFacing(properties:CampusEnvironment['features'][number]['properties']):number {
  const compass:Record<string,number>={N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
  const raw=properties.direction,cardinal=typeof raw==='string'?compass[raw.trim().toUpperCase()]:undefined;
  const numeric=typeof raw==='number'?raw:typeof raw==='string'&&/^\s*\d+(?:\.\d+)?\s*$/.test(raw)?Number(raw):NaN;
  const mapped=cardinal??numeric,fallback=Number(properties.modeledFacing);
  return Number.isFinite(mapped)&&mapped>=0&&mapped<=360?mapped:Number.isFinite(fallback)?fallback:0;
}

function variation(id:string):number {
  let value=2166136261;for(const c of id)value=Math.imul(value^c.charCodeAt(0),16777619);
  return (value>>>0)/4294967295;
}
function metres(value:unknown,fallback:number,low:number,high:number):number {
  const parsed=typeof value==='number'?value:typeof value==='string'&&/^\d+(\.\d+)?(?:\s*m)?$/.test(value)?Number(value.replace(/\s*m$/,'')):NaN;
  return Number.isFinite(parsed)&&parsed>0?Math.max(low,Math.min(high,parsed)):fallback;
}
export function environmentDimensions(properties:CampusEnvironment['features'][number]['properties']) {
  const seed=variation(properties.id);
  const palm=properties.leaf_type==='palm'||/Phoenix|Washingtonia|Yucca|palm/i.test(String(properties.species??properties.genus??''));
  const conifer=!palm&&properties.leaf_type==='needleleaved';
  const type=palm?'palm':conifer?'conifer':'broadleaf';
  const height=metres(properties.height,palm?11+seed*5:conifer?12+seed*4:7+seed*5,2,28);
  const radius=metres(properties.diameter_crown,palm?7.8:conifer?6:7.2,1.5,15)/2;
  return {type,height,radius:radius*(0.87+seed*0.25),seed};
}

/** Solid low-poly crowns have interpolated normals; no alpha sprites or per-tree draw. */
export function addCampusEnvironment(mesh:MeshWriter,data:CampusEnvironment,project:(coordinate:readonly number[])=>Point):EnvironmentCounts {
  const counts=emptyEnvironmentCounts();
  const triangle=(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind=ENVIRONMENT_VERTEX_KIND,normals?:[Vertex,Vertex,Vertex])=>mesh.triangle(a,b,c,tint,kind,ENVIRONMENT_BUILDING,undefined,normals);
  const quad=(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind=ENVIRONMENT_VERTEX_KIND)=>mesh.quad(a,b,c,d,tint,kind,ENVIRONMENT_BUILDING);
  const box=(at:(u:number,v:number,z:number)=>Vertex,u0:number,u1:number,v0:number,v1:number,z0:number,z1:number,color:Color)=>{
    const a=at(u0,v0,z0),b=at(u1,v0,z0),c=at(u1,v1,z0),d=at(u0,v1,z0),e=at(u0,v0,z1),f=at(u1,v0,z1),g=at(u1,v1,z1),h=at(u0,v1,z1);
    quad(a,b,f,e,color,12);quad(b,c,g,f,color,12);quad(c,d,h,g,color,12);quad(d,a,e,h,color,12);quad(e,f,g,h,color,12);quad(d,c,b,a,color,12);
  };
  const addBench=(feature:CampusEnvironment['features'][number])=>{
    const p=feature.properties,stone:Color=p.material==='stone'?[0.64,0.62,0.57]:[0.73,0.72,0.67];
    if(feature.geometry.type==='LineString'){
      const points=feature.geometry.coordinates.map(project),closed=points.length>2&&Math.hypot(points[0][0]-points.at(-1)![0],points[0][1]-points.at(-1)![1])<0.01;
      // As at a point, a mapped way of unknown seating material is a flat neutral marker along its real path, not an invented solid seat.
      const derived=p.benchModel==='quad-seat-wall',solid=derived||p.material==='stone'||p.material==='concrete'||p.material==='wood';
      const tone:Color=p.material==='wood'?[0.61,0.54,0.43]:stone;
      const width=derived?0.50:solid?0.48:0.38,half=width/2;
      const normals=points.map((point,i)=>{
        const previous=points[i===0?(closed?points.length-2:0):i-1],next=points[i===points.length-1?(closed?1:i):i+1];
        const normal=(a:Point,b:Point):Point=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]);return d>0?[(-(b[1]-a[1])/d),(b[0]-a[0])/d]:[0,0];};
        const a=normal(previous,point),b=normal(point,next),x=a[0]+b[0],y=a[1]+b[1],den=x*b[0]+y*b[1];
        return Math.abs(den)>0.25?[x/den,y/den] as Point:(i===0?b:a);
      });
      if(!solid){
        for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],na=normals[i-1],nb=normals[i];quad([a[0]+na[0]*half,a[1]+na[1]*half,0.025],[a[0]-na[0]*half,a[1]-na[1]*half,0.025],[b[0]-nb[0]*half,b[1]-nb[1]*half,0.025],[b[0]+nb[0]*half,b[1]+nb[1]*half,0.025],[0.58,0.60,0.57],12);}
        return;
      }
      // One back runs the whole way, on the side opposite the modeled facing read against the way's length-weighted normal.
      // A facing within about 15 degrees of the way's overall line gives no side, so a bent way's back goes on its outer side,
      // seats facing into the bend, and a straight way's on its right. Either side remains an estimate without a direction tag.
      // A closed ring's normals sum to rounding noise, as the generator also treats under 1e-9, so its back takes its outside.
      let leftX=0,leftY=0,turn=0;
      for(let i=1;i<points.length;i++){const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1];leftX-=dy;leftY+=dx;if(i>1)turn+=(points[i-1][0]-points[i-2][0])*dy-(points[i-1][1]-points[i-2][1])*dx;}
      const facing=benchFacing(p)*Math.PI/180,forward:Point=[Math.sin(facing),Math.cos(facing)];
      const leftLength=Math.hypot(leftX,leftY),cosine=leftLength>1e-9?(leftX*forward[0]+leftY*forward[1])/leftLength:0;
      const backOnLeft=Math.abs(cosine)>=0.25?cosine<0:turn<0;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],na=normals[i-1],nb=normals[i];
        const al:Vertex=[a[0]+na[0]*half,a[1]+na[1]*half,0.45],ar:Vertex=[a[0]-na[0]*half,a[1]-na[1]*half,0.45],bl:Vertex=[b[0]+nb[0]*half,b[1]+nb[1]*half,0.45],br:Vertex=[b[0]-nb[0]*half,b[1]-nb[1]*half,0.45];
        quad(al,ar,br,bl,tone,12);quad([al[0],al[1],0],[bl[0],bl[1],0],bl,al,tone,12);quad([br[0],br[1],0],[ar[0],ar[1],0],ar,br,tone,12);
        if(p.backrest==='yes'){
          // The line fixes the actual length/shape. Facing and this back's width/height remain estimates.
          // The 9 cm back is centred on the seat's mitred edge, so neighbouring segments share its corners and bends leave no gap.
          const side=backOnLeft?1:-1,at=(p:Point,n:Point,offset:number,z:number):Vertex=>[p[0]+side*n[0]*offset,p[1]+side*n[1]*offset,z];
          const ai=(z:number)=>at(a,na,half-0.045,z),ao=(z:number)=>at(a,na,half+0.045,z),bi=(z:number)=>at(b,nb,half-0.045,z),bo=(z:number)=>at(b,nb,half+0.045,z);
          // Mirroring the back to the right reverses its winding, so its faces are listed the other way round there and still face out.
          const face=(q:Vertex,r:Vertex,s:Vertex,t:Vertex)=>side>0?quad(q,r,s,t,tone,12):quad(t,s,r,q,tone,12);
          face(ai(0.45),bi(0.45),bi(0.91),ai(0.91));face(bo(0.45),ao(0.45),ao(0.91),bo(0.91));face(ai(0.91),bi(0.91),bo(0.91),ao(0.91));
          if(i===1&&!closed)face(ao(0.45),ai(0.45),ai(0.91),ao(0.91));
          if(i===points.length-1&&!closed)face(bi(0.45),bo(0.45),bo(0.91),bi(0.91));
        }
      }
      if(!closed)for(const i of [0,points.length-1]){const a=points[i],n=normals[i];quad([a[0]-n[0]*half,a[1]-n[1]*half,0],[a[0]+n[0]*half,a[1]+n[1]*half,0],[a[0]+n[0]*half,a[1]+n[1]*half,0.45],[a[0]-n[0]*half,a[1]-n[1]*half,0.45],tone,12);}
      return;
    }
    const [x,y]=project(feature.geometry.coordinates),angle=-benchFacing(p)*Math.PI/180;
    const at=(u:number,v:number,z:number):Vertex=>[x+Math.cos(angle)*u-Math.sin(angle)*v,y+Math.sin(angle)*u+Math.cos(angle)*v,z];
    const photographed=p.benchModel==='courtyard-teak',wood=p.material==='wood'||photographed;
    if(!wood&&p.material!=='concrete'&&p.material!=='stone'){
      // An unsurveyed bench is a flat neutral map marker, not an invented wood/metal design.
      quad(at(-0.8,-0.19,0.025),at(0.8,-0.19,0.025),at(0.8,0.19,0.025),at(-0.8,0.19,0.025),[0.58,0.60,0.57],12);return;
    }
    const seat:Color=wood?[0.61,0.54,0.43]:stone,frame:Color=photographed?seat:[0.48,0.49,0.46];
    const half=photographed?0.915:0.90;
    if(photographed){
      for(let i=0;i<5;i++)box(at,-half,half,-0.25+i*0.105,-0.165+i*0.105,0.42,0.46,seat);
      for(const u of [-0.81,0.81])for(const v of [-0.23,0.23])box(at,u-0.045,u+0.045,v-0.045,v+0.045,0,v<0?0.94:0.67,seat);
      for(const z of [0.52,0.87])box(at,-half,half,-0.28,-0.20,z,z+0.07,seat);
      for(let i=0;i<9;i++){const u=-0.72+i*0.18;box(at,u-0.022,u+0.022,-0.26,-0.22,0.57,0.87,seat);}
      for(const u of [-0.84,0.84]){
        // A three-section rounded-down arm profile from the actual courtyard photograph.
        box(at,u-0.055,u+0.055,-0.24,0.08,0.67,0.73,seat);box(at,u-0.055,u+0.055,0.08,0.22,0.66,0.72,seat);box(at,u-0.055,u+0.055,0.22,0.29,0.63,0.70,seat);
      }
    }else{
      box(at,-half,half,-0.24,0.24,0.41,0.46,seat);
      // Source material identifies the seating only. Neutral supports are explicitly modeled, not tagged metal/wood.
      for(const u of [-0.64,0.64])box(at,u-0.08,u+0.08,-0.20,0.20,0,0.41,frame);
      if(p.backrest==='yes')box(at,-half,half,-0.27,-0.20,0.46,0.91,seat);
    }
  };
  const cylinder=(x:number,y:number,radius:number,bottom:number,top:number,tint:Color,sides=6)=>{
    for(let i=0;i<sides;i++){const a=i*2*Math.PI/sides,b=(i+1)*2*Math.PI/sides;quad([x+Math.cos(a)*radius,y+Math.sin(a)*radius,bottom],[x+Math.cos(b)*radius,y+Math.sin(b)*radius,bottom],[x+Math.cos(b)*radius,y+Math.sin(b)*radius,top],[x+Math.cos(a)*radius,y+Math.sin(a)*radius,top],tint,11);}
  };
  const crown=(x:number,y:number,z:number,rx:number,ry:number,rz:number,tint:Color,seed:number)=>{
    const sides=8,levels=[-Math.PI/2,-Math.PI/6,Math.PI/6,Math.PI/2];
    const point=(i:number,latitude:number):Vertex=>{const angle=i*2*Math.PI/sides+seed*2;return [x+rx*Math.cos(angle)*Math.cos(latitude),y+ry*Math.sin(angle)*Math.cos(latitude),z+rz*Math.sin(latitude)];};
    const normal=(p:Vertex):Vertex=>[(p[0]-x)/(rx*rx),(p[1]-y)/(ry*ry),(p[2]-z)/(rz*rz)];
    for(let level=0;level<levels.length-1;level++)for(let i=0;i<sides;i++){
      const a=point(i,levels[level]),b=point(i+1,levels[level]),c=point(i+1,levels[level+1]),d=point(i,levels[level+1]);
      const shade=(0.94+0.06*Math.sin(i*2.4+seed*9));const color=tint.map(v=>v*shade) as Color;
      triangle(a,b,c,color,10,[normal(a),normal(b),normal(c)]);triangle(a,c,d,color,10,[normal(a),normal(c),normal(d)]);
    }
  };
  for(const feature of data.features){
    const p=feature.properties;
    if(p.kind==='bench'){counts.benches++;addBench(feature);continue;}
    if(feature.geometry.type!=='Point')continue;
    const [x,y]=project(feature.geometry.coordinates);
    if(p.kind==='tree'){
      const {type,height,radius,seed}=environmentDimensions(p);counts.trees++;
      const bark:Color=type==='palm'?[0.56,0.48,0.35]:[0.45,0.40,0.31];
      const trunk=type==='palm'?0.35:0.19+seed*0.09;
      cylinder(x,y,trunk,0,height*(type==='palm'?0.88:0.60),bark);
      // A narrow mulch collar makes the root legible without inventing a garden.
      for(let i=0;i<8;i++){const a=i*Math.PI/4,b=(i+1)*Math.PI/4;triangle([x,y,0.035],[x+Math.cos(a)*0.53,y+Math.sin(a)*0.53,0.035],[x+Math.cos(b)*0.53,y+Math.sin(b)*0.53,0.035],[0.52,0.49,0.37],12);}
      if(type==='palm'){
        counts.palms++;
        // Feather-like arching fronds, arranged in two alternating crown tiers.
        for(let i=0;i<12;i++){
          const angle=i*Math.PI/6+seed*2.1,dx=Math.cos(angle),dy=Math.sin(angle),tier=i%2;
          const frondRadius=radius*(tier?0.8:1.08),z=height*(tier?0.96:0.90),tip=height*(tier?0.80:0.70),width=0.68;
          const a:Vertex=[x,y,height*0.85],b:Vertex=[x+dx*frondRadius*0.54-dy*width,y+dy*frondRadius*0.54+dx*width,z],c:Vertex=[x+dx*frondRadius,y+dy*frondRadius,tip],d:Vertex=[x+dx*frondRadius*0.54+dy*width,y+dy*frondRadius*0.54-dx*width,z];
          const color:Color=tier?[0.37,0.47,0.27]:[0.31,0.43,0.26];
          triangle(a,b,c,color);triangle(a,c,d,color);
        }
        crown(x,y,height*0.87,0.7,0.7,0.8,[0.38,0.45,0.24],seed);
      }else if(type==='conifer'){
        counts.conifers++;
        for(let tier=0;tier<3;tier++)for(let i=0;i<8;i++){
          const a=i*Math.PI/4+seed,b=(i+1)*Math.PI/4+seed,r=radius*(1-tier*0.22),bottom=height*(0.30+tier*0.18),top=height*(0.69+tier*0.15);
          triangle([x+Math.cos(a)*r,y+Math.sin(a)*r,bottom],[x+Math.cos(b)*r,y+Math.sin(b)*r,bottom],[x,y,top],[0.32+tier*0.015,0.43+tier*0.015,0.34]);
        }
      }else{
        counts.broadleaf++;
        const evergreen=p.leaf_cycle==='evergreen',green:Color=evergreen?[0.39,0.49,0.31]:[0.49,0.59,0.35];
        crown(x,y,height*0.68,radius,radius*(0.86+seed*0.20),height*0.32,green,seed);
      }
    }else{
      counts.lamps++;
      cylinder(x,y,0.085,0,3.6,[0.37,0.41,0.35],4);
      crown(x,y,3.72,0.24,0.24,0.27,[0.91,0.90,0.76],0);
    }
  }
  return counts;
}

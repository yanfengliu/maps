import type * as GeoJSON from 'geojson';

type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];
interface MeshWriter {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point],normals?:[Vertex,Vertex,Vertex]):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number):void;
}
export type CampusEnvironment = GeoJSON.FeatureCollection<GeoJSON.Point, {id:string;version:number;kind:'tree'|'bench'|'lamp';[key:string]:unknown}>;
export interface EnvironmentCounts { trees:number; palms:number; broadleaf:number; conifers:number; benches:number; lamps:number }
export const ENVIRONMENT_BUILDING = -2;
export const ENVIRONMENT_VERTEX_KIND = 10;
export const emptyEnvironmentCounts = ():EnvironmentCounts=>({trees:0,palms:0,broadleaf:0,conifers:0,benches:0,lamps:0});

/** A malformed or missing local input fails the existing detail retry path. */
export function validateCampusEnvironment(value:unknown):CampusEnvironment {
  const data=value as CampusEnvironment;
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length>1200)throw new Error('Campus environment input must contain at most 1,200 mapped point features. Restore /data/stanford-environment.geojson and retry campus detail.');
  const ids=new Set<string>();
  for(const feature of data.features){
    const p=feature?.properties,point=feature?.geometry?.coordinates;
    if(feature?.geometry?.type!=='Point'||!Array.isArray(point)||point.length!==2||point.some(x=>!Number.isFinite(x))||point[0]<-122.19||point[0]>-122.15||point[1]<37.415||point[1]>37.445||!p||!/^node\/\d+$/.test(p.id)||ids.has(p.id)||!['tree','bench','lamp'].includes(p.kind))throw new Error(`Campus environment feature ${String(p?.id??'unknown')} has an invalid identity, kind or Stanford coordinate. Restore the pinned environment input and retry campus detail.`);
    ids.add(p.id);
  }
  return data;
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
    const p=feature.properties,[x,y]=project(feature.geometry.coordinates);
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
    }else if(p.kind==='bench'){
      counts.benches++;
      const direction=Number(p.direction),angle=Number.isFinite(direction)?(90-direction)*Math.PI/180:Number(p.modeledOrientation)||0;
      const at=(u:number,v:number,z:number):Vertex=>[x+Math.cos(angle)*u-Math.sin(angle)*v,y+Math.sin(angle)*u+Math.cos(angle)*v,z];
      const wood:Color=[0.59,0.49,0.36],metal:Color=[0.32,0.37,0.31];
      for(let i=0;i<3;i++){const v=-0.26+i*0.18;quad(at(-0.95,v,0.48),at(0.95,v,0.48),at(0.95,v+0.13,0.48),at(-0.95,v+0.13,0.48),wood,12);}
      if(p.backrest!=='no')for(let i=0;i<2;i++){const z=0.61+i*0.19;quad(at(-0.95,0.26,z),at(0.95,0.26,z),at(0.95,0.26,z+0.13),at(-0.95,0.26,z+0.13),wood,12);}
      for(const u of [-0.65,0.65])for(const v of [-0.19,0.19])quad(at(u-0.035,v,0),at(u+0.035,v,0),at(u+0.035,v,0.47),at(u-0.035,v,0.47),metal,12);
    }else{
      counts.lamps++;
      cylinder(x,y,0.085,0,3.6,[0.37,0.41,0.35],4);
      crown(x,y,3.72,0.24,0.24,0.27,[0.91,0.90,0.76],0);
    }
  }
  return counts;
}

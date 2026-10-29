import type * as GeoJSON from 'geojson';
import earcut from 'earcut';

type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];
interface MeshWriter {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point],normals?:[Vertex,Vertex,Vertex]):void;
}
export type SculptureModel = 'burghers-of-calais' | 'angel-of-grief';
export interface SculptureProperties { id:string;version:number;name:string;artist:string;material:string;model:SculptureModel;orientation:number }
export type CampusSculptures = GeoJSON.FeatureCollection<GeoJSON.Point,SculptureProperties>;
export interface SculptureCounts { works:number;figures:number;triangles:number }
export const emptySculptureCounts=():SculptureCounts=>({works:0,figures:0,triangles:0});

/** Deliberately finite, curated works. This input is not a generic statue generator. */
export function validateCampusSculptures(value:unknown):CampusSculptures {
  const data=value as CampusSculptures;
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features)||data.features.length!==2)throw new Error('Campus sculpture /data/stanford-sculptures.geojson must contain the two reviewed Stanford artworks. Restore the pinned sculpture input and retry campus detail.');
  const models=new Set<string>(),ids=new Set<string>();
  for(const feature of data.features){
    const p=feature?.properties,point=feature?.geometry?.coordinates;
    if(feature?.geometry?.type!=='Point'||!Array.isArray(point)||point.length!==2||point.some(n=>!Number.isFinite(n))||point[0]<-122.19||point[0]>-122.15||point[1]<37.415||point[1]>37.445||!p||!/^node\/\d+$/.test(p.id)||ids.has(p.id)||!['burghers-of-calais','angel-of-grief'].includes(p.model)||models.has(p.model)||!Number.isInteger(p.version)||p.version<1||!Number.isFinite(p.orientation)||Math.abs(p.orientation)>360||[p.name,p.artist,p.material].some(s=>typeof s!=='string'||!s.trim()))throw new Error(`Campus sculpture ${String(p?.id??'unknown')} has an invalid identity, model, material or Stanford coordinate. Restore the reviewed sculpture input and retry campus detail.`);
    ids.add(p.id);models.add(p.model);
  }
  return data;
}

const cross=(a:Vertex,b:Vertex):Vertex=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const subtract=(a:Vertex,b:Vertex):Vertex=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const unit=(a:Vertex):Vertex=>{const length=Math.hypot(...a);return a.map(n=>n/length) as Vertex;};

function sculptureWriter(mesh:MeshWriter,origin:Point,orientation:number,counts:SculptureCounts){
  const angle=orientation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const rotate=(p:Vertex):Vertex=>[c*p[0]-s*p[1],s*p[0]+c*p[1],p[2]];
  const at=(p:Vertex):Vertex=>{const q=rotate(p);return [origin[0]+q[0],origin[1]+q[1],q[2]];};
  const triangle=(a:Vertex,b:Vertex,d:Vertex,tint:Color,normals?:[Vertex,Vertex,Vertex])=>{
    if(Math.hypot(...cross(subtract(b,a),subtract(d,a)))<1e-8)return;
    mesh.triangle(at(a),at(b),at(d),tint,12,-2,undefined,normals?.map(rotate) as [Vertex,Vertex,Vertex]|undefined);counts.triangles++;
  };
  const quad=(a:Vertex,b:Vertex,d:Vertex,e:Vertex,tint:Color)=>{triangle(a,b,d,tint);triangle(a,d,e,tint);};
  const box=(center:Vertex,size:Vertex,tint:Color)=>{
    const [x,y,z]=center,[rx,ry,rz]=size.map(n=>n/2),p=(i:number,j:number,k:number):Vertex=>[x+i*rx,y+j*ry,z+k*rz];
    quad(p(-1,-1,-1),p(1,-1,-1),p(1,1,-1),p(-1,1,-1),tint);quad(p(-1,-1,1),p(-1,1,1),p(1,1,1),p(1,-1,1),tint);
    for(const i of [-1,1]){quad(p(i,-1,-1),p(i,1,-1),p(i,1,1),p(i,-1,1),tint);quad(p(-1,i,-1),p(1,i,-1),p(1,i,1),p(-1,i,1),tint);}
  };
  const ellipsoid=(center:Vertex,radii:Vertex,tint:Color,pitch=0,sides=8)=>{
    const cp=Math.cos(pitch),sp=Math.sin(pitch),orient=(p:Vertex):Vertex=>[p[0],p[1]*cp-p[2]*sp,p[1]*sp+p[2]*cp];
    const point=(i:number,j:number):Vertex=>{const longitude=i*2*Math.PI/sides,latitude=-Math.PI/2+j*Math.PI/4;return [Math.cos(longitude)*Math.cos(latitude)*radii[0],Math.sin(longitude)*Math.cos(latitude)*radii[1],Math.sin(latitude)*radii[2]];};
    const world=(p:Vertex):Vertex=>{const q=orient(p);return q.map((n,i)=>n+center[i]) as Vertex;};
    const normal=(p:Vertex):Vertex=>orient(unit(p.map((n,i)=>n/(radii[i]*radii[i])) as Vertex));
    for(let j=0;j<4;j++)for(let i=0;i<sides;i++){
      const a=point(i,j),b=point(i+1,j),d=point(i+1,j+1),e=point(i,j+1);
      triangle(world(a),world(b),world(d),tint,[normal(a),normal(b),normal(d)]);triangle(world(a),world(d),world(e),tint,[normal(a),normal(d),normal(e)]);
    }
  };
  const tube=(points:Vertex[],radii:number[],tint:Color,sides=6)=>{
    for(let segment=0;segment<points.length-1;segment++){
      const a=points[segment],b=points[segment+1],axis=unit(subtract(b,a));
      const u=unit(cross(axis,Math.abs(axis[2])>0.9?[0,1,0]:[0,0,1])),v=cross(axis,u);
      const normal=(i:number):Vertex=>{const angle=i*Math.PI*2/sides;return u.map((n,k)=>n*Math.cos(angle)+v[k]*Math.sin(angle)) as Vertex;};
      const p=(center:Vertex,radius:number,i:number):Vertex=>{const n=normal(i);return center.map((x,k)=>x+n[k]*radius) as Vertex;};
      for(let i=0;i<sides;i++){
        const n=normal(i),next=normal(i+1),a0=p(a,radii[segment],i),a1=p(a,radii[segment],i+1),b0=p(b,radii[segment+1],i),b1=p(b,radii[segment+1],i+1);
        triangle(a0,a1,b1,tint,[n,next,next]);triangle(a0,b1,b0,tint,[n,next,n]);
        if(segment===0)triangle(a,a1,a0,tint);
        if(segment===points.length-2)triangle(b,b0,b1,tint);
      }
    }
  };
  return {triangle,quad,box,ellipsoid,tube};
}

export function addCampusSculptures(mesh:MeshWriter,data:CampusSculptures,project:(coordinate:readonly number[])=>Point):SculptureCounts {
  const counts=emptySculptureCounts();
  for(const feature of data.features){
    const writer=sculptureWriter(mesh,project(feature.geometry.coordinates),feature.properties.orientation,counts);
    if(feature.properties.model==='burghers-of-calais')addBurghers(writer);
    else addAngel(writer);
    counts.works++;counts.figures+=feature.properties.model==='burghers-of-calais'?6:1;
  }
  return counts;
}
type SculptureWriter=ReturnType<typeof sculptureWriter>;

/** Six separate plinths and differing gestures, not six copies of one person. */
function addBurghers(writer:SculptureWriter):void {
  const bronze:Color=[0.29,0.31,0.27],edge:Color=[0.32,0.34,0.29],shadow:Color=[0.21,0.24,0.21];
  const poses=[
    {x:-1.75,y:0.95,yaw:2.8,hem:0.26,bend:-0.05,arms:[[[0.31,0,1.78],[0.39,0.09,1.20],[0.44,0.13,0.86]],[[-0.31,0,1.78],[-0.40,0.03,1.26],[-0.37,0.12,0.93]]]},
    {x:-0.68,y:-1.40,yaw:-0.55,hem:0.20,bend:0.19,arms:[[[0.31,0,1.78],[0.48,0.35,1.64],[0.13,0.31,2.10]],[[-0.31,0,1.78],[-0.47,0.30,1.56],[-0.12,0.35,2.08]]]},
    {x:-0.12,y:0.50,yaw:3.05,hem:0.18,bend:0.10,arms:[[[0.31,0,1.78],[0.39,0.03,1.30],[0.29,0.12,0.98]],[[-0.31,0,1.78],[-0.41,0.08,1.30],[-0.41,0.20,0.96]]]},
    {x:0.68,y:1.55,yaw:-1.35,hem:0.56,bend:0.25,arms:[[[0.31,0,1.78],[0.47,0.25,1.62],[0.15,0.39,2.06]],[[-0.31,0,1.78],[-0.40,0.03,1.18],[-0.37,0.13,0.84]]]},
    {x:1.52,y:-1.10,yaw:-0.18,hem:0.76,bend:0.02,arms:[[[0.31,0,1.78],[0.46,0.12,2.00],[0.31,0.31,2.20]],[[-0.31,0,1.78],[-0.42,0.10,1.25],[-0.36,0.19,0.99]]]},
    {x:2.24,y:0.20,yaw:0.53,hem:0.36,bend:0.02,arms:[[[0.31,0,1.78],[0.40,0.11,1.30],[0.32,0.27,1.01]],[[-0.31,0,1.78],[-0.48,0.06,1.31],[-0.59,0.16,0.96]]]}
  ];
  for(const [index,pose] of poses.entries()){
    const ca=Math.cos(pose.yaw),sa=Math.sin(pose.yaw);
    const p=(point:readonly number[]):Vertex=>[pose.x+point[0]*ca-point[1]*sa,pose.y+point[0]*sa+point[1]*ca,point[2]+0.13];
    writer.box([pose.x,pose.y,0.065],[1.10,1.02,0.13],shadow);
    // The silhouette folds are actual volume, with a separate shoulder line,
    // waist and irregular robe hem. All dimensions remain authored estimates.
    const levels=[[pose.hem,0.31,0.25],[1.04,0.26,0.19],[1.45,0.30,0.21],[1.78,0.34,0.19],[1.87,0.18,0.12]];
    const robe=(level:number,i:number):Vertex=>{
      const [z,rx,ry]=levels[level],a=i*Math.PI/6,fold=1+(i%2?0.10:-0.09);
      return p([Math.cos(a)*rx*fold,Math.sin(a)*ry*fold+pose.bend*(z-0.3)/1.6,z+(level===0?Math.sin(i*1.7+index)*0.06:0)]);
    };
    for(let j=0;j<levels.length-1;j++)for(let i=0;i<12;i++)writer.quad(robe(j,i),robe(j,i+1),robe(j+1,i+1),robe(j+1,i),i%2?bronze:edge);
    const head:Vertex=[0,pose.bend+0.02,2.035];
    writer.tube([p([0,pose.bend,1.80]),p([0,pose.bend,1.97])],[0.11,0.10],bronze);
    writer.ellipsoid(p(head),[0.125,0.135,0.18],bronze,-pose.bend*1.8);
    // A brow, projecting nose and beard plane prevent featureless ball heads.
    const faceY=head[1]+0.125,faceZ=head[2]-0.03;
    writer.triangle(p([-0.04,faceY,faceZ+0.06]),p([0.04,faceY,faceZ+0.06]),p([0,faceY+0.07,faceZ-0.02]),edge);
    writer.triangle(p([-0.04,faceY,faceZ+0.06]),p([0,faceY+0.07,faceZ-0.02]),p([0,faceY,faceZ-0.06]),bronze);
    writer.triangle(p([0.04,faceY,faceZ+0.06]),p([0,faceY,faceZ-0.06]),p([0,faceY+0.07,faceZ-0.02]),shadow);
    writer.triangle(p([-0.075,faceY,faceZ-0.05]),p([0.075,faceY,faceZ-0.05]),p([0,faceY-0.03,faceZ-0.17]),shadow);
    for(const arm of pose.arms){
      writer.tube(arm.map(p),[0.115,0.086,0.062],bronze);
      const hand=arm[2];writer.ellipsoid(p([hand[0],hand[1]+0.01,hand[2]+0.025]),[0.075,0.048,0.105],edge,0,6);
    }
    for(const side of [-1,1]){
      const step=index===4?side*0.22:index===5?side*0.20:0;
      writer.tube([p([side*0.15,0.02,0.88]),p([side*0.17,step,0.45]),p([side*0.19,step+0.07,0.10])],[0.12,0.095,0.065],bronze);
      writer.ellipsoid(p([side*0.19,step+0.16,0.055]),[0.09,0.20,0.065],bronze,0,6);
    }
  }
}

function addAngel(writer:SculptureWriter):void {
  const marble:Color=[0.87,0.86,0.80],edge:Color=[0.92,0.91,0.85],relief:Color=[0.79,0.79,0.72];
  // Broad masonry steps, flared altar body and two projecting cornices.
  writer.box([0,0,0.13],[3.2,2.65,0.26],marble);
  writer.box([0,0,0.36],[2.75,2.28,0.20],marble);
  writer.box([0,0,0.68],[2.38,1.98,0.45],relief);
  writer.box([0,0,0.98],[2.20,1.82,0.16],edge);
  const level=(width:number,depth:number,z:number):Vertex[]=>[[-width/2,-depth/2,z],[width/2,-depth/2,z],[width/2,depth/2,z],[-width/2,depth/2,z]];
  const low=level(1.86,1.62,1.06),middle=level(1.08,1.00,2.25),top=level(1.35,1.16,2.46);
  for(let i=0;i<4;i++){const next=(i+1)%4;writer.quad(low[i],low[next],middle[next],middle[i],marble);writer.quad(middle[i],middle[next],top[next],top[i],edge);}
  writer.box([0,0,2.50],[1.48,1.30,0.12],edge);
  writer.box([0,0,2.61],[1.58,1.38,0.10],marble);
  // Shallow floral garlands on the front altar, instead of an unadorned box.
  for(const side of [-1,1])for(let i=0;i<5;i++){
    const z=1.30+i*0.16,y=0.81-(z-1.06)*0.26;
    writer.ellipsoid([side*(0.13+i*0.055),y+0.025,z],[0.095,0.035,0.055],edge,0,6);
  }
  // The draped torso is nearly horizontal across the top, with its head bowed
  // into the crook of one arm and the other hand hanging down the altar face.
  writer.ellipsoid([0,-0.54,2.58],[0.34,0.35,0.55],marble,-0.66);
  writer.ellipsoid([0,-0.15,2.87],[0.34,0.56,0.24],marble,0.22);
  writer.ellipsoid([-0.07,0.34,2.88],[0.19,0.22,0.25],marble,-0.70);
  writer.tube([[0.28,-0.11,2.87],[0.48,0.37,2.70],[0.43,0.75,2.24]],[0.125,0.10,0.075],marble);
  writer.ellipsoid([0.43,0.77,2.17],[0.075,0.07,0.16],edge,0,6);
  writer.tube([[-0.29,-0.10,2.86],[-0.47,0.33,2.75],[-0.12,0.50,2.73]],[0.12,0.105,0.075],marble);
  // The two long folded wings curve above the shoulders then fall to the base.
  // This closed outline comes from the inspected side photographs; no texture.
  const outline:Point[]=[[0.18,2.72],[0.25,3.05],[0.50,3.32],[0.77,3.39],[0.82,3.31],[0.68,3.21],[0.74,2.93],[0.88,2.57],[0.98,2.14],[1.08,1.70],[1.23,1.24],[1.49,0.94],[1.59,0.91],[1.50,0.85],[1.20,1.00],[0.98,1.30],[0.76,1.81],[0.56,2.26],[0.34,2.52]];
  const indices=earcut(outline.flat(),undefined,2);
  for(const side of [-1,1]){
    const at=(p:Point,back=false):Vertex=>[side*p[0],-0.55-(3.4-p[1])*0.12+(back?-0.06:0.06),p[1]];
    for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(n=>outline[n]);writer.triangle(at(a),at(b),at(c),edge);writer.triangle(at(c,true),at(b,true),at(a,true),marble);}
    for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];writer.quad(at(a),at(a,true),at(b,true),at(b),marble);}
    // Three overlapping tapered feather ridges run down each folded wing.
    for(let i=0;i<3;i++){
      const a:Vertex=[side*(0.43+i*0.095),-0.45,2.93-i*0.15],b:Vertex=[side*(0.76+i*0.11),-0.54,1.86-i*0.18],c:Vertex=[side*(0.95+i*0.14),-0.68,1.28-i*0.10];
      writer.tube([a,b,c],[0.075,0.060,0.008],relief,4);
    }
  }
}

import type {CampusEnvironment} from './campus-environment.ts';
import {QUAD_PLANTING_REFERENCE,QUAD_SPECIES,type ReferencePlant} from './quad-planting-reference.ts';
export {quadPlantingCoverage} from './quad-planting-reference.ts';

type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface MeshWriter {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point],normals?:[Vertex,Vertex,Vertex]):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number):void;
}
export interface LocatedPlant extends ReferencePlant {position:Point}
export interface PlantingCircle {number:number;sourceId:string;ring:Point[];center:Point;radius:number;plants:LocatedPlant[]}
const inside=(p:Point,ring:Point[])=>{
  let hits=0;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hits++;
  }return hits%2===1;
};
const centerOf=(ring:Point[]):Point=>{
  let area=0,x=0,y=0;for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],cross=a[0]*b[1]-b[0]*a[1];area+=cross;x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;
  }return [x/(3*area),y/(3*area)];
};
const distance=(p:Point,a:Point,b:Point)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
};

/** The source diagram uses campus axes. Its east runs circle 8 -> 5, and its
 * north runs circle 4 -> 8; true compass north is not the image's vertical axis. */
export function locateQuadPlantings(data:CampusEnvironment,project:(p:readonly number[])=>Point):PlantingCircle[]{
  const rings=QUAD_PLANTING_REFERENCE.map(ref=>{
    const f=data.features.find(f=>f.properties.id===ref.sourceId&&f.properties.benchModel==='quad-seat-wall');
    return f?.geometry.type==='LineString'?f.geometry.coordinates.slice(0,-1).map(project):null;
  });
  // Unit/small-source callers still render their supplied features. A reference
  // reconstruction is only possible when the complete set of eight anchors exists.
  if(rings.some(r=>!r))return [];
  const centers=rings.map(r=>centerOf(r!)),a=centers[7],b=centers[4],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const east:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length],north:Point=[-east[1],east[0]];
  if(!Number.isFinite(length)||length<50||(a[0]-centers[3][0])*north[0]+(a[1]-centers[3][1])*north[1]<10)throw new Error('Quad planting anchors no longer match the reference map orientation. Review the eight mapped rings.');
  return QUAD_PLANTING_REFERENCE.map((ref,i)=>{
    const ring=rings[i]!,center=centers[i];
    // An inscribed radius accommodates minor OSM ring irregularity and leaves
    // root/trunk clearance inside the 0.50 m seating wall; crowns may overhang.
    const radius=Math.min(...ring.map((p,j)=>distance(center,p,ring[(j+1)%ring.length])))-0.5;
    if(!Number.isFinite(radius)||radius<4||radius>12)throw new Error('Quad planting ring size changed. Review the dated planting reference before rendering.');
    const plants=ref.plants.map(p=>({...p,position:[center[0]+radius*(east[0]*p.u+north[0]*p.v),center[1]+radius*(east[1]*p.u+north[1]*p.v)] as Point}));
    if(plants.some(p=>!inside(p.position,ring)))throw new Error('A reference planting lies outside its mapped island. Review diagram alignment.');
    return {number:ref.number,sourceId:ref.sourceId,ring,center,radius,plants};
  });
}

/** No new material, draw call or geographic source: append to the batched
 * environment mesh, using the established leaf/bark/plain kinds and sentinel. */
export function addQuadPlantings(mesh:MeshWriter,data:CampusEnvironment,project:(p:readonly number[])=>Point){
  const circles=locateQuadPlantings(data,project),counts={trees:0,palms:0,broadleaf:0,conifers:0};
  const triangle=(a:Vertex,b:Vertex,c:Vertex,color:Color,kind=10,normals?:[Vertex,Vertex,Vertex])=>mesh.triangle(a,b,c,color,kind,-2,undefined,normals);
  const quad=(a:Vertex,b:Vertex,c:Vertex,d:Vertex,color:Color,kind=10)=>mesh.quad(a,b,c,d,color,kind,-2);
  const taper=(x:number,y:number,levels:[number,number][],color:Color)=>{
    for(let j=1;j<levels.length;j++)for(let i=0;i<6;i++){
      const a=i*Math.PI/3,b=(i+1)*Math.PI/3,[z0,r0]=levels[j-1],[z1,r1]=levels[j];
      quad([x+Math.cos(a)*r0,y+Math.sin(a)*r0,z0],[x+Math.cos(b)*r0,y+Math.sin(b)*r0,z0],[x+Math.cos(b)*r1,y+Math.sin(b)*r1,z1],[x+Math.cos(a)*r1,y+Math.sin(a)*r1,z1],color,11);
    }
  };
  const lobe=(x:number,y:number,z:number,r:number,rz:number,color:Color,rotation:number)=>{
    const normal=(p:Vertex):Vertex=>[(p[0]-x)/(r*r),(p[1]-y)/(r*r),(p[2]-z)/(rz*rz)];
    const point=(a:number,side:number):Vertex=>[x+Math.cos(a)*r*0.866,y+Math.sin(a)*r*0.866,z+rz*side*0.5];
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+rotation,b=(i+1)*Math.PI/3+rotation;
      const p=point(a,-1),q=point(b,-1),s=point(a,1),t=point(b,1),top:Vertex=[x,y,z+rz],bottom:Vertex=[x,y,z-rz];
      triangle(q,p,bottom,color,10,[normal(q),normal(p),normal(bottom)]);
      triangle(p,q,t,color,10,[normal(p),normal(q),normal(t)]);triangle(p,t,s,color,10,[normal(p),normal(t),normal(s)]);
      triangle(s,t,top,color,10,[normal(s),normal(t),normal(top)]);
    }
  };
  for(const circle of circles){
    const {center,ring}=circle;
    // Groundcover species are stated in the diagram, but their exact patch
    // boundaries are not surveyed. One continuous tone avoids making the
    // triangulation read as a fictitious radial planting pattern.
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],inset=(p:Point):Vertex=>[center[0]+(p[0]-center[0])*0.965,center[1]+(p[1]-center[1])*0.965,0.065];
      triangle([center[0],center[1],0.065],inset(a),inset(b),[0.38,0.45,0.30],12);
    }
    for(const plant of circle.plants){
      const species=QUAD_SPECIES[plant.code],{shape,height:h,radius:r}=species,[x,y]=plant.position;
      const rotation=(Number(plant.id.split('/').at(-1))*2.399963+circle.number)%6.283185;
      const green:Color=species.silver?[0.48,0.56,0.46]:shape==='cycad'?[0.27,0.40,0.24]:[0.33,0.46,0.28],bark:Color=[0.47,0.42,0.32];
      counts.trees++;
      if(shape==='fan'||shape==='feather')counts.palms++;else if(species.conifer)counts.conifers++;else counts.broadleaf++;
      if(shape==='fan'||shape==='feather'){
        const trunk=plant.code==='PHca'?0.48:plant.code==='WAro'?0.20:0.30;
        const crownBase=shape==='fan'?h-r*0.45:h*0.87;
        taper(x,y,[[0,trunk*1.15],[crownBase,trunk*0.78]],bark);
        if(shape==='fan'){
          // Stanford's Washingtonia references show a rounded crown of upright,
          // outward and hanging fan fronds, not a horizontal ring of paddles.
          // Each fan bends at a mid-rib into a drooping, three-part pleated edge.
          // Exact pruning and leaflet counts remain estimated; no dead-frond skirt
          // is assumed for an individual whose current trimming is unverified.
          lobe(x,y,crownBase,r*0.25,r*0.22,green,rotation);
          for(let tier=0;tier<3;tier++)for(let j=0;j<6;j++){
            const angle=rotation+j*Math.PI/3+tier*0.43,dx=Math.cos(angle),dy=Math.sin(angle);
            const elevation=[0.88,0.10,-0.72][tier],along=Math.cos(elevation),rise=Math.sin(elevation);
            const at=(forward:number,side:number,droop=0):Vertex=>[x+r*(dx*forward*along-dy*side),y+r*(dy*forward*along+dx*side),Math.min(h,crownBase+r*(forward*rise-droop))];
            const hub=at(0.28,0),tint=green.map(v=>v*(tier===2?0.93:1)) as Color;
            triangle(at(0,-0.018),hub,at(0,0.018),tint);
            const rays=[-1.30,-0.43,0.43,1.30];
            const mid=rays.map(phi=>at(0.28+0.36*Math.cos(phi),0.36*Math.sin(phi),-0.06));
            const edge=rays.map(phi=>at(0.28+0.72*Math.cos(phi),0.72*Math.sin(phi),0.20+0.035*Math.cos(phi)));
            for(let k=0;k<rays.length-1;k++){
              triangle(hub,mid[k],mid[k+1],tint);
              quad(mid[k],edge[k],edge[k+1],mid[k+1],tint);
            }
          }
        }else{
          // Long arching pinnate silhouettes contrast with the separate fans.
          for(let j=0;j<10;j++){
            const angle=rotation+j*Math.PI/5,dx=Math.cos(angle),dy=Math.sin(angle),short=j%2===0?1:0.83;
            const at=(along:number,side:number,z:number):Vertex=>[x+dx*along*r*short-dy*side,y+dy*along*r*short+dx*side,z];
            const sections=[[0,0.04,h*0.88],[0.38,r*0.16,h],[0.72,r*0.12,h*0.92],[1,0.01,h-Math.min(3.7,h*0.38)]];
            for(let k=1;k<sections.length;k++){
              const [u0,w0,z0]=sections[k-1],[u1,w1,z1]=sections[k];quad(at(u0,-w0,z0),at(u1,-w1,z1),at(u1,w1,z1),at(u0,w0,z0),green);
            }
          }
        }
      }else if(shape==='tuft'||shape==='cycad'||shape==='ponytail'){
        const trunkTop=shape==='cycad'?h*0.28:h*0.74;
        if(shape==='ponytail')taper(x,y,[[0,0.42],[h*0.25,0.30],[trunkTop,0.10]],bark);
        else taper(x,y,[[0,shape==='cycad'?0.13:0.10],[trunkTop,0.09]],bark);
        for(let j=0;j<10;j++){
          const angle=rotation+j*Math.PI/5,dx=Math.cos(angle),dy=Math.sin(angle),width=r*(shape==='cycad'?0.14:0.09);
          const a:Vertex=[x,y,trunkTop],b:Vertex=[x+dx*r*0.55-dy*width,y+dy*r*0.55+dx*width,h],c:Vertex=[x+dx*r,y+dy*r,shape==='ponytail'?h*0.5:h*0.62],d:Vertex=[x+dx*r*0.55+dy*width,y+dy*r*0.55-dx*width,h];
          triangle(a,b,c,green);triangle(a,c,d,green);
        }
      }else if(shape==='dwarf'){
        lobe(x,y,h*0.52,r,h*0.48,[0.31,0.42,0.29],rotation);
      }else{
        const bottle=shape==='bottle',root=bottle?0.35:Math.min(0.23,h*0.035);
        taper(x,y,bottle?[[0,root],[h*0.26,0.65],[h*0.57,0.19]]:[[0,root],[h*0.62,root*0.55]],bark);
        // Three overlapping smooth lobes give a branching crown, not a single
        // repeated building-sized blob. Heights and spreads remain estimates.
        for(let k=0;k<3;k++){
          const angle=rotation+k*2*Math.PI/3;
          lobe(x+Math.cos(angle)*r*0.32,y+Math.sin(angle)*r*0.32,h*(0.68+(k===0?0.09:0)),r*0.75,h*0.23,green,rotation+k);
        }
      }
    }
  }
  const containsMappedTree=(coordinate:readonly number[])=>{const point=project(coordinate);return circles.some(c=>inside(point,c.ring));};
  return {counts,containsMappedTree,circles};
}

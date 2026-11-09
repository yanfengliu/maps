import type {CampusEnvironment} from './campus-environment.ts';
import type {RegisterTerrainAnchor} from './terrain-grounding.ts';
import {QUAD_PLANTING_REFERENCE,QUAD_SPECIES,type ReferencePlant} from './quad-planting-reference.ts';
import {addTreePrototype,treePrototype,treeVariant} from './tree-prototypes.ts';
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

/** Keep the dated plant layout and append to the shared anchored mesh. The
 * botanical forms add no draw calls or geographic source features. */
export function addQuadPlantings(mesh:MeshWriter,data:CampusEnvironment,project:(p:readonly number[])=>Point,registerAnchor?:RegisterTerrainAnchor){
  const circles=locateQuadPlantings(data,project),counts={trees:0,palms:0,broadleaf:0,conifers:0};
  let objectId=-2;
  const triangle=(a:Vertex,b:Vertex,c:Vertex,color:Color,kind=10,normals?:[Vertex,Vertex,Vertex])=>mesh.triangle(a,b,c,color,kind,objectId,undefined,normals);
  const quad=(a:Vertex,b:Vertex,c:Vertex,d:Vertex,color:Color,kind=10)=>mesh.quad(a,b,c,d,color,kind,objectId);
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
    objectId=registerAnchor?-5:-2;
    // Groundcover species are stated in the diagram, but their exact patch
    // boundaries are not surveyed. One continuous tone avoids making the
    // triangulation read as a fictitious radial planting pattern.
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],inset=(p:Point):Vertex=>[center[0]+(p[0]-center[0])*0.965,center[1]+(p[1]-center[1])*0.965,0.065];
      triangle([center[0],center[1],0.065],inset(a),inset(b),[0.38,0.45,0.30],12);
    }
    for(const plant of circle.plants){
      const species=QUAD_SPECIES[plant.code],{shape,height:h,radius:r}=species,[x,y]=plant.position;
      objectId=registerAnchor?.(plant.position)??-2;
      const rotation=(Number(plant.id.split('/').at(-1))*2.399963+circle.number)%6.283185;
      const green:Color=species.silver?[0.48,0.56,0.46]:shape==='cycad'?[0.27,0.40,0.24]:[0.33,0.46,0.28],bark:Color=[0.47,0.42,0.32];
      counts.trees++;
      if(shape==='fan'||shape==='feather')counts.palms++;else if(species.conifer)counts.conifers++;else counts.broadleaf++;
      if(shape==='feather'){
        addTreePrototype(mesh,treePrototype('feather',treeVariant(plant.id,'feather')),[x,y],h,r,rotation,green,bark,objectId);
      }else if(shape==='fan'){
        const trunk=plant.code==='WAro'?0.20:0.30;
        const crownBase=h-r*0.45;
        taper(x,y,[[0,trunk*1.15],[crownBase,trunk*0.78]],bark);
          // Stanford's WASro / WASfil / LIVaus / BRAar / TRAfo photographs show
          // young upright fans filling the growing point, then individually
          // splayed and hanging fronds. Three identical six-leaf tiers made
          // annular shelves around a low hub. This continuous spiral uses the
          // same 204 leaf triangles: 24 for the folded central foliage, and
          // fifteen separately pleated fans with twelve triangles apiece.
          // Frond number, angles and dimensions are visual estimates. No skirt
          // or seasonal flowers are inferred from a different photographed tree.
          lobe(x,y,h-r*0.26,r*0.32,r*0.26,green,rotation);
          for(let j=0;j<15;j++){
            const angle=rotation+j*2.399963,dx=Math.cos(angle),dy=Math.sin(angle);
            const elevation=1.17-j*2.15/14,along=Math.cos(elevation),rise=Math.sin(elevation);
            // Emerging leaves are shorter and still partly folded. Their upper
            // tips remain inside the estimated height without clipping a plane
            // across all high leaves (another source of the former flat rings).
            const length=Math.min(1,0.42/Math.max(0.1,rise))*(0.94+0.06*Math.cos(j*1.7));
            const spread=elevation>0.6?0.55:1;
            const at=(forward:number,side:number,droop=0):Vertex=>[x+r*length*(dx*forward*along-dy*side*spread),y+r*length*(dy*forward*along+dx*side*spread),crownBase+r*length*(forward*rise-droop)];
            const hub=at(0.23,0),tint=green.map(v=>v*(0.96+0.04*Math.cos(j*0.7))) as Color;
            quad(at(0,-0.014),at(0.23,-0.012),at(0.23,0.012),at(0,0.014),tint);
            // Five folded segments share the fan's blade base. Shallower notches
            // preserve a fan silhouette rather than separate spear-like leaves.
            for(let k=0;k<5;k++){
              const a=-1.2+k*0.48,b=a+0.48,m=(a+b)/2;
              const edge=(phi:number)=>at(0.23+0.59*Math.cos(phi),0.59*Math.sin(phi),0.16);
              const tip=at(0.23+0.77*Math.cos(m),0.77*Math.sin(m),0.13);
              triangle(hub,edge(a),tip,tint);triangle(hub,tip,edge(b),tint);
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

import { PASTEUR_TIERS } from './pasteur-pods.ts';
import earcut from 'earcut';
import { FLAT_SHELL_FOUNDATION_DEPTH } from './flat-building-shell.ts';
import { HOSPITAL_EXTERIORS, UPPER_WINGS, podiumHeight } from './hospital-exteriors.ts';

type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];
interface Mesh {
  triangle(a:Vertex,b:Vertex,c:Vertex,color:Color,kind:number,building:number):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,color:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void;
}

const plaster: Color = [.81,.80,.73], roof: Color = [.77,.77,.73], garden: Color = [.49,.56,.37];
const glazing: Color = [.54,.64,.66], fins: Color = [.86,.84,.75];
const v = (p:Point,z:number):Vertex => [p[0],p[1],z];
const rectangle = (x:number,y:number,width:number,depth:number):Point[] =>
  [[x,y],[x+width,y],[x+width,y+depth],[x,y+depth]];
const center = (ring:Point[]):Point => ring.reduce(([x,y],p)=>[x+p[0]/ring.length,y+p[1]/ring.length],[0,0] as Point);
const inset = (ring:Point[],scale:number):Point[] => {
  const [x,y] = center(ring);
  return ring.map(p=>[x+(p[0]-x)*scale,y+(p[1]-y)*scale]);
};

/** All tiers share the same building ID and terrain anchor. Only the podium
 * reaches the source perimeter. Upper blocks and roof lights have real depth. */
export function addHospitalExterior(mesh:Mesh,id:string,rings:Point[][],building:number,base:number,height:number,project:(p:Point)=>Point):boolean {
  const profile = HOSPITAL_EXTERIORS[id];
  if (!profile) return false;
  const {site} = profile;
  const [x,y] = project(profile.origin), angle = Math.PI/12, c = Math.cos(angle), s = Math.sin(angle);
  const place = ([u,w]:Point):Point => [x+c*u-s*w,y-s*u-c*w];
  const deck = podiumHeight(id,base,height)!;
  const wings = UPPER_WINGS[site].map(outline=>outline.map(place));
  const feet = site==='stanford'?wings.map(outline=>inset(outline,.82)):wings;
  const plane = (contours:Point[][],z:number,tint:Color,kind=9,down=false) => {
    const vertices=contours.flat(), holes:number[]=[];
    let start=contours[0].length;
    for(const hole of contours.slice(1)){holes.push(start);start+=hole.length;}
    const indices=earcut(vertices.flat(),holes,2);
    for(let i=0;i<indices.length;i+=3) {
      const a=vertices[indices[i]],b=vertices[indices[i+1]],d=vertices[indices[i+2]];
      mesh.triangle(v(a,z),v(down?d:b,z),v(down?b:d,z),tint,kind,building);
    }
  };
  const walls = (ring:Point[],lo:number,hi:number,tint:Color,kind:number,rows:number) => {
    for(const [i,a] of ring.entries()){
      const b=ring[(i+1)%ring.length], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const bays=Math.max(1,Math.round(length/3.4));
      mesh.quad(v(a,lo),v(b,lo),v(b,hi),v(a,hi),tint,kind,building,[[0,0],[bays,0],[bays,rows],[0,rows]]);
    }
  };
  const lanterns:Point[][] = site==='packard-west'
    ? [[-14,-22.5],[-24.5,-12.5],[-31.5,-3.5],[-41,5]].map(([u,w])=>rectangle(u-2,w-2,4,4).map(place))
    : [];
  // Four shallow roof lights follow West's stepped elevation. The large
  // rounded lantern in the aerial belongs to 500 Pasteur, on a separate site.
  if(site==='stanford') lanterns.push(Array.from({length:12},(_,i)=>{
    const t=i*Math.PI/6;
    return place([-1+14.5*Math.cos(t),5+13*Math.sin(t)]);
  }));
  const court = site==='stanford'
    ? [[-15,-24],[18,-24],[19.5,-7],[19.5,18.5],[14,27.5],[-12,27.5],[-23,17],[-23,-9]].map(p=>place([p[0],p[1]]))
    : undefined;
  let lanternBase = deck;
  if (court) {
    lanternBase = deck+(height-deck)*.66;
    const sill = deck+(height-base)*.09;
    for(const [i,a] of court.entries()){
      const b=court[(i+1)%court.length];
      // The four cardinal sides meet their adjoining upper blocks. Complete
      // the recessed band below each overhang and expose the diagonal bays.
      const top = i%2===0 ? sill : lanternBase;
      const bays = Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/3.4));
      mesh.quad(v(a,deck),v(b,deck),v(b,top),v(a,top),glazing,97,building,[[0,0],[bays,0],[bays,3],[0,3]]);
    }
    plane([court,...lanterns],lanternBase,roof);
  }
  // The continuous solid podium needs only the source holes. Cutting many
  // holes for touching/re-entrant tiers can bridge the deep Packard notches.
  // Its upper face beneath a closed wing is internal and depth-occluded.
  plane(rings,deck,roof);
  for(const ring of rings){
    walls(ring,base,deck,plaster,99,2);
    if(base===0) walls(ring,-FLAT_SHELL_FOUNDATION_DEPTH,base,plaster,2,1);
  }

  for(const [i,wing] of wings.entries()){
    let sill=deck;
    if(site==='stanford'){
      sill=deck+(height-base)*.09;
      walls(feet[i],deck,sill,[.43,.47,.46],2,1);
      plane([wing,feet[i]],sill,plaster,2,true);
    }
    const top=site==='stanford'?height-(height-base)*.085:
      site==='packard-main'&&i===1?deck+(height-deck)*.77:height;
    walls(wing,sill,top,site==='stanford'?glazing:plaster,site==='stanford'?97:site==='packard-main'?98:99,site==='stanford'?4:3);
    plane([wing],top,roof);
    if(site==='stanford'){
      // Inset screen walls break the upper silhouette in the architect's
      // photographs. Their extents and heights are estimates within the pin.
      const screen=inset(wing,.64);
      walls(screen,top,height,[.51,.54,.53],2,1);
      plane([screen],height,[.69,.70,.67]);
    }
    if(site==='packard-main'&&i!==1){
      // South-facing long edges have projecting blades; short returns and
      // the linking wing retain the lower-relief glazing treatment.
      const ySouth=i===0?-22:35, left=i===0?-54:20.5, right=i===0?21:78;
      for(let u=left+3;u<right-1;u+=6) {
        const a=place([u,ySouth]),b=place([u,ySouth+.72]);
        mesh.quad(v(a,sill+.25),v(b,sill+.25),v(b,top-.18),v(a,top-.18),fins,2,building);
      }
      for(let row=1;row<=3;row++){
        const z=sill+(top-sill)*(row-.16)/3;
        plane([rectangle(left,ySouth,right-left,.85).map(place)],z,fins,2);
      }
    }
  }
  for(const ring of lanterns){
    const top=site==='stanford'?lanternBase+(height-lanternBase)*.58:deck+(height-deck)*.29;
    const crown=center(ring);
    const shoulder = site==='stanford' ? inset(ring,.71) : ring;
    const spring = site==='stanford' ? lanternBase+(top-lanternBase)*.76 : deck;
    for(const [i,a] of ring.entries()){
      const j=(i+1)%ring.length;
      if(site==='stanford')mesh.quad(v(a,lanternBase),v(shoulder[i],spring),v(shoulder[j],spring),v(ring[j],lanternBase),glazing,2,building);
      mesh.triangle(v(shoulder[j],spring),v(shoulder[i],spring),v(crown,top),glazing,2,building);
    }
  }
  const beds: Point[][] = site==='stanford' ? [
    [[-60,-51],[-45,-51],[-43,-47],[-49,-43],[-54,-44],[-58,-38],[-60,-39]],
    [[-42,-51],[-22,-51],[-22,-34],[-29,-31],[-34,-34],[-34,-40],[-39,-44]],
    [[-57,-34],[-49,-38],[-43,-39],[-38,-35],[-39,-29],[-45,-27],[-57,-28]],
    [[6,-81],[49,-81],[49,-67],[41,-66],[32,-69],[17,-69],[6,-66]],
  ] : site==='packard-west' ? [
    [[-16,0],[-8,-5],[2,-4],[8,0],[7,6],[-2,8],[-10,5]],
    [[2,11],[8,8],[15,8],[16,13],[11,16],[2,15]],
  ] : [];
  // Broad planted areas only; species, planting beds and paths are unknown.
  for(const bed of beds) plane([bed.map(place)],deck+.04,garden,2);
  return true;
}

/** Upper-tier faces have the parent building ID throughout, so below-ground
 * sampling never splits the 300 Pasteur roof at a terrain-tile boundary. */
export function addPasteurPods(mesh:Mesh,building:number,project:(p:Point)=>Point):void {
  for(const {outline,bottom,top,screen} of PASTEUR_TIERS){
    const ring=outline.map(project);
    const tint:Color=screen?[.76,.76,.72]:[.82,.81,.75];
    for(const [i,a] of ring.entries()){
      const b=ring[(i+1)%ring.length],bays=Math.max(1,Math.round(Math.hypot(a[0]-b[0],a[1]-b[1])/3.3));
      const rows=screen?1:2;
      mesh.quad(v(a,bottom),v(b,bottom),v(b,top),v(a,top),tint,screen?2:99,building,[[0,0],[bays,0],[bays,rows],[0,rows]]);
    }
    const indices=earcut(ring.flat());
    for(let i=0;i<indices.length;i+=3){
      mesh.triangle(v(ring[indices[i]],top),v(ring[indices[i+1]],top),v(ring[indices[i+2]],top),roof,2,building);
    }
  }
}

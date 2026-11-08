import earcut from 'earcut';
import { STADIUM_CONCOURSE_ID, STADIUM_PRESSBOX_IDS } from './stadium-architecture.ts';
type Point=[number,number];type Vertex=[number,number,number];type Color=[number,number,number];
interface Mesh {triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void;quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void}
const STONE:Color=[.78,.72,.61],TRIM:Color=[.89,.86,.77],GLASS:Color=[.20,.34,.36],STEEL:Color=[.40,.105,.08];
export const STADIUM_WALKWAY_ID='way/1357063452';

/** Stanford's 2017 survey, stadium tour and west-facade photograph distinguish
 * the solid emblem panel, recessed glazing, red steel walk and glass elevator.
 * Bay widths, floor bands and relief depths are estimates inside mapped heights. */
export function addStadiumElevation(roofs:Mesh,facades:Mesh,id:string,rings:Point[][],building:number,base:number,height:number):boolean{
 const concourse=id===STADIUM_CONCOURSE_ID;
 if(!concourse&&!STADIUM_PRESSBOX_IDS.has(id))return false;
 const walkway=id===STADIUM_WALKWAY_ID,body=id==='way/1354418130',front=id==='way/1354417642',elevator=id==='way/232715861';
 const vertices=rings.flat(),holes:number[]=[];let count=rings[0].length;for(const ring of rings.slice(1)){holes.push(count);count+=ring.length;}
 const top=walkway?base+.18:height,indices=earcut(vertices.flat(),holes,2);
 for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>vertices[j]);roofs.triangle([...a,top],[...b,top],[...c,top],walkway?STEEL:TRIM,34,building,[a,b,c]);}
 for(const [ri,ring] of rings.entries()){
  const area=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0),outward=(area>0?1:-1)*(ri?-1:1);
  for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const at=(x:number,z:number,depth=.05):Vertex=>[a[0]+(b[0]-a[0])*x/length+outward*(b[1]-a[1])/length*depth,a[1]+(b[1]-a[1])*x/length-outward*(b[0]-a[0])/length*depth,z];
   const panel=(x0:number,z0:number,x1:number,z1:number,color:Color,kind=34,depth=.05)=>{
    if(x1<=x0||z1<=z0)return;
    facades.quad(at(x0,z0,depth),at(x1,z0,depth),at(x1,z1,depth),at(x0,z1,depth),color,kind,building,[[x0,z0-base],[x1,z0-base],[x1,z1-base],[x0,z1-base]]);
   };
   const relief=(x0:number,z0:number,x1:number,z1:number,color:Color,depth=.22)=>{
    if(x1<=x0||z1<=z0)return;panel(x0,z0,x1,z1,color,34,depth);
    const corners:[[number,number],[number,number],[number,number],[number,number]]=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
    for(let j=0;j<4;j++){const p=corners[j],q=corners[(j+1)%4];facades.quad(at(...p,.055),at(...q,.055),at(...q,depth),at(...p,depth),color,34,building);}
   };
   if(walkway){
    panel(0,base,length,base+.18,STEEL);
    // Open red metal rails, with real air between rails and individual posts.
    for(const z of [base+.43,base+.7,height-.06])relief(0,z,length,Math.min(height,z+.055),STEEL,.11);
    const posts=Math.max(1,Math.ceil(length/2));for(let n=0;n<=posts;n++){const x=Math.min(length-.055,n*length/posts);relief(x,base+.18,x+.055,height,STEEL,.11);}
    continue;
   }
   const emblem=body&&i===4,glazedRecess=body&&(i===2||i===6),glazedPart=['way/1354417643','way/1354417644'].includes(id);
   const glazing=front||elevator||glazedRecess||glazedPart;
   const kind=glazing?35:concourse?38:34;
   panel(0,base,length,height,glazing?GLASS:STONE,kind);
   if(concourse){
    // Retaining/concourse walls have horizontal concrete joints and service
    // openings, not the generic window grid of an academic building.
    if(ri===0&&length>8){const bays=Math.max(1,Math.floor(length/8));for(let n=0;n<=bays;n++){const x=Math.max(0,Math.min(length-.28,n*length/bays));relief(x,base,x+.28,height-.3,TRIM,.20);}}
    relief(0,height-.35,length,height,TRIM,.22);continue;
   }
   const floors=elevator?7:4,bandBottom=elevator?base:Math.max(base,14),step=(height-bandBottom)/floors;
   if(glazing){
    // Physical slab edges and continuous perimeter frames remain legible in
    // grazing views; fine mullions are antialiased in the glazing material.
    for(let floor=0;floor<=floors;floor++){const z=Math.max(base,Math.min(height-.18,bandBottom+floor*step));relief(0,z,length,z+.18,TRIM,.26);}
    relief(0,base,Math.min(.22,length),height,TRIM,.24);relief(Math.max(0,length-.22),base,length,height,TRIM,.24);
   }else if(body&&i<10&&!emblem&&length>3){
    // Photo shows tall lower glazing between substantial square stone piers.
    const bays=Math.max(1,Math.floor(length/3.5)),bay=length/bays;
    for(let n=0;n<bays;n++)panel(n*bay+.45,base+.55,(n+1)*bay-.45,Math.min(13.6,height-.5),GLASS,35,.06);
   }
   if(emblem){
    const lower=Math.max(base+.6,1),bay=length/4;
    for(let n=0;n<4;n++)panel(n*bay+.46,lower,(n+1)*bay-.46,Math.min(13.6,height-.5),GLASS,35,.065);
    relief(0,13.8,length,14.15,TRIM,.22);
    // Raised outlined block S and stylized tree, as seen on the exterior.
    const s:Point[]=[[.16,.94],[.84,.94],[.94,.84],[.94,.65],[.69,.65],[.69,.73],[.32,.73],[.32,.61],[.84,.43],[.94,.33],[.94,.14],[.84,.04],[.16,.04],[.06,.14],[.06,.35],[.31,.35],[.31,.25],[.68,.25],[.68,.38],[.16,.55],[.06,.65],[.06,.84],[.16,.94]];
    const tree:Point[]=[[.5,.92],[.40,.77],[.47,.79],[.34,.64],[.44,.68],[.27,.48],[.42,.54],[.23,.34],[.45,.43],[.45,.15],[.55,.15],[.55,.43],[.77,.34],[.58,.54],[.73,.48],[.56,.68],[.66,.64],[.53,.79],[.60,.77],[.5,.92]];
    const width=Math.min(8.5,length*.67),bottom=16.5,tall=Math.min(17,height-bottom-1.2);
    const stroke=(path:Point[],tone:Color,depth:number)=>{for(let j=0;j+1<path.length;j++){const p=path[j],q=path[j+1],x0=length/2+(p[0]-.5)*width,x1=length/2+(q[0]-.5)*width,z0=bottom+p[1]*tall,z1=bottom+q[1]*tall,len=Math.hypot(x1-x0,z1-z0),dx=-(z1-z0)/len*.055,dz=(x1-x0)/len*.055;facades.quad(at(x0+dx,z0+dz,depth),at(x1+dx,z1+dz,depth),at(x1-dx,z1-dz,depth),at(x0-dx,z0-dz,depth),tone,36,building);}};
    stroke(s,[.49,.44,.34],.15);stroke(tree,[.49,.44,.34],.17);
    stroke(s,TRIM,.21);stroke(tree,TRIM,.23);
   }
   // Red exterior stair flights at the photographed tall end core. Their
   // proportions are estimated; every flight remains below its mapped top.
   if(id==='way/1351991359'&&i===3&&length>5){
    const left=.35,right=length-.35,start=14,run=(right-left)/2,levels=4,rise=(Math.min(height-2,37)-start)/levels;
    for(let level=0;level<levels;level++){
     const z=start+level*rise;relief(left,z,right,z+.18,STEEL,.7);
     for(let half=0;half<2;half++)for(let stair=0;stair<10;stair++){const x=half?right-run*(stair+1)/10:left+run*stair/10,sz=z+(half*.5+(stair+1)/20)*rise;relief(x,sz,x+run/10,sz+.09,STEEL,.7);}
    }
   }
   relief(0,Math.max(base,height-.28),length,height,TRIM,.27);
  }
 }
 return true;
}

export const STADIUM_ELEVATION_FRAGMENT=`
 if(abs(v_kind-34.0)<.1||abs(v_kind-38.0)<.1){
   float aa=max(fwidth(v_uv.x),fwidth(v_uv.y));
   vec2 panel=abs(mod(v_uv+vec2(2.25,1.4),vec2(4.5,2.8))-vec2(2.25,1.4));
   float seam=1.0-smoothstep(.018,.035+aa,min(panel.x,panel.y));
   tint*=1.0-.13*seam;
   if(abs(v_kind-38.0)<.1){
    vec2 bay=vec2(mod(v_uv.x,8.0),v_uv.y);
    float gate=step(2.2,bay.x)*step(bay.x,5.8)*step(.4,bay.y)*step(bay.y,3.8);
    float slat=1.0-smoothstep(.035,.07+aa,abs(mod(bay.x,.23)-.115));
    tint=mix(tint,vec3(.18,.19,.16)+slat*.11,gate);
   }
 }
 if(abs(v_kind-35.0)<.1){
   vec2 p=v_uv;float aa=max(fwidth(p.x),fwidth(p.y));
   float mullion=1.0-smoothstep(.025,.045+aa,abs(mod(p.x+1.2,2.4)-1.2));
   float transom=1.0-smoothstep(.025,.045+aa,abs(mod(p.y+1.4,2.8)-1.4));
   float pane=floor(p.x/2.4)+floor(p.y/2.8)*7.0;
   vec3 glazing=vec3(.18,.32,.34)+vec3(.03,.06,.065)*sin(pane*1.73);
   glazing+=vec3(.035,.045,.045)*smoothstep(0.0,2.8,mod(p.y,2.8));
   tint=mix(glazing,vec3(.64,.67,.62),max(mullion,transom));
 }
`;

import earcut from 'earcut';
import {HOOVER_PART_IDS,HOOVER_STUCCO_KIND as STUCCO,HOOVER_METAL_KIND as METAL} from './hoover-architecture.ts';
type P=[number,number];type V=[number,number,number];type C=[number,number,number];
interface Mesh {triangle(a:V,b:V,c:V,tint:C,kind:number,building:number,uv?:[P,P,P]):void;quad(a:V,b:V,c:V,d:V,tint:C,kind:number,building:number,uv?:[P,P,P,P]):void}
const plaster:C=[.85,.80,.68],trim:C=[.89,.84,.73],shadow:C=[.36,.36,.31],iron:C=[.24,.27,.26],tile:C=[.57,.28,.18];
const area=(r:P[])=>r.reduce((s,p,i)=>{const q=r[(i+1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
const center=(r:P[]):P=>[r.reduce((s,p)=>s+p[0],0)/r.length,r.reduce((s,p)=>s+p[1],0)/r.length];
const nearCollinear=(a:P,b:P,c:P)=>Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/Math.hypot(c[0]-a[0],c[1]-a[1])<.025;
const clean=(r:P[])=>r.filter((p,i)=>!nearCollinear(r[(i+r.length-1)%r.length],p,r[(i+1)%r.length]));

/** Complete smooth shells and genuinely open crown arches, using existing GPU
 * batches. No generic window grid or sandstone block shader reaches this tower. */
export function addHoover(roofs:Mesh,faces:Mesh,id:string,ring:P[],building:number,sourceHeight:number):boolean{
 if(!HOOVER_PART_IDS.has(id))return false;
 const part=Number(id.slice(4))-1346548884,outline=clean(ring),orientation=area(outline)>0?1:-1;
 const plate=(r:P[],z:number,kind=9,tint:C=plaster)=>{const idx=earcut(r.flat());for(let i=0;i<idx.length;i+=3)roofs.triangle(...idx.slice(i,i+3).map(j=>[...r[j],z] as V) as [V,V,V],tint,kind,building);
  // Close the roof edge with a shallow solid coping in the roof batch too;
  // the native cap is disabled once this complete profile is ready.
  for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];roofs.quad([...a,z-.12],[...b,z-.12],[...b,z],[...a,z],tint,2,building);}
 };
 const frame=(a:P,b:P)=>{
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length;
  return {length,at:(x:number,z:number,d=0):V=>[a[0]+dx*x+orientation*dy*d,a[1]+dy*x-orientation*dx*d,z]};
 };
 const rect=(at:(x:number,z:number,d?:number)=>V,x0:number,x1:number,z0:number,z1:number,d=0,tint:C=plaster,kind=STUCCO)=>faces.quad(at(x0,z0,d),at(x1,z0,d),at(x1,z1,d),at(x0,z1,d),tint,kind,building,[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]);
 const band=(r:P[],z0:number,z1:number,depth=0,tint:C=trim,kind=STUCCO)=>{for(let i=0;i<r.length;i++){const {length,at}=frame(r[i],r[(i+1)%r.length]);rect(at,0,length,z0,z1,depth,tint,kind);roofs.quad(at(0,z1,0),at(length,z1,0),at(length,z1,depth),at(0,z1,depth),tint,kind,building);}};
 const archOutline=(cx:number,bottom:number,top:number,radius:number):P[]=>{
  const result:P[]=[[cx-radius,bottom],[cx+radius,bottom],[cx+radius,top-radius]];
  const steps=radius<1?6:12;for(let i=1;i<=steps;i++){const t=i*Math.PI/steps;result.push([cx+Math.cos(t)*radius,top-radius+Math.sin(t)*radius]);}return result;
 };
 const arch=(at:(x:number,z:number,d?:number)=>V,cx:number,bottom:number,top:number,radius:number,depth:number,fill:boolean)=>{
  const opening=archOutline(cx,bottom,top,radius),spring=top-radius;
  if(fill){const idx=earcut(opening.flat());for(let i=0;i<idx.length;i+=3)faces.triangle(...idx.slice(i,i+3).map(j=>at(...opening[j],depth-.12)) as [V,V,V],shadow,METAL,building);}
  for(let i=0;i<opening.length;i++){const a=opening[i],b=opening[(i+1)%opening.length];faces.quad(at(...a,depth),at(...b,depth),at(...b,depth-.48),at(...a,depth-.48),plaster,STUCCO,building);}
  const steps=radius<1?6:12;for(let i=0;i<steps;i++){const a=i*Math.PI/steps,b=(i+1)*Math.PI/steps;faces.quad(at(cx+Math.cos(a)*radius,spring+Math.sin(a)*radius,depth+.05),at(cx+Math.cos(b)*radius,spring+Math.sin(b)*radius,depth+.05),at(cx+Math.cos(b)*(radius+.16),spring+Math.sin(b)*(radius+.16),depth+.05),at(cx+Math.cos(a)*(radius+.16),spring+Math.sin(a)*(radius+.16),depth+.05),trim,STUCCO,building);}
  for(const sign of [-1,1])rect(at,cx+sign*radius-.075,cx+sign*radius+.075,bottom,spring,depth+.05,trim);
 };
 const wallWithArch=(at:(x:number,z:number,d?:number)=>V,length:number,bottom:number,top:number,openBottom:number,openTop:number,radius:number,interior=false)=>{
  const outer:P[]=[[0,bottom],[length,bottom],[length,top],[0,top]],hole=archOutline(length/2,openBottom,openTop,radius),points=outer.concat(hole),idx=earcut(points.flat(),[4]);
  for(let i=0;i<idx.length;i+=3)faces.triangle(...idx.slice(i,i+3).map(j=>at(...points[j])) as [V,V,V],interior?[.49,.46,.39]:plaster,STUCCO,building,idx.slice(i,i+3).map(j=>points[j]) as [P,P,P]);
  if(!interior)arch(at,length/2,openBottom,openTop,radius,0,false);
 };
 const dome=(r:P[],bottom:number,top:number,tint:C,kind:number)=>{
  // Ring interpolation keeps the mapped eave perimeter, while the upper
  // silhouette is curved instead of a flat polygon fan or inverted cone.
  const c=center(r),steps=12;
  for(let row=0;row<steps;row++){const a=row/steps*Math.PI/2,b=(row+1)/steps*Math.PI/2;
   for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length],point=(p:P,t:number):V=>[c[0]+(p[0]-c[0])*Math.cos(t),c[1]+(p[1]-c[1])*Math.cos(t),bottom+(top-bottom)*Math.sin(t)];roofs.quad(point(p,a),point(q,a),point(q,b),point(p,b),tint,kind,building,[[i,a*6],[i+1,a*6],[i+1,b*6],[i,b*6]]);}
  }
 };
 if(part===7){
  // The observed shaft has three tall recessed panels per elevation, paired
  // arch windows near the crown and only sparse central lower openings.
  band(outline,14.3,sourceHeight);
  for(let i=0;i<outline.length;i++){const {length,at}=frame(outline[i],outline[(i+1)%outline.length]);if(length<8)continue;
   for(const f of [.22,.5,.78]){const x=length*f,w=length*.105;
    rect(at,x-w,x+w,16.2,59.4,.065,[.81,.76,.65]);
    for(const sign of [-1,1]){rect(at,x+sign*w-.07,x+sign*w+.07,16.2,59.4,.22,trim);faces.quad(at(x+sign*w,16.2,.065),at(x+sign*w,59.4,.065),at(x+sign*w,59.4,.22),at(x+sign*w,16.2,.22),[.64,.60,.52],STUCCO,building);}
    for(const sign of [-1,1])arch(at,x+sign*.57,58.0,61.0,.46,.32,true);
   }
   for(const z of [54.6,62.4]){rect(at,length/2-.24,length/2+.24,z,z+1.1,.03,shadow,METAL);}
  }
  band(outline,64.55,65,.12);plate(outline,sourceHeight);
 }else if(part===1){
  // Octagonal observation loggia: full structural piers and arch heads around
  // an empty opening. Its iron safety cages have the outward bow in photos.
  plate(outline,65.1);plate(outline,sourceHeight);
  for(let i=0;i<outline.length;i++){const {length,at}=frame(outline[i],outline[(i+1)%outline.length]),cx=length/2,r=Math.min(1.52,length*.29),bottom=66.7,top=73.35;
   wallWithArch(at,length,65,sourceHeight,bottom,top,r);
   wallWithArch((x,z,d=0)=>at(x,z,d-.48),length,65,sourceHeight,bottom,top,r,true);
   for(const side of [-1,1])for(let flute=0;flute<3;flute++){const x=cx+side*(r+.44+flute*.28);if(x>.12&&x<length-.12)rect(at,x-.055,x+.055,67,74.65,.09,[.79,.74,.63]);}
   for(let bar=0;bar<9;bar++){const x=-r+.12+bar*(2*r-.24)/8,high=top-r+Math.sqrt(Math.max(0,r*r-x*x));rect(at,cx+x-.022,cx+x+.022,bottom+.12,high-.10,.15+.36*Math.sqrt(Math.max(0,1-(x/r)**2)),iron,METAL);}
   for(let z=bottom+.4;z<top-r;z+=1.05)for(let k=0;k<8;k++){const a=-r+2*r*k/8,b=-r+2*r*(k+1)/8,d=(x:number)=>.15+.36*Math.sqrt(Math.max(0,1-(x/r)**2));faces.quad(at(cx+a,z-.022,d(a)),at(cx+b,z-.022,d(b)),at(cx+b,z+.022,d(b)),at(cx+a,z+.022,d(a)),iron,METAL,building);}
   // The photographed round crest is represented by a small relief boss;
   // carved faces and motifs are deliberately not invented.
   const crest=archOutline(cx,73.8,74.48,.25),idx=earcut(crest.flat());for(let n=0;n<idx.length;n+=3)faces.triangle(...idx.slice(n,n+3).map(j=>at(...crest[j],.08)) as [V,V,V],trim,STUCCO,building);
  }
  band(outline,65.15,65.45,.18);band(outline,66.1,66.35,.14);band(outline,74.7,75,.09);
 }else if(part===6){
  band(outline,75,75.5,.02);dome(outline,75.5,sourceHeight,tile,0);
 }else if(part===5){
  // Pale open lantern, not an eighty-five-metre opaque cylinder rising through
  // the observation deck. The mapped tip is kept at exactly 87 metres.
  plate(outline,81.35);
  for(let i=0;i<outline.length;i++){const {length,at}=frame(outline[i],outline[(i+1)%outline.length]);wallWithArch(at,length,81.3,85,82.1,84.4,Math.min(.29,length*.26));}
  band(outline,81.35,81.7,.12);band(outline,84.8,85,.06);dome(outline,85,sourceHeight,trim,0);
 }else if(part===0){
  band(outline,18.5,19.3);const c=center(outline);for(let i=0;i<outline.length;i++)roofs.triangle([...outline[i],19.3],[...outline[(i+1)%outline.length],19.3],[...c,sourceHeight],tile,0,building);
 }else{
  const bottom=part===3?11:0;
  for(let i=0;i<outline.length;i++){const {length,at}=frame(outline[i],outline[(i+1)%outline.length]);
   const a=outline[i],b=outline[(i+1)%outline.length],north=(a[1]+b[1])/2>center(outline)[1];
   if(part===2&&north&&length>7){wallWithArch(at,length,bottom,sourceHeight,.12,13.9,Math.min(2.8,length*.32));arch(at,length/2,.12,13.9,Math.min(2.8,length*.32),-.12,true);rect(at,length/2-.035,length/2+.035,.12,8.2,.015,trim);}
   else{rect(at,0,length,bottom,sourceHeight);if(part===3&&length>5){const count=Math.floor(length/3.1);for(let j=0;j<count;j++){const x=(j+.5)*length/count;rect(at,x-.45,x+.45,11.7,13.3,.03,shadow,METAL);rect(at,x-.02,x+.02,11.7,13.3,.045,trim);}}}
  }
  plate(outline,sourceHeight);band(outline,sourceHeight-.3,sourceHeight,.09,trim,2);
  if(part===4){band(outline,9.2,9.45,.08);band(outline,.15,.5,.12);}
 }
 return true;
}

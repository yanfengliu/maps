type Point=[number,number];
export interface GarageCirculation {
  /** Metre-space plan; its dimensions are authored, not a measured survey. */
  project:(point:Point)=>Point;
  unproject:(point:Point)=>Point;
  bounds:[number,number,number,number];
  ramp:[number,number,number,number];
  opening:Point[];
  aisles:{u:number;direction:1|-1}[];
  contains:(point:Point)=>boolean;
}
const inside=(p:Point,ring:Point[])=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
export const rectangle=([u0,u1,v0,v1]:readonly number[]):Point[]=>[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];

/** A connected two-way ramp is essential even in an estimated reconstruction.
 * Every upper deck has the same open well, so no slab cuts through a ramp.
 * End cross aisles connect opposing parking aisles and both ramp landings.
 * This does not assert the precise routing or striping of the actual garage. */
export function garageCirculation(rings:Point[][],rise:number):GarageCirculation {
 const ring=rings[0];let longest=0,axis:Point=[1,0];
 for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length>longest){longest=length;axis=[(b[0]-a[0])/length,(b[1]-a[1])/length];}}
 const across:Point=[-axis[1],axis[0]],origin=ring[0];
 const project=(p:Point):Point=>[(p[0]-origin[0])*across[0]+(p[1]-origin[1])*across[1],(p[0]-origin[0])*axis[0]+(p[1]-origin[1])*axis[1]];
 const unproject=([u,v]:Point):Point=>[origin[0]+u*across[0]+v*axis[0],origin[1]+u*across[1]+v*axis[1]];
 const local=rings.map(r=>r.map(project)),contains=(p:Point)=>inside(p,local[0])&&!local.slice(1).some(r=>inside(p,r));
 let u0=Math.min(...local[0].map(p=>p[0]))+2,u1=Math.max(...local[0].map(p=>p[0]))-2,v0=Math.min(...local[0].map(p=>p[1]))+2,v1=Math.max(...local[0].map(p=>p[1]))-2;
 // Fit one rectangle wholly inside the actual outline. Sampling each edge
 // also catches Roth's stepped returns, unlike a four-corner-only check.
 for(let attempt=0;attempt<20;attempt++){
  const edges=rectangle([u0,u1,v0,v1]),bad=edges.map((a,i)=>{const b=edges[(i+1)%4];return Array.from({length:41},(_,j)=>[a[0]+(b[0]-a[0])*j/40,a[1]+(b[1]-a[1])*j/40] as Point).some(p=>!contains(p));});
  if(!bad.some(Boolean))break;
  if(bad[0])v0+=1;if(bad[1])u1-=1;if(bad[2])v1-=1;if(bad[3])u0+=1;
 }
 const rampLength=Math.max(28,rise/.10),middleV=(v0+v1)/2,middleU=(u0+u1)/2;
 if(u1-u0<25||v1-v0<rampLength+18)throw new Error('Reviewed garage no longer fits its circulation model; review changed source geometry.');
 const ramp:[number,number,number,number]=[middleU-3.6,middleU+3.6,middleV-rampLength/2,middleV+rampLength/2];
 if(rectangle(ramp).some(p=>!contains(p))||local.slice(1).some(r=>r.some(p=>p[0]>ramp[0]&&p[0]<ramp[1]&&p[1]>ramp[2]&&p[1]<ramp[3])))throw new Error('Garage ramp would overlap an existing courtyard.');
 const aisles:{u:number;direction:1|-1}[]=[];
 for(let u=u0+8;u<u1-7;u+=16)if(Math.abs(u-middleU)>8.6)aisles.push({u,direction:aisles.length%2?-1:1});
 if(aisles.length<2){aisles.length=0;aisles.push({u:u0+6,direction:1},{u:u1-6,direction:-1});}
 return {project,unproject,bounds:[u0,u1,v0,v1],ramp,opening:rectangle(ramp).map(unproject),aisles,contains};
}

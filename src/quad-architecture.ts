import earcut from 'earcut';

type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];
interface MeshWriter {
  triangle(a:Vertex,b:Vertex,c:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point]):void;
  quad(a:Vertex,b:Vertex,c:Vertex,d:Vertex,tint:Color,kind:number,building:number,uv?:[Point,Point,Point,Point]):void;
}

/** Mapped identities, not a proximity rule that recolors unrelated buildings. */
export const QUAD_WING_IDS = new Set([99,100,101,102,104,105,106,107].map(n=>`way/${836474000+n}`));

/** A source boundary is the contract for the Inner Quad's open arcades. */
export function isArcadeEdge(a:Point,b:Point,court:Point[]):boolean {
  const on=(p:Point,u:Point,v:Point)=>{
    const dx=v[0]-u[0],dy=v[1]-u[1],length=Math.hypot(dx,dy);
    if(length<0.001)return false;
    const t=((p[0]-u[0])*dx+(p[1]-u[1])*dy)/(length*length);
    return t>=-1e-7&&t<=1+1e-7&&Math.abs((p[0]-u[0])*dy-(p[1]-u[1])*dx)/length<0.001;
  };
  return Math.hypot(b[0]-a[0],b[1]-a[1])>=3.2&&court.some((u,i)=>on(a,u,court[(i+1)%court.length])&&on(b,u,court[(i+1)%court.length]));
}

function elevation(mesh:MeshWriter,a:Point,b:Point,normal:Point,base:number,building:number,uvScale:Point=[1,1]){
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),u:Point=[(b[0]-a[0])/length,(b[1]-a[1])/length];
  const at=(p:Vertex):Vertex=>[a[0]+u[0]*p[0]+normal[0]*p[2],a[1]+u[1]*p[0]+normal[1]*p[2],base+p[1]];
  const uv=(p:Vertex):Point=>[p[0]*uvScale[0],p[1]*uvScale[1]];
  const triangle=(p:Vertex,q:Vertex,r:Vertex,tint:Color,kind=14)=>mesh.triangle(at(p),at(q),at(r),tint,kind,building,[uv(p),uv(q),uv(r)]);
  const quad=(p:Vertex,q:Vertex,r:Vertex,s:Vertex,tint:Color,kind=14,coordinates?:[Point,Point,Point,Point])=>mesh.quad(at(p),at(q),at(r),at(s),tint,kind,building,coordinates??[uv(p),uv(q),uv(r),uv(s)]);
  const panel=(x0:number,x1:number,z0:number,z1:number,depth:number,tint:Color,kind=14)=>quad([x0,z0,depth],[x1,z0,depth],[x1,z1,depth],[x0,z1,depth],tint,kind);
  const block=(x0:number,x1:number,z0:number,z1:number,d0:number,d1:number,tint:Color,cap:'top'|'bottom'='top',kind=14)=>{
    panel(x0,x1,z0,z1,d1,tint,kind);
    quad([x0,z0,d0],[x0,z0,d1],[x0,z1,d1],[x0,z1,d0],tint,kind);
    quad([x1,z0,d1],[x1,z0,d0],[x1,z1,d0],[x1,z1,d1],tint,kind);
    if(cap==='top')quad([x0,z1,d1],[x1,z1,d1],[x1,z1,d0],[x0,z1,d0],tint,kind);
    else quad([x0,z0,d0],[x1,z0,d0],[x1,z0,d1],[x0,z0,d1],tint,kind);
  };
  return {length,triangle,quad,panel,block};
}

/** Source-aligned, open arch bays: columns, vault reveals and a recessed walk.
 * Dimensions and bay count are authored from Stanford's arcade photograph.
 * Every major surface is inside the footprint; small trim projects <= 8 cm.
 */
export function addQuadArcade(mesh:MeshWriter,a:Point,b:Point,normal:Point,base:number,wall:number,building:number,stone:Color,upperWall?:number):void {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length<0.00001||wall<=base)return;
  const {triangle,quad,panel,block}=elevation(mesh,a,b,normal,base,building);
  const height=wall-base, bays=Math.max(1,Math.round(length/4.6)),width=length/bays;
  const totalHeight=Math.max(height,(upperWall??wall)-base);
  if(length<3.2||height<2.4){
    const solid=elevation(mesh,a,b,normal,base,building,[Math.max(1,Math.round(length/5.2))*5.2/length,10/totalHeight]);
    solid.panel(0,length,0,Math.max(0,totalHeight-0.12),0.045,stone,upperWall===undefined?14:18);
    return;
  }
  const spring=height*0.46,top=height-(upperWall===undefined?0.12:0),front=-0.08,rear=-2.2;
  const radius=Math.min(1.95,(width-0.65)/2,top-spring-0.3),segments=10;
  const trim=stone.map(c=>Math.min(1,c*1.07)) as Color;
  const shaded=stone.map(c=>c*0.65) as Color;
  const wood:Color=[0.29,0.21,0.14],glass:Color=[0.24,0.31,0.29];
  // A wall behind the passage replaces the old painted-on dark opening.
  panel(0,length,0,top,rear,shaded);
  quad([0,0.09,rear],[length,0.09,rear],[length,0.09,front],[0,0.09,front],[0.49,0.46,0.40],14);
  quad([0,top,front],[length,top,front],[length,top,rear],[0,top,rear],wood,16);
  // One planar polygon follows the entire open arcade's curved upper edge.
  // Its triangulation fills spandrels and piers above the spring line only.
  const spandrel:Point[]=[[0,spring]];
  for(let bay=0;bay<bays;bay++)for(let i=0;i<=segments;i++){
    const theta=Math.PI-i*Math.PI/segments;
    spandrel.push([(bay+0.5)*width+Math.cos(theta)*radius,spring+Math.sin(theta)*radius]);
  }
  spandrel.push([length,spring],[length,top],[0,top]);
  const indices=earcut(spandrel.flat());
  for(let i=0;i<indices.length;i+=3){
    const points=indices.slice(i,i+3).map(index=>[...spandrel[index],front] as Vertex);
    triangle(points[0],points[1],points[2],stone);
  }
  for(let bay=0;bay<bays;bay++){
    const cx=(bay+0.5)*width;
    // Physical soffit and radial voussoirs; plain stone avoids a rectangular
    // ashlar pattern cutting across the wedges. Their seams stay recessed.
    for(let i=0;i<segments;i++){
      const t0=i*Math.PI/segments,t1=(i+1)*Math.PI/segments;
      const x0=cx+Math.cos(t0)*radius,x1=cx+Math.cos(t1)*radius,z0=spring+Math.sin(t0)*radius,z1=spring+Math.sin(t1)*radius;
      quad([x1,z1,front],[x0,z0,front],[x0,z0,front-0.48],[x1,z1,front-0.48],shaded,2);
      const r=radius+0.23,joint=0.004,tint=stone.map(c=>Math.min(1,c*(i%2?1.045:1.065))) as Color;
      quad([cx+Math.cos(t0+joint)*radius,spring+Math.sin(t0+joint)*radius,front+0.025],
        [cx+Math.cos(t1-joint)*radius,spring+Math.sin(t1-joint)*radius,front+0.025],
        [cx+Math.cos(t1-joint)*r,spring+Math.sin(t1-joint)*r,front+0.025],
        [cx+Math.cos(t0+joint)*r,spring+Math.sin(t0+joint)*r,front+0.025],tint,2);
    }
    // The rear window's normalized UV supplies glazing, mullion and transom
    // in one panel. Open passages, columns and reveals remain real geometry.
    const z1=Math.min(3.4,top-0.2),z0=Math.min(bay%3===0?0.18:1.1,z1-0.3),half=Math.min(bay%3===0?0.62:0.8,width*0.3);
    quad([cx-half,z0,rear+0.025],[cx+half,z0,rear+0.025],[cx+half,z1,rear+0.025],[cx-half,z1,rear+0.025],glass,21,[[0,0],[1,0],[1,1],[0,1]]);
  }
  for(let i=0;i<=bays;i++){
    const cx=i*width,half=(width-2*radius)/2;
    // The half-piers terminate each edge without extending past its endpoints.
    const r=Math.min(0.29,half*0.8),depth=front-r;
    const profile:Point[]=Array.from({length:8},(_,j)=>[Math.max(0,Math.min(length,cx+Math.cos(j*Math.PI/4)*r)),depth+Math.sin(j*Math.PI/4)*r]);
    // Clamping an endpoint column to the source edge creates a flat closing
    // face. Keep its full shape while removing redundant collinear divisions.
    if(i===0||i===bays)for(let j=profile.length-1;j>=0;j--){
      const p=profile[(j+profile.length-1)%profile.length],q=profile[j],s=profile[(j+1)%profile.length];
      if(Math.abs((q[0]-p[0])*(s[1]-p[1])-(q[1]-p[1])*(s[0]-p[0]))<1e-10)profile.splice(j,1);
    }
    for(let j=0;j<profile.length;j++){
      const p=profile[j],q=profile[(j+1)%profile.length];
      quad([p[0],0.33,p[1]],[q[0],0.33,q[1]],[q[0],spring-0.20,q[1]],[p[0],spring-0.20,p[1]],trim);
    }
    const x0=Math.max(0,cx-half),x1=Math.min(length,cx+half);
    block(x0,x1,0.10,0.33,front-0.7,front+0.04,stone);
    block(x0,x1,spring-0.20,spring,front-0.7,front+0.04,trim);
    // The ceiling already closes the beam's top; its visible underside needs
    // the cap instead. Both use the timber material.
    block(Math.max(0,cx-0.09),Math.min(length,cx+0.09),top-0.18,top,rear,front-0.5,wood,'bottom',16);
  }
  if(totalHeight>height+0.12){
    const upper=elevation(mesh,a,b,normal,base,building,[Math.max(1,Math.round(length/5.2))*5.2/length,10/totalHeight]);
    upper.panel(0,length,height,totalHeight-0.12,0.045,stone,18);
  }
}

/** The named Quad wings use tall arched lower bays, grouped upper glazing,
 * transoms, a string course and projecting sills, rather than a floor grid.
 * Wallenberg's groups follow SOM's elevation; unsurveyed sides are estimates.
 */
export function addQuadWingElevation(mesh:MeshWriter,a:Point,b:Point,normal:Point,base:number,wall:number,building:number,stone:Color,id:string,openArcade=false):void {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),height=wall-base,wallDepth=0.045;
  if(length<0.00001||height<=0)return;
  const bays=Math.max(1,Math.round(length/5.2)),width=length/bays,trim=stone.map(c=>Math.min(1,c*1.09)) as Color;
  // Fit complete bays to this mapped wall; physical trim shares their centers.
  const {panel,block,quad}=elevation(mesh,a,b,normal,base,building,[bays*5.2/length,10/height]);
  if(openArcade)addQuadArcade(mesh,a,b,normal,base,Math.min(base+6.2,wall),building,stone,wall);
  else panel(0,length,0,height-0.12,wallDepth,stone,18);
  if(length<5)return;
  const upperStart=openArcade?Math.min(6.2,height):0;
  const course=Math.max(height*0.54,upperStart);
  if(course+0.16<height)block(0,length,course,course+0.16,0.045,0.14,trim);
  for(let i=0;i<bays;i++){
    const cx=(i+0.5)*width,half=Math.min(width*0.33,1.65);
    if(height*0.62-0.10>=upperStart)block(cx-half,cx+half,height*0.62-0.10,height*0.62,0.045,0.17,trim);
  }
  // Margaret Jacks' dark double door and radial fanlight distinguish its
  // long north-facing elevation. Placement within that wall is modeled.
  if(id==='way/836474099'&&normal[1]>0.7&&length>15){
    const cx=(Math.floor(bays/2)+0.5)*width,dark:Color=[0.20,0.23,0.22],glass:Color=[0.38,0.45,0.40];
    const recess=openArcade?-2.2:0;
    panel(cx-1.05,cx+1.05,0.1,3.25,recess+0.065,dark,2);
    for(const side of [-1,1]){
      panel(cx+side*0.5-0.34,cx+side*0.5+0.34,1.1,2.85,recess+0.075,glass,15);
      block(cx+side*0.5-0.35,cx+side*0.5+0.35,0.32,0.82,recess+0.07,recess+0.10,dark);
    }
    block(cx-0.04,cx+0.04,0.1,3.25,recess+0.075,recess+0.12,trim);
    // The photographed door has a semicircular fanlight with radial bars.
    for(let i=0;i<10;i++){
      const t0=i*Math.PI/10,t1=(i+1)*Math.PI/10,r=1.05;
      const p:Vertex=[cx+Math.cos(t0)*r,3.25+Math.sin(t0)*r,recess+0.078];
      const q:Vertex=[cx+Math.cos(t1)*r,3.25+Math.sin(t1)*r,recess+0.078];
      quad([cx,3.25,recess+0.078],p,q,[cx,3.25,recess+0.078],glass,15);
      const dx=Math.cos(t0)*0.025,dz=Math.sin(t0)*0.025;
      quad([cx-dz,3.25+dx,recess+0.09],[p[0]-dz,p[1]+dx,recess+0.09],[p[0]+dz,p[1]-dx,recess+0.09],[cx+dz,3.25-dx,recess+0.09],dark,2);
    }
  }
}

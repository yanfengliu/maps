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
  const quad=(p:Vertex,q:Vertex,r:Vertex,s:Vertex,tint:Color,kind=14)=>mesh.quad(at(p),at(q),at(r),at(s),tint,kind,building,[uv(p),uv(q),uv(r),uv(s)]);
  const panel=(x0:number,x1:number,z0:number,z1:number,depth:number,tint:Color,kind=14)=>quad([x0,z0,depth],[x1,z0,depth],[x1,z1,depth],[x0,z1,depth],tint,kind);
  const block=(x0:number,x1:number,z0:number,z1:number,d0:number,d1:number,tint:Color)=>{
    panel(x0,x1,z0,z1,d1,tint);
    quad([x0,z0,d0],[x0,z0,d1],[x0,z1,d1],[x0,z1,d0],tint);
    quad([x1,z0,d1],[x1,z0,d0],[x1,z1,d0],[x1,z1,d1],tint);
    quad([x0,z1,d1],[x1,z1,d1],[x1,z1,d0],[x0,z1,d0],tint);
  };
  return {length,quad,panel,block};
}

/** Source-aligned, open arch bays: columns, vault reveals and a recessed walk.
 * Dimensions and bay count are authored from Stanford's arcade photograph.
 * Every major surface is inside the footprint; small trim projects <= 8 cm.
 */
export function addQuadArcade(mesh:MeshWriter,a:Point,b:Point,normal:Point,base:number,wall:number,building:number,stone:Color):void {
  const {length,quad,panel,block}=elevation(mesh,a,b,normal,base,building);
  const height=wall-base, bays=Math.max(1,Math.round(length/4.6)),width=length/bays;
  const radius=Math.min(1.95,(width-0.65)/2),spring=height*0.46,top=height-0.12,front=-0.08,rear=-2.2;
  const trim=stone.map(c=>Math.min(1,c*1.07)) as Color;
  const shaded=stone.map(c=>c*0.65) as Color;
  const wood:Color=[0.29,0.21,0.14],glass:Color=[0.24,0.31,0.29];
  // A wall behind the passage replaces the old painted-on dark opening.
  panel(0,length,0.12,top,rear,shaded);
  quad([0,0.09,rear],[length,0.09,rear],[length,0.09,front],[0,0.09,front],[0.49,0.46,0.40],14);
  quad([0,top,front],[length,top,front],[length,top,rear],[0,top,rear],wood,16);
  for(let bay=0;bay<bays;bay++){
    const cx=(bay+0.5)*width;
    // The stone wedge above each curved opening and its visible soffit.
    for(let i=0;i<12;i++){
      const t0=i*Math.PI/12,t1=(i+1)*Math.PI/12;
      const x0=cx+Math.cos(t0)*radius,x1=cx+Math.cos(t1)*radius,z0=spring+Math.sin(t0)*radius,z1=spring+Math.sin(t1)*radius;
      quad([x0,z0,front],[x1,z1,front],[x1,top,front],[x0,top,front],stone);
      quad([x1,z1,front],[x0,z0,front],[x0,z0,front-0.48],[x1,z1,front-0.48],shaded);
      const r=radius+0.23;
      quad([x0,z0,front+0.025],[x1,z1,front+0.025],[cx+Math.cos(t1)*r,spring+Math.sin(t1)*r,front+0.025],[cx+Math.cos(t0)*r,spring+Math.sin(t0)*r,front+0.025],i%2?trim:stone);
    }
    // Divided openings and door-height bays in the corridor's rear wall.
    const z0=bay%3===0?0.18:1.1,z1=3.4,half=bay%3===0?0.62:0.8;
    panel(cx-half,cx+half,z0,z1,rear+0.025,glass,15);
    block(cx-0.035,cx+0.035,z0,z1,rear+0.03,rear+0.10,trim);
    block(cx-half,cx+half,z1-0.52,z1-0.45,rear+0.03,rear+0.10,trim);
  }
  for(let i=0;i<=bays;i++){
    const cx=i*width,half=(width-2*radius)/2;
    // The half-piers terminate each edge without extending past its endpoints.
    panel(Math.max(0,cx-half),Math.min(length,cx+half),spring,top,front,stone);
    const r=Math.min(0.29,half*0.8),depth=front-r;
    for(let j=0;j<8;j++){
      const t0=j*Math.PI/4,t1=(j+1)*Math.PI/4;
      const x0=Math.max(0,Math.min(length,cx+Math.cos(t0)*r)),x1=Math.max(0,Math.min(length,cx+Math.cos(t1)*r));
      quad([x0,0.33,depth+Math.sin(t0)*r],[x1,0.33,depth+Math.sin(t1)*r],[x1,spring-0.20,depth+Math.sin(t1)*r],[x0,spring-0.20,depth+Math.sin(t0)*r],trim);
    }
    const x0=Math.max(0,cx-half),x1=Math.min(length,cx+half);
    block(x0,x1,0.10,0.33,front-0.7,front+0.04,stone);
    block(x0,x1,spring-0.20,spring,front-0.7,front+0.04,trim);
    block(Math.max(0,cx-0.09),Math.min(length,cx+0.09),top-0.18,top,rear,front-0.5,wood);
  }
}

/** The named Quad wings use tall arched lower bays, grouped upper glazing,
 * transoms, a string course and projecting sills, rather than a floor grid.
 * Wallenberg's groups follow SOM's elevation; unsurveyed sides are estimates.
 */
export function addQuadWingElevation(mesh:MeshWriter,a:Point,b:Point,normal:Point,base:number,wall:number,building:number,stone:Color,id:string):void {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),height=wall-base,wallDepth=0.045;
  const bays=Math.max(1,Math.round(length/5.2)),width=length/bays,trim=stone.map(c=>Math.min(1,c*1.09)) as Color;
  // Fit complete bays to this mapped wall; physical trim shares their centers.
  const {panel,block,quad}=elevation(mesh,a,b,normal,base,building,[bays*5.2/length,10/height]);
  panel(0,length,0,height-0.12,wallDepth,stone,18);
  if(length<5)return;
  block(0,length,height*0.54,height*0.54+0.16,0.045,0.14,trim);
  for(let i=0;i<bays;i++){
    const cx=(i+0.5)*width,half=Math.min(width*0.33,1.65);
    block(cx-half,cx+half,height*0.62-0.10,height*0.62,0.045,0.17,trim);
  }
  // Margaret Jacks' dark double door and radial fanlight distinguish its
  // long north-facing elevation. Placement within that wall is modeled.
  if(id==='way/836474099'&&normal[1]>0.7&&length>15){
    const cx=(Math.floor(bays/2)+0.5)*width,dark:Color=[0.20,0.23,0.22],glass:Color=[0.38,0.45,0.40];
    panel(cx-1.05,cx+1.05,0.1,3.25,0.065,dark,2);
    for(const side of [-1,1]){
      panel(cx+side*0.5-0.34,cx+side*0.5+0.34,1.1,2.85,0.075,glass,15);
      block(cx+side*0.5-0.35,cx+side*0.5+0.35,0.32,0.82,0.07,0.10,dark);
    }
    block(cx-0.04,cx+0.04,0.1,3.25,0.075,0.12,trim);
    // The photographed door has a semicircular fanlight with radial bars.
    for(let i=0;i<10;i++){
      const t0=i*Math.PI/10,t1=(i+1)*Math.PI/10,r=1.05;
      const p:Vertex=[cx+Math.cos(t0)*r,3.25+Math.sin(t0)*r,0.078];
      const q:Vertex=[cx+Math.cos(t1)*r,3.25+Math.sin(t1)*r,0.078];
      quad([cx,3.25,0.078],p,q,[cx,3.25,0.078],glass,15);
      const dx=Math.cos(t0)*0.025,dz=Math.sin(t0)*0.025;
      quad([cx-dz,3.25+dx,0.09],[p[0]-dz,p[1]+dx,0.09],[p[0]+dz,p[1]-dx,0.09],[cx+dz,3.25-dx,0.09],dark,2);
    }
  }
}

/** Four exact hip planes clipped to the mapped wing, including its notches.
 * This replaces sampled distance-field spikes with straight roof creases.
 * The silhouette is an authored estimate, not a surveyed roof plan.
 */
export function quadWingRoof(ring:Point[],triangles:[Point,Point,Point][]){
  let u:Point=[1,0],longest=0;
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length>longest){longest=length;u=[(b[0]-a[0])/length,(b[1]-a[1])/length];}
  }
  const v:Point=[-u[1],u[0]],dot=(p:Point,n:Point)=>p[0]*n[0]+p[1]*n[1];
  const xs=ring.map(p=>dot(p,u)),ys=ring.map(p=>dot(p,v));
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const planes=[(p:Point)=>dot(p,u)-x0,(p:Point)=>x1-dot(p,u),(p:Point)=>dot(p,v)-y0,(p:Point)=>y1-dot(p,v)];
  const peak=Math.max(0.01,Math.min(x1-x0,y1-y0)/2);
  const fraction=(p:Point)=>Math.max(0,Math.min(...planes.map(f=>f(p)))/peak);
  const result:[Point,Point,Point][]=[];
  for(const triangle of triangles)for(let plane=0;plane<4;plane++){
    let polygon:Point[]=triangle;
    for(let other=0;other<4&&polygon.length;other++){
      if(plane===other)continue;
      const next:Point[]=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        const da=planes[other](a)-planes[plane](a),db=planes[other](b)-planes[plane](b);
        if(da>=0)next.push(a);
        if((da>0)!==(db>0)){const t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
      }
      polygon=next;
    }
    for(let i=1;i<polygon.length-1;i++)result.push([polygon[0],polygon[i],polygon[i+1]]);
  }
  const edge=(a:Point,b:Point)=>{
    const times=[0,1];
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const da=planes[i](a)-planes[j](a),db=planes[i](b)-planes[j](b),t=da/(da-db);
      if(t>0&&t<1)times.push(t);
    }
    return [...new Set(times)].sort((a,b)=>a-b).map(t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as Point);
  };
  return {triangles:result,fraction,edge,uv:(p:Point):Point=>[dot(p,u),dot(p,v)]};
}

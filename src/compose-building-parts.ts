import type * as GeoJSON from 'geojson';

interface BoundaryPoint { source: GeoJSON.Position; xy: [number, number] }

/** Render-only difference for the pinned Quad/church boundaries, which meet
 * at existing source vertices. This deliberately is not a general clipping
 * engine: crossing edges without a source vertex fail instead of being guessed.
 */
export function composeMainQuad(quad: GeoJSON.Polygon, church: GeoJSON.Polygon, project: (position: readonly number[]) => [number, number]): GeoJSON.Polygon {
  const convert = (ring: GeoJSON.Position[]): BoundaryPoint[] => ring.slice(0,-1).map(source => ({ source, xy: project(source) }));
  const rings = quad.coordinates.map(convert), part = church.coordinates.map(convert);
  const boundaries = [...rings,...part], points = boundaries.flat();
  const key = (p: BoundaryPoint) => p.xy.map(n=>n.toFixed(5)).join(',');
  const inside = (p: number[], ring: BoundaryPoint[]) => {
    let result = false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i].xy,b=ring[j].xy;
      if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) result=!result;
    }
    return result;
  };
  const inPolygon = (p: number[], polygon: BoundaryPoint[][]) => inside(p,polygon[0]) && !polygon.slice(1).some(r=>inside(p,r));
  const remaining = (p: number[]) => inPolygon(p,rings) && !inPolygon(p,part);
  const segments = boundaries.flatMap(ring=>ring.map((a,i)=>({a,b:ring[(i+1)%ring.length]})));
  // The reviewed source has shared edges and endpoint joins only. Detect a
  // changed topology before relying on that bounded source contract.
  const cross = (a: number[],b: number[],c: number[]) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
    const a=segments[i],b=segments[j];
    if(cross(a.a.xy,a.b.xy,b.a.xy)*cross(a.a.xy,a.b.xy,b.b.xy)<-1e-8 && cross(b.a.xy,b.b.xy,a.a.xy)*cross(b.a.xy,b.b.xy,a.b.xy)<-1e-8)
      throw new Error('Main Quad/church rendering boundaries cross without a shared source vertex. Review the updated footprint topology.');
  }
  const edges = new Map<string,{a: BoundaryPoint;b: BoundaryPoint}>();
  for(const {a,b} of segments){
    const dx=b.xy[0]-a.xy[0],dy=b.xy[1]-a.xy[1],length=Math.hypot(dx,dy);
    if(length<0.00001)continue;
    const split=[...new Map(points.filter(p=>{
      const x=p.xy[0]-a.xy[0],y=p.xy[1]-a.xy[1],t=(x*dx+y*dy)/(length*length);
      return t>=-1e-8 && t<=1+1e-8 && Math.abs(x*dy-y*dx)/length<0.00001;
    }).map(p=>[key(p),p])).values()].sort((p,q)=>(p.xy[0]-q.xy[0])*dx+(p.xy[1]-q.xy[1])*dy);
    for(let i=1;i<split.length;i++){
      let u=split[i-1],v=split[i];
      const x=(u.xy[0]+v.xy[0])/2,y=(u.xy[1]+v.xy[1])/2,nx=-dy/length*0.001,ny=dx/length*0.001;
      const left=remaining([x+nx,y+ny]),right=remaining([x-nx,y-ny]);
      if(left===right)continue;
      if(!left)[u,v]=[v,u];
      edges.set(`${key(u)}>${key(v)}`,{a:u,b:v});
    }
  }
  const starts = new Map<string,{a: BoundaryPoint;b: BoundaryPoint}>();
  for(const edge of edges.values()){
    if(starts.has(key(edge.a)))throw new Error('Main Quad/church rendering boundary branches at a source vertex. Review the updated footprint topology.');
    starts.set(key(edge.a),edge);
  }
  const result: GeoJSON.Position[][]=[];
  while(starts.size){
    const first=starts.values().next().value!,ring=[first.a.source];
    let edge=first;
    while(true){
      starts.delete(key(edge.a));ring.push(edge.b.source);
      if(key(edge.b)===key(first.a))break;
      const next=starts.get(key(edge.b));
      if(!next)throw new Error('Main Quad/church rendering boundary is open. Review the updated footprint topology.');
      edge=next;
    }
    result.push(ring);
  }
  const signedArea=(ring: GeoJSON.Position[])=>{const p=ring.slice(0,-1).map(project);return p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;};
  const outer=result.filter(r=>signedArea(r)>0),holes=result.filter(r=>signedArea(r)<0);
  if(outer.length!==1)throw new Error('Main Quad/church rendering difference no longer has one connected outer boundary. Review the updated source footprint topology.');
  return {type:'Polygon',coordinates:[outer[0],...holes]};
}

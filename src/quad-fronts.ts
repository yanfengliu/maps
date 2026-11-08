type Point = [number, number];
export type ArcadeEdge = [Point, Point];

// Reviewed against Stanford's 2017 Historic Resources Survey, pp. 113–116.
// These indices refer to the pinned source parent, before part composition.
// Side/rear room walls are deliberately not inferred from building proximity.
export const MEMORIAL_COURT_EDGES = [151,152,153,154,155,156,157];
export const NORTH_FRONT_EDGES = [137,139,140,142,143,145,163,165,166,167,168,169];

export function quadArcadeEdges(rings: Point[][]): ArcadeEdge[] {
  if(rings[0]?.length!==170 || rings[4]?.length!==13)throw new Error('Quad arcade reference boundaries changed; review the source and photographs.');
  const outer=rings[0],inner=rings[4];
  return [...inner.map((a,i)=>[a,inner[(i+1)%inner.length]] as ArcadeEdge),
    ...[...MEMORIAL_COURT_EDGES,...NORTH_FRONT_EDGES].map(i=>[outer[i],outer[(i+1)%outer.length]] as ArcadeEdge)];
}

export function isOpenQuadFront(a:Point,b:Point,edges:ArcadeEdge[]):boolean {
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<3.2)return false;
  return edges.some(([u,v])=>{
    const dx=v[0]-u[0],dy=v[1]-u[1],length=Math.hypot(dx,dy);
    return [a,b].every(p=>{
      const t=((p[0]-u[0])*dx+(p[1]-u[1])*dy)/(length*length);
      return t>=-1e-7&&t<=1+1e-7&&Math.abs((p[0]-u[0])*dy-(p[1]-u[1])*dx)/length<0.001;
    });
  });
}

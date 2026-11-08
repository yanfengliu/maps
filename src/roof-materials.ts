type Vertex=readonly [number,number,number];
type Point=readonly [number,number];
type UV=[number,number];

/** Estimated clay-tile module, informed by Stanford's East Wing access photo
 * and the 2016 Bing Wing cupola close-up. These are material dimensions, not
 * surveyed roof dimensions or evidence for East Wing roof topology. */
export const ROOF_TILE_WIDTH_METERS=.24;
export const ROOF_TILE_COURSE_METERS=.38;

/** U follows a face's horizontal eave; V follows its uphill surface direction.
 * Deriving the gradient from dz/dx,dz/dy makes orientation independent of
 * triangle winding. A common roof origin keeps adjacent coplanar triangles in
 * phase; a triangle-local anchor would create seams. The 3D uphill tangent
 * measures real sloped distance, so steep faces do not stretch tile courses.
 * Flat/degenerate faces use a deterministic supplied horizontal axis. */
export function roofTriangleUV(a:Vertex,b:Vertex,c:Vertex,origin:Vertex=[0,0,0],flatAcross:Point=[1,0]):[UV,UV,UV] {
 if(![...a,...b,...c,...origin,...flatAcross].every(Number.isFinite))throw new Error('Roof material coordinates must be finite.');
 const ab=b.map((n,i)=>n-a[i]),ac=c.map((n,i)=>n-a[i]);
 const normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
 const length=Math.hypot(...normal),hasPlane=length>1e-12&&Math.abs(normal[2])>length*1e-10;
 const gradient=hasPlane?[-normal[0]/normal[2],-normal[1]/normal[2]]:[0,0],slope=Math.hypot(...gradient);
 let across:Vertex,uphill:Vertex;
 if(slope>1e-7){
  const x=gradient[0]/slope,y=gradient[1]/slope,scale=Math.hypot(1,slope);
  across=[y,-x,0];uphill=[x/scale,y/scale,slope/scale];
 }else{
  const scale=Math.hypot(...flatAcross),x=scale?flatAcross[0]/scale:1,y=scale?flatAcross[1]/scale:0;
  across=[x,y,0];uphill=[-y,x,0];
 }
 return [a,b,c].map(p=>{
  const delta=p.map((n,i)=>n-origin[i]);
  return [delta.reduce((sum,n,i)=>sum+n*across[i],0),delta.reduce((sum,n,i)=>sum+n*uphill[i],0)];
 }) as [UV,UV,UV];
}

/** Replace both legacy material-0 broad stripes and material-17 roof code with
 * this one branch. It consumes the slope-oriented metre UVs above. Existing
 * authored tint, lighting, geometry and mapped roof heights remain unchanged. */
export const ROOF_TILE_FRAGMENT=`
if(abs(v_kind)<.1||abs(v_kind-17.0)<.1){
 vec2 tiles=v_uv/vec2(${ROOF_TILE_WIDTH_METERS},${ROOF_TILE_COURSE_METERS});
 vec2 footprint=max(fwidth(tiles),vec2(.001));
 vec2 cell=fract(tiles);
 float barrelFade=1.0-smoothstep(.22,.72,footprint.x);
 float courseFade=1.0-smoothstep(.18,.60,footprint.y);
 // The barrel runs uphill; the short head-lap crosses it along the eave.
 float barrel=cos(cell.x*6.2831853);
 float seamDistance=min(cell.y,1.0-cell.y);
 float headLap=1.0-smoothstep(.008,.024+footprint.y,seamDistance);
 float valley=1.0-smoothstep(.016,.048+footprint.x,abs(cell.x-.5));
 float variation=fract(sin(dot(floor(tiles),vec2(12.9898,78.233)))*43758.5453)-.5;
 float tileFade=min(barrelFade,courseFade);
 tint*=1.0+(.045*barrel-.018*valley)*barrelFade-.048*headLap*courseFade+.028*variation*tileFade;
}
`;

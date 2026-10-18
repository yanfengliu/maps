/** A finite raised metal finish. Photographic fan tops and grille backplanes
 * remain drawn. These open guards/cassettes are authored, never inset cavities. */
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, FrontSide, Group, Mesh, MeshStandardMaterial, Object3D, Ray, Triangle, Vector3 } from "three";
import { ROOF_SERVICE as R } from "./roof-service-recipe.js";
import type { FacadeTextureLifetime } from "./facade-textures.js";

type Face = { face: number; points: Vector3[] };
type Source = { faces: Map<number, Face>; deck: Triangle[] };
const prepared = new WeakMap<Object3D, Source>(), active = new WeakMap<Object3D, Group>();
const fail = (part: string): never => { throw Error(`West roof service housings: ${part} differs from reviewed ${R.tileUri}/${R.gmlId}. Restore its pinned tile, finite source faces, UV0, parser placement and logical tile owner before adding this authored finish.`); };
export function roofServiceSourceForUrl(url: string): typeof R | undefined {
  return new URL(url, "http://maps.invalid/").pathname.endsWith(`/buildings/${R.tileUri}`) ? R : undefined;
}
export async function prepareRoofService(scene: Object3D, uri: string, digest: string | undefined): Promise<void> {
  if (uri !== R.tileUri) return;
  if (digest !== R.tileSha256) fail("SHA-256");
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  const meta = table?.getDataFromId(R.batch);
  if (meta?.["gml_id"] !== R.gmlId || meta["bldg:storeysAboveGround"] !== 9 || meta["bldg:measuredHeight"] !== 36.2) fail("GML/floor/height identity");
  scene.updateMatrixWorld(true);
  let selected: Mesh | undefined;
  scene.traverse(o => {
    if (!(o instanceof Mesh) || !o.geometry.hasAttribute("uv")) return;
    const ids = o.geometry.getAttribute("_batchid") ?? o.geometry.getAttribute("_BATCHID");
    if (!ids || !Array.from({ length: ids.count }, (_, i) => ids.getX(i)).includes(R.batch)) return;
    if (selected || Array.isArray(o.material) || !(o.material instanceof MeshStandardMaterial) || o.material.side !== FrontSide || !o.material.map) fail("single photographic primitive");
    selected = o;
  });
  if (!selected) fail("photographic primitive");
  const mesh = selected!, g = mesh.geometry, p = g.getAttribute("position"), n = g.getAttribute("normal"), uv = g.getAttribute("uv"), ids = g.getAttribute("_batchid") ?? g.getAttribute("_BATCHID"), index = g.index, map = (mesh.material as MeshStandardMaterial).map!;
  if (!p || !n || !uv || !index) fail("original attributes");
  if (map.matrixAutoUpdate) map.updateMatrix();
  if (map.channel !== 0 || map.flipY || map.matrix.elements.some((v, i) => Math.abs(v - [1,0,0,0,1,0,0,0,1][i]!) > 1e-9)) fail("original UV0 orientation");
  if (mesh.matrixWorld.elements.some((v, i) => Math.abs(v - R.parserPlacement[i]!) > 2e-8)) fail("installed parser placement");
  const values: number[] = [], faces = new Map<number, Face>();
  for (const face of R.sourceFaces) {
    if (face * 3 + 2 >= index!.count) fail(`source face ${face}`);
    values.push(face); const points: Vector3[] = [];
    for (let k = 0; k < 3; k++) {
      const id = index!.getX(face * 3 + k);
      if (id >= p.count || ids.getX(id) !== R.batch) fail(`face ${face} batch/index`);
      values.push(id, p.getX(id), p.getY(id), p.getZ(id), n.getX(id), n.getY(id), n.getZ(id), uv.getX(id), uv.getY(id), ids.getX(id));
      points.push(new Vector3().fromBufferAttribute(p, id).applyMatrix4(mesh.matrixWorld));
    }
    faces.set(face, { face, points });
  }
  const bytes = new Uint8Array(values.length * 8), view = new DataView(bytes.buffer);
  values.forEach((value, i) => view.setFloat64(i * 8, value, true));
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  if (actual !== R.sourceWitnessSha256) fail("finite original index/position/normal/UV0 witness");
  const deck = R.deckFaces.map(f => { const v = faces.get(f)!.points; return new Triangle(v[0]!, v[1]!, v[2]!); });
  prepared.set(scene, { faces, deck });
}

const up = new Vector3(0, 1, 0);
function footprint(points: Vector3[]): Vector3[] {
  const unique = points.filter((p, i, a) => a.findIndex(q => p.distanceTo(q) < 1e-5) === i), center = unique.reduce((s, p) => s.add(p), new Vector3()).divideScalar(unique.length);
  if (unique.length !== 4) fail("four source top corners");
  return unique.sort((a, b) => Math.atan2(a.z - center.z, a.x - center.x) - Math.atan2(b.z - center.z, b.x - center.x));
}
function expand(corners: Vector3[], distance: number): Vector3[] {
  return corners.map((p, i) => {
    const before = p.clone().sub(corners[(i + 3) % 4]!).setY(0).normalize(), after = corners[(i + 1) % 4]!.clone().sub(p).setY(0).normalize();
    const a = new Vector3(before.z, 0, -before.x), b = new Vector3(after.z, 0, -after.x);
    const scale = distance / (1 + a.dot(b)); return p.clone().addScaledVector(a.add(b), scale);
  });
}
// Convex strips clipped against the ten disjoint source deck triangles. This
// checks the entire projected support area, separately from corner heights.
const area = (p: Vector3[]): number => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a.x * b.z - a.z * b.x; }, 0)) / 2;
function covered(strip: Vector3[], deck: Triangle[]): number {
  if (strip.reduce((s,a,i)=>{const b=strip[(i+1)%strip.length]!;return s+a.x*b.z-a.z*b.x;},0)<0) strip=strip.toReversed();
  let sum = 0;
  for (const t of deck) {
    let polygon = [t.a, t.b, t.c];
    for (let i = 0; i < strip.length && polygon.length; i++) {
      const a = strip[i]!, b = strip[(i + 1) % strip.length]!, side = (p: Vector3): number => (b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x), next: Vector3[] = [];
      for (let j = 0; j < polygon.length; j++) { const p = polygon[j]!, q = polygon[(j+1)%polygon.length]!, d = side(p), e = side(q); if (d >= -1e-10) next.push(p); if (d * e < 0) next.push(p.clone().lerp(q, d/(d-e))); }
      polygon = next;
    }
    if (polygon.length >= 3) sum += area(polygon);
  }
  return sum;
}

export function addRoofService(scene: Object3D, uri: string, digest: string | undefined, lifetime?: Pick<FacadeTextureLifetime, "onRelease">): boolean {
  if (uri !== R.tileUri || active.has(scene)) return false;
  const source = prepared.get(scene);
  if (digest !== R.tileSha256 || !source) fail("unprepared source");
  const register = lifetime?.onRelease?.bind(lifetime); if (!register) fail("missing logical tile owner");
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], records: object[] = [];
  let color = new Color();
  const triangle = (a: Vector3, b: Vector3, c: Vector3): void => {
    const normal = new Triangle(a, b, c).getNormal(new Vector3());
    for (const p of [a,b,c]) { positions.push(p.x,p.y,p.z); normals.push(normal.x,normal.y,normal.z); colors.push(color.r,color.g,color.b); }
  };
  const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3, outward: Vector3): void => {
    if (new Triangle(a,b,c).getNormal(new Vector3()).dot(outward) > 0) { triangle(a,b,c); triangle(a,c,d); } else { triangle(a,c,b); triangle(a,d,c); }
  };
  const box = (center: Vector3, x: Vector3, y: Vector3, z: Vector3, width: number, height: number, depth: number): void => {
    const indexed = new BoxGeometry(width,height,depth), g = indexed.toNonIndexed(), p = g.getAttribute("position"), n = g.getAttribute("normal"); indexed.dispose();
    for (let i=0;i<p.count;i+=3) {
      const at = (j: number): Vector3 => center.clone().addScaledVector(x,p.getX(j)).addScaledVector(y,p.getY(j)).addScaledVector(z,p.getZ(j));
      const a=at(i),b=at(i+1),c=at(i+2),normal=x.clone().multiplyScalar(n.getX(i)).addScaledVector(y,n.getY(i)).addScaledVector(z,n.getZ(i));
      if(new Triangle(a,b,c).getNormal(new Vector3()).dot(normal)>0)triangle(a,b,c);else triangle(a,c,b);
    }
    g.dispose();
  };
  const roofY = (point: Vector3): number => {
    const ray = new Ray(new Vector3(point.x,64,point.z),new Vector3(0,-1,0));
    const hits = source!.deck.flatMap(t => { const hit=ray.intersectTriangle(t.a,t.b,t.c,false,new Vector3()); return hit?[hit.y]:[]; });
    if (!hits.length || Math.max(...hits)-Math.min(...hits)>.001) fail("base outside finite planar deck");
    return hits[0]!;
  };
  for (const h of R.housings) {
    const corners = footprint(h.topFaces.flatMap(f => source!.faces.get(f)!.points)), outer = expand(corners,.025), foot = corners.map(p => p.clone().setY(roofY(p))), baseOuter = expand(foot,.035).map(p=>p.setY(roofY(p)));
    const topPlane = source!.faces.get(h.topFaces[0])!.points, topTriangle = new Triangle(topPlane[0]!,topPlane[1]!,topPlane[2]!);
    const normal = topTriangle.getNormal(new Vector3()); if (normal.y < .99999) fail("top plane winding");
    const topY = (p: Vector3): number => topPlane[0]!.y-(normal.x*(p.x-topPlane[0]!.x)+normal.z*(p.z-topPlane[0]!.z))/normal.y;
    color = new Color(0x687579);
    for (let i=0;i<4;i++) {
      const j=(i+1)%4, a=corners[i]!,b=corners[j]!,c=outer[j]!,d=outer[i]!, outward=new Vector3(b.z-a.z,0,a.x-b.x).normalize(), lift=(p:Vector3,y:number):Vector3=>p.clone().setY(topY(p)+y);
      // Open perimeter fold: no sheet spans either photographed fan field.
      quad(lift(a,.03),lift(b,.03),lift(c,.03),lift(d,.03),up);
      quad(lift(d,.03),lift(c,.03),lift(c,-.095),lift(d,-.095),outward);
      quad(lift(a,.03),lift(b,.03),lift(b,0),lift(a,0),outward.clone().negate());
      color = new Color(0x4b5559);
      const strip=[foot[i]!,foot[j]!,baseOuter[j]!,baseOuter[i]!];
      if (Math.abs(covered(strip,source!.deck)-area(strip))>2e-7) fail(`${h.name} complete base-strip support`);
      const [a0,b0,c0,d0]=strip, high=(p:Vector3):Vector3=>p.clone().addScaledVector(up,.11);
      quad(high(a0!),high(b0!),high(c0!),high(d0!),up);
      quad(d0!,c0!,high(c0!),high(d0!),outward);
      // Bottom follows its source triangle at each vertex. The whole strip is
      // supported in X/Z; source triangulation residual stays below 1 mm.
      quad(a0!,b0!,c0!,d0!,up.clone().negate());
      color = new Color(0x687579);
    }
    const uniqueWalls = h.faces.filter(f=>!h.topFaces.some(t => t === f)).filter((_,i)=>i%2===0);
    const panels: object[] = [];
    for (const face of uniqueWalls) {
      const f=source!.faces.get(face)!, t=new Triangle(f.points[0]!,f.points[1]!,f.points[2]!), outward=t.getNormal(new Vector3()), vertices=footprint([...f.points,...source!.faces.get(face+1)!.points]);
      // Wall corners are not a horizontal footprint; pick the longest X/Z edge.
      const low = vertices.toSorted((a,b)=>a.y-b.y).slice(0,2), high=vertices.toSorted((a,b)=>b.y-a.y).slice(0,2), edge=low[1]!.clone().sub(low[0]!).setY(0), width=edge.length(), height=(high[0]!.y+high[1]!.y-low[0]!.y-low[1]!.y)/2;
      if(width<1.8)continue;
      const right=edge.normalize(), center=low[0]!.clone().add(low[1]!).multiplyScalar(.5).addScaledVector(up,height/2), pw=width-.32,ph=height-.32,count=Math.floor(ph/.20),angle=.25, bladeHeight=.018,bladeDepth=.07,projected=bladeHeight*Math.cos(angle)+bladeDepth*Math.sin(angle);
      const coverage=(2*.022*ph+2*.022*(pw-.044)+count*projected*(pw-.044))/(pw*ph);if(coverage>.25)fail("frontal grille coverage");
      color=new Color(0x536267);
      for(const sign of [-1,1])box(center.clone().addScaledVector(right,sign*(pw-.022)/2).addScaledVector(outward,.0275),right,up,outward,.022,ph,.055);
      for(const sign of [-1,1])box(center.clone().addScaledVector(up,sign*(ph-.022)/2).addScaledVector(outward,.0275),right,up,outward,pw-.044,.022,.055);
      const bladeUp=up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(outward,Math.sin(angle)),bladeNormal=outward.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up,-Math.sin(angle));
      for(let k=0;k<count;k++)box(center.clone().addScaledVector(up,(k-(count-1)/2)*.20).addScaledVector(outward,.045),right,bladeUp,bladeNormal,pw-.044,bladeHeight,bladeDepth);
      panels.push({sourceFaces:[face,face+1],width:pw,height:ph,vanes:count,frontalCoverage:coverage,maximumProtrusion:.045+bladeDepth*Math.cos(angle)/2+bladeHeight*Math.sin(angle)/2});
    }
    // Source top layout shows two coarse fan fields. Centers/radii are authored
    // source-informed guard placement, not recovered fan engineering dimensions.
    const origin=corners[0]!, adjacent=[corners[1]!.clone().sub(origin),corners[3]!.clone().sub(origin)].sort((a,b)=>a.length()-b.length()), short=adjacent[0]!,long=adjacent[1]!,x=short.clone().setY(0).normalize(),z=long.clone().setY(0).normalize();
    color=new Color(0x455256);
    for(const centerSource of h.fanCenters) {
      const center=new Vector3(...centerSource); center.y=topY(center);
      const at=(angle:number,radius:number,y:number):Vector3=>{const p=center.clone().addScaledVector(x,Math.cos(angle)*radius).addScaledVector(z,Math.sin(angle)*radius);return p.setY(topY(p)+y);};
      for(let i=0;i<32;i++)for(let j=0;j<6;j++) {
        const point=(a:number,b:number):Vector3=>at(a, .24+.006*Math.cos(b),.021+.006*Math.sin(b));
        const a=i*Math.PI/16,b=(i+1)*Math.PI/16,c=j*Math.PI/3,d=(j+1)*Math.PI/3;
        quad(point(a,c),point(b,c),point(b,d),point(a,d),at((a+b)/2,Math.cos((c+d)/2),.021+Math.sin((c+d)/2)).sub(at((a+b)/2,0,.021)));
      }
      for(let k=0;k<4;k++){const p=at(k*Math.PI/2,.24,.009);box(p,x,up,z,.012,.018,.012);}
    }
    records.push({name:h.name,panels,baseStrips:4,fanGuards:2});
  }
  const geometry=new BufferGeometry();geometry.setAttribute("position",new Float32BufferAttribute(positions,3));geometry.setAttribute("normal",new Float32BufferAttribute(normals,3));geometry.setAttribute("color",new Float32BufferAttribute(colors,3));geometry.setAttribute("_batchid",new Float32BufferAttribute(new Float32Array(positions.length/3).fill(R.batch),1));
  const geometryBytes=Object.values(geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0),triangles=positions.length/9;
  if(geometryBytes>2000000||triangles>16000){geometry.dispose();fail("finite geometry budget");}
  const material=new MeshStandardMaterial({vertexColors:true,roughness:.52,metalness:.58}),mesh=new Mesh(geometry,material),group=new Group();group.name="west-roof-service-housings";mesh.name=group.name+":metal";mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.authoredFrontage={gmlId:R.gmlId,source:false};group.add(mesh);group.matrix.copy(scene.matrixWorld).invert();group.matrixAutoUpdate=false;
  group.userData.roofService={tileUri:R.tileUri,gmlId:R.gmlId,housings:records,beautyDraws:1,imageTextures:0,geometryBytes,triangles,maximumHorizontalOffsetM:.09,maximumTopOffsetM:.035,sourcePhotography:"unchanged open backplanes; authored metal physically occludes narrow strips"};
  let closed=false;register!(()=>{if(closed)return;closed=true;group.removeFromParent();prepared.delete(scene);active.delete(scene);});active.set(scene,group);scene.add(group);return true;
}

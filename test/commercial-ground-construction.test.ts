/** Actual browser TS producer and pinned decoder inputs. CPU construction and
 * emitted geometry only; appearance and integrated tile capture remain owed. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { BufferAttribute, BufferGeometry, DoubleSide, Group, type Material, Matrix4, Mesh, MeshNormalMaterial, MeshStandardMaterial, PointLight, Scene, ShaderLib, SRGBColorSpace, Texture, Triangle, Vector3 } from "three";
import { parseB3dm, parseGlb, readBatchColumn } from "../tools/tiles/b3dm.js";
import { decodePrimitive } from "../tools/tiles/draco.js";
import { COMMERCIAL_CORNER as R } from "../src/scene/commercial-corner-recipe.js";
import { CROSSING_CORNER, prepareCrossingCorner } from "../src/scene/crossing-corner-material.js";
import { addCommercialCorner, COMMERCIAL_SOURCE_GLSL, getCommercialCornerNormalMaterial, prepareCommercialCorner } from "../src/scene/commercial-corner.js";
import { applyFacadeStyle, createFacadeStyle } from "../src/scene/tile-materials.js";
import { worldStyle } from "../src/world/styles.js";
import { decodeMesh } from "../src/world/mesh.js";
import { getCrossingFrontageNormalMaterial } from "../src/scene/crossing-frontage.js";
import { withNormalMaterials } from "../src/render/normal-pass.js";
const sourceOracle=JSON.parse(readFileSync(new URL("./fixtures/commercial-ground-source.json",import.meta.url),"utf8"))as{seam:number;cutSegments:{face:number;points:number[][]}[]};

type Emitted = { points: number[][]; category: string; color: number };
type Plan = [number, number];
const area = (p: Plan[]): number => Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length]!;return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
const orient = (a:Plan,b:Plan,c:Plan):number=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function sourceFrame(side:"south"|"east"){
  const o=CROSSING_CORNER.origin,e=R[side].end,x=e[0]-o[0],z=e[2]-o[2],length=Math.hypot(x,z),u:Plan=[x/length,z/length],n:Plan=[R[side].normal[0],R[side].normal[2]],nl=Math.hypot(...n);n[0]/=nl;n[1]/=nl;
  const det=u[0]*n[1]-u[1]*n[0];return{u,n,s:[n[1]/det,-n[0]/det]as Plan,d:[-u[1]/det,u[0]/det]as Plan};
}
function convexRegion(inequalities:[number,number,number][]):Plan[]{
  const vertices:Plan[]=[];
  for(let i=0;i<inequalities.length;i++)for(let j=i+1;j<inequalities.length;j++){
    const [a,b,c]=inequalities[i]!,[d,e,f]=inequalities[j]!,det=a*e-b*d;if(det===0)continue;
    const p:Plan=[(b*f-c*e)/det,(c*d-a*f)/det];
    if(inequalities.every(([u,v,w])=>u*p[0]+v*p[1]+w>=-1e-10)&&!vertices.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1e-10))vertices.push(p);
  }
  const centre=vertices.reduce((p,q)=>[p[0]+q[0]/vertices.length,p[1]+q[1]/vertices.length]as Plan,[0,0]as Plan);
  return vertices.sort((a,b)=>Math.atan2(a[1]-centre[1],a[0]-centre[0])-Math.atan2(b[1]-centre[1],b[0]-centre[0]));
}
function intersection(subject:Plan[],mask:Plan[]):Plan[]{
  const direction=orient(mask[0]!,mask[1]!,mask[2]!)>0?1:-1;
  let polygon=subject;
  for(let i=0;i<mask.length;i++){const a=mask[i]!,b=mask[(i+1)%mask.length]!,next:Plan[]=[];for(let j=0;j<polygon.length;j++){const p=polygon[j]!,q=polygon[(j+1)%polygon.length]!,u=direction*orient(a,b,p),v=direction*orient(a,b,q);if(u>=0)next.push(p);if(u*v<0)next.push([p[0]+(q[0]-p[0])*u/(u-v),p[1]+(q[1]-p[1])*u/(u-v)]);}polygon=next;}
  return polygon;
}
// Independent half-plane vertex enumeration, rather than the producer's
// sequential polygon clipping. Dimensions are authored; placement is source-bound.
function expectedPanels(): { polygon:Plan[]; color:number }[]{
  const origin=CROSSING_CORNER.origin,fronts=["south","east"] as const;
  const frame={south:sourceFrame("south"),east:sourceFrame("east")};
  const point=(a:Plan,b:Plan,v:number):Plan=>{const det=a[0]*b[1]-a[1]*b[0];return[v*(b[1]-a[1])/det,v*(a[0]-b[0])/det];};
  const panels:{polygon:Plan[];color:number}[]=[];
  for(const side of fronts){const f=frame[side],other=frame[side==="south"?"east":"south"],divisions=side==="south"?[0,.245,.45,.55,.755,1]:[0,.255,.50,.755,1];
    for(let bay=0;bay+1<divisions.length;bay++){const a=divisions[bay]!*R[side].length,b=divisions[bay+1]!*R[side].length,door=side==="south"&&bay===2,active=!door&&!(side==="east"&&bay>=2),start=(door?(a+b)/2-.765:a+.20)+.065,end=(door?(a+b)/2+.765:b-.20)-.065,depth=active||door?2.25:.90;
      const inequalities:[number,number,number][]=[[f.s[0],f.s[1],-start],[-f.s[0],-f.s[1],end],[f.d[0],f.d[1],depth],[-f.d[0],-f.d[1],-.30]];
      if(bay===0){const p=point(frame.south.s,frame.east.s,start),q=point(frame.south.d,frame.east.d,-depth),u=q[0]-p[0],v=q[1]-p[1],probe:Plan=[f.u[0]*(end-.1)-f.n[0]*.5,f.u[1]*(end-.1)-f.n[1]*.5],sign=(u*(probe[1]-p[1])-v*(probe[0]-p[0]))>0?1:-1;inequalities.push([-sign*v,sign*u,sign*(v*p[0]-u*p[1])]);}
      else inequalities.push([f.n[0]-other.n[0],f.n[1]-other.n[1],0]);
      for(let i=0;i<R.footprint.length;i++){const p=R.footprint[i]!,q=R.footprint[(i+1)%R.footprint.length]!,x=p[0]-origin[0],z=p[2]-origin[2],dx=q[0]-p[0],dz=q[2]-p[2];inequalities.push([-dz,dx,dz*x-dx*z]);}
      const vertices=convexRegion(inequalities);
      panels.push({polygon:vertices.map(p=>[p[0]+origin[0],p[1]+origin[2]]),color:active||door?0xbab6a5:0x333f43});
    }
  }return panels;
}
function expectedPostContacts():Plan[][]{
  const origin=CROSSING_CORNER.origin,south=sourceFrame("south"),east=sourceFrame("east"),polygons:Plan[][]=[];
  for(const side of ["south","east"]as const){
    const f=side==="south"?south:east,sign=side==="south"?1:-1,divisions=side==="south"?[0,.245,.45,.55,.755,1]:[0,.255,.50,.755,1],rectangles:number[][]=[];
    for(let bay=0;bay+1<divisions.length;bay++){
      const a=divisions[bay]!*R[side].length,b=divisions[bay+1]!*R[side].length,door=side==="south"&&bay===2,start=door?(a+b)/2-.765:a+.20,end=door?(a+b)/2+.765:b-.20,w=door?.075:.18;
      rectangles.push([a,a+w,-.25,.005],[b-w,b,-.25,.005],[start,start+.065,-.30,.005],[end-.065,end,-.30,.005]);
      if(door)rectangles.push([(a+b)/2-.025,(a+b)/2+.025,-.30,-.24]);
    }
    rectangles.push([R[side].length-.06,side==="east"?19.18894313256142:R[side].length,-.30,.005]);
    const terminal=Math.max(...sourceOracle.cutSegments.flatMap(segment=>segment.points).map(p=>f.s[0]*(p[2]!-origin[0])+f.s[1]*(p[4]!-origin[2])));
    for(const [a,b,back,front]of rectangles){const polygon=convexRegion([[f.s[0],f.s[1],-a!],[-f.s[0],-f.s[1],b!],[f.d[0],f.d[1],-back!],[-f.d[0],-f.d[1],front!],[sign*(south.d[0]-east.d[0]),sign*(south.d[1]-east.d[1]),0],[-f.s[0],-f.s[1],terminal]]);if(polygon.length>=3)polygons.push(polygon.map(p=>[p[0]+origin[0],p[1]+origin[2]]));}
  }return polygons;
}

const emitted = vi.hoisted(() => ({ canopy: [] as { points: number[][]; category: string; color: number }[] }));
vi.mock("../src/scene/commercial-ground-canopy.js", async original => {
  const actual = await original<typeof import("../src/scene/commercial-ground-canopy.js")>();
  return { ...actual, buildCommercialCanopy(args: Parameters<typeof actual.buildCommercialCanopy>[0]) {
    const wrap = (out: typeof args.stone, category: string): typeof args.stone => ({
      triangle(a, b, c, color) { emitted.canopy.push({ points: [a,b,c].map(p => p.map(Math.fround)), category, color }); out.triangle(a,b,c,color); },
      quad(a,b,c,d,color) { this.triangle(a,b,c,color); this.triangle(a,c,d,color); },
    });
    actual.buildCommercialCanopy({ ...args, stone: wrap(args.stone,"cladding"), metal: wrap(args.metal,"metal"), rooms: wrap(args.rooms,"rooms") });
  } };
});

function directedBoundary(triangles: { points: number[][] }[]) {
  const edges = new Map<string, number[]>();
  let volume = 0;
  for (const { points: p } of triangles) {
    const a = new Vector3(...p[0]!), b = new Vector3(...p[1]!), c = new Vector3(...p[2]!);
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let i = 0; i < 3; i++) {
      const u = p[i]!.join(","), v = p[(i+1)%3]!.join(","), key = [u,v].sort().join("/");
      edges.set(key, [...(edges.get(key) ?? []), u < v ? 1 : -1]);
    }
  }
  const bad = [...edges].filter(([, rows]) => rows.length !== 2 || rows[0] !== -rows[1]!);
  return { edgeCount: edges.size, volume, badCount: bad.length, bad: bad.slice(0,12) };
}
function checkCanopy(triangles:Emitted[]):void{
  expect(directedBoundary(triangles).badCount,"Every roof boundary and named interface has two opposite incidences").toBe(0);
  expect(directedBoundary(triangles).volume).toBeGreaterThan(0);
  const seamY=Math.fround(19.823179224918203);
  for(const segment of sourceOracle.cutSegments){
    const ends=segment.points.map(p=>[Math.fround(p[2]!),seamY,Math.fround(p[4]!)].join(",")),key=ends.sort().join("/");
    const incidence=triangles.filter(t=>t.points.some((p,i)=>[p.join(","),t.points[(i+1)%3]!.join(",")].sort().join("/")===key));
    expect(incidence.map(t=>[t.category,t.color]).sort(),`Whole independent source interval face${segment.face}`).toEqual([["cladding",0xc6c3b5],["metal",0x3f4849]]);
  }
  const roof=triangles.filter(t=>t.category==="rooms"&&t.points.every(p=>p[1]===seamY));
  const panels=expectedPanels();expect(panels).toHaveLength(9);
  for(const panel of panels){
    let covered=0;for(const t of roof){const clipped=intersection(panel.polygon,t.points.map(p=>[p[0]!,p[2]!]));const overlap=clipped.length<3?0:area(clipped);if(overlap>1e-7)expect(t.color,"Whole room ceiling retains its authored finish").toBe(panel.color);covered+=overlap;}
    // Bound is the source/TRS20µm guard, including the final Float32 encoding.
    const perimeter=panel.polygon.reduce((s,a,i)=>{const b=panel.polygon[(i+1)%panel.polygon.length]!;return s+Math.hypot(b[0]-a[0],b[1]-a[1]);},0);
    expect(Math.abs(covered-area(panel.polygon)),"Every independent complete room panel is covered").toBeLessThan(perimeter*.00002);
  }
  const expected=panels.reduce((s,p)=>s+area(p.polygon),0),actual=roof.reduce((s,t)=>s+area(t.points.map(p=>[p[0]!,p[2]!])),0);
  expect(Math.abs(actual-expected),"No excess room ceiling lies outside the nine authored panels").toBeLessThan(.001);
  const ceiling=Math.fround(15.09811684288055+(54.8907857589529-15.09811684288055)/8-.43-.065);
  const underside=triangles.filter(t=>t.points.every(p=>p[1]===ceiling));
  const contacts=expectedPostContacts();expect(contacts).toHaveLength(39);
  for(const polygon of contacts){
    const covered=underside.reduce((sum,t)=>{const p=intersection(polygon,t.points.map(v=>[v[0]!,v[2]!]));return sum+(p.length>=3?area(p):0);},0);
    const perimeter=polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length]!;return sum+Math.hypot(b[0]-a[0],b[1]-a[1]);},0);
    expect(Math.abs(covered-area(polygon)),"The complete named post contact lies on the single owned canopy underside").toBeLessThan(perimeter*.000004);
  }
}

it("constructs the actual ground replacement from the unchanged categorical source", async () => {
  const bytes = readFileSync(new URL("../data/scene/buildings/data/data518.b3dm", import.meta.url));
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(CROSSING_CORNER.tileSha256);
  const tile = parseB3dm(bytes), glb = parseGlb(tile.glb), decoded = await Promise.all(glb.json.meshes![0]!.primitives.map(p => decodePrimitive(glb.json, glb.binary!, p, true)));
  const gml = readBatchColumn(tile.batchTableJson, tile.batchTableBinary, "gml_id", tile.featureTableJson.BATCH_LENGTH as number);
  const scene = new Group() as Group & { batchTable: { getDataFromId(id: number): Record<string, unknown> } };
  scene.batchTable = { getDataFromId: id => ({ gml_id: gml[id] }) };
  scene.applyMatrix4(new Matrix4().fromArray(glb.json.nodes![1]!.matrix!));
  const texture = new Texture({ width: 4096, height: 4096 } as never); texture.flipY = false; texture.colorSpace = SRGBColorSpace;
  for (const [index, d] of decoded.entries()) {
    const geometry = new BufferGeometry(); geometry.setAttribute("position", new BufferAttribute(d.positions.slice(), 3)); geometry.setAttribute("normal", new BufferAttribute(d.surface!.normals.slice(), 3));
    geometry.setAttribute("_batchid", new BufferAttribute(Uint8Array.from(d.batchIds!), 1));
    if (d.surface!.uv) geometry.setAttribute("uv", new BufferAttribute(d.surface!.uv.slice(), 2)); geometry.setIndex(new BufferAttribute(d.surface!.indices.slice(), 1));
    scene.add(new Mesh(geometry, new MeshStandardMaterial({ map: index === 1 ? texture : null })));
  }
  scene.updateMatrixWorld(true);
    const sourceState=()=>scene.children.filter((o):o is Mesh=>o instanceof Mesh).map(mesh=>[mesh.geometry.index,...["position","normal","uv","_batchid"].map(name=>mesh.geometry.getAttribute(name))].filter(Boolean).map(a=>createHash("sha256").update(new Uint8Array(a!.array.buffer,a!.array.byteOffset,a!.array.byteLength)).digest("hex")));
    const originalArrays=sourceState();
  const result: Record<string, unknown> = { status: "RUNNING", process: process.pid, model: null, meshes: [] };
  try {
    emitted.canopy.length = 0;
    prepareCrossingCorner(scene, CROSSING_CORNER.tileUri, CROSSING_CORNER.tileSha256);
    const photo=scene.children[1] as Mesh, sourcePosition=photo.geometry.getAttribute("position"), sourceUV=photo.geometry.getAttribute("uv"), sourceNormal=photo.geometry.getAttribute("normal"), foundationPosition=(scene.children[0]as Mesh).geometry.getAttribute("position");
    const controls:[string,()=>void,()=>void][]=[];
    const mutate=(name:string,attribute:typeof sourcePosition,index:number,delta:number):void=>{const original=attribute.getX(index);controls.push([name,()=>attribute.setX(index,original+delta),()=>attribute.setX(index,original)]);};
    mutate("source position",sourcePosition,1434,.001);mutate("source UV",sourceUV,1434,.001);mutate("source normal",sourceNormal,1434,.1);mutate("foundation position",foundationPosition,180,.001);mutate("source index",photo.geometry.index!,478*3,1);
    const originalX=scene.position.x;controls.push(["source TRS",()=>{scene.position.x=originalX+.01;},()=>{scene.position.x=originalX;}]);
    for(const [name,change,restore]of controls){try{change();expect(()=>prepareCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256),name).toThrow(/Commercial corner/);}finally{restore();}expect(()=>prepareCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256),`${name} exact restoration`).not.toThrow();}
    const oldSide=(photo.material as MeshStandardMaterial).side;try{(photo.material as MeshStandardMaterial).side=DoubleSide;expect(()=>prepareCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256)).toThrow(/single photographic/);}finally{(photo.material as MeshStandardMaterial).side=oldSide;}
    expect(()=>prepareCommercialCorner(scene,CROSSING_CORNER.tileUri,"wrong source")).toThrow(/SHA-256/);
    prepareCommercialCorner(scene, CROSSING_CORNER.tileUri, CROSSING_CORNER.tileSha256);
    const originalSourceCompile=(photo.material as MeshStandardMaterial).onBeforeCompile;
    const options={ style: createFacadeStyle(worldStyle("satellite")), signageIntensity: { value: 2.15 } };
    expect(addCommercialCorner(scene, CROSSING_CORNER.tileUri, CROSSING_CORNER.tileSha256, options)).toBe(true);
    const group = scene.getObjectByName(R.name)!; expect(group).toBeDefined();
    expect(sourceState(),"Original source geometry, normals, UVs, indices and batch IDs are byte exact").toEqual(originalArrays);
    const binding=photo.geometry.getAttribute("mapsCommercialSource"),index=photo.geometry.index!;
    let bindingMismatch=0;for(let face=0;face<index.count/3;face++)for(let c=0;c<3;c++)if(binding.getX(index.getX(face*3+c))!==([478,479,480,481,482,494,495].includes(face)?1:0))bindingMismatch++;
    expect(bindingMismatch,"Only the seven original source faces are selected across the complete indexed primitive").toBe(0);
    result.model = group.userData.commercialCorner;
    const rows: Record<string, unknown>[] = [];
    for (const object of group.children) if (object instanceof Mesh) {
      const p = object.geometry.getAttribute("position"),n=object.geometry.getAttribute("normal"); let zero = 0; const triangles = new Set<string>(); let duplicate = 0,maxNormalError=0; const bad: unknown[] = [];
      for (let i = 0; i < p.count; i += 3) {
        const vertices = [0,1,2].map(k => new Vector3().fromBufferAttribute(p, i + k));
        const collapsed = vertices[1]!.clone().sub(vertices[0]!).cross(vertices[2]!.clone().sub(vertices[0]!)).lengthSq() === 0;
        if (collapsed) zero++;
        const normal=new Triangle(vertices[0]!,vertices[1]!,vertices[2]!).getNormal(new Vector3());for(let k=0;k<3;k++)maxNormalError=Math.max(maxNormalError,new Vector3().fromBufferAttribute(n,i+k).distanceTo(normal));
        const key = vertices.map(v => v.toArray().join(",")).sort().join("/"); if (triangles.has(key)) duplicate++;
        if (collapsed || triangles.has(key)) bad.push({ triangle: i/3, vertices: vertices.map(v=>v.toArray()), collapsed, duplicate: triangles.has(key) }); triangles.add(key);
      }
      rows.push({ name: object.name, triangles: p.count / 3, zero, duplicate,maxNormalError, bad });
    }
    result.meshes = rows;
    result.canopy = { ...directedBoundary(emitted.canopy), triangles: [...emitted.canopy] };
    expect(group.userData.commercialCorner.triangles).toBeLessThanOrEqual(12000); expect(group.userData.commercialCorner.geometryBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(rows.every(r => r.zero === 0 && r.duplicate === 0)).toBe(true);
    expect(rows.every(r=>(r.maxNormalError as number)<.000004),"All actual stored normals agree with emitted winding").toBe(true);
    const foundationMesh=scene.children[0]as Mesh,fp=foundationMesh.geometry.getAttribute("position"),fi=foundationMesh.geometry.index!,support=[60,61,62].map(face=>[0,1,2].map(k=>{const v=new Vector3().fromBufferAttribute(fp,fi.getX(face*3+k)).applyMatrix4(foundationMesh.matrixWorld);v.y=0;return v;}));
    for(const category of ["rooms","furnishings"]){const mesh=group.getObjectByName(`${R.name}:${category}`)as Mesh,p=mesh.geometry.getAttribute("position");let outside=0;for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i);v.y=0;if(!support.some(t=>Math.min(...Triangle.getBarycoord(v,t[0]!,t[1]!,t[2]!,new Vector3())!.toArray())>=-2e-6))outside++;}expect(outside,`Every ${category} vertex stays within the actual installed source pentagon`).toBe(0);}
    const pavementBytes=readFileSync(new URL("../data/scene/pavements.mesh",import.meta.url));
    expect(createHash("sha256").update(pavementBytes).digest("hex")).toBe("841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6");
    const pavement=decodeMesh(pavementBytes),facet=[0,1,2].map(k=>new Vector3().fromArray(pavement.positions,pavement.indices[464606*3+k]!*3)),normal=new Triangle(facet[0]!,facet[1]!,facet[2]!).getNormal(new Vector3()),projected=facet.map(p=>new Vector3(p.x,0,p.z));
    const grade=(p:Vector3)=>facet[0]!.y-(normal.x*(p.x-facet[0]!.x)+normal.z*(p.z-facet[0]!.z))/normal.y+.001;
    const origin=new Vector3(...CROSSING_CORNER.origin),u=new Vector3(-.9930177740529156,0,.11796482700934834).normalize(),n=new Vector3(.11796482700934834,0,.9930177740529156).normalize();
    const threshold=[[17.0389342982/2-.8,.02],[17.0389342982/2+.8,.02],[17.0389342982/2+.8,.24],[17.0389342982/2-.8,.24]].map(([s,d])=>origin.clone().addScaledVector(u,s!).addScaledVector(n,d!));
    for(const point of threshold)expect(Math.min(...Triangle.getBarycoord(new Vector3(point.x,0,point.z),projected[0]!,projected[1]!,projected[2]!,new Vector3())!.toArray()),"The whole convex1.60m×.22m threshold has pavement support").toBeGreaterThan(.0373);
    const cladding=group.getObjectByName(`${R.name}:cladding`)as Mesh,positions=cladding.geometry.getAttribute("position"),claddingTriangles=Array.from({length:positions.count/3},(_,i)=>[0,1,2].map(k=>new Vector3().fromBufferAttribute(positions,i*3+k)));
    const checkThreshold=(triangles:Vector3[][])=>{const top=triangles.filter(t=>t.every(p=>Math.abs(p.y-grade(p))<.00002)),mask=threshold.map(p=>[p.x,p.z]as Plan);const pieces=top.map(t=>{const p=intersection(mask,t.map(v=>[v.x,v.z]));return{area:p.length>=3?area(p):0,triangle:t.map(v=>v.toArray())};}).filter(p=>p.area>1e-8),covered=pieces.reduce((sum,p)=>sum+p.area,0);result.threshold={expected:area(mask),covered,pieces};expect(Math.abs(covered-area(mask)),"Every point of the independently specified threshold top is emitted once").toBeLessThan(.00002);};
    checkThreshold(claddingTriangles);expect(()=>checkThreshold(claddingTriangles.map(t=>t.map(p=>new Vector3(p.x,15.50,p.z))))).toThrow();checkThreshold(claddingTriangles);
    result.threshold={...(result.threshold as object),width:1.60,depth:.22,wholePavementSupport:true,wholeSlopedCoverage:true,flatMutantRed:true,exactRestoredGreen:true};
    checkCanopy(emitted.canopy);
    const literal=emitted.canopy.map(t=>({...t,points:t.points.map(p=>p.slice())}));
    const cutFace=literal.findIndex(t=>t.category==="metal"&&t.points.every(p=>p[1]===Math.fround(sourceOracle.seam)));
    expect(cutFace).toBeGreaterThanOrEqual(0);
    const selected=literal[cutFace]!,[a,b,c]=selected.points,mid=b!.map((v,i)=>(v+c![i]!)/2),half={...selected,points:[a!,b!,mid]};
    expect(2*area(half.points.map(p=>[p[0]!,p[2]!]))).toBeCloseTo(area(selected.points.map(p=>[p[0]!,p[2]!])),12);
    const mutants: [string,()=>Emitted[]][]=[
      ["missing whole exterior metal cap",()=>literal.filter(t=>!(t.category==="metal"&&t.points.every(p=>p[1]===Math.fround(sourceOracle.seam))))],
      ["reverse exterior winding",()=>literal.map((t,i)=>i===cutFace?{...t,points:t.points.toReversed()}:t)],
      ["duplicate exterior",()=>[...literal,literal[cutFace]!]],
      ["area-compensated hole and duplicate",()=>literal.flatMap((t,i)=>i===cutFace?[half,half]:[t])],
      ["wrong seam finish",()=>literal.map(t=>t.category==="metal"&&t.points.every(p=>p[1]===Math.fround(sourceOracle.seam))?{...t,color:0xc6c3b5}:t)],
    ];
    for(const[name,mutate]of mutants){expect(()=>checkCanopy(mutate()),name).toThrow();expect(()=>checkCanopy(literal),`${name} exact restoration`).not.toThrow();}
    result.controls={sourceMutations:controls.length+2,boundaryMutations:mutants.map(([name])=>name),exactRestorations:true};
    for(const mesh of [photo,...group.children.filter((o):o is Mesh=>o instanceof Mesh)]){
      const passes:[Material,keyof typeof ShaderLib][]=[[mesh.material as Material,"standard"],[mesh.customDepthMaterial!,"depth"],[mesh.customDistanceMaterial!,"distanceRGBA"],[getCommercialCornerNormalMaterial(mesh)!,"normal"]];
      for(const[material,kind]of passes){const shader={uniforms:{}as Record<string,unknown>,vertexShader:ShaderLib[kind]!.vertexShader,fragmentShader:ShaderLib[kind]!.fragmentShader};material.onBeforeCompile(shader as never,{}as never);expect(shader.uniforms["mapsCommercialProcedural"]).toBe(options.style.procedural);expect(shader.fragmentShader).toContain(mesh===photo?"if (mapsCommercialHidden(":"if (mapsCommercialProcedural > 0.5) discard;");}
    }
    const relief=scene.getObjectByName("crossing-frontage-surround")!;
    relief.traverse(object=>{if(object instanceof Mesh)for(const[material,kind]of[[object.material,"standard"],[object.customDepthMaterial,"depth"],[object.customDistanceMaterial,"distanceRGBA"],[getCrossingFrontageNormalMaterial(object),"normal"]]as[Material,keyof typeof ShaderLib][]){const shader={uniforms:{}as Record<string,unknown>,vertexShader:ShaderLib[kind]!.vertexShader,fragmentShader:ShaderLib[kind]!.fragmentShader};material.onBeforeCompile(shader as never,{}as never);expect(shader.uniforms["mapsCommercialProcedural"]).toBe(options.style.procedural);expect(shader.fragmentShader).toContain("if (mapsCommercialProcedural < 0.5) discard;");}});
    const glass=group.getObjectByName(`${R.name}:glazing`)as Mesh,glassMaterial=glass.material as MeshStandardMaterial,metalMaterial=(group.getObjectByName(`${R.name}:metal`)as Mesh).material as MeshStandardMaterial;
    expect(glass.castShadow).toBe(false);expect(glassMaterial).toMatchObject({roughness:.13,metalness:.12,opacity:.23,transparent:true,depthWrite:false});expect(metalMaterial).toMatchObject({roughness:.35,metalness:.58});
    const glassNormal=getCommercialCornerNormalMaterial(glass)!;expect(glassNormal.visible).toBe(false);expect(glassNormal.depthWrite).toBe(false);
    const renderScene=new Scene(),ordinary=new MeshNormalMaterial();renderScene.add(scene);
    try{expect(()=>withNormalMaterials(renderScene,ordinary,getCommercialCornerNormalMaterial,()=>{expect(glass.material).toBe(glassNormal);throw Error("controlled normal draw failure");})).toThrow("controlled normal draw failure");expect(glass.material).toBe(glassMaterial);expect(renderScene.overrideMaterial).toBeNull();}finally{ordinary.dispose();}
    const hidden=new Function(COMMERCIAL_SOURCE_GLSL.replace("float mapsCommercialHidden(float binding, float y, float procedural)","function hidden(binding,y,procedural)")+"; return hidden;")()as(binding:number,y:number,procedural:number)=>number;
    expect(hidden(1,19,0)).toBe(1);expect(hidden(1,20,0)).toBe(0);expect(hidden(0,19,0)).toBe(0);
    const light=group.children.find((o):o is PointLight=>o instanceof PointLight)!;expect(light.distance).toBe(4);expect(light.castShadow).toBe(false);
    applyFacadeStyle(options.style,worldStyle("cartographic"));expect(hidden(1,19,options.style.procedural.value)).toBe(0);expect(light.intensity).toBe(0);
    applyFacadeStyle(options.style,worldStyle("satellite"));expect(light.intensity).toBeCloseTo(19.35);options.signageIntensity.value=.05;expect(light.intensity).toBeCloseTo(.45);
    for(const object of group.children)if(object instanceof Mesh)expect(getCommercialCornerNormalMaterial(object),`Actual normal registration for ${object.name}`).toBeDefined();
    expect(addCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256,{style:createFacadeStyle(worldStyle("satellite")),signageIntensity:{value:2.15}})).toBe(true);
    const stone=group.getObjectByName(`${R.name}:cladding`)as Mesh;
    (stone.material as MeshStandardMaterial).dispose();
    expect(scene.getObjectByName(R.name),"Unload removes the actual replacement").toBeUndefined();
    expect((photo.material as MeshStandardMaterial).onBeforeCompile,"Unload restores the original source hook").toBe(originalSourceCompile);
    expect(getCommercialCornerNormalMaterial(stone),"Unload unregisters the private normal pass").toBeUndefined();
    prepareCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);
    const add=scene.add.bind(scene),guard=vi.spyOn(scene,"add").mockImplementation((...objects)=>{if(objects.some(o=>o.name===R.name))throw Error("controlled late ground attach failure");return add(...objects);});
    try{expect(()=>addCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256,options)).toThrow("controlled late ground attach failure");}finally{guard.mockRestore();}
    expect(scene.getObjectByName(R.name)).toBeUndefined();expect((photo.material as Material).onBeforeCompile).toBe(originalSourceCompile);expect(getCommercialCornerNormalMaterial(photo)).toBeUndefined();
    prepareCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256);expect(addCommercialCorner(scene,CROSSING_CORNER.tileUri,CROSSING_CORNER.tileSha256,options)).toBe(true);
    ((scene.getObjectByName(`${R.name}:cladding`)as Mesh).material as Material).dispose();
    result.lifecycle={normalRegistration:true,beautyDepthDistanceNormalSharedStyle:true,sourceUpperPreserved:true,idempotentAdd:true,unloadRestoration:true,lateRollback:true,exactRestoredConstruction:true};
    result.status = "CONSTRUCTED_RESOURCE_TRIANGLE_AND_CANOPY_BOUNDARY_CHECKS";
  } catch (error) { result.status = "FAILED"; result.error = { name: (error as Error).name, message: (error as Error).message, stack: (error as Error).stack }; throw error; }
  finally {
    mkdirSync(new URL("../artifacts/1413/",import.meta.url),{recursive:true});
    writeFileSync(new URL(`../artifacts/1413/construction-${process.pid}-${Date.now()}.json`, import.meta.url), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    const resources = new Set<{ dispose(): void }>(); scene.traverse(object => { if (object instanceof Mesh) { resources.add(object.geometry); for (const material of [...(Array.isArray(object.material) ? object.material : [object.material]), object.customDepthMaterial, object.customDistanceMaterial]) if (material) resources.add(material); } });
    for (const resource of resources) resource.dispose(); texture.dispose();
  }
}, 30000);

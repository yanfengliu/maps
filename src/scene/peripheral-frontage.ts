/** A finite authored entrance in the east photographic wall. The original
 * source buffers remain immutable; all four source passes cut the same opening.
 * Physical returns, a closed lobby and a narrow terrain-supported landing fill it. */
import { BufferGeometry, Color, Float32BufferAttribute, Group, Material, Mesh, MeshDepthMaterial, MeshDistanceMaterial, MeshNormalMaterial, MeshStandardMaterial, NoBlending, Object3D, RGBADepthPacking, Triangle, Vector3 } from "three";
import { PERIPHERAL_MOUNTED_LIGHT as S } from "./peripheral-mounted-light-recipe.js";
import type { FacadeTextureLifetime } from "./facade-textures.js";
import type { FacadeStyleUniforms, SignageUniform } from "./tile-materials.js";

export const EAST_FRONTAGE = Object.freeze({ name: "peripheral-east-frontage", centres: [-9.6,-4.8,0] as readonly number[], halfWidth: 2.4, jamb: .20, top: 28.98, ceiling: 28.68, front: .14, glass: -.55, rear: -1.8, back: -1.95, base: 21.95, landingHalfWidth: .7, landingDepth: 2.7 });
const R = EAST_FRONTAGE, origin = new Vector3(...S.mount.origin), right = new Vector3(...S.mount.right), up = new Vector3(...S.mount.up), outward = new Vector3(...S.mount.normal);
const sources = new WeakMap<Object3D, Mesh>(), active = new WeakMap<Object3D, Group>(), normals = new WeakMap<Mesh, Material>();
export const getPeripheralFrontageNormalMaterial = (mesh: Mesh): Material | undefined => normals.get(mesh);
type Point = readonly [number, number, number];
interface Options { style: FacadeStyleUniforms; signageIntensity: SignageUniform }
const fail = (part: string): never => { throw Error(`Peripheral east entrance ${part} differs from reviewed ${S.tileUri}/${S.gmlId}. Restore the pinned original source and logical tile owner before constructing this finite entrance.`); };
const gl = (n: number): string => Number.isInteger(n) ? `${n}.0` : String(n);
const at = (x: number, y: number, depth: number): Vector3 => origin.clone().addScaledVector(right, x).addScaledVector(up, y - origin.y).addScaledVector(outward, depth);
// Actual pavement263078 intersected with source-frame outward depth2.7m.
// The narrow landing crosses adjoining263079 at x=-.6389166585750743.
// Its complete front edge is checked against both actual facets, not a centroid.
const grade = 0.05834336665941143;
export const eastFrontageFloor = (x: number): number => 25.6811243664405 + grade * x;
export function preparePeripheralFrontage(scene: Object3D, uri: string, digest: string | undefined): void {
  if (uri !== S.tileUri) return;
  if (digest !== S.tileSha256) fail("SHA-256");
  scene.updateMatrixWorld(true);
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  if (table?.getDataFromId(S.batch)["gml_id"] !== S.gmlId) fail("GML identity");
  let source: Mesh | undefined;
  scene.traverse(o => {
    if (!(o instanceof Mesh) || !o.geometry.hasAttribute("uv")) return;
    const ids = o.geometry.getAttribute("_batchid") ?? o.geometry.getAttribute("_BATCHID"), index = o.geometry.index, p = o.geometry.getAttribute("position");
    if (!ids || !index || ids.getX(index.getX(S.faces[0].face * 3)) !== S.batch) return;
    if (source || !(o.material instanceof MeshStandardMaterial) || !o.material.map) fail("single photographic primitive");
    const points = [0,1,2].map(k => new Vector3().fromBufferAttribute(p, index.getX(S.faces[0].face * 3 + k)).applyMatrix4(o.matrixWorld));
    const triangle = new Triangle(points[0]!, points[1]!, points[2]!);
    if (triangle.getNormal(new Vector3()).dot(outward) < .999999) fail("source winding");
    for (const centre of R.centres) for (const x of [centre - R.halfWidth, centre + R.halfWidth]) for (const y of [eastFrontageFloor(x), R.top]) {
      const point = at(x,y,0), bary = triangle.getBarycoord(point,new Vector3());
      if (!bary || Math.min(...bary.toArray()) < .001 || triangle.closestPointToPoint(point,new Vector3()).distanceTo(point) > 2e-5) fail("complete opening inside original face");
    }
    // The adopted lamp's whole source back remains above this opening.
    if (R.top >= Math.min(...[-.3,.3].flatMap(x => [-.09,.09].map(y => at(x,origin.y+y,0).y)))) fail("lamp backing clearance");
    source = o;
  });
  if (!source) fail("photographic face");
  sources.set(scene, source!);
}

const sourceGLSL = `
vec3 mapsEastLocal(vec3 world) {
 vec3 d=world-vec3(${origin.toArray().map(gl).join(",")});
 return vec3(dot(d,vec3(${right.toArray().map(gl).join(",")})),dot(d,vec3(${up.toArray().map(gl).join(",")}))+${gl(origin.y)},dot(d,vec3(${outward.toArray().map(gl).join(",")})));
}
bool mapsEastOpening(vec3 p) { return abs(p.z)<0.002 && p.y>${gl(eastFrontageFloor(0))}+${gl(grade)}*p.x && p.y<${gl(R.top)} && (${R.centres.map(c=>`(p.x>${gl(c-R.halfWidth)}&&p.x<${gl(c+R.halfWidth)})`).join("||")}); }
`;
function presentation(material: Material, options: Options, source: boolean): void {
  const compile = material.onBeforeCompile.bind(material), key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader,renderer);
    if (!shader.vertexShader.includes("#include <project_vertex>") || !shader.fragmentShader.includes("#include <clipping_planes_fragment>")) fail("three.js pass hooks");
    shader.uniforms.mapsEastProcedural = options.style.procedural;
    shader.vertexShader = `${source ? "varying vec3 mapsEastWorld;" : ""}\n` + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n${source ? "mapsEastWorld=(modelMatrix*vec4(transformed,1.0)).xyz;" : ""}`);
    shader.fragmentShader = `uniform float mapsEastProcedural;\n${source ? "varying vec3 mapsEastWorld;"+sourceGLSL : ""}\n` + shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${source ? "if(mapsEastProcedural<0.5&&mapsEastOpening(mapsEastLocal(mapsEastWorld)))discard;" : "if(mapsEastProcedural>0.5)discard;"}`);
  };
  material.customProgramCacheKey = () => `${key}:east-entrance-${source ? "source" : "physical"}-v1`;
}

class Surface {
  readonly positions: number[] = []; readonly colors: number[] = [];
  quad(a: Point,b: Point,c: Point,d: Point,color: number): void {
    const rgb = new Color(color);
    for (const p of [a,b,c,a,c,d]) { this.positions.push(...at(...p).toArray()); this.colors.push(rgb.r,rgb.g,rgb.b); }
  }
  box(a: number,b: number,low: number|((x:number)=>number),high: number|((x:number)=>number),rear: number,front: number,color: number): void {
    const la=typeof low==="number"?low:low(a),lb=typeof low==="number"?low:low(b),ha=typeof high==="number"?high:high(a),hb=typeof high==="number"?high:high(b);
    const p: Point[] = [[a,la,front],[b,lb,front],[b,hb,front],[a,ha,front],[a,la,rear],[b,lb,rear],[b,hb,rear],[a,ha,rear]];
    for (const [a,b,c,d] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]) this.quad(p[a!]!,p[b!]!,p[c!]!,p[d!]!,color);
  }
  geometry(): BufferGeometry {
    const g = new BufferGeometry(); g.setAttribute("position",new Float32BufferAttribute(this.positions,3)); g.setAttribute("color",new Float32BufferAttribute(this.colors,3)); g.setAttribute("_batchid",new Float32BufferAttribute(new Float32Array(this.positions.length/3).fill(S.batch),1)); g.computeVertexNormals(); return g;
  }
}

export function addPeripheralFrontage(scene: Object3D, uri: string, digest: string | undefined, options: Options, lifetime?: Pick<FacadeTextureLifetime,"onRelease">): boolean {
  if (uri !== S.tileUri || active.has(scene)) return false;
  if (digest !== S.tileSha256 || !sources.has(scene)) fail("unprepared source");
  const registerRelease = lifetime?.onRelease?.bind(lifetime); if (!registerRelease) fail("missing logical tile lifetime owner");
  const source = sources.get(scene)!, stone = new Surface(), metal = new Surface(), glass = new Surface(), room = new Surface();
  for (const centre of R.centres) {
    const a=centre-R.halfWidth,b=centre+R.halfWidth,l=a+R.jamb,r=b-R.jamb,la=centre-R.landingHalfWidth,lb=centre+R.landingHalfWidth,entrance=centre===0;
    const f=(x:number):number=>eastFrontageFloor(x), wall=0x777c79, recess=0x555e5b, floor=0x96968a;
    // Full front jambs, top, outside ends and rear close the source aperture.
    stone.quad([a,f(a),R.front],[l,f(l),R.front],[l,R.top,R.front],[a,R.top,R.front],wall);
    stone.quad([r,f(r),R.front],[b,f(b),R.front],[b,R.top,R.front],[r,R.top,R.front],wall);
    stone.quad([l,R.ceiling,R.front],[r,R.ceiling,R.front],[r,R.top,R.front],[l,R.top,R.front],wall);
    stone.quad([a,R.top,R.front],[b,R.top,R.front],[b,R.top,R.back],[a,R.top,R.back],wall);
    stone.quad([b,R.base,R.back],[a,R.base,R.back],[a,R.top,R.back],[b,R.top,R.back],wall);
    if(centre===R.centres[0])stone.quad([a,R.base,R.back],[a,R.base,R.front],[a,R.top,R.front],[a,R.top,R.back],wall);
    if(centre===R.centres.at(-1))stone.quad([b,R.base,R.front],[b,R.base,R.back],[b,R.top,R.back],[b,R.top,R.front],wall);
    // Opaque side and top reveals continue to the backed interior; front and
    // rear stations are shared with the glass and room, not floating overlays.
    room.quad([l,f(l),R.front],[l,f(l),R.rear],[l,R.ceiling,R.rear],[l,R.ceiling,R.front],recess);
    room.quad([r,f(r),R.rear],[r,f(r),R.front],[r,R.ceiling,R.front],[r,R.ceiling,R.rear],recess);
    room.quad([l,R.ceiling,R.front],[l,R.ceiling,R.rear],[r,R.ceiling,R.rear],[r,R.ceiling,R.front],0xaaa795);
    room.quad([l,f(l),R.rear],[r,f(r),R.rear],[r,R.ceiling,R.rear],[l,R.ceiling,R.rear],0x88816e);
    room.quad([l,f(l),R.rear],[l,f(l),R.front],[r,f(r),R.front],[r,f(r),R.rear],floor);
    // Flanking closed sills end at the wall. Only the doorway crosses the gap.
    for (const [x,z] of entrance?[[a,la],[lb,b]]:[[a,b]]) {
      stone.quad([x!,f(x!),0],[x!,f(x!),R.front],[z!,f(z!),R.front],[z!,f(z!),0],floor);
      stone.quad([x!,R.base,R.front],[z!,R.base,R.front],[z!,f(z!),R.front],[x!,f(x!),R.front],wall);
    }
    // One narrow solid landing, buried into the admitted terrain through its
    // whole footprint and meeting the actual sidewalk along the complete edge.
    if(entrance){
      stone.quad([la,f(la),R.front],[la,f(la),R.landingDepth],[lb,f(lb),R.landingDepth],[lb,f(lb),R.front],floor);
      stone.quad([la,R.base,R.landingDepth],[lb,R.base,R.landingDepth],[lb,f(lb),R.landingDepth],[la,f(la),R.landingDepth],wall);
      stone.quad([la,R.base,R.front],[la,R.base,R.landingDepth],[la,f(la),R.landingDepth],[la,f(la),R.front],wall);
      stone.quad([lb,R.base,R.landingDepth],[lb,R.base,R.front],[lb,f(lb),R.front],[lb,f(lb),R.landingDepth],wall);
      stone.quad([la,R.base,R.front],[lb,R.base,R.front],[lb,R.base,R.landingDepth],[la,R.base,R.landingDepth],wall);
    }
    stone.quad([b,R.base,R.back],[b,R.base,R.front],[a,R.base,R.front],[a,R.base,R.back],wall);
    // Recessed glass panels and a closed central door. Their frame is a real
    // 70mm-deep extrusion; the reflective sheets sit behind its outer plane.
    const stations=[l,l+.07,centre-.74,centre-.67,centre+.67,centre+.74,r-.07,r];
    for (const x of [l,centre-.74,centre+.67,r-.07]) metal.box(x,x+.07,f,R.ceiling-.07,R.glass-.035,R.glass+.035,0x293638);
    metal.box(l+.07,r-.07,R.ceiling-.07,R.ceiling,R.glass-.035,R.glass+.035,0x293638);
    for (const [x,z] of [[stations[1]!,stations[2]!],[stations[3]!,stations[4]!],[stations[5]!,stations[6]!]] as const) {
      metal.box(x,z,f,x=>f(x)+.04,R.glass-.035,R.glass+.035,0x293638);
      glass.quad([x,f(x)+.04,R.glass],[z,f(z)+.04,R.glass],[z,R.ceiling-.07,R.glass],[x,R.ceiling-.07,R.glass],0x9ab6b8);
    }
    if(entrance)metal.box(centre+.49,centre+.515,f(centre)+.88,f(centre)+1.31,R.glass,R.glass+.075,0xb4b7ac);
    // Approximate lobby detail, with no claim of an actual shop or occupancy.
    room.box(l+.22,l+1.22,f(l)+.15,f(l)+.53,-1.71,-1.28,centre<0?0x6d6254:0x665642);
    room.box(l+.31,l+.38,f(l),f(l)+.15,-1.65,-1.34,0x343f3e);
    room.box(l+1.06,l+1.13,f(l),f(l)+.15,-1.65,-1.34,0x343f3e);
    room.box(r-.72,r-.20,f(r)+.68,f(r)+1.62,R.rear,-1.74,centre<0?0x4d5a54:0x344a4c);
    room.box(centre-.48,centre+.48,R.ceiling-.045,R.ceiling,-1.35,-.88,0xddd3b2);
  }
  const group = new Group();group.name=R.name;group.matrix.copy(scene.matrixWorld).invert();group.matrixAutoUpdate=false;
  const ownedNormals: Material[]=[], owned:{dispose():void}[]=[], undo:(()=>void)[]=[];
  const own=<T extends {dispose():void}>(resource:T):T=>{owned.push(resource);return resource;};
  let closed=false;
  const detach=():void=>{if(closed)return;closed=true;for(const restore of undo.toReversed())restore();group.removeFromParent();for(const material of ownedNormals)material.dispose();sources.delete(scene);active.delete(scene);};
  try {
    const mats=[new MeshStandardMaterial({vertexColors:true,roughness:.82}),new MeshStandardMaterial({vertexColors:true,roughness:.32,metalness:.6}),new MeshStandardMaterial({vertexColors:true,roughness:.15,metalness:.12,transparent:true,opacity:.24,depthWrite:false}),new MeshStandardMaterial({vertexColors:true,roughness:.87})];
    for(const mat of mats)own(mat);
    Object.defineProperty(mats[3],"emissiveIntensity",{configurable:true,get:()=>options.style.procedural.value<.5?Math.max(0,options.signageIntensity.value-.05)*.12:0});mats[3]!.emissive.setHex(0xb6a070);
    for(const [i,surface]of[stone,metal,glass,room].entries()){
      const mesh=new Mesh(own(surface.geometry()),mats[i]!);mesh.name=`${R.name}:${["stone","metal","glazing","room"][i]}`;mesh.userData.authoredFrontage={gmlId:S.gmlId,source:false};mesh.castShadow=i!==2;mesh.receiveShadow=true;
      const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking}),distance=new MeshDistanceMaterial(),normal=new MeshNormalMaterial({blending:NoBlending});
      own(depth);own(distance);
      for(const pass of[mats[i]!,depth,distance,normal])presentation(pass,options,false);
      if(i===2){normal.visible=false;normal.depthWrite=false;}
      mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;normals.set(mesh,normal);ownedNormals.push(normal);undo.push(()=>normals.delete(mesh));group.add(mesh);
    }
    const oldCompile=(source.material as Material).onBeforeCompile,oldKey=(source.material as Material).customProgramCacheKey,oldDepth=source.customDepthMaterial,oldDistance=source.customDistanceMaterial;
    undo.push(()=>{(source.material as Material).onBeforeCompile=oldCompile;(source.material as Material).customProgramCacheKey=oldKey;source.customDepthMaterial=oldDepth;source.customDistanceMaterial=oldDistance;normals.delete(source);});
    presentation(source.material as Material,options,true);
    const depth=new MeshDepthMaterial({depthPacking:RGBADepthPacking}),distance=new MeshDistanceMaterial(),normal=new MeshNormalMaterial({blending:NoBlending});for(const pass of[depth,distance,normal])presentation(pass,options,true);
    own(depth);own(distance);source.customDepthMaterial=depth;source.customDistanceMaterial=distance;normals.set(source,normal);ownedNormals.push(normal);
    const meshes=group.children as Mesh[],triangles=meshes.reduce((s,m)=>s+m.geometry.getAttribute("position").count/3,0),geometryBytes=meshes.reduce((s,m)=>s+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0);
    group.userData.peripheralFrontage={beautyDraws:meshes.length,triangles,geometryBytes,imageTextures:0,localLights:0,bays:R.centres.length,approximateInterior:true,sourceFace:S.faces[0].face};
    registerRelease!(detach);scene.add(group);active.set(scene,group);return true;
  }catch(error){detach();for(const resource of owned)resource.dispose();throw error;}
}

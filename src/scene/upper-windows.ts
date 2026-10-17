/** Physical narrow windows on one verified photographic wall. Original source
 * arrays stay intact; beauty, shadows and GTAO remove the same finite apertures.
 * The geometry belongs to the parsed tile, including retained-model GPU return. */
import { BufferGeometry, Color, Float32BufferAttribute, Group, Material, Matrix3, Matrix4, Mesh, MeshDepthMaterial, MeshDistanceMaterial, MeshNormalMaterial, MeshStandardMaterial, NoBlending, Object3D, RGBADepthPacking, Triangle, Vector3 } from "three";
import { UPPER_WINDOWS as R } from "./upper-window-recipe.js";
import type { FacadeTextureLifetime } from "./facade-textures.js";
import type { FacadeStyleUniforms, SignageUniform } from "./tile-materials.js";

type Point = readonly [number, number, number];
interface Options { style: FacadeStyleUniforms; signageIntensity: SignageUniform }
const origin=new Vector3(...R.frame.origin), right=new Vector3(...R.frame.right), up=new Vector3(...R.frame.up), outward=new Vector3(...R.frame.normal);
const placement=new Matrix4().fromArray(R.parserPlacement), normalPlacement=new Matrix3().getNormalMatrix(placement);
const sources=new WeakMap<Object3D,Mesh>(), active=new WeakMap<Object3D,Group>(), normals=new WeakMap<Mesh,Material>();
export const getUpperWindowNormalMaterial=(mesh:Mesh):Material|undefined=>normals.get(mesh);
export function upperWindowSourceForUrl(url:string):typeof R|undefined { return new URL(url,"http://maps.invalid/").pathname.endsWith(`/buildings/${R.tileUri}`)?R:undefined; }
const fail=(part:string):never=>{throw Error(`Jinnan upper windows ${part} differs from reviewed ${R.tileUri}/${R.gmlId}. Restore the pinned original tile, nine-floor metadata, UV0 and logical parse owner before constructing these apertures.`);};
const gl=(n:number):string=>Number.isInteger(n)?`${n}.0`:String(n);
const vec=(p:readonly number[]):string=>`vec3(${p.map(gl).join(",")})`;
const at=(x:number,y:number,d:number):Vector3=>origin.clone().addScaledVector(right,x+R.frame.horizontalShear*y).addScaledVector(up,y).addScaledVector(outward,d);
const local=(p:Vector3):number[]=>{const q=p.clone().sub(origin),y=q.dot(up);return[q.dot(right)-R.frame.horizontalShear*y,y,q.dot(outward)];};
function clip(p:number[][],axis:number,edge:number,sign:number):number[][] { const out:number[][]=[];for(let i=0;i<p.length;i++){const a=p[i]!,b=p[(i+1)%p.length]!,u=sign*(a[axis]!-edge),v=sign*(b[axis]!-edge);if(u>=0)out.push(a);if(u*v<0)out.push(a.map((x,k)=>x+(b[k]!-x)*u/(u-v)));}return out; }
const area=(p:number[][]):number=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length]!;return s+a[0]!*b[1]!-a[1]!*b[0]!;},0))/2;

export function prepareUpperWindows(scene:Object3D,uri:string,digest:string|undefined):void {
  if(uri!==R.tileUri)return;
  if(digest!==R.tileSha256)fail("SHA-256");
  scene.updateMatrixWorld(true);
  const table=(scene as Object3D&{batchTable?:{getDataFromId(id:number):Record<string,unknown>}}).batchTable,meta=table?.getDataFromId(R.batch);
  if(meta?.["gml_id"]!==R.gmlId||meta["bldg:storeysAboveGround"]!==R.storeys||meta["bldg:measuredHeight"]!==R.measuredHeight)fail("GML/floor metadata");
  let source:Mesh|undefined;
  scene.traverse(o=>{
    if(!(o instanceof Mesh)||!o.geometry.hasAttribute("uv"))return;
    const g=o.geometry,p=g.getAttribute("position"),n=g.getAttribute("normal"),uv=g.getAttribute("uv"),ids=g.getAttribute("_batchid"),index=g.index;
    if(!ids||!index||ids.getX(index.getX(R.faces[0].face*3))!==R.batch)return;
    if(source||!(o.material instanceof MeshStandardMaterial)||!o.material.map||!p||!n)fail("single original photographic primitive");
    const map=(o.material as MeshStandardMaterial).map!;if(map.matrixAutoUpdate)map.updateMatrix();
    if(map.channel!==0||map.flipY||map.matrix.elements.some((x,i)=>Math.abs(x-[1,0,0,0,1,0,0,0,1][i]!)>1e-9))fail("original UV0 orientation");
    const worldNormals=new Matrix3().getNormalMatrix(o.matrixWorld),triangles=R.faces.map(face=>{
      const points=face.vertices.map((v,c)=>{const id=index.getX(face.face*3+c);if(id!==face.indices[c]||ids.getX(id)!==R.batch)fail(`face${face.face} indices/GML`);
        for(let k=0;k<3;k++)if(Math.abs(p.getComponent(id,k)-v.position[k]!)>1e-6||Math.abs(n.getComponent(id,k)-v.normal[k]!)>2e-6)fail(`face${face.face} original position/normal`);
        for(let k=0;k<2;k++)if(Math.abs(uv.getComponent(id,k)-v.uv[k]!)>1e-8)fail(`face${face.face} original UV`);
        const point=new Vector3().fromBufferAttribute(p,id).applyMatrix4(o.matrixWorld),expected=new Vector3(...v.position).applyMatrix4(placement),normal=new Vector3().fromBufferAttribute(n,id).applyNormalMatrix(worldNormals),expectedNormal=new Vector3(...v.normal).applyNormalMatrix(normalPlacement);
        if(point.distanceTo(expected)>2e-5||normal.distanceTo(expectedNormal)>4e-6||Math.abs(local(point)[2]!)>.001)fail(`face${face.face} parser placement/plane`);return point;
      });
      if(new Triangle(points[0]!,points[1]!,points[2]!).getNormal(new Vector3()).dot(outward)<.99999)fail(`face${face.face} winding`);
      return points.map(local);
    });
    // The three declared triangles are the original disjoint wall facets. Clip
    // their actual finite areas, including the diagonal through a window; a
    // centre or corner-only membership test cannot prove complete coverage.
    for(const w of R.windows){const[a,b,lo,hi]=w.bounds;let covered=0;for(const t of triangles){let polygon=t;for(const[axis,edge,sign]of[[0,a,1],[0,b,-1],[1,lo,1],[1,hi,-1]])polygon=clip(polygon,axis!,edge!,sign!);if(polygon.length>=3)covered+=area(polygon);}if(Math.abs(covered-(b-a)*(hi-lo))>2e-5)fail(`floor${w.floor}/column${w.column} complete aperture coverage`);}
    source=o;
  });
  if(!source)fail("photographic wall");sources.set(scene,source!);
}

const sourceGLSL=`
vec3 mapsUpperLocal(vec3 world){vec3 d=world-${vec(R.frame.origin)};float y=dot(d,${vec(R.frame.up)});return vec3(dot(d,${vec(R.frame.right)})-${gl(R.frame.horizontalShear)}*y,y,dot(d,${vec(R.frame.normal)}));}
bool mapsUpperOpening(vec3 p){return abs(p.z)<0.002&&(${R.windows.map(w=>{const[a,b,lo,hi]=w.bounds;return`(p.x>${gl(a)}&&p.x<${gl(b)}&&p.y>${gl(lo)}&&p.y<${gl(hi)})`;}).join("||")});}
`;
function presentation(material:Material,options:Options,source:boolean):void {
  const compile=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{compile(shader,renderer);if(!shader.vertexShader.includes("#include <project_vertex>")||!shader.fragmentShader.includes("#include <clipping_planes_fragment>"))fail("three.js pass hooks");
    shader.uniforms.mapsUpperProcedural=options.style.procedural;
    shader.vertexShader=`${source?"attribute float _batchid; varying float mapsUpperBatch; varying vec3 mapsUpperWorld;":""}\n`+shader.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>\n${source?"mapsUpperWorld=(modelMatrix*vec4(transformed,1.0)).xyz;mapsUpperBatch=_batchid;":""}`);
    shader.fragmentShader=`uniform float mapsUpperProcedural;\n${source?"varying float mapsUpperBatch;varying vec3 mapsUpperWorld;"+sourceGLSL:""}\n`+shader.fragmentShader.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>\n${source?`if(mapsUpperProcedural<0.5&&abs(mapsUpperBatch-${gl(R.batch)})<0.1&&mapsUpperOpening(mapsUpperLocal(mapsUpperWorld)))discard;`:"if(mapsUpperProcedural>0.5)discard;"}`);
  };
  material.customProgramCacheKey=()=>`${key}:jinnan-upper-${source?"source":"physical"}-v1`;
}
class Surface {
  readonly positions:number[]=[];readonly colors:number[]=[];
  quad(a:Point,b:Point,c:Point,d:Point,color:number):void {const rgb=new Color(color);for(const p of[a,b,c,a,c,d]){this.positions.push(...at(...p).toArray());this.colors.push(rgb.r,rgb.g,rgb.b);}}
  box(a:number,b:number,lo:number,hi:number,rear:number,front:number,color:number):void {const p:Point[]=[[a,lo,front],[b,lo,front],[b,hi,front],[a,hi,front],[a,lo,rear],[b,lo,rear],[b,hi,rear],[a,hi,rear]];for(const[i,j,k,l]of[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]])this.quad(p[i!]!,p[j!]!,p[k!]!,p[l!]!,color);}
  geometry():BufferGeometry {const g=new BufferGeometry();g.setAttribute("position",new Float32BufferAttribute(this.positions,3));g.setAttribute("color",new Float32BufferAttribute(this.colors,3));g.setAttribute("_batchid",new Float32BufferAttribute(new Float32Array(this.positions.length/3).fill(R.batch),1));g.computeVertexNormals();return g;}
}

export function addUpperWindows(scene:Object3D,uri:string,digest:string|undefined,options:Options,lifetime?:Pick<FacadeTextureLifetime,"onRelease">):boolean {
  if(uri!==R.tileUri||active.has(scene))return false;
  if(digest!==R.tileSha256||!sources.has(scene))fail("unprepared source");
  const register=lifetime?.onRelease?.bind(lifetime);if(!register)fail("missing logical parse lifetime");
  const source=sources.get(scene)!,stone=new Surface(),metal=new Surface(),glass=new Surface(),room=new Surface();
  for(const w of R.windows){const[a,b,lo,hi]=w.bounds,l=a+.115,r=b-.115,bottom=lo+.13,top=hi-.13,front=.065,rear=-1.15,glazing=-.28,wall=0x969282;
    // Four opaque front frame regions and four outside returns meet the exact
    // source aperture boundary. The inset box is closed at every back/edge.
    stone.quad([a,lo,front],[l,lo,front],[l,hi,front],[a,hi,front],wall);
    stone.quad([r,lo,front],[b,lo,front],[b,hi,front],[r,hi,front],wall);
    stone.quad([l,lo,front],[r,lo,front],[r,bottom,front],[l,bottom,front],0xa4a18f);
    stone.quad([l,top,front],[r,top,front],[r,hi,front],[l,hi,front],wall);
    stone.quad([a,lo,-.002],[a,lo,front],[a,hi,front],[a,hi,-.002],wall);
    stone.quad([b,lo,front],[b,lo,-.002],[b,hi,-.002],[b,hi,front],wall);
    stone.quad([a,hi,front],[b,hi,front],[b,hi,-.002],[a,hi,-.002],wall);
    stone.quad([a,lo,-.002],[b,lo,-.002],[b,lo,front],[a,lo,front],wall);
    room.quad([l,bottom,front],[l,bottom,rear],[l,top,rear],[l,top,front],0x827f72);
    room.quad([r,bottom,rear],[r,bottom,front],[r,top,front],[r,top,rear],0x827f72);
    room.quad([l,top,front],[l,top,rear],[r,top,rear],[r,top,front],0xb0ab98);
    room.quad([l,bottom,rear],[l,bottom,front],[r,bottom,front],[r,bottom,rear],0x767264);
    room.quad([l,bottom,rear],[r,bottom,rear],[r,top,rear],[l,top,rear],w.column===0?0x777d78:0x8c8574);
    // Frame bars have disjoint interiors. The glass is recessed behind the
    // returns and has an opaque room back; the source photograph is removed.
    for(const x of[l,r-.045])metal.box(x,x+.045,bottom,top,glazing-.03,glazing+.03,0x454c4b);
    for(const y of[bottom,top-.045])metal.box(l+.045,r-.045,y,y+.045,glazing-.03,glazing+.03,0x454c4b);
    const sash=bottom+.35;metal.box(l+.045,r-.045,sash-.012,sash+.012,glazing-.025,glazing+.025,0x525b57);
    for(const[y,z]of[[bottom+.045,sash-.012],[sash+.012,top-.045]])glass.quad([l+.045,y!,glazing],[r-.045,y!,glazing],[r-.045,z!,glazing],[l+.045,z!,glazing],0x93a8a2);
    // Approximate room finish only, no occupancy/source survey claim.
    room.box(l+.10,r-.10,bottom+.48,bottom+.56,-1.10,-.73,0x70644e);
    room.box(l+.16,l+.20,bottom,bottom+.48,-1.05,-.80,0x4a504a);
    room.box(r-.20,r-.16,bottom,bottom+.48,-1.05,-.80,0x4a504a);
  }
  const group=new Group();group.name=R.name;group.matrix.copy(scene.matrixWorld).invert();group.matrixAutoUpdate=false;
  const owned:{dispose():void}[]=[],ownedNormals:Material[]=[],undo:(()=>void)[]=[];let closed=false;
  const own=<T extends{dispose():void}>(r:T):T=>{owned.push(r);return r;};
  const detach=():void=>{if(closed)return;closed=true;for(const restore of undo.toReversed())restore();group.removeFromParent();for(const m of ownedNormals)m.dispose();sources.delete(scene);active.delete(scene);};
  try {
    const mats=[new MeshStandardMaterial({vertexColors:true,roughness:.82}),new MeshStandardMaterial({vertexColors:true,roughness:.30,metalness:.62}),new MeshStandardMaterial({vertexColors:true,roughness:.13,metalness:.14,transparent:true,opacity:.27,depthWrite:false}),new MeshStandardMaterial({vertexColors:true,roughness:.88})];for(const m of mats)own(m);
    mats[3]!.emissive.setHex(0x9b8b60);Object.defineProperty(mats[3],"emissiveIntensity",{configurable:true,get:()=>options.style.procedural.value<.5?Math.max(0,options.signageIntensity.value-.05)*.035:0});
    for(const[i,surface]of[stone,metal,glass,room].entries()){const mesh=new Mesh(own(surface.geometry()),mats[i]!);mesh.name=`${R.name}:${["stone","metal","glazing","room"][i]}`;mesh.castShadow=i!==2;mesh.receiveShadow=true;mesh.userData.authoredUpperWindows={gmlId:R.gmlId,source:false};const depth=own(new MeshDepthMaterial({depthPacking:RGBADepthPacking})),distance=own(new MeshDistanceMaterial()),normal=new MeshNormalMaterial({blending:NoBlending});for(const pass of[mats[i]!,depth,distance,normal])presentation(pass,options,false);if(i===2){normal.visible=false;normal.depthWrite=false;}mesh.customDepthMaterial=depth;mesh.customDistanceMaterial=distance;normals.set(mesh,normal);ownedNormals.push(normal);undo.push(()=>normals.delete(mesh));group.add(mesh);}
    const oldCompile=(source.material as Material).onBeforeCompile,oldKey=(source.material as Material).customProgramCacheKey,oldDepth=source.customDepthMaterial,oldDistance=source.customDistanceMaterial;
    undo.push(()=>{(source.material as Material).onBeforeCompile=oldCompile;(source.material as Material).customProgramCacheKey=oldKey;source.customDepthMaterial=oldDepth;source.customDistanceMaterial=oldDistance;normals.delete(source);});
    presentation(source.material as Material,options,true);const depth=own(new MeshDepthMaterial({depthPacking:RGBADepthPacking})),distance=own(new MeshDistanceMaterial()),normal=new MeshNormalMaterial({blending:NoBlending});for(const pass of[depth,distance,normal])presentation(pass,options,true);source.customDepthMaterial=depth;source.customDistanceMaterial=distance;normals.set(source,normal);ownedNormals.push(normal);
    const meshes=group.children as Mesh[];group.userData.upperWindows={beautyDraws:meshes.length,triangles:meshes.reduce((s,m)=>s+m.geometry.getAttribute("position").count/3,0),geometryBytes:meshes.reduce((s,m)=>s+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0),imageTextures:0,localLights:0,windows:R.windows.length,storeys:R.storeys,approximateInterior:true,sourceFaces:R.faces.map(f=>f.face)};
    register!(detach);scene.add(group);active.set(scene,group);return true;
  }catch(error){detach();for(const resource of owned)resource.dispose();throw error;}
}


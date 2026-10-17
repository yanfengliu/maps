/** Authored shallow relief for the photographed TSUTAYA lower glazing.
 * Atlas divisions are approximate observations, not surveyed architecture.
 * The source wall and photograph remain intact behind the open surround. */
import { BoxGeometry, Float32BufferAttribute, FrontSide, Group, Matrix3, Mesh, MeshDepthMaterial, MeshDistanceMaterial, MeshNormalMaterial, MeshStandardMaterial, NoBlending, RGBADepthPacking, Triangle, Vector3, type Material, type Object3D } from "three";
import { CROSSING_CORNER } from "./crossing-corner-material.js";
import type { FacadeTextureLifetime } from "./facade-textures.js";

const NAME = "crossing-frontage-surround";
const NORMAL = new Vector3(...CROSSING_CORNER.normal);
const ORIGIN = new Vector3(...CROSSING_CORNER.origin);
const normalMaterials = new WeakMap<Mesh, MeshNormalMaterial>();
export const getCrossingFrontageNormalMaterial = (mesh: Mesh): Material | undefined => normalMaterials.get(mesh);

// The relief belongs to one single-sided source face. A perspective view sees
// it only from that face's front half-space; an orthographic pass uses its ray
// direction. Built-in view/projection/camera uniforms belong to the actual draw
// camera, including GTAO and directional/point-light shadow passes.
const gl = (v: number): string => Number.isInteger(v) ? v+".0" : String(v);
function sourceFacing(material: Material): void {
  const plane = CROSSING_CORNER.origin.map((v,i)=>"(camera"+["X","Y","Z"][i]+"-("+gl(v)+"))*"+gl(CROSSING_CORNER.normal[i]!)).join("+");
  const vertex = "varying float mapsFrontageFacing;\nfloat mapsFrontageSide(float orthographic, float viewFacing, float cameraX, float cameraY, float cameraZ) { return orthographic > 0.5 ? viewFacing : "+plane+"; }\n";
  material.onBeforeCompile = shader => {
    if (!shader.vertexShader.includes("#include <begin_vertex>") || !shader.fragmentShader.includes("#include <clipping_planes_fragment>")) throw new Error("TSUTAYA relief shader has no expected facing hooks; restore the reviewed three.js shaders before rendering its source-bound passes.");
    shader.vertexShader = vertex + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nmapsFrontageFacing = mapsFrontageSide(projectionMatrix[3][3], (viewMatrix * vec4("+"vec3("+CROSSING_CORNER.normal.map(gl).join(",")+"),0.0)).z, cameraPosition.x, cameraPosition.y, cameraPosition.z);");
    shader.fragmentShader = "varying float mapsFrontageFacing;\n" + shader.fragmentShader.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (mapsFrontageFacing <= 0.0) discard;");
  };
  material.customProgramCacheKey = () => "maps-source-frontage-facing-v1";
}
// Native 4096 atlas: selected pale vertical divisions under the TSUTAYA band.
const COLUMNS = [281, 314, 347, 379] as const;
const HEADER_PIXEL_Y = 3549;
const DEPTH = 0.34, WALL_OFFSET = 0.01, JAMB_WIDTH = 0.22, HEADER_HEIGHT = 0.28;
// Accepted authored pavement grades from tools/scene/pavement-frontage.ts.
// These meet beneath the facade; jamb feet follow them without moving support.
const floorY = (x: number, z: number): number => Math.max(
  0.011855454477937262*x + 0.00871388819731564*z + 15.81100047076414,
  0.011350313563506981*x - 0.025902886364053083*z + 14.805975700926474,
);

/** Called after the original SHA/GML/UV eligibility check and material pass,
 * before tile-cache admission. Ordinary tile disposal owns these resources. */
export function addCrossingFrontage(scene: Object3D, tileUri: string, verifiedSha256: string | undefined, lifetime?: Pick<FacadeTextureLifetime, "onRelease">): void {
  if (tileUri !== CROSSING_CORNER.tileUri || scene.getObjectByName(NAME)) return;
  if (verifiedSha256 !== CROSSING_CORNER.tileSha256) throw new Error("TSUTAYA surround requires the reviewed data518 SHA-256 before adding relief.");
  scene.updateMatrixWorld(true);
  let source: Mesh | undefined;
  scene.traverse(object => { if (object instanceof Mesh && object.geometry.getAttribute("mapsCornerEligible")) source = object; });
  if (!source) return; // Another GML or an untextured source is never a substitute.
  if (Array.isArray(source.material) || source.material.side !== FrontSide) throw new Error("TSUTAYA relief requires the reviewed FrontSide photographic source; restore its single-sided material before adding relief.");
  const geometry = source.geometry, index = geometry.index!, uv = geometry.getAttribute("uv");
  const positions = geometry.getAttribute("position"), normals = geometry.getAttribute("normal"), binding = geometry.getAttribute("mapsCornerEligible");
  const normalMatrix = new Matrix3().getNormalMatrix(source.matrixWorld);
  // Exact source triangles 494/495 are pinned by the tile digest. Interpolate
  // their original UVs instead of using the unrelated procedural facade grid.
  const faces = [494,495].map(face => [0,1,2].map(corner => {
    const id = index.getX(face*3+corner), p = new Vector3().fromBufferAttribute(positions,id).applyMatrix4(source!.matrixWorld);
    const n = new Vector3().fromBufferAttribute(normals,id).applyNormalMatrix(normalMatrix);
    if (binding.getX(id) !== 1 || Math.abs(p.clone().sub(ORIGIN).dot(NORMAL)) > .01 || n.dot(NORMAL) < .999) throw new Error("TSUTAYA surround front plane, outward normal or GML binding changed; restore the reviewed data518 source.");
    return { p, uv: new Vector3(uv.getX(id),uv.getY(id),0) };
  }));
  for (const face of faces) if (new Triangle(face[0]!.p,face[1]!.p,face[2]!.p).getNormal(new Vector3()).dot(NORMAL) < .999) throw new Error("TSUTAYA relief source winding changed; restore the reviewed outward-facing photographic triangles.");
  const at = (pixelX: number, pixelY: number): Vector3 => {
    const point = new Vector3(pixelX/4096,pixelY/4096,0), weights = new Vector3();
    for (const f of faces) {
      Triangle.getBarycoord(point,f[0]!.uv,f[1]!.uv,f[2]!.uv,weights);
      if (Math.min(weights.x,weights.y,weights.z) < -1e-7) continue;
      const p = f[0]!.p.clone().multiplyScalar(weights.x).addScaledVector(f[1]!.p,weights.y).addScaledVector(f[2]!.p,weights.z);
      if (p.y >= CROSSING_CORNER.upperY) break;
      return p;
    }
    throw new Error("TSUTAYA surround pixel lies outside its reviewed lower photographic face; review the feature bounds.");
  };
  const ids = geometry.getAttribute("_batchid") ?? geometry.getAttribute("_BATCHID");
  const batchId = ids.getX(index.getX(494*3));
  const anchors = COLUMNS.map(x => at(x,HEADER_PIXEL_Y));
  const group = new Group(); group.name = NAME;
  group.matrix.copy(scene.matrixWorld).invert(); group.matrixAutoUpdate = false;
  const material = new MeshStandardMaterial({ color: 0x777c77, roughness: .72, metalness: .08 });
  material.name = NAME;
  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
  const distance = new MeshDistanceMaterial();
  const normal = new MeshNormalMaterial({ blending: NoBlending });
  for (const pass of [material,depth,distance,normal]) { pass.name = NAME; sourceFacing(pass); }
  // GPU eviction retains the parsed model. Only logical release removes this
  // private normal lookup; standalone direct callers retain disposal fallback.
  let normalReleased = false;
  const releaseNormal = (): void => {
    if (normalReleased) return; normalReleased = true;
    for (const object of group.children) if (object instanceof Mesh) normalMaterials.delete(object);
    normal.dispose();
  };
  if (lifetime?.onRelease) lifetime.onRelease(releaseNormal);
  else material.addEventListener("dispose", releaseNormal);
  const yaw = Math.atan2(NORMAL.x,NORMAL.z);
  const add = (width: number, height: number, centre: Vector3, grounded: boolean): void => {
    const box = new BoxGeometry(width,height,DEPTH);
    // Membership in the verified parent building; these are authored faces.
    box.setAttribute("_batchid", new Float32BufferAttribute(new Float32Array(box.getAttribute("position").count).fill(batchId),1));
    box.rotateY(yaw); box.translate(centre.x,centre.y,centre.z);
    if (grounded) {
      const p = box.getAttribute("position");
      for (let i=0;i<p.count;i++) if (p.getY(i)<centre.y) p.setY(i,floorY(p.getX(i),p.getZ(i))+.001);
      p.needsUpdate = true; box.computeVertexNormals();
    }
    const mesh = new Mesh(box,material); mesh.customDepthMaterial = depth; mesh.customDistanceMaterial = distance; normalMaterials.set(mesh,normal); mesh.userData.authoredFrontage = { gmlId: CROSSING_CORNER.gmlId, source: false }; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  };
  const offset = WALL_OFFSET+DEPTH/2;
  for (const p of anchors) {
    const centre = p.clone().addScaledVector(NORMAL,offset), bottom = floorY(centre.x,centre.z);
    centre.y = (p.y+bottom)/2;
    add(JAMB_WIDTH,p.y-bottom,centre,true);
  }
  const left = anchors[0]!, right = anchors[anchors.length-1]!;
  const centre = left.clone().lerp(right,.5).addScaledVector(NORMAL,offset); centre.y += HEADER_HEIGHT/2;
  add(left.distanceTo(right)+JAMB_WIDTH,HEADER_HEIGHT,centre,false);
  scene.add(group);
}

/** One source-bound exterior fitting. The tile transaction owns its meshes and
 * logical light/target release. GPU-only material disposal retains the fitting. */
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, FrontSide, Group, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Object3D, SpotLight, Triangle, Vector3, type Texture } from "three";
import { PERIPHERAL_MOUNTED_LIGHT as R } from "./peripheral-mounted-light-recipe.js";
import type { FacadeStyleUniforms, SignageUniform } from "./tile-materials.js";
import type { FacadeTextureLifetime } from "./facade-textures.js";

interface Options { style: FacadeStyleUniforms; signageIntensity: SignageUniform }
interface Source { triangle: Triangle; normal: Vector3 }
const prepared = new WeakMap<Object3D, Source>(), active = new WeakMap<Object3D, Group>();
const refuse = (part: string): never => { throw new Error(`Peripheral east fitting ${part} differs from reviewed ${R.tileUri}/${R.gmlId}. Restore its source bytes, GML, face, UV0 and parser placement before adding the fitting.`); };
export function peripheralLightSourceForUrl(url: string): typeof R | undefined {
  return new URL(url, "http://maps.invalid/").pathname.endsWith(`/buildings/${R.tileUri}`) ? R : undefined;
}

/** Original attributes and installed-loader placement are checked before atlas
 * processing. The complete rectangular back contact stays in one source face. */
export function preparePeripheralMountedLight(scene: Object3D, uri: string, digest: string | undefined): void {
  if (uri !== R.tileUri) return;
  if (digest !== R.tileSha256) refuse("SHA-256");
  scene.updateMatrixWorld(true);
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  if (!table || table.getDataFromId(R.batch)["gml_id"] !== R.gmlId) refuse("GML identity");
  let source: Source | undefined;
  scene.traverse(object => {
    if (!(object instanceof Mesh) || !object.geometry.hasAttribute("uv")) return;
    const ids = object.geometry.getAttribute("_batchid") ?? object.geometry.getAttribute("_BATCHID");
    if (!ids || !Array.from({ length: ids.count }, (_, i) => ids.getX(i)).includes(R.batch)) return;
    if (source || Array.isArray(object.material) || !(object.material instanceof MeshStandardMaterial) || object.material.side !== FrontSide || !object.material.map) refuse("single photographic primitive");
    const map: Texture = object.material.map;
    if (map.matrixAutoUpdate) map.updateMatrix();
    if (map.channel !== 0 || map.flipY || map.matrix.elements.some((x, i) => Math.abs(x - [1,0,0,0,1,0,0,0,1][i]!) > 1e-9)) refuse("original UV0 orientation");
    const p = object.geometry.getAttribute("position"), n = object.geometry.getAttribute("normal"), uv = object.geometry.getAttribute("uv"), index = object.geometry.index;
    if (!p || !n || !index) refuse("source attributes");
    const expected = new Matrix4().fromArray(R.parserPlacement), normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld), expectedNormal = new Matrix3().getNormalMatrix(expected), face = R.faces[0];
    const points = face.vertices.map((vertex, k) => {
      const id = index!.getX(face.face * 3 + k);
      if (id !== face.indices[k] || ids.getX(id) !== R.batch) refuse("face index/GML");
      for (let axis = 0; axis < 3; axis++) if (Math.abs(p.getComponent(id, axis) - vertex.position[axis]!) > 1e-6 || Math.abs(n.getComponent(id, axis) - vertex.normal[axis]!) > 2e-6) refuse("source position/normal");
      if (vertex.uv.some((value, axis) => Math.abs(uv.getComponent(id, axis) - value) > 1e-8)) refuse("source UV0");
      const point = new Vector3().fromBufferAttribute(p, id).applyMatrix4(object.matrixWorld), normal = new Vector3().fromBufferAttribute(n, id).applyNormalMatrix(normalMatrix);
      if (point.distanceTo(new Vector3(...vertex.position).applyMatrix4(expected)) > 2e-5 || normal.distanceTo(new Vector3(...vertex.normal).applyNormalMatrix(expectedNormal)) > 4e-6) refuse("installed parser transform");
      return point;
    });
    const triangle = new Triangle(points[0]!, points[1]!, points[2]!), normal = triangle.getNormal(new Vector3());
    if (normal.dot(new Vector3(...R.mount.normal)) < .999999) refuse("outward winding");
    for (const x of [-R.mount.width / 2, R.mount.width / 2]) for (const y of [-R.mount.height / 2, R.mount.height / 2]) {
      const contact = new Vector3(...R.mount.origin).addScaledVector(new Vector3(...R.mount.right), x).addScaledVector(new Vector3(...R.mount.up), y);
      if (triangle.closestPointToPoint(contact, new Vector3()).distanceTo(contact) > 2e-5 || Math.min(...triangle.getBarycoord(contact, new Vector3())!.toArray()) < .001) refuse("complete mounting footprint");
    }
    source = { triangle, normal };
  });
  if (!source) refuse("photographic face");
  prepared.set(scene, source!);
}

export function addPeripheralMountedLight(scene: Object3D, uri: string, digest: string | undefined, options: Options, lifetime?: Pick<FacadeTextureLifetime, "onRelease">): boolean {
  if (uri !== R.tileUri || active.has(scene)) return false;
  if (digest !== R.tileSha256 || !prepared.has(scene)) refuse("unprepared source");
  const registerRelease = lifetime?.onRelease?.bind(lifetime);
  if (!registerRelease) return refuse("missing logical tile lifetime owner");
  const group = new Group(); group.name = "peripheral-east-mounted-light";
  group.matrix.copy(scene.matrixWorld).invert(); group.matrixAutoUpdate = false;
  const origin = new Vector3(...R.mount.origin), right = new Vector3(...R.mount.right), up = new Vector3(...R.mount.up), normal = new Vector3(...R.mount.normal);
  const at = (x: number, y: number, z: number): Vector3 => origin.clone().addScaledVector(right, x).addScaledVector(up, y).addScaledVector(normal, z);
  const positions: number[] = [], normals: number[] = [];
  const box = (width: number, height: number, depth: number, x: number, y: number, z: number): void => {
    const indexed = new BoxGeometry(width, height, depth), geometry = indexed.toNonIndexed(), p = geometry.getAttribute("position"), n = geometry.getAttribute("normal"); indexed.dispose();
    for (let i = 0; i < p.count; i++) { positions.push(...at(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z).toArray()); normals.push(...right.clone().multiplyScalar(n.getX(i)).addScaledVector(up, n.getY(i)).addScaledVector(normal, n.getZ(i)).toArray()); }
    geometry.dispose();
  };
  // Full opaque back plate contacts the source, with a proud top hood, side
  // returns and a front brow around the recessed downward/outward lens.
  box(.6, .18, .04, 0, 0, .02); box(.6, .035, .22, 0, .0725, .11);
  box(.035, .125, .18, -.2825, -.0075, .13); box(.035, .125, .18, .2825, -.0075, .13);
  box(.53, .055, .035, 0, .0275, .2025);
  const housingGeometry = new BufferGeometry(); housingGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3)); housingGeometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  const lensPoints = [at(-.245, -.065, .065), at(.245, -.065, .065), at(.245, -.025, .175), at(-.245, -.025, .175)];
  const lensGeometry = new BufferGeometry(); lensGeometry.setAttribute("position", new Float32BufferAttribute([0,1,2,0,2,3].flatMap(i => lensPoints[i]!.toArray()), 3)); lensGeometry.computeVertexNormals();
  // Existing cutout and tile paths retain parent-building membership on every
  // authored face, as the adopted corner and crossing relief already do.
  for (const geometry of [housingGeometry, lensGeometry]) geometry.setAttribute("_batchid", new Float32BufferAttribute(new Float32Array(geometry.getAttribute("position").count).fill(R.batch), 1));
  const housingMaterial = new MeshStandardMaterial({ color: 0x283137, roughness: .48, metalness: .45 }), lensMaterial = new MeshStandardMaterial({ color: 0xffe2ae, emissive: 0xffd69a, roughness: .5 });
  const power = (): number => options.style.procedural.value < .5 ? Math.max(0, Math.min(1, (options.signageIntensity.value - .05) / 2.1)) : 0;
  Object.defineProperty(lensMaterial, "emissiveIntensity", { configurable: true, get: () => power() * 3 });
  const housing = new Mesh(housingGeometry, housingMaterial), lens = new Mesh(lensGeometry, lensMaterial);
  housing.name = `${group.name}:housing`; lens.name = `${group.name}:recessed-lens`; housing.castShadow = true; housing.receiveShadow = true;
  for (const mesh of [housing, lens]) mesh.userData.authoredFrontage = { gmlId: R.gmlId, source: false };
  const light = new SpotLight(0xffd69a, 0, 6, .50, .65, 2), target = new Object3D();
  light.name = `${group.name}:downlight`; target.name = `${group.name}:pavement-target`;
  light.position.copy(at(0, -.05, .13)); target.position.fromArray(R.receiver.point); light.target = target;
  Object.defineProperty(light, "intensity", { configurable: true, get: () => power() * 60 });
  group.add(housing, lens, light, target);
  const geometryBytes = [housingGeometry, lensGeometry].reduce((sum, g) => sum + Object.values(g.attributes).reduce((n, a) => n + a.array.byteLength, 0), 0), triangles = positions.length / 9 + 2;
  if (geometryBytes > R.limit.geometryBytes || triangles > R.limit.triangles) refuse("owned geometry budget");
  group.userData.peripheralMountedLight = { tileUri: R.tileUri, gmlId: R.gmlId, sourceFace: R.faces[0].face, beautyDraws: 2, triangles, geometryBytes, localLights: 1, imageTextures: 0, mount: [...R.mount.origin], receiver: R.receiver };
  let closed = false;
  const detach = (): void => { if (closed) return; closed = true; group.removeFromParent(); light.removeFromParent(); target.removeFromParent(); light.dispose(); prepared.delete(scene); active.delete(scene); };
  registerRelease(detach);
  active.set(scene, group); scene.add(group); return true;
}

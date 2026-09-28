/** One authored photographic response, not a surveyed material classification.
 * Source-study front triangles 494/495, clipped at Y27.697309851637005.
 * The two lower UV polygons follow their original shared diagonal exactly.
 */
import { Float32BufferAttribute, Mesh, MeshStandardMaterial, type Object3D } from "three";

export const CROSSING_CORNER = Object.freeze({
  tileUri: "data/data518.b3dm",
  tileSha256: "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b",
  gmlId: "bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27",
  origin: [1.3568167911358273, 15.09811684288055, -30.31105059489345],
  normal: [0.11796482700934834, 0.000001909773740783297, 0.9930177740529156],
  upperY: 27.697309851637005,
  lowerUv: [
    [[0.09606940299272537, 0.8748778700828552], [0.09606940299272537, 0.8447264889801853], [0.07255664982740098, 0.8447280623427624], [0.06506340950727463, 0.8748778700828552]],
    [[0.06506340950727463, 0.8447285638860552], [0.06506340950727463, 0.8748778700828552], [0.072556649827401, 0.8447280623427624]],
  ],
} as const);
const fail = (part: string): never => { throw new Error(`Crossing corner ${part} is unbound. Restore the reviewed data518 bytes, GML identity and original UV0 before applying its authored lower-front response.`); };

/** Only the verified tile receives an attribute; the tile loader's existing
 * geometry byte accounting sees it before cache admission. No source array changes.
 */
export function prepareCrossingCorner(scene: Object3D, tileUri: string, verifiedSha256: string | undefined): void {
  if (tileUri !== CROSSING_CORNER.tileUri) return;
  if (verifiedSha256 !== CROSSING_CORNER.tileSha256) fail("data518.sha256");
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  if (!table) fail("data518.batchTable");
  const entries: { mesh: Mesh; groups: Float32Array }[] = [];
  const boundMaterials = new Set<MeshStandardMaterial>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.getAttribute("position");
    if (!positions) return;
    const ids = object.geometry.getAttribute("_batchid") ?? object.geometry.getAttribute("_BATCHID");
    if (!ids) fail("data518.batchId");
    const groups = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) groups[i] = table!.getDataFromId(ids!.getX(i))["gml_id"] === CROSSING_CORNER.gmlId ? 1 : 0;
    entries.push({ mesh: object, groups });
    if (!groups.some(Boolean)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    // This GML also has129 source vertices in an untextured primitive. It keeps
    // the ordinary Satellite fallback; only the photographic primitive is bound.
    if (!object.geometry.getAttribute("uv") && materials.every(m => !(m instanceof MeshStandardMaterial) || !m.map)) return;
    if (!object.geometry.getAttribute("uv")) fail("data518.UV0");
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial) || !material.map) fail("data518.photo-map");
      const map = material.map!;
      if (map.matrixAutoUpdate) map.updateMatrix();
      if (map.channel !== 0 || map.flipY || map.matrix.elements.some((v: number, i: number) => Math.abs(v - [1, 0, 0, 0, 1, 0, 0, 0, 1][i]!) > 1e-9)) fail("data518.UV0-orientation");
      boundMaterials.add(material);
    }
  });
  for (const { mesh, groups } of entries) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.some(m => boundMaterials.has(m as MeshStandardMaterial))) continue;
    mesh.geometry.setAttribute("mapsCornerEligible", new Float32BufferAttribute(groups, 1));
  }
  for (const material of boundMaterials) material.userData.mapsCrossingCorner = true;
}

const gl = (n: number): string => Number.isInteger(n) ? `${n}.0` : String(n);
export const CROSSING_CORNER_GLSL = `
float mapsCornerSide(float ax, float ay, float bx, float by, float u, float v) { return (bx-ax)*(v-ay)-(by-ay)*(u-ax); }
float mapsCornerWeight(float x, float y, float z, float nx, float ny, float nz, float u, float v, float binding) {
  float plane = ${CROSSING_CORNER.origin.map((a, i) => `(${["x", "y", "z"][i]}-(${gl(a)}))*${gl(CROSSING_CORNER.normal[i]!)}`).join("+")};
  float facing = ${CROSSING_CORNER.normal.map((a, i) => `${["nx", "ny", "nz"][i]}*${gl(a)}`).join("+")};
  if (binding < 0.99 || y >= ${CROSSING_CORNER.upperY} || abs(plane) > 0.01 || facing < 0.999) return 0.0;
  bool inside = false;
${CROSSING_CORNER.lowerUv.map((poly, i) => poly.map((a, j) => `  float s${i}${j} = mapsCornerSide(${[...a, ...poly[(j + 1) % poly.length]!].map(gl).join(",")},u,v);`).join("\n") + `
  inside = inside || (${poly.map((_, j) => `s${i}${j} >= 0.0`).join(" && ")}) || (${poly.map((_, j) => `s${i}${j} <= 0.0`).join(" && ")});`).join("\n")}
  // Transition stays below the upper-glazing boundary on the admitted source face.
  return inside ? 1.0 - smoothstep(26.697309851637005, ${CROSSING_CORNER.upperY}, y) : 0.0;
}
float mapsCrossingCorner(vec3 p, vec3 n, vec2 uv, float binding) {
  return mapsCornerWeight(p.x,p.y,p.z,n.x,n.y,n.z,uv.x,uv.y,binding);
}`;

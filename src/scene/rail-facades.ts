/** Three photographed rail-side facades, with source-only finite apertures and
 * closed physical windows. Interior depth/finishes are authored approximations. */
import { BufferGeometry, Color, Float32BufferAttribute, Group, Material, Matrix3, Matrix4, Mesh, MeshDepthMaterial, MeshDistanceMaterial, MeshNormalMaterial, MeshStandardMaterial, NoBlending, Object3D, RGBADepthPacking, Triangle, Vector3 } from "three";
import { RAIL_FACADES } from "./rail-facade-recipes.js";
import { getUpperWindowNormalMaterial } from "./upper-windows.js";
import type { FacadeTextureLifetime } from "./facade-textures.js";
import type { FacadeStyleUniforms, SignageUniform } from "./tile-materials.js";

type Recipe = (typeof RAIL_FACADES)[number];
type Point = readonly [number, number, number];
interface Options { style: FacadeStyleUniforms; signageIntensity: SignageUniform }
const sources = new WeakMap<Object3D, Map<Recipe, Mesh>>(), active = new WeakMap<Object3D, Group>(), normals = new WeakMap<Mesh, Material>();
export const getRailFacadeNormalMaterial = (mesh: Mesh): Material | undefined => normals.get(mesh);
export function railFacadeSourceForUrl(url: string): Recipe | undefined { return RAIL_FACADES.find(r => new URL(url, "http://maps.invalid/").pathname.endsWith(`/buildings/${r.tileUri}`)); }
const fail = (r: Recipe, part: string): never => { throw Error(`Rail-side facade ${r.name}: ${part} differs from reviewed ${r.tileUri}/${r.gmlId}. Restore the pinned original tile, GML metadata, UV0 and logical parse owner before constructing its photographed windows.`); };
const gl = (n: number): string => Number.isInteger(n) ? `${n}.0` : String(n);
const vec = (p: readonly number[]): string => `vec3(${p.map(gl).join(",")})`;
function frame(r: Recipe) {
  const origin = new Vector3(...r.frame.origin), right = new Vector3(...r.frame.right), up = new Vector3(...r.frame.up), outward = new Vector3(...r.frame.normal);
  return {
    at: (x: number, y: number, d: number): Vector3 => origin.clone().addScaledVector(right, x + r.frame.horizontalShear * y).addScaledVector(up, y).addScaledVector(outward, d),
    local: (p: Vector3): number[] => { const q = p.clone().sub(origin), y = q.dot(up); return [q.dot(right) - r.frame.horizontalShear * y, y, q.dot(outward)]; }, outward,
  };
}
function clip(p: number[][], axis: number, edge: number, sign: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < p.length; i++) { const a = p[i]!, b = p[(i + 1) % p.length]!, u = sign * (a[axis]! - edge), v = sign * (b[axis]! - edge); if (u >= 0) out.push(a); if (u * v < 0) out.push(a.map((x, k) => x + (b[k]! - x) * u / (u - v))); }
  return out;
}
const area = (p: number[][]): number => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a[0]! * b[1]! - a[1]! * b[0]!; }, 0)) / 2;

export function prepareRailFacades(scene: Object3D, uri: string, digest: string | undefined): void {
  const recipes = RAIL_FACADES.filter(r => r.tileUri === uri); if (!recipes.length) return;
  scene.updateMatrixWorld(true); const admitted = new Map<Recipe, Mesh>();
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  for (const r of recipes) {
    if (digest !== r.tileSha256) fail(r, "SHA-256");
    const meta = table?.getDataFromId(r.batch);
    if (meta?.["gml_id"] !== r.gmlId || meta["bldg:storeysAboveGround"] !== r.storeys || meta["bldg:measuredHeight"] !== r.measuredHeight || meta["bldg:usage"] !== r.usage) fail(r, "GML/use/floor metadata");
    const f = frame(r), placement = new Matrix4().fromArray(r.parserPlacement), normalPlacement = new Matrix3().getNormalMatrix(placement);
    let source: Mesh | undefined;
    scene.traverse(o => {
      if (!(o instanceof Mesh) || !o.geometry.hasAttribute("uv")) return;
      const g = o.geometry, p = g.getAttribute("position"), n = g.getAttribute("normal"), uv = g.getAttribute("uv"), ids = g.getAttribute("_batchid"), index = g.index;
      if (!ids || !index || ids.getX(r.faces[0].indices[0]) !== r.batch) return;
      // The admitted rail adaptation removes unrelated source faces before
      // this hook. Bind each literal original triangle, not its shifted offset.
      const present = new Map<string, number>();
      for (let i = 0; i < index.count; i += 3) { const key = [0, 1, 2].map(k => index.getX(i + k)).join(","); present.set(key, (present.get(key) ?? 0) + 1); }
      if (!present.has(r.faces[0].indices.join(","))) return;
      if (source || !(o.material instanceof MeshStandardMaterial) || !o.material.map || !p || !n) fail(r, "single original photographic primitive");
      const map = (o.material as MeshStandardMaterial).map!; if (map.matrixAutoUpdate) map.updateMatrix();
      if (map.channel !== 0 || map.flipY || map.matrix.elements.some((x, i) => Math.abs(x - [1, 0, 0, 0, 1, 0, 0, 0, 1][i]!) > 1e-9)) fail(r, "original UV0 orientation");
      const worldNormals = new Matrix3().getNormalMatrix(o.matrixWorld), triangles = r.faces.map(face => {
        if (present.get(face.indices.join(",")) !== 1) fail(r, `face${face.face} unique retained original triangle`);
        const points = face.vertices.map((v, c) => {
          const id = face.indices[c]!; if (ids.getX(id) !== r.batch) fail(r, `face${face.face} indices/GML`);
          for (let k = 0; k < 3; k++) if (Math.abs(p.getComponent(id, k) - v.position[k]!) > 1e-6 || Math.abs(n.getComponent(id, k) - v.normal[k]!) > 2e-6) fail(r, `face${face.face} original position/normal`);
          for (let k = 0; k < 2; k++) if (Math.abs(uv.getComponent(id, k) - v.uv[k]!) > 1e-8) fail(r, `face${face.face} original UV`);
          const point = new Vector3().fromBufferAttribute(p, id).applyMatrix4(o.matrixWorld), expected = new Vector3(...v.position).applyMatrix4(placement), normal = new Vector3().fromBufferAttribute(n, id).applyNormalMatrix(worldNormals), expectedNormal = new Vector3(...v.normal).applyNormalMatrix(normalPlacement);
          if (point.distanceTo(expected) > 2e-5 || normal.distanceTo(expectedNormal) > 4e-6 || Math.abs(f.local(point)[2]!) > r.planeLimit) fail(r, `face${face.face} parser placement/measured plane`);
          return point;
        });
        if (new Triangle(points[0]!, points[1]!, points[2]!).getNormal(new Vector3()).dot(f.outward) < .99999) fail(r, `face${face.face} winding`);
        return points.map(f.local);
      });
      // Complete areas are clipped against the actual disjoint original facets.
      for (const w of r.windows) { const [a, b, lo, hi] = w.bounds; let covered = 0; for (const t of triangles) { let polygon = t; for (const [axis, edge, sign] of [[0, a, 1], [0, b, -1], [1, lo, 1], [1, hi, -1]]) polygon = clip(polygon, axis!, edge!, sign!); if (polygon.length >= 3) covered += area(polygon); } if (Math.abs(covered - (b - a) * (hi - lo)) > 2e-5) fail(r, `floor${w.floor}/column${w.column} complete aperture coverage`); }
      source = o;
    });
    if (!source) fail(r, "photographic wall"); admitted.set(r, source!);
  }
  sources.set(scene, admitted);
}

function sourceGLSL(recipes: readonly Recipe[]): string {
  return recipes.map((r, i) => `vec3 mapsRailLocal${i}(vec3 world){vec3 d=world-${vec(r.frame.origin)};float y=dot(d,${vec(r.frame.up)});return vec3(dot(d,${vec(r.frame.right)})-${gl(r.frame.horizontalShear)}*y,y,dot(d,${vec(r.frame.normal)}));}
bool mapsRailOpening${i}(vec3 p){return abs(p.z)<${gl(r.planeLimit + .00002)}&&(${r.windows.map(w => { const [a, b, lo, hi] = w.bounds; return `(p.x>${gl(a)}&&p.x<${gl(b)}&&p.y>${gl(lo)}&&p.y<${gl(hi)})`; }).join("||")});}`).join("\n");
}
function presentation(material: Material, options: Options, recipes: readonly Recipe[] | undefined): () => void {
  const oldCompile = material.onBeforeCompile, oldKey = material.customProgramCacheKey, key = oldKey.call(material);
  const compile: Material["onBeforeCompile"] = (shader, renderer) => {
    oldCompile.call(material, shader, renderer);
    if (!shader.vertexShader.includes("#include <project_vertex>") || !shader.fragmentShader.includes("#include <clipping_planes_fragment>")) fail(RAIL_FACADES[0], "three.js pass hooks");
    shader.uniforms.mapsRailProcedural = options.style.procedural;
    shader.vertexShader = `${recipes ? `${shader.vertexShader.includes("attribute float _batchid;") ? "" : "attribute float _batchid;"} varying float mapsRailBatch; varying vec3 mapsRailWorld;` : ""}\n` + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n${recipes ? "mapsRailWorld=(modelMatrix*vec4(transformed,1.0)).xyz;mapsRailBatch=_batchid;" : ""}`);
    // Earlier source masks remain in the shader. This is a finite OR across
    // this tile's admitted walls, composed with the adopted upper windows.
    shader.fragmentShader = `uniform float mapsRailProcedural;\n${recipes ? "varying float mapsRailBatch;varying vec3 mapsRailWorld;" + sourceGLSL(recipes) : ""}\n` + shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${recipes ? `if(mapsRailProcedural<0.5&&(${recipes.map((r, i) => `(abs(mapsRailBatch-${gl(r.batch)})<0.1&&mapsRailOpening${i}(mapsRailLocal${i}(mapsRailWorld)))`).join("||")}))discard;` : "if(mapsRailProcedural>0.5)discard;"}`);
  };
  const cache = (): string => `${key}:rail-facade-${recipes ? recipes.map(r => r.name).join("-") : "physical"}-v1`;
  material.onBeforeCompile = compile; material.customProgramCacheKey = cache;
  // Logical owners release in forward order. Never resurrect an earlier hook
  // after its owner has already restored the source material.
  return () => { if (material.onBeforeCompile === compile) material.onBeforeCompile = oldCompile; if (material.customProgramCacheKey === cache) material.customProgramCacheKey = oldKey; };
}

class Surface {
  readonly positions: number[] = []; readonly colors: number[] = []; readonly batches: number[] = [];
  private current = RAIL_FACADES[0] as Recipe; private transform = frame(this.current).at;
  use(r: Recipe): void { this.current = r; this.transform = frame(r).at; }
  quad(a: Point, b: Point, c: Point, d: Point, color: number): void { const rgb = new Color(color); for (const p of [a, b, c, a, c, d]) { this.positions.push(...this.transform(...p).toArray()); this.colors.push(rgb.r, rgb.g, rgb.b); this.batches.push(this.current.batch); } }
  box(a: number, b: number, lo: number, hi: number, rear: number, front: number, color: number): void { const p: Point[] = [[a, lo, front], [b, lo, front], [b, hi, front], [a, hi, front], [a, lo, rear], [b, lo, rear], [b, hi, rear], [a, hi, rear]]; for (const [i, j, k, l] of [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]) this.quad(p[i!]!, p[j!]!, p[k!]!, p[l!]!, color); }
  geometry(): BufferGeometry { const g = new BufferGeometry(); g.setAttribute("position", new Float32BufferAttribute(this.positions, 3)); g.setAttribute("color", new Float32BufferAttribute(this.colors, 3)); g.setAttribute("_batchid", new Float32BufferAttribute(this.batches, 1)); g.computeVertexNormals(); return g; }
}

export function addRailFacades(scene: Object3D, uri: string, digest: string | undefined, options: Options, lifetime?: Pick<FacadeTextureLifetime, "onRelease">): boolean {
  const recipes = RAIL_FACADES.filter(r => r.tileUri === uri); if (!recipes.length || active.has(scene)) return false;
  const register = lifetime?.onRelease?.bind(lifetime), admitted = sources.get(scene);
  for (const r of recipes) if (digest !== r.tileSha256 || !admitted?.has(r) || !register) fail(r, "unprepared source/missing logical parse lifetime");
  const stone = new Surface(), metal = new Surface(), glass = new Surface(), room = new Surface();
  for (const rcp of recipes) {
    for (const surface of [stone, metal, glass, room]) surface.use(rcp);
    for (const w of rcp.windows) {
      const [a, b, lo, hi] = w.bounds, j = rcp.windowProfile.jamb, l = a + j, r = b - j, bottom = lo + j, top = hi - j, front = .055, rear = -1.25, glazing = -.30, wall = rcp.windowProfile.stone, fold = -rcp.planeLimit - .00002;
      stone.quad([a, lo, front], [l, lo, front], [l, hi, front], [a, hi, front], wall); stone.quad([r, lo, front], [b, lo, front], [b, hi, front], [r, hi, front], wall);
      stone.quad([l, lo, front], [r, lo, front], [r, bottom, front], [l, bottom, front], wall); stone.quad([l, top, front], [r, top, front], [r, hi, front], [l, hi, front], wall);
      stone.quad([a, lo, fold], [a, lo, front], [a, hi, front], [a, hi, fold], wall); stone.quad([b, lo, front], [b, lo, fold], [b, hi, fold], [b, hi, front], wall);
      stone.quad([a, hi, front], [b, hi, front], [b, hi, fold], [a, hi, fold], wall); stone.quad([a, lo, fold], [b, lo, fold], [b, lo, front], [a, lo, front], wall);
      room.quad([l, bottom, front], [l, bottom, rear], [l, top, rear], [l, top, front], 0x85877d); room.quad([r, bottom, rear], [r, bottom, front], [r, top, front], [r, top, rear], 0x85877d);
      room.quad([l, top, front], [l, top, rear], [r, top, rear], [r, top, front], 0xb7b4a3); room.quad([l, bottom, rear], [l, bottom, front], [r, bottom, front], [r, bottom, rear], 0x77796d);
      room.quad([l, bottom, rear], [r, bottom, rear], [r, top, rear], [l, top, rear], (w.floor + w.column) % 3 === 0 ? 0x777f7a : 0x99937f);
      const bar = .035, panes = rcp.windowProfile.panes;
      for (const x of [l, r - bar]) metal.box(x, x + bar, bottom, top, glazing - .025, glazing + .025, 0x43534f);
      for (const y of [bottom, top - bar]) metal.box(l + bar, r - bar, y, y + bar, glazing - .025, glazing + .025, 0x43534f);
      for (let p = 1; p < panes; p++) { const x = l + (r - l) * p / panes; metal.box(x - bar / 2, x + bar / 2, bottom + bar, top - bar, glazing - .025, glazing + .025, 0x43534f); }
      if (rcp.windowProfile.sash) { const y = bottom + rcp.windowProfile.sash; metal.box(l + bar, r - bar, y - .012, y + .012, glazing - .025, glazing + .025, 0x4c5b55); }
      glass.quad([l + bar, bottom + bar, glazing], [r - bar, bottom + bar, glazing], [r - bar, top - bar, glazing], [l + bar, top - bar, glazing], 0x94aaa5);
    }
  }
  const group = new Group(); group.name = "rail-side-facade-band"; group.matrix.copy(scene.matrixWorld).invert(); group.matrixAutoUpdate = false;
  const owned: { dispose(): void }[] = [], ownedNormals: Material[] = [], undo: (() => void)[] = []; let closed = false;
  const own = <T extends { dispose(): void }>(resource: T): T => { owned.push(resource); return resource; };
  const detach = (): void => { if (closed) return; closed = true; for (const restore of undo.toReversed()) restore(); group.removeFromParent(); for (const m of ownedNormals) m.dispose(); sources.delete(scene); active.delete(scene); };
  try {
    const mats = [new MeshStandardMaterial({ vertexColors: true, roughness: .78 }), new MeshStandardMaterial({ vertexColors: true, roughness: .28, metalness: .65 }), new MeshStandardMaterial({ vertexColors: true, roughness: .12, metalness: .18, transparent: true, opacity: .30, depthWrite: false }), new MeshStandardMaterial({ vertexColors: true, roughness: .86 })]; for (const m of mats) own(m);
    mats[3]!.emissive.setHex(0x9d8d66); Object.defineProperty(mats[3], "emissiveIntensity", { configurable: true, get: () => options.style.procedural.value < .5 ? Math.max(0, options.signageIntensity.value - .05) * .025 : 0 });
    for (const [i, surface] of [stone, metal, glass, room].entries()) {
      const mesh = new Mesh(own(surface.geometry()), mats[i]!); mesh.name = `rail-side-facade-band:${["stone", "metal", "glazing", "room"][i]}`; mesh.castShadow = i !== 2; mesh.receiveShadow = true;
      const depth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking })), distance = own(new MeshDistanceMaterial()), normal = new MeshNormalMaterial({ blending: NoBlending });
      for (const pass of [mats[i]!, depth, distance, normal]) undo.push(presentation(pass, options, undefined)); if (i === 2) { normal.visible = false; normal.depthWrite = false; }
      mesh.customDepthMaterial = depth; mesh.customDistanceMaterial = distance; normals.set(mesh, normal); ownedNormals.push(normal); undo.push(() => normals.delete(mesh)); group.add(mesh);
    }
    for (const source of new Set(admitted!.values())) {
      const sourceRecipes = recipes.filter(r => admitted!.get(r) === source), oldDepth = source.customDepthMaterial, oldDistance = source.customDistanceMaterial;
      const depth = oldDepth ?? own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking })), distance = oldDistance ?? own(new MeshDistanceMaterial());
      const oldNormal = getUpperWindowNormalMaterial(source), normal = oldNormal ?? new MeshNormalMaterial({ blending: NoBlending }); if (!oldNormal) ownedNormals.push(normal);
      for (const pass of [source.material as Material, depth, distance, normal]) undo.push(presentation(pass, options, sourceRecipes));
      source.customDepthMaterial = depth; source.customDistanceMaterial = distance; normals.set(source, normal);
      undo.push(() => { if (!oldDepth && source.customDepthMaterial === depth) source.customDepthMaterial = oldDepth; if (!oldDistance && source.customDistanceMaterial === distance) source.customDistanceMaterial = oldDistance; normals.delete(source); });
    }
    const meshes = group.children as Mesh[]; group.userData.railFacades = { beautyDraws: meshes.length, triangles: meshes.reduce((n, m) => n + m.geometry.getAttribute("position").count / 3, 0), geometryBytes: meshes.reduce((n, m) => n + Object.values(m.geometry.attributes).reduce((s, a) => s + a.array.byteLength, 0), 0), imageTextures: 0, localLights: 0, windows: recipes.reduce((n, r) => n + r.windows.length, 0), buildings: recipes.map(r => ({ gmlId: r.gmlId, storeys: r.storeys, selectedRows: 8 })), approximateInterior: true };
    register!(detach); scene.add(group); active.set(scene, group); return true;
  } catch (error) { detach(); for (const resource of owned) resource.dispose(); throw error; }
}

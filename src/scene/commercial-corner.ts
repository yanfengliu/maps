/** One complete authored commercial corner, owned by its original tile.
 * Source triangles retain their silhouette. Satellite replaces their lower
 * photographic windows; Cartographic returns the original source presentation.
 */
import { BufferGeometry, Color, Float32BufferAttribute, FrontSide, Group, Matrix3, Matrix4, Mesh, MeshDepthMaterial, MeshDistanceMaterial, MeshNormalMaterial, MeshStandardMaterial, NoBlending, PointLight, RGBADepthPacking, Triangle, Vector3, type Material, type Object3D, type Texture } from "three";
import { addCrossingFrontage, getCrossingFrontageNormalMaterial } from "./crossing-frontage.js";
import { buildCommercialCanopy, type CanopyRoom } from "./commercial-ground-canopy.js";
import { CROSSING_CORNER } from "./crossing-corner-material.js";
import { COMMERCIAL_CORNER as R } from "./commercial-corner-recipe.js";
import type { FacadeStyleUniforms, SignageUniform } from "./tile-materials.js";

type Point = readonly number[];
type Plan = [number, number];
type Height = number | ((x: number, z: number) => number);
type Face = typeof R.faces[number];
interface Source { mesh: Mesh; originalMap: Texture; faces: { face: Face; points: Vector3[] }[] }
interface Options { style: FacadeStyleUniforms; signageIntensity: SignageUniform }
const sources = new WeakMap<Object3D, Source>();
const normals = new WeakMap<Mesh, Material>();
const parserPlacement = new Matrix4().fromArray(R.parserPlacement);
const parserNormals = new Matrix3().getNormalMatrix(parserPlacement);
export const getCommercialCornerNormalMaterial = (mesh: Mesh): Material | undefined => normals.get(mesh);
const fail = (part: string): never => { throw Error(`Commercial corner ${part} differs from reviewed data518/batch63. Restore its original GML, indices, positions, normals, UV0 and world transform before replacing these facades.`); };
const constructionFail = (condition: string): never => { throw new Error(`Commercial ground construction ${condition}. Review the finite authored cap/return footprint and correct its closure before enabling the ground replacement; the photographic source was verified.`); };
const gl = (n: number): string => Number.isInteger(n) ? `${n}.0` : String(n);

/** Validate original parser arrays and actual world planes before any model or
 * replacement texture is allocated. Other tiles and GMLs remain untouched. */
export function prepareCommercialCorner(scene: Object3D, uri: string, digest: string | undefined): void {
  if (uri !== CROSSING_CORNER.tileUri) return;
  if (digest !== CROSSING_CORNER.tileSha256) fail("SHA-256");
  scene.updateMatrixWorld(true);
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  if (!table) fail("batch table");
  if (table!.getDataFromId(R.batchId)["gml_id"] !== CROSSING_CORNER.gmlId) return;
  let photo: Source | undefined, foundation = false;
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry, ids = geometry.getAttribute("_batchid") ?? geometry.getAttribute("_BATCHID");
    if (!ids || !Array.from({ length: ids.count }, (_, i) => ids.getX(i)).includes(R.batchId)) return;
    const mapped = geometry.hasAttribute("mapsCornerEligible");
    if (!mapped && geometry.hasAttribute("uv")) return;
    const recipe = mapped ? R.faces : R.foundation;
    const p = geometry.getAttribute("position"), n = geometry.getAttribute("normal"), uv = geometry.getAttribute("uv"), index = geometry.index;
    if (!p || !n || !index || (mapped && !uv)) fail("original attributes");
    const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
    const bound = recipe.map(face => {
      const points = face.vertices.map((v, c) => {
        const id = index!.getX(face.face * 3 + c);
        if (id !== face.indices[c] || ids.getX(id) !== R.batchId) fail(`face${face.face} index/GML`);
        for (let axis = 0; axis < 3; axis++) {
          if (Math.abs(p.getComponent(id, axis) - v.position[axis]!) > 1e-6 || Math.abs(n.getComponent(id, axis) - v.normal[axis]!) > 2e-6) fail(`face${face.face} original position/normal`);
        }
        if ("uv" in v && v.uv.some((value, axis) => Math.abs(uv!.getComponent(id, axis) - value) > 1e-8)) fail(`face${face.face} UV0`);
        const world = new Vector3().fromBufferAttribute(p, id).applyMatrix4(object.matrixWorld);
        const normal = new Vector3().fromBufferAttribute(n, id).applyNormalMatrix(normalMatrix);
        // GLTFLoader decomposes the source's slightly non-orthogonal root
        // matrix to TRS. Bind that separately observed parser placement, not
        // the offline raw-affine world measurements retained in the recipe.
        const expectedWorld = new Vector3(...v.position).applyMatrix4(parserPlacement);
        const expectedNormal = new Vector3(...v.normal).applyNormalMatrix(parserNormals);
        if (world.distanceTo(expectedWorld) > 2e-5 || normal.distanceTo(expectedNormal) > 4e-6) fail(`face${face.face} transformed plane/normal`);
        return world;
      });
      if (new Triangle(points[0]!, points[1]!, points[2]!).getNormal(new Vector3()).dot(new Vector3(...face.vertices[0].normal).applyNormalMatrix(parserNormals)) < .99999) fail(`face${face.face} winding`);
      return { face: face as Face, points };
    });
    if (mapped) {
      if (photo || Array.isArray(object.material) || !(object.material instanceof MeshStandardMaterial) || !object.material.map || object.material.side !== FrontSide) fail("single photographic primitive");
      validateGroundFields(bound);
      const selected = new Set(R.faces.flatMap(face => [...face.indices]));
      for (let f = 0; f < index!.count / 3; f++) if (!R.faces.some(face => face.face === f)) for (let c = 0; c < 3; c++) if (selected.has(index!.getX(f * 3 + c))) fail("shared selected/nonselected vertex");
      const binding = new Float32Array(p.count);
      for (const id of selected) binding[id] = 1;
      geometry.setAttribute("mapsCommercialSource", new Float32BufferAttribute(binding, 1));
      photo = { mesh: object, originalMap: object.material.map, faces: bound };
    } else foundation = true;
  });
  if (!photo || !foundation) fail("photographic/foundation primitives");
  sources.set(scene, photo!);
}

/** A separate pinned cut preserves the original eight-storey dimensional
 * authority. Main photographic material processing runs before this predicate. */
export const COMMERCIAL_SOURCE_GLSL = `
float mapsCommercialHidden(float binding, float y, float procedural) {
  return binding > 0.99 && y < ${gl(R.groundCutY)} && procedural < 0.5 ? 1.0 : 0.0;
}`;
function presentation(material: Material, options: Options, mode: "source" | "ground" | "relief"): void {
  const before = material.onBeforeCompile.bind(material), oldKey = material.customProgramCacheKey();
  const source = mode === "source";
  material.onBeforeCompile = (shader, renderer) => {
    before(shader, renderer);
    if (!shader.vertexShader.includes("#include <project_vertex>") || !shader.fragmentShader.includes("#include <clipping_planes_fragment>")) throw Error("Commercial ground shader is missing the reviewed three.js project/clipping hooks; restore its supported shader version.");
    shader.uniforms.mapsCommercialProcedural = options.style.procedural;
    shader.vertexShader = `${source ? "attribute float mapsCommercialSource; varying float mapsCommercialBinding; varying float mapsCommercialY;" : ""}\n` + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n${source ? "mapsCommercialBinding = mapsCommercialSource; mapsCommercialY = (modelMatrix * vec4(transformed,1.0)).y;" : ""}`);
    const discard = source ? "if (mapsCommercialHidden(mapsCommercialBinding,mapsCommercialY,mapsCommercialProcedural) > 0.5) discard;" : mode === "ground" ? "if (mapsCommercialProcedural > 0.5) discard;" : "if (mapsCommercialProcedural < 0.5) discard;";
    shader.fragmentShader = `uniform float mapsCommercialProcedural;\n${source ? "varying float mapsCommercialBinding; varying float mapsCommercialY;" + COMMERCIAL_SOURCE_GLSL : ""}\n` + shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${discard}`);
  };
  material.customProgramCacheKey = () => `${oldKey}:commercial-ground-${mode}-v2`;
}
/** Triangle soup per material: one draw for every category, regardless of the
 * number of floor bands, room objects or books. No texture is generated. */
class Assembly {
  readonly positions: number[] = [];
  readonly colors: number[] = [];
  readonly uv: number[] = [];
  readonly signBackground: number[] = [];
  triangle(a: Point, b: Point, c: Point, color: number, texture?: readonly Point[], background?: readonly number[]): void {
    const rgb = new Color(color);
    for (const [i, p] of [a, b, c].entries()) { this.positions.push(p[0]!, p[1]!, p[2]!); this.colors.push(rgb.r, rgb.g, rgb.b); this.uv.push(texture?.[i]?.[0] ?? 0, texture?.[i]?.[1] ?? 0); }
    if (background) for (let i = 0; i < 3; i++) this.signBackground.push(...background);
  }
  quad(a: Point, b: Point, c: Point, d: Point, color: number): void { this.triangle(a, b, c, color); this.triangle(a, c, d, color); }
  box(points: readonly Point[], color: number): void {
    for (const [a, b, c, d] of [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]]) this.quad(points[a!]!, points[b!]!, points[c!]!, points[d!]!, color);
  }
  geometry(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(this.uv, 2));
    geometry.setAttribute("_batchid", new Float32BufferAttribute(new Float32Array(this.positions.length / 3).fill(R.batchId), 1));
    if (this.signBackground.length) geometry.setAttribute("mapsSignBackground", new Float32BufferAttribute(this.signBackground, 4));
    geometry.computeVertexNormals(); return geometry;
  }
}

const corner = new Vector3(...CROSSING_CORNER.origin);
const thresholdHeight = (x: number, z: number): number => {
  const a = R.threshold.vertices[0], n = R.threshold.normal;
  return a[1] - (n[0] * (x - a[0]) + n[2] * (z - a[2])) / n[1] + .001;
};
const heightAt = (height: Height, p: Plan): number => typeof height === "number" ? height : height(p[0], p[1]);
const basis = (side: "south" | "east") => {
  const end = new Vector3(...R[side].end), u = end.clone().sub(corner); u.y = 0; u.normalize();
  const n = new Vector3(...R[side].normal); n.y = 0; n.normalize();
  const at = (s: number, _y: number, outward: number): Plan => [corner.x + u.x * s + n.x * outward, corner.z + u.z * s + n.z * outward];
  return { u, n, at, length: R[side].length };
};
const cross = (a: Plan, b: Plan, p: Plan): number => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
function clip<T extends number[]>(polygon: T[], signed: (p: T) => number): T[] {
  const output: T[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!, da = signed(a), db = signed(b);
    if (da >= 0) output.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) output.push(a.map((v, k) => v + (b[k]! - v) * da / (da - db)) as T);
  }
  return output;
}
const footprint: Plan[] = R.footprint.map(p => [p[0], p[2]]);
const cornerRoomJoins = new Map<string, [Plan, Plan]>(), roomInterfaces = new WeakMap<Plan[], [Plan, Plan][]>();
function sharedRoomCorner(start: number, depth: number): [Plan, Plan] {
  const key = `${start}/${depth}`;
  if (!cornerRoomJoins.has(key)) {
    const fronts = [basis("south"), basis("east")];
    const line = (front: ReturnType<typeof basis>, coordinate: "s" | "d"): Plan => { const det = front.u.x * front.n.z - front.u.z * front.n.x; return coordinate === "s" ? [front.n.z / det, -front.n.x / det] : [-front.u.z / det, front.u.x / det]; };
    const meet = (coordinate: "s" | "d", value: number): Plan => { const a = line(fronts[0]!, coordinate), b = line(fronts[1]!, coordinate), det = a[0] * b[1] - a[1] * b[0]; return [corner.x + value * (b[1] - a[1]) / det, corner.z + value * (a[0] - b[0]) / det]; };
    cornerRoomJoins.set(key, [meet("s", start), meet("d", -depth)]);
  }
  return cornerRoomJoins.get(key)!;
}
function roomPlan(side: "south" | "east", start: number, end: number, depth: number, front = .28): Plan[] {
  const b = basis(side), other = basis(side === "south" ? "east" : "south");
  const shared = start === .20 + .065 ? sharedRoomCorner(start, depth) : undefined;
  let polygon = shared ? [b.at(start, 0, -front), b.at(end, 0, -front), b.at(end, 0, -depth), shared[1], shared[0]] : [b.at(start, 0, -front), b.at(end, 0, -front), b.at(end, 0, -depth), b.at(start, 0, -depth)];
  for (let i = 0; i < footprint.length; i++) polygon = clip(polygon, p => cross(footprint[i]!, footprint[(i + 1) % footprint.length]!, p));
  // Partition the corner on the interior angle bisector; the two rooms meet
  // without overlapping floors, returns or furnishings.
  if (!shared) polygon = clip(polygon, p => (b.n.x - other.n.x) * (p[0] - corner.x) + (b.n.z - other.n.z) * (p[1] - corner.z));
  if (polygon.length >= 3 && cross(polygon[0]!, polygon[1]!, polygon[2]!) < 0) polygon.reverse();
  if (shared) roomInterfaces.set(polygon, [shared]);
  return polygon;
}
function floorPolygon(out: Assembly, plan: Plan[], y: Height, color: number, up: boolean): void {
  for (let i = 1; i < plan.length - 1; i++) {
    const points = [plan[0]!, plan[i]!, plan[i + 1]!].map(p => [p[0], heightAt(y, p), p[1]]);
    if (up) points.reverse();
    out.triangle(points[0]!, points[1]!, points[2]!, color);
  }
}
function addPrism(out: Assembly, side: "south" | "east", a: number, b: number, low: Height, high: Height, back: number, front: number, color: number): void {
  const at = basis(side).at;
  const p = [at(a, 0, back), at(b, 0, back), at(b, 0, front), at(a, 0, front)];
  // Plan winding differs between the two source fronts.
  if (cross(p[0]!, p[1]!, p[2]!) < 0) p.reverse();
  out.box([...p.map(v => [v[0], heightAt(low, v), v[1]]), ...p.map(v => [v[0], heightAt(high, v), v[1]])], color);
}

// The two fronts share one authored corner partition. Only these adjoining
// ground strips use it; room contents and the photographic source stay intact.
function adjoiningPlan(side: "south" | "east", a: number, b: number, back: number, front: number): Plan[] {
  const covector = (f: ReturnType<typeof basis>): Plan => {
    const det = f.u.x * f.n.z - f.u.z * f.n.x;
    return [-f.u.z / det, f.u.x / det];
  };
  const u = covector(basis("south")), v = covector(basis("east")), sign = side === "south" ? 1 : -1;
  return clip(prismPlan(side, a, b, back, front), p => sign * ((u[0] - v[0]) * (p[0] - corner.x) + (u[1] - v[1]) * (p[1] - corner.z)));
}
const finitePlan = (p: Plan[]): boolean => p.length >= 3 && Math.abs(p.reduce((s, a, i) => {
  const b = p[(i + 1) % p.length]!; return s + a[0] * b[1] - a[1] * b[0];
}, 0)) > 0;
const foundationIntervals = (side: "south" | "east"): [number, number][] => side === "south"
  ? [[0, R.south.length / 2 - .8], [R.south.length / 2 + .8, R.south.length - .06]] : [[0, R.east.length - .06]];
const groundJambs = (side: "south" | "east"): { a: number; b: number; door: boolean }[] => {
  const length = R[side].length, divisions = side === "south" ? [0, .245, .45, .55, .755, 1] : [0, .255, .50, .755, 1];
  return divisions.slice(0, -1).flatMap((v, i) => {
    const a = v * length, b = divisions[i + 1]! * length, door = side === "south" && i === 2, w = door ? .075 : .18;
    return [{ a, b: a + w, door }, { a: b - w, b, door }];
  });
};
const groundBars = (side: "south" | "east"): { a: number; b: number; door: boolean }[] => {
  const length = R[side].length, divisions = side === "south" ? [0, .245, .45, .55, .755, 1] : [0, .255, .50, .755, 1];
  return divisions.slice(0, -1).map((v, i) => {
    const a = v * length, b = divisions[i + 1]! * length, door = side === "south" && i === 2;
    return { a: door ? length / 2 - .765 : a + .20, b: door ? length / 2 + .765 : b - .20, door };
  });
};
/** Named scalar stations avoid subtracting numerically coincident rectangles.
 * Foundation contacts have no second cap; the remaining underside is exterior. */
function freeBottom(out: Assembly, side: "south" | "east", a: number, b: number, low: Height, back: number, front: number, color: number): void {
  const foundations = foundationIntervals(side), centre = R.south.length / 2;
  const platforms = side === "south" && low === thresholdHeight ? [
    { a: centre - .8, b: centre + .8, back: .02, front: .24 },
    { a: centre - .765, b: centre + .765, back: -.30, front: .02 },
  ] : [];
  const stations = [...new Set([a, b, ...[...foundations.flat(), ...platforms.flatMap(p => [p.a, p.b])].filter(v => v > a && v < b)])].sort((u, v) => u - v);
  const depths = [...new Set([back, ...[-.24, 0, ...platforms.flatMap(p => [p.back, p.front])].filter(v => v > back && v < front), front])].sort((u, v) => u - v);
  for (let i = 0; i + 1 < stations.length; i++) for (let j = 0; j + 1 < depths.length; j++) {
    const start = stations[i]!, end = stations[i + 1]!, rear = depths[j]!, face = depths[j + 1]!;
    const plan = adjoiningPlan(side, start, end, rear, face), covered = foundations.some(([s, e]) => s <= start && e >= end) && rear >= -.24 && face <= 0;
    const platform = platforms.some(p => p.a <= start && p.b >= end && p.back <= rear && p.front >= face);
    const exposed = platform ? [] : covered ? (typeof low === "number" ? [] : clip(plan, p => heightAt(low, p) - 15.50)) : plan;
    if (finitePlan(exposed)) floorPolygon(out, exposed, low, color, false);
  }
}
function foundation(out: Assembly, side: "south" | "east", base: number): void {
  const b = basis(side), coordinate = (p: Plan, axis: "s" | "d"): number => {
    const x = p[0] - corner.x, z = p[1] - corner.z, det = b.u.x * b.n.z - b.u.z * b.n.x;
    return axis === "s" ? (x * b.n.z - z * b.n.x) / det : (b.u.x * z - b.u.z * x) / det;
  }, covers = [...groundJambs(side).map(p => ({ ...p, platform: false })), ...groundBars(side).map(p => ({ ...p, platform: p.door }))];
  for (const [start, end] of foundationIntervals(side)) {
    const stations = [...new Set([start, end, ...covers.flatMap(j => [j.a, j.b]).filter(v => v > start && v < end)])].sort((a, b) => a - b);
    for (let i = 0; i + 1 < stations.length; i++) {
      const a = stations[i]!, z = stations[i + 1]!, cover = covers.find(j => j.a <= a && j.b >= z), plan = adjoiningPlan(side, a, z, -.24, 0);
      const doorTop: Height = (x, z) => thresholdHeight(x, z) - (cover?.platform ? .04 : 0);
      const pieces = cover?.door ? [
        { plan: clip(plan, p => 15.50 - heightAt(doorTop, p)), top: doorTop, cap: false },
        { plan: clip(plan, p => heightAt(doorTop, p) - 15.50), top: 15.50, cap: true },
      ] : [{ plan, top: 15.50, cap: !cover }];
      for (const piece of pieces) {
        if (!finitePlan(piece.plan)) continue;
        floorPolygon(out, piece.plan, base, 0xcac7b9, false);
        if (piece.cap) floorPolygon(out, piece.plan, piece.top, 0xcac7b9, true);
        for (let e = 0; e < piece.plan.length; e++) {
          const p = piece.plan[e]!, q = piece.plan[(e + 1) % piece.plan.length]!, dp = coordinate(p, "d"), dq = coordinate(q, "d"), sp = coordinate(p, "s"), sq = coordinate(q, "s");
          const on = (a: number, b: number, station: number): boolean => Math.abs(a - station) < 1e-10 && Math.abs(b - station) < 1e-10;
          if (on(dp, dq, -.24) || on(dp, dq, 0) || (start !== 0 && on(sp, sq, start)) || on(sp, sq, end))
            out.quad([p[0], base, p[1]], [p[0], heightAt(piece.top, p), p[1]], [q[0], heightAt(piece.top, q), q[1]], [q[0], base, q[1]], 0xcac7b9);
        }
      }
    }
  }
}

/** Two adjoining graded landing pieces share the doorway edge. Its central
 * interface has no duplicate wall; the full1.60m front remains supported. */
function thresholdPlatforms(out: Assembly): void {
  const side = "south", c = R.south.length / 2, at = basis(side).at;
  const part = (a: number, b: number, back: number, front: number, color: number): void => {
    const plan = prismPlan(side, a, b, back, front);
    floorPolygon(out, plan, (x, z) => thresholdHeight(x, z) - .04, color, false);
    floorPolygon(out, plan, thresholdHeight, color, true);
    const wall = (s0: number, d0: number, s1: number, d1: number): void => {
      const p = at(s0, 0, d0), q = at(s1, 0, d1), low = (v: Plan): number => thresholdHeight(v[0], v[1]) - .04;
      out.quad([p[0], low(p), p[1]], [p[0], thresholdHeight(p[0], p[1]), p[1]], [q[0], thresholdHeight(q[0], q[1]), q[1]], [q[0], low(q), q[1]], color);
    };
    wall(a, back, a, front); wall(b, front, b, back);
    if (back === .02) { wall(c - .765, back, a, back); wall(b, back, c + .765, back); }
    else wall(b, back, a, back);
    if (front !== .02) wall(a, front, b, front);
  };
  part(c - .8, c + .8, .02, .24, 0xcac2ae);
  part(c - .765, c + .765, -.30, .02, 0xbfb79f);
}

function furnishings(out: Assembly, side: "south" | "east", plan: Plan[], start: number, end: number, floor: number, variant: number): void {
  const b = basis(side), contains = (s: number, depth: number): boolean => {
    const p = b.at(s, 0, -depth);
    const signs = plan.map((a, i) => cross(a, plan[(i + 1) % plan.length]!, p));
    return signs.every(v => v >= -1e-8) || signs.every(v => v <= 1e-8);
  };
  const box = (s: number, d: number, w: number, h: number, thickness: number, y: number, color: number): boolean => {
    if (![s - w / 2, s + w / 2].every(v => [d - thickness / 2, d + thickness / 2].every(depth => contains(v, depth)))) return false;
    addPrism(out, side, s - w / 2, s + w / 2, floor + y, floor + y + h, -d - thickness / 2, -d + thickness / 2, color); return true;
  };
  const width = end - start, centre = (start + end) / 2;
  // Open bookshelves, individually varied book spines, counter, tables and
  // chairs are real volumes behind glass, with clear space at the entrance.
  const shelfWidth = Math.min(2.25, width - .65), shelfS = centre + .15;
  for (const x of [-shelfWidth / 2, shelfWidth / 2]) box(shelfS + x, 1.82, .075, 2.25, .4, 0, 0x80674c);
  for (let row = 0; row < 5; row++) {
    box(shelfS, 1.82, shelfWidth, .065, .43, .08 + row * .44, 0x9a805d);
    for (let book = 0; book < 9; book++) {
      const color = [0x815a40, 0xbbab7c, 0x48626a, 0x633f3e, 0x737b54][(book + row + variant) % 5]!;
      box(shelfS - shelfWidth / 2 + .17 + book * (shelfWidth - .28) / 9, 1.72, .11 + (book % 3) * .018, .25 + ((book + row) % 3) * .04, .20, .15 + row * .44, color);
    }
  }
  if (variant % 2 === 0) {
    box(centre, .95, Math.min(1.45, width - .8), .86, .52, 0, 0x8b6046);
    box(centre, .95, Math.min(1.52, width - .7), .075, .58, .86, 0xd1c7ac);
    box(centre + .28, .95, .32, .19, .24, .94, 0x333936);
  } else {
    box(centre, 1.02, .95, .09, .76, .74, 0xb39768);
    for (const s of [centre - .34, centre + .34]) for (const d of [.78, 1.27]) box(s, d, .065, .74, .065, 0, 0x4c4940);
    for (const s of [centre - .76, centre + .76]) {
      box(s, 1.03, .40, .10, .40, .43, 0x7e6649);
      box(s, 1.24, .40, .48, .065, .48, 0x7e6649);
      for (const dx of [-.14, .14]) for (const d of [.89, 1.16]) box(s + dx, d, .045, .43, .045, 0, 0x403e35);
    }
  }
}

/** Check the complete mapped fields, including the inherited source-edge
 * remainder. Historical mounted crops are not an admission population. */
function validateGroundFields(faces: Source["faces"]): void {
  if (R.upperY !== 54.8907857589529) fail("original upperY dimensional authority");
  for (const field of R.protectedFields) {
    const [left, top, right, bottom] = field.pixels;
    let area = 0, minimum = Infinity;
    for (const { face, points } of faces) {
      if ((face.face >= 494 ? "south" : "east") !== field.side) continue;
      let p = face.vertices.map((v, i) => [v.uv[0] * 4096, v.uv[1] * 4096, ...points[i]!.toArray()]);
      p = clip(p, v => v[0]! - left); p = clip(p, v => right - v[0]!); p = clip(p, v => v[1]! - top); p = clip(p, v => bottom - v[1]!);
      if (p.length < 3) continue;
      area += Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]!; return s + a[0]! * b[1]! - a[1]! * b[0]!; }, 0)) / 2;
      minimum = Math.min(minimum, ...p.map(v => v[3]!));
    }
    if (Math.abs(area - field.mappedArea) > .001 || minimum < R.groundCutY + .020 - .00002) fail(`complete ${field.name} mapped source field/20mm seam clearance`);
  }
}
const ordered = (p: Plan[]): Plan[] => cross(p[0]!, p[1]!, p[2]!) < 0 ? p.toReversed() : p;
const prismPlan = (side: "south" | "east", a: number, b: number, back: number, front: number): Plan[] => {
  const at = basis(side).at; return ordered([at(a, 0, back), at(b, 0, back), at(b, 0, front), at(a, 0, front)]);
};

/** The five actual installed photographic intersections, including the face
 * diagonal joins. They partition the cap; raw-affine facade bases do not. */
function cutSegments(source: Source): Plan[][] {
  const segments: Plan[][] = [], intersections = new Map<string, Plan>();
  for (const { points } of source.faces) {
    const hits: Plan[] = [];
    for (let i = 0; i < 3; i++) {
      const a = points[i]!, b = points[(i + 1) % 3]!;
      if ((a.y < R.groundCutY) !== (b.y < R.groundCutY)) {
        const edge = [a, b].sort((u, v) => u.x - v.x || u.y - v.y || u.z - v.z), key = edge.map(v => v.toArray().join(",")).join("/");
        if (!intersections.has(key)) { const u = edge[0]!, v = edge[1]!, t = (R.groundCutY - u.y) / (v.y - u.y); intersections.set(key, [u.x + (v.x - u.x) * t, u.z + (v.z - u.z) * t]); }
        hits.push(intersections.get(key)!);
      }
    }
    if (hits.length === 2) segments.push(hits);
  }
  if (segments.length !== 5) constructionFail("five actual ground-cut segments");
  return segments;
}

function roomRadiance(material: MeshStandardMaterial, options: Options, amount: number): void {
  material.emissive.setHex(0xffffff);
  material.onBeforeCompile = shader => {
    shader.uniforms.mapsRoomLight = options.signageIntensity;
    shader.fragmentShader = "uniform float mapsRoomLight;\n" + shader.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= diffuseColor.rgb * (0.04 + mapsRoomLight * ${gl(amount)});`);
  };
  material.customProgramCacheKey = () => `maps-commercial-room-${amount}`;
}

/** Ground-only construction. The original upper source, its material chain and
 * main relief remain owned by the tile; all suppression is committed last. */
export function addCommercialCorner(scene: Object3D, uri: string, digest: string | undefined, options: Options): boolean {
  if (uri !== CROSSING_CORNER.tileUri) return false;
  if (digest !== CROSSING_CORNER.tileSha256) fail("construction SHA-256");
  if (scene.getObjectByName(R.name)) return true;
  const source = sources.get(scene); if (!source) return false;
  // Main's original relief exists in both success and fallback. Its geometry,
  // source-facing hook and private normal registration are never replaced.
  addCrossingFrontage(scene, uri, digest);
  const relief = scene.getObjectByName("crossing-frontage-surround");
  if (!relief) return constructionFail("original main relief");
  const stone = new Assembly(), metal = new Assembly(), glass = new Assembly(), rooms = new Assembly(), objects = new Assembly(), lamps = new Assembly();
  const base = corner.y, band = (R.upperY - base) / 8, high = base + band - .43, ceiling = high - .065;
  const canopyRooms: CanopyRoom[] = [], seams = cutSegments(source);
  const along = (side: "south" | "east", p: Plan): number => { const f = basis(side), det = f.u.x * f.n.z - f.u.z * f.n.x; return ((p[0]-corner.x)*f.n.z-(p[1]-corner.z)*f.n.x)/det; };
  const post = (out: Assembly, side: "south" | "east", a: number, b: number, low: Height, top: number, back: number, front: number, color: number, bottom = true, terminal = false): void => {
    const plan = adjoiningPlan(side, a, b, back, front);
    if (bottom) { if(out===stone)freeBottom(out,side,a,b,low,back,front,color);else floorPolygon(out,plan,low,color,false); }
    for (let i = 0; i < plan.length; i++) { const p = plan[i]!, q = plan[(i + 1) % plan.length]!; out.quad([p[0], heightAt(low, p), p[1]], [p[0], top, p[1]], [q[0], top, q[1]], [q[0], heightAt(low, q), q[1]], color); }
    if (front > .005) floorPolygon(out, adjoiningPlan(side, a, b, Math.max(back, .005), front), top, color, true);
    if (back < -.30) floorPolygon(out, adjoiningPlan(side, a, b, back, Math.min(front, -.30)), top, color, true);
    if (terminal) {
      const end = Math.max(...seams.flat().map(p => along(side, p)));
      const exposed = clip(adjoiningPlan(side,a,b,Math.max(back,-.30),Math.min(front,.005)),p=>along(side,p)-end);
      if(finitePlan(exposed)) floorPolygon(out,exposed,top,color,true);
    }
  };
  for (const side of ["south", "east"] as const) {
    const b = basis(side), length = b.length, divisions = side === "south" ? [0, .245, .45, .55, .755, 1] : [0, .255, .50, .755, 1], low = 15.50;
    foundation(stone,side,base);
    for (let bay = 0; bay < divisions.length - 1; bay++) {
      const a = divisions[bay]! * length, z = divisions[bay + 1]! * length, door = side === "south" && bay === 2;
      const start = door ? length / 2 - .765 : a + .20, end = door ? length / 2 + .765 : z - .20;
      const active = !door && !(side === "east" && bay >= 2), dark = !active && (bay + (side === "east" ? 1 : 0)) % 4 === 0;
      const jambLow: Height = door ? thresholdHeight : low;
      post(stone, side, a, a + (door ? .075 : .18), jambLow, ceiling, -.25, .075, 0xb9b8ac);
      post(stone, side, z - (door ? .075 : .18), z, jambLow, ceiling, -.25, .075, 0xb9b8ac);
      const edge = .065, barTop: Height = door ? (x, z) => thresholdHeight(x, z) + .045 : low + edge;
      for (const s of [start, end - edge]) post(metal, side, s, s + edge, barTop, ceiling, -.30, .02, 0x354348, false);
      const barPlan = adjoiningPlan(side, start, end, -.30, .02), barLow: Height = door ? thresholdHeight : low;
      freeBottom(metal,side,start,end,barLow,-.30,.02,0x354348);
      for (let i = 0; i < barPlan.length; i++) { const p = barPlan[i]!, q = barPlan[(i + 1) % barPlan.length]!; metal.quad([p[0],heightAt(barLow,p),p[1]],[p[0],heightAt(barTop,p),p[1]],[q[0],heightAt(barTop,q),q[1]],[q[0],heightAt(barLow,q),q[1]],0x354348); }
      const barCap = (a: number, b: number, back: number, front: number): void => floorPolygon(metal, adjoiningPlan(side,a,b,back,front),barTop,0x354348,true);
      if (door) { const c = length / 2; barCap(start+edge,c-.025,-.30,-.24);barCap(c+.025,end-edge,-.30,-.24);barCap(start+edge,end-edge,-.24,.02); }
      else barCap(start+edge,end-edge,-.30,.02);
      const plan = roomPlan(side, start + edge, end - edge, active || door ? 2.25 : .90, .28), floor = door ? 15.50 : low + edge, floorAt: Height = door ? thresholdHeight : floor;
      if (plan.length >= 3) {
        const signedDepth = (p: Plan): number => { const dx=p[0]-corner.x,dz=p[1]-corner.z,det=b.u.x*b.n.z-b.u.z*b.n.x;return(b.u.x*dz-b.u.z*dx)/det; };
        const floorPlan = clip(plan,p=>-.30-signedDepth(p));
        floorPolygon(rooms, floorPlan, floorAt, active || door ? 0xbfa77f : dark ? 0x18252a : 0x63716b, true);
        canopyRooms.push({ plan, side, color: active || door ? 0xbab6a5 : 0x333f43, sharedEdges: roomInterfaces.get(plan) ?? [] });
        for (let i = 0; i < plan.length; i++) {
          const p = plan[i]!, q = plan[(i + 1) % plan.length]!, depth = (v: Plan) => -((v[0] - corner.x) * b.n.x + (v[1] - corner.z) * b.n.z);
          if (Math.max(depth(p), depth(q)) < .29) continue;
          const stations = [p]; const dp=signedDepth(p)+.30,dq=signedDepth(q)+.30;
          if(dp*dq<0)stations.push([p[0]+(q[0]-p[0])*dp/(dp-dq),p[1]+(q[1]-p[1])*dp/(dp-dq)]);
          stations.push(q);
          for(let j=0;j+1<stations.length;j++){const u=stations[j]!,v=stations[j+1]!,bottom:Height=door&&Math.max(signedDepth(u),signedDepth(v))>-.30?barTop:floorAt;rooms.quad([u[0],heightAt(bottom,u),u[1]],[v[0],heightAt(bottom,v),v[1]],[v[0],ceiling,v[1]],[u[0],ceiling,u[1]],active||door?0xc2b69a:dark?0x17272c:0x738184);}
        }
        if (active) furnishings(objects, side, plan, start + .12, end - .12, floor, bay + (side === "east" ? 1 : 0));
      }
      const p = [b.at(start + edge, 0, -.29), b.at(end - edge, 0, -.29)], color = door ? 0x76908c : active ? 0x8fa7a5 : dark ? 0x1f343e : [0x66808a, 0x7f969c, 0x496570][bay % 3]!;
      const vertices = [[p[0]![0], heightAt(barTop, p[0]!), p[0]![1]], [p[1]![0], heightAt(barTop, p[1]!), p[1]![1]], [p[1]![0], ceiling, p[1]![1]], [p[0]![0], ceiling, p[0]![1]]];
      if (new Triangle(new Vector3(...vertices[0]!), new Vector3(...vertices[1]!), new Vector3(...vertices[2]!)).getNormal(new Vector3()).dot(b.n) < 0) vertices.reverse();
      glass.quad(vertices[0]!, vertices[1]!, vertices[2]!, vertices[3]!, color);
      if (door) {
        thresholdPlatforms(stone);
        post(metal, side, length / 2 - .025, length / 2 + .025, barTop, ceiling, -.30, -.24, 0x26383a, false);
        for (const s of [length / 2 - .18, length / 2 + .18]) addPrism(metal, side, s - .018, s + .018, floor + .95, floor + 1.53, -.24, -.15, 0xaeb7af);
        const fascia = prismPlan(side,a-.1,z+.1,.025,.23), fasciaLow=high+.12;
        floorPolygon(stone,fascia,R.groundCutY,0x414e50,true);
        for(let i=0;i<fascia.length;i++){const u=fascia[i]!,v=fascia[(i+1)%fascia.length]!,at=(p:Plan)=>{const dx=p[0]-corner.x,dz=p[1]-corner.z,det=b.u.x*b.n.z-b.u.z*b.n.x;return(b.u.x*dz-b.u.z*dx)/det;};if(Math.abs(at(u)-.025)<1e-10&&Math.abs(at(v)-.025)<1e-10)continue;stone.quad([u[0],fasciaLow,u[1]],[u[0],R.groundCutY,u[1]],[v[0],R.groundCutY,v[1]],[v[0],fasciaLow,v[1]],0x414e50);}
        for(const [left,right,back,front]of[[a-.1,a+.22,.025,.23],[z-.22,z+.1,.025,.23],[a+.22,z-.22,.025,.06],[a+.22,z-.22,.20,.23]])floorPolygon(stone,prismPlan(side,left!,right!,back!,front!),fasciaLow,0x414e50,false);
        floorPolygon(lamps,prismPlan(side,a+.22,z-.22,.06,.20),fasciaLow,0xffdf9a,false);
      }
      if (active) addPrism(lamps, side, start + .3, end - .3, high - .13, high - .09, -1.80, -1.65, 0xffe4ac);
    }
    post(metal, side, length - .06, side === "east" ? R.eastReturnEnd : length, base, ceiling, -.31, .075, 0x3b4649, true, true);
  }
  const s = basis("south"), e = basis("east"), p = s.at(0, 0, .078), q = e.at(0, 0, .078);
  metal.quad([p[0], base, p[1]], [q[0], base, q[1]], [q[0], ceiling, q[1]], [p[0], ceiling, p[1]], 0x4b5655);
  buildCommercialCanopy({ stone, metal, rooms, panels: canopyRooms, south: s, east: { ...e, length: R.eastReturnEnd }, origin: corner, ceiling, high, cut: R.groundCutY, seams, refuse: constructionFail });
  const group = new Group(); group.name = R.name; group.matrix.copy(scene.matrixWorld).invert(); group.matrixAutoUpdate = false;
  const owned: { dispose(): void }[] = [], restored: (() => void)[] = [], released = new Set<object>();
  let closed = false;
  const own = <T extends { dispose(): void }>(r: T): T => { owned.push(r); return r; };
  const restore = (): void => { for (const undo of restored.toReversed()) undo(); restored.length = 0; };
  const cleanup = (): void => { if (closed) return; closed = true; restore(); group.removeFromParent(); for (const resource of owned) if (!released.has(resource)) { released.add(resource); resource.dispose(); } sources.delete(scene); };
  const wrap = (mat: Material, mode: "source" | "ground" | "relief"): void => { const compile = mat.onBeforeCompile, key = mat.customProgramCacheKey; presentation(mat, options, mode); restored.push(() => { mat.onBeforeCompile = compile; mat.customProgramCacheKey = key; }); };
  const register = (mesh: Mesh, normal: Material): void => { const previous = normals.get(mesh); normals.set(mesh, normal); restored.push(() => { if (previous) normals.set(mesh, previous); else normals.delete(mesh); }); };
  try {
    const material = (roughness: number, metalness = 0): MeshStandardMaterial => own(new MeshStandardMaterial({ vertexColors: true, roughness, metalness }));
    const stoneMat = material(.88), metalMat = material(.35, .58), glassMat = material(.13, .12), roomMat = material(.92), objectMat = material(.7), lampMat = material(.4);
    glassMat.transparent = true; glassMat.opacity = .23; glassMat.depthWrite = false; glassMat.envMapIntensity = .72;
    roomRadiance(roomMat, options, .16); roomRadiance(objectMat, options, .30); roomRadiance(lampMat, options, 2.1);
    for (const [name, out, mat] of [["cladding", stone, stoneMat], ["metal", metal, metalMat], ["glazing", glass, glassMat], ["rooms", rooms, roomMat], ["furnishings", objects, objectMat], ["fittings", lamps, lampMat]] as const) {
      const geometry = own(out.geometry()), mesh = new Mesh(geometry, mat); mesh.name = `${R.name}:${name}`; wrap(mat, "ground");
      mesh.userData.authoredFrontage = { gmlId: CROSSING_CORNER.gmlId, source: false }; mesh.castShadow = name !== "glazing" && name !== "fittings"; mesh.receiveShadow = true;
      const depth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking })), distance = own(new MeshDistanceMaterial()), normal = own(new MeshNormalMaterial({ blending: NoBlending }));
      if (name === "glazing") { normal.visible = false; normal.depthWrite = false; }
      for (const pass of [depth, distance, normal]) wrap(pass, "ground");
      mesh.customDepthMaterial = depth; mesh.customDistanceMaterial = distance; register(mesh, normal); group.add(mesh);
    }
    // Stage matching source and original-relief predicates after main's hooks.
    // Every change has an exact undo before the first resource can be released.
    wrap(source.mesh.material as Material, "source");
    const sourceDepth = source.mesh.customDepthMaterial, sourceDistance = source.mesh.customDistanceMaterial;
    const depth = own(new MeshDepthMaterial({ depthPacking: RGBADepthPacking })), distance = own(new MeshDistanceMaterial()), normal = own(new MeshNormalMaterial({ blending: NoBlending }));
    for (const pass of [depth, distance, normal]) wrap(pass, "source");
    restored.push(() => { source.mesh.customDepthMaterial = sourceDepth; source.mesh.customDistanceMaterial = sourceDistance; });
    source.mesh.customDepthMaterial = depth; source.mesh.customDistanceMaterial = distance; register(source.mesh, normal);
    const reliefPasses = new Set<Material>();
    relief.traverse(o => { if (o instanceof Mesh) for (const mat of [o.material as Material, o.customDepthMaterial, o.customDistanceMaterial, getCrossingFrontageNormalMaterial(o)]) if (mat) reliefPasses.add(mat); });
    if (reliefPasses.size !== 4) constructionFail("four original relief passes");
    for (const pass of reliefPasses) wrap(pass, "relief");
    const fixture = own(new PointLight(0xffdeb0, 1, 4, 2)), location = s.at(R.south.length / 2, 0, .16);
    fixture.position.set(location[0], 19.37, location[1]); Object.defineProperty(fixture, "intensity", { configurable: true, get: () => options.style.procedural.value < .5 ? options.signageIntensity.value * 9 : 0 }); group.add(fixture);
    const meshes = group.children.filter((o): o is Mesh => o instanceof Mesh), modelBytes = meshes.reduce((sum, m) => sum + Object.values(m.geometry.attributes).reduce((n, a) => n + a.array.byteLength, 0), 0), sourceBindingBytes = source.mesh.geometry.getAttribute("mapsCommercialSource").array.byteLength;
    const triangles = meshes.reduce((sum, m) => sum + m.geometry.getAttribute("position").count / 3, 0), bytes = modelBytes + sourceBindingBytes;
    if (meshes.length > R.limit.beautyDraws || triangles > R.limit.triangles || bytes > R.limit.geometryBytes) constructionFail(`resource ceiling (${meshes.length} draws, ${triangles} triangles, ${bytes} bytes)`);
    group.userData.commercialCorner = { beautyDraws: meshes.length, triangles, geometryBytes: bytes, modelGeometryBytes: modelBytes, sourceBindingBytes, newAtlases: 0, localLights: 1 };
    stoneMat.addEventListener("dispose", cleanup); scene.add(group); return true;
  } catch (error) { cleanup(); throw error; }
}

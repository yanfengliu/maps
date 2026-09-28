/** Authored TSUTAYA frontage, bounded by the decoded wall and the named C5
 * published-LOD3 edge. This is presentation geometry, not surveyed source data.
 * Only the explicitly reviewed 53 inherited edge faces may be subdivided. */
import { createHash } from "node:crypto";
import { encodeMesh, type MeshData } from "../../src/world/mesh.ts";
import { heightPlane, meshTriangle, PavementMeshWriter, plan, triangleIndex, triangulate } from "./pavement-geometry.ts";
import { partitionPatch, patchArea, planeHeight, type PlanPoint } from "./pavement-overlay.ts";
import type { Point } from "./select-pavement-source.ts";

const BASE_PAVEMENT_SHA256 = "3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62";
const TERRAIN_SHA256 = "c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773";
const digest = (mesh: MeshData): string => createHash("sha256").update(encodeMesh(mesh)).digest("hex");
// Authored record: exact decoded wall endpoints, actual top-edge vertices, and
// source-owned adjacent face planes. Nothing is selected by maximum runtime Y.
const FRONTAGE = {
  wallA: [-15.563147818075606,15.098983817735704,-28.30105565962874],
  wallB: [1.3568167911358273,15.09811684288055,-30.31105059489345],
  seam: [
    [-13.779376199254505,15.406009135455841,-27.729499761881275],
    [-12.536043167114258,15.419140815734863,-27.914043426513672],
    [-12.536044120788574,15.419140815734863,-27.914043426513672],
    [-10.682999610900879,15.438712120056152,-28.189085006713867],
    [-8.182263374328613,15.46512508392334,-28.56026268005371],
    [-7.001600742340088,15.477594375610352,-28.735504150390625],
    [-5.683000087738037,15.491521835327148,-28.93121910095215],
    [-5.543000221252441,15.493000030517578,-28.95199966430664],
    [-5.542999744415283,15.493000030517578,-28.95199966430664],
    [-3.795076370239258,15.518566131591797,-29.17307472229004],
    [-3.1611547470092773,15.527838706970215,-29.253252029418945],
    [-0.6830000281333923,15.564085960388184,-29.566686630249023],
    [-0.2767351812876815,15.570028182267055,-29.618070420404155]
  ],
  westPlane: [0.011855454477937262,0.00871388819731564,15.81100047076414],
  eastPlane: [0.011350313563506981,-0.025902886364053083,14.805975700926474],
  westSeamEnd: 7,
  sources: ["poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","poly_ca58f7a0-b210-4996-a016-ab342a20354e"],
  edges: [
    {"triangle":424696,"edge":0,"source":"poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","points":[[-13.779376199254505,15.406009135455841,-27.729499761881275],[-12.536043167114258,15.419140815734863,-27.914043426513672]]},
    {"triangle":424700,"edge":2,"source":"poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","points":[[-12.536044120788574,15.419140815734863,-27.914043426513672],[-10.682999610900879,15.438712120056152,-28.189085006713867]]},
    {"triangle":424699,"edge":1,"source":"poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","points":[[-10.682999610900879,15.438712120056152,-28.189085006713867],[-8.182263374328613,15.46512508392334,-28.56026268005371]]},
    {"triangle":424703,"edge":1,"source":"poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","points":[[-8.182263374328613,15.46512508392334,-28.56026268005371],[-7.001600742340088,15.477594375610352,-28.735504150390625]]},
    {"triangle":424704,"edge":1,"source":"poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","points":[[-7.001600742340088,15.477594375610352,-28.735504150390625],[-5.683000087738037,15.491521835327148,-28.93121910095215]]},
    {"triangle":424707,"edge":0,"source":"poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7","points":[[-5.683000087738037,15.491521835327148,-28.93121910095215],[-5.543000221252441,15.493000030517578,-28.95199966430664]]},
    {"triangle":440583,"edge":0,"source":"poly_ca58f7a0-b210-4996-a016-ab342a20354e","points":[[-5.542999744415283,15.493000030517578,-28.95199966430664],[-3.795076370239258,15.518566131591797,-29.17307472229004]]},
    {"triangle":440613,"edge":2,"source":"poly_ca58f7a0-b210-4996-a016-ab342a20354e","points":[[-3.795076370239258,15.518566131591797,-29.17307472229004],[-3.1611547470092773,15.527838706970215,-29.253252029418945]]},
    {"triangle":440600,"edge":1,"source":"poly_ca58f7a0-b210-4996-a016-ab342a20354e","points":[[-3.1611547470092773,15.527838706970215,-29.253252029418945],[-0.6830000281333923,15.564085960388184,-29.566686630249023]]},
    {"triangle":440588,"edge":1,"source":"poly_ca58f7a0-b210-4996-a016-ab342a20354e","points":[[-0.6830000281333923,15.564085960388184,-29.566686630249023],[-0.2767351812876815,15.570028182267055,-29.618070420404155]]}
  ],
  affectedTriangles: [264842,264843,264844,264849,265509,265511,265513,265782,265783,266313,266315,266317,266586,266587,267117,267119,267121,267390,267391,267921,267923,267925,268194,268195,268725,268727,268729,268998,268999,269529,269531,269533,269802,269803,404752,404753,404755,404756,404757,404764,404765,404766,404769,404770,404771,424693,424694,424708,424709,440581,440584,440585,440612]
};
const hashError = (name: string, actual: string): Error => new Error(`TSUTAYA frontage ${name} has SHA-256 ${actual}; restore the reviewed C5 input or review its authored contour before publishing.`);

/** Replace only the supplied faces. Valid replacement faces occupy those slots,
 * then append; every other face ordinal and the original vertex prefix survive.
 * Outside fragments retain their original plane and normal before Float32.
 * Quantization loss is reported explicitly, never hidden with tombstones. */
export function replaceFrontageFaces(original: MeshData, contour: Point[], authored: MeshData, affected: readonly number[]) {
  const masks = triangulate(contour).map(plan), writer = new PavementMeshWriter();
  const normalY = ([a, b, c]: Point[]): number => (b![2] - a![2]) * (c![0] - a![0]) - (b![0] - a![0]) * (c![2] - a![2]);
  const ledger: { triangle: number; removedAreaM2: number; retainedAreaM2: number; residualM2: number; collapsedAreaM2: number; encodingAreaChangeM2: number }[] = [];
  let maximumEncodedHeightResidualM = 0;
  for (const triangle of affected) {
    const points = meshTriangle(original, triangle * 3), ring = plan(points), plane = heightPlane(points);
    let remainder = [ring], removed = 0;
    for (const mask of masks) {
      const next: PlanPoint[][] = [];
      for (const part of remainder) { const split = partitionPatch(part, mask); next.push(...split.outside); removed += patchArea(split.inside); }
      remainder = next;
    }
    if (removed <= 1e-12) throw new Error(`TSUTAYA frontage face ${triangle} no longer intersects its reviewed contour; restore the input or review the affected-face record.`);
    const retained = remainder.reduce((sum, r) => sum + patchArea(r), 0), residual = Math.abs(patchArea(ring) - removed - retained);
    if (residual > 1e-9) throw new Error(`TSUTAYA frontage face ${triangle} lost ${residual} m² during subdivision; repair the contour before publishing.`);
    let collapsed = 0, areaChange = 0;
    const vertex = original.indices[triangle * 3]!, normal: Point = [original.normals[vertex * 3]!, original.normals[vertex * 3 + 1]!, original.normals[vertex * 3 + 2]!];
    for (const rest of remainder) for (let i = 1; i + 1 < rest.length; i++) {
      const raw = [rest[0]!, rest[i + 1]!, rest[i]!], ps: Point[] = raw.map((p) => [p[0], planeHeight(plane, p), p[1]]);
      const rounded: Point[] = ps.map((p) => p.map(Math.fround) as Point), area = patchArea(raw), roundedArea = patchArea(plan(rounded));
      areaChange += Math.abs(area - roundedArea);
      if (roundedArea === 0) { collapsed += area; continue; }
      maximumEncodedHeightResidualM = Math.max(maximumEncodedHeightResidualM, ...rounded.map((p) => Math.abs(p[1] - planeHeight(plane, [p[0], p[2]]))));
      writer.triangle(ps, normal);
      // Rounding a narrow fragment can reverse its sign. Swap only indices,
      // preserving vertex insertion order and the original face's handedness.
      if (Math.sign(normalY(rounded)) !== Math.sign(normalY(points))) {
        const end = writer.indices.length;
        [writer.indices[end - 2], writer.indices[end - 1]] = [writer.indices[end - 1]!, writer.indices[end - 2]!];
      }
    }
    ledger.push({ triangle, removedAreaM2: removed, retainedAreaM2: retained, residualM2: residual, collapsedAreaM2: collapsed, encodingAreaChangeM2: areaChange });
  }
  const outsideTriangles = writer.indices.length / 3;
  for (let i = 0; i < authored.indices.length; i += 3) {
    const v = authored.indices[i]!;
    writer.triangle(meshTriangle(authored, i), [authored.normals[v * 3]!, authored.normals[v * 3 + 1]!, authored.normals[v * 3 + 2]!]);
  }
  if (writer.indices.length / 3 < affected.length) throw new Error("TSUTAYA frontage has too few valid replacement faces to retain unaffected ordinals; review the index mapping instead of emitting tombstones.");
  const positions = new Float32Array(original.positions.length + writer.positions.length), normals = new Float32Array(positions.length);
  positions.set(original.positions); positions.set(writer.positions, original.positions.length); normals.set(original.normals); normals.set(writer.normals, original.normals.length);
  const base = original.header.vertexCount, replacement = writer.indices.map((i) => i + base);
  const indices = new Uint32Array(original.indices.length + replacement.length - affected.length * 3); indices.set(original.indices);
  affected.forEach((id, i) => indices.set(replacement.slice(i * 3, i * 3 + 3), id * 3)); indices.set(replacement.slice(affected.length * 3), original.indices.length);
  const mesh: MeshData = { positions, normals, indices, header: { ...original.header, vertexCount: positions.length / 3, triangleCount: indices.length / 3, note: `${original.header.note} Authored TSUTAYA wall-to-published-edge infill; reviewed local subtraction only. Not surveyed pavement.` } };
  return { mesh, ledger, outsideTriangles, maximumEncodedHeightResidualM, unchangedTriangles: original.header.triangleCount - affected.length, preservedVertexPrefix: original.header.vertexCount };
}

function endClosure(writer: PavementMeshWriter, terrain: MeshData, a: Point, b: Point): number {
  const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz), normal: Point = [dz / length, 0, -dx / length];
  const candidates = triangleIndex(terrain)([[a[0], a[2]], [b[0], b[2]]]);
  let covered = 0;
  for (const ground of candidates) {
    let lo = 0, hi = 1;
    for (let i = 0; i < ground.ring.length; i++) {
      const p = ground.ring[i]!, q = ground.ring[(i + 1) % ground.ring.length]!;
      const f = (t: number): number => (q[0] - p[0]) * (a[2] + dz * t - p[1]) - (q[1] - p[1]) * (a[0] + dx * t - p[0]);
      const fa = f(0), fb = f(1);
      if (fa < 0 && fb < 0) { hi = -1; break; }
      if (fa * fb < 0) { const t = fa / (fa - fb); if (fa < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t); }
    }
    if (hi - lo < 1e-10) continue;
    const top = (t: number): Point => [a[0] + dx * t, a[1] + (b[1] - a[1]) * t, a[2] + dz * t];
    const p = top(lo), q = top(hi), r: Point = [q[0], planeHeight(ground.plane, [q[0], q[2]]), q[2]], s: Point = [p[0], planeHeight(ground.plane, [p[0], p[2]]), p[2]];
    if (p[1] <= s[1] || q[1] <= r[1]) throw new Error("TSUTAYA frontage end is not above its pinned terrain; review the authored grade before publishing.");
    writer.triangle([p, q, r], normal); writer.triangle([p, r, s], normal); covered += hi - lo;
  }
  if (Math.abs(covered - 1) > 1e-8) throw new Error(`TSUTAYA frontage end terrain coverage is ${covered}; require exactly one complete terrain join before publishing.`);
  return covered;
}

export function buildFrontageInfill(original: MeshData, terrain: MeshData) {
  const actual = digest(original), groundHash = digest(terrain);
  if (actual !== BASE_PAVEMENT_SHA256) throw hashError("pavement", actual);
  if (groundHash !== TERRAIN_SHA256) throw hashError("terrain", groundHash);
  const seam = FRONTAGE.seam.map((p) => [...p] as Point), a = FRONTAGE.wallA, b = FRONTAGE.wallB;
  const length = Math.hypot(b[0]! - a[0]!, b[2]! - a[2]!), ux = (b[0]! - a[0]!) / length, uz = (b[2]! - a[2]!) / length;
  const west = FRONTAGE.westPlane as [number, number, number], east = FRONTAGE.eastPlane as [number, number, number];
  const atWall = (t: number, plane: readonly [number, number, number]): Point => { const x = a[0]! + ux * t, z = a[2]! + uz * t; return [x, planeHeight(plane, [x, z]), z]; };
  const diff = west.map((v, i) => v - east[i]!);
  const creaseT = -(diff[0]! * a[0]! + diff[1]! * a[2]! + diff[2]!) / (diff[0]! * ux + diff[1]! * uz);
  if (creaseT <= .1 * length || creaseT >= .9 * length) throw new Error("TSUTAYA frontage adjacent-plane intersection left its reviewed wall interval; review the authored grade.");
  const start = atWall(.1 * length, west), end = atWall(.9 * length, east), crease = atWall(creaseT, west), writer = new PavementMeshWriter();
  // The two adjacent grades meet along one shared crease, without a step or an
  // averaged wall-height wedge. Boundary vertices retain their decoded heights.
  const joint = FRONTAGE.westSeamEnd;
  for (const ring of [[start, ...seam.slice(0, joint + 1), crease], [crease, ...seam.slice(joint), end]]) for (const points of triangulate(ring)) {
    if (patchArea(plan(points.map((p) => p.map(Math.fround) as Point))) > 0) writer.triangle([...points].reverse());
  }
  const topTriangles = writer.indices.length / 3;
  endClosure(writer, terrain, seam[0]!, start); endClosure(writer, terrain, end, seam.at(-1)!);
  const authored = writer.finish({ ...original.header, name: "authored-tsutaya-frontage" }), contour = [start, ...seam, end];
  const result = replaceFrontageFaces(original, contour, authored, FRONTAGE.affectedTriangles);
  const collapsed = result.ledger.reduce((sum, r) => sum + r.collapsedAreaM2, 0), encodingAreaChange = result.ledger.reduce((sum, r) => sum + r.encodingAreaChangeM2, 0);
  if (collapsed > 2e-6 || encodingAreaChange > 2e-5 || result.maximumEncodedHeightResidualM > 1e-6) throw new Error("TSUTAYA frontage subdivision exceeded its measured Float32 bound; review the encoded outside fragments before publishing.");
  return { ...result, report: { kind: "authored-tsutaya-frontage-v1", authority: "Authored local presentation extension, not PLATEAU or survey geometry", basePavementSha256: actual, terrainSha256: groundHash, buildingId: "bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27", buildingTileSha256: "5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b", parent: "tran_f2a5948b-23c4-4932-83a2-a5c3591bf06c", publishedSources: FRONTAGE.sources, ownedJoinEdges: FRONTAGE.edges, contour, wallCrease: crease, areaM2: triangulate(contour).reduce((sum, t) => sum + patchArea(plan(t)), 0), topTriangles, endTriangles: authored.header.triangleCount - topTriangles, affectedFaces: result.ledger, preservedVertexPrefix: result.preservedVertexPrefix, unchangedTriangleOrdinals: result.unchangedTriangles, replacementSlots: FRONTAGE.affectedTriangles, outsideTriangles: result.outsideTriangles, collapsedOutsideAreaM2: collapsed, outsideEncodingAreaChangeM2: encodingAreaChange, maximumEncodedOutsideHeightResidualM: result.maximumEncodedHeightResidualM } };
}

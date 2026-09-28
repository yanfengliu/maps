/** Experimental static source packing. No oracle geometry or normal is accepted. */
export type Vec3 = readonly [number, number, number];
export interface Influence { readonly joint: number; readonly weight: number; readonly point: Vec3 }
export interface Vertex { readonly id: number; readonly idle: Vec3; readonly influences: readonly Influence[] }
export interface Source { readonly capacity: number; readonly vertices: readonly Vertex[]; readonly triangles: readonly number[]; readonly referencePalette: readonly number[] }
export type Mutation =
  | { readonly kind: 'idle-offset'; readonly vertexId: number; readonly delta: Vec3 }
  | { readonly kind: 'permutation'; readonly vertexId: number; readonly order: readonly number[] }
  | { readonly kind: 'omit-ordinal'; readonly ordinal: number }
  | { readonly kind: 'reverse-face'; readonly faceIndex: number }
  | { readonly kind: 'omit-face-incidences'; readonly faceIndex: number };
export interface Packed {
  readonly version: 'differential-edges-251'; readonly capacity: number; readonly selectedIds: readonly number[];
  readonly triangles: readonly number[]; readonly referencePalette: readonly number[]; readonly mutations: readonly Mutation[];
  readonly vertexHeader: Float32Array; readonly vertexBase: Float32Array; readonly vertexTerms: Float32Array;
  readonly triangleHeader: Float32Array; readonly edgeBase: Float32Array; readonly edgeTerms: Float32Array; readonly incidence: Float32Array;
  readonly vertexCount: number; readonly triangleCount: number; readonly originalInfluenceCount: number; readonly retainedInfluenceCount: number;
  readonly vertexTermCount: number; readonly edgeTermCount: number; readonly incidenceCount: number;
  readonly maxVertexTerms: number; readonly maxEdgeTerms: number; readonly maxIncidences: number;
}
const axis = [0, 1, 2] as const;
const check = (ok: boolean, message: string) => { if (!ok) throw Error(message); };
function finite3(p: readonly number[], name: string): void { check(p.length === 3 && p.every(Number.isFinite), name + ' requires three finite components'); }
/** Actual affine homogeneous W is retained, including W one ulp below one. */
export function affine(palette: readonly number[], label: string): void {
  check(palette.length === 53 * 16 && palette.every(Number.isFinite), label + ' requires 53 finite column-major matrices');
  for (let j = 0; j < 53; j++) { const k = j * 16; check(palette[k + 3] === 0 && palette[k + 7] === 0 && palette[k + 11] === 0 && palette[k + 15]! > 0, label + ' joint ' + j + ' requires affine [0,0,0,W] with positive W'); }
}
function sourceCheck(source: Source): void {
  check(Number.isInteger(source.capacity) && source.capacity > 0 && source.capacity < 2 ** 24, 'Source capacity must be a positive exact Float32 integer');
  affine(source.referencePalette, 'Reference palette');
  const selected = new Set<number>();
  for (const v of source.vertices) {
    check(Number.isInteger(v.id) && v.id >= 0 && v.id < source.capacity && !selected.has(v.id), 'Source VAT ID is duplicate or outside capacity: ' + v.id); selected.add(v.id); finite3(v.idle, 'Idle VAT ' + v.id);
    check(v.influences.length > 0, 'Source VAT ' + v.id + ' has no influences');
    let sum = 0; for (const term of v.influences) { check(Number.isInteger(term.joint) && term.joint >= 0 && term.joint < 53 && Number.isFinite(term.weight) && term.weight > 0, 'Source VAT ' + v.id + ' has invalid complete influence'); finite3(term.point, 'Inverse-bind VAT ' + v.id); sum += term.weight; }
    check(Math.abs(sum - 1) <= 1e-10, 'Source VAT ' + v.id + ' requires all normalized weights');
  }
  check(source.vertices.length > 0 && source.triangles.length > 0 && source.triangles.length % 3 === 0, 'Source requires selected vertices and complete triangles');
  for (let k = 0; k < source.triangles.length; k++) check(Number.isInteger(source.triangles[k]) && selected.has(source.triangles[k]!), 'Source triangle index ' + k + ' refers to an absent VAT ID');
  for (let k = 0; k < source.triangles.length; k += 3) check(new Set(source.triangles.slice(k, k + 3)).size === 3, 'Source triangle ' + k / 3 + ' repeats a VAT ID');
}
function referenceContribution(term: Influence, palette: readonly number[]): number[] {
  const p = term.point, j = term.joint * 16, reciprocal = 1 / palette[j + 15]!;
  return axis.map(a => ((palette[j + a]! * p[0] + palette[j + 4 + a]! * p[1] + palette[j + 8 + a]! * p[2] + palette[j + 12 + a]!) * reciprocal) * term.weight);
}
type Coefficients = Map<number, number[]>;
function coefficients(terms: readonly Influence[]): Coefficients {
  const result: Coefficients = new Map();
  for (const term of terms) { const row = result.get(term.joint) ?? [0, 0, 0, 0], h = [...term.point.map(p => p * term.weight), term.weight]; result.set(term.joint, row.map((v, a) => v + h[a]!)); }
  return result;
}
/** Mutations alter this sole source preparation before either branch is packed. */
export function prepare(source: Source, mutations: readonly Mutation[] = []): Packed {
  sourceCheck(source);
  const vertices = source.vertices.map(v => ({ id: v.id, idle: [...v.idle], influences: v.influences.map(t => ({ joint: t.joint, weight: t.weight, point: [...t.point] as unknown as Vec3 })) }));
  const byId = new Map(vertices.map(v => [v.id, v])), triangles = [...source.triangles], omittedFaces = new Set<number>();
  const omissions: number[] = [];
  for (const m of mutations) {
    if (m.kind === 'idle-offset') { const v = byId.get(m.vertexId); check(!!v, 'Idle-offset VAT ID is absent: ' + m.vertexId); finite3(m.delta, 'Idle-offset delta'); for (const a of axis) v!.idle[a]! += m.delta[a]; }
    else if (m.kind === 'permutation') { const v = byId.get(m.vertexId); check(!!v, 'Permutation VAT ID is absent: ' + m.vertexId); check(m.order.length === v!.influences.length && new Set(m.order).size === m.order.length && m.order.every(k => Number.isInteger(k) && k >= 0 && k < m.order.length), 'Permutation must include each original influence exactly once'); v!.influences = m.order.map(k => v!.influences[k]!); }
    else if (m.kind === 'omit-ordinal') { check(Number.isInteger(m.ordinal) && m.ordinal >= 0 && !omissions.includes(m.ordinal) && vertices.some(v => v.influences.length > m.ordinal), 'Omission requires one present source ordinal'); omissions.push(m.ordinal); }
    else if (m.kind === 'reverse-face' || m.kind === 'omit-face-incidences') { check(Number.isInteger(m.faceIndex) && m.faceIndex >= 0 && m.faceIndex < triangles.length / 3, 'Topology control requires a present source face index'); if (m.kind === 'reverse-face') { const k = m.faceIndex * 3; [triangles[k + 1], triangles[k + 2]] = [triangles[k + 2]!, triangles[k + 1]!]; } else { check(!omittedFaces.has(m.faceIndex), 'Face incidence omission is duplicated'); omittedFaces.add(m.faceIndex); } }
    else throw Error('Unsupported source mutation');
  }
  const records = vertices.map(v => {
    const base = [...v.idle], retained = v.influences.filter((term, ordinal) => { if (!omissions.includes(ordinal)) return true; const ref = referenceContribution(term, source.referencePalette); for (const a of axis) base[a]! -= ref[a]!; return false; });
    return { id: v.id, base, coefficients: coefficients(retained), terms: retained, retained: retained.length };
  });
  const recordById = new Map(records.map(v => [v.id, v]));
  const vertexHeader = new Float32Array(source.capacity * 4), vertexBase = new Float32Array(source.capacity * 4), vertexTerms: number[] = [], triangleHeader: number[] = [], edgeBase: number[] = [], edgeTerms: number[] = [];
  const incident = new Map(vertices.map(v => [v.id, [] as number[]])); let maxVertexTerms = 0, maxEdgeTerms = 0, maxIncidences = 0;
  // Keep original source ordinal in this GPU loop. A material ninth-slot positive
  // must fail if this loop is accidentally truncated to eight influences.
  for (const v of records) { vertexHeader.set([vertexTerms.length / 8, v.terms.length, 0, 0], v.id * 4); vertexBase.set([...v.base, 1], v.id * 4); for (const term of v.terms) vertexTerms.push(...term.point.map(p => p * term.weight), term.weight, term.joint, 0, 0, 0); maxVertexTerms = Math.max(maxVertexTerms, v.terms.length); }
  for (let i = 0; i < triangles.length; i += 3) {
    const ids = triangles.slice(i, i + 3), a = recordById.get(ids[0]!)!, edgeMeta: number[] = [], bases: number[] = [];
    for (const id of ids.slice(1)) { const b = recordById.get(id)!, joints = [...new Set([...a.coefficients.keys(), ...b.coefficients.keys()])].sort((x, y) => x - y); edgeMeta.push(edgeTerms.length / 8, joints.length); bases.push(...axis.map(k => b.base[k]! - a.base[k]!), 0); for (const joint of joints) { const ah = a.coefficients.get(joint) ?? [0, 0, 0, 0], bh = b.coefficients.get(joint) ?? [0, 0, 0, 0]; edgeTerms.push(...bh.map((x, k) => x - ah[k]!), joint, 0, 0, 0); } maxEdgeTerms = Math.max(maxEdgeTerms, joints.length); }
    triangleHeader.push(...edgeMeta, ...ids, 0); edgeBase.push(...bases);
    if (!omittedFaces.has(i / 3)) for (const id of ids) incident.get(id)!.push(i / 3);
  }
  const incidence: number[] = []; for (const v of records) { const faces = incident.get(v.id)!; check(faces.length > 0 || omittedFaces.size > 0, 'Selected VAT ID has no source triangle: ' + v.id); vertexHeader[v.id * 4 + 2] = incidence.length / 4; vertexHeader[v.id * 4 + 3] = faces.length; for (const face of faces) incidence.push(face, 0, 0, 0); maxIncidences = Math.max(maxIncidences, faces.length); }
  const arrays = [vertexHeader, vertexBase, Float32Array.from(vertexTerms), Float32Array.from(triangleHeader), Float32Array.from(edgeBase), Float32Array.from(edgeTerms), Float32Array.from(incidence)];
  for (const a of arrays) check(a.every(Number.isFinite) && a.length / 4 < 2 ** 24, 'Packed source resource exceeds finite Float32 or exact index range');
  return Object.freeze({ version: 'differential-edges-251', capacity: source.capacity, selectedIds: Object.freeze(vertices.map(v => v.id)), triangles: Object.freeze(triangles), referencePalette: Object.freeze([...source.referencePalette]), mutations: Object.freeze([...mutations]), vertexHeader, vertexBase, vertexTerms: arrays[2]!, triangleHeader: arrays[3]!, edgeBase: arrays[4]!, edgeTerms: arrays[5]!, incidence: arrays[6]!, vertexCount: vertices.length, triangleCount: triangles.length / 3, originalInfluenceCount: source.vertices.reduce((n, v) => n + v.influences.length, 0), retainedInfluenceCount: records.reduce((n, v) => n + v.retained, 0), vertexTermCount: vertexTerms.length / 8, edgeTermCount: edgeTerms.length / 8, incidenceCount: incidence.length / 4, maxVertexTerms, maxEdgeTerms, maxIncidences });
}
export interface Pose { readonly palette: readonly number[]; readonly yaw: number; readonly body: Vec3; readonly origin: Vec3; readonly scale: number }
export function packPose(pose: Pose, referencePalette: readonly number[]) {
  const allowed = ['palette', 'yaw', 'body', 'origin', 'scale']; check(Object.keys(pose).every(k => allowed.includes(k)), 'Outer transform supports only proper yaw, body/origin translation and positive uniform scalar scale');
  check(Number.isFinite(pose.yaw) && Number.isFinite(pose.scale) && pose.scale > 0, 'Outer transform requires finite yaw and positive uniform scalar scale'); finite3(pose.body, 'Body'); finite3(pose.origin, 'Origin'); affine(pose.palette, 'Current palette'); affine(referencePalette, 'Reference palette');
  check([...pose.body, ...pose.origin, pose.scale].every(v => Number.isFinite(Math.fround(v))) && Math.fround(pose.scale) > 0, 'Outer transform exceeds finite positive Float32 storage');
  const delta = new Float32Array(53 * 16); for (let j = 0; j < 53; j++) { const k = j * 16, cw = pose.palette[k + 15]!, rw = referencePalette[k + 15]!; for (let a = 0; a < 16; a++) delta[k + a] = pose.palette[k + a]! / cw - referencePalette[k + a]! / rw; }
  check(delta.every(Number.isFinite), 'Palette delta exceeds finite Float32 range');
  const rotation = [Math.sin(pose.yaw / 2), Math.cos(pose.yaw / 2)] as const; check(Math.abs(rotation[0] ** 2 + rotation[1] ** 2 - 1) <= 1e-12, 'Yaw quaternion is not a proper rotation');
  return { delta, rotation, body: [...pose.body], origin: [...pose.origin], scale: pose.scale };
}

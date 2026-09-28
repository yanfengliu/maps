/** Review142's bounded authored-plan admission. Never apply to source shells. */
import assert from "node:assert/strict";
import { type Face, type P3, wrap } from "./rail-geometry.ts";

const bits = new DataView(new ArrayBuffer(4));
function exact(value: number): bigint {
  assert.equal(value, Math.fround(value), "Rail plan predicates require stored Float32 coordinates.");
  assert.ok(Number.isFinite(value));
  bits.setFloat32(0, value);
  const b = bits.getUint32(0), e = (b >>> 23) & 255, m = (b & 0x7fffff) | (e ? 0x800000 : 0);
  return (BigInt(m) << BigInt(e ? e - 1 : 0)) * (b >>> 31 ? -1n : 1n);
}
const key = (p: P3): string => p.join(",");
export function storedOrientation(a: P3, b: P3, c: P3): bigint {
  const x = [a, b, c].map(p => [exact(p[0]), exact(p[2])] as const);
  const [A, B, C] = x as [readonly [bigint, bigint], readonly [bigint, bigint], readonly [bigint, bigint]];
  return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
}
interface PlanFace { source: number; material: number; points: P3[] }
const signedArea = (faces: PlanFace[]): bigint => faces.reduce((sum, f) => sum + storedOrientation(f.points[0]!, f.points[1]!, f.points[2]!), 0n);
function boundary(faces: PlanFace[]): [P3, P3][] {
  const edges = new Map<string, [P3, P3][]>();
  for (const f of faces) for (let i = 0; i < 3; i++) {
    const a = f.points[i]!, b = f.points[(i + 1) % 3]!, ak = key(a), bk = key(b), k = ak < bk ? ak + "|" + bk : bk + "|" + ak;
    const rows = edges.get(k) ?? []; rows.push([a, b]); edges.set(k, rows);
  }
  assert.ok([...edges.values()].every(r => r.length === 1 || r.length === 2 && key(r[0]![0]) === key(r[1]![1]) && key(r[0]![1]) === key(r[1]![0])), "Rail plan cavity has a nonmanifold or reversed internal edge.");
  return [...edges.values()].filter(r => r.length === 1).map(r => r[0]!);
}
function ordered(edges: [P3, P3][]): P3[] {
  const map = new Map(edges.map(([a, b]) => [key(a), b]));
  assert.equal(map.size, edges.length, "Rail plan cavity branches at a boundary vertex.");
  const start = edges[0]![0], ring = [start]; let current = edges[0]![1];
  while (key(current) !== key(start)) { assert.ok(ring.length <= edges.length); ring.push(current); const next = map.get(key(current)); assert.ok(next); current = next; }
  assert.equal(ring.length, edges.length, "Rail plan cavity has multiple boundary rings."); return ring;
}
const opposite = (a: bigint, b: bigint): boolean => a < 0n && b > 0n || a > 0n && b < 0n;
const crosses = (a: P3, b: P3, c: P3, d: P3): boolean => opposite(storedOrientation(a, b, c), storedOrientation(a, b, d)) && opposite(storedOrientation(c, d, a), storedOrientation(c, d, b));
function ears(ring: P3[], source: number, material: number): PlanFace[] {
  for (let i = 0; i < ring.length; i++) for (let j = i + 2; j < ring.length; j++) if (!(i === 0 && j === ring.length - 1)) assert.ok(!crosses(ring[i]!, ring[(i + 1) % ring.length]!, ring[j]!, ring[(j + 1) % ring.length]!), "Rail plan cavity boundary crosses itself.");
  const ids = ring.map((_, i) => i), faces: PlanFace[] = [];
  while (ids.length > 3) {
    let found = false;
    for (let j = 0; j < ids.length; j++) {
      const a = ids[(j - 1 + ids.length) % ids.length]!, b = ids[j]!, c = ids[(j + 1) % ids.length]!, A = ring[a]!, B = ring[b]!, C = ring[c]!;
      if (storedOrientation(A, B, C) <= 0n) continue;
      if (ids.some(k => k !== a && k !== b && k !== c && storedOrientation(A, B, ring[k]!) >= 0n && storedOrientation(B, C, ring[k]!) >= 0n && storedOrientation(C, A, ring[k]!) >= 0n)) continue;
      faces.push({ source, material, points: [A, B, C] }); ids.splice(j, 1); found = true; break;
    }
    assert.ok(found, "Rail stored-plan cavity has no positive ear retaining every boundary vertex.");
  }
  const points = ids.map(i => ring[i]!); assert.ok(storedOrientation(points[0]!, points[1]!, points[2]!) > 0n);
  faces.push({ source, material, points }); return faces;
}
export function admitStoredPlan(input: readonly Face[]): { faces: Face[]; changes: unknown[]; pairsChecked: number } {
  assert.ok(input.length > 0, "Rail plan generation is absent.");
  assert.ok(input.every(f => f.vertices.length === 3 && f.vertices.every(v => v.p[1] === 0 && v.p.every(Number.isFinite))), "Stored plan admission is restricted to authored horizontal triangles.");
  const original = input.map(f => ({ source: f.source, material: f.material, points: f.vertices.map(v => v.p) }));
  let faces = original; const changes: unknown[] = [];
  for (let iteration = 0; iteration < 20; iteration++) {
    const bad = faces.find(f => storedOrientation(f.points[0]!, f.points[1]!, f.points[2]!) <= 0n); if (!bad) break;
    const candidates = bad.points.map(p => ({ p, indices: faces.flatMap((f, i) => f.points.some(q => key(p) === key(q)) ? [i] : []) })).sort((a, b) => b.indices.length - a.indices.length);
    let fixed = false; const errors: string[] = [];
    for (const candidate of candidates) try {
      const old = candidate.indices.map(i => faces[i]!); assert.equal(new Set(old.map(f => `${f.source}/${f.material}`)).size, 1);
      const oldBoundary = boundary(old), ring = ordered(oldBoundary), replacement = ears(ring, old[0]!.source, old[0]!.material);
      assert.equal(signedArea(old), signedArea(replacement));
      assert.deepEqual(oldBoundary.map(([a, b]) => key(a) + "|" + key(b)).sort(), boundary(replacement).map(([a, b]) => key(a) + "|" + key(b)).sort());
      assert.ok(!ring.some(p => key(p) === key(candidate.p)), "Rail plan repair would remove a boundary vertex.");
      const removed = new Set(candidate.indices); changes.push({ old, replacement, boundary: ring, removedInteriorVertex: candidate.p, exactAreaAndBoundaryUnchanged: true });
      faces = [...faces.filter((_, i) => !removed.has(i)), ...replacement]; fixed = true; break;
    } catch (error) { errors.push(String(error)); }
    assert.ok(fixed, `Rail plan could not retessellate its exact unchanged boundary: ${errors.join("; ")}`);
  }
  assert.ok(faces.every(f => storedOrientation(f.points[0]!, f.points[1]!, f.points[2]!) > 0n), "Rail plan retains a nonpositive stored triangle.");
  assert.equal(signedArea(original), signedArea(faces));
  const grid = new Map<string, number[]>(), boxes = faces.map(f => [Math.min(...f.points.map(p => p[0])), Math.max(...f.points.map(p => p[0])), Math.min(...f.points.map(p => p[2])), Math.max(...f.points.map(p => p[2]))]);
  for (const [i, b] of boxes.entries()) for (let x = Math.floor(b[0]! / 2); x <= Math.floor(b[1]! / 2); x++) for (let z = Math.floor(b[2]! / 2); z <= Math.floor(b[3]! / 2); z++) { const k = `${x},${z}`, rows = grid.get(k) ?? []; rows.push(i); grid.set(k, rows); }
  const checked = new Set<string>(); let pairsChecked = 0;
  for (const rows of grid.values()) for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i]!, b = rows[j]!, k = `${a}:${b}`; if (checked.has(k)) continue; checked.add(k);
    const A = boxes[a]!, B = boxes[b]!; if (A[0]! >= B[1]! || A[1]! <= B[0]! || A[2]! >= B[3]! || A[3]! <= B[2]!) continue;
    const u = faces[a]!.points, v = faces[b]!.points; pairsChecked++;
    // Shared-edge triangles still need the exact positivity test above. Identical
    // triangles share three vertices and are rejected by this explicit control.
    const shared = u.filter(p => v.some(q => key(p) === key(q))).length;
    assert.notEqual(shared, 3, `Rail plan duplicates stored triangles ${a}/${b}.`);
    if (shared === 2) { const edge = u.filter(p => v.some(q => key(p) === key(q))), uOther = u.find(p => !edge.includes(p))!, vOther = v.find(p => !edge.some(q => key(p) === key(q)))!; assert.ok(opposite(storedOrientation(edge[0]!, edge[1]!, uOther), storedOrientation(edge[0]!, edge[1]!, vOther)), `Rail plan triangles ${a}/${b} overlap on the same side of a shared edge.`); continue; }
    const inside = (p: P3, t: P3[]): boolean => t.every((a, i) => storedOrientation(a, t[(i + 1) % 3]!, p) > 0n);
    assert.ok(!u.some(p => inside(p, v)) && !v.some(p => inside(p, u)) && !u.some((p, i) => v.some((q, j) => crosses(p, u[(i + 1) % 3]!, q, v[(j + 1) % 3]!))), `Rail plan triangles ${a}/${b} overlap in their interiors.`);
  }
  return { faces: faces.map(f => ({ source: f.source, material: f.material, vertices: wrap(f.points) })), changes, pairsChecked };
}

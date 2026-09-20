/**
 * Bounded walking support construction, not a sole-contact certificate.
 * Queries read byte-bound source triangles. A selected interval keeps its level;
 * a missing segment is reported, never filled by paint tolerance or terrain.
 * Exact segment coverage below concerns the contact origin, not the whole sole.
 */
import { decodeMesh, type MeshData } from "../../world/mesh.ts";
import type { WorldPoint } from "../../world/network-data.ts";
import { indexOsm, surfaceExclusion, WALKABLE, type OsmDocument } from "../../../tools/network/osm.ts";

export type WalkingMesh = "roads" | "pavements" | "terrain";
export interface BoundBytes { readonly bytes: Uint8Array; readonly sha256: string }
export interface WalkingSurfaceSource {
  readonly occurrence: number;
  readonly edgeId: string;
  readonly sourceWayId: number | null;
  readonly sourceY: number;
}
export interface WalkingSurfaceRef {
  readonly mesh: WalkingMesh;
  readonly triangle: number;
  readonly sha256: string;
}
export interface WalkingContact {
  readonly position: Readonly<WorldPoint>;
  readonly normal: Readonly<WorldPoint>;
  readonly surface: WalkingSurfaceRef;
}
export interface WalkingSurfaceRefusal {
  readonly reason: "missing-support" | "ambiguous-level" | "source-ground-unverified" | "level-change" | "ground-covered" | "foreign-interval";
  readonly source: WalkingSurfaceSource;
  readonly position: Readonly<WorldPoint>;
  readonly detail: string;
  readonly candidates: readonly WalkingContact[];
  readonly previous?: WalkingContact;
}
export type SurfaceResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly refusal: WalkingSurfaceRefusal };
export interface WalkingSurfaceInterval {
  readonly source: WalkingSurfaceSource;
  readonly kind: "road-pavement" | "source-ground";
  readonly anchor: WalkingContact;
  readonly evidence: Readonly<{ networkSha256: string; sourceFactsSha256: string; sceneManifestSha256: string; groundWayId: number | null }>;
}
export interface WalkingSurfaceTracePoint { readonly fraction: number; readonly contact: WalkingContact }
export interface WalkingSurfaceQuery {
  readonly binding: Readonly<Record<string, string>>;
  begin(source: WalkingSurfaceSource, position: Readonly<{ x: number; z: number }>, previous?: WalkingContact): SurfaceResult<WalkingSurfaceInterval>;
  trace(interval: WalkingSurfaceInterval, from: WalkingContact, to: Readonly<WorldPoint>, sourceYFrom: number): SurfaceResult<readonly WalkingSurfaceTracePoint[]>;
}
export interface WalkingSurfaceInputs {
  readonly roads: BoundBytes;
  readonly pavements: BoundBytes;
  readonly terrain: BoundBytes;
  /** Must contain terrain.triangleCount and terrain.capTriangleCount from the source pipeline. */
  readonly sceneManifest: BoundBytes;
  /** Current inspected OSM facts, separate from historical network provenance. */
  readonly osm: BoundBytes;
  readonly networkSha256: string;
  readonly historicalNetworkOsmSha256: string;
  /** Explicit search bound only. A refusal is not a claim that no safe route exists. */
  readonly maxAnchorResidualM: number;
}
interface Triangle {
  readonly ref: WalkingSurfaceRef;
  readonly a: WorldPoint; readonly b: WorldPoint; readonly c: WorldPoint;
  readonly normal: WorldPoint;
  readonly area: number;
}
interface Crossing { triangle: Triangle; lo: number; hi: number }
const NUMERIC_HEIGHT_M = 1e-5;
const PARAMETER_EPSILON = 1e-12;
const finitePoint = (p: Readonly<WorldPoint>) => [p.x, p.y, p.z].every(Number.isFinite);
const isHash = (value: string) => /^[a-f0-9]{64}$/.test(value);

async function verified(input: BoundBytes, label: string): Promise<Uint8Array> {
  if (!input || !isHash(input.sha256)) throw new Error(`Walking support ${label} needs its expected SHA-256 and bytes.`);
  const expected = input.sha256;
  // Copy before the first await: subsequent caller writes cannot change checked bytes.
  const bytes = Uint8Array.from(input.bytes);
  const actual = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
  if (actual !== expected) throw new Error(`Walking support ${label} SHA-256 is ${actual}; expected ${expected}. Supply matching input bytes.`);
  return bytes;
}
function weights(t: Triangle, x: number, z: number): [number, number, number] {
  const u = ((x - t.a.x) * (t.c.z - t.a.z) - (z - t.a.z) * (t.c.x - t.a.x)) / t.area;
  const v = ((t.b.x - t.a.x) * (z - t.a.z) - (t.b.z - t.a.z) * (x - t.a.x)) / t.area;
  return [1 - u - v, u, v];
}
function contact(t: Triangle, x: number, z: number): WalkingContact {
  const [a, b, c] = weights(t, x, z);
  return Object.freeze({ position: Object.freeze({ x, y: a * t.a.y + b * t.b.y + c * t.c.y, z }), normal: Object.freeze({ ...t.normal }), surface: t.ref });
}
function clip(t: Triangle, a: Readonly<WorldPoint>, b: Readonly<WorldPoint>): Crossing | undefined {
  const start = weights(t, a.x, a.z), end = weights(t, b.x, b.z);
  let lo = 0, hi = 1;
  for (let i = 0; i < 3; i++) {
    const at = start[i]!, delta = end[i]! - at;
    if (delta === 0) { if (at < 0) return undefined; }
    else if (delta > 0) lo = Math.max(lo, -at / delta);
    else hi = Math.min(hi, -at / delta);
  }
  return hi >= lo && hi >= 0 && lo <= 1 ? { triangle: t, lo: Math.max(0, lo), hi: Math.min(1, hi) } : undefined;
}
class TriangleIndex {
  readonly triangles: Triangle[] = [];
  private readonly cells = new Map<string, Triangle[]>();
  constructor(mesh: MeshData, name: WalkingMesh, digest: string, count: number) {
    const p = mesh.positions, indices = mesh.indices;
    for (let triangle = 0; triangle < count; triangle++) {
      const points = [0, 1, 2].map(k => { const i = indices[triangle * 3 + k]! * 3; return { x: p[i]!, y: p[i + 1]!, z: p[i + 2]! }; });
      const [a, b, c] = points as [WorldPoint, WorldPoint, WorldPoint];
      const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
      const area = ux * vz - uz * vx;
      if (Math.abs(area) < 1e-12) continue;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const size = Math.hypot(nx, ny, nz);
      const t: Triangle = { ref: Object.freeze({ mesh: name, triangle, sha256: digest }), a, b, c, normal: { x: nx / size, y: ny / size, z: nz / size }, area };
      this.triangles.push(t);
      for (let x = Math.floor(Math.min(a.x, b.x, c.x) / 10); x <= Math.floor(Math.max(a.x, b.x, c.x) / 10); x++) for (let z = Math.floor(Math.min(a.z, b.z, c.z) / 10); z <= Math.floor(Math.max(a.z, b.z, c.z) / 10); z++) {
        const key = `${x},${z}`, bucket = this.cells.get(key);
        if (bucket) bucket.push(t); else this.cells.set(key, [t]);
      }
    }
  }
  nearby(a: Readonly<{ x: number; z: number }>, b = a): Triangle[] {
    const result = new Set<Triangle>();
    for (let x = Math.floor(Math.min(a.x, b.x) / 10); x <= Math.floor(Math.max(a.x, b.x) / 10); x++) for (let z = Math.floor(Math.min(a.z, b.z) / 10); z <= Math.floor(Math.max(a.z, b.z) / 10); z++) for (const t of this.cells.get(`${x},${z}`) ?? []) result.add(t);
    return [...result];
  }
  hits(x: number, z: number): WalkingContact[] {
    return this.nearby({ x, z }).filter(t => weights(t, x, z).every(w => w >= 0)).map(t => contact(t, x, z));
  }
}

/** No default terrain eligibility or synthetic fallback is supplied. */
export async function createWalkingSurfaceQuery(supplied: WalkingSurfaceInputs): Promise<WalkingSurfaceQuery> {
  if (!supplied || !isHash(supplied.networkSha256) || !isHash(supplied.historicalNetworkOsmSha256) || !Number.isFinite(supplied.maxAnchorResidualM) || supplied.maxAnchorResidualM <= 0) throw new Error("Walking support needs network and historical OSM SHA-256 values and a positive finite anchor search bound.");
  // Keep digests and policy inputs paired with the byte copies made below,
  // including if a caller changes its objects while hashing is pending.
  const inputs: WalkingSurfaceInputs = { ...supplied, roads: { ...supplied.roads }, pavements: { ...supplied.pavements }, terrain: { ...supplied.terrain }, sceneManifest: { ...supplied.sceneManifest }, osm: { ...supplied.osm } };
  const [roadBytes, pavementBytes, terrainBytes, manifestBytes, osmBytes] = await Promise.all([verified(inputs.roads, "roads"), verified(inputs.pavements, "pavements"), verified(inputs.terrain, "terrain"), verified(inputs.sceneManifest, "scene manifest"), verified(inputs.osm, "OSM facts")]);
  const terrain = decodeMesh(terrainBytes), manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as { terrain?: { triangleCount?: number; capTriangleCount?: number } };
  const caps = manifest.terrain?.capTriangleCount;
  if (!Number.isInteger(caps) || caps! < 0 || caps! > terrain.header.triangleCount || manifest.terrain?.triangleCount !== terrain.header.triangleCount) throw new Error("Walking support terrain source/cap counts disagree with the byte-bound scene manifest and terrain mesh; supply matching append-only cap metadata.");
  const sourceCount = terrain.header.triangleCount - caps!;
  const facts = indexOsm(JSON.parse(new TextDecoder().decode(osmBytes)) as OsmDocument);
  const groundWays = new Set<number>();
  for (const value of facts.values()) if (value.type === "way" && value.tags && surfaceExclusion(value.tags) === null && WALKABLE.has(value.tags.highway ?? "") && value.tags.foot !== "no" && value.tags.area !== "yes") groundWays.add(value.id);
  const roads = decodeMesh(roadBytes), pavements = decodeMesh(pavementBytes);
  const indices = [new TriangleIndex(roads, "roads", inputs.roads.sha256, roads.header.triangleCount), new TriangleIndex(pavements, "pavements", inputs.pavements.sha256, pavements.header.triangleCount), new TriangleIndex(terrain, "terrain", inputs.terrain.sha256, sourceCount)];
  const intervals = new WeakSet<object>();
  const binding = Object.freeze({ networkSha256: inputs.networkSha256, roadsSha256: inputs.roads.sha256, pavementsSha256: inputs.pavements.sha256, terrainSha256: inputs.terrain.sha256, sceneManifestSha256: inputs.sceneManifest.sha256, sourceFactsSha256: inputs.osm.sha256, historicalNetworkOsmSha256: inputs.historicalNetworkOsmSha256, sourceEligibilityStatus: inputs.historicalNetworkOsmSha256 === inputs.osm.sha256 ? "matches-network-source-digest; policy-review-required" : "current-facts-only; historical-eligibility-unverified" });
  const failure = (reason: WalkingSurfaceRefusal["reason"], source: WalkingSurfaceSource, position: Readonly<WorldPoint>, detail: string, candidates: readonly WalkingContact[] = [], previous?: WalkingContact): SurfaceResult<never> => ({ ok: false, refusal: Object.freeze({ reason, source, position: Object.freeze({ ...position }), detail, candidates: Object.freeze([...candidates]), ...(previous ? { previous } : {}) }) });
  const byHeight = (candidates: WalkingContact[], y: number) => candidates.sort((a, b) => Math.abs(a.position.y - y) - Math.abs(b.position.y - y) || a.surface.mesh.localeCompare(b.surface.mesh) || a.surface.triangle - b.surface.triangle);
  const ambiguous = (list: readonly WalkingContact[], y: number) => !!list[0] && list.slice(1).some(other => Math.abs(Math.abs(list[0]!.position.y - y) - Math.abs(other.position.y - y)) < NUMERIC_HEIGHT_M && Math.abs(list[0]!.position.y - other.position.y) > NUMERIC_HEIGHT_M);
  return Object.freeze({
    binding,
    begin(source: WalkingSurfaceSource, at: Readonly<{ x: number; z: number }>, previous?: WalkingContact): SurfaceResult<WalkingSurfaceInterval> {
      const point = { ...at, y: source.sourceY };
      if (!finitePoint(point) || !Number.isInteger(source.occurrence) || source.occurrence < 0) throw new Error(`Walking support ${source.edgeId} occurrence ${source.occurrence} needs finite source/world coordinates.`);
      const hits = byHeight(indices.flatMap(index => index.hits(at.x, at.z)).filter(hit => Math.abs(hit.position.y - source.sourceY) <= inputs.maxAnchorResidualM), previous?.position.y ?? source.sourceY);
      if (!hits.length) return failure("missing-support", source, point, "No strict source triangle in the declared anchor search range; a seam or local adjustment needs separate evidence.");
      const y = previous?.position.y ?? source.sourceY;
      if (ambiguous(hits, y)) return failure("ambiguous-level", source, point, "Distinct source levels are equally plausible at this interval anchor.", hits);
      const chosen = hits[0]!;
      if (previous && Math.abs(chosen.position.y - previous.position.y) > NUMERIC_HEIGHT_M) return failure("level-change", source, point, "The new interval does not continue the preceding physical height; construct a supported transition.", hits, previous);
      if (chosen.surface.mesh === "terrain" && (source.sourceWayId === null || !groundWays.has(source.sourceWayId))) return failure("source-ground-unverified", source, point, "Terrain was nearest, but verified OSM facts do not establish this occurrence as an eligible surface walking way.", hits);
      const interval: WalkingSurfaceInterval = Object.freeze({ source: Object.freeze({ ...source }), kind: chosen.surface.mesh === "terrain" ? "source-ground" : "road-pavement", anchor: chosen, evidence: Object.freeze({ networkSha256: inputs.networkSha256, sourceFactsSha256: inputs.osm.sha256, sceneManifestSha256: inputs.sceneManifest.sha256, groundWayId: chosen.surface.mesh === "terrain" ? source.sourceWayId : null }) });
      intervals.add(interval);
      return { ok: true, value: interval };
    },
    trace(interval: WalkingSurfaceInterval, from: WalkingContact, to: Readonly<WorldPoint>, sourceYFrom: number): SurfaceResult<readonly WalkingSurfaceTracePoint[]> {
      if (!intervals.has(interval)) return failure("foreign-interval", interval.source, to, "Use a local interval created by this byte-bound support query.");
      if (!finitePoint(from.position) || !finitePoint(to) || !Number.isFinite(sourceYFrom)) throw new Error(`Walking support ${interval.source.edgeId} segment needs finite endpoints and source level.`);
      const ground = interval.kind === "source-ground";
      const allCrossings = indices.flatMap(index => index.nearby(from.position, to).flatMap(t => { const result = clip(t, from.position, to); return result ? [result] : []; }));
      const crossings = allCrossings.filter(c => ground === (c.triangle.ref.mesh === "terrain"));
      // Ground visibility must split at overlay edges too, not miss a narrow cover
      // because one midpoint elsewhere on the terrain triangle was clear.
      const events = [...new Set([0, 1, ...(ground ? allCrossings : crossings).flatMap(c => [c.lo, c.hi])])].sort((a, b) => a - b);
      const result: WalkingSurfaceTracePoint[] = [{ fraction: 0, contact: from }];
      let last = from;
      for (let i = 1; i < events.length; i++) {
        const lo = events[i - 1]!, hi = events[i]!;
        if (hi - lo <= PARAMETER_EPSILON) continue;
        const mid = (lo + hi) / 2, x = from.position.x + (to.x - from.position.x) * lo, z = from.position.z + (to.z - from.position.z) * lo;
        const covering = crossings.filter(c => c.lo <= mid && c.hi >= mid);
        if (!covering.length) return failure("missing-support", interval.source, { x, y: last.position.y, z }, `The selected ${interval.kind} sheet has an uncovered segment from ${lo} to ${hi}; no seam-foot proof or new surface is implied.`);
        const candidates = byHeight(covering.map(c => contact(c.triangle, x, z)), last.position.y);
        if (ambiguous(candidates, last.position.y)) return failure("ambiguous-level", interval.source, { x, y: last.position.y, z }, "Distinct levels meet this selected interval without a unique continuation.", candidates);
        const candidate = candidates[0]!;
        if (Math.abs(candidate.position.y - last.position.y) > NUMERIC_HEIGHT_M) return failure("level-change", interval.source, { x, y: last.position.y, z }, "Source sheets disagree at their boundary; fitting an unsupported ramp would change the geometry.", candidates, last);
        const triangle = covering.find(c => c.triangle.ref === candidate.surface)!.triangle;
        if (ground) {
          const mx = from.position.x + (to.x - from.position.x) * mid, mz = from.position.z + (to.z - from.position.z) * mid;
          const gy = contact(triangle, mx, mz).position.y, expectedY = sourceYFrom + (to.y - sourceYFrom) * mid;
          const covers = indices.slice(0, 2).flatMap(index => index.hits(mx, mz)).filter(hit => hit.position.y > gy + NUMERIC_HEIGHT_M && Math.abs(hit.position.y - expectedY) + NUMERIC_HEIGHT_M < Math.abs(gy - expectedY));
          if (covers.length) return failure("ground-covered", interval.source, { x: mx, y: gy, z: mz }, "A closer road/pavement covers the selected ground at the source level; a supported change of sheet is required.", covers);
        }
        const end = contact(triangle, from.position.x + (to.x - from.position.x) * hi, from.position.z + (to.z - from.position.z) * hi);
        result.push(Object.freeze({ fraction: hi, contact: end })); last = end;
      }
      return { ok: true, value: Object.freeze(result) };
    },
  });
}

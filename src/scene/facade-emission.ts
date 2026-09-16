/** Explicit photographic sign eligibility. Brightness never selects a surface. */
import { Float32BufferAttribute, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { FACADE_EMISSION_REGIONS } from "./facade-emission-regions.js";

type Point2 = readonly [number, number];
type Point3 = readonly [number, number, number];
export interface EmissionRegion {
  id: string; group: number; tileUri: string; tileSha256: string; gmlId: string;
  uv: readonly [Point2, Point2, Point2, Point2]; origin: Point3; normal: Point3;
  planeHalfThicknessM: number; normalMinimumDot: number; radiance: number;
}
const fail = (input: string): never => { throw new Error(`Facade emission record ${input} is malformed or unbound. Re-audit its source tile, GML building and UV polygon before enabling illumination.`); };
const finite = (value: unknown, length: number): value is number[] => Array.isArray(value) && value.length === length && value.every(Number.isFinite);

export function validateEmissionRegions(value: unknown): asserts value is readonly EmissionRegion[] {
  if (!Array.isArray(value)) return fail("list");
  const seen = new Set<string>(); const groups = new Set<number>(); const bindings = new Set<string>();
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") fail(`[${index}]`);
    const r = raw as EmissionRegion;
    if (typeof r.id !== "string" || !r.id || seen.has(r.id)) fail(`[${index}].id`);
    seen.add(r.id);
    if (!Number.isInteger(r.group) || r.group < 1 || groups.has(r.group)) fail(`${r.id}.group`);
    groups.add(r.group);
    if (typeof r.tileUri !== "string" || !/^data\/[^/]+\.b3dm$/.test(r.tileUri) || typeof r.tileSha256 !== "string" || !/^[a-f0-9]{64}$/.test(r.tileSha256) || typeof r.gmlId !== "string" || !r.gmlId.startsWith("bldg_")) fail(`${r.id}.source`);
    const binding = `${r.tileUri}:${r.gmlId}`;
    // This first registry has one panel per building. Refuse a second panel
    // rather than assigning it an unreachable vertex group.
    if (bindings.has(binding)) fail(`${r.id}.duplicate-building-binding`);
    bindings.add(binding);
    if (!finite(r.origin, 3) || !finite(r.normal, 3) || Math.abs(Math.hypot(...r.normal) - 1) > 1e-5 || !Number.isFinite(r.planeHalfThicknessM) || r.planeHalfThicknessM <= 0 || r.planeHalfThicknessM > 0.03 || !Number.isFinite(r.normalMinimumDot) || r.normalMinimumDot < 0.99 || r.normalMinimumDot > 1 || !Number.isFinite(r.radiance) || r.radiance <= 0 || r.radiance > 1) fail(`${r.id}.plane`);
    if (!Array.isArray(r.uv) || r.uv.length !== 4 || r.uv.some(p => !finite(p, 2) || p.some(v => v < 0 || v > 1))) fail(`${r.id}.uv`);
    const turns = r.uv.map((a, i) => { const b = r.uv[(i + 1) % 4]!; const c = r.uv[(i + 2) % 4]!; return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); });
    if (turns.some(t => Math.abs(t) < 1e-12) || turns.some(t => Math.sign(t) !== Math.sign(turns[0]!))) fail(`${r.id}.convexUv`);
  }
}
validateEmissionRegions(FACADE_EMISSION_REGIONS);

export function emissionSourceForUrl(url: string): typeof FACADE_EMISSION_REGIONS[number] | undefined {
  // The base parses relative upstream requests; the actual fetch URL is unchanged.
  const pathname = new URL(url, "http://maps.invalid/").pathname;
  return FACADE_EMISSION_REGIONS.find(r => pathname.endsWith(`/buildings/${r.tileUri}`));
}

export function emissionAt(region: EmissionRegion, point: Point3, normal: Point3, uv: Point2): number {
  const distance = point.reduce((sum, x, i) => sum + (x - region.origin[i]!) * region.normal[i]!, 0);
  if (Math.abs(distance) > region.planeHalfThicknessM || normal.reduce((sum, x, i) => sum + x * region.normal[i]!, 0) < region.normalMinimumDot) return 0;
  const sides = region.uv.map((a, i) => { const b = region.uv[(i + 1) % 4]!; return (b[0] - a[0]) * (uv[1] - a[1]) - (b[1] - a[1]) * (uv[0] - a[0]); });
  return sides.every(v => v >= 0) || sides.every(v => v <= 0) ? region.radiance : 0;
}

/** Batch IDs only look up GML identity; their numerical index never selects a sign. */
export function prepareEmissionEligibility(scene: Object3D, tileUri: string, verifiedSha256: string | undefined): void {
  const regions = FACADE_EMISSION_REGIONS.filter(r => r.tileUri === tileUri);
  if (regions.some(r => r.tileSha256 !== verifiedSha256)) fail(`${tileUri}.sha256`);
  const table = (scene as Object3D & { batchTable?: { getDataFromId(id: number): Record<string, unknown> } }).batchTable;
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.getAttribute("position");
    if (!positions) return;
    const ids = object.geometry.getAttribute("_batchid") ?? object.geometry.getAttribute("_BATCHID");
    const groups = new Float32Array(positions.count);
    if (regions.length > 0) {
      if (!table || !ids) fail(`${tileUri}.batchTable`);
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) if (material instanceof MeshStandardMaterial && material.map) {
        // Match Three's material path: an explicit matrix is authoritative when
        // matrixAutoUpdate is false and must not be overwritten by this guard.
        if (material.map.matrixAutoUpdate) material.map.updateMatrix();
        const matrix = material.map.matrix.elements;
        if (material.map.channel !== 0 || material.map.flipY || matrix.some((v, i) => Math.abs(v - ([1, 0, 0, 0, 1, 0, 0, 0, 1][i]!)) > 1e-9)) fail(`${tileUri}.UV0-orientation`);
      }
      for (let index = 0; index < positions.count; index++) {
        const gmlId = table!.getDataFromId(ids!.getX(index))["gml_id"];
        groups[index] = regions.find(r => r.gmlId === gmlId)?.group ?? 0;
      }
    }
    object.geometry.setAttribute("mapsEmitterGroup", new Float32BufferAttribute(groups, 1));
  });
}

const gl = (n: number): string => Number.isInteger(n) ? `${n}.0` : String(n);
const vec = (p: readonly number[]): string => `vec${p.length}(${p.map(gl).join(",")})`;
export const FACADE_EMISSION_GLSL = `
float mapsSide(vec2 a, vec2 b, vec2 p) { return (b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x); }
float mapsPanelEmission(vec3 p, vec3 n, vec2 uv, float group) {
${FACADE_EMISSION_REGIONS.map(r => `if (abs(group-${gl(r.group)}) < 0.01 && abs(dot(p-${vec(r.origin)},${vec(r.normal)})) <= ${gl(r.planeHalfThicknessM)} && dot(n,${vec(r.normal)}) >= ${gl(r.normalMinimumDot)}) {
vec4 sides=vec4(${r.uv.map((a, i) => `mapsSide(${vec(a)},${vec(r.uv[(i + 1) % 4]!)},uv)`).join(",")});
if (all(greaterThanEqual(sides,vec4(0.0))) || all(lessThanEqual(sides,vec4(0.0)))) return ${gl(r.radiance)};
}`).join("\n")}
return 0.0;
}`;

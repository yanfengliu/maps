/** Bound: one authored pair of markers on pinned corridor road/paving meshes.
 * <=0.25m subdivision plus triangle vertices, midpoints and centroids is finite
 * sampling. It does not prove continuous support or a surveyed road layout.
 * No seam, terrain fallback, borrowed material or per-frame callback is added.
 */
import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from "three";
import type { MeshData } from "../world/mesh.js";
import type { WorldStyle } from "../world/styles.js";
import { PAINT_SUPPORT_BOUNDS, type PaintSupport } from "./paint-support.js";
import { CORRIDOR_CROSSING, CORRIDOR_EDGES, CORRIDOR_JUNCTION_MAX_Z, CORRIDOR_PAINT, CORRIDOR_SOURCE, CORRIDOR_TRIANGLES, type CorridorEdge, type CorridorTriangleSelection } from "./corridor-paint-recipe.js";

type Point = readonly [number, number, number];
interface SurfaceTriangle { points: readonly [Point, Point, Point]; minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number }
export interface CorridorPaintInputs {
  roads: MeshData; pavements: MeshData; markings: MeshData;
  inputDigests: { roads: string; pavements: string };
  paintHeightAt: PaintSupport;
}
export interface CorridorPaintPlacement {
  side: "west" | "east"; sourceOrdinal: number; polygonId: string;
  status: "placed" | "omitted"; reason: string; vertexStart: number; vertexCount: number;
}
export interface CorridorPaint {
  root: Group;
  placements: readonly CorridorPaintPlacement[];
  setStyle(style: WorldStyle): void;
  dispose(): void;
}

function triangles(mesh: MeshData, selection?: CorridorTriangleSelection): SurfaceTriangle[] {
  const result: SurfaceTriangle[] = [];
  const append = (i: number): void => {
    const a = mesh.indices[i]! * 3, b = mesh.indices[i + 1]! * 3, c = mesh.indices[i + 2]! * 3;
    const ax = mesh.positions[a]!, bx = mesh.positions[b]!, cx = mesh.positions[c]!, az = mesh.positions[a + 2]!, bz = mesh.positions[b + 2]!, cz = mesh.positions[c + 2]!;
    const minX = Math.min(ax, bx, cx), maxX = Math.max(ax, bx, cx), minZ = Math.min(az, bz, cz), maxZ = Math.max(az, bz, cz);
    if (maxX < CORRIDOR_PAINT.minX || minX > CORRIDOR_PAINT.maxX || maxZ < CORRIDOR_PAINT.minZ || minZ > CORRIDOR_PAINT.maxZ) return;
    if (Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) < 1e-12) return;
    const ay = mesh.positions[a + 1]!, by = mesh.positions[b + 1]!, cy = mesh.positions[c + 1]!;
    result.push({ points: [[ax, ay, az], [bx, by, bz], [cx, cy, cz]], minX, maxX, minZ, maxZ, minY: Math.min(ay, by, cy), maxY: Math.max(ay, by, cy) });
  };
  // Actual loaded SHA identities were checked by the constructor. Shape also
  // distinguishes synthetic/empty inputs, whose physical exclusions still run.
  if (selection && mesh.header.version === 1 && mesh.header.name === selection.name && mesh.header.vertexCount === selection.vertexCount && mesh.header.triangleCount === selection.triangleCount && mesh.positions.length === selection.vertexCount * 3 && mesh.indices.length === selection.triangleCount * 3) {
    for (const [first, last] of selection.ranges) for (let ordinal = first; ordinal <= last; ordinal++) append(ordinal * 3);
  } else for (let i = 0; i < mesh.indices.length; i += 3) append(i);
  return result;
}

/** Strict barycentric footprint; paint-only seam observations cannot admit it. */
function heights(surface: readonly SurfaceTriangle[], x: number, z: number): number[] {
  const result: number[] = [];
  for (const t of surface) {
    if (x < t.minX || x > t.maxX || z < t.minZ || z > t.maxZ) continue;
    const [a, b, c] = t.points, den = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / den;
    const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / den, w = 1 - u - v;
    if (u >= 0 && v >= 0 && w >= 0) result.push(u * a[1] + v * b[1] + w * c[1]);
  }
  return result;
}

/** Positive-area overlap of convex plan footprints; mere shared edges pass. */
function overlap(a: readonly Point[], b: readonly Point[]): boolean {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!, q = polygon[(i + 1) % polygon.length]!, nx = -(q[2] - p[2]), nz = q[0] - p[0];
    if (nx === 0 && nz === 0) continue;
    const aa = a.map(v => nx * v[0] + nz * v[2]), bb = b.map(v => nx * v[0] + nz * v[2]);
    if (Math.max(...aa) <= Math.min(...bb) || Math.max(...bb) <= Math.min(...aa)) return false;
  }
  return true;
}

function crossingFootprints(): Point[][] {
  const result: Point[][] = [], points = CORRIDOR_CROSSING.points, half = CORRIDOR_CROSSING.widthM / 2 + CORRIDOR_CROSSING.marginM;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!, dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const tx = dx / length, tz = dz / length, nx = -tz, nz = tx, margin = CORRIDOR_CROSSING.marginM;
    result.push([[a[0] - tx * margin - nx * half, 0, a[1] - tz * margin - nz * half], [a[0] - tx * margin + nx * half, 0, a[1] - tz * margin + nz * half], [b[0] + tx * margin + nx * half, 0, b[1] + tz * margin + nz * half], [b[0] + tx * margin - nx * half, 0, b[1] + tz * margin - nz * half]]);
  }
  return result;
}

/** Only literal source-shared endpoints join. Neither the real gap nor omitted
 * source edge is connected. The miter keeps distance to both source segments. */
function joinNormal(edge: CorridorEdge, neighbour: CorridorEdge | undefined, start: boolean): readonly [number, number] {
  if (!neighbour || neighbour.omitted || neighbour.side !== edge.side) return edge.roadward;
  const p = start ? edge.start : edge.end, q = start ? neighbour.end : neighbour.start;
  if (p.some((v, i) => v !== q[i])) return edge.roadward;
  const [a, b] = edge.roadward, [c, d] = neighbour.roadward, denominator = 1 + a * c + b * d;
  if (denominator < 1) throw Error(`Corridor paint ${edge.side} source polygon ${edge.polygonId} has an unsupported sharp join; restore the reviewed edge recipe.`);
  return [(a + c) / denominator, (b + d) / denominator];
}

export function createCorridorPaint(inputs: CorridorPaintInputs, style: WorldStyle): CorridorPaint {
  for (const name of ["roads", "pavements"] as const) if (inputs.inputDigests[name] !== CORRIDOR_SOURCE[name]) {
    throw Error(`Corridor edge paint ${name} input has digest ${inputs.inputDigests[name]}, expected ${CORRIDOR_SOURCE[name]}; restore the reviewed scene cache or review this authored recipe against the changed physical surface.`);
  }
  const roads = triangles(inputs.roads, CORRIDOR_TRIANGLES.roads), pavements = triangles(inputs.pavements, CORRIDOR_TRIANGLES.pavements), markings = triangles(inputs.markings), exclusions = crossingFootprints();
  const vertices: number[] = [], placements: CorridorPaintPlacement[] = [];
  const read = (x: number, z: number, expected: number): { point?: Point; reason?: string } => {
    if (![x, z, expected].every(Number.isFinite) || x < CORRIDOR_PAINT.minX || x > CORRIDOR_PAINT.maxX || z < CORRIDOR_PAINT.minZ || z > CORRIDOR_PAINT.maxZ) return { reason: "sample outside the finite corridor bounds" };
    if (z <= CORRIDOR_JUNCTION_MAX_Z) return { reason: "sample enters the authored north-junction exclusion" };
    const y = inputs.paintHeightAt(x, z, expected);
    if (y === undefined || !Number.isFinite(y) || Math.abs(y - expected) > PAINT_SUPPORT_BOUNDS.sourceDeviationM) return { reason: "sample lacks nearby finite source-level paint support" };
    if (!heights(roads, x, z).some(h => Math.abs(h - expected) <= PAINT_SUPPORT_BOUNDS.sourceDeviationM && Math.abs(h - y) <= 1e-8)) return { reason: "sample lacks the same strict carriageway footprint and elevation layer" };
    if (heights(pavements, x, z).some(h => Math.abs(h - expected) <= PAINT_SUPPORT_BOUNDS.sourceDeviationM)) return { reason: "sample occupies the nearby paving footprint" };
    return { point: [x, y, z] };
  };
  for (const [index, edge] of CORRIDOR_EDGES.entries()) {
    const vertexStart = vertices.length / 3, pending: number[] = [];
    let reason = edge.omitted ? "Retained preparation omission: source edge53839 has a strict unsupported near-side start; its full0.819893895m remains absent." : "";
    if (!reason) {
      const n0 = joinNormal(edge, CORRIDOR_EDGES[index - 1], true), n1 = joinNormal(edge, CORRIDOR_EDGES[index + 1], false);
      const length = Math.hypot(edge.end[0] - edge.start[0], edge.end[2] - edge.start[2]), steps = Math.ceil(length / PAINT_SUPPORT_BOUNDS.spacingM);
      const at = (t: number, offset: number): readonly [number, number, number] => {
        const x = edge.start[0] + (edge.end[0] - edge.start[0]) * t, z = edge.start[2] + (edge.end[2] - edge.start[2]) * t;
        return [x + (n0[0] + (n1[0] - n0[0]) * t) * offset, edge.start[1] + (edge.end[1] - edge.start[1]) * t + CORRIDOR_PAINT.sourceToRoadM, z + (n0[1] + (n1[1] - n0[1]) * t) * offset];
      };
      for (let step = 0; step < steps && !reason; step++) {
        const near = CORRIDOR_PAINT.insetM - CORRIDOR_PAINT.widthM / 2, far = CORRIDOR_PAINT.insetM + CORRIDOR_PAINT.widthM / 2;
        const samples = [at(step / steps, near), at(step / steps, far), at((step + 1) / steps, far), at((step + 1) / steps, near)];
        const minExpected = Math.min(...samples.map(p => p[1])), maxExpected = Math.max(...samples.map(p => p[1]));
        const footprint = samples.map(p => [p[0], 0, p[2]] as Point);
        if (exclusions.some(p => overlap(footprint, p))) { reason = `part overlaps physical ${CORRIDOR_CROSSING.id} plus its authored margin`; break; }
        if (markings.some(t => t.minY <= maxExpected + .5 && t.maxY >= minExpected - .5 && overlap(footprint, t.points))) { reason = "part overlaps an existing same-level published paint footprint"; break; }
        if (pavements.some(t => t.minY <= maxExpected + .5 && t.maxY >= minExpected - .5 && overlap(footprint, t.points))) { reason = "part overlaps the nearby paving footprint"; break; }
        const actual: Point[] = [];
        for (const p of samples) { const result = read(p[0], p[2], p[1]); if (!result.point) { reason = result.reason!; break; } actual.push(result.point); }
        if (reason) break;
        for (const ids of [[0, 1, 2], [0, 2, 3]]) {
          const triangle = ids.map(i => actual[i]!), expected = ids.map(i => samples[i]![1]);
          for (let i = 0; i < 3; i++) { const a = triangle[i]!, b = triangle[(i + 1) % 3]!; if (Math.abs(a[1] - b[1]) > PAINT_SUPPORT_BOUNDS.edgeRiseRun * Math.hypot(a[0] - b[0], a[2] - b[2]) + 1e-6) reason = "sampled triangle edge exceeds0.5 rise/run"; }
          for (const weights of [[.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3]]) {
            const blend = (channel: number): number => triangle.reduce((sum, p, i) => sum + p[channel]! * weights[i]!, 0);
            const result = read(blend(0), blend(2), expected.reduce((sum, y, i) => sum + y * weights[i]!, 0));
            if (!result.point) reason = `edge/interior ${result.reason}`;
            else if (Math.abs(result.point[1] - blend(1)) > PAINT_SUPPORT_BOUNDS.sampledResidualM) reason = "edge/interior support differs from sampled triangle plane by more than0.04m";
          }
          if (reason) break;
          const [a, b, c] = triangle as [Point, Point, Point];
          const ordered = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]) > 0 ? [a, b, c] : [a, c, b];
          for (const p of ordered) pending.push(p[0], p[1] + CORRIDOR_PAINT.liftM, p[2]);
        }
      }
    }
    if (!reason) vertices.push(...pending);
    placements.push(Object.freeze({ side: edge.side, sourceOrdinal: edge.sourceOrdinal, polygonId: edge.polygonId, status: reason ? "omitted" : "placed", reason: reason || "Finite source-level carriageway samples and paving/paint/crossing exclusions; not continuous support proof.", vertexStart, vertexCount: reason ? 0 : pending.length / 3 }));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const material = new MeshStandardMaterial({ roughness: .74, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const mesh = new Mesh(geometry, material), root = new Group();
  root.name = "roads:authored-corridor-edge-markers"; mesh.name = "roads:corridor-edge-paint"; mesh.receiveShadow = true; root.add(mesh);
  let disposed = false;
  const setStyle = (next: WorldStyle): void => { if (!disposed) material.color.setHex(next.palette.sidewalk).lerp(new Color(0xffffff), .88); };
  setStyle(style);
  return { root, placements: Object.freeze(placements), setStyle, dispose(): void { if (disposed) return; disposed = true; root.removeFromParent(); root.clear(); geometry.dispose(); material.dispose(); } };
}

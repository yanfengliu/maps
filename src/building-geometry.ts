import earcut from 'earcut';
import type * as GeoJSON from 'geojson';
import { buildingArchitecture, type BuildingArchitecture } from './building-architecture.ts';
import { addMemorialChurch } from './memorial-church.ts';
import { composeMainQuad } from './compose-building-parts.ts';

export type CampusData = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
export type Point = [number, number];
type Vertex = [number, number, number];
type Color = [number, number, number];

export const DETAIL_ORIGIN: Point = [-122.1697, 37.4278];
export const VERTEX_FLOATS = 13;
export const MAX_DETAIL_TRIANGLES = 150_000;
const CIRCUMFERENCE = 40_075_016.68557849;
const ORIGIN_LAT = DETAIL_ORIGIN[1] * Math.PI / 180;
export const METERS_TO_MERCATOR = 1 / (CIRCUMFERENCE * Math.cos(ORIGIN_LAT));
export const MERCATOR_ORIGIN = [
  (DETAIL_ORIGIN[0] + 180) / 360,
  (1 - Math.log(Math.tan(Math.PI / 4 + ORIGIN_LAT / 2)) / Math.PI) / 2,
] as const;

/** Local metres keep facade details precise in float32 buffers. */
export function projectLocal(position: readonly number[]): Point {
  const latitude = position[1] * Math.PI / 180;
  const x = (position[0] + 180) / 360;
  const y = (1 - Math.log(Math.tan(Math.PI / 4 + latitude / 2)) / Math.PI) / 2;
  return [(x - MERCATOR_ORIGIN[0]) / METERS_TO_MERCATOR, (MERCATOR_ORIGIN[1] - y) / METERS_TO_MERCATOR];
}

function roofRise(properties: GeoJSON.GeoJsonProperties): number {
  const available = Number(properties?.height) - Number(properties?.base);
  const shape = buildingArchitecture(properties, Number(properties?.height)).roofShape;
  const mapped = Number(properties?.['osm:roof:height']);
  if (shape === 'flat') return Math.min(0.28, available * 0.1);
  if (Number.isFinite(mapped) && mapped > 0) return Math.min(mapped, available * 0.45);
  return Math.min(available * 0.45, shape === 'skillion' ? 1.4 : 3.2, Math.max(0.35, available * 0.17));
}

/** Derived geometry hints are estimates; the original source height is retained. */
export function prepareBuildingDetails(data: CampusData): CampusData {
  const church = data.features.find(feature=>feature.properties?.id==='way/836474103');
  return { ...data, features: data.features.map(feature => {
    const p = feature.properties;
    const quad = p?.id === 'relation/35820';
    const detailRoofHeight = quad ? Math.min(Number(p.height),Number(p.base)+9.5) : Number(p?.height);
    const detailWallHeight = quad ? Math.min(detailRoofHeight-0.1,Number(p.base)+6.2) : p?.id === 'way/836474103'
      ? Number(p.base) + (Number(p.height) - Number(p.base)) * 0.35 : Number(p?.height) - roofRise(p);
    let geometry = feature.geometry;
    if(quad && church){
      if(geometry.type!=='Polygon' || church.geometry.type!=='Polygon')throw new Error('Main Quad/church rendering requires the reviewed Polygon footprints. Review the changed source geometry types.');
      geometry=composeMainQuad(geometry,church.geometry,projectLocal);
    }
    return { ...feature, geometry, properties: { ...p, detailWallHeight, detailRoofHeight, detailArchitecture: buildingArchitecture(p, detailWallHeight) } };
  }) };
}

function color(value: unknown): Color {
  const hex = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#b96f54';
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255) as Color;
}

function signedArea(ring: Point[]): number {
  return ring.reduce((sum, p, i) => { const q = ring[(i + 1) % ring.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
}

export function distanceToRings(point: Point, rings: Point[][]): number {
  let nearestSquared = Infinity;
  for (const ring of rings) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length2 = dx * dx + dy * dy;
    const t = length2 ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length2)) : 0;
    const ex = point[0] - a[0] - t * dx, ey = point[1] - a[1] - t * dy;
    nearestSquared = Math.min(nearestSquared, ex * ex + ey * ey);
  }
  return Math.sqrt(nearestSquared);
}

class Mesh {
  values: number[] = [];
  triangle(a: Vertex, b: Vertex, c: Vertex, tint: Color, kind: number, building: number, uv?: [Point, Point, Point]): void {
    const ab = b.map((v, i) => v - a[i]);
    const ac = c.map((v, i) => v - a[i]);
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const length = Math.hypot(...normal);
    if (length < 1e-8) return;
    const n = normal.map(v => v / length);
    for (const [i, p] of [a, b, c].entries()) this.values.push(...p, ...n, ...tint, ...(uv?.[i] ?? [p[0], p[1]]), kind, building);
  }
  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex, tint: Color, kind: number, building: number, uv?: [Point, Point, Point, Point]): void {
    this.triangle(a, b, c, tint, kind, building, uv ? [uv[0], uv[1], uv[2]] : undefined);
    this.triangle(a, c, d, tint, kind, building, uv ? [uv[0], uv[2], uv[3]] : undefined);
  }
}

export interface DetailGeometry {
  roofs: Float32Array;
  facades: Float32Array;
  buildings: number;
  roofTriangles: number;
  facadeTriangles: number;
  triangles: number;
  bytes: number;
}

function midpoint(a: Point, b: Point): Point { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
function subdivide(a: Point, b: Point, c: Point, depth: number, triangles: [Point, Point, Point][]): void {
  if (!depth) { triangles.push([a, b, c]); return; }
  const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
  subdivide(a, ab, ca, depth - 1, triangles); subdivide(ab, b, bc, depth - 1, triangles);
  subdivide(ca, bc, c, depth - 1, triangles); subdivide(ab, bc, ca, depth - 1, triangles);
}

function splitAtRidge(triangles: [Point, Point, Point][], axis: Point, middle: number): [Point, Point, Point][] {
  const result: [Point, Point, Point][] = [];
  for (const triangle of triangles) for (const side of [-1, 1]) {
    const clipped: Point[] = [];
    for (let i = 0; i < 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3];
      const da = (a[0] * axis[0] + a[1] * axis[1] - middle) * side;
      const db = (b[0] * axis[0] + b[1] * axis[1] - middle) * side;
      if (da >= 0) clipped.push(a);
      if ((da > 0) !== (db > 0)) { const t = da / (da - db); clipped.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]); }
    }
    for (let i = 1; i < clipped.length - 1; i++) result.push([clipped[0], clipped[i], clipped[i + 1]]);
  }
  return result;
}

/** Incremental builder: the renderer advances features only in short idle slices. */
export class BuildingGeometryBuilder {
  private roofs = new Mesh();
  private facades = new Mesh();
  private featureIndex = 0;
  private data: CampusData;
  constructor(data: CampusData) { this.data = data; }
  get done(): boolean { return this.featureIndex >= this.data.features.length; }

  step(): void {
    if (this.done) return;
    const building = this.featureIndex++;
    const feature = this.data.features[building];
    const p = feature.properties!;
    const height = Number(p.detailRoofHeight), base = Number(p.base), wall = Number(p.detailWallHeight);
    const roofTint = color(p.roofColor), wallTint = color(p.color);
    const architecture = p.detailArchitecture as BuildingArchitecture;
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const shape = architecture.roofShape;
    for (const polygon of polygons) {
      const rings = polygon.map(ring => ring.slice(0, -1).map(projectLocal)).filter(ring => ring.length >= 3);
      if (!rings.length) continue;
      if (architecture.profile === 'memorial-church') {
        addMemorialChurch(this.roofs, this.facades, rings[0], building, base, height, wallTint, roofTint);
        this.checkBudget(String(p.id));
        continue;
      }
      const vertices = rings.flat(), holes: number[] = [];
      let offset = rings[0].length;
      for (const ring of rings.slice(1)) { holes.push(offset); offset += ring.length; }
      const indices = earcut(vertices.flat(), holes, 2);
      let roofTriangles: [Point, Point, Point][] = [];
      const depth = shape === 'dome' ? 3 : shape === 'gabled' ? 0 : p.id === 'relation/35820' ? 2 : 1;
      for (let i = 0; i < indices.length; i += 3) subdivide(vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]], depth, roofTriangles);
      const minY = Math.min(...vertices.map(v => v[1])), maxY = Math.max(...vertices.map(v => v[1]));
      let ridgeAxis: Point = [0, 1], longest = 0;
      if (shape === 'gabled') for (let i = 0; i < rings[0].length; i++) {
        const a = rings[0][i], b = rings[0][(i + 1) % rings[0].length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (length > longest) { longest = length; ridgeAxis = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length]; }
      }
      const across = vertices.map(v => v[0] * ridgeAxis[0] + v[1] * ridgeAxis[1]);
      const ridgeLow = Math.min(...across), ridgeHigh = Math.max(...across), ridgeMiddle = (ridgeLow + ridgeHigh) / 2;
      if (shape === 'gabled') roofTriangles = splitAtRidge(roofTriangles, ridgeAxis, ridgeMiddle);
      const distances = new Map<Point, number>();
      let maximumDistance = 0;
      if (!['flat','skillion','gabled'].includes(shape)) for (const triangle of roofTriangles) for (const point of triangle) {
        if (!distances.has(point)) distances.set(point, distanceToRings(point, rings));
        maximumDistance = Math.max(maximumDistance, distances.get(point)!);
      }
      const roofPoint = (point: Point): Vertex => {
        let fraction = shape === 'flat' ? 1 : shape === 'skillion'
          ? (point[1] - minY) / Math.max(0.1, maxY - minY)
          : shape === 'gabled' ? Math.max(0, 1 - Math.abs((point[0] * ridgeAxis[0] + point[1] * ridgeAxis[1] - ridgeMiddle) / Math.max(0.01, (ridgeHigh - ridgeLow) / 2)))
          : Math.min(1, (distances.get(point) ?? 0) / Math.max(0.01, maximumDistance));
        if (shape === 'dome') fraction = Math.sin(fraction * Math.PI / 2);
        // A small lift avoids z fighting with the native eave cap, while every
        // generated vertex remains below or at the original source height.
        return [point[0], point[1], Math.min(height, wall + 0.07 + (height - wall - 0.07) * fraction)];
      };
      for (const [a, b, c] of roofTriangles) {
        const signed = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        this.roofs.triangle(roofPoint(a), roofPoint(signed > 0 ? b : c), roofPoint(signed > 0 ? c : b), roofTint, 0, building);
      }
      for (const [ringIndex, ring] of rings.entries()) {
        const outward = (signedArea(ring) > 0 ? 1 : -1) * (ringIndex ? -1 : 1);
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], b = ring[(i + 1) % ring.length];
          const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
          if (length < 0.4) continue;
          const nx = outward * dy / length, ny = -outward * dx / length;
          const at = (point: Point, z: number, extension = 0.045): Vertex => [point[0] + nx * extension, point[1] + ny * extension, z];
          if (wall > base + 1 && length > 1.8) {
            const libraryFront = architecture.profile==='library' && ringIndex===0 && (i===14 || i===15);
            const kind = libraryFront ? 8 : architecture.profile === 'quad' ? 3 : architecture.profile === 'residential' ? 4
              : architecture.profile === 'modern' ? 5 : architecture.profile === 'garage' ? 6
              : architecture.profile === 'service' || architecture.profile === 'open' || architecture.floors === 0 ? 2
              : architecture.profile === 'tower' ? 7 : 1;
            const bays = Math.max(1, Math.round(length / architecture.bayWidth));
            const rows = libraryFront ? 1 : architecture.floors ?? (architecture.profile === 'tower' ? 1 : architecture.profile==='library' ? 3 : 0);
            const frontStart=libraryFront?ring[14]:a,frontEnd=libraryFront?ring[16]:b;
            const frontLength=Math.hypot(frontEnd[0]-frontStart[0],frontEnd[1]-frontStart[1]);
            const along=(point:Point)=>((point[0]-frontStart[0])*(frontEnd[0]-frontStart[0])+(point[1]-frontStart[1])*(frontEnd[1]-frontStart[1]))/(frontLength*frontLength)*11.4;
            const u0=libraryFront?along(a):0,u1=libraryFront?along(b):bays*3.8;
            this.facades.quad(at(a, base), at(b, base), at(b, wall - 0.12), at(a, wall - 0.12), wallTint, kind, building,
              [[u0, 0], [u1, 0], [u1, rows * 3.6], [u0, rows * 3.6]]);
          }
          const z = Math.min(height - 0.07, wall);
          const low = Math.max(base, z - 0.23);
          const edge: Point[] = [a];
          const da = a[0] * ridgeAxis[0] + a[1] * ridgeAxis[1] - ridgeMiddle, db = b[0] * ridgeAxis[0] + b[1] * ridgeAxis[1] - ridgeMiddle;
          if (shape === 'gabled' && da * db < 0) { const t = da / (da - db); edge.push([a[0] + t * dx, a[1] + t * dy]); }
          edge.push(b);
          for (let j = 1; j < edge.length; j++) {
            const u = edge[j - 1], v = edge[j], roofA = roofPoint(u), roofB = roofPoint(v);
            if (Math.max(roofA[2], roofB[2]) > wall + 0.001) this.roofs.quad([u[0], u[1], wall], [v[0], v[1], wall], roofB, roofA, wallTint, 2, building);
          }
          // Modest cornices sit just beyond the wall; they do not replace the
          // source footprint or bridge a courtyard.
          this.roofs.quad(at(a, z, 0.16), at(b, z, 0.16), at(b, z, 0), at(a, z, 0), wallTint, 2, building);
          this.roofs.quad(at(a, low, 0.16), at(b, low, 0.16), at(b, z, 0.16), at(a, z, 0.16), wallTint, 2, building);
        }
      }
      // Keep malformed/unbounded future inputs from allocating an unlimited mesh.
      this.checkBudget(String(p.id));
    }
  }

  private checkBudget(id: string): void {
    if ((this.roofs.values.length + this.facades.values.length) / (VERTEX_FLOATS * 3) > MAX_DETAIL_TRIANGLES) throw new Error(`Campus detail exceeds ${MAX_DETAIL_TRIANGLES} triangles at ${id}.`);
  }

  finish(): DetailGeometry {
    if (!this.done) throw new Error('Campus geometry is not complete. Finish its feature slices first.');
    const roofs = new Float32Array(this.roofs.values), facades = new Float32Array(this.facades.values);
    const roofTriangles = roofs.length / VERTEX_FLOATS / 3, facadeTriangles = facades.length / VERTEX_FLOATS / 3;
    return { roofs, facades, buildings: this.data.features.length, roofTriangles, facadeTriangles, triangles: roofTriangles + facadeTriangles, bytes: roofs.byteLength + facades.byteLength };
  }
}

export function buildBuildingGeometry(data: CampusData): DetailGeometry {
  const builder = new BuildingGeometryBuilder(data);
  while (!builder.done) builder.step();
  return builder.finish();
}

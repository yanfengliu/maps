import earcut from 'earcut';
import { projectLocal, MERCATOR_ORIGIN, METERS_TO_MERCATOR, VERTEX_FLOATS, type CampusData, type DetailGeometry, type Point } from './building-geometry.ts';
import { emptyEnvironmentCounts } from './campus-environment.ts';
import { emptySculptureCounts } from './campus-sculptures.ts';
import { photoTriangles, APSE_BOTTOM, APSE_TOP, NAVE_MOSAIC, type PhotoRegion, type PhotoCorners } from './church-artwork.ts';

export const CHURCH_ID = 'way/836474103';
type V = [number, number, number];
type C = [number, number, number];
const stone: C = [0.83, 0.77, 0.64], ivory: C = [0.91, 0.86, 0.74], gold: C = [0.68, 0.54, 0.29];
const oak: C = [0.36, 0.23, 0.13], darkOak: C = [0.24, 0.15, 0.09], fir: C = [0.48, 0.25, 0.14];
const floor: C = [0.79, 0.76, 0.65], red: C = [0.50, 0.16, 0.16], metal: C = [0.65, 0.66, 0.60];

// Reference: Stanford's current layout and FY23 self-guided tour, and the
// 2019 interior/2011 organ photographs cited in design.md. This is an authored
// architectural section, not a measured interior survey. The west wall and
// west clerestory are cut away; the source footprint and height are unchanged.
function frame(data: CampusData) {
  const index = data.features.findIndex(f => f.properties?.id === CHURCH_ID), feature = data.features[index];
  if (!feature || feature.geometry.type !== 'Polygon') throw new Error('Memorial Church footprint is unavailable.');
  const ring = feature.geometry.coordinates[0].slice(0, -1).map(projectLocal);
  let a = ring[0], b = ring.at(-1)!;
  if (a[0] > b[0]) [a, b] = [b, a];
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: Point = [(b[0] - a[0]) / width, (b[1] - a[1]) / width], v: Point = [u[1], -u[0]];
  const origin: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const base = Number(feature.properties?.base), scale = (Number(feature.properties?.height) - base) / 24;
  if (!Number.isFinite(base) || !Number.isFinite(scale) || scale <= 0 || width < 1) throw new Error('Memorial Church has invalid dimensions.');
  const local = ring.map(p => [(p[0] - origin[0]) * u[0] + (p[1] - origin[1]) * u[1], (p[0] - origin[0]) * v[0] + (p[1] - origin[1]) * v[1]] as Point);
  const at = (p: V): V => [origin[0] + p[0] * u[0] + p[1] * v[0], origin[1] + p[0] * u[1] + p[1] * v[1], base + p[2] * scale];
  return { index, at, local };
}

/** Local x runs east, y goes from the Quad entrance toward the altar. */
export function churchInteriorLocation(data: CampusData, x: number, y: number): Point {
  const p = frame(data).at([x, y, 0]), mx = MERCATOR_ORIGIN[0] + p[0] * METERS_TO_MERCATOR, my = MERCATOR_ORIGIN[1] - p[1] * METERS_TO_MERCATOR;
  return [mx * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180 / Math.PI];
}

export function buildChurchInterior(data: CampusData): DetailGeometry {
  const { index, at, local } = frame(data), opaque: number[] = [], overhead: number[] = [];
  let kind = 2;
  const tri = (a: V, b: V, c: V, color: C, uv?: [Point, Point, Point]) => {
    const p = [at(a), at(b), at(c)], ab = p[1].map((n, i) => n - p[0][i]), ac = p[2].map((n, i) => n - p[0][i]);
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]], length = Math.hypot(...n);
    if (length < 1e-8) return;
    const target = kind === 30 ? overhead : opaque;
    for (let i = 0; i < 3; i++) target.push(...p[i], ...n.map(v => v / length), ...color, ...(uv?.[i] ?? [[a,b,c][i][0]+[a,b,c][i][1], [a,b,c][i][2]]), kind, index);
  };
  const quad = (a: V, b: V, c: V, d: V, color: C, uv?: [Point, Point, Point, Point]) => {
    tri(a, b, c, color, uv ? [uv[0], uv[1], uv[2]] : undefined); tri(a, c, d, color, uv ? [uv[0], uv[2], uv[3]] : undefined);
  };
  const photoTriangle = (region: PhotoRegion, points: [Point, Point, Point], position: (p: Point) => V) => {
    photoTriangles(region, points, (p, uv) => tri(position(p[0]), position(p[1]), position(p[2]), gold, uv));
  };
  const photoQuad = (a: V, b: V, c: V, d: V, region: PhotoRegion) => {
    const position = ([u, v]: Point): V => a.map((n, i) => (n * (1 - u) + b[i] * u) * (1 - v) + (d[i] * (1 - u) + c[i] * u) * v) as V;
    photoTriangle(region, [[0,0],[1,0],[1,1]], position); photoTriangle(region, [[0,0],[1,1],[0,1]], position);
  };
  const box = (x: number, y: number, z: number, w: number, d: number, h: number, color: C) => {
    const a: V = [x - w / 2, y - d / 2, z], b: V = [x + w / 2, y - d / 2, z], c: V = [x + w / 2, y + d / 2, z], e: V = [x - w / 2, y + d / 2, z];
    const up = (p: V): V => [p[0], p[1], p[2] + h];
    quad(a, b, up(b), up(a), color); quad(b, c, up(c), up(b), color); quad(c, e, up(e), up(c), color); quad(e, a, up(a), up(e), color); quad(up(a), up(b), up(c), up(e), color);
  };
  const cylinder = (x: number, y: number, z: number, r: number, h: number, color: C, sides = 16, topR = r) => {
    for (let i = 0; i < sides; i++) {
      const a = i * 2 * Math.PI / sides, b = (i + 1) * 2 * Math.PI / sides;
      const p: V = [x + Math.cos(a) * r, y + Math.sin(a) * r, z], q: V = [x + Math.cos(b) * r, y + Math.sin(b) * r, z];
      const u: V = [x + Math.cos(a) * topR, y + Math.sin(a) * topR, z + h], v: V = [x + Math.cos(b) * topR, y + Math.sin(b) * topR, z + h];
      quad(p, q, v, u, color); tri([x, y, z + h], u, v, color);
    }
  };
  const beam = (a: V, b: V, width: number, depth: number, color: C) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]), u: Point = length > 0 ? [-(b[1] - a[1]) / length * width / 2, (b[0] - a[0]) / length * width / 2] : [width / 2, 0];
    const p = (v: V, side: number, z: number): V => [v[0] + u[0] * side, v[1] + u[1] * side, v[2] + z * depth / 2];
    quad(p(a, -1, -1), p(b, -1, -1), p(b, -1, 1), p(a, -1, 1), color); quad(p(a, 1, -1), p(b, 1, -1), p(b, 1, 1), p(a, 1, 1), color);
    quad(p(a, -1, 1), p(b, -1, 1), p(b, 1, 1), p(a, 1, 1), color); quad(p(a, -1, -1), p(b, -1, -1), p(b, 1, -1), p(a, 1, -1), color);
  };
  // A solid arch ring with actual intrados and jamb depth, never a dark decal.
  const arch = (cx: number, cy: number, spring: number, radius: number, band: number, depth: number, side: boolean, color = ivory) => {
    const savedKind=kind;
    const p = (t: number, r: number, offset: number): V => side ? [cx + offset, cy + Math.cos(t) * r, spring + Math.sin(t) * r] : [cx + Math.cos(t) * r, cy + offset, spring + Math.sin(t) * r];
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 32, b = (i + 1) * Math.PI / 32;
      kind=savedKind===30?30:24;
      for (const face of [-1, 1]) quad(p(a, radius, depth * face / 2), p(b, radius, depth * face / 2), p(b, radius + band, depth * face / 2), p(a, radius + band, depth * face / 2), color,[[a*radius,0],[b*radius,0],[b*radius,band],[a*radius,band]]);
      kind=savedKind;
      quad(p(a, radius, -depth / 2), p(b, radius, -depth / 2), p(b, radius, depth / 2), p(a, radius, depth / 2), stone);
      quad(p(a, radius + band, -depth / 2), p(b, radius + band, -depth / 2), p(b, radius + band, depth / 2), p(a, radius + band, depth / 2), color);
    }
  };
  const column = (x: number, y: number, z: number, r: number, h: number) => {
    const savedKind=kind;kind=14;
    box(x, y, z, r * 2.5, r * 2.5, 0.40, stone);
    cylinder(x, y, z + 0.40, r * 1.1, 0.22, ivory);
    cylinder(x, y, z + 0.62, r, h - 1.48, stone, 24, r * 0.91);
    cylinder(x, y, z + h - 0.86, r * 0.94, 0.20, ivory);
    cylinder(x, y, z + h - 0.66, r, 0.48, ivory, 16, r * 1.30);
    // A shallow leaf crown breaks the capital silhouette at close scale.
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; cylinder(x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08, z + h - 0.61, 0.09, 0.40, gold, 5, 0.035); }
    box(x, y, z + h - 0.18, r * 2.7, r * 2.7, 0.18, ivory);
    kind=savedKind;
  };
  const polygon = (outline: Point[], z: number, color: C) => {
    const indices = earcut(outline.flat());
    for (let i = 0; i < indices.length; i += 3) tri([...outline[indices[i]], z], [...outline[indices[i + 1]], z], [...outline[indices[i + 2]], z], color);
  };
  // The floor and cut perimeter follow the pinned source, including Round Room.
  polygon(local, 0.12, floor);
  for (let i = 0; i < local.length; i++) {
    const a = local[i], b = local[(i + 1) % local.length];
    beam([...a, 0.5], [...b, 0.5], 0.32, 0.76, stone);
  }
  box(0, 24.4, 0.135, 1.8, 41.4, 0.025, red);
  for (const x of [-8.5, 8.5]) box(x, 17.7, 0.138, 0.10, 26.0, 0.012, gold);
  for (let y = 7; y < 30; y += 1.3) for (const x of [-10.3, 10.3]) box(x, y, 0.14, 2.7, 0.025, 0.006, [0.70, 0.67, 0.57]);

  // Oak pews have shaped ends, sloped backs, separate seats and kneelers.
  const pew = (x: number, y: number, length: number, angle = 0, curve = 0) => {
    const savedKind=kind;kind=16;
    const transform = (px: number, py: number, z: number): V => [x + px * Math.cos(angle) - py * Math.sin(angle), y + px * Math.sin(angle) + py * Math.cos(angle) + curve * px * px, z];
    const strip = (y0: number, y1: number, z0: number, z1: number, color: C) => {
      const segments = curve ? 8 : 1;
      for (let j = 0; j < segments; j++) {
        const a = -length / 2 + length * j / segments, b = -length / 2 + length * (j + 1) / segments;
        quad(transform(a, y0, z0), transform(b, y0, z0), transform(b, y1, z1), transform(a, y1, z1), color);
      }
    };
    strip(-0.08, 0.40, 0.58, 0.58, oak); strip(-0.16, -0.09, 1.13, 0.57, oak); strip(-0.19, -0.15, 1.15, 1.15, [0.49, 0.34, 0.21]); strip(0.52, 0.72, 0.24, 0.24, darkOak);
    for (const end of [-1, 1]) {
      const x0 = end * length / 2, profile: Point[] = [[-0.24, 0.16], [0.44, 0.16], [0.43, 0.72], [0.24, 0.88], [0.12, 1.25], [-0.15, 1.25], [-0.20, 0.80]];
      const ids = earcut(profile.flat());
      for (const side of [-0.055, 0.055]) for (let i = 0; i < ids.length; i += 3) tri(...ids.slice(i, i + 3).map(k => transform(x0 + side, profile[k][0], profile[k][1])) as [V, V, V], oak);
      for (let i = 0; i < profile.length; i++) { const a = profile[i], b = profile[(i + 1) % profile.length]; quad(transform(x0 - 0.055, a[0], a[1]), transform(x0 + 0.055, a[0], a[1]), transform(x0 + 0.055, b[0], b[1]), transform(x0 - 0.055, b[0], b[1]), oak); }
    }
    kind=savedKind;
  };
  for (let row = 0; row < 14; row++) for (const side of [-1, 1]) pew(side * 4.05, 7.7 + row * 1.17, 6.0);
  for (let row = 0; row < 12; row++) for (const side of [-1, 1]) pew(side * 4.25, 25.1 + row * 1.17, 6.4, side * 0.09, 0.025);
  for (const side of [-1, 1]) for (let row = 0; row < 6; row++) pew(side * (12.0 + row * 0.55), 31.0 + row * 1.55, 5.5, -side * 0.46);
  // The west transept is a side chapel, not a mirrored wall of pews.
  for (let row = 0; row < 6; row++) pew(19.0 + row * 0.7, 38.0, 7.0 - row * 0.6, Math.PI / 2);
  for (let row = 0; row < 4; row++) pew(-18.1 - row * 0.8, 38.0, 6.8 - row * 0.6, -Math.PI / 2);

  // Three nave arches on each side, two intermediate free-standing columns.
  const naveSpring = 5.65, bayRadius = 3.20;
  for (const side of [-1, 1]) {
    for (const y of [7.0, 14.4, 21.8, 29.2]) column(side * 7.65, y, 0.12, 0.53, naveSpring - 0.12);
    for (const y of [10.7, 18.1, 25.5]) {
      arch(side * 7.65, y, naveSpring, bayRadius, 0.46, 0.70, true);
      // Carved concentric mouldings and small rosettes around the arch face.
      arch(side * 7.65 - side * 0.38, y, naveSpring, bayRadius + 0.13, 0.06, 0.025, true, gold);
      for (let j = 0; j <= 16; j++) { const a = j * Math.PI / 16; const cy = y + Math.cos(a) * (bayRadius + 0.28), cz = naveSpring + Math.sin(a) * (bayRadius + 0.28); const r = 0.075; quad([side * 7.27, cy - r, cz], [side * 7.27, cy, cz + r], [side * 7.27, cy + r, cz], [side * 7.27, cy, cz - r], gold); }
    }
  }
  // Four compound crossing piers carry the much larger transverse arches.
  for (const x of [-7.65, 7.65]) for (const y of [29.2, 46.1]) {
    column(x, y, 0.12, 0.87, 8.45);
    column(x + Math.sign(x) * 1.05, y, 0.12, 0.42, 8.45);
    column(x, y + (y < 35 ? -1 : 1) * 0.96, 0.12, 0.38, 8.45);
  }
  for (const y of [29.2, 46.1]) { arch(0, y, 8.57, 6.78, 0.68, 1.10, false); arch(0, y - 0.57, 8.57, 7.0, 0.07, 0.04, false, gold); }
  for (const x of [-7.65, 7.65]) arch(x, 37.65, 8.57, 7.50, 0.65, 1.10, true);

  // Chancel: six shallow curved steps, patterned platform and altar rail.
  const frontArc = (r: number, y = 52): Point[] => Array.from({ length: 41 }, (_, i) => { const t = -0.91 + i * 1.82 / 40; return [Math.sin(t) * r, y - Math.cos(t) * r]; });
  for (let step = 0; step < 6; step++) {
    const r = 10.8 - step * 0.34, outline = frontArc(r), z = 0.15 + step * 0.18;
    polygon([...outline, [8.9, 53.0], [-8.9, 53.0]], z + 0.18, ivory);
    for (let i = 0; i < outline.length - 1; i++) quad([...outline[i], z], [...outline[i + 1], z], [...outline[i + 1], z + 0.18], [...outline[i], z + 0.18], stone);
    box(0, 52 - r + 0.17, z + 0.185, 1.8, 0.35, 0.008, red);
  }
  for (const center of [-4.8, 0, 4.8]) for (const r of [1.6, 1.8, 2.02]) for (let j = 0; j < 64; j++) {
    const a = j * Math.PI / 32, b = (j + 1) * Math.PI / 32;
    quad([center + Math.cos(a) * r, 48.0 + Math.sin(a) * r * 0.63, 1.235], [center + Math.cos(b) * r, 48.0 + Math.sin(b) * r * 0.63, 1.235], [center + Math.cos(b) * (r + 0.05), 48.0 + Math.sin(b) * (r + 0.05) * 0.63, 1.235], [center + Math.cos(a) * (r + 0.05), 48.0 + Math.sin(a) * (r + 0.05) * 0.63, 1.235], gold);
  }
  const railing = (a: Point, b: Point, z: number, wood = false) => {
    const color = wood ? oak : ivory, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    beam([...a, z + 1.0], [...b, z + 1.0], 0.20, 0.15, color); beam([...a, z + 0.10], [...b, z + 0.10], 0.22, 0.16, color);
    for (let i = 0; i <= Math.ceil(length / 0.32); i++) { const t = i / Math.ceil(length / 0.32), x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; cylinder(x, y, z + 0.17, 0.052, 0.70, color, 6, 0.065); }
  };
  for (const side of [-1, 1]) railing([side * 1.2, 50.2], [side * 8.3, 50.2], 1.23);
  // White altar, low gilded cross, three chancel windows and candle niches.
  box(0, 55.3, 0.12, 11.0, 5.6, 1.11, floor); box(0, 54.9, 1.23, 4.0, 1.5, 0.20, ivory);
  box(0, 54.9, 1.43, 3.25, 1.20, 1.0, ivory); box(0, 54.9, 2.43, 4.0, 1.55, 0.18, ivory);
  box(0, 55.05, 2.61, 0.10, 0.10, 0.95, gold); box(0, 55.05, 3.17, 0.64, 0.10, 0.10, gold);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = side * (4.1 + i * 0.95), y = 55.4 - i * 0.35;
    box(x, y, 1.25, 0.60, 0.64, 0.60, oak); box(x, y + 0.25, 1.80, 0.60, 0.12, 1.18, oak); box(x, y + 0.17, 1.95, 0.41, 0.025, 0.82, [0.26, 0.28, 0.34]);
  }
  // Curved apse wall uses the mapped facets; repeated small niches are open.
  for (let i = 24; i < 31; i++) {
    const a = local[i], b = local[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    quad([...a, 1.2], [...b, 1.2], [...b, 13.0], [...a, 13.0], gold);
    beam([...a, 5.0], [...b, 5.0], 0.18, 0.22, ivory); beam([...a, 12.8], [...b, 12.8], 0.22, 0.24, ivory);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length;
    if (Math.abs(mx) > 2) for (const offset of [-0.70, 0.70]) {
      const x = mx + ux * offset + uy * 0.18, y = my + uy * offset - ux * 0.18;
      const p=(s:number,z:number,depth=0):V=>[x+ux*s+uy*depth,y+uy*s-ux*depth,z];
      for(const sign of [-1,1])column(x+ux*sign*0.54,y+uy*sign*0.54,1.25,0.10,2.35);
      quad(p(-0.43,1.28),p(0.43,1.28),p(0.43,3.60),p(-0.43,3.60),[0.56,0.43,0.24]);
      for(let j=0;j<20;j++){const a=j*Math.PI/20,b=(j+1)*Math.PI/20;quad(p(Math.cos(a)*0.43,3.60+Math.sin(a)*0.43,0.02),p(Math.cos(b)*0.43,3.60+Math.sin(b)*0.43,0.02),p(Math.cos(b)*0.61,3.60+Math.sin(b)*0.61,0.02),p(Math.cos(a)*0.61,3.60+Math.sin(a)*0.61,0.02),ivory);tri(p(0,3.60),p(Math.cos(a)*0.43,3.60+Math.sin(a)*0.43),p(Math.cos(b)*0.43,3.60+Math.sin(b)*0.43),[0.56,0.43,0.24]);}
      cylinder(x+uy*0.23,y-ux*0.23,1.30,0.24,0.16,ivory,12);cylinder(x+uy*0.23,y-ux*0.23,1.46,0.035,1.05,ivory,6);
    }
  }
  // Pulpit left from the visitor's view (east), brass lectern opposite.
  cylinder(6.45, 46.9, 1.23, 0.58, 1.25, stone, 10, 0.95); cylinder(6.45, 46.9, 2.48, 1.10, 0.80, ivory, 12); cylinder(6.45, 46.9, 3.28, 1.15, 0.13, gold, 12);
  cylinder(-6.45, 47.0, 1.23, 0.53, 0.18, gold); cylinder(-6.45, 47.0, 1.41, 0.08, 1.55, gold, 10); beam([-6.9, 46.7, 2.92], [-6.0, 47.2, 3.18], 0.55, 0.08, gold);

  // East aisle retains the full wall and arched glazed bays. The western wall
  // is deliberately sectioned at the sill so the pews can be inspected.
  const window = (cx: number, cy: number, bottom: number, top: number, radius: number, side: boolean, corners: PhotoCorners) => {
    const spring = top - radius, point = (x: number, z: number): V => side ? [cx, cy + x, z] : [cx + x, cy, z];
    const savedKind=kind;kind=22;
    const region:PhotoRegion={size:[1280,853],corners};
    const wall=(x:number,z:number):Point=>[(x/radius+1)*0.5,(z-bottom)/(top-bottom)];
    const position=([u,v]:Point)=>point((u*2-1)*radius,bottom+v*(top-bottom));
    photoTriangle(region,[wall(-radius,bottom),wall(radius,bottom),wall(radius,spring)],position);
    photoTriangle(region,[wall(-radius,bottom),wall(radius,spring),wall(-radius,spring)],position);
    for(let i=0;i<24;i++){const a=i*Math.PI/24,b=(i+1)*Math.PI/24,x0=Math.cos(a)*radius,z0=spring+Math.sin(a)*radius,x1=Math.cos(b)*radius,z1=spring+Math.sin(b)*radius;photoTriangle(region,[wall(0,spring),wall(x0,z0),wall(x1,z1)],position);}
    kind=savedKind;
    arch(cx, cy, spring, radius + 0.03, 0.22, 0.18, side);
    for (const s of [-1, 1]) beam(point(s * (radius + 0.14), bottom), point(s * (radius + 0.14), spring), 0.20, 0.18, ivory);
    for (let i = 1; i < 4; i++) { const z = bottom + (top - bottom) * i / 4; beam(point(-radius, z), point(radius, z), 0.04, 0.045, darkOak); }
  };
  quad([12.0, 6.5, 0.9], [12.0, 29.2, 0.9], [12.0, 29.2, 9.4], [12.0, 6.5, 9.4], gold);
  window(11.95,10.7,2.1,8.2,1.18,true,[[85,613],[145,592],[134,400],[83,391]]);
  window(11.95,25.5,2.1,8.2,1.9,true,[[353,551],[404,530],[400,377],[352,366]]);
  kind=22;
  photoQuad([11.94,15.6,3.0],[11.94,20.6,3.0],[11.94,20.6,6.6],[11.94,15.6,6.6],
    {size:[1280,853],corners:[[217,572],[309,558],[309,470],[217,461]]});
  kind=2;
  quad([7.65, 6.5, 9.3], [7.65, 29.2, 9.3], [7.65, 29.2, 16.9], [7.65, 6.5, 16.9], gold);
  const upperWindows:PhotoCorners[]=[[[67,116],[113,137],[113,0],[67,0]],[[240,202],[263,213],[263,99],[240,87]],[[295,226],[312,235],[312,147],[295,138]],[[368,272],[379,277],[379,219],[368,212]],[[395,285],[403,290],[403,240],[395,234]]];
  for (let i = 0; i < 5; i++) window(7.60, 8.5 + i * 4.4, 12.4, 16.25, 0.82, true,upperWindows[i]);
  // Licensed photographic regions keep the narrative mosaics recognizable.
  // Rectify planar photos before the map camera projects them again. Curved
  // apse strips instead follow shared, measured image cornices. Pixel control
  // points remain authored estimates rather than an orthophoto survey.
  // Image bytes and attribution are in public/textures/ATTRIBUTION.md.
  kind = 22;
  photoQuad([7.58, 6.5, 9.3], [7.58, 29.2, 9.3], [7.58, 29.2, 12.2], [7.58, 6.5, 12.2], NAVE_MOSAIC);
  kind = 23;
  for (let i = 24; i < 30; i++) {
    const a=local[i],b=local[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const nx=(b[1]-a[1])/length*0.045,ny=-(b[0]-a[0])/length*0.045;
    const j=i-24;
    photoQuad([a[0]+nx,a[1]+ny,5.0],[b[0]+nx,b[1]+ny,5.0],[b[0]+nx,b[1]+ny,12.8],[a[0]+nx,a[1]+ny,12.8],
      { size:[960,720], corners:[APSE_BOTTOM[j],APSE_BOTTOM[j+1],APSE_TOP[j+1],APSE_TOP[j]], curved:true });
  }
  photoQuad([-2.0,59.35,2.8],[2.0,59.35,2.8],[2.0,59.35,5.0],[-2.0,59.35,5.0],
    { size:[960,720], corners:[[560,659],[445,658],[447,595],[560,594]] });
  kind=2;

  // Galleries sit over the transepts, with pale carved rails and visible stair
  // flights behind the crossing piers. Their front edge remains open below.
  for (const side of [-1, 1]) {
    box(side * 17.7, 37.9, 6.2, 8.0, 12.2, 0.36, stone);
    railing([side * 13.7, 31.8], [side * 13.7, 44.0], 6.56);
    for (const y of [32.2, 43.6]) column(side * 14.1, y, 0.12, 0.39, 6.08);
    for (let i = 0; i < 17; i++) { const a = i * Math.PI / 17, x = side * (11.3 + Math.cos(a) * 1.8), y = 27.0 + Math.sin(a) * 1.8; box(x, y, 0.2 + i * 0.35, 0.85, 0.65, 0.35, stone); }
    for (let row = 0; row < 4; row++) { const z = 6.56 + row * 0.18; box(side * (15.3 + row * 1.1), 38.0, z, 0.42, 9.0, 0.44, oak); box(side * (15.5 + row * 1.1), 38.0, z + 0.4, 0.12, 9.0, 0.65, oak); }
  }

  // Organ loft: redwood Fisk-Nanney case in the centre, original Murray-Harris
  // pipe groups at each side. Pipe counts below are a visible facade estimate.
  box(0, 3.3, 5.4, 22.4, 5.8, 0.42, stone); railing([-10.9, 6.2], [10.9, 6.2], 5.82);
  box(0, 2.3, 5.82, 11.9, 2.5, 9.1, fir);
  const pipeRank = (cx: number, cy: number, z: number, width: number, count: number, high: number, low: number, tint: C) => {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1), x = cx + (t - 0.5) * width, h = low + (high - low) * (1 - Math.abs(t - 0.5) * 2);
      cylinder(x, cy, z, width / count * 0.32, h, tint, 10);
      box(x, cy + width / count * 0.32 + 0.002, z + 0.50, width / count * 0.43, 0.025, 0.13, [0.22, 0.22, 0.20]);
      cylinder(x, cy, z - 0.30, width / count * 0.11, 0.30, tint, 8, width / count * 0.32);
    }
  };
  for (const [x, w, h] of [[-4.5, 2.3, 6.3], [-2.0, 1.8, 5.3], [0, 1.8, 7.1], [2.0, 1.8, 5.3], [4.5, 2.3, 6.3]]) {
    box(x, 3.65, 8.2, w + 0.20, 0.26, h + 0.42, darkOak); pipeRank(x, 3.86, 8.65, w - 0.25, 9, h - 0.1, h - 1.8, metal);
    for (const side of [-1, 1]) box(x + side * (w / 2 + 0.12), 4.02, 8.0, 0.15, 0.30, h + 0.8, fir);
    box(x, 4.02, 8.1, w + 0.4, 0.4, 0.18, gold);
    box(x,4.02,8.2+h+0.3,w+0.45,0.50,0.15,gold);
    for(const side of [-1,1]){
      box(x+side*(w/2+0.12),4.18,8.2+h-0.5,0.10,0.025,0.70,[0.27,0.40,0.30]);
      cylinder(x+side*(w/2+0.12),4.02,8.2+h+0.45,0.10,0.24,gold,8,0.025);
    }
  }
  for (const side of [-1, 1]) {
    box(side * 3.65, 4.3, 6.05, 2.8, 1.05, 2.05, fir); pipeRank(side * 3.65, 4.87, 6.3, 2.35, 13, 2.7, 1.55, metal);
    box(side * 3.65, 4.9, 6.07, 2.7, 0.15, 0.27, [0.35, 0.46, 0.33]);
    for(const direction of [-1,1]){
      const x=side*3.65+direction*0.8;
      quad([x,4.96,8.15],[x+direction*0.65,5.15,8.45],[x+direction*0.65,5.15,9.15],[x,4.96,8.85],[0.30,0.43,0.31]);
    }
    box(side * 8.9, 3.3, 5.82, 4.1, 2.6, 3.4, oak); pipeRank(side * 8.9, 4.68, 7.4, 3.75, 17, 6.7, 3.8, [0.54, 0.53, 0.43]);
    box(side * 8.9, 4.85, 7.10, 4.0, 0.30, 0.22, gold);
  }
  box(0, 4.15, 6.0, 2.7, 1.1, 1.05, fir);
  for (let manual = 0; manual < 4; manual++) {
    box(0, 4.80 + manual * 0.055, 6.66 + manual * 0.12, 1.5, 0.22, 0.035, ivory);
    for (let key = 0; key < 24; key++) if (key % 7 !== 2 && key % 7 !== 6) box(-0.72 + key * 0.06, 4.83 + manual * 0.055, 6.70 + manual * 0.12, 0.025, 0.11, 0.025, darkOak);
  }
  // Ceiling is independently switchable. Its construction follows the open
  // timber nave and chancel and the shallow crossing dome, not a gothic vault.
  kind = 30;
  for (const side of [-1, 1]) {
    // Open framing preserves the cutaway even when overhead structure is on.
    for (let i = 1; i < 6; i++) beam([side * i * 1.27, 5.5, 21.4 - i * 0.73], [side * i * 1.27, 29.2, 21.4 - i * 0.73], 0.13, 0.16, darkOak);
    for (const y of [7.1, 14.4, 21.8, 28.7]) { beam([side * 7.65, y, 16.7], [0, y, 21.1], 0.38, 0.50, darkOak); beam([side * 7.65, y, 16.7], [side * 4.9, y, 16.7], 0.45, 0.40, fir); beam([side * 7.3, y, 14.8], [side * 4.9, y, 16.7], 0.32, 0.40, fir); }
  }
  for (const r0 of [1.5,3.5,5.4,7.2]) for (let i = 0; i < 64; i++) {
    const a = i * Math.PI / 32, b = (i + 1) * Math.PI / 32, r1 = r0 + 0.09;
    const p = (t: number, r: number): V => [Math.cos(t) * r, 37.65 + Math.sin(t) * r, 22.0 - (r / 7.3) ** 2 * 5.0];
    quad(p(a, r0), p(b, r0), p(b, r1), p(a, r1), gold);
  }
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16; tri([0, 37.65, 22], [Math.cos(a) * 1.5, 37.65 + Math.sin(a) * 1.5, 22], [Math.cos(b) * 1.5, 37.65 + Math.sin(b) * 1.5, 22], [0.82, 0.88, 0.85]); }
  for(let i=0;i<12;i++){const a=i*Math.PI/6;beam([0,37.65,22.04],[Math.cos(a)*1.5,37.65+Math.sin(a)*1.5,22.04],0.025,0.03,gold);for(let j=0;j<8;j++){const r0=1.5+j*0.7,r1=r0+0.7;beam([Math.cos(a)*r0,37.65+Math.sin(a)*r0,22-(r0/7.3)**2*5],[Math.cos(a)*r1,37.65+Math.sin(a)*r1,22-(r1/7.3)**2*5],0.06,0.07,ivory);}}
  for (let i = 24; i < 31; i++) { const a = local[i]; beam([0, 51, 19.8], [...a, 12.8], 0.25, 0.30, darkOak); }

  const roofs = new Float32Array(overhead), facades = new Float32Array(opaque), triangles = (roofs.length + facades.length) / VERTEX_FLOATS / 3;
  if (triangles > 100_000 || roofs.byteLength + facades.byteLength > 16 * 1024 * 1024) throw new Error('Church interior exceeds its dedicated detail budget.');
  return { roofs, facades, churchTextures: true, buildings: 1, roofTriangles: roofs.length / VERTEX_FLOATS / 3, facadeTriangles: facades.length / VERTEX_FLOATS / 3, triangles, bytes: roofs.byteLength + facades.byteLength, environment: emptyEnvironmentCounts(), sculptures: emptySculptureCounts() };
}

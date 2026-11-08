import type { Point } from './building-geometry.ts';

/** Source pixels, ordered bottom-left, bottom-right, top-right, top-left. */
export type PhotoCorners = [Point, Point, Point, Point];
export interface PhotoRegion { size: Point; corners: PhotoCorners; curved?: boolean }

/** Inverse rectification: an upright wall rectangle samples a photographed quad.
 * A projective transform keeps lines straight; bilinear/triangle UV interpolation
 * alone leaves the original camera's keystone distortion baked into the wall. */
export function photoProjection({ size, corners: [p0, p1, p2, p3], curved }: PhotoRegion) {
  // A curved apse is not one photographed plane. Unwrap each measured strip
  // between its cornices, sharing identical edge samples with its neighbours.
  if (curved) return ([u, v]: Point): Point => [0, 1].map(i =>
    ((p0[i] * (1 - u) + p1[i] * u) * (1 - v) + (p3[i] * (1 - u) + p2[i] * u) * v) / size[i]) as Point;
  const dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], dx3 = p0[0] - p1[0] + p2[0] - p3[0];
  const dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], dy3 = p0[1] - p1[1] + p2[1] - p3[1];
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 1e-8) throw new Error('Degenerate church artwork calibration.');
  const g = (dx3 * dy2 - dx2 * dy3) / determinant, h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const a = p1[0] - p0[0] + g * p1[0], b = p3[0] - p0[0] + h * p3[0];
  const d = p1[1] - p0[1] + g * p1[1], e = p3[1] - p0[1] + h * p3[1];
  return ([u, v]: Point): Point => {
    const q = 1 + g * u + h * v;
    return [(a * u + b * v + p0[0]) / q / size[0], (d * u + e * v + p0[1]) / q / size[1]];
  };
}

export const APSE_BOTTOM: Point[] = [[846,516],[726,554],[613,575],[500,579],[387,574],[274,553],[169,515]];
export const APSE_TOP: Point[] = [[828,330],[714,364],[606,383],[500,388],[394,383],[286,365],[186,329]];
export const NAVE_MOSAIC: PhotoRegion = { size:[1280,853], corners:[[10,230],[420,348],[420,303],[10,99]] };

/** Refine triangles whose UV edge-midpoint error exceeds 0.20 source pixels,
 * with a depth cap of eight. Tests additionally sample interiors below 0.5 px;
 * this is not a proven global error bound. Keeps the shared vertex layout and
 * draw count. Wall-unit coordinates let arch clipping use the same mapping. */
export function photoTriangles(region: PhotoRegion, triangle: [Point, Point, Point], emit: (p: [Point, Point, Point], uv: [Point, Point, Point]) => void) {
  const project = photoProjection(region);
  const split = (p: [Point, Point, Point], depth: number) => {
    const uv = p.map(project) as [Point, Point, Point];
    const mid = p.map((a, i): Point => [(a[0] + p[(i + 1) % 3][0]) / 2, (a[1] + p[(i + 1) % 3][1]) / 2]) as [Point, Point, Point];
    const error = Math.max(...mid.map((m, i) => {
      const actual = project(m), next = uv[(i + 1) % 3];
      return Math.hypot((actual[0] - (uv[i][0] + next[0]) / 2) * region.size[0], (actual[1] - (uv[i][1] + next[1]) / 2) * region.size[1]);
    }));
    if (error > 0.20 && depth < 8) {
      split([p[0], mid[0], mid[2]], depth + 1); split([mid[0], p[1], mid[1]], depth + 1);
      split([mid[2], mid[1], p[2]], depth + 1); split([mid[0], mid[1], mid[2]], depth + 1);
    } else emit(p, uv);
  };
  split(triangle, 0);
}

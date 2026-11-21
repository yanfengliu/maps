import earcut from 'earcut';

type Point = [number, number];
type Triangle = [Point, Point, Point];
/** Roof registration in metres along the mapped Escondido Mall return.
 * The enclosing eaves are the exact OSM vertices. Only internal junctions
 * are interpreted from the 2022 NAIP orthophoto, adjusted for roof lean.
 * The imagery resolves three red upper fields and the perimeter hips,
 * but cannot measure their pitch. Heights are fractions of the source rise.
 * Call only after the pinned component signature in campusRoof succeeds.
 */
export function greenEastRoof(outline: Point[]) {
  const origin = outline[3], end = outline[6];
  const length = Math.hypot(end[0] - origin[0], end[1] - origin[1]);
  const ux = (end[0] - origin[0]) / length, uy = (end[1] - origin[1]) / length;
  const elevations = new Map<Point, number>();
  const junction = (u: number, v: number, fraction: number): Point => {
    const p: Point = [origin[0] + u * ux - v * uy, origin[1] + u * uy + v * ux];
    elevations.set(p, fraction);
    return p;
  };

  const upper = (u: number, v: number) => junction(u, v, .88);
  const westNW = upper(9.5, 33), westSW = upper(9.5, 9.4);
  const middleNW = upper(25, 33), westSE = upper(25, 9.4), middleSW = upper(25, -7);
  const middleNE = upper(40.5, 33), eastNW = upper(40.5, 24.2);
  const middleSE = upper(40.5, -7), eastSW = upper(40.5, -14.5);
  const eastNE = upper(55.7, 24.2), eastSE = upper(55.7, -14.5);
  const northWest = junction(16, 38, 1), northMiddle = junction(32.5, 38, 1);
  const northEast = junction(48, 29, 1);
  const southWest = junction(15.2, 4.7, 1), southMiddle = junction(30.5, -11.6, 1);
  const southEast = junction(48.0, -20, 1);
  const triangles: Triangle[] = [];
  const face = (...vertices: (number | Point)[]) => {
    const points = vertices.map(v => typeof v === 'number' ? outline[v] : v);
    const indices = earcut(points.flat());
    for (let i = 0; i < indices.length; i += 3) {
      triangles.push([points[indices[i]], points[indices[i + 1]], points[indices[i + 2]]]);
    }
  };

  // Three staggered upper fields. Include the junctions where one field
  // continues beyond its neighbour so each transition shares its vertices.
  face(westNW, westSW, westSE, middleNW);
  face(middleNW, westSE, middleSW, middleSE, eastNW, middleNE);
  face(eastNW, middleSE, eastSW, eastSE, eastNE);

  // West return and the three groups of hips facing Escondido Mall.
  face(26, 27, 0, 1, 2, 3, westSW, westNW);
  face(3, 4, 5, 6, southWest, westSW);
  face(westSW, southWest, westSE);
  face(6, 7, 8, middleSW, westSE, southWest);
  face(8, 9, southMiddle, middleSW);
  face(middleSW, southMiddle, middleSE);
  face(9, 10, eastSW, middleSE, southMiddle);
  face(10, 11, southEast, eastSW);
  face(eastSW, southEast, eastSE);
  face(11, 12, 13, eastSE, southEast);

  // The opposite eaves step twice around the projecting north end bays.
  face(13, 14, 15, 16, 17, 18, 19, eastNE, eastSE);
  face(19, 20, northEast, eastNE);
  face(eastNE, northEast, eastNW);
  face(20, 21, middleNE, eastNW, northEast);
  face(21, 22, northMiddle, middleNE);
  face(middleNE, northMiddle, middleNW);
  face(22, 23, middleNW, northMiddle);
  face(23, 24, northWest, middleNW);
  face(middleNW, northWest, westNW);
  face(24, 25, 26, westNW, northWest);
  return {
    triangles,
    fraction: (p: Point) => elevations.get(p) ?? 0,
    edge: (a: Point, b: Point) => [a, b],
    uv: (p: Point): Point => [(p[0] - origin[0]) * ux + (p[1] - origin[1]) * uy,
      -(p[0] - origin[0]) * uy + (p[1] - origin[1]) * ux],
    flat: (tri: Triangle) => tri.every(p => elevations.get(p) === .88),
  };
}

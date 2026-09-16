/** Authored treatment, not surveyed paint. GSI aerial tiles inspected at native
 * 256px show separators and approach arrows west of the Scramble Crossing.
 * Source OSM ways fix the roadway and lane/turn counts. Inferred dimensions are
 * explicit below; the source polygons remain in build-markings.ts separately.
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import type { NetworkData, WorldPoint } from "../../src/world/network-data.ts";
type Node = { type: "node"; id: number; lat: number; lon: number };
type Way = { type: "way"; id: number; nodes: number[]; tags: Record<string, string> };
type Point = { x: number; y: number; z: number };
type HeightAt = (x: number, z: number) => number | undefined;
const WAY_IDS = [1298036687, 1134562285, 1109680533, 23334685, 1134562282];
const DIMENSIONS = { laneWidthM: 3.25, separatorWidthM: 0.15, dashLengthM: 3, dashPeriodM: 7, arrowLengthM: 4.2, arrowWidthM: 1.4, crossingMarginM: 1 };

function distanceToSegment(p: Point, a: WorldPoint, b: WorldPoint): number {
  const dx = b.x - a.x; const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}

export async function heroPaint(road: HeightAt): Promise<{ positions: number[]; provenance: object }> {
  const source = await readFile("data/osm/shibuya-aoi.osm.json");
  const osm = JSON.parse(source.toString("utf8")) as { elements: (Node | Way)[] };
  const network = JSON.parse(await readFile("data/network/network.json", "utf8")) as NetworkData;
  const osmSha256 = createHash("sha256").update(source).digest("hex");
  if (network.provenance.osmSha256 !== osmSha256) throw new Error("Hero paint crossing exclusions use an older OSM source than the authored lane tags; run npm run data:network before npm run data:markings.");
  const nodes = new Map(osm.elements.filter((e): e is Node => e.type === "node").map((n) => [n.id, n]));
  const positions: number[] = []; const records: object[] = [];
  const insideCrossing = (point: Point): boolean => network.physical.crossings.some((c) => c.paths.some((path) => path.slice(1).some((b, i) => distanceToSegment(point, path[i]!, b) < c.widthM / 2 + DIMENSIONS.crossingMarginM)));
  const triangle = (a: Point, b: Point, c: Point): void => {
    const points = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z) > 0 ? [a, b, c] : [a, c, b];
    const heights = points.map((p) => road(p.x, p.z));
    if (heights.some((h) => h === undefined) || points.some(insideCrossing)) return;
    points.forEach((p, i) => positions.push(p.x, heights[i]! + 0.045, p.z));
  };
  const rectangle = (a: Point, b: Point, width: number): void => {
    const length = Math.hypot(b.x - a.x, b.z - a.z); if (length < 0.01) return;
    const nx = -(b.z - a.z) / length * width / 2; const nz = (b.x - a.x) / length * width / 2;
    const p = [{ ...a, x: a.x - nx, z: a.z - nz }, { ...a, x: a.x + nx, z: a.z + nz }, { ...b, x: b.x + nx, z: b.z + nz }, { ...b, x: b.x - nx, z: b.z - nz }];
    triangle(p[0]!, p[1]!, p[2]!); triangle(p[0]!, p[2]!, p[3]!);
  };
  const authoredWays = new Set<number>();
  for (const id of WAY_IDS) {
    if (authoredWays.has(id)) continue; authoredWays.add(id);
    const way = osm.elements.find((e): e is Way => e.type === "way" && e.id === id);
    if (!way || way.tags["lanes"] !== "4") throw new Error(`Hero paint source way ${id} no longer has the reviewed four-lane tag; inspect current imagery and revise the authored record.`);
    const points = way.nodes.map((nodeId) => {
      const node = nodes.get(nodeId); if (!node) throw new Error(`Hero paint way ${id} is missing source node ${nodeId}; fetch the complete OSM extract.`);
      return planeRectangularToWorld(geographicToPlaneRectangular(node.lat, node.lon, 0), AOI_ORIGIN_EPSG6677);
    });
    const before = positions.length;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!; const b = points[i]!; const length = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / length; const dz = (b.z - a.z) / length;
      const sample = (distance: number, offset: number): Point => ({ x: a.x + dx * distance - dz * offset, y: 0, z: a.z + dz * distance + dx * offset });
      // Eastward source direction: north (negative offset) is left-hand travel.
      for (const offset of [-DIMENSIONS.laneWidthM, 0, DIMENSIONS.laneWidthM]) {
        for (let distance = 0.5; distance + 1 < length; distance += DIMENSIONS.dashPeriodM) rectangle(sample(distance, offset), sample(Math.min(length, distance + DIMENSIONS.dashLengthM), offset), DIMENSIONS.separatorWidthM);
      }
      if (id === 1298036687) {
        if (way.tags["turn:lanes:backward"] !== "through|right") throw new Error(`Hero turn arrows on way ${id} need the reviewed through|right backward lane tags; revise their source proof before rendering.`);
        const centre = length / 2;
        for (const [lane, turn] of ["right", "through"].entries()) {
          const offset = (lane + 0.5) * DIMENSIONS.laneWidthM;
          const tip = sample(centre - 2.1, offset); const tail = sample(centre + 2.1, offset);
          rectangle(tail, sample(centre - 0.65, offset), 0.2);
          if (turn === "through") triangle(tip, sample(centre - 0.35, offset + 0.7), sample(centre - 0.35, offset - 0.7));
          else {
            const bend = sample(centre - 0.65, offset); const end = sample(centre - 0.65, offset - 1.1);
            rectangle(bend, end, 0.2);
            triangle(sample(centre - 0.65, offset - 1.55), sample(centre - 1.3, offset - 0.65), sample(centre, offset - 0.65));
          }
        }
      }
    }
    records.push({ sourceWayId: id, sourceTags: way.tags, triangles: (positions.length - before) / 9 });
  }
  return { positions, provenance: { kind: "authored", reason: "Bounded west Scramble approach treatment from inspected GSI aerial imagery and OSM lane/turn tags; source positions, inferred dimensions, not surveyed paint.", osmSha256, reference: "decorations/paint-reference/provenance.json", inferredDimensions: DIMENSIONS, records } };
}

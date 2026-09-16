/** The one lower passage independently checked in review 4. Other surfaces
 * below the TIN remain unclassified; height alone never admits this recipe. */
import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";
import { partitionPatch, patchArea, planeHeight, splitPatch, type HeightPlane, type PlanPoint } from "./pavement-overlay.ts";
import { heightPlane, plan, triangulate } from "./pavement-geometry.ts";
import type { PavementSourcePiece, Point, SourceIdentity } from "./select-pavement-source.ts";

export const LOWER_PAVEMENT_SOURCE = "poly_b6334821-d28d-446a-b791-33ee343ef14a";
export const LOWER_BRIDGE_ID = "brid_cb8a47ec-def6-47a9-9366-b294a047ee63";
export const LOWER_BRIDGE_POLYGONS = ["poly-3b73ad3b-ec53-4a60-85a1-4ba8415613c4", "poly-6b079e30-bf3e-4752-8263-e4c52e306bad"] as const;
export interface BridgeSurface { id: string; points: Point[] }
export interface LowerPiece { source: SourceIdentity; aliases: SourceIdentity[]; layer: "reviewed-lower-passage"; bridgeId: string; bridgePolygon: string; ring: Point[]; sourcePlane: HeightPlane; upperPlane: HeightPlane }

/** Reads only the exact reviewed bridge/polygons from pinned raw CityGML.
 * Holes or duplicate IDs need a new review rather than a first-ring fallback. */
export function readLowerBridge(xml: string): BridgeSurface[] {
  const bridges = [...xml.matchAll(/<brid:Bridge\b([^>]*)>([\s\S]*?)<\/brid:Bridge>/g)].filter((m) => /gml:id="([^"]+)"/.exec(m[1]!)?.[1] === LOWER_BRIDGE_ID);
  if (bridges.length !== 1) throw new Error(`Expected one reviewed bridge ${LOWER_BRIDGE_ID}, found ${bridges.length}; restore the pinned source or review the lower-passage binding.`);
  const surfaces: BridgeSurface[] = [];
  for (const match of bridges[0]![2]!.matchAll(/<gml:Polygon\b([^>]*)>([\s\S]*?)<\/gml:Polygon>/g)) {
    const id = /gml:id="([^"]+)"/.exec(match[1]!)?.[1];
    if (!LOWER_BRIDGE_POLYGONS.some((expected) => expected === id)) continue;
    const rings = [...match[2]!.matchAll(/<gml:posList[^>]*>([^<]+)<\/gml:posList>/g)];
    if (rings.length !== 1 || /<gml:interior\b/.test(match[2]!)) throw new Error(`Reviewed bridge polygon ${id} must have one exterior and no holes; re-review its source geometry.`);
    const values = rings[0]![1]!.trim().split(/\s+/).map(Number);
    if (values.length < 9 || values.length % 3 || !values.every(Number.isFinite)) throw new Error(`Bridge polygon ${id} has invalid latitude/longitude/height triples; restore its pinned source.`);
    const points: Point[] = [];
    for (let i = 0; i < values.length; i += 3) {
      const p = planeRectangularToWorld(geographicToPlaneRectangular(values[i]!, values[i + 1]!, values[i + 2]!), AOI_ORIGIN_EPSG6677);
      points.push([p.x, p.y, p.z]);
    }
    surfaces.push({ id: id!, points });
  }
  for (const id of LOWER_BRIDGE_POLYGONS) if (surfaces.filter((s) => s.id === id).length !== 1) throw new Error(`Expected one reviewed bridge polygon ${id}; restore the source or review the lower-passage binding.`);
  return surfaces;
}

export function clipLowerPavement(source: PavementSourcePiece, surfaces: readonly BridgeSurface[]) {
  if (source.source.polygonId !== LOWER_PAVEMENT_SOURCE || source.source.lod !== 3) throw new Error(`Lower-passage recipe requires LOD3 source ${LOWER_PAVEMENT_SOURCE}; another low surface is not evidence of the same layer.`);
  const sourcePlane = heightPlane(source.ring), originalRing = plan(source.ring);
  let remainder: PlanPoint[][] = [originalRing]; const lower: LowerPiece[] = [];
  for (const surface of surfaces) for (const triangle of triangulate(surface.points)) {
    const upperPlane = heightPlane(triangle), footprint = plan(triangle), next: PlanPoint[][] = [];
    for (const ring of remainder) {
      const part = partitionPatch(ring, footprint); next.push(...part.outside);
      if (patchArea(part.inside) < 1e-12) continue;
      const [proved, uncertain] = splitPatch(part.inside, (p) => planeHeight(upperPlane, p) - planeHeight(sourcePlane, p) - .5);
      if (patchArea(proved) > 1e-12) lower.push({ source: source.source, aliases: source.aliases, layer: "reviewed-lower-passage", bridgeId: LOWER_BRIDGE_ID, bridgePolygon: surface.id, ring: proved.map((p): Point => [p[0], planeHeight(sourcePlane, p), p[1]]), sourcePlane, upperPlane });
      if (patchArea(uncertain) > 1e-12) next.push(uncertain);
    }
    remainder = next;
  }
  const before = patchArea(originalRing), classifiedLowerAreaM2 = lower.reduce((sum, p) => sum + patchArea(plan(p.ring)), 0), unclassifiedAreaM2 = remainder.reduce((sum, p) => sum + patchArea(p), 0);
  const residual = Math.abs(before - classifiedLowerAreaM2 - unclassifiedAreaM2);
  if (residual > 1e-6) throw new Error(`Lower-passage source partition lost ${residual} m²; repair the partition before publishing.`);
  return { lower, uncertainRemainder: remainder, ledger: { before, classifiedLowerAreaM2, unclassifiedAreaM2, residual }, sourceHeightPolicy: "Original plane retained exactly; no terrain sampling or vertical lift." };
}

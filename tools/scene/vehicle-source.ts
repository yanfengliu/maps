import { ShapeUtils, Vector2 } from "three";
import { AOI_ORIGIN_EPSG6677 } from "../../src/world/aoi.ts";
import { planeRectangularToWorld } from "../../src/world/frame.ts";
import type { PlanPoint, VehicleSurfaceSource } from "../../src/world/vehicle-surfaces.ts";
import { counterclockwise } from "../../src/agents/core/planar.ts";
import { geographicToPlaneRectangular } from "../geo/plane-rectangular.ts";

export interface VehicleSourceArea { source: VehicleSurfaceSource; sourceHeightRangeM: readonly [number,number]; ring: readonly PlanPoint[]; holes: readonly (readonly PlanPoint[])[]; triangles: readonly (readonly PlanPoint[])[] }
/** Selected physical source roads only; preserve each area's finest available
 * surface and every interior ring. LOD2 supplies plan identity, never elevation.
 */
export function readVehicleSourceAreas(xml: string, roadIds: ReadonlySet<string>): VehicleSourceArea[] {
  const result: VehicleSourceArea[] = [];
  for (const road of xml.matchAll(/<tran:Road\b([^>]*)>([\s\S]*?)<\/tran:Road>/g)) {
    const roadId = /gml:id="([^"]+)"/.exec(road[1]!)?.[1]; if (!roadId || !roadIds.has(roadId)) continue;
    for (const area of road[2]!.matchAll(/<tran:(TrafficArea|AuxiliaryTrafficArea)\b([^>]*)>([\s\S]*?)<\/tran:\1>/g)) {
      const areaId = /gml:id="([^"]+)"/.exec(area[2]!)?.[1], functionCode = Number(/<tran:function[^>]*>(\d+)/.exec(area[3]!)?.[1]);
      if (!areaId || ![1000,1010,1020,1030,1040,1070,1130,2000,2010,2020,2030,3000,3010,3020].includes(functionCode)) continue;
      const levels = [...area[3]!.matchAll(/<tran:lod([23])MultiSurface>([\s\S]*?)<\/tran:lod\1MultiSurface>/g)], lod = Math.max(...levels.map(m => Number(m[1]))) as 2 | 3;
      for (const level of levels.filter(m => Number(m[1]) === lod)) for (const polygon of level[2]!.matchAll(/<gml:Polygon\b([^>]*)>([\s\S]*?)<\/gml:Polygon>/g)) {
        const polygonId = /gml:id="([^"]+)"/.exec(polygon[1]!)?.[1]; if (!polygonId) throw new Error(`Vehicle source ${roadId}/${areaId} has an unnamed polygon.`);
        const project = (text: string): PlanPoint[] => {
          const values = text.trim().split(/\s+/).map(Number), points: PlanPoint[] = [];
          if (values.length % 3 || !values.every(Number.isFinite)) throw new Error(`Vehicle source ${polygonId} has invalid geographic triples.`);
          for (let i=0;i<values.length;i+=3) { const p=planeRectangularToWorld(geographicToPlaneRectangular(values[i]!,values[i+1]!,values[i+2]!),AOI_ORIGIN_EPSG6677);points.push([p.x,p.z]); }
          if (points.length>1 && Math.hypot(points[0]![0]-points.at(-1)![0],points[0]![1]-points.at(-1)![1])<1e-8) points.pop();
          return points;
        };
        const exterior=/<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)/.exec(polygon[2]!)?.[1]; if (!exterior) throw new Error(`Vehicle source ${polygonId} needs an exterior ring.`);
        const ring=project(exterior),holes=[...polygon[2]!.matchAll(/<gml:interior>[\s\S]*?<gml:posList[^>]*>([^<]+)[\s\S]*?<\/gml:interior>/g)].map(m=>project(m[1]!));
        const vertices=[...ring,...holes.flat()],faces=ShapeUtils.triangulateShape(ring.map(p=>new Vector2(...p)),holes.map(h=>h.map(p=>new Vector2(...p))));
        if (!faces.length) throw new Error(`Vehicle source ${polygonId} cannot triangulate its preserved holes.`);
        const heights=exterior.trim().split(/\s+/).map(Number).filter((_,i)=>i%3===2);
        result.push({source:{roadId,areaId,polygonId,functionCode,lod},sourceHeightRangeM:[Math.min(...heights),Math.max(...heights)],ring,holes,triangles:faces.map(f=>counterclockwise(f.map(i=>vertices[i]!)))});
      }
    }
  }
  return result;
}

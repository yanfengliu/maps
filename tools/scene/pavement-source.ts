/** PLATEAU pavement identity before projection, draping or LOD selection.
 * Multiple source areas of one road can describe different LODs of the same
 * footprint. Preserve every source ID so coverage decisions remain auditable.
 */
export interface PavementSourcePolygon {
  roadId: string;
  areaId: string;
  polygonId: string;
  areaKind: "TrafficArea" | "AuxiliaryTrafficArea";
  functionCode: number;
  lod: 2 | 3;
  /** Published latitude, longitude and orthometric height, without a lift. */
  ring: [number, number, number][];
}

const identifier = (attributes: string, description: string): string => {
  const id = /\bgml:id="([^"]+)"/.exec(attributes)?.[1];
  if (!id) throw new Error(`${description} has no gml:id; retain source identity before selecting or draping this pavement.`);
  return id;
};

export function readPavementSources(xml: string): PavementSourcePolygon[] {
  const result: PavementSourcePolygon[] = [];
  for (const road of xml.matchAll(/<tran:Road\b([^>]*)>([\s\S]*?)<\/tran:Road>/g)) {
    const roadId = identifier(road[1]!, "PLATEAU road");
    for (const area of road[2]!.matchAll(/<tran:(TrafficArea|AuxiliaryTrafficArea)\b([^>]*)>([\s\S]*?)<\/tran:\1>/g)) {
      const areaKind = area[1] as PavementSourcePolygon["areaKind"];
      const functionCode = Number(/<tran:function\b[^>]*>(\d+)<\/tran:function>/.exec(area[3]!)?.[1]);
      if (!(areaKind === "TrafficArea" ? [2000, 2010, 2020, 2030] : [3000, 3010, 3020]).includes(functionCode)) continue;
      const areaId = identifier(area[2]!, `Pavement area in ${roadId}`);
      for (const surface of area[3]!.matchAll(/<tran:lod([23])MultiSurface>([\s\S]*?)<\/tran:lod\1MultiSurface>/g)) {
        const lod = Number(surface[1]) as 2 | 3;
        for (const polygon of surface[2]!.matchAll(/<gml:Polygon\b([^>]*)>([\s\S]*?)<\/gml:Polygon>/g)) {
          const polygonId = identifier(polygon[1]!, `Pavement polygon in ${areaId}`);
          if (polygon[2]!.includes("<gml:interior>")) throw new Error(`Pavement polygon ${polygonId} in ${areaId} has a source hole; preserve that hole before constructing its support surface.`);
          const values = /<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/.exec(polygon[2]!)?.[1]?.trim().split(/\s+/).map(Number);
          if (!values || values.length < 12 || values.length % 3 !== 0 || values.some((value) => !Number.isFinite(value))) throw new Error(`Pavement polygon ${polygonId} in ${areaId} has invalid coordinates; provide a closed latitude/longitude/height ring with at least three finite vertices.`);
          const count = values.length / 3;
          if ([0, 1, 2].some((axis) => values[axis] !== values[(count - 1) * 3 + axis])) throw new Error(`Pavement polygon ${polygonId} in ${areaId} is not closed; its last source vertex must equal its first.`);
          const ring: [number, number, number][] = [];
          for (let index = 0; index < count - 1; index++) ring.push([values[index * 3]!, values[index * 3 + 1]!, values[index * 3 + 2]!]);
          result.push({ roadId, areaId, polygonId, areaKind, functionCode, lod, ring });
        }
      }
    }
  }
  return result;
}

/** Equality preserves ring adjacency and original height. A ring at another
 * elevation is another source surface, even if every projected point matches.
 */
export function sourceRingKey(ring: readonly (readonly number[])[]): string {
  const keys = ring.map((point) => point.join(","));
  const candidates: string[] = [];
  for (const order of [keys, [...keys].reverse()]) for (let index = 0; index < order.length; index++) candidates.push([...order.slice(index), ...order.slice(0, index)].join("|"));
  return candidates.sort()[0] ?? "";
}

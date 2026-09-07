/**
 * The building attributes PLATEAU states in its own CityGML, read straight from the source.
 *
 * The scene's geometry comes from MLIT's pre-converted 3D Tiles, but the CityGML
 * archive stays the record of authority — `docs/work/0_shibuya-1km/design.md` says
 * so and this is what makes that true rather than aspirational. Two things are
 * checked against it and neither can be checked any other way.
 *
 * **What a missing value really is.** The tiles write a missing
 * `bldg:measuredHeight` as `null`, because a binary batch-table column cannot hold
 * one. The CityGML writes the same fact as **−9999**. Nothing in the tiles says
 * those are the same buildings; reading both and comparing them is what says it.
 *
 * **How many buildings the box holds.** The count everything downstream is judged
 * against — 1,741 — was measured from these files by centroid of `lod0RoofEdge`.
 * The tiles state a per-feature bounding-box centre instead, which is a different
 * point, so the two counts can differ by a building or two at the boundary. That
 * difference is worth knowing about rather than worth assuming away.
 *
 * Streamed, because the four AOI building files are 364 MB together and holding
 * one of them as a JavaScript string costs twice its size in memory.
 */

import { createReadStream } from "node:fs";

const BUILDING_OPEN = "<bldg:Building ";
const BUILDING_CLOSE = "</bldg:Building>";

const GML_ID = /\bgml:id="([^"]+)"/;
const MEASURED_HEIGHT = /<bldg:measuredHeight[^>]*>([^<]*)<\/bldg:measuredHeight>/;
const STOREYS_ABOVE = /<bldg:storeysAboveGround>([^<]*)<\/bldg:storeysAboveGround>/;
const LOD0_ROOF_EDGE = /<bldg:lod0RoofEdge>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/;
const LOD2_SOLID = /<bldg:lod2Solid>|<bldg:lod2MultiSurface>/;

export interface CityGmlBuilding {
  gmlId: string;
  /** Exactly as the file states it, sentinel and all. `undefined` when the tag is absent. */
  measuredHeightRaw: number | undefined;
  storeysAboveGroundRaw: number | undefined;
  /** Mean of the `lod0RoofEdge` ring, latitude and longitude degrees. */
  latitude: number | undefined;
  longitude: number | undefined;
  hasLod2: boolean;
}

/**
 * Read every `bldg:Building` in one CityGML file.
 *
 * A tag scan rather than an XML parse, for the same reason `plateau-tin.ts` uses
 * one: these documents are hundreds of megabytes of a fixed shape, and a DOM
 * parse of one costs gigabytes. The trade is the usual one, so this fails by name
 * when a building has no `gml:id` rather than skipping it and returning a smaller
 * Shibuya.
 */
export async function readCityGmlBuildings(path: string): Promise<CityGmlBuilding[]> {
  const buildings: CityGmlBuilding[] = [];
  let tail = "";

  for await (const chunk of createReadStream(path, { encoding: "utf8" })) {
    tail += chunk as string;

    let searchFrom = 0;
    for (;;) {
      const open = tail.indexOf(BUILDING_OPEN, searchFrom);
      if (open === -1) break;
      const close = tail.indexOf(BUILDING_CLOSE, open);
      if (close === -1) break;
      buildings.push(parseBuilding(tail.slice(open, close + BUILDING_CLOSE.length), path));
      searchFrom = close + BUILDING_CLOSE.length;
    }
    // Keep only what might be the start of an unfinished building. Without this
    // the tail grows to the whole file and the streaming buys nothing.
    const lastOpen = tail.lastIndexOf(BUILDING_OPEN);
    tail = lastOpen === -1 ? tail.slice(-BUILDING_OPEN.length) : tail.slice(lastOpen);
  }

  if (buildings.length === 0) {
    throw new Error(
      `${path} holds no <bldg:Building> at all. A PLATEAU bldg file always does, so either the ` +
        "file is truncated or `npm run data:fetch` extracted something else.",
    );
  }
  return buildings;
}

function parseBuilding(xml: string, path: string): CityGmlBuilding {
  const id = GML_ID.exec(xml);
  if (id === null) {
    throw new Error(
      `A <bldg:Building> in ${path} has no gml:id. Every PLATEAU building carries one, and it is ` +
        "the key the 3D Tiles batch tables are matched on, so a building without one cannot be " +
        "reconciled and must not be counted.",
    );
  }

  const centroid = ringCentroid(LOD0_ROOF_EDGE.exec(xml)?.[1]);
  return {
    gmlId: id[1]!,
    measuredHeightRaw: numberOrUndefined(MEASURED_HEIGHT.exec(xml)?.[1]),
    storeysAboveGroundRaw: numberOrUndefined(STOREYS_ABOVE.exec(xml)?.[1]),
    latitude: centroid?.latitude,
    longitude: centroid?.longitude,
    hasLod2: LOD2_SOLID.test(xml),
  };
}

function numberOrUndefined(text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  const value = Number(text.trim());
  return Number.isFinite(value) ? value : undefined;
}

/**
 * The mean of a `gml:posList` ring, in degrees.
 *
 * PLATEAU's posList is **latitude first**, then longitude, then height — the
 * opposite of the usual order and one of the two ways this project can end up
 * with a mirrored city. The ring closes, so the repeated last vertex is dropped
 * before averaging.
 */
function ringCentroid(posList: string | undefined): { latitude: number; longitude: number } | undefined {
  if (posList === undefined) return undefined;
  const numbers = posList.trim().split(/\s+/).map(Number);
  if (numbers.length < 12 || numbers.length % 3 !== 0) return undefined;
  const vertices = numbers.length / 3 - 1;
  let latitude = 0;
  let longitude = 0;
  for (let index = 0; index < vertices; index += 1) {
    latitude += numbers[index * 3]!;
    longitude += numbers[index * 3 + 1]!;
  }
  return { latitude: latitude / vertices, longitude: longitude / vertices };
}

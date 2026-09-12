export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: { type: string; ref: number; role: string }[];
}

export interface OsmDocument {
  osm3s: { timestamp_osm_base: string; copyright?: string };
  elements: OsmElement[];
}

/** Overpass emits tagged elements followed by bare duplicates; first occurrence owns the tags. */
export function indexOsm(document: OsmDocument): Map<string, OsmElement> {
  if (!Array.isArray(document.elements) || !document.osm3s?.timestamp_osm_base) throw new Error("OSM extract has no elements or timestamp_osm_base; re-run npm run data:fetch.");
  const index = new Map<string, OsmElement>();
  for (const element of document.elements) {
    if (!Number.isSafeInteger(element.id) || !["node", "way", "relation"].includes(element.type)) throw new Error(`OSM element ${String(element.id)} has an invalid type or ID; use an Overpass JSON extract.`);
    const key = `${element.type}/${element.id}`;
    if (!index.has(key)) index.set(key, element);
  }
  return index;
}

export function surfaceExclusion(tags: Record<string, string>): string | null {
  if (tags.indoor && tags.indoor !== "no") return "indoor";
  if (tags.tunnel && tags.tunnel !== "no") return "tunnel";
  if (tags.bridge && tags.bridge !== "no") return "bridge";
  if (tags.layer && tags.layer !== "0") return "layer";
  if (tags.level && tags.level !== "0") return "level";
  if (["no", "private"].includes(tags.access ?? "")) return "access";
  return null;
}

export const DRIVABLE = new Set(["motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link", "unclassified", "residential", "living_street", "service"]);
export const WALKABLE = new Set(["footway", "pedestrian", "path", "steps", "living_street"]);

export interface LaneLayout { forward: number; backward: number; widthM: number; inferredLanes: boolean; inferredWidth: boolean }

export function laneLayout(tags: Record<string, string>): LaneLayout {
  const positive = (text: string | undefined): number | undefined => {
    if (!text || !/^\d+(\.\d+)?$/.test(text)) return undefined;
    const n = Number(text);
    return n > 0 && n <= 20 ? n : undefined;
  };
  const count = (text: string | undefined) => {
    const n = positive(text); return n !== undefined && Number.isInteger(n) ? n : undefined;
  };
  const total = count(tags.lanes);
  if (tags.oneway && !["yes", "true", "1", "-1", "no", "false", "0"].includes(tags.oneway)) throw new Error(`OSM oneway=${tags.oneway} is unsupported; resolve reversible or conditional traffic before building lanes.`);
  const oneWay = ["yes", "true", "1", "-1"].includes(tags.oneway ?? "") || (!tags.oneway && tags.junction === "roundabout");
  if (total === 1 && !oneWay) throw new Error("OSM lanes=1 with two-way traffic needs a shared narrow-road model; do not widen it into two lanes.");
  let forward = count(tags["lanes:forward"]) ?? (oneWay ? total ?? 1 : Math.max(1, Math.ceil((total ?? 2) / 2)));
  let backward = count(tags["lanes:backward"]) ?? (oneWay ? 0 : Math.max(1, (total ?? 2) - forward));
  if (tags.oneway === "-1") { backward = forward; forward = 0; }
  if (total !== undefined && forward + backward !== total) throw new Error(`OSM lanes=${total} disagrees with ${forward} forward + ${backward} backward; correct the lane tags before building.`);
  const width = positive(tags.width);
  return { forward, backward, widthM: width ?? (forward + backward) * 3, inferredLanes: total === undefined, inferredWidth: width === undefined };
}

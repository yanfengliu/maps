/**
 * The Overpass query for the AOI, built from the one AOI definition.
 *
 * Plan item 6. Written as code rather than as a `.overpassql` file so the bbox
 * comes from `src/world/aoi.ts` and cannot drift from it. The exact text sent is
 * saved next to the response, so a run is still reproducible from the artifacts.
 *
 * It asks for what Phases 6, 7 and 8 need: the drivable and walkable network with
 * its lane and crossing tags, the control nodes, rail and station structure, the
 * barriers that constrain pedestrians, and the turn restrictions.
 *
 * `out body; >; out skel qt;` emits some elements twice — once with tags from
 * `out body`, once bare from `out skel`. Anything indexing the result by id must
 * keep the FIRST occurrence; keeping the last silently drops every tag.
 */

import { AOI_OVERPASS_BBOX } from "../../src/world/aoi.ts";

export function buildOverpassQuery(bbox: string = AOI_OVERPASS_BBOX): string {
  return `[out:json][timeout:300];
// Shibuya 1 km AOI. Overpass bbox order is (south, west, north, east).
(
  // roads and paths: carries lanes, lanes:forward/backward, turn:lanes, oneway,
  // maxspeed, junction, sidewalk, width, surface, footway=crossing, highway=steps
  way["highway"](${bbox});

  // control nodes: signals, crossings, stop lines
  node["highway"](${bbox});
  node["crossing"](${bbox});
  node["traffic_calming"](${bbox});

  // rail and station structure
  way["railway"](${bbox});
  node["railway"](${bbox});
  relation["railway"](${bbox});

  // public transport: platforms, stop areas, station polygons
  node["public_transport"](${bbox});
  way["public_transport"](${bbox});
  relation["public_transport"](${bbox});
  way["building"~"^(train_station|transportation)$"](${bbox});

  // barriers that constrain pedestrians: guardrails, fences, kerbs, bollards
  way["barrier"](${bbox});
  node["barrier"](${bbox});

  // pedestrian areas mapped as polygons rather than centrelines
  way["area:highway"](${bbox});

  // turn restrictions — the relation bbox filter matches relations whose members
  // fall in the box; \`>\` below pulls in their member ways and nodes
  relation["type"="restriction"](${bbox});
);
out body;
>;
out skel qt;
`;
}

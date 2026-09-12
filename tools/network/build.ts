/**
 * harness: npm run data:scene writes the measured surface meshes; this command
 * builds and validates the separate OSM movement database against those bytes.
 * Writes only data/network/, never the PLATEAU geometry or the source extract.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeMesh } from "../../src/world/mesh.ts";
import { validateShibuyaNetwork } from "../../src/network/validate.ts";
import { generateNetwork } from "./generate.ts";
import { surfaceSampler } from "./surface.ts";
import type { OsmDocument } from "./osm.ts";
import { validateCompoundClearance } from "./compounds.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const hash = (bytes:Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const [osmBytes, terrainBytes, roadBytes] = await Promise.all([
  readFile(join(root,"data/osm/shibuya-aoi.osm.json")),
  readFile(join(root,"data/scene/terrain.mesh")),
  readFile(join(root,"data/scene/roads.mesh")),
]);
const osm = JSON.parse(osmBytes.toString("utf8")) as OsmDocument;
const groundHeight = surfaceSampler(decodeMesh(terrainBytes));
const roadHeight = surfaceSampler(decodeMesh(roadBytes), true);
const data = generateNetwork(osm, { groundHeight, roadHeight, provenance: {
  osmTimestamp: osm.osm3s.timestamp_osm_base, osmSha256: hash(osmBytes), terrainSha256: hash(terrainBytes), roadsSha256: hash(roadBytes),
  method: "OSM surface-only topology; AOI clipping; left-hand lanes with documented defaults; conservative turn restrictions; OSM crossing conflict envelopes and authored NE-SW scramble diagonal; PLATEAU mesh height sampling. See docs/work/0_shibuya-1km/network-contract.md."
} });
validateShibuyaNetwork(data);
validateCompoundClearance(data);
const output = join(root,"data/network");
await mkdir(output,{recursive:true});
const bytes = `${JSON.stringify(data)}\n`;
await writeFile(join(output,"network.json.tmp"),bytes,"utf8");
await rename(join(output,"network.json.tmp"),join(output,"network.json"));
console.log(JSON.stringify({output:"data/network/network.json",sha256:hash(Buffer.from(bytes)),bytes:Buffer.byteLength(bytes),nodes:data.nodes.length,lanes:data.lanes.length,walks:data.walks.length,junctions:data.junctions.length,portals:Object.fromEntries(Object.entries(data.portals).map(([k,v])=>[k,v.length])),diagnostics:{...data.diagnostics,inferredLaneWays:data.diagnostics.inferredLaneWays.length,inferredWidthWays:data.diagnostics.inferredWidthWays.length}},null,2));

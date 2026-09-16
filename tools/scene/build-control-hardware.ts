/** harness: the controls-driven C5 east/low views exposed logical signal nodes
 * rendered as in-road poles. This produces separately attributed hardware.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { VehicleAssetManifest } from "../../src/world/agent-assets.ts";
import type { ControlHardwareData } from "../../src/world/control-hardware.ts";
import { validateControlHardware } from "../../src/world/control-hardware.ts";
import { decodeMesh } from "../../src/world/mesh.ts";
import { validateNetwork } from "../../src/network/validate.ts";
import { placeControlHardware } from "./control-hardware.ts";
import { contactQuery } from "./hardware-support.ts";

const files = { network: "data/network/network.json", roads: "data/scene/roads.mesh", pavements: "data/scene/pavements.mesh", vehicles: "data/scene/agents/vehicles.json" };
const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => {
  try { return [key, await readFile(path)] as const; }
  catch (cause) { throw new Error(`Control hardware input ${path} is unavailable; run data:network, data:pavements, data:vehicles and data:vehicles:verify before data:hardware.`, { cause }); }
}));
const bytes = Object.fromEntries(entries) as Record<keyof typeof files, Buffer>;
// Reuse the runtime validator without changing the source file.
const network: unknown = JSON.parse(bytes.network.toString("utf8"));
validateNetwork(network);
let fleet: VehicleAssetManifest;
try { fleet = JSON.parse(bytes.vehicles.toString("utf8")) as VehicleAssetManifest; }
catch (cause) { throw new Error("data/scene/agents/vehicles.json is not valid JSON; run npm run data:vehicles and npm run data:vehicles:verify before data:hardware.", { cause }); }
if (!fleet || typeof fleet !== "object" || fleet.version !== 1 || fleet.units !== "metres" || fleet.up !== "+Y" || fleet.forward !== "+Z" || !Array.isArray(fleet.vehicles)) throw new Error("data/scene/agents/vehicles.json has no supported vehicle manifest; run npm run data:vehicles and npm run data:vehicles:verify before data:hardware.");
const digest = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const data: ControlHardwareData = {
  version: 1,
  method: "Authored physical presentation separate from every logical OSM control. Closest support level within 0.75 m, nine footing samples, 18 m transverse search; declared pedestrian corridors plus 0.2 m pole gap. All three measured vehicle classes at scale 1, 0.5 m route pose samples with 0.25 m horizontal margin, four manifest axle contacts within actual 0.05 m model wheel travel. Hardware bottom is at least 0.6 m above supported nearby body corners. Unsupported cases stay explicitly unplaced. This is not a survey or continuous traffic/contact acceptance.",
  bounds: { vehicleScale: 1, routeStepM: .5, clearanceM: .6, searchRadiusM: 18 },
  inputs: { network: digest(bytes.network), networkCanonical: digest(new TextEncoder().encode(JSON.stringify(network))), roads: digest(bytes.roads), pavements: digest(bytes.pavements), vehicles: digest(bytes.vehicles) },
  records: placeControlHardware(network, fleet.vehicles, contactQuery(decodeMesh(bytes.pavements)), contactQuery(decodeMesh(bytes.roads))),
};
validateControlHardware(data, network, data.inputs);
await writeFile("data/scene/control-hardware.json", JSON.stringify(data, null, 2) + "\n");
console.log(JSON.stringify({ records: data.records.length, placed: data.records.filter(r => r.status === "placed").length, unplaced: data.records.filter(r => r.status === "unplaced").length, inputs: data.inputs }));

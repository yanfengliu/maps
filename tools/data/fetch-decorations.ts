/** harness: the scene's data:fetch/data:scene pipeline owns source preparation.
 * This companion fetch keeps vegetation sources separate from the frozen road extract.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AOI_OVERPASS_BBOX } from "../../src/world/aoi.ts";
import { OVERPASS } from "./manifest.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const directory = join(root, "data/decorations");
const file = join(directory, "osm.json");
const query = `[out:json][timeout:180];(node["natural"="tree"](${AOI_OVERPASS_BBOX});way["natural"="tree_row"](${AOI_OVERPASS_BBOX});way["leisure"~"^(park|garden)$"](${AOI_OVERPASS_BBOX});way["landuse"="grass"](${AOI_OVERPASS_BBOX});way["barrier"="guard_rail"](${AOI_OVERPASS_BBOX});node["barrier"="bollard"](${AOI_OVERPASS_BBOX}););out body;>;out skel qt;`;
await mkdir(directory, { recursive: true });
let existing: Uint8Array | undefined;
try { existing = await readFile(file); } catch { /* A first checkout has no source. */ }
if (existing && !process.argv.includes("--force")) {
  const priorQuery = await readFile(join(directory, "query.overpassql"), "utf8");
  if (priorQuery !== query) throw new Error("The cached decorations query predates the requested source features. Preserve its provenance, then run node tools/data/fetch-decorations.ts --force to fetch the current query.");
  const document = JSON.parse(new TextDecoder().decode(existing)) as { osm3s?: { timestamp_osm_base?: string }; elements?: unknown[] };
  if (!document.osm3s?.timestamp_osm_base || !Array.isArray(document.elements)) throw new Error(`${file} is not an Overpass source. Re-run with --force to replace it.`);
  console.log(`Using cached vegetation source ${document.osm3s.timestamp_osm_base}; ${document.elements.length} records.`);
} else {
  const response = await fetch(OVERPASS.endpoint, { method: "POST", headers: { "user-agent": OVERPASS.userAgent, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(210000) });
  if (!response.ok) throw new Error(`Vegetation source request returned HTTP ${response.status}. Retry node tools/data/fetch-decorations.ts when ${OVERPASS.endpoint} is available.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const document = JSON.parse(new TextDecoder().decode(bytes)) as { osm3s?: { timestamp_osm_base?: string }; elements?: unknown[]; remark?: string };
  if (document.remark || !document.osm3s?.timestamp_osm_base || !Array.isArray(document.elements)) throw new Error(`Overpass returned an incomplete vegetation source: ${document.remark ?? "missing timestamp or elements"}. No cache was written.`);
  await writeFile(file, bytes);
  await writeFile(join(directory, "query.overpassql"), query);
  await writeFile(join(directory, "provenance.json"), JSON.stringify({ endpoint: OVERPASS.endpoint, osmTimestamp: document.osm3s.timestamp_osm_base, sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length, licence: "OpenStreetMap ODbL 1.0" }, null, 2));
  console.log(`Fetched ${bytes.length} bytes of vegetation source, ${document.elements.length} records, ${document.osm3s.timestamp_osm_base}.`);
}

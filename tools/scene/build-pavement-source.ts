/** Publish selected source geometry/provenance only. No drape or render-height
 * change is performed here; pavement support is a separate reviewed stage.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { AOI_MESH_CODES } from "../../src/world/aoi.ts";
import { readPavementSources, type PavementSourcePolygon } from "./pavement-source.ts";
import { selectPavementSources } from "./select-pavement-source.ts";

export async function buildPavementSource(dataRoot = "data") {
const sources: { file: string; sha256: string }[] = [];
const polygons: PavementSourcePolygon[] = [];
for (const code of AOI_MESH_CODES.level3) {
  const file = `${dataRoot}/plateau/udx/tran/${code}_tran_6697_op.gml`;
  const bytes = await readFile(file);
  sources.push({ file, sha256: createHash("sha256").update(bytes).digest("hex") });
  polygons.push(...readPavementSources(bytes.toString("utf8")));
}
const selected = selectPavementSources(polygons);
const report = { version: 1, role: "source-selection-before-support", coordinateFrame: "World X east, Y orthometric source height, Z south, metres; LOD2 source heights remain zero.", sourceFiles: sources, selection: "Exact fullXYZ same-level ring aliases retained; LOD3 retained; only same-parent LOD3 coverage subtracted from LOD2.", numericalAreaBound: "Each lower triangle: max(1e-6 square metres, original area * 1e-10), calculated in double precision without coordinate quantization.", ...selected };
return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
const report = await buildPavementSource();
await writeFile("data/scene/pavement-source.json", JSON.stringify(report));
const selected = report;
const mixed = selected.ledger.filter((row) => row.lowerTriangles > 0 && row.higherTriangles > 0);
console.log(JSON.stringify({ pieces: selected.pieces.length, duplicatePolygons: selected.duplicatePolygons, projectedDegenerates: selected.projectedDegenerates.length, mixedRoads: mixed.length, retainedMixedFallbackM2: mixed.reduce((sum, row) => sum + row.retainedFallbackAreaM2, 0), maximumAreaResidualM2: Math.max(...selected.ledger.map((row) => row.maximumAreaResidualM2)) }));
}

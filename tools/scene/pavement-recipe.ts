/** Reproducible bounded C5 presentation. No recovery artifacts are read here.
 * Source/terrain pins bind the reviewed layer interpretation; different bytes
 * require a new source review, not an automatic max-height reconciliation. */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AOI_MESH_CODES } from "../../src/world/aoi.ts";
import { decodeMesh, encodeMesh } from "../../src/world/mesh.ts";
import { surfaceSampler } from "../../src/world/surface-sampler.ts";
import { buildRoads } from "./build-roads.ts";
import { buildPavementSource } from "./build-pavement-source.ts";
import { buildHeroPavement, HERO_PAVEMENT_PARENTS } from "./pavement-hero.ts";
import { clipLowerPavement, LOWER_PAVEMENT_SOURCE, readLowerBridge } from "./pavement-lower.ts";
import { composePavement } from "./compose-pavement.ts";

const hash = (bytes: Uint8Array | string): string => createHash("sha256").update(bytes).digest("hex");
const REVIEWED_INPUTS: Readonly<Record<string, string>> = {
  "terrain.mesh": "fef57d0960c3d08c5d31f0f56f64cff3b046b6d577b36473b7c046295249b381",
  "roads.mesh": "3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490",
  "53393585_tran_6697_op.gml": "8457ce05ff6aab157e36bb614582478ae8d0b0db320e0a95e6552d6ac7108921",
  "53393586_tran_6697_op.gml": "18b8b0c1afb307546073c6b0910bba171a5aea82e9cac06215e1a6be7bd3746b",
  "53393595_tran_6697_op.gml": "a74cc75aa06a9a57dd2d9ecae644267779eb6ac1e2ca43dc53f04eb6b2fa86ee",
  "53393596_tran_6697_op.gml": "ad04f9b05a29140988178b84987e9ff7aae0fac36279fc79640db9e45a6cc317",
  "53393596_brid_6697_op.gml": "ab031fb56e944c4975ec7588ab291416add55c191638c98b4b4e5e720af9d23d",
};
function assertReviewed(name: string, actual: string): void {
  if (actual !== REVIEWED_INPUTS[name]) throw new Error(`Pavement input ${name} has SHA-256 ${actual}, outside the reviewed C5 source binding; restore the pinned data or review the source/layer recipe before running data:pavements.`);
}

export async function buildPavementPresentation(terrainBytes: Uint8Array, roadBytes: Uint8Array, log: (line: string) => void = () => {}, dataRoot = "data") {
  assertReviewed("terrain.mesh", hash(terrainBytes)); assertReviewed("roads.mesh", hash(roadBytes));
  const selection = await buildPavementSource(dataRoot);
  for (const row of selection.sourceFiles) assertReviewed(row.file.split("/").at(-1)!, row.sha256);
  const bridgeFile = `${dataRoot}/plateau/udx/brid/53393596_brid_6697_op.gml`, bridgeBytes = await readFile(bridgeFile);
  assertReviewed("53393596_brid_6697_op.gml", hash(bridgeBytes));
  const terrain = decodeMesh(terrainBytes), roads = decodeMesh(roadBytes), heightAt = surfaceSampler(terrain), roadAt = surfaceSampler(roads, true);
  const support = (x: number, z: number): number | undefined => { const ground = heightAt(x, z), road = roadAt(x, z); return ground !== undefined && road !== undefined && road - ground < .75 ? Math.max(ground, road) : ground; };
  log("pavements — previous adaptive presentation, then reviewed source-owned repairs");
  const base = await buildRoads(AOI_MESH_CODES.level3.map((code) => `${dataRoot}/plateau/udx/tran/${code}_tran_6697_op.gml`), { heightAt }, log, "pavement", support);
  const hero = buildHeroPavement(selection.pieces, terrain, roads);
  const lowerSources = selection.pieces.filter((p) => p.source.polygonId === LOWER_PAVEMENT_SOURCE);
  if (lowerSources.length !== 1) throw new Error(`Expected one selected lower-passage source ${LOWER_PAVEMENT_SOURCE}, found ${lowerSources.length}; review its source ownership before publishing.`);
  const lower = clipLowerPavement(lowerSources[0]!, readLowerBridge(bridgeBytes.toString("utf8")));
  const composed = composePavement(decodeMesh(base.bytes), hero.mesh, hero.selected, lower.lower), bytes = encodeMesh(composed.mesh);
  if (bytes.length > 16_000_000 || composed.mesh.header.triangleCount > 500_000) throw new Error(`Bounded pavement recipe produced ${bytes.length} bytes and ${composed.mesh.header.triangleCount} triangles; investigate the source partition instead of expanding its 16 MB / 500,000 triangle budget.`);
  const selectionBytes = JSON.stringify(selection);
  const report = {
    version: 1, scope: composed.mesh.header.note,
    inputs: { terrain: hash(terrainBytes), roads: hash(roadBytes), sourceFiles: selection.sourceFiles, bridge: { file: bridgeFile, sha256: hash(bridgeBytes) }, selection: hash(selectionBytes), adaptiveBase: hash(base.bytes) },
    output: { sha256: hash(bytes), bytes: bytes.length, triangles: composed.mesh.header.triangleCount },
    parentIds: HERO_PAVEMENT_PARENTS,
    base: base.result,
    hero: { sourcePieces: hero.selected.length, sourceTriangles: hero.ledger.length, patches: hero.patches, topTriangles: hero.topTriangles, riserTriangles: hero.riserTriangles, ledger: hero.ledger, degenerates: hero.degenerates, precision: hero.precision },
    lower,
    replacement: { ...composed, mesh: undefined },
    coverageLimit: "Only the named hero parents receive proved ground repair, and only the named bridge clip preserves a proved lower passage. Other presentation retains its previous geometry; unclassified source regions and source elevations remain in pavement-source.json. Float32 boundary uncertainty is not a strict support pass. No network or whole-city walking support is admitted.",
  };
  return { bytes, sourceBytes: selectionBytes, report };
}

/** Writes only this producer's three artifacts, after the complete recipe has
 * succeeded. Never deletes the shared scene root or sibling agent assets. */
export async function writePavementPresentation(outputRoot: string, built: Awaited<ReturnType<typeof buildPavementPresentation>>): Promise<void> {
  await mkdir(outputRoot, { recursive: true });
  await writeFile(join(outputRoot, "pavements.mesh"), built.bytes);
  await writeFile(join(outputRoot, "pavement-source.json"), built.sourceBytes);
  await writeFile(join(outputRoot, "pavement-recipe.json"), JSON.stringify(built.report));
}

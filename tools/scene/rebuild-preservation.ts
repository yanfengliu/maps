/**
 * Preserve existing authored or unrecognised markings before scene cleanup.
 * Bound: the two current markings files and their existing producer format.
 * This does not authorize a new source vintage or make the whole rebuild atomic.
 */
import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import { decodeMesh } from "../../src/world/mesh.ts";
import { cleanSceneGeometry } from "./clean-geometry.ts";

// The existing published-only writer's marker, not a new paint/source policy.
// A changed or unknown output format needs an explicit preservation decision.
const PUBLISHED_NOTE = "PLATEAU CityFurniture functions 1010/1020/1030/1040/1120. Published horizontal rings, draped to road support +0.035m. Pedestrian stripes excluded; OSM physical crossings own them.";
const PUBLISHED_FUNCTIONS = [1010, 1020, 1030, 1040, 1120];
const PROVENANCE_KEYS = ["sources", "codelist", "functions", "features", "droppedUnsupported", "triangleCount"];

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const integer = (value: unknown, minimum = 0): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function refuse(file: string, reason: string): never {
  throw new Error(`Scene rebuild refused before cleanup: ${file} ${reason}. Existing scene files were kept. Restore the recorded markings.mesh and markings-provenance.json pair if it is incomplete or damaged; authored paint needs a reviewed regeneration path before this published-only rebuild may replace it.`);
}

async function readExisting(file: string): Promise<Buffer | null> {
  let entry;
  try { entry = await lstat(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return refuse(file, `could not be inspected (${error instanceof Error ? error.message : String(error)})`);
  }
  if (!entry.isFile()) return refuse(file, "exists but is not a regular markings file");
  try { return await readFile(file); }
  catch (error) { return refuse(file, `could not be read (${error instanceof Error ? error.message : String(error)})`); }
}

/** Read-only. Neither file being present is markings bootstrap, not a history claim. */
export async function preflightSceneMarkings(sceneDirectory: string): Promise<"bootstrap" | "published-only"> {
  const meshPath = join(sceneDirectory, "markings.mesh");
  const provenancePath = join(sceneDirectory, "markings-provenance.json");
  const [meshBytes, provenanceBytes] = await Promise.all([readExisting(meshPath), readExisting(provenancePath)]);
  if (meshBytes === null && provenanceBytes === null) return "bootstrap";
  if (meshBytes === null) return refuse(meshPath, `is missing beside existing ${provenancePath}`);
  if (provenanceBytes === null) return refuse(provenancePath, `is missing beside existing ${meshPath}`);

  let provenance: unknown;
  try { provenance = JSON.parse(provenanceBytes.toString("utf8")); }
  catch (error) { return refuse(provenancePath, `is not valid JSON (${error instanceof Error ? error.message : String(error)})`); }
  if (!record(provenance)) return refuse(provenancePath, "does not contain a recognised provenance object");
  if ("authored" in provenance || "published" in provenance) {
    return refuse(provenancePath, "records authored paint or an incomplete authored wrapper that this rebuild cannot reproduce");
  }
  if (Object.keys(provenance).length !== PROVENANCE_KEYS.length || !PROVENANCE_KEYS.every(key => key in provenance)) {
    return refuse(provenancePath, "does not match the existing published-only provenance format");
  }
  const { sources, functions, features, droppedUnsupported, triangleCount } = provenance;
  if (!Array.isArray(sources) || sources.length === 0 || !sources.every(source => record(source) && nonempty(source.file) && typeof source.sha256 === "string" && /^[a-f0-9]{64}$/i.test(source.sha256)) ||
      provenance.codelist !== "plateau/codelists/CityFurniture_function.xml" ||
      !Array.isArray(functions) || functions.length !== PUBLISHED_FUNCTIONS.length || !PUBLISHED_FUNCTIONS.every(value => functions.includes(value)) ||
      !Array.isArray(features) || features.length === 0 || !features.every(feature => record(feature) && nonempty(feature.id) && integer(feature.functionCode, 1) && functions.includes(feature.functionCode) && integer(feature.polygons, 1)) ||
      !integer(droppedUnsupported) || !integer(triangleCount, 1)) {
    return refuse(provenancePath, "has malformed published source, function, feature or count records");
  }

  let mesh: ReturnType<typeof decodeMesh>;
  try { mesh = decodeMesh(new Uint8Array(meshBytes)); }
  catch (error) { return refuse(meshPath, `cannot be decoded (${error instanceof Error ? error.message : String(error)})`); }
  const { header, positions, normals, indices } = mesh;
  if (header.name !== "markings" || !integer(header.vertexCount, 1) || !integer(header.triangleCount, 1) ||
      !record(header.bounds) || !Array.isArray(header.bounds.min) || !Array.isArray(header.bounds.max) || header.bounds.min.length !== 3 || header.bounds.max.length !== 3 ||
      !header.bounds.min.every(Number.isFinite) || !header.bounds.max.every(Number.isFinite) || header.bounds.min.some((value, axis) => value > header.bounds.max[axis]!) ||
      !positions.every(Number.isFinite) || !normals.every(Number.isFinite) || !indices.every(index => index < header.vertexCount)) {
    return refuse(meshPath, "has malformed markings geometry or header fields");
  }
  if (header.note !== PUBLISHED_NOTE) {
    return refuse(meshPath, typeof header.note === "string" && /authored/i.test(header.note) ? "records authored paint despite published-only provenance" : "does not carry the recognised published-only producer note");
  }
  if (header.triangleCount !== triangleCount) return refuse(provenancePath, `records ${triangleCount} published triangles but ${meshPath} carries ${header.triangleCount}`);
  return "published-only";
}

/** The actual destructive build boundary: no cleanup or writer before admission. */
export async function runSceneRebuild(sceneDirectory: string, build: () => Promise<void>): Promise<void> {
  await preflightSceneMarkings(sceneDirectory);
  await cleanSceneGeometry(sceneDirectory);
  await build();
}

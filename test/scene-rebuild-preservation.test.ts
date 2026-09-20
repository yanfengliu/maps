/**
 * harness: runSceneRebuild, the same preflight/cleanup/writer boundary build.ts uses.
 * Bound: temporary scene roots, current producer-shaped markings, missing or
 * malformed pairs, and all seven owned cleanup names plus companion subtrees.
 * Every refusal keeps every existing file byte-exact and never calls the writer.
 * This does not run the city rebuild or prove safety after an admitted build fails.
 */
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { afterEach, expect, it } from "vitest";
import { encodeMesh, type MeshData } from "../src/world/mesh.ts";
import { preflightSceneMarkings, runSceneRebuild } from "../tools/scene/rebuild-preservation.ts";

const NOTE = "PLATEAU CityFurniture functions 1010/1020/1030/1040/1120. Published horizontal rings, draped to road support +0.035m. Pedestrian stripes excluded; OSM physical crossings own them.";
const roots: string[] = [];
const owned = ["terrain.mesh", "roads.mesh", "pavements.mesh", "markings.mesh", "markings-provenance.json", "buildings/old.b3dm", "manifest.json"];
const companions = ["agents/person.glb", "decorations.json", "future/nested/data.bin"];
const provenance = () => ({ sources: [{ file: "source.gml", sha256: "a".repeat(64) }], codelist: "plateau/codelists/CityFurniture_function.xml", functions: [1010, 1020, 1030, 1040, 1120], features: [{ id: "paint", functionCode: 1010, polygons: 1 }], droppedUnsupported: 0, triangleCount: 1 });
const mesh = (): MeshData => ({
  header: { version: 1, name: "markings", vertexCount: 3, triangleCount: 1, bounds: { min: [0, 0, 0], max: [1, 0, 1] }, note: NOTE },
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]), normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]), indices: new Uint32Array([0, 2, 1]),
});
const json = (value: unknown): Uint8Array => Buffer.from(JSON.stringify(value));
async function scene(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "maps-rebuild-preservation-")); roots.push(root);
  return join(root, "scene");
}
async function put(root: string, file: string, bytes: string | Uint8Array): Promise<void> {
  const target = join(root, file);
  await mkdir(resolve(target, ".."), { recursive: true }); await writeFile(target, bytes);
}
async function sentinels(root: string): Promise<void> {
  for (const file of [...owned, ...companions].filter(name => !name.startsWith("markings"))) await put(root, file, `original:${file}`);
}
async function snapshot(root: string): Promise<Record<string, string>> {
  const output: Record<string, string> = {};
  async function walk(directory: string): Promise<void> {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = join(directory, item.name);
      if (item.isDirectory()) await walk(file);
      else output[relative(root, file)] = (await readFile(file)).toString("base64");
    }
  }
  await walk(root); return output;
}
afterEach(async () => {
  for (const root of roots.splice(0)) {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !root.includes("maps-rebuild-preservation-")) throw new Error(`Unsafe test cleanup path: ${root}`);
    await rm(root, { recursive: true, force: true });
  }
});

it.each([false, true])("admits markings bootstrap with existing scene root = %s", async existing => {
  const root = await scene();
  if (existing) await sentinels(root);
  expect(await preflightSceneMarkings(root)).toBe("bootstrap");
  let writes = 0;
  await runSceneRebuild(root, async () => {
    for (const file of owned) await expect(readFile(join(root, file))).rejects.toThrow();
    writes++; await put(root, "terrain.mesh", "new terrain");
  });
  expect(writes).toBe(1); expect(await readFile(join(root, "terrain.mesh"), "utf8")).toBe("new terrain");
  if (existing) for (const file of companions) expect(await readFile(join(root, file), "utf8")).toBe(`original:${file}`);
});

it("admits a consistent published-only pair and cleans before writing, preserving companion output", async () => {
  const root = await scene(); await sentinels(root);
  await put(root, "markings.mesh", encodeMesh(mesh())); await put(root, "markings-provenance.json", json(provenance()));
  const before = await snapshot(root);
  expect(await preflightSceneMarkings(root)).toBe("published-only"); expect(await snapshot(root)).toEqual(before);
  let writes = 0;
  await runSceneRebuild(root, async () => {
    for (const file of owned) await expect(readFile(join(root, file))).rejects.toThrow();
    writes++; await put(root, "markings.mesh", "replacement");
  });
  expect(writes).toBe(1);
  for (const file of companions) expect(await readFile(join(root, file), "utf8")).toBe(`original:${file}`);
});

type Fixture = { name: string; meshBytes?: Uint8Array | null; provenanceBytes?: Uint8Array | null; message: RegExp };
const editedMesh = (edit: (value: MeshData) => void): Uint8Array => { const value = mesh(); edit(value); return encodeMesh(value); };
const cases: Fixture[] = [
  { name: "authored pair", meshBytes: editedMesh(value => { value.header.note += " Plus bounded authored west Scramble approach paint; see markings-provenance.json."; }), provenanceBytes: json({ published: provenance(), authored: { kind: "authored", records: [] } }), message: /markings-provenance.json.*authored paint/ },
  { name: "mesh without provenance", provenanceBytes: null, message: /markings-provenance.json.*missing/ },
  { name: "provenance without mesh", meshBytes: null, message: /markings.mesh.*missing/ },
  { name: "malformed JSON", provenanceBytes: Buffer.from("{"), message: /markings-provenance.json.*valid JSON/ },
  { name: "null JSON", provenanceBytes: json(null), message: /provenance object/ },
  { name: "array JSON", provenanceBytes: json([]), message: /provenance object/ },
  { name: "unknown object", provenanceBytes: json({ version: 3 }), message: /provenance format/ },
  { name: "malformed authored property", provenanceBytes: json({ ...provenance(), authored: null }), message: /authored wrapper/ },
  { name: "published wrapper without authored", provenanceBytes: json({ published: provenance() }), message: /authored wrapper/ },
  { name: "published mesh with authored provenance", provenanceBytes: json({ published: provenance(), authored: { kind: "authored" } }), message: /authored paint/ },
  { name: "authored mesh with published provenance", meshBytes: editedMesh(value => { value.header.note += " Plus authored paint."; }), message: /markings.mesh.*authored paint/ },
  { name: "truncated mesh", meshBytes: encodeMesh(mesh()).slice(0, -1), message: /markings.mesh.*cannot be decoded/ },
  { name: "non-mesh bytes", meshBytes: Buffer.from("invalid"), message: /markings.mesh.*cannot be decoded/ },
  { name: "wrong mesh name", meshBytes: editedMesh(value => { value.header.name = "roads"; }), message: /markings.mesh.*malformed markings/ },
  { name: "unknown producer note", meshBytes: editedMesh(value => { value.header.note = "different producer"; }), message: /recognised published-only producer/ },
  { name: "nonfinite geometry", meshBytes: editedMesh(value => { value.positions[0] = NaN; }), message: /malformed markings geometry/ },
  { name: "out-of-range index", meshBytes: editedMesh(value => { value.indices[0] = 3; }), message: /malformed markings geometry/ },
  { name: "triangle count disagreement", provenanceBytes: json({ ...provenance(), triangleCount: 2 }), message: /records 2 published triangles.*carries 1/ },
  { name: "invalid source digest", provenanceBytes: json({ ...provenance(), sources: [{ file: "source.gml", sha256: "wrong" }] }), message: /malformed published source/ },
  { name: "unknown published function", provenanceBytes: json({ ...provenance(), functions: [9999], features: [{ id: "paint", functionCode: 9999, polygons: 1 }] }), message: /malformed published source/ },
  { name: "incomplete producer function list", provenanceBytes: json({ ...provenance(), functions: [1010] }), message: /malformed published source/ },
  { name: "invalid feature count", provenanceBytes: json({ ...provenance(), features: [{ id: "paint", functionCode: 1010, polygons: -1 }] }), message: /malformed published source/ },
];
it.each(cases)("refuses $name before real cleanup or writer and preserves all bytes", async fixture => {
  const root = await scene(); await sentinels(root);
  if (fixture.meshBytes !== null) await put(root, "markings.mesh", fixture.meshBytes ?? encodeMesh(mesh()));
  if (fixture.provenanceBytes !== null) await put(root, "markings-provenance.json", fixture.provenanceBytes ?? json(provenance()));
  const before = await snapshot(root); let writes = 0;
  await expect(runSceneRebuild(root, async () => { writes++; await put(root, "terrain.mesh", "would replace"); })).rejects.toThrow(fixture.message);
  expect(writes).toBe(0); expect(await snapshot(root)).toEqual(before);
});

it("refuses an existing non-file marker instead of treating it as absent bootstrap", async () => {
  const root = await scene(); await sentinels(root);
  await mkdir(join(root, "markings.mesh")); await put(root, "markings.mesh/retained.bin", "retained marker contents");
  await put(root, "markings-provenance.json", json(provenance()));
  const before = await snapshot(root); let writes = 0;
  await expect(runSceneRebuild(root, async () => { writes++; })).rejects.toThrow(/markings.mesh.*not a regular/);
  expect(writes).toBe(0); expect(await snapshot(root)).toEqual(before);
});

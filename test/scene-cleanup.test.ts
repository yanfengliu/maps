/** The geometry builder must never delete companion outputs from shared scene/.
 * Bound: its seven owned names are replaced; sibling files and subtrees survive.
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { cleanSceneGeometry } from "../tools/scene/clean-geometry.js";

it("preserves agent assets, vegetation and future companion outputs", async () => {
  const parent = await mkdtemp(join(tmpdir(), "maps-clean-geometry-"));
  const scene = join(parent, "scene");
  try {
    for (const directory of ["buildings", "agents", "future"]) await mkdir(join(scene, directory), { recursive: true });
    for (const file of ["terrain.mesh", "roads.mesh", "pavements.mesh", "markings.mesh", "markings-provenance.json", "manifest.json", "buildings/old.b3dm", "agents/person.glb", "decorations.json", "future/data.bin"]) await writeFile(join(scene, file), file);
    await cleanSceneGeometry(scene);
    for (const file of ["agents/person.glb", "decorations.json", "future/data.bin"]) expect(await readFile(join(scene, file), "utf8")).toBe(file);
    for (const file of ["terrain.mesh", "roads.mesh", "pavements.mesh", "markings.mesh", "markings-provenance.json", "manifest.json", "buildings/old.b3dm"]) await expect(readFile(join(scene, file))).rejects.toThrow();
  } finally {
    if (!resolve(scene).startsWith(resolve(parent))) throw new Error("Cleanup test path escaped its temporary directory.");
    await rm(parent, { recursive: true, force: true });
  }
});

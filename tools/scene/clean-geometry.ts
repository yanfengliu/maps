/** Remove only this builder's outputs. The shared scene root also holds agent
 * assets and independently generated vegetation; a terrain rebuild owns neither.
 */
import { mkdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

export async function cleanSceneGeometry(sceneDirectory: string): Promise<void> {
  const root = resolve(sceneDirectory);
  const targets = ["terrain.mesh", "roads.mesh", "pavements.mesh", "markings.mesh", "markings-provenance.json", "buildings", "manifest.json"].map((name) => resolve(root, name));
  for (const target of targets) {
    if (!target.startsWith(root + sep)) throw new Error(`Refused scene cleanup: ${target} is outside ${root}. Geometry output paths must stay inside their scene directory.`);
  }
  for (const target of targets) await rm(target, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
}

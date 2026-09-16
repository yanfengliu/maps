/** Complete-run evidence must survive every sibling spec with exact fresh bytes.
 * Bound: eight hero frames and eighteen sweep frames for each current style, at
 * 1280x720, captured in the lane this process names — the verdict lane.
 * The hardware iteration lane is refused by name: its frames come from a
 * different renderer than the reviewed set and it produces no certificate.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { decodePng } from "./png.ts";
import { activeLane, assertCertifiable, laneDir } from "./lane.ts";
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export async function beginVisualRun(root: string, dist = "dist"): Promise<void> {
  await mkdir(root, { recursive: true });
  // A complete.json from an earlier run must not survive this run's start. It is
  // the gate's own success artifact, and a run that fails after this point would
  // otherwise leave the previous run's artifact behind describing a run that did
  // not happen. A gate that cannot tell "passed" from "did not run" reports the
  // second as the first.
  await rm(join(root, "complete.json"), { force: true });
  const files = [`${dist}/index.html`, ...(await readdir(`${dist}/assets`)).filter((name) => /\.(js|css)$/.test(name)).map((name) => `${dist}/assets/${name}`)];
  const build: { file: string; sha256: string }[] = [];
  for (const file of files) build.push({ file, sha256: hash(await readFile(file)) });
  await writeFile(join(root, "run.json"), JSON.stringify({ startedAt: new Date().toISOString(), lane: activeLane(), requestedGpu: process.env["MAPS_VISUAL_GPU"] ?? "software", build }, null, 2));
}
export async function verifyVisualRun(root: string): Promise<void> {
  const run = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as { startedAt: string; build: { file: string; sha256: string }[] };
  for (const file of run.build) if (hash(await readFile(file.file)) !== file.sha256) throw new Error(`Visual build changed during capture: ${file.file}. Rebuild and recapture before reviewing this run.`);
  const expected = new Map<string, string[]>();
  expected.set("hero/hero.json", ["satellite", "cartographic"].flatMap((style) => ["dusk", "noon"].flatMap((time) => ["crossing", "approach"].map((pose) => `hero-${style}-${time}-${pose}.png`))));
  for (const style of ["satellite", "cartographic"]) expected.set(`sweep/${style}/manifest.json`, ["plaza", "block", "overhead"].flatMap((shot) => ["000", "060", "120", "180", "240", "300"].map((az) => `${shot}-az${az}.png`)));
  const files: { file: string; sha256: string }[] = [];
  for (const [manifestName, names] of expected) {
    const manifestPath = join(root, manifestName);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { capturedAt: string; frames: { file: string; sha256: string }[] };
    if (Date.parse(manifest.capturedAt) < Date.parse(run.startedAt) || !Number.isFinite(Date.parse(manifest.capturedAt))) throw new Error(`Stale visual manifest: ${manifestName}. This complete run must capture every required frame.`);
    if (manifest.frames.length !== names.length || new Set(manifest.frames.map((frame) => frame.file)).size !== names.length) throw new Error(`Incomplete or duplicate frames in ${manifestName}; expected ${names.length}.`);
    for (const name of names) {
      const frame = manifest.frames.find((entry) => entry.file === name);
      if (!frame) throw new Error(`${manifestName} omitted ${name}.`);
      const file = join(manifestName, "..", name); const bytes = await readFile(join(root, file));
      if (hash(bytes) !== frame.sha256) throw new Error(`${file} changed after capture; its review cannot transfer to different bytes.`);
      const png = decodePng(bytes);
      if (png.width !== 1280 || png.height !== 720) throw new Error(`${file} is ${png.width}x${png.height}, expected native 1280x720.`);
      files.push({ file, sha256: frame.sha256 });
    }
  }
  if (files.length !== 44) throw new Error(`The complete visual run retained ${files.length}/44 frames.`);
  await writeFile(join(root, "complete.json"), JSON.stringify({ ...run, completedAt: new Date().toISOString(), frames: files }, null, 2));
  console.log("All 44 fresh native-resolution frames survived the complete visual gate with matching hashes.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // This script creates the run's certificate, so it runs as the verdict lane by
  // construction. An attempt to point it at the hardware iteration lane fails
  // here, by name, before any artifact is written.
  assertCertifiable(activeLane());
  const root = resolve(laneDir("verdict"));
  if (process.argv.includes("--begin")) await beginVisualRun(root);
  else await verifyVisualRun(root);
}

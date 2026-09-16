/** harness: vehicle-only offline builder. No downloads, human imports, rendering
 * or task-wide cleanup. Verify the complete staged fleet before publishing it.
 * An interrupted four-file publication is detected by hashes; rerun this command.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { vehicleDirectoryArgument, verifyVehicleDirectory } from "./verify-vehicles.ts";

const root = resolve(import.meta.dirname, "../..");
const directory = vehicleDirectoryArgument(process.argv.slice(2));
await mkdir(directory, { recursive: true });
const outputRoot = await realpath(directory);
const stage = await mkdtemp(resolve(outputRoot, ".vehicles-build-"));
const recipe = resolve(import.meta.dirname, "build-vehicles.py");
const recipeSha256 = createHash("sha256").update(await readFile(recipe)).digest("hex");
const blender = process.env["MAPS_BLENDER_PATH"] ?? "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe";
const args = ["--background", "--factory-startup", "--offline-mode", "--python-exit-code", "1", "--python", recipe, "--", root, "--output", resolve(stage, "models")];
const child = spawn(blender, args, { cwd: root, windowsHide: true, stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, BLENDER_USER_RESOURCES: resolve(stage, "blender-user") } });
let closed = false, interrupted = false, spawnError: Error | undefined;
const done = new Promise<number | null>(finish => {
  child.once("error", error => { spawnError = error; });
  child.once("close", code => { closed = true; finish(code); });
});
// The retained ChildProcess is the only termination authority. No ancestry/PID-tree kill.
const stop = () => { interrupted = true; if (!closed) child.kill(); };
let timeout: ReturnType<typeof setTimeout> | undefined;
const deadline = new Promise<never>((_, reject) => { timeout = setTimeout(() => { stop(); reject(new Error(`Vehicle Blender build exceeded 120 seconds; retained output: ${stage}`)); }, 120_000); });
process.once("SIGINT", stop); process.once("SIGTERM", stop);
console.log(`Vehicle builder owns Blender PID ${child.pid ?? "not-started"}; isolated output ${stage}.`);
try {
  const code = await Promise.race([done, deadline]);
  if (spawnError || interrupted || code !== 0) throw new Error(`Vehicle Blender build failed (${spawnError?.message ?? `exit ${code}${interrupted ? ", interrupted or 120s deadline" : ""}`}). Set MAPS_BLENDER_PATH to Blender5.2.0 LTS and rerun; retained output: ${stage}`);
  const result = await verifyVehicleDirectory(resolve(stage, "models"), recipeSha256);
  // Publish only this fleet's named files. Human files and unrelated assets are preserved.
  for (const asset of result.manifest.vehicles) await copyFile(resolve(stage, "models", asset.model), resolve(outputRoot, asset.model));
  await copyFile(resolve(stage, "models/vehicles.json"), resolve(outputRoot, "vehicles.json"));
  await verifyVehicleDirectory(outputRoot, recipeSha256);
  console.log(JSON.stringify({ manifestSha256: result.manifestSha256, directory: outputRoot, reports: result.reports, blenderPid: child.pid, blenderClosed: closed }));
  const actualStage = await realpath(stage);
  if (!actualStage.startsWith(outputRoot + sep + ".vehicles-build-") || actualStage === outputRoot) throw new Error(`Refusing temporary cleanup outside the created stage: ${actualStage}`);
  await rm(actualStage, { recursive: true });
} finally {
  clearTimeout(timeout); process.off("SIGINT", stop); process.off("SIGTERM", stop);
  if (!closed) {
    child.kill();
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([done, new Promise<never>((_, reject) => { closeTimer = setTimeout(() => reject(new Error(`Task-owned Blender PID ${child.pid} did not close after termination; inspect ${stage}`)), 10_000); })]); }
    finally { clearTimeout(closeTimer); }
  }
}

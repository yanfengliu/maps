/** Explicit restoration of the admitted external packet. No fetch or generation. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { RAIL_DATA_PREPARATION, RAIL_MANIFEST_SHA256, trialAssets, validateRailTrial, type RailTrialManifest } from "../../src/world/rail-trial.ts";

const digest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
function fail(file: string, detail: string): never { throw new Error(`Rail installation ${file}: ${detail}. ${RAIL_DATA_PREPARATION}`); }
function read(file: string): Buffer {
  try { return fs.readFileSync(file); }
  catch (error) { return fail(file, `cannot read the required file (${error instanceof Error ? error.message : String(error)})`); }
}
function inspect(file: string): fs.Stats | null {
  try { return fs.lstatSync(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
function ownedDirectory(file: string): boolean {
  const info = inspect(file);
  if (!info) return false;
  if (!info.isDirectory() || info.isSymbolicLink()) fail(file, "destination must be an owned directory, not a file, symlink or junction; nothing was overwritten");
  return true;
}

/** The destination is always this project's data/rail. Validate every input
 * before creating it. Publish manifest last, so the existing loader cannot
 * accept a partial packet. Existing directories are verified, never repaired. */
export function installRail(manifestFile: string, projectRoot = process.cwd()): { status: "installed" | "already-installed"; directory: string; files: number; bytes: number; sha256: string } {
  const root = path.resolve(projectRoot), data = path.join(root, "data"), destination = path.join(data, "rail");
  if (!ownedDirectory(root)) fail(root, "project directory does not exist");
  ownedDirectory(data); ownedDirectory(destination);
  const source = path.resolve(manifestFile), manifestBytes = read(source);
  if (digest(manifestBytes) !== RAIL_MANIFEST_SHA256) fail(source, `manifest differs from admitted SHA-256 ${RAIL_MANIFEST_SHA256}; no destination was changed`);
  const manifest = JSON.parse(manifestBytes.toString()) as RailTrialManifest;
  validateRailTrial(manifest);
  const pins = trialAssets(manifest);
  if (pins.length !== 33 || manifest.tiles.length !== 3) fail(source, "expected 33 packet assets and three original source tiles");
  const files = new Map<string, Buffer>();
  for (const pin of pins) {
    const file = path.join(path.dirname(source), pin.file), bytes = read(file);
    if (bytes.length !== pin.bytes || digest(bytes) !== pin.sha256) fail(file, `asset differs from its admitted length/SHA-256; expected ${pin.bytes} bytes and ${pin.sha256}; no destination was changed`);
    files.set(pin.file, bytes);
  }
  for (const pin of manifest.tiles) {
    const file = path.join(root, "data/scene/buildings", pin.uri), bytes = read(file);
    if (bytes.length !== pin.bytes || digest(bytes) !== pin.sha256) fail(file, `source tile differs from its admitted length/SHA-256; restore the reviewed scene cache (${pin.sha256}); no destination was changed`);
  }
  files.set("manifest.json", manifestBytes);
  const result = { directory: destination, files: files.size, bytes: [...files.values()].reduce((n, b) => n + b.length, 0), sha256: RAIL_MANIFEST_SHA256 };
  if (ownedDirectory(destination)) {
    const expected = [...files.keys()].sort(), actual = fs.readdirSync(destination).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(destination, "existing directory is partial or has foreign files; preserve it separately before installing, nothing was overwritten");
    for (const [name, bytes] of files) {
      const file = path.join(destination, name), info = inspect(file);
      if (!info?.isFile() || info.isSymbolicLink() || !read(file).equals(bytes)) fail(file, "existing entry is linked or has different bytes; preserve it separately before installing, nothing was overwritten");
    }
    return { status: "already-installed", ...result };
  }
  if (!ownedDirectory(data)) fs.mkdirSync(data); // Never follows an existing data junction.
  fs.mkdirSync(destination); // Exclusive creation; no existing/foreign directory is replaced.
  const written: string[] = [];
  try {
    for (const [name, bytes] of files) {
      const file = path.join(destination, name); let fd: number | undefined;
      try { fd = fs.openSync(file, "wx"); written.push(file); fs.writeFileSync(fd, bytes); }
      finally { if (fd !== undefined) fs.closeSync(fd); }
    }
  } catch (error) {
    // Delete only files created by this call, then only an empty owned directory.
    // Unknown concurrent additions are preserved and make rmdir fail explicitly.
    try { for (const file of written.reverse()) fs.unlinkSync(file); fs.rmdirSync(destination); }
    catch (cleanup) { throw new Error(`Rail installation failed at ${destination}: ${String(error)}. Partial destination retained because cleanup failed: ${String(cleanup)}. Preserve it separately; the installer will not overwrite it.`); }
    throw new Error(`Rail installation failed at ${destination}; newly created files were removed and no manifest was published: ${String(error)}`);
  }
  return { status: "installed", ...result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--from" || !args[1]) throw new Error(`Use npm run data:rail -- --from <path/to/manifest.json>. ${RAIL_DATA_PREPARATION}`);
  console.log(JSON.stringify(installRail(args[1]), null, 2));
}

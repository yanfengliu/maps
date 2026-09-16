/**
 * Real bytes under `artifacts/`, with junctions never followed, plus the copied
 * inputs that should not be there at all. `npm run artifacts:size`.
 *
 * A junction is a reparse point, and every recursive tool in this fleet follows
 * one: `Get-ChildItem -Recurse`, `Remove-Item -Recurse`, `rm -rf` and git's own
 * recursive delete all walk through it, so a naive total counts the primary
 * checkout once per worktree and a naive delete removes files outside
 * `artifacts/`. This walks with `lstat` instead, reports every reparse point by
 * name, and never counts a junction's target.
 *
 * The ceiling is a growth gate, not a budget for the deliverable. Measured
 * 2026-09-15 across 54,916 MiB of task evidence: nine worktree checkouts carried
 * a full copy of the ignored, regenerable `data/` at 1,430 MB each, and the same
 * observer run trees were copied three to five times. A real `data/` or
 * `node_modules/` over the ceiling is that defect coming back; the answer is a
 * junction to the primary checkout, or deletion once the task closes. The
 * largest legitimate partial copy on that measurement was 258 MiB, a review's
 * frozen candidate input, so the line sits at 512 MiB.
 *
 * Detection is by name, so it also reports directories that merely share one:
 * a Playwright HTML report keeps its attachments in `data/`, at about 150 MB
 * with a retained failure trace. Those are reported, not counted as inputs.
 */
import { lstatSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "artifacts";
const REGENERABLE = new Set(["data", "node_modules"]);
const COPY_CEILING_BYTES = 512 * 1024 * 1024;
const OUT = join(ROOT, "storage-cleanup", "artifact-size.json");

interface Measured {
  bytes: number;
  files: number;
}
interface Copy extends Measured {
  path: string;
}

const reparse: string[] = [];
const copies: Copy[] = [];
const entries: Copy[] = [];
let total: Measured = { bytes: 0, files: 0 };

function walk(dir: string, collectCopies: boolean): Measured {
  let bytes = 0;
  let files = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const stat = lstatSync(path);
    // A junction or symlink is a reparse point, not a directory: count nothing
    // under it, because its bytes belong to wherever it points.
    if (stat.isSymbolicLink()) {
      reparse.push(path);
      continue;
    }
    if (stat.isDirectory()) {
      if (collectCopies && REGENERABLE.has(entry.name)) {
        const size = walk(path, false);
        copies.push({ path, ...size });
        bytes += size.bytes;
        files += size.files;
        continue;
      }
      const sub = walk(path, collectCopies);
      bytes += sub.bytes;
      files += sub.files;
      continue;
    }
    if (stat.isFile()) {
      bytes += stat.size;
      files += 1;
    }
  }
  return { bytes, files };
}

for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  const path = join(ROOT, entry.name);
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
  const size = walk(path, true);
  entries.push({ path, ...size });
  total = { bytes: total.bytes + size.bytes, files: total.files + size.files };
}

entries.sort((a, b) => b.bytes - a.bytes);
copies.sort((a, b) => b.bytes - a.bytes);
const oversized = copies.filter((copy) => copy.bytes > COPY_CEILING_BYTES);
const mb = (bytes: number) => (bytes / 1048576).toFixed(1);

for (const entry of entries) {
  console.log(`${mb(entry.bytes).padStart(10)} MiB  ${String(entry.files).padStart(8)} files  ${entry.path}`);
}
console.log(`${mb(total.bytes).padStart(10)} MiB  ${String(total.files).padStart(8)} files  TOTAL, junctions excluded`);
console.log(`${reparse.length} reparse point(s), never counted and never to be deleted recursively`);
for (const path of reparse) console.log(`  junction  ${path}`);
for (const copy of copies.filter((entry) => entry.bytes > 1024 * 1024)) {
  console.log(`  real ${copy.path.includes("node_modules") ? "node_modules" : "data"} directory  ${mb(copy.bytes).padStart(9)} MiB  ${copy.path}`);
}

mkdirSync(join(ROOT, "storage-cleanup"), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ totalBytes: total.bytes, totalFiles: total.files, copyCeilingBytes: COPY_CEILING_BYTES, entries, copies, reparse }, null, 2)}\n`,
);

if (oversized.length > 0) {
  for (const copy of oversized) {
    console.error(
      `Copied input tree over the ${mb(COPY_CEILING_BYTES)} MiB ceiling: ${copy.path} at ${mb(copy.bytes)} MiB. ` +
        `A worktree junctions data/ and node_modules/ to the primary checkout instead of copying them, and a closed task's copy is deleted. ` +
        `Both directories are regenerable with npm run data:fetch and npm run data:scene.`,
    );
  }
  process.exitCode = 1;
}
console.log(JSON.stringify({ totalMb: Number(mb(total.bytes)), entries: entries.length, reparse: reparse.length, copiesOverCeiling: oversized.length }));

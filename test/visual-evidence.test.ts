/** Bound: a complete 44-frame manifest and its exact files. This catches sibling
 * cleanup deleting earlier captures; synthetic PNGs here do not prove graphics.
 *
 * Timing bound: neither case runs on Vitest's 5000 ms default, and each names the
 * ceiling it does run on. The work here is real and local, and it is larger than
 * that default once this machine is fully subscribed, which is its normal state:
 * a sibling checkout holds all 32 logical cores with its own Vite server and
 * browser suite. The same tree, the same two cases, nothing changing between the
 * runs, measured on 2026-09-16:
 *
 * | This file | Observed |
 * | --- | --- |
 * | alone | 1.09 s, both cases pass |
 * | inside the loaded 59-file suite | 10.06 s, both cases dead at `Test timed out in 5000ms` |
 * | alone, later the same evening, heavier load | 3.34 s — case 1 458 ms, case 2 2881 ms |
 *
 * - `BEGIN_RUN_BUDGET_MS` covers "clears the previous complete.json when a new
 *   capture run begins". That case drives the real `beginVisualRun`, which digests
 *   the whole scene the preview server serves before it opens the run: 214,114,015
 *   bytes over 84 files on the payload pinned on 2026-09-16, `data/scene` 83 files
 *   and 203,874,605 bytes plus `data/network` 1 file and 10,239,410. Measured:
 *   425-447 ms per call over the earlier, larger 371,228,426-byte payload with the
 *   machine otherwise idle (`docs/learning/gate-proofs.md`, "The scene digest sees
 *   a served file rewritten in place"), 458 ms in-suite with the page cache warm,
 *   and 2,185 ms for the same call over today's payload with every core held. The
 *   case asserts nothing about that digest — it checks that the previous
 *   certificate is gone and that `run.json` names the build files — but the digest
 *   is inside `beginVisualRun`, ahead of the `run.json` it does assert.
 * - `EVIDENCE_BUDGET_MS` covers "rejects deleted sibling frames, stale runs, changed
 *   build bytes and changed frame bytes". Four of its six `verifyVisualRun` calls
 *   refuse before reading a frame; the first and the last accept, and each accepted
 *   call reads and decodes all 44 frames at native 1280x720. That is 88 decodes,
 *   each inflating and unfiltering 921,600 pixels: 21 ms a frame on a quiet
 *   machine, 1.85 s of work for the case, 2.9 s measured under this machine's load.
 *
 * Removing that work instead of bounding it means changing `tools/visual/**`:
 * `beginVisualRun`'s mounts are module constants rather than a parameter, so no
 * caller can point it at a smaller tree, and the 88 decodes are what
 * `verifyVisualRun` does rather than something this file adds around it. That path
 * is closed while a capture may start, and the harness is bound into the
 * certificate's own digest. What is left is to say which ceiling applies to which
 * case and why it is that number, which is the last case below.
 */
import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { beginVisualRun, verifyVisualRun } from "../tools/visual/verify-output.js";

/**
 * The costs the two ceilings are derived from, each with the provenance of its
 * number. They are here rather than only in the comment above so that the ceilings
 * can be checked against them: a bound nobody can re-derive is a number, not a
 * bound.
 */
const MEASURED_COST = {
  /** `sceneTreeDigest` over the served scene: 214,114,015 bytes, 84 files, all 32 cores held. */
  sceneDigestMs: 2_185,
  /** `harnessTreeDigest` in the same call: 199,139 bytes, 22 files. */
  harnessDigestMs: 91,
  /** One `decodePng` of a native 1280x720 frame, machine quiet. */
  frameDecodeMs: 21,
  /** Frames an accepted pass decodes: all 44 the check requires. */
  framesPerAcceptedPass: 44,
  /** Accepted passes in the second case: the first and the last `verifyVisualRun`. */
  acceptedPasses: 2,
  /** Same tree, same two cases: 10.06 s inside the loaded suite against 1.09 s alone. */
  suiteContention: 10.06 / 1.09,
} as const;

/** The worst the first case's own work has cost at the contention this suite produces. */
const WORST_BEGIN_RUN_MS =
  (MEASURED_COST.sceneDigestMs + MEASURED_COST.harnessDigestMs) * MEASURED_COST.suiteContention;

/** The worst the second case's own work has cost, the same way. */
const WORST_EVIDENCE_MS =
  MEASURED_COST.frameDecodeMs
  * MEASURED_COST.framesPerAcceptedPass
  * MEASURED_COST.acceptedPasses
  * MEASURED_COST.suiteContention;

/**
 * What the first case may spend: 2.9x the worst cost above.
 *
 * The ceiling is a literal rather than that product, for the reason
 * `tools/visual/budget.ts` gives for its own allowances: the number is a claim
 * about how much slower than its worst measurement a correct case may run, and the
 * last case in this file checks the claim. A case that needs more than 60 s on this
 * work is a defect to report, not a budget to raise.
 */
const BEGIN_RUN_BUDGET_MS = 60_000;

/** What the second case may spend: 3.5x the worst cost above, on the same rule. */
const EVIDENCE_BUDGET_MS = 60_000;

/** Bound: the gate's own success artifact, against a later run that failed. */
it(
  "clears the previous complete.json when a new capture run begins",
  { timeout: BEGIN_RUN_BUDGET_MS },
  async () => {
    const root = await mkdtemp(join(tmpdir(), "maps-visual-begin-"));
    const dist = join(root, "dist");
    try {
      await mkdir(join(dist, "assets"), { recursive: true });
      await writeFile(join(dist, "index.html"), "<!doctype html>");
      await writeFile(join(dist, "assets", "index-abc.js"), "built");
      await writeFile(join(root, "complete.json"), JSON.stringify({ completedAt: "2026-09-14T00:00:00Z" }));
      // The GPU identity is passed rather than probed: this case is about the
      // certificate being cleared, and a unit gate must not depend on the machine
      // it runs on having a GPU tool installed.
      await beginVisualRun(root, dist, { name: "NVIDIA GeForce RTX 4090", driverVersion: "616.64", source: "nvidia-smi" });
      await expect(readFile(join(root, "complete.json"), "utf8")).rejects.toThrow(/ENOENT/);
      const run = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as {
        build: { file: string; sha256: string }[];
      };
      expect(run.build.map((entry) => entry.file.replaceAll("\\", "/")).map((file) => file.split("/").slice(-2).join("/")))
        .toEqual(["dist/index.html", "assets/index-abc.js"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

it(
  "rejects deleted sibling frames, stale runs, changed build bytes and changed frame bytes",
  { timeout: EVIDENCE_BUDGET_MS },
  async () => {
    const root = await mkdtemp(join(tmpdir(), "maps-visual-evidence-"));
    try {
      const chunk = (type: string, body: Buffer): Buffer => { const size = Buffer.alloc(4); size.writeUInt32BE(body.length); return Buffer.concat([size, Buffer.from(type), body, Buffer.alloc(4)]); };
      const header = Buffer.alloc(13); header.writeUInt32BE(1280); header.writeUInt32BE(720, 4); header[8] = 8;
      const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.alloc(1281 * 720))), chunk("IEND", Buffer.alloc(0))]);
      const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
      const buildFile = join(root, "build.js"); await writeFile(buildFile, "frozen build");
      await writeFile(join(root, "run.json"), JSON.stringify({ startedAt: "2026-09-08T00:00:00Z", build: [{ file: buildFile, sha256: hash(Buffer.from("frozen build")) }] }));
      const manifests = new Map<string, string[]>();
      manifests.set("hero/hero.json", ["satellite", "cartographic"].flatMap((style) => ["dusk", "noon"].flatMap((time) => ["crossing", "approach"].map((pose) => `hero-${style}-${time}-${pose}.png`))));
      for (const style of ["satellite", "cartographic"]) manifests.set(`sweep/${style}/manifest.json`, ["plaza", "block", "overhead"].flatMap((shot) => ["000", "060", "120", "180", "240", "300"].map((angle) => `${shot}-az${angle}.png`)));
      for (const [file, names] of manifests) {
        const directory = dirname(join(root, file)); await mkdir(directory, { recursive: true });
        for (const name of names) await writeFile(join(directory, name), png);
        await writeFile(join(root, file), JSON.stringify({ capturedAt: "2026-09-08T00:01:00Z", frames: names.map((name) => ({ file: name, sha256: hash(png) })) }));
      }
      await verifyVisualRun(root);
      const hero = join(root, "hero/hero-satellite-dusk-crossing.png");
      await rm(hero); await expect(verifyVisualRun(root)).rejects.toThrow(/ENOENT/); await writeFile(hero, png);
      await writeFile(hero, Buffer.concat([png, Buffer.from("changed")])); await expect(verifyVisualRun(root)).rejects.toThrow(/changed after capture/); await writeFile(hero, png);
      const manifestPath = join(root, "hero/hero.json"); const manifest = await readFile(manifestPath, "utf8");
      await writeFile(manifestPath, manifest.replace("00:01:00", "00:00:00").replace("2026-09-08", "2026-09-07"));
      await expect(verifyVisualRun(root)).rejects.toThrow(/Stale visual manifest/); await writeFile(manifestPath, manifest);
      await writeFile(buildFile, "new build"); await expect(verifyVisualRun(root)).rejects.toThrow(/build changed during capture/); await writeFile(buildFile, "frozen build");
      await verifyVisualRun(root);
    } finally { await rm(root, { recursive: true, force: true }); }
  },
);

/** Bound: both ceilings, against the work each one covers, and against the two
 * cases actually running on them. Prose in a header keeps neither true.
 */
it("keeps both cases on a ceiling derived from the work each one does", () => {
  // Between 2x and 4x the worst cost that case's own work has shown at the
  // contention this suite produces. Under 2x the ceiling is the 5000 ms default
  // again, which failed a correct case; over 4x it has stopped describing this
  // case's work and would report a hang long after the run should have stopped.
  for (const [name, ceiling, worst] of [
    ["clears the previous complete.json when a new capture run begins", BEGIN_RUN_BUDGET_MS, WORST_BEGIN_RUN_MS],
    ["rejects deleted sibling frames, stale runs, changed build bytes and changed frame bytes", EVIDENCE_BUDGET_MS, WORST_EVIDENCE_MS],
  ] as const) {
    expect(
      ceiling,
      `"${name}" is bounded too tightly to survive the load this suite runs under: its own work costs ` +
        `${Math.round(worst)} ms at the contention measured, so ${ceiling} ms is less than twice that.`,
    ).toBeGreaterThan(2 * worst);
    expect(
      ceiling,
      `"${name}" carries a ceiling that no longer describes its own work: its own work costs ` +
        `${Math.round(worst)} ms at the contention measured, so ${ceiling} ms is more than four times that.`,
    ).toBeLessThan(4 * worst);
  }
  // A ceiling is only a bound while the cases run on it. A case that loses its
  // options falls back to the 5000 ms default, which is exactly what failed here,
  // and nothing above would notice. Read from disk, in the shape
  // `test/visual-budget.test.ts` uses for the capture specs.
  //
  // The needle is built rather than written out, and the count is asserted rather
  // than the presence. Spelled literally, the needle is found in this check's own
  // body, so the check passes with the option deleted from the case — which is what
  // the first version of this case did, until the mutation that removes the option
  // was run against it.
  const source = readFileSync(new URL("./visual-evidence.test.ts", import.meta.url), "utf8");
  const option = (ceiling: string): string => `{ timeout: ${ceiling} }`;
  expect(
    source.split(option("BEGIN_RUN_BUDGET_MS")).length - 1,
    "the first case does not run on BEGIN_RUN_BUDGET_MS",
  ).toBe(1);
  expect(
    source.split(option("EVIDENCE_BUDGET_MS")).length - 1,
    "the second case does not run on EVIDENCE_BUDGET_MS",
  ).toBe(1);
  expect(source, "a literal timeout replaced a derived ceiling").not.toMatch(/timeout: \d/);
});

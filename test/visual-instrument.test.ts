/**
 * harness: the visual gate's own instrument, over synthetic runs on disk. No
 * browser, no pixels, no real scene.
 *
 * The five checks this file pins answer one question each: whether the gate's
 * instrument can tell "passed" from "did not run". The frame set itself is pinned
 * by `test/visual-evidence.test.ts`, which drives `verifyVisualRun` and is
 * deliberately untouched by this lane — its synthetic manifests carry no renderer
 * and no lifecycle records, because it is the record of what the *frame* checks
 * accept, not of what the gate's report path requires.
 *
 * Bound, for the whole file: every case drives the wrapper's own functions over
 * directories it writes itself. It proves the refusals fire on the shapes they are
 * given. It cannot prove that a real 44-frame run produces those shapes, and it
 * cannot prove any frame looks right. That the real lifecycle lane writes three
 * conforming records is a fact about `lifecycle.spec.ts` and the gate's chain,
 * which `test/visual-instrument.test.ts` shares with the source-level checks in
 * the same file.
 *
 * Timing bound: the cases here that build a 44-frame run carry
 * `FRAME_SET_BUDGET_MS` instead of Vitest's 5000 ms default, because that work is
 * real and this machine is shared. Which ceiling applies to what, and the
 * measurements behind it, are in that constant's own comment below the imports.
 */
import { expect, it, describe } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import {
  HARNESS_ROOTS,
  beginVisualRun,
  certifyVisualRun,
  harnessTreeDigest,
  lifecycleEvidence,
  sceneTreeDigest,
  visualRunPhase,
} from "../tools/visual/verify-output.js";
import { LIFECYCLE_RECORD_DIR } from "../tools/visual/lifecycle-record.js";
import {
  HARDWARE_RENDERER_DENYLIST,
  PIXEL_LANE_RENDERER,
  pixelLaneRefusal,
} from "../tools/visual/lane.js";
import {
  TEARDOWN_COMPLETED,
  TEARDOWN_FAILED_PREFIX,
  TEARDOWN_RECORD_KEY,
  recordTeardown,
  teardownRecordRefusal,
} from "../src/harness/teardown.js";

/**
 * What a case that builds a synthetic 44-frame run may spend.
 *
 * Every case in the groups below that calls `withRun` writes 44 native 1280x720
 * frames, three manifests, three lifecycle records and a `run.json`, then has the
 * set read back and decoded at least once. Measured on this machine on
 * 2026-09-16: 1.77 s of local work for that write and that decode, 1.47 s for the
 * heaviest case with the box otherwise quiet, and — in the 20:02 full run — 3.83 s
 * passing and 5.05 s failing against the 5000 ms default, where two of these cases
 * died as `Test timed out in 5000ms` while every other test in the suite passed.
 * The work is 1.77 s and this suite's contention has been measured at 9.2x for its
 * sibling file, so the worst this case's own work has cost is about 16 s; 60 s is
 * under four times that, on the same rule `test/visual-evidence.test.ts` states for
 * its own two accepted passes over 44 frames.
 *
 * The ceiling is set on the groups rather than on each case because every case that
 * pays this cost lives in one of them, and a case in one of them that does not pay
 * it finishes in milliseconds either way.
 */
const FRAME_SET_BUDGET_MS = 60_000;

const SWIFTSHADER =
  "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)";
const RTX_4090 =
  "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function png(): Buffer {
  const chunk = (type: string, body: Buffer): Buffer => {
    const size = Buffer.alloc(4); size.writeUInt32BE(body.length);
    return Buffer.concat([size, Buffer.from(type), body, Buffer.alloc(4)]);
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(1280); header.writeUInt32BE(720, 4); header[8] = 8;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc(1281 * 720))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A run on disk plus the mounts its scene digest was taken over. */
interface SyntheticRun {
  root: string;
  mounts: { route: string; directory: string }[];
  /** The lane's own files, which the run pins a digest of. */
  harnessRoots: string[];
  lifecycleDir: string;
}

interface FrameSetOptions {
  /** What `sweep/satellite/manifest.json` reports. A key set to null writes none. */
  sweepRenderer?: unknown;
  /** What every frame of `hero/hero.json` reports. A key set to null writes none. */
  heroRenderer?: unknown;
  /** Replace the scene manifest after the run has pinned its digest. */
  sceneAfter?: string;
  /** Rewrite the lane's helper after the run has pinned its harness digest. */
  harnessEdit?: string;
  /** Add a file under the lane's own directory after the run pinned its digest. */
  harnessAdd?: string;
  /** Omit the lifecycle records entirely. */
  withoutLifecycle?: boolean;
}

/**
 * A complete, self-consistent 44-frame run on disk, its scene data, the harness it
 * pinned and its three lifecycle records. Everything the certificate reads is an
 * argument here, so each case changes exactly one thing.
 */
async function frameSet(options: FrameSetOptions = {}): Promise<SyntheticRun> {
  const root = await mkdtemp(join(tmpdir(), "maps-instrument-"));
  const mounts = [
    { route: "/scene/", directory: join(root, "data", "scene") },
    { route: "/network/", directory: join(root, "data", "network") },
  ];
  await mkdir(join(mounts[0]!.directory, "tiles"), { recursive: true });
  await writeFile(join(mounts[0]!.directory, "manifest.json"), "{\"version\":1}");
  await writeFile(join(mounts[0]!.directory, "tiles", "a.b3dm"), "tile bytes");
  await mkdir(mounts[1]!.directory, { recursive: true });
  await writeFile(join(mounts[1]!.directory, "network.json"), "{}");
  const scene = await sceneTreeDigest(mounts);

  // The harness the run pins: a lane directory of its own, so a case can change it
  // after `--begin` exactly as a commit during a real capture changes the real one.
  const harnessRoots = [join(root, "tools", "visual")];
  await mkdir(harnessRoots[0]!, { recursive: true });
  await writeFile(join(harnessRoots[0]!, "orbit.ts"), "export const settle = (): void => undefined;\n");
  await writeFile(join(harnessRoots[0]!, "hero.spec.ts"), "// the hero block\n");
  const harness = { roots: harnessRoots, ...(await harnessTreeDigest(harnessRoots)) };

  const buildFile = join(root, "dist", "index.html");
  await mkdir(dirname(buildFile), { recursive: true });
  await writeFile(buildFile, "frozen build");
  const build = [{ file: buildFile, sha256: hash(Buffer.from("frozen build")) }];
  const startedAt = new Date(Date.now() - 60_000).toISOString();
  await writeFile(
    join(root, "run.json"),
    JSON.stringify({ runId: "run-1", startedAt, lane: "verdict", requestedGpu: "software", build, scene, harness }),
  );

  const bytes = png();
  const manifests = new Map<string, string[]>();
  manifests.set("hero/hero.json", ["satellite", "cartographic"].flatMap((style) =>
    ["dusk", "noon"].flatMap((time) =>
      ["crossing", "approach"].map((pose) => `hero-${style}-${time}-${pose}.png`))));
  for (const style of ["satellite", "cartographic"]) {
    manifests.set(`sweep/${style}/manifest.json`, ["plaza", "block", "overhead"].flatMap((shot) =>
      ["000", "060", "120", "180", "240", "300"].map((angle) => `${shot}-az${angle}.png`)));
  }
  for (const [file, names] of manifests) {
    const directory = dirname(join(root, file));
    await mkdir(directory, { recursive: true });
    for (const name of names) await writeFile(join(directory, name), bytes);
    const isHero = file === "hero/hero.json";
    const renderer = isHero
      ? ("heroRenderer" in options ? options.heroRenderer : SWIFTSHADER)
      : ("sweepRenderer" in options ? options.sweepRenderer : SWIFTSHADER);
    await writeFile(join(root, file), JSON.stringify({
      capturedAt: new Date().toISOString(),
      ...(isHero ? {} : { glRenderer: renderer }),
      frames: names.map((name) => ({
        file: name,
        sha256: hash(bytes),
        ...(isHero ? { glRenderer: renderer } : {}),
      })),
    }));
  }

  const lifecycleDir = join(root, "lifecycle");
  if (options.withoutLifecycle !== true) {
    await mkdir(lifecycleDir, { recursive: true });
    for (let index = 0; index < 3; index += 1) {
      const at = new Date(Date.now() - 30_000 + index * 1_000).toISOString();
      await writeFile(join(lifecycleDir, `lifecycle-${at.replace(/[:.]/g, "-")}.json`), JSON.stringify({
        startedAt: at,
        finishedAt: new Date(Date.now() - 29_000 + index * 1_000).toISOString(),
        durationMs: 1_000,
        url: "/?time=noon",
        glRenderer: RTX_4090,
        preparationMs: 1_000,
        navigationStepMs: 104,
        replacementStepMs: 4_660,
        consoleAndPageErrors: [],
        teardownRecord: TEARDOWN_COMPLETED,
        build,
      }));
    }
  }
  if (options.sceneAfter !== undefined) {
    await writeFile(join(mounts[0]!.directory, "manifest.json"), options.sceneAfter);
  }
  if (options.harnessEdit !== undefined) {
    await writeFile(join(harnessRoots[0]!, "orbit.ts"), options.harnessEdit);
  }
  if (options.harnessAdd !== undefined) {
    await writeFile(join(harnessRoots[0]!, options.harnessAdd), "// added while the run was capturing\n");
  }
  return { root, mounts, harnessRoots, lifecycleDir };
}

async function withRun<T>(options: FrameSetOptions, body: (run: SyntheticRun) => Promise<T>): Promise<T> {
  const run = await frameSet(options);
  try {
    return await body(run);
  } finally {
    await rm(run.root, { recursive: true, force: true });
  }
}

/** The certificate, driven the way the gate's own end step drives it. */
function certify(run: SyntheticRun): Promise<void> {
  return certifyVisualRun(run.root, {
    sceneMounts: run.mounts,
    lifecycleDir: run.lifecycleDir,
    harnessRoots: run.harnessRoots,
  });
}

/** The refusal message from a certification that must not succeed. */
async function refusalFrom(run: SyntheticRun): Promise<string> {
  try {
    await certify(run);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error(
    "certification succeeded, and this case exists because it must not: a run whose harness moved during " +
      "capture was certified.",
  );
}

/** Rewrite one lifecycle record in place, the way a broken instrument would. */
async function amendLifecycleRecord(
  run: SyntheticRun,
  amend: (record: Record<string, unknown>) => void,
): Promise<void> {
  const files = (await readdir(run.lifecycleDir)).sort();
  const file = join(run.lifecycleDir, files[0]!);
  const record = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  amend(record);
  await writeFile(file, JSON.stringify(record));
}

describe("the pixel lane's renderer is asserted, not recorded", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("accepts the SwiftShader string the 2026-09-16 run recorded", () => {
    expect(pixelLaneRefusal(SWIFTSHADER, "sweep/satellite/manifest.json")).toBeNull();
    expect(PIXEL_LANE_RENDERER.test(SWIFTSHADER)).toBe(true);
  });

  it("refuses the hardware string a Chromium that ignored --use-angle would report", () => {
    const refusal = pixelLaneRefusal(RTX_4090, "sweep/satellite/manifest.json");
    expect(refusal).not.toBeNull();
    expect(refusal).toContain(RTX_4090);
    expect(refusal).toContain("not SwiftShader");
  });

  it("refuses a manifest that recorded no renderer at all, rather than passing it", () => {
    const refusal = pixelLaneRefusal(undefined, "sweep/cartographic/manifest.json");
    expect(refusal).not.toBeNull();
    expect(refusal).toContain("reported no glRenderer");
  });

  it("refuses to certify a run whose sweep manifest names the hardware renderer", async () => {
    await withRun({ sweepRenderer: RTX_4090 }, async (run) => {
      await expect(certify(run)).rejects.toThrow(/not SwiftShader/);
    });
  });

  it("refuses to certify a run whose sweep manifest recorded no renderer", async () => {
    await withRun({ sweepRenderer: null }, async (run) => {
      await expect(certify(run)).rejects.toThrow(/reported no glRenderer/);
    });
  });

  it("refuses to certify a run whose hero frames name no renderer", async () => {
    await withRun({ heroRenderer: null }, async (run) => {
      await expect(certify(run)).rejects.toThrow(/hero\/hero\.json frame .* reported no glRenderer/);
    });
  });

  it("keeps the two renderer predicates pointing opposite ways", () => {
    // One shared regex would make each lane's check agree with the other's by
    // construction, which is the shape a check built from the same symbol as its
    // subject has.
    expect(HARDWARE_RENDERER_DENYLIST.test(SWIFTSHADER)).toBe(true);
    expect(PIXEL_LANE_RENDERER.test(RTX_4090)).toBe(false);
    expect(HARDWARE_RENDERER_DENYLIST.test(RTX_4090)).toBe(false);
  });
});

describe("certification requires the hardware lifecycle lane's own evidence", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("certifies a complete run and records both renderers, the scene digest and the harness digest", async () => {
    await withRun({}, async (run) => {
      await certify(run);
      const complete = JSON.parse(await readFile(join(run.root, "complete.json"), "utf8")) as {
        runId: string;
        pixelRenderer: string;
        scene: { digest: string; files: number };
        harness: { digest: string; files: number; roots: string[] };
        lifecycle: { renderer: string; runs: unknown[] };
        frames: unknown[];
      };
      expect(complete.frames).toHaveLength(44);
      expect(complete.runId).toBe("run-1");
      expect(complete.pixelRenderer).toBe(SWIFTSHADER);
      expect(complete.lifecycle.renderer).toBe(RTX_4090);
      expect(complete.lifecycle.runs).toHaveLength(3);
      expect(complete.scene.digest).toMatch(/^[0-9a-f]{64}$/);
      expect(complete.scene.files).toBeGreaterThan(0);
      // The harness that drove the browser, in the certificate rather than only in
      // the wrapper's run record: this is what B4 of round 31 found missing.
      expect(complete.harness.digest).toMatch(/^[0-9a-f]{64}$/);
      expect(complete.harness.files).toBe(2);
      expect(complete.harness.roots).toEqual(run.harnessRoots);
    });
  });

  it("refuses a run whose lifecycle invocation never happened", async () => {
    await withRun({ withoutLifecycle: true }, async (run) => {
      await expect(certify(run)).rejects.toThrow(/left no records/);
    });
  });

  it("refuses a run with two lifecycle records, naming both counts", async () => {
    await withRun({}, async (run) => {
      const files = await readdir(run.lifecycleDir);
      await rm(join(run.lifecycleDir, files[0]!));
      await expect(certify(run)).rejects.toThrow(/reported 2 of 3 runs newer than this run's start/);
    });
  });

  it("ignores a record left behind by an earlier run", async () => {
    await withRun({}, async (run) => {
      await writeFile(join(run.lifecycleDir, "lifecycle-2026-09-14T00-30-00-000Z.json"), JSON.stringify({
        startedAt: "2026-09-14T00:30:00.000Z",
        finishedAt: "2026-09-14T00:31:00.000Z",
        durationMs: 60_000,
        url: "/?time=noon",
        glRenderer: RTX_4090,
        preparationMs: 1,
        navigationStepMs: 1,
        replacementStepMs: 1,
        consoleAndPageErrors: [],
        teardownRecord: TEARDOWN_COMPLETED,
        build: [],
      }));
      await certify(run);
      const complete = JSON.parse(await readFile(join(run.root, "complete.json"), "utf8")) as {
        lifecycle: { runs: { startedAt: string }[] };
      };
      expect(complete.lifecycle.runs).toHaveLength(3);
      expect(complete.lifecycle.runs.every((entry) => entry.startedAt > "2026-09-15")).toBe(true);
    });
  });

  it("refuses a lifecycle record that named a software rasteriser", async () => {
    await withRun({}, async (run) => {
      await amendLifecycleRecord(run, (record) => { record["glRenderer"] = SWIFTSHADER; });
      await expect(certify(run)).rejects.toThrow(/names a software rasteriser/);
    });
  });

  it("refuses a lifecycle record measured against different build bytes", async () => {
    await withRun({}, async (run) => {
      await amendLifecycleRecord(run, (record) => {
        (record["build"] as { sha256: string }[])[0]!.sha256 = "0".repeat(64);
      });
      await expect(certify(run)).rejects.toThrow(/measured against different build bytes/);
    });
  });

  it("refuses a record from an older specification that carries no page-error list", async () => {
    await withRun({}, async (run) => {
      await amendLifecycleRecord(run, (record) => { delete record["consoleAndPageErrors"]; });
      await expect(certify(run)).rejects.toThrow(/records no consoleAndPageErrors/);
    });
  });

  it("refuses a record whose page reported errors", async () => {
    await withRun({}, async (run) => {
      await amendLifecycleRecord(run, (record) => {
        record["consoleAndPageErrors"] = ["uncaught TypeError: picker.dispose() is not a function"];
      });
      await expect(certify(run)).rejects.toThrow(/recorded page errors the lane should have failed on/);
    });
  });

  it("reads the lifecycle records from the verdict lane's own directory", () => {
    expect(LIFECYCLE_RECORD_DIR.replaceAll("\\", "/")).toBe("artifacts/visual/lifecycle");
  });
});

describe("the certificate refuses a run this chain did not open", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("refuses when no run was begun, rather than certifying what is on disk", async () => {
    await withRun({}, async (run) => {
      await rm(join(run.root, "run.json"));
      await expect(certify(run)).rejects.toThrow(/No run was begun/);
    });
  });

  it("refuses run.json without a runId", async () => {
    await withRun({}, async (run) => {
      const record = JSON.parse(await readFile(join(run.root, "run.json"), "utf8")) as Record<string, unknown>;
      delete record["runId"];
      await writeFile(join(run.root, "run.json"), JSON.stringify(record));
      await expect(certify(run)).rejects.toThrow(/carries no runId/);
    });
  });

  it("refuses run.json without a scene digest", async () => {
    await withRun({}, async (run) => {
      const record = JSON.parse(await readFile(join(run.root, "run.json"), "utf8")) as Record<string, unknown>;
      delete record["scene"];
      await writeFile(join(run.root, "run.json"), JSON.stringify(record));
      await expect(certify(run)).rejects.toThrow(/pinned no scene-data digest/);
    });
  });

  it("takes exactly one step, and never none", () => {
    expect(visualRunPhase(["node", "verify-output.ts", "--reset"])).toBe("reset");
    expect(visualRunPhase(["node", "verify-output.ts", "--begin"])).toBe("begin");
    expect(visualRunPhase(["node", "verify-output.ts", "--end"])).toBe("end");
    expect(() => visualRunPhase(["node", "verify-output.ts"])).toThrow(/exactly one of --reset/);
    expect(() => visualRunPhase(["node", "verify-output.ts", "--begin", "--end"])).toThrow(/exactly one step/);
  });
});

describe("the scene data's identity is bound into the certificate", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("changes the digest when a served file changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "maps-scene-digest-"));
    try {
      const mounts = [{ route: "/scene/", directory: join(root, "scene") }];
      await mkdir(mounts[0]!.directory, { recursive: true });
      await writeFile(join(mounts[0]!.directory, "a.b3dm"), "one");
      const before = await sceneTreeDigest(mounts);
      await writeFile(join(mounts[0]!.directory, "a.b3dm"), "two");
      const after = await sceneTreeDigest(mounts);
      expect(after.digest).not.toBe(before.digest);
      expect(after.files).toBe(before.files);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses to certify when the scene changed during capture", async () => {
    await withRun({ sceneAfter: "{\"version\":2}" }, async (run) => {
      await expect(certify(run)).rejects.toThrow(/scene data changed during capture/);
    });
  });

  it("names the preparation command when the scene is missing entirely", async () => {
    const root = await mkdtemp(join(tmpdir(), "maps-scene-missing-"));
    try {
      await expect(sceneTreeDigest([{ route: "/scene/", directory: join(root, "scene") }]))
        .rejects.toThrow(/npm run data:scene/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the harness that drives the browser is bound into the certificate", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("covers every config the gate's own chain runs", async () => {
    // Read from the chain rather than restated: adding a lane config to
    // `npm run visual` and forgetting it here is exactly how the closure would
    // quietly narrow, and the digest would go on passing while covering less.
    const scripts = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };
    const configs = [...scripts.scripts["visual"]!.matchAll(/--config\s+(\S+)/g)].map((match) => match[1]!);
    expect(configs.length).toBeGreaterThan(0);
    for (const config of configs) {
      expect(
        HARNESS_ROOTS.some((root) => config === root || config.startsWith(`${root}/`)),
        `${config} is run by the gate's chain and is outside the harness closure`,
      ).toBe(true);
    }
  });

  it("digests the real lane's files when it is called the way --begin calls it", async () => {
    const digest = await harnessTreeDigest();
    expect(digest.files).toBeGreaterThanOrEqual(10);
    expect(digest.bytes).toBeGreaterThan(1_000);
    expect(digest.digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("pins that digest into run.json at --begin", async () => {
    // The synthetic runs above write their own run.json, so nothing else here
    // would notice the real `--begin` no longer pinning a harness — every real run
    // would fail hours later at `--end` instead.
    const root = await mkdtemp(join(tmpdir(), "maps-harness-begin-"));
    try {
      const dist = join(root, "dist");
      await mkdir(join(dist, "assets"), { recursive: true });
      await writeFile(join(dist, "index.html"), "<!doctype html><title>frozen</title>");
      await writeFile(join(dist, "assets", "index-abc123.js"), "export {};\n");
      await beginVisualRun(root, dist);
      const record = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as Record<string, unknown>;
      const harness = record["harness"] as { digest: string; files: number; roots: string[] } | undefined;
      expect(harness, "run.json written by --begin must carry a harness digest").toBeDefined();
      expect(harness!.roots).toEqual([...HARNESS_ROOTS]);
      expect(harness!.files).toBeGreaterThanOrEqual(10);
      // The value `--end` re-derives when nothing under those roots has moved.
      expect(harness!.digest).toBe((await harnessTreeDigest()).digest);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("changes the digest when a harness file changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "maps-harness-digest-"));
    try {
      const roots = [join(root, "tools", "visual")];
      await mkdir(roots[0]!, { recursive: true });
      await writeFile(join(roots[0]!, "orbit.ts"), "one");
      const before = await harnessTreeDigest(roots);
      await writeFile(join(roots[0]!, "orbit.ts"), "two");
      const after = await harnessTreeDigest(roots);
      expect(after.digest).not.toBe(before.digest);
      expect(after.files).toBe(before.files);
      // A file added to the lane moves it too, which is the shape the real
      // incident took: `5c32286` added two specs while a capture was running.
      await writeFile(join(roots[0]!, "smoke.spec.ts"), "one");
      const added = await harnessTreeDigest(roots);
      expect(added.digest).not.toBe(after.digest);
      expect(added.files).toBe(after.files + 1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("refuses to certify when a helper changed during capture", async () => {
    await withRun(
      { harnessEdit: "export const settle = (): void => { throw new Error(\"changed mid-run\"); };\n" },
      async (run) => {
        const refusal = await refusalFrom(run);
        expect(refusal).toMatch(/harness this lane runs changed during capture/);
        // Both values, as the scene refusal prints both: the reader is entitled to
        // see what moved rather than only that something did.
        const record = JSON.parse(await readFile(join(run.root, "run.json"), "utf8")) as {
          harness: { digest: string };
        };
        const now = await harnessTreeDigest(run.harnessRoots);
        expect(refusal).toContain(record.harness.digest.slice(0, 12));
        expect(refusal).toContain(now.digest.slice(0, 12));
        expect(refusal).toContain("tools");
      },
    );
  });

  it("refuses to certify when a spec was added during capture", async () => {
    await withRun({ harnessAdd: "smoke.spec.ts" }, async (run) => {
      await expect(certify(run)).rejects.toThrow(/harness this lane runs changed during capture/);
    });
  });

  it("refuses a run whose run.json pinned no harness digest", async () => {
    await withRun({}, async (run) => {
      const record = JSON.parse(await readFile(join(run.root, "run.json"), "utf8")) as Record<string, unknown>;
      delete record["harness"];
      await writeFile(join(run.root, "run.json"), JSON.stringify(record));
      await expect(certify(run)).rejects.toThrow(/pinned no harness digest/);
    });
  });

  it("refuses a harness root that resolves to nothing, rather than digesting nothing", async () => {
    const root = await mkdtemp(join(tmpdir(), "maps-harness-missing-"));
    try {
      await expect(harnessTreeDigest([join(root, "tools", "visual")]))
        .rejects.toThrow(/cannot read .*tools.*visual/s);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("lifecycleEvidence reads only this run's records", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("returns the three fresh records with their renderer and timings", async () => {
    await withRun({}, async (run) => {
      const record = JSON.parse(await readFile(join(run.root, "run.json"), "utf8")) as {
        startedAt: string;
        build: { file: string; sha256: string }[];
      };
      const evidence = await lifecycleEvidence(record, run.lifecycleDir);
      expect(evidence.renderer).toBe(RTX_4090);
      expect(evidence.runs).toHaveLength(3);
      expect(evidence.runs[0]).toMatchObject({
        navigationStepMs: 104,
        replacementStepMs: 4_660,
        teardownRecord: TEARDOWN_COMPLETED,
      });
    });
  });

  it("refuses three records that name two different renderers", async () => {
    await withRun({}, async (run) => {
      await amendLifecycleRecord(run, (record) => {
        record["glRenderer"] = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)";
      });
      const record = JSON.parse(await readFile(join(run.root, "run.json"), "utf8")) as {
        startedAt: string;
        build: { file: string; sha256: string }[];
      };
      await expect(lifecycleEvidence(record, run.lifecycleDir))
        .rejects.toThrow(/not repeats of one check on one renderer/);
    });
  });
});

describe("the gate's chain claims the run before the build", () => {
  it("clears the previous certificate ahead of the one step that can fail before any capture", async () => {
    // The defect: `--begin` did the deletion and sat *after* `npm run build`, so a
    // build failure stopped the `&&` chain with the previous run's `complete.json`
    // still on disk — a reader then cannot tell a failed run from a successful one.
    // This reads the order rather than executing the chain; the behavioural half is
    // the two CLI runs recorded in `docs/learning/gate-proofs.md`.
    const scripts = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    ) as { scripts: Record<string, string> };
    const chain = scripts.scripts["visual"]!;
    const at = (step: string): number => chain.indexOf(step);
    expect(at("verify-output.ts --reset"), "--reset is the gate's first step").toBeLessThan(at("npm run build"));
    expect(at("npm run build"), "the build precedes --begin, whose hash is of the built bytes").toBeLessThan(at("verify-output.ts --begin"));
    expect(at("verify-output.ts --begin")).toBeLessThan(at("playwright test --config playwright.config.ts"));
    expect(at("playwright test --config playwright.lifecycle.config.ts")).toBeLessThan(at("verify-output.ts --end"));
    expect(chain.indexOf("--end")).toBeGreaterThan(chain.indexOf("--repeat-each=3"));
    // Every step named exactly once, so a chain cannot satisfy the order above by
    // repeating a step in two places.
    for (const step of ["--reset", "--begin", "--end"]) {
      expect(chain.split(step).length - 1, `${step} appears once`).toBe(1);
    }
  });

  it("writes the cleanup record from the page's own pagehide handler", async () => {
    // The record the lifecycle lane reads only exists if the app writes it, and a
    // run without that line would fail three hours later in the wrapper with a
    // message about a missing record rather than here.
    // Normalised, because this checkout is on Windows and the file is CRLF there.
    const main = (await readFile(new URL("../src/main.ts", import.meta.url), "utf8")).replaceAll("\r\n", "\n");
    expect(main).toContain('addEventListener(\n    "pagehide"');
    expect(main).toContain("recordTeardown(");
    const spec = await readFile(new URL("../tools/visual/lifecycle.spec.ts", import.meta.url), "utf8");
    expect(spec, "the lifecycle spec reads the record by the writer's own key").toContain("TEARDOWN_RECORD_KEY");
    expect(spec, "the lifecycle spec asserts rather than records the outcome").toContain("teardownRecordRefusal(");
    expect(spec, "the lifecycle spec asserts the page-error list is empty").toMatch(/expect\(\s*pageErrors/);
  });
});

describe("the page's own cleanup outcome is read, not assumed", { timeout: FRAME_SET_BUDGET_MS }, () => {
  it("records completed when the cleanup returns", () => {
    const written = new Map<string, string>();
    recordTeardown(() => undefined, { setItem: (key, value) => void written.set(key, value) });
    expect(written.get(TEARDOWN_RECORD_KEY)).toBe(TEARDOWN_COMPLETED);
    expect(teardownRecordRefusal(written.get(TEARDOWN_RECORD_KEY) ?? null, "This navigation")).toBeNull();
  });

  it("records the failure rather than rethrowing it, because nothing would catch the throw", () => {
    const written = new Map<string, string>();
    recordTeardown(() => { throw new TypeError("picker.dispose() is not a function"); }, {
      setItem: (key, value) => void written.set(key, value),
    });
    const record = written.get(TEARDOWN_RECORD_KEY)!;
    expect(record.startsWith(TEARDOWN_FAILED_PREFIX)).toBe(true);
    const refusal = teardownRecordRefusal(record, "This navigation");
    expect(refusal).not.toBeNull();
    expect(refusal).toContain("did not finish");
    expect(refusal).toContain("TypeError: picker.dispose() is not a function");
  });

  it("fails closed when the cleanup reported nothing at all", () => {
    const refusal = teardownRecordRefusal(null, "This navigation");
    expect(refusal).not.toBeNull();
    expect(refusal).toContain("recorded no teardown result");
  });

  it("refuses to certify a lifecycle record whose teardown never completed", async () => {
    await withRun({}, async (run) => {
      await amendLifecycleRecord(run, (record) => {
        record["teardownRecord"] = `${TEARDOWN_FAILED_PREFIX}TypeError: picker.dispose() is not a function`;
      });
      await expect(certify(run)).rejects.toThrow(
        /cleanup did not finish: TypeError: picker\.dispose\(\) is not a function/,
      );
    });
  });
});

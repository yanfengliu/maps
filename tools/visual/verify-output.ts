/**
 * Complete-run evidence must survive every sibling spec with exact fresh bytes.
 *
 * Bound: eight hero frames and eighteen sweep frames for each current style, at
 * 1280x720, captured in the lane this process names — the verdict lane. The
 * hardware iteration lane is refused by name: its frames come from a different
 * renderer than the reviewed set and it produces no certificate.
 *
 * The certificate is issued by `certifyVisualRun`, which is `verifyVisualRun`
 * plus the evidence a pixel set cannot carry about itself: that three hardware
 * lifecycle runs exist for this run and named the hardware renderer, that every
 * frame's manifest names the SwiftShader the pixel lane pins, and that the scene
 * data the preview server serves is still the scene the run started with.
 *
 * Bound of the whole instrument, in one place: it proves the 44 frames exist, are
 * fresh, are native 1280x720, hash to what their manifests say, came from the
 * software lane the config pins, and were captured while the same build and the
 * same scene data were on disk, with three hardware lifecycle records written
 * after this run began. It cannot prove that any frame looks right. It cannot
 * prove the lifecycle records came from *this* process tree rather than from
 * three other fresh ones — their timestamps are the only identity they carry —
 * and its scene digest is taken at two instants, so a scene file changed and
 * changed back between them is outside what it can report.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { activeLane, assertCertifiable, HARDWARE_RENDERER_DENYLIST, laneDir, pixelLaneRefusal } from "./lane.ts";
import { LIFECYCLE_RECORD_DIR, LIFECYCLE_RUNS, type LifecycleRecord } from "./lifecycle-record.ts";
import { decodePng } from "./png.ts";
import { teardownRecordRefusal } from "../../src/harness/teardown.ts";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/**
 * The two directories the preview server serves outside `dist/`, and the mounts
 * `tools/vite/serve-scene-data.ts` answers. The pixels are not determined by the
 * build bytes alone: the same `dist/` draws a different city against a different
 * `data/scene/`, so two certificates that bind only `dist/` cannot be compared.
 */
const SCENE_MOUNTS: readonly { route: string; directory: string }[] = [
  { route: "/scene/", directory: "data/scene" },
  { route: "/network/", directory: "data/network" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface SceneDigest {
  digest: string;
  files: number;
  bytes: number;
}

/**
 * A digest over what `/scene/` and `/network/` will serve: the path each file is
 * served at, and the bytes of that file.
 *
 * Why the contents and not the metadata: this digest is what binds the frames to
 * one city, and a rebuilt tile that keeps its length can keep its modification
 * time too, so a digest over names, sizes and mtimes can go on carrying the old
 * city's identity while the pixels are of a new one. Every served file is
 * therefore read and hashed — 214,114,015 bytes across 84 files on the payload
 * the 2026-09-16 capture pins, twice per gate, before the build and after the
 * capture. (It was 371,228,426 bytes across 137 files before that day's rebuild
 * of `data/`. The human agent set under `data/scene/agents/` is not part of
 * `data:setup` and has not been restored yet, which is the whole difference.)
 *
 * Bound: only the path and the content enter the digest, so the same tree gives
 * the same value on every run and no timestamp, size or inode is covered. What it
 * cannot report is a file changed and changed back between its two calls, which is
 * a difference no digest taken at two instants can see.
 */
export async function sceneTreeDigest(
  mounts: readonly { route: string; directory: string }[] = SCENE_MOUNTS,
): Promise<SceneDigest> {
  const entries: string[] = [];
  let bytes = 0;
  const walk = async (directory: string, relative: string): Promise<void> => {
    let names: string[];
    try {
      names = await readdir(directory);
    } catch (error) {
      throw new Error(
        `The visual gate cannot read ${directory}, which the preview server serves as scene data: ` +
          `${error instanceof Error ? error.message : String(error)}. That directory is built by ` +
          "`npm run data:scene`, and the network database by `npm run data:network`; a run without it " +
          "would certify frames whose scene data nothing bound.",
      );
    }
    for (const name of names.sort()) {
      const path = join(directory, name);
      const info = await stat(path);
      if (info.isDirectory()) {
        await walk(path, `${relative}${name}/`);
        continue;
      }
      if (!info.isFile()) continue;
      // Content, not metadata: a rewrite in place that keeps its length can keep
      // its modification time too, and that is precisely the change a certificate
      // must not miss.
      let content: Buffer;
      try {
        content = await readFile(path);
      } catch (error) {
        throw new Error(
          `The visual gate cannot read the served scene file ${path}: ` +
            `${error instanceof Error ? error.message : String(error)}. Every file under these mounts is ` +
            "hashed by content into the certificate, so one this run cannot read would leave the frames " +
            "unbound. Rebuild the scene with `npm run data:scene`, and the network database with " +
            "`npm run data:network`, before re-running the gate.",
        );
      }
      entries.push(`${relative}${name}\u0000${hash(content)}`);
      bytes += content.byteLength;
    }
  };
  for (const mount of mounts) await walk(mount.directory, `${mount.route}`);
  return { digest: hash(Buffer.from(entries.join("\n"), "utf8")), files: entries.length, bytes };
}

/**
 * Re-derive the scene digest this run pinned, and refuse if it moved.
 *
 * A scene rebuilt mid-run is the same defect class as a `dist/` rebuilt mid-run:
 * the frames before it and the frames after it are pictures of different cities,
 * and a certificate covering both would describe a run that never happened.
 */
async function assertSceneUnchanged(
  scene: SceneDigest,
  mounts: readonly { route: string; directory: string }[],
): Promise<void> {
  const now = await sceneTreeDigest(mounts);
  if (now.digest !== scene.digest) {
    throw new Error(
      "The served scene data changed during capture, so these frames are not all pictures of the same " +
        `city: ${scene.files} files digested ${scene.digest.slice(0, 12)} when the run began and ` +
        `${now.files} files digest ${now.digest.slice(0, 12)} now. \`npm run data:scene\` (or ` +
        "`npm run data:network`) ran while the gate was capturing. Rebuild and recapture before " +
        "reviewing this run.",
    );
  }
}

/**
 * Delete every artifact a later step could mistake for this run's.
 *
 * This is the gate's first step, ahead of the build, and that placement is the
 * point: `complete.json` is the gate's success artifact, and while the previous
 * run's copy is on disk a reader cannot tell a failed run from a successful one.
 * Clearing it before the build is what makes `docs/policies/local-rules.md`'s
 * claim true — a failed build leaves no certificate behind.
 *
 * `run.json` goes with it, so an interrupted chain cannot leave a begun run for
 * the end step to certify.
 */
export async function resetVisualRun(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await rm(join(root, "complete.json"), { force: true });
  await rm(join(root, "run.json"), { force: true });
}

/** The run this invocation opened, as `run.json` holds it. */
interface VisualRun {
  runId: string;
  startedAt: string;
  lane: string;
  requestedGpu: string;
  build: { file: string; sha256: string }[];
  scene: SceneDigest & { mounts: string[] };
}

/**
 * Hash the build bytes this run will capture and pin the scene data it will
 * serve, then open the run.
 *
 * Runs *after* the build — the hash is of the bytes the browser will serve.
 *
 * It also clears the previous run's artifacts itself, and that is deliberate
 * rather than redundant with `resetVisualRun` ahead of the build: this function is
 * the one the gate's own evidence test drives directly, and the property that test
 * pins is that beginning a run clears the certificate (`test/visual-evidence.test.ts`,
 * "clears the previous complete.json when a new capture run begins"). What
 * `--reset` adds is *where* in the chain that happens — ahead of the build, so a
 * build failure leaves no certificate — and both are idempotent.
 */
export async function beginVisualRun(
  root: string,
  dist = "dist",
): Promise<{ runId: string; scene: SceneDigest }> {
  await resetVisualRun(root);
  // Forward slashes, not `join`: on Windows `join` would spell these with
  // backslashes, and `lifecycle.spec.ts` hashes the same two file names with a
  // template literal. The certificate compares the two lists by name, so one
  // separator has to win, and this is the one both writers can produce.
  const files = [
    `${dist}/index.html`,
    ...(await readdir(`${dist}/assets`))
      .filter((name) => /\.(js|css)$/.test(name))
      .map((name) => `${dist}/assets/${name}`),
  ];
  const build: { file: string; sha256: string }[] = [];
  for (const file of files) build.push({ file, sha256: hash(await readFile(file)) });
  const scene = await sceneTreeDigest();
  const startedAt = new Date().toISOString();
  const runId = hash(Buffer.from(`${startedAt}\u0000${build.map((entry) => entry.sha256).join("")}`, "utf8")).slice(0, 16);
  await writeFile(
    join(root, "run.json"),
    JSON.stringify(
      {
        runId,
        startedAt,
        lane: activeLane(),
        requestedGpu: process.env["MAPS_VISUAL_GPU"] ?? "software",
        build,
        scene: { mounts: SCENE_MOUNTS.map((mount) => mount.route), ...scene },
      },
      null,
      2,
    ),
  );
  return { runId, scene };
}

/** The frame names every certificate must account for, per manifest. */
function expectedFrames(): Map<string, string[]> {
  const expected = new Map<string, string[]>();
  expected.set(
    "hero/hero.json",
    ["satellite", "cartographic"].flatMap((style) =>
      ["dusk", "noon"].flatMap((time) =>
        ["crossing", "approach"].map((pose) => `hero-${style}-${time}-${pose}.png`),
      ),
    ),
  );
  for (const style of ["satellite", "cartographic"]) {
    expected.set(
      `sweep/${style}/manifest.json`,
      ["plaza", "block", "overhead"].flatMap((shot) =>
        ["000", "060", "120", "180", "240", "300"].map((az) => `${shot}-az${az}.png`),
      ),
    );
  }
  return expected;
}

interface ReadManifest {
  capturedAt: string;
  frames: { file: string; sha256: string; glRenderer?: unknown }[];
  renderer: unknown;
}

async function readManifest(
  root: string,
  manifestName: string,
  names: string[],
  startedAt: string,
): Promise<ReadManifest> {
  const manifestPath = join(root, manifestName);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `The manifest ${manifestName} is missing, and this run cannot be certified without it: ` +
          `${manifestPath} is not on disk. The pixel lane writes it after its last frame lands, so a run ` +
          "cut off before that has no frame set to certify.",
      );
    }
    throw error;
  }
  if (!isRecord(raw)) throw new Error(`The manifest ${manifestName} is not an object.`);
  const capturedAt = raw["capturedAt"];
  if (typeof capturedAt !== "string" || !Number.isFinite(Date.parse(capturedAt))) {
    throw new Error(`The manifest ${manifestName} carries no usable capturedAt timestamp.`);
  }
  if (Date.parse(capturedAt) < Date.parse(startedAt)) {
    throw new Error(`Stale visual manifest: ${manifestName}. This complete run must capture every required frame.`);
  }
  const frames = raw["frames"];
  if (!Array.isArray(frames)) throw new Error(`The manifest ${manifestName} carries no frames array.`);
  const typed = frames as { file: string; sha256: string }[];
  if (typed.length !== names.length || new Set(typed.map((frame) => frame.file)).size !== names.length) {
    throw new Error(`Incomplete or duplicate frames in ${manifestName}; expected ${names.length}.`);
  }
  return { capturedAt, frames: typed, renderer: raw["glRenderer"] };
}

/**
 * The pixel lane's own renderer identity, asserted off the manifests that
 * recorded it, and returned so the certificate can carry it.
 *
 * `hero/hero.json` records it per frame rather than once for the manifest — the
 * hero block reloads the page for each time of day — so both shapes are read. The
 * positive predicate lives in `lane.ts` and is shared with the two specifications,
 * which fail on it within seconds of their first frame instead of after hours.
 */
function assertPixelLaneRenderer(manifestName: string, manifest: ReadManifest): string {
  if (manifestName === "hero/hero.json") {
    for (const frame of manifest.frames) {
      const refusal = pixelLaneRefusal(frame.glRenderer, `hero/hero.json frame ${String(frame.file)}`);
      if (refusal !== null) throw new Error(`Visual gate refused: ${refusal}`);
    }
    return String(manifest.frames[0]!.glRenderer);
  }
  const refusal = pixelLaneRefusal(manifest.renderer, manifestName);
  if (refusal !== null) throw new Error(`Visual gate refused: ${refusal}`);
  return String(manifest.renderer);
}

/**
 * The frame-set half of the certificate: the 44 frames, their freshness, their
 * native size, their exact bytes and the build they were captured against.
 *
 * Kept separate from `certifyVisualRun` on purpose. This is what
 * `test/visual-evidence.test.ts` drives, and that test's synthetic manifests carry
 * no renderer and no lifecycle records by design: it is the record of what the
 * frame checks accept, not of what the gate's own report path requires.
 */
export async function verifyVisualRun(root: string): Promise<void> {
  const run = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as VisualRun;
  for (const file of run.build) if (hash(await readFile(file.file)) !== file.sha256) throw new Error(`Visual build changed during capture: ${file.file}. Rebuild and recapture before reviewing this run.`);
  const files: { file: string; sha256: string }[] = [];
  for (const [manifestName, names] of expectedFrames()) {
    const manifest = await readManifest(root, manifestName, names, run.startedAt);
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

/**
 * The three hardware lifecycle records this run's own invocation wrote.
 *
 * `artifacts/visual/lifecycle/` deliberately keeps earlier runs' records, so the
 * only identity a record carries is its own timestamps: a record that did not
 * start after this run began belongs to some other run and is ignored here. What
 * this proves is that three records for this build exist and postdate this run's
 * start; what it cannot prove is that they came from this process tree.
 */
export async function lifecycleEvidence(
  run: Pick<VisualRun, "startedAt" | "build">,
  directory = LIFECYCLE_RECORD_DIR,
): Promise<{
  renderer: string;
  runs: {
    file: string;
    startedAt: string;
    finishedAt: string;
    glRenderer: string;
    preparationMs: number;
    navigationStepMs: number;
    replacementStepMs: number;
    consoleAndPageErrors: string[];
    teardownRecord: string;
  }[];
}> {
  let names: string[];
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    throw new Error(
      `The hardware lifecycle lane left no records in ${directory}: ` +
        `${error instanceof Error ? error.message : String(error)}. The wrapper does not certify the ` +
        "pixel lane alone, so a run whose lifecycle invocation never happened must not report success. " +
        "Re-run the gate with `npm run visual`.",
    );
  }
  const fresh: { file: string; record: LifecycleRecord }[] = [];
  for (const name of names) {
    const file = join(directory, name);
    let record: LifecycleRecord;
    try {
      record = JSON.parse(await readFile(file, "utf8")) as LifecycleRecord;
    } catch (error) {
      throw new Error(
        `The lifecycle record ${file} cannot be read as JSON: ` +
          `${error instanceof Error ? error.message : String(error)}. A record this run cannot parse ` +
          "cannot show that the lifecycle lane ran.",
      );
    }
    const started = Date.parse(record.startedAt);
    const finished = Date.parse(record.finishedAt);
    if (!Number.isFinite(started) || !Number.isFinite(finished)) {
      throw new Error(`The lifecycle record ${file} carries no usable startedAt/finishedAt timestamps.`);
    }
    if (started >= Date.parse(run.startedAt) && finished >= Date.parse(run.startedAt)) {
      fresh.push({ file, record });
    }
  }
  if (fresh.length !== LIFECYCLE_RUNS) {
    throw new Error(
      `The hardware lifecycle lane reported ${fresh.length} of ${LIFECYCLE_RUNS} runs newer than this ` +
        `run's start (${run.startedAt}) in ${directory}. The wrapper does not certify the pixel lane ` +
        "alone: a run whose lifecycle invocation was dropped, skipped or misconfigured must not report " +
        "success. Records written by earlier runs stay in this directory and are ignored here. Re-run " +
        "the gate with `npm run visual`.",
    );
  }
  const runs: {
    file: string;
    startedAt: string;
    finishedAt: string;
    glRenderer: string;
    preparationMs: number;
    navigationStepMs: number;
    replacementStepMs: number;
    consoleAndPageErrors: string[];
    teardownRecord: string;
  }[] = [];
  for (const { file, record } of fresh) {
    if (typeof record.glRenderer !== "string" || record.glRenderer.trim() === "") {
      throw new Error(
        `The lifecycle record ${file} names no renderer, so this run cannot show that its lifecycle check ` +
          "ran on the hardware renderer the deliverable targets.",
      );
    }
    if (HARDWARE_RENDERER_DENYLIST.test(record.glRenderer)) {
      throw new Error(
        `The lifecycle record ${file} reports the renderer "${record.glRenderer}", which names a software ` +
          "rasteriser. The lifecycle lane exists to measure what the hardware renderer does with the " +
          "outgoing page's resources, and a software rasteriser spends about 28-30 s inside Chromium's " +
          "own teardown instead — so a record from it measures the rasteriser, never a pass.",
      );
    }
    if (!Array.isArray(record.consoleAndPageErrors)) {
      throw new Error(
        `The lifecycle record ${file} records no consoleAndPageErrors, so it cannot show that the page ` +
          "reported nothing during preparation, navigation or the replacement boot. It was not written by " +
          "the current specification; re-run the gate with `npm run visual`.",
      );
    }
    if (record.consoleAndPageErrors.length > 0) {
      // The specification fails on this before it writes, so a record carrying it
      // is evidence of an instrument that stopped asserting rather than of a bad run.
      throw new Error(
        `The lifecycle record ${file} recorded page errors the lane should have failed on:\n` +
          record.consoleAndPageErrors.join("\n"),
      );
    }
    const teardown = teardownRecordRefusal(
      typeof record.teardownRecord === "string" ? record.teardownRecord : null,
      `The lifecycle record ${file}`,
    );
    if (teardown !== null) throw new Error(teardown);
    for (const [field, value] of Object.entries({
      preparationMs: record.preparationMs,
      navigationStepMs: record.navigationStepMs,
      replacementStepMs: record.replacementStepMs,
    })) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(
          `The lifecycle record ${file} records ${field} as ${String(value)}, which is not a measured ` +
            "duration. This run cannot show that its navigation and replacement steps were timed.",
        );
      }
    }
    for (const pinned of run.build) {
      const measured = record.build?.find((entry) => entry.file === pinned.file);
      if (measured === undefined) {
        throw new Error(
          `The lifecycle record ${file} does not name ${pinned.file}, so it was not measured against ` +
            "this run's build.",
        );
      }
      if (measured.sha256 !== pinned.sha256) {
        throw new Error(
          `The lifecycle record ${file} was measured against different build bytes than this run pinned: ` +
            `${pinned.file} hashes ${measured.sha256.slice(0, 12)} there and ${pinned.sha256.slice(0, 12)} here.`,
        );
      }
    }
    runs.push({
      file,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      glRenderer: record.glRenderer,
      preparationMs: record.preparationMs,
      navigationStepMs: record.navigationStepMs,
      replacementStepMs: record.replacementStepMs,
      consoleAndPageErrors: record.consoleAndPageErrors,
      teardownRecord: record.teardownRecord,
    });
  }
  const renderers = new Set(runs.map((entry) => entry.glRenderer));
  if (renderers.size !== 1) {
    throw new Error(
      `The ${runs.length} lifecycle records name ${renderers.size} different renderers ` +
        `(${[...renderers].join(" | ")}), so they are not repeats of one check on one renderer.`,
    );
  }
  return { renderer: [...renderers][0]!, runs };
}

/**
 * The certificate: the frame set plus the evidence a pixel set cannot carry about
 * itself.
 *
 * This is the gate's end step. It refuses a run this chain did not open, and it
 * refuses to certify on the pixel lane's word alone. The mounts and the lifecycle
 * directory are arguments so a test can drive the whole certificate over a run it
 * wrote itself; the gate's own step calls it with the defaults.
 */
export async function certifyVisualRun(
  root: string,
  options: {
    sceneMounts?: readonly { route: string; directory: string }[];
    lifecycleDir?: string;
  } = {},
): Promise<void> {
  let run: VisualRun;
  try {
    run = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as VisualRun;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `No run was begun in ${root}: run.json is missing, and the end step only certifies a run this ` +
          "chain opened with `--begin` after the build. A failed build, a failed capture or an " +
          "interrupted chain leaves no certificate — which is the point, since a reader cannot tell a " +
          "stale `complete.json` from a fresh one.",
      );
    }
    throw error;
  }
  if (typeof run.runId !== "string" || run.runId === "") {
    throw new Error(
      `The run in ${root} carries no runId, so the end step cannot tell which run it is certifying. ` +
        "run.json is written by `--begin`; re-run the gate with `npm run visual`.",
    );
  }
  if (typeof run.scene?.digest !== "string") {
    throw new Error(
      `The run in ${root} pinned no scene-data digest, so nothing shows which city its frames are ` +
        "pictures of. run.json is written by `--begin`; re-run the gate with `npm run visual`.",
    );
  }
  const scene = run.scene;
  const sceneMounts = options.sceneMounts ?? SCENE_MOUNTS;
  // Before a single frame is read, for the same reason every other check runs
  // before the certificate: a certificate is a claim about one city and one build.
  await assertSceneUnchanged(scene, sceneMounts);
  const pixelRenderers = new Set<string>();
  for (const [manifestName, names] of expectedFrames()) {
    const manifest = await readManifest(root, manifestName, names, run.startedAt);
    pixelRenderers.add(assertPixelLaneRenderer(manifestName, manifest));
  }
  if (pixelRenderers.size !== 1) {
    throw new Error(
      `The pixel lane's manifests name ${pixelRenderers.size} different renderers ` +
        `(${[...pixelRenderers].join(" | ")}), so the 44 frames did not all come from one renderer.`,
    );
  }
  const pixelRenderer = [...pixelRenderers][0]!;
  // `verifyVisualRun` writes `complete.json` as its own last act, because the
  // frame checks are also driven directly by `test/visual-evidence.test.ts`. That
  // file is not yet this certificate: it carries no lifecycle evidence, so it must
  // not survive a failure between here and the write below. Removing it first is
  // what makes the certificate all-or-nothing — a run whose lifecycle lane is
  // missing or wrong ends with no certificate on disk rather than one that claims
  // the frame set passed.
  await verifyVisualRun(root);
  const complete = JSON.parse(await readFile(join(root, "complete.json"), "utf8")) as Record<string, unknown>;
  await rm(join(root, "complete.json"), { force: true });
  const lifecycle = await lifecycleEvidence(run, options.lifecycleDir ?? LIFECYCLE_RECORD_DIR);
  await writeFile(
    join(root, "complete.json"),
    JSON.stringify(
      {
        ...complete,
        certifiedAt: new Date().toISOString(),
        runId: run.runId,
        scene,
        pixelRenderer,
        lifecycle: { renderer: lifecycle.renderer, runs: lifecycle.runs },
      },
      null,
      2,
    ),
  );
  const timings = lifecycle.runs
    .map((entry) => `navigation ${entry.navigationStepMs} ms / replacement ${entry.replacementStepMs} ms`)
    .join(", ");
  console.log(
    `Certified run ${run.runId}: pixel lane on "${pixelRenderer}", lifecycle lane on ` +
      `"${lifecycle.renderer}" — ${timings}.`,
  );
}

/**
 * Which step of the gate's chain this invocation is.
 *
 * Exactly one, and never none: a bare `node tools/visual/verify-output.ts` used to
 * re-certify whatever self-consistent run was on disk, which launders stale
 * evidence into a fresh success. `--reset` runs before the build and `--begin`
 * after it; the pair is what lets the deletion of the previous certificate precede
 * the one step that can fail before any capture starts.
 */
export type VisualRunPhase = "reset" | "begin" | "end";

export function visualRunPhase(argv: readonly string[]): VisualRunPhase {
  const named = (["reset", "begin", "end"] as const).filter((phase) => argv.includes(`--${phase}`));
  if (named.length === 0) {
    throw new Error(
      "The visual wrapper was run with no step: exactly one of --reset (before the build), --begin " +
        "(after it, before the lanes) or --end (after the lanes, the default) is required. It is not " +
        "defaulted on purpose: this script writes the certificate the plan and the reviews read, and a " +
        "bare run would re-certify whatever run happened to be on disk.",
    );
  }
  if (named.length > 1) {
    throw new Error(
      `The visual wrapper was given ${named.map((phase) => `--${phase}`).join(" and ")}; exactly one step ` +
        "is allowed, because each writes or reads a different part of the run's evidence.",
    );
  }
  return named[0]!;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  // This script creates the run's certificate, so it runs as the verdict lane by
  // construction. An attempt to point it at the hardware iteration lane fails
  // here, by name, before any artifact is written.
  assertCertifiable(activeLane());
  const phase = visualRunPhase(process.argv);
  const root = resolve(laneDir("verdict"));
  if (phase === "reset") await resetVisualRun(root);
  else if (phase === "begin") await beginVisualRun(root);
  else await certifyVisualRun(root);
}

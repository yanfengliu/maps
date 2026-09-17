/**
 * harness: does the delivered human set exist, whole, beside its own manifest?
 *
 * The post-capture runbook in `docs/work/0_shibuya-1km/plan.md` restored the human
 * agent set by hand and asked a reader to check it with their eyes: three variants
 * at three LODs with a `glb`, a `positions.f16` and a `normals.f16` beside a
 * manifest, plus the three source blends the builder writes — 33 files — and the
 * three manifest names `src/world/agent-assets.ts` requests. This is that check as
 * a command, so it is a step in a chain and not a paragraph someone has to carry
 * out.
 *
 * Why it exists at all: the set was destroyed on 2026-09-16 when a worktree removal
 * followed a `data/` junction into the primary, and the rebuild from `data:setup`
 * could not bring it back because `data:agents` is not in that chain. The repair's
 * whole outcome is "the bake produced exactly what the runtime requests", and
 * nothing checked it.
 *
 * Expectations are derived from the code, not from that paragraph:
 *
 * - `tools/agents/bake-human.py` writes `OUT = ROOT / "data/scene/agents"`:
 *   `{variant}-{lod}.glb`, `{variant}-{lod}-positions.f16`,
 *   `{variant}-{lod}-normals.f16` and `{variant}.json`, for `near`, `medium` and
 *   `far`, naming each file inside the manifest rather than only beside it.
 * - `tools/agents/build-human.py` writes `{variant}-source.blend` into the same
 *   directory, which is also what the bake reopens per LOD.
 * - `HUMAN_ASSET_URLS` in `src/world/agent-assets.ts` is what the runtime requests
 *   by name, at `/scene/agents/`, which `tools/vite/serve-scene-data.ts` serves
 *   from `data/scene/`. That constant is imported here rather than restated, so a
 *   fourth variant or a renamed manifest changes this check instead of escaping it.
 *
 * Bound: this proves a delivered set is complete, non-empty, parseable and
 * internally consistent — every file the manifest names is present beside it and
 * matches the byte length and SHA-256 the manifest records. It does not decode a
 * GLB, read a half float, or measure a silhouette, a gait or a frame rate; those
 * are `tools/agents/verify.ts` and `tools/agents/manifests.ts`, which run the
 * shipping admission gate over the same bytes. It reads no input outside the
 * directory it checks: `data/agents/source` is intake and is deliberately not
 * consulted, so a complete output set passes with its sources absent.
 *
 * Unrecognised files are listed and do not fail the set. This directory also holds
 * the vehicle fleet `tools/agents/build-vehicles.ts` publishes, so failing on any
 * file the human set does not name would red a correct repair. A file named the way
 * the bake names its output, but which this set does not name, is reported as a
 * finding rather than a note, because that is what a half-rename or a stale variant
 * looks like; `commuter.json`, the legacy duplicate `tools/agents/manifests.ts`
 * knows about, is tolerated and only listed.
 *
 * `--root <directory>` points it anywhere, which is how it is exercised before the
 * real bake exists — nothing here writes into the directory it checks.
 *
 * Reads are awaited one at a time rather than gathered with `Promise.all`, because
 * the bound this has to survive is a `--root` pointed at a directory of tens of
 * thousands of files, where a promise per file is an open-file limit rather than a
 * check. At 33 files the difference is unmeasurable.
 *
 * `HUMAN_VARIANTS` and `HUMAN_LODS` say which files the runbook's 33 are; the file
 * each manifest actually names is what gets checked, because that is what the
 * runtime resolves at load. So a set whose assets follow another naming convention
 * passes while a set that renames one asset without renaming it in the manifest
 * fails — the right way round, since the runtime reads the manifest and never the
 * convention. `manifestNameFor` reads `HUMAN_ASSET_URLS` rather than restating it,
 * so this file cannot drift from the runtime's own list by being edited alone.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { HUMAN_ASSET_URLS } from "../../src/world/agent-assets.ts";

/** Every message this tool prints starts with this, so a log line names its origin. */
const PREFIX = "Human agent set check failed";

/** The geometry levels `tools/agents/bake-human.py` bakes for every variant. */
export const HUMAN_LODS = ["near", "medium", "far"] as const;

/** The variant ids the bake bakes, in the order `bake-human.py` writes them. */
export const HUMAN_VARIANTS = ["commuter-male", "office-male", "commuter-female"] as const;

export type HumanVariant = typeof HUMAN_VARIANTS[number];
export type HumanLodId = typeof HUMAN_LODS[number];

/** One problem, addressed to the file or field that carries it. */
export interface SetFinding {
  /** The input at fault: a file name, or `variant/field` for a manifest field. */
  readonly input: string;
  /** What happened, in the repository's message shape. */
  readonly message: string;
}

export interface LodReport {
  readonly variant: string;
  readonly lod: string;
  readonly files: readonly string[];
  readonly findings: readonly SetFinding[];
}

export interface VariantReport {
  readonly variant: string;
  readonly manifest: string;
  readonly lods: readonly LodReport[];
  readonly findings: readonly SetFinding[];
}

export interface HumanSetReport {
  readonly directory: string;
  readonly required: readonly string[];
  /** The names of `required` that are on disk, whether or not each one agrees with its manifest. */
  readonly found: readonly string[];
  readonly variants: readonly VariantReport[];
  readonly findings: readonly SetFinding[];
  /** Files in the directory that the human set of this repository does not name. */
  readonly unrecognised: readonly string[];
  readonly complete: boolean;
}

/**
 * The manifest file name the runtime requests for one variant, taken from
 * `HUMAN_ASSET_URLS` so the runtime and this check cannot drift apart.
 */
export function manifestNameFor(variant: string): string | undefined {
  const url = HUMAN_ASSET_URLS.find(candidate => basename(candidate) === `${variant}.json`);
  return url === undefined ? undefined : basename(url);
}

/** The three file names the bake writes for one variant and level. */
export function expectedLodFiles(variant: string, lod: string): readonly string[] {
  return [`${variant}-${lod}.glb`, `${variant}-${lod}-positions.f16`, `${variant}-${lod}-normals.f16`];
}

/** The manifest file name for a variant, refusing one the runtime never asks for. */
function requiredManifest(variant: string): string {
  const manifest = manifestNameFor(variant);
  if (manifest === undefined) {
    throw new Error(
      `This check and src/world/agent-assets.ts disagree about variant ${variant}: HUMAN_ASSET_URLS requests ` +
        `${HUMAN_ASSET_URLS.map(url => basename(url)).join(", ")}, which has no ${variant}.json. Add the variant ` +
        "to HUMAN_VARIANTS and to HUMAN_ASSET_URLS together, or drop it from this check.",
    );
  }
  return manifest;
}

/** Every file a complete human set contains: 27 assets, 3 manifests, 3 blends. */
export function expectedHumanFiles(): readonly string[] {
  const files: string[] = [];
  for (const variant of HUMAN_VARIANTS) {
    files.push(requiredManifest(variant));
    for (const lod of HUMAN_LODS) files.push(...expectedLodFiles(variant, lod));
    files.push(`${variant}-source.blend`);
  }
  return files;
}

/** The same set as a lookup, for reporting what the directory holds that it does not name. */
export function expectedHumanFileSet(): ReadonlySet<string> {
  return new Set(expectedHumanFiles());
}

/**
 * A manifest file name must be a bare name inside the checked directory, because
 * the runtime resolves it as a URL path segment beside the manifest.
 */
function localName(value: unknown, variant: string, field: string, findings: SetFinding[]): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    findings.push({ input: `${variant}/${field}`, message: `${field} is not a file name: ${JSON.stringify(value)}. The bake writes the name its own export produced, so a manifest missing it did not come from tools/agents/bake-human.py.` });
    return undefined;
  }
  if (basename(value) !== value || value.includes("\\") || value.includes("/")) {
    findings.push({ input: `${variant}/${field}`, message: `${field} is ${JSON.stringify(value)}, which is a path and not a file name beside the manifest. The runtime loads it as ${JSON.stringify(`/scene/agents/${value}`)}, which no file satisfies. Rewrite it as a name in this directory, or re-run npm run data:agents.` });
    return undefined;
  }
  return value;
}

interface Size {
  readonly bytes: number;
}

/** Read a file's size, or nothing when it is absent or is not a regular file. */
async function sizeOf(path: string): Promise<Size | undefined> {
  try {
    const info = await stat(path);
    return info.isFile() ? { bytes: info.size } : undefined;
  } catch {
    return undefined;
  }
}

interface Digested {
  readonly bytes: number;
  readonly sha256: string;
}

async function digestOf(path: string): Promise<Digested> {
  const content = await readFile(path);
  return { bytes: content.byteLength, sha256: createHash("sha256").update(content).digest("hex") };
}

/**
 * A field the manifest records as a byte length for the whole LOD, when it records one.
 *
 * `tools/agents/bake-human.py` writes `bytes` as the three files added together, so
 * it is checked against that sum and never against one file's size — a manifest
 * whose `bytes` was read as a per-file length would fail every LOD of a correct
 * bake, which is a false red and hides the real ones.
 */
function recordedBytes(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/**
 * Classify a digest field the manifest carries.
 *
 * Absent is not a problem: a manifest may record no digest for a field, and
 * `tools/agents/bake-human.py` always writes all three. Present but malformed is a
 * problem, and it is the one the probe caught this check reporting as a pass — a
 * digest that is not a digest cannot be compared with anything, and reading it as
 * "nothing recorded" turns a corrupt manifest into a certified bake.
 */
function digestValue(value: unknown): { digest?: string; malformed?: string } {
  if (value === undefined) return {};
  if (typeof value === "string" && /^[a-f0-9]{64}$/.test(value)) return { digest: value };
  return { malformed: JSON.stringify(value) ?? "undefined" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check a directory against the code's own expectations and report every problem
 * by name. Missing, empty, unparseable and disagreeing inputs are all findings;
 * unrecognised files are reported and do not fail the set, because this directory
 * also holds the vehicle fleet `tools/agents/build-vehicles.ts` publishes.
 */
export async function checkHumanSet(directory: string): Promise<HumanSetReport> {
  const root = resolve(directory);
  const required = expectedHumanFiles();
  const findings: SetFinding[] = [];
  const variants: VariantReport[] = [];

  let present: string[] = [];
  let listed = true;
  try {
    present = (await readdir(root, { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => entry.name).sort();
  } catch (error) {
    listed = false;
    findings.push({
      input: root,
      message: `${root} could not be listed, so there is no human set to check: ${error instanceof Error ? error.message : String(error)}. Run npm run data:agents to bake it, with Blender and the pinned archives that command needs, or point --root at a directory that holds a set.`,
    });
  }

  for (const variant of HUMAN_VARIANTS) {
    const variantFindings: SetFinding[] = [];
    const manifestFile = requiredManifest(variant);
    const lodReports = new Map<string, LodReport>();
    let manifest: Record<string, unknown> | undefined;

    const size = await sizeOf(resolve(root, manifestFile));
    if (size === undefined) {
      variantFindings.push({
        input: manifestFile,
        message: `${manifestFile} is missing, and src/world/agent-assets.ts requests it by name at /scene/agents/${manifestFile}: the runtime cannot load ${variant} at all. Run npm run data:agents to bake the human set into ${root}.`,
      });
    } else if (size.bytes === 0) {
      variantFindings.push({
        input: manifestFile,
        message: `${manifestFile} is empty, so it names no LOD and the runtime's load of ${variant} fails on malformed JSON. Re-run npm run data:agents: an interrupted bake leaves this file at zero bytes.`,
      });
    } else {
      const text = await readFile(resolve(root, manifestFile), "utf8");
      try {
        const parsed: unknown = JSON.parse(text);
        if (!isRecord(parsed)) {
          variantFindings.push({
            input: manifestFile,
            message: `${manifestFile} parses as ${Array.isArray(parsed) ? "an array" : typeof parsed} and not as a manifest object, so it carries no lods. Re-run npm run data:agents.`,
          });
        } else {
          manifest = parsed;
        }
      } catch (error) {
        variantFindings.push({
          input: manifestFile,
          message: `${manifestFile} is not valid JSON: ${error instanceof Error ? error.message : String(error)}. The file is truncated or corrupt; re-run npm run data:agents rather than editing it by hand.`,
        });
      }
    }

    if (manifest !== undefined) {
      if (manifest["id"] !== variant) {
        variantFindings.push({
          input: `${variant}/id`,
          message: `${manifestFile} declares id ${JSON.stringify(manifest["id"])} and the runtime's slot for it is ${JSON.stringify(variant)}. A manifest written under another variant's name describes another person's assets; re-run npm run data:agents.`,
        });
      }
      const lods = manifest["lods"];
      if (!Array.isArray(lods)) {
        variantFindings.push({
          input: `${variant}/lods`,
          message: `${manifestFile} carries no lods array, so it names no model and no VAT texture. Re-run npm run data:agents.`,
        });
      } else {
        const byId = new Map<string, Record<string, unknown>>();
        for (const entry of lods) {
          if (!isRecord(entry) || typeof entry["id"] !== "string") {
            variantFindings.push({
              input: `${variant}/lods`,
              message: `${manifestFile} has a LOD entry that is not an object with an id: ${JSON.stringify(entry)}. Re-run npm run data:agents.`,
            });
            continue;
          }
          byId.set(entry["id"], entry);
        }
        for (const lod of HUMAN_LODS) {
          const problems: SetFinding[] = [];
          const entry = byId.get(lod);
          if (entry === undefined) {
            problems.push({
              input: `${variant}/${lod}`,
              message: `${manifestFile} declares no ${lod} LOD, and src/agents/render/humans.ts loads near, medium and far for every variant: it throws "Human ${variant} has no ${lod} LOD" at startup. Re-run npm run data:agents.`,
            });
            lodReports.set(lod, { variant, lod, files: [], findings: problems });
            continue;
          }
          const files: string[] = [];
          const fields = {
            model: "modelSha256",
            positions: "positionSha256",
            normals: "normalSha256",
          } as const;
          let deliveredBytes = 0;
          for (const [field, digestField] of Object.entries(fields)) {
            const file = localName(entry[field], variant, `${lod}.${field}`, problems);
            if (file === undefined) continue;
            files.push(file);
            const path = resolve(root, file);
            const info = await sizeOf(path);
            if (info === undefined) {
              problems.push({
                input: file,
                message: `${file} is missing, and ${manifestFile} names it as the ${lod} ${field} of ${variant}. Run npm run data:agents to bake it into ${root}.`,
              });
              continue;
            }
            if (info.bytes === 0) {
              problems.push({
                input: file,
                message: `${file} is empty, and ${manifestFile} names it as the ${lod} ${field} of ${variant}, so that LOD cannot be loaded from it. An interrupted bake leaves whole files at zero bytes; run npm run data:agents.`,
              });
              continue;
            }
            deliveredBytes += info.bytes;
            const declared = digestValue(entry[digestField]);
            if (declared.malformed !== undefined) {
              problems.push({
                input: `${variant}/${lod}.${digestField}`,
                message: `${manifestFile} records ${declared.malformed} as the ${field} digest of ${variant}/${lod}; a SHA-256 is 64 lowercase hexadecimal characters. A digest that is not a digest cannot be compared with anything, and src/agents/render/assets.ts refuses the asset on it. Re-run npm run data:agents.`,
              });
              continue;
            }
            if (declared.digest === undefined) continue;
            const actual = await digestOf(path);
            if (actual.sha256 !== declared.digest) {
              problems.push({
                input: file,
                message: `${file} digests ${actual.sha256}; ${manifestFile} records ${declared.digest} for ${variant}/${lod} ${field}. src/agents/render/assets.ts verifies that digest at load and refuses the asset, so ${variant}/${lod} cannot render from this set. Re-run npm run data:agents.`,
              });
            }
          }
          const declaredBytes = recordedBytes(entry["bytes"]);
          if (declaredBytes !== undefined && problems.length === 0 && declaredBytes !== deliveredBytes) {
            problems.push({
              input: `${variant}/${lod}.bytes`,
              message: `${manifestFile} records ${declaredBytes} bytes for ${variant}/${lod} and its three files are ${deliveredBytes} bytes together. The manifest describes a different bake from the one on disk; re-run npm run data:agents rather than editing the manifest.`,
            });
          }
          lodReports.set(lod, { variant, lod, files, findings: problems });
        }
      }
    }

    // The source blend is the builder's own output, so it is required here beside
    // the assets rather than left to a reader's memory of the runbook.
    const blend = `${variant}-source.blend`;
    const blendSize = await sizeOf(resolve(root, blend));
    if (blendSize === undefined) {
      variantFindings.push({
        input: blend,
        message: `${blend} is missing, and tools/agents/build-human.py writes it into ${root} before tools/agents/bake-human.py reopens it per LOD. The three VAT assets can exist while the blend is gone, and the blend is the rig the bake was driven from, so its absence is reported rather than assumed. Re-run npm run data:agents.`,
      });
    } else if (blendSize.bytes === 0) {
      variantFindings.push({
        input: blend,
        message: `${blend} is empty; a Blender save that produced no bytes did not complete. Re-run npm run data:agents.`,
      });
    }

    variants.push({
      variant,
      manifest: manifestFile,
      lods: HUMAN_LODS.map(lod => lodReports.get(lod) ?? { variant, lod, files: [], findings: [] }),
      findings: variantFindings,
    });
  }

  const expected = new Set(required);
  const expectedLods = new Set(HUMAN_VARIANTS.flatMap(variant => HUMAN_LODS.map(lod => expectedLodFiles(variant, lod))).flat());
  const found = present.filter(name => expected.has(name));
  const unrecognised = present.filter(name => !expected.has(name));
  for (const name of unrecognised) {
    // A file the bake would have named, that this set does not name, is the case a
    // reader most needs told: it is what a half-rename or a stale variant looks
    // like on disk. Everything else in this directory is another pipeline's.
    if (expectedLods.has(name)) findings.push({ input: name, message: `${name} is present and is not a file this set names. It looks like a human asset under another name, and nothing loads it. Re-run npm run data:agents to write the set the runtime requests, and remove the stray file.` });
  }

  const complete = listed &&
    variants.every(report => report.findings.length === 0 && report.lods.every(lod => lod.findings.length === 0)) &&
    findings.length === 0;
  return { directory: root, required, found, variants, findings, unrecognised, complete };
}

/** Every finding in the report, in the order a reader should work through them. */
export function setFindings(report: HumanSetReport): readonly SetFinding[] {
  return [
    ...report.findings,
    ...report.variants.flatMap(variant => [...variant.findings, ...variant.lods.flatMap(lod => lod.findings)]),
  ];
}

/** The report as a person reads it: what was checked, then every problem by name. */
export function formatHumanSetReport(report: HumanSetReport): string {
  const lines: string[] = [];
  lines.push(`Human agent set: ${report.directory}`);
  lines.push(`  ${report.required.length} files required (${HUMAN_VARIANTS.length} variants x ${HUMAN_LODS.length} LODs x {glb, positions.f16, normals.f16} = ${HUMAN_VARIANTS.length * HUMAN_LODS.length * 3}, ${HUMAN_VARIANTS.length} manifests, ${HUMAN_VARIANTS.length} source blends); ${report.found.length} of them on disk`);
  for (const variant of report.variants) {
    const missingVariant = report.found.includes(variant.manifest) ? "" : ` ${variant.manifest} missing`;
    lines.push(`  ${variant.findings.length > 0 ? "FAIL" : "ok  "} ${variant.variant} (${variant.manifest})${missingVariant}`);
    for (const lod of variant.lods) {
      // A level whose manifest could not be read is not `ok`, and saying so would
      // be the report's own version of "did not run" printed as "passed".
      const status = variant.findings.length > 0 && lod.files.length === 0 ? "SKIP" : lod.findings.length > 0 ? "FAIL" : "ok  ";
      const declared = lod.files.length === 0 ? "" : ` [${lod.files.join(", ")}]`;
      lines.push(`    ${status} ${variant.variant}/${lod.lod}${declared}`);
    }
  }
  const problems = setFindings(report);
  if (problems.length > 0) {
    lines.push("");
    lines.push(`${PREFIX}: ${problems.length} problem${problems.length === 1 ? "" : "s"} in ${report.directory}:`);
    for (const problem of problems) lines.push(`  - ${problem.input}: ${problem.message}`);
  }
  if (report.unrecognised.length > 0) {
    lines.push("");
    lines.push(`  ${report.unrecognised.length} other file${report.unrecognised.length === 1 ? "" : "s"} in ${report.directory}, none of them part of the human set. These do not fail the check: the vehicle fleet is published here too. A human-looking file among them is reported above.`);
    for (const name of report.unrecognised) lines.push(`    ${name}`);
  }
  lines.push("");
  const failedEvidence = [
    ...report.variants.filter(variant => variant.findings.length > 0).map(variant => `${variant.variant}/manifest`),
    ...report.variants.flatMap(variant => variant.lods.filter(lod => lod.findings.length > 0).map(lod => `${lod.variant}/${lod.lod}`)),
    ...report.findings.map(finding => finding.input),
  ];
  lines.push(report.complete
    ? `Human agent set complete: ${report.found.length} of ${report.required.length} files on disk, every manifest parsed, and every file a manifest names present and non-empty, matching each digest the manifest records.`
    : `Human agent set INCOMPLETE: ${report.found.length} of ${report.required.length} files on disk, ${problems.length} named problem${problems.length === 1 ? "" : "s"} above${failedEvidence.length === 0 ? "" : `; failed ${failedEvidence.join(", ")}`}. Run npm run data:agents to rebuild the set, then run this check again.`);
  return lines.join("\n");
}

/**
 * `--root <directory>` or nothing. Anything else is refused by name rather than
 * silently ignored, because a check that ran against the wrong tree reports a pass
 * for a set nobody asked about.
 */
export function humanSetRootArgument(args: readonly string[]): string {
  if (args.length === 0) return resolve(import.meta.dirname, "../../data/scene/agents");
  if (args.length === 2 && args[0] === "--root" && !!args[1] && !args[1]!.startsWith("--")) return resolve(args[1]!);
  throw new Error(
    `${PREFIX}: ${args.join(" ")} is not a usable argument. Use --root <directory> to check a directory other ` +
      "than data/scene/agents, or pass nothing to check the served bake output.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await checkHumanSet(humanSetRootArgument(process.argv.slice(2)));
  console.log(formatHumanSetReport(report));
  // An explicit exit rather than `process.exitCode`, so the status is this check's
  // verdict and not whatever a later write to stdout happens to leave behind.
  if (!report.complete) process.exit(1);
}

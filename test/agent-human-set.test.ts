/** Bounds: the delivered human set's file inventory, in a synthetic tree under the
 * system temp directory. It proves the check reports a missing file, an empty file,
 * a corrupt manifest, a mismatched digest, a dropped LOD, a missing source blend, a
 * manifest that names a path, and a manifest whose digest is not a digest Ã¢â‚¬â€ and that
 * it passes a complete set while a vehicle file sits beside it.
 *
 * It proves nothing about the real `data/scene/agents`, because that directory
 * holds no human set and nothing here may write into a served mount while the
 * verdict capture runs. The real bake is checked by running the same tool against
 * it once `npm run data:agents` has restored it.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkHumanSet, expectedHumanFiles, humanSetRootArgument, setFindings } from "../tools/agents/verify-human-set.ts";

const VARIANTS = ["commuter-male", "office-male", "commuter-female"];
const LODS = ["near", "medium", "far"];
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/** Deterministic filler, so every case's digests are stable across runs. */
function fill(length: number, seed: number): Buffer {
  const bytes = Buffer.alloc(length);
  for (let index = 0; index < length; index++) bytes[index] = (index * 31 + seed * 17) % 251;
  return bytes;
}

/** A complete glTF 2 GLB, so the model files are what their extension claims. */
function glb(): Buffer {
  const json = Buffer.from(JSON.stringify({ asset: { version: "2.0" }, scenes: [{}], scene: 0 }), "utf8");
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
  const bin = Buffer.alloc(4);
  const total = 12 + 8 + padded.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(padded.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, padded, binHeader, bin]);
}

async function completeSet(directory: string): Promise<void> {
  for (const [variantIndex, variant] of VARIANTS.entries()) {
    await writeFile(join(directory, `${variant}-source.blend`), fill(2048, variantIndex + 1));
    const lods = [];
    for (const [lodIndex, lod] of LODS.entries()) {
      const seed = variantIndex * 8 + lodIndex;
      const model = `${variant}-${lod}.glb`;
      const positions = `${variant}-${lod}-positions.f16`;
      const normals = `${variant}-${lod}-normals.f16`;
      const modelBytes = glb();
      const positionBytes = fill(4096, seed + 2);
      const normalBytes = fill(4096, seed + 3);
      await writeFile(join(directory, model), modelBytes);
      await writeFile(join(directory, positions), positionBytes);
      await writeFile(join(directory, normals), normalBytes);
      lods.push({ id: lod, model, modelSha256: hash(modelBytes), vertexCount: 512,
        positions, normals, positionSha256: hash(positionBytes), normalSha256: hash(normalBytes),
        textureWidth: 2048, textureHeight: 96, rowsPerFrame: 1,
        bytes: modelBytes.length + positionBytes.length + normalBytes.length });
    }
    await writeFile(join(directory, `${variant}.json`), JSON.stringify({
      version: 2, id: variant, units: "metres", up: "+Y", forward: "+Z", origin: "feet", yawAxis: "+Y",
      vertexAttribute: "_VAT_ID", textureFormat: "rgba16f-le", vatSpace: "world-baked",
      clips: [{ id: "walk", firstFrame: 0, frameCount: 32, durationSeconds: 1, strideMetres: 1.1, loop: true },
        { id: "idle", firstFrame: 32, frameCount: 16, durationSeconds: 2.5, strideMetres: 0, loop: true }],
      lods, sources: [], animation: "fixture", qualityStatus: "fixture",
    }, null, 2));
  }
  // The vehicle fleet is published into this directory too, so a complete human set
  // is never alone on disk and the check must not read these as part of it.
  await writeFile(join(directory, "vehicles.json"), JSON.stringify({ version: 1, vehicles: [] }, null, 2));
}

/** Edit one manifest field, which is how each red control below is applied. */
async function patch(directory: string, variant: string, lod: string, field: string, value: unknown): Promise<void> {
  const file = join(directory, `${variant}.json`);
  const manifest = JSON.parse(await readFile(file, "utf8"));
  const entry = manifest.lods.find((candidate: { id: string }) => candidate.id === lod);
  entry[field] = value;
  await writeFile(file, JSON.stringify(manifest, null, 2));
}

async function temporary(test: (folder: string) => Promise<void>): Promise<void> {
  const folder = await mkdtemp(resolve(tmpdir(), "maps-human-set-"));
  try { await completeSet(folder); await test(folder); }
  finally { await rm(folder, { recursive: true, force: true }); }
}

/**
 * Each case builds 33 files and hashes them, so a case costs about a second alone
 * and over ten when the machine is busy. Vitest's 10 s default is the wrong bound
 * for a check that runs while `npm run visual` owns the CPU: it failed three
 * inventory cases on a loaded run that passes in 4.7 s when idle. The ceiling below
 * is a bound on how long a correct case may take, not a place a failure can hide.
 */
const CASE_TIMEOUT_MS = 120_000;

/** The finding whose input is this name, or undefined when nothing named it. */
function named(report: Awaited<ReturnType<typeof checkHumanSet>>, input: string): string | undefined {
  return setFindings(report).find(finding => finding.input === input)?.message;
}

describe("human agent set inventory", () => {
  it("expects the 33 files the runbook names: 27 assets, 3 manifests and 3 source blends", () => {
    const files = expectedHumanFiles();
    expect(files).toHaveLength(33);
    for (const variant of VARIANTS) {
      expect(files).toContain(`${variant}.json`);
      expect(files).toContain(`${variant}-source.blend`);
      for (const lod of LODS) {
        expect(files).toContain(`${variant}-${lod}.glb`);
        expect(files).toContain(`${variant}-${lod}-positions.f16`);
        expect(files).toContain(`${variant}-${lod}-normals.f16`);
      }
    }
  });
  it("passes a complete set with the vehicle manifest beside it", async () => temporary(async folder => {
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(true);
    expect(setFindings(report)).toEqual([]);
    expect(report.found).toHaveLength(33);
    expect(report.unrecognised).toEqual(["vehicles.json"]);
  }), CASE_TIMEOUT_MS);
  it("does not accept 30 of 33 files as a pass, and names the three", async () => temporary(async folder => {
    await rm(join(folder, "commuter-male-near.glb"));
    await rm(join(folder, "office-male-medium-positions.f16"));
    await rm(join(folder, "commuter-female-far-normals.f16"));
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(report.found).toHaveLength(30);
    expect(named(report, "commuter-male-near.glb")).toMatch(/missing.*near model of commuter-male.*data:agents/s);
    expect(named(report, "office-male-medium-positions.f16")).toMatch(/missing.*medium positions of office-male/s);
    expect(named(report, "commuter-female-far-normals.f16")).toMatch(/missing.*far normals of commuter-female/s);
  }), CASE_TIMEOUT_MS);
  it("names an empty file rather than reading it as present", async () => temporary(async folder => {
    await writeFile(join(folder, "office-male-far.glb"), Buffer.alloc(0));
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "office-male-far.glb")).toMatch(/empty.*data:agents/s);
  }), CASE_TIMEOUT_MS);
  it("names a manifest that is not valid JSON", async () => temporary(async folder => {
    await writeFile(join(folder, "commuter-female.json"), '{"version": 2, "lods": [');
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "commuter-female.json")).toMatch(/not valid JSON.*data:agents/s);
  }), CASE_TIMEOUT_MS);
  it("names a recorded digest the delivered file does not match", async () => temporary(async folder => {
    await patch(folder, "office-male", "medium", "positionSha256", "0".repeat(64));
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "office-male-medium-positions.f16")).toMatch(/digests [a-f0-9]{64}; office-male\.json records 0{64}.*refuses the asset/s);
  }), CASE_TIMEOUT_MS);
  it("names a digest field that is not a digest, instead of reading it as nothing recorded", async () => temporary(async folder => {
    await patch(folder, "office-male", "medium", "positionSha256", "not-a-digest");
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "office-male/medium.positionSha256")).toMatch(/64 lowercase hexadecimal/);
  }), CASE_TIMEOUT_MS);
  it("names a LOD the manifest stopped declaring", async () => temporary(async folder => {
    const file = join(folder, "commuter-male.json");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    manifest.lods = manifest.lods.filter((entry: { id: string }) => entry.id !== "far");
    await writeFile(file, JSON.stringify(manifest, null, 2));
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "commuter-male/far")).toMatch(/declares no far LOD.*no far LOD" at startup/s);
  }), CASE_TIMEOUT_MS);
  it("names a missing source blend, which the assets alone would not show", async () => temporary(async folder => {
    await rm(join(folder, "office-male-source.blend"));
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "office-male-source.blend")).toMatch(/missing.*build-human\.py writes it/s);
  }), CASE_TIMEOUT_MS);
  it("refuses a manifest that names a path instead of a file beside it", async () => temporary(async folder => {
    await patch(folder, "office-male", "near", "model", "models/office-male-near.glb");
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(false);
    expect(named(report, "office-male/near.model")).toMatch(/path and not a file name.*no file satisfies/s);
  }), CASE_TIMEOUT_MS);
  it("lists a stray file without failing a complete set", async () => temporary(async folder => {
    await writeFile(join(folder, "commuter-male-old.glb"), fill(256, 99));
    const report = await checkHumanSet(folder);
    expect(report.complete).toBe(true);
    expect(report.unrecognised).toContain("commuter-male-old.glb");
  }), CASE_TIMEOUT_MS);
  it("reports a directory that does not exist rather than an empty pass", async () => {
    const missing = resolve(tmpdir(), `maps-human-set-absent-${process.pid}`);
    const report = await checkHumanSet(missing);
    expect(report.complete).toBe(false);
    expect(setFindings(report).some(finding => /could not be listed/.test(finding.message))).toBe(true);
    expect(named(report, missing)).toMatch(/could not be listed.*data:agents/s);
  }, CASE_TIMEOUT_MS);
});

describe("human agent set command", () => {
  it("takes --root and refuses anything else by name", () => {
    expect(humanSetRootArgument(["--root", "somewhere"])).toBe(resolve("somewhere"));
    expect(humanSetRootArgument([])).toMatch(/data[\\/]scene[\\/]agents$/);
    expect(() => humanSetRootArgument(["--directory", "somewhere"])).toThrow(/not a usable argument.*--root/s);
    expect(() => humanSetRootArgument(["--root"])).toThrow(/not a usable argument/);
  });
  it("exits non-zero on an incomplete set and zero on a complete one, so it can be a chain step", async () => temporary(async folder => {
    // Resolved from the working directory vitest runs in, which is the repository
    // root, so the CLI is exercised as `npm run data:agents:set` invokes it.
    const tool = resolve("tools/agents/verify-human-set.ts");
    const green = spawnSync(process.execPath, [tool, "--root", folder], { encoding: "utf8", timeout: 60_000, windowsHide: true });
    expect(green.status, `${green.stdout}${green.stderr}`).toBe(0);
    await rm(join(folder, "commuter-male-near.glb"));
    const red = spawnSync(process.execPath, [tool, "--root", folder], { encoding: "utf8", timeout: 60_000, windowsHide: true });
    expect(red.status).toBe(1);
    expect(red.stdout).toMatch(/commuter-male-near\.glb is missing/);
    expect(red.stdout).toMatch(/Human agent set INCOMPLETE: 32 of 33 files on disk/);
    // Two node starts, and each one has to build a tree of manifest reads while the
    // verdict capture owns the CPU. Measured 2026-09-16: 4.7 s idle, over 40 s on a
    // run that shared the machine with the capture, with vitest's 10 s default
    // failing this case and the three slowest inventory cases by timeout. The
    // ceiling is raised rather than the work moved: a hang still fails, named.
  }), CASE_TIMEOUT_MS);
});

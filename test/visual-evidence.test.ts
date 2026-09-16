/** Bound: a complete 44-frame manifest and its exact files. This catches sibling
 * cleanup deleting earlier captures; synthetic PNGs here do not prove graphics.
 */
import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { beginVisualRun, verifyVisualRun } from "../tools/visual/verify-output.js";

/** Bound: the gate's own success artifact, against a later run that failed. */
it("clears the previous complete.json when a new capture run begins", async () => {
  const root = await mkdtemp(join(tmpdir(), "maps-visual-begin-"));
  const dist = join(root, "dist");
  try {
    await mkdir(join(dist, "assets"), { recursive: true });
    await writeFile(join(dist, "index.html"), "<!doctype html>");
    await writeFile(join(dist, "assets", "index-abc.js"), "built");
    await writeFile(join(root, "complete.json"), JSON.stringify({ completedAt: "2026-09-14T00:00:00Z" }));
    await beginVisualRun(root, dist);
    await expect(readFile(join(root, "complete.json"), "utf8")).rejects.toThrow(/ENOENT/);
    const run = JSON.parse(await readFile(join(root, "run.json"), "utf8")) as {
      build: { file: string; sha256: string }[];
    };
    expect(run.build.map((entry) => entry.file.replaceAll("\\", "/")).map((file) => file.split("/").slice(-2).join("/")))
      .toEqual(["dist/index.html", "assets/index-abc.js"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("rejects deleted sibling frames, stale runs, changed build bytes and changed frame bytes", async () => {
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
});

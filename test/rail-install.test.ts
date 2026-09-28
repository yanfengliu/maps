/** Fixed external-packet restoration and preservation. No network, GPU or regeneration. */
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installRail } from "../tools/scene/install-rail.ts";
import { RAIL_MANIFEST_SHA256, trialAssets, type RailTrialManifest } from "../src/world/rail-trial.ts";
import { railTrialServer } from "../tools/vite/serve-rail-trial.ts";
import config from "../vite.config.ts";

const packet = path.resolve("data/rail"), source = path.join(packet, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(source, "utf8")) as RailTrialManifest;
interface TargetState { directory: string; dev: number; ino: number; files: number; directories: number; links: number }
interface Fixture { root: string; parent: string; dev: number; ino: number; links: Map<string, TargetState> }
const roots: Fixture[] = [];
// lstat each entry and never descend through a link. Any access error fails the
// whole enumeration, leaving the fixture intact instead of accepting a partial count.
function entries(directory: string): { files: number; directories: number; links: string[] } {
  const result = { files: 0, directories: 0, links: [] as string[] };
  for (const name of fs.readdirSync(directory)) {
    const file = path.join(directory, name), info = fs.lstatSync(file);
    if (info.isSymbolicLink()) result.links.push(file);
    else if (info.isDirectory()) { const child = entries(file); result.directories += 1 + child.directories; result.files += child.files; result.links.push(...child.links); }
    else if (info.isFile()) result.files++;
    else throw Error(`Fixture cleanup cannot classify ${file}; preserve its root.`);
  }
  return result;
}
function targetState(target: string): TargetState {
  const directory = fs.realpathSync.native(target), info = fs.lstatSync(directory), count = entries(directory);
  expect(info.isDirectory() && !info.isSymbolicLink()).toBe(true);
  return { directory, dev: info.dev, ino: info.ino, files: count.files, directories: count.directories, links: count.links.length };
}
function junction(root: string, target: string, link: string): void {
  const owner = roots.find(row => row.root === root)!;
  const before = targetState(target);
  fs.symlinkSync(target, link, "junction"); owner.links.set(link, before);
}
function fixture(scene = true): string {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(tmpdir(), "maps-rail-install-"))), info = fs.lstatSync(root);
  roots.push({ root, parent: fs.realpathSync.native(tmpdir()), dev: info.dev, ino: info.ino, links: new Map() });
  fs.mkdirSync(path.join(root, "data"));
  if (scene) junction(root, path.resolve("data/scene"), path.join(root, "data/scene"));
  return root;
}
function listing(directory: string): [string, string][] {
  return fs.readdirSync(directory).sort().map(name => [name, createHash("sha256").update(fs.readFileSync(path.join(directory, name))).digest("hex")]);
}
afterEach(() => {
  vi.restoreAllMocks();
  while (roots.length) {
    const owner = roots[0]!, { root } = owner, info = fs.lstatSync(root);
    expect(info.isDirectory() && !info.isSymbolicLink()).toBe(true);
    expect([fs.realpathSync.native(root), path.dirname(root), info.dev, info.ino]).toEqual([root, owner.parent, owner.dev, owner.ino]);
    expect(path.basename(root).startsWith("maps-rail-install-")).toBe(true);
    const links = entries(root).links.sort();
    console.info(`Rail fixture cleanup: ${links.length} links found; ${owner.links.size} created.`);
    expect(links).toEqual([...owner.links.keys()].sort());
    for (const link of links) expect(targetState(link)).toEqual(owner.links.get(link));
    for (const link of links) fs.rmdirSync(link); // Remove each known junction itself before recursive removal.
    for (const before of owner.links.values()) expect(targetState(before.directory)).toEqual(before);
    expect(entries(root).links).toEqual([]);
    fs.rmSync(root, { recursive: true }); // Only the checked owned root, with every junction already absent.
    roots.shift();
  }
});

describe("admitted rail packet installer", () => {
  it("copies exactly the admitted packet, preserves source and is idempotent", () => {
    const root = fixture(), before = listing(packet), first = installRail(source, root);
    expect(first).toMatchObject({ status: "installed", files: 34, bytes: 52950963, sha256: RAIL_MANIFEST_SHA256 });
    expect(listing(first.directory)).toEqual(before);
    const times = fs.readdirSync(first.directory).map(name => fs.statSync(path.join(first.directory, name)).mtimeMs);
    expect(installRail(source, root).status).toBe("already-installed");
    expect(fs.readdirSync(first.directory).map(name => fs.statSync(path.join(first.directory, name)).mtimeMs)).toEqual(times);
    expect(listing(packet)).toEqual(before);
  });
  it("refuses missing or different manifests before creating a destination", () => {
    const root = fixture(), wrong = path.join(root, "wrong-manifest.json"); fs.writeFileSync(wrong, "{}");
    expect(() => installRail(path.join(root, "missing.json"), root)).toThrow(/cannot read.*required file/);
    expect(() => installRail(wrong, root)).toThrow(/manifest differs.*no destination/);
    expect(fs.existsSync(path.join(root, "data/rail"))).toBe(false);
  });
  it("refuses a missing or corrupted packet asset before publication", () => {
    const root = fixture(), input = path.join(root, "input"); fs.cpSync(packet, input, { recursive: true });
    const asset = path.join(input, manifest.layers[0]!.file), original = fs.readFileSync(asset);
    fs.unlinkSync(asset); expect(() => installRail(path.join(input, "manifest.json"), root)).toThrow(/cannot read.*required file/);
    fs.writeFileSync(asset, Buffer.alloc(original.length)); expect(() => installRail(path.join(input, "manifest.json"), root)).toThrow(/asset differs.*no destination/);
    expect(fs.existsSync(path.join(root, "data/rail"))).toBe(false);
  });
  it("checks all three source tile pins without writing to the scene", () => {
    const root = fixture(false), leaves = path.join(root, "data/scene/buildings/data"); fs.mkdirSync(leaves, { recursive: true });
    for (const pin of manifest.tiles) fs.copyFileSync(path.join("data/scene/buildings", pin.uri), path.join(leaves, pin.file));
    const tile = path.join(leaves, manifest.tiles[2]!.file); fs.writeFileSync(tile, "different source tile");
    expect(() => installRail(source, root)).toThrow(/source tile differs.*no destination/);
    expect(fs.readFileSync(tile, "utf8")).toBe("different source tile"); expect(fs.existsSync(path.join(root, "data/rail"))).toBe(false);
  });
  it.each(["empty", "partial", "different", "foreign"])("preserves an existing %s destination without repairing it", mode => {
    const root = fixture(), destination = path.join(root, "data/rail");
    if (mode === "different" || mode === "foreign") installRail(source, root); else fs.mkdirSync(destination);
    if (mode === "partial") fs.writeFileSync(path.join(destination, "manifest.json"), "partial");
    if (mode === "different") fs.writeFileSync(path.join(destination, manifest.materials.file), "other bytes");
    if (mode === "foreign") fs.writeFileSync(path.join(destination, "owner-notes.txt"), "preserve me");
    const before = listing(destination);
    expect(() => installRail(source, root)).toThrow(/nothing was overwritten/); expect(listing(destination)).toEqual(before);
  });
  it.each(["data", "rail"])("refuses a %s destination junction and preserves its target", mode => {
    const root = fixture(false), other = path.join(root, "foreign"); fs.mkdirSync(other); fs.writeFileSync(path.join(other, "keep.txt"), "foreign");
    if (mode === "data") fs.rmdirSync(path.join(root, "data"));
    const link = path.join(root, mode === "data" ? "data" : "data/rail"); junction(root, other, link);
    expect(() => installRail(source, root)).toThrow(/not a file, symlink or junction/);
    expect(fs.readFileSync(path.join(other, "keep.txt"), "utf8")).toBe("foreign");
  });
  it("removes only its fresh partial writes after a disk failure, before manifest publication", () => {
    const root = fixture(), write = fs.writeFileSync; let writes = 0;
    vi.spyOn(fs, "writeFileSync").mockImplementation((file, bytes, options) => { if (typeof file === "number" && ++writes === 2) throw Error("controlled disk failure"); return write(file, bytes, options); });
    expect(() => installRail(source, root)).toThrow(/newly created files were removed.*no manifest was published/);
    expect(fs.existsSync(path.join(root, "data/rail"))).toBe(false); expect(fs.existsSync(source)).toBe(true);
  });
  it("binds the literal default and finite server to the accepted external manifest", () => {
    expect(config.define?.__MAPS_RAIL_TRIAL__).toBe(JSON.stringify({ url: "/rail-trial/manifest.json", sha256: RAIL_MANIFEST_SHA256 }));
    expect(config.plugins?.map(p => p && "name" in p ? p.name : null)).toContain("maps:rail-trial");
    expect(railTrialServer(source, RAIL_MANIFEST_SHA256).binding.sha256).toBe(RAIL_MANIFEST_SHA256);
    expect(() => railTrialServer(source, "0".repeat(64))).toThrow(/differs from admitted SHA-256/);
    expect(() => railTrialServer(path.join(fixture(), "missing.json"), RAIL_MANIFEST_SHA256)).toThrow(/npm run data:rail/);
    expect(trialAssets(manifest)).toHaveLength(33);
  });
});

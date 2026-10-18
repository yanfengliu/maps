/** Bound: five cached packet files, real scene middleware/Windows short aliases and mocked preparation stages. No producer, listener, renderer or contact claim. */
import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { Writable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, ViteDevServer } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_WALK_FILES, LOCAL_WALK_PACKET_DIRECTORY, readLocalWalkPacket } from "../tools/agents/local-walk/packet.ts";
import { localWalkServer } from "../tools/vite/serve-local-walk.ts";
import { serveSceneData } from "../tools/vite/serve-scene-data.ts";
import { ensureLocalWalk } from "../tools/agents/local-walk/ensure.mjs";

const stages = vi.hoisted(() => ({ prepare: vi.fn(), profile: vi.fn(), input: vi.fn() }));
vi.mock("../tools/agents/local-walk/command.mjs", () => ({ runPreparation: stages.prepare, parsePreparationArguments: vi.fn() }));
vi.mock("../tools/agents/local-walk/profile.mjs", () => ({ CURRENT_776_PROFILE: { id: "current-776-bounded-generation" }, FRESH_1695_PROFILE: { id: "fresh-1695-bounded-generation" }, assertInputProfile: stages.profile }));
vi.mock("../tools/agents/local-walk/paths.mjs", async () => ({ ...await vi.importActual("../tools/agents/local-walk/paths.mjs"), readPinned: stages.input }));

const source = path.resolve(LOCAL_WALK_PACKET_DIRECTORY);
// A missing preparation is a failed prerequisite, not a skipped test or download.
const originals = readLocalWalkPacket(source);
const sourceManifestSha = JSON.parse(originals.get("manifest.json")!.toString()).sourceInputs.some((row: { sha256: string }) => row.sha256 === "1e558138fe8d6df9dfbf9df76d05c868d776fc9fbd8e018999e611d86a63d15f") ? "801ce9a8f1b8400e3abe7aa0af779a0b30353467e7a5aa89a1aca98e5ff4dc98" : LOCAL_WALK_FILES[0][2];
const sourceProfile = sourceManifestSha === LOCAL_WALK_FILES[0][2] ? "current-776-bounded-generation" : "fresh-1695-bounded-generation";
const owned: { root: string; parent: string }[] = [];
function fixture(withPacket = true, parent = tmpdir()): string {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(parent, "maps-local-walk-")));
  owned.push({ root, parent: fs.realpathSync.native(parent) });
  if (withPacket) writePacket(root);
  return root;
}
function writePacket(root: string): void {
  const directory = path.join(root, LOCAL_WALK_PACKET_DIRECTORY);
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, bytes] of originals) fs.writeFileSync(path.join(directory, name), bytes, { flag: "wx" });
}
function census(directory: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(directory)) {
    const file = path.join(directory, entry), info = fs.lstatSync(file);
    if (info.isSymbolicLink()) throw Error(`Owned walker fixture cleanup refuses linked entry ${file}`);
    if (info.isDirectory()) count += census(file);
    else if (info.isFile()) count++;
    else throw Error(`Owned walker fixture cleanup cannot classify ${file}`);
  }
  return count;
}
function middleware(plugin: ReturnType<typeof localWalkServer>["plugin"]): Connect.NextHandleFunction {
  let handler: Connect.NextHandleFunction | undefined;
  (plugin.configureServer as (server: ViteDevServer) => void)({ middlewares: { use: (next: Connect.NextHandleFunction) => { handler = next; } } } as unknown as ViteDevServer);
  if (!handler) throw Error("Packet middleware was not registered");
  return handler;
}
function response(handler: Connect.NextHandleFunction, url: string): { status: number; body: unknown; headers: Map<string, unknown>; next: boolean } {
  const result = { status: 200, body: undefined as unknown, headers: new Map<string, unknown>(), next: false };
  const target = { setHeader: (name: string, value: unknown) => result.headers.set(name, value), end: (value: unknown) => { result.body = value; } };
  Object.defineProperty(target, "statusCode", { get: () => result.status, set: (value: number) => { result.status = value; } });
  handler({ url } as IncomingMessage, target as unknown as ServerResponse, () => { result.next = true; });
  return result;
}
function streamedResponse(handler: Connect.NextHandleFunction, url: string): Promise<{ status: number; body: Buffer; headers: Map<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [], headers = new Map<string, unknown>();
    let status = 200;
    const target = new Writable({ write(chunk: Buffer, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
    Object.assign(target, { setHeader: (name: string, value: unknown) => headers.set(name, value) });
    Object.defineProperty(target, "statusCode", { get: () => status, set: (value: number) => { status = value; } });
    const deadline = setTimeout(() => { target.destroy(); reject(Error(`Scene middleware did not finish ${url}`)); }, 5000);
    target.once("finish", () => { clearTimeout(deadline); resolve({ status, body: Buffer.concat(chunks), headers }); });
    target.once("error", error => { clearTimeout(deadline); reject(error); });
    try { handler({ url } as IncomingMessage, target as unknown as ServerResponse, () => { clearTimeout(deadline); reject(Error(`Scene middleware passed through ${url}`)); }); }
    catch (error) { clearTimeout(deadline); target.destroy(); reject(error); }
  });
}
function sceneFixture(): { root: string; directory: string; ordinary: Buffer; secret: Buffer } {
  // Stay below the checkout so createRequire resolves the installed decoder.
  const parent = path.resolve("artifacts"); fs.mkdirSync(parent, { recursive: true });
  const root = fixture(false, parent), directory = path.join(root, "data", "scene"), ordinary = Buffer.from("ordinary scene mesh bytes"), secret = Buffer.from("owned mutable walker bytes");
  fs.mkdirSync(path.join(directory, "local-walk", "packet"), { recursive: true });
  fs.writeFileSync(path.join(directory, "ordinary-surface.mesh"), ordinary);
  for (const name of ["manifest.json", "preparation-receipt.json"]) fs.writeFileSync(path.join(directory, "local-walk", "packet", name), secret);
  return { root, directory, ordinary, secret };
}
function shortPaths(files: string[]): string[] {
  const env = { ...process.env }, variables = files.map((file, index) => { const name = `MAPS_SCENE_ALIAS_${index}`; env[name] = file; return `"%${name}%"`; });
  const result = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", `for %I in (${variables.join(" ")}) do @echo %~sI`], { env, encoding: "utf8", windowsHide: true, windowsVerbatimArguments: true, timeout: 10000 });
  if (result.error || result.status !== 0) throw Error(`Windows short-name fixture reader failed: ${result.error ?? result.stderr}`);
  const paths = result.stdout.trim().split(/\r?\n/);
  if (paths.length !== files.length) throw Error("Windows short-name fixture reader returned a different path count");
  return paths;
}
beforeEach(() => { stages.prepare.mockReset(); stages.profile.mockReset(); stages.input.mockReset(); stages.profile.mockReturnValue([]); stages.input.mockReturnValue(Buffer.alloc(0)); });
afterEach(() => {
  vi.restoreAllMocks();
  for (const { root, parent } of owned.splice(0)) {
    expect(fs.lstatSync(root).isSymbolicLink()).toBe(false);
    expect(path.dirname(root)).toBe(parent);
    expect(path.basename(root).startsWith("maps-local-walk-")).toBe(true);
    census(root); // Fail on every enumeration error or link before recursive deletion.
    fs.rmSync(root, { recursive: true });
  }
});

describe("canonical scene file identity", () => {
  it("streams ordinary scene bytes when the walker subtree is absent", async () => {
    const fixture = sceneFixture(); fs.rmSync(path.join(fixture.directory, "local-walk"), { recursive: true });
    const result = await streamedResponse(middleware(serveSceneData(fixture.root)), "/scene/ordinary-surface.mesh");
    expect(result.status).toBe(200); expect(result.body.equals(fixture.ordinary)).toBe(true); expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it("refuses an existing file whose canonical identity leaves the scene mount", async () => {
    const fixture = sceneFixture(), outside = path.join(fixture.root, "outside-scene"), link = path.join(fixture.directory, "outside-alias");
    fs.mkdirSync(outside); fs.writeFileSync(path.join(outside, "foreign.mesh"), fixture.secret);
    fs.symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
    try {
      const result = await streamedResponse(middleware(serveSceneData(fixture.root)), "/scene/outside-alias/foreign.mesh");
      expect({ status: result.status, mutableBytes: result.body.equals(fixture.secret) }).toEqual({ status: 403, mutableBytes: false }); expect(result.body.toString()).toContain("outside /scene/");
    } finally {
      expect(fs.lstatSync(link).isSymbolicLink()).toBe(true); expect(fs.realpathSync.native(link)).toBe(outside);
      fs.unlinkSync(link); // Remove this exact owned link before the no-link cleanup census.
    }
  });
  it.runIf(process.platform === "win32")("denies derived directory/file short aliases and serves an aliased ordinary mount", async () => {
    const fixture = sceneFixture(), walker = path.join(fixture.directory, "local-walk"), receipt = path.join(walker, "packet", "preparation-receipt.json"), ordinary = path.join(fixture.directory, "ordinary-surface.mesh");
    const [shortRoot, shortWalker, shortReceipt, shortOrdinary] = shortPaths([fixture.root, walker, receipt, ordinary]);
    if (!shortRoot || !shortWalker || !shortReceipt || !shortOrdinary) throw Error("Windows short-name fixture paths are missing");
    const alias = path.basename(shortWalker), receiptAlias = path.basename(shortReceipt), ordinaryAlias = path.basename(shortOrdinary);
    // An unavailable 8.3 prerequisite fails on Windows; it cannot silently pass.
    expect(alias.toLowerCase()).not.toBe("local-walk"); expect(receiptAlias.toLowerCase()).not.toBe("preparation-receipt.json"); expect(shortRoot.toLowerCase()).not.toBe(fixture.root.toLowerCase());
    expect(fs.realpathSync.native(shortRoot)).toBe(fixture.root); expect(fs.realpathSync.native(shortReceipt)).toBe(receipt); expect(fs.readFileSync(shortReceipt).equals(fixture.secret)).toBe(true);
    for (const root of [fixture.root, shortRoot]) {
      const handler = middleware(serveSceneData(root));
      for (const url of [`/scene/${alias}/packet/manifest.json`, `/scene/${alias}/packet/preparation-receipt.json`, `/scene/${alias}/packet/${receiptAlias}`, `/scene/${alias.toLowerCase()}%2fpacket%2f${receiptAlias}?fresh=1`]) {
        const result = await streamedResponse(handler, url);
        expect.soft({ status: result.status, mutableBytes: result.body.equals(fixture.secret) }, url).toEqual({ status: 404, mutableBytes: false });
        expect.soft(result.body.toString(), url).toContain("/local-walk/");
      }
      const result = await streamedResponse(handler, `/scene/${ordinaryAlias}`);
      expect(result.status).toBe(200); expect(result.body.equals(fixture.ordinary)).toBe(true); expect(result.headers.get("content-type")).toBe("application/octet-stream");
    }
  });
});

describe("shared verified walker service", () => {
  it("serves exactly the verified buffers after a later disk change", () => {
    const root = fixture(), directory = path.join(root, LOCAL_WALK_PACKET_DIRECTORY), service = localWalkServer(directory), handler = middleware(service.plugin);
    fs.writeFileSync(path.join(directory, "context.json"), "changed after verification");
    for (const [name, bytes] of originals) {
      const result = response(handler, `/local-walk/${name}?fresh=1`);
      expect(result.status).toBe(200); expect(Buffer.isBuffer(result.body)).toBe(true); expect((result.body as Buffer).equals(bytes)).toBe(true); expect(result.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(service.binding).toEqual({ url: "/local-walk/manifest.json", sha256: sourceManifestSha });
  });
  it.each(["preparation-receipt.json", "../manifest.json", "%2e%2e%2fmanifest.json", "nested/manifest.json"])("refuses foreign packet route %s", name => {
    expect(response(middleware(localWalkServer(source).plugin), `/local-walk/${name}`).status).toBe(404);
  });
  it.each(LOCAL_WALK_FILES.map(([name]) => name))("refuses changed or missing %s before serving", name => {
    const root = fixture(), directory = path.join(root, LOCAL_WALK_PACKET_DIRECTORY), file = path.join(directory, name);
    fs.writeFileSync(file, "changed"); expect(() => localWalkServer(directory)).toThrow(name);
    fs.unlinkSync(file); expect(() => localWalkServer(directory)).toThrow("npm run data:local-walk");
  });
  it.each(["/scene/local-walk", "/scene/local-walk/packet/manifest.json", "/scene/local-walk/packet/preparation-receipt.json", "/scene/local-walk%2fpacket%2fmanifest.json", "/scene/roads/../local-walk/packet/manifest.json", ...(process.platform === "win32" ? ["/scene/LOCAL-WALK/packet/manifest.json"] : [])])("refuses mutable scene alias %s", url => {
    const result = response(middleware(serveSceneData(path.resolve("."))), url);
    expect(result.status).toBe(404); expect(String(result.body)).toContain("/local-walk/");
  });
});

describe("cached walker preparation entry", () => {
  const options = (project: string) => ({ project, profile: sourceProfile });
  it("refuses a recognized packet from the other selected source profile", async () => {
    const root = fixture();
    const other = sourceProfile === "fresh-1695-bounded-generation" ? "current-776-bounded-generation" : "fresh-1695-bounded-generation";
    await expect(ensureLocalWalk({ project: root, profile: other })).rejects.toThrow("manifest.json");
    expect(stages.prepare).not.toHaveBeenCalled();
    expect(readLocalWalkPacket(path.join(root, LOCAL_WALK_PACKET_DIRECTORY)).get("manifest.json")).toEqual(originals.get("manifest.json"));
  });

  it("verifies an exact existing packet without writing or calling the producer", async () => {
    const root = fixture(), directory = path.join(root, LOCAL_WALK_PACKET_DIRECTORY), before = LOCAL_WALK_FILES.map(([name]) => fs.statSync(path.join(directory, name)).mtimeMs);
    expect(await ensureLocalWalk(options(root))).toMatchObject({ status: "verified-existing", files: 5, productionReady: false });
    expect(stages.profile).toHaveBeenCalledWith(root, sourceProfile); expect(stages.input).toHaveBeenCalledTimes(12); expect(stages.prepare).not.toHaveBeenCalled();
    expect(LOCAL_WALK_FILES.map(([name]) => fs.statSync(path.join(directory, name)).mtimeMs)).toEqual(before);
  });
  it("refuses a missing cached prerequisite before any producer or output write", async () => {
    const root = fixture(false); stages.input.mockImplementation(() => { throw Error("data/scene/agents/commuter-female-source.blend is missing"); });
    await expect(ensureLocalWalk(options(root))).rejects.toThrow("commuter-female-source.blend");
    expect(stages.prepare).not.toHaveBeenCalled(); expect(fs.existsSync(path.join(root, LOCAL_WALK_PACKET_DIRECTORY))).toBe(false);
  });
  it("preserves a partial existing packet and refuses regeneration", async () => {
    const root = fixture(), directory = path.join(root, LOCAL_WALK_PACKET_DIRECTORY); fs.unlinkSync(path.join(directory, "rig-far.json"));
    await expect(ensureLocalWalk(options(root))).rejects.toThrow("rig-far.json");
    expect(stages.prepare).not.toHaveBeenCalled(); expect(fs.readdirSync(directory)).toHaveLength(4);
  });
  it("runs one producer stage only for absent output, then verifies its actual bytes", async () => {
    const root = fixture(false); stages.prepare.mockImplementation(async () => writePacket(root));
    expect(await ensureLocalWalk(options(root))).toMatchObject({ status: "prepared", files: 5, productionReady: false });
    expect(stages.prepare).toHaveBeenCalledOnce(); expect(stages.prepare).toHaveBeenCalledWith(options(root));
  });
  it("preserves a refused producer result without reporting preparation", async () => {
    const root = fixture(false); stages.prepare.mockImplementation(async () => { writePacket(root); fs.writeFileSync(path.join(root, LOCAL_WALK_PACKET_DIRECTORY, "manifest.json"), "different successor"); });
    await expect(ensureLocalWalk(options(root))).rejects.toThrow("manifest.json");
    expect(fs.readFileSync(path.join(root, LOCAL_WALK_PACKET_DIRECTORY, "manifest.json"), "utf8")).toBe("different successor");
  });
  it("rejects a different declared profile before reading its inputs", async () => {
    await expect(ensureLocalWalk({ project: fixture(false), profile: "historical" })).rejects.toThrow("current-776-bounded-generation");
    expect(stages.profile).not.toHaveBeenCalled(); expect(stages.prepare).not.toHaveBeenCalled();
  });
});

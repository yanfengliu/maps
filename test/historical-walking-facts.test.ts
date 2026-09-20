/**
 * harness: shipped indexOsm/filter + offline historical-facts API and artifact CLI.
 * Finite reviewed-input fixtures gate historical admission, exact roster and byte
 * bindings. They prove neither source recovery nor current support or step gait.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWalkingFacts } from "../tools/network/build-walking-facts.ts";
import { deriveHistoricalWalkingFacts, validateHistoricalWalkingFacts, type WalkingFactInputs } from "../tools/network/historical-walking-facts.ts";

// Wrap the native ESM namespace so individual failure injections are replaceable;
// all uninjected functions still call the actual filesystem.
vi.mock("node:fs", async importOriginal => ({ ...await importOriginal<typeof import("node:fs")>() }));

const sha = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));
const originalRaw = "1".repeat(64), terrain = "2".repeat(64), roads = "3".repeat(64), revision = "a".repeat(40);
// Independent reviewed osm.ts Git text digest, not computed from the tested helper.
const helper = "28288d6d97c7f858ca3766ca720e6614425d8ceb0a5fd012b225f4dc16e0bd0c";
const cutoff = "2026-09-07T03:23:56Z", watermark = "2026-09-20T01:54:02Z";
const authored = ["walk:authored:scramble-diagonal:f", "walk:authored:scramble-diagonal:r"];
type Json = Record<string, any>;
function documents() {
  const source: Json = { osm3s: { timestamp_osm_base: watermark }, elements: [
    { type: "node", id: 1, lat: 35.65, lon: 139.7 }, { type: "node", id: 2, lat: 35.66, lon: 139.7 },
    { type: "way", id: 11, nodes: [1, 2], tags: { highway: "footway", footway: "sidewalk", name: "Not included" } },
    { type: "way", id: 12, nodes: [1, 2], tags: { highway: "footway", footway: "crossing", level: "0", access: "permissive" } },
    { type: "way", id: 13, nodes: [1, 2], tags: { highway: "steps", foot: "yes" } },
    { type: "way", id: 11, nodes: [1, 2] },
  ] };
  const accepted: Json = {
    version: 1, provenance: { osmTimestamp: cutoff, osmSha256: originalRaw, terrainSha256: terrain, roadsSha256: roads, method: "fixture replay" },
    admissionBounds: { fixture: true }, boundary: { later: [1, 2] }, nodes: [{ id: "n1" }, { id: "n2" }], lanes: [{ late: [1, 2, 3] }],
    walks: [
      { id: "walk:11:f", sourceWayId: 11, kind: "sidewalk" }, { id: "walk:11:r", sourceWayId: 11, kind: "sidewalk" },
      { id: "walk:12:f", sourceWayId: 12, kind: "crossing" }, { id: "walk:13:f", sourceWayId: 13, kind: "sidewalk" },
      ...authored.map(id => ({ id, sourceWayId: null, kind: "crossing" })),
    ], junctions: [{ tail: { value: 9 } }], physical: { tail: [3, 4] }, portals: [{ id: "last", tail: 9 }], diagnostics: { authoredEdges: [...authored], last: [8, 9] },
  };
  return { source, accepted };
}

const paths = {
  acceptedNetwork: "accepted-network.json", replayNetwork: "historical-network.json", source: "historical-replay/1-response.bin",
  query: "historical-replay/1-request.overpassql", request: "historical-replay/1-request.json", response: "historical-replay/1-result.json", preparation: "preparation.json",
};
type Fixture = ReturnType<typeof documents>;
function fixture(edit?: (docs: Fixture) => void, editReplay?: (replay: Json) => void): WalkingFactInputs {
  const docs = documents(); edit?.(docs);
  const source = bytes(docs.source), replay = structuredClone(docs.accepted);
  replay.provenance.osmSha256 = sha(source); replay.provenance.osmTimestamp = watermark; editReplay?.(replay);
  const query = Buffer.from(`[out:json][timeout:300][date:"${cutoff}"];\nway["highway"](35,139,36,140);out body;`);
  const acceptedNetwork = bytes(docs.accepted);
  const members = {
    acceptedNetwork, replayNetwork: bytes(replay), source, query,
    request: bytes({ date: cutoff, bodySha256: sha(query), bodyBytes: query.length }),
    response: bytes({ status: 200, responseComplete: true, valid: true, responseSha256: sha(source), responseBytes: source.length, wrapperTimestamp: watermark }),
    preparation: bytes({ ref: revision, comparisons: [{ path: "tools/network/osm.ts", gitBlobSha256: helper, committedTextEqualAfterCrLfNormalization: true }], inputs: {
      network: { sha256: sha(acceptedNetwork) }, historical: { sha256: sha(source) }, terrain: { sha256: terrain }, roads: { sha256: roads },
    } }),
  };
  return bind(members);
}
function bind(members: WalkingFactInputs["members"]): WalkingFactInputs {
  const freeze = bytes({ schemaVersion: 1, generatorRevision: revision, originalRawRecovered: false,
    files: Object.entries(paths).map(([key, path]) => ({ path, sha256: sha(members[key as keyof typeof paths]), bytes: members[key as keyof typeof paths].length })),
  });
  return { expectedLineageFreezeSha256: sha(freeze), freeze, members };
}
function editMember(input: WalkingFactInputs, member: keyof typeof paths, edit: (value: Json) => void): WalkingFactInputs {
  const value = JSON.parse(Buffer.from(input.members[member]).toString()); edit(value);
  return bind({ ...input.members, [member]: bytes(value) });
}

describe("historical walking facts", () => {
  it("retains exact independent facts, absent level, explicit zero, steps and authored identities", () => {
    const input = fixture(), facts = deriveHistoricalWalkingFacts(input);
    expect(facts.edges).toEqual([
      { edgeId: "walk:11:f", kind: "sidewalk", sourceWayId: 11, origin: "osm", fields: { highway: "footway", footway: "sidewalk" } },
      { edgeId: "walk:11:r", kind: "sidewalk", sourceWayId: 11, origin: "osm", fields: { highway: "footway", footway: "sidewalk" } },
      { edgeId: "walk:12:f", kind: "crossing", sourceWayId: 12, origin: "osm", fields: { highway: "footway", footway: "crossing", access: "permissive", level: "0" } },
      { edgeId: "walk:13:f", kind: "sidewalk", sourceWayId: 13, origin: "osm", fields: { highway: "steps", foot: "yes" } },
      ...authored.map(edgeId => ({ edgeId, kind: "crossing", sourceWayId: null, origin: "authored", rule: "scramble-diagonal-v1" })),
    ]);
    expect(facts.binding).toMatchObject({ originalNetworkOsmSha256: originalRaw, queryCutoff: cutoff, responseWatermark: watermark, producerRevision: revision, filterHelperNormalizedSha256: helper, originalRawRecovered: false });
    expect(JSON.stringify(deriveHistoricalWalkingFacts(input))).toBe(JSON.stringify(facts));
    expect(() => validateHistoricalWalkingFacts(facts, input)).not.toThrow();
  });
  it("rejects an incorrect external freeze and each unbound member", () => {
    const input = fixture();
    expect(() => deriveHistoricalWalkingFacts({ ...input, expectedLineageFreezeSha256: "0".repeat(64) })).toThrow("freeze.json SHA-256");
    for (const member of Object.keys(paths) as (keyof typeof paths)[]) {
      expect(() => deriveHistoricalWalkingFacts({ ...input, members: { ...input.members, [member]: Buffer.concat([Buffer.from(input.members[member]), Buffer.from(" ")]) } })).toThrow(`${paths[member]} SHA-256`);
    }
  });
  it("refuses changed helper compatibility instead of retaining the historical filter claim", () => {
    const input = editMember(fixture(), "preparation", p => { p.comparisons[0].gitBlobSha256 = "9".repeat(64); });
    expect(() => deriveHistoricalWalkingFacts(input)).toThrow("current osm.ts helper after CRLF normalization");
  });
  it("refuses a different raw source even after its freeze member is rebound", () => {
    const input = editMember(fixture(), "source", source => { source.elements[2].tags.level = "0"; });
    expect(() => deriveHistoricalWalkingFacts(input)).toThrow("replay raw source binding");
  });
  it.each(["lanes", "junctions", "physical", "portals", "diagnostics"])("compares full late payload in %s", key => {
    expect(() => deriveHistoricalWalkingFacts(fixture(undefined, replay => { replay[key] = { lateDifference: true }; }))).toThrow("complete non-provenance payload");
  });
  it("refuses reordered arrays and otherwise equal reordered payload fields", () => {
    expect(() => deriveHistoricalWalkingFacts(fixture(undefined, replay => { replay.walks.reverse(); }))).toThrow("complete non-provenance payload");
    expect(() => deriveHistoricalWalkingFacts(fixture(undefined, replay => { const nodes = replay.nodes; delete replay.nodes; replay.nodes = nodes; }))).toThrow("ordered non-provenance payload");
  });
  it("keeps full-payload refusal messages bounded and actionable", () => {
    const input = fixture(d => { d.accepted.diagnostics.large = "x".repeat(10000); }, replay => { replay.diagnostics.large += "y"; });
    let message = ""; try { deriveHistoricalWalkingFacts(input); } catch (error) { message = String(error); }
    expect(message).toContain("complete non-provenance payload"); expect(message).toContain("SHA-256");
    expect(message).toContain("Supply the matching reviewed replay bundle"); expect(message.length).toBeLessThan(500);
  });
  it.each(["terrainSha256", "roadsSha256", "method"])("permits only the two truthful provenance changes: %s", field => {
    expect(() => deriveHistoricalWalkingFacts(fixture(undefined, replay => { replay.provenance[field] = "different"; }))).toThrow("changed provenance fields");
  });
  it("binds cutoff, watermark and response completion separately", () => {
    expect(() => deriveHistoricalWalkingFacts(editMember(fixture(), "request", p => { p.date = watermark; }))).toThrow("historical query preamble");
    expect(() => deriveHistoricalWalkingFacts(editMember(fixture(), "response", p => { p.wrapperTimestamp = cutoff; }))).toThrow("response record wrapperTimestamp");
    expect(() => deriveHistoricalWalkingFacts(editMember(fixture(), "response", p => { p.responseComplete = false; }))).toThrow("response record responseComplete");
  });
  it.each([
    ["indoor", "yes"], ["tunnel", "yes"], ["bridge", "yes"], ["layer", "1"], ["level", "1"],
    ["access", "no"], ["access", "private"], ["highway", "motorway"], ["foot", "no"], ["area", "yes"],
  ])("independently refuses filter %s=%s", (key, value) => {
    expect(() => deriveHistoricalWalkingFacts(fixture(d => { d.source.elements[2].tags[key!] = value; }))).toThrow("fails the historical surface-walk filter");
  });
  it.each([
    ["missing source", (d: Fixture) => { d.accepted.walks[0].sourceWayId = 999; }],
    ["incomplete way", (d: Fixture) => { d.source.elements[2].nodes = [1, 999]; }],
    ["duplicate edge", (d: Fixture) => { d.accepted.walks.push(d.accepted.walks[0]); }],
    ["wrong kind", (d: Fixture) => { d.accepted.walks[0].kind = "crossing"; }],
    ["foreign null source", (d: Fixture) => { d.accepted.walks[0].sourceWayId = null; }],
    ["authored source substitution", (d: Fixture) => { d.accepted.walks[4].sourceWayId = 12; }],
    ["missing authored forward", (d: Fixture) => { d.accepted.walks.splice(4, 1); }],
    ["missing authored reverse", (d: Fixture) => { d.accepted.walks.splice(5, 1); }],
  ])("refuses accepted roster defect: %s", (_name, edit) => {
    expect(() => deriveHistoricalWalkingFacts(fixture(edit))).toThrow(/missing|incomplete|appears twice|source-derived kind|authored/);
  });
  it.each([
    ["missing", (f: Json) => { f.edges.pop(); }], ["duplicate", (f: Json) => { f.edges[1] = f.edges[0]; }],
    ["foreign", (f: Json) => { f.edges[0].edgeId = "foreign"; }], ["order", (f: Json) => { f.edges.reverse(); }],
    ["source", (f: Json) => { f.edges[0].sourceWayId = 12; }], ["kind", (f: Json) => { f.edges[0].kind = "crossing"; }],
    ["invented level", (f: Json) => { f.edges[0].fields.level = "0"; }], ["omitted level", (f: Json) => { delete f.edges[2].fields.level; }],
    ["foreign field", (f: Json) => { f.edges[0].fields.name = "extra"; }], ["authored eligibility", (f: Json) => { f.edges[4].fields = { highway: "footway" }; }],
    ["binding", (f: Json) => { f.binding.queryCutoff = watermark; }], ["schema", (f: Json) => { f.eligibility = true; }],
  ])("refuses artifact %s independently of its own counts", (_name, edit) => {
    const input = fixture(), facts: Json = structuredClone(deriveHistoricalWalkingFacts(input)); edit(facts);
    expect(() => validateHistoricalWalkingFacts(facts, input)).toThrow("Historical walking facts");
  });
});

const artifacts = fileURLToPath(new URL("../artifacts/", import.meta.url));
const temporary: string[] = [], links: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const link of links.splice(0)) unlinkSync(link);
  for (const directory of temporary.splice(0)) {
    if (!resolve(directory).startsWith(resolve(artifacts) + "/") && !resolve(directory).startsWith(resolve(artifacts) + "\\")) throw new Error("Fixture cleanup escaped artifacts");
    rmSync(directory, { recursive: true, force: true });
  }
});
function directory() { mkdirSync(artifacts, { recursive: true }); const dir = mkdtempSync(join(artifacts, "facts-test-")); temporary.push(dir); return dir; }
function writeBundle(dir: string, input: WalkingFactInputs) {
  writeFileSync(join(dir, "freeze.json"), input.freeze);
  for (const [key, path] of Object.entries(paths)) { const file = join(dir, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, input.members[key as keyof typeof paths]); }
}
function args(dir: string, input: WalkingFactInputs, out: string) { return ["--lineage", dir, "--freeze-sha256", input.expectedLineageFreezeSha256, "--out", out]; }
describe("artifact-only walking facts entry point", () => {
  it("writes one validated artifact and refuses replacing it", () => {
    const dir = directory(), input = fixture(), out = join(dir, "new", "facts.json"); writeBundle(dir, input);
    expect(buildWalkingFacts(args(dir, input, out))).toBe(out);
    const before = readFileSync(out); expect(() => validateHistoricalWalkingFacts(JSON.parse(before.toString()), input)).not.toThrow();
    expect(() => buildWalkingFacts(args(dir, input, out))).toThrow("already exists"); expect(readFileSync(out)).toEqual(before);
  });
  it("writes nothing after a bundle refusal", () => {
    const dir = directory(), input = fixture(), out = join(dir, "absent", "facts.json"); writeBundle(dir, input);
    writeFileSync(join(dir, paths.source), "wrong");
    expect(() => buildWalkingFacts(args(dir, input, out))).toThrow("SHA-256"); expect(existsSync(dirname(out))).toBe(false);
  });
  it("refuses foreign and shared-data destinations before reading inputs", () => {
    for (const out of ["data/walking-facts.json", "artifacts/../data/walking-facts.json", "../foreign.json", artifacts]) {
      expect(() => buildWalkingFacts(args("missing", fixture(), out))).toThrow("below this checkout's artifacts directory");
    }
  });
  it("refuses a junction destination without changing its target", () => {
    const dir = directory(), foreign = directory(), link = join(dir, "junction"); symlinkSync(foreign, link, "junction"); links.push(link);
    expect(() => buildWalkingFacts(args("missing", fixture(), join(link, "facts.json")))).toThrow("link or junction");
    expect(existsSync(join(foreign, "facts.json"))).toBe(false);
  });
  it("rejects missing, repeated and unknown options", () => {
    for (const argv of [[], ["--out"], ["--out", "a", "--out", "b"], ["--data", "a"]]) expect(() => buildWalkingFacts(argv)).toThrow("Walking facts arguments");
  });
});

/** F29: native missing inputs and controlled I/O failures must name operation,
 * path and recovery. Injections model syscall failures; they do not change ACLs. */
describe("F29 actionable filesystem errors", () => {
  it.each(["freeze.json", ...Object.values(paths)])("names missing %s and readable-bundle recovery without output", missing => {
    const dir = directory(), input = fixture(), out = join(dir, "absent-output", "facts.json"); writeBundle(dir, input); unlinkSync(join(dir, missing));
    let failure: unknown; try { buildWalkingFacts(args(dir, input, out)); } catch (error) { failure = error; }
    expect(String(failure)).toContain("cannot read reviewed bundle member"); expect(String(failure)).toContain(JSON.stringify(join(dir, missing)));
    expect(String(failure)).toContain("ENOENT"); expect(String(failure)).toContain("Supply the complete, readable reviewed lineage bundle");
    expect(existsSync(dirname(out))).toBe(false);
  });
  it.each(["missing-lineage", "missing-member"])("actual CLI reports %s with recovery and exit 1", mode => {
    const dir = directory(), input = fixture(), bundle = join(dir, "bundle"), out = join(dir, "absent-output", "facts.json");
    if (mode === "missing-member") { mkdirSync(bundle); writeFileSync(join(bundle, "freeze.json"), input.freeze); }
    const cli = fileURLToPath(new URL("../tools/network/build-walking-facts.ts", import.meta.url));
    const result = spawnSync(process.execPath, [cli, ...args(bundle, input, out)], { encoding: "utf8", timeout: 10000, windowsHide: true });
    expect(result.error).toBeUndefined(); expect(result.status).toBe(1); expect(result.stdout).toBe("");
    expect(result.stderr).toContain("cannot read reviewed bundle member"); expect(result.stderr).toContain("Supply the complete, readable reviewed lineage bundle");
    expect(result.stderr).toContain(mode === "missing-lineage" ? "freeze.json" : "accepted-network.json"); expect(existsSync(dirname(out))).toBe(false);
  });
  it("keeps read denial bounded while preserving its actual cause", () => {
    const dir = directory(), input = fixture(), out = join(dir, "absent-output", "facts.json"); writeBundle(dir, input);
    const cause = Object.assign(new Error("sensitive or verbose OS details ".repeat(1000)), { code: "EACCES" });
    vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => { throw cause; });
    let failure: unknown; try { buildWalkingFacts(args(dir, input, out)); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error); expect((failure as Error).cause).toBe(cause);
    expect(String(failure)).toContain("cannot read reviewed bundle member"); expect(String(failure)).toContain("EACCES");
    expect(String(failure)).toContain("readable reviewed lineage bundle"); expect(String(failure).length).toBeLessThan(700);
    expect(String(failure)).not.toContain("sensitive"); expect(existsSync(dirname(out))).toBe(false);
  });
  it.each(["existsSync", "lstatSync", "realpathSync"] as const)("contextualizes output inspection failure from %s", operation => {
    const dir = directory(), input = fixture(), out = join(dir, "facts.json"); writeBundle(dir, input);
    vi.spyOn(fs, operation).mockImplementationOnce(() => { throw Object.assign(new Error("denied"), { code: "EACCES" }); });
    expect(() => buildWalkingFacts(args(dir, input, out))).toThrow(/cannot (inspect|resolve) output path .*EACCES.*Choose a writable real directory/);
    vi.restoreAllMocks(); expect(existsSync(out)).toBe(false);
  });
  it.each(["mkdirSync", "writeFileSync"] as const)("contextualizes %s denial and leaves no file", operation => {
    const dir = directory(), input = fixture(), out = join(dir, "new", "facts.json"); writeBundle(dir, input);
    vi.spyOn(fs, operation).mockImplementationOnce(() => { throw Object.assign(new Error("denied"), { code: "EACCES" }); });
    const action = operation === "mkdirSync" ? "create output directory" : "create output file exclusively";
    expect(() => buildWalkingFacts(args(dir, input, out))).toThrow(new RegExp(`cannot ${action} .*EACCES.*Choose a writable real directory`));
    vi.restoreAllMocks(); expect(existsSync(out)).toBe(false);
  });
  it("names output directory recovery for a dangling junction without following it", () => {
    const dir = directory(), input = fixture(), link = join(dir, "junction"), absent = join(dir, "absent-target"); writeBundle(dir, input);
    symlinkSync(absent, link, "junction"); links.push(link);
    expect(() => buildWalkingFacts(args(dir, input, join(link, "new", "facts.json")))).toThrow(/cannot create output directory .*Choose a writable real directory/);
    expect(existsSync(absent)).toBe(false);
  });
});

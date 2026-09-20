/**
 * harness: reviewed pure generateNetwork replay; this derives facts, never a graph.
 * Caller supplies a separately reviewed freeze digest. Facts establish historical
 * source admission only, not original tag equality, current support, or locomotion.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import type { HistoricalWalkFact, HistoricalWalkingFacts, WalkingSourceField } from "../../src/world/walking-facts.ts";
import { indexOsm, surfaceExclusion, WALKABLE, type OsmDocument } from "./osm.ts";

export const WALKING_FACT_MEMBERS = {
  acceptedNetwork: "accepted-network.json",
  replayNetwork: "historical-network.json",
  source: "historical-replay/1-response.bin",
  query: "historical-replay/1-request.overpassql",
  request: "historical-replay/1-request.json",
  response: "historical-replay/1-result.json",
  preparation: "preparation.json",
} as const;
type Member = keyof typeof WALKING_FACT_MEMBERS;
export interface WalkingFactInputs {
  readonly expectedLineageFreezeSha256: string;
  readonly freeze: Uint8Array;
  readonly members: Readonly<Record<Member, Uint8Array>>;
}
const FIELDS: readonly WalkingSourceField[] = ["highway", "footway", "foot", "area", "access", "indoor", "tunnel", "bridge", "layer", "level"];
const AUTHORED = ["walk:authored:scramble-diagonal:f", "walk:authored:scramble-diagonal:r"] as const;
const PAYLOAD = ["version", "admissionBounds", "boundary", "nodes", "lanes", "walks", "junctions", "physical", "portals", "diagnostics"];
const PROVENANCE = ["osmTimestamp", "osmSha256", "terrainSha256", "roadsSha256", "method"];
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const fail = (input: string, detail: string): never => { throw new Error(`Historical walking facts ${input}: ${detail} Supply the matching reviewed replay bundle; no current-source or support fallback is allowed.`); };
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label, "expected a JSON object.");
  return value as Record<string, unknown>;
}
function parse(bytes: Uint8Array, label: string): Record<string, unknown> {
  try { return object(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)), label); }
  catch (error) { return fail(label, `cannot read its JSON object (${String(error)}).`); }
}
function hash(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) fail(label, "needs a lowercase SHA-256.");
  return value as string;
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) fail(label, "needs a nonempty string.");
  return value as string;
}
function timestamp(value: unknown, label: string): string {
  const result = text(value, label);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().replace(".000Z", "Z") !== result) fail(label, "needs an exact UTC timestamp with seconds.");
  return result;
}
function equal(actual: unknown, expected: unknown, label: string): void {
  if (!isDeepStrictEqual(actual, expected)) {
    const serialized = JSON.stringify(expected);
    const description = serialized.length <= 180 ? serialized : `with SHA-256 ${sha(serialized)}`;
    fail(label, `does not match the reviewed value ${description}.`);
  }
}
const keys = (record: Record<string, unknown>) => Object.keys(record).sort();
const helperHash = () => sha(readFileSync(new URL("./osm.ts", import.meta.url), "utf8").replaceAll("\r\n", "\n"));

/** Copy every supplied byte view before inspection; this synchronous API never yields. */
export function deriveHistoricalWalkingFacts(supplied: WalkingFactInputs): HistoricalWalkingFacts {
  const expectedFreeze = hash(supplied?.expectedLineageFreezeSha256, "external expected freeze");
  const copy = (bytes: Uint8Array, label: string) => {
    if (!(bytes instanceof Uint8Array)) fail(label, "needs its complete byte view.");
    return Uint8Array.from(bytes);
  };
  const freezeBytes = copy(supplied.freeze, "freeze.json");
  const members = Object.fromEntries(Object.keys(WALKING_FACT_MEMBERS).map(key => [key, copy(supplied.members?.[key as Member], key)])) as Record<Member, Uint8Array>;
  equal(sha(freezeBytes), expectedFreeze, "freeze.json SHA-256");
  const freeze = parse(freezeBytes, "freeze.json");
  equal(freeze.schemaVersion, 1, "freeze schema version");
  equal(freeze.originalRawRecovered, false, "original raw recovery status");
  const revision = text(freeze.generatorRevision, "generator revision");
  if (!/^[a-f0-9]{40}$/.test(revision)) fail("generator revision", "needs the full reviewed Git revision.");
  if (!Array.isArray(freeze.files)) fail("freeze files", "needs a bound member roster.");
  const roster = new Map<string, Record<string, unknown>>();
  for (const item of freeze.files as unknown[]) {
    const row = object(item, "freeze member"), path = text(row.path, "freeze member path");
    if (roster.has(path)) fail(path, "appears twice in the freeze roster.");
    roster.set(path, row);
  }
  for (const [key, path] of Object.entries(WALKING_FACT_MEMBERS)) {
    const row = roster.get(path);
    if (!row) fail(path, "is missing from the freeze roster.");
    equal(sha(members[key as Member]), hash(row!.sha256, path), `${path} SHA-256`);
    equal(members[key as Member].byteLength, row!.bytes, `${path} byte length`);
  }
  const preparation = parse(members.preparation, "preparation.json");
  equal(preparation.ref, revision, "prepared generator revision");
  if (!Array.isArray(preparation.comparisons)) fail("prepared code", "needs its reviewed helper binding.");
  const helpers = (preparation.comparisons as unknown[]).map(x => object(x, "prepared code row")).filter(x => x.path === "tools/network/osm.ts");
  if (helpers.length !== 1 || helpers[0]!.committedTextEqualAfterCrLfNormalization !== true) fail("osm.ts helper", "needs exactly one reviewed normalized source binding.");
  const expectedHelper = hash(helpers[0]!.gitBlobSha256, "reviewed normalized osm.ts");
  equal(helperHash(), expectedHelper, "current osm.ts helper after CRLF normalization");

  const accepted = parse(members.acceptedNetwork, "accepted network"), replay = parse(members.replayNetwork, "replay network");
  equal(keys(accepted), [...PAYLOAD, "provenance"].sort(), "accepted network fields");
  equal(keys(replay), keys(accepted), "replay network fields");
  equal(accepted.version, 1, "network version");
  const ap = object(accepted.provenance, "accepted provenance"), rp = object(replay.provenance, "replay provenance");
  equal(keys(ap), [...PROVENANCE].sort(), "accepted provenance fields");
  equal(keys(rp), keys(ap), "replay provenance fields");
  equal(PROVENANCE.filter(key => !isDeepStrictEqual(ap[key], rp[key])).sort(), ["osmSha256", "osmTimestamp"], "changed provenance fields");
  const withoutProvenance = (network: Record<string, unknown>) => Object.fromEntries(Object.entries(network).filter(([key]) => key !== "provenance"));
  const payload = withoutProvenance(accepted);
  equal(withoutProvenance(replay), payload, "complete non-provenance payload");
  equal(JSON.stringify(withoutProvenance(replay)), JSON.stringify(payload), "ordered non-provenance payload");
  const source = parse(members.source, "historical source");
  const osmMeta = object(source.osm3s, "historical source wrapper");
  const watermark = timestamp(osmMeta.timestamp_osm_base, "response watermark");
  equal(rp.osmSha256, sha(members.source), "replay raw source binding");
  equal(rp.osmTimestamp, watermark, "replay response watermark");
  const preparedInputs = object(preparation.inputs, "prepared input bindings");
  for (const [name, digest] of [["network", sha(members.acceptedNetwork)], ["historical", sha(members.source)], ["terrain", ap.terrainSha256], ["roads", ap.roadsSha256]] as const) equal(object(preparedInputs[name], `prepared ${name}`).sha256, digest, `prepared ${name} SHA-256`);
  const request = parse(members.request, "historical request"), response = parse(members.response, "historical response record");
  const cutoff = timestamp(request.date, "query cutoff");
  const query = new TextDecoder("utf-8", { fatal: true }).decode(members.query);
  if (!query.startsWith(`[out:json][timeout:300][date:"${cutoff}"];`) || (query.match(/\[date:/g)?.length ?? 0) !== 1) fail("historical query preamble", "does not contain its one recorded cutoff.");
  if (cutoff > watermark) fail("query cutoff", "is later than the response database watermark.");
  equal(request.bodySha256, sha(members.query), "query body SHA-256");
  equal(request.bodyBytes, members.query.byteLength, "query body length");
  for (const [key, value] of Object.entries({ status: 200, responseComplete: true, valid: true, responseSha256: sha(members.source), responseBytes: members.source.byteLength, wrapperTimestamp: watermark })) equal(response[key], value, `response record ${key}`);

  const index = indexOsm(source as unknown as OsmDocument);
  if (!Array.isArray(accepted.walks)) fail("accepted walks", "needs its complete edge array.");
  const authored = object(accepted.diagnostics, "network diagnostics").authoredEdges;
  equal(authored, [...AUTHORED], "authored edge roster");
  const seen = new Set<string>(), edges: HistoricalWalkFact[] = [];
  for (const item of accepted.walks as unknown[]) {
    const edge = object(item, "walk edge"), edgeId = text(edge.id, "walk edge ID");
    if (seen.has(edgeId)) fail(edgeId, "appears twice in the accepted walk roster.");
    seen.add(edgeId);
    if (edge.sourceWayId === null) {
      if (!(AUTHORED as readonly string[]).includes(edgeId) || edge.kind !== "crossing") fail(edgeId, "is not a supported authored diagonal record.");
      edges.push({ edgeId: edgeId as typeof AUTHORED[number], kind: "crossing", sourceWayId: null, origin: "authored", rule: "scramble-diagonal-v1" });
      continue;
    }
    if (!Number.isSafeInteger(edge.sourceWayId) || (edge.sourceWayId as number) <= 0) fail(edgeId, "needs a positive mapped source way ID.");
    if ((AUTHORED as readonly string[]).includes(edgeId)) fail(edgeId, "must retain its authored null-source identity.");
    const way = index.get(`way/${edge.sourceWayId}`);
    if (!way || !Array.isArray(way.nodes) || way.nodes.length < 2 || way.nodes.some(id => !Number.isSafeInteger(id) || !index.has(`node/${id}`))) fail(edgeId, `source way ${String(edge.sourceWayId)} is missing or incomplete.`);
    const tags = object(way!.tags, `${edgeId} source tags`);
    if (Object.values(tags).some(value => typeof value !== "string")) fail(edgeId, "source tags must have string values.");
    const sourceTags = tags as Record<string, string>;
    const excluded = surfaceExclusion(sourceTags);
    if (excluded || !WALKABLE.has(sourceTags.highway ?? "") || sourceTags.foot === "no" || sourceTags.area === "yes") fail(edgeId, `source way ${String(edge.sourceWayId)} fails the historical surface-walk filter (${excluded ?? "highway/foot/area"}).`);
    const kind = sourceTags.footway === "crossing" ? "crossing" : "sidewalk";
    equal(edge.kind, kind, `${edgeId} source-derived kind`);
    const fields = Object.fromEntries(FIELDS.filter(key => Object.hasOwn(sourceTags, key)).map(key => [key, sourceTags[key]!]));
    edges.push({ edgeId, kind, sourceWayId: edge.sourceWayId as number, origin: "osm", fields });
  }
  for (const edgeId of AUTHORED) if (!seen.has(edgeId)) fail(edgeId, "is missing from the accepted walk roster.");
  equal(helperHash(), expectedHelper, "osm.ts helper after derivation");
  return {
    version: 1, filter: "surface-walk-v1",
    binding: {
      acceptedNetworkSha256: sha(members.acceptedNetwork), originalNetworkOsmSha256: hash(ap.osmSha256, "original network OSM"),
      replayNetworkSha256: sha(members.replayNetwork), replaySourceSha256: sha(members.source), querySha256: sha(members.query),
      queryCutoff: cutoff, responseWatermark: watermark, lineageFreezeSha256: expectedFreeze, producerRevision: revision,
      filterHelperNormalizedSha256: expectedHelper, oldTerrainSha256: hash(ap.terrainSha256, "old terrain"), oldRoadsSha256: hash(ap.roadsSha256, "old roads"),
      orderedPayloadSha256: sha(JSON.stringify(payload)), originalRawRecovered: false,
    }, edges,
  };
}

/** Validate against independently supplied reviewed inputs, never the artifact's own claims. */
export function validateHistoricalWalkingFacts(candidate: unknown, inputs: WalkingFactInputs): asserts candidate is HistoricalWalkingFacts {
  const actual = object(candidate, "artifact"), expected = deriveHistoricalWalkingFacts(inputs);
  equal(keys(actual), keys(expected as unknown as Record<string, unknown>), "artifact fields");
  equal(actual.version, expected.version, "artifact version");
  equal(actual.filter, expected.filter, "artifact filter");
  equal(actual.binding, expected.binding, "artifact bindings");
  if (!Array.isArray(actual.edges)) fail("artifact edges", "needs its complete ordered edge roster.");
  const rows = actual.edges as unknown[];
  equal(rows.length, expected.edges.length, "artifact edge count");
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const id = text(object(row, `artifact row ${i}`).edgeId, `artifact row ${i} ID`);
    if (seen.has(id)) fail(id, "has duplicate artifact facts.");
    seen.add(id);
    equal(row, expected.edges[i], `artifact row ${i} (${id})`);
  });
}

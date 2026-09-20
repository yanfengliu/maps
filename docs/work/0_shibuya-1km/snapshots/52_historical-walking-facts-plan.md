# Historical walking facts — proposed contract

Owner: `lease_retirement`. Base: `05ad1a4830e5876be03116e468199370504a6693`. Worktree: `artifacts/historical-walking-facts/wt`, branch `codex/historical-walking-facts`. Status: design only, awaiting root's schema decision. No review number is allocated. Review 49 and the source-lineage author tree remain frozen; no canonical document or production file has changed.

## Outcome and boundary

Produce one small deterministic offline JSON artifact explaining the historical source class, filter and level facts for every accepted walk edge. It binds the reviewed historical replay without replacing the accepted network, installing a source/network pair, authorizing terrain contact or choosing a current support sheet. It supplies no route, position, width, threshold, source population or lease changes. The application and frozen walking v2 are not wired to it in this increment.

First instruments inspected: shipped `indexOsm`, `surfaceExclusion`, `WALKABLE`, `generateNetwork`, the pure replay/validators retained by Review 49, and the walking candidate's `createWalkingSurfaceQuery`. `data:network` and `data:scene` are writers and will not run. The current experimental consumer indexes raw current OSM and derives a ground-way set; it explicitly marks historical eligibility unverified. This increment replaces neither that consumer nor its physical selection policy. It prepares the producer-owned input required before that later work.

Read-only inventory confirms 1,738 mapped edges, 561 historical ways and two authored null-source diagonal edges. Present mapped fields include highway `footway/path/pedestrian/steps`, four footway classes, `foot:yes`, `access:permissive` and `level:0`; absence remains absence. Steps remain a source class, not accepted step locomotion. Sparse proposed mapped rows are approximately 228 KB before the small origin/binding additions; output will use compact JSON plus one newline, not a copy of raw OSM.

## Proposed artifact

```ts
interface HistoricalWalkingFacts {
  version: 1;
  filter: "surface-walk-v1";
  binding: {
    acceptedNetworkSha256: string;       // original 314fac84…
    originalNetworkOsmSha256: string;    // unrecovered 9923a9ae…
    replayNetworkSha256: string;         // truthful 30a0c16a…
    replaySourceSha256: string;          // actual e5e3f1ac… response
    querySha256: string;
    queryCutoff: string;                // 2026-09-07T03:23:56Z
    responseWatermark: string;          // 2026-09-20T01:54:02Z
    lineageFreezeSha256: string;        // reviewed b6fd638a… bundle
    producerRevision: string;           // 1ca4552…
    oldTerrainSha256: string;
    oldRoadsSha256: string;
    orderedPayloadSha256: string;       // complete payload except provenance
    originalRawRecovered: false;
  };
  edges: Array<
    | { edgeId: string; kind: "sidewalk" | "crossing";
        sourceWayId: number; origin: "osm"; fields: SourceFields }
    | { edgeId: "walk:authored:scramble-diagonal:f"
              | "walk:authored:scramble-diagonal:r";
        kind: "crossing"; sourceWayId: null; origin: "authored";
        rule: "scramble-diagonal-v1" }
  >;
}
type SourceFields = Partial<Record<
  "highway" | "footway" | "foot" | "area" | "access" |
  "indoor" | "tunnel" | "bridge" | "layer" | "level", string>>;
```

The array follows the accepted network's exact walk order. Every edge appears once. Mapped fields copy only present selected strings from that way's first source occurrence; missing tags are not normalized to `0`, `no` or a positive eligibility claim. `highway` is required for mapped rows. `footway` explains the existing crossing/sidewalk kind. These ten fields are exactly what the producer's surface/walking filters and kind choice use; they are not a general source-tag archive.

The two authored records remain authored. Validate their exact identities, null source IDs, crossing kind and membership in the accepted network's authored-edge records. Their source endpoints and geometry stay bound by the exact accepted/replay network hashes; the artifact does not invent OSM way IDs or historical tag facts for them. Neither origin grants a current mesh interval or a finite sole-contact certificate.

## Input trust and validation

The offline caller supplies the expected digest of a reviewed lineage freeze separately from the bundle. The tool must not accept the bundle's self-declared digest as its expected value. For this cohort the external expected value is `b6fd638a9b13e1651ee2464409c70518cf42da047879dd7f2fb61d9b0ffa3c8e`, accepted as bounded replay evidence through Review 49. This is a reviewed-input boundary, not a signature or authenticity framework. It does not claim original-source recovery or whole-source-tag equality from graph equality.

The minimal bundle reads the exact freeze plus its bound `accepted-network.json`, `historical-network.json`, `historical-replay/1-response.bin`, `historical-replay/1-request.overpassql`, `historical-replay/1-request.json`, `historical-replay/1-result.json` and `preparation.json`. Verify required members against the external freeze, retaining the prepared producer revision/code/dependency and old-mesh bindings through that freeze. No generator rerun, mesh load, raw source fetch or current-source fallback is needed. Copy input byte views before parsing/hashing so caller mutation cannot change checked input. The producer is synchronous and Node-only; no asynchronous byte-lifetime gap is introduced.

Recheck the entire non-provenance payload with arrays in order. Require the same top-level/provenance key sets and exactly the reviewed two changed provenance fields; old terrain/roads and method must match. Compute the ordered payload digest from the checked accepted object. Check replay raw hash against the actual historical response, response watermark against its actual JSON wrapper and retained response record, and cutoff/query identity against the bound request record and actual query preamble. Preserve the two timestamps separately. Malformed/unknown version or fields, bad hash syntax, a foreign bundle, missing members, conflicting provenance or unequal payload refuse with the affected input and expected binding.

Use the shipped first-occurrence index and unchanged filter helpers to derive mapped rows. Require each source ID to identify a complete way in that historical document; run `surfaceExclusion`, `WALKABLE`, foot and area checks, then verify its kind against the corresponding accepted edge. Do not silently skip a missing/filtered way. Reject duplicate network edge IDs, duplicate fact edge IDs, missing/foreign facts and mismatched edge/kind/source IDs. Multiple edges may legitimately share one source way and retain identical selected fields. Normal tagged-then-bare Overpass duplicate records remain supported by the existing first-occurrence contract; they are not duplicate artifact facts.

`validateHistoricalWalkingFacts(candidate, inputs)` recomputes the expected complete facts from the same externally bound inputs and compares the exact schema, bindings and roster. It refuses changed or omitted source fields, inserted unknown fields, inconsistent repeated-way facts and authored/mapped substitutions. It never validates an artifact solely against its own counts or hashes. A future browser loader would receive only the reviewed artifact plus its independently expected SHA and network binding; that loader and consumer wiring are explicitly outside this increment.

## Proposed files and APIs

- `src/world/walking-facts.ts`: readonly serializable types only, with no Node, raw OSM or geometry imports.
- `tools/network/historical-walking-facts.ts`: Node-only `deriveHistoricalWalkingFacts(inputs)` and `validateHistoricalWalkingFacts(candidate, inputs)`. Reuse `tools/network/osm.ts`; do not edit the existing filters or generator. Input types carry copied bundle bytes and the external expected freeze SHA.
- `tools/network/build-walking-facts.ts`: explicit review-artifact entry point, for example `node tools/network/build-walking-facts.ts --lineage <bundle-directory> --freeze-sha256 <reviewed-digest> --out artifacts/<task>/walking-facts.json`. No default data paths. It creates only a new file under this checkout's real `artifacts/` subtree, rejects existing output and reparse-point traversal, and does not install a production asset. Files are read and all validation completes before exclusive output creation. No package script or `data:setup` wiring in this increment.
- `test/historical-walking-facts.test.ts`: deterministic finite fixtures and whole-class refusal controls. Ignored cohort evidence records one real artifact, complete 1,740-edge validation and byte bounds after implementation is approved.

## Bounded verification plan

1. Valid fixture covers mapped sidewalk, crossing, absent versus explicit-zero level, steps as source class, repeated way references and both explicitly authored diagonals. Preserve first tagged occurrence before bare duplicates. Repeat derivation must produce identical serialized bytes.
2. Input controls change each externally bound digest/member, query cutoff, response watermark, raw source and one late payload value. Reject the current-source control even though its graph counts and validators match. Reject a payload equal only after removing more than provenance or sorting arrays.
3. Roster controls remove, duplicate and append an edge, exchange source IDs/kinds, alter a present or absent field, add an unknown field, substitute an authored row for mapped data, fabricate a null-source edge and omit either authored record. Shared-way rows must remain consistent.
4. Filter fixtures independently require refusal for indoor, tunnel, bridge, nonzero layer/level, no/private access, non-walkable highway, `foot:no` and `area:yes`. Controls reintroducing omitted binding/roster/filter checks must go red for the intended reason; the validator and producer agreeing with each other is insufficient evidence.
5. Entry-point cases use private temporary bundles/output directories: failure writes nothing, existing output remains exact, foreign/shared-data destinations and junction traversal refuse, one valid artifact is created exclusively. No test invokes existing scene/network/paint writers.
6. After focused tests/typecheck, derive once against the exact reviewed cohort in ignored output and verify 1,740 ordered rows, 1,738 mapped edges/561 ways, two authored diagonals, all ten selected-field inventories and the complete accepted network/source bindings. Check output size and unchanged shared bytes. Independent review and the owner's later combined gates still precede any code delivery.

Root's decision needed before implementation: approve or adjust this schema, the externally bound replay-bundle input contract, the artifact-only CLI boundary and the four-file scope. Until then, work is limited to read-only input inspection and this ignored design; no source-policy or canonical-status change is implied.

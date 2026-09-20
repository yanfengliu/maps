# Historical walking facts — candidate for Review 52

Owner: `lease_retirement`. Base: `05ad1a4830e5876be03116e468199370504a6693`. Branch: `codex/historical-walking-facts`. Workspace: `artifacts/historical-walking-facts/wt`. This is an uncommitted four-file candidate. Root approved the ignored design `artifacts/historical-facts-design/PLAN.md` (SHA-256 `d39df031c0a5d2b1227820988f073d4c134f52f95c85f38a86445368a000250a`) and the two clarifications below. Independent review and later integrated gates are pending.

## Result and boundary

The offline producer derives one deterministic facts record per accepted walk edge. Its input is a separately expected, reviewed lineage-freeze digest and seven exact bound byte members. It checks their hashes and lengths, complete ordered non-provenance payload equivalence, exactly the two reviewed provenance changes, actual source bytes, query cutoff, response watermark, replay code revision and old-mesh bindings. It retains missing fields as absent, describes steps without granting locomotion, and keeps both null-source diagonals explicitly authored. It grants historical admitted source eligibility only. The original `9923a9ae…` source is still unrecovered; graph equality does not establish equality of all original tags.

`producerRevision` is the historical generator `1ca4552ceee25e34ac62335114bbb5377a4d6470`. The current imported `tools/network/osm.ts` must independently match the reviewed normalized helper SHA-256 `28288d6d97c7f858ca3766ca720e6614425d8ceb0a5fd012b225f4dc16e0bd0c`; CRLF becomes LF solely for this compatibility comparison. The helper file itself is untouched. This small source compatibility check is not a signing system or a defense against concurrent hostile filesystem writers.

The new CLI accepts explicit lineage, external freeze digest and output arguments. It creates a new file only below this checkout's real `artifacts/` directory, refuses existing output, foreign/shared-data destinations and traversed links/junctions, validates before output creation, and uses exclusive creation. It never imports a data writer, downloads source, loads raw OSM in a browser or installs an asset. No loader, application, route, population, threshold, geometry, paint, guard, dependency, canonical documentation or frozen walking candidate changes are included.

## Four files

- `src/world/walking-facts.ts`: serializable readonly types and explicit historical/source-class bounds.
- `tools/network/historical-walking-facts.ts`: synchronous copied-byte derivation and exact validator against externally supplied reviewed inputs.
- `tools/network/build-walking-facts.ts`: artifact-only entry point with no package script or production installation.
- `test/historical-walking-facts.test.ts`: finite independently expected facts, bindings, roster/filter refusals and private CLI write-boundary cases.

## Checks and controls

Node `v24.12.0`. `node C:/Users/38909/Documents/github/maps/node_modules/vitest/vitest.mjs run test/historical-walking-facts.test.ts` passed **50/50**. `node C:/Users/38909/Documents/github/maps/node_modules/typescript/bin/tsc --noEmit` exited **0**. `focused-results.json` retains actual commands, statuses and source hashes; each command has separate stdout/stderr files. The first restricted Vitest startup could not resolve its config through esbuild's filesystem sandbox; the identical focused command passed in the permitted unrestricted test process. That startup was not a product failure or a passing test. No full suite, build, audit, visual or browser run occurred.

`artifacts/historical-facts-design/run-focused.mjs` creates private source copies under `mutations/`. Removing the historical filter makes **10 tests fail**. Removing exact per-row fact comparison makes **8 tests fail**. Removing the source-byte checks makes **1 test fail by accepting the altered source**. Removing the helper compatibility checks makes **1 test fail by accepting the changed expected helper**. All mutated tests exit 1; the unchanged candidate exits 0. The copies, exact mutations and logs are retained. No live source file is edited for these controls.

`artifacts/historical-facts-design/verify-candidate.mjs` called the shipped artifact entry function once against the exact reviewed `b6fd638a…` bundle. The output `walking-facts.json` is **255,664 bytes**, with **1,740 ordered edges: 1,738 mapped edges, 561 distinct source ways and two authored diagonals**. An independent loop over the actual accepted network and first historical source occurrences matches every row and selected present field. Its ordered payload SHA is `c5f3c338b4049cc2b7796af73ee952292578fca9235de3879c0510e0ade15288`. The output remains ignored; it is not adopted into shared data or proposed for ordinary Git.

Six controls use the actual independently pinned bytes: current `976d848e…` raw under the historical freeze; the same raw under a deliberately rebound private fixture freeze; the actual same-count current-control network `8bca0ac4…`; a late diagnostics value; a swap near the end of the 1,740-edge array; and otherwise equal payload fields in a different order. All refuse at the named byte/payload/order boundary. Private rebinding only reaches the semantic check and is not reviewed-source authorization. No generator arm was run.

The first full-network refusal exposed excessively long diagnostic text. The candidate now reports a bounded expected-value digest, covered by a focused test. The original verbose result is retained as `real-result-v1-verbose-errors.json`; after that diagnostic-only repair, the six controls and full row oracle were repeated against the unchanged output with `--reuse-artifact`. `real-result.json` records that reuse explicitly. The successful facts bytes and derivation logic did not change. The final focused suite and controls were refreshed after all source edits.

All **17 watched input files** retain their before/after hashes: the author freeze and seven members, current-control network, shared network/current raw source, five shared scene inputs and the unchanged local helper. `inputs-before.json` and `inputs-after.json` bind these exact files. Source-lineage and Review 49 remain frozen. No browser/server was launched; synchronous test child processes completed. The private evidence and worktree remain intentionally retained for Review 52.

## Handoff

`candidate.patch` is the complete four-new-file patch. `freeze.json` binds the four candidate paths, this report, patch, original design, scripts, results, logs and private mutation copies. Root may assign independent Review 52 against these exact bytes. This is not main integration, source-pair adoption, current surface support, clean-city rebuild, population or overall goal acceptance. The next architectural decision remains a separately reviewed consumer and current-mesh support contract.

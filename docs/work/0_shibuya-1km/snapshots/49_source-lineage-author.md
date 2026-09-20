# Bounded historical network lineage replay

The historical Overpass body reproduces the accepted network's **entire non-provenance payload exactly** under the accepted generator and original surface meshes. The later ordinary source control does not. This is one historical arm and one control, with no retries, installation, shared data writes, additional network requests, guard changes or source-policy acceptance.

## Bound inputs and mechanism

Private worktree: `artifacts/source-lineage/wt`, detached at `1ca4552ceee25e34ac62335114bbb5377a4d6470`. The invoked functions are the committed `generateNetwork`, `surfaceSampler`, `decodeMesh`, `validateShibuyaNetwork` and `validateCompoundClearance`. The writing `tools/network/build.ts` was read to preserve its exact provenance method and was never imported or run.

All 15 inspected source/type/writer files match the accepted Review5 frozen files after explicitly removing CRLF encoding differences. All 14 runtime/type counterparts match app-motion; the writer differs there only by an added explanatory comment. All 12 available Review9 counterparts match. The imported Three 0.180.0 package metadata, module and core files exactly match the local cached package tarball, whose SHA-512 matches the pinned lockfile integrity. No package was installed or fetched. `preparation.json`, SHA-256 `8bd49f8f02d298be7145c4635e70784a309085e6116576c60e4af7d05770a73b`, records every file and archive comparison.

| Input | SHA-256 |
| --- | --- |
| Accepted network | `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677` |
| Original terrain | `fef57d0960c3d08c5d31f0f56f64cff3b046b6d577b36473b7c046295249b381` |
| Original roads | `3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490` |
| Historical replay source | `e5e3f1acc6b951914ab28536fa1b9210ced80ad55d650356989ea9ba4dd7d141` |
| Ordinary September 18 source control | `976d848ee620b7d4c4780f3fe7d15e58f2ccbf0a653a195ae2f07d0d08bf6d23` |

The old meshes were read from `artifacts/scene-backup-20260917/scene/`; independent app-motion copies have the same hashes. Historical request/response evidence was copied and verified into `historical-replay/` here, outside the Q4 author tree slated for cleanup. The historical cutoff remains `2026-09-07T03:23:56Z` in a separate input sidecar; the generated network honestly records the response's actual database watermark and raw source hash. No value was rewritten to manufacture the original source digest.

## Results and provenance

Both arms passed both validators. The historical arm took 1,532 ms and produced raw candidate network SHA-256 `30a0c16a84a4299dca480e027dd88196e81cb7a7cbb706a7e10b49671f237554`. All ten non-provenance top-level fields match: `version`, `admissionBounds`, `boundary`, `nodes`, `lanes`, `walks`, `junctions`, `physical`, `portals`, and `diagnostics`. Arrays retain their order. Deep comparison and a separate ordered-serialization comparison both match; the ordered payload SHA-256 is `c5f3c338b4049cc2b7796af73ee952292578fca9235de3879c0510e0ade15288`. The latter check performs zero generator calls.

Every provenance field is accounted for:

| Field | Accepted | Historical arm | Current control |
| --- | --- | --- | --- |
| `osmSha256` | `9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671` | `e5e3f1acc6b951914ab28536fa1b9210ced80ad55d650356989ea9ba4dd7d141` | `976d848ee620b7d4c4780f3fe7d15e58f2ccbf0a653a195ae2f07d0d08bf6d23` |
| `osmTimestamp` | `2026-09-07T03:23:56Z` | `2026-09-20T01:54:02Z` | `2026-09-18T01:49:46Z` |
| `roadsSha256` | `3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490` | identical | identical |
| `terrainSha256` | `fef57d0960c3d08c5d31f0f56f64cff3b046b6d577b36473b7c046295249b381` | identical | identical |
| `method` | Exact committed method string retained in all three network files and both result records | identical | identical |

The exact unchanged `method` is: "OSM surface-only topology; AOI clipping; left-hand lanes with documented defaults; conservative turn restrictions; OSM crossing conflict envelopes and authored NE-SW scramble diagonal; PLATEAU mesh height sampling. See docs/work/0_shibuya-1km/network-contract.md."

The control took 1,524 ms and produced raw candidate SHA-256 `8bca0ac45a92ad89f4a9e7f97557cc6631ba270ea9320a6e2de0f37c23e6d7d5`. It differs at 161,332 ordered structural comparison locations: 13,841 under nodes, 147,481 under lanes, two under walks and eight under diagnostics. These are comparison locations, not distinct changed geographic features; array shifts can amplify the count. All other top-level payload fields match. The result preserves the first 30 divergences plus both complete generated networks; the comparison covers the entire payload, not just those examples.

The first ordered divergence is `/nodes/481/id`: accepted `lane:58982800:5:0:ground0:f:0:end`, control `lane:58982801:0:0:ground0:f:0:start`. That location is an array comparison witness, not a claim that either geographic node moved or disappeared.

Both arms have 5,094 nodes, 4,855 lanes, 1,740 walks and 213 junctions. Thus equal headline counts and passing validators would miss the control's different network. The historical arm uses 7,915 raw / 7,293 unique source records; the control uses 7,979 / 7,357.

## Boundary and handoff

This supports exact derived-payload equivalence for the pinned generator and old surfaces. It does not recover original raw source `9923a9ae…`, validate current scene surfaces, establish walking/vehicle behavior, or authorize a paired source/network adoption. All code/dependency and shared input hashes were rechecked unchanged afterward. The current scene's changed mesh lineage remains a separate Q1/Q4 question.

The smallest next reviewed decision is a lineage record binding the truthful historical replay, query cutoff, generator, old surfaces and this exact derived-payload comparison. Any later paired adoption or paint rebuild requires its own source/provenance decision and checks. Do not weaken the existing raw-hash guard or backfill current facts as historical authority.

`generation-summary.json` is SHA-256 `b01a3b8527077f37107a13dd16fffe4d11333b2719a1108d30b697a36805fe8d`; detailed historical/control results are `935be573cb1645ecd718a052ceddaca9279a53562ce6272eafa2a513bc6329d1` and `a9fa2f2f42ec81c73cb86ec8586b75a29959d7148feaf53d2432e2f8e13a590a`. This author report is awaiting the integration owner's independent inspection. No independent review is implied. Both bounded generation calls and the read-only comparison exited; no browser, GUI, server or GPU task was launched. The ignored evidence and unmerged private worktree are retained for handoff.

# Review 52: implementation

## Target

Independent review of the four-file historical walking-facts candidate in `artifacts/historical-walking-facts/wt`, based on `05ad1a4830e5876be03116e468199370504a6693`. This review uses detached `artifacts/historical-facts-review/wt` at the same base. Main's later documentation-only delivery does not change this declared target.

Author freeze `artifacts/historical-facts-evidence/freeze.json`, SHA-256 `cfb89919e270616cc50eba9c46a8637397b8cdaec4bd906d11fc0f222faa8aab`, binds 60 files. The complete four-new-file patch is `d5ff9b7ca2ad63dd9a477d0220e8f82df360351a02208324929dc6b76b1df5e3`. Exact authored documents are retained as [report snapshot](../snapshots/52_historical-walking-facts.md), SHA-256 `96d3366536080b64dfe87e7105acaf2e1fb7b31620db245efe923dabe293a830`, and [design snapshot](../snapshots/52_historical-walking-facts-plan.md), SHA-256 `d39df031c0a5d2b1227820988f073d4c134f52f95c85f38a86445368a000250a`.

| Candidate path | SHA-256 |
|---|---|
| `src/world/walking-facts.ts` | `612cd0281c8c55547c3c5b908f25b53cded0387e5d73d5a1432b4bc8582505cf` |
| `tools/network/historical-walking-facts.ts` | `2b58bf8d024877cf117ec8b3f689ff323d1d72a293ee2e4c7b77cf9f7007b53a` |
| `tools/network/build-walking-facts.ts` | `4866821dbcdfb0e7cd9f1c167eeb43d68e52ef848eb49e7506dff61bc3316c6e` |
| `test/historical-walking-facts.test.ts` | `a37f17f3b5d93f6fd775536600dff2cecd908eff71cb306a132dee4bc89886fe` |

## Reviewers and coverage

Codex worker `motion_review` independently reviewed the new producer, serializable types, CLI and tests. This reviewer authored the earlier source-lineage experiment, but none of these four candidate files. The lineage premise relies on the separate independent [Review 49](49_design.md), authored by `lease_retirement`, exact retained report SHA-256 `37cd449f6d81e2b4391437070de5a4cf61faba42bf19f5db0765de774d05eb97`; this round does not self-approve that experiment or rerun its generator.

Coverage includes external freeze and byte bindings, historical facts and filters, complete payload and roster comparisons, authored diagonals, helper compatibility, artifact-only output and errors. No second CLI reviewer, browser, GPU, network request, generator run, shared data write, install, full gate, commit or production wiring occurred. Root read the actual error controls and accepted F29. Private source copies and intentionally retained evidence are under this review's ignored `artifacts/` paths.

## Reports

### Codex independent reviewer

The source-facts mechanism is supported within its declared reviewed-input boundary. The expected lineage-freeze digest is supplied separately; all seven required members are checked against its exact hashes and lengths before interpretation. Inputs are copied synchronously. The producer verifies all ten non-provenance fields in full, retaining array and serialized object-field order, and permits exactly the reviewed two provenance differences. It binds the actual replay raw bytes, historical query body and recorded cutoff, response watermark and completion record, historical generator revision, old surfaces and normalized current helper source. It does not recover original raw OSM or infer equality of every original tag from graph equality.

The actual artifact keeps cutoff `2026-09-07T03:23:56Z` distinct from response watermark `2026-09-20T01:54:02Z`. It binds accepted network `314fac84…`, replay network `30a0c16a…`, actual historical response `e5e3f1ac…`, unrecovered original response `9923a9ae…`, and ordered complete payload `c5f3c338b4049cc2b7796af73ee952292578fca9235de3879c0510e0ade15288`. These bindings trace to the external reviewed freeze; a caller inventing a new expected digest has not obtained source authorization. The helper check is a compatibility check, with CRLF normalized to LF, not protection against hostile concurrent writers or a signing system.

An independent literal eight-row fixture verifies all five existing walkable classes, repeated way references, first-occurrence ownership, absent versus explicit-zero level, exclusion of unrelated tags and both exact authored diagonal records. A later admissible duplicate cannot rescue a first blocked or bare occurrence. Steps remain source facts only. The real CLI produced exactly 255,664 bytes, SHA-256 `e56babad1c2f687aac40313002e87f9e88b402839158031f2ad806f8f800c9b9`, matching the author's artifact. An independent loop over the historical first occurrences and accepted walk array checked every one of 1,740 ordered records: 1,738 mapped edges, 561 distinct ways and two authored diagonals. Neither that loop nor the literal expectation imports the producer's fact-selection helpers.

Types are readonly serializable data with no raw OSM or Node runtime import. The CLI is unwired from the application and production data scripts. It requires explicit arguments, refuses foreign/shared-data destinations, checks existing path components for links, validates before creating output and uses exclusive file creation. Actual controls preserve existing output bytes and refuse live and dangling junction paths without writing outside the private artifact tree. This is the stated synchronous filesystem boundary, not a concurrent-adversary guarantee.

**F29: the CLI's filesystem errors omit required recovery guidance.** The actual entry point on a missing lineage directory exits 1 with only `ENOENT: no such file or directory, open '<private path>/missing-lineage/freeze.json'`. A private partial bundle containing only its exact freeze similarly exits 1 with only the missing `accepted-network.json` path. The input is named, but neither output says to supply the readable matching reviewed bundle or includes usage. Both cases leave the output directory absent. The candidate catches and prints raw filesystem messages around its unwrapped reads, directory creation and exclusive write. This fails the local error contract even though refusal is safe.

The native dangling-junction control also safely refuses with bare `ENOENT` from directory creation; it neither writes outside the checkout nor supplies link/recovery guidance. A separate exact-ESM write-denial injection produces the same unhelpful result for `EACCES`. That third control is an injected `writeFileSync` error, not a native permission experiment; no ACL was changed. Its host-created error also retains an `Error:` prefix across the VM realm, which does not affect the missing guidance. The material finding rests on the two actual CLI missing-input outputs. The narrow repair is contextual read/output errors naming the affected input or destination and what satisfies it, with class-level controls. No new filesystem framework, source policy or validation relaxation is needed.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F29 | Missing bundle/member and output filesystem failures escape as raw OS text without recovery guidance. | Accepted by root as a bounded product-error contract defect. No source-binding failure, data loss or output-boundary escape was observed. | Separate CLI/error-test repair and focused Review 53; preserve this original 60-file target. |

## Verification

- Exact 60-file author freeze and all 17 watched source, network, scene and helper inputs matched before and after. All four reviewed source files remain exact. All 60 original files are retained byte-for-byte under `artifacts/review52/target/`; no source input was promoted into Git.
- Focused Vitest: 50/50 passed. TypeScript `--noEmit`: exit 0. The first restricted Vitest attempt failed before tests because esbuild could not resolve the config through the filesystem sandbox; the same permitted command then ran successfully. This startup is retained and is not counted as a product failure or passing test.
- Independent producer/CLI program: 37/37 planned cases executed with expected observations, including the literal eight-row oracle, external member refusal, first-occurrence filters, full real artifact, exclusive output and junction controls. Its first syntax-only attempt stopped before executing cases because of a missing fixture brace; that instrument source/error is preserved. Result SHA-256: `3e6e542dc909ec2aad37b91377ad6d459973257e586260189d77f404227b6b2d`.
- Six actual-byte controls independently refused: current raw under the historical freeze, current raw under a rebound private fixture freeze, the actual equal-count current-control network, a late diagnostic change, swapped final walk records and equal values with reordered payload fields. Rebinding is solely a fixture technique for reaching deeper checks. Result SHA-256: `1869d4d8790a6f42c7397cfc3ebb67bae790dede36e0e0151bec6f39504ee713`.
- Four frozen author mutant copies were independently rerun: removing the historical filter causes 10 test failures, row comparison 8, raw-source checks 1 and helper compatibility 1. The unchanged 50-test target had already passed and was never edited. Result SHA-256: `d62476e2acb183ebca9a54c7271049639ef0fbd5439648e0f0598794beecedcf`. Vitest rewrote four `node_modules/.vite` result caches inside the private mutant copies; the final preservation check identified those exact cache changes, retained them, and separately retained original author bytes. No author cache or candidate changed.
- Error controls: two actual missing-input CLI executions and one injected write denial, all exit 1 and all lack recovery guidance. `cli-error-result.json` SHA-256 is `07d77fc965aeb60bb7d432a5e632cdef7838d309bee094d1a61a01ade091e3fb`. Native missing-input refusals create no output parent. The native dangling-junction result is in the 37-case program.
- The work-docs checker still refuses inherited `docs/work/0_shibuya-1km/handoff.md`; that unrelated path was not changed. This report uses the six required headings and preserves both authored document targets. No runtime browser/server resource was created; test child processes completed and private junctions were removed.

## Round outcome

Reject this candidate for delivery until F29 receives its narrow repair and focused re-review. No material defect was reproduced in the facts, byte-binding, roster or bounded output-preservation behavior. That scoped support does not accept source-pair adoption, current mesh support, step locomotion, production walking, paint regeneration or city rebuilding. Root remains the integration and acceptance owner. Review 51 and the earlier frozen lineage/gait evidence remain unchanged.

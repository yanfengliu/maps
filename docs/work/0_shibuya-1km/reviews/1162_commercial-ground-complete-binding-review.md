# 1162 — Complete binding and calibration review

2026-10-15 UTC. **HOLD: repair cache/restoration and instrument integration.** This independent static review covers immutable1160 only. Root closed the pending1163 review dependency before sealing; no1163 bytes or execution are claimed. The observed1160 result remains aggregate FAIL from the duplicate `plan` declaration, with all237 semantic rows DID_NOT_RUN and all45 entry/finally pins unchanged.

| Finding | Exact source witness and minimum correction |
| --- | --- |
| F1: cached success can bypass changed source/context facts | `registry-cache.mjs:8–9` omits `face.isCap` and room `floor.origin.plan`; `native-domains.mjs:5` returns before the checks at31/33. Warm an actual context, clone one cap with `isCap:false`, or replace one room's floor association with an unmatched plan. The key stays unchanged although a cold build must refuse roof membership or room continuation. `binding-calibration.mjs:6` also uses that incomplete key as restoration proof. Remove registry reuse; replace the restoration signature with an independent complete state projection, including cap roles, source/node/height/output/material facts, generators, room associations and audit sources. Retain source-freezing utilities as needed. A retained cache instead needs complete dependency/closure equivalence, not only these two added fields. |
| F2: early-context control bypasses orchestration | `binding-calibration.mjs:56` calls `fail(namedError())` directly after context construction. Make the existing `ledger/early-context-failure` arm throw before collection through the bootstrap's actual shared catch/finalization path. Require one designated FAIL and236 DID_NOT_RUN, then rebuild the same restored context in a separate arm. |
| F3: pin control tests its own implementation | `binding-calibration.mjs:62` computes its own hash mismatch and already fails the child. It never tests `calibrate.mjs:14–16`. Exercise the same finalizer used by bootstrap on an owned copied input. Retain the early-error arm and add an otherwise-green arm whose changed pin prevents success; restore bytes and verify the clean arm. |
| F4: unexpected failures can lose control evidence | `binding-calibration.mjs:13,30,35` saves mutation/refusal/restoration details only on successful return. Capture exact before/after targets and intended/observed errors before assertions, and restoration in `finally`. Preserve both the primary error and any restoration error durably. Do this in the shared control harness, without changing237 IDs or targets. |

For F1, extend `binding/roof-source-omission` with fresh-validation and prewarmed `isCap` arms while retaining its original deletion-from-both-lists control. Extend `binding/room-unfilled-claims` with the room-floor association arms while retaining truthful logical-sheet assertions. Each arm must mutate the same complete actual context, identify the intended error, restore an independently captured baseline and rebuild485 domains/3157 registered sources. Removing reuse makes every rebuild fresh; retain repeated-before/after ordering to catch future reintroduction. These are required future controls, not executed results.

The remaining1159 implementation has the required static structure: directed whole-facet matching separates19/319; source-normal and occupied-side checks, generator-derived complete box/lower facets, independent ceiling, four exact aliases and retained clipped roof membership are present. Duplicate source/node/output joins refuse. Both actual constructor and retained calibration supply source authority; synthetic controls deliberately omit it. Six assembly bindings match runtime material/radiance/shadow construction, including cladding casting shadows. Logical rooms remain unfilled. No additional actionable material, height, normal or call-shape blocker was found within this bound.

| Complete body/target population | Static coverage |
| --- | --- |
|125 fixed |48 cutter +12 classifier +6 prior +28 door +31 native bodies |
|39 lower | Exact immutable generator IDs; four aliases10–13 and35 dedicated continuations |
|42 region mutations | Seven independently pinned regions:2774×3,2775×3,832×1; six mutations each; normalization preserves harmless subdivisions |
|31 added controls |24 binding +7 ledger; F1–F4 above remain material |
| Durable accounting | Closed plan precedes helper import; exact-set/status reconciliation and finally pin checks are present; observed import failure confirms237 DNR |

The packet maps every exact ID/target to its source body and pins the portable module and plan. No helper, Node, geometry, calibration, constructor, browser, server or GPU ran in this review. Metadata validation is separate from semantic evidence. Root1164 selected and dispatched the cohesive repair; implementation and verification are not claimed. Its frozen revision needs fresh review before root authorizes the single ten-second calibration. Uncached timing is unknown; a timeout or incomplete vector remains HOLD.

1157's complete selected roof-union boundary/contact-star certificate remains separate. Same-domain incidence and opposed support do not establish it. All source/frame/tolerance/residual/material-policy, emitted geometry, main upper, lifetime, public/native visual, integration/main/push/cleanup and full35 obligations remain open and unchanged.

| Authority | Bytes / SHA-256 |
| --- | --- |
|1162 scope |6464 /7e30b9a046c46746c33a20bc0b2325c233795a341da369879d8db3d61809b0fd |
|1160 manifest |87738 /eda723986dd717a7b590a07c76b82c18e9e573b4b30927776e0e0b1059ec7614 |
| Portable recorder |7380 /606e661928df0bf8562d06f6735dd63dc5e89eefdc89075000300b3b62a1eaae |
| Immutable237 plan |103323 /4364f78a45df699df2c77042e5e458e254ba48489cc589bb53c97fd4ffed40aa |
| Root1164 selection, dispatched only |7605 /225af130fe0e8e590a677d4bb93f4e68b6127e836824470d261496de1cff0d47 |
| Complete input/body map |1162 manifest.json, input-index.json, case-coverage.json and static-analysis.json; report pinned separately |

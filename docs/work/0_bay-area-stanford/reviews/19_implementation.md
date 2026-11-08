# Review 19: implementation

## Target

Repository maps, exact revision `1718f7257e468239f4c5675492727e9cd93ab6e8` against `fca2ba28ef91e48bd6f81e7234ffab22af1af94e`. Scope: researched Memorial Church interior, two-draw mode swap, photograph resources, navigation and mobile controls. The reviewer confirmed a clean tree and unchanged HEAD throughout. Root's subsequent F43 repair removes one caption assignment and adds three cross-handler navigation regressions; broader implementation bytes are unchanged.

## Reviewers and coverage

Independent GPT-6 Astra at xhigh, pinned by the fleet review runbook, read the implementation, tests and surrounding code, ran focused tests and inspected full-resolution owner captures against the reference photographs and plan. No browser/server was launched by the reviewer. Browser interactions, production checks and performance measurements below are root evidence, not independently repeated interactions.

## Reports

The reviewer reported no substantive P1/P2 findings.

F43 - P3: Interior exit overwrites the Bay overview caption. At src/main.ts:233 in the reviewed revision, setChurchInterior(false) unconditionally assigns the Stanford caption. Trigger: enter the church, then click Bay Area. overview() first assigns SAN FRANCISCO BAY AREA, then calls closeDetails(), which exits the interior and overwrites it. The regional camera and campus mode recover, but the caption incorrectly remains STANFORD UNIVERSITY - 3D CAMPUS. Independently reproduced by executing those exact source functions with mocked map/DOM: overviewFitCalled=true, interior=false, caption still Stanford. Let navigation callers own the caption; check overview, city search, and exterior return after the fix.

Independent checks performed: read the full changed implementation and tests, plus surrounding navigation, selection, loading/retry, worker, GPU upload, and native visibility code. Reads outside the diff included src/main.ts:116, src/building-details.ts:267, and src/quad-arcade-visibility.ts:9. Ran all 18 focused interior, mode, and texture tests using Node 24.12.0; all passed. Reviewed cancellation guards, late worker/decode results, partial uploads, disposal, texture binding restoration, and mode/context recovery.

Recomputed interior geometry: 51,231 triangles, 7,992,036 geometry bytes, and 15,124,196 bytes including the two decoded textures, below the 24 MiB limit. Source data remained unchanged; the diff contains no public/data changes.

Inspected all six final desktop/mobile captures at original resolution, plus the random-bearing capture. Compared them with the official plan, nave/chancel photographs, and detailed arcade/organ references. The principal layout and distinguishing features are recognizable; the final mobile whole-church framing fits. Read recorded browser control/recovery evidence. Reviewed shipped photograph attribution, source/license links, and disclosed adaptations.

Minor visual limits: carving, gallery seating, organ pipe counts, and photographic perspective remain approximations, as disclosed. The retained east wall shows a plain reverse face from opposing views; the intended cutaway views remain usable.

The reviewer did not launch a browser/server or rerun expensive full gates, per scope. Browser results are inspected owner evidence, not independently repeated interactions; performance and production checks remain with root. The supplied final logs did not show a ceiling-checkbox interaction, so the reviewer requested an actual-control on/off confirmation before acceptance. No files were edited or resources left running.

## Owner dispositions and verification

F43 is fixed by removing the low-level caption assignment and leaving destination names to navigation handlers. Root reproduced the bug in the production browser and in the new test executing the actual overview, goTo, closeDetails and setChurchInterior handlers with external map/DOM effects mocked. The overview case was red before the fix; all three destination transitions pass after it. The subsequent real-control production check verifies direct interior-to-Bay, interior-to-San-Francisco search and church exterior return. This minor follow-up was owner-verified without restarting the substantial review.

Root also checked the final ceiling-structure checkbox on and off in the production build and inspected both captures. Node 24.12.0 build, typecheck, 103 tests and audit pass; audit finds zero vulnerabilities. The existing MapLibre chunk-size advisory remains. The Node test runner reports its stripTypeScriptTypes experimental API notice for the source-handler regression; no dependency was added.

Headless Chrome on RTX 4090/ANGLE D3D11 at 1600 x 1100 exercised regional startup, church search/entry, all four view buttons, exit/re-entry, random compass rotation, held-key pan, real graphics loss/restoration, missing-photo HTTP 503 with working Retry, and production loading. Phone checks use 390 x 844 and corrected whole-church framing. The map's read-only observer returns the original 648 buildings / 159,747 triangles / 24,920,532 bytes after exit, with zero photo texture bytes. Apart from the deliberate 503 and expected context-loss warning, application error state clears; no page exceptions were observed. A QA-only HTML harness requested graphics loss/restoration through buttons; its absent favicon returned a harmless 404. Production checks have no such harness.

The production held-key burst contains 364 motion frames, with p50 4.2 ms, p95 4.4 ms and maximum 4.8 ms intervals; this is a bounded desktop measurement, not an all-device claim. Interior loading used about 59-75 ms worker build and 37-41 ms upload wall time, with observed main-thread maxima up to 5.6 ms. All raw evidence and the visual gallery are retained under ignored artifacts/church-interior-20261107/output/. Exact source references and unmodified photographs remain beside it under references/.

## Outcome

Accepted with F43 closed by root and the disclosed visual limits. Main delivery, remote CI inspection and owned-resource cleanup are recorded in the plan and design after they complete.

## Findings and disposition

Formatting correction, 2026-11-07: the original record above used "Owner dispositions and verification" and "Outcome" rather than the allocator's required section names. Its report, dispositions and acceptance text are preserved unchanged. F43 was accepted and repaired in 93d47facbcc2125151308b40f1dd1fb98543ae9e as described above; no finding is added or reclassified by this correction.

## Verification

The original "Owner dispositions and verification" section above retains the actual checks, red/green caption case and limits for this round. This format correction adds no new technical verification claim.

## Round outcome

The original "Outcome" above remains the round conclusion: accepted with F43 closed by root and the disclosed visual limits. Delivery documentation is 7f49891c8ac9931041ecae2d0a6abcbedab1ee5d. This correction only makes the existing conclusion visible to the work-document checker.

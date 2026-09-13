# Review 8: implementation

## Target

The extracted bounded C5 pavement producer and its ordinary `data:pavements` / `data:scene` entrypoint wiring in `maps`, based on main `279908488a29bd729e78656dade259638b98a669`. The review target is `artifacts/recovery-realism-20260908/pavement-producer-review/manifest.json`, SHA-256 `14d88e56b5c736249f45db014cac975e640ead698d4b5594337865345a2cad71`, with 48 copied source/test/config/document files, nine retained evidence files and seven raw input bindings. The independent reviewer preserved the exact delta from that base in `artifacts/agents/pavement-review8/review-target.patch`, SHA-256 `129db925b7c838de34b6282bf199648ba0f7fd4a9c55d9566d7a139ec443af29`, including untracked inputs. The copied files and patch are intentionally retained ignored evidence.

The principal source is `tools/scene/pavement-recipe.ts`, with `pavement-hero.ts`, `pavement-lower.ts`, `compose-pavement.ts`, source selection and geometry helpers. The review includes the writer, both build entrypoints, their local dependency closure and focused tests. It checks reproduction and harmful integration failures within this extraction. It does not reopen the accepted C5 layer design, accept every city surface, admit pedestrian support, or accept new native pixels.

## Reviewers and coverage

The asset worker (`/root/status_evidence`) performed an independent read-only review of the pavement author (`/root/realism`). The reviewer had the frozen source, raw local inputs, generated evidence and repository tests, and had not implemented the pavement producer. Review activity wrote only isolated ignored evidence and this allocated report. No live source or scene data was changed, and no browser was launched.

The reviewer inspected the input bindings, raw-source reads, source ownership, hero/lower composition, output writer, ordinary command wiring, geometry cleanup and test bounds. A fresh production-function replay rebuilt terrain and roads in the same call order as `data:scene`, then ran the complete frozen pavement recipe and writer into an isolated output directory. The unrelated building stage, full application entrypoint and 44-frame visual gate were not run. This is independent review of this producer scope, not independent review of the reviewer's pedestrian/vehicle work.

Root accepted the scoped review outcome subject to reading this authored report and its exact replay evidence. That owner disposition is separate from the substantive reviewer report below. The prior CLI lanes produced no usable review in this task: Claude authentication had expired, and Codex's sandbox transport failed certificate validation. No CLI report is represented as approval, and no bypass was attempted in this round.

## Reports

### Asset worker: independent producer review

No new material finding was identified in the frozen extraction. Both ordinary entrypoints call the same recipe. `data:scene` passes the bytes just built by its terrain and road stages; `data:pavements` reads the corresponding scene meshes. The fresh replay independently confirms that the ordinary terrain and road call order reproduces the recipe's exact input pins. The producer reads raw road/bridge CityGML and built ground/road meshes, without using recovery artifacts as production inputs.

The seven source bindings restrict the recipe to the reviewed source/layer interpretation. Changed terrain or road bytes fail before source processing, and changed raw road/bridge files fail before publication. The two hero parent IDs are required. The lower recipe requires the exact reviewed LOD3 polygon and bridge/polygon IDs, rejects duplicate/missing or changed structural input, preserves the source plane only in the proved bridge clip and retains the unclassified remainder. It does not infer lower-passage authority from height alone. The raw source publication remains separate from the rendered support interpretation.

Composition replaces only the selected hero and proved lower footprints. The exterior uses the previous adaptive geometry and source-triangle height interpolation; the mesh pool includes full XYZ and normal identity. The fresh full-file result matches the accepted C5 presentation, so this extraction introduces no changed rendered positions, normals, indices or exterior footprint relative to those bytes. Its lower classification is 20.420386275799938 m², with 0.0000577131588691888 m² explicitly unclassified and an area residual of 2.2167758216085423e-13 m². The replacement ledger records 392,678 unchanged triangles, 1,949 clipped triangles and 20,336 removed triangles before adding the declared replacement geometry.

All recipe computation and the 16 MB / 500,000-triangle budget checks complete before the standalone writer changes output. The writer touches only its three outputs, and the scene cleanup preserves sibling agent, vegetation and future files. Publication is three sequential filesystem writes, not an atomic multi-file transaction; an I/O interruption can leave partial output and requires a successful rerun. The full scene command also rebuilds its owned geometry destructively before later stages finish. Neither operation claims live hot-reload consistency or rollback, and this review does not grant such a claim.

The retained strict support result remains red: 6,757 sampled points, 17 tiny source-boundary misses, three exterior-road boundary observations and zero undefined terrain samples. Exact reproduced bytes do not change that result. The previous precision analysis classifies those observations within its stated source/Float32 bounds; it does not establish a strict pass. Its interior missing-region and lowered-surface controls remain recorded as failures. This round did not rerun or independently expand that earlier support classification.

The review found no reason to alter the accepted source/layer policy as part of this extraction. Future citywide support, populated motion, materials and final 44-frame acceptance remain separate work. The producer's exact current-source pinning deliberately requires renewed review when an input changes, rather than silently accepting a new public-data revision.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| — | No new material finding in the frozen bounded producer extraction. | Reviewer recommends acceptance of this exact scope. Root accepted the scoped outcome pending its read of this report and replay evidence. | Root final inspection; later integration must retain the source binding and scope limits. |
| — | Existing strict support probe is red outside the accepted interior/precision scope. | Preserved limitation, not relabelled as a pass or a new extraction defect. | Whole-city support and final populated acceptance remain pending. |

## Verification

Fresh reviewer evidence is under `artifacts/agents/pavement-review8/`. All 64 target entries, evidence files and raw input hashes matched before replay. A separate check confirms all 48 corresponding live source/test/config/document files matched their frozen bytes during the focused tests.

`node --experimental-strip-types artifacts/agents/pavement-review8/run.mjs` invoked the frozen production terrain, road and pavement functions. Terrain and roads took 2.180 seconds and matched `fef57d0960c3d08c5d31f0f56f64cff3b046b6d577b36473b7c046295249b381` and `3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490`. The pavement recipe took 17.889 seconds. Its mesh matched SHA-256 `5d2a915047b0e8719e624f14f600c81c0a6c6342c4e8ce5b383bdfa987bcbc24`, exactly 12,974,860 bytes and 461,912 triangles. The source publication also matched `ab6a66b4da3fda3b0f3e60853f468fd203fd76bc92c56fdaa1d9a5a0dbdd58ea`. The isolated writer produced all three outputs. Live pavement mesh/source bytes and the still-absent live recipe report remained unchanged. An initial reviewer preflight incorrectly assumed that not-yet-published report existed; it stopped before the build and was corrected to preserve an absent file as absent.

`node node_modules/vitest/vitest.mjs run --configLoader native test/pavement-recipe.test.ts test/pavement-overlay.test.ts test/pavement-precision.test.ts test/pavement-source.test.ts test/scene-cleanup.test.ts` passed all 13 tests in five files. These exercise transverse interior road support, missing terrain/parent failure, partial lower classification, exterior preservation, stacked XYZ identity, changed-input rejection, source selection, overlay/precision cases and sibling-output preservation. Node was 24.12.0, within the pinned major 24. The producer author's recorded typecheck pass was inspected; this reviewer did not rerun unrelated combined typechecking.

The earlier three seam rays, strict probe and interior mutation controls were inspected as retained author evidence bound by the target manifest. They were not counted as fresh independent reruns. No full `data:scene` building rebuild, live standalone publication, browser, native image replacement, 44-frame gate, dependency audit or population performance run occurred in this round. No task-owned browser, GUI or server process was created or left running.

## Round outcome

The independent reviewer recommends accepting the frozen C5 producer extraction within its stated reproduction and integration scope. It reproduces the reviewed presentation through production functions and has no newly identified material defect. Root's final read of this report and evidence is still required before integration. This is not final Shibuya acceptance, whole-city support acceptance, or permission to inherit the review after source changes.

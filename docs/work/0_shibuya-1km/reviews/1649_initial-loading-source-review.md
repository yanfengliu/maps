# Review 1649: implementation

## Target

Startup loading change against main `464fdc03d4c0fbda7b6f84461c17d1f719665905`, isolated `codex/initial-loading` worktree. The final candidate changes only `src/scene/buildings.ts` and `test/rail-runtime.test.ts`. Raw SHA-256: buildings `bd627466cf309a998db93849bee5cf5b64072e117ad994aac00aa7097d37d683`; test `191ff1ec0b734060169f025643da605b84b190eeb33e87df8027c24eb70dadc1`. The retained uncommitted target is `artifacts/initial-loading-20261018/leaf-only-final.patch`; final integration must bind it to the main revision before cleanup.

## Reviewers and coverage

Independent read-only reviewer `startup_review` inspected the actual production constructor, installed Three/tiles library and executed renderer bundle, cached hierarchy, display/readiness/lifecycle paths and the regression fixture. No reviewer browser, server or gate was launched. Root owns measurements and final integration with the separate first-person change.

## Reports

### startup_review — final two-flag source and fixture

Focused final source/test review — GO, no material findings. Base `464fdc03d4c0fbda7b6f84461c17d1f719665905`; exact buildings.ts SHA `bd627466cf309a998db93849bee5cf5b64072e117ad994aac00aa7097d37d683`; exact rail-runtime.test.ts SHA `191ff1ec0b734060169f025643da605b84b190eeb33e87df8027c24eb70dadc1`.

Both public flags false close distinct eager-ancestor and off-frustum sibling-ancestor queue paths; existing complete 44 warmup, ERROR_TARGET 0, 640–768 MiB and whole-city hide preserve the leaf-detail boundary. New 48 lines reuse actual createBuildings plus installed traversal: synthetic 44-leaf hierarchy with western-frustum/eastern-outside 22 + 22; 43 held/readiness false, all 44 requests, zero three coarse requests both before and after warmup, successful nonempty west-only visibility, and missing 44th refusal. Expected sets derive from the fixed declared fixture, not the flags; no mirrored false assertion. Actual decode/GPU/pixels/performance remain outside the CPU test bound. Execution, both mutant RED results and measured gain were pending at this source review. The reviewer launched no browser, gate or CPU test.

### Earlier findings and corrections retained

The initial async shader idea was rejected before implementation: installed Three compilation depends on clipping, render-target and light state, and its polling has no cancellation before material disposal. A subsequent street/hardware overlap prototype was coherent after its disposal guard was fixed, but its ordinary timing showed no reliable gain: baseline 13.492/9.376/9.067 s versus candidate 13.634/9.077/9.190 s. All-leaf preparation moved later, so root rejected that source and restored the original app. Its first boot arm failed from an initialization-order error and is not timing evidence.

The reviewer's first one-flag reading that all ancestor preparation was removed was too broad. Actual production still queued seven off-frustum coarse siblings with `loadSiblings=true`. The one-flag synthetic coincident-frustum fixture proved only its declared topology. The final two-flag review above supersedes that universal-absence claim and adds the missing off-frustum topology. The one-flag receipt reached full leaf readiness but failed its mistaken total-model-count assertion; it is not a latency qualification pass.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F0 | Overlap moved CPU work earlier without a reliable startup gain. | Accepted; prototype rejected and app restored. | No overlap change enters the final patch. |
| F1 | One flag leaves sibling-driven coarse requests; its first fixture missed the off-frustum topology. | Accepted; final source disables both documented policies, retaining forced full-leaf warmup. | Final fixture includes both sides of the frustum; separate omission controls must fail. |
| F2 | Total model count was wrongly used to qualify a one-flag timing arm. | Accepted; failed arm retained, no latency pass transferred. | Final timing must observe complete 44-leaf readiness first and separately record model/request counts. |

## Verification

Independent source and fixture review passes within the stated bounds. The worker executed 39 focused tests and the type check successfully. Restoring only `loadAncestors=true` makes actual traversal request all three synthetic coarse tiles before the 44 leaves complete. Restoring only `loadSiblings=true` requests the off-frustum coarse-east tile after warmup. Each control fails at its intended request-set assertion; exact source restoration returns all 39 tests to GREEN. Staged whitespace and no-unstaged-change checks pass for the two source paths. The control receipt is retained under `artifacts/initial-loading-20261018/worker-evidence/final-flag-red-controls.json` after evidence transfer.

Ordinary default-page, unprofiled observations on the RTX 4090, driver 616.64, compare the unchanged old-base app with only the reviewed loader settings changed. Three fresh contexts in a fresh browser have observed ready upper bounds 13.492/9.376/9.067 s before and 12.493/8.088/7.967 s after. Polling intervals overlap, so this establishes consistently lower observed upper bounds and removed work, not an exact first-visible event latency or speedup percentage. First-in-browser and later-context results remain distinct. Every candidate run prepares the exact same 44 leaves, with 44 total models rather than 67. Decoded cache use falls from 651,400,435 to 477,908,062 bytes, 173,492,373 bytes (26.63%) less; this is not measured whole-process GPU allocation.

Drawn mesh/triangle counts, bounds, visible/required/loaded leaf URI sets, section/connector and rail replacement observations match the baseline in each run. Inputs remain unchanged, no product errors are reported, all six cleanup flags are true, and the task browser marker and port 4348 listener are absent. These observations do not replace native visual review. The final combined first-person app differs from the benchmark app; any gain from that separate change is not attributed to these flags. The shared primary five-gate run, native acceptance and exact main revision remain separate integration requirements.

## Round outcome

GO for the reviewed source and executed fixture. The candidate removes unused preparation and has lower observed ready upper bounds under the stated benchmark conditions. Final combined five gates, native acceptance and main integration remain required; this source review alone does not establish exact latency or full-deliverable acceptance.

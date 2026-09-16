# 1km x 1km animated Shibuya model

Status: active
Owner: root orchestrator
Created: 2026-09-06
Updated: 2026-09-15

## Problem and outcome

Build a roughly 1 km by 1 km model of Shibuya, Tokyo that runs in real time in a browser, leans photoreal, and has pedestrians and vehicles moving through it.

The area of interest is a 1 km box centered on Shibuya Scramble Crossing at 35.6595 N, 139.7005 E, which gives 35.6550–35.6640 N and 139.6950–139.7060 E.

That box covers Hachikō Square, Shibuya 109, Center Gai, Shibuya Scramble Square, Miyashita Park and lower Dōgenzaka.

The deliverable is judged by what the rendered frames look like and how the scene behaves while you move through it. A green test run is not evidence for any of it.

## Scope

Included: everything in the eleven phases under Implementation steps, from the toolchain and its visual gates through data, pipeline, static scene, materials, lighting, the shared network graph, vehicles, pedestrians, performance and acceptance.

The owner's 2026-09-08 scope adds two switchable 3D world styles: Cartographic, inspired by the clean default Apple Maps view with finer scene detail, and Satellite, improving the existing phototextured world. A World style dropdown draws its options from an extensible registry. Both styles share the same world geometry, simulation state and camera; changing style preserves the current camera and running agents. This is an appearance choice within the Shibuya deliverable.

Excluded, and these are non-goals rather than deferred work:

- Not a map viewer.
- Not a navigation or routing product.
- Not a survey-grade reconstruction of the real place.
- No second location. Nothing past this deliverable is decided.

Ownership boundaries inside the work:

- Phase 0 blocks everything. Nothing else starts until the scaffold, the Playwright visual harness and the `Gates` section exist.
- Phase 6 produces a shared contract. The lane, sidewalk and crossing graph plus the signal phase model is the interface both agent workstreams build against, so it must be documented and frozen before Phases 7 and 8 run in parallel.
- Phases 4 and 5 are where the deliverable is won or lost. Treat them as the main body of work, not as polish after the geometry lands.

### Current delivery status and ownership — 2026-09-13

The root orchestrator owns scope, shared contracts, canonical status and final acceptance. Implementation and independent review run in bounded worker assignments. The approved goal is the whole Shibuya deliverable through Phase 10, with autonomous goal mode across the managed work. The owner instructed the team to continue until it is done, overriding the default automatic-repair cap for this scope. This adds no second location or product surface.

| Scope | Current state | Owner and dependency |
| --- | --- | --- |
| Phases 0–3 | Complete on main at `277a8332e61bd29189fa65eae7271f952b04df33`; the recorded five-gate and eighteen-frame acceptance belongs to that baseline. | Root orchestrator preserves the baseline and its evidence. |
| Phases 4–5 | Scoped C5, C6, C7b and C9, plus F8/F10 appearance evidence remain retained; no graphics code is committed. Review 24 accepts only the eleven-path facade source increment and CPU material preparation. Review 25 resolves F17–F20 within the B0 diagnostic contract. Native facade compilation/appearance, city build binding, ordinary 15-second navigation, 60-second replacement readiness and the full 44-view gate remain pending. | Renderer worker implements and verifies; root orchestrator accepts the integrated result after independent review. |
| Phase 6 | Review 5 accepted F5 boundary lifecycle and the 11.6 m supported-body contract, retaining F4 interior safety. The reviewed network milestone is on main at `1ca4552ceee25e34ac62335114bbb5377a4d6470`, with all five gates and eighteen native baseline views accepted. Both running population consumers remain pending. | Network worker owns the accepted graph/admission API; root orchestrator accepts future integrated traffic. |
| Phases 7–8 | The finite one-vehicle app and CPU visibility repair remain unintegrated; the ordinary run was canceled after eight cases/56 frames for moving-view building occlusion. Actual draw/upload/TAA feasibility is separate from live visibility or pixels; full 18-execution/126-image acceptance remains pending. The gait selector retains its 43-case 240 Hz and sampled 60 Hz acceptance, and Review 18 accepts the reusable evaluator only for finite CPU position correctness. Production gait, between-tick contact, naturalness, terrain/LOD and population behavior remain unintegrated. | Network worker owns simulation mechanics; asset worker owns source provenance, geometry, animation and rendering; root orchestrator accepts shared contracts. |
| Phases 9–10 | Reviews 20 and 22 preserve the ABBA instrument findings and resolved F15/F16 preparation repair. Review 26 independently accepts the finite negative result: about 263.45 ms versus 103.10 ms for mean same-tick kernel arm medians, a 2.5553× slowdown. Prior correctness survives; the intended cost reduction is rejected and its cause is undiagnosed. Twelve repeated streams and validation-heavy CPU measurements do not establish heterogeneous population or whole-scene performance. | Root orchestrator owns measured performance, whole-deliverable acceptance and merge to main. |

The target already pinned in `src/world/frame.ts` is 3,000 animated pedestrians and 200 vehicles at 60 fps and 1920×1080. It is an acceptance target, not a measured result. Completion requires every acceptance criterion below on the final integrated revision, all five repository gates, native-resolution inspection of the rendered sweep and controls-driven moving sequences, independent review with material findings resolved, and merge to main. Work left uncommitted or on a branch is incomplete.

Owner disposition, 2026-09-12: root accepted [Review 8](reviews/8_implementation.md), SHA-256 `58bdd2d4846a8523b22220ab538cbf62e5f5a6dd26731ff70e905d2966a198c9`, after reading its independent production-order replay and verifying the seven handoff files and rebuilt mesh/source hashes. Acceptance binds producer freeze `14d88e56b5c736249f45db014cac975e640ead698d4b5594337865345a2cad71` and the exact C5 pavement, not a new support policy. The original 6,757-probe strict failure, three unchanged passing seam rays, retained source heights and unclassified regions remain explicit. Later geometry changes require another review. The authored report is unchanged.

Owner disposition, 2026-09-12: root accepted C9 manifest `f0925ce615b2548a29de5a88fb2082661718cfb0c82ff3188bd51e99fdb8420a` as the current lighting increment. Environment chroma retention is 10% above 10° solar elevation and 45% below −3°, with a smooth transition. This is authored grading; albedo, exposure and texture budgets did not change. Its 80-input manifest omitted several transitive harness/config paths before capture, which were recorded afterward and cannot inherit pre-run binding. Final candidate verification must bind the complete source/build/data/harness closure before and after the run. C9's eleven retained process identities exited naturally; fallback termination was not exercised.


Owner disposition, 2026-09-12: main is `d3699133aa9185543fdfc51997f76385be011285`, the reviewed documentation checkpoint for reports 8, 9, 10 and 13; its parent is `2799084`. The isolated graphics candidate deliberately retains base `2799084` and imports authored history as an explicit document delta. Root accepted Review 12 F9 within its source/support bounds after checking 85 reviewer and 94 author pins and 36 focused tests; populated raw-V4 motion is still unverified. Review 11's 190-input standalone/hardware copy has no new finding. Neither proof closes the full simulation or performance criteria.

Owner disposition, 2026-09-12: F10 source and native acceptance binds `artifacts/graphics-milestone/f10-followup.json` (`68dd6ce33865c61eb717725b82f94d5d803f40cc33668ffd3a5d7421aff59ca7`) and the eight-frame hero manifest (`6a2390d0a6d5cc0adaa867a49f2bac8bdae4b7c291c39c48f591036ff83b018f`). Root inspected every original 1280×720 frame. The central diagonal is continuous; omitted endpoint parts 0, 44 and 45 are not material in crossing/approach views. Off-centre way 1419311959 is triangle-gated, not close-viewed. Of 1,333 total paint parts, 1,158 are placed and 175 explicitly omitted across 75 features; all 100 features retain paint. The 28 paint-only seam queries do not alter network or pedestrian/vehicle support. Final 44-view surrounding appearance remains pending.

Owner disposition, 2026-09-13: [Review 15](reviews/15_implementation.md) is on main at `e93dfa9c3aca45526ad8cee31caaaf876b33fca8`, following the Review 14 checkpoint `7ec174246983d4122bd60ab1c46ada04d55709ac`. Root and the independent reviewer each passed 44 response and 110 completion controls; the reviewer also passed six actual serializer controls. Acceptance covers authentic result-artifact consistency. The old v3 failure was response-body evidence collection, not a demonstrated failure of its one observed vehicle flow. Review 11 remains open, with the full 44-frame graphics gate unfinished.

The separately reviewed capacity correction completed one headless A/B run, bound by `artifacts/network/app-motion-native/observer-capacity-r1/run-02-evidence/handoff.json` (SHA-256 `31a2bdd5fe667449d3a6fc218e7540f411a217c72582bf9885349f8b8fb34db9`). The same dedicated CDP collector, two JSON files and HTML were used in fresh sequential browsers. Default buffers evicted both large JSON bodies; expanded parameters verified all three exact responses. Both pages consumed the two expected files. All 7,202 source/runtime input records stayed unchanged and fresh cleanup found the observed processes absent with port 4319 free. This demonstrates that finite two-input comparison, not the prior Playwright response-body path or the full-city concurrent request pattern. Eighteen completed vehicle executions remain required.

The earlier rejected walk initialization experiment and stepping erratum are retained at `artifacts/agents/gait-cycle-spawn-fix/report.md` (SHA-256 `7d1c2f0191ca5e742fc3fc39d8cb264193ac1340c6007498561c437b95a56e9b`) and `erratum-stepping.md` (`3b5a526cfd3885ec84106531b7402b3636326e2ea406000078f44b6095443726`). The selected flight removes the original derivative mismatch, but discrete duration selection causes 32.4/48.6 mm placement jumps at 2 m/s across phases 0, 0.5 and 1. Eleven cases and 34 rows of a twelfth completed, totaling 837 observed rows; 31 cases never ran. The ongoing prediction is 38.291045259 mm plus a 3 mm margin against the unchanged 35 mm cap, although the current retained pose remains valid. The experiment is rejected. Its 240 Hz belongs to the unintegrated pilot corpus; production's fixed step remains 1/60 second. No production gait or populated acceptance follows.

Owner disposition, 2026-09-13: the preceding canonical checkpoint is `636bff7dca10f00dc3ada892ebb7005cfa815c92`. Root accepts the finite gait progression and cost reviews preserved in [Review 16](reviews/16_implementation.md), and the bounded CPU visibility repairs in [Review 17](reviews/17_implementation.md). These document-only records do not integrate their ignored candidates. Review 11 remains open; no missing round or whole work-docs continuity pass is implied.

The current gait candidate is controller `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`. Independent execution completed 43 cases and 18,523 rows at 240 Hz, then 43 cases and 4,663 selected rows at 60 Hz with exactly 4,620 updates. The latter does not observe the 13,860 omitted rows or between-tick poses. Seventeen successful decisions omit some rejected-successor diagnostics; selected-pair evidence remains intact. Naturalness, arbitrary future commands and production integration remain unaccepted. The phase-independent initializer and its ongoing failure are preserved as an earlier, separate target.

The independently reviewed cost experiment measured complete 3,000-agent batches over 120 ticks after 12 warmup ticks. Median/p95/maximum is 3.315 / 13.221 / 23.009 ms for A updates, 96.988 / 109.623 / 133.123 ms for B poses, and 101.412 / 120.269 / 144.613 ms for same-tick update plus pose. A/B equality covers the emitted 19-double state projection only. Palette byte counts are cumulative materialization, not resident memory. Twelve synchronized streams repeated on one flat-ground rig do not establish heterogeneous or whole-scene performance; the 3,000-pedestrian/200-vehicle target remains unchanged.

The canceled ordinary vehicle run is retained at `artifacts/network/app-motion-native/observer-final/run-01-owner/partial-handoff.json`, SHA-256 `003bc8127b48ff9aa60005c1e17213750371b91cc54a3b7b9b5fb5ede742c55e`. Root viewed complete building occlusion in incoming-kei-side1 and bend-kei-side0 moving frames while the old speed/rendered-count predicate passed. F13 now refuses visible unknown deformation before static-box exclusion; F14 binds wheel samples and first hits to the exact target instance. The 1,200,000-test CPU variant completes the retained 60-ray request, but all source replays remain unsupported without actual draw membership, interpolation and UI metadata. The prior 500,000-test refusal is retained, and no pixel acceptance follows.

Owner disposition, 2026-09-13: the preceding canonical checkpoint is `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`. [Reviews 18–23](reviews/18_implementation.md) preserve six separate authored rounds in sealed timestamp order. Root accepts the finite evaluator correctness, retirement and tiny preparation scopes, and the focused ABBA F15/F16 repair. F17/F18/F19 from the original B0 city instrument remain open pending a reviewed successor. These are documentation and ignored preparation milestones, not a graphics or simulation code merge. Review 11 remains open and the grand goal remains active.

The retirement helper now has independent CPU ownership/API evidence and a separately observed 64×64 real-extension delivery/event. The tiny run's added outer reporter failed; its historical closure ledger is missing despite later fresh observed process/profile/port closure. Neither that small-context observation nor the screenshot-disabled negative run proves native memory reclamation, whole-city disposal, the unchanged 15-second navigation or 60-second replacement check. The full 44-view graphics gate remains unavailable.

The reusable gait evaluator matches the original finite position contract with all 43 sampled cases, full-state/input nonmutation and retained destination/source checks. Its initialization/update controller, complete influences and Float32 source stores remain unchanged. F15/F16 repair concerns timing-instrument failure propagation and completion evidence; it does not improve the pose algorithm. Root accepted the sealed owner ABBA comparison as a finite negative measurement: full-state/pose correspondence held, but same-tick update-plus-pose medians were 103.145 / 263.538 / 263.364 / 103.054 ms for original/new/new/original, respectively. The ratio of mean arm medians is 2.555×; this is one four-arm sequence, not a confidence interval or a cause diagnosis. Each arm ran 3,000 states through 12 warmup and 120 measured ticks on twelve repeated streams, with a 120-second hard child cap and 110-second cooperative bound inside one ten-minute lease. All four children closed without timeout, error or retry. The reviewed r1 repair patch remains `883fe2cce49e0b885fee14c42e6d767ec00db1a55f81a68cef80fbc9d866449b`; lease SHA-256 is `8821062151eb06fd97ad1efc2782e1258ea5990599993215414f36de7b30cdf7`. The measurement owner report and handoff remain at `artifacts/agents/gait-pose-abba-r1/benchmark-report.md` (SHA-256 `c4443c24165088f1db0706b8697865ae92eedab460d6e5fb6a1985569fab230c`) and `benchmark-handoff.json` (`4d53117141a53811a37d6887dac449a5666e149ebdc455f49df6ebd9df5d1b31`). The optimization hypothesis is rejected; independent result interpretation remains separate and pending. Validation-heavy callback times around 500/662 ms are not production FPS. One rig and twelve repeated streams remain distinct from heterogeneous city work, GPU passes, naturalness and the unchanged 3,000-pedestrian/200-vehicle target.

Owner disposition, 2026-09-13: the preceding documentation checkpoint is `edd448edf524371a247d15983ea99ede13a87ff3`. [Review 24](reviews/24_implementation.md), [Review 25](reviews/25_implementation.md) and [Review 26](reviews/26_implementation.md) retain three separate independent reports in recorded seal order. Root accepts their finite CPU source, instrument-repair and result-interpretation scopes. Historical Review 23 keeps its original open disposition; this later repair resolves F17/B01, F18/B02, F19/B03 and the subsequently discovered F20/B04. Review 11 remains open. The broader goal remains active, with no source or graphics code merged by this checkpoint.

The facade increment binds three material patches to the actual admitted tile, image, geometry and UV data while preserving the existing photographic gain expressions. The prepublication cleanup assurance limit and rejected null-KTX hypotheses remain explicit. CPU checks do not supply native shader compilation or appearance acceptance. The repaired B0 witness retains the earliest matching noon snapshot, refuses first admission after observed completion, uses the exact canonical debug-log key and rejects unfinished oversized EOF. Those finite controls do not establish the ordinary city navigation or replacement criteria.

The independent ABBA interpretation reconstructs the input and row populations, all forty recorded summary sets and eleven negative arithmetic controls. The original/new/new/original kernel medians are 103.145250 / 263.538000 / 263.363600 / 103.054500 ms, with ratio 2.555296987508426 for the means of arm medians. The slowdown is accepted as measured; its cause remains unknown. Full state/pose correspondence is separate from performance. The proposed 24-tick paired CPU profile has not run. Production gait and the unchanged 3,000-pedestrian/200-vehicle target remain unintegrated.

Owner disposition, 2026-09-15: four documentation units are on main at `f705e29`, `14e790f`, `cc108bd` and `ecb7dd1`, and are pushed. They move the Phase 6 network contract to `docs/reference/`, preserve review rounds 2, 4 and 12 with their recorded format corrections, record the 2026-09-13 status with the renderer-recovery and graphics-diagnostics devlog sessions, and take the candidate's newer copies of the graphics-diagnostics and facade-emission records. Some of those records name code and evidence that land only with the graphics candidate; each of those commit messages carries the list.

The graphics candidate is still not on main, and its blocker is unchanged. Its `tools/visual/lifecycle.spec.ts` failed its own `page.goto('/?time=noon', { timeout: 15_000 })` after an 18.4-minute preparation, with the renderer's main thread unavailable for about 13.7 seconds. The fixed reproduction, the disqualifiers and the branch registry for that repair are held in `artifacts/lifecycle-repair-20260915/CONTRACT.md` and stay there while an attribution lane measures where the block sits. `AGENTS.md` and `docs/policies/local-rules.md` describe the candidate and land with it. About 137 paths stay uncommitted in the primary checkout: the candidate's code, the later network admission and passage work, and the agent, human and vehicle workstreams.

Owner disposition, 2026-09-15: the lifecycle check's red fifteen-second bound was attributed to SwiftShader's teardown of the outgoing scene rather than to the application, whose own `pagehide` work spans 2.1-4.3 ms while the replacement document's first script runs at about +27.87 s (forcing `loseContext()` inside the handler moves the same ~30 s inside it). The gate is now split by renderer. `playwright.config.ts` is the pixel lane: hero, style-picker and sweep on SwiftShader, `lifecycle.spec.ts` excluded, and the launch-arg switch that could have moved the lane to hardware removed. `playwright.lifecycle.config.ts` runs that spec on the hardware renderer with the same URL, preparation, viewport and 15 s / 60 s bounds, records the unmasked renderer string per run, and fails by name if it names a software rasteriser. `npm run visual` runs one build, the pixel lane, the lifecycle lane with `--repeat-each=3`, then the wrapper, and the wrapper deletes any earlier `complete.json` when a capture run begins so a failed run cannot leave a previous success artifact behind.

The first corrected run completed on 2026-09-15: the four pixel-lane tests took 3.0 h (each style sweep 1.1 h, hero 43.8 min) and wrote all 44 native frames; the three hardware lifecycle runs navigated in 108 / 104 / 109 ms with replacement at 5,630 / 4,660 / 4,686 ms on an RTX 4090 over D3D11; the wrapper reported that all 44 fresh native-resolution frames survived the complete visual gate with matching hashes. Evidence: `artifacts/lifecycle-attribution/` (report, proposal, independent review with nine conditions), `artifacts/lifecycle-repair-20260915/gate-run/` (both red controls and the full-run log), the new entries in `docs/learning/gate-proofs.md` and the defect register, and the drafted amendment to the repair contract's software requirement at `artifacts/lifecycle-repair-20260915/AMENDMENT-DRAFT-20260915.md`, which the coordinator records. Nothing here changes a bound, the preparation, the URL or any acceptance criterion; the SwiftShader result stays in the record as disclosed counterevidence. Next gate: native inspection of all 44 frames at their own size, then independent review of the corrected instrument, then merge to main.

The graphics candidate is now on main, and the blocker above is closed by it. Owner disposition, 2026-09-15: the candidate landed as `0098253` on `main`, from `672c73f`, at tree `57a5fe3e20b3e3beb34050eea1357d0d4a693316`, and is pushed. The 44 candidate frames are bound to it: the capture at `complete.json` SHA-256 `629786433e5ab372debdd2367f55e59b1f211da40f5418fdcecb177bc89e198d` came from `dist/assets/index-BP1Vm0F-.js` at `0d99838361a2597053e2eb6f0fdf72dd6a9aa53b31433cc5e540a9c4df1f451c`, and that revision builds to exactly those bytes. The plan text above, which still describes the candidate as unmerged and its blocker as unchanged, is superseded by this paragraph; it is left in place as the record of what was believed before the merge. Native inspection then opened all 44 frames individually at their own size and found no blocking defect (`artifacts/frame-inspection/report.md`, consolidated from four read-only lanes of nine frames each plus the eight hero frames). Its disclosed bound is that the image tool returns 1066x600 previews of the 1280x720 sources, so single-pixel aliasing and temporal crawl are outside what it signs off. The findings it carries forward are outer-terrain ground holes, a facade scribble at dusk, one sign artwork reused on several facades in a frame, and near-field pavement wash-out at grazing angles. Two lane findings were adjudicated as over-calls: the "untextured slab" in `plaza-az120.png` and `plaza-az180.png` is the road surface, correctly paved and toned, and the pale low-rise district in the satellite overhead frames is rooftop lighting under a low sun rather than a missing atlas.

Independent review of the corrected two-lane instrument reports no blocking finding (`artifacts/instrument-review/review.md`, SHA-256 `0fb106584c8dff4d306940673672be7f730a5c2dfbc25456f176d4bb47ac699f`). Its accepted material findings are taken into the hardening unit that follows: the previous `complete.json` survives a failed build because the deletion sits after the build step, `complete.json` carries no lifecycle evidence, the build-hash binding excludes `data/scene`, the lifecycle lane has no console or pageerror assertion, and the pixel lane's SwiftShader identity is recorded but never asserted. One claim is rejected with evidence: the review states that the wrapper's deadline "does not exist anywhere in the tree", and the policy does state it.

Three further units landed and are pushed on the same day. `620b662` adds `tools/agents/population-cost.ts`, the first measurement of the real per-tick population cost: on this machine, 3,000 pedestrians and 200 vehicles cost 2.409 ms median for admission (4.8 times the design's assumed 0.5 ms budget), 0.526 ms for pose composition, 1.007 ms for a simulation substrate that contains no motion model, and 4.346 ms for a whole tick. Admission throughput, not frame rate, is the first thing this population breaks: a median 27 grants against 2,582 requests, so 80.8% of the population queues, and two vehicle routes cannot be driven at all because a mapped stop line sits nearer the gate than half the longest vehicle and no offset policy exists. `0045b30` gives the delivered human assets the version-2 contract the runtime requires; the asset bytes were never wrong, only the four manifests were stale, and the repair leaves every GLB and VAT texture bit-identical while `tools/agents/verify.ts --humans-only` keeps the accepted bounds (worst sole drift 0.001167 m against 5 mm, worst absolute contact 0.009148 m against 15 mm). `10da8ea` lands the agent and vehicle cores with both renderers, the offline certified-geometry tools and eleven test files. All four commits were pushed, and the working tree is clean.

The gate for the graphics landing was re-run after the 2026-09-15 documentation landing, because the earlier run's evidence was captured against the candidate worktree rather than against the merged revision. That re-run is still completing in `artifacts/g1-verify`; its completion signal is `artifacts/visual/complete.json` beside the 44 fresh native frames and the three hardware lifecycle runs, and this paragraph is updated when it lands.

### Blockers (unresolved dependencies)

- Review 5 accepted the network lifecycle and supported-body contract; the reviewed milestone is on main at `1ca4552ceee25e34ac62335114bbb5377a4d6470`. Phase 7/8 still require continuous legal trajectories, level-aware contact, measured receiving capacity and populated integration. See `reviews/5_implementation.md`.
- Pinned MPFB and MakeHuman system CC0 assets supply three adult clothing/body variants and baked idle/walk animation. Human format v2 requires selected-scene draw parts and world-baked VAT. A1/support repairs remain frozen; root verified 34 source/evidence hashes and reran 13 tests. Review 6 preserves the 378-case flat-contact result (3.583476 mm maximum planted drift and 9.132385 mm stance height) while rejecting full-body reference mismatch and crouch/static arms. Review 7 completes only the commuter-male/near reference proof: matching evaluated bind matrices plus full skin influences recover source correspondence, with a controlled perturbation and paired rendered evidence. Root independently verified all 163 handoff digests and inspected selected native pairs. F7 naturalness and production integration remain rejected/pending; no new production bake or phase-settled strip is accepted. Pose normals and wheel residual buffers remain unchanged. Shipping cross-pass GPU, natural motion, world contact and populated LOD quality remain unaccepted. See `reviews/6_implementation.md` and `reviews/7_implementation.md`.
- The Japanese vehicle mix uses accepted original, unbranded kei hatchback, tall taxi and city-bus V4 recipes. The standalone `data:vehicles` / `data:vehicles:verify` closure uses the one measured fleet authority without human archives or baking. Candidate ordinary build/verify produced the exact accepted three GLBs and raw manifest `5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01`; hardware was rebound to those bytes, with all placement geometry unchanged. Review 12 separately accepted the bounded F9 wheel-offset/source support repair; integrated raw-V4 motion, natural steering, populated contact, all five code gates and merge remain pending. This does not claim a licensed branded JPN Taxi model was obtained.
- The 3,000 animated pedestrian / 200 vehicle performance target is set in `src/world/frame.ts`; its Phase 9 measurement remains pending.

## Approach

These decisions are settled. Reopen one only with a reason that is new, not with a preference.

**Target: a three.js + Vite web app, running in real time in the browser.**

Chosen over Blender, over Unreal plus Cesium, and over Godot. It matches `town_3d`'s stack, so the fleet already knows it. Animated agents are natural in it. And Playwright gives cheap screenshot gates, which is exactly what the canon's visual-verification rule asks for.

Current supporting contracts: [network](../../reference/network-contract.md), [facade emission](../../reference/facade-emission.md) and [bounded pavement recipe](../../reference/pavement-recipe.md). The primary checkout also retains the in-progress human asset contract at `docs/reference/agent-assets.md`; that unready pipeline is excluded from this graphics candidate.

**Geometry source: Project PLATEAU LOD2 (MLIT, PDL 1.0 with CC BY 4.0 permitted) plus OpenStreetMap (ODbL).**

Chosen over Google Photorealistic 3D Tiles. The Maps Platform terms forbid bulk caching and derivative works, so that data cannot be baked into a simulated world however good it looks. This is a licensing decision and it is recorded here so it stays findable, rather than being rediscovered later by someone who notices the tiles are prettier.

**Where the realism actually comes from.**

PLATEAU supplies accurate geometry and, in this AOI, photographic texture on 1,678 of 1,741 buildings — 96.4%, every one of them LOD2, with the untextured 3.6% being exactly the LOD1 set. That corrects the premise this plan was originally reasoned from, which said PLATEAU supplies almost no texture; item 15 and new item 35 are the items rewritten to match. Realism is still won in the material and lighting passes, because the texture that exists is daytime aerial photogrammetry with shadows baked into the albedo and no emissive channel anywhere.

Shibuya is defined by its illuminated signage. Without emissive billboards the scene reads as a generic Japanese city no matter how accurate the geometry underneath it is.

That is why emissive signage (item 16) is the single highest-value item in the plan, and why dusk is the hero lighting preset: it gives the best realism per unit of effort and it forgives LOD2's weaknesses.

**Pipeline shape.**

The geospatial work is offline, deterministic and cached. Its outputs stay gitignored and regenerable, under the canon's blob ceilings, so the repository holds the recipe rather than the bytes.

**Gate frames are not byte-reproducible, and no phase should assume otherwise.**

The visual harness aims the camera through the real controls and accepts a pose within 0.012 rad of the one it asked for, and damped controls come to rest at a slightly different residual on every run. Measured on 2026-09-06: three runs of the same build produced no frame that was byte-identical in all three, with settled azimuths drifting up to 3.5e-4 rad between runs and distinct-colour counts moving by a few either way. Pixel-exact goldens need a tighter settle tolerance bought first; until some phase pays for it, frames are reviewed by eye and compared by content, never diffed byte for byte.

## Acceptance criteria

Each of these is checked by looking at a rendered result or watching the scene run. None of them is satisfied by a passing test.

- [x] The AOI renders end to end — terrain, buildings and road surfaces across the full 1 km box — inspected from several angles and zoom levels, each frame at native resolution. (Phases 1–3)
- [x] The ground is not flat: the Shibuya valley and the Dōgenzaka slope are visible in the rendered terrain, and building footprints sit on it without floating or sinking. (Phases 2–3)
- [x] Buildings hold up close: window grids follow floor counts and the PBR materials respond to light, checked at street level and from above. (Phase 4)
- [x] A dusk frame of the crossing reads as Shibuya rather than as a generic Japanese city, because the emissive signage and neon are there. (Phases 4–5)
- [ ] Road markings match reference imagery, including the scramble's diagonals, with signals, guardrails and street furniture in place. (Phase 4)
- [ ] The dusk preset renders with ACES tone mapping, bloom carrying the neon, SSAO and TAA, and holds still — no flicker or crawl over a moving sequence. (Phase 5)
- [ ] Vehicles hold their lanes, obey the signals, turn, and spawn and despawn at the boundary, watched over a run rather than sampled in one frame. (Phase 7)
- [ ] Pedestrians avoid each other and surge diagonally across the crossing on the signal phase — the signature shot — with no visible interpenetration and no sliding feet. (Phase 8)
- [ ] Vehicles and pedestrians run off the same clock: one signal phase model drives both, and no frame shows traffic moving through the scramble while pedestrians are on it. (Phase 6)
- [ ] 60 fps at 1920×1080 in a running build with 3,000 animated pedestrians and 200 vehicles, the target pinned in `src/world/frame.ts`; name the measured hardware, build and timing window. (Phase 9)
- [x] The scene rebuilds from a clean checkout: delete the derived geospatial outputs, re-run the pipeline, render again, and compare with the frames above. (Phase 2)
- [x] The running app shows its attribution: PLATEAU (PDL 1.0, with CC BY 4.0 permitted — the licence name here was imprecise and is corrected), OpenStreetMap (ODbL) and GSI. (Phase 1)
- [ ] A multi-angle, multi-zoom sweep and a flythrough driven through the real controls both come back clean, an independent review passes, and the work is merged to main. (Phase 10)
- [ ] Cartographic and Satellite each hold up at street, block and aerial distances. The actual World style dropdown switches both ways with pointer and keyboard input, preserves camera and simulation progress, and takes its options from a registry that can accept later styles. (Phases 4–5, 10)

### Visual acceptance state, 2026-09-15

Two criteria above have evidence from the 44-frame capture and are settled here rather than left blank; the rest stay open with the reason.

**Settled.** Buildings hold up close (line 145) and the dusk frame reads as Shibuya rather than a generic Japanese city (line 146), both on the 44 frames of the capture bound to G1. The facade criterion is carried by the hero and plaza frames at street level and by the block and overhead frames from above: window grids follow floor counts, the generated cartographic windows sit on the storey rhythm, and the PBR response separates sunlit from shaded faces at both times of day. The dusk criterion is carried by `hero-satellite-dusk-crossing.png` and `hero-cartographic-dusk-crossing.png`: the crossing's zebra and diagonal arms are legible, the emissive signage reads (`TOKYO`, `SHIBUYA`, `TSUTAYA`), and the sunset band carries the sky. Both rest on frames the coordinator opened individually, with the bound recorded in `artifacts/frame-inspection/report.md`: the image tool returns 1066×600 previews of the 1280×720 sources, so single-pixel detail is outside what that review signs off. Nothing in these two frames depends on that detail — they were judged on structure, signage and tone, which survive the downscale.

**Deliberately still open, with the reason rather than a blank.**

- Line 148 (the dusk preset's post chain, and "holds still — no flicker or crawl over a moving sequence") is **not** satisfied at the time of writing, and the reason is measured: `artifacts/gate-timing/REPORT.md` found `taaAccumulating: false, taaSamples: 0` on all eight hero frames, reproduced on both renderers, so the temporal accumulation the criterion names never engaged. The frames also cannot answer "over a moving sequence" at all — that needs the controls-driven flythrough, which is Phase 10. This is the clearest case in the plan of a criterion whose mechanism is present in the code and absent from the pixels.
- Line 147 (road markings against reference imagery, signals, guardrails, street furniture) is partly carried: the crossing's diagonal arms, the zebra bands and the tactile guidance strips are visible and correctly placed in both styles, and signal heads and posts are present. What is not established is agreement with *reference imagery* at native resolution, which needs the crop-level comparison this review's downscale bound cannot make.
- Lines 149 to 152 and 155 to 156 stay open for the reason already recorded against them in the delivery status: they are population criteria, and the population does not yet complete a route or cross a street.

## Implementation steps

Thirty-five items across eleven phases. The numbering is stable and append-only — refer to items by number, and add a new item at the end of the list rather than renumbering. Item 35 is a Phase 4 item added in Phase 1 and so sits out of numeric order under that phase.

### Phase 0 — Toolchain & gates (blocks everything)

- [x] 1. Vite + three.js + TypeScript scaffold; `.nvmrc` pinned to Node 24
- [x] 2. Playwright visual harness that drives OrbitControls and never assigns camera pose directly — the canon names direct state-setting structurally blind, with `scenes` as its case study
- [x] 3. Fill the currently-empty `Gates` section of `AGENTS.md` with commands actually run in this repo

### Phase 1 — Data & provenance

- [x] 4. Fix the AOI to the box above
- [x] 5. PLATEAU **Shibuya-ku FY2025** CityGML LOD2 for the covering tiles — five years newer than the Tokyo 23-ku FY2020 bundle this item first named, spec v5, a tenth the download, and it adds LOD3 roads and street furniture
- [x] 6. OSM via Overpass — lanes, crossings, signals, sidewalks, rail
- [x] 7. Terrain from **PLATEAU's own 2.5 m TIN**, which ships in the same archive, same CRS, same vertical datum, 80,896 triangles for the AOI — Shibuya is a valley and Dōgenzaka means slope; flat ground reads as wrong immediately. If GSI is used at all it is as a cross-check, through the 1 m `dem1a_png` tile API, not the 5 m mesh download this item first named
- [x] 8. Record licenses (PLATEAU CC-BY 4.0, OSM ODbL, GSI) and build an in-app attribution surface

### Phase 2 — Geospatial pipeline (offline, deterministic, cached)

- [x] 9. Project to JGD2011 / Japan Plane Rectangular CS IX (EPSG:6677), local origin at the crossing so floats stay small
- [x] 10. Buildings from **MLIT's pre-converted 3D Tiles**, not from a local CityGML conversion; unwrap b3dm to glTF, georeference, clip to AOI. The PLATEAU GIS Converter this item first named has no prebuilt Windows CLI — the release is a GUI installer and the CLI ships only for Linux and macOS, so it needs a Rust build on a path upstream never CI-tests. The decision and the sample it rests on are in the Outcome section below; the CityGML archive is still fetched, because terrain and the authoritative attributes come from it
- [x] 11. Terrain mesh from the DEM; snap building footprints to it
- [x] 12. Tile the output for culling and LOD; outputs stay gitignored and regenerable, under the canon's blob ceilings

### Phase 3 — Static scene

- [x] 13. Terrain, buildings and road surfaces rendering
- [x] 14. Camera, controls, first visual-gate baseline

### Phase 4 — Realism pass (where the deliverable is won)

- [ ] 15. Facades — PLATEAU's photographic texture is the albedo base for the 96.4% that has one, with generated roughness and metalness over it; floor-count-derived procedural window grids are the treatment for the untextured 3.6% and for hero close-ups where the aerial texture visibly fails, not the default for the AOI
- [ ] 16. Emissive signage and neon — the single highest-value item in the plan
- [ ] 17. Road markings including the scramble's diagonals, signals, street furniture, guardrails
- [ ] 18. Wet-asphalt reflectance, sidewalk paving
- [ ] 35. De-light the PLATEAU facade textures — they are aerial photogrammetry with daylight and hard shadows baked into the albedo and no emissive channel, median 10 KiB, typically a 512x512 atlas holding a small oblique crop. Left alone they paint midday shadows onto a dusk scene. Appended here rather than inserted because the numbering above is stable and append-only

### Phase 5 — Lighting & post

- [ ] 19. Time-of-day sun and sky, with dusk as the hero preset — best realism per unit effort, and it forgives LOD2's weaknesses
- [ ] 20. ACES tone mapping, bloom to carry the neon, SSAO, TAA

### Phase 6 — Network graph (shared contract; must freeze before Phases 7 and 8 run in parallel)

- [x] 21. Lane-level road graph plus sidewalk and crossing graph from OSM — reviewed offline network milestone; inferred widths and missing ground remain disclosed in [the canonical network contract](../../reference/network-contract.md).
- [ ] 22. Signal phase model driving vehicles and pedestrians from one clock — shared deterministic controller and admission API reviewed; both populated consumers remain unimplemented.
- [x] 23. Document and freeze the schema — it is the interface both agent workstreams build against. Constraint: the OSM-derived network graph stays in its own files, never fused with PLATEAU geometry. The render is a Produced Work with no share-alike, but this graph is a Derivative Database, and publishing the app obliges offering recipients that derived database or a description of the method (ODbL 4.6). Keeping them separable is nearly free now and expensive to unpick after the schema freezes

### Phase 7 — Vehicles

The reviewed network milestone is on main; integrated simulation remains pending. Original, unbranded kei hatchback, tall taxi and city-bus source recipes are selected. Steering, shipping appearance and contact validation remain open; see the current delivery status above.

- [ ] 24. IDM car-following with MOBIL lane changes
- [ ] 25. Signal obedience, turns, boundary spawn and despawn
- [ ] 26. Instanced rendering

### Phase 8 — Pedestrians

The reviewed network milestone is on main; integrated simulation remains pending. Pinned CC0 adult character sources are selected. Production animation, naturalness and shipping motion/contact validation remain open; see the current delivery status and `reviews/7_implementation.md` for the bounded reference proof.

- [ ] 27. ORCA/RVO2 local avoidance with a spatial hash
- [ ] 28. Scramble-crossing behavior driven by the signal phase — the diagonal surge is the signature shot
- [ ] 29. Thousands of animated characters via baked vertex animation textures, since three.js instancing does not do skinning natively

### Phase 9 — Performance

Pending integrated vehicles and pedestrians. The target is 60 fps at 1920×1080 with 3,000 animated pedestrians and 200 vehicles; performance has not yet been measured against it.

- [ ] 30. Draw-call and LOD budget; 60 fps at 1080p under target agent counts
- [ ] 31. Profile, fix, re-measure

### Phase 10 — Acceptance

- [ ] 32. Multi-angle, multi-zoom sweep with each frame inspected at native resolution
- [ ] 33. Real-controls flythrough exercised over time
- [ ] 34. Independent review, then merge to main

## Outcome

Phase 0 is complete and merged to main. Items 1, 2 and 3 delivered a Vite + three.js + TypeScript scaffold on Node 24, a Playwright harness that drives OrbitControls with synthesised pointer and wheel events and writes twelve frames at 1280x720, and a filled-in `Gates` section in `AGENTS.md` naming five commands that were all run here.

Four of the visual gate's failure paths have been made to go red on purpose; three more are written but unproved. `docs/learning/gate-proofs.md` holds the mutation and the message for each.

Phase 0 also set the contracts every later phase builds against. These are contracts and not conventions: changing one changes every system downstream of it.

- **The world frame**, in `src/world/frame.ts`. Scene units are metres, Y is up, the world origin is the Shibuya Scramble Crossing at 35.6595 N, 139.7005 E, +X is east and +Z is south. Everything that places anything reads it from there rather than restating it.
- **No global coordinate reaches the scene.** `planeRectangularToWorld` swaps EPSG:6677's northing-first axes and subtracts the origin at load time, so no eight-million-metre northing ever lands in a float32 vertex buffer. Projecting to EPSG:6677 is Phase 2's offline job, and Phase 2 supplies the origin.
- **Homes for the geometry.** `src/scene/terrain.ts`, `src/scene/buildings.ts` and `src/scene/roads.ts` for those three, `src/agents/agents.ts` for pedestrians and vehicles. Each holds a named seam and a comment saying which phase fills it.
- **Two hooks on `RenderLoop`**, in `src/render/loop.ts`. `onFixedStep` runs at a constant rate and is where Phases 7 and 8 both register, so one clock drives vehicles and pedestrians and Phase 6's signal phase model can drive both from it. `onFrame` runs once per drawn frame with the real elapsed time, for anything that should look smooth rather than be reproducible.

### Phase 1

Items 4 to 8 are done. The data is on disk, verified, attributed, and reachable by one command; the scene is still a placeholder, because rendering it is Phase 3.

`npm run data:fetch` gets everything into a gitignored `data/`. The PLATEAU archive is 649,322,807 bytes, SHA-256 `f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d`, pinned in `tools/data/manifest.ts` and checked by length before hash on every run. Truncating it by 4,096 bytes was tried: the script reported "4096 bytes short of the expected 649322807 — a truncated download" and re-fetched. The Overpass extract came back at 1,211,346 bytes and 7,915 element records, `osm_base 2026-09-07T03:23:56Z`.

**The AOI is one definition now**, in `src/world/aoi.ts`, and `src/world/frame.ts` takes the world origin from it rather than restating it. `tools/data/manifest.ts` builds the archive member list from the mesh codes there, and `tools/data/overpass-query.ts` builds the Overpass bbox from the same bounds.

**Two new gates, both proved red.** `test/aoi.test.ts` pins the projection and the composed chain from degrees to scene metres, and `test/elevation.test.ts` compares PLATEAU's terrain against GSI's independent survey at the crossing. Both mutations and both failure messages are in `docs/learning/gate-proofs.md`. These catch the two defects that would otherwise be invisible: a mirrored city, and terrain uniformly 36.877 m too high.

**Attribution is in the running app**, not only in a file. `src/ui/attribution.ts` replaces the placeholder in `index.html` at boot and throws if the element is missing, so the scene cannot draw without its credits.

**The conversion path changed, and item 10 with it.** Two `.b3dm` tiles covering the crossing were fetched from MLIT's own 3D Tiles build and parsed against the CityGML the fetch downloads. The pre-converted tiles carry a 63-key batch table per tile — `bldg:measuredHeight`, `bldg:storeysAboveGround`, `bldg:usage`, `gml_id` and per-feature bounding boxes — which cross-checks exactly against the CityGML on two named buildings: Hikarie at 173.6 m and 34 storeys, Shibuya Stream at 171.3 m and 35 storeys. They carry `_BATCHID` per vertex and a five-level hierarchy of 730 tiles, 67 of them over the AOI, which is item 12's culling unit already built. Texture is a 2048x2048 WebP atlas per tile, and the 75 tiles covering mesh 53393596 carry 314.6 Mpx against that cell's 184.4 Mpx of source JPEG, so the route is not resolution-limited. The converter would instead have needed an untested Windows Rust build and would have emitted one GLB per feature *type*, which is the wrong granularity for item 12. Full evidence in `design.md`.

**The plan's texture premise was wrong and is corrected.** Parsing all four building files here independently reproduces the research figure: 1,741 buildings in the AOI box, 1,678 with LOD2 and a texture, 96.4%, with a perfectly clean split — no textured LOD1 and no untextured LOD2. Item 15 was rewritten and item 35 appended for de-lighting.

**Provenance lives in `design.md`**, distilled from a read-only research pass and marked where this phase re-measured rather than carried a claim.

What Phase 1 did **not** do, and Phase 2 should not assume: nothing has been rendered, the Draco decode in those tiles has never been exercised, and the 3.6% of buildings that are LOD1 live in a separate tileset that must be merged on `gml_id`. The last of those turned out to be false — see below.

### Phases 2 and 3

Items 9 to 14 are done. Real Shibuya renders: PLATEAU's 2.5 m terrain TIN, its `tran` road surfaces, and all 1,740 buildings in the box from MLIT's own 3D Tiles, with photographic facades, standing on the ground.

**The loader decision: `3d-tiles-renderer`, against a tileset the pipeline has already moved into the world frame.** The tileset is a real five-level `REPLACE` hierarchy with geometric errors from 316 down to 0, which is item 12's culling and LOD unit already built; what a purpose-built loader would have had to add is screen-space error selection, a download queue and an eviction policy. The last is not optional here — 551.9 megapixels of texture over the 67 AOI tiles is 2,943 MB decoded — so a loader of our own would have grown the same LRU cache with less testing behind it. The cost is three transitive dependencies this project does not use and a library that assumes tiles sit on an ellipsoid; the second is paid offline, where `npm run data:scene` rewrites every `region` bounding volume as a `box` in world metres, so the browser holds no coordinate over about two kilometres and Phase 0's frame contract is kept exactly.

**Item 11 says "snap building footprints to it" and nothing snaps anything.** That is deliberate and it is a better result than snapping would be: the terrain TIN and the buildings come out of the same PLATEAU survey, so a building's own `_zmin` is already the ground under it. What the pipeline does instead is *reconcile* the two — it recovers the vertical datum shift from the tiles' own geometry and refuses to build if the two sources disagree — and the measured spread between a building's lowest decoded vertex and its stated ground is 0.094 m over 2,607 buildings. A snap would have hidden that disagreement rather than measured it. The visual gate checks the outcome from every framing: the lowest building geometry drawn sits at 10.80 m against ground that runs 8.71 m to 36.35 m.

**Three things this phase found that a passing test would not have.**

- **glTF is Y-up and `CESIUM_RTC` translates in a Z-up frame.** Nothing in a b3dm says so and `design.md` did not either. Placed without the turn, every building landed a median of 68 m from where its own batch table puts it and the city rendered lying on its side over the right street pattern. Placed with the turn folded into the tile matrix *and* the tileset not declaring `gltfUpAxis: "z"`, the library applied its own on top and it tilted again.
- **The tile cache counts decoded bytes.** Sized from the 137 MB the tiles weigh on disk, it could not hold a single 4096x4096 leaf, so the traversal never refined past the root and the app drew seventeen decimated buildings over the whole ward while reporting itself loaded, idle and error-free.
- **PLATEAU's road polygons below LOD3 are flat at z = 0**, as `design.md` warned, and the part it did not warn about is what happens at the edge: a road ring reaching past the terrain has nothing to be draped onto, so it stays at sea level and drags asphalt out past the edge of the world. 461 polygons were dropped for that.

**Corrections to `design.md`, which is the project's provenance.** Six of its claims were wrong or incomplete and each is now marked in place: the LOD1 buildings are in the same tileset rather than a separate one; the sentinels read `null` in the tiles rather than −9999; the atlases run to 4096x4096 rather than 2048x2048, which is 5.5 times the memory; the AOI holds 1,740 buildings by this repository's own count rather than 1,741, and the count is sensitive to the centroid rule because 25 buildings sit within two metres of the boundary; the Draco decode now works and is exercised; and the up-axis fact above was missing entirely. One claim held exactly — `_zmin` and `_zmax` are orthometric where the ECEF geometry is ellipsoidal, and the difference between them recovers the geoid undulation from the data alone at 36.786 m against a published 36.877 m.

**Two new gates, both proved red**, in `docs/learning/gate-proofs.md`: `test/sentinel.test.ts` over a real PLATEAU batch table, and `test/placement.test.ts` over the ECEF and up-axis transforms. The visual gate gained a third check that has fired on two real defects — the bounding box and triangle count of the building geometry actually in the scene, which is the first thing in this repository that looks at the scene rather than at the framebuffer.

**What Phase 4 inherits, and should not rediscover.** Building textures are capped at 1024 pixels on the longest side at load time, in `src/scene/texture-budget.ts`, because the alternative is a scene that cannot hold the area of interest at leaf detail; the table of what each cap costs is in that file and the number is one constant. The 64 LOD1 buildings render as untextured white, which is item 15's stated job. Nothing here touches materials or lighting.

Phase 4 is next.


### Phase 6 network milestone

Review 5 accepts the separate OSM graph, deterministic signal/reservation admission, supported 3D vehicle footprint and atomic boundary lifecycle. Earlier reviewed failures and all four exact contract snapshots remain permanent. The graph has 5,094 nodes, 4,855 vehicle sections, 1,740 walking edges and 213 controllers; all 401 original conflict disks and every portal remain. The 11.6 m supported body bound enlarged the scramble union to a 211.029 m bounding-box diagonal without inventing a larger physical disk. Source lane/width inference, 47.196 m of undrapable walking path and the single no-U-turn dead-end demand exclusion remain explicit.

The accepted module is available through `data:network` and `/network/network.json`; this milestone retains the main baseline application and its eighteen-view SwiftShader visual harness. It does not claim the pending two-style 44-frame graphics gate, rendered network decorations, animated agents, natural traffic throughput, actual wheel/pavement contact or continuous boundary steering. Items 24–29 and all populated/visual acceptance criteria remain open. Phase 6 item 22 closes only when both running populations use this one clock.

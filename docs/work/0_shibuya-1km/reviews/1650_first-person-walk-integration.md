# First-person walk and loading integration — 2026-10-18

Accepted executable: `b00bb203020fc64324af88089bdd6eea1c0993ba`, committed directly on main and pushed; remote main readback matched. The owner explicitly selected control of both walking and looking, then authorized coordination with the concurrent loading-time chat. [1647](1647_first-person-walk-plan.md), [1648](1648_first-person-walk-source-review.md) and [1649](1649_initial-loading-source-review.md) preserve the assignments, initial collision finding, correction and loading review.

## Result and scope

Start walking enters a manual camera 1.7 m above supported crossing ground. WASD/arrows move relative to look direction; left/middle drag looks; Escape or Overview restores the previous overview. Input clears on focus/visibility loss. The pedestrian prototype has a separate action. Terrain/street support, bounded steps, AOI inset and retained final-leaf building sweeps constrain movement. Off-view geometry remains available independently of GPU visibility, with load/dispose invalidation. Actor and street-furniture collision, whole-AOI continuous collision and population/FPS acceptance are outside this increment.

The shared loading change disables eager ancestors and sibling requests while preserving all 44 final leaves, the source hierarchy, texture limits, cache limits and whole-scene readiness. Actual installed-traversal controls fail when either flag is restored individually and return GREEN after exact restoration. Three old-base/candidate observations show earlier complete-leaf preparation: upper bounds 7.050/7.111/6.766 s versus 6.192/6.011/5.795 s; even baseline lower minus candidate upper is positive by 0.504/0.779/0.703 s. Full-visible polling intervals overlap; lower observed ready upper bounds 13.492/9.376/9.067 s versus 12.493/8.088/7.967 s do not establish an exact first-visible speedup. Decoded cache use falls 651,400,435 to 477,908,062 bytes (26.63%); this is not whole-process GPU allocation. Those timings isolate the loader settings on the old app, not the combined first-person app.

## Final checks

All five primary gates pass on the final combined source on Node 24.12.0: build 2.938 s, types 5.181 s, 142 unit files/1,244 tests in 53.680 s, visual 247.695 s, audit 8.531 s. Audit reports two moderate findings and no high findings. Unit stderr includes the intended missing-final-leaf 404 negative. No dependency changed. GitHub readback on the executable reports zero workflows, zero check runs and zero statuses; its aggregate pending state has no runnable check. Remote CI verification is unavailable.

Hardware visual run `6cada51854bd129a` certifies 44 fresh frames and three completed, error-free lifecycles on RTX 4090 / driver 616.64. Certificate SHA-256: `fe51a1b9c6b8f046860a6c97751a91aba6d14cc8e225dfab0d7f54e8e5a88c4c`. Root and independent `review_walk` inspected all 22 Satellite originals and both basic Cartographic returns at 1280×720. Baseline `bfe2ff3fc92d452c` comparisons confirm the block-060 foreground occlusion and plaza-180 interior framing already existed. No material static regression was found. Existing facade, authenticity and broader Shibuya quality limits remain open.

The headless production real-input check passes in 55.025 s at dusk and noon. Actual button clicks, held keys, pointer drags and style-picker interactions verify entry, walking, stationary looking, movement after looking, focus clearing, both style directions, exact overview restoration, reentry, button exit and fresh completed pagehide cleanup while walking. Entry is `(0,17.088944649487694,0)`, above source support 15.388944649487694 m. Each forward sample moves about 2.52 m; drag changes yaw by -0.63 and pitch by -0.15 radians without translation. All 168 source/build/runtime input tuples are unchanged. Six full native originals pass root and independent review. Native report SHA-256: `ee0e8042276d7a27ca8e192ff7e21cd8e34e339c26c06a66f07892e199064111`.

Evidence is retained under ignored `artifacts/first-person-walk/`: final visual snapshot, native originals/report/input inventory, source freeze, static review hashes and gate logs. Loading measurements and original controls are retained under `artifacts/initial-loading-20261018/worker-evidence/`. These are finite crossing paths and static samples, not continuous whole-city motion, contact, population or performance evidence.

## Independent final first-person review

Reviewer `review_walk`: GO; no material finding remains. Rehashed all six first-person originals against the report and inspected each at 1280×720. Dusk/noon entry-forward-look show credible eye-level crossing context, clear walking/help/Overview controls, changed viewpoint after forward/drag, and no sampled clipping, ground or render regression. Source freeze, 24 static originals, all 44 certified frame hashes and 168 native input tuples match. The instrument uses real clicks, held keys, drag and style-picker input with an observation-only bridge. It supports restoration, reentry and active-mode cleanup within the stated paths. No reviewer browser or duplicate gate was launched.

## Integration and cleanup

The primary source freeze contains 13 source/test/policy tuples. Combined buildings SHA-256 is `662679d2d48aab4ec00a2e6ffdf21f7f30e83d7e5b6b2ab14bd7e0708073a5e5`; controller is `d9a5f5fc33a3f4b6dc381a8a03683c001933f7e2b6a327be04d5178941fdc999`. The five untouched inherited LF files retain their original bytes. The two overlapping inherited tests preserve their newline spelling and EOF while adopting reviewed test edits. Shared plan and defect updates were kept outside the code commit and reconciled in the following documentation checkpoint.

Every owned gate/browser process ran with a finite hidden-process deadline and finally cleanup. Browser contexts, Chromium, preview and temporary profiles closed; runner marker censuses were empty. The isolated first-person worktree and branch were removed after the accepted code was pushed, with a fresh zero-reparse census of 2,573 regular files and checked ancestors. No task server is left running. The separate loading chat owns its isolated worktree cleanup.

Final readback finds zero task-marked processes, zero owned temporary roots, zero preview listeners and no first-person checkout; all five untouched inherited raw hashes match. The loading owner independently confirms actual checkout/branch removal after evidence preservation and another zero-reparse census. Its queued managed archive did not report completion; the owner retained recovery ref `refs/codex-archives/initial-loading-01a15179`, then removed the verified clean checkout with ordinary Git. That owner retains the separate cleanup receipt under `artifacts/initial-loading-20261018/worktree-cleanup.json`.

The following documentation checkpoint checks all 12 new local links and the canonical plan's 12 KiB bound. A 2.940 s rebuild reproduces all six certified build members exactly. Source and dependency bytes remain unchanged; full runtime gates and CI waits are not repeated for documentation-only changes.

## Independent loading reports

The authored reports below preserve the loading reviewers' original words and evidence bounds.

## Loading source review (original)

# Independent integrated loading review, 2026-10-18

Reviewer: startup_review. GO; no material finding.

Verified primary raw SHA-256: src/scene/buildings.ts 662679d2d48aab4ec00a2e6ffdf21f7f30e83d7e5b6b2ab14bd7e0708073a5e5; test/rail-runtime.test.ts d0b167fb84a6d2262fe44ce65aa26b40f24477bbc623a5ddbae6f1dcc2276b9b. The test equals the reviewed worker file after newline normalization. Removing only the separately approved BuildingWalkCollision declaration/interface/return field from primary leaves the worker buildings source equal after newline normalization. Both loader flags remain false at the production constructor; no loading hunk changed during integration.

The retained collision API enumerates installed forEachLoadedModel scenes, then filters to prepared live final leaves, independent of visible parenting. Skipping coarse content cannot remove its collision inputs. All 44 leaf scenes remain below the unchanged 640 MiB retention floor; revision and disposal callbacks are unchanged. The ordinary missing-leaf guard still hides the whole city. No new loader/collision interaction hole found within this source scope; the separate first-person review owns movement/contact acceptance.

Read final-flag-red-controls.json (SHA62bd8f0f66f636cc0cba882a87bbc4146f6b045b7897e1fc6df391f306cabf73): restoring loadAncestors alone fails on all three coarse requests before completion; restoring loadSiblings alone fails on coarse-east after warmup; both receipts restore candidate bd627466… exactly. These discriminate the two queue paths, rather than mirroring flag values.

Read final timing A/B receipts (SHA00e38c85… / eb9e78ad…): default /, dusk, 1280×720, HTTP cache disabled, one fresh browser with three fresh contexts per arm. Ready upper observations A13.492/9.376/9.067 s versus B12.493/8.088/7.967 s; wide polling intervals overlap, so report lower observed upper bounds, not an exact event speedup. Candidate prepares the same 44 leaf URIs with 44 rather than 67 model loads. Each paired run preserves drawn mesh/triangle counts, bounds, visible/loaded/required leaf sets, sections/connectors and rail observations. Decoded cache accounting drops 651,400,435→477,908,062 bytes. Inputs unchanged, no reported errors, all six cleanup flags true. This benchmark binds worker bd627466… and the old default app, not an exact latency measurement of the combined first-person build.

Source/test integration review is GO. Shared five gates, final native coverage, final main revision and merge/push remain separate pending acceptance. Reviewer launched no tests, browser, server or GPU work.


## Loading native review (original)

# Independent native loading-regression review — 2026-10-18

Reviewer: startup_review. GO within four-original coverage; no material visual finding.

Inspected each full 1280×720 original at native resolution, with no montage/crop or browser launch. Crossing frontages, block roofs/street canyons, railway surroundings and the overhead square show no obvious missing building group, coarse fallback or partial-city loading hole. Existing texture/detail limits remain outside this regression verdict.

Exact selected frames, SHA-256 and recorded poses:

- hero/hero-satellite-dusk-crossing.png — 936f2e84db7403cae6329d957719b88e822355b6a91065fc236f8ee1c310b0b6; dusk; distance45.0000013525m, azimuth0.7853981634rad, polar1.4999997567rad, target(0,15.2,0).
- hero/hero-satellite-noon-approach.png — 94aceb146ed213ac56b700910e89ac6d8c9f2eb8550684c6cab8d7108ca77cb8; noon; distance219.9999891674m, azimuth0.7853981634rad, polar1.2799997475rad, same target.
- sweep/satellite/block-az240.png — 3986380318d30d308ca237e3e73ff26ebac539dbc04e16c3c0b8a00c3ba5a3de; default dusk; manifest distance220m, azimuth−2.0944rad, polar1.28rad.
- sweep/satellite/overhead-az060.png — 0944745f10232b7e1437e2776602c63db68fba34a7cc72f756473e88d5d94c24; default dusk; manifest distance950m, azimuth1.0472rad, polar0.62rad.

After inspection, rehashed all four originals and verified each equals its unique frame entry in completed certificate run6cada51854bd129a, certified2026-10-19T00:30:03.566Z (44frames/3hardware lifecycles). Certificate SHAfe51a1b9c6b8f046860a6c97751a91aba6d14cc8e225dfab0d7f54e8e5a88c4c. Primary source hashes still662679d2… / d0b167fb… unchanged. All selected sweep records report44loaded/0unloaded; block25visible and overhead43visible are normal camera culling, not missing preparation.

This review covers four static Satellite viewpoints only. Required full22Satellite and basic style-return coverage belongs to the other root/reviewer on the same certificate/source; this report does not claim those images were personally inspected or establish motion, contact, population, FPS or exact startup latency. Final main revision/merge remains pending.

# Gate proofs

A gate that has never been made to go red is not yet a gate. Each entry below names the gate, the mutation that broke it, the failure the mutation produced, and where the gate landed.

`docs/learning/lessons.md` exists and holds two queued entries, neither retired, with their measurements in `docs/learning/lessons-evidence.md`.

The first queued entry is that a bone correction must use the same reference pose as the delivered full mesh; the gate that will retire it is full-mesh reference-palette correspondence, identity and single-joint perturbation against independently evaluated source geometry with a mismatched-reference red control, and that entry's own evidence calls the gate incomplete — one near-LOD probe, no accepted production repair. The second is that a process ancestry edge needs a live creation identity rather than a historical parent PID; `test/process-ownership.test.ts` passes six fake-CIM cases on Windows and skips the whole group elsewhere, and its live capture with confirmed cleanup remains the unmet bound before it can retire.

Neither entry is a gate proof, so neither appears below: a lesson graduates into this file when its gate lands and is made to go red. Phase 0's findings did become gates and repo rules in the same commit that learned them, so nothing from Phase 0 was ever queued; `lessons.md` was created on 2026-09-15 by `cc108bd`, and the sentence this replaces was written on 2026-09-06 by `74d0df1` and went on saying there was no such file for eight days. Entries here still stand on their own: they are what proves each gate can fail.

## The visual gate catches a camera that does not move

**Gate:** `npm run visual` — `OrbitDriver.orbitTo` in `tools/visual/orbit.ts`, plus the pairwise azimuth and signature-distance assertions in `tools/visual/sweep.spec.ts`.

**Landed:** Phase 0, 2026-09-06.

**Mutation:** `controls.enableRotate = false` in `src/render/camera.ts`, so drags on the canvas no longer rotate the camera. Nothing else changed.

**Failure:**

```
Error: The controls would not reach azimuth 0.000 rad, polar 1.470 rad after 8 corrective drags.
They stopped at azimuth 0.785, polar 1.068. If the polar angle is pinned, the requested elevation
is outside the controls' own clamp.
```

Exit status 1.

**Why this one matters most.** This is the mutation a harness that assigns the camera pose would pass. Setting `camera.position` still moves the camera with `enableRotate` off, so such a harness would capture twelve correct-looking frames and report the scene as fine while every drag in the app did nothing. The gate caught it because the camera moves only through synthesised pointer input.

The zoom in the same run still reached 115 m, which is right: the mutation disabled rotation and not dolly, and the gate failed on exactly the axis that broke.

## The visual gate catches a frame that did not render

**Gate:** `npm run visual` — the `luminanceSpread` and `distinctColours` floors in `tools/visual/shots.ts`, measured off the saved PNG by `tools/visual/png.ts`.

**Landed:** Phase 0, 2026-09-06.

**Mutation:** the five `scene.add(...)` calls in `src/app.ts` wrapped in `if (false)`, so the renderer draws its clear colour and nothing else. The loop still runs and still counts frames.

**Failure:**

```
Error: ...\artifacts\visual\street-az000.png is uniformly flat (luminance spread 2.84),
which is what a frame that did not render looks like
Expected: > 6
Received: 2.8374693096274726
```

Exit status 1.

**Bound.** The empty scene measured 2.84 rather than 0 because the attribution overlay is still drawn over it. Real frames measured 17.98 at the worst. The floor of 6 sits between those two numbers, so it separates "rendered" from "did not render" and nothing finer. It would not notice a frame that rendered the wrong thing.

**Re-measured in Phase 1, 2026-09-06.** Item 8 replaced the placeholder overlay with the real attribution surface, which changes the only thing drawn on an empty scene and therefore changes this bound. The same mutation was run again and the empty frame now measures **2.20**, with the failure reading `street-az000.png is uniformly flat (luminance spread 2.20)`. Exit status 1. Real frames in the same build ran 18.0 to 36.9. So the gap either side of the floor widened rather than narrowed, and the gate still separates the two cases. The number is a property of the overlay, not of the scene: anything that grows or brightens `src/ui/attribution.ts` must measure it again.

## The visual gate reports a boot failure instead of a timeout

**Gate:** `npm run visual` — `OrbitDriver.waitForFirstFrame` in `tools/visual/orbit.ts`, reading the `#boot-error` element and the bridge's `error` field.

**Landed:** Phase 0, 2026-09-06.

**Mutation:** the canvas in `index.html` renamed from `id="scene"` to `id="scene-RED-GATE-PROOF"`, so the app has nowhere to draw.

**Failure:**

```
Error: The app reported a boot failure on the page:
The scene did not start.

No <canvas id="scene"> is in the document, so there is nowhere to draw. index.html must contain it.
```

Exit status 1, in seconds rather than at the ten-minute test timeout.

**What it proves.** A harness that only waits for a bridge that never appears reports "did not run" as a timeout, and a timeout says nothing about which of a dozen causes produced it. This path carries the app's own message out to the test report.

## The visual gate refuses to photograph another app on the preview port

**Gate:** `npm run visual` — `OrbitDriver.assertServingThisApp` in `tools/visual/orbit.ts`, comparing the page's `app-id` meta tag against the one `index.html` carries. It runs at the top of `waitForFirstFrame`, before anything is waited on or captured.

**Landed:** Phase 0, 2026-09-06, in `74d0df18f79cac9cd392c840f27f181482857cfd`. Proved red 2026-09-06 from `c35ae775e51474e922a6fbee1c09d218c72a1e05`.

**Mutation:** the two other fixes undone, and nothing else. `preview.port` in `vite.config.ts` from 4319 back to Vite's 4173 default, `PREVIEW_URL` in `playwright.config.ts` from `http://127.0.0.1:4319` back to `http://127.0.0.1:4173`, and `reuseExistingServer` from `false` back to `true`. Phase 0 had it as `!CI` rather than a literal `true`; with `CI` unset those are the same value, and this ran with `CI` unset. The check itself was left alone, because it is the thing under test.

No decoy app was needed and none was written. aoe2's `vite preview` was live on 4173 while this ran — the same sibling app the gate photographed the first time — so this is the original two-part failure and not a staged stand-in for it: the fleet's shared default port, plus a Playwright that attaches to whatever answers on it.

**Failure:**

```
Error: Port 4173 is serving a different app, so this run would photograph that one.
http://127.0.0.1:4173/ carries meta app-id absent and the title "AoE2 Prototype".
This gate captures only a page whose <meta name="app-id"> is "maps-shibuya-1km".
Free port 4173, or point the gate at the port this app previews on, and run it again.
```

Exit status 1, after 462 ms, with `artifacts/visual/` left empty.

**What it proves.** Playwright reused aoe2's server without a word, exactly as it did in Phase 0, and the run refused anyway. The gain is in what the failure says and when. Phase 0's run sat for ten minutes waiting for a bridge that page was never going to publish and then reported a timeout, which says nothing about which of a dozen causes produced it; this one stops in under a second and names the app it found.

**Bound.** The check compares one string, so it separates another app from this app and nothing finer. A stale build of *this* app answering on the port carries the same `app-id` and sails through. `reuseExistingServer: false` is what covers that case, and it has not been proved red.

**A claim this run did not support.** `docs/devlog/summary.md` says the first sweep "photographed a sibling repo's app", which reads as twelve captured frames and a green run. The detailed entry for the same day records what actually happened: a ten-minute wait for `window.__mapsHarness` and a timeout, with no frames written. This run matches the detailed account — `artifacts/visual/` was empty when it failed. A wrong-app run has never produced a passing sweep here, and nothing in this repo shows that it could.

## The coordinate gate catches a mirrored city

**Gate:** `npm test` — `test/aoi.test.ts`, checking `tools/geo/plane-rectangular.ts` and the composed chain through `planeRectangularToWorld`.

**Landed:** Phase 1, 2026-09-06.

**Mutation:** the two return values of `geographicToPlaneRectangular` transposed, so the function hands back the easting as the northing and the northing as the easting. That is the EPSG:6677 northing-first trap written out literally. Nothing else changed.

**Failure:**

```
× projecting into EPSG:6677 > lands the Scramble Crossing on its measured coordinates
  → expected -12026.816802151134 to be close to -37768.561, received difference is 25741.744197848868, but expected 0.0005
× the whole chain, latitude and longitude to scene metres > is not mirrored: Shibuya Scramble Square lands south-east of the crossing
  → expected -25873.97263837627 to be greater than 0
× projecting into EPSG:6677 > is northing-first: going north moves the northing and leaves the easting alone
  → expected 1.4996061942456436 to be greater than 1000
```

Nine of fifteen tests failed. Exit status 1.

**Why this one matters.** A transposed Shibuya renders perfectly: right scale, right buildings, right terrain, reflected about a diagonal. Nobody in this fleet knows the skyline well enough to notice it backwards, and every other gate in the repo goes green on it — the visual gate would photograph twelve mirrored frames and report distinct, non-blank images, because that is all it measures. There are two independent chances to make this mistake, since CityGML's `posList` is latitude-first and EPSG:6677 is northing-first, and the mutation above is only one of them.

**Bound.** The gate checks the projection and the axis mapping against four measured points and the box's size. It says nothing about whether loaded data is placed correctly, which is Phase 2's problem and needs its own gate.

A second bound worth naming, because it is luck rather than design: the "measures 997.1 by 997.3 metres" assertion also caught the transposition, reporting 997.297 where 997.1 was expected. It could only do that because the box is 0.17 m wider than it is tall. A square AOI would have made that particular assertion blind to a transposition while still passing.

## The elevation gate catches a vertical datum that has slipped

**Gate:** `npm test` — `test/elevation.test.ts`, comparing `tools/geo/plateau-tin.ts` against `tools/geo/gsi-elevation-tile.ts` at the crossing, over the two fixtures in `test/fixtures/`.

**Landed:** Phase 1, 2026-09-06.

**Mutation A**, on the PLATEAU half: `sampleTin` returns the interpolated height plus 36.8772, the GSIGEO2024 geoid undulation at the AOI centre. This is what reading orthometric heights as ellipsoidal does, and it is the specific failure the cross-check was built to catch.

**Failure:**

```
× the PLATEAU terrain TIN > reads about 15.2 m of ground at the crossing
  → expected 52.07583360361154 to be close to 15.2, received difference is 36.87583360361154, but expected 0.5
× the two surveys against each other > agree at the crossing, which is what says the vertical datum is shared
  → expected 36.89583360361154 to be less than 0.5
```

Three of seven tests failed. Exit status 1.

**Mutation B**, on the GSI half: `decodeElevation` replaced with Mapbox Terrain-RGB, `-10000 + packed * 0.1`, which is the encoding a reader reaches for by habit and is the wrong one for a GSI tile.

**Failure:**

```
× GSI elevation tiles > uses GSI's own encoding, not Terrain-RGB and not Terrarium
  → expected -9848.2 to be close to 15.18, received difference is 9863.380000000001, but expected 5e-7
× the two surveys against each other > agree at the crossing, which is what says the vertical datum is shared
  → expected 9863.398633603612 to be less than 0.5
```

Three of seven tests failed. Exit status 1. Both halves of the comparison have now been made to fire, so neither is carrying the other.

**Why it matters.** Terrain that is uniformly 36.877 m too high looks exactly like terrain. Buildings would sit on it correctly, the valley would still be a valley, and every frame would pass review. The only thing that separates the two cases is a second, independent survey of the same ground — which is what GSI is for here, and the whole reason the plan's item 7 keeps GSI after moving terrain to PLATEAU's own TIN.

**Bound.** One point, at the crossing, against one vintage of each source. It proves the parse, the tile maths and the encoding agree with an independent survey at that point. It does not prove the TIN is right anywhere else in the AOI, and it says nothing about the terrain mesh Phase 2 will build from the TIN — a mesh with its winding order reversed would pass this and render inside out.

## The sentinel gate catches PLATEAU's "no value" read as a measurement

**Gate:** `npm test` — `test/sentinel.test.ts`, checking `readMeasuredHeightM`, `readStoreysAboveGround` and `assertNoSentinels` in `src/world/building-attributes.ts`, over the real batch table in `test/fixtures/plateau-batch-table.b3dm`.

**Landed:** Phase 2, 2026-09-06.

**Mutation:** the body of `readMeasuredHeightM` replaced by `return Number(raw);`, which is what a reader written without knowing about the sentinels does.

**Failure:**

```
× reading PLATEAU's building attributes > refuses the CityGML sentinels, which are numbers and not measurements
  → expected -9999 to be undefined
× reading PLATEAU's building attributes > refuses the 3D Tiles form of the same fact, which is null and not −9999
  → expected +0 to be undefined
× a real PLATEAU batch table > yields a building index with no sentinel in it
  → expected [] to have a length of 4 but got +0
```

Three of ninety-six tests failed. Exit status 1.

**Why the middle one matters most.** −9999 is the sentinel everybody looks for, and it is not in the bytes this scene is built from. MLIT's pre-converted tiles cannot hold a missing value in a binary batch-table column, so those buildings read `null` — and `Number(null)` is **0**, not NaN and not −9999. The same defect therefore arrives as a building of no height rather than a building nine kilometres underground, which looks like bad modelling instead of a units bug. The fixture is real PLATEAU bytes for exactly this reason: a synthetic one would have been written with the sentinel the author expected.

**Bound.** This covers the reader and the placement validator over one tile of 17 buildings. It says nothing about the other 1,723 in the box — `npm run data:scene` does that, over all of them and against PLATEAU's own CityGML, and refuses to write an index that fails `assertNoSentinels`. What this gate proves is that the function it calls can fail.

## The placement gate catches glTF's up axis

**Gate:** `npm test` — `test/placement.test.ts`, checking `tools/geo/ecef.ts` and `GLTF_Y_UP_TO_Z_UP` in `tools/tiles/b3dm.ts` against the `CESIUM_RTC` centre `design.md` measured and against a local east-north-up frame built by differencing the ellipsoid.

**Landed:** Phase 2, 2026-09-06.

**Mutation:** `GLTF_Y_UP_TO_Z_UP` replaced by the identity matrix — the turn left out, which is the defect exactly as it happened.

**Failure:**

```
× the linear placement a tile is given > turns a glTF up into a world up
  → expected 38.39891419989702 to be close to 100, received difference is 61.60108580010298, but expected 0.05
× the linear placement a tile is given > keeps a horizontal step horizontal and the right length
  → expected 84.54115106934934 to be less than 0.5
```

Two of ninety-six tests failed. Exit status 1.

**This is not hypothetical.** It is what the first build of this scene did. 3D Tiles content is Y-up in the glTF convention over data that was Z-up in ECEF, and a runtime is expected to turn it. With the turn missing, every building landed a median of **68 m** from where its own batch table puts it, up to 122 m — and the city still rendered: right place, right scale, buildings lying on their sides at a plausible angle over the correct street pattern. The offline reconciliation caught it (22 m of horizontal residual against a 2 m tolerance) before anything was looked at.

The mirror image of the same mistake happened next and this gate cannot catch it: with the turn folded into each tile's matrix, `3d-tiles-renderer` applied its own on top, because a tileset that says nothing about `asset.gltfUpAxis` is assumed to be Y-up. The city came back tilted again. The fix is that `tools/tiles/tileset.ts` now writes `gltfUpAxis: "z"`, and what catches it is the visual gate's drawn-geometry bounds, below.

**Bound.** These are the transforms in isolation, against measured constants. They cannot see whether the pipeline applies them to the right tiles, and they cannot see a second application at load time.

## The visual gate catches a city that loaded and did not draw

**Gate:** `npm run visual` — the `drawnBounds`, `drawnTriangles` and `visible` assertions in `tools/visual/sweep.spec.ts`, reading the tile status the harness bridge publishes in `src/harness/bridge.ts`.

**Landed:** Phase 2, 2026-09-06.

**Mutation:** none was needed. Both of these were found by the check firing on a real defect during Phase 2, and both are recorded here as the failures they produced rather than as failures staged afterwards.

**Failure one — the tile cache too small to hold a leaf.** `lruCache.maxBytesSize` was set to 48 MB, reasoned from the 137 MB the tiles weigh on disk. The cache counts **decoded** bytes, and 25 of the 67 tiles carry a 4096x4096 atlas which is 89 MB each with mipmaps. Measured result: all 67 tiles downloaded, seven produced a model, and the traversal never refined past the root, because a `REPLACE` parent keeps displaying until every used child has loaded and a cache that cannot hold the children never lets that happen. The app reported `idle: true`, `error: null`, `loaded: 7`, `visible: 1`, and drew the root tile's seventeen decimated buildings over the whole ward.

Every pixel measure in the sweep passed on those frames. The terrain and the roads were still there, so the luminance spread, the colour count and the pairwise signature distances were all comfortable — the frames were a correct map of Shibuya with no buildings on it. `drawnTriangles` was 663.

**Failure two — the up-axis turn applied twice.** `drawnBounds` read `y: −678 to 748` where every building in the area of interest stands between 8.7 m and 245.6 m above sea level, and `z` spanned 460 m where the tile set covers about 1,400 m. The frames looked like a city seen through a shear.

**What these assertions add.** The floors that were already here separate a rendered frame from an unrendered one and nothing finer, and this is the first check in the repository that looks at what is in the scene rather than at what reached the framebuffer. Both defects above left the tileset reporting itself loaded, idle and error-free, and both would have shipped.

**Bound.** It measures the bounding box of the drawn building geometry and the triangle count, against a band that runs −20 m to 400 m vertically and 2.5 km horizontally. That separates a city on the ground near the crossing from one that is underground, floating, sheared or absent. It cannot tell one block from the next — the landmark check in `npm run data:scene` is what pins that, against Shibuya Scramble Square, Hikarie and Shibuya Stream at their published positions and heights.

## Fractional tile accounting can prevent disposal from terminating

**Gate:** `test/tile-memory.test.ts`, using `test/fixtures/lru-disposal.mjs` and the actual `3d-tiles-renderer` 0.5.2 LRU implementation. Recorded during the 2026-09-08 renderer recovery and checked again on 2026-09-11.

**Control:** estimates 0.1, 0.2 and 0.3 are removed in a different order from insertion. The floating total is 0.6000000000000001; subtraction leaves 1.1102230246251565e-16 after the cache has no items. The upstream zero-budget unload keeps looping. A separate child with a two-second watchdog reproduces this as `ETIMEDOUT`, so the intentional hang cannot trap the test runner. The repaired child applies the existing estimator through `wholeByteAccounting`, removes all three items and reports zero remaining bytes. No dependency patch or omitted disposer is involved.

**Bound:** this is the actual upstream reordered-fraction disposal class over three items. The separate controls-driven browser lifecycle sequence switches both styles, moves crossing/approach and navigates from dusk to noon; its repaired candidate-2 run passed in 36.5 seconds with a 15-second navigation bound. That sequence does not establish every possible navigation, device or future upstream version. The original stalled trace and candidate bytes remain retained for the active handoff.

## The complete visual evidence check catches erased or changed captures

**Gate:** `test/visual-evidence.test.ts` calls `verifyVisualRun` over an explicit synthetic 44-image set: eight hero frames plus eighteen sweep frames per style. Its list is stated independently from the wrapper's expected names.

**Red controls:** delete an earlier hero image (`ENOENT`); append bytes to a captured image (`changed after capture`); date a specification manifest before the run (`Stale visual manifest`); alter the frozen build (`build changed during capture`). Restoring the original inputs passes. These controls reproduce the evidence classes that the former shared-directory sweep cleanup missed. The inherited baseline logged 22 captures but retained only 18 new image files; older preserved hero frames remain separate evidence.

**Bound:** filenames, freshness, native dimensions and exact bytes across the complete output set. Synthetic images do not prove scene quality. The final integrated 44-frame run and native inspection are still pending; a passing hero-only candidate cannot inherit that claim.

## Normal-pass material restoration survives a failed draw

**Gate:** `test/normal-pass.test.ts` exercises the shipping `withNormalMaterials` swap with ordinary geometry, a registered agent normal material, a material array and a pre-existing scene override. It runs both a successful callback and an intentionally thrown `forced draw failure`; every original material reference and scene override is restored. An animated mesh without a registered normal material throws a named error instead of silently drawing its unanimated geometry.

**Bound:** material selection and restoration around one draw callback. The upstream GTAO adapter, actual shader compilation and moving VAT ambient-occlusion/shadow pixels still need populated browser verification. This proof is not an agent graphics acceptance.

## Not yet proved red

Three failure paths are written and reachable and have never been watched to fire. They are code, not evidence, and a later phase that relies on one should make it go red first.

- **WebGL unavailable** — `createRenderer` and `waitForFirstFrame`. Forcing headless Chromium to refuse a context without also breaking the page some other way needs a launch-flag combination that was not worth chasing in Phase 0.
- **The render loop stopping mid-sweep** — the stalled-frame-count branch in `OrbitDriver.settle`. Needs the loop to die after the first frame, which no natural failure in Phase 0 produced.
- **The camera never settling** — the poll-limit branch in `OrbitDriver.settle`. Would need damping turned off or a control that oscillates.


## The visual gate's certificate cannot be issued for a run that did not happen

**Gate:** `npm run visual` — `tools/visual/verify-output.ts` (`resetVisualRun`, `beginVisualRun`, `certifyVisualRun`, `lifecycleEvidence`, `sceneTreeDigest`, `pixelLaneRefusal`, `visualRunPhase`), the chain in `package.json`, `tools/visual/lane.ts`, `tools/visual/lifecycle-record.ts`, `tools/visual/lifecycle.spec.ts` and `src/harness/teardown.ts`. Pinned by `test/visual-instrument.test.ts` (31 cases), which drives the wrapper's own functions over synthetic runs it writes itself.

**Landed:** 2026-09-16 on `main` at `f4e96f0`, from `966930e`. **Correction, 2026-09-16:** this paragraph used to end "**Not merged.**", with the landed-by line naming the `artifacts/gate-integrity` worktree and branch `worker/gate-integrity` off `0ae46df`. The worktree and the branch are both gone — the reclamation pass removed them on 2026-09-16 — and the code, the `package.json` chain and all five checks are on `main`, so a reader taking that sentence at face value would look for a fix that is already in the tree. The same worktree's `mutation-logs/` path below no longer resolves, and the mutation commands are quoted verbatim in each entry so the controls can be rebuilt; the reclaimed lane's own record is `artifacts/reclaim/`. The five findings come from `artifacts/instrument-review/review.md` and were confirmed unfixed on what was then `main` by `artifacts/record-repairs`. Every mutation below was run by `probe/mutations.mjs`, which rewrites one tracked file, runs the named case, records the failure and restores the file byte-for-byte; the logs were under the now-reclaimed `artifacts/gate-integrity/mutation-logs/`.

Each of the five exists because the instrument could report "passed" for a run that did not run, which is the failure mode this repository has now been caught by three times.

**(1) A failed build left an earlier success artifact.** The chain ran `npm run build` before `node tools/visual/verify-output.ts --begin`, and the deletion of `complete.json` was inside `beginVisualRun`, so a build failure stopped the `&&` chain with the previous certificate still on disk. The chain is now `--reset` → `npm run build` → `--begin` → both lanes → `--end`, with `--reset` ahead of the build, and a bare `node tools/visual/verify-output.ts` is refused rather than re-certifying whatever run is on disk.

**Mutation:** `--reset` moved after `npm run build` in `package.json`.

```
× the gate's chain claims the run before the build clears the previous certificate ahead of the one step that can fail before any capture
AssertionError: --reset is the gate's first step: expected 35 to be less than 0
```

Exit status 1. **Behavioural red control** (`node probe/gate-chain.mjs p1-stale-certificate`): a fixture holding `complete.json` with `completedAt 2026-09-14T00:30:00.000Z` and a build step that fails. Under the new order the certificate is **absent** after the chain; under the old order it is still there and still says `2026-09-14T00:30:00.000Z`. Nothing else differed between the two arms.

**Bound.** The case reads the *order of the steps* in `package.json`; it does not execute the chain, and the probe's failed build is a thrown error with `cmd`'s semantics rather than a real Vite failure. What is proved is the ordering property and that the deletion happens in a step that precedes the build. One residual: if `--reset` itself fails, the chain stops with an earlier certificate still present — nothing ran in that case and the run exits non-zero, but the file is not removed.

**(2) `complete.json` carried no lifecycle evidence.** The certificate was the pixel lane's word alone, so a run whose lifecycle invocation was dropped, skipped or misconfigured still reported success. `certifyVisualRun` now requires three lifecycle records newer than this run's own start, each naming a non-software renderer, carrying an empty page-error list and a completed teardown record, and hashed against this run's build bytes; the certificate carries them plus both renderers.

**Mutation:** the `lifecycleEvidence` call replaced by a literal.

```
× certification requires the hardware lifecycle lane's own evidence refuses a run whose lifecycle invocation never happened
Error: promise resolved "undefined" instead of rejecting
```

Exit status 1. **CLI red control** (`node probe/gate-chain.mjs p2-lifecycle`), where a healthy 44-frame fixture carries no lifecycle records at all:

```
The hardware lifecycle lane left no records in <root>\lifecycle: ENOENT: no such file or directory, scandir '<root>\lifecycle'. The wrapper does not certify the pixel lane alone, so a run whose lifecycle invocation never happened must not report success. Re-run the gate with `npm run visual`.
```

**Bound.** The check proves three conforming records for this build exist and postdate this run's start. It cannot prove they came from this process tree: their timestamps are the only identity a record carries, and `artifacts/visual/lifecycle/` deliberately keeps earlier runs' records, which is why the freshness filter is the whole check. It also refuses records written by an older specification, so the four records already on this machine cannot certify under the new wrapper.

**(3) The build-hash binding excluded the scene data.** `dist/` bytes do not determine the frames: the same build draws a different city against a different `data/scene/`. `beginVisualRun` now pins a digest over every file `/scene/` and `/network/` will serve, `certifyVisualRun` re-derives it before reading a single frame, and the certificate carries it.

**Mutation:** `await assertSceneUnchanged(scene, sceneMounts)` replaced by `void scene; void sceneMounts;`.

```
× the scene data's identity is bound into the certificate refuses to certify when the scene changed during capture
Error: promise resolved "undefined" instead of rejecting
```

Exit status 1. **CLI red control** (`node probe/gate-chain.mjs p3-scene`), same build bytes in both arms, one served scene file changed between them: digest `519a5e65f4a8…` becomes `89db4ac9f585…` over the 137-file payload as it stood on 2026-09-16 before the rebuild, with `dist/index.html` hashing `bc09c00c…` in both runs. (Both digest values are properties of that payload, which no longer exists — see the bound in "The scene digest sees a served file rewritten in place" below.)

**Bound.** The digest is now over the path each file is served at and the SHA-256 of its bytes (`f4e96f0`, 2026-09-16), so it sees a byte rewritten in place with both its length and its mtime preserved; the two digest values above were taken with the pre-`f4e96f0` metadata digest, which could not, and they do not reproduce. What it cannot report is a file changed and changed back between its two calls, which is a difference no digest taken at two instants can see. It covers exactly the two mounts `tools/vite/serve-scene-data.ts` answers, so data the app does not serve is outside it by construction. The red control for the byte binding is "The scene digest sees a served file rewritten in place" below.

**(4) The lifecycle lane asserted elapsed time only.** No console or pageerror assertion, so a page whose cleanup throws — and therefore finishes *faster* — passed.

The listeners were added (`tools/visual/page-errors.ts`, asserted empty after the replacement page has drawn). They are not sufficient, and this is the part the review's remedy would have got wrong: measured 2026-09-16 on this machine's Chromium 153.0.8010.12 (`probe/pagehide-visibility.mjs`), an exception thrown inside a `pagehide` handler reaches neither `page.on("pageerror")` nor `page.on("console")` nor CDP `Runtime.exceptionThrown`/`Log.entryAdded`, while the same throw from a click handler is reported normally in the same run. So the page records its own cleanup outcome (`src/harness/teardown.ts`, called from `src/main.ts`'s `pagehide` listener) and the lane refuses a record that is missing or names a failure.

**Mutation A:** the page-error assertion replaced by `void pageErrors;`.

```
× the gate's chain claims the run before the build writes the cleanup record from the page's own pagehide handler
AssertionError: the lifecycle spec asserts the page-error list is empty: expected '<lifecycle.spec.ts>' to match /expect\(\s*pageErrors/
```

**Mutation B:** the teardown assertion replaced by `void teardown; void teardownRecordRefusal; void TEARDOWN_COMPLETED;`.

```
× the gate's chain claims the run before the build writes the cleanup record from the page's own pagehide handler
AssertionError: the lifecycle spec asserts rather than records the outcome: expected '<lifecycle.spec.ts>' to contain 'teardownRecordRefusal('
```

Both exit status 1. **Executed red controls.** On the real production build through the real controls (`probe/capture.spec.ts`, port 4330, SwiftShader), a page whose app-registered `pagehide` handler is made to throw before the app's own chain runs records `"failed: TypeError: picker.dispose() is not a function"` in session storage, the reader returns a refusal naming it, and console/pageerror see nothing at all. On the unchanged app the same navigation records `"completed"`.

**Bound.** The listeners see what the page *reports*; an empty list is evidence that nothing was reported, never that nothing threw. The teardown record proves the `picker.dispose()` → `app.dispose()` chain returned: it cannot show that each disposer did useful work, and if session storage is unavailable the record is absent, which the lane treats as "did not report" and fails on. Both checks are asserted inside `lifecycle.spec.ts`, so they need a hardware machine and a full lifecycle run to execute for real; what has been executed here is the recorder, the reader and the listeners on the shipping bundle, not the spec's own assertion lines.

**(5) The pixel lane's renderer identity was recorded and never read.** `sweep.spec.ts` and `hero.spec.ts` wrote `glRenderer` into their manifests and nothing asserted it, so a Chromium that accepted `--use-angle=swiftshader` and drew elsewhere would have moved the reviewed 44-frame set silently. Both specs now refuse a non-SwiftShader renderer within seconds of their first frame, through `pixelLaneRefusal` in `lane.ts`, and `certifyVisualRun` asserts it again over every manifest it certifies.

**Mutation:** the wrapper's refusal replaced by `void pixelLaneRefusal;`.

```
× the pixel lane's renderer is asserted, not recorded refuses to certify a run whose sweep manifest names the hardware renderer
AssertionError: expected [Function] to throw error matching /not SwiftShader/ but got 'The pixel lane\'s manifests name 2 di…'
```

Exit status 1. **CLI red control** (`node probe/gate-chain.mjs p5-renderer`) with the satellite manifest naming the real RTX 4090 string:

```
Visual gate refused: sweep/satellite/manifest.json reports the renderer "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)", which is not SwiftShader. The 44-frame pixel set is comparable across machines only while every frame comes from the software lane the config pins (--use-angle=swiftshader); a set captured on another renderer cannot inherit a review written for this one, and there is deliberately no switch that moves this lane.
```

**Bound.** The predicate is only as strong as what Chromium reports: the unmasked `WEBGL_debug_renderer_info` string, or the masked fallback (`WebKit WebGL`) when the extension is withheld. The fallback is refused rather than passed, but it fails as "wrong renderer" rather than as "identity unavailable". The specs' own assertion fails fast and has not been watched to fire against a browser that actually drew on another renderer — what has been executed is the shipped predicate accepting the real first frame's SwiftShader string and refusing the hardware string in the same page (`probe/capture.spec.ts`), plus the wrapper's refusal above.

**Not yet proved red.** The three paths in "Not yet proved red" above are unchanged by this unit, and one is added: the scene digest is re-derived at certification and has been watched to fire against a file changed between the two hashes inside one synthetic run only — that firing was a movement of names, sizes or mtimes, which is all the pre-`f4e96f0` digest could see, and since `f4e96f0` the firing comes from the bytes themselves ("The scene digest sees a served file rewritten in place" below) — and not against `npm run data:scene` running during a real capture.




**Gate:** `test/network-review.test.ts`, `test/network-compound.test.ts`, `test/network-boundaries.test.ts`, `test/network-mesh.test.ts`, `tools/network/check-admission.ts` and `tools/network/check-boundaries.ts`. These are source/controller and supported-body checks, not populated traffic or visual proof. The promoted fixtures retain their source IDs, real path geometry, declared omitted successors and actual measured asset records.

**Landed:** reviewed Phase 6 network milestone, 2026-09-11. Reviews 0, 1, 3 and 5 and snapshots 0–3 remain permanent. No prior lesson prose is retired by this entry.

**Source mutations:** the exact rejected builder failed internal/cross-way continuations, conflict lateral links and missing physical/control metadata. Removing cross-way permission propagation admitted a forbidden straight movement. Skipping stop dwell wrongly granted actor `s`. Centre-only clearance released a vehicle while its tail remained inside. The real source dead-end/no-U-turn exclusion remained a passing control.

**F4 mutations:** the unchanged nineteen-test compound copy passed. One-pass grouping failed a newly exposed primitive pair; physical-gap release failed short vehicles, pedestrians, delayed signals and repeated laps; skipped dwell failed mapped/internal/later-lap stops; moving mapped stop distance to edge zero failed actual source and projection cases; ignored size limits admitted an oversized body; allowing backwards progress failed route occurrence checks. Each isolated mutant exited with semantic test failure. The old flat11.1m proof bounds remain historical.

**F5 mutations:** the unchanged eleven-test boundary copy passed. Eight isolated mutants each exited one: restored controlled-terminal rejection failed the actual vehicle and both walking endpoints; retiring before full body clearance failed all six terminal cases; leaving active set or leaving a lease failed atomic retirement; materializing before a grant failed the physical-only entrance; ignoring generation or displayed class failed unchanged-state checks; omitting body height from projection failed independent tilted-bus bounds. Raw copies and logs are retained under ignored `artifacts/network/f5-mutations/`, bound by the Review 5 candidate manifest SHA-256 `611b82612bd360a9815855a1d187fc3c8d90c53a2d1f32d043653a7e520b1545`.

**Decoder red proof:** against the original shared decoder, browser bytes and an offset Uint8Array passed while Node Buffer returned `7.185598589700907e+22` instead of `0` for the first position. Explicitly copying the selected byte view makes all three cases pass.

**Measured bounds:** all 77 vehicle exits with three generated tilted classes plus 33 walking exits produce 264 lifecycle traces; 264 reachable entry/class cases include49 initial authorities, six physical-only prefixes and28 ordinary entry handoffs. An independent review checked42 analytic body projections. The corrected true-exit route census constructs3,444 vehicle and408 walking passages. Supported diameter≤11.6m, primitive gap≥12.1m, route gap≥12.5m, 1/60-second clock and selected quarter/half-metre samples define these proofs. Dwell/yield/capacity values are supplied fixtures. Continuous steering, surface contact, queues and200-vehicle throughput remain outside the claim.

## F8 original texture mapping is checked through the actual plugin

**Gate:** `test/facade-emission.test.ts` uses the cached, SHA-256-bound `data/scene/buildings/data/data488.b3dm` through the full tile-plugin processing path, with image decoding mocked. It does not fetch or skip a missing tile. The supported original identity mapping is positive; channel 1, flipY, offset, rotation, repeat and manual-matrix variants are negative. The old plugin produced six semantic failures and seven passes; repaired plugin passes thirteen. `artifacts/graphics-milestone/f8-followup.json`, SHA-256 `ed18871383cec3c9dada5018844860e24a74316f603c55b29d858c75e2edfd64`, preserves exact source and red/green evidence. The tests do not claim actual shader pixels or other unbound atlases. No prior lesson is retired here.

## F10 paint uses finite checks against the source layer

**Gate:** `test/paint-support.test.ts` calls the real `createStreetDetails`, including every mapped zebra and continuous tactile feature in the pinned graph and actual road/pavement meshes. Bounds are source deviation ≤0.5 m, grid spacing ≤0.25 m, edge rise/run ≤0.5 and sampled plane residual ≤0.04 m beneath the 0.06 m paint lift. A ≤0.10 m same-level top allowance covers presentation overlap; it is not physical-layer or actor-contact authority. Strict misses alone may bridge opposed/bracketing nearly parallel triangle edges at gap ≤0.010 m and height disagreement ≤0.001 m. Every use retains edge IDs; every omitted part retains its source and reason. Sparse samples are not full-footprint support proof.

**Red controls:** the exact original Review 10 renderer emits unsupported stripes and the named real triangle still spans 7.545902252197266 m against the <0.25 m assertion. Pure-nearest selection chooses 15 rather than the positive overlapping top at 15.08 m. Removing the seam repair misses the eleven exact central probes. Enlarging seam width admits the 10.02 mm negative; enlarging height agreement admits the 10 mm layer difference; removing interior checks places the hole/ridge control. One-sided, nonbracketing and wrong-direction edges remain negative. Frozen variants/logs are `artifacts/graphics-milestone/f10-red/` and `f10-actual-red/`, bound by `f10-followup.json` SHA-256 `68dd6ce33865c61eb717725b82f94d5d803f40cc33668ffd3a5d7421aff59ca7`.

**Measured bound:** all 100 features retain some paint, with 65,984 triangles, 1,158/1,333 placed parts and 175 explicit omissions across 75 features. The hero diagonal retains 43/46 parts; omitted parts 0, 44 and 45 remain outside native acceptance beyond the two inspected framings. The formerly wrong-layer crossing has 552 triangles with maximum rise/run 0.227957. Twenty-eight seam queries reach 9.220701 mm width and 0.483680 mm height disagreement. Root accepted all eight hardware hero images at native 1280×720. These checks do not claim whole-area coverage, movement support or complete 44-frame acceptance.

## Fresh rendered observations and the camera-preservation baseline

**Gate:** `test/camera-settling.test.ts`, ten CPU cases through the actual observer/OrbitDriver and installed OrbitControls. The browser gate still must exercise both dropdown directions, keep the independent 5 mm comparison and inspect all 44 formal native frames plus two return images. No lesson entry is retired by this proof.

**Rejected controls:** the exact old OrbitDriver accepted one fresh interval plus three repeated observations, accepted camera/target translation of 100 mm per frame, and accepted a 100 mm radius change per frame at 950 m. The repaired source passes all ten focused tests. An isolated alias that reintroduces duplicate-frame votes fails two tests; replacing the strict world bound with the old normalized test fails four, including 7.582823 mm of remaining upstream camera travel against the independent 1 mm residual check. The actual atomic 373→379 trace pair measures 13.389196 mm of bounded path and receives zero quiet votes. The unchanged post-switch comparison rejects an injected 6 mm reset.

**Bounds and evidence:** ignored `artifacts/graphics-milestone/software-first/` preserves the failed ordinary run, exact pre-repair driver, original trace, compact observations, public-pointer upstream replay, rejected initial event-mapping prototype and isolated mutation logs. The fixture initializes its camera before controls exist, uses the actual rig's damping configuration and does not launch Chromium or prove DOM input. Simulated clocks make stopped and continuously moving waits fail at measured 15 s and 300 s after completed observations. Independent review also held an evaluate unresolved beyond 300 s: the inner polling check did not cancel it, and only after the RPC returned did it report timeout. Outer Playwright test/stage and owned-runner deadlines bound an unresolved call; the repaired browser path remains unverified. The older statements about unobserved live stopped-loop/nonsettling failures remain historical; these new checks are CPU cases, not those live mutations.

## The lifecycle check runs on the renderer it is about, and the software path is red

**Gate:** `playwright.lifecycle.config.ts` runs `tools/visual/lifecycle.spec.ts` on the hardware renderer (ANGLE/D3D11) as the second lane of `npm run visual`, with the software pixel lane excluded from it (`testIgnore`) and this lane excluded from the pixel lane. The spec reads the unmasked `glRenderer` from the frozen harness before the expensive preparation and fails when it names a software rasteriser, so the split cannot be satisfied by a silent fallback. The URL, the preparation through both styles and both hero poses, the viewport and the 15 s navigation / 60 s replacement bounds are unchanged from the check that was red.

**What was red, and why the instrument was corrected.** On 2026-09-15 the unchanged check failed under the default software rasteriser: 18.4 minutes, `page.goto('/?time=noon', { timeout: 15000 })` waiting on `load`, trace SHA-256 `2C2A999046828303DFD6B9DA859AAE1E705B045901D289BA5A663345305ED8D3`. Stage localisation showed the same wait failing with `waitUntil: "commit"` at 15,016 ms and the replacement document's own document-start script running only at +27.87 s (`performance.now() = 28,760.7 ms`). Three attribution arms then separated the cost from the application: the app's own `pagehide` work (`picker.dispose()` plus `app.dispose()`) spans 2.4 ms with no context loss, 4.3 ms of app work when `WEBGL_lose_context.loseContext()` is forced inside `pagehide` (whose handler then spans 30,453 ms), and 2.1 ms on hardware, where the untouched check passes in 32-110 ms of navigation. Raw records: `software-no-context-loss.json` SHA-256 `EB4E2E1784E074446BE676350371DDF7F7BF2D1878FD52A68786AD043E7A4E3E`, `software-context-loss.json` `5025E5C052B0537E7C1A604282479287043A2AF3F72B4C566872925E070F3AD8`, `hardware-no-context-loss.json` `CDDAF31D3FA83BAF7D03A22AC29796C68CEEAC3C1F1A8B727B46DB423249C4EE`.

**Claim at its true resolution:** the block sits outside the page's JavaScript, in the renderer's SwiftShader teardown path for the outgoing context. Nothing separates destruction of the context's resources from draining the last in-flight frames, and the cost is not shown to be independent of resource count: the 2026-09-13 trace of the same failure recorded SwiftShader with 65 loaded tiles, `cachedBytes` 630,155,033 and `gpuBytes` 317,190,172. The SwiftShader red baseline stays reproducible with `npx playwright test tools/visual/lifecycle.spec.ts` against the software config, and a hardware-less machine reports this check unavailable rather than passing it.

**Red controls.** (1) `artifacts/graphics-milestone/worktree/artifacts/lifecycle-software-red/playwright.lifecycle-software.config.ts` is an ignored diagnostic copy of the lifecycle config forced onto SwiftShader: the real spec exits 1 in 603 ms through the renderer assertion, `Chromium reports "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)"`, log `artifacts/lifecycle-repair-20260915/gate-run/red-control-software.log`. (2) Removing the begin-time deletion in `beginVisualRun` makes `test/visual-evidence.test.ts` fail its `clears the previous complete.json` case with the stale artifact still present (`{"completedAt":"2026-09-14T00:00:00Z"}`), log `artifacts/lifecycle-repair-20260915/gate-run/red-control-stale-complete.log`; the deletion was restored and the gate re-run green.

**Bound:** one machine - the hardware arm is one RTX 4090 over D3D11, and the SwiftShader numbers are one scene at one resource count on the same machine. Hardware stability across repeats and drivers is not established here; the gate's three consecutive lifecycle invocations are what carry that, and they are recorded per run. The disclosed SwiftShader bound must be re-measured when the scene changes materially (populated agents, larger atlases). The old 2026-09-08 "36.5 seconds" claim in this file and in the defect register names no rasteriser and no raw record was found; it is annotated there as unverified.

## The lifecycle gate catches a leak on the boundary retirement path

**Gate:** `npx vitest run test/population-lifecycle.test.ts` — the case "goes red on the boundary retirement path, which is the only one its vehicles retire through", driving `populationInvariants.leakRetiredBody` in `src/agents/population/tick.ts` over the delivered network.

**Landed:** 2026-09-16 on `main` in `27b5957`, off `86b5a70`; `artifacts/gate-repair/wt` is that lane's own copy and not a statement about the merge. This line read "Not merged; the worktree is `artifacts/gate-repair/wt`" until 2026-09-16 and it was false when it was written here: `27b5957` landed the case and its guards, and `7c6bd95`, its immediate child, copied the gate-repair record onto `main` byte-identically, that line included. On `main` at `04be817` the case is `test/population-lifecycle.test.ts:89-123`, the seam it guards is `src/agents/population/tick.ts:641-642,745,756,1423,1437`, and `npx vitest run test/population-lifecycle.test.ts` passes 3 tests in 2.3 s.

**What the gate could not see.** The mutation guarded `retireSlot` in `finishVehicle` and in `retirePedestrian`, and the boundary retirement path in `lifecycle()` retired its body unguarded. Every vehicle retirement the fixture reaches goes through that envelope and none goes through `finishVehicle` (`retiredInPlace` is 0 in every run taken), so the mutation had nothing to leak for a vehicle. Measured on `main` with a census probe that drives the shipped population unchanged:

```
=== vehicles only, 40 of them: pedestrians 0, vehicles 40, 1200 warm-up then 4800 ticks ===
  warm-up retirements: total 3, of which vehicles 3 (boundary 3, in place 0)
  control (mutation off):
    retirements in the window: 24 total = vehicles boundary 24 + vehicles in place 0 + pedestrians 0
    first failure: tick -1
    message: <no failure>
  mutated (leakRetiredBody on):
    retirements in the window: 24 total = vehicles boundary 24 + vehicles in place 0 + pedestrians 0
    first failure: tick -1
    message: <no failure>
```

24 vehicle retirements with the mutation on, identical to the control's 24, no failure at any tick. The mutation was a no-op on the only path its vehicles retire through.

The gate was green on `main`, and that green is the failure this file exists to record. With 60 pedestrians in the fixture a walker leaks first, so `goes red when a retired body is left present` passed for a reason that has nothing to do with the vehicle path. Its message names no body at all:

```
Population lifecycle conservation failed: 71 of 72 slots agree between a present body and a planned route.
Spawns 69, retirements 5, active 65, prepared 0. A slot with a route and no body, or a body with no route, is a leak.
```

**Mutation A, the obvious one, and why it is not the fix.** Guarding `retireSlot` in the boundary path, as the reachability lane did, changes nothing. `JunctionAdmissions.retireBoundary` clears the slot's active byte itself (`src/network/admissions.ts:161`), so that call is already a no-op on the shipped path. Measured with only that guard in place: the vehicles-only arms above still report 9 and 24 retirements, no failure, no leak.

**Mutation B, the one that works.** The mutation restores the presence the authority just cleared — `table.poses.vehicles.active[slot] = 1` — and the boundary path stops re-planning the retired slot in the same phase. Re-planning healed the leak before any conservation reading could see it, because `lifecycle()` drains its plan queue in the tick it retires. That second half is measured too: with `retireSlot` guarded and the plan queue left alone, the same 24 retirements leaked nothing.

**Failure, with the mutation firing.** The named per-slot conservation check, not the aggregate one:

```
Population lifecycle conservation failed: vehicle slot 0 is present in the pose buffers with no planned route.
A body was retired without clearing its slot.
```

**Failure, with the seam reverted.** The point of the case is that it can fail. Restoring `main`'s boundary path and running the gate:

```
 ❯ test/population-lifecycle.test.ts (3 tests | 1 failed) 5539ms
   ✓ lifecycle conservation > keeps spawns equal to retirements plus active, with no leak over a long run  3440ms
   ✓ lifecycle conservation > goes red when a retired body is left present  861ms
   × lifecycle conservation > goes red on the boundary retirement path, which is the only one its vehicles retire through 1237ms
     → the leak mutation retired a vehicle through the boundary envelope and nothing noticed: expected null not to be null

 FAIL  test/population-lifecycle.test.ts > lifecycle conservation > goes red on the boundary retirement path, which is the only one its vehicles retire through
AssertionError: the leak mutation retired a vehicle through the boundary envelope and nothing noticed: expected null not to be null
 ❯ test/population-lifecycle.test.ts:120:114
```

Exit status 1, in 6.6 s. The two cases above it stayed green, which is the finding: the gate's original red case cannot see this path at all.

**Why the second case drops the pedestrians.** With walkers present the mutation leaks a walker first — tick 1330 against the vehicle path's 1251 — so a case asserting only "something failed" is satisfied by a body that never went through the boundary envelope. Removing them leaves the envelope as the only retirement path, which makes an unfixed seam fail rather than be covered for. The case also requires the failure to name the vehicle by slot, so a walker leak could not satisfy it even if one appeared.

**Bound.** One delivered network at seed `0x5b1b0a`, 12 vehicles and no pedestrians, 1,200 ticks of warm-up and 4,800 mutated, `retiredInPlace` 0 throughout. It pins that the mutation can reach the boundary retirement path and that the population notices when it does. It says nothing about `retireBoundary` itself; nothing about the `finishVehicle` in-place path, which no run in this fixture reaches and which is still covered only by the older case; and nothing about the 3,000-pedestrian acceptance bound, where conservation is read from `status()` rather than from any mutation.

## The rendered signal lenses follow the phase, and the four defects this lane fixed are gated

**Gate:** `test/signal-lenses.test.ts` for the colour mapping, `test/human-lod-counts.test.ts` for the drawn LOD counts, `test/loop.test.ts`'s hold case for the simulation start gate, and `test/harness-bridge.test.ts` for the bridge contract. The rendered half, which no unit test can see, is `tools/render-defects/signal-frames.spec.ts` on port 4322 with its own config; it is not a visual lane, it writes no certificate, and `tools/visual/verify-output.ts` never reads it.

**Red controls, each made to fire on 2026-09-16.** (1) Undeclaring `population()` and `signals()` from `HarnessBridge` fails `npm run typecheck` with `src/harness/bridge.ts(205,5): error TS2353: Object literal may only specify known properties, and 'population' does not exist in type 'HarnessBridge'` (and the same at line 314), plus `test/harness-bridge.test.ts(141,19): error TS2339`. (2) Restoring `this.drawn.near = level.count` fails all four cases of `test/human-lod-counts.test.ts`, e.g. `expected { near: 1, medium: 1, far: 1 } to deeply equal { near: 3, medium: 2, far: 1 }`. (3) Removing the `if (this.held) this.accumulator = 0;` guard fails the new loop case with `expected 28 to be +0`. (4) The rendered control is the same capture run against a build with only the lens wiring and the start gate reverted: 16 frames over the phases green, amber, clearance and the pedestrian stage collapse to **one** digest, `diff.ts` reports 0 of 921,600 pixels changed between tick 4,020 and tick 5,805, and the 8x crop of the head shows the red lens lit while `signals()` records that head's own green. Against the fix the same run has three digests, 445 changed pixels between green and amber and 351 between amber and red, every one inside x 670-708, y 318-333, and 0 changed pixels inside any single phase.

**What the rendered check is bound by.** One junction (the scramble), one pose (45 m east of the crossing at 6 m above the ground, where `scramble:vehicle:3`'s head is 16 m away and faces the camera), one build, one hardware renderer (ANGLE/D3D11 on an RTX 4090), `?agents=1&seed=9137&style=satellite&time=noon`. At the hero pose the three scramble heads in frame are edge-on with facing numbers -0.14, -0.92 and 0.19, so a lens change there is five pixels and the green and amber lenses are not visible at all; that pose is corroboration, not the primary evidence. No pedestrian signal lens exists in this city to check: none of the 78 `traffic_signals` controls carries `traffic_signals=pedestrian`, so `head(..., pedestrian: true)` never runs and the 35 pedestrian groups have nothing on screen. Records: `artifacts/render-defects/after/frames.json` (3 digests, attach tick 11), `before/frames.json` (1 digest, attach tick 1,075), `before-hero/`, `after-hero/` (5 changed pixels at x 222-223, y 285-287) and `no-agents/` for the population-free path.

**A population-free run is unchanged.** `no-agents/frames.json` records 0 pedestrians and 0 vehicles drawn, 1,667 distinct colours and mean luminance 80.6, with the head in the same no-group state as before this work (crop luminance 42.56 against the frozen arm's 42.56). The `updateSignals` cache now starts at `undefined`, so the app's per-frame call rewrites the lenses once rather than every frame of a `?agents=`-free run, which is what makes that call affordable in the lane whose frames carry the review.

## The scene digest sees a served file rewritten in place

**Gate:** `npm run visual` — `sceneTreeDigest` in `tools/visual/verify-output.ts`, pinned by `beginVisualRun` into `run.json` and re-derived by `certifyVisualRun` through `assertSceneUnchanged` before it reads a frame. The unit case carrying the same claim is `test/visual-instrument.test.ts`, "changes the digest when a served file changes", unedited by this landing.

**Landed:** 2026-09-16 in `f4e96f0`, off `40c873c`.

**Mutation:** the pre-`f4e96f0` algorithm put back verbatim — the block that reads every served file and folds in its bytes replaced by the two metadata lines it replaced:

```
      entries.push(`${relative}${name}\u0000${info.size}\u0000${Math.floor(info.mtimeMs)}`);
      bytes += info.size;
```

Nothing else in the file changed, and `node probe/reinstate-defect.mjs restore` writes the saved bytes back before the worktree is measured again. Both probe scripts were scratch in `artifacts/digest-proof/wt`, which is gone; they are preserved in the ignored `artifacts/unlanded/digest-proof-probes/`, and the mutation is quoted in full above, so this control can be rebuilt from the entry alone. The two module hashes printed below are of the worktree's own bytes, which are CRLF on Windows; the committed blob at `f4e96f0` is `ed0df73329d0…`, and the shipped arm's `8875f863…` is those bytes, not the blob.

**Red control** (`node probe/scene-digest-blind-spot.mjs`, run from `artifacts/digest-proof/wt`): a synthetic 44-frame run the probe builds itself, over two scene mounts; `sceneTreeDigest` taken the way `--begin` takes it, then `tiles/a.b3dm` rewritten from `one` to `two` — three bytes either way — with its modification time put back to the instant both arms share; then `certifyVisualRun`, which is the gate's `--end` step. Under the shipped digest:

```
arm: shipped content digest (f4e96f0: path + SHA-256 of the bytes)
module: tools/visual/verify-output.ts sha256 8875f863458073e91fb7095d9f328cda33ae6b14941a2a6c601178971d02c4e5
served file: C:\Users\38909\AppData\Local\Temp\maps-digest-proof-DSALhG\data\scene\tiles\a.b3dm
  before: 3 bytes, mtimeMs 1789516800000, sha256 7692c3ad3540bb803c020b3aee66cd8887123234ea0c6e7143c0add73ff431ed
  after:  3 bytes, mtimeMs 1789516800000, sha256 3fc4ccfe745870e2c0d99f71f30ff0656c8dedd41cc1d7d3d376b0dbe685e2f3
  bytes changed: yes; length changed: no; floored mtime changed: no
digest pinned by run.json:     99e2bf99377fd6c7f912b341e9c9b85f9fb78300e6caf1b5047563dd7bb76061 (3 files, 18 bytes)
  mtime moved to 2026-09-16T01:00:00.000Z with the bytes unchanged: digest moved: no
digest re-derived at --end:    bc69cbe8d7d868717af74c495f7f9f5e3202c69312c4a516be1270072ee3f58b (3 files, 18 bytes)
digest moved: yes
certificate: refused
refusal: The served scene data changed during capture, so these frames are not all pictures of the same city: 3 files digested 99e2bf99377f when the run began and 3 files digest bc69cbe8d7d8 now. `npm run data:scene` (or `npm run data:network`) ran while the gate was capturing. Rebuild and recapture before reviewing this run.
VERDICT: the scene-unchanged check SEES the byte swap
```

Under the mutation, with the same command and the same probe:

```
arm: pre-f4e96f0 metadata digest (path + size + floored mtime), reinstated verbatim
module: tools/visual/verify-output.ts sha256 54ac44a4334b4ac9fcabb4d947d481e029e213a865e38d21e913db9d01df4c90
served file: C:\Users\38909\AppData\Local\Temp\maps-digest-proof-W70ZDC\data\scene\tiles\a.b3dm
  before: 3 bytes, mtimeMs 1789516800000, sha256 7692c3ad3540bb803c020b3aee66cd8887123234ea0c6e7143c0add73ff431ed
  after:  3 bytes, mtimeMs 1789516800000, sha256 3fc4ccfe745870e2c0d99f71f30ff0656c8dedd41cc1d7d3d376b0dbe685e2f3
  bytes changed: yes; length changed: no; floored mtime changed: no
digest pinned by run.json:     e77e3c7eaf497e0b6fd114bd44dbafb97a2ef095067bdf6654f7b5fa768c4f8a (3 files, 18 bytes)
  mtime moved to 2026-09-16T01:00:00.000Z with the bytes unchanged: digest moved: yes
digest re-derived at --end:    e77e3c7eaf497e0b6fd114bd44dbafb97a2ef095067bdf6654f7b5fa768c4f8a (3 files, 18 bytes)
digest moved: no
certificate: ISSUED
VERDICT: the scene-unchanged check STAYS GREEN while the bytes changed
```

and the certified line above it reads `All 44 fresh native-resolution frames survived the complete visual gate with matching hashes.` followed by `Certified run digest-proof: pixel lane on "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)", lifecycle lane on "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)"`. The gate issued its certificate for a run whose served bytes moved, which is the failure the content digest exists to prevent.

**The same defect from the other side: the unit case was intermittent.** With the metadata digest in place and nothing else changed, `npx vitest run test/visual-instrument.test.ts -t "changes the digest when a served file changes"` was run 24 times from the same worktree: **4 red, 20 green, 38.5 s total**. A red run fails on the digest agreeing with itself:

```
AssertionError: expected 'c212f092a9346771a9856c3e82988439fbc72…' not to be 'c212f092a9346771a9856c3e82988439fbc72…'
```

The two writes straddled an OS clock tick in the green runs and shared one in the red ones. `f4e96f0`'s message records 1 of 12 on `main`; this run measured 4 of 24, which is the same race at a different rate rather than a different result. So the old check was neither a gate that could be trusted nor one that was broken: it was a clock race that the meter-moved condition won between 1 run in 12 and 1 in 6. Under the shipped digest the same case is deterministic and passes in 9 ms because the bytes differ.

**Bound.** Only the path a file is served at and the SHA-256 of its bytes enter the digest, so the same tree gives the same value on every run — three calls over the served payload of 2026-09-16 each returned `0222c0566d507e4b…` over 137 files and 371,228,426 bytes, and **round 31's review established that this payload no longer exists**: the human agent set is missing from the rebuilt `data/`, so the same three calls now return `ddd21ee1b4feb7f7…` over **84 files and 214,114,015 bytes**, which the running capture pins and the review reproduced from disk as `data/scene` 83 files / 203,874,605 plus `data/network` 1 file / 10,239,410 — and no timestamp, size or inode is covered, which the same probe measures from the other side: moving a file's bytes to a new mtime leaves the digest where it was under the shipped algorithm and moves it under the old one. What it cannot report is a file changed and changed back between its two calls, which is a difference no digest taken at two instants can see. It covers exactly the two mounts `tools/vite/serve-scene-data.ts` answers — `data/scene` served as `/scene/` and `data/network` as `/network/` — so data the app does not serve is outside it by construction, and the review notes the server answers a third mount the comment does not name. Its cost is paid twice per gate run: 425-447 ms per call over the larger payload, about 0.9 s of the three-hour run, before the build and again after the capture.

## The vehicle spacing gate catches bodies that interpenetrate

**Gate:** `test/vehicle-spacing.test.ts`, one case over the delivered network and fleet, driving `createPopulation` and measuring with `vehicleBoxes` and `overlappingPairs` from `tools/agents/spacing-metrics.ts`: oriented collision boxes projected from the published pose buffers, not a distance between origins.

**Landed:** 2026-09-16 in `5e8c266`, off `a281281`.

**Why the gate had to exist before the fix.** No run of the population measured the space between two bodies: `tools/agents/population-run.ts` at `5e8c266^` publishes the lifecycle counts, the admission counters, the longest waits and the same-tick cost, and a grep of it for overlap, spacing, gap or collision terms returns nothing — which is why three lanes reported the vehicle population as working while every counter they read was honest and none of them was about space. `test/vehicle-trajectory.test.ts` does drive `sweepsOverlap` on the authored fleet, and it is not this: its subject is a planned path's swept footprint at the planner level, not two bodies in the running simulation. The independent review's first blocking finding, measured on the shipped simulation at 200 vehicles and 3,600 ticks, was **120 oriented-box overlapping pairs among 71 active bodies, deepest longitudinal overlap 4.147 m at a 0.500 m origin gap**. The cause was structural rather than a slip: the car-following law read the network contract's 0.5 m stop gap — a gap between a body and a stop line — as if it separated two bodies, and measured its gap origin to origin, so a queue's equilibrium was 0.5 m between origins and every class in the fleet overlapped itself by roughly its own length.

**Mutation:** the origin-to-origin separation restored in `buildVehicleFrame`'s clearance — `return delta > 0 ? delta : null;` and `return ahead > 0 ? ahead : null;` in place of the two `- halfLengths` forms. Two lines in `src/agents/population/vehicles.ts`, nothing else changed, and the file restored byte-for-byte afterwards.

**Failure:** `npx vitest run test/vehicle-spacing.test.ts` on this revision (`f4e96f0`), exit status 1, in 2.96 s:

```
 × test/vehicle-spacing.test.ts > vehicle spacing > never overlaps two vehicles travelling the same direction 2156ms
   → expected [ …(5) ] to deeply equal []

AssertionError: expected [ …(5) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "tick 475: kei#15 into taxi#17, 0.120 m of oriented-box overlap at a -4.009 m origin gap, headings 0.0 deg apart",
+   "tick 480: kei#15 into taxi#17, 0.303 m of oriented-box overlap at a -3.825 m origin gap, headings 0.0 deg apart",
+   "tick 485: kei#15 into taxi#17, 0.479 m of oriented-box overlap at a -3.649 m origin gap, headings 0.0 deg apart",
+   "tick 490: kei#15 into taxi#17, 0.648 m of oriented-box overlap at a -3.480 m origin gap, headings 0.0 deg apart",
+   "tick 495: kei#15 into taxi#17, 0.809 m of oriented-box overlap at a -3.319 m origin gap, headings 0.0 deg apart",
+ ]
```

Restoring the two terms: `1 passed`, in 2.56 s. The same mutation driven through the run-level instrument, `node tools/agents/vehicle-spacing.ts --vehicles 200 --pedestrians 0 --ticks 3600`, exits 1 with `31 overlapping oriented-box pairs between bodies travelling the same direction at tick 2925` and `deepest same-direction oriented-box penetration 2.224 m (taxi#27 into taxi#98)`, against `"maxOverlapPairs": 0`, `"maxPenetrationM": 0` and `"verdict": "pass"` on the fixed revision. That is the defect class at reduced magnitude rather than the original 120 pairs: the rest of `5e8c266` — the lateral filter that stops a body braking for the one beside it, the spawn clearance, and `HALT_CAPTURE_M` — is still in place, so the two half-length terms are the smallest mutation that still makes the gate fire.

**Bound.** One delivered network at seed `0x5b1b0a`, 120 vehicles and no pedestrians, 1,200 ticks at 1/60 s — 20 simulated seconds — sampled every 5 ticks. That window is long enough for queues to form at the portals and at the first gates and for two bodies to be placed at one portal, and it is not a full signal cycle; it says nothing about pedestrian spacing, about lane changes at junctions, about the 3,000-pedestrian acceptance load or about route completion. It also permits head-on overlaps by construction, where two bodies are drawn on the same folded lane centreline: the test requires such a pair's centrelines to come within the two bodies' own half lengths, and fails any other head-on overlap as a different defect. The pedestrian half of the same review finding (46,615 overlapping pairs at t = 60 s) is **not** gated on this revision: `test/pedestrian-overlap.test.ts` is untracked and lives unlanded in `artifacts/spacing/wt`, so the crowd's spacing has no gate here.


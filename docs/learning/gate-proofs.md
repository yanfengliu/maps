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

**Gate:** `npm run visual` — `tools/visual/verify-output.ts` (`resetVisualRun`, `beginVisualRun`, `certifyVisualRun`, `lifecycleEvidence`, `sceneTreeDigest`, `harnessTreeDigest`, `pixelLaneRefusal`, `visualRunPhase`), the chain in `package.json`, `tools/visual/lane.ts`, `tools/visual/lifecycle-record.ts`, `tools/visual/lifecycle.spec.ts` and `src/harness/teardown.ts`. Pinned by `test/visual-instrument.test.ts` (39 cases), which drives the wrapper's own functions over synthetic runs it writes itself.

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

**(5) The pixel lane's renderer identity was recorded and never read.** `sweep.spec.ts` and `hero.spec.ts` wrote `glRenderer` into their manifests and nothing asserted it, so a Chromium that accepted the launch flag and drew elsewhere would have moved the reviewed 44-frame set silently. Both specs now refuse a renderer that is not their lane's within seconds of their first frame, through `pixelLaneRefusal` in `lane.ts`, and `certifyVisualRun` asserts it again over every manifest it certifies.

The direction was inverted on 2026-09-17, when the owner's instruction — "if you can use GPU, don't use CPU" — moved the appearance set off SwiftShader. What the predicate refuses is now **a software rasteriser**, and what *requires* hardware rather than merely excluding software is the check the certificate gained the same day: `gpuBindingRefusal` in `tools/visual/gpu-identity.ts` compares the browser's renderer string against the adapter and driver version read from the machine at `--begin`, so a frame set drawn on another GPU fails instead of being compared with this one's review.

**Mutation, spec level — the wrong renderer, reproduced twice on the committed tree.** Two one-line mutations of `playwright.config.ts`, each followed by `npx playwright test --config playwright.config.ts -g "satellite: orbits the scene"`:

1. `--use-angle=d3d11` → `--use-angle=swiftshader --enable-unsafe-swiftshader`, leaving `MAPS_VISUAL_GPU=hardware` declared. Exit status 1 after 51.6 s — Playwright startup, the preview server and a SwiftShader boot are almost all of that; the refusal is at the first frame — thrown from `tools/visual/orbit.ts:172`, reached by `sweep.spec.ts:76`:

```
Error: Hardware rendering was requested, but Chromium reports ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver). This lane requires the NVIDIA GPU; software fallback is not a performance measurement.
```

2. The same launch args **and** the `MAPS_VISUAL_GPU` declaration removed, so the lane's own predicate is what refuses rather than the lane's hardware switch. Exit status 1 after 53.2 s, log `artifacts/gpu-lane/mutation-2-lane-predicate.log`:

```
Error: satellite: the first frame of the sweep reports the renderer "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)", which names a software rasteriser. The 44-frame appearance set is drawn on the GPU since the owner's 2026-09-16 instruction, not on the CPU: a software frame costs seconds where the hardware frame costs milliseconds, and it is a different picture from the one the reviews are of (playwright.config.ts, --use-angle=d3d11). Check that the GPU is usable and that no software fallback flag was passed; a machine with no usable GPU reports this gate unavailable rather than passing it.
```

Both mutation runs were reverted byte-identically before the commit, and the certificate below was issued on the reverted tree.

**Mutation, certificate level.** The wrapper's refusals are driven directly by `test/visual-instrument.test.ts`, over synthetic runs, which is where they reproduce without a browser:

- a sweep manifest naming a software rasteriser — `refuses to certify a run whose sweep manifest names a software rasteriser`. This is the case this entry carried in the opposite direction until 2026-09-17, and its old mutation (`void pixelLaneRefusal;` in the wrapper) still describes the same refusals firing.
- a frame set whose manifests all name hardware that is not this machine's adapter (`OTHER_GPU`, an AMD string) — `refuses a frame set drawn on a GPU that is not the one the run pinned`, message `does not name the GPU this run pinned`. **Removing the `gpuBindingRefusal` call from `certifyVisualRun`** makes it fail `AssertionError: promise resolved "undefined" instead of rejecting`; restoring the call byte-identically (`tools/visual/verify-output.ts`, SHA-256 `8E56E3F988BC…`) makes it pass. That run certified before the binding existed.
- a run whose `run.json` pinned no GPU identity at all — `refuses to certify a run that pinned no GPU identity`, message `could not read the GPU and driver version`.

**CLI red control** (`node probe/gate-chain.mjs p5-renderer`, executed 2026-09-16 against the software predicate) with the satellite manifest naming the RTX 4090 string:

```
Visual gate refused: sweep/satellite/manifest.json reports the renderer "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)", which is not SwiftShader. The 44-frame pixel set is comparable across machines only while every frame comes from the software lane the config pins (--use-angle=swiftshader); a set captured on another renderer cannot inherit a review written for this one, and there is deliberately no switch that moves this lane.
```

That message is history and its direction is now wrong: the same manifest is what a correct run produces, and a hardware string is no longer refused. It is kept here because it is the executed red control of the predicate this entry is about, and its replacement is the pair of spec-level mutations above.

**Bound.** The predicate is only as strong as what Chromium reports: the unmasked `WEBGL_debug_renderer_info` string, or the masked fallback (`WebKit WebGL`) when the extension is withheld. The fallback is refused rather than passed, but it fails as "wrong renderer" rather than as "identity unavailable". The GPU identity is read once, at `--begin`, from the machine running the gate — the adapter and driver it had at that instant — so a driver replaced between that read and the capture is outside what the certificate can report, and on a machine where neither `nvidia-smi` nor the OS device record answers, the gate refuses to begin rather than certifying frames whose GPU it cannot name.

**Not yet proved red.** The three paths in "Not yet proved red" above are unchanged by this unit, and one is added: the scene digest is re-derived at certification and has been watched to fire against a file changed between the two hashes inside one synthetic run only — that firing was a movement of names, sizes or mtimes, which is all the pre-`f4e96f0` digest could see, and since `f4e96f0` the firing comes from the bytes themselves ("The scene digest sees a served file rewritten in place" below) — and not against `npm run data:scene` running during a real capture.




## The reviewed network source, admission and boundary contracts hold

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

## The hero spec's return switch committed the row it was already on

**Gate:** `tools/visual/hero.spec.ts`'s style-return block, and the assertion in it that the control reaches the style the switch claims: `expect(styleSelect).toHaveAttribute("data-style-id", "cartographic")`. The block opens the listbox with `Enter`, walks it with an arrow key and commits with `Enter`.

**Landed:** 2026-09-16 in `48c19c5`. The block shipped with the gate-fixes landing `cb266f7`, whose rewrite flipped the capture order and the return direction with it.

**Mutation — the defect itself, not a synthetic one:** `await styleSelect.press("Home")` replaced by `await styleSelect.press("End")`. The registry orders cartographic first and satellite second (`src/world/styles.ts`), and the style being left is satellite, so `End` walks to the row already selected — and `move()` in `src/ui/style-picker.ts` does not commit a move onto the current option, so the control correctly did nothing.

**Failure:** the verdict lane, after 25.7 minutes and four hero captures:

```
Error: the return switch must reach the control's own value, and Enter on the highlighted row is what commits it
expect(locator).toHaveAttribute(expected) failed
Locator:  getByRole('combobox', { name: 'World style' })
Expected: "cartographic"
Received: "satellite"
Timeout:  5000ms
```

**Red control, run before the next three-hour attempt rather than after:** `artifacts/preflight/style-return-probe.spec.ts` with `artifacts/preflight/style-return.config.ts` drives the real app through the real control — `?time=dusk&seed=9137&style=satellite`, then `Enter`, then `Home`, then `Enter` — and reports `rows: ["Cartographic","Satellite"]` and `Enter/Home/Enter -> cartographic`, `1 passed` in **8.0 s**, 40.0 s including the preview server.

**Bound.** One control, one registry, one build, one renderer, and no capture: the probe proves the key-to-row mapping the spec depends on and says nothing about the 25 minutes of rendering that precede it, nor about the noon iteration or the two frame-comparison thresholds that follow. It exists because the check that was made before the failing run — that hero's first assertions passed a minute in — could not reach a failure twenty-five minutes in.



## The visual pre-flight answers in a minute what a capture answers in three hours

**Gate:** `npm run visual:smoke` — `playwright.smoke.config.ts` and `tools/visual/smoke.spec.ts`. It asserts the preconditions a capture's first minute would test and photographs nothing: the production build boots and the harness is readable; **the renderer is SwiftShader through the pixel lane's own `pixelLaneRefusal` rather than a copy of it**; the post chain is active and carries `[TAARenderPass, GTAOPass, UnrealBloomPass, OutputPass]`; the tileset is reachable with no failed tiles; the World style control offers both registry entries and switches under a real keyboard press and a real pointer click, reporting each through the `data-style-id` it writes onto itself; and the simulation keeps advancing across both.

**Landed:** 2026-09-16 in `5c32286`, after the coordinator started the three-hour verdict lane three times against a revision whose World style control had changed shape from a native `<select>` to a button plus an in-page listbox, each run dying on the same assertion about twenty-eight seconds in, after `--reset` and after the build.

**Mutation — the real defect, not a synthetic break:** the assertion reverted to the assumption the three dead runs made, `styleControl.locator("option")`, which is the old control's shape rather than the new one's.

**Failure:** `1 failed`, in 26.9 s:

```
Error: expect(received).toContain(expected) // indexOf
Expected value: "Cartographic"
Received array: []
> 77 |   expect(optionLabels).toContain("Cartographic");
1 failed
```

That is the same message, in the same form, that `hero.spec.ts` produced three times inside the verdict lane — `Received array: []` against an expected style label — reached here in twenty-seven seconds instead of after a reset, a build, and a lane that had already been announced as the deliverable's evidence. Restored, `1 passed` in 25.0 s, `57.3 s` for the whole command including the preview server.

**Bound.** One renderer (SwiftShader), one URL (the dusk hero URL), one build, and no capture at all: **it says the app will answer the questions the capture asks, and nothing about what the capture will photograph.** It cannot see a pose drifting, a frame count short, a blank frame, an aliasing artefact or temporal crawl — those need the frames, and the verdict lane remains the only evidence. It is also collected by the verdict lane's own `testDir` unless `playwright.config.ts` excludes it, which it now does by name: that omission was a real defect of this landing, caught by round 31's review, and the fix carries its reason in the config.
## The style criterion's pointer half is completed by a press on the option row

**Gate:** `tools/visual/hero.spec.ts` and `tools/visual/style-picker.spec.ts`, both driving the shipped control through `tools/visual/style-control.ts`. Each switch asserts `aria-expanded` on the control after the press that is supposed to open its list, and completes the pointer half with a press on the option row itself; the keyboard half opens with `Enter` and commits with `Enter`, as its own switch in both files. The reason the two are separated is the defect: `move()` in `src/ui/style-picker.ts` commits as the active option moves while the list is *closed*, so `click()` followed by `Home`/`End` and `Enter` cannot tell "the pointer opened the listbox" from "the pointer did nothing". Round 31's review, finding B3, on the shape both specs had at `30c7b01`.

**Landed:** `7f4b045` with the assertion messages of `b152da5`, on branch `worker/gate-fixes` off `024c44d`.

**Mutation:** the control's pointer path removed in the subject rather than the check — `control.addEventListener("click", onControlClick);` deleted from `src/ui/style-picker.ts`, which is the review's own hypothetical ("delete the click handler tomorrow"). The probe applies it to the module body at run time, so the shipped file is untouched.

**Red control:** `npx playwright test --config artifacts/gate-fixes/probe/playwright.probe.config.ts` from a worktree at this revision, 2026-09-16, exit status 0, **5 passed (23.1 s)** over five arms on one page each. The probe is `artifacts/gate-fixes/probe/control-probe.spec.ts`; it builds its own page with `page.setContent` (no server, no port, no renderer requirement), holds the pointer mutation as the removal of that one registration line, and holds a second mutation as the absence of the option press. It prints the two failures it expects rather than swallowing them:

```
  ✓  1 shipped control: the new pointer sequence completes the switch (476ms)
  ✓  2 shipped control: the old click-then-arrow sequence completes it too (239ms)
PROBE arm 3 (dead pointer, new sequence) failure:
a pointer press on the World style control must open its listbox
expect(locator).toHaveAttribute(expected) failed
Locator:  getByRole('combobox', { name: 'World style' })
Expected: "true"
Received: "false"
  ✓  3 pointer path removed: the new sequence fails by name (10.2s)
  ✓  4 pointer path removed: the old sequence still passes, so it saw nothing (244ms)
PROBE arm 5 (list opened by pointer, no option press) failure:
the press that opened the list must be what commits the style
expect(locator).toHaveAttribute(expected) failed
Locator:  getByRole('combobox', { name: 'World style' })
Expected: "cartographic"
Received: "satellite"
  ✓  5 option press replaced by a no-op: the commit assertion fails by name (10.4s)
  5 passed (23.1s)
```

Arm 3 is the pointer claim firing and arm 4 is the defect: with the pointer path gone, the old `click()`-then-arrow sequence still commits the style and still passes every assertion the two specs made before this landing. Arm 5 is the commit claim firing: the control was pressed, its listbox opened, no option was pressed, and the control that failed the assertion still reads `aria-expanded="true"` with `data-style-id="satellite"` — opening the list is not what changes the style. The two shipped arms say the new sequence is not merely stricter: it completes a real style change on the shipped control, read back through the control's own `data-style-id` and the fixture's `onChange`.

**Bound.** One control module transpiled from `src/ui/style-picker.ts`, two registry entries, one initial style, no app, no renderer, no pixels: the probe proves the DOM control's own input path. It says nothing about the production build (that is `npm run visual:smoke`'s ground, measured green in 59.2 s on the same tree) and nothing about `hero.spec.ts`'s own assertions, which the verdict capture owns and which this landing therefore states as code rather than as evidence. The `End`/`Home` ternary in the keyboard half and the pointer row press both assume the control still writes `data-style-id` on its rows and itself; a control that renamed that attribute would fail the spec by name rather than passing quietly. And the pair cannot see a *spec* that swaps its option press for a key press: `choose()` is the one place the two input paths meet, so the app's state is identical either way, and what the gate owns is that the row press is reachable and is what commits (arm 5) and that the press opening the list is the pointer's (arm 3). Keeping the pointer arm pointed at the option row is therefore a review property, not a checked one.

## The harness that drives the browser is bound into the certificate

**Gate:** `npm run visual` — `harnessTreeDigest` in `tools/visual/verify-output.ts`, pinned by `beginVisualRun` into `run.json` as `harness`, and re-derived by `certifyVisualRun` through `assertHarnessUnchanged` before it reads a frame, in the same shape the scene digest uses. Its roots are the lane's own instrument: `tools/visual`, `playwright.config.ts`, `playwright.lifecycle.config.ts`, `vite.config.ts` and `tools/vite/serve-scene-data.ts`. Unit cases: `test/visual-instrument.test.ts`, in "the harness that drives the browser is bound into the certificate" — a helper changed, a spec added, a run with no pin, a root that resolves to nothing, and the `--begin` pin read back.

**Landed:** `7f4b045`, off `024c44d`, on branch `worker/gate-fixes`.

**Why.** The certificate bound `dist/` bytes and the served scene and nothing bound the specs and helpers that drove the browser, which `plan.md` requires of the final verification as "the complete source/build/data/harness closure before and after the run". It stopped being theoretical at 17:55:29 local on 2026-09-16, when `5c32286` changed `tools/visual/verify-output.ts` and added two files under `tools/visual/` while the capture that began at 17:35:33 was running. Round 31's review, finding B4.

**Mutation:** `await assertHarnessUnchanged({ ...harness, roots: [...harnessRoots] });` removed from `certifyVisualRun` — the state of `30c7b01`, where nothing under `tools/` was hashed into the certificate at all.

**Failure:** `npx vitest run test/visual-instrument.test.ts`, exit status 1, 2 of 39 red:

```
 FAIL  test/visual-instrument.test.ts > the harness that drives the browser is bound into the certificate >
       refuses to certify when a helper changed during capture
Error: certification succeeded, and this case exists because it must not: a run whose harness moved during
capture was certified.
 FAIL  test/visual-instrument.test.ts > the harness that drives the browser is bound into the certificate >
       refuses to certify when a spec was added during capture
AssertionError: promise resolved "undefined" instead of rejecting
 Test Files  1 failed (1)
      Tests  2 failed | 36 passed (39)
```

Restoring the call: `39 passed`, exit status 0, 7.9 s. Two smaller mutations pin the two other places the binding can go missing. The pin removed from `--begin` — the `harness: { roots: [...HARNESS_ROOTS], ...harness },` line deleted from `beginVisualRun`'s `run.json` write — fails `-t "pins that digest into run.json"` with `AssertionError: run.json written by --begin must carry a harness digest: expected undefined to be defined`, which is why that case drives the real `beginVisualRun` rather than writing its own record: every other case here pins a synthetic run and would stay green while every real run failed hours later at `--end`. The presence check in `certifyVisualRun` commented out fails `-t "pinned no harness digest"` with `AssertionError: expected [Function] to throw error matching /pinned no harness digest/ but got 'Cannot read properties of undefined (…'`.

**Bound.** The digest folds in each file's path under its root and the SHA-256 of its bytes, so a file added, removed or edited under those roots moves it and no timestamp, size or inode is covered. It is taken at two instants, so a file changed and changed back between them is invisible — the same bound the scene digest states. It covers the chain's own instrument and not the app: `src/**` reaches the frames only through `dist/`, which the build hashes bind; `data/**` is the scene digest's; `package.json`'s chain order is pinned by the unit case in this file; the other lanes under `tools/` are never run by this chain; and the Draco decoder served from `node_modules` is bound by nothing here. It is a refusal to certify an unbound run rather than a claim that the frames are wrong: a commit landing mid-capture cannot change specs Playwright already loaded, and the message says so. Its cost is one read of about 191 KB across 22 files per call, twice per gate run. A run begun by a wrapper older than this check carries no `harness` key and is now refused at `--end` rather than certified without it, so this landing must not reach `main` before the capture in flight certifies.


## The human bake is checked as a set, and every way it can be wrong is a case

**Gate:** `npm run data:agents:set` — `tools/agents/verify-human-set.ts`, the inventory the post-capture runbook asks for before the delivered set is trusted. Unit cases: `test/agent-human-set.test.ts`, 14 cases over a synthetic 33-file tree built under the system temp directory, with the CLI's two exit codes asserted through a subprocess.

**Landed:** on branch `worker/human-set-verify` off `a5d2047`. It has not been merged and has not been run against a real bake: `data/scene/agents` holds no human set, and nothing may write into a served mount while the verdict capture that owns the machine is running. What is proved here is that the check goes red on every defect class it claims to catch, on a tree built to be correct.

**Why.** The runbook restores the set with `npm run data:agents` and then says "verify the bake rather than assuming it": 3 variants x 3 LODs x {glb, positions.f16, normals.f16} plus 3 manifests and 3 source blends = 33 files, and `src/world/agent-assets.ts` requests the three manifests by name. That check existed only as a paragraph, and the set is what a worktree removal destroyed on 2026-09-16 when it followed a `data/` junction into the primary — `data:agents` is not in `data:setup`, so the rebuild could not restore it.

**Mutation:** twelve runs of the CLI, each from the same complete synthetic set with one change. Green: no change, `exit 0`, `33 of 33 files on disk`, 0 findings. Red, `exit 1` each, with the finding it named:

A second mutation attacks the verdict itself rather than the tree, and it is the one `test/agent-human-set.test.ts` is watched against: `checkHumanSet` made to return `complete: true` whenever the directory listed and carried no top-level finding — the shape of a check that reports a set it did not examine. `npx tsc --noEmit` exit 0 under it, so it is a real red and not a broken build, and `npx vitest run test/agent-human-set.test.ts` exits 1 with **9 of 14 red**, every one of them `AssertionError: expected true to be false // Object.is equality`, including the subprocess case at `AssertionError: expected +0 to be 1 // Object.is equality` — the CLI answering `exit 0` for a set with a file missing. The one case that stays green is the stray-file case, which is correct: that set is still complete. Restoring the tool: `14 passed`, 1.4 s.

```
commuter-male-medium-normals.f16: commuter-male-medium-normals.f16 is missing, and commuter-male.json names
  it as the medium normals of commuter-male. Run npm run data:agents to bake it into <root>.
office-male-far.glb: office-male-far.glb is empty, and office-male.json names it as the far model of
  office-male, so that LOD cannot be loaded from it. An interrupted bake leaves whole files at zero bytes.
commuter-female.json: commuter-female.json is not valid JSON: Unexpected end of JSON input.
office-male-medium-positions.f16: office-male-medium-positions.f16 digests fb4ed9a7…; office-male.json
  records 000…0 for office-male/medium positions. src/agents/render/assets.ts verifies that digest at load
  and refuses the asset, so office-male/medium cannot render from this set.
office-male/medium.positionSha256: office-male.json records "not-a-digest" as the positions digest of
  office-male/medium; a SHA-256 is 64 lowercase hexadecimal characters.
commuter-female/near.bytes: commuter-female.json records 999999 bytes for commuter-female/near and its
  three files are 8312 bytes together.
commuter-male/far: commuter-male.json declares no far LOD, and src/agents/render/humans.ts loads near,
  medium and far for every variant: it throws "Human commuter-male has no far LOD" at startup.
office-male-source.blend: office-male-source.blend is missing, and tools/agents/build-human.py writes it
  into <root> before tools/agents/bake-human.py reopens it per LOD.
office-male/near.model: near.model is "models/office-male-near.glb", which is a path and not a file name
  beside the manifest. The runtime loads it as "/scene/agents/models/office-male-near.glb", which no file satisfies.
Human agent set INCOMPLETE: 30 of 33 files on disk, 3 named problems above; failed commuter-male/near,
  office-male/medium, commuter-female/far. Run npm run data:agents to rebuild the set, then run this check again.
```

Two of those reds are defects in the check rather than in the tree, and both were found by running it rather than by reading it. `bytes` is written by `bake-human.py` as the three files added together and was first compared with each file's own size, which produced **27 findings across all 9 LODs of a correct bake** — a false red that would have buried every real finding; it is now checked against the sum. A digest field that was present but not 64 hex characters was read as "nothing recorded" and skipped, so a manifest carrying `"not-a-digest"` **passed**; the field is now three-valued and the malformed case is a finding. The first is the report inventing failures, the second is the report printing "did not run" as "passed".

**Bound.** The inventory is the whole claim: it proves the 33 files exist, are non-empty, parse, and that every file a manifest names sits beside it at the digest the manifest records. It does not decode a GLB, read a half float, or measure a silhouette, a gait, a frame rate or a source blend's contents — a truncated `.blend` passes. The stronger contract on a populated directory is `tools/agents/verify.ts` (VAT half floats, stance contact, the shipping admission gate) and `tools/agents/manifests.ts` (`drawParts` re-derived from the delivered GLBs); neither is subsumed here, and this check exists to refuse an incomplete set before either of them loads one. It requires the `near`/`medium`/`far` ids and the three variant ids the bake writes, while the file each manifest names is what gets checked, so a set that renames an asset without renaming it in the manifest fails and a set using another naming convention passes. Files it does not name are listed and do not fail the set, because the vehicle fleet is published into the same directory; a file named the way the bake names its output but absent from the set is a finding. It reads nothing under `data/agents/source` and runs no bake, so a complete output set passes with its sources deleted.

## The unit gate's bounds describe the work, and one case was starving its own runner

**Gate:** `npm test` — `test/visual-evidence.test.ts` (its two work-carrying cases, and the third case that derives and checks their ceilings), the four groups of `test/visual-instrument.test.ts` that build a 44-frame run, and the tick loop of `test/pedestrian-overlap.test.ts`.

**Landed:** 2026-09-16 on branch `worker/flake-unit-gate` at `240bc38`, off `ee112fd`. Not merged: the coordinator lands the branch. The six final runs below were all taken on `240bc38` — the last three after the docs-only commit `d73ef9c`, with the code identical across all six.

**Why.** This machine sits at a measured 100% of its 32 logical cores (24 physical) because a sibling `3d-maker` checkout runs its own Vite server and browser suite, and that load is not this repository's to remove. `npm test` failed on it in two independent ways, and neither was the product.

**(1) The bounds did not describe the work.** On `main` at `7329dec`, the same tree and no edit between the runs: `test/visual-evidence.test.ts` costs **1.09 s alone** and **10.06 s inside the loaded 59-file suite**, where both cases died as `Error: Test timed out in 5000ms.` A phase probe (`node artifacts/flake-probes/phase-timing-probe.ts`, a worktree at `7f44b2f`, run under the same load) attributed the file's own work: **2,185 ms** for `sceneTreeDigest` over the served scene — 84 files, **214,114,015 bytes** (`data/scene` 83 / 203,874,605 plus `data/network` 1 / 10,239,410) — **91 ms** for `harnessTreeDigest` over 22 files, **21 ms** for one `decodePng` of a native 1280x720 frame and **956 ms** for the 44 a single accepted pass decodes, and **818 ms** to write the 44-frame fixture. None of it is removable from this file: the digest is inside `beginVisualRun`, whose mounts are module constants rather than a parameter, and the 88 decodes are what `verifyVisualRun` does over two accepted passes. Both live in `tools/visual/**`, frozen while a capture may start.

So each case names its ceiling — `BEGIN_RUN_BUDGET_MS` and `EVIDENCE_BUDGET_MS`, 60 s each, derived in `test/visual-evidence.test.ts` from those measurements times the 9.2x contention this suite has shown — and a third case checks the derivation: each ceiling must be more than twice and less than four times the worst cost its own case's work has shown, and no case may fall back to the suite default. `test/visual-instrument.test.ts`'s four frame-set groups carry `FRAME_SET_BUDGET_MS` for the same work: they write and decode the same 44 frames, and two of them died at the 5000 ms default in the same run (`Test timed out in 5000ms`, `test/visual-instrument.test.ts`).

Red controls, each run from the worktree and restored byte-for-byte:

```
M5  EVIDENCE_BUDGET_MS = 5_000
    AssertionError: "rejects deleted sibling frames, stale runs, changed build bytes and changed frame
    bytes" is bounded too tightly to survive the load this suite runs under: its own work costs 17056 ms
    at the contention measured, so 5000 ms is less than twice that.: expected 5000 to be greater than
    34111.70642201835
M6  { timeout: EVIDENCE_BUDGET_MS } deleted from the second case
    AssertionError: the second case does not run on EVIDENCE_BUDGET_MS: expected +0 to be 1
M7  BEGIN_RUN_BUDGET_MS = 600_000
    AssertionError: "clears the previous complete.json when a new capture run begins" carries a ceiling
    that no longer describes its own work: its own work costs 21006 ms at the contention measured, so
    600000 ms is more than four times that.: expected 600000 to be less than 84024.07339449541
M8  FRAME_SET_BUDGET_MS = 5, in test/visual-instrument.test.ts
    → Test timed out in 5ms.   (10 cases, exit 1 — the groups' ceiling reaches their cases)
```

**The first version of the wiring assertion was self-satisfying, and the mutation is what caught it.** It searched the file's own source for the literal `{ timeout: EVIDENCE_BUDGET_MS }`, a string that appears in the check's own body, so M6 left it **green** with the option deleted from the case. It now builds the needle (`option(ceiling)`) and asserts the occurrence count is 1, and M6 fails as quoted above. This is the same class the human-set lane found twice in the same session (`bytes` read per file, a malformed digest read as "nothing recorded"): a check that can satisfy itself.

**(2) One case starved the runner's own RPC, and the gate called green runs red.** Concurrently, `npm test` exited 1 on runs in which every test passed, with `Errors 1 error`:

```
Error: [vitest-worker]: Timeout calling "onTaskUpdate"
 ❯ Object.onTimeoutError ../../../node_modules/vitest/dist/chunks/rpc.-pEldfrD.js:53:10
 ❯ Timeout._onTimeout ../../../node_modules/vitest/dist/chunks/index.B521nVV-.js:59:62
 ❯ listOnTimeout node:internal/timers:605:17
 ❯ processTimers node:internal/timers:541:7
```

Vitest's worker-to-runner RPC arms a 60,000 ms `setTimeout` on every `onTaskUpdate` call (`const DEFAULT_TIMEOUT = 6e4`, `node_modules/vitest/dist/chunks/index.B521nVV-.js:3`; the worker side that raises it is `chunks/rpc.-pEldfrD.js:48`). It fired in **three of three runs** at the default worker count — 19:53, 20:02 and 20:12 — each time in the log's own seconds after `test/pedestrian-overlap.test.ts` finished, and that case is one synchronous `it()` running 60,000 ticks, measured at **92.9 s** (20:12), **57.1 s** (20:15) and **47.6 s** (20:17). The worker never reaches Node's poll phase while it runs, so the runner's reply to an outstanding call sits in its queue until the loop turns — and the overdue watchdog then fires first.

Bounding worker concurrency was tried first and **rejected on measurement**: `maxWorkers` at half the logical cores (16) still let the watchdog fire in the 20:12 run, right after the same 92.9 s case, and peak node processes only fell from 100 to 48; `vitest.config.ts` is therefore unchanged. The fix is in the case: the tick loop turns the event loop every `YIELD_EVERY_TICKS` (2,000) ticks, which is a turn every 1.6-3.1 s at the pace measured. The population is stepped with a fixed `STEP` and the tick's own simulated time, so no number this gate reports can change.

```
run   tree                                            Test Files              Tests            Errors  watchdog  exit
19:53 7f44b2f, default workers                         59 passed               427 passed       1 error  1 firing  1
20:02 7f44b2f + file fix, default workers              1 failed | 58 passed    2 failed | 425   1 error  1 firing  1
20:12 + 16-worker bound                                60 passed               442 passed       1 error  1 firing  1
20:15 same tree                                        60 passed               442 passed       —        0         0
20:17 same tree                                        60 passed               442 passed       —        0         0
20:16 240bc38, tick loop yields, default workers        60 passed               442 passed       —        0         0
20:17 same tree                                        1 failed | 59 passed    1 failed | 441   —        0         1
20:19 same tree                                        60 passed               442 passed       —        0         0
20:22 d73ef9c, same code, default workers               60 passed               442 passed       —        0         0
20:22 same tree, CPU median 70%                         60 passed               442 passed       —        0         0
20:23 same tree, CPU median 100%                        60 passed               442 passed       —        0         0
```

Six runs on the final code revision, in three load states (CPU median 35%, 70% and 100%, node processes 29-66 against 32 logical cores), and the watchdog fired in none of them; `test/visual-evidence.test.ts` measured 6,143, 13,940, 3,779, 3,021, 3,955 and 3,211 ms across them, all green.

The 20:17 exit 1 is a different defect, found by these runs and **not fixed here**: `test/tile-memory.test.ts` failed with `SyntaxError: Unexpected end of JSON input` at `JSON.parse(repaired.stdout…)`, its LRU child having produced no stdout inside the `spawnSync` budget of 2,000 ms. Measured on the same machine minutes later, that child takes **66-87 ms** over six runs, so the budget is not tight in steady state; what the run shows is that a stall on this box can miss it, and that the failure then surfaces as a JSON parse error rather than as the timeout it is. It is the same class as this entry's second finding and belongs to its own lane.

**Corrected 2026-09-16, in the entry below.** This paragraph names the wrong arm and therefore the wrong child. The line that threw is `13:15`, `JSON.parse(control.stdout.trim())`, and the child is the `--fractional` control, which hangs by design and needs only its *first* line inside the budget — not the repaired child, which runs to completion (`artifacts/flake/gate-R6.log:171-177`, re-read for the fix). The class is unchanged and the diagnosis of it was right; the arm was not.

**The four evidence classes this file carries still refuse, re-measured on this revision** (the same four the earlier entry, "The complete visual evidence check catches erased or changed captures", records as red controls). `node artifacts/flake-probes/defect-probe.ts` builds the synthetic 44-frame run, certifies it — `All 44 fresh native-resolution frames survived the complete visual gate with matching hashes.` — then reintroduces each defect in the evidence and prints `verifyVisualRun`'s own message:

```
a sibling frame deleted      ENOENT: no such file or directory, open '…\hero\hero-satellite-dusk-crossing.png'
one byte changed in a frame  hero\hero-satellite-dusk-crossing.png changed after capture; its review
                             cannot transfer to different bytes.
a manifest dated before the
run                          Stale visual manifest: hero/hero.json. This complete run must capture every
                             required frame.
a byte changed in dist/      Visual build changed during capture: …\build.js. Rebuild and recapture
                             before reviewing this run.
```

Restoring each one certifies again, and `4 of 4 defects refused by name`.

**Bound.** The ceilings cover the two cases' own work at the contention this suite has produced on this machine, and the six final runs on `240bc38` are the sample: five green, one red for the `tile-memory` defect above, and no watchdog firing in any of them. Six runs cannot prove a race is gone; what is proved is the mechanism and that the case that triggered it no longer holds the loop. The `visual-instrument` groups carry one ceiling for four groups, so a case inside one that pays none of that cost is bounded loosely — it finishes in milliseconds either way. The tick loop's yield assumes the population's own update is time-independent, which is the property `src/agents/population/tick.ts` is built on and which no assertion here checks; a future edit that reads a wall clock inside the loop would make the turn a behaviour change rather than a courtesy. Nothing here touches `src/**`, `tools/visual/**`, the Playwright configs or `data/**`, and the certificate's own digests are unaffected: no test file is in the harness closure.

## The tile-memory case reports a stalled child as a stall, not as a JSON parse error

**Gate:** `npx vitest run test/tile-memory.test.ts` — `outputWithinBudget` and `controlRemainder` in `test/tile-memory.test.ts`, over the real zero-budget LRU unload in `test/fixtures/lru-disposal.mjs`. The fixture is unchanged, and nothing under `src/**` or `tools/**` is involved.

**Landed:** 2026-09-16 in `b308b78`, off `22ef994`, on branch `worker/tile-memory` in the worktree `artifacts/tile-memory/wt`. Not merged: the coordinator lands the branch.

**Why.** `npm test` failed once in six runs on this box with `SyntaxError: Unexpected end of JSON input`, and the arm it was recorded against was the wrong one. Both arms spawn the same fixture and parse its stdout without checking that it has any. `spawnSync` at its budget returns `error.code = "ETIMEDOUT"`, `status = null`, `signal = "SIGTERM"` and **no stdout at all** — measured over budgets of 1, 5, 20, 50 and 100 ms, 0 bytes each time, against 75 bytes and exit 0 at 2,000 ms (scratch probe `artifacts/tile-memory-probe/spawn-budget-probe.mjs`, worktree-ignored under `artifacts/tile-memory/wt` and gone with it) — so `JSON.parse` over that empty string is the reported `SyntaxError`, and the timeout is reported as a claim about JSON.

**The arm that threw is the control, and the child is the one that is supposed to hang.** `artifacts/flake/gate-R6.log:171-177` puts the failure at `13:15`, `JSON.parse(control.stdout.trim())`; the control's budget is *meant* to expire, because the `--fractional` child prints one line and then never returns — it was still running when killed at 25 s, and its remainder is `1.1102230246251565e-16`. All that child needs inside the budget is its first line. Deliberately reproduced in a scratch copy of the file inside the worktree with the control's budget cut from 2,000 ms to 50 ms and everything else byte-identical: `npx vitest run test/zz-scratch-control-budget.test.ts` exits 1 in 237 ms with the same `SyntaxError: Unexpected end of JSON input`, the caret on the control's parse. The repaired arm cannot produce it — with its own budget cut to 5 ms it fails earlier, at `expect(repaired.error).toBeUndefined()`, with `Error { "message": "spawnSync C:\\Program Files\\nodejs\\node.exe ETIMEDOUT", "code": "ETIMEDOUT" }` — which is what makes the earlier entry's attribution wrong from the code and not only from the log. That entry now carries a dated correction.

**What changed.** No arm parses an empty string. A child with `error` set, a control child that settles before printing a complete line, and a child that exits with nothing on stdout each fail by name, with the command line as it ran, the budget it missed, the child's measured cost on this box and what to do next. The control's two windows are now two numbers rather than one: the load-sensitive budget for its first line, and the hang window after that line. The budgets are derived in the file's header from the child's own work, measured here with the loaded 60-file suite running on the same box — 66-152 ms from spawn to exit over 25 runs and 66-112 ms to the control's first line over 25, against 66-87 ms over six runs recorded earlier — so `CHILD_BUDGET_MS` is 15 s (100x the top measurement, 7.5x the 2,000 ms a stall broke), `HANG_WINDOW_MS` stays 2,000 ms because a hang cannot be made shorter or longer by load, and `CASE_BUDGET_MS` is 37 s, checked against both. No assertion about the LRU totals was weakened: `{ removed: 3, remaining: 0 }` and `remainder > 0` are the same assertions over the same fixture.

**Red controls, each run from the worktree at `b308b78` and each restored byte-for-byte afterwards** (the file's SHA-256 is `9732123AF23ED874A8D7009E23EC362E651540AC1743A061AA8EE3FE366F712F` before and after all three), and each quoted in full so it can be rebuilt from this entry alone:

Mutation R1, `CHILD_BUDGET_MS = 1`, standing in for the stalled box, exit 1 in 18 ms:

```
Error: C:\Program Files\nodejs\node.exe test/fixtures/lru-disposal.mjs produced no output within its 1 ms budget, so
this run measured nothing and there was no JSON to read. That child boots Node, strips types from two modules and
does this work in 66-152 ms on this box, so a missed budget is a stall and not slow work: re-run it, and if it
repeats on an idle box the child is the defect rather than the budget.
 ❯ outputWithinBudget test/tile-memory.test.ts:56:26
```

Mutation R2, the control's first-line budget alone cut to 1 ms — the exact case that reported a parse error at 20:18 — exit 1 in 139 ms:

```
Error: C:\Program Files\nodejs\node.exe test/fixtures/lru-disposal.mjs --fractional produced no output within its
1 ms budget, so this run measured nothing and there was no JSON to read. That child boots Node, strips types from
two modules and does this work in 66-112 ms to its first line on this box, so a missed budget is a stall and not
slow work: re-run it, and if it repeats on an idle box the child is the defect rather than the budget.
```

Mutation R3, the control pointed at the terminating arm (`childArgs()` in place of `childArgs("--fractional")`), so the child prints and exits instead of hanging — the check that can tell a hang from a result, exit 1 in 2.47 s:

```
AssertionError: C:\Program Files\nodejs\node.exe test/fixtures/lru-disposal.mjs exited 0 within 2000 ms of printing
its remainder, so fractional estimates no longer hang the zero-budget unload, which is the defect this arm exists
to reintroduce.: expected true to be false // Object.is equality
```

**Green, all on the committed bytes.** `npx vitest run test/tile-memory.test.ts` exit 0 ten times over, at 100% CPU with 73 node processes for the first six and 2,162-2,194 ms per case for the last four; `npm test` exit 0 four times — twice before the file's last two cosmetic edits, twice on the committed revision — each reporting `Test Files 60 passed (60)` and `Tests 442 passed (442)` with no `Errors` line and no `Timeout calling "onTaskUpdate"` anywhere in the logs, at CPU 93%, 80%, 65% and 47%. The case still costs its old 2.2 s: the control's kill and the hang window are the same 2,000 ms it used to spend waiting to be killed. Typecheck, build and audit were exit 0 on the same revision. `npm run visual` was not run: this change is one unit-test file, no test file is in the harness closure, and the gate is a three-hour run that owns the machine.

**Bound.** The budgets are derived from one child on one box, measured while a sibling checkout held 47-100% of 32 logical cores; they bound *this* child's startup and LRU work and say nothing about any other spawn in the suite, which still carry the plain numbers they were written with. The stall factor the fix is sized against is the one failure observed — a `--fractional` child that had not printed its first line after 2,000 ms against 66-87 ms in steady state — so it is sized at about 100x the measured worst rather than derived from a distribution. A box stalled past 15 s still fails this case, now with a message that says so; that red is honest and not a flake. Nothing here proves the LRU zero-budget disposal is right on any input other than the three items and the two accountings the fixture builds, which is the bound the case already carried.

## The flythrough's held frames are judged on the scene being alive

**Gate:** `npm test` — `test/flythrough-frames.test.ts`, the case "exempts a held frame from the travel floor, and fails a held frame whose scene went still, by name", checking the `cameraHeld` branch of `judgeSequence` in `tools/flythrough/frames.ts`.

**Landed:** 2026-09-17 on branch `worker/flythrough-check-fix` off `6780225`, in the worktree `artifacts/flythrough-fix/wt`. Not merged: the coordinator lands the branch.

**Why the gate had to exist.** The crowd leg's last six steps hold the camera still on purpose — "held: the camera asks for nothing, the population does not" — so that every change between those frames is the scene's own. Until this landing nothing checked that the scene actually changed there: the 1 mm travel floor failed the hold for being still (the 2026-09-16 run's crowd-008…011 complaints), and the aggregate distinct-digest check cannot see one repeated pair in 46 frames (97.8% distinct against a 95% floor). The adjudication of that run is `artifacts/flythrough2/adjudication-report.md`; the fix marks the six steps `holdsCamera` in `tools/flythrough/plan.ts`, the spec copies the mark onto each frame record, and the judge exempts held pairs from the travel floor and instead requires the digest to differ from the previous frame and the render counter and population ticks to have advanced.

**Mutation A — the digest rule neutralised:** `if (frame.sha256 === previous.sha256)` → `if (false)` in the held-pair check, nothing else changed. `npx vitest run test/flythrough-frames.test.ts`, exit status 1, in 0.38 s (re-watched 2026-09-17 against the widened fixture, which now holds three frames of the crowd leg; the message is identical):

```
 FAIL  test/flythrough-frames.test.ts > judgeSequence > exempts a held frame from the travel floor, and fails a held frame whose scene went still, by name
AssertionError: expected '5 distinct digests across 6 frames (8…' to match /1 of 3 held frame pairs show a scene …/

+ Received: 
"5 distinct digests across 6 frames (83.3%), and the most repeated one appears 2 times. The frames are the same bytes written more than once, so at least 1 of them are a copy of another and none of them is a frame of a moving city."
```

The only thing that fired is the aggregate digest check, which the synthetic fixture trips because one repeat in six frames is 83.3% under a 95% floor; the real lane's one dead hold pair in 46 frames is 97.8% and passes it. The held frame's own message — the one that names the frame and says the scene went still during the hold — never appeared.

**Mutation B — the hold exemption removed:** `still.filter((frame) => frame.cameraHeld !== true)` widened to count held frames again (the pre-fix behaviour). Exit status 1:

```
AssertionError: expected [ Array(1) ] to deeply equal []
+   "3 of 2 frame pairs moved the camera less than 1 mm (frames/crowd/crowd-003.png, frames/crowd/crowd-004.png, frames/crowd/crowd-005.png). The camera is driven by synthesised pointer, wheel and key input, and a pair of frames taken from two poses is the only evidence that the input path reaches the controls at all: identical frames from a moving route mean the route was not flown, whatever the manifest says.",
```

which is the 2026-09-16 crowd-008…011 false complaint reproduced: the designed hold failed for being still. That the message reads "3 of 2 frame pairs" is the mutation's own arithmetic — the denominator subtracts the held pairs the failure no longer exempts — and it is left as watched rather than tidied.

**Green on the restored bytes:** 15 cases passed in 0.39 s, which was that revision's case count — `test/flythrough-frames.test.ts` is 18 cases since the 2026-09-17 review fixes. `tools/flythrough/frames.ts` SHA-256 `2C07A565DC45…` and `tools/flythrough/structure.ts` SHA-256 `7EB649E8D146…` before and after all seven mutations of this landing. **Correction, 2026-09-17:** the `frames.ts` hash quoted here was the CRLF (checked-out) form of the `934a363` blob, and `54a9422` then rewrote the file, so it described bytes no later revision carried; the hash of that file's committed blob at the landing, `3471F06AA7F80E3872BDAF1ABBAD6584B02C3543445DEC0DB4E14167750963F8` (the `54a9422` blob, re-derived with `git hash-object`), is the re-checkable one, and `git hash-object tools/flythrough/frames.ts` on the committed revision is how to take it. The `structure.ts` hash does match its LF blob. Both files changed again in the review-driven fixes landing of 2026-09-17 (the structure floor gained an absolute floor on its relative leg, and the judge gained the plan-bounded hold checks), so these two hashes no longer describe the current revision; the two reds those changes were watched through are recorded in the calibration paragraph below and in "The flythrough's hold exemption is bounded by the plan". The frozen-clock half of the same case (render counter and population ticks flat between held frames) fails with `crowd-004.png: the render counter did not advance` and `the population ticks did not advance`, unmutated — those two signals share the mutation's branch only through the digest line.

**Bound.** Synthetic records over `judgeSequence`: the case proves the check fires by name, not that any browser run produces such records. A held first-frame-of-a-leg has no predecessor and is no pair, exactly as with travel — the plan never writes one. The liveness claim is three signals between adjacent captures of one leg (bytes, render counter, population ticks); it says nothing about what the changing pixels show, which remains a file to open.

## The flythrough's travel floor survives exempting the hold

**Gate:** `npm test` — `test/flythrough-frames.test.ts`, the case "fails a pair of adjacent frames the camera did not move between", over the sub-1 mm branch of `judgeSequence` in `tools/flythrough/frames.ts`.

**Landed:** 2026-09-17 on branch `worker/flythrough-check-fix` off `6780225`, in the worktree `artifacts/flythrough-fix/wt`. Not merged: the coordinator lands the branch. The floor itself predates this landing; what this landing proves is that exempting the six held crowd pairs did not gut it.

**Mutation:** `if (stillDriven.length > 0)` → `if (false)` — the travel-floor failure removed. `npx vitest run test/flythrough-frames.test.ts`, exit status 1:

```
AssertionError: expected '' to match /1 of 5 frame pairs moved the camera l…/

+ Received: 
""
```

A moving-leg pair at 0.4 mm passed silently. Restored: 15 passed.

**The denominator's own guard, watched red in the same run shape.** The pair filter widened to count null travels as pairs (`frame.cameraTravelM !== null || true`) — the recorder-side defect this landing fixes in the spec, where the first frame of a leg was written `0` instead of `null` — and the fixture's "1 of 5 frame pairs" became "2 of 6 frame pairs moved the camera less than 1 mm (frames/overview/overview-000.png, frames/overview/overview-003.png)…", the phantom leg-first pair named first, exit status 1 with four cases red. The 2026-09-16 run reported "8 of 46 frame pairs" over a denominator that included four such pseudo-pairs; the honest count was 42.

**Bound.** The fixture's moving pairs carry 11-15 m of synthetic travel, so the floor's edge is exercised only from below (a 0.4 mm pair) and from the null side, never at exactly 1 mm. The red-control branch is separately pinned by the case beside it, including that held frames are *not* exempt there: exempting them was watched red as `expected '' to match /1 of 5 frame pairs still moved the camera/`, a held frame moved 3 m under zero-delta input and the control passed silently.

## The flythrough's hold exemption is bounded by the plan, not by the record it exempts

**Gate:** `npm test` — `test/flythrough-frames.test.ts`, the cases "fails a sequence that marks more frames held than the plan holds, by leg, so the exemption cannot grow" and "fails held frames scattered through a leg, because the plan's hold is one run at the tail", over the `heldPairs` expectation of `judgeSequence` in `tools/flythrough/frames.ts`.

**Landed:** 2026-09-17 on branch `worker/flythrough-review-fixes` off `144766b`, in the worktree `artifacts/flythrough-review-fixes/wt`, on the independent review's medium-low finding (2) in `artifacts/review-flythrough-fixes/r1.md`. Not merged: the coordinator lands the branch.

**Why the gate had to exist.** The hold exemption was bounded by nothing: `judgeSequence` exempted every frame whose own record said `cameraHeld: true` from the travel floor, and no code counted how many frames may carry that mark or checked it against the plan's six marked crowd steps. Six synthetic frames, every one held with `cameraTravelM: 0`, distinct digests and advancing counters, returned **0 failures** — a completely static camera reported as a flythrough. What was at risk was the travel floor, the check's main claim about the input path, being one plan flag away from vacuous over the whole route. `SequenceExpectations` now carries `heldPairs`, the count the plan's own `holdsCamera` steps imply per leg, and the spec derives it from `LEGS` rather than the records.

**Mutation — the check disabled:** the whole plan-bounded hold block deleted from `judgeSequence` (everything between the red-control branch and the travel-floor exemption), nothing else changed. `npx vitest run test/flythrough-frames.test.ts`, exit status 1:

```
 ❯ test/flythrough-frames.test.ts (18 tests | 2 failed) 30ms
   × judgeSequence > fails a sequence that marks more frames held than the plan holds, by leg, so the exemption cannot grow 3ms
   × judgeSequence > fails held frames scattered through a leg, because the plan's hold is one run at the tail 0ms
```

Both cases are red against the pre-fix judge and green with it restored (18 passed), which is the six-frame static-camera record reproduced as a passing flythrough.

**The check does not move the recorded run.** The 46-frame record in `artifacts/flythrough2/manifest.json` — 11/12/12/11 frames over overview, approach, crowd and ascent, with exactly 6 `cameraHeld: true` frames, all in the crowd leg's closing steps — was fed through the shipping `judgeSequence` with the plan's own `{ crowd: 5 }` and `FRAME_FLOORS`: **0 failures**, as it was before the change. The reds above are the mutated records, not the lane's own.

**Bound.** Synthetic records over `judgeSequence`: the cases prove the check fires on the records they construct — a leg the plan holds nothing in, a leg that holds more than the plan, a leg that holds the same number in separate runs, and a run of the right length in the wrong place — and the plan side of the comparison is the spec's own read of `LEGS`, so a plan that itself marked every step held would move both sides together and this check would not see it. What it does not bound is the run: only a lane run shows the real 46-frame record passing. A held first-frame-of-a-leg is no pair, so the held pair count is one less than the held frame count, and the judge derives the frame count from it that way.

## The flythrough's structure floor reads a dark facade as structured and a blank frame as nothing

**Gate:** `npm test` — `test/flythrough-frames.test.ts`, the case "reads a dark but textured frame as structured, and a blank sky as nothing", driving `structuredFraction` in `tools/flythrough/structure.ts` over two synthetic 1280x720 frames, plus the case "reads a flat dark surface with dither as nothing, so noise cannot qualify a whole frame" added on 2026-09-17.

**Landed:** 2026-09-17 on branch `worker/flythrough-check-fix` off `6780225`, in the worktree `artifacts/flythrough-fix/wt`. Not merged: the coordinator lands the branch. The absolute floor on the relative leg was added the same day on branch `worker/flythrough-review-fixes` off `144766b`.

**Why.** The 2026-09-16 run failed approach-005 — a close dusk facade with window bands, lit balcony rails and an adjacent lit face, compositionally poor but not blank — at 4.2% of cells under a purely absolute deviation-12 threshold against a 5% floor: dusk tone mapping compresses absolute contrast, so the metric read exposure as absence of structure (`artifacts/flythrough2/adjudication-report.md`). A cell now counts when its luminance deviation exceeds 12 absolute units **or** when it is above 8 mean, above 2 absolute deviation and above 30% of its own mean. The original relative leg was guarded only by a mean above 2, which the independent review's finding (1) showed admits a flat dark frame: at mean 3 the leg needed a deviation of only 0.9 of an 8-bit level, which ±1 of quantization dither supplies in every cell.

**Mutation A — the relative leg removed** (`deviation > 12` alone, the pre-fix rule): the dark-textured fixture — every cell alternating 12 and 28 luminance in 2-pixel blocks, mean 20, deviation 8, ratio 0.4 — scores zero:

```
AssertionError: expected +0 to be 1 // Object.is equality
```

Exit status 1. That is approach-005's false positive reproduced synthetically: a frame of nothing but texture reads as a blank wall.

**Mutation B — every cell structured** (`deviation >= 0`): the blank-sky fixture, one luminance across the whole frame, scores one:

```
AssertionError: expected 1 to be +0 // Object.is equality
```

Exit status 1. Under it the floor that fails a leg aimed at the sky is gone.

**Calibration, measured with the shipped function over the real frame bytes** (`artifacts/flythrough2/frames/approach/approach-005.png`, SHA-256 `5abe0a752112b49d0a7f83264a7b7d07a47ff0fb04d8cda8cf6d1def03084d36`, the same bytes the run's manifest records): approach-005 scores **17.4%** — 25 of 144 cells, 6 on the absolute leg and 19 on the relative leg — against the 5% floor, where the absolute leg alone scores 4.2% (6 of 144). The run's own manifest agrees, recording `structuredPixels: 0.173611…` for the frame. The frame's flattest cell, the clear-sky cell (3, 8), measures deviation 0.376 at mean 25.45 (ratio 0.0148) and stays structured-free under both legs, and every cell that qualifies through the relative leg has a mean above 16 (the lowest is 16.71, deviation 5.69, ratio 0.341), which is why the mean floor at 8 costs the real frame nothing. The absolute leg's 6 cells of 144 are the 4.2% the adjudication published. **An earlier revision of this entry recorded 15.3% (22 of 144: 6 absolute + 16 relative) from `artifacts/flythrough-fix/scratch-calibration.txt`.** That worktree and its scratch file are gone, the figure was a third run's bytes, and it does not reproduce against any frame on disk; the 17.4% above is re-measured from the surviving frame and its manifest, and the correction was made on 2026-09-17 by the review-driven fixes landing.

The rule this calibration sits under picked up an absolute floor on the relative leg in that same landing: a cell now counts on `deviation > 12` or on `deviation > 2 && mean > 8 && deviation / mean > 0.3`. One flat surface at mean 3 with ±1 of quantization dither has a deviation of exactly 1 in every cell — 33% of its own mean — so the earlier `mean > 2 && deviation / mean > 0.3` leg scored such a frame 1.0 and admitted a frame of one near-black surface. The case "reads a flat dark surface with dither as nothing, so noise cannot qualify a whole frame" puts that frame back and was watched red as `expected 1 to be +0`; approach-005's 25 cells are unchanged by the floor, because all 19 of its relative-leg cells sit above mean 16 with deviations of 5.7 or more.

**Bound.** The synthetic fixtures pin the rule's two ends; the real-frame calibration pins the 0.3 threshold to the one dark frame this lane has produced, tuned against it and its 45 neighbours from one run at the dusk preset. A bright frame is unaffected by construction — the absolute leg dominates there — but no noon-preset run exists to prove the relative leg stays quiet on one. The metric still cannot tell a textured wall from the city: a close facade passes it, which is a review question rather than a metric one.

## The flythrough's approach swing reaches the crowd's bearing through the drag the driver delivers

**Gate:** `npm test` — `test/flythrough-plan.test.ts`, the case "opens the crowd leg on the crowd's bearing and lands the ascent back on the opening one", flying `LEGS` from `tools/flythrough/plan.ts` through `rotateStepRadians` and `shortestAngle` in `tools/flythrough/driver.ts` at the capture viewport from `tools/visual/shots.ts`.

**Landed:** 2026-09-17 as `67aa9c9` on branch `worker/flythrough-swing-fix` off `f06aaf8`, in the worktree `artifacts/flythrough-swing/wt`. Not merged: the coordinator lands the branch.

**Why.** The 2026-09-16 run failed on `frames/crowd/crowd-000.png` being captured 0.6 m above the highest terrain under it at (-383, -479). The mechanism is arithmetic in the plan: the approach leg interpolated its bearing from `OPENING_AZIMUTH` 0.7854 the long way round to `CROWD_AZIMUTH` 2.2253, `OPENING_AZIMUTH + (CROWD_AZIMUTH + 2*PI - OPENING_AZIMUTH) * swing`, which is 7.7231 rad over steps 6..11 of the leg — 1.2872 rad a step against the 0.3491 rad (40 px at 1280x720) the driver's rotate drag can dispatch in one gesture. The driver delivered 0.3491 a step and `shortestAngle` flipped sign twice, so the approach ended at azimuth **1.2872** where the crowd leg's first frame needed **2.2253** — 0.9381 rad, 53.8 degrees, short. The crowd leg then opened on a hill face about 17 m from the scored pose, and its one capped stand correction of about 1.1 m plus the 0.3 m hold clearance could not cover a 3.5-4.4 m shortfall. The clearance check that caught it is correct and unchanged.

**Mutation — the long way round restored:** in `tools/flythrough/plan.ts`, `OPENING_AZIMUTH + (CROWD_AZIMUTH - OPENING_AZIMUTH) * swing` → `OPENING_AZIMUTH + (CROWD_AZIMUTH + 2 * Math.PI - OPENING_AZIMUTH) * swing`, nothing else changed. `npx vitest run test/flythrough-plan.test.ts`, exit status 1, in 0.8 s:

```
AssertionError: the approach leg delivers the camera to azimuth 1.2872 rad and the crowd leg's first frame needs
2.2253. The crowd leg opens wherever the swing stopped, so a swing outside the driver's 0.3491 rad a step cap
lands it on the wrong side of the knot: expected 0.9381162336791848 to be less than 0.05
```

The delivered azimuth in that message is the one the run's own failure came from, and it is the number the old plan produced, so the red is the defect rather than a synthetic stand-in for it.

**Green on the restored bytes:** 1 passed in 0.4 s. The repaired swing asks for 1.4399 rad in total — 82.5 degrees, 0.2400 rad a step, inside the cap — and the last step lands on `CROWD_AZIMUTH` with an error of 0.

**The ascent, measured rather than assumed.** `ASCENT_STEPS` carries the same unwrapped form, `CROWD_AZIMUTH + (OPENING_AZIMUTH + 2*PI - CROWD_AZIMUTH) * ((index + 1) / 4)` for its first four steps, and it **converges**: the driver's shortest-angle arithmetic reverses at step 3 after 1.0472 rad the wrong way, and the last eight steps turn the short way home — **3.5343 rad** of travel through eleven steps whose cap is 0.3491 each, which is 3.840. It lands **exactly** on `OPENING_AZIMUTH` at the final step, index 10 of 0..10, with an error of 0; the tenth step carries the last 0.0436 rad, so there is no spare step and the last step is the one that arrives. The test's `TOLERANCE_RAD` is 0.05, so deleting that last step leaves the case green with the end 0.043644 rad off — the tolerance, not the step count, is what the case's last step passes on. It is not monotone, unlike the repaired approach swing, and it is left unchanged because it arrives; the case asserts the end, not the path. A later `CROWD_AZIMUTH`, a longer ascent or a smaller `maxRotatePx` would not fit the cap. **This paragraph replaces an earlier one that said the leg "reaches `OPENING_AZIMUTH` at step 10 with one step spare" and measured 3.538 rad of travel; both were wrong, and the corrected figures come from flying `ASCENT_STEPS` through the shipping `rotateStepRadians`/`shortestAngle` at 720 px and the 40 px cap (2026-09-17).**

**Bound.** The case flies the plan's own azimuth targets through the driver's own rotate arithmetic and the capture viewport's 720 px, so it proves the plan's swings are inside the cap the driver can deliver. It cannot prove the browser's input path dispatches the drag — only a run of the lane can — and it says nothing about the damping tail or the pose the controls actually settle at; the run's own frame records carry those. The canvas height is read from the shipping `CAPTURE_VIEWPORT` (`test/flythrough-plan.test.ts`, `canvasHeightPx`); `MAX_ROTATE_PX` 40 is **restated** at `test/flythrough-plan.test.ts:34` rather than imported, and is correct today only because `tools/flythrough/flythrough.spec.ts` constructs the driver without a `maxRotatePx` option, so `FlythroughDriver`'s constructor default applies; a run at another viewport, or one that passed a different cap, would deliver a different cap and this case would not notice. The ascent half of the case pins its end only to within 0.05 rad, which is 0.0436 rad more than the last step is worth — so it does not pin the step count it is cited for.

## The flythrough's clearance floor is read over the stand's own readings, not at the capture alone

**Gate:** `npm test` — the case "fails a recorded moment below the clearance floor even when the captured clearance passes, by name" in `test/flythrough-frames.test.ts`, over `judgeSequence` in `tools/flythrough/frames.ts` (`SequenceExpectations.clearanceFloorM`). The flythrough spec feeds it from `CLEARANCE_FLOOR_M` in `tools/flythrough/flythrough.spec.ts`, the same constant its per-frame clearance assertion now reads, so the two places cannot drift apart.

**Landed:** 2026-09-17 on branch `clearance-bound` off `057085f`, in the worktree `artifacts/clearance-bound/wt`. Not merged: the coordinator lands the branch.

**Why.** The lane's clearance assertion read the camera once per frame, at the instant of the screenshot, so a leg whose vertical control dropped the camera below the floor and lifted it again before the shot passed it. The 2026-09-17 run did exactly that: `artifacts/flythrough2/manifest.json` records `frames/approach/approach-009.png` at a captured clearance of **2.68534 m** — clear of the 1.5 m floor — while the same step's `stand` read `heightBeforeM` **0.19419 m**, and `approach-010.png` at **1.07751 m** before its own control ran. The driver recorded both readings in every frame whose step dispatched a vertical control, and the manifest carries them; nothing read them.

**Mutation:** the two stand readings dropped from the check, leaving it reading the captured clearance alone — the check as it stood before this unit. `if (frame.stand) {` → `if (frame.stand && false) {` in `tools/flythrough/frames.ts`, nothing else changed.

**Failure:** `npx vitest run test/flythrough-frames.test.ts -t "clearance"`, exit status 1, one of the two selected cases red:

```
× judgeSequence > fails a recorded moment below the clearance floor even when the captured clearance passes, by name
AssertionError: expected '' to match /no recorded moment of this leg put th…/
- Expected:
/no recorded moment of this leg put the camera below the leg's clearance floor/
+ Received:
""
```

The mutation leaves the judge silent about a stand that read 0.19 m, which is the defect itself. The same case was watched red a second time against the unmodified tree before the check existed, with the same message, and restoring the bytes makes it green. The check's own message over that fixture — one frame carrying the recorded run's numbers — reads:

```
1 recorded moment across 1 frame sits below the 1.5 m clearance floor (frames/approach/approach-009.png: 0.19 m at the stand's height before the vertical control ran); the lowest is 0.19 m at frames/approach/approach-009.png. What this asserts is exactly "no recorded moment of this leg put the camera below the leg's clearance floor", and not that the path never dipped: the captured clearance is read at the instant of the shot, and the stand's two heights bracket the one step whose vertical control produced them, so the camera's path between two recorded moments is not sampled here. Raise that leg's vertical control, or lower its clearance floor, if the moment was intended.
```

**The recorded run fails the new check, and the floor was not lowered to pass it.** Run over the 46 frames of `artifacts/flythrough2/manifest.json`, the check reports:

```
2 recorded moments across 2 frames sit below the 1.5 m clearance floor (frames/approach/approach-009.png: 0.19 m at the stand's height before the vertical control ran; frames/approach/approach-010.png: 1.08 m at the stand's height before the vertical control ran); the lowest is 0.19 m at frames/approach/approach-009.png. What this asserts is exactly "no recorded moment of this leg put the camera below the leg's clearance floor", and not that the path never dipped: the captured clearance is read at the instant of the shot, and the stand's two heights bracket the one step whose vertical control produced them, so the camera's path between two recorded moments is not sampled here. Raise that leg's vertical control, or lower its clearance floor, if the moment was intended.
```

The lowest recorded moment in the run is approach-009's 0.19419 m, so the run would need a clearance floor at or below 0.194 m to pass, and the floor is the existing 1.5 m the per-frame assertion has always used. Both offending frames are in the approach leg, whose own plan floor is `minClearanceM` 2, so reading the plan's per-leg floor instead fails the same two moments and needs the same 0.194 m to pass. The dip is real: that step's vertical control stood the camera 0.19 m above the ground on its way to a 4.5 m stand, and the captured 2.685 m is the `holdClearance` nudge that ran afterwards. A check made to pass this run would have to accept a camera 19 cm above the ground.

**Bound.** The check reads only the moments the record kept: the captured clearance, and the stand's `heightBeforeM` and `heightAfterM` where the plan dispatched a vertical control. A path that dips below the floor *between* two recorded moments, or during a step whose plan ran no stand, is invisible here, and the message says so — the claim is exactly the case's name and not that the continuous path never dipped. It also fails by name a frame whose record carries no captured clearance at all, so a record that drops the field reports "did not run" rather than reading as a pass. The floor itself is one constant shared with the per-frame assertion and is **not** the plan's per-leg `minClearanceM`: the legs set 40 m (overview) and 2 m (the three street legs) while the assertion has always used 1.5 m, and this unit did not change which floor the lane holds itself to.
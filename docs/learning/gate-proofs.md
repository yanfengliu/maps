# Gate proofs

A gate that has never been made to go red is not yet a gate. Each entry below names the gate, the mutation that broke it, the failure the mutation produced, and the commit the gate landed in.

There is no `lessons.md` in this repo yet. Phase 0's findings became gates and repo rules in the same commit that learned them, so nothing was queued waiting for a gate. Entries here still stand on their own: they are what proves each gate can fail.

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

## Not yet proved red

Three failure paths are written and reachable and have never been watched to fire. They are code, not evidence, and a later phase that relies on one should make it go red first.

- **WebGL unavailable** — `createRenderer` and `waitForFirstFrame`. Forcing headless Chromium to refuse a context without also breaking the page some other way needs a launch-flag combination that was not worth chasing in Phase 0.
- **The render loop stopping mid-sweep** — the stalled-frame-count branch in `OrbitDriver.settle`. Needs the loop to die after the first frame, which no natural failure in Phase 0 produced.
- **The camera never settling** — the poll-limit branch in `OrbitDriver.settle`. Would need damping turned off or a control that oscillates.


## Network source semantics, complete bodies and boundary lifecycle

**Gate:** `test/network-review.test.ts`, `test/network-compound.test.ts`, `test/network-boundaries.test.ts`, `test/network-mesh.test.ts`, `tools/network/check-admission.ts` and `tools/network/check-boundaries.ts`. These are source/controller and supported-body checks, not populated traffic or visual proof. The promoted fixtures retain their source IDs, real path geometry, declared omitted successors and actual measured asset records.

**Landed:** reviewed Phase 6 network milestone, 2026-09-11. Reviews 0, 1, 3 and 5 and snapshots 0–3 remain permanent. No prior lesson prose is retired by this entry.

**Source mutations:** the exact rejected builder failed internal/cross-way continuations, conflict lateral links and missing physical/control metadata. Removing cross-way permission propagation admitted a forbidden straight movement. Skipping stop dwell wrongly granted actor `s`. Centre-only clearance released a vehicle while its tail remained inside. The real source dead-end/no-U-turn exclusion remained a passing control.

**F4 mutations:** the unchanged nineteen-test compound copy passed. One-pass grouping failed a newly exposed primitive pair; physical-gap release failed short vehicles, pedestrians, delayed signals and repeated laps; skipped dwell failed mapped/internal/later-lap stops; moving mapped stop distance to edge zero failed actual source and projection cases; ignored size limits admitted an oversized body; allowing backwards progress failed route occurrence checks. Each isolated mutant exited with semantic test failure. The old flat11.1m proof bounds remain historical.

**F5 mutations:** the unchanged eleven-test boundary copy passed. Eight isolated mutants each exited one: restored controlled-terminal rejection failed the actual vehicle and both walking endpoints; retiring before full body clearance failed all six terminal cases; leaving active set or leaving a lease failed atomic retirement; materializing before a grant failed the physical-only entrance; ignoring generation or displayed class failed unchanged-state checks; omitting body height from projection failed independent tilted-bus bounds. Raw copies and logs are retained under ignored `artifacts/network/f5-mutations/`, bound by the Review 5 candidate manifest SHA-256 `611b82612bd360a9815855a1d187fc3c8d90c53a2d1f32d043653a7e520b1545`.

**Decoder red proof:** against the original shared decoder, browser bytes and an offset Uint8Array passed while Node Buffer returned `7.185598589700907e+22` instead of `0` for the first position. Explicitly copying the selected byte view makes all three cases pass.

**Measured bounds:** all 77 vehicle exits with three generated tilted classes plus 33 walking exits produce 264 lifecycle traces; 264 reachable entry/class cases include49 initial authorities, six physical-only prefixes and28 ordinary entry handoffs. An independent review checked42 analytic body projections. The corrected true-exit route census constructs3,444 vehicle and408 walking passages. Supported diameter≤11.6m, primitive gap≥12.1m, route gap≥12.5m, 1/60-second clock and selected quarter/half-metre samples define these proofs. Dwell/yield/capacity values are supplied fixtures. Continuous steering, surface contact, queues and200-vehicle throughput remain outside the claim.

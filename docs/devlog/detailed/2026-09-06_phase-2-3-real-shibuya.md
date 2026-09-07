# Devlog — 2026-09-06, Phases 2 and 3

Replacing the placeholder scene with real Shibuya: PLATEAU's terrain TIN, its road surfaces, and 1,740 buildings out of MLIT's own 3D Tiles.

The theme of the session is that **every defect found here rendered**. Not one of them produced a blank frame, an exception or a red test. A city lying on its side, a city with no buildings at all, and asphalt at sea level each came back as a plausible picture from a run that reported itself loaded, idle and error-free. What caught them was a check on the *scene* rather than on the framebuffer, and that check did not exist at the start of the session.

## The loader decision, and the evidence for it

**Action:** Evaluated `3d-tiles-renderer` 0.5.2 against writing a loader, before writing either. Parsed all 730 tiles of MLIT's `13113-bldg-lod2-texture-latest` tileset, measured the 67 that overlap the area of interest, and measured what they would cost resident.

**Result:** Take the library.

- The tileset is a genuine five-level `REPLACE` hierarchy with geometric errors from 316.06 down to 0. A purpose-built loader would inherit that for free and still have to add screen-space error selection, frustum culling, a download queue and an eviction policy.
- The eviction policy is not optional. **551.9 megapixels of texture over the 67 tiles, 25 of them carrying a 4096x4096 atlas — 2,943 MB decoded to RGBA with mipmaps.** Nothing holds that.
- Draco, batch tables and the b3dm container are all handled.

**Reasoning:** The cost of the library is three transitive dependencies this project does not use (`@mapbox/vector-tile`, `pbf`, `pmtiles`) and its assumption that tiles sit on an ellipsoid. The second is the real one, because Phase 0's frame contract forbids a global coordinate reaching the scene and the library's natural setup puts a seven-million-metre ECEF translation on a scene node. That is paid offline instead: `npm run data:scene` rewrites the tileset's `region` bounding volumes as `box`es in world metres and folds each tile's placement into an ordinary glTF root-node matrix, so the browser sees plain glTF 2.0 plus Draco with nothing over about two kilometres. The bundle grew from 634 KB to 707 KB minified.

**Validation:** All five gates green; the scene renders.

## The Draco decode: used everywhere, and it works

**Action:** `design.md` said the decode was "declared but never exercised" and named it the most likely thing to fail. Checked whether it is used at all, then exercised it.

**Result:** `KHR_draco_mesh_compression` is in `extensionsRequired` on **every one of the 67 tiles**, so nothing in this scene draws without it. It decodes: 532,315 triangles offline through three.js's own decoder run under Node, and again in the browser through the same decoder served out of `node_modules` at `/draco/`.

**Reasoning:** Running the decoder under Node was worth the twenty lines because it lets the pipeline reconcile decoded geometry against the batch table before anything is written, which is what caught the up-axis defect below. Loading it needed one non-obvious step: `three/examples/jsm/libs/draco/draco_decoder.js` is a UMD script that exports itself through `module.exports`, but it lives under a package declaring `"type": "module"`, so `require()` returns an **empty namespace object with no error at all**. That is the return-value failure the canon names — a call that cannot do what was asked hands back something the next line accepts. It is run through `node:vm` instead.

**Validation:** `tools/tiles/draco.ts`, exercised on all 67 tiles by `npm run data:scene`.

## glTF is Y-up and the RTC frame is Z-up, and nothing in the file says so

**Action:** Placed each tile by converting its `CESIUM_RTC` centre through ECEF to geodetic to EPSG:6677 to the world frame, with the linear part recovered numerically from the projection so the meridian convergence and the 0.9999 grid scale come out for free. Then reconciled every building's decoded bounding box against the one its own batch table states.

**Result:** The reconciliation failed. Buildings sat a median of **68 m** from where their batch table puts them, up to 122 m, and the vertical residuals spread over 179 m within a single tile.

**Reasoning:** 3D Tiles content is authored Y-up in the glTF convention over data that is Z-up in ECEF, and a runtime applies the turn between them. The `CESIUM_RTC` extension states a centre in ECEF metres and says nothing about this. With the turn applied — glTF (x, y, z) to (x, −z, y) — the residuals fell to **1 cm, up to 2 cm**.

Then the mirror image. With the turn folded into each tile's matrix, `3d-tiles-renderer` applied its own on top, because a tileset that does not declare `asset.gltfUpAxis` is assumed to be Y-up. The city came back tilted again, and this time the offline reconciliation could not see it because the offline reconciliation uses the composed matrix. What saw it was the drawn-geometry bounds the harness now publishes: `y: −678 to 748` where every building in the box stands between 8.7 m and 245.6 m. The fix is that the clipped tileset declares `gltfUpAxis: "z"`, which is true of what the pipeline writes.

**Validation:** `test/placement.test.ts`, made to go red by replacing the rotation with the identity — see `docs/learning/gate-proofs.md`. The whole-data check is `npm run data:scene`, which refuses at 2 m of horizontal residual and now measures 0.062 m.

**Notes:** Both halves of this are worth remembering as one lesson: **a rotation that is applied zero times and one that is applied twice look identical from the inside.** The only thing that separates them is a measurement taken outside the code that applies it.

## The tile cache counts decoded bytes, and a cache too small does not degrade

**Action:** Set `lruCache.maxBytesSize` to 48 MB, reasoning from the 137 MB the 67 tiles weigh on disk.

**Result:** All 67 tiles downloaded. **Seven** produced a model. The traversal never refined past the root, so the app drew the root tile's seventeen decimated buildings over the whole ward — and reported `idle: true`, `error: null`, `failed: 0`. Every pixel measure in the visual sweep passed on the resulting frames, because the terrain and the roads were still there. The frames were a correct map of Shibuya with no buildings on it.

**Reasoning:** The cache counts geometry plus each texture at width × height × 4 × 1.33, so one 4096x4096 atlas is 89 MB by that measure and 48 MB could not hold a single leaf tile. The mechanism that turns "cache too small" into "nothing refines" is in the library's `markVisibleTiles`: a `REPLACE` parent keeps displaying until every used child has finished loading, and a cache that cannot hold the children never lets that happen. There is no degraded mode — it is a deadlock that looks like a decision.

**Validation:** The `drawnTriangles` and `drawnBounds` assertions in the visual sweep, which read 663 and a ward-sized box on the failing run.

## Texture memory is the binding constraint on this scene, and the fix costs resolution

**Action:** Measured what the area of interest costs resident at several texture caps, tile by tile from the WebP headers.

| longest side | all 67 tiles | the 44 leaves |
|---|---|---|
| 4096, as published | 2,943 MB | 2,668 MB |
| 2048 | 1,199 MB | 923 MB |
| 1536 | 695 MB | 521 MB |
| 1024 | 335 MB | 235 MB |

**Result:** Capped at 1024 pixels on the longest side, in a `3d-tiles-renderer` plugin that shrinks textures in `processTileModel` — before the library measures the tile, so the cache budgets for what it will actually hold. 52 atlases are shrunk over a full sweep. The cache is then set to 448/512 MB, which holds the whole box at leaf detail from every framing and never evicts.

**Reasoning:** The alternative is to let the hierarchy stop higher up at wide framings, which is what a hierarchy is for — except that MLIT's coarse levels are aggressively decimated. Depth 4 over this box is **255 buildings of 1,740**, so an overhead frame would show the towers standing in an empty valley and would fail the plan's own acceptance criterion. Capping the texture keeps every building at every framing; the cost is real and is stated in `src/scene/texture-budget.ts`: PLATEAU's source JPEGs over mesh 53393596 hold 184.4 megapixels and MLIT's atlases over the same cell hold 314.6, so a 4096 atlas at 1024 is about a ninth of the source resolution. It is visible in the eye-level frames. Phase 4 owns facades and may raise the cap; the table above says what each step costs.

**Validation:** `MAX_TEXTURE_SIZE` in `src/scene/texture-budget.ts`, with the measured table in its own doc comment.

## Road surfaces below LOD3 are flat at z = 0, and the edge case is worse than the general one

**Action:** Built road surfaces from PLATEAU's `tran` module. Used LOD3 where a road has it and draped the rest onto the terrain, as `design.md` warns.

**Result:** 3,248 roads, 1,173 at LOD3 (36%, against `design.md`'s "about 43%"), 2,075 draped, 79,244 triangles.

**Reasoning:** The part `design.md` does not warn about is the edge. A road ring that reaches past the terrain has nothing to be draped onto, so the fallback keeps its own height — which for LOD1 and LOD2 is **exactly zero** — and a sheet of asphalt appears at sea level, fifteen metres under the valley, extending past the edge of the ground. Measured before the fix: the road mesh reached 874 m east where the terrain stops at 729 m, with its lowest vertex at 0.2 m. 461 polygons are now dropped for reaching past the terrain, and `npm run data:scene` refuses to write a road mesh whose lowest vertex is more than 5 m below the lowest ground.

Everything is also lifted 0.2 m and given `polygonOffset`, and the camera's near plane went from 0.5 m to 1 m. Depth resolution goes as the square of distance over the near plane: at the 950 m the overhead sweep sits at, 0.5 m of near resolves about 11 cm, which is not enough for a coplanar sheet 20 cm up. At 1 m it resolves about 5 cm.

## The geoid undulation, measured from the data rather than assumed

**Action:** `design.md` says the batch table's `_zmin` and `_zmax` are orthometric where the ECEF geometry is ellipsoidal, so the geoid never has to be touched. Verified it rather than assuming it: placed every tile with the published 36.877 m, decoded it, and compared each building's lowest vertex against its own `_zmin`.

**Result:** **36.786 m**, from 2,607 buildings, with a middle-98% spread of **0.094 m**. The claim holds, and the difference from the published value is 0.09 m.

**Reasoning:** The correction is derived from a single median residual, which is only valid if changing the undulation moves scene Y by exactly minus that amount and nothing sideways. That is asserted in the build rather than reasoned about, because the whole correction rests on it.

**Validation:** `npm run data:scene` fails if the measured undulation is more than 0.5 m from the published one — a scene 36.877 m out looks exactly like a scene that is right.

## The sentinel is `null`, not −9999

**Action:** `design.md` records 62 buildings with `bldg:measuredHeight` = −9999 and 298 with `bldg:storeysAboveGround` = 9999. Looked for them in the tiles the scene is actually built from.

**Result:** There are none. Not one −9999 and not one 9999 in any of the 67 tiles.

**Reasoning:** A binary batch-table column cannot hold a missing value, so MLIT's converter writes those columns as JSON arrays with `null` in them — and `Number(null)` is **0**. The same defect therefore arrives as a building of no height rather than as a building nine kilometres underground, which reads as bad modelling instead of a units bug. The counts match once you know what to count: 62 null heights and 297 null storey counts inside the box, cross-checked against the CityGML by `gml_id` with **zero disagreements** about whether a height exists.

**Validation:** `src/world/building-attributes.ts` is the one place either encoding is read, `test/sentinel.test.ts` is the gate over a real PLATEAU batch table, and it has been made to go red with `return Number(raw)`. The affected buildings are not dropped: every one of the 1,740 has real geometry in the tiles, and only their attributes are unusable.

## The LOD1 buildings are in the same tileset

**Action:** `design.md` said the 3.6% of AOI buildings that are LOD1 live in a separate tileset and must be merged on `gml_id`. Went looking for that tileset.

**Result:** They are in this one. `13113-bldg-lod2-texture-latest` carries the whole ward, and the batch table's `_lod` says which is which — 1,676 at LOD2 and **64** at LOD1 inside the box, matched against the CityGML's own `lod2Solid`/`lod2MultiSurface` presence with **zero disagreements**.

**Reasoning:** Phase 1's sample was two tiles, and neither held an LOD1 feature. The untextured tiles are separate *tiles*, not a separate *tileset*. They render as white blocks, which is exactly the set plan item 15 assigns procedural window grids to.

## The building count is 1,740, and the last digit is a property of the rule

**Result:** The same measurement Phase 1 made — the centroid of `lod0RoofEdge` inside the box — run again over the same files gives **1,740**, not 1,741, and 1,676/64 rather than 1,678/63.

**Reasoning:** Not a parsing disagreement. **25 buildings have their centroid within two metres of the boundary**, so which side of the line they fall on depends on exactly how the centroid is computed and on nothing about Shibuya. All 1,740 are in the scene and all 1,740 matched the tiles by `gml_id`.

## Where the derived scene lives, and what that costs

**Action:** `npm run data:scene` writes 148 MB into a gitignored `data/scene/`. A small Vite plugin serves it at `/scene/`, and three.js's Draco decoder at `/draco/`, in both the dev server and `vite preview`.

**Reasoning:** The obvious alternative is `public/`, which would copy 148 MB into `dist/` on every build — and `npm run visual` builds before every run. The cost, stated plainly rather than discovered later: **`dist/` is not self-contained.** Anyone serving it from somewhere other than `vite preview` has to serve those two directories themselves. Nothing in this project does that today, and the app names the missing file rather than rendering an empty city.

## What is left undone

- **The three unproved visual-gate failure paths are still unproved** — WebGL unavailable, the loop stopping mid-sweep, the camera never settling. Phase 2 did not need any of them.
- **The 64 LOD1 buildings are white.** That is plan item 15's job and touching it here would have been Phase 4 work.
- **Texture resolution is a ninth of source at the cap.** One constant, with the cost table next to it.
- **No performance measurement.** Phase 9 owns the budget; all that is recorded here is that a sweep of eighteen poses on SwiftShader takes about twelve minutes and peaks at about 380 MB of graphics memory.

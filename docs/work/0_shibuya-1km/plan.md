# 1km x 1km animated Shibuya model

Status: Phases 0 to 3 complete and on main; Phase 4 next
Owner: Coordinator
Created: 2026-09-06
Updated: 2026-09-06

## Problem and outcome

Build a roughly 1 km by 1 km model of Shibuya, Tokyo that runs in real time in a browser, leans photoreal, and has pedestrians and vehicles moving through it.

The area of interest is a 1 km box centered on Shibuya Scramble Crossing at 35.6595 N, 139.7005 E, which gives 35.6550–35.6640 N and 139.6950–139.7060 E.

That box covers Hachikō Square, Shibuya 109, Center Gai, Shibuya Scramble Square, Miyashita Park and lower Dōgenzaka.

The deliverable is judged by what the rendered frames look like and how the scene behaves while you move through it. A green test run is not evidence for any of it.

## Scope

Included: everything in the eleven phases under Implementation steps, from the toolchain and its visual gates through data, pipeline, static scene, materials, lighting, the shared network graph, vehicles, pedestrians, performance and acceptance.

Excluded, and these are non-goals rather than deferred work:

- Not a map viewer.
- Not a navigation or routing product.
- Not a survey-grade reconstruction of the real place.
- No second location. Nothing past this deliverable is decided.

Ownership boundaries inside the work:

- Phase 0 blocks everything. Nothing else starts until the scaffold, the Playwright visual harness and the `Gates` section exist.
- Phase 6 produces a shared contract. The lane, sidewalk and crossing graph plus the signal phase model is the interface both agent workstreams build against, so it must be documented and frozen before Phases 7 and 8 run in parallel.
- Phases 4 and 5 are where the deliverable is won or lost. Treat them as the main body of work, not as polish after the geometry lands.

### Blockers (unresolved dependencies)

- Rigged pedestrian character models — no licensed source chosen. Blocks Phase 8.
- Japanese vehicle mix (kei cars, JPN Taxi, buses) — no licensed source chosen. Blocks Phase 7.
- Target agent counts (pedestrians and vehicles) — unset, so Phase 9 has no acceptance criterion. Needs an owner decision.

## Approach

These decisions are settled. Reopen one only with a reason that is new, not with a preference.

**Target: a three.js + Vite web app, running in real time in the browser.**

Chosen over Blender, over Unreal plus Cesium, and over Godot. It matches `town_3d`'s stack, so the fleet already knows it. Animated agents are natural in it. And Playwright gives cheap screenshot gates, which is exactly what the canon's visual-verification rule asks for.

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
- [ ] Buildings hold up close: window grids follow floor counts and the PBR materials respond to light, checked at street level and from above. (Phase 4)
- [ ] A dusk frame of the crossing reads as Shibuya rather than as a generic Japanese city, because the emissive signage and neon are there. (Phases 4–5)
- [ ] Road markings match reference imagery, including the scramble's diagonals, with signals, guardrails and street furniture in place. (Phase 4)
- [ ] The dusk preset renders with ACES tone mapping, bloom carrying the neon, SSAO and TAA, and holds still — no flicker or crawl over a moving sequence. (Phase 5)
- [ ] Vehicles hold their lanes, obey the signals, turn, and spawn and despawn at the boundary, watched over a run rather than sampled in one frame. (Phase 7)
- [ ] Pedestrians avoid each other and surge diagonally across the crossing on the signal phase — the signature shot — with no visible interpenetration and no sliding feet. (Phase 8)
- [ ] Vehicles and pedestrians run off the same clock: one signal phase model drives both, and no frame shows traffic moving through the scramble while pedestrians are on it. (Phase 6)
- [ ] 60 fps at 1080p in a running build under the target agent counts. This criterion is incomplete until the owner sets those counts — see Blockers. (Phase 9)
- [x] The scene rebuilds from a clean checkout: delete the derived geospatial outputs, re-run the pipeline, render again, and compare with the frames above. (Phase 2)
- [x] The running app shows its attribution: PLATEAU (PDL 1.0, with CC BY 4.0 permitted — the licence name here was imprecise and is corrected), OpenStreetMap (ODbL) and GSI. (Phase 1)
- [ ] A multi-angle, multi-zoom sweep and a flythrough driven through the real controls both come back clean, an independent review passes, and the work is merged to main. (Phase 10)

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

- [ ] 21. Lane-level road graph plus sidewalk and crossing graph from OSM
- [ ] 22. Signal phase model driving vehicles and pedestrians from one clock
- [ ] 23. Document and freeze the schema — it is the interface both agent workstreams build against. Constraint: the OSM-derived network graph stays in its own files, never fused with PLATEAU geometry. The render is a Produced Work with no share-alike, but this graph is a Derivative Database, and publishing the app obliges offering recipients that derived database or a description of the method (ODbL 4.6). Keeping them separable is nearly free now and expensive to unpick after the schema freezes

### Phase 7 — Vehicles

Blocked: no licensed source is chosen for the Japanese vehicle mix. See Blockers under Scope.

- [ ] 24. IDM car-following with MOBIL lane changes
- [ ] 25. Signal obedience, turns, boundary spawn and despawn
- [ ] 26. Instanced rendering

### Phase 8 — Pedestrians

Blocked: no licensed source is chosen for rigged pedestrian character models. See Blockers under Scope.

- [ ] 27. ORCA/RVO2 local avoidance with a spatial hash
- [ ] 28. Scramble-crossing behavior driven by the signal phase — the diagonal surge is the signature shot
- [ ] 29. Thousands of animated characters via baked vertex animation textures, since three.js instancing does not do skinning natively

### Phase 9 — Performance

Blocked: target agent counts are unset, so there is no number to hit. See Blockers under Scope.

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

**Three things this phase found that a passing test would not have.**

- **glTF is Y-up and `CESIUM_RTC` translates in a Z-up frame.** Nothing in a b3dm says so and `design.md` did not either. Placed without the turn, every building landed a median of 68 m from where its own batch table puts it and the city rendered lying on its side over the right street pattern. Placed with the turn folded into the tile matrix *and* the tileset not declaring `gltfUpAxis: "z"`, the library applied its own on top and it tilted again.
- **The tile cache counts decoded bytes.** Sized from the 137 MB the tiles weigh on disk, it could not hold a single 4096x4096 leaf, so the traversal never refined past the root and the app drew seventeen decimated buildings over the whole ward while reporting itself loaded, idle and error-free.
- **PLATEAU's road polygons below LOD3 are flat at z = 0**, as `design.md` warned, and the part it did not warn about is what happens at the edge: a road ring reaching past the terrain has nothing to be draped onto, so it stays at sea level and drags asphalt out past the edge of the world. 461 polygons were dropped for that.

**Corrections to `design.md`, which is the project's provenance.** Six of its claims were wrong or incomplete and each is now marked in place: the LOD1 buildings are in the same tileset rather than a separate one; the sentinels read `null` in the tiles rather than −9999; the atlases run to 4096x4096 rather than 2048x2048, which is 5.5 times the memory; the AOI holds 1,740 buildings by this repository's own count rather than 1,741, and the count is sensitive to the centroid rule because 25 buildings sit within two metres of the boundary; the Draco decode now works and is exercised; and the up-axis fact above was missing entirely. One claim held exactly — `_zmin` and `_zmax` are orthometric where the ECEF geometry is ellipsoidal, and the difference between them recovers the geoid undulation from the data alone at 36.786 m against a published 36.877 m.

**Two new gates, both proved red**, in `docs/learning/gate-proofs.md`: `test/sentinel.test.ts` over a real PLATEAU batch table, and `test/placement.test.ts` over the ECEF and up-axis transforms. The visual gate gained a third check that has fired on two real defects — the bounding box and triangle count of the building geometry actually in the scene, which is the first thing in this repository that looks at the scene rather than at the framebuffer.

**What Phase 4 inherits, and should not rediscover.** Building textures are capped at 1024 pixels on the longest side at load time, in `src/scene/texture-budget.ts`, because the alternative is a scene that cannot hold the area of interest at leaf detail; the table of what each cap costs is in that file and the number is one constant. The 64 LOD1 buildings render as untextured white, which is item 15's stated job. Nothing here touches materials or lighting.

Phase 4 is next.

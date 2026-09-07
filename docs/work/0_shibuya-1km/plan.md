# 1km x 1km animated Shibuya model

Status: Phase 0 complete and on main; Phase 1 next
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

**Geometry source: Project PLATEAU LOD2 (MLIT, CC-BY 4.0) plus OpenStreetMap (ODbL).**

Chosen over Google Photorealistic 3D Tiles. The Maps Platform terms forbid bulk caching and derivative works, so that data cannot be baked into a simulated world however good it looks. This is a licensing decision and it is recorded here so it stays findable, rather than being rediscovered later by someone who notices the tiles are prettier.

**Where the realism actually comes from.**

PLATEAU supplies accurate geometry and almost no texture. So realism is won in the material and lighting passes, not in the data pass.

Shibuya is defined by its illuminated signage. Without emissive billboards the scene reads as a generic Japanese city no matter how accurate the geometry underneath it is.

That is why emissive signage (item 16) is the single highest-value item in the plan, and why dusk is the hero lighting preset: it gives the best realism per unit of effort and it forgives LOD2's weaknesses.

**Pipeline shape.**

The geospatial work is offline, deterministic and cached. Its outputs stay gitignored and regenerable, under the canon's blob ceilings, so the repository holds the recipe rather than the bytes.

**Gate frames are not byte-reproducible, and no phase should assume otherwise.**

The visual harness aims the camera through the real controls and accepts a pose within 0.012 rad of the one it asked for, and damped controls come to rest at a slightly different residual on every run. Measured on 2026-09-06: three runs of the same build produced no frame that was byte-identical in all three, with settled azimuths drifting up to 3.5e-4 rad between runs and distinct-colour counts moving by a few either way. Pixel-exact goldens need a tighter settle tolerance bought first; until some phase pays for it, frames are reviewed by eye and compared by content, never diffed byte for byte.

## Acceptance criteria

Each of these is checked by looking at a rendered result or watching the scene run. None of them is satisfied by a passing test.

- [ ] The AOI renders end to end — terrain, buildings and road surfaces across the full 1 km box — inspected from several angles and zoom levels, each frame at native resolution. (Phases 1–3)
- [ ] The ground is not flat: the Shibuya valley and the Dōgenzaka slope are visible in the rendered terrain, and building footprints sit on it without floating or sinking. (Phases 2–3)
- [ ] Buildings hold up close: window grids follow floor counts and the PBR materials respond to light, checked at street level and from above. (Phase 4)
- [ ] A dusk frame of the crossing reads as Shibuya rather than as a generic Japanese city, because the emissive signage and neon are there. (Phases 4–5)
- [ ] Road markings match reference imagery, including the scramble's diagonals, with signals, guardrails and street furniture in place. (Phase 4)
- [ ] The dusk preset renders with ACES tone mapping, bloom carrying the neon, SSAO and TAA, and holds still — no flicker or crawl over a moving sequence. (Phase 5)
- [ ] Vehicles hold their lanes, obey the signals, turn, and spawn and despawn at the boundary, watched over a run rather than sampled in one frame. (Phase 7)
- [ ] Pedestrians avoid each other and surge diagonally across the crossing on the signal phase — the signature shot — with no visible interpenetration and no sliding feet. (Phase 8)
- [ ] Vehicles and pedestrians run off the same clock: one signal phase model drives both, and no frame shows traffic moving through the scramble while pedestrians are on it. (Phase 6)
- [ ] 60 fps at 1080p in a running build under the target agent counts. This criterion is incomplete until the owner sets those counts — see Blockers. (Phase 9)
- [ ] The scene rebuilds from a clean checkout: delete the derived geospatial outputs, re-run the pipeline, render again, and compare with the frames above. (Phase 2)
- [ ] The running app shows its attribution: PLATEAU (CC-BY 4.0), OpenStreetMap (ODbL) and GSI. (Phase 1)
- [ ] A multi-angle, multi-zoom sweep and a flythrough driven through the real controls both come back clean, an independent review passes, and the work is merged to main. (Phase 10)

## Implementation steps

Thirty-four items across eleven phases. The numbering is stable — refer to items by number.

### Phase 0 — Toolchain & gates (blocks everything)

- [x] 1. Vite + three.js + TypeScript scaffold; `.nvmrc` pinned to Node 24
- [x] 2. Playwright visual harness that drives OrbitControls and never assigns camera pose directly — the canon names direct state-setting structurally blind, with `scenes` as its case study
- [x] 3. Fill the currently-empty `Gates` section of `AGENTS.md` with commands actually run in this repo

### Phase 1 — Data & provenance

- [ ] 4. Fix the AOI to the box above
- [ ] 5. PLATEAU Tokyo 23-ku CityGML LOD2 for the covering tiles
- [ ] 6. OSM via Overpass — lanes, crossings, signals, sidewalks, rail
- [ ] 7. GSI 5 m DEM — Shibuya is a valley and Dōgenzaka means slope; flat ground reads as wrong immediately
- [ ] 8. Record licenses (PLATEAU CC-BY 4.0, OSM ODbL, GSI) and build an in-app attribution surface

### Phase 2 — Geospatial pipeline (offline, deterministic, cached)

- [ ] 9. Project to JGD2011 / Japan Plane Rectangular CS IX (EPSG:6677), local origin at the crossing so floats stay small
- [ ] 10. CityGML to glTF via PLATEAU GIS Converter; clip to AOI
- [ ] 11. Terrain mesh from the DEM; snap building footprints to it
- [ ] 12. Tile the output for culling and LOD; outputs stay gitignored and regenerable, under the canon's blob ceilings

### Phase 3 — Static scene

- [ ] 13. Terrain, buildings and road surfaces rendering
- [ ] 14. Camera, controls, first visual-gate baseline

### Phase 4 — Realism pass (where the deliverable is won)

- [ ] 15. Procedural facades — floor-count-derived window grids, PBR materials
- [ ] 16. Emissive signage and neon — the single highest-value item in the plan
- [ ] 17. Road markings including the scramble's diagonals, signals, street furniture, guardrails
- [ ] 18. Wet-asphalt reflectance, sidewalk paving

### Phase 5 — Lighting & post

- [ ] 19. Time-of-day sun and sky, with dusk as the hero preset — best realism per unit effort, and it forgives LOD2's weaknesses
- [ ] 20. ACES tone mapping, bloom to carry the neon, SSAO, TAA

### Phase 6 — Network graph (shared contract; must freeze before Phases 7 and 8 run in parallel)

- [ ] 21. Lane-level road graph plus sidewalk and crossing graph from OSM
- [ ] 22. Signal phase model driving vehicles and pedestrians from one clock
- [ ] 23. Document and freeze the schema — it is the interface both agent workstreams build against

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

Phase 1 is next. Nothing beyond Phase 0 has started: no map data, no PLATEAU, no OSM, no agents, and the scene is a placeholder.

Record the verified revision, the checks actually run and their limitations here at closure.

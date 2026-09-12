# maps — repo-only rules

## Stack

Vite, three.js and TypeScript, on Node 24 pinned in `.nvmrc`. Decided in the Shibuya plan (`docs/work/0_shibuya-1km/plan.md`) and built in Phase 0.

## Shibuya delivery ownership and autonomous work

For the approved Shibuya deliverable, the root orchestrator coordinates and delegates implementation to bounded workers, owns shared contracts and canonical status, and accepts the final integrated revision. Managed work continues autonomously in goal mode through the whole deliverable; the owner's 2026-09-08 instruction to continue until done overrides the default automatic-repair cap for this scope. Use each worker's scoped goal where the available tooling supports one; never overwrite another worker's or the root's goal.

The existing target in `src/world/frame.ts` is 3,000 animated pedestrians and 200 vehicles at 60 fps and 1920×1080. Keep that target distinct from measured performance. The scope remains the roughly 1 km Shibuya simulated world and its approved phases; no second location, broader product surface or publication is implied.

The owner's 2026-09-11 delivery instruction is to commit each meaningful step toward the current unit of work once that step is reviewed and verified. The integration owner lands accepted milestones on main rather than holding every change until the grand vision is complete. All five gates still precede a code commit, and visual work still requires native inspection and resolution of material review findings.

## Map data, and what its licences oblige

Three sources, settled in Phase 1. Provenance, URLs and measured constants are in `docs/work/0_shibuya-1km/design.md`; the exact credit strings are in `src/world/sources.ts`.

**PLATEAU Shibuya-ku FY2025** supplies buildings, terrain, road surfaces and street furniture. PDL 1.0, with CC BY 4.0 expressly permitted. No share-alike, commercial use allowed. Copyright sits with the local authority, not with MLIT.

**OpenStreetMap** supplies the road, sidewalk and crossing topology. ODbL 1.0.

**GSI** elevation tiles are a cross-check on PLATEAU's terrain and nothing else is drawn from them. PDL 1.0, category 2, so attribution alone and no Survey Act application.

Three rules follow, and each of them is cheap now and expensive later.

**Both PLATEAU and GSI require two lines, not one.** A source credit, and a separate statement that the data was edited or processed. This project reprojects, clips, retextures and converts, so the second line is required and neither may be dropped for space.

**The OSM-derived network graph stays in files of its own.** The rendered scene is a Produced Work with no share-alike attached, but the Phase 6 lane, sidewalk and crossing graph is a Derivative Database, and publishing the app obliges offering recipients that graph or a description of how it was made — ODbL section 4.6. Fusing it into the PLATEAU geometry risks having to offer the whole thing. This is recorded as a constraint on plan item 23.

**Nothing fetched enters Git.** `data/` is ignored, holds about 620 MiB downloaded and 1.4 GiB unpacked, and is regenerable by `npm run data:fetch`. The repository holds the recipe and the checksums. The two files under `test/fixtures/` are the exception and were promoted deliberately: they are real cut-down bytes from GSI and PLATEAU, both under 256 KiB, and `test/fixtures/README.md` records where each came from and under what terms.

## Fetching data is a script, not a set of instructions

`npm run data:fetch`. It pins the PLATEAU archive by exact length and SHA-256, checks the length first so a truncated download says "N bytes short" rather than "hash mismatch", and re-downloads anything that fails. Overpass output cannot be hashed because OSM changes daily, so it is pinned by the `timestamp_osm_base` the script records in `data/provenance.json`.

The one operational trap worth repeating here: `overpass-api.de` answers HTTP 406 to any User-Agent containing a parenthesised comment, which is exactly the form OSM convention asks contact details be given in, and 406 is documented as meaning "rate limited". Use a bare token.

## The world frame is a contract, not a convention

Scene units are metres, Y is up, the world origin is the Shibuya Scramble Crossing, +X is east and +Z is south. It lives in `src/world/frame.ts` and every system that places anything reads it from there.

Nothing carries an EPSG:6677 coordinate into the browser. The origin subtraction happens where the data is loaded, so coordinates in the scene stay inside a kilometre of zero and a float32 vertex buffer still has centimetres of resolution left.

The box itself lives in `src/world/aoi.ts` and is stated once: bounds, centre, projected extent, the EPSG:6677 origin, the mesh codes, and the Overpass bbox. `frame.ts` takes the world origin from it, `tools/data/manifest.ts` builds the archive member list from its mesh codes, and `tools/data/overpass-query.ts` builds its query from the same bounds. Restating the box in a fourth place makes it a fourth box.

Two axis traps meet in this projection: CityGML's `posList` is latitude-first and EPSG:6677 is northing-first. Flip either and Shibuya renders perfectly and mirrored, and no frame review here would catch it. `test/aoi.test.ts` gates the whole chain against measured coordinates, and it has been made to go red.

## The visual harness drives the controls; it never sets state

`tools/visual/` synthesises pointer and wheel events on the canvas through Chromium's own input path. It may read `window.__mapsHarness`, which is frozen and has no setter. It may not assign `camera.position`, call `controls.setAzimuthalAngle`, or call the render function.

This is the fleet canon's rule, not a local preference, and `src/harness/bridge.ts` enforces it structurally rather than asking for it. Widen that bridge with another observation when a later phase needs one; never with a mutation.

## This repo pins its own preview port and checks app identity before it captures

Dev is 5319, preview is 4319, both `strictPort`, both bound to an explicit 127.0.0.1. The harness reads the page's `app-id` meta tag and refuses the run before the first screenshot if it is not this app's.

Why: every repo in this fleet takes Vite's 5173 and 4173 defaults, and several have a server up at any time, so "something answered on the port" is not "our app is running" anywhere in the fleet. During Phase 0 a sibling project's `vite preview` was found holding 4173, and the visual gate attached to that app and waited ten minutes for a bridge it was never going to publish. Separately, a preview left on the default host bound `[::1]` only and refused every connection to `127.0.0.1` while plainly running.

Three things stop it now: the ports above, `reuseExistingServer: false` in `playwright.config.ts`, and the `app-id` check. The third has been made to go red on purpose — see `docs/learning/gate-proofs.md`.

This rule fixes this repo's exposure only. Every other visual gate in the fleet has the same one, and whether that becomes a fleet rule is the owner's call, not this repo's.

## Gate artifacts live in `artifacts/`

That directory ignores itself. `npm run visual` wipes and rewrites it, so nothing in it is ever evidence for a run other than the last one. Promoting a frame to a fixture or a golden moves it out of there; it does not get un-ignored in place.

## The scene is built offline and served from `data/`, not bundled

`npm run data:scene` reads `data/plateau/` and `data/3dtiles/` and writes `data/scene/` — the terrain mesh, the road mesh, a clipped tileset and 67 placed building tiles, about 148 MB. `tools/vite/serve-scene-data.ts` serves that at `/scene/`, and three.js's Draco decoder out of `node_modules` at `/draco/`, in the dev server and in `vite preview` alike.

The alternative was Vite's `public/`, which copies everything into `dist/` on every build — and `npm run visual` builds before every run. The cost of this choice, stated here so it is not rediscovered: **`dist/` is not self-contained.** Serving it from anywhere other than `vite preview` means serving those two directories too. The app names the missing file rather than drawing an empty city.

Everything under `data/scene/` is in the world frame already: metres, Y up, origin at the crossing. No latitude, no EPSG:6677 northing and no ECEF position reaches the browser.

## 3D Tiles: two rotations, and getting either wrong renders

MLIT's `.b3dm` tiles state their position as a `CESIUM_RTC` centre in ECEF metres, and their vertices are **Y-up in the glTF convention** over data that is **Z-up in ECEF**. Nothing in the file says so. Placing a tile therefore needs the turn as well as the translation, and the two ways to get it wrong look the same from the inside:

- **Turn missing.** Every building lands a median of 68 m from where its own batch table puts it, up to 122 m, and the city renders lying on its side over the correct street pattern.
- **Turn applied twice.** `3d-tiles-renderer` applies its own from `asset.gltfUpAxis`, which defaults to `"y"`. A pipeline that has already folded the turn in must declare `gltfUpAxis: "z"` — `tools/tiles/tileset.ts` does.

`test/placement.test.ts` gates the transform and `npm run data:scene` reconciles every building's decoded geometry against its batch table, refusing at 2 m of horizontal residual. Neither can see the second application; the visual gate's drawn-geometry bounds are what caught that.

## Texture memory is this scene's binding constraint

The 67 building tiles carry 551.9 megapixels — **2,943 MB decoded to RGBA with mipmaps**. The tile cache counts decoded bytes, not downloaded ones, and a cache too small to hold a leaf tile does not degrade: a `REPLACE` parent waits for all its children, so the traversal deadlocks at the root and the app draws seventeen decimated buildings while reporting itself loaded and idle.

Letting the hierarchy stop higher up is not an answer either, because PLATEAU's coarse levels are decimated to **255 buildings of 1,740** at depth 4. So textures are capped at 1024 pixels on the longest side at load time, which puts the whole area of interest at leaf detail inside 335 MB. `src/scene/texture-budget.ts` holds the cap, the measured cost of each alternative, and the reason it is one constant.

## PLATEAU road polygons below LOD3 are flat at sea level, and the edge is the worst part

`tran` LOD1 and LOD2 are flat at z = 0 — every vertex, measured — so they must be draped onto the terrain. What `design.md` did not warn about is what happens to a road ring that reaches past the terrain: there is nothing to drape it onto, it keeps its own height of zero, and a sheet of asphalt appears fifteen metres under the valley extending past the edge of the ground. `tools/scene/build-roads.ts` drops any ring with a vertex off the terrain, and `npm run data:scene` refuses a road mesh whose lowest vertex is more than 5 m below the lowest ground.

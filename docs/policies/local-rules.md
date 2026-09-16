# maps — repo-only rules

## Stack

Vite, three.js and TypeScript, on Node 24 pinned in `.nvmrc`. Decided in the Shibuya plan (`docs/work/0_shibuya-1km/plan.md`) and built in Phase 0.

## Shibuya delivery ownership and autonomous work

For the approved Shibuya deliverable, the root orchestrator coordinates and delegates implementation to bounded workers, owns shared contracts and canonical status, and accepts the final integrated revision. Managed work continues autonomously in goal mode through the whole deliverable; the owner's 2026-09-08 instruction to continue until done overrides the default automatic-repair cap for this scope. Use each worker's scoped goal where the available tooling supports one; never overwrite another worker's or the root's goal.

The existing target in `src/world/frame.ts` is 3,000 animated pedestrians and 200 vehicles at 60 fps and 1920×1080. Keep that target distinct from measured performance. The scope remains the roughly 1 km Shibuya simulated world and its approved phases; no second location, broader product surface or publication is implied.

The owner's 2026-09-11 delivery instruction is to commit each meaningful step toward the current unit of work once that step is reviewed and verified. The integration owner lands accepted milestones on main rather than holding every change until the grand vision is complete. All five gates still precede a code commit, and visual work still requires native inspection and resolution of material review findings.

The owner's 2026-09-15 instruction is to commit early and commit often: commit as soon as there is a meaningful unit of verified change towards the deliverable, and treat that as a rule of this repository rather than a preference. A unit is small enough to review and self-contained enough to revert on its own. This is what the two expensive gates make necessary: `npm run visual` takes about three hours, so a session that waits for a perfect whole will land nothing, while a session that batches unrelated work spends the same three hours on a commit nobody can review. The queue is the plan's unit list; each unit is committed, pushed and recorded as it is accepted, not held for the next one.

Where a gate can be transferred between revisions, the transfer is a proof and not a memory. A code commit inherits an earlier revision's gate results only when all three of these hold, and the commit message states which revision they came from and the check that established them: the built bundle bytes are identical, `data/scene/**` is unchanged, and the changed paths are outside the bundle graph. The check is `npm run build` followed by `Get-FileHash dist/assets/*.js`, against the hash recorded for the revision the evidence belongs to. Anything else re-runs the gate. A commit that only adds a tooling file no build reads still re-runs the build to show that, because that is a one-second check rather than an assumption.

`npm run visual` is a three-hour command that owns port 4319 and the whole CPU, so exactly one gate run happens at a time and lanes are chosen around it. A coordinator that implements spends those three hours on one change that a team of lanes would spend on four.

The owner's 2026-09-08 appearance requirement is two 3D styles, Cartographic and Satellite, selected through a World style dropdown. Cartographic takes the clean default Apple Maps view as its visual reference and adds finer scene detail; Satellite improves the existing phototextured treatment. A registry supplies the dropdown options and leaves room for later styles. Styles share world geometry, the running simulation and the current camera. Switching styles must preserve the camera and agent progress, and acceptance covers both styles at street, block and aerial distances through the actual dropdown, including keyboard input.

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

That directory ignores itself. Each visual specification replaces only its own output directory: `visual/hero`, `visual/sweep/satellite` or `visual/sweep/cartographic`. Retained recovery evidence and sibling specifications are outside that cleanup scope. The wrapper requires 44 fresh native 1280×720 frames, checks their hashes and unchanged build bytes after the complete run, and writes `visual/complete.json`. This verifies the evidence set exists; every frame still needs native inspection. Promoting a frame to a fixture or golden moves it out of there; it does not get un-ignored in place.

Evidence here belongs to a task and is deleted when that task closes. Once the conclusion is recorded in `docs/work/`, `docs/learning/` or `docs/devlog/`, the raw output goes with the task; only the files a tracked document names by path stay. A directory being the place a run happened is not a reason to keep it, and a second copy of a run is not a second observation.

A worktree under `artifacts/` junctions `data/` and `node_modules/` to the primary checkout instead of copying them. A copy of `data/` is 1,430 MB of bytes this repository already has and can rebuild; nine such copies were measured under `artifacts/` on 2026-09-15, 12.9 GB of the 53.6 GB total.

Junctions and symlinks are never followed, by a size measurement or by a delete. `Get-ChildItem -Recurse`, `Remove-Item -Recurse`, `rm -rf` and git's own recursive delete all follow a reparse point, so a measured total counts the primary checkout once per worktree and a delete reaches files outside `artifacts/`. Remove the junction itself with `rmdir` before deleting around it.

The size is checked rather than assumed: `npm run artifacts:size` reports every top-level entry in real bytes with reparse points excluded and never counted, names each junction and each copied `data/` or `node_modules/`, and exits non-zero when a copied input tree passes 512 MB.

The owner's 2026-09-15 instruction is to reclaim scratch whenever there is an opportunity, not only when a task ends: at the end of each step of a goal, and after a verification has finished, before the next step begins. Reclamation is therefore part of finishing a step rather than a chore deferred to the end of a deliverable, and it runs on the same boundary as the verification that step owed — which is also the moment the raw output stops having a reader, because the conclusion has just been written into `docs/work/`, `docs/learning/` or `docs/devlog/`. Running it at that boundary is what keeps the measurement honest: the first survey here found 53.6 GB, of which 28.4 GB was reclaimable.

## The visual gate is two lanes, and each one names its renderer

`npm run visual` builds once, pins those build bytes, runs the software pixel lane, runs the hardware lifecycle lane, then verifies the complete 44-frame set. The split is by renderer, not by requirement.

The pixel lane (`playwright.config.ts`, which runs `hero.spec.ts`, `style-picker.spec.ts` and `sweep.spec.ts`) stays on SwiftShader, because the 44-frame set is compared across machines and a pixel set captured on one renderer cannot inherit a review written for another. There is no switch that can move it: the former `MAPS_VISUAL_GPU` launch-arg switch is gone, and `lifecycle.spec.ts` is excluded here.

The lifecycle lane (`playwright.lifecycle.config.ts`, `lifecycle.spec.ts` only, repeated three times in the gate) runs on the hardware renderer with the same URL, preparation, viewport and 15-second navigation / 60-second replacement bounds. The spec records the unmasked `glRenderer` from the frozen harness before the expensive preparation and fails by name when that string names a software rasteriser, so the lane can neither fall back silently nor pass on a machine that only has SwiftShader.

Why: measured 2026-09-15, under SwiftShader the fifteen-second bound is spent inside Chromium destroying the outgoing page's WebGL resources rather than in the application, whose own `pagehide` work finishes in 2.1-4.3 ms while the replacement document's first script does not run until about +27.87 s. The red baseline, the three attribution arms and their hashes are in `docs/learning/gate-proofs.md`; the user-visible version of the bound is in the defect register.

A machine with no usable GPU reports the lifecycle check unavailable: non-zero exit, no `complete.json`, and a message naming the missing prerequisite. It is never skipped and never a pass. Every capture run deletes any earlier `complete.json` before it starts, so a failed run cannot leave a previous run's success artifact behind. Re-measure the SwiftShader bound when the scene changes materially, such as populated agents or larger atlases.

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

Letting the hierarchy stop higher up is not an answer either, because PLATEAU's coarse levels are decimated to **255 buildings of 1,740** at depth 4. The fixed geographic policy uses 1024 pixels generally, 2048 for tile bounds within 160 m of the crossing, and native 4096 for the single final-detail leaf containing the observed frontage at world `(-38.58,21.58)`. `npm run data:textures:verify` requires that frontage policy to select exactly one leaf and one atlas; current source resolves to `data518.b3dm`. Runtime selection uses geographic metadata rather than that filename.

The full-source audit selects 17 priority tiles including the native leaf: 561,075,583 estimated decoded texture bytes with mipmaps plus 73,324,734 geometry and facade attribute bytes. The native leaf adds 67,108,864 bytes over the otherwise identical 2048 policy. A frozen 1280×720 controls-driven comparison recovered TSUTAYA lettering and glazing detail; it did not materially improve the distant approach view. These are allocation estimates and scoped visual evidence, not whole-process GPU measurements or proof of the population performance target. The tile cache uses a 640 MiB floor and 768 MiB ceiling, with each tile's byte estimate rounded upward to an integer because fractional residue can prevent the upstream LRU from terminating disposal.

Both styles reuse the same cached capped atlases. Source ImageBitmaps are released after processing, so this is fixed geographic priority and does not promise camera-dependent resolution upgrades. `src/scene/texture-budget.ts` holds the policy; actual processed dimensions and per-view ray-hit atlas dimensions are observed through the read-only harness.

## Traffic hardware is separately authored presentation

OSM traffic-control coordinates retain their logical meaning in the network; they do not establish surveyed pole or head positions. `npm run data:hardware` writes separate `/scene/control-hardware.json` records after network, final pavement and vehicle assets exist. Every source control is placed with disclosed local support/clearance evidence or explicitly unplaced. Runtime rejects missing, malformed or stale geometry/network inputs with the rebuild command. Unplaced hardware must not delete its source control or change signal authority.

The current hardware proof uses the actual generated fleet manifest at displayed scale 1. Before populated integration, the shared actor factory must assert the exact displayed manifest digest equals `hardware.inputs.vehicles` and that its display scales fit the recorded bound. A new fleet or larger scale must regenerate and recheck hardware clearance; city-only startup does not load the fleet solely to perform this future assertion. Discrete supported pose checks do not establish continuous traffic collision safety or accepted whole-city pavement contact.

## PLATEAU road polygons below LOD3 are flat at sea level, and the edge is the worst part

`tran` LOD1 and LOD2 are flat at z = 0 — every vertex, measured — so they must be draped onto the terrain. What `design.md` did not warn about is what happens to a road ring that reaches past the terrain: there is nothing to drape it onto, it keeps its own height of zero, and a sheet of asphalt appears fifteen metres under the valley extending past the edge of the ground. `tools/scene/build-roads.ts` drops any ring with a vertex off the terrain, and `npm run data:scene` refuses a road mesh whose lowest vertex is more than 5 m below the lowest ground.

## Physical paint is a bounded presentation overlay

Crossing and tactile paint reads source path elevation to select nearby road/pavement support; it must not choose an unrelated highest X/Z layer or fall back blindly to terrain. The current finite checks and explicitly omitted parts are documented in `docs/reference/pavement-recipe.md`. The maximum 10 mm opposed-edge seam allowance belongs only to paint presentation; it does not alter source meshes or authorize vehicle/pedestrian contact. Ordinary graphics setup uses reviewed `data:vehicles` before `data:hardware`; the human baker is a separate unfinished population dependency.

## Software visual verification budgets

The first final SwiftShader attempt measured 6m20 to the first hero capture, 4m11 to the next, and 2m52, 2m52 and 3m17 between plaza sweep captures. These are costs of the 1280×720 software verification lane, not measurements against the separate 1080p hardware performance target. The reviewed finite budgets are sixty minutes for eight hero plus two return images, seventy minutes per eighteen-view style sweep, and thirty-two minutes for lifecycle. Lifecycle reserves thirty minutes total setup, three minutes initial refinement and eight minutes per pose while retaining its fifteen-second navigation and sixty-second loaded-page checks. The owned full-run wrapper receives an explicit 14,400-second deadline; no retry or backend substitution is implied. Playwright stops after its first failed test and preserves that failure's trace.

The camera observer reads frame count, document epoch and full pose in one browser task. Only fresh rendered frames count toward quiet intervals. Ordinary capture settling uses angular/relative movement; the stricter 80 micrometre world-path baseline applies only before dropdown preservation comparisons. The pinned no-input OrbitControls damping is enabled at 0.08; three qualifying fresh intervals and at least twelve advanced frames leave a bounded sub-millimetre residual in that path. The independent five-millimetre post-switch assertions stay unchanged. Between completed browser observations, camera waits check five-minute elapsed and fifteen-second no-new-frame limits, with contextual errors and real observed elapsed time. These polling checks do not cancel an unresolved browser RPC; outer Playwright test/stage and owned-runner timeouts bound that case. CPU fixtures do not replace the actual software dropdown and native image gate.

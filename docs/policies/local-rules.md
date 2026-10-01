# maps — repo-only rules

These constraints supplement [AGENTS.md](../../AGENTS.md). Plans, reviews, gate proofs and the defect register preserve implementation history; this file states the current rules.

## Visual quality first — 2026-09-26

The owner directs the root orchestrator to maintain an explicit todo list, oversee overall progress, delegate detailed implementation and review, and continue in goal mode. Prioritize supreme visual quality for the current Shibuya work; detailed simulation research is deferred and must not block visual milestones. Judge progress by visible improvements integrated on main, with independent visual review and the existing gates.

Owner steering, 2026-09-30: stop at frequent meaningful self-contained verified increments and land each on main before growing the next. Keep each unit reviewable and independently reversible. Preserve experiments separately when their unresolved acceptance blocks a smaller coherent unit. Every code commit still requires all five gates and independent review; small chunks do not weaken verification.

Building facades must feel vibrant and believable rather than pasted-on wallpaper. Judge close, block and aerial rendered views for material depth, readable windows, lighting response and variation between buildings. Increasing color alone does not establish that outcome. Keep source attribution, geographic texture budgets and temporal checks intact.

## Proactive whole-city inspection — 2026-09-30

User examples guide whole-class self-inspection across the square: every road needs clear supported markings, surfaces need useful structure at several scales, dusk needs distributed mounted city lights, and trains must visibly run on the admitted tracks in the ordinary experience. Inspect peripheral streets and blocks as well as fixed hero views, then use held-out seeded exploration. Record source exceptions and material findings; do not wait for another user annotation to discover the same class elsewhere. Source the next visual direction by running the ordinary default experience and traversing it through the real controls. Compare street, block and aerial views, dusk and noon, then rank recurring visual defects and unexpected findings before assigning more work.

## Satellite quality focus — 2026-09-28

The owner asks to finish one visual style well before working on the other. Satellite is the sole current visual-quality target, matching the photoreal Shibuya goal. Defer Cartographic polish, paired style iterations and detailed Cartographic image review. Keep basic style-switch and shared-rendering regression checks. The existing automated visual gate may still capture both styles; those captures do not require a second detailed quality review or claim Cartographic acceptance. This direction supersedes the earlier requirement to inspect every Cartographic static frame during this focus period.

## Camera input and visual exploration - 2026-09-30

Held WASD pans along the ground relative to the view. Middle-button drag rotates; preserve the existing left-button rotation, right-button pan and wheel zoom. Suppress movement while a UI control or editor has focus.

Visual acceptance compares fixed baselines across azimuth, elevation and zoom, then uses seeded randomized poses to explore. Record the seed and actual camera pose for each exploratory view; report surprises as findings and state sampling and coverage bounds. Inspect original images at native resolution. Satellite remains the only detailed polish target.

## Keep visual review sampling small — 2026-09-27

The owner asks for modest animation frame rates, around 30 or 60 fps, to limit tokens spent viewing individual frames. Default review clips to 30 fps when sufficient; use 60 fps only for a targeted motion question. Limit inspected images through sparse keyframes and short event-specific sequences, rather than opening every frame of a long animation. State the actual sampled frame/time gaps and keep uninspected footage outside appearance claims. Existing required static-view coverage stays explicit. Do not change the fixed 60 Hz simulation step merely to reduce review-image count.

## Fresh strategy reviews — 2026-09-27

The owner asks for periodic fresh subagents to identify fundamental mistakes and inefficiency. Dispatch a fresh-context critic at each meaningful product milestone or after two consecutive attempts produce no new substantive result. Give it the current queue, a compact evidence index and at most three relevant existing images; ask for a concise continue-or-redirect decision. Record and act on justified findings before repeating the approach. Do not add a strategy review to every mechanical handoff.

## Shibuya orchestration and progress

Root owns shared contracts, canonical status and final integrated acceptance, and delegates bounded implementation and review. Managed Shibuya work continues autonomously in goal mode; the owner's 2026-09-08 instruction to continue until done overrides the default automatic-repair cap for this scope. Use scoped worker goals where tooling supports them; never overwrite another worker's or root's goal.

Root maintains [the Shibuya progress board](../work/0_shibuya-1km/progress.md) against the complete acceptance criteria and stable plan items. Read it at turn start and before delegation. Update each meaningful handoff, gate, review and integration with owner, evidence scope, next acceptance and blockers. Each task has one owner and is done only when its acceptance evidence exists. Distinguish implemented, verified, accepted and integrated work; keep full-map and performance requirements visible.

The target in `src/world/frame.ts` remains 3,000 animated pedestrians and 200 vehicles at 60 fps and 1920×1080. It is a target, not measured acceptance. The current quality focus defers detailed simulation research, not the deliverable's eventual population/performance requirements.

World styles share geometry, simulation and camera. The registry supplies the World style dropdown; switching through real pointer and keyboard input must preserve camera and agent progress. Satellite is the current detailed quality target. Cartographic's later reference remains the clean default Apple Maps view with finer scene detail; current Cartographic checks cover basic switching/shared-rendering regressions.

## Stack, world frame and source authority

Use Vite, three.js, TypeScript and `3d-tiles-renderer` on Node 24, pinned in `.nvmrc`; the choice is recorded in [the Shibuya plan](../work/0_shibuya-1km/plan.md). Scene units are metres, Y up, +X east, +Z south, with the crossing as origin. Placement reads `src/world/frame.ts`; AOI bounds, centre, extent, EPSG:6677 origin, mesh codes and Overpass bbox read `src/world/aoi.ts`, never another copy.

Subtract the projected origin at load; global EPSG:6677 or ECEF positions must not reach browser vertex buffers. CityGML `posList` is latitude-first and EPSG:6677 is northing-first; `test/aoi.test.ts` checks the axis chain. Placement folds the glTF Y-up/ECEF Z-up rotation once; the transformed tileset declares `gltfUpAxis: "z"` in `tools/tiles/tileset.ts`. `test/placement.test.ts`, the data builder's 2 m horizontal residual limit and the visual drawn-geometry bounds cover different parts of that transform.

The source/licence record is `src/world/sources.ts`, the on-screen credit is `src/ui/attribution.ts`, and dataset provenance is [design.md](../work/0_shibuya-1km/design.md) plus `tools/data/manifest.ts`:

- PLATEAU Shibuya-ku FY2025 supplies buildings, terrain, road surfaces and street furniture under PDL 1.0, with CC BY 4.0 expressly permitted. Copyright remains with the local authority; no share-alike is attached and commercial use is allowed.
- OpenStreetMap supplies network topology and historical static-rail centrelines under ODbL 1.0. Keep the derived graph/centreline databases separately identifiable from PLATEAU geometry for the ODbL section 4.6 offer of the database or a description of how it was made on publication; the rendered scene is a Produced Work without share-alike.
- GSI elevation is an independent terrain cross-check; it is not drawn. Preserve its PDL 1.0 category 2 attribution; no Survey Act application is required.
- PLATEAU and GSI require both the source credit and the separate processed/edited statement. Do not remove either for space.
- Fetched data stays outside Git. The deliberately promoted small source extracts in `test/fixtures/` keep the provenance and terms in `test/fixtures/README.md`.

`npm run data:fetch` pins the PLATEAU archive by length and SHA-256 and records Overpass's `timestamp_osm_base` in `data/provenance.json`; live OSM is not immutable source. Use the fetcher's bare User-Agent token for Overpass. Fresh remote data does not inherit a reviewed cache's byte pins or source-vintage acceptance.

## Offline scene, restoration and presentation bounds

`npm run data:scene` reads the cached PLATEAU/3D Tiles inputs and writes world-frame `data/scene/`, including 67 placed building tiles. `tools/vite/serve-scene-data.ts` serves `/scene/` and the installed Draco decoder at `/draco/` for dev and preview. `dist/` is not self-contained; another host must serve those data/decoder paths too. Missing inputs must name the recovery requirement, not silently omit the scene. Source-dependent gate prerequisites are in AGENTS.md.

Before geometry cleanup, `tools/scene/rebuild-preservation.ts` checks `markings.mesh` and `markings-provenance.json`. It admits an absent pair as bootstrap or a consistent structurally valid pair in the published-only producer format. Authored paint, unknown formats, a missing partner or malformed/inconsistent records refuse without changing scene bytes. Restore a known pair; authored replacement needs a reviewed regeneration path. This is a read-only preflight, not a transaction, historical-absence proof or lock against external writers; see `test/scene-rebuild-preservation.test.ts` and [gate proofs](../learning/gate-proofs.md).

Ordinary startup requires the admitted external static-rail packet and the reviewed scene cache containing its three original building tiles. Restore the 34-file packet with `npm run data:rail -- --from <path/to/manifest.json>`; admitted manifest SHA-256 is `e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707`. `tools/scene/install-rail.ts` verifies assets/source pins, accepts an exact existing copy and refuses different, partial, foreign or linked destinations. These 52,950,963 bytes stay outside Git/dist and use the finite `/rail-trial/` whitelist. `data:setup` does not recreate the historical packet. Assembly provenance is `tools/scene/stage-rail-trial.ts` admitted run 12. The recorded restoration source in primary is `artifacts/worktree344-retention-20260928/managed-shibuya-quality/files/artifacts/rail-runtime-trial-20260927/overlay/manifest.json`; preserve it while needed. Authored heights/supports/finishes are not surveyed OSM measurements.

PLATEAU `tran` LOD1/2 road polygons are flat at sea level and must be draped to terrain. `tools/scene/build-roads.ts` drops rings with off-terrain vertices; `data:scene` refuses roads more than 5 m below the lowest ground.

Crossing/tactile paint selects nearby road/pavement support using source path elevation, never an unrelated highest X/Z layer or blind terrain fallback. [The pavement recipe](../reference/pavement-recipe.md) records finite checks and omitted parts. The maximum 10 mm opposed-edge seam allowance is paint presentation only; it does not alter source meshes or authorize actor contact.

Traffic hardware is separately authored presentation. OSM control coordinates keep their logical authority, not surveyed pole/head positions. `data:hardware` requires network, final pavement and vehicle assets; every source control has disclosed supported placement or an explicit unplaced result. Missing, malformed or stale geometry/network inputs refuse with the rebuild command. Unplaced hardware must not delete a control or change signal authority. Before population acceptance, the shared actor factory must match the displayed fleet digest to `hardware.inputs.vehicles` and stay within its recorded scale/clearance bounds; a changed fleet/scale requires regeneration and recheck. Discrete pose checks do not establish continuous collision safety or whole-city pavement contact. Ordinary graphics preparation uses `data:vehicles` before `data:hardware`; the human baker remains a separate unfinished population dependency.

## Geographic texture budget

`src/scene/texture-budget.ts` owns the fixed load-time policy: 1024 px generally, 2048 px within 160 m of the crossing, and native 4096 px for the single final-detail leaf containing the observed frontage at world (-38.58,21.58). `npm run data:textures:verify` requires exactly one native leaf/atlas. Runtime selection uses geographic metadata, not the current `data518.b3dm` filename.

The current full-source audit estimates 561,075,583 decoded texture bytes with mipmaps plus 73,324,734 geometry/facade-attribute bytes; these are not measured whole-process GPU allocation or population performance. `src/scene/buildings.ts` uses a 640 MiB cache floor and 768 MiB ceiling and rounds tile estimates upward to integers for LRU disposal. Coarse PLATEAU ancestors omit buildings and do not replace the admitted leaf-detail requirement.

Both styles reuse capped atlases. Release source ImageBitmaps after processing; the policy does not promise camera-dependent resolution upgrades. The frozen harness observes processed dimensions and per-view ray-hit atlas sizes.

## Hardware verification and evidence

Use the GPU for work it can perform and available CPU cores for independent CPU work, under the owner's 2026-09-15/16 direction. The renderer is hardware unless the instrument's subject is the software rasteriser, as in the explicit software arm of `tools/post-chain/`. SwiftShader remains a red-control baseline in [gate proofs](../learning/gate-proofs.md), not a substitute appearance verdict. Exactly one expensive gate runs at a time; the visual gate owns its GPU and preview port.

The five code gates and commands live in [AGENTS.md](../../AGENTS.md). The current `npm run visual` chain resets the certificate before build, builds once, opens/pins the run, runs the hardware appearance lane plus three hardware lifecycle repetitions, then certifies. The wrapper admits only the primary checkout root; integrate reviewed candidate changes there before the final gate. Linked worktrees/subdirectories, an absent step flag, software fallback or an unavailable GPU refuse rather than pass.

The certificate requires 44 fresh 1280×720 images, per-frame hashes/poses, unchanged build bytes, served scene and harness digests, GPU adapter/driver identity and three fresh lifecycle records. The two style-return approach images are lane evidence outside the certified 44. A renderer/driver change needs new evidence, not an inherited pixel comparison. The certificate proves the evidence set exists and its bounded checks ran; it does not prove appearance. Inspect the required Satellite originals at native resolution under the current style focus; a contact sheet is not that review.

The appearance configuration uses three workers, one per specification file, with `fullyParallel: false` and stop-on-first-failure behavior. The lifecycle lane separately checks 15 s navigation / 60 s replacement, page console/uncaught errors and completed outgoing `pagehide` teardown. Its three records must name the hardware renderer and pass all checks. Current configuration and bounds are in `playwright.config.ts`, `playwright.lifecycle.config.ts`, `tools/visual/lifecycle.spec.ts` and `tools/visual/verify-output.ts`.

Dev 5319 and preview 4319 bind explicit 127.0.0.1 with `strictPort`; configs use `reuseExistingServer: false`. The harness checks `app-id` before capture. Answering a port alone is not app identity.

Capture budgets are authoritative in `tools/visual/budget.ts` and checked by `test/visual-budget.test.ts`. The software-derived budget wrapper's deadline is 38,700 seconds (`WRAPPER_DEADLINE_MS`), derived from the per-test sum plus two hours. Those per-test/wrapper ceilings remain live arithmetic backstops, not today's expected hardware pace or a universal owned-process deadline. Actual headless hardware dispatch must declare a separately reviewed finite owned deadline in its run record. `tools/visual/progress.ts` writes the capture ledger.

`SETTLE_BUDGET` in `tools/visual/orbit.ts` distinguishes 320 advanced frames, a 30 min wall backstop and stale frames after 15 s or 8× the longest observed advance gap, whichever is larger. The observer reads frame count, document epoch and full pose together; only fresh frames count. Ordinary capture uses angular/relative quietness; dropdown preservation uses the 80 micrometre world-path bound, three quiet intervals and at least 12 advanced frames. The independently asserted 5 mm post-switch preservation bound remains. These polling bounds do not cancel an unresolved browser RPC; outer stage/owned-runner deadlines must bound it. CPU fixtures do not replace the actual dropdown/native gate.

Where a gate's own bound permits transferring earlier evidence between revisions, require identical built bundle bytes, unchanged `data/scene/**` and changed paths outside the bundle graph. Rebuild and compare `dist/assets/*.js` hashes with the recorded revision; an unread tooling file still requires that build comparison. State the source revision and the check establishing the transfer in the commit message; otherwise rerun. Do not infer acceptance from a remembered green run.

## Harness and iteration lanes

`tools/visual/` drives real pointer/wheel input and reads the frozen `window.__mapsHarness`; it must not assign camera pose, call control setters or invoke rendering. Add observations to `src/harness/bridge.ts`, never mutations.

`tools/visual/lane.ts` assigns separate ignored output roots to frame-budget, populated, flythrough and flicker iteration; unknown lanes refuse. Iteration manifests identify their renderer, but only the verdict run opened by the complete gate can issue `complete.json`. Populated/moving sequences do not inherit acceptance from static city-only frames.

`npm run visual:flicker` (`tools/flicker/`, port 4324) is a moving-camera iteration command, not a certificate. Its Q3 capture copies twelve adjacent native canvases inside RAF with same-task frame/pose/post observations and real sustained pointer/released-pointer wheel input, then encodes PNGs. Every copy is nonblank; pairs must be adjacent and moving with non-accumulating post state. Invalid/gapped copies refuse rather than skip.

The current judge applies the provisional 0.005 bound directly to the unexplained-feature fraction over shared complete 3×3 neighbourhoods; the one-frame cadence does not dilute that bound. Its integer translation model also rejects legitimate fractional, rotated and depth-varying motion. Reports therefore retain `sceneVerdict: not-established`: high residual is unresolved model error, and low residual is a bounded observation. Scene acceptance awaits an independently reviewed model separating legitimate motion from injected defects. [The Q3 component record](../work/0_shibuya-1km/snapshots/q3-motion-capture-review43.md) preserves prior failures and final frame hashes.

Crop names from `tools/inspect/crops.ts` describe screen rectangles, not materials. Classify the actual surface from inspected pixels and state the basis; never use a crop label as evidence.

## Owned artifacts, shared inputs and cleanup

Each task/lane writes only its own ignored artifact subdirectory. A visual specification replaces only its own `visual/hero` or style-sweep directory, preserving other specs and recovery evidence. Promote fixtures/goldens deliberately; do not unignore task output in place. Preserve evidence needed by an active handoff or tracked record, then reclaim unused owned scratch at verification/step boundaries, not only at final completion.

Shared/junctioned `data/` and `node_modules/` are read-only inputs. Data-writing commands require a real owned data directory or owned output path. Dependency install/reinstall requires a real dependency directory or coordinated primary installation; never run either through a worktree junction. Shared tool caches also need ownership, as recorded in [lessons](../learning/lessons.md).

Never follow junctions/symlinks for measurement or deletion. Before cleanup of a directory that has held links, perform a complete nonfollowing reparse census that fails on every enumeration error and reports its count. Detach each exact link itself nonrecursively, verify shared-target counts/hashes, then delete only verified owned paths. `Remove-Item -Recurse` and `git worktree remove --force` are forbidden on any directory that has contained a junction.

Managed archival is deletion. Preserve needed ignored files and record original/resolved link targets; require a fresh zero-reparse census of the exact checkout and checked ancestors before dispatch. A snapshot, clean Git status or link manifest is insufficient. Any remaining link, changed shared target or census error blocks archival; the incident and owed reusable refusal gate are in [343a](../work/0_shibuya-1km/reviews/343a_archive-junction-incident.md). Merged commits do not prove ignored evidence is safe to remove.

`npm run artifacts:size` reports real bytes without following links and refuses copied input trees above the 512 MiB code limit. Confirm tracked content with `git diff HEAD`; status is a hint, not a content comparison.

A citation claiming a change landed must name a commit reachable from main. Unlanded citations name their revision/branch and say so; if the branch no longer resolves, disclose that rather than presenting the commit as landed. Preserve each tracked document's existing line endings. A whole-file diff requires a line-ending check before claiming a whole-file content change.

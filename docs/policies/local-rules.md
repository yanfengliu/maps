# maps — repo rules

These constraints supplement [AGENTS.md](../../AGENTS.md). Its fleet workflow, code gates and world invariants remain authoritative. Plans, reviews, gate proofs and the defect register preserve history; this file keeps current local requirements.

## Shibuya priorities and progress

Prioritize supreme visual quality for the current Shibuya square. Detailed simulation research is deferred and must not block visual milestones. Judge progress by visible improvements integrated on main with independent visual review. Land frequent meaningful, self-contained verified increments on main before growing the next. Keep each independently reversible and preserve unresolved experiments separately. The five code gates and independent review still apply.

Choose verification from the changed behavior and one observable success condition. Exercise the actual production import path with independent expected results; reuse existing test, lifecycle, capture and cleanup tools. Keep one coherent evidence bundle and one integration record per increment. Repeat checks when an operation can invalidate them, or a failure remains unresolved. Do not create per-attempt launch, admission, serialization or reporting layers without a demonstrated need. Read compact verdicts and inspect raw evidence only to answer a specific question. Preserve required source checks, native coverage, independent final review and all five code gates. Documentation-only changes need content, command/link, scope and version checks; skip runtime gates and CI waits. Identity checks and documentation commits do not establish product progress.

Before final source freeze or expensive gates, check every approved changed path, including new files. In the worker's isolated worktree stage only those paths, run `git -c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol diff --cached --check`, and require no unstaged change to them. Repeat after edits and at root integration.

Frozen private reproductions constrain claims about those experiments; their authored generator counts and proof architecture do not define every permitted product implementation. The unshipped commercial union experiment remains unresolved. Replace it with a simpler browser-ready construction that meets the occupied-frontage requirements, rather than extending its general union machinery. Verify complete surfaces, interfaces, material ownership, source preservation, Float32 placement and lifetime through the actual changed production path, then native comparison and the five public gates. Do not rescore the old experiment as passed or transfer its helper passes to the replacement.

Facades must feel vibrant and believable rather than pasted-on wallpaper. Judge close, block and aerial views for material depth, readable windows, lighting response and variation between buildings. Increasing color alone does not establish that outcome. Preserve source attribution, geographic texture limits and temporal checks.

Inspect the whole square proactively: every road needs clear supported markings, surfaces need structure at several scales, dusk needs distributed mounted lights, and trains must visibly run on admitted tracks in the ordinary experience. Include peripheral streets and blocks, noon/dusk, fixed views and held-out seeded exploration. Run the ordinary default experience through real controls to choose the next direction. Rank recurring defects and surprises, record source exceptions and findings, and do not wait for another annotation to discover the same class elsewhere.

Satellite is the sole detailed quality target. Defer Cartographic polish, paired style iterations and detailed Cartographic image review. Retain basic style-switch and shared-rendering checks; automated captures of both styles do not require a second detailed review or establish Cartographic acceptance. This supersedes the earlier requirement to inspect every Cartographic static frame during this focus period. Its later reference remains the clean default Apple Maps view with finer scene detail.

Root owns priorities, shared contracts, canonical status and integrated acceptance; workers own bounded diagnosis, implementation and local checks. Shibuya work continues autonomously; the owner's continue-until-done instruction overrides the default automatic-repair cap for this scope. Reassess after two failures. Use scoped worker goals where supported without overwriting another worker's or root's goal.

Maintain [the Shibuya plan](../work/0_shibuya-1km/plan.md) as the sole current status record, at most 12 KiB. Read it at turn start and before delegation. Preserve all 35 stable implementation items and 14 original acceptance criteria, current adopted evidence and bounds, blockers and stopping conditions. Keep at most three next outcomes with owner, actual status, dependency and done condition; park other dependencies separately. Recover superseded detail from committed history and authored reviews; progress.md is only a compatibility pointer.

Choose visible milestones through fresh ordinary-app critique. Profiling, cleanup and private proof work must not displace Satellite quality. Record prepared versus dispatched work truthfully. Delegate detail without creating another root proof chain. A context repair ends after one independent cold-start review and adoption; do not grow another reporting framework.

Private visual gallery, owner direction 2026-10-17: keep all gallery files under ignored `artifacts/visual-gallery/`, never in Git or published. Show newest work first, one image per row and a concise plain-language explanation of what changed. Omit category filters and badges; keep native-original links and technical history in collapsed details. Give visual updates about every 15 minutes while the goal is active and at capture/review/adoption milestones, reusing sealed images. Do not render or run gates solely for updates. Thread heartbeat `shibuya-visual-progress` owns periodic follow-up and pauses when the goal completes or the owner pauses it.

The population/performance target in [AGENTS.md](../../AGENTS.md#invariants--boundaries) and `src/world/frame.ts` remains 3,000 animated pedestrians and 200 vehicles at 60 fps and 1920×1080. It is not measured acceptance. Deferring simulation research does not defer these eventual requirements. Styles share geometry, simulation and camera; switching the World style dropdown through real pointer and keyboard input must preserve camera and agent progress.

## Camera controls and visual review

In overview, held WASD pans along the ground relative to the view. Middle-button drag rotates; preserve left-button rotation, right-button pan and wheel zoom. Suppress movement while a UI control or editor has focus.

Start walking gives the user control in first person: eye-level WASD/arrow movement over supported streets and left/middle drag to look. Overview or Escape restores the overview. Exactly one input controller owns the camera at a time; the harness remains read-only. The separately named pedestrian prototype does not steer the user's camera.

Before implementation, freeze the ordinary-app framing, fixed block/dusk regressions, source/runtime/build inputs, actual controls and sampled frame times. Require a coherent, substantial visible improvement in the full native view while preserving believable close/block/aerial context and noon/dusk surroundings. Compare fixed baselines across azimuth, elevation and zoom, then explore seeded randomized poses. Record each seed and actual pose, report surprises and state sampling/coverage bounds. Inspect original images at native resolution.

Reject gains supported only by a crop, thumbnail, arbitrary zoom, decorative outline, tint, exposure, added noise or passing tests. Hidden source/geometry/UV/texture-cap changes, unsupported placement, lost photography/artwork/paint, fewer actors or suppressed errors cannot make a comparison qualify. Stale or unpaired evidence and bypassed controls cannot establish production behavior. Sparse images do not prove continuous motion, contact, population or FPS; a local improvement does not close unrelated criteria. Preserve failed results, and require a new discriminating question before another attempt; a blocked route does not establish that its mechanism is impossible.

Before a long event wait, prequalify every planned event camera with a native-size pose image that visibly contains its intended road or subject area. An advancing counter or opaque image cannot substitute for subject visibility.

Default review clips to 30 fps when sufficient; use 60 fps only for a targeted motion question. Inspect sparse keyframes and short event-specific sequences. State actual sampled frame/time gaps and keep uninspected footage outside appearance claims. Preserve required static coverage and the fixed 60 Hz simulation step.

Dispatch a fresh-context critic at each meaningful product milestone or after two consecutive attempts produce no new substantive result. Give it the queue, a compact evidence index and at most three relevant existing images. Request a concise continue-or-redirect decision and act on justified findings before repeating the approach. Do not add a strategy review to every mechanical handoff.

## World and source authority

The [world-frame and AOI invariants](../../AGENTS.md#invariants--boundaries) use `src/world/frame.ts` and `src/world/aoi.ts` as placement/bounds authorities. Global EPSG:6677 or ECEF positions must not reach browser vertex buffers. CityGML `posList` is latitude-first and EPSG:6677 northing-first; `test/aoi.test.ts` checks the axis chain. Fold the glTF Y-up/ECEF Z-up rotation once; `tools/tiles/tileset.ts` declares `gltfUpAxis: "z"`. `test/placement.test.ts`, the builder's 2 m horizontal residual limit and visual drawn-geometry bounds cover distinct parts of that transform.

The licence record is `src/world/sources.ts`, on-screen credit is `src/ui/attribution.ts`, and dataset provenance is [design.md](../work/0_shibuya-1km/design.md) plus `tools/data/manifest.ts`:

- PLATEAU Shibuya-ku FY2025 supplies buildings, terrain, road surfaces and street furniture under PDL 1.0, with CC BY 4.0 expressly permitted. Copyright remains with the local authority; no share-alike is attached and commercial use is allowed.
- OpenStreetMap supplies network topology and historical static-rail centrelines under ODbL 1.0. Keep derived graph/centreline databases separately identifiable from PLATEAU geometry for the section 4.6 offer of the database or a description of how it was made on publication. The rendered scene is a Produced Work without share-alike.
- GSI elevation is an independent terrain cross-check and is not drawn. Preserve its PDL 1.0 category 2 attribution; no Survey Act application is required.
- PLATEAU and GSI require both source credit and a separate processed/edited statement. Preserve both.
- Fetched data stays outside Git. Promoted small extracts in `test/fixtures/` retain the provenance and terms in `test/fixtures/README.md`.

`npm run data:fetch` pins the PLATEAU archive by length/SHA-256 and records Overpass's `timestamp_osm_base` in `data/provenance.json`. Use the fetcher's bare User-Agent token for Overpass. Live OSM is not immutable; fresh remote data does not inherit reviewed cache byte pins or source-vintage acceptance.

## Scene preparation and presentation bounds

The [data preparation prerequisites](../../AGENTS.md#gates) remain required. `tools/vite/serve-scene-data.ts` serves scene data at `/scene/` and the installed Draco decoder at `/draco/` for dev/preview; another host must serve both because `dist/` is not self-contained. Missing inputs must name recovery requirements, never silently omit the scene.

Before geometry cleanup, `tools/scene/rebuild-preservation.ts` checks `markings.mesh` and `markings-provenance.json`. Admit an absent pair as bootstrap or a consistent, structurally valid pair in the published-only producer format. Authored paint, unknown formats, a missing partner or malformed/inconsistent records must refuse without changing scene bytes. Restore a known pair; authored replacement needs reviewed regeneration. This read-only preflight is not a transaction, historical-absence proof or external-writer lock; see `test/scene-rebuild-preservation.test.ts` and [gate proofs](../learning/gate-proofs.md).

Ordinary startup requires the admitted external static-rail packet and the reviewed scene cache containing its three original building tiles. Restore it with `npm run data:rail -- --from <path/to/manifest.json>`; `src/world/rail-trial.ts` owns the admitted manifest digest and preparation contract. The [retention record](../work/0_shibuya-1km/reviews/344_worktree_retention.md#completed-unlink-and-managed-archival) preserves the exact primary restoration path and hash; retain that recovery source while needed. `tools/scene/install-rail.ts` verifies assets/source pins, accepts an exact existing copy and refuses different, partial, foreign or linked destinations. The packet stays outside Git/dist and uses the finite `/rail-trial/` whitelist. `data:setup` does not recreate it. Authored heights/supports/finishes are not surveyed OSM measurements.

PLATEAU `tran` LOD1/2 road polygons are flat at sea level and must be draped to terrain. `tools/scene/build-roads.ts` drops rings with off-terrain vertices; `data:scene` refuses roads more than 5 m below the lowest ground.

Crossing/tactile paint selects nearby road/pavement support using source path elevation, never an unrelated highest X/Z layer or blind terrain fallback. [The pavement recipe](../reference/pavement-recipe.md#separate-physical-paint-overlay) records finite checks and omitted parts. Its maximum 10 mm opposed-edge seam allowance is paint presentation only; it cannot alter source meshes or authorize actor contact.

Traffic hardware is authored presentation: OSM control coordinates retain logical authority, not surveyed pole/head placement. `data:hardware` requires network, final pavement and vehicle assets; every source control needs disclosed supported placement or an explicit unplaced result. Missing, malformed or stale inputs must refuse with the rebuild command. Unplaced hardware cannot delete a control or change signal authority. Before population acceptance, the shared actor factory must match the displayed fleet digest to `hardware.inputs.vehicles` and remain within recorded scale/clearance bounds; a fleet/scale change requires regeneration and recheck. Discrete pose checks do not prove continuous collision safety or whole-city pavement contact. Prepare `data:vehicles` before `data:hardware`; the human baker remains a separate unfinished population dependency.

## Geographic texture limits

`src/scene/texture-budget.ts` owns fixed load-time limits: 1024 px generally, 2048 px within 160 m of the crossing, and native 4096 px for the single final-detail leaf containing the observed frontage at world (-38.58,21.58). `npm run data:textures:verify` requires exactly one native leaf/atlas. Select by geographic metadata, not a tile filename. Both styles reuse capped atlases; release source ImageBitmaps after processing. This policy does not promise camera-dependent upgrades.

Keep the 640 MiB cache floor and 768 MiB ceiling in `src/scene/buildings.ts`, including upward integer rounding, accounting and LRU disposal. Coarse PLATEAU ancestors omit buildings and cannot replace admitted leaf detail. Full-source estimates in [AGENTS.md](../../AGENTS.md#invariants--boundaries) are not measured whole-process GPU allocation or population performance. The frozen harness observes processed dimensions and per-view ray-hit atlas sizes; [cutout loading](../work/0_shibuya-1km/square-cutout-loading.md) records the final-detail contract.

## Hardware verification and evidence

Use the GPU for work it can perform and available CPU cores for independent CPU work. Use hardware rendering unless the instrument studies the software rasteriser, as in `tools/post-chain/`. SwiftShader is a [red-control baseline](../learning/gate-proofs.md), not an appearance verdict. The visual gate owns its GPU and preview port; exactly one expensive gate runs at a time.

[AGENTS.md](../../AGENTS.md#the-visual-gate-is-only-half-a-gate) defines the five-gate chain, 44-frame/three-lifecycle certificate and appearance limits. The wrapper admits only the primary checkout root; integrate reviewed candidates there before the final gate. Linked worktrees/subdirectories, an absent step flag, software fallback or an unavailable GPU must refuse. The two style-return approach images are lane evidence outside the certified 44. A renderer/driver change requires new evidence. Certification does not replace native inspection of required Satellite originals.

Appearance configuration uses three workers, one per specification file, `fullyParallel: false` and stop-on-first-failure. Lifecycle checks separately require 15 s navigation, 60 s replacement, no reported console/uncaught errors and completed outgoing `pagehide` teardown. All three records must name the hardware renderer and pass. Definitions live in `playwright.config.ts`, `playwright.lifecycle.config.ts`, `tools/visual/lifecycle.spec.ts` and `tools/visual/verify-output.ts`.

Dev 5319 and preview 4319 bind explicit 127.0.0.1 with `strictPort`; configs use `reuseExistingServer: false`. Check `app-id` before capture: answering a port does not establish app identity.

`tools/visual/budget.ts` owns capture budgets, checked by `test/visual-budget.test.ts`. The software-derived budget wrapper's deadline is 38,700 seconds (`WRAPPER_DEADLINE_MS`), the per-test sum plus two hours. These ceilings are arithmetic backstops, not expected hardware pace or a universal process deadline. Declare a separately reviewed finite owned deadline for each actual hardware dispatch. `tools/visual/progress.ts` records the capture ledger.

`SETTLE_BUDGET` in `tools/visual/orbit.ts` permits 320 advanced frames, with a 30 min wall backstop and stale-frame refusal after 15 s or 8× the longest observed advance gap, whichever is larger. Read frame count, document epoch and full pose together; only fresh frames count. Ordinary capture uses angular/relative quietness. Dropdown preservation requires an 80 micrometre world-path bound, three quiet intervals and at least 12 advanced frames; the independent 5 mm post-switch bound remains. These waits do not cancel unresolved browser RPCs; outer stage/owned-runner deadlines must bound them. CPU fixtures do not replace the actual dropdown/native gate.

Transfer earlier evidence only where that gate's own bound permits it: require identical built bundle bytes, unchanged `data/scene/**` and changed paths outside the bundle graph. Rebuild and compare `dist/assets/*.js` hashes to the recorded revision; an unread tooling file still requires comparison. Name the source revision and transfer check in the commit message, otherwise rerun. A remembered green run is not acceptance.

## Harness and iteration lanes

The [frozen-harness rule](../../AGENTS.md#the-harness-drives-the-controls-and-never-sets-state) requires real pointer/wheel input. Add observations to `src/harness/bridge.ts`, never mutations.

`tools/visual/lane.ts` assigns separate ignored roots to frame-budget, populated, flythrough and flicker iteration; unknown lanes refuse. Only the complete gate's verdict run can issue `complete.json`. Iteration manifests name their renderer, and populated/moving sequences cannot inherit acceptance from static city-only frames.

`npm run visual:flicker` (`tools/flicker/`, port 4324) is iteration, not certification. Q3 copies twelve adjacent native canvases inside RAF with same-task frame/pose/post observations and real sustained pointer/released-pointer wheel input, then encodes PNGs. Every copy must be nonblank, adjacent and moving with non-accumulating post state; invalid/gapped copies refuse. The provisional 0.005 unexplained-feature bound applies directly over shared complete 3×3 neighbourhoods, without cadence dilution. The integer-translation model rejects legitimate fractional, rotated and depth-varying motion, so reports retain `sceneVerdict: not-established`: high residual is unresolved model error and low residual only a bounded observation. Scene acceptance needs an independently reviewed model separating legitimate motion from injected defects. [The Q3 record](../work/0_shibuya-1km/snapshots/q3-motion-capture-review43.md) retains component history and frame hashes.

Crop names from `tools/inspect/crops.ts` identify screen rectangles, not materials. Classify actual surfaces from inspected pixels and state the basis.

## Shared inputs and cleanup

Use each task/lane's own ignored artifact subdirectory. A visual specification replaces only its own `visual/hero` or style-sweep directory, preserving other specs and recovery evidence. Follow [AGENTS.md](../../AGENTS.md#fleet-conventions) for evidence promotion/retention. Do not unignore task output in place. Reclaim unused owned scratch at verification/step boundaries, preserving evidence needed by active handoffs or tracked records.

Shared/junctioned `data/` and `node_modules/` are read-only. Data writers need a real owned directory or output path. Install/reinstall dependencies only in a real dependency directory or coordinated primary installation, never through a worktree junction. Shared tool caches require ownership; [lessons](../learning/lessons.md) records the owed checks.

Never follow junctions/symlinks for measurement or deletion. Before cleaning a directory that has held links, complete a nonfollowing reparse census that fails on every enumeration error and reports its count. Detach exact links nonrecursively, verify shared-target counts/hashes, then delete only verified owned paths. `Remove-Item -Recurse` and `git worktree remove --force` are forbidden on any directory that has contained a junction.

Managed archival is deletion. Preserve needed ignored files and original/resolved link targets. Before dispatch require a fresh zero-reparse census of the exact checkout and checked ancestors; a snapshot, clean status or link manifest is insufficient. Remaining links, changed shared targets or census errors block archival. [343a](../work/0_shibuya-1km/reviews/343a_archive-junction-incident.md) records the incident and owed reusable refusal gate. Merged commits do not prove ignored evidence is safe to remove.

`npm run artifacts:size` measures real bytes without following links and refuses copied input trees above its 512 MiB limit. Confirm tracked content with `git diff HEAD`; status is a hint, not a content comparison.

Landed-change citations must name a commit reachable from main. Unlanded citations name their revision/branch and say so; disclose an unresolved branch. Preserve each tracked document's existing line endings. Check line endings before attributing a whole-file diff to content.

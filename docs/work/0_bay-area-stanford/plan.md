# Bay Area map and Stanford 3D

Status: complete
Owner: root integration
Created: 2026-10-19
Updated: 2026-11-07

Migration note: this plan restructures the original `docs/work/0_bay-area-stanford/plan.md` into the current plan format. The original is git blob `59b480ca55168d5b434dbd14bf0a5e4d5fa9dbed`, 4,844 bytes, SHA-256 `fc9836d5c98d292e1aeb75678b5eab21af837679cc78674e2649e5779af2fd39`. It entered `main` in integration merge `7c6097e18efd712d741f66772588ee5acc3a3741` and is unchanged through `7e43b5d056da66512c1ab0556ebc27568b42887b`. `git show 7c6097e:docs/work/0_bay-area-stanford/plan.md` recovers it. Its metadata line was split: `Started` became `Created`, `Owner` is unchanged, `Base` opens Implementation steps and the status sentences are quoted under Outcome. Every other original sentence and table row is kept word for word, and the subheadings are original headings. Paragraphs marked "Migration note", and the list after one, are added. In the original's text, "this increment" and "this acceptance" mean the first increment. The `plan.md` line citations in `reviews/1_integrated-review.md` and `reviews/2_focused-review.md` use the original's line numbers, which are the same at plan base `9995b1b`.

## Problem and outcome

Build a runnable map inspired by Apple Maps: the real San Francisco Bay Area coastline, regional map context and smooth map navigation. Build 3D buildings only for Stanford University's main campus. Begin at a regional overview and provide a clear flight into the campus.

Migration note: the original states this intended result and no separate problem.

## Scope

Navigation means camera movement and finding places: pan, zoom, rotation, tilt, north reset, 2D/3D and local place search. Route planning, turn-by-turn directions, satellite imagery, live traffic, photorealistic Flyover and other cities' 3D buildings are outside this increment. No Apple imagery or credentials are required. Keep the prototype local; publication needs a separate instruction.

The former Shibuya project remains on `codex/shibuya-archive-2026-10-19` at `e93f56711a5b629481c1512a89058c2823017840`. Do not alter it or its retained local resources.

## Approach

### Current correction: roof continuity and arcade appearance

The owner rejected the 2026-11-07 result in a new screenshot of the Main Quad: roof bands have pinched, zigzag peaks, and repeated flat facade arches still look artificial. Base `acbdece4313e64050cc253b981587c93ff2cd276` is the retained failed visual baseline; earlier overlap and courtyard regressions remain binding. Root owns `codex/quad-roofs-20261107` in ignored `artifacts/quad-roofs-20261107/wt`.

Fixed reproduction before comparing mechanisms: use the unchanged published Quad relation, all nine part exclusions and the resulting three components; render the actual Main Quad flight, one settled zoom-in and 49-degree tilt at 1056×1013, plus close oblique and opposite views. Keep the owner's supplied image and prior gallery as counterevidence. Geometry acceptance also includes a straight 100×10 m bar, an L-shaped wing, a courtyard ring, translated/rotated versions, and a held-out real concave wing. Roofs must have continuous ridges and valleys with consistent pitch, no interior troughs caused by input triangulation, exact footprint-area coverage, empty courtyards, finite geometry within source height, complete edge closure and the existing total 160k-triangle / 24 MiB / two-draw budgets. Facades must distinguish real open arcades from closed rooms without repeated opaque arch-shaped decals. Review source photographs and inspect native images before acceptance.

Disqualifiers: merely increasing subdivisions or adding texture to the same sampled height field; flattening all roofs; fixing only the marked corner; changing source coordinates or covering courtyards; raising budgets or hiding failures; claiming a general roof method while leaving its concave/holes subproblem unsolved; adding a major dependency or changing source formats without authorization. Compare distinct mechanisms independently, preserve compact attempt evidence here, then independently review the integrated candidate. No fleet policy or frozen historical record changes.

The comparison selected the straight-skeleton topology candidate. The independent analytic candidate used a continuous six-plane finite-segment envelope, passed its fixed numerical fixtures and retained 156,074 total scene triangles / 24,347,544 bytes, but took approximately 508 ms and normalized pitch separately across the three components. The selected method solves exact source-edge planes over a compact offline-authored topology, passed the same bar/L/courtyard classes plus a held-out East Wing, and retained 154,460 triangles / 24,095,760 bytes before facade integration. It gives all three low components one pitch, preserves actual concave wing eaves and leaves more room for physical facade geometry. No app dependency, source coordinate, height or budget changed. The pinned BSD-3 Python authoring tool remains offline; only reviewed connectivity ships. Candidate sources, measurements and unsuccessful intermediate results remain under ignored `artifacts/quad-roofs-20261107/`.

Two verification-instrument corrections require independent review: the old assertion that every concave wing has exactly four normals encoded the incorrect bounding-box roof; the replacement checks bidirectional agreement with every real source-edge plane and preserves the existing area/holes assertions. A new frontage test initially guessed at least ten wing edges; source inspection established eight edges across the six photographed north wings, so it now asserts those six identities and checks actual open/recessed geometry on every eligible segment. The original failed run is retained with the final evidence. Browser inspection found a separate exact-double signature defect: unchanged published coordinates project up to 1.77 nanometres differently between Node and Chromium. Only the signature canonicalization may tolerate that numeric noise; rendered coordinates, source hashes, planar coverage and 1 mm change rejection stay strict.

Implementation and verification are complete: [review 17](reviews/17_implementation.md) accepted the roof method and instrument corrections and found elevated picking regression F42; [review 18](reviews/18_implementation.md) accepted its invisible-query-layer repair and the native floor correction. All 82 tests, build, types, audit, native desktop/phone production views and graphics recovery pass within [the recorded measurement bounds](design.md#quad-roof-continuity-and-facade-correction-2026-11-07). Implementation `40f962fa31a3f643138025fbab806d3eae744272` is merged to main and pushed, with matching remote SHA. GitHub reports zero configured workflows, runs or checks for this revision; no remote CI pass is claimed. Source data, dependencies and archive are unchanged. Useful prototype/review/visual evidence is retained outside the disposable worktrees; no additional product scope is queued.

### Current increment: Quad surfaces and architectural detail

The 2026-11-07 embedded-browser retest of `12c8fb4` passed in the current runtime: regional startup, repeated Stanford flights, close landmarks, desktop/mobile framing, real input and a fresh production tab. The owner confirmed it works without error. No application repair or original hang cause is claimed; retained evidence is under ignored `artifacts/embedded-recovery-20261107/output/playwright/`.

The owner then reported interleaved arches and rectangular windows near Margaret Jacks Hall and requested much more architectural detail, prioritizing the Main Quad and landmarks. The implementation composes all nine mapped parts out of the render-only parent, preserving source coordinates, heights and courtyard coverage. Inner Quad arcades have actual recessed geometry, columns and stone arch surrounds; eight named wings have fitted elevations and planar hip roofs. [The design](design.md#quad-detail-2026-11-07) records sources and unsurveyed limits. Independent [review 15](reviews/15_implementation.md) and [review 16](reviews/16_implementation.md) accepted the final source/tests after fixing ten short wall gaps. All 69 tests, build, types and audit pass. Browser verification and integration are complete at `111e6655aa4b7470f8ea1546eb8b15020809bbaa` on pushed main. Source data and the archive are unchanged.

### Shared contract

MapLibre GL renders public OpenFreeMap vector tiles with a custom light map style. Local `public/data/stanford-buildings.geojson` supplies Polygon/MultiPolygon footprints. Each feature has `id`, `name`, metre-valued `height` and `base`, `heightSource` (`osm-height`, `osm-levels` or `estimated`), `color` and `roofColor`. `stanford-campus.geojson` defines the admitted campus boundary. `stanford-provenance.json` records sources, licences, fetch dates, counts, hashes and estimates. Root must verify the final contract rather than trust handoff summaries.

### Current limits

The base map depends on the public OpenFreeMap service. Stanford building heights may be derived from levels or estimated when OSM has no height. Building massing is not a surveyed model or Apple Flyover. Verification must identify actual loaded/rendered counts and sampled views; screenshots alone do not establish every gesture, all campus geometry or performance across devices.

## Acceptance criteria

- The first view recognizably depicts the real Bay Area, with coastline, water, roads and place labels.
- Exploring Stanford flies to real campus building footprints and visible 3D massing; no off-campus 3D is rendered.
- Desktop mouse/keyboard controls and mobile layout work through actual controls. Search, place selection, zoom, compass, tilt and 2D/3D have useful behavior and accessible names.
- Footprint source and height estimates are disclosed; required attribution remains visible. Network failure produces an actionable error.
- Production build, types, meaningful unit/data checks and dependency audit pass. Inspect headless screenshots at desktop and mobile sizes, multiple Stanford angles and the regional overview. Exercise real control paths and inspect browser errors and actual loaded data.
- Obtain independent read-only review on the integrated revision. Fix material findings, repeat affected checks, merge to `main`, push and verify remote refs. Preserve the old archive ref exactly.

Migration note: these are the original's criteria for the first increment. This plan records none for later or remaining work.

## Implementation steps

Base: `2d1883392a04c932a18136b59d43dea05fd17fb2`.

| Outcome | Owner | State and dependencies |
| --- | --- | --- |
| Map, controls and interface | bay_area_app | Complete through `475e28e`; all material review findings repaired. |
| Actual Stanford footprints and provenance | stanford_data | Complete through `62a2507`; 648 real footprint/part features and an actual campus boundary. |
| Integration, visual checks and acceptance | root | Accepted within the bounds in [the integration record](integration.md); final delivery merges to main and removes task-owned worktrees. |

Implementation checkouts lived under ignored `artifacts/bay-area-stanford/` and use real owned dependencies, never links to the previous project. Root serialized browser verification and closed every browser/server in a finally cleanup path. Retained screenshots, source cache and evidence ownership are described in the integration record.

Migration note: work continued in this folder after `7c6097e` without updating the original, and this plan records no steps for remaining work. The original links only the integration record. This migration links every record in the folder, grouped by the commit that added it. Each record stays unchanged at its path.

- `7c6097e`: [integration.md](integration.md), [reviews/1_integrated-review.md](reviews/1_integrated-review.md), [reviews/2_focused-review.md](reviews/2_focused-review.md)
- `38eb59a`: [startup.md](startup.md), [reviews/002_startup.md](reviews/002_startup.md)
- `e9a9cb6`: [detail-performance.md](detail-performance.md), [reviews/003_detail-performance.md](reviews/003_detail-performance.md)
- `cd5ade1`: [navigation-startup.md](navigation-startup.md), [reviews/004_navigation-startup.md](reviews/004_navigation-startup.md)
- `89cb74e`: [held-input-architecture.md](held-input-architecture.md), [reviews/005_held-input.md](reviews/005_held-input.md)
- `89fc3e8`: [architecture-references.md](architecture-references.md), [reviews/006_architecture.md](reviews/006_architecture.md)
- `f9d803e`: [simultaneous-environment.md](simultaneous-environment.md), [campus-environment.md](campus-environment.md), [reviews/007_simultaneous-input.md](reviews/007_simultaneous-input.md), [reviews/008_campus-environment.md](reviews/008_campus-environment.md)

Added 2026-10-30: the bench accuracy and campus sculpture increment was written on 2026-10-20 and neither gated nor reviewed then. It was parked as `584733e` on 2026-10-29, merged onto `main`'s `d683dac` in `7dba7ab`, and repaired in `8e45ed8`, `5c9f24b`, `a2486a8`, `c5483cd` and `649d7c2` after review rounds 9 to 13. It merged to `main` on 2026-10-30, with its three notes folded into [design.md](design.md). Its review rounds are [reviews/9_integration.md](reviews/9_integration.md) to [reviews/14_integration.md](reviews/14_integration.md).

## Outcome

Added 2026-11-07: the previously unresolved embedded-browser acceptance now passes on the unchanged baseline, with owner confirmation; the original cause remains unknown. The Main Quad overlap correction and detail refinement are merged and pushed as `111e6655aa4b7470f8ea1546eb8b15020809bbaa`. The final mesh is 156,842 triangles and 24,467,352 bytes in two custom draws. Actual graphics recovery, fixed and rotated desktop views, production loading and phone flights pass. GPU motion and host-throttling limits are explicit in the design. GitHub reports zero configured workflows, zero runs and zero checks for this commit; no remote CI result is claimed. All task tabs, both servers and their recorded child processes are closed. Delivery removes the task branch, active checkout and unused historical comparison checkout after this documentation commit; intentionally retained evidence stays under `artifacts/embedded-recovery-20261107/output/`. No unmerged product work remains.

Migration note: this migration sets `Status: active`, and the unit's outcome is pending. The original's status sentences cover only the first increment. Later records in this folder leave an acceptance item open: [held-input-architecture.md](held-input-architecture.md) has a section headed "Embedded-browser acceptance still open", and [simultaneous-environment.md](simultaneous-environment.md) says actual embedded-browser recovery "remains an unresolved earlier defect".

Migration note: the original's status sentences read "Status: first increment implemented, verified and independently reviewed. Delivery is the integration commit containing this record; no further product scope is queued." There, "this record" is the original plan; the integration commit that first contains it is `7c6097e`, a merge of plan `9995b1b`, app `475e28e` and data `62a2507`. The integration record holds that increment's verification, review rounds and bounds. Quoting the status is history, not a new verification claim.

Added 2026-10-30: the bench accuracy and campus sculpture increment is merged. The 163 mapped bench points keep their source tags and coordinates. 25 mapped bench ways and eight authored Inner Quad seat walls are added. Material and backrest follow their tags, and a bench of unknown material is a flat neutral marker, as 23 of the 25 ways are. Facing follows a `direction` tag, or else is estimated by the rule in [design.md](design.md#modeled-facing). Rodin's Burghers of Calais and the Angel of Grief stand at their mapped anchors, searchable, with flights at zoom 21.1 under a native maximum of 21.5. The campus detail mesh is 153,765 triangles and 23,987,340 bytes in its two draws. The integrated revision named in [review 14](reviews/14_integration.md) passed typecheck, 65 unit tests, build with only MapLibre's chunk-size warning and audit with 0 vulnerabilities on Node 24.18.1. It also passed a native check of 17/17 through real controls at 1920×1080 and 390×844. 23 regression checks each went red with their defect put back. Rounds 9 to 13 each ran both review lanes, and review 14 records the review of the integrated revision. [design.md](design.md) records the design and the [limits the reviews left](design.md#limits-the-reviews-recorded).

### Accepted result

The real Bay Area opens in a custom light map style. Stanford has 648 locally served footprint/part features, with 81 mapped height tags, 80 floor-count estimates and 487 default-height estimates. Main Quad courtyard holes and Hoover Tower's stepped mapped parts are retained. Search, mouse/keyboard controls, touch pan/pinch, compass, 2D/3D, tilt, building details, consistent desktop/mobile Bay returns and both regional/local-source Retry flows passed bounded real-control checks. Build, types, 13 unit/data tests and audit passed; the MapLibre chunk-size warning remains. The first increment is an exploratory campus massing model. Routing, physical-device/Safari verification and a broad performance claim are not part of this acceptance.

## Memorial Church interior, 2026-11-07

Status: complete. The owner requested a researched Memorial Church interior and selected a roof-removed cutaway. Root owns geometry, integration, visual acceptance and delivery; church_interior_references supplied read-only official/photo research; church_interior_integration supplied the mode/UI and lifecycle tests. Both workers have bounded scopes in isolated worktrees or ignored references. Base is fca2ba28ef91e48bd6f81e7234ffab22af1af94e.

Acceptance: recognizable current nave/aisles, three arcade bays per side, crossing, curved pews/steps, chancel/altar, galleries and two distinct organ cases; references and uncertain proportions disclosed. Entry from church selection/search, whole/nave/altar/organ presets, roof-off default, optional ceiling structure, exit/search/overview recovery, mobile framing, source failure and context restoration must pass through real controls. Source footprints/heights stay unchanged. One mesh pair at a time preserves the 160k triangle, 24 MiB GPU geometry/material and two custom draw limits. No dependency, remote service or renderer is added. Independent review and required gates precede commit, main merge and push.


### Memorial Church interior delivery

The researched cutaway and caption repair are merged to main and pushed as 93d47facbcc2125151308b40f1dd1fb98543ae9e. Build, types, 103 tests and audit pass. Independent review 19 finds no P1/P2 issues; F43 is closed by a red/green navigation regression and actual browser transitions. Final desktop/mobile images and the offline visual gallery are retained under artifacts/church-interior-20261107/output/. All recorded task-owned headless browser, automation daemon, dev/preview server and child processes are closed, with an empty post-cleanup inventory. No shared browser or unrelated process was stopped. GitHub reports zero configured workflows, runs, checks and statuses for the delivered commit; no remote CI pass is claimed. Cleanup removes only the two owned temporary worktrees and branches after this documentation commit. No unmerged product work remains. Dimensions, decorative placement, gallery seating and pipe counts remain modeled estimates, as disclosed in the product and design.

### Church artwork alignment follow-up

Status: complete. The owner-reported tilted wall paintings are corrected and delivered to main/origin as f56ed64e30441588f05fcde3f35cc817debf3c83. Root implemented and verified the correction from base 7f49891; art_mapping_assessment supplied bounded read-only apse calibration; independent review 20 found no P1/P2 issues and confirmed its minor comment finding F44 resolved. Planar regions remove source camera perspective without diagonal seams; curved apse bands meet the modeled cornices and share boundary samples. Original photographs, source footprints/heights, renderer format and draw count remain unchanged.

Build, types, all 108 tests, audit and the work-document checker pass. Native-resolution production desktop/mobile controls, fixed and rotated views, ceiling toggle, exterior restoration and the six-image before/after gallery pass. The new interior uses 55,329 triangles and 15,763,484 combined geometry/texture bytes in two draws. All owned browser/server processes are closed; the remaining-process inventory is empty. GitHub has zero configured workflows, runs, checks or statuses for f56ed64; there is no remote CI pass to claim. The gallery and useful evidence remain in artifacts/church-art-alignment-20261107/output/. Cleanup removes the disposable task worktree/branch and CLI scratch after this delivery record lands. No unmerged product changes remain; photographic crops and unsurveyed dimensions remain approximate.

### Global map and church exploration, 2026-11-07

Status: complete. The owner clarified that this is a worldwide map, with Stanford as the first finely modeled area; requested surrounding context during interior exploration, WASD in every mode, removal of the left information panel, and confirmed that complete walls blocking the camera should be cut away while other walls remain connected. This explicit scope supersedes the earlier Bay Area-only navigation scope for this increment. Base is 7cbddb24b9cea606640338d11055408d2fa0a613.

Root owns integration, wall geometry/shader, final global cartography, visual acceptance and delivery. global_wasd owns the bounded input/listener correction; map_ui_world owns compact UI, global navigation and native church-only filtering; art_mapping_assessment owns the bounded worldwide search module. Each worked in an isolated task worktree. Independent review follows integrated gates and native production checks. No new dependency, source-data change, publication or deployment is included.

Acceptance: all surrounding native campus buildings and map labels remain visible with only church exterior caps excluded; every source perimeter wall is complete before whole-wall camera clipping; opposite views restore opposite wall groups and attached art; WASD works after ordinary controls in world/campus/church modes while text entry remains usable; no persistent left information panel; worldwide pan/zoom and submitted search reach multiple continents and wrap across the dateline without separating authored Stanford detail from native geometry. Desktop/mobile entry, view/ceiling controls, exits, search failure/Retry and graphics recovery must pass. Keep the two-draw/24 MiB custom detail limit, meaningful regressions, independent review, all gates, main delivery and scoped process/worktree cleanup.


The integrated runtime aa5e0202a65942ee32ebcffd8909f79ca4dd91af passes build, types, 132 tests and zero-vulnerability audit. [Review 21](reviews/21_implementation.md) found F45 in IME search handling; [review 22](reviews/22_implementation.md) independently accepts the guard and regression. Production real-control checks and desktop/phone captures pass within the bounds in the design; the twelve-image offline gallery loads without overflow. All recorded browser/server runs have empty post-cleanup inventories.


Delivered to main and origin/main as 29b3fed521fbb9922888f0c64b8a3b4f6c6943c8; the final documentation commit preserves the verified runtime unchanged. GitHub reports zero workflows, runs, checks and statuses for that delivered revision, so no remote CI pass is claimed. The final scoped process inventory is empty. Three worker worktrees and branches are removed after checking their full known changes against integration; no unmerged product work remains. The integration worktree/branch and CLI scratch are removed after this documentation commit lands. Useful final screenshots, gallery, regression logs and production evidence remain under artifacts/church-map-context-20261107/output/. The archived Shibuya branch and unrelated worktrees remain untouched.


### Globe, Stanford arrival and landmark realism, 2026-11-07

Status: active. The owner requests a globe instead of a flat Earth, startup at Stanford, removal of the building-card campus-return button, visible entrance doors below the church organ loft, and much better Stanford Stadium modeling. General direction is reference-based realism, with authored approximations disclosed. Base is ab09b9ff01b620ce7f49283ed2a035918b3257b2. Root owns globe/startup/UI, native-layer integration, visual acceptance and delivery. church_entrance_doors owns the researched entrance geometry and regression; stadium_detail owns researched stadium surfaces and focused tests. Both work in isolated task checkouts.

Acceptance: Stanford is the constructor's initial camera before tile loading; World shows a rotatable globe at usable desktop/phone framing, and navigation, search and church detail survive globe transitions. Building cards omit the redundant campus action. Three photographed under-loft entrances remain attached to the entrance cutaway group. Stadium retains mapped footprints/heights but uses a recognizable field and inward-facing lower/upper seating rather than generic roof planes. Native shells/caps and picking follow custom detail readiness, loss and mode changes. Preserve existing geometry/material/draw limits, real-control GPU verification, independent review, gates, main push and scoped cleanup. No new dependency, satellite imagery, data-source rewrite, publication or deployment is authorized by this increment.


Integrated acceptance: build, typecheck, all 143 tests, audit (zero vulnerabilities) and work-document checks pass. Real headless production controls verify globe/startup, church entrances, stadium selection and graphics recovery; desktop/mobile captures and the ten-image gallery are accepted within the design record bounds. New GPU paint regressions fail on both prior fade and reflection defects. Independent review and main delivery remain.

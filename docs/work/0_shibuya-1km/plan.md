# 1km x 1km animated Shibuya model

Status: active
Owner: root orchestrator
Created: 2026-09-06
Updated: 2026-10-17

## Problem and outcome

Build the approved roughly 1 km square of Shibuya as a believable browser world with moving pedestrians and vehicles. Supreme Satellite visual quality is the current priority. Progress means visible improvement independently reviewed and integrated on main; helper passes/docs are not product progress. The goal is ACTIVE. Full-map quality, population and performance acceptance remain OPEN.

## Scope

AOI: 35.6550–35.6640 N, 139.6950–139.7060 E; crossing origin: 35.6595 N, 139.7005 E. [AGENTS.md](../../../AGENTS.md), [local rules](../../policies/local-rules.md), [design](design.md) and the [network contract](../../reference/network-contract.md) retain world/source/gate contracts.

Non-goals: map viewer, navigation/routing, survey-grade reconstruction, second location, new product surface or shipping target. Simulation research and Cartographic polish are deferred; population/performance/two-style requirements remain. Styles share geometry/camera/simulation; basic real-input switching is required.

## Approach

Root owns priorities, contracts, this sole status record, acceptance and integration. Workers own bounded diagnosis, implementation and checks. Read it at turn start and before delegation; keep at most three next outcomes, park dependencies, reassess after two failures for one reason and land verified increments on main.

### Current adoption and evidence

Adopted product revision `4203496dc5b180853cba7381932e7131cb259f33` adds three east lower-frontage bays over 14.4 m: physical frames/recessed glazing/backed rooms, one supported entrance and preserved wall light. [1430](reviews/1430_peripheral-frontage-depth-implementation.md) and independent [1431 PASS](reviews/1431_peripheral-frontage-integrated-review.md) bind finite source/support/appearance/lifetime acceptance. Cost: four draws/594 triangles/71,280 geometry bytes, no new textures/lights. Lighting `0aeb006`, tactile `8ff08fe` and occupied corner `e483cd5` remain preserved. No full-map criterion closes.

All five final primary gates pass: build/types, 129 files/1,160 tests in 81.44 s, audit (two existing moderate advisories), and visual run `b459545888f6b421`: 44 frames/three lifecycles in 293.156 s, RTX 4090/driver 616.64. Review 1431 inspected 43 native originals: 14 local, five baseline, 22 certified Satellite and two basic style returns. The two upper-context local shots are occluded/unaccepted. Four runtime build files match local capture; two debug maps differ. Static/lifecycle evidence does not qualify continuous motion/population/FPS.

Main and origin/main read back exact. Remote CI has zero checks/statuses/workflows, so no remote pass is claimed. Fresh worker checkout/registration/metadata removed normally after preservation. Final census freshly checked 69 unique owned identities, exact task markers, ports and TEMP; all clear. Needed evidence/cache retained; historical worktrees untouched.

Runtime cache: 156 files/364,187,965 B, SHA-256 `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`; older 157-file certificates do not transfer. Preserve the user-owned primary `test/facade-emission.test.ts` edit.

### Current operation and next outcomes

Context repair `c42c526` passed [1419](reviews/1419_orchestration-context-review.md). Review 1431 recommends a representative upper-floor window group next: source-verified frame depth and floor rhythm. This is selected, not dispatched; no final criterion closes.

Profile COMPLETE; worker CPU attribution UNAVAILABLE from parent-only capture. Follow-up PARKED; no optimization selected. Inputs unchanged/resources closed: `artifacts/orchestration-context-20261017/profile/profile-summary.json`.

| Next outcome | Owner/status | Dependency and done condition |
| --- | --- | --- |
| Upper-floor window depth | Root; selected, NOT DISPATCHED | Start from adopted main. Choose a representative source through the ordinary app, then a bounded upper-floor group with source-verified frame depth/floor rhythm. Native close/block noon/dusk, required gates, independent review and main adoption; preserve prior work. |
| Retained historical worktrees | Root; inventory COMPLETE/removal PARKED | 65 checkouts retain distinct/unclassified data; no safe batch. Preserve first; do not delay product work. Evidence: `artifacts/retained1421-inventory/summary.json`. |

No global blocker is established. The next-outcome table is the sole current dispatch queue. Full acceptance needs matching final evidence and independent integrated review on main; local milestones close no final criterion.

## Acceptance criteria

The 14 original criteria remain OPEN for final acceptance. Historical checks/local milestones establish only their named bounds.

- A1. Terrain, buildings and roads render end to end across the full AOI, inspected from several angles/zooms at native resolution.
- A2. The Shibuya valley and Dōgenzaka slope read in the terrain; building footprints neither float nor sink.
- A3. Close buildings have floor-count window rhythm and light-responsive PBR materials, checked at street level and above.
- A4. The dusk crossing reads as Shibuya through emissive signage and neon.
- A5. Road markings match reference imagery, including scramble diagonals, with signals, guardrails and street furniture in place.
- A6. Dusk uses ACES, neon bloom, SSAO and TAA without flicker/crawl over a moving sequence.
- A7. Over a run, vehicles hold lanes, obey signals, turn, and spawn/despawn at the boundary.
- A8. Pedestrians avoid each other and surge diagonally on the signal phase, without visible interpenetration or sliding feet.
- A9. One clock/phase model drives both populations; no traffic moves through an occupied scramble.
- A10. 60 fps at 1920×1080 with 3,000 animated pedestrians and 200 vehicles; name measured hardware, build and timing window.
- A11. Rebuild derived geospatial outputs from a clean checkout, render again and compare the result.
- A12. The running app shows PLATEAU (PDL 1.0, CC BY 4.0 permitted), OSM (ODbL) and GSI attribution plus required processing credits.
- A13. Native multi-angle/zoom sweep and real-controls flythrough over time are clean; independent review passes and the result is merged to main.
- A14. Both Cartographic and Satellite hold up at street/block/aerial distances; pointer/keyboard dropdown changes both ways preserve camera/agent progress and use an extensible registry. Detailed Cartographic review is deferred during the Satellite focus.

## Implementation steps

These are the 35 stable identities across phases 0–10; never renumber. Item 35 was appended to Phase 4. F = integrated foundation, requiring final recheck; O = partial/open, including narrowly accepted capabilities. Neither means final deliverable acceptance.

| Item | Phase | Identity | Bound |
| --- | --- | --- | --- |
| 1 | 0 | Vite/three.js/TypeScript scaffold; Node 24 pin | F |
| 2 | 0 | Playwright harness drives OrbitControls through real inputs | F |
| 3 | 0 | Actually run commands recorded in AGENTS Gates | F |
| 4 | 1 | Fix AOI | F |
| 5 | 1 | PLATEAU Shibuya-ku FY2025 CityGML LOD2 | F |
| 6 | 1 | OSM lanes/crossings/signals/sidewalks/rail via Overpass | F |
| 7 | 1 | PLATEAU 2.5 m terrain TIN; GSI cross-check | F |
| 8 | 1 | Licences and in-app attribution | F |
| 9 | 2 | EPSG:6677 projection; local crossing origin | F |
| 10 | 2 | MLIT 3D Tiles: unwrap b3dm/glTF, georeference, clip | F |
| 11 | 2 | DEM terrain mesh and supported building footprints | F |
| 12 | 2 | Culling/LOD tiles; ignored regenerable outputs | F |
| 13 | 3 | Terrain/buildings/road surfaces render | F |
| 14 | 3 | Camera/controls and first visual baseline | F |
| 15 | 4 | Photographic facade albedo/PBR; floor-count windows for untextured/hero cases | O |
| 16 | 4 | Emissive signage and neon | O |
| 17 | 4 | Markings/diagonals, signals, furniture and guardrails | O |
| 18 | 4 | Wet asphalt and sidewalk paving | O |
| 35 | 4 | De-light baked daylight/shadows in photographic facades | O |
| 19 | 5 | Time-of-day sun/sky; dusk hero | O |
| 20 | 5 | ACES, bloom, SSAO and TAA | O |
| 21 | 6 | Lane-level/sidewalk/crossing graph | F |
| 22 | 6 | Shared signal-phase clock for both populations | O |
| 23 | 6 | Document/freeze schema; keep OSM database separate | F |
| 24 | 7 | IDM following and MOBIL lane changes | O |
| 25 | 7 | Signal obedience, turns, boundary spawn/despawn | O |
| 26 | 7 | Instanced vehicle rendering | O |
| 27 | 8 | ORCA/RVO2 avoidance with spatial hash | O |
| 28 | 8 | Signal-driven diagonal scramble surge | O |
| 29 | 8 | Thousands of VAT-animated characters | O |
| 30 | 9 | Draw-call/LOD budget; target-count 60 fps/1080p | O |
| 31 | 9 | Profile, fix and re-measure | O |
| 32 | 10 | Native multi-angle/multi-zoom sweep | O |
| 33 | 10 | Real-controls flythrough over time | O |
| 34 | 10 | Independent review and main integration | O |

### Cross-map bounds and parked dependencies

Whole-AOI quality remains open: close/block/aerial views, peripheral blocks, noon/dusk, fixed and held-out seeded exploration. Record seeds, poses, inspected-byte digests and temporal sampling gaps. Inspect Satellite originals natively and check basic style continuity. Final traversal/building clearance remains open; [445](reviews/445_camera-only-native.md)'s 857 m ascent is a route-coverage bound, not a clearance height.

Facades still need convincing depth/glazing, floor rhythm, de-light and variation across representative buildings. Every road remains in scope, including 32 untreated objects and five omitted urban-expressway carriageways. Source/layer/LOD binding, lane semantics and nine-stratum/held-out native coverage remain open; repeated paint keys do not prove duplicate paint. Distributed mounted dusk lighting needs source selection, supported occupancy, density/sightlines and a same-run refusal histogram. Wet/ground/tree/base contact and crossed-paint authenticity remain open. Unadopted 413/420 and rejected facade/tree/ground/lighting branches are parked; exact source exceptions remain in the historical progress record.

Default rail acceptance is narrow: exterior gaps/bearings/returns, actors under spans, temporal coverage and a recognizable supported train passage remain open. Vehicles need joined wheel/body contact, bus/portal/class coverage, spacing and visible governed signal behavior; the old fixture has no governed entry. One ordinary walker is accepted, not a full crowd. Supported full-source eligibility, animated soles, avoidance, no sliding/interpenetration and broader default flow remain open. The 150-pedestrian/20-vehicle seed 5970698, 600 s contract remains red/unqualified before untuned seed 42/native event evidence. Motion/contact experiments stay parked.

Continuous populated/camera/time stability remains unqualified by sparse stills. Historical ~12 fps and 59/200 vehicles are bounded failures, not current measurements or a reduced target. [398](reviews/398_gpu-delight-startup-comparison.md)'s startup gain is not population FPS; machine-cold startup, port-5319/loading/decoder causes and custom HTTP certification remain unknown/unestablished. Simulation research deferral does not delete A7–A10.

Private union 1324 remains UNMET. Its 387/63-part proof chain constrains that experiment, not every valid product construction. Preserve its evidence/obligations; do not resume it by default or transfer helper passes to main. No new launch/admission/report framework or weaker gate is authorized.

## Outcome

Active; full deliverable incomplete. The adoption/evidence and next-outcome sections above hold current status. Full-map, temporal and population/FPS acceptance remain open.

Exact old `plan.md` and `progress.md` remain in [Git at e483cd5](https://github.com/yanfengliu/maps/tree/e483cd5dfa58ee89876fba268c55c619daca9d5f/docs/work/0_shibuya-1km). Recover with `git show <commit>:<path>`; exact sizes/digests are in [1418](reviews/1418_orchestration-context-implementation.md). Authored reviews are unchanged; history is not a current queue.

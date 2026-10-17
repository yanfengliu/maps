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

Adopted `ce107fc619e93c85d98616ea0134abb387668df4`: Satellite asphalt light response and rounded paving joints. [1437](reviews/1437_shared-ground-material-implementation.md), independent [1438 PASS](reviews/1438_shared-ground-material-integrated-review.md). Added geometry/draws/textures/lights:zero; four extra road texture reads/fragment. Terrain, paint, support/contact and GTAO normals remain geometric. Isolated shader cost unmeasured; earlier window/frontage/light/tactile/corner work preserved. No final criterion closes.

PRIMARY five gates PASS: build/types, 132 files/1,172 tests in 75.20 s, audit (two existing moderate advisories), visual `4eb529d3e8b3e8d6`:44 frames/three lifecycles in 311.782 s, RTX 4090/616.64. Native review:10 stills/12 adjacent motion copies, 22 canonical Satellite/two returns. Four runtime files match; debug maps differ. Motion:180.7 ms first/last before-observations only, not continuous stability/population/FPS. Wrong seed excluded; default5970698 rerun/early whitespace PASS.

Main/origin-main read back exact; remote CI has zero checks/statuses/workflows, no remote pass claimed. Checkout/registration/metadata retired normally after preservation. Fresh closeout:81 owned identities absent; task markers/three ports/seven TEMP paths clear. Needed evidence/cache retained; historical trees and unrelated ancient tail untouched; original HOLD/reconciliation preserved.

Runtime cache: 156 files/364,187,965 B, SHA-256 `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`; older 157-file certificates do not transfer. Preserve user-owned `test/facade-emission.test.ts`, AGENTS.md and991 snapshot.

### Current operation and next outcomes

[1444 ACCEPT](reviews/1444_benchmark-clarification-review.md) remains prospective. Frontage1445: [selection](reviews/1445_three-front-source-selection.md), [P1 prototype](reviews/1445_three-front-prototype.md), [independent 1447 review](reviews/1447_three-front-prototype-appearance-review.md). P1 rejected: board omissions break facade continuity. P2 changes omissions to actual board footprints; sources/views/depth/materials stay fixed. Stop if it reads as applied lines. Final criteria OPEN.

Profile COMPLETE; worker CPU UNAVAILABLE; follow-up PARKED. Inputs unchanged/resources closed. `artifacts/orchestration-context-20261017/profile/profile-summary.json`.

| Next outcome | Owner/status | Dependency and done condition |
| --- | --- | --- |
| Three-front facade treatment | frontage1445 P2 DISPATCHED; root acceptance | Preserve failed P1. One finite-footprint correction, four matched native views, independent appearance verdict before gates. Restore coherent bays/reveals, not merely more lines. Disposal defect OPEN; no adoption. |
| Retained historical worktrees | Root; inventory COMPLETE/removal PARKED | 65 distinct/unclassified checkouts; preserve first, no safe batch; product takes priority. `artifacts/retained1421-inventory/summary.json`. |

No global blocker established. The table is the sole dispatch queue. Final acceptance needs matching evidence and independent integrated review on main; local milestones close no criterion.

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

Facades still need convincing depth/glazing, floor rhythm, de-light and variation across representative buildings. Every road remains in scope. The historical 32-object remainder is seven carriageways (five expressways), three intersections and 22 semantically unknown LOD1 objects, not 32 proven paint omissions. No published paint overlaps the 27 non-expressway objects; expressways need separate layer work. Source/layer/LOD binding, lane semantics and nine-stratum/held-out native coverage remain open. Distributed mounted dusk lighting needs source selection, supported occupancy, density/sightlines and a same-run refusal histogram. Wet/ground/tree/base contact and crossed-paint authenticity remain open. Unadopted 413/420 and rejected facade/tree/ground/lighting branches are parked; exact source exceptions remain in the historical progress record.

Default rail acceptance is narrow: exterior gaps/bearings/returns, actors under spans, temporal coverage and a recognizable supported train passage remain open. Vehicles need joined wheel/body contact, bus/portal/class coverage, spacing and visible governed signal behavior; the old fixture has no governed entry. One ordinary walker is accepted, not a full crowd. Supported full-source eligibility, animated soles, avoidance, no sliding/interpenetration and broader default flow remain open. The 150-pedestrian/20-vehicle seed 5970698, 600 s contract remains red/unqualified before untuned seed 42/native event evidence. Motion/contact experiments stay parked.

Continuous populated/camera/time stability remains unqualified by sparse stills. Historical ~12 fps and 59/200 vehicles are bounded failures, not current measurements or a reduced target. [398](reviews/398_gpu-delight-startup-comparison.md)'s startup gain is not population FPS; machine-cold startup, port-5319/loading/decoder causes and custom HTTP certification remain unknown/unestablished. Simulation research deferral does not delete A7–A10.

Private union 1324 remains UNMET. Its 387/63-part proof chain constrains that experiment, not every valid product construction. Preserve its evidence/obligations; do not resume it by default or transfer helper passes to main. No new launch/admission/report framework or weaker gate is authorized.

## Outcome

Active; full deliverable incomplete. The adoption/evidence and next-outcome sections above hold current status. Full-map, temporal and population/FPS acceptance remain open.

Exact old `plan.md` and `progress.md` remain in [Git at e483cd5](https://github.com/yanfengliu/maps/tree/e483cd5dfa58ee89876fba268c55c619daca9d5f/docs/work/0_shibuya-1km). Recover with `git show <commit>:<path>`; exact sizes/digests are in [1418](reviews/1418_orchestration-context-implementation.md). Authored reviews are unchanged; history is not a current queue.

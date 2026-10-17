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

Root owns priorities, contracts, this single current record, acceptance and integration. Delegate bounded diagnosis, implementation and local checks; workers own detail and return evidence/bounds/findings. Read this plan at turn start and before delegation. Keep at most three next outcomes and park dependencies separately. Land meaningful verified increments on main before expanding them. Apply the inherited two-failure reassessment before releasing another attempt.

### Current adoption and evidence

Adopted product revision `e483cd5dfa58ee89876fba268c55c619daca9d5f` adds five south/four east occupied glazed bays, continuous canopy, supported graded entrance and one dusk fixture, preserving the upper photograph. It follows road `49cfdb7` and verification fix `f5c8e95`. [1413](reviews/1413_direct-ground-construction.md) and independent [1417 PASS](reviews/1417_commercial-ground-combined-review.md) bind actual production geometry/source/lifetime checks and native appearance. Acceptance is bounded to this ground frontage.

All five integrated gates passed: build/types, 126 files/1,148 unit tests in 88.09 s, unchanged audit threshold (two moderate advisories), and run `9943546020d4f9ba`: 44 frames/three lifecycles, RTX 4090/driver 616.64. Review 1417 covers 22 Satellite originals, four Cartographic heroes and matched/exploratory comparisons. Occlusion/inside-building views limit claims. Saved cleanup closes 45 identities, 4319 and TEMP; no fresh census is claimed.

Runtime cache: 156 files/364,187,965 B, SHA-256 `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`; older 157-file certificates do not transfer. Preserve the user-owned primary `test/facade-emission.test.ts` edit.

### Current operation and next outcomes

This docs-only increment completes the context repair: `orchestration_context` implemented it; independent [1419](reviews/1419_orchestration-context-review.md) reconstructs the goal, scope, queue and open requirements. Root owns acceptance/integration; no product criterion closes.

Profile diagnostic COMPLETED (`integration1412_path`): unchanged test PASS 59.181 s (owned 60.290 s), but only Vitest parent frames were emitted: CPU attribution UNAVAILABLE. All seven input pins are unchanged; owned process/TEMP closed, CPU lease released. No second attempt. Worker-inspector follow-up is parked; no optimization/new launcher selected. Evidence is in primary `artifacts/orchestration-context-20261017/profile/profile-summary.json`.

| Next outcome | Owner/status | Dependency and done condition |
| --- | --- | --- |
| Select next visible milestone | Root accountable; critique QUEUED, no critic dispatched | After this context repair, use the ordinary default app through real controls, fixed and seeded noon/dusk views across the square. Done: fresh critique ranks recurring defects/surprises and root selects one bounded visual outcome and acceptance contract. No implementation is preselected. |
| Retire retained historical worktrees safely | Root accountable; QUEUED, no worker dispatched | Fresh preserve-first ownership/ignored-data/link checks before exact cleanup; retain needed history and rollback inputs. Done: authorized owned removals and remaining resources are explicit. Do not delay visual priority automatically. |

No global blocker is established. Next product decision: fresh critique selects the visual milestone. Full acceptance needs matching final evidence and independent integrated review on main; this docs repair closes no product criterion.

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

Active; full deliverable incomplete. Bounded frontage adopted; this docs-only increment delivers the reviewed context repair.

Exact old `plan.md` and `progress.md` remain in [Git at e483cd5](https://github.com/yanfengliu/maps/tree/e483cd5dfa58ee89876fba268c55c619daca9d5f/docs/work/0_shibuya-1km). Recover with `git show <commit>:<path>`; exact sizes/digests are in [1418](reviews/1418_orchestration-context-implementation.md). Authored reviews are unchanged; history is not a current queue.

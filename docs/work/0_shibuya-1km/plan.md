# 1km x 1km animated Shibuya model

Status: active
Owner: root orchestrator
Created: 2026-09-06
Updated: 2026-10-18

## Problem and outcome

Build the approved 1 km Shibuya square as a believable world with moving pedestrians and vehicles. Goal ACTIVE; Satellite quality is the priority. Full quality/population/performance OPEN.

## Scope

AOI: 35.6550–35.6640 N, 139.6950–139.7060 E; crossing origin: 35.6595 N, 139.7005 E. [AGENTS.md](../../../AGENTS.md), [local rules](../../policies/local-rules.md), [design](design.md) and the [network contract](../../reference/network-contract.md) retain world/source/gate contracts.

Non-goals: map viewer, navigation/routing, survey reconstruction, second location, new product surface or shipping target. Defer simulation research/Cartographic polish, not population/performance/two-style requirements. Styles share geometry/camera/simulation; retain basic real-input switching.

## Approach

Root owns priorities/contracts/status/integration; workers implement and check. Read before delegation; ≤3 outcomes and two-failure reassessment.

### Current adoption and evidence

Adopted executable `e1097edd4f0d65f41e6d6c157def4d51fa877318`: walking callbacks clone current motion without historical payloads; complete history/poses/ownership/rollback retained. Old control RED/restored GREEN; [1531 PASS](reviews/1531_walk-history-final-review.md).

PRIMARY five gates PASS in 719.898 s: 137 files/1,191 tests, 44 frames/3 GPU lifecycles, RTX 4090/616.64, run `7f403f3841a95a62`. Native inspection: 22 Satellite originals, basic style continuity and 7 Start/aged originals. [1530](reviews/1530_walk-history-main-native.md) measures 26.668 render iterations/s and 0.651566 simulation/wall; recovery and 60 fps are not established. CI unavailable: 0 checks/statuses/workflows/runs; `artifacts/walk-history1528/remote-gates.json`.

Runtime: 156 files/364,187,965 B, SHA-256 `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`; older 157-file certificates do not transfer. Preserve user-owned `facade-emission.test.ts`, `AGENTS.md` and the 991 snapshot.

Docs [1577](reviews/1577_documentation-cleanup-review.md) integrated; structure recovery remains OPEN.

### Next outcomes

| Next outcome | Owner/status | Dependency and done condition |
| --- | --- | --- |
| Native AA | 1609 prepared; baseline readiness GO; no lease | S0/S1 preserve detail ([1593](reviews/1593_implementation.md), [1596](reviews/1596_implementation.md)). [1598](reviews/1598_integration.md): held-out baseline first, candidate gated. A unadopted at `artifacts/taa1582a/worktree`. |
| Documentation recovery | Cleanup pushed; census1612 independently accepted | [1599](reviews/1599_integration.md): source/size PASS, protected991 refused; refresh before apply. [Fleet18](../../../../fleet/docs/work/18_maps-document-recovery/plan.md):188/189 tests; audits PASS. Collision/CLI/relocation approvals pending; no adoption. |
| Scene history | 1610: prepared; readiness GO; no lease | [1597](reviews/1597_integration.md): reuse1591 observer on real-controls app frames to distinguish previous-frame blending from current-only. Post flags/stills are insufficient. |

A6 OPEN; [1552](reviews/1552_moving-taa-search-contract.md) remains fixed. [1576](reviews/1576_moving-taa-native-pilot-review.md) rejects1560 for softening. Ordinary-scene contribution, perceived crawl, held-out, cost/five gates remain owed. Tighten two centre assertions before component-fixture reuse ([1591](reviews/1591_moving-aa-component-result-review.md)).

East peripheral journey and road-tone interpretation remain bounded and unaccepted; retain [1579](reviews/1579_peripheral-street-inspection.md) and [1581](reviews/1581_east-road-tone-diagnosis.md) for sampling gaps, failed capture and source limits.


Retain train `5af00f1` (four cars/current-pose AA/fractional DPR), lifetime `59fbb1c` and Coca-Cola1449/1450. Train-only ABBA about 60 Hz does not establish the full target.


## Acceptance criteria

A1/A4/A12 PASS for unchanged executable e1097edd, via [1539](reviews/1539_aoi-render-acceptance.md), [1542](reviews/1542_dusk-crossing-acceptance.md) and [1538](reviews/1538_attribution-completion-review.md). The other11 original criteria remain OPEN. A4 covers the static dusk crossing; revalidate changed dependencies before final acceptance.

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

Rejected1560 stays unmerged at `artifacts/taa1554/worktree`, branch `codex/moving-taa1554-local`, base `b0bc935`. [1570](reviews/1570_moving-taa-gpu-result-review.md) is component evidence only. Retain `artifacts/taa1554/round1560-freeze.json` and `artifacts/taa1558/prerequisite-copy.receipt.json`.

Parked sources: facade STOP 1445/1452/1455, confirmed 1456; 1454 TSUTAYA 128×512, other imagery UNKNOWN. Windows 1458 STOP/1461/1464 NO QUALIFIED SET; worktree retired; bounded, not impossible. Profile CPU unavailable; 65-worktree removal PARKED. [1472](reviews/1472_western-road-source-stop.md): 2019 GSI cannot resolve paint/curbs or ≥80 m; no prototype.

Traffic1499 PARK: [1527](reviews/1527_fixed-history-native-review.md); `artifacts/traffic1499/worktree`, `codex/traffic1499`, candidate `4aa2a023d`. Four arms, last four opaque; visible exit UNMET, no fifth. CPU 600 s: 20/24, bus refusals/queues. Gates NOT RUN; unmerged and UNADOPTED.

A2 OPEN: 1543/1544 uphill setup obscured road/bases; stopped before waiting, no retry. 1545 data468 source floor is 16.17–16.67 m above terrain; two leaves lack support; intent/native UNKNOWN, no safe edit. 1546: bounded source questions then ordinary journey, no expanded census.

Whole-AOI quality remains open across close/block/aerial views, peripheral blocks, noon/dusk and held-out seeded exploration. Retain seeds, actual poses, native-byte digests and sampling gaps. Inspect Satellite natively and basic style continuity. Flythrough/building clearance remains OPEN; 445 proves route coverage only.

Facades still need depth, glazing, floor rhythm, de-light and variation. Every road remains in scope. The 32-object remainder is 7 carriageways(5 expressways), 3 intersections and22 unknown LOD1; paint omissions are unproven. No published paint overlaps the 27 non-expressway objects. Source/layer/semantics, expressways, nine-stratum/held-out coverage and paint authenticity remain OPEN. Mounted dusk lights need supported occupancy, density/sightlines and same-run refusals. Wet/ground/tree/base contact remain OPEN; rejected413/420 and other facade/tree/ground/lighting branches stay parked.

Rail 1491/1493 accepts the four-car passage narrowly; gaps, bearings, returns and actors under spans remain OPEN. Vehicles need wheel/body contact, bus/portal/class coverage, spacing and visible governed behavior. One walker is accepted; full-source eligibility, animated soles, avoidance and no sliding/interpenetration remain OPEN. The 150 pedestrian/20 vehicle seed 5970698/600 s contract is red; untuned 42/native evidence remains owed. Motion/contact experiments stay parked.

Continuous populated/camera/time stability and target FPS remain unqualified. Historical 12 fps/59 of 200 are bounded failures, not current measurements. 398 startup gain does not establish population FPS. Machine-cold startup, port5319/loading/decoder/CPU causes remain unknown. Simulation deferral preserves A7–A10.

Private union1324 UNMET; its 387/63-part proof constrains that experiment only. Preserve evidence/obligations; no automatic resumption, helper-pass transfer, new framework or weaker gate.

## Outcome

Active; the full deliverable is incomplete.

Recover exact old `plan.md`/`progress.md` from [e483cd5](https://github.com/yanfengliu/maps/tree/e483cd5dfa58ee89876fba268c55c619daca9d5f/docs/work/0_shibuya-1km) with `git show <commit>:<path>`; [1418](reviews/1418_orchestration-context-implementation.md) records sizes/digests. Authored reviews retain history, not a current queue.
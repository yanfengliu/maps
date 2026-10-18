# 1km x 1km animated Shibuya model

Status: active
Owner: root orchestrator
Created: 2026-09-06
Updated: 2026-10-18

## Problem and outcome

Build a believable1km Shibuya world with moving pedestrians/vehicles. User resumed;tracker BLOCKED. Satellite priority;full quality/population/performance OPEN.

## Scope

AOI: 35.6550–35.6640 N, 139.6950–139.7060 E; crossing origin: 35.6595 N, 139.7005 E. [AGENTS.md](../../../AGENTS.md), [local rules](../../policies/local-rules.md), [design](design.md) and the [network contract](../../reference/network-contract.md) retain world/source/gate contracts.

Non-goals: map viewer, navigation/routing, survey reconstruction, second location, new product surface or shipping target. Defer simulation research/Cartographic polish, not population/performance/two-style requirements. Styles share geometry/camera/simulation; retain basic real-input switching.

## Approach

Root owns priorities/contracts/status/integration;workers implement/check.≤3 outcomes;reassess after two failures.

### Current adoption and evidence

Adopted source `e1de28244694e7ecedbd75ea045ff49e80026ca3`: fresh inputs/profile, historical/fresh fixtures, short-connector leader fix and14 raw byte rules. Roof80a2730/asphaltf4960e2 retained. Source1708/native1711 GO; artifacts/source1709-final/; [1624](reviews/1624_implementation.md), [1625](reviews/1625_integration.md).

PRIMARY5 gates PASS340.506s(wrapper374.879s):141files/1,231tests,44frames/3GPUlifecycles,RTX4090/616.64,runbfe2ff3fc92d452c;audit2moderate/nohigh. Root/independent22Satellite+2basic returns GO;occlusion/interiors do not prove A13. CI unavailable:0checks/statuses/workflows/runs. Population/60fps unestablished.

Runtime156files/364,250,437B, digest in [1632](reviews/1632_integration.md). A11 PASS: clean e1de282 regenerated89 servedfiles;67 externalassets unchanged;five hardware originals/root+independent GO. Four runtime buildfiles exact;two debugmaps CRLF-only. Source1709 gates used copied prerequisites. Retain facade-emission, literal AGENTS/seven LF files and991.

Fleet recovery stopped after5 attempts: missing-witness provenance, replay binding and old-test regression. Full gates/actual Maps census NOTRUN; no sixth repair. Evidence: artifacts/fleet1706/attempt5-handoff.md.

### Next outcomes

| Next outcome | Owner/status | Dependency and done condition |
| --- | --- | --- |
| Satellite frontage | 1727 mapping | One finite source-chart map with preserved photography and supported interfaces, or named STOP. No implementation. |
| Peripheral streets | 1728 ordinary journey | Real controls;≤6 native frames/90s camera journey. Inspect current road/base quality, select≤1 next question;cleanup owned resources. |

1719/1720 STOPs: [1639](reviews/1639_design.md).1723/1725:0assemblies;missing preservation/interfaces, not exact dates/dimensions. artifacts/session-handoff1702/successor-state.json;2/10;gallery260/private.

AA A PARKED/UNADOPTED: artifacts/taa1582a/worktree; [1603](reviews/1603_design.md): both routes BLOCKED/no oracle/capture. [1604](reviews/1604_integration.md):4 human-only clips;timed review DID_NOT_RUN/benefit NOT_ESTABLISHED.

Held-out96 originals PASS, right-facade visibility bound [1602](reviews/1602_implementation.md);candidate NOT_RUN. S0/S1: [1593](reviews/1593_implementation.md), [1596](reviews/1596_implementation.md).

A6 OPEN; [1552](reviews/1552_moving-taa-search-contract.md) fixed. [1576](reviews/1576_moving-taa-native-pilot-review.md):1560 softened. Ordinary contribution/crawl/held-out/cost/five gates owed. Tighten two centre assertions before fixture reuse ([1591](reviews/1591_moving-aa-component-result-review.md)).

Road finish accepted within [1623](reviews/1623_integration.md). [1579](reviews/1579_peripheral-street-inspection.md)/[1581](reviews/1581_east-road-tone-diagnosis.md) retain historical limits; full peripheral streets remain OPEN.


Retain train5af00f1(four cars/current-pose AA/fractional DPR),lifetime59fbb1c,Coca-Cola1449/1450. Train-only ABBA≈60Hz is not full-target evidence.


## Acceptance criteria

A1/A4/A12 bounded PASS: [1539](reviews/1539_aoi-render-acceptance.md), [1542](reviews/1542_dusk-crossing-acceptance.md), [1538](reviews/1538_attribution-completion-review.md); affected render/crossing/attribution rechecked on 80a2730 in [1625](reviews/1625_integration.md). A11 PASS: clean source/render comparison [1632](reviews/1632_integration.md). The other10 criteria remain OPEN; no motion/population/performance acceptance.

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

35 stable identities;never renumber.35 appended to Phase4. F=integrated foundation, final recheck owed;O=partial/open, including bounded acceptance. Neither is final acceptance.

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

Curb1635 PARK/UNADOPTED: [1615](reviews/1615_implementation.md), [1616 REDIRECT](reviews/1616_integration.md). Retain artifacts/curb1635/worktree, patch/freeze and active evidence. Three strict seam FAIL, stale Start and actual corridor-edge-paint startup refusal OPEN. Candidate0 pixels/benefit NOT_ESTABLISHED/no paired native review; five final gates NOT_RUN. No further repair/capture.

Rejected1560 stays unmerged at `artifacts/taa1554/worktree`, branch `codex/moving-taa1554-local`, base `b0bc935`. [1570](reviews/1570_moving-taa-gpu-result-review.md) is component evidence only. Retain `artifacts/taa1554/round1560-freeze.json` and `artifacts/taa1558/prerequisite-copy.receipt.json`.

Facade1445/1452/1455/1456 STOP; TSUTAYA1454 source128×512. Windows1458/1461/1464 NO SET, WT retired, bounded.1692 media-skin REJECTED:6 native views/no full-frame gain; no tuning. CPU profile unavailable;65-WT cleanup PARK. [1472](reviews/1472_western-road-source-stop.md):2019 GSI cannot resolve paint/curbs or≥80m; no prototype.

Traffic1499 PARK: [1527](reviews/1527_fixed-history-native-review.md); `artifacts/traffic1499/worktree`, `codex/traffic1499`, candidate `4aa2a023d`. Four arms, last four opaque; visible exit UNMET, no fifth. CPU 600 s: 20/24, bus refusals/queues. Gates NOT RUN; unmerged and UNADOPTED.

A2 OPEN:1543/1544 uphill setup hid road/bases; stopped before waiting, no retry.1545 data468 floor16.17–16.67m above terrain; two unsupported leaves, intent/native UNKNOWN, no safe edit.1546: bounded source questions then ordinary journey; no expanded census.

Whole-AOI close/block/aerial, peripheral, noon/dusk and held-out quality remain OPEN. Retain seeds/poses/native digests/sampling gaps; inspect Satellite and basic style continuity. Flythrough/building clearance OPEN;445 proves route coverage only.

Facades still need depth, glazing, floor rhythm, de-light and variation. Every road remains in scope. The 32-object remainder is 7 carriageways(5 expressways), 3 intersections and22 unknown LOD1; paint omissions are unproven. No published paint overlaps the 27 non-expressway objects. Source/layer/semantics, expressways, nine-stratum/held-out coverage and paint authenticity remain OPEN. Mounted dusk lights need supported occupancy, density/sightlines and same-run refusals. Wet/ground/tree/base contact remain OPEN; rejected413/420 and other facade/tree/ground/lighting branches stay parked.

Rail 1491/1493 accepts the four-car passage narrowly; gaps, bearings, returns and actors under spans remain OPEN. Vehicles need wheel/body contact, bus/portal/class coverage, spacing and visible governed behavior. One walker is accepted; full-source eligibility, animated soles, avoidance and no sliding/interpenetration remain OPEN. The 150 pedestrian/20 vehicle seed 5970698/600 s contract is red; untuned 42/native evidence remains owed. Motion/contact experiments stay parked.

Continuous populated/camera/time stability and target FPS unqualified. Historical12fps/59 of200 are bounded failures, not current;398 startup gain is not population FPS. Machine-cold startup/port5319/loading/decoder/CPU causes UNKNOWN. Simulation deferral preserves A7–A10.

Union1324 UNMET;387/63-part proof binds only that experiment. Retain evidence/obligations; no automatic resumption, helper-pass transfer, new framework or weaker gate.

## Outcome

Active; the full deliverable is incomplete.

Old plan/progress: `git show e483cd5dfa58ee89876fba268c55c619daca9d5f:<path>`;[1418](reviews/1418_orchestration-context-implementation.md) sizes/digests.

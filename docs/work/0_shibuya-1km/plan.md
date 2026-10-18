# 1km x 1km animated Shibuya model

Status: active
Owner: root orchestrator
Created: 2026-09-06
Updated: 2026-10-18

## Problem and outcome

Build a believable1km Shibuya world with moving pedestrians/vehicles. Satellite priority; four bounded acceptance criteria pass, ten remain open.

Owner resumed; tracker BLOCKED. Preserve its identity/usage; no reset.

## Scope

World, AOI, source and verification authorities: [AGENTS](../../../AGENTS.md), [local rules](../../policies/local-rules.md), [design](design.md), [network contract](../../reference/network-contract.md).

Non-goals: map viewer, routing, survey reconstruction, second location, new surface/shipping target. Defer simulation research and Cartographic polish; population/performance/two-style requirements remain. Styles share geometry/camera/simulation; retain real-control switching.

## Approach

Root owns priorities/contracts/status/integration; workers own bounded work. At most three next outcomes; reassess after two failures. Reuse verification; docs-only content/version checks.

### Adopted source and verification

Executable e1de28244694e7ecedbd75ea045ff49e80026ca3; newer checkpoints change documentation only. Accepted bounds: [1624](reviews/1624_implementation.md), [1625](reviews/1625_integration.md).

Five primary gates PASS340.506s; wrapper/cleanup374.879s:141 files/1,231 tests,44 frames/three GPU lifecycles,RTX4090/616.64,run bfe2ff3fc92d452c; audit two moderate/no high. Root/independent22 Satellite/two basic returns GO. CI unavailable: zero checks/statuses/workflows/runs. Population/60fps unmeasured.

A11 PASS ([1632](reviews/1632_integration.md)): clean e1de282 regenerated89 served files;67 external assets exact. Runtime156 files/364,250,437B; five originals/root+independent GO. Four build files exact; two debug maps CRLF-only. Source1709 gates used copied prerequisites.

Preserve facade-emission fixtures,991 evidence and inherited LF bytes in src/scene/{rail-trains,train-path,train-schedule}.ts and test/{app-running-trains,harness-bridge,local-walk-history,running-trains}.test.ts. Keep unrelated AGENTS text intact around the approved guidance correction.

Documentation and verification audit complete: [1645](reviews/1645_implementation.md), independent [1646](reviews/1646_integration.md) GO. Current guides consolidated; required code gates unchanged. Docs-only content/source/link checks passed; runtime gates not run. Historical evidence has165 unresolved relative destinations.

### Next outcomes

| Outcome | Owner and actual status | Done condition |
| --- | --- | --- |
| Peripheral paint question | Root; proposed, undispatched | Exact1728 corridor: supported published marking missing? Preserve source/support; STOP if unsupported. No implementation released. |

1727 STOP: incomplete source-chart/preservation/interfaces, not exact-date/survey barriers. 1728: four stills/45.164s, no new gain or motion acceptance. Both worktrees retired. [1642](reviews/1642_implementation.md), [1643](reviews/1643_implementation.md); audit [1644](reviews/1644_integration.md). No assembly released; prior limits remain.

### Open quality and parked dependencies

OPEN criteria require whole-AOI, noon/dusk, close/block/aerial and held-out review. Retain seeds/poses/native digests/gaps.445 proves route coverage only; stills do not prove motion/contact/population/FPS.

Facades need depth, glazing, rhythm, de-light and variation. Material/window/media routes remain stopped/rejected; no tuning revival ([1639](reviews/1639_design.md)). [1472](reviews/1472_western-road-source-stop.md) supports no paint/curb prototype. Rejected branches stay parked.

Every road remains in scope. The32-object remainder is seven carriageways(five expressways),three intersections and22 unknown LOD1. No published paint overlaps27 non-expressway objects; omissions are unproven. Source/layer/semantics, expressways, nine-stratum/held-out coverage and authenticity remain open. Lights need supported occupancy/density/sightlines/same-run refusals. Wet/ground/tree/base contact remains open.

Road finish passes within [1623](reviews/1623_integration.md). Curb1635 stays unadopted at artifacts/curb1635/worktree: seams/Start/paint-startup failures, zero pixels, no paired review or final gates. No further repair/capture ([1616](reviews/1616_integration.md)).

A6 OPEN. Preserve rejected1560 at artifacts/taa1554/worktree and AAA at artifacts/taa1582a/worktree. Benefit, contribution/crawl, held-out quality, cost/five gates remain owed ([1604](reviews/1604_integration.md)). Tighten two fixture centre assertions ([1591](reviews/1591_moving-aa-component-result-review.md)). Held-out96 originals pass narrowly; candidate not run ([1602](reviews/1602_implementation.md)). Component passes do not transfer.

Rail1491/1493 accepts four cars; gaps/bearings/returns/actors under spans remain open. Train-only near60Hz is not population evidence. Vehicle contact/bus/portal/class/spacing/governed behavior and walker eligibility/soles/avoidance/no sliding/interpenetration remain open. One walker passes.

Traffic1499 stays unadopted at artifacts/traffic1499/worktree: opaque exit, no fifth arm, bus refusals/queues, gates not run ([1527](reviews/1527_fixed-history-native-review.md)). The150-pedestrian/20-vehicle seed5970698/600s contract is red; untuned42/native evidence owed. Motion/contact stay parked.

A2 remains open: hidden road/bases and unsupported data468 floors; intent/native unknown, no safe edit. Only bounded source questions then ordinary journey ([1546](reviews/1546_visual-direction-review.md)); no expanded census.

Populated/camera/time stability and FPS are unqualified. Historical12fps/59 of200 and398 startup gain are not current population FPS. Cold-start/loading/decoder/CPU causes remain unknown; A7–A10 bind.

Union1324 remains unmet; its proof cannot transfer. No automatic resumption, new framework or weaker gate. Fleet stopped after five attempts: provenance, replay binding and old-test regression; full gates/actual Maps census not run, no sixth repair. Retain artifacts/fleet1706/attempt5-handoff.md. CPU profiling and inherited cleanup remain parked; preserve others' work.

## Acceptance criteria

A1/A4/A12 bounded PASS, rechecked on80a2730: [1625](reviews/1625_integration.md). A11 PASS: [1632](reviews/1632_integration.md). Ten OPEN; no motion/population/performance acceptance.

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

35 stable identities; never renumber.35 is Phase4. F = integrated foundation, final recheck owed; O = partial/open. Neither means final acceptance.

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

## Outcome

Active; incomplete. Reuse sealed images for updates. Identity/usage/resources/count4/10; gallery261: artifacts/session-handoff1702/successor-state.json. Older plan/progress: Git e483cd5; [1418](reviews/1418_orchestration-context-implementation.md).

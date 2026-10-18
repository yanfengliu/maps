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

Root owns priorities,contracts,status/integration;workers own implementation/checks. Read before delegation;≤3 outcomes,park dependencies,reassess two failures,land verified increments.

### Current adoption and evidence

Adopted `5af00f1c18a3fb306fa9fd70c705febc4f364b37`: authored four-car train passage and current-pose spatial antialiasing, including fractional-DPR sizing. [1491 PASS](reviews/1491_train-grid-integrated-review.md)/[1493 PASS](reviews/1493_cartographic-native-review.md). Lifetime59fbb1c and Coca-Cola1449/1450 gains remain.

PRIMARY five PASS429.011s:136files/1187tests,44frames/3hardware lifecycles,RTX4090/616.64;all46current originals reviewed. [1490](reviews/1490_train-grid-primary-gates.md),run cd4c31e67246bd8f. Remote CI UNAVAILABLE:zero checks/statuses/runs/workflows on5af00f1;artifacts/train1473/remote-gates.json.

Runtime cache:156files/364,187,965B, SHA-256 `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`; older157-file certificates do not transfer. Preserve user-owned facade-emission.test.ts, AGENTS.md and991 snapshot.

### Current operation and next outcomes

Facade STOPs1445/1452/1455 confirmed1456.1454:TSUTAYA128x512;other imagery UNKNOWN.

1457 limits remain;1458 window STOP/rejected1461;1464 NO QUALIFIED SET:bounded stops,not impossibility.1458 retired; artifacts/windows1458/closeout.json.

Profile COMPLETE/CPU UNAVAILABLE/follow-up PARKED. Historical65 worktrees:inventory COMPLETE/removal PARKED;preserve first.

1466 boot≠population acceptance;1467 HOLD/world cause UNKNOWN.1469/1470:no gross Near rotation;failed selector arm preserved,source/assets/dist unchanged,cleanup closed.

[1472 STOP](reviews/1472_western-road-source-stop.md)/reference1472:NO QUALIFIED PAINT SET;2019 GSI cannot distinguish paint/curbs or≥80m. Intent UNKNOWN,not absent;no prototype/edit/worktree/capture/gates.

| Next outcome | Owner/status | Dependency and done condition |
| --- | --- | --- |
| Walking fix to main | 1528/1529PASS;3gatesPASS;1530RUNNING | Three-file port;real Start/aged native,all five gates,integrated review,merge/push/retire. Traffic parked. |

Traffic1499 PARK: [1527](reviews/1527_fixed-history-native-review.md);artifacts/traffic1499/worktree,codex/traffic1499,base0681715/candidate4aa2a023d. Four arms:18/0/6/16frames;last4opaque,visible exit UNMET;no fifth. Candidate3 CPU600 bounds20/24,bus refusals/queues. Traffic gates NOT RUN;unmerged/UNADOPTED. PRIMARY walking port only.

Train cleanup COMPLETE:direct “Approve retirement”→normal WT/branch removal on9c7822e. WT absent/unregistered,codex/train1473 deleted;reports/traffic1499 preserved.1495 retains denial/preflight/receipt.

Gallery COMPLETE/heartbeat ACTIVE:201images/180,657,714B;198 app/diagnostic+3references,46accepted/40candidate/8pace.Prior191 immutable;ignored,Never Git;15min support.

One429.011s bundle;FXAA/SMAA targeted110.56/132.784s. ABBA train-only~60Hz;GPU headroom/population OPEN;multi-day elapsed unmeasured.

[1497 adopted](reviews/1497_orchestration-critical-path-review.md):cleanup independent;helper debt only for material production blockers. Future review keeps automated44,native Satellite,basic style-switch/shared regressions;detailed Cartographic deferred,gates unchanged. Road/head/central STOPs preserved;generic crowd/head/anatomy/motion research PARKED;no head/baker fix. Sole queue;full35/14 OPEN,matching evidence/independent integrated main review required.

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

Rail1491/1493 accepts the four-car passage narrowly; exterior gaps/bearings/returns, actors under spans and broad temporal coverage remain open. Vehicles need joined wheel/body contact, bus/portal/class coverage, spacing and visible governed signal behavior; the old fixture has no governed entry. One ordinary walker is accepted, not a full crowd. Supported full-source eligibility, animated soles, avoidance, no sliding/interpenetration and broader default flow remain open. The 150-pedestrian/20-vehicle seed 5970698, 600 s contract remains red/unqualified before untuned seed 42/native event evidence. Motion/contact experiments stay parked.

Continuous populated/camera/time stability remains unqualified by sparse stills. Historical ~12 fps and 59/200 vehicles are bounded failures, not current measurements or a reduced target. [398](reviews/398_gpu-delight-startup-comparison.md)'s startup gain is not population FPS; machine-cold startup, port-5319/loading/decoder causes and custom HTTP certification remain unknown/unestablished. Simulation research deferral does not delete A7–A10.

Private union 1324 remains UNMET. Its 387/63-part proof chain constrains that experiment, not every valid product construction. Preserve its evidence/obligations; do not resume it by default or transfer helper passes to main. No new launch/admission/report framework or weaker gate is authorized.

## Outcome

Active; full deliverable incomplete. The adoption/evidence and next-outcome sections above hold current status. Full-map, temporal and population/FPS acceptance remain open.

Exact old `plan.md` and `progress.md` remain in [Git at e483cd5](https://github.com/yanfengliu/maps/tree/e483cd5dfa58ee89876fba268c55c619daca9d5f/docs/work/0_shibuya-1km). Recover with `git show <commit>:<path>`; exact sizes/digests are in [1418](reviews/1418_orchestration-context-implementation.md). Authored reviews are unchanged; history is not a current queue.

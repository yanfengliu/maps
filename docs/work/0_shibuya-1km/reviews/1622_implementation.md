# Review 1622: implementation

## Target

2026-10-18. Road wearing-course proposal and fresh-source decision at main 1f2377a289537b348e227e94851eff440666687d. Road scope is src/scene/surface-materials.ts, src/scene/surface-structure.ts, test/surface-relief.test.ts and test/surface-structure.test.ts; retained patch SHA-256 97cb5ef8be991c82df3e6c4b83d51cc50c85ee52ac3191bd2c8d2a08deb10fda. The road change was subsequently accepted as f4960e2bf95b7813443b803eb15876215785ef59; the separate source trial remains unadopted.

## Reviewers and coverage

1669 independently inspected three native default Satellite dusk views and the production material path, then authorized one prototype. 1672 independently inspected the fresh raw OSM and generated one unvalidated graph through unchanged production code to identify source-admission blockers. Their separately attributed reports follow verbatim. This documentation author read reports and receipts; it ran no producer or native visual review.

## Reports

### 1669 independent reviewer

Original: artifacts/quality1669/report.md; 5917 B; SHA-256 3f4747239b6e3ac5410efa47c9c9444517f6594344a721e14d361e9f26945444. Exact authored bytes, including original line endings, follow.

````markdown
# 1669 — road surface product decision

2026-10-18. Independent read-only review of main 1f2377a289537b348e227e94851eff440666687d and the three new scene1667 originals. Decision: GO FOR ONE PROTOTYPE of a coherent asphalt wearing course. This is an appearance improvement within approved realism, not a claim that existing source, shadowing or road topology is broken.

## Observed basis

Opened exactly 01-crossing-southeast, 02-station-east-approach and 03-east-peripheral at original 1280x720 resolution; their independently recomputed SHA-256 values match result-receipt.json. This is default Satellite dusk, Start unpressed, real-control static views. No A6, population, contact, continuous-travel or FPS claim follows.

01 retains a recognisable crossing, photographic buildings, luminous frontage and supported paint. Its broad asphalt is a useful regression. In 02, the exposed road behind the crossing has conspicuous separate dark quadrilaterals at unrelated angles, while the surrounding wearing surface reads largely uniform at this distance. In 03, several similarly abrupt patches step down the central corridor; the large foreground slab dominates the road's texture hierarchy. These two ordinary block views make the authored rectangles a recurring visual motif rather than a convincing subordinate consequence of resurfacing. The new material should improve the whole road visible between buildings, not a selected patch crop.

1581 correctly explains ONE previous wedge as an authored panel and excludes selected alternative mechanisms at its two ray pairs. Its last paragraph explicitly leaves broader appearance acceptance open. Explaining intention does not satisfy that acceptance; no second production-bug diagnosis or new survey reference is needed to author a better disclosed material. A5 still requires authentic markings and cannot be closed by this work.

## Cause, scope and mechanism

The current production path is createRoads -> createSurfaceMaterial("road") -> patched MeshStandardMaterial. surface-structure.ts places a randomly turned rectangle in each selected 24m cell, 4-10m by 6-16m before rotation, with independent presence/location/turn. surface-materials.ts subtracts 0.18 panel coverage and 0.15 seam coverage from regional albedo and adds 0.07 panel coverage to roughness. Aggregate normal relief already exists; merely adding it again is not an increment.

Replace the ROAD use of these isolated stamps with a continuous, metre-scaled wearing-course material: broad connected asphalt-age regions and restrained irregular repair transitions, with the SAME material-state field changing aggregate scale/height and roughness together. Preserve fine aggregate, but make older/coarser and newer/denser material respond differently to grazing light and wetness. Transition edges should have bounded microrelief and footprint filtering, not dark drawn outlines. The organisation and coupled light response are the proposed improvement; reducing contrast, moving rectangles, adding random noise or changing tint alone fails. These are authored finishes, never surveyed repair locations. Do not invent cracks, lanes or drainage features presented as mapped facts.

Keep the change in road material/structure code and focused existing tests. Leave pavement/ground treatment, all physical positions/normals/indices, source paint and its support, graph, source photographs, texture caps, actors, lights, exposure and post-processing unchanged. Do not restart curb1635, AA, traffic, middle paint or facade-source routes. A road-only helper/branch avoids altering shared sidewalk panels. No new dependency, producer, runtime framework or general proof layer is needed.

## Done conditions and checks

Freeze the current source/build/runtime inputs and these three real-control recipes before implementation. Make ONE coherent prototype. At native size, paired baseline/candidate 02 and 03 must show continuous asphalt with subordinate repair structure and visible material response; 01 must retain the crossing's readability, paint, contrast hierarchy and dusk identity. Improvement must survive full framing, alternative azimuth and close/block/aerial scales. If only a crop, tint or quieter stamp benefits, reject the prototype.

Use existing shader/material tests to exercise actual createSurfaceMaterial/onBeforeCompile, anchor refusal, cache key, uniform binding, style return and disposal. Extend surface-structure/surface-relief cases with independently specified samples for finite relief/roughness and transition continuity/filtering; retain the old stamp as a negative for the intended structural discriminator. CPU checks cannot certify pixels. Confirm the road material installed by createRoads uses that changed path and that road/pavement/marking buffers and input digests remain identical. Reuse paint-support and road-tone checks as regression bounds, without treating either as paint authenticity or visual acceptance.

Capture unchanged real-control poses for both dusk and noon, the crossing/approach regressions, close and aerial context, and recorded held-out seeded poses; inspect originals independently. A short real-input traverse must check newly introduced edge/aggregate shimmer while retaining A6 OPEN. Run all five code gates on the integrated revision and independent native/source review. Preserve the 35 implementation identities and 14 criteria. This prototype can advance item18; it cannot close full-AOI quality or unrelated criteria.

## Bounds

This review ran no browser, server, GPU, build, tests or data regeneration. Existing tree changes were observed and left untouched. Git required a command-local safe.directory exception for read-only revision/status; no config was written. Report/receipt are the only task outputs. Approval is for a bounded prototype, not adoption: the proposed material's actual visible benefit remains unmeasured.
````

### 1672 independent reviewer

Original: artifacts/source1672/report.md; 4557 B; SHA-256 26a11dfafffe20cf6c47ce36a291b41915d03eba2caa2683265b0f5e5d0f7f5c. Exact authored bytes, including original line endings, follow.

````markdown
# 1672 independent source review — HOLD

2026-10-18. Bound: next SOURCE-ADMISSION EXPERIMENT only. This does not reject fresh OSM permanently or authorize cache adoption/A11 acceptance. Read-only review of main 1f2377a and the unchanged 832b87c worktree; writes only ignored artifacts/source1672. No source fetch, guard/pin/code/Git/cache mutation, browser/GPU or full gates.

Instrument: current tools/network/build.ts dataflow, importing unchanged generateNetwork, surfaceSampler/decodeMesh and validators against the actual retained raw/terrain/roads. One CPU generation retained UNVALIDATED-generated-graph.json, never data/network/. Selected production files match primary after CRLF normalization. Generic validateNetwork PASS; original validateShibuyaNetwork refusal retained unchanged. Compound clearance and later producer checks DID_NOT_RUN.

Actual failing operands: generated signal controls 78; diagnostics.surfaceSignalNodes 78; generated stops 42. The signal equality and required78 both pass; required41 stops fails. Raw independently counted79 signals/43 stops, eligible78/42. All119 accepted control IDs and complete tags remain; 117 XZ pairs unchanged. Signals 252683741 (35.663523,139.7021063) and 3790205548 (35.6635202,139.7022035) moved 10.177494/10.185144m. No Y equivalence claim.

Material blocker: extra stop 728435717 (35.6577348,139.7030056; direction=forward) is FIRST node of outgoing one-way surface 58777418 and LAST node of incoming one-way bridge 58777433, excluded by bridge/layer 1. The generated control has approachEdgeIds=[] and entryEdgeIds=[], travelDirection=null. It is the sole empty-applicability control. The NEXT unchanged Shibuya predicate therefore also fails. A 41→42 update cannot honestly admit this graph. Never delete/reclassify it or attach it to outgoing lanes solely to pass. Raw signal 5091218458 belongs to walking/access=no sources; stop 13782042807 belongs to highway=pedestrian; neither is eligible/generated.

Eight fresh eligible IDs follow accepted road corridors: 1559831020→58982800;1559832411→60901091;1560851970→48391489;1560867937→731814367;1561126436/1561126437→202129903;1565715641→759282884;1569388267→534157302. Two-metre XZ sampling gives maximum new-path distance to accepted lane centrelines 0–2.455m. These support split/replacement classification, not new physical roads. Lane definitions also change: 1565715641 has 2 forward lanes versus accepted759282884's3;1569388267 has 3 versus534157302's1. Other six retain the compared lane count/direction/3m lane widths. The three changed signal-way memberships follow these replacements.

Missing 731814367 is represented by 1560867937 within 2.162m. Missing 1391515608/1391515609 are distinct short stubs near X[-48,-30],Z[-227,-209], with sampled distances to nearest fresh drivable paths reaching 11.480/12.273m: not demonstrated splits/merges. Missing walking 158849639 follows 335295153 within 1.255m;1085257226 differs from the complete eligible walking-path union by up to 8.867m. These are changed mapped geometry, not proof real roads/paths vanished. Original raw OSM is absent, so historical editing intent and complete old-raw tag comparison remain UNKNOWN.

Next guard: root selects a bounded source-applicability decision for the bridge-to-surface control and explicit review of lane-definition/stub/walk changes before any source-admission implementation. Preserve old-source coverage and current refusal. Any later admission must bind exact reviewed source identity and independently enumerated control coverage, with negatives for removed/retyped/moved controls, false approach ownership and unknown source hashes. Counts alone are insufficient.

Coupling remains: hero paint requires matching OSM/network identity; all 5 hero tags independently match accepted records. Decorations bind their separate raw/terrain/road/pavement provenance. Hardware binds final network/roads/pavements/vehicles; walker/external rail packets retain independent pins. None inherits acceptance. Future adoption still needs new coupled outputs, review, five gates and native render comparison. A11 OPEN.

Evidence: diagnostic.json; raw-controls.json; geometry.json; focused-missing-ways.json; walk-union-and-layouts.json; UNVALIDATED-generated-graph.json; protected-before/after.json; process-final.json. Full raw IDs, coordinates, tags and per-sample witnesses are retained. All 17 protected primary pins unchanged; accepted network unchanged. No owned process survives. Retain this evidence for the active handoff.

````

## Findings and disposition

Root accepted 1669's material direction: replace independent rotated asphalt stamps with continuous material state coupling grain, shading relief and roughness. The road-only patch preserves geometry, paint, shared ground/pavement, photographs, actors and lighting. Root and 1673 inspected the paired full native views and context; [1623](1623_integration.md) retains the initial and final acceptance reviews. Item 18 advances within this bound; full-AOI quality and A5/A6/full A13 stay OPEN.

Root retains 1672's HOLD. Fetch 1670 exited 0 in 65.134 s with OSM timestamp 2026-10-18T13:27:51Z and SHA-256 162fbdec3baa5ed5c07eed33fa8ae20568dbd74d8f1f36a3490dccfbbd2d32b0. Network 1670 exited 1 in 2.653 s before writing a candidate. 1672's diagnostic proves the added stop has no admitted incoming surface approach; merely changing 41 to 42 would encounter the next unchanged guard. Lane definitions, short road stubs and a walking gap also need decisions. No raw-source/cache/guard/pin adoption follows, and A11 stays OPEN.

The separate 1668 hardware output is byte-identical to accepted primary: 119 records, 24 placed/95 unplaced. It used generated 1663 roads/pavements with accepted network/vehicles as declared inputs. Its wrapper lost the exit status after disposing a process handle; status remains UNKNOWN despite output readback. This is a bounded hardware reproduction. Hero imagery sidecar text is provenance only; the paint producer still directly requires matching raw OSM/network identity and five reviewed tag records.

## Verification

Retained 1671 checks report 49 focused cases PASS, 33 affected cases PASS after actual old-production RED/restored-candidate GREEN, and final types/build PASS. The two controls-driven hardware captures exited 0 in 71.043 s and 65.444 s; all 12 candidate and 4 context originals plus 3 baselines received independent native inspection. Actual close clearance is 3.195 m; true randomized context uses createRng(2718). The first aerial seed label is explicitly corrected as an authored angle, and six traverse samples have 215.7–234.7 ms gaps. These are finite source/still checks, not continuous shimmer/contact/population/FPS evidence.

Documentation checks bind all four authored report bodies, 17 protected primary pins, exact changed scope, six wrapper sections, local links and CRLF-aware whitespace. The root-authored plan is copied literally at its final-source pin; this worker does not revise its content. Runtime tests, five gates, browser and CI are NOT_RUN by this documentation worker. Historical full-structure RED af440365 is NOT_RERUN/NOT_WAIVED; collision/private-CLI/protected 991 boundaries remain pending.

## Round outcome

The road change is accepted and pushed on main as f4960e2bf95b7813443b803eb15876215785ef59, with all five local gates and independent integrated source/native review complete. [1623](1623_integration.md) records final evidence and limitations. Source succession remains HOLD at the applicability/lane/stub/walk decisions. Only A1/A4/A12 retain bounded PASS; the other eleven criteria stay OPEN.

# Review 129 — independent kept-floor rail profile review

**Verdict: accept the continuous authored profile and kept-floor support strategy as the resolution of RD1 and RD2 at design level, with the two bounded corrections below before the opening geometry is frozen.** The profile is geometrically coherent without lowering terrain, roads, pavements or actor-contact surfaces. Its roughly 3 m extra retaining height is a real and disclosed visual compromise, suitable for a constrained implementation and appearance trial. This is not appearance acceptance, generated-structure acceptance or full moving-body clearance. RD3's south station shells remain open under their separate design assignment.

Review target: `artifacts/rail-profile-design-20260927/REPORT.md`, SHA-256 `314db9cfefa9902fba2b0c9d1ef7cd0459fe74e97237e6ccc94faef1cf844256`; receipt SHA-256 `95c965bf252371eb84733505bad5dbd95751cbb6f32111caf154218806bb0de1`. Primary HEAD was `e03f17da538f6fdd1b52326a9fe83f908c9a3a67`. The cached scene geometry remains the review's exact input, with the product geometry scope inherited from `13ef7e83c56202a17aa56975ef5786825bfcff2f`. This is the independent Codex Astra/xhigh lane, not a new multi-CLI consensus. Review 124 and its counterevidence are unchanged.

## Independent measurements

The new `check.mjs` verifies all 35 receipt files and all 19 summary input pins. It independently reconstructs the four full mitred footprints from source chains and the declared widths/stations, and independently implements convex clipping and polygon subtraction. It does not import the designer's `kept-floor-check.mjs`, its footprint array, or its planar-clipping module. Canonical projection and the repository mesh decoder remain shared contracts. Every projected source coordinate was checked against the historical extract, and every consecutive chain point pair corresponds to an actual source-way node pair; no synthetic connecting segment was admitted.

The independent reconstruction contains 2,365 cells and 7,871.135669 m² across the four strips. Its areas agree with the designer to about 4e-11 m² per strip. Independent subtraction leaves at most 1.39e-10 m² per strip, numerical residue rather than a visible coverage hole. This is a different floating-point residual from the designer's 5.1e-13 m², not evidence of a physical gap. It supports complete terrain coverage at the bound of the double-precision geometry check; it does not substitute for generating closed support walls.

| Crossing | Minimum road-to-deck underside clearance | Minimum pavement-to-deck underside clearance |
|---|---:|---:|
| North | 4.107283 m | 3.071457 m |
| Middle | 4.956922 m | 2.686329 m |
| Pedestrian passage | 2.654780 m | No footprint intersection |
| South | 5.422996 m | 5.342996 m |

These values independently reproduce the report, including its 0.40 m deck thickness and 0.0205 m combined allowance. No intersecting road or pavement portion was found outside those four crossing groups. The independent minimum bed-to-terrain gap is 1.033298 m; the maximum is 8.259650 m, in a bridge region where the design requires an open span. The analytic profile has maximum grade 0.029049296. Its independently re-derived chord bound is 0.000373266 m and normal-section station-height bound is 0.015968719 m, both within the declared 0.0005 m and 0.020 m allowances.

RD1 is therefore resolved by changing the vertical rule: both rails and the sleeper section share a smooth authored profile instead of following the severe outer-terrain slopes. RD2 is resolved at design level by keeping the original floor and spanning its full intersection. The report correctly classifies the source path as a pedestrian tunnel without claiming its draped Y is the real tunnel elevation. Its unknown original CityGML parent ID does not invalidate the exact cached triangle identity or require a source archive fetch for this scenery decision.

## Required corrections

### RP1 — Medium: fix the inventory prefilter before using it to freeze openings

`artifacts/rail-profile-design-20260927/network-check.mjs:1` rejects potential pairs using each rail cell's centre-station Z interval rather than the actual mitred footprint bounds. A rail cell extends beyond that interval in Z, so the filter discards real positive-area intersections even within the diagnostic's stated width/2 + 0.5 m envelope.

The independent polygon-bounds check finds 35 discarded segment/cell intersection fragments across nine graph edges; this is a count of raw intersection fragments, not 35 distinct blocked routes. The largest fragment is 0.078713 m². One concrete extent error affects both directions of `walk:355253412:0:0:ground0`: the source inventory ends at Z -1.0994410995, while the full strip intersection reaches **Z -1.0790923270**, 20.348772 mm farther. The east-outer rail cell at stations -1 to 0 intersects walk segment 23 at the polygon retained in `evidence.json.prefilterMisses`; the old prefilter rejects it.

Use actual polygon AABBs, including miter extent, for candidate rejection and retain the full intersected polygons when deriving the protected opening. Add the witnessed cell/edge pair as a diagnostic control. Do not freeze an abutment at an inventory extent or use this list as a swept-body envelope. The same **12 walk and 8 lane IDs** remain implicated and all fragments remain in the established crossing groups, so this correction does not overturn the profile or demand another crossing design. The report's higher-level requirement at `REPORT.md:37` to clear the actual union is the right contract and should govern implementation.

### RP2 — Low: narrow the bus-clearance sentence to the relevant crossings

`artifacts/rail-profile-design-20260927/REPORT.md:66` says the road clearances exceed the upright actor values. Its table includes the pedestrian passage's **2.654780 m**, which is below the bus's **3.330137 m** bound. Replace the blanket sentence with the precise claim: the three rail-bridge road clearances exceed the upright bus bound; the pedestrian passage's kept surface has 2.654780 m and is not admitted as a bus route.

The vehicle upper bounds were independently reconstructed from manifest dimensions and the cap at `src/agents/population/routes.ts:716-727`: kei 1.981200 m, taxi 1.955200 m, bus 3.330137 m. The three human manifests independently give maximum upper Y 1.833427 m and 1.980102 m at configured scale 1.08. Their exact hashes are recorded in this review's evidence; the original design summary did not pin those human manifests. The tunnel source way is absent from the cached walking graph, while both approaches remain. These facts support the restricted claims, not a new route or a general passage-height standard.

## Accepted contract and remaining verification

The extra-height design is smaller in dependency scope than the low-floor alternative: it preserves the existing contact surfaces and graph and adds a separately authored static structure. A lower floor would require local cuts, portal transitions and fresh contact evidence. There is no reason to make that larger dependency mandatory while the accepted reconstruction permits authored elevation. The existing source geometry supplies horizontal continuity, not surveyed deck Y or an engineering design.

Accept the declared common profile, 3.4 m complete footprint, 3.0 m ballast top, source alignment, canonical north cut, closed terrain-following lower boundary, and open spans expanded beyond source bridge nodes to clear the actual kept surfaces and actor envelopes. Source joins are support transitions rather than endpoints. Keep the original ground visible between strips and avoid additional filled land, arbitrary support piers, new routes or terrain edits. This is enough to constrain implementation; a generalized bridge or rail simulation framework is unnecessary.

The visual risk remains substantial: four long raised structures may read as an overbuilt viaduct or four narrow plinths, especially in Cartographic. The report acknowledges the added height rather than disguising it as texture work. Require the planned native oblique views and motion at the RD1 sections and crossings before accepting that tradeoff in the product. If those views fail, revise the authored structure; do not claim that these geometry checks prove the requested visual quality.

The graph rectangle inventory, including this review's corrected version, is not a moving-body proof. `src/agents/render/pose.ts:11-28` applies the interpolated support-normal basis, so upright height alone cannot bound a pitched or rolled bus. The generated deck, walls, abutments and any piers must be tested against actual rendered body envelopes, lateral offsets, yaw transitions, end caps and existing support poses. This is an implementation acceptance obligation already present in the design, not a demand for a completed implementation before design review. Do not silently turn a later geometry failure into actor suppression or contact-surface mutation.

This review did not independently decode the 13 building tiles or approve the station modifications. The retained closed-shell intersections and southern endpoint decision remain RD3, not a hidden condition on the accepted RD1/RD2 profile. North termination at the canonical AOI cut is a coherent model boundary. No final rail scene or new visual evidence exists in this lane.

## Evidence and cleanup

`artifacts/rail-profile-review-20260927/evidence.json` contains every independent result, source/support pins, actor-manifest hashes and missed-prefilter polygons. SHA-256: `ff3b7ad4664a24101438351ba3f3c4457e63682a23b23e059c97bb80cc30fdb4`. The independently authored probe is `check.mjs`, SHA-256 `a88b9d41ac3f12614a16115f9ce4cd6a10dc5fc4d80889d30874637c177dba80`; its successful run took about 1.4 seconds on Node 24.12.0. The small raw stdout is retained for the active correction handoff.

Only this ignored review directory was written. No product/data file, source cache, network input or previous review was edited. No network request, browser, GPU, server, build or full gate ran. There are no task-owned browser/GUI/server processes to close. Root owns promotion of this authored report as Review 129 and disposition of RP1/RP2; retain the raw evidence while either finding or its handoff needs it.

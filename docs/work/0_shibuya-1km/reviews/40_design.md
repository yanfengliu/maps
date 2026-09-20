# Review 40: design

## Target

Continuous pedestrian placement proposal and revised prototype result, reviewed independently by Codex `walking_contract_review` on 2026-09-19. Production reference: maps `27c71865bef31a7c9dcc622db16e6721be839dc3`. Prototype base: `244632ca8d88dc464a162fad3782baa91f59f136`, with no production edits. Root owns disposition and integration; another worker owns terminal clearance.

The exact authored targets are preserved byte-for-byte in [40_walking-prototype-result.md](../snapshots/40_walking-prototype-result.md), SHA-256 `a0bcc7e14b43a5560d771dbaf909f4998ec84011dab98f66b4a04e85edce76fc`, and [40_walking-design.md](../snapshots/40_walking-design.md), SHA-256 `89e7067890fbe8637a0e65c4405a21736641af9187927a30fc2e2a0c7e1a3716`. The revised result supersedes the proposal's roads/pavements-only interface and provisional square/50 mm predicate; both remain recoverable.

Raw target directory: `artifacts/route-continuity/artifacts/route-evidence/`. `freeze.json` binds fifteen retained inputs. Principal additional digests: `path-prototype.ts` `c5ab38d29129ef98924352bb72d2731e29e64b55c62e3d35b3ab1f93420dea40`; `census.json` `11288c1b5cccf34a08116ff50fe73e5d95a56e0a91f8c32d078dd87c57fe8f79`; `verified-surfaces.json` `60eebe216f34b96222561182eb4a05e6698d2966dce7dc201846bd3881e3504b`; `geometry-audit.json` `7dbee89be3b9970d5e1b2d0d7a437dc129e375aff92ee58768d231942ee6bebf`.

## Reviewers and coverage

Codex `walking_contract_review` read the instructions, local rules, lessons, network contract, relevant asset contract, source generator/filter, sampler, population placement/integration, renderer phase/basis wiring, frozen prototype and its instruments. The independent scratch checks ran in a detached worktree at the production reference. They read the primary's data by absolute path; no junction, install, production edit, data writer, browser, GPU task, server, 3,000-agent run or product gate was used.

The first probe names `tools/agents/crowd-occupancy.ts` and `tools/agents/population-run.ts`. Those instruments exercise the shipped fixed-step path but do not expose triangle membership or one-sided offset limits. The added probe therefore checks the frozen route/mesh inputs directly. This is a design and finite evidence review, not natural-motion or whole-city acceptance.

## Reports

### Codex walking_contract_review

**Accept the physical-distance/source-station separation for the next bounded implementation. Reject production acceptance of the present cubic/support predicate.** Its failures do not establish that the graph is unwalkable. The revised report mostly states its limits correctly. The smallest next contract needs local surface ownership, supported Y before arc measurement, all internal joins, and an explicit locomotion boundary for pivots.

#### W0 — The distance repair is sound within its finite claim

All fifteen frozen files match. Current `sampleRoute` reproduces the three one-sided gaps exactly: 1.5292786953, 1.0140494377 and 0.5049095435 m. The preserved slot-95 movement is 1.5208849173 m for 0.0195569369 source metres. This is an offset/heading discontinuity independent of avoidance.

The prototype's sequential clipping oracle independently recomputes segment distances rather than trusting stored cumulative distances. Its 15,000 checks are 100 sampled budgets on each of 150 initial routes, not exhaustive trajectories. I inspected that oracle and independently recomputed the continuous wrong-distance counterexample: 0.1227581301 physical metres for 0.0179764141 source metres, factor 6.8288441294. Smoothing without physical reparameterization is insufficient. I did not rerun the full route census or treat its finite checks as support, heading, animation or runtime acceptance.

#### W1 — Use the existing foot bounds correctly

`tools/agents/verify.ts:90–126` evaluates selected-scene, triangle-referenced VAT vertices. At scale 1, for each planted half-cycle it requires the absolute minimum Y of that foot's selected sole vertices to be below 15 mm, and every selected sole vertex's world drift after prescribed straight travel to stay below 5 mm. These are actual retained asset bounds. They are not a requirement that all four corners of a collision square hit a surface. They also are not evidence that every sole vertex meets a 15 mm height bound, or that the production shader passes on slopes and turns.

The vehicle ±50 mm value bounds model-space suspension travel. It has no walking authority. Neither that number, hardware's 0.75 m search range, a five-degree polyline subdivision angle nor `max(0.5 m, 2 * radius)` is an accepted walking contact/turn constraint. Keep collision support and sole support as separate predicates.

For the next world-contact check, transform actual drawable sole samples through the actual scale and support basis and measure their residual against the selected local surface. Keep 15 mm contact and 5 mm planted drift as the proposed world-space acceptance targets, explicitly extending the asset check to this new domain rather than claiming that extension already passed. The known 32-frame asset evidence does not cover fractional phases, stopping, turns or other scales. Do not gate a route solely on old source-Y residual or require a new survey-grade reconstruction.

#### W2 — Source height selects a neighborhood, not final foot Y or highest geometry

The graph recipe at `tools/network/generate.ts:45–50` is `max(terrain + 0.22, eligibleRoad + 0.025)`, with road eligibility `road < terrain + 2`. `tools/network/build.ts` supplies its highest-road sampler. `surfaceExclusion` excludes indoor, tunnel, bridge and nonzero layer/level ways before adjacency. `groundN` is only a drapable-piece index. The graph's fixed Y contains presentation padding and must not be copied into physical sole contact.

Every triangle ID, height and nearest-edge distance in all fifteen retained cases matches an independent full scan: 45 mesh/case comparisons. The authored diagonal has no strict road hit at the two quoted centers, but nearest road edges are only 0.113251 and 0.521753 mm away; terrain is about 0.22 m below source Y. Dropping onto that terrain on each missed ray would create a new jump.

Way `1464521728` supplies the opposite control. Its existing offset has terrain at 29.4152447393 m and road at 31.2439612372 m; source Y is 29.5018370881 m. The ground-level path must not jump to the unrelated upper road. Even reusing the generator's present recipe is insufficient: at the retained centerline point current road minus ground is 1.9954659850 m, just inside its two-metre test, so that recipe would return 31.2745606972 m. The original source station is still 29.5018370881 m. Current geometry and historical graph construction must remain distinct.

The source-way filter supports an explicit source-ground option. It does not grant blanket terrain fallback: a path may cross a mesh gap while its intended local sheet remains road/pavement. Choose the sheet for a local route interval, preserve it through the interval, and fit actual contact to it. Source Y, occurrence, accepted source-ground geometry and adjacent supported anchors identify the neighborhood. Do not reselect the nearest/highest candidate independently at every tick. A tie or unexplainable change of sheet is a named refusal with the actual candidates.

#### W3 — Distinguish narrow seams, real uncovered strips and source-ground paths

The nearest-edge measurement alone establishes neither a gap's full width nor opposed support. A walking seam treatment must find the actual adjoining same-level triangles and test the delivered foot contact geometry spanning them. Keeping origin Y on that local sheet while actual sole contacts remain supported is defensible. Extrapolating one edge over an unspecified hole is not. The paint-only 10 mm seam allowance supplies no permission here.

The 172.336 mm old-offset miss and 465.401 mm candidate miss near paved way `1391515612` are not automatically narrow seams. Nor does a source terrain triangle beneath them prove a supported step from the raised pavement. The 76.014 mm nearest pavement distance at the AOI entrance of `1086844872` is a separate ground-path case. All retained terrain hits are original source triangles, not the 227 appended terrain caps.

Recommended source policy: admit non-cap source terrain for explicitly classified surface-only route intervals when the ground is the selected local walking surface; require every entry/exit to another sheet to have a continuous supported construction. Maintain road/pavement ownership across tiny mesh seams only with the foot-spanning evidence above. For the wider paved gaps first test a local adjustment within the existing route corridor, retaining seeded preferred offsets outside that bounded neighborhood. If the requested path still lacks support, report the exact unresolved interval instead of changing the graph, silently rerolling the route or treating a refused actor as solved.

A genuine owner choice arises only if an essential interval still needs new geometry: preserve the source and leave that route unresolved, or explicitly author a visible, provenance-labelled surface/curb connector and review its geometry and contact. An invisible sheet, a terrain snap under raised pavement, or quietly widening the paint seam are not alternatives. The present finite examples do not prove that such authoring is necessary. The root can approve the bounded source-ground selection above within the existing surface-only simulated-world scope; there is no reason to stop now for a new survey requirement.

#### W4 — A finite turn rate does not make a stationary pivot foot-safe

All source-segment joins need handling, not only occurrence boundaries. The audit correctly distinguishes horizontal kinks from vertical-only tangent changes. A pedestrian minimum turn radius is not established by the reservation radius. A local stop/turn/restart state is a reasonable kinematic fallback for an exact reversal or a curve that cannot fit, with zero source/physical-distance advance while turning and bounded actual yaw. It must still account for the rotating collision hull and take time; it cannot rotate through an unheld authority.

It is not ready for current animation. `src/agents/render/humans.ts:178–180` derives walk phase from travelled distance and blends toward idle when speed is zero. `vat.ts` interpolates those clips and the pose matrix applies body yaw. With current delivered commuter-male near geometry, slot 0, scale 1 and speed 0, a fixed-center 90-degree turn over 0.5 seconds moves a selected drawn sole vertex 275.448 mm while every selected point remains within 0.988 mm of ground. The same 31-pose interval without yaw moves at most 0.0195 mm. This independent CPU red control uses actual selected-scene GLB/VAT bytes and the existing idle interpolation; it is not a rendered sequence or a proposed angular-speed constant.

Never advance a fake travelled distance to animate the pivot. Export turning state, actual yaw change and actual displacement separately to locomotion. Before user-facing acceptance, require the same pivot's drawn-sole control to pass with real contact/release behavior, and inspect its moving native frames in both styles. A pivot may be accepted as a geometric primitive while its animation remains explicitly unaccepted; that does not establish an accepted complete walking path.

There is reusable work before any new animation project: `plan.md` records the unintegrated controller digest `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`, the finite 43-case/60 Hz evidence, and Reviews 16, 23 and 26. Evaluate that candidate on this exact pivot first. Its naturalness is unaccepted, and its recorded 3,000-body update-plus-pose cost is already too high; none of its correctness or performance acceptance transfers to this task. This review did not execute or audit that controller.

#### W5 — Bind support to current surfaces, preserving network lineage

The result mentions a road mismatch; terrain differs as well. Current road SHA-256 is `0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc`, versus network pin `3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490`. Current terrain is `c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773`, versus pin `fef57d0960c3d08c5d31f0f56f64cff3b046b6d577b36473b7c046295249b381`. Current pavements are `3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62`. The network itself matches `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`.

The retained current-triangle observations remain valid. Support construction must bind these current accepted meshes and identify source versus appended cap triangles separately from the unchanged graph provenance. A served-scene certificate establishes served bytes, not correct surface selection or equivalence to the historical graph inputs. Do not regenerate the graph or weaken an authority guard to hide this mismatch.

#### Minimal interfaces and algorithm

1. Keep the immutable `PlannedRoute`, its edge occurrence IDs, starts, passages, gate stations and seeded offset fractions. Add a per-actor `WalkingPath` with physical XYZ points, cumulative physical arc, monotone local source locations, surface references, and optional turn events. Preserve the terminal source endpoint plus its seeded offset and heading exactly in XZ/yaw; final Y comes from accepted contact. Terminal clearance remains the other worker's responsibility.
2. Supply a required `WalkingSurfaceQuery` at population construction and every shipped tool. Its request contains the source route/occurrence/local station, candidate XZ and previous selected surface. Its result is a selected local patch with physical Y, normal, mesh/triangle identities and source-ground/seam evidence, or a named refusal with coordinates and competing candidates. Synthetic tests supply explicit analytic surfaces. A missing production query never means accept.
3. Construct each offset track from actual source segments. Join every horizontal kink and width/occurrence transition in a bounded local neighborhood, preserving the chosen corridor position elsewhere. Try a local smooth connector where supported. Fall back to an explicit stop/turn segment only as the kinematic mode described above. Overlapping construction windows and failed support are recorded results, not reasons to drop a route silently. Avoid a general navigation mesh or an arbitrary radius policy.
4. Resolve supported Y and any coherent support orientation before measuring the final path arc. Otherwise replacing source Y after reparameterization invalidates the speed proof. Materialize the actual runtime polyline and spend its true three-dimensional arc budget. A vertical support discontinuity is a construction refusal unless an explicitly supported transition resolves it; linear interpolation through empty space is not such evidence.
5. `advanceWalking(path, state, dt, speedBudget, authority)` returns actual pose, consumed physical distance, local source observation, and locomotion mode/yaw delta. Translation and turning consume time; a pivot consumes no travel. Keep `sourceTravelledM` for route/admission state and physical travel for the renderer's distance channel and measured speed. Preferred direction and collision observations come from the same physical pose, not the old sampler.
6. Map gates only within their source occurrence neighborhood. Before a grant, stop at the earlier of the source hold mapped onto the physical path and first actual swept-footprint contact with its governed primitive. Check a rotating hull as well as translation, including contact between tick endpoints and the next different authority. Do not globally project onto a self-intersecting/repeated route, progress the source while held at a pivot, or release a body because a bookkeeping station crossed the end.

The minimum support interface resolves a local patch; it does not falsely return a claim that a whole moving foot has already passed. A separate finite contact check consumes actual displayed foot samples on that patch. That distinction permits a narrow motion implementation without burying the unresolved animation requirement in an always-true support boolean.

#### Required controls for the next candidate

- Reproduce the three exact old jumps, then show continuous final XYZ and bounded physical arc over every constructed join, including interior cuts, short edges, equal-heading width changes, near/exact reversals, repeated edges and adjacent transition windows. Include the deliberately smooth but source-distance-driven red control. Recompute arc independently after Y fitting.
- Retain exact route choices, gates and offset fractions for all 150 initial seeded routes. Count refusals separately; zero accepted routes is not success. Cover later generations explicitly before claiming the population generally works.
- Pin the diagonal seam cases, both directions of `1391515612`, the `1086844872` entrance, and `1464521728` below the higher road. Add wrong-layer, cap-only, one-sided edge, genuine hole, height-step and ambiguous-sheet controls. Report finite spacing/contact coverage rather than claiming continuous swept sole support from five points.
- Exercise an ungranted smoothed corner, a rotating hull at a disk boundary, committed clearing on red, an internal gap, a later distinct authority, and the preserved terminal pose. Compare request and observation footprints with actual phase-specific poses.
- Keep the 275.448 mm pivot as a locomotion red control. Any future fix needs actual drawable sole contact/release observations and native moving views; bounded yaw, a constant gait phase and a passing body-position test do not close it.

## Findings and disposition

The W labels identify this reviewer's findings; permanent finding allocation and owner dispositions are left to root. They are not claims of owner acceptance.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| W0 | Physical/source distance separation repairs a real sampler defect. | Reviewer recommends accepting the bounded representation, not production completion. | Implement final supported arc and retain independent speed controls. |
| W1 | Vehicle residual and collision-square tests are not pedestrian contact rules. | Reviewer agrees with the report's withdrawal; owner disposition pending. | Use actual drawn sole checks and state the scale/phase bounds. |
| W2 | Padded graph Y and highest-road selection cannot choose physical contact. | Open design obligation. | Local source-aware surface ownership and actual fitted Y. |
| W3 | Narrow seam evidence does not authorize wider unsupported connectors. | Open design obligation; no whole-strategy impossibility shown. | Opposed support/contact check, explicit ground intervals, named unresolved gaps. |
| W4 | Bounded fixed-center yaw still drags current planted soles. | Independently reproduced; geometry-only pivot acceptance is insufficient. | Evaluate retained locomotion candidate on the exact red control before broader authoring. |
| W5 | Both road and terrain differ from historical network provenance. | Disclosure correction; current-triangle evidence still valid. | Bind current support inputs separately, preserve graph lineage and guards. |

## Verification

`node artifacts/review/check.ts` passed on Node 24.12.0: fifteen frozen hashes, 45 independent full-triangle scans, three exact current sampler seam limits, and the wrong-distance counterexample. `node artifacts/review/pivot.ts` passed its discriminating control: stationary idle below 5 mm drift and the proposed pivot above it. Probe files and outputs remain ignored under `artifacts/walking-contract-review/artifacts/review/` while this handoff is active.

Evidence digests: `check.ts` `d711f1480a3dbef1b40cc3d9fcf3249e0626a8f4964b61306d415ad7d0fdb291`; `checked.json` `7e553721c90c26babaf40fa32355519c3d1a3b4578d7a1724ba7472e2959f7d8`; `pivot.ts` `4b35b7decdfb5df8261a362dff064fc44697514f26d4616a436864a4da3253e9`; `pivot.json` `fdef7cc51b39ce15fa18a12baf25c29b070017d681cc485beaf32ab75732dc07`.

Pivot inputs are commuter-male manifest `72a2230ae9283d66670aaa9a493895e67de357b65a2406b70d36a2f89d1e8718`, near GLB `84fa51beb9650cdc4e1489593b8a153e6d4171703d0ad6c38666d98dd32c0c53`, and VAT positions `8e5889b0569146611d445712b0b763db07e1bbee16e1bfbf4e5953a6c8dbf4d8`. The selected-scene validator checks draw membership; the probe selects fourteen actual referenced idle sole vertices within 1 mm of the bottom and applies the shader's clip interpolation. No ideal rig targets stand in for delivered geometry.

The review does not run the five product gates, inspect new pixels, measure a 3,000-body workload, prove continuous foot support or establish human/vehicle avoidance. The work-docs structure check stops at the inherited `docs/work/0_shibuya-1km/handoff.md`, which it reports outside the permitted work-folder shape; it does not complete and is not a pass. The review changes no existing tracked file and adds only this report and its two authored snapshots. Root must run the combined documentation check after integration and resolve or disclose the inherited format issue.

All foreground probe processes completed; no long-running task resources were created. An elevated read-only final process census found zero Node/Chrome/Edge command lines naming this worktree. The worktree remains intentionally available with the report and two exact snapshots for root's integration and subsequent removal.

## Round outcome

Proceed with the small physical-path and local-support implementation under the contract above. The exact cubic prototype is not production-ready. Do not turn its provisional refusals into route exclusions or a demand for surveyed source data. Complete supported Y, actual gate/footprint agreement and explicit turning/locomotion evidence before claiming accepted continuous pedestrian motion. Root disposition and final integration remain pending.

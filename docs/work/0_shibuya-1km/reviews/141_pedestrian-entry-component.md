# Review 141 — safe pedestrian entry component, later motion still blocked

Bound: uncommitted implementation in the isolated `crowd-admission` worktree from `bb4532df4e4cfd7d2cc3c072a951d9dc6ada3f7c`, nine new focused cases plus 19 adjacent cases, five failing controls, and one current-default CPU follow-up through tick 5717. The entry component passes its checks. Later moving/queued bodies develop material overlaps, so the crowd flow is not fixed and this is not visual, all-time contact, authority or whole-simulation acceptance. Root owns independent review, integration and the remaining gates.

## Implemented contract

The requested population remains **3,000 pedestrians / 200 vehicles / seed 5970698**. The first fixed tick activates **31 pedestrians and leaves 2,969 waiting**, with no sampled nominal or displayed-envelope overlap. Waiting is real outstanding demand; it is not a lower target or renderer suppression.

Exactly six product/test paths changed: `src/agents/population/{tick.ts,config.ts,status.ts,pedestrian-entry.ts}` and `test/{pedestrian-entry.test.ts,pedestrian-entry-assets.test.ts}`. The entry helper, bounds and tests are new. `changes.patch` contains the complete tracked and new-file diff; `freeze.json` binds all six final file hashes. No traffic planner, railway, route/support source, default entry setting, data/cache, renderer, harness control or dependency changed. No commit was made.

`planSlot` prepares one stable candidate with its seeded route, variant, scale, next generation and route progress. A candidate owns no live pose, live route or admission lease. First activation and reuse call the same `activatePedestrian` gate. It tests the float32 origin/scale against a spatial index of current active pedestrians and current authoritative projected vehicle hulls, then inserts the accepted pedestrian immediately so subsequent same-tick candidates see it. Activation alone consumes the next generation and spawn count. The prior-generation lease check and normal route/signal/support logic remain intact.

The pedestrian queue bypass is removed. A rotating cursor examines at most 128 slots per tick, including active and ineligible slots. Blocked candidates retain their identity and wait at least the existing 60-tick retry interval. Initial spawn staggering becomes persistent eligibility after its start time, avoiding modulo aliasing with the cursor. Requested, active, waiting and prepared-pending counts are published separately; `requested = active + waiting`. Pending candidates do not enter lifecycle spawn totals. The existing renderer already skips inactive slots, so no filtering change is required.

The exported `PedestrianEntryCandidate` and common activation path provide the seam for a future legal 24-slot initializer. This patch does not import that helper, place those slots or turn population on at the ordinary URL. Any future 24 slots must come from the same requested 3,000 and pass this gate.

## Actual displayed bounds and transform argument

The helper's per-variant XZ radii are 0.510, 0.533 and 0.496 metres, with vertical intervals `[-0.0011,1.629]`, `[-0.0011,1.833]`, `[-0.0011,1.512]` before actor scaling. These round Review 138's decoded all-LOD/all-clip extents outward by at least 1 mm. A separate **0.05 m air gap** applies beyond the two entry bodies. These values do not replace the motion radius or signal footprint.

The asset test pins the three manifest hashes, verifies their model/VAT hashes, selects the actual GLB draw parts, follows indexed `_VAT_ID` values and decodes every drawn point in all 48 frames and all nine LODs. It additionally applies the actual `writePoseMatrix` and float32 `writeInstanceMatrix` at maximum scale, oblique yaw and an AOI-edge origin, checking every resulting vertex. The former 0.25-metre office radius fails on an actual displayed vertex.

The shader replaces `begin_vertex` with the world-baked VAT position (`render/vat.ts:37–47`); frame interpolation and idle/walk blending are convex combinations. They remain within the measured cylinder. The human renderer creates identity-transformed instanced draw meshes from that world-baked geometry, applies the shared instance matrix, and uses alpha masks only to remove fragments (`render/humans.ts:100–143`). Pedestrian `placeSlot` writes an upright support normal; yaw therefore preserves the radius. The actual pose transform uniformly scales the body. Activation stages previous/current poses together, so reuse does not draw a path from the former position. Existing motion and interpolation after activation remain outside the entry-only guarantee; the 0.05 m margin is not an all-time collision solver.

Vehicle checks reuse `vehicleFootprint`'s current projected hull, including its supported tilt/wheel envelope. Its 3D envelope diameter supplies a deliberately conservative vertical interval. This patch neither changes vehicle authority nor claims a new combined pedestrian/vehicle motion-contact gate.

## Verification and failures that were resolved

`focused-final.json`: **28/28 passed** across the two new files, `pedestrian-terminal.test.ts` and `population-authority.test.ts`; final invocation took about 2.934 seconds. `tsc --noEmit --pretty false` exited 0 after final edits. `git diff --check` passed. Build, complete unit suite, audit, GPU/browser/native review and full visual gate were not run, per assignment.

The first test iteration exposed a missing authored-diagonal marker in the small reuse fixture; the next exposed its lack of a legal exit/central terminus. The fixture was corrected to a short ungoverned central route. The adjacent authority gate then rejected the new method name `canEnter`, which it reserves for prohibited phase-only signal eligibility. The occupancy query was renamed `hasClearance`; the gate was not changed. These intermediate failures remain in the evidence.

All five mutations exited 1 with one named failed test and restored the exact source bytes in `finally` (`red-controls.json`):

| Mutation | Observed failure |
| --- | --- |
| Bypass clearance | First-entry bodies 0/13 are 0.171055 m apart, below their independently decoded radii sum 1.049683 m. |
| Restore nominal office radius 0.25 m | Actual office near-LOD frame-0 vertex 2270 escapes the transformed entry envelope. |
| Drop waiting demand from status | Active plus waiting reports 31 instead of requested 3,000. |
| Consume a generation on a refused retry | Reuse reports generation 2 while generation 1 must still be the last admitted identity. |
| Restrict cursor to the first 128 slots | The fairness/progress case fails; later requested slots are not traversed. |

The independent geometry control was added while retaining every earlier progress/count assertion. Automatic approval review rejected a proposed relaxation of the first-count assertion; the exact rejection and the stronger alternative are preserved in `approval-review.txt`. No rejected mutation was applied and no approval bypass was used. Final restored source passed all 28 checks before the follow-up.

## One bounded follow-up: entry clear, later overlap material

The supported fixed clock was `RenderLoop.advance`, with the same settings and cached inputs as the baseline. The preflight first refused 58 cross-worktree source byte mismatches before creating a population or advancing a tick. Each was then verified against the pinned primary copy as CRLF/LF-only; this distinction is recorded in `before.json`, not called byte identity across checkouts. The actual run froze 214 local source/input/test files and found no change during execution. All 117 served files remain 301,782,754 bytes, digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`.

| Tick | Active / waiting pedestrians | Moving above 0.2 m/s | Same-level nominal pairs | Pairs deeper than 0.05 m | Phase-conservative displayed-envelope pairs |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 31 / 2,969 | 0 | 0 | 0 | 0 |
| 60 | 31 / 2,969 | 31 | 0 | 0 | 0 |
| 5405 | 2,190 / 810 | 1,587 | 4,741 | 4,170 | 5,817 |
| 5717 | 2,299 / 701 | 1,572 | 5,807 | 5,050 | 6,966 |

There were 2,305 pedestrian activation events and six completed pedestrian routes by tick 5717. Every new activation was checked immediately after its entry step against the independently decoded full-animation cylinders of all other active pedestrians; **zero post-entry overlaps** were found. The later pairs therefore formed after initially clear entry. The recorded authority-violation counter remained zero; that counter does not certify contact. The terminal live count was 41 vehicles. Overall lifecycle conservation remained valid.

The run took **19.256 seconds wall time**, including observations, and **18.231 seconds inside population updates** for 95.283 simulated seconds. Average update cost was about 3.19 ms. This is CPU-core timing at the reported changing active counts, not frame rate, GPU cost or a 3,000-active performance claim.

The first sampled deep-motion witness is at tick 5405, slots **1 and 293**, both generation 1, same entry `walk:1286507142:0:0:ground0:f`, 52-edge routes of 993.351648 m. Their centres are **0.199206 m apart** with a 0.030095 m height difference, a nominal-circle penetration of **0.308667 m**, and conservative phase-envelope penetration of **0.439338 m**. Both are stationary and have stopped for 17.583333 seconds. Slot 1 is at progress 58.948365 m, occurrence 1, `junction:walk:665322367:0:0:ground0`, committed flag true, yaw -2.3456974. Slot 293 is at progress 58.463631 m, occurrence 0, no junction, committed flag false, yaw 2.2642469. The heading difference puts the witness across a turn/queue boundary. Their entry ticks are 1 and 143; neither entered overlapping an existing displayed cylinder.

This crosses the agreed entry/motion boundary. The unchanged solver uses 0.25-metre nominal radii, at most eight ORCA neighbours, fixed lateral routes and nonnegative forward projection of avoidance (`population/tick.ts` walking step and `population/pedestrians.ts`). The witness proves later spacing is materially deficient even relative to the smaller nominal body. It does not isolate the exact ORCA, turn, queue or lease branch, and conservative mesh boxes are not triangle-intersection proof. No motion radius, solver, support or authority change followed this finding.

## Retained reproduction and missing evidence

`follow-up.json` holds settings, timing, counters, the witness and input stability. `entries.json` holds every activation's tick, generation and pose. `snapshots.json` holds active actor diagnostics at **0/1/60/5405/5717**, including witness rows and phase-envelope measurements. The gap between 60 and 5405 is not a continuous trace; tick 143 is the later actor's entry record, not a full checkpoint. The exact first contact tick is unknown.

The run did **not** retain `admissions.snapshot()` lease objects or full route-passage objects. A committed flag is not exact lease authority; the report does not reconstruct an unstored lease or preceding trajectory. Reproduce from the frozen source/input settings with the existing authority trace in a separately approved focused follow-up if review needs that branch. No further replay was run here. The baseline Review 138 files and hashes were preserved.

The finite next step is independent review of this entry component and of the smallest motion-spacing boundary demonstrated by the witness. Integration must not call the crowd flow fixed while that material finding remains. Native appearance, 24-slot startup integration and the normal five code gates remain outstanding. All task subprocesses completed; no GPU, browser, server, watcher or background subprocess was launched.

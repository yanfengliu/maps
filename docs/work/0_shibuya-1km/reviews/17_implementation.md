# Review 17: implementation

## Target

This round records the actual independent visibility review, its two material findings, the bounded repair and focused re-review at main `636bff7dca10f00dc3ada892ebb7005cfa815c92`. The rejected target is `artifacts/network/visibility-cap-comparison/handoff.json`, SHA-256 `e29b8790232ed552dadce4793ce631c5889a4436daaa284ce755ad20ca4d0a92`. The repaired target is `artifacts/network/visibility-fix/handoff.json`, SHA-256 `03b0f22a18529c7cf70e2ff8c2f96fcc3a6e75141b89f50192022582d2d56d87`; its observer is `da299b8698f3dc72b513fa145e7fae83b7b041fd04618838a44e39cd737885d7` and four-file repair patch is `7f50c17fd517d16577efdb515c4687d7d127623e214f4f527208f9ebc5cb7a73`.

The original 500,000-test variant and explicitly revised 1,200,000-test variant remain separate evidence. This is an ignored CPU observer, not a live adapter or pixel acceptance. Exact reviewed text-source copies are retained under `artifacts/network/gait-visibility-checkpoint/candidate-03/recovery/source/`; recovery patch `recovery/reviewed-source.patch` is `a7a9e2096482f5e66520f436cd2bef6c0a01573dc19174e09ba9c02c13cbfd9c` for 14 complete text files across this checkpoint. Exact copies retain bytes; the patch normalizes line endings to LF for transport and restores ignored paths only. Source requests, binary assets, original negative controls and canceled native evidence remain at their pinned handoffs.

## Reviewers and coverage

The network worker authored the observer and repair. The independent visibility reviewers authored the two reports below and did not implement the repair. Root separately read both reports and the actual patch, checked the independent controls and source/evidence pins, and accepted only the bounded CPU repair. This wrapper maps original local P1 to permanent F13 and original local P2 to permanent F14. The original report wording and priorities remain unchanged.

The rejected-target report is `artifacts/network/visibility-independent-review/REPORT.md`, SHA-256 `60bf5824b5fbcc4298dc46630ac3e6759050486358033a1fb164e1ef48a8181d`, with handoff `6b918271dac807d38bf16ca8bb96a9ee49f084eb0bb318e9c78b0f7ec7037ab4`. The focused re-review is `artifacts/network/visibility-fix-review/REPORT.md`, SHA-256 `8e26130520bb2e54860bab84a9b220d663575774a13ef8fb01b3a3e2de6e562f`, with handoff `26fb0769c60a289615787f20108e3ab5d116331028f52589b7a4a497a25704f0`. Both are embedded in full with heading depth increased by three levels; checked inverse transformation recovers exact originals. The author repair report (`7ebffa6c8224e70a5e0c7e11aa901456f892ae23ca92395d279e8e4a5b3d89c0`) remains separately pinned recoverable evidence, not an independent review.

## Reports

### Independent visibility reviewer: rejected target and capacity comparison

#### Independent CPU visibility and capacity review

The explicit 1,200,000 triangle-test capacity revision reproduces and is a reasonable finite prepared-query bound for the retained six-pose source request. It does not turn the old 500,000 refusal into a pass. Two input-contract findings block treating this observer as a fail-closed live visibility guard until resolved. The pinned static replay still refuses all visibility acceptance, so neither finding establishes a false clear in the canceled native run.

Reviewed target: `artifacts/network/visibility-cap-comparison/handoff.json`, SHA-256 `e29b8790232ed552dadce4793ce631c5889a4436daaa284ce755ad20ca4d0a92`, against main `636bff7dca10f00dc3ada892ebb7005cfa815c92`. All 46 owned and 488 external records matched their byte counts and SHA-256, totaling 399,985,716 bytes. The original freeze `248a64c2768b5238a3af1458c3041eeb78bf60e2788eed310603f72416387f53` remains retained. The extensive existing worktree changes were inspected and left untouched. This scope writes only this ignored review folder.

##### Material findings for live integration

1. **P1: Unknown deformation has no valid exclusion envelope.** In `artifacts/network/visibility-prototype-1200k/observer.ts:82`, the observer first excludes an object whose transformed undeformed triangle box misses the ray. It marks `unknown-deformation` unsupported only after that exclusion at line 84. `InstanceInput` supplies no proven bound for a deformed surface. The independent control supplies a distant source triangle marked unknown and gets `accepted: true`, `complete: true`, no reasons; an explicitly translated reference triangle intersects the ray and refuses. The test makes no claim that this deformation occurs in the pinned Shibuya replay. It demonstrates the missing contract. Before a live adapter can declare completeness, either provide and enforce a conservative envelope that contains the actual deformation, snapshot the actual deformed triangles, or make any unbounded unknown deformation render the query incomplete. A static source box alone cannot justify a local exclusion. Clipping that only removes static geometry is a different case and can retain its conservative static bound.

2. **P2: Duplicate occurrence IDs can pass the wrong exact instance as the requested wheel.** Keys are unique, but occurrence IDs are not checked for uniqueness. At lines 120 and 133, sample validation and first-hit acceptance use `occurrenceId` plus `wheelIndex`, without the exact requested key. The independent fixture references a triangle in `wheel0#0`; a different target key `wrong-instance#0` with the same occurrence ID and wheel index lies in front. The first hit is the other key, yet `wheelVisible` and overall acceptance are true. Before live integration, enforce unique actual occurrence IDs across each supplied instance set, or bind each sample and hit to the exact mesh/instance key as well as the actor generation, class, occurrence and wheel. The current source replay constructs unique occurrence IDs, so this does not change its retained ray results.

Both failures are retained in `adversarial-01/stdout.log`, `adversarial-results.jsonl`, and the actual child exit record (`code: 1`, not timed out). The three-control run has two failures and one pass. The passing independent control checks off-axis near clipping: geometry with camera-space depth before the near plane is ignored even when its radial distance exceeds the near distance; geometry after the plane obstructs. No production fix or target mutation was made.

##### Reproduction and geometry findings

Copies of both variants ran all 31 existing controls and scoped TypeScript successfully. Only output-directory labels and the extra relative import depth changed for execution in this nested review folder. The copied comparison verifier passes: the 98 source records, byte-identical controls and helpers, all individual source/camera/target/ray results, and the 31 completed common-prefix rays remain equal. The two original observer files differ only in the cap constant and bound comment. The shared 900,000-index exhaustion fixture is identical in the two variants and deliberately exceeds both caps; the original smaller fixture remains preserved in the old freeze.

| Fresh prepared shared query | Triangle tests | Broad-phase tests | Completed / attempted rays | Elapsed |
| --- | ---: | ---: | ---: | ---: |
| 500,000 cap | 500,000 | 190,233 | 31 / 32 | 14.7452 ms |
| 1,200,000 cap | 1,001,088 | 369,106 | 60 / 60 | 46.3223 ms |

These are observed single-run costs, not a throughput or whole-adapter guarantee. The retained author comparison measured 21.7412 ms and 29.2062 ms respectively; timing varies, work counts reproduce. Geometry preparation is separate: fresh revised source preparation took 1,112.3133 ms before the pose-specific preparation. The synchronous query still shares 64 rays and one 200 ms cooperative budget checked every 256 triangle/broad-phase work items across at most six poses. It is not a hard 200 ms wall-clock preemption guarantee. Both work and time exhaustion controls refuse completeness. No split query, retry, new BVH or dependency appears in the capacity change. The future ordinary case remains capped at 12 minutes with no retry.

The decoded source includes 67 building tiles, 132 building instances and 532,315 building triangles; surfaces contain 725,732 triangles; the kei source has 19 occurrences and 30,642 triangles. All 132 audited building primitives are opaque and front-sided in the source audit. Source transforms preserve the world frame, selected GLB scenes and indexed Draco triangles. The runtime building material patch inspected here adds shading data and fragment terms without changing source vertex positions or material sidedness. The observer correctly distinguishes draw-object winding from a negative instance determinant, environmental blockers from exact target actor keys, and legitimate own-body occlusion from a wheel-first hit. It validates wheel samples against actual indexed triangle centroids. Near wheels are selected from transformed physical pivot distances, not misleading left/right names, and the view-pair condition requires different physical sides plus at least 120 degrees. These mechanisms are bounded by the two findings above and the missing live adapter.

Fresh replay confirms incoming-kei-side1 has a data523 building hit on all ten rays in both recorded brackets, and bend-kei-side0 has data504 building hits on all ten. Their old positive-speed/rendered-count/has-motion predicates still pass. Incoming-kei-side0 and bend-kei-side1 have zero sampled world hits and four target-first wheel samples in each bracket. The incoming-side1 endpoint has three conservative road/hull intersections and four wheel hits per bracket. Those endpoint refusals remain unchanged. This review did not inspect or accept native pixels; the parent integration owner separately owns that review.

##### Required live contract and acceptance limit

Before any live integration, supply actual draw membership for that frame and camera, including visible object/instance counts, selected tiles rather than the fetched REPLACE union, other actors, decorations, hardware, paint and ground. Use exact interpolated instance matrices with slot/generation/class identity and immutable unique occurrence identity. Bind every sample to its actual source triangle and define the six body/roof plus four near-wheel sample profile explicitly. Preserve both screenshot brackets and the accepted renderer identity cache. Keep a separate immutable pre-Start hypothesis; a fixed tick or hypothetical pose must never stand in for a live actor. Resolve unknown deformation bounds and duplicate occurrence handling above. Snapshot the actual projection, clipping, draw range, winding, material/support classification and relevant UI rectangles; combine the screen guard with ray results in one refusal path. Maintain the revised shared query cap and the existing ordinary-case deadline without hidden retries.

None of the old replay inputs provides exact drawn membership, screenshot interpolation, actual instance matrices, observed generation or UI coverage. Every replay remains `complete: false` and `accepted: false`, including the clear source counterparts and the revised 60-ray request. A finite necessary geometric condition does not establish shaded wheel visibility, contact, steering correctness, route visibility between samples, the 18 executions/126 native images, or whole-vehicle/whole-scene acceptance. The larger 200-vehicle/3,000-pedestrian objective is unchanged. No browser, GPU, server, data regeneration, main/source edit, commit or merge was performed in this read-only review.

All seven copied CPU children have 120-second deadlines, recorded observed exits, and finally cleanup. `Get-CimInstance Win32_Process` was unavailable with Access denied; the retained fallback uses `System.Diagnostics.Process.GetProcessById` and treats only its missing-PID ArgumentException as absence. All 14 recorded child and wrapper IDs were absent at 2026-09-13T10:08:12.7000867Z, with no process intentionally retained. Final closure, including the unavailable CIM check, is recorded in `process-closure.json`. The copied sources, outputs, two failing controls and report are kept as unresolved-review and handoff evidence. There are no disposable task outputs outside this assigned folder. Root owns canonical review publication and any later implementation decision.


### Independent visibility repair reviewer: focused re-review

#### Independent focused visibility repair review

No material findings in the bounded P1/P2 CPU observer repair. The two original independent failures reproduce on the old observer and are resolved on the repaired observer without removing the adverse geometry, renaming duplicate occurrences, or accepting a missing-metadata exception as the proof. This review accepts the bounded repair for later integration. It does not accept a live visibility adapter, rendered vehicles, or native pixels.

The exact target is `artifacts/network/visibility-fix/handoff.json`, SHA-256 `03b0f22a18529c7cf70e2ff8c2f96fcc3a6e75141b89f50192022582d2d56d87`. The observer is `da299b8698f3dc72b513fa145e7fae83b7b041fd04618838a44e39cd737885d7`; the four-file patch is `7f50c17fd517d16577efdb515c4687d7d127623e214f4f527208f9ebc5cb7a73`. The prior independent report and handoff match `60bf5824b5fbcc4298dc46630ac3e6759050486358033a1fb164e1ef48a8181d` and `6b918271dac807d38bf16ca8bb96a9ee49f084eb0bb318e9c78b0f7ec7037ab4`. All 632 listed owned and external records match their sizes and SHA-256, totaling 401,204,132 listed bytes. Exact paths and further pins are retained in `preparation.json` and the sealed review handoff.

##### Reproductions and findings

The executable reproduction was generated from the earlier independent `adversarial.test.ts`. Its only adaptations are a dynamic old/new module import, a new owned output path, and the same additive `instanceKey` field for both variants. The geometry, duplicate occurrence names, identities, and original assertions remain unchanged. `verify.mjs` additionally rejects a thrown-metadata shortcut and inspects the actual hit records.

| Fresh bounded check | Tests | Passed | Failed |
| --- | ---: | ---: | ---: |
| Original reproductions, old observer | 3 | 1 | 2 expected |
| Original reproductions, repaired observer | 3 | 3 | 0 |
| Repaired author unit suite | 36 | 36 | 0 |
| Independent adjacent controls | 18 | 18 | 0 |

Scoped TypeScript passes. All test counts have zero skipped or cancelled tests. Runs used Node 24.12.0, satisfying the repository's `.nvmrc` major 24. Logs, observed child exit codes, and JSONL witnesses are retained. These are finite correctness controls, not timing benchmarks.

P1: the old distant unknown-deformation triangle produces `complete: true` and `accepted: true`, while the explicitly translated reference blocks. The repaired distant unknown produces `complete: false`, `accepted: false`, and `unbounded-unknown-deformation`; the translated reference still gives a real `unknown#0` world hit. Code inspection confirms completeness is preclassified before the per-ray static-box pruning, and the per-ray path also records unknown deformation before pruning. The independent adjacent controls cover unknown target and world objects, hidden versus visible objects, and unknown boxes beyond the camera/target range. Hidden unknown objects remain outside supplied drawn membership. Visible unknown objects cannot borrow a finite envelope from undeformed source positions.

Clipping-only geometry retains a conservative static box because it can only remove that geometry. Off-axis and beyond-target clipped boxes remain excludable; an intersected clipped box refuses completeness; hidden clipped objects are excluded. The original perpendicular near-plane control remains green on both variants. The caller must classify actual source drawing honestly; this repair does not implement that live classifier.

P2: in both old and repaired original records, the requested sample remains `wheel0#0` and the actual first target hit remains `wrong-instance#0`, occurrence `wheel0`, wheel 0, triangle 0. The old result reports that wheel visible and accepts; the repaired result reports it invisible and refuses. A further independent control uses the same mesh and occurrence with instance IDs 0 and 1, so this proof covers exact instance identity as well as a different mesh name. Legitimate duplicate names on nonintervening instances still pass.

Sample validation resolves its exact target key, occurrence, wheel index, indexed triangle and triangle centroid. Target mapping continues to bind slot, generation and class; independent altered-generation, altered-slot, altered-class and other-actor controls refuse. Missing, wrong or inconsistent sample keys, triangle indices and centroids refuse. First-hit acceptance appropriately binds the exact requested wheel mesh-instance, rather than requiring the same triangle: a separate control samples triangle 0 while triangle 1 of that same wheel is the first surface and confirms acceptance. This matches the stated finite near-wheel visibility condition and does not claim that the referenced centroid itself is visible through the wheel.

##### Preserved source claims and limits

All 98 source input records are byte-verified and identical between the retained old and repaired replay. All case and shared-query records compare equal after removing only timing fields and the declared `instanceKey` additions; removal of an instance key is permitted only on a wheel sample. The ten recorded bracket observations contain 100 rays and 40 wheel rays. All ten remain incomplete and unaccepted. The shared recorded request retains 60 completed rays, 1,001,088 triangle tests and 369,106 broad-phase tests, and also remains incomplete and unaccepted. No new full source playback or timing run was performed while graphics owned the shared lease; this verifies the frozen records and bytes, not a fresh throughput result.

The fixed bounds remain 64 rays, 1,200,000 triangle tests, 200 ms checked cooperatively every 256 triangle/broad-phase work items, and 16 declared candidates per half. The existing unit suite exercises shared cap exhaustion and clock exhaustion. The patch leaves those mechanisms unchanged and adds no retry or budget reset. A cooperative check is not hard wall-clock preemption. The original 500,000-cap refusal remains retained by the target's provenance chain.

The source replay still uses recorded fixed ticks and a fetched tile union, with `complete: false`. It cannot establish actual drawn membership, exact interpolated matrices, live generation, screen/UI coverage, or native visibility. The actual draw/interpolation/UI adapter, combined screen and sample-profile refusal, renderer identity binding, ordinary 18 executions/126 native images, combined gates, and main integration remain the root integration owner's work. The repair and this review are ignored artifacts, not merged product code. Observed main was `636bff7dca10f00dc3ada892ebb7005cfa815c92`; extensive unrelated WIP was left untouched.

##### Scope and cleanup

This read-only review read the repository rules, lessons, existing read-only harness and prior observer/reproduction instruments before writing probes. It wrote only `artifacts/network/visibility-fix-review/`, which Git confirms is ignored. No product source, prior evidence, data, Git state, browser, GPU, GUI, or localhost server was changed or launched. Root owns publication of this authored review into canonical work documentation.

Seven CPU children had 120-second deadlines and cleanup through their retained `System.Diagnostics.Process` objects. Tests used `--test-isolation=none`; inspected modules do not spawn children. Fresh cleanup checked all nine recorded child/launcher creation identities with `Process.GetProcessById` and exact start times. No owned identity remains live, and unrelated or recycled identities would be left untouched. See `process-closure.json`. The probes, results and report remain intentionally retained handoff evidence; no disposable task output was created outside this assigned directory.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F13 (original P1) | An undeformed static box excluded an object with unbounded unknown deformation before the observer declared incomplete evidence. | Root accepts the CPU repair: visible unknown deformation makes the observation incomplete before box exclusion. No deformation envelope is invented. | Static clipping that only removes geometry retains its conservative static bound. Live classification must describe actual drawn positions. |
| F14 (original P2) | A shared wheel occurrence name let another mesh/instance satisfy the requested wheel sample. | Root accepts the CPU repair: target mapping binds the exact actor slot, generation and class; sample and first hit bind the exact instance key, occurrence and wheel. | Distinct valid instance identities remain distinct; actual live matrices and draw membership must supply the contract. |

## Verification

The independent original controls produced two expected failures and one passing clipping control against the prior variant. The repaired variant passes those three controls, 36 author units, scoped types and 18 additional independent controls with no skipped or canceled test. The first-hit negative retains the wrong instance hit while changing acceptance from true to false; it does not remove the obstructing instance. Static source results match after stripping only timing and the declared wheel instance-key fields.

The 500,000-test refusal remains a refusal. The revised shared request completes 60 rays with 1,001,088 triangle tests and 369,106 broad-phase tests; the author repair measured 42.4694 ms. That single cost is not a whole-adapter guarantee. The unchanged operational limits are 64 rays, 1,200,000 triangle tests and a cooperative 200 ms check every 256 work items, with 16 candidates per half (32 potential views across both halves) and the original 12-minute ordinary-case deadline. All retained source replays remain unsupported because live drawn membership, interpolation and UI metadata are missing. Fetched URLs and fixed-tick poses are not substituted for those observations.

The canceled ordinary vehicle run remains separate negative evidence: eight cases produced 56 frames, a ninth produced none and nine never started. Response records pass for the eight completed cases, but root's native inspection found buildings fully occluding required moving views. The old positive-speed/rendered-count predicate therefore cannot certify appearance. No full 18-execution or 126-image acceptance follows from the CPU observer, and no native retry occurs in this review.

This documentation checkpoint checks exact report/source pins, reversible report headings, scoped format/links, secret/blob/diff checks and WIP preservation. It neither changes source nor reruns browser or code-delivery gates. Review 11 remains open; no missing report is invented and no whole work-docs continuity pass is claimed.

## Round outcome

F13 and F14 are resolved within the reviewed CPU input-contract scope. The rejected versions and original reproductions remain retained. A live adapter preserving the renderer identity cache, actual interpolated draw state and both screenshot brackets still requires its own review and native verification. Current delivery status belongs in [the plan](../plan.md).

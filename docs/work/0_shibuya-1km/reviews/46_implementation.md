# Review 46: implementation

## Target

Independent review of the bounded walking-path candidate and ignored stationary-turn prototype, both authored from `27c71865bef31a7c9dcc622db16e6721be839dc3`. The review ran in `artifacts/walking-gait-review/wt` at accepted main `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`. The four candidate source/test files were copied byte-for-byte. Main includes the accepted lease changes in RouteLibrary; its sampleRoute function is unchanged. The imported mesh, network type/filter, human-admission and RenderLoop files are unchanged between those bases. This review uses explicit finite routes and does not rerun or transfer the old-base route census. No runtime wiring or production acceptance is part of this target.

The author worktree is `artifacts/walking-path`. Exact ignored target bindings are:

| Target under its `artifacts/` | SHA-256 |
| --- | --- |
| `walking-evidence/freeze.json` | `7dd0839d8ff710d10275063c58b46bb126f3c62a533dc924ff54f7f1c735d728` |
| `walking-evidence/candidate.patch` | `0c5743954fd80225426001d61efce3ddc744b808d2fb2bf7ca1885cd1aea2ed5` |
| `gait-turn-prototype/freeze.json` | `f72dd83443475ff94b1657aa072552ba5f9708b49ef5f7b3c850cca5a677e4a9` |
| `gait-turn-prototype/controller-turn.mjs` | `4afb9a13f2b7c5ffbfee8bfdbafbbc65f26d2247071632357a2df34d151a9649` |
| `gait-turn-prototype/controller.patch` | `ef74847667289cd0529337fd4a375ae704d8fec3bdb281e2f7632d8359876617` |
| `gait-cancel-evidence/freeze.json` | `367ce6618b21a38d959223c24f09248ba51007d9331ea20385778e02ea7680f9` |
| `gait-turn-visual/freeze.json` | `36efa6a64ad012a19f0b03781f3db26a42b12a9ac966d3fd87dabca25ba8cb7b` |

The four source/test hashes are `walking-surfaces.ts` `9c0274aa6cf2ec0f2362b30f9c1d486531937527e725448d1da9a35198259674`, `walking-path.ts` `521e1b0988c39551041b6009aaa2632fdc844c2616b29dd64a79b45b259ce832`, `walking-corridor.ts` `18d119d735c64373a6ce8598a6d81b57f9ac572dacf3a043b8f5b3d5f626922a`, and `test/walking-path.test.ts` `0ef1099ca9b1917d323066df13295369a490821193dba69cc7d247bb7b5f7b00`. The first three live under `src/agents/population/`.

Exact authored document targets are preserved in [walking handoff](../snapshots/46_walking-candidate.md), SHA-256 `6c06d81812924e6a8373fa41609bc03119e344bf06c840f4144256032e915803`; [turn report](../snapshots/46_stationary-turn.md), `7822caedb1901380dc77aef722e7d0acbbd28beab9534de34bfe32fb629123cc`; [withdrawal report](../snapshots/46_waiting-withdrawal.md), `aba07a0a96df0ad97e009f21a1f9a5893d0105cc8699d952ff0b46da6e328298`; and [first visual attempt](../snapshots/46_visual-first-attempt.md), `70374eb51f4511bba355b5fed2ed1eb3ef3117b043b4b8d87948ab09fc551fb9`. Raw patches, case rows, counterexamples and manifests remain ignored; their preservation is required until a recoverable successor accounts for these rejected bytes.

## Reviewers and coverage

Codex `motion_review` independently read the four new files, exact turn extension and its inherited controller, finite admission/denial/cancellation harnesses, source-reference postcheck and authored limits. It verified 57 manifest-bound files in both author and review trees, inspected the 72 reference-input bindings, ran focused checks and constructed the two actual-API counterexamples below. It authored none of the reviewed implementation. Root inspected both counterexample artifacts and accepted F26 and F27 as material findings.

No second CLI review was run in this round. No reviewer browser, GPU, city population run, full gate, data writer, installation, primary edit or commit occurred. Native gait appearance coverage is unavailable: the author's first diagnostic produced 0/36 frames. This review does not substitute geometry checks for missing images.

## Reports

### Codex motion_review

**Reject both bounded candidates pending F26 and F27 repair.** The source/physical-distance separation, conservative rectangle sweep and actual-foot admission boundary are useful contracts, but the exact implementation can cross a source hold and misdescribe a new departure. These failures are distinct from the explicitly provisional source-surface policy and do not require changing that policy to reproduce.

**F26 — a constant-source connector passes the earliest physical hold.** At `walking-path.ts:250–253`, the hold clamps only positive source progress. Two straight 2 m occurrences with offsets 0 and 1 m, a valid zero join window and flat support produce a 1 m physical connector whose source station is constantly 2. With `sourceHoldM:2`, `advanceWalking` travels to X=1, Z=2, physicalM=3.000000000000001, then reports `heldBy:"source-hold"`. The earliest physical preimage of the hold is X=0, Z=2, physicalM=2. A later call stays held, so the error is the first overrun, not a repeated advance. The same path with a named disk at X=.6, Z=2, radius .1 and a .2-by-.2 rectangle stops correctly at X=.4 with that owner's identity. The disk control proves the separate physical guard runs; it does not close the source-hold contract. Preserve a conservative occurrence-local physical pullback for a hold, including plateaus in source station, rather than permitting physical motion merely because its source increment is zero.

The exact reproduction is `artifacts/review46/independent-path.ts` and its JSON result in this review tree. It invokes the frozen builder and advance function. Its `earliestPhysicalPullbackHeld:false` is the failed contract result; the diagnostic command's zero exit only means the measurement completed. No production mutation was needed to expose the defect.

The probe SHA-256 is `52dbd183106622af4d598552cccf8bab9034bac38aa2feb39a1db6c35f495780`; its result is `9038fc672c9bc33ab926afbea0ff11e60f7da86c39a3cf54da8b8eb28bc3a7ba`.

**F27 — a same-foot landing and new departure are combined into an advance proposal.** At `controller-turn.mjs:269–272`, proposal kind is selected from the foot's pre-update mode alone. In the already-authored after-liftoff cancellation trajectory, tick 21 at .35 seconds finishes foot 0's flight and immediately starts another foot 0 flight. The callback receives `kind:"advance"`, old airborne position/velocity/acceleration, and the new swing start/apex/end and target. Thus the declared proposal is not an accurate description of the newly authorized departure.

The independent `artifacts/review46/independent-turn.mjs` uses the exact controller and source-reference loader. A callback denying every labelled departure after the first misses this second liftoff and refuses only at .683333 seconds. A control inspecting the actual newly added liftoff event refuses at .35 seconds and preserves the prior feet exactly. The retained author case records the same mode mismatch. Represent the old continuation/landing and new departure accurately, or defer the new departure to a distinct update; repair must also bind the new proposal's initial state to its actual flight. A flag-only repair cannot establish that trajectory contract. The original one-denied-departure fixture does not cover this same-foot boundary.

The probe SHA-256 is `3feb559dc5192cc9c6e16fe310529b35b8682f4d58d49751d7d6b7bfd8c2f538`; its result is `71d146858eb08bf4fa50cfbed609e17f19312da64e845b5c6ef7e13b26773da1`.

The remaining evidence supports narrower positive conclusions. Y is fitted before stored 3D arc, physical travel and turn time are accounted separately, corridor checking is explicitly centre-only, and the rectangle sweep uses a conservative translation-plus-angular-motion bound. Byte copies and expected digests remain paired through asynchronous hashing. The support query retains strict coverage and named level/cover refusals. Its nearest source-Y anchor and current OSM facts remain exploratory; matching expected hashes does not grant historical surface authority. All paths remain `productionReady:false` and turns remain unverified locomotion.

The finite cancellation supplement correctly repairs an evidence gap without changing the controller: both signs observe live waiting at tick 1, cancellation at tick 2 and no foot events; both ignored-withdrawal controls fail at tick 2. Its six arms retain all 726 poses. This does not cover F27 or arbitrary cancellation. The prototype still rejects nonzero speed once turnControl exists; completed-turn handback to walking is absent. Steps/curbs, finite sole support on city surfaces, whole-body corridors and population naturalness remain open.

The full-mesh reference checks use the delivered palette and independently evaluated source endpoints, including wrong-bind and single-calf controls. The reviewer reran the retained-phase postcheck without controller updates: 181 phases, 362 source poses, 7,617,928 drawn-vertex comparisons and zero components beyond the unchanged quantization bound. Results match the authored postcheck exactly; maximum independent-source discrepancy is `6.621884765277084e-7` m. This supports reference correspondence, not turn appearance or the safety of every intermediate foot sweep.

The author visual run stopped before creating a page because Windows PowerShell's serialized creation date failed the process-identity classifier. Its exact incomplete manifest hash is `ff4897be43f7b0db05df2306e568ce5e402ab11e3a13e729fbeaec92310807b7`. The preliminary non-finite Date.parse handling and unavailable last-child inventory are disclosed in the retained report. The author's separate scoped absence check is attributed there; this reviewer did not rerun that launcher or independently observe a rendered frame. No appearance verdict follows from 0/36 captures.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F26 | Source hold allows physical traversal through a constant-source connector. | Root accepted as material after inspecting the actual API result; open. | Separate v2 must stop at the earliest applicable occurrence-local physical hold and cover plateau, join and rectangle interactions. |
| F27 | Real same-foot redeparture is labelled continuation and combines incompatible old/new flight state. | Root accepted as material after inspecting the exact event/proposal record; open. | Separate v2 must describe and admit the actual new flight, with the same-foot boundary and denial control retained. |

Source-policy, steps, resumption and appearance limits are disclosed unfinished scope, not new findings or invented acceptance. Root owns successor scope and integration; this report makes no implementation changes.

## Verification

- `node node_modules/vitest/vitest.mjs run test/walking-path.test.ts`: 19/19 pass, 50 ms test time and 522 ms total. These tests did not catch F26 or F27.
- `node node_modules/typescript/bin/tsc --noEmit`: pass in the review tree.
- Independent actual-API source-hold and same-foot controls reproduced F26/F27; the explicit disk and actual-event-denial controls behaved as described. No repaired implementation was tested.
- Retained-phase full-mesh postcheck reran with only its input/output locations adapted; zero controller updates, exact result equality. Independent case-row inspection checked all 726 cancellation poses, the live waiting/cancelled transitions and both named red controls.
- `artifacts/review46/evidence-check.json` records 57 author/reviewer target matches and 72 unchanged reference bindings. No source target was fixed or overwritten. Four authored snapshots are exact byte copies.
- Fleet `work-docs.mjs check` refused the inherited `docs/work/0_shibuya-1km/handoff.md` path, which is outside its allowed plan/design/review/snapshot/history structure. That pre-existing path was not changed. This report uses all six required review headings; it does not claim a green repository-wide document check.
- No full suite, full gate, scene regeneration, new source request, GPU rendering, native appearance inspection or production integration was performed. Reviewer commands exited; no task-owned server/browser/GUI was launched. The isolated worktree and ignored counterevidence are retained for handoff.

## Round outcome

Rejected within the scoped pure-path and stationary-turn contracts for material F26/F27. Preserve this exact round, targets, counterexamples and unavailable 0/36 visual result. A separate repaired v2 and independent next-round review are required. No city, source-authority, step, walking-resumption, appearance or performance acceptance is granted.

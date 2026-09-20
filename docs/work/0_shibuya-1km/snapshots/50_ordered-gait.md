# F27 ordered stationary-turn v2 handoff

The ignored v2 candidate implements the approved ordered transition and passes the bounded CPU controls. Independent review remains required. It is not wired to production, accepted walking support, a renderer, or the four frozen pure-path files. Worktree: `artifacts/walking-path-v2`, base `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`; primary has advanced independently. No GPU, browser, city rebuild, install, performance run, commit or shared-process mutation occurred.

## Exact candidate and boundary

- Rejected copied v1: `controller-v1.mjs`, SHA-256 `4afb9a13f2b7c5ffbfee8bfdbafbbc65f26d2247071632357a2df34d151a9649`.
- New copied candidate: `controller-v2.mjs`, SHA-256 `59d833ec8da1a8bbc89822ebd871b1a4b160d018dc9ab9b09b5cb46b8d1fc4e6`.
- Exact patch: `controller.patch`, SHA-256 `40de70895d9a95ef3a60b8f9b8ee7e510119e4c8ec1f27a15f9f500200b05ec4`.
- Approved mechanism: `ORDERED-TRANSITION-PLAN.md`, SHA-256 `f7b777ff6f6388a4272d3d6e7673816feababcaf23bcf1f34c0d99881caf4bf4`.
- Earlier F26/launcher freeze `51b30d2c0fd81215eb3f7750d66fa3c33d35d331237a333bea83f753ceba7061` and all 27 files it binds remain unchanged. All five original experiment freeze hashes remain unchanged. `integrity.json` lists the exact checks and the 26 source/reference pins plus the two local executable imports. The four pure files and launcher candidate were not edited for F27.

An update beginning airborne advances or lands that existing flight and cannot initiate a new one. An admitted landing is committed. A later update beginning planted may propose a fresh departure from that committed p/yaw and zero velocity/acceleration. Admission precedes adoption. A denied departure preserves the committed landing; a denied advance preserves the preceding flight state. Existing in-flight retarget and cancellation/freeze decisions remain unchanged, including the inherited rule that an absent turn request marks every continuing update as cancelled.

Each proposal carries a `trajectory`: scope (`evaluated-update` or `proposed-flight`), from/through/evaluated-through times, actual p/v/a and yaw derivatives at the origin, selected target, unchanged flight start/apex/end, and quintic coefficients for X/Z/yaw plus the actual vertical pieces split at the apex. Coefficients are anchored at their explicit origin/deadline. A sampled landing followed by a remainder of that update records a hold after the exact end. An advance describes the target actually selected during that update, after retarget/freeze. A departure describes the proposed flight from its committed plant. `observedNext` includes full p/v/a/yaw derivatives. The original `advance()` calculation remains unchanged; the optional description path is used only by the ignored stationary-turn extension.

This metadata is an explicit trajectory for admission; it does not itself prove world collision safety. The only support fixture is an explicitly admitted flat Y=0 plane, with separately denied swept-shoe cases. Source/physical distances and body/yaw remain the actual caller inputs and are never changed or forged by the controller. The existing refusal of nonzero speed after turn control is retained; this is not turn-to-walk handback.

## Old red / new green

`ordered-control.mjs` runs 16 arms: v1/v2 × both signs × allow / deny-labelled-departure / deny-actual-liftoff / deny-advance. Each plans 66 poses at 60 Hz; 528 of the 1,056 planned poses are observed. The remaining 528 are the declared tails after actual refusals. Every arm runs, and every actual refusal/event is retained in `ordered-result.json`.

The exact v1 goes red for both signs. After cancellation at tick2 with actual body yaw held at ±3°, tick21 lands and redeparts the same foot in one update, labelled `advance`. Kind-based denial misses it and eventually refuses the other foot at tick41 (0.683333 s); event-based denial refuses at tick21 (0.35 s). Its mixed flight metadata and missing explicit trajectory are retained.

All eight v2 arms pass their expected assertions. Tick21 commits only the old landing. Tick22 (0.366667 s) proposes the next departure; kind/event denial agree and preserve that committed planted state. Denial of an advance at tick10 preserves the preceding airborne state. No landing update contains a new liftoff. A fresh departure's origin exactly equals the previously committed plant. Independent polynomial evaluation checks 2,616 components against `observedNext`, maximum absolute difference `7.022160630754115e-14`.

The additional read-only recorded-interval check covers six actual normal/cancellation schedules: 360 advances, 18 departures, 48 changed targets, 224 frozen advances and 18 apex-split updates. It checks 9,472 origin/target/end-state components with the same maximum difference. The independent target calculation matches the actual current-input extrapolation. The first version of this checker incorrectly treated withdrawal as a one-time change and failed its expected-frozen assertion on a later cancelled update. Both that checker and its red stderr remain intact. `interval-control-corrected.mjs` explicitly models the inherited repeated-absence freeze rule and passes on the same recorded updates; it executes no controller update. The controller was not changed or rerun to resolve that instrument error. The initial preparation script also encountered a CRLF-versus-LF matching assertion before any candidate was written; correcting the script's match produced the one tested semantic candidate.

## Actual schedule and contact controls

`full-control.mjs` reuses the original real source rig, rendered vertex selection, full-weight packed evaluator, source-palette controls, and contact thresholds. It drives the retained `RenderLoop` with same-tick update then pose at 60 Hz. There are 17 arms, 2,057 planned poses and 1,879 observed poses: two no-turn baselines, six completed turn/cancellation cases, two swept-foot refusals, six delayed reference/withdrawal/mutant cases, and the suppressed-departure control. Only the two expected swept-foot refusals end early, each at tick31 with 32/121 poses and 89 unobserved tail poses. The other fifteen arms observe 121/121. `full-checks.json` does not count the expected red mutants as accepted behavior.

| Case, both signs | Actual input event | Liftoff ticks | Plant ticks | Final feet/body alignment |
| --- | --- | --- | --- | --- |
| ±90° in 0.5 s, then held | Body stops at tick30 | 1, 22, 43 | 21, 42, 63 | tick63 = 1.05 s; v1 tick61 = 1.016667 s |
| Withdraw after first liftoff | tick2, body held at ±3° | 1, 22, 43 | 21, 42, 63 | tick63; first two departures use the same foot |
| Withdraw one sample before first landing | tick20, body held at ±57° | 1, 22, 43 | 21, 42, 63 | tick63 |
| Delayed reference | Live waiting at tick1/yaw0; body starts tick3 and stops tick32 | 3, 24, 45 | 23, 44, 65 | tick65 = 1.083333 s; v1 tick63 = 1.05 s |
| Withdraw while genuinely waiting | Observed waiting tick1; withdraw tick2 before reference departure3 | none | none | Cancelled/settled tick2, no pending request or changed anchors |

The extra two ticks in completed turns are the deliberate one-update separation between three flights. They are not hidden with altered physical/source distance. Both waiting-withdrawal mutants retain the absent request only in harness input and are rejected at tick2. The original controller with stationary departure suppressed produces zero liftoffs and fails eventual alignment. The original no-turn stationary/moving baselines match all 242 state rows and 232,320 matrix values exactly.

Across the 1,879 measured poses, including controls: 1,191,286 sole-vertex and 3,032,706 whole-shoe observations; maximum planted horizontal drift 0.115307 mm, planted minimum absolute Y 0, measured whole-shoe penetration 0. Normal ±90° cases have maximum drift 0.085193 mm. The same thresholds remain: planted drift <5 mm, absolute planted minimum Y ≤15 mm, penetration ≤15 mm. These finite results do not transfer to other bodies, scales, support surfaces or update rates.

The evaluator checks 2,546,324 full-body vertex comparisons at the retained event/endpoint schedules, maximum packing difference `1.527920298187881e-7` m, below the unchanged `1e-5` m bound. All 21,044 actually selected drawn vertices agree with the independent idle/walk source within the retained quantization bounds; zero components exceed them. The wrong bind-palette control produces 41,797 failing components and 0.517492 m maximum error. Perturbing the calf moves 1,223 vertices by up to 10 mm while packed correspondence stays below the same bound. Injected 10 mm sole drift and −20 mm penetration are red under the unchanged thresholds.

Both denied sweeps use actual shoe vertex16522 at the midpoint of the proposal's polynomial flight. Its distances outside both endpoint hulls are 74.914 mm and 75.005 mm for the two signs; the 10 mm analytic unheld-owner disk intersects the intermediate point. Each refuses before any candidate liftoff. Held body authority does not admit that moving foot. This is a finite denial witness, not a continuous swept-mesh collision solver or source-level support approval.

## Handoff limits and resources

One semantic controller candidate was tested; the exact v1 and every failed control remain preserved. The CPU full-rig command took about 5.3 seconds as an execution observation, not a performance result. No thresholds, source palette, rig, dependency, authored model or production file changed. The ignored handoff and all raw outputs are intentionally retained for independent review; no temporary process or server remains. The approved next review can inspect the exact patch, old red/new green, changed timings, source bindings and both instrument versions before deciding any further scope. No native images exist for v2, and no GPU capture is authorized by this handoff.

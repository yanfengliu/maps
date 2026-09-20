# Stationary-turn prototype: one bounded attempt

The copied controller performs the two requested ±90° body turns and finishes with both feet planted at the final home anchors and body heading. It also preserves contact in the measured live-stop cases. **The requested control coverage is incomplete:** the two nominal before-departure withdrawals happen at initialization, before any live pending turn exists. Their raw `passed: true` fields describe their local numeric assertions, not acceptance of the requested pending-withdrawal control. No repair or second controller attempt was made.

Candidate SHA-256: `4afb9a13f2b7c5ffbfee8bfdbafbbc65f26d2247071632357a2df34d151a9649`. Its parent controller remains `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`. The exact parent copy, candidate, construction script, source patch, harness, raw results, every turn case, postcheck and this report are bound by `freeze.json`. Both earlier pure-path/pivot freezes remain unchanged. No tracked or production source/test/docs, model, palette, dependency or source data changed.

## Mechanism and scope

The ignored candidate adds optional `input.turn = { id, targetYaw }` and an explicit third `admitFootMotion` callback argument to `update`. The no-turn/no-prior-turn path delegates to the original update. Stationary turn updates use a copied draft state; a departure or airborne continuation proposal must receive analytic support/foot-sweep evidence before the state is adopted. A rejected departure preserves its original planted foot anchors and emits `stationary-turn-foot-admission`. Body XYZ, actual body yaw and authority stay caller-owned. Every retained turn input has speed 0, source distance 0, physical distance 0 and body XZ [0,0]. The controller does not create travel to trigger a swing.

The explicit fixture is an infinite flat Y=0 support plane. Allowed cases have no obstacles. The denied case places a named synthetic owner disk at a measured intermediate point of the proposed foot sweep, outside both endpoint shoe convex hulls. This is a deliberate analytic negative fixture, not admission of city support or source policy. No permission is inferred from the body being held. Source/landing identities are explicit `analytic-flat-y0`; they must not be read as accepted scene surface IDs.

The candidate retains the four-factor duration search, nine-sample forecast, swing height 35 mm, lowering cap 35 mm, margin 3 mm, reach reserve 2 mm and target freeze 60 ms. A forecast landing heading is capped at the requested terminal heading. On request withdrawal/replacement, an already airborne foot keeps its admitted landing. Further departures realign the feet to the actual halted body yaw. Numerical alignment tolerance is 1e-8 for endpoint equality; the 5 mm drift, 15 mm height/penetration and 1e-5 m packing checks are unchanged. Source animation phase advances through real foot swings and is recorded independently of zero travelled metres.

This is one near commuter-male rig at scale 1, initialized at phase 0, on the flat fixture, observed at 60 Hz. It is not native visual acceptance, joint comfort, arbitrary-command safety, a continuous sole sweep certificate, body/sole corridor acceptance, heterogeneous population behavior, runtime integration or performance acceptance.

## Observed cases and time

Each ordinary case plans 121 poses at ticks 0–120 (two seconds), with 120 same-tick update/pose callbacks. The exact body rotation is ±90° over ticks 0–30 (0.5 seconds), then a held body pose through two seconds. The nine candidate case records retain a total planned denominator of 1,089 poses and observe 1,000. All 89 unobserved poses belong to the deliberate denial, which stops at its first refused update; no other case is omitted. The two paired no-turn cases each observe 121/121 poses, and the suppressed-departure negative control observes another 121/121.

| Case | Observed/planned | Foot liftoffs/plants | Stop trigger | Final foot alignment |
| --- | ---: | ---: | --- | --- |
| +90° and −90° | 121/121 each | 3/3 each | body halts at 0.5 s | both aligned at 1.016667 s |
| ± stop one tick after liftoff | 121/121 each | 3/3 each | tick 2, 0.033333 s; actual liftoff tick 1 | both aligned at 1.016667 s |
| ± stop one sample before landing | 121/121 each | 3/3 each | tick 20, 0.333333 s; planned landing 0.346667 s, observed plant tick 21 | both aligned at 1.016667 s |
| ± nominal before departure | 121/121 each | 0/0 each | tick 0, before initialization creates a pending request | numerically stationary; required live cancellation coverage missing |
| denied sweep with body held at 90° | 32/121 | 0/0 | refusal tick 31, 0.516667 s | refused, original feet/anchors preserved |

Both full turns depart feet in order 0,1,0. Liftoffs occur at 0.016667, 0.35 and 0.683333 seconds. Observed plants occur at 0.35, 0.683333 and 1.016667 seconds; exact internal landing times are 0.346667, 0.68 and 1.013333 seconds. Thus completing the feet takes about 0.517 seconds beyond the body turn. Final yaw errors are zero and final home-anchor residuals are at most 2.8e-17 m.

After-liftoff cancellation holds the body at ±3° from tick 2 onward and lands the first already-admitted foot before correction. Foot order is 0,0,1, because the largest remaining error belongs to the same foot after that first landing. Before-landing cancellation holds the body at ±57° from tick 20 onward and uses order 0,1,0. All final anchor errors are below 3.2e-17 m and yaw errors below 1.2e-16 rad. These event sequences are disclosed rather than labelled natural turns or strict alternating-foot gait.

## Contact, full mesh and controls

The six meaningful completed turn/live-stop cases stay below 0.081525 mm maximum planted horizontal drift over the original 317 drawn sole vertices per foot. The exact Review40 14-vertex subset stays below 0.061480 mm planted 3D drift. Maximum absolute minimum Y per planted foot is 0, measured whole-shoe penetration is 0, and additional lowering is 0. These minimum-Y metrics do not assert every sole vertex is at Y=0. Every pose checks both whole shoes, 807 drawn vertices each.

The eight completed turn/cancellation cases plus refusal compare 1,073,244 complete-weight drawn vertices at initial, terminal, contact-event and failure rows. Maximum packed correspondence error is 1.524739e-7 m. The same source-reference controls as the previous pivot experiment run before interpretation: wrong-bind palette gives 0.517492 m maximum error and 41,797 out-of-quantization components; zero correction is within 2.25e-16 m; a 10 mm single-calf perturbation moves 1,223 vertices and keeps packing error below 1.505e-7 m.

A separate read-only postcheck evaluates every one of the 181 retained source phases in both source clips against independent evaluated-source endpoints and delivered VAT. Its 362 source poses cover 7,617,928 drawn-vertex comparisons with zero components outside the unchanged quantization bound; maximum evaluated-source discrepancy is 6.621885e-7 m. This postcheck makes **zero controller updates** and creates no new input trajectory or candidate attempt. It also reconstructs the exact Review40 sole subset from all retained pose rows. All source/dependency inputs are pinned and checked unchanged; the postcheck records 72 input files.

The paired no-turn stationary and straight 1.1 m/s controls compare 242 complete state records and 232,320 pose matrix values exactly against the original controller, with no differences. This is a regression check for states that never entered a turn; it is not turn-to-walk resumption coverage.

The unchanged controller used as departure-suppression mutant retains zero foot events. It passes planted contact but fails the independent turn-completion requirement with 90° final foot yaw error and 0.257219 m home-anchor error. Actual-vertex controls reject a 10 mm horizontal slip and a 20 mm downward displacement without changing the foot labels or bounds.

The denied-sweep case uses an actual drawn shoe vertex (ID 16522) at intermediate XZ [0.0739414063,−0.0585085556]. The synthetic owner disk has radius 10 mm; its centre is 74.914452 mm outside both endpoint shoe convex hulls. The intermediate point is inside the disk, so checking only the endpoints would miss this contact. The callback refuses before the departure is adopted, records the proposal and witness, and preserves the two planted anchors and zero foot events. The held body remains XYZ [0,0,0], yaw π/2. The refusal is intentional evidence, not a failed asset or hidden dropped route.

## Required coverage gap and API limits

At initialization tick 0 the inherited `init` ignores `input.turn`; it creates no `turnControl`. In the uninterrupted references, update tick 1 receives actual yaw ±π/60 and the request, creates `turnControl`, and immediately starts the first departure. The harness computes "one tick before first departure" as tick 0, withdraws the request before any update, and keeps yaw 0. These two cases exercise no-request stationary behavior. Their 121 rows are real, but their live pending-withdrawal interpretation is not. The postcheck records `coverage.complete:false`; this report overrides any broader reading of their raw local pass flags.

A live pending state **can exist with the current API**: a zero-yaw actual body update with a target of π/2 creates `turnControl.status:"waiting"`, because current yaw rate is zero and there is no foot error against the immediate forecast, while the requested terminal yaw has not been reached. This follows from the candidate code; it was not executed in the one attempt. The smallest separately authorized future discrimination would retain yaw 0 with a live request at tick 1, retain that request through tick 2 in the reference, and begin body yaw at tick 3. The withdrawal arm cancels at tick 2 after a real waiting state at tick 1, one tick before the reference departure at tick 3. Both signs and the actual waiting→cancelled state would be required. No such rerun occurred here.

The candidate is deliberately still a stationary-turn experiment. Once `turnControl` exists, the wrapper rejects nonzero speed; there is no completed-turn handback to ordinary walking yet. No-turn paired regression therefore cannot establish resumption behavior. The admission fixture proves this analytic plane/denial only; real surface intervals, physical authority and rotating sole support remain separate. Contact metrics and reference correspondence do not accept the turn's appearance or joint posture.

The single controller attempt took about 3 seconds and the read-only retained-source postcheck about 4.2 seconds. These are resource observations, not benchmark results. No browser, GPU, city run, data writer or background service was started. Evidence is intentionally retained for independent review. No controller repair, threshold adjustment, automatic retry or commit was made after the one attempt.

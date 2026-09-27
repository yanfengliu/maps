# Owner168: deterministic pair-local scheduling component

2026-09-27. **GREEN for the frozen three-case point-motion component; movementAccepted:false.** Exactly one full real candidate invocation ran after the adapter and design were frozen. All14 movement checks pass in each case, the actual imported reused-instance reset passes, and27/27 instrument controls pass. No product code changed and no runtime movement acceptance is claimed. Independent candidate review and comparison remain with root.

## Mechanism and its bound

The reset geometry chooses the actor nearer the join as permanent pair leader, with slot only breaking a tie. The leader advances at its cadence/segment/authority cap if its proposal clears the stationary follower. The follower advances at its own cap only when its proposed segment clears the leader's entire remaining polyline; otherwise it emits an observed zero move. The condition is a conservative geometric reservation, not a network authority lease or a liveness proof. The adapter does not read caseId, tick, historical failure/grant times, or the end tick. It imports nothing and performs no IO, subprocess or global mutation. Its state is wholly replaced on reset.

The extra numeric guard is derived from Float32 publication precision plus a double-arithmetic margin. It never changes the observer's strict nominal separation threshold. The fixed trim0.5 polyline remains a disclosed comparison input. Its runtime construction and support are unqualified.

The actual measured endpoint separation below is independently computed by the observer from published Float32 positions and unchanged radii. It is distinct from the adapter's conservative remaining-polyline condition. The latter has not received a standalone floating-point proof or an independent swept-motion verifier; the component's green endpoint check cannot supply either.

## Frozen identities and sole command

Workspace: `C:/Users/38909/.codex/worktrees/crowd-admission/maps`, detached base `bb4532df4e4cfd7d2cc3c072a951d9dc6ada3f7c`. Executable: Node v24.12.0. No dependency changed.

- Candidate `adapter.mjs`: SHA-256 `e104ff7c762c9d9196d505aa65065a5c644935eb00c8a6cf02b9bf04586e7347`.
- Pre-run adapter/design/probe/source freeze `pre-run-freeze.json`: SHA-256 `fad5f8023f4480868717d0318c902ae51a71d91f345e11134acfa38323e75546`.
- Admitted instrument `artifacts/crowd-motion-benchmark-repair-20260927/freeze.json`: SHA-256 `1182ca7ccc862dc18e8a738ecaba450a9700f87c2b2ac65d409af6a60d5eabab`.
- Frozen real `inputs.json`: SHA-256 `d5010643a6c98557b95782f8f9e3f3c6406781b4d74a5f970972eca807f028eb`.

The only full candidate command was:

`node artifacts/crowd-motion-benchmark-repair-20260927/run.mjs --candidate C:/Users/38909/.codex/worktrees/crowd-admission/maps/artifacts/motion-local-scheduling-20260927/adapter.mjs`

It returned exit0 with outputComplete:true. The owned hidden child was PID11704; wrapper wall time4857ms. This includes the instrument's baseline and control work, so it is not an isolated scheduler performance measurement. `run.log` retains the exact stdout. No full rerun, candidate variation, mutation run or scoring-threshold change occurred.

The unique output directory is `C:/Users/38909/.codex/worktrees/crowd-admission/maps/artifacts/crowd-motion-benchmark-repair-20260927/runs/2026-09-27T16-07-57-574Z-11704/`. Its `result.json` is SHA-256 `4bdbe2121c14890b64ecc4d0e0214a2442e51ca54cd854a03c56afe2589e1928`; its `output-seal.json` is SHA-256 `55f714c3ce77a1264e9876cce43bbfee36b0e11c8a9bab49b5e52c90c4aecb58`. All11 files named by that run seal were checked after completion.

The immutable instrument still writes its historical `SELF_CHECKS_PASS_SCORING_NOT_ADMITTED`, `instrumentReviewRequired:true`, and `NOT_ADMITTED_PENDING_REVIEW163` metadata. Root supplied its external admission after review163; no frozen instrument metadata was edited. `candidate.componentPassed:true` and `movementAccepted:false` are the actual retained fields.

## Measured cases

Each case retains actual tick rows, proposals, publication, footprints, requests, grants, authority observations and held commitments. Every check is true: initialPose, initialSeparation, finite, separation, physicalBudget, charged, sourceMonotone, authority, footprints, completeObservers, completeRun, progress, generation and noCancellation. First-loss, first-budget and first-unauthorized witnesses are null in all three cases. Maximum budget excess is exactly0 in all three.

| Start | Steps / resolver calls | Plans / publications / observations | Requests | Denied-request ticks | Returned grants / held observations | First denied | First grant | Join exits, slots1 /293 | Minimum published clearance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|2345|2031|4062 /4062 /4062|1051|969|82 /82|3351|4320|4333 /4375|0.013014475411381121m|
|2400|1976|3952 /3952 /3952|1052|970|82 /82|3350|4320|4333 /4375|0.013014475411381121m|
|2500|1876|3752 /3752 /3752|1052|970|82 /82|3350|4320|4333 /4375|0.013014475411381121m|

All minimum-clearance observations occur at tick4334. All cases run to tick4375 because the observer stops after both joins exit,1342 ticks before the fixed5717 bound. That is the pre-existing observer completion rule, not a candidate early return. These observed grant and exit times do not occur in the adapter's code or policy.

| Start | Slot1 final source / physical arc | Slot293 final source / physical arc |
| --- | --- | --- |
|2345|60.18002183148301 /18.55070025479801m|59.44083249293932 /18.54972189288404m|
|2400|60.18002183148301 /17.58270318425816m|59.44083249293932 /17.581388637508883m|
|2500|60.18002183148294 /15.822726217110679m|59.44083249293932 /15.82127049641966m|

Maximum selected advance/budget is0.01759974615580092m for slot1 and0.019644246379906933m for slot293, exactly each actor's unchanged cadence times dt. Budgets equal advances and every advance is charged. Final source and physical arc are distinct fields, not interchangeable travel measurements.

Both actors still hold entered real commitments at the local join exit: routeIndex1, lastConflictIndex5. In every case slot1's heldSeconds is0.9166666666666679 and slot293's is0.41666666666666663. Therefore this result does not prove traversal or release of the complete compound junction. `analysis.json` retains full per-case clocks, checks, counters, witnesses, final commitments and trace hashes.

## Visible holds and finite work

| Start | Slot1 zero / positive steps | Slot1 longest zero streak | Slot293 zero / positive steps | Slot293 longest zero streak |
| --- | --- | --- | --- | --- |
|2345|970 /1061|970|1077 /954|971|
|2400|971 /1005|971|1071 /905|972|
|2500|971 /905|971|1061 /815|972|

These count all zero advances, including authority waiting and geometric scheduling, without attributing every hold to one cause that the trace did not instrument. The follower first advances two ticks after each case starts. A long hold therefore remains visible; it was not hidden or dropped to obtain a green separation check.

The frozen control flow is O(N) per tick with at most20 leader path nodes for these inputs. The actual guard-call count was not instrumented. Without re-executing the candidate, positive proposals prove the following minimum numbers of completed distance predicates; an upper bound counts every possible leader and remaining-polyline predicate on every retained tick.

| Start | Known leader checks | Known follower path checks | Known total checks | Total checks upper bound |
| --- | --- | --- | --- | --- |
|2345|1061|12917|13978|23224|
|2400|1005|11943|12948|22062|
|2500|905|10256|11161|20086|

Failed guard indices and authority-bypassed calls were not recorded, so these bounds must not be quoted as an exact total. `analyze.mjs` derives them from retained positive moves and node/arc counts, without importing or invoking the adapter. No extra candidate execution was used to recover a performance number.

The route can still deadlock when the fixed leader's future suffix passes near a stationary follower, when a looping suffix closes all follower advances, when a blocked leader has priority over an actor needed to clear its way, or when terminal geometry cannot provide safe spacing. There is no backtracking, priority swap or fairness mechanism. These are named limits, not resolved by the three finite exits.

## Reset and control evidence

The actual imported candidate instance ran8 steps in generation1, was reset and ran8 steps in generation2, then was compared JSON-exactly with a fresh generation2 instance. observationsComplete, noHeldLease and sameObservedGeneration2 are all true. Every arm has8 steps/resolves and16 plans/publications/observations, with0 requests, grants, denied-request ticks and held observations. Reset passed on the real imported candidate, not by substitution of the baseline's reset. The complete proposals and publication states are in result.json's candidate.reset. This is a fresh-authority fixture reset, not production generation retirement.

Eight pre-run synthetic checks passed: clear-path progress, approaching-follower yield, blocked-leader authority cap, future-bend exclusion, insufficient Float32 guard spacing, sufficient guard spacing, reused versus fresh generation2 state, and stale-context rejection. They contain no real input timeline and make no real-case progress claim.

All27 unchanged instrument controls passed in this same run, including actual over-budget travel, isolated uncharged arc, denied authority boundary, synthetic positive publication, baseline loss witnesses, indefinite freeze, missing observer/resolver, cancelled authority, skipped case, broken imported reset and stale generation. This worker did not rerun mutations.mjs or alter the admitted instrument. The three preserved baseline cases remain red as intended.

## Named adversarial audit

1. **Assertion accommodation:** no acceptance assertion, cadence, radius, deadline, real input, source or instrument changed. All294 inherited preservation pins, the code seal, the admitted freeze, six delivered599 source files and this candidate's pre-run files match after the run.
2. **One input mistaken for a class:** all three fixed starts passed, but they are nearby disclosed snapshots of the same pair. No blind or held-out claim is made; arbitrary routes and populations remain untested.
3. **Warm cache, ordering or retry masks failure:** the observer's real order and authority remain. Actual imported reused reset passed. There was one full candidate invocation, no retry and no warm-state substitution. Other process/order regimes remain open.
4. **Required work disappears:** both actors and all cases ran, every required observer count matches, and all three full traces are sealed. Successful finite exits use the existing observer stop rule. No steps or source population entries were deleted from the benchmark.
5. **Tuning against results:** design, adapter and input pins preceded the first full real candidate invocation. Only separately declared synthetic one-step probes preceded it. Input geometry was disclosed, so even pre-freezing supplies no holdout evidence.
6. **Failure goes quiet:** geometric or authority holds appear as zero advances and their counts/streaks are reported above. The unchanged finite-progress assertion passes here. Other path conflicts can still produce visible deadlock.
7. **Only the reproduction's conditions hold:** measured evidence is two pedestrians, fixed dt, one local path pair, one Node24 process and these exact bytes. No full simulation, other machine, renderer, concurrency or population evidence follows.
8. **Hard part relocated:** publication and authority remain in the admitted observer. Scheduling addresses local order; it does not supply runtime geometry, realistic dynamics, production lifecycle, anatomy/support or general deadlock resolution. Those gaps are retained rather than relabelled routine integration.

## Preservation, resource cleanup and remaining gaps

The only worker-authored files are in `artifacts/motion-local-scheduling-20260927/`; the authorized frozen runner created its own fresh unique run directory. No other new candidate's code, results or reports were read. The canonical search document was intentionally not opened because root warned it contains earlier candidate status; root confirmed this assignment carries its complete applicable contract.

The six pre-existing delivered599 paths remain byte-identical. Product sources, canonical docs, dependencies, data/network/cache, previous packets and Git were not written. No commit or push occurred. A final narrow process check found neither benchmark PID11704 nor any Node/browser process whose command line names this task's unique directory. No browser, GUI or server was started. All retained files are needed for the unresolved independent comparison; there is no disposable task output to delete.

Still open: runtime trim/path construction and source/support authority; acceleration, braking, jerk and heading feasibility; independent swept center/body checks; anatomical clearance and floor ownership; production generation retirement and full compound-junction release;3000 pedestrians/200 vehicles, realistic-scale performance and interactions; fairness, starvation and general deadlock; and rendered walking realism. The adapter's all-or-zero cadence policy is particularly discontinuous, and passing a point-motion budget does not establish believable walking.

This is a preserved green component candidate awaiting independent root review, not an integrated repair or a completed Shibuya movement deliverable. `seal.json` binds the final authored packet and points to the already sealed canonical run; its external digest is supplied in the handoff.

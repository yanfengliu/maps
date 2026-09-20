# F26 ordered segment observer

## Scope and disposition

Implemented the first increment admitted by Review 57: optional, read-only observations of the existing F26 advance sequence. The isolated worktree is `artifacts/walking-segment-observer/wt`, branch `codex/walking-segment-observer`, base `927250018e86db4c89c9063a8f5f166ee15eb391`. This is a candidate for independent review. Nothing is committed, integrated or production-ready.

The four unmerged F26 imports are retained separately under `artifacts/observer/baseline/`. Their source is `artifacts/walking-path-v2`; the original walking path hash is `fe8f579dde019abffb949abeaa2ea214abb4de1f7f0cf5958ac3f6cd916cafa0`. The two support modules and original 24-test file remain byte-identical. All 24 transitive relative dependencies match that retained checkout before and after the work. `baseline-manifest.json` records every path, length and digest.

Five candidate files would be added relative to main: those four imports plus `test/walking-observer.test.ts`. The observer's own delta is limited to `walking-path.ts` and the new test file. `candidate.patch` contains all five additions, while `observer-delta.patch` isolates the change from the exact F26 path baseline. Neither patch is a staged or committed change.

## API contract

`advanceWalking` takes an optional seventh argument, `WalkingAdvanceObserver`. It receives one frozen array after the geometric calculation and legacy result construction. A callback exception propagates and the call returns no result. The observer is diagnostic; it does not admit movement, schedule controller substeps, or provide an atomic controller transaction.

Each `WalkingAdvanceInterval` names the actual path step, mode, relative start/end times, detached pose/yaw endpoints, physical distance, source distance and any held remainder's owner. Pose snapshots include source station, occurrence/local station and copied support position, normal and triangle identity. Every nested object exposed by the defined pose contract is frozen and detached from the path, input state and result.

Move and geometric-turn intervals are recorded immediately after the existing operations. The movement equations, source-hold inverse, footprint sweep and legacy return shape are unchanged. The deferred callback cannot influence those operations through its argument. This is not a sandbox against unrelated side effects a callback performs through its own closure.

A held remainder has zero body/source/physical motion and retains the hold cause. A completed path records a `done` remainder. The existing loop can leave at most 1e-12 seconds unspent without a hold; that is explicitly `unspent`. Recorded time boundaries clip floating-point roundoff to `[0, dt]`; they do not change legacy elapsed time or pose. A test preserves the original 0.10000000000000002-second elapsed result while recording an exact 0.1-second interval endpoint. A changed pose rounded to zero interval duration is retained. These are diagnostic records, not a claim that a future controller accepts zero-duration events.

## Verification

Node v24.12.0. The final focused run passes 38 tests: all 24 exact original cases and 14 observer cases. The new cases cover source plateaus and no rewind at four start stations, hold/release, earlier footprint holds, a rotating footprint, mixed move/turn/move/hold within one 60 Hz tick, completed-path time, the existing loop tolerance, floating-point time roundoff, an empty supplied owner name, nested immutability and exception propagation. Three finite fixed-step route cases cover slope, an offset corner and a reversal. Every observer helper compares enabled/disabled legacy results through V8 serialization, retaining exact Number bits and signed zero, and checks interval ordering, continuity, total duration, source/physical differences and frozen endpoints.

The import-only replay also runs all original 24 cases with observation enabled. Its wrapper calls the actual retained F26 APIs and compares them with the candidate, both enabled and disabled. It checks 17 constructions, 85 explicit samples, 10 initial states and 1,255 advances. The 1,416 intervals comprise 1,076 moves, 303 unverified turns, 13 held remainders, six done remainders and 18 unspent remainders. All legacy results match byte-for-byte under V8 serialization. This is a finite analytic bound, not a proof for every possible numeric input.

`tsc --noEmit` passes. Final command receipts are `checks/candidate-tests-final.json`, `checks/original-observed-replay-final.json` and `checks/typecheck-final.json`.

Two deliberate observer mutations fail the intended tests on the final candidate. Dropping the held remainder reports `expected 0.011 to be 0.016666666666666666`. Reusing the mutable source normal reports `expected function to throw an error, but it didn't` at the normal-mutation assertion. `mutations-02/results.json` binds both mutant sources, failure output and the exact restored candidate hash. The first mutation driver's expected diagnostic string was too narrow for the second failure; its two raw failures and executed script remain under `mutations/` and `mutations-attempt-01.mjs`. That driver's nonzero result is not presented as a validated pass. A fresh corrected driver run validates both, then the final 38-test run passes after restoration.

The initial new mixed-tick assertion expected decimal 0.009 exactly, while the unchanged arithmetic yields 0.009000000000000001. The authored time expectation now uses 1e-13 comparison; enabled/disabled and retained-original output comparisons remain bit-exact. The original failing run is retained. No movement threshold was changed.

The candidate roster has zero selected credential/private-key patterns, no file above 22,707 bytes, and no whitespace diagnostics. This Git build returns one for clean differing files under `diff --no-index --check`; a separate trailing-whitespace control returns three and names the trailing whitespace. The first packaging attempt expected zero and stopped; `handoff-manifest.json` records the corrected, observed interpretation rather than calling the earlier refusal a code failure.

## Limits and handoff

No F27/controller, foot target, source-selection policy, route identity, population wiring or data changed. No source fetch, browser, server, native capture, GPU work, build, full unit gate, visual gate or audit ran. Those excluded gates and independent review remain required before a code milestone can land. Existing F26 strict origin support, unverified turns and production refusal remain intact. This observer establishes no foot support, natural motion, whole-city behavior or performance claim.

The sandbox refused worktree creation and esbuild's config read; approved scoped retries created only this worktree and ran the focused CPU checks. A read-only process census found zero task-scope processes and zero esbuild processes. Every test child was waited to completion. The sole read-only `node_modules` junction was verified and removed without recursive deletion; no data junction exists. The worktree and frozen evidence remain for root's independent review and integration. Root owns final gates, canonical status, commit, merge, push and subsequent worktree removal.

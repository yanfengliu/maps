# 1505 — Focused authority departure implementation review

Date: 2026-10-17. Independent reviewer: traffic1504_authority_review. Integration owner: root. Implementation owner: shibuya1498_visible_activity_feasibility. Reviewed uncommitted codex/traffic1499 worktree on base0681715. This reviewer changed only the separately authorized 1504 and 1505 authored reports, without source, test, index, cache or process mutations.

## Judgment and limits

PASS for the narrow internal vehicle departure-lifetime repair at the exact source pins below, with no material source finding. Root approved this internal semantic change after [1504](1504_authority-departure-diagnosis.md). The implementation keeps physical/source entered separate from logical irrevocable departure. It retains authority already used on green; it does not issue a new amber/red grant or suppress the actual missed-halt guard.

This is source plus focused-test evidence, not acceptance of the ordinary 24-vehicle milestone or the whole candidate. The failed candidate1 receipts remain FAILED. The new full flow, native motion, interpolation, occupied-walker behavior, final five gates, integrated review and main merge remain unverified in this review. The previous pair-clearance review is neither replaced nor expanded. A7–A10 and the full3000/200 target remain OPEN.

One required contract-document alignment was sent to the implementation owner: docs/reference/network-contract.md:27 still describes occupied() as only geographic entered commitments. It must also describe qualified observed vehicle approach departure as logical occupancy and an irrevocable used lease, while preserving entered as the geographic observation. That wording is pending here; no further source repair is requested.

## Inspected implementation

The patch captures one finite frozen matching ApproachHalt from the exact immutable qualified vehicle route during full request validation, before advancing authority time. A missing optional approach retains legacy behavior. A boundary entry or pedestrian request receives no new departure treatment. Matching source entry, immutable collection/record, uniqueness, nonnegative finite distances and body radius are checked. The accepted record is retained on the commitment, so subsequent departure uses its granted plan.

observe keeps its original footprint/progress and mapped-control validation before new state changes. It additionally checks bound generation and actual observed body radius for a retained approach. Only valid observed progress strictly greater than the retained halt plus1e-6m latches private approachDeparted. This does not modify the public entered predicate, source occurrence, completed-through index or published snapshot shape.

Expiration excludes departed commitments. occupied() includes departed logical occupancy, and cancelPending refuses it. These three sites agree on irrevocability. An actual entered vehicle retains the existing release requirement: progress beyond the real last conflict occurrence, final-tail condition and no physical footprint overlap. Mapped stop/yield obligations still run before any departure write. Fresh signal admission still uses canEnter, and no separate signal clock, route rewrite or population flag grants authority.

The approach fields share the existing Commitment object's removal lifetime. createAgents.dispose additionally drops its admissions reference after unregistering its fixed-step callback and disposing its population. The observed lifecycle test establishes that system-facing reader/reference cleanup; it does not claim a specifically departed lease was live in that disposal case. There is no new process, timer or separate departure-state resource.

## Actual verification inspected

I read the entire new vehicle-approach-departure test and the actual source diff. The production fixed-step test uses the unchanged ordinary seed5970698, 24 vehicles, zero generic pedestrians, the pinned actual network/fleet, and the real route/tick/admission import path. It independently pins halt210.61237747248603 and pre-transition progress211.14358118668997. At tick6179 it requires physical non-overlap and entered=false. Tick6180 must retain the lease, retain entered=false, advance progress, and contain no passed-uncleared refusal.

A separate synthetic signal/route exercises prephysical departure, cancellation refusal, logical occupancy, amber/clearance retention, full physical/source entry and tail-only release followed by the pedestrian stage. Other cases cover idle at/before-halt expiry, no-grant observation, fresh amber request refusal with the idle lease already gone, foreign route/generation, unqualified requests, oversized initial/observed bodies, mutable/nonfinite approach records with unchanged authority clock, and unchanged actual mapped stop/dwell requirements. Existing neighboring pedestrian/preentry/signal/authority tests remain included.

The retained old-authority control runs the actual tick6180 test and fails at the expected null lease. Its log has 1 failed and 6 skipped tests from the then-seven-test file; it is not evidence that all synthetic negatives were individually mutated. The preserved old admissions source hashes to the same7b5658ec baseline reviewed in1504. The final eighth test adds unqualified/oversized-body coverage, without changing the actual transition assertions.

The first restored-code check passed35 tests but failed the actual reproduction on Vitest's inherited5-second per-test limit; its actual test duration was11.101 seconds. The owner preserved that failure and assigned only this reproduction a30-second bound. The final inspected log records all55 tests across7 files PASS in25.15 seconds; the actual reproduction took8.765 seconds. I found no weaker assertion or reduced simulation window. The neighboring population-authority test also runs its existing uncommitted-motion red control.

I did not rerun these tests or launch a duplicate flow, browser, server or GPU task. Reported test execution is the owner's retained evidence, independently read against the held source. Focused source review permits the separately authorized next bounded flow check; it does not imply that check has passed.

## Exact pins

All digests are SHA-256, independently read by this reviewer. The source was held during review.

- src/network/admissions.ts,36493bytes: de59bdaf280cf2854aa7602cd1c9915a8b479b62c8c8734fedcfeb55bff7a7d7.
- src/agents/agents.ts,7087bytes: 021f5fcbc175e9027066832c2e0f26a1a7a1ce181055ed31ea12fd4572f36366.
- test/vehicle-approach-departure.test.ts,11126bytes: ccc2b3e4c4ee19850a2ab6e7cddd0d07e381a1f6d1ab678f6c110b9728672645.
- artifacts/traffic1499/admissions-before-departure.ts: 7b5658ecc74bdca29e97fdabbb795508f03f89b10e6ddad264dc52fbd3bd0f6a.
- artifacts/traffic1499/old-departure-red.txt: 4c3205a623bec956638a6dcaf3bdec95e25750d15eebfee760b0fd7231929fa7.
- artifacts/traffic1499/restored-departure-first-check.txt: 71456a15b1da6038a9602b0ce8cee546ade2c1c2684e7b48ab4cb182377ba888.
- artifacts/traffic1499/restored-departure-green.txt: caa2aa71c4403dfdb5dffc5fe456758ae36d747dd406ca08c28608ed13b3a3e1.

Source/data and failed-run provenance remain in1504. No task-owned long-running resource was created by this reviewer. The integration owner retains final acceptance and the pending documentation alignment.

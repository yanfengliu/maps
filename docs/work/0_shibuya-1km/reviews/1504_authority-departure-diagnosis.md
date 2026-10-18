# 1504 — Authority departure diagnosis

Date: 2026-10-17. Independent reviewer: traffic1504_authority_review. Source-read-only scope; root authorized only this authored report and the later separate 1505 fix review. Implementation owner: shibuya1498_visible_activity_feasibility. Worktree: artifacts/traffic1499/worktree, codex/traffic1499, base 0681715632e66ad825a3d78ac7d9282c5cb038b5. No code, tests, index, cache or browser mutations by this reviewer.

## Judgment and bound

Candidate1 remains FAILED. The first actual refusal is an inherited disagreement between irrevocable vehicle movement and pending signal-lease lifetime, exposed by the new central waypoint routes. It is not evidence of invalid source-edge assembly or a second pair-clearance defect. The current route-halt refusal is correct after the authority has removed the lease. The zero authorityViolations counter does not qualify this run.

Root approved a narrow internal vehicle departure-state repair after this diagnosis. This is design support, not implementation acceptance. No repaired source or runtime result was reviewed for this report. Full default flow, native motion, interpolation, performance, 3000/200 population and A7–A10 remain OPEN.

## Exact actual chronology

The immutable 600-second corrected-clearance run has 24 requested vehicles, zero generic pedestrians, seed 5970698 and a 1/60-second fixed step. It records 2 retirements, 20 active vehicles, 17 queued vehicles, maximum continuous halt 497.0166666665433 seconds and 59,641 occurrences of the vehicle:11 uncleared-admission refusal. These are CPU bounds, not appearance or FPS results.

The implementation owner then ran one stop-at-first-refusal probe, using existing traceVehicle/diagnostics and observing the original admission methods. I read the probe source: each wrapped method calls the original exactly once and returns its original result; RefusalCounts.add records the first refusal without suppressing it. The loop stops after that update. It does not drive or reset actor state. The capture records thrown=null, tick6180, elapsed8.9026431 seconds, and identical 22 before/after source and input pins.

Vehicle11 generation1 waited at the body-specific approach halt for passage entry occurrence16. The halt is 210.61237747248603 route metres. Source occurrence16 starts at 213.87158432706428 metres. The signal owner is junction:walk:622021124:0:0:ground0 and its requested group is vehicle:0.

The retained full-run request decisions grant this passage on ticks6129–6179. The rounded per-tick trace first shows departure at tick6130. At tick6179 the original observation and resolve both retain entered=false and actual routeIndex15. Resolve returns granted=true with 0.016666666665463126 seconds of green remaining.

At tick6180 /103 seconds, observe accepts the actor at route occurrence15, local distance17.04609553176303, total progress211.14358118668997, speed1.249813199043274m/s and entered=false. The body has advanced 0.53120371420394m beyond the admitted approach halt. The owner separately checked footprintOccupies against the production function and obtained false; the observed entered=false is consistent with the inspected source predicate.

Resolve then advances the signal to amber and removes the still-unentered lease. Its post-state is null and grant=false. The fresh halt authority view has held=null and completedThroughIndex14, although the population's current committed flag remains true until its subsequent synchronization.

The first refusal is recorded by integrate at tick.ts:1253, after resolve: `Actor vehicle:11 passed uncleared admission at route occurrence 16; stop and restore valid authority before advancing.` It is a returned queryRouteHalts refusal, not a thrown production exception. The captured Error stack is the observer's location marker. Integration stops at the current progress; no unauthorized physical conflict-area crossing is established by this event.

## Source cause and provenance

In src/network/admissions.ts:90, every unentered signal commitment expires when its entry group loses green. In observe at lines123–135, entered becomes true only after source entry or actual physical overlap for a qualified vehicle. The source does not recognize used authority during the intervening body-specific approach interval. In src/network/halts.ts:45–68, the removed lease restores the earlier admission halt, and the progress-behind-obligation guard correctly refuses.

The approach fitter in src/agents/population/vehicle-approach.ts:21–61 intentionally places a clear halt before the expanded physical union, preserving the source path and stop gap. This can leave a non-overlapping interval after departure from that halt. The inherited authority treats a vehicle in that interval like an unused grant. The consumer already allowed forward movement under that grant and cannot rewind to the original halt.

I compared admissions.ts, halts.ts and vehicle-approach.ts with base0681715: all are unchanged. The new routes.ts changes select legal waypoint source edges and feed the existing assembler; that assembler is unchanged. The inspected tick.ts changes pass the selection option and share the halt-capture constant. This supports an inherited API/lifetime defect exposed by changed route coverage, not a new occurrence-index assembly defect. It does not prove all new routes or all inherited admissions correct.

Existing vehicle-approach.test.ts:40–42 compares a stationary halt with an already physically overlapping body, omitting the moving interval between them. traffic-halts.test.ts:162–172 tests expiry of a stationary unused grant. Those cases do not cover this green-to-amber transition after authorized departure but before physical entry.

## Approved narrow direction and review conditions

Keep geographical entered separate. Add private commitment state for a plan-qualified vehicle's observed departure beyond its exact retained body-specific approach halt while holding its existing authority. Only admissions.observe may establish this state after ordinary observation and mapped-control validation. Require a finite immutable matching approach record, exact retained route/passage/generation, and a strict positive progress margin. No population flag, copied snapshot, inferred completion or new grant creates it.

Expiration must retain departed authority. occupied() must count that logical occupancy so conflicting phases remain held through clearance; cancelPending must not cancel it. Preserve actual entered, mapped stop/yield obligations, generation/identity checks, fresh amber/red grant refusal and pedestrian semantics. Preserve release through the actual final conflict occurrence and full tail/physical clearance. A vehicle that remains at or before the halt must still lose its unused grant at green end. An internal field on the existing commitment has its existing removal lifetime and does not require a new disposal resource.

Required focused regression: the actual source-backed late-green departure reaches amber with physical entered=false but retains irrevocable authority; a held-out synthetic non-overlapping departure does the same. Assert no new red/amber grant, unchanged idle expiry, cancellation refusal after departure, mapped-control enforcement, stale/foreign identity refusal, geographical entry distinction, clearance hold and release only after actual tail clearance. Exercise real fixed-step movement for the actual transition and make the old lifetime behavior RED. Source review and helper controls cannot replace the eventual full default flow and native gate.

## Verified evidence pins

All digests below are SHA-256. Reviewer independently hashed these files after checking the relevant artifact/source directory chain for reparse points. Source/data pins inside the probe are capture evidence; I compared its complete before/after vectors but did not rerun the population or reload the full network.

- artifacts/traffic1499/candidate1-freeze.json: fe37f9fec72167c0d99d7723d5cbfb0b1745311470f511faed5f984c99b1094d.
- artifacts/traffic1499/cpu-corrected-flow.json: 818530f30f389557ee86ddd3739f30e06431cc8097b7a890c817f6884d0f005c.
- artifacts/traffic1499/cpu-first-uncleared.json: c8f9b3c451b13001ac5c84ead71550a8497200ec6f4b48219146c5ae23ae7214.
- Candidate1 src/network/admissions.ts: 7b5658ecc74bdca29e97fdabbb795508f03f89b10e6ddad264dc52fbd3bd0f6a.
- Candidate1 src/network/halts.ts: 67cf631a2adfe01daf0576e531ef2d6cf6a598f8f29762a54822592d24141892.
- Candidate1 src/agents/population/vehicle-approach.ts: 8e8d36c5dc196519eed6633736cab394b7d25c3e8bfbd5e0a97ae778040336fe.
- Captured network: 314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677; captured fleet: 5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01.

No independent replay, gates, browser, server, GPU operation or task-owned long-running process was launched. The full 600-second receipt, first refusal and candidate1 remain immutable failed evidence. Actual patch judgment belongs to the separate 1505 review.

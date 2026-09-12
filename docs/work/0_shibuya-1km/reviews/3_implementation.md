# Review 3: implementation

## Target

Repository: `maps`. Base: main `277a8332e61bd29189fa65eae7271f952b04df33`. Reviewed on 2026-09-08: the uncommitted Phase 6 F4 compound-admission candidate, frozen in ignored `artifacts/network/phase6-review3-frozen/`. Candidate manifest SHA-256: `a87018c896c93ffcd812a62ff78f2af11bda6f92a6ed10d5162500a0283cb1af`. All 32 frozen source/document file hashes matched the manifest at the beginning and end of review. The graph is 10,247,274 bytes, SHA-256 `5ab48d19cfe84d525ed80267058c488214bf50c55ec0d9b38b0f90b6ab44fe8c`.

The reviewed contract is `network-contract.md`, SHA-256 `846d05d5269cfddb41da232b94c811ad2c96afcad1b91c75ff8c8b97a02d28cd`. Its exact bytes remain in the frozen tree and must become the next permanent contract snapshot before editing. Review 0 and Review 1 remain unchanged. The previous 22 frozen file hashes, previous graph digest and four original F4 reproducer/result digests were independently rechecked. Keep the rejected frozen source and new proof artifacts until their exact contents are recoverable from a committed revision or deliberately retained input. Later source changes do not inherit this review.

Critical source hashes: `src/network/admissions.ts` = `ff671efad4e49ccb53b849d6d69aebe95a102fc3bdc41fb3d9e615ccc7394f88`; `src/network/passages.ts` = `78dea71790bdced03f3d26066ebbc660ba90f8457ccb054ba3c63cec227a0450`; `tools/network/compounds.ts` = `e6a5b2d2b3abfcdd81bfec299259a0f2a1e0833debf4e9d164b046cbc8270d63`. The actual generated vehicle manifest used by the boundary probes is SHA-256 `4cd6e59b891abec4c4ce48fa03e8f90edf746097f9e532c9f3557be1f20e4257`.

## Reviewers and coverage

Independent read-only reviewer: Codex worker `/root/network_review3`. Coverage includes compound grouping over the full successor graphs, original-disk and physical-record preservation, route passage construction, mapped-control occurrences, signal entry versus clearance, pending grants, complete-tail release, mixed admission tests and actual vehicle bounds at the AOI boundary. The scoped goal is completing this review, not completing Phase 6 or implementing repairs.

All executable probes imported the frozen candidate. No changing shared `surface-sampler.ts` input was borrowed. No source, data, graph, Git, browser, GUI or server mutation was performed. Writes are limited to this report and ignored `artifacts/network/review3-independent/`. Built-in tools supplied the review; no external model CLI or host-authenticated fallback was used. No available agent slot remained for another nested reviewer.

## Reports

### Codex network reviewer

**F4 — the interior adjacent-authority mechanism is resolved within the reviewed horizontal footprint contract.** The former close controllers now share authority, including the original car, bus and opposing mixed signal/reservation source cases. A route commitment survives physically empty internal gaps and later occurrences until the last planned conflict plus physical tail clearance. Independent raw-successor traversal found the same 481 directed vehicle authority pairs and 296 pedestrian pairs. Minimum route gaps are 12.3203324564 m and 23.0194560043 m; minimum original-disk surface separations are 11.7043418431 m and 11.7425413707 m. These exceed the candidate's 12 m route-gap and 11.6 m primitive-separation thresholds. This census used raw successor IDs and disk coordinates rather than invoking the grouping function as its own oracle.

The graph retains all 401 original disk primitives, nodes, route coordinates, widths, successor/lateral references, portals, source tags, crossing facts, tactile paths and physical control positions from Review 1. There are 216 compound controllers instead of 299. Changed ownership and signal groups are expected. Independent exit reachability still counts 4,578 vehicle sections. These are topology and data-preservation results, not evidence that every such route is executable through the new admission API: F5 demonstrates that distinction.

The 19 compound tests and 13 adjacent signal/reservation/decoder tests passed against the frozen files. Their bounds include short vehicle and pedestrian gaps, internal mapped stop/yield eligibility, repeated occurrences, pending green expiry, opposing source traffic and exact rectangle clearance. They exercise supplied eligibility values; they do not measure real stopping or receiving capacity. The consumer must still measure dwell at the mapped control, preserve its occurrence identity and supply actual receiving-space reservations. One vehicle per signal compound is the disclosed provisional policy; this review does not accept it as adequate throughput for 200 vehicles.

**F5 — P1: legal boundary routes cannot complete the new passage and clearance lifecycle.** `src/network/passages.ts:22` requires an outside edge after the final controlled occurrence. However, 13 of the 77 vehicle exit portals and 2 of the 33 pedestrian portals have non-null `junctionId`. An actual legal route is `lane:520446644:2:0:ground0:r:0 → turn:lane:520446644:2:0:ground0:r:0>lane:520446649:0:0:ground0:r:0 → lane:520446649:0:0:ground0:r:0`. It ends at the AOI boundary inside `priority:node:5072661379`, and the last edge has no successors. `createRoutePassage` rejects this complete route with `Route passage for priority:node:5072661379 needs an outside exit section after its last compound conflict, before another authority.` No legal extra outside edge can be appended. This is a new admission-interface incompatibility with preserved source routes, not a mapped dead end or a reason to drop the portals.

Having one outside section is also insufficient. At ten additional vehicle exit portals, the actual collision rectangle still overlaps the preceding authority when the centre reaches the terminal point: five portals for the bus only, and five for all three generated classes, giving twenty class/exit pairs. `src/network/admissions.ts:74` rejects progress beyond the final edge length; line 80 keeps the lease while the body intersects; line 83 cannot cancel an entered actor. The public API therefore has no valid completion operation for these routes.

The independent controller reproducer follows the actual two-section terminal routes on source `87250212` with the generated kei, `22566960` with the generated bus, and `172125348` with the generated kei. Each passage is successfully admitted. Each reaches its last legal point while retaining the footprint, returns false from `release`, returns false from `cancelPending`, and throws on progress one metre beyond the terminal edge. After 120 simulated seconds, both reservation cases remain occupied; the `172125348` signal remains `clearanceHeld=true`, cycle 0. These are controller-level traces along real geometry with actual generated class dimensions, not rendered traffic observations. The retained reproducer asserts this failure state; its zero exit code is not a passing product gate.

The mirrored entrance census finds 11 of 78 vehicle entry portals beginning inside an authority, with all three generated footprints already intersecting at the first point. Eight shortest boundary routes can construct their first passage; three fail the same terminal-exit condition above. This is not an additional proved entrance-controller defect. A boundary implementation can request admission before materializing an actor and observe entry atomically after the grant. Spawning first and only then requesting permission would already put an actor inside a red or reserved conflict area. The boundary lifecycle must cover both admission-before-spawn and release-after-complete-physical-egress/despawn. It must not leave an invisible actor holding authority or release a body that remains in the world. The integration owner accepted F5 as material during this review and required that no affected portal be silently removed or relabelled source-unreachable.

The full graph probe additionally tries one deterministic shortest-to-portal route from every exit-reaching controlled edge. It constructs 3,346 vehicle passages and rejects 98; it constructs 402 pedestrian passages and rejects 6. Those failure counts depend on this route selection, and are not counts of permanently disconnected starting edges. The 13 vehicle and 2 pedestrian controlled portal endpoints are the route-independent terminal condition. The complete routes and errors remain in the proof artifacts.

**Support and integration limit.** The current 11.1 m envelope concerns a supplied horizontal collision rectangle and yaw. The manifest confirms bus dimensions 10.5649995804 m by 3.2799999714 m, with vertical bounds 0 to 3.3245000839 m and axle separation 6.136 m. The integration owner separately identified that future pitch/roll support may enlarge the horizontal projected body and shift its collision centre. This review does not establish an 11.1 m bound for tilted bodies. The next support contract must project the actual supported orientation and revise grouping if its collision envelope exceeds the reviewed bound. No unimplemented vehicle-support defect is assigned a new finding here.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0–F3 | Prior continuation, lateral geometry, physical facts and mapped-admission findings | Preserve Review 1's scoped dispositions. Frozen topology and physical facts remain intact; no new reversal of those dispositions was found. | Retain prior counterevidence and existing regressions. Render and simulation obligations remain downstream. |
| F4 | Interior close authorities create clearance hold-and-wait | Resolved for the reviewed horizontal footprint envelope and named interior source cases. Full-graph separation census agrees with the fixed-point grouping. | Keep the gap, repeated-occurrence, mapped-control and mixed-authority checks. Do not infer tilted-body or populated-throughput acceptance. |
| F5 | Boundary routes cannot construct or complete a legal full-tail passage | Accepted as material by the integration owner during Review 3; unresolved in this candidate. The reviewer reproduced terminal factory rejection and stuck occupied leases. | Design explicit boundary egress/despawn authority and entry-before-spawn semantics, retain every legal portal, cover the complete terminal class and obtain focused independent re-review. |

## Verification

Node 24.12.0. `npx vitest run --configLoader native --config artifacts/network/review3-independent/vitest.config.mjs` passed four frozen test files and 32 tests: `network-compound` 19, `signals-reservations` 6, `signals` 4, `network-mesh` 3. The custom config changes test selection and cache location only. The complete frozen graph passed `validateShibuyaNetwork`. The independent binding, graph, boundary and terminal-admission probes all completed. The latter intentionally establishes the F5 failure state.

The candidate's claimed 60-test run, two identical builds, 15 class/source traces, six isolated mutation runs and 360-second timelines were inspected as author-supplied evidence but were not all independently rerun in this round. No full build, typecheck, audit, HTTP serving test, regenerated graph, populated simulation, lane-width/swept-turn check, visual sweep or performance gate was run. No reviewed pixel claim is made. The current walking support and future receiving-capacity implementation remain pending contracts.

The exact retained proof files below are under `artifacts/network/review3-independent/`.

| Evidence file | SHA-256 |
|---|---|
| `binding.json` | `e501ac6d69590cdadd78ebbe4a2ad55b0e58f34a5e766c603363c0aa2e9a7f74` |
| `verify-binding.mjs` | `95a1c7766f9ee98d1defc473fa1f075b1696247262674256400f93ebd26d5ec8` |
| `graph-probe.mjs` | `c90e785a21561effff19e766c95aaa9fce0f46d1c3d53287441280b20bf1539` |
| `graph-result.json` | `379eb6e73ad41a1ff8223f1ddc54efadbe80e2a98a4315eb5900eb883c6fbb30` |
| `boundary-probe.mjs` | `8d6f5f609b7bf78742ac0079031b904ff6c0cec3c6e14c50e82c0e1eb31860ea` |
| `boundary-result.json` | `1cd4ceb2f5bf1688099d4898476ba0f7b3d98ea572c258792b3486b76a8f8dd3` |
| `terminal-admission-reproducer.mjs` | `6cfbe69bb25b1e3e3bc44812b7e5111154bc30ddc37648a2cf6718ffdef6cff7` |
| `terminal-admission-result.json` | `d038f4b690c33c90504a61b106fbcf9b57f2067311cf9a2f376903c089527271` |

All task commands finished. This review launched no browser, GUI or server. The task-created Vitest cache was removed after verifying its exact resolved path; unresolved proof artifacts remain intentionally retained. A scoped process-enumeration check was attempted but `Get-CimInstance Win32_Process` returned `Access denied`, so system-wide process verification was unavailable. No shared process was terminated. No Git mutation or merge was performed.

## Round outcome

F4's interior grouping repair is accepted within the bounds above, but the Phase 6 candidate is not accepted because F5 prevents required legal boundary routes from completing safely. Preserve this exact candidate and its new counterevidence, repair the boundary lifecycle together with the supported collision-envelope contract, and re-review the new exact revision. This review is complete; the Shibuya deliverable remains uncommitted, unintegrated and unmerged.

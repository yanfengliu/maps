# Review 41: implementation

## Target

Repository: maps. This is the independent re-review of F22 in the pedestrian terminal-clearance component. The author's base remains `244632ca8d88dc464a162fad3782baa91f59f136`; the separate reviewer worktree is `artifacts/lease-review-v2/wt`, created from primary main `27c71865bef31a7c9dcc622db16e6721be839dc3`. The reviewer copied and verified all eight frozen files byte-for-byte. The old-base documentation copies in this disposable review tree are reviewed target evidence, not a recommendation to replace newer primary documentation.

Frozen target: `artifacts/lease-retirement/artifacts/lease-evidence/candidate-v2.patch`, SHA-256 `b41f3dd3fdc9a3d4ee55f3e86e9bfccf78ee0017171f9d26fd62063cf9358bb9`; `freeze-v2.json`, SHA-256 `27570b48313dc3c6ddafa71ee94406b2add8813f880250c3fe8315d38027a247`. The exact authored handoff is retained as [lease-v2-author-report-review41.md](../snapshots/lease-v2-author-report-review41.md), SHA-256 `290fc7b3f567cf01bcbcfd7c53e85abcf6fd72a3c922450463c42b98e6a3d57f`. The patch and freeze also remain under this review worktree's ignored `artifacts/lease-review-v2/target/`.

Production hashes: `routes.ts` is `70aa738cba24e456cb6d54532d13fc8e2a7607fc523a25fe92d0ffe16874713e`; `pedestrian-terminal.ts` is `40b162bd8a259db111449e5931c08b9e5e5612b3405d06731753a43d136f4473`; `tick.ts` remains `60b37eb84da5366babebfa377ab91c301967e9627a0c134000600fb129734057`, identical to the rejected target. The revised terminal test is `73464c18b4077aff45f6c8522aa25a20a6048bf90242b6c38a392e9b9806cd59`.

Review 39 remains attached to its rejected target. Its original authored bytes in `artifacts/lease-review/wt/docs/work/0_shibuya-1km/reviews/39_implementation.md` have SHA-256 `27d883dd15452fcad0b9e9bc11cae88226bf64ea886c6986ce992f94cc450298`. This reviewer did not edit that report, its independent probe, or the original candidate/freeze/handoff.

## Reviewers and coverage

Codex independent reviewer (`/root/motion_review`) did not author either lease component version. Coverage is the constrained-prefix, constrained-tail and cache behavior changed for F22, preservation of the ordinary unconstrained branch, the original independent reproducer, focused tests, and an additional finite constrained-path oracle. Root remains integration and final-acceptance owner.

No browser, server, GPU gate, data writer, dependency install, full unit gate, or city population run was used. The reviewer read shared scene data and dependencies through worktree junctions. This round makes no independent visual, performance, support, motion-naturalness or city-scale acceptance claim. A second model CLI review was not attempted; Review 39 already records its failed OAuth review attempt, which remains an abstention rather than approval.

## Reports

### Codex independent reviewer

I accept the F22 repair within the frozen component's scope. The original concrete forbidden-prefix and forbidden-tail cases now refuse, the independent constrained shortest-tail oracle agrees across its full finite population, and no new material finding was reproduced.

The revised `RouteLibrary.route` does not reuse an assembled cached result for a request carrying `viable`. This applies even when the callback object and radius are unchanged, so an allowed set changed between calls cannot inherit yesterday's fit. The retained central prefix is still used as the intended unconstrained route choice, but `assembleCentre` checks every prefix edge against the current callback and returns a named refusal if one is forbidden. It passes that callback into terminal search. A fresh constrained choice is excluded from the unconstrained prefix cache, and constrained fits remain excluded from the assembled cache. The focused cases verify that later ordinary requests retain the ordinary plan and passage identities.

`clearPedestrianTerminal` checks the entire supplied prefix before its already-clear fast path. It applies viability before adding every successor to the cost/depth queue. Therefore the first returned clear tail is the shortest allowed candidate under the existing edge and length budgets. The repair does not delete a forbidden edge from an otherwise continuous route or alter the body envelope to manufacture clearance. It returns refusal when the retained prefix or every feasible tail is forbidden. A rejected retained prefix is permitted to refuse even if a fresh planner might choose a different allowed central route; this is the explicit contract accepted in Review 39.

I replayed the exact original independent program, SHA-256 `d5a8a3e4b27d5627321c52b3a7a4e1e0cca65a52b621e945a665fc19568581a6`. On the preserved rejected source, the warm-cache request still returns `inside` despite forbidding it, and the fresh tail request still returns forbidden `clear`. The program exits 1 with its original named F22 diagnostic. On v2, `cachedRejectedPrefix` and `rejectedTail` are both null; the fresh constrained prefix remains the permitted single `approach` edge, and the program exits zero. The two source files were restored byte-for-byte in a finally block after the red replay, and all eight frozen target hashes were checked again. No product repair was authored during review.

The additional independent oracle examines 48 seven-edge directed fixtures, all 128 allowed-edge masks and two total-length budgets, for 12,288 cases. It enumerates every walk of at most six sections independently, identifies clear endpoints by their known position ten metres outside a radius-two conflict disk, and compares minimum total cost with the real tail helper. All 2,008 returned paths obey their mask, preserve the prefix, stay within both budgets, end clear and equal the enumerated minimum cost. The remaining 10,280 cases refuse consistently. Every declared edge length matches its own sampled segment. This finite search check deliberately does not claim that the disconnected synthetic edge geometries form valid complete passage routes; the real-planner focused fixtures cover their own passage construction separately.

The unchanged original probe also repeats its 80 unconstrained directed-graph cases with zero cost/refusal mismatches and checks 1,440 float32-published body corners inside the conservative endpoint envelope. The envelope and its rounding margin did not change in v2. These checks retain their old finite bounds and do not authorize future geometry or body-size changes.

For an absent viability callback, each new conditional takes the old branch: the assembled cache lookup, prefix caching, prefix validation, successor insertion and refusal text are unchanged. The revised helper's optional parameter adds no RNG draw, and its existing cost/depth ordering and route budgets remain unchanged. The old focused RNG/prefix/cache tests still pass. `tick.ts` is byte-identical to v1, so this repair does not alter pose publication, occupied-terminal retention, lease observation or generation reuse. The focused actual-RenderLoop cases still verify their bounded behaviors. This supports a scoped transfer argument for the author's previous ordinary 150-pedestrian/no-vehicle run; the integration owner must decide that transfer, and it is not a new v2 city run.

The existing limits remain: unresolved crowd stalls, four disclosed central-prefix budget fallbacks, and separate pedestrian AOI egress/boundary retirement work. Resolving F22 does not resolve any of those items, prove general pedestrian support or natural walking, or satisfy the 3,000-pedestrian/200-vehicle performance target.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F22 | Current caller viability was bypassed by central prefix reuse and terminal extension. | Resolved in the frozen v2 scope by independent original-red/repaired-green reproduction, current-state cache checks and constrained search evidence. The prior rejected report remains unchanged. | Root must integrate the exact accepted change, preserve newer primary documentation, and complete required integration gates. |

No new material finding was reproduced in this round. The round does not change dispositions for other population, walking, boundary, rendering or performance findings.

## Verification

Node `v24.12.0`. The four focused files independently pass all 32 cases: 16 pedestrian-terminal, three population-lifecycle, two population-tick-order and 11 network-boundaries. `npm run typecheck` and `git diff --check` pass. The tests use the available cached source prerequisites without downloading or writing scene data.

Ignored evidence under `artifacts/lease-review-v2/wt/artifacts/lease-review-v2/`: `original-probe-v1-red.log` and `.json`, `original-probe-v2.log` and `.json`, `focused.log`, `constrained-search.ts`, `constrained-search.log` and `.json`, `typecheck.log`, and the frozen target copies. The byte-exact original probe copy is at the review worktree's `artifacts/lease-review/independent.ts` so its original relative imports and output path remain valid. All eight reviewed file hashes and all three original v1 artifact hashes still matched after verification.

No full gate, fresh moderate city run, GPU run, browser run or scene acceptance was performed. The author reports eight new viability cases red on v1 and green on v2; this reviewer inspected that evidence and independently reran the exact original F22 red plus all 32 repaired focused tests rather than calling the author's mutation log a new independent run.

## Round outcome

F22 is resolved for the exact frozen v2 target and is ready for root integration. This is scoped component acceptance, not final integrated or whole-deliverable acceptance. No commit, merge, push or primary edit was made. The detached worktree at `artifacts/lease-review-v2/wt` and its evidence remain intentionally for root handoff, report/snapshot preservation and later removal. Review 39 remains the historical rejection; this round does not rewrite it.

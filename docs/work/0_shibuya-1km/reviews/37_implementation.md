# Review 37: implementation

## Target

The uncommitted forward-velocity candidate in `artifacts/pedestrian-stall`, based on `a9b5c3ee1278c33f847b26ecddf52de540ad5785`. Reviewed source `src/agents/population/pedestrians.ts` has SHA-256 `17480d576b10243724530717375180e1e6e7f554b71379a66ac8fae5270892cf`; `test/pedestrian-forward-avoidance.test.ts` has SHA-256 `5589ce7ac8d60ec1658523687b0fb73560f05f5b3f188c7b80e0529e92306520`. The complete uncommitted target is preserved in `artifacts/pedestrian-stall/artifacts/stall-evidence/candidate1.patch`, SHA-256 `a3ac849388597b91c9de91993401ae48ab29fd23d40a15ae44ff44ee2d6295c2`.

## Reviewers and coverage

The certificate worker reviewed the population worker's candidate independently, with read-only access to its frozen source, test and recorded trace. This round covers the scalar optimization, its compatibility with the existing forward projection, and the narrow contact impossibility claim. It does not review rendering, crowd appearance, whole-city throughput or runtime cost. No source was changed and no browser ran for this review.

## Reports

### Independent finite math review

No arithmetic defect was found. For a preferred unit direction `d` and speed bound `S`, the admissible velocity is `s*d`, `0 <= s <= S`. Each nonzero-normal half-plane becomes one scalar inequality. The implementation selects the fastest point in their common interval when one exists. Otherwise it minimizes the sum of squared normalized positive shortfalls, explicitly returning infeasible. This objective is convex and piecewise quadratic, so its interval endpoints and active-set stationary points contain a minimum.

The independent oracle uses a different computation. It enumerates segment endpoints and plane intersections and checks every original inequality to establish feasible extrema. For infeasible inputs it bisects the monotone derivative of the convex squared-hinge objective instead of enumerating active sets. With seed `0x51a77eed`, 10,000 cases containing zero to eight planes, nonzero normal magnitudes from 0.01 to 10.01 and preferred speeds below 3 m/s produced 2,569 feasible and 7,431 infeasible cases. There were no feasibility or output mismatches. Maximum speed error was `1.3322676295501878e-15` m/s. Independently rescaling each plane by a positive factor changed velocity by at most `4.548951713798929e-15` m/s. Source and test hashes matched before and after execution. Zero speed and degenerate normals are covered by the author's inspected analytical tests, not this randomized oracle.

The production integration supports the restricted domain: `tick.ts` projects the result onto the route direction and clamps it to a nonnegative cadence-limited speed. A feasible two-dimensional answer would not necessarily remain feasible after that projection. The candidate solves in the domain that this integrator can retain.

The recorded contact proof is valid only for its fixed instantaneous constraints. I read the full-precision inputs in `candidate1-trace-exact-150.json` (SHA-256 `a2815a3e2dfad229bd0a8cbd9418eb688c61eb101e65e77b3dda08b83e676b55`) and recomputed the preferred-velocity normal projections for slots 5 and 9 at tick 44,000: `-0.04368449198952104` and `-0.020709204710559325` m/s, each against the positive bound `0.10701405403755859` m/s. On either permitted forward segment the maximum projection is zero. Neither body can satisfy that retained inequality while its heading and contact state remain fixed. This does not prove that contact could not have been prevented upstream, that a different route policy fails, or that the whole forward-route strategy is impossible.

The candidate is not a stall fix. The author's 150-pedestrian, zero-vehicle, 45,000-tick comparison reports completions increasing from 27 to 33 and worst overlapping pairs falling from 142 to 113, while the longest wait remains 710.45 seconds. Those are author measurements, not an independently repeated city run in this round. The unchanged longest wait is enough to keep stall closure unaccepted.

## Findings and disposition

There is no blocking finding in the finite optimization reviewed here. Two integration conditions remain: correct `tick.ts`'s `avoid()` description of every returned velocity as collision-free if this candidate lands, because infeasible compromises are expressly permitted; and measure representative runtime cost before making a performance claim, because the new solve creates three arrays per invocation. Neither condition establishes or replaces the outstanding crowd acceptance criteria. Final acceptance belongs to the integration owner.

## Verification

The 10,000-case oracle and its zero-failure result are retained at `artifacts/certificate-primary/population-review/oracle.mjs` and `oracle-result.json`; the independently recomputed two-body projection check is `contact-proof.json`. No full unit suite, 3000/200 run, visual gate or frame-time measurement was run by this reviewer. The sampled oracle is bounded to its stated finite inputs and tolerance, not arbitrary nonfinite or extreme numerical inputs.

## Round outcome

The scalar solve is supported within the inspected and tested bounds. The contact impossibility claim is accepted only for already-contacting bodies under the frozen headings and inequalities. The candidate remains uncommitted and unlanded, and runtime stall closure remains unmet. This round supplies no broader strategy-impossibility or visual-acceptance claim.

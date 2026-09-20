# Review 54: implementation

## Target

Launcher v4's ignored candidate at `artifacts/walking-path-v2/artifacts/launcher-v4/candidate/capture.mjs`, SHA-256 `feb9825c2ebbd8b10aa078ed4de172c2672077ed1351ae5ae21f47e6e2f2e06a`, based on `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`. Its preserved `candidate.patch` is `36519af242cda3420fe7950a1ae0d226f3d10d9c941b703f34373e0ae6e01f04`; its 127-member author freeze is `ac2503dd64a4d01db758f4ee9cdaa60e098bf6b267b68aa1e62073fd94101de9`. The exact [authored handoff](../snapshots/54_launcher-v4.md) is `fc21306993109cc98f25a74d991e821aac89847100cb2964f486eede40d20f52`. Review worktree base is `82ee91772f9533ab3e8661f73af2eb4eb1e2bd3c`; later documentation does not change the reviewed code. These are uncommitted diagnostic inputs, not a production revision.

## Reviewers and coverage

Independent reviewer `launcher_alternative` inspected the frozen candidate, installed Playwright and Node bodies, and official Windows lifetime sources. Coverage comprised bounded CPU/VM lifecycle controls and source-supported adversarial schedules. No browser, server, GPU, native stop, native PID-reuse experiment, or full repository gate ran. The root read the counterexample and accepted the bounded no-go. This wrapper adds no review or verification claim.

## Reports

The exact [independent authored report](../snapshots/54_launcher-v4-independent-report.md), SHA-256 `0986bab8262513023fafe98e51e18b76522fbfa35b07c3177fe3677c628ccf19`, preserves the finding, source references, explicit native-model assumptions, all control bounds, and possible next mechanism constraints. Its original 208-member evidence freeze is `880f3c55c3528f2a8f90611e1bf9617ca65300a9dfe394b423158e97ae4ba47f` under `artifacts/launcher-v4-review/wt/artifacts/review54/`. The report and author handoff are copied byte-for-byte; the original evidence remains ignored and retained.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F30 | After the original process exits and all native handles close while stdio remains pending, the SDK's PID-tree kill can address a foreign replacement PID. The candidate's seven-second escalation and the SDK's thirty-second fallback both reach that route. | Material, accepted by root, unresolved. The exact-source VM counterexample violates owned-only termination under a documented permitted schedule. This is not an observed native incident or a claim about its frequency. | A separately owned design must establish identity authority through every explicit and implicit kill route, retain descendant disposal and pending joins, and obtain independent review before native admission. |
| F28 | Earlier cancellation/inventory ordering and direct parent kill could strand a late descendant. | Preserve Review 51's rejection and bounds. V4 passes the named delayed-child controls and removes raw parent kill, but those controls do not cover F30 or establish general native cleanup. | Retain the old red evidence; no acceptance transfers to another launcher or runner merely because it uses the same public API. |

## Verification

The original 22 lifecycle verdicts and 11 candidate verdicts replayed successfully, retaining the fixed 33 denominator and eight expected old-v2 reds. Six additional descendant/observation schedules, two old-v3 red schedules, and three installed-SDK factory checks also reproduced their expected outcomes. Two independent counterexample assertions reached a foreign-PID stop through the old thirty-second and candidate seven-second routes. Original descendant 333 exited on an independent later schedule and released stdio; the foreign taskkill did not dispose it. Profile and late-acquisition joins completed afterward.

All 127 author freeze members were rehashed unchanged and copied into the review evidence. The four helpers and original 36-shot controller block remained exact. Prior identity-classifier evidence was transferred by digest, not rerun as native evidence. Unknown observation cannot establish complete capture. The intended future 44-frame adapter remains separate. This documentation follow-up verifies only exact snapshot bytes and all 208 original review members; it runs no additional product checks.

## Round outcome

Reject launcher v4 for native admission while F30 remains unresolved. The result blocks the demonstrated PID-based routes and does not prove every BrowserServer or runner strategy impossible. Native handle retention and assignment to a kernel-owned group before child creation remain bounded design investigations, not accepted solutions. No native capture, gait, city, source-policy, performance, or production acceptance follows. These three documents await a later approved launcher/documentation milestone and are not part of the separately frozen facts milestone.

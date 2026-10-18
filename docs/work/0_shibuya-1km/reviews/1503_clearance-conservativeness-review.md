# 1503 — Clearance conservativeness review

**PASS — focused clearance conservativeness review.** No material finding within the current pinned network, fleet and upright population-core path.

Reviewed [candidate1-freeze.json](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/candidate1-freeze.json), SHA-256 `fe37f9fec72167c0d99d7723d5cbfb0b1745311470f511faed5f984c99b1094d`. All 20 file pins match. The authoritative clearance source is SHA-256 `9007351213acb228386ac72bcc1ca49217dd8f48ebbc8519f95f55fb5f300973`.

The inspected bounds are conservative:

- [Straight-edge qualification](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/worktree/src/agents/population/vehicle-clearance.ts:25) checks every source segment’s forward direction and line deviation. These bounds contain `headingAt`’s edge-clamped probes. The pinned network has 4,855 lane edges and 49,231 segments; a read-only scan found no zero-horizontal or duplicate segments.
- [Swept rectangles](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/worktree/src/agents/population/vehicle-clearance.ts:89) retain generated dimensions, asymmetric centres, source deviation and rotation padding. Separation requires the stop gap plus both publication margins.
- Qualified seams combine both heading bounds. Curves, unqualified seams, nonzero lane offsets and tilted other bodies retain circle checks. Active and pending neighbours remain included.
- [Portal qualification](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/worktree/src/agents/population/vehicle-clearance.ts:121) preserves circles for complete entry prefixes and sweeps actually reaching an exit. Remote exit metadata alone does not disable an interior correction.

The literal 1/21 fixture matches the retained actual positions, yaw, full-precision scales, progress and routes. I read the regression logs: the old file fails the intended adjacent-lane assertion; its other three tests did not run. The restored candidate passes all four. Converting the current LF bytes to CRLF in memory reproduces the previously observed `12108867…` digest exactly, establishing the formatting-only link without claiming a retained backup exists. The historical kei BLOCKED expectation remains unchanged.

This permits the planned corrected flow replay. It does **not** establish throughput, predicted collision safety, rendered interpolation, native appearance, all-path integration or final-goal acceptance. No tests, simulation replay, GPU work or edits were performed during this review.

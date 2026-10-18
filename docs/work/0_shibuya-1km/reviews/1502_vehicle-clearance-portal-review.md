# 1502 — Vehicle clearance portal review

Focused review accepts the corrected portal scope; the historical kei test should keep its **BLOCKED** expectation.

The first implementation applied the new narrow phase to `route.boundaryEntryPassage`, exceeding the agreed scope. The correction at [vehicle-clearance.ts:121](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/worktree/src/agents/population/vehicle-clearance.ts:121) retains the original circle checks for the complete entry prefix and any checked sweep reaching the actual exit.

My initial recommendation to exclude every `boundaryExit` was too broad. That field carries eventual route-exit metadata on every passage. The corrected predicate checks `boundaryExit && end === route.totalLengthM`.

Observed evidence:

- Historical `turnTable(0)`: independently reproduced **BLOCKED** after entry fallback, with matching cache pins. Its geometric classification remains **UNKNOWN**.
- Retained vehicles **1/21**: both independently return **CLEAR** through the corrected production function.
- Current clearance SHA-256 remained unchanged during those calls: `12108867fa482fa3d1debc3915d6be51d081537cdf854f34efcd94bd18b5f10d`.
- The first failure remains recorded in [clearance-first-check.json](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/clearance-first-check.json); no test expectation changed.

This accepts the focused correction, not the complete implementation or flow. No edits, gates, GPU work, or simulation replay were performed by this reviewer.

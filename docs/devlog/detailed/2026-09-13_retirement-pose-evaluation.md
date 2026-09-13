# Devlog — 2026-09-13

## Exact pose correspondence did not make the evaluator faster

**Action:** Preserved the finite independent evaluator review and separate ABBA preparation rounds. The reusable evaluator matched selected CPU poses, source palettes, full-weight points and destination ownership without changing the gait controller.

**Result:** Root accepted the sealed owner ABBA comparison as a finite negative measurement: full-state/pose correspondence held, but same-tick update-plus-pose medians were 103.145 / 263.538 / 263.364 / 103.054 ms for original/new/new/original, respectively. The ratio of mean arm medians is 2.555×; this is one four-arm sequence, not a confidence interval or a cause diagnosis. Each arm ran 3,000 states through 12 warmup and 120 measured ticks on twelve repeated streams, with a 120-second hard child cap and 110-second cooperative bound inside one ten-minute lease. All four children closed without timeout, error or retry. The reviewed r1 repair patch remains `883fe2cce49e0b885fee14c42e6d767ec00db1a55f81a68cef80fbc9d866449b`; lease SHA-256 is `8821062151eb06fd97ad1efc2782e1258ea5990599993215414f36de7b30cdf7`. The measurement owner report and handoff remain at `artifacts/agents/gait-pose-abba-r1/benchmark-report.md` (SHA-256 `c4443c24165088f1db0706b8697865ae92eedab460d6e5fb6a1985569fab230c`) and `benchmark-handoff.json` (`4d53117141a53811a37d6887dac449a5666e149ebdc455f49df6ebd9df5d1b31`). The optimization hypothesis is rejected; independent result interpretation remains separate and pending. Validation-heavy callback times around 500/662 ms are not production FPS.

**Code reviewer comments:** The initial ABBA instrument lost falsy thrown values and omitted some wrapper failure fields in its final verifier. F15/F16 repairs preserve explicit thrown values and one strict completion predicate. The original review and focused re-review remain separate in [Review 20](../../work/0_shibuya-1km/reviews/20_implementation.md) and [Review 22](../../work/0_shibuya-1km/reviews/22_implementation.md).

**Validation:** The finite independent position oracle and exact state/pose hashes remain distinct from the owner timing observation. Source normals, arbitrary commands, GPU passes, naturalness and heterogeneous city performance are outside those results.

## Tiny context loss was observed while the outer report failed

**Action:** Preserved the independent retirement and tiny-preparation judgments in [Review 19](../../work/0_shibuya-1km/reviews/19_implementation.md) and [Review 21](../../work/0_shibuya-1km/reviews/21_implementation.md), plus the separate owner runtime report.

**Result:** The 64×64 triangle produced the expected real extension delegation, lost state and queued event. The added outer reporter accessed a disposed process object and failed before writing its historical ledger. Fresh observed closure and exact debug-log append accounting remain separate; neither invents the missing record.

**Validation:** The finite returned-owner cleanup and installed force-loss call do not prove native allocation recovery or the ordinary city's unchanged navigation and replacement deadlines.

## The B0 trace boundary could include a replacement document

**Code reviewer comments:** The B0 reader review caught overwriting the earliest replacement snapshot, admitting after already-observed completion, and exempting noncanonical debug-log paths. [Review 23](../../work/0_shibuya-1km/reviews/23_implementation.md) retains the three original reproductions as F17/F18/F19.

**Action:** Preserved those findings and their raw evidence without changing the instrument or converting tiny-context delivery into city-lifecycle acceptance.

**Notes:** This documentation preparation leaves source patches and raw results ignored and byte-pinned. It changes no code, geometry, browser policy, performance limit or authored review body. Current status belongs solely in the Shibuya plan.

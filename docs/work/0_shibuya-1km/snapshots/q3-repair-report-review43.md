# Q3 F23/F24 v2 repair handoff

Frozen in `artifacts/motion-repair/wt` on `codex/motion-repair`, base `27c71865bef31a7c9dcc622db16e6721be839dc3`. This component repairs only Review 42 capture-validity and cleanup defects. It is not integrated or committed. Review 43 and all primary gates remain owed. Scene verdict stays `not-established`.

- Full candidate patch SHA-256: `d0e7972ec58c02cc9ef13a0bea17c081daab73cf05eb6a02ef060598ff95e1d0`.
- Freeze SHA-256: `b0ef4778c6c9e06bbbce995da1b6a6d1469f33550e1776c7e612f29ec6272503`.
- Authored Q3 record SHA-256: `71e5cbd57aae23a02c6f09bf787dd72cab31650bacacde04c9480316053dad08`.
- Rejected original patch: `9e65da1a42c5a3f87cdbddbd0f8114513e4042e75221887b40f89ced1aa1b9d4`; all 17 original frozen files remain unchanged.
- Preserved Review 42: `71be35a0884bf9744581e298df3980734446f4ac6ac8698193f418cf2d78d71c`.

`FlickerReport.captureFailures` is populated at capture/record predicates and consumed by the emitted manifest. Decoded blank/dimension checks, counter/copy binding, exercised motion and ascent input remain in that same validity path; residual/search-model failures stay separate. Missing copies get an explicit refusal. No error wording is matched for classification. The original numeric estimator and bars are unchanged.

`MotionPath.during` always awaits its observer in a nested finally after release, even when release rejects. Sole errors retain identity; simultaneous input, release and observer failures are aggregated without replacement. The successful input sequence is unchanged. Existing bounds remain: the page observer has an eight-second timer for a responsive page; the seven-minute Playwright test deadline and owned runner teardown backstop hung page/RPC cases. No new promise cancellation or arbitrary-promise settlement claim is made.

The real emitted specification is exercised with browser/input/disk replaced and real decoding/validators/judge retained. Restoring the exact three rejected source files gives five semantic failures: stale capture validity, missing counter/short-burst reasons, and two premature returns with active observers. The finally-restoring runner records source hashes. The final candidate passes 54 focused tests and typecheck. The first fixture encoding error is retained separately as `initial-fixture-error.log` and is not counted as a product red control.

The CPU replay reads all 24 original probe3 files and verifies each PNG plus both original manifest hashes. It executes the actual repaired emitted-manifest callback with those exact bytes and input receipts. Both captures remain valid, with zero capture refusals; every pair record is identical to the original and all 22 residual failures remain. It ran no browser, renderer, server, build, full unit suite, audit or visual gate and performed no new image inspection. The original author's image review and root's separate image disposition are separate evidence.

There are 18 frozen candidate files against main, including the original component. The v2 repair changes these 10 paths relative to the rejected candidate:

- `docs/devlog/detailed/2026-09-19_motion-capture.md`
- `docs/devlog/summary.md`
- `docs/learning/defect-register.md`
- `docs/learning/gate-proofs.md`
- `docs/work/0_shibuya-1km/q3-motion-capture.md`
- `test/flicker-burst.test.ts`
- `test/flicker-capture.test.ts`
- `tools/flicker/capture.spec.ts`
- `tools/flicker/judge.ts`
- `tools/flicker/motion.ts`

`repair-only.diff` isolates that delta for review. Original motion-capture artifacts and Review 42/probes are preserved in their existing worktrees; this task wrote only its own worktree and ignored evidence. The dependency junction is read-only by task contract. Root owns integration, canonical status, required main gates and commit.

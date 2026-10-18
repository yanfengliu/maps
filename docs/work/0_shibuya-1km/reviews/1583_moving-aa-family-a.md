# 1583 — Branch A: raw supersample-grid history

2026-10-18 UTC. Unmerged prototype on `codex/motion-aa1582a`, base `16bb1f360eb1b530fb4cf92413f932b21dc11616`, in `artifacts/taa1582a/worktree`. Root owns acceptance. Contracts1552/1582, all35 identities and all14 criteria remain unchanged. No branch-B source or report was read.

## Mechanism and scope

The accepted two current-pose beauty draws still run at2× native width/height with4 requested MSAA samples and their installed jitter/weights. Their colour stays on that grid. Depth reprojection, current/previous posed masks and shadow/contact influence rejection run there before one native resolve into the unchanged native GTAO/bloom/output chain. Previous colour stores the raw current-grid image, never the recursively resolved image; each eligible result averages current and immediately previous frame equally. Still uses the installed32-sample TAA and invalidates moving history. Resize, apply, invalidation, tile refinement and sampling-mode edges clear history. No actor, camera, source geometry or cache is stopped/changed.

This is a concrete bandwidth/finite-history hypothesis, not a measured explanation for1560 softness. Fully implemented1560 rejection helpers and overlay authority were reused, with their AA sample sizes adapted to the actual high-resolution input. No hard helper is left as a placeholder.

Changed paths: `src/app.ts`, `src/render/post.ts`, new `src/render/reprojected-history.ts`, new `src/render/dynamic-color-influence.ts`, `src/agents/render/pass-materials.ts`, `src/agents/render/local-walk-contact.ts`, and new `test/supersample-history.test.ts`. Primary, rejected1560 source, captures, harness and data remain untouched.

## Actual evidence and limits

Final focused CPU result:19/19 in4files, Vitest1.30s/tests56ms. It covers the actual production graph at DPR1/1.25/1.5/2, integer native dimensions and2× current/history/depth/masks, raw-current history source, native final destination, mode/resize/lighting/invalidate resets, target disposal, existing local contact/agent pass regressions and unchanged inherited shadow/contact influence state/throw/disposal assertions. Scoped strict TypeScript passes; whitespace passes. This is renderer-spy/state evidence, not shader compilation, GPU contribution, rejection pixels, MSAA allocation, temporal quality or performance. Existing exact-submission `post-motion-sampling.test.ts` was not run/adapted; its old two-copy/native-intermediate assertions need reviewed expansion for the new deferred resolve, without losing current-pose coverage.

Two initial check failures were corrected: a new private `copyMaterial` collided with the inherited public type; the new depth-size spy assertion inspected a lazy depth image before the GPU setup that installed three.js performs. The corrected check observes the actual depth target. Original diagnostics remain in the tool transcript; no claim of separately retained initial failed source bytes is made. Frozen1560 and raw native evidence remain intact.

Extra format estimate:544 bytes/native pixel =501,350,400B(478.125MiB) at1280×720, and784,720,544B at1601×901. Derivation:448B/native pixel for high-grid history/masks/private influence, plus96B for current/resolved/depth grids. It excludes private cloned shadow maps, driver padding and whole-process allocation. Eligible motion can add one2× depth scene submission, two2× dynamic-mask submissions and two2× private counterfactual beauty submissions, plus fullscreen work, to accepted beauty/AO work. No runtime cost was measured. Total CPU compute and start-to-end wall were not instrumented; first timestamped inspection07:11:18UTC, final CPU run07:16:08UTC. GPU/browser/server work:zero.

## Next discriminator and hard gaps

First run the existing production-path GPU controls under independent review of this new raw two-frame transfer function; preserve old originals/assertions. A discriminating literal sequence uses valid equal-depth history with current centre.8, previous centre.2 and current3×3 bounds[.2,.8], with actual motion reprojecting to an exact2× texel: expected pre-effect output.5. A third raw centre.8 must produce.8, whereas recursive storage would produce.65. Repeat with rejected depth/dynamic/influence/resize/lighting history; expected output is current.8. Exact dimensions, pose, shader inputs and observed pixels must be bound before this is acceptance evidence; flags cannot substitute.

Then use the unchanged full96-frame native S0 baseline/candidate flow and independent native inspection for paving, tactile, stripes, windows/sign detail, crawl and trails. S1 train, held-out1601×901 fractional DPR, lifecycle, independent integrated review and all five gates remain required. This route is underexplored and may fail quality or cost; it is not nearly accepted. No GPU/build/full gates, code commit, merge or push ran. No persistent task-owned process remains.

## Byte binding

`src/app.ts`: SHA256 `4cfe4f438d39928336a164817b78a31c61c94e8d6b2d902d062790357476cd78` (22653B).
`src/render/post.ts`: SHA256 `703bec41c7ebf95b30a75047980691bafbb0631bd029e0abd7b8e55d175ef69b` (20217B).
`src/render/reprojected-history.ts`: SHA256 `e746a6a413cf489416a0abaca5c2fe1d87d4f40b621b09a34c906c9068128008` (10847B).
`src/render/dynamic-color-influence.ts`: SHA256 `98525f7597106d29cd53f1a492adbdbcb88bfe8bca2ed9e0dacbed63d557638e` (5228B).
`src/agents/render/pass-materials.ts`: SHA256 `3c34133ad3e06711ebb07b32b4acf1d7d3eb979237cbed1c2c735a359b6d5dfd` (1069B).
`src/agents/render/local-walk-contact.ts`: SHA256 `c2b3b7f3ed436d8d71a7a3d887c9cc4e907011cd440b143f7332115420eaf825` (7448B).
`test/supersample-history.test.ts`: SHA256 `555599a0d4420e2b0e0dbc41b2438b47397031f9092ec9eaf336b6f374b9b834` (7369B).

Ignored `artifacts/taa1582a/freeze.json`, `tracked.patch` and `source-freeze/` retain the exact candidate; the patch covers tracked modifications and the freeze retains every new body. Report is authored evidence, not a gate certificate.

Encoding correction by root, 2026-10-18 UTC: this retained copy transcodes the issued Windows-1252 report to UTF-8 without changing its text. Original bytes remain at the worktree path above, SHA-256 f9363bf414417b8ba8b1723d76457c021527bdf5e4bc93f12900884e5354fd1c; executable freeze unchanged.

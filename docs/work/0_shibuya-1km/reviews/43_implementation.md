# Review 43: implementation

## Target

Repository: maps. Base: `27c71865bef31a7c9dcc622db16e6721be839dc3`. Scope: the frozen Q3 v2 repair of F23 and F24, independently reviewed in detached `artifacts/motion-review-v2/wt`. All 18 files were copied byte-for-byte only after their source hashes matched the author's freeze. No source correction was made by this reviewer.

Target artifacts under `artifacts/motion-repair/wt/artifacts/motion-repair-evidence/`: `candidate-v2.patch`, SHA-256 `d0e7972ec58c02cc9ef13a0bea17c081daab73cf05eb6a02ef060598ff95e1d0`; `freeze-v2.json`, SHA-256 `b0ef4778c6c9e06bbbce995da1b6a6d1469f33550e1776c7e612f29ec6272503`. Copies remain under the review worktree's ignored `artifacts/review43/target/`.

The exact authored documents are retained as [q3-motion-capture-review43.md](../snapshots/q3-motion-capture-review43.md), SHA-256 `71e5cbd57aae23a02c6f09bf787dd72cab31650bacacde04c9480316053dad08`, and [q3-repair-report-review43.md](../snapshots/q3-repair-report-review43.md), SHA-256 `8a2a1400aeca18cf6896c478c79deefbdf2182b53ba6068150fd885400304d93`. Review 42 remains the rejection of the original target, with report SHA-256 `71be35a0884bf9744581e298df3980734446f4ac6ac8698193f418cf2d78d71c`. This round does not rewrite it.

## Reviewers and coverage

Codex independent motion reviewer (`/root/motion_review`) authored Review 42 and did not author this repair. Coverage includes the production repair diff, emitted-manifest tests, actual input-method failure paths, exact rejected-source controls, and the byte-bound native-frame replay. The reviewer ran CPU-only checks. It launched no browser, server, GPU gate, build, data writer or population run. It did not perform another native image inspection. Root separately reports opening all 24 original probe3 images at native resolution and checking their digests; that is root's visual evidence, not a second image review performed here.

A second model CLI review was not attempted. Its previously reported OAuth failure remains unavailable coverage, not approval. Root remains accountable for combined integration, current documentation, final gates and acceptance.

## Reports

### Codex independent motion reviewer

I accept the frozen v2 repair of F23 and F24 within this capture component. The exact original defects are reproduced on rejected source and are repaired on v2. No new material finding was reproduced. The moving-scene flicker criterion remains unestablished.

For F23, `judgeFlicker` now assigns capture refusals at the predicate that produces them and also retains them in the aggregate command-failure list. The manifest consumes the capture-only channel. Non-adjacency, stale moving bytes, stopped counters, invalid copy binding, insufficient records and other record failures cannot be mistaken for a valid capture, while residual and search-model failures remain separate. Classification does not depend on parsing error messages. The real specification callback is exercised with external input, browser and filesystem I/O replaced; its decoder, copy validators, judge and emitted JSON remain real. Twelve stale nonblank images with moving adjacent observations now produce `captureValid: false` and eleven capture refusals. A residual-only sequence retains valid capture and the unresolved scene verdict.

For F24, release has a nested finally that awaits the pending observer even when release rejects. Capture rejection is tracked by a separate boolean, so falsy thrown values are not mistaken for success. The finite tests verify that simultaneous input and release failures cannot return while the observer remains unresolved; after it settles, errors retain input/release/capture order in `AggregateError.errors`, with the first as cause. Sole failures retain identity. Four additional independent cases confirm `undefined`, `null`, zero and false observer rejections remain failures and release is attempted once. The successful pointer/wheel sequence is unchanged. This is not cancellation of arbitrary promises: the existing eight-second page timer and outer Playwright/owned-runner deadlines remain the stated bounds for responsive and unresponsive pages.

The repair leaves the pixel estimator, fixed 0.005 bar, exact one-frame cadence, post-state binding and RAF copy implementation unchanged. Replay of both original manifests and all 24 PNGs through the actual repaired specification yields valid capture with zero capture refusals. Every complete pair record equals the original record, including compared/excluded pixels and estimated shifts. All 22 provisional residual failures remain: worst orbit residual `0.013971202526813584`, worst ascent residual `0.012164288734573956`. Both emitted manifests retain `sceneVerdict: not-established`. This result validates classification of retained evidence; it does not claim a new browser run or resolve the legitimate-motion counterexamples recorded in Review 42.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F23 | Moving stale bytes could be labelled capture-valid. | Resolved in the exact v2 target. The actual emitted manifest now receives predicate-owned structural/stale refusals, and the rejected-source control fails by value and reason. | Preserve the emitted-manifest regression and verify exact accepted bytes during integration. |
| F24 | Final mouse-release failure bypassed the active observer wait. | Resolved within the finite input/release/observer failure bounds. Actual-method controls remain pending until the observer settles and retain all failures. | Preserve deferred-observer and sole-error checks; retain the documented outer timeout boundary. |

No new material finding was reproduced. This disposition does not accept general scene stability, city performance or unrelated population work.

## Verification

Node `v24.12.0`. All 54 focused tests pass across seven flicker test files. The reviewer temporarily restored the exact rejected `judge.ts`, `capture.spec.ts` and `motion.ts` after checking their original freeze hashes. The two affected files then report five semantic failures and 17 passing cases: stale validity, counter/short-burst reasons, and the two deferred-observer early-return cases. A finally block restored the v2 bytes, and every one of the 18 frozen hashes matched again. This was an independent rerun, not merely inspection of the author's red log.

The native byte replay independently passes using the actual emitted specification and the author's retained replay harness after reading its mocks and assertions. Both original manifest hashes and all 24 image digests are checked; all 22 pair objects remain identical. The command selects the native replay case only, so its output correctly reports one passed and eleven unselected synthetic cases. Those synthetic cases were separately covered by the full 54-test focused run. Four independent falsy-error checks, `npm run typecheck`, and `git diff --check` also pass.

Ignored reviewer evidence is under `artifacts/motion-review-v2/wt/artifacts/review43/`: `focused-green.log`, `exact-old-red.log`, `native-byte-replay.log`, `error-identity.test.ts`, `error-identity.log`, `typecheck.log` and the frozen target copies. The copied replay harness and its emitted byte-binding report live in the same worktree's `artifacts/motion-repair-evidence/`. No full unit suite, audit, build or visual gate was run by this reviewer.

### Integration checklist

The combined milestone must preserve these accepted non-document bytes from Review 41 and this round. There are no overlapping production/test paths between the two components. Compare file SHA-256 values after integration rather than assuming a successful patch application preserves the reviewed bytes.

| Component | Path | Accepted SHA-256 |
|---|---|---|
| Lease v2 | `src/agents/population/routes.ts` | `70aa738cba24e456cb6d54532d13fc8e2a7607fc523a25fe92d0ffe16874713e` |
| Lease v2 | `src/agents/population/tick.ts` | `60b37eb84da5366babebfa377ab91c301967e9627a0c134000600fb129734057` |
| Lease v2 | `src/agents/population/pedestrian-terminal.ts` | `40b162bd8a259db111449e5931c08b9e5e5612b3405d06731753a43d136f4473` |
| Lease v2 | `test/pedestrian-terminal.test.ts` | `73464c18b4077aff45f6c8522aa25a20a6048bf90242b6c38a392e9b9806cd59` |
| Capture v2 | `test/flicker-adjacency.test.ts` | `369633a1f3c6d2dbd8b3ffcd2932f004216193f9a717fd2ca2ebad8e7842ece2` |
| Capture v2 | `test/flicker-burst.test.ts` | `b05dbfee834a35e417615267e61c58202ea46681df68b22ed3d1acb57639fce2` |
| Capture v2 | `test/flicker-calibration.test.ts` | `714188f07a5905507a8b7fe320f6c54629a7aaca50be478b37ac3c628136c4c5` |
| Capture v2 | `test/flicker-capture.test.ts` | `baba6c7ab924ecaa53cb2df08f49b686693d3afff2a18e65e7550df87555b393` |
| Capture v2 | `test/flicker-frames.ts` | `95504934949922119a9c8ac10f78e2c5f4867e6452b152b604aeaf1056ad1214` |
| Capture v2 | `test/flicker-judge.test.ts` | `5c6268a66497787a0c53228acbeb533c0bfc4eb6bcdd1123df55cda4e956f3b7` |
| Capture v2 | `tools/flicker/burst.ts` | `43ff6ed4ed85ea9f466e3d3df6fbd6f1575395885e13fe970d532dadae546c18` |
| Capture v2 | `tools/flicker/capture.spec.ts` | `01ae3961fa00e862f7e4bae3f488b60d90e52932aac2c088345e9d246c217366` |
| Capture v2 | `tools/flicker/judge.ts` | `eabaf2906ba2710f444ab8e4e4ac741dad44bbd10b9da03eb6a2ebaaabe2a1de` |
| Capture v2 | `tools/flicker/motion.ts` | `fe4d3aaa4608401d1ce0660ad05324577f846bcb01abf7e0ff1a4babac591fd1` |
| Capture v2 | `tools/flicker/playwright.config.ts` | `b99b3638f890f17a463715a753b395d6c2be0cb56583d7188196b4ab304ed8fb` |
| Capture v2 | `tools/inspect/crops.ts` | `7a7e453fefb2021571a997e06a082055780d86f1c9bf939851979db93eb3535d` |

The integrated reviewer must verify both full freeze manifests and this non-document table; reconcile shared `docs/devlog/summary.md`, `docs/learning/defect-register.md` and `docs/learning/gate-proofs.md` by retaining both components and newer primary history; preserve the separate detailed devlogs, exact reviewed document snapshots and Reviews 39/41/42/43; and check current status does not convert scoped repair acceptance into city or flicker acceptance. Authored historical review reports stay unchanged. Documentation merge choices need their own integrated inspection rather than inheriting two conflicting full-file hashes.

Run the required combined gates and affected integration checks before commit. Lease production changes prevent treating the earlier app bundle and visual gate as automatically transferable. A gate run and primary certification remain root's responsibility. Preserve the original probe3 bytes and rejected counterevidence until their cited handoff is recoverable, and remove review/worktree resources only after report and evidence ownership has transferred. Q4 preflight work is separate and is not included in this acceptance.

## Round outcome

F23 and F24 are resolved for the exact frozen v2 capture component. It is ready for root integration and combined review with the separately accepted lease v2. This review makes no commit, merge, push, primary modification, fresh hardware-capture or whole-scene acceptance claim. The detached review worktree and ignored evidence remain at `artifacts/motion-review-v2/wt` for root handoff and eventual removal. The moving-scene flicker criterion remains unestablished.

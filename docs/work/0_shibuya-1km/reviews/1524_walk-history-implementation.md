# 1524 — Complete walker history outside motion clones

2026-10-18. Implementation worker in retained `artifacts/traffic1499/worktree`, branch `codex/traffic1499`, under root's exclusive three-path write lease. Prepared against candidate3; no code commit, main integration or native acceptance.

## Result and mechanism

The adapter now keeps complete ordered events in immutable append-only chunks outside cloneable current motion. It feeds the existing controller only current motion and an empty per-update event list; that controller only appends events and never reads historical events. Its source is unchanged. Published previous, current and interpolated gait views expose the full historical prefix through an enumerable lazy `events` getter. A view caches only its own materialized array; there is no global prefix-array cache. Iterative traversal avoids recursion through old history. JSON and structuredClone diagnostic values remain complete.

`localGaitEventCount` reads a private WeakMap-backed complete sequence length. The prototype uses it at the two existing new-event checks, so merely detecting a departure or landing no longer materializes prior event payloads. Interpolation retains the previous sample's event prefix as before. Public frozen samples own immutable event payloads; admission.foot still receives an independent mutable full draft, with event materialization deferred until the callback requests it. Interval refusal and thrown updates restore the previous history head together with current motion.

Changes are restricted to `src/agents/population/local-walk-gait.ts`, the import and two reads in `src/agents/local-walk-prototype.ts`, and new `test/local-walk-history.test.ts`. No controller arithmetic, route, clock, renderer, quality, source cache, dependency or schema changes were made. The other22 frozen candidate3 paths were re-hashed unchanged. Historical source bindings were not changed.

## Verification

The new focused regression measures actual structuredClone arguments with an independently constructed256-event history through100 fixed steps and300 interpolations. Reintroducing the literal old gait reached the intended assertion:204,800 historical event payload copies versus expected0. This was an actual workload failure, not an import failure; that test imports LocalWalkGait only and needed no count-export shim. The command intentionally selected that one case; three unrelated cases did not run in the RED arm. A finally block restored the candidate's exact bytes and its hash was compared with the saved after copy.

After exact restoration, the focused bundle passed51 tests in6 files, Vitest10.31seconds: `node C:/Users/38909/Documents/github/maps/node_modules/vitest/vitest.mjs run test/local-walk-history.test.ts test/local-walk-phase.test.ts test/local-walk-support.test.ts test/local-walk-support-extraction.test.ts test/local-walk-native.test.ts test/app-local-walk-lifecycle.test.ts --reporter=verbose`.

This includes the independently pinned1,320-tick physical/current-controller-history digest, actual foot-linked phase and interpolated poses, finite real four-leg support and walking resumption, native draw composition, parser and app lifecycle behavior. New cases also check complete event order, previous interpolation history, old sample immutability, caller input isolation, mutable independent admission drafts, and refusal/throw restoration. No flaky frame-rate assertion is used.

The subsequent `node C:/Users/38909/Documents/github/maps/node_modules/typescript/bin/tsc --noEmit` returned tool-observed exit0 in5.25seconds with no output. No typecheck log was retained: the empty-output Tee-Object command did not create one. The handoff receipt records this worker observation; root still owes the independent final type gate. Scoped Git diff whitespace inspection passed. One initial runner invocation failed because a WT-local Vitest file did not exist; the existing PRIMARY installation was then used, without installing or changing dependencies. No implementation repair attempt was needed.

## Exact handoff and bounds

Ignored evidence is in `artifacts/performance1524/`: `before-gait.ts`, `before-prototype.ts`, `after-gait.ts`, `old-history-red.log`, `focused-green.log` and `handoff.json`. The receipt records original and final hashes and the other22 unchanged source paths. Root owns index, source freeze, independent review, final gates and integration; these three worker changes remain unstaged over the existing traffic candidate index.

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| src/agents/population/local-walk-gait.ts |13490|46a8a11de55c30a32a9ca3dc961d15a3b156ccaa4d53ecbb590baf2fd29ca657|
| src/agents/local-walk-prototype.ts |8208|6f7eef4952db753d79c3c55158eea70374b2d9e698c52568fa7d916d34ab5109|
| test/local-walk-history.test.ts |6104|1f7b78463640a6e6c8fab6f1c882d688b1c3e666e1eae7ba7f17bea0da05578f|

Full public five gates, browser flow and native performance comparison were NOT RUN. This removes a verified growing production workload; it does not establish that history dominated prior frame loss. The aged observer arm was faster despite more history, so a sole-history or observer-cause claim would be unsupported. Complete diagnostics still intentionally cost work proportional to the requested historical prefix. Getter descriptors differ internally from eager data properties; inspected consumers use field values, enumeration, JSON or structuredClone, whose complete values are covered. Independent review and later native evidence must assess adoption.

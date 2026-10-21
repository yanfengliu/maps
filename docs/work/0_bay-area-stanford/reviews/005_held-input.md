# Review 005: integration

## Target

Reviewed on 2026-10-20: continuous held-WASD navigation and the exact Vite 7.3.6 → 7.3.7 patch update against `cd5ade1565ebb9a9904d894620bdd2c443392edf`. The integration owner froze the six files below in `C:/Users/38909/Documents/github/maps/artifacts/held-input-review/worktree`. This round excludes the subsequent architecture increment. The preserved tracked patch and initial new-file bytes are under that worktree's ignored `tmp/review-runs/005/candidate.diff` and `input-target/`; `wheel-target/` preserves the corrected keyboard controller and tests. The owner must bind these bytes to a recoverable commit before removing those records.

| File | Final SHA-256 |
| --- | --- |
| `src/main.ts` | `7872c8bafab04affaf7a5a8a913f1d023f7a20cc6cc19cb3546853881f1c0d85` |
| `src/keyboard-pan.ts` | `3c04f7757d672a2336fc77e1b379f5e2b95a5b636b234abc8893484aa1559dda` |
| `test/keyboard-pan.test.mjs` | `2ef51b1d1e4a2dbe8ee793792b69e7a2bf459fe72fb31785b6be5383b613009f` |
| `README.md` | `704b30b072f48fcddadd2e1ad9649967648976863892522e919170b84cfed8ab` |
| `package.json` | `a60eb47448c7c97db993481c5f7b16cd12439e9584652db53c818ded8fc824c2` |
| `package-lock.json` | `cb96a4a2e359b287ec63cd7476ca79abef667ec8bbd1ed59d24846237bb6c0f8` |

## Reviewers and coverage

Independent Codex reviewer: `held_architecture_review`. I read the instructions, local rules, lessons, bounded task record, canonical multi-CLI runbook, complete controller and tests, application startup/cleanup, adjacent input handlers, relevant pinned MapLibre source, actual browser verification scripts, and recorded results. No source changes, package-gate reruns, browsers, servers, embedded-browser access or application-setting changes were made by this reviewer. This report and ignored review evidence are the reviewer writes.

The independent Claude lane was attempted with the canonical model and effort on installed Claude 2.1.281; installed Codex was 0.158.0. Claude initialized with the requested pin but exited 1 with `API Error: Connection refused — a firewall or proxy may be blocking it (ECONNREFUSED)`. Its final `modelUsage` was empty and it read no source. This is an unavailable lane and an abstention, not approval. No unpinned fallback or retry was used. Raw output is retained under `tmp/review-runs/005/`; transport identifiers and echoed prompt details are omitted here. Before/after content hashes were identical. Owned Claude PID 44732 exited; direct process lookup confirmed it absent. A scoped child-process CIM query was denied by the sandbox and the owner was asked to include that tree in final resource cleanup.

## Reports

### Independent Codex source and evidence review

No material finding remains after the wheel correction. A single recognized, non-repeat keydown enters the held set; elapsed-time RAF updates continue until release. Normalized diagonals retain speed, opposite directions cancel without an idle RAF loop, and removing one opposing key resumes the other. Modifier/composition input, canvas/window blur, hidden visibility and disposal clear movement. The 50 ms elapsed-time cap prevents a resumed frame from catching up with a large camera jump. Native arrow handling remains separate.

The controller binds only to the canvas and is disposed before `map.remove()` at [src/main.ts:474](C:/Users/38909/Documents/github/maps/src/main.ts:474). Inspected paths outside the changed hunks include search focus handling at [src/main.ts:197](C:/Users/38909/Documents/github/maps/src/main.ts:197), the frozen read-only observer at [src/main.ts:461](C:/Users/38909/Documents/github/maps/src/main.ts:461), and pointer capture/lifecycle in [src/mouse-tilt.ts:13](C:/Users/38909/Documents/github/maps/src/mouse-tilt.ts:13). The adjacent handlers retain their behavior.

F0, initially material: the first controller paused only for pointer presses. Its per-frame `panBy()` calls reset MapLibre's active wheel handler, reducing zoom during held-W. This mechanism is grounded in installed MapLibre 6.15.0: `src/ui/camera.ts:528` delegates through `panTo()` to `easeTo()` at line 862, whose stop path invokes handler reset at line 1610; `src/ui/handler_manager.ts:383` resets every handler. These are actual reads outside the application diff. A real wheel comparison reproduced the defect: the same wheel delta changed zoom by `0.5733017913063296` without W and only `0.20360405837607942` during held-W.

The correction at [src/keyboard-pan.ts:65](C:/Users/38909/Documents/github/maps/src/keyboard-pan.ts:65) listens passively in capture, cancels held RAF work before native wheel handling, and extends one 500 ms settling timer on each wheel event. The pinned wheel implementation uses 200 ms smoothing followed by a 200 ms finish delay (`src/ui/handler/scroll_zoom.ts:318` and line 352). Settlement checks pointer priority and the current held-key set before resuming. It therefore resumes at zoom limits without depending on a zoom event, and cannot restart released keys. Blur/hidden/disposal cancel the timer; an already-queued callback respects the disposed guard. The corrected real-control run produces exactly the baseline zoom delta during held-W.

The dependency diff updates only the direct Vite pin and its lockfile version, registry URL and integrity. It adds no dependency or other package version. The retained post-update audit contains zero vulnerabilities; its bound is the registry audit result at that run, not a proof that the dependency has no possible vulnerability.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F0 | Held WASD truncated wheel zoom by repeatedly resetting the native wheel handler. | Resolved. The owner accepted the source finding, reproduced it with actual controls, and supplied the bounded wheel-priority correction. Focused source and evidence re-review found no remaining material issue. | Final controller/test hashes above; `wheel-red.json`, `wheel-final.json`, and the two new timer/cleanup tests. |

## Verification

I inspected the initial `artifacts/held-wasd/verification/final.js` and `final.json`: 41 assertions pass. The actual input log has one non-repeat W keydown, repeated late camera movement, and one keyup followed by stable camera samples. Other checks cover normalized diagonals, opposite-key cancellation/resumption, modifiers, uppercase letters, search isolation, campus/Quad navigation, tilted panning, native arrows, and simultaneous held-W with left/right/middle drags. The earlier one-frame regression control and simultaneous-drag red result demonstrate that the relevant checks can fail. These 41 checks precede the focused wheel repair; they are not represented as a rerun of the final wheel bytes.

I then inspected `wheel-final.js`, its nine passing assertions, `wheel-red.json`, and `wheel-source-hashes.json`. The source hashes match the final controller/test bytes above. The actual-control sequence compares identical wheel deltas from overview, verifies matching native zoom, release before/after settlement, actual zoom-limit resumption, and focus loss while a wheel timer is pending. The general resumption assertion also includes wheel-induced center movement, so it alone does not isolate resumed pan; the separate zoom-limit check does establish that resumption without a zoom displacement. Unit tests additionally cover repeated wheel events, pointer priority, hidden visibility and disposal, including a queued callback after disposal.

| Inspected evidence under `artifacts/held-wasd/verification/` | SHA-256 |
| --- | --- |
| `final.json` | `498d9f3112038be1494ed97f02ccfc1e47e75edb775d4248594773d582031320` |
| `wheel-red.json` | `e603a7d6f13698adf1ced8c5fb48a80b30007b5b7191645a764a7d7ca228196c` |
| `wheel-final.json` | `a6a002f37532790f3d718e0e437dc5bb52d31b9b71195a2ff802375ca0b2ba36` |
| `audit-final.json` | `e4d600c9746eeed0148ff9bd736f108b5a2a4428aafac822f4fb2fd095f6147d` |

`git diff --check` passes on the frozen source. The owner reports final Node 24 typecheck, 34 tests, build, and audit with zero vulnerabilities passing. I inspected the tests and recorded browser evidence rather than independently rerunning those package gates. The browser evidence is headless Chromium at 1440 × 960; it does not prove physical Safari/mobile behavior or embedded-browser recovery. Recorded MapLibre render-event cadence is not physical display FPS.

## Round outcome

GO for the six exact input/dependency files above, with F0 resolved and no open material finding. Independent Claude review is unavailable. Commit/merge, final integrated acceptance and process cleanup remain the integration owner's actions. The user-reported embedded-browser hang remains unresolved and is explicitly outside this approval; the earlier policy denial was not retried or bypassed. Architectural fidelity and photo-grounded building details require the separate architecture review.

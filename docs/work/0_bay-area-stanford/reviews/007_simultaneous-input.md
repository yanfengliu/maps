# Review 007: simultaneous input

## Target and outcome

Reviewed 2026-10-20, against clean main `8ac22de89acba2ac85d70c3bf15f321c78a14b2d`. GO for the exact input candidate below; no open material finding. The user explicitly replaced the earlier gesture-priority behavior with true simultaneous WASD and mouse movement. Environment rendering remains a separate review in 008. This review does not resolve the embedded-browser hang or certify untested devices.

| File | Reviewed SHA-256 |
| --- | --- |
| `src/keyboard-pan.ts` | `88219435f0ac0f3dee17d5eb5d52507c114ee17cc3b995de4b5ed7979199f004` |
| `src/mouse-tilt.ts` | `e1032faea7f6f366be572d2e15819b30ca1925d7ae254083f2cef2fe22d12bb5` |
| `src/input-handler.ts` | `16637dbbb3d898f267ede7aa0915c0ff012bfe19c801727a821375f0e09fd9c9` |
| `test/keyboard-pan.test.mjs` | `536d83e8d9cdf9ccbbbb5c52494ecbf21e999c15a1b7f3408d25d6c9d3d3610d` |
| Combined `README.md` | `83ffe35aad39ce1d25db67251df66d6d400a9ec8b0ae664af33a4288e0fdce58` |

The frozen input worker README was `854997be93983d225540d88c26bc8811157c52592461757766bf60dea4d44cbb`; the combined README adds the separately reviewed environment paragraph. Application wiring was inspected in `src/main.ts`, hash `80d13ec33e4b0d4ad282daccfda8486eabf8dce2a75910997d197985ad495cd3`; its changes are four environment paint expressions, with input registration/disposal unchanged. Exact reviewed files and the tracked patch remain outside the disposable worktree in ignored `artifacts/simultaneous-review/evidence/007/target/` and `candidate-tracked.diff` until the owner binds them to a recoverable commit.

## Independent report

Reviewer: `held_architecture_review`, independent Codex source/evidence review under the canonical multi-CLI runbook. I read every changed input module and test, the relevant pinned MapLibre 6.15.0 implementation, browser scripts/results and the native screenshot. I made no product edits, launched no browser/server and did not duplicate package gates.

The bounded adapter appends application handlers after native handlers, accepts earlier handler identities, and leaves native allowlists and methods unchanged. Keyboard pan is produced only on native render frames. This matters because `HandlerManager.mergeHandlerResult` uses overwrite semantics within one event, while `_applyChanges` sums deltas from distinct queued events. Middle-button pitch enters through native mouse events, so it no longer calls public `jumpTo()` and stops the held keys. The version and interface guards make this private integration an explicit compatibility boundary at [src/input-handler.ts:18](C:/Users/38909/Documents/github/maps/src/input-handler.ts:18).

The keyboard uses elapsed time, normalized directions and a 50 ms catch-up cap. Opposed keys stop requesting frames; release of one resumes the remaining direction. Focus, hidden visibility, modifier/composition input and native reset clear keys. The native zoom anchor is cloned, checked for finite coordinates and offset by the keyboard delta; the native point is never mutated. This preserves simultaneous movement during active zoom, its quiet finish interval, centered wheel input and relocated bursts. The code deliberately sets `noInertia` on keyboard/middle contributions: native inertia is suppressed for the entire combined frame, preventing keyboard release drift. Mouse-only native handling remains in its existing pipeline; this is not a claim that mixed-input inertia is unchanged.

Handler identity remains registered through the trailing render frame or map removal, so native event completion cannot dereference an already-deleted `_handlersById` entry. Disposal removes the exact owned registration and listeners. Outside-diff reads included [src/main.ts:381](C:/Users/38909/Documents/github/maps/src/main.ts:381), where middle and keyboard handlers are installed in order, and [src/main.ts:475](C:/Users/38909/Documents/github/maps/src/main.ts:475), where they are disposed before map removal. In the installed dependency I read `node_modules/maplibre-gl/src/ui/handler_manager.ts:374`, `:517`, `:545`, `:709`, `:797` and `:854`, plus `src/ui/map.ts:4403` and `:4559`: these establish registration, delta merging, anchor behavior, end-event ownership, render ordering and queue cancellation on removal.

## Findings and dispositions

| ID | Finding | Disposition and verification |
| --- | --- | --- |
| F0 | The old pointer/wheel pause did not meet the new simultaneous-input requirement. | Resolved. Restoring the old controller makes the first real stationary-right-button plus W assertion fail with unchanged camera samples. Final candidate keeps moving before, during and after native gestures. |
| F1 | The first additive candidate emitted pan deltas but omitted an anchor. MapLibre's exact-center shortcut returned the original center and produced no movement. | Resolved at [src/keyboard-pan.ts:42](C:/Users/38909/Documents/github/maps/src/keyboard-pan.ts:42). Diagnostic logs showed repeated active held frames without resets; source inspection isolated the anchor path. Final native checks cover centered wheel input, finish intervals and bursts. |
| F2 | Releasing W during left-drag emitted premature `dragend`/`moveend`, followed by another start when mouse movement resumed. | Resolved at [src/keyboard-pan.ts:24](C:/Users/38909/Documents/github/maps/src/keyboard-pan.ts:24). After contributing, the handler retains event ownership while public `dragPan.isActive()` remains true, without producing keyboard deltas or scheduling an idle loop. `sensitivity-red.json` reproduces the early end with native pan active; `sensitivity-green.json` records one start/end pair ending only after native release. Ownership clears when both inputs stop. |

## Evidence and bounds

I read `artifacts/simultaneous-input/verification/controls.js` and `final.json`: all 40 final assertions pass. They use actual controls and non-repeat keydowns. Coverage includes keyboard-first and mouse-first stationary holds and active left/right/middle drags; releasing either input while the other continues; independent north/west pan components; short overlap and continued drag; full wheel zoom, exact-center wheel, quiet tail, relocated bursts, zoom limit, focus change and stable release. Native and held-W wheel deltas are both `0.5733017913063314`. The final source manifests match the four executable/test hashes above. Temporary event instrumentation used for the sensitivity run is absent from the final source.

The separate pitched comparison subtracts the keyboard direction using a cross-product ratio; mouse contribution is `1.0240561923289364` relative to native mouse-only movement at pitch 60°, pointer start `(1050,500)`. This supports the tested combined gesture within the gate's 10% tolerance, not exact projection equivalence at all screen positions. One intermediate control run failed because the 2D animation was interrupted by the following compass action; the gate was corrected to settle both actions before measuring north-up movement. That setup failure is not claimed as a product regression or a passed run.

I inspected `output/playwright/simultaneous-controls.png` at its native 1440×960 resolution and independently verified SHA-256 `6ad24a471ab15d94dc5657b741104953af77c4356f80559507b6e483282bbeab`. The screenshot supplies visual context; motion correctness comes from the timed control evidence. The owner/worker report all 42 unit tests, typecheck, build and audit passing, with zero audit vulnerabilities. The existing large-chunk build warning remains. These are worker gates; final integrated environment checks remain with the owner.

Claude review is unavailable, not an approval. The one fresh attempt for this increment, launched against the environment snapshot on installed Claude 2.1.281 with the canonical pin and effort, produced initialization and API-retry events only. It had no assistant/tool messages or final result/model usage before the 60-second timeout. Sandbox cleanup was denied; an approved stop then terminated only owned PID 45528. Post-termination checks found the PID absent and no source changes. Raw evidence is retained outside the disposable worktree under `artifacts/simultaneous-review/evidence/008/`; no further retry or fallback was used. No Claude review of this input target was obtained.

The worker separately disclosed a cleanup-collector error: PID reuse caused four older unrelated processes to be selected, but Windows rejected all attempted stops and their identities remained alive. The owner reports a corrected executable/creation-time selector and a red/green non-destructive regression fixture. I read the retained incident annotation and final cleanup result; I did not independently exercise process cleanup. This tooling incident is not a product pass or failure. Final cleanup, integration, commit and remote-gate status remain the integration owner's responsibility.

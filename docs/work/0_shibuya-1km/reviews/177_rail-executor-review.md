# Review177 — refuse frozen176 native capture executor

**Refuse native execution admission for this exact176 packet.** Two reproduced contract failures remain: the executor accepts the app's failed post-processing fallback, and its frozen inventories omit code unconditionally loaded by the preview server. Root must not issue a native lease for these bytes. Preserve176 as rejected evidence, repair only these findings in a successor packet, and obtain a focused independent review before launch. This report grants no GPU/port lease or appearance acceptance.

Independent reviewer: rail_executor_review, assigned Astra/xhigh, 2026-09-27. Workspace: C:/Users/38909/.codex/worktrees/shibuya-quality/maps at detached0ec3dd03831b605235302212b7d140cb35297071. All reviewer writes are confined to artifacts/rail-capture-executor-review-20260927. The root owns promotion of this authored report. Review107's Codex CLI logout and Claude401 remain unavailable lanes, not approvals; neither was retried. This is one grounded in-app review, not a dual-CLI review.

## Exact reviewed target and preservation

I read176 REPORT/CAPTURE-CONTRACT and the actual bound-runner, capture specification, native copy/input code, policy, envelope, preflight and retained-handle wrapper. I read172's admission and170's actual successor binder/config, the immutable binder, application render/bridge/post paths, OrbitDriver, the original flicker copy, the pure process classifier and installed Vite import paths. No source, old report, old binder, original executor or dependency was edited. No build, data command, installation, browser/server/GPU run, full repository gate, commit or push occurred.

Both preserve.mjs passes verify all1373 executor inventory files (374410625bytes),390 sealed packet/prior-evidence records, the complete170 source/build/harness/overlay/served inventories and the dirty/untracked roster plus binary Git diff. before.json and after.json are identical. These are file/inventory checks, not1373 or390 tests.

| Reviewed input | SHA-256 |
| --- | --- |
|176 REPORT.md|09a0aed1e8a60fa7d6da20e682cdee43d7a6f360ca47fa6380916e62ab355df9|
|176 HASHES.json|4137f27f4be401a67d91a0a3faca567f3338042bcbe7984b716d6d9c28358090|
|176 executor-freeze.json|e6d749d2577b37bbd8debba85ca674ab35ad5dd5c1378a9cf0a0a875b4643c4f|
|176 executor inventory digest|cfc8b6ee98d3ef192fc5ba73900209d9d51ab9325d0534f377380ef86def94a7|
|170 runtime-freeze.json|090f6a680a92638768985175f0bebe1ccccb94a8bd4deac8f6b03718d2a1681f|
|170 source|fd1bfbea9248dbfb18686934134860d1d4a8bf1b4392520c600701f1142a79cc|
|170 trial build|f88f0162b73a6348715ac1768b5ac5978db40bb49dd52d1f22c2ec0c0c8eb01c|
|158 unchanged overlay|c7a65f1a4abe5c1fb9385911f591f7a580b98cdef55bca1153c60bf3c062b701|
|117-file served baseline|dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c|
|Current tracked Git diff|d56850071877c07e22285b03863abde4fca1a77b9665f4397bf05021213a6087|

## Findings

**R177-P1 [P1] — reject failed or inactive post processing before collecting a purported ready scene.** artifacts/rail-capture-prep-20260927/policy.mjs:8–18 checks renderer, tiles, actors and clearance but never requires post.active or post.error. assertCopy at20 only checks that this omitted failure remains unchanged, while motionChecks at35 rejects accumulation but accepts an inactive chain. The actual capture verify at capture.spec.ts:18 and the final receipt path at bound-runner.mjs:30 reuse this incomplete policy, so neither adds the missing refusal.

This is a reachable application state, not a fabricated status combination. Outside the executor, src/render/post.ts:214–226 catches chain construction failure and returns fallbackChain; at301–317 it continues renderer.render while reporting active:false and the error. src/app.ts:375 supplies scene/building failure to status.error; src/harness/bridge.ts:182 and205–206 expose post failure separately. A ready scene, advancing app frames and nonblank native copies therefore do not imply working bloom, ambient occlusion or temporal anti-aliasing. This would collect a materially different visual result despite the contract's failure stopping rule.

fallback-control.mjs runs the actual transpiled createPostChain source with only constructor/renderer stubs. An injected EffectComposer construction exception reaches the real fallback implementation and performs one direct draw. Its real returned status has active:false, a named error, empty passes and taaAccumulating:false. The actual frozen assertReady, assertCopy and twelve-frame motionChecks all accept it; fallback-control.json retains that result. This is a CPU reproduction of the missing refusal, not a native GPU-failure reproduction. Repair the shared ready policy to require an active, error-free post chain on every observation, and retain a regression control using actual fallback semantics so collection and final receipt validation both reject it. The injected fallback should remain red while an ordinary active status remains admitted.

**R177-D1 [P1] — bind the reachable preview code dependencies, not just direct package directories.** prepare-check.mjs:27–29 inventories Vite and the esbuild executable but omits installed JavaScript/native dependencies Vite loads. envelope.mjs:17 compares only those selected roots;170's runtime-freeze contains source/build/harness/scene inventories and does not fill this installed-code gap. Pinning package-lock.json describes expected packages but does not hash the installed bytes executed here.

The actual configured command reaches node_modules/vite/dist/node/cli.js:665–669, which imports chunks/preview.js; that file:2 imports chunks/config.js. Outside the executor, config.js:4,13–14,22,31 unconditionally imports rollup/parseAst, picomatch, esbuild, fdir and tinyglobby. Rollup's parse entry imports native.js, whose requireWithFriendlyError path loads the platform-native module. These are part of this launch, not hypothetical optional integrations.

dependency-control.mjs registers a synchronous Node resolution hook and imports the actual installed Vite package without calling preview, reading the trial config or starting a server. It records20 loaded code files and canonicalizes paths through the node_modules junction before comparing against the union of executor and170 runtime records. Fourteen loaded files are absent: @rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node; esbuild/lib/main.js; fdir/dist/index.mjs; ms/index.js; six picomatch files; rollup/dist/es/parseAst.js, rollup/dist/es/shared/parseAst.js and rollup/dist/native.js; and tinyglobby/dist/index.mjs. dependency-control.json retains exact resolutions, parent edges, sizes and SHA-256. The shared config.js import establishes reachability from the actual preview command; the import-only control is not a full-launch dependency census. At least these14 code files can change without changing either asserted inventory. Repair the successor inventory to cover the actual executable dependency closure of this launch, including config-loader/native dependencies, with a bounded omission/change refusal control. Do not interpret14 as a complete closure or widen this into an unrelated dependency audit.

## Positive review bounds

The reviewed code retains27 poses,62 stills and four12-frame N0 motion records; it preserves the original roster, disclosed reserved H0/H1, N2/N3 diagnostics, N5 context-only and unknown-live diagnostics. Real pointer/wheel/combobox controls are used. Eye/target and angle limits remain0.10m/0.001rad. Frozen source/build/overlay/baseline bindings remain intact. These positive observations do not override either finding.

The synchronous native RAF copy at native.ts:36 observes before, copies once and observes after in one callback. Outside the executor, src/render/loop.ts:89 schedules the next application callback before its render at162 and frame increment at163. Under this existing RAF order, the copy callback follows the app render. The policy requires exact same-task observations and motion frame-ID adjacency. The fake-DOM control executed the actual frozen copyNative:12 copies/encodes with12 buffers released and no RAF timer left; an observer failure on frame4 retained3 prior copies and released12 buffers with no timer. This establishes control flow and partial retention, not real WebGL copying, input delivery, native cadence, visual appearance or the observer's live CPU cost.

The ownership wrapper requires retained matching live-parent and child identities at run-owned.ps1:69–77, protects PID29932 at62, and uses retained handles for termination at113; its final inventory at134 is observation-only. The existing six fake-CIM tests passed independently in3.80s, including recycled/exited-parent and executable-path rejection. No live cleanup claim is inferred from those fixtures. The wrapper's stated short-lived unobserved-process limit remains. Context/browser cleanup, no-retry/global/owner timeouts and receipt separation were read; no native execution was attempted to qualify them.

## Checks, cleanup and handoff

The28 original CPU refusal controls passed while the independent fallback control reproduced R177-P1. Actual copy-flow controls passed positive and partial-observer-error arms. Six fake-CIM ownership tests passed on Node v24.12.0 using an owned vitest.config.mjs, --configLoader runner, cache:false and one worker. TEMP/TMP were confined to this review's temp directory; NODE_DISABLE_COMPILE_CACHE=1 was set for controls. Vite import resolution reproduced R177-D1 without preview/config/server launch. Original176 self-tests and copy source were read or executed without rewriting their output paths; new results live only here. No build/types/audit/full visual/lifecycle gate ran;176's receipts were read as176 evidence, not relabeled as independent passes.

cleanup.json records no task-owned Node/browser/GUI process and no port4333 listener. No process was terminated. Foreign EdgePID29932 retains the observed creation identity2026-09-26T20:40:54.268535-07:00 and remains untouched. Only this review's cache/temp were removed after resolved absolute containment and reparse checks. Original176 run-01 and execution-lease.json remain absent. No image or collection receipt was produced.

Retain this report, controls and seals as the refusal handoff. Root accepted these two findings for bounded repair. The source/worktree remains frozen, uncommitted and unmerged under root ownership. This review slot is released. Independent successor review and a separate root lease remain required before native collection; native inspection, appearance acceptance and final integrated gates remain outstanding.

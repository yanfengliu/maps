# 1478 — Moving FXAA source and native review

Date: 2026-10-17. Independent read-only review; decision **HOLD**. Candidate2 does not resolve the material crossing-quality finding in 1476. No source, test, staging, capture, gate or server mutation was performed by this reviewer. This authored report is the sole reviewer-created artifact and remains under the ignored task directory for root intake.

## Reviewed target

Unlanded `codex/train1473`, worktree `artifacts/train1473/worktree`, base `8bb2200118606f7d457d0c5218e008d69feedafc`. Focus: `src/render/post.ts`, `test/post-motion-sampling.test.ts`, and the expected-pass additions in `tools/visual/{hero,smoke}.spec.ts`. All 13 candidate paths matched the original capture freeze, and all 13 matched the corrected final freeze after the test-only error-reporting repair. No owned unstaged difference was present at final read.

The literal reviewed 13-file set is preserved in `artifacts/train1473/candidate2-source/`, with patch `candidate2.patch` SHA-256 `d802e87f2ab651093a34098a1ae13d82787dd3ca0346bd871b6e2d50366092db`. These preserved bytes remain the review target if the working branch advances.

Capture freeze `candidate2-capture-freeze.json`: `14b71c232331076dac014bca73e4f8ae6a3747473415d1b9ec066238c91311c2`. Final `candidate2-freeze.json`: `de25b6245be0963bbc9d9d11f5ef0ee1ed51dfdeb0196daf6bb671a85672ab02`. The only changed freeze entry is the test, now `db54f481875941d9c22747a6a3639d6b3e7ec3edc7d52a9e7fe58ab70307bcfc`. Runtime post remains `584dbba8d2b4dcb1cf4fa2d517aa455b5eb21aa6e1f0b61dc1c40b5f9b62a863`; arm A post is `ae2435d754c5bb934e46c68e0e53fbc8b76c9674acb26763195dda1b4825eb59`.

## Material finding

**1476-P2 remains OPEN — preserve crossing detail while the train moves.** The added filter at `src/render/post.ts:227–232`, enabled at line 267, reduces the sharpness of some staircase edges but does not recover the retained crossing appearance. In B dusk and noon crossing originals, the left crossing and receding western markings still show broken/interfering fine stripes. B also softens small SHIBUYA/TOKYO lettering, shop-window content, paving joints and thin facade detail. The two approach pairs show the same loss of fine facade and rail detail. This is an inadequate quality tradeoff for the approved repair, even where individual jaggies look less harsh.

The retained `artifacts/visual-gallery/images/current-lifetime-world.png`, SHA-256 `ff28bbc5ac0bf128bd1cb9f2783e1ff570ec7f95ffe0e636ce38c423aa696793`, has cleaner separated crossing stripes and crisper fine detail than candidate2. It is the same named, visibly aligned dusk crossing from adopted `59fbb1ce7fedaaa9e43d6747fb35994790d093b5`, run `5addbb3d1eb59de0`. Its inspected retained record has no numerical camera, so this is not a claim of exact baseline-pose equality. Exact A/B alignment is independently established below.

Both B corridor originals show a recognizable four-car train in different positions, with no obvious duplicate silhouette or trail in those two stills. They do not prove continuous ghost-free motion, wheel contact throughout a passage, or transition quality. No second runtime logic defect was found in the four AA paths.

## Source findings and bounds

Installed Three is 0.180.0. `OutputPass.js:18–21` explicitly requires an sRGB-input FXAA pass to follow output. Its lines 83–105 take the actual exposure, tone mapping and output color space from the renderer. Candidate order preserves the linear AO/bloom stages before ACES/sRGB, then FXAA. `FXAAShader.js:262–292` samples the current input and writes the filtered color without a second tone-mapping/encoding invocation.

`EffectComposer.js:228–254` skips disabled passes, selects the last enabled pass for screen output and swaps the actual buffers. With FXAA enabled, OutputPass writes the existing composer target, then `ShaderPass.js:95–115` reads that buffer and draws its fullscreen mesh. With FXAA disabled, OutputPass is again last. FXAA adds no history, owned render target, asset or extra scene sample. The existing 4x multisampled scene and composer targets at `post.ts:185–200` remain unchanged. One added fullscreen draw is a source-level work bound; GPU cost and resolve overhead were not measured.

`post.ts:264–288` retains two fresh spatial scene samples while moving, resets accumulation on movement and bypasses FXAA while still. The installed TAA moving branch calls SSAA and resets history at `TAARenderPass.js:84–89`; its still branch accumulates 32 samples. Actual composer physical-size propagation (`EffectComposer.js:149–152,315–328`) supplies FXAA reciprocal resolution (`FXAAPass.js:32–34`). The renderer DPR is fixed at creation by `src/render/renderer.ts:63`; app resize calls renderer then post at `src/app.ts:371–378`.

Normal app teardown is guarded by `src/app.ts:440–448`; `post.ts:311–313` disposes each pass and then composer. FXAA inherits material/quad disposal from `ShaderPass.js:125–129`; composer disposal frees its own targets/copy pass at `EffectComposer.js:352–357`, without disposing the user passes again. Actual FXAA material disposal and pass/composer call counts are exercised in the focused test.

Outside-hunk context read includes `src/app.ts:176–244`, `src/render/loop.ts:147–163`, `src/scene/rail-trains.ts:93–157`, and `src/harness/bridge.ts:180–200`. Fixed updates precede frame callbacks and rendering. The app's train movement veto remains in the stillness predicate; FXAA does not change that ordering or the train clock. The inspected moving samples are well away from zero speed. Sparse samples and the stubbed app test do not establish every dwell/reversal transition.

## Focused-test correction

The test invokes production `createPostChain`, actual composer ordering and installed TAA/FXAA render methods. Only AO/bloom/output GPU draws are stubbed. Literal expected current poses/jitter offsets, moving/still transitions, DPR2 resize and disposal counts are useful control-path checks. Its texture comparison observes the pass's own bound uniform, not independent output pixels; it cannot establish tone-mapped texels, native sharpness, ghosting or GPU cost.

The original `candidate2-red.log` is INVALID as a witness for the intended assertion because finally's uninstalled-material-listener assertion masked it. The final test at lines 92–98 retains the primary failure in AggregateError if disposal checking also fails, while preserving the disposal assertions. Read `candidate2-red-corrected.log` (`58d4e1030169b62fbafae20207416a99124357950084c2fc136a530a3f8f6b7f`): its first error is the missing `fxaaEnabled: true` assertion at line 58 against old post; its second is the disclosed material-disposal assertion. Restored `candidate2-focused-corrected.log` (`4c83d281a468ede4773f3ba204834fe88a283d7954ef585a8ed51d6bc41b8c99`) reports six files / 16 tests PASS. The retained build log reports PASS. Typecheck PASS is worker-reported; its empty redirected log alone is not independent exit-status evidence. Reviewer ran no tests or builds.

## Native evidence

All ten originals were opened individually at their native 1280x720 resolution after terminal release, in batches of no more than three. Their actual byte lengths, PNG dimensions and SHA-256 match `frames.json`. The retained ff28 original was also opened natively.

Capture: 2026-10-17 23:25:48.364–23:27:38.927 UTC, 110.563 s, seed 9137, headless RTX 4090 ANGLE/D3D11. `capture.json` is `f85730770aee7e4533f6c9b12712f9e860cda1607dd2607a8a6ffcc219929c25`; `frames.json` is `81bc620dd66cbc19d67715f36cbd63e1f44984d6d87d308f9f35ddf86eb521ba`; `candidate2-arm-bindings.json` is `aaade3b885788f2846f10d51dd7e1c39767fb962eb76a42b49c96a8ce104f93c`.

Independently rehashed all listed arm assets and all six A / seven B source-map bindings, including both exact post sources. Capture before/after lists are equal for source139, A-dist6, B-dist6, scene121, rail34 and harness21 files. This binds the retained bundles and capture's input record; it is not separate served-HTTP attestation.

Each image's before/after camera is identical. Across the four A/B hero pairs, the greatest coordinate difference is 5.97e-13 m and greatest angular difference is 1.55e-15 rad. All bracketed A/B observations have TAA accumulation false, zero accumulated samples and level1. All six B observations have FXAA true before and after; their bracketed train speed is 10.68–12 m/s, not a dwell workaround. Screenshot observations bracket 13–17 advanced frames, so they are not same-frame telemetry. The two corridor samples are 116 before-observation frames / 1.9332 simulated seconds apart; row timestamps differ by 1.920 s. Uninspected intervals support no appearance verdict.

| Original under candidate2-native | SHA-256 |
| --- | --- |
| A-dusk-crossing.png | abe67d1ee0689db2bae55f0f8cceda1145e366ae802faae8ae204bfc55b10671 |
| B-dusk-crossing.png | 0ac9df0a90c2db3c0b77793251d475a425320946029b978106e7846a7ef82865 |
| A-noon-crossing.png | bcf40763f2b1130d7cad46b3dc305c46b9f1c7babaf99f1bc02ad3d1dd736966 |
| B-noon-crossing.png | 243b917b4519525f175613f2bbeb1b67852c7d8d27320c33f42a5e2cb59fdc5b |
| A-dusk-approach.png | 6af15232f9406c029b80d6696f525be0fa6c667a4882bec11ca58b1cc372934e |
| B-dusk-approach.png | c56ef551bfe2b6ef1bd0ebfa811ab27fb48f8593ded7c752ae7837b1c3e52450 |
| A-noon-approach.png | 3193c589d4c3ecade04d503a82fd9bc4ed2ba54a61545cf6913884928da2bfc0 |
| B-noon-approach.png | de6d1eec7bc95d71806197c572ee4203016a3cf341e34a4f318d0e24aa57f5a4 |
| B-corridor-0.png | eb4840fd517cb72299a11003c8457b137a4c0d4116227a6fc83d229ae332ede1 |
| B-corridor-1.png | 37a6156a392831379587d6f76d1fa25f3a24d0678b203d6e1c3b22346add18ee |

Read cleanup receipts: capture page/context/browser/server/esbuild close flags true; wrapper exit0; fresh final census passes with all five recorded identities gone, no known/omitted remainder or late child edge. Later confirmation records zero listeners, zero remaining owned identities and removed owned TEMP. This reviewer launched no browser, GUI, server or persistent process.

## Disposition

HOLD candidate2's visual acceptance and keep 1476-P2 open. Do not promote this branch merely because it improves some edges over candidate1. The native result is enough to reject this FXAA tradeoff; no parameter loop, new capture or full public gates are requested by this review. Root owns the next mechanism and integration. No candidate2 PRIMARY final five-gate run, integrated review, merge or push is claimed. All 35 implementation items and 14 final acceptance criteria retain their existing open/partial bounds; continuous motion and A10 full-population performance remain unmeasured.
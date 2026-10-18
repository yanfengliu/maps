# 1481 — Moving SMAA source and native review

Date: 2026-10-17. Independent read-only source and native review. **HOLD: 1476-P2 remains OPEN.** The SMAA trial preserves detail better than the rejected FXAA trial, but does not recover the retained crossing quality. Report1478 and its evidence remain unchanged.

## Target and finding

Unlanded `codex/train1473`, base `8bb2200118606f7d457d0c5218e008d69feedafc`. Reviewed all 13 frozen candidate paths, with focused code review of `src/render/post.ts`, `test/post-motion-sampling.test.ts`, and the pass-list changes in `tools/visual/{hero,smoke}.spec.ts`. Freeze `candidate3-freeze.json` SHA-256 `0d0ec9f5a064c2e016053ad2718b7e7bab2508998d11ef057b59946a61ff7132`; post `4a5b8d0134caf141c55fa076ce3e5df9ad0fb19b6fb3cfd7bbadadbd84214222`; test `2bef52dbb762fd770d9ada831d85cb92bc5a422cefd07b20e8bbfa6fb98a5973`. All working files matched at intake, with no owned unstaged difference. Independently verified the literal 13-file preserved set in `artifacts/train1473/candidate3-source/` against that freeze. Patch `candidate3.patch` is `e504e6f5c644cc001ec9f544ef8bc5a0178cd8f66221d14996d30a19c1fe0b96`. These preserved bytes remain the target if the working tree advances.

**1476-P2 remains OPEN — restore crossing-edge quality during ordinary train movement.** `post.ts:232–238,275` installs and enables SMAA, but its actual B dusk/noon crossing images retain conspicuous broken and interfering thin white stripes on the left and central crossings and on the receding western markings. The near left crossing around x258–463/y352–403 is a clear native-scale example. The filter improves some edge transitions, but the stripes still fail the cleaner separated appearance in the retained ff28 crossing. This is a material unresolved regression in the ordinary view even while the northern train is concealed.

SMAA does preserve small sign lettering, shop content, foreground paving and approach facade detail much better than the previously rejected FXAA images. Broad FXAA-like softness is not the reason for this HOLD. The remaining stripe defect itself prevents acceptance. The two B corridor stills show a coherent four-car train at different positions without an obvious duplicate trail; these sparse images cannot establish continuous ghost-free motion or wheel contact across a passage.

The comparison baseline is the native `artifacts/visual-gallery/images/current-lifetime-world.png`, SHA-256 `ff28bbc5ac0bf128bd1cb9f2783e1ff570ec7f95ffe0e636ce38c423aa696793`, already opened in this review session for1478. It is the visibly aligned named dusk crossing from adopted `59fbb1ce7fedaaa9e43d6747fb35994790d093b5`, run `5addbb3d1eb59de0`. Its inspected retained metadata lacks numerical camera telemetry, so no exact old-baseline pose equality is claimed. No extra images were opened in1481 beyond the ten released candidate3 originals.

## Source review

No additional material runtime defect was found in the four AA paths. Installed Three0.180.0 `SMAAPass.js:14–15` explicitly requires linear-sRGB input before OutputPass. The candidate places it after linear bloom and before ACES/sRGB. `SMAAPass.js:136–173` consumes the current composer color, draws edges and weights into two internal targets, then blends current color into the composer write buffer. `EffectComposer.js:228–254` executes enabled passes in order and swaps their buffers; OutputPass remains last. The installed blend shader's local gamma arithmetic is retained; no extra application-level tone mapping or encoding is added. OutputPass still reads the renderer exposure/tone mapping, preserving the existing lighting authority.

`post.ts:255–256` admits both lookups only after each image is complete, has positive natural width, and its texture version is positive. The addon assigns each embedded Image to its texture and marks `needsUpdate` in onload (`SMAAPass.js:51–82`). `Texture.js:742–747` increments version when upload is requested; `WebGLTextures.js:513–534` uploads on subsequent use. Therefore `smaaReady` means decoded and upload-requested, not independently measured GPU residency. The test explicitly distinguishes decoded-before-onload from ready. Normal browser image load events are asynchronous; there is no mid-constructor callback race in the actual installed path.

A late image onload after disposal only marks the texture version. It does not render or allocate GPU storage itself. The unchanged app stops the loop before disposing post and renderer (`src/app.ts:440–448`). `post.ts:320–322` disposes each pass then composer; `SMAAPass.js:198–210` releases both targets, both lookup textures, all three materials and its fullscreen geometry. Composer disposal only releases its own targets/copy pass (`EffectComposer.js:352–357`). No double ownership of SMAA targets/materials was found.

Composer passes physical dimensions on add/resize (`EffectComposer.js:149–152,315–328`); the addon sizes both targets and all three inverse-resolution uniforms at `SMAAPass.js:183–190`. `post.ts:274–279` retains two current-frame scene samples without temporal history while moving, then bypasses SMAA and keeps the existing32-sample still path. `src/app.ts:229–244`, `src/render/loop.ts:147–163` and unchanged `src/scene/rail-trains.ts:124–157` were read outside the AA hunks for stillness and clock ordering. The sampled trains are well away from zero speed; every dwell/reversal transition remains outside this sparse native verdict.

The two new targets are no-depth RGBA16F (`SMAAPass.js:36–45`). Independently decoded the embedded PNG headers: area160x560 and search66x33. With the addon's disabled mipmaps, `post.ts:384` adds16 bytes per physical pixel plus367,112 lookup bytes:14.0625MiB at1280x720 or31.640625MiB at1920x1080 for targets, plus about0.35MiB lookups. This is format arithmetic, not measured allocation, GPU frame time or A10 performance. Source work grows by three fullscreen draws; scene sampling remains two. Minor nonblocking header typo: `post.ts:18` says “SMAA and SMAA.” No source correction was made during this frozen trial.

## Focused checks

The actual production constructor, composer, TAA/SSAA and SMAA paths run under the renderer spy in `test/post-motion-sampling.test.ts`. Image decoding and AO/bloom/output draws are stubbed. The test checks two image-load notifications, three ordered SMAA draws, two literal current-pose jitter samples, still-history bypass/restart, all three physical-resolution uniforms, both target sizes/types/depth settings and terminal disposal of all seven owned SMAA resources. It does not render WebGL pixels or prove sharpness, decoded lookup content, GPU upload success, ghosting or performance.

Initial `candidate3-focused.log` failed because it counted legitimate render-target resize disposal together with terminal disposal. The corrected source separately requires the two resize events, then resets the observed counters before requiring exactly one terminal event per resource (`test/post-motion-sampling.test.ts:98–102`). Installed `RenderTarget.js:284–301` confirms resize emits disposal. This distinguishes allocations rather than weakening terminal ownership. `candidate3-focused2.log`, SHA-256 `a68aa467f8110357a53a989d2a460c272dd3073bc17828f871932f46cf4786dc`, reports six files /16 tests PASS. Build PASS is visible in the retained build log; typecheck PASS is worker-reported, since an empty redirected log alone is not an exit-status receipt. Reviewer ran no tests or builds. The prior FXAA RED/GREEN controls establish no SMAA pixel acceptance.

## Native evidence and limits

Opened all ten candidate3 originals individually at native1280x720 after root release, in batches no larger than three. Independently verified every PNG's actual SHA-256, byte length and dimensions against frames.json.

Capture ran2026-10-17 23:34:37.085–23:36:49.869UTC,132.784s, seed9137, headless RTX4090 ANGLE/D3D11. `capture.json`: `81cd2889538165149a7457062f9bf89bb8f0b69836e19ec5190bd842063d8af5`. `frames.json`: `93fce7f141467e8618e798c1b26404e29460c2a1bcba635af16d9deedd349745`. `candidate3-arm-bindings.json`: `7e86aec2f15106576311f20ac61551084d7854334f5966cb33565f400dcec076`.

Independently rehashed all listed assets and actual sourcemap contents: six A runtime bindings and seven B bindings, including old post `ae2435d754c5bb934e46c68e0e53fbc8b76c9674acb26763195dda1b4825eb59` and the new post above. The capture's before/after lists agree for source139, A-dist6, B-dist6, scene121, rail34 and harness21 files. This is retained build/input binding, not an independent served-HTTP attestation.

All image before/after cameras are identical. Four A/B hero pairs differ by at most8.81e-13m per coordinate and2.56e-15rad. All20 bracket observations are ready/active/Satellite with no error or context loss, zero TAA accumulation and sample level1. All B brackets report SMAA ready+enabled true and train speed10.573–12m/s. Actual movement, not dwell or temporal accumulation, is the photographed condition. Observations bracket17–21 advanced frames around screenshots, not a same-frame readback. Corridor samples are117 before-observation frames /1.9499 simulated seconds apart; row timestamps differ1.905s. Uninspected intervals establish no appearance verdict.

| Original under candidate3-native | SHA-256 |
| --- | --- |
| A-dusk-crossing.png | e3d35e58328e378d6b0b7630710a621fb5872cc3084b6512062cbdd2e43bc9e4 |
| B-dusk-crossing.png | 2f568fc56df473127837b2ef12aa65fd9c0997bdf19328b747fecb4c3e97ad4e |
| A-noon-crossing.png | 78a53b19b946a6fbefa372518e394882cb637034f897a854e18d58dae408e2aa |
| B-noon-crossing.png | 14fc3a7a89f9dfbec7fc5c28b544c4b96e311c6d55d10ff8f45026024367d5f5 |
| A-dusk-approach.png | ebd01824aca28984d58ac1deb308290dfd45b64d09a12907755eef796819f85b |
| B-dusk-approach.png | 41362837d9539932b4f72cdecec563bc02995aa808237a5c3a1eb318bddfc8f7 |
| A-noon-approach.png | 06f756818d4addd1af2a02bb2d9670042e5c554d087d1555da78c8b1b395c353 |
| B-noon-approach.png | dfcd0f0b71d85fb96e7b215b38e0387e4c3d8019269fc5f8df837fc13bd190ec |
| B-corridor-0.png | 80b7a01fea28ec28262675f398e30d77191967f431c6468351b08a391c6783aa |
| B-corridor-1.png | f5295bf0583ba5b932b0ca3a8608f28b3ed008024b31f0e687e3afd1a98c6829 |

Read cleanup receipts: all capture close flags true; wrapper exit0; fresh final five-identity census passes with no recorded/omitted remainder or late child edge. Subsequent confirmation has zero remaining owned identities/listeners and removed owned TEMP. Reviewer launched no browser, GUI, server or persistent process. The only reviewer write is this ignored authored report. Report1478 still hashes `f3b25c91aa7f81f69ad0dd540496bdaf76985fcbd7466d7e020ea4ecb70434e4`.

## Disposition

HOLD candidate3 and retain1476-P2. Stop the filter sequence for root's already-directed reassessment; this review requests no tuning, further filter, render or full gate. No PRIMARY integrated acceptance, final five-gate run, merge or push is claimed. All35 implementation identities and14 final criteria retain their existing open/partial bounds. Continuous motion and full-population performance remain unmeasured.
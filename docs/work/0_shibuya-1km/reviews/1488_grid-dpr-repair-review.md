# 1488 focused grid DPR repair review — 2026-10-18 UTC

Reviewer: /root/train1486_grid_review. Root is integration owner. This is a separate focused review; 1486 remains verbatim, preserving its original frozen source defect and native verdict. No tests, build, browser, GPU, server or reviewer CLI launched; only this designated ignored report is written.

Scope: functional 1486-F1 repair between recoverable candidate4-source and candidate4-f1-source/worktree. Freeze candidate4-f1-freeze.json SHA-256 d9c8061d3f73be8e70361ebbaf0b9f62bea7fd8701e563b6e17db86d3a6f53e8; post.ts c1b41841211491d19fe374f07aacad60274af90a0a2374f933ed91f22463c55e; test/post-motion-sampling.test.ts 370e36f2c70453e60dafb363bb3e9603ed810325772274eac2aaf4e07ae5c58a. Direct reads match all three hashes. Original grid, actor/train, jitter count and source geometry are outside this repair's scope. The prior 12 images were not reread.

## Source verdict

1486-F1 CLOSED within source and retained focused-test evidence. No new material finding. Overall adoption remains HOLD pending corrected native evidence, matched 1080p complete-frame cost, and required fresh PRIMARY gates/integrated review.

post.ts:219–221 floors each CSS dimension times the renderer DPR once, matching installed Three WebGLRenderer.js:632–633. At :229–230 it sets composer pixelRatio to 1 and supplies those integer physical dimensions. Installed EffectComposer.js:320–328 multiplies by that stored ratio and supplies the same dimensions to both composer targets and all passes, so fractional DPR cannot be applied twice. The initial sample target and GTAO constructor use the same native sizes (:234/:243), and the bloom constructor now takes the physical vector (:260).

On resize, post.ts:308–310 floors and validates before changing post state; :311–318 propagates one physical dimension pair through composer, bloom metadata and temporal hold. Removing the former CSS-only gtao.setSize call leaves GTAO at the physical dimensions supplied by the actual composer, closing the adjacent inherited AO mismatch noted in 1486. Installed GTAOPass.js:252–261 resizes all three targets and updates resolution uniforms; UnrealBloomPass.js:249–262 rounds each mip and updates blur inverse sizes. The estimator at post.ts:348 now uses the same integer native dimensions. Its stated format/overhead bounds remain; fractional mip-area rounding is still only approximate and is not presented as measured GPU allocation.

The subclass's moving scale 2, inherited two jitter draws, native still descriptor and accumulation reset behavior are byte-unchanged. This is a sizing repair, with no appearance parameters or held-out-specific condition added. The first construction's composer setPixelRatio internally resizes its targets before final physical sizing, but no scene draw or GPU allocation is entered by that sequence; it does not change the render contract.

The expanded actual-composer/TAA/SSAA test covers DPR 1, 2, 1.25 and 1.5 at odd CSS 1281x721, then odd resize 321x181. It checks physical projections, copy destinations, native AO targets/uniforms, bloom mip dimensions, hold resizing, still convergence/history reset and disposal. Its expected floor matches the independently read installed renderer rule. Renderer/GPU draws and downstream render bodies remain stubbed, so this is configuration/control-flow evidence. I read retained focused log 20 tests / 6 files PASS and old-sizing mutant log 4 failures / 1 pass, but did not rerun either. Types/build PASS remain worker evidence.

Compiled-source binding: I independently matched every B asset in candidate4-f1-arm-bindings.json, then extracted and hashed seven index sourcemap sources. App, harness and four train sources match their existing pins; post.ts matches c1b41841211491d19fe374f07aacad60274af90a0a2374f933ed91f22463c55e. This verifies that the retained B build contains the repaired source under review, without claiming it is adopted.

## Native checkpoint

PENDING. A new blind held-out recipe was precommitted by root before the functional repair and released only after the repaired-source freeze. Root will provide up to five corrected originals and a capture record covering all 156 runtime-cache files. This report will append the actual inspected results separately; the previous 1486 family-quality verdict is historical evidence, not a substitute for repaired-byte verification.
## Completed focused native review — 2026-10-18 UTC

Focused repair verdict: PASS. 1486-F1 is now CLOSED on the reviewed repaired bytes by source reasoning, the retained focused tests and actual fractional-DPR browser captures. No new material finding. Overall candidate adoption remains HOLD for matched 1080p cost and required full gates/integrated review; this small check is not the full milestone or full-population acceptance.

I inspected all five originals under candidate4-f1-resize-native at native detail, two then three images per tool call. DPR 1.25 and 1.5 each render the ordinary dusk crossing at odd CSS 1281x721 and after a real viewport resize to 1283x723. The scene retains continuous crossing bands, legible authored sign lettering, storefront openings, paving joints and tree silhouettes. The DPR 1.25 resized original is slightly softer than its pre-resize original, but no stripe/text feature disappears and I found no material regression. The native screenshot size is not asserted to equal the floored canvas size; browser compositing can include a fractional device-pixel CSS extent.

The new blind held-out original at 1280x720 has a large nearby blue facade occluding much of the center/right view. Visible distant crossing bands and the right-edge crossing remain clean, with recognizable surrounding roofs and facades. This is a limited positive observation of those visible regions, not evidence about the obscured city or full crossing coverage. No camera rescue or AA tuning was requested or performed. This held-out limitation is preserved rather than silently turning the screenshot into broad coverage.

The actual capture record reports PASS, no errors or context loss, active post and nonaccumulating sampleLevel 1 before/after every image, on RTX 4090 via ANGLE/D3D11. The expected physical dimensions are independently reconciled below. GL observations include complete RGBA16F/D24 four-sample framebuffers at both native and 2x dimensions, including the new dimensions after each resize; all five format-observer error arrays are empty. Camera position/target are identical before and after the real resize within each DPR context. Train time progresses throughout the capture brackets; these stills do not establish continuous motion quality.

| Context | Native canvas | Moving sample target |
| --- | --- | --- |
| DPR 1.25, CSS 1281x721 | 1601x901 | 3202x1802 |
| DPR 1.25, CSS 1283x723 | 1603x903 | 3206x1806 |
| DPR 1.5, CSS 1281x721 | 1921x1081 | 3842x2162 |
| DPR 1.5, CSS 1283x723 | 1924x1084 | 3848x2168 |
| Blind DPR 1, CSS 1280x720 | 1280x720 | 2560x1440 |

Evidence binding: independently read/hash-checked capture.json d0687a970f8deb131b5c0d3e32cafae0547e2ca95e35f5ff0e423c251a31c17b and frames.json e4603438685384e4234889778da5723f20c349d976be0d8ca8daa116150243b6. Every original matches its literal frame hash below. The ignored capture adaptation is frozen separately by candidate4-f1-capture-freeze.json and uses the repaired source-freeze digest d9c8061d3f73be8e70361ebbaf0b9f62bea7fd8701e563b6e17db86d3a6f53e8. It does not modify the application after the new recipe release.

I independently combined this capture's scene, rail and network rows, verified exact equality with cache-copy.json's original rows, and compared complete before/after snapshots. They are equal: 156 files / 364,187,965 bytes. This corrects the omitted-network evidence gap for this new run only; the original 1486 bound remains unchanged. The retained cleanup confirmation reports a fresh successful owned-process census with no survivors and removal of the external temporary directory. I launched no browser/server process.

| Inspected native original | SHA-256 |
| --- | --- |
| dpr1.25-before.png | 88871ef5842e7816575f838c1b318c1120ba2a94229da1b4f3b6a84ec8f83cf1 |
| dpr1.25-resized.png | 5bf84c6bfc9ea5da4c1927ed4a2da7160b98bbb939c2415e86917654a83e5686 |
| dpr1.5-before.png | 3bfd7ce5028e5260a5b074bd299440db993288ee11fcd9a83fd3094e94b49aa4 |
| dpr1.5-resized.png | 46d0d2a9503080f2e00d2218ffaf5ee0f784b5e8b651dad93b43e4bc44a61095 |
| heldout-repair.png | d0f3f1f680afd99a14caee0b1b1061d19ce7b146a2550e58d32f458d96c1a800 |

Preservation check: 1486 report remains SHA-256 409c320f4a30166fc79b78a96277ab5597f442e3e7ee01bab3f1ba8db86c494f. Its historical finding and verdict were not edited by this round.
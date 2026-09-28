# Motion antialias source review 271

Accept this narrow source change for the separately admitted native comparison. No actionable source finding. This is not appearance, ghosting, frame-budget or default-pedestrian acceptance; the rejected266 startup/controller work remains untouched.

Reviewed worktree `C:/Users/38909/.codex/worktrees/motion-smoothing/maps`, base `8659433152ba9592b551cbd5d1121c763180a944`, against freeze `artifacts/motion-aa269-20260928/source-freeze.json`, SHA-256 `f60347dd19f990e4a963b10993d7d2115f3328f242a53169c01dc9111a302886`. All seven frozen files match both hash and length. The two immutable source copies also match. Git status contains only modified `src/render/post.ts` and new `test/post-motion-sampling.test.ts`; base-to-primary74f8575 changes do not touch src/test/tools/config/package inputs.

The functional patch is one assignment before rendering (`post.ts:249`): moving uses sampleLevel1, still uses0. A readonly optional status field reports the actual level. It leaves the app's scene-still predicate, target allocation, normal-pass wiring, history reset, disposal and direct fallback unchanged. Fallback status omits the optional field and never accesses a TAA instance.

Inspected installed Three0.180.0 source, not a reimplementation. TAARenderPass with accumulation disabled calls SSAARenderPass then resets accumulateIndex to−1. SSAA level1 renders the current scene twice at (+0.25,+0.25) and (−0.25,−0.25) pixel offsets, clears the output before the first composite, and restores camera offset/clear state. It cannot carry earlier moving-frame colour through that path. Still mode returns to level0: the first frame refreshes the hold image and takes one temporal sample, subsequent frames add one to32, and a settled image reuses its history. Moving resets history; apply, resize and invalidate retain their existing reset behavior. Sample count changes neither simulation ticks nor actor pose inputs. GPU workload increases by a scene sample while moving; its actual cost and visible benefit remain for the native comparison.

Evidence inspected: the old-source regression is genuinely red (exit1, actual one centred scene draw versus two expected jittered draws); the two normal-pass tests pass in that same red run. Final exact-source results are3/3 passed, no pending/skipped tests. The new test calls actual Three TAA/SSAA with a renderer spy, substitutes only composer orchestration around unrelated AO/bloom/output work, and checks two fresh moving poses, full32-sample still history, still→moving→still reset, camera-offset restoration, and TAA/composer disposal once. It proves draw/control behavior, not pixel blending or native ghosting. Direct fallback was checked by source inspection, not an added runtime test. Recorded types/build exits are0; the build log has136 modules and the known large-chunk/experimental-transform warnings. I did not rerun tests, types, builds, GPU, browser or full gates.

The private main build map contains byte-exact reviewed post.ts. Bundle `main-dist/assets/index-DvQRewIw.js` SHA-256 `850d86458acee03f8519e4231fe3c7918ecf1b97983be221f7ea36259f674f0d`; map SHA-256 `524b8c1e44fff378f241eb2f05d0b667fef0b8c2fa46a3022e0c8a4748ad04c4`. The actor-paired builds are separate and must bind this reviewed source before capture.

| Reviewed input | SHA-256 |
| --- | --- |
| src/render/post.ts | 926073d14f47cf78e37ca814bf96a56e2e9e606f292b1ef251b2c9421afceb35 |
| test/post-motion-sampling.test.ts | 61e489dc3b957c480e9bd11f63dedce55c2dc1361d3609123e21c1137e988dee |
| installed TAARenderPass.js | 9382601b054937b1e55459302a2f6031e576eb090de5aab7521b2e7bc39c8ba2 |
| installed SSAARenderPass.js | cd2b8e83b32e806091117dfbeff1f8f4e78df0175a4a3acd865b9989df1c420b |
| red-result.json | 8b333859a32a97f6d5dcbec5c3f252103d67b48414b678d252c799691277b5f2 |
| red-tests.json | 8548e9c6048bffbe2d60a0c405fe6ea2260968b2f418c666ae130a81911566e7 |
| final-tests.json | 556df3ce775ad391ed011774350d23eb48a32220634ddd13155a44ef7e8f4904 |
| checks-first.json | e9088de6c2c7b444ba897a8a25f4aaa4b175f92dc5c7a127a93b6e9376116cde |
| build-main.log | be5182adb9c63a9544ce39bca539f2fb7463a49dcb6a38534f6b3ab22c106d47 |

Only this review report was written. No product files, frozen artifacts or canonical docs changed. All read commands completed; no persistent process, browser, server, cache or temporary resource was created by271.

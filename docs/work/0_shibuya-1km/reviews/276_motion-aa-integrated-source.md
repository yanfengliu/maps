# Integrated motion AA source review 276

ACCEPT the integrated source delta. No actionable source finding. Reviewed the primary working tree at HEAD `74f8575dd6ec5de952a2b27208d33485a32feea3`; the product changes are currently uncommitted. The only tracked product diff is `src/render/post.ts` (8 added, 3 removed lines); the only new src/test/tools file is `test/post-motion-sampling.test.ts`. Other current changes are the coordinator's documentation. No startup, actor/controller, scene-data, dependency or visual-harness change is present.

The actual diff and full new test were read. Both files are byte-identical to accepted269 and review271: render assigns level1 while moving and level0 while still before composition; an optional readonly status field reports that actual level. Existing scene-still decision, history invalidation, style/resize behavior, disposal and direct fallback remain unchanged. The regression uses the actual Three TAA/SSAA pass with a renderer spy to check fresh moving samples, 32-sample still reuse, reset transitions, camera restoration and disposal. The installed TAA/SSAA files also retain their reviewed hashes. No second library investigation or gate run was performed.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| src/render/post.ts | 14878 | 926073d14f47cf78e37ca814bf96a56e2e9e606f292b1ef251b2c9421afceb35 |
| test/post-motion-sampling.test.ts | 4114 | 61e489dc3b957c480e9bd11f63dedce55c2dc1361d3609123e21c1137e988dee |
| installed TAARenderPass.js | 6467 | 9382601b054937b1e55459302a2f6031e576eb090de5aab7521b2e7bc39c8ba2 |
| installed SSAARenderPass.js | 8150 | cd2b8e83b32e806091117dfbeff1f8f4e78df0175a4a3acd865b9989df1c420b |

Review271 remains the source and old-red/new-green evidence: `artifacts/motion-aa271-review-20260928/REVIEW.md`, SHA-256 `a63f6b1fd243369f97a05b045c231fb3cb63c662e2047750599df93b39c1dd59`. Native273 accepted a modest crossing/facade edge improvement in the separate fixed264 actor A/B pair, with sparse-frame and timing limits: `artifacts/motion-aa273-visual-20260928/REVIEW.md`, SHA-256 `dbeb5ed8bd354f42ab2b516facd6580a19da10b37ac9820b3ae8c4e9b04edf5e`. That actor is not present in this integrated main delta, and neither review approves default266 activation.

Final integrated acceptance remains pending gate owner261's all-five274 results and individual inspection of the completed 44+2 native PNGs. No mutable frames were inspected. This source result is not a claim that those gates passed, that continuous motion is verified, or that the full Shibuya deliverable is complete.

Read-command limitation retained: the initial Git call failed the sandbox ownership check, then an ensuing diff fell back to a meaningless two-file no-index comparison. That output was discarded. The corrected command-scoped safe.directory calls succeeded and supplied the actual repository diff; Git warned that the shared user ignore file was unreadable. Explicit tracked diff and src/test/tools untracked listing established the scope above. No Git configuration changed. Only the two assigned review artifacts were written; no source, tests, build, browser, GPU, server or persistent resource was created or modified.

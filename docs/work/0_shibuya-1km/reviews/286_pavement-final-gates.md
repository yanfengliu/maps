# Pavement286 — integrated primary gates

All five primary gates passed on Node24.12.0, 2026-09-28 10:34:39–10:40:28 UTC. This is execution and retained-evidence acceptance only; independent inspection of all46 original images and final integrated review remain pending. No commit, push or canonical documentation edit was made by286.

Clean primary HEAD was `a72add5d58f85727194de1380456f6a60476d65c`. Only the two accepted253 files were copied after checking their exact predecessors. Final hashes still match: `src/scene/surface-materials.ts` `f905020c983366b27a763fd3403d5ed50eab06904d15c0994133cbcfeaf886c6`; `test/surface-material-shader.test.ts` `970eaf5b6ffa193f0c8ce5ba8ddab7a0eda83d85bda780df5fbe866c53cb01ea`. The diff is109 additions/10 deletions across those two files; whitespace passed. No old rail changes, assets, dependencies or other product source were copied. Root's concurrent documentation changes were preserved.

| Gate | Exit | Actual result |
| --- | --- | --- |
| npm run build | 0 | Vite production build complete. |
| npm run typecheck | 0 | TypeScript no-emit check complete. |
| npm run test | 0 | 103 files,920 tests passed;50.64s. |
| npm run audit | 0 | High-severity threshold passed; two existing moderate findings in Vitest/@vitest/mocker remain, GHSA-82fw-gwwq-j7x9. No dependency repair attempted. |
| npm run visual | 0 | Four appearance tests passed in2.1min; all three hardware lifecycle repetitions passed in2.6min. |

No gate failed or was skipped. Native stderr stayed separate from exit-status handling. Retained warnings are the existing large-chunk warning, npm update notice and Node colour-environment notices; they are not counted as errors. The actual child probe confirmed `MAPS_VISUAL_GPU` and `MAPS_VISUAL_LANE` were absent after process-only `Remove-Item Env`, rather than present-empty.

Certified run `fabda33c6be9895d` used ANGLE/NVIDIA RTX4090/D3D11, driver616.64. All44 certified1280x720 PNGs and two separately bound style-return PNGs are retained under `native/`; the latter two remain outside the44-frame certificate. Each lifecycle recorded completed teardown and zero console/page errors. Navigation times were122/123/126ms and replacement times19134/19035/19314ms.

The emitted runtime bundle SHA is `2bc9f4700153aa67796fd7ae6995b962a07575a2307191d848f3c337b6161f24`, matching the accepted private pavement candidate. Scene identity remains151 files/354,733,717bytes, digest `51ba80aac99fee427229571aa33ffc5d05dceee613330712f3f5637ed344aaa0`; harness identity remains24 files/220,140bytes, digest `0e6fe08b850829403b5f076e171e10d52a1a313faa3a2e39a829ccb68ed46701`.

The existing274 retained-handle visual owner was reused unchanged. Fresh initial CIM/TCP/GPU census admitted the exclusive lease; final CIM/TCP found no retained survivor, unadmitted live child, scoped helper or4319 listener. Exact external TEMP and private cache were removed only after confirming no reparse links and unchanged protected scene/network/rail identities and counts. Process environment was restored. No shared application was killed. The GPU lease has been released to root;286 will not launch further GPU work.

`execution.json`, `nonvisual-gates.json`, `certificate.json`, `native-frame-manifest.json`, `style-runtime-evidence.json`, `owned-run-receipt.json` and `temporary-cleanup.json` contain the actual receipts. `final-evidence-index.json` pins them, the source, wrappers and all46 retained native image hashes. Prior274/277 evidence remains untouched. The inherited diagonal line and final appearance remain the independent reviewer's judgment; metadata success is not a visual verdict.
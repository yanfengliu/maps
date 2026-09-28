# Focused native style260 re-review

**APPROVE the repaired source and finite native capture plan. Review259's P2 style-mount finding is closed.** No material finding remains within this focused amendment. This admits preparation of the finite native trial; it does not replace review of capture261's executor, root's fresh hardware/process admission, or subsequent inspection of actual native pixels and motion. Native appearance, default activation, integration and population performance remain unaccepted.

Reviewed freeze: `C:/Users/38909/.codex/worktrees/pedestrian-render/maps/artifacts/native-style260-20260928/freeze.json`, SHA-256 `7242a630d03efe6ee8e88244475a168e6872a7b52835c340fdc019917c3a533d`. Worktree remains based at `3c5cf283f266576ae1b5324401756a283c1a9c58`. The original review259 report is preserved unchanged at SHA-256 `5f780e84c2dad5ecfb64d4d40ad18bda2b99b11a19f494f13544f96c83b690e3`.

## What closes the finding

`src/app.ts:319` now calls `localWalker.setStyle(style)` after the factory await and `if (disposed) return`, before adding the returned root and registering future style changes. This is the sole product-source delta from successor257. It reads the app's latest style at the right ownership boundary. There is no await between synchronization and mounting, and no actor/root/generation/clock replacement. A walker returned after app disposal remains owned and disposed by the existing loadOwned path; it is neither styled nor mounted.

I read the complete new `test/app-local-walk-lifecycle.test.ts`. It imports the real `createApp` and drives its real style setter, asynchronous ready promise, real Group parentage and disposal path. Rendering/data factories and browser scheduling are stubs, so the test does not claim actual materials, pixels or gait. The actor factory is held pending after receiving the initial style. Both Satellite-to-Cartographic and Cartographic-to-Satellite cases change the actual app style before resolving that promise, then assert the latest style was applied while the root still had no parent, the same root mounted once, and subsequent style changes reached that same actor. The disposal case resolves after app disposal and verifies exactly one disposal, no style application and no mount. The fixture's frozen identity supports the app-ownership assertion only; it does not prove the real gait clock.

The actual retained old-red receipt and JSON result agree: both style cases failed because the latest-style call was absent, while disposal passed, with process exit 1. The current focused receipt and JSON result agree on 27/27 passing across exactly four files: lifecycle 3, bridge 6, gait 10 and shader/opt-in 8. Typecheck and private build each exit 0. This is an observed old-source red/new-source green regression and actual failed-test exit propagation, rather than a test inferred to detect the defect. I inspected those receipts and launcher code; I did not rerun them.

## Independent identity and build checks

One bounded read-only metadata check hashed all 20 source records and 28 owned artifact records; all 48 match the freeze. Descriptor comparison to successor257 finds only modified app.ts and the new lifecycle test, with the other 18 source descriptors unchanged. Comparing the complete saved app.before.ts and current app.ts confirms the single added style call is the entire app delta. The current main bundle's source map contains byte-identical app.ts source, and inspection of the emitted JavaScript confirms the compiled order: await factory/loadOwned, disposal return, latest-style call, root mount, consumer registration.

Principal bindings:

| Artifact | SHA-256 |
| --- | --- |
| src/app.ts | 8689b57e00336276cd8a285ed3c02bbbb69f7dffbe2452dd93dea4c0a3cd73b5 |
| test/app-local-walk-lifecycle.test.ts | 4256cb918b7b4091b5f4890a274714add2aff0e8876b857ea8010ef90c66f2bd |
| old-red-tests.json | 45a836b187fdf9a01a059242fc78748175c00f77718ae76a289283826030e657 |
| focused-tests.json | ed5e5a634ffa683ac3955614afeb1d591e71467b93a04f2878473edc1ab5b374 |
| build.json | 58a39d4ec92ba9c9c8961fedf5240c95c446262509379e58d84207d00c59b31b |
| dist/assets/index-MjqTXPc9.js | dd68d6608902484373cd2f15504104e1abfe0b5d85254ff90d272a2153f735bc |
| dist/assets/local-walk-prototype-C3cSPXUw.js | 88c6702df0b8e032444d8c3ed451ff170f1b1e812c8a581c7fee6eb77b80c916 |
| CAPTURE-PLAN.md | 2bfcd4bb33a1bc1712330bee99a51f4d4ab51431ea24f864555e46d8fbdda863 |
| REPORT.md | 5a397c9775d077100827592f20b42c1fb869aedc8459067df2c20f6d0bf7047c |

The private configuration inherits the retained253 packet configuration and changes only owned cache/output paths. The actual new build reports 147 modules and retains the disclosed large-chunk and experimental transform-types warnings. Resolved Vitest cache is disabled, and test/build output and temporary paths remain under style260's owned artifact directory. None of these results compiles native draw shaders on the GPU. No repeated controller/rig/numerical audit is justified by this one app-mount call.

## Finite capture-plan disposition

The amended plan includes the previously missing real loading-window witness: begin in Satellite, hold the actual rig-far request after factory capture, change to Cartographic through the real picker, release the unchanged response and inspect the resulting near Cartographic native PNG. It explicitly reports did-not-run if that request never reaches the pending state. The reverse load direction remains a Node production-path test claim, not invented native UI evidence.

The plan holds actor tick/time/sample time at zero through actual OrbitDriver camera acquisition, records a real initial canvas PNG with near LOD, full camera, actor identity and shader/console state before real Start input, and treats drawSerial/drawnActors as computation counters rather than visible-pixel evidence. It retains one two-cycle requested-30-fps motion clip and no more than eighteen native still witnesses, using actual observed frame/sample/wall times, gaps and hashes. It includes ordinary style transitions during that single motion run, supplementary near/medium/far observations, and independent image/motion inspection.

The color-evidence correction is explicit and required: native canvas PNGs captured with same-browser-task observations are used for color, shading, silhouette and contact; decoded-video frames are separately labeled motion evidence because the earlier recorded-path color artifacts remain unresolved. Requested 30 fps, selected LOD and an offscreen computation counter each remain weaker than actual observed delivery or inspected appearance.

Root's subsequent first-at-or-after-target sampling clarification is accepted for executor261: capture the first achieved rendered sample at or after each requested simulation time, retain actual time, lateness, phase, gaps and any shared frame identity, and do not copy every frame merely to recover a mathematically nearest timestamp. Two targets may share one actual frame and must not be represented as distinct. The finite count and single-cycle-pair bound stay unchanged. This is a sampling clarification for the upcoming executor review, not a rewrite of the frozen260 plan or a guarantee of exact event-time coverage.

Finally cleanup must remove the held request route and recorder tracks, close owned page/context/browser/server and verify exact process identities. Root still owns exclusive hardware admission; the executor remains separately reviewable. Actual shader linking, natural motion, color/material/contact appearance, loading-window UI result and cleanup outcomes remain future observations.

No source, Git state, build, test, full CPU probe, GPU, browser, server or long-lived resource was changed or launched by this re-review. Only this assigned report was written. All short read-only commands completed. The original259 report, all red evidence and both predecessor freezes remain intact.

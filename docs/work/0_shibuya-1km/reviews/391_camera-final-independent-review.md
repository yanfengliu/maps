# 391 — Camera, app and appearance review

2026-09-30. Independent read-only review of the integrated primary working tree based on `bf43b75639848b0fdf596c7ce5c7eb48358f2431`. Verdict: no material camera/input integration finding and no new appearance regression in the inspected evidence. This is scoped review evidence, not whole-map quality closure or a claim that the working tree is already committed.

## Exact source binding

I read the final primary bytes for the six-file viewer checkpoint. My source vote covers the camera and app files; the two Vite startup files are outside my review and have separate independent review by 388.

| Path | Bytes | SHA-256 | Review scope |
| --- | ---: | --- | --- |
| `src/app.ts` | 21,739 | `df25d8c87f3ccb9bb2866902ef8aaf2b5f48400672d0f5e1f84d52d985f6cef3` | Reviewed |
| `src/render/camera.ts` | 3,999 | `6ae2a0a89520043c0c740dad89b7c58c71dc028e93d613f9321b8a2ace97169b` | Reviewed |
| `src/render/camera-keyboard.ts` | 4,136 | `cf5bccc2f483f5135b68164c88096f9c68dc0be1d78cbb30617dcbe82845aecd` | Reviewed |
| `test/camera-input.test.ts` | 12,741 | `9de24e9738baf3882c1fce04efb49b8ce6c7f64506dfc914399499fed0086a16` | Reviewed |
| `vite.config.ts` | 2,070 | `900afe81bc4580d4e20a9fafbcebe8d4747368fabe35e007ad3949417f4e7165` | Independently reviewed by 388 |
| `test/dev-startup.test.ts` | 10,183 | `9b0ac54dc7ab196c50a895937ceca6828db7a433a9a10741985732bbd90d27c6` | Independently reviewed by 388 |

`app.ts` now passes the render loop's capped frame delta to `controls.update(delta)`, allowing the held-key pan to be time-based. The camera rig keeps OrbitControls as the only pose owner, preserves left rotation/right pan/wheel zoom, and maps middle drag to the existing rotation handler. WASD queues normalized ground-relative pan through the checked three.js 0.180 `_pan` seam; the 250 ms frame cap matches the render loop stall bound. Modifiers, non-body UI/editor focus, blur, hidden state and disabled controls clear or suppress held keys. Disposal removes its listeners and restores the prior canvas tabindex and update method.

I found no material source defect. One bounded future-surface limitation remains: if the whole `body` becomes contentEditable, it is still treated as ordinary body focus. The current app does not enable `contentEditable` or `designMode`; CPU coverage does include non-body contenteditable and standard input/select/button focus.

## Input and gate evidence

The focused CPU run recorded 51 passing cases across camera input, camera rest and settling; the original-source mutation produced 18 failures and 8 passes. The integrated build and typecheck passed. The final cache-disabled unit rerun passed 114 files and 1,020 tests in 58.63 seconds. The first unit invocation had one `visual-checkout.test.ts` assertion fail because the observed refusal wording differed from its expected message; the recorded rerun passed all cases. The appearance lane passed four tests and produced a 44-frame certificate with three hardware lifecycle records on RTX 4090/D3D11 driver 616.64. `npm run audit` exited 0 at the configured high threshold and reported two moderate-severity vulnerabilities associated with the `@vitest/mocker` redirect-mock path-traversal/arbitrary-file-read advisory; no dependency change was made.

Fourteen native input/style assertions were recorded across two bounded headless runs: held W at street/block/aerial distances, straight/diagonal motion, UI focus suppressing W, canvas focus restoring it, modifier suppression, W clearing after actual UI focus, middle rotation, retained left rotation/right pan/wheel zoom, and camera pose preservation across a style roundtrip. Neither capture returned overall success. The first run recorded eight input checks, then stopped because the headless second-tab switch did not trigger the expected real blur; two asynchronous body reads were also evicted, but the final HTTP binding audit was not reached. The follow-up recorded six more input/style checks, marked native blur unavailable, then failed its final HTTP body audit because Chromium had evicted the `network.json` and `rail-trial/rails.mesh` response bodies. Blur is unavailable, not passed. CPU coverage synthetically dispatches blur and verifies held-key clearing; native window-blur behavior remains unverified. The source/build/data bindings and cleanup are recorded in the native receipts.

## Appearance evidence

I individually opened the 22 Satellite originals at their native 1280×720 resolution and rehashed them after inspection. Every file matched its entry in the final certificate. I also opened both seed-388 exploratory originals at native resolution and verified their retained digests. The views show the expected crossing, streets, buildings and broad AOI from crossing-level, block and overhead poses. I saw no new camera/input appearance regression. Existing facade-detail, ground/base-contact, occlusion and wide-crop shortcomings remain visible quality work; this review does not close them or establish whole-AOI quality.

The certificate is `artifacts/visual/complete.json`, SHA-256 `c8c24e831a7834f4667ec66304a1e024bccc8cc03dfe6cc58d090f2b1a62c3da`, run `322e0ae20988845e`, with all 44 frames and three lifecycle records. The 22 inspected Satellite originals are bound below.

| Original 1280×720 image | SHA-256 |
| --- | --- |
| `hero/hero-satellite-dusk-crossing.png` | `1f89f96bdb98188656c9653f0537468e6b1e7f3d1fcb82bbb5df0898dd6b43bd` |
| `hero/hero-satellite-dusk-approach.png` | `93dd7018653ffaf01d2ba1de9f13290764bec7268224ae98a68dbbec48d8dfd7` |
| `hero/hero-satellite-noon-crossing.png` | `a93832e5833d375489d1567dd44bf2d82166e5cc9841678e92bafff71f526282` |
| `hero/hero-satellite-noon-approach.png` | `1e97020c0c372b14a7d108d5f019ce7d4104193b7a007b63092674511890d7f8` |
| `sweep/satellite/plaza-az000.png` | `b0cb49673892ea46906f62b444bf250ca7a5c8a3fd5c6a1578a6f8429bd0962f` |
| `sweep/satellite/plaza-az060.png` | `7f9cfc92e6623fdc93b3505e35160a312f7ad7d99f2db318b50e1f554044ca6c` |
| `sweep/satellite/plaza-az120.png` | `86cb792ac7910d4396e0d5c1e193a4a35af67ba43a4f5f842c6f6c9145c31ad4` |
| `sweep/satellite/plaza-az180.png` | `2523ddac7dd78ecda97952e868971a72ef74188d22fc247e661a5be5e7bff44a` |
| `sweep/satellite/plaza-az240.png` | `d8d4b1a6ad0e2a806078aaf33eda91ed2c3817539e6ae303975efcddff46e572` |
| `sweep/satellite/plaza-az300.png` | `3d6b1cc23f93911ae1234261d9c39819554a6c4b49f19324c911dba2683d63f4` |
| `sweep/satellite/block-az000.png` | `74385a04a83123a1a75f27290567a118254e50c338b9237831835cd3d7d829aa` |
| `sweep/satellite/block-az060.png` | `212b123bd9a262dd98b976bc5291af6d75af8de43051ec50488173a634ec7cff` |
| `sweep/satellite/block-az120.png` | `efd01e56d112de112c516fa442a62eaa967a43c7347ada45d5177406ae15ecfe` |
| `sweep/satellite/block-az180.png` | `3d11bdfe64c312c3ca26f6bddc22d2e64c221de825aee967d04972efbf6c7d10` |
| `sweep/satellite/block-az240.png` | `635454187e6f881d6f7ac8ebb0bb2a4d342413d4346134fe6f2aee0609b379ed` |
| `sweep/satellite/block-az300.png` | `cac63d9746b1a09d10c7c9b41a56c21a7cfc95ff6ed3e28ca459a79b760a8f01` |
| `sweep/satellite/overhead-az000.png` | `890af8e253ace8a5645761dcb9ffc2637f865e8cc586241fdfbd2df11b568674` |
| `sweep/satellite/overhead-az060.png` | `2c4388fa2ad75134ef6db05d20347c401155013bbfd12fdb1a51f2514b429ac0` |
| `sweep/satellite/overhead-az120.png` | `ef813d89a976f17ee4884c0570ea0817841346d430f5c6721a8847b03da0520f` |
| `sweep/satellite/overhead-az180.png` | `f3089f79bdca6f2091b131c0ab27fd246c7ecdfb63d25848019dd2563c183019` |
| `sweep/satellite/overhead-az240.png` | `410af6d0c06991e14b6c6d374f6a5c87f2b1dd47229b1b04658e904bf099bee9` |
| `sweep/satellite/overhead-az300.png` | `cff9e51393855ca2ab25e391e9422a00e414fee3d48343d9b7c70ef8dafca2a9` |

The two exploratory originals were `artifacts/camera388/native/exploratory-0.png` (`3dc6afa07da4db03fc31dd06f7529899eb7fd0d8bbe0a66f90e2bf7a7b671356`) and `exploratory-1.png` (`bc76d24ec90e4dfbd79eca5cc18ec372f586be82103fe3af779e7db295335a10`). The complete 27-image inspection receipt is `artifacts/camera388/final/inspected-images.json`.

This scoped review supports the viewer milestone only. Whole-map facade, ground, occlusion, crop and performance goals remain open, and the original IAB startup cause remains unknown.
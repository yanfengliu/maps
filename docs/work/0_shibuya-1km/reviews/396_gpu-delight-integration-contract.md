# GPU de-light integration contract

2026-09-30. Read-only review by camera388 of the accepted runtime c201b1723d287ad73b52c7227f4e97256190069b. The final source check was on docs-only main f73504bcb4215dfbf82c75c1f4a6bc5fd62e0239; the runtime hashes below are unchanged. No product implementation, browser, server or gate ran for this review. This is a reused independent reviewer, not a fresh critic. [395](395_gpu-delight-prototype.md) is one-atlas diagnostic evidence; its speed and numerical result do not establish whole-city acceptance.

## Smallest seam

Create a buildings-owned byte processor in one new render module, provisionally `src/render/atlas-delight.ts`, and inject it into `FacadeTexturePlugin`. `createBuildings` already borrows the app's live `WebGLRenderer` (app.ts:210; buildings.ts:225). No app, post chain, style, dependency, scene-data or harness interface change is needed for this seam.

The proposed interface is `createAtlasDelight(renderer) -> { apply(data: Uint8ClampedArray, width: number, height: number, settings: DelightSettings): void; dispose(): void }`. `apply` changes RGB in the supplied masked byte array and retains alpha exactly. It replaces only the `delightInPlace` call at facade-textures.ts:295. Keep the unchanged CPU function as the test oracle; do not run both arms in the default product.

Keep the existing high-quality resize/readback, raw-input statistics, sign-mask calculation, output statistics and DataTexture construction. In the actual caller, `before.add` is at285, distribution accumulation at287, `writeSignMask` at288, de-light at295, and `after.add` at296. Thus the mask comes from original RGB before de-light. Source bytes remain immutable, and the existing emission/UV eligibility checks run before replacement (facade-textures.ts:202). `delight: null` must still bypass processing; `signMask: null` must still write zero alpha while retaining RGB.

The DataTexture at298–312 is part of the contract: RGBA/UnsignedByte, sRGB, source wrap and magnification, mipmapped minification, generated mipmaps, anisotropy floor8, `flipY=false`, `premultiplyAlpha=false`, name and atlas metadata. Keep source UV channels and transforms unchanged. Its CPU-readable `image.data` is read by `facadeSamples` (buildings.ts:405); returning only a GPU render-target texture would break that observer. Map alpha is a sign mask, not facade opacity (tile-materials.ts:302,317), so RGB beneath zero alpha must survive.

Minimal affected product paths are buildings.ts, facade-textures.ts and one new GPU module. Tests that directly construct the plugin may need injection coverage. The geographic cap policy remains unchanged (texture-budget.ts:60–87), independent of camera and style. Style switching changes shared material uniforms and section finishes (app.ts:421; tile-materials.ts:44; buildings.ts:473); it must reuse atlases rather than rebuild or queue another pass.

## Ownership, readiness and errors

Use a short synchronous GPU job for this first integration. Hooks overlap around the existing asynchronous bitmap resize, but JavaScript cannot interleave their synchronous GPU sections. Snapshot and restore every renderer/GL state actually changed in `finally`, before returning or yielding, including render target/cube face/mip level, viewport/scissor, clear state, color/tone settings, relevant clipping/XR/shadow state and native DITHER. Do not resize or dispose the borrowed renderer, pause the product loop, or replace post-chain state. Restore any temporary shader-error callback. `renderer.resetState()` alone does not restore the prior post state.

Dispose per-job input textures/targets in `finally`; dispose persistent shader/LUT/quad resources from buildings disposal before the app disposes its renderer (buildings.ts:474; app.ts:439–440). The existing `readPixels` awaits bitmap resizing (facade-textures.ts:335). An owner-closed check must prevent a late continuation from issuing GL work after disposal. Cancellation must also release any newly created replacement that has not been adopted by a material; the default non-trial path has no `FacadeTextureLifetime`, whereas the rail transaction does. The implementer must prove both paths, not assume the trial's resource tracking covers the default path.

Three0.180.0's synchronous `readRenderTargetPixels` can log an invalid-format/type error and return without filling the output (WebGLRenderer.js:2849); shader checks can likewise report without throwing (WebGLProgram.js:921). A zero-filled allocated buffer is not execution evidence. Check shader/GL/context failures and reject with the tile, dimensions and failed stage. The existing canvas context-loss and load-error paths remain responsible for user-visible failure. Do not silently adopt the existing readback catch-and-retain-original fallback for a new GPU failure (facade-textures.ts:275–283).

The installed tiles renderer awaits all model hooks before collecting textures and committing parsed resources (TilesRenderer.js:793–869). Its parsing counter includes this preparation; non-abort rejection reaches `load-error` (TilesRendererBase.js:1700–1829). Preserve that promise boundary and the subsequent cutout readiness condition (buildings.ts:435–443): all44 final leaves must be prepared before display. Do not resolve early, count queued work as prepared, or change the visibility gate (app.ts:227). Public asynchronous GPU readback exists (WebGLRenderer.js:2931), but its fence/PBO lifetime and cancellation need additional proof; it is outside this smallest synchronous proposal.

## Necessary verification and decisions

Root has accepted the next candidate numerical policy: exact alpha and maximum RGB difference of1 byte against the unchanged CPU oracle on matched inputs/settings. Appearance, lifecycle and whole-city startup remain separate requirements. Failure is explicit; there is no default CPU dual work or silent CPU fallback.

One owned headless hardware fixture should use the actual tile parser and real FacadeTexturePlugin, with this processor injected. Capture each selected atlas's actual resized pre-mask bytes once; create the oracle clone only in the fixture, then compare the plugin's final DataTexture bytes. The existing texture audit and current source hashes identify one-atlas examples: data518 at4096, data488 at2048, and data462 at1024. Record actual output dimensions, source hash, cap, settings, UV/sampler/orientation metadata and every RGBA difference. data458 is unsuitable: its audit entry has no atlas. Exercise default settings, bypass and zero-mask behavior without changing the production resize or cap policy.

Use a deterministic exhaustive RGB cube with alpha `(B + 17*G + 73*R) & 255`, independently check input coverage, and bind the production settings. This covers all256 alpha values and zero-alpha RGB, detects channel/order errors, and reaches dark/bright clamp cases. Compare GPU output to the unchanged CPU reference; separately assert exact alpha. A tiny prescribed-input case should exercise explicit floor/ceiling clamps and null bypass behavior so those branches are not inferred from aggregate cube coverage.

Check non-default renderer state restoration, shader/readback failure, context loss, concurrent atlas continuations and disposal while resize awaits, for default and trial resource paths. Require no late GL work or orphan resources. Root must settle the helper's exact closed-owner/cancellation contract during implementation; the current default plugin has no public abort signal. No private renderer or tiles-renderer seam is proposed.

After integration, the five repository gates, independent native Satellite fixed and seeded views, and basic Cartographic/style-roundtrip checks remain necessary. Qualify whole-city readiness with a bounded matched production timing run on the same source/cache/hardware/configuration; preserve the all44 boundary and report sampling bounds. No new full CPU profile or general capture framework is needed. The one-atlas214.9ms versus1665.4ms result cannot substitute for that timing or appearance evidence.

## Exact read scope

Paths are relative to the primary checkout. SHA-256 binds the bytes inspected, not a runtime success claim. Installed source is Three0.180.0 and 3d-tiles-renderer0.5.2.

| Source | SHA-256 |
| --- | --- |
| src/app.ts | df25d8c87f3ccb9bb2866902ef8aaf2b5f48400672d0f5e1f84d52d985f6cef3 |
| src/scene/buildings.ts | 0042a512aa7a397ac32248100343c8a9b26e18bf25b4a3b74cfb5a855d7be208 |
| src/scene/facade-textures.ts | 487688cf38d61c54db1dd861b0210e96dc08174c133bf6a1e0400c32b64ab911 |
| src/scene/delight.ts | ca0ac4156e6f0e1f4f7b2c619a869c20033de6e5e6b347a2ab79a3a7f4547a77 |
| src/scene/texture-budget.ts | 15c43fa6b0e038a0ac8d0ff2fb84296ef1ae5d2d77f03fcfcee7e6e3dfd1dbd9 |
| src/scene/tile-transaction.ts | c39feae1d563ef29926b652f406eb38cb4100599d02c4c850e638d2b5ede8b75 |
| src/scene/tile-materials.ts | cbf4c513e787d28a61833793b80a60032185acd9f1c8fa6814a7821763b25ea1 |
| src/scene/aoi-cutout.ts | 9271f480bdb3fd0d339284512474f03cdd869ea9a9b5235631b41820bf644521 |
| src/render/renderer.ts | 0e06bdec5ab458e19d96ace35652c18be6c97cc8cfd5b590a9529dd46800f554 |
| src/render/post.ts | 6f5b64db71bb3299e28af71c0925842122670cc5cc49763a0459f888599a25d9 |
| node_modules/three/src/renderers/WebGLRenderer.js | 35cea4871231c3fddc3517dcd03fc876bdb8f9e73f1a77042b35e3de0498c4cd |
| node_modules/three/src/renderers/webgl/WebGLProgram.js | d1ce381d6bfd7a632e708b1cd49b3332c16c5d0165a9532ab20788f6fafcc7fa |
| node_modules/3d-tiles-renderer/src/three/renderer/tiles/TilesRenderer.js | 17f8d09a070f72bcd7c47fdf5262081712ef40a510bc0c3209c0b00459083402 |
| node_modules/3d-tiles-renderer/src/core/renderer/tiles/TilesRendererBase.js | d39c221bc61fbd216581b321868bcafcf1b935812e39b0cbcfbb0071bd8b829e |
| data/scene/buildings/tileset.json | 71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483 |
| data/scene/buildings/data/data518.b3dm | 5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b |
| data/scene/buildings/data/data488.b3dm | 6960fa916ea7c4702f423ac8f52ab0cfe53963f3846624dbb1625887796ec8e1 |
| artifacts/texture-budget/manifest.json | 7d6c3eb246334da4669eeb4d9569135e47464d66ad5a870c9b30e166415ef955 |

The manifest records data462 source SHA-256 `89e36c66fd7ce678433e1bebed42e6a3e6f4ad56aa0885942a40f673faa49bd5`, cap1024 and one atlas. That tile's bytes were not independently rehashed in this review; the future fixture must verify them before using it. Content/source-hash checks only apply to this docs-only handoff; runtime gates were intentionally not rerun.

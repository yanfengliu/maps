# GPU de-light prototype: one real atlas

## Result

The isolated GPU operator was substantially faster for this one atlas, but it did not produce byte-identical output. Keep it as a diagnostic; do not promote or integrate it. The full 67,108,864-byte RGBA comparison found 204 differing pixels/channels, all RGB, with maximum absolute difference 1. Alpha matched exactly. The run therefore fails an exact-output contract; this report does not adopt a tolerance.

## Bound and method

One headless production-source tile parse ran on WebGL2 / ANGLE NVIDIA GeForce RTX 4090, D3D11. It selected `data/data518.b3dm` (4,973,844 bytes; SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`), a leaf with no children and cap 4096. The loaded tile had exactly one unique native-4096 facade map: `mesh_0_1`, 4096×4096, with unchanged UV/sampler metadata and source-pixel SHA-256 `b1398d8c9c599bba9d3acc91a01dd10bb50efcb3998585b09842f0d08b8734b1`.

Both arms used the same source RGBA pixels and CPU-derived sign-mask alpha from the actual parsed image. The order matched the production caller: collect source statistics, write the sign mask, de-light RGB, then collect output statistics. The CPU oracle used the unchanged public `writeSignMask` and `delightInPlace` helpers with the actual plan. This fixture did not instantiate `FacadeTexturePlugin` end-to-end. Although 31 other b3dm requests occurred, only the selected tile was processed by the paired experiment; no full-scene reveal or screenshot was performed.

The GPU arm used one raw RGBA8 target and a single WebGL2 pass, with tone/color conversion, blending, premultiplication, and native GL dithering disabled for the pass. Renderer state, including dithering, was restored. The pre-run numerical review approved the equations, Float32 input LUT, channel/orientation, mask and zero-alpha handling for this diagnostic; the remaining expected numerical risk is Float32/GLSL arithmetic versus JavaScript double arithmetic and framebuffer quantization.

## Timings and output

All timings are milliseconds from this single instrumented run, not application readiness or a repeated benchmark. Shared source resize/readback and source-plus-mask statistics took 367.3 ms. From the shared input through output texture handoff, CPU took 1,665.4 ms (1,638.7 ms clone, de-light and post-statistics; 26.6 ms upload/handoff). GPU took 214.9 ms (47.6 ms input upload, 94.3 ms pass plus blocking readback, 29.5 ms post-statistics, 18.9 ms texture construction, 8.8 ms output upload/handoff). Hashing and full byte comparison are reported separately and excluded from those arm totals. This is promising for the measured operator but does not estimate whole-tile or whole-scene savings.

CPU output SHA-256: `86fd433873caf37959b5af5d4879d28f107ce1f5a3e1336727ddc9c58a34e2cb`. GPU output SHA-256: `b4d59232071f3441318287d3c48074ce7c58d0641ce1620f3c3e61cd4113fe94`. Output statistics were nearly equal, but aggregate statistics do not resolve the pixel mismatches.

## Evidence and limits

The run record is `artifacts/texture-gpu395/run.json` (SHA-256 `f6ab9da139d54ce8b958b14225cc408cdde86a568a715b4a6247f2a48409d392`); it records the complete mismatch scan and first mismatch coordinates/bytes. Stdout is `run.log` (SHA-256 `51bac6e3e681466816125c69c65e9215615902f75549c46efbedc2ef4bcededc`); stderr is `run-errors.log` (SHA-256 `8d9b2ca67b2439eebb211b1c8746a6d8da8fe3d848dfc59940891e48394d7b72`) and contains only Node's experimental transform-types warning. Frozen inputs were `fixture.html` `bd2e994b3f7b8a79aa6f854b8d29d1a0277e0326052e4042ffa4c980ac18a97b`, `fixture.ts` `9abf55fe82ec73f973468d3a771619ecaaeea31fa987d4c35bf058c0fd5ea45a`, `runner.mjs` `d206a0911030f71ec0fcf780a4064fc425ac5e20c56ab338533b75788e8de628`, and `run-owned.ps1` `ae1a257aa2f8c6cfe026e3ac78331aa948df669e1399ea7a0b653b5c96ec8082`.

The record binds unchanged source/build/data inputs at HEAD `0323908824b2a1994dcf9ca7f3df0a0c62678673`, plus the four experiment files. Its stated bound does not rehash unrelated cached scene files. The launcher exited 0; browser, server and esbuild closed; the final process census verified owned processes and port 5321 absent, with no cleanup errors. No product files, data, build output, dependencies or Git index were changed by the experiment.

388 approved execution/timing/cleanup scope for the frozen launcher; 380 approved the numerical implementation for this diagnostic. Neither review waives the observed mismatch. Any next step requires an explicit output-equivalence contract and root integration-owner admission; no product optimization is admitted by this result.

Root checked the actual run and cleanup records and rehashed all 14 bound build/data/experiment files against current bytes with no mismatch. The six admitted process identities are absent; the final census is available with no live admitted, omitted or marked process and no port listener. The task's temporary tree was removed after a non-following census found no reparse point. Production source and the Git index remain unchanged. The earlier sandbox AccessDenied stopped before creating any runtime resource; the one scoped execution of the frozen launcher produced this result.

Root accepts this as a completed diagnostic. A possible next candidate contract is exact alpha and maximum RGB difference of one byte against the unchanged CPU helper, with independent native appearance, real plugin/lifecycle verification and measured whole-city startup improvement required separately. That contract is prepared for independent review; it is not product acceptance or a claim that other atlases meet it.

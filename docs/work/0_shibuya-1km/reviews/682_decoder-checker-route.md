# 682 — Decoder checker route

2026-10-11. Independent checker branch; product ff7/d210, documentation2532623. Source/evidence review only; no runtime, implementation, Git mutation or process launched. Readers released.

676 observes one same-document WASM200→ERR_ABORTED before closure, then ready:true, loaded67, failed0, pending0 and44/44 prepared leaves. Its checker accurately refuses a reported transport failure; it explicitly claims neither body completion nor consumed bytes. Ready geometry challenges an inference that no decoding succeeded, but does not identify the failed request's consumed result.671's two fulfilled192420-byte Promises belong to different documents/run and cannot fill that gap. Its length-only verdict cannot independently reject same-length corruption.

**Current decision: retain676 RED; no correction is supported yet.** Conditional smallest candidate: reuse671's existing original-Promise observer in the frozen tree runner, add SHA-256 of the actual returned WASM ArrayBuffer, and read its bounded snapshot after the existing staged wait. Keep every raw error. Only consider qualifying that exact WASM request after same-run epoch/URL association, exact192420-byte/digest consumption, no consumer rejection/abort/overflow, and successful compressed-model readiness; every other error remains fatal. Independent review must admit this predicate before images are scored. No source bytes, fresh startup or HTTP200 can substitute.

Finite distinguishing plan: one admitted unchanged676 reproduction, existing220/240/300 bounds and eight-original/control requirements; four predeclared request-bound controls—unavailable, shortened, equal-length corrupt and consumer-cancelled—must refuse. A missing/ambiguous consumption witness also refuses. No retries or deadline extensions.

Inspected SHA-256 pins (artifact rows relative to this worktree's `artifacts/`; PRIMARY=`C:/Users/38909/Documents/github/maps`):

| Input | SHA-256 |
| --- | --- |
| tree636/successor676/native-inspection.json | a7d5ce181d3c196455ed47da9cbc5a96a33bc1c24f327d0b97c136ffb806d536 |
| tree636/successor676/native.mjs | f831e9f808792f7fcc4fc352fbbf1b22e5d544f1a874dd02f842be8573490b94 |
| tree636/successor676/prepared.json | 83364a9f1cbe4738d4e80373931cacc793ae71ac6bf91c6dd57d7c1d90a68701 |
| tree636/successor676/recipe.json | efb7307dff306460db80215215a1ee722c6bbda6324c23fc7d1587091cedccee |
| decoder671/native-inspection.json | 926b52fdea5da970e9eb033a14807c6b3db662e937d7817299f4bca97523588b |
| decoder671/consumer.mjs | 437b50d3a3133f059abeac8a5c1be4df7cd019a65b3136b8b5d21443c1af2c07 |
| PRIMARY/src/scene/buildings.ts | cc8675eb865f00a5c3710a8b45dd367670ec2cbd1034f32c9ed913627991dd33 |
| PRIMARY/node_modules/three/examples/jsm/loaders/DRACOLoader.js | 7a4a51c694a6c9f983be452cc82b365e69ce08424654e3f245b4115e6efef258 |
| PRIMARY/node_modules/three/src/loaders/FileLoader.js | 848679ec402f63cfa73ee7d4ba23b250e2a460be41d1f7160dcc2ec0262f0336 |
| PRIMARY/node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm | a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac |

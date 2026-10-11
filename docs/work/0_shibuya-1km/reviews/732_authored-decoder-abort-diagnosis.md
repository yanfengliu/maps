# 732 — Authored decoder abort diagnosis

Actual 722 remains RED. Its one raw error is `requestfailed` for `http://127.0.0.1:4345/draco/draco_decoder.wasm`, `net::ERR_ABORTED`, sequence 200 at 2026-10-11T23:01:21.545Z. Three baseline noon originals completed; no dusk original or candidate arm ran. The strict predicate failed in `ready → assertLive → assertStrictErrors`, native.mjs:74/34/31.

The abort follows the dusk main navigation by 3.115 s and its second WASM 200 response by 15 ms. Noon epoch 1791759624478.4 had rendered all 67 tiles/44 leaves before navigation. Dusk epoch 1791759678326.3 later rendered all 67 tiles/44 leaves, pending 0/failed 0 at 23:01:42.168Z. This ordering points toward replacement bootstrap. It does **not** uniquely associate the failed Request with that document: 722 records neither request-start/finished identity, frame URL nor epoch on response/failure. A delayed outgoing-document event cannot be excluded. Readiness proves neither original WASM fulfillment/digest nor harmless transport cancellation.

Pinned three 0.180.0 uses one memoized `decoderPending` per DRACOLoader. GLTFLoader:2001 calls preload; DRACOLoader:320–386 loads wrapper/text and WASM/ArrayBuffer through FileLoader, assigns the returned WASM to decoderConfig, then builds the worker. FileLoader uses its own and manager signals, reads the original response through a progress stream, and resolves arrayBuffer before onLoad. The wrapper uses provided wasmBinary; its fallback URL is draco_decoder_gltf.wasm, different from this recorded URL.

Frozen 715 buildings:234/238 constructs Draco with the default manager/path; tile manager and per-tile controllers are separate. Main:93–95 calls app disposal on pagehide. Buildings:478–483 disposes tiles then Draco; upstream Draco:460–477 terminates workers/revokes the blob URL, without fetch abort. GLTFExtensionsPlugin's conditional disposal adds no demonstrated library cancellation. No recorded manager abort, consumer rejection or caller stack exists. A product cancellation fix is therefore unsupported by this evidence. Source-map contents equal installed Draco/GLTF/core and both renderer/plugin build modules; source provenance is distinct from runtime consumption.

One bounded next action: prepare a private observation-only 715 build using the existing 692/702 original-return consumer plus exact same-document Request/epoch recorder for both arms. Preserve the original call/Promise and avoid response-body copying. Source-review that preparation before root dispatch. Any subsequent appearance admission needs fresh actual consumption/length/digest/signal/terminal evidence under a separately reviewed contract; retain every raw error and the strict verdict. This cannot turn 722 green or transfer 702's witness. No source/build/runtime/GPU/server/Git/data changes or closure census ran here; only this report was written. Worker 731 owns actual closure.

Exact retained event pins, all from authored722/native-inspection.json:

| Sequence / observation | UTC / epoch / meaning |
| --- | --- |
| 99 | 23:00:28.323Z; first WASM 200; expected mounted 192420 bytes/a680…; body identity unavailable |
| noon readiness | 23:00:49.334Z; epoch 1791759624478.4; ready/idle, 67 loaded, 44/44 leaves, failed 0 |
| third original after | 23:01:18.312Z; same noon epoch; passed |
| 119 | 23:01:18.323Z; before-goto; noon epoch |
| 120 | 23:01:18.430Z; dusk main-navigation; epoch not recorded |
| 131 | 23:01:18.765Z; after-goto; dusk epoch 1791759678326.3 |
| 198 / 199 | 23:01:21.529Z /21.530Z; second wrapper 200 /WASM 200 |
| 200 | 23:01:21.545Z; WASM ERR_ABORTED; no Request ID/document epoch |
| failed dusk readiness | 23:01:42.168Z; dusk ready/idle, 67 loaded, 44/44 leaves, pending 0/failed 0; strict raw refusal |

Exact inspected byte pins; paths relative to the frontage checkout. Source module lines above refer to installed source; compiled-source equality was checked against the pinned 715 source map. No broad source rehash was performed.

| Path | SHA-256 |
| --- | --- |
| artifacts/authored722/native-inspection.json | 2e30aafb99166e30091bf2c7385c5a107f7c71bcc79b4123af02a3c6e258377e |
| artifacts/authored722/run.log | 40088f615fc8eb34b3fa830f650905d16bb0277f431f82c83f9d9dc4bd69dd7c |
| artifacts/authored722/run-errors.log | 26978264b35f70b7557325e7ce8ac01a0b37456127c56604543c9dd4059e7f77 |
| artifacts/authored722/native.mjs | 58d04873263e1fe1cdb3492bd8fcff858c0d58033c72432c70ce42e0718e0abb |
| artifacts/authored722/prepared.json | 87bb4f6a592cb22b1b459746f60a0e103a98a291c53a192ef9c9eccf70caf959 |
| artifacts/authored715/dist/assets/index-D1nPZNS1.js | 1c8f564dbbd414782b5ceb28522f14e0f5070a10c56944426409a633555e7036 |
| artifacts/authored715/dist/assets/index-D1nPZNS1.js.map | 3bd64a8cb2f39591412d339b4b3a06d13a84c5346c5dcf77674dc9926f84e0d5 |
| artifacts/authored715/source/src/scene/buildings.ts | e729852c716cb19a1ccc5d50c5437fe8378a3e9501f4de65f39b350f30e395b9 |
| artifacts/authored715/source/src/main.ts | 2e898283f68232ba4a6732f179e137709fb888734b4a73e8982a90bc14fc3207 |
| node_modules/three/examples/jsm/loaders/DRACOLoader.js | 7a4a51c694a6c9f983be452cc82b365e69ce08424654e3f245b4115e6efef258 |
| node_modules/three/examples/jsm/loaders/GLTFLoader.js | 67ac5551fdafa6e349bd80c8f8e5e39c136d6b2fb1ad647db9abb21dc86f9e4a |
| node_modules/three/build/three.core.js | eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20 |
| node_modules/three/src/loaders/FileLoader.js | 848679ec402f63cfa73ee7d4ba23b250e2a460be41d1f7160dcc2ec0262f0336 |
| node_modules/three/src/loaders/LoadingManager.js | a59b83415230e814f7b68177dae75fdb511611d60ad6d38f48d579904a41c166 |
| node_modules/three/src/loaders/Loader.js | 27554c200797c34762ce4b3a09e908be2eefa96de153e2d43eec24815de79ad8 |
| node_modules/3d-tiles-renderer/build/plugins-DiPIaVd3.js | 15a7c00dcef614db4296aa6b1bc1be0e36f32c085b26c65eb28ff2c07b32148c |
| node_modules/3d-tiles-renderer/build/renderer-3xKvdklX.js | 02365763bd50775d609f4150f245bfcb79991aa0c5782e62a3978179fe757a27 |
| node_modules/3d-tiles-renderer/build/renderer-tyqPdeD-.js | 084efe698eb12ef81d076d97b24c7df45e525f4b1f1e1bd11b69d03a74c45902 |
| node_modules/3d-tiles-renderer/src/three/plugins/GLTFExtensionsPlugin.js | d3d9eacee4afb6da5e58cf26b880a1cd6c8326f2e48f8c478a36faa404af28af |
| node_modules/3d-tiles-renderer/src/core/renderer/tiles/TilesRendererBase.js | d39c221bc61fbd216581b321868bcafcf1b935812e39b0cbcfbb0071bd8b829e |
| node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js | 8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6 |
| node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm | a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac |
| artifacts/default702/consumer.mjs | 3a8b8d462f01661074b14f3ba77948d0812ebab141ff3c9c87b017c69eff49b6 |
| artifacts/default702/predicate.mjs | 7d7f69122986c2dd1f8e95a9ef27551987ad35f7cc1f77d439a89166de983900 |

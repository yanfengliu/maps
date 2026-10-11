# 666 — Decoder server source review

2026-10-11, product `d210bc6` / docs `899a997`. Independent read-only serving-path review; client-loader diagnosis belongs to 663. No serving-side cause is established. No server/browser, body download, build, gate or runtime fix ran. All reads are released.

`serveSceneData` resolves `/draco/draco_decoder.wasm` beneath Three.js's decoder directory, stats that file, sets HTTP 200, `application/wasm`, `content-length` from its size and `no-store`, then pipes the same path. The actual pinned file is 192,420 bytes. There is no response-size cap, queue, explicit destroy or serving timeout. Missing/non-file inputs return 404; escaping paths return 403. The stream lacks an explicit error handler, so unexpected I/O failure remains unmeasured rather than an observed cause.

Installed Vite 7.3.6 creates a fresh Connect/HTTP server per preview and runs this plugin before later asset/fallback middleware. Tree661's retained owner is Node PID 2240 on strict port 4340. Its baseline preview stays open across noon/dusk navigation; closure follows the arm or failure. No arm-close intervenes between these two requests. This code supplies no application-level queue shared with dev port 5319; host disk/CPU contention was not measured.

Canonical644 retains HTTP 200 then `requestfinished`. Tree661 noon likewise finishes; dusk Request 2 gets 200 at 16:11:06.852Z then `ERR_ABORTED` at .856Z. Both tree routes bind the same expected file size/hash. These controls oppose a deterministic bad mount or fixed content-length error. However, the instruments record status and expected mounted bytes, not actual response headers, Content-Length, transferred bytes or server-side finish/error events. Before/after file equality does not prove HTTP-body completion. Runtime truncation/socket failure and the abort initiator remain unknown; no server repair is justified by this evidence.

Exact inspected pins: PRIMARY paths below; receipts are under FRONTAGE `artifacts/`.

| Input | SHA-256 |
| --- | --- |
| vite.config.ts | 900afe81bc4580d4e20a9fafbcebe8d4747368fabe35e007ad3949417f4e7165 |
| tools/vite/serve-scene-data.ts | 0cffde0bdce85e5b72fceff1d430c17b57171744f9aef14a9f7bf77a995b8b9d |
| node_modules/vite/dist/node/chunks/config.js | c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3 |
| node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm | a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac |
| tree636/successor661/native.mjs | c5a7db100b868fe210eaeedadf226f45b8692fc140e037d96319573ef06d2eee |
| tree636/successor661/native-inspection.json | 083d0e457c4599d5f5bc24b5454893b48c8941adc709ff468f66d34533103e1c |
| tree636/successor661/process-owner.json | ad69aa86c2481b95edea039dd48a3657e37dfa0cb19d054a83dc5af07c4e90cd |
| decoder644/native-inspection.json | c358e468e10ee9169266a6abebe9a27669d27244bd1748e9326d336039e60cda |

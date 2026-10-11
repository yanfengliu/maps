# 681 — Decoder serving route

2026-10-11. Source-only proposal; qualification remains blocked pending an admitted distinguishing test. Tracked sources inspected at clean primary `2532623d9e092eefec5016471cedc43432c0f0de`: `vite.config.ts`, `tools/vite/serve-scene-data.ts`, `src/scene/buildings.ts` and installed three.js 0.180.0.

The middleware streams installed decoder files with `no-store`. FileLoader consumes the response stream before resolving `_loadLibrary`. DRACOLoader's supported `type: "js"` selects `draco_decoder.js`; that file embeds the decoder and sets its local `wasmBinary=[]`, avoiding another binary fetch. 676 records HTTP200→ERR_ABORTED before cleanup, zero originals and unchanged inputs. 661 has a finished noon request followed by dusk refusal. 671 resolves 192420-byte WASM in both documents, without byte identity, and remains red. None establishes 676's cause.

Candidate diff: add `draco.setDecoderConfig({ type: "js" })` after `setDecoderPath`, identically in both prepared arms. Preserve request-error refusal, serving freshness, geometry, controls, renderer, population and 220/240/300 bounds. No dependency or checker change.

Finite test: one normal noon/dusk JS-consumption run, then 404, short-body, same-length corruption and genuine cancellation controls; each negative must refuse. Hash the actual `_loadLibrary` returned text against the 512465-byte ASCII source below, and require worker-decoded tiles, fresh frames and normal readiness. A changed-source control must fail identity rather than reuse prior bytes. Only then attempt the unchanged 676 eight-original recipe once, including clearance and style returns. No retries or deadline growth.

Gaps: JavaScript decoder cost, geometry parity and eight-image completion remain unmeasured. Abort repair remains unproved. No runtime or owned browser/server was launched; readers exited.

SHA-256 pins (paths relative to primary for installed inputs, frontage for evidence):

| Input | SHA-256 |
| --- | --- |
| `node_modules/three/examples/jsm/loaders/DRACOLoader.js` | `7a4a51c694a6c9f983be452cc82b365e69ce08424654e3f245b4115e6efef258` |
| `node_modules/three/src/loaders/FileLoader.js` | `848679ec402f63cfa73ee7d4ba23b250e2a460be41d1f7160dcc2ec0262f0336` |
| `node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js` | `8625489da79a805f4f2a7d511c3e52d8b4085608a9d2a4d5f4f9de5db0aea04f` |
| `artifacts/tree636/successor676/native-inspection.json` | `a7d5ce181d3c196455ed47da9cbc5a96a33bc1c24f327d0b97c136ffb806d536` |
| `artifacts/tree636/successor676/process-cleanup.json` | `8dbca4cbc28a64818363d80f640200915feddbb7f262a207d9cc0e53e970dff0` |
| `artifacts/tree636/successor676/process-closure-census.json` | `f2507fa94aba7519ac83646a20a8c50f84f43f1ac93a0217124ab776da03a8d7` |
| `artifacts/tree636/successor661/native-inspection.json` | `083d0e457c4599d5f5bc24b5454893b48c8941adc709ff468f66d34533103e1c` |
| `artifacts/decoder671/native-inspection.json` | `926b52fdea5da970e9eb033a14807c6b3db662e937d7817299f4bca97523588b` |
| `docs/work/0_shibuya-1km/reviews/680_decoder-repair-search-contract.md` | `faa3c8695ee0a14ff32d4e661b1be8c647bd6ca2c7560daad21a3e4df38e48c9` |

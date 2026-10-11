# 668 — Decoder cancellation callers

Static reachability only, 2026-10-11. No runtime, native/gate, fixture, source change or historical-cause claim. All reads are released.

Buildings constructs `new DRACOLoader()` without a manager: Loader selects `DefaultLoadingManager`. DRACO's library FileLoader inherits it. TilesRenderer instead constructs a private LoadingManager; GLTFExtensionsPlugin/GLTFLoader pass the DRACO object without rebinding its manager. Other default loaders share the default manager within the same Three module; it is not `tiles.manager`. Published Three core confirms these implementations.

Buildings does not call `preload`. GLTF parsing creates the Draco extension when `json.extensionsUsed` declares `KHR_draco_mesh_compression`; its constructor calls `preload`→`_initDecoder`. Geometry decoding also reaches `_getWorker`→`_initDecoder`. Library download can therefore precede primitive decoding based on the glTF declaration; construction alone does not trigger it.

Tile LRU removal aborts a per-tile controller, not either LoadingManager. The app's transaction wrapper passes a fresh signal to upstream parsing and checks the original tile signal at commit. GLTF parse, tile disposal/unload and DRACO disposal provide no bridge to the library FileLoader's signals; DRACO disposal terminates workers/revokes its blob. FileLoader.abort and LoadingManager.abort can abort the relevant controllers, but no caller was found in actual app source or these registered tile/GLTF paths.

This bounded map excludes dynamic manager rebinding, module duplication and unobserved external callers. Actual manager/signal identity, reasons and stream terminals remain missing. No mapped tile-controller path reaches the decoder's signals.

Five reused 663 source pins match its 17-row manifest. Additional exact pins below are PRIMARY-relative except the FRONTAGE manifest.

| Input | SHA-256 |
| --- | --- |
| artifacts/decoder663/relevant-pins.json | 4291fb904130c198af3b09427016dab6bc5b2531f7626f451a38add61cc2de11 |
| src/scene/tile-transaction.ts | cb8c136cfc9ce2ad8ccb7e24351572f87491ca06d7f01cc991a6485cda27c7ef |
| node_modules/three/src/loaders/Loader.js | 27554c200797c34762ce4b3a09e908be2eefa96de153e2d43eec24815de79ad8 |
| node_modules/three/examples/jsm/loaders/GLTFLoader.js | 67ac5551fdafa6e349bd80c8f8e5e39c136d6b2fb1ad647db9abb21dc86f9e4a |
| node_modules/three/build/three.core.js | eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20 |
| node_modules/3d-tiles-renderer/src/core/renderer/tiles/TilesRendererBase.js | d39c221bc61fbd216581b321868bcafcf1b935812e39b0cbcfbb0071bd8b829e |
| node_modules/3d-tiles-renderer/src/three/renderer/tiles/TilesRenderer.js | 17f8d09a070f72bcd7c47fdf5262081712ef40a510bc0c3209c0b00459083402 |
| node_modules/3d-tiles-renderer/src/three/renderer/loaders/B3DMLoader.js | 344b419ec1a147a09eee3543ac4a11717884501c9ee38ab2be105ecf15b7588d |

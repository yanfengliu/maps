# Decoder cancellation investigation — 2026-10-14

Decision: the retained captures do not establish an app decoder lifetime defect or justify a product fix. Baseline2 request218 remains unexplained and its custom HTTP acceptance remains failed. In particular, the available timing contradicts calling this request an ordinary cancellation of the outgoing noon document. This investigation grants no exception for `ERR_ABORTED` and does not certify the captures or inspect their appearance.

Scope: independent hard-problem branch A, read-only investigation of existing records and source. The fixed outcome and disqualifiers were read first from [capture-fixed-check.md](../../../../artifacts/commercial-corner-20261014/recovery/capture-fixed-check.md). That record names primary revision `0cd564d`, unchanged runtime revision `49cfdb7`, and the retained production build. No product changes, browser/server launches, runtime probes, gates, model calls or network calls were made. The two existing capture arms were inspected; zero additional runtime arms were run.

## Retained observations

The original [baseline capture](../../../../artifacts/commercial-corner-20261014/capture/baseline/capture.json) failed with `Browser request failed: http://127.0.0.1:4324/draco/draco_decoder.wasm: net::ERR_ABORTED`. Its request77 was unfinished; the record lacks the later arm's per-request timing. It retained eight images, two completed pagehide records, successful cleanup return values and equal before/after input inventories. Those facts do not establish when or why request77 failed.

The [baseline2 capture](../../../../artifacts/commercial-corner-20261014/capture/baseline2/capture.json) records the following UTC sequence. Its [exact runner](../../../../artifacts/commercial-corner-20261014/capture/frozen-baseline2-runner/capture.mjs) is retained separately.

| Time | Observation |
| --- | --- |
| 16:47:05.789 | The bounded pre-navigation drain starts with no active browser requests. |
| 16:47:07.138 | The drain completes after 1,349 ms, following tile idle, browser network idle, at least 500 ms with no active requests, and final tile confirmation. |
| 16:47:07.140 | The runner marks `navigate-dusk` and calls `page.goto`. |
| 16:47:07.1435 | The captured dusk document's `performance.timeOrigin`, converted from epoch milliseconds. |
| About 16:47:07.403 | Navigation returns after 263 ms; the new document reads outgoing pagehide result `completed`. The runner records navigation duration, not an exact pagehide event timestamp. |
| 16:47:10.157 | Browser request218 starts for `/draco/draco_wasm_wrapper.js`, alongside dusk building requests. |
| 16:47:10.457–10.469 | The server records that wrapper entity starting and finishing. |
| 16:47:10.479 | Browser response218 reports HTTP200 and then request218 reports `net::ERR_ABORTED`. |
| 16:47:49.170 | The next drain starts after all eight captures and both style round trips. It subsequently fails because the earlier request failure remains recorded. Fresh normal navigation and the real Start action are therefore not reached in this arm. |

Request218 starts about 2.75 seconds after dusk navigation returned and about 3.01 seconds after the dusk document's time origin. The runner's `navigate-dusk` stage spans the whole intervening capture loop; the stage name alone does not identify the document that initiated a request. Nevertheless, the timestamps do not support an outgoing-noon cancellation explanation. The noon decoder requests76/77 had already finished at 16:46:21.724/21.742, and the outgoing page had 67 loaded tiles before navigation.

Baseline2 contains 260 browser requests, 260 browser response-header observations and 260 completed server entity records. Exactly one browser request is marked failed and unfinished: request218. The server records all 58,456 wrapper bytes with SHA-256 `8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6`, matching its retained input pin. Its corresponding wasm request219 finishes normally; the server records 192,420 bytes with SHA-256 `a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac`. Server completion proves the bytes the server wrote, not that the browser consumer received or used them successfully.

All four subsequent dusk frame observations report a ready app, 67 loaded tiles, 44 of 44 prepared final leaves, `pending=0`, `failed=0`, `error=null`, and the dusk preset. The first dusk observation reports 65 facade-processed tiles and 38 section meshes. These are functional observations after the network event, not direct observations of the decoder Promise or its body reader. No pageerror or console-error entry appears in the record; its sole error is the requestfailed observer's string. All five owned cleanup calls report success, and its 332 input pins compare equal before/after. The fixed-question record separately bounds the served scene inventory at 156 files/364,187,965 bytes with SHA-256 `288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62`. None of these observations completes the custom HTTP audit or transfers an older certificate.

## Source path and lifetime

[createBuildings](../../../../src/scene/buildings.ts#L234) creates one `DRACOLoader` per app and sets `/draco/` as its decoder path at line238. It supplies that same instance to `GLTFExtensionsPlugin` at line263. [App creation](../../../../src/app.ts#L213) calls `createBuildings` once. [Pagehide](../../../../src/main.ts#L90) records the synchronous picker/app disposal chain; [app disposal](../../../../src/app.ts#L438) stops the render loop before invoking the building disposer.

The installed three.js 0.180.0 `GLTFLoader.js` constructs `GLTFDracoMeshCompressionExtension` for declared Draco use at lines 493–507; that extension calls `dracoLoader.preload()` at lines 1990–2001. `DRACOLoader.js` lines 320–329 fetch each library through a new `FileLoader` using the decoder's manager. Lines 343–386 memoize one `decoderPending` Promise for the wrapper and wasm, then create a Blob worker URL. Later worker requests await that same Promise at lines 390–396. Thus a single initialized decoder instance does not start another library fetch for each tile.

`DRACOLoader.dispose()` at lines 460–474 terminates existing workers, empties the worker pool and revokes its Blob URL. It does not abort the library `FileLoader`, reset `decoderPending` or guard a late continuation against disposal. Those are limits of its lifetime contract, not evidence that a late continuation caused request218. No `.abort(` or `abortController` caller was found in the app's `src/**/*.ts`.

The tiles renderer owns a separate loading manager. Installed `TilesRendererBase.js` lines 1045–1068 unregister plugins and evict cached tiles; per-tile eviction aborts the tile controller at lines 1559–1565. [Tile transactions](../../../../src/scene/tile-transaction.ts#L60) deliberately parse against a fresh signal at line 70, then refuse publication after the original cancellation or app disposal at lines 73–84. This protects parsed-resource ownership and publication. It does not observe decoder initialization or make its fetch part of the tile controller.

Installed 3d-tiles-renderer 0.5.2 `GLTFExtensionsPlugin.js` defaults `options.autoDispose` at line 32 but never assigns it to `this.autoDispose` in its constructor at lines 21–48. Its disposer tests that absent instance field at line 98. The app's explicit `draco.dispose()` at [buildings.ts:483](../../../../src/scene/buildings.ts#L478) is therefore the effective decoder disposal here. Changing the passed `autoDispose` option cannot repair the observed failure in this version.

These dependency conclusions were checked against the actual production source map `dist/assets/index-CvddKv02.js.map`: its embedded `DRACOLoader.js`, `GLTFLoader.js`, `three/build/three.core.js` and `3d-tiles-renderer/build/plugins-DiPIaVd3.js` matched the installed files after newline normalization. The bundled plugin constructor at line 3291 likewise omits the assignment; its disposer at line 3298 tests `this.autoDispose`. The conclusion is not based only on unused dependency source. FileLoader's fetch path combines its own and its manager's signals, reads the response body, and routes errors to the caller; there is no decoder-disposal abort in that path.

## What remains unknown

The record does not retain CDP request identity, loader/document identity, initiator stack, resource type, body-delivery events or the decoder consumer's Promise outcome. `requestfailed` plus an HTTP200 header cannot determine whether the decoder body consumer rejected, whether bytes had already been consumed successfully, or which browser-side cancellation path produced the network event. Completed pagehide proves only that the synchronous disposer chain returned. Successful later tile observations constrain the possibilities but do not replace the missing causal signal.

The next discriminator should preserve product bytes and existing failure handling while passively retaining CDP `requestWillBeSent`, `responseReceived`, `dataReceived`, `loadingFinished` and `loadingFailed` keyed by requestId, together with loaderId, documentURL, initiator, resource type and navigation lifecycle timestamps. Retain available body/completion evidence without consuming or replacing the app's stream. A decoder-lifetime claim additionally needs the actual wrapper/body/`decoderPending` fulfillment or rejection and its order relative to disposal; network events alone may still leave that unknown. Any added instrument must be bound and reviewed before its result can change acceptance. This report requests no diagnostic dispatch.

Until that distinction is observed, preserve both failed originals, keep request218 and the custom HTTP failure unresolved, and do not drop request errors, weaken guards, or call aborts harmless as a class. The current visual milestone's separate canonical guarantees do not explain this event.

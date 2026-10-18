# 406 — Fixed SkyLight distance trial review

2026-10-17. Independent focused review for Root. **ACCEPT the fixed transient helper/wrapper implementation within its static/component-test bound. No material finding.** This is one physical candidate, not general API qualification or lighting/appearance acceptance.

## Exact increment and behavior

`Content/Python/shibuya_tools.py` is214649 bytes/SHA-256 `1a8e3d3a7976e2ddc04b164d8d6f8ceee565f804a3c041df5bf287968f9e1237`; new `tools/unreal/test_sky_distance_trial.py` is8415 bytes/`a48934b9d0c8051e933103158a33d129ea040fe708004792b0ee6a9cdea9d11f`. Both match their private exports. Every111 prior function AST is unchanged from helper `5305e9862a7b82eeb5ad251a133937cf83087c6e33af21932f6e31c7b21e50bf`; the only new top-level helper and registered method are `_set_sky_distance_trial` and `ShibuyaCityTools.set_sky_distance_trial`, with a local resource reader.

The registered static wrapper takes a Boolean and delegates once. The helper rejects numeric/string aliases, candidate application during an active capture, an unadmitted ESU source scene, missing/duplicate/wrong-named SkyLights, wrong light policy and unexpected threshold state before changing the light. It requires exactly the named movable captured-scene light with no cubemap and real-time capture false. Property/readback/recapture callables and the compiled resource observer are checked before mutation; the observer must identify exactly the actual component.

Only `sky_distance_threshold` is set: candidate requires5cm and requests150000cm; restoration accepts only5/150000cm and requests5cm. A second apply cannot silently repeat the candidate. Restoration remains callable during capture for the controller's finally path. There is no save API, geometry/material/exposure edit, intensity edit or other-light setter on this path. The readback is checked before recapture. Mutation, recapture and post-request resource-observation failures restore the prior threshold and request its recapture; a rollback failure is attached to the original error. No exception is turned into a successful result.

The result truthfully records a recapture request and says that capture/resource completion is asynchronous. Its immediate resource row cannot establish updated SH, irradiance or a visual result. Subsequent native frames/resource and pixel inspection must decide the candidate. This review does not infer that a150000cm setting works from the code or mock data.

## Retained component evidence

The12 new methods cover the fixed apply/restore/idempotent-restore paths, unchanged unrelated fake state, Boolean aliases, frame/light/policy refusals, active-capture handling, callable absence, repeated apply, original failure/rollback and retained primary/secondary errors. They execute the actual helper and wrapper AST with independent native fakes. The existing10 frame/import methods remain passing component evidence; they do not exercise this native light API.

The integrated canonical report is2812 bytes/SHA-256 `5af5742254bdd9ae99f5ef743dfedc12cbb9c10be2d781bc91c209b2b36ce243`, binding these exact stable subjects. Both literal canonical discovery entries pass:12 SkyLight tests in0.1752051-second owned wall time and10 frame/import tests in0.4715296 seconds. The actual logs were read and hash-checked. Owned PIDs40384 and58988 required termination; both Jobs were verified empty. Their kinds/natural exit states are not inferred. The private export map is3024 bytes/`00efbc300170b3f75cdd74d501fb2e90346c0a5543946a119abea5c011e74cc7`.

Exact ignored pins are `Artifacts/review406-sky-distance-20261017/file-inventory.json`, SHA-256 `63c1704cde6c8e80a4b0baa9c8a6d14422032d37fdcf9b20776e6034161c60ba`.

## Native result and remaining bound

Native-result review: **DID_NOT_RUN here**. Root dispatched one transient original-pose trial, but no completed native receipt reached this reviewer during two bounded60-second waits. This does not say the dispatched attempt did not run, failed or succeeded. Its actual final status, threshold restoration, unchanged map/material/source state, delayed SkyLight resources, final/HDR pixels and owned process cleanup require that controller's retained receipt and Root's acceptance.

No native engine, Source/index, gate, test, Git, browser or GUI operation ran in this review. Only this authored review and ignored pins were written; owned Jobs/background processes are none. Previous import/ESU reviews and all Source, native geometry/UV, appearance, controls/contact/motion and3000/200 performance bounds remain unchanged. No unchanged native retry is requested.

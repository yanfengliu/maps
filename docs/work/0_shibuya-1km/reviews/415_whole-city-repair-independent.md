# 415 — whole-city repair independent review

Current source verdict: Round 2 accepts the focused 411b/material naming repair; Round 3 redirects the lighting attachment construction. CPU execution of the new naming cases, native linking/appearance, the final integrated review and all-five/main acceptance remain separate and pending.

Fresh read-only reviewer: fresh415. Date: 2026-09-30. Product base: `b4b8755a65c11a9fe9ce328030c8b6865d8f7781`; documentation checkpoint HEAD: `e060d3059ef607f10dcfbbce174d842da5fbb315`. Root owns integration and the sole CPU/GPU gate lease. This reviewer owns only this new LF report in the reused writable checkout. No product/test/data edit, build, gate, browser, server or GUI run occurred.

## Round 1 verdict

Continue the corrected train/light/material milestone, with one focused renderer diagnostic correction before native qualification. The repaired first-failure state, main UI/readiness wiring, seven instance disposal events and closer ordinary camera have no material source finding within the reviewed bound. Reject the renderer's current shader-name fallback below. Corrected surface GPU linking, native appearance, recognizable train passage, all five gates, exact integrated review and main integration remain open. Active lighting413 layout/runtime edits and the rejected road prototype are outside this exact source verdict.

**[P2] An ordinary unnamed surface is reported as shader `#define`.** `src/render/renderer.ts:19` uses `/#define SHADER_NAME\s+(\S+)/`. The installed Three passes `material.name` as `shaderName` (`WebGLPrograms.js:181`), puts that value after `#define SHADER_NAME ` in the fragment prefix (`WebGLProgram.js:739`), and copies it to the wrapper's `name`. Actual `createSurfaceMaterial` (`src/scene/surface-materials.ts:288`) leaves the name empty. The regular expression's whitespace consumes the next newline and captures the following `#define` directive, so the visible alert can say `Shibuya shader #define (MeshStandardMaterial)` instead of identifying road, pavement or terrain. The two CPU fixtures use only explicit nonempty names and miss the real empty-name path. Keep both name/type fallback matches on one line, assign the actual surface kind a material name, and add an empty definition immediately followed by another directive as a refusal fixture. The isolated malformed native surface must report the actual kind. Root accepted this finding and assigned the narrow renderer/test/material-name correction to 411; this round records the rejected bytes, not a claim that their later correction is verified.

The structure panel's containment case (`test/surface-structure.test.ts:54–58`) bounds the unfiltered analytic rectangle, not its derivative-width filter at distant views. The current helper uses only the containing 24 m cell (`src/scene/surface-structure.ts:43–55`). I have not established a visible seam or a material defect from this source observation. Keep minification/cell-boundary appearance within the pending native aerial bound; do not add an unrelated shader redesign without that evidence.

## What the source supports

`src/render/renderer.ts:13–27` uses the actual installed raw GL program callback. It forces shader checks on, captures complete program/vertex/fragment logs and both sources before Three deletes the shader handles, preserves a prior observer and retains the first frozen failure in a renderer-keyed WeakMap. Three's `onShaderError` replaces its default console error; the explicit complete diagnostic log preserves that information. A CPU GL fixture exercises this wiring, not actual linking.

`src/app.ts:176–182,253–262,397–399` reads that persistent failure for visibility, the existing loading alert and main bridge readiness/error. A failure raised by the draw is reflected before that frame's callback returns. Later style changes cannot clear it. The app's `ready` Promise remains the documented map-data loading boundary; the stronger render verdict is the bridge. The existing geometric rail observer also refuses an invisible city, so its separately data-bound readiness is not a route around this visible failure.

`src/scene/rail-trains.ts:121` dispatches each of the seven `InstancedMesh.dispose()` events exactly once before clearing the root, then releases shared geometries/materials once and unregisters both loop callbacks. Installed `WebGLObjects.js:70–78` removes instance buffers in response to this event, separately from geometry disposal. The new seven-event assertion is meaningful. The train source/path/schedule retain pinned rail inputs, full-size generic cars, stopped turnbacks, ready-clock ownership and the explicit southern through-route refusal; this review adds no continuous engineering clearance or actual service claim.

`src/render/camera.ts:25–32` starts at 420 m, polar 0.95 and azimuth π/4. The ground target, limits and input implementation remain the existing ones. The new actual OrbitControls fixture checks wheel zoom can still reach at least 1800 m inside the unchanged maximum. Adjusted WASD distance assertions follow the unchanged distance-scaled pan law; they retain time/repeat/direction checks. Readable ordinary streets and trains remain an image question.

The corrected helper uses `panelCoverage` at `src/scene/surface-structure.ts:53,56`; the original reserved `patch` declaration is absent. The independent reserved-word fixture includes that original mutation. Actual material injection declares/binds the two new uniforms, retains semantic top-face paving, keeps unknown terrain neutral and owns the finite 16 KiB texture. The reviewed CPU cases do not compile the generated GLSL or prove useful multiscale structure.

I inspected the actual worker logs: the earlier focused 411b run reports 62/62; its original type run was red on a fixture cast. The later affected run reports 2/2 renderer cases and full type checking exit 0 on the current corrected fixture. `affected-checks.json` is `041065318a3029114bd0aea715dbda3420eae095572086d58806b5121ba8fed7`. The material JSON reports 38/38, no pending cases. These are existing execution records, not reviewer reruns or whole-suite/GPU passes.

## Strategy and remaining acceptance

Use one coherent frozen corrected candidate. First establish clean/malformed actual GPU linking and the named non-ready alert, then inspect the four planned native default/peripheral/aerial views through real controls and a sparse recognizable northern train passage. The new camera and restored base should make this a fair powered-city/material verdict. Do not judge current appearance from the three failed old originals; I opened no image in this source round.

The accepted train/light/material unit should proceed to all-five qualification, exact integrated independent review and an early main commit once material findings close. The road packet is a separate unit. Its 127,428 candidate intervals, 32 untreated source IDs and failed independent typed denominator do not qualify whole-road treatment; another incremental pruning pass has not earned acceptance. A materially different source-bound construction and a complete independent denominator are the next road scope, without weakening footprint/support or source-ID preservation. Lighting's changed selection allocation is being repaired by 413 and receives no source acceptance here until frozen.

Whole-AOI road readability, dusk/noon peripheral fidelity, seeded held-out exploration, facade de-lighting, broader default populations, governed vehicle/pedestrian flow and the 3,000/200/60 fps target remain open. No new atlas tuning, generic motion experiment or architecture is justified by this round.

## Exact identity

All 20 files below were raw SHA-256/length bound before inspection and rehashed at 2026-09-30 19:04:48 UTC after source inspection, with zero mismatches. All 16 owned 411b paths match its then-current freeze. `runtime-freeze.json` is `365556a96950947b43eb4726467c85f18f475ca6463a0a24b579589c73d10cd7`. This binds Round1 only;411's forthcoming naming correction needs a separate focused round.

| Reviewed path | Bytes | Raw SHA-256 before = after |
| --- | ---: | --- |
| `src/app.ts` | 22552 | `4b19fadcc5959a29b46f085420ae42e3b037d17ceb37f7cb1630a77f31c61aa3` |
| `src/harness/bridge.ts` | 14848 | `4b3d03f4d0587853e2fa694741b94a8a9657aec88aa167de6ffd1fe01f457983` |
| `src/render/camera.ts` | 4084 | `002d0233a195926c789d71ba585dbfb6ce3fd03930a0d27ef02573f44457bc02` |
| `src/render/renderer.ts` | 4594 | `d1263b6bf52a72865e8e006c15151f09c42fa30438884d6b08d90fe2d4e70aaf` |
| `src/scene/rail-trial.ts` | 18847 | `3539a3afeefd2429a7f6a0fc4b44b524f981618317702de1d852c1cc6494f457` |
| `src/scene/rail-trains.ts` | 12176 | `e31739062a103007212f46b89d9dabea547db6b75e3a0aad5623993e0a86e128` |
| `src/scene/train-path.ts` | 7324 | `571a1ebe270898b0f3f4207412eadb828a8919119d6147dbef100d54d101744f` |
| `src/scene/train-schedule.ts` | 2423 | `30fa4511393de0be39efba723976a42b689e22de20f414ee32bb631570d70b6e` |
| `src/scene/surface-materials.ts` | 16489 | `9bcab62eb5c195f8725d625aef83de8d017f1eefea31d158f187c3d6cb46c673` |
| `src/scene/surface-structure.ts` | 3003 | `3a2899ab0058a112ad47eeacc1225cbd9ece0df4bde6007cdd9a09230f4944da` |
| `test/renderer-failure.test.ts` | 3586 | `829e6ae2e6c1d533e1eee608d345e9baf135f8fb84c52d09c242e383d79ebb75` |
| `test/app-running-trains.test.ts` | 7287 | `39760c6aca6a73bae933249c6a959aa6cf6e30710de32fb7f119b00e18866dc9` |
| `test/running-trains.test.ts` | 8501 | `e16b83643f7f08268dc5ba05f482d800a68ce38167e6e03992ab462f385892bc` |
| `test/harness-bridge.test.ts` | 10228 | `150c04d28f51a98173353427c3d0ee061201a6a5b965358b8def0e863d2b6374` |
| `test/camera-input.test.ts` | 13595 | `ea245c8cbc5422281b31a4bb1a22d76850d980dd299481bce1a6d95cbcba1018` |
| `test/camera-rest.test.ts` | 9560 | `37a75ec986776343ec3556f9840031dc25d687a8df746dc29a91d08889bfe880` |
| `test/app-local-walk-lifecycle.test.ts` | 6999 | `5aae22471f5bcec8c78c41e2d27e6fefba7f558123108c568d9f1676f6acfd25` |
| `test/rail-finish.test.ts` | 6157 | `9596c9445d16b61ce42c781f1b2d502a83fe0983e87ba20c1e065ad600addbdc` |
| `test/surface-material-shader.test.ts` | 17197 | `0fb562f0044ee7a91f7d693409de353e9a6c6dbce2609cd1f5ee3ce803c3b264` |
| `test/surface-structure.test.ts` | 5332 | `30c00532b7b54bf9bd662cd9946221413d81cc83face63ab74f8296644ac3d10` |

Installed Three is 0.180.0. Read-only API bindings: `WebGLRenderer.js` 102,861 bytes/`35cea4871231c3fddc3517dcd03fc876bdb8f9e73f1a77042b35e3de0498c4cd`; `WebGLProgram.js` 31,448/`d1ce381d6bfd7a632e708b1cd49b3332c16c5d0165a9532ab20788f6fafcc7fa`; `WebGLPrograms.js` 21,484/`18ecc3548865997851ee8fc1c7758aae078c572da38609205d1b6ac139c7b453`; `WebGLObjects.js` 1,578/`6cc2fd61bc05896e420facedc2736dc96625010973c2b5ae3d42ae8d8fa0f336`; `InstancedMesh.js` 10,269/`f0dfa4a7d1738d5bdc282a8103dcbd051deb0c002277c11da3fb69e4e3b295a3`. Adjacent read-only app observation bindings are `src/render/loop.ts` 6,510/`8750fd5349bb0862e15825a94634226cc3a702a3549eb4f9d2a446ae3d10820a`, `src/harness/rail-still-snapshot.ts` 12,571/`09f37ed335a3097d1d73ccc61d081ea2e85f4dfbcb7bbf029cca0ba6710de438` and `src/harness/rail-camera-clearance.ts` 17,621/`3e10295ae6b096d37a243902feea12d60fada26c9cdee06b0e048fff4d63d483`.

No task-owned browser, GUI, server, watcher, child process or temporary output was created by this reviewer. The only retained output is this authored report.

## Round 2 — naming repair source re-review

At 2026-09-30 19:10:22 UTC, the focused source correction is accepted and the Round 1 P2 is resolved in source. No material finding remains in this reviewer’s 411b/corrected-material scope. This does not accept active lighting413, final integrated bytes or GPU output.

Both fallback matches at `src/render/renderer.ts:19–20` are anchored to one line, use horizontal whitespace and exclude CR/LF from the captured token. The new empty-name/empty-type fixture at `test/renderer-failure.test.ts:39–48` places a further directive immediately after both; restoring the old cross-line pattern would violate its fallback/name assertion. The actual surface factory names each material `Shibuya:<kind>` at `src/scene/surface-materials.ts:290`; the three real-factory cases at `test/surface-material-shader.test.ts:55–61` retain that name after style application. No unrelated material, shader response or product behavior changed in this correction.

The current `runtime-freeze.json` has 18 product/test entries and SHA-256 `764d52e21bc7bfffc89696ef6a1039d74b515e24a3269eba7fb5459915fbef5e`. I checked every entry's actual length/hash before and after focused inspection: 18/18 match, with zero changes across the round. The other two reviewed structure files retain their Round 1 hashes. The installed API and three adjacent observation files were also rehashed unchanged at the end. Relative to Round 1, only these four reviewed files changed:

| Corrected path | Bytes | Raw SHA-256 before = after focused inspection |
| --- | ---: | --- |
| `src/render/renderer.ts` | 4662 | `e0219cfb908ce5e9b9dbb7aa84ba1d11900558943cfb05c005a65ff3e68ae7b4` |
| `test/renderer-failure.test.ts` | 4542 | `1b7f85b8b5bd8cae6787b2859d99d65a35b90db1667de855ab5d4aaad8427f63` |
| `src/scene/surface-materials.ts` | 16526 | `f763faabe6f9b3e83fbbdfa5e6cccf812c1c38ccbb8035a1a014c778744ade5a` |
| `test/surface-material-shader.test.ts` | 17601 | `0b336acdf1b3d3383b659e2e14330a7d94515fee8f26492d7db5ef702cc1059d` |

The old 62/62 and later 2/2/type records precede this focused naming correction. The newly added cases have not been executed within this review. Root owns that next bounded CPU check and the malformed/clean native control, which must name the actual road, sidewalk or ground material and preserve non-ready/alert behavior. I ran no new test or process.

## Round 3 — lighting construction strategy, separate source bound

Root requested a fresh fundamental review of the frozen clustered lighting source and its new literal 44-leaf inventory. This round does not extend the accepted 411b bound to lighting, accept the old native scatter or claim new pixels. Product layout/renderer and source evidence remained unchanged through the final rehash at 2026-09-30 19:18:39 UTC.

**Verdict: redirect the attachment construction, keep the bounded allocation/reuse repair. [P2] Valid source support disappears under tessellation.** `src/scene/city-lighting-layout.ts:148,154–157` removes triangles before planar grouping unless each individual face has at least 3 square metres of area, spans at least two global 3.6 m bay-grid positions and intersects an eligible floor position. Those conditions are about a face's triangulation, not whether the complete measured wall supports a rectangle. Small subdivisions needed to cover a fitting never reach the support set. Later `fittingRectangleFitsSupport` at 118–119 and placement at 227–228 admit only one triangle or a convex exact two-triangle pair. A fully covered rectangle split across three or more coplanar faces is unconditionally refused, even when its complete union has no gap.

A second structural source loss is the single seeded block at 211–214,238–249. Its bounding bay/floor extent may contain empty corners of a triangular or concave measured wall. Only that one up-to-4-by-4 block is tried; insufficient supported cells or occupancy discards the summary without checking a deterministic alternate contiguous block. The 24-summary rank reservoir is also selected before support quality is known (159–175), so low-ranked small fragments can consume discovery capacity. These mechanisms are present in source. Their measured individual shares of the 191 refusals remain unattributed until the worker's admitted refusal diagnostic runs; they must not be presented as measured causes or proof that every excluded facade can support a cluster.

The actual inventory is explicitly red: 436,941 source triangles; 82,635 eligible triangles; the helper's roof/nonvertical rejection counter 179,450; 216 summaries with 342 retained face references; 1,576 fitting attempts and 3,179 support tests; 227 fitted items in 23 accepted groups; 191 refused groups and no overflow groups. Accepted group counts by region 0–8 are 1/2/6/5/2/3/0/2/2. Region 6 has zero fittings, occupancy and shopfronts. The receipt reports 54 unchanged bound inputs and `pass:false`; this reviewer rehashed the source/evidence paths below rather than claiming an independent complete-source rerun. The ten literal fixture cases cannot qualify this actual source population.

Root accepted a scoped redirect: retain all measured eligible vertical pieces, including fine subdivisions, for selected planes; prove full rectangle coverage against a bounded exact coplanar triangle union; use deterministic alternate supported contiguous blocks; compare equivalent two-triangle and three-or-more/fine-fan tessellations. Preserve thin gaps, interior holes, wrong-plane and outside-AOI refusals. Do not raise density, accept bounding boxes as support, lower source authority or add unrelated lighting architecture. The next source and actual-source diagnostic need focused independent re-review before native capture.

The new inventory's isolated layout cost is 126.524 ms, with first renderer mount 96.739 ms and ten unchanged-source mounts 2.083 ms. Unchanged mounts reuse buffers; the reported reuse predicate is true. The prior 1,577.2654 ms was the earlier dispatch's different bound, so it is not a matched speedup denominator. `summaryStorageBytes=3,538,944` is reserved reference-array capacity during discovery, not proved retained layout allocation: summaries do not escape `collectCityFittings`. The JSON's sampled heap delta is 3,178,968 bytes before/after and 462,752 bytes after explicit GC; neither is a whole-process peak or GPU measurement. Keeping bounded selection and source-stable reuse is justified while support changes.

| Frozen inspected source/evidence | Bytes | Raw SHA-256 before = after |
| --- | ---: | --- |
| `src/scene/city-lighting-layout.ts` | 19391 | `961df6637d3ca1c70d82412a4154d2e9a04734b66f96d4e0140aed1a1cff9f60` |
| `src/scene/city-lighting.ts` | 15148 | `8c2ace0399fac6ec33cfd3453e3fdf07f6507440faf6a13bda73c8dc59418edb` |
| `test/city-lighting.test.ts` | 13341 | `3527ce0b12f51769cdbcd2380d98beb6223ed4013b9275b71c08954a79e37bf3` |
| `artifacts/city-lighting413/cluster/inventory-cluster.json` | 149054 | `2da6027380c394119a3c174991dac387441e83293eb413b23a13a81c925df29f` |
| `artifacts/city-lighting413/cluster/inventory-process.json` | 671 | `2c084c72c92529bffd2094d27df2241d89141882e67c76cefb86197cc82df040` |

The inspected inventory instrument is 7,583 bytes/`23a3b9bf4be505e05191a3ca482a7cbd3627c0a09629d6ef6d530161c7dc78f1`; it uses the same ordinary `DEFAULT_SEED` as runtime. Its prepared, unrun refusal-diagnostic binding is 467 bytes/`3483c35b5d7923b4240b0b3aa00128dd78411b62652e2c524b7e725be1412371`. The owned inventory wrapper records exit 1, retained-handle disposal, current root absence and zero marker processes. This reviewer created no process or additional evidence output.

# 1470 — Native agent fixture review

2026-10-17. Independent native reviewer `review1466`, following [1467](1467_population-native-review.md) and [1468](1468_head-pose-source-diagnosis.md). Executable base remains `59fbb1ce7fedaaa9e43d6747fb35994790d093b5`; root reports docs-only main `4d50fd6`. Reviewed the sealed seven-image 1469 generic-agent fixture packet, not the ordinary populated world. No runtime, browser, server, GPU, build, test, Git or source mutation was performed by this reviewer. This is native visual judgment, not CLI review telemetry.

**Bounded result: no gross head/neck deformation is visible in the five inspected Near samples. The earlier world appearance concern remains unresolved.** The current fixture makes the asymmetric bob and face occlusion a concrete explanation for a tilted-looking silhouette. It does not establish that explanation for the precise actors and image instants in walkers-02–04. Park this finite discriminator and population-default qualification; do not add another capture/probe framework or prescribe a head-straightening correction from these results.

## Native findings

All seven fixture originals were opened individually at their original 1280×720 resolution. The Near view and four Near Step images show three coherent human bodies. The woman at the right has an upright, connected neck and a recognizable face beneath the asymmetric bob. The heavy hair mass covers one side of the face and eye, while the visible cheek/chin produces an oblique silhouette. I do not see the head folded onto the shoulder, detached, grossly stretched or otherwise anatomically collapsed in these five images. The suits, shirts, arms and legs of the other two variants are also coherent within this static diagnostic.

The bob's shape remains visually recognizable across the five Near samples while the legs and arms change pose. That is evidence about five displayed poses, not continuous animation. The fixture clock reads 0.000, 0.125, 0.250, 0.375 and 0.500 seconds. Actual individual actor phases are UNKNOWN. No rendered motion between these samples was inspected.

Medium shows three small, distinct human silhouettes. Far shows three tiny figures. Head and neck pixels in both are insufficient for anatomical qualification, especially Far. I did not enlarge or crop them to manufacture detail. The selected view names and source-derived LOD attribution do not establish actual per-actor LOD telemetry.

| Original suffix | Native observation |
| --- | --- |
| near | Woman's neck and visible face are readable; the diagonal bob obscures one side. Three complete, coherent bodies. |
| medium | Three clothed silhouettes are present; head/neck detail is too small to qualify. |
| far | Three tiny figures are present; head anatomy is unresolved. |
| motion-1 | At fixture time 0.125 s, female neck remains coherent beneath the same asymmetric bob. |
| motion-2 | At 0.250 s, changed limb poses remain coherent; no gross female head collapse is visible. |
| motion-3 | At 0.375 s, the visible cheek/chin and neck remain connected; hair still masks the opposite face side. |
| motion-4 | At 0.500 s, the head remains broadly upright with the same oblique hair silhouette; body pose remains coherent. |

I also inspected the retained female front-idle and side-walk source originals individually at 720×960. Both show an upright head and the same asymmetric bob, with a clearly connected neck. The fixture therefore resembles the source's head/hair presentation in these views. These historical Blender images are differently lit and framed and are not a current matched source/GPU correspondence test. The nine-row near-LOD CPU finding in1468 remains its own finite bound; this review does not extend it to all vertices, rows, levels or world instances.

## Disposition of 1467-F1

Retain the original world images and finding. The phrase "head tilt" in1467 describes their apparent dark silhouette, not a measured anatomical rotation. This fixture supplies evidence against treating that impression as an established gross baked head rotation. Hair occlusion, viewing angle and lighting are now supported alternative explanations, but no exact world actor/LOD/phase/view correspondence was captured. Thus the odd world appearance is still unresolved; an actual defect in geometry is also unestablished. Do not claim that1467 was disproved, that the generic female asset is fully qualified, or that a shader/baker correction is required.

The finite head discriminator is complete with this limit. Reassess and park further head apparatus and population-default work. Return to another bounded visible milestone under root's priorities. The current evidence does not justify broad simulation research, new telemetry, new angles or repeated fixture captures merely to obtain a stronger verdict. No central crossing capture is needed to settle this fixture's finding.

## Evidence checked and limits

Sealed manifest: `artifacts/pose1469/native/manifest.json`, SHA-256 `468e011fb3854a57de7474e359ddbdc0921bee6e7524819a4b5b9d236d4f44e4`, unchanged before/after review. It records the actual selected Satellite/Pedestrians controls, Near/Medium/Far at time0, then Near Steps1–4. Renderer is WebGL2 through ANGLE NVIDIA GeForce RTX4090/D3D11, at1280×720. It records `errors:[]` and `passed:true`. Source attribution of LOD is explicitly distinguished from observation, and individual phase remains UNKNOWN.

I compared the manifest's before/after records:31 source,34 selected asset,6 global-dist and2 protected entries are identical. Its four fixture-build entries also match before/after. All34 retained served-asset body rows match the corresponding manifest asset path, byte length and SHA-256. This is independent comparison of the retained records, not a new runtime or whole-source rehash. Fixture JavaScript SHA-256 is `5162dcf2289f556745a2be8ecf331af24d7d7340b42672c75ad1fd9f5d40eef2`; fixture HTML is `d1ff3442bf3d02d604ac62466681362c731e37ce04d416234c220bde6f6b6771`.

Root's handoff records an earlier zero-frame setup failure caused by the old runner's selector operation, followed by one artifact-only real-control correction. That failed arm is not appearance evidence. This review covers only the sealed seven successful originals. Capture-owner cleanup/report remains separately owned by1469; manifest cleanup flags do not substitute for its outer process census.

These are static fixture samples without the ordinary map, crowded instances, matching world camera, exact actor phase or observed LOD. They do not establish support/contact, avoidance, continuous motion, signal behavior, performance, 60fps, population defaults or all-asset quality. The plain unshadowed ground is not a sole-support oracle. All14 final acceptance criteria remain open.

## Inspected bytes

Every fixture filename below is prefixed `satellite-pedestrians-` and lives in `artifacts/pose1469/native/`. All seven actual file digests matched the sealed manifest before viewing and remained identical afterward. All PNG headers declare1280×720. Evidence ancestors and image files were checked for reparse points before reading. This is a bounded stable-file observation, not an atomic filesystem lock.

| Suffix | SHA-256 before and after |
| --- | --- |
| near.png | `360eeab7ab9106b1dcf2ca47d79ffc3cf90330d7fb2ce861b43613c299277c1b` |
| medium.png | `0da25584b68739270f504a4d5be6a1cf2c7654b7ba7bddfc85f824a38949a370` |
| far.png | `92a66d2b46b145685ac5c4f696a957b489071f40ea958d946d3a141751e150b5` |
| motion-1.png | `a94f4b177a22ac07b86f3ab83a6ff8ec18c8f19f0a799151138f54cb8852d9c8` |
| motion-2.png | `e4657d983671f5bef2e29ba8c0cf0e7cee082e7dd069eb195346cef06b8b4aad` |
| motion-3.png | `319eaa637a28ec8b5e001dfaa468b9ec5542a60f2458caa14e695e160ce50f7f` |
| motion-4.png | `88b7f751bb21da84478bf36ba8b3b035698de0acaa0a7a73eb592c0432c99481` |

The two historical720×960 originals live under `artifacts/agents/candidates/humans-1789624557794403900-62cec8bc8d3c/`: `commuter-female-commuter-front.png` SHA-256 `4eccfb9a15a3ff34a4305cc81fdb0552ac1eabad621f7e8150701cc4cd766813`, and `commuter-female-commuter-side-walk.png` `f515a8d9d6d9178cb99cb6eca37793bd6b27831f2be8e0fbd9ead93ad29d29cf`. Both match1468's receipt and remained unchanged through this inspection. Source report1468 was read at SHA-256 `35223d8d188f50c6863f2c1c49f5e761a97eb49a772151b3e6f738c2d1ff2187`; its receipt at `91dfffc3b8e12072ef1ef5c26adedeea2a39a6b92a4e54d1e4d8ce12b6ca6ac3`.

Reviewer receipt: `artifacts/review1470/receipt.json`, SHA-256 `26d3d28fadd16f484e04dd2cd071009c6302ef93a77f2e4b9b6fed0c4f820404`. It retains all nine inspected-image before/after digests and original dimensions. Only this small ignored receipt and the authored report were created; no owned browser/GUI/runtime process exists to clean up.

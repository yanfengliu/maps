# Review 287: integrated pavement appearance

Reviewer: pavement_capture282, independent of implementation. Date: 2026-09-28. Verdict: ACCEPT the integrated pavement increment within the source and appearance bounds below. No blocking new visual regression was found. This is acceptance of the reviewed primary working-tree change over a72add5d58f85727194de1380456f6a60476d65c, not a claim that it has been committed, merged or pushed.

The earlier SOURCE.md accepts the exact two-file product diff: surface-materials.ts and its shader test. Their bytes still match the frozen candidate. Pavement geometry, vertex/depth behavior, markings, road and ground stages remain unchanged; both styles retain the shared material lifecycle. The earlier native review 283 provides the controlled A/B evidence for reduced grout prominence. Neither source arithmetic nor this report substitutes for rendered pixels.

I independently inspected every one of the 46 immutable 1280x720 originals: eight hero views, 36 sweep views and two separately bound Cartographic return frames. Each image was displayed individually once at original resolution. All paths, native sizes and SHA-256 digests were checked before viewing and rechecked for the attached ledger. The 44 certified images belong to run fabda33c6be9895d on the RTX 4090, driver 616.64; the two return images are additional evidence, outside that certificate.

The hero crossing views preserve the accepted improvement at noon and dusk in both styles: the dense grout grid is quieter as it recedes, while nearby tile outlines remain readable. Broad pavement color and lighting remain coherent with the asphalt, painted crossings, trees and surrounding facades. The plaza sweeps show no new conspicuous stripes, bright or dark shader patches, missing pavement or gross material breakup. Approach and block views preserve surrounding buildings and rail features; some block views are heavily occluded by buildings and primarily check those surroundings. Overhead views preserve the bounded city layout and style consistency, but pavement occupies too few pixels there to judge fine grout.

The thin diagonal line across the right pavement remains visible. Review 283 established the same line in the baseline A images; the quieter grid makes it easier to notice. Its physical cause was not established. Raised or irregular surface boundaries, simplified building silhouettes, blurry or stretched Satellite atlas detail and repetitive Cartographic facades also remain visible. The reviewed source/data scope does not change these systems, and this acceptance does not claim those scene limitations are repaired or that the scene is photoreal.

Both return images show a coherent Cartographic appearance after Satellite, with no visible mixed-style remnants or camera jump. The recorded before/after camera positions are identical and the observed rail manifest, layer and triangle counts agree. Those observations do not establish unrecorded disposal counters, population progression or literal bare-slash navigation.

I read the completed 286 evidence: build, types, tests and audit record exit 0; the test log reports 920 tests passing, and the audit log retains two moderate findings. The hardware visual certificate records the complete frame set and lifecycle lane. No gates, browser, GPU session or capture were rerun for this review. These final images are static; continuous shimmer, full-clip behavior and performance remain outside this acceptance. No new task-owned process was left running.

Exact bindings (SHA-256):

- SOURCE.md: a6f1e4088cfd207e7786ba244204499cd2ea60a5f4a389538feb87a35fb25430
- Surface source: f905020c983366b27a763fd3403d5ed50eab06904d15c0994133cbcfeaf886c6
- Shader test: 970eaf5b6ffa193f0c8ce5ba8ddab7a0eda83d85bda780df5fbe866c53cb01ea
- 286 certificate.json: b41aca246a1f2b9bdc19291585c98ecab297bea9702c2399b35c96aea2e44439
- 286 native-frame-manifest.json: 0a3795253175aa8e838882def12dad8bb43a95d7301513b29a687566f9df2929
- 286 style-runtime-evidence.json: 7a670dbcec384377927bcce2db80f7583f722dc12c4a9008bc5ea71b3075a1c1
- final-inspected-ledger.json: 2fd8f5957eb5bbd3e019baa809d8ba8c2bb17aa2352a97ff348c625d955eb192

The adjacent final-inspected-ledger.json records every inspected absolute path and digest, inspection order, source hashes and prior-review bindings.

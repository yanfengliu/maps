# Satellite tonal milestone — final integrated acceptance review

Independent reviewer: `satellite_review`. Date: 2026-09-27. Scope: P1/P2 Satellite tonal balance on the primary checkout. This is a new review round; `candidate-review.md` and `candidate-evidence.json` remain unchanged.

## Verdict

**Accept the exact integrated Satellite tonal milestone.** I inspected all 44 certified PNGs individually at their native 1280×720 resolution, independently rehashed each one, rechecked the source diff, and read the actual gate and lifecycle evidence. No blocking introduced visual or source finding remains in this bounded milestone.

The accepted result reduces the common green/teal photographic cast and improves the separation of dark roof equipment, seams and raised sections without turning roofs uniformly pale or emissive. Pale faces at the untuned azimuth 240 retain contrast; the large blank face at azimuth 60 remains dark. Distinct signage colors and directional light/shadow divisions survive. Cartographic retains its established palette and facade families.

The reduced warm facade glints at dusk are real and accepted. They are particularly visible at the crossing and block azimuth 120, where the corrected RGB also changes the pre-existing glass/roughness proxy. The final frames reproduce the earlier accepted tradeoff: less golden glare and more visible source texture, with lit and shadow-facing sides still distinguishable. Do not describe this as an unchanged specular response or physically recovered material reflectance.

At review time the exact changes are integrated but uncommitted in the primary checkout over `2b741efdbff7f4bd3785a3ae11f9e249ff753fcb`; committing, merge confirmation and remote delivery belong to the integration owner. This report does not claim those actions occurred.

## Certificate, source and build binding

Primary certificate: `artifacts/visual/complete.json`, run `a1d8e6317d7db92c`, certified `2026-09-27T07:22:37.760Z`. SHA-256: `d421619598ae76f129535985fc8adb60e251373486e3b780864c97e5cc73dc87`. The retained verification copy is byte-identical.

| Exact input | SHA-256 |
| --- | --- |
| `src/scene/delight.ts` | `ca0ac4156e6f0e1f4f7b2c619a869c20033de6e5e6b347a2ab79a3a7f4547a77` |
| `src/scene/tile-materials.ts` | `357026ece962e8c1d9189f3107ef7201bb03adc821df01ea97391db524674e17` |
| `dist/index.html` | `b33b8e5c4371df9d94c5a2f9d1fb45b08414150b9cc7d1bfb8413195347caaa7` |
| `dist/assets/index-CNwJYFE6.js` | `48a7dd38bb76ba1b4175bcddaab14c62686966425ccca89ac71a74508cb87204` |
| `dist/assets/index-dvQKBZaf.css` | `11dd032c51b536a500e2265a9acdcdda9070f73e6c0a8f31e75b6ad5ab7ba929` |

Both source hashes match the independently reviewed preliminary candidate. The current three build files match the certificate and the iteration candidate's recorded build. The integrated source diff remains 16 insertions and 6 deletions across those two files; no integration source fix expanded it.

I reran the gate's read-only digest functions after inspecting their implementation. The current served scene matches `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`: 117 files, 301,782,754 bytes. The current harness matches `45aeaf15464fbc2a34e0252f3c06b6e8bd44969103aeb65bdd7d21dab53d0593`: 24 files, 219,520 bytes. I did not rerun the build or browser gate.

The certificate and all three raw lifecycle records name NVIDIA GeForce RTX 4090 over ANGLE D3D11, driver 616.64. Each lifecycle record has an empty console/page error array, completed teardown, and exactly the certified build hashes. Their navigation/replacement times are 100/3906 ms, 103/3921 ms and 95/3617 ms.

Reviewer-owned `final-evidence.json` records the full 44-file raw hash list, each native inspection, the source/build hashes, current tree digests, the three lifecycle-file hashes and the gate-log hashes. Its SHA-256 is `622fbd27360242c21392f16454b98b1b26e8fe27a823924c8cca20186e7676ae`. This is evidence coverage, not a thumbnail review or a numerical appearance threshold.

## Full native-image coverage and findings

Every named file below is under `artifacts/visual/` and was opened individually with original-detail display. The six explicitly listed sweep angles in each row are six separate inspected images; no appearance judgment was inferred from another angle.

| Files inspected | Count | Result |
| --- | --- | --- |
| `hero/hero-satellite-noon-crossing.png`, `hero/hero-satellite-noon-approach.png` | 2 | The cylinder and central source facades are less green; IKEA, UC, cyan panels and authored reds stay distinct. Station roof layers are more readable, and the right shadow roof remains very dark. |
| `hero/hero-satellite-dusk-crossing.png`, `hero/hero-satellite-dusk-approach.png` | 2 | Dusk remains dark. Bright signs keep hierarchy. The crossing's narrow warm facade loses glare but retains texture and a directional distinction; the roof gain is modest, not a night-lighting effect. |
| `hero/hero-cartographic-noon-crossing.png`, `hero/hero-cartographic-noon-approach.png` | 2 | Clean light facade colors, dark glazing, roof seams and noon cast-shadow divisions remain coherent. No photographic cast or source signage leaks into the procedural branch. |
| `hero/hero-cartographic-dusk-crossing.png`, `hero/hero-cartographic-dusk-approach.png` | 2 | Warm facing sides and cool shadows retain their relationship. Authored signs, trees, ground and repeated facade structure remain consistent with the existing style. |
| `sweep/satellite/plaza-az000.png`, `plaza-az060.png`, `plaza-az120.png`, `plaza-az180.png`, `plaza-az240.png`, `plaza-az300.png` in that same directory | 6 | Source reds, blues and yellows remain separable. Warm-facing walls still catch light at 000/240/300, while blue shadow faces remain dark. The existing blur/stretching is conspicuous at 120/180/240; the tonal pass does not resolve it. No new glowing roof or broad neutral coating appears. |
| `sweep/satellite/block-az000.png`, `block-az060.png`, `block-az120.png`, `block-az180.png`, `block-az240.png`, `block-az300.png` in that same directory | 6 | Dark station roofs and raised structures remain ordered at 000/060. The large 060 face stays dark and largely blank. At 120, the weaker golden tower reflections retain warm/cool separation. Pale parapets and equipment at 180/240/300 retain contrast instead of bleaching. |
| `sweep/satellite/overhead-az000.png`, `overhead-az060.png`, `overhead-az120.png`, `overhead-az180.png`, `overhead-az240.png`, `overhead-az300.png` in that same directory | 6 | Dense roof structure remains readable from all six sides, with no isolated bright patch introduced by the roof lift. Dark towers still separate from the lower pale roofscape. The uneven outer apron and road endings remain visible. |
| `sweep/cartographic/plaza-az000.png`, `plaza-az060.png`, `plaza-az120.png`, `plaza-az180.png`, `plaza-az240.png`, `plaza-az300.png` in that same directory | 6 | The existing clean facade families, warm/cool light, signs, controls, trees and ground retain their appearance. No change attributable to photographic grading is visible. |
| `sweep/cartographic/block-az000.png`, `block-az060.png`, `block-az120.png`, `block-az180.png`, `block-az240.png`, `block-az300.png` in that same directory | 6 | Pale roofs and equipment retain structure; facade families remain distinct. The near 060 slab remains an existing geometry/view limitation. No added photo color or roof-glow term reaches Cartographic. |
| `sweep/cartographic/overhead-az000.png`, `overhead-az060.png`, `overhead-az120.png`, `overhead-az180.png`, `overhead-az240.png`, `overhead-az300.png` in that same directory | 6 | The palette, geometry silhouette and rooftop density remain coherent from all six sides. The broad outer apron remains unfinished and is not hidden by this milestone. |
| **Total** | **44** | **44 raw hashes matched; all 44 were inspected natively.** |

The earlier independently inspected 26 paired captures provide the matched before/after evidence for the improvement. This final set establishes that the primary integration reproduces the accepted result across the complete existing appearance gate. It does not create a measured before/after claim at angles that had no matched baseline in this review.

## Source dependencies outside the changed lines

The shared CPU route remains unchanged. `src/scene/facade-textures.ts:199–223` rebuilds only `map` and skips other texture slots; `:270–282` derives alpha signage selection before de-lighting. `src/scene/delight.ts:283–337` changes RGB pointwise and preserves alpha. This preserves sign-mask eligibility, not the exact emitted RGB: source-panel color still uses the corrected map.

The shader selects the Cartographic procedural branch at `src/scene/tile-materials.ts:160–167` and replaces its diffuse color at `:201–226`. The new multiplicative roof treatment is confined to the photographic branch at `:262–287`; its normal fade excludes vertical walls, and it adds no emission term. The unchanged glass proxy at `:263–265` and roughness at `:286` consume the corrected RGB and therefore explain the disclosed dusk highlight change. The unchanged source-panel emission at `:296–307` still requires panel/vertical/alpha eligibility and is disabled by `1.0 - mapsProcedural` for Cartographic. No geometry, texture-size policy, source provenance or simulation interface changed.

## Gates and resources

I read `artifacts/satellite-verification-20260927/gates.json` and the actual `build-escalated.log`, `typecheck.log`, `test-escalated.log`, `audit.log` and `run.log`, rather than accepting the worker summary alone. Final build, types, unit tests, audit and visual gate all pass. Unit evidence is 85 files and 738 tests. The appearance lane reports four passing tests; the lifecycle lane reports three passing tests and produces the three inspected raw records.

The first sandbox build and test invocations failed before loading their configuration because the bundler could not read `../../..` (`Access is denied`). Those failures remain in `build.log` and `test.log`; the actual escalated runs pass. No failing product check was silently reclassified or skipped. Audit passes the repository's high-severity threshold while reporting two moderate advisories through `@vitest/mocker`/Vitest with no available fix. The build retains the existing large-chunk warning. These are reported limitations, not a clean-audit or zero-warning claim.

The final process inventory contains no omitted live process or scoped candidate. The final receipt records no owned survivor and no port-4319 listener; the cleanup record reports exit 0. This reviewer started no browser, GUI, server or GPU process and made no product/data changes. Only the new final report and its evidence JSON were written into the reviewer's ignored directory. They remain needed for the active integration record.

## Unclosed broader criteria

Source blur, atlas stretching, simple/blank geometry, some nearly black roofs, repetitive Cartographic facades, stylized trees, empty streets and the unfinished outer apron remain. The existing whole-scene motion verdict is still `not-established`. Population behavior/performance, a controls-driven whole-deliverable flythrough and final square-boundary acceptance were not part of this tonal review. No claim of complete Shibuya appearance, photoreal street detail or 60-fps population performance follows from this acceptance.

# Final Cartographic frame review for the bounded opening milestone

Independent native visual review by opening_final_cartographic, 2026-09-27. The reviewed primary base is 9d83fa7cb4ef854a05e623e843209581caa93591 plus the four source/test files pinned below. The primary checkout was shared read-only because these are the final integrated capture bytes; writes are confined to this review's report and ledger.

**No new material visual regression found in the 22 certified Cartographic frames. Accept this static surroundings review for the bounded opening milestone.** This does not accept whole-map visual completion. The actual four no-camera-input opening views are a separate review and were not opened here. The standard sweep returns to established poses, so it cannot by itself prove the new default opening composition.

## What I inspected

I personally opened all 22 assigned PNGs individually at native 1280x720 with detail=original, exactly one image per tool call and exactly 22 image calls. I inspected four hero frames (crossing/approach at dusk/noon), six plaza angles, six block angles and six overhead angles. There was no contact-sheet substitute, no additional baseline image call and no thumbnail review. ledger.json was updated after each image with its name, exact SHA-256, native-inspection time and observation. Its final rehash matches every inspected image.

The hero crossing views preserve readable crossing stripes, tactile routes, paving, traffic hardware and tree silhouettes in both lighting states. Cartographic facade/window bands remain consistent. Noon brightens the surfaces without erasing the markings. The approach views retain continuous building massing and distinct roof forms. Dusk and noon are visibly different while the street and building treatment remain coherent.

The plaza sweep retains recognizable crossing structure, signals and varied tree crowns. Its close views still have sparse ground treatment, generic facade/branding repetition and exposed plain surfaces. The near-right box and tactile fragments in plaza-az240 are conspicuous at this pose. These observations are not a claim that close-range city realism is finished.

The block sweep retains coherent massing, rooftops and surfaces. block-az060 is badly obstructed by a near tower face across much of the center-right frame. Several other block angles hide the crossing behind buildings. This is a meaningful existing scenic limitation, not an omitted defect: Review 114 explicitly recorded the same block-az060 obstruction in both styles. I independently compared all eighteen current Cartographic sweep poses with preserved D1 manifest metadata; each recorded azimuth, polar angle and distance is exactly equal. In particular, block-az060 remains azimuth 1.0472, polar 1.28, distance 220 m. I did not inspect new baseline pixels or claim pixel-identical A/B comparison.

The overhead sweep shows continuous dense city massing and coherent exposed cutout edges. I found no newly missing city swath, detached terrain sheet or escaped vegetation. Thin boundary-cut structures remain visible, including the slice near the left edge of overhead-az300. Foreground cropping in several overhead frames is a property of these fixed sweep views, not evidence that the new opening fails to contain the square. Leaf and distant facade fidelity cannot be judged from these aerial scales.

## Open limits retained

The broad pale corridor and adjacent plain surfaces remain visually unfinished, especially in both approach views and the overhead sweep. The source-authority investigation in Review 123 identifies the witnessed corridor as rail; its height/profile treatment remains separate design work. This review does not substitute an inferred new geometry repair for that source-backed work.

The static images do not establish motion quality, temporal stability, simulation, pedestrian/vehicle population, the 1080p performance target, source-photo fidelity or the full flythrough. They do not establish supreme visual quality across the whole 1 km scene. Generic facade repetition, empty streets, close-orbit obstruction and unfinished corridor presentation remain explicit limitations. No repair or recapture is requested for an introduced visual failure in this bounded opening change.

## Exact evidence binding

The current certificate is artifacts/visual/complete.json, SHA-256 d1b912daab055146331f675f72051bff1932f8f26953bf6876db72a6a8fa3113, run 168b8ee35b73fd61, certified 2026-09-27T11:02:12.960Z. It names NVIDIA GeForce RTX 4090, driver 616.64, and the same ANGLE D3D11 renderer for pixels and lifecycle. I verified this certificate hash before viewing and after all 22 inspections.

The final check rehashed the certificate, all 22 images, all four source/test files and all three bundle files: all 30 matched. It read each PNG's dimensions and confirmed 1280x720. Through the existing read-only sceneTreeDigest and harnessTreeDigest exports, I independently re-derived the served-scene digest dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c (117 files, 301782754 bytes) and harness digest 45aeaf15464fbc2a34e0252f3c06b6e8bd44969103aeb65bdd7d21dab53d0593 (24 files, 219520 bytes). Both match this certificate and the preserved D1 certificate. Rehashing at two instants does not detect files changed and restored between those instants.

The preserved D1 certificate is artifacts/opening-integration-20260927/baseline-d1-54606a6f48e528f6/visual/complete.json, SHA-256 6dcf740c367b938bb09acee17c1242930013434f1ba5b41f2f7c10c98089e438. Its metadata supports attribution of the established sweep poses and known obstruction; Review 114's substantive observations are clearly distinguished from my inspection of the new final frames.

I read the actual four-file diff. Its product change is the initial camera distance/polar setting and the flythrough's shared initial-pose reference. It contains no facade, tree, terrain, road or corridor material edit. Detailed source/CPU acceptance and the new opening's four actual loads belong to the separate source/opening reviewer. I repeated no build, unit, audit, visual, browser or GPU gate; supplied gate success is not represented as a gate run by this reviewer.

| Reviewed source/test file | SHA-256 |
| --- | --- |
| `src/render/camera.ts` | `0529a16ff037d98f9305f6523b8adc649d7d9191b19309123b687f138b6ceec1` |
| `tools/flythrough/plan.ts` | `79704b3d0c73b4ff1133a8f6a1b76a8ed53643084fd386a8aed02b70c044292d` |
| `test/camera-rest.test.ts` | `2aa540b9a3b53aae5f283e0b2192120709fd768593413252540894f8100886d1` |
| `test/flythrough-plan.test.ts` | `445ca25c15fcd5ee971de000edc01bbca39361080b8989126f09b27050faa28d` |

All frame paths below are relative to artifacts/visual/. Each row was inspected separately at native resolution and rehashed unchanged.

| Native frame | SHA-256 |
| --- | --- |
| `hero/hero-cartographic-dusk-crossing.png` | `a3a123bced0285b0da2c768df3a6dd6479de1512155146f72a02136d938e2a26` |
| `hero/hero-cartographic-dusk-approach.png` | `9d603e6f639d6fa425fe348a922db1171b6e3c5f4346c34164c0da7f4ed486e5` |
| `hero/hero-cartographic-noon-crossing.png` | `c64cac80f379c2c21955ee73ca5885c0cedd8db1fa09160ad491f53e804fd982` |
| `hero/hero-cartographic-noon-approach.png` | `5bc6e18f01adcbcbd7a2e9caaccc97c634e2e33f1ea44db1b83fab8d600e3ac3` |
| `sweep/cartographic/plaza-az000.png` | `fd1ca63c486a3cfc7c09044d4897fa74621fb5f14535b77f9c45b0ae0d8b26e6` |
| `sweep/cartographic/plaza-az060.png` | `9783a3badacd067b8c1f024ac767803af6e5cfc4ef699103065509dd2226e5ee` |
| `sweep/cartographic/plaza-az120.png` | `d6c8ac925f7f2b46de97706c3021a7a10309eadc546bc3b4f3e5a0cbe123361a` |
| `sweep/cartographic/plaza-az180.png` | `bcb7245240c400a3eb92327bec89dfc415d78c9565cbc1cb1f26414750c279dd` |
| `sweep/cartographic/plaza-az240.png` | `d9ae135e148f61a604e48d4df79d1454698ff85c3deba168097e55b152a5631a` |
| `sweep/cartographic/plaza-az300.png` | `557b6410642579786608a1ba34b4b21a7d702683f8b556edd47e5f9b2e5e504f` |
| `sweep/cartographic/block-az000.png` | `6203fb6b52d7f4a8079e93718114970a8b3355a21fa41ea155f9509c47fe5651` |
| `sweep/cartographic/block-az060.png` | `7f9f7c31b3790e35dd3eb0447cd5c1bde30668051c799b85d882537ead109e10` |
| `sweep/cartographic/block-az120.png` | `328b672d72b039bb5808188eab2d8029544cd711fac17641cef442f26de12b01` |
| `sweep/cartographic/block-az180.png` | `a0cade263cd8feb590d6d6a18373c91785a3eeb118dd3b2819cf02e7cc31e07f` |
| `sweep/cartographic/block-az240.png` | `53c36d36ffc3e8f5ceabb32d7a9d77afad6c853e98171a80c0b9e2d04c5a30d8` |
| `sweep/cartographic/block-az300.png` | `f93ed0a987355942a235e9791a4011508c6adce0d2fb753353b80b0d98e8e7e1` |
| `sweep/cartographic/overhead-az000.png` | `c1a03b14eff0f6f39c052776c2a799f70c4867759cd0e886ce92a78a120a17f9` |
| `sweep/cartographic/overhead-az060.png` | `e9bd98b1c28935ce6f02be82d4f8e99a4ef6aa99123fb175ae5435e764786a74` |
| `sweep/cartographic/overhead-az120.png` | `8fc3e1c5c6588003441d904e6397299b7be2b7b18e529d6f8998f7d49e5c0687` |
| `sweep/cartographic/overhead-az180.png` | `d081a5355496fe3f467a6716856bcadb98083d931ac353c746a349ddb7d01bd0` |
| `sweep/cartographic/overhead-az240.png` | `a538d94b973f40373ea85a2881248df5abd19210b05ea49ca3db1a1a604a5e85` |
| `sweep/cartographic/overhead-az300.png` | `e380a3e6f697543a22e4e5892122b7a4bb0acc512c0ea4b6f7905471b1c621d3` |
## Resources and handoff

I launched no browser, GUI, server, GPU capture or test gate. The first sandboxed process query was denied; an elevated read-only query then found zero browser/GUI processes carrying this review directory's ownership marker. No process was terminated. The verification owner's retained cleanup receipt reports empty survivor, unadmitted, scoped-live, listener and foreign-predating arrays; this is that owner's capture cleanup evidence, not a browser process launched here.

Only REPORT.md and ledger.json were created in this review directory and both remain needed for the integration owner's handoff. No product, data, build or Git state was changed. The integration owner owns promotion of this authored review into the permanent work record and final acceptance/integration. This review has no open introduced-regression finding within its stated bound.
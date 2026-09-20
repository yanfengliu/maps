# Review 38: implementation

## Target

The primary checkout's 44-frame visual certificate for the certificate-location guard increment, based on `244632ca8d88dc464a162fad3782baa91f59f136` plus the uncommitted guard. This is a review of captured image bytes, not a code review. Run `d11360e0649ffb15` completed at `2026-09-19T23:57:59.759Z` on the NVIDIA GeForce RTX 4090, driver `616.64`. Certificate: `artifacts/visual/complete.json`, SHA-256 `fdf02dfdc0fca9e06024bfd356ab4484d8067269f6d850281b1259d8db75bd3b`.

The certificate binds scene digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c` and harness digest `45aeaf15464fbc2a34e0252f3c06b6e8bd44969103aeb65bdd7d21dab53d0593`. The raw inspection record is `artifacts/visual-sweep-review/review-manifest.json`, SHA-256 `b5e1b7df2f0641218dc4ef469f7361aa061acaec0f84b94fedfb2de8a918a6ed`. The source frames remain under `artifacts/visual/`; these paths are intentionally retained review evidence.

## Reviewers and coverage

Codex `visual_sweep` independently opened all 36 sweep frames with `view_image(detail: original)`, one image per inspection, at their native 1280 by 720 pixels. Coverage is two styles, three distances and six azimuths. Every sweep digest matched the completed certificate before inspection. A second hash pass found the certificate and all 44 frames unchanged after inspection.

The Codex root integration owner inspected the eight hero frames separately and supplied the attributed report below. The sweep reviewer did not inspect those eight images or infer their acceptance from the manifest. The root is not identified as an independent code reviewer.

No browser, server, GPU task, data writer, build or automated product gate was launched by this review lane. No contact sheet, thumbnail or generated crop was used as an inspection substitute.

## Reports

### Codex visual_sweep — independent sweep review

No blocking still-image finding for this certificate-only increment. Cartographic frames retain pale building forms, clear window rhythm and distinct road/pavement surfaces. Satellite frames retain photographic facades, stronger light pools and darker exposed streets. Building volumes and the visible road/ground patches remain coherent across the 36 images; no obvious large missing city section or sky-colored interior ground void is visible.

Material classifications come from the image itself: crossing bars on dark continuous strips identify the road, rectangular joints identify paving, wall/window patterns and elevated edges identify facades and roofs. No crop-region label was used to identify a surface. The block views predominantly contain roofscape and facades, not near pavement.

The native stills also preserve visible quality limits. Satellite facades range from readable signage to stretched or blurred imagery, and strong glare or shadow hides fine detail. In both `block-az060.png` views, the close facade across much of the right half obscures the streets behind it. Overhead frames expose the finite scene boundary and terrain shading, but cannot resolve small support or paint errors. These observations do not establish a new regression because this review did not compare a prior frame set.

A thin pale diagonal line is visible across the foreground tiles in both `plaza-az060.png` styles, approximately from pixel `(518,424)` toward `(1000,719)`. It is a minor paving-seam observation at this scale; no open void is visible there. The bright curb-edge slivers in `plaza-az240.png` are similarly too small for a physical-contact conclusion from the stills. Neither observation blocks this certificate guard increment or establishes a temporal artifact.

Every table row was inspected. The verdict for every sweep row is **no blocking still-image finding**, subject to its stated observation and the bounds above.

| Frame relative to artifacts/visual | SHA-256 of inspected bytes | Native inspection observation |
| --- | --- | --- |
| `sweep/satellite/plaza-az000.png` | `cbd62522fce1aad0851651e0991d0f01db249bdebf699ae04ab5da87a241539d` | Crossing bars, dark asphalt and tiled pavement remain distinct; photographic facades show source softness and glare, while near asphalt grain is subdued. |
| `sweep/satellite/plaza-az060.png` | `18c480850d119369fdca8cfab8c7a9216d688a6e4809c7aafc998b2aa6b2680d` | Foreground tiles, central tree and crossing remain coherent; the same fine diagonal paving seam is visible and bright left road glare suppresses local detail. |
| `sweep/satellite/plaza-az120.png` | `5c159c2166e429a4d974896bc660bcb2df148b3aa4cb351bb5c4f06edee8f070` | Raised curb, foreground ground and crossing remain continuous; bright light pools obscure some road detail, and facade texture is visibly stretched/soft. |
| `sweep/satellite/plaza-az180.png` | `7759f6939edd9f7797fc4e3fc23895d49558424a8bb67b8bca5b5289a06cdc50` | Dark foreground ground retains a visible edge against raised tiled pavement; crossing and building bases remain continuous despite low facade detail. |
| `sweep/satellite/plaza-az240.png` | `006ad25761ffc1495d87c32b62ca98eb712ffcb2e0f69ac6f68dd603f70f0e9a` | Tiled pavement, yellow bands and signal pole are visible; nearby right facade is strongly blurred, while the road junction remains coherent. |
| `sweep/satellite/plaza-az300.png` | `437ae6e3db92bde3ea5b0056a8a2cd01ccba589ad8adcb0442cb2dcebadeda47` | Crossing bars, tiled near field and photographic building fronts remain legible; light pools and soft source imagery limit texture judgment. |
| `sweep/satellite/block-az000.png` | `307fa9dfc449d4a9089f114d49d7c0bb5aff48223cf8ac970dc3966ed934883b` | Textured roofscape and crossing remain coherent; dark near roof faces are continuous but suppress fine surface detail. |
| `sweep/satellite/block-az060.png` | `dc619073177aa5e156628f46686b8f6167d900b56f967f757b304d05b30b2f75` | Large dark near facade dominates the right half and hides streets; remaining roofscape and crossing are coherent, with low local detail on the near face. |
| `sweep/satellite/block-az120.png` | `138ccea94c7dd0c9a585ce0c96693c342b4b572362347a2d05d9b1169c9d8a0f` | Rounded and stepped foreground building forms remain continuous; shadowed textures are soft, and only small street patches are exposed. |
| `sweep/satellite/block-az180.png` | `03eae84f181ce941f68e9beec2c0791dcbff88bcd349ab957394ea651c9c6ce8` | Stepped roofs and left street canyon remain continuous; broad shadowed facades are low-detail, with no obvious missing building volume. |
| `sweep/satellite/block-az240.png` | `429ce8ec7611344a641a50b585e84ad025fb74e0ca513f9f714f6fa7efa7c1d4` | Dense roofs and narrow central street are coherent; source facades vary greatly in sharpness and include large nearly plain walls. |
| `sweep/satellite/block-az300.png` | `46e297ff0dbcd6b05159b7a887d7599ef552631362fdd22b540eb1c3420d1dd7` | Continuous roof volumes and deep canyon remain visible; very dark side faces and foreground facade softness limit fine-detail judgment. |
| `sweep/satellite/overhead-az000.png` | `214a915f4cc003c80951296fd18bd43ad11e8424cf2f3d6d8323d040e185439f` | Whole district, dark road network and textured roofs are present; lighting reduces terrain contrast but no obvious large interior sky-colored void is visible. |
| `sweep/satellite/overhead-az060.png` | `46035a5a52bc62beb126aae79540f724349f175a997c61ca14ee2737fb6c4b68` | Rotated district, towers and perimeter ground remain coherent; dusk shadow lowers small-feature legibility across the left and centre. |
| `sweep/satellite/overhead-az120.png` | `05ad771fc21bc8248ccfc3177c4d7ba112bd0b2e37340c9f5bcee481e5d35983` | Station corridor, roofscape and exposed terrain remain continuous at district scale; fine road support cannot be resolved under this distance and darkness. |
| `sweep/satellite/overhead-az180.png` | `9c46bc2620521fde9eab6d69e651258e8852b95fa3ba9b1c317c110a027a180f` | Station corridor and broad city footprint remain coherent; roofs and major roads are visible despite reduced dusk contrast. |
| `sweep/satellite/overhead-az240.png` | `4b409a7883f4cf7ccc372a5b92ce29de2459f794f0182e8f1ce633f0510ff693` | Towers, central crossing and outer terrain read continuously at district scale; small contact errors would be unresolved. |
| `sweep/satellite/overhead-az300.png` | `4b03c1e980f18940f8bc72a9f3968e45ed45a1415acac0e7e1a9359f54744fe9` | Dense photographic roofscape and road pattern remain continuous; finite scene edge and dark outer terrain are visible without an obvious large interior void. |
| `sweep/cartographic/plaza-az000.png` | `5f970445eadf701b699cffc21cfbfe622238d31cd22493b7a73cc9c8a6a83d2c` | Textured asphalt, painted crossing bars and right tiled pavement are visible; road and building bases read continuously. |
| `sweep/cartographic/plaza-az060.png` | `c2065c5ea740b617ba8f98b6afa1a4de32461d8009aa8e0dc48656d719524ced` | Tiled foreground pavement, central tree and crossing read clearly; a thin pale diagonal seam crosses the tiles from about (518,424) toward (1000,719), with no open void visible. |
| `sweep/cartographic/plaza-az120.png` | `85e810acc76494d539e3917e1dd6e9ed2849996a35a4cea699715a97c6778a4e` | Paved crossing and curb separate the streets from the light foreground ground; bases and road junction remain coherent. |
| `sweep/cartographic/plaza-az180.png` | `f7101abed51cf36a895f508d4668d37109b1b9e628bd985405ab150635aa3f7b` | Crossing, raised curb and tiled pavement remain continuous around the light foreground ground; no large support gap is visible. |
| `sweep/cartographic/plaza-az240.png` | `7848d4e6d898eb9179e2720511b4b95e0fe3e97c3cc63472dbd9431ddf20b25d` | Foreground pavement and yellow bands, signal pole and pale building fronts read clearly; bright curb-edge slivers remain a small local presentation detail. |
| `sweep/cartographic/plaza-az300.png` | `784ecb97035fd16a095b173b9a196227ada500edddcd00c354c662c64fb1cd7d` | Wide tiled foreground and adjoining asphalt are distinct; crossings, building bases and tree trunks remain visually supported. |
| `sweep/cartographic/block-az000.png` | `94d3d1c5f63143dbebe7e2d0cd12b287bd8c16847c53244e14730def25d9642f` | Elevated roofscape and crossing remain legible; near roofs and walls are continuous, with limited visible ground. |
| `sweep/cartographic/block-az060.png` | `cc6c601642a2c81d311f5d7eca9bbecc0bad07e81806214c3f2bc24102e41d4b` | A close facade occludes much of the right half; exposed roofscape and crossing read continuously, but hidden streets cannot be judged. |
| `sweep/cartographic/block-az120.png` | `a39b5af56c00a548069d096daca447c31554e707ed1a7d1f9438e9e25d4bcb4e` | Rounded foreground building and stepped roofs read as continuous volumes; distant small ground patches limit support judgments. |
| `sweep/cartographic/block-az180.png` | `b69a0eaa945e527d677eeaab1001e5d10e90d375cd4821fb897c2e4b0cfcc80f` | Dense stepped roof volumes and narrow street canyon remain coherent; facade lighting preserves edges without a large missing surface. |
| `sweep/cartographic/block-az240.png` | `3859743d8cd763ea58fa18e309c00017d114fdfdb14c15b00121caa50fed53fa` | Roofscape, narrow central street and distant towers retain continuous silhouettes; pale lit facades remain distinguishable. |
| `sweep/cartographic/block-az300.png` | `c931e4c2c00b46daea60c5b4fc3ed6b7a9908c97cb825ea1bf38ef94b22a9232` | Near tower and canyon walls are continuous; most foreground content is roofs or facades, not inspectable pavement. |
| `sweep/cartographic/overhead-az000.png` | `089531a90e2a1adbea7229274f4da0cfc06b6dc3f71eeda78f4c9ab35f62a25a` | Full district remains populated with building volumes and connected visible roads; exposed perimeter ground is textured and the finite scene edge is visible. |
| `sweep/cartographic/overhead-az060.png` | `71c31c8a8d3a51b260fe95c471988f06447fc54626c4acd1b47d02e3ca4b474a` | Rotated district footprint, terrain perimeter and central crossing remain coherent; fine road contact is below reliable still-image judgment here. |
| `sweep/cartographic/overhead-az120.png` | `0f6243a24210905ea3f2c1f4731c6b505cec729a2600ce05cabd15ccaaf52328` | Continuous broad ground and dense roofscape remain visible across the rotated footprint; no obvious large sky-colored interior void is apparent. |
| `sweep/cartographic/overhead-az180.png` | `c007f4eb278252bea20b5402cca4bc0c3a53e4556ec125f4ce0ce7e744420746` | Station corridor, towers, roofscape and exposed terrain remain coherent; visible dark corridors read as streets or shade rather than missing sky-colored ground. |
| `sweep/cartographic/overhead-az240.png` | `a20310721e1d1366a2578f80231794b396a8cbd88bd96e914ec80d2805f56e74` | Bright roofscape and outer road network remain continuous at district scale; no obvious large interior terrain hole is visible. |
| `sweep/cartographic/overhead-az300.png` | `4c5aae76ecf1c3a63303c2977f46a4bbbaf5f8cbbce52c9f9e28674d5a6cd447` | District-scale street pattern, major towers and terrain edge remain coherent; fine support and markings cannot be certified at this distance. |

### Codex root integration owner — hero review, supplied separately

Root inspected all eight hero PNGs for run `d11360e0649ffb15` with `view_image(detail: original)`, native 1280 by 720, and independently verified every hero SHA against certificate `fdf02dfdc0fca9e06024bfd356ab4484d8067269f6d850281b1259d8db75bd3b`. No blocking still-image finding: crossing road/pavement and visible building forms are continuous in both presets; expected style distinction, lighting, signage and dropdown are present. Photographic facades retain source blur/warping and distant detail limits; approach foreground is largely roof geometry. This review makes no claim about pedestrian/vehicle motion, flicker, west-approach authored paint legibility or full deliverable acceptance.

The root's eight-frame inspected record follows. These hashes were read from the certificate and independently rechecked by the sweep lane after the root's supplied review.

| Frame relative to artifacts/visual | SHA-256 of inspected bytes | Root verdict |
| --- | --- | --- |
| `hero/hero-satellite-dusk-crossing.png` | `3be647b1c6efbfaa2bb7fca34e80601f8026b3d1a4eb6a7dc5fe367b203954e8` | No blocking still-image finding. |
| `hero/hero-satellite-dusk-approach.png` | `e0a4d0d910404a20cd8922202686ebac8d13ce2193da69822ccd2e5f7b156d7d` | No blocking still-image finding. |
| `hero/hero-satellite-noon-crossing.png` | `2ce5c4a77d381e540c7a5d4d8d7b3358b4cf36116173e1c54de241150875eaf5` | No blocking still-image finding. |
| `hero/hero-satellite-noon-approach.png` | `3f17623a59022ce950a0a1659ffeeb217dc446e6a1a137d08576f07175138ff8` | No blocking still-image finding. |
| `hero/hero-cartographic-dusk-crossing.png` | `015ad4123a21ad4780b0b44c1d796bad73720d53474443405252fa7c04a4a800` | No blocking still-image finding. |
| `hero/hero-cartographic-dusk-approach.png` | `6f617d05b03fa190b736f583cd8e9345455337da3f11c23b99ff2afa5032b4b2` | No blocking still-image finding. |
| `hero/hero-cartographic-noon-crossing.png` | `5b82db2cae812c1f9120fb7ef1537835fab971f9669706f5b81265ef86fa7465` | No blocking still-image finding. |
| `hero/hero-cartographic-noon-approach.png` | `c3c220d16e7726ebabd5ed1054c52cd3e7843e82ed6371986ebe7ae832dc3b72` | No blocking still-image finding. |

## Findings and disposition

No blocking image finding was raised by either reviewer. The fine paving line, low-detail photographic facades, exposure limits and occluded streets remain disclosed observations and coverage bounds. They are not recorded as corrected, as proof of physical support, or as a new regression. Integration acceptance remains with the root owner.

## Verification

The sweep lane verified 36 of 36 PNG dimensions as 1280 by 720 and all 36 hashes against the final certificate before native inspection. After both reviewers finished, the certificate hash and all 44 frame hashes still matched. All 36 sweep images were opened individually with original detail. The root reports equivalent native inspection and digest verification for all eight hero images.

This lane did not run build, types, unit tests, audit or the visual gate; those gates belong to the integration owner's separate evidence. Still images do not establish camera-control behavior, motion or flicker, collision or contact safety, population fidelity, frame rate, fine hidden paint, geographic correctness, or full Shibuya acceptance. A screenshot of an empty scene cannot accept the population deliverable.

## Round outcome

The 36 sweep frames and the root's eight hero frames have native still-image review bound to this certificate's exact bytes. No blocking still-image finding remains for the certificate-location guard increment. Code acceptance, integration, merge and broader deliverable acceptance are outside this review lane.

# 1534 - Peripheral exploration

2026-10-17. Source-read-only PRIMARY main0bae7fe; certified executable e1097ed. No source/data/config changes, build, gates, dependency work or retry. One headless RTX4090/D3D11 run,1280x720/DPR1,04:07:35.052-04:08:42.628UTC (67.576wall seconds), inside240s total/30s cleanup reserve. Existing walk1530 supervisor/process-safety and OrbitDriver/pan/view helpers were reused. Camera movement used real pointer/wheel input; harness reads were frozen.

Held-out exploration seed153420261017 normalizes to3096405657. RNG draws [.8805231107398868,.7263085485901684,.618742962135002] select [236.416,-189.052], snapped to ground lane96369000 cut2/cut1 midpoint: actual target[225.961978,15.2,-171.630125],283.753m from crossing. Ordinary application seed5970698 is unchanged. Target terrain is20.439m; controls retain targetY15.2. Street polar derives from local camera terrain; actual clearance2.200004m.

Three peripheral originals in ignored artifacts/peripheral1534/run1/payload/, inspected natively. Full poses/hashes:frames.json SHA-256 db0f01b60f0bfe9f2d482acae0ef3e0b3d270bfe8f4f1aa4e14201e8f0cd0b0d.

| Original | Actual camera XYZ; azimuth/polar; distance | SHA-256 |
| --- | --- | --- |
| street.png | [225.962,22.853,-195.430];-3.141593/1.259695;25m | 5763c404e4b31c9acb3a1a1c167fb891382b498aebc649fb3bcb7a355d39bcf5 |
| block.png | [259.913,63.125,-264.638];2.791593/1.120000;110m | 479f13630d926e028f59cadabab199320f69829b8b8e7cc9206aa9ac05c73dce |
| elevated.png | [146.427,200.038,-336.279];-2.691593/.780000;260m | 3f8d860877968ae61776291728d28d5d4cf8c5a63960b5dd0d3bcfee077ed60d |

Street shows a narrow ground corridor, large plain wall and faint diagonal ground line; block shows soft photographic facades; elevated shows roofs, marked roads and rail. The ground line authenticity and geometry/material cause are unknown. Independent [1535](1535_peripheral-native-review.md): NO SAFE FIX QUALIFIED. Soft photos do not prove missing geometry. No motion, whole-map, contact or performance acceptance follows.

Instrument FAIL:120 actual served path/body hashes passed; three response.body reads failed after Chromium inspector-cache eviction. Their URLs were not retained and are UNKNOWN. Actual HTML, mainJS, CSS and walkJS bodies match the certificate. No full served-scene PASS. capture.json retains successful rows, failure and322 unchanged before/after source/dist/cache/harness pins. Certificate9ac73dde... and current156-file scene/harness/build/GPU checks matched before/after.

Root authorized one same-page attribution-open original plus DOM/text/hrefs/bounds after real open/close;1536 owns A12 judgment. No extra camera/run. Normal page/context/browser/browser-server/preview/esbuild cleanup succeeded. Fresh04:09:30UTC census:zero owned survivors/4319 listeners. Exact external TEMP removed after nonlink checks. Receipt:run1/temporary-cleanup.json SHA-256 bb4f46e8d6fa2f2bf7c91f7541b01b3af87047ffedc7202913e7087b7874ad13. User gallery untouched.

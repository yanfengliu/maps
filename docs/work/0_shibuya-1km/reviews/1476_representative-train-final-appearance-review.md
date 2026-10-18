# 1476 — final representative-train appearance review

2026-10-17. Independent reviewer: train1473_final_visual_review. Result: HOLD for one material regression in ordinary Satellite edge quality. All 24 released originals were opened individually at native 1280×720, in batches of at most three. No contact sheet, thumbnail, new capture, browser, server, test or gate substitutes for that inspection.

The reviewed candidate is the nine frozen paths integrated on primary base ea98b89, still uncommitted at review. Candidate-freeze SHA-256 c36361749b9952f9c39c62880aa101bf02a9eda00c64648d231d9b1418249be8 and all nine current raw source hashes were checked again before this report was saved. Independent full source and 29-frame targeted train-passage review belong to the separate reviewer; this review does not repeat or enlarge those claims.

Final visual run ee8d31ba8462842f started 2026-10-17T23:10:32.148Z, completed 23:16:27.324Z and certified at 23:16:27.378Z. The released complete.json SHA-256 is a5539c6d47f43c3adcc8dc238175495041b3e0585f156e826e1e828ac9c7af21. It lists 44 frames and the RTX 4090 Direct3D11 renderer. The gate owner reports five public gates PASS, three successful hardware lifecycles and cleanup closure. Those checks do not establish visual quality; this HOLD is compatible with their narrower passes.

## Material finding

P2 — Preserve world-edge quality while the train moves. The final hero/hero-satellite-dusk-crossing.png, SHA-256 199e7f1feda40e4ef81d3981896f28be07541bf40749c0f95cc9873c6da37fe4, shows conspicuous jagged/broken white stripe edges and interference patterns across the left and central crossing and the receding western street. These are visibly rougher than the corresponding retained lifetime crossing, artifacts/visual-gallery/images/current-lifetime-world.png, SHA-256 ff28bbc5ac0bf128bd1cb9f2783e1ff570ec7f95ffe0e636ce38c423aa696793. The broad composition, buildings and illumination align. Similar fine-line roughness is present in the current plaza sweep, especially plaza-az000.png and plaza-az060.png. This weakens the ordinary crossing view even when the northern train is concealed.

The integration at src/app.ts:244 adds the train-moving condition to the stillness predicate. All four final Satellite hero observations report taaAccumulating=false and taaSamples=0 before their screenshots; the manifests expressly label those as pre-screenshot observations, not convergence assertions. This is consistent with the visible loss of edge smoothing. It is not a controlled causal A/B experiment, and this review does not authorize enabling static accumulation on moving geometry. Resolve the background edge-quality regression with a motion-safe rendering choice and obtain affected native comparison before adoption. Root independently agrees with the material regression and holds the merge.

Comparison precision: the current dusk crossing camera is position (31.740096521655598,18.38318508960545,31.740096521655623), target (0,15.199999999999998,0), azimuth 0.785398163397448, polar 1.4999997567486896 and distance 45.0000013524746 m. The retained gallery record identifies the previous image as the same named dusk hero crossing from adopted 59fbb1ce7fedaaa9e43d6747fb35994790d093b5 and run 5addbb3d1eb59de0. The gallery and artifacts/lifetime1463/root-native-before.json retain its identity, digest and dimensions, but no numerical camera. Exact prior pose equality is therefore unavailable in the inspected retained metadata; the comparison is the same named, visibly aligned view, not a claim of bit-identical camera telemetry. The older approach baseline is contextual only.

## Remaining observations and bounds

No other new material geometry, lighting, missing-texture, camera or rail-context regression was found in the 24 inspected originals. The broad world remains recognizable across all six azimuths and three distances. Dusk signage and storefront lighting remain readable; noon has distinct daylight illumination. Both actual Cartographic return frames show the returned style and coherent geometry, which supports basic shared-rendering inspection only.

Blurred photographic facades, baked lighting, limited facade depth and the sparse ordinary street population are existing quality limits already visible in the retained context or recorded in the current plan. The current plaza-az180 view looks through the storefront interior and block-az060 is heavily occluded by a nearby building; these samples cannot establish camera/building clearance, and no same-pose old originals were inspected to classify those conditions as newly introduced. Broad aerial presence does not establish every surface or road is correct.

This review covers all 22 certified Satellite originals plus the two actual style-return originals outside the certified 44. Detailed inspection of the 20 remaining Cartographic static originals is deferred under the local rules. Sparse stills establish neither temporal crawl/flicker nor fluid train motion, whole-route clearance, population behavior or FPS. A static appearance pass would not itself establish train passage. All 35 implementation items retain their recorded bounds and all 14 final acceptance criteria remain OPEN. With the material edge-quality finding unresolved, integrated appearance acceptance is HOLD.

## Inspected-byte record

All paths below were opened once at original size in this review and their actual SHA-256 and 1280×720 PNG dimensions were rechecked after inspection. The first 22 belong to complete.json.frames; the final two belong to hero.json.styleReturns and are outside the certified 44.
| Inspected original under artifacts/visual/ | SHA-256 |
| --- | --- |
| hero/hero-satellite-dusk-crossing.png | 199e7f1feda40e4ef81d3981896f28be07541bf40749c0f95cc9873c6da37fe4 |
| hero/hero-satellite-dusk-approach.png | cc16543fbc7fa18479347ef05f64ae19bfa26dffe1ea4ff4c6453c0836633d1e |
| hero/hero-satellite-noon-crossing.png | bc37d86d05977eaaf922e5316a0e883f8be6c8f688c2ba273c103b21b3af2d7e |
| hero/hero-satellite-noon-approach.png | cb37b2f6f93be15e9a95a17fd3a115a7e7b4487474dd5b63b4db0f631358b631 |
| sweep/satellite/plaza-az000.png | edd341bff256a4011091d4a740d5257492273a25b457d3c6c27b3013cc1c8389 |
| sweep/satellite/plaza-az060.png | 15433dc8531486c280b5541d19d4215596a68007d6f50eec15478fa4ab6b1b37 |
| sweep/satellite/plaza-az120.png | c384c43dae3f116ad15349457e0329cfd51e6e4ec41ea020fec6134f4d0d5792 |
| sweep/satellite/plaza-az180.png | d6215ba32c8b25e1a71c5ae175e9775d87faa79bc93cda1d00207ee27c763e79 |
| sweep/satellite/plaza-az240.png | 790bb3799df61e964a0521107e921b6c41b0ee8facd41c9a454ca9f19503fed4 |
| sweep/satellite/plaza-az300.png | 5bba233639eb0d52d602d87591d32450d512c3704ecaa85b5f8f5c0e8ff71d6d |
| sweep/satellite/block-az000.png | 331ba778d39d857434cc9e18f219a9ffd4b39c80ce17a234961aa5bd0a94cce3 |
| sweep/satellite/block-az060.png | c4d72d4376143e9193fd9e0cb6347efaf02fa8fa348d41c28c265ff43e196d12 |
| sweep/satellite/block-az120.png | edf51bd1c901b3db66906c1f0f8c4271a9ed1e3fe04148d0b17657e7954e6d1d |
| sweep/satellite/block-az180.png | b8af803360e634bbaafaaa7eeff2bf8da08a8fe86e417bd1abdd8195943adbbb |
| sweep/satellite/block-az240.png | b1323f55fbde576dacda3bcf17b4da014c7f29e1271885b631c5d64b000bcf89 |
| sweep/satellite/block-az300.png | 730a4d323c0da6672401617c4c6d34c0e4d5a773dba9481e63dbb741f5d52194 |
| sweep/satellite/overhead-az000.png | 8aa2f037aa3384ea578b2f44265d5f554b2f500a4cbc7985d78bf7ee76d74b8e |
| sweep/satellite/overhead-az060.png | c1acd43b41eeb6fd54d89c8915c9672b799cecd6dd30437931695b3f9bfe8dee |
| sweep/satellite/overhead-az120.png | a926200f7911e3ef842d8433743d887016e3a7ceb51fd701ebe01ac613067130 |
| sweep/satellite/overhead-az180.png | 04492dad3a5ac2cdd2abf6804190cd8f9e3fa1385a99ca2cf7e2fb2e032b81e7 |
| sweep/satellite/overhead-az240.png | 6cfb59b8445e17de5006dacf58a30f7a76e8645023e47a4bafbc80692b395274 |
| sweep/satellite/overhead-az300.png | f476d2721eac40105e1bc130be8442386ffce835ce2225e8d83937f74e2d1135 |
| style-return/return-cartographic-dusk.png | 10f5689698951cd2aff6fde59ea03f1342c1d6f60ad48fdbcfd5e95b10f4360e |
| style-return/return-cartographic-noon.png | 87a68a79a26506ff48fe55ad00f0ed77fe601d30716f49658620705df9aaf0fe |

The two retained baseline originals were also opened at native 1280×720 before release:

| Baseline under artifacts/visual-gallery/images/ | SHA-256 |
| --- | --- |
| current-lifetime-world.png | ff28bbc5ac0bf128bd1cb9f2783e1ff570ec7f95ffe0e636ce38c423aa696793 |
| adopted-world.png | 22d3d0924bb70164077e1a1d1a5086bd4e29b48644aff87e6b99f270e0fe1516 |

No source, index, commit, gallery or rendering output was changed by this reviewer. Only this ignored authored report was written for root to adopt. No task-owned browser, GUI or server process was launched.

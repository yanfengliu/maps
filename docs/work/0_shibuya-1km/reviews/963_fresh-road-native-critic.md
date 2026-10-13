# 963 — fresh native road critic

2026-10-13. Independent visual review of the 955 edge-pair pilot. Verdict: **ADMIT to broader fixed/block/held-out/noon qualification only.** The visible gain is modest but useful: the paired edge paint makes this dark side-street corridor more legible. This review does not accept adoption or map-wide completion.

I opened A1 and B1 separately with `view_image` at original 1280×720 resolution before receiving the root verdict or reading earlier review reports. The reviewed originals are `artifacts/corridor956-preparation/run-956-b2aa745f904f4ae086fdfdce5175052f/originals/{A1,B1}/dusk-side-street-ground-seeded-close.png`. Actual file hashes matched both before and after inspection:

| Arm | Bytes | SHA-256 |
| --- | ---: | --- |
| A1 | 1,268,068 | `5f8d79d2227c2f8c52776be2c648fe60531379452abee4cf8477ca5fa1b9f52b` |
| B1 | 1,272,468 | `a1ff35d7a916cf239e9315115a042a9d27a98ca2f37d7a66de31204828ff2440` |

In A1, the roadway between the buildings reads mainly as an uninterrupted dark surface bounded by broad grey pavement. In B1, the two pale lines establish a continuous narrow corridor from the upper junction toward the foreground: approximately x713→674 on the left and x936→981 on the right, beginning around y259 and y240 respectively and leaving the bottom of the frame. Their perspective follows the visible road edges. Although only a few pixels wide, both are readable against the asphalt and add structure across most of the visible street length.

The upper visible ends remain separated from the zebra stripes around y164–216. They do not visibly cross stripes or spill onto the grey pavement. The left line disappears behind the tree crowns near y315, y460 and y665 and resumes cleanly; the right line stays clear of the trees on the opposite pavement. No bright lump, doubled seam, floating segment or material overlap is visible at the inspected ends or occlusions. The crossing stripes, building silhouettes, facade textures and trees show no material surrounding regression between these frames.

The improvement remains paint-only. The broad asphalt and pavement surfaces are still visually uniform, and the soft facade textures and lighting still dominate the scene's synthetic appearance. These lines support further qualification because they improve the road's visible organization; they do not establish realistic road texture, lighting or street activity.

The assignment supplies the positive 961 run provenance and the pilot's finite support: 26 edges / 93.179 m, 0.15 m width, 0.25 m inset, one static geometry/material, a retained source gap and omitted short source component. I performed no source, runtime, gate, process or performance inspection. This held dusk frame pair cannot judge motion, frame rate, startup cost, other road shapes, noon appearance or the whole 1 km scene. The reported 548,608 constructor triangle visits do not establish elapsed startup cost. Admission concerns further visual assessment only.

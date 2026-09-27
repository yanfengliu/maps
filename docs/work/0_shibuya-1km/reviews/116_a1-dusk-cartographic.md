# Dusk cartographic native static review

Date: 2026-09-27. Reviewer: a1_dusk_cartographic. Observed main revision: 13ef7e83c56202a17aa56975ef5786825bfcff2f. Read-only review of nine original 1280x720 PNGs; all nine opened individually through view_image with detail original. Source images were not transformed.

## Bound and verdict

The nine PNG hashes match artifacts/final-flythrough-prep-20260927/run-01/bound-complete.json, SHA-256 6590318e3a64fe9869c42d6f4d8e23987daa79a558712d0a41d4c23c90fda077. inputs.json, binding.json and LEDGER.md carry the per-frame identity and observations. Root independently owns the broader build/scene/harness/GPU binding; this reviewer checked the nine image bindings only.

Bounded static verdict: no confirmed material geometry/surface-continuity failure or wall-blocked view in these nine images. The crossing, roofscape and urban footprint are coherent. This accepts the inspected views' static coherence; it does not establish supreme visual quality, the complete square perimeter, source accuracy, population, motion continuity or flicker performance.

## Coverage limit to resolve from existing evidence first

All three overhead images crop the near square corner below y720. The visible left/right spans are reasonably clean, but the complete square finish is not established by this subset. Representative: artifacts/final-flythrough-prep-20260927/run-01/dusk/dusk-cartographic-overhead-mid.png, SHA-256 3dad991999af6d168d03f25e07d83a3f1fbe6f9bc28f3b555643b7b22041a85e. Next probe: root should reconcile the other accepted aerial views against a four-corner coverage inventory. Only if no existing frame covers that corner, capture one controls-driven overview far enough out to include all four corners and inspect the missing edge at native resolution. This is an evidence gap, not a demonstrated cutout defect.

## Targeted visual follow-ups, not confirmed blockers

1. Broad pale corridors appear unfinished relative to the surrounding window grids and roads. The clearest block example occupies roughly x816-965/y241-395 in artifacts/final-flythrough-prep-20260927/run-01/dusk/dusk-cartographic-block-mid.png, SHA-256 599080f4f1d5c7228a22ddcc8b18096955acf9c5eede2873a7339c98ccd84676. A corresponding long pale band is visible near x691/y365 to x809/y188 in overhead-mid above. Next probe: use the existing read-only geometry/picking instrumentation at the recorded block pose to identify the rendered primitive and intended surface class. If it is intended as plain land cover, this is optional material polish; if required authored surface treatment is absent, promote that demonstrated omission to a scoped defect. These pixels do not prove any missing railway, road, building or source record.

2. Three small bright needle/sliver shapes rise from the near roof around x855-897/y527-555 in block-mid (same digest above), persisting around x860-902/y529-553 in artifacts/final-flythrough-prep-20260927/run-01/dusk/dusk-cartographic-block-end.png, SHA-256 1734614704201940065abb13dfa432526c71371bef181f0c47f6f47e4fe118f9. Next probe: identify the owning mesh/triangles and inspect an unobstructed closer controls-driven angle. They may be legitimate narrow roof elements; this static evidence is insufficient to call them invalid geometry. Do not repair by hiding geometry without classification.

## Optional polish

The cartographic style is legible, but repeated dark rectangular window bands and plain blue-grey roof fields dominate every distance. Dusk has a pleasant horizon and warm side lighting while local facade illumination is sparse; this reduces depth and neighbourhood distinction in the overview. Plaza tactile paths read as broad flat ochre strokes. A controlled material/lighting comparison could improve richness while preserving the quiet map palette. These are art-direction opportunities, not evidence of a rendering regression or authority to add invented real-world detail.

## Resources and handoff

No browser, GPU context, preview server, capture process, build or test was launched by this reviewer. A final task-marker process scan was attempted but Win32_Process access was denied; its empty array is not evidence of zero processes. There is no reviewer-owned persistent process from this task to terminate, and shared root/worker processes were untouched. Only this review directory was written. The retained four review files support root integration and any motion follow-up. The root should promote the authored conclusion into the permanent work-review record. The separate motion review remains outstanding and must not inherit a temporal verdict from these statics.


## Motion-sample follow-up, 2026-09-27

This follow-up completes the separate bounded sample review anticipated above; it leaves the static findings unchanged. All 18 supplied PNGs were independently opened at original 1280x720, with no repeated still opens: 27 total personal image calls across both reviews. MOTION-LEDGER.md records each file, SHA-256, actual encoded PTS and observation; motion-inputs.json preserves the supplied sample metadata. All 18 file hashes/native dimensions and the source video hash were verified.

Video: artifacts/final-flythrough-prep-20260927/run-01/dusk/dusk.webm, SHA-256 9db7491798e6278a2a2a8905d1196e5c2e8751649f74cc770a9cd1fd9b8036ef. Extraction metadata SHA-256: 338268e05d037c9ffaa43e535ff327f64b3ccf121bc033a5a1b9c104e98404a7. The phase labels are approximate wall-clock witnesses with a 43 ms creation offset; actual encoded timestamps, not phase-perfect timestamps, are the coverage below.

| Cell | Drag sample PTS (s) | Wheel sample PTS (s) | Released sample PTS (s) |
| --- | --- | --- | --- |
| Dusk cartographic plaza | 80.92, 83.28 | 86.04, 88.76 | 91.48, 93.72 |
| Dusk cartographic block | 99.52, 101.92 | 104.76, 107.48 | 110.24, 112.60 |
| Dusk cartographic overhead | 118.40, 120.88 | 123.72, 126.60 | 129.36, 131.72 |

Bounded verdict: no confirmed large appearance discontinuity, major geometry dropout, open ground tear or fully wall-blocked camera at the inspected timestamps. The earliest block drag witness has a nearby facade across roughly the right quarter, but the crossing remains visible; the later witness exposes more of the scene. Representative: dusk-cartographic-block-drag-5.png, SHA-256 e368bc3cd0b7d21aa085620b9c763e898043266e803043aa1e22c5c9b1a52bd5, at PTS 99.52 s. This is peripheral occlusion, not demonstrated camera penetration.

The static roof-sliver classification probe persists in block samples. The broad pale corridor is still visible; its diagnosis belongs to the assigned source investigator and was not duplicated here. All overhead samples still crop the near corner, leaving the whole-square coverage limit unchanged. Fine surfaces are softer/more mottled during several drag samples and clearer after release, particularly overhead. These VP8-derived sparse frames cannot isolate encoder behaviour from rendering convergence or prove a renderer defect.

These are 18 separated frames with within-phase gaps of 2.24-2.88 s, not consecutive frames or full playback. No acceptance of intervening motion, fine flicker, popping, shimmer, quantitative temporal stability, simulation or population performance follows. No browser, server, GPU context, capture, source change or product change was made for this follow-up. Existing process-enumeration limitations above remain; no new persistent process was launched.

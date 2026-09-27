# A1 noon Cartographic native review — 2026-09-27

**Verdict: HOLD the moving capture as final-quality visual evidence; ACCEPT the nine original stills within this lane's appearance bounds.** The 27 inspected images show coherent city geometry and materials. One visible background-colour defect in the encoded aerial witnesses needs attribution before the moving capture is accepted. It is not established as a product renderer defect.

## Scope and identity

This independent read-only review personally inspected exactly 27 original-resolution 1280×720 PNGs: nine original plaza/block/overhead start/mid/end captures, then eighteen encoded-video samples, two inside each drag/wheel/released phase. Each file received exactly one `view_image(detail: original)` call; no contact sheet or thumbnail substituted for inspection. Per-file SHA-256, original wall-clock offset or actual encoded PTS, dimensions and immediate observations are in `ledger.json`.

All nine original hashes match both `run-01/bound-complete.json` and `run-01/noon/manifest.json`; all eighteen extracted hashes match `noon-cartographic-manifest.json`. All 27 PNG headers report 1280×720. The source video, source manifest, extraction metadata and sample manifest were independently rehashed. The extraction-to-source association and actual encoded PTS come from the supplied extraction manifest; this reviewer did not independently re-decode the video.

- Bound certificate: `6590318e3a64fe9869c42d6f4d8e23987daa79a558712d0a41d4c23c90fda077`.
- Noon WebM: `66ef87ab075fa696bd7990af70b69f24d01d029965ed81f4476b7c9efa336ace`.
- Noon capture manifest: `8fca644f6c9c8b6fd5b9bde81b291f0aae804064fc42ad688c989b3e77879c28`.
- Extraction metadata: `338268e05d037c9ffaa43e535ff327f64b3ccf121bc033a5a1b9c104e98404a7`.
- Noon Cartographic sample manifest: `cf675c208c86dfc7c395b32ed5a4de749329ea430c0251ee4a9f54dc0beb01bf`.

The assignment identifies frozen main `13ef7e83c56202a17aa56975ef5786825bfcff2f`. The root's reconciliation record states unchanged source/build/harness/scene/GPU and complete owner cleanup; those underlying checks were not repeated in this visual lane.

## Findings

**A1-NC-1 — P2, moving-capture quality, cause unresolved.** The aerial video samples contain broad purple/teal rectangular background patches. The strongest witness is `artifacts/final-flythrough-review-prep-20260927/noon-cartographic/noon-cartographic-overhead-wheel-5.png`, SHA-256 `a49bc8c02340a4a808d69a9908c5a18df0d653b7e42bdcb21791b1009ce1c5bb`, encoded PTS **122.52 s**. The upper-left background, approximately x0–400/y0–200, is purple-gray; behind the upper-right skyline, approximately x800–1000/y50–125, it is teal-gray. Sampled RGB is `(55,52,69)` at (20,20) and `(43,58,63)` at (850,80). Original overhead-mid is uniform `(50,57,68)` at those positions. `background-pixels.json` records five background points across all nine overhead witnesses, bound to each image hash.

The earlier drag witnesses at **117.24 s** and **119.72 s** also show broad colour regions. The later wheel witness at **125.36 s**, SHA-256 `0a8b6b1eebad03a571778d44bf3e781c2296a3caa02ff6586be56a8e508d6497`, largely clears to a uniform blue-gray. This is an observed coarse appearance difference between sparse frames, not evidence of fine temporal flicker. It degrades the clean cutout presentation and makes the moving evidence less faithful than the original stills. Resolve with a same-frame native-render/video comparison or another independently bound capture that separates the render from encoding. If encode-only, repair the review video capture rather than altering product materials. No source/geometry change is justified by this finding.

**Optional P3 polish.** The attribution at approximately x865–1270/y699–714 is very faint over pale paving in original plaza-start, SHA-256 `cbbf145bede0d628451763667bcb6e91b0bb6fffbe0a61e978837ee49084f44c`. A contrast-preserving backing or darker text would improve readability. This is a visible readability risk, not a measured WCAG finding or a new legal conclusion.

## Reviewed sequence

1. **Plaza, nine images — ACCEPT.** Clean crossing paint, coherent paving/tactile intersections, supported trees and signs, and legible style control. Fine facade/pavement detail is softer in moving VP8 witnesses than in original stills; no renderer cause is inferred.
2. **Block, nine images — ACCEPT within geometry/material bounds.** City massing and shadows remain coherent. A nearby facade covers roughly the rightmost 30% at PTS 98.40 s and recedes by 100.84 s; the two views are consistent with orbit occlusion, with no observed missing block. The broad pale corridor is visibly sparse in original block-mid around x820–985/y230–390. This corroborates the separate investigation without identifying the source feature or asserting missing geometry.
3. **Overhead, nine images — stills ACCEPT; moving evidence HOLD for A1-NC-1.** Rooftop relief, roads and visible left/top/right cutout edges remain coherent. The lower boundary is cropped in every inspected overhead frame; these images do not establish the complete square. No broad interior tear, floating city island or gross material swap is observed.

## Limits and completion

The eighteen video samples are sparse and nonconsecutive. Video creation time and capture-manifest time differ by 39 ms; phase association is approximate. Full playback, fine temporal stability, quantitative flicker, simulation/population behaviour, performance, keyboard operation and accessibility compliance were not checked. Absence of actors is the current default, not a capture failure. Other reviewers' S1 boundary evidence and Review 114 images were not inspected or inherited here.

All assigned images were inspected; no image was skipped or unreadable, and no hash/dimension check failed. All 27 images were rehashed unchanged after inspection. No browser, GUI, server, GPU task, build, test, product edit, data mutation or Git operation was run. Only the assigned ignored review directory was written. No task-owned browser/GUI/server resources were created. The final process inventory attempt using `Get-CimInstance Win32_Process` failed with `Access denied`; it does not establish an empty process list. No cleanup target exists from this lane's actions. The retained ledger and pixel record are needed for the unresolved finding and handoff.

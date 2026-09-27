# Satellite tonal milestone baseline review

Independent reviewer: visual_critic. Date: 2026-09-27. Scope: P1/P2 Satellite tonal balance. This is a bounded visual baseline, not whole-deliverable acceptance.

Retained original and image manifest: `artifacts/quality-critic-20260927/baseline-review.md` and `artifacts/quality-critic-20260927/baseline-evidence.json`.

## Evidence binding

Primary certificate `artifacts/visual/complete.json` is run `eff5f6082036d290`, SHA-256 `0e369d2c1779bd68ce8b50d1959517de46ccb9113de9ebe4610e2df5b51221e1`. All 44 frame digests independently matched. These are retained historical capture bytes, completed `2026-09-27T06:10:51.570Z`; source data and dependencies are currently being restored, so no fresh runtime result is claimed. The source files inspected are `src/scene/delight.ts` (`657b0a005fb5262f1c3f41c1c74c51d56ef7a186e6cb9a8f9c95d5b791f6e092`) and `src/scene/tile-materials.ts` (`020a75f7c249f66ec00f2c6e990a8248e58ebd41f4bbcb0aad9d11403cfdde5a`). Read plan's current queue, acceptance section, Review97, local rules and lessons. Historical acceptance prose is not treated as a current full pass.

Inspected 16 images individually at native 1280x720, using original-detail image display: all four Satellite heroes; Satellite block az060/120/240, overhead az000/120 and plaza az120/240; Cartographic noon crossing, dusk approach, block az240 and overhead az000/120. Their certificate hashes are in `baseline-evidence.json`. No screenshot grids or scaled thumbnails substitute for these inspections.

## Ranked current defects

1. **P1 target: roof shadow detail is unnecessarily difficult to read.** In `hero/hero-satellite-noon-approach.png`, the station roofscape at approximately x0–780/y390–720 reads dark teal and the right roof at x770–1279/y490–660 is nearly black. Equipment and roof seams exist but become hard to separate from the planes. The same surfaces in the dusk approach collapse further. The material currently gives low-light walls up to a 1.62 multiplier but horizontal photographic surfaces only the 1.20 base. A bounded roof treatment is therefore a controllable material choice. This does not establish the source roofs' true reflectance.

2. **P1 target: the shared green/teal photographic cast makes daylight look dirty.** In noon crossing, the cylinder at x702–927/y0–344 and source facade cluster x0–680/y0–337 share a green-grey cast. Noon approach repeats it across roofs and facades. The current CPU heuristic subtracts blue-heavy airlight, divides dark pixels by blue-heavy skylight and boosts chroma to 1.22; moderating its authored corrections is a plausible lever. This is a visual complaint and a source-grounded treatment hypothesis, not a measured neutral-albedo reference. Green glass and colored signs must remain distinct.

3. **Known source/geometry limitations remain more severe than the small tonal milestone can fix.** Source letters and window structure are blurred or stretched in Satellite crossing and plaza az120/240. The giant near-right shadow face in block az060 occupies roughly x625–1150 and has very little structure. Do not brighten it until it merely becomes a large pale blank face, or call a tone change restored detail. Source blur, atlas stretching and simple building meshes require a separate source/geometry decision.

4. **The cutout's outer presentation is unfinished.** Satellite and Cartographic overhead az000/120 show a broad terrain-and-roads apron around the dense building area, abrupt road endings and a thin uneven outer silhouette. This is consistent across styles and not caused by Satellite grading. Any later edge treatment should be explicitly designed for the owner's square cutout and distinguish authored boundary presentation from surveyed ground; P1 must not alter the terrain or hide it with exposure.

5. **Near scenes still read as an empty model.** Crossing heroes show an expansive pristine pavement, repeated authored sign cues and stylized tree clusters without street life. Cartographic now has legible facade families but conspicuously repeats them. The still set cannot establish whether the running populated scene meets behavior or performance criteria. Simulation work is deferred under the current queue and is not a dependency of this tonal milestone.

## P1 candidate acceptance expectations

- Compare matched noon and dusk crossing/approach plus block az120 and untuned az240; inspect az060 for its broad blank-face risk. Preserve exact data, poses, capture renderer and source hashes. A different light or camera is not evidence for the material change.
- Approach roofs must separate equipment, seams, raised sections and cast-shadow divisions more readily, without a uniform pale coating or emissive appearance. Dark surfaces must remain darker than their nearby pale parapets. Dusk stays dusk.
- Noon facades should lose some common green cast without neutralizing genuine green glazing or pushing concrete pink/purple. Compare the central pale faces and the tall dark glass towers together.
- Preserve distinct source reds, blues, cyan and yellow signage, including IKEA, UC and the central billboard group; maintain bright-versus-shadow facade divisions. The authored red signs must remain unaffected by the photographic pass.
- Untuned block az240 already has pale readable faces and detailed rooftop equipment; these must retain contrast and avoid bleaching or excessive saturation. Block az120's pale foreground faces should retain their subtle texture.
- Cartographic and non-building surrounding surfaces must remain unchanged in source and in matched captures within normal temporal/camera noise. No change to geometry, alpha/emission masks, source provenance, simulation, texture size or data.
- Review exact frozen source and final native views, then require the five primary gates on that candidate. A static gain does not close the existing whole-scene motion diagnostic, which remains `not-established`; do not restart its investigation unless an introduced defect is visible.

## S1 square-boundary visual acceptance

The root reports an independent source audit locating a roughly 275 m terrain/roads apron beyond the building AOI. This review has independently seen the apron in the retained aerial images, but has not reproduced that distance. S1 should bind its exact clip rectangle to the canonical AOI rather than choose an image-space crop.

- Native aerial views in both styles, from all six sweep azimuths, must show a continuous four-sided rectangular ground footprint in world space. Perspective makes a quadrilateral on screen; do not require a screen-space square. No surviving apron, diagonal mesh teeth, slivers or holes along the clipped rim.
- Check the corners and all four edge midpoints at a nearer distance as well as whole-area overhead. Ground, roads, pavement and any clipped building/decoration must end coherently at the same boundary; no floating edge paint, hanging guardrail, detached triangles or street content continuing over the void.
- Inspect dusk and noon edge-facing angles. There must be no shadow floating beyond the cutout, unexplained bright seam, glowing sidewall or black curtain produced by an edge normal. Existing interior directional shadows must retain their shape. If the design uses a skirt or base, its depth, material and invented geometry must be explicit, consistently joined and visually accepted.
- The central crossing and approach must be visually unchanged aside from any intentional renderer clipping of formerly out-of-area surfaces. Preserve the interior slopes and verified ground/building contact. Boundary presentation must not flatten the whole terrain or erase source geometry inside the AOI.
- A source/numerical bounds check complements the images; it cannot replace them. Require the exact final source, native frame hashes and real-control capture provenance before accepting the edge treatment.

## Bound and cleanup

This baseline supports P1 as the next bounded improvement. It does not justify saying the map is complete or photoreal at street distance. No browser, server, GPU lane or persistent process was launched. Product source and tracked docs were not edited. Only this ignored review and its small hash manifest were written.

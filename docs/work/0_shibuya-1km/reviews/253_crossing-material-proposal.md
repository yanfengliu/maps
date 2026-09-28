# Crossing material proposal 253

2026-09-28. Read-only design against main `a8fc26273850a86b1a5b377d22a861e98c2a766b`. Recommend **one pavement-material change after the first independently admitted moving actor**. Do not join this work to actor acceptance. No implementation or appearance approval is claimed.

## Evidence and diagnosis

The retained native frames and existing shader are the appropriate instruments for this small design decision; a new renderer run is unnecessary. I opened exactly the following three original 1280x720 PNGs, without crops or resampling. SHA-256 was calculated directly from each file.

| Original under `artifacts/rail-integrated-gates236i-20260928/native/hero/` | SHA-256 |
| --- | --- |
| `hero-satellite-noon-crossing.png` | `1f2a296f11ea27d63510a1bc52264b054e44ff48380557174a75c66555330bbb` |
| `hero-cartographic-dusk-crossing.png` | `266b67a437b2564988975d8359835fbc5d91c31235b736b67c8ebea171cf3546` |
| `hero-satellite-noon-approach.png` | `9c0fb899cc147f6f47d818e97c5f65b09a1c2c9e8d890ab78a3a7244fe802b04` |

In both crossing images the foreground is a large uninterrupted grid with conspicuous seams, while the paving by the opposite building bases reads almost uniform. Satellite puts this crisp repeated foreground against visibly soft photographic facades; Cartographic compounds it with the repeated facade bays. The carriageway/pavement joins are abrupt, but these pixels do not establish a missing kerb, a misplaced boundary or a bad source elevation. In the approach view the crossing remains legible, while station/roof geometry occludes much of the near building-to-ground contact. It cannot validate contact beneath those roofs.

The material cause is concrete: `src/scene/surface-materials.ts:165` uses one world-aligned 0.6 x 0.4 m staggered grid; line 171 applies the same 25% grout darkening in both styles. Its smoothstep widens with derivatives rather than integrating cell coverage. By contrast, `src/scene/tile-materials.ts:174` already has a distinct ground-floor treatment and its Cartographic bays integrate periodic coverage when minified. Adding another generic ground-floor strip would duplicate treatment. Photographic softness may reflect source imagery, atlas limits and viewing distance; these frames cannot attribute their shares or recover missing photographic detail.

## Ready implementation assignment: quieter paving from plaza to frontage

Owner: one material worker in an isolated managed worktree, rebased from the accepted actor milestone. Outcome: make the same existing paving read as one restrained material from the large foreground to the opposite frontage, with the road junction still clearly legible. Allowed production home: `src/scene/surface-materials.ts`; corresponding existing tests in `test/surface-material-shader.test.ts`. No facade, lighting, palette, geometry, source-pipeline, paint, rail, actor or texture-budget edits.

Keep the current metre dimensions, stagger and world-space alignment. Replace the derivative-expanded seam mask with a bounded periodic-area coverage calculation, including the alternating-row phase, so unresolved cells converge to their actual average coverage. Begin with resolved grout darkening of 12% in Satellite and 8% in Cartographic instead of 25%; these are explicit art-direction candidates, not surveyed material measurements. Keep the existing palette, roughness and average resolved-cell tone: normalize the modulation by its analytical cell average. Bind the style difference through the existing `apply` path. Update the program cache key and retain the shader-anchor refusals.

Expected Satellite difference: the foreground seam lattice stops competing with soft facade photographs and the large paved field remains quieter up to the road edge. Expected Cartographic difference: the paving supports the clean building masses without adding a second dominant grid. Both retain visible near-field joints and readable separation from asphalt and tactile paths. At approach distance the same paving should converge steadily to its average rather than acquire a different seam-density tone. This changes surface hierarchy at the large junction; it does **not** repair its silhouette or create a physical curb.

No new texture, mesh, draw call, CPU frame work or render pass is needed. The fragment calculation adds a small number of floor/clamp operations; measure the existing draw path before making any speed claim. Do not add per-paver geometry, random stains, a distance-blur pass, painted fake contact shadows, invented curbs or new geographic masks. The shared semantic pavement material also affects pavements outside the crossing, so the existing full-view gate/review remains required.

## Finite acceptance and controls

Use unchanged source bytes, time, camera, hardware and capture path for before/after. The targeted comparison is exactly six native hero pairs: crossing in both styles at noon and dusk, and approach in both styles at noon. Reuse ordinary harness controls and the existing hero poses. No new camera search or certification lane. Review all six full frames, looking for reduced competing grout, retained material separation, stable far-field mean tone and no new seams at the road joins; inspect their surroundings too. Reject a candidate that merely makes the foreground featureless or visibly shifts the entire pavement colour.

Extend the existing shader check with independent analytical examples for a footprint inside a paver, across a seam, across an alternating-row boundary, and across many cells. A deliberately replaced constant output and the old derivative-expanded mask must fail the new numerical expectation; the text-anchor checks alone cannot establish the GPU result. Keep road/ground shader branches unchanged. Confirm scene mesh/input hashes and facade/paint treatment are unchanged. Run the existing five integrated gates once the candidate is ready, with required independent native-image review; no new critical-path gate is proposed. Actual style switching must preserve the current camera and accepted actor progress.

## Bounds and handoff

Do not claim that three stills establish motion stability, citywide source correctness, kerb dimensions, hidden facade contact, all-time lighting, actor absence, natural gait, final realism or the performance target. The two crossing images differ in time as well as style, so they do not isolate a style-only brightness effect. Large boundary geometry remains outside this proposal because the observed abrupt joins alone do not justify inventing it. If a later matched view exposes an actual gap or overlap, give that measured defect its own source-bound assignment.

Read AGENTS, relevant local rules/lessons, review 252, and the current surface, road, terrain, facade and style implementations. A quick memory search found no maps/Shibuya entry; no memory fact was used. Existing dirty canonical documents were left untouched. Only this owned ignored report was written; no source, tests, dependencies, Git state or remote was changed. No browser, GPU job, server, GUI or persistent process was launched. Synchronous read/write commands exited; this report is intentionally retained for the orchestrator's decision.

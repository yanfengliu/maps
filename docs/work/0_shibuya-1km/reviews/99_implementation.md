# Satellite tonal candidate review — preliminary acceptance

Independent reviewer: `satellite_review`. Date: 2026-09-27. Scope: the two-file P1 Satellite tonal candidate based on `fc6dab33480b1b6687e53b59dd7302dec049f2b4`. Product source was read-only. This round is preserved separately from the forthcoming integrated review.

## Verdict and bound

**Accept this exact candidate for primary integration and final verification.** I found no blocking introduced defect in the source diff or the 26 paired native images. The common green cast is reduced, and low-rise station roof structure is easier to separate. The improvement is bounded: some very dark roofs remain very dark, photographic blur and the large blank near face remain, and this is not a claim of recovered reflectance or restored source detail.

The five primary gates and independent review of all 44 final certified frames were pending when this round was authored. Their completion is required for final milestone acceptance. This review does not close the whole-scene motion diagnostic, population performance, the square boundary or the overall Shibuya deliverable. No motion investigation was started.

## Exact evidence

Candidate workspace: `C:/Users/38909/.codex/worktrees/shibuya-quality/maps`. Compared only `src/scene/delight.ts` and `src/scene/tile-materials.ts`: 16 insertions and 6 deletions. Git status and the diff against `fc6dab3` showed no other changed source paths.

| Input | SHA-256 |
| --- | --- |
| Candidate `src/scene/delight.ts` | `ca0ac4156e6f0e1f4f7b2c619a869c20033de6e5e6b347a2ab79a3a7f4547a77` |
| Candidate `src/scene/tile-materials.ts` | `357026ece962e8c1d9189f3107ef7201bb03adc821df01ea97391db524674e17` |
| `artifacts/satellite-tones/baseline/manifest.json` | `38cc35a3f8e00cd15a2243d51530b9a4071df675494293cef1fdd99e7501a496` |
| `artifacts/satellite-tones/candidate1/manifest.json` | `d564330974aeb2420e6673a1daca82ce725f177b6834d0fa1800aece65804a4e` |

`candidate-evidence.json` beside this report contains each of the 26 raw PNG hashes, individual native-inspection coverage, source hashes and pair checks independently produced by this reviewer. Every raw image matched its capture manifest and decoded to 1280×720. I opened every image individually with original detail; no contact sheet or thumbnail substituted for inspection.

Both arms' 117 data records are identical. I rehashed every corresponding current scene/network file: zero mismatches. Each arm's recorded input tree is identical before and after capture. Both name NVIDIA GeForce RTX 4090, driver 616.64, and D3D11. Every pair has identical recorded lighting, postprocessing and style. Maximum camera-position difference is `7.974556323573665e-13` m; all target positions match. The two baseline source hashes match the CRLF checkout representation of the `fc6dab3` blobs. Raw LF and CRLF hashes are recorded separately rather than silently equated.

The capture instrument `artifacts/satellite-tones/capture.ts` uses `OrbitDriver.orbitTo`/`zoomTo`, waits for tile idle and camera settlement, and selects Cartographic through the actual dropdown. Its page evaluation only observes the frozen harness. This iteration evidence is not a final gate certificate. The manifests record no page/console errors and completed context, browser and server cleanup; I did not independently rerun that browser lane.

## Native-image findings

The following filenames occur once in each arm; both originals were inspected for every row.

| Pair | Independent finding |
| --- | --- |
| `default-entry.png` | Aerial roofs and dark towers lose their common teal tint. Rooftop equipment and facade grids remain distinct, and the distant warm-facing buildings retain their separation. The unfinished outer apron remains visible. |
| `satellite-noon-crossing.png` | The cylinder and central facade cluster shift from green-grey toward blue-grey. IKEA yellow/blue, UC blue/red, cyan panels and the magenta/red authored signs remain distinct. Pale walls do not turn pink or purple. Source text remains blurred. |
| `satellite-dusk-crossing.png` | Signs retain hierarchy and dusk remains dark. The strong golden glint on the narrow facade around x370–420/y140–320 is substantially weaker; its printed/source structure is more readable. The scene's directional distinction remains, but its warm reflection response is changed. |
| `satellite-noon-approach.png` | Station roofs across x0–780/y390–720 have clearer seams, raised sections and equipment. They remain darker than nearby pale parapets. Cast-shadow divisions remain in place. The right roof around x790–1130/y520–630 remains nearly black. No uniform pale or emissive roof coating appears. |
| `satellite-dusk-approach.png` | Roof separation improves modestly while the foreground remains dark blue and the right shadow roof remains difficult. Bright parapets, dark roofs and signage are still ranked separately. This is a partial readability gain, not removal of baked shadows. |
| `satellite-noon-block-az60.png` | Lower-left roofs gain readable structure. The giant near-right face remains a dark, weakly structured blue plane; it is not bleached into a pale blank slab. This underlying source/geometry defect is not repaired. |
| `satellite-dusk-block-az60.png` | The same plane remains dark. Roof contrast and small bright signs survive. Reduced warm glints make some facades cooler, but no new glowing or washed-out face appears. |
| `satellite-noon-block-az120.png` | Pale foreground facades retain their faint photographic window structure and roof patches. Dark glass towers remain distinct from concrete. Rooftop greens are moderated, not replaced by a uniform neutral plane. |
| `satellite-dusk-block-az120.png` | Golden reflections on the high central tower around x500–625/y35–245 and the left tower around x300–355/y90–235 diminish visibly. Warm-facing sides remain distinguishable from the blue shadow sides. Foreground textures and rooftop equipment remain legible. |
| `satellite-noon-block-az240.png` | Untuned pale roofs and parapets retain equipment, recesses and relative light/dark contrast. The broad pale faces are less green without bleaching. Tall dark glass keeps variation between faces and buildings. |
| `satellite-dusk-block-az240.png` | Pale faces preserve warm illumination, rooftop objects and cast divisions; dark upper towers remain dark. A modest cool shift in photographic surfaces does not erase the time-of-day distinction. |
| `cartographic-noon-block-az240.png` | No visible facade, roof, color or surroundings regression. Facade family layout and light/shadow boundaries remain intact. |
| `cartographic-dusk-block-az240.png` | No visible change to warm facade treatment, glazing or the roofscape. |

## Dusk tradeoff

The author disclosed reduced golden facade highlights, and the images independently confirm it. It is most obvious at dusk crossing and az120. I accept that tradeoff for this bounded candidate: it reduces the green cast without destroying the distinction between lit and shadow-facing walls, and in the crossing view the weaker glare leaves more source texture readable. I would reject any delivery claim that the specular response is unchanged. These images are not a surveyed material reference, so they do not establish which reflection strength is physically correct.

## Source review, including unchanged surrounding paths

`src/scene/delight.ts:96–112` changes only four authored settings: airlight, the two illuminant triples and chroma gain. The compression, floor, ceiling and transition luminances remain unchanged. The unchanged operator at `src/scene/delight.ts:283–337` reads RGB pointwise and preserves alpha; it does not blur atlas neighborhoods or alter geometry. The header at `src/scene/delight.ts:3–24` correctly bounds the method as a heuristic rather than measured reflectance recovery.

The shared CPU texture route matters. `src/scene/facade-textures.ts:199–223` rebuilds the material's `map` and explicitly skips other texture slots. It does not rewrite an independent `emissiveMap`. `src/scene/facade-textures.ts:270–282` derives the sign alpha mask from the original image before applying de-lighting. The new RGB settings therefore preserve the mask selection but do change the RGB later sampled for both material color and source-panel emission.

The shader style boundary is unchanged. `src/scene/tile-materials.ts:160–167` selects the procedural branch for Cartographic; that branch writes its own palette-based diffuse color at `:201–226`. The new roof lift is confined to the photographic branch at `:262–287`. Its world-normal fade excludes vertical walls, its saturation fade avoids strongly colored roofs, and it multiplies albedo before lighting rather than adding emission. Across the stated luminance interval its neutral fixed-chromaticity roof curve stays increasing; no sampled source-detail ordering reversal is evident.

The corrected RGB also drives the unchanged glass proxy at `src/scene/tile-materials.ts:263–265` and its roughness at `:286`. This explains why global color correction can alter facade glints even though those lines were not changed. It is an appearance dependency, not proof of glass material identity. The source-panel term at `src/scene/tile-materials.ts:296–307` still requires the existing alpha/vertical/panel eligibility terms and multiplies by `1.0 - mapsProcedural`, so Cartographic does not inherit photographic panel colors. No emission mask, panel geometry, style interface, texture budget, data provenance, agent path or simulation state was changed.

The Cartographic PNGs are not byte-identical: independent mean absolute RGB differences are 0.1990 at noon and 0.2174 at dusk on the 0–255 channel scale, with maximum single-channel differences of 36 and 34. Those numbers are observations, not a pass threshold. Their native appearances show no material difference, and the source branch review supports the narrow preservation claim. Final multi-angle verification remains necessary.

## Remaining work and resources

Finish all five primary gates on the integrated exact source, then inspect the 44 final certificate-bound images natively in both styles. Preserve the source blur, dark-roof and blank-face limitations in delivery language. The existing global motion status remains `not-established`; this static gain does not change it.

This reviewer launched no browser, GUI, server, GPU lane or persistent process. Short read-only shell processes completed. Only this report and `candidate-evidence.json` were written, inside the reviewer's ignored directory. They remain required evidence for the active integration review.

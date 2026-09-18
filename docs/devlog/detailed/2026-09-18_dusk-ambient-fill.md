# The dusk ambient fill: the near-field road comes off the floor, and light alone does not give it grain

2026-09-18. Branch `dusk-light` off `9795fc4`, worktree `artifacts/dusk-light/wt`. One code change, `src/scene/time-of-day.ts`: a dusk ambient fill on the two terms that light a horizontal surface. Before arm: certificate runId `14cdadbafba82120` (build `index-_LQ7yEQN.js`). After arm: runId `ebf66d041d14173b` (build `index-Dj6sqKQI.js`). Both on the same adapter, the RTX 4090 at driver 616.64, and both binding scene digest `1ebda66251e5e023dfc3a537b7f6f49109c67f44deb35e7f31efac166a3fc2e0` over 117 files and 301,674,209 bytes, so the two arms differ by build alone.

## What the previous lane left, and what was believed

The satellite near-field road at `plaza-az000` was the one blocking appearance defect: measured on the certified frame's own bytes, the `near-pavement` rect (320,540 640x180) read mean luminance 17.80 of 255 with only 0.3% of its pixels under 12 and 86.8% of neighbouring pixel pairs identical. The palette lift to `0x474d55` in `a2282f8` had already taken it from 10.4 to 17.8, which cleared the frame's black threshold and did not clear the 20 floor the appearance work uses. The appearance lane's fit of the two certified road points gives `radiance = A + K*albedo` with A 0.0052 and K 0.0736, A being the albedo-free part (the wet road's specular reflection of the dusk sky plus bloom), and its arithmetic said the near field needed the irradiance term about 2.5x to reach 30 of 255.

Two things in that record are worth correcting here, because both are quoted onward.

1. The task stated the dusk preset's solar elevation as -3.9 degrees and derived `hemisphereIntensity` 0.218 and `environmentIntensity` 2.84 from it. The preset solves to **-3.48 degrees** (the repo's own `test/realism.test.ts` pins -3.48), so `daylight` is 0.191 and `dark` is 0.870, and the pre-change values are **0.2403 and 2.8048**. The -3.9 in the preset's comment block and in the register entry is not what the code computes.
2. The 2.5x is a multiplier on the illumination-driven share of the road's radiance, not on the ambient. Those are not the same number, and the measurement below is what separates them.

## The change

`time-of-day.ts` gains two named constants and adds `DUSK_HEMISPHERE_FILL * dark` to `hemisphereIntensity` and `DUSK_ENVIRONMENT_FILL * dark` to `environmentIntensity`, with 0.2 and 2.55. At dusk that is hemisphere 0.240 to 0.414 (1.72x) and environment 2.805 to 5.023 (1.79x). `dark` is the file's own "how dark is it" ramp and is exactly 0 in full daylight, so the fill vanishes at noon by construction and the fill is a floor at the dark end rather than a multiplier on the day ramp.

The alternative the appearance lane listed next - the road's own `wetness`, which drives its roughness - was not taken, and the measurement says why not: it would raise the albedo-free specular term, which is a *flat* addition to the surface, so it moves the floor and the grain in opposite directions.

## The measured result

All from the two certificates' frames, with `artifacts/appearance-2-evidence/compare-frames.ts` on the same rectangles the previous lane's reports used, and `artifacts/dusk-light/step-as-albedo.ts` for the albedo conversion.

**The subject, satellite `sweep/plaza-az000.png`, digest `ae81179a` to `1caca111`.** The road rect:

| | before | after |
| --- | --- | --- |
| mean luminance | 17.80 | **27.78** |
| median | 16.6 | **26.7** |
| pixels under 12 | 0.3% | **0.0%** |
| neighbour step, mean | 0.262 levels | **0.304 levels** |
| neighbour pairs identical | 86.8% | **82.2%** |
| residual flat (<0.5) | 95.1% | **91.0%** |
| mean 8x8 block spread | 2.46 | **2.98** |
| step as a share of albedo | 2.734% | **3.580%** |

**The in-frame pavement control, `right-ground` (960,540 320x180, `roads:plateau-semantic-pavement` at `0x999991`), same frame:** mean 43.77 to **61.14**, neighbour step 1.480 to **1.604 levels**, share of albedo 4.701% to **5.891%**. So the road carries 61% of the control's neighbouring-pixel amplitude in albedo terms, against 58% before: the lift does not close that ratio and does not widen it.

**The geometry-verified near-field band** (rect 340,600 600x100, 0.017-0.029 m/px by the camera's own geometry): mean 16.47 to **26.23**, neighbour step 0.132 to **0.181 levels**, share of albedo 1.350% to **2.102%**.

**The same defect elsewhere on the dusk set.** Satellite `hero-satellite-dusk-approach.png` near field: mean **14.5 to 26.2**, pixels under 12 **58.0% to 13.6%**. Satellite `block-az000` whole frame: pixels under 12 **11.87% to 0.62%**. Cartographic `plaza-az000` road rect: mean 52.4 to **78.1**, residual flat 57.9% to **47.3%**.

**The tone review, by number.** Noon is untouched where it matters most: cartographic `hero-cartographic-noon-crossing.png` `centre-crossing` reads **167.2 before and 167.2 after**, mean|d| **0.04 levels**, p95|d| 0.07, and 0.0% of pixels over 8; satellite noon the same at 109.3 and mean|d| 0.03. That is the pre-registered no-blowout number and it did not move, and the fill cannot move it because `dark` is 0 with the sun up. Across all 44 frames the fraction of pixels over 250 is unchanged to two decimals (0.00-0.04% everywhere, before and after), so nothing blows out anywhere. The whole-frame means rise by 12.4 to 29.7 levels on the dusk frames and by nothing on the noon ones.

**The tone review, by eye, on 1:1 crops** (`tools/inspect/crops.ts`, cut separately for each arm): the satellite and cartographic dusk crossing cells still read as dusk - cool blue-grey pavement, the sky's warm band untouched, the mid-ground asphalt still the darkest surface, the signage halos unchanged - and the zebra bands, the yellow guide lines, the paving grid and the TOKYO, TSUTAYA and STARBUCKS lettering are legible in both arms at the same size. The lift is visible as brightness, not as haze or as bloom eating an edge. **The cost is at block distance in the cartographic style**, and the biggest whole-frame mover in the set is `sweep/cartographic/block-az240.png`, +29.69 levels of mean (106.5 to 136.2): opened at 1:1, the shadowed facades lift and the city's modelling flattens, and the frame reads as a softer, brighter twilight than before. That is the price of a global ambient lift and it is recorded rather than argued away.

## What the change does not do

**The structure still does not read at 1:1.** The road rect's residual flat fraction is 91.0% after against 70.7% for the pavement in the same frame, and 82.2% of its neighbouring pixel pairs are still bit-identical. The display-level grain grew only 0.262 to 0.304 levels for a 1.50x radiance rise, and that ratio is the whole story: measured across the two arms, the step grows about as `R^0.35`, so putting one display level of grain on this surface needs its radiance up roughly **7x**, which is a road at about 90 of 255 - brighter than the pavement beside it. Light is not the lever for the grain on a surface whose albedo is 0.073; the tile's amplitude is, and that is a different change.

**It is global.** The pavement, the facades, the block-distance shadow faces and the night preset all move with the road. Bounding it to the dark end is what keeps noon and the cartographic near-white look out of it, and 1.8x is a deliberate stop short of the 2.5x the appearance lane's arithmetic asked for on the K term.

## The gate

`test/road-tone.test.ts` gains a second describe block, "the dusk ambient is what lifts the dark near field", with four cases: both dusk ambient terms rise within a bounded factor (over 1.5x and at most 2x), the road clears the floor with its whole radiance following the ambient (17.8 x 1.79 predicts 33.0), the road still clears it when only the illumination-driven share rises (49% held fixed as albedo-free, predicts 25.6), and the noon ambient is pinned at exactly 0.58 and 1.5 so a daylight term here fails the case. Watched red first by holding both constants at 0, which is the pre-change lighting; the three failures and their messages are in `docs/learning/gate-proofs.md`.

The block's bound is stated in its own header: it gates the lighting numbers through the renderer's tone curve against the certified pixel value, not the pixel. The pixel is the appearance lane's measurement, and this is the record of it.

## Workspace, and one instrument trap

The worktree junctions `node_modules` only. `data/scene` and `data/network` were **copied** as real directories (117 files, 287.7 MB) and the copy was verified byte-identical to the primary by a folded per-file SHA-256 before the capture, so the primary's served scene could not be written through and the certificate's `sceneTreeDigest` came back `1ebda662...` - the same digest the before arm binds. No `data/`-writing command ran in this lane. One reparse point exists in the worktree, `node_modules`, enumerated with a command that prints its count.

The trap: `tools/inspect/crops.ts` resolves a relative `--frame` against the repository root derived from **its own file location**, so invoking the primary's copy of the tool from inside the worktree crops the primary's frames. Eight "after" crop sets were cut that way and were actually the before frames, which the identical frame byte lengths gave away; they were re-cut with the worktree's own tool. Two scratch directories were created outside the repository by the same confusion (`--out-dir ..\after\...` resolving against the primary root) and removed after enumerating their reparse points, which were zero. Anything that resolves paths against a root it derives from `import.meta.dirname` has this property across a worktree.

## Gates at this revision

Build 0 (`npm run build`, `index-Dj6sqKQI.js` 981,069 bytes, SHA-256 `0b0982ab...`), typecheck 0, `npm test` 69 files / 499 tests green, audit 0, `npm run visual` 0 with certificate `ebf66d041d14173b`. The primary's `data/scene` was not written by this lane; `data/scene` and `data/network` in the worktree are byte-identical copies of it. Nothing was merged or pushed.

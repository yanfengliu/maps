# The appearance tile was in the bundle and invisible in the pixels, and the black plaza near field was asphalt

2026-09-17. Lane: `appearance-2`, worktree `artifacts/appearance-2/wt`, off `2561668`. Commits `cd94f1a` and `a2282f8`; the browser run that would look at the result is still owed to a sibling lane, so **nothing here has been verified in pixels**.

## What the lane was answering

Eight inspection reports under `artifacts/inspection-gpu2/`, all bound to certificate runId `fb07b11ea3b8296f`, which re-captured the 44-frame set after the detail tile landed in `c0d0f7c`. Two findings: the tile is in `dist/index-DpreZClu.js` (`mapsDetailMap`, `mapsDetailStrength`) and every ground and road crop is unchanged from the pre-tile capture beyond dither; and the satellite plaza's `az000` near field is black while the same frame's right-hand ground shows a full paving grid. The reports' own leading hypotheses were a silent `onBeforeCompile` no-op and a light or mip-fade defect.

## What was measured, in the order the evidence settled it

**The patch is applied; the no-op hypothesis is false.** All four anchors occur exactly once each in three r180's `ShaderLib.standard` — `void main() {` in both stages, `#include <project_vertex>`, `#include <roughnessmap_fragment>`. And the positive control was already in the frames the reports inspected: the basket-weave paving joints at 0.6 × 0.4 m come from the same patch's `sidewalk` branch, which has no texture and no other source. A silent patch would have taken the joints with it.

**The tile renders at 0.36% of albedo between neighbouring texels**, reproducing the inspection's figure independently, which is 0.13 of a 0-255 level: the renderer's curve gives about 0.36 of a level per 1% relative albedo change. Two mistakes, and the second was not in any report. The amplitudes (1, 0.62, 0.38, 0.22, 0.12, 0.06) over lattices of 4 to 128 cells decay faster than the lattices refine, so the field is a smooth 8 m hill whose local step is 2.3% of its own range. And every texel sampled a lattice cell *midpoint*: with `u = (x + 0.5) / SIZE` and 128 cells, each texel centre lands on `fx = 0.5` where smoothstep's slope is zero, so the finest octave was written as the average of two neighbouring lattice values. Corner-aligning the sampling nearly doubles the field's step for the same amplitudes.

**The tile commit also removed structure the road already had.** The pre-tile road shader carried `grain = sin(metres.x * 180) * sin(metres.y * 161)` at 0.025 amplitude, faded out above 0.015–0.08 m/px. The tile replaced that with 0.36%, so near-field asphalt lost about seven eighths of what it had — which is why the cartographic plaza's aimed cell measured **38% less** structure after the tile than before it. The reports read that as the tile reducing structure; it is the tile being weaker than what it replaced.

**The black near field is the road mesh.** The inspection tool's region names (`left-ground`, `near-pavement`, `right-ground`) are grid positions, and both reports read them as material claims. At the plaza pose the camera stands on the avenue: the near field and the left bottom band are `roads:plateau-tran`, and the paving grid that reads as healthy is `roads:plateau-semantic-pavement` on the right — 0x32363c against 0x999991, a tenfold albedo difference between two meshes in one frame. Measured from the frames: satellite near-field road median **10.4**, 66.6% under 12 (the report's figure exactly); satellite right-ground pavement median **51.3**; cartographic near-field road median **52.4**. Light is not the mechanism: `lighting.ts` stops the key light casting shadows below 8 degrees of solar elevation and dusk is at −3.9, so no shadow can fall differently across one horizontal plane. The road mesh's stored normals are 100% upward-facing, measured, so it is not a flipped-normal surface lit from below. What remains is the albedo, at linear 0.032 — below the range asphalt occupies at all.

## What changed

`cd94f1a`: corner-aligned sampling; per-surface spectra chosen by measuring the neighbouring-texel step (the road's rises towards the fine octaves because a 3.13 cm texel is aggregate, the ground's stays flatter because it is mostly seen minified); strengths 0.45 road and 0.30 ground; anisotropy 8 for the grazing-angle footprint, which is the mip-fade shape the report named; and `patchSurfaceShader` extracted as a pure function that refuses a source missing an anchor and names the anchor and the stage. Shipped: road mean step **6.35% of albedo at mip 0** (p95 14.8%, max 23.8%) and 3.97% at mip 1; ground 3.38%.

`a2282f8`: the satellite road's albedo 0x32363c → 0x474d55, linear 0.063 — dry asphalt, 1.98x the old value.

## What is not settled, and the number that decides it

The palette lift's effect on the pixel is **predicted, not measured**. Fitting the two certified near-field road measurements (satellite 10.4, cartographic 52.4, same pose and hour) to `radiance = A + K·albedo` gives A 0.0052 and K 0.0736; A is the albedo-independent part — the wet road's specular from the dusk sky plus the bloom this style turns up — and it is 66% of the satellite road's radiance. The prediction therefore spans **15.6 to 24.6 of 255**: 15.6 from the two-point fit, 24.6 from a single-point fit that assumes no albedo-free light. Only 24.6 clears a floor of 20. Re-capturing the certified poses with only the palette changed measures the albedo-driven sensitivity directly; if it lands near the lower end then the palette is the wrong lever and the light on horizontal surfaces at dusk is, and the palette change should be reverted rather than tuned.

Two further things are unmeasured. The frames in evidence are all stills, so the stronger fine content and the tile's roughness modulation at grain scale (±0.04) have not been watched in motion for shimmer. And the ground's 8 m tile now carries 3.38% steps on the terrain, which no frame in the certified set has been inspected for since the change.

## Gates

`npm run build` 0, `npm run typecheck` 0, `npm test` 0 (68 files / 494 tests), `npm run audit` 0, at `a2282f8` and at `cd94f1a`. Both new gates were watched red first: the anchor rename fails five shader cases naming the stage, and restoring the old spectrum and strength fails the visibility floor at `road: mean neighbouring-texel step is 0.41% of albedo at mip 0 (p95 1.00%)`. The mutations and messages are in `docs/learning/gate-proofs.md`; the defect is in `docs/learning/defect-register.md`.

`npm run visual` was deliberately not run: the browser and the renderer are serialized in this session and a sibling lane held them. That is the lane's outstanding work, and it is the only thing that turns any of the above into appearance evidence.

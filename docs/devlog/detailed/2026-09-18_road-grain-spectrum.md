# The road's grain: the tile's spectrum was the binding constraint, and the near field now shows aggregate

2026-09-18. Branch `grain/amplitude` off `a7f865d`, worktree `artifacts/grain/wt`. One code change, `src/scene/surface-detail.ts`: the road's octave vector goes from `(0.35, 0.45, 0.6, 0.85, 1.2, 1.7)` to `(0.04, 0.075, 0.175, 0.5, 2, 5.2)` and its strength from 0.45 to 0.72. Before arm: certificate `685d0eaeb5669287` (build `index-Dj6sqKQI.js`), the dusk-light lane's after arm, preserved at `artifacts/dusk-light/after-arm/`. After arm: this lane's certificate (build `index-DRmtpVMl.js`). Both bind `sceneTreeDigest 1ebda662…` over 117 files and 301,674,209 bytes, on the same adapter and driver, so the arms differ by build alone.

## Where the previous lane stopped, and what it left open

The near-field road was no longer dark — mean 27.78 of 255, no pixels under 12 — and it still read as flat: 0.304 display levels between neighbouring pixels, **3.580% of albedo against the pavement control's 5.891% in the same frame**, 82.2% of neighbouring pairs bit-identical. Its arithmetic said the display step grows as about `R^0.35`, so one level of grain on a 0.073-albedo surface would need about 7x its radiance, and it named the tile's amplitude as the lever for the next change.

## What this lane found

**The lever is the spectrum, and amplitude alone is the expensive half of it.** A scratch probe drove the certified pose through the real controls and reproduced the certificate to the digit (0.304 levels, 3.580%, 82.2%), which is what made it a ruler rather than a second opinion. On it (`artifacts/grain/arms.md` carries every arm and `artifacts/grain/arms/` every frame):

| arm | octaves | strength | road step | road % albedo | pavement % albedo |
| --- | --- | --- | --- | --- | --- |
| certificate before | 0.35,0.45,0.6,0.85,1.2,1.7 | 0.45 | 0.304 | 3.580% | 5.891% |
| old spectrum | " | 0.75 | 0.444 | 5.243% | 6.049% |
| old spectrum | " | 1.1 | 0.614 | 7.253% | 6.243% |
| two finest octaves doubled | 0.35,0.45,0.6,0.85,2.4,3.4 | 1.0 | 0.655 | 7.733% | 6.302% |
| **shipped** | **0.04,0.075,0.175,0.5,2,5.2** | **0.72** | **0.613** | **7.241%** | **6.257%** |

The frame's step is sub-linear in strength on the old spectrum — 1.67x strength buys 1.46x step, then 1.47x buys 1.38x — so reaching the pavement's share by amplitude alone needs about 0.9–1.0, and the 1.1 frame is the one whose near field reads as oil-stained blotches rather than aggregate. Re-weighting the vector toward the fine octaves buys 1.32x the mip-0 neighbouring-texel step at the *same* strength, and the frame follows: the shipped setting clears the bar at **0.72**. The full reallocation is what does it — doubling only the two finest octaves reaches 5.810% at 0.72, which is under the control and would have been the wrong change to land.

**What the crops show.** On the certified before/after pair, cut at 1:1 with `tools/inspect/crops.ts` (`artifacts/grain/crops/cert-after/` and `cert-final-satellite-plaza/`): the `near-pavement` cell goes from a featureless dark gradient — 91.0% of its pixels indistinguishable from flat, 82.2% of neighbouring pairs identical, mean 8x8 block spread 2.98 — to grain that reads as asphalt aggregate at 1:1, with 61.2% flat and the block spread 5.97, and the wider `left-ground` cell at the same mean luminance goes 90.3% → 56.6% flat with its block spread 2.32 → 5.07. The cartographic style moves further because its road albedo is 5.6x: its near band goes 0.706 → 1.837 neighbouring levels and 1.6% → 29.8% of pixels over 2 from the local mean, and at 1:1 a flat blue-grey gradient becomes aggregate mottle. The pavement control in the same frame is untouched by the change — its joint grid, kerb line and yellow guide stripe are as legible after as before — and the ratio the bar asks for is met in the frame: **7.241% against 6.255%**.

**What did not move.** Whole-frame means are identical to three decimals on the frames sampled: satellite `plaza-az000` 61.081 → 61.084, satellite noon crossing 104.026 → 104.026, cartographic noon crossing 155.177 → 155.176, satellite dusk crossing 98.035 → 98.034, overhead-az000 49.144 → 49.144. No frame gains a clipped pixel (0.014% over 250 on the plaza frame in both arms). The tone bars hold by their own instruments: cartographic noon crossing `centre-crossing` **167.2 before and 167.2 after**, satellite noon 109.3 → 109.3, and the cartographic overhead road sample 115.69 → 115.68 with its structure unchanged (45.1% → 45.0% of pixels over 2). Zebra bands, the yellow diamond, the guide lines, the paving grid and the signage are legible in the crops opened at 1:1, and the dusk hero frames still read as dusk.

**The cost, recorded rather than argued.** The fine reallocation spends coarse content: the tile's 16x16 block-mean spread falls from 44.95 to 19.80 of 255, and the mip-3 step falls from 11.45 to 9.05 of 255 (2.56% of albedo against 3.23% at the old strength). Every mip a camera between 0.0144 and 0.0886 m/px actually resolves is *higher* than before — mip 0 59.79 against 36.01 of 255, mip 1 31.57 against 22.50, mip 2 17.16 against 15.31 — and at the overhead framing, where the tile is four mip levels down and the city is one sample, the road measures unchanged. The block spread's floor in the unit gate moved from 20 to 17 with it, and the case's own header says why.

**One instrument trap, for the next lane.** The probe had to be re-driven for every arm because the tile is baked into the bundle, and the first reading of a candidate vector came from passing it to a scale-factor tool that multiplied a *different* base — 0.04 became 0.035 and 5.2 became 4.08, which is a 12% understatement of the spectrum. The exact-vector tool (`artifacts/grain/vector-stats.ts`) exists because of that, and the port of the generator was itself checked against the previous lane's recorded 6.35%/3.97% before any of its numbers were used.

## The gate

`test/surface-detail.test.ts`: the road's mip-0/mip-1 floors move from 0.045/0.025 to **0.08/0.045**, one new case holds the *shape* of the spectrum — the octaves must rise toward the fine end by 1.2x each, the fine half must outweigh the coarse half by 5x, and the mip-1 step must stay at or above the 3.97% the previous spectrum gave the far end — and the strength ceiling moves from 0.5 to 0.8. The shape case is the one the old gate could not make: the previous spectrum cleared its own floor while the certified frame drew the road flat.

Watched red first, twice, on the shipping case. Reverting the vector to the old six values **and** the strength to 0.45 fails the mip-0 floor with the measured value in the message, and the shape case with it:

```
AssertionError: road: mean neighbouring-texel step is 6.35% of albedo at mip 0 (p95 14.82%); the shipped-and-invisible
tile measured 0.36% on the road and 0.40% on the ground, and under about 3% is less than one display level:
expected 0.06354591245947225 to be greater than or equal to 0.08

AssertionError: the road's fine octaves must outweigh the coarse ones: expected 2.678571428571429 to be greater than 5
```

Reverting **only** the vector, strength left at 0.72, passes every floor — the old vector at 0.72 measures 10.17% at mip 0 — and fails the shape case alone at the same `expected 2.678571428571429 to be greater than 5`. That second mutation is the one the previous gate could not see: a tree that satisfies every step floor, with the strength raised to compensate, and a near field that would read as blotches. Both exits 1; the mutations and messages are in `docs/learning/gate-proofs.md`.

## Gates at this revision

Build 0 (`npm run build`, `index-DRmtpVMl.js` 981,080 bytes, SHA-256 `c890299c…`), typecheck 0, `npm test` 69 files / 500 tests green, audit 0, `npm run visual` 0 with certificate `b9d02f80d450203a`.

The worktree installs its own `node_modules` (`npm ci`) rather than junctioning the primary's, which was found **empty** at the start of this lane — the junction was created as instructed, found to resolve to a directory with no entries, unlinked with `rmdir` and replaced by an install. `data/scene` and `data/network` are real copies of the primary's (117 files, 301,674,209 bytes), verified by the certificate's own `sceneTreeDigest` coming back `1ebda662…`, the same digest the before arm binds. No `data/`-writing command ran. One reparse point existed at any point in this lane — the `node_modules` junction — enumerated with a command that prints its count.

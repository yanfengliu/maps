# Paired-lane review 244

**Decision: accept bounded local geometric feasibility.** The continuous pair resolves this inferred-strip conflict for the actual taxi at scale 1.04. Do not activate it or inherit the old upright route's authority acceptance. No Branch B source correction is justified or needed by this result.

## Between-pose evidence

The normalized separating-axis distances are valid lower bounds: retaining any positive axis proves separation, and subtracting the maximum motion of the relevant body or bodies preserves it between stations. The 4 m/m enclosure leaves 11.360899 mm pavement separation and 53.931336 mm separation for independently progressing opposite bodies. Pairs outside the tested station window have a separate 0.681825 m bound, comfortably exceeding one grid interval's possible movement; the window boundary does not leave an uncovered pair region.

I checked the sensitivity argument against the actual fitter and basis. Taxi axles are symmetric, so the intercept is the four-height average. Triangles 6609/6618 share their full edge and their areas exactly fill the convex union: height remains continuous when a tyre changes triangle. The gradient/tilt invariant closes (0.025748 slope < tan(0.027)); the plane update contracts by at most 0.288274. The projected-forward basis permits the stated outward derivative constants. The resulting 2.903941 m/m corner bound fits inside 4. The 1 micrometre termination allowance also exceeds the contraction tail from the fitter's 1e-8 stopping differences, including its effect on the rotated corner. These are local bounds for this symmetric axle set and two-plane sheet, not a general support theorem.

The 2.067569 m conservative tyre distance from the sheet boundary leaves substantial room for normal-contact displacement. The residual enclosure remains below 28.270 mm world against 52 mm allowed. The interleaved poses corroborate the result; they are not its sweep proof. The seven observed internal sheet-edge transitions are benign changes within the same continuous sheet.

## Obstacle coverage

The query includes every locally intersecting nonvertical pavement triangle at every height. Its exclusions are geometric portions covered by equal-or-higher ground road in the explicit 31-32.5 m band; the 38 m bridge cannot erase the lower obstacle. The unchanged raised witness remains red. The obstacle domain encloses the complete interval-expanded body domain, and the local ±25 m mesh window encloses it horizontally.

I independently inventoried the omitted XZ-degenerate geometry: all 25,531 such pavement triangles miss that expanded domain. Roads and terrain have none. This closes the potential vertical-riser omission for this maneuver only.

Only final leaf `data529.b3dm` intersects the domain; its 54 complete batch AABBs are clear. Ancestors 729/675/539/538/532 also overlap spatially, but `ERROR_TARGET=0`, `FinalLeafReadiness.canDisplay`, and the city visibility check reject ancestor display. Thus final-leaf screening matches the current renderer. The hardware base/head enclosure plus 1.1 m contains the current pole, arm, sign, housing and lens geometry; none touches the domain. The conservative tree/barrier screens are also empty. No native appearance or moving pedestrian interaction was checked.

## Authority and next step

Four fitted joins coincide within 4.14e-13 m. Only the two expected owners can be touched; other owners retain 19.825904 m separation. The retained reverse downstream halt is clear at the correctly mapped source progress.

The four recorded owner roots are refined observed transitions, not a proof that sampling found every possible owner entry/re-entry. Do not use these root values as a runtime release certificate. Reverse occupancy changes in both directions relative to the old path, so clearance at one halt cannot preserve the old release/receiving obligations automatically.

The smallest next implementation is one immutable, explicitly selected source-progress-to-physical-pose adapter for this named pair. Return source occurrence/progress separately from physical arc, fitted position/basis, wheel residuals and the actual projected envelope. Make halt validation, receiving clearance, entry/overlap/release observations and rendering consume that same pose. Preserve mapped controls and source visits; recompute their physical approach/release bounds conservatively. Physical speed and wheel spin must follow the approximately 18.821 m physical arc, not the approximately 18.252 m source arc.

Then run the fixed complete itinerary through that shared pose contract, retaining its existing refusal classes and completing only the remaining physical obligations. Keep default activation gated until a complete supported itinerary and native controls-driven event exist. Do not build a general lane solver or reopen source ancestry merely because later route sections remain red.

## Critical bindings

- Reviewed worker report: `434af71409c64e3b98a86a0cfc503d40af6a301c944a58398b221933d0bcb38b`.
- Sealed artifact digest: `da8d344d513818b2b53082203ef492205ac1f538a589fd89fb2048042808941b`.
- I rehashed all 76 sealed source/input/artifact records: zero mismatches. The seven-file freeze and original 773-in-strip negative packet remain exact.
- Evidence root: `C:/Users/38909/.codex/worktrees/traffic-turns/maps/artifacts/supported-opening229-20260927/paired-lanes244-next/`.
- Product baseline remains `d7a3642`; root reports current main `3a508e9` adds docs only. This review wrote only this file. One authorized read-only inventory ran; no fitter/sweep, browser, GPU, server, full gate or production edit ran.

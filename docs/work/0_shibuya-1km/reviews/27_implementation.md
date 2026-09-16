# Round 27 — style switching, verified against the real control

Owner: coordinator, recording a bounded verification lane. Base revision `63ee4fc`; the lane ran at `7c6bd95` first and re-ran in full at `63ee4fc` rather than report a stale revision, keeping the earlier frames in `frames-base-7c6bd95/`.

Evidence: `artifacts/style-switch/wt/artifacts/style-switch/REPORT.md`, SHA-256 `09caf47eb530f386455db44942ae25decbba85144d611fca7f8e3c1cb56158ff`. Lane files: `playwright.style-switch.config.ts` and `tools/style-switch/{support,switch.spec,registry.spec,pace.spec}.ts`, on port 4323, hardware renderer, pinning the served build bytes rather than building.

## The criterion

From `plan.md`: "Cartographic and Satellite each hold up at street, block and aerial distances. The actual World style dropdown switches both ways with pointer and keyboard input, preserves camera and simulation progress, and takes its options from a registry that can accept later styles."

## What the lane established

**Switching both ways through the real control.** Keyboard passes at all three distances and both directions: Tab twice reaches the `<select>`, one Arrow changes the value, and the control's own value, the bridge's style id and a fresh frame all follow. Pointer is partial, and the limit is in the browser rather than the app: the press focuses the control and opens the option list, and the lane measured the popup's own row grid from the pixels (25 px rows, option 0 at y 94-119, option 1 at 119-144), but a press on the correct row never moves the value. Chromium runs a native `<select>`'s popup in the browser process, outside renderer hit-testing, so synthesised pointer events cannot reach it. Two independent checks agree: a full-page screenshot contains the popup while a clipped screenshot of the same rectangle returns the description text underneath, and the repo's own `tools/visual/style-picker.spec.ts:29` has the same click-then-Home+Enter shape, so it never demonstrated a pointer-completed selection either. **Pointer-completed selection is therefore unestablished, not failed, and settling it needs an OS-level press or a person.**

**Camera preserved.** Worst world-path move across a switch is 23 µm at 950 m and the worst single axis is 18 µm, with camera distance 0 and the target unmoved: inside the 5 mm bound by about 217 times. The pre-switch residuals after `settle("preservation")` were 3.889 / 0.000 / 13.145 / 0.000 / 15.980 / 0.000 µm against the established 80 µm baseline, so all inside. The shape of the result is the stronger evidence: in the three cycles whose residual was exactly 0 the switch delta was exactly 0 on every component, and in the other three it was about 1.4 times the preceding residual, which is the damping tail rather than the switch. `app.setStyle` (`src/app.ts:378-388`) touches neither camera nor controls nor loop nor agents.

**Simulation progress preserved with the population running**, which is the part the population-free pixel lane cannot reach. Six cycles with `?agents=1`: ticks monotonic (4564 to 4754, through 11814 to 12329), 3,000 pedestrians active **and drawn** throughout, slot generations never reset, 0 authority violations, and identical drawn triangles and bounds across every switch (17,813 / 69,648 / 243,613). The switch changed 51-93% of the frame and the round trip 0.00-3.70%. The lane opened the frames at native resolution and reports agents present in both styles and after the round trip, on the same ground, with the geometry pixel-aligned.

**Registry extensibility proven with the app running**, not by reading. One entry added to `src/world/styles.ts` and nothing else — the picker diff was verified empty — and after a rebuild the real dropdown offered `cartographic, satellite, world-style-probe`, End selected it, the URL took `?style=world-style-probe`, it rendered 367,343 triangles, and a fresh boot honoured it. Reverted and rebuilt. This is the check that matters, because the existing `style-picker.spec.ts` is a DOM fixture with a hand-written array: it establishes that the picker reads its argument, not that the production app feeds it the registry.

## What it did not establish, and one defect in an existing claim

- **Pointer-completed selection**, for the browser reason above.
- **Appearance at the three distances** is the verdict review's, not this lane's; it did not pre-empt the capture in flight.
- **"The same pedestrian, on the same ground"** rests on drawn counts plus frames that were opened and looked at, because the frozen bridge publishes population counts with no per-actor identity or position. That is sufficient for the defect class at issue — a switch that keeps the counter and loses the agents shows a zero drawn count and an empty street — but it cannot name the same walker or measure a foot against the pavement. A bounded per-actor sample would settle it, and the lane correctly did not add one to a frozen surface.
- **A style-independent near-black ribbon** runs through the city at 220 m and 950 m in both styles and in the untouched before-frames. It is unrelated to this criterion and is recorded rather than diagnosed.
- **`hero.spec.ts`'s camera bound is described more tightly than it measures.** Its per-component `toBeCloseTo(x, 2)` compares azimuth and polar at 0.005 rad, which is about 4.75 m of camera swing at 950 m; the "five millimetre" claim covers only position, target and distance. The lane measured the honest world-path number beside it and did not change the bound. That sentence should be corrected where the bound is claimed, and the correction belongs with the visual-gate work rather than here.

## Disposition

The camera, simulation-progress and registry parts of the criterion are **met**, on `63ee4fc`, with the numbers above. Style switching both ways is met **for keyboard input and not established for pointer**, and that distinction is carried rather than smoothed over. No application defect was found, so nothing was changed.

## Handoff

The verification lives in an ignored worktree and is recorded here for that reason. The lane's own files are untracked in `artifacts/style-switch/wt`; if a later round wants them in the repository, they move into `tools/` as a lane rather than staying evidence.

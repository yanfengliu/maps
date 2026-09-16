# 2026-09-15 - the lifecycle check split by renderer, and why the fifteen-second bound was not the application

## What was believed and proved false

The frozen graphics candidate could not pass `npm run visual` because `tools/visual/lifecycle.spec.ts` timed out at its 15-second `page.goto('/?time=noon')` bound under the default software rasteriser, after an 18.4-minute preparation. The first reading was that the application blocks navigation while disposing the refined city. Three attribution arms plus a stage localisation turned that around: the application's own `pagehide` work (`picker.dispose()` plus `app.dispose()`) spans 2.4 ms with no context loss, 4.3 ms of app work when `WEBGL_lose_context.loseContext()` is forced inside the handler (the handler then spans 30,453 ms because the loss call itself blocks), and 2.1 ms on the hardware arm. The replacement document's own document-start script does not run until +27.87 s, so the block sits before any of the new page's JavaScript. The untouched check passes on hardware in tens of milliseconds of navigation.

What the numbers do not say: nothing separates deleting the outgoing context's resources from draining its last in-flight SwiftShader frames, and the cost is not shown to be independent of the scene's resource count - the 2026-09-13 trace of the same failure recorded 65 loaded tiles, `cachedBytes` 630,155,033 and `gpuBytes` 317,190,172. The bound must be re-measured when the scene grows.

## What a reviewer caught that the author missed

The independent review of the proposed correction accepted it with nine conditions and named the strongest counterargument: the change turns a user-visible stall into a documented footnote on the strength of one machine's runs, so it must not be recorded as an instrument fix without saying what was preserved. It also flagged that "roughly 400x margin" was measured against the commit mark rather than the `load` mark the bound applies to (the honest figures are ~136x on the 15 s bound and ~11x on the 60 s replacement step), that one diagnostic mark in the software arm annotated a load event that cannot precede its own document's start, and that the historical "36.5 seconds" claims in the defect register and gate proofs name no rasteriser and have no raw record - which it could not resolve, so they are now annotated as unverified rather than left to contradict today's red.

## What changed

- `playwright.config.ts` is the pixel lane only: `hero.spec.ts`, `style-picker.spec.ts` and `sweep.spec.ts` on SwiftShader, with `lifecycle.spec.ts` excluded and the `MAPS_VISUAL_GPU` launch-arg switch removed so the lane cannot silently move to hardware.
- `playwright.lifecycle.config.ts` is the hardware lane: `lifecycle.spec.ts` only, ANGLE on D3D11, same viewport, tracing, worker, `maxFailures`, webServer and preview port, separate output directories so neither lane overwrites the other's failure artifacts.
- `tools/visual/lifecycle.spec.ts` reads the unmasked `glRenderer` from the frozen harness before the expensive preparation, throws the named error when it names a software rasteriser, and writes per-run preparation/navigation/replacement times plus the build hashes to `artifacts/visual/lifecycle/`. The URL, preparation, viewport, 15 s and 60 s bounds and the noon-preset assertion are unchanged.
- `package.json`'s `visual` script runs one build, `verify-output.ts --begin`, the software lane, the hardware lane with `--repeat-each=3`, then `verify-output.ts`.
- `beginVisualRun` deletes any earlier `complete.json` before hashing the build, so a failed run cannot leave a previous run's success artifact behind; `test/visual-evidence.test.ts` gained that case and was made to fail by reintroducing the defect before the fix was restored.
- **Correction, 2026-09-16: that guarantee was wrong about the chain, and the deletion alone cannot give it.** `package.json`'s `visual` script runs `npm run build` before `verify-output.ts --begin`, so a failed build stops the `&&` chain before the deletion and the previous run's `complete.json` survives it. The finding is open on `main` at `04be817`; the fix sits uncommitted in the `artifacts/gate-hardening` worktree (`REPORT.md`, SHA-256 `03D88804406372843E6BECF767F3B66EB99F233990B04A675B56FB99671968EF`).

## Evidence and where it lives

Attribution report, proposal and independent review: `artifacts/lifecycle-attribution/` (`report.md`, `correction-proposal.md`, `review-runs/codex.md`). Software red baseline and its trace: `artifacts/gate-run-20260915/report.md`. The two red controls and the full-run logs: `artifacts/lifecycle-repair-20260915/gate-run/`. Gate text: the new entry in `docs/learning/gate-proofs.md`; the user-visible bound: the new 2026-09-15 entry in the defect register; the gate's own rules: `docs/policies/local-rules.md`.

## What remains open

Native inspection of the 44 software frames, independent review of the corrected instrument, and the merge to main. The 2026-09-08 "36.5 seconds" claim stays unverified until a run names its rasteriser.

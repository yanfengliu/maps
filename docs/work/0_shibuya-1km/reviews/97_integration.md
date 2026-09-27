# Review 97: integration

## Target

Repaired Cartographic facade candidate against main `116ad444fb30d40eadb6285425ab14e97afa7128`. The only product file is `src/scene/tile-materials.ts`, SHA-256 `020a75f7c249f66ec00f2c6e990a8248e58ebd41f4bbcb0aad9d11403cfdde5a`, independently matched in primary and the frozen worktree snapshot. Worktree `artifacts/facade-quality/filter-repair/code.patch` has SHA-256 `03084d9961783677473868a8bc8f09355a42635e238203227a329e0dd73f159b`; its repair-only patch has SHA-256 `92dd4813ab237db994023aef6ebb680977a5d0180596e8f5c83dd2db044baabb`.

Final primary `artifacts/visual/complete.json` identifies run `eff5f6082036d290`, completed `2026-09-27T06:10:51.570Z`, SHA-256 `0e369d2c1779bd68ce8b50d1959517de46ccb9113de9ebe4610e2df5b51221e1`. Review96 remains the immutable held original round, SHA-256 `b808f3c1d8c9baf95d0b18aa442395a071feb4c713629086ff5e93378a8266f0`; this review does not replace its evidence or turn its original candidate green.

## Reviewers and coverage

Codex `visual_critic` independently reviewed the actual original and repair diffs, surrounding shader, raw motion evidence and measurement interpretation. It inspected all 44 final primary PNGs individually at native 1280 by 720: all eight `hero/hero-{satellite,cartographic}-{dusk,noon}-{crossing,approach}.png` combinations and all 36 `sweep/{satellite,cartographic}/{plaza,block,overhead}-az{000,060,120,180,240,300}.png` combinations. All 44 digests matched the final certificate. Root separately inspected eight final native views and checked the integrated freeze/build/lifecycle bindings.

Before the final gate, this reviewer inspected every frame `ascent-00.png` through `ascent-31.png` in both `filter-repair/az120-repaired/capture` and `filter-repair/az240-repaired/capture`: 64 repaired native frames. Untuned az240 baseline and held comparisons covered frames 00, 07, 10, 16, 20, 24 and 25 in each arm, covering all six radius levels and an adjacent final pair. Original az120 baseline/held pairs 07/08, 10/11, 16/17 and 23/24 were inspected in Review96. These were frame-by-frame native inspections, not continuous playback.

All 209 records in worktree `artifacts/facade-quality/filter-repair/motion-evidence.json` matched their hashes, binding 128 new motion PNGs, 64 retained baseline/held az120 PNGs and the manifests, reports and instruments. Its SHA-256 is `d11dab238b3afc91af776c7d122fbe7292aa3af9098179b8674603414f634d6a`. All ten preliminary images under `filter-repair/heroes/{hero,style-return}` were also inspected and hash-checked; eight heroes are bound by `hero/hero.json`, SHA-256 `c3f75a87e070b355efc515bb7c68aec63f663e0a1c614318731f4c8f2378c6dc`.

## Reports

### Codex visual_critic

The original structural gain survives the repair: framed inset glazing, plinths and three coherent facade families improve Cartographic street and block readings. Final aerial views retain clean building masses without an identified new static moire band. Satellite photographic shading and its procedural fallback remain unchanged in source and retain their expected appearance in all 22 final Satellite views. This is procedural articulation, not recovered source facade truth.

The concrete sampling defect is corrected. The helper integrates the periodic interval using a cumulative function, including negative coordinates and footprints crossing periods; the positive footprint floor avoids division by zero. Split pane intervals remove the central mullion, and the far duty cycle now removes that same area. Multiplying the two axis coverages is a documented bounding-box approximation for a skewed pixel footprint, not exact integration over an arbitrary projected parallelogram. Colors, families, material response and the existing detail/relief fade thresholds remain unchanged. No blocking source defect was identified in this bounded repair.

The distance-filter behavior was actually exercised. Repaired az120 covers 220, 307, 429, 598 and 835 m; the untuned az240 baseline, held and repaired arms each reach 1100 m through those levels. Near framed glazing remains structured, then resolves into quieter distant surfaces. Across the inspected adjacent frames and transitions, no introduced discrete facade flash, material pop or phase-changing moire band was identifiable. This supports bounded acceptance of the changed material in these views. It does not demonstrate zero pixel aliasing or universal temporal stability; the arms are short, roughly half to nine-tenths of a second, at 720p. The held az120-only 1100 m endpoint remains unmatched and was not used as A/B proof.

The raw residual has not improved. Repaired az120 reports a worst residual of 0.02472874 with all 31 pairs failing; pair07 to08 is 0.00728746 versus held 0.005656. Untuned az240 baseline/held/repaired worst residuals are 0.0885078/0.0982710/0.1107575, with all 31 pairs failing in every arm. Every scene verdict remains `not-established`. No threshold, scene verdict or metric was changed, waived or presented as green.

The interpretation correction was independently checked against raw PNGs. On original probe2 pair07/08, baseline hard-feature counts 2225/2242 permit at most 4467 XOR pixels; on pair10/11, counts 1080/1045 permit at most 2125. Both maxima are below the fixed threshold of 4588.02 over 917604 pixels, so those baseline arms could not fail even if every selected feature flipped. Candidate feature counts and XORs are higher, proving more hard-feature changes without attributing them to introduced crawl. The fitted translation is integer (0,0), while fixed radius still permits fractional, depth-dependent motion. The unchanged local-rules moving check and `snapshots/q3-motion-capture-review43.md` already document legitimate fractional-motion false positives. This limitation is a reason to use the native material evidence, not an automatic candidate acceptance or a global diagnostic pass.

Broader defects remain visible: repeated procedural templates, bright flat faces at some sunset orientations, dark Satellite roofs, green/blurred/stretched source atlases, decorative sign/tree cues and an empty city. Data limitations constrain geometry and photographs; material treatment and authored cue quality remain separate issues. This increment does not finish the Shibuya visual goal or establish the populated performance target.

## Findings and disposition

| ID | Finding | Disposition and reason | Bound or remaining work |
| --- | --- | --- | --- |
| — | Cartographic structural/material improvement remains visible in the certified final set. | Accept this scoped gain; no identified blocking still regression. | Procedural families still repeat; source fidelity is not claimed. |
| — | Periodic coverage and far mullion duty cycle were inconsistent in the held source. | Repaired coherently; source review and changed-band native sequences support acceptance. | Skewed footprint integration remains an explicit approximation. |
| — | No material introduced flash/pop/moire was identifiable in the inspected repaired sequences, including untuned az240. | Bounded material-regression criterion accepted on actual visual evidence. | Finite frames and representative paths do not prove all-camera or whole-scene stability. |
| — | Whole-scene motion residuals remain red and their model cannot uniquely attribute the changes. | `sceneVerdict: not-established` stays open under the unchanged policy. | Do not advertise a numeric motion improvement, universal shimmer fix or full Q3 pass. |

## Verification

Read actual primary logs and receipt under `artifacts/facade-quality-20260927/repair-verification/`: build, typecheck, unit, audit and visual exit 0. Unit results report 85 files and 738 tests. The existing build chunk warning and two moderate audit advisories remain. The visual lane records 4/4 appearance tests, all 44 frames, and three hardware lifecycle repetitions with completed teardown on RTX4090 driver616.64. The verification worker ran these gates; this reviewer did not rerun them. The cleanup receipt reports zero new Node/Chromium processes and zero listeners on port4319.

The final build certificate binds `dist/assets/index-BXfxsMWC.js`, SHA-256 `e9fceeacea0d30dab3e93f3efad4423a4b4c56066a3dca0599c1b119fe49da3f`. Source, certificate, patch and motion binding hashes were independently checked; all 44 final image hashes matched before native review. The certificate establishes capture/build/lifecycle provenance, not visual acceptance or whole-scene motion stability.

Original and repaired probes remain retained. Root records the mechanically hash-matched copy at primary `artifacts/facade-quality-20260927/retained-worktree/{facade-quality,visual-quality}`, bound by its evidence manifest; the inspected bindings above refer to the original worktree files. The original final certificate/images remain under `repair-verification/held-eb71`. Review96 is unchanged.

This reviewer launched no browser, server or renderer, edited no product source and left no task-owned persistent process. Only this new authored report was written for this round in the allocated idle implementation worktree.

## Round outcome

Accept the exact repaired candidate as a bounded Cartographic facade milestone. The concrete coverage defect is addressed, the final 44 stills retain the structural gain, and representative changed-band plus untuned native sequences reveal no blocking introduced material regression. The red whole-scene motion diagnostic remains separately open and must be reported as `not-established`. Root owns final integration, delivery and the broader visual goal; this is not a blanket temporal or whole-deliverable pass.

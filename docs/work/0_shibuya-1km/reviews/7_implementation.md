# Review 7: implementation

## Target

The bounded F6 pedestrian reference repair in the maps checkout based on main `1ca4552ceee25e34ac62335114bbb5377a4d6470`. The reviewed target is an ignored, recoverable diagnostic for commuter-male/near, not a production/schema change. Its final source, inputs, scripts, reports and visual output are retained in `artifacts/agents/contact-reference-next/handoff.json`, SHA-256 `7406e5f18724cd7b481afdbc3666c367ad5523d647b90ced18bdaf89d03f32e0`, binding 155 local files and eight external references. The separate CPU handoff is `09caf771a222e44a1ff559c729aedb5b4ca2c083bc335b7b4ca545f4c314c81f`. Review 6 and its rejected controller/evidence remain unchanged.

## Reviewers and coverage

The asset worker, `status_evidence`, authored the extraction, serialized reference check, adapter and paired diagnostic. The report below is self-authored implementation and verification evidence; it is not an independent review of that pipeline. The worker inspected all 36 native 720×960 frames individually, including the short-stop sequence.

The root orchestrator separately read the source/check/report evidence, independently verified all 163 final handoff digests with zero mismatches, and inspected paired steady t38 profile and turn t40 three-quarter views at native resolution. Root accepted the bounded reference proof and retained the naturalness rejection. That independent coverage does not establish all-LOD or production correctness. The ten continuous clips are retained; neither the authored report nor root disposition claims that every decoded video frame was manually inspected.

## Reports

### Asset worker: source and serialized reference

The previous failure had two recoverable causes: a joint reference from a different pose than the idle VAT, and glTF's four-influence export truncating some of the source's complete skin weights. The source rig's evaluated bind matrices require a dependency-graph update after its floor translation. Those previous failures remain preserved in `artifacts/agents/contact-reference/`; this round does not replace them with a passing summary.

The extension evaluates all 32 walk frames, all 16 idle frames and five controlled `foot_l` +10 mm perturbations from the exact retained source blend and frozen recipe. The selected drawable denominator is 21,044 vertices. There are 935 vertices requiring complete sparse influence overrides, with at most six influences. The actual serialized supplement is 28,148 bytes for sparse rows and 162,816 bytes for 48 × 53 joint palettes, totalling 190,964 bytes for this variant/LOD. Perturbation palettes are separate diagnostic data.

The checker reloads float32 matrix and weight bytes and covers eight samples per frame interval, including both clip wraps: 384 samples and 8,080,896 vertex samples. It matches the renderer's linear VAT sampling by linearly blending independently evaluated endpoint geometry and the matching palette entries. It does not equate matrix interpolation with rigid-pose interpolation or Blender's analytic fractional-time pose.

All samples pass the original per-component half-float quantization bound plus 1 µm numerical allowance. Maximum reconstructed-reference/source error is 0.646746 µm; maximum reconstructed-reference/VAT error is 0.491908 mm. All five perturbed full meshes pass the same bound. The zero-correction identity error is 2.22e-16 m. A wrong idle palette applied to walk phase 0.25 fails at 147.698 mm, with 31,094 component comparisons outside the quantization bound. Independent source comparison and that red control matter because zero correction alone is an algebraic identity.

### Asset worker: F6-only rendered comparison

The paired experiment keeps controller functions/constants byte-identical at SHA-256 `368d7d6ce7cb913687c43ab3932e6dbafd6b0ce8d4a9407cf82fdde51410503c`. Its separate adapter, SHA-256 `5db360e1c1f9cb48dd2c7fc8416a4084c59319247216cf4a25a62d8752729f6d`, supplies matching idle0 joint worlds and complete weights. Original idle VAT, additional pelvis-drop floor, reach/timing policy and idle upper body remain. All authoritative position/yaw/speed samples are identical across the comparison.

The adapter reproduces independently evaluated idle source within 0.590704 µm. The wrong bind reference differs by up to 517.494 mm. Corrected initial hip origins move down 35.000 mm; initial foot targets change by less than 7 µm and leg lengths by less than 0.15 µm. The browser payload is checked across 631,320 full-vertex comparisons, with exact agreement to the controller point function and at most 0.151902 µm float32 packing error.

The native comparison shows improved knee/foot and trouser correspondence. Gross new separation of clothing or limbs was not observed in these near views. Crouching and straight idle arms remain in steady, stop/restart, turn, slow and stress cases. The unchanged policy reaches 140 mm additional pelvis drop. This candidate remains unsuitable as a natural walking result.

The raised shoe in steady t38 is real. The exact saved float32 drawing payload puts the original shoe minima at 70.000008 mm in `move` and 0.000005 mm in `plant`; the corrected values are 70.000000 mm and -0.000002 mm. The check covers all 807 selected drawn shoe vertices per foot across the 2,686 captured frames. It stores separate controller-plant and geometric-proximity intervals. A planted-only metric does not judge the other shoe's lift height or naturalness. No captured sample has both shoe minima above 15 mm, but this is not proof of pressure/contact, behavior between samples, or grounded stance throughout a real world trajectory.

### Root orchestrator: independent disposition

Root accepted the bounded F6 reference proof after inspecting the source/check/report evidence and independently verifying the frozen digests. Its native comparison agreed that leg/foot correspondence improves while crouching and static upper body remain. Root approved a later artifact-only F7 sequence with separate posture-floor, source-verified upper-body, and measured source-timing experiments. No F7 change or production adoption was accepted in this round.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F6 | Bone correction and delivered VAT used different reference poses; four exported weights also omitted part of the actual source skin. | Resolved within the one-variant/near diagnostic through matching palettes and complete sparse weights, supported by independent source, wrong-reference and perturbation checks. Production resolution remains pending. | Retain the frozen supplement and source proof; cover the other eight variant/LODs, normals and shipping passes before changing the unshipped schema. |
| F7 | Contact metrics passed while the figure crouched and kept idle arms. | Still rejected for naturalness. Correcting F6 alone does not repair posture or timing. | Root-approved separate artifact experiments: remove only the unconditional extra-drop floor; verify an authored-source upper-body intervention; then propose one timing replacement from measured source motion. |

## Verification

The pinned headless Blender extraction exited 0 in 3.840 seconds. The serialized/fractional checker passed in 3.200 seconds. The paired CPU preparation passed in 3.713 seconds. The source, complete influence mapping, selected drawable denominator, float32 layout, checks and limits are preserved in the frozen handoff.

The captured manifest is `artifacts/agents/contact-reference-next/capture-1789255802140/manifest.json`, SHA-256 `a9f08340a1826d07c948ad1d24899f1cb897122143926d2910aeddf2ce4d57be`. Capture took 155.786 seconds and produced 36 native frames plus ten continuous clips containing 2,686 frames. All 179 CPU/input/build/output comparisons in `visual-verification.json` matched. Root independently verified the final 163-file handoff. These are different denominators because the comparison record includes repeated references.

Normal context/browser/browser-server/HTTP-server cleanup completed. A fresh targeted check found all 15 positively identified task process IDs absent and port 4320 closed. No fallback termination was used. The reviewed safe capture used direct spawned handles and membership reported by its dedicated browser session, never inferred PID ancestry.

This round does not run or claim the repository's final five gates. It changes no production code or schema. Other variants/LODs, deformed normals, production GPU arithmetic/cross passes, world support and turning contact, naturalness, and 3,000-pedestrian performance remain outside this proof. CPU JavaScript arithmetic on reloaded float32 data is not a shader-performance measurement.

## Round outcome

The bounded F6 reference proof and causal rendered comparison are accepted as an intermediate diagnostic unit. F7 remains rejected, and production asset integration is unfinished. Root retains canonical status and will decide the exact reviewed checkpoint to commit; this report does not itself claim a committed or fully verified Shibuya deliverable.

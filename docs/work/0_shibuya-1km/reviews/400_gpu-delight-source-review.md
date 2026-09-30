# 400 — GPU de-light source review

2026-09-30. Independent reviewer: fresh397. Implementation owner:370; integration owner:root. **Round1 vote: HOLD.** Root accepted the three findings and admitted one collected correction round. This report preserves the inspected candidate; it does not review the changing correction.

## Inspected bound

Read-only review of the uncommitted candidate in `C:/Users/38909/.codex/worktrees/crossing-frontage/maps`, checkout HEAD `30c0a6d0d7eb9e4c217844bd8f416b26e89d5ae1`, with runtime base `c201b1723d287ad73b52c7227f4e97256190069b`. All eight supplied SHA-256 hashes matched the actual files. Line references below belong to these frozen bytes and may change during correction.

| Inspected path | SHA-256 |
| --- | --- |
| `src/render/atlas-delight.ts` | `4b0f95cc8767374391403b2415b3c6d049a5353b7165f74ab24f04b8b609f823` |
| `src/scene/buildings.ts` | `5e4f853be67c91213c2774ab2bdf1816dfc5e7466e45a573332f620a187bbe7d` |
| `src/scene/facade-textures.ts` | `862fadec32c7d60bab01fb9f7fe708de25ea66f17d99f6e5d63140af7d8fa2ca` |
| `test/atlas-delight.test.ts` | `555b0fc048e53bac20b55f78d7fd55ae4defc2ba62ae9f5a1a43b5a9890d6f4c` |
| `test/facade-gpu-owner.test.ts` | `830e9667bf5380298e29caf27584efd661b6d30174e679ba0e9a1e1130d05e2b` |
| `test/facade-emission.test.ts` | `b9ec9d96bc07536fded266c7686c18c1382003a5bc9586fabc7f01682f46daf0` |
| `test/crossing-corner-material.test.ts` | `edc9295bb70aa38357a35689ed0b55386885b75f2877d3c890d96790aa3f7a2c` |
| `test/rail-runtime.test.ts` | `60f27f03996a76529158fb6440d828c3fb4c4473756398cba20bb95c2808faf3` |

Read scope included the actual diff, new files, direct ownership/readiness interactions, the unchanged CPU oracle and relevant installed Three0.180.0 / 3d-tiles-renderer0.5.2 sources. Installed-source line references identify the inspected behavior; this round did not independently hash those dependency files. No source, artifact or Git mutation, runtime probe, browser, GPU, server or gate ran during the review. This authored document is the subsequent authorized write.

## Material findings

### F1 — P1: default-path rejection leaves parsed resources outside cleanup

`src/scene/buildings.ts:331–333` selects the unprotected parser path when no rail transaction exists. A GPU failure or owner-close rejection from the facade hook escapes installed `TilesRenderer.js:793–797` before its resource collection and `engineData.scene` assignment at793–869. Later `disposeTile` releases resources only when that scene exists, at `TilesRenderer.js:882` onward. The new unadopted set in `src/scene/facade-textures.ts:218–259` releases generated replacement DataTextures, but does not own the original parsed geometry, materials, textures or ImageBitmaps.

Required correction: protect the normal rejection/cancellation boundary and verify unique release through the actual parser, including failure after one prepared atlas and owner closure during awaited resize. Existing transaction protection may be reused for normal and trial paths; no new private seam or dependency is admitted. This is a source-established missing cleanup path, not a measured native allocation leak.

### F2 — P2: borrowed viewport/scissor state is incompletely restored

`src/render/atlas-delight.ts:153–159` snapshots the target and logical scissor enablement, but not the actual active viewport/scissor rectangles. Its restoration at246–247 rebinds target defaults and then applies the logical global scissor setting. Installed Three's `getScissorTest` returns `_scissorTest` at `WebGLRenderer.js:776–778`; `setRenderTarget` instead applies a bound target's rectangles and `scissorTest` at2775–2805. Overrides made with `setViewport` or `setScissor` after binding a target are therefore lost. A logical global false setting with target scissor true returns with actual scissoring disabled.

Required correction: preserve logical and actual active state separately, including pixel ratio, target face/mip and differing prior overrides. `test/atlas-delight.test.ts` does not model `setRenderTarget` applying target scissor enablement and uses matching prior scissor booleans, so its green assertions do not cover this failure. No runtime state reproduction ran in this review.

### F3 — P2: fullscreen geometry generates NaN bounds during real rendering

`src/render/atlas-delight.ts:130–133` supplies a two-component position attribute while the Mesh retains default frustum culling. Installed `WebGLRenderer.js:1759` calls `Frustum.intersectsObject`, whose geometry branch at `Frustum.js:158` computes the bounding sphere. `BufferGeometry.js:757` reads each position through `Vector3.fromBufferAttribute`; that reads `getZ`, so the final vertex exceeds the six-element array. The resulting radius is NaN and reaches the installed console error at `BufferGeometry.js:795`. Three's own fullscreen triangle uses three-component positions in `examples/jsm/postprocessing/Pass.js`.

Required correction: use valid three-component positions, or explicitly bypass fullscreen culling with corresponding coverage. The mocked renderer never projects/culls the mesh, so it misses this path. This is a source-predicted rendering error, not a runtime observation.

## Remaining acceptance

The inspected source otherwise preserves original-mask-before-transform ordering, geographic caps, final DataTexture construction, style reuse and fulfilled readiness. Production CPU dual work is absent. CPU-oracle injection preserves the existing eligibility tests' scope, but rail tests with `delight:null` do not verify GPU ownership.

The reported53 focused passes and typecheck were not rerun by this reviewer. Exact alpha/maxRGB difference1, shader/context/readback execution, native Satellite appearance, matched whole-city startup improvement, complete lifecycle behavior and all five gates remain pending. Source HOLD cannot be replaced by a future hardware success claim. A focused re-review must bind refrozen correction bytes before another vote; append that round here.

## Round2 — focused correction review

2026-09-30. Independent reviewer: fresh397. **Vote: HOLD, one material state-restoration finding remains.** The collected correction resolves F1 and F3 by source inspection. F2 is corrected for the inspected bound-target case, but not for an ordinary null target under fractional display scaling. Findings were sent to root and370 before this append. No runtime, gate, browser, GPU, server or Git mutation ran; the reported57 focused passes/typecheck were not rerun.

### Exact inspected bytes

The corrected candidate remained uncommitted in the same frontage checkout. All nine supplied product/test hashes matched actual bytes. Five changed paths are bound below; the four unchanged paths were also rehashed against Round1: `src/scene/facade-textures.ts`, `test/facade-gpu-owner.test.ts`, `test/facade-emission.test.ts` and `test/crossing-corner-material.test.ts`, with their complete hashes retained in the Round1 table.

| Corrected path | SHA-256 |
| --- | --- |
| `src/render/atlas-delight.ts` | `29b2d4f62a25a472498b3f924022d2a68baa4f315e6c820c2db9a6cd53f658a2` |
| `src/scene/buildings.ts` | `cc8675eb865f00a5c3710a8b45dd367670ec2cbd1034f32c9ed913627991dd33` |
| `src/scene/tile-transaction.ts` | `cb8c136cfc9ce2ad8ccb7e24351572f87491ca06d7f01cc991a6485cda27c7ef` |
| `test/atlas-delight.test.ts` | `a96e93671b250f6a97b2f19736b9eb411d2402d0ebb9e13bc73da14591d4298d` |
| `test/rail-runtime.test.ts` | `2ec8ea1423a81e724fef8dcdf6e3386738d5b9688b6c72425bf9e063dae9330b` |

### Resolved findings

**F1 resolved in source:** `src/scene/buildings.ts:251` installs the existing parser transaction for normal and trial paths, and the facade wrapper at334–335 consistently enters it. The existing staging/resource capture, transfer and finally-release behavior now protects normal pre-accounting rejection. No new private seam or dependency was introduced; `tile-transaction.ts` changes only its scope description and error labels. New actual-parser tests exercise both modes, failure on the second atlas and owner disposal while resize awaits; their source asserts unique original-resource/ImageBitmap release and no late processor call. Runtime ownership qualification remains separate.

**F3 resolved in source:** `src/render/atlas-delight.ts:105` now consumes vec3 positions; its triangle at133 has valid three-component vertices and disables fullscreen frustum culling at137. The test checks attribute size/count and culling state. This removes the reviewed getZ/NaN path; no real render ran in this round.

### F2 remaining — P2: null-target restoration fails at fractional pixel ratio

At `src/render/atlas-delight.ts:263–266`, restoration first rebinds the prior target, then calls the logical viewport/scissor setters. The temporary-target correction at267–282 only runs when `previousTargetState` is non-null. Installed Three's `setRenderTarget(null)` floors logical dimensions after pixel-ratio scaling (`WebGLRenderer.js:2781–2782`), while `setViewport` and `setScissor` round them (`WebGLRenderer.js:730,767`). For a valid prior null-target state at pixel ratio1.5 with logical viewport width101, the captured active width is151 after rebinding; the restoration setter changes it to152. Validation at288–294 then throws, turning an otherwise completed atlas pass into a load rejection.

This is an ordinary product state: `src/render/renderer.ts:36` permits fractional device pixel ratio, and installed `EffectComposer.render` rebinds its previously active target at the end of each frame. The example is derived from the inspected implementations, not a runtime reproduction. Current unit state coverage fixes pixel ratio at2 and starts with a non-null target, so it misses the floor/round distinction.

Required correction: preserve the captured null-target active state as well as logical values, respecting both public-setter and target-rebind rounding behavior. Add focused fractional-ratio, odd-dimension null-target cases for prior state established by each path. Keep the strict restoration assertion; weakening it would hide the changed state. The bound-target logical/actual state distinction and borrowed target-property restoration otherwise look corrected in source.

Numerical equivalence, native appearance, matched startup improvement, complete hardware lifecycle behavior and all five gates remain pending. Another source vote must bind the next refrozen bytes; this round grants no product acceptance.

## Round3 — final focused source correction review

2026-09-30. Independent reviewer: fresh397. **Vote: ACCEPT within the focused source-review scope.** No material source finding remains in F1–F3 or the direct correction interactions inspected. This vote does not establish runtime numerical equivalence, appearance, startup improvement, hardware lifecycle success or final product acceptance. The reported63 focused passes/typecheck were not rerun by this reviewer. No runtime, browser, GPU, server, gate or Git mutation ran; only this authorized report append was written.

### Exact inspected bytes and corrected handoff scope

All nine current candidate hashes supplied by370 matched actual files in the same frontage checkout. Three paths changed from Round2: the GPU module, its focused tests and `test/rail-runtime.test.ts`. The initial two-path/other-seven-unchanged handoff was inaccurate. Root and370 explicitly corrected it before this vote: the rail test contains the additional requested rejection case after atlas adoption. The other six hashes are unchanged. The Round2 record remains bound to the bytes actually inspected in that round.

| Round3 path | SHA-256 |
| --- | --- |
| `src/render/atlas-delight.ts` | `a387dbcdee9baea7e34987f8a480a01bc11e7dfb726430ff2968d37ddc381396` |
| `src/scene/buildings.ts` | `cc8675eb865f00a5c3710a8b45dd367670ec2cbd1034f32c9ed913627991dd33` |
| `src/scene/facade-textures.ts` | `862fadec32c7d60bab01fb9f7fe708de25ea66f17d99f6e5d63140af7d8fa2ca` |
| `src/scene/tile-transaction.ts` | `cb8c136cfc9ce2ad8ccb7e24351572f87491ca06d7f01cc991a6485cda27c7ef` |
| `test/atlas-delight.test.ts` | `85800090464860a56410fd976ec474a120bd40e36f1e4d8d6d9a4dbe68fb5efa` |
| `test/facade-gpu-owner.test.ts` | `830e9667bf5380298e29caf27584efd661b6d30174e679ba0e9a1e1130d05e2b` |
| `test/facade-emission.test.ts` | `b9ec9d96bc07536fded266c7686c18c1382003a5bc9586fabc7f01682f46daf0` |
| `test/crossing-corner-material.test.ts` | `edc9295bb70aa38357a35689ed0b55386885b75f2877d3c890d96790aa3f7a2c` |
| `test/rail-runtime.test.ts` | `75cd9e6ba7e2aeb2d485b776b2863ba2c7b2f657257c6322c5f5474d82f650b1` |

### F2 resolved in source

`src/render/atlas-delight.ts:263–275` restores null-target scissor enablement and rebinds null, establishing Three's FLOOR-scaled state. It then compares the captured physical viewport and scissor independently and invokes only the public setter needed to reproduce each prior ROUND form. The pass does not change their logical values. This preserves mixed FLOOR/ROUND states and avoids a final null rebind that would undo a ROUND restoration. Bound-target restoration remains separate at277–298, including temporary active overrides, restored target properties and logical globals. Strict physical/logical verification remains at299–309.

The installed Three implementations inspected for this correction update both renderer current rectangles and `WebGLState` caches through `setRenderTarget`, `setViewport` and `setScissor` (`WebGLRenderer.js:730,767,2775–2805`; `WebGLState.js:1121–1141`). The repair introduces no raw GL viewport/scissor writes or renderer-state shortcut. Source inspection therefore supports cache coherence for the next draw; it is not a measured next-draw hardware result.

`test/atlas-delight.test.ts:154–176` covers all four independent FLOOR/ROUND combinations at pixel ratio1.5, with logical viewport101×67 and scissor47×33 and odd offsets. Its double now models installed FLOOR target binding and ROUND public setters separately. Each case checks the retained logical getters, physical rectangles, null target and scissor enablement. Existing bound-target, controlled-pass-failure and controlled-readback-failure coverage remains. No assertions were weakened to close F2.

### F1/F3 carried forward and added ownership coverage

The F1 product ownership files retain their Round2 hashes. The added rail-runtime case deletes source batch IDs so preparation rejects after a replacement DataTexture has already been adopted; both normal and trial cases assert unique original geometry/material/texture/ImageBitmap release, replacement disposal and no repeated release on owner disposal. This strengthens the direct ownership coverage and does not change product behavior. The numerical GPU operation is bypassed in that particular ownership fixture, so it supplies no numerical execution proof.

The module retains valid three-component fullscreen positions and disabled frustum culling, preserving F3's source resolution. The earlier mask ordering, caps, DataTexture/sampler/UV, style reuse and fulfilled-readiness observations retain their scoped source conclusion. No ignored hardware fixture was inspected in this round. Independent hardware numerical verification, native Satellite review, matched production startup measurement, lifecycle qualification and the five final gates remain required before integration acceptance.

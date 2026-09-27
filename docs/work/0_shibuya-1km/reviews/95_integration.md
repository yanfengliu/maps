# Review 95: integration

## Target

Maps lighting milestone against base `2871bd5`, covering `src/scene/time-of-day.ts`, `src/scene/signage.ts`, `src/world/styles.ts`, and the description-only change in `test/road-tone.test.ts`. The retained exact patch is `artifacts/visual-quality/candidate2/code.patch` in the implementation worktree, SHA-256 `89e377fdbfe300cf71dd2a5308786784796fe44e99cfa3b04c917b5c74a41fc6`. The four primary file hashes match the frozen candidate byte-for-byte.

Final evidence is primary `artifacts/visual/complete.json`, run `dd191bfcde4c14ed`, completed `2026-09-27T02:05:13.298Z`, SHA-256 `a6b0c7d11ed0355f486499bb58e245c6ee0ea26fabdb4ffb9d54f09f0e983897`. All 44 image hashes independently match that certificate. The certificate binds their source build, scene, harness and RTX 4090 renderer with driver 616.64.

## Reviewers and coverage

Codex `visual_critic` independently reviewed the exact source diff and surrounding lighting code, then viewed twelve final primary images individually at native 1280 by 720 resolution: all eight `hero/hero-{satellite,cartographic}-{dusk,noon}-{crossing,approach}.png` combinations, plus `sweep/{satellite,cartographic}/block-az120.png` and `sweep/{satellite,cartographic}/overhead-az240.png`. These paths are relative to `artifacts/visual/`; their exact digests are in the certificate above.

The baseline review covered the same twelve historical certified images from run `8d70420e07afbfa7`; candidate review additionally compared fresh unchanged baseline heroes in the implementation worktree. Frozen candidate2's 46 PNG hashes all matched its image manifest, SHA-256 `345dbe9a8bd0b03d21ee7aab51a90800d7731d977b36e2159dd2fbccf8282360`. Historical images are comparison evidence, not current verification. Root separately owns inspection of all 44 final frames. This reviewer launched no browser, renderer or server, ran no product gate, changed no product code, and used no further reviewer agent.

## Reports

### Codex visual_critic

Accept as a modest, bounded lighting improvement. The dusk crossing's pavement is visibly less dominant, so the eye returns more readily to the buildings and crossing. The sunset's warm area is narrower and less theatrical. Daylight has a paler horizon with clearer skyline separation; its facade improvement is modest. Both styles retain their identity and the inspected block and overhead views show no material new loss of road/building separation.

The implementation stays within the existing rendering architecture: authored sky radiance and exponents, environment fill, luminance-preserving hemisphere desaturation, street fill reduced from 70 to 38, and slightly darker sidewalk palettes. Source geometry, texture policy, simulation and controls are unchanged. The test edit corrects its description of scalar-intensity coverage and leaves assertions intact. No blocking source defect was found.

This does not deliver the broader visual ambition. The nearest Satellite dusk roofs remain nearly black. Satellite still has green-tinted, blurred and stretched photo textures. Cartographic dusk still reads as a fairly uniform grey-blue model with repetitive windows; noon pale roofs and plazas still merge in places. Authored signs and local light pools remain visibly separate decorative cues. More exposure does not establish recovery of missing source detail, and this review does not claim it did.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| — | Dusk pavement dominated the crossing and sunset colour occupied too much of the backdrop. | Improved in the reviewed final frames; supports this bounded milestone. | No further repair required for this increment. |
| — | Dark Satellite roofs, source texture limits and repetitive Cartographic facades remain. | Explicitly unresolved visual limitations; the orchestrator scoped this increment to lighting rather than claiming full appearance acceptance. | Preserve in the broader visual-quality queue; no claim that these criteria passed. |
| — | No material new code or visual regression found in the reviewed scope. | Reviewer recommends acceptance; root owns the final disposition and delivery. | Complete root's full-frame acceptance and delivery checks. |

No new blocking finding ID is allocated. The initial broad art-direction criteria are only partly met; this narrower acceptance does not waive them for the whole deliverable.

## Verification

Read the actual primary verification receipts under `artifacts/visual-quality-20260926/verification/`: build, typecheck, unit and audit exit 0; unit output records 85 files and 738 tests passing. Build retains its chunk-size warning. The high-threshold audit passes with two moderate Vitest-related advisories; no dependency was changed. These gates were run by the verification worker on root's behalf, not this reviewer.

The visual log records the complete 44-frame appearance set and three passing hardware lifecycle repetitions, with completed teardown in each. Final wrapper certification succeeded. Independently hashed all 44 certified PNGs, checked the retained patch digest, compared the four primary code/test hashes with candidate2, and inspected the twelve final images named above. This proves evidence binding and bounded appearance review, not artistic quality from an automated predicate.

No population, locomotion, contact, temporal flicker or performance acceptance is added. Still-image review cannot settle moving-image behaviour. No interactive manual review was run by this reviewer. No task-owned persistent process or temporary artifact was created; only this authored report is added to the allocated idle implementation worktree.

## Round outcome

Recommend landing the exact reviewed lighting milestone after root's acceptance checks. The actual gains justify this small change, with no blocking finding in the inspected scope. The report is not full visual-quality acceptance or completion of the Shibuya deliverable. Commit, merge, push, whole-frame root inspection and final resource cleanup remain root-owned.

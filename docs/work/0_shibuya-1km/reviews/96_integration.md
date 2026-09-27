# Review 96: integration

## Target

Cartographic facade candidate against main `116ad444fb30d40eadb6285425ab14e97afa7128`. The only product change is `src/scene/tile-materials.ts`, SHA-256 `bbcefaade87d5ff005d57fb4cd4d5ce42eb7b8a15574f699d328167f1750acf3`. The implementation worktree retains its exact patch at `artifacts/facade-quality/code.patch`, SHA-256 `48505aa0978215f8d7f90c0fb6cc12c8c52005e6018d18091753b8a2c2bcd830`. Primary source matched that frozen candidate.

Primary final still certificate `artifacts/visual/complete.json` identifies run `eb71c24d9bbf1998`, completed `2026-09-27T05:31:53.439Z`, SHA-256 `39fb53f3d4dfdecd45c6795c5549ab66db18d78c60c7c1725844be9812e34458`. This review is held on temporal acceptance; the certificate does not settle that criterion.

## Reviewers and coverage

Codex `visual_critic` independently read the actual diff and surrounding shader. It inspected all 44 final primary PNGs individually at native 1280 by 720: eight `hero/hero-{satellite,cartographic}-{dusk,noon}-{crossing,approach}.png` combinations and all `sweep/{satellite,cartographic}/{plaza,block,overhead}-az{000,060,120,180,240,300}.png` combinations. All 44 hashes matched the final certificate. Root separately inspected eight representative final views.

Earlier comparison used retained baseline/candidate stills under worktree `artifacts/facade-quality/`. All 46 candidate image digests matched `image-digests.json`, SHA-256 `10480718672850159d9b29be40ba68dc16550d1b9f4023c29d5fd9f45ea83d19`. All 107 records in `baseline-motion-digests.json` matched, SHA-256 `a672f59a6404223f243d816ccd513016a97aaf00e63993f40efb7ff132b2b10b`.

Motion inspection covered all 24 initial candidate crossing frames, selected adverse baseline pairs, and native baseline/candidate pairs 07/08, 10/11, 16/17 and 23/24 from `fade-probe2/{baseline,candidate}/capture/ascent-NN.png`. The reviewer verified all 70 records binding the 64 fade PNGs, manifests, reports and temporary instruments in `fade-probe2/digests-and-poses.json`, SHA-256 `b334c3f1116188bc4314c6c5c596330a31824a608dfef767b6f03f4e55b32227`. These are individual frame inspections, not continuous playback or universal temporal proof.

## Reports

### Codex visual_critic

The still-image improvement is material. Framed dark glazing, plinths, ground floors and three coherent facade families give Cartographic street/block views more structure. Aerial stills retain road/building separation without an obvious new static moire pattern. The source confines this treatment to the existing Cartographic uniform; the Satellite photographic branch and untextured procedural fallback remain unchanged. No separate blocking source defect was established.

This remains authored procedural architecture. Repeated facade families, dark Satellite roofs, uneven photographic atlases, and some flat city-wide values remain. Bright narrow faces at certain sunset orientations warrant restraint but were not established as a new blocking defect. The new material does not recover missing map geometry or observed facade details.

Temporal acceptance is held. The first crossing bursts were red in both arms and did not exercise the new distance filters. The corrected fade probe supplies stronger adverse evidence: the candidate has 31 failing pairs versus six baseline failures under the unchanged 0.005 bound. Both captures are valid and both scene verdicts are `not-established`. Worst reported residuals are 0.016598 candidate and 0.007037 baseline; some zoom pairs are unmodelable, so these maxima are not isolated shimmer measurements.

The adverse result also occurs without a radius change, at exact matched baseline/candidate poses:

| Pair | Radius | Baseline residual | Candidate residual |
| --- | ---: | ---: | ---: |
| 07 to 08 | 307.057 m | 0.001969 | 0.005656 |
| 10 to 11 | 428.564 m | 0.001366 | 0.008717 |

Both pairs are away from the translation search boundary. Zoom-fit failure therefore cannot explain all of the increase. The candidate retains much stronger thin facade contrast at these distances. Native adjacent frames show no broad pop or conspicuous flashing patch, but they do not distinguish legitimate higher-contrast moving edges from introduced fine material crawl. Attractive stills and an inherited red scene metric are insufficient grounds to accept this result.

The shared retreat covers approximately 220, 307, 429, 598 and 835 m; first four level poses match exactly and the 835 m level differs by about 0.000191 radians. Candidate frame31 alone reaches 1100 m and is not matched A/B evidence. Visible cell-size estimates span the changed detail bands, but are not shader derivative telemetry. The 32-frame arms last only about 0.88 and 0.87 seconds.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| — | Cartographic structural/material gain is visible across the final still set. | Still/source portion accepted within its stated scope. | Retain the visual gain while resolving temporal uncertainty. |
| — | Matched fixed-radius changed-band motion is materially worse under the existing indicator. | Acceptance blocker; introduced fine crawl has not been ruled out. No landing recommendation. | Root owns a focused mechanism/instrument investigation before any source repair; preserve this candidate and adverse evidence. |
| — | Source-data limits and procedural repetition remain. | Unresolved broader appearance limitations. | No whole-deliverable or photographic-truth claim. |

A material-response ablation was proposed as one possible diagnostic, preserving the new albedo/families while removing new bevel and per-pane specular variation. It was not run by this reviewer and is not an established repair. Root chose fresh read-only sampling and instrument reviews first. No threshold was weakened, red result waived, or new blocker ID allocated here.

## Verification

Read actual receipts and logs under primary `artifacts/facade-quality-20260927/verification/`: build, typecheck, unit, audit and visual exit 0. Unit logs report 85 files and 738 tests. The build chunk warning and two moderate audit advisories remain. The visual log records all 44 frames and three hardware lifecycle repetitions with completed teardown on the RTX 4090, driver 616.64. These gates were run by the verification worker, not this reviewer. The receipt reports zero new Node/Chromium processes and zero listeners on port4319 after that lane.

Independently verified the patch/source identities, image bindings and motion metadata described above. The first motion arm's caption was not treated as authoritative: its actual URL selects Cartographic dusk. The normal relief filter spans footprint 0.025 to 0.085 and opening detail 0.16 to 0.48; the original crossing bursts alone did not cover them. The unchanged temporal instrument uses integer rigid translation and cannot uniquely attribute its residual to shimmer, but that limitation does not turn the adverse matched result into a pass.

This reviewer launched no browser, server or renderer, ran no product gate, changed no source, and created no temporary or persistent process. Only this authored report was written in the allocated implementation worktree.

## Round outcome

Hold the exact original facade candidate. The still/source improvement is worthwhile, but the required absence of a material introduced temporal regression is unresolved. Do not land this candidate on this review's authority. Preserve Review96 and its bound evidence as this held round; any changed candidate requires a separately bound Review97. Root owns investigation, final disposition and delivery.

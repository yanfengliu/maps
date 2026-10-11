# 711 — Distributed frontage contract source review

2026-10-11. CONDITIONAL: source selection may proceed; private construction follows the conditions below. Reviewed HEAD `0cfcac7666f5d1bc092f40d8b800730541ff7f82`; no implementation or runtime acceptance.

708 coherently addresses 706's recurring flat frontages and concentrated dusk light through four representative regions. Patched photographic walls remain MeshStandardMaterial, so the ordinary light path can supply local response without expanding photographic emission. Eight finite unshadowed SpotLights are admissible as a private mechanism. Their shader cost is unmeasured; leakage remains a runtime disqualifier. Neither prevents bounded source selection or requires all-scene proof before this trial.

Before construction, freeze two supported fronts per region: actual tile bytes, GML, original triangles, winding/outward normal, UV channel/transform, photographic divisions and complete fitting footprint, plus the supported street surface. Candidate-index counts establish no admitted walls. Unreadable or incomplete support refuses that front; existing TSUTAYA relief remains excluded. No exact front or crop was inspected in this review.

Four integration obligations remain explicit. `fetchData` currently verifies only `emissionSourceForUrl`; newly selected leaves need the same request-byte verification before construction. `signage.apply` updates only closure-owned boards/PointLights, runs before tile loading and on style changes, and supplies no tile-light registration API: late mounts must inherit current state and receive later updates. Noon signageIntensity is 0.05, so multiplication alone cannot deliver the promised zero lamp power. `ParsedResources` captures mesh geometry/material/texture, not lights, targets or registry membership: cancellation, repeated mounting and tile disposal must remove both light and target and unregister exactly once, without releasing borrowed atlases.

These are bounded implementation requirements, not evidence that existing hooks already satisfy 708. Preserve its cost/footprint/photo-exposure bounds and native close/block/aerial, noon/dusk, held-out peripheral and real style-return acceptance. This milestone cannot close 706's whole-square surface or temporal deficits.

Source reader closure: commands completed; no browser, GPU, server, persistent reader or temporary artifact was created. Sole write: this report.

| Inspected input | SHA-256 |
| --- | --- |
| reviews/708_distributed-frontage-contract.md | b0c7fe590d64ae89b2a97611f76dcd53a23c560b8559095a02cc5ced17234a0b |
| reviews/706_default-survey-native-review.md | 25f1432bed4269e2353f251ae01a25aff14568a3b26e1abf118ba863bcc3aa4d |
| src/scene/facade-textures.ts | 934a1b7a864eb9d8776c866f3a0c74bea7c6f08599b7eadbd316343dc199cc06 |
| src/scene/tile-materials.ts | e1133d7950b6ed6b0d3e5cbb12f040308092522e8bd346039847fcbbacd1db7a |
| src/scene/signage.ts | e39d0d2e3334877e910a9a9fc81234773458610d056ba8721a89540ca4153318 |
| src/app.ts (lighting/style/mount/disposal excerpts) | 08868340833371b695af0f3c6349b9e6ec9106bbda59f4a27de1ee43293d06cb |
| src/scene/buildings.ts (preparation/lifetime/style excerpts) | e729852c716cb19a1ccc5d50c5437fe8378a3e9501f4de65f39b350f30e395b9 |
| src/scene/tile-transaction.ts | cb8c136cfc9ce2ad8ccb7e24351572f87491ca06d7f01cc991a6485cda27c7ef |
| src/scene/crossing-frontage.ts | 662c7772fa5bd9c52fe5703a76d650223a131a772a70b8ca6deaa4e0cb304b90 |
| src/scene/time-of-day.ts (signageIntensity excerpt) | 50a7e6f9ea2fdb9bf59c9f26302bd7c97d3a2021167c3ea537a380211ff88e7a |
| docs/policies/local-rules.md | d29f873faa1b6b569b0221fb97dc2edd853afc493b49d373c29e795c07863631 |
| docs/learning/lessons.md | a5dae9a0c017531c7199e068423c89f893a2b1e3806fd4da7ce31abfd89db796 |

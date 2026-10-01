# 479 — Road hole solid source review

2026-10-01, round 1. Independent file-only review on base 652ac301708317565f4a2a61de0278eeb0529ef3. **HOLD one proof-bound correction.** No runtime or admission is accepted.

The proof's line 147 case named “wrong parent/polygon/LOD” mutates only LOD. The upper/lower case changes identity and LOD together. Neither independently demonstrates rejecting another parent or polygon at the same LOD. `sameOwner` statically checks all five fields correctly; this is a control/claim gap, not an adapter defect. Add only separate literal roadId and polygonId negative footprint assertions retaining every other valid owner field, then freeze and rebind the proof/handoff. Root accepted this bounded correction before execution.

The remaining source meets the admitted contract. Original closed rings, full-precision projected XYZ, owner/function/LOD and immutable 473 refused outcome remain retained. Strict simple-ring, hole containment/disjointness and affine-plane checks refuse unsupported geometry. Existing Three faces index original vertices; independent exterior-minus-hole conservation and positive-area hole-overlap checks precede unchanged 466 triangle-wise AOI clipping. Membership, source-plane ownership and boundary sides consume the resulting solid; legacy exterior-only invocation still refuses and no `.ring` alias exists.

The twenty prepared controls independently read the exact original source96 polygon, compare all raw/projected coordinates and face indices, and derive full/clipped net areas. They cover multiple/AOI-cut holes, winding, invalid topology/coordinates/planes, and a narrow hole crossed by a footprint whose endpoints pass over filled displayed support. The filled-hole mutant differs only in triangulation's hole argument; import precedes its expected net-area refusal, excluding incidental import failure as success.

`checkSourcePaintFootprint` combines unchanged displayed-support checks with an owner-bound semantic plan mask. Its synthetic elevated control cannot establish actual source-to-displayed-layer mapping. LOD2 height zero remains plan evidence. The exact expected 473 refusal is consumed without replay/completion; 235 parents remain unprocessed. Denominator, paint, lanes and native acceptance stay open.

All 40 pins match actual bytes. The launcher is exactly 473→478/prove-parser→prove-solid retargeting, retaining hidden owned Node, 45-second work/10-second cleanup/two 1-second stream bounds, isolated TEMP/cache and finally receipts. No resource was launched here. This review is the sole write.

Frozen round-1 SHA-256:

| Input | SHA-256 |
| --- | --- |
| 478 handoff | a78181adc9e4495198e831c787b713388487d8943ab9e904636566d264014da9 |
| Adapter | 4b425b4acfab2981159b4823b3fb2836e86e9ef8bf0e37df6a7208851aaa512a |
| Filled-hole mutant | 6ca41b61c346782b17be91182891d9c4e276de1088b95a97351907c93ff76309 |
| Proof | 763d4155b60b4ce9ff7672490fe5c040c48872b5f4553106bc36de2f271c240c |
| Launcher | 3cc33439566ca3f1ee171c1198d131fe7de3cec58ce496689159318ac0f066c2 |
| Prepared pins | d32a596e7885d788980403a2a744f9aa02d181162316eca8cba3d3a1675b38cd |

2026-10-01, round 2. **HOLD remains:** new roadId-only/polygonId-only controls require identity refusal, but LOD-only still accepts generic hole rejection. Require its identity-refusal reason. Only the proof pin changed; all 40 pins and round-1 snapshots match. Adapter/mutant/launcher remain unchanged; no runtime. Current SHA-256: proof `176de777fa20abf5c41a4835fdb6eb6ebb45ff485505dd496ca5e0fe7b001715`; manifest `e732f802740796e407268b7aa7941878586a91865a7ebd6121e63f90c07f5b43`; handoff `df06f87c2e6d5590a3be79c88eed5f54d5f7aedcc764a088e8d2bdca26d20fb8`.

2026-10-01, round 3. **ACCEPT prepared actual-solid/semantic plan-mask source and controls.** LOD-only now requires the identity-refusal reason, closing both findings. All 40 pins match; twenty groups, helpers and prior HOLD rounds remain preserved. Current SHA-256: proof `00ce6e5ebd7b81d0409f96cd956fdfd21b2af148847dd567374830051d2368ff`; manifest `b793e83e5e725d68518c5247b8bb270a3922cdd1e8067f640ab56e57ead2aa2d`; handoff `cf7ba54f1410240838ade52bc6f6bb87dff71a305b42fc933e7ebf9386f8575e`. No runtime. Full-source completion/235 parents, actual layer binding and native acceptance remain held.

2026-10-01, actual result. **ACCEPT this finite private branch; stop per 482.** All 20 groups passed in 269.3246 ms. Original identity/XYZ and 84 vertices/faces/pieces remain retained; net area is 3037.1007788327256 m² with 235.79814296587574 m² of hole excluded. Imported filled-hole mutation triggered the intended conservation refusal. Filled-support footprint rejected its 0.004267119452709538 m² semantic gap; explicit synthetic upper source passed. All 40 before/after/current pins match. Node/tool exited 0; receipts record PID 58348 absent, handle disposed and exact TEMP absent. This was file-only review, without rerun or live process check. Source-to-display mapping, full-source/235 parents, paint, lanes, native and main remain open.

Actual SHA-256: proof-result `8e7d393db074b8e0d58d385eb22f4a73bf08bfeefacdbaef5ae7f93cb053459e`; command `c351669c5ee3852b7c83c7d7eb0fc5ec8a0af90b7454babf026e1133e8d3648e`; process receipt `1ef978c8fd71455f8257e7b8638ae94ed6b1171b411bfbf31059d47abec0bd8b`; closure-check `aae7403d9fbfc0a02dcabda2357711af8bf4c0639d92f63ba0b634f2ef9226e9`.

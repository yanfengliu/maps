# 478 — Private road-hole solid preparation

2026-10-01. Base 652ac301; root owns integration/admission. Prepared only under ignored `artifacts/roads478/` and this authored review. Original 473 and all inherited sources remain unchanged. No import, Node, proof, test, gate, browser or GPU ran.

`road-solid.ts` consumes the immutable 473 reader's exact expected refusal; another earlier refusal propagates. It preserves original closed triples, projected XYZ, parent/polygon/function/LOD and the original refused outcome. Finite/simple/nondegenerate rings, strict hole containment/disjointness and common affine source plane are required. Touching/crossing/outside/nested holes and unsupported nonplanar layers refuse with identity. Numerical bounds are 1 nm edges, 0.1 µm plane agreement, 1e-12 m² degeneracy, and max(1e-9,area×1e-10)m² conservation; none changes source eligibility.

Existing Three triangulation indices reference original projected vertices. Exact convex overlap excludes positive hole coverage. Unchanged 466 clipping acts on each triangle; full/clipped solid areas must conserve exterior-minus-hole area. Membership, source-plane ownership, boundary-side probes and selected-source footprint masks consume those pieces. Footprints also use unchanged displayed-road/pavement checks. Legacy exterior-only invocation still refuses; no `.ring` alias, paint output, second inventory or competing mesher exists.

The prepared proof reads actual `poly_58dd2991-1557-42c6-a5af-bc3db1d10da7` directly from pinned 53393596 and independently derives original/projected coordinates, identity and net/clipped areas. Twenty controls cover actual retained XYZ/indexing/area/hole/boundary behavior; multiple holes, AOI cuts, winding/start reorder; touching/crossing/outside/overlap/nesting/self-crossing/degenerate/nonfinite/nonplanar refusals; endpoint-missed narrow-hole footprint against filled display; wrong identity/LOD, unrelated elevated source/layer, legacy refusal and compiled filled-hole mutation failing net-area conservation. Unrun.

Frozen SHA-256:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `road-solid.ts` | 12183 | `4b425b4acfab2981159b4823b3fb2836e86e9ef8bf0e37df6a7208851aaa512a` |
| `road-solid-filled-hole.ts` | 12256 | `6ca41b61c346782b17be91182891d9c4e276de1088b95a97351907c93ff76309` |
| `prove-solid.mjs` | 18338 | `00ce6e5ebd7b81d0409f96cd956fdfd21b2af148847dd567374830051d2368ff` |
| `run-proof.ps1` | 5601 | `3cc33439566ca3f1ee171c1198d131fe7de3cec58ce496689159318ac0f066c2` |

`prepared-pins.json` is 5825 bytes/SHA `b793e83e5e725d68518c5247b8bb270a3922cdd1e8067f640ab56e57ead2aa2d`; 31 dependency/helper/history pins plus nine 464 sources. Thirty inherited inputs matched; final 40 pins require zero changes. PowerShell launcher syntax passed; module compilation remains unrun.

After independent source review and root's serial grant: `pwsh -NoLogo -NoProfile -File artifacts/roads478/run-proof.ps1`. Retargeted 473 wrapper owns one hidden Node, 45 s work/10 s cleanup/two 1 s stream waits, cache-off GUID TEMP and disposal receipt.

Limitation: LOD2 height 0 remains plan evidence. Synthetic explicit source/planes cannot establish actual source-to-displayed-layer mapping. Full-source qualification, paint, lanes, native appearance and main remain separate.

Focused corrections after 479/root HOLD: LOD-only, roadId-only and polygonId-only assertions each require the identity-refusal reason with unchanged other fields/displayed support. Round1/round2 proof/pins/handoffs and HOLD traces remain under artifacts/roads478/. Adapter/mutant/wrapper and twenty groups unchanged; no execution.
2026-10-01 actual outcome, 10:49:05 UTC: the single granted run passed 20/20 controls in 269.3246 ms; Node/tool exits 0. The actual polygon retained 84 vertices/faces/AOI pieces, conserved 3037.1008 m² net area and excluded its 235.7981 m² hole. The imported filled-hole mutant hit the intended conservation refusal; narrow-hole and wrong-owner footprints refused. All 40 before/after inputs were unchanged. Owned Node PID 58348 exited/disposed and exact PID/TEMP were absent. Proof SHA-256 `8e7d393db074b8e0d58d385eb22f4a73bf08bfeefacdbaef5ae7f93cb053459e`; closure SHA-256 `aae7403d9fbfc0a02dcabda2357711af8bf4c0639d92f63ba0b634f2ef9226e9`. The 235 unobserved parents, full-source qualification, actual source-to-display mapping, paint, lanes, native and product acceptance remain open. Root accepted this bounded outcome; the private CPU branch is closed.

# 459 — Facade pane source review

2026-10-01. Independent read-only review of frozen 457. **HOLD for one bounded test-oracle finding; no source-binding defect found.** No imports, tests, gates, runtime, Git or process census ran. This review is the sole write. 435 owns GLSL/cache/hook review separately.

The two GML identities, UV rectangles, planes, outward normals, unequal pixel divisions and metre scales match the inspected 451 packet. The actual cached tile and packet hashes match their pins. Admission requires verified tile bytes, building identity, outward normal, a 10 mm plane band and exact UV0 bounds. Identity matrix/channel/flip checks occur before allocation. Signs, roofs, lower lettering and the north covered wall remain outside the admitted rectangles; held regions are not promoted. UV/world tangent signs agree with the packet's triangles.

The existing-file comparison adds preparation and material response only. Source position/normal/UV/index arrays, placement, atlas rebuilding and geographic caps are unchanged. Generic photographic color detail is suppressed inside the pilot; source RGB and the broad color curve remain intact. Relief depth and roughness remain authored hypotheses. The single scalar attribute is attached before existing geometry accounting, retained on identical preparation and released by the existing geometry owner. No separate resource owner is added.

**[P2] Complete response lacks an independent oracle.** `test/facade-pane-relief.test.ts:76` stops its evaluated GLSL before `mapsPaneResponse`; line 134 tests only the single-line helper. The literal registry checks pin TSUTAYA columns and north rows, but not the other two division arrays or aggregate metric response. Returning zero from `mapsPaneResponse`, or shifting a north column, could evade these CPU assertions. This is a static coverage counterexample, not an executed red control. Add literal source-bound aggregate cases for both regions, crossings/interiors, broad footprints and metre amplitudes; demonstrate that disabling the aggregate response fails. No new framework is needed.

Actual-plugin cases verify cached fetch bytes and reconstructed decoded geometry while mocking image decoding; four barycentric samples per triangle are finite admission evidence, not exhaustive rendered coverage. Those tests have not run in this review. Native depth, border behavior, moving filtering, cost and whole-AOI quality remain unqualified; pending 450 browser approval is untouched.

Frozen SHA-256:

- Handoff: `f296de6b346d74ed29dc71f903a100002da7760a6bec88e7b776e2be9650d2a3`.
- Facade textures: `6c1ecd0c8cf0ab4aa93b33d45e8e4fb03d8abba498378fd53548ce63366d60cb`.
- Tile materials: `ed69778a6d4f1eb392387e7395760ef162a5b3008e92ab70fe73f0d474564165`.
- Pane relief: `b758d16a7fc726b9095a65b5befc6383ff4fb859d930b3db2b1704d7b837bd43`.
- Pane tests: `868c24e4632d2846650b324cc4f27c2c54573c0d08f2f39d0970dc0e906822be`.

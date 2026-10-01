# 465 — Facade aggregate oracle focused review

2026-10-01. Independent source-only re-review of 463 on unintegrated FRONTAGE HEAD `02d06e982b6e516d0f05cd4b653a128c01a052cc`. **ACCEPT within this test-design scope; no material finding.** Review459's P2 gap is addressed in the authored oracle. CPU execution remains pending. Review460's shader/cache/material/geometry verdict is separate and was not repeated.

The translation executes the frozen emitted tail from `mapsPaneHeight` through `mapsPaneResponse`. Its declaration, vector-product and vector-addition rewrites preserve the actual line calls, metre conversions, footprint floor, coverage clamp/union, slope suppression and returned components. Scalar/vector constructors and componentwise max/clamp match this finite syntax. It does not reconstruct an aggregate from registry values or introduce a general evaluator.

The actual diff changes only the bound header and adds aggregate evaluation, literal assertions and controls. Existing source admission, actual-plugin, style, array-preservation and ownership tests remain intact. All four division arrays and both metre scales, frame widths and authored depths match the independently read 451 packet. Twenty-one literal cases cover both regions' interiors, each axis, crossings, opposite slopes, partial crossings, broad footprints and an unbound region. Their inputs and expected values do not read subject constants. The quartic closed forms correctly give `-26d/(9w)`, crossing coverage `15/16` and suppressed slope `-9d/(64w)`. The 20×40 m cases enclose all divisions: TSUTAYA counts 9/7 and north 24/5. Their coverage union and zero endpoint slopes agree with the literal results.

Both mutants are valid emitted strings and must compile before the expected failures. Immediate zero response reaches the named interior component-0 assertion. Moving north1499 to1500 removes coverage at the selected quarter-width sample and reaches the named component-1 assertion. Parser failure cannot satisfy either matcher. These are prepared controls, not observed red executions.

Actual reads and Git no-index diff bind the bytes below; diff exit1 denotes changed files. No product import, test, typecheck, build, browser, server, GPU, CIM or Git mutation ran. This document is the sole write. Native450 approval remains pending. JavaScript doubles do not establish GPU compilation/float32 equivalence, rendered depth, motion filtering, runtime cost or whole-AOI appearance. Root owns CPU evidence and final integrated acceptance.

Frozen SHA-256:

- Test, 22,891 bytes: `1d1855a6ac35a8ba0545ef80e600c6b6778e8a733df949bacb01f370b0d8b30d`.
- Original test, 15,718 bytes: `868c24e4632d2846650b324cc4f27c2c54573c0d08f2f39d0970dc0e906822be`.
- Repair diff, 9,391 bytes: `9ade0311aec265be9823e6129aa52cba4f553e524b319782b60f0e255cdeca2e`.
- Facade textures: `6c1ecd0c8cf0ab4aa93b33d45e8e4fb03d8abba498378fd53548ce63366d60cb`.
- Tile materials: `ed69778a6d4f1eb392387e7395760ef162a5b3008e92ab70fe73f0d474564165`.
- Pane relief: `b758d16a7fc726b9095a65b5befc6383ff4fb859d930b3db2b1704d7b837bd43`.
- 451 packet: `df9d6cceb279a1317a26f83e613061ad203ebd76dba0faec22a8ab8db0d32802`.
- 457 handoff: `f296de6b346d74ed29dc71f903a100002da7760a6bec88e7b776e2be9650d2a3`.

2026-10-01, focused 467 re-review. **ACCEPT.** Actual no-index diff contains only `v: number, i: number`; type erasure restores the reviewed callback exactly. The 16-byte addition preserves all 131 LF endings without CR/BOM. Current source SHA-256 `5b40d43ede13c84c79ce986eed6e8ce5629c37a3dc94cf1c8990ea973eb0c896`; repair diff `c6570de58a59d67932119e1bebc689e3ebd667f8c269ad28b5e54fd5eb81d526`. Test, textures and materials hashes remain unchanged. No runtime ran here. Root reports 97/97 before repair; direct TSC rerun and native approval remain pending.

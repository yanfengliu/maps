# GPU de-light fixture: pre-run review

## Verdict and inspected bytes

HOLD. This is the completed read-only source review of the original frozen 397 fixture in `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/texture-gpu397/`, before root admitted one collected correction round. It does not review those corrections, qualify candidate product code, or report a hardware run. Reviewer: worker 380, 2026-09-30.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `fixture.html` | 251 | `c91d3fc5824e479b84a8c7eadc866ba83fb8097b44612c1bf1124d6901f1589e` |
| `fixture.ts` | 27,434 | `06abcaae2575a63933c8dea4d5d0eb933ff043c39bac871fc0088bdd9aebbe15` |
| `runner.mjs` | 9,894 | `fa8ac0b43c1bc77e5172492f942e145581b852dba70047dd856e9bafc53eb87f` |
| `run-owned.ps1` | 14,920 | `255c9bcb1cec5b5f101834c206f1ec6815a37b7376ae769f81c1f4a68f21b5d6` |

## Collected findings

1. The full RGB cube records `maxRgbWithinOneByte` without requiring it. The three actual-atlas comparisons record their results without enforcing exact alpha or maximum RGB difference of one byte. The fixture subsequently publishes `passedInstrument: true`, which the runner accepts. Enforce both bounds for every real atlas and the exhaustive cube before successful publication.

2. The fixture's `parseTile` call supplies four arguments and casts its result to `{ scene }`. Root independently checked the installed API: it requires a fifth `AbortSignal`, returns `Promise<void>`, and stores the scene in `tile.engineData.scene`. The existing call cannot complete the intended real-plugin coverage.

3. The runner supplies the timeout object as the second argument to `page.waitForFunction`; that argument is the page-function argument. The intended 240-second timeout must be supplied in the third argument. The outer owned-process timeout still bounds the run, but does not establish that this inner timeout took effect.

4. The runner records nine candidate files, four experiment files, cached tiles and Draco bytes before/after, but omits the installed Three.js/TilesRenderer APIs relied upon by the fixture and renderer restoration. Bind the relevant installed package/API bytes. The fixture checks the RTX 4090 renderer string; hardware adapter and driver identity also require a before/after binding.

5. The existing renderer tests use `FakeWebGL2Context`, mocked render/readback calls and controlled errors. They cover render throws, readback GL errors and malformed input, but lack the required shader-error callback and lost-context controls. Plugin cancellation and failed adoption are likewise CPU-side controlled tests. They do not establish native hardware failure behavior.

6. The native fixture prepares one healthy bound target with DPR 1.5, viewport/scissor overrides and dithering checks. This is useful supported coverage, but omits the four required null-target FLOOR/ROUND viewport/scissor combinations. The current source cannot claim those real API cases.

7. `sourceUv` is read from the post-plugin map. Sampler metadata is recorded without an assertion against actual pre-plugin source state and the approved output policy. The cap check asserts limit metadata, but not actual output image dimensions. Capture the source metadata and enforce the unchanged or explicitly adjusted fields and actual cap bound before claiming native metadata preservation.

## Valid bounds and limits

The fixture imports the actual `AtlasDelightProcessor` and unchanged `delightInPlace` CPU helper. Its loop enumerates all 256³ RGB byte triplets once in a 4096² RGBA image. Alpha is `(B + 17G + 73R) & 255`, with all 256 values checked. This is exhaustive RGB coverage with varied alpha, not the full RGB-by-alpha Cartesian product. The literal comparison visits all four channels of every pixel, including RGB at zero alpha. Float32 GLSL arithmetic and JavaScript arithmetic remain measured differences; source similarity does not prove equivalence.

The intended real-plugin cases select pinned tiles 518, 488 and 462 with production caps 4096, 2048 and 1024, capture the plugin's pre-mask readback, compare mask ordering and inspect DataTexture output bytes. Tiny clamp, null-delight bypass and zero-mask cases add useful controls. Their native execution remains unobserved because this review is pre-run and the parser call is incompatible.

The wrapper retains task-owned process handles, a unique 5321 marker, owned TEMP/cache paths and finally cleanup derived from the reviewed 395 wrapper. This source review does not certify actual cleanup. No GPU, browser, server or runtime gate ran during this review; no candidate or fixture was changed. Root requires frozen corrected bytes and focused re-review before admitting the single hardware run. Native appearance, whole-city readiness and lifecycle acceptance remain separate.

## Round 2: focused correction review

ACCEPT SOURCE, 2026-09-30. The seven collected findings are resolved in the following refrozen bytes. The original HOLD above remains the record of the first revision.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `fixture.html` | 251 | `c91d3fc5824e479b84a8c7eadc866ba83fb8097b44612c1bf1124d6901f1589e` |
| `fixture.ts` | 37,298 | `5786d6169cb2115e574a482531ad862f006b491e4dd81b173980c6fd06f5ae25` |
| `runner.mjs` | 12,073 | `7a1fe6c7b1f5883972a4a63c42a4aabab15e43c22efc617b580889697d3a0e3b` |
| `run-owned.ps1` | 14,920 | `255c9bcb1cec5b5f101834c206f1ec6815a37b7376ae769f81c1f4a68f21b5d6` |

The fixture now enforces exact alpha and maximum RGB difference of one byte for each real atlas and the exhaustive cube before successful publication. It supplies the actual fifth parser argument, requires the installed void-result contract and reads the scene from `tile.engineData.scene`. The runner uses the third-argument 240-second wait timeout. Before/after bindings include the resolved package entry modules, package metadata, relevant renderer/state/parser/plugin APIs and GPU identity helper; machine adapter/driver identity must remain unchanged and match the browser renderer.

Actual pre-plugin map metadata is captured before the real plugin runs. UV channel/matrix, the approved sampler/color/orientation policy and exact capped output dimensions are asserted. The four null-target FLOOR/ROUND combinations are invoked on the real renderer/processor, inspect logical and physical rectangles before/after, exercise the next public null bind and recreate the starting cache state. Their results enter both diagnostics and the final result. The bound-target DPR 1.5 check remains. A provisional missing-call concern was withdrawn after direct verification of the call and result assignments in the exact frozen file; it is not an outstanding finding.

The new shader-callback and context-loss controls were inspected in `test/atlas-delight.test.ts` (14,760 bytes; SHA-256 `8e25c68f8d1d776d862626d7017a437340e30d9b7a1f72bd5eecd84a26f822b4`). They use a controlled fake renderer/context and check refusal, unchanged input and resource disposal. They establish meaningful CPU test paths when run; they do not demonstrate native shader failure or native context loss. This reviewer did not run them.

No new material source finding remains. This vote qualifies only the bounded fixture's corrected source and execution checks. Numerical output, native healthy state restoration, actual process cleanup, appearance and whole-city readiness remain unobserved by this review and require their separately admitted runs. No candidate/probe edit, GPU, browser, server or gate ran during Round 2.

## Round 3: observed preflight failure and focused repair

ACCEPT SOURCE for the one-line runner repair, 2026-09-30. Attempt 1 exited 1 before creating a browser or server. Its stderr reports `rc/scene/buildings.ts` instead of the actual path. The Git helper's `.trim()` removed the initial status-column space from ` M src/scene/buildings.ts`; subsequent `row.slice(3)` removed the path's first character. This was an instrument preflight defect, not a measured shader or product failure.

The previous runner is retained in FRONTAGE `artifacts/texture-gpu397/attempt1/runner.mjs` (12,073 bytes; SHA-256 `7a1fe6c7b1f5883972a4a63c42a4aabab15e43c22efc617b580889697d3a0e3b`). The revised runner is 12,076 bytes, SHA-256 `3060edca04b27307f302eb8dca6b9f09b1c7b97f4fd803f5e859839836605985`. Byte/line comparison found exactly one changed line: `.trim()` becomes `.trimEnd()`. Reversing that substitution reproduced the prior runner's exact hash. No fixture or candidate change is part of this repair.

An independent read-only check of the actual porcelain output accepted exactly the nine allowed paths with the repaired parser and reproduced the original parser's refusal. Replacing the literal buildings path with `src/scene/altered.ts` was refused by the unchanged allowlist. The tracked diff contains exactly the six expected paths and the product index is empty. These are offline parsing controls, not a fixture rerun.

The retained attempt-1 evidence was read and hash-verified:

| File under `artifacts/texture-gpu397/attempt1/` | SHA-256 |
| --- | --- |
| `run-errors.log` | `b6c95d20439c6172b5ff537bff6199278c4a5c07c367f6b6108268db9bec6bdb` |
| `process-owner.json` | `8a501f65e926e95752c3328e94fd9e174d041482f9365a5ff0ebc650d9ddfbe1` |
| `process-cleanup.json` | `4d5792b678f84934b5a070a1548973779280f21dd4e7ecfcefad4dcf047385ba` |

The recorded directly owned Node process, PID 8624, exited. The final census was available and found no admitted, omitted or marked survivor and no 5321 listener. The temporary tree had no reparse point and was removed. This establishes closure of the observed preflight attempt within that census; it does not establish native renderer cleanup or numerical execution. No CPU gate, browser, server or GPU fixture was launched by this reviewer. Numerical, state and metadata hardware acceptance remains pending an admitted actual run.

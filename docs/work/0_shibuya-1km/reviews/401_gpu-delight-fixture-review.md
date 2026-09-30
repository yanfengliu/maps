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

## Round 4: failed hardware attempt, partial evidence accepted

FAIL for complete instrument qualification; no product acceptance. Attempt 2 ran from 11:22:19.485Z to 11:22:27.055Z on 2026-09-30 and stopped at tile 462's source/cap-dimension assertion. Its fixture required a source maximum of 4096 for every selected tile. The source-specific dimension diagnosis and repair belong to worker 370; this review did not inspect image headers or credit an unrun repair.

The exact retained FRONTAGE evidence is `artifacts/texture-gpu397/attempt2/run.json` (52,754 bytes; SHA-256 `b6f28b35417b174d2abaa13328b8cb12060d2ad044eed10901fcea34d092645f`) and `process-cleanup.json` (15,089 bytes; SHA-256 `47dbb03345ccc72e5915e4fcc64ab20f025e4cf6fe55871d22e9f30fe9d4cbdb`). The failed fixture is retained as `fixture.failed.ts`, matching the Round 2 hash. Stdout's parsed JSON equals the run record. Both instrument and wrapper report failure; the wrapper exit is 1.

Three full actual-processor/CPU comparisons completed before the dimension assertion:

| Tile | Compared output | Differing RGB bytes/pixels | Maximum RGB error | Alpha differences |
| --- | --- | ---: | ---: | ---: |
| 518 | 4096×4096 | 204 | 1 | 0 |
| 488 | 2048×2048 | 86 | 1 | 0 |
| 462 | 1024×1024 | 16 | 1 | 0 |

Only 518 and 488 have completed tile-qualification rows. Their mask ordering, output bytes, source/output UV metadata, sampler policy and capped dimensions match the recorded checks. Tile 462's numerical comparison is partial evidence, not complete tile qualification. The exhaustive cube, clamp, four null-target state/cache cases, bypass, zero-mask and final bound-target state check were not reached. No complete numerical or native state pass may be inferred from the three comparisons.

The before/after records agree for all 31 bounded input records: nine candidate files, seven cached source/decoder files, eight support/API files, three resolved package entries and four experiment files. Rehashing at this review's initial inspection found zero current-byte mismatches, before the separately announced fixture correction. The recorded HEAD and status also remained unchanged. All 39 recorded HTTP requests returned 200; there were no failed requests or browser console/page errors. Machine GPU/driver identity was RTX 4090 / 616.64 before and after. The failure's partial result omits the final browser-renderer field, so this review does not certify successful final adapter binding.

The runner recorded context, browser, Vite and esbuild closure. The available final census found all five pinned admitted identities absent, no live omitted or marked process, and no 5321 listener. Cleanup errors and temporary reparse points were empty; the owned temporary tree was removed and was physically absent when inspected. This qualifies the recorded failure's closure, not a successful fixture lifecycle. No browser, GPU, server or gate was launched by this reviewer. The subsequent source-dimension repair requires its own frozen source review before another dispatch.

## Round 5: strict per-source dimension oracle

ACCEPT SOURCE for the minimal fixture repair, 2026-09-30. Revised `fixture.ts` is 37,579 bytes, SHA-256 `1d9de29ce42a7d10a46b674fd05bd41862ae88e05e1a93fe1ec5bff5a0f97adc`. The frozen dimension audit is `artifacts/texture-gpu397/attempt2/source-dimension-audit.json` (3,792 bytes; SHA-256 `950ab2d6c8ce3ff5bee190a2f39a7a29582b4aacf25faf547e83635077a8d491`). The remaining HTML, runner and wrapper bindings are unchanged from their last accepted source rounds.

Comparison against the exact preserved failed fixture found six changed lines: the case type, three pinned source width/height pairs, the condition requiring both per-case dimensions, and an error naming actual dimensions. Tile 518 and 488 require 4096×4096 source atlases; tile 462 requires 2048×2048. Tile hashes, geographic caps, resize formula, actual output-size checks and other numerical/state assertions remain unchanged.

An independent read-only extraction of the actual pinned 462 b3dm's GLB image confirmed its VP8 WebP header is 2048×2048. The tile is 1,581,404 bytes and matches its existing SHA-256. The embedded image is 668,454 bytes, SHA-256 `ccaec242b468e94783a76ca9d6cd8502daef6caaefe3631996b3bd3ba8d05243`, matching the audit. Its 1024 geographic cap yields the 1024×1024 output observed in the failed run. The repair replaces a false universal source-size assumption with strict source-specific equality; it does not waive a changed input, cap or output dimension.

This is a source-only verdict on the repaired instrument. No runtime, GPU, browser, server or gate ran during this focused review. The failed attempt remains red; complete numerical/native/cleanup qualification requires the separately admitted retry.

## Round 6: completed numerical and native healthy-state fixture

ACCEPT the bounded executed fixture evidence, 2026-09-30. Attempt 3 ran from 11:33:41.291Z to 11:33:49.986Z with the Round 5 fixture and the Round 3 runner. The retained FRONTAGE records are `artifacts/texture-gpu397/attempt3/run.json` (67,351 bytes; SHA-256 `e246a2fbb43a5fe43db18d4c283d86b444599c838791c5106f7cf556178dec22`) and `attempt3/process-cleanup.json` (13,217 bytes; SHA-256 `b90f983d057bb82d06ec3d51e02fae3ecfcd705142499369acb4003875292d65`). Both match the current records. The run reports `passedInstrument: true`, no failure, unchanged bindings and wrapper exit 0; stdout's parsed JSON equals the run record.

| Executed comparison | Output pixels | Differing RGB bytes/pixels | Maximum RGB error | Alpha differences |
| --- | ---: | ---: | ---: | ---: |
| Full plugin, tile 518 | 16,777,216 | 204 | 1 | 0 |
| Full plugin, tile 488 | 4,194,304 | 86 | 1 | 0 |
| Full plugin, tile 462 | 1,048,576 | 16 | 1 | 0 |
| Exhaustive RGB cube | 16,777,216 | 364 | 1 | 0 |

All three source-specific dimensions, caps, mask ordering, actual processor output bytes, UV metadata and sampler-policy assertions completed. The 4096×4096 cube scans all 67,108,864 RGBA bytes, enumerating each 24-bit RGB triplet once and all 256 values in each channel. Its deterministic alpha assignment includes zero-alpha RGB cases; it is not an exhaustive RGB-by-alpha cross-product. These comparisons satisfy exact alpha and maximum absolute RGB error of one at the frozen settings. Exact RGBA equality fails. The raw full output buffers were not retained, so this review verifies the frozen executed scan and its records rather than independently rescanning saved buffers.

Explicit clamp, bypass without GPU calls and zero-mask RGB checks passed. All four DPR 1.5 null-target floor/round rectangle combinations completed, including logical/physical restoration and the supported next bind/cache behavior. The bound-target check restored viewport, scissor, test flag, target properties, DITHER and DPR. These are actual healthy native state checks. Controlled CPU shader-error, context-loss and cancellation checks have a separate bound; no native failure observation is claimed.

Independent rehashing found zero mismatches across all 31 bound candidate, cached source, API, resolved-entry and experiment files; before/after records agree. All 39 HTTP requests returned 200, with no failed request or browser console/page error. The browser reported RTX 4090 through ANGLE/D3D11; matching machine records before and after pin driver 616.64.

All four runner close flags passed. The recorded available final census found all five pinned admitted process identities absent, no omitted or marked survivor and no listener on 5321. Cleanup errors and temporary reparse points were empty; the owned temporary tree was removed and was absent on inspection. This reviewer launched no runtime resource. This verdict does not accept full appearance, whole-city readiness or speed, product integration, or the complete Shibuya goal; those remain separate acceptance work.

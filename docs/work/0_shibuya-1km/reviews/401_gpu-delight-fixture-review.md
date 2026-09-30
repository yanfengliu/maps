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

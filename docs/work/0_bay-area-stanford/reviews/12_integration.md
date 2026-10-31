# Review 12: integration

## Target

Repository `maps`, branch `claude/mapsort-benches-sculptures`, revision `a2486a861477d2386310ffaeda3c82fa467990d6`, which reshaped the facing rule after round 11. Both reviewers received `git diff 5c9f24b a2486a8` without `public/data/stanford-environment.geojson`, which they read from the checkout.

## Reviewers and coverage

Same setup as round 9, with raw runs in `artifacts/mapsort/review-runs/r4/`.

- Codex CLI 0.163.0, `gpt-6-astra` at `xhigh`, read-only sandbox. It checked crossing, overlap, shared-end and zero-length fixtures of its own, verified the winding of all the backed way's triangles, and compared the data. It ran 13 focused tests, TypeScript and `git diff --check`, and read `src/building-geometry.ts:88` outside the diff. There were no DLL failure markers.
- Claude Code 2.1.308, `claude-opus-5-5[1m]` at effort max, with round 9's limits, which `system/init` confirmed. `modelUsage` held only the pin. Node was refused, so it worked by hand and with git word diffs. It did not delegate.

## Reports

Each report is kept as the reviewer wrote it, with its headings demoted under this section.

### Codex (`gpt-6-astra`)

One **minor** finding; no blocking or should-fix findings.

- **Minor — dead-ahead fallback can choose the wrong side.** At [build-campus-environment.mjs:57](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/tools/data/build-campus-environment.mjs:57), the strict negative-dot comparison treats floating-point noise as a decided side. Reproducer: bench `[[0,0],[4.936,22.712]]`, reference path `[[7.404,34.068],[11.106,51.102]]`. These are collinear, but the dot product is `-1.421e-14`, producing **102.26°** instead of the documented left fallback **−77.74°**. Translating every coordinate by `[100,100]` switches the result to −77.74°. Use a scale-aware tolerance and add rotated/translated dead-ahead fixtures. This affects F19’s tie handling; perpendicularity remains correct.

Checks found sound:

- **F18:** crossings, collinear overlap, shared endpoints, near-contact, zero-length segments and whole-path exclusion passed independent fixtures.
- **F19:** the main across-line rule passes; all 21 open mapped ways satisfy the perpendicularity check.
- **F20:** independent checks confirmed outward winding for 22 top triangles and 64 vertical/end triangles across the real backed way and mirrored/reversed fixtures. Outside the diff, [building-geometry.ts:88](/C:/Users/38909/Documents/github/maps/artifacts/mapsort/wt/src/building-geometry.ts:88) confirms winding determines emitted normals; actual mesh top normals also passed.
- **Data:** exactly 22 features changed as reported. Coordinates and source tags are unchanged; byte count and SHA-256 match provenance.
- **Verification:** all 13 focused tests, typechecking and diff whitespace checks passed.

Reviewed checkout: `a2486a861477d2386310ffaeda3c82fa467990d6`. Raw-source regeneration, the reported mutation campaign and browser rendering were not repeated. No files changed.

### Claude (`claude-opus-5-5[1m]`)

I found nothing blocking or should-fix. All three repairs do what the commit says, and the published data matches the claims exactly. I have five minor findings.

I couldn't run anything with `node`: the tests, typecheck and the generator were all refused in this session. The OSM extracts aren't in the worktree, and searching outside it was refused too. So this review comes from reading the code, working the geometry by hand, and searching both revisions' data with git.

#### Findings

**1. Minor: when the reference path lies almost along the line, the side is effectively random.** `tools/data/build-campus-environment.mjs:57` treats the side as undecided only when the dot product is exactly zero.
- In the parent revision these features faced straight at the same reference path, so the margins can be read off the two revisions. These seven have their side picked by a path only a few degrees off the line they face across:

  | Feature | Margin |
  | --- | --- |
  | `way/694955891` | 0.28° |
  | `way/694955888` | 0.68° |
  | `way/694955898` | 0.83° |
  | `way/694955895` | 1.07° |
  | `way/694955892` | 1.18° |
  | `way/481335247` | 2.52° |
  | `node/5759657845` | 3.56° |

- For the node, the path picking its side is `way/601164991`, the same "next path on the route" that F19 found it facing.
- Nothing renders differently today: all seven are unknown-material flat markers, which look the same from either side. But if any of them gained a material and a back, the back's side would rest on a sub-degree angle.
- The fixture at `test/campus-environment.test.mjs:204` covers only an exact zero. Its third path also sits on the left, so it can't tell the left default apart from "use the next path".
- Suggestion: use the renderer's tolerance (`|cosine| < 0.25` at `src/campus-environment.ts:91`) as the undecided band.
- Related: the generator treats a way as open once its end-to-end chord exceeds 1e-9 m (`tools/data/build-campus-environment.mjs:55`). The renderer treats anything under 1 cm as closed (`src/campus-environment.ts:69`). No published way falls in that gap.

**2. Minor: edge cases for a node lying on a footway.** `tools/data/build-campus-environment.mjs:56` faces across the nearest touching segment, and the first one listed wins a tie.
- **Bend or junction:** two segments are both at distance 0. At a right-angle bend or crossing, the node then faces along the other segment. The README (`public/data/README.md:34`), the defect register and the test title (`test/campus-environment.test.mjs:199`) all say this can't happen.
- **End of a spur:** where a footway leads up to the bench, the seat ends up sideways to that path.
- **Zero-length segment:** two footway nodes at the same position give a direction of [0, 0] and so 0°, which is F18's symptom. The way branch guards against a zero chord (`:55`); the node branch has no guard. This needs coincident nodes that also win the tie, so it is narrow.
- No published node reaches any of these: only `node/5759657845` touches a footway.
- Suggestion: at a vertex, average the two segments' directions as the renderer's mitred normals do (`src/campus-environment.ts:74-79`), and skip zero-length segments.

**3. Minor: `orientationSource` now means different things in different cases.**
- For `node/5759657845` it names `way/663770758`, the footway the node lies on (`source=on.id` at `tools/data/build-campus-environment.mjs:56`).
- The provenance (`public/data/stanford-environment-provenance.json:41`) says facing is "made from the nearest mapped pedestrian path that does not touch the bench", but the recorded path does touch it.
- The path that actually picked the node's side, `way/601164991`, is no longer recorded anywhere.
- For ways, `orientationSource` names the path that picked the side, while the direction comes from the bench itself. Someone reading the data can't tell which meaning applies.

**4. Minor: the provenance and register text lag the new rule.**
- The `dimensions` text (`tools/data/build-campus-environment.mjs:121`, provenance.json:41) leaves out the closed-ring exception that the README includes: `way/1508655696` to `699` face their reference path. Its phrase "faces across that path toward it" is also ambiguous.
- `benchInterpretation` (`:122`, provenance.json:42) still describes a back placed "where that facing runs along the way". A modeled facing on an open way can no longer do that.
- The register's root cause (`docs/learning/defect-register.md:7`) lists two forms of the defect but leaves out F19's: facing toward the next path on the same route.

**5. Minor: the same winding problem remains in the seat, and none of it is visible.** The F20 fix is correct.
- On every solid way, though, the seat's two long walls are wound inward (`src/campus-environment.ts:95`). One end cap is too, because `:108` lists both ends in the same order.
- The new test (`test/campus-environment.test.mjs:194-196`) checks only the back's top faces. So the register's "outward faces either side" isn't checked for the inner, outer and end faces that the repair also reordered.
- None of this shows on screen. Lighting is two-sided (`abs(dot(...))` at `src/building-details.ts:54`) and culling is off (`src/building-details.ts:340`). Winding only changes the stored normal (`src/building-geometry.ts:91`), so F20 itself never showed either.

#### What I checked and found sound

**The new rule's code**
- `segmentGap` (`tools/data/build-campus-environment.mjs:33-35`) correctly measures the distance between two segments, including crossings, overlaps and T-contacts. A single node reduces to the old point test, so no untouched node changed.
- A reference path is always at least 5 cm away, so F18's atan2(0,0) can no longer come from the direction toward it.
- A way's "across" vector is the left normal of the line from its first node to its last. The renderer computes the same vector (`src/campus-environment.ts:88`), so every open way's back now follows its facing.
- The −0/−180 normalisation is correct, including the unflipped [−0, y] case.

**The data**
- The sha256 (`d9c056c5…`) and the 249,297-byte size match the provenance and the test.
- A word-level git diff of the two revisions shows exactly 22 changed values: the node's facing and source, plus 21 way facings. Together they account for the +5 bytes.
- The four closed rings and every way's `orientationSource` are unchanged. So F18 changed no published reference.
- I recomputed facings by hand from coordinates:
  - `way/1509660899` gives 104.39° and bends left. Its back stays on the right, as it did with the old 164.61°.
  - `way/1505422554` gives 110.77°. It is a 288° C-shape, so its "overall line" is the 6.6 m gap.
  - `way/30775872`, `way/481335243` and `way/694955891` also match.

**The winding fix and the fixtures**
- All five back faces point outward on both sides after the fix. Every face is flat, so the changed triangle split is harmless, and the shared corners are unchanged.
- Each new fixture fails under the defect it targets:
  - the crossing footway would give 0° toward `way/9`;
  - the path dead ahead of a way would give 90°;
  - the two node fixtures would give 146.31° and 90°.

**What changes on the map**
- The only change you can see is `node/5759657845`. Its flat marker now runs along `way/663770758` instead of across it.
- `docs/work/0_bay-area-stanford/bench-accuracy.md:24` still describes the old rule, but it is a dated 2026-10-20 record with its own old hash, so I treated it as history rather than a finding.

#### Not verified
- The "19 checks went red with each defect put back" claim, since I couldn't run the tests.
- Regenerating the data from the OSM extracts.
- Published node facings: they have no data-level check, because footway geometry isn't in the repository. Only the fixtures cover them.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F21 | A tie was decided by rounding. A rotated, collinear reference gave a dot product of −1.4e-14 and so 102.26, while the same tie moved by (100, 100) gave −77.74. Claude added that seven flat markers have sides picked by references only 0.28° to 3.56° off the line. Codex: minor. Claude: minor. | Accepted in part. A tie now has a tolerance, and the provenance calls a nearly aligned side a weak estimate. Claude's suggestion to use the renderer's 0.25 band was rejected: on the seven flat markers concerned, it only swaps one arbitrary choice for another. | `c5483cd`: a cosine within 1e-9 of zero is a tie, with fixtures rotated and moved; `649d7c2` widened this to 1e-6 (F27). `649d7c2` gave the renderer's side test the generator's 1e-9 closed-ring threshold (F29), but the renderer's `closed` flag still uses 1 cm. [Review 14](14_integration.md)'s F37 corrected this sentence. |
| F22 | Edge cases of a node lying on a footway: a bend or junction, where it can face along the other segment; a spur end; and a zero-length segment, which gave 0°. Claude: minor. | Accepted in part. | `c5483cd` skips zero-length segments, with a fixture. `649d7c2` recorded the bend, junction and spur cases as limits (F26): the only published node on a footway lies mid-segment. [Review 14](14_integration.md)'s F37 corrected which commit recorded them. |
| F23 | `orientationSource` meant different things for ways and for a node on a footway, and the provenance contradicted the node case. Claude: minor. | Accepted. | `c5483cd` documents the meaning in the generator comment, the provenance and the data README. |
| F24 | The provenance and register lagged the rule. They omitted the closed-ring case, still implied a modeled facing could run along an open way, and left out the next-path-on-the-route form. Claude: minor. | Accepted. | `c5483cd`. |
| F25 | The seat's long walls and one end cap are wound inward, and the register claimed outward faces that only the back's top faces are tested for. Claude: minor. | Accepted in part. The register now claims only what is tested. The winding is invisible under two-sided lighting with culling off, and is deferred. | `c5483cd` for the register. |

## Verification

On `c5483cd`: typecheck, 65/65 unit tests, build and audit with 0 vulnerabilities. All 21 checks went red with their defect put back, including a strict sign deciding a tie and a zero-length segment faced across. Regeneration reproduces `d9c056c5…` byte for byte, so no published facing changed. Nothing rendered changed, so the native check was not rerun.

## Round outcome

No blocking or should-fix finding. Five minor findings, F21 to F25. `c5483cd` repairs F23 and F24 and part of F21, F22 and F25. The rest is recorded as limits, and Claude's wider tie band is rejected. Round 13 re-reviews `c5483cd`.

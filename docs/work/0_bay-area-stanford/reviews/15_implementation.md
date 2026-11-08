# Review 15: implementation

## Target

Main Quad overlap and architectural detail on `codex/embedded-recovery-20261107`, based on `12c8fb4978272a50ea726dc04b14fd12a18c8b98`. The initial uncommitted source/test target is retained under ignored `artifacts/embedded-recovery-20261107/output/review-15/`: `candidate.patch` includes new files, `initial/` preserves exact reviewed bytes, and `manifest.json` identifies the base and all nine SHA-256 hashes. Later F41 repairs are not part of this initial target.

## Reviewers and coverage

Independent subagent `quad_detail_review`, GPT-6 Astra at xhigh, using the fleet's reviewer pin. It read source, tests, local rules and lessons; ran only the two requested read-only test files and in-memory geometry calculations; and inspected the full-resolution Margaret Jacks screenshot. Root implemented separately. No reviewer file edits, browser/server processes, installations or full-gate duplication occurred.

## Reports

### GPT-6 Astra

F41 [P2] — Ten non-arcade Main Quad walls disappear when detail becomes ready. In `src/building-geometry.ts:223`, wall panels still require edges longer than 1.8 m, but `src/quad-arcade-visibility.ts:17` collapses the entire native parent extrusion to 0.1 m. The current composed outer boundary has ten uncovered edges measuring 0.467–1.520 m; outward midpoint probes confirm no other building closes them. They therefore become full-height slots at zoom ≥15.5. Emit plain wall faces for every non-arcade parent edge, keeping decorative thresholds separate, and test complete boundary coverage. Owner accepted; correction awaits re-review.

No other confirmed finding in the initial revision.

Checked:

- Node 24.12.0: both requested test files passed, 20/20.
- All nine parent/part intersections removed; three components retained; original courtyard areas remain empty. Source metadata and `public/data` files are unchanged.
- Named-wing roof areas match their source footprints, with four planar roof normals and fitted facade bays.
- Actual arcade rear walls sit 2.2 m behind the courtyard boundaries; sampled rear-wall positions remain inside the composed footprint.
- Full geometry including validated environment and sculpture inputs: 156,822 triangles, 24,464,232 bytes, below both caps. Renderer retains two draws.
- Read unchanged lifecycle code at `building-details.ts:281–390`, including deferred workers, upload completion, context cleanup, and LOD.
- Inspected the original-resolution 1920×1080 Margaret Jacks capture: the reported parent/window overlap is absent.
- Read negative-control logs confirming church-only subtraction and premature wall hiding fail their regressions.

Not independently verified: live GPU performance, actual context-loss recovery, inner-court screenshot, and upper-wall picking after native-wall collapse. The last item is a verification concern, not yet a finding. No browser/server processes or output files were created.

Reviewed base: `12c8fb4978272a50ea726dc04b14fd12a18c8b98`, branch `codex/embedded-recovery-20261107`, with initial uncommitted source/test hashes:

| File | SHA-256 |
|---|---|
| `src/building-architecture.ts` | `54F47A4FD7695AA285ED338086032E6A6F81E90A2A020AF0821DE9C34EDB6972` |
| `src/building-details.ts` | `27C246AD23B05F83CA32FBE298A90869BB08B59719837F4FF308CCD75198C515` |
| `src/building-geometry.ts` | `23407C3184A62991AE114F1055AEC6662D8C980BFF41503EBC8DFC6C21161F1D` |
| `src/compose-building-parts.ts` | `950D9C385810FB12841178379F989EDFAF20EB69A2F2E1C931FC830075CFE5CE` |
| `src/main.ts` | `7C9EB6067E8F90F8F9E69390A30506B283D56C32590CCEDE156D8B943BDB64D0` |
| `src/quad-architecture.ts` | `CB5B157DE7B0422BD54ECE17D03DD4F6EF5DD4EF3BEC8F13F52C32D10455F5FA` |
| `src/quad-arcade-visibility.ts` | `D5CCC0FC5B3A174A698A731E1A6592DBE8698D22ECD63E78920059B1F0F705BC` |
| `test/building-details.test.mjs` | `AA7684659C2B3B871F97C505E55A4136DB66BADB2C14D30CCE48BFD89E7AAD11` |
| `test/quad-arcade-visibility.test.mjs` | `25C88AA9C574A3CE6395B3283D2F6809C9E9EC3DAF6C2E781E0EF3ED3BD2F060` |

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F41 | Short parent boundary edges have no replacement wall after native extrusion collapses. | Accepted; whole-boundary coverage is required, independently of decorative bay size. | Plain faces for short edges and an emitted-triangle coverage regression; checked in review 16. |

## Verification

The reviewer passed 20/20 focused tests. Root independently passed the then-current 68-test suite, build, types and audit. Two isolated-copy mutations failed as intended: church-only subtraction and premature native-wall hiding. Root's real upper-arcade click opened the Main Quad card. These checks do not close F41 in this initial round.

## Round outcome

One material finding required repair and independent re-review. No other confirmed finding or reviewer dissent.

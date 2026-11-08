# Review 16: implementation

## Target

F41 correction to [review 15](15_implementation.md), on the same base `12c8fb4978272a50ea726dc04b14fd12a18c8b98`. The exact final source/test target is the code in the first commit containing this record. Seven files retain review 15's hashes. The two changed hashes are recorded in the report below. Documentation added after review is integration-owner authored and is not claimed as independently reviewed.

## Reviewers and coverage

The same independent GPT-6 Astra reviewer inspected the correction, reran the two focused read-only test files, calculated complete geometry budgets, inspected the Inner Quad screenshot and read the negative-control failure. No writes or browser/server processes occurred.

## Reports

### GPT-6 Astra

F41 resolved. No remaining findings in the reviewed source/test changes.

The correction at `src/building-geometry.ts:215` preserves short Quad edges, and line 226 supplies their solid walls. The new test independently checks emitted triangle coverage along every non-arcade boundary, including all ten short edges. Its retained negative run fails at the original 1.520 m gap; the corrected targeted suite passes 21/21.

Additional checks:

- Full geometry: 156,842 triangles; 24,467,352 bytes, within both limits.
- Source/test whitespace checks pass; `public/data` remains unchanged.
- Original-resolution inner-court capture visibly shows recessed passages and physical columns. The saved frame displays 60° while its tilt was settling.
- Owner's live upper-arcade selection check passed; no selection defect established.
- No files, browser processes, or servers created.

Final changed SHA-256 hashes:

- `src/building-geometry.ts`: `7C3247E57BCD58B4F1218621044E44001291264313FF4F7FECB2C75E0FF1F390`
- `test/building-details.test.mjs`: `3875BF7E7F6FF7E655AFEF2E4B977AD83DF1881BFF5CACD68DF274EDDEC68DA8`

All seven other reviewed source/test hashes match the initial report. Review remains grounded in base `12c8fb4978272a50ea726dc04b14fd12a18c8b98` plus these changes.

Acceptance from this review: source, geometry, regression coverage, and inspected captures are satisfactory. Full repository gates, final GPU motion measurements, and live context-restoration verification remain the owner's checks; I did not duplicate them.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F41 | Short parent walls disappear. | Resolved; every reviewed non-arcade boundary now has full wall coverage. | The regression fails on the original 1.520 m gap and passes after repair. |

## Verification

21/21 focused tests pass. Both GPU limits remain unchanged. The negative log is retained in ignored `artifacts/embedded-recovery-20261107/output/quad-verification/short-wall-negative.txt`. The final integration checks and browser evidence are recorded in [design.md](../design.md#quad-detail-2026-11-07).

## Round outcome

No remaining material finding in the final source/test target. Root owns final gates, rendered verification, integration and cleanup.

# Implementation review 38

## Target

fef22c3 relative to f776051. Scope includes the initial three hospital exteriors, five courtyard decks and the aerial and facade evidence.

## Reviewers and coverage

Independent Codex gpt-6-astra, xhigh, read-only exact checkout. The second CLI reviewer had exhausted its weekly quota.

## Reports

**Request changes for `fef22c3` relative to `f776051`: three P2 findings. No P1 found.**

1. **P2 — The picking regression gate fails.** The five courtyard conversions increase selectable parts from 122 to 127, but [building-picking.test.mjs:35](/private/tmp/maps-review38-20261121/test/building-picking.test.mjs:35) still expects 122. This test passes against `f776051` and fails against `fef22c3`. Update the expected inventory and explicitly check the five added courtyard buildings.

2. **P2 — Hospital picking volumes exceed the new exterior silhouettes.** The [stepped hospital geometry](/private/tmp/maps-review38-20261121/src/building-geometry.ts:204) lowers podiums to 7.02, 6.12 and 9.9 metres, while [picking still extrudes each entire footprint to 18 metres](/private/tmp/maps-review38-20261121/src/building-picking.ts:16). An independent projected-triangle check found proxy hits outside the visible exterior for all three hospitals. Clicking apparent ground/background can therefore select the hospital. Use tier-aware picking when detail is ready, preserve fallback picking, and test clicks outside the visible silhouette. This finding is source/projection-based; I did not perform browser clicks.

3. **P2 — The supplied roof atlas is stale for all three hospitals.** Its [manifest](/Users/yanfengliu/Documents/local/github/maps/artifacts/campus-20261121/roofs/sources.json:5) records digest `37d37ff…`; the reviewed tree computes `8612464…`. Comparing every saved panel with freshly emitted surfaces matched **645/648**. Parts **69 (Packard West), 453 (Packard Main), and 480 (500 Pasteur)** differ. Regenerate and inspect these panels before accepting the [whole-roof comparison claim](/private/tmp/maps-review38-20261121/docs/work/0_bay-area-stanford/design.md:411).

Actual coverage: inspected all seven hospital PNGs, saved aerial overlays and exterior photographs, all six facade comparison sheets, and sheet-1 imagery plus corrected HTML geometry. The 45 facade observations appropriately exclude the placeholder and qualify incomplete elevations. All 648 atlas owners and all 15 imagery hashes were checked mechanically; I did **not** independently visually approve all 648 roofs.

Source footprints, holes, heights and provenance remain preserved. The five corrected courtyard panels match the current mesh; terrain anchoring, shell ownership and fallback checks passed. The complete exterior contains **189,920 triangles and 25,069,440 GPU bytes**, within both limits.

On pinned Node 24.12.0, **62/63 focused tests passed**. Full build/typecheck/npm audit and interactive QA were not run. No files changed, network used, browsers launched or reviewers spawned.

## Findings and disposition

R38-1 accepted. The selection count was corrected at 9e94242 and all five court IDs are explicitly asserted at 38b7bbd. R38-2 accepted and assigned to the hospital exterior owner. R38-3 accepted. The atlas was regenerated after integrating the hospital exteriors and nine further aerial-confirmed deck corrections.

## Verification

The root reran every comparison against the combined scene and checked all 648 unique index links. The next review covers later model changes. The original focused result and covered images are reported above.

## Round outcome

Changes requested. The exact revised hospital selection behavior and visual evidence require follow-up.

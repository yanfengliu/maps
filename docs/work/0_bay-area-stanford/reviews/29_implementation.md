# Implementation review 29

## Target

Exact revision 2a71a5c0571838d47087ffcbd96a4747814d27b2 against f473fa04cf41e08e2301ccc98c68b7f358431440. Scope: parallel campus startup, stable engine chunk, elevation preconnect, consistent sourced road widths across terrain tiles and road readiness after cancellation.

## Reviewers and coverage

Independent loading_roads_review_29 (gpt-6-astra, xhigh) reviewed source, changed regressions, pinned native engine code and retained evidence read-only. No browser/server, second CLI lane or additional agents were launched. Root transcribed the report and replaced temporary worktree links with repository-relative references.

## Reports

No material findings in the exact target versus the base.

Exact-width camera expressions avoid the native composite binder's tile-zoom clamp. I checked [road generation](../../../../src/campus-road-layer.ts#L60), the regression and negative control, MapLibre's unchanged camera-expression evaluation (pinned src/style/properties.ts:599) and composite clamp (src/data/program_configuration.ts:337).

Dynamic groups participate in installation, readiness, retry, recovery and cleanup. The cancellation observer matches native ordering: MapLibre removes a tile before emitting dataabort. Source coordinates, assets, curb geometry and detail-generation code remain unchanged. [Startup handling](../../../../src/main.ts#L418) resets style availability before replacement and context loss, then attaches campus detail after parsing. Existing error and recovery paths remain intact.

I inspected both changed test files, retained logs reporting 284 passing tests, types, Pages build and zero audit vulnerabilities, bundle-cache hashes, final-native.json and seven accepted captures at native resolution. Fixed, opposite, steep, restored, Retry, church and phone captures showed no material regression. I did not rerun gates or launch processes.

The paired timing tradeoff is appropriate for this fix: mean detail readiness improved about 25% cold and 23% warm, while warm first-tile and road readiness became slower. These are eight localhost loads on an RTX 4090, with two observations per version/cache condition, not evidence of a universal improvement. The retained motion sample reports 14.9 ms p95 across 156 frames; mobile performance remains unmeasured.

## Findings and disposition

No material finding requires a repair. Root accepts the reviewed code, preserves the measurement limitations and first-tile tradeoff in the canonical design, and leaves broader realism work open.

## Verification

Root's 284 tests, types, Pages-base production build and audit passed on the reviewed code. Native actual-control checks cover the reported terrain defect, graphics loss/restoration, source failure/Retry and desktop/phone church navigation. Two-build cache proof preserves engine filenames and SHA256 through an app-only edit. Raw evidence remains ignored under artifacts/loading-roads-20261108/output.

## Outcome

Accepted for integration and publication. No unresolved material finding; live deployment and primary-main cleanup are delivery steps owned by root, not evidence claimed by this review.

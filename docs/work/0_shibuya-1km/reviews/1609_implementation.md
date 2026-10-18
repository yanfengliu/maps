# Review 1609: implementation - one foreground boundary source qualification

## Target

The actual1633 read-only source qualification on frozen maps base `94d50a6151775beb41badf111b0e3d83f6a347ef`; accepted executable `e1097edd4f0d65f41e6d6c157def4d51fa877318` remains unchanged. The actual ordinary street original and source identities are recorded below. Retained context: `artifacts/curb1633/witness.json`, SHA-256 `c5a101dc7d4e3ee58c11d7142d05705866892ede1ecc462e7d14f3a04223d801`; `artifacts/curb1633/probe.mjs`, SHA-256 `d8238704c6b0b53ffbcef095ffb92cb0017583b1306fd380151a2abf1928bff2`.

## Reviewers and coverage

Worker1633 inspected the actual native street image, relevant source/installed geometry and existing offline production path using a finite CPU probe. Root read the actual source handoff and accepts its bounded qualification. This is not an independent review of an implemented candidate; native pilot and final independent review remain owed.

## Reports

### 1633 - foreground boundary source investigator

Original authored report: `artifacts/curb1633/report.md`; SHA-256 `1473e862cd2cc7f793c32399ae03f9056779066ad75e94935a1565191d96cbbb`. Retained verbatim below.

```markdown
# 1633 — one foreground pavement boundary

Verdict: **QUALIFIED_BOUNDED_PROTOTYPE**, for a short source-following physical curb/profile experiment only. This is source qualification, not implementation authorization or an appearance pass. All 35 plan items and 14 criteria remain intact; A5 remains open.

## Evidence and bound

Inspected the existing attribution instrument `tools/render-defects/crossing-surface.spec.ts` first. It requires browser/GPU capture, forbidden for this task. The retained CPU probe instead uses the actual production `decodeMesh`, `surfaceSampler`, and Three screen rays. No source/cache/build/runtime bytes changed. No browser, server, GPU, fetch, pipeline, model CLI, or public gate ran.

Opened the complete 1280×720 ordinary-app `street.png` at original size, SHA-256 `edbe05c27fc1e0f47e0e318b4be3bb88b70e440403e292f0b3f09dbbb85be6a6`. The pavement-to-road boundary is visually weak. The whole 1630 capture FAILED its live 15-second handoff; two valid originals do not make that capture PASS.

This report selects only approximately 1.044 m of the leftmost non-crossing edge: world (6.33347, z30.8) to (6.63306, z29.8), projected approximately pixels (3.31,419.45) to (52.60,417.04), using the supplied actual camera and production 55° FOV. It does not qualify the entire x0–275 foreground boundary.

## Source and installed geometry

The selected boundary is an edge of reviewed PLATEAU LOD3 semantic pavement polygon `poly_10ae5a2d-b4be-491e-8bf1-8b83df069ff9`, area `traf_3c0280f7-c73e-4d08-bab3-07b05ebf748e`, function 2000, parent `tran_f2a5948b-23c4-4932-83a2-a5c3591bf06c`. Its source edge joins (6.746,15.054,29.423) and (3.257,15.249,41.069); these are raw source heights, distinct from installed presentation heights. The four cached CityGML hashes match the reviewed selection, and current selection/road/pavement hashes match the recipe. Exact inputs and source ring are in `witness.json`.

Four opposite-side samples 1 cm from this edge give installed pavement Y 15.43231–15.44253 and road Y 15.35217–15.36239: a consistent **0.080138 m step**. It projects to approximately **2.85–2.92 pixels** vertically in this view. This existing height is an authored support/presentation rule, not a measured curb survey. The hero builder uses source/terrain +0.235 m and eligible road +0.08 m; roads already have a 0.2 m lift.

The recipe records 4,078 hero riser triangles globally. They do not establish a continuous curb at this selected edge. The finite exact-edge search finds no nondegenerate near-vertical face on this subsection; it finds top faces and narrow oblique seam faces. That search is explicitly bounded to the source line ±1 mm, z29.8–30.8, and edge spans ≥0.1 m; it is not a complete mesh-manifold proof. Nearby actual vertical faces around z29.44 face away from the camera (negative normal/view dot). The camera is on the pavement side, so even a correct outside face would have little visible thickness. Adding more vertical thickness alone has no established visual benefit.

Runtime draws pavement and risers with one sidewalk material: procedural 0.6×0.4 m paver detail on tops, a solid side response, roughness about 0.9 on sides, and no separate curb cap/profile. The dusk shading, small screen height, and inside-pavement viewing direction plausibly reduce edge readability. Pixel lighting/occlusion causality is not proven by CPU rays, which include roads/pavement only.

## Minimal constraints before an edit

The nearest mapped zebra is OSM way `1033129756`, endpoints around (6.646,20.356) and (9.542,20.914), width 5 m inferred; its centre path is 9.90 m from the selected midpoint. Way `1157451161` meets that same crossing endpoint. Preserve these existing openings and their width/envelope; do not add a curb continuously through them. No explicit curb-ramp generator or surveyed ramp profile was found. A prototype must terminate well before the crossing rather than claim an existing ramp is verified.

Mapped sidewalk way `1335178880` passes 1.788 m from the midpoint, width 2.5 m inferred. This is corridor evidence, not obstacle clearance. Keep any physical profile outside the actual walking corridor/actor footprint and preserve paint/tactile approaches. Walking support binds exact pavement bytes and traces actual triangles; changing those receivers requires renewed support/binding checks and supported transitions. A decorative mesh is not automatically a walking receiver.

The approved world is explicitly not survey-grade. Existing policy permits authored physical heights, hardware dimensions, paving detail and the TSUTAYA footprint extension. No policy requires an OSM-measured 10 cm curb. A generic dimension may therefore be disclosed and reviewed as authored presentation, anchored to this admitted semantic boundary and existing support. Prefer preserving the existing approximately 8 cm step while testing a real cap/bevel/profile. This is a bounded candidate, not a new surveyed-height requirement or a waiver of source, crossing, contact, native-review or five-gate obligations. Root must choose implementation after independent review. No signals, barriers, poles or other hardware are proposed from sparse absence.

## Smallest coherent next experiment

The 1.044 m witness is a diagnostic sample, not a proposed one-metre decorative shim. Follow the existing offline `pavement-hero.ts` → `exposedRisers` in `pavement-overlay.ts` → `compose-pavement.ts` → `pavement-recipe.ts` path for a coherent contiguous non-crossing edge/corner bounded by real source vertices and the existing crossing approach. First resolve which retained/adjoining top pieces own its outside boundary; `exposedRisers` deliberately suppresses a wall when a same-layer neighbour reaches the same height, and composition retains other parents outside replacement masks. Therefore missing exact-line vertical faces do not, alone, prove a closure bug or an intended bevel. An implementation must distinguish that ownership case from an exterior edge before altering closure.

Preserve all existing top footprints/heights and crossing transitions. If a true exterior edge is confirmed, generate a continuous physical cap/bevel/side from the installed top down to the eligible adjoining road, with disclosed generic profile dimensions and no paint-only stripe or floating outline. A side-only closure fix is physically plausible but may remain invisible from this inside-pavement framing; that is an unresolved visual-benefit risk. Prefer this existing offline ownership path over a disconnected runtime overlay, which could look raised while actor support still reads unchanged mesh bytes. Offline changes do require regenerated dependent digest-bound hardware/walking inputs and the existing gates. No full-AOI change or new persistent format is qualified here.

Cleanup: only synchronous Node probes were launched and each exited; no task-owned browser/server/GPU process was created. The optional process inventory could not run because Win32_Process access was denied. Retained report/probe/witness are intentional handoff evidence under ignored artifacts/curb1633.

```

## Findings and disposition

Root accepts QUALIFIED_BOUNDED_PROTOTYPE, not a confirmed closure bug or appearance PASS. The sampled installed step is approximately8 cm and three pixels; the exact-line search finds no vertical face, but outside-piece/equal-height ownership remains unresolved and a side-only change may be invisible. Approved generic authored physical dimensions remain allowed in this non-survey-grade world; exact measured curb height is not a new prerequisite.

Root authorized ONE coherent non-crossing edge/corner profile through the existing offline path, after resolving source ownership. Preserve top footprints/heights/support, crossing openings/transitions, markings/tactile approaches and the actual walking corridor. No one-metre decorative shim, new persistent format or global proof framework is authorized. Native pilot precedes expensive final gates; dependent digest-bound hardware/walking inputs and all existing gate obligations remain required.

The dispatched implementation owner is `/root/curb1633_source_question`, phase curb1635: `artifacts/curb1635/worktree`, branch `codex/curb1635-profile`, base94d50a6, bounded25 minutes. No GPU lease is granted. No code commit may precede all five final root gates. This later root authorization is separate from the unchanged source report's request for implementation choice after review.

## Verification

Original report, witness and probe SHA-256 values verified; report body retained verbatim. This documentation handoff ran no probe, source pipeline, browser, server, GPU, runtime gate or model CLI. The investigator's finite source/projection checks and denied optional Win32_Process inventory retain their original bounds. Existing owned synchronous probes exited; no new long-running process was created here.

## Round outcome

Bounded source qualification accepted and curb1635 prototype DISPATCHED without a GPU lease. Ownership and visible benefit remain unresolved until implementation and native review. No A5, quality, population, FPS or other criterion closes; only the existing A1/A4/A12 remain PASS. All35 stable items and14 original criteria remain intact.

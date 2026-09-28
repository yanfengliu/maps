# Pavement review 254

2026-09-28. Independent read-only source review of the prepared review-253 candidate. **Approve the source change for the later GPU appearance evaluation. No actionable code defect found.** This is not visual, GPU-compilation, performance, integration or final-delivery acceptance.

## Exact scope

Reviewed `C:/Users/38909/.codex/worktrees/rail-integration/maps` at HEAD `d7a3642e2f21bec7866b2e7ad972785c0160c4bd`. Recomputed the following SHA-256 values; the two working files also match their frozen candidate copies. The existing 32 rail changes were not reopened or edited.

| Input | SHA-256 |
| --- | --- |
| `src/scene/surface-materials.ts` | `f905020c983366b27a763fd3403d5ed50eab06904d15c0994133cbcfeaf886c6` |
| `test/surface-material-shader.test.ts` | `970eaf5b6ffa193f0c8ce5ba8ddab7a0eda83d85bda780df5fbe866c53cb01ea` |
| `artifacts/crossing-material253-20260928/freeze.json` | `5d5ead049a8d58728c5bd95ed03949f90bd693e32cf72661f8d1ff58bea651d0` |
| `artifacts/crossing-material253-20260928/candidate.patch` | `ebc050ae72569b7a6d19db5bc3941318db6a453d5bf02c5d2566361b8916a0a8` |

Read the repo instructions, relevant local rules and lessons, proposal 253, the two-file patch, emitted-arithmetic tests, retained run/mutation evidence and helpers, and existing style/material application sites. A memory search returned no relevant entry; no memory fact was used.

## Source and evidence findings

The interval primitive integrates a periodic filled interval, including negative coordinates. The two half-frequency Y intervals select the even and odd rows separately; each multiplies the corresponding X interval, so footprints crossing a row boundary include both stagger phases. `fwidth(cell)` is taken from continuous world coordinates before either phase is introduced. The existing 0.6 x 0.4 metre alignment and 0.012 fractional seam boundary remain intact.

One independent asymmetric rectangle calculation checked the case where both row phases contribute but only one crosses a vertical joint: X `[-0.03, 0.07]`, Y `[0.92, 1.12]`. Direct rectangle areas give `(0.076 * 0.068 + 0.1 * 0.108) / 0.02 = 0.7984`; evaluating the actual emitted helper returned `0.7984000000000004`, an absolute difference of `6.66e-16`. This was one double-precision calculation, not a suite or GPU check.

The mean normalization is consistent with paved area `0.976² = 0.952576` and old mean `1 - 0.25 * 0.047424 = 0.988144`. It reduces resolved joint-to-paver contrast to 12% for Satellite and 8% for Cartographic while retaining that analytical mean. Existing palette assignment and roughness stay unchanged. The shared uniform object is changed by the actual `apply` function and `createRoads.setStyle` already reaches it; the test observes that same bound object across both style changes. Only the sidewalk cache key changes. Road/ground branch source is unchanged; the inspected comparison script and its retained result also report identical generated stages and uniforms against actual `ShaderLib.standard`.

The focused log records 19 passing tests. The nine area expectations include resolved interiors/joints, stagger parity, a row boundary, negative coordinates and complete periods. The test executes emitted scalar expressions instead of a separately copied implementation. Both mutation logs contain assertion failures: six for constant coverage and four for the old expanded mask. Their scripts genuinely replace source and restore it in `finally`. The handoff correctly limits the old-mask control to explicit scalar footprints and describes the arithmetic as JavaScript doubles. Existing shader-anchor refusals remain. My two-file `git diff --check` passed.

**P3 — repair the missing typecheck evidence reference.** `HANDOFF.md` names `types-final.txt`, but that file is absent from the retained directory. `freeze.json` records `typecheckExit: 0`; I did not inspect the corresponding execution result. Before repeating that check as independently evidenced, retain the actual command/exit receipt or correct the handoff and obtain the narrowly scoped receipt. Root confirms it currently has only the owner's report and has accepted ownership of this follow-up. This bookkeeping finding does not identify a shader defect or block later appearance evaluation.

## Acceptance bound and resources

The axis-aligned box remains an approximation to a projected pixel. The arithmetic checks do not establish single-precision GPU behavior, successful shader linking, lit/tone-mapped mean colour, appearance, aliasing in motion or frame cost. The 12%/8% settings remain art-direction candidates. After the actor milestone, root still owns the six matched native hero pairs, ordinary style controls preserving camera/actor progress, unchanged input provenance, the existing five integrated gates and independent required native-view inspection, including surrounding pavements. No code commit or final acceptance follows from this review alone.

No source, tests, canonical docs, dependencies or Git state were edited. No browser, GPU job, server or GUI was launched. The single synchronous Node calculation exited. A final CIM process inventory was denied access; its resulting empty count is not cleanup evidence. No persistent process was created by this review. The frozen source and freeze hashes were rechecked unchanged before handoff. This owned report is retained for integration; there are no review-created temporary artifacts to remove.

# Review 113 — D1 paired tree appearance

Verdict: **ACCEPT within the inspected stills and short video slices.** The credited native observations report finer leaves and readable connected forks, sufficient crown body at dusk and in the held-out angle, modest row variety, and no material new defect in the tree or its surroundings. This is a composite independent review record completed by `tree_review_record` on 2026-09-27. The record author checked text, hashes and timings and opened no images. It does not replace the separate final 44-frame review or final integrated gates.

## Target and inspection credits

The target is `d1-pair-s1-02` in `C:/Users/38909/.codex/worktrees/shibuya-quality/maps/artifacts/street-detail/capture-prep/runs/`, against accepted S1 base `3707c2ecc4e57343531c3af7604bde249fc76491`. Candidate `src/scene/vegetation.ts` is SHA-256 `c9c1526f07bd7bebc3bc4edbc041b75a60a2a50c7b4d34ec3210682564f21aac`; `test/vegetation.test.ts` is `80e4e2e62f926957d7de77e4bad2a64cef5d6d430bfcc14fa41d23cb12d702cb`. Both primary-checkout files still match those bytes. Source review 105 remains the source-review record; this report does not rerun it.

`cutout_visual` personally inspected all 16 native 1280×720 matched stills, 40 consecutive baseline video frames and eight baseline anchors. Its 64-row ledger records the still observations and before/after hashes. Near crowns have finer leaves, irregular rims and connected brown forks; the dusk and held-out crowns retain a leafy middle. Row repetition is reduced, not eliminated. Forks are less legible in the held-out dusk angle. Root placement, markings, curbs, signals, boards and surrounding facades show no material new regression in those observations.

`tree_review_recovery` rehashed that ledger and personally opened all 40 candidate native video frames singly, plus baseline first/middle/last frames in each style. Its observations confirm coherent tree and background parallax, retained crown volume and trunk connection, and no material new defect in the inspected moving subset. Whole-frame encoding softness and view-dependent gaps are recorded; neither is claimed to prove freedom from fine temporal aliasing.

Each candidate sequence contains 20 consecutive frames at 25 fps: a 0.8-second encoded window, or 0.76 seconds from first to last PTS. The first nine frames show the held pose; the last eleven show movement. The candidate Satellite slice spans PTS 92,040–92,800 ms, with unambiguous movement at 92,400–92,800 ms. Cartographic spans 90,680–91,440 ms, with movement at 91,040–91,440 ms. Baseline slices span 91,640–92,400 ms and 90,760–91,520 ms respectively. These are separate media timelines, not synchronized matched motion frames. No reviewer is credited here with inspecting the whole videos or the full 2.818–2.829-second pointer spans. Container and wall-clock timestamps do not establish frame-exact synchronization.

## Provenance and timing

Read-only checks against the actual preserved files pass. Each arm's source, build, harness, served-data and GPU records agree before and after capture. The inventories contain 146 source, four build, 32 harness and 117 served files per arm; every recorded file was rehashed. Across arms, shared runtime, harness, scene and GPU records match, and only `src/scene/vegetation.ts` differs in the source inventory. The 301,782,754 served bytes bind to digest `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`. Recorded hardware is RTX 4090, driver 616.64. All eight still pairs have identical camera, requested pose, style and lighting. Media hashes and native image dimensions match. These checks establish current disk bytes and recorded pre/post observations, not protection against an unobserved mid-run external writer.

**D1-TIMING-01 — documentation correction resolved.** The capture helper initializes `previousTime` with `performance.now()` and then subtracts it from the first RAF timestamp (`capture.ts:21–22`). Each 120-entry raw series therefore contains one start-to-RAF value followed by 119 adjacent RAF intervals. The first value is −0.40000001788212103 ms in baseline Cartographic held-out dusk and −1.1000000178828486 ms in candidate Satellite crossing dusk. Preserve all raw records and exclude entry zero from every series, including those with a positive first entry. Recalculation of all 20 series yields 2,380 finite positive adjacent intervals. At 0.1 ms precision, every corrected median remains 16.7 ms, p95 is 16.7–16.8 ms and maximum is 16.8 ms. The recovery evidence already contains these corrected values and the record author independently reproduced them.

The integration owner corrected `docs/work/0_shibuya-1km/tree-detail-design.md:17` to distinguish the raw entries, partial first intervals and uniformly corrected 119-interval summary, while preserving the performance limits and original records. The record author directly read that paragraph and verified the corrected document's SHA-256 `2b5e24149439035e201e938160b24de2532ff8a801d38b4859c9a411dd7a7486`. This is a measurement-description correction, not a visual product finding. Neither the raw nor corrected refresh-paced, agents-disabled series resolves added draw overhead, GPU execution time, whole-process VRAM or populated performance.

## Interruptions and cleanup

The first capture run, `d1-pair-s1-01`, failed at remote `Video.path()`. Its evidence and the approved one-line `saveAs` repair remain preserved. The successor's inner receipt records restored source and successful closes; the separate outer receipt records exit 0 and empty retained-survivor, unadmitted-live, scoped-live and port-listener arrays. Initial admission omissions remain recorded and are not erased by the empty final set.

The two image-heavy review sessions also suffered API BadRequest interruptions: the original reviewer was interrupted twice, and the recovery reviewer was interrupted after saving its inspection and evidence records. Both native ledgers remain marked `in-progress`; this authored composite closes the record using their completed observations and the coordinator's attributed handoff, without altering either ledger or inventing a missing personal inspection. Those transport interruptions and the earlier video-save failure are infrastructure history, not product findings. This record launched no browser, server, GPU work or decoder and left no task-owned long-running process.

## Binding records

All paths below are under `C:/Users/38909/Documents/github/maps/artifacts/`. Keep the linked raw records while this review or its promotion needs them.

| Record | SHA-256 |
| --- | --- |
| `tree-visual-review-20260927/inspection-ledger-progress.json` | `0ef6f2cc41dc513db94616be6d56e7cef05b36f94b301cb4489aa6614ac4da44` |
| `tree-visual-review-recovery-20260927/inspection-ledger.json` | `cd06ef372e720738d468864321f8b180bac03f95436290097d3725ad854ac87c` |
| `tree-visual-review-recovery-20260927/evidence-checks.json` | `88ff9b3b31b8ef5effc252e86fc359a8e47c6bdf546d472d8662fe1c3472a5b8` |
| `tree-paired-review-record-20260927/record-checks.json` | `28b8b24b7a159436988340c5ba37544a79215465ea74f148b012ba040bc04d8d` |

The last record binds the immutable arm manifests, comparison, pair and outer receipts, handoff, extraction records, helper and recovery checker, and contains each recomputed timing value. `verify-record.mjs` writes only this task's record and does not modify preserved evidence. No material paired-review finding remains open. Visual acceptance is bounded as above; the integration owner separately accepts the final integrated revision.

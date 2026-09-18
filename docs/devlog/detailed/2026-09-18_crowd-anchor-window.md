# The crowd leg's anchor was chosen on its best tick, and a run does not land on one

Session: 2026-09-18, branch `crowd-aim-window` off `main` at `b4a7053`, worktree `artifacts/crowd-aim-fix/wt`.

This replaces the anchor that landed on 2026-09-17 as `7c8cb38`. `tools/flythrough/` and docs only: no `src/`, no `index.html`, nothing the certificate pins.

## What happened

The re-planned route was flown on the merged revision and the lane's own `judgeSequence` refused it:

```
5 of 6 held frame pairs show a scene that went still while the camera was deliberately
held (crowd-007..010: the same bytes as the previous frame)
41 distinct digests across 46 frames (89.1%), the most repeated one appears 6 times
```

The route mechanics were exactly as planned — the crowd leg opened at camera `(458.3, 405.9)` against target `(454.9, 380.2)`, 26 m, azimuth 7.5°, clearance 3.0 m, and the approach's swing ran 45° → 7.5° at about 0.11 rad a step. What was wrong was **when** it ran.

The run took 127 s of wall clock against 72 s for the run before it, because eight inspection lanes were reading images. The simulated clock advances with wall time, not with the step count, so the crowd leg captured at ticks **4,899-5,332** where the previous run's had captured at ~3,000. The anchor held 225 walking bodies inside 45 m at tick 3,000 and **4** at 5,400. The held frames photographed a scene with no walking crowd in it, and identical bytes is what that looks like.

Every leg moved with it, not just the crowd: overview 1401-2877, approach 2983-4837, crowd 4899-5332, ascent 5737-7672, at a measured 59.5-63.5 ticks per second of wall time on both runs. **A leg's tick is not a property of the route.** The plan I wrote said so in its own header and then chose an anchor that needed a particular tick anyway — which is the actual defect this session fixes.

## The measurement

Six dumps were generated on this revision, with the command and revision named beside them:

```
node tools/populated/probe.ts --ticks 3000 --dump-tick 3000 --dump-file artifacts/crowd-aim-fix/dump-t3000.json
node tools/populated/probe.ts --ticks 4000 --dump-tick 4000 --dump-file artifacts/crowd-aim-fix/dump-t4000.json
node tools/populated/probe.ts --ticks 4900 --dump-tick 4900 --dump-file artifacts/crowd-aim-fix/dump-t4900.json
node tools/populated/probe.ts --ticks 5400 --dump-tick 5400 --dump-file artifacts/crowd-aim-fix/dump-t5400.json
node tools/populated/probe.ts --ticks 6000 --dump-tick 6000 --dump-file artifacts/crowd-aim-fix/dump-t6000.json
node tools/populated/probe.ts --ticks 7200 --dump-tick 7200 --dump-file artifacts/crowd-aim-fix/dump-t7200.json
```

All six at 18:24-18:26 on 2026-09-18 against `data/scene/terrain.mesh` SHA-256 `FEF57D09…`. The AOI's walking population falls across the window: 1,979 moving positions at tick 3,000, 1,575 at 4,000, 1,938 at 4,900, 1,607 at 5,400, 1,133 at 6,000, 723 at 7,200.

Every walking-way camera was then scored at every tick, and the anchors were ranked by their **worst** tick rather than their best. The chosen one and the two it beat, at 26 m:

| anchor | 3,000 | 4,000 | 4,900 | 5,400 | 6,000 | 7,200 | worst |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **chosen (456.0, 389.7)** | 152 | 99 | 95 | 100 | 100 | 10 | **95** (in the leg's band) |
| merged (452.07, 353.95) | 225 | 131 | 70 | 4 | 4 | 6 | 4 |
| investigation's (481.963, 381.247) | 122 | 0 | 2 | 1 | 1 | 0 | 0 |

Those are walking bodies in the frame within 45 m — the leg's subject — and the chosen anchor's 1.7 m figures are 131 / 36 / 55 / 55 / 39 / 25 px at the median body. The merged anchor's near counts collapse exactly where the loaded run landed; the investigation's candidate, which the coordinator suggested, is 0 at four of the six ticks *in this frame orientation*: its camera position is good but the run's bearing points the other way, and a 26 m pose at that bearing holds nothing legible.

## The pose convention, settled from the run's own numbers

The failed run's records settle a question that cost this session some time. Its crowd leg read camera `(458.3, 16.8, 405.9)` against target `(454.9, 15.2, 380.2)` — an offset of `(+3.4, +25.7)` — and its reported azimuth is 7.5°. So the camera stands at `target + (sin az, cos az) * distance`, the bearing is measured from the target to the camera, and the view direction is the opposite one. The plan's formula was right; a scratch verifier written from the wrong sign reported near-zero crowds for every candidate until the run's own pose corrected it. The formula now carries that evidence in its comment.

## The run that verifies it

`npm run visual:flythrough` in the worktree, on the frozen tree, 2026-09-18:

```
✓ 1 [chromium-flythrough-iteration] › flythrough › drives a moving camera through
  the real controls with the population running (2.1m)
  1 passed (2.2m)
```

Exit status 0. From the manifest it wrote:

- `failures`: **absent** — `judgeSequence` reported zero failures.
- **46 distinct digests of 46 (100%)**, where the refused run had 41. No digest repeats.
- The held pair `crowd-007` through `crowd-011` changed by **8.5%, 4.5%, 5.7%, 4.2% and 3.6%** of pixels, against byte-identical (0%) before, with camera travel 0.0000 m on the last four — the camera really is held, and the population is what moves.
- The crowd leg ran at ticks 3,985-4,328, where the anchor holds 95-100 walking bodies inside 45 m.

The machine was lightly loaded for this run (2% CPU, 16 node processes), so it reproduced the *unloaded* end of the spread — the crowd leg at ~4,000. The anchor's band from 3,000 to 6,000 is what covers the loaded end, which is the property the merge lacked.

## What this does not prove

- **The loaded end is measured, not flown.** The new anchor's numbers at ticks 4,900-6,000 come from offline dumps. A future run under the same load as the refused one would land there, and the dumps say it holds 95-100 near bodies and 39-55 px figures; no run has flown that.
- **Tick 7,200 is thin.** Ten walking bodies inside 45 m at the median 46 m, 25 px figures. It still passes the scorer's floor, but a run landing there would be a poor crowd leg rather than an empty one.
- **The held-pair judgement is one run.** Six held pairs is the whole sample, and the check reads pixels rather than agents; the run's own records agree, but the mechanism that made the previous run's pixels identical has not been reproduced deliberately.
- **Building occlusion is still unchecked.** The nearest body in frame is 4.0-23 m out, and no cached per-building footprint is on this machine to test a wall between them.

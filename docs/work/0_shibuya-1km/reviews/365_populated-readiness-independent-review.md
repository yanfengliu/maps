# 365 — Independent populated readiness review

2026-09-29 local / 2026-09-30 UTC. **AMEND the use of the 20-second clock as populated-quality pass/fail. KEEP 357/359 as inadequate cold-start observations.** The supplied user mandate asks for recognizable moving pedestrians and vehicles and supreme Satellite visual quality; it supplies no 20-second startup deadline. The local rules require modest review sampling, ordinarily 30 fps, while preserving the fixed 60 Hz simulation. This review recommends a contract correction only. It does not accept a runner change, an initialization scheme, a candidate or the populated/full-map result. Root acceptance and implementation remain separate.

## What the instrument actually measures

I read the exact retained 357 retry runner and the existing PopulatedDriver; these are the only two instrument/source files inspected. The runner first reaches the accepted camera through real controls, waits for idle tiles and settles, then polls for `attached && rendered.attached && simulatedSeconds >= 20`. Its separate 30,000 ms wall-clock guard starts after that preparation. Twenty seconds is a minimum simulated-clock threshold, not an exact deadline or a test of crossing visibility. Slow preparation can make recording start later. PopulatedDriver reads the published clock and counts without mutating state.

The actual capture starts at tick 1203 / 20.05 simulated seconds. Its five same-task native canvas copies are at 20.083333, 21.266667, 22.483333, 23.683333 and 24.883333 seconds; wall sample gaps are 1184.7, 1215.1, 1200.6 and 1200.4 ms. Recording requested 30 fps and reported 30 fps track settings, over 4817.8 ms. This is a sparse observation of that opening interval. It has no predicate establishing central actor readiness. All five actual PNGs were rehashed and remain byte-identical. The empty appearance conclusion is the independent native review in 359; I did not reopen images or decode the clip here.

The raw 360 summaries reproduce the 150/20 demand, seed 5970698 and 1/60 step. At 20.05 s, the nearest human/vehicle is 480.23/442.23 m from the origin. Raw 363 finds 18/33 true boundary portals graph-reachable to a crossing within 60 m, with a minimum 500.038 m of directed delivered source length. That is a source-station lower bound ending at an edge start, not a fitted body path, camera visibility or physical travel-time proof. It nevertheless gives no basis for assuming this cold-start clock represents a central event. Global active/drawn counters cannot repair that mismatch.

A later clock alone is not a supported correction. Raw 360's unchanged 600 s replay has zero peak scramble occupancy, nearest human/vehicle 221.00/377.29 m over the run, and final longest waits 574.13/584.75 s. It does not establish the exact wait cause. It directly defeats the proposal that merely waiting a little longer is a demonstrated solution. Neither 500.038 source metres nor the 600 s stall result establishes a valid replacement numerical deadline.

## Smallest proposed correction

Keep the original 20-second result as a disclosed startup baseline. Separate mechanical readiness from the populated appearance score. Replace the fixed opening clock for that score with one prospectively specified, bounded observation of an actual supported crossing event on the ordinary timeline. Preserve the true-boundary cold start; this proposal introduces no inhabited initializer.

Before scoring another candidate, freeze the event trigger and a finite simulation/wall observation bound, with their evidence, for every candidate and held-out run. The trigger must concern actors relevant to the unchanged camera and retain actual source identity, supported body progression and authority state. It must select the first eligible event/window under the same rule, not a preferred later window after an earlier failure. Diagnostic positions or global counts can locate a candidate event; they cannot establish recognizable pixels or grant visual acceptance. The current record contains no supported central body event or measured arrival budget from which to complete that preregistration. That is an explicit unresolved prerequisite owned by root, not work this review has silently marked done. Do not run an arbitrary longer capture under this recommendation.

For the eventual one eligible window, keep demand 150/20, seed 5970698, noon/Satellite, the exact accepted controls-driven camera, pinned raw scene/assets, ordinary fixed steps and all admission/source/body/support/authority refusals. Record actual activation, readiness, window, render-frame and simulation times, including preparation overshoot and refusals. Keep the requested 30 fps, 4.8-second clip and five original 1280x720 stills at nominal 0/1.2/2.4/3.6/4.8 s; disclose achieved gaps. Pass still requires recognizable plural pedestrians and one recognizable road vehicle visibly advancing between disclosed samples, at least one pedestrian occupying the crossing, plausible scale and no conspicuous penetration or disappearance in inspected samples. Missing readiness or an empty/invalid window fails that run; no timeout, retry or favorable-window search becomes success. Apply the identical frozen rule to seed 42 only after the first candidate passes, without tuning on 42.

## Failure-mode audit

| Failure mode | Required disposition |
| --- | --- |
| Treating an invented clock as the user's visual requirement | Amend its scoring role; preserve the observed empty startup result and latency. |
| Calling a threshold of 20 an exact capture time | Record actual clock and preparation overshoot; 357 captured 20.083–24.883 s. |
| Calling global attached/drawn counts visible readiness | Refuse; 357/359 supply a direct empty-pixel counterexample. |
| Treating graph reachability or source metres as body motion | Refuse; support, clearance, admission, authority and visible realization remain required. |
| Extending the deadline to hide a stall | Refuse; 360 is counterevidence, and the exact mechanism remains unresolved. |
| Near-camera initialization, teleport, timewarp or skipped authority/contact steps | Outside this minimal observation correction; no such implementation is accepted here. |
| Camera/input/source changes, hidden refusals or cherry-picked windows | Retain all disqualifiers and one frozen first-event rule across candidates/seeds. |
| Calling requested 30 fps or five stills continuous motion/contact/performance proof | Refuse; encoding cadence and inter-sample footage remain unreviewed. |

## Actual bindings and limits

These are SHA-256 of actual bytes rehashed here, not new run certificates. Paths are relative to primary unless prefixed with 360's retained root. The driver has no `git diff HEAD` on main `1e840ac590149c1bae2760ca4e6ef06f521fd6b9`; its raw LF hash equals 360's normalized driver hash. I did not read the unrelated working-tree changes or recompute the complete scene/build/source binding.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/readiness365-review/populated-crossing-search-inspected.md` |3347|`75255094aa91d5894bb037bb8853193a4f3ac8fae17c749b3d25cb41c95499dd`|
| `reviews/357_populated-crossing-observation.md` |8743|`dfd340300b09d54595f904759a80defbaa02957dd3fd6f3594c6e44fa5b05aaf`|
| `reviews/359_populated-crossing-independent-review.md` |6147|`8da52a6ec96a66ccc772b89030f476cd6f80bc0165352098b48d14b21764a8de`|
| `reviews/360_populated-arrival-diagnosis.md` |5316|`2da176f5c7bbcd341f2c8f1a9e6d96636db6d2c5076ad4bc781d6990772bd5c6`|
| `reviews/363_central-route-branch.md` |6723|`be1fa19caf77f1b0df83e460c6cc1a7b803005dfd189e01bf01a762737f4e31f`|
| `artifacts/populated357-retry1-20260929/capture.mjs` |13616|`6a253297d08d55e5c36b219f5d29028169b4dd493b0c70b90e1bd23d68fa0754`|
| Same root, `capture.json` |514190|`4df20fc346d8ebf98fbf7901bff7e610cdd1ebc467f2539d64937ad747985bf0`|
| Same root, each of `representative.png`, `keyframe-1.png` through `keyframe-4.png` |1398986 each|`a9067297fd534397d4f14cdb60b2ba44fb664c39d55b9f61d2018e83215fb5d9`|
| `tools/populated/driver.ts` |13406|`1479e468c36cad8822057f92130f3cb8a5c64dcda404b3c7cae26936e7d443e8`|
| `artifacts/route363-20260929/centre-route-census.json` |40172|`438a3e79bb24894d1f2da80e0b388dd29b9ffc9ee085a82fd8af439d3442c572`|
| Same root, `receipt.json` |441|`4b96ef62bb0b88a9493c353380b621fde99a6a0e4fb2e8f2bbc6cbaa8339f107`|
| 360 root, `source-command-cleanup.json` |5498|`68bdd62ba8d0f2431418f892ae5add03524adcb67599059b5155f57b82016a02`|
| 360 root, `probe-t1203.json` / `positions-t1203.json` |27047 /4534|`f83aa09be2c77ee3edc3a5f34dc18b12b95f4330666fbfcc56fd2679ede0234a` / `7dd0df074b72b14056db06a91d36cb81ca52a694f0e672585b29aa404ddd7d12`|
| 360 root, `probe-t36000.json` / `positions-t36000.json` |181217 /3843|`cfe83c065231be38490324380eca0313f312fc9c0c29c833aaf586da114eb558` / `21eacbc5df05eb458f7eb710010fc5d0c7f2498688b2c8625ac0e552c5e386d3`|

Review-document paths are under `docs/work/0_shibuya-1km/`. The contract row binds the exact retained snapshot re-read after root changed only mechanism-status rows. Its reproduction, pass and disqualifiers match the original read; no current hash is asserted for the mutable canonical contract. The 360 root is `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/centre359-readonly/`. Raw 363 and 360 retain network SHA `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`; 360 also retains fleet SHA `5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01`. I inspected those receipt pins, not the actual network/fleet files anew.

No source/data edit, browser/server/GPU launch, new probe/replay, gate, commit or push ran. This review uses the supplied mandate and recorded local rules rather than retrieving the original full user conversation. Only this unique permanent review file and its exact ignored contract snapshot were created; no persistent process was created to clean. The snapshot remains needed to bind this review independently of canonical contract edits. The shared frozen read-only source and uniquely owned output avoid overlapping writes without another worktree. No populated, continuous-contact, whole-map or 3000/200 performance acceptance follows.

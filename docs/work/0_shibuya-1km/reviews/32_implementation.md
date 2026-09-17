# Round 32 — independent review of the two flythrough fixes

Reviewer: an independent, read-only lane. Revision reviewed: `39ca459` (main advanced to `144766b` during the round; that commit is docs-only and the reviewed code is byte-identical there). Authored under `artifacts/review-flythrough-fixes/r1.md` and preserved here on 2026-09-17, because authored review rounds belong on `main` rather than only in ignored task output. Verdict: **no blocking finding**. Its six non-blocking findings were applied on `f160fe9`, merged and pushed, each verified against the real bytes first — and one of the review's own reproductions was corrected during that work: the structure metric samples every second pixel, so the flat-dark-surface flaw needs a two-pixel-block dither rather than the one-pixel checkerboard the review used. The dispositions are in `docs/learning/gate-proofs.md` and the plan's dated status block.

# Independent review — the two flythrough fixes at 39ca459

Read-only review of `f06aaf8` (the sequence-check repair, commits `934a363` + `54a9422`) and `39ca459` (the approach-swing repair, commits `67aa9c9` + `66a0bfb` + `c9c1740`) against their stated purpose.

Revision reviewed: `39ca4595f0ea843b5598036ddbdcbc0655f35dd5`, the revision the task named as main.

While the review ran, main advanced to `144766b` ("docs: the session's record …"). That commit touches only `docs/learning/defect-register.md` and `docs/work/0_shibuya-1km/plan.md`; `git diff --stat 39ca459 144766b -- tools/ test/ src/ package.json` is empty, so every line reviewed here is byte-identical at current main. The working tree is clean at `144766b`.

Verdict: **no blocking findings.** Both changes do what they claim on the files and numbers I could reach; the two adjudicated complaints are genuinely repaired, the red control is untouched, the driver refactor is behaviour-preserving, and the swing arithmetic is right and was confirmed in a real post-merge run. The findings below are non-blocking weaknesses, most of them in what the changes document about themselves.

## Findings, most severe first

### 1. (medium) The structure floor now admits a frame filled by a genuinely flat dark surface, and the guard the header relies on is untested

`tools/flythrough/structure.ts:14-15` claims "The relative leg is guarded by a mean above 2 so a near-black cell cannot qualify on noise, and a genuinely flat dark wall keeps a ratio near zero and still fails." `tools/flythrough/structure.ts:48` is `if (deviation > 12 || (mean > 2 && deviation / mean > 0.3)) structured += 1;`.

Reproduced with the shipped function over a synthetic 1280x720 frame that is one flat surface at mean luminance 3 with ±1 unit of non-aliasing dither (the quantization dither a real dark frame carries): `structuredFraction` returns **1** — 144 of 144 cells "structured". Each cell's deviation there is 1, so the pre-fix rule (`deviation > 12` alone) scores 0 and fails it. At mean 3 the guard's "near-black" protection is over at 2, and the relative leg needs only `deviation > 0.9`, i.e. ±1 of an 8-bit level. A flat dusk wall at mean 30 with ±8 (`deviation 8`, under the absolute leg) still scores 0 and fails correctly, so the hole is at the dark end only:

```
flat dark wall, mean 3, +-1 non-aliased dither: 1
flat dusk wall, mean 30, +-8 non-aliased dither (dev 8 < 12): 0
```

Bounded severity: the surviving recorded run's darkest frame has `meanLuminance` 23.2 (`artifacts/flythrough2/manifest.json`, run of 2026-09-17T17:06:47.805Z), so a whole frame dark enough to trip this has not occurred; but 56 cells across 21 of that run's frames already qualify **only** through the relative leg at mean ≤ 10 (`deviation ≤ 12`, `deviation/mean > 0.3`), so the dark end of the rule is doing real work and nothing bounds it.

The guard is also unpinned. Removing `mean > 2 &&` from `tools/flythrough/structure.ts:48` leaves all 15 cases in `test/flythrough-frames.test.ts` green (`artifacts/review-flythrough-fixes/scratch/structure.mutB.ts` + `structureGuardMut.test.ts`, `15 passed`). The only fixtures at `test/flythrough-frames.test.ts:216-229` are a dark textured facade at mean 20 and a uniform sky at mean 200; neither can fail if the guard disappears.

Would resolve it: give the relative leg an absolute floor as well (roughly `deviation > 2`, or raise the mean guard), and add a case asserting that a flat dark surface with dither fails — the case `structure.ts:14-15` already promises in prose. If the dark-noise window is accepted deliberately, say so in the header and in the gate-proofs bound instead of claiming the guard closes it.

### 2. (medium-low) The hold exemption is not self-limiting: a camera that never moved passes if every frame is marked held

`tools/flythrough/frames.ts:148-149` exempts from the travel floor every frame whose record says `cameraHeld: true`, and nothing anywhere bounds how many frames may carry that mark or checks it against the plan's six marked steps (`tools/flythrough/plan.ts:383`; the count is never asserted in `tools/flythrough/flythrough.spec.ts`).

Reproduced: six synthetic frames, every non-first `cameraTravelM: 0`, every one `cameraHeld: true`, digests distinct and counters advancing, and `judgeSequence` returns **0 failures** — a completely static camera reported as a flythrough. Today the plan marks exactly six steps and the recorded run's manifest carries exactly 6 `cameraHeld: true` frames, so this is a trust boundary rather than a live defect; but the travel floor, the check's main claim about the input path, is now one plan flag away from being vacuous over the whole route.

Would resolve it: have the spec assert the held set is what the plan marked (count and contiguity — six consecutive steps at the tail of the crowd leg), so a mis-set `holdsCamera` cannot silently widen the exemption.

### 3. (low) The manifest is still destroyed by a failure inside the capture loop, which is the run shape the fix was written for

`tools/flythrough/flythrough.spec.ts:554-597` writes the ledger after the capture loops, and moves it ahead of the sequence assertions — that part is correct and does what the commit says. But the per-frame assertions still sit inside the loop: the clearance assertion at `:476-481`, the renderer at `:482`, the viewport at `:483-487`. Any of those aborting still leaves no manifest.

That is not hypothetical: the swing defect was found by exactly such a run — `artifacts/flythrough2/clearance-adjudication.md:8-9` records a run that stopped at frame 23 of 46 with `crowd-000.png` 0.58 m under the terrain, and its evidence section (`:41-46`) had to reconstruct poses from a 45 MB console trace because there was no pose ledger. So the residual gap is the same defect class the move fixed, one assertion earlier.

The in-code comment at `tools/flythrough/flythrough.spec.ts:554-562` ("A failed run is exactly the run shape that needs adjudicating, so the ledger is written first") and the merge message's "written before the assertions" both read as if every failure is covered; only failures after the capture loops are. The `failures` field has the same narrower meaning: `tools/flythrough/flythrough.spec.ts:587` carries `judgeSequence`'s failures only, while the preset, post-chain, console-error and ledger-count failures at `:599-610` are asserted separately and never recorded.

Would resolve it: append or refresh the ledger as each frame is recorded (or wrap the loop so a throw persists what exists), and say in the comment that the field is the sequence judge's failures, not every failure.

### 4. (low) The ascent's stated measurements are imprecise, and the plan test cannot see its last step

`tools/flythrough/plan.ts:412-418` (repeated in `docs/learning/gate-proofs.md:976`, the devlog and the register) says the ascent "reaches `OPENING_AZIMUTH` at step 10 with one step spare" and measures "3.538 rad of travel".

Flown through the shipping `rotateStepRadians`/`shortestAngle` at 720 px and the 40 px cap: it arrives **exactly** on the final step, index 10 of 0..10 (error 0); the step before it (index 9) is 0.0436 rad short. There is no spare step in the strict sense — the last step is the one that lands it. Total |delivered| is **3.5343** rad, not 3.538. The reversal point and the 1.0472 rad wrong-way leg are correct, and 11 × 0.3491 = 3.840 is correct.

Consequence for the gate: `test/flythrough-plan.test.ts:38` allows `TOLERANCE_RAD = 0.05`, so deleting the ascent's last step leaves the end 0.043644 rad off and the case still green (reproduced in `probe2.test.ts`: "without last step 0.829042 (off 0.043644)"). The ascent half of that case therefore does not pin the step count it is cited for; it pins only "within 2.9 degrees", and a 0.0436 rad error is exactly what the claimed spare step is worth.

Would resolve it: restate the claim as measured ("lands exactly on the eleventh step, the tenth carrying the last 0.0436 rad") and fix 3.538 → 3.5343, or tighten the ascent tolerance below 0.0436 if the exact arrival is the property worth keeping. The comment's "a longer route would not fit the cap" stands.

### 5. (low) The calibration figure is not reproducible at this revision, and its cited evidence has been deleted

`docs/learning/gate-proofs.md:952` records approach-005 at **15.3% (22 of 144: 6 absolute + 16 relative)** against the 5% floor, "measured with the shipped function over the real frame bytes", citing `artifacts/flythrough-fix/scratch-calibration.txt` "script beside it". That directory and the lane's worktree are gone (`git worktree list` shows only main; no `scratch-calibration*` or `verify-swing*` file exists anywhere in the tree), so the claim cannot be re-derived from its source.

What survives is a different run's bytes: `artifacts/flythrough2/frames/approach/approach-005.png` (SHA-256 `5abe0a752112b49d0a7f83264a7b7d07a47ff0fb04d8cda8cf6d1def03084d36`, matching that run's manifest) scores **17.4% = 25 cells, 6 on the absolute leg and 19 on the relative leg** under the shipped `structuredFraction`, and the run's own manifest records `structuredPixels: 0.173611…` for it — so the instrument agrees with the recorded evidence. The absolute-leg 6 cells (4.2%) reproduce the adjudication exactly. The flattest cell (3,8) is confirmed structured-free: deviation 0.376 at mean 25.45, ratio 0.0148 (`docs/learning/gate-proofs.md:952` states 0.374 at mean 26.0 for the older bytes).

The conclusion is unaffected — the frame is far above the 5% floor either way, and the pre-fix rule fails it — but the published number is a third run's and its only provenance is deleted. Would resolve it: re-run the calibration against the frames that survive and cite that artifact, or mark the 15.3% as measured on bytes no longer on disk.

### 6. (trivial) Two documentation/evidence slips

- `docs/learning/gate-proofs.md:978`: "The cap is `maxRotatePx` 40 and the canvas height 720, both read from the shipping code rather than restated." The canvas height is read (`test/flythrough-plan.test.ts:66`, `CAPTURE_VIEWPORT.height`); `MAX_ROTATE_PX = 40` at `test/flythrough-plan.test.ts:34` is a restated constant. It is correct today only because `tools/flythrough/flythrough.spec.ts:286` constructs the driver without a `maxRotatePx` option, so the constructor default at `tools/flythrough/driver.ts:304` applies.
- `docs/learning/gate-proofs.md:903`: the recorded `frames.ts` hash `2C07A565DC45…` is the CRLF (checked-out) form of the `934a363` blob — the LF blob hashes `5ADC1EE16291…`, and the branch's own last commit `54a9422` then rewrote the file (LF blob `3471F06AA7F8…` at the landing). The `structure.ts` hash `7EB649E8D146…` does match its LF blob. So the two hashes were taken from different byte forms and the `frames.ts` one predates the landing's last commit; "before and after all seven mutations of this landing" is true of the branch-minus-one-commit bytes. Harmless, but not re-checkable as written.

The two mutation messages recorded in that paragraph reproduce exactly against mutated scratch copies; see the verification list below.

## What I verified holds

**The red control still requires every travel pair to be still, held frames included, and returns before the exemption.** `tools/flythrough/frames.ts:128-143`: `still` is computed over every non-null travel with no held filter, the comparison is `still.length !== travel.length`, and `return failures` at `:142` precedes the exemption at `:148`. Pinned by `test/flythrough-frames.test.ts:154-175` (held frames marked, one held frame given 3 m of travel → "1 of 5 frame pairs still moved the camera"). Reproduced the mutation that exempts held frames inside the red branch (`still`/`travel` filtered by `cameraHeld !== true` before the comparison, `scratch/frames.mutC.ts`): exit 1, that case red with `expected '' to match /1 of 5 frame pairs still moved the camera/` — a held frame moved 3 m under zero-delta input and the control passed silently, exactly the recorded red.

**The null-travel rule excludes only pair-less leg-first frames.** `tools/flythrough/frames.ts:128` filters `cameraTravelM !== null`; the only writer is `tools/flythrough/flythrough.spec.ts:396-403`, which writes null exactly when `previous === null`, and `previous` is reset per leg at `tools/flythrough/flythrough.spec.ts:355`. The recorded run has 4 nulls over 46 frames, one per leg. `test/flythrough-frames.test.ts:98-105` pins both directions: a 0.4 mm pair reports "1 of 5 frame pairs" and moving a second frame to null makes it "1 of 4 frame pairs" — a filter that counted nulls as zeros would report 2 pairs and fail.

**A dead hold fails by name.** `tools/flythrough/frames.ts:165-195` checks the held frame against its predecessor in the same leg on three signals — identical digest, `frameCountAfter` not advanced, `ticksBefore` not advanced — and names the file and reason. Reproduced mutation A exactly: `if (frame.sha256 === previous.sha256)` → `if (false)` in a scratch copy (`scratch/frames.mutA.ts`), `npx vitest run` exit 1, the named case red with `expected '5 distinct digests across 6 frames (8…' to match /1 of 2 held frame pairs show a scene …/` — the aggregate digest check fires instead and never names the frame, which is the point of the rule. Mutation B (`stillDriven = still`, the pre-fix behaviour) also reproduced exactly: `AssertionError: expected [ Array(1) ] to deeply equal []`. The real run's six held frames are alive (distinct digests, counters advancing), so the unmutated rule passes the lane's own hold.

**The structure rule change works as adjudicated, at the brightness the lane produces.** The dark textured fixture (`test/flythrough-frames.test.ts:221`) scores 1, the uniform sky 0, both through the shipping function; removing the relative leg makes the case red with the recorded `expected +0 to be 1`.

**The driver refactor is behaviour-preserving.** `tools/flythrough/driver.ts:724-728` passes `{ maxStepRad, canvasHeightPx: this.box.height, maxRotatePx: this.maxRotatePx }` into `rotateStepRadians` (`:989-999`), whose body is the pre-fix inline code moved verbatim: `askedRad = clamp(delta, ±maxStepRad)`, then `pixelsX = clamp(-askedRad / ((2 * Math.PI) / canvasHeightPx), ±maxRotatePx)` — the same expression as the old `-stepped / this.radiansPerPixelY` with `radiansPerPixelY = (2 * Math.PI) / this.box.height` (`:379-381`). The half-pixel idle rule (`Math.abs(pixelsX) < 0.5 → idle`) and the sign trip-wire (now `Math.sign(step.askedRad)`, same value as the old `stepped`) are unchanged. `deliveredRad` is new and is read only by the tests; `shortestAngle` gained `export` and no body change. `git diff` of `turnTo` before/after shows no other edit.

**The swing arithmetic is right, by arithmetic and by run.** Flown through the shipping functions at `CAPTURE_VIEWPORT.height` 720 and a 40 px cap (0.3490658503988659 rad): the approach asks 0.2400 rad = **27.50 px** a step over six steps and ends on `CROWD_AZIMUTH` 2.225305360686166 with error **0** — inside the cap with room. `test/flythrough-plan.test.ts:77-84` asserts only the end, and the recorded mutation (restoring `+ 2 * Math.PI`) reproduces the recorded message verbatim: `expected 0.9381162336791848 to be less than 0.05`. Nothing else depended on the old sweep: the swing is confined to approach indices 6-11; the crowd and ascent legs target `CROWD_AZIMUTH`/`OPENING_AZIMUTH` absolutely; and the direction reversal that used to flip the driver's sign trip-wire twice is gone.

End-to-end: the run recorded at `artifacts/flythrough2/manifest.json` (2026-09-17T17:06:47.805Z, `cameraHeld` present, leg-first travel null, 46 frames) is post-merge code. Feeding its records and its own legs/floors into the shipping `judgeSequence` returns **0 failures**. Its `crowd-000` was captured at azimuth **2.2250** against `CROWD_AZIMUTH` 2.2253 with **3.640 m** of clearance, and the run's minimum clearance is 2.685 m (`approach-009`) — the −0.58 m the clearance adjudication recorded is gone.

**The tests drive production code, not copies.** `test/flythrough-frames.test.ts:22-23` imports `judgeSequence` and `structuredFraction`; `test/flythrough-plan.test.ts:29-31` imports `rotateStepRadians`, `shortestAngle`, `LEGS` and `CAPTURE_VIEWPORT`. `flyBearing` (`test/flythrough-plan.test.ts:59-72`) does model the driver's step loop rather than call `turnTo`, but it uses the driver's own two functions for every delivered radian, and the case's header states that bound. No case is self-satisfying in the sense of an assertion that cannot fail: each of the 15 judge cases injects a defect and matches a message, and five of the mutations recorded in `docs/learning/gate-proofs.md` were reproduced red here (the held-digest rule, the hold exemption, the relative-leg removal, the red-control hold exemption and the long-way swing; see the verification paragraphs above). The remaining unpinned clause is the `mean > 2` guard (finding 1).

## Closing statement

Revision reviewed: `39ca4595f0ea843b5598036ddbdcbc0655f35dd5` (main advanced to `144766b` mid-review; no code difference — `git diff --stat 39ca459 144766b -- tools/ test/ src/ package.json` is empty). Working tree clean.

Commands run: `git rev-parse`, `git log`, `git reflog`, `git status`, `git worktree list`, `git show --stat`/`git show`/`git diff` over `f06aaf8^`, `f06aaf8`, `934a363`, `54a9422`, `39ca459^`, `39ca459`, `67aa9c9`, `66a0bfb`, `c9c1740`, `144766b`; `git cat-file blob` + SHA-256 over the recorded revision blobs; `npx vitest run test/flythrough-frames.test.ts test/flythrough-plan.test.ts` (16 passed); `npx vitest run --config artifacts/review-flythrough-fixes/scratch/vitest.scratch.config.ts` over eight scratch probe/mutation files (results quoted above); Node one-liners over `artifacts/flythrough2/manifest.json` and the PNG bytes. Scratch copies and mutations live only under the ignored `artifacts/review-flythrough-fixes/scratch/`; no tracked file was created or modified (`git status --porcelain` empty).

What I could not verify, and therefore do not claim:

- **The gates.** I did not run `npm run build`, `npm run typecheck`, `npm test` (full), `npm run audit` or `npm run visual` — the task excluded heavy gates. The recorded gate results are the author's; I verified only the two flythrough unit files and the arithmetic.
- **The browser lane.** No run of `npm run visual:flythrough`. The plan test's own bound applies: the plan's swings are inside the cap the driver's arithmetic delivers, and only a lane run can show the browser dispatched the drag. The post-merge run I lean on is evidence at second hand — its manifest and PNGs are on disk and internally consistent (digest matches bytes), but I did not watch it happen and `certifiable: false` in that manifest means it is an iteration run, not a verdict set.
- **The pixels.** I did not open any frame as an image, so I cannot say any frame looks right, nor that the 2026-09-17T17:06 run's `crowd-000` shows the crowd rather than a facade.
- **The deleted evidence.** `artifacts/flythrough-fix/scratch-calibration.txt`, `artifacts/flythrough-swing/wt/.../verify-swing.ts` and the two worktrees are gone, so the 15.3% calibration, the swing arithmetic copy and the run-1 bytes the adjudication measured cannot be re-derived. The 15.3% figure is the one number in this review I could not reproduce (finding 5); the direction and the conclusion survive.
- **Run 1 and run 2 themselves.** Their frames were overwritten by the later run at the same paths; only their scratch reports, traces and `captures.json` remain.

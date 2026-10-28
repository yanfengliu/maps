# Review 1: implementation

Focused re-review of the repairs made for [round 0](0_implementation.md).

## Target

Repository `maps`, branch `codex/medieval-city-20261027`, the uncommitted working tree after all fifteen round-0 findings had been repaired and the orchestrator had re-run the full thirteen-step acceptance pipeline.

Inputs unchanged from round 0 and pinned there by digest: `inventory.json` `62182962...`, `city_layout.json` `29d8a668...`. Evidence re-read after regeneration: `probe/city/probe.json`, `probe/smoke/probe.json`, `probe/city/run_probe.json`, `level/level_verify.json`, `build/build_native.json`, `integration-final.log`.

As in round 0, the reviewed source state was never committed and its line citations will not resolve in the committed tree.

## Reviewers and coverage

The same independent reviewer as round 0, resumed with its own findings in context. Continuity was chosen over a fresh reviewer because the question was narrow — whether each repair fixes what that reviewer found — and a fresh reader would have had to rediscover fifteen findings to answer it. The cost is that this round is not independent of round 0's framing, so it is weaker evidence than round 0 for anything round 0 missed entirely.

Read-only. No Unreal and no Blender, because the orchestrator was running the acceptance pipeline on the same machine. Two questions were put to it directly: whether the settled-sample camera fix is sound or hides a timing dependency, and whether the detach to the engine map is safe and anything else depends on the loaded map.

## Reports

### Independent reviewer

Fourteen of fifteen findings genuinely repaired, several more thoroughly than asked. Two repairs introduced new problems, one inside the F2 repair itself. Three untidy items were left open although the round-0 record said they were cleared, and that record's disposition table understated the work on F8 and F13.

**On the settled-sample camera fix: sound, but not for the reason the code gives.** In both evidence files the rendered view location and the active camera component location are identical to all sixteen digits, and every step's end-of-step distance is exactly `0` — including steps closing at 300 and 600 cm/s. That is not convergence. `GetCameraLocation()` returns the cached POV that `CalcCamera` filled by reading the active camera component, so in the healthy case the two quantities are one value copied and the comparison is exact. The code comment describes a lag that does not exist. The real reason the opening sample must be excluded is that the step opens in the same tick as the teleport, after the camera manager has already run, so it reads the pre-teleport POV — a stale read, not a lag. Excluding it is correct; the comment and the justification for the 5 cm tolerance are wrong, and the tolerance is unused slack rather than a tuned threshold. The check does discriminate the defect it names: with the camera activation deleted, `CalcCamera` keeps the third-person camera while the accessor follows the flag to the first-person one, a spring arm apart.

**N1, material — the new camera check cannot tell "passed" from "never ran".** The worst-case fields initialise to zero and an empty string and are updated only on a strict greater-than. Every genuine sample is exactly zero, so the comparison never fires and the step name is never recorded. Both evidence files show `worst_view_to_active_camera_cm: 0` with an empty step, which is byte-for-byte what a run that never sampled would write. Moving the close call, or having the character lookup fail, leaves the report reading as a clean pass; the harness default catches a missing key but not a present zero. This is the same defect class as round 0's F4, reintroduced inside the repair for F2.

**N2, low-medium — the separation check's red is incidental.** Under the defect both samples come from the same camera at positions a few centimetres apart, so the red comes from character travel between samples rather than from camera geometry. A slower toggle or more residual velocity would pass. The structurally sound half of the pair is the view-to-camera check, which is the half carrying N1.

**N3, material — the new startup error message gives a build sequence that does not work.** It names four commands and omits `prepare_project.py`, so following it makes the level build fail on missing meshes. That message exists for exactly one purpose, telling someone on a clean checkout how to build the missing level, and it is the one thing it gets wrong. Separately, a successful first-time import run now logs at `Error` verbosity.

**On the detach to the engine map: safe, necessary, correctly guarded, and no sixth dependency.** Every save in the import step is an asset save on generated packages; there is no actor spawn, no actor destroy, no level save. The detach only acts when the open world is the town, re-reads the world afterwards, records the before and after, and raises if the town is still open. The no-op branch is right for a clean checkout. Two residuals, neither a finding: an unattended load discards unsaved changes silently, which costs nothing because this step makes none; and the step deliberately opens the same engine map that was polluted earlier, protected now only by the fact that the script spawns nothing, with no guard inside the file to stop a future edit from spawning there. A scratch world under `/Game/` would keep the whole operation inside the project. Of the five entry points, only the import step depended on the startup map.

**Repairs confirmed with evidence:** F3 compares the counts in both steps and names the Nanite state; F5 fails on undeclared actors of any class and raises if anything survives clearing, with the empty allowlist documented as measured; F6 is genuinely discriminating, because the along-axis figure is a signed dot product, so a left-right swap fails — handedness verified independently, and lateral error is about 1e-5 cm on all four keys in both modes; F7 rejects the push figure unless the approach covered its floor; F9 is the best of the repairs, self-testing each pattern against verbatim engine lines and dropping the unproven negative in favour of five required positives; F10 pins every threshold; F11 goes further than asked and now also catches a file that lies about its own metadata; F12 names the command and limit on expiry; F13 is a real run with an honest bound and a clean skip in smoke mode; F14 traces the Pawn profile for the player start and names each channel; F15 has all thirteen steps at exit 0 including the tests.

**F4 carries a caveat:** the code repair is real, and the part doing the work is the source-mtime staleness rejection that was not asked for. But the `--rebuild` record cited as evidence is not on disk — every ordinary run writes the same filename and later pipeline runs overwrote it, so the file now records a no-op. The gate is honest about the no-op, which was the substance of the finding, but the evidence for the criterion that both targets compile no longer exists.

**F8 is repaired rather than merely recorded**, though it is the thinnest repair: a constant and its stated reason, with the current layout still slack against the new bound.

**Three untidy items were not cleared:** the player-start guard that works by accident and leaves no note when it skips; the settle comment claiming its samples skip the walking envelope when the sampling flag is still set through settle; and the whole-PNG copy made to narrow a type.

**Corrections to the round-0 record**, all in its disposition table: F8 and F13 were recorded as not repaired when both were repaired; the untidy row overclaimed that all ten items were cleared; the verification section was still pending; and the target pinned no digest, so the review could not be re-grounded.

**One thing the repairs did not touch:** the plan's criterion 5 still named the probe without `--mode city`, which defaults to the bare test floor — the same mistake the README had been corrected for, left in the document that grades the work.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| N1 | Camera view check cannot distinguish a clean pass from a run that never sampled | Accepted. Material, and the same defect class as F4 inside F4's sibling repair | Dispatched: count samples and require a non-zero count, or record the step unconditionally on the first sample |
| N3 | Startup error message omits `prepare_project.py`, so its build sequence fails | Accepted. Material: it is the one message a clean-checkout reader depends on | Dispatched: correct the sequence and reconsider the `Error` verbosity |
| N2 | Camera separation's red comes from character travel, not camera geometry | Accepted, not repaired. Once N1 is closed the view-to-camera check discriminates structurally and covers this; making separation structural too is a refinement this proof of concept does not need | Recorded here as a known soft edge |
| — | `--rebuild` evidence overwritten by ordinary runs | Accepted. Criterion 3's evidence must exist on disk | Dispatched: distinct filename for rebuild records, then one rebuild for the record |
| — | Camera comment describes a lag that does not exist; 5 cm tolerance justified by it | Accepted. The code is right and the explanation is wrong, which is how the next reader gets it wrong | Dispatched: fix the comment, state the tolerance is unused slack |
| — | Three untidy items left open | Accepted | Dispatched with the above |
| — | Round-0 record misstated F8 and F13, overclaimed the untidy cleanup, pinned no digest | Accepted. The record must be accurate about its own dispositions | Corrected in [0_implementation.md](0_implementation.md); inputs now pinned and the unrecoverable source state stated plainly |
| — | Plan criterion 5 named the probe without `--mode city` | Accepted | Corrected in [plan.md](../plan.md), which now also names the sprint, direction, gate and view checks the criterion actually covers |
| — | Import step opens the engine map it once polluted, guarded only by spawning nothing | Accepted, not repaired. The reviewer verified the step spawns nothing and saves no level; a scratch world under `/Game/` would be better hardening but changes a working path late | Recorded here as a known residual |

## Verification

N1, N3, the rebuild record, the wrong comment and the three untidy items were all repaired.

N1 was observed red in the exact scenario the reviewer described: the view comparison was disabled at the close call, rebuilt, and the run failed with "The rendered view was never compared against the active camera component, so the camera check did not run at all." Restored, a passing run now records 20 samples in smoke and 26 in city with the step named, three fields that differ from the zero-sample output where before two were byte-identical.

N3's message now names all five README commands in order and logs at `Warning`, since a clean checkout legitimately has no level when the module loads.

The rebuild record is now written to its own filename: Editor 10 compiled and 2 linked, Game 9 compiled and 1 linked, `no_op: false`, which the orchestrator confirmed on disk rather than from the report.

The orchestrator then ran the thirteen-step acceptance script on the integrated revision: 13 of 13 green, probe passed with no failures, and the final captures inspected at native resolution bound to their digests.

A third round covering only these last repairs is recorded in [2_implementation.md](2_implementation.md).

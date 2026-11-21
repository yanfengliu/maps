# Implementation review 41

## Target

fca35ff158a6d6a9b06217387a2d0158cfe4d8c5. Focused recheck of the depth-range finding R39-1.

## Reviewers and coverage

Independent Codex gpt-6-astra, xhigh. Read-only inspection of the exact fragment, test code and real graphics logs. The secondary CLI reviewer had exhausted its weekly quota.

## Reports

**Approve exact `fca35ff158a6d6a9b06217387a2d0158cfe4d8c5` for R39-1.** No actionable finding within the requested scope.

- **Algebra:** With midpoint `m=(near+far)/2` and half-range `h=(far-near)/2`, the new expression simplifies to `m+h*(Z+ΔZ)/(W+ΔW)`, the correct framebuffer depth. It avoids division by the depth-range width, including when that width is zero.
- **Same surface, different proxies:** The test independently projects the measured foliage hit `hitY=-0.14116454124450684`, then exercises proxies at `−0.8` and `+0.8`. Both correctly bracket that surface with occluders at depth offsets `±0.00035`.
- **Actual compressed-range evidence:** The [red run](/private/tmp/maps-conifers-20261121/artifacts/conifers/depth-red/probe.log) incorrectly hides foliage behind the farther occluder at `[0,0.97821044921875]`. The [green run](/private/tmp/maps-conifers-20261121/artifacts/conifers/depth-green/probe.log) passes all 12 cases across that range, `[0,1]`, and `[0.1,0.8]`. The retained probes differ only in the production fragment; their test matches `fca35ff`, and the logged green shader matches its fixed fragment.

Read-only source and saved-evidence recheck; no browser, network, edits, or broader release assessment.

## Findings and disposition

R39-1 closed. The regression uses the actual depth-writing shader and foreground/background occluders across the tested framebuffers.

## Verification

The red control reproduced an incorrectly hidden bough. All twelve production-shader occluder combinations passed after the fix. Native close and overhead grove views were inspected and the root repeated the full release gates with 331 passing tests.

## Round outcome

Accepted for R39-1.

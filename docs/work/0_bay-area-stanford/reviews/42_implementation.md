# Implementation review 42

## Target

1e44a5cc0d8b0f0ab5267a6a0ea4bd41683470d4. Final recheck of R38-2 for overlaps between visible upper hospital levels and neighboring buildings.

## Reviewers and coverage

Independent Codex gpt-6-astra, xhigh, read-only exact checkout. The secondary CLI reviewer had exhausted its weekly quota.

## Reports

**Approve R38-2 at `1e44a5cc0d8b0f0ab5267a6a0ea4bd41683470d4`.** No material finding within this focused recheck.

- **18 focused tests passed** using pinned Node 24.12.0 and supplied dependencies.
- **24 supplemental checks passed:** foreground/background overlaps with neighboring fine geometry absent, native walls/caps, reversed candidate order, elevated terrain, and unavailable-detail/interior fallback.
- Saved [Chrome overlap evidence](/Users/yanfengliu/Documents/local/github/maps/artifacts/campus-20261121/hospital/overlap-native.log) confirms correct selection at **(804,410), (906,360), (968,395)**, nine retained positive clicks, 32 corrected false selections, and seven post-recovery checks.
- [Foreground evidence](/Users/yanfengliu/Documents/local/github/maps/artifacts/campus-20261121/hospital/overlap-nearer.log) preserves nearer-building selection across 12 clicks. Five saved screenshots inspected.

The correction compares rendered surface depths instead of relying on native proxy order. No edits, external calls, browser launch, or whole-repository audit performed.

## Findings and disposition

R38-2 closed. Both relative depth orders, reduced native geometry and the absence of detailed geometry are covered.

## Verification

The integrated target passed all 332 Node 24 tests, type checking, the Pages-base build and the dependency audit. The root repeated the three overlap controls, nine positive selections, 63 outside-edge checks and seven recovery controls through the real map. Paired browser evidence also records twelve screen pixels where the former build selected a rear building and the corrected build selected the visible hospital. The final roof atlas has 648 unique panels, 15 validated image hashes and the integrated model digest. The exterior has 189,652 triangles and 25,034,064 packed bytes in two draws.

## Round outcome

Accepted. Open visual limitations and the physical-device check remain in the plan.

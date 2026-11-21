# Implementation review 40

## Target

41799e5, the first integrated hospital selection correction. Verify positive and negative selection after terrain registration and preserve foreground occlusion.

## Reviewers and coverage

Independent Codex gpt-6-astra, xhigh, read-only exact checkout. Claude lacked weekly quota.

## Reports

**Request changes at `41799e5`: one P2 remains in R38-2.**

[Selection priority](/private/tmp/maps-review40-20261121/src/hospital-picking.ts:58) compares native proxy order without incorporating the precise hospital hit’s depth. A building behind a visible upper tier can therefore win. Using current geometry and MapLibre’s intersection functions at pitch 58°, bearing 62°, with a shared flat terrain datum, Packard Main’s visible roof hits depth **0.994169**, ahead of Beckman’s **0.994393**, yet selection returns Beckman. This is a projection reproduction, not a browser observation. Truly foreground native buildings correctly retain priority. Add coverage for both depth orders.

Checked:

- **52 focused tests passed** on Node 24.12; 19 additional depth, clipping and terrain checks passed.
- Supplied screenshots and paired logs: **32 false selections corrected**, nine positive clicks retained, and seven 300 Pasteur checks passed after recovery.
- **R38-1 passes:** all 14 added flat shells, all five explicit courtyard assertions, and 136 selectable parts.
- **R38-3 geometry passes:** all 648 saved atlas panels match current emitted surfaces; inspected all three integrated images and verified 15 imagery hashes. Manifest `modelDigest` remains stale, although geometry matches.

No edits, network access or browser launches. Full build and audit were not rerun.

## Findings and disposition

R38-1 is closed. R38-2 remains open for a real overlap at the upper floors. The native candidate depth and the visible hospital depth must be compared. R38-3 passed the mesh comparison. The root regenerated the manifest for 41799e5 and repeated it for the later shader changes.

## Verification

All 331 integrated tests, the Pages-base build, type checking and dependency audit passed at 41799e5. Independent projected overlap results are preserved above. The coordinator also repeated 63 outside-edge clicks, nine positive clicks and seven recovery checks on the integrated map.

## Round outcome

Changes requested for R38-2. The remaining case involves a background building whose native proxy sorts ahead of a visible hospital tier.

# Implementation review 36

## Target

ca3c567. Cantor public gallery floors, address-specific hospital maps and Green Library East Wing. The second round covers the corrected gallery names and public links.

## Reviewers and coverage

Independent Codex gpt-6-astra at xhigh in a read-only checkout. The second CLI reviewer had exhausted its weekly quota. Primary visual captures and the official museum plan were available.

## Reports

Request changes for **ca3c567**: one confirmed P2 finding. No P0/P1 issue found.

1. **P2 — Correct Cantor’s room-name mapping.** [cantor-gallery-plan.ts:39](/private/tmp/maps-review36-20261121/src/cantor-gallery-plan.ts:39) labels room 206 “European Art · Rebele Gallery.” The [saved official plan](/Users/yanfengliu/Documents/local/github/maps/artifacts/20261121/interiors/cantor-plan.png) places the Patricia S. Rebele Gallery at **207** and Rowland K. Rebele Gallery at **212**; 206 is “Ancient, Medieval & Early Modern European Art.” The wrong association is visible in the phone capture. Correct these labels and add source-based number/name assertions; the current tests check room numbers and selected outlines but miss this error.

An **unverified link risk** also needs resolution: the Packard URL in [visitor-maps.ts:8](/private/tmp/maps-review36-20261121/src/visitor-maps.ts:8) omits `/patient-families/`, which appears in the previously documented official URL in [design.md:349](/private/tmp/maps-review36-20261121/docs/work/0_bay-area-stanford/design.md:349). The tests only check filename suffixes. Confirm and retain the exact sourced destination. I did not test either URL over the network, so this is not a confirmed broken link.

My independent checks:

- **101 focused tests passed on Node 24.12.0**, covering roof geometry, source preservation, selection, keyboard input, church modes, terrain recovery and GPU limits.
- Baseline comparison confirmed every generated roof/facade vertex **outside Green East is byte-identical** to `4945d55`. Building/object terrain anchors also match. The complete scene remains within budget at **189,891 triangles**.
- Inspected eight supplied control captures, the Cantor plan, Green exterior photograph, aerial, registration overlay and survey page. Green’s stepped fields and facade bands are supported within the disclosed estimates. Cantor remains appropriately plan-relative; no geographic registration is established.
- The named native dialog, pressed floor buttons, labeled select and keyboard-pan exclusion appear sound. Desktop/phone captures are legible; screen-reader behavior and actual-device operation were not independently exercised.

The retained component build/test logs are documented evidence, not my execution of the integrated release gates. I did not rerun installation, build, audit or live browser controls. No files were edited and no network operations were performed.

## Findings and disposition

R36-1 accepted. The gallery label and the two named archive rooms were corrected in 434eea1. The Packard visitor link returned HTTP 200 and a valid PDF.

## Verification

On Node 24.12.0 the integrated release passed types, all 316 tests, the Pages-base build and dependency audit. The reviewer identifies its own tests and evidence above.

## Round outcome

R36-1 accepted. The gallery label and the two named archive rooms were corrected in 434eea1. The Packard visitor link returned HTTP 200 and a valid PDF.

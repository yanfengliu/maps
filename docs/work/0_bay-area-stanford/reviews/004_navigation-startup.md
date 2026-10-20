# Review 004: integration

## Target

Reviewed on 2026-10-20: the frozen navigation and bounded startup changes against base `dd600618624a03acae01defa03351790eeb74b46`, in `C:/Users/38909/.codex/worktrees/navigation-review/maps`. The integration owner copied the candidate from the primary checkout. I independently matched all five file hashes in both locations. This review applies to those exact bytes; the owner must bind them to the recoverable integration commit before removing the snapshot worktree or retained patch.

| File | SHA-256 |
| --- | --- |
| `src/main.ts` | `029bf513c0dd9797b2af4770234b11dead32e461a8d7d288cd3f74f1c717fb38` |
| `src/mouse-tilt.ts` | `a4bd70038003bbb1827bafbbb04885f81c7eba3356078369ec303461eba6207d` |
| `src/building-details.ts` | `68dd6034cb1edc44696a03d8a3d2775e285924dfdd8f9d835e427177182781bf` |
| `test/building-details.test.mjs` | `19b9e44cd708d72fd1a2cf5b78a7ff059e9d0e34dbff02f1239a229ca4925776` |
| `README.md` | `785d3765ac4add221b10a533f05758972975bc740fcff7b065f2a8d29f5054d2` |

I also inspected the draft navigation/startup record and the embedded-browser defect entry. Their current limits accurately distinguish unnecessary regional shader work from the unproven cause of the host hang. Administrative completion updates remain the integration owner's responsibility.

## Reviewers and coverage

Independent Codex reviewer: `navigation_review`. I read the repository instructions, local rules, lessons, canonical review runbook, full changed source, surrounding application lifecycle, pinned MapLibre input implementation, regression tests, recorded browser scripts and results, and native screenshots. I made no source edits, ran no package gates, launched no browser/server, and accessed no built-in-browser tab, private browser session or shared application. This authored report is the only reviewer write.

## Reports

### Independent Codex source and evidence review

No material finding. The candidate implements the requested controls without an unnecessary dependency or replacement of MapLibre's native handlers.

WASD handling is attached to the map canvas in [src/main.ts:380](C:/Users/38909/Documents/github/maps/src/main.ts:380), excludes Alt/Ctrl/Meta chords, accepts shifted letters and stops propagation only for recognized pan inputs. Search has its own key handler outside the canvas at [src/main.ts:197](C:/Users/38909/Documents/github/maps/src/main.ts:197), an inspected citation outside this diff. The public linear drag option and `rotateSpeed: 0.25` at line 371 match the pinned MapLibre implementation's degrees-per-horizontal-pixel calculation; the vertical right-drag pitch sign also matches that implementation. Native touch configuration and keyboard handling remain enabled.

Middle tilt in [src/mouse-tilt.ts:13](C:/Users/38909/Documents/github/maps/src/mouse-tilt.ts:13) accepts the middle button, stops any previous camera animation, captures the pointer and focuses the canvas. Movement checks the captured pointer and held-button mask, clamps against the map's actual pitch limits, and changes only pitch. Pointer release/cancellation, lost capture and window blur clear the gesture. The disposer releases capture and removes every listener; [src/main.ts:473](C:/Users/38909/Documents/github/maps/src/main.ts:473) invokes it before removing the map.

The shader guard in [src/building-details.ts:192](C:/Users/38909/Documents/github/maps/src/building-details.ts:192) prevents initial architectural shader allocation below zoom 12. Calling it from render allows approach to start compilation even after regional attachment. Geometry remains gated at zoom 14. Existing asynchronous completion and cleanup remain intact: [src/building-details.ts:164](C:/Users/38909/Documents/github/maps/src/building-details.ts:164) cancels pending idle/timer work and releases GPU allocations; lines 177-190 poll parallel completion before querying link status. These are inspected lifecycle paths outside the changed hunks. The existing custom-layer reattachment at [src/main.ts:292](C:/Users/38909/Documents/github/maps/src/main.ts:292) remains independent of whether the Stanford source already exists, and Retry rebuilds the style at line 339.

The new tests assert zero regional GPU allocations/extension queries, initialization at zoom 12, intact lazy geometry, context restoration at regional and approach zooms, and resource release. The recorded negative control fails the old renderer at zoom 9 with `architectural GPU allocation at regional zoom 9`; the candidate passes. This proves the bounded regression and does not prove that shader compilation caused the embedded-browser hang.

## Findings and disposition

No material code or evidence finding requires a repair. GO applies to the controls and the bounded regional GPU-work deferral. Embedded-browser root cause and recovery remain unverified and are excluded from this approval.

## Verification

I inspected `artifacts/navigation-controls/verification/controls-second-report.json` and its script. All 21 recorded assertions pass: canvas focus, four WASD directions, uppercase input, Ctrl+D isolation, search typing isolation, native arrow/left-drag/wheel controls, Stanford flight/detail readiness, right-drag rate, middle-drag direction and pitch bounds, release outside the canvas, native keyboard pitch, and Alt+arrow rotation. A subsequent optional capture sequence timed out waiting for the Explore Stanford locator; that run must not be described as wholly successful. `focused-report.json` then passes the real overview-to-Stanford-to-Main-Quad sequence. These initial controls results used the unchanged navigation bytes before shader deferral was integrated.

I read the final integrated `integrated-flow.js` and `integrated-report.json`. The script drives actual controls and reads the frozen observer; its only graphics intervention uses the test-owned canvas to exercise context loss/restoration. All seven integrated assertions pass: initial overview has no shader/geometry work, approach reaches 100,514 triangles and two draws, middle drag adds 5 degrees without bearing/center drift, overview resets successfully, campus reentry/Main Quad retain full detail, actual context loss/restoration recovers full detail, and page/map errors remain empty.

The final first Stanford flight records 400 moving render events and 399 intervals over 2,384.8 ms at 1920 x 1080, DPR 1, verified NVIDIA RTX 4090 through ANGLE/D3D11. The p95 interval is 7.3 ms, maximum 22 ms, with two intervals over 16.7 ms and none over 33.4 ms. This supports the intended frame budget on this sampled machine. It measures MapLibre render-event cadence, not physical display FPS, a statistically established speedup, all GPUs or embedded-browser responsiveness.

I inspected the overview, Stanford and Main Quad screenshots at native resolution. The regional framing, visible controls, sandstone/terracotta campus and open courtyards show no material regression. I independently hashed the integrated captures; they match the already inspected images byte-for-byte, including the restored-context capture matching Main Quad.

| Integrated capture under `artifacts/navigation-controls/verification/output/playwright/` | SHA-256 |
| --- | --- |
| `integrated-overview.png` | `1010c73498ce84747a7c600319e33971b53bad2417bbf6a4b59156439dfd4c6b` |
| `integrated-stanford.png` | `7dc28d584de590b8002d2b667daea7c3bae69f3c7b987e3d14acd88d77931981` |
| `integrated-main-quad.png` and `integrated-restored.png` | `fa8efc264497b38d49f2726eecfcd327caa7b19e8d06e4967cb41a6306a6f75c` |

`git diff --check` passes on the reviewed source snapshot. The integration owner reports final typecheck, all 25 tests, audit with zero vulnerabilities and production build passing. The initial build encountered sandbox parent-directory access failure; its normal-access retry passed with the existing large-chunk warning. I inspected the regression tests and browser evidence, but did not independently rerun those package gates.

The scoped host metadata records two `IAB browser page unresponsive` events. The host's crash wording is also used for unresponsiveness; no process-gone diagnostic matched the inspected log scope. The draft defect record correctly leaves the underlying hang cause and actual built-in-browser recovery unproven. No browser workaround was attempted. Physical mobile/Safari behavior, low-end GPU performance, and real browser performance without the parallel shader extension were not tested in this round. Blur/cancellation cleanup is inspected in source; the real mouse evidence specifically exercises release outside the canvas.

No reviewer-owned processes require cleanup. The inspected integrated cleanup artifact has an empty final list. An earlier cleanup recorded GPU PID 508 immediately after requesting its termination; the integration owner subsequently confirmed that PID and task-owned browser/server descendants absent. The user-requested primary localhost server is intentionally retained by the integration owner. The final identity-aware census records no remaining owned processes and removal of the test profiles; it correctly preserves a recycled PID now belonging to an unrelated application. Commit/merge/push and managed-worktree cleanup remain owner actions rather than completed reviewer actions. The owner reports automatic approval review rejected the earlier documentation push of `dd60061`; user approval remains pending, and this review claims no remote CI result.

## Round outcome

GO for the exact reviewed navigation and startup-deferral bytes, with no material findings. The change is ready for the integration owner's final commit and acceptance checks. This report does not certify an embedded-browser crash fix or a completed merge/push.

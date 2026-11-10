# Implementation review 35

## Target

Physical stop signs from dde6b4d7ef6224220daeffa126df9bf77aa9251c. Initial exact revision 6a1fce229009e0caad6f4aa547c4866e95bb12df; corrections at 80fa985b2c95c71b0941c60b0dcbfa7dca100357 and f71a57b50c3f93d83299f28fca70a40fb79c5884. Scope is physical stop objects, source interpretation, terrain placement, loading/recovery and preserved campus/church context. Signal models and broader realism remain outside acceptance.

## Reviewers and coverage

Independent physical_stop_review35 (gpt-6-astra, xhigh) inspected code and all eleven original-resolution initial native captures, then five compass-correction captures and two source-failure/retry captures. Outside-diff inspection includes building-details.ts:537-545 response/cache guards, building-details.ts:381 packed resource limit and terrain-grounding.ts:146-150 bounds rejection. The reviewer launched no browser and changed no files. Root ran the full gates and owned headless native-control probes; the reviewer ran focused tests and an independent actual-owner delayed-style reproduction.

## Reports

The reviewer accepts the physical front/back/post appearance and source-identity preservation within the stated estimated-placement limits. Its two actionable findings are recorded below. No photographic survey of every individual pole or complete campus realism acceptance is claimed.

## Findings and disposition

R35-1 [P2]: numeric direction tags were treated as travel instead of sign-face bearings, and a lexicographically selected crossing road supplied the wrong width at one Arguello junction. Accepted and corrected: numeric faces oppose travel, aligned incoming retained segments choose the road, and one-way direction is respected. Both real source nodes and their different road widths are regression fixtures. Final front/back and random-angle native captures pass; reviewer confirms this finding closed at 80fa985.

Root failure injection: shared controls HTTP 503 left roads failed after detail-only Retry recovery. Both error callbacks now use shared recovery. Native before/after evidence changes from restored:false to restored:true with all 296 signs and both owners ready.

R35-2 [P2]: the initial shared recovery could fetch cached road input before MapLibre parsed the replacement style, persisting a Style is not done loading error. Reviewer reproduced this using the actual road owner and pinned data; MapLibre style.ts:485-489 defers parsing to a frame. Explicit style-readiness invalidation now precedes retry and style replacement. A regression exercises both failed downloads and healthy cached payload, forbids early source mutation, preserves healthy data without refetch and requires recovery at style.load. Reviewer confirmed the race closed at f71a57b and found a stale error notification from preparation. Final 01f7792 suppresses re-emitting that dismissed failure; the owner callback regression and native Retry now also require an empty error list and hidden alert.

## Verification

All 312 tests, types, Pages-base build, zero-vulnerability audit and work-document checks pass. Native controls cover four initial stop locations, fixed front/back/oblique, phone, graphics restoration, church context/return, WASD, both compass signs and a randomly selected 284-degree bearing/56-degree tilt. Shared-source 503 injection and actual Retry pass after the race correction. No app/GL errors in the normal gallery; the failure probe contains its intentional 503. Owned process inventories are empty.

All 306 source controls remain represented: 296 physical objects, 291 source-directed/five estimated facings, and ten overlapping all-way junction records attached as metadata. Pole offsets, dimensions and complete physical pole counts are not surveyed. A thin clipped plate has no extruded edge thickness. Complete campus geometry is 189,905 triangles /25,067,460 packed bytes in the existing two buffers, with unchanged limits, no new dependencies, source assets or texture downloads. Evidence is retained under artifacts/physical-stop-signs-20261109/output/.

## Round outcome

Accepted exact 01f7792765e2801f99edbb15a6f5a71b4c0907fc with no remaining actionable findings. The reviewer independently reran all twenty road-owner/startup tests, confirmed both recovery findings closed, and inspected the final recovery capture. Native retry evidence shows both owners ready, 296 signs, no errors and no visible alert. Prior geometry and visual acceptance remain valid because those paths are unchanged.

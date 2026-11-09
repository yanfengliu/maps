# Implementation review 28

## Target

Exact revision acc8c7cc516e8a194798ec657ae5f9778e43178f, including repair 4fb1eeb, against base 981bf62e83c9d2ddff5634839c124f0b914e8929. This round reviews the F46 repair and fan-palm changes after terrain milestone 7eb1d5125d794cb23bafc5bb9c9b790c42a2eef1. Review 27 retains the original milestone's broader coverage.

## Reviewers and coverage

Independent terrain_final_review (gpt-6-astra, xhigh) performed read-only source, regression-test and retained native-evidence inspection. Coverage included surrounding renderer, readiness, native-shell visibility, retry and graphics-context lifecycle code outside the changed hunks. No additional CLI lane, browser, server or GUI was launched, and no files were written. Root transcribed this authored report and converted temporary worktree links into repository-relative links.

## Reports

No new material finding identified. F46 is repaired.

The elevation loader obtains complete campus coverage independently of the camera. Coverage includes interpolation neighbours at tile seams; Terrarium decoding preserves fractional, zero and negative elevations; resampling converts north-first source tiles into the shader's south-first grid. Missing samples reject the load rather than becoming measured zero elevation. These contracts are implemented in [campus-elevation.ts](../../../../src/campus-elevation.ts#L28), including sampling at line 41, grid construction at line 59 and completeness rejection at line 133.

The loader limits coverage to 16 zoom-15 tiles, runs three requests/decodes concurrently and applies a 15-second timeout per tile. Failure cancels sibling work, waits for workers to settle and releases decoded tile references. Bitmap and canvas cleanup uses finally blocks. The completed grid occupies 1 MiB; retained decoded float tiles occupy at most 4 MiB, with additional temporary PNG/bitmap/canvas allocations during decoding. These limits do not increase the existing terrain GPU texture allocation. See [campus-elevation.ts](../../../../src/campus-elevation.ts#L79).

Grounding validates the complete grid before publication, rejects late results from cancelled requests and retains successful CPU data across layer/context recreation. Disposal aborts pending work, clears failure state and deletes GPU textures; restoration uploads the retained grid into new GPU resources. Object anchors must remain within the verified coverage. See [terrain-grounding.ts](../../../../src/terrain-grounding.ts#L130).

Readiness now requires active elevation when terrain is enabled, while geometry upload can finish independently. This keeps native fallback shells available during elevation loading. I traced the unchanged caller at [main.ts](../../../../src/main.ts#L489), layer recreation at line 351 and full-style Retry at line 417. I also checked the surrounding ground sidecar's sampler bindings and restoration at [building-details.ts](../../../../src/building-details.ts#L463); the repair preserves the earlier native terrain/shader lifecycle corrections.

The fan-palm change replaces repeated radial shelves with individually pitched fans and a raised, closed growing point. Placement, species, terrain-anchor registration, estimated height/radius envelopes and triangle allocation remain unchanged. The whole-class tests examine emitted geometry, including central ray coverage and rotational repetition, rather than merely matching implementation constants. See [quad-plantings.ts](../../../../src/quad-plantings.ts#L87) and [quad-palm-crowns.test.mjs](../../../../test/quad-palm-crowns.test.mjs#L40). Native close/opposite views show filled centers; the inspected Stanford photographs support the bounded crown-form correction. Foliage remains simplified.

## Findings and disposition

| ID | Disposition | Evidence |
| --- | --- | --- |
| F46 | Closed: camera-dependent missing anchor elevations repaired | Complete grid loading and readiness checks; fresh arrival with a withheld offscreen tile; visible pressbox roof after release and actual context restoration |
| New material findings | None | Source, surrounding lifecycle code, regression coverage and retained native evidence inspected |

## Verification

HEAD matched the requested revision and the worktree was clean before and after review. git diff --check passed.

I inspected all five supplied acceptance screenshots at native resolution and both retained palm reference photographs. The production cold-arrival record confirms one withheld offscreen tile, waitingReady=false, and successful release at zoom approximately 20.6006 and pitch 0. The pressbox roof is present both before and after graphics-context restoration. Retry also succeeds. This evidence does not rely on the zoom-21.5 view where the camera enters the tall pressbox.

I read the final gate logs: 277 tests passed, typecheck and production build succeeded, dependency audit reported zero vulnerabilities, and the work-document checker passed. The earlier failing integrated-tests.log is superseded negative evidence, not the final gate result. I did not rerun the full gates.

The additional production record reports successful church/ceiling restoration, road and DEM retries, and empty recorded application/GL error arrays. Its RTX 4090 motion sample contains 402 frames, p95 6.2 ms and maximum 9.8 ms at 1600×1100. Performance evidence remains specific to that machine.

## Round outcome

Closed with F46 repaired and no new material blocker for the reviewed changes. No complete photographic-realism acceptance is claimed. Hospital modeling, broader architectural reference gaps, current pruning and detailed botanical appearance remain open or explicitly limited. Integration and delivery remain with root.

# Review135 — independent railway endpoint criterion audit

Reviewer: fresh E1 criterion lane, assigned review configuration Astra/xhigh. Reviewed product revision: `0ec3dd03831b605235302212b7d140cb35297071`. Review date: 2026-09-27. Scope: the acceptance instrument and controls, not a new railway implementation. Source, scene data and Git were read-only; all writes are in this report directory. No sibling-lane findings were used.

**Verdict: independently justify the instrument correction, permit a bounded native experiment, and accept no endpoint appearance yet.** A zero count from the old sample-ray test is neither necessary nor sufficient for the stated requirement, “no materially exposed arbitrary interior termination in normal exterior views.” Keep both old strict-concealment failures and report them separately. The continued candidate may be selected for the finite native test below only after its actual geometry, materials and capture contract are frozen and approved by the integration owner. This is permission to gather missing evidence, not component acceptance or a recommendation over the independent geometry lane.

The exact remaining gap is the appearance of complete generated rail, bed and support terminations through real browser controls, especially from the two low witness origins, in both styles and lighting presets. No rendered candidate or native appearance evidence exists in the evidence I reviewed. The proposed matrix also needs the source-grounded exterior eligibility and full-endpoint framing checks described below before capture. Do not turn either missing check into a pass.

## R135-1 — the zero-ray predicate does not decide the visual requirement

`artifacts/rail-station-design-20260927/prototype.mjs:53` constructs ten point locations per track, using five lateral offsets and only Y20.65/Y20.98. It casts two-sided rays against retained fragments from the three selected source objects and their new cut returns, assembled at line49. A point counts as blocked when an intersection is at least 0.005 m before it. Those statements are an accurate finite geometric predicate. The audit independently recomputed every one of the 1,120 old visibility booleans and matched them exactly.

An unblocked point is evidence against guaranteed concealment by that triangle set. It is not a rendered rail-end fragment: the prototype has no generated rail/sleeper/bed/support endpoint mesh, endpoint winding or rendered material, shadow, texture, antialiasing, background contrast, or actual app view. Some points may be empty positions rather than surfaces of the eventual mesh. The test does not project against a camera frustum. Its ray scene omits terrain and other source objects. These omissions can overstate a visible defect; they cannot be invoked as an unmeasured excuse to accept one.

Conversely, all ten points being blocked does not prove the full endpoint section is hidden. The several-metre support terminal is outside the two sampled heights; discontinuities between offsets, a visible bed shoulder, a wall penetration, a roof cut, an erroneous closure or an unsampled viewpoint may remain visible. Two-sided geometric intersections also do not establish the visible/shadow material passes agree. Even a strict zero result would still need native review and structural checks.

As a bounded check of the omitted-surroundings hypothesis, I also tested all old unblocked rays against the 341 other-object faces in the frozen `surroundings.json`. Neither total changed: short 214/560, continued 26/560. Those faces were selected from final leaves overlapping X50..135/Z18..147; they are not the full scene and are not an all-scene occlusion proof. In particular, they do not explain away the continued low witness.

The correction is to make these ray counts a permanent diagnostic and a source of mandatory witness views, while scoring the actual appearance from complete native geometry and the fixed exterior matrix. It is **not** a threshold change from zero to 26, a pixel-size exemption, or a claim that “16 by 2 pixels is too small to matter.” An identifiable arbitrary dead end at native size is a failure irrespective of that count or size. Unknown appearance remains not established.

## R135-2 — eight old cameras depend on the candidate

`prototype.mjs:50-51` gives six constant eyes, then derives eight aligned eyes from each candidate's terminal centre and source opening. Their X positions therefore change with endpoint choice. The denominator 560 has the same shape, but the views are not all paired. This invalidates treating 214 versus 26 as a controlled 14-camera improvement ratio. It does not invalidate either individual failure.

| Frozen subset | Short | Continued | Bound |
| --- | ---: | ---: | --- |
| Six identical eye origins | 58/240 | 0/240 | Same eyes, candidate-specific terminal point locations |
| Eight candidate-derived eye origins | 156/320 | 26/320 | Different eyes; not a paired comparison |
| Original combined rows | 214/560 | 26/560 | Preserved old counterevidence |
| Corrected union of 22 fixed eye origins | 346/880 | 66/880 | Same 22 eyes and ten-point rule on all four tracks for both candidates |

The short/continued aligned X pairs at Z55 are respectively 64.6783338634657/65.1514056474660, 75.7393413242069/74.2056461135430, 79.7574045532113/78.6119759201505, and 91.7418110795084/89.7360015119301. Each occurs at Y22 and Y30. The other six eyes match exactly. The union retains every old negative camera and every old sample; it adds cross-testing instead of deleting inconvenient cases. I wrote `fixed-matrix.json`, read it back, and only then evaluated both frozen meshes. The script contains no camera search or geometry update. Both strict-zero predicates still fail.

Any later candidate must be evaluated against these same 22 eyes. Do not derive a replacement aligned-camera X from its new end and call that a matched comparison. If a candidate moves or changes its endpoint section, retain the ten-point rule and add coverage of its complete actual terminal faces; dropping the old population would conceal rather than fix the instrument's bound. Counts from this known/tuned matrix are not independent native coverage.

## R135-3 — the diagnostic aim is impossible, but the low eye is reachable

The actual app rig in `src/render/camera.ts:33-70` uses FOV55, near1/far8000, initial target Y15.2, minimum radius 25 m, maximum radius 2000 m, maximum polar angle 1.5550883635269477 radians (89.1 degrees), and ground-plane panning. The installed `OrbitControls.js` leaves pan enabled, has an unbounded target radius, and uses right-button dragging for pan. `zoomToCursor` is false. No other product writer of the target was found. Ground-plane pan preserves target Y; distance is to that target, not to the nearest wall. These controls do not themselves prove a camera is outside every building or above local terrain.

The diagnostic eye `(89.7360015119301,22,55)` aimed at `(127.94859723500412,20.815,144.85)` is not an app pose. Its target Y differs by 5.615 m, and its polar angle 1.5586602837778343 exceeds the clamp. It would be wrong to demand that exact look-at in a browser or silently assign it through a setter.

The **same eye** aimed at `(127.94859723500412,15.2,144.85)` is within the real bounds: radius 97.87474123539276 m, azimuth -2.7394736732732348, polar 1.5012637546305232. I instantiated the actual `createCameraRig`, delivered rotate, wheel and right-button pan events to the installed controls through a minimal fake canvas, and reached that eye to 1.1323296071089637e-12 m. The largest target-Y drift was 1.7763568394002505e-14 m. No pose or target was assigned after ordinary rig initialization. An excessive zoom/rotation negative control stopped at radius25 and polar1.5550883635269477. Listeners were disposed in `finally` and counted at zero afterwards.

This establishes the source handlers' reachability and clamps, **not Chromium event delivery or a native app frame**. The actual-control-target CPU projection places all ten east-end samples inside the 1280x720 frustum. The eight unblocked locations span X636.2154683125324..652.0529930084359 and Y319.08814702609993..321.43701656777586. Changing the diagnostic aim therefore does not remove this witness; it moves it about 40 pixels above frame centre. An actual-controls capture at that eye remains mandatory.

The other low failure origin is `(78.61197592015046,22,55)`, named `aligned-155269600-y22` in the raw file. It exposes all ten inner-west samples and eight inner-east samples. Do not relabel it as an inner-west-aligned camera merely because the inner-west count is largest. It may sit in an earlier authored recess, so its exterior status requires an explicit geometry check; keep it as diagnostic evidence even if it is not eligible for an exterior appearance verdict.

## Fixed acceptance contract proposed before native comparison

Acceptance remains the coherent source-aligned exterior with supported rails, consistent entrances, preserved roads/floors/actor paths, and no materially exposed arbitrary interior end. The following are separate conjunctive checks; one cannot substitute for another.

1. **Source and geometry:** preserve source centreline X/Z and all four tracks; bind source, authored height recipe, actual generated full sections, retained source faces, cut returns and runtime materials. Verify support, road/actor clearance, no rail/wall penetration, and complete endpoint face coverage. Geometry/material/source bytes stay identical between capture states. This audit does not waive the existing design/implementation obligations.
2. **Instrument:** rerun the 22-eye diagnostic without changing its 880-point population or hiding rows. Require exact input identity and distinguish strict-zero fail from native appearance outcome. Record full actual terminal section projection/visibility in addition to the legacy point set. Verify the native instrument with a clearly exposed-end positive failure control and a real geometric-occlusion control; a dark material is not the latter. Controls demonstrate that “did not run” is not a pass.
3. **Valid exterior evidence:** use actual pointer/rotate/pan/wheel and the public time/style inputs; reach and record every requested pose. Before scoring pixels, independently check the eye and near-plane footprint against full retained/candidate geometry and ground, and record the complete endpoint/support projection within the canvas. Ineligible interior diagnostic views stay in the record. Any replacement is justified and frozen before capture; a camera cannot be excluded after it shows an inconvenient end. N0 cannot be omitted without concrete contradictory geometry evidence.
4. **Native score:** inspect every required still at 1280x720, plus the bounded motion record, with hashes. Each record has one of pass / fail / not established, the track or source object, the visible evidence and a location in the frame. Pass requires zero failed rows and zero unresolved required rows. An arbitrary transverse rail/bed/support cutoff, disconnected run, false opaque door, rail/wall intersection, unsupported strip, torn return, mismatched entrance or traded-for visible roof/side defect is a failure whenever it is identifiable at native size. A diagnostic overlay or magnified crop may locate an issue, but cannot alone create a material-appearance failure or establish an unmodified-image pass.

The score has no new numerical pixel cutoff. If independent reviewers cannot determine whether an observed interruption is an arbitrary end or a coherent source-supported passage, the result is not established; resolve that specific evidence gap without moving the camera or editing the criterion to fit the picture. Daylight is mandatory at the failure witnesses; darkness, fog, exposure changes, a flat painted-black door or a source wall intersected by rails may not earn concealment credit.

## Small native risk matrix

`fixed-matrix.json` fixes the exact numbers, state roster and reasons. It requests **24 stills at eight poses**, not 22 eyes multiplied by all states. The remaining CPU eyes keep their diagnostic role and receive no visual pass. The existing 44-frame repository gate and native review still run; exact matching digest/pose/state evidence can be reused instead of captured twice.

| ID | Eye | Target, always Y15.2 | States | Why required |
| --- | --- | --- | --- | --- |
| N0 | (89.7360015119301,22,55) | (127.94859723500412,15.2,144.85) | Both styles, noon and dusk | Clearest low exterior failure witness; no substitute view |
| N1 | (78.61197592015046,22,55) | (108.746401208083,15.2,144.85) | Both styles, noon and dusk | Other low failure origin, spanning the two inner tracks; exterior eligibility unresolved |
| N2 | (0,30,90) | (100,15.2,105) | Both styles, noon | West side, annex/police-box returns and support |
| N3 | (170,30,90) | (100,15.2,105) | Both styles, noon | Opposite side/outer track; winding and one-sided cut risk |
| N4 | (100,30,200) | (100,15.2,105) | Both styles, noon | South/rear closure and penetration risk |
| N5 | (90.41044406172203,78.27729899463252,190.38699372829518) | (0,15.2,0) | Both styles, dusk | Frozen A1 eye with requested crossing-target block context, roof/station silhouette and approaches |
| H0 | (94.7360015119301,22,60) | N0 target | Both styles, noon and dusk | Reserved 5 m east/5 m south adjacent view |
| H1 | N0 eye | (122.94859723500412,15.2,144.85) | Both styles, noon and dusk | Reserved different orientation at identical eye |

H0/H1 are fixed here without querying candidate visibility there. Reserve them from candidate geometry/material tuning until the candidate hash is frozen. They are disclosed held-out verification cases, not a blind or previously unseen holdout. If a candidate is changed in response to them, preserve the failure and call the rerun a repaired known-case check; independent review must designate any additional holdout before the next candidate is scored.

Request eye and target residuals at most 0.10 m and orientation residual at most 0.001 radians. These are proposed acquisition bounds, not appearance thresholds. The existing `OrbitDriver` defaults of 0.012 radians and 2% distance may move this narrow witness substantially, so they cannot be inherited silently. Verify the residual against the actual complete geometry and tighten the request if the witness changes within it. A failed pose request is not established, not a nearest-possible substitute.

For each of N0's four style/time states, retain one local native motion record while real controls orbit toward the adjacent view. Use twelve consecutive native frame copies with fresh frame/pose binding; if the approved instrument lacks that capability, use a two-second native clip and report that capture bound. Four states, four traversals, no camera sweep expansion. Independently inspect the end through the movement; this does not claim to resolve the separate Q3 temporal-quality model. The acquisition script must specify the actual orbit/zoom input path before running; H0 has a different radius/polar angle as well as azimuth, so a rotation alone does not reach its exact endpoint.

## Evidence, exact pins and limits

`node artifacts/rail-endpoint-criterion-20260927/audit.mjs` and `node artifacts/rail-endpoint-criterion-20260927/fixed-matrix.mjs` completed with exit0. Their result artifacts were opened and inspected. The first verifies all 27 receipt-listed artifacts and all 34 summary input pins before and after the checks. The CPU comparison and real control-handler exercise completed in under one second each. No expensive gate or browser resource was acquired.

| Artifact | SHA-256 |
| --- | --- |
| Review130 receipt | `042995fa4ed2eefc4308bdab45c61f286c574c2a6a37d553247a029249b26778` |
| Review130 SUMMARY.json | `ccf48c117e99433f24c291723311a18b39ac75332a326612445e42a3fee5cc7f` |
| Frozen prototype.json | `a39a6c22d5a4bc057fd06e3a5119e7d405fe55e1c1d60a9ecb5abf26a6c85735` |
| Frozen prototype.mjs | `ff8d40260550a38705409f0dc89d9cd948b592f842a529dfd2e7100d7b2e31a2` |
| Frozen surroundings.json | `df9063d57650ff6e08064a78881815a4169d8649ab1c2e8ca0d1a2f6ff3560f7` |
| audit.json | `59702198347af345ebaad7e2c596cefc669b1aaf7f66d50207bfb944cc167031` |
| fixed-matrix.json | `3ac7aaf435d5343a0449c916ed12d868abfa5c2628213f6e5d0b566c7cbbc065` |
| paired-cpu.json | `38d7ea9c450cf9dfb6ae8638afa1331069b0a93e3118d1454b76f38e743f108d` |
| src/render/camera.ts | `0529a16ff037d98f9305f6523b8adc649d7d9191b19309123b687f138b6ceec1` |
| src/render/controls-rest.ts | `df3eb0ce3c6e3a4cc00640c0ced01e8037c6cf8cc9fc224f6cc830be799e9db3` |
| Installed OrbitControls.js | `b97879c748170baadeb3fb84cea1ffdf4674e283dc06042f34e2acb95a76042c` |
| tools/visual/orbit.ts | `65c321bc88098b2bc9e181bddce66d950f5657e006ea1b6e8911595aca10abaa` |

`audit.json` also records the camera/world/harness/Three build/package-lock source pins. `receipt.json` in this directory binds the report and its local scripts/results. Frozen Review130 files were not rewritten. The coordinator's live search registry may change independently; it is not a candidate source mesh.

Not run by assignment: GPU/browser/server, build, TypeScript, repository unit tests, audit, visual gate, full-scene camera eligibility, generated mesh topology, runtime lifecycle, native stills or moving native review. No appearance pass is inferred from the CPU checks. The isolated projection is not an app screenshot. I launched no browser/GUI/server process; the short Node commands exited and their scripts contain no child-process/service creation. The final read-only CIM process scan was denied by the sandbox, so there is no independent whole-process census. No process was killed. Retain this evidence while the endpoint decision and native verification remain active.

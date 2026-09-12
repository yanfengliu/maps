# Review 6: implementation

## Target

The A0 contact-planning continuation in the maps workspace, based on main `277a8332e61bd29189fa65eae7271f952b04df33`. This is an uncommitted diagnostic candidate, not the integrated application. The reviewed controller is `artifacts/agents/contact-planning/controller.mjs`, SHA-256 `368d7d6ce7cb913687c43ab3932e6dbafd6b0ce8d4a9407cf82fdde51410503c`. Its selected-scene geometry reader is `geometry.mjs`, SHA-256 `87cf457d3b3691ec02660293ff31f18fb22d416072f78212010947b4dd4dd124`. The investigator's handoff is `artifacts/agents/contact-planning/handoff.json`, SHA-256 `bfd541cff525221687d72616068c27f13b0e4cfb546722294a8f7b88962b2736`.

The rendered target is frozen under `artifacts/agents/contact-visual/capture-1789181722143/`. Its `manifest.json` has SHA-256 `182a0b635a91e9b991b4891fd953b99aa88855937e05c5ac8e48ed3521ecd29b` and binds 48 native frames, six videos, camera/time/pose records, the built viewer and its sources. Original textured GLBs and VAT remain in the retained Review 2 asset snapshot and `contact-independent/inputs/assets/`; the input verification binds their exact bytes. The reviewed source copies and an added-file patch are retained under `artifacts/agents/contact-visual/review6-source/` and `reviewed-source.patch`. They are diagnostic evidence and must survive until replaced by a recoverable accepted revision.

The A1/support freeze, manifest SHA-256 `35c4a1b48979b504ebcf4305786baa6d018a083d46116900717adf08a3df7e87`, and shared pose source SHA-256 `9f40e173a0756dfc103077ce32575394df35b4e4b5188a1c2817adbc6b01e8b2` were not edited. This round does not re-review or complete those increments.

## Reviewers and coverage

The managed asset worker `/root/status_evidence` independently assessed the contact investigator's controller, numerical instruments and source assumptions, then authored the isolated full-mesh diagnostic. The worker previously authored the asset pipeline; this is independence from the contact-planner implementation, not independent review of its own asset pipeline or diagnostic code. All 48 captured 720×960 stills were opened individually at native resolution, including the short-stop and turning sequences. The six videos were retained with deterministic frame timing and hashes; the reviewer inspected selected temporal frames, not every decoded video frame.

The root integration owner separately verified all 54 image/video hashes and inspected selected native views, including office steady/profile, female steady/three-quarter, commuter male live-stop/profile, office turn, slow and short-stop frames. Its disposition is recorded separately below. No external CLI review was attempted in this round. Earlier unavailable Claude authentication and Codex certificate/approval lanes do not count as coverage or approval.

## Reports

### Asset worker: source and numerical assessment

The first audit freshly matched 90 handoff/source/input digests. The recorded numerical result has 378 cases across all three variants and all three LODs, 162,000 actor ticks and no invalid cases. Recorded maximum planted drift is 3.583476 mm and stance height is 9.132385 mm. The added geometric proximity observer has observations for every case-foot. These are recorded full-matrix results, not a fresh rerun of all 378 cases. A fresh replay of the published office-male/far vertex 286 witness at t=1.175 s reproduces its world position and 3.583476 mm drift exactly. The 5 mm drift and ±15 mm height bounds remain unchanged and apply to the stated flat support cases.

**F6: the correction uses a different reference pose from the delivered vertices.** `scenePose` adds `skin(corrected bind-world matrices) - skin(bind-world matrices)` to idle VAT frame zero. The GLB skeleton is a bind reference, while that VAT already includes the authored idle pose. This difference is material: near-LOD head vertices average approximately -35 mm Y relative to bind skin in all three bodies. Dominant thigh/calf vertices differ by up to 109–136 mm. Body residuals including lowered arms reach 431–576 mm. The producer recipe explicitly applies 35 mm of idle root drop. Correcting from bind joints while retaining that already-posed residual does not establish that the resulting visible joints and clothing follow the solved skeleton. A zero bone-length error and correct soles cannot prove whole-body pose fidelity.

**F7: the candidate's posture and timing visibly fail ordinary walking.** The controller imposes an additional minimum 65 mm pelvis drop. In the rendered ordinary sample at t=0.633333 s, fixed target reach requires only 0.867 mm for commuter male, -0.732 mm for office male and 10.437 mm for commuter female; actual drops are 65, 66.515 and 65 mm. At each rig's neutral ankle position, adding 65 mm of drop changes analytic knee flex from 7–8 degrees to 44–49 degrees. The head already carries the idle 35 mm offset, so this floor puts the torso approximately 100 mm below bind height. The native profiles visibly show a squat rather than an upright walk.

Nominal ankle spacing is 31.3–39.1 cm, compared with hip spacing of 17.8–22.9 cm. Holding the candidate targets otherwise fixed and moving only their X coordinate to hip width reduces peak required drop by only 3.6–4.6 mm. Width alone does not explain the crouch. Conversely, the present target policy still requires 86–88 mm peak drop during the sampled 0–2.2 s warmup. Removing the floor alone is not a demonstrated complete repair. These analytic sensitivities did not change or run an alternative controller.

The source fixes every foot lift at 70 mm in 35 ms, giving an analytic peak vertical velocity of 3.75 m/s even at 0.1 m/s body speed. The investigator's ordinary walking interval records 4.483 m/s peak foot speed and 110.703 mm peak additional pelvis drop; the stress restart reaches 9.975 m/s. Foot-yaw and pelvis derivatives are not fully continuous. These measurements are evidence for investigation, not newly invented naturalness thresholds. All captured near variants keep their arms still because the complete upper body remains idle frame zero. Source walking has an authored arm swing that this candidate does not preserve.

### Asset worker: rendered full-mesh assessment

The diagnostic reconstructs complete selected-scene textured meshes, not just soles or rig anchors. Its prepared matrices were compared with the original `scenePose.point` on 967,680 actual drawn vertices at start/middle/end of all 45 prepared tracks. Double-precision positions match exactly; the float32 payload's maximum error is 0.000000119 m. This establishes adapter agreement with the candidate. It does not validate the candidate's mismatched reference assumption.

The six videos cover 1.1 m/s steady motion, live walking followed by two short stops and restart, a continuous 90-degree turn, 11 seconds at 0.1 m/s, the phase-0.749 instantaneous 2 m/s stress restart, and forced near/medium/far changes. Each video is encoded at 60 fps from four 240 Hz candidate ticks per frame. Screenshot wall time does not advance the motion. There are 1,524 encoded frames in total. The 0.075 s stress velocity maximum lies between two captured frames; the numerical source retains that exact sample. Only three near variants are shown in the stress clip, so it is not a rendered verification of the far-LOD numerical maximum.

The 48 native frames show persistent crouch in all three bodies across steady travel, slow travel, restart and turning. The short-stop sequence retains the same stiff upper-body pose. The turn sequence changes body heading over motion while the knees remain deeply bent. Clothing, hair, hands and shoes remain recognizable, with no gross disconnected limb seen in these frames. That limited observation does not repair the reference mismatch or establish natural clothing motion.

Medium/far views deliberately magnify their geometry at the near diagnostic camera. They expose angular silhouettes and holes or missing surface coverage around some shirts, hair and extremities. The forced-LOD video also uses the close camera. These views are useful counterevidence, not acceptance at the eventual 18 m/60 m transition distances. No runtime LOD policy, populated city, controls, graded pavement or camera-preserving style flow was exercised.

The viewer applies the CPU-deformed full geometry to ordinary three.js main and shadow rendering, with triangle-derived normals and the source textures. It is not the shipping VAT main/depth/distance/GTAO chain. It cannot establish production cross-pass correctness, original source normals, photoreal appearance or full-population cost.

### Root integration owner: disposition

The root independently rejected the candidate for pronounced crouch and static upper-body motion. After the source audit, the root accepted the reference mismatch as a material cause: sole contact evidence does not establish whole-body reference fidelity. It approved only a bounded, ignored, one-variant/near reference-metadata investigation before any posture-policy change. It did not approve production integration, a full rebake or a shader rewrite.

The new controller must be continuous from its own spawn through live walking, stops and turns. There is no added requirement to transition at runtime from the rejected old walk/idle algorithm. Reference compatibility remains mandatory wherever the chosen deformation combines posed VAT and bone transforms.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| A0 | Original runtime walk/idle mixing slides feet | Remains open. This candidate supplies bounded contact evidence but fails whole-body acceptance. | Preserve Review 2 and both contact investigations; do not replace the shipping path yet. |
| F6 | Bind-joint correction is added to already-posed idle VAT | Accepted by root. The independent source audit measures large posed residuals, including lower legs. | Recover exact matching reference palettes and validate them against full delivered geometry before applying corrections. |
| F7 | Fixed extra pelvis drop and idle upper body produce a crouched, mechanical gait | Accepted by root and independently visible in native frames. | Keep posture/reach policy separate from reference repair; assess a near-upright source-based walk only after reference identity passes. |

## Verification

`node artifacts/agents/contact-visual/verify-inputs.mjs` verified the initial 90 references. `recheck-witness.mjs` reproduced the published worst vertex. `prepare.mjs` checked the 967,680 full-mesh adapter samples. `posture-analysis.mjs` measured reference residuals, knee flex and reach/width sensitivity across all nine variant/LODs without changing the controller. Its result is `posture-analysis.json`, SHA-256 `b79515af49d1acd2680071418cd398f30b228dc9961c0522332c5c9bd43f1386`.

`capture.mjs` completed the isolated capture in 124.135 seconds on 2026-09-12, ending 02:57:27 UTC. No browser errors were recorded. `verify-final.mjs` freshly verified 219 digests with zero mismatches, including all outputs, viewer build, diagnostic source, prepared matrices and original inputs. Each native frame reviewed is bound to its digest in the final capture manifest and the retained native-review record.

The first launch timed out before producing pixels because the diagnostic server routed Vite's `/assets/` JavaScript into the source-asset directory. Its failed manifest and source are retained under `capture-1789181614040/`. The corrected diagnostic uses `/source-assets/`; it did not change production serving. Both launch attempts completed their `finally` cleanup. The final context, browser, browser server and HTTP server closed. A fresh targeted process check found none of the known Node/browser/six encoder PIDs and no listener on port 4320. The GPU/browser lease was released. No shared process was stopped.

The allocating investigator scaffold's recorded median cost is 12.399 ms planning per 3,000 actors per 240 Hz tick plus 22.405 ms for matrix construction. This was not rerun here and excludes rendering, vehicles and city work. It is not a 3,000-agent production performance result. No build, full unit suite, audit, ordinary app visual gate, population simulation, support-surface test or shipping cross-pass test was run for this review.

## Round outcome

Reject the current contact prototype for production and naturalness. Preserve its bounded flat-contact result and all failed visual evidence. The next approved investigation is a small reference-only extraction from the existing retained source blend and frozen baker for one near variant. It must first compare evaluated Blender drawn positions with the existing VAT, then compare independently reconstructed `skin(referencePalette)` with those positions under an explicit quantization/error bound. Zero-correction identity alone is insufficient because an implementation can subtract the same wrong palette from itself. Add full-body zero-correction and a controlled single-joint perturbation only after the source/reference correspondence is demonstrated. Explicitly account for coordinate conversion, mesh bind transforms, actual joint ordering, weights and modifiers. Preserve a counterexample if linear skinning cannot reproduce the baked geometry. No A1 source-format change, posture-floor adjustment, full bake or production renderer change follows from this review.

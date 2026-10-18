# 1512 — Corrected traffic capture reassessment

Date: 2026-10-18 UTC. Independent reviewer: traffic1506_milestone_reassessment. Integration owner: root. This is a read-only workflow decision, not product or native acceptance.

## Independent recommendation

**Continue with the one corrected instrument arm now.** The source freeze was met, and the first native failure supplies a specific timing defect rather than evidence requiring another production repair. Keep the source, seed, counts, views and acceptance unchanged; enforce the 750-second ceiling and **native completion by 02:12 UTC**, preserving time for the full gates, integrated review and push before 02:25. Missing or tree-occluded stop/turn/exit evidence means PARK—no third arm, new camera or counter-based substitute. The workflow issue was spending the capture budget before establishing event visibility; navigating early and asserting timing directly addresses it. Marginal scheduling is acceptable only with these cutoffs; an incomplete native result cannot consume the reserved acceptance window.

## Root adoption and revised intermediate reserve

Root adopts the single instrument correction and unchanged final 02:25 UTC integration cutoff. Run1 failed its 600-wall-second ceiling with 18 originals, no boundary frames and incomplete native evidence; 1510 retains the inspected-byte and timing bounds. Its final scoped census passed, and its exact external TEMP was removed after a further successful census. The unlaunched 300-second proposal remains prepared history, not a failed run.

The exact combined recipe 5d7fd4a5a60ac62c207b4f21f8b22f25176d9b19bb5e40f077f32178e561f712 was independently reviewed before dispatch. Run2 started 02:01:37 UTC with the same frozen source, default seed, 24 requests, controls and two fixed cameras. It navigates before the events and refuses late actual-clock intervals. The stopped car may still be occluded; counters do not fill that gap.

After actual dispatch readback, root explicitly revised only the intermediate native reserve to 02:14 UTC. Run1's late measured pace projects about 679 wall seconds to 506 simulated seconds before remaining overhead; a 02:12 reserve no longer fits that projection. The owned 750-second ceiling remains about 02:14:07 and is not extended. Primary source/fixture preparation proceeds without runtime gates; public native review will overlap the single required gate capture. The previous full bundle took 429.011 seconds, which is a planning baseline, not a promised current duration. Every native criterion, all five gates, independent integrated review and pushed main must still finish by 02:25. Otherwise park, preserve the exact gaps and restore the prepared primary copy; no third capture, reframing or production repair is authorized in this milestone.

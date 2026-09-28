# Walking303 — bounded gait and normal-pass candidate

Ready for independent source review; native gait and warning acceptance remain pending. Worktree only: C:/Users/38909/.codex/worktrees/walking-scene/maps, branch codex/walking-scene, base 5c1a4a772cd57cb4abda14e1c227db530553d05b plus accepted291. Primary, original291 proofs and cached assets are unchanged. No commit, browser or GPU run. No source writes followed the one successful candidate build.

Four deltas are frozen in candidate/ and candidate.patch. Future positive-speed foot targets use existing hip X, reducing this actor's ankle separation from 325.7 to 184.5 mm without moving planted anchors. Walking clearance is 70 model mm; stopped turns retain 35 mm. Existing quintics, freeze/duration/drop rules, installed rig and upper-body animation remain. The contact-only registered normal material is invisible during the actual adapter swap; beauty geometry, style, depth treatment and contact fade are unchanged.

Root route/profile/authority, seed, actual Start, defaults and event-history semantics were not edited. Exact global root timing did change through settling; timing.json/root-timing.json preserve the failed equality check. Root explicitly amended acceptance to at most two added fixed steps per corner and four per cycle. Actual extra settling is [0,2,0,2], total 66.7 ms. First-leg timing and first handback are identical. All four translating root sequences match predecessor hashes after omitting elapsed time alone, including position, speed, source/physical travel and identity. The final regression asserts those predecessor pins, explicit corner bounds and identical deterministic replay.

Verification: focused.json exit0, **76/76 tests in exactly10 files**, no skips; latest typecheck.json exit0; build.json exit0. The build ran once with reviewed vite.local-walk.config.ts and configLoader runner, using its own initially absent artifacts/local-walk/dist output. All six build files are bound in the manifest. Vite reports the existing large-chunk advisory; this build makes no runtime-warning claim. No dependency change or audit rerun.

The actual-engine trace covers 1,195 fixed ticks / 19.9167 seconds, all four legs/corners and resumed walking. It checks actual three-LOD shoes/soles at midpoint and current samples, with existing full-body admission at events: 4,308,582 shoe samples and 4,827,322 body vertices. Minimum shoe residual −1.854 mm, maximum plant minimum 12.320 mm, maximum drift 0.240 mm; original 15 mm / 5 mm limits remain. At events and every sixth tick, actor-aligned boxes of actual posed shoe vertices remain separate, minimum gap 100.713 mm. Sampled walking lift reaches 75.636 mm relative to local ground; the apex includes the higher source/landing height. This is finite shoe/support evidence, not continuous whole-body self-collision or appearance certification. A second trace reproduces all 1,195 root+gait state digests.

Old-code controls are retained. Restoring the predecessor controller fails the width/clearance contract (one failure, one pass, child exit1). Restoring a visible contact normal material fails both real-adapter exclusion cases (two failures, seven passes, child exit1). Both restore exact candidate bytes in finally. The adapter regression keeps an ordinary receiver renderable and verifies beauty restoration after success and injected draw failure. Its bound is CPU draw submission; native warning-level GL collection remains required.

The first overlap assertion used world-axis shoe boxes and failed inconclusively at 1.1917 seconds. Actor-aligned orthonormal boxes remove that diagonal-box artefact without relaxing geometry thresholds; first receipts remain. Discovery now selects exact current test paths so ignored predecessor snapshots cannot enter the denominator. No gait parameter sweep occurred.

Reuse292's unchanged frontal camera, actual Start, real picker and capture machinery. The six moving near targets in near-phases.json are Satellite right/left apices 1.181833 / 1.498500 seconds, transfer 1.650 seconds; Cartographic left/right apices 2.131833 / 2.448500 seconds, transfer 2.600 seconds. Keep the existing15-image budget. Inspect actual phase/error (proposed maximum25 ms), medium readability, beauty contact and zero GL warnings/suppression. A more flattering camera alone cannot clear299's held criterion.

## Exact handoff

| Delta | SHA-256 |
| --- | --- |
| src/agents/population/local-ordered/controller.mjs | d060116635cba4b764d741be4721d526b9aa81ba6bfdfb85aeb97095f272ba43 |
| src/agents/render/local-walk-contact.ts | 90263ec830a61b883cbeec67c4920c462b364c66fc376f25f10d9964d3baab62 |
| test/local-walk-contact.test.ts | a79fe205f07da4279d937a54a973ce13442eb55ab3dfc3c700281c592ba526af |
| test/local-walk-support.test.ts (new) | 5b7a676150f21bd38174b1839f9459bafbcebeecd3ad639b27135f0e0929a279 |

Manifest SHA-256: ea6e52627ad3d126eb74892de2dce894e60dc5cb67370002d64b20e6fb8a57be. Patch: 16ccad7bb3d77d76ab7fff3ffc24fc3f675fbee08313606c7ffa0d0e90b521cd. Phase schedule: 532c9858efc5a836d7bba80cc6c1dde1812051fa3891e76848dd5738352cbfdf. Final finite receipt: 0f55a834162c5a7ee6ea0606de0af04d04b8d1ee3feb45714376da5ce9eca968. The manifest binds affected receipts and six build files. predecessors.json binds the original three replaced files; prior291 supplies unchanged lineage. The source/config/test union now contains25 files. Existing strict packet/source-load tests reused the five accepted packet pins; no source generation, install or wholesale rig/VAT qualification ran.

Data and node_modules remain read-only-use junctions to primary's corresponding directories. Tests used owned cache/TEMP/TMP. Cleanup confirms no owned Node process;25 temporary files and empty owned cache were removed. Candidate snapshots, receipts and the build remain for active review. Rejected266 default/autostart/controller-history/portable-installer and public-push boundaries remain unchanged.

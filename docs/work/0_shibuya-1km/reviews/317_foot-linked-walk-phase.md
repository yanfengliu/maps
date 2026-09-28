# Walking phase candidate 317

Bound: one localized candidate on base 5c1a4a772cd57cb4abda14e1c227db530553d05b plus frozen 303, for the same female actor, retained route, 60 Hz root clock, source clip and existing cameras. No natural-gait acceptance or GPU claim. Independent source review and bounded native review are pending. No primary copy, commit, merge or push.

## Change

The source walk phase now follows the accepted foot flight's side, start and end. It reaches the source's corresponding landing phase and holds during planted gaps, rather than accumulating an independent nominal period. The walk phase is unwrapped and render sampling interpolates it. The initial stopped pose uses the source's neutral quarter before its first left landing; the existing blend still starts at zero. Idle clip phase and the existing blend remain unchanged. There is no phase reset at departure, landing, turn or resumption.

This uses the existing source and full swing amplitude. It adds no sway, pelvis/ankle authoring, asset, animation system, camera change, duration tuning or clock tolerance. Only three files differ from 303: controller.mjs adds the foot-linked phase, local-walk-gait.ts samples it, and local-walk-phase.test.ts supplies the bounded actual-rig regression. candidate.patch is the complete small delta; candidate/ is the frozen 26-file source union.

## Results

The independent 314 source hand/foot correlation was −0.997786. The candidate restores opposing movement in each prescribed window. H is left-minus-right hand Z and F is left-minus-right foot Z in the actor's forward basis. Mesh values use actual weighted source vertices, 1,547 per hand and 624/625 per foot.

| Window | Old clock joint H/F | Candidate joint H/F | Candidate mesh H/F |
| --- | ---: | ---: | ---: |
| 0.6–1.3 s | 0.489558 | -0.998573 | -0.998571 |
| 0.6–4.3 s | 0.756089 | -0.998382 | -0.998380 |
| 3.3–4.3 s | 0.553851 | -0.998729 | -0.998726 |
| 6.6–7.6 s | 0.812369 | -0.993288 | -0.993286 |
| 20–21.6 s | 0.677512 | -0.998084 | -0.998081 |

All 1,320 root/controller-history records through 22 seconds match the exact pre-edit 303 digest febdf9a2bfc7902a7a43fb89e92bfae7e29b45c52a1a215245d77e72c9a13d59 after excluding only walkPhase and walkPhaseFlight. The preserved fields include every foot position/velocity/acceleration/yaw, chosen flight, admission/event record, original sourcePhase/sourceBlend, drop, root clock and turn history. This adds no timing amendment. The probe baseline was captured from the actual 303 engine before implementation; the pin is not derived from the fix.

Source hand excursion remains the original approximately 244.655 mm. Across every fixed tick, maximum unwrapped phase increment is 0.048757893 cycle, with no backward jump. Maximum hand-joint movement per 1/60-second step is 37.463622 mm. One-sided render samples at alpha 0.000001 and 0.999999 approach their respective endpoint hand poses with maximum residual 3.780953501e-8 m. The checks cover all five starts and stationary turns. This establishes finite pose continuity; it is not a velocity smoothness or natural-motion score.

The old-clock control uses the unchanged sourcePhase for walk pose sampling, exactly recreating the removed choice while retaining the actual new foot/root trace. It was run as a genuinely failing targeted test: joint opposition 0.6–1.3 s was +0.4895576759747788 against <−0.95. The other two tests were intentionally filtered in this red run. No source file was mutated for that control. The ordinary run then passed all three phase cases and all other focused cases.

## Physical checks and build

The existing, unchanged three-LOD support test ran on the changed upper-body poses for 1,195 ticks, through the complete four-leg route and walking resumption. It evaluated 4,308,582 shoe vertex samples and 4,827,322 full-body vertex samples, including static corridor/obstacle checks. It recorded 44 walking and 16 stopped departures. Minimum shoe height was -1.854293 mm, maximum absolute planted-minimum height 12.319742 mm, and maximum planted drift 0.240243 mm. The existing 15 mm height and 5 mm drift bounds are unchanged. The minimum shoe-box gap remained 100.713248 mm and maximum walking clearance 75.636039 mm. This physical check stops at 19.916667 seconds; the separate phase/history trace continues to 22 seconds. Neither is continuous collision or population qualification.

- Focused local-walk checks: 79 passed across exactly 11 files; 21.886 seconds. The actual asset HTTP fixture closed its server.
- Types: passed; 3.850 seconds.
- One opt-in build: passed; 2.030 seconds. The existing Vite large-chunk warning remains; it is recorded in build.json.
- Old-clock red control: expected failure; 5.740 seconds.

Node v24.12.0 was the existing machine runtime. No full all-five gate, independent source review, native/GPU capture, source qualification or audit was run in this assignment. Those missing checks are not implied by the focused pass.

The build is isolated at C:/Users/38909/.codex/worktrees/walking-scene/maps/artifacts/walking317-20260928/dist. It used the unchanged vite.local-walk.config.ts with Vite API output/cache overrides. All six frozen 303 files in artifacts/local-walk/dist still match their recorded hashes, and all 25 primary 303 source files remain unchanged. The 303 source, evidence and old build were preserved. The native runner must select walking317/dist explicitly; the old shared opt-in output remains 303.

## Frozen handoff

Manifest SHA-256: ef5a8f676fc7b390db68f535204f39437772b527ff46fb7cb798e6d04cba8a1b.

- src/agents/population/local-ordered/controller.mjs: 3e2117108c98821a8f846a02c3b82964d0b5358f24cc9756fff3d7cc6a1d0ce9.
- src/agents/population/local-walk-gait.ts: 23219df38c04475cec620b62e422f1a18989a47205d60cc742bf2b443107d223.
- test/local-walk-phase.test.ts: bf2848a145fbf5b83533c03b5f21a69f3b6878b36f549b151311e83df741500b.

manifest.json binds candidate snapshots, exact source/build bytes, baseline pins, the patch and every verification receipt. phase.json includes all 1,320 phase summaries and the five mesh/joint windows; finite-gait.json is the actual physical receipt; red-tests.json retains the expected failing assertion. run.mjs/focused.mjs identify exact commands, file denominator, owned caches and environment. The build was invoked once after the coherent increment and passing tests/types.

Owned diagnostic/check processes were verified absent with a successful process query. Vitest closed in finally; the HTTP fixture reports closed:true. The private temporary Node compile cache and empty cache directory were removed after confirming the resolved paths remained inside walking317 and contained no links. No browser or GPU process launched. Retained artifacts belong to this unresolved candidate/review handoff. The existing walking-scene worktree remains active for integration and review; it was not retired.

This candidate corrects the measured coordination mechanism. Naturalness remains an independent bounded native judgment in both styles at the existing near and held-out profile views. The source's absent torso rotation and ankle roll are unchanged limitations, and this result does not authorize broader art work or an acceptance change. Continuous-motion claims still require actual playback; sparse frames alone do not supply them.

# Independent source-to-draw gait report 314

Bound: read-only diagnosis of frozen source 303 on base 5c1a4a772cd57cb4abda14e1c227db530553d05b, same actor/route/60 Hz clocks, current near-frontal and medium-profile cameras. This does not certify natural motion, rendered GPU bytes, contact, collision, or the failed 304 recorder. No product implementation. Reviews 299 and 309 were not read. Comparison with branch 313 belongs to the root.

## Finding

The composed body loses the source clip's opposing arm/leg phase relationship. This is a concrete composition counterexample, not a claim that activity or a correlation alone proves natural walking. The actual controller carries an independently accumulated upper-body sourcePhase alongside event-driven feet; its source clock does not follow selected swing durations, landing quantization or the mandatory later departure tick.

At t=2.300000 s and source phase=0.500374110, the source has H=0.244600 m and F=-0.571015 m. The composed pose has H=0.244600 m and F=0.361962 m. Thus the source puts the left hand ahead while the left foot is behind, whereas the composed draw palette puts both ahead. The actual weighted mesh groups agree: hand-centroid difference=0.300537 m; shoe/foot-centroid difference=0.362002 m. Both feet are in their actual controller state; no source or pose was changed for this measurement.

H means actor-local hand_l.z minus hand_r.z; F means foot_l.z minus foot_r.z. Local +Z is forward. Values include context scale 1.0391258001327515. Pearson correlation subtracts each signal's mean: negative means opposing sagittal differences, positive means same-direction differences. The 32 actual source walk frames yield -0.997786. The actual composed trace yields:

| Window | 60 Hz samples | Joint H/F correlation | Actual mesh H/F correlation |
| --- | ---: | ---: | ---: |
| 0.6–1.3 s | 43 | 0.489558 | 0.489566 |
| 0.6–4.3 s | 223 | 0.756089 | 0.756090 |
| 3.3–4.3 s | 61 | 0.553851 | 0.553852 |
| 6.6–7.6 s | 61 | 0.812369 | 0.812366 |
| 20–21.6 s | 97 | 0.677512 | 0.677515 |

The 6.6–7.6 s window follows the first turn and walking resumption at 6.25 s. The 20–21.6 s window covers the existing medium-view time range after the later resumption at 19.283333 s. These are bounded windows of this one actor, not a population or biomechanical score.

## Cause and source-to-draw chain

At normalized speed 1.1, controller.mjs:11 gives duration=.297 s and controller.mjs:223 advances sourcePhase with period 2*.297=.594 s whenever the foot state is moving or was moving. Actual cruise departures are .316666667 s apart; a same-foot cycle is .633333333 s because a flight completes on a 60 Hz observation and the next departure requires a later planted-begin update. Same-side departure source phase drifts .066217733 cycle per actual cycle, or 23.838384 degrees. Side 0 departs at .716667 s/phase .834829778, 1.35 s/.901047511, 1.983333 s/.967265243 and 2.616667 s/.033482976. Startup adds selected flights of .1709125 and .25245 s while sourcePhase still uses nominal duration. Stationary turns also keep advancing sourcePhase. A fixed phase offset would leave the period mismatch intact.

controller.mjs:227–237 solves the two legs from current world anchors and idle-reference bones, initializes the remaining palette from idle minus vertical drop, then transfers only spine descendants from source worldsAt(walk,sourcePhase), aligned to that idle pelvis. local-walk-rig.ts supplies the actual 48-frame/53-joint packet and immutable idle reference. local-walk-draw.ts:53 consumes this exact scenePose palette, and local-differential/gpu.ts writes original idle positions plus weighted current-minus-reference bone deltas. local-walk-material.ts:9 uses that local-position texture as transformed geometry. The diagnostic's scenePose.point uses the same mathematical source-minus-reference construction and actual source vertices. This is a source-to-draw mechanism finding; no GPU readback was run here. The styles change materials, not this pose clock or palette.

## Initial hypothesis corrected

My initial source reading suggested that frozen pelvis and ankle orientation might be the principal composition loss. Actual source measurement narrows that claim: all 32 walk frames already have zero pelvis, spine_03 and head basis excursion; foot basis changes are only about 5.4e-7. There is no source torso rotation or ankle roll here to preserve. Source pelvis Y range is 10.391 mm; composition replaces it with reach-derived lowering (26.951 mm range in the .6–4.3 s window). That is a composition choice, not proof of the visual cause.

The upper body is not frozen: source hand Z range is 244.655 mm, and composition retains 244.445/244.453 mm. A claim that the arms do not move is false on these bytes. Source art remains a separate quality limit; this branch does not authorize a new asset or animation system.

## Native evidence and its limits

I inspected exactly three original 1280×720 PNGs, no crops, upscaling or extracted video frames. Their actor draw times and hashes are retained in measurements.json:

- near-walking/frame-1170.png: satellite, near, drawn t=1.502866667 s.
- near-walking/frame-1273.png: cartographic, near, drawn t=2.137366667 s.
- medium-walking/frame-4157.png: satellite, medium, drawn t=21.008433333 s.

The two near samples are 0.634500000 s apart and show a narrow frontal silhouette with small arm separation. The medium actor is much smaller and in profile. These stills establish neither continuous motion nor absent arms; frontal foreshortening is an alternative explanation for weak arm visibility. Footage was not played in this branch. Natural walking remains subject to independent, bounded native gait judgment at the existing cameras and both styles using the available sparse-frame inspection tools. Continuous-motion claims require actual playback; this adds no playback certificate or new acceptance mechanism.

## Instrument and pins

The repository's existing finite gait fixture supplies the exact owner setup. probe.mjs imports createLocalRig, createLocalFloor, LocalWalkGait, createOrderedFootEngine and scenePose directly, advances 1320 actual fixed ticks through 22 s, and evaluates actual source joints and mesh vertices. The mesh groups contain 1547 vertices per hand and 624/625 per foot, selected once by at least .95 accumulated skin weight on that joint subtree. No lower-body animation oracle is recreated. Diagnostic foot and interval callbacks accept the replay; this intentionally does not repeat or certify the support gate.

All 25 sourceUnion hashes match source 303 and the primary checkout, before/after. context.json, rig-near.json and rig-medium.json match the existing pins. Ten moving-state root records from walking 304 match exactly, maximum numeric difference 0. The exact observed draw times are sampled with LocalGaitFrame.sample, and near/medium rig selection follows the recorded LOD. The source 32-frame opposing pattern is the independent signal control; real mesh centroids verify that the counterexample is not merely bone activity with no surface consequence.

Node v24.12.0 with experimental TypeScript transform was used for this finite diagnostic, not for final gates. No browser/server/GPU launched. All task-owned diagnostic Node process IDs were checked after use and none remained. One optional supplementary read was interrupted after inefficient repeated array flattening; it is not an input to this finding. No full rig/source qualification, build, unit suite, visual gate or audit ran. No support/root/contact/clock tolerance changed. Task evidence is retained only under the assigned ignored artifact directory for this unresolved handoff.

## Smallest justified next step and exact gap

After root compares 313 and 314, a bounded candidate should coordinate upper-body source phase continuously from actual foot events/poses, including selected flights, planted intervals and turn-to-walk resumption. It must preserve the existing source-arm pose continuously: no phase resets/snaps. Keep contact controller decisions, root route and clocks, controller history, default startup, installer, cameras and both styles unchanged. An offset tweak or bigger swing is not sufficient evidence because the measured phase drift remains.

Acceptance needs a finite coordination check grounded in the source's actual opposition and controller events, with a deliberately de-synchronized red control, plus continuity across start/turn/resume. Then use the unchanged contact/root/clock checks and sparse 30 fps native clips at the held-out profile and near camera, with independent natural-motion judgment. This diagnosis establishes one correction mechanism; it does not establish that corrected coordination alone will look convincing, and source torso/ankle simplicity remains outside that promise.

Evidence: probe.mjs is the reproducible bounded instrument; measurements.json holds pins, windows, events, ten native root checks and image hashes; trace.json holds all 1320 pose summaries and 32 source summaries. Product/source/docs/data/build were not edited. No commit, merge or push was attempted.

# Review 14: implementation

## Target

Three completed bounded F7 evidence units in maps, based on main `d3699133aa9185543fdfc51997f76385be011285`: the explicit correction of a literal-source contact inference, the equal-deadline selector correction in a rejected diagnostic controller, and the predefined 70/35/20 mm vertical-height comparison. This checkpoint preserves authored evidence and owner dispositions; it adopts no new human controller, height, source format, production renderer or naturalness claim. Review 11 remains the separately open graphics review. Earlier review reports are unchanged.

The source-contact target is `artifacts/agents/contact-f7-source-contact/handoff.json`, SHA-256 `04cf87824f00b404de42745a21333939d305a3627be727d2e2dba78ead9dba12`. It binds the prior native handoff `9ca046ba42abccfe5fee54d6c143c42953fc4675b1df207c0687acc47054d8b0` and actual capture `e8f061735ca107da7e445439a0455fbea5d034f4b8ac92a06ffa27cd0f27a3ab`. The correction retains those original reports and pixels as counterevidence.

The selector target is `artifacts/agents/contact-f7-selection/handoff.json`, SHA-256 `aed222f33fb23b5ce57dd077adc04153f7ce6f6542ab7f3c3db28a67d7da3a35`, with 28 owned and 31 external pins. Original controller `02a459ecc54eb0354b0aa2ab73d9294aec43663a57336b37b211e6115921c697` differs from candidate `9258bde9f28485c93453b602698ff4bd4461bcb2f0c12d999c1735a6527498d0` only in the declared equal-deadline selection expression. Its independent review is `artifacts/realism-review-f7-selection/handoff.json`, SHA-256 `1f3cd030f4263386429983f7ef56fe2699a0dfdd320711c2a8cdee28368cb5e1`, binding 115 records and 51,930,381 bytes.

The height target is `artifacts/agents/contact-f7-height/handoff.json`, SHA-256 `44e1a00528955ab081fca95ff3fad9df12a1adb2e5c69b64af4c2ff79cd90794`, with 233 records and 39,319,390 bytes. The 70 mm baseline is the same selected controller; the 35 mm source is `bd7341a75081c8ffcf261b18dc2b641e0c03af865d7c4e722988e9948a495558`, and the 20 mm source is `1ad1f5915b561f87c55d384b7ec534e34a080e09f3b8ab6efa93b45556cebd61`. Only the HEIGHT literal changes. The subsequent fresh-investigator brief is `artifacts/agents/contact-f7-height/fresh-investigator-brief.md`, SHA-256 `4eb84259ff39b187a479540c6810a7dc5a51cc624ece7202844ad22949ed498a`; it chooses no implementation and supplies no additional acceptance.

The reviewed diagnostic code, including new scripts, is preserved in `artifacts/graphics-milestone/docs-checkpoint-next/source/` and `diagnostic-source.patch`, SHA-256 `8a8017c6e8f144b993b685586f350bd9d76b1b83237921b2d44e988c2da44158`. The patch contains 36 complete text-source files at their original ignored paths, normalized to LF for patch transport; source copies retain their exact bytes. It is recovery evidence for these diagnostic targets, not a patch to apply to production. Bound binary inputs and raw outputs remain at their sealed ignored handoffs and must be retained while the gait question remains unresolved. Before removing them, a later owner must establish a recoverable reviewed source target; this docs commit alone does not commit the diagnostic code or data.

## Reviewers and coverage

The asset worker (`/root/status_evidence`) authored the source-contact correction, selector experiment and height comparison. Those reports are implementation evidence, not independent worker reviews. The realism worker (`/root/realism`) independently copied and reviewed the selector target, reran its CPU corpus and full-geometry observers, and added separate counterexamples. Root separately inspected the reports and evidence, checked exact target hashes, accepted the bounded contact correction and selector review, and independently recomputed the height comparison's body/XZ/state/event projections. Root's owner dispositions are separate from the authored reports below.

The reports are embedded in full. Their Markdown heading levels are shifted down three levels solely to fit this review; all other authored bytes, including historical pending statements and proposed next steps, are preserved. The sealed originals remain recoverable in `artifacts/graphics-milestone/docs-checkpoint-next/originals/` under their original paths. Historical proposals and pending statements describe the moment each report was written; the separate disposition below records this round's actual decision. No new GPU run or review of unseen motion is attributed to this checkpoint.

## Reports

### Asset worker: explicit source-contact correction

Original `artifacts/agents/contact-f7-source-contact/report.md`, SHA-256 `9c04b310c6be402e6e4fc9673c8d93b52f4892f499b6483e1ed827b9c2918ef8`, 2616 bytes.

#### Correction to the literal-source visual inference

The earlier visual report's impression that both shoes in literal-source steady frame 0 were off the ground is **not supported by the actual captured geometry**. The right stance shoe is grounded within 0.020 mm. The left shoe is in its intended source swing. The original image and sealed report remain unchanged; this is an explicit subsequent correction, not a rebind of their evidence.

The captured frame index 0 is time zero of a trajectory initialized at source phase **0.7770000100135803**, not walk phase zero. `check.mjs` uses the exact frozen `source-vat.mjs`, prepared decoded Float32 VAT, source clip selection, body/yaw and final Float32 vertex writes from the viewer. It evaluates all **807 drawn shoe vertices per side**. The selected-scene VAT sampler and captured prepared sampler agree exactly. The viewer's ground is the origin-centered plane rotated −π/2 around X, hence Y=0; only the grid is raised by 0.1 mm.

| Captured frame | Source phase | Left shoe minimum | Right shoe minimum |
| --- | ---: | ---: | ---: |
| source steady 0 | 0.7770000100 | +103.240237 mm, swing | −0.019541 mm, stance |
| source steady 38 | 0.4103333354 | −0.003400 mm, stance | +55.946451 mm, swing |
| source idle 0 | 0 | 0 mm | 0 mm |

The source root-ablation measurement is therefore consistent with the actual captured reference path: original authored stance shoes are close to the ground. No source/display mismatch was found. I re-opened the exact native 720×960 source-steady-t0 profile while making this correction. Its overlapping feet and separated shadows were misleading as a contact instrument. The correction does not establish why every shadow pixel appears where it does, continuous GPU shadow contact, stop/restart planting or natural motion.

The literal source's crouched posture, earlier derivative measurements and whole-body naturalness rejection remain separate. Likewise, the new zero-root walk really fails source reach and has measured raised stance shoes; that numerical failure is not withdrawn. “Literal source control without the contact planner” must not be read as “the source has no grounded stance.”

`measurements.json` preserves each actual minimum vertex, world point, phase, clip and input digest. The check is CPU-only and creates no browser, GPU, source bake or production change. This addendum binds the original visual handoff `9ca046ba42abccfe5fee54d6c143c42953fc4675b1df207c0687acc47054d8b0` and capture manifest `e8f061735ca107da7e445439a0455fbea5d034f4b8ac92a06ffa27cd0f27a3ab`; neither was edited.

### Asset worker: authored selector evidence

Original `artifacts/agents/contact-f7-selection/report.md`, SHA-256 `75c618136950c65c9e973b800ab28261e05e5f2292d7cc9e895bcebab8a0b8d0`, 12310 bytes.

#### F7 equal-deadline selection experiment

Status: completed bounded CPU experiment, awaiting independent disposition. The selector fixes the reproduced eligible-foot blocking class in the rejected diagnostic controller. It does not establish natural walking or a viable production renderer. All changes and outputs are under this ignored directory. The human recipe, schema, source assets, served data, production source and previous evidence remain unchanged.

The preserved floor-off controller is `02a459ecc54eb0354b0aa2ab73d9294aec43663a57336b37b211e6115921c697`. The selected controller is `9258bde9f28485c93453b602698ff4bd4461bcb2f0c12d999c1735a6527498d0`. `preparation.json` contains the exact old and replacement expressions. `compare.mjs` proves that replacing this one expression produces the entire candidate file exactly. All trigger thresholds, support forecasts, targets, reference poses, body paths, stride, lift/lower timing, height and pelvis rules stay the same.

The old stable sort selects side 0 when both support forecasts return the censored 0.6-second ceiling, then checks only that foot's eligibility. An ineligible side 0 can therefore block an eligible side 1. The candidate prioritizes eligibility only when numerical deadlines are exactly equal. Ties with equal eligibility retain the old stable order; strictly unequal deadlines retain their old priority. It does not treat the 0.6-second ceiling as a measured future support deadline.

##### Selector controls and retained rejection

`selection-check.mjs` exercises the actual `update` function in 14 fixtures. Ten cover ceiling ties, both feet, both position orderings, no eligible foot and both eligible feet. Four use unequal uncensored deadlines at 1.1 and 2 m/s. The original fails four eligibility expectations; the candidate passes all 14. The original failures remain in `selection-check.json`. `deadline-check.mjs` independently evaluates the straight-line fixture geometry to verify that the ten ties are actually censored and the four other cases are unequal and uncensored. These are finite class representatives, supplemented by the exact tie-only source comparison, not an exhaustive proof over arbitrary geometry.

##### Unchanged contact gates and measured effects

Both arms pass the original 43-case, 240 Hz, commuter-male near corpus. The 30 short traces retain ten spawn phases at 0.1, 1.1 and 2 m/s; the other traces retain three phases of old stops, live walking before short stops/restarts, a 90-degree turn at 180 degrees/s, 11 seconds of slow motion, and one idle case. The historical `restart` label denotes a 0.3-second constant-speed trace initialized at a selected phase; it is not a claim of continuity from the rejected shipping algorithm.

Each arm evaluates 11,716,320 selected sole vertices. Maximum planted drift stays 0.115307 mm, maximum reach error is zero, and all retained stance, penetration and final-stop bounds pass unchanged. The 5 mm drift and 15 mm stance-height bounds are not relaxed. Near-ground band observations remain observations; they are not used to rename an airborne foot as planted.

All 40 non-slow case result objects, including events, posture, geometry and derivative measurements, compare exactly. Only the three slow cases change:

| Slow phase | Mean extra drop, old → candidate | Maximum extra drop, old → candidate | Maximum knee bend, old → candidate |
| --- | ---: | ---: | ---: |
| 0.017 | 17.630 → 3.168 mm | 85.916 → 43.124 mm | 70.856° → 61.651° |
| 0.333 | 11.689 → 1.405 mm | 85.878 → 10.438 mm | 65.170° → 59.545° |
| 0.777 | 22.467 → 1.405 mm | 104.196 → 10.438 mm | 80.680° → 59.911° |

These drops are additional to the unchanged source idle reference's approximately 35 mm lowering from bind. Minimum slow-case knee bend remains about 23.171°, and maximum upward recovery/downward rates remain unchanged. The global corpus still reaches 140 mm extra drop in `turn-0.017`; the retained steady predecessor peak of 124.400 mm is not repaired by this slow-case selection change. The source root-height and native constraint reports remain bound separately.

The slow ankle's rapid lift remains approximately 3.677094 m/s with about 313.064 m/s² peak sampled ankle acceleration. Across the one-near corpus the maximum ankle speed remains 8.769328 m/s in `restart-0.249-2`. The tiny last-bit acceleration/speed differences in changed slow traces are retained in the JSON; no exact derivative equality is claimed for those three changed trajectories.

##### Actual drawn shoes and serialized whole body

`observe-full.mjs` replays the same schedules with the actual corrected full-weight geometry. Each arm queries all 807 drawn vertices of each shoe at every sample, including initialization: 29,896,122 shoe-vertex observations. Actual planted-shoe minimum absolute height is zero; the minimum over every drawn shoe vertex is zero. The actual shoe geometry's maximum sampled vertical speed is 3.899115 m/s, exceeding the ankle-only 3.677094 m/s measurement. Its maximum world speed is 8.792624 m/s. Both maxima remain unchanged. This stronger geometry measurement reinforces the retained rapid-lift rejection.

At the start, middle and end of each of the 43 cases, the observer serializes the actual joint palettes to Float32 and independently evaluates the unchanged packed six-influence payload for all 21,044 selected drawn vertices: 2,714,676 full-body comparisons per arm. Maximum distance from `scenePose.point` is 0.157294 µm in both arms, below the unchanged 10 µm serialization comparison bound. This compares two correction representations; it is not a replacement for the earlier independently evaluated source-reference proof. The matching reference palettes, sparse weights, GLB, original VAT and that earlier proof remain pinned.

The packed body input has 21,084 capacity entries, 21,044 drawn vertices, 3,036,096 bytes and SHA-256 `adafaadc882287694fed51f7cd85796f26a604c596996b4189a9daf01210d9d6`. `compare.mjs` checks that hash against the retained prepared manifest and checks the expected capacity and drawn population. Zero correction alone is not offered as source fidelity proof. The source control's wrong-palette negative and root-height ablation failures are preserved by their original handoffs.

These full-shoe measurements are finite samples. Full-body correction is sampled at three times per case, not every tick. No continuous extrema, new GPU normal/depth/shadow consistency, other eight variant/LODs, native appearance or full-population performance is established.

##### Cost and reproduction

On Node v24.12.0, the two original corpus children ran sequentially for about 5.737 and 5.522 seconds. Their accumulated controller-only planning timers were 116.983 and 114.299 ms; sole evaluation took 5,347.960 and 5,122.033 ms. Each additional full-shoe/body observer took about 19.06 seconds. These are one-actor offline oracle measurements under concurrent graphics work, not a scaled runtime benchmark or a speedup claim.

The prior independent investigation measured median planning of 12.3993 ms plus matrix construction of 22.4050 ms for 3,000 actors per 240 Hz tick, before vertex skinning or city rendering. This allocating controller/geometry scaffold remains unsuitable for production. The tie fix adds eligibility evaluation and arrays to that scaffold; it does not resolve its scaling problem.

Reproduce in a copied evidence directory with the same relative dependencies, because output writers intentionally preserve completed outputs with exclusive creation where applicable. The commands actually run were `node selection-check.mjs`, `node deadline-check.mjs`, `node run-probe.mjs`, `node observe-full.mjs original`, `node observe-full.mjs selected` and `node compare.mjs`. The existing probe writer itself is not an admission gate: `compare.mjs` asserts all 43 actual result flags and full-observer flags rather than inferring success from the probe process exit code. All these executions returned zero. The final comparison independently asserts the exact source replacement, all 40 unchanged result objects and all three changed case identities.

The benchmark wrapper retains direct child handles and ran one child at a time. Both child close events were observed with exit zero. The two full observers were direct tool commands, returned exit zero and launched no children. Fresh read-only `Get-Process` at 2026-09-13T04:56:24.7444671Z found recorded parent 28388 and children 26368/37392 absent. There was no browser, server, Blender or GPU launch, and no process termination was needed. The outputs are intentionally retained for unresolved gait work and independent review.

##### Next bounded proposal: clearance policy, then affordable pose execution

User requirements are natural-looking moving people, grounded contact without visible sliding, anatomical/clothing fidelity, continuous behavior from their own spawn through stops and turns, authoritative simulation trajectories, all 3,000 pedestrians animated, and the shared frame-rate target. The 70 mm ankle lift, separate 35 ms rise and 40 ms lower, 100 mm rear trigger, 35 mm source-idle lowering and 240 Hz oracle are authored implementation choices. None is a user-required clearance, posture or update rate.

The next single channel to investigate should be vertical swing clearance. Keep the reviewed selector, XZ path and touchdown decisions, body trajectory, reference pose and pelvis policy fixed. Compare the current vertical channel with one smooth rise/fall over the already available airborne interval, using an explicitly source-informed whole-shoe clearance envelope rather than silently assuming every step needs a flat 70 mm ankle translation. Before choosing its amplitude, measure actual source whole-shoe/toe minima and their relation to ankle height and foot rotation over the verified frames. Source values provide an anatomical comparison, not an automatic naturalness target: the literal source itself remains visually rejected. Preserve all candidate heights and any contact/reach failures; do not tune height to disappear under the ground-band classifier or declare a lower toe invisible.

This proposal changes one vertical-trajectory policy and leaves the other channels as controls. It may reduce the rapid pop but worsen reach or inherited crouch by holding the ankle lower; that is a useful causal rejection, not permission to change the pelvis, stride or body position in the same experiment. The existing timing proof rejects the 70 mm quintic within some old schedules, not all smooth trajectories or a different justified clearance. A later coupled scheduler/reference design remains a separate decision after this comparison. Native whole-body and contact inspection are required before any naturalness disposition; none is requested or claimed in this CPU handoff.

Any eventual production path must avoid the oracle's per-vertex CPU work, repeated 60-sample support forecasts, object cloning, descendant scans and four allocating 240 Hz updates per display frame. A bounded prototype should evaluate preallocated per-foot state at the shared simulation step, use cached rig correspondence and closed-form two-link calculations, and upload compact leg correction data while sampling a shared verified source upper-body palette on the GPU. Straight/constant-curvature support limits need an analytic or bounded conservative replacement validated against the retained oracle; changing update rate alone cannot inherit its contact proof. Six 3×4 Float32 leg transforms would cost 864,000 bytes per 3,000 actors per upload, or 51.84 MB/s at 60 uploads/s, excluding actor roots, an upper-body/root correction, drivers and GPU passes. This is explicit arithmetic for a possible layout, not an approved format or measured performance result.

Before adopting that route, measure planning and pose generation separately over 3,000 actors with allocations counted, preserve the same trajectories/contact disqualifiers, and reject it if it cannot leave time for the city, vehicles and all rendering passes. The full-shoe/full-body oracle stays offline. It is not the intended per-agent runtime implementation. This design adjunct contains no runtime, source-pose, schema or bake mutation.

### Realism worker: independent selector review

Original `artifacts/realism-review-f7-selection/report.md`, SHA-256 `fc6ed9711e3204e4f36f2bddf0ebc80c4151bfeb637f7b240be22998d3af65d1`, 6276 bytes.

#### Independent review of the F7 tie-selection CPU increment

Decision: no material finding within this isolated numerical and geometry scope. This is not production, naturalness, whole-population or GPU acceptance. The graphics candidate and its active software run were not changed. The review used only copied inputs and new ignored CPU output, with one CPU child at a time.

The target is `artifacts/agents/contact-f7-selection/handoff.json`, SHA-256 `aed222f33fb23b5ce57dd077adc04153f7ce6f6542ab7f3c3db28a67d7da3a35`, and the author's report `75c618136950c65c9e973b800ab28261e05e5f2292d7cc9e895bcebab8a0b8d0`. The 28 owned and 31 external records were copied with pre/post source hashes checked. `input-manifest.json` binds all 59 files and 26,008,027 bytes. `snapshot/` preserves the entire supplied target; `run/` contains the copied source/dependencies and fresh writer outputs. All input snapshots and executable copies still match their admitted hashes after the reruns.

##### Source and reproduced defect

I read the actual controller, preparation, geometry/reference adapter, update fixtures, deadline checker, 43-case probe, full-shoe/body observer and result comparison. The candidate `9258bde9f28485c93453b602698ff4bd4461bcb2f0c12d999c1735a6527498d0` is exactly the original `02a459ecc54eb0354b0aa2ab73d9294aec43663a57336b37b211e6115921c697` with the one declared expression replaced. Forecasts, thresholds, reference pose, path, vertical motion and pelvis policy are unchanged.

The previous stable sort could select an ineligible side 0 at the 0.6-second censored ceiling and never evaluate the eligible side 1. The new comparator consults eligibility only for numerically equal deadlines. Strictly unequal deadlines preserve priority; equally eligible ties preserve stable order. The pure eligibility reads do not mutate the foot state. This does not claim that a censored ceiling is a true support deadline, or that other scheduling failures are repaired.

I ran all six author commands from the copied writer directory. The actual update fixtures reproduce 4 original failures and 14 candidate passes. The separate straight-line geometry check confirms 10 censored ties and 4 unequal uncensored cases. I added 10 actual-update controls for turn eligibility on both sides/signs, the exact turn threshold, rear-position thresholds on either side of the strict boundary, equal eligibility ordering, and first-update timing. All 10 candidate controls pass; the original fails 3. The added fixtures record the actual denominator and finite updated state; they do not implement a replacement selector as the expected result.

##### Independent reruns and bounds

Both arms ran all 43 cases at 240 Hz for 18,480 ticks each. Each queried 11,716,320 selected sole vertices. Every fresh per-case result object matches its corresponding sealed author object exactly, including events and failure fields. All required recorded geometric metrics are finite, all 43 actual acceptance flags pass, and the unchanged 5 mm planted-drift and 15 mm height bounds pass. The retained proximity-band observations are not used as planted-contact authority.

The full observer replays the same schedules and independently evaluates every drawn shoe vertex at each tick plus initialization: 29,896,122 observations per arm, 807 vertices per shoe. It also compares all 21,044 drawn body vertices at three times per case through the Float32 palette and unchanged six-influence payload: 2,714,676 comparisons per arm. All fresh observer result objects exactly match the author. Maximum serialized correction discrepancy is 0.157294 micrometres, below 10 micrometres. This validates agreement of correction representations; the earlier source-reference proof remains separately bound and was not re-created here.

Forty non-slow case objects remain exactly equal between controllers. Only `slow-0.017`, `slow-0.333`, and `slow-0.777` change. Their mean extra pelvis drops decrease from 17.630/11.689/22.467 mm to 3.168/1.405/1.405 mm. Maximum planted drift remains 0.115307 mm, maximum reach error zero, and measured minimum drawn-shoe height zero. These are the same finite measurements reported by the author.

The retained rejection is significant: global extra pelvis drop still reaches 140 mm; the source idle's roughly 35 mm lowering is unchanged; the actual drawn shoe still reaches 3.899115 m/s vertically and 8.792624 m/s in world space. Slower-case drop improvement does not establish natural-looking motion. Other variants/LODs, continuous extrema, source/normal/depth/shadow GPU behavior, native appearance, authoritative trajectory integration and 3,000-actor performance remain outside this review. No timing result here establishes a speedup. The allocating 240 Hz oracle remains a rejected production architecture.

##### Execution and resource evidence

`selection-check.mjs`, `deadline-check.mjs`, `run-probe.mjs`, the two `observe-full.mjs` modes, and `compare.mjs` all returned zero. `check-rerun.mjs` separately checks actual result populations, finite required metrics, explicit bounds and exact per-case equality; process exit status is not its pass oracle. The extra `reviewer-controls.mjs` returned ten passes with three retained original failures.

The corpus wrapper ran children 36840 and 17280 sequentially under parent 16176, observing both close events and zero exit codes. The corpus times were about 5.69 and 5.64 seconds; the two full observers took 18.62 and 18.00 seconds. These single-actor offline measurements occurred during the separate software graphics capture. Fresh read-only `Get-Process` at 2026-09-13T05:11:08Z returned none of the three recorded corpus identities. The direct observer tool sessions returned exit zero and launched no children. No browser, server, Blender, GPU or process termination was used by this review. The separately owned graphics process remains active and untouched.

The proposed later clearance-policy experiment is a proposal, not a result accepted by this review. Its source-informed whole-shoe envelope and fixed horizontal/reference/pelvis controls are sensible decision boundaries, but amplitude, naturalness and performance require their own evidence. No production format or renderer selection is approved here.

### Asset worker: authored height comparison

Original `artifacts/agents/contact-f7-height/report.md`, SHA-256 `c6734f27f8bab180e2df442cf0ff00c596d6724bca30ee83424e2426ca42d986`, 10462 bytes.

#### F7 predefined height comparison

Status: completed finite CPU comparison. All three predefined arms pass the retained numerical geometry/contact checks, but the lower heights trade a slower vertical rise for worse crouch at the known steady and turning poses. No height was adopted, no naturalness acceptance is claimed, and no further amplitude experiment is being started. Root is assigning a fresh investigation of the coupled gait.

The baseline is the accepted diagnostic selector, SHA-256 `9258bde9f28485c93453b602698ff4bd4461bcb2f0c12d999c1735a6527498d0`, with `HEIGHT=.07`. The 35 mm candidate is `bd7341a75081c8ffcf261b18dc2b641e0c03af865d7c4e722988e9948a495558`; the 20 mm candidate is `1ad1f5915b561f87c55d384b7ec534e34a080e09f3b8ab6efa93b45556cebd61`. The entire files compare exactly after replacing only that one literal with `.035` or `.020`. These heights are explicitly authored diagnostic hypotheses, not anatomical targets inferred from the source animation.

The 35 ms lift, 40 ms lower, horizontal targets, timing/eligibility rules, phase initialization, upper-off reference, source weights, pelvis policy and authoritative trajectories stay unchanged. Only the vertical target changes directly. Its effect on the unchanged pelvis solver is measured rather than corrected away. The accepted selector freeze and queued native preparation remain immutable.

##### Corpus and instrument

Each arm completes all 43 predeclared commuter-male near cases at 240 Hz: the same ten spawn phases at three speeds, old/live stops and restarts, turn and slow traces, and idle control. Each contains 18,523 recorded states including initialization. All 43 baseline legacy result objects exactly reproduce the previously accepted selector's numerical results. The added full-shoe observer also reproduces the earlier baseline whole-shoe speed maxima exactly. The original corpus and instrument are the starting point; a scratch alternative body path was not substituted.

All body/time/yaw/speed fields, horizontal foot positions and foot yaw, and authored state transitions compare exactly at every recorded row across all three arms. Projected event lists also match exactly: time, event type, side, duration and horizontal coordinates are unchanged. Full event JSON differs in 24 cases for each lower arm because target/point Y values contain the changed height. Those vertical differences are expected and retained. No event, target or horizontal path change is hidden.

Each arm evaluates 11,716,320 retained sole vertices and 29,896,122 actual drawn shoe vertices, including all 807 vertices per side. The forefoot and heel use the same fixed source geometry regions as the preceding clearance observation: 233 vertices beyond the ball-joint plane and 229 behind the ankle plane on each side. Minimum heights and state labels for whole shoe, forefoot and heel are recorded separately at every sample. A swing whose minimum lies within 15 mm remains labeled as its actual `lift`, `move` or `lower` state; proximity is not renamed contact.

Each arm also compares 2,714,676 full drawn-body vertices through serialized Float32 palettes at start/middle/end of every case. The worst representation error is 0.157914 µm, below the unchanged 10 µm serialization check. The earlier independently evaluated reference/source proof remains a separate input; this agreement is not a new independent anatomical proof.

##### Results and tradeoffs

| Observation | 70 mm | 35 mm | 20 mm |
| --- | ---: | ---: | ---: |
| Completed/passing cases | 43/43 | 43/43 | 43/43 |
| Maximum drawn-shoe vertical speed | 3.899115 m/s | 1.996095 m/s | 1.180478 m/s |
| Maximum drawn-shoe world speed | 8.792624 m/s | 8.788812 m/s | 8.786026 m/s |
| Maximum ankle world speed | 8.769328 m/s | 8.769328 m/s | 8.769328 m/s |
| Maximum sampled ankle acceleration | 313.064001 m/s² | 243.017222 m/s² | 243.017222 m/s² |
| Maximum extra pelvis drop | 140 mm | 140 mm | 140 mm |
| Tick-weighted mean extra drop | 11.458383 mm | 12.641895 mm | 14.560087 mm |
| Maximum planted sole XZ drift | 0.115307 mm | 0.115307 mm | 0.115307 mm |
| Maximum reach error | 0 | 0 | 0 |
| Minimum actual whole-shoe Y | 0 | 0 | 0 |
| Authored swing samples with whole-shoe minimum ≤15 mm | 579 | 772 | 1,158 |

No arm reached an invalid solve, penetration or existing contact-gate failure. There are no unrun cases in these three actual arms. The 5 mm planted-sole drift and 15 mm stance-height bounds are unchanged. Actual planted whole-shoe minimum is zero; planted forefoot minimum is 0.315189 mm and planted heel minimum is 3.074646 mm. Peak swing minima are the chosen height for the whole shoe, height plus 0.315189 mm for the forefoot, and height plus 3.074646 mm for the heel. These are flat-ground finite observations, not clearance over the city's obstacles or curved surfaces.

The existing 140 mm crouch ceiling remains active in the turn corpus. The slower vertical motion also leaves the fast horizontal restart motion essentially unchanged. The lower heights do not solve the combined visible gait defects.

| Known observation, extra drop below unchanged idle reference | 70 mm | 35 mm | 20 mm |
| --- | ---: | ---: | ---: |
| Steady predecessor, t=0.441667 s | 124.399926 mm | 124.890012 mm | 125.100049 mm |
| Steady frame 38, t=0.633333 s | 76.483259 mm | 90.905307 mm | 105.905307 mm |
| Turn frame 40, t=0.666667 s | 24.383554 mm | 46.282762 mm | 61.282762 mm |
| Slow frame 554, t=9.233333 s | 0 | 0 | 0 |

The source-idle skeleton already lowers the hip by approximately 35 mm relative to bind, in addition to these drops. The worst whole-corpus knee bends are 79.397°, 76.127° and 76.338°. In the repaired slow phase 0.777, maximum knee bend improves from 59.911° to 49.136° and 43.772°, while mean extra drop changes from 1.405 to 1.427 and 1.458 mm. The pose tradeoff depends on the phase; the global knee maximum alone would hide the worsening known steady and turning crouch.

The coupling follows the unchanged reach expression: `hipY - targetY - sqrt((length - .002)^2 - dx^2 - dz^2)`. Lowering the swing target while holding its XZ path fixed increases the required drop at that instant. The existing margins, anticipation and recovery rates turn that requirement into additional or longer-lived crouch. This is an explanation within the current controller and reference, not proof that the user's natural-gait requirements are impossible.

All-shoe point movement during an authored plant is also retained. Its maximum is 36.225421 mm in every arm. A focused replay identifies vertex 17971 in `turn-0.333` at t=1.245833 s: it moves from Y=109.816 mm to Y=100.667 mm, is outside the retained sole set, and is weighted about 53.565% to `calf_l` and 46.435% to `foot_l`. This measures deformation of the upper shoe, not 36 mm of planted sole sliding. It remains relevant to eventual visual review; it is not omitted merely because the contact gate measures the lower sole separately.

##### Failure handling and retained controls

The instrument stops an arm on its first invalid solve or retained contact-bound failure, writes the exact witness and lists unrun cases. Because none of the three actual height arms exercises that stop, `check-stop.mjs` verifies it with a separate diagnostic copy. It changes one ankle target by +10 m at tick 2, leaving every height-controller file untouched. The actual solver reports 9.510170 m reach excess at t=0.008333 s. The arm stops after that first case's second tick, preserves the witness and invalid trace row, lists 42 unrun cases, and exits with the declared semantic-failure code 2. The invalid row stores NaN shoe minima with `validGeometry=0`; no unrenderable geometry is assigned a fabricated ground height. This mutation and output are retained under `red-control/` and are not another height hypothesis.

The three real children ran sequentially for approximately 30.633, 30.868 and 30.269 seconds. All exited zero with close events observed. The stop-control child had a finite 20-second process timeout and exited with the expected code 2. Fresh read-only process checks at 2026-09-13T05:29:54.5497107Z found parent 42428 and children 40280, 8196, 44500 and 33216 absent. No browser, server, Blender or GPU was launched. No termination was needed. All output is retained under this ignored directory for the unresolved gait work.

Reproduction uses `node setup.mjs`, `node run.mjs`, `node compare.mjs`, `node check-stop.mjs` and `node inspect-plant-movement.mjs` in a separate evidence copy with the same relative dependencies. Output creation is exclusive. `run.mjs` treats semantic failure as retained evidence and does not retry it; unexpected infrastructure errors stop subsequent arms. Actual flags and trace checks, not child exit codes alone, establish the stated numerical result.

##### Disposition

The lower heights are numerically feasible over this fixed one-near corpus. Do not report reach rejection where none occurred. The 20 mm hypothesis most reduces vertical speed among the predefined choices, but it worsens the known steady and turning crouch more than 35 mm. Neither dominates all relevant measures, neither has been rendered in this experiment, and neither is adopted as a natural walking fix.

The current phase-derived initialization puts both feet in `plant` using a walk phase's horizontal offsets while retaining the source-idle skeleton. That initialization, the 35 mm idle-source lowering, fixed flat foot orientation, chosen heights and timing are scaffold assumptions. User requirements are continuity from the new controller's own spawn, grounded natural movement along authoritative trajectories, valid anatomy/clothing, all target actors animated and feasible production cost. A future change may revisit scaffold assumptions explicitly, while preserving these counterexamples and declaring how their comparisons remain meaningful. It may not silently change the body traces or weaken contact assertions.

The full allocating 240 Hz oracle remains unsuitable for production. The prior 3,000-actor result of 12.3993 ms planning plus 22.4050 ms matrix construction per tick still stands; this one-actor verification cost is not a replacement performance test. There is no new runtime format, pose architecture, shader, asset bake or production change here. Root is pursuing fresh independent judgment of the coupled problem; this height family stops with the three predefined arms.

### Root: independent owner disposition

Root accepted the source-contact correction: the literal-source frame's stance foot is grounded within 0.020 mm, while its other foot is in the intended source swing. This corrects the earlier both-feet-airborne visual inference. It does not retract the source posture, rapid-lift or whole-body naturalness rejection, and it does not establish continuous shadow contact from a CPU minimum.

For the selector, root read the full independent report, rerun checker and ten added controls, then independently verified all 115 handoff records with zero mismatches. Root accepted the tie-only correction's numerical and finite full-geometry evidence. The 3.899115 m/s actual shoe rise, 140 mm global extra crouch, source assumptions and rejected runtime cost remain unresolved. The diagnostic controller is not promoted to the production simulation.

For the height comparison, root read the complete report, brief, observation/setup/comparison/stop instruments, verified all 233 pins with zero mismatches, and separately recomputed the 18,523 rows per arm across all three arms. Body/time/yaw/speed, horizontal foot coordinates/yaw, state and projected event records match exactly; the known crouch and vertical-speed maxima reproduce. All three arms are numerically feasible within the preserved finite contact bounds. Root accepted the recorded tradeoff and stopping this predefined family, with no height adoption, naturalness acceptance or production acceptance. Later gait proposals are unimplemented and do not inherit this review.

## Findings and disposition

| Existing finding | Result within this round | Disposition and follow-up |
| --- | --- | --- |
| F7 naturalness: source contact interpretation | Literal-source steady frame 0 starts at phase 0.7770000100; right stance minimum is -0.019541 mm, while left swing is +103.240237 mm. | Correct the unsupported both-shoes-airborne inference explicitly. Keep the original native report and all other posture/naturalness findings. |
| F7 diagnostic selection | Equal censored deadlines could block an eligible side; the tie-only correction passes the reproduced class and independent controls without changing forecasts, thresholds or reference. | Accept bounded numerical correction and preserve the original failing controller. No production or visual naturalness claim. |
| F7 coupled height and posture | 70/35/20 mm all pass finite geometry/contact checks; lower heights slow vertical rise but worsen known steady/turn crouch and retain fast horizontal motion. | No height adopted. The gait remains rejected; fresh coupled investigation may revisit declared scaffold assumptions with preserved comparisons. |
| F6 reference and full-body scope | Full drawn geometry and serialized corrections are checked against separately pinned reference evidence. | Retain earlier scoped F6 evidence. Correction-representation agreement does not establish anatomy, all LODs, GPU pass fidelity or natural motion. |

## Verification

The independent selector review reran all six author commands in a copied writer scope, both 43-case/240 Hz arms, 29,896,122 actual shoe-vertex observations and 2,714,676 serialized full-body comparisons per arm. Original fixtures fail four cases and the candidate passes all 14; ten added controls pass the candidate with three retained original failures. Forty result objects remain exact between arms and only three slow cases change. Root verified the complete independent handoff. These counts describe actual executed finite observations, not an exhaustive continuous-motion proof.

The height comparison completed all 43 cases in each predefined arm. Its separate +10 m ankle mutation produces 9.510170 m reach excess, stops at tick 2, retains the invalid witness and lists 42 unrun cases. Root independently verified the complete handoff and per-row projection equality. Actual planted-sole drift remains 0.115307 mm under the unchanged 5 mm bound; maximum serialized discrepancy is 0.157914 micrometres under the unchanged 10 micrometre bound. These are flat-ground, one-variant/near-LOD CPU results.

The source-contact correction evaluates all 807 drawn shoe vertices per side through the exact captured source sampler and Float32 writes. Its author reopened the exact native source frame; the contact conclusion rests on geometry rather than the misleading shadow separation. The original capture and reference reports remain distinct evidence. No new native height comparison was run, and no new convergence, GPU normal/depth/shadow, all-variant/LOD, city support, integrated trajectory or 3,000-actor performance acceptance is claimed.

The read-only command `node ../fleet/scripts/work-docs.mjs check --repo .`, run against the main working tree before this report was published, failed with: `review rounds must be contiguous from 0; expected round 11, found 12.` This is the existing missing Review 11 baseline, retained while graphics acceptance is incomplete. Adding only Review 14 neither creates nor repairs that gap. The scoped content/source verification above is accepted; overall work-document structure verification remains failed. No placeholder review or change to earlier reports is included.

This is a one-new-file documentation checkpoint. No code, package, served data, existing review, plan or devlog changes belong to it. Source/build/runtime/visual gates for unfinished implementation are not represented as passed by this checkpoint. The independently owned graphics lifecycle diagnostic and its unresolved navigation failure remain outside this report.

## Round outcome

Preserve the corrected source-contact conclusion, accepted independent selector evidence and completed no-adoption height tradeoff as permanent authored history. F7 naturalness and viable production gait remain open. Phase-derived two-feet-planted initialization, the roughly 35 mm source-idle lowering, fixed flat foot orientation, 35/40 ms lift/lower durations and allocating 240 Hz oracle are disclosed scaffold choices, not immutable user requirements. No later coupled design is selected here, and none of these partial proofs completes the Shibuya deliverable.

# 1509 — Ordinary traffic source and integration review

Date: 2026-10-18 UTC. Independent reviewer: traffic1509_source_integration_review. Root owns integration; shibuya1498_visible_activity_feasibility owns implementation. Scope: source read-only, with this report as the only authorized write. No source, test, index, cache, browser, server, GPU or replay mutation was performed.

## Verdict

PASS for source review of the complete frozen candidate3 diff against base `0681715632e66ad825a3d78ac7d9282c5cb038b5`. No material source finding within the bounded ordinary-traffic increment. This is not final integrated acceptance: native event/appearance review, real-input default/style/walker behavior, the five primary gates, exact main readback and push remain PENDING at this review. The candidate remains uncommitted on `codex/traffic1499` in `artifacts/traffic1499/worktree`.

The independently hashed freeze is `artifacts/traffic1499/candidate3-freeze.json`, 4107 bytes, SHA-256 `461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c`. All 23 listed paths match both length and digest. I inspected the full diff for all 23, not only the narrow repair reports, plus the network-contract and fixture-provenance changes. The only changed test-tree path outside the 23 is `test/fixtures/README.md`, which was also read. Approved source/test paths have no unstaged changes, and their staged whitespace check passes. Git required a per-command safe.directory declaration under the review account; no global setting was written.

## Production interfaces inspected

Default startup in `src/main.ts:71` keeps seed 5970698 and the retained local-walker selection, then requests 24 vehicles and zero generic pedestrians only when no explicit agents/pedestrians/vehicles selector exists. Explicit zero counts and generic population selectors do not activate the ordinary override. The generic parser and 3,000/200 acceptance settings are unchanged. The existing walker Start walking button and its readiness predicate remain the actual start control. The new app option is passed through createAgents and createPopulation to the route request; it is not inferred inside the generic planner.

Vehicle central routing uses existing original directed edges, the reverse distance field, a bounded waypoint walk, and the existing complete assembly/body/halts checks. The waypoint must have a signal group within the central radius and reach a real exit. Paths are bounded by 120 edges and 1,600 metres, with seen-edge exclusion and the viable callback on successor choices. Assembly still requires a true AOI exit and its boundary profile, source corridor admission, original passage construction and actual body/frame validation. Vehicle plans are deliberately uncached, so the new option cannot retrieve a stale generic cached vehicle plan. Calls without the option retain the old walk policy.

The local walker receives the same admitted fleet that supplies population and rendering. Its preflight excludes the retained world-space whole-body actorEnvelope from every vehicle source segment and both portal endpoint envelopes. The generated vehicle sphere includes asymmetric centre, full 3D size and maximum supported scale; the travel allowance includes the 1.5 m halt capture and conservative source joins. Surrounding source confirms the maximum speed factor is 1 (`src/agents/population/config.ts:128`), admitted vehicle lane index is 0 and held by `src/agents/population/vehicles.ts:440`, and publication/interpolation uses previous/current poses rather than independent renderer motion (`src/agents/render/pose.ts:6`). Generation changes suppress cross-spawn blending. The sphere covers yaw/support-basis interpolation, and the chord/portal allowances cover the bounded origin path. This separates this retained walker corridor; it does not establish general vehicle/pedestrian avoidance, whole-city contact or every intermediate walker deformation.

The clearance narrow phase remains restricted to qualified straight source segments and qualified seams. It retains generated dimensions and centres, heading/deviation padding, stop gap and publication margins. Curves, unqualified seams, lane offsets, boundary-entry prefixes, sweeps reaching a real exit and tilted other bodies retain circles. Active and pending neighbours remain included. The test preserves the historically blocked portal witness and promotes literal independent poses/scales/routes for the adjacent-lane case. Current-body source-path separation is the supported claim; this predicate does not predict both actors' future motion or prove rendered interpolation between different headings.

The approach-departure latch is private to the granted commitment and captures the exact immutable matching body-specific halt. Validation precedes clock advancement. Observed progress and mapped-control checks precede latching. Expiry, logical occupied() and pending cancellation agree on irrevocable departure; geographic entered and final-tail release retain their distinct predicates. The population supplies exact route identity/current generation after request assembly and keeps its held passage even when a current request is denied. The updated network contract now reflects this distinction. New amber/red admission remains gated by the original signal rule.

Earned queue age advances only when the existing eligibility predicate and own-green condition pass. Continuous identical actor/route/generation/passage/occurrence demand retains that age through temporary denial. A changed demand, absent request or completed grant clears its previous priority. Deterministic ordering and the existing holder exclusion remain. The new state does not change eligibility or signal ownership. This applies to the shared authority without activating generic pedestrians.

The app loads validated hardware before the fleet, verifies the fleet manifest against hardware.inputs.vehicles, and passes that same object to the renderer and walker. GLBs retain their own manifest digest checks. Human assets are skipped when the generic pedestrian pose count is 0; empty HumanRenderer update/style/dispose loops remain safe (`src/agents/render/humans.ts:155`,217,230). Existing renderer failure cleanup, late app disposal and shared style consumers retain ownership. createAgents.dispose now also drops the admissions reference after unregistering its fixed-step callback. Both populations use the existing fixed loop; the harness gains no setter. No dependency, data, public schema or world-frame change appears in the reviewed diff.

## Tests and existing runtime evidence read

I read every changed/new test and the complete literal 13,123-byte clearance fixture. The tests exercise production imports, include independently pinned observed distances/poses and source input digests, and retain negative cases for actual overlap, crossing orientation, angled seams, portal fallback, stale route/generation, oversized bodies, mapped stops, red admission, cancellation and tail release. The app coexistence test is a mocked wiring/lifetime test; it is not real-control or rendered evidence. The synthetic occupied pedestrian test exercises production authority exclusion; the accepted ordinary walker itself remains outside junctions.

The retained queue control log has exactly two intended older-demand ordering failures with old behavior, in both request orders; six other cases did not run in that control. Restored candidate execution reports 60 tests across 7 files passing in 8.40 seconds. I did not rerun tests. This focused log does not substitute for the full unit gate or prove every negative was separately mutated.

I independently read the complete existing `cpu-fair-flow-probe.mjs` and selected actual result fields/event records from `cpu-fair-flow.json`. The probe calls the candidate production tick/authority and records observations while delegating to the original methods. It ran 36,000 fixed 1/60 steps with seed 5970698, requested 24 vehicles and zero generic pedestrians. It reports firstFault=null, thrown=null, zero authority violations and retiredInPlace=0. All 25 before/after source/input pins agree and the 23 source pins match candidate3. The run took 37.7141403 wall seconds; that is CPU probe duration, not browser FPS.

The actual result records 164 geographic entries, 169 releases, 219 observed turn occurrences and 2 boundary retirements. Vehicle 7 geographically enters scramble at tick 30,543 after the prior unfair bypass window; its longest stop is now 199.883333 seconds. At 600 seconds, 20 vehicles are active, 16 queued, 4 waiting and 1 committed; maximum active is 21. Three unsupported bus requests and a further route-wait request are not silently replaced. The longest current wait is 211.583333 seconds. Both observed retirement calls leave activeAfter=0. These are bounded service/lifecycle observations, not 24 successfully circulating vehicles, a throughput target, native appearance, full fleet support or 200-vehicle acceptance. The run contains no rendering and no actual walker execution. The request chronology grants vehicle 7 at tick 30,479. Vehicle 13 first requests at tick 23,307 but has no receiving space during that own-green window; at the next own-green it loses to the older vehicle 7. No further own-green occurs before the 600-second endpoint. This observed long queue is not another demonstrated unfair bypass or proof of indefinite starvation.

Evidence SHA-256: cpu-fair-flow.json `e1895bad845de321c3a3101a25273f0c5bceb6a1aa21b0cfc7ee929be16d9334`; cpu-fair-flow-probe.mjs `9bf594e696fc37c625646b7f6c728391969ad4a5f3a56c1fb9b6b6ceae4ca51a`; queue-age-green.txt `f628cb707cfbaf85e6473fd14c38219a05a840fcf9937f08f5b213d54f546b1b`; old-queue-age-red.txt `75a83e9ee1f464bfd68e9b8d363f98203418effcf667b573bf6ebb257c8c43b0`. Raw evidence remains under ignored primary artifacts/traffic1499.

## Pending integrated acceptance

Root must bind the final primary/main code bytes to these reviewed pins, or obtain focused review of any functional delta. Native ordinary-default evidence must still show visible stop/release, turn, actual boundary exit and the accepted walker through its real button, with basic real-input style continuity and required native views. The final five gates and independent native judgment remain separate. This source review does not relax the 01:55 UTC coherent-candidate/flow boundary or 02:25 UTC completion cutoff in 1506. A new material mechanism or missed cutoff parks this candidate under that decision. All35 implementation identities,14 final acceptance criteria and3,000/200/60fps requirement remain OPEN.

No task-owned browser, GUI, server or long-running process was launched by this reviewer, so there is no owned process tree to clean up. Only this authored review is retained.

## Reviewed raw path pins

| Path | Bytes | SHA-256 |
| --- | ---: | --- |
| src/agents/agents.ts | 7087 | 021f5fcbc175e9027066832c2e0f26a1a7a1ce181055ed31ea12fd4572f36366 |
| src/agents/local-walk-options.ts | 1252 | 90eb1acce5a77a9ecc37fe17032b4f03cee5e4e14a129f5227ac39c112aa7254 |
| src/agents/local-walk-prototype.ts | 8183 | 507caf6f6011a877c6fa2b63a4cabb415760faa335506996f0d5f1f176ef2c34 |
| src/agents/population/config.ts | 10998 | 3169a43a6058947b7c511ad2dfc0ba5059b651a7fbe6212f35ef8148be41ea0a |
| src/agents/population/graph.ts | 17003 | ad3a1d7536d42330b924f946692e0906b7edf172ecf0e6dc539354912346d36d |
| src/agents/population/local-walk-support.ts | 11807 | 9007fd137122dae6a210634505a8fba871360726122fc430ae4bbfb57605ebf5 |
| src/agents/population/routes.ts | 50973 | 85fc30b0961b60a8b22f5f66de1323a790a1bdd1f3aca83c4c041f4b97b1f6dc |
| src/agents/population/tick.ts | 123309 | ebe1f731c13421be1728a94e02553a90a88d73a967c76c850e4e89afc37e166a |
| src/agents/population/vehicle-clearance.ts | 10112 | 9007351213acb228386ac72bcc1ca49217dd8f48ebbc8519f95f55fb5f300973 |
| src/agents/render/agents.ts | 2149 | b4e122b6a27b648bd83901f78c9d286fc96662c84d90519581297b4e3b585977 |
| src/agents/render/assets.ts | 2905 | 31e23d4733daae833c0f7706b739bb661e2ea35dfc393b54eebd2656a78d36d5 |
| src/agents/render/vehicles.ts | 9922 | b63a80dfd0f4c2b5e8b5d2c6169f094c8bb56f2ed53fb7d264f8c3fd611499e8 |
| src/app.ts | 22815 | cd9dad57ab5a4857ab2db1c2a683b7c1ca19ac0431e6125e069a864cb581a2ac |
| src/main.ts | 4959 | 0751ac074daa4dc1c739bec9c808dc5609c93108ada526eca750a039b183407e |
| test/app-local-walk-lifecycle.test.ts | 8816 | f7bda5d5696f41497ae9201aaef2706eae605a8b8c9ac5504d1bb91272d96d81 |
| test/local-walk-native.test.ts | 5556 | 400103156fd8e9be82c263431df12dfb03cf560d1fcffcb108496f827533c8be |
| test/vehicle-clearance.test.ts | 13132 | c78e24f6b41bfd63974c183cc1a41f0a8b4f388043be7b0c6a52e7cbf0036b6e |
| test/ordinary-traffic.test.ts | 6353 | d656fd6e824fce7cbddbab0e79849ba966a4e8eb9b8b3d3bd95707076d2e21bb |
| test/ordinary-traffic-clearance.test.ts | 4145 | 1fddce748e2002c1ec2fbb414d3730841723620a49b6c56b889c3716bbd3f4b7 |
| test/fixtures/ordinary-traffic-clearance.json | 13123 | 109f7f551795381522e7805e13e109b3d0ca49f08da5c1aab96edd36377103a5 |
| src/network/admissions.ts | 36925 | fab7a459a65efa9df100496e696b7c328f1003fcef39a886df7a49782df4aee6 |
| test/vehicle-approach-departure.test.ts | 11126 | ccc2b3e4c4ee19850a2ab6e7cddd0d07e381a1f6d1ab678f6c110b9728672645 |
| test/admission-queue-age.test.ts | 4862 | 1da50efd2748c4ef0efa229c71de85415f061032908abad631d038aef219db92 |

# 1508 — Focused earned wait-age implementation review

Date: 2026-10-17. Independent reviewer: traffic1504_authority_review. Implementation owner: shibuya1498_visible_activity_feasibility. Integration owner: root. Reviewed held uncommitted codex/traffic1499 candidate3. Reviewer scope is source-read-only plus this authorized report; no code, test, index or cache write, replay, test execution, browser, server or GPU task was performed.

## Judgment and scope

PASS for the narrow existing-queue age-lifetime correction at the exact pins below. No material source finding. The patch implements the root-approved direction from [1507](1507_traffic-queue-lifetime-diagnosis.md): pause earned eligible age across temporary denial for exact continuous demand, rather than erase it or count blocked time as new priority. It leaves every existing grant predicate intact. The implementation owner was notified that the separately authorized final bounded flow may proceed.

This is not a city-flow, natural-fairness, full-population, capacity, native-motion or final candidate acceptance. The second failed flow remains failed evidence. Root's cutoff for candidate freeze/flow is01:55UTC; full native/gates/review/main push cutoff is02:25UTC. A new material mechanism or a missed cutoff parks the candidate. No additional simulation research or repair is authorized by this review.

## Source inspection

The patch changes only the existing wait record and its update order within admissions.resolve. It adds exact routeIdentity and generation to the already retained passage, occurrence and age. The equality check runs before either ready or not-ready behavior. A changed route, generation, passage or occurrence therefore loses old priority even when the replacement is currently ineligible. Actor identity remains the map key. Missing optional route identity and generation consistently use null and0 for legacy requests.

ready is exactly the existing entry-rule eligibility combined with the same existing signal-owner/group canEnter requirement. No request enters the candidate queue unless ready is true. Age becomes retained age for matching demand plus one fixed step only when ready, including the first eligible tick consistently. No wall clock, red elapsed time, receiving-space denial or failed mapped eligibility adds age. The priority buckets, priority order and final actor-ID tie breaker are unchanged.

Held commitments still take their existing control-update branch and do not enter the new-demand queue. Withdrawal still deletes unseen actor IDs after each resolve. Successful grant still deletes that actor's wait record. The queue remains bounded by currently requested actors; it does not create a separate timer, persistent store or cleanup resource. Expiry, approachDeparted, physical entered, mapped-control guards and tail release are unchanged from the1505 reviewed repair.

The rule applies to both request kinds, as the updated network contract states. Pedestrian yield eligibility, phase eligibility, occupied-holder exclusion, exclusive pedestrian batching and physical/control release remain unchanged. The patch does not activate generic pedestrians. This source argument and neighboring pedestrian cases do not establish a full crowd run or all possible demand patterns.

## Verification readback

I read the complete admission-queue-age.test.ts and inspected the actual source diff and updated contract paragraph. Its independently expected synthetic ordering uses a lexically later older actor and a lexically earlier younger actor, with a real production authority holding an occupied signal passage. The older request earns priority, experiences receiving-space denial and red, then must win after the holder actually releases. The case is repeated with reversed request-array order. It is distinct from tuning the actual vehicle7/13 IDs.

The old candidate2 authority produces two expected failures: a-younger is served instead of z-older in both request orders. Six other cases are explicitly skipped in that filtered old-code run. I read that retained log rather than treating its nonzero exit alone as a proof.

The corrected tests also check no age earned by wholly ineligible demand; no promotion into a higher priority bucket from red time; withdrawal reset; route-identity and generation reset while ineligible; and reset after successful service followed by cancellation of an unused grant. Literal outcomes are asserted through the production admission API. The existing comparator and phase/control rules are not mirrored into a second implementation oracle.

The inspected final log records60 tests across7 files PASS in8.40 seconds: traffic-halts12, vehicle-approach13, traffic-preentry-controls9, vehicle-approach-departure8, signals-reservations6, admission-queue-age8 and signals4. This includes the actual default tick6180 departure regression, now5.323 seconds, and existing pedestrian-yield/vehicle exclusion, mapped dwell, idle expiry, held-clearance and signal phase checks. I did not rerun the tests. The owner separately reported typecheck PASS; that command's raw output was not independently inspected in this review.

The new ordering tests establish this finite lifecycle class, not a bound on every actor's city-wide wait. In particular, preserving priority cannot remove the throughput limit of serialized whole compounds or guarantee receiving-space availability. Actual default600-second flow and native event evidence remain required.

## Exact pins

All digests are SHA-256 and were independently read while source was held.

- src/network/admissions.ts,36925bytes: fab7a459a65efa9df100496e696b7c328f1003fcef39a886df7a49782df4aee6.
- test/admission-queue-age.test.ts,4862bytes: 1da50efd2748c4ef0efa229c71de85415f061032908abad631d038aef219db92.
- artifacts/traffic1499/candidate3-freeze.json: 461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c.
- artifacts/traffic1499/old-queue-age-red.txt: 75a83e9ee1f464bfd68e9b8d363f98203418effcf667b573bf6ebb257c8c43b0.
- artifacts/traffic1499/queue-age-green.txt: f628cb707cfbaf85e6473fd14c38219a05a840fcf9937f08f5b213d54f546b1b.

The earlier clearance and approach-departure reviews retain only their named bounds. Root owns final integrated acceptance, cutoff enforcement, all public gates and merge/push. This reviewer created no task-owned running resources.

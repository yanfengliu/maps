# 1507 — Post-departure queue lifetime diagnosis

Date: 2026-10-17. Independent reviewer: traffic1504_authority_review. Implementation owner: shibuya1498_visible_activity_feasibility. Root requested a bounded source-read-only consumer audit and authorized this report only. No source/index/cache changes, replay, test, browser, server or GPU task was performed by this reviewer.

## Judgment

The inspected post-fix run does not show an omitted consumer of approachDeparted causing slot7's long halt. Its actual clearance holds belong to vehicles that enter, move and release. Slot7 holds no lease and is continuously requesting service. An inherited queue-age reset discards its earlier eligible waiting when temporary receiving-space or phase eligibility disappears. A later arrival then wins by actor-ID ordering. This supports one bounded change to the existing wait-record lifetime, subject to root approval and focused review; it does not justify changing grants, signal phases, collision clearance, routes, counts or seeds.

The observed291.8666666667299-second wait is material non-service over two own-green windows, not proof of infinite starvation or permanent deadlock. Keeping eligible age can correct this selection defect; it cannot establish natural throughput under one-vehicle-per-compound admission. The ordinary milestone remains unqualified. Reviews1503 and1505 retain only their original narrow geometry and lease bounds.

## Actual evidence

artifacts/traffic1499/cpu-departure-flow.json has SHA-2566ea8900f5ecbb12bad87900a0ec327d5127f974ddbd94915c2f87f98c8c3f73e, independently hashed. It records600seconds at1/60-second steps, requested24 vehicles, zero generic pedestrians and seed5970698. It has firstFault=null and thrown=null; no passed-uncleared refusal or authority violation is reported. It records164 geographic entries,169 releases,217 turns,2 retirements,20 active and16 queued vehicles. All24 captured before/after source/input records have identical digests. Its candidate2 freeze digest is551b9805d20b35bb133cb851ff7fd47e51b558419715f2e0f3dd9d82d5568ad2.

Slot7 generation1 stops from tick18489 through36000 at progress456.9462601215618, source occurrence51, position(-137.54579162597656,16.466358184814453,-30.49470329284668), with no commitment. I independently checked its61 request RLE spans: they cover every tick18490–36000 without a gap and contain no granted row. The demand is passage entry52, scramble:vehicle:1.

At cycle3 own-green ticks23011–23076, slot7 has receivingSpace=true and yieldSatisfied=true but granted=false. Vehicle10 has the same phase eligibility and receives the grant. Vehicle10's geographic entry is observed at23077 and its full release at24840. The actual clearance-held interval ends with that release and the controller proceeds to group2. This is a live finite passage, not a stale departed lease.

At cycle4 own-green ticks30479–30545, slot7 again has receivingSpace=true and yieldSatisfied=true but granted=false. Vehicle13 receives the grant, geographically enters at30546 and releases at32234. The controller again advances from the held clearance. At the600-second endpoint the only live commitment is vehicle23 at a different junction; scramble is in its pedestrian phase with clearanceHeld=false.

Vehicle7 first requests scramble at18490. Vehicle10 first requests at13161, so its first service is consistent with older demand. Vehicle13 first requests at23307, after vehicle7, with receivingSpace=false through cycle3 own-green ending23970. Vehicle13 nevertheless wins the next green at30479. Slot7's receivingSpace becomes false at23471 while cycle3 own green is still active. Thus a change preserving priority only across red would still erase this exact wait at23471.

## Consumer audit and causal source

The reviewed authority is src/network/admissions.ts SHA-256de59bdaf280cf2854aa7602cd1c9915a8b479b62c8c8734fedcfeb55bff7a7d7. The population tick is SHA-256ebe1f731c13421be1728a94e02553a90a88d73a967c76c850e4e89afc37e166a. These match the run's captured pins.

I searched all production entered/occupied consumers and reread request assembly, resolve, integration, observation, cancellation and retirement paths. Held requests preserve the exact lease name, supply receivingSpace=true for that retained passage and keep the admission halt covered. Integration reads a fresh authority halt view rather than treating a denied new request as lease removal. Before physical entry, requestOccurrenceFor deliberately continues naming the original entry occurrence. Expiry, occupied and cancelPending all honor private departure. Physical/source entered remains necessary for the original release and boundary lifecycle. The pedestrian-only retirement use of entered is unaffected. No additional normal-flow mismatch was found within this source audit; exceptional retirement paths and all possible network routes are not proven by it.

At admissions.ts:112, either !eligible or a nonmatching signal phase deletes the actor's wait record. At113 the next eligible request starts age0 unless the same passage/index record survived. At117, equal age/priority ties end in actorId.localeCompare. At118–119, one vehicle is admitted for the whole compound and its wait record is deleted on grant. Therefore all waiting actors can return to age0 together each green, and the younger vehicle:13 sorts before vehicle:7. The already-earned priority is also lost on transient receiving-space denial. This logic predates the approachDeparted repair.

The existing signal/reservation fairness test covers continuously eligible lower-priority demand against fresh priority requests. It does not interrupt eligibility with a signal cycle or a receiving-space denial, so it does not check persistence of earned age across these interruptions.

## Smallest proposed contract

Retain already-earned eligible age while the same continuous actor request remains bound to the exact route identity, generation, passage and occurrence, even when its current phase, receiving space or mapped eligibility temporarily forbids a grant. Advance age only on currently fully eligible requests during their permitted signal phase. Keep every grant predicate unchanged. Clear age on service, request withdrawal or target/generation change. Legacy requests without route identity need their existing explicit null/default identity treatment. This is a change to one existing wait record, not a new scheduler or permission mechanism.

Do not turn red or blocked time into newly accrued eligible age. The contract says ineligible requests do not accumulate age; pausing previously earned age preserves that rule. A red-only retention change is insufficient because the actual slot7 record is already deleted by receivingSpace=false before green ends. No source implementation is approved by this report itself.

Required regression before adoption: retain an older request's earned priority through receiving-space denial and red, then present a younger lexically earlier actor on the next green and require the older eligible demand to win. Exercise the actual production authority, preserve no-grant-on-red and occupied-holder exclusion, and make the old deletion RED. Separately check that ineligible time adds no age, withdrawn/replaced/generation-changed demand loses priority, served demand clears, request order stays deterministic, and existing stop/yield/clearance tests remain unchanged. Replay the fixed ordinary case only after root's milestone reassessment and independent patch review.

Full600-second flow, native stop/release/turn/boundary/occupied-walker evidence, final public gates and integration remain separate obligations. This report neither weakens those obligations nor concludes that the current conservative compound policy can meet the full population/performance target.

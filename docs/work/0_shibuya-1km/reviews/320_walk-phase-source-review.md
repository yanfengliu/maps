# 320 — independent source review of walking phase 317

ACCEPT for the bounded source change and subsequent primary integration/native evaluation. No material source finding. This is not native gait, continuous-motion, population or final integrated-gate acceptance.

I reviewed the frozen three-file patch, candidate snapshots and retained actual receipts against primary 303, the 311 contract and the 313/314 diagnosis. I did not author 317. This review launched no tests, builds, browser, server or GPU process and changed no product, data or previous artifact. I verified 47 bound descriptors without mismatch, the 26-file candidate union has exactly two changed production files plus one new test, and all 25 primary 303 source records still match their predecessor pins.

## Mechanism and transitions

The controller adds only `walkPhase` and `walkPhaseFlight`. Walk-source sampling follows the accepted foot flight's side and times; the old clock remains for idle sampling and the existing blend. A stopped actor starts at neutral phase .75 with blend zero. The first left flight reaches phase 1, the right landing reaches the next half-cycle, and the unwrapped value prevents modulo interpolation reversals. Source clip bytes, amplitude and rig transforms are unchanged.

The retained trace confirms the short first flight: departure at 0.2333333333 s, physical end 0.4042458333 s, phase .75 at departure, .9937894634 at the 0.4 s fixed sample and 1 at 0.4166666667 s. The closed flight record remains present, but its clamped endpoint holds until a different side/start identifies a new flight; it does not continue accumulating an independent clock. Turn flights created after the normal update are first observed on the next tick, starting from the preserved phase. Admission operates on a draft, so rejected proposals do not commit phase changes. Resumption removes turn bookkeeping without resetting phase. The trace reaches phase 10 at the first turn completion (6.2333333333 s) and holds it at movement resumption (6.25 s); the later starts likewise preserve their endpoint values.

`sampleFeet` linearly interpolates only the new unwrapped phase alongside the unchanged blend/drop/foot sampling. The frozen tests measure actual endpoint hand poses on both sides of every fixed interval, not merely numeric phase continuity. Maximum phase increment is .048757893 cycle; maximum hand movement is 37.463622 mm per fixed step; one-sided endpoint residual is 3.780953501e-8 m. These establish bounded pose continuity, not derivative smoothness or natural motion. The stopped blend and idle clock are byte-unchanged.

## Evidence and test independence

The baseline script checks the pre-edit 303 union before recording the full `{root,gait}` digest. The new test removes only the two newly added phase fields before comparing all 1,320 records through 22 seconds to `febdf9a2bfc7902a7a43fb89e92bfae7e29b45c52a1a215245d77e72c9a13d59`. It does not omit feet, events, admission/turn history, original source phase/blend, root travel or timing. This supports retaining the exact 303 foot/event schedule for 319; it adds no corner or clock allowance.

The regression measures actual source joints and weighted mesh vertices in five windows, including first-leg end, turn resumption and the held-out 20–21.6 s window. Candidate joint/mesh correlations range from approximately −.99329 to −.99873. The old-clock control substitutes the original walk-source phase on the same actual physical trace and genuinely fails: +.489557676 versus <−.95 in the first window. This is an independent behavioral counterexample, not a check derived from the new phase formula. The two other tests were deliberately filtered in that red run. Original hand excursion remains approximately 244.655 mm.

The unchanged support test evaluates the changed scene poses at all three LODs, including actual full-body vertices at event samples and interval midpoints, against the retained corridor and conservative obstacle boxes. Its 1,195 ticks end at 19.916667 s; it is separate from the 22 s phase/history trace. It records 4,827,322 body and 4,308,582 shoe samples, minimum shoe height −1.854293 mm, maximum planted-minimum height 12.319742 mm and drift .240243 mm, inside unchanged bounds. This is not continuous swept-body or multi-actor qualification.

Actual retained receipts report 79/79 focused cases across 11 files, types exit 0 and one opt-in build exit 0 on Node 24.12.0. The build's existing large-chunk warning is retained. I inspected these receipts and their test/runner code; I did not rerun them. The worktree build used an API output override into walking317/dist. The old shared output and primary sources remain 303. Primary integration must still produce the actual config-default build and bind it before capture. Native judgment in both styles and the held-out profile view remains pending; the source's absent torso/ankle motion is unchanged. Encoded clips retain the 313 phase-label limitation.

## Exact review pins

All paths below are under C:/Users/38909/.codex/worktrees/walking-scene/maps/artifacts/walking317-20260928 unless stated otherwise. SHA-256:

| Input | SHA-256 |
| --- | --- |
| manifest.json | ef5a8f676fc7b390db68f535204f39437772b527ff46fb7cb798e6d04cba8a1b |
| REPORT.md | 2a17bb42b0131343ed625fc0f9b46d0c64b44abaa92db05c6b56e90ecff1eded |
| candidate.patch | 47533c1e62c683bed013040505207a356776798e3b0535477d8637a3626751df |
| candidate/src/agents/population/local-ordered/controller.mjs | 3e2117108c98821a8f846a02c3b82964d0b5358f24cc9756fff3d7cc6a1d0ce9 |
| candidate/src/agents/population/local-walk-gait.ts | 23219df38c04475cec620b62e422f1a18989a47205d60cc742bf2b443107d223 |
| candidate/test/local-walk-phase.test.ts | bf2848a145fbf5b83533c03b5f21a69f3b6878b36f549b151311e83df741500b |
| baseline-physical.json | b90419458c758b1b733b1456d6c7190715a7f0ee251da6354127802546083a96 |
| phase.json | 0f1ea5a573ec8f714fda0822187368c94399015b34c3a7f36eccab85b1bc85be |
| finite-gait.json | 0f55a834162c5a7ee6ea0606de0af04d04b8d1ee3feb45714376da5ce9eca968 |
| red-tests.json | 4eece94424bc6f8c4b843ceb39bbedf3e25331a2ed44c82c092f070078483565 |

The manifest binds the remaining focused/type/build/config/cleanup receipts. No review-owned process or temporary resource was created; only this intentionally retained report was written.

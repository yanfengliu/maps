# Review 2: implementation

Final round, covering the repairs made for [round 1](1_implementation.md) and the coherence of the committed tree.

## Target

Repository `maps`, commit `9426fb0` on `codex/medieval-city-20261027`, pushed to `origin`. Unlike the earlier rounds this one reviewed a committed revision, so its line citations resolve and the round is re-groundable. The reviewer confirmed the tree was clean at that commit.

## Reviewers and coverage

The same independent reviewer, resumed a second time, with the same weakness recorded in round 1: continuity makes it weaker evidence than round 0 for anything round 0 missed entirely. Read-only, no engine and no Blender. It was free to run the fast Python gates this time, and did: `test_layout.py` passed 16 of 16 on the committed tree, and the layout digest it printed matched the digest pinned in round 0, independently confirming that record's input.

## Reports

### Independent reviewer

All six repairs hold and none introduced anything new, which was the specific risk after N1 appeared inside the repair for F2.

N1's fix is tight: the sample count increments, the first sample is taken unconditionally so the step is always named, the zero-count failure is ordered before the distance check, and the harness mirrors that order. The reviewer checked the count arithmetically rather than accepting it as plausible — the city run has 42 steps and 16 placements, and placements are the only exclusion, so 26 is exactly right.

N3 names all five commands in order, and the drop to `Warning` is correct for the stated reason: the module loads during the import step itself, before the level can exist.

The rebuild record is enforced in code rather than by convention, through a filename suffix, so neither record can overwrite the other. The reviewer counted the ten compile actions and the link steps in the rebuild log itself.

The comment it had asked to be fixed rather than the code was fixed properly — stale read rather than lag, a passing sample exactly zero because the two quantities are one value copied, and the tolerance named as unused slack — which the reviewer said was the repair it most expected to be fudged.

The three untidy items are cleared with the right reasoning, including a comment explaining why an explicit flag beats a zero test: a layout may legitimately put the player start at the town centre, which is the origin. The unasked `rmtree` repair is correct and complete.

**The one real finding: `design.md` was stale.** Everything else had been updated and the contract document had not. Its probe sequence predated the direction runs and the gate passage; its failure list omitted the per-key direction assertion, the rendered-view checks, the sprint ratio, the approach floor and the gate margin, and still used the old "when the camera does not change between modes" formulation that the F2 repair exists to replace; its wall paragraph still called the approach unmeasured, contradicting F7; and three of its six Gates rows understated their own gate, including a Probe row that still omitted `--mode city`. The reviewer's reason for holding on it rather than treating it as pedantry: design.md declares itself the fixed interface between workers and is cited in code as the source of truth, and the Gates table is where the fleet's bound statements are collected, so someone reconciling code against contract would have concluded the code had diverged when it was the contract that was behind.

Two cosmetic items: two walk figures in the plan's Outcome drifted from the evidence they cite, as did one margin in round 0's disposition table; and round 1 linked to this document before it existed.

Otherwise the commit is coherent. The README's five commands, the startup message's five and the plan's sequence agree; criterion 5 names what the code does; both review records carry the corrections asked for. Rule spot checks passed: the largest tracked file is 67,799 bytes, nothing binary was added, no generated or ignored directory entered the commit, and the devlog line, the lessons entry and both review rounds are present.

Verdict: the repair round is clean, with no open material finding in the code.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| D1 | `design.md` describes the probe before the direction runs, the gate passage and the measured approach, and three Gates rows understate their bound | Accepted. It is the document the next reader checks the code against, and it declares itself the fixed interface | Verification section and Gates table rewritten against the committed behaviour, including the rendered-view checks, the sample count, the per-key direction bounds, the 25 cm approach floor, the gate margin, the 20 m clear-run figure and the rebuild distinction |
| D2 | Two walk figures in the plan's Outcome and one gate margin in round 0 drifted from the cited evidence | Accepted. Immaterial to any threshold, but the rest of the record is sourced exactly | Corrected to 870.9, 871.7 and 771.3 cm |
| D3 | Round 1 linked to this document before it existed | Accepted | This document |

## Verification

The three findings are documentation corrections, made by the integration owner and landed in the commit following `9426fb0`. They change no code, so no gate was invalidated and nothing was re-run.

The acceptance evidence for the code stands as recorded in [plan.md](../plan.md): thirteen of thirteen steps green on the integrated revision, the probe passing with no failures, and the captures inspected at native resolution bound to their digests.

With this round closed there is no open material finding. The known limits carried forward deliberately, rather than repaired, are listed in the plan's Outcome.

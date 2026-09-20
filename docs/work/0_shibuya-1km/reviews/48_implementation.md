# Review 48: implementation

## Target

Independent F26 source-hold re-review of maps at base `e55f1c76dae791563b64e3e3c7a5db9b1c9f5231`. Author: `walking_contract_review`, isolated `artifacts/walking-path-v2`. Review workspace: `artifacts/walking-hold-review/wt`. Root owns disposition and integration. The author freeze is `artifacts/walking-path-v2/artifacts/repair-evidence/freeze.json`, SHA-256 `51b30d2c0fd81215eb3f7750d66fa3c33d35d331237a333bea83f753ceba7061`.

The exact authored handoff is retained in [48_walking-source-hold.md](../snapshots/48_walking-source-hold.md), SHA-256 `dab9d2657bf24fc032e20fd27ebd2b45e21f6856699432bf26a01d385810b56f`. Its launcher and planned gait sections are context only. This round does not review those implementations. The preserved complete four-file patch is `artifacts/review48/candidate.patch`, SHA-256 `7487f1898fe11550d303f11ed32801bd7ba6419e3c394485cc1f5ba18881d138`; byte-exact copies also live under `artifacts/review48/target/`.

| Accepted pure candidate path | SHA-256 |
| --- | --- |
| `src/agents/population/walking-path.ts` | `fe8f579dde019abffb949abeaa2ea214abb4de1f7f0cf5958ac3f6cd916cafa0` |
| `src/agents/population/walking-surfaces.ts` | `9c0274aa6cf2ec0f2362b30f9c1d486531937527e725448d1da9a35198259674` |
| `src/agents/population/walking-corridor.ts` | `18d119d735c64373a6ce8598a6d81b57f9ac572dacf3a043b8f5b3d5f626922a` |
| `test/walking-path.test.ts` | `8acdf6aab744cd6f853dcd68f754d4c44a5eff126dc0c5e138ab5602a306271b` |

## Reviewers and coverage

Codex `motion_review` authored none of the walking candidate or F26 repair. I read the exact source delta, retained Review40 contract, Review46 counterexample, authored handoff, and focused tests; I exercised the actual pure APIs in my own tree. All 27 author freeze entries were verified before copying and again afterward. The two surface/corridor files are unchanged from Review46. No additional CLI reviewer was invoked or counted.

The existing shipped population instruments exercise the integrated fixed-step path; this candidate is unwired. The new probe therefore names and invokes the frozen `buildWalkingPath` and `advanceWalking` directly with explicit analytic support. This review covers finite physical arc, source hold, rectangle authority and geometric turn interactions. It grants no current-surface/source-policy, locomotion, city or appearance acceptance.

## Reports

### Codex motion_review

**Accept the bounded F26 repair.** The new helper chooses the lower inverse of the monotone source mapping. Equality selects the first physical point of a source plateau. The advancer applies that limit before a queued turn and clips translation to it. A newly supplied hold behind the current physical pose stops progress without rewinding. The physical rectangle sweep still independently limits any permitted translation or rotation.

The original two-occurrence counterexample now stops at physical station 2 m, X=0/Z=2, before traversing or turning into the one-metre lateral connector. It consumes exactly 2 s at 1 m/s and zero turn time. Removing the hold preserves all 3 m of remaining path; the geometric turns consume a separate 1 s. The rejected source instead spends the connector while source station remains 2.

The independent oracle uses three straight two-metre source occurrences with offsets 0, 1 and -0.5 m. The two connectors have independently known lengths 1 and 1.5 m. Flat and 0.25-slope support give each source leg length `2 * hypot(1, slope)`. Eleven finite holds and five start positions on each surface cover 110 combinations: before/on/inside/past plateaus, fractional positive-source intervals, below-start holds, terminal equality and beyond-terminal holds. The expected geometry is calculated from those analytic lengths, not from the implementation's inverse helper. Repeated holding preserves the pose.

Explicit controls also stop at an earlier rectangle contact at physical 1.4 m, stop at source 2 before a connector disk, and stop at that disk at physical 2.4 m after source release. A reached source hold freezes a queued reversal and a reversal already in progress. With a later source hold, the rectangle's intermediate-yaw collision still stops the turn. These are geometric authority observations; a frozen or resumed turn is not a foot-motion acceptance claim.

No remaining material F26 issue was reproduced. The repair changes only the path hold logic and its tests relative to the prior pure candidate. The unchanged constructor and surface policy retain their earlier limits. No production caller imports these new modules; `productionReady: false` remains explicit.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F26 | Source station 2 allowed the one-metre constant-source connector before holding. | Reproduced on exact rejected bytes; repaired in the reviewed target. Recommend scoped acceptance. | Earliest physical preimage, no-rewind holds, repeated hold and release controls pass. Root retains final disposition. |
| F27 | Same-foot plant/redeparture could be labelled advance with a mixed flight proposal. | Outside this repair and still open here. | A separately frozen gait successor needs its own review. |

## Verification

- Frozen candidate: 24/24 focused tests pass; TypeScript `--noEmit` passes. After the old-source control, the exact v2 source was restored in `finally` and 24/24 tests passed again.
- Exact Review46 source `521e1b0988c39551041b6009aaa2632fdc844c2616b29dd64a79b45b259ce832` fails four of the same 24 tests. The failures are actual station/release errors, not runner startup failures.
- `artifacts/review48/independent-hold.ts` records 451 assertions across the 110 matrix combinations and explicit interaction controls. V2 passes all 451; exact v1 fails 104 assertions. Those are failed checks, not 104 distinct defects. Both complete result files are retained.
- Postchecks confirm all 27 author entries, four reviewer source copies and the authored snapshot unchanged. Original Review46 remains SHA-256 `a131349800e63f7a2878b0afb3ef95a270077614862cf45e1495e650d2d1360e`.
- Fleet work-docs checking still refuses inherited `docs/work/0_shibuya-1km/handoff.md` outside its allowed structure. This round uses the six required headings; it does not claim the repository-wide document gate passed.
- No full gate, install, shared data writer, HTTP request, browser, GPU or visual inspection ran. Commands exited; no task-owned server or GUI was launched. Raw target/control evidence and the unmerged review worktree remain intentionally retained for handoff.

## Round outcome

F26 passes independent re-review within the pure source-hold and geometric authority contract. No new material finding. Integration remains the root's responsibility. This does not supersede Review46's F27 rejection, its unavailable 0/36 visual result, or the source, sole-contact, step, walking-resumption, naturalness and performance limits. Later source or gait work cannot inherit acceptance from this round.

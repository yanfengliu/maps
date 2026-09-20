# Pedestrian terminal component v2 — F22 repair

Owner: lease_retirement. Base remains `244632ca8d88dc464a162fad3782baa91f59f136`, in `artifacts/lease-retirement`, branch `codex/lease-retirement`. No commit, primary write or integration is claimed. The original `candidate.patch`, `freeze.json`, `REPORT.md` and the independent Review 39 remain unchanged. Review 39 SHA-256 was verified as `27d883dd15452fcad0b9e9bc11cae88226bf64ea886c6986ce992f94cc450298`; its F22 finding is accepted.

## Exact change from the rejected target

The current request's viable predicate is applied to every retained central-prefix edge, including the entry, before passage assembly. A forbidden prefix returns an explicit refusal naming the edge and the current constraint. Tail search filters every appended successor and selects the shortest allowed continuation; if none fits the existing budgets, it refuses rather than returning the forbidden tail. A direct call to the tail helper also validates the entire prefix before its already-clear fast path.

Any constrained request bypasses the assembled-fit cache. This is necessary even for the same radius and same function object, since that function's allowed set can change between calls. Constrained results remain uncached as before. A fresh constrained route choice is also excluded from the unconstrained prefix cache, so a later unconstrained actor retains its ordinary seeded choice. Existing live route/passages are untouched. Neither RNG draws nor route budgets, body radii, source topology, authority, solver or terminal geometry changes for the ordinary unconstrained path.

Only `routes.ts`, `pedestrian-terminal.ts` and the test changed behavior from v1. `tick.ts` remains byte-exact at `60b37eb84da5366babebfa377ab91c301967e9627a0c134000600fb129734057`. Documentation records the rejected assumption and its gate; it does not rewrite the old review.

## Verification

Eight new real-planner viability cases were run against the exact rejected source saved at `v1-source/routes.ts` and `v1-source/pedestrian-terminal.ts`. All eight fail for the defect. The cases cover a cached forbidden prefix at identical and different radius, a forbidden shortest tail with an allowed longer alternative in fresh and cached calls, the same callback with changing state, every edge in an already-clear supplied prefix, no allowed continuation, and a constrained first choice followed by an unconstrained request. No planner result, passage or lease is mocked in these cases.

`f22-red-control.ps1` uses a finally path to restore the repaired files; `f22-red-control.json` records exit 1 and `f22-old-red.log` contains the semantic failures. After restoration, `focused-green-v2.log` reports **32 passing tests** across pedestrian terminal, population lifecycle, tick order and network boundaries. `typecheck-v2.log` reports exit zero. `git diff --check` passes. The prior RNG/prefix/cache bounds and actual RenderLoop cases still pass.

No city, GPU, browser, server, data writer, dependency install or full gate was run for this repair. The 150/0/45000/5970698 result in REPORT.md remains evidence for the previous exact target, not a fresh v2 measurement. Its ordinary pedestrian caller supplies no viable callback: the new tests and source diff establish that undefined predicates retain the prior cache choice, prefix choice, tail search and error text, while the entire tick remains identical. The root/reviewer decides whether to transfer that bounded run; no broader performance or population acceptance is implied.

## Frozen handoff

`candidate-v2.patch` contains the complete revised component against the original base. `freeze-v2.json` records all eight file hashes and the patch hash. The original patch/freeze/report hashes are checked and recorded there too. Independent re-review is reserved as Review 41; Review 39 remains rejected. The separate pedestrian AOI egress gap and the four disclosed over-budget exit fallbacks remain as reported in v1. The own worktree and its read-only data/dependency junctions remain intentionally for review and integration. All command sessions have exited.

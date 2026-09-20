# Review 39 — pedestrian terminal clearance component

Reviewer: route_continuity, independent of the lease_retirement author. Scope: read-only review of the frozen terminal-clearance candidate. This review does not approve the reviewer's separate walking-path/support prototype. Integration owner: root. Verdict: **reject pending F22**, a reproduced caller-constraint bypass in the new central prefix and tail paths.

## Exact target

Author base: `244632ca8d88dc464a162fad3782baa91f59f136`. Candidate patch: `artifacts/lease-retirement/artifacts/lease-evidence/candidate.patch`, SHA-256 `421a434a0d5babb7e5cd5fba1229f71449b9b8c943bb6c27c91de2905cfcc6c7`. The author's eight-file `freeze.json` and `REPORT.md` (`45183783760b96ac7f348fbc3caa9e76cba94a1b441e266065aabb13fe8dc28a`) identify the reviewed bytes. All eight files were copied byte-exact into `artifacts/lease-review/wt`, based on main `27c7186`, and all eight hashes still matched after review and the attempted external CLI. The older frozen documentation snapshots were reviewed as that target; their replacement of newer main prose in this disposable review tree is not an integration recommendation.

Production targets: `routes.ts` SHA-256 `a06fa9c446321fd26ced29398d9ef1ae23982f92117c96f8eaf873a4f85e339a`, `tick.ts` `60b37eb84da5366babebfa377ab91c301967e9627a0c134000600fb129734057`, and `pedestrian-terminal.ts` `36cecf040a499fcadcf7fe1659338794ea37969f3bcd3e7e4a5ca94a4758fe31`. The new terminal test is `6033b7069ce63548fceaa688ad6c71fb53d4746fe1dc8ca9632b61918347879b`. No candidate code was changed during this review.

## F22 — current viability constraints are bypassed by central prefix reuse and terminal extension (P2)

`RouteLibrary.route` at `src/agents/population/routes.ts:306-309` sends a stored central prefix directly to `assembleCentre`. That path never checks the new request's `viable` callback. `assembleCentre` at line 410 also calls `clearPedestrianTerminal` without the callback, and `src/agents/population/pedestrian-terminal.ts:63-69` traverses and returns successors without applying it. Consequently a body can receive an edge its current caller explicitly disallowed, even though ordinary `descend` filters those edges.

The independent real-planner fixture has `approach -> authored diagonal -> inside -> clear`. A first radius-0.1 request stores that prefix. A later radius-0.25 request with `viable(id) = id !== "inside"` returns all four edges, including forbidden `inside`. A fresh library given that constraint returns only `approach`, so it respects the rejection and demonstrates that the cached-prefix path changed the answer. A separate fresh request with `viable(id) = id !== "clear"` still appends `clear` as its terminal tail. This second case does not depend on cache reuse.

Reproduce with `node artifacts/lease-review/independent.ts` from the review worktree. It writes `independent.json` and exits 1 with a named F22 diagnostic. It uses the real planner, graph and passage builder. No candidate function was mocked. `independent.log` preserves the exact result. The ordinary 150-body caller currently supplies no viability callback, so this is a bounded API defect rather than a claim that the author's moderate run used a forbidden edge. It matters to the component's promised preservation of route constraints.

Required repair: apply the current request's allowed-edge constraint to the retained prefix and every appended successor, and ensure constrained requests cannot silently reuse a fit from a different constraint. A rejected prefix may produce an explicit refusal; it must not be traversed to preserve a cache hit. Add regression coverage for both a changed constrained prefix and a forbidden shortest tail with an allowed alternative. Keep the selected unconstrained prefix, RNG behavior and existing budgets within their approved bounds. Root accepted F22 as material; the author, not this reviewer, owns the repair. A separate review round must assess the changed target.

## Verified behavior and limits

The requested four focused files pass independently: 24 tests in `pedestrian-terminal`, `population-lifecycle`, `population-tick-order` and `network-boundaries`. The first sandbox attempt failed during esbuild configuration startup, before test collection; it is not a product failure. The subsequent permitted run passed all 24. `artifacts/lease-review/focused.log` records the successful run.

An independent exhaustive enumerator compares 80 deterministic finite directed graphs against the tail search, up to six sections and a three-metre total budget. Clear endpoints are independently classified by their known position outside a radius-two disk. There are zero shortest-cost/refusal mismatches after the instrument's geometry correction below. This checks the length/depth search on that finite population; it does not prove every complete tail passes the route passage factory.

A separate endpoint-envelope check evaluates 1,440 corners across six headings, four corridor widths, three pedestrian radii and five offset fractions including both endpoints, at world coordinates around ±500 m. All float32-published square corners lie inside the planning rectangle. This supports the conservative endpoint envelope and its rounding allowance within that bound. It does not justify shrinking the runtime body or future changes to terminal path geometry.

Reading the actual integration confirms that it places the final pose before observing and retiring, constructs authority footprints from the current published position/yaw with the slot's actual scale, and retains an occupied terminal's body, route, generation and entered lease. The focused tick test verifies current-pose observations and two completed generations; the unsafe-terminal test verifies continued RenderLoop frames while the body and lease remain. No authority cancellation or passage replacement was found in that path. Live actors keep their plan/passages when another body's fit replaces a cache entry.

The author's moderate run is scoped evidence, not independently rerun here: 150 pedestrians, zero vehicles, 45,000 ticks, seed 5970698; 27 physically clear retirements and generation reuses, final active 150, and zero authority violations. It does not resolve crowd stalls. The four 995.1548899314295 m central prefixes need the 6.313157353948492 m clear tail and therefore exceed the unchanged 1,000 m budget. Their explicit exit fallback and initial diagonal count changing from 69 to 65 are disclosed and consistent with preserving that budget. The review does not call the routing mix unchanged.

Pedestrian AOI egress remains separate unfinished work. The component's guard retains bodies it cannot retire; it does not implement their boundary binding, supported outward trajectory or atomic boundary retirement. No broad population, support, natural-motion or performance acceptance follows from this component review.

## Instrument correction

The first independent shortest-path fixture declared 0.1–0.8 m edge lengths but drew a ten-metre geometric segment to its clear endpoint. The real sampler correctly stopped near its declared short length, so the test wrongly expected a distant clear endpoint and reported 42 mismatches. The reviewer caught the inconsistent instrument before filing any product finding. Corrected segments have geometric lengths equal to their declared costs and all 80 cases agree. `independent-invalid-geometry.ts` and `.json` preserve the erroneous control; `independent.ts` and `.json` preserve the corrected probe and F22. The 42 initial mismatches are not defects in this candidate.

## External reviewer and resources

The multi-CLI skill and current fleet runbook were read. Claude Code 2.1.263 was attempted with configured model defaults and read-only tools. It exited before reviewing code because its OAuth session had expired and could not be refreshed. This is an abstention, not approval. Authentication, models and installation were not changed. Raw output is ignored under `tmp/review-runs/lease39/claude.txt` in the review worktree; no private authentication material was copied into this report.

No GPU, browser, server, full gate, 3,000-body run, dependency installation or data writer was used. The reviewed source hashes were checked after the CLI attempt and remain unchanged. The review worktree and read-only data/dependency junctions remain intentionally for root handoff; no commit, merge, or main modification is claimed. Review 39 stays attached to this rejected target even after a later repair.

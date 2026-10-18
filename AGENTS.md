# AGENTS.md — maps

## What this is

Turn real-world 3D map data into simulated worlds: take what public map sources already hold about a place — ground, buildings, roads, land cover — and build a scene you can move through rather than only look at.

The first deliverable is a model of roughly 1km by 1km of Shibuya, Tokyo, leaning photoreal, with pedestrians and vehicles moving through it. Its plan and reviews live in `docs/work/0_shibuya-1km/`.

Non-goals: not a map viewer, not a navigation or routing product, not a survey-grade reconstruction of the real place. Nothing past the Shibuya deliverable is decided — a second location, a product surface, or a shipping target is out of scope until the owner says otherwise.

Stack: Vite, three.js and TypeScript on Node 24, with `3d-tiles-renderer` for the building tileset. Chosen in Phase 0 and recorded in `docs/work/0_shibuya-1km/plan.md`; the repo rules carry the details.

The repo's own rules: [docs/policies/local-rules.md](docs/policies/local-rules.md).

<!-- FLEET-CANON:BEGIN sha=d6dedc493bdd generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Reasons and evidence per `[Rn]`: `../fleet/docs/canon-rationale.md`.

### Fleet Orchestration Policy

Deliver the requested outcome with verified correctness, coherent architecture and minimal necessary complexity. Optimize useful progress, not agent count, code volume or maximum reasoning. Adapt rigor to risk. This policy grants no new permissions or capabilities. [R1]

**Roles.** Only an explicitly designated agent coordinates; each scope has one accountable integration owner. The coordinator owns planning, dependencies, shared interfaces, architectural consistency, integration and acceptance. It reads only what assignments, acceptance or its own trivial change need, accepts or rejects inspected handoffs, and delegates all but trivial changes that cost more to delegate (owner directive, 2026-09-23, superseding 2026-09-05). Trivial means at most about 20 changed lines of docs, config or an integration fix, no R10 high-risk change, product logic, migration, security or trust-boundary code; the same gates, review and worktree rules apply. [R2]

Workers own bounded outcomes and local implementation decisions. Each worker, reviewers included, chooses and dispatches its subagents within budget: none for a small task, while remaining accountable for their work (owner directive, 2026-09-23). Threads follow deliverables, not permanent departments; no recursive manager hierarchies. [R3]

**Plan and delegate.** Inspect instructions, code, docs, tree state and active tasks; set outcome, non-goals, acceptance criteria, dependencies and verification; settle ambiguity with evidence and reversible defaults. Use the simplest delegation: subagents for bounded investigation, independent judgment or localized changes, separate threads for substantial independent changes. Agree shared contracts before parallel work; no duplicate or blocked work. Assignments name owner, outcome, context, dependencies, contracts, base revision, workspace, scope and exclusions, verification, resource limits, handoff, and read-only or implementation. Change model and reasoning defaults only through supported controls, on evidence. [R4]

Size the team continuously (owner directive, 2026-09-15): widen when one worker holds the critical path and independent work waits; narrow when workers contend for files, ports or CPU. Account for shared services, databases, ports and compute: serialize same-file edits in one tree, duplicate gates and unshareable resources. Run one expensive gate at a time; choose other work around it. [R5]

**Session size** (owner directives, 2026-09-23 and 2026-10-18). One task per session; new requests get separate assignments. After ten human/agent turns on an orchestration thread, stop assigning new scope and let active subagents finish; never interrupt them for rollover. One turn is a human message and agent response, excluding tools, commentary and subagent messages. Integrate and verify completed increments and clean up under R7. If authorized work remains, start a successor with an R8 handoff note; confirm it received the note and reconciled goal state and todos before archiving the old session. Otherwise archive the completed session and stop under R11. If worker completion, handoff or cleanup is blocked, record ownership and state and keep the old session open until safe. Split tasks expected to exceed about 200k context tokens into milestones within that budget, each committed and merged to main once green; the next may start fresh from main. Milestones are task boundaries; harness compaction never justifies wrapping up or handing off. No unattended "don't stop until done" loop without milestone commits. Mechanical subagents use lower effort or a smaller model; reviews and their subagents keep the review runbook's pins. Per-item model calls are one-shot, never full agent sessions. [R6]

**Coordinate safely.** Use available capabilities; assume no visibility into other chats, shared memory, automatic messaging, workspace isolation or persistent monitoring. If spawning is unavailable, work directly or hand off explicitly. Beyond a trivial read, each session or agent defaults to its own worktree to isolate concurrent edits. Serialize overlapping writes only when no worktree is available, and say why. Finish each bounded increment in its session before R6 rollover: merge to main, push, then `git worktree remove`. Remove completed task-owned branches and unneeded temporary files; explicitly transfer ownership and locations of still-needed resources. Report any merged worktree left and its location as a defect. Never overwrite or discard another participant's work. Track delegation to completion, cancellation or handoff; release only owned resources without losing work. On resumption, first inspect surviving worktrees, artifacts and task status; recover what exists and preserve unfinished work, assuming no worktree, transcript or shared memory survived until checked. [R7]

**Preserve state and decision boundaries.** Store owners, dependencies, revisions, status, blockers and consequential decisions in the repo or tracker; reuse conventions and keep only useful docs. The coordinator updates canonical todos and progress from workers, revisiting goals, remaining work, dependencies, blockers and acceptance criteria. Periodically spawn a fresh subagent to review the whole effort for fundamental flaws, unnecessary detail, hard problems or loops; reassess from its findings. Propagate contract changes; revalidate stale information. Distinguish requirements from behavior, prepared from dispatched work, observations from assumptions, and implemented, verified, reviewed, integrated and blocked work. At handoff or interruption preserve goals, acceptance criteria, todos, owners, resource locations, outcomes, revisions, checks, results, evidence, risks, blockers, decisions, open issues, next steps and integration needs, excluding secrets and needless private data. The successor maintains canonical todos with status, owners and dependencies and any active goal's objective, status, progress and remaining limits through supported controls; never reset consumed allowances. Workers act autonomously in scope; escalate cross-task interfaces, persistent formats, security boundaries, major dependencies and scope changes to the coordinator for resolution within the approved mandate. Unapproved major architecture or product changes and consequential external actions need human authorization. [R8]

**Implement and verify.** Inspect, implement a coherent increment, check, diagnose, fix, recheck. Preserve architecture; no unrelated rewrites, speculative abstractions or unnecessary dependencies. Implement when requested. Use task-appropriate evidence and baselines; inspect real user flows in interactive products. Check games' and simulations' invariants, save compatibility and realistic-scale performance; prototype uncertain ideas before generalizing. Research cites evidence and separates hypotheses, measurements and conclusions. Never weaken tests or conceal failures to claim success. Docs-only work uses content and version checks; skip runtime tests and CI waits. [R9]

During authorized work, proactively improve products and orchestration and learn from recorded outcomes; follow `../fleet/docs/skills/self-improvement/SKILL.md` within scope and budget. [R33]

Obtain independent, preferably read-only review for substantial or high-risk changes when available. Review the exact revision against acceptance criteria. Report unavailable review; fix justified findings, rerun affected checks, and obtain focused re-review when fixes invalidate earlier review. [R10]

**Integrate, report, and stop.** Reassess after two failures for one reason. Unless another budget is set or the user authorizes more, cap automatic repair at five substantive attempts, then report; explicit overrides hold for their stated scope without asking again. Keep updates brief and decision-relevant. Stop when acceptance criteria and material findings are resolved; invent no follow-up work. [R11]

**Final acceptance gate.** The integration owner integrates in dependency order and on the final integrated revision's actual changes and evidence, not worker summaries, checks every acceptance criterion, runs relevant automated checks and exercises affected end-to-end behavior and cross-task interactions. Substantial or high-risk work gets independent read-only review of the integrated changes, integration fixes included. Confirm the merge to main; report that revision, review status and every failed, skipped or unavailable check and unmet criterion. Nothing is fully verified with an open material finding or required check. [R12]

### Fleet conventions

- Repository rules add local constraints consistent with this policy; they cannot override its permissions, adaptive workflow or stopping limits. [R13]
- Gates pass before any commit touching code; dependency changes rerun the audit gate. The user's standing grant covers committing, merging to main and pushing in every repo they own; force-pushing, rewriting history, deploying and publishing still need authorization. Work is done only once merged to main, regardless of green branch or worktree gates; report unmerged work's location. [R14]
- After executable changes, follow available remote gates to completion; inspect steps and runner before blaming code. Report unavailable verification and local bounds; fix blocking failures within the repair budget and report unrelated ones without expanding scope. [R15]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and executable changes in sibling repos; `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- Inspect rendered visual work; work without a visual surface runs headlessly. Cover 3D with ample fixed angles and zooms for comparison and randomized angles for exploration; leave room for surprises. Cover 2D and artwork at relevant viewport sizes, scales and states, interactive work through real controls and representative flows over time, static assets from their viewpoints. Use headless when adequate, visible only when needed. Aggregate views establish presence, not correctness: inspect each item at native resolution and bind review to the inspected bytes' digest. Check affected flows and surroundings for material regressions. Direct state-setting does not verify the controls or skipped input path. [R16]
- Record every user-reported defect in `docs/learning/defect-register.md`: the user's symptom, investigation, root cause and how it is checked. Add a check for the whole defect class; retain the entry after its gate lands. [R17]
- Read `docs/learning/lessons.md` at session start. Record lessons there the session learned; each names its retiring gate and is deleted in the commit landing it. A gate counts only after going red with the defect reintroduced, following `../fleet/docs/lessons-template.md`. [R18]
- Gates prove nothing beyond their bounds: name the bound in the header and pin every reproducing input. Distinguish passed from did-not-run; a check built from its checked symbol proves only self-agreement. [R19]
- Verify outcomes beyond exit status, red or green, and return values: read the artifact that should have changed. Retest inherited blockers before repeating them. [R20]
- Verify instruments before trusting measurements: flags took effect, the denominator is intended, the control reproduces and relied-on claims remain true. Hold the tree still between A/B arms. Ask the repo's debugging instrument first; the first probe names it or explains why none answers. Enforce applicable rules when writing a probe. [R21]
- Identify and fix slowness on the critical path (owner directive, 2026-09-15). Keep only slowness the verdict requires: the expensive gate the team is sized around. [R22]
- Keep task-run evidence only under ignored paths; delete it when no active task, unresolved issue or handoff needs it. It enters Git only after review promotes it to a repository input. Tracked docs retain plans, authored reviews, conclusions and provenance. Promoted blobs over 256 KiB need a stated reason; over 512 KiB binary or 1 MiB of anything never enter ordinary Git. Asset stores or LFS need user approval. [R23]
- Keep plans and every authored review round in permanent `docs/work/<id>_<theme>/` folders (`../fleet/docs/work-docs.md`). Record history, not status: a dated devlog line per behaviour-changing session in `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`). [R24]
- Use common words with the same meaning in chat, docs, commits, PRs, comments and errors. One idea per sentence unless a rule needs more. Cut length, not facts: keep exact terms, numbers and evidence. Quotes and pastes are exempt; do not copy this canon's style. One line per paragraph, no hard wrapping. When expanding skills, agent instructions or rules, merge overlaps, tighten wording, set a line budget and actively seek cuts; consider one-in, one-out. Justify necessary growth. [R25]
- Check error messages across the affected class and adjacent paths. Each names what happened, which input caused it and what would satisfy it, never bare `Validation failed`. [R26]
- When blocked, immediately hand over the redacted artifact with the named blocker, before analysis; continue safe independent work. [R27]
- Repos choose their language and toolchain (Node, Python and Rust run here), pin versions where tooling reads them and name them in Gates. Node baseline is 24; older majors need a CI job proving them. [R28]
- Runtime model calls, vision included, are authorized and paid for. Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`; every model a product calls is pinned in its calling repo. No model IDs are hardcoded elsewhere. [R29]
- Standing loops source tasks by running the artifact as its user does, with its default entry point and real configuration, never by reading code for improvements. No runnable entry point means no standing loop. [R30]
- Directions that outlive a task land that session in `../fleet/FLEET.md` if fleet-wide, otherwise the repo's `docs/policies/local-rules.md`; report where. [R31]
- When a hard problem blocks progress, run the search in `../fleet/docs/skills/hard-problem.md`. [R32]
<!-- FLEET-CANON:END -->

## Gates

Node 24, pinned in `.nvmrc`. Every command below was run in this repo on Node 24.18.1 before it was written here.

Run all five before any commit that touches code. A dependency change re-runs the audit.

| Gate | Command | About |
| --- | --- | --- |
| Build | `npm run build` | Vite production build into `dist/`. |
| Types | `npm run typecheck` | `tsc --noEmit` over `src`, `test`, `tools` and the configs. |
| Unit tests | `npm test` | Vitest, `test/**/*.test.ts`. |
| Visual | `npm run visual` | Claims the run before the build, builds once, then two lanes — the 44-frame appearance sweep on the hardware renderer and the lifecycle check on the same renderer, repeated three times — before the wrapper certifies the complete frame set against both lanes' renderers, the GPU and driver version it pinned, the three lifecycle records, the served scene data and the harness. About five minutes; the measured budgets and paces are in the local rules. |
| Audit | `npm run audit` | `npm audit --audit-level=high`. |

`npm run visual:install` fetches the browser the visual gate needs. Run it once per machine; the gate fails with Playwright's own install message if you skip it.

The complete-plugin UV unit cases in `test/facade-emission.test.ts` require the cached `data/scene/buildings/data/data488.b3dm` produced by `npm run data:fetch` and `npm run data:scene`. They verify its actual SHA-256 through the tile plugin while mocking only image decoding. Missing data fails with those preparation commands; the test never downloads implicitly or reports a skipped source as a pass. This prerequisite is distinct from a code regression.

`npm run data:fetch` gets the map data and `npm run data:scene` builds the scene from it, into a gitignored `data/`. Neither runs from `npm run build`; both are needed once before anything renders. `npm run data:scene` is itself a check — it decodes all 67 building tiles, reconciles every building against PLATEAU's own CityGML, and refuses to write a scene whose ground, landmarks, road heights or attributes disagree with what they should be.

### The visual gate is only half a gate

`npm run visual` boots the production build and drives OrbitControls with synthesised pointer and wheel input. It writes 44 frames under `artifacts/visual/`: eighteen sweep views per style (six azimuths at three distances) plus eight hero views (both styles, dusk/noon and crossing/approach). Per-specification manifests record camera poses and SHA-256; the final wrapper checks every expected frame, fresh timestamps, unchanged build bytes, the scene data the preview server served, the harness the lane ran and the GPU the frames were drawn on, requires the three hardware lifecycle records for this run, and asserts the renderer both lanes reported, before writing `complete.json`. Its first step deletes the previous certificate, ahead of the build, so a failed run cannot leave one; a run with no step flag is refused rather than re-certifying what is on disk. It waits for tiles to stop refining before every capture. The lane runs on the GPU, three specification files at once, since the owner's 2026-09-16 instruction: the frames are this adapter's pixels, and the certificate naming the adapter and driver is what replaced machine-independent bytes that nothing read.

What it proves on its own: the app rendered, the input path moved the camera, each frame is a distinct non-blank 1280x720 image, and the building geometry that is actually in the scene sits on the ground near the crossing in the right quantity.

Seven of the instrument's own checks have been made to go red, with the mutation and the message recorded in [docs/learning/gate-proofs.md](docs/learning/gate-proofs.md): a certificate surviving a failed build, a certificate issued without the hardware lifecycle lane, one issued for frames captured against a scene that changed mid-run, one issued for frames whose harness changed mid-run, a lifecycle lane whose cleanup threw, an appearance lane that fell back to a software rasteriser (reproduced twice — the spec's first-frame predicate and the wrapper's own refusal, each with its exact message), and a frame set drawn on a GPU that is not the one the run pinned. Six more are recorded there as the gate's earlier proofs. Three failure paths are written and reachable but have never been watched to fire — WebGL unavailable, the render loop stopping mid-sweep, and the camera never settling. Treat those three as code, not as evidence.

What it cannot prove is that any of those frames looks right. Inspect native originals under the current [visual review scope](docs/policies/local-rules.md#shibuya-priorities-and-progress), including detailed Satellite review and basic style continuity during the Satellite focus. A contact sheet or thumbnail is not a native review.

### The harness drives the controls and never sets state

`tools/visual/` may read `window.__mapsHarness`, which is frozen and has no setter. It may not assign `camera.position`, call `controls.setAzimuthalAngle`, or call the render function. That is the fleet canon's rule above, and `src/harness/bridge.ts` is built so the harness structurally cannot break it.

## Invariants & boundaries

**The world frame.** Scene units are metres. Y is up. The world origin is the Shibuya Scramble Crossing, at 35.6595 N, 139.7005 E. +X is east and +Z is south. It lives in `src/world/frame.ts`, and everything that places anything reads it from there.

**The area of interest.** 35.6550–35.6640 N by 139.6950–139.7060 E, which projects to 997.1 x 997.3 m. It lives in `src/world/aoi.ts` — bounds, centre, projected extent, EPSG:6677 origin, mesh codes, Overpass bbox — and the world frame, the fetch manifest and the Overpass query all read it from there rather than restating it.

**No global coordinates reach the browser.** EPSG:6677 northings around Shibuya run to the tens of thousands, and float32 vertex buffers run out of centimetres long before that. `planeRectangularToWorld` subtracts the origin at load time, so nothing in the scene sits more than about a kilometre from zero.

**The data is fetched, never committed.** `npm run data:fetch` pins the PLATEAU archive by length and SHA-256 into a gitignored `data/`. Attribution for PLATEAU, OpenStreetMap and GSI is required in the running app and lives in `src/ui/attribution.ts`; `docs/policies/local-rules.md` carries what each licence obliges.

**Randomness is seeded.** Everything generated draws from `createRng` in `src/world/rng.ts`, never from `Math.random`. The visual gate compares frames across runs, and a scene that reshuffles itself would make the gate measure the shuffle.

**Simulation runs on a fixed step.** `RenderLoop` calls fixed steps at a constant rate and frame steps with the real elapsed time. Integrators — car following, pedestrian avoidance, signal phases — register as fixed steps, so they give the same answer on a fast machine and a slow one, and so one clock drives them all.

**Where things live.** `src/scene/terrain.ts`, `src/scene/buildings.ts` and `src/scene/roads.ts` are the homes for those three; `src/agents/agents.ts` is the home for pedestrians and vehicles; `src/render/` owns the renderer, the camera rig and the loop. `tools/scene/` is the offline pipeline that feeds the first three, and `src/world/scene-data.ts` says what it writes and where the app finds it.

**The scene is data on disk, not bytes in the bundle.** `npm run data:scene` writes derived files into gitignored `data/scene/`, including terrain, roads, pavement data and 67 building tiles in the world frame. A Vite plugin serves that directory at `/scene/`; decoder and external asset mounts are also required. `dist/` is not self-contained. See [setup](docs/reference/setup.md) for preparation and hosting requirements.

**Building texture uses a bounded geographic policy at load.** Atlases are capped at 1024 pixels generally, 2048 within 160 m of the crossing, and native 4096 for one final-detail leaf containing the observed crossing frontage. The source audit requires exactly one native tile and atlas. Current full-source estimates are 561,075,583 texture bytes with mipmaps plus 73,324,734 geometry bytes; these are not measured whole-process GPU allocation. Both styles reuse the capped textures. `src/scene/texture-budget.ts`, `npm run data:textures:verify` and `docs/policies/local-rules.md` carry the policy and evidence.

**The performance budget.** 60 fps at 1080p with 3,000 animated pedestrians and 200 vehicles, recorded as `PERFORMANCE_TARGET` in `src/world/frame.ts`. Nothing enforces it yet; Phase 9 owns measuring it.

## Conventions

The fleet canon above, the documents it asks for, and `docs/policies/local-rules.md`, which now carries the stack, the world frame, the harness rule, and the port and host settings the gate depends on.

### Cached source for paint regression checks

`test/paint-support.test.ts` checks the actual pinned network, road, pavement and terrain bytes produced by the reviewed data pipeline. Prepare `npm run data:fetch`, `npm run data:scene` and `npm run data:network` before the source-dependent unit gate. Missing or changed inputs fail with their names; the test never fetches or skips them. Fresh OSM data may differ from the reviewed fixture and requires source review. Final capture reproducibility binds the exact cached inputs and is distinct from successful fresh remote `data:setup`.

### Cached source for mapped-tree regression checks

`test/vegetation.test.ts` checks crown variety against exactly the retained 80,890-byte or reviewed1695 80,952-byte `data/scene/decorations.json` tuple. The test owns both literal SHA-256 pairs. Restore an admitted reviewed input before the source-dependent unit gate; missing or changed bytes fail without downloading or skipping. The fresh tuple does not qualify the moved guardrail's placement or clearance.

### Retained pedestrian test packets

Before a full unit run in a fresh worktree, check these nine retained fixture files: `artifacts/pedestrian-native253-20260928/packet/{context,rig-near,rig-medium,rig-far}.json` and `artifacts/pedestrian-corner331-20260928/packet/{manifest,context,rig-near,rig-medium,rig-far}.json`. Restore literal reviewed copies separately from the scene runtime cache; missing packets are a setup failure, and tests must not fetch or skip them. [1422](docs/work/0_shibuya-1km/reviews/1422_tactile-paving-implementation.md) records the actual restoration and its source/copy hash receipt. This presence check avoids starting the full suite with known missing inputs; it does not replace the tests' content checks.

### Cached source for the east mounted-light check

`test/peripheral-mounted-light.test.ts` needs reviewed `data/scene/buildings/data/data498.b3dm` (SHA-256 `979ab194aa165391e058e1b3b0b3b37ea5c3d64dfc5f5353e61922f9c97ead55`) and `data/scene/pavements.mesh` (`841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6`). Restore these from the reviewed scene cache before the source-dependent unit gate; fresh preparation uses `npm run data:fetch` and `npm run data:scene`. Missing or changed bytes fail, never download or skip. Review changed source before updating pins. [1426](docs/work/0_shibuya-1km/reviews/1426_peripheral-mounted-light-implementation.md) records the finite source, receiver and installed-loader bounds.

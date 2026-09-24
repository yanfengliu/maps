# AGENTS.md — maps

## What this is

Turn real-world 3D map data into simulated worlds: take what public map sources already hold about a place — ground, buildings, roads, land cover — and build a scene you can move through rather than only look at.

The first deliverable is a model of roughly 1km by 1km of Shibuya, Tokyo, leaning photoreal, with pedestrians and vehicles moving through it. Its plan and reviews live in `docs/work/0_shibuya-1km/`.

Non-goals: not a map viewer, not a navigation or routing product, not a survey-grade reconstruction of the real place. Nothing past the Shibuya deliverable is decided — a second location, a product surface, or a shipping target is out of scope until the owner says otherwise.

Stack: Vite, three.js and TypeScript on Node 24, with `3d-tiles-renderer` for the building tileset. Chosen in Phase 0 and recorded in `docs/work/0_shibuya-1km/plan.md`; the repo rules carry the details.

The repo's own rules: [docs/policies/local-rules.md](docs/policies/local-rules.md).

<!-- FLEET-CANON:BEGIN sha=973eb18eaf96 generated from ../fleet/FLEET.md by `npm run sync-canon` — do not edit inside this block; this repo's own rules go in docs/policies/local-rules.md -->
## Fleet constitution

Reasons and evidence per `[Rn]`: `../fleet/docs/canon-rationale.md`.

### Fleet Orchestration Policy

Deliver the requested outcome with verified correctness, coherent architecture and minimal necessary complexity; optimize for useful progress, not agent count, code volume or maximum reasoning. Adapt rigor to risk. This policy grants no new permissions or capabilities. [R1]

**Roles.** Only an explicitly designated agent is coordinator; each scope has one accountable integration owner. The coordinator owns planning, dependencies, shared interfaces, architectural consistency, integration and acceptance. It reads only what an assignment, an acceptance, or its own trivial change needs, inspects handoffs to accept or reject them, and delegates every change except a trivial one, which it may make itself when delegating would cost more than the change (owner directive, 2026-09-23, superseding that of 2026-09-05). Trivial means at most about 20 changed lines of docs, config or an integration fix, nothing R10 calls high-risk, and no product logic, migration, security or trust-boundary code; the same gates, review and worktree rules apply. [R2]

Workers own bounded outcomes and local implementation decisions. Each worker, a reviewer included, decides how many subagents its task needs and dispatches them, within its budget (owner directive, 2026-09-23). For a small task that is none. It remains accountable for what they return. Threads follow deliverables, not permanent departments; no recursive manager hierarchies. [R3]

**Plan and delegate.** First inspect instructions, code, docs, working-tree state and active tasks; establish the outcome, non-goals, acceptance criteria, dependencies and verification method; settle routine ambiguity with evidence and reversible defaults. Choose the simplest effective delegation: subagents for bounded investigation, independent judgment or a localized change, separate threads for substantial independent changes; agree shared contracts before parallel work; no duplicate or blocked work. An assignment names owner, outcome, context, dependencies and contracts, base revision, workspace, allowed and excluded changes, verification, resource limits, expected handoff, and read-only or implementation. Change configured model and reasoning defaults only through supported controls, on evidence. [R4]

Size the team to the work continuously (owner directive, 2026-09-15): widen when one worker holds the critical path and independent work waits, narrow when workers contend for a file, port or CPU. Account for shared services, databases, ports and compute: no worker runs while another edits the same file in the same tree, runs the same gate or holds an unshareable resource. An expensive gate is one: exactly one runs at a time, and other work is chosen around it. [R5]

**Session size** (owner directive, 2026-09-23). One task per session; a new request becomes its own assignment. A task expected to need more than about 200k tokens of context is split into milestones within that budget, each committed and merged to main once green; the next may start a fresh session from main. Milestones are the boundary: the harness compacts context mid-task, and a compaction is never a task boundary or a reason to wrap up or hand off. No unattended "don't stop until done" loop runs without milestone commits. Mechanical subagents (lookups, gate runs, mechanical edits) use lower effort or a smaller model; reviews and their subagents keep the review runbook's pins. Per-item model calls, such as per-image classification, are one-shot calls, never full agent sessions. [R6]

**Coordinate safely.** Use only capabilities actually available; assume no visibility into other chats, shared memory, automatic messaging, workspace isolation or persistent monitoring. Unable to spawn a worker, work directly or hand off explicitly. Isolate concurrent edits in a worktree: beyond a trivial read, a session or agent works in its own worktree by default, serializing overlapping writes only when none is available, and saying why. It finishes the worktree in the same session (merge to main, push, `git worktree remove`), and reports one left after its work landed, and where, as a defect. Never overwrite or discard another participant's work. Track delegated work to completion, cancellation or handoff; release only your own resources, losing no work. Resuming interrupted work, first inspect surviving worktrees, artifacts and task status; recover what exists and preserve unfinished work, assuming no worktree, transcript or shared memory survived until checked. [R7]

**Preserve state and decision boundaries.** Essential memory (owners, dependencies, revisions, status, blockers, consequential decisions) lives in the repo or tracker, not the conversation; reuse conventions; keep only useful docs. The coordinator owns canonical status from workers' scoped updates. Propagate changed contracts; revalidate stale information. Keep apart intended requirements and actual behavior, prepared and dispatched work, observed status and assumptions, and implemented, verified, reviewed, integrated and blocked work. A handoff or interruption keeps outcomes, revisions, checks and results, evidence, risks, blockers, unresolved issues, next steps and integration requirements, never secrets or unnecessary private data. Workers act autonomously in scope, escalating cross-task interfaces, persistent formats, security boundaries, major dependencies and scope changes for the coordinator to resolve within the approved mandate; unapproved major architecture or product changes and consequential external actions need human authorization. [R8]

**Implement and verify.** Inspect, implement a coherent increment, check, diagnose, fix, recheck. Preserve established architecture: no unrelated rewrites, speculative abstractions or unnecessary dependencies. Go past planning when implementation is requested. Use task-appropriate evidence and baselines; inspect real user flows in interactive products; in games and simulations check invariants, save compatibility and realistic-scale performance; prototype uncertain ideas before generalizing; in research cite evidence and separate hypotheses, measurements and conclusions. Never weaken tests or conceal failures to claim success. [R9]

Obtain independent, preferably read-only review for substantial or high-risk changes when available. Review the exact revision against acceptance criteria. If no review is available, say so rather than imply one ran; fix justified findings, rerun affected checks, and get a focused re-review where a fix invalidates earlier review. [R10]

**Integrate, report, and stop.** After two failures for one reason, reassess rather than repeat. Unless another budget is set or the user authorizes more, cap automatic repair at five substantive attempts, then report; an explicit user override holds for its stated scope, without asking again. Keep updates brief and decision-relevant. Stop once acceptance criteria and material findings are resolved; invent no follow-up work. [R11]

**Final acceptance gate.** The integration owner integrates in dependency order and, on the final integrated revision's actual changes and evidence, not worker summaries: checks every acceptance criterion, runs relevant automated checks, exercises affected end-to-end behavior and cross-task interactions, and for substantial or high-risk work gets an independent read-only review of the integrated changes, integration fixes included. It confirms the merge to main and reports that revision, review status and every failed, skipped or unavailable check and unmet criterion. Nothing is fully verified while a material finding or required check is open. [R12]

### Fleet conventions

- Repository rules add local constraints consistent with this policy; they never override its permissions, adaptive workflow or stopping limits. [R13]
- Gates pass before any commit touching code; a dependency change re-runs the audit gate. The user's standing grant covers committing, merging to main and pushing in every repo they own, and is what the policy's merge and push permissions resolve to; force-pushing, rewriting history, deploying and publishing still need their authorization. Work is done only once merged to main; a branch, worktree or uncommitted tree does not count, whatever its gates say. Say where unmerged work is. [R14]
- After a push, follow the remote gate to completion when available, reading job steps and runner assignment before blaming code; report unavailable remote verification, relying on the local gate within its bounds; fix blocking failures within the repair budget, and report unrelated ones without silently expanding scope. [R15]
- For substantial or high-risk changes, use independent review when available. High-risk includes persistence and migrations, security and auth, concurrency, money, supply chain, and edits that reach sibling repos; `../fleet/docs/skills/multi-cli-review.md` provides the review mechanics. [R10]
- Verify visual work visually: look at the rendered result; work with no visual surface runs headlessly. Cover 3D from several camera angles and zooms, 2D and artwork at relevant viewport sizes, scales and states, interactive work through real controls and representative flows over time, static assets from their viewpoints; headless when adequate, visible only when needed. An aggregate view (contact sheet, grid, proof sheet) shows one of each exists, not that each is right: inspect each item at native resolution and bind the review to the digest of the bytes inspected. Check affected flows and surroundings for material regressions. A harness that sets state directly does not exercise the controls and is blind to defects in the input path it skips. [R16]
- A defect the user reports is recorded and gated, never only fixed: a `docs/learning/defect-register.md` entry (symptom as they saw it, investigation, root cause, how it is now checked) plus a check for its whole class. The entry stays after its gate lands. [R17]
- A lesson is prose only until it is a gate: it lands in `docs/learning/lessons.md` (read at session start) the session it is learned; each entry names its retiring gate and is deleted in the commit landing it, and a gate counts only once it has gone red with the defect reintroduced, run as `../fleet/docs/lessons-template.md` says. [R18]
- A green gate proves less than it looks like: it proves nothing past its bound. Name the bound in its header; pin every input that reproduces the defect. A gate that cannot tell passed from did-not-run reports the second as the first; a check built from the symbol it checks proves only that the code agrees with itself. [R19]
- A command's exit status is a claim about the command, not about the work, so read the artifact that should have changed. A red exit, an inherited blocker (retest it before repeating it) and a return value (a search that misses returns a sentinel) are the same kind of claim. [R20]
- Verify the instrument before trusting the measurement: the flag took effect, the denominator is the intended population, the control reproduces, the claim you rely on is still true, not remembered. An A/B comparison needs the tree still between arms. Ask a repo's own debugging instrument (a replayer, a profiler) first; a task's first probe names which one answers, or why none does. A rule needed at the moment of writing a probe is enforced then, not read at session start. [R21]
- Anything slow on the critical path is a defect to identify and fix, not a cost to schedule around (owner directive, 2026-09-15). Keep only the slowness a verdict depends on: the expensive gate the team is sized around. [R22]
- Task-run evidence lives only under ignored paths and is deleted once no active task, unresolved issue or handoff needs it; it enters Git only when review promotes it into a repository input (fixture, golden, snapshot, contract). Tracked docs keep plans, authored reviews, conclusions and provenance. Promoted blobs over 256 KiB need a stated reason; over 512 KiB binary or 1 MiB of anything never enter ordinary Git; an asset store or LFS needs the user's approval. [R23]
- Plans and every authored review round go in a permanent `docs/work/<id>_<theme>/` folder (`../fleet/docs/work-docs.md`). Keep a devlog, history not status: a dated line per behaviour-changing session in `docs/devlog/summary.md` (`../fleet/docs/devlog-template.md`). [R24]
- Use the common word where it says the same as the rare one, in chat, docs, commit subjects, PR titles, comments and error messages. One idea per sentence unless a rule needs one line to carry more. Cut length, not facts: keep exact terms, numbers and the evidence a claim rests on. Quotes and pastes are exempt; do not copy this canon's style. One line per paragraph, no hard wrapping. [R25]
- Error messages are a product surface; check the affected class and adjacent paths. Each names what happened, which input caused it and what would satisfy it, never a bare `Validation failed`. [R26]
- When blocked, hand over the artifact itself, redacted, as soon as the blocker is named, not after the analysis, and continue safe independent work. [R27]
- A repo chooses its language and toolchain (Node, Python and Rust run here), pins the version where its tooling reads it (`.nvmrc`, `requires-python`, `rust-toolchain.toml`) and names it in Gates. Node repos baseline at 24; an older major keeps a CI job proving it. [R28]
- Runtime model calls, vision included, are authorized and paid for. Reviewer model pins live only in `../fleet/docs/skills/multi-cli-review.md`, and a model a product calls is pinned in the repo that calls it; no model ID is hardcoded elsewhere. [R29]
- A standing loop sources its next task by running the artifact as its user does (default entry point, real configuration), never by reading code for something to improve; a repo with no runnable entry point has none. [R30]
- Steering compounds: a direction that outlives its task lands that session, in `../fleet/FLEET.md` if fleet-wide, else in the repo's `docs/policies/local-rules.md`, and you say where. [R31]
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

What it cannot prove is that any of those frames looks right. Open all 44 at their own size and look at them. A contact sheet is not a review, and neither is a thumbnail.

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

**The scene is data on disk, not bytes in the bundle.** `npm run data:scene` writes about 148 MB into a gitignored `data/scene/` — the terrain mesh, the road mesh, and 67 building tiles already placed in the world frame — and a Vite plugin serves that directory at `/scene/`. `dist/` is therefore not self-contained, which is the price of not copying 148 MB into it on every build.

**Building texture uses a bounded geographic policy at load.** Atlases are capped at 1024 pixels generally, 2048 within 160 m of the crossing, and native 4096 for one final-detail leaf containing the observed crossing frontage. The source audit requires exactly one native tile and atlas. Current full-source estimates are 561,075,583 texture bytes with mipmaps plus 73,324,734 geometry bytes; these are not measured whole-process GPU allocation. Both styles reuse the capped textures. `src/scene/texture-budget.ts`, `npm run data:textures:verify` and `docs/policies/local-rules.md` carry the policy and evidence.

**The performance budget.** 60 fps at 1080p with 3,000 animated pedestrians and 200 vehicles, recorded as `PERFORMANCE_TARGET` in `src/world/frame.ts`. Nothing enforces it yet; Phase 9 owns measuring it.

## Conventions

The fleet canon above, the documents it asks for, and `docs/policies/local-rules.md`, which now carries the stack, the world frame, the harness rule, and the port and host settings the gate depends on.

### Cached source for paint regression checks

`test/paint-support.test.ts` checks the actual pinned network, road, pavement and terrain bytes produced by the reviewed data pipeline. Prepare `npm run data:fetch`, `npm run data:scene` and `npm run data:network` before the source-dependent unit gate. Missing or changed inputs fail with their names; the test never fetches or skips them. Fresh OSM data may differ from the reviewed fixture and requires source review. Final capture reproducibility binds the exact cached inputs and is distinct from successful fresh remote `data:setup`.

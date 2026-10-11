# Fresh Shibuya city in Unreal Engine 5.8 through MCP

Status: active
Owner: Orchestrator in the current Codex chat
Created: 2026-10-11
Updated: 2026-10-11

## Problem and outcome

The owner wants a fresh Unreal Engine 5.8 MCP branch that builds the same Shibuya city crop. The previous project setup is excluded except for exact copies of `AGENTS.md` and `CLAUDE.md`. The intended city is approximately 1 km square, photoreal leaning, with moving pedestrians and vehicles.

## Scope

The branch is `codex/shibuya-unreal-5.8`. Its isolated checkout is `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`. It starts from Git revision `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca` for history only; the replacement file tree carries no old project implementation.

The geographic origin is 35.6595 N, 139.7005 E. The crop bounds are latitude 35.6550-35.6640 N and longitude 139.6950-139.7060 E. The retained instructions describe approximately 997.1 by 997.3 metres. A fresh transform must verify those bounds in Unreal's chosen frame.

The orchestrator owns scope, contracts, canonical status, integration, and final acceptance. The clean-branch worker owns bootstrap documentation and byte preservation. The engine/MCP worker owns engine discovery and a fresh project/control scaffold. City source, import, motion, and visual work are future bounded assignments. These roles do not imply any verification has completed.

Do not change the primary checkout's files or index, another chat's unfinished work, or any old experimental worktree. Do not import old assets, data, scene output, tests, tooling, package setup, CI, or documentation. Do not merge the experimental replacement tree into main. A second location, product surface, routing product, and shipping target remain outside scope.

## Approach

Create a new worktree without checking out the old file tree, empty only its index, and copy the current instruction files byte for byte. Author the new policy and plan from the owner's requirements. The branch-local work registry starts at 0 because allocating through the primary would mutate or import the excluded setup.

Unreal Engine 5.8.3, changelist 58210709, has been identified by the engine discovery worker. Official Epic documentation describes native MCP support; actual availability in this installed project and a live handshake still need verification. Prefer a verified native route before introducing a third-party package.

Define a fresh geographic frame, source manifest, ingestion/import pipeline, materials, terrain, roads, population movement, and controls for Unreal. Admit each source with hashes and attribution. Independently verify placement and scale before expanding to the full crop. Use headless engine checks where sufficient, then rendered multi-view and motion evidence on the actual renderer. Preserve the eventual 3,000-pedestrian and 200-vehicle, 60 fps at 1920 by 1080 requirement without claiming it is measured.

The [local branch rules](../../policies/local-rules.md) document the owner's overrides of the retained browser stack and gates. Unreal checks must be implemented and exercised before acceptance; inherited gate names are not substitutes.

## Acceptance criteria

- The isolated branch/worktree exists and leaves main, its index, other worktrees, and active work unchanged.
- `AGENTS.md` and `CLAUDE.md` remain byte-identical to the primary files copied at branch creation; verify their SHA-256 values and preserve bytes in Git.
- No previous project setup or local assets are present outside those instruction files; inspect the full new file tree and Git diff, including reparse points.
- The fresh project identifies the installed engine and opens under Unreal Engine 5.8 with explicit load/build results.
- MCP connects to the intended project, lists actual tools, performs a bounded reversible action, and verifies the resulting state and cleanup.
- A fresh coordinate contract and independently admitted real-world data cover the stated Shibuya crop with checked landmarks, terrain, buildings, roads, and attribution.
- The city visibly meets the photoreal leaning direction through native images across close, block, and whole-crop views, with independent review bound to exact bytes.
- Pedestrians and vehicles visibly move through ordinary runtime controls and obey the agreed motion and support invariants; population counts and measured performance retain their stated bounds.
- Appropriate Unreal automation and integration checks pass on the actual final revision; unavailable, failed, and skipped checks remain disclosed.
- The branch retains reviewed work and truthful status separately from main; no city, MCP, rendering, or performance acceptance is inferred from bootstrap documentation.

## Implementation steps

- Clean-branch worker: create and inspect the isolated checkout, preserve instructions, remove inherited tracked content from its index, and author fresh policy and plan. Implemented and checked; no commit yet.
- Engine/MCP worker: identify the exact engine, select a supported native control route, and author a fresh project/control scaffold. Engine version identified; project and handshake verification pending.
- Orchestrator: reconcile engine/control evidence, establish verification commands and dependency contracts, and obtain independent read-only review of the bootstrap revision.
- Future source worker: define and verify the Unreal frame and acquire pinned source data afresh; do not use the old cache.
- Future city worker: import terrain, buildings, roads, and materials incrementally with real geographic and visual checks.
- Future motion worker: implement pedestrians and vehicles using agreed runtime invariants, then measure count and performance acceptance.
- Orchestrator and independent reviewers: run final build/runtime/MCP/source/visual checks on the exact experimental revision and record limitations.

## Outcome

Open. The clean checkout was created without checking out the old file tree. Its initial index retains only the two instruction files, removing the other 1,175 base-tracked paths. The working instructions match the primary SHA-256 values recorded in local rules, and their unfiltered Git blob hashes match their staged blobs. A nonfollowing census found zero reparse points in the new worktree. New policy, plan, work registry, README, Git attributes, ignore rules, and devlog were authored and read back. The engine worker's separate project/control implementation can now begin.

The engine has been identified, but MCP connectivity, a built city, rendered acceptance, motion, and performance remain unverified. No commit, push, engine launch, dependency installation, or data download was performed by the clean-branch worker. The orchestrator will bind the final inventory and preservation evidence to an independently reviewed revision. No inherited Node or visual gate was run because the user expressly excluded that setup.

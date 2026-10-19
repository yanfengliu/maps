# First-person source review — 2026-10-18

Reviewer: independent `review_walk` subagent. Target: initial frozen ten-file candidate at base `464fdc0`; controller SHA-256 `9eeb7fe3d983388890af639b831bd0659bc22a446d0cf59da3852753730075fe`, app `de2db559982b23176421cc07054df118b8ff07f13a326eba25eefb1f52dcfc7c`. Read-only source review; no browser or independent runtime rerun.

Verdict: redirect collision ownership before acceptance.

P2: `createWalkGround` refreshes cached meshes only when load/dispose revision changes. Installed `TilesRenderer.setTileVisible` adds/removes visible tile scenes without changing that revision. Turning or walking can reveal fronts absent from the cache, allowing passage through them. Rebuilding from visible meshes alone also misses buildings approached backward. Use retained final-leaf geometry independent of camera visibility, with checks for visibility changes without revision changes and off-view approaches.

No other material source findings in the initial ten-file diff. Input ownership, yaw-relative movement without flight, focus/blur/visibility clearing, clamped delta and diagonal speed, overview save/reentry/disposal and detached harness observations are coherent. Actor/furniture collision and general physics remain outside this increment.

Root accepted the finding and dispatched a narrow correction to the original worker: expose retained final-leaf collision models from the existing building owner, preserve lifetime/world transforms, replace the visible-root cache and check off-view/visibility/disposal behavior. The initial candidate is not accepted; final integrated source/native review remains required.

## Focused correction review

Independent reviewer `review_walk` reread the actual primary repair: buildings SHA-256 `fd50eb218a6ffb59e3f763af67d8cdb6cc9123c03f0a46de0ed920b7c07b1984`, controller `d9a5f5fc33a3f4b6dc381a8a03683c001933f7e2b6a327be04d5178941fdc999`, app `285589c37bac0d4e44235299ecf5aad699c326682a7edba2551fad0fb4552938` and first-person tests `b2f62c20c4f8931d2bb5d44214fc6840f1369880ea1b723d2df90a2d96f3aea8`.

GO; P2 resolved, no remaining material source finding. `BuildingWalkCollision` enumerates installed `forEachLoadedModel`, which walks retained `engineData.scene` independently of visible/active parenting. The owner filters admitted final leaves and invalidates on actual load/dispose revision. The installed-renderer test excludes coarse/unprepared models, checks unchanged-revision visible/active/detached transitions, drives the real KeyS camera path into an off-view wall, preserves source geometry and observes actual disposal/revision before renewed passage. Worker reports 79 focused tests and types PASS, visibility-only mutant RED, exact restore and GREEN. The reviewer ran no browser or duplicate runtime gate; full gates and native appearance remain separate acceptance.

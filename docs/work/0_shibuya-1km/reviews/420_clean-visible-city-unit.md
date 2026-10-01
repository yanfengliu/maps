# 420 — preserve deferred lighting and prepare visible unit

2026-09-30. Mechanical implementation only, owner root. Base HEAD `e060d3059ef607f10dcfbbce174d842da5fbb315`; accepted restore baseline `b4b8755a65c11a9fe9ce328030c8b6865d8f7781`. Read local rules, lessons, current progress and reviews411/417/419. No task-owned browser, server, GPU or runtime process was launched.

All eight current files were copied byte-for-byte and verified before any source edit. The four untracked lighting files were then moved individually into the ignored packet and verified again. Every resolved move target stays under this workspace; ancestors were checked for reparse points. Existing source inventories, prototypes, cached data and dependency junction were untouched.

Packet: `
C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\city-lighting413\deferred-420-20260930T210621055Z
`. `receipt.json` binds all before/preserved/after lengths and SHA-256 values; `removed-lines.json` records the three reversible shared-file removals. Full app/bridge copies retain train changes. They are evidence, not a restoration procedure. Reintegration must insert only the recorded lighting lines into the later app/bridge and merge signage/buildings lighting hunks against later changes, never overwrite those shared files blindly.

Actual baseline diff inspection showed signage/buildings differed from accepted b4 only by lighting integration. They now contain exact Git blob bytes from b4. app lost only its cityLighting observation line; bridge lost only the CityLightingStats type import and optional observation property. Train, readiness and failure changes remain. The four candidate files/test are absent from active trees; gate configuration is unchanged.

Dependency census before editing found the assigned four active integration files and four new lighting files. The remaining app-running-trains test mock has an extra unused cityLighting count field but imports no lighting module; it was left intact.

| Path | Before bytes / SHA-256 | After bytes / SHA-256 |
| --- | --- | --- |
| src/scene/signage.ts | 24494 / `fa3658549f5a6e72f153d17ff7f30279b689eb38c225c5354529883131d160d4` | 23523 / `f454e58b82caaac226ecd3f7a49555092e54204009dc2fa510116f8c06aa5b34` |
| src/scene/buildings.ts | 29622 / `379265c428ed1a315a5aaed4fb4acfe8528d9982e345e5c932ae55bae947fb99` | 28889 / `e729852c716cb19a1ccc5d50c5437fe8378a3e9501f4de65f39b350f30e395b9` |
| src/app.ts | 22552 / `4b19fadcc5959a29b46f085420ae42e3b037d17ceb37f7cb1630a77f31c61aa3` | 22502 / `1ab90598f754c53695a23566b218288efd1a691f95cebb47b6734409da2786fa` |
| src/harness/bridge.ts | 14848 / `4b3d03f4d0587853e2fa694741b94a8a9657aec88aa167de6ffd1fe01f457983` | 14742 / `28b3baf3d13faa77fb50285fcfb620be42f5893e00e7ee113f357f3e43ff4eb6` |
| src/scene/city-lighting-coverage.ts | 4237 / `db825b6104b08ebeae54210b5700042031659d45455ad950ee5fa9e9150df5db` | Inactive; preserved bytes unchanged |
| src/scene/city-lighting-layout.ts | 19801 / `83dfd248ea2ad10b22b134769a122ab1a4cdb4a6f89c1f8b4beb0a102f4bc906` | Inactive; preserved bytes unchanged |
| src/scene/city-lighting.ts | 16267 / `14e9b210a3acef198555db3c4c03bee082aaa66b3815a87f6f3c5ee5f3979a3f` | Inactive; preserved bytes unchanged |
| test/city-lighting.test.ts | 16381 / `7e3f5d2381faa862c4901ea2a8497cd013b352eb045a0eea6ee7f408f8410450` | Inactive; preserved bytes unchanged |

Checks run: preservation/move raw-hash equality and dependency/source-diff inspection only. Build, types, units, audit, visual gate, native originals, independent integrated review and main integration are all unrun and pending root acceptance. This mechanical split does not accept distributed lighting or the larger Shibuya deliverable.

# Rail and portal finish 236 — ready for bounded implementation

Historical experiment; no active assignment. [The plan](plan.md) owns current status; [local rules](../../policies/local-rules.md) own current verification.

2026-09-27. Owner: rail_finish236. Workspace: `C:/Users/38909/.codex/worktrees/shibuya-quality/maps`, detached base `0ec3dd03831b605235302212b7d140cb35297071` with preserved rail 170 and observer 223. This is a proposal and read-only inspection, not implemented or accepted appearance. Root must release product editing after the retained-building diagnosis and confirm no overlapping source reader depends on an unfrozen tree.

## Observed problem and instrument

I viewed the original 1280×720 `artifacts/rail-still223-20260927/run-03/N0-satellite-noon.png` at native size. Its SHA-256 is `af2a9cb28658f76fa0aa451c26c124156a217d970be4f8a132dafea2026bd520`. The two large concrete faces and brown rail bed are nearly uniform; sleepers look like repeated plain blocks; the cut jambs and soffits lack a coherent finish. This agrees with independent review 232. The image does not establish support contacts or exterior clearance.

The repo's existing material constructors and pinned overlay are the first diagnostic instruments. `createRailTrialScene` currently applies one constant color/roughness/metalness tuple per kind. `toGeometry` provides position, normal and index only, so rail layers have no UVs or maps. All ten replacement buildings have zero textured authored-return triangles. Return material roughness is .95, and `buildings.ts` applies building palette × .58. No rendering or geometric observer change is needed to explain these flat surfaces.

`inspect.mjs` reads the exact admitted replacement source faces, original embedded atlas headers and current geographic cap policy. `material-inspection.json` binds those inputs and the source files. The main nearby large portal building `bldg_d7fb4726-719f-47a1-a94f-4d0a1e89a2e0` in `data505.b3dm` has a 4096px source atlas capped to 2048px; its vertical source faces have area-weighted equivalent density p10/median/p90 = 2.875/3.271/3.796 texels per metre. This is a source-face census, not a ray-selected pixel attribution or directional sharpness measurement. It supports leaving facade blur and the atlas budget outside this finish pass. No exposure, lighting, source UV, photograph processing or source geometry change is proposed.

## One coherent finish

- Give the bed a neutral weathered ballast treatment: irregular fine mineral aggregate with a restrained coarse tonal range, visible at N0 and mipmapped at distance. Keep the existing bed outline and height.
- Give structural concrete and portal returns a shared mineral palette with subtle aggregate and restrained formwork seams at metre scale. Break the large flat faces without simulated structural gaps. Keep all face boundaries and authorized openings exact.
- Separate sleepers and rail steel through material response: lightly weathered concrete sleepers with fine grain; muted weathered steel sides and a controlled clean top highlight. Preserve all sleeper dimensions, rail profile and spacing. No fastening geometry is claimed or added in this first pass.
- Keep Cartographic clean and legible with its own existing palette and reduced surface contrast. Satellite gets the stronger aggregate and weathering response. Actual dropdown changes continue to preserve world geometry, camera and simulation.

Use a small rail-specific factory with seeded code-native `DataTexture` maps, explicit repeat wrapping, mipmaps and anisotropy. Add metre-scaled UV attributes to authored meshes only; leave position, normal, index, group, draw range, transform and clipping bytes unchanged. Use ordinary `MeshStandardMaterial` map/bump/roughness facilities and optional static color attributes for steel orientation. There is no displacement, opacity, custom shader hook or new observer whitelist. Surface normal detail is presentation only. No external images, data regeneration, dependencies or general asset system.

Texture allocation and disposal must stay explicit. The target is at most a few small 256×256 maps with a measured total bound of 3 MiB including mipmaps; reuse within each owned scene/tile lifetime without a global retained cache. Runtime tile disposal and style cycling must release or reuse those resources correctly. Existing tile transaction ownership is preserved.

## Expected owned files

- New `src/scene/rail-finish.ts`: narrow seeded material/map and authored-UV functions, plus owned disposal and style application.
- `src/scene/rail-trial.ts`: apply finish only to authored layers and authored returns; source fragments keep their exact original primitive materials and UVs.
- `src/scene/buildings.ts`: distinguish rail return finish style updates from the unchanged general square-cut section treatment, if necessary. Preserve the existing source loading and transaction contracts.
- New `test/rail-finish.test.ts`, with small additions to `test/rail-runtime.test.ts` only if a real disposal/style contract needs coverage.
- One authored review/design conclusion under `docs/work/0_shibuya-1km/` and one devlog entry when the implementation is real; root owns canonical plan status.

No edits to clearance thresholds, snapshot/capture observer, world frame, source overlay bytes, manifest pins, source tiles, offline geometry producer, simulation, palette registry or global render/light setup are planned. Before editing, preserve only the exact small source files actually touched and their hashes in this artifact directory.

## Acceptance and order

1. Root releases edits after the separate 234 disposition; old N0 unknown labels remain historical evidence.
2. Implement the single material pass and verify deterministic map bytes, bounded allocation, complete texture disposal and repeated style changes. Check actual geometry buffers and source material/UV identity remain unchanged. Existing relevant rail geometry/runtime tests and types must pass.
3. Freeze candidate source and build. Reuse the existing controls-driven N0 collector and owned cleanup path for paired native Satellite and Cartographic noon views; include dusk only where needed to judge material response. No new collector framework. A short necessary motion check uses 30 fps with sparse inspected keyframes; it is not permission to capture every frame or a broad sweep.
4. Compare to the retained original at native size. A fresh independent reviewer must see readable bed aggregate, concrete/jamb finish and sleeper/steel distinction without severe tiling, glitter, dark clipping, color loss or geometry changes. A same-angle material improvement does not discharge the hidden bearing views in review 209.
5. Root integrates the accepted bounded milestone in primary, runs all five gates and reviews the required native frames. No commit or push is authorized to this worker.

No browser, GPU lane, server or background process was started during readiness. Only this task's small authored diagnostic and JSON report were written under ignored primary artifacts. Product code remains unchanged.

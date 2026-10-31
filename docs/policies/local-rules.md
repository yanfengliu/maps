# Current map direction

The product is a map inspired by Apple Maps, beginning with the San Francisco Bay Area coastline and regional context. Stanford University's main campus is the only area with 3D buildings. Keep the regional-first view and a clear Stanford flight. Moving around the map should offer smooth pan, zoom, rotation, tilt, compass reset and useful local place search.

Route planning, turn-by-turn directions, satellite imagery, live traffic and other cities' 3D buildings are outside the first increment. Do not claim pixel-identical Apple behavior or photorealistic Flyover. Use public sources and authored styling, not Apple's imagery or credentials.

MapLibre GL owns map navigation and projection; Vite and TypeScript own the application. Regional vector tiles come from public OpenFreeMap. Local Stanford GeoJSON comes from real OSM footprints within the mapped campus perimeter. Preserve coordinate precision and courtyard holes. Keep mapped heights, floor-count estimates and missing-height defaults distinguishable. Source pins and ODbL attribution live with `public/data/`; data changes require source review and relevant data checks.

Simultaneous held-key and middle-mouse input composes with MapLibre's native handler deltas. Its internal compatibility adapter is deliberately limited to the pinned 6.15 handler registration/scheduling/owned cleanup and a cloned scroll-zoom anchor. Keep runtime version/shape checks and real combined-input regression coverage when upgrading MapLibre. Do not replace native navigation, mutate native handlers or reintroduce pointer/wheel pauses as a concurrency fix.

Keep the sandstone/terracotta map palette as architectural detail grows. Derived roofs and facades are stylized estimates; preserve source heights/geometry. Generate detail off the main thread only near campus, batch it, and measure the 60 fps target during real camera motion at a named resolution/GPU. Shader compilation and buffer upload belong in the loading/frame budget. Context restoration must recreate custom layers even when their standard source already exists.

The frozen `window.__bayMap` observer is read-only. Verification drives real controls and reads observations, never assigns camera state. Treat remote loading and local campus data as separate readiness conditions; errors need working recovery. Review desktop/mobile framing, repeated overview returns, search focus, selected building details and source-failure recovery when those paths change.

Run `npm run build`, `npm run typecheck`, `npm test` and `npm run audit` before code commits. Keep meaningful visual/control evidence under ignored `artifacts/`; do not commit temporary captures or raw source XML. Independent review must inspect the integrated changes. Retain plans, authored review rounds and conclusions in `docs/work/0_bay-area-stanford/`. The old Shibuya archive and retained resources remain separate from this direction.

# Work-document allocation

This repository's `docs/work` was adopted in place into the fleet work-docs allocator on 2026-10-30, by fleet work unit 18's `adopt` at fleet `0a61b55`. ID 0 is `bay-area-stanford`, by the owner's decision of 2026-10-27 that `2d18833` cleared `docs/work` as a deliberate fresh start. The registry acknowledges, by commit, blob and digest, the two contradictory historical registries for ID 0: `00ff7e6f7f5cdee2e60b03132b72e6a452b473b9` (`shibuya-1km`) and `af4403654cfa2917c17bc52caf838da61939770e` (`unreal-shibuya`). It also supersedes the stale local witness by its exact digest. Adopted history is frozen once present: never edit those records.

Allocate new work folders only with `node ../fleet/scripts/work-docs.mjs create --repo .`, never by hand. Six work folders have existed across all refs: ID 0 under `bay-area-stanford`, `shibuya-1km` and `unreal-shibuya`, ID 1 under `local-rules-refresh` and `walk-speed-fps`, and ID 2 under `medieval-city`. The allocator knows only registry revisions, so `create` allocates ID 1 next; the old folders stay in history, and `2_medieval-city` stays on its own branch.

Unit 0 keeps 17 historical documents frozen by digest in its `inPlaceHistory`: the 8 notes at its root and its reviews `002` to `008`, `1` and `2`. Never edit, rename or move them, and add no other file at the unit root. New reviews start at round 9, in the current format. `plan.md`, which the owner approved restructuring into the current format on 2026-10-28, and any future `design.md` are ordinary canonical documents.

A fresh clone of this repository, or a clone whose local witness predates the adoption, refuses every allocator command until an owner-approved witness restore exists, a later fleet unit. Until then, allocate in this machine's `maps` clone or one of its worktrees, whose shared witness recorded the adoption.

# Current map direction

The product is a map inspired by Apple Maps, beginning with the San Francisco Bay Area coastline and regional context. Stanford University's main campus is the only area with 3D buildings. Keep the regional-first view and a clear Stanford flight. Moving around the map should offer smooth pan, zoom, rotation, tilt, compass reset and useful local place search.

Route planning, turn-by-turn directions, satellite imagery, live traffic and other cities' 3D buildings are outside the first increment. Do not claim pixel-identical Apple behavior or photorealistic Flyover. Use public sources and authored styling, not Apple's imagery or credentials.

MapLibre GL owns map navigation and projection; Vite and TypeScript own the application. Regional vector tiles come from public OpenFreeMap. Local Stanford GeoJSON comes from real OSM footprints within the mapped campus perimeter. Preserve coordinate precision and courtyard holes. Keep mapped heights, floor-count estimates and missing-height defaults distinguishable. Source pins and ODbL attribution live with `public/data/`; data changes require source review and relevant data checks.

Furniture and sculpture identity, placement, material and shape need separate evidence. Preserve mapped bench paths and treat bench direction as seated facing, with the seat axis perpendicular to it. Keep unknown material/backrest/facing and photo-derived dimensions explicit. Derived seating on mapped planter boundaries must retain its reference and interpretation; a planted boundary alone is not a mapped bench.

Simultaneous held-key and middle-mouse input composes with MapLibre's native handler deltas. Its internal compatibility adapter is deliberately limited to the pinned 6.15 handler registration/scheduling/owned cleanup and a cloned scroll-zoom anchor. Keep runtime version/shape checks and real combined-input regression coverage when upgrading MapLibre. Do not replace native navigation, mutate native handlers or reintroduce pointer/wheel pauses as a concurrency fix.

Keep the sandstone/terracotta map palette as architectural detail grows. Derived roofs and facades are stylized estimates; preserve source heights/geometry. Generate detail off the main thread only near campus, batch it, and measure the 60 fps target during real camera motion at a named resolution/GPU. Shader compilation and buffer upload belong in the loading/frame budget. Context restoration must recreate custom layers even when their standard source already exists.

The frozen `window.__bayMap` observer is read-only. Verification drives real controls and reads observations, never assigns camera state. Treat remote loading and local campus data as separate readiness conditions; errors need working recovery. Review desktop/mobile framing, repeated overview returns, search focus, selected building details and source-failure recovery when those paths change.

Run `npm run build`, `npm run typecheck`, `npm test` and `npm run audit` before code commits. Keep meaningful visual/control evidence under ignored `artifacts/`; do not commit temporary captures or raw source XML. Independent review must inspect the integrated changes. Retain plans, authored review rounds and conclusions in `docs/work/0_bay-area-stanford/`. The old Shibuya archive and retained resources remain separate from this direction.

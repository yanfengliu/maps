# Bay Area map and Stanford 3D

Started: 2026-10-19. Owner: root integration. Base: `2d1883392a04c932a18136b59d43dea05fd17fb2`.

## Outcome and scope

Build a runnable map inspired by Apple Maps: the real San Francisco Bay Area coastline, regional map context and smooth map navigation. Build 3D buildings only for Stanford University's main campus. Begin at a regional overview and provide a clear flight into the campus.

Navigation means camera movement and finding places: pan, zoom, rotation, tilt, north reset, 2D/3D and local place search. Route planning, turn-by-turn directions, satellite imagery, live traffic, photorealistic Flyover and other cities' 3D buildings are outside this increment. No Apple imagery or credentials are required. Keep the prototype local; publication needs a separate instruction.

The former Shibuya project remains on `codex/shibuya-archive-2026-10-19` at `e93f56711a5b629481c1512a89058c2823017840`. Do not alter it or its retained local resources.

## Implementation and ownership

| Outcome | Owner | State and dependencies |
| --- | --- | --- |
| Map, controls and interface | bay_area_app | In progress, branch `codex/bay-area-stanford`; consumes the data contract below. |
| Actual Stanford footprints and provenance | stanford_data | In progress, branch `codex/stanford-campus-data`; independent of UI. |
| Integration, visual checks and acceptance | root | Waiting on the two bounded implementations; branch `codex/bay-area-integration`. |

Each checkout lives under ignored `artifacts/bay-area-stanford/`. Dependencies are real owned directories, never links to the previous project. Root serializes final browser verification. Every task-owned browser/server must close after verification.

## Shared contract

MapLibre GL renders public OpenFreeMap vector tiles with a custom light map style. Local `public/data/stanford-buildings.geojson` supplies Polygon/MultiPolygon footprints. Each feature has `id`, `name`, metre-valued `height` and `base`, `heightSource` (`osm-height`, `osm-levels` or `estimated`), `color` and `roofColor`. `stanford-campus.geojson` defines the admitted campus boundary. `stanford-provenance.json` records sources, licences, fetch dates, counts, hashes and estimates. Root must verify the final contract rather than trust handoff summaries.

## Acceptance and verification

- The first view recognizably depicts the real Bay Area, with coastline, water, roads and place labels.
- Exploring Stanford flies to real campus building footprints and visible 3D massing; no off-campus 3D is rendered.
- Desktop mouse/keyboard controls and mobile layout work through actual controls. Search, place selection, zoom, compass, tilt and 2D/3D have useful behavior and accessible names.
- Footprint source and height estimates are disclosed; required attribution remains visible. Network failure produces an actionable error.
- Production build, types, meaningful unit/data checks and dependency audit pass. Inspect headless screenshots at desktop and mobile sizes, multiple Stanford angles and the regional overview. Exercise real control paths and inspect browser errors and actual loaded data.
- Obtain independent read-only review on the integrated revision. Fix material findings, repeat affected checks, merge to `main`, push and verify remote refs. Preserve the old archive ref exactly.

## Current limits

The base map depends on the public OpenFreeMap service. Stanford building heights may be derived from levels or estimated when OSM has no height. Building massing is not a surveyed model or Apple Flyover. Verification must identify actual loaded/rendered counts and sampled views; screenshots alone do not establish every gesture, all campus geometry or performance across devices.

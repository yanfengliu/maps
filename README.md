# Bay Area Maps

An Apple Maps-inspired exploration of San Francisco Bay, with 3D campus buildings at Stanford University. The regional map uses custom warm cartography over OpenFreeMap's OpenMapTiles data. Regional buildings stay flat; only the supplied Stanford footprints are extruded.

## Run locally

Use Node 24 (the exact development version is in `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the localhost URL Vite prints. The app needs internet access to `tiles.openfreemap.org` for regional tiles and labels. Stanford GeoJSON is served locally from `public/data/`. Its source details and preparation command are recorded in `public/data/stanford-provenance.json` and the data tooling.

```sh
npm run typecheck
npm test
npm run build
npm run audit
```

`npm run preview` serves the production build on localhost. `dist/` includes the campus data; the regional basemap remains an external service.

## Explore

The first view frames the Bay's coast from San Francisco to San José. Choose **Explore Stanford in 3D** to fly into the campus. Click a campus building for its source height information. Search covers curated Bay destinations and named campus buildings; it is a local index rather than an internet geocoder.

On mobile, the places panel starts compact so the Bay stays visible, with search and a direct **Explore Stanford** action. Expand the panel to browse places and building details. The overview uses absolute viewport padding so returning to the Bay restores the same framing after visiting another place.

- Drag to pan, scroll or pinch to zoom, and double-click to move closer.
- Right-drag or Ctrl-drag gently rotates and tilts. Middle-drag up/down adjusts tilt without changing bearing. Touch supports two-finger rotation and tilt.
- Hold WASD to pan continuously while the map has focus; release to stop. Mouse and touch gestures take priority, then held-key panning resumes. Arrow keys pan, + / − zoom, Option/Alt + left/right rotates, and Shift + up/down tilts when the map has focus.
- Click the compass to face north; drag it horizontally to rotate or vertically to tilt.
- The 2D/3D button and tilt slider change perspective. **Bay Area** returns to the coast overview.

Reduced motion is respected. A WebGL-capable browser is required. Loading failures show a retry action rather than silently substituting a made-up map.

## Data and model bounds

The campus uses real OpenStreetMap footprints, including multipolygons and courtyards. Mapped heights are used where present; mapped floor counts and missing heights use documented estimates. Memorial Church has a dedicated exterior; Stanford photographs ground the Main Quad, Hoover Tower, Bing Wing and Roble Hall treatments. Sandstone, terracotta and muted windows keep an illustrated map palette. Building cards distinguish OSM levels, official descriptions and estimated facade rows; exact window counts across campus remain unknown. See the [photo references and model limits](docs/work/0_bay-area-stanford/architecture-references.md).

Original source geometry, heights and provenance stay intact. A render-only subtraction removes the church from the overlapping Main Quad outline so both models remain visible while all original courtyard areas stay empty. Most ordinary buildings still use estimated architectural profiles.

Architectural geometry is generated in a worker only when approaching campus, then rendered in two batched draws with zoom/distance detail control. Shader preparation runs ahead of the flight, using nonblocking completion where available. The [detail and performance record](docs/work/0_bay-area-stanford/detail-performance.md) gives measurements and their hardware bounds.

Map data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [OpenMapTiles](https://openmaptiles.org/), and [OpenFreeMap](https://openfreemap.org/). Attribution also appears on the map. The public service and its current source metadata are used as documented in the [OpenFreeMap quick start](https://openfreemap.org/quick_start/); dated tile URLs are not hardcoded.

For headless verification, `window.__bayMap` is a frozen object with read-only getters: `camera` (`center`, `zoom`, `pitch`, `bearing`), `ready`, `campusBuildings`, `renderedBuildings`, `heightSources`, `sources`, `selectedBuilding`, `errors`, `details` (lazy geometry/shader readiness, build/upload timing, triangles/bytes and current draw calls), and `rendering` (bounded render-event timestamps, motion timestamps and pixel ratio). It exposes no MapLibre instance or camera setters. `ready` requires local campus data, a loaded style, settled tile requests, at least one successful regional tile event, and no active reported error; architectural readiness is separately reported by `details.ready`. Browser flow checks must still use real controls and inspect the rendered map. Render-event cadence is not display-refresh telemetry.

## Previous project

The current product direction and contribution checks are in [local rules](docs/policies/local-rules.md). The first increment's acceptance and verification are in [the plan](docs/work/0_bay-area-stanford/plan.md).

The previous Shibuya project is preserved on [codex/shibuya-archive-2026-10-19](https://github.com/yanfengliu/maps/tree/codex/shibuya-archive-2026-10-19) at commit e93f56711a5b629481c1512a89058c2823017840.

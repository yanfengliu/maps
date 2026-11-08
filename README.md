# World Maps

An Apple Maps-inspired world map that starts at Stanford University, the first campus with authored 3D detail. The regional map uses custom warm cartography over OpenFreeMap's OpenMapTiles data. Regional buildings stay flat; only the supplied Stanford footprints are extruded.

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

The app starts at Stanford. **World** zooms out to a globe, and the Stanford and Memorial Church shortcuts return to the detailed campus. Click buildings for their source height information, or open Memorial Church's roofless interior while the surrounding map remains visible.

Typing shows local campus suggestions. Press **Enter** or **Search worldwide** to query Photon's OpenStreetMap index; click a suggestion or select one with the arrow keys and press Enter to navigate directly. Worldwide search is not a complete index of real places. Missing businesses, addresses and landmarks may return no results. Requests are explicit, paced and cached; the public service has no availability guarantee. See [Photon's service policy](https://github.com/komoot/photon#demo-server).

- Drag to pan, scroll or pinch to zoom, and double-click to move closer.
- Right-drag or Ctrl-drag gently rotates and tilts. Middle-drag up/down adjusts tilt without changing bearing. Touch supports two-finger rotation and tilt.
- Hold WASD to pan continuously in every map mode; release to stop. Text inputs keep normal typing behavior. Mouse drag, rotation, middle-button tilt and wheel zoom work at the same time as held WASD. Arrow keys pan, + / − zoom, Option/Alt + left/right rotates, and Shift + up/down tilts when the map has focus.
- Click the compass to face north; drag it horizontally to rotate or vertically to tilt.
- The 2D/3D button and tilt slider change perspective. **World** returns to the globe.

Reduced motion is respected. A WebGL-capable browser is required. Loading failures show a retry action rather than silently substituting a made-up map.

## Data and model bounds

The campus uses real OpenStreetMap footprints, including multipolygons and courtyards. Mapped heights are used where present; mapped floor counts and missing heights use documented estimates. Memorial Church has a dedicated exterior; Stanford photographs ground the Main Quad, Hoover Tower, Bing Wing and Roble Hall treatments. Sandstone, terracotta and muted windows keep an illustrated map palette. Building cards distinguish OSM levels, official descriptions and estimated facade rows; exact window counts across campus remain unknown. See the [photo references and model limits](docs/work/0_bay-area-stanford/architecture-references.md).

Original source geometry, heights and provenance stay intact. A render-only subtraction removes the church from the overlapping Main Quad outline so both models remain visible while all original courtyard areas stay empty. Most ordinary buildings still use estimated architectural profiles.

The campus environment uses 726 mapped tree positions, 80 lamps and 196 seating feature assemblies: 163 original bench points, 25 mapped bench paths and eight explicitly derived Quad seat walls. Known seating materials and photo-supported forms have solid geometry; 127 material-unknown points and 23 material-unknown bench paths use neutral, untextured raised seats with solid supports at their mapped positions. These fallback designs remain unverified estimates, with backs only when tagged. Bench dimensions, absent facing and the side of a path's back remain estimates. See the [bench source and model bounds](docs/work/0_bay-area-stanford/design.md#stanford-bench-accuracy--2026-10-20). Palms, broadleaf trees and conifers retain distinct batched silhouettes and modeled sizes. Historic sandstone/tile, Roble's pink stone/ivy and modern light roofs retain separate materials. The [environment and material record](docs/work/0_bay-area-stanford/campus-environment.md) describes tree and lamp selection, exclusions and model limits.

Two [photo-grounded outdoor sculptures](docs/work/0_bay-area-stanford/design.md#stanford-sculpture-increment) use mapped location anchors: the Burghers' six separate bronze figures/plinths and the Angel's bowed pose, long wings, altar and steps. Their proportions, poses and orientation are stylized estimates. Buildings, seating, planting and sculpture share the existing two GPU batches and lazy sliced upload; this remains an illustrated map, not a mesh scan or physical survey.

Architectural geometry is generated in a worker only when approaching campus, then rendered in two batched draws with zoom/distance detail control. Shader preparation runs ahead of the flight, using nonblocking completion where available. The [detail and performance record](docs/work/0_bay-area-stanford/detail-performance.md) gives measurements and their hardware bounds.

Map data: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [OpenMapTiles](https://openmaptiles.org/), and [OpenFreeMap](https://openfreemap.org/). Attribution also appears on the map. The public service and its current source metadata are used as documented in the [OpenFreeMap quick start](https://openfreemap.org/quick_start/); dated tile URLs are not hardcoded.

For headless verification, `window.__bayMap` is a frozen object with read-only getters: `camera` (`center`, `zoom`, `pitch`, `bearing`), `ready`, `campusBuildings`, `renderedBuildings`, `heightSources`, `sources`, `selectedBuilding`, `errors`, `details` (lazy geometry/shader readiness, build/upload timing, triangles/bytes and current draw calls), and `rendering` (bounded render-event timestamps, motion timestamps and pixel ratio). It exposes no MapLibre instance or camera setters. `ready` requires local campus data, a loaded style, settled tile requests, at least one successful regional tile event, and no active reported error; architectural readiness is separately reported by `details.ready`. Browser flow checks must still use real controls and inspect the rendered map. Render-event cadence is not display-refresh telemetry.

## GitHub Pages

The [published map](https://yanfengliu.github.io/maps/) is built by `.github/workflows/pages.yml` after main changes or a manual run. The workflow uses Node 24, runs types/tests/audit/build, and publishes only `dist/`. Source photographs retained for research, screenshots, local logs and development dependencies are not included. Basemap tiles and worldwide search remain external services.

For the same project-path build locally, run `npm run build -- --base=/maps/` and `npm run preview -- --base=/maps/`, then open the printed URL with `/maps/`. Public data, worker inputs, artwork and attribution links all use Vite's deployment prefix. The default build still works at `/`.

## Previous project

The current product direction and contribution checks are in [local rules](docs/policies/local-rules.md). The first increment's acceptance and verification are in [the plan](docs/work/0_bay-area-stanford/plan.md).

The previous Shibuya project is preserved on [codex/shibuya-archive-2026-10-19](https://github.com/yanfengliu/maps/tree/codex/shibuya-archive-2026-10-19) at commit e93f56711a5b629481c1512a89058c2823017840.

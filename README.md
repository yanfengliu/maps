# maps

Turn real-world 3D map data into a simulated Shibuya scene with Vite, three.js and TypeScript. The first deliverable covers roughly 1 km² and is incomplete. [The Shibuya plan](docs/work/0_shibuya-1km/plan.md) owns current acceptance, limits and next work; dated reviews preserve history.

## Run locally

Use Node 24 from `.nvmrc`, run `npm ci`, then restore or prepare the data described in [Setup and cached inputs](docs/reference/setup.md). Run `npm run dev` and open `http://127.0.0.1:5319`. For a production build, run `npm run build` then `npm run preview` at `http://127.0.0.1:4319`. Both ports are strict.

The repository alone is insufficient for the complete scene: map outputs, the admitted rail packet and reviewed human assets live outside Git. `data:setup` does not recreate every prerequisite, and `dist/` is not self-contained.

## Explore

- Drag with the left or middle mouse button to orbit; right-drag to pan; wheel to zoom. Held WASD pans along the ground relative to the view. Click the canvas after using UI controls to return keyboard focus.
- **World style** switches Satellite/Cartographic while preserving the camera and simulation. Satellite is the current detailed quality focus.
- For a city-only view use `?agents=0`. `?time=noon` changes lighting; `?style=cartographic` selects the other style. [Query options and preparation](docs/reference/setup.md#startup-and-query-options) describe explicit population requests and their limits.

The required 3,000 animated pedestrians, 200 vehicles and 60 fps at 1920×1080 remain unqualified; the ordinary singleton is not that population.

## Cached local walker

Ordinary startup uses Satellite at dusk, seed 5970698, zero generic actors and one held local walker when its packet is prepared. Press **Start walking** when enabled. The camera remains independent of the walker. [Preparation and limits](docs/reference/setup.md#cached-local-walker).

## Documentation

- [Setup and cached inputs](docs/reference/setup.md) — running, data producers, walker preparation, serving and test prerequisites.
- [Local rules](docs/policies/local-rules.md) and [AGENTS.md](AGENTS.md) — repository requirements, workflow and verification.
- [Data and coordinates](docs/work/0_shibuya-1km/design.md) — source provenance and conversion decisions; [network](docs/reference/network-contract.md), [pavement](docs/reference/pavement-recipe.md), [facade emission](docs/reference/facade-emission.md) and [agent assets](docs/reference/agent-assets.md) describe implementation contracts.
- [Fixture provenance](test/fixtures/README.md), [defects](docs/learning/defect-register.md), [queued lessons](docs/learning/lessons.md) and [gate proofs](docs/learning/gate-proofs.md) retain bounded evidence. [Devlog](docs/devlog/summary.md) records dated changes.

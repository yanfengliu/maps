# Bay Area map and Stanford 3D

Status: active
Owner: root integration
Created: 2026-10-19
Updated: 2026-10-30

Migration note: this plan restructures the original `docs/work/0_bay-area-stanford/plan.md` into the current plan format. The original is git blob `59b480ca55168d5b434dbd14bf0a5e4d5fa9dbed`, 4,844 bytes, SHA-256 `fc9836d5c98d292e1aeb75678b5eab21af837679cc78674e2649e5779af2fd39`. It entered `main` in integration merge `7c6097e18efd712d741f66772588ee5acc3a3741` and is unchanged through `7e43b5d056da66512c1ab0556ebc27568b42887b`. `git show 7c6097e:docs/work/0_bay-area-stanford/plan.md` recovers it. Its metadata line was split: `Started` became `Created`, `Owner` is unchanged, `Base` opens Implementation steps and the status sentences are quoted under Outcome. Every other original sentence and table row is kept word for word, and the subheadings are original headings. Paragraphs marked "Migration note", and the list after one, are added. In the original's text, "this increment" and "this acceptance" mean the first increment. The `plan.md` line citations in `reviews/1_integrated-review.md` and `reviews/2_focused-review.md` use the original's line numbers, which are the same at plan base `9995b1b`.

## Problem and outcome

Build a runnable map inspired by Apple Maps: the real San Francisco Bay Area coastline, regional map context and smooth map navigation. Build 3D buildings only for Stanford University's main campus. Begin at a regional overview and provide a clear flight into the campus.

Migration note: the original states this intended result and no separate problem.

## Scope

Navigation means camera movement and finding places: pan, zoom, rotation, tilt, north reset, 2D/3D and local place search. Route planning, turn-by-turn directions, satellite imagery, live traffic, photorealistic Flyover and other cities' 3D buildings are outside this increment. No Apple imagery or credentials are required. Keep the prototype local; publication needs a separate instruction.

The former Shibuya project remains on `codex/shibuya-archive-2026-10-19` at `e93f56711a5b629481c1512a89058c2823017840`. Do not alter it or its retained local resources.

## Approach

### Shared contract

MapLibre GL renders public OpenFreeMap vector tiles with a custom light map style. Local `public/data/stanford-buildings.geojson` supplies Polygon/MultiPolygon footprints. Each feature has `id`, `name`, metre-valued `height` and `base`, `heightSource` (`osm-height`, `osm-levels` or `estimated`), `color` and `roofColor`. `stanford-campus.geojson` defines the admitted campus boundary. `stanford-provenance.json` records sources, licences, fetch dates, counts, hashes and estimates. Root must verify the final contract rather than trust handoff summaries.

### Current limits

The base map depends on the public OpenFreeMap service. Stanford building heights may be derived from levels or estimated when OSM has no height. Building massing is not a surveyed model or Apple Flyover. Verification must identify actual loaded/rendered counts and sampled views; screenshots alone do not establish every gesture, all campus geometry or performance across devices.

## Acceptance criteria

- The first view recognizably depicts the real Bay Area, with coastline, water, roads and place labels.
- Exploring Stanford flies to real campus building footprints and visible 3D massing; no off-campus 3D is rendered.
- Desktop mouse/keyboard controls and mobile layout work through actual controls. Search, place selection, zoom, compass, tilt and 2D/3D have useful behavior and accessible names.
- Footprint source and height estimates are disclosed; required attribution remains visible. Network failure produces an actionable error.
- Production build, types, meaningful unit/data checks and dependency audit pass. Inspect headless screenshots at desktop and mobile sizes, multiple Stanford angles and the regional overview. Exercise real control paths and inspect browser errors and actual loaded data.
- Obtain independent read-only review on the integrated revision. Fix material findings, repeat affected checks, merge to `main`, push and verify remote refs. Preserve the old archive ref exactly.

Migration note: these are the original's criteria for the first increment. This plan records none for later or remaining work.

## Implementation steps

Base: `2d1883392a04c932a18136b59d43dea05fd17fb2`.

| Outcome | Owner | State and dependencies |
| --- | --- | --- |
| Map, controls and interface | bay_area_app | Complete through `475e28e`; all material review findings repaired. |
| Actual Stanford footprints and provenance | stanford_data | Complete through `62a2507`; 648 real footprint/part features and an actual campus boundary. |
| Integration, visual checks and acceptance | root | Accepted within the bounds in [the integration record](integration.md); final delivery merges to main and removes task-owned worktrees. |

Implementation checkouts lived under ignored `artifacts/bay-area-stanford/` and use real owned dependencies, never links to the previous project. Root serialized browser verification and closed every browser/server in a finally cleanup path. Retained screenshots, source cache and evidence ownership are described in the integration record.

Migration note: work continued in this folder after `7c6097e` without updating the original, and this plan records no steps for remaining work. The original links only the integration record. This migration links every record in the folder, grouped by the commit that added it. Each record stays unchanged at its path.

- `7c6097e`: [integration.md](integration.md), [reviews/1_integrated-review.md](reviews/1_integrated-review.md), [reviews/2_focused-review.md](reviews/2_focused-review.md)
- `38eb59a`: [startup.md](startup.md), [reviews/002_startup.md](reviews/002_startup.md)
- `e9a9cb6`: [detail-performance.md](detail-performance.md), [reviews/003_detail-performance.md](reviews/003_detail-performance.md)
- `cd5ade1`: [navigation-startup.md](navigation-startup.md), [reviews/004_navigation-startup.md](reviews/004_navigation-startup.md)
- `89cb74e`: [held-input-architecture.md](held-input-architecture.md), [reviews/005_held-input.md](reviews/005_held-input.md)
- `89fc3e8`: [architecture-references.md](architecture-references.md), [reviews/006_architecture.md](reviews/006_architecture.md)
- `f9d803e`: [simultaneous-environment.md](simultaneous-environment.md), [campus-environment.md](campus-environment.md), [reviews/007_simultaneous-input.md](reviews/007_simultaneous-input.md), [reviews/008_campus-environment.md](reviews/008_campus-environment.md)

Added 2026-10-30: the bench accuracy and campus sculpture increment was written on 2026-10-20 and neither gated nor reviewed then. It was parked as `584733e` on 2026-10-29, merged onto `main`'s `d683dac` in `7dba7ab`, and repaired in `8e45ed8`, `5c9f24b`, `a2486a8`, `c5483cd` and `649d7c2` after review rounds 9 to 13. It merged to `main` on 2026-10-30, with its three notes folded into [design.md](design.md). Its review rounds are [reviews/9_integration.md](reviews/9_integration.md) to [reviews/14_integration.md](reviews/14_integration.md).

## Outcome

Migration note: this migration sets `Status: active`, and the unit's outcome is pending. The original's status sentences cover only the first increment. Later records in this folder leave an acceptance item open: [held-input-architecture.md](held-input-architecture.md) has a section headed "Embedded-browser acceptance still open", and [simultaneous-environment.md](simultaneous-environment.md) says actual embedded-browser recovery "remains an unresolved earlier defect".

Migration note: the original's status sentences read "Status: first increment implemented, verified and independently reviewed. Delivery is the integration commit containing this record; no further product scope is queued." There, "this record" is the original plan; the integration commit that first contains it is `7c6097e`, a merge of plan `9995b1b`, app `475e28e` and data `62a2507`. The integration record holds that increment's verification, review rounds and bounds. Quoting the status is history, not a new verification claim.

Added 2026-10-30: the bench accuracy and campus sculpture increment is merged. The 163 mapped bench points keep their source tags and coordinates. 25 mapped bench ways and eight authored Inner Quad seat walls are added. Material and backrest follow their tags, and a bench of unknown material is a flat neutral marker, as 23 of the 25 ways are. Facing follows a `direction` tag, or else is estimated by the rule in [design.md](design.md#modeled-facing). Rodin's Burghers of Calais and the Angel of Grief stand at their mapped anchors, searchable, with flights at zoom 21.1 under a native maximum of 21.5. The campus detail mesh is 153,765 triangles and 23,987,340 bytes in its two draws. The integrated revision named in [review 14](reviews/14_integration.md) passed typecheck, 65 unit tests, build with only MapLibre's chunk-size warning and audit with 0 vulnerabilities on Node 24.18.1. It also passed a native check of 17/17 through real controls at 1920×1080 and 390×844. 23 regression checks each went red with their defect put back. Rounds 9 to 13 each ran both review lanes, and review 14 records the review of the integrated revision. [design.md](design.md) records the design and the [limits the reviews left](design.md#limits-the-reviews-recorded).

### Accepted result

The real Bay Area opens in a custom light map style. Stanford has 648 locally served footprint/part features, with 81 mapped height tags, 80 floor-count estimates and 487 default-height estimates. Main Quad courtyard holes and Hoover Tower's stepped mapped parts are retained. Search, mouse/keyboard controls, touch pan/pinch, compass, 2D/3D, tilt, building details, consistent desktop/mobile Bay returns and both regional/local-source Retry flows passed bounded real-control checks. Build, types, 13 unit/data tests and audit passed; the MapLibre chunk-size warning remains. The first increment is an exploratory campus massing model. Routing, physical-device/Safari verification and a broad performance claim are not part of this acceptance.

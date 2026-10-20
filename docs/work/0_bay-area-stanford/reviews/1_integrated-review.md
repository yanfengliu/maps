# Independent integrated review, round 1

Reviewer: independent read-only reviewer using the fleet review model pin. Date: 2026-10-19, California.

Reviewed staged tree `98c6c130f102208a8df801349f3d83993938f6c9`, base `9995b1bd5f22be154e5cb441c010f99658046da6`. The reviewed source is reconstructible from the committed app `2515294`, data `62a2507` and plan `9995b1b`; these source commits are retained in the final integration ancestry. Source citations below refer to that reviewed version, before repairs. The report body preserves the reviewer's findings and bounds; absolute scratch-checkout links were replaced by repository-relative paths.

## Authored report

Fixes required. Two confirmed P2 findings; no P1 found.

- **IR-1 — P2: Mobile starts with the map obscured.** `src/main.ts:16` creates the expanded sidebar at every width. At 390×844, `08-bay-mobile.png` shows it occupying approximately 310×630 pixels and hiding the Bay's main geography; the visible map mostly shows the southern fringe. Start mobile in a compact state with an immediately available Stanford action. Centralize compact-state updates: `src/main.ts:112` currently changes only the class, leaving the collapsed panel's minus icon, “Collapse places,” and `aria-expanded="true"` unchanged. Verify that selecting a mobile building can reveal its details.
- **IR-2 — P2: Bay overview framing depends on previous navigation.** `src/main.ts:94` calls `fitBounds` with additional padding after `src/main.ts:101` has persisted `flyTo` padding. Native images `01` and `07` visibly differ: the return view shifts the Bay rightward and zooms farther out, leaving excessive ocean. The supplied camera observations corroborate this: initial zoom `9.010`, return `8.486`. Pinned MapLibre's `camera.ts:700–709` combines existing and requested padding unless `absolutePadding` is enabled. Use consistent absolute padding and verify initial, returned, and repeated overview camera poses match.
- **IR-3 — conditional P2, awaiting runtime reproduction: Retry may preserve a failed regional source.** `src/main.ts:361` resets the successful-tile counter and calls `setStyle(createStyle())` using default style diffing. The OpenFreeMap source remains unchanged, so this does not necessarily initiate another failed `/planet` or tile request. Inject an initial regional-source failure, restore connectivity, and click Retry; require a fresh request and restored readiness. If reproduced, force source recreation, for example `setStyle(createStyle(), { diff: false })`. This is a source-grounded concern, not a claimed observed failure.

The unchanged acceptance-plan citations are `docs/work/0_bay-area-stanford/plan.md:7` for recognizable regional-first presentation and `plan.md:31` for useful, accessible desktop/mobile controls.

Coverage: read the application, cartography, search, CSS, data converter, provenance, and tests; inspected all nine original screenshots at native resolution. Regional building layers remain flat; the extrusion sources are the local campus dataset. The supplied 648 features distinguish 81 mapped heights, 80 floor-count estimates, and 487 defaults. Inspected views show Main Quad courtyard openings and Hoover Tower's stepped parts. Desktop regional and campus composition is coherent, subject to IR-2. No source mutations, browsers, servers, or additional test runs were performed. Gesture success and full build/test results remain root's verification evidence; screenshot review does not establish every geometry or interaction.

Inspected image SHA-256 values, originally under ignored `artifacts/bay-area-stanford/output/playwright/`:

| Image | SHA-256 |
| --- | --- |
| `01-bay-area-desktop.png` | `53345cb55f3a570d7a6376dcc4cac4d9bd8736d97b6b1433847f77c5d91d3332` |
| `02-stanford-campus-desktop.png` | `bee848639024b8a230d6c1049209ccb3118192dfd27f04e6df928b76f9218a34` |
| `03-main-quad.png` | `e8f44b373ca98e276da233ed0ae4ebf049a0175cb6584e3b2c382ab2a19ac039` |
| `04-main-quad-rotated.png` | `271ccff260e9e96e76bd651227d437f829566184e3dc03de46542e2e5df77281` |
| `05-stanford-overhead.png` | `94532f48a5a31175a013af306d934889f2393a15a56fc46314175f37f04122fb` |
| `06-hoover-tower.png` | `2bdadd28ea4fc6751c0a8113adb4bc2630bd75ee6c3307dc39f3633c75a40183` |
| `07-bay-return.png` | `190ee55dc587ecaee7b19904733d054833736ed5fb5a10dcb6203e3d147aa6fe` |
| `08-bay-mobile.png` | `277965c74da40650270f56ec086036f625197f279784d0c13eabd9b92989e195` |
| `09-stanford-mobile.png` | `1e40bba6b53b23d8e458df7707ac43c16314a7aaebcefa731323f028ed1c07af` |

## Owner disposition

IR-1 and IR-2 accepted and repaired in app commit `b6a8761`. Root's second-pass browser flow confirms a compact mobile start, synchronized accessibility state, a visible Stanford action, and matching initial/returned/repeated Bay camera poses. IR-1's mobile building-details path was additionally repaired in `528c277`.

IR-3 was independently reproduced by root after the report's source inspection: blocking the regional service, restoring network access and clicking Retry left `successfulRegionalTiles=0`, readiness false and a timeout after 30 seconds. App commit `528c277` forces source recreation and starts a fresh retry deadline. Actual recovery verification and focused independent re-review are recorded in the next round; this original report remains a request for fixes.

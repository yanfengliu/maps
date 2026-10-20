# Bay Area and Stanford integration

Date: 2026-10-19, California. Integration owner: root. Product source: app `475e28e` plus data `62a2507`, combined with plan `9995b1b`. Exact pre-documentation product tree: `4883dc7aacdb5957d645a6e32bde8da26e55212d`. The commit containing this record integrates those source commits and retains their history.

## Result

The initial view is a real San Francisco Bay Area vector map with public coastline, roads, parks and labels. A custom light palette, floating search panel and camera controls provide an Apple Maps-inspired experience. Explore Stanford flies to a campus-only 3D layer. The local index includes curated Bay destinations and named Stanford buildings; it is not a global geocoder or a routing service.

The Stanford dataset contains 648 actual OSM footprints and building parts: 81 recorded-height tags, 80 heights estimated from recorded levels and 487 type-based defaults. The actual campus perimeter excludes neighboring Palo Alto. Main Quad retains seven courtyard holes; Hoover Tower retains eight stepped parts and its recorded 87 m height. The model uses sandstone-colored walls and simple terracotta roof caps, without claiming architectural roofs, textures, survey accuracy or Apple Flyover. Provenance, licensing, omissions and the retained asset-size reason are in `public/data/`.

## Verification

- Node 24.12.0; exact dependency versions and lockfile retained. Production build, separate typecheck, all 13 unit/data tests and dependency audit pass; audit reports zero vulnerabilities. Vite warns about the 1.09 MB map-renderer main chunk (about 301 KB gzip) and emits a separate 517 KB worker. No repository CI workflows are configured; remote CI is not an additional verified lane.
- Root independently checked all four official OSM XML extract hashes, then reran the actual converter from those inputs. The generated building and campus files exactly match the literal admitted SHA-256 values in the data tests and provenance. No raw source XML is tracked.
- Headless Chromium 1243 rendered on ANGLE/NVIDIA GeForce RTX 4090/Direct3D11. Desktop 1440×960 and mobile-layout 390×844 originals were inspected at native resolution. Regional overview, campus, Main Quad, rotated/overhead views, Hoover Tower, return overview and mobile states were covered. These are sampled views, not an inspection of every building.
- Actual pointer/wheel and keyboard inputs verified pan, scroll zoom, zoom buttons, double-click zoom, right-drag rotation/tilt, compass click/drag, arrow pan, Alt rotation, Shift tilt, 2D/3D and the tilt range. Search input retains arrow-key focus, supports Enter/Escape and a useful no-result state. Oakland selection reaches its real coordinates; Hoover selection shows 87 m as a mapped height. A direct canvas building click opens source details.
- Synthetic Chromium touch input verified one-finger mobile pan and two-finger pinch through the map's real input handlers. The observed pinch changed zoom 15.8 to 16.663. This is not physical-device or Safari verification. Mobile starts compact with a visible Stanford action, and selected building details open visibly with synchronized accessibility state.
- Regional loading was deliberately blocked, then restored. Retry rebuilt the failed source and recovered from zero successful tile events to 12 with readiness true. A deliberate local GeoJSON HTTP 503 separately produced the named local-data error; restoring the file and clicking Retry recovered campus readiness. The one expected console HTTP 503 is failure-injection evidence, not an unexpected runtime error.
- Desktop initial/returned/repeated Bay poses agree at center `[-122.18, 37.64130299719848]`, zoom `9.010226514308767`, pitch/bearing 0, within floating-point rounding. Final mobile initial/returned poses agree exactly at the same center, zoom `7.759404181314263`. Returning from mobile building details compacts the panel; Stanford remains directly reachable afterward. Ordinary final flows have no page or console errors.
- Reduced-motion mode reaches the selected camera pose without the authored flight duration. The observer is frozen and exposes no camera mutations. All flow tests used real controls; camera observations alone were not treated as proof of the skipped input path.

## Review and repairs

The independent [first review](reviews/1_integrated-review.md) found mobile obstruction/state and inconsistent overview framing, plus a source-grounded retry concern. Root reproduced the retry failure. The [focused re-review](reviews/2_focused-review.md) records final disposition. All material findings are closed for this increment.

Before that review, the first real render caught seven invalid nested zoom expressions in road widths. The map had rejected the style before requesting any regional tiles. The actual MapLibre validator reproduced the errors; the public style test now validates the shipped style, and a retained negative control rejects the old expression shape. Unknown style errors now surface instead of silently resembling slow network access.

The first auxiliary search-focus assertion sampled an unfinished preceding tilt animation and falsely attributed its remaining motion to the search key. Root corrected the instrument to settle the prior animation before comparing the input path. The product search handler needed no change for that probe. Mobile initial fit required applying viewport padding before a zero-duration fit, because the pinned library otherwise clamped the initial center against maxBounds before applying padding. The final actual mobile loop verifies the corrected initial and returned poses.

## Retained local resources and cleanup

Ignored `artifacts/bay-area-stanford/output/playwright/` contains delivered native screenshots. The `v3-*` series records the core rendered/control checks after the main fixes; `v4-10-mobile-building-details.png` and `v4-11-mobile-bay-return.png` qualify the final mobile closure on `475e28e`. Flow result JSON and the controlled failure evidence remain under the same task output root. Their hashes are retained with the authored review and final local manifest.

The four exact raw XML inputs are intentionally retained under ignored `artifacts/bay-area-stanford/stanford-source/` for offline regeneration; their hashes match the public provenance. Use the documented converter's `--cached --source-dir` option for that cache. The public runtime requires only the checked-in GeoJSON, plus the external regional tile service.

Task-owned app, data, review and integration checkouts and their branches are removed after merging. Every browser/context, automation session and hidden preview is closed; final cleanup verifies process ownership. Unrelated old worktrees, caches, prior archives and processes are preserved. The Shibuya archive remains exactly `e93f56711a5b629481c1512a89058c2823017840`.

## Bounds

No hosted Site or deployment was created. Regional tiles and map glyphs require OpenFreeMap availability; interface web fonts also load remotely with system fallbacks. Local Stanford geometry loads from the built app. The app has not been qualified for offline mapping, Safari, a physical phone, exhaustive accessibility compliance, every gesture variant or a cross-device frame-rate target. The independent review and headless flows support this first Bay Area/Stanford increment, not feature parity with Apple Maps.

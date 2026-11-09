# Review 27: implementation

## Target

Exact maps commit 7eb1d5125d794cb23bafc5bb9c9b790c42a2eef1 against 981bf62e83c9d2ddff5634839c124f0b914e8929. Scope: true-scale regional terrain, rigid campus grounding, complete eligible roads, landscape, traffic-control symbols, marker legibility and roof material coordinates.

## Reviewers and coverage

Independent terrain_ground_review, GPT-6 Astra at xhigh, performed read-only source and native-evidence inspection. Its first attempt was unavailable due usage limits; after the owner's reset the substantive review completed. The fallback Claude smoke check returned expired OAuth and produced no review; no second review lane is claimed. Root operated all native probes. No reviewer files or processes were created.

## Reports

### terrain_ground_review

Reviewed 7eb1d5125d794cb23bafc5bb9c9b790c42a2eef1 against 981bf62e83c9d2ddff5634839c124f0b914e8929. One material finding; revision needs correction.

F46 — P2: Preserve rigid-object elevations when their anchors leave the viewport. src/terrain-grounding.ts:148–150 redraws the full-campus height texture each frame through renderTerrainHeightMap. The installed MapLibre implementation clears that texture, then paints only currently renderable terrain tiles (node_modules/maplibre-gl/src/webgl/draw/draw_terrain.ts:77–92). Buildings and stadium components sample their shared anchor (src/terrain-grounding.ts:103–109), so moving that anchor outside the current tile coverage invalidates their elevations. src/building-details.ts:122 then discards their geometry, while the unchanged surrounding caller still hides native shells based solely on geometry readiness (src/quad-arcade-visibility.ts:18–29).

Root reproduced this through native controls at center [-122.161929,37.4337265], zoom 21.5, pitch 0. I independently inspected output/playwright/stadium-pressbox-anchor-test.png at original resolution: the pressbox disappears, leaving its flat underlying footprint. The shared stadium datum is roughly 100 metres away; a flat 1600-pixel viewport at that zoom spans only 33.53 metres. The DEM's maximum source zoom does not prevent this, because the height pass paints smaller viewport terrain meshes.

Retain or independently obtain valid anchor elevations beyond viewport coverage, with explicit unavailable state and bounded resource ownership. Regression coverage should include close views away from assembly anchors, fresh arrival without a previously sampled anchor, and context restoration.

No other material finding identified. Coverage included terrain/GPU lifecycle, native restoration contracts, road source loading and retries, source inventory and geometry preservation, landscape clearances, traffic symbols, marker styling, roof UVs, and surrounding caller code outside the diff. I inspected all ten supplied native acceptance images plus three retained photographic references.

Existing logs show 265 passing tests, successful build/types/docs checks, and zero audit vulnerabilities; expensive gates were not rerun. Direct Node imports of MapLibre's internal tile-coverage code encountered TypeScript loading limitations; installed-source inspection and the native reproduction supplied the decisive evidence instead. Performance evidence remains limited to the named RTX 4090 sample. This review does not certify every building, current planting appearance, East Wing architecture, or the 579 unreferenced parts.

No reviewer edits or browser/server processes were created. The pending plan edit belongs to root.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F46 | Offscreen rigid anchors discard visible custom building geometry | Accepted; actual close pressbox disappearance confirms the installed renderer contract | Grounding repair and fresh-arrival/context native regression required; re-review the exact repaired revision in round 28 |

## Verification

Root's gates on the reviewed code: 265 tests, typecheck, production build, npm audit with zero vulnerabilities, complete geometry/source audit and work-document checker passed. Native fixed/opposite/random views, phone, region peaks, Retry and graphics restoration passed their original scopes; the additional pressbox edge view failed visual acceptance despite ready=true and no application errors. Retained evidence is under ignored artifacts/realism-references-20261108/output. The screenshot is negative evidence, not a passed acceptance image.

## Round outcome

Closed with F46 requiring repair before publication. All broader photographic and reference limitations remain explicit. Subsequent repaired code needs separate exact-revision review.

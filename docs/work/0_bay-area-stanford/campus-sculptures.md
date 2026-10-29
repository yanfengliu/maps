# Stanford sculpture increment

2026-10-20. Owner: campus_statues. Base: `e09d65bfc98b302b050c70b804fd905481c83afa`. Scope: two researched outdoor works, a lazy local worker input, existing two-buffer renderer and existing search/fly controls. Bench correction is owned separately. No new dependencies, external model downloads, image textures or regional 3D content.

## Reviewed works and source boundary

| Work | Location basis | Modeled form | Primary references |
| --- | --- | --- | --- |
| The Burghers of Calais, Auguste Rodin | Pinned OSM node `5648594207`, version 4; `[-122.1699656,37.4280031]`; Memorial Court | Six separate bronze plinths, varied robe lengths, folded cloth volumes, bent heads, arms raised toward faces and different walking stances | [Stanford/Cantor location and attribution](https://news.stanford.edu/stories/2017/08/stanfords-cantor-arts-center-offers-fresh-look-rodin); [Robert Siegel's Stanford photographs](https://web.stanford.edu/~siegelr/art/rodin.html) |
| Angel of Grief, after William Wetmore Story | Pinned OSM node `6477042804`, version 1; `[-122.1688001,37.4373687]`; Arboretum | Pale marble, wide stepped base, flared altar and cornices, shallow garlands, bowed figure with hanging arm and two long folded wings | [Stanford identity, material and memorial history](https://news.stanford.edu/stories/2015/08/vandalism-angel-grief-081415); [Robert Siegel's Stanford photographs](https://web.stanford.edu/~siegelr/stanford/angelofgrief.html) |

The four original OSM extract hashes were checked before selecting these nodes. Both coordinates are inside the unchanged campus perimeter. The curated source, retained original node records, source hashes, ODbL attribution and modeling limits live in `public/data/stanford-sculptures-provenance.json`. The 610-byte GeoJSON SHA-256 is `751a0f69362573b0050989199c3713b277feb4c99fef900840838694f1dad700`. The building, boundary and original provenance inputs remain unchanged.

These are authored stylized interpretations, not scans or exact replicas. All dimensions, orientations, individual Burghers offsets around the mapped group point, anatomy and carved relief are estimates. Reference photographs remain copyrighted by their owners; no photo is shipped in the app. The indoor Thinker and other unreviewed works are excluded.

## Pixel review and attempts

Four reference photographs were inspected at native resolution through an owned headless browser, without downloading source images. Private evidence is under `artifacts/campus-statues/verification/output/playwright/`. The initial `news.stanford.edu` image requests displayed a challenge screen and supplied no usable pixels; no challenge was bypassed. The alternative Stanford faculty source loaded real 776 × 517 photographs. Both reference sessions closed, and the final exact-identity process census was empty.

| Inspected capture | SHA-256 | Observed form |
| --- | --- | --- |
| `05-burghers-group.png` | `fde87267a16059a9e3c36107764edb9e8941c3137ff820e900a2556af026eb58` | Six separate bases, distinct robe and arm silhouettes, open spacing, dark bronze |
| `06-burgher-pose.png` | `35f729f0841ca67b50945455dc6aaca3d0c151b7bf507669e571f6d8039aef47` | Raised open hand, slanted head, projecting nose/brow and beard |
| `03-angel-side.png` | `9e5edea6ac6e4f6adbcff717c5f4c2a5738d395724a4bb751b22853a0c37f562` | Long wings droop to the base; broad steps, flared altar, cornice and bowed figure |
| `04-angel-front.png` | `323e639661868e3f1e7a5545ef04e1e5ac16925bd4563934bacf637a844e58b7` | Hanging forearm, floral altar relief, shoulder/wing junction and upper drapery |

## Renderer and navigation contract

`buildBuildingGeometry(data, environment?, sculptures?)` preserves the old optional arguments. `DetailGeometry.sculptures` and frozen `BuildingDetailStats.sculptures` report work, figure and triangle counts separately from environment counts. Sculpture vertices use solid kind 12 and unselectable building sentinel −2 in the existing roof buffer. There is no extra shader, buffer, draw call, per-frame sculpture work or initial regional fetch.

The existing campus-detail worker loads the two small local inputs in parallel only after a near-campus detail request. Each has a 15-second timeout and specific network, HTTP, JSON and schema recovery messages through the existing Retry path. Context restoration reuses the cached combined geometry. Sculptures add 3,820 triangles and 595,920 vertex bytes: 2,832 triangles for the six Burghers and 988 for Angel of Grief. With the prior environment, the prototype is 152,285 triangles and 23,756,460 bytes; final integrated counts depend on the separate bench correction. The coordinator approved a 160,000-triangle guard while preserving the 24 MiB byte limit, two draws and existing sliced uploads.

The two places appear in local search without a new eager data request. An explicit consistency test binds search metadata to the curated coordinates, names, artists and materials. The campus panel opens the Burghers; each artwork panel links the other work, a Stanford source and the whole campus. Existing native camera controls remain in charge. The native maximum zoom is 21.5, with artwork flights at 21.1, so life-size models can be inspected without artificially enlarging them. The panel identifies estimates.

## Verification state

Nine targeted source/model/worker/search tests and TypeScript passed on the authored candidate. These cover pinned identities and hashes, in-campus coordinates, distinct solid silhouettes/materials, six separate supports, finite unit normals, triangle/byte bounds, frozen original source, specific worker failures and valid retry. They do not establish visual fidelity or frame rate. The coordinator will integrate bench and sculpture sources before one native headless gate on the primary localhost server, then run the required package gates and independent review on the integrated revision. The Codex embedded-browser crash is outside this increment and remains unresolved.

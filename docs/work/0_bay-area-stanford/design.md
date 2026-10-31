# Bench accuracy and campus sculpture design

This design holds the bench and sculpture increment written on 2026-10-20 and merged to `main` on 2026-10-30. It began as three notes at this folder's root: `benches-statues.md`, `bench-accuracy.md` and `campus-sculptures.md`. They were committed in `584733e` and merged in `7dba7ab`, and `git show 7dba7ab:docs/work/0_bay-area-stanford/<name>` recovers each one as written. Their text follows word for word under their own headings, each heading one level lower. The only edit is five missing spaces restored in the first note: "to 21.5", "at 21.1", "from 150,000", "to 160,000" and "the 24MiB". The notes describe the work as it stood before integration. [Integration amendments](#integration-amendments) at the end record what the reviews changed. The review rounds are [reviews/9_integration.md](reviews/9_integration.md) onward.

## Bench accuracy and campus sculpture

Started 2026-10-20. Integration owner: root. Base: local main `e09d65bfc98b302b050c70b804fd905481c83afa`. User reports inaccurate benches and requests statues. Preserve existing buildings, trees, navigation, regional loading, source caches and requested localhost servers. No publication or embedded-browser investigation is added.

| Outcome | Owner | Scope and state |
| --- | --- | --- |
| Bench source and models | bench_accuracy | Own `artifacts/bench-accuracy/worktree`. Correct material/facing semantics, physical mesh and source omissions. Existing 163 points have 132 missing materials, 30 wood and one concrete; backrests are also partly unknown. Research found 25 in-campus OSM bench ways and eight circular concrete seat walls supported by a Stanford guide, derived explicitly from mapped planter boundaries. Implementation pending. |
| Recognizable sculpture and discovery | campus_statues | Own `artifacts/campus-statues/worktree`. Burghers of Calais: six distinct freestanding bronze figures/plinths in Memorial Court. Angel of Grief: winged kneeling figure, altar and steps at its mapped location. Primary photos, source identities, modeled dimensions/orientation, two search destinations and a sculpture action. Implementation pending. |
| Independent exact-source review | bench_statue_review | Own detached `artifacts/bench-statue-review/worktree`. Pinned Astra direct source/evidence lane; one fresh bounded Claude attempt after freeze. Review 009 will check evidence, source provenance, silhouettes, data/loader boundaries and integrated native behavior. |
| Final integration | root | Bench source transfers into sculpture worker before the combined native gate. One heavy browser/gate at a time. Root accepts exact source and native images, runs required primary gates and actual controls, saves local main and removes owned worktrees/resources. |

Bench corrections must not turn missing material or geometry into an asserted design. A finite photo-supported Bing family can use teak, vertical back spindles, arms and solid posts. Unknown point benches remain neutral simplified markers. Preserve source tags/coordinates; line benches follow actual source paths. The eight seat walls are authored interpretations of exact mapped planted boundaries plus the inspected Stanford garden guide page4, with width/height estimated; they are not relabeled OSM bench facts. Verify whole emitted bench envelopes, point/way overlap, closed-line joins and cardinal facing/backrest semantics. The old all-wood/facing candidate must fail a meaningful regression.

Sculptures use a separate small curated input, validation and counts inside the existing lazy geometry worker, with existing two batched draws and nonselectable solid kinds. No outdoor Thinker is invented from indoor references. Search/place metadata must stay consistent with source coordinates; an artwork card names artist, material, reference and modeling limits. Native zoom may extend to 21.5 with sculpture flights at 21.1 for inspection at real scale. No independent navigation system or eager regional mesh/fetch is added.

The combined triangle proxy is raised from 150,000 to 160,000 only for the newly source-supported seating and sculptures; the 24MiB byte cap, two draws, sliced uploads and measured motion/recovery requirements remain. Report actual geometry deltas rather than treating the higher limit as a target. Required acceptance: types/tests/build/audit; source pins and independent geometry checks; fixed, close, oblique, exploratory and mobile native views; actual sculpture search, combined keyboard/mouse, error/Retry and graphics restoration; named GPU/viewport motion bounds. A source pin alone does not establish surveyed furniture or current physical accuracy.

## Stanford bench accuracy — 2026-10-20

The user reported that the benches did not look accurate. The previous renderer made every one of 163 mapped bench points into the same brown horizontal-plank object with paper-thin support planes. It ignored the one `material=concrete` tag, invented backs on untagged seats, estimated courtyard facing from drivable roads, and skipped complete `amenity=bench` ways. OSM `direction` also means the seated person's facing normal, but the old formula treated it as the long axis. No retained bench currently has a direction tag; that formula correction is a defect-class fix rather than a claim that a mapped facing was changed.

The corrected input retains all 969 original points, including 163 bench points, at their original coordinates and versions. The bench seating-material census is 132 unknown, 30 wood and one concrete. The 726 tree and 80 lamp feature records are unchanged. It adds 25 complete mapped bench ways and eight explicitly authored seat-wall interpretations of the Inner Quad planting boundaries. The 196 bench entries are feature assemblies, not an inventory of physical seats or individual people who can sit.

### What the sources establish

| Source | Observed fact | Modeling bound |
| --- | --- | --- |
| [Stanford courtyard photograph](https://aabs2018.stanford.edu/images/stanford/sunset.jpg) and [Bing west context photograph](https://trees.stanford.edu/images/inner_palms/inner_palms-Pages/Image8.html) | Actual courtyard benches have substantial wood posts and arms, lengthwise seat planks, and separated vertical back spindles. | Five mapped Bing courtyard nodes receive an interpreted six-foot teak family. Exact construction, age, dimensions and facing were not surveyed. |
| [Stanford Gardens guide, page 4](https://familyweekend.stanford.edu/sites/g/files/sbiybj17671/files/media/file/a_self-guided_tour_of_stanford_gardens.pdf) | Its photograph and text show circular concrete seating around the eight Inner Quad oases. | The guide was written by students in 2017 and hosted for Family Weekend 2022. It supports the form and material family, not present-day measured dimensions. |
| [Stanford Medical Center campus design guidelines, printed page 132 / PDF page 51](https://www.paloalto.gov/files/assets/public/v/1/planning-amp-development-services/file-migration/development-projects/sumc/sumc-design-guidelines-part-2.pdf) | The university's documented palette includes a six-foot teak courtyard bench, an eight-foot wood/black-support contour bench, and a distinct eight-foot courtyard bench. | Text was available through research, but the PDF server denied the direct document fetch. Its photographs were not counted as inspected pixels, and its standards are not applied to every unsurveyed point. |
| [OSM bench tagging documentation](https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dbench) and the four pinned local extracts | A way can describe a long, bent or enclosing bench. `direction` is seated facing, and `material` describes the seating rather than the frame. | Mapped tags and coordinates remain facts; absent tags remain unknown. |

The reference browser captured the actual 1586×1058 courtyard photo, Bing context, and the Stanford garden-guide page at native rendering size. They were inspected before modeling. Reference hashes are retained in `artifacts/bench-accuracy/verification/reference-image-hashes.json`. The Stanford Report page returned a browser challenge; its pixels did not ground this change. No access control was bypassed.

### Finite geometry and uncertainty

Nodes `5831701380`, `5831701381`, `5831701382`, `5831701383` and `5831701384` receive the courtyard family. Their 1.83 m modeled width, 0.55 m depth and 0.94 m maximum height follow the referenced family scale. The model has five solid seat planks, nine separated vertical spindles, solid posts and a three-section arm silhouette. This is a stylized interpretation, not a mesh scan or an exact spindle-count survey. Other wood/concrete point benches follow their source seating material and explicit `backrest` tags; neutral modeled supports do not assert a source frame material. The remaining 127 material-unknown point benches use flat neutral map markers instead of invented wooden designs.

The eight seat walls follow every original coordinate of mapped planting ways `30775532`, `30775534`, `30775535`, `30775536`, `30775539`, `30775540`, `30775541` and `30775542`. Each is labeled `benchModel=quad-seat-wall`, `benchEvidence=stanford-gardens-guide-p4` and `sourceNatural=wood`. They are not falsely labeled as OSM `amenity=bench` or given an invented source `material` tag. Their concrete-looking color, 0.50 m width and 0.45 m height are authored estimates. Closed miter joins preserve the planted outline and leave its center empty; there is one ring per source boundary, not a circular bench duplicated at each tree or bench point.

The 25 mapped bench ways preserve the actual long/bent/closed coordinate paths. Their 0.48 m width, 0.45 m seat height and, when explicitly tagged, 0.91 m back height are modeled estimates. The stone arc `way/1505422554` retains its 16-point curve and `material=stone`; the concrete backed line `way/1509660899` retains its four-point form and tags. No line was dropped by the full-envelope clearance check. An absent point facing is estimated toward the nearest mapped pedestrian path and recorded separately as `modeledFacing` with its `orientationSource`; it is not described as a surveyed direction or axis. Numeric and sixteen-point cardinal source facing, when present, take priority.

`stanford-environment.geojson` is 249,282 bytes with SHA-256 `554f290a952942cbc323e8171986b31f465f4b5fc8e50abe34d1680a61725317`. The generator checks the same four raw OSM hashes before writing. It changes no building/campus source or cached extract. Source provenance distinguishes the 25 mapped ways from eight authored interpretations and retains the original six point exclusions. The input remains below the 256 KiB promotion review threshold.

### Verification bound and handoff

Ten focused environment/data tests and TypeScript pass. Actual emitted geometry, rather than the reported helper angle, proves numeric/cardinal facing with the back behind the seated person, physical support width/depth/caps, material/backrest distinctions, unverified flat markers, photo-family spindles/arms, mapped bent paths and closed seat-wall joins. Every emitted bench triangle is checked for building-material intrusion and wall crossing; pairwise line/point checks reject duplicate seats. An independent reviewer additionally checks the source coordinates/tags/versions and the complete furniture envelope. Its provisional minimum emitted wall distance is 1.815692 m with no material intrusions or furniture overlaps; the authored independent review owns the final frozen-source result.

The emitted-facing regression probe first reproduces the old 90-degree long-axis formula in an isolated copy. All six numeric/cardinal fixtures fail with that formula and pass on the candidate. The first CPU run hit the unchanged worker's 150k builder guard; the coordinator had approved 160k for the combined source-grounded benches and two sculptures. Copying the sculpture owner's approved builder into this worktree for verification resolved that expected integration dependency. The first support-cap assertion depended on the world X axis and failed after a valid 90-degree rotation; replacing it with a rotation-independent triangle-area assertion corrected the instrument without changing the bench geometry.

Buildings plus corrected environment, before sculptures, contain 150,267 triangles and 23,441,652 vertex bytes. This is 1,802 triangles and 281,112 bytes more than the prior 148,465 / 23,160,540 scene. Geometry stays in the existing two buffers/draws and the existing sliced upload. The combined acceptance ceiling approved for this increment is 160,000 triangles and 24 MiB. The final primary native map gate, real-control motion sample, package gates and exact integrated review belong to the coordinator and sculpture owner. No separate worker app gate or duplicate build/audit was run. The Codex embedded-browser hang is outside this correction and remains unresolved.

Worktree: `artifacts/bench-accuracy/worktree`, branch `codex/bench-accuracy-20261020`, base `e09d65bfc98b302b050c70b804fd905481c83afa`. This worker makes no primary edits, commits or push. The reference browser and daemon were closed in `finally`; the exact-identity post-cleanup census is empty. Primary localhost servers on 5173 and 5174 are untouched. The coordinator owns final integration, retained evidence and worktree cleanup.

## Stanford sculpture increment

2026-10-20. Owner: campus_statues. Base: `e09d65bfc98b302b050c70b804fd905481c83afa`. Scope: two researched outdoor works, a lazy local worker input, existing two-buffer renderer and existing search/fly controls. Bench correction is owned separately. No new dependencies, external model downloads, image textures or regional 3D content.

### Reviewed works and source boundary

| Work | Location basis | Modeled form | Primary references |
| --- | --- | --- | --- |
| The Burghers of Calais, Auguste Rodin | Pinned OSM node `5648594207`, version 4; `[-122.1699656,37.4280031]`; Memorial Court | Six separate bronze plinths, varied robe lengths, folded cloth volumes, bent heads, arms raised toward faces and different walking stances | [Stanford/Cantor location and attribution](https://news.stanford.edu/stories/2017/08/stanfords-cantor-arts-center-offers-fresh-look-rodin); [Robert Siegel's Stanford photographs](https://web.stanford.edu/~siegelr/art/rodin.html) |
| Angel of Grief, after William Wetmore Story | Pinned OSM node `6477042804`, version 1; `[-122.1688001,37.4373687]`; Arboretum | Pale marble, wide stepped base, flared altar and cornices, shallow garlands, bowed figure with hanging arm and two long folded wings | [Stanford identity, material and memorial history](https://news.stanford.edu/stories/2015/08/vandalism-angel-grief-081415); [Robert Siegel's Stanford photographs](https://web.stanford.edu/~siegelr/stanford/angelofgrief.html) |

The four original OSM extract hashes were checked before selecting these nodes. Both coordinates are inside the unchanged campus perimeter. The curated source, retained original node records, source hashes, ODbL attribution and modeling limits live in `public/data/stanford-sculptures-provenance.json`. The 610-byte GeoJSON SHA-256 is `751a0f69362573b0050989199c3713b277feb4c99fef900840838694f1dad700`. The building, boundary and original provenance inputs remain unchanged.

These are authored stylized interpretations, not scans or exact replicas. All dimensions, orientations, individual Burghers offsets around the mapped group point, anatomy and carved relief are estimates. Reference photographs remain copyrighted by their owners; no photo is shipped in the app. The indoor Thinker and other unreviewed works are excluded.

### Pixel review and attempts

Four reference photographs were inspected at native resolution through an owned headless browser, without downloading source images. Private evidence is under `artifacts/campus-statues/verification/output/playwright/`. The initial `news.stanford.edu` image requests displayed a challenge screen and supplied no usable pixels; no challenge was bypassed. The alternative Stanford faculty source loaded real 776 × 517 photographs. Both reference sessions closed, and the final exact-identity process census was empty.

| Inspected capture | SHA-256 | Observed form |
| --- | --- | --- |
| `05-burghers-group.png` | `fde87267a16059a9e3c36107764edb9e8941c3137ff820e900a2556af026eb58` | Six separate bases, distinct robe and arm silhouettes, open spacing, dark bronze |
| `06-burgher-pose.png` | `35f729f0841ca67b50945455dc6aaca3d0c151b7bf507669e571f6d8039aef47` | Raised open hand, slanted head, projecting nose/brow and beard |
| `03-angel-side.png` | `9e5edea6ac6e4f6adbcff717c5f4c2a5738d395724a4bb751b22853a0c37f562` | Long wings droop to the base; broad steps, flared altar, cornice and bowed figure |
| `04-angel-front.png` | `323e639661868e3f1e7a5545ef04e1e5ac16925bd4563934bacf637a844e58b7` | Hanging forearm, floral altar relief, shoulder/wing junction and upper drapery |

### Renderer and navigation contract

`buildBuildingGeometry(data, environment?, sculptures?)` preserves the old optional arguments. `DetailGeometry.sculptures` and frozen `BuildingDetailStats.sculptures` report work, figure and triangle counts separately from environment counts. Sculpture vertices use solid kind 12 and unselectable building sentinel −2 in the existing roof buffer. There is no extra shader, buffer, draw call, per-frame sculpture work or initial regional fetch.

The existing campus-detail worker loads the two small local inputs in parallel only after a near-campus detail request. Each has a 15-second timeout and specific network, HTTP, JSON and schema recovery messages through the existing Retry path. Context restoration reuses the cached combined geometry. Sculptures add 3,820 triangles and 595,920 vertex bytes: 2,832 triangles for the six Burghers and 988 for Angel of Grief. With the prior environment, the prototype is 152,285 triangles and 23,756,460 bytes; final integrated counts depend on the separate bench correction. The coordinator approved a 160,000-triangle guard while preserving the 24 MiB byte limit, two draws and existing sliced uploads.

The two places appear in local search without a new eager data request. An explicit consistency test binds search metadata to the curated coordinates, names, artists and materials. The campus panel opens the Burghers; each artwork panel links the other work, a Stanford source and the whole campus. Existing native camera controls remain in charge. The native maximum zoom is 21.5, with artwork flights at 21.1, so life-size models can be inspected without artificially enlarging them. The panel identifies estimates.

### Verification state

Nine targeted source/model/worker/search tests and TypeScript passed on the authored candidate. These cover pinned identities and hashes, in-campus coordinates, distinct solid silhouettes/materials, six separate supports, finite unit normals, triangle/byte bounds, frozen original source, specific worker failures and valid retry. They do not establish visual fidelity or frame rate. The coordinator will integrate bench and sculpture sources before one native headless gate on the primary localhost server, then run the required package gates and independent review on the integrated revision. The Codex embedded-browser crash is outside this increment and remains unresolved.

## Integration amendments

The notes above were never gated or reviewed before integration. Five review rounds of the merge on 2026-10-29, [reviews 9 to 13](reviews/9_integration.md), found defects. They were repaired in `8e45ed8`, `5c9f24b`, `a2486a8`, `c5483cd` and `649d7c2`, and [review 14](reviews/14_integration.md) covered the integrated result on 2026-10-30. Where the notes and this section differ, this section describes the merged code.

### Seating and backs

- A mapped bench way of unknown material is a flat neutral marker 0.38 m wide along its mapped path, like an unknown point, not a solid seat. 23 of the 25 mapped ways are such markers. The bench note's 0.48 m width, 0.45 m seat height and 0.91 m back now apply only to the two ways with a known material: the stone arc `way/1505422554` and the backed concrete bench `way/1509660899`. Wood, concrete and stone ways keep their own tones, and the eight Inner Quad seat walls are unchanged.
- On an open way, a tagged back runs the whole way on the side opposite its facing. The back is centred on the seat's mitred edge, so neighbouring segments share corners at bends. A tagged direction can run along the way; then a bent way's back takes its outer side and a straight way's takes its right. A closed ring's back takes its outside. Either side is an estimate.
- A seat whose backrest tag is absent gets no back. A numeric-string `direction` such as "90" counts like a number.

### Modeled facing

Without a direction tag, `estimateFacing` in `tools/data/build-campus-environment.mjs` decides a bench's facing. The provenance's `dimensions` text states the same rule.

- The reference is the pedestrian path nearest the bench node, or the middle of a way's length, among paths that do not touch the bench. A path touches it when any of its segments comes within 5 cm of any of the bench's segments, crossings included.
- An open way faces across its own length-weighted line, toward the reference's side, so it never faces along itself. A closed ring faces the reference.
- A node lying on a path faces across that path's nearest segment, toward the reference's side. Any other node faces the reference.
- A reference within rounding of straight ahead along the line leaves the side undecided: a cosine within 1e-6 of zero, and the line's left is taken. A reference a fraction of a degree off the line still decides the side, which is then a weak estimate. Seven flat markers have such a margin.
- `orientationSource` names the reference. For a node lying on a path it names that path instead.

This replaces the note's "modeledFacing" estimate. That estimate measured a way from its middle node, and it could face along a bench or along the footway the bench lies on.

### Data, provenance and counts

- `public/data/stanford-environment.geojson` is 249,297 bytes, SHA-256 `d9c056c55c154a98bf33309477155f0731aef3d58039bff7f6a099f87a1b6fa0`. It was regenerated from the four hash-verified extracts in the ignored `artifacts/bay-area-stanford/stanford-source/`. Against the note's `554f290a…` only `modeledFacing` changed, and for one node `orientationSource`. Every coordinate, tag, version and the feature order are unchanged.
- Provenance `retained` counts source nodes only: 163 benches, which equals `beforeExclusions` less `excluded`. The 25 ways and 8 authored walls are counted in `benchLines`.
- The integrated mesh has 153,765 triangles and 23,987,340 bytes in the existing two draws, under the 160,000-triangle guard and the 24 MiB cap.

### Interface

- On a phone, an artwork flight keeps the panel compact, so the work stays in view at the flight centre. Expand places opens its card. Before, the expanded card covered the work.
- The map's maximum zoom comes from `MAX_MAP_ZOOM`, 21.5, in `src/places.ts`. Every place flight is tested against it, the 21.1 artwork flights included. The card's source link is escaped.

### Verification

The bench note said its emitted-geometry tests "prove" its distinctions. That overstated them. The checks are listed in [the defect register](../../learning/defect-register.md) and in reviews 9 to 14. Each turned its test red when its defect was put back: 23 mutations by the end. The integrated revision passes typecheck, 65 unit tests, build and audit on Node 24.18.1.

A native headless check through real controls passed 17/17. It ran in system Chrome at 1920×1080 and 390×844 (RTX 4090, ANGLE D3D11) and covered:

- regional start;
- HTTP 503 and malformed-JSON failures of the sculpture input, each followed by Retry;
- search and card flights to both works;
- four bench views brought under the camera by drags;
- held W with a right drag, with a 95th-percentile frame interval of 6.5 to 7.2 ms;
- graphics-context restoration;
- the phone panel.

### Limits the reviews recorded

- Sculpture modelling frames: the head tilt and the feet and hand ellipsoids follow the group's axes, not each figure's. Tube segments crack at elbows. Two Burghers plinths stand 3 cm apart. These are deferred as qualities of a stylized model.
- Road widths stop scaling at zoom 18, and regional tiles are over-zoomed to 21.5 anywhere in the Bay. Deferred.
- The seat's long walls and one end cap are wound inward. Lighting is two-sided and culling is off, so nothing shows. Deferred.
- A node at a footway bend, junction or spur end can face along the wrong segment. No published node lies at one. For a node lying on a path, the reference that chose its side is not recorded.
- Bench ways skip the road-clearance check that points get, and a way with a node off campus is dropped unrecorded. Of the extracts' 27 bench ways, 25 are kept and 2 lie wholly off campus.
- The sculpture pins agree only with themselves in the repository. On 2026-10-29 both were checked by hand against the extracts: ids, versions and coordinates match.

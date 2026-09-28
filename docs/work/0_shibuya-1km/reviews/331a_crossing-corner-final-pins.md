#331 — final hardware bindings and source/data freeze

**Ready for261's single candidate build and arm sealing, subject to root admission.** This completes331's bounded source/packet binding work after root's336 amendment. It does not accept the new signal or the corner's appearance. Material source remains exactly the335-reviewed provisional snapshot.

## Exact successor delta

Only manifest.sourceInputs[27].sha256 changes from the provisional packet. The actual regenerated100,180-byte control-hardware.json is bound to6b8afb406d339cb8bed7926ef8ec800711f4f309ef69c4794203aa0603248b3b. Its canonical input path and every other manifest field stay unchanged. The resulting6,330-byte manifest is SHA37ed690eeb9d6be25f9211b710e204cf50dccecff259f44b78fb1692efa0be15.

vite.local-walk.config.ts pins that final manifest and now accurately names both changed live bindings in its comment. test/local-walk-assets.test.ts pins that manifest and the actual hardware length/hash. These are the only two production source/config/test files changed after335. delta-from335.patch records the exact source delta; changes.json records the single manifest field change. The other eleven source files and all four context/rig sidecars were rehashed and remain exact. Original253, provisional331 manifest,335-reviewed source copies and all318/324/330 evidence remain retained.

final-index.json binds all13 final source paths, the production opt-in configuration, five packet files and151 actual runtime files staged by261. Each runtime file was checked against its expected digest. Exactly three runtime dependencies differ from the accepted baseline: pavements.mesh, pavement-recipe.json and control-hardware.json. The other148, including roads, terrain, network, vehicles, buildings, decorations, published markings and rail, retain their baseline bytes. No startup, default activation, controller history, actor, post, light or placement algorithm changed.

| Final artifact | SHA-256 |
| --- | --- |
| final-index.json | 4adb26527fc719c76fb1e3d4f9ff51257af4e51425c72144637d091d8f4ffacd |
| delta-from335.patch | b68918b8db7734e59f431807a9444f9e9afa3ff03d8a61a6b34ad08f06d27382 |
| Complete delta.patch against b01096d | ca8c43b3c7a1f83409e73182931c2e11c1b9a86680c1f541188719dedc7fb59f |
| vite.local-walk.config.ts | d1d83c67abc308cf8ee0d47dbf479e41e30d5a5a392ee36fe5f9c8de6a52e60f |
| test/local-walk-assets.test.ts | 3bf5bc3827e2370f6d0efec0e51e03b2ef6f33b29e774dab15965c752c130d60 |

## Hardware amendment and required native judgment

The unchanged actual producer now places existing OSM signal record36, osm:node:6219685052:traffic_signals. The other118 records remain exact. There are24 placed and95 unplaced records. The new base is(-2.292250448,15.541464340,-29.398531392); its head is(0.142911316,20.141464340,-28.832857296). Its evidence cites new frontage faces464610/464606 and unchanged440600, with pedestrian gap0.271604618m.

Root admitted this one producer consequence into the combined native comparison after336's bounded footing review. This is no extra manually authored prop, changed search offset or new placement policy. Native reviewers must inspect its ground contact, obstruction and contribution to the whole corner. That visual consequence is explicit, not concealed as a metadata-only hash update. The actual producer/336 evidence remains separately owned;331 did not regenerate hardware or repeat physical qualification.

## Checks and cleanup

The final affected run passed9/9 cases: six actual paint/support cases and three real-route walker asset cases. TypeScript passed. The asset receipt contains all twelve successful HTTP reads, including the final hardware bytes, and confirms its fixture server closed. The actual paint census still has100 features,65,984 triangles and18,652 hero triangles; all11 seam expectations remain unchanged. No new gait study or rerun of the other52 already-passed focused cases occurred.

The first final-binding helper completed its edits, checks and promotions but exited1 while printing a Unicode checkmark through Python's Windows console encoding. Its persisted child receipts show both checks exited0. A detected newline-writing expansion in the two editable files was corrected from the preserved provisional byte buffers, and the final9 tests/types were rerun successfully. No such encoding change remains in the final delta; inherited unrelated line endings remain as disclosed in the source-freeze review.

The exact original331 source-freeze report and334b review were promoted to primary reviews/331_crossing-corner-source-freeze.md and334b_static-pair-rereview.md; promotions.json records their unchanged hashes. Primary product/data/build remained untouched. Empty owned TEMP was removed and no task-owned child remains. No build, browser, renderer, GPU or native capture ran in this binding step.331 source/data/packet writes are now stopped;261 owns the next build/seal after root dispatch. Matched native A/B, independent appearance and the eventual all-five/static final acceptance remain open.

# Source milestone review — round 4

Reviewed 2026-10-11 by the independent Astra/xhigh reviewer assigned by the orchestrator. Verdict: **three material P2 findings remain open: R7, R8 and R9.** The photographic source bytes and geometry-preservation checks described below pass this static inspection. This is not approval of native appearance, moving agents, continuous collision support or performance. The orchestrator accepted R7–R9 for repair before this report was saved; this report reviews their original frozen target, not any proposed repair.

## Exact target and retention

Target: `C:/Users/38909/Documents/github/maps/artifacts/unreal-source-next/worktree`, HEAD/base `33d386299ff7bd02d91bca38f655f41597ddb756`. All four authored files were new, untracked files relative to that base; a tracked diff alone therefore does not contain this review target. No implementation, index, configuration or source/output cache was changed by this reviewer. The explicit branch exception in `docs/policies/local-rules.md` applies; no merge to main is requested or implied.

All four files were read in full. Their bytes were independently hashed before retention and again at the end of inspection, with no changes observed. The exact original files are retained under `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/tmp/review-runs/source-round4/target/`, preserving their original relative paths. The retained `final-authored-inventory.json` is 660 bytes, SHA-256 `bd260df5fea6366c6222c8158a9b120e238f047eafbe48811fd6664231f266eb`. Copied file hashes matched the inventory. Retention and this new report were the reviewer's only writes.

| Authored file | Bytes | SHA-256 |
| --- | ---: | --- |
| `sources/surface_network.json` | 1,228 | `ea087e56d1752798ec0d2ae9b6aa3b65413e0a7caf7bbcb5d2dee673193c1e06` |
| `tools/data/surface_network.py` | 38,706 | `ccd6c1780234a1409ee0b050c4459952071fcafb85fdd62477c5f3a6a794dbfc` |
| `tests/data/test_surface_network.py` | 19,389 | `8ebc3677beb5baba5ca28249d1a78631bf2a22b33090c4588d178d82c75bcc4b` |
| `docs/work/0_unreal-shibuya/source-next.md` | 16,663 | `47725873322948ecc20a95022ebc7eb462b09e0a45efbb1efe1507f0b145bec9` |

## R7 — P2: conflicting CLI modes report success without doing the requested work

Locations: `tools/data/surface_network.py:648–650`, `655–667`. The three mode arguments are independent booleans. With `--photo-only --network-only`, the photo branch is disabled by `network_only` and the movement branch is disabled by `photo_only`. If the pinned base manifest exists, the command reaches normal termination with no output generated or work result printed. Adding `--fetch` can even perform remote/cache work before the same no-action result. `--roads-only` also silently takes precedence over either other mode. This is a concrete passed-versus-did-not-run defect in the command interface.

The control-flow witness is the simultaneous true flags at lines 659 and 664; this reviewer did not execute the command or change its inputs. Existing tests do not cover command parsing. Reject conflicting modes through one mutually exclusive argument group before any fetch or file operation. A regression control should pass every conflicting pair and the triple through the real CLI parser, require nonzero status with a useful conflict message, and verify that fetch/build functions and outputs were untouched. Retain the ordinary single-mode and default behavior.

Acceptance impact: blocks reliable source preparation and truthful command/gate status. It does not invalidate the already hash-bound photographic or movement files.

## R8 — P2: generated car cycles violate restrictions present in the admitted OSM source

Locations: `tools/data/surface_network.py:263–272` and `548–554`; coverage gap at `tests/data/test_surface_network.py:271–294`. The XML reader returns nodes, ways and building ways but never reads relation restrictions. The turn graph consequently admits every supported shared-node transition except an immediate reverse. Checking direction, a shared node and road support does not establish that the source permits that turn.

This is present in the current generated network. A read-only comparison of its `source_lane_segments` against the original pinned OSM XML found the following six forbidden transitions across five loops. Each listed restriction has an unconditional `restriction` tag with no exception tag; the members match the generated from-way, via-node and outgoing way directly.

| Generated route | Source relation | Source rule | Generated transition | Source-required outgoing way, where applicable |
| --- | ---: | --- | --- | ---: |
| `vehicle-loop-13` | 12589764 | `no_right_turn` | way 213526435 → node 1685221014 → way 41857237 | — |
| `vehicle-loop-14` | 12589764 | `no_right_turn` | way 213526435 → node 1685221014 → way 41857237 | — |
| `vehicle-loop-2` | 15352574 | `no_right_turn` | way 1134562281 → node 291758776 → way 1134562282 | — |
| `vehicle-loop-0` | 15354393 | `only_left_turn` | way 1112568718 → node 252675828 → way 1110356210 | 1106270530 |
| `vehicle-loop-16` | 15354393 | `only_left_turn` | way 1112568718 → node 252675828 → way 1110356210 | 1106270530 |
| `vehicle-loop-0` | 17304309 | `only_left_turn` | way 968189472 → node 356644262 → way 1074238465 | 1257445135 |

The XML contains 49 restriction relations. The six witnesses above are from the simple one-from/one-via-node/one-to subset; they are sufficient to reproduce the defect without interpreting more complicated relations. The comparison reads the original XML and the generated route members independently of the implementation's `allowed_way` or turn-graph helper.

Apply applicable source no/only restrictions before cycle selection, including the closure transition. Conservatively exclude affected transitions when a relevant conditional, via-way or incomplete restriction cannot be evaluated; do not silently admit them. This need not become a navigation product. It only needs to stop inventing permission for source-prohibited movement. Add independent tests against these actual relation members, with no-turn and only-turn controls that fail on the original code. Regenerated routes must still meet the unchanged crossing, support, direction, closure, grade and population criteria.

Acceptance impact: blocks approval of the current source-derived car network. Its physical support and closed geometry do not cure these source-permission errors. Photographic geometry is independent of this finding.

## R9 — P2: new cache and output operations bypass the required reparse-point boundary

Locations: `tools/data/surface_network.py:63–71`, `80–93`, `109–125`, `156–174`, `294–299`, `630–640` and `662–667`. `source_record` at lines 42–44 only computes a lexical relative path after reading. There is no ancestry/leaf reparse-point or resolved confinement admission anywhere in this module. `is_file`, `exists`, `read_bytes`, `mkdir`, Pillow's save and the reused GLB writer all follow filesystem links. Curl is given the final cache path directly, and failure cleanup unlinks through the same unchecked ancestors.

Concrete conditions: a junction at `data/source/gsi/imagery/18` can supply files from a different checkout while the manifest records new-checkout-relative paths. A junction at `data/prepared/surface`, or a linked output leaf beneath it, can redirect `terrain-aerial.png`, GLBs, support JSONs and manifests outside the assigned worktree. A failed fetch can also delete a same-named tile through a redirected parent. A cryptographic digest validates bytes, not ownership of the filesystem path being read, overwritten or removed. This violates the explicit local-rule prohibition on links to old caches and the owned-resource boundary.

The named current `data`, runtime, source, imagery, prepared, surface, support and roads directories were ordinary directories when inspected. This finding identifies missing admission controls; it does not claim the reviewed cache was actually contaminated. No symlink/junction mutation or destructive reproduction was performed by this read-only reviewer.

Require admitted paths to stay under their intended fresh-source/output roots, reject reparse ancestors and leaves before any read/write/fetch/cleanup, and reject non-regular input files. Include the default paths, configured paths and the optional terrain input according to its intended contract. Reuse a narrow guarded file-access boundary rather than relying on post-read `relative_to`. Owned temporary fixtures should demonstrate that an external sentinel cannot be read as an admitted source, overwritten or deleted through either a parent junction or a leaf link; a normal in-tree fixture must continue to work. The repair should retain finite file-size checks before allocating input bytes and safe handling of incomplete downloads.

Acceptance impact: blocks the branch's source isolation and output safety contract. This is distinct from the earlier ZIP-member R2 repair: these newly authored paths do not pass through that repaired boundary.

## Independent checks and evidence bounds

Read outside the authored diff: unchanged `tools/data/build_city.py` ECEF/geodetic/local-basis helpers, GLB writer, XYZ projection, DEM interpolation and terrain UV construction; unchanged `sources/shibuya.json`; the pinned base manifest; original OSM API XML; surface, road and movement manifests; acquisition/control receipts; and the pedestrian corner-profile witness. `build_city.py` hashed to `5d89dc2867e03eb414e7e107135d2edcc7edb3c08898accf761cc81d5da3093e`; `sources/shibuya.json` to `b90409f29e4754b7cdbc799afe7ce2f766abdb246aff43b3574708a98f65f6ac`. These are the fresh Unreal branch inputs, not old primary-project implementation or caches.

The 90 photographed tile hashes match the surface manifest. Every admitted tile's URL and digest also occurs in the union of the successful first-pass and resolved-pass acquisition receipts. The actual extent is z18, x232794–232802, y103241–103250. The official-host curl command retains HTTPS hostname/certificate verification, limits transfer size and duration, and does not use an insecure certificate override. This supports the declared acquisition provenance; no network request was rerun by the reviewer.

Independent parsing of the saved GLBs found identical original terrain accessor metadata and bytes, meshes, nodes and scenes. Saved terrain southwest/southeast/northwest/northeast UVs are approximately `(0.088296294, 0.905786514)`, `(0.978291333, 0.905786514)`, `(0.088296294, 0.099185407)`, `(0.978291333, 0.099185407)`. They agree with the explicit northwest-origin XYZ convention and the fixed four-corner witnesses. The old manually counted 81-tile denominator is not used in this target.

All 25 original/generated road digest pairs match their manifest. Independently parsed POSITION, NORMAL and index accessor metadata/bytes, node/scenes and mesh/primitive counts are preserved in all 25 road primitives. Generated road GLBs contain no embedded images/textures. Their native contract requires binding the one already imported terrain atlas to every road material slot. The source review does not accept placeholder gray material as photographic success.

All 473 support-file hashes and byte counts match the movement manifest, totalling 23,116,401 bytes. The network's source manifest digest matches the actual source-manifest file. Stored routes are explicitly local east/north/up metres, with separate pedestrian and directed vehicle routes and source references; the native consumer must convert metres to centimetres. Vehicle closures are exactly coincident in this output. Read-only arithmetic found closest vehicle approach 0.9446725225 m, maximum vehicle grade 0.1821083566 and maximum pedestrian grade 0.5326395981. Maximum adjacent-point 3D separation across all routes is 1.6452576431 m. The unchanged test still requires closest approach below 30 m and support spacing below 2 m. These numbers do not certify legal turns; R8 applies.

| Inspected evidence file | Bytes | SHA-256 |
| --- | ---: | --- |
| `data/prepared/manifest.json` | 103,082 | `edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e` |
| `data/source/osm/crop.osm` | 8,187,120 | `a3b2c0e679b195792b2a231c9e4854a7c9268cafa592ae0447537592eaea2918` |
| `data/prepared/surface/surface-manifest.json` | 23,981 | `8d1a4149c2e17627a9be15a151bd57e1108cff2d11be3e5ab6a4946b0aecf347` |
| `data/prepared/surface/terrain-aerial.png` | 10,896,930 | `b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58` |
| `data/prepared/surface/terrain-photo.glb` | 13,151,308 | `670d932a69d6c8ce0f5547933fd23310a74c89cc00c88b5d12409c00de876e53` |
| `data/prepared/surface/road-photo-manifest.json` | 15,319 | `5657bdbf446867762ae8c6831c02c05aaa905dfb5ef390279299ba774a2e2bcd` |
| `data/prepared/surface/movement-network.json` | 1,882,961 | `1d9571e869f73343543b3a2f040f94882fda1a4e4160e23237b7bdca034d350d` |
| `data/prepared/surface/movement-manifest.json` | 133,462 | `1e04304fd0643a5ea45e6913e502970e1a20e4285147d36d125ed66271e47b53` |
| `data/prepared/surface/movement-source-manifest.json` | 4,294 | `c33926aa35a3a6d08b764cac8bd935a060dfbd0830a94f7d7c6ad854f7c82ee8` |

The photographic and OSM configuration contains attribution, source URLs and licence links. The source manifest records the approximate road/DEM vertical calibration rather than asserting survey accuracy. The existing runtime dependencies were reused; the authored diff introduces no dependency or new runtime download path. Missing/changed DEM input fails explicitly through `admitted_elevation`, without invoking the base fetch helper. Conditional vehicle-access ways are excluded before graph construction; no such conditional vehicle way was found among the emitted car route source ways in this inspection.

## Limits and integration requirements

The worker reports 19 source tests and syntax compilation passed. Those commands were not rerun by this reviewer while the native visual lease was active. No compiler, engine, browser, GUI, server, downloader or external review CLI was launched. Read-only hashing, XML/JSON/GLB parsing and arithmetic are the independent evidence above. They do not replace the native owner's end-to-end checks. The reported earlier 165.6 m and 53.2 m candidate failures remain historical evidence, not results produced by this review.

Corridor support is discrete: three cross-section points at sampled centres, with up to 1.5 m longitudinal spacing. At an exact source corner, the retained profile belongs to the preceding segment because the next segment's duplicate centre is skipped at lines 362–363. The explicit corner witness documents that limit. It does not analytically establish the continuous path of an offset agent, a swept vehicle or a native walking capsule. Runtime R5 and native support checks remain separate acceptance work.

Building exclusion covers closed ways carrying a building tag; the parser does not assemble relation-only building footprints. For example, the input contains relation 19370681 (MIYASHITA PARK, `type=multipolygon`, `building=commercial`, `layer=-1`) whose outline way has no building tag. Two emitted pedestrian fragments fall within that outer footprint. Its underground/layer context prevents this static review from declaring those points physically inside an obstructing ground-level building. Do not expand the test's closed-building-way exclusion result into a claim that every source building relation or native building volume was checked.

All mapped crossing fragments receive one stop at route distance zero; the native consumer must demonstrate correct signal behavior for both travel directions and for agents already inside crossings. This review does not infer safe signal interaction merely from the presence of stop and signal records. Static lane capacity 1,211 and corridor length 18,207.7 m are not measured dynamic capacity, following, collision avoidance or 3,000/200 performance.

Outputs are written directly to final paths and the full multi-file preparation is not transactional. A failed write can leave partial new bytes next to an older manifest. Curl's normal nonzero return removes its final-path tile, but an exception/interrupt before that cleanup can leave a partial tile that the next fetch skips on existence. Such failure must remain failed: preserve or restore reviewed bytes, validate every referenced hash, and never treat a previous manifest as proof of the failed regeneration. No failure-injection gate was run for this non-atomic behavior in this review. Scoped temporary downloads and guarded promotion are appropriate alongside R9; wholesale transactional architecture is not required for this source milestone.

Focused re-review is required after R7–R9 are repaired. It must bind the repaired authored hashes and changed network/support hashes, retain real red/green controls for the findings, and recheck the unchanged source criteria. Native appearance/material assignment, runtime input, continuous collision, motion and performance remain owned by their separate integration gates.

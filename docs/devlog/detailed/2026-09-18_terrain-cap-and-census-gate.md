# The terrain cap and the census gate: fourteen holes closed, and the gate that would have caught them

2026-09-18. Phase 1 of two. Branch `worker/f1-terrain-cap` off `main` at `4efaea6`, worktree `artifacts/f1-cap/wt` (junctions `node_modules` and `data`, both read-only in this phase; no `data:*` command ran and nothing under `data/` was written). Two commits: `f1b3bc9` the cap, the gate and the payload record, cherry-picked from `phase-b-terrain-cap` at `0c76789`; `38bb0ac` the TIN reader fix. Not merged — the moving pins need the pavement-input review, and the lead lands it.

## What the branch was, and what did not survive the move

The branch was one commit, 33 behind `main`, and the cherry-pick applied with offsets only. Three things in it did not work on current `main` and are part of `f1b3bc9`:

- `SceneManifestInputs.terrain` in `tools/scene/scene-manifest.ts` never declared the two new fields, so the branch did not typecheck. The fields reached `sceneManifest()` through an object literal and `tsc --noEmit` rejects excess properties; `test/scene-manifest.test.ts`'s fixture needed them too.
- `tools/scene/build.ts` decoded `terrain.bytes` — the array the builder still held — and called that the gate. That is the builder agreeing with itself: `buildTerrain` already runs the same census on the same arrays before it returns, so the build.ts call could never fire on a mesh that reached disk by any other route. It now reads `data/scene/terrain.mesh` back off disk and verifies those bytes, and `test/terrain-watertight.test.ts` holds the wiring by source shape.
- The register row records the cap's byte cost as 3,164 B. It is 3,060 bytes, and that is arithmetic rather than a new observation: 14 vertices x (3 position + 3 normal) floats x 4 bytes = 336, plus 227 triangles x 3 indices x 4 bytes = 2,724.

## The measurement, on the real DEM

`node artifacts/f1-cap-probe/rebuild.ts` builds the ground both ways from the pinned 360.6 MB `533935_dem_6697_op.gml`, in process, writing only to a path this lane owns:

| arm | source triangles | triangles | vertices | cap triangles | rim edges | rims | holes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| uncapped | 1,101,033 | 183,123 | 92,269 | 0 | 1,441 | 15 | 14 |
| capped | 1,101,033 | 183,350 | 92,283 | 227 | 1,214 | 1 | 0 |

The cap adds 218 triangles facing up and 9 down, all nine on the two rims that double back on themselves (H1's 54-vertex serpentine has 47/54 up, H2's 28-vertex one 26/28) — both in the south-east, away from the area of interest. `artifacts/terrain-holes/mesh-doctor.mjs` over the three meshes:

| mesh | triangles | duplicate= | nonManifold(>2 faces)= | boundary edges | loops |
| --- | --- | --- | --- | --- | --- |
| served `data/scene/terrain.mesh`, pre-fix reader | 183,188 | 65 | 195 | 1,441 | 15 (14 holes) |
| rebuilt uncapped, fixed reader | 183,123 | 0 | 0 | 1,441 | 15 (14 holes) |
| rebuilt capped, fixed reader | 183,350 | 0 | 0 | 1,214 | 1 |

**Before/after pair each for the three numbers phase 2 must compare:** the served scene is 117 files / 301,674,209 bytes at `sceneTreeDigest 1ebda662…` (certificate `e6b7b9d8de0faf69`), and the three certificate-pinned build files hash `dist/index.html a73d718a…`, `dist/assets/index-DRmtpVMl.js c890299c…`, `dist/assets/index-dvQKBZaf.css 11dd032c…`. A build of this branch reproduces all three byte-for-byte (measured in the worktree), which is what the type-only `src/world/scene-data.ts` change predicts; the unpinned `dist/assets/index-DRmtpVMl.js.map` will differ because it embeds that file's source text.

## The reader: 384 triangles counted twice, and the check that the census did not move

`streamTinTriangles` kept its inter-chunk tail from the last `<gml:Triangle>` *opening* tag. When a read ends exactly on a closing tag that tag belongs to a triangle already yielded, so it was parsed again on the next chunk: the document's own count is 1,101,033 and the reader returned 1,101,417. The tail now keeps only what cannot be parsed yet — the last unclosed opening tag, or the trailing characters that could begin one. `StreamTinOptions.chunkSize` is test-only and exists so `test/plateau-tin-stream.test.ts` can put a boundary exactly on a closing tag; its first case carries the pre-fix rule as its own red control, so it fails if the fixture ever stops reproducing the defect.

The check the lead asked for — stop and report if the reader fix moves the hole census — comes out negative: 14 interior rims and 1,441 rim edges before and after, so the cap needed no adjustment.

## What the phase-1 unit suite could not see, and the case that fixed it

The first version of `test/terrain-watertight.test.ts` drove `capTerrainHoles` and `verifyTerrainIsWatertight` directly. Removing the cap from `buildTerrain` — `options.leaveHolesOpen === true` replaced by `true` — left all seven cases **green**. A suite that tests the function and not the pipeline cannot see the pipeline stop calling it, and this is the same class the canon names: a check built from the same symbol as the thing it checks.

The case that closes it drives `buildTerrain` over a small fixture `dem:TINRelief` written by the test itself: an 8x8 grid of 5 m cells about `AOI_CENTRE_WGS84` with the cell at (2,2) left out, so the clipped ground carries exactly one interior rim. It asserts the default arm's bytes carry none, that the cap cost exactly one vertex and four triangles there, and that the `leaveHolesOpen` arm of the same build still carries the rim and is refused by name — so the case cannot pass by the control arm quietly losing its hole. Under the mutation the default arm's own refusal is what fires.

Six mutations, each exit status 1, all recorded with their exact messages in `docs/learning/gate-proofs.md`: the cap removed (above), the census skipping a rim (6 of 8 cases red), the reader's old tail rule (all 3 reader cases red), the scene gate verifying the builder's array again (the wiring case red), the manifest's rim records unrounded, and the manifest's cap-fact consistency guard disabled.

## What the gate claims, and where the invention is

The claim is topological and now reads that way in all three places the lead named: the module header of `tools/scene/terrain-watertight.ts`, the docstring of `verifyTerrainIsWatertight`, and the manifest's own field documentation. It says the ground is closed and that the outer rim is the only rim left. It does not claim the fan's surface resembles the source (the apex is the rim's own vertex mean and the triangles around it need not lie on the TIN), does not check that the projection is covered, cannot see a hole whose rim was welded into a seam, and says nothing about the outer silhouette.

`manifest.json`'s `terrain.closedRims` carries one record per closed rim — vertex count, perimeter, apex position, projected area, measured before the fan — beside `closedHoleCount` and `capTriangleCount`, so the invention is nameable rather than simply appended after the source vertices. `sceneManifest` refuses to publish the three when they disagree with each other, and `test/scene-manifest.test.ts` pins the fourteen records against the real census.

## The self-invalidating case, handed over deliberately

`test/terrain-watertight.test.ts`'s served-mesh case asserts the **pre-batch** state: `data/scene/terrain.mesh` is still the uncapped ground, the F1 rim is among its interior rims, and the gate refuses it by name with all fourteen listed. This is what keeps phase 1 green instead of shipping a red suite, and it is also what makes the case invalidate itself the moment `npm run data:scene` writes a capped scene. That is the safe direction. Phase 2 flips it to assert the new state — watertight, one loop, the manifest's `closedHoleCount` 14 and `capTriangleCount` 227, and the fourteen `closedRims` records matching a re-derived census — and must not relax it into an assertion that passes in both states.

## Not done in this phase, and why

No `data:*` command ran, `npm run visual` was not run, and `data/scene` was not regenerated: the flicker lane holds the GPU and the primary's served scene must not move under its certificate. The four non-visual gates were run in the worktree: build, typecheck, `npm test` (72 files / 522 tests) and audit, all exit 0. The end-to-end `npm run data:scene` refusal is proven at the unit level (fixture pipeline case, disk-read case, wiring case) and by reading the code; it has not been watched firing inside a real `data:scene` run, because that run is phase 2's.

One process note worth keeping: three of the phase-1 edits were lost mid-session when a mutation was reverted with `git checkout -- <file>` against a file whose D10/D11 edits were still uncommitted, and they had to be rewritten. Commit before mutating, or restore from a copy rather than from git.
